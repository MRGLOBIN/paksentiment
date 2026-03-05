import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import * as crypto from 'crypto';
import { firstValueFrom } from 'rxjs';
import { AnalysisSessionEntity } from '../../../database/entities/mongo/analysis-session.entity';
import { PostStorageService } from '../post-storage.service';
import { AbstractDataProvider } from './abstract-data.provider';

/**
 * WebProvider: Orchestrates web scraping with intelligent fallback.
 *
 * Flow:
 * 1. Try Colly sidecar (Go, fast static HTML scraping)
 * 2. Evaluate content quality — if thin/JS-heavy, fallback to Python Scrapling (headless browser)
 * 3. Run sentiment analysis on extracted content
 * 4. Store results and return normalized response
 */
@Injectable()
export class WebProvider extends AbstractDataProvider {
  private readonly sidecarUrl: string;
  private readonly ollamaUrl: string;
  private readonly ollamaModel: string;

  /** Minimum text length to consider Colly result "good enough" */
  private static readonly MIN_CONTENT_LENGTH = 200;

  constructor(
    httpService: HttpService,
    postStorage: PostStorageService,
    @InjectRepository(AnalysisSessionEntity, 'mongo')
    sessionRepo: MongoRepository<AnalysisSessionEntity>,
  ) {
    super(httpService, postStorage, sessionRepo, WebProvider.name);
    this.sidecarUrl = process.env.COLLY_SIDECAR_URL || 'http://localhost:8081';
    this.ollamaUrl = process.env.OLLAMA_URL || 'https://llm.h4mxa.com';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'phi3:mini';
  }

  /**
   * Fetch raw web content (Colly → Scrapling fallback).
   */
  async fetch(query: any, userId?: number): Promise<any> {
    return this.fetchSentiment(query, userId);
  }

  /**
   * Full pipeline: scrape → fallback → sentiment analysis → store → return.
   */
  async fetchSentiment(query: any, userId?: number): Promise<any> {
    const { url, followLinks, fetchLimit, customTags } = query;
    this.logger.log(`[Web] Starting scrape for: ${url}`);

    // ── Step 1: Try Colly sidecar first ──
    let pages: any[] = [];
    let engine = 'colly';

    try {
      pages = await this.scrapeWithColly(url, followLinks, fetchLimit);
      this.logger.log(
        `[Web] Colly returned ${pages.length} page(s), primary text length: ${pages[0]?.text?.length ?? 0}`,
      );
    } catch (err) {
      this.logger.warn(`[Web] Colly failed: ${err.message}`);
    }

    // ── Step 2: Evaluate content quality & fallback ──
    // Only fallback to Scrapling for single-page scrapes.
    // When followLinks is true and Colly returned multiple pages,
    // we keep all results even if the seed page has thin content
    // (e.g. disambiguation pages are intentionally short).
    const primaryText = pages[0]?.text ?? '';
    const isMultiPageCrawl = followLinks && pages.length > 1;

    if (!isMultiPageCrawl && primaryText.length < WebProvider.MIN_CONTENT_LENGTH) {
      this.logger.log(
        `[Web] Content too thin (${primaryText.length} chars), falling back to Scrapling headless browser`,
      );
      try {
        pages = await this.scrapeWithScrapling(url, followLinks, fetchLimit);
        engine = 'scrapling';
        this.logger.log(`[Web] Scrapling returned ${pages.length} page(s)`);
      } catch (err) {
        this.logger.error(
          `[Web] Scrapling fallback also failed: ${err.message}`,
        );
        // If we at least got something from Colly, use it
        if (pages.length === 0) {
          return {
            source: 'web',
            engine: 'none',
            count: 0,
            posts: [],
            sentiment: [],
            error: 'Both Colly and Scrapling failed to scrape this URL',
          };
        }
      }
    }

    // ── Step 3: Normalize into posts ──
    const uniquePages = Array.from(
      new Map(pages.map((p: any) => [p.url || url, p])).values(),
    );

    const posts = uniquePages.map((page: any) => {
      const pageUrl = page.url || url;
      const docId = crypto.createHash('md5').update(pageUrl).digest('hex');
      return {
        id: docId,
        url: pageUrl,
        title: page.title || '',
        content: (page.text || '').substring(0, 5000),
        author: this.extractDomain(pageUrl),
        timestamp: new Date().toISOString(),
      };
    });

    // ── Step 4: Store raw ──
    await this.storeRaw('web', posts, 'article');

    // ── Step 5: Sentiment analysis ──
    // Check if the Go sidecar already attached Ollama sentiment
    const preAnalyzed = pages.filter(
      (p: any) => p.sentiment && p.sentiment_engine,
    );

    let sentiment: any[] = [];
    if (preAnalyzed.length > 0) {
      // Go sidecar already ran Ollama — use pre-analyzed sentiment directly
      this.logger.log(
        `[Web] Go sidecar provided Ollama sentiment for ${preAnalyzed.length}/${pages.length} page(s) — skipping NestJS analysis`,
      );
      sentiment = preAnalyzed.map((p: any) => {
        const pageUrl = p.url || url;
        const docId = crypto.createHash('md5').update(pageUrl).digest('hex');
        return {
          id: docId,
          sentiment: p.sentiment,
          confidence: p.confidence || 0.5,
          topic: p.topic || 'General',
          summary: p.summary || '',
          engine: p.sentiment_engine || 'ollama',
        };
      });
    } else {
      // No pre-analyzed data — run NestJS-level analysis (Ollama → FastAPI fallback)
      try {
        sentiment = await this.analyzeSentiment(posts, customTags);
      } catch (err) {
        this.logger.warn(`[Web] Sentiment analysis failed: ${err.message}`);
      }
    }

    // ── Step 6: Store processed ──
    if (sentiment.length > 0) {
      await this.storeProcessed('web', posts, [], sentiment);
    }

    // ── Step 7: Save session & return ──
    const response: any = {
      source: 'web',
      engine,
      count: posts.length,
      posts,
      sentiment,
    };

    if (userId) {
      const sessionId = query.sessionId || crypto.randomUUID();
      response.sessionId = sessionId;
      await this.saveSession(sessionId, userId, url, 'web', posts);
    }

    return response;
  }

  // ──────────────────────────────────────────────────────────────
  // Private Helpers
  // ──────────────────────────────────────────────────────────────

  /**
   * Scrape via Go Colly sidecar.
   */
  private async scrapeWithColly(
    url: string,
    followLinks?: boolean,
    limit?: number,
  ): Promise<any[]> {
    if (followLinks) {
      // Use multi-page crawl endpoint
      // limit === 0 means "unlimited" — Colly will crawl all discovered links
      // max_depth must be >= 2 for Colly to actually visit linked pages
      // (depth 1 = seed URL, depth 2 = links found on seed, etc.)
      const effectiveLimit = limit !== undefined ? limit : 3;
      const data = await this.callSidecar('/crawl', {
        url,
        max_depth: effectiveLimit === 0 ? 4 : 2,
        limit: effectiveLimit,
      });

      // Crawl returns 202 with session_id — poll for results
      if (data.session_id) {
        return await this.pollCrawlJob(data.session_id);
      }

      return data.results || [];
    }

    // Single page scrape
    const data = await this.callSidecar('/scrape', { url });
    return data.success ? [data.result] : [];
  }

  /**
   * Scrape via Python FastAPI Scrapling (headless browser).
   */
  private async scrapeWithScrapling(
    url: string,
    followLinks?: boolean,
    limit?: number,
  ): Promise<any[]> {
    const params: any = { url };
    if (followLinks) {
      params.follow_links = 'true';
      params.limit = limit !== undefined ? limit : 3;
    }

    const baseUrl = process.env.SCRAPLING_URL || 'http://localhost:8002';
    const response = await this.proxyRequest<any>('/scrapling/fetch', {
      params,
      baseURL: baseUrl, // Override the fastAPI default baseUrl
    });
    return response.results || [response];
  }

  /**
   * Call Go Colly sidecar.
   */
  private async callSidecar(path: string, body: any): Promise<any> {
    const response = await firstValueFrom(
      this.httpService.post(`${this.sidecarUrl}${path}`, body, {
        timeout: 30000,
      }),
    );
    return response.data;
  }

  /**
   * Poll Colly crawl job until completed.
   */
  private async pollCrawlJob(
    sessionId: string,
    maxAttempts = 60,
    intervalMs = 3000,
  ): Promise<any[]> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, intervalMs));
      try {
        const res = await firstValueFrom(
          this.httpService.get(`${this.sidecarUrl}/jobs/${sessionId}`),
        );
        const job = res.data;
        if (job.status === 'completed') {
          return job.results || [];
        }
        if (job.status === 'failed') {
          throw new Error(job.error || 'Crawl job failed');
        }
      } catch (err) {
        if (i === maxAttempts - 1) throw err;
      }
    }
    throw new Error('Crawl job timed out');
  }

  /**
   * Run sentiment analysis — tries Ollama phi3:mini first, falls back to FastAPI.
   */
  private async analyzeSentiment(
    posts: any[],
    customTags?: string,
  ): Promise<any[]> {
    const CHUNK_SIZE = 2000;
    const allDocs: { id: string; text: string; originalId: string }[] = [];

    posts.forEach((p) => {
      const text = p.content || '';
      if (text.length > CHUNK_SIZE) {
        const chunks = this.chunkString(text, CHUNK_SIZE);
        chunks.forEach((chunk, idx) => {
          allDocs.push({
            id: `${p.id}_chunk_${idx}`,
            originalId: p.id,
            text: chunk,
          });
        });
      } else if (text.length > 0) {
        allDocs.push({ id: p.id, originalId: p.id, text });
      }
    });

    if (allDocs.length === 0) return [];

    // ── Try Ollama phi3:mini first ──
    let rawSentiments: any[] | null = null;
    try {
      const ollamaUp = await this.isOllamaAvailable();
      if (ollamaUp) {
        this.logger.log(
          `[Web] Ollama available — using ${this.ollamaModel} for ${allDocs.length} doc(s)`,
        );
        rawSentiments = await this.analyzeSentimentWithOllama(allDocs, customTags);
      } else {
        this.logger.warn('[Web] Ollama unavailable — falling back to FastAPI');
      }
    } catch (err) {
      this.logger.warn(
        `[Web] Ollama sentiment failed: ${err.message} — falling back to FastAPI`,
      );
    }

    // ── Fallback to FastAPI local model ──
    if (!rawSentiments) {
      this.logger.log('[Web] Using FastAPI local model for sentiment analysis');
      const sentimentRes = await this.proxyRequest<any>(
        '/sentiment/analyze/local',
        {
          method: 'POST',
          data: {
            documents: allDocs.map((d) => ({ id: d.id, text: d.text })),
            ...(customTags ? { custom_sentiments: customTags } : {}),
          },
        },
      );
      rawSentiments = sentimentRes.sentiment || [];
    }

    // ── Aggregate chunks back to original documents ──
    const sentimentMap = new Map<string, any[]>();
    (rawSentiments ?? []).forEach((s: any) => {
      const match = allDocs.find((d) => d.id === s.id);
      if (match) {
        const oid = match.originalId;
        if (!sentimentMap.has(oid)) sentimentMap.set(oid, []);
        sentimentMap.get(oid)!.push(s);
      }
    });

    const aggregated = Array.from(sentimentMap.entries()).map(([id, resultList]) => {
      if (resultList.length === 1) return { ...resultList[0], id };

      const counts: Record<string, number> = {};
      let totalConfidence = 0;
      const summaries: string[] = [];

      resultList.forEach((r: any) => {
        counts[r.sentiment] = (counts[r.sentiment] || 0) + (r.confidence || 0);
        totalConfidence += r.confidence || 0;
        if (r.summary) summaries.push(r.summary);
      });

      const winner = Object.keys(counts).reduce((a, b) =>
        counts[a] > counts[b] ? a : b,
      );

      return {
        id,
        sentiment: winner,
        confidence: totalConfidence / resultList.length,
        topic: resultList[0]?.topic || 'General',
        summary: summaries.join('\n---\n'),
        engine: resultList[0]?.engine || 'unknown',
        chunk_results: resultList,
      };
    });

    // ── Ensure every entry has topic (FastAPI doesn't return it) ──
    for (const entry of aggregated) {
      if (!entry.topic || entry.topic === 'General') {
        // Try a quick Ollama topic-only extraction
        const post = posts.find((p: any) => p.id === entry.id);
        const snippet = (post?.content || post?.text || '').substring(0, 500);
        if (snippet.length > 30) {
          try {
            const topicRes = await firstValueFrom(
              this.httpService.post(
                `${this.ollamaUrl}/api/generate`,
                {
                  model: this.ollamaModel,
                  prompt: `Classify the main topic of this text as a single word (e.g. Economics, Politics, Technology, Health, Education, Sports, Science, Culture, Environment, Law, Society, Entertainment). Reply with ONLY the single word.\n\nText: "${snippet}"\n\nTopic:`,
                  stream: false,
                },
                { timeout: 15000 },
              ),
            );
            const topicRaw = (topicRes.data?.response || '').trim();
            // Take first word only
            const firstWord = topicRaw.split(/[\s,.\n]/)[0].replace(/[^a-zA-Z]/g, '');
            if (firstWord && firstWord.length > 1 && firstWord.length < 20) {
              entry.topic = firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
              this.logger.log(`[Web] Extracted topic "${entry.topic}" for doc ${entry.id}`);
            }
          } catch {
            // topic stays as 'General'
            entry.topic = 'General';
          }
        } else {
          entry.topic = 'General';
        }
      }
      // Belt-and-suspenders: always ensure topic is a string
      entry.topic = entry.topic || 'General';
    }

    return aggregated;
  }

  /**
   * Quick health-check ping to the Ollama server.
   */
  private async isOllamaAvailable(): Promise<boolean> {
    try {
      this.logger.log(
        `[Web] Pinging Ollama at ${this.ollamaUrl}/api/generate (model: ${this.ollamaModel})`,
      );
      const res = await firstValueFrom(
        this.httpService.post(
          `${this.ollamaUrl}/api/generate`,
          { model: this.ollamaModel, prompt: 'Reply OK', stream: false },
          { timeout: 15000 },
        ),
      );
      const available = res.data?.done === true;
      this.logger.log(`[Web] Ollama health check result: ${available}`);
      return available;
    } catch (err) {
      this.logger.warn(`[Web] Ollama health check failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Analyze sentiment using the self-hosted Ollama phi3:mini model.
   */
  private async analyzeSentimentWithOllama(
    docs: { id: string; text: string }[],
    customTags?: string,
  ): Promise<any[]> {
    const results: any[] = [];

    for (const doc of docs) {
      const prompt = this.buildSentimentPrompt(doc.text, customTags);

      const res = await firstValueFrom(
        this.httpService.post(
          `${this.ollamaUrl}/api/generate`,
          {
            model: this.ollamaModel,
            prompt,
            stream: false,
          },
          { timeout: 60000 },
        ),
      );

      const raw = res.data?.response || '';

      // Try to parse structured JSON from the LLM response
      let sentiment = 'Neutral';
      let confidence = 0.5;
      let topic = 'General';
      let summary = raw.trim();

      try {
        // Extract JSON block from the response
        const jsonMatch = raw.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          sentiment = parsed.sentiment || sentiment;
          confidence = typeof parsed.confidence === 'number'
            ? parsed.confidence
            : parseFloat(parsed.confidence) || confidence;
          topic = parsed.topic || topic;
          summary = parsed.summary || summary;
        }
      } catch {
        // If JSON parsing fails, try simple keyword detection
        const lower = raw.toLowerCase();
        if (lower.includes('positive')) {
          sentiment = 'Positive';
          confidence = 0.7;
        } else if (lower.includes('negative')) {
          sentiment = 'Negative';
          confidence = 0.7;
        } else {
          sentiment = 'Neutral';
          confidence = 0.5;
        }
        summary = raw.substring(0, 300).trim();
      }

      results.push({
        id: doc.id,
        sentiment,
        confidence: Math.min(Math.max(confidence, 0), 1),
        topic,
        summary,
        engine: 'ollama:' + this.ollamaModel,
      });
    }

    return results;
  }

  /**
   * Build a structured sentiment analysis prompt for the LLM.
   */
  private buildSentimentPrompt(text: string, customTags?: string): string {
    const categories = customTags
      ? customTags
      : 'Positive, Negative, Neutral';

    return `You are a sentiment analysis and topic classification expert. Analyze the following text and respond with ONLY a valid JSON object (no markdown, no explanation, just JSON).

Classify the sentiment as one of: ${categories}
Identify the main topic as a single word (e.g. Economics, Politics, Technology, Health, Education, Sports, Science, Culture, Environment, Law).
Write a concise summary of 3-4 sentences that captures the key points for a content preview.

Respond in this exact JSON format:
{"sentiment": "<category>", "confidence": <0.0 to 1.0>, "topic": "<single word topic>", "summary": "<3-4 sentence summary>"}

Text to analyze:
"""${text.substring(0, 1500)}"""

JSON response:`;
  }

  private chunkString(str: string, size: number): string[] {
    const numChunks = Math.ceil(str.length / size);
    const chunks = new Array(numChunks);
    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
      chunks[i] = str.substring(o, Math.min(o + size, str.length));
    }
    return chunks;
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'Web';
    }
  }
}

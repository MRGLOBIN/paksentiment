import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import * as crypto from 'crypto';
import { firstValueFrom } from 'rxjs';
import { AnalysisSessionEntity } from '../../../database/entities/mongo/analysis-session.entity';
import { PostStorageService } from '../post-storage.service';
import { AbstractDataProvider } from './abstract-data.provider';
import { SentimentProvider } from './sentiment.provider';

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

  /** Minimum text length to consider Colly result "good enough" */
  private static readonly MIN_CONTENT_LENGTH = 200;

  constructor(
    httpService: HttpService,
    postStorage: PostStorageService,
    @InjectRepository(AnalysisSessionEntity, 'mongo')
    sessionRepo: MongoRepository<AnalysisSessionEntity>,
    private readonly sentimentProvider: SentimentProvider,
  ) {
    super(httpService, postStorage, sessionRepo, WebProvider.name);
    this.sidecarUrl = process.env.COLLY_SIDECAR_URL || 'http://localhost:8081';
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
        sentiment = await this.sentimentProvider.analyzeSentiment(posts, customTags);
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

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'Web';
    }
  }
}

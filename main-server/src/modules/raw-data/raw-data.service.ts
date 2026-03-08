import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as util from 'util';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { firstValueFrom } from 'rxjs';
import { translate } from 'google-translate-api-x';

import { AnalysisSessionEntity } from '../../database/entities/mongo/analysis-session.entity';
import {
  RedditRawDataQueryDto,
  RedditSentimentQueryDto,
} from './dto/reddit-raw-data-query.dto';
import {
  TwitterRawDataQueryDto,
  TwitterSentimentQueryDto,
} from './dto/twitter-raw-data-query.dto';
import { PostStorageService } from './post-storage.service';

// Providers
import { RedditProvider } from './providers/reddit.provider';
import { TwitterProvider } from './providers/twitter.provider';
import { YouTubeProvider } from './providers/youtube.provider';
import { CommonCrawlProvider } from './providers/commoncrawl.provider';
import { ScraplingProvider } from './providers/scrapling.provider';
import { WebProvider } from './providers/web.provider';

@Injectable()
/**
 * Service to aggregate data from external sources via FastAPI Gateway.
 * Manages search sessions, data persistence (MongoDB), and activity logging.
 * Refactored to use Facade Pattern over specific Providers.
 */
export class RawDataService {
  private readonly logger = new Logger(RawDataService.name);

  constructor(
    private readonly postStorage: PostStorageService,
    private readonly httpService: HttpService,
    @InjectRepository(AnalysisSessionEntity, 'mongo')
    private readonly sessionRepo: MongoRepository<AnalysisSessionEntity>,
    // Injected Providers
    private readonly redditProvider: RedditProvider,
    private readonly twitterProvider: TwitterProvider,
    private readonly youtubeProvider: YouTubeProvider,
    private readonly commonCrawlProvider: CommonCrawlProvider,
    private readonly scraplingProvider: ScraplingProvider,
    private readonly webProvider: WebProvider,
  ) { }

  /**
   * Retrieve stored session data (Raw + Processed).
   *
   * @param sessionId Unique session ID
   * @returns Aggregated session object with posts and sentiment
   */
  async getSessionData(sessionId: string) {
    const session = await this.sessionRepo.findOne({ where: { sessionId } });
    if (!session) {
      throw new InternalServerErrorException('Session not found');
    }

    // Fetch both Processed (Sentiment) and Raw (Content/Metadata)
    const [processedResult, rawResult] = await Promise.all([
      this.postStorage.getProcessedPostsBySourceIds(session.postIds),
      this.postStorage.getRawPostsBySourceIds(session.postIds),
    ]);

    const processedMap = new Map();
    for (const p of processedResult.posts) {
      if (p.metadata && p.metadata.sourceId) {
        const key = String(p.metadata.sourceId);
        if (processedMap.has(key)) {
          Object.assign(processedMap.get(key), p);
        } else {
          processedMap.set(key, p);
        }
      }
    }

    const rawMap = new Map();
    for (const p of rawResult.posts) {
      if (p.metadata && p.metadata.sourceId) {
        const key = String(p.metadata.sourceId);
        if (rawMap.has(key)) {
          // Safe merge to prevent shallow legacy overwrite
          const existing = rawMap.get(key);
          Object.keys(p).forEach(k => {
            if (p[k] !== undefined && p[k] !== null) {
              existing[k] = p[k];
            }
          });
          // Ensure deeply nested arrays or metadata merge cleanly if possible
          if (p.metadata) {
            existing.metadata = { ...(existing.metadata || {}), ...p.metadata };
          }
        } else {
          rawMap.set(key, p);
        }
      }
    }

    const normalizedPosts = session.postIds
      .map((idRaw) => {
        const id = String(idRaw);
        const raw = rawMap.get(id);
        const processed = processedMap.get(id);

        const cleanText = processed?.cleanText || raw?.cleanText || '';
        const title = raw?.title || (cleanText || '').substring(0, 50) + '...';
        const author =
          (raw?.metadata?.author as string) ||
          (raw?.metadata?.author_name as string) ||
          'Session Record';

        return {
          id: id,
          title: title,
          text: cleanText,
          content: cleanText,
          author: author,
          url:
            raw?.url ||
            (raw?.metadata?.url as string) ||
            ((raw?.metadata?.sourceId as string)?.startsWith('http')
              ? raw?.metadata?.sourceId
              : undefined),
          timestamp: raw?.metadata?.timestamp || raw?.createdAt,
          sentiment: processed?.sentiment?.label,
          confidence: processed?.sentiment?.score,
          metadata: raw?.metadata,
        };
      })
      .filter((p) => p.text || p.url);

    this.logger.log(
      `[getSessionData] Session ${sessionId}: Returning ${normalizedPosts.length} posts.`,
    );

    const normalizedSentiment = normalizedPosts.map((p) => ({
      id: p.id,
      sentiment: p.sentiment,
      score: p.confidence,
      summary: processedMap.get(p.id)?.metadata?.summary,
      topic: processedMap.get(p.id)?.metadata?.topic || 'General',
      engine: processedMap.get(p.id)?.metadata?.engine || 'unknown',
    }));

    return {
      source: session.source + ' (History)',
      count: normalizedPosts.length,
      posts: normalizedPosts,
      sentiment: normalizedSentiment,
    };
  }

  // --- Facade Methods ---

  /**
   * Fetch raw Reddit posts via Gateway.
   */
  async fetchRedditPosts(query: RedditRawDataQueryDto, userId?: number) {
    return this.redditProvider.fetch(query, userId);
  }

  /**
   * Fetch raw Twitter tweets via Gateway.
   */
  async fetchTwitterPosts(query: TwitterRawDataQueryDto, userId?: number) {
    return this.twitterProvider.fetch(query, userId);
  }

  /**
   * Fetch Reddit posts and perform sentiment analysis via Gateway.
   */
  async fetchRedditSentiment(query: RedditSentimentQueryDto, userId?: number) {
    return this.redditProvider.fetchSentiment(query, userId);
  }

  /**
   * Fetch Tweets and perform sentiment analysis via Gateway.
   */
  async fetchTwitterSentiment(
    query: TwitterSentimentQueryDto,
    userId?: number,
  ) {
    return this.twitterProvider.fetchSentiment(query, userId);
  }

  async fetchYouTubeVideos(query: any, userId?: number) {
    return this.youtubeProvider.fetch(query, userId);
  }

  async fetchYouTubeComments(query: any) {
    return this.youtubeProvider.fetchComments(query);
  }

  async fetchYouTubeTranscript(query: any) {
    return this.youtubeProvider.fetchTranscript(query);
  }

  /**
   * Fetch Common Crawl records with sentiment.
   */
  async fetchCommonCrawl(query: any, userId?: number) {
    return this.commonCrawlProvider.fetchSentiment(query, userId);
  }

  /**
   * Fetch web content with Colly → Scrapling fallback + sentiment.
   */
  async fetchWeb(query: any, userId?: number) {
    return this.webProvider.fetchSentiment(query, userId);
  }

  /**
   * Fetch web content using Scrapling.
   */
  async fetchScrapling(query: any, userId?: number) {
    return this.scraplingProvider.fetchSentiment(query, userId);
  }

  // --- Logic Orchestration ---

  // The executeSmartSearch and planQuery were removed to enforce SRP and avoid context mixing.

  /*
  async selectAILinks(userQuery: string): Promise<any> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException(
        'GROQ_API_KEY not configured on server',
      );
    }

    let categorizedLinks: Record<string, string[]> = {};
    try {
      const linksPath = path.join(process.cwd(), 'trusted_links.json');
      const fileContent = fs.readFileSync(linksPath, 'utf-8');
      categorizedLinks = JSON.parse(fileContent);
    } catch (err) {
      this.logger.error('[SelectAILinks] Could not read trusted_links.json, falling back to defaults:', err.message);
      categorizedLinks = {
        "Business": ["https://www.dawn.com/business", "https://tribune.com.pk/business"],
        "Politics": ["https://www.dawn.com/pakistan"],
        "Sports": ["https://www.geo.tv/category/sports"]
      };
    }

    // Flatten to an array for hallucination checks later
    const allTrustedLinks = Object.values(categorizedLinks).flat();

    const formattedCategories = Object.entries(categorizedLinks)
      .map(([category, links]) => `[Category: ${category}]\n${links.map(l => `- ${l}`).join('\n')}`)
      .join('\n\n');

    const payload = {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are an intelligent routing and categorization assistant for a news aggregation platform. Respond ONLY with valid JSON arrays.',
        },
        {
          role: 'user',
          content: `You are a helpful AI assistant. The user wants to search for: '${userQuery}'.

Here is a categorized dictionary of trusted URLs you can pull from:

${formattedCategories}

INSTRUCTIONS:
1. Analyze the user's query and determine the best matching Category (or Categories) above.
2. From those most relevant Categories, pick up to 3 of the absolute best matching URLs.
3. If the query spans multiple topics, you can select links from different categories.
4. Respond ONLY with a valid JSON array of strings containing the exact URLs you selected. No markdown, no conversational text.

Example format: ["https://example.com/target-1", "https://example.com/target-2"]`,
        },
      ],
      temperature: 0.1,
      max_tokens: 500,
    };

    try {
      const response: any = await firstValueFrom(
        this.httpService.post(
          'https://api.groq.com/openai/v1/chat/completions',
          payload,
          { headers: { Authorization: `Bearer ${apiKey}` } },
        ),
      );

      let text = response.data.choices[0].message.content.trim();

      if (text.startsWith("\`\`\`json")) {
        text = text.substring(7).trim();
      } else if (text.startsWith("\`\`\`")) {
        text = text.substring(3).trim();
      }
      if (text.endsWith("\`\`\`")) {
        text = text.substring(0, text.length - 3).trim();
      }

      let parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        parsed = typeof parsed === 'string' ? [parsed] : [];
      }

      // Deep verification against the flattened dataset
      let selectedUrls = parsed.filter(url => typeof url === 'string' && allTrustedLinks.includes(url));

      // Fuzzy fallback
      if (selectedUrls.length === 0 && parsed.length > 0) {
        for (const p of parsed) {
          if (typeof p === 'string') {
            for (const link of allTrustedLinks) {
              if (link.includes(p) || p.includes(link)) {
                selectedUrls.push(link);
              }
            }
          }
        }
      }

      selectedUrls = Array.from(new Set(selectedUrls));

      return { urls: selectedUrls.slice(0, 3) };

    } catch (error) {
      this.logger.error(
        '[SelectAILinks] Error from Groq:',
        error?.response?.data || error.message,
      );
      throw new InternalServerErrorException('Failed to get AI link suggestions');
    }
  }
  */

  async getStoredData(query: any) {
    return this.postStorage.getProcessedPosts(query);
  }
}

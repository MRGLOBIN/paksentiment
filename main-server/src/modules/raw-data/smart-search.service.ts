import { HttpService } from '@nestjs/axios';
import {
    Injectable,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import * as crypto from 'crypto';
import { firstValueFrom } from 'rxjs';

import { AnalysisSessionEntity } from '../../database/entities/mongo/analysis-session.entity';
import {
    RedditSentimentQueryDto,
} from './dto/reddit-raw-data-query.dto';
import {
    TwitterSentimentQueryDto,
} from './dto/twitter-raw-data-query.dto';

import { RedditProvider } from './providers/reddit.provider';
import { TwitterProvider } from './providers/twitter.provider';
import { CommonCrawlProvider } from './providers/commoncrawl.provider';
import { ScraplingProvider } from './providers/scrapling.provider';
import { WebProvider } from './providers/web.provider';

@Injectable()
export class SmartSearchService {
    private readonly logger = new Logger(SmartSearchService.name);

    constructor(
        private readonly httpService: HttpService,
        @InjectRepository(AnalysisSessionEntity, 'mongo')
        private readonly sessionRepo: MongoRepository<AnalysisSessionEntity>,
        private readonly redditProvider: RedditProvider,
        private readonly twitterProvider: TwitterProvider,
        private readonly commonCrawlProvider: CommonCrawlProvider,
        private readonly scraplingProvider: ScraplingProvider,
        private readonly webProvider: WebProvider,
    ) { }

    /**
     * Execute a Smart Search using AI Planning.
     */
    async executeSmartSearch(
        userQuery: string,
        userId: number,
        customTags?: string,
    ): Promise<any> {
        this.logger.log(`[SmartSearch] Starting for user ${userId}: ${userQuery}`);

        // 1. Generate Plan
        const planResult = await this.planQuery(userQuery);
        const plans = planResult.plan || [];

        if (plans.length === 0) {
            throw new InternalServerErrorException(
                'AI could not generate a valid search plan.',
            );
        }

        this.logger.log(`[SmartSearch] Plan generated with ${plans.length} steps`);

        // 2. Execute Plans in Parallel
        const promises = plans.map(async (p: any) => {
            try {
                if (p.source === 'reddit_sentiment' || p.source === 'reddit') {
                    const dto = new RedditSentimentQueryDto();
                    dto.subreddit = p.params?.subreddit || 'pakistan';
                    dto.query = p.params?.query || userQuery;
                    dto.limit = p.params?.limit || 10;
                    if (customTags) dto.customTags = customTags;
                    return await this.redditProvider.fetchSentiment(dto, undefined);
                } else if (p.source === 'twitter_sentiment' || p.source === 'twitter') {
                    const dto = new TwitterSentimentQueryDto();
                    dto.query = p.params?.query || userQuery;
                    dto.maxResults = parseInt(String(p.params?.maxResults || 10), 10);
                    if (customTags) dto.customTags = customTags;
                    return await this.twitterProvider.fetchSentiment(dto, undefined);
                } else if (p.source === 'scrapling') {
                    if (!p.params?.url) return null;
                    return await this.scraplingProvider.fetchSentiment(
                        {
                            url: p.params.url,
                            fetchLimit: p.params.fetchLimit,
                            useLocal: true,
                            customTags: customTags,
                        },
                        undefined,
                    );
                } else if (p.source === 'commoncrawl') {
                    if (!p.params?.domain) return null;
                    return await this.commonCrawlProvider.fetchSentiment(
                        p.params,
                        undefined,
                    );
                } else if (p.source === 'web_search') {
                    if (!p.params?.query) return null;
                    const limit = p.params?.limit || 3;

                    this.logger.log(`[SmartSearch] Triggering web_search for query: ${p.params.query}`);
                    const collyUrl = process.env.COLLY_SIDECAR_URL || 'http://localhost:8081';

                    const searchRes = await firstValueFrom(
                        this.httpService.post(`${collyUrl}/search`, { query: p.params.query })
                    );

                    const searchData = searchRes.data;
                    if (searchData.success && searchData.results && searchData.results.length > 0) {
                        const topResults = searchData.results.slice(0, limit);

                        // Trigger sentiment web-scrape for each link
                        const scrapePromises = topResults.map(async (res: any) => {
                            try {
                                return await this.webProvider.fetchSentiment({
                                    url: res.link,
                                    followLinks: false,
                                    fetchLimit: 1,
                                    customTags: customTags
                                }, undefined);
                            } catch (e) {
                                this.logger.error(`[SmartSearch] web_search failed to scrape ${res.link}:`, e.message);
                                return null;
                            }
                        });

                        const scrapeResults = await Promise.all(scrapePromises);

                        let combinedPosts: any[] = [];
                        let combinedSentiment: any[] = [];
                        let combinedCount = 0;

                        for (const s of scrapeResults) {
                            if (s) {
                                combinedPosts = [...combinedPosts, ...(s.posts || [])];
                                combinedSentiment = [...combinedSentiment, ...(s.sentiment || [])];
                                combinedCount += (s.count || s.posts?.length || 0);
                            }
                        }

                        return {
                            source: 'web_search',
                            count: combinedCount,
                            posts: combinedPosts,
                            sentiment: combinedSentiment
                        };
                    }
                    return null;
                }
                return null;
            } catch (e) {
                this.logger.error(
                    `[SmartSearch] Step failed for ${p.source}:`,
                    e.message,
                );
                return null;
            }
        });

        const results = await Promise.all(promises);

        // 3. Aggregate Results
        let allPosts: any[] = [];
        let allSentiment: any[] = [];
        let totalCount = 0;

        results.forEach((res: any) => {
            if (!res) return;
            const posts = res.posts || res.tweets || res.videos || res.records || [];
            const sentiment = res.sentiment || [];
            allPosts = [...allPosts, ...posts];
            allSentiment = [...allSentiment, ...sentiment];
            totalCount += res.count || posts.length;
        });

        // 4. Save Unified Session
        const sessionId = crypto.randomUUID();

        await this.saveSessionLocal(
            sessionId,
            userId,
            userQuery,
            'smart_search_mixed',
            allPosts,
        );

        return {
            source: 'Smart Search (AI)',
            count: totalCount,
            posts: allPosts,
            sentiment: allSentiment,
            sessionId: sessionId,
            plan: plans,
        };
    }

    private async saveSessionLocal(
        sessionId: string,
        userId: number,
        query: string,
        source: string,
        rawPosts: any[],
    ) {
        if (!userId) return;
        const postIds = rawPosts
            .map((post) => {
                return (
                    post.post_id ??
                    post.id ??
                    post.tweet_id ??
                    post.comment_id ??
                    post.url ??
                    post.video_id ??
                    post.comment_id ??
                    ''
                ).toString();
            })
            .filter((id) => id && id !== 'undefined');

        const existingSession = await this.sessionRepo.findOne({ where: { sessionId } });

        if (existingSession) {
            const newPostIds = postIds.filter(id => !existingSession.postIds.includes(id));
            if (newPostIds.length > 0) {
                existingSession.postIds = [...existingSession.postIds, ...newPostIds];
                await this.sessionRepo.save(existingSession);
            }
        } else {
            const session = this.sessionRepo.create({
                sessionId,
                userId,
                query,
                source,
                postIds,
                createdAt: new Date(),
            });
            await this.sessionRepo.save(session);
        }
    }

    async planQuery(userQuery: string): Promise<any> {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new InternalServerErrorException(
                'GROQ_API_KEY not configured on server',
            );
        }

        const payload = {
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `You are a data retrieval assistant for an advanced Data Analytics Platform.
Your goal is to analyze the user's natural language request and generate a plan to fetch data from ALL available sources simultaneously based on any topic worldwide.

AVAILABLE SOURCES:
1. "reddit_sentiment"
 - Params: { subreddit: string, query: string, limit: number (default 10) }
 - Use for: Public opinion, discussions, community reactions. Pick the most relevant subreddit for the topic (e.g. 'technology', 'worldnews', 'movies', 'politics', 'programming').
2. "scrapling"
 - Params: { url: string, fetchLimit: number (1-3) }
 - Use for: Analyzing a specific URL provided by the user. ONLY include this if the user provides a URL.
3. "commoncrawl"
 - Params: { domain: string, keyword: string, limit: number (default 10) }
 - Use for: Finding articles or pages from specific domains. Pick the most relevant high-authority domain for the query (e.g. 'medium.com', 'cnn.com', 'techcrunch.com', 'github.com', 'wikipedia.org'). The 'keyword' must be a SINGLE ENGLISH WORD that would likely appear in the article's URL slug (e.g. "software", "election", "market").
4. "web_search"
 - Params: { query: string, limit: number (default 3) }
 - Use for: Live real-time web results. The system will search the web, fetch the top links, and scrape them to get content.

CRITICAL RULES:
- You MUST ALWAYS include ALL THREE of these sources in every plan: "reddit_sentiment", "commoncrawl", and "web_search".
- Only include "scrapling" if the user explicitly provides a URL.
- If the user's request is not in English (e.g., Urdu, Roman Urdu), translate the intent to English before generating the queries. ALL generated queries MUST be in English.
- Generate a tailored, specific search query string for EACH source based on the user's request.
- For "commoncrawl", pick the single most globally relevant domain AND provide a single broad keyword to find articles.
- For "web_search", craft a concise but descriptive generic search engine query.
- For "reddit_sentiment", craft a good Reddit search query and pick the best matching subreddit.
- Return ONLY a JSON object with a "plan" array. No extra text.

RESPONSE FORMAT:
{
"plan": [
  { "source": "reddit_sentiment", "params": { "subreddit": "technology", "query": "artificial intelligence breakthroughs 2026", "limit": 10 } },
  { "source": "commoncrawl", "params": { "domain": "techcrunch.com", "keyword": "ai", "limit": 10 } },
  { "source": "web_search", "params": { "query": "latest artificial intelligence news and breakthroughs 2026", "limit": 10 } }
]
}`,
                },
                {
                    role: 'user',
                    content: userQuery,
                }
            ],
            response_format: { type: 'json_object' },
        };

        try {
            const response: any = await firstValueFrom(
                this.httpService.post(
                    'https://api.groq.com/openai/v1/chat/completions',
                    payload,
                    { headers: { Authorization: `Bearer ${apiKey}` } },
                ),
            );
            const content = response.data.choices[0].message.content;
            return JSON.parse(content);
        } catch (error) {
            this.logger.error(
                '[PlanQuery] Error:',
                error?.response?.data || error.message,
            );
            throw new InternalServerErrorException('Failed to generate query plan');
        }
    }
}

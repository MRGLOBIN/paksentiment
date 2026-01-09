
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import * as crypto from 'crypto';
import { AnalysisSessionEntity } from '../../../database/entities/mongo/analysis-session.entity';
import { PostStorageService } from '../post-storage.service';
import { AbstractDataProvider } from './abstract-data.provider';

@Injectable()
export class ScraplingProvider extends AbstractDataProvider {
    constructor(
        httpService: HttpService,
        postStorage: PostStorageService,
        @InjectRepository(AnalysisSessionEntity, 'mongo')
        sessionRepo: MongoRepository<AnalysisSessionEntity>,
    ) {
        super(httpService, postStorage, sessionRepo, ScraplingProvider.name);
    }

    // Scrapling fetch usually implies sentiment analysis in this system's context
    // But we can implement raw fetch separately if needed.
    // The previous service combined everything into 'fetchScrapling'.
    async fetch(query: any, userId?: number): Promise<any> {
        // Map to fetchSentiment for now as it handles the full flow
        return this.fetchSentiment(query, userId);
    }

    async fetchSentiment(query: any, userId?: number): Promise<any> {
        const { url, sentiments } = query;
        this.logger.log(`Fetching URL: ${url}`);

        // 1. Fetch Page Content
        const params: any = { url };
        if (query.followLinks) {
            params.follow_links = 'true';
            params.limit = query.fetchLimit || '3';
        }

        const response = await this.proxyRequest<any>('/scrapling/fetch', { params });
        const results = response.results || [response];

        // 2. Wrap in Post format
        const uniqueResults = Array.from(new Map(results.map((item: any) => [item.url, item])).values());
        const posts = uniqueResults.map((res: any) => {
            // Use Node's crypto here, imported as * as crypto
            const docId = crypto.createHash('md5').update(res.url).digest('hex');
            return {
                id: docId,
                url: res.url,
                content: (res.text || '').substring(0, 5000),
                author: new URL(res.url).hostname,
                timestamp: new Date().toISOString()
            };
        });

        // 3. Store Raw
        await this.storeRaw('scrapling', posts);

        // 4. Sentiment Analysis
        let sentiment: any[] = [];
        try {
            const sentimentEndpoint = query.useLocal
                ? '/sentiment/analyze/local'
                : '/sentiment/analyze';

            // Chunking logic
            const CHUNK_SIZE = 2000;
            const allDocs: { id: string, text: string, originalId: string }[] = [];

            posts.forEach((p: any) => {
                if (p.content.length > CHUNK_SIZE) {
                    const chunks = this.chunkString(p.content, CHUNK_SIZE);
                    chunks.forEach((chunk, idx) => {
                        allDocs.push({
                            id: `${p.id}_chunk_${idx}`,
                            originalId: p.id,
                            text: chunk
                        });
                    });
                } else {
                    allDocs.push({ id: p.id, originalId: p.id, text: p.content });
                }
            });

            const sentimentRes = await this.proxyRequest<any>(sentimentEndpoint, {
                method: 'POST',
                data: {
                    documents: allDocs.map(d => ({ id: d.id, text: d.text })),
                    sentiments: sentiments,
                    custom_sentiments: query.customTags // <--- ADDED
                }
            });

            // Aggregation (Reuse logic)
            const sentimentMap = new Map<string, any[]>();
            (sentimentRes.sentiment || []).forEach((s: any) => {
                const match = allDocs.find(d => d.id === s.id);
                if (match) {
                    const oid = match.originalId;
                    if (!sentimentMap.has(oid)) sentimentMap.set(oid, []);
                    sentimentMap.get(oid)!.push(s);
                }
            });

            sentiment = Array.from(sentimentMap.entries()).map(([id, resultList]) => {
                if (resultList.length === 1) return resultList[0];
                const counts: any = {};
                let totalConfidence = 0;
                const summaries: string[] = [];
                resultList.forEach((r: any) => {
                    counts[r.sentiment] = (counts[r.sentiment] || 0) + (r.confidence || 0);
                    totalConfidence += r.confidence || 0;
                    if (r.summary) summaries.push(r.summary);
                });
                const winner = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
                return {
                    id,
                    sentiment: winner,
                    confidence: totalConfidence / resultList.length,
                    summary: summaries.join('\n---\n'),
                    chunk_results: resultList
                };
            });

        } catch (e) {
            this.logger.warn(`Sentiment analysis failed: ${e.message}`);
        }

        // 5. Store Processed
        if (sentiment.length > 0) {
            await this.storeProcessed('scrapling', posts, [], sentiment);
        }

        const finalResponse = {
            source: 'scrapling',
            count: posts.length,
            posts: posts,
            sentiment: sentiment,
            sessionId: undefined as string | undefined
        };

        if (userId) {
            const sessionId = crypto.randomUUID();
            finalResponse.sessionId = sessionId;
            await this.saveSession(sessionId, userId, url, 'scrapling', posts);
        }

        return finalResponse;
    }

    private chunkString(str: string, size: number): string[] {
        const numChunks = Math.ceil(str.length / size);
        const chunks = new Array(numChunks);
        for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
            chunks[i] = str.substring(o, Math.min(o + size, str.length));
        }
        return chunks;
    }
}

import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { CrawlJobEntity } from '../../database/entities/mongo/crawl-job.entity';

/**
 * CrawlerService orchestrates calls to the Go Colly sidecar (fast, static HTML)
 * and optionally falls back to the Python FastAPI gateway (headless browser).
 */
@Injectable()
export class CrawlerService {
    private readonly logger = new Logger(CrawlerService.name);
    private readonly sidecarUrl: string;
    private readonly fastApiUrl: string;

    constructor(
        private readonly httpService: HttpService,
        @InjectRepository(CrawlJobEntity, 'mongo')
        private readonly jobRepo: MongoRepository<CrawlJobEntity>,
    ) {
        this.sidecarUrl = process.env.COLLY_SIDECAR_URL || 'http://localhost:8081';
        this.fastApiUrl = process.env.FAST_API_BASE_URL || 'http://localhost:8000';
    }

    /**
     * Scrape a single page via the Go Colly sidecar.
     */
    async scrape(url: string, selectors?: Record<string, string>): Promise<any> {
        try {
            this.logger.log(`[Scrape] ${url} via Colly sidecar`);
            const { data } = await firstValueFrom(
                this.httpService.post(`${this.sidecarUrl}/scrape`, {
                    url,
                    selectors: selectors || {},
                }),
            );
            return data;
        } catch (error) {
            this.logger.error(`[Scrape] Sidecar error: ${error.message}`);
            throw new InternalServerErrorException(`Colly scrape failed: ${error.message}`);
        }
    }

    /**
     * Deep crawl via the Go Colly sidecar.
     */
    async crawl(
        url: string,
        maxDepth = 2,
        limit = 20,
        allowedDomains?: string[],
        delayMs = 100,
    ): Promise<any> {
        try {
            this.logger.log(`[Crawl] ${url} depth=${maxDepth} limit=${limit} via Colly`);
            const { data } = await firstValueFrom(
                this.httpService.post(`${this.sidecarUrl}/crawl`, {
                    url,
                    max_depth: maxDepth,
                    limit,
                    allowed_domains: allowedDomains || [],
                    delay_ms: delayMs,
                }),
            );
            return data;
        } catch (error) {
            this.logger.error(`[Crawl] Sidecar error: ${error.message}`);
            throw new InternalServerErrorException(`Colly crawl failed: ${error.message}`);
        }
    }

    /**
     * Scrape via Python FastAPI (headless browser) for JS-heavy sites.
     */
    async scrapeHeadless(url: string, followLinks = false, limit = 3): Promise<any> {
        try {
            this.logger.log(`[Headless] ${url} via FastAPI/Scrapling`);
            const { data } = await firstValueFrom(
                this.httpService.get(`${this.fastApiUrl}/scrapling/fetch`, {
                    params: {
                        url,
                        follow_links: followLinks ? 'true' : 'false',
                        limit,
                    },
                }),
            );
            return data;
        } catch (error) {
            this.logger.error(`[Headless] FastAPI error: ${error.message}`);
            throw new InternalServerErrorException(`Headless scrape failed: ${error.message}`);
        }
    }

    /**
     * Retrieve a crawl job's results by session ID from MongoDB.
     */
    async getJobBySession(sessionId: string): Promise<CrawlJobEntity | null> {
        return this.jobRepo.findOne({ where: { sessionId } as any });
    }

    /**
     * Get cache stats from the Go sidecar.
     */
    async getCacheStats(): Promise<any> {
        try {
            const { data } = await firstValueFrom(
                this.httpService.get(`${this.sidecarUrl}/cache/stats`),
            );
            return data;
        } catch (error) {
            this.logger.warn(`[CacheStats] Error: ${error.message}`);
            return { hits: 0, misses: 0, keys: 0, error: error.message };
        }
    }

    /**
     * Health check for the Go sidecar.
     */
    async getSidecarHealth(): Promise<any> {
        try {
            const { data } = await firstValueFrom(
                this.httpService.get(`${this.sidecarUrl}/health`),
            );
            return data;
        } catch (error) {
            return { status: 'unreachable', error: error.message };
        }
    }
}

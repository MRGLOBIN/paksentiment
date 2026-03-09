import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    UseGuards,
    Request,
    Logger,
    HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import {
    ScrapeDocs,
    CrawlDocs,
    ScrapeHeadlessDocs,
    GetResultsDocs,
    CacheStatsDocs,
    SidecarHealthDocs
} from './crawler.docs';
import { CrawlerService } from './crawler.service';

@ApiTags('Crawler')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('crawler')
export class CrawlerController {
    private readonly logger = new Logger(CrawlerController.name);

    constructor(private readonly crawlerService: CrawlerService) { }

    /**
     * Scrape a single page via Go Colly sidecar (fast, static HTML).
     */
    @Post('scrape')
    @ScrapeDocs()
    async scrape(
        @Body('url') url: string,
        @Body('selectors') selectors?: Record<string, string>,
    ) {
        this.logger.log(`[Scrape] Request for ${url}`);
        return this.crawlerService.scrape(url, selectors);
    }

    /**
     * Deep crawl via Go Colly sidecar (follows links).
     */
    @Post('crawl')
    @HttpCode(202)
    @CrawlDocs()
    async crawl(
        @Body('url') url: string,
        @Body('max_depth') maxDepth?: number,
        @Body('limit') limit?: number,
        @Body('allowed_domains') allowedDomains?: string[],
        @Body('delay_ms') delayMs?: number,
    ) {
        this.logger.log(`[Crawl] Request for ${url} depth=${maxDepth} limit=${limit}`);
        return this.crawlerService.crawl(url, maxDepth, limit, allowedDomains, delayMs);
    }

    /**
     * Scrape via Python headless browser for JS-heavy sites.
     */
    @Post('scrape-headless')
    @ScrapeHeadlessDocs()
    async scrapeHeadless(
        @Body('url') url: string,
        @Body('follow_links') followLinks?: boolean,
        @Body('limit') limit?: number,
    ) {
        this.logger.log(`[Headless] Request for ${url}`);
        return this.crawlerService.scrapeHeadless(url, followLinks, limit);
    }

    /**
     * Retrieve crawl job results from MongoDB.
     */
    @Get('results/:sessionId')
    @GetResultsDocs()
    async getResults(@Param('sessionId') sessionId: string) {
        const job = await this.crawlerService.getJobBySession(sessionId);
        if (!job) {
            return { error: 'Job not found', sessionId };
        }
        return job;
    }

    /**
     * Get Go sidecar cache statistics.
     */
    @Get('cache/stats')
    @CacheStatsDocs()
    async cacheStats() {
        return this.crawlerService.getCacheStats();
    }

    /**
     * Health check for the Go sidecar.
     */
    @Get('health')
    @SidecarHealthDocs()
    async sidecarHealth() {
        return this.crawlerService.getSidecarHealth();
    }
}

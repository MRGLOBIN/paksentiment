import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    UseGuards,
    Request,
    Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
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
    @ApiOperation({
        summary: 'Scrape Single Page (Colly)',
        description: 'Fetches a single page using the high-performance Go Colly sidecar. Best for static HTML pages.',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                url: { type: 'string', example: 'https://example.com' },
                selectors: {
                    type: 'object',
                    example: { title: 'h1', content: 'article' },
                    description: 'Optional CSS selectors to extract specific elements',
                },
            },
            required: ['url'],
        },
    })
    @ApiResponse({ status: 201, description: 'Scrape completed successfully' })
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
    @ApiOperation({
        summary: 'Deep Crawl (Colly)',
        description: 'Performs a multi-page deep crawl using Go Colly with configurable depth, limits, and domain restrictions.',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                url: { type: 'string', example: 'https://example.com' },
                max_depth: { type: 'number', example: 2 },
                limit: { type: 'number', example: 20 },
                allowed_domains: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['example.com'],
                },
                delay_ms: { type: 'number', example: 100 },
            },
            required: ['url'],
        },
    })
    @ApiResponse({ status: 201, description: 'Crawl completed successfully' })
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
    @ApiOperation({
        summary: 'Scrape with Headless Browser (Python)',
        description: 'Uses the Python FastAPI/Scrapling backend for sites that require JavaScript rendering.',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                url: { type: 'string', example: 'https://spa-example.com' },
                follow_links: { type: 'boolean', example: false },
                limit: { type: 'number', example: 3 },
            },
            required: ['url'],
        },
    })
    @ApiResponse({ status: 201, description: 'Headless scrape completed' })
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
    @ApiOperation({
        summary: 'Get Crawl Results',
        description: 'Retrieve stored crawl job results by session ID.',
    })
    @ApiResponse({ status: 200, description: 'Crawl job data' })
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
    @ApiOperation({
        summary: 'Cache Statistics',
        description: 'Returns Redis cache hit/miss statistics from the Go sidecar.',
    })
    async cacheStats() {
        return this.crawlerService.getCacheStats();
    }

    /**
     * Health check for the Go sidecar.
     */
    @Get('health')
    @ApiOperation({
        summary: 'Sidecar Health',
        description: 'Checks if the Go Colly sidecar is running and healthy.',
    })
    async sidecarHealth() {
        return this.crawlerService.getSidecarHealth();
    }
}

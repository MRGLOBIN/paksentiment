import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';

export function ScrapeDocs() {
    return applyDecorators(
        ApiOperation({
            summary: 'Scrape Single Page (Colly)',
            description: 'Fetches a single page using the high-performance Go Colly sidecar. Best for static HTML pages.',
        }),
        ApiBody({
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
        }),
        ApiResponse({ status: 201, description: 'Scrape completed successfully' })
    );
}

export function CrawlDocs() {
    return applyDecorators(
        ApiOperation({
            summary: 'Deep Crawl (Colly)',
            description: 'Performs a multi-page deep crawl using Go Colly with configurable depth, limits, and domain restrictions.',
        }),
        ApiBody({
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
        }),
        ApiResponse({ status: 202, description: 'Crawl job started securely in the background. Polling session UUID returned.' })
    );
}

export function ScrapeHeadlessDocs() {
    return applyDecorators(
        ApiOperation({
            summary: 'Scrape with Headless Browser (Python)',
            description: 'Uses the Python FastAPI/Scrapling backend for sites that require JavaScript rendering.',
        }),
        ApiBody({
            schema: {
                type: 'object',
                properties: {
                    url: { type: 'string', example: 'https://spa-example.com' },
                    follow_links: { type: 'boolean', example: false },
                    limit: { type: 'number', example: 3 },
                },
                required: ['url'],
            },
        }),
        ApiResponse({ status: 201, description: 'Headless scrape completed' })
    );
}

export function GetResultsDocs() {
    return applyDecorators(
        ApiOperation({
            summary: 'Get Crawl Results',
            description: 'Retrieve stored crawl job results by session ID.',
        }),
        ApiResponse({ status: 200, description: 'Crawl job data' })
    );
}

export function CacheStatsDocs() {
    return applyDecorators(
        ApiOperation({
            summary: 'Cache Statistics',
            description: 'Returns Redis cache hit/miss statistics from the Go sidecar.',
        })
    );
}

export function SidecarHealthDocs() {
    return applyDecorators(
        ApiOperation({
            summary: 'Sidecar Health',
            description: 'Checks if the Go Colly sidecar is running and healthy.',
        })
    );
}

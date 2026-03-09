import { applyDecorators } from '@nestjs/common';
import {
    ApiOperation,
    ApiResponse,
    ApiInternalServerErrorResponse,
    ApiBadGatewayResponse,
    ApiNotFoundResponse,
    ApiBody,
} from '@nestjs/swagger';

import {
    RedditRawDataQueryDto,
    RedditSentimentQueryDto,
} from './dto/reddit-raw-data-query.dto';
import {
    TwitterRawDataQueryDto,
    TwitterSentimentQueryDto,
} from './dto/twitter-raw-data-query.dto';
import {
    YouTubeSearchDto,
    YouTubeCommentsDto,
    YouTubeTranscriptDto,
} from './dto/youtube-query.dto';
import { CommonCrawlQueryDto } from './dto/commoncrawl-query.dto';
import { StoredDataQueryDto } from './dto/stored-data-query.dto';
import { ScraplingFetchDto } from './dto/scrapling-query.dto';
import { WebScrapeQueryDto } from './dto/web-query.dto';

export function FetchRedditRawDataDocs() {
    return applyDecorators(
        ApiOperation({
            summary: 'Fetch Reddit posts (raw data)',
            description: `Fetch raw posts from a specific subreddit using a search query (POST request).`,
        }),
        ApiBody({ type: RedditRawDataQueryDto }),
        ApiResponse({
            status: 201, // Changed to 201 for POST
            description: 'Successfully retrieved Reddit posts',
            // ... schema ...
        }),
        ApiInternalServerErrorResponse({
            description: 'Failed to fetch data from FastAPI gateway',
        })
    );
}

export function FetchTwitterRawDataDocs() {
    return applyDecorators(
        ApiOperation({
            summary: 'Fetch Twitter/X posts (raw data)',
            description: `Fetch raw tweets using Twitter's search API (POST request).`,
        }),
        ApiBody({ type: TwitterRawDataQueryDto }),
        ApiResponse({
            status: 201,
            description: 'Successfully retrieved tweets',
            // ... schema ...
        }),
        ApiNotFoundResponse({ description: 'No tweets found' }),
        ApiBadGatewayResponse({ description: 'Twitter API service unavailable' }),
        ApiInternalServerErrorResponse({ description: 'Failed to fetch data' })
    );
}

export function FetchRedditSentimentDocs() {
    return applyDecorators(
        ApiOperation({
            summary: 'Reddit sentiment analysis (full pipeline)',
            description: `Fetch Reddit posts and perform comprehensive sentiment analysis (POST request).`,
        }),
        ApiBody({ type: RedditSentimentQueryDto }),
        ApiResponse({
            status: 201,
            description: 'Successfully analyzed Reddit posts',
            // ... schema ...
        })
    );
}

export function FetchTwitterSentimentDocs() {
    return applyDecorators(
        ApiOperation({
            summary: 'Twitter sentiment analysis (full pipeline)',
            description: `Fetch tweets and perform comprehensive sentiment analysis (POST request).`,
        }),
        ApiBody({ type: TwitterSentimentQueryDto }),
        ApiResponse({
            status: 201,
            description: 'Successfully analyzed tweets',
            // ... schema ...
        })
    );
}

export function FetchYouTubeVideosDocs() {
    return applyDecorators(
        ApiOperation({ summary: 'Search YouTube Videos' }),
        ApiBody({ type: YouTubeSearchDto })
    );
}

export function FetchYouTubeCommentsDocs() {
    return applyDecorators(
        ApiOperation({ summary: 'Get YouTube Video Comments' }),
        ApiBody({ type: YouTubeCommentsDto })
    );
}

export function FetchYouTubeTranscriptDocs() {
    return applyDecorators(
        ApiOperation({ summary: 'Get YouTube Video Transcript' }),
        ApiBody({ type: YouTubeTranscriptDto })
    );
}

export function FetchCommonCrawlDocs() {
    return applyDecorators(
        ApiOperation({ summary: 'Fetch Common Crawl Records' }),
        ApiBody({ type: CommonCrawlQueryDto })
    );
}

export function PlanQueryDocs() {
    return applyDecorators(
        ApiOperation({ summary: 'Generate Search Plan (AI Only)' }),
        ApiBody({
            schema: {
                type: 'object',
                properties: {
                    query: { type: 'string', example: 'find news regarding pti' },
                },
            },
        }),
        ApiResponse({ status: 201, description: 'Execution plan generated' })
    );
}

export function SmartSearchDocs() {
    return applyDecorators(
        ApiOperation({
            summary: 'Smart Search (AI Planner + Execution + Aggregation)',
            description:
                'Uses AI to understand natural language query, plan efficient search across multiple sources, execute them, and aggregate results.',
        }),
        ApiBody({
            schema: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        example: 'What is the sentiment about elections in Pakistan?',
                    },
                    customTags: {
                        type: 'string',
                        example: 'Positive, Negative, Neutral',
                        description: 'Optional comma-separated tags for classification',
                    },
                },
            },
        }),
        ApiResponse({
            status: 201,
            description: 'Smart search completed successfully',
        })
    );
}

export function FetchWebDocs() {
    return applyDecorators(
        ApiOperation({
            summary: 'Web Scrape with Sentiment (Colly → Scrapling fallback)',
            description:
                'Scrapes a URL using the Go Colly sidecar. If the site is JS-heavy and content is thin, automatically falls back to the Python Scrapling headless browser. Performs sentiment analysis on extracted content.',
        }),
        ApiBody({ type: WebScrapeQueryDto }),
        ApiResponse({
            status: 201,
            description: 'Web scrape and analysis completed',
        })
    );
}

export function FetchScraplingDocs() {
    return applyDecorators(
        ApiOperation({ summary: 'Fetch Page via Scrapling' }),
        ApiBody({ type: ScraplingFetchDto })
    );
}

export function FetchStoredDataDocs() {
    return applyDecorators(
        ApiOperation({ summary: 'Fetch processed data from database' }),
        ApiBody({ type: StoredDataQueryDto })
    );
}

export function GetSessionDataDocs() {
    return applyDecorators(
        ApiOperation({ summary: 'Retrieve specific analysis session history' })
    );
}

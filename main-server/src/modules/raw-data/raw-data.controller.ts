import { Body, Controller, Post, Get, UseGuards, Request, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiInternalServerErrorResponse,
  ApiBadGatewayResponse,
  ApiNotFoundResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { AuthGuard } from '../auth/auth.guard';
import { ActivityService } from '../activity/activity.service';

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
import { RawDataService } from './raw-data.service';
import {
  RedditRawDataResponse,
  RedditSentimentResponse,
  TwitterRawDataResponse,
  TwitterSentimentResponse,
} from './interfaces/api-response.interface';

@ApiTags('Reddit', 'Twitter')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('raw-data')
/**
 * Controller for retrieving raw and analyzed data from various social sources.
 * Acts as a facade to the Python Data Gateway.
 */
export class RawDataController {
  constructor(
    private readonly rawDataService: RawDataService,
    private readonly activityService: ActivityService
  ) { }

  @Post('reddit')
  @ApiOperation({
    summary: 'Fetch Reddit posts (raw data)',
    description: `Fetch raw posts from a specific subreddit using a search query (POST request).`,
  })
  @ApiBody({ type: RedditRawDataQueryDto })
  @ApiResponse({
    status: 201, // Changed to 201 for POST
    description: 'Successfully retrieved Reddit posts',
    // ... schema ...
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to fetch data from FastAPI gateway',
  })
  async fetchRedditRawData(
    @Body() query: RedditRawDataQueryDto,
    @Request() req,
  ): Promise<RedditRawDataResponse> {
    const result = await this.rawDataService.fetchRedditPosts(query, req.user.sub);
    await this.activityService.logActivity(req.user.sub, 'SEARCH_REDDIT', { ...query, sessionId: result.sessionId });
    return result;
  }

  @Post('twitter')
  @ApiOperation({
    summary: 'Fetch Twitter/X posts (raw data)',
    description: `Fetch raw tweets using Twitter's search API (POST request).`,
  })
  @ApiBody({ type: TwitterRawDataQueryDto })
  @ApiResponse({
    status: 201,
    description: 'Successfully retrieved tweets',
    // ... schema ...
  })
  @ApiNotFoundResponse({ description: 'No tweets found' })
  @ApiBadGatewayResponse({ description: 'Twitter API service unavailable' })
  @ApiInternalServerErrorResponse({ description: 'Failed to fetch data' })
  async fetchTwitterRawData(
    @Body() query: TwitterRawDataQueryDto,
    @Request() req,
  ): Promise<TwitterRawDataResponse> {
    const result = await this.rawDataService.fetchTwitterPosts(query, req.user.sub);
    await this.activityService.logActivity(req.user.sub, 'SEARCH_TWITTER', { ...query, sessionId: result.sessionId });
    return result;
  }

  @Post('reddit/sentiment')
  @ApiOperation({
    summary: 'Reddit sentiment analysis (full pipeline)',
    description: `Fetch Reddit posts and perform comprehensive sentiment analysis (POST request).`,
  })
  @ApiBody({ type: RedditSentimentQueryDto })
  @ApiResponse({
    status: 201,
    description: 'Successfully analyzed Reddit posts',
    // ... schema ...
  })
  async fetchRedditSentiment(
    @Body() query: RedditSentimentQueryDto,
    @Request() req,
  ): Promise<RedditSentimentResponse> {
    const result = await this.rawDataService.fetchRedditSentiment(query, req.user.sub);
    await this.activityService.logActivity(req.user.sub, 'ANALYZE_REDDIT', { ...query, sessionId: result.sessionId });
    return result;
  }

  @Post('twitter/sentiment')
  @ApiOperation({
    summary: 'Twitter sentiment analysis (full pipeline)',
    description: `Fetch tweets and perform comprehensive sentiment analysis (POST request).`,
  })
  @ApiBody({ type: TwitterSentimentQueryDto })
  @ApiResponse({
    status: 201,
    description: 'Successfully analyzed tweets',
    // ... schema ...
  })
  async fetchTwitterSentiment(
    @Body() query: TwitterSentimentQueryDto,
    @Request() req,
  ): Promise<TwitterSentimentResponse> {
    const result = await this.rawDataService.fetchTwitterSentiment(query, req.user.sub);
    await this.activityService.logActivity(req.user.sub, 'ANALYZE_TWITTER', { ...query, sessionId: result.sessionId });
    return result;
  }

  @Post('youtube/search')
  @ApiOperation({ summary: 'Search YouTube Videos' })
  @ApiBody({ type: YouTubeSearchDto })
  async fetchYouTubeVideos(@Body() query: YouTubeSearchDto, @Request() req) {
    const result = await this.rawDataService.fetchYouTubeVideos(query, req.user.sub);
    await this.activityService.logActivity(req.user.sub, 'SEARCH_YOUTUBE', { ...query, sessionId: result.sessionId });
    return result;
  }

  @Post('youtube/comments')
  @ApiOperation({ summary: 'Get YouTube Video Comments' })
  @ApiBody({ type: YouTubeCommentsDto })
  async fetchYouTubeComments(@Body() query: YouTubeCommentsDto) {
    return await this.rawDataService.fetchYouTubeComments(query);
  }

  @Post('youtube/transcript')
  @ApiOperation({ summary: 'Get YouTube Video Transcript' })
  @ApiBody({ type: YouTubeTranscriptDto })
  async fetchYouTubeTranscript(@Body() query: YouTubeTranscriptDto) {
    return await this.rawDataService.fetchYouTubeTranscript(query);
  }

  @Post('commoncrawl')
  @ApiOperation({ summary: 'Fetch Common Crawl Records' })
  @ApiBody({ type: CommonCrawlQueryDto })
  async fetchCommonCrawl(@Body() query: CommonCrawlQueryDto, @Request() req) {
    const result = await this.rawDataService.fetchCommonCrawl(query, req.user.sub);
    await this.activityService.logActivity(req.user.sub, 'SEARCH_COMMONCRAWL', { ...query, sessionId: result.sessionId });
    return result;
  }

  @Post('plan')
  @ApiOperation({ summary: 'Generate Search Plan (AI Only)' })
  @ApiBody({ schema: { type: 'object', properties: { query: { type: 'string', example: 'find news regarding pti' } } } })
  @ApiResponse({ status: 201, description: 'Execution plan generated' })
  async planQuery(@Body('query') query: string, @Request() req) {
    await this.activityService.logActivity(req.user.sub, 'PLAN_QUERY', { query });
    return await this.rawDataService.planQuery(query);
  }

  @Post('smart')
  @ApiOperation({
    summary: 'Smart Search (AI Planner + Execution + Aggregation)',
    description: 'Uses AI to understand natural language query, plan efficient search across multiple sources, execute them, and aggregate results.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string', example: 'What is the sentiment about elections in Pakistan?' },
        customTags: { type: 'string', example: 'Positive, Negative, Neutral', description: 'Optional comma-separated tags for classification' }
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Smart search completed successfully' })
  async smartSearch(@Body('query') query: string, @Body('customTags') customTags: string, @Request() req) {
    await this.activityService.logActivity(req.user.sub, 'SMART_SEARCH', { query, customTags });
    return await this.rawDataService.executeSmartSearch(query, req.user.sub, customTags);
  }

  @Post('scrapling')
  @ApiOperation({ summary: 'Fetch Page via Scrapling' })
  @ApiBody({ type: ScraplingFetchDto })
  async fetchScrapling(@Body() query: ScraplingFetchDto, @Request() req) {
    const result = await this.rawDataService.fetchScrapling(query, req.user.sub);
    await this.activityService.logActivity(req.user.sub, 'ANALYZE_WEB', { ...query, sessionId: result.sessionId });
    return result;
  }
  @Post('stored')
  @ApiOperation({ summary: 'Fetch processed data from database' })
  @ApiBody({ type: StoredDataQueryDto })
  async fetchStoredData(@Body() query: StoredDataQueryDto, @Request() req) {
    await this.activityService.logActivity(req.user.sub, 'VIEW_STORED', query);
    return await this.rawDataService.getStoredData(query);
  }

  @Get('session/:sessionId')
  @ApiOperation({ summary: 'Retrieve specific analysis session history' })
  async getSessionData(@Param('sessionId') sessionId: string) {
    return await this.rawDataService.getSessionData(sessionId);
  }
}

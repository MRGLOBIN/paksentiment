import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';

import {
  FetchRedditRawDataDocs,
  FetchTwitterRawDataDocs,
  FetchRedditSentimentDocs,
  FetchTwitterSentimentDocs,
  FetchYouTubeVideosDocs,
  FetchYouTubeCommentsDocs,
  FetchYouTubeTranscriptDocs,
  FetchCommonCrawlDocs,
  PlanQueryDocs,
  SmartSearchDocs,
  FetchWebDocs,
  FetchScraplingDocs,
  FetchStoredDataDocs,
  GetSessionDataDocs,
} from './raw-data.docs';

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
import { WebScrapeQueryDto } from './dto/web-query.dto';
import { RawDataService } from './raw-data.service';
import { SmartSearchService } from './smart-search.service';
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
    private readonly smartSearchService: SmartSearchService,
    private readonly activityService: ActivityService,
  ) { }

  @Post('reddit')
  @FetchRedditRawDataDocs()
  async fetchRedditRawData(
    @Body() query: RedditRawDataQueryDto,
    @Request() req,
  ): Promise<RedditRawDataResponse> {
    const result = await this.rawDataService.fetchRedditPosts(
      query,
      req.user.sub,
    );
    await this.activityService.logActivity(req.user.sub, 'SEARCH_REDDIT', {
      ...query,
      sessionId: result.sessionId,
    });
    return result;
  }

  @Post('twitter')
  @FetchTwitterRawDataDocs()
  async fetchTwitterRawData(
    @Body() query: TwitterRawDataQueryDto,
    @Request() req,
  ): Promise<TwitterRawDataResponse> {
    const result = await this.rawDataService.fetchTwitterPosts(
      query,
      req.user.sub,
    );
    await this.activityService.logActivity(req.user.sub, 'SEARCH_TWITTER', {
      ...query,
      sessionId: result.sessionId,
    });
    return result;
  }

  @Post('reddit/sentiment')
  @FetchRedditSentimentDocs()
  async fetchRedditSentiment(
    @Body() query: RedditSentimentQueryDto,
    @Request() req,
  ): Promise<RedditSentimentResponse> {
    const result = await this.rawDataService.fetchRedditSentiment(
      query,
      req.user.sub,
    );
    await this.activityService.logActivity(req.user.sub, 'ANALYZE_REDDIT', {
      ...query,
      sessionId: result.sessionId,
    });
    return result;
  }

  @Post('twitter/sentiment')
  @FetchTwitterSentimentDocs()
  async fetchTwitterSentiment(
    @Body() query: TwitterSentimentQueryDto,
    @Request() req,
  ): Promise<TwitterSentimentResponse> {
    const result = await this.rawDataService.fetchTwitterSentiment(
      query,
      req.user.sub,
    );
    await this.activityService.logActivity(req.user.sub, 'ANALYZE_TWITTER', {
      ...query,
      sessionId: result.sessionId,
    });
    return result;
  }

  @Post('youtube/search')
  @FetchYouTubeVideosDocs()
  async fetchYouTubeVideos(@Body() query: YouTubeSearchDto, @Request() req) {
    const result = await this.rawDataService.fetchYouTubeVideos(
      query,
      req.user.sub,
    );
    await this.activityService.logActivity(req.user.sub, 'SEARCH_YOUTUBE', {
      ...query,
      sessionId: result.sessionId,
    });
    return result;
  }

  @Post('youtube/comments')
  @FetchYouTubeCommentsDocs()
  async fetchYouTubeComments(@Body() query: YouTubeCommentsDto) {
    return await this.rawDataService.fetchYouTubeComments(query);
  }

  @Post('youtube/transcript')
  @FetchYouTubeTranscriptDocs()
  async fetchYouTubeTranscript(@Body() query: YouTubeTranscriptDto) {
    return await this.rawDataService.fetchYouTubeTranscript(query);
  }

  @Post('commoncrawl')
  @FetchCommonCrawlDocs()
  async fetchCommonCrawl(@Body() query: CommonCrawlQueryDto, @Request() req) {
    const result = await this.rawDataService.fetchCommonCrawl(
      query,
      req.user.sub,
    );
    await this.activityService.logActivity(req.user.sub, 'SEARCH_COMMONCRAWL', {
      ...query,
      sessionId: result.sessionId,
    });
    return result;
  }

  @Post('plan')
  @PlanQueryDocs()
  async planQuery(@Body('query') query: string, @Request() req) {
    await this.activityService.logActivity(req.user.sub, 'PLAN_QUERY', {
      query,
    });
    return await this.smartSearchService.planQuery(query);
  }

  @Post('smart')
  @SmartSearchDocs()
  async smartSearch(
    @Body('query') query: string,
    @Body('customTags') customTags: string,
    @Request() req,
  ) {
    const result = await this.smartSearchService.executeSmartSearch(
      query,
      req.user.sub,
      customTags,
    );
    await this.activityService.logActivity(req.user.sub, 'SMART_SEARCH', {
      query,
      customTags,
      sessionId: result.sessionId,
    });
    return result;
  }

  /*
  @Post('ai-links')
  @ApiOperation({
    summary: 'AI Link Selection from trusted list',
    description: 'Uses Groq to select relevant URLs from a predefined list based on natural language query.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string', example: 'Find news about the Pakistan economy' },
      },
    },
  })
  async selectAILinks(@Body('query') query: string, @Request() req) {
    return await this.rawDataService.selectAILinks(query);
  }
  */

  @Post('web')
  @FetchWebDocs()
  async fetchWeb(@Body() query: WebScrapeQueryDto, @Request() req) {
    const result = await this.rawDataService.fetchWeb(query, req.user.sub);
    await this.activityService.logActivity(req.user.sub, 'ANALYZE_WEB', {
      ...query,
      sessionId: result.sessionId,
    });
    return result;
  }

  @Post('scrapling')
  @FetchScraplingDocs()
  async fetchScrapling(@Body() query: ScraplingFetchDto, @Request() req) {
    const result = await this.rawDataService.fetchScrapling(
      query,
      req.user.sub,
    );
    await this.activityService.logActivity(req.user.sub, 'ANALYZE_WEB', {
      ...query,
      sessionId: result.sessionId,
    });
    return result;
  }
  @Post('stored')
  @FetchStoredDataDocs()
  async fetchStoredData(@Body() query: StoredDataQueryDto, @Request() req) {
    await this.activityService.logActivity(req.user.sub, 'VIEW_STORED', query);
    return await this.rawDataService.getStoredData(query);
  }

  @Get('session/:sessionId')
  @GetSessionDataDocs()
  async getSessionData(@Param('sessionId') sessionId: string) {
    return await this.rawDataService.getSessionData(sessionId);
  }
}

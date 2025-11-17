import { Controller, Get, Query } from '@nestjs/common';

import {
  RedditRawDataQueryDto,
  RedditSentimentQueryDto,
} from './dto/reddit-raw-data-query.dto';
import {
  TwitterRawDataQueryDto,
  TwitterSentimentQueryDto,
} from './dto/twitter-raw-data-query.dto';
import { RawDataService } from './raw-data.service';

@Controller('raw-data')
export class RawDataController {
  constructor(private readonly rawDataService: RawDataService) {}

  @Get('reddit')
  fetchRedditRawData(@Query() query: RedditRawDataQueryDto) {
    return this.rawDataService.fetchRedditPosts(query);
  }

  @Get('twitter')
  fetchTwitterRawData(@Query() query: TwitterRawDataQueryDto) {
    return this.rawDataService.fetchTwitterPosts(query);
  }

  @Get('reddit/sentiment')
  fetchRedditSentiment(@Query() query: RedditSentimentQueryDto) {
    return this.rawDataService.fetchRedditSentiment(query);
  }

  @Get('twitter/sentiment')
  fetchTwitterSentiment(@Query() query: TwitterSentimentQueryDto) {
    return this.rawDataService.fetchTwitterSentiment(query);
  }
}


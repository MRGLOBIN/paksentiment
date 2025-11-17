import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';

import {
  RedditRawDataQueryDto,
  RedditSentimentQueryDto,
} from './dto/reddit-raw-data-query.dto';
import {
  TwitterRawDataQueryDto,
  TwitterSentimentQueryDto,
} from './dto/twitter-raw-data-query.dto';

@Injectable()
export class RawDataService {
  private readonly fastApiBaseUrl =
    process.env.FAST_API_BASE_URL ?? 'http://localhost:8000';

  constructor(private readonly httpService: HttpService) {}

  async fetchRedditPosts(query: RedditRawDataQueryDto) {
    return this.proxyRequest('/reddit/search', {
      params: {
        subreddit: query.subreddit,
        query: query.query,
        limit: query.limit,
      },
    });
  }

  async fetchTwitterPosts(query: TwitterRawDataQueryDto) {
    return this.proxyRequest('/twitter/search', {
      params: {
        query: query.query,
        max_results: query.maxResults,
      },
    });
  }

  async fetchRedditSentiment(query: RedditSentimentQueryDto) {
    return this.proxyRequest('/reddit/sentiment', {
      params: {
        subreddit: query.subreddit,
        query: query.query,
        limit: query.limit,
      },
    });
  }

  async fetchTwitterSentiment(query: TwitterSentimentQueryDto) {
    return this.proxyRequest('/twitter/sentiment', {
      params: {
        query: query.query,
        max_results: query.maxResults,
      },
    });
  }

  private async proxyRequest(path: string, config: AxiosRequestConfig) {
    try {
      const url = `${this.fastApiBaseUrl}${path}`;
      const response = await firstValueFrom(this.httpService.get(url, config));
      return response.data;
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to fetch data from FastAPI gateway',
      );
    }
  }
}


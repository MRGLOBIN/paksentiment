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
import { PostStorageService } from './post-storage.service';

@Injectable()
export class RawDataService {
  private readonly fastApiBaseUrl =
    process.env.FAST_API_BASE_URL ?? 'http://localhost:8000';

  constructor(
    private readonly httpService: HttpService,
    private readonly postStorage: PostStorageService,
  ) {}

  async fetchRedditPosts(query: RedditRawDataQueryDto) {
    const response = await this.proxyRequest('/reddit/search', {
      params: {
        subreddit: query.subreddit,
        query: query.query,
        limit: query.limit,
      },
    });
    await this.postStorage.storeRawPosts('reddit', response.posts ?? []);
    return response;
  }

  async fetchTwitterPosts(query: TwitterRawDataQueryDto) {
    const response = await this.proxyRequest('/twitter/search', {
      params: {
        query: query.query,
        max_results: query.maxResults,
      },
    });
    await this.postStorage.storeRawPosts('twitter', response.tweets ?? []);
    return response;
  }

  async fetchRedditSentiment(query: RedditSentimentQueryDto) {
    const response = await this.proxyRequest('/reddit/sentiment', {
      params: {
        subreddit: query.subreddit,
        query: query.query,
        limit: query.limit,
      },
    });
    await this.postStorage.storeRawPosts('reddit', response.posts ?? []);
    await this.postStorage.storeProcessedPosts(
      'reddit',
      response.posts ?? [],
      response.translations ?? [],
      response.sentiment ?? [],
    );
    return response;
  }

  async fetchTwitterSentiment(query: TwitterSentimentQueryDto) {
    const response = await this.proxyRequest('/twitter/sentiment', {
      params: {
        query: query.query,
        max_results: query.maxResults,
      },
    });
    await this.postStorage.storeRawPosts('twitter', response.tweets ?? []);
    await this.postStorage.storeProcessedPosts(
      'twitter',
      response.tweets ?? [],
      response.translations ?? [],
      response.sentiment ?? [],
    );
    return response;
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


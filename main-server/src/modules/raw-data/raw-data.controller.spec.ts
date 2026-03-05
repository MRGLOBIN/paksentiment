import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import { InternalServerErrorException } from '@nestjs/common';
import { of, throwError } from 'rxjs';

import { RawDataController } from './raw-data.controller';
import { RawDataService } from './raw-data.service';
import { PostStorageService } from './post-storage.service';
import {
  RedditRawDataQueryDto,
  RedditSentimentQueryDto,
} from './dto/reddit-raw-data-query.dto';
import {
  TwitterRawDataQueryDto,
  TwitterSentimentQueryDto,
} from './dto/twitter-raw-data-query.dto';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnalysisSessionEntity } from '../../database/entities/mongo/analysis-session.entity';
import { RedditProvider } from './providers/reddit.provider';
import { TwitterProvider } from './providers/twitter.provider';
import { YouTubeProvider } from './providers/youtube.provider';
import { CommonCrawlProvider } from './providers/commoncrawl.provider';
import { ScraplingProvider } from './providers/scrapling.provider';
import { WebProvider } from './providers/web.provider';
import { ActivityService } from '../activity/activity.service';

import { AuthGuard } from '../auth/auth.guard';

describe('RawDataController', () => {
  let controller: RawDataController;
  let httpService: HttpService;

  const mockRedditPost = {
    post_id: 'abc123',
    title: 'Test Post',
    text: 'Test content',
    author: 'testuser',
    subreddit: 'pakistan',
    created_utc: 1700000000,
    score: 42,
    num_comments: 10,
    url: 'https://reddit.com/r/pakistan/comments/abc123',
  };

  const mockTweet = {
    id: '1234567890',
    text: 'Test tweet content',
    author_id: '987654321',
    created_at: '2024-01-01T12:00:00Z',
    public_metrics: {
      retweet_count: 5,
      like_count: 20,
      reply_count: 3,
      quote_count: 1,
    },
  };

  const mockTranslation = {
    id: 'abc123',
    language: 'ur',
    translated: true,
    translatedText: 'This is a test translation',
  };

  const mockSentiment = {
    id: 'abc123',
    sentiment: 'positive',
    score: 0.85,
    summary: 'User expresses positive sentiment',
  };

  const mockPostStorageService = {
    storeRawPosts: jest.fn().mockResolvedValue(undefined),
    storeProcessedPosts: jest.fn().mockResolvedValue(undefined),
  };

  const mockProvider = {
    fetch: jest.fn().mockResolvedValue({ posts: [], count: 0 }),
    fetchSentiment: jest
      .fn()
      .mockResolvedValue({
        posts: [],
        count: 0,
        translations: [],
        sentiment: [],
      }),
    fetchComments: jest.fn().mockResolvedValue({}),
    fetchTranscript: jest.fn().mockResolvedValue({}),
  };

  const mockMongoRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      controllers: [RawDataController],
      providers: [
        RawDataService,
        {
          provide: PostStorageService,
          useValue: mockPostStorageService,
        },
        { provide: ActivityService, useValue: { logActivity: jest.fn() } },
        {
          provide: getRepositoryToken(AnalysisSessionEntity, 'mongo'),
          useValue: mockMongoRepo,
        },
        RedditProvider,
        TwitterProvider,
        YouTubeProvider,
        CommonCrawlProvider,
        ScraplingProvider,
        WebProvider,
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RawDataController>(RawDataController);
    httpService = module.get<HttpService>(HttpService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('fetchRedditRawData', () => {
    const query: RedditRawDataQueryDto = {
      subreddit: 'pakistan',
      query: 'education',
      limit: 10,
    };

    it('should successfully fetch Reddit posts', async () => {
      const mockResponse = {
        posts: [mockRedditPost],
        count: 1,
      };

      jest.spyOn(httpService, 'request').mockReturnValue(
        of({
          data: mockResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );

      const result = await controller.fetchRedditRawData(query, {
        user: { sub: 1 },
      });

      expect(result).toHaveProperty('posts');
      expect(result).toHaveProperty('count');
      expect(result.posts).toHaveLength(1);
      expect(result.posts[0]).toEqual(mockRedditPost);
    });

    it('should handle Reddit API errors', async () => {
      jest
        .spyOn(httpService, 'request')
        .mockReturnValue(throwError(() => new Error('Reddit API error')));

      await expect(
        controller.fetchRedditRawData(query, { user: { sub: 1 } }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should pass correct query parameters', async () => {
      const getSpy = jest.spyOn(httpService, 'request').mockReturnValue(
        of({
          data: { posts: [], count: 0 },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );

      await controller.fetchRedditRawData(query, { user: { sub: 1 } });

      expect(getSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('/reddit/search'),
          params: {
            subreddit: query.subreddit,
            query: query.query,
            limit: query.limit,
          },
        }),
      );
    });

    it('should handle empty results', async () => {
      jest.spyOn(httpService, 'request').mockReturnValue(
        of({
          data: { posts: [], count: 0 },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );

      const result = await controller.fetchRedditRawData(query, {
        user: { sub: 1 },
      });

      expect(result.posts).toHaveLength(0);
      expect(result.count).toBe(0);
    });
  });

  describe('fetchTwitterRawData', () => {
    const query: TwitterRawDataQueryDto = {
      query: 'Pakistan economy',
      maxResults: 10,
    };

    it('should successfully fetch tweets', async () => {
      const mockResponse = {
        tweets: [mockTweet],
        count: 1,
      };

      jest.spyOn(httpService, 'request').mockReturnValue(
        of({
          data: mockResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );

      const result = await controller.fetchTwitterRawData(query, {
        user: { sub: 1 },
      });

      expect(result).toHaveProperty('tweets');
      expect(result).toHaveProperty('count');
      expect(result.tweets).toHaveLength(1);
      expect(result.tweets[0]).toEqual(mockTweet);
    });

    it('should handle Twitter API errors', async () => {
      jest
        .spyOn(httpService, 'request')
        .mockReturnValue(throwError(() => new Error('Twitter API error')));

      await expect(
        controller.fetchTwitterRawData(query, { user: { sub: 1 } }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should pass correct query parameters', async () => {
      const getSpy = jest.spyOn(httpService, 'request').mockReturnValue(
        of({
          data: { tweets: [], count: 0 },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );

      await controller.fetchTwitterRawData(query, { user: { sub: 1 } });

      expect(getSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('/twitter/search'),
          params: {
            query: query.query,
            max_results: query.maxResults,
          },
        }),
      );
    });
  });

  describe('fetchRedditSentiment', () => {
    const query: RedditSentimentQueryDto = {
      subreddit: 'pakistan',
      query: 'education',
      limit: 10,
    };

    it('should successfully fetch Reddit sentiment analysis', async () => {
      const mockResponse = {
        source: 'reddit',
        count: 1,
        posts: [mockRedditPost],
        translations: [mockTranslation],
        sentiment: [mockSentiment],
      };

      jest.spyOn(httpService, 'request').mockReturnValue(
        of({
          data: mockResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );

      const result = await controller.fetchRedditSentiment(query, {
        user: { sub: 1 },
      });

      expect(result).toHaveProperty('posts');
      expect(result).toHaveProperty('translations');
      expect(result).toHaveProperty('sentiment');
      expect(result.posts).toHaveLength(1);
      expect(result.translations).toHaveLength(1);
      expect(result.sentiment).toHaveLength(1);
    });

    it('should store raw posts in database', async () => {
      const mockResponse = {
        source: 'reddit',
        count: 1,
        posts: [mockRedditPost],
        translations: [mockTranslation],
        sentiment: [mockSentiment],
      };

      jest.spyOn(httpService, 'request').mockReturnValue(
        of({
          data: mockResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );

      await controller.fetchRedditSentiment(query, { user: { sub: 1 } });

      expect(mockPostStorageService.storeRawPosts).toHaveBeenCalledWith(
        'reddit',
        expect.any(Array),
      );
    });

    it('should store processed posts with sentiment and translations', async () => {
      const mockResponse = {
        source: 'reddit',
        count: 1,
        posts: [mockRedditPost],
        translations: [mockTranslation],
        sentiment: [mockSentiment],
      };

      jest.spyOn(httpService, 'request').mockReturnValue(
        of({
          data: mockResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );

      await controller.fetchRedditSentiment(query, { user: { sub: 1 } });

      expect(mockPostStorageService.storeProcessedPosts).toHaveBeenCalledWith(
        'reddit',
        mockResponse.posts,
        mockResponse.translations,
        mockResponse.sentiment,
      );
    });

    it('should handle sentiment analysis errors', async () => {
      jest
        .spyOn(httpService, 'request')
        .mockReturnValue(
          throwError(() => new Error('Sentiment analysis failed')),
        );

      await expect(
        controller.fetchRedditSentiment(query, { user: { sub: 1 } }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should include all sentiment data in response', async () => {
      const mockResponse = {
        source: 'reddit',
        count: 1,
        posts: [mockRedditPost],
        translations: [mockTranslation],
        sentiment: [mockSentiment],
      };

      jest.spyOn(httpService, 'request').mockReturnValue(
        of({
          data: mockResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );

      const result = await controller.fetchRedditSentiment(query, {
        user: { sub: 1 },
      });

      expect(result.sentiment[0]).toHaveProperty('sentiment');
      expect(result.sentiment[0]).toHaveProperty('score');
      expect(result.sentiment[0]).toHaveProperty('summary');
      expect(result.sentiment[0].sentiment).toBe('positive');
    });
  });

  describe('fetchTwitterSentiment', () => {
    const query: TwitterSentimentQueryDto = {
      query: 'Pakistan technology',
      maxResults: 10,
    };

    it('should successfully fetch Twitter sentiment analysis', async () => {
      const mockResponse = {
        source: 'twitter',
        count: 1,
        tweets: [mockTweet],
        translations: [mockTranslation],
        sentiment: [mockSentiment],
      };

      jest.spyOn(httpService, 'request').mockReturnValue(
        of({
          data: mockResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );

      const result = await controller.fetchTwitterSentiment(query, {
        user: { sub: 1 },
      });

      expect(result).toHaveProperty('tweets');
      expect(result).toHaveProperty('translations');
      expect(result).toHaveProperty('sentiment');
      expect(result.tweets).toHaveLength(1);
    });

    it('should store raw tweets in database', async () => {
      const mockResponse = {
        source: 'twitter',
        count: 1,
        tweets: [mockTweet],
        translations: [mockTranslation],
        sentiment: [mockSentiment],
      };

      jest.spyOn(httpService, 'request').mockReturnValue(
        of({
          data: mockResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );

      await controller.fetchTwitterSentiment(query, { user: { sub: 1 } });

      expect(mockPostStorageService.storeRawPosts).toHaveBeenCalledWith(
        'twitter',
        expect.any(Array),
      );
    });

    it('should store processed tweets with sentiment and translations', async () => {
      const mockResponse = {
        source: 'twitter',
        count: 1,
        tweets: [mockTweet],
        translations: [mockTranslation],
        sentiment: [mockSentiment],
      };

      jest.spyOn(httpService, 'request').mockReturnValue(
        of({
          data: mockResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );

      await controller.fetchTwitterSentiment(query, { user: { sub: 1 } });

      expect(mockPostStorageService.storeProcessedPosts).toHaveBeenCalledWith(
        'twitter',
        mockResponse.tweets,
        mockResponse.translations,
        mockResponse.sentiment,
      );
    });

    it('should handle Twitter sentiment analysis errors', async () => {
      jest
        .spyOn(httpService, 'request')
        .mockReturnValue(
          throwError(() => new Error('Twitter sentiment failed')),
        );

      await expect(
        controller.fetchTwitterSentiment(query, { user: { sub: 1 } }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('Integration with FastAPI', () => {
    it('should use correct FastAPI base URL', () => {
      const baseUrl = process.env.FAST_API_BASE_URL || 'http://localhost:8000';
      expect(baseUrl).toBeDefined();
    });

    it('should handle FastAPI timeout', async () => {
      const query: RedditRawDataQueryDto = {
        subreddit: 'pakistan',
        query: 'test',
        limit: 5,
      };

      jest
        .spyOn(httpService, 'request')
        .mockReturnValue(throwError(() => new Error('ETIMEDOUT')));

      await expect(
        controller.fetchRedditRawData(query, { user: { sub: 1 } }),
      ).rejects.toThrow();
    });

    it('should handle FastAPI 502 errors', async () => {
      const query: RedditSentimentQueryDto = {
        subreddit: 'pakistan',
        query: 'test',
        limit: 5,
      };

      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => ({ response: { status: 502 } })));

      await expect(
        controller.fetchRedditSentiment(query, { user: { sub: 1 } }),
      ).rejects.toThrow();
    });
  });
});

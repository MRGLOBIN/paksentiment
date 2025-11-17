import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiInternalServerErrorResponse,
  ApiBadGatewayResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';

import {
  RedditRawDataQueryDto,
  RedditSentimentQueryDto,
} from './dto/reddit-raw-data-query.dto';
import {
  TwitterRawDataQueryDto,
  TwitterSentimentQueryDto,
} from './dto/twitter-raw-data-query.dto';
import { RawDataService } from './raw-data.service';
import {
  RedditRawDataResponse,
  RedditSentimentResponse,
  TwitterRawDataResponse,
  TwitterSentimentResponse,
} from './interfaces/api-response.interface';

@ApiTags('Reddit', 'Twitter')
@Controller('raw-data')
export class RawDataController {
  constructor(private readonly rawDataService: RawDataService) {}

  @Get('reddit')
  @ApiOperation({
    summary: 'Fetch Reddit posts (raw data)',
    description: `
Fetch raw posts from a specific subreddit using a search query.

This endpoint proxies requests to the FastAPI data gateway and returns unprocessed Reddit posts.
Use \`/raw-data/reddit/sentiment\` for full sentiment analysis.

### Process:
1. Searches specified subreddit for matching posts
2. Returns post metadata (title, content, author, score, etc.)
3. No translation or sentiment analysis performed

### Rate Limits:
Reddit API rate limits are handled automatically with retry logic (max 3 attempts, 60s wait between retries).

**Note**: Large requests may take 10-30 seconds depending on Reddit API response time.
    `,
  })
  @ApiQuery({
    name: 'subreddit',
    required: true,
    type: String,
    description: 'Subreddit name (without r/ prefix)',
    example: 'pakistan',
  })
  @ApiQuery({
    name: 'query',
    required: true,
    type: String,
    description: 'Search term to find posts',
    example: 'education',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of posts to return (1-100)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved Reddit posts',
    schema: {
      example: {
        posts: [
          {
            post_id: 'abc123',
            title: 'Discussion about education reform',
            text: 'Post content here...',
            author: 'username',
            subreddit: 'pakistan',
            created_utc: 1700000000,
            score: 42,
            num_comments: 10,
            url: 'https://reddit.com/r/pakistan/comments/abc123',
          },
        ],
        count: 1,
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to fetch data from FastAPI gateway',
  })
  async fetchRedditRawData(
    @Query() query: RedditRawDataQueryDto,
  ): Promise<RedditRawDataResponse> {
    return await this.rawDataService.fetchRedditPosts(query);
  }

  @Get('twitter')
  @ApiOperation({
    summary: 'Fetch Twitter/X posts (raw data)',
    description: `
Fetch raw tweets using Twitter's search API.

This endpoint proxies requests to the FastAPI data gateway and returns unprocessed tweets.
Use \`/raw-data/twitter/sentiment\` for full sentiment analysis.

### Process:
1. Searches Twitter for matching tweets
2. Returns tweet metadata (text, author, metrics, etc.)
3. No translation or sentiment analysis performed

### Requirements:
Twitter API requires a minimum of 10 results per request.

**Note**: May take 10-20 seconds depending on Twitter API response time.
    `,
  })
  @ApiQuery({
    name: 'query',
    required: true,
    type: String,
    description: 'Twitter search query (supports Twitter search operators)',
    example: 'Pakistan economy',
  })
  @ApiQuery({
    name: 'maxResults',
    required: false,
    type: Number,
    description: 'Number of tweets to fetch (10-100, Twitter minimum is 10)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved tweets',
    schema: {
      example: {
        tweets: [
          {
            id: '1234567890',
            text: 'Tweet content here...',
            author_id: '987654321',
            created_at: '2024-01-01T12:00:00Z',
            public_metrics: {
              retweet_count: 5,
              like_count: 20,
              reply_count: 3,
              quote_count: 1,
            },
          },
        ],
        count: 1,
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'No tweets found for the query',
  })
  @ApiBadGatewayResponse({
    description: 'Twitter API service unavailable',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to fetch data from FastAPI gateway',
  })
  async fetchTwitterRawData(
    @Query() query: TwitterRawDataQueryDto,
  ): Promise<TwitterRawDataResponse> {
    return await this.rawDataService.fetchTwitterPosts(query);
  }

  @Get('reddit/sentiment')
  @ApiOperation({
    summary: 'Reddit sentiment analysis (full pipeline)',
    description: `
Fetch Reddit posts and perform comprehensive sentiment analysis.

### Complete Analysis Pipeline:

1. **Data Collection**: Fetch posts from specified subreddit
2. **Language Detection**: Automatically detect content language (English, Urdu, etc.)
3. **Translation**: Translate non-English content to English using Groq's LLaMA models
4. **Sentiment Analysis**: Classify sentiment using Google Gemini AI
5. **Summarization**: Generate brief content summaries
6. **Storage**: Save raw and processed data to MongoDB

### Response Includes:
- Original Reddit posts with full metadata
- Language detection results for each post
- Translations (if needed)
- Sentiment classification (positive/negative/neutral)
- Confidence scores (0-1 range)
- AI-generated summaries

### Processing Time:
**30-90 seconds** depending on:
- Number of posts requested
- Language detection and translation needs
- AI API response times
- Reddit API rate limits

### Supported Languages:
- English (en) - No translation needed
- Urdu (ur) - Translated to English
- Other languages - Automatically detected and translated

**Tip**: Start with smaller limits (5-10) for faster results during testing.
    `,
  })
  @ApiQuery({
    name: 'subreddit',
    required: true,
    type: String,
    description: 'Subreddit name (without r/ prefix)',
    example: 'pakistan',
  })
  @ApiQuery({
    name: 'query',
    required: true,
    type: String,
    description: 'Search term to find posts',
    example: 'healthcare reforms',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description:
      'Maximum number of posts to analyze (1-50, lower for faster processing)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully analyzed Reddit posts',
    schema: {
      example: {
        source: 'reddit',
        count: 2,
        posts: [
          {
            post_id: 'abc123',
            title: 'Great news about healthcare',
            text: 'Content here...',
            author: 'user123',
            subreddit: 'pakistan',
            created_utc: 1700000000,
            score: 45,
            num_comments: 12,
            url: 'https://reddit.com/...',
          },
        ],
        translations: [
          {
            id: 'abc123',
            language: 'ur',
            translated: true,
            translatedText: 'This is great news about healthcare policy',
          },
        ],
        sentiment: [
          {
            id: 'abc123',
            sentiment: 'positive',
            score: 0.87,
            summary: 'User expresses optimism about new healthcare reforms',
          },
        ],
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'No Reddit posts found to analyze',
  })
  @ApiBadGatewayResponse({
    description:
      'Translation or sentiment analysis service error (Groq/Gemini API)',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to process request - Reddit API or internal error',
  })
  async fetchRedditSentiment(
    @Query() query: RedditSentimentQueryDto,
  ): Promise<RedditSentimentResponse> {
    return await this.rawDataService.fetchRedditSentiment(query);
  }

  @Get('twitter/sentiment')
  @ApiOperation({
    summary: 'Twitter sentiment analysis (full pipeline)',
    description: `
Fetch tweets and perform comprehensive sentiment analysis.

### Complete Analysis Pipeline:

1. **Data Collection**: Fetch tweets matching search query
2. **Language Detection**: Automatically detect content language (English, Urdu, etc.)
3. **Translation**: Translate non-English content to English using Groq's LLaMA models
4. **Sentiment Analysis**: Classify sentiment using Google Gemini AI
5. **Summarization**: Generate brief content summaries
6. **Storage**: Save raw and processed data to MongoDB

### Response Includes:
- Original tweets with full metadata and engagement metrics
- Language detection results for each tweet
- Translations (if needed)
- Sentiment classification (positive/negative/neutral)
- Confidence scores (0-1 range)
- AI-generated summaries

### Processing Time:
**30-90 seconds** depending on:
- Number of tweets requested
- Language detection and translation needs
- AI API response times

### Requirements:
Twitter API requires minimum 10 results per request.

### Supported Languages:
- English (en) - No translation needed
- Urdu (ur) - Translated to English
- Other languages - Automatically detected and translated

**Tip**: Use 10-20 tweets for optimal balance between data quality and processing speed.
    `,
  })
  @ApiQuery({
    name: 'query',
    required: true,
    type: String,
    description: 'Twitter search query (supports Twitter search operators)',
    example: 'Pakistan technology',
  })
  @ApiQuery({
    name: 'maxResults',
    required: false,
    type: Number,
    description:
      'Number of tweets to analyze (10-50, lower for faster processing)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully analyzed tweets',
    schema: {
      example: {
        source: 'twitter',
        count: 10,
        tweets: [
          {
            id: '1234567890',
            text: 'Exciting developments in tech sector',
            author_id: '987654321',
            created_at: '2024-01-01T12:00:00Z',
            public_metrics: {
              retweet_count: 15,
              like_count: 45,
              reply_count: 8,
              quote_count: 3,
            },
          },
        ],
        translations: [
          {
            id: '1234567890',
            language: 'en',
            translated: false,
            translatedText: '',
          },
        ],
        sentiment: [
          {
            id: '1234567890',
            sentiment: 'positive',
            score: 0.82,
            summary: 'User discusses positive tech sector growth',
          },
        ],
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'No tweets found to analyze',
  })
  @ApiBadGatewayResponse({
    description:
      'Translation or sentiment analysis service error (Groq/Gemini API)',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to process request - Twitter API or internal error',
  })
  async fetchTwitterSentiment(
    @Query() query: TwitterSentimentQueryDto,
  ): Promise<TwitterSentimentResponse> {
    return await this.rawDataService.fetchTwitterSentiment(query);
  }
}

// FastAPI response interfaces
export interface RedditPost {
  id: string;
  title: string;
  content: string;
  author: string;
  subreddit: string;
  created_utc: number;
  score: number;
  num_comments: number;
  url: string;
}

export interface TwitterPost {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
}

export interface Translation {
  original: string;
  translated: string;
  detected_language: string;
}

export interface SentimentAnalysis {
  post_id: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  summary: string;
}

export interface RedditRawDataResponse {
  posts: RedditPost[];
  count: number;
  sessionId?: string;
}

export interface TwitterRawDataResponse {
  tweets: TwitterPost[];
  count: number;
  sessionId?: string;
}

export interface RedditSentimentResponse {
  posts: RedditPost[];
  translations: Translation[];
  sentiment: SentimentAnalysis[];
  count: number;
  sessionId?: string;
}

export interface TwitterSentimentResponse {
  tweets: TwitterPost[];
  translations: Translation[];
  sentiment: SentimentAnalysis[];
  count: number;
  sessionId?: string;
}

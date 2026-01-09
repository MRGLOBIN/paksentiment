from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

# Pydantic models for API documentation
class HealthCheckResponse(BaseModel):
    """Health check response model."""
    message: str = Field(..., example="PakSentiment Data Gateway is running.")


class ErrorResponse(BaseModel):
    """Standard error response model."""
    detail: str = Field(..., example="An error occurred processing your request.")


class RedditPost(BaseModel):
    """Reddit post structure."""
    post_id: str = Field(..., description="Unique identifier for the post")
    title: str = Field(..., description="Title of the Reddit post")
    text: str = Field(..., description="Text content of the post")
    author: str = Field(..., description="Username of the post author")
    subreddit: str = Field(..., description="Subreddit where post was made")
    created_utc: int = Field(..., description="Unix timestamp of post creation")
    score: int = Field(..., description="Post score (upvotes - downvotes)")
    num_comments: int = Field(..., description="Number of comments on the post")
    url: str = Field(..., description="URL to the Reddit post")


class TwitterTweet(BaseModel):
    """Twitter tweet structure."""
    id: str = Field(..., description="Unique identifier for the tweet")
    text: str = Field(..., description="Text content of the tweet")
    author_id: str = Field(..., description="ID of the tweet author")
    created_at: str = Field(..., description="ISO timestamp of tweet creation")
    public_metrics: Dict[str, int] = Field(..., description="Engagement metrics (retweets, likes, etc.)")


class Translation(BaseModel):
    """Translation result for a document."""
    id: str = Field(..., description="Document ID")
    language: str = Field(..., description="Detected language code (e.g., 'ur', 'en')")
    translated: bool = Field(..., description="Whether text was translated")
    translatedText: str = Field(..., description="Translated text (empty if not translated)")


class SentimentResult(BaseModel):
    """Sentiment analysis result for a document."""
    id: str = Field(..., description="Document ID")
    sentiment: str = Field(..., description="Sentiment classification", example="positive")
    score: float = Field(..., description="Confidence score (0-1)", ge=0, le=1)
    summary: str = Field(..., description="Brief summary of the content")


class RedditSearchResponse(BaseModel):
    """Response for Reddit search endpoint."""
    source: str = Field(..., example="reddit")
    count: int = Field(..., description="Number of posts returned")
    posts: List[Dict[str, Any]] = Field(..., description="List of Reddit posts")


class TwitterSearchResponse(BaseModel):
    """Response for Twitter search endpoint."""
    source: str = Field(..., example="twitter")
    count: int = Field(..., description="Number of tweets returned")
    tweets: List[Dict[str, Any]] = Field(..., description="List of tweets")


class RedditSentimentResponse(BaseModel):
    """Response for Reddit sentiment analysis endpoint."""
    source: str = Field(..., example="reddit")
    count: int = Field(..., description="Number of posts analyzed")
    posts: List[Dict[str, Any]] = Field(..., description="List of Reddit posts")
    translations: List[Dict[str, Any]] = Field(..., description="Translation results")
    sentiment: List[Dict[str, Any]] = Field(..., description="Sentiment analysis results")


class TwitterSentimentResponse(BaseModel):
    """Response for Twitter sentiment analysis endpoint."""
    source: str = Field(..., example="twitter")
    count: int = Field(..., description="Number of tweets analyzed")
    tweets: List[Dict[str, Any]] = Field(..., description="List of tweets")
    translations: List[Dict[str, Any]] = Field(..., description="Translation results")
    sentiment: List[Dict[str, Any]] = Field(..., description="Sentiment analysis results")


class YouTubeSearchResponse(BaseModel):
    """Response for YouTube search."""
    source: str = Field(..., example="youtube")
    count: int
    videos: List[Dict[str, Any]]

class YouTubeCommentsResponse(BaseModel):
    """Response for YouTube comments."""
    source: str = Field(..., example="youtube")
    video_id: str
    count: int
    comments: List[Dict[str, Any]]

class YouTubeTranscriptResponse(BaseModel):
    """Response for YouTube transcript."""
    source: str = Field(..., example="youtube")
    video_id: str
    count: int
    transcript: List[Dict[str, Any]]

class CommonCrawlResponse(BaseModel):
    """Response for Common Crawl records."""
    source: str = Field(..., example="commoncrawl")
    count: int
    records: List[Dict[str, Any]]

class CommonCrawlSentimentResponse(BaseModel):
    """Response for Common Crawl sentiment analysis."""
    source: str = Field(..., example="commoncrawl")
    count: int = Field(..., description="Number of records")
    records: List[Dict[str, Any]] = Field(..., description="List of records")
    sentiment: List[Dict[str, Any]] = Field(..., description="Sentiment analysis results")

class ScraplingFetchResponse(BaseModel):
    """Response for Scrapling fetch."""
    status: int
    url: str
    text: str
    links: List[str] = []

class ScraplingMultiFetchResponse(BaseModel):
    results: List[ScraplingFetchResponse]

class ScraplingExtractRequest(BaseModel):
    """Request body for Scrapling extraction."""
    url: str
    selectors: Dict[str, str]

class ScraplingExtractResponse(BaseModel):
    """Response for Scrapling extraction."""
    data: Dict[str, Any]


class GenericSentimentRequest(BaseModel):
    """Request body for generic sentiment analysis."""
    documents: List[Dict[str, Any]] # Adjusted to Dict to allow raw JSON
    sentiments: str | None = None
    custom_sentiments: str | None = None


class GenericSentimentResponse(BaseModel):
    """Response for generic sentiment analysis."""
    sentiment: List[Dict[str, Any]]

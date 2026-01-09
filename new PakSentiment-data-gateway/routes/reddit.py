from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, Request
from models.schemas import RedditSearchResponse, RedditSentimentResponse, ErrorResponse
from services.reddit_service import RedditService
from dependencies import get_reddit_service

router = APIRouter(prefix="/reddit", tags=["Reddit"])

@router.get(
    "/search",
    response_model=RedditSearchResponse,
    summary="Search Reddit Posts",
    description="Search for posts in a specific subreddit using a query term.",
    responses={
        500: {"model": ErrorResponse, "description": "Internal Server Error"}
    }
)
async def reddit_search(
    subreddit: str = Query(..., description="Subreddit to search (without 'r/' prefix)", example="pakistan"),
    query: str = Query(..., description="Search term to find posts", example="politics"),
    limit: int = Query(10, ge=1, le=100, description="Maximum number of posts to return", example=10),
    service: RedditService = Depends(get_reddit_service)
) -> Dict[str, Any]:
    posts = await service.search_posts(subreddit, query, limit)
    return {
        "source": "reddit",
        "count": len(posts),
        "posts": posts
    }

@router.get(
    "/sentiment",
    response_model=RedditSentimentResponse,
    tags=["Reddit", "Sentiment Analysis"],
    summary="Reddit Sentiment Analysis",
    description="Fetch Reddit posts and perform complete sentiment analysis pipeline.",
    responses={
        404: {"model": ErrorResponse, "description": "No posts found"},
        500: {"model": ErrorResponse, "description": "Analysis Error"}
    }
)
async def reddit_sentiment(
    subreddit: str = Query(..., description="Subreddit to search (without 'r/' prefix)", example="pakistan"),
    query: str = Query(..., description="Search term to find posts", example="education reform"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of posts to analyze"),
    sentiments: str | None = Query(None, description="Deprecated: Use custom_sentiments instead."),
    custom_sentiments: str | None = Query(None, description="Custom sentiment tags (comma-separated)."),
    service: RedditService = Depends(get_reddit_service)
) -> Dict[str, Any]:
    return await service.analyze_sentiment(subreddit, query, limit, sentiments, custom_sentiments)

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from models.schemas import TwitterSentimentResponse, ErrorResponse
from services.twitter_service import TwitterService
from dependencies import get_twitter_service

router = APIRouter(prefix="/twitter", tags=["Twitter"])

@router.get(
    "/sentiment",
    response_model=TwitterSentimentResponse,
    tags=["Twitter", "Sentiment Analysis"],
    summary="Twitter Sentiment Analysis",
    description="Fetch tweets and perform complete sentiment analysis pipeline.",
    responses={
        404: {"model": ErrorResponse, "description": "No tweets found"},
        500: {"model": ErrorResponse, "description": "Analysis Error"}
    }
)
async def twitter_sentiment(
    query: str = Query(..., description="Twitter search query", example="Pakistan education"),
    max_results: int = Query(10, ge=10, le=50, description="Number of tweets to analyze"),
    sentiments: str | None = Query(None, description="Deprecated: Use custom_sentiments instead"),
    custom_sentiments: str | None = Query(None, description="Custom sentiment tags"),
    service: TwitterService = Depends(get_twitter_service)
) -> Dict[str, Any]:
    return await service.analyze_sentiment(query, max_results, sentiments, custom_sentiments)

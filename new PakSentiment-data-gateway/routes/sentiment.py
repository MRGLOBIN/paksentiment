from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends
from models.schemas import GenericSentimentResponse, GenericSentimentRequest, ErrorResponse
from services.sentiment_service_gw import SentimentService
from dependencies import get_sentiment_service

router = APIRouter(prefix="/sentiment", tags=["Sentiment Analysis"])

@router.post(
    "/analyze",
    response_model=GenericSentimentResponse,
    summary="Generic Sentiment Analysis",
    description="Analyze sentiment for an arbitrary list of documents.",
    responses={
        502: {"model": ErrorResponse, "description": "Analysis Error"}
    }
)
async def analyze_sentiment(
    body: GenericSentimentRequest,
    service: SentimentService = Depends(get_sentiment_service)
) -> Dict[str, Any]:
    sentiment = await service.analyze_batch(body.documents, body.sentiments, body.custom_sentiments)
    return {"sentiment": sentiment}

# @router.post(
#     "/analyze/local",
#     response_model=GenericSentimentResponse,
#     summary="Local Sentiment Analysis",
#     description="Analyze sentiment using local Analysis Model (Alias for /analyze).",
#     responses={
#         502: {"model": ErrorResponse, "description": "Analysis Error"}
#     }
# )
# async def analyze_sentiment_local(
#     body: GenericSentimentRequest,
#     service: SentimentService = Depends(get_sentiment_service)
# ) -> Dict[str, Any]:
#     # Exact same logic as above
#     sentiment = await service.analyze_batch(body.documents, body.sentiments, body.custom_sentiments)
#     return {"sentiment": sentiment}

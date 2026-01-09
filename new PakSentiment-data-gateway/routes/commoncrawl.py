from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from models.schemas import CommonCrawlResponse, CommonCrawlSentimentResponse, ErrorResponse
from services.commoncrawl_service import CommonCrawlService
from dependencies import get_commoncrawl_service

router = APIRouter(prefix="/commoncrawl", tags=["Common Crawl"])

@router.get(
    "/records",
    response_model=CommonCrawlResponse,
    summary="Fetch Common Crawl Records",
    description="Retrieve extracted text records from Common Crawl for a given domain.",
    responses={
        500: {"model": ErrorResponse, "description": "Index Search Failed"}
    }
)
async def commoncrawl_records(
    limit: int = Query(10, ge=1, le=100, description="Max records"),
    domain: str | None = Query(None, description="Filter by domain"),
    crawl_id: str | None = Query(None, description="Specific crawl ID"),
    service: CommonCrawlService = Depends(get_commoncrawl_service)
) -> Dict[str, Any]:
    records = await service.fetch_records(limit, domain, crawl_id)
    return {
        "source": "commoncrawl",
        "count": len(records),
        "records": records
    }

@router.get(
    "/sentiment",
    response_model=CommonCrawlSentimentResponse,
    summary="Fetch Common Crawl Records with Sentiment Analysis",
    description="Fetch records and analyze their sentiment.",
    responses={
        500: {"model": ErrorResponse, "description": "Analysis Error"}
    }
)
async def commoncrawl_sentiment(
    limit: int = Query(10, ge=1, le=100, description="Max records"),
    domain: str = Query(..., description="Filter by domain"),
    crawl_id: str | None = Query(None, description="Specific crawl ID"),
    service: CommonCrawlService = Depends(get_commoncrawl_service)
) -> Dict[str, Any]:
    return await service.fetch_with_sentiment(domain, limit, crawl_id)

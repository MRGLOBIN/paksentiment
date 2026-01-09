from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, Body
from models.schemas import ScraplingMultiFetchResponse, ScraplingExtractResponse, ScraplingExtractRequest, ErrorResponse
from services.scrapling_service import ScraplingService
from dependencies import get_scrapling_service

router = APIRouter(prefix="/scrapling", tags=["Scrapling"])

@router.get(
    "/fetch",
    response_model=ScraplingMultiFetchResponse,
    summary="Fetch Page Content (Optional Crawl)",
    description="Fetch a single page or crawl sub-links purely for content using Scrapling.",
    responses={
        500: {"model": ErrorResponse, "description": "Fetch Failed"}
    }
)
async def scrapling_fetch(
    url: str = Query(..., description="URL to fetch"),
    follow_links: bool = Query(False, description="Whether to follow links"),
    limit: int = Query(3, description="Max links to follow"),
    service: ScraplingService = Depends(get_scrapling_service)
) -> Dict[str, Any]:
    return await service.fetch_page(url, follow_links, limit)

@router.post(
    "/extract",
    response_model=ScraplingExtractResponse,
    summary="Extract Content with Selectors",
    description="Extract specific data points from a page using CSS selectors.",
    responses={
        500: {"model": ErrorResponse, "description": "Extraction Failed"}
    }
)
async def scrapling_extract(
    body: ScraplingExtractRequest,
    service: ScraplingService = Depends(get_scrapling_service)
) -> Dict[str, Any]:
    return await service.extract_elements(body.url, body.selectors)

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from models.schemas import YouTubeSearchResponse, YouTubeCommentsResponse, YouTubeTranscriptResponse, ErrorResponse
from services.youtube_service import YouTubeService
from dependencies import get_youtube_service

router = APIRouter(prefix="/youtube", tags=["YouTube"])

@router.get(
    "/search",
    response_model=YouTubeSearchResponse,
    summary="Search YouTube Videos",
    description="Search for videos on YouTube using the Data API v3.",
    responses={
        500: {"model": ErrorResponse, "description": "YouTube API Error"}
    }
)
async def youtube_search(
    query: str = Query(..., description="Search term for videos"),
    max_results: int = Query(10, ge=1, le=50, description="Max videos (1-50)"),
    order: str = Query("date", description="Sort order"),
    service: YouTubeService = Depends(get_youtube_service)
) -> Dict[str, Any]:
    videos = await service.search_videos(query, max_results, order)
    return {"source": "youtube", "count": len(videos), "videos": videos}

@router.get(
    "/comments",
    response_model=YouTubeCommentsResponse,
    summary="Get YouTube Video Comments",
    description="Fetch top-level comments for a specific video.",
    responses={
        500: {"model": ErrorResponse, "description": "YouTube API Error"}
    }
)
async def youtube_comments(
    video_id: str = Query(..., description="YouTube Video ID"),
    max_results: int = Query(10, ge=1, le=100, description="Max comments (1-100)"),
    service: YouTubeService = Depends(get_youtube_service)
) -> Dict[str, Any]:
    comments = await service.get_comments(video_id, max_results)
    return {
        "source": "youtube", 
        "video_id": video_id, 
        "count": len(comments), 
        "comments": comments
    }

@router.get(
    "/transcript",
    response_model=YouTubeTranscriptResponse,
    summary="Get YouTube Video Transcript",
    description="Fetch transcript for a specific video if available.",
    responses={
        404: {"model": ErrorResponse, "description": "Transcript not found"},
        500: {"model": ErrorResponse, "description": "YouTube API Error"}
    }
)
async def youtube_transcript(
    video_id: str = Query(..., description="YouTube Video ID"),
    service: YouTubeService = Depends(get_youtube_service)
) -> Dict[str, Any]:
    transcript = await service.get_transcript(video_id)
    return {
        "source": "youtube",
        "video_id": video_id,
        "count": len(transcript),
        "transcript": transcript
    }

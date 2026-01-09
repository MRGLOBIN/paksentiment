import logging
import msgspec
from typing import Any, Dict, List
from fastapi import HTTPException
from paksentiment_scraper import YouTubeScraperClient

logger = logging.getLogger(__name__)

class YouTubeService:
    """
    Service for interacting with YouTube API.
    Wraps YouTubeScraperClient and handles serialization/errors.
    """
    def __init__(self, client: YouTubeScraperClient):
        """
        Initialize YouTubeService.
        
        :param client: YouTubeScraperClient instance.
        """
        self.client = client

    def _check_client(self):
        """Ensure client is configured."""
        if not self.client:
            raise HTTPException(status_code=503, detail="YouTube service not configured (missing API Key)")

    async def search_videos(self, query: str, max_results: int, order: str) -> List[Dict[str, Any]]:
        """
        Search for videos on YouTube.

        :param query: Search string.
        :param max_results: Max videos to return.
        :param order: Sort order.
        :return: List of video dictionaries.
        """
        self._check_client()
        try:
            videos = await self.client.fetch_videos(query, max_results, order)
            return [msgspec.to_builtins(v) for v in videos]
        except Exception as exc:
            logger.exception(f"YouTube search error: {exc}")
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    async def get_comments(self, video_id: str, max_results: int) -> List[Dict[str, Any]]:
        """
        Get comments for a video.

        :param video_id: YouTube Video ID.
        :param max_results: Max comments.
        :return: List of comment dictionaries.
        """
        self._check_client()
        try:
            comments = await self.client.fetch_video_comments(video_id, max_results)
            return [msgspec.to_builtins(c) for c in comments]
        except Exception as exc:
            logger.exception(f"YouTube comments error: {exc}")
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    async def get_transcript(self, video_id: str) -> List[Dict[str, Any]]:
        """
        Get transcript for a video.

        :param video_id: YouTube Video ID.
        :return: List of transcript snippet dictionaries.
        """
        self._check_client()
        try:
            transcript = await self.client.fetch_video_transcript(video_id)
            return [msgspec.to_builtins(t) for t in transcript]
        except Exception as exc:
            logger.exception(f"YouTube transcript error: {exc}")
            raise HTTPException(status_code=500, detail=str(exc)) from exc

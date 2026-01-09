from __future__ import annotations

import logging
import asyncio
from typing import Dict
from contextlib import asynccontextmanager

from fastapi import FastAPI
from pydantic import BaseModel, Field

from config import settings
from paksentiment_scraper import (
    RedditScraperClient,
    XScraperClient,
    YouTubeScraperClient,
    CommonCrawlScraperClient,
    ScraplingClient,
)
from sentiment_classifier import get_analysis_model
from models.schemas import HealthCheckResponse
from routes import (
    reddit,
    twitter,
    youtube,
    commoncrawl,
    scrapling,
    sentiment
)

logger = logging.getLogger("uvicorn")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Scraper Clients
    app.state.reddit_client = RedditScraperClient(
        client_id=str(settings.REDDIT_CLIENT_ID),
        client_secret=str(settings.REDDIT_CLIENT_SECRET),
        user_agent=str(settings.REDDIT_USER_AGENT),
    )
    
    app.state.twitter_client = XScraperClient(
        bearer_token=str(settings.TWITTER_BEARER_TOKEN),
        wait_on_rate_limit=True
    )
    
    # YouTube (Requires API Key)
    yt_key = getattr(settings, "YOUTUBE_API_KEY", "")
    if yt_key:
        app.state.youtube_client = YouTubeScraperClient(api_key=str(yt_key))
    else:
        app.state.youtube_client = None
    
    # CommonCrawl (No auth needed usually)
    app.state.commoncrawl_client = CommonCrawlScraperClient()
    
    # Scrapling (Stealth mode by default)
    app.state.scrapling_client = ScraplingClient(stealth=True)

    # Local Sentiment Classifier (Analysis Model)
    app.state.analysis_model = get_analysis_model()
    
    yield
    
    # Cleanup
    await app.state.reddit_client.close_connection()
    await app.state.twitter_client.close_connection()
    if app.state.youtube_client:
        await app.state.youtube_client.close_connection()
    await app.state.commoncrawl_client.close_connection()


app = FastAPI(
    title="PakSentiment Data Gateway API",
    description="""
# PakSentiment Data Gateway

This FastAPI service provides a comprehensive gateway for collecting and analyzing social media sentiment from Reddit and Twitter.
(OOP Refactored Version)

## Features
* **Social Media Scraping**: Reddit, Twitter, YouTube, CommonCrawl, Scrapling
* **Sentiment Analysis**: Using Groq's LLaMA models

## Authentication
Internal API keys used. No auth required for consumers.
    """,
    version="2.0.0",
    contact={
        "name": "PakSentiment Team",
        "email": "support@paksentiment.com",
    },
    license_info={
        "name": "MIT License",
    },
    lifespan=lifespan,
)

# Include Routers
app.include_router(reddit.router)
app.include_router(twitter.router)
app.include_router(youtube.router)
app.include_router(commoncrawl.router)
app.include_router(scrapling.router)
app.include_router(sentiment.router)

@app.get(
    "/",
    response_model=HealthCheckResponse,
    tags=["Health"],
    summary="Health Check",
    description="Check if the PakSentiment Data Gateway API is running and healthy.",
)
async def root() -> Dict[str, str]:
    """Health check endpoint to verify the API is operational."""
    return {"message": "PakSentiment Data Gateway is running."}

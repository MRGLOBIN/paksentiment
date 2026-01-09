from fastapi import Request, Depends

# Import Services
from services.reddit_service import RedditService
from services.twitter_service import TwitterService
from services.youtube_service import YouTubeService
from services.commoncrawl_service import CommonCrawlService
from services.scrapling_service import ScraplingService
from services.sentiment_service_gw import SentimentService

# Dependency functions

def get_reddit_service(request: Request) -> RedditService:
    client = request.app.state.reddit_client
    classifier = request.app.state.analysis_model
    return RedditService(client, classifier)

def get_twitter_service(request: Request) -> TwitterService:
    client = request.app.state.twitter_client
    classifier = request.app.state.analysis_model
    return TwitterService(client, classifier)

def get_youtube_service(request: Request) -> YouTubeService:
    client = request.app.state.youtube_client
    return YouTubeService(client)

def get_commoncrawl_service(request: Request) -> CommonCrawlService:
    client = request.app.state.commoncrawl_client
    classifier = request.app.state.analysis_model
    return CommonCrawlService(client, classifier)

def get_scrapling_service(request: Request) -> ScraplingService:
    client = request.app.state.scrapling_client
    return ScraplingService(client)

def get_sentiment_service(request: Request) -> SentimentService:
    classifier = request.app.state.analysis_model
    return SentimentService(classifier)

import logging
from typing import Any, Dict, List, Tuple
from fastapi import HTTPException
from paksentiment_scraper import XScraperClient
from sentiment_classifier import Document, AnalysisModelSentimentClassifier

logger = logging.getLogger(__name__)

class TwitterService:
    """
    Service for interacting with Twitter (X) API and performing sentiment analysis.
    Handling tweet searching, user enrichment, and sentiment classification.
    """
    def __init__(self, client: XScraperClient, classifier: AnalysisModelSentimentClassifier):
        """
        Initialize the TwitterService.

        :param client: Authenticated XScraperClient.
        :param classifier: Sentiment classifier instance.
        """
        self.client = client
        self.classifier = classifier

    def _serialize_twitter_obj(self, obj: Any) -> Any:
        """
        Recursively serialize Tweepy objects to native Python dictionaries.
        
        :param obj: Arbitrary object (Tweepy model, list, or dict).
        :return: serialized JSON-serializable object.
        """
        if hasattr(obj, "data"):
            return self._serialize_twitter_obj(obj.data)
        if isinstance(obj, dict):
            return {k: self._serialize_twitter_obj(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [self._serialize_twitter_obj(i) for i in obj]
        if hasattr(obj, "__dict__"):
            return {k: self._serialize_twitter_obj(v) for k, v in obj.__dict__.items() if not k.startswith("_")}
        return obj

    def _enrich_tweets_with_users(self, tweets: List[Dict[str, Any]], includes: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Enrich tweet objects with author details from 'includes' expansion.

        :param tweets: List of tweet objects.
        :param includes: Dictionary containing expanded data (users, media).
        :return: List of enriched tweet dictionaries.
        """
        if not tweets:
            return []
            
        # Build user map
        user_map = {}
        if includes and "users" in includes:
            for user in includes["users"]:
                uid = str(getattr(user, "id", "") or user.get("id", ""))
                if uid:
                    user_map[uid] = user
        
        enriched = []
        for tweet in tweets:
            t_dict = dict(tweet) if isinstance(tweet, dict) else self._serialize_twitter_obj(tweet)
            
            author_id = str(t_dict.get("author_id", ""))
            if author_id and author_id in user_map:
                user = user_map[author_id]
                if hasattr(user, "username"):
                    t_dict["author"] = user.username
                    t_dict["author_name"] = user.name
                    t_dict["author_username"] = user.username
                    t_dict["profile_image_url"] = user.profile_image_url
                elif isinstance(user, dict):
                    t_dict["author"] = user.get("username")
                    t_dict["author_name"] = user.get("name")
                    t_dict["author_username"] = user.get("username")
                    t_dict["profile_image_url"] = user.get("profile_image_url")
            else:
                t_dict["author"] = "Unknown"
                
            enriched.append(t_dict)
        
        return enriched

    def _create_documents(self, tweets: List[Dict[str, Any]]) -> List[Document]:
        """
        Convert tweets to Document objects for analysis.

        :param tweets: List of enriched tweet dictionaries.
        :return: List of Document objects.
        """
        documents: List[Document] = []
        for tweet in tweets:
            text = str(tweet.get("text") or "").strip()
            if not text:
                continue
            documents.append(
                {
                    "id": str(tweet.get("id") or len(documents)),
                    "text": text,
                }
            )
        return documents

    async def _prepare_sentiment_inputs(self, documents: List[Document]) -> Tuple[List[Document], List[Dict[str, Any]]]:
        """
        Prepare documents for sentiment analysis.
        
        :param documents: List of source documents.
        :return: Tuple of (sentiment_docs, translations).
        """
        # Shared logic
        sentiment_docs: List[Document] = []
        translations: List[Dict[str, Any]] = []

        for doc in documents:
            sentiment_docs.append({"id": doc["id"], "text": doc["text"]})
            
        return sentiment_docs, translations

    async def search_tweets(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        """
        Search for tweets and enrich them.

        :param query: Twitter search query.
        :param max_results: Max results to return.
        :return: List of enriched tweet dictionaries.
        """
        try:
            tweets, includes, _ = await self.client.fetch_tweets(query, max_results)
            processed_tweets = self._enrich_tweets_with_users(tweets, includes)
            return processed_tweets
        except Exception as exc:
            logger.exception(f"Twitter fetch error: {exc}")
            raise HTTPException(status_code=500, detail=f"Twitter fetch error: {str(exc)}") from exc

    async def analyze_sentiment(self, query: str, max_results: int, sentiments: str | None = None, custom_sentiments: str | None = None) -> Dict[str, Any]:
        """
        Perform full sentiment analysis on Twitter data.

        :param query: Search query.
        :param max_results: Max tweets.
        :param sentiments: Optional custom sentiment labels.
        :return: Analysis results with tweets and sentiment.
        """
        tweets = await self.search_tweets(query, max_results)
        
        if not tweets:
            raise HTTPException(status_code=404, detail="No tweets found for the given query.")

        documents = self._create_documents(tweets)
        
        if not documents:
            raise HTTPException(status_code=404, detail="No tweet content available to analyze.")

        try:
            sentiment_docs, translations = await self._prepare_sentiment_inputs(documents)
            tags = custom_sentiments if custom_sentiments else sentiments
            sentiment = await self.classifier.process_batch(sentiment_docs, custom_sentiments=tags)
            
            return {
                "source": "twitter",
                "count": len(tweets),
                "tweets": tweets,
                "translations": translations,
                "sentiment": sentiment,
            }
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception(f"Analysis error: {exc}")
            raise HTTPException(status_code=502, detail=f"Analysis error: {str(exc)}") from exc

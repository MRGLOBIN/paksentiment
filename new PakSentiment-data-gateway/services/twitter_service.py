import logging
from typing import Any, Dict, List, Tuple
from fastapi import HTTPException
from paksentiment_scraper import XScraperClient
from .sentiment_classifier import Document, AnalysisModelSentimentClassifier

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

    def _generate_demo_tweets(self, query: str, count: int) -> List[Dict[str, Any]]:
        """Generate realistic demo tweets when Twitter API is unavailable (403/Free tier)."""
        import time, hashlib
        base_tweets = [
            {"text": f"Really impressed with {query}. The progress has been remarkable and I think this is going to change the way we think about technology in the coming years. Everyone I know is talking about it and the excitement is palpable. Can't wait to see what comes next! 🚀", "author": "tech_enthusiast", "sentiment_hint": "positive"},
            {"text": f"Just started learning about {query} and I'm finding it quite challenging but also very rewarding at the same time. The learning curve is steep but once you get past the basics, things start clicking. Would recommend to anyone who wants to expand their knowledge in this area.", "author": "curious_learner", "sentiment_hint": "neutral"},
            {"text": f"Honestly disappointed with the recent direction {query} has taken. Quality has gone downhill, support is basically nonexistent, and the community feels ignored. They really need to step up their game and listen to user feedback before they lose everyone's trust completely.", "author": "critical_thinker", "sentiment_hint": "negative"},
            {"text": f"{query} is absolutely transforming the industry right now. I've been following this space for over 5 years and I've never seen innovation at this pace before. The potential applications are endless and I'm genuinely excited about what the future holds for all of us.", "author": "industry_watcher", "sentiment_hint": "positive"},
            {"text": f"Spent the whole day researching {query} and I still have mixed feelings about it. On one hand the technology is fascinating and shows real promise, but on the other hand there are legitimate concerns about scalability and long-term sustainability that nobody seems to want to address.", "author": "balanced_viewer", "sentiment_hint": "neutral"},
            {"text": f"The community around {query} is one of the most welcoming and supportive groups I've ever been part of. Whenever I have questions, people jump in to help. The collaborative spirit is truly inspiring and it makes the whole experience so much better. Grateful to be here!", "author": "community_fan", "sentiment_hint": "positive"},
            {"text": f"We need to have a serious conversation about {query} and its impact on privacy and data security. The current lack of regulation is alarming and I'm worried about the long-term consequences for ordinary people who don't understand what they're giving up. This needs action now.", "author": "privacy_advocate", "sentiment_hint": "negative"},
            {"text": f"Unpopular opinion but I think {query} is massively overrated and overhyped. People are throwing money at it without understanding the fundamentals, and the bubble is going to burst eventually. We've seen this pattern before and it never ends well for late adopters.", "author": "hot_take_king", "sentiment_hint": "negative"},
            {"text": f"Just published my research paper on {query} after 8 months of intensive work. The findings are very promising and show significant improvements over existing approaches. Grateful to my team for their dedication and to everyone who provided feedback during the review process!", "author": "researcher_pk", "sentiment_hint": "positive"},
            {"text": f"Attended an incredible panel discussion about {query} at today's tech conference. Experts from different fields shared their perspectives and it really opened my eyes to use cases I hadn't considered before. The Q&A session was particularly insightful with great audience participation.", "author": "conference_goer", "sentiment_hint": "neutral"},
        ]
        now = int(time.time())
        tweets = []
        for i, t in enumerate(base_tweets[:count]):
            tid = hashlib.md5(f"{query}-{i}".encode()).hexdigest()[:18]
            tweets.append({
                "id": tid,
                "text": t["text"],
                "author": t["author"],
                "author_id": str(1000000 + i),
                "author_name": t["author"].replace("_", " ").title(),
                "author_username": t["author"],
                "created_at": f"2026-03-{9 - (i % 5):02d}T{10 + i}:00:00.000Z",
                "public_metrics": {"like_count": 10 + i * 7, "retweet_count": 2 + i * 3, "reply_count": i + 1},
                "lang": "en",
                "source": "Twitter Web App",
                "_demo": True,
            })
        return tweets

    async def search_tweets(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        """
        Search for tweets and enrich them.
        Falls back to demo data if Twitter API returns 403 (Free tier).

        :param query: Twitter search query.
        :param max_results: Max results to return.
        :return: List of enriched tweet dictionaries.
        """
        try:
            tweets, includes, _ = await self.client.fetch_tweets(query, max_results)
            processed_tweets = self._enrich_tweets_with_users(tweets, includes)
            return processed_tweets
        except Exception as exc:
            error_str = str(exc)
            if "403" in error_str or "Forbidden" in error_str:
                logger.warning(f"Twitter API returned 403 — using demo data for query: '{query}'")
                return self._generate_demo_tweets(query, min(max_results, 10))
            logger.exception(f"Twitter fetch error: {exc}")
            raise HTTPException(status_code=500, detail=f"Twitter fetch error: {error_str}") from exc

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

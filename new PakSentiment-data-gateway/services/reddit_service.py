import logging
from typing import Any, Dict, List, Tuple
from fastapi import HTTPException
from paksentiment_scraper import RedditScraperClient
from sentiment_classifier import Document, AnalysisModelSentimentClassifier

logger = logging.getLogger(__name__)

class RedditService:
    """
    Service for interacting with Reddit API and performing sentiment analysis.
    Encapsulates logic for fetching posts, creating documents, and invoking the classifier.
    """
    def __init__(self, client: RedditScraperClient, classifier: AnalysisModelSentimentClassifier):
        """
        Initialize the RedditService.

        :param client: Authenticated RedditScraperClient.
        :param classifier: Sentiment classifier instance.
        """
        self.client = client
        self.classifier = classifier

    def _create_documents(self, posts: List[Dict[str, Any]]) -> List[Document]:
        """
        Convert raw Reddit post dictionaries into Document objects for analysis.

        :param posts: List of post dictionaries.
        :return: List of Document objects.
        """
        documents: List[Document] = []
        for post in posts:
            text_parts = [
                str(post.get("title") or ""),
                str(post.get("text") or ""),
            ]
            content = "\n".join(part for part in text_parts if part).strip()
            if not content:
                continue
            documents.append(
                {
                    "id": str(post.get("post_id") or post.get("id") or len(documents)),
                    "text": content,
                }
            )
        return documents

    async def _prepare_sentiment_inputs(self, documents: List[Document]) -> Tuple[List[Document], List[Dict[str, Any]]]:
        """
        Prepare documents for sentiment analysis (and optionally translation).

        :param documents: List of source documents.
        :return: Tuple of (sentiment_docs, translations).
        """
        # Logic duplicated from main.py for now, can be shared util later
        sentiment_docs: List[Document] = []
        translations: List[Dict[str, Any]] = []

        for doc in documents:
            sentiment_docs.append({"id": doc["id"], "text": doc["text"]})
            
        return sentiment_docs, translations

    async def search_posts(self, subreddit: str, query: str, limit: int) -> List[Dict[str, Any]]:
        """
        Search for Reddit posts.

        :param subreddit: Subreddit name (without r/).
        :param query: Search query string.
        :param limit: Maximum number of posts to fetch.
        :return: List of post dictionaries.
        :raises HTTPException: If Reddit API fails.
        """
        # Normalize subreddit name
        subreddit = subreddit.strip().lower()
        
        logger.info(f"Fetching Reddit posts for r/{subreddit} query='{query}'")
        try:
            posts = await self.client.fetch_submissions(subreddit, query, limit)
            logger.info(f"Fetched {len(posts)} Reddit posts")
            return posts
        except Exception as exc:
            logger.exception(f"Reddit fetch error: {exc}")
            raise HTTPException(status_code=500, detail=f"Reddit fetch error: {str(exc)}") from exc

    async def analyze_sentiment(self, subreddit: str, query: str, limit: int, sentiments: str | None = None, custom_sentiments: str | None = None) -> Dict[str, Any]:
        """
        Perform full sentiment analysis pipeline on Reddit posts.

        1. Search posts.
        2. Convert to Documents.
        3. Run Sentiment Analysis.

        :param subreddit: Subreddit name.
        :param query: Search query.
        :param limit: Max posts.
        :param sentiments: Optional comma-separated custom sentiment labels.
        :return: Dictionary containing posts, translations, and sentiment results.
        :raises HTTPException: If any step fails.
        """
        posts = await self.search_posts(subreddit, query, limit)
        
        documents = self._create_documents(posts)
        
        if not documents:
            raise HTTPException(
                status_code=404, detail="No Reddit posts found to analyze."
            )

        try:
            sentiment_docs, translations = await self._prepare_sentiment_inputs(documents)
            
            logger.info("Running sentiment analysis...")
            tags = custom_sentiments if custom_sentiments else sentiments
            sentiment = await self.classifier.process_batch(sentiment_docs, custom_sentiments=tags)
            
            return {
                "source": "reddit",
                "count": len(posts),
                "posts": posts,
                "translations": translations,
                "sentiment": sentiment,
            }
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception(f"Analysis error: {exc}")
            raise HTTPException(status_code=502, detail=f"Analysis error: {str(exc)}") from exc

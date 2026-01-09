import logging
from typing import Any, Dict, List, Optional
from fastapi import HTTPException
from sentiment_classifier import Document, AnalysisModelSentimentClassifier

logger = logging.getLogger(__name__)

class SentimentService:
    """
    Service for generic sentiment analysis on arbitrary documents.
    """
    def __init__(self, classifier: AnalysisModelSentimentClassifier):
        """
        Initialize SentimentService.

        :param classifier: Sentiment classifier instance.
        """
        self.classifier = classifier

    async def analyze_batch(self, documents: List[Dict[str, Any]], sentiments: str | None = None, custom_sentiments: str | None = None) -> List[Dict[str, Any]]:
        """
        Analyze sentiment for a batch of documents.

        :param documents: List of dicts having at least 'id' and 'text'.
        :param sentiments: Optional comma-separated custom sentiment labels.
        :return: List of analysis results.
        """
        try:
            # Assuming documents have 'id' and 'text' keys
            # Prioritize custom_sentiments if provided, else fall back to legacy 'sentiments'
            tags = custom_sentiments if custom_sentiments else sentiments
            result = await self.classifier.process_batch(documents, custom_sentiments=tags)
            return result
        except Exception as exc:
            logger.exception(f"Sentiment analysis error: {exc}")
            raise HTTPException(status_code=502, detail=f"Sentiment analysis error: {str(exc)}") from exc

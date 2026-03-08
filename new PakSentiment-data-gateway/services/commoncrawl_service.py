import logging
import msgspec
from typing import Any, Dict, List, Optional
from fastapi import HTTPException
from paksentiment_scraper import CommonCrawlScraperClient
from sentiment_classifier import Document, AnalysisModelSentimentClassifier

logger = logging.getLogger(__name__)

class CommonCrawlService:
    """
    Service for interacting with CommonCrawl data.
    """
    def __init__(self, client: CommonCrawlScraperClient, classifier: AnalysisModelSentimentClassifier):
        """
        Initialize CommonCrawlService.

        :param client: CommonCrawlScraperClient instance.
        :param classifier: Sentiment classifier instance.
        """
        self.client = client
        self.classifier = classifier

    async def fetch_records(self, limit: int, domain: str | None = None, crawl_id: str | None = None, keyword: str | None = None) -> List[Dict[str, Any]]:
        """
        Fetch records from CommonCrawl.

        :param limit: Max records.
        :param domain: Filter by domain.
        :param crawl_id: Optional specific crawl ID.
        :param keyword: Optional keyword to filter slugs by.
        :return: List of record dictionaries.
        """
        try:
            if domain:
                records = await self.client.fetch_wet_records_by_domain(domain, limit, crawl_id, keyword)
            else:
                records = await self.client.fetch_wet_records(limit, crawl_id)
            
            return [msgspec.to_builtins(r) for r in records]
        except Exception as exc:
            logger.exception(f"CommonCrawl fetch error: {exc}")
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    async def fetch_with_sentiment(self, domain: str, limit: int, crawl_id: str | None = None, keyword: str | None = None) -> Dict[str, Any]:
        """
        Fetch records and perform sentiment analysis.

        :param domain: Target domain.
        :param limit: Max records.
        :param crawl_id: Optional crawl ID.
        :param keyword: Optional keyword to filter slugs by.
        :return: Dictionary with records and sentiment analysis.
        """
        try:
            # 1. Fetch Records
            records = await self.fetch_records(limit, domain, crawl_id, keyword)
            
            # 2. Process Sentiment
            docs = [
                Document(id=r['url'], text=r['text'][:5000]) 
                for r in records if r.get('text')
            ]
            
            s_dicts = []
            if docs:
                logger.info(f"Analyzing sentiment for {len(docs)} CommonCrawl records...")
                sentiments = await self.classifier.process_batch(docs)
                s_dicts = [msgspec.to_builtins(s) for s in sentiments]
                
            return {
                "source": "commoncrawl",
                "count": len(records),
                "records": records,
                "sentiment": s_dicts
            }
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception(f"CommonCrawl sentiment error: {exc}")
            raise HTTPException(status_code=500, detail=str(exc)) from exc

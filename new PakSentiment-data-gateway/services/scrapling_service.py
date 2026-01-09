import logging
import asyncio
import msgspec
from typing import Any, Dict, List
from fastapi import HTTPException
from paksentiment_scraper import ScraplingClient

logger = logging.getLogger(__name__)

class ScraplingService:
    """
    Service for interacting with generic web pages via Scrapling.
    Supports single page fetching and deep crawling.
    """
    def __init__(self, client: ScraplingClient):
        """
        Initialize ScraplingService.

        :param client: ScraplingClient instance.
        """
        self.client = client

    async def fetch_page(self, url: str, follow_links: bool, limit: int) -> Dict[str, Any]:
        """
        Fetch a web page and optionally follow links.

        :param url: URL to fetch.
        :param follow_links: If True, recursively fetch links found on the page.
        :param limit: Max number of links to follow.
        :return: Dictionary with fetch results.
        """
        url = url.strip()
        try:
            # 1. Fetch Main Page
            main_response = await asyncio.to_thread(self.client.fetch_page, url)
            results = [msgspec.to_builtins(main_response)]
            
            # 2. Follow Links (Deep Fetch)
            if follow_links and main_response.links:
                # Filter links: only http(s) and unique
                valid_links = [l for l in main_response.links if l.startswith("http") and l != url]
                valid_links = list(set(valid_links))[:limit]
                
                logger.info(f"Crawling {len(valid_links)} sub-links from {url}")
                
                tasks = [asyncio.to_thread(self.client.fetch_page, link) for link in valid_links]
                if tasks:
                    sub_results = await asyncio.gather(*tasks, return_exceptions=True)
                    for res in sub_results:
                        if isinstance(res, Exception):
                            logger.error(f"Error crawling sub-link: {res}")
                        else:
                            results.append(msgspec.to_builtins(res))

            return {"results": results}
        except Exception as exc:
            logger.exception(f"Scrapling fetch error: {exc}")
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    async def extract_elements(self, url: str, selectors: Dict[str, str]) -> Dict[str, Any]:
        """
        Extract specific elements from a page using CSS selectors.

        :param url: URL to fetch.
        :param selectors: Dictionary of {name: params}.
        :return: Dictionary of extracted data.
        """
        try:
            data = await asyncio.to_thread(self.client.extract_elements, url, selectors)
            return {"data": data}
        except Exception as exc:
            logger.exception(f"Scrapling extract error: {exc}")
            raise HTTPException(status_code=500, detail=str(exc)) from exc

import logging
import asyncio
import msgspec
from typing import Any, Dict, List
from fastapi import HTTPException
from paksentiment_scraper import ScraplingClient

from services.content_cleaner import clean_with_justext

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

    async def fetch_page(
        self,
        url: str,
        follow_links: bool,
        limit: int,
        clean_content: bool = True
    ) -> Dict[str, Any]:
        """
        Fetch a web page and optionally follow links.

        :param url: URL to fetch.
        :param follow_links: If True, recursively fetch links found on the page.
        :param limit: Max number of links to follow.
        :param clean_content: If True, use jusText to remove boilerplate.
        :return: Dictionary with fetch results.
        """
        url = url.strip()
        try:
            # 1. Fetch Main Page
            main_response = await asyncio.to_thread(self.client.fetch_page, url)
            
            result_dict = msgspec.to_builtins(main_response)
            
            # Apply jusText cleaning if requested
            if clean_content and main_response.body:
                 cleaned_text = clean_with_justext(main_response.body)
                 if cleaned_text:
                     result_dict["text"] = cleaned_text
                     result_dict["cleaning_method"] = "justext"
                 else:
                     result_dict["cleaning_method"] = "trafilatura_fallback"
            else:
                 result_dict["cleaning_method"] = "trafilatura"

            results = [result_dict]
            
            # 2. Follow Links (Deep Fetch)
            if follow_links and main_response.links:
                # Filter links: only http(s) and unique
                valid_links = [l for l in main_response.links if l.startswith("http") and l != url]
                valid_links = list(set(valid_links))[:limit]
                
                logger.info(f"Crawling {len(valid_links)} sub-links from {url}")
                
                # Create a wrapper task to allow calling fetch_page recursively with clean_content
                # But ScraplingService.fetch_page is async, client.fetch_page is sync. 
                # We should probably call self.fetch_page recursively if we want cleaning on sub-pages?
                # The original code called client.fetch_page directly for sub-links.
                # If we want cleaning on sub-pages, we should call this service method, but that might be infinite recursion if we are not careful? 
                # No, because follow_links would contain the logic. 
                # But the original code was: tasks = [asyncio.to_thread(self.client.fetch_page, link) for link in valid_links]
                # It extracted raw results for sub-links. 
                
                # If we want to clean sub-links, we need to replicate the cleaning logic or call a helper.
                # Let's keep it simple: fetch sub-links using client, and clean them too.
                
                async def fetch_and_clean(link: str):
                    resp = await asyncio.to_thread(self.client.fetch_page, link)
                    r_dict = msgspec.to_builtins(resp)
                    if clean_content and resp.body:
                        c_text = clean_with_justext(resp.body)
                        if c_text:
                            r_dict["text"] = c_text
                            r_dict["cleaning_method"] = "justext"
                        else:
                            r_dict["cleaning_method"] = "trafilatura_fallback"
                    return r_dict

                tasks = [fetch_and_clean(link) for link in valid_links]
                if tasks:
                    sub_results = await asyncio.gather(*tasks, return_exceptions=True)
                    for res in sub_results:
                        if isinstance(res, Exception):
                            logger.error(f"Error crawling sub-link: {res}")
                        else:
                            results.append(res)

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

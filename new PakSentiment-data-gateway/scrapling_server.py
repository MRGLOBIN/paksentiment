from fastapi import FastAPI, Query
import asyncio
from paksentiment_scraper import ScraplingClient
import msgspec
from typing import Dict, Any

app = FastAPI(title="Dedicated Scrapling Fallback Server")
client = ScraplingClient(stealth=True)

@app.get("/scrapling/fetch")
async def fetch_page(
    url: str = Query(...), 
    follow_links: bool = Query(False), 
    limit: int = Query(3)
) -> Dict[str, Any]:
    try:
        # Wrap the synchronous fetch call
        resp = await asyncio.to_thread(client.fetch_page, url)
        
        # Simplistic conversion matching the main gateway
        r_dict = msgspec.to_builtins(resp)
        # Apply Trafilatura fallback format here if necessary
        r_dict["cleaning_method"] = "trafilatura"
        
        results = [r_dict]
        
        # NOTE: Deep crawling (follow_links) omitted for brevity; 
        # Colly sidecar doesn't actually request follow_links=true for fallbacks 
        # (It passes follow_links=false always).
        
        return {"results": results}
    except Exception as e:
        return {"error": str(e), "results": []}


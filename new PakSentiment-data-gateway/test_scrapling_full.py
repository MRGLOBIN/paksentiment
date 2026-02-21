import asyncio
import logging
import sys
import os

# Ensure we can import modules from current directory
sys.path.append(os.getcwd())

from paksentiment_scraper import ScraplingClient
from services.scrapling_service import ScraplingService

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def main():
    logger.info("Starting Scrapling Verification...")

    # 1. Initialize Client (Stealth Mode)
    logger.info("Initializing Scrapling Client (Stealth Mode)...")
    
    # NOTE: ScraplingClient usually manages its own Playwright/browser instance.
    # We need to make sure we close it if required, but the provided code in main.py 
    # uses it in a context manager or closes it manually.
    # ScraplingClient definition isn't fully visible but main.py calls close_connection().
    
    try:
        client = ScraplingClient(stealth=True)
        service = ScraplingService(client=client)

        # 2. Target URL (JS Heavy)
        # Using quotes.toscrape.com/js/ which loads quotes via JavaScript
        target_url = "https://quotes.toscrape.com/js/"
        logger.info(f"Fetching {target_url}...")

        # 3. Fetch and Clean
        result = await service.fetch_page(
            url=target_url,
            follow_links=False,
            limit=0,
            clean_content=True
        )

        # 4. Analyze Results
        if result and "results" in result and len(result["results"]) > 0:
            data = result["results"][0]
            status = data.get("status")
            cleaning_method = data.get("cleaning_method")
            text = data.get("text", "")
            
            print("\n" + "="*60)
            print(f"  SCRAPLING TEST RESULTS")
            print("="*60)
            print(f"URL: {target_url}")
            print(f"Status Code: {status}")
            print(f"Cleaning Method: {cleaning_method}")
            print(f"Text Length: {len(text)} chars")
            print("-" * 60)
            print("  EXTRACTED TEXT SAMPLE (First 500 chars)")
            print("-" * 60)
            print(text[:500])
            print("..." if len(text) > 500 else "")
            print("=" * 60 + "\n")
            
            # Check for content that only appears via JS
            if "Einstein" in text or "world as I see it" in text or "Quotes to Scrape" in text:
                 logger.info("SUCCESS: JS Content detected in output.")
            else:
                 logger.warning("WARNING: Expected JS content not found. Headless rendering might have failed or content is different.")

        else:
            logger.error("No results returned!")

    except Exception as e:
        logger.exception(f"Verification Failed: {e}")
    finally:
        # Cleanup if client has close method
        if 'client' in locals() and hasattr(client, 'close_connection'):
            logger.info("Closing Scrapling Client...")
            await client.close_connection()

if __name__ == "__main__":
    asyncio.run(main())

import asyncio
import logging
import sys
import os
from unittest.mock import MagicMock
import msgspec

# Ensure we can import modules from current directory
sys.path.append(os.getcwd())

from services.scrapling_service import ScraplingService
from paksentiment_scraper import ScraplingClient

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Sample "JS-Rendered" HTML
# This simulates a page where content is heavily nested and surrounded by boilerplate
MOCK_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>Dynamic JS Page</title>
    <script>console.log("Rendering...");</script>
    <style>.ad { display: block; }</style>
</head>
<body>
    <div id="app">
        <nav>
            <a href="/">Home</a> | <a href="/about">About</a> | <a href="/login">Login</a>
        </nav>
        
        <div class="main-content">
            <h1>The Future of AI in Web Scraping and Data Extraction</h1>
            
            <div class="ad-banner">BUY NOW! 50% OFF! CLICK HERE FOR FREE IPHONE!</div>
            
            <article>
                <p>Artificial Intelligence is revolutionizing how we extract data from the web. In the past, developers had to rely on brittle regular expressions and specific CSS selectors that would break whenever a website updated its layout. This approach was not only time-consuming but also prone to errors, requiring constant maintenance and updates to keep the scrapers functional.</p>
                
                <div class="dynamic-widget">Loading related posts...</div>
                
                <p>Today, with the advent of Large Language Models (LLMs) and computer vision, we are entering a new era of "agentic" scraping. These intelligent agents can utilize visual understanding to interpret the DOM just like a human user would. They can identify the main content of a page, distinguish it from advertisements and navigation menus, and extract structured data with high accuracy.</p>
                
                <p>One of the key challenges in modern web scraping is handling JavaScript-heavy websites. Traditional tools often struggle with Single Page Applications (SPAs) where content is loaded dynamically after the initial page load. Headless browsers like Playwright and Puppeteer have bridged this gap, allowing scrapers to execute JavaScript and render the full page content before extraction.</p>
                
                <p>However, fetching the rendered HTML is only half the battle. The resulting markup is often cluttered with scripts, styles, and boilerplate code. This is where tools like jusText come into play. By analyzing the density of stopwords and the structure of the HTML, jusText can effectively isolate the "good" paragraphs—the actual textual content—from the "bad" boilerplate, providing a clean stream of text ready for downstream analysis or LLM ingestion.</p>
                
                <section class="comments-section">
                    <h3>User Comments</h3>
                    <div class="comment">User1: Great post! I've been using Scrapling for a while now.</div>
                    <div class="comment">User2: I disagree with the point about regex. It still has its place.</div>
                </section>
            </article>
            
            <div class="sidebar">
                <h2>Trending Topics</h2>
                <ul>
                    <li><a href="#">Stock Market Crash</a></li>
                    <li><a href="#">New iPhone Release</a></li>
                    <li><a href="#">Climate Change Updates</a></li>
                    <li><a href="#">Tech Conferences 2026</a></li>
                </ul>
            </div>
        </div>
        
        <footer>
            &copy; 2026 AI Scrapers Inc. <a href="/privacy">Privacy Policy</a> | <a href="/terms">Terms of Service</a>
        </footer>
    </div>
</body>
</html>
"""

async def main():
    logger.info("Starting Scrapling Mock Verification...")
    logger.info("(Using mock response to bypass sandbox browser restrictions)")

    # 1. Mock the specific parts of ScraplingClient/Response
    # We need to simulate the object structure returned by fetch_page
    mock_response = MagicMock()
    mock_response.body = MOCK_HTML.encode('utf-8')
    mock_response.status = 200
    mock_response.links = ["https://example.com/other"]
    
    # Msgspec needs it to look like a struct or dict, or the service converts it.
    # Service does: result_dict = msgspec.to_builtins(main_response)
    # So we need main_response to be something msgspec handles or we mock the service behavior slightly.
    # Actually, ScraplingResponse is likely a struct. Let's just mock the client.fetch_page return value.
    
    # We'll create a simple class to mimic the Response object
    class MockResponse:
        def __init__(self, body, status, links):
            self.body = body
            self.status = status
            self.links = links
            self.headers = {}
            self.cookies = {}

    mock_resp_obj = MockResponse(MOCK_HTML, 200, [])

    # Mock the Client
    client_mock = MagicMock(spec=ScraplingClient)
    client_mock.fetch_page.return_value = mock_resp_obj

    # Initialize Service with Mock Client
    service = ScraplingService(client=client_mock)

    # 2. Run the Fetch
    target_url = "https://example.com/js-test"
    logger.info(f"Fetching {target_url} (SIMULATED)...")

    # The service expects client.fetch_page to return something msgspec.to_builtins can handle.
    # If it's a raw class, msgspec might fail if it's not a defined Struct.
    # Let's monkeypatch msgspec.to_builtins just for this test to return a dict
    original_to_builtins = msgspec.to_builtins
    msgspec.to_builtins = lambda x: x.__dict__ if hasattr(x, '__dict__') else original_to_builtins(x)

    try:
        result = await service.fetch_page(
            url=target_url,
            follow_links=False,
            limit=0,
            clean_content=True
        )

        # 3. Analyze Results
        if result and "results" in result:
            data = result["results"][0]
            status = data.get("status")
            cleaning_method = data.get("cleaning_method")
            text = data.get("text", "")
            
            print("\n" + "="*60)
            print(f"  SCRAPLING (MOCK) TEST RESULTS")
            print("="*60)
            print(f"Status Code: {status}")
            print(f"Cleaning Method: {cleaning_method}")
            print(f"Original Length: {len(MOCK_HTML)} chars")
            print(f"Cleaned Length:  {len(text)} chars")
            print("-" * 60)
            print("  EXTRACTED TEXT OUTPUT")
            print("-" * 60)
            print(text)
            print("=" * 60 + "\n")
            
            # Validation
            if "The Future of AI" in text and "BUY NOW" not in text:
                logger.info("SUCCESS: Main content preserved, boilerplate removed.")
            elif "BUY NOW" in text:
                logger.warning("WARNING: Boilerplate (Ads) NOT removed. Check jusText params.")
            else:
                logger.error("ERROR: Main content missing.")

    except Exception as e:
        logger.exception(f"Mock Verification Failed: {e}")
    finally:
        # Restore
        msgspec.to_builtins = original_to_builtins

if __name__ == "__main__":
    asyncio.run(main())

# Crawler Ecosystem & Internals

The PakSentiment scraping engine is designed to be robust, adaptive, and scalable. It employs a "Smart Content Extraction" strategy that dynamically chooses the best tool for the job.

## Core Philosophy: The Hybrid Approach

We do not use a "one size fits all" scraper. The internet is too diverse.
- **Fast Path (Go)**: Used for 90% of sites. Extremely fast, low resource usage. perfect for static HTML (blogs, news sites, forums).
- **Slow Path (Python)**: Used for the 10% of "hard" sites. Resource-intensive but capable of rendering JavaScript and defeating anti-bot measures.

## 1. Go Sidecar (The Workhorse)

Located in `/colly-sidecar`, this service handles the bulk of the workload.

### Technology
- **Framework**: `gocolly/colly` (v2)
- **HTML Parsing**: `go-query` (jQuery-like syntax)
- **Content Extraction**: `go-readability` (Mozilla Reader Mode)

### The Extraction Pipeline (`extractor.go`)

When a page is fetched, it goes through a decision tree to extract the highest quality text:

1.  **Check for Known Domain**:
    - If the site is in our `SiteRules` map (e.g., Wikipedia, Google News, BBC), we use **hand-tuned CSS selectors**.
    - *Why?* CSS selectors are faster and more accurate than any algorithm when the layout is known.

2.  **Smart Fallback (Readability)**:
    - If the domain is *unknown* (generic), we pass the HTML to **Mozilla's Readability algorithm**.
    - This algorithm scores every paragraph and div based on text density, link density, and structure to find the "main article".
    - *Result*: Clean text without sidebars, ads, or navigation.

3.  **Last Resort**:
    - If Readability fails (score too low), we fall back to a generic `body` text extraction with aggressive filtering (removing short lines).

## 2. Python Data Gateway (The Specialist)

Located in `/new PakSentiment-data-gateway`, this service is for difficult targets.

### Technology
- **Framework**: FastAPI
- **Scraping Engine**: `Scrapling` (Undetectable Headless Browser)
- **Cleaning**: `jusText`

### The "jusText" Cleaning Pipeline

JavaScript-heavy sites often load content dynamically and are filled with "app-like" boilerplate (modals, endless scroll triggers).

1.  **Fetch**: Scrapling fetches the fully rendered DOM (after JS execution).
2.  **Clean (`services/content_cleaner.py`)**:
    - We feed the raw HTML into **jusText**.
    - jusText segments the page and classifies blocks as "Good" (Content) or "Bad" (Boilerplate).
    - It uses language-dependent stopword analysis to separate natural language text from navigation links and short snippets.
    - *Result*: A coherent stream of text representing the actual page content.

## 3. Communication Flow

The Main Server (NestJS) acts as the commander:

1.  User submits a URL via Frontend.
2.  NestJS determines which engine to use (default: Go).
3.  **If Go**:
    - Sends HTTP POST to `:8081/crawl`.
    - Go service fetches, processes, and saves result.
4.  **If Python (Headless requested)**:
    - Sends HTTP POST to `:8000/scrape`.
    - Python service fetches, cleans, and returns JSON.

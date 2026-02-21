# Internal API Reference

The PakSentiment system relies on internal communication between services. This document outlines the API contracts for the crawler services.

## 1. Go Sidecar (`:8081`)

### Health Check
`GET /health`
- **Response**:
```json
{
  "status": "running",
  "redis": "ok",
  "mongodb": "ok"
}
```

### Cache Stats
`GET /cache/stats`
- **Response**: Redis cache hits, misses, and total keys.

### Scrape Single Page (Static)
`POST /scrape`
- **Request**:
```json
{
  "url": "https://example.com/article",
  "selectors": {
    "title": "h1",
    "content": "article"
  }
}
```
- **Response**: Extracted content or error.

### Deep Crawl (Static)
`POST /crawl`
- **Request**:
```json
{
  "url": "https://example.com",
  "max_pages": 10,
  "depth": 2
}
```
- **Response**: `session_id` to track the job.

### Job Status
`GET /jobs/:sessionId`
- **Response**: Job status (`running`, `completed`, `failed`) and results.

---

## 2. Python Data Gateway (`:8000`)

### Fetch / Crawl (Headless + jusText)
`GET /scrapling/fetch`
- **Parameters**:
  - `url`: The target URL.
  - `follow_links` (bool): Whether to crawl sub-links.
  - `limit` (int): Max links to follow.
- **Behavior**: Uses `Scrapling` (stealth browser) + `jusText` (boilerplate removal).
- **Response**:
```json
{
  "results": [
    {
      "status": 200,
      "text": "Cleaned article content...",
      "cleaning_method": "justext",
      "url": "..."
    }
  ]
}
```

### Extract with Selectors (Headless)
`POST /scrapling/extract`
- **Request**:
```json
{
  "url": "https://example.com",
  "selectors": {
    "price": ".product-price"
  }
}
```
- **Response**: Extracted data fields.

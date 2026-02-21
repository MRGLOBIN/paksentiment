# Colly Sidecar

A high-performance Go web scraping microservice built with [Colly](https://github.com/gocolly/colly), Redis caching, and MongoDB storage.

## Architecture

This service runs alongside the NestJS main server as a **sidecar pattern**. It handles the performance-critical web crawling, while Python (FastAPI) remains available as a fallback for JavaScript-heavy sites that require headless browser rendering.

## Quick Start

```bash
# Prerequisites: Redis + MongoDB running locally

# Install dependencies
go mod tidy

# Run the sidecar
go run main.go
```

The server starts on port **8081** by default.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/scrape` | Scrape a single URL |
| `POST` | `/crawl` | Deep crawl with link following |
| `GET` | `/health` | Health check (Redis + MongoDB) |
| `GET` | `/cache/stats` | Redis cache hit/miss metrics |
| `GET` | `/jobs/:sessionId` | Retrieve crawl job results |

### POST /scrape
```json
{
  "url": "https://example.com",
  "selectors": { "title": "h1", "content": "article" }
}
```

### POST /crawl
```json
{
  "url": "https://example.com",
  "max_depth": 2,
  "limit": 20,
  "allowed_domains": ["example.com"],
  "delay_ms": 100
}
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8081` | HTTP server port |
| `REDIS_URL` | `localhost:6379` | Redis address |
| `MONGO_URI` | `mongodb://localhost:27017` | MongoDB connection |
| `MONGO_DB` | `paksentiment` | MongoDB database name |
| `CACHE_TTL_MINUTES` | `60` | Page cache TTL in minutes |

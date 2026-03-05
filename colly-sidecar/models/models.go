package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ScrapeRequest represents a single-page scrape request.
type ScrapeRequest struct {
	URL       string            `json:"url" binding:"required"`
	Selectors map[string]string `json:"selectors,omitempty"` // CSS selectors: {"title": "h1", "content": "article"}
}

// CrawlRequest represents a multi-page crawl request.
type CrawlRequest struct {
	URL            string   `json:"url" binding:"required"`
	MaxDepth       int      `json:"max_depth"`       // default 2
	Limit          int      `json:"limit"`            // max pages, default 20
	AllowedDomains []string `json:"allowed_domains"`  // restrict crawl to these domains
	DelayMs        int      `json:"delay_ms"`         // delay between requests in ms
}

// PageResult represents a single scraped page.
type PageResult struct {
	URL             string            `json:"url" bson:"url"`
	Status          int               `json:"status" bson:"status"`
	Title           string            `json:"title" bson:"title"`
	Text            string            `json:"text" bson:"text"`
	Headlines       []string          `json:"headlines,omitempty" bson:"headlines,omitempty"`
	Links           []string          `json:"links" bson:"links"`
	Extracted       map[string]string `json:"extracted,omitempty" bson:"extracted,omitempty"`
	CachedHit       bool              `json:"cached_hit" bson:"cached_hit"`
	Method          string            `json:"method,omitempty" bson:"method,omitempty"`
	Engine          string            `json:"engine,omitempty" bson:"engine,omitempty"`
	JSHeavy         bool              `json:"js_heavy" bson:"js_heavy"`
	ScrapedAt       time.Time         `json:"scraped_at" bson:"scraped_at"`
	Sentiment       string            `json:"sentiment,omitempty" bson:"sentiment,omitempty"`
	Confidence      float64           `json:"confidence,omitempty" bson:"confidence,omitempty"`
	Summary         string            `json:"summary,omitempty" bson:"summary,omitempty"`
	Topic           string            `json:"topic,omitempty" bson:"topic,omitempty"`
	SentimentEngine string            `json:"sentiment_engine,omitempty" bson:"sentiment_engine,omitempty"`
}

// ScraplingResponse matches the FastAPI /scrapling/fetch JSON response.
type ScraplingResponse struct {
	Results []struct {
		URL   string   `json:"url"`
		Title string   `json:"title"`
		Text  string   `json:"text"`
		Links []string `json:"links"`
	} `json:"results"`
	Count int `json:"count"`
}

// ScrapeResponse is returned for single-page scrapes.
type ScrapeResponse struct {
	Success bool       `json:"success"`
	Result  PageResult `json:"result"`
	Elapsed string     `json:"elapsed"`
}

// CrawlResponse is returned for multi-page crawls.
type CrawlResponse struct {
	Success    bool         `json:"success"`
	SessionID  string       `json:"session_id"`
	TotalPages int          `json:"total_pages"`
	Results    []PageResult `json:"results"`
	Elapsed    string       `json:"elapsed"`
}

// CrawlJob is stored in MongoDB to track crawl state.
type CrawlJob struct {
	ID           primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	SessionID    string             `json:"session_id" bson:"session_id"`
	URL          string             `json:"url" bson:"url"`
	Status       string             `json:"status" bson:"status"` // pending, running, completed, failed
	Engine       string             `json:"engine" bson:"engine"` // colly
	PagesScraped int                `json:"pages_scraped" bson:"pages_scraped"`
	Results      []PageResult       `json:"results" bson:"results"`
	CreatedAt    time.Time          `json:"created_at" bson:"created_at"`
	CompletedAt  *time.Time         `json:"completed_at,omitempty" bson:"completed_at,omitempty"`
}

// CacheStats holds Redis cache statistics.
type CacheStats struct {
	Hits   int64 `json:"hits"`
	Misses int64 `json:"misses"`
	Keys   int64 `json:"keys"`
}

// HealthResponse for the health endpoint.
type HealthResponse struct {
	Status  string `json:"status"`
	Redis   string `json:"redis"`
	MongoDB string `json:"mongodb"`
}

// SearchRequest represents a web search query.
type SearchRequest struct {
	Query string `json:"query" binding:"required"`
}

// SearchResult represents a single item from web search results.
type SearchResult struct {
	Title   string `json:"title"`
	Link    string `json:"link"`
	Snippet string `json:"snippet"`
}

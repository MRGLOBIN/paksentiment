package crawler

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"strings"
	"time"

	"github.com/gocolly/colly/v2"
	"github.com/paksentiment/colly-sidecar/cache"
	"github.com/paksentiment/colly-sidecar/models"
)

// Crawler wraps Colly with Redis caching.
type Crawler struct {
	cache *cache.RedisCache
}

// NewCrawler creates a new Crawler instance.
func NewCrawler(rc *cache.RedisCache) *Crawler {
	return &Crawler{cache: rc}
}

// ScrapePage fetches a single page, checking the Redis cache first.
func (c *Crawler) ScrapePage(ctx context.Context, url string, selectors map[string]string) (*models.PageResult, error) {
	// Check cache
	if html, ok := c.cache.Get(ctx, url); ok {
		result := parseHTMLResult(url, html, selectors)
		result.CachedHit = true
		result.Status = 200
		return result, nil
	}

	result, err := c.fetchPage(url, selectors)
	if err != nil {
		return nil, err
	}

	// Cache the raw HTML (we store text, but for cache we store what we got)
	c.cache.Set(ctx, url, result.Text)
	return result, nil
}

// CrawlSite performs a multi-page crawl starting from the given URL.
func (c *Crawler) CrawlSite(ctx context.Context, req models.CrawlRequest) ([]models.PageResult, error) {
	maxDepth := req.MaxDepth
	if maxDepth <= 0 {
		maxDepth = 2
	}
	limit := req.Limit
	if limit <= 0 {
		limit = 20
	}
	delayMs := req.DelayMs
	if delayMs <= 0 {
		delayMs = 100
	}

	var results []models.PageResult
	visited := make(map[string]bool)

	collector := colly.NewCollector(
		colly.MaxDepth(maxDepth),
		colly.Async(true),
	)

	// Set concurrency and delay
	collector.Limit(&colly.LimitRule{
		DomainGlob:  "*",
		Parallelism: 5,
		Delay:       time.Duration(delayMs) * time.Millisecond,
	})

	// Restrict domains if specified
	if len(req.AllowedDomains) > 0 {
		collector.AllowedDomains = req.AllowedDomains
	} else {
		// Auto-restrict to the seed domain
		if parsed, err := url.Parse(req.URL); err == nil {
			collector.AllowedDomains = []string{parsed.Host}
		}
	}

	collector.OnHTML("html", func(e *colly.HTMLElement) {
		pageURL := e.Request.URL.String()

		if visited[pageURL] || len(results) >= limit {
			return
		}
		visited[pageURL] = true

		// Check cache first
		cachedHit := false
		if cached, ok := c.cache.Get(ctx, pageURL); ok {
			cachedHit = true
			_ = cached // we already have the page via Colly, just mark it
		}

		// Extract title
		title := e.ChildText("title")

		// Extract text content (simplified: body text)
		body := e.ChildText("body")
		if len(body) > 5000 {
			body = body[:5000]
		}

		// Extract links
		var links []string
		e.ForEach("a[href]", func(_ int, el *colly.HTMLElement) {
			href := el.Attr("href")
			if href != "" && strings.HasPrefix(href, "http") {
				links = append(links, href)
			}
		})

		result := models.PageResult{
			URL:       pageURL,
			Status:    e.Response.StatusCode,
			Title:     title,
			Text:      strings.TrimSpace(body),
			Links:     links,
			CachedHit: cachedHit,
			ScrapedAt: time.Now(),
		}
		results = append(results, result)

		// Cache the page
		c.cache.Set(ctx, pageURL, body)
	})

	collector.OnHTML("a[href]", func(e *colly.HTMLElement) {
		if len(results) >= limit {
			return
		}
		link := e.Attr("href")
		if link != "" {
			e.Request.Visit(e.Request.AbsoluteURL(link))
		}
	})

	collector.OnError(func(r *colly.Response, err error) {
		log.Printf("[Crawler] Error on %s: %v", r.Request.URL, err)
	})

	collector.OnRequest(func(r *colly.Request) {
		log.Printf("[Crawler] Visiting %s", r.URL)
	})

	err := collector.Visit(req.URL)
	if err != nil {
		return nil, fmt.Errorf("crawl failed: %w", err)
	}

	collector.Wait()
	return results, nil
}

// fetchPage uses Colly to fetch a single page.
func (c *Crawler) fetchPage(pageURL string, selectors map[string]string) (*models.PageResult, error) {
	result := &models.PageResult{
		URL:       pageURL,
		ScrapedAt: time.Now(),
	}

	collector := colly.NewCollector()

	collector.OnHTML("html", func(e *colly.HTMLElement) {
		result.Status = e.Response.StatusCode
		result.Title = e.ChildText("title")

		body := e.ChildText("body")
		if len(body) > 5000 {
			body = body[:5000]
		}
		result.Text = strings.TrimSpace(body)

		// Collect links
		var links []string
		e.ForEach("a[href]", func(_ int, el *colly.HTMLElement) {
			href := el.Attr("href")
			if href != "" && strings.HasPrefix(href, "http") {
				links = append(links, href)
			}
		})
		result.Links = links

		// Apply selectors
		if len(selectors) > 0 {
			result.Extracted = make(map[string]string)
			for name, sel := range selectors {
				result.Extracted[name] = e.ChildText(sel)
			}
		}
	})

	collector.OnError(func(_ *colly.Response, err error) {
		log.Printf("[Crawler] Fetch error %s: %v", pageURL, err)
	})

	err := collector.Visit(pageURL)
	if err != nil {
		return nil, fmt.Errorf("fetch failed for %s: %w", pageURL, err)
	}

	return result, nil
}

// parseHTMLResult creates a PageResult from cached HTML text.
func parseHTMLResult(pageURL, text string, selectors map[string]string) *models.PageResult {
	return &models.PageResult{
		URL:       pageURL,
		Text:      text,
		Links:     []string{},
		ScrapedAt: time.Now(),
	}
}

package crawler

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"strings"
	"sync"
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
		maxDepth = 3 // default crawl depth
	}

	// limit == 0 means "unlimited" (follow all discovered links)
	limit := req.Limit
	unlimited := limit == 0
	if limit < 0 {
		limit = 20 // safety default for negative values
	}

	// When unlimited, apply a hard safety cap to prevent runaway crawling
	const safetyMaxPages = 50
	if unlimited {
		if maxDepth < 3 {
			maxDepth = 3
		}
	}

	log.Printf("[Crawler] CrawlSite starting — url=%s depth=%d limit=%d unlimited=%v", req.URL, maxDepth, limit, unlimited)
	delayMs := req.DelayMs
	if delayMs <= 0 {
		delayMs = 100
	}

	// Mutex-protected shared state for Colly async mode
	var mu sync.Mutex
	var results []models.PageResult
	visited := make(map[string]bool)

	// Helper to check if we've hit the page cap
	hitLimit := func() bool {
		if unlimited {
			return len(results) >= safetyMaxPages
		}
		return len(results) >= limit
	}

	collector := colly.NewCollector(
		colly.MaxDepth(maxDepth),
		colly.Async(true),
		colly.UserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"),
	)
	collector.SetRequestTimeout(15 * time.Second)

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

		mu.Lock()
		if visited[pageURL] || hitLimit() {
			mu.Unlock()
			return
		}
		visited[pageURL] = true
		mu.Unlock()

		// Check cache first
		cachedHit := false
		if cached, ok := c.cache.Get(ctx, pageURL); ok {
			cachedHit = true
			_ = cached // we already have the page via Colly, just mark it
		}

		// Use smart content extraction
		title, cleanText, headlines, method := ExtractContent(e, pageURL)

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
			Text:      cleanText,
			Headlines: headlines,
			Links:     links,
			CachedHit: cachedHit,
			Method:    method,
			Engine:    "colly",
			ScrapedAt: time.Now(),
		}

		mu.Lock()
		results = append(results, result)
		currentCount := len(results)
		mu.Unlock()

		log.Printf("[Crawler] Scraped page %d: %s (%d chars)", currentCount, pageURL, len(cleanText))

		// Cache the cleaned text
		c.cache.Set(ctx, pageURL, cleanText)
	})

	collector.OnHTML("a[href]", func(e *colly.HTMLElement) {
		mu.Lock()
		if hitLimit() {
			mu.Unlock()
			return
		}
		mu.Unlock()

		link := e.Attr("href")
		if link != "" {
			absLink := e.Request.AbsoluteURL(link)
			if absLink != "" {
				mu.Lock()
				alreadyVisited := visited[absLink]
				mu.Unlock()
				if !alreadyVisited {
					e.Request.Visit(absLink)
				}
			}
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

	log.Printf("[Crawler] CrawlSite finished — total pages scraped: %d", len(results))
	return results, nil
}

// fetchPage uses Colly to fetch a single page with smart content extraction.
func (c *Crawler) fetchPage(pageURL string, selectors map[string]string) (*models.PageResult, error) {
	result := &models.PageResult{
		URL:       pageURL,
		Engine:    "colly",
		ScrapedAt: time.Now(),
	}

	collector := colly.NewCollector(
		colly.UserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"),
	)
	collector.SetRequestTimeout(15 * time.Second)

	collector.OnHTML("html", func(e *colly.HTMLElement) {
		result.Status = e.Response.StatusCode

		// Use smart content extraction
		title, cleanText, headlines, method := ExtractContent(e, pageURL)
		
		result.Title = title
		result.Text = cleanText
		result.Headlines = headlines
		result.Method = method

		// Collect links
		var links []string
		e.ForEach("a[href]", func(_ int, el *colly.HTMLElement) {
			href := el.Attr("href")
			if href != "" && strings.HasPrefix(href, "http") {
				links = append(links, href)
			}
		})
		result.Links = links

		// Apply selectors if provided (for backward compatibility)
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

// SearchWeb uses Yahoo Search to search the web and return results.
func (c *Crawler) SearchWeb(ctx context.Context, query string) ([]models.SearchResult, error) {
	var results []models.SearchResult

	searchURL := "https://search.yahoo.com/search?p=" + url.QueryEscape(query)

	collector := colly.NewCollector(
		colly.UserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"),
	)
	collector.SetRequestTimeout(15 * time.Second)

	collector.OnHTML(".algo-sr", func(e *colly.HTMLElement) {
		title := strings.TrimSpace(e.ChildText(".title"))
		link := e.ChildAttr("a", "href")
		snippet := strings.TrimSpace(e.ChildText(".compText"))

		if title != "" && link != "" {
			// Extract actual URL from Yahoo redirect
			ruIndex := strings.Index(link, "/RU=")
			if ruIndex != -1 {
				encodedURL := link[ruIndex+4:]
				rkIndex := strings.Index(encodedURL, "/")
				if rkIndex != -1 {
					encodedURL = encodedURL[:rkIndex]
				}
				if decoded, err := url.QueryUnescape(encodedURL); err == nil {
					link = decoded
				}
			}

			results = append(results, models.SearchResult{
				Title:   title,
				Link:    link,
				Snippet: snippet,
			})
		}
	})

	err := collector.Visit(searchURL)
	if err != nil {
		return nil, fmt.Errorf("web search failed: %w", err)
	}

	return results, nil
}


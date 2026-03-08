package cmd

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/paksentiment/colly-sidecar/cache"
	"github.com/paksentiment/colly-sidecar/crawler"
	"github.com/paksentiment/colly-sidecar/models"
	"github.com/paksentiment/colly-sidecar/sentiment"
	"github.com/paksentiment/colly-sidecar/storage"
	"go.mongodb.org/mongo-driver/bson"
)

// SetupRouter configures the Gin engine and attaches all necessary routes.
func SetupRouter(
	redisCache *cache.RedisCache,
	store *storage.MongoStorage,
	crawl *crawler.Crawler,
	analyzer *sentiment.OllamaAnalyzer,
	fastAPIBase string,
) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// Health check
	r.GET("/health", func(c *gin.Context) {
		ctx := c.Request.Context()

		redisStatus := "ok"
		if err := redisCache.Ping(ctx); err != nil {
			redisStatus = "error: " + err.Error()
		}

		mongoStatus := "ok"
		if err := store.Ping(ctx); err != nil {
			mongoStatus = "error: " + err.Error()
		}

		c.JSON(http.StatusOK, models.HealthResponse{
			Status:  "running",
			Redis:   redisStatus,
			MongoDB: mongoStatus,
		})
	})

	// Cache stats
	r.GET("/cache/stats", func(c *gin.Context) {
		ctx := c.Request.Context()
		hits, misses, keys := redisCache.Stats(ctx)
		c.JSON(http.StatusOK, models.CacheStats{
			Hits:   hits,
			Misses: misses,
			Keys:   keys,
		})
	})

	// Single page scrape (with JS detection + Scrapling fallback)
	r.POST("/scrape", func(c *gin.Context) {
		var req models.ScrapeRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		start := time.Now()
		ctx := c.Request.Context()

		result, err := crawl.ScrapePage(ctx, req.URL, req.Selectors)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Detect if the page is JS-heavy and fallback to Scrapling
		if crawler.IsJSHeavy(result) {
			result.JSHeavy = true
			log.Printf("[Main] JS-heavy detected for %s — attempting Scrapling fallback", req.URL)

			fallback, fbErr := crawler.ScrapeWithScrapling(fastAPIBase, req.URL)
			if fbErr == nil && len(fallback.Text) > len(result.Text) {
				// Scrapling returned better content — use it
				fallback.JSHeavy = true
				fallback.CachedHit = result.CachedHit
				log.Printf("[Main] Scrapling fallback succeeded for %s (%d chars)", req.URL, len(fallback.Text))
				c.JSON(http.StatusOK, models.ScrapeResponse{
					Success: true,
					Result:  *fallback,
					Elapsed: time.Since(start).String(),
				})
				return
			}
			if fbErr != nil {
				log.Printf("[Main] Scrapling fallback failed for %s: %v", req.URL, fbErr)
			}
		}

		c.JSON(http.StatusOK, models.ScrapeResponse{
			Success: true,
			Result:  *result,
			Elapsed: time.Since(start).String(),
		})
	})

	// Multi-page crawl
	r.POST("/crawl", func(c *gin.Context) {
		var req models.CrawlRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		start := time.Now()
		ctx := c.Request.Context()
		sessionID := uuid.New().String()

		// Create job in MongoDB
		job := &models.CrawlJob{
			SessionID: sessionID,
			URL:       req.URL,
			Status:    "running",
			Engine:    "colly",
			CreatedAt: time.Now(),
		}
		if err := store.CreateJob(ctx, job); err != nil {
			log.Printf("[Main] Failed to create job: %v", err)
		}

		// Run the crawl in a separate goroutine
		go func() {
			// Create a detached context so it isn't cancelled when the HTTP request ends
			bgCtx := context.Background()

			results, err := crawl.CrawlSite(bgCtx, req)

			if err != nil {
				log.Printf("[Main] Crawl failed for session %s: %v", sessionID, err)
				store.UpdateJob(bgCtx, sessionID, bson.M{
					"status": "failed",
					"error":  err.Error(),
				})
				return
			}

			// Run sentiment analysis via Ollama on all scraped pages
			if analyzer.IsAvailable() {
				log.Printf("[Main] Running Ollama sentiment analysis on %d pages for session %s", len(results), sessionID)
				analyzer.AnalyzePages(results)
			} else {
				log.Printf("[Main] Ollama unavailable — sentiment will be handled by NestJS for session %s", sessionID)
			}

			// Update job as completed
			now := time.Now()
			store.UpdateJob(bgCtx, sessionID, bson.M{
				"status":        "completed",
				"pages_scraped": len(results),
				"results":       results,
				"completed_at":  now,
			})
			log.Printf("[Main] Crawl completed for session %s, scraped %d pages", sessionID, len(results))
		}()

		// Immediately return 202 Accepted
		c.JSON(http.StatusAccepted, models.CrawlResponse{
			Success:   true,
			SessionID: sessionID,
			Elapsed:   time.Since(start).String(),
		})
	})

	// Retrieve crawl job by session ID
	r.GET("/jobs/:sessionId", func(c *gin.Context) {
		sessionID := c.Param("sessionId")
		ctx := c.Request.Context()

		job, err := store.GetJob(ctx, sessionID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Job not found"})
			return
		}

		c.JSON(http.StatusOK, job)
	})

	// Web search endpoint
	r.POST("/search", func(c *gin.Context) {
		var req models.SearchRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		ctx := c.Request.Context()
		results, err := crawl.SearchWeb(ctx, req.Query)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"results": results,
		})
	})

	return r
}

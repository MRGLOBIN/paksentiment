package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/paksentiment/colly-sidecar/cache"
	"github.com/paksentiment/colly-sidecar/crawler"
	"github.com/paksentiment/colly-sidecar/models"
	"github.com/paksentiment/colly-sidecar/sentiment"
	"github.com/paksentiment/colly-sidecar/storage"
	"go.mongodb.org/mongo-driver/bson"
)

func main() {
	// --- Load .env file ---
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using OS environment variables")
	}

	// --- Configuration from environment ---
	port := getEnv("PORT", "8081")
	redisAddr := getEnv("REDIS_URL", "localhost:6379")
	mongoURI := getEnv("MONGO_URI", "mongodb://localhost:27017")
	mongoDB := getEnv("MONGO_DB", "paksentiment")
	cacheTTLMin := getEnv("CACHE_TTL_MINUTES", "60")
	fastAPIBase := getEnv("FASTAPI_URL", "http://localhost:8000")

	ttl := 60 * time.Minute
	if mins, err := time.ParseDuration(cacheTTLMin + "m"); err == nil {
		ttl = mins
	}

	// --- Initialize dependencies ---
	redisCache, err := cache.NewRedisCache(redisAddr, ttl)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer redisCache.Close()

	store, err := storage.NewMongoStorage(mongoURI, mongoDB)
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	defer store.Close()

	crawl := crawler.NewCrawler(redisCache)

	// --- Initialize Ollama sentiment analyzer ---
	ollamaURL := getEnv("OLLAMA_URL", "https://llm.h4mxa.com")
	ollamaModel := getEnv("OLLAMA_MODEL", "phi3:mini")
	analyzer := sentiment.NewOllamaAnalyzer(ollamaURL, ollamaModel)
	log.Printf("Ollama sentiment analyzer configured: %s (model: %s)", ollamaURL, ollamaModel)

	// --- Gin HTTP Server ---
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
		if isJSHeavy(result) {
			result.JSHeavy = true
			log.Printf("[Main] JS-heavy detected for %s — attempting Scrapling fallback", req.URL)

			fallback, fbErr := scrapeWithScrapling(fastAPIBase, req.URL)
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

	// --- Graceful shutdown ---
	srv := &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}

	go func() {
		log.Printf("🚀 Colly Sidecar running on :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down sidecar...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Shutdown error: %v", err)
	}
	log.Println("Sidecar stopped.")
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// isJSHeavy checks if a Colly-scraped page appears to be JavaScript-rendered
// and would benefit from a headless browser fallback.
func isJSHeavy(r *models.PageResult) bool {
	text := r.Text

	// Heuristic 1: Very little text and very few links
	if len(text) < 100 && len(r.Links) < 10 {
		return true
	}

	// Heuristic 2: JS keywords in the extracted text
	jsKeywords := []string{
		"window.", "function(", "try{", "catch(e)",
		"_DumpException", ".prototype.", "addEventListener",
		"this.gbar_", "wiz_progress",
	}
	jsHits := 0
	sample := text
	if len(sample) > 3000 {
		sample = sample[:3000]
	}
	for _, kw := range jsKeywords {
		jsHits += strings.Count(sample, kw)
	}
	if jsHits > 5 {
		return true
	}

	// Heuristic 3: Almost no meaningful text after cleaning and no headlines
	if len(text) < 200 && len(r.Headlines) == 0 {
		return true
	}

	return false
}

// scrapeWithScrapling calls the Python FastAPI /scrapling/fetch endpoint
// for pages that require a headless browser (JS-heavy sites).
func scrapeWithScrapling(fastAPIBase, pageURL string) (*models.PageResult, error) {
	params := url.Values{}
	params.Set("url", pageURL)
	params.Set("follow_links", "false")
	params.Set("limit", "1")

	reqURL := fmt.Sprintf("%s/scrapling/fetch?%s", fastAPIBase, params.Encode())

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(reqURL)
	if err != nil {
		return nil, fmt.Errorf("scrapling request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("scrapling read body failed: %w", err)
	}

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("scrapling returned status %d", resp.StatusCode)
	}

	var scraplingResp models.ScraplingResponse
	if err := json.Unmarshal(body, &scraplingResp); err != nil {
		return nil, fmt.Errorf("scrapling JSON decode failed: %w", err)
	}

	if len(scraplingResp.Results) == 0 {
		return nil, fmt.Errorf("scrapling returned no results")
	}

	sr := scraplingResp.Results[0]
	result := &models.PageResult{
		URL:       pageURL,
		Status:    resp.StatusCode,
		Title:     sr.Title,
		Text:      sr.Text,
		Links:     sr.Links,
		Engine:    "scrapling",
		Method:    "headless-browser",
		ScrapedAt: time.Now(),
	}

	return result, nil
}

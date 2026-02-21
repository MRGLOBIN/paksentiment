package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/paksentiment/colly-sidecar/cache"
	"github.com/paksentiment/colly-sidecar/crawler"
	"github.com/paksentiment/colly-sidecar/models"
	"github.com/paksentiment/colly-sidecar/storage"
	"go.mongodb.org/mongo-driver/bson"
)

func main() {
	// --- Configuration from environment ---
	port := getEnv("PORT", "8081")
	redisAddr := getEnv("REDIS_URL", "localhost:6379")
	mongoURI := getEnv("MONGO_URI", "mongodb://localhost:27017")
	mongoDB := getEnv("MONGO_DB", "paksentiment")
	cacheTTLMin := getEnv("CACHE_TTL_MINUTES", "60")

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

	// Single page scrape
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

		// Run the crawl
		results, err := crawl.CrawlSite(ctx, req)

		if err != nil {
			store.UpdateJob(ctx, sessionID, bson.M{
				"status": "failed",
			})
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Update job as completed
		now := time.Now()
		store.UpdateJob(ctx, sessionID, bson.M{
			"status":        "completed",
			"pages_scraped": len(results),
			"results":       results,
			"completed_at":  now,
		})

		c.JSON(http.StatusOK, models.CrawlResponse{
			Success:    true,
			SessionID:  sessionID,
			TotalPages: len(results),
			Results:    results,
			Elapsed:    time.Since(start).String(),
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

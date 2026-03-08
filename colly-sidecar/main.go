package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/paksentiment/colly-sidecar/cache"
	"github.com/paksentiment/colly-sidecar/cmd"
	"github.com/paksentiment/colly-sidecar/crawler"
	"github.com/paksentiment/colly-sidecar/sentiment"
	"github.com/paksentiment/colly-sidecar/storage"
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
	r := cmd.SetupRouter(redisCache, store, crawl, analyzer, fastAPIBase)

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



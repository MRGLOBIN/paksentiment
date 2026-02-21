package cache

import (
	"context"
	"crypto/md5"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisCache wraps a Redis client for page caching and dedup.
type RedisCache struct {
	client *redis.Client
	ttl    time.Duration
}

// NewRedisCache creates a new Redis cache connection.
func NewRedisCache(addr string, ttl time.Duration) (*RedisCache, error) {
	client := redis.NewClient(&redis.Options{
		Addr:         addr,
		Password:     "",
		DB:           0,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis connection failed: %w", err)
	}

	log.Printf("[Redis] Connected to %s (TTL: %s)", addr, ttl)
	return &RedisCache{client: client, ttl: ttl}, nil
}

// urlKey returns a cache key for a URL.
func urlKey(url string) string {
	hash := md5.Sum([]byte(url))
	return fmt.Sprintf("scrape:page:%x", hash)
}

// lockKey returns a lock key for a URL.
func lockKey(url string) string {
	hash := md5.Sum([]byte(url))
	return fmt.Sprintf("scrape:lock:%x", hash)
}

// Get retrieves cached HTML for a URL. Returns empty string on miss.
func (rc *RedisCache) Get(ctx context.Context, url string) (string, bool) {
	val, err := rc.client.Get(ctx, urlKey(url)).Result()
	if err == redis.Nil {
		rc.client.Incr(ctx, "scrape:stats:misses")
		return "", false
	}
	if err != nil {
		return "", false
	}
	rc.client.Incr(ctx, "scrape:stats:hits")
	return val, true
}

// Set stores HTML content for a URL with the configured TTL.
func (rc *RedisCache) Set(ctx context.Context, url string, html string) error {
	return rc.client.Set(ctx, urlKey(url), html, rc.ttl).Err()
}

// AcquireLock tries to acquire a crawl lock for a URL (5 min TTL).
func (rc *RedisCache) AcquireLock(ctx context.Context, url string) bool {
	ok, err := rc.client.SetNX(ctx, lockKey(url), "1", 5*time.Minute).Result()
	if err != nil {
		return false
	}
	return ok
}

// ReleaseLock releases the crawl lock for a URL.
func (rc *RedisCache) ReleaseLock(ctx context.Context, url string) {
	rc.client.Del(ctx, lockKey(url))
}

// Stats returns cache hit/miss counters and total keys.
func (rc *RedisCache) Stats(ctx context.Context) (hits, misses, keys int64) {
	h, _ := rc.client.Get(ctx, "scrape:stats:hits").Int64()
	m, _ := rc.client.Get(ctx, "scrape:stats:misses").Int64()
	k, _ := rc.client.DBSize(ctx).Result()
	return h, m, k
}

// Ping checks Redis connectivity.
func (rc *RedisCache) Ping(ctx context.Context) error {
	return rc.client.Ping(ctx).Err()
}

// Close closes the Redis connection.
func (rc *RedisCache) Close() error {
	return rc.client.Close()
}

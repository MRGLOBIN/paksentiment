package storage

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/paksentiment/colly-sidecar/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// MongoStorage wraps the MongoDB client for crawl job persistence.
type MongoStorage struct {
	client   *mongo.Client
	database *mongo.Database
	jobs     *mongo.Collection
}

// NewMongoStorage connects to MongoDB and initialises the crawl_jobs collection.
func NewMongoStorage(uri, dbName string) (*MongoStorage, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return nil, fmt.Errorf("mongo connect: %w", err)
	}

	if err := client.Ping(ctx, nil); err != nil {
		return nil, fmt.Errorf("mongo ping: %w", err)
	}

	db := client.Database(dbName)
	log.Printf("[MongoDB] Connected to %s/%s", uri, dbName)

	return &MongoStorage{
		client:   client,
		database: db,
		jobs:     db.Collection("crawl_jobs"),
	}, nil
}

// CreateJob inserts a new crawl job.
func (ms *MongoStorage) CreateJob(ctx context.Context, job *models.CrawlJob) error {
	_, err := ms.jobs.InsertOne(ctx, job)
	return err
}

// UpdateJob updates an existing crawl job by session ID.
func (ms *MongoStorage) UpdateJob(ctx context.Context, sessionID string, update bson.M) error {
	_, err := ms.jobs.UpdateOne(
		ctx,
		bson.M{"session_id": sessionID},
		bson.M{"$set": update},
	)
	return err
}

// GetJob retrieves a crawl job by session ID.
func (ms *MongoStorage) GetJob(ctx context.Context, sessionID string) (*models.CrawlJob, error) {
	var job models.CrawlJob
	err := ms.jobs.FindOne(ctx, bson.M{"session_id": sessionID}).Decode(&job)
	if err != nil {
		return nil, err
	}
	return &job, nil
}

// Ping checks MongoDB connectivity.
func (ms *MongoStorage) Ping(ctx context.Context) error {
	return ms.client.Ping(ctx, nil)
}

// Close disconnects from MongoDB.
func (ms *MongoStorage) Close() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return ms.client.Disconnect(ctx)
}

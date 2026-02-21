# Database Technology & Schema Proposal

## 1. Technology Decision: SQL vs MongoDB

When dealing with web scraping and data extraction, the structure of the data can be highly variable. We need to store articles from the Go Sidecar, dynamically rendered pages from the Python Gateway, and eventually social media posts (Reddit/Twitter).

### SQL (PostgreSQL, MySQL)
*   **Pros:** Strong data integrity, perfect for highly structured relationships (e.g., Users, Roles, Permissions).
*   **Cons:** Rigid schema. Whenever we add a new scraper (e.g., YouTube comments vs news articles), we have to write database migrations to add new columns, which slows down development and creates sparse tables (lots of `NULL` fields).

### MongoDB (NoSQL)
*   **Pros:** Document-oriented (BSON). Extremely flexible schema. We can store an article with a list of `headlines` and a social media post with `retweet_count` in the same collection without altering the database schema. It also natively supports horizontal scaling for large datasets.
*   **Cons:** Lack of complex join capabilities (but we rarely need complex joins for scraped text analysis).

### 🏆 Verdict: MongoDB
**Recommendation:** We should definitely use **MongoDB**. 
1.  **Flexibility:** It perfectly handles the heterogeneous data produced by both the Colly (Go) and Scrapling (Python) services.
2.  **Consistency:** The project architecture (`docs/knowledge_base/architecture.md`) already specifies MongoDB for user and job management, so sticking with it for the actual data prevents operational overhead (we don't need to run a Postgres DB *and* a Mongo DB).

---

## 2. Proposed Data Schema (`ScrapedDocument`)

We should create a unified collection (e.g., `scraped_documents`) that can hold any type of scraped data. The key is to have standard top-level fields for routing/analysis, and a flexible `metadata` object for source-specific details.

Here is the proposed document structure (JSON/BSON format):

```json
{
  "_id": "ObjectId(...) ",
  "job_id": "ObjectId(...) ",           // Links back to the CrawlJob that generated this (if applicable)
  
  // --- Core Routing & Identity ---
  "url": "https://news.google.com/...", // The source URL
  "domain": "news.google.com",          // Extracted domain for easy filtering/aggregation
  "source_engine": "colly",             // Which engine scraped it: "colly", "scrapling", "reddit_api", etc.
  "content_type": "article",            // Broad category: "article", "social_post", "forum_thread"
  
  // --- Extracted Data ---
  "title": "Google News Top Stories",   // Page title
  "clean_text": "Medical board examines... Pakistan condemns...", // The EXACT output from Readability/jusText
  
  // --- Flexible Metadata ---
  // This object changes depending on the source!
  "metadata": {
    "headlines": ["Headline 1", "Headline 2"], // specific to Colly Go news scrapes
    "links_found": 4,                          
    "author": "John Doe",                      // If we extract an author
    "publish_date": "2026-02-19T00:00:00Z"     // If we extract a date
  },
  
  // --- AI Analysis (To be populated later) ---
  "sentiment": {
    "label": "neutral",                 // "positive", "negative", "neutral"
    "score": 0.12,                      // Floating point confidence score
    "analyzed_at": "2026-02-19T13:00:00Z"
  },
  
  "created_at": "2026-02-19T12:45:00Z", // When it was scraped
  "updated_at": "2026-02-19T12:45:00Z"
}
```

### Why this structure works:
1.  **Uniformity for LLMs:** When we pass this to an AI for sentiment analysis, the AI only needs to look at `title` and `clean_text`. It doesn't care if it came from Go or Python.
2.  **Queryability:** We can easily query: *"Get me all documents where `domain` == 'news.google.com' and `sentiment.label` == 'negative'"*.
3.  **Future-Proof:** If we add a Twitter scraper, we just store it here with `content_type: "social_post"` and put `"retweets": 500` inside the `metadata` object. No schema changes required.

## Next Steps
If you approve of MongoDB and this JSON structure, we can proceed to implement the Mongoose (NestJS) / Motor (Python) / mgm (Go) models for the respective services.

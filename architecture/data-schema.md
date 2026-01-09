# PakSentiment Data Architecture & Schema

## 1. High-Level Architecture
PakSentiment utilizes a **Hybrid Database Architecture** to leverage the strengths of both Relational (SQL) and Document (NoSQL) databases.

-   **PostgreSQL (Relational)**: Used for structured, high-integrity data such as User Identity, Authentication, Access Control, and Audit Logging.
-   **MongoDB (Document)**: Used for high-volume, unstructured, and diverse data such as Social Media Posts (Raw Data), Sentiment Analysis Results, and Caching.

## 2. Data Flow Pipeline

### 2.1 Ingestion Phase
1.  **User Request**: User initiates a search/analysis query via the Client (e.g., "Analyze 'Bitcoin' on Twitter").
2.  **Controller Layer**: `RawDataController` receives the request.
3.  **Service Layer**: `RawDataService` acts as a Facade, delegating to specific **Providers**:
    -   `RedditProvider`
    -   `TwitterProvider`
    -   `ScraplingProvider` (Web)
    -   `CommonCrawlProvider`
4.  **Gateway Integration**: Providers call the **Data Gateway (FastAPI)**, which handles the actual scraping/API interaction.
5.  **Response**: Raw JSON data (variable structure) is returned to the Main Server.

### 2.2 Storage Phase (Raw)
6.  **Raw Storage**: `PostStorageService` saves the raw JSON immediately to **MongoDB (`raw_posts`)**.
    -   **Identifier**: `sourceId` (Original unique ID from platform, e.g., Tweet ID).
    -   **Data**: Full original content, author info, timestamps, and platform metadata.

### 2.3 Processing Phase
7.  **Processing**: The system performs Sentiment Analysis and Translation (via Gateway or Local Services).
8.  **Processed Storage**: Results are saved to **MongoDB (`processed_posts`)**.
    -   **Link**: `rawPostSourceId` links back to the Raw Post.
    -   **Insights**: Cleaned text, Translated text, Sentiment Label (Positive/Negative/Neutral), Confidence Score.

### 2.4 Session Snapshot Phase
9.  **Session Creation**: To ensure historical consistency, `RawDataService` creates an **`AnalysisSession`** in **MongoDB**.
    -   **Data**: `sessionId`, `query`, `userId`, `source`, and a list of `postIds` (Snapshot of exactly what was fetched).
    -   **Smart Search**: Aggregates `postIds` from multiple providers into a single session.
10. **Audit Log**: `ActivityService` logs the action to **PostgreSQL (`user_activity`)**.

### 2.5 Retrieval Phase
11. **View History**: When a user clicks "View Past Results":
    -   Frontend requests `/session/:sessionId`.
    -   Backend retrieves schema from `analysis_sessions`.
    -   Backend fetches **Both** `RawPost` (for content/author) and `ProcessedPost` (for sentiment) using the stored IDs.
    -   Data is merged and returned to Frontend.

## 3. Database Schema

### 3.1 PostgreSQL (Structural Domain)

#### `users`
*Core identity management.*
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | SERIAL (PK) | Unique User ID |
| `email` | VARCHAR | User Email (Unique) |
| `password` | VARCHAR | Hashed Password |
| `full_name` | VARCHAR | Display Name |
| `role` | VARCHAR | ADMIN, USER, ANALYST |
| `created_at` | TIMESTAMP | Registration Time |

#### `user_activity`
*Audit trail for all user actions.*
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | SERIAL (PK) | Log ID |
| `user_id` | INT (FK) | Link to `users` |
| `action` | VARCHAR | e.g., SEARCH_REDDIT, LOGIN |
| `details` | JSONB | Request params + `sessionId` |
| `ip_address` | VARCHAR | User IP |
| `created_at` | TIMESTAMP | Time of action |

#### `api_keys`
*Management for external API access.*
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | SERIAL (PK) | Key ID |
| `user_id` | INT (FK) | Owner |
| `key_hash` | VARCHAR | Secure hash of key |
| `scopes` | ARRAY | Access permissions |

### 3.2 MongoDB (Data Domain)

#### `raw_posts`
*The "Lake" of raw data. Flexible schema.*
```json
{
  "_id": "ObjectId",
  "platform": "String (reddit | twitter | youtube | scrapling)",
  "sourceId": "String (Unique on Platform)", 
  "content": "String (Raw Text/HTML)",
  "author": "String",
  "timestamp": "Date (Original Creation Time)",
  "fetchedAt": "Date (Ingestion Time)",
  "metadata": {
    "url": "String",
    "likes": "Number",
    "raw_json": "Object (Full source payload)"
  }
}
```

#### `processed_posts`
*Refined insights derived from raw data.*
```json
{
  "_id": "ObjectId",
  "rawPostSourceId": "String (Link to raw_posts.sourceId)", 
  "platform": "String",
  "cleanText": "String (Normalized)",
  "translatedText": "String (Urdu -> English)",
  "language": "String (e.g., 'ur', 'en')",
  "sentiment": "String (Positive, Negative, Neutral)",
  "confidence": "Number (0.0 - 1.0)",
  "keywords": ["String"],
  "processedAt": "Date",
  "metadata": {
    "summary": "String (AI Generated Summary)"
  }
}
```

#### `analysis_sessions`
*Snapshots of analysis runs.*
```json
{
  "_id": "ObjectId",
  "sessionId": "String (UUID)",
  "userId": "Number (Link to Postgres users.id)",
  "query": "String",
  "source": "String",
  "postIds": ["String"] (Array of sourceId),
  "createdAt": "Date"
}
```

## 4. Decision Rationale

| Decision | Rationale |
| :--- | :--- |
| **Why Postgres for Auth?** | Strict ACID compliance is required for user accounts and payments. Relationships (User -> Activity -> Config) are well-defined and stable. |
| **Why Mongo for Posts?** | Social media data is messy and inconsistent. Reddit has upvotes, Twitter has retweets, Web has HTML. JSON storage allows saving *everything* without rigid schema migrations. |
| **Why Split Raw/Processed?** | Allows re-processing. If we update our Sentiment Model, we can re-run it against `raw_posts` without needing to re-scrape the internet. |
| **Why Session Snapshots?** | Live search results change. A "History" feature must show *exactly* what the user saw at that time for audit/verification purposes. |

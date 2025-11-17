--- fastapi_ingestion_design.md ---
# FastAPI Data Source Layer — Design

## 1. Purpose
FastAPI is responsible for collecting real-time public data from external sources and sending it to the Nest.js server.

---

## 2. Responsibilities  
### ✔ Scraping + crawling  
### ✔ Source adapters  
### ✔ Scheduling  
### ✔ Deduplication  
### ✔ Pushing data to Redis streams  
### ✔ Sending batches to Nest.js ingestion API  

---

## 3. Folder Structure  
/app
/sources
/twitter
/reddit
/news
/schemas
/services
/workers
main.py

yaml
Copy code

---

## 4. Worker Pipeline  
1. Fetch data  
2. Normalize  
3. Deduplicate  
4. Push to Redis → `stream:incoming_data`  
5. Notify Nest.js  

---

## 5. Example Data Contract (to Nest.js)
```json
{
  "source": "twitter",
  "text": "Example post",
  "lang": "ps",
  "timestamp": "2025-01-12T10:00:00"
}
6. Error Handling
Retry workers

Log failed scrapes

Graceful backoff

7. Security
No user tokens stored

Only public data fetch

API keys for external APIs

8. Extensibility
To add a new source:

Create new folder in /sources

Add fetch method

Add normalizer

Connect worker

--- END FILE ---

yaml
Copy code

---


--- backend_design.md ---
# Nest.js Backend Design (Core Server)

## 1. Structure
/src
/modules
/ingestion
/pipeline
/sentiment
/translation
/topics
/alerts
/dashboard
/common
/database

yaml
Copy code

---

## 2. Module Responsibilities

### ingestion.module.ts  
- Pulls new items from Redis  
- Normalizes data  
- Stores in raw_data table  
- Sends to AI pipeline  

### pipeline.module.ts  
- Sends input to Python AI  
- Receives processed results  
- Stores processed_data  

### sentiment.module.ts  
- REST API for sentiment queries  
- Provides statistical aggregations  
- Connects with database  

### translation.module.ts  
- Pashto → Urdu translation  
- Stores history + caching  

### topics.module.ts  
- Topic classification results  
- Category mapping  
- Trend aggregation  

### alerts.module.ts  
- Keyword monitoring  
- Periodic checks  
- WebSocket push notifications  

### dashboard.module.ts  
- Provides all metrics for the frontend  
- Filters, time ranges, KPIs  

---

## 3. Services  
- Follow SOLID  
- Only one responsibility  
- Keep business logic in services  
- No direct DB access in controllers  

---

## 4. API Endpoints (examples)

### GET /sentiment/:id  
Returns sentiment result for a document.

### POST /ingest  
Receives batch of scraped posts.

### GET /dashboard/overview  
Returns all dashboard stats.

---

## 5. Integration with Python  
- HTTP micro-requests  
- Fallback to queue-based if needed  
- JSON contracts defined in `/docs/sentiment_pipeline.md`

---

## 6. Error Handling  
- Use Nest.js exception filters  
- Consistent error shape  
- No leaking Python stack traces  

---

## 7. Security  
- API keys  
- Request validation  
- Rate limiting  
- HTTPS-only  

--- END FILE ---
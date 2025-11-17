--- architecture.md ---
# PakSentiment Architecture

## 1. High-Level System Diagram (Text Form)

User → Frontend → Nest.js API → PostgreSQL  
                       ↓  
                  Python AI Layer  
                       ↓  
            FastAPI Ingestion Server → Social Sources

---

## 2. Modules

### A. FastAPI Ingestion Layer  
- Scrapers  
- Source adapters  
- Schedule-based workers  
- Output → Redis streams → Nest.js ingestion endpoint  

### B. Nest.js Core Backend  
- Modules by domain  
- Services for business logic  
- Database repositories  
- AI pipeline orchestration  
- Event processor for ingestion  
- REST + WebSocket APIs  

### C. Python AI Layer  
- Sentiment model pipeline  
- Translation (Pashto→Urdu)  
- Topic modeling  
- Summarization  
- Embedding generation  
- Simple inference server  

### D. Frontend  
- Modular React components  
- SCSS modules  
- Dashboard visualizations  
- Charts + Filters + Search  

---

## 3. Database Architecture  
### PostgreSQL  
- `raw_data`  
- `processed_data`  
- `sentiment_results`  
- `translation_history`  
- `topics`  
- `alerts`  

### Redis  
- Data ingestion streams  
- Background tasks  
- Real-time events  

---

## 4. Data Flow

### Step 1 — Ingestion  
FastAPI fetches data → pushes to Redis → Nest.js pulls & stores → sends to Python AI.

### Step 2 — Processing  
Python runs translation → sentiment → topic modeling → returns results.

### Step 3 — Serving  
Nest.js exposes results through REST + WebSocket APIs → frontend renders dashboards.

---

## 5. Design Principles  
- Layered clean architecture  
- Strict SOLID  
- Modularization by feature, not file type  
- Dependency inversion between Python ↔ Node  
- Plugin-based source architecture  
- Scalability with microservices  

--- END FILE ---

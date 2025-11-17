--- paksentiment_spec.md ---
# PakSentiment — Comprehensive System Specification

## 1. Overview  
PakSentiment is an end-to-end social data analysis system that collects publicly available data (Twitter, Reddit, Facebook public pages, news RSS feeds, etc.) and performs sentiment classification, topic extraction, and translation for Pakistan’s local languages. The system also powers dashboards, reports, and alerting tools for organizations and researchers.

The system is divided into three layers:
1. **Data Source Layer (FastAPI server)**  
2. **Core Backend (Nest.js)**  
3. **AI & ML Model Layer (Python workers + LLM APIs)**  
4. **Frontend Web Dashboard**

---

## 2. High-Level Features
- Multi-source data ingestion
- Pashto → Urdu NMT translation
- Sentiment analysis using LLM + custom pipelines
- Topic modeling + summarization
- Real-time keyword monitoring
- Dashboard visualization
- Secure, modular API architecture
- Extensible plugin-style design for adding new sources or models

---

## 3. Architecture Summary  
- **FastAPI** handles data ingestion and scraping workers.  
- **Nest.js** handles business logic, storage, APIs, client communication.  
- **Python** handles ML models, lightweight NMT, embeddings, and LLM orchestration.  
- **Database:** PostgreSQL + Redis  
- **Frontend:** React + SCSS modules  
- **Deployment:** Docker + microservice structure  
- **Design Principles:** SOLID, clean architecture, modular OOP.

---

## 4. Users  
Everyone is treated as a "user"; no role-based access control for now.

---

## 5. Functional Requirements  
- FR1: Fetch data from social platforms  
- FR2: Store raw and processed data  
- FR3: Translate local languages → Urdu  
- FR4: Perform sentiment analysis  
- FR5: Perform topic classification  
- FR6: Generate conversation summaries  
- FR7: Expose APIs via Nest.js  
- FR8: Provide data visualization frontend  
- FR9: Generate alerts for specific keywords  
- FR10: Allow AI-powered queries on aggregated data  

---

## 6. Non-Functional Requirements  
- **Security:** data encryption, secure APIs, OWASP compliance  
- **Extensibility:** Easily add new data sources or models  
- **Performance:** Efficient ingestion + low-latency analysis  
- **Monitoring:** real-time system performance  
- **Scalability:** horizontal scaling via microservices  

---

## 7. Technology Stack  
### Core  
- Nest.js  
- FastAPI  
- Python (NLP + ML)  
- React with SCSS Modules  

### Infrastructure  
- PostgreSQL  
- Redis Streams  
- Docker  
- Nginx  

---

## 8. Future Extensions  
- Browser plugin for data collection  
- Multilingual emotion classification  
- Generative political trend analysis  
- Model fine-tuning with local datasets  

--- END FILE ---

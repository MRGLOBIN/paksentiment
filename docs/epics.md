PakSentiment — Epics
Epic 1 — Data Ingestion

Goal: Collect data from multiple public sources.
Tasks: Scrapers, workers, Redis streams, APIs.

Epic 2 — AI Processing

Goal: Analyze sentiment, translation, topics.
Tasks: Python pipelines, inference server, contracts.

Epic 3 — Backend APIs

Goal: Provide stable API for frontend + clients.
Tasks: Implement Nest modules, controllers, services.

Epic 4 — Frontend Dashboard

Goal: Provide a usable interface.
Tasks: UI components, charts, real-time feed.

Epic 5 — Alerts & Monitoring

Goal: Monitor keywords + notify users.
Tasks: Alert rules, WebSocket push updates.

Epic 6 — Reporting & Analytics

Goal: Provide summaries and insights.
Tasks: API endpoints, charts, export.

Epic 7 — Deployment & Infra

Goal: Deploy microservices.
Tasks: Docker, Nginx, GitHub CI/CD.

--- END FILE ---


---

# ✅ **9. requirements.md**



--- requirements.md ---

System Requirements Specification (SRS)
1. Functional Requirements
FR1: Data Ingestion

System should collect data from multiple public platforms.

FR2: Data Storage

System should store raw and processed data.

FR3: Translation

System should translate local-language content into Urdu.

FR4: Sentiment Analysis

System should classify sentiment accurately.

FR5: Topic Modeling

System should categorize topics.

FR6: Summaries

System should generate summaries of conversations.

FR7: API Layer

Provide REST APIs for frontend + B2B clients.

FR8: Frontend

Dashboard should visualize metrics and insights.

FR9: Alerts

Notify users when keywords appear.

FR10: Monitoring

Track system performance.

2. Non-Functional Requirements

Security

Extensibility

Performance

Monitoring

Scalability

3. Constraints

SOLID + OOP principles

Modular architecture

Real-time processing

No role-based access

--- END FILE ---
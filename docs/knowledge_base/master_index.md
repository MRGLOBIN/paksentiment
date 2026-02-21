# PakSentiment — Master Knowledge Base

Welcome to the **PakSentiment** project knowledge base. This documentation is designed to provide a complete understanding of the system's architecture, components, and development milestones for developers and AI agents alike.

## 📚 Documentation Index

### 1. [System Architecture](architecture.md)
   - High-level design (NestJS, Go Sidecar, Python Gateway).
   - Data flow diagrams.
   - Database schema overview (MongoDB & Redis).

### 2. [Crawler Ecosystem](crawler_internals.md)
   - **Go Sidecar**: High-performance crawling with Colly & Readability (Mozilla).
   - **Python Gateway**: Headless scraping with Scrapling & jusText.
   - **Hybrid Strategy**: How the system decides between static vs. dynamic scraping.

### 3. [Setup & Deployment](setup_guide.md)
   - Prerequisites (Go, Python, Node.js, Docker).
   - Environment variables.
   - Running the services (`start_servers.sh`).

### 4. [API Reference](api_reference.md)
   - Main Server Endpoints (NestJS).
   - Internal Service APIs (Go & Python).

### 5. [Development History & Decisions](history_context.md)
   - Why we moved to a Go Sidecar.
   - The "Smart Content Extraction" initiative (Readability/jusText).
   - Authentication & Security evolution.

---
*Created for the "Antigravity Age" — Designed to be machine-readable and context-rich.*

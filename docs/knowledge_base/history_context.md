# Project History & Key Decisions

Understanding the *why* behind the architecture is just as important as the *how*. This document traces the evolution of PakSentiment.

## Phase 1: The Python Monolith
Initially, the project was a single Python service using `BeautifulSoup` and `Selenium`.
- **Pros**: Easy to write, rich ecosystem.
- **Cons**: Slow, memory-heavy, difficult to scale concurrently.

## Phase 2: The Microservices Split
To improve performance, we decoupled the fetching logic from the business logic.
- **Main Server (NestJS)**: became the brain, handling auth, user sessions, and job orchestration.
- **Data Gateway (FastAPI)**: remained to handle complex, JS-heavy scraping (`Scrapling`).

## Phase 3: The Go Sidecar (High Performance)
We noticed 90% of our targets were static news sites or blogs. Python was overkill.
- **Decision**: Introduce a Go service using `Colly`.
- **Impact**: 
    - Concurrency increased from ~5 pages/sec to ~100+ pages/sec.
    - Memory usage dropped significantly.
    - Go became the default engine; Python is now only invoked for "hard" targets.

## Phase 4: Smart Content Extraction (The "Antigravity" Era)
As we scaled to generic websites, simple CSS selectors broke.
- **Problem**: Every site has a different layout (`div.content` vs `article.body` vs `section#main`).
- **Solution**: 
    1. **Readability (Go)**: We integrated Mozilla's Reader View algorithm into the Go sidecar. It automatically finds the "meat" of the page.
    2. **jusText (Python)**: For the remaining dynamic sites, we added `jusText` to algorithmically trip boilerplate (ads, navs).

## Future Roadmap (Gemini 3 & Beyond)
- **AI Analysis**: Feeding the clean extracted text directly into LLMs for sentiment classification (started, but needs scaling).
- **Distributed Crawling**: Since we use Redis for the queue, we can scale the Go Sidecar horizontally across multiple machines.

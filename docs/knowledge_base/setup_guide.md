# Setup & Deployment Guide

This guide covers how to set up the PakSentiment ecosystem from scratch on a local development machine (macOS/Linux).

## 1. Prerequisites

Ensure you have the following installed:

- **Node.js** (v18+) & **npm**
- **Go** (v1.23+)
- **Python** (v3.12+)
- **Docker** (optional, recommended for DBs)
- **MongoDB** (running locally on port 27017)
- **Redis** (running locally on port 6379)

### Quick DB Setup (using Homebrew)
```bash
brew install mongodb-community
brew services start mongodb-community

brew install redis
brew services start redis
```

## 2. Environment Configuration

You must create `.env` files for each service.

### Main Server (`/main-server/.env`)
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/paksentiment
JWT_SECRET=your_super_secret_key
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
COLLY_SIDECAR_URL=http://localhost:8081
PYTHON_GATEWAY_URL=http://localhost:8000
```

### Go Sidecar (`/colly-sidecar/.env` - optional, defaults exist)
```env
PORT=8081
REDIS_URL=localhost:6379
MONGO_URI=mongodb://localhost:27017
MONGO_DB=paksentiment
```

### Python Gateway (`/new PakSentiment-data-gateway/.env`)
```env
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...
TWITTER_BEARER_TOKEN=...
YOUTUBE_API_KEY=...
```

## 3. Installation

Run these commands in the respective directories to install dependencies:

```bash
# Frontend
cd frontend && npm install

# Main Server
cd main-server && npm install

# Go Sidecar
cd colly-sidecar && go mod download

# Python Gateway
cd "new PakSentiment-data-gateway"
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# OR if using uv/poetry, follow their setup
```

## 4. Running the System

We provide a master script to start all services in the background:

```bash
./start_servers.sh
```

**What this does:**
- Starts Frontend on **:3001**
- Starts NestJS API on **:3000**
- Starts Python Gateway on **:8000**
- Starts Go Sidecar on **:8081**

Output logs will be interleaved in the terminal. Press `Ctrl+C` to shut down all services gracefully.

## Troubleshooting

- **Go build errors?** Ensure your `GOPATH` is set correctly or run `go build .` inside `colly-sidecar` to verify.
- **Python import errors?** Ensure you are in the correct virtual environment (`.venv`).
- **Connection refused?** Check if MongoDB and Redis are running (`brew services list`).

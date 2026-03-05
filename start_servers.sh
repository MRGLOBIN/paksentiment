#!/bin/bash

# Function to handle script shutdown
cleanup() {
    echo ""
    echo "🛑 Shutting down all servers..."
    # Kill all child processes in the current process group
    kill 0
    exit
}

# Trap SIGINT (Ctrl+C) and call cleanup
trap cleanup SIGINT

echo "Starting PakSentiment Ecosystem..."
echo "======================================="

echo "🚀 Starting PakSentiment Ecosystem..."
echo "======================================="


# 1. Start Frontend
echo "💻 Starting Frontend (Next.js)..."
(cd "frontend" && npm run dev) &

# 2. Start Main Server
echo "🧠 Starting Main Server (NestJS)..."
(cd "main-server" && npm run start:dev) &

# 3. Start Data Gateway
echo "🐍 Starting Data Gateway (FastAPI)..."
(cd "new PakSentiment-data-gateway" && ./.venv/bin/fastapi dev main.py) &

# 4. Start Dedicated Scrapling Server
echo "🌐 Starting Scrapling Fallback Server..."
(cd "new PakSentiment-data-gateway" && ./.venv/bin/fastapi run scrapling_server.py --port 8002) &

# 5. Start Go Colly Sidecar (Pointed to Scrapling Server for Fallbacks)
echo "🔧 Starting Go Colly Sidecar..."
(cd "colly-sidecar" && FASTAPI_URL=http://localhost:8002 go run main.go) &

echo "======================================="
echo "✅ All servers started!"
echo "   Frontend:       http://localhost:3001"
echo "   NestJS:         http://localhost:3000"
echo "   FastAPI:        http://localhost:8000"
echo "   Scrapling:      http://localhost:8002"
echo "   Colly Sidecar:  http://localhost:8081"
echo "Press Ctrl+C to stop everything."
echo "======================================="

# Wait indefinitely for background jobs
wait

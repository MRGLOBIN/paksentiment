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

echo "======================================="
echo "✅ All servers started!"
echo "Press Ctrl+C to stop everything."
echo "======================================="

# Wait indefinitely for background jobs
wait

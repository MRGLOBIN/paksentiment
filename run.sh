#!/bin/bash

echo "==================================="
echo "  Starting PakSentiment Suite"
echo "==================================="

# Function to gracefully kill all background processes on exit
cleanup() {
    echo ""
    echo "Stopping all services..."
    kill $(jobs -p) 2>/dev/null
    wait $(jobs -p) 2>/dev/null
    echo "All services stopped."
    exit
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

ROOT_DIR=$(pwd)

echo "--> Starting Colly Sidecar (Port 8081)..."
cd "$ROOT_DIR/colly-sidecar"
PORT=8081 ./bin/colly-sidecar &
SIDE_PID=$!

echo "--> Starting Data Gateway (Port 8000)..."
cd "$ROOT_DIR/new PakSentiment-data-gateway"
export UV_CACHE_DIR=/tmp/uvcache
export TOKENIZERS_PARALLELISM=false
mkdir -p /tmp/uvcache
uv run uvicorn main:app --host 0.0.0.0 --port 8000 &
GATEWAY_PID=$!

echo "--> Starting Main Server (NestJS on Port 3000)..."
echo "    Waiting for Data Gateway to finish loading..."
for i in $(seq 1 30); do
    if curl -sf http://localhost:8000/docs > /dev/null 2>&1; then
        echo "    ✅ Data Gateway is ready!"
        break
    fi
    sleep 1
done
cd "$ROOT_DIR/main-server"
PORT=3000 npm run start:prod &
MAIN_PID=$!

echo "--> Starting Frontend (Next.js on Port 3001)..."
cd "$ROOT_DIR/frontend"
npm run start &
FRONT_PID=$!

echo "==================================="
echo "  All services are booting up! "
echo "  Press Ctrl+C to stop everything."
echo "==================================="

# Wait for all background processes infinitely
wait

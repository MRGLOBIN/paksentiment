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
export PORT=8081
./bin/colly-sidecar &
SIDE_PID=$!

echo "--> Starting Data Gateway (Port 8000)..."
cd "$ROOT_DIR/new PakSentiment-data-gateway"
uv run uvicorn main:app --host 0.0.0.0 --port 8000 &
GATEWAY_PID=$!

echo "--> Starting Main Server (NestJS)..."
cd "$ROOT_DIR/main-server"
npm run start:prod &
MAIN_PID=$!

echo "--> Starting Frontend (Next.js)..."
cd "$ROOT_DIR/frontend"
npm run start &
FRONT_PID=$!

echo "==================================="
echo "  All services are booting up! "
echo "  Press Ctrl+C to stop everything."
echo "==================================="

# Wait for all background processes infinitely
wait

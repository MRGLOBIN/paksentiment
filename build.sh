#!/bin/bash
set -e

echo "==================================="
echo "  Building PakSentiment Suite"
echo "==================================="

ROOT_DIR=$(pwd)

echo "[1/4] Building Main Server (NestJS)..."
cd "$ROOT_DIR/main-server"
export TMPDIR=/tmp
npm install
npm run build

echo "[2/4] Building Frontend (Next.js)..."
cd "$ROOT_DIR/frontend"
npm install
npm run build

echo "[3/4] Preparing Data Gateway (FastAPI)..."
cd "$ROOT_DIR/new PakSentiment-data-gateway"
echo "Syncing dependencies with UV..."
export UV_CACHE_DIR=/tmp/uvcache
mkdir -p /tmp/uvcache
uv venv || true
uv sync

echo "[4/4] Building Colly Sidecar (Go)..."
cd "$ROOT_DIR/colly-sidecar"
# Using explicit tmp cache directories to bypass any local MacOS permission locks
export GOTMPDIR=/tmp/gotmp
export GOCACHE=/tmp/gocache
export GOMODCACHE=/tmp/gomodcache
mkdir -p /tmp/gotmp /tmp/gocache /tmp/gomodcache
go mod tidy
go build -o bin/colly-sidecar main.go

echo "==================================="
echo "  All builds completed successfully! "
echo "  You can now run: ./run.sh"
echo "==================================="

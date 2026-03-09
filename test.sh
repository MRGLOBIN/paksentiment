#!/bin/bash

# Configuration
ROOT_DIR=$(pwd)
FAILURES=0

echo "================================================="
echo "  PakSentiment Suite - Automated Test Runner"
echo "================================================="

# Function to run tests and track failures
run_tests() {
    local SERVICE_NAME=$1
    local DIRECTORY=$2
    local TEST_COMMAND=$3

    echo ""
    echo "-------------------------------------------------"
    echo "▶ Testing: $SERVICE_NAME"
    echo "-------------------------------------------------"
    
    cd "$ROOT_DIR/$DIRECTORY" || { echo "❌ Directory $DIRECTORY not found!"; ((FAILURES++)); return; }

    # Execute the test command
    if eval "$TEST_COMMAND"; then
        echo "✅ $SERVICE_NAME Tests Passed!"
    else
        echo "❌ $SERVICE_NAME Tests FAILED!"
        ((FAILURES++))
    fi
}

# 1. NestJS Main Server
if [ -d "$ROOT_DIR/main-server" ]; then
    export TMPDIR=/tmp
    run_tests "Main Server (NestJS)" "main-server" "npm run test --if-present -- --watchman=false"
fi

# 2. Next.js Frontend
if [ -d "$ROOT_DIR/frontend" ]; then
    run_tests "Frontend (Next.js)" "frontend" "npm run test --if-present"
fi

# 3. FastAPI Data Gateway
if [ -d "$ROOT_DIR/new PakSentiment-data-gateway" ]; then
    echo ""
    echo "-------------------------------------------------"
    echo "▶ Testing: Data Gateway (FastAPI)"
    echo "-------------------------------------------------"
    cd "$ROOT_DIR/new PakSentiment-data-gateway"
    
    # Activate UV virtual environment and run pytest
    export UV_CACHE_DIR=/tmp/uvcache
    export PATH="$ROOT_DIR/new PakSentiment-data-gateway/.venv/bin:$PATH"
    
    if command -v pytest &> /dev/null || .venv/bin/pytest --version &> /dev/null; then
        if .venv/bin/pytest || uv run pytest; then
            echo "✅ Data Gateway Tests Passed!"
        else
            echo "❌ Data Gateway Tests FAILED!"
            ((FAILURES++))
        fi
    else
        echo "⚠️  pytest not found. Skipping FastAPI tests."
    fi
fi

# 4. Go Colly Sidecar
if [ -d "$ROOT_DIR/colly-sidecar" ]; then
    export GOTMPDIR=/tmp/gotmp
    export GOCACHE=/tmp/gocache
    export GOMODCACHE=/tmp/gomodcache
    mkdir -p /tmp/gotmp /tmp/gocache /tmp/gomodcache
    
    run_tests "Colly Sidecar (Go)" "colly-sidecar" "go test -v ./..."
fi

echo ""
echo "================================================="
if [ $FAILURES -eq 0 ]; then
    echo "🎉 All Test Suites Passed Successfully!"
    exit 0
else
    echo "⚠️  Warning: $FAILURES Test Suite(s) Failed."
    echo "Please scroll up to review the detailed error logs."
    exit 1
fi
echo "================================================="

#!/usr/bin/env bash
# =============================================================================
# PakSentiment — End-to-End Test Suite
# =============================================================================
# Usage:   ./tests/e2e-tests.sh
# Purpose: Verifies the full Ollama → Go Sidecar → NestJS → Frontend pipeline
#          Run after making changes to sentiment analysis, topic extraction,
#          or the frontend dashboard.
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'
PASS=0
FAIL=0

pass() { echo -e "  ${GREEN}✓ PASS${NC}: $1"; ((PASS++)); }
fail() { echo -e "  ${RED}✗ FAIL${NC}: $1"; ((FAIL++)); }
info() { echo -e "  ${YELLOW}→${NC} $1"; }

OLLAMA_URL="${OLLAMA_URL:-https://llm.h4mxa.com}"
OLLAMA_MODEL="${OLLAMA_MODEL:-phi3:mini}"
NESTJS_URL="${NESTJS_URL:-http://localhost:3000}"
COLLY_URL="${COLLY_URL:-http://localhost:8081}"

# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  TEST 1: Ollama Connectivity & Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PING_RESPONSE=$(curl -s --max-time 15 "$OLLAMA_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"$OLLAMA_MODEL\",\"prompt\":\"Reply OK\",\"stream\":false}" 2>&1 || echo "CURL_FAILED")

if echo "$PING_RESPONSE" | grep -q '"done":true'; then
  pass "Ollama server reachable at $OLLAMA_URL"
else
  fail "Ollama server NOT reachable at $OLLAMA_URL"
  info "Response: $(echo "$PING_RESPONSE" | head -1)"
fi

# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  TEST 2: Ollama Sentiment + Topic Response"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SAMPLE_TEXT="Pakistan economy grew by 3.2 percent in the fiscal year 2024-25, driven by improved exports and foreign investment. The State Bank of Pakistan cut interest rates. Inflation remains high at 12 percent."

SENTIMENT_RESPONSE=$(curl -s --max-time 60 "$OLLAMA_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\":\"$OLLAMA_MODEL\",
    \"stream\":false,
    \"prompt\":\"You are a sentiment analysis and topic classification expert. Analyze the following text and respond with ONLY a valid JSON object (no markdown, no explanation, just JSON).\\n\\nClassify the sentiment as one of: Positive, Negative, Neutral\\nIdentify the main topic as a single word (e.g. Economics, Politics, Technology, Health, Education, Sports, Science, Culture, Environment, Law).\\nWrite a concise summary of 3-4 sentences that captures the key points for a content preview.\\n\\nRespond in this exact JSON format:\\n{\\\"sentiment\\\": \\\"<category>\\\", \\\"confidence\\\": <0.0 to 1.0>, \\\"topic\\\": \\\"<single word topic>\\\", \\\"summary\\\": \\\"<3-4 sentence summary>\\\"}\\n\\nText to analyze:\\n\\\"\\\"\\\"$SAMPLE_TEXT\\\"\\\"\\\"\\n\\nJSON response:\"
  }" 2>&1 || echo "CURL_FAILED")

RAW_LLM=$(echo "$SENTIMENT_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('response',''))" 2>/dev/null || echo "")

if [ -z "$RAW_LLM" ]; then
  fail "Ollama returned empty response"
else
  pass "Ollama returned a response"
  info "Raw response: $(echo "$RAW_LLM" | head -1)"
fi

# Parse the JSON from the response
PARSED=$(echo "$RAW_LLM" | python3 -c "
import sys, json, re
raw = sys.stdin.read()
m = re.search(r'\{[\s\S]*?\}', raw)
if m:
    parsed = json.loads(m.group())
    print(json.dumps(parsed))
else:
    print('{}')
" 2>/dev/null || echo "{}")

HAS_SENTIMENT=$(echo "$PARSED" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if d.get('sentiment') else 'no')" 2>/dev/null)
HAS_TOPIC=$(echo "$PARSED" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if d.get('topic') else 'no')" 2>/dev/null)
HAS_CONFIDENCE=$(echo "$PARSED" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if isinstance(d.get('confidence'), (int,float)) else 'no')" 2>/dev/null)
HAS_SUMMARY=$(echo "$PARSED" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if d.get('summary') and len(d['summary'])>20 else 'no')" 2>/dev/null)

[ "$HAS_SENTIMENT" = "yes" ] && pass "JSON has 'sentiment' field" || fail "Missing 'sentiment' in JSON"
[ "$HAS_TOPIC" = "yes" ] && pass "JSON has 'topic' field" || fail "Missing 'topic' in JSON"
[ "$HAS_CONFIDENCE" = "yes" ] && pass "JSON has 'confidence' (numeric)" || fail "Missing 'confidence' in JSON"
[ "$HAS_SUMMARY" = "yes" ] && pass "JSON has 'summary' (>20 chars)" || fail "Missing or short 'summary' in JSON"

TOPIC_VAL=$(echo "$PARSED" | python3 -c "import sys,json; print(json.load(sys.stdin).get('topic',''))" 2>/dev/null)
TOPIC_WORDS=$(echo "$TOPIC_VAL" | wc -w | tr -d ' ')
[ "$TOPIC_WORDS" = "1" ] && pass "Topic is a single word: '$TOPIC_VAL'" || fail "Topic is not a single word: '$TOPIC_VAL' ($TOPIC_WORDS words)"

# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  TEST 3: Go Colly Sidecar Availability"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

COLLY_HEALTH=$(curl -s --max-time 5 "$COLLY_URL/health" 2>&1 || echo "UNREACHABLE")
if echo "$COLLY_HEALTH" | grep -qi "ok\|alive\|healthy\|running\|status"; then
  pass "Go Colly sidecar reachable at $COLLY_URL"
else
  fail "Go Colly sidecar NOT reachable at $COLLY_URL"
  info "Response: $COLLY_HEALTH"
fi

# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  TEST 4: NestJS Server Availability"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

NEST_HEALTH=$(curl -s --max-time 5 "$NESTJS_URL" 2>&1 || echo "UNREACHABLE")
if [ "$NEST_HEALTH" != "UNREACHABLE" ]; then
  pass "NestJS server reachable at $NESTJS_URL"
else
  fail "NestJS server NOT reachable at $NESTJS_URL"
fi

# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  TEST 5: NestJS Web Endpoint (with Ollama)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

WEB_RESPONSE=$(curl -s --max-time 120 -X POST "$NESTJS_URL/raw-data/web" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://en.wikipedia.org/wiki/Economy_of_Pakistan","followLinks":false}' 2>&1 || echo "CURL_FAILED")

if echo "$WEB_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if d.get('source')=='web' else 1)" 2>/dev/null; then
  pass "NestJS /raw-data/web returns valid response"
  
  # Check sentiment array
  SENT_COUNT=$(echo "$WEB_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('sentiment',[])))" 2>/dev/null || echo "0")
  [ "$SENT_COUNT" -gt 0 ] && pass "Response has $SENT_COUNT sentiment entries" || fail "Response has 0 sentiment entries"
  
  # Check if topic field exists in sentiment
  HAS_TOPIC_IN_SENT=$(echo "$WEB_RESPONSE" | python3 -c "
import sys,json
d=json.load(sys.stdin)
sents = d.get('sentiment',[])
if sents and sents[0].get('topic'):
    print('yes')
    print(sents[0]['topic'])
else:
    print('no')
" 2>/dev/null || echo "no")
  
  TOPIC_LINE=$(echo "$HAS_TOPIC_IN_SENT" | head -1)
  TOPIC_NAME=$(echo "$HAS_TOPIC_IN_SENT" | tail -1)
  [ "$TOPIC_LINE" = "yes" ] && pass "Sentiment has 'topic' field: '$TOPIC_NAME'" || fail "Sentiment missing 'topic' field in NestJS response"

  # Check summary field
  HAS_SUMMARY_IN_SENT=$(echo "$WEB_RESPONSE" | python3 -c "
import sys,json
d=json.load(sys.stdin)
sents = d.get('sentiment',[])
if sents and sents[0].get('summary') and len(sents[0]['summary'])>20:
    print('yes')
else:
    print('no')
" 2>/dev/null || echo "no")
  [ "$HAS_SUMMARY_IN_SENT" = "yes" ] && pass "Sentiment has 'summary' field (>20 chars)" || fail "Sentiment missing or short 'summary' in NestJS response"
  
else
  fail "NestJS /raw-data/web did not return valid response"
  info "Response: $(echo "$WEB_RESPONSE" | head -3)"
fi

# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  TEST 6: Go Build Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if cd "$SCRIPT_DIR/colly-sidecar" && go build -o /dev/null . 2>/dev/null; then
  pass "Go Colly sidecar compiles without errors"
else
  fail "Go Colly sidecar has compilation errors"
fi

# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  TEST 7: NestJS Build Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if cd "$SCRIPT_DIR/main-server" && npm run build --silent 2>/dev/null; then
  pass "NestJS main-server compiles without errors"
else
  fail "NestJS main-server has compilation errors"
fi

# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  TEST 8: Frontend Build Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if cd "$SCRIPT_DIR/frontend" && npx next build --no-lint 2>/dev/null | grep -q "Generating static pages"; then
  pass "Frontend Next.js builds without errors"
else
  fail "Frontend has build errors"
fi

# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}Passed: $PASS${NC}"
echo -e "  ${RED}Failed: $FAIL${NC}"
TOTAL=$((PASS + FAIL))
echo "  Total:  $TOTAL"
echo ""

[ "$FAIL" -eq 0 ] && echo -e "  ${GREEN}🎉 All tests passed!${NC}" || echo -e "  ${RED}⚠️  Some tests failed.${NC}"
echo ""

exit $FAIL

# PakSentiment Data Gateway - FastAPI

FastAPI service that provides a comprehensive gateway for collecting and analyzing social media sentiment from Reddit and Twitter.

## Features

- **Social Media Scraping**: Fetch posts from Reddit and tweets from Twitter
- **Language Detection**: Automatically detect content language (Urdu, English, etc.)
- **Translation**: Translate non-English content to English using Groq's LLaMA models
- **Sentiment Analysis**: Analyze sentiment using Google's Gemini AI
- **Rate Limit Handling**: Automatic retry logic for API rate limits

## API Documentation

### Interactive Swagger UI

Once the server is running, you can access the interactive API documentation at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

The Swagger UI provides:

- Complete API endpoint documentation
- Request/response schemas
- Interactive testing interface
- Example requests and responses
- Parameter descriptions

## Quick Start

1. Install dependencies:

```bash
pip install -e .
```

2. Configure environment variables in `.secrets.toml`:

```toml
REDDIT_CLIENT_ID = "your_reddit_client_id"
REDDIT_CLIENT_SECRET = "your_reddit_secret"
REDDIT_USER_AGENT = "your_user_agent"

BEARER_TOKEN = "your_twitter_bearer_token"

GROQ_API_KEY = "your_groq_api_key"
GEMINI_API_KEY = "your_gemini_api_key"
```

3. Run the server:

```bash
uvicorn main:app --reload --port 8000
```

4. Access the API documentation at http://localhost:8000/docs

## API Endpoints

### Health Check

- `GET /` - Check if the service is running

### Reddit

- `GET /reddit/search` - Search Reddit posts (raw data)
- `GET /reddit/sentiment` - Search Reddit posts with sentiment analysis

### Twitter

- `GET /twitter/search` - Search tweets (raw data)
- `GET /twitter/sentiment` - Search tweets with sentiment analysis

## Supported Languages

- English (en)
- Urdu (ur)
- Auto-detection for other languages

## Response Structure

### Sentiment Analysis Response

```json
{
  "source": "reddit",
  "count": 10,
  "posts": [...],
  "translations": [
    {
      "id": "post_123",
      "language": "ur",
      "translated": true,
      "translatedText": "Translation here"
    }
  ],
  "sentiment": [
    {
      "id": "post_123",
      "sentiment": "positive",
      "score": 0.85,
      "summary": "Brief summary of content"
    }
  ]
}
```

## Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success
- `404` - No content found
- `500` - Internal server error (credentials, etc.)
- `502` - External service error (Groq, Gemini, etc.)

## Rate Limits

- Reddit: Automatically handled with retry logic (max 3 attempts, 60s wait)
- Twitter: 10-100 results per request
- Processing time: 30-60 seconds for sentiment analysis endpoints

## Testing

The FastAPI server includes a comprehensive test suite with **32 tests** covering all endpoints.

### Running Tests

```bash
# Install test dependencies
pip install -e ".[dev]"

# Run all tests
pytest test_main.py -v

# Run with coverage report
pytest test_main.py -v --cov=. --cov-report=term-missing

# Run specific test
pytest test_main.py::test_reddit_sentiment_success -v
```

### Test Coverage

**32 comprehensive tests** covering:

- ✅ **Health Check** (2 tests): Service availability and response format
- ✅ **Reddit Search** (6 tests): Post fetching, validation, error handling, multiple results
- ✅ **Twitter Search** (7 tests): Tweet fetching, validation, credentials, service errors
- ✅ **Reddit Sentiment Analysis** (7 tests): Full pipeline, translations, Urdu content, errors
- ✅ **Twitter Sentiment Analysis** (7 tests): Full pipeline, empty content, multiple tweets
- ✅ **API Documentation** (3 tests): OpenAPI schema, endpoint documentation, Swagger UI

**Current Test Coverage**: 80% overall, 97% for main.py

### Test API Keys

Verify your API credentials are configured correctly:

```bash
python test_apis.py
```

This script tests both Groq and Gemini API connections.

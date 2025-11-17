Sentiment Analysis Pipeline (Python Worker)
1. Purpose

Classify sentiment for each incoming document as:

Positive

Neutral

Negative

2. Pipeline Steps

Language detection

Translation (if needed)

Text cleaning

Embedding generation

Model inference

Confidence scoring

Return JSON to Nest.js

3. Models

LLM API for zero-shot validation

Light-weight classifier (scikit-learn logistic regression)

Embeddings model (sentence-transformers)

4. Input Contract
{
  "id": "123",
  "text": "Sample text",
  "lang": "ps"
}

5. Output Contract
{
  "id": "123",
  "sentiment": "negative",
  "confidence": 0.89
}

6. Error Handling

If translation fails → fallback to original text

If model fails → retry + log

Validation steps

7. Extensibility

Swap embeddings

Replace classifier

Add emotion classification

--- END FILE ---


---

# ✅ **6. translation_pipeline.md**



--- translation_pipeline.md ---

Pashto → Urdu Translation Pipeline
1. Purpose

Enable translation of Pakistan local languages (initially Pashto) into Urdu.

2. Approach

Lightweight NMT model (OpenNMT or MarianMT)

Optional LLM refinement step

Dictionary-based fallback

Language detection built-in

3. Pipeline Steps

Detect language

Preprocess text

Run Pashto → Urdu transform

Run LLM refinement (optional)

Return translated text

4. Input
{
  "text": "زه پاکستان سره مینه لرم"
}

5. Output
{
  "translated": "مجھے پاکستان سے محبت ہے"
}

6. Error Handling

Rate limit fallback

Missing vocabulary fallback

Logging + retries

7. Uses

Sentiment analysis preprocessing

Topic extraction

Dashboard display

--- END FILE ---


---

# ✅ **7. frontend_tasks.md**

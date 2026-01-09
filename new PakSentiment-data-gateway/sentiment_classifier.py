from __future__ import annotations

import asyncio
import json
from typing import Iterable, List, TypedDict, Any, Dict
import asyncio
import json

from groq import AsyncGroq, RateLimitError
from fastapi import HTTPException
from transformers import pipeline

from config import settings


class Document(TypedDict):
    id: str
    text: str


class GroqSentimentClassifier:
    """
    Sentiment classifier using Groq's LLaMA models.
    """

    def __init__(self) -> None:
        api_key = settings.get("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GROQ_API_KEY must be defined in config/.secrets.toml or env vars."
            )

        self._client = AsyncGroq(api_key=api_key)
        # Using llama-3.1-8b-instant for cost-effective analysis
        # Using llama-3.1-8b-instant for cost-effective analysis
        self._model = "llama-3.1-8b-instant"



    async def process_batch(self, documents: Iterable[Document], custom_sentiments: str | None = None, batch_size: int = 10):
        docs = list(documents)
        if not docs:
            return []

        results = []
        
        # Process in smaller batches to avoid token limits
        for i in range(0, len(docs), batch_size):
            batch = docs[i : i + batch_size]
            prompt = self._build_prompt(batch, custom_sentiments)

            try:
                response = await self._client.chat.completions.create(
                    model=self._model,
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a content analysis expert. Respond ONLY with valid JSON arrays, no markdown formatting or explanations."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    temperature=0.3,
                    max_tokens=4000,
                )
                
                text = response.choices[0].message.content

                # Parsing logic moved below to handle shared fallback path

                
                # Parsing logic moved below
                    
            except RateLimitError as e:
                print(f"⚠️ Groq Rate Limit detected on batch {i // batch_size + 1}: {e}")
            except RateLimitError as e:
                print(f"⚠️ Groq Rate Limit detected on batch {i // batch_size + 1}: {e}")
                continue

            except Exception as exc:
                print(f"Error processing batch {i // batch_size + 1}: {exc}")
                continue
            
            # Common parsing logic for both success paths
            try:
                # Cleanup logic
                text = text.strip()
                if text.startswith("```json"):
                    text = text[7:].lstrip()
                elif text.startswith("```"):
                    text = text[3:].lstrip()
                if text.endswith("```"):
                    text = text[:-3].rstrip()
                text = text.strip()
                
                # Try to parse JSON, with recovery for truncated responses
                try:
                    parsed = json.loads(text)
                except json.JSONDecodeError:
                    # Attempt to fix truncated JSON array
                    if text.startswith("[") and not text.endswith("]"):
                        # Find last complete object
                        last_brace = text.rfind("}")
                        if last_brace > 0:
                            text = text[:last_brace + 1] + "]"
                            try:
                                parsed = json.loads(text)
                                print(f"Recovered truncated JSON for batch {i // batch_size + 1}")
                            except json.JSONDecodeError:
                                print(f"Failed to recover JSON for batch {i // batch_size + 1}")
                                continue
                        else:
                            continue
                    else:
                        continue
                
                if isinstance(parsed, list):
                    results.extend(parsed)
                elif isinstance(parsed, dict) and "sentiment" in parsed:
                    results.append(parsed)
            except Exception as parse_exc:
                print(f"Error parsing response: {parse_exc}")
                continue

        return results

    def _build_prompt(self, documents: List[Document], custom_sentiments: str | None = None) -> str:
        dataset = json.dumps(documents, ensure_ascii=False)
        
        # We are hijacking the 'sentiment' field to return Context/Topic as requested by user.
        # "give it one word context on what it is actually about"
        
        if custom_sentiments:
             instructions = (
                f"You are a content analyzer. Classify the content into one of these categories: **{custom_sentiments}**.\n"
                "Respond with ONLY a JSON array. "
                "Each element must have exactly these fields: "
                '{"id": "<original id>", "sentiment": "<One word Category>", '
                '"confidence": <number between 0 and 1>, '
                '"summary": "<one sentence summary>"}.\n\n'
                "Rules:\n"
                f"1. 'sentiment' field must be one of: {custom_sentiments}.\n"
                "2. Base the classification solely on the provided text.\n"
                "3. Return ONLY the JSON array, nothing else.\n\n"
                f"Documents:\n{dataset}\n\n"
            )
        else:
            instructions = (
                "You are a content analyzer. For each document, determine the **Context/Topic** "
                "that best describes what the content is actually about (e.g., Politics, Sports, Economy, Technology, Crime, Entertainment, Health, Education, etc.). "
                "Respond with ONLY a JSON array. "
                "Each element must have exactly these fields: "
                '{"id": "<original id>", "sentiment": "<One word Topic/Context>", '
                '"confidence": <number between 0 and 1>, '
                '"summary": "<one sentence summary>"}.\n\n'
                "Rules:\n"
                "1. 'sentiment' field must contain the ONE WORD Topic (e.g. 'Politics').\n"
                "2. Base the topic solely on the provided text.\n"
                "3. Return ONLY the JSON array, nothing else.\n\n"
                f"Documents:\n{dataset}\n\n"
            )
        return instructions


classifier: GroqSentimentClassifier | None = None


def get_classifier() -> GroqSentimentClassifier:
    global classifier
    if classifier is None:
        classifier = GroqSentimentClassifier()
    return classifier


class AnalysisModelSentimentClassifier:
    """
    Local sentiment classifier using google/flan-t5-small (Analysis Model).
    """
    def __init__(self):
        print("📥 Loading Analysis Model (Flan-T5-Small)... (this may take a moment)")
        # Initialize pipeline for text2text-generation
        self.pipe = pipeline("text2text-generation", model="google/flan-t5-small", max_length=512)
        print("✅ Analysis Model loaded.")

    async def process_batch(self, documents: Iterable[Document], custom_sentiments: str | None = None) -> List[Dict[str, Any]]:
        """
        Process a batch of documents using Analysis Model.
        Since T5 is seq2seq, we'll prompt it for specific fields and aggregate.
        """
        docs = list(documents)
        results = []

        # Run inference in a thread to avoid blocking the event loop
        def _run_inference(doc: Document):
            text = doc["text"]
            # 1. Topic/Context
            if custom_sentiments:
                topic_prompt = f"Classify this text into one of these categories ({custom_sentiments}): {text}"
            else:
                topic_prompt = f"Classify the topic of this text into one word (e.g. Politics, Sports, Economy): {text}"
            
            topic_res = self.pipe(topic_prompt)[0]['generated_text']

            # 2. Summary
            sum_prompt = f"Summarize this text in one sentence: {text}"
            sum_res = self.pipe(sum_prompt)[0]['generated_text']
            
            # Note: Groq classifier maps 'sentiment' field to Topic. We follow suit.
            
            return {
                "id": doc["id"],
                "sentiment": topic_res.strip(), 
                "confidence": 0.85, 
                "summary": sum_res.strip()
            }

        for doc in docs:
            try:
                # Run CPU intensive model in thread
                res = await asyncio.to_thread(_run_inference, doc)
                results.append(res)
            except Exception as e:
                print(f"Error processing doc {doc['id']} with Analysis Model: {e}")
                continue
        
        return results

analysis_model_instance: AnalysisModelSentimentClassifier | None = None

def get_analysis_model() -> AnalysisModelSentimentClassifier:
    global analysis_model_instance
    if analysis_model_instance is None:
        analysis_model_instance = AnalysisModelSentimentClassifier()
    return analysis_model_instance


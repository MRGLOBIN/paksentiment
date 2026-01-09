from __future__ import annotations

import asyncio
from typing import Dict, TypedDict, List
import json

from groq import Groq
from langdetect import DetectorFactory, LangDetectException, detect

from config import settings
from sentiment_classifier import Document

DetectorFactory.seed = 0

TARGET_LANGUAGES: Dict[str, str] = {
    "ur": "Urdu",
    "ps": "Pashto",
    "pa": "Punjabi",
}


class TranslationResult(TypedDict):
    id: str
    language: str
    translated: bool
    translatedText: str | None
    text_for_sentiment: str


class LanguageProcessor:
    def __init__(self) -> None:
        api_key = settings.get("GROQ_API_KEY")
        translation_model = settings.get("TRANSLATION_MODEL")
        if not api_key:
            raise RuntimeError(
                "GROQ_API_KEY must be defined in config/.secrets.toml or env vars."
            )

        self.client = Groq(api_key=api_key)
        self.model = translation_model or "llama-3.1-8b-instant"

    async def process_batch(self, documents: List[Document], batch_size: int = 20) -> List[TranslationResult]:
        return await asyncio.to_thread(self._process_batch_sync, documents, batch_size)

    def _process_batch_sync(self, documents: List[Document], batch_size: int) -> List[TranslationResult]:
        results: List[TranslationResult] = []
        to_translate: List[Dict[str, str]] = []
        
        # 1. First pass: Detect language and separate docs needing translation
        for doc in documents:
            text = doc["text"]
            lang = self._detect_language(text)
            
            if lang in TARGET_LANGUAGES:
                to_translate.append({
                    "id": doc["id"],
                    "text": text,
                    "lang": TARGET_LANGUAGES[lang]
                })
            else:
                results.append({
                    "id": doc["id"],
                    "language": lang,
                    "translated": False,
                    "translatedText": None,
                    "text_for_sentiment": text,
                })
        
        # 2. Process translations in batches
        for i in range(0, len(to_translate), batch_size):
            batch = to_translate[i : i + batch_size]
            translated_batch = self._translate_batch(batch)
            results.extend(translated_batch)
            
        return results

    def _translate_batch(self, batch: List[Dict[str, str]]) -> List[TranslationResult]:
        if not batch:
            return []

        # Prepare payload for AI
        payload = [
            {"id": item["id"], "text": item["text"], "from_lang": item["lang"]} 
            for item in batch
        ]
        
        system_prompt = (
            "You are a professional translator. You will receive a JSON array of texts. "
            "Translate each 'text' into English. "
            "Return ONLY a valid JSON array with objects containing 'id' and 'translated_text'. "
            "Do NOT output markdown or code blocks. JSON only."
        )
        
        user_prompt = f"Translate fields to English:\n{json.dumps(payload, ensure_ascii=False)}"
        
        try:
             response = self.client.chat.completions.create(
                model=self.model,
                temperature=0,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"}
            )
             
             content = response.choices[0].message.content or "{}"
             parsed = json.loads(content)
             
             # Handle formats: {"data": [...]} or just [...] or {"id": ...}
             items = []
             if isinstance(parsed, list):
                 items = parsed
             elif isinstance(parsed, dict):
                 # Look for a list value
                 for val in parsed.values():
                     if isinstance(val, list):
                         items = val
                         break
            
             # Map back to results
             batch_results = []
             lookup = {str(item.get("id")): item.get("translated_text") for item in items}
             
             for item in batch:
                 trans_text = lookup.get(str(item["id"])) or item["text"]
                 batch_results.append({
                    "id": item["id"],
                    "language": item.get("lang") or "unknown", # simplified language code mapping if needed
                    "translated": True,
                    "translatedText": trans_text,
                    "text_for_sentiment": trans_text
                 })
                 
             return batch_results

        except Exception as e:
            # Fallback for failed batch: mark all as failed translation
            print(f"Batch translation failed: {e}")
            return [
                {
                    "id": item["id"],
                    "language": "error",
                    "translated": False,
                    "translatedText": None,
                    "text_for_sentiment": item["text"]
                }
                for item in batch
            ]

    async def process(self, document: Document) -> TranslationResult:
        return await asyncio.to_thread(self._process_sync, document)

    def _process_sync(self, document: Document) -> TranslationResult:
        text = document["text"]
        lang = self._detect_language(text)
        if lang not in TARGET_LANGUAGES:
            return {
                "id": document["id"],
                "language": lang,
                "translated": False,
                "translatedText": None,
                "text_for_sentiment": text,
            }

        translation = self._translate(text, TARGET_LANGUAGES[lang])
        translation = translation.strip() or text

        return {
            "id": document["id"],
            "language": lang,
            "translated": True,
            "translatedText": translation,
            "text_for_sentiment": translation,
        }

    def _detect_language(self, text: str) -> str:
        try:
            return detect(text)
        except LangDetectException:
            return "unknown"

    def _translate(self, text: str, language_name: str) -> str:
        system_prompt = (
            "You are a professional translator. Translate the user input into natural "
            "English. Do not add commentary."
        )
        user_prompt = (
            f"Translate the following {language_name} text into English. "
            "Respond with translation only.\n\n"
            f"Text:\n{text}"
        )

        response = self.client.chat.completions.create(
            model=self.model,
            temperature=0,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )

        return response.choices[0].message.content or ""


language_processor: LanguageProcessor | None = None


def get_language_processor() -> LanguageProcessor:
    global language_processor
    if language_processor is None:
        language_processor = LanguageProcessor()
    return language_processor


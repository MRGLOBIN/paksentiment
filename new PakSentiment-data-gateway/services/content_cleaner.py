"""
Content cleaner using jusText for boilerplate removal.

jusText classifies text blocks in HTML as either "good" (article content)
or "bad" (boilerplate: navigation, footers, ads, sidebars).

Usage:
    from services.content_cleaner import clean_with_justext

    clean_text = clean_with_justext(raw_html, language="English")
"""

import logging
from typing import Optional

import justext

logger = logging.getLogger(__name__)


def clean_with_justext(
    html: str,
    language: str = "English",
    length_low: int = 70,
    length_high: int = 200,
    max_link_density: float = 0.4,
) -> str:
    """
    Remove boilerplate content from HTML using jusText algorithm.

    jusText segments the page into text blocks and classifies each as:
    - "good" (article content)
    - "near-good" (ambiguous — kept if adjacent to good content)
    - "bad" (boilerplate — navigation, ads, footers)
    - "short" (too short to classify)

    Only "good" paragraphs are returned.

    :param html: Raw HTML string.
    :param language: Language for stop-word analysis (default: English).
    :param length_low: Min chars for a paragraph to be "good" outright.
    :param length_high: Chars above which a paragraph is very likely "good".
    :param max_link_density: Max ratio of link text to total text (0-1).
    :return: Clean text with only article content.
    """
    if not html or not html.strip():
        return ""

    try:
        # Get the jusText stoplist for the specified language
        try:
            stoplist = justext.get_stoplist(language)
        except ValueError:
            logger.warning(
                f"jusText stoplist not found for '{language}', falling back to English"
            )
            stoplist = justext.get_stoplist("English")

        # Run jusText classification
        paragraphs = justext.justext(
            html,
            stoplist,
            length_low=length_low,
            length_high=length_high,
            max_link_density=max_link_density,
        )

        # Collect only "good" paragraphs
        good_paragraphs = []
        for paragraph in paragraphs:
            if not paragraph.is_boilerplate:
                text = paragraph.text.strip()
                if text:
                    good_paragraphs.append(text)

        clean_text = "\n\n".join(good_paragraphs)

        logger.info(
            f"jusText: {len(paragraphs)} total blocks → "
            f"{len(good_paragraphs)} good paragraphs "
            f"({len(clean_text)} chars)"
        )

        return clean_text

    except Exception as exc:
        logger.error(f"jusText cleaning failed: {exc}")
        # Return empty on failure — caller can use raw text as fallback
        return ""


def detect_language_for_justext(text: str) -> str:
    """
    Detect language from text sample and return the corresponding
    jusText stoplist name. Falls back to English if detection fails.
    """
    try:
        from langdetect import detect

        lang_code = detect(text[:1000])  # Use first 1000 chars for speed

        # Map langdetect codes to jusText stoplist names
        lang_map = {
            "en": "English",
            "ur": "English",  # Urdu — no jusText stoplist, use English
            "ar": "Arabic",
            "de": "German",
            "fr": "French",
            "es": "Spanish",
            "pt": "Portuguese",
            "it": "Italian",
            "nl": "Dutch",
            "ru": "Russian",
            "zh": "Chinese",
            "ja": "Japanese",
            "ko": "Korean",
            "hi": "Hindi",
        }

        return lang_map.get(lang_code, "English")

    except Exception:
        return "English"

"""
Translation using deep-translator (Google Translate backend).
No PyTorch required.
"""

from typing import Any
from deep_translator import GoogleTranslator

Segment = dict[str, Any]

# deep-translator uses BCP-47 codes; map our internal codes to Google's
_LANG_MAP = {
    "en": "en",
    "he": "iw",  # Google uses "iw" for Hebrew
    "fr": "fr",
    "de": "de",
    "es": "es",
    "ar": "ar",
    "ru": "ru",
    "auto": "auto",
}


def _translate_texts(texts: list[str], source_lang: str, target_lang: str, batch_size: int = 50) -> list[str]:
    src = _LANG_MAP.get(source_lang, source_lang)
    tgt = _LANG_MAP.get(target_lang, target_lang)
    results: list[str] = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        translator = GoogleTranslator(source=src, target=tgt)
        translated = translator.translate_batch(batch)
        results.extend(t or "" for t in translated)
    return results


def translate_segments(
    segments: list[Segment],
    source_lang: str,
    target_lang: str,
    whisper_segments_english: list[Segment] | None = None,
) -> list[Segment]:
    if target_lang == source_lang:
        return segments

    # For any → Hebrew via two-stage: use the English segments if provided
    source_segs = whisper_segments_english if whisper_segments_english is not None else segments
    texts = [seg["text"] for seg in source_segs]
    translated = _translate_texts(texts, source_lang if whisper_segments_english is None else "en", target_lang)
    return [{**seg, "text": translated[i]} for i, seg in enumerate(source_segs)]


def translate_text_list(texts: list[str], src: str, tgt: str) -> list[str]:
    if src == tgt:
        return texts
    return _translate_texts(texts, src, tgt)

"""All Gemini calls live here. Owner: A."""
import json
from typing import List, Optional

from google import genai
from google.genai import types

from config import (GEMINI_API_KEY, GEMINI_TEXT_MODEL, GEMINI_FALLBACK_TEXT_MODEL,
                    GEMINI_IMAGE_MODEL, GEMINI_EMBED_MODEL, IMAGE_STYLE_PREFIX)

_client = genai.Client(api_key=GEMINI_API_KEY, http_options=types.HttpOptions(timeout=20000))


import time as _time
_gemini_down_until = 0.0


def _generate(prompt: str, system: Optional[str], as_json: bool) -> str:
    global _gemini_down_until
    import os as _os
    if _os.getenv("VANTAGE_TEXT_PROVIDER", "gemini").lower() == "xai" or _time.time() < _gemini_down_until:
        from services import xai_service
        return xai_service.generate_text(prompt, system, as_json)
    cfg = types.GenerateContentConfig(
        system_instruction=system,
        response_mime_type="application/json" if as_json else None,
    )
    last_error = None
    for model in (GEMINI_TEXT_MODEL, GEMINI_FALLBACK_TEXT_MODEL):
        try:
            r = _client.models.generate_content(model=model, contents=prompt, config=cfg)
            return r.text
        except Exception as e:
            last_error = e
            print(f"[gemini] {model} failed: {e}")
    _gemini_down_until = _time.time() + 120
    try:
        from services import xai_service
        print("[gemini] falling back to grok (skipping gemini for 2 min)")
        return xai_service.generate_text(prompt, system, as_json)
    except Exception as e:
        print(f"[grok] fallback failed: {e}")
    raise last_error


def generate_text(prompt: str, system: Optional[str] = None) -> str:
    return _generate(prompt, system, as_json=False)


def generate_json(prompt: str, system: Optional[str] = None) -> dict:
    text = _generate(prompt, system, as_json=True)
    text = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(text)


def generate_image(scene_prompt: str) -> Optional[bytes]:
    try:
        r = _client.models.generate_content(
            model=GEMINI_IMAGE_MODEL,
            contents=IMAGE_STYLE_PREFIX + scene_prompt,
        )
    except Exception as e:
        print(f"[gemini] image failed: {str(e)[:120]}")
        return None
    for part in r.candidates[0].content.parts:
        if getattr(part, "inline_data", None) and part.inline_data.data:
            return part.inline_data.data
    return None


def embed_texts(texts: List[str]) -> List[List[float]]:
    out = []
    for t in texts:
        r = _client.models.embed_content(model=GEMINI_EMBED_MODEL, contents=t)
        out.append(r.embeddings[0].values)
    return out

"""/api/translate and /api/languages: subtitles in a different language from the narration. Owner: A.
Narration language is chosen at /api/start ({"topic": ..., "language": "es"}); the narrator then writes
in that language and ElevenLabs multilingual reads it. Subtitles can be any other supported language.
"""
import hashlib

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import httpx

from config import XAI_API_KEY
from services import gemini_service


def _fast_translate(prompt: str) -> str:
    """Fast, cheap model for translation; falls back to the normal text chain."""
    try:
        r = httpx.post("https://api.x.ai/v1/chat/completions",
                       headers={"Authorization": f"Bearer {XAI_API_KEY}"},
                       json={"model": "grok-4.20-0309-non-reasoning", "temperature": 0,
                             "messages": [{"role": "user", "content": prompt}]},
                       timeout=15)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"[translate] fast model failed, falling back: {str(e)[:120]}")
        return gemini_service.generate_text(prompt)

router = APIRouter()

LANGUAGES = {"en": "English", "es": "Spanish", "hi": "Hindi", "fr": "French"}
_CACHE = {}


class TranslateRequest(BaseModel):
    text: str
    target: str


@router.get("/languages")
def languages():
    return {"languages": [{"code": c, "name": n} for c, n in LANGUAGES.items()]}


@router.post("/translate")
def translate(body: TranslateRequest):
    target = (body.target or "").lower()
    if target not in LANGUAGES:
        return JSONResponse(status_code=400, content={"error_code": "language_not_supported",
                                                      "message": f"Supported: {', '.join(LANGUAGES)}"})
    text = (body.text or "").strip()
    if not text:
        return {"text": "", "target": target}
    key = (target, hashlib.sha1(text.encode()).hexdigest())
    if key not in _CACHE:
        prompt = (f"Translate the following documentary narration into {LANGUAGES[target]}. "
                  "Keep names, dates and numbers exactly as they are. Natural, spoken style. "
                  "Return only the translation, with no notes or quotes.\n\n" + text)
        try:
            _CACHE[key] = _fast_translate(prompt).strip()
        except Exception as e:
            print(f"[translate] failed: {str(e)[:150]}")
            return JSONResponse(status_code=502, content={"error_code": "translate_failed",
                                                          "message": "Could not translate right now."})
    return {"text": _CACHE[key], "target": target}

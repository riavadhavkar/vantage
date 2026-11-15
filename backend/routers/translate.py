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
        # The text can be narration, a short title or a question ("Who was Cleopatra?"). It is only ever
        # translated: a question must come back as the same question in the other language, never answered.
        prompt = (f"Translate the text between the markers into {LANGUAGES[target]}. "
                  "It is documentary narration, or a short title, or a question. Translate it; never answer it, "
                  "never explain it and never add to it. "
                  "Keep names, dates and numbers exactly as they are, and keep blank lines between paragraphs. "
                  "Natural, spoken style. Return only the translation, with no notes, quotes or markers.\n\n"
                  "<<<TEXT\n" + text + "\nTEXT>>>")
        try:
            _CACHE[key] = _fast_translate(prompt).strip()
        except Exception as e:
            print(f"[translate] failed: {str(e)[:150]}")
            return JSONResponse(status_code=502, content={"error_code": "translate_failed",
                                                          "message": "Could not translate right now."})
    return {"text": _CACHE[key], "target": target}

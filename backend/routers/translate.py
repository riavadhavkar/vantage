"""/api/translate and /api/languages: subtitles in a different language from the narration. Owner: A.
Narration language is chosen at /api/start ({"topic": ..., "language": "es"}); the narrator then writes
in that language and ElevenLabs multilingual reads it. Subtitles can be any other supported language.
"""
import hashlib

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from services import gemini_service

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
            _CACHE[key] = gemini_service.generate_text(prompt).strip()
        except Exception as e:
            print(f"[translate] failed: {str(e)[:150]}")
            return JSONResponse(status_code=502, content={"error_code": "translate_failed",
                                                          "message": "Could not translate right now."})
    return {"text": _CACHE[key], "target": target}

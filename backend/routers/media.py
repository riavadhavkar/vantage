"""/api/image, /api/tts and the files they produce. Owner: B (media).

These endpoints spend paid API credits, so they are not an open proxy:
- segment_id must match seg_<slug>; cache file names are derived, never taken from the client.
- When the session store knows the segment, its own scene_prompt / narrative_text is used.
- Prompts are wrapped server-side (services.xai_service.build_image_prompt) and capped.
- voice_id must be one of the configured stock voices.
- Limits: a global cap on external calls, plus per-IP and per-session rate limits.
- VANTAGE_DEMO_MODE=1 serves cached files only and never calls an external API.
Every limit or failure answers with the contract shape {error_code, message}.
"""
import hashlib
import os
import re
import threading
import time
from collections import defaultdict, deque
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, JSONResponse

import config
from schemas import ImageRequest, ImageResponse, TtsRequest, TtsResponse
from services import elevenlabs_service, xai_service
from state import session_store

router = APIRouter()

BACKEND_DIR = Path(__file__).resolve().parent.parent
CACHE_DIR = BACKEND_DIR / ".media_cache"
DEMO_CACHE_DIR = BACKEND_DIR.parent / "demo" / "cache"
SEGMENT_ID_RE = re.compile(r"^seg_[a-z0-9_]{1,80}$")
FILE_RE = re.compile(r"^seg_[a-z0-9_]{1,80}(-[0-9a-f]{12})?\.(png|mp3)$")


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default


def is_demo_mode() -> bool:
    return os.getenv("VANTAGE_DEMO_MODE", "0") == "1"


# ---------- limits (in memory; reset on restart) ----------

class Limits:
    WINDOW_S = 600

    def __init__(self):
        self.lock = threading.Lock()
        self.external_calls = 0
        self.hits = defaultdict(deque)

    def reset(self):
        with self.lock:
            self.external_calls = 0
            self.hits.clear()

    def check(self, kind: str, ip: str, session_id: Optional[str]) -> Optional[str]:
        """Returns a reason string when over a limit, else records the call and returns None."""
        cap = _env_int("VANTAGE_MAX_MEDIA_CALLS", 300)
        per_ip = _env_int(f"VANTAGE_{kind.upper()}_PER_IP", 20 if kind == "image" else 40)
        per_session = _env_int(f"VANTAGE_{kind.upper()}_PER_SESSION", 15 if kind == "image" else 30)
        now = time.monotonic()
        with self.lock:
            if self.external_calls >= cap:
                return "The media budget for this server is used up."
            keys = [(f"{kind}:ip:{ip}", per_ip)]
            if session_id:
                keys.append((f"{kind}:session:{session_id}", per_session))
            for key, limit in keys:
                q = self.hits[key]
                while q and now - q[0] > self.WINDOW_S:
                    q.popleft()
                if len(q) >= limit:
                    return "Too many requests. Wait a few minutes and try again."
            for key, _ in keys:
                self.hits[key].append(now)
            self.external_calls += 1
        return None


limits = Limits()
_file_locks: dict = {}
_file_locks_guard = threading.Lock()


def _lock_for(name: str) -> threading.Lock:
    with _file_locks_guard:
        return _file_locks.setdefault(name, threading.Lock())


def _error(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error_code": code, "message": message})


def _ensure_cache(sub: str) -> Path:
    d = CACHE_DIR / sub
    d.mkdir(parents=True, exist_ok=True)
    ignore = CACHE_DIR / ".gitignore"
    if not ignore.exists():
        ignore.write_text("*\n")  # generated media never gets committed
    return d


def _find_segment(segment_id: str) -> Optional[dict]:
    """Uses session_store.find_segment when the backend provides it (see docs/handoffs)."""
    finder = getattr(session_store, "find_segment", None)
    if not finder:
        return None
    try:
        seg = finder(segment_id)
    except Exception:
        return None
    if seg is None:
        return None
    return seg if isinstance(seg, dict) else getattr(seg, "model_dump", lambda **_: None)(mode="json")


def _digest(*parts: str) -> str:
    return hashlib.sha256("\x1f".join(parts).encode("utf-8")).hexdigest()[:12]


def _allowed_voices() -> set:
    return {v for v in getattr(config, "VOICE_BY_PERSPECTIVE", {}).values() if v}


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


# ---------- /api/image ----------

@router.post("/image", response_model=ImageResponse)
def image(body: ImageRequest, request: Request):
    # Sync def: FastAPI runs it in a worker thread, so a slow provider never blocks the loop.
    if not SEGMENT_ID_RE.match(body.segment_id):
        return _error(400, "image_failed", "segment_id must look like seg_<slug>.")

    demo_file = DEMO_CACHE_DIR / f"{body.segment_id}.png"
    if demo_file.exists():
        return ImageResponse(image_url=f"/api/media/demo/{demo_file.name}")
    if is_demo_mode():
        return _error(404, "image_failed", "Demo mode serves cached images only, and this scene has none.")

    known = _find_segment(body.segment_id)
    scene = (known or {}).get("scene_prompt") or body.scene_prompt
    if not xai_service.clean_scene(scene):
        return _error(400, "image_failed", "scene_prompt is empty.")
    if not config.XAI_API_KEY:
        return _error(503, "image_failed", "XAI_API_KEY is not set in .env.")

    name = f"{body.segment_id}-{_digest(xai_service.build_image_prompt(scene))}.png"
    path = _ensure_cache("images") / name
    url = f"/api/media/image/{name}"

    with _lock_for(name):
        if path.exists() and path.stat().st_size > 0:
            return ImageResponse(image_url=url)
        reason = limits.check("image", _client_ip(request), (known or {}).get("session_id"))
        if reason:
            return _error(429, "image_failed", reason)
        png = xai_service.generate_image(scene)
        if not png:
            return _error(502, "image_failed", "The image service did not return an image.")
        tmp = path.with_suffix(".tmp")
        tmp.write_bytes(png)
        tmp.replace(path)
    return ImageResponse(image_url=url)


# ---------- /api/tts ----------

@router.post("/tts", response_model=TtsResponse)
def tts(body: TtsRequest, request: Request):
    if not SEGMENT_ID_RE.match(body.segment_id):
        return _error(400, "tts_failed", "segment_id must look like seg_<slug>.")

    demo_file = DEMO_CACHE_DIR / f"{body.segment_id}.mp3"
    if demo_file.exists():
        return TtsResponse(audio_url=f"/api/media/demo/{demo_file.name}",
                           audio_duration_ms=elevenlabs_service.duration_ms(demo_file.read_bytes()))
    if is_demo_mode():
        return _error(404, "tts_failed", "Demo mode serves cached narration only, and this scene has none.")

    known = _find_segment(body.segment_id)
    text = ((known or {}).get("narrative_text") or body.text or "").strip()[: elevenlabs_service.MAX_TEXT_CHARS]
    voice_id = (known or {}).get("voice_id") or body.voice_id
    if not text:
        return _error(400, "tts_failed", "There is no text to narrate.")
    if voice_id not in _allowed_voices():
        return _error(400, "tts_failed", "That voice is not configured on this server.")
    if not elevenlabs_service._key():
        return _error(503, "tts_failed", "ELEVENLABS_API_KEY is not set in .env.")

    name = f"{body.segment_id}-{_digest(voice_id, elevenlabs_service.ELEVENLABS_MODEL, text)}.mp3"
    path = _ensure_cache("audio") / name
    url = f"/api/media/audio/{name}"

    with _lock_for(name):
        if not (path.exists() and path.stat().st_size > 0):
            reason = limits.check("tts", _client_ip(request), (known or {}).get("session_id"))
            if reason:
                return _error(429, "tts_failed", reason)
            mp3 = elevenlabs_service.generate_audio(text, voice_id)
            if not mp3:
                return _error(502, "tts_failed", "The narration service did not return audio.")
            tmp = path.with_suffix(".tmp")
            tmp.write_bytes(mp3)
            tmp.replace(path)
    return TtsResponse(audio_url=url, audio_duration_ms=elevenlabs_service.duration_ms(path.read_bytes()))


# ---------- files ----------

def _serve(directory: Path, name: str, media_type: str):
    if not FILE_RE.match(name):
        return _error(404, "image_failed" if name.endswith(".png") else "tts_failed", "Unknown file.")
    path = directory / name
    if not path.exists():
        return _error(404, "image_failed" if name.endswith(".png") else "tts_failed", "Unknown file.")
    return FileResponse(path, media_type=media_type, headers={"Cache-Control": "public, max-age=86400"})


@router.get("/media/image/{name}")
def image_file(name: str):
    return _serve(CACHE_DIR / "images", name, "image/png")


@router.get("/media/audio/{name}")
def audio_file(name: str):
    return _serve(CACHE_DIR / "audio", name, "audio/mpeg")


@router.get("/media/demo/{name}")
def demo_file(name: str):
    return _serve(DEMO_CACHE_DIR, name, "image/png" if name.endswith(".png") else "audio/mpeg")

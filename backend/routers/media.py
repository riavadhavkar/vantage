"""/api/tts, /api/image, /api/transcribe. Owner: B.

/api/image calls services.xai_service.generate_image (PNG bytes), caches the file on
disk by segment and prompt, and returns a URL served by GET /api/media/image/{name}.
The frontend labels every image it receives as an AI-generated illustration.
"""
import hashlib
import re
import threading
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse, JSONResponse

from config import XAI_API_KEY
from schemas import ImageRequest, ImageResponse
from services import xai_service

router = APIRouter()

CACHE_DIR = Path(__file__).resolve().parent.parent / ".media_cache" / "images"
_locks: dict[str, threading.Lock] = {}
_locks_guard = threading.Lock()


def _error(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error_code": code, "message": message})


def _ensure_cache_dir() -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    ignore = CACHE_DIR.parent / ".gitignore"
    if not ignore.exists():
        ignore.write_text("*\n")  # generated media never gets committed


def _file_name(segment_id: str, scene_prompt: str) -> str:
    safe_id = re.sub(r"[^A-Za-z0-9_-]", "_", segment_id)[:80] or "segment"
    digest = hashlib.sha256(scene_prompt.encode("utf-8")).hexdigest()[:12]
    return f"{safe_id}-{digest}.png"


def _lock_for(name: str) -> threading.Lock:
    with _locks_guard:
        return _locks.setdefault(name, threading.Lock())


@router.post("/image", response_model=ImageResponse)
def image(body: ImageRequest):
    # Sync def: FastAPI runs it in a worker thread, so the 90 s xAI call never blocks the loop.
    if not body.scene_prompt.strip():
        return _error(400, "image_failed", "scene_prompt is empty.")
    if not XAI_API_KEY:
        return _error(503, "image_failed", "XAI_API_KEY is not set in .env.")

    _ensure_cache_dir()
    name = _file_name(body.segment_id, body.scene_prompt)
    path = CACHE_DIR / name
    url = f"/api/media/image/{name}"

    # One generation per file, even if the same segment is requested twice at once.
    with _lock_for(name):
        if path.exists() and path.stat().st_size > 0:
            return ImageResponse(image_url=url)
        png = xai_service.generate_image(body.scene_prompt)
        if not png:
            return _error(502, "image_failed", "The image service did not return an image.")
        tmp = path.with_suffix(".tmp")
        tmp.write_bytes(png)
        tmp.replace(path)
    return ImageResponse(image_url=url)


@router.get("/media/image/{name}")
def image_file(name: str):
    if not re.fullmatch(r"[A-Za-z0-9_-]+-[0-9a-f]{12}\.png", name):
        return _error(404, "image_failed", "Unknown image.")
    path = CACHE_DIR / name
    if not path.exists():
        return _error(404, "image_failed", "Unknown image.")
    return FileResponse(path, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})

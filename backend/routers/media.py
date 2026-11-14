"""/api/tts, /api/image. Owner: B (first version wired by A).
Generated files are saved in backend/media/ and served at /media/<file>.
"""
import hashlib
import os
import re

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from schemas import TtsRequest, TtsResponse, ImageRequest, ImageResponse
from services import xai_service, elevenlabs_service

router = APIRouter()

MEDIA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "media"))
os.makedirs(MEDIA_DIR, exist_ok=True)


def _error(status, code, message):
    return JSONResponse(status_code=status, content={"error_code": code, "message": message})


def _name(segment_id: str, content: str, ext: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9_]+", "_", segment_id or "seg")[:60]
    digest = hashlib.sha1((content or "").encode()).hexdigest()[:8]
    return f"{slug}_{digest}.{ext}"


def _url(request: Request, name: str) -> str:
    return str(request.base_url).rstrip("/") + "/media/" + name


@router.post("/image", response_model=ImageResponse)
def image(body: ImageRequest, request: Request):
    name = _name(body.segment_id, body.scene_prompt, "png")
    path = os.path.join(MEDIA_DIR, name)
    if not os.path.exists(path):
        data = xai_service.generate_image(body.scene_prompt)
        if not data:
            return _error(502, "image_failed", "Could not generate an illustration.")
        with open(path, "wb") as f:
            f.write(data)
    return ImageResponse(image_url=_url(request, name))


@router.post("/tts", response_model=TtsResponse)
def tts(body: TtsRequest, request: Request):
    name = _name(body.segment_id, f"{body.voice_id}|{body.text}", "mp3")
    path = os.path.join(MEDIA_DIR, name)
    if not os.path.exists(path):
        data = elevenlabs_service.generate_audio(body.text, body.voice_id)
        if not data:
            return _error(502, "tts_failed", "Could not generate narration audio.")
        with open(path, "wb") as f:
            f.write(data)
    return TtsResponse(audio_url=_url(request, name))

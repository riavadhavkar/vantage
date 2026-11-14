"""ElevenLabs text to speech. Owner: B (media).

Stock voices only: we never clone or imitate a real person. voice_id must come from the
server's allowlist (VOICE_BY_PERSPECTIVE); the router enforces that.

List stock voices (names and labels, no key printed):
    python -m services.elevenlabs_service
"""
import os
from typing import Optional

import httpx

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_MODEL = os.getenv("ELEVENLABS_MODEL", "eleven_multilingual_v2")
OUTPUT_FORMAT = "mp3_44100_128"
BITRATE_BPS = 128_000
MAX_TEXT_CHARS = 1500


def _key() -> str:
    # Read late so a key added to .env is picked up after config loads dotenv.
    return os.getenv("ELEVENLABS_API_KEY", "") or ELEVENLABS_API_KEY


def duration_ms(mp3: bytes) -> int:
    """Constant bitrate output, so size gives the duration."""
    return int(len(mp3) * 8 * 1000 / BITRATE_BPS)


def generate_audio(text: str, voice_id: str) -> Optional[bytes]:
    """Returns MP3 bytes, or None on any failure."""
    key = _key()
    text = (text or "").strip()[:MAX_TEXT_CHARS]
    if not key or not text or not voice_id:
        return None
    try:
        r = httpx.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
            params={"output_format": OUTPUT_FORMAT},
            headers={"xi-api-key": key, "accept": "audio/mpeg"},
            json={"text": text, "model_id": ELEVENLABS_MODEL},
            timeout=60,
        )
        r.raise_for_status()
        return r.content or None
    except Exception as e:
        status = getattr(getattr(e, "response", None), "status_code", "")
        print(f"[elevenlabs] tts failed {status}: {type(e).__name__}")
    return None


def list_stock_voices() -> list:
    """Premade (stock) voices only: name, voice_id, labels."""
    key = _key()
    if not key:
        return []
    r = httpx.get("https://api.elevenlabs.io/v1/voices", headers={"xi-api-key": key}, timeout=30)
    r.raise_for_status()
    return [
        {"voice_id": v["voice_id"], "name": v.get("name"), "labels": v.get("labels") or {}}
        for v in r.json().get("voices", [])
        if v.get("category") == "premade"
    ]


if __name__ == "__main__":
    import config  # noqa: F401  (loads .env)
    voices = list_stock_voices()
    if not voices:
        print("No voices: ELEVENLABS_API_KEY is not set in .env, or the account has none.")
    for v in voices:
        labels = ", ".join(f"{k}: {val}" for k, val in v["labels"].items())
        print(f"{v['voice_id']}  {v['name']:<12} {labels}")

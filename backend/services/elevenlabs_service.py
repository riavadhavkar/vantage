"""ElevenLabs text-to-speech. Owner: B (first version wired by A)."""
import os
from typing import Optional

import httpx

from config import ELEVENLABS_API_KEY

DEFAULT_VOICE = os.getenv("ELEVENLABS_DEFAULT_VOICE", "21m00Tcm4TlvDq8ikWAM")
MODEL_ID = os.getenv("ELEVENLABS_MODEL", "eleven_multilingual_v2")


def generate_audio(text: str, voice_id: Optional[str] = None) -> Optional[bytes]:
    if not ELEVENLABS_API_KEY:
        print("[tts] no ELEVENLABS_API_KEY set")
        return None
    voice = voice_id or DEFAULT_VOICE
    try:
        r = httpx.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice}",
            headers={"xi-api-key": ELEVENLABS_API_KEY, "Accept": "audio/mpeg"},
            json={"text": text, "model_id": MODEL_ID},
            timeout=60,
        )
        r.raise_for_status()
        return r.content
    except Exception as e:
        print(f"[tts] failed: {str(e)[:200]}")
        return None

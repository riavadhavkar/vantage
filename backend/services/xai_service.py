"""xAI (Grok) calls: image generation. Owner: B (media).

Every prompt is built server-side: the team's locked style prefix, the scene (cleaned
and capped), then fixed composition and safety constraints. Client text never reaches
the provider unwrapped.
"""
import base64
import re
from typing import Optional

import httpx

from config import XAI_API_KEY, IMAGE_STYLE_PREFIX

XAI_IMAGE_MODEL_DEFAULT = "grok-imagine-image-2.0"
MAX_SCENE_CHARS = 400

COMPOSITION = "Wide landscape composition, 16:9 framing."
SAFETY = (
    "Show atmosphere, places, objects, documents, maps, or distant silhouettes. "
    "No identifiable real people, no close-up faces, no graphic violence, no blood, "
    "no bodies, no text or lettering."
)


def clean_scene(scene_prompt: str) -> str:
    """Strip control characters and the SAMPLE marker, collapse whitespace, cap length."""
    text = re.sub(r"[\x00-\x1f\x7f]", " ", scene_prompt or "")
    text = re.sub(r"^\s*SAMPLE:\s*", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:MAX_SCENE_CHARS].rstrip()


def build_image_prompt(scene_prompt: str) -> str:
    scene = clean_scene(scene_prompt)
    return f"{IMAGE_STYLE_PREFIX}{scene}. {COMPOSITION} {SAFETY}"


def generate_image(scene_prompt: str, model: Optional[str] = None) -> Optional[bytes]:
    """Returns PNG bytes, or None on any failure (including a provider refusal)."""
    from config import XAI_IMAGE_MODEL
    if not XAI_API_KEY or not clean_scene(scene_prompt):
        return None
    try:
        r = httpx.post(
            "https://api.x.ai/v1/images/generations",
            headers={"Authorization": "Bearer " + XAI_API_KEY},
            json={
                "model": model or XAI_IMAGE_MODEL or XAI_IMAGE_MODEL_DEFAULT,
                "prompt": build_image_prompt(scene_prompt),
                "n": 1,
                "response_format": "b64_json",
            },
            timeout=90,
        )
        r.raise_for_status()
        item = r.json()["data"][0]
        if item.get("b64_json"):
            return base64.b64decode(item["b64_json"])
        if item.get("url"):
            return httpx.get(item["url"], timeout=60).content
    except Exception as e:
        # Never log headers or the key; status and a short reason only.
        status = getattr(getattr(e, "response", None), "status_code", "")
        print(f"[xai] image failed {status}: {type(e).__name__}")
    return None

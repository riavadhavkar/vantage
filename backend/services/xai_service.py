"""xAI (Grok) calls: image generation. Owner: A."""
import base64
from typing import Optional

import httpx

from config import XAI_API_KEY, IMAGE_STYLE_PREFIX

XAI_IMAGE_MODEL_DEFAULT = "grok-imagine-image-2.0"


def generate_image(scene_prompt: str, model: Optional[str] = None) -> Optional[bytes]:
    from config import XAI_IMAGE_MODEL
    try:
        r = httpx.post(
            "https://api.x.ai/v1/images/generations",
            headers={"Authorization": "Bearer " + XAI_API_KEY},
            json={
                "model": model or XAI_IMAGE_MODEL or XAI_IMAGE_MODEL_DEFAULT,
                "prompt": IMAGE_STYLE_PREFIX + scene_prompt,
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
        print(f"[xai] image failed: {str(e)[:200]}")
    return None

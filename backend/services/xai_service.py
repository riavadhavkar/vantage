"""xAI (Grok) calls: image generation. Owner: A."""
import base64
from typing import Optional

import httpx

from config import XAI_API_KEY, IMAGE_STYLE_PREFIX

XAI_IMAGE_MODEL_DEFAULT = "grok-imagine-image"


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


XAI_TEXT_MODEL_DEFAULT = "grok-4.3"


def generate_text(prompt: str, system: Optional[str] = None, as_json: bool = False) -> str:
    from config import XAI_TEXT_MODEL
    style = ("Write in polished standard English with full punctuation: commas, apostrophes "
             "(ship's, didn't), and periods. Never drop punctuation. No em dashes.")
    messages = [{"role": "system", "content": (system + "\n\n" + style) if system else style}]
    messages.append({"role": "user", "content": prompt})
    body = {"model": XAI_TEXT_MODEL or XAI_TEXT_MODEL_DEFAULT, "messages": messages}
    if as_json:
        body["response_format"] = {"type": "json_object"}
    r = httpx.post(
        "https://api.x.ai/v1/chat/completions",
        headers={"Authorization": "Bearer " + XAI_API_KEY},
        json=body,
        timeout=90,
    )
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]

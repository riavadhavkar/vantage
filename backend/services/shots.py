"""Five storyboard shots for a scene that came back with only one scene prompt (deep mode). Owner: A."""
import json
import re

import httpx

from config import XAI_API_KEY

PROMPT = """Write exactly 5 illustration prompts for this documentary scene, one per moment, following the
narration in order. Each is 20 to 35 words: the place, light, exact objects, people described in general terms
(never name real people), and a camera angle. No text or lettering in the image.
Return ONLY a JSON array of 5 strings.

STORY: {topic}
MAIN SCENE: {scene}
NARRATION: {text}"""


def make_shots(text: str, scene: str = "", topic: str = "") -> list:
    r = httpx.post("https://api.x.ai/v1/chat/completions",
                   headers={"Authorization": f"Bearer {XAI_API_KEY}"},
                   json={"model": "grok-4.20-0309-non-reasoning", "temperature": 0.4,
                         "messages": [{"role": "user", "content": PROMPT.replace("{topic}", topic or "")
                                       .replace("{scene}", scene or "").replace("{text}", text)}]},
                   timeout=20)
    r.raise_for_status()
    out = r.json()["choices"][0]["message"]["content"].strip()
    out = re.sub(r"^```(json)?|```$", "", out).strip()
    shots = [s.strip() for s in json.loads(out) if isinstance(s, str) and s.strip()]
    return shots[:5]

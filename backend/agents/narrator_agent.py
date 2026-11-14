"""NarratorAgent: writes the next segment with Gemini. Owner: A."""
import os
import re
from typing import Optional

from enums import Perspective, Mood, ChoiceType
from services import gemini_service

_PROMPT_PATH = os.path.join(os.path.dirname(__file__), "..", "prompts", "narrator_web.txt")

PERSPECTIVES = [p.value for p in Perspective]
MOODS = [m.value for m in Mood]
CHOICE_TYPES = [c.value for c in ChoiceType]


def _slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "_", (text or "").lower()).strip("_")
    return s[:40] or "untitled"


def _pick(value, allowed, default):
    value = (value or "").strip().lower()
    return value if value in allowed else default


def build_prompt(topic: str, history: list, action: str) -> str:
    template = open(_PROMPT_PATH).read()
    history_text = "\n".join(f"- {h}" for h in history) or "- Nothing yet. This is the opening segment."
    return (template
            .replace("{{TOPIC}}", topic)
            .replace("{{HISTORY}}", history_text)
            .replace("{{ACTION}}", action)
            .replace("{{PERSPECTIVES}}", ", ".join(PERSPECTIVES))
            .replace("{{MOODS}}", ", ".join(MOODS))
            .replace("{{CHOICE_TYPES}}", ", ".join(CHOICE_TYPES)))


class NarratorAgent:
    def run(self, topic: str, history: list, action: str) -> dict:
        """Returns a cleaned dict ready to become a Segment (minus ids and links)."""
        raw = gemini_service.generate_json(build_prompt(topic, history, action))

        choices = []
        for c in (raw.get("choices") or [])[:3]:
            label = (c.get("label") or "").strip()
            if not label:
                continue
            choices.append({
                "choice_id": "ch_" + _slugify(label),
                "label": label,
                "perspective": _pick(c.get("perspective"), PERSPECTIVES, "narrator"),
                "choice_type": _pick(c.get("choice_type"), CHOICE_TYPES, "what_next"),
            })

        location = raw.get("location")
        if not (isinstance(location, dict) and "lat" in location and "lng" in location):
            location = None
        else:
            location = {"lat": float(location["lat"]), "lng": float(location["lng"]),
                        "label": str(location.get("label") or "")}

        return {
            "slug": _slugify(raw.get("slug") or raw.get("title")),
            "title": (raw.get("title") or "Untitled").strip(),
            "narrative_text": (raw.get("narrative_text") or "").strip(),
            "perspective": _pick(raw.get("perspective"), PERSPECTIVES, "narrator"),
            "mood": _pick(raw.get("mood"), MOODS, "neutral"),
            "scene_prompt": (raw.get("scene_prompt") or "").strip(),
            "location": location,
            "date_label": raw.get("date_label") or None,
            "choices": choices,
        }

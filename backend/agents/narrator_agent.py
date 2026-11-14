"""NarratorAgent: writes the next segment with Gemini, grounded in retrieved sources. Owner: A."""
import os
import re
from typing import List, Optional

from enums import Perspective, Mood, ChoiceType
from services import gemini_service

_PROMPT_PATH = os.path.join(os.path.dirname(__file__), "..", "prompts", "narrator_web.txt")

ALL_PERSPECTIVES = [p.value for p in Perspective]
MOODS = [m.value for m in Mood]
CHOICE_TYPES = [c.value for c in ChoiceType]
SOURCE_EXCERPT_CHARS = 900


def _slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "_", (text or "").lower()).strip("_")
    return s[:40].strip("_") or "untitled"


def _pick(value, allowed, default):
    value = (value or "").strip().lower()
    return value if value in allowed else default


def format_sources(chunks: list) -> str:
    if not chunks:
        return "(no sources found; stay general and say the record is thin)"
    lines = []
    for c in chunks:
        text = " ".join((c.get("text") or "").split())[:SOURCE_EXCERPT_CHARS]
        lines.append(f"[{c['source_id']}] ({c.get('perspective')}, {c.get('source_type')}) "
                     f"{c.get('title')}: {text}")
    return "\n\n".join(lines)


def build_prompt(topic: str, history: list, action: str, chunks: list, perspectives: list) -> str:
    template = open(_PROMPT_PATH).read()
    history_text = "\n".join(f"- {h}" for h in history) or "- Nothing yet. This is the opening segment."
    return (template
            .replace("{{TOPIC}}", topic)
            .replace("{{SOURCES}}", format_sources(chunks))
            .replace("{{HISTORY}}", history_text)
            .replace("{{ACTION}}", action)
            .replace("{{PERSPECTIVES}}", ", ".join(perspectives))
            .replace("{{MOODS}}", ", ".join(MOODS))
            .replace("{{CHOICE_TYPES}}", ", ".join(CHOICE_TYPES)))


class NarratorAgent:
    def run(self, topic: str, history: list, action: str,
            chunks: Optional[list] = None, perspectives: Optional[List[str]] = None) -> dict:
        """Returns a cleaned dict ready to become a Segment (minus ids and links)."""
        chunks = chunks or []
        perspectives = perspectives or ALL_PERSPECTIVES
        raw = gemini_service.generate_json(build_prompt(topic, history, action, chunks, perspectives))

        choices, seen_ids = [], set()
        for c in (raw.get("choices") or [])[:3]:
            label = (c.get("label") or "").strip()
            choice_id = "ch_" + _slugify(label)
            if not label or choice_id in seen_ids:
                continue
            seen_ids.add(choice_id)
            choices.append({
                "choice_id": choice_id,
                "label": label,
                "perspective": _pick(c.get("perspective"), perspectives, "narrator"),
                "choice_type": _pick(c.get("choice_type"), CHOICE_TYPES, "what_next"),
            })

        location = raw.get("location")
        if isinstance(location, dict) and "lat" in location and "lng" in location:
            try:
                location = {"lat": float(location["lat"]), "lng": float(location["lng"]),
                            "label": str(location.get("label") or "")}
            except (TypeError, ValueError):
                location = None
        else:
            location = None

        retrieved_ids = {c["source_id"] for c in chunks}
        used = [s for s in (raw.get("source_ids") or []) if s in retrieved_ids]
        if not used:
            used = list(dict.fromkeys(c["source_id"] for c in chunks))[:2]

        return {
            "slug": _slugify(raw.get("slug") or raw.get("title")),
            "title": (raw.get("title") or "Untitled").strip(),
            "narrative_text": (raw.get("narrative_text") or "").strip(),
            "perspective": _pick(raw.get("perspective"), perspectives, "narrator"),
            "mood": _pick(raw.get("mood"), MOODS, "neutral"),
            "scene_prompt": (raw.get("scene_prompt") or "").strip(),
            "scene_prompts": [str(x).strip() for x in (raw.get("scene_prompts") or []) if str(x).strip()][:5],
            "location": location,
            "date_label": raw.get("date_label") or None,
            "source_ids": list(dict.fromkeys(used)),
            "choices": choices,
        }

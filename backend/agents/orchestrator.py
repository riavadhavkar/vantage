"""run_pipeline(session_id, choice_id, question, mode) -> Segment. Owner: A.
Uses the Gemini narrator. If Gemini fails, falls back to mock segments so the demo never breaks.
"""
from typing import Optional

from enums import Mode
from schemas import Segment, Choice, Location
from state import session_store
from config import VOICE_BY_PERSPECTIVE
from agents.narrator_agent import NarratorAgent
from agents.mock_segments import MOCK_SEGMENTS

_narrator = NarratorAgent()

EDGE_BY_CHOICE_TYPE = {
    "perspective_shift": "opposing_view",
    "go_deeper": "deeper_context",
    "what_next": "happened_next",
    "primary_source": "deeper_context",
}


def _describe_action(state: dict, choice_id: Optional[str], question: Optional[str]) -> tuple:
    """Returns (action text for the prompt, edge_type)."""
    if question:
        return f'The viewer asked: "{question}". Answer it as the next segment.', "deeper_context"
    if choice_id:
        choice = state.get("offered_choices", {}).get(choice_id)
        if choice:
            return (f'The viewer chose: "{choice["label"]}" '
                    f'(perspective: {choice["perspective"]}, type: {choice["choice_type"]}).',
                    EDGE_BY_CHOICE_TYPE.get(choice["choice_type"], "happened_next"))
        return "The viewer chose to continue.", "happened_next"
    return "The viewer just started. Open the documentary with a strong hook.", None


def _unique_id(state: dict, slug: str) -> str:
    base = "seg_" + slug
    seg_id, n = base, 2
    while seg_id in state["seen_segment_ids"]:
        seg_id, n = f"{base}_{n}", n + 1
    return seg_id


def _mock(state: dict) -> dict:
    data = dict(MOCK_SEGMENTS[len(state["seen_segment_ids"]) % len(MOCK_SEGMENTS)])
    data["segment_id"] = _unique_id(state, data.pop("segment_id").removeprefix("seg_"))
    return data


def run_pipeline(session_id: str, choice_id: Optional[str] = None,
                 question: Optional[str] = None, mode: Mode = Mode.WEB) -> Optional[Segment]:
    state = session_store.get_viewer_state(session_id)
    if state is None:
        return None

    action, edge_type = _describe_action(state, choice_id, question)
    history = state.get("history", [])
    previous_id = state["current_segment_id"]
    previous_location = state.get("last_location")

    try:
        out = _narrator.run(state["topic"].replace("_", " "), history, action)
        data = {
            "segment_id": _unique_id(state, out["slug"]),
            "title": out["title"],
            "narrative_text": out["narrative_text"],
            "perspective": out["perspective"],
            "mood": out["mood"],
            "scene_prompt": out["scene_prompt"],
            "location": Location(**out["location"]) if out["location"] else None,
            "date_label": out["date_label"],
            "choices": [Choice(**c) for c in out["choices"]],
        }
    except Exception as e:
        print(f"[orchestrator] narrator failed, using mock: {str(e)[:200]}")
        data = _mock(state)

    data["session_id"] = session_id
    data["voice_id"] = VOICE_BY_PERSPECTIVE.get(str(data["perspective"])) or None
    if previous_id:
        data["connected_to"] = [previous_id]
        data["edge_type"] = edge_type
    loc = data.get("location")
    if previous_location and loc and previous_location["label"] != loc.label:
        data["travel_from"] = Location(**previous_location)

    segment = Segment(**data)

    state["seen_segment_ids"].append(segment.segment_id)
    state["current_segment_id"] = segment.segment_id
    state["current_perspective"] = segment.perspective.value
    state.setdefault("history", []).append(
        f"{segment.title} ({segment.perspective.value}): {segment.narrative_text[:160]}")
    state["offered_choices"] = {c.choice_id: c.model_dump(mode="json") for c in segment.choices}
    if segment.location:
        state["last_location"] = segment.location.model_dump()
    session_store.save_viewer_state(state)
    return segment

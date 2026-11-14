"""Viewer state per session_id, kept in memory. Owner: A."""
import uuid
from datetime import datetime, timezone

_SESSIONS = {}


def create_session(topic: str) -> dict:
    session_id = "sess_" + uuid.uuid4().hex[:6]
    state = {
        "session_id": session_id,
        "topic": topic.strip().lower().replace(" ", "_"),
        "seen_segment_ids": [],
        "seen_chunk_ids": [],
        "open_threads": [],
        "current_segment_id": None,
        "current_perspective": "narrator",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _SESSIONS[session_id] = state
    return state


def get_viewer_state(session_id: str):
    return _SESSIONS.get(session_id)


def save_viewer_state(state: dict) -> None:
    _SESSIONS[state["session_id"]] = state

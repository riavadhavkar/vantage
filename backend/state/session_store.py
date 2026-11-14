"""Viewer state per session_id, kept in memory. Owner: A.
Each session also gets a 4-digit link_code so a phone can join it over iMessage.
"""
import random
import uuid
from datetime import datetime, timezone

_SESSIONS = {}
_CODES = {}  # link_code -> session_id


def _new_code() -> str:
    for _ in range(50):
        code = f"{random.randint(1000, 9999)}"
        if code not in _CODES:
            return code
    return uuid.uuid4().hex[:6]


def create_session(topic: str) -> dict:
    session_id = "sess_" + uuid.uuid4().hex[:6]
    code = _new_code()
    state = {
        "session_id": session_id,
        "link_code": code,
        "topic": topic.strip().lower().replace(" ", "_"),
        "seen_segment_ids": [],
        "seen_chunk_ids": [],
        "open_threads": [],
        "current_segment_id": None,
        "current_perspective": "narrator",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _SESSIONS[session_id] = state
    _CODES[code] = session_id
    return state


def get_viewer_state(session_id: str):
    return _SESSIONS.get(session_id)


def get_session_by_code(code: str):
    sid = _CODES.get((code or "").strip())
    return _SESSIONS.get(sid) if sid else None


def save_viewer_state(state: dict) -> None:
    _SESSIONS[state["session_id"]] = state

"""/api/topic: the current topic and its perspectives, in the shape the frontend's mocks use. Owner: A.
With ?session_id= it returns that session's topic; without it, the most recently started one
(or Titanic before anything starts).
"""
from typing import Optional

from fastapi import APIRouter

from config import VOICE_BY_PERSPECTIVE
from knowledge.catalog import resolve_topic
from knowledge import live_research
from state import session_store

router = APIRouter()

TOPICS = {
    "titanic": {
        "topic_id": "titanic",
        "title": "The sinking of the Titanic",
        "one_line": "A liner on its first voyage meets ice in the North Atlantic, April 1912.",
        "aliases": ["Titanic", "RMS Titanic", "Titanic sinking"],
        "perspectives": [
            ("crew", "Officers and crew", "#6F9BC4",
             "Lightoller, Bride and Lord, in their own inquiry testimony."),
            ("first_class", "Cabin passengers", "#B49AAE",
             "Memoirs by Beesley and Gracie, written within a year."),
            ("steerage", "Third class", "#C49A6C",
             "Emigrants in steerage, and the numbers behind who survived."),
            ("historian", "Inquiries and historians", "#AEB4B1",
             "The 1912 inquiries and what the wreck showed later."),
        ],
    },
    "princeton": {
        "topic_id": "princeton",
        "title": "The Battle of Princeton",
        "one_line": "Washington's army slips away in the night and strikes Princeton, January 1777.",
        "aliases": ["Princeton", "Battle of Princeton", "Princeton 1777"],
        "perspectives": [
            ("american", "Continental Army", "#6F9BC4",
             "Washington's own reports and the officers around Mercer."),
            ("british", "British Army", "#C46C6C",
             "Howe's official report and the 17th Foot's own accounts."),
            ("townspeople", "Princeton townspeople", "#C49A6C",
             "A resident's diary of the occupation and the farm that became a hospital."),
            ("historian", "Historians", "#AEB4B1",
             "Modern accounts that weigh the conflicting reports."),
        ],
    },
}


def _topic_key(session_id: Optional[str]) -> str:
    state = session_store.get_viewer_state(session_id) if session_id else None
    if state is None:
        latest = list(session_store._SESSIONS.values())
        state = latest[-1] if latest else None
    if state is None:
        return "titanic"
    return state.get("topic_key") or resolve_topic(state.get("topic", "")) or "titanic"


@router.get("/topic")
def get_topic(session_id: Optional[str] = None):
    key = _topic_key(session_id)
    if live_research.is_live(key):
        lt = live_research.LIVE[key]
        t = {"topic_id": key, "title": lt["title"], "one_line": lt["one_line"],
             "aliases": [lt["event"]], "perspectives": lt["perspectives"]}
    elif key.startswith("web_"):
        from knowledge import web_topic
        t = web_topic.topic_info(key)
    else:
        t = TOPICS.get(key) or TOPICS["titanic"]
    return {
        **{k: v for k, v in t.items() if k != "perspectives"},
        "perspectives": [
            {"perspective_id": pid, "label": label, "color": color,
             "voice_id": VOICE_BY_PERSPECTIVE.get(pid) or None, "description": desc}
            for pid, label, color, desc in t["perspectives"]
        ],
    }

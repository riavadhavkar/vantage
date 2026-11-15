"""/api/start, /api/next-segment, /api/ask. Owner: A."""
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from schemas import (StartRequest, StartResponse, NextSegmentRequest, AskRequest,
                     SegmentResponse)
from state import session_store
from agents.orchestrator import run_pipeline
from config import LIVE_RESEARCH
from knowledge.catalog import resolve_topic
from knowledge import live_research

router = APIRouter()


def _error(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error_code": code, "message": message})


def _wiki_fallback(topic: str):
    """When Gemini research is unavailable (quota, overload), build the sources from Wikipedia instead."""
    try:
        from knowledge import web_topic
        from agents.orchestrator import TOPIC_TITLES, OPENING_QUERIES
        key = web_topic.ensure_topic(topic)
        if key:
            TOPIC_TITLES[key] = web_topic.topic_title(key)
            OPENING_QUERIES[key] = f"{topic} what happened overview"
            print(f"[start] using Wikipedia sources for {topic!r}: {key}")
        return key
    except Exception as e:
        print(f"[start] wikipedia fallback failed: {str(e)[:200]}")
        return None


@router.post("/start", response_model=StartResponse)
def start(body: StartRequest):
    live_key = None
    if LIVE_RESEARCH and not resolve_topic(body.topic) and body.topic.strip():
        # Any-event mode: find and read real sources for this event before the first scene.
        try:
            live_key = live_research.research(body.topic.strip())
        except Exception as e:
            print(f"[start] live research failed for {body.topic!r}: {str(e)[:300]}")
        if not live_key:
            live_key = _wiki_fallback(body.topic.strip())
        if not live_key:
            return JSONResponse(status_code=422, content={
                "error_code": "topic_not_supported",
                "message": "We could not find enough sources for that event. Try another, or one of these.",
                "suggestions": ["The Battle of Princeton", "The sinking of the Titanic"],
            })
    state = session_store.create_session(body.topic)
    if live_key:
        state["topic_key"] = live_key
    state["language"] = (body.language or "en").lower()
    typed = body.topic.strip()
    is_question = typed.endswith("?") or typed.lower().split(" ")[0] in (
        "who", "what", "when", "where", "why", "how", "is", "was", "were", "did", "does", "do", "can")
    # A typed question gets answered in the first scene (and corrected if its premise is wrong).
    segment = run_pipeline(state["session_id"], question=typed if (is_question and live_key) else None)
    return StartResponse(session_id=state["session_id"], segment=segment, link_code=state["link_code"])


@router.post("/next-segment", response_model=SegmentResponse)
def next_segment(body: NextSegmentRequest):
    segment = run_pipeline(body.session_id, choice_id=body.choice_id)
    if segment is None:
        return _error(404, "session_not_found", "No session with that id. Call /api/start first.")
    return SegmentResponse(segment=segment)


@router.post("/ask", response_model=SegmentResponse)
def ask(body: AskRequest):
    segment = run_pipeline(body.session_id, question=body.question)
    if segment is None:
        return _error(404, "session_not_found", "No session with that id. Call /api/start first.")
    return SegmentResponse(segment=segment)

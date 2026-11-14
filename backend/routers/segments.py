"""/api/start, /api/next-segment, /api/ask. Owner: A."""
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from schemas import (StartRequest, StartResponse, NextSegmentRequest, AskRequest,
                     SegmentResponse)
from state import session_store
from agents.orchestrator import run_pipeline

router = APIRouter()


def _error(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error_code": code, "message": message})


@router.post("/start", response_model=StartResponse)
def start(body: StartRequest):
    state = session_store.create_session(body.topic)
    state["language"] = (body.language or "en").lower()
    segment = run_pipeline(state["session_id"])
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

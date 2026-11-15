"""/api/sources, /api/graph. Owner: A."""
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from enums import Perspective, SourceType
from schemas import Source, SourcesResponse, GraphResponse, GraphNode, GraphEdge
from state import session_store
from knowledge.catalog import load_documents
from knowledge import live_research

router = APIRouter()

_PERSPECTIVES = {p.value for p in Perspective}
_SOURCE_TYPES = {s.value for s in SourceType}


def _error(status, code, message):
    return JSONResponse(status_code=status, content={"error_code": code, "message": message})


def _source(doc_id: str) -> Source:
    live = live_research.source(doc_id)
    if live:
        return Source(source_id=doc_id, title=live["title"], source_type=live["source_type"],
                      perspective=live["perspective"], url=live.get("url"), excerpt=live["excerpt"])
    row = load_documents().get(doc_id)
    if not row:
        from knowledge import web_topic
        row = web_topic.doc_row(doc_id)
    st = row.get("source_type", "secondary")
    p = row.get("perspective", "historian")
    return Source(
        source_id=doc_id,
        title=row.get("title", doc_id),
        source_type=st if st in _SOURCE_TYPES else "secondary",
        perspective=p if p in _PERSPECTIVES else "historian",
        url=row.get("url") or None,
        excerpt=row.get("notes", ""),
    )


@router.get("/sources", response_model=SourcesResponse)
def get_sources(session_id: str):
    state = session_store.get_viewer_state(session_id)
    if state is None:
        return _error(404, "session_not_found", "No session with that id. Call /api/start first.")
    return SourcesResponse(sources=[_source(s) for s in state.get("seen_source_ids", [])])


@router.get("/graph", response_model=GraphResponse)
def get_graph(session_id: str):
    state = session_store.get_viewer_state(session_id)
    if state is None:
        return _error(404, "session_not_found", "No session with that id. Call /api/start first.")
    current = state.get("current_segment_id")
    nodes = [GraphNode(**n, is_current=(n["id"] == current)) for n in state.get("graph_nodes", [])]
    edges = [GraphEdge(**e) for e in state.get("graph_edges", [])]
    return GraphResponse(nodes=nodes, edges=edges)

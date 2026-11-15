"""/api/analysis: a grounded mind map of the whole story. Owner: A.
POST {"session_id": "..."} -> {"center": "...", "branches": [{"id", "label", "points": [{"text", "source_ids"}]}]}
Five fixed branches (causes, key people, turning points, where sources disagree, consequences).
Every point cites the sources it came from; points whose sources were not retrieved are dropped.
"""
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from services import gemini_service
from state import session_store

router = APIRouter()
_CACHE = {}

BRANCHES = [
    ("causes", "Causes"),
    ("people", "Key people"),
    ("turning_points", "Turning points"),
    ("disagreements", "Where sources disagree"),
    ("consequences", "Consequences"),
]

PROMPT = """Build a study mind map of: {topic}

Use ONLY the SOURCES below. Each starts with its id in square brackets.
For each branch give 2 or 3 points. Each point is one short line (under 16 words), concrete (names, dates,
numbers), and lists the ids of the sources it comes from. For "disagreements", each point names what the
sources disagree about and which sources take which side. If the sources say nothing for a branch, give [].

Branches: causes, people, turning_points, disagreements, consequences.
Return ONLY JSON: {"center": "short title of the topic", "causes": [{"text": "...", "source_ids": ["..."]}],
"people": [...], "turning_points": [...], "disagreements": [...], "consequences": [...]}

SOURCES:
{sources}"""


class AnalysisRequest(BaseModel):
    session_id: str


def _topic_title(state) -> str:
    key = state.get("topic_key") or ""
    try:
        from agents.orchestrator import TOPIC_TITLES
        if key in TOPIC_TITLES:
            return TOPIC_TITLES[key]
    except Exception:
        pass
    try:
        from knowledge import live_research
        if live_research.is_live(key):
            return live_research.topic_title(key)
    except Exception:
        pass
    return (state.get("topic") or "this event").replace("_", " ")


def _chunks(key: str, title: str) -> list:
    from knowledge import retriever
    seen, out = set(), []
    for q in (f"{title} causes background why it happened", f"{title} key people leaders witnesses",
              f"{title} turning point what changed", f"{title} sources disagree dispute numbers",
              f"{title} consequences aftermath legacy"):
        try:
            for c in retriever.search(key, q, None, [], k=4):
                if c["chunk_id"] not in seen:
                    seen.add(c["chunk_id"])
                    out.append(c)
        except Exception as e:
            print(f"[analysis] retrieval failed: {str(e)[:120]}")
    return out[:16]


@router.post("/analysis")
def analysis(body: AnalysisRequest):
    state = session_store.get_viewer_state(body.session_id)
    if state is None:
        return JSONResponse(status_code=404, content={"error_code": "session_not_found",
                                                      "message": "No session with that id. Call /api/start first."})
    key = state.get("topic_key") or ""
    if key in _CACHE:
        return _CACHE[key]
    title = _topic_title(state)
    chunks = _chunks(key, title)
    if not chunks:
        return {"center": title, "branches": [{"id": b, "label": l, "points": []} for b, l in BRANCHES]}
    sources = "\n\n".join(
        f"[{c['source_id']}] {c.get('title', '')}: {' '.join((c.get('text') or '').split())[:700]}" for c in chunks)
    try:
        raw = gemini_service.generate_json(PROMPT.replace("{topic}", title).replace("{sources}", sources)) or {}
    except Exception as e:
        print(f"[analysis] model failed: {str(e)[:150]}")
        return JSONResponse(status_code=502, content={"error_code": "analysis_failed",
                                                      "message": "Could not build the analysis right now."})
    valid = {c["source_id"] for c in chunks}
    branches = []
    for bid, label in BRANCHES:
        points = []
        for p in (raw.get(bid) or [])[:3]:
            text = (p.get("text") or "").strip() if isinstance(p, dict) else ""
            ids = [s for s in (p.get("source_ids") or []) if s in valid] if isinstance(p, dict) else []
            if text and ids:
                points.append({"text": text, "source_ids": ids})
        branches.append({"id": bid, "label": label, "points": points})
    # Add the hand-documented disagreements from data/edges.csv (opposing_view edges) for this topic.
    try:
        from knowledge import graph
        from knowledge.catalog import load_documents
        topic_docs = [d for d, row in load_documents().items() if row.get("topic") == key]
        dis = next(b for b in branches if b["id"] == "disagreements")
        seen_pairs = {tuple(sorted(p["source_ids"])) for p in dis["points"]}
        for e in graph.contradictions_between(topic_docs):
            pair = tuple(sorted([e["from_doc"], e["to_doc"]]))
            note = (e.get("note") or "").strip()
            if pair in seen_pairs or not note or len(dis["points"]) >= 3:
                continue
            dis["points"].append({"text": note[:140], "source_ids": list(pair)})
            seen_pairs.add(pair)
    except Exception as e:
        print(f"[analysis] adding documented disagreements failed: {str(e)[:150]}")
    result = {"center": (raw.get("center") or title).strip(), "branches": branches}
    _CACHE[key] = result
    return result

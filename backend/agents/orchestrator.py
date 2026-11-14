"""run_pipeline(session_id, choice_id, question, mode) -> Segment. Owner: A.
Retrieves sources for the topic, has the Gemini narrator write a grounded segment, and attaches
contradictions from data/edges.csv. If anything fails, falls back to mock segments.
"""
from typing import Optional

from enums import Mode, PERSPECTIVES_BY_TOPIC
from schemas import Segment, Choice, Location, Contradiction, ContradictionSide
from state import session_store
from config import VOICE_BY_PERSPECTIVE, AGENT_MODE
from agents.narrator_agent import NarratorAgent
from agents.mock_segments import MOCK_BY_TOPIC
from knowledge.catalog import resolve_topic
from knowledge import retriever, graph

_narrator = NarratorAgent()

EDGE_BY_CHOICE_TYPE = {
    "perspective_shift": "opposing_view",
    "go_deeper": "deeper_context",
    "what_next": "happened_next",
    "primary_source": "deeper_context",
}
OPENING_QUERIES = {
    "princeton": "Washington night march from Trenton to Princeton January 3 1777 battle begins",
    "titanic": "Titanic strikes iceberg night of April 14 1912 lookout warnings",
}
TOPIC_TITLES = {"princeton": "the Battle of Princeton, January 1777",
                "titanic": "the sinking of the Titanic, April 1912"}


def _describe_action(state, choice_id, question):
    """Returns (action text for the prompt, search query, chosen perspective, edge_type)."""
    if question:
        return (f'The viewer asked: "{question}". Answer it as the next segment.',
                question, None, "deeper_context")
    if choice_id:
        choice = state.get("offered_choices", {}).get(choice_id)
        if choice:
            return (f'The viewer chose: "{choice["label"]}" '
                    f'(perspective: {choice["perspective"]}, type: {choice["choice_type"]}).',
                    choice["label"], choice["perspective"],
                    EDGE_BY_CHOICE_TYPE.get(choice["choice_type"], "happened_next"))
        return "The viewer chose to continue.", "what happened next", None, "happened_next"
    return ("The viewer just started. Open the documentary with a strong hook.",
            "overview beginning of the story", None, None)


def _unique_id(state, slug):
    base = "seg_" + slug
    seg_id, n = base, 2
    while seg_id in state["seen_segment_ids"]:
        seg_id, n = f"{base}_{n}", n + 1
    return seg_id


def _mock(state, topic_key):
    mocks = MOCK_BY_TOPIC.get(topic_key or "titanic")
    data = dict(mocks[len(state["seen_segment_ids"]) % len(mocks)])
    data["segment_id"] = _unique_id(state, data.pop("segment_id").removeprefix("seg_"))
    return data


def _relevant(note, narrative):
    import re
    words = {w for w in re.findall(r"[a-z]{5,}", (note or "").lower())}
    return any(w in (narrative or "").lower() for w in words)


def _contradiction_for(state, used_ids, retrieved_ids, narrative=""):
    """Pick one documented disagreement touching this segment's sources, not shown before."""
    shown = set(state.get("shown_contradictions", []))
    for ids in (used_ids, retrieved_ids):
        for e in graph.contradictions_between(ids):
            key = f'{e["from_doc"]}_{e["to_doc"]}'
            if key in shown:
                continue
            note = e.get("note") or ""
            if not _relevant(note, narrative):
                continue
            if " vs " in note:
                a, b = note.split(" vs ", 1)
                claim = "The sources disagree"
            else:
                a, b = graph.doc_title(e["from_doc"]), graph.doc_title(e["to_doc"])
                claim = note or "The sources disagree"
            return key, Contradiction(
                contradiction_id="con_" + key.lower(),
                claim=claim,
                side_a=ContradictionSide(text=a.strip(), source_id=e["from_doc"]),
                side_b=ContradictionSide(text=b.strip(), source_id=e["to_doc"]),
                explanation=note,
            )
    return None, None


def run_pipeline(session_id: str, choice_id: Optional[str] = None,
                 question: Optional[str] = None, mode: Mode = Mode.WEB) -> Optional[Segment]:
    state = session_store.get_viewer_state(session_id)
    if state is None:
        return None

    topic_key = state.get("topic_key") or resolve_topic(state["topic"])
    state["topic_key"] = topic_key
    perspectives = PERSPECTIVES_BY_TOPIC.get(topic_key, ["narrator", "historian"])
    topic_title = TOPIC_TITLES.get(topic_key, state["topic"].replace("_", " "))

    action, query, chosen_perspective, edge_type = _describe_action(state, choice_id, question)
    if not choice_id and not question and topic_key in OPENING_QUERIES:
        query = OPENING_QUERIES[topic_key]
    previous_id = state["current_segment_id"]
    previous_location = state.get("last_location")

    chunks = []
    if topic_key:
        try:
            chunks = retriever.search(topic_key, query, chosen_perspective,
                                      state.get("seen_chunk_ids", []), k=5)
        except Exception as e:
            print(f"[orchestrator] retrieval failed: {str(e)[:200]}")

    contradiction_key = None
    try:
        out = None
        if AGENT_MODE == "deep" and topic_key:
            try:
                from agents import deep_director
                out, deep_chunks, trace = deep_director.run(
                    topic_key, topic_title, state.get("history", []), action, query,
                    chosen_perspective, perspectives, state.get("seen_chunk_ids", []))
                chunks = deep_chunks or chunks
                state["last_agent_trace"] = trace
            except Exception as e:
                print(f"[orchestrator] deep mode failed, using fast narrator: {str(e)[:300]}")
                out = None
        if out is None:
            out = _narrator.run(topic_title, state.get("history", []), action, chunks, perspectives)
        data = {
            "segment_id": _unique_id(state, out["slug"]),
            "title": out["title"],
            "narrative_text": out["narrative_text"],
            "perspective": out["perspective"],
            "mood": out["mood"],
            "scene_prompt": out["scene_prompt"],
            "location": Location(**out["location"]) if out["location"] else None,
            "date_label": out["date_label"],
            "source_ids": out["source_ids"],
            "choices": [Choice(**c) for c in out["choices"]],
        }
        if not data["location"] and chunks and chunks[0].get("lat"):
            c = chunks[0]
            data["location"] = Location(lat=c["lat"], lng=c["lng"], label=c.get("location_label", ""))
        contradiction_key, contradiction = _contradiction_for(
            state, out["source_ids"], [c["source_id"] for c in chunks], out["narrative_text"])
        data["contradiction"] = contradiction
    except Exception as e:
        print(f"[orchestrator] narrator failed, using mock: {str(e)[:200]}")
        data = _mock(state, topic_key)

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
    state.setdefault("seen_chunk_ids", []).extend(c["chunk_id"] for c in chunks)
    state.setdefault("seen_source_ids", [])
    for sid in segment.source_ids:
        if sid not in state["seen_source_ids"]:
            state["seen_source_ids"].append(sid)
    if contradiction_key:
        state.setdefault("shown_contradictions", []).append(contradiction_key)
    state.setdefault("history", []).append(
        f"{segment.title} ({segment.perspective.value}): {segment.narrative_text[:160]}")
    state.setdefault("graph_nodes", []).append({
        "id": segment.segment_id, "label": segment.title, "perspective": segment.perspective.value})
    if previous_id:
        state.setdefault("graph_edges", []).append({
            "id": f"edge_{previous_id}_{segment.segment_id}", "source": previous_id,
            "target": segment.segment_id, "edge_type": edge_type})
    state["offered_choices"] = {c.choice_id: c.model_dump(mode="json") for c in segment.choices}
    if segment.location:
        state["last_location"] = segment.location.model_dump()
    session_store.save_viewer_state(state)
    return segment

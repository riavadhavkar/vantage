"""Relationships between sources from data/edges.csv. Owner: A."""
from knowledge.catalog import load_edges, load_documents


def contradictions_between(doc_ids: list) -> list:
    """opposing_view edges where at least one side is in doc_ids."""
    ids = set(doc_ids)
    return [e for e in load_edges()
            if e["relation"] == "opposing_view" and (e["from_doc"] in ids or e["to_doc"] in ids)]


def related(doc_id: str) -> list:
    return [e for e in load_edges() if doc_id in (e["from_doc"], e["to_doc"])]


def doc_title(doc_id: str) -> str:
    from knowledge import live_research
    live = live_research.source(doc_id)
    if live:
        return live["title"]
    return load_documents().get(doc_id, {}).get("title", doc_id)

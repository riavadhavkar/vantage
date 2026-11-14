"""Reads Person C's data files: data/documents.csv, data/edges.csv, data/sources/<doc_id>.txt. Owner: A."""
import csv
import os
from functools import lru_cache

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
SOURCES_DIR = os.path.join(DATA_DIR, "sources")

TOPIC_KEYWORDS = {
    "titanic": ["titanic", "iceberg", "1912", "white star", "lifeboat", "carpathia", "californian", "steerage", "lightoller", "lookout"],
    "princeton": ["princeton", "1777", "mercer", "nassau", "washington", "revolution", "mawhood", "redcoat", "hessian", "trenton"],
}


def resolve_topic(text: str):
    """Maps whatever the viewer typed to a topic key we have data for, or None."""
    t = (text or "").lower()
    for key, words in TOPIC_KEYWORDS.items():
        if any(w in t for w in words):
            return key
    return None


@lru_cache(maxsize=1)
def load_documents() -> dict:
    """doc_id -> row dict from documents.csv."""
    path = os.path.join(DATA_DIR, "documents.csv")
    with open(path, newline="", encoding="utf-8") as f:
        return {row["doc_id"]: row for row in csv.DictReader(f)}


@lru_cache(maxsize=1)
def load_edges() -> list:
    """List of {from_doc, to_doc, relation (snake_case), note}."""
    path = os.path.join(DATA_DIR, "edges.csv")
    if not os.path.exists(path):
        return []
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        r["relation"] = (r.get("relation") or "").strip().replace("-", "_")
    return rows


def read_source_text(doc_id: str):
    path = os.path.join(SOURCES_DIR, f"{doc_id}.txt")
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8", errors="ignore") as f:
        return f.read()

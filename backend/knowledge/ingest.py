"""Chunk every downloaded source and load it into ChromaDB. Owner: A.
Run from backend/:  python -m knowledge.ingest
"""
import os
import re

import chromadb

from config import CHROMA_COLLECTION, VANTAGE_CHROMA_PATH
from knowledge.catalog import load_documents, read_source_text

CHUNK_CHARS = 1200
OVERLAP_CHARS = 200
MAX_CHUNKS_PER_DOC = 120  # keeps the giant books from drowning everything else

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def chroma_path() -> str:
    p = VANTAGE_CHROMA_PATH
    return p if os.path.isabs(p) else os.path.abspath(os.path.join(BACKEND_DIR, p))


def get_collection():
    client = chromadb.PersistentClient(path=chroma_path())
    return client.get_or_create_collection(CHROMA_COLLECTION)


def chunk_text(text: str) -> list:
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    chunks, start = [], 0
    while start < len(text):
        end = min(start + CHUNK_CHARS, len(text))
        if end < len(text):
            cut = text.rfind("\n\n", start + CHUNK_CHARS // 2, end)
            if cut == -1:
                cut = text.rfind(". ", start + CHUNK_CHARS // 2, end)
            if cut != -1:
                end = cut + 1
        piece = text[start:end].strip()
        if len(piece) > 80:
            chunks.append(piece)
        if end >= len(text):
            break
        start = max(end - OVERLAP_CHARS, start + 1)
    return chunks


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def run():
    docs = load_documents()
    client = chromadb.PersistentClient(path=chroma_path())
    try:
        client.delete_collection(CHROMA_COLLECTION)
    except Exception:
        pass
    col = client.get_or_create_collection(CHROMA_COLLECTION)

    total, loaded, missing = 0, 0, []
    for doc_id, row in docs.items():
        text = read_source_text(doc_id)
        if not text:
            missing.append(doc_id)
            continue
        chunks = chunk_text(text)[:MAX_CHUNKS_PER_DOC]
        subtopics = (row.get("subtopics") or "").split("|")
        meta = {
            "source_id": doc_id,
            "topic": row.get("topic", ""),
            "perspective": row.get("perspective", "historian"),
            "source_type": row.get("source_type", "secondary"),
            "time_period": row.get("date_written", ""),
            "subtopic": subtopics[0] if subtopics else "",
            "subtopics": row.get("subtopics", ""),
            "title": row.get("title", ""),
            "url": row.get("url", ""),
            "location_label": row.get("location_name", ""),
            "lat": _num(row.get("lat")),
            "lng": _num(row.get("lng")),
        }
        ids = [f"chk_{doc_id}_{i:03d}" for i in range(len(chunks))]
        for i in range(0, len(chunks), 100):
            col.add(ids=ids[i:i + 100], documents=chunks[i:i + 100],
                    metadatas=[meta] * len(chunks[i:i + 100]))
        total += len(chunks)
        loaded += 1
        print(f"  {doc_id}: {len(chunks)} chunks")

    print(f"\nLoaded {loaded} docs, {total} chunks into '{CHROMA_COLLECTION}' at {chroma_path()}")
    if missing:
        print("No text yet for:", ", ".join(missing))


if __name__ == "__main__":
    run()

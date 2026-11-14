"""Search ChromaDB, always filtered by topic. Owner: A."""
from typing import List, Optional

from config import MAX_CHUNKS
from knowledge.ingest import get_collection

_col = None


def _collection():
    global _col
    if _col is None:
        _col = get_collection()
    return _col


def search(topic: str, query: str, perspective: Optional[str] = None,
           exclude_chunk_ids: Optional[List[str]] = None, k: int = MAX_CHUNKS) -> list:
    """Returns up to k chunks: [{chunk_id, text, source_id, perspective, title, ...}]."""
    where = {"topic": topic}
    if perspective and perspective not in ("narrator", "historian"):
        where = {"$and": [{"topic": topic}, {"perspective": perspective}]}
    exclude = set(exclude_chunk_ids or [])

    res = _collection().query(query_texts=[query], n_results=k + len(exclude) + 5, where=where)
    out = []
    for cid, text, meta in zip(res["ids"][0], res["documents"][0], res["metadatas"][0]):
        if cid in exclude:
            continue
        out.append({"chunk_id": cid, "text": text, **meta})
        if len(out) >= k:
            break

    # If a perspective filter found too little, top up from the whole topic.
    if len(out) < 2 and where != {"topic": topic}:
        more = search(topic, query, None, list(exclude) + [c["chunk_id"] for c in out], k - len(out))
        out.extend(more)
    return out

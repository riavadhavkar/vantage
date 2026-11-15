"""Any-topic mode: build a source library for a topic on the fly. Owner: A.
For a topic that is not one of the curated ones, search Wikipedia, download the top articles,
chunk them into the same ChromaDB collection (topic = "web_<slug>"), and remember them in
data/web_topics/<key>.json so a second visit is instant. Everything the narrator says still
comes from these retrieved pages, and each page is a real, citable source.
"""
import json
import os
import re
from concurrent.futures import ThreadPoolExecutor

import httpx

from enums import PERSPECTIVES_BY_TOPIC
from knowledge.ingest import chunk_text

WIKI_API = "https://en.wikipedia.org/w/api.php"
HEADERS = {"User-Agent": "Vantage/0.1 (HackPrinceton interactive documentary; contact via github.com/riavadhavkar/vantage)"}
MAX_ARTICLES = 4
MAX_CHUNKS_PER_ARTICLE = 25
WEB_PERSPECTIVES = ["narrator", "historian", "townspeople"]
PERSPECTIVE_INFO = {
    "narrator": ("Narrator", "#AEB4B1", "The story as it unfolded."),
    "historian": ("Historians", "#6F9BC4", "What the sources record, and where they disagree."),
    "townspeople": ("People who were there", "#C49A6C", "Ordinary people living through it."),
}
_STOP_SECTIONS = r"(See also|References|Notes|Citations|External links|Further reading|Bibliography|Sources|Footnotes)"

_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "web_topics"))
_TOPICS = {}  # key -> {"title", "one_line", "docs": [ {source_id, title, url, notes} ]}
_DOCS = {}    # source_id -> doc row


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", (text or "").lower()).strip("_")[:40] or "topic"


def is_web_topic(key) -> bool:
    return bool(key) and str(key).startswith("web_")


def _clean(extract: str) -> str:
    text = re.split(r"\n==+\s*" + _STOP_SECTIONS + r"\s*==+", extract or "")[0]
    text = re.sub(r"\n==+\s*(.*?)\s*==+\n", r"\n\n\1.\n", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def _remember(key: str, info: dict) -> None:
    _TOPICS[key] = info
    for d in info["docs"]:
        _DOCS[d["source_id"]] = d
    PERSPECTIVES_BY_TOPIC[key] = WEB_PERSPECTIVES


def _load_saved(key: str):
    path = os.path.join(_DATA_DIR, f"{key}.json")
    if not os.path.exists(path):
        return None
    try:
        return json.load(open(path))
    except Exception:
        return None


def _collection():
    from knowledge import retriever  # shares the retriever's client so new chunks are searchable
    return retriever._collection()


def _has_chunks(key: str) -> bool:
    try:
        return bool(_collection().get(where={"topic": key}, limit=1)["ids"])
    except Exception:
        return False


MEDIA_WORDS = r"(film|movie|television|TV series|miniseries|series|episode|song|single|album|EP|band|soundtrack|video game|game|novel|book|play|opera|musical|documentary|docudrama)"


def _is_media(title: str, text: str) -> bool:
    """True for pages about films, shows, songs, games and so on, which would pollute a history story."""
    if re.search(r"\(([^)]*\b)?" + MEDIA_WORDS + r"\b[^)]*\)", title, re.I):
        return True
    opening = text[:250]
    return bool(re.search(r"\b(is|was) an? [^.]{0,60}?\b" + MEDIA_WORDS + r"\b", opening, re.I))


SKIP_TITLES = r"(conspiracy|hoax|denial|in popular culture|in fiction|^List of|disambiguation)"


def _search_titles(query: str) -> list:
    r = httpx.get(WIKI_API, headers=HEADERS, timeout=15, params={
        "action": "query", "list": "search", "srsearch": query, "srlimit": 8,
        "srprop": "", "format": "json"})
    r.raise_for_status()
    found = [h["title"] for h in r.json().get("query", {}).get("search", [])]
    found = [t for t in found if not re.search(SKIP_TITLES, t, re.I)]
    # The page whose title is the topic itself goes first (Wikipedia redirects fix the casing).
    return [query] + [t for t in found if t.lower() != query.lower()]


def _fetch_page(title: str):
    r = httpx.get(WIKI_API, headers=HEADERS, timeout=20, params={
        "action": "query", "prop": "extracts|info|coordinates", "explaintext": 1,
        "exsectionformat": "wiki", "inprop": "url", "titles": title,
        "redirects": 1, "format": "json"})
    r.raise_for_status()
    pages = r.json().get("query", {}).get("pages", {})
    for page in pages.values():
        text = _clean(page.get("extract", ""))
        if len(text) < 800 or _is_media(page.get("title", title), text):
            return None
        coords = (page.get("coordinates") or [{}])[0]
        return {"title": page.get("title", title), "url": page.get("fullurl", ""), "text": text,
                "lat": float(coords.get("lat", 0.0) or 0.0), "lng": float(coords.get("lon", 0.0) or 0.0)}
    return None


def ensure_topic(raw_topic: str):
    """Returns a topic key with sources loaded, or None if nothing usable was found."""
    query = (raw_topic or "").replace("_", " ").strip()
    if not query:
        return None
    key = "web_" + _slug(query)
    if key in _TOPICS:
        return key
    saved = _load_saved(key)
    if saved and _has_chunks(key):
        _remember(key, saved)
        return key

    try:
        titles = _search_titles(query)
    except Exception as e:
        print(f"[web_topic] search failed: {str(e)[:150]}")
        return None

    prefix = re.sub(r"[^A-Z]", "", query.upper())[:3] or "WEB"
    col = _collection()
    try:
        col.delete(where={"topic": key})
    except Exception:
        pass

    def _safe_fetch(title):
        try:
            return _fetch_page(title)
        except Exception as e:
            print(f"[web_topic] fetch failed for {title}: {str(e)[:120]}")
            return None

    with ThreadPoolExecutor(max_workers=6) as pool:
        pages = list(pool.map(_safe_fetch, titles[:6]))

    docs, total, seen_titles = [], 0, set()
    for page in pages:
        if len(docs) >= MAX_ARTICLES:
            break
        if not page or page["title"] in seen_titles or re.search(SKIP_TITLES, page["title"], re.I):
            continue
        seen_titles.add(page["title"])
        source_id = f"{prefix}{len(docs) + 1}"
        chunks = chunk_text(page["text"])[:MAX_CHUNKS_PER_ARTICLE]
        meta = {"source_id": source_id, "topic": key, "perspective": "historian",
                "source_type": "encyclopedia", "time_period": "", "subtopic": "", "subtopics": "",
                "title": page["title"], "url": page["url"],
                "location_label": page["title"] if page["lat"] else "",
                "lat": page["lat"], "lng": page["lng"]}
        ids = [f"chk_{key}_{source_id}_{i:03d}" for i in range(len(chunks))]
        col.add(ids=ids, documents=chunks, metadatas=[meta] * len(chunks))
        total += len(chunks)
        first = re.split(r"(?<=[.!?])\s", page["text"], maxsplit=1)[0]
        docs.append({"source_id": source_id, "title": page["title"], "url": page["url"],
                     "source_type": "encyclopedia", "perspective": "historian", "notes": first[:300]})

    if not docs:
        print(f"[web_topic] no usable sources for '{query}'")
        return None

    one_line = docs[0]["notes"]
    info = {"title": docs[0]["title"], "one_line": one_line[:160], "docs": docs}
    os.makedirs(_DATA_DIR, exist_ok=True)
    json.dump(info, open(os.path.join(_DATA_DIR, f"{key}.json"), "w"), indent=2)
    _remember(key, info)
    print(f"[web_topic] built '{key}': {len(docs)} articles, {total} chunks")
    return key


def topic_title(key: str) -> str:
    return (_TOPICS.get(key) or {}).get("title") or key.removeprefix("web_").replace("_", " ").title()


def doc_row(source_id: str) -> dict:
    return _DOCS.get(source_id, {})


def topic_info(key: str) -> dict:
    """Same shape as routers/topics.py TOPICS entries, for the frontend."""
    info = _TOPICS.get(key) or {}
    title = info.get("title") or topic_title(key)
    return {
        "topic_id": key,
        "title": title,
        "one_line": info.get("one_line", ""),
        "aliases": [title],
        "perspectives": [(p, *PERSPECTIVE_INFO[p]) for p in WEB_PERSPECTIVES if p != "narrator"],
    }

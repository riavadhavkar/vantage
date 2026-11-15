"""Any-event mode: research an event the team did not curate, then treat it like a topic.

Flow for a typed event such as "Pompeii":
  1. Gemini with Google Search finds 6-9 real sources and sorts them into three groups of people
     who saw the event differently (plus historians), and notes where the sources disagree.
  2. Each source page is downloaded and cleaned (trafilatura). If a page cannot be fetched, the
     search summary of it is used instead and marked as such.
  3. The text is chunked into the same ChromaDB collection under topic "live_<slug>", so the
     existing retriever, narrator, sources panel and graph work unchanged.

Perspective ids for a live topic are the generic slots side_a, side_b and side_c; their labels
and colors come from /api/topic. Disagreements found here are labeled as found by AI.
Owner: C (draft for A to review).
"""
import json
import re
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

SLOTS = ["side_a", "side_b", "side_c"]
SLOT_COLORS = ["#6F9BC4", "#C46C6C", "#C49A6C"]
HISTORIAN_COLOR = "#AEB4B1"
SOURCE_TYPES = {"primary", "secondary", "secondary_with_primary", "interpretive_first_person",
                "oral_history", "news", "encyclopedia"}
MAX_SOURCES = 9
MAX_CHARS_PER_SOURCE = 12000
MAX_CHUNKS_PER_SOURCE = 6
FETCH_TIMEOUT_S = 8

# topic_key -> {"title", "one_line", "perspectives": [(id, label, color, description)],
#               "sources": {source_id: {...}}, "contradictions": [...], "scene_anchor",
#               "opening_query", "location"}
LIVE = {}

_PROMPT = """You are the research desk for Vantage, an interactive documentary that tells one event
from several sides. Use Google Search to research this event: "{event}".

Find {n} real, reachable web sources about it. Prefer first-hand accounts (letters, diaries,
testimony, interviews, official reports, contemporary news) and add one or two reliable
overviews (historians, museums, encyclopedias). Only list pages you actually found in search.

Sort the people involved into exactly three groups who experienced or reported the event
differently (for Pompeii: Roman eyewitnesses, local families, modern archaeologists; for a
news event: people affected, officials, reporters). Give every source a group: 0, 1, 2, or
"historian" for overviews. Try to give each of the three groups at least two sources.

Then list up to three places where the sources disagree on a fact (a number, a time, a cause,
who did what). Use only disagreements that are really in the sources.

Reply with ONLY this JSON, no other text:
{{
  "title": "short title of the event",
  "one_line": "one sentence: what happened, where, when",
  "date_label": "when it happened, for example 24 August 79 CE",
  "location": {{"lat": 40.75, "lng": 14.49, "label": "Pompeii, Italy"}},
  "scene_anchor": "one sentence describing the setting for illustrations: place, era, clothing, weather",
  "groups": [
    {{"label": "Roman eyewitnesses", "description": "one line on who they are"}},
    {{"label": "...", "description": "..."}},
    {{"label": "...", "description": "..."}}
  ],
  "sources": [
    {{"title": "...", "url": "https://...", "group": 0, "source_type": "primary",
      "summary": "3 to 5 sentences of what this source says, in its own terms, with one short direct quote if it has one"}}
  ],
  "disagreements": [
    {{"claim": "what they disagree about", "a": {{"source": 0, "text": "what source 0 says"}},
      "b": {{"source": 3, "text": "what source 3 says"}}, "explanation": "one sentence on why they might differ"}}
  ]
}}
source_type is one of: primary, secondary, secondary_with_primary, interpretive_first_person,
oral_history, news, encyclopedia. In "disagreements", "source" is the index in "sources"."""


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", (text or "").lower()).strip("_")[:32] or "event"


def topic_key_for(event: str) -> str:
    return "live_" + slug(event)


def is_live(topic_key: Optional[str]) -> bool:
    return bool(topic_key) and topic_key in LIVE


def _parse_json(text: str) -> dict:
    text = (text or "").strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.S)
        if not m:
            raise
        return json.loads(m.group(0))


def _search(event: str) -> tuple:
    """Gemini + Google Search. Returns (plan dict, [(title, uri)] from grounding metadata)."""
    from google.genai import types
    from services.gemini_service import _client
    from config import GEMINI_TEXT_MODEL, GEMINI_FALLBACK_TEXT_MODEL

    cfg = types.GenerateContentConfig(tools=[types.Tool(google_search=types.GoogleSearch())])
    prompt = _PROMPT.format(event=event, n=MAX_SOURCES)
    last = None
    for model in (GEMINI_TEXT_MODEL, GEMINI_FALLBACK_TEXT_MODEL):
        try:
            r = _client.models.generate_content(model=model, contents=prompt, config=cfg)
            grounded = []
            try:
                meta = r.candidates[0].grounding_metadata
                for ch in (meta.grounding_chunks or []):
                    if getattr(ch, "web", None) and ch.web.uri:
                        grounded.append((ch.web.title or ch.web.uri, ch.web.uri))
            except Exception:
                pass
            return _parse_json(r.text), grounded
        except Exception as e:
            last = e
            print(f"[live] search with {model} failed: {str(e)[:200]}")
    raise last


def _fetch(url: str) -> str:
    """Download a page and return its main text, or "" if it cannot be read."""
    if not url or not url.startswith("http"):
        return ""
    try:
        import requests
        import trafilatura
        r = requests.get(url, timeout=FETCH_TIMEOUT_S, allow_redirects=True,
                         headers={"User-Agent": "Mozilla/5.0 (Vantage research desk)"})
        if r.status_code != 200 or "html" not in r.headers.get("content-type", "html"):
            return ""
        text = trafilatura.extract(r.text, include_comments=False, include_tables=False) or ""
        return text[:MAX_CHARS_PER_SOURCE]
    except Exception as e:
        print(f"[live] fetch failed {url[:80]}: {str(e)[:120]}")
        return ""


def _perspective_for(group) -> str:
    if isinstance(group, int) and 0 <= group < len(SLOTS):
        return SLOTS[group]
    if isinstance(group, str) and group.isdigit() and int(group) < len(SLOTS):
        return SLOTS[int(group)]
    return "historian"


def _index(topic_key: str, sources: dict, location: Optional[dict]) -> int:
    """Adds the live sources to ChromaDB under this topic. Returns the number of chunks."""
    from knowledge.ingest import chunk_text
    from knowledge import retriever

    col = retriever._collection()
    try:
        old = col.get(where={"topic": topic_key})
        if old and old.get("ids"):
            col.delete(ids=old["ids"])
    except Exception:
        pass
    total = 0
    for sid, s in sources.items():
        chunks = chunk_text(s["text"])[:MAX_CHUNKS_PER_SOURCE] or [s["text"]]
        meta = {
            "source_id": sid, "topic": topic_key, "perspective": s["perspective"],
            "source_type": s["source_type"], "time_period": "", "subtopic": "", "subtopics": "",
            "title": s["title"], "url": s.get("url") or "",
            "location_label": (location or {}).get("label", ""),
            "lat": float((location or {}).get("lat") or 0.0),
            "lng": float((location or {}).get("lng") or 0.0),
        }
        ids = [f"chk_{sid}_{i:03d}" for i in range(len(chunks))]
        col.add(ids=ids, documents=chunks, metadatas=[meta] * len(chunks))
        total += len(chunks)
    return total


def research(event: str) -> str:
    """Researches the event and registers it as a live topic. Returns the topic key.
    Raises if nothing usable was found."""
    key = topic_key_for(event)
    if key in LIVE:
        return key

    plan, grounded = _search(event)
    raw_sources = [s for s in (plan.get("sources") or []) if isinstance(s, dict)][:MAX_SOURCES]
    # If the model gave no usable URLs, fall back to the pages Google Search actually returned.
    if not any((s.get("url") or "").startswith("http") for s in raw_sources) and grounded:
        raw_sources = [{"title": t, "url": u, "group": "historian", "source_type": "secondary",
                        "summary": ""} for t, u in grounded[:MAX_SOURCES]]

    with ThreadPoolExecutor(max_workers=8) as pool:
        texts = list(pool.map(lambda s: _fetch(s.get("url") or ""), raw_sources))

    sources, index_to_id = {}, {}
    for i, (s, text) in enumerate(zip(raw_sources, texts)):
        summary = (s.get("summary") or "").strip()
        body = text.strip()
        if len(body) < 300:
            if not summary:
                continue
            body = f"(Summary from search; the page could not be loaded.) {summary}"
        sid = f"L{i + 1:02d}_{slug(event)[:12]}"
        st = (s.get("source_type") or "secondary").strip().lower()
        sources[sid] = {
            "source_id": sid,
            "title": (s.get("title") or "Untitled source").strip()[:160],
            "url": s.get("url") or None,
            "perspective": _perspective_for(s.get("group")),
            "source_type": st if st in SOURCE_TYPES else "secondary",
            "excerpt": (summary or body)[:400],
            "text": body,
        }
        index_to_id[i] = sid
    if len(sources) < 2:
        raise RuntimeError(f"live research found too few readable sources for {event!r}")

    groups = (plan.get("groups") or [])[:3]
    perspectives = []
    for i, slot in enumerate(SLOTS):
        g = groups[i] if i < len(groups) and isinstance(groups[i], dict) else {}
        perspectives.append((slot, (g.get("label") or f"Side {i + 1}").strip()[:40], SLOT_COLORS[i],
                             (g.get("description") or "").strip()[:160]))
    perspectives.append(("historian", "Historians and overviews", HISTORIAN_COLOR,
                         "Encyclopedias, museums and historians who weigh the accounts."))

    contradictions = []
    for d in (plan.get("disagreements") or [])[:3]:
        try:
            a, b = d["a"], d["b"]
            sa, sb = index_to_id.get(int(a["source"])), index_to_id.get(int(b["source"]))
        except (KeyError, TypeError, ValueError):
            continue
        if sa and sb and sa != sb:
            contradictions.append({
                "from_doc": sa, "to_doc": sb, "claim": (d.get("claim") or "The sources disagree").strip(),
                "a": (a.get("text") or "").strip(), "b": (b.get("text") or "").strip(),
                "note": (d.get("explanation") or "").strip(),
            })

    location = plan.get("location") if isinstance(plan.get("location"), dict) else None
    LIVE[key] = {
        "event": event,
        "title": (plan.get("title") or event).strip()[:80],
        "one_line": (plan.get("one_line") or "").strip()[:200],
        "date_label": plan.get("date_label") or None,
        "location": location,
        "scene_anchor": (plan.get("scene_anchor") or "").strip()[:300],
        "opening_query": f"{plan.get('title') or event} how it began first moments",
        "perspectives": perspectives,
        "sources": sources,
        "contradictions": contradictions,
    }
    try:
        n = _index(key, sources, location)
        print(f"[live] {event!r}: {len(sources)} sources, {n} chunks, {len(contradictions)} disagreements")
    except Exception as e:
        LIVE.pop(key, None)
        raise RuntimeError(f"could not index live sources: {e}") from e
    return key


def topic_title(key: str) -> str:
    """Topic line for the narrator, including what each side_* id means."""
    t = LIVE[key]
    sides = "; ".join(f"{pid} = {label} ({desc})" for pid, label, _, desc in t["perspectives"]
                      if pid in SLOTS)
    when = f", {t['date_label']}" if t.get("date_label") else ""
    return f"{t['title']}{when}. The perspective ids mean: {sides}"


def source(source_id: str) -> Optional[dict]:
    for t in LIVE.values():
        if source_id in t["sources"]:
            return t["sources"][source_id]
    return None

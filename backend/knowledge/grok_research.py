"""Grok web research for any-topic mode. Owner: A.
After the Wikipedia library is built (so the story can start right away), Grok searches the live
web in the background for different kinds of sources (primary documents, eyewitness accounts,
museum or scholarly pages, modern analysis) and adds them to the same topic library, so later
scenes and the "People who were there" lens draw on them. Only sources whose URL appears in
Grok's own search citations are kept.
"""
import json
import os
import re
import threading

import httpx

from config import XAI_API_KEY

RESEARCH_PROMPT = """Research this topic on the web: {topic}

Find 5 sources of DIFFERENT kinds, preferring: a primary document or official record, an eyewitness or
first-hand account, a museum, archive or university page, a scholarly or long-form history article, and
a modern analysis. Skip Wikipedia, films, games and fiction.

For each source give: title, url, publisher, kind ("primary" or "secondary"), voice ("eyewitness" if it is a
first-hand account, otherwise "historian"), and a faithful 120 to 200 word summary of what THAT source says,
keeping its own figures, dates and names, and noting anything it disputes.

Return ONLY a JSON array: [{"title": "...", "url": "...", "publisher": "...", "kind": "...", "voice": "...", "summary": "..."}]"""

_RUNNING = set()


def _urls_in(obj, out):
    """Collect every URL anywhere in the response (citations live in different places)."""
    if isinstance(obj, dict):
        for v in obj.values():
            _urls_in(v, out)
    elif isinstance(obj, list):
        for v in obj:
            _urls_in(v, out)
    elif isinstance(obj, str) and obj.startswith("http"):
        out.add(obj.rstrip("/"))
    return out


def _text_in(resp: dict) -> str:
    parts = []
    for item in resp.get("output", []) or []:
        for c in item.get("content", []) or []:
            if c.get("type") in ("output_text", "text") and c.get("text"):
                parts.append(c["text"])
    return "\n".join(parts) or resp.get("output_text", "")


def _search(topic: str):
    last = None
    for model in (os.getenv("XAI_TEXT_MODEL") or "grok-4.3", "grok-4.20-0309-non-reasoning"):
        try:
            r = httpx.post("https://api.x.ai/v1/responses",
                           headers={"Authorization": f"Bearer {XAI_API_KEY}"},
                           json={"model": model, "include": ["no_inline_citations"],
                                 "input": [{"role": "user", "content": RESEARCH_PROMPT.replace("{topic}", topic)}],
                                 "tools": [{"type": "web_search"}]},
                           timeout=120)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            last = e
            print(f"[grok_research] {model} failed: {str(e)[:150]}")
    raise last


def research(key: str, topic: str, prefix: str, add_docs) -> None:
    """Runs in a background thread. add_docs(list_of_docs) stores them in the topic library."""
    try:
        resp = _search(topic)
        text = _text_in(resp)
        text = re.sub(r"^```(json)?|```$", "", text.strip()).strip()
        start, end = text.find("["), text.rfind("]")
        items = json.loads(text[start:end + 1]) if start != -1 and end != -1 else []
        cited = _urls_in(resp, set())
        docs = []
        for it in items:
            url = (it.get("url") or "").strip()
            summary = (it.get("summary") or "").strip()
            if not url.startswith("http") or len(summary) < 200 or "wikipedia.org" in url:
                continue
            if cited and url.rstrip("/") not in cited:
                # Grok's citations are the ground truth; keep only sources it actually visited.
                continue
            docs.append({"title": (it.get("title") or url)[:160], "url": url,
                         "publisher": (it.get("publisher") or "")[:80],
                         "source_type": "primary" if (it.get("kind") or "").lower() == "primary" else "secondary",
                         "perspective": "townspeople" if (it.get("voice") or "").lower() == "eyewitness" else "historian",
                         "text": summary})
        if docs:
            add_docs(docs)
            print(f"[grok_research] added {len(docs)} web sources to '{key}'")
        else:
            print(f"[grok_research] no usable web sources for '{key}'")
    except Exception as e:
        print(f"[grok_research] failed for '{key}': {str(e)[:200]}")
    finally:
        _RUNNING.discard(key)


def start(key: str, topic: str, prefix: str, add_docs) -> None:
    if key in _RUNNING or not XAI_API_KEY:
        return
    _RUNNING.add(key)
    threading.Thread(target=research, args=(key, topic, prefix, add_docs), daemon=True).start()

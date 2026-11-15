"""Wolfram|Alpha as a live source for viewer questions. Owner: A.
When a viewer asks something computable (the moon that night, a distance, someone's age,
old money in today's dollars), turn the question into a precise Wolfram query using the story
context, compute it, and hand the result to the narrator as one more source. The source shows
up in the sources panel as "Wolfram|Alpha computation" with a link to the same query.
"""
import json
import re
from urllib.parse import quote_plus

import httpx

from config import XAI_API_KEY
from services import gemini_service, wolfram_service

COMPUTABLE = re.compile(
    r"\b(moon|sun|sunrise|sunset|dark|distance|how far|miles|km|kilometers|how old|age|aged|"
    r"today'?s (dollars|money)|worth today|in today|inflation|convert|temperature|cold|weather|"
    r"speed|knots|how fast|how long|how many days|population|day of the week|what day)\b", re.I)

REWRITE_PROMPT = """You turn a viewer's question about a documentary into ONE precise Wolfram|Alpha query.
Use the story context to fill in exact dates, places and names. Wolfram computes astronomy (moon phase,
sunrise), distances between places, ages of people on dates, currency of a year in today's US dollars,
unit conversions, days of the week. If the question cannot be computed that way, return null.
Return ONLY JSON: {"query": "..."} or {"query": null}.

STORY: {topic}
RECENT SCENES: {history}
QUESTION: {question}"""

_count = 0


def _ask_llm(prompt: str) -> dict:
    """Fast non-reasoning model first (about a second), the normal text chain as a fallback."""
    try:
        r = httpx.post("https://api.x.ai/v1/chat/completions",
                       headers={"Authorization": f"Bearer {XAI_API_KEY}"},
                       json={"model": "grok-4.20-0309-non-reasoning", "temperature": 0,
                             "messages": [{"role": "user", "content": prompt}]}, timeout=15)
        r.raise_for_status()
        text = r.json()["choices"][0]["message"]["content"]
        text = re.sub(r"^```(json)?|```$", "", text.strip()).strip()
        return json.loads(text)
    except Exception:
        return gemini_service.generate_json(prompt) or {}


def chunk_for(question: str, topic: str, history: list):
    """Returns a chunk dict the narrator can use as a source, or None."""
    global _count
    if not question or not wolfram_service.is_configured() or not COMPUTABLE.search(question):
        return None
    prompt = (REWRITE_PROMPT.replace("{topic}", topic or "")
              .replace("{history}", " | ".join((history or [])[-3:])[:900])
              .replace("{question}", question))
    try:
        q = (_ask_llm(prompt) or {}).get("query")
    except Exception as e:
        print(f"[wolfram_context] rewrite failed: {str(e)[:120]}")
        return None
    if not q:
        return None
    answer = wolfram_service.query(q)
    if not answer:
        return None
    _count += 1
    source_id = f"WA{_count}"
    url = "https://www.wolframalpha.com/input?i=" + quote_plus(q)
    title = f"Wolfram|Alpha computation: {q}"
    try:
        from knowledge import web_topic
        web_topic._DOCS[source_id] = {"source_id": source_id, "title": title, "url": url,
                                      "source_type": "secondary", "perspective": "historian",
                                      "notes": f"Computed by Wolfram|Alpha: {answer}"}
    except Exception:
        pass
    return {"chunk_id": f"chk_{source_id}", "source_id": source_id, "title": title,
            "perspective": "historian", "source_type": "computation", "url": url,
            "text": f"Wolfram|Alpha computed this exactly. Query: {q}. Answer: {answer}.",
            "lat": 0.0, "lng": 0.0, "location_label": ""}

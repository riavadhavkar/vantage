"""/api/voice/lookup: grounded answers for the ElevenLabs phone agent (webhook tool). Owner: A.
POST {"topic": "...", "question": "..."} -> {"answer": "...", "sources": ["..."], "topic": "..."}
Same knowledge as the web app: curated sources for Titanic and Princeton, a Wikipedia library
(plus background Grok web research) for any other topic, and Wolfram|Alpha for computable questions.
The answer is short and written to be spoken aloud.
"""
import re

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

from config import XAI_API_KEY
from knowledge import retriever
from knowledge.catalog import resolve_topic
from services import gemini_service

router = APIRouter()
TOPIC_TITLES = {"princeton": "the Battle of Princeton, January 1777",
                "titanic": "the sinking of the Titanic, April 1912"}

PROMPT = """You are Vantage, a calm documentary narrator speaking on a phone call about {title}.
Answer the caller's question using ONLY the SOURCES. Rules:
- 2 or 3 short spoken sentences, under 70 words, no lists, no symbols, no URLs.
- Concrete names, places, dates and numbers exactly as the sources give them.
- If the sources disagree, say so in one sentence.
- If the sources do not cover it, say the record is thin.
- Never invent quotes or first-person accounts.

SOURCES:
{sources}

CALLER ASKED: {question}"""


class VoiceLookup(BaseModel):
    topic: str = ""
    question: str = ""


def _topic_key(topic: str):
    key = resolve_topic(topic)
    if key:
        return key, TOPIC_TITLES.get(key, topic)
    from knowledge import web_topic
    key = web_topic.ensure_topic(topic)
    return key, (web_topic.topic_title(key) if key else topic)


def _speak(prompt: str) -> str:
    """Fast model first (about a second), the normal text chain as a fallback."""
    try:
        r = httpx.post("https://api.x.ai/v1/chat/completions",
                       headers={"Authorization": f"Bearer {XAI_API_KEY}"},
                       json={"model": "grok-4.20-0309-non-reasoning", "temperature": 0.2,
                             "messages": [{"role": "user", "content": prompt}]}, timeout=20)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"[voice] fast model failed, falling back: {str(e)[:120]}")
        return gemini_service.generate_text(prompt).strip()


@router.post("/voice/lookup")
def voice_lookup(body: VoiceLookup):
    topic = (body.topic or body.question or "").strip()
    question = (body.question or f"Give a short overview of {topic}").strip()
    print(f"[voice] lookup topic={topic!r} question={question!r}")
    if not topic:
        return {"answer": "Which event would you like to hear about?", "sources": [], "topic": None}

    key, title = _topic_key(topic)
    chunks = []
    if key:
        try:
            chunks = retriever.search(key, question, None, [], k=5)
        except Exception as e:
            print(f"[voice] retrieval failed: {str(e)[:150]}")
    try:
        from services import wolfram_context
        computed = wolfram_context.chunk_for(question, title, [])
        if computed:
            chunks = [computed] + chunks
    except Exception as e:
        print(f"[voice] wolfram failed: {str(e)[:120]}")

    if not chunks:
        return {"answer": f"I could not find reliable sources about {topic} yet, so the record is thin.",
                "sources": [], "topic": key}

    sources = "\n\n".join(f"[{c['source_id']}] {c.get('title', '')}: "
                          + " ".join((c.get("text") or "").split())[:600] for c in chunks)
    try:
        answer = _speak(PROMPT.replace("{title}", title).replace("{sources}", sources)
                        .replace("{question}", question))
    except Exception as e:
        print(f"[voice] answer failed: {str(e)[:150]}")
        answer = "I hit a snag looking that up. Could you ask again?"
    answer = re.sub(r"[*_#`\[\]]+", "", answer).replace("\u2014", ", ")
    names = list(dict.fromkeys((c.get("title") or "").split(":")[0][:60] for c in chunks))[:3]
    return {"answer": answer, "sources": names, "topic": key}

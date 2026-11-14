"""/api/photon/chat: short iMessage-style answers from the same knowledge base. Owner: A.
Called by photon/bot.mjs, which receives iMessages through Photon Spectrum.
"""
import re
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from knowledge.catalog import resolve_topic
from knowledge import retriever
from services import gemini_service

router = APIRouter()

_CHATS = {}  # sender_id -> {"topic": str or None, "history": [(question, answer)]}

TOPIC_NAMES = {
    "princeton": "the Battle of Princeton (January 1777)",
    "titanic": "the sinking of the Titanic (April 1912)",
}
INTRO = (
    "Hi, I'm Vantage, an interactive documentary engine. I tell history from several "
    "perspectives using real primary sources, and I point out where those sources disagree. "
    "Text TITANIC or PRINCETON to pick a story, then ask me anything about it. "
    "The full cinematic version, with narration, maps and illustrations, lives in the web app."
)
INTRO_TRIGGERS = ("what is this", "what does this", "what can you", "who are you",
                  "what is vantage", "how does this work")


class PhotonChatRequest(BaseModel):
    sender_id: str
    text: str


class PhotonChatResponse(BaseModel):
    reply: str
    topic: Optional[str] = None


def _clean(text: str) -> str:
    text = re.sub(r"[*_#`]+", "", text or "")
    return text.replace(" \u2014 ", ", ").replace("\u2014", ", ").strip()


def _short(title: str) -> str:
    title = (title or "").split("(")[0].strip()
    return title if len(title) <= 45 else title[:42].rstrip() + "..."


@router.post("/photon/chat", response_model=PhotonChatResponse)
def photon_chat(body: PhotonChatRequest):
    chat = _CHATS.setdefault(body.sender_id, {"topic": None, "history": []})
    text = body.text.strip()
    low = text.lower()

    if low in ("hi", "hello", "hey", "help", "start", "menu", "?") or any(t in low for t in INTRO_TRIGGERS):
        return PhotonChatResponse(reply=INTRO, topic=chat["topic"])

    new_topic = resolve_topic(text)
    if new_topic and new_topic != chat["topic"]:
        chat["topic"], chat["history"] = new_topic, []
        if len(text.split()) <= 3:
            text = f"Give me a short overview of {TOPIC_NAMES[new_topic]}."

    topic = chat["topic"]
    if not topic:
        return PhotonChatResponse(reply=INTRO)

    try:
        chunks = retriever.search(topic, text, k=4)
    except Exception as e:
        print(f"[photon] retrieval failed: {str(e)[:150]}")
        chunks = []

    sources = "\n\n".join(
        f"[{c['source_id']}] {c.get('title')}: " + " ".join(c["text"].split())[:600] for c in chunks
    ) or "(no sources found)"
    history = "\n".join(f"Q: {q}\nA: {a}" for q, a in chat["history"][-3:]) or "(none)"

    prompt = (
        f"You are Vantage, texting someone about {TOPIC_NAMES[topic]}.\n\n"
        f"SOURCES:\n{sources}\n\nEARLIER IN THIS CHAT:\n{history}\n\n"
        f"THEY JUST TEXTED: {text}\n\n"
        "Reply over iMessage in a warm, clear voice with standard spelling and punctuation (no slang):\n"
        "- 2 to 4 short sentences, under 80 words, plain text, no markdown, no lists, no em dashes.\n"
        "- Use only facts from the SOURCES. If they do not cover it, say the record is thin.\n"
        "- State numbers exactly as the sources give them. Never combine two numbers into a new claim.\n"
        "- If sources disagree, say so in one sentence.\n"
        "- End with one short follow-up question offering another angle or perspective."
    )
    try:
        answer = _clean(gemini_service.generate_text(prompt))
    except Exception as e:
        print(f"[photon] generation failed: {str(e)[:150]}")
        answer = "I hit a snag looking that up. Try again in a moment."

    titles = list(dict.fromkeys(_short(c.get("title")) for c in chunks))[:2]
    reply = answer + (f"\n\nSources: {'; '.join(titles)}" if titles else "")
    chat["history"].append((body.text, answer))
    return PhotonChatResponse(reply=reply, topic=topic)

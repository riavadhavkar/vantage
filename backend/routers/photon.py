"""/api/photon/chat: iMessage answers from the same knowledge base. Owner: A.
Called by photon_bot.py. Two modes:
- Linked: the viewer texted "VANTAGE 1234" from the web app. Their phone joins that web session,
  so questions and choices continue the SAME documentary (and show up on the web graph).
- Unlinked: short grounded Q&A about a topic.
"""
import re
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from enums import Mode
from knowledge.catalog import resolve_topic
from knowledge import retriever
from services import gemini_service
from state import session_store

router = APIRouter()

_CHATS = {}  # sender_id -> {"topic", "history", "session_id"}

TOPIC_NAMES = {
    "princeton": "the Battle of Princeton (January 1777)",
    "titanic": "the sinking of the Titanic (April 1912)",
}
INTRO = (
    "Hi, I'm Vantage, an interactive documentary engine. I tell history from several "
    "perspectives using real primary sources, and I point out where those sources disagree. "
    "Text TITANIC or PRINCETON to pick a story, then ask me anything about it. "
    "Watching on the web? Text the VANTAGE code on your screen to continue your documentary here."
)
INTRO_TRIGGERS = ("what is this", "what does this", "what can you", "who are you",
                  "what is vantage", "how does this work")
LINK_RE = re.compile(r"^\s*(?:vantage\s*)?#?(\d{4})\s*$", re.I)


class PhotonChatRequest(BaseModel):
    sender_id: str
    text: str


class PhotonChatResponse(BaseModel):
    reply: str
    topic: Optional[str] = None
    session_id: Optional[str] = None


def _clean(text: str) -> str:
    text = re.sub(r"[*_#`]+", "", text or "")
    return text.replace(" \u2014 ", ", ").replace("\u2014", ", ").strip()


def _short(title: str) -> str:
    title = (title or "").split("(")[0].strip()
    return title if len(title) <= 45 else title[:42].rstrip() + "..."


def _format_segment(seg) -> str:
    lines = [seg.title, "", _clean(seg.narrative_text)]
    if seg.contradiction:
        c = seg.contradiction
        lines += ["", f"Sources disagree: {c.side_a.text} vs {c.side_b.text}"]
    if seg.choices:
        lines += ["", "Reply with a number:"]
        lines += [f"{i}. {ch.label}" for i, ch in enumerate(seg.choices, 1)]
    return "\n".join(lines)


def _linked_reply(chat: dict, text: str) -> Optional[PhotonChatResponse]:
    """Continue the linked web session. Returns None if the link is gone."""
    from agents.orchestrator import run_pipeline  # local import avoids a cycle at startup
    state = session_store.get_viewer_state(chat["session_id"])
    if state is None:
        chat["session_id"] = None
        return None

    low = text.strip().lower()
    choices = list(state.get("offered_choices", {}).values())
    choice_id = None
    if low.isdigit() and choices and 1 <= int(low) <= len(choices):
        choice_id = choices[int(low) - 1]["choice_id"]
    elif low in ("next", "continue", "go on", "more") and choices:
        choice_id = choices[0]["choice_id"]

    seg = (run_pipeline(state["session_id"], choice_id=choice_id, mode=Mode.IMESSAGE) if choice_id
           else run_pipeline(state["session_id"], question=text, mode=Mode.IMESSAGE))
    if seg is None:
        return PhotonChatResponse(reply="I lost track of that documentary. Text TITANIC or PRINCETON to start fresh.")
    return PhotonChatResponse(reply=_format_segment(seg), topic=state.get("topic_key"),
                              session_id=state["session_id"])


LANG_WORDS = {"english": "en", "hindi": "hi", "spanish": "es", "espanol": "es", "español": "es",
              "french": "fr", "francais": "fr", "français": "fr"}
LANG_NAMES_EN = {"en": "English", "hi": "Hindi", "es": "Spanish", "fr": "French"}


def _lang_request(low: str):
    """Returns a language code if the text asks to switch language, else None."""
    for word, code in LANG_WORDS.items():
        if word in low and (len(low.split()) <= 5 or any(k in low for k in ("write", "speak", "reply", "switch", "talk", " in "))):
            return code
    return None


@router.post("/photon/chat", response_model=PhotonChatResponse)
def photon_chat(body: PhotonChatRequest):
    chat = _CHATS.setdefault(body.sender_id, {"topic": None, "history": [], "session_id": None})
    text = body.text.strip()
    low = text.lower()

    # 1. Linking a web session: "VANTAGE 4821" or just "4821"
    m = LINK_RE.match(text)
    if m:
        state = session_store.get_session_by_code(m.group(1))
        if state is None:
            return PhotonChatResponse(reply="I could not find that code. Check the number on your screen and try again.")
        chat["session_id"] = state["session_id"]
        chat["topic"] = state.get("topic_key") or resolve_topic(state["topic"])
        history = state.get("history", [])
        last = history[-1].split(":")[0] if history else "the opening"
        n = len(history)
        reply = (f"Linked to your documentary on {TOPIC_NAMES.get(chat['topic'], 'your topic')}. "
                 f"You've watched {n} segment{'s' if n != 1 else ''}, most recently: {last}. "
                 "Ask me anything, or text NEXT to keep going.")
        offered = list(state.get("offered_choices", {}).values())
        if offered:
            reply += "\n\nOr reply with a number:\n" + "\n".join(
                f"{i}. {c['label']}" for i, c in enumerate(offered, 1))
        return PhotonChatResponse(reply=reply, topic=chat["topic"], session_id=state["session_id"])

    if low in ("hi", "hello", "hey", "help", "start", "menu", "?") or any(t in low for t in INTRO_TRIGGERS):
        return PhotonChatResponse(reply=INTRO, topic=chat["topic"], session_id=chat["session_id"])

    if low in ("unlink", "stop", "reset"):
        chat.update(topic=None, history=[], session_id=None)
        return PhotonChatResponse(reply="Unlinked. Text TITANIC or PRINCETON to start a new story.")

    # 2. Linked to a web session: continue that exact documentary
    if chat["session_id"]:
        code = _lang_request(low)
        linked_state = session_store.get_viewer_state(chat["session_id"])
        if code and linked_state is not None:
            linked_state["language"] = code
            return PhotonChatResponse(reply=f"Switched to {LANG_NAMES_EN[code]}. Ask me anything, or text NEXT to keep going.",
                                      topic=chat["topic"], session_id=chat["session_id"])
        linked = _linked_reply(chat, text)
        if linked:
            return linked

    # 3. Unlinked Q&A
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

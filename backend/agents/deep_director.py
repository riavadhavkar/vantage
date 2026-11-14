"""Deep mode: a Director agent (LangChain deepagents) that plans the next segment and delegates to
Researcher, Narrator and Fact-Checker sub-agents. Owner: A.
Returns the same cleaned dict as NarratorAgent.run, plus the chunks the tools retrieved.
"""
import time
from typing import List, Optional

from pydantic import BaseModel, Field
from deepagents import create_deep_agent
from langchain.agents.structured_output import ToolStrategy
from langchain_google_genai import ChatGoogleGenerativeAI

from config import GEMINI_API_KEY, GEMINI_TEXT_MODEL
from enums import Mood, ChoiceType
from agents.narrator_agent import _pick, _slugify
from knowledge import retriever, graph

MOODS = [m.value for m in Mood]
CHOICE_TYPES = [c.value for c in ChoiceType]


class DeepChoice(BaseModel):
    label: str = Field(description="Under 8 words")
    perspective: str
    choice_type: str


class DeepLocation(BaseModel):
    lat: float
    lng: float
    label: str


class DeepSegment(BaseModel):
    slug: str = Field(description="short_snake_case id")
    title: str = Field(description="Under 8 words")
    narrative_text: str = Field(description="3 to 5 sentences, 60 to 110 words, spoken narration")
    perspective: str
    mood: str
    scene_prompt: str = Field(description="One visual sentence for an illustration, no real names")
    location: Optional[DeepLocation] = None
    date_label: Optional[str] = None
    source_ids: List[str] = Field(default_factory=list)
    choices: List[DeepChoice] = Field(default_factory=list)


def _model():
    import os
    provider = os.getenv("VANTAGE_DEEP_PROVIDER", "xai").lower()
    if provider == "xai":
        from langchain_xai import ChatXAI
        from config import XAI_API_KEY, XAI_TEXT_MODEL
        return ChatXAI(model=XAI_TEXT_MODEL or "grok-4.20-0309-non-reasoning",
                       xai_api_key=XAI_API_KEY, temperature=0.6)
    return ChatGoogleGenerativeAI(model=GEMINI_TEXT_MODEL, google_api_key=GEMINI_API_KEY,
                                  temperature=0.6)


def run(topic_key: str, topic_title: str, history: list, action: str, query: str,
        perspective: Optional[str], perspectives: list, seen_chunk_ids: list) -> tuple:
    """Returns (cleaned segment dict, retrieved chunks, trace list)."""
    collected = []
    trace = []

    def search_sources(query: str, perspective: str = "") -> str:
        """Search this documentary's source library. Returns passages, each starting with its
        source id in square brackets. perspective is optional and must be one of the listed
        perspectives (never a source id). Leave it empty to search everything."""
        trace.append(f"search_sources({query!r}, {perspective!r})")
        if sum(1 for t in trace if t.startswith("search_sources")) > 6:
            return "Search limit reached. Work with the passages you already have."
        if perspective and perspective not in perspectives:
            perspective = ""
        exclude = list(seen_chunk_ids) + [c["chunk_id"] for c in collected]
        found = retriever.search(topic_key, query, perspective or None, exclude, k=4)
        collected.extend(found)
        if not found:
            return "No passages found."
        return "\n\n".join(
            f"[{c['source_id']}] ({c.get('perspective')}, {c.get('source_type')}) {c.get('title')}: "
            + " ".join(c["text"].split())[:700]
            for c in found)

    def find_contradictions(source_ids: List[str]) -> str:
        """Look up documented disagreements between sources (from the curated edges file) for the
        given source ids. Use this to check whether the record is contested."""
        trace.append(f"find_contradictions({source_ids})")
        edges = graph.contradictions_between(source_ids)
        if not edges:
            return "No documented disagreements for these sources."
        return "\n".join(f"{e['from_doc']} vs {e['to_doc']}: {e.get('note', '')}" for e in edges)

    persp = ", ".join(perspectives)
    researcher = {
        "name": "researcher",
        "description": "Finds the best source passages for an angle of the story. Give it the "
                       "angle and, if relevant, a perspective. It returns facts with source ids.",
        "system_prompt": (
            f"You research {topic_title} for a documentary. Use search_sources one to three times "
            f"with different queries. Perspectives available: {persp}. Return 5 to 8 short facts, "
            "each tagged with its source id like [D03]. Only report what the passages say."),
        "tools": [search_sources],
    }
    narrator = {
        "name": "narrator",
        "description": "Writes the spoken narration for one segment from facts you give it. "
                       "Give it the facts with source ids, the perspective and what the viewer did.",
        "system_prompt": (
            "You are a calm documentary narrator. Write 3 to 5 sentences, 60 to 110 words, "
            "concrete people, places and dates, no lists, no markdown, no em dashes. Use only the "
            "facts given. When sources disagree, say so plainly. Return just the narration."),
        "tools": [],
    }
    fact_checker = {
        "name": "fact_checker",
        "description": "Checks a draft narration against the sources and flags unsupported claims "
                       "and documented disagreements. Give it the draft and the source ids used.",
        "system_prompt": (
            "You verify documentary narration. Use search_sources to confirm claims and "
            "find_contradictions on the source ids. Reply with: VERIFIED or a list of claims to "
            "remove or soften, plus any documented disagreement worth mentioning."),
        "tools": [search_sources, find_contradictions],
    }

    director_prompt = (
        f"You are the Director of Vantage, an interactive documentary about {topic_title}.\n"
        "Your job is to produce the NEXT segment. Work in this order:\n"
        "1. Delegate to the researcher with the angle the viewer asked for.\n"
        "2. Delegate to the narrator with the researcher's facts, the perspective and the viewer's action.\n"
        "3. Delegate to the fact_checker with the draft and its source ids. Apply its corrections.\n"
        "4. Return the final segment.\n"
        "Rules: do not repeat what the viewer already saw. "
        f"perspective and each choice perspective must be one of: {persp}. "
        f"mood must be one of: {', '.join(MOODS)}. "
        f"choice_type must be one of: {', '.join(CHOICE_TYPES)}. Give 2 or 3 choices, "
        "at least one perspective_shift. source_ids are the ids you actually used. "
        "The final narrative_text must be 3 to 5 sentences and at most 110 words, with no em dashes and no cliches. "
        "Name officers and roles exactly as the sources do.")

    agent = create_deep_agent(
        model=_model(),
        tools=[search_sources, find_contradictions],
        system_prompt=director_prompt,
        subagents=[researcher, narrator, fact_checker],
        response_format=ToolStrategy(DeepSegment),
        name="vantage_director",
    )

    seen = "\n".join(f"- {h}" for h in history) or "- Nothing yet. This is the opening."
    task = (f"Already seen:\n{seen}\n\nViewer action: {action}\n"
            f"Suggested search angle: {query}\n"
            f"Requested perspective: {perspective or 'any'}")

    t0 = time.time()
    result = agent.invoke({"messages": [{"role": "user", "content": task}]},
                          config={"recursion_limit": 40})
    raw = result.get("structured_response")
    if raw is None:
        raise RuntimeError("director returned no structured_response")
    raw = raw.model_dump() if hasattr(raw, "model_dump") else dict(raw)
    trace.append(f"done in {time.time() - t0:.1f}s")
    print("[deep] trace:", " | ".join(trace))

    retrieved_ids = {c["source_id"] for c in collected}
    used = [s for s in raw.get("source_ids") or [] if s in retrieved_ids]
    if not used:
        used = list(dict.fromkeys(c["source_id"] for c in collected))[:3]

    choices, seen_ids = [], set()
    for c in (raw.get("choices") or [])[:3]:
        label = (c.get("label") or "").strip()
        cid = "ch_" + _slugify(label)
        if not label or cid in seen_ids:
            continue
        seen_ids.add(cid)
        choices.append({"choice_id": cid, "label": label,
                        "perspective": _pick(c.get("perspective"), perspectives, "narrator"),
                        "choice_type": _pick(c.get("choice_type"), CHOICE_TYPES, "what_next")})

    cleaned = {
        "slug": _slugify(raw.get("slug") or raw.get("title")),
        "title": (raw.get("title") or "Untitled").strip(),
        "narrative_text": (raw.get("narrative_text") or "").replace(" \u2014 ", ", ")
                          .replace("\u2014", ", ").replace("\u2013", "-").strip(),
        "perspective": _pick(raw.get("perspective"), perspectives, "narrator"),
        "mood": _pick(raw.get("mood"), MOODS, "neutral"),
        "scene_prompt": (raw.get("scene_prompt") or "").strip(),
        "location": raw.get("location"),
        "date_label": raw.get("date_label") or None,
        "source_ids": list(dict.fromkeys(used)),
        "choices": choices,
    }
    return cleaned, collected, trace

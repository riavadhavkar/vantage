"""Wolfram|Alpha LLM API: exact, computed facts (conversions, distances, astronomy, dates). Owner: A.
Needs WOLFRAM_APP_ID in .env (free App ID from developer.wolframalpha.com, choose the LLM API).
"""
import os

import httpx

import config  # noqa: F401  (loads .env)

LLM_API = "https://www.wolframalpha.com/api/v1/llm-api"


def is_configured() -> bool:
    return bool(os.getenv("WOLFRAM_APP_ID"))


def _result_line(text: str) -> str:
    """Pull the main answer out of the LLM API's plain-text report (the lines under "Result:")."""
    lines = [l.strip() for l in (text or "").splitlines()]
    for i, line in enumerate(lines):
        if line.lower().startswith("result:"):
            parts = [line.split(":", 1)[1].strip()]
            for nxt in lines[i + 1:i + 4]:
                if not nxt:
                    break
                parts.append(nxt)
            clean = [p.strip(" |") for p in parts if p.strip(" |")]
            if clean:
                return ", ".join(clean)
    for line in lines:
        if line and not line.lower().startswith(("query:", "input interpretation:", "wolfram")):
            return line.strip(" |")
    return ""


def query(question: str, max_chars: int = 1200):
    """Returns a short computed answer, or None if Wolfram has no answer."""
    app_id = os.getenv("WOLFRAM_APP_ID")
    if not app_id or not question:
        return None
    try:
        r = httpx.get(LLM_API, params={"input": question, "appid": app_id, "maxchars": max_chars},
                      headers={"User-Agent": "curl/8.4.0", "Accept": "*/*"}, timeout=20)
        if r.status_code != 200:
            print(f"[wolfram] {r.status_code} for {question!r}: {r.text[:120]}")
            return None
        answer = _result_line(r.text)
        return answer[:220] or None
    except Exception as e:
        print(f"[wolfram] failed for {question!r}: {str(e)[:150]}")
        return None

"""Wolfram|Alpha LLM API: exact, computed facts (conversions, distances, astronomy, dates). Owner: A.
Needs WOLFRAM_APP_ID in .env (free App ID from developer.wolframalpha.com, choose the LLM API).
"""
import os
import re

import httpx

import config  # noqa: F401  (loads .env)

LLM_API = "https://www.wolframalpha.com/api/v1/llm-api"


def is_configured() -> bool:
    return bool(os.getenv("WOLFRAM_APP_ID"))


def _result_line(text: str) -> str:
    """Pull the main answer out of the LLM API's plain-text report.
    The report is a list of sections ("Query:", "Input interpretation:", "Result:", "Age:" ...).
    Prefer "Result", otherwise take the first section that is not an echo of the question."""
    sections, cur = [], None
    for raw in (text or "").splitlines():
        line = raw.strip()
        if not line:
            cur = None
            continue
        m = re.match(r"^([A-Za-z][^:|]{0,60}):\s*(.*)$", line)
        if cur is None and m:
            cur = [m.group(1).strip().lower(), []]
            sections.append(cur)
            if m.group(2):
                cur[1].append(m.group(2))
        elif cur is not None:
            cur[1].append(line)

    def clean(parts):
        bits = [p.strip(" |") for p in parts[:3] if p.strip(" |")]
        return ", ".join(bits)

    skip = ("query", "input", "assumption", "wolfram", "image", "unit conversion")
    for name, parts in sections:
        if name.startswith("result") and clean(parts):
            return clean(parts)
    for name, parts in sections:
        if not name.startswith(skip) and clean(parts):
            return clean(parts)
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
        print(f"[wolfram] ok {question!r} -> {answer[:100]}")
        return answer[:220] or None
    except Exception as e:
        print(f"[wolfram] failed for {question!r}: {str(e)[:150]}")
        return None

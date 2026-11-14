# Handoff: let media endpoints look up segments server-side

**Who:** Person A (owns `backend/state/session_store.py` and `backend/agents/orchestrator.py`)
**Why:** `/api/image` and `/api/tts` spend paid credits. Today they must trust the `scene_prompt`, `text` and `voice_id` the browser sends, because the server keeps only segment ids. With a lookup, the media router uses the server's own copy and ignores client text, and per-session rate limits start working.

**Exact change**

1. In `orchestrator.run_pipeline`, after `segment = Segment(**data)`, store it:
   ```python
   state.setdefault("segments", {})[segment.segment_id] = segment.model_dump(mode="json")
   ```
2. In `session_store.py`, add:
   ```python
   def find_segment(segment_id: str):
       for state in _SESSIONS.values():
           seg = state.get("segments", {}).get(segment_id)
           if seg:
               return seg
       return None
   ```

`backend/routers/media.py` already calls `session_store.find_segment` when it exists (via `getattr`), so nothing else changes. Segment ids must stay in the `seg_<slug>` format (lowercase letters, digits, underscores), which `_unique_id` already produces.

**Also, small**
- `.env.example` and `config.py` define `XAI_API_KEY` and `XAI_IMAGE_MODEL` twice.
- Media tests need `pytest` (dev only). Run from `backend/`: `python -m pytest tests -q`.

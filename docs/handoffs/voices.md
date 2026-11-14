# Handoff: narrator voices for the 8 perspectives

**From:** Ria (Person B, media)
**To:** Kashish (Person A, owns `backend/config.py`)
**Status:** approved by Ria on 2026-11-14

## What to change

Fill `VOICE_BY_PERSPECTIVE` in `backend/config.py` with these ElevenLabs stock voice IDs:

```python
VOICE_BY_PERSPECTIVE = {
    "narrator": "JBFqnCBsd6RMkjVDRZzb",      # George: warm, captivating storyteller
    "historian": "XrExE9yKIg1WjnnlVkGX",     # Matilda: knowledgeable, professional
    "american": "nPczCjzI2devNBz1zQrb",      # Brian: deep, resonant
    "british": "onwK4e9ZLuTAKqWW03F9",       # Daniel: steady broadcaster
    "townspeople": "EXAVITQu4vr4xnSDxMaL",   # Sarah: mature, reassuring
    "crew": "pqHfZKP75CvOlQylNhV4",          # Bill: wise, mature, balanced
    "first_class": "pFZP5JQG7iQjIQuC4Bku",   # Lily: velvety, confident
    "steerage": "SAz9YHcvj6GT2YYXdXww",      # River: relaxed, neutral
}
```

## Why these

- All eight are ElevenLabs **premade (stock)** voices. No cloned voices, and none imitating a real person.
- Every perspective has its own voice, so the voice change on a perspective switch is always audible.
  - Titanic: George, Matilda, Bill, Lily, River.
  - Princeton: George, Matilda, Brian, Daniel, Sarah.
- No accent is used to caricature a community. Third-class passengers came from dozens of countries, so `steerage` uses a neutral voice (River) rather than imitating any one accent.
- Character voices in the account (trickster, warrior, sassy, hyped) and the one non-stock "professional" voice were left out.

## Notes

- `/api/topic` already returns `voice_id` from this dict, and `/api/tts` uses the segment's `voice_id`, so nothing else needs to change.
- The ElevenLabs key itself is not in this file and should never be posted in chat. Each person keeps it in their own `.env`.
- Voice IDs are not secret; they are safe to commit.

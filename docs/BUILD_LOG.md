# Build log

Append only. Newest entries at the bottom.

## 2026-11-13 22:40, Person B (frontend), phases F0 to F5 first pass

**What changed**

- `frontend/DESIGN.md`: design plan and self-review (tokens, type, wireframes, motion, principles).
- Scaffold: Vite 7, React 18, Tailwind v4 (`@tailwindcss/vite`, tokens in the `@theme` block of `src/index.css` and in `src/constants/theme.js`), Motion (`motion/react`), React Flow (`@xyflow/react`), Leaflet, self-hosted fonts via `@fontsource`.
- Landing: focus-pull triptych with the wordmark cut across three vantage panels, one load sequence, topic field, examples, `topic_not_supported` suggestions.
- Player: stage with graded procedural scenes and AI images, iris perspective pull (260 ms close, 180 ms hold for the grade and voice swap, 260 ms open), typewriter captions, choices after narration, lens rail, paper source panel, source pins, contradiction film tear, grounding details, ungrounded fallback, knowledge graph (lazy), story map with offline drawn chart (lazy), voice input, ambient player, sound and narration controls.
- `src/api/client.js` (all fetches), `src/api/mockServer.js` (mocks and demo), `src/api/normalize.js` (contract tolerance).
- Mocks: Titanic (primary) and Battle of Princeton (backup), built from `documents.csv` and `edges.csv` (doc ids, titles, URLs, perspective ids).
- `scripts/sync-demo.mjs` (copies `demo/` into `public/demo/` before dev and build), `scripts/screenshots.mjs` (Playwright, 390 / 768 / 1440).

**Overrides of the original plan**

- Tokens `vantage-charcoal`, `vantage-cream`, `vantage-gold` and fonts Lora, Inter, Playfair are replaced by: `prussian #0A1E30`, `developer #12304A`, `print #EEF0EA`, `fog #9FB0BF`, `fiber #D9D8CC`, `safelight #D2402F`; Gloock (display), Source Serif 4 (narration), Hanken Grotesk (interface), Courier Prime (documents on paper only).
- Perspective colors come from `GET /api/topic` at runtime. There are no `persp-*` classes. Each grade (duotone ends, AA text tint, excerpt mark) is computed in `theme.js`.
- `FADE_MS 700`, `STAGGER_MS 200`, `TYPE_SPEED_MS 30` kept. Added `PULL_*` and `DEVELOP_MS`.

**Decisions and why**

- Focus pull never animates blur: each panel crossfades a sharp layer and a pre-blurred layer. Grades are blend-mode layers over a grayscale print (GPU friendly on phones).
- Removed the "Drawn scene" label on the stage after the screenshot critique: a procedural drawing is not AI and the label covered evidence pins.
- Demo, mock and offline modes are always labeled in the UI ("Cached demo, not live", "Sample content for development, not live", "Offline mode").
- Mock excerpts are the team's notes, labeled "SAMPLE: Summary from the team source list, not a quotation." No invented quotations.

**Contract gaps found after merging main (need Person A, decision for all three)**

1. `Perspective` enum in `backend/enums.py` and `frontend/src/constants/enums.js` lists Partition-era values (`british_raj`, `refugee`...). The data uses `american`, `british`, `townspeople`, `crew`, `first_class`, `steerage`, `historian`. The frontend treats perspectives as data and does not depend on the enum, but the backend will reject these values in Pydantic.
2. `Segment` on main has no `claims`, `is_grounded`, `grounding_notes`. The UI needs them for "How this was grounded", source pins per claim, and the ungrounded fallback. Until then the frontend falls back to `source_ids` and treats a missing `is_grounded` as true.
3. `connected_to` is a list on main and a string in the brief. The frontend accepts both.
4. `Source` on main has no `license` or `attribution`. The panel hides those rows when null.
5. No `GET /api/topic` and no `Topic` schema yet. Until it exists, the frontend derives perspectives from segments and sources and colors them from a neutral print palette. Landing examples need it.
6. `TtsRequest.voice_id` is required on main; mock voice ids are placeholders.

**For Person C (data and demo)**

- `documents.csv` uses `source_type` values outside the enum: `secondary_with_primary`, `interpretive_first_person`, `official_modern`, `press_1912`. The mocks map them to `secondary`, `secondary`, `primary`, `news`. Interpretive first-person sheets (D13, D24, D25, D26) should probably be tagged in the UI as interpretation; that needs a field or an enum value.
- T08 Beesley is tagged `first_class` but he travelled second class (the note says so). The mock labels that perspective "Cabin passengers".
- `demo/demo_path.json` format the frontend plays: an array of story bundles, each `{ topic, sources, segments, start_segment_id, routes: { choice_id: segment_id } }`, with cached `image_url` and `audio_url` set on segments (paths relative to `demo/`, for example `cache/ti-1.mp3`). An empty array falls back to the bundled sample path, still labeled as cached.

**Blockers and dead ends**

- None blocking. Map tiles (CARTO dark) need network; demo and offline modes use the drawn chart and make no tile requests.

**Next**

- Integration checkpoint against the real backend once `/start`, `/next-segment`, `/sources` and `/topic` respond.
- Real cached media from Person C for demo mode; voice ids from Person B's ElevenLabs service.
- Ambient tracks in `frontend/public/ambient/<mood>.mp3` (the control says "No ambient track" until they exist).

## 2026-11-13 23:05, Person B (frontend), integration checkpoint

**What changed**

- Merged main with Person A's mock `/api/start`, `/api/next-segment` and `/api/ask`. Ran the backend locally (only fastapi, uvicorn, pydantic, python-dotenv, in a throwaway venv) and drove the frontend in live mode against it.

**Result**

- Live mode works end to end: start, choose, and the contradiction on the second segment all render. No offline fallback is triggered while `/api/health` answers.
- With no `/api/topic`, the lens rail derives perspectives from the data (`narrator`, `british_raj`, `refugee`). This confirms gap 1 from the previous entry: the backend mocks are still Partition content, while the demo topics are Titanic and Princeton.
- `/api/sources`, `/api/tts`, `/api/image` return 404 (`{"detail": "Not Found"}`, not `{error_code, message}`). The UI shows the sources error state, captions only, and drawn scenes, as designed.

**Next**

- Person A: `/api/topic`, `/api/sources`, and `error_code` on 404s; perspective enum for Titanic and Princeton.
- Person B (me): `/api/tts` and `/api/image` in `backend/routers/media.py` with ElevenLabs.

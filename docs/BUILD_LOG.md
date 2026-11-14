# Build log

(This branch started the file; `b/ui-redesign` has its own copy with earlier entries. Merge the two by keeping both sets of entries.)

## 2026-11-14 13:55 EST. UI: sketch layout and language support (Person B)

**Branch:** `b/ui-sketch` in `../vantage-sketch`, from `b/graph-ui` at `60a18ce`. Not pushed. The sketch layout replaces the current player (Ria's decision).

**Changes**

- Language plumbing: `getLanguages`, `startSession(topic, language)`, `translateText`; mock server support; `useLanguageSettings`, `useSubtitleText` (cache by segment and language, abort on segment change, original text kept on failure); Noto Sans Devanagari self-hosted.
- Two native selects (narration, subtitles) on the landing page and in a player settings popover; narration change asks to restart the story.
- Player rebuilt to the sketch: wordmark and bold animated date, ask pill with shuffling placeholder and mic, centered title, five Lucide icons with tooltips, AI badge (`both | image | voice`), sentence-by-sentence subtitles with a transcript, points-of-view timeline with ticks, choices as a row above the subtitles, grounding inside the sources panel.
- Dependencies added: `lucide-react`, `@fontsource/noto-sans-devanagari`.

**Backend finding:** `/api/languages`, `/api/translate` and `language` on `/api/start` are not in this branch's backend; they are on `origin/a/languages`. I read that branch (fetch only, no merge) for the contract. `/api/tts` needs no language parameter. The backend was not running, so the live endpoints were not called.

**Verified**

- Lint and build pass at each commit. Keyboard-only flow, reduced motion, placeholder rotation and pause, choices, contradiction, ungrounded, restart flow, demo mode with zero requests beyond the dev server, offline fallback. Screenshots at 390, 768 and 1440 in `frontend/screenshots/sketch-*`. Details in `docs/handoffs/sketch-languages.md`.

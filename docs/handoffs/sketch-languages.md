# Handoff: sketch layout and language support

> **Update, after the merge with main: the sketch now targets the v2 interface (`?ui=v2`), which is the one that needed the redesign.** The first pass (below) rewrote the *classic* player; it is still on this branch and still works at `/`, but v2 is the real target. Everything in "What changed" below applies to both unless it says v2.
>
> **v2 pass (`src/v2/`)**
> - `v2/Player.jsx`: top HUD (lowercase wordmark and bold rolling date | ask pill and title | share, story connections, map, sources, sound and a chevron for language settings, with the ai badge under them), subtitles above the lens ring, choices as a centered pill row, the existing disagreement card (text label, `≠` icon and red rule, not color alone), the "not grounded" notice, v2's own share card for the share icon, transcript sheet.
> - `v2/LensRing` is the timeline "keep as is": only labels changed (lowercase, unheard dimmer, in focus bold; the ticks were already there). Done in `v2/sketch.css`, not in the component.
> - Removed from v2: `Captions.jsx` and `claims.js` (the caption card with inline cited-sentence underlines and evidence chips). The sources panel (`Evidence`) still opens the grounding view. The "Jump to" button is gone (no sixth icon); Cmd/Ctrl+K still opens the palette. Ambient sound and the phone link moved into the settings popover.
> - `v2/Landing.jsx`: the two selects sit under the topic field.
> - `v2/ui.jsx` `AiBadge` now has `both | image | voice`; `Frame` no longer draws its own badge (the HUD derives it from image and voice state).
> - Classic components reused inside v2 (they pick up v2 colors because `.v2` re-points the color tokens): `AskPill`, `Subtitles`, `LanguageSelects`, `SettingsPopover` (v2 trigger variant), `Ungrounded`.
> - Scripts: `scripts/sketch-v2-shots.mjs` (screenshots `sketch-v2-*`), and `UI=v2 node scripts/sketch-verify.mjs` runs the behavior checks against v2. All checks pass on v2: keyboard (tab order now starts at the wordmark), reduced motion, placeholder rotation and pause, choices, contradiction, ungrounded, restart flow, demo (0 requests beyond the dev server), offline fallback.
> - v2 contrast (worst case, pure white image behind the scrims; computed from the gradients): subtitles 8.4 to 13.8, date 13.1, title 10.5 to 12.3, ai badge 16.2, ring unheard labels 8.2.
> - Not lowercased in v2: the landing page text, the Evidence (sources) sheet headings, and the Cmd+K palette. Only the player chrome in the sketch is lowercase.

**Branch:** `b/ui-sketch` (worktree `../vantage-sketch`), based on `b/graph-ui` at `60a18ce`. Not pushed.
**Decision from Ria:** the sketch layout replaces the current player. No flag, no classic fallback in this branch.

## What changed

- **L1 language plumbing.** `getLanguages()`, `startSession(topic, language)`, `translateText(text, target)` in `src/api/client.js`. The mock server has a four-language list, accepts `language` on start, and translates to `SAMPLE [<code>]: <text>`. `useLanguageSettings` (narration + subtitle language, localStorage in try/catch). `useSubtitleText` (in-memory cache by segment and language, aborts in-flight requests, keeps the original while loading, never blocks narration). Noto Sans Devanagari self-hosted through `@fontsource`. `lang` on subtitle, transcript and option text.
- **L2 dropdowns.** `LanguageSelects` (two labeled native selects) on the landing page under the Begin buttons, and in a settings popover opened by a chevron next to the sound button (no sixth icon). A narration change asks "restart the story in <language>?" first, then starts a new session in that language. Subtitle changes apply immediately.
- **L3 player.** Full-bleed stage. Top-left wordmark and bold date (300 ms roll, fade only under reduced motion). Top-center ask pill with a mic and a crossfading placeholder, title under it. Top-right five icons (share, story connections, map, sources, sound) with tooltips and aria-labels, AI badge under them. Subtitles above the timeline. Timeline strip at the bottom with tick marks. Lucide icons throughout (one set, stroke 1.75). `.chrome` utility lowercases interface chrome only.
- **Verification scripts** (committed): `frontend/scripts/sketch-shots.mjs`, `frontend/scripts/sketch-verify.mjs`.

## How to review

```
cd ../vantage-sketch/frontend
VITE_VANTAGE_USE_MOCKS=1 npm run dev -- --port 5175     # open http://localhost:5175
node scripts/sketch-shots.mjs                            # regenerates the screenshots
```
Try: Begin, open the chevron next to the sound icon, set subtitles to spanish (mock output is `SAMPLE [es]: ...`), change narration to confirm the restart prompt. Ask "Did she break in two?" for the contradiction view. Ask nonsense for the ungrounded notice. `?demo=1` (without mocks) for demo mode.

## Screenshots (`frontend/screenshots/`)

- Landing with dropdowns: `sketch-landing-{390,768,1440}.png`
- Player layout: `sketch-player-{390,768,1440}.png`
- Subtitle language switch (spanish, mock): `sketch-subtitles-es-{390,768,1440}.png`
- Hindi text rendering: `sketch-hindi-{390,768,1440}.png`. The mock never invents content, so the script injects a generic Devanagari sentence into the subtitle slot. It tests the font fallback, not the translation.
- Extra states: `sketch-choices-*`, `sketch-contradiction-*`, `sketch-ungrounded-*`, `sketch-demo-1440`, `sketch-offline-1440`.

## Decisions I made

1. **"Timeline, keep as is" = the points-of-view rail.** The current app has no segment timeline. The only strip with "in focus" / "not heard yet" is `LensRail`, whose strings match the sketch notes. So `TimelineStrip` is that rail restyled: lowercase labels, not-heard dimmer (fog), heard normal, focused bold, tick marks above. Same data, same click behavior (`selectLens`).
2. **Backend text is never lowercased** (titles, date label, narration, subtitles, perspective data used as choice labels). The date label stays in its original case. The perspective names in the timeline and the placeholder ("ask about the british regulars") are lowercased because they are chrome there.
3. **Subtitle timing.** Text is split into sentences, and long ones at a comma or space (about 84 characters, two lines max). Each chunk gets time in proportion to its length over `audio_duration_ms` (from segment, `/tts` response, or the audio element's metadata), else text length x the typing speed. The clock resyncs to zero when audio first plays and pauses when the viewer pauses. Subtitles off still runs the clock, so choices still appear after narration.
4. **Placement of things the sketch omits.** Choices: centered pill row above the subtitles after narration ends. Contradiction: full card above the choices, with a text label "Sources disagree", a red dot and a rule (not color alone). Ungrounded: a bordered "not grounded" notice in the subtitle area, never subtitle styling, with "try another point of view". Errors and loading: centered above the subtitles. Play/pause: small round button under the subtitles. "How this was grounded": first section of the sources panel, also linked from the transcript. Ambient sound and the phone link moved into the settings popover. The offline/demo data-source note sits under the date (desktop) or under the title (mobile).
5. **AI badge.** `AiBadge` is now `both | image | voice`, derived from what is actually present (image ready, server voice playing). A device voice is not labeled "ai narration" (it says "device voice"). `GradedImage` no longer draws its own badge, so the label lives in the HUD only.
6. **Demo and offline.** Fixed four-language list, narration pinned to english (cached story), narration select disabled, subtitle languages disabled except english, with a hint ("offline demo: narration stays in english and subtitle translation is off"). No translate calls.
7. **Landing placement.** The topic field is a collapsed search icon in the header, so the selects sit in the hero under the Begin buttons.
8. **Subtitle default** is "same as narration". Narration language is pinned to the session at start.
9. **Sound state** persists in `localStorage` (`vantage.sound`).

## Open questions

- Should the date label be lowercased too (the sketch is all lowercase)? I followed the rule that backend text is untouched.
- Is "timeline = points-of-view rail" what you meant? If you meant a segment-by-segment story path, that is a different component (the graph already has that data).
- Tab order starts with the evidence pins on the stage (they come first in the DOM), before the wordmark. Say if you want the HUD first.
- Share has no share card in this repo. It uses the Web Share API with a copy-link fallback and shares `window.location.href`, which is the app root (there are no per-story URLs yet).
- The mic sits inside the pill and Enter submits. There is no visible send button, as in the sketch.

## Backend assumptions

- **This branch's backend has no language support.** `/api/languages`, `/api/translate` and `language` on `/api/start` exist only on `origin/a/languages` (fetched read-only; nothing merged). The contract I coded to comes from there: `GET /api/languages` -> `{languages: [{code, name}]}`; `POST /api/start {topic, language?}` (default `en`); `POST /api/translate {text, target}` -> `{text, target}`, `400 language_not_supported`, `502 translate_failed`; `/api/tts` takes **no** language parameter, so none is sent.
- Against a backend without those routes the app still works: `/languages` failure falls back to the four languages, `language` is ignored by start, and a failed translate shows "subtitles unavailable" with the original text.
- Live backend check: `curl localhost:8000/api/health` was refused (backend not running), so `/api/languages` and `/api/translate` were **not** tested against the real server. Only the mock.

## Verification

- `npm run lint` and `npm run build` pass at every commit. No console errors in mock mode. In offline mode the only console errors are the browser's own failed `/api/health` probe.
- Keyboard only: tab order covers wordmark, ask input, mic, five icons, chevron, transcript, timeline. The popover opens with Enter and closes with Escape (focus returns to the chevron). Narration change prompts and restarts.
- Reduced motion: placeholder stays on "ask about this" and the date uses a fade. Normal motion: the placeholder cycles every 4 s through "ask about this" and one phrase per perspective, and pauses while focused.
- `?demo=1`: only the dev server was contacted (0 other origins, 0 API calls). Without a backend (offline fallback): `/api/health` is probed, then the cached demo plays.
- Contrast, worst case with a pure white image behind the scrims: subtitles about 6.5:1 (white on the blended scrim), AI badge 12.9:1, timeline "not heard" 6.7:1, placeholder 6.2:1, data-source note 7.6:1. Top HUD, after strengthening the top scrim (it was 4.4:1 for the date and 2.6:1 for the mobile title in the first pass): date 8.9:1 to 9.6:1, mobile title 4.9:1, tablet title 7.7:1. These are computed from the scrim gradients at each element's position, not measured from pixels; a real image is usually darker than white, so they are lower bounds.

## Merge notes

`origin/main` (62 commits, including `b/ui-redesign` PR #35 and the tighter-shots work) is merged into this branch. Conflicts and how they were resolved:

- `App.jsx`: kept the language and sound wiring, added main's `?ui=v2` switch. The v2 interface gets the same session and callbacks, but **has no language or subtitle controls**; that is not done.
- `Player.jsx`: kept the sketch layout and ported main's changes: graph nodes reopen an earlier scene (`viewedId`, `thumbs`, `onSelectNode` now also closes the sheet), multi-shot `imageUrls`, and the "typed" state keyed by scene (the subtitle completion flag uses it).
- `Stage.jsx`: kept the full-bleed stage and ported main's multi-shot rotation paced to the narration. `GradedImage` still draws no badge; the HUD badge is the label.
- `useNarration.js`: took main's version and re-added `audioDurationMs`.
- `package.json` and the lockfile: main's versions plus `@fontsource/noto-sans-devanagari`. `lucide-react` was already on main.
- `docs/BUILD_LOG.md`: main's file with this branch's entry appended.
- Main's default is still classic with `?ui=v2` opt-in, and classic is what this branch rewrote. Nothing else in main touches the player.
- Still true: the language backend (`/api/languages`, `/api/translate`, `language` on start) is only on `origin/a/languages`, not on main.
- Files removed here: `NarrativeCard.jsx`. Added: `Subtitles`, `TimelineStrip`, `AskPill`, `IconButton`, `SettingsPopover`, `LanguageSelects`, `Ungrounded`, `lib/{share,chunkText,aiKind}.js`, `hooks/{useLanguageSettings,useSubtitleText}.js`.

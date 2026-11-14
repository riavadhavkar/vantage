# Build log

Append only. Newest entry at the bottom. Never edit past entries.

## 2026-11-14 08:57 EST. UI redesign, phase 1: explore four directions (Person B)

Started 08:25, finished 08:57 (32 minutes of a 75 minute box).

**What I found first**

- `CLAUDE.md`, `docs/BUILD_LOG.md` and `vantage-web-prompt.md` did not exist. This file is new.
- The branch `b/ui-redesign` did not exist. I created it from `b/graph-ui` (clean, at `40c58e6`).
- `frontend/DESIGN.md` describes a serif, three-panel landing page. The code has moved on from it: the shipped UI is Geist only, with a streaming-style home screen. I treated the code and screenshots as the truth.
- In the existing `screenshots/contradiction-390.png` the contradiction panel is empty on a phone (both accounts missing). Not fixed here, since classic is out of scope for this phase. Worth a look before the demo.

**What changed**

- `frontend/src/lab/`: four live prototypes (Aperture, Editorial, Diff, Stories), a shared story hook, OKLCH color helpers, shared trust labels, and a lab index. All lazy chunks.
- `frontend/src/main.jsx`: one branch. `/lab`, `/lab/<id>` or `?lab=<id>` mounts the lab. Every other URL renders the app exactly as before.
- `frontend/scripts/lab-shots.mjs`: screenshots for every prototype, view and width. It fails loudly on console errors, horizontal overflow, or any network call.
- `frontend/design/DIRECTIONS.md`: briefs, palettes with computed contrast, wireframes, scores, recommendation.
- `frontend/package.json`: added `lucide-react`, `@fontsource-variable/archivo`, `@fontsource-variable/newsreader`, `@fontsource-variable/bricolage-grotesque` (all on the allowed list, all self-hosted).
- `frontend/eslint.config.js`: turned off the fast-refresh export rule for `src/lab/` only.
- `frontend/.gitignore`: `design/screens/` is ignored (10 MB of PNGs, regenerable), matching how `screenshots/` is already handled.

Not touched: `src/api/`, `src/mocks/`, `src/constants/enums.js`, any component, any hook, demo mode.

**How I verified it**

- `npm run lint`: clean. `npm run build`: passes. The main bundle is the same size (401.7 kB); the lab adds separate chunks only.
- `node scripts/lab-shots.mjs`: 48 screenshots (4 prototypes, 4 views, 390 / 768 / 1440), no console errors, no horizontal overflow, no network calls.
- A scripted click-through of each prototype at 1440 and 390: start, finish typing, make a choice, switch perspective, open evidence, close with Escape, reach the next scene. All eight runs passed. This covers Diff's Ctrl+K palette and Enter to start, Stories' arrow keys and image export (a PNG was downloaded), and Aperture's ring by keyboard.
- Reduced motion: each prototype loads and reaches its contradiction with no errors.
- Classic app at `/?demo=1` still loads with no errors.
- Contrast: computed for every fixed pair and for the derived perspective colors of all 8 perspectives in both sample topics. One miss found and fixed (Aperture secondary text on worst-case glass, 4.4 to 5.0).

**Not verified**

- Frame rate on a real mid-range phone. Only desktop Chromium was used.
- Safari and Firefox. Editorial's signature uses the View Transitions API and falls back to a plain swap without it.
- Screen readers. Roles and live regions are in place but untested with VoiceOver.

**Decisions and why**

- Prototypes use the existing mock server and mock bundle, so async states are real and no contract can drift.
- The illustration and the voice are simulated in the lab (the procedural scene stands in for an AI image; there is no audio). This is stated at the top of `DIRECTIONS.md`.
- Trust wording lives in one shared file so no direction can reword a label.
- Diff letters the two accounts A and B instead of minus and plus, because minus and plus would imply one account replaced the other.
- Recommendation: Aperture as the base, with Editorial's paper and type for all evidence. Reasons are in `DIRECTIONS.md`.

**Blockers**

None.

**Next**

Waiting for a pick (one direction, a hybrid, or notes). Then phase 2: `frontend/design/PLAN.md`. I need to know how many hours are available today to size the tiers.

## 2026-11-14 08:59 EST. Note: this working tree is shared (Person B)

While phase 1 was running, commit `46c5591` (`docs: voice mapping handoff for the 8 perspectives`, 08:41) was made from another session in this same checkout. Because I had switched the checkout to `b/ui-redesign`, it landed here first; `b/graph-ui` and `origin/b/graph-ui` now point at it too. Nothing was lost and none of the lab work was pushed. `b/ui-redesign` is `46c5591` plus the lab commit, local only.

Risk: two sessions sharing one checkout will keep moving each other's branch. For phase 3, the redesign should move to its own git worktree unless the other session is done.

## 2026-11-14 09:45 EST. UI redesign, phase 2: fixes, motion foundation, plan (Person B)

Started 09:11, finished 09:45.

**Decision received:** Aperture, evidence on Editorial's paper, plus the share card and the Cmd+K palette with lettered A/B accounts. Modern sans throughout, small mono for metadata. Unattended build 11:15 to 15:45.

**Fixes asked for before planning**

- Worktree: the main checkout (`/Users/ria/Documents/vantage`) was on `b/ui-redesign`, which blocks `git worktree add`. I switched it back to `b/graph-ui` (it was clean), then ran `git worktree add ../vantage-ui b/ui-redesign`. My untracked screenshots moved with me. The main checkout is clean and untouched since. All work from here is in `../vantage-ui`.
- Classic contradiction panel at 390 px: **screenshot timing, not a bug.** The accounts reveal when scrolled into view (350 ms delay, 550 ms fade) and the script shot 300 ms after scrolling. Measured opacity: 0 at 300 ms, 0.97 at 700 ms, 1 at 1,500 ms. Scrolling in 120 px steps revealed each side once 40% of it was on screen. Fixed the wait in `scripts/screenshots.mjs` and re-ran all classic screenshots with no errors.
- Speech: classic already has a device speech fallback (`lib/speech.js`, used by `useNarration` when server audio fails, labeled "AI narration" and "Device voice"). Tested with a stubbed synthesizer: first scene spoke with one voice, the scene after a perspective switch with another. While testing I saw that an exception from the synthesizer would take the whole player down through the error boundary, so `startSpeech` now catches it and carries on with captions. No backend change.
- `DESIGN.md`: not replaced yet. It is the first step of the build once the plan is approved.
- `CLAUDE.md`: not created.

**What changed**

- `src/constants/theme.js` and `src/index.css`: motion tokens (durations 120 / 200 / 320 / 600 / 900, signature 700, stagger 60, three easings, one spring). In CSS they sit in `@theme static`, because Tailwind drops unused theme variables otherwise and inline styles need them.
- `src/lib/motionMode.js`: `?motion=slow` (3x) and `?motion=off` (instant), with helpers for timers, Motion durations and springs.
- `/lab/motion`: a bench that plays every token.
- `scripts/fps.mjs`: frame intervals under CPU throttling.
- `frontend/design/PLAN.md` and `frontend/design/MOTION.md`.

**How I verified it**

- Lint clean, build passes, classic loads at `/?demo=1` with no errors.
- Flags: the same bench row took 740 ms at normal speed, 2,241 ms with `?motion=slow`, 55 ms with `?motion=off`.
- Frame rate baseline on the phase 1 Aperture prototype at 4x CPU: 52 fps average at 1440 (4 of 84 frames over 33 ms, none over 50), 60 fps at 390. Headless Chromium on this laptop, not a phone.
- Claim-to-sentence matching tried on both sample topics: 29 of 38 claims match one sentence confidently.
- View Transitions support checked against Chrome's documentation: Chrome 111, Safari 18, Firefox 144.

**Not verified**

- Real audio. Headless Chromium reports zero installed voices, so the voice change was checked through a stub, not by ear.
- Safari and Firefox.

**Decisions and why**

- Dev server for the worktree runs on port 5174 so it does not collide with the other session's 5173.
- The first bench run showed the tokens were missing at normal speed; cause was Tailwind dropping unused theme variables. Fixed with `@theme static` and re-measured.
- Open decisions for Ria are listed in PLAN.md section 8.

**Blockers**

None.

**Next**

Waiting for approval of PLAN.md and MOTION.md. Build starts at 11:15.

## 2026-11-14 11:08 EST. UI redesign, phase 3: hourly entry 1, Tier 1 built (Person B)

Build started 10:10 (Ria said to start early), an hour ahead of the planned 11:15.

**Answers from Ria before starting:** a few live checks against the backend are allowed (at most 5); AI illustrations stay in color with a faint tint; underline only confident claim matches; serif for excerpts only.

**Requests that arrived during the build, all done**

- Ken Burns on illustrations (teammate): classic already panned them, but the easing put most of the move in the first 3 seconds. Applied the teammate's values to the existing keyframes (scale 1 to 1.08 over 24 s, ease-in-out). Verified on a mock illustration: scale 1.0108 after 6 s, and the move restarts on a new scene.
- Map tiles (Ria): CARTO now needs a key. Switched `StoryMap` to OpenStreetMap tiles with attribution; 21 tiles loaded with HTTP 200. The tiles are light, so the tile layer is inverted to a dark map. Also fixed two things I saw while testing: the map did not resize in full view, and a single place at sea opened on an empty ocean (now zoom 5).
- "Push the changes once you finish": pushed `b/ui-redesign` at 10:22. It was merged to main as PR #28.
- "Keep checking main and pull": merged main four times so far (voices, colorful images, transcribe, storyboard). All clean.

**Tier 1, in the order built (one commit each, lint and build passing)**

1. Foundation and landing: `?ui=v2` switch, token re-pointing, primitives, load sequence, pointer focus.
2. Stage and captions: three depth bands, illustration develop-in with badge, title card, word-level reveal, claim underlines, speaking indicator.
3. Lens ring and the perspective switch on one clock, coverage rings, choices, ask.
4. Evidence paper and pins, with the travelling chip and highlighter.
5. Disagreement view: split frame, accounts A and B, one pulse.
6. States: error, waiting, offline, ungrounded, end of thread; graph and map in the new sheet.
7. Performance pass on the switch.

**Storyboard (new on main during the build).** `useNarration` now returns several shots per scene. The v2 frame cuts between them every 4 s like classic, and only ever shows shots that have loaded, so a failed image cannot blank the frame.

**How I verified it**

- `scripts/v2-flow.mjs`: the whole demo path at 1440 and 390 (begin, pin to evidence and Escape, switch by ring, switch by choice, contradiction, end of thread) with no console errors and no network calls.
- `scripts/v2-states.mjs`: 9 of 9 scenarios pass (ungrounded, error with retry, failed switch returns to focus, offline badge, unknown topic, image failure keeps the drawn scene with no badge, image arrival shows the badge, graph, map).
- Frame rate at 4x CPU throttle (`scripts/fps.mjs`, headless Chromium on this laptop, not a phone):

  | Case | 1440 | 390 |
  | --- | --- | --- |
  | Landing load | 56 fps, 2 frames over 50 ms (at first paint) | 59.7 fps, none over 33 ms |
  | Perspective switch | 52 to 54 fps, 1 to 3 frames over 33 ms, none over 50 (three runs) | 60 fps, none over 17 ms |
  | Choice in the same view | 49.8 fps, 3 over 33, none over 50 | 60 fps |
  | Pin to evidence | 57.7 fps, 2 over 33, 1 over 50 | 59.5 fps |
  | Contradiction | 60 fps | 60 fps |

  The desktop switch started at 37 fps with 11 frames over 33 ms. Three changes fixed it: the duotone is baked into drawn scenes (no blend layers), the out-of-focus copy is a 256 px pre-blurred bitmap, and glass stops blurring while the frame changes.
- Slow-motion frame sequence of the switch saved as `design/screens/signature-1440-*ms.png`, named by real elapsed time. Checked: soft at 279 ms, new scene crossfading in under the blur at 398 ms, no sharp frame in between.

**Bugs found in classic and fixed there (classic is the fallback)**

- With "reduce motion" on, classic never showed the choices, so the story could not continue. A reset effect ran after the card had reported "done". Verified fixed with and without the setting.
- Speech start could crash the player (fixed earlier today).

**Decisions made alone, and why**

- Coverage ring is binary: it draws the first time a view is heard, and the count is in the label. A proportional ring has no honest denominator, since the topic does not say how many scenes a view has.
- A tap on the text finishes it; a sentence opens its source only once all the text is there. Otherwise "tap to skip" and "tap the underline" collide.
- The ring shows each point of view once. Copies outside the current turn are hidden.
- Highlighter sweeps all lines of an excerpt together, not line by line (MOTION.md row 27 said line by line). Per-line timing needs measuring line breaks; not worth the risk.
- Storyboard pacing (4 s) is not scaled by `?motion=slow`: it is content pacing, not interface motion.

**Not verified**

- Real voices and real illustrations. The backend is not answering on :8000, so the live checks Ria allowed have not been possible yet.
- Safari and Firefox.

**Needs Ria**

- Start the backend on :8000 if the live checks should happen.

**Next**

Second critique pass on Tier 1 screens, then Tier 2: share card, Cmd+K palette, graph motion, map motion.

## 2026-11-14 11:50 EST. UI redesign, phase 3: hourly entry 2, Tier 2 built and verified (Person B)

**Built since the last entry (one commit each, lint and build passing)**

- Share card: a 1080 by 1350 PNG drawn on a canvas, develops like a photograph, counts roll up. Export tested at 1440 and 390 (a file was downloaded both times).
- Cmd+K palette: tested by keyboard only (filter, switch view, open the map by typing "map", Escape).
- Graph motion in a v2 copy of the graph (nodes grow in, edges draw, camera glides out, current node breathes twice).
- Map motion in a v2 copy of the map: the marker travels only when a scene has `travel_from`. Tested on the drawn chart and on live tiles.
- From main (merged twice more, one conflict in the classic player resolved by keeping both changes): shots paced to the narration, graph nodes that reopen an earlier scene, real thumbnails in the graph.

**Bugs found by the second critique pass and the verification script, all fixed**

- The "Jump to" button was styled by a stylesheet that loads only with the palette, so it rendered unstyled and crowded the phone bar.
- Focus could leave an open sheet through a closed details block.
- With reduced motion the blurred copy of the wordmark stayed on top of the sharp one.
- On tablets the ring's faded edges let scrolling text show through.
- Graph node buttons could not be clicked (React Flow disables pointer events on nodes that cannot be dragged).

**How I verified it**

- `v2-flow.mjs --runs 5`: the demo path passed 10 of 10 times (5 at 1440, 5 at 390), no console errors, no network calls. Also passes with `?motion=off` and with the OS reduced-motion setting.
- `v2-states.mjs`: 12 of 12 scenarios at 1440, and all pass at 390.
- `v2-verify.mjs`: keyboard only, touch targets (all at least 44 px at 390), reduced motion, loops paused, layout shift 0.011 and 0.007 on the production build.
- `fps.mjs`, final numbers in MOTION.md. The perspective switch is inside the budget. Three desktop cases are not: landing load (two long frames at first paint), a choice in the same view (6 frames over 33 ms), opening the share card (one 133 ms frame).
- Classic: `scripts/screenshots.mjs` runs clean after every merge; choices appear with and without reduced motion.

**Decisions made alone, and why**

- A graph thumbnail that is an AI illustration gets a small sparkle badge and a legend line in v2. main shows those thumbnails in classic with no label; the trust rule says every generated image is labeled, so I kept it in v2 and left classic for Ria to decide.
- While looking back at an earlier scene, the ring and the choices are off until you return. Choosing from an old scene would send an old choice to the session.
- The share card draws the scene, not the illustration, so a cross-origin image cannot break the export.
- I did not chase the remaining desktop frame misses further: they are single frames or short runs outside the signature, and the two fixes that remain (deferring the PNG draw to a worker, preloading the next drawn scene) are riskier than the gain this late.

**Not verified**

- Real voices and real images in v2: the backend never answered on :8000, so no live checks were made.
- Safari, Firefox, a real phone, a screen reader.

**Needs Ria**

- Run the backend and open `/?ui=v2` once to hear the real voices and see the real illustrations.
- The decisions listed in `frontend/design/HANDOFF.md`.

**Next**

Handoff is written. Waiting for review. No cutover without approval.

## 2026-11-14 13:55 EST. UI: sketch layout and language support (Person B)

**Branch:** `b/ui-sketch` in `../vantage-sketch`, from `b/graph-ui` at `60a18ce`. Not pushed. The sketch layout replaces the current player (Ria's decision).

**Changes**

- Language plumbing: `getLanguages`, `startSession(topic, language)`, `translateText`; mock server support; `useLanguageSettings`, `useSubtitleText` (cache by segment and language, abort on segment change, original text kept on failure); Noto Sans Devanagari self-hosted.
- Two native selects (narration, subtitles) on the landing page and in a player settings popover; narration change asks to restart the story.
- Player rebuilt to the sketch: wordmark and bold animated date, ask pill with shuffling placeholder and mic, centered title, five Lucide icons with tooltips, AI badge (`both | image | voice`), sentence-by-sentence subtitles with a transcript, points-of-view timeline with ticks, choices as a row above the subtitles, grounding inside the sources panel.
- Dependencies added: `lucide-react`, `@fontsource/noto-sans-devanagari`.

**Backend finding (at the time):** `/api/languages`, `/api/translate` and `language` on `/api/start` are not in this branch's backend; they are on `origin/a/languages`. I read that branch (fetch only, no merge) for the contract. `/api/tts` needs no language parameter. The backend was not running, so the live endpoints were not called.

**Verified**

- Lint and build pass at each commit. Keyboard-only flow, reduced motion, placeholder rotation and pause, choices, contradiction, ungrounded, restart flow, demo mode with zero requests beyond the dev server, offline fallback. Screenshots at 390, 768 and 1440 in `frontend/screenshots/sketch-*`. Details in `docs/handoffs/sketch-languages.md`.

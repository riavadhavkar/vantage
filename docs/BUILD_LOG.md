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

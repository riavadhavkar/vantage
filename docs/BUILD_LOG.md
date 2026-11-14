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

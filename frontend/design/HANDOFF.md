# Handoff: Vantage UI v2

Written 2026-11-14, about 11:50. Branch `b/ui-redesign`, worktree `../vantage-ui`. Classic is still the default interface; nothing was switched over.

## How to review it

Run `npm run dev` in `frontend/`, then:

| Open | To see |
| --- | --- |
| `/?ui=v2&demo=1` | The new interface on the cached demo, no network |
| `/?ui=v2&demo=1&motion=slow` | Every animation at 3x. The best way to judge the perspective switch |
| `/?ui=v2&demo=1&motion=off` | Everything instant (what "reduce motion" users get) |
| `/?ui=v2` | Live backend. If the API is down it says "Offline mode" and plays the demo |
| `/?demo=1` | Classic, unchanged apart from the fixes listed below |
| `/lab/motion` | Every motion token, playable |

A two-minute path that shows everything: Begin, let the first scene finish, turn the ring to "Cabin passengers" (the switch), press a source chip (evidence paper), Escape, choose "Hear it from third class", then "Did she break in two?" (contradiction), open the graph and click the first node (look back), then Cmd+K and type "share".

Screenshots: `frontend/design/screens/v2-*.png` (every screen at 390, 768, 1440), `v2-state-*.png` (error, ungrounded, offline and so on), `signature-1440-*ms.png` (the switch, frame by frame). Before and after pairs for the Devpost are in `frontend/screenshots/redesign-before-*` and `redesign-after-*`. Both folders are gitignored; regenerate with `node scripts/v2-shots.mjs`, `v2-states.mjs` and `v2-flow.mjs --frames 1 --query "&motion=slow"`.

## What is done

**Tier 1, all built:** landing with its load sequence and pointer focus; the full-bleed stage; the perspective switch on one clock with the voice change; captions with word-level reveal and claim underlines; choices; the lens ring with coverage; evidence paper with pins; the disagreement view; loading, error, offline, ungrounded and end-of-thread states.

**Tier 2, all built:** share card, Cmd+K palette, graph motion, map motion.

**Carried over from main during the build:** storyboard shots paced to the narration, graph nodes that reopen an earlier scene, real illustration thumbnails in the graph, OpenStreetMap tiles, the Ken Burns values.

**Everything else** (voice input, ambient sound, continue on phone) is the classic component inside the new shell, restyled through the tokens only.

## What is not done, or not verified

1. **Real voices and real illustrations have not been tried in v2.** Nothing answered on `localhost:8000` at any point, so the five live checks you allowed did not happen. v2 uses the same `useNarration` hook as classic, so it should behave the same, but that is reasoning, not a test. This is the first thing to check.
2. **The voice change was tested through a stub, not by ear.** The headless browser has no installed voices.
3. **Only Chromium was tested.** Safari and Firefox have fallbacks by design (no View Transitions needed, backdrop blur optional) but nobody has opened them.
4. **No real phone.** Frame rates are from headless Chromium on a laptop with 4x CPU throttle.
5. **Screen readers.** Roles, labels, live regions and focus handling are in place and checked by script; VoiceOver was not run.
6. **Haptic tick** is wired for Android and untested.

## Known issues

- **Three desktop cases miss the frame budget at 4x throttle** (none over 50 ms, at most 3 over 33 ms): landing load has two long frames at first paint; a choice within the same view has 6 frames over 33 ms; opening the share card has one 133 ms frame while the PNG is drawn. The perspective switch itself is inside the budget (54 fps, 1 frame over 33 ms), and at phone size every case except the share card is inside it. Full table in MOTION.md.
- **Claim underlines are a best guess.** A claim is matched to the sentence sharing the most content words, and only confident matches are underlined (29 of 38 claims in the sample data). A confident match can still be the wrong sentence. If that risk is not acceptable, delete the underline and keep the list: one line in `Captions.jsx`.
- **On the ring, each point of view shows once.** With four views the ring is slightly right-heavy (one mark to the left of the index, two to the right).
- **Sample excerpts read "SAMPLE: Summary from the team source list".** That is the mock data being honest; live excerpts are verbatim.
- **The share card uses the drawn scene, not the illustration,** so that a cross-origin image cannot break the export and no AI label is needed on the card.

## Fixes made in classic along the way (classic is the fallback)

| Problem | Real bug? | Fix |
| --- | --- | --- |
| Contradiction panel looked empty at 390 px | No. The screenshot was taken before the reveal finished | Screenshot script waits |
| With "reduce motion" on, the choices never appeared and the story could not continue | Yes | Typed state keyed by scene |
| An exception from speech synthesis took the whole player down | Yes | Caught; captions continue |
| Map said "API key required" | Yes (CARTO changed) | OpenStreetMap tiles, darkened |
| Map left half of the sheet empty in full view; a place at sea opened on empty ocean | Yes | Resize observer; wider default view |
| Ken Burns move was over in the first 3 seconds | Yes | Slow in-out move |

## Decisions I need from you

1. **Switch the default to v2?** My view: not until item 1 above (real voices and images in v2) has been checked once. After that, yes, with `?ui=classic` kept for the weekend.
2. **Keep claim underlines?** They look good and are right on the sample data, with the risk described above.
3. **AI label on graph thumbnails.** main now shows real illustrations as graph thumbnails in classic with no AI label. In v2 I added a small sparkle badge on each such thumbnail and a legend line. Classic has no label there; say if you want the same added to classic.
4. **Serif for excerpts** is in, as you chose. One token (`--font-quote`) removes it.
5. **Merge.** The branch has been pushed several times and merged once (PR #28). Nothing after that is on main until you merge again.

## Where things are

- New UI: `frontend/src/v2/`. Switch: `frontend/src/lib/ui.js`. Motion flag: `frontend/src/lib/motionMode.js`.
- Design: `frontend/DESIGN.md`. Plan: `frontend/design/PLAN.md`. Motion: `frontend/design/MOTION.md`.
- Checks: `scripts/v2-flow.mjs` (demo path), `v2-states.mjs` (13 non-happy paths), `v2-verify.mjs` (keyboard, touch targets, reduced motion, loops, load), `fps.mjs` (frame rate), `v2-shots.mjs` (screenshots).
- Log: `docs/BUILD_LOG.md`.

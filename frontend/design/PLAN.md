# Vantage UI v2: build plan

Status: waiting for approval. Nothing below is built yet except the motion tokens, the `?motion` flag and the bench page.

**Direction:** Aperture (dark full-bleed stage, lens ring, focus pull) with evidence on Editorial's paper. Borrowed: share card (Stories), Cmd+K palette and lettered A/B accounts (Diff). Motion spec: [MOTION.md](MOTION.md).

**Where:** worktree `../vantage-ui`, branch `b/ui-redesign`. No push, no merge, default UI unchanged.

## 1. How it ships without touching classic

- `?ui=v2` renders the new UI. No parameter, or `?ui=classic`, renders today's UI. One branch in `App.jsx` picks `v2/Landing` and `v2/Player` (a lazy chunk); both take the same props as the classic screens.
- New code lives in `src/v2/`. Classic components are not edited.
- **Reused as is:** `api/client.js`, mocks, `useSession`, `useNarration` (remote audio, then the device voice fallback), `KnowledgeGraph`, `StoryMap`, `VoiceInputButton`, `AmbientPlayer`, `ContinueOnPhone`, `SoundToggle`.
- **How "everything else inherits the tokens":** the v2 root re-points the existing color and font variables (`--color-prussian`, `--color-developer`, `--color-print`, `--color-fog`, `--color-fiber`, `--color-safelight`, `--font-sans`). Reused classic components pick up the new palette and type with no edits and no behavior change.
- **Copied, not shared:** the classic Player's data logic (sources, graph polling, choose, ask, retry) becomes `v2/usePlayer.js`, and the pull timing becomes `v2/usePull.js`. Refactoring classic to share them would risk the fallback. Cost: about 200 duplicated lines.

## 2. Design system

**Color** (contrast computed in phase 1; perspective colors always come from the topic).

| Token | Value | Use |
| --- | --- | --- |
| stage | `#0A0C0F` | page and frame base |
| raised | `#14171B` | opaque panels on phones |
| text / dim | `#F3F5F6` / `#C6CDD5` | 17.9 and 12.2 on stage; 7.3 and 5.0 on worst-case glass |
| glass | `rgb(10 12 15 / 0.72)` + 18 px blur | floating panels, opaque `0.94` on phones and in lite mode |
| signal | `#FF6A4D` graphic, `#FF8F78` text | contradictions and errors only |
| paper / ink / ink-dim | `#EFEDE6` / `#14171B` / `#4C535C` | evidence sheet: 15.3 and 6.6 |
| perspective accent | topic hue at L 0.80 | ring, date, dots: 10.2 to 10.7 on stage |
| perspective grade | topic hue at L 0.86 and L 0.16 | duotone of the frame |
| perspective mark | topic hue at L 0.84, low chroma | highlighter on paper, ink stays above 7:1 |

**Type.** One modern sans for everything: **Archivo Variable** (weight and width axes; the width axis is what makes the ring and titles feel like lens engraving). **Geist Mono** at 12 px for metadata only (source ids, types, dates, counts, key hints).

**The serif question.** I recommend keeping **Newsreader for quoted source excerpts only**, nothing else. Reason: the excerpt is the one piece of text on screen that Vantage did not write, and a different face marks that boundary at a glance, the way paper marks evidence. Mono cannot do this job any more because mono now means metadata. Cost: one font file, loaded with the evidence chunk. It is one token (`--font-quote`); set it to the sans and the serif is gone.

**Scales.** Type 12, 13, 15, 17, 20, 28, 40, 44 to 112. Space 4, 8, 12, 16, 24, 32, 48, 64. Radius 6 (chips), 14 (panels), full (round controls). Elevation: none on the stage (glass and hairlines only), one soft shadow under the paper sheet. Motion: tokens in `theme.js` and `@theme` (done).

**Primitives** (`v2/ui/`): Button (primary, quiet, ghost), IconButton, Chip (source), Badge (AI image, AI narration, data source), Glass panel, Sheet (paper, side on desktop and bottom on phones, focus trap, Escape), Skeleton, Tooltip, Kbd, Icon wrapper (lucide, 16 / 20, 1.6 stroke). Every one has hover, focus-visible, pressed, disabled and loading states.

## 3. Screens and components

| Today | v2 | What changes | What stays |
| --- | --- | --- | --- |
| LandingScreen | `Landing` | Full-bleed frame in three panels (first three perspectives of the featured topic, one grade each), wordmark, one line of promise, topic field, topic chips, Begin | `onStart`, suggestions on `topic_not_supported`, featured topics from the same catalog |
| Stage, GradedImage, Iris | `Frame` | Full-bleed, pre-blurred focus layer, grade crossfade, pan, parallax, date title card. Iris blades retire in favor of the focus pull (the iris moves to the landing load) | Drawn scene until the image is ready, AI badge built into the image component, fixed aspect, no layout shift |
| NarrativeCard | `Captions` | Glass caption card, word-level reveal, claim underlines, speaking indicator | Captions always on, full text to screen readers at once, tap to finish |
| ChoiceButtons | `Choices` | Glass rows, stagger, chosen row grows into the transition | Same choices, same disabled and pending logic |
| LensRail | `LensRing` + coverage | Ring fixed to the bottom, turns the short way, coverage ring per perspective | Same selection logic, "In focus / Heard n / Not heard yet" |
| SourceTag pins | `Pins` | Chips on the caption card with type and publisher, ripple on arrival | Open the source for that claim |
| SourcePanel | `Evidence` | Paper sheet: numbered claims, source opens in place, highlighter sweep, serif excerpt | Text only, cited-first ordering, "not cited yet" group |
| ContradictionSplit | `Disagreement` | Frame splits down a seam; card with accounts lettered A and B, unequal-sign icon, "Sources disagree" label, "Why they differ" | Same data, source chips open evidence |
| Grounding list | inside `Evidence` + "Grounded in n sources" button on the card | Always one visible control per segment | Same claims and notes |
| KnowledgeGraph, StoryMap (Tier 2) | same components in a v2 sheet | Motion from MOTION.md, palette via tokens | Data, polling, legend, offline map note |
| Voice input, ambient, sound, continue on phone | same components | Tokens only | Everything |
| Share card, Cmd+K (Tier 2) | `ShareCard`, `Palette` | New | n/a |

## 4. The signature moment (perspective switch, 700 ms)

One clock drives everything: a single progress value `p` goes 0 to 1 over 700 ms on `ease-move`, and every moving part is a function of `p`. Nothing can drift out of sync, and only opacity and transform change.

| Time | Frame (60 fps) | What happens |
| --- | --- | --- |
| 0 | 0 | Trigger (ring, a choice in another perspective, Cmd+K, arrow keys). Old voice stops. Haptic tick where supported. Pins and choices fade out. |
| 0 to 260 | 0 to 16 | **Soften.** Pre-blurred copy of the frame fades in over the sharp one, frame scales 1 to 1.03. Title, date and captions drop to 35%. The ring starts turning toward the new mark. |
| 260 to 440 | 16 to 26 | **Swap, under the blur.** New grade layers fade in over the old ones. The scene image swaps. Ring mark lands on the index; the new mark widens and takes its accent. Coverage updates. |
| 440 to 700 | 26 to 42 | **Sharpen.** Blurred copy fades out, scale returns to 1. New title rises 8 px into place. Date title card plays. |
| 700 | 42 | New voice starts. Word-level captions begin. Claim underlines follow their sentences. |

If the next segment is not ready at 260 ms, `p` holds at 0.5 (soft, with "Finding <perspective>" on the frame) and resumes when the data arrives, so it never sharpens onto stale content. **Reduced motion or `?motion=off`:** a 200 ms crossfade of frame and grade, the ring jumps, text swaps, the voice still changes.

**The voice.** Classic already has a device speech fallback (`lib/speech.js` through `useNarration`): when server audio is missing it speaks with a different installed voice per perspective and shows "AI narration" plus "Device voice". I tested it with a stubbed synthesizer: the first scene used one voice and the scene after a switch used another. v2 uses the same hook, so real TTS from the other session replaces the device voice with no v2 change. Limits: a device with one English voice cannot change voice, and I could not hear real audio from a headless browser.

## 5. States

| Screen | Loading | Error | Empty | Offline / demo | Ungrounded |
| --- | --- | --- | --- | --- | --- |
| Landing | Begin shows "Opening the archive", panels stay live | One line under the field; for an unknown topic, the suggestions become chips | Field focuses on empty submit | Badge: "Cached demo, not live" or "Offline mode. Playing the cached demo" | n/a |
| Player | Frame holds soft, "Tracing connections" with moving dots, skeleton lines in the card; after 4 s the copy says it is still working | Signal rule on the card, the existing specific sentence, "Try again" (or "Start again" when the session is gone). No shake | Final segment: "This thread ends here" with three ways on | Same badge in the bar | Frame stays soft and never sharpens. Card: "We could not ground this part in the sources, so we are not narrating it", the grounding notes, "Try another point of view". No voice, no typing |
| Image | Drawn scene, then the image develops in. "Developing the illustration" until then | Drawn scene stays, no AI badge | n/a | Drawn scene | No image |
| Voice | "Preparing the voice" | "Narration audio is unavailable. Captions only" | n/a | Device voice, labeled | Silent |
| Evidence | Skeleton rows on paper | "The sources could not load", retry | "No sources yet. They appear as the story cites them" | Same | Shows the grounding notes |
| Graph / Map | Existing copy, skeleton | Existing fallback to seen scenes | Existing | Map offline note | n/a |

## 6. Schedule for the unattended window (11:15 to 15:45)

Phase 1 produced four working prototypes in 32 minutes, so the estimates below assume that pace with real wiring and review added. Each row ends in a commit with lint and build passing.

| Time | Work |
| --- | --- |
| 11:15 | Replace `DESIGN.md`. `?ui=v2` switch, token re-pointing, fonts, primitives, `usePlayer`, `usePull` |
| 11:40 | **T1** Landing and its load sequence |
| 12:05 | **T1** Frame, captions, AI badges, image develop, title card |
| 12:35 | **T1** Lens ring, coverage, the signature switch with voice, choices |
| 13:00 | **T1** Evidence paper and pins |
| 13:20 | **T1** Disagreement view |
| 13:35 | **T1** Loading, error, offline, ungrounded, end of thread |
| 13:50 | Tier 1 critique: two rounds of screenshots at 390 / 768 / 1440, signature frame sequence, frame rate at 4x CPU, reduced motion, keyboard |
| 14:20 | **T2** Share card |
| 14:35 | **T2** Cmd+K palette |
| 14:50 | **T2** Graph motion |
| 15:10 | **T2** Map motion |
| 15:30 | No new components. Demo path five times offline, classic regression screenshots, `HANDOFF.md`, build log |

Build log entries at 12:15, 13:15, 14:15, 15:15 and at the end. **If I fall behind, I cut from the bottom:** map motion, then graph motion (both still get the new tokens), then palette, then share card. Tier 1 is never cut, and Tier 2 does not start until the Tier 1 critique passes.

## 7. Budgets and checks

- **Frame rate:** `node scripts/fps.mjs` (4x CPU throttle, frame intervals over 1.5 s). Target for the signature: no frame over 50 ms, at most 3 over 33 ms. Baseline today on the phase 1 prototype: desktop 52 fps average, 4 of 84 frames over 33 ms, none over 50; phone size 60 fps, none over 17 ms. This is headless Chromium on this laptop, a proxy and not a phone.
- **Lite mode:** if the first pull on a device drops more than 3 frames over 33 ms, v2 swaps the blurred layer for a translucent fill and makes glass opaque. Phones start in lite glass.
- **Load:** largest paint under 2 s on a laptop, no layout shift (frame and card heights reserved), v2 in its own chunk.
- **Accessibility:** contrast recomputed for every pair, keyboard walkthrough of the whole demo path, focus trap and Escape on sheets and palette, 44 px targets, `prefers-reduced-motion` and `prefers-contrast`. No new dependency, so no axe; checks are scripted and manual.
- **Regression:** classic screenshots before and after, demo path five times at `?demo=1&ui=v2` with no console errors and no network calls.
- **Browsers:** built and measured in Chromium. Safari and Firefox are not installed in my test tooling, so they are checked by fallback design only (section 8, decision 4) and listed in the handoff for you to open once.

## 8. Decisions I am making unless you say otherwise

1. **Serif for excerpts only** (section 2). Say "no serif" and it is one token.
2. **Claim underlines use word matching, with a threshold.** The contract has no claim positions, so I match each claim to the sentence that shares the most content words and underline only confident matches. On the sample data that is 29 of 38 claims; the other 9 appear in the grounding list only. Risk: a confident match can still be the wrong sentence, which would point a source at text it does not support. Alternative: no in-text underlines, list only.
3. **The "level indicator" shows speaking, not level.** Browsers expose no audio level for speech synthesis, so it is three bars that move while the voice is playing and stop when it stops. It will not claim to measure anything.
4. **Shared elements use Motion's layout animation everywhere.** View Transitions (Chrome 111, Safari 18, Firefox 144, per Chrome's documentation) are used for one thing, landing to player, with the existing Motion reveal as the fallback. One code path for pins, choices and sheets is safer to build unattended than two.
5. **Landing shows three panels**, the first three perspectives of the featured topic, even when a topic has four. All of them are on the ring once inside.
6. **Haptics are Android only** (`navigator.vibrate`); iPhones ignore it silently.

## 9. Done before this plan

- **Worktree:** `../vantage-ui` on `b/ui-redesign`. The main checkout is back on `b/graph-ui`, clean.
- **Classic contradiction at 390 px: a screenshot timing issue, not a bug.** The two accounts reveal 350 ms after they scroll into view and take 550 ms; the script shot at 300 ms. Opacity measured 0 at 300 ms, 0.97 at 700 ms, 1 at 1,500 ms, and a slow manual-style scroll revealed both sides every time. Fixed the script's wait; the new `contradiction-390.png` shows both accounts.
- **Speech fallback: classic already has one.** I added one guard so a device that rejects a voice cannot crash the player (captions continue).
- **Motion tokens, `?motion=slow`, `?motion=off`:** in place and measured on `/lab/motion` (the same row took 740 ms, 2,241 ms and 55 ms).

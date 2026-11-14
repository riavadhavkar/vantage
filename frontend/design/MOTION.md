# Vantage UI v2: motion

Status: specification, waiting for approval with [PLAN.md](PLAN.md). The tokens and review flags exist; the animations do not yet.

## Why anything moves

Every animation must do one of four jobs. If it does none, it is not built.

- **Cause:** shows what an action did (press, choose, switch).
- **Continuity:** keeps the viewer oriented when the screen changes (shared elements, the ring).
- **Focus:** points at the one thing that matters now (title card, underline, pulse once).
- **Feedback:** confirms the system is working or has finished (loading, develop, saved).

Nothing loops while narration is playing except the slow pan and the speaking indicator, and both stop when narration stops or the tab is hidden.

## Tokens

In `src/constants/theme.js` and the `@theme static` block of `src/index.css`.

| Token | Value | Use |
| --- | --- | --- |
| `micro` | 120 ms | press, hover, toggles, focus ring |
| `quick` | 200 ms | small reveals, tooltips, reduced-motion crossfades |
| `panel` | 320 ms | sheets, rows, chips |
| `scene` | 600 ms | stage-level changes, image develop |
| `slow` | 900 ms | one-off arrivals (landing load) |
| `signature` | 700 ms (260 + 180 + 260) | the perspective switch |
| `stagger` | 60 ms | step between siblings |
| `ease-enter` | `cubic-bezier(0.2, 0.7, 0.1, 1)` | things arriving |
| `ease-move` | `cubic-bezier(0.65, 0, 0.2, 1)` | things travelling between two places |
| `ease-exit` | `cubic-bezier(0.5, 0, 0.8, 0.4)` | things leaving |
| `spring` | stiffness 260, damping 28, mass 0.9 (settles in about 500 ms, no bounce) | physical movement: ring, sheets, shared elements |

## Review flags

- `?motion=slow`: every v2 animation at 3x. Judge timing by eye.
- `?motion=off`: everything instant, using the reduced-motion replacements below. The same thing happens automatically with the OS "reduce motion" setting.
- `/lab/motion`: every token, playable. Works now.

The flags scale the tokens, so they cover v2 and the bench. Classic uses its own hard-coded timings: `off` makes classic instant too, `slow` does not slow it.

## Rules

1. Only `transform` and `opacity` animate. The two exceptions are marked **(filter)** below; both use a layer blurred once and then faded, never an animated blur.
2. At most three heavy animations at once. Heavy means full-frame or more than 20 elements. The signature counts as three, so pins, choices and the title card wait for it to finish.
3. Loops pause when offscreen (IntersectionObserver) and when the tab is hidden (`visibilitychange`).
4. Nothing blinks faster than three times a second. The fastest repeating thing is the caret at once a second.
5. Lite mode: if a device drops more than 3 frames over 33 ms on its first perspective switch, the blurred layer becomes a translucent fill, glass becomes opaque, and the pan stops. Phones start with opaque glass and no pan.
6. Errors and offline states never shake, flash or bounce.

## Every animation

T = tier. Job = cause, continuity, focus or feedback.

### Landing (Tier 1)

| # | Component, trigger | What moves | Duration, easing | Reduced motion | Performance |
| --- | --- | --- | --- | --- | --- |
| 1 | Frame, on load | A circular mask opens from the center (`clip-path: circle`) over the three panels. Job: focus | `slow`, `ease-move` | Fade in, `quick` | clip-path on one layer, once |
| 2 | Wordmark, on load | Crossfade from a pre-blurred copy to the sharp one, scale 1.04 to 1 **(filter, pre-rendered)**. Job: focus | `scene`, `ease-enter`, starts at 300 ms | Appears sharp | Two text layers, opacity only |
| 3 | Three panels, on load | Each settles from 12 px low and 0 opacity, then the focus runs across them once. Job: cause (teaches the gesture) | `scene` each, `stagger` x 2 apart; the sweep 320 ms per panel | All visible, middle one in focus | Opacity and translate on 3 layers |
| 4 | Topic field, chips, Begin, on load | Rise 8 px and fade in, one after another. Job: focus | `panel`, `ease-enter`, `stagger` | Visible at once | Up to 6 elements |
| 5 | Panels, pointer move (fine pointers only) | The panel under the pointer sharpens (blurred copy fades out) and comes forward (scale 1.03); the others soften and dim; the scene inside shifts up to 6 px against the pointer. Job: cause | `panel`, `ease-enter`; pointer position smoothed by a spring | Hover swaps focus with a `quick` fade, no parallax | Pointer handled in rAF, throttled to one update a frame; off on touch |
| 6 | Landing to player, Begin | The frame grows to full bleed and becomes the stage (View Transition; Motion circular reveal as fallback). Job: continuity | `slow`, `ease-move` | Crossfade, `quick` | One transition, nothing else runs |

### Stage (Tier 1)

| # | Component, trigger | What moves | Duration, easing | Reduced motion | Performance |
| --- | --- | --- | --- | --- | --- |
| 7 | Image, while a scene is showing | Slow pan and zoom (scale 1.04 to 1.10, small drift). Job: continuity (the scene is alive, not stuck) | 24 s, alternate, linear-ish | Still | Transform on one layer; desktop only; pauses when hidden, during sheets, and in lite mode |
| 8 | Drawn scene, pointer move or pan | Three depth layers (sky, mid, foreground) move at different rates, up to 8 px. Job: focus (depth) | Follows the pan; pointer smoothed by spring | Still | 3 transforms; skipped when the real image is showing |
| 9 | Grade, perspective change | New duotone layers fade in over the old ones. Job: cause | Inside the signature (260 to 440 ms) | `quick` crossfade | Opacity on 2 blend layers, no color interpolation |
| 10 | Date title card, new scene | The date rises 10 px behind a mask and its letter spacing closes slightly; holds 1.6 s, then settles small above the title. Job: focus | `scene` in, `panel` out, `ease-enter` | Shown in its resting place | One text element; waits for the signature |
| 11 | Illustration arrives | The image "develops": fades in from the drawn scene while a dark wash lifts **(filter, none; opacity only)**. Job: feedback | `slow`, `ease-enter` | `quick` fade | Opacity on 2 layers; AI badge appears when it ends |

### Perspective switch, the signature (Tier 1)

Full frame-by-frame spec in PLAN.md section 4.

| # | Component, trigger | What moves | Duration, easing | Reduced motion | Performance |
| --- | --- | --- | --- | --- | --- |
| 12 | Lens ring, perspective chosen | The marks slide the short way round under the fixed index and the new mark snaps wide. Job: cause, continuity | Whole `signature` clock; mark width on `spring` | Jumps | One translate on the strip; width axis on one label |
| 13 | Frame focus pull | Blurred copy fades in and out, scale 1 to 1.03 to 1 **(filter, pre-rendered)**. Job: cause | `signature`, `ease-move`, one shared clock | 200 ms crossfade | Opacity and scale on 2 full-frame layers; lite mode uses a translucent fill |
| 14 | Title and captions | Old text drops to 35%, new title rises 8 px. Job: continuity | Follows the clock | Swap | Opacity, translate |
| 15 | Voice | Old voice stops at 0, new voice starts at 700 ms. Job: cause | n/a | Same | n/a |
| 16 | Haptic | One 8 ms tick at 0, Android only. Job: feedback | n/a | Off | n/a |

### Narration (Tier 1)

| # | Component, trigger | What moves | Duration, easing | Reduced motion | Performance |
| --- | --- | --- | --- | --- | --- |
| 17 | Captions, scene start | Words appear one at a time (fade and 4 px rise). Tap or Enter shows everything. Job: focus | 30 ms a character as today, each word `micro` | All text at once | Only the newest word animates; the rest is static text |
| 18 | Claim underline, when its sentence finishes | A 2 px underline in the source's perspective color draws left to right; the sentence becomes a button to its evidence. Job: cause (this sentence has a source) | `panel`, `ease-enter` | Underline present, no draw | `scaleX` on a pseudo-element per matched sentence |
| 19 | Speaking indicator, while the voice plays | Three small bars move; they stop when the voice stops or pauses. Shows speaking, not measured level. Job: feedback | 900 ms loop, `ease-move` | Static "speaking" dot | 3 `scaleY`; paused when hidden |

### Choices (Tier 1)

| # | Component, trigger | What moves | Duration, easing | Reduced motion | Performance |
| --- | --- | --- | --- | --- | --- |
| 20 | Choice rows, narration ends | Rows rise 10 px and fade in. Job: focus | `panel`, `ease-enter`, `stagger` | Visible at once | Up to 4 rows |
| 21 | Chosen row, on press | Its perspective dot grows out of the row and becomes the wash that starts the frame transition; the other rows fade. Job: cause, continuity | `panel`, `spring`, then hands over to the signature or a `scene` crossfade | Row highlights, rows fade | Shared layout animation of one element |
| 22 | Row hover and focus | 2 px accent rule grows on the left, background lifts slightly. Job: feedback | `micro` | Same, instant | Transform on a pseudo-element |

### Rail and coverage (Tier 1)

| # | Component, trigger | What moves | Duration, easing | Reduced motion | Performance |
| --- | --- | --- | --- | --- | --- |
| 23 | Coverage ring, a scene is heard | The small ring beside a perspective fills by one step with a drawn stroke. Job: feedback | `scene`, `ease-move` | Jumps to the new fill | `stroke-dashoffset` on a 16 px SVG |
| 24 | Unheard perspectives, first time the ring is shown | Each unheard mark pulses once (opacity 0.6 to 1), then rests. Never again. Job: focus | `scene`, `stagger` | None | Opacity, up to 4 elements, one run |

### Pins and evidence (Tier 1)

| # | Component, trigger | What moves | Duration, easing | Reduced motion | Performance |
| --- | --- | --- | --- | --- | --- |
| 25 | Source pins, narration ends | Each chip pops in with one ring ripple. Job: focus | `panel`, `spring`, `stagger`; ripple `scene`, once | Visible, no ripple | Scale and opacity on up to 3 chips |
| 26 | Pin to evidence sheet | The pressed chip travels and grows into the header of its source on the sheet while the sheet slides in. Job: continuity | `spring` | Sheet fades in, `quick` | Shared layout animation of one element; sheet is a transform |
| 27 | Excerpt highlighter | A highlighter band in the perspective mark color sweeps across the quoted excerpt, line by line. Job: focus | `scene`, `ease-move`, starts when the sheet has landed | Highlight present | `background-size` on one inline element (a paint, small area) |
| 28 | Source row opens in place | Height opens, content fades in. Job: cause | `panel`, `ease-enter` | Instant | Grid-row height on one row |

### Contradiction (Tier 1)

| # | Component, trigger | What moves | Duration, easing | Reduced motion | Performance |
| --- | --- | --- | --- | --- | --- |
| 29 | Frame seam | A signal-colored line draws down the frame and the two halves take the two accounts' grades. Job: cause | `signature` length, `ease-move` | Appears | `scaleY` on a line, clip on grade layers |
| 30 | Accounts A and B | Slide in from left and right, 24 px, and meet at the divider. Job: focus | `panel`, `ease-enter`, B `stagger` after A | Fade, `quick` | 2 elements |
| 31 | Divider and icon | One pulse of the unequal-sign badge when they meet. Once. Job: focus | `scene` | None | Scale and opacity on one 22 px element |
| 32 | "Why they differ" | Fades in after the pulse. Job: continuity | `panel`, `ease-enter` | Visible | One element |

The icon (unequal sign), the words "Sources disagree" and the letters A and B carry the meaning. Color is the fourth cue.

### Loading, errors, micro-interactions (Tier 1)

| # | Component, trigger | What moves | Duration, easing | Reduced motion | Performance |
| --- | --- | --- | --- | --- | --- |
| 33 | Skeleton lines, waiting for text | A soft highlight crosses the lines. Job: feedback | 1.4 s loop, linear | Static lines at 60% | Translate of one gradient layer; stops when content arrives |
| 34 | "Tracing connections", waiting for the next scene | Three dots joined by a line; a pulse travels dot to dot. Job: feedback | 1.2 s loop, `ease-move` | Static dots | 3 opacity changes |
| 35 | Error and offline notes | Fade in with a 4 px rise. No shake. Job: feedback | `panel`, `ease-enter` | Visible | One element |
| 36 | Buttons, on press | Scale to 0.97 and back. Job: feedback | `micro` | None | Transform |
| 37 | Focus ring | Ring grows from 0 to its 3 px offset. Job: feedback | `micro`, `ease-enter` | Instant | Outline offset |
| 38 | Toggles (sound, ambient, pause) | Icon crossfades, thumb slides. Job: feedback | `micro` | Instant | Opacity, translate |
| 39 | Tooltips | Fade and 4 px rise after a 400 ms hover; instant on keyboard focus. Job: feedback | `micro` | Instant | One element |
| 40 | Sheets (evidence, graph, map) | Slide in on a spring, scrim fades. Job: continuity | `spring`; scrim `quick` | Fade, `quick` | Transform on one layer |

### Tier 2

| # | Component, trigger | What moves | Duration, easing | Reduced motion | Performance |
| --- | --- | --- | --- | --- | --- |
| 41 | Graph nodes, added | Scale 0.6 to 1 and fade in. Job: cause | `panel`, `ease-enter` | Appear | Existing behavior, new tokens |
| 42 | Graph edges, added | The edge draws from source to target. Job: cause | `scene`, `ease-move` | Appear | `stroke-dashoffset` per new edge only |
| 43 | Graph camera, current node changes | View glides to the current node (React Flow `setCenter`). Job: continuity | `scene`, `ease-move` | Jumps | One viewport transform |
| 44 | Current node | A soft ring breathes twice, then rests. Job: focus | 1.1 s, twice | Static ring | Opacity and scale on one element |
| 45 | Map marker, location changes | The marker travels along the line from the previous place; the line draws ahead of it. Job: continuity | `slow`, `ease-move` | Marker at the destination, line drawn | rAF interpolation of one marker, stops at arrival |
| 46 | Share card, opened | The card develops like a photograph: blurred, overexposed copy fades to sharp **(filter, pre-rendered)**. Job: feedback | `slow`, `ease-enter` | Sharp | Opacity on 2 layers |
| 47 | Share card counts | Sources, perspectives and disagreements count up. Job: focus | `scene`, `ease-enter` | Final numbers | Text updates on 3 elements, 12 steps each |
| 48 | Palette, Cmd+K | Fades in with a 6 px rise; the highlighted row slides between items. Job: feedback | `quick`, `ease-enter`; row on `spring` | Instant | One panel, one shared highlight |

## Checks I will run and report

1. **Frame rate at 4x CPU throttle** (`scripts/fps.mjs`): average fps, frames over 33 ms and over 50 ms, for rows 1 to 6 (landing load), 12 to 16 (signature, desktop and phone size), 21, 26, 29 to 32, 43 and 46. Target: none over 50 ms, at most 3 over 33 ms.
2. **Frame sequence of the signature:** screenshots every 50 ms from 0 to 800 ms at `?motion=slow`, saved to `design/screens/signature-*.png`, inspected for a visible cut, a stale frame, or text popping.
3. **Reduced motion:** every Tier 1 screen with `?motion=off` and with the emulated OS setting: nothing moves except crossfades, the typewriter is instant, no content is missing.
4. **Hidden tab:** loops stop (checked by counting running animations with `document.getAnimations()`).
5. **Flash rate:** no repeating animation shorter than 334 ms a cycle (read from the table and the CSS).

Baseline, measured today on the phase 1 Aperture prototype (headless Chromium on this laptop, not a phone):

| Case | CPU | Avg fps | Frames over 33 ms | Over 50 ms |
| --- | --- | --- | --- | --- |
| Focus pull, 1440 | 1x | 56.1 | 3 of 87 | 0 |
| Focus pull, 1440 | 4x | 52.0 | 4 of 84 | 0 |
| Focus pull, 390 | 4x | 60.0 | 0 of 96 | 0 |
| Landing pull, 1440 | 4x | 58.8 | 1 of 95 | 0 |

The desktop drops are there at 1x too, which points at the backdrop blur on the glass panels over a changing frame, not at CPU. Lite mode exists for that case.

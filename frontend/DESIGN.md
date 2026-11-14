# Vantage design plan

Status: reviewed draft, waiting for approval before any code.

## 1. The idea in one line

The same moment, seen through several lenses. Moving between points of view is a **focus pull**: one view sharpens, the others soften. Narration lives on the **screen** (dark, projected, graded). Evidence lives on **paper** (pale, typed, held in the hand). Anything red is a **tear**: two sources that disagree, or something that broke.

Boldness is spent in exactly one place: the focus pull (landing hero and perspective switch). Everything else stays quiet: square edges, hairline rules, no shadows on the dark side, and motion only where the brief lists it.

## 2. Tokens

### Color (6 named tokens)

| Token | Hex | Role | Contrast checks |
| --- | --- | --- | --- |
| `prussian` | `#0A1E30` | Stage and page base. Also the **ink** on paper (Prussian blue is a cyanotype and ink pigment, so this works on both sides) | Ink on `fiber`: 11.8:1 |
| `developer` | `#12304A` | Raised surfaces on the dark side: the rail, the timeline strip, the ask field | |
| `print` | `#EEF0EA` | Primary text on dark | On prussian: 16:1 |
| `fog` | `#9FB0BF` | Secondary text on dark (metadata, hints) | On prussian 7.6:1, on developer 6.1:1 |
| `fiber` | `#D9D8CC` | Paper surface: source panel, source pins, document excerpts | |
| `safelight` | `#D2402F` | Contradiction seams, opposing-view edges, error marks. **Never decorative.** Graphics only (3.6:1); red text uses the computed `safelightText` `#F0715F` (5.8:1) | |

**Perspective grades (runtime, from `GET /api/topic`).** For each perspective `color`, `theme.js` derives:

- `shadow`: `color` mixed toward `prussian` (OKLCH, L ≈ 0.18). This is the duotone's dark end.
- `highlight`: `color` mixed toward `print` (L ≈ 0.92). This is the duotone's light end.
- `text`: `color` lightened in OKLCH until it reaches at least 4.5:1 on both `prussian` and `developer`.
- `mark`: `color` at 30% over `fiber`, used to highlight excerpts on paper. It is checked so `prussian` ink on it stays at 4.5:1 or above.

If the topic fails to load, the landing hero uses three unnamed neutral grades (silver, cool, warm offsets of `fog`). No perspective names are ever hardcoded.

### Type

| Role | Family (self-hosted via `@fontsource`) | Sizes | Rules |
| --- | --- | --- | --- |
| Wordmark, segment titles, graph node titles | **Gloock** 400 | wordmark `clamp(88px, 19vw, 300px)` at leading 0.8; titles 30/34 mobile, 48/52 desktop | Never below 28px. No italic and no color-picked words. It is the only display face |
| Narration | **Source Serif 4** (variable, opsz) 400 and 600 | 18/30 mobile, 21/34 desktop, max 64ch | Captions and narration are the same text |
| Interface | **Hanken Grotesk** (variable) 400, 500, 600 | 13, 15, 17 | Sentence case, plain verbs, no tracking, no all-caps |
| Documents | **Courier Prime** 400 and 700 | 15/24 | **Only on `fiber`.** If it's typed, it's evidence |

Why two serifs work here: they never meet at the same size. Gloock is extreme-contrast titling that only appears at 28px and up; Source Serif 4 is a text face for reading. The gap between them is wide enough to read as a deliberate step in hierarchy, not as two near-identical choices.

Scale: 13 · 15 · 17 · 21 · 30 · 48 · wordmark. Spacing uses an 8px unit. Radius is 2px everywhere (the corner of a print), with no pill shapes except the record button.

### Texture

- One static grain layer: an SVG `feTurbulence` data URI at 5% opacity, `mix-blend-mode: overlay`, on the stage and the landing hero only. It never animates.
- A vignette: one radial gradient on the stage.
- Paper has no texture image. Its edge is a 1px `prussian` border at 12%, which is enough to read as a sheet.

### Timing (`theme.js`)

`FADE_MS = 700`, `STAGGER_MS = 200`, `TYPE_SPEED_MS = 30`, plus `PULL_MS = 700` (the perspective transition) and `DEVELOP_MS = 1200` (image arrival). Easing is `cubic-bezier(0.2, 0.7, 0.1, 1)`, like a focus ring that eases into place.

## 3. Layout

### Landing, desktop (1440)

```
+--------------------------------------------------------------------------+
| (wordmark lives in the frame)                           Sound off  [o]   |  56px bar, transparent
|                                                                          |
|  +----------------------+----------------------+----------------------+  |
|  |  panel A             |  panel B  (focused)  |  panel C             |  |  hero frame: 64vh
|  |  low vantage,        |  wide vantage,       |  close vantage,      |  |  3 equal panels,
|  |  grade 1, blurred    |  grade 2, sharp      |  grade 3, blurred    |  |  4px gutters of prussian
|  |                      |                      |                      |  |
|  |  V  A  N   |  T  A   G   |  E              <- one wordmark, cut by  |  |  wordmark baseline sits
|  |                      |                      |   the gutters; each  |  |  on the frame's bottom
|  +----------------------+----------------------+---- slice takes its --+  |  edge, bleeding 0.12em
|                                                     panel's focus        |
|  See what happened from every side,         [ Type a topic       ] Begin |  headline: cols 1-6
|  and check every claim against its source.  Try: alias · alias · alias   |  field: cols 8-12
|                                                                          |
|  Every documentary is one cut. This is the whole story, and it shows     |  tagline: once, fog, 15px
|  its sources.                                     Demo content is cached |
+--------------------------------------------------------------------------+
```

Alignment: a 12-column grid with 32px margins and 24px gutters. The hero frame spans all 12 columns. The headline's left edge = the frame's left edge = the wordmark's first stem. The field's right edge = the frame's right edge. The headline and field share a top line.

### Landing, phone (390)

```
+--------------------------+
| Sound off           [o]  |
| +------+------+------+   |  three tall slivers, 58vh
| |  A   |  B   |  C   |   |  drag or tap to pull focus
| |      |      |      |   |
| | VAN  | TAG  | E    |   |  wordmark ~22vw
| +------+------+------+   |
| See what happened from   |  headline 30px Gloock
| every side, and check    |
| every claim against its  |
| source.                  |
| [ Type a topic         ] |  48px field
| [ Begin               ]  |  full width, 48px
| Try: alias, alias        |  44px tap targets
| tagline                  |
+--------------------------+
```

### Player, desktop (1440)

```
+-----------+------------------------------------------------+--------------+
| Points of |  STAGE  (16:9, max 62vh)                        | PAPER        |
| view      |  graded image or procedural scene, grain,       | (slides over |
|           |  vignette, slow pan                             |  the stage,  |
| (o) Grade1|         [Primary]          [Oral history]       |  440px)      |
|   heard   |      ^ source pins: little fiber tags           |              |
| ( ) Grade2|                                                 | Title        |
|   not yet |  Segment title in Gloock 48         date_label  | Primary ·    |
| ( ) Grade3|  ---------------------------------------------  | license      |
|           |  Narration in Source Serif, typewriter,         | "excerpt..." |
|           |  max 64ch, aria-live                            |  ^ Courier,  |
|           |  Grounded in 4 sources  >  How this was         |    marked    |
|           |  grounded                                       | Informed:    |
|           |  ---------------------------------------------  | seg titles   |
|           |  (o) Hear it from <grade 2>   Another view      |              |
|           |  ( ) Go deeper                Go deeper         |              |
|           |  ( ) Read the source          Primary source    |              |
+-----------+------------------------------------------------+--------------+
| [Graph] [Map]  [ Ask a question about this moment        ] [mic]  AI narration  [||] [vol] |
+--------------------------------------------------------------------------------------------+
```

Alignment: the rail is 240px. The center column has 48px inner padding, and the stage, title, narration, and choices all share one left edge. The title sits inside the stage on a bottom scrim, 32px above the stage edge. The narration starts 32px below the stage. Below 1100px the stage goes full-bleed and the rail collapses to a strip.

### Player, phone (390)

```
+--------------------------+
| [<] Topic       [||][vol]|
| +----------------------+ |  stage full-bleed, 56vw tall
| |  scene + pins        | |
| |  Title (30)    date  | |
| +----------------------+ |
| (o)G1  ( )G2  ( )G3   -> |  lens strip, horizontal scroll, 44px
| Narration ...            |
| Grounded in 4 sources >  |
| ( ) choice               |  choices: full-width rows, 56px
| ( ) choice               |
+--------------------------+
| [Graph] [ Ask...  ][mic] |  sticky bottom strip
+--------------------------+
 Paper = full-height bottom sheet; graph = full-screen sheet.
```

## 4. Components, visual decisions

- **Stage.** Generated image: a grayscale image under two blend layers (`shadow` with multiply, `highlight` with screen). That gives a GPU-composited duotone, which is cheaper than an SVG filter on a panning image. I'll also benchmark an `feColorMatrix` duotone and keep whichever holds 60 fps on a phone. A slow Ken Burns pan (transform only, 24s). The `AiBadge` is fixed bottom-right inside the frame. A placeholder is a procedural SVG scene (layered silhouettes, a light source, haze bands) seeded by `segment_id` and graded the same way, so it already looks like a print. The space is reserved at a fixed aspect ratio, so there's no layout shift.
- **Develop-in.** When an image arrives it "develops": a `prussian` overlay fades from opacity 1 to 0 over `DEVELOP_MS` while the image goes from slightly low contrast to full. The same motion is used for the landing load. One motion, two uses.
- **Source pins.** Small `fiber` tags with `prussian` Hanken 13px text naming the source type ("Primary", "Oral history"). Because they're paper, they read as evidence before you read them. The contract has no claim coordinates, so pins are placed deterministically from a `claim_id` hash into safe zones (avoiding the title scrim and the badge). Clicking or pressing Enter opens that source on paper with its excerpt marked.
- **NarrativeCard.** Not a card: the title is on the stage, and the narration sits directly on `prussian` with no box. Under it, a plain text control: "Grounded in 4 sources" toggles "How this was grounded", a hairline-ruled list of claims, each ending in a source tag. A segment with `is_grounded: false` replaces the narration with a calm note: "We could not ground this part in the sources, so we are not narrating it." It shows `grounding_notes` and offers "Try another point of view".
- **ChoiceButtons.** Full-width rows separated by hairlines, not cards. Each row has: an aperture glyph filled in the choice's `perspective` grade, the label in Hanken 17, and the `choice_type` in plain words at the right in `fog` ("Another point of view", "Go deeper", "What happened next", "Read the source"). Rows arrive with a 200ms stagger after the narration ends (fade only, no slide). Hover and focus brighten the row and draw a 2px grade rule on its left.
- **LensRail.** Each perspective is an aperture glyph plus its label in the grade's `text` tint. The current lens is an open aperture; the others are stopped down. Coverage reads "Heard 2" or "Not heard yet" in `fog`. Activating a lens triggers the pull.
- **SourcePanel.** A `fiber` sheet slides from the right (on phones, from the bottom). It has the title (Hanken 600), the type and perspective as plain text, attribution and license, the excerpt in Courier Prime with the cited span marked in the grade `mark` color, and "Informed" plus the segment titles. It never shows an image.
- **ContradictionSplit.** Two halves on `developer`, each with one account and its source tag. The seam is an SVG torn-edge path (jagged and seeded) stroked in `safelight` with a 12px `safelight` glow at 25%, like light leaking through a tear. The explanation sits beneath, full width. On phones the tear runs horizontally.
- **KnowledgeGraph.** Nodes are small square "prints": a 48px graded swatch of the segment's procedural scene plus a Gloock 15px title (the one place Gloock is allowed small, because it's a print caption at thumbnail scale; this exception is noted on purpose). The current node has a `print` ring that pulses twice, then rests. Edges: `caused_by` solid, `happened_next` solid with an arrow, `same_event` dotted, `deeper_context` thin `fog`, `opposing_view` dashed `safelight`. A legend sits bottom-left. It is lazy-loaded.
- **AiBadge.** A `prussian` chip at 80% opacity with `print` Hanken 13: "AI-generated illustration" / "AI narration". The `GradedImage` component requires it structurally: the badge is rendered inside the image component, with no prop to hide it.
- **Errors.** A thin `safelight` rule plus a specific sentence and one action. They are always on the dark side; never red fills.

## 5. Motion plan (complete list; anything not here is still)

1. **Landing load (about 2.2s, once).** The frame is black. The panels develop in left to right, staggered by `STAGGER_MS`. The wordmark slices develop with their panels. Then focus pulls A → B → C → B once, so the viewer learns the gesture. Then the headline and field appear (fade, 400ms).
2. **Hero focus pull.** The pointer x picks a panel (on touch: drag or tap). Each panel holds **two pre-rendered layers**: sharp and pre-blurred (the blur is applied once as a static filter and never animated). The pull crossfades their opacity and moves `scale` 1.0 ↔ 1.03 and a darkening overlay 0 ↔ 0.45. Only opacity and transform animate. Duration 500ms.
3. **Perspective pull in the player (`PULL_MS` 700).** 0–260ms: a 6-blade SVG iris closes to a small opening (blade rotation, transform only) while the stage crossfades to its blurred layer. 260–440ms: under the closed iris, the grade swaps (the blend-layer colors change), the rail updates, and the new voice is queued. 440–700ms: the iris opens and the blurred layer fades back to sharp. The new narration starts typing at 700ms.
4. **Typewriter.** `TYPE_SPEED_MS` per character, with full text in `aria-live` immediately (visually typed, announced whole). Tap or click to complete.
5. **Choices arrive** after the narration ends (stagger, fade).
6. **Graph nodes grow in** (scale 0.6 → 1 plus fade, 300ms) when added.
7. **Image develop-in** (`DEVELOP_MS`).

`prefers-reduced-motion`: no pan, no iris, and no pulls. Changes are 200ms crossfades, the typewriter shows full text instantly, the landing shows its final state, and the hero focus follows the pointer with an instant swap.

## 6. What makes this page its own

1. **The focus pull is the brand.** The wordmark itself is cut across three vantage panels and goes in and out of focus with them. No other screen element competes with it.
2. **Material tells you the epistemic status.** Screen = narration (can be AI, is graded, is labeled). Paper = evidence (typed, marked, never AI imagery). Red tear = disagreement or failure. A viewer learns this in one demo without being told.
3. **Grades, not color-coded tags.** Perspectives are distinguished like different prints of the same negative, so mixed-quality AI images look like one body of work.
4. **One ink across both worlds.** `prussian` is the night of the stage and the ink on the paper, which ties the two surfaces together.

## 7. Plan review against the brief (Step 2)

Checked against the default look for a "dark cinematic history app":

| Default trap | Found in the draft? | Change |
| --- | --- | --- |
| Cream and gold on charcoal | Partly. The proposed `#DCD6C2` paper is warm parchment, and with a serif it pulls toward "old manuscript" | Moved paper to a cooler photographic fiber stock, `#D9D8CC`. Dropped the separate ink color and use `prussian` as ink. No gold or amber anywhere; warmth only comes from a perspective grade if the topic asks for it |
| Serif display with a warm accent | Risk: Gloock plus a grade-colored word in the headline | The headline is plain `print`, with no accent word and no italic. Grade colors live only in images, lenses, and choice glyphs |
| Identical rounded cards with soft shadows | Yes in my first pass: choices and narration were boxed cards | Narration has no box. Choices are hairline rows. Sources are sheets, not cards. Radius is 2px, with no shadows on the dark side |
| Tracked caps eyebrows above headings | The wireframe had `date_label` above the title | `date_label` sits on the title's baseline, right-aligned in the stage like a slate note, in sentence case Hanken. No eyebrows anywhere |
| 01/02/03 markers | First draft numbered source pins and the timeline frames | Pins are named by source type. Timeline frames show grade swatches and titles only |
| One emphasized word in the headline | The proposed headline idea leaned on "every side" | Plain sentence, one weight, one color |

Other revisions from the review:

- **Removed:** viewfinder crop marks on the stage corners. They were a fourth texture alongside grain, vignette, and iris, and they didn't serve the brief.
- **Simplified:** develop-in now does double duty (landing load and image arrival) instead of adding a separate image fade.
- **Performance:** the focus pull never animates `filter: blur`. It crossfades pre-blurred layers instead, and the duotone uses blend layers by default, with an SVG filter only if it benchmarks as well.
- **Honesty:** a "Demo content is cached" note shows whenever demo mode or mocks are active, and "Offline mode" shows when the API is unreachable.

## 8. Open items for the team

- `frontend/.env.example` has `VITE_API_URL=http://localhost:8000` (no `/api`). The build brief uses `VITE_VANTAGE_API_URL` defaulting to `http://localhost:8000/api`. I plan to read the new name and fall back to the old one plus `/api`.
- `src/constants/enums.js` and `backend/enums.py` are both empty shared-contract files. I'll fill `enums.js` with the enums from the brief verbatim; Person A should mirror them in `enums.py`.
- `demo/demo_path.json` is `[]`. Demo mode will need Person C's path and cached media.
- The contract has no on-screen coordinates for claims, so pin placement is deterministic and decorative in position, meaningful in content. If we want pins over specific parts of a scene, that would need a new optional field.

# Vantage UI redesign: four directions

Phase 1 of the redesign. Nothing here changes the shipped app: every prototype lives behind `/lab` in its own lazy chunk.

- **Compare them live:** run `npm run dev`, open `http://localhost:5173/lab`. Each direction is also at `/lab/aperture`, `/lab/editorial`, `/lab/diff`, `/lab/stories`.
- **Jump to a state:** add `?view=player`, `?view=evidence` or `?view=contradiction` (plus `&instant=1` to skip typing).
- **Screenshots:** `frontend/design/screens/<id>-<view>-<width>.png` at 390, 768 and 1440. Regenerate with `node scripts/lab-shots.mjs`.

## What every prototype shares, and what it fakes

All four play the same bundled mock story (`src/mocks/titanic.js`) through the existing in-browser mock server, so loading states are real and there are no network calls (the screenshot script fails if it sees one). Perspectives, labels and colors are read from the topic data. Each direction derives its own palette from each perspective's hue in OKLCH (`src/lab/shared/color.js`), then checks contrast.

Three things are simulated, and the report should not be read as if they were real:

1. **The illustration.** The procedural scene stands in for a generated image and "arrives" after 0.9 s, so each direction can show where the "AI-generated illustration" label lives. It is not an AI image.
2. **The voice.** There is no audio in the lab. The pause button pauses the typed captions. The "AI narration" label is shown where it would sit.
3. **Two states are designed in words only:** the ungrounded-segment fallback and the error state (described per direction below, not built).

Trust wording is fixed in one shared file (`src/lab/shared/bits.jsx`), so no direction can soften a label. In all four: captions are always on, the evidence view contains no images, every segment has a visible "How this was grounded" entry point, and a contradiction is marked with the words "Sources disagree", an unequal sign, and named sides (never color alone).

---

## A. Aperture

**Concept.** A dark stage you step into: one frame, and a lens ring that decides who is telling it.

**Who it wins over.** Judges who score the demo as a film. It is the strongest version of "documentary", and the perspective switch is a physical, legible gesture from across a room.

**Palette.**

| Name | Value | Use | Contrast |
| --- | --- | --- | --- |
| Stage | `#0A0C0F` | page, frame base | |
| Text | `#F3F5F6` | primary text | 17.9 on stage, 7.3 on glass over a pure white frame (worst case) |
| Dim | `#C6CDD5` | metadata | 5.0 on worst-case glass |
| Glass | `rgb(10 12 15 / 0.72)` + 18 px blur | floating panels (opaque 0.94 on phones) | |
| Signal | `#FF6A4D` graphic, `#FF8F78` text | contradiction only | text 5.0 on worst-case glass |
| Paper | `#EFEDE6`, ink `#14171B` | evidence sheet | 15.3 |
| Perspective accent | hue of the topic color at L 0.80, chroma up to 0.14 | date, ring mark, choice dot | 10.2 to 10.7 on stage, 5.8 to 6.1 on worst-case glass, across all 8 sample perspectives |
| Perspective grade | same hue at L 0.86 (highlights) and L 0.16 (shadows) | duotone of the frame | not text |

**Type.** Archivo Variable (`@fontsource-variable/archivo`, weight and width axes). Title 44 to 112 px, weight 660, width 118. Scene title 28 to 40 px, weight 640, width 116. Body 17/27. Labels 12 and 13. Evidence excerpts in Geist Mono 13/21. The width axis is the kinetic device: the ring mark in focus is wide and heavy, the others are condensed.

**Layout.** Full-bleed frame. Three rows: 64 px bar, content, 104 px ring. Content is two glass panels on a 24 px margin: the caption card bottom left (max 560), choices and the contradiction bottom right (max 400). Space scale 4, 8, 12, 16, 24, 32, 48. Radius 6, 14, full.

**Motion and the signature.** The focus pull, 700 ms total. 0 to 260: the frame crossfades to a pre-blurred copy (blur is never animated), title and captions drop to 35%, the ring turns under its fixed index. 260 to 440: the grade swaps under the blur. 440 to 700: the sharp frame returns, the new captions start. Reduced motion: no blur, no ring travel, a plain swap. On the landing page the ring turns once through every account by itself, so the idea lands before anyone touches it.

**Trust UI.** "AI-generated illustration" is a chip on the frame, shown only once the image is there (before that: "Developing the illustration"). "AI narration" sits beside the pause button. "Grounded in N sources" is a button on the caption card, with source chips under it. Evidence is a paper sheet, text only. A contradiction splits the frame's grade down a red seam and opens a card with both accounts, named.

**Phone.** The frame is the top 42% and sticks; the story scrolls under it on opaque panels; the ring is fixed to the bottom with safe-area padding. The sheet becomes a bottom sheet.

**Risks.** Performance: two full-screen blend layers plus backdrop blur; the slow pan is already off on phones, and glass is opaque there. Accessibility: text over imagery needs the scrims kept honest. Effort: lowest, because Stage, GradeLayers, the lens rail and `usePerspectivePull` already exist and map one to one. Distinctiveness: dark and cinematic is the most common hackathon look.

```
LANDING                                   PLAYER
+--------------------------------------+  +--------------------------------------+
| (o) Vantage            Sample note   |  | (o) Vantage  topic       Sample note |
|                                      |  |                  [AI illustration]   |
|  The sinking         full-bleed      |  |          full-bleed frame            |
|  of the Titanic      graded frame    |  | +--------------+     +-------------+ |
|  See what happened from every side.. |  | | date         |     | o choice    | |
|  | lead sentence of this account     |  | | Scene title  |     | o choice    | |
|  | As told by officers and crew      |  | | captions...  |     | o choice    | |
|  [ Step inside > ]  4 views, 15 src  |  | | [||] AI narr [Grounded in 2]     | |
|     Turn the ring to change who...   |  | | [chip][chip] |     +-------------+ |
| ''''|''''|''''|''''V''''|''''|''''|' |  | +--------------+                     |
|        CREW   passengers   third     |  | ''''|''''|''''V''''|''''|''''|''''|' |
+--------------------------------------+  +--------------------------------------+

EVIDENCE                                  CONTRADICTION
+------------------------+-------------+  +------------------+-------------------+
|  frame, dimmed         | How this    |  |  grade A         |  grade B          |
|                        | was grounded|  |                  | +---------------+ |
|                        | 1 claim [T] |  |                  | |(≠) Sources    | |
|                        | 2 claim [T] |  |                  | |    disagree   | |
|                        | ----------- |  |                  | | Claim         | |
|                        | Type, voice |  | +------------+   | | One   | Other | |
|                        | Title       |  | | captions   | red | acct  | acct  | |
|                        | "excerpt"   |  | +------------+ seam| Why they differ| |
|                        | Open orig.  |  |                  | +---------------+ |
+------------------------+-------------+  +------------------+-------------------+
```

---

## B. Editorial

**Concept.** A bright, magazine-grade long read where every claim has a note in the margin.

**Who it wins over.** Judges who weigh utility and trust, and anyone reading on a phone. In a room of dark demos it is the only white page.

**Palette.**

| Name | Value | Use | Contrast on paper |
| --- | --- | --- | --- |
| Paper | `#FAF8F3` | page | |
| Ink | `#17181B` | text, rules | 16.7 |
| Dim | `#5B6068` | metadata | 6.0 |
| Line | `#DCD8CE` | hairlines | not text |
| Red | `#B42318` | contradiction only | 6.2 |
| Perspective ink | hue of the topic color, darkened until 5.5:1 | datelines, drop cap, tab rule, note numbers | 5.6 to 6.0 across all 8 sample perspectives |
| Perspective wash | same hue at L 0.92 | open note, duotone plate | ink on wash is 13.8 or more |

**Type.** Newsreader Variable with optical sizes (`@fontsource-variable/newsreader`). **This is the one direction using a contemporary serif for display (the flagged exception).** Title 56 to 176 px, weight 300, tracking -0.045em. Headline 44 to 80. Body 21/33 (19/30 on phones) with a drop cap. Notes and labels in Geist 13.

**Layout.** One 680 px text column with a 300 px margin-note column beside it at 1100 px and up; below that the notes fall under the text as footnotes. Hairline rules, no cards, no shadows, radius 0 except two round controls. Space scale 4 to 96.

**Motion and the signature.** "Re-set the page", 700 ms, using the View Transitions API. The old column slides 12 px left and fades (240 ms), a 3 px rule in the new perspective's ink sweeps across under the tabs, and the new column is wiped in from the left like a fresh proof (460 ms), notes following 80 ms later. Without View Transitions support, or with reduced motion, it is a plain swap. Landing: a sticky "One story, as told by ..." line that rewrites itself as each account scrolls past.

**Trust UI.** "AI-generated illustration" is the figure caption, which is where a reader already looks for a credit. "AI narration" sits in the masthead next to the listen control. "How this was grounded" is always on screen: numbered claims in the margin, each opening its source in place. A contradiction is a full-width passage under a red rule: flag, claim in italic, two accounts side by side with an unequal sign between them.

**Phone.** The strongest of the four: it is a page. Tabs scroll sideways, notes become footnotes, the two accounts stack.

**Risks.** Performance: lowest. Accessibility: lowest. Effort: medium to high, because it is a light theme, so the graph, map and every existing dark component need restyling. Feel: it reads as an article with a picture, not a film, so voice and image carry less of the demo.

```
LANDING                                   PLAYER
+--------------------------------------+  +--------------------------------------+
| Vantage                 Sample note  |  | Vantage  topic      (||) AI narration|
|======================================|  | Crew | Passengers | Third | Inquiries|
|  The sinking                         |  | ===== (tab rule in perspective ink)  |
|  of the Titanic      (176 px serif)  |  |   date, as told by crew    HOW THIS  |
|--------------------------------------|  |   Warnings on             WAS GROUNDED|
|  See what happened    [Begin reading]|  |   the wire                1 claim    |
|======================================|  |   +----------------+        source   |
| One story,      | Officers and crew  |  |   | duotone plate  |      2 claim    |
| as told by      | Warnings on the..  |  |   +----------------+        source   |
| officers        | lead sentence      |  |   AI-generated illustration          |
| and crew        |--------------------|  |   O n Sunday, 14 April 1912 ...      |
| (sticky)        | Cabin passengers   |  |     (drop cap, typed captions)       |
+--------------------------------------+  +--------------------------------------+

EVIDENCE (note opens in place)            CONTRADICTION (full width, in the text)
+--------------------------------------+  +--------------------------------------+
|   body text ...       1 claim        |  | ==================================== |
|                         source  v    |  | (≠) Sources disagree                 |
|                       +------------+ |  | The Californian could have reached.. |
|                       | Title      | |  | -------------   ≠   --------------- |
|                       | "excerpt"  | |  | One account,    |   Another account, |
|                       | voice      | |  | inquiries       |   officers         |
|                       | Open orig. | |  | text ...        |   text ...         |
|                       +------------+ |  | source          |   source           |
|                       2 claim        |  | Why they differ. ...                 |
+--------------------------------------+  +--------------------------------------+
```

---

## C. Diff

**Concept.** A tool built by people who love evidence: perspectives are columns, claims carry blame, a contradiction is a hunk.

**Who it wins over.** Technical judges. "History has merge conflicts" explains the product in five words to anyone who has used git, and the blame gutter makes grounding feel rigorous instead of decorative.

**Palette.**

| Name | Value | Use | Contrast |
| --- | --- | --- | --- |
| Graphite | `#0D0E10` | background | |
| Panel / Raised | `#131518` / `#1B1E22` | panes, selection | |
| Line | `#282C32` | rules | not text |
| Text | `#E7E9EC` | primary | 15.9 |
| Dim | `#9BA3AD` | metadata, gutters | 7.6 on graphite, 6.6 on raised |
| Cursor | `#E8C547` | focus, selection, primary button | 11.5 on graphite, button text 11.2 |
| Conflict | `#FF8A70` | contradiction flag | 7.3 on raised |
| Perspective lane | hue of the topic color at L 0.78, chroma up to 0.15 | lane, tab, A and B rows | 9.4 to 9.9 on graphite, 8.1 to 8.6 on raised |

**Type.** Geist Variable for reading, Geist Mono Variable for everything structural (both already installed). Headline 40 to 96, weight 620. File title 28. Narration lines 17/27. Gutters and labels mono 12 and 13.

**Layout.** A fixed workspace at 1100 px and up: 264 px path (commit graph), the perspective columns, 368 px source inspector, a 32 px status bar. Columns are a horizontal accordion: the perspective in focus is open, the rest are 44 px spines. Radius 4. Below 1100 px it is one column: tabs wrap, the path goes under the file, the inspector is a bottom sheet.

**Motion and the signature.** "Checkout", 600 ms. The status bar prints `checkout cabin passengers`, the columns trade widths (300 ms), the new file's lines cascade in 28 ms apart, and the path draws a curve to the new lane. Reduced motion: instant.

**Trust UI.** Grounding is the main content, not a drawer: every claim is a row with its source id and type in a blame gutter, and selecting it opens the source in the inspector with "Cited for". The illustration is a small strip with the AI label burned into its corner. A contradiction is a hunk: a "Sources disagree" header with an unequal sign, then rows lettered A and B, each naming its account and source. Letters and labels carry it; lane color is a second cue. I used A and B and not minus and plus on purpose: minus and plus would imply one account replaced the other.

**Keyboard.** Cmd+K or Ctrl+K opens a palette that jumps to a perspective, a next step, or any source by number. Enter starts from the landing page.

**Phone.** Usable but dense. This is a desktop idea first.

**Risks.** Performance: lowest. Accessibility: good (real buttons, high contrast), small mono text needs care. Effort: highest, because the path, columns, inspector and palette are all new. Reach: the metaphor delights engineers and may read as cold to everyone else, and the picture and voice almost disappear.

```
LANDING                                   PLAYER
+--------------------------------------+  +--------+-+-+-+---------------+--------+
| Y vantage               Sample note  |  |Y vantage titanic/crew  [Jump to  ⌘K] |
|                                      |  +--------+-+-+-+---------------+--------+
|  History has                         |  | PATH   |c|t|i| Officers, crew| SOURCE |
|  merge conflicts.                    |  | o seg  |a|h|n| Scene title   | type   |
|  Vantage lays every account side...  |  | |      |b|i|q| [strip][AI]   | voice  |
|  [> Open the sinking of...  <-']     |  | o seg  |i|r|u| NARRATION     | from   |
|  4 perspectives / 15 sources / 2     |  |  \     |n|d|i| 1 line        | Title  |
| +----------------------------------+ |  |   o    | | |r| 2 line        | Cited  |
| |(≠) Sources disagree  Claim       | |  |        | | | | GROUNDED      |  for   |
| | A  T13 secondary | Account A ... | |  |        | | | | T01 enc | claim| "text" |
| | B  T02 primary   | Account B ... | |  |        | | | | T08 pri | claim| used in|
| +----------------------------------+ |  +--------+-+-+-+---------------+--------+
+--------------------------------------+  | # reading  3 claims  2 sources        |

EVIDENCE (row selected)                   CONTRADICTION (hunk in the file)
+---------------------------+----------+  +--------------------------------------+
| GROUNDED                  | SOURCE   |  | (≠) Sources disagree   Claim         |
|>T01 enc | claim (selected)| T01      |  |--------------------------------------|
| T01 enc | claim           | type     |  | A | T04 primary | Account A, inquiries|
| T08 pri | claim           | voice    |  |   |             | text ...            |
|                           | Title    |  | - - - - - - - - - - - - - - - - - - |
|                           | Cited for|  | B | T05 primary | Account B, officers |
|                           | "excerpt"|  |   |             | text ...            |
|                           | Open     |  |--------------------------------------|
+---------------------------+----------+  |     Why they differ ...              |
```

---

## D. Stories

**Concept.** The story as full-screen cards you tap through and swipe between, one color block per side.

**Who it wins over.** Anyone under 30 with a phone, and judges scoring creativity and enthusiasm. It is the only direction built to be passed around a group chat, and the only one that makes people want to keep tapping.

**Palette.**

| Name | Value | Use | Contrast |
| --- | --- | --- | --- |
| Paper | `#F3EFE6` | page, sheet | |
| Ink | `#121212` | text, borders, seam | 16.3 on paper |
| Dim | `#55524B` | metadata | 6.8 on paper |
| Red | `#C8321E` | contradiction icon only | white on red 5.3 |
| Perspective block | hue of the topic color at L 0.80, chroma boosted up to 0.15 | the card | ink on block 9.6 to 10.4 across all 8 sample perspectives |

A neutral topic color stays neutral: the gray "inquiries" perspective becomes a sage block, not an invented hue.

**Type.** Bricolage Grotesque Variable (`@fontsource-variable/bricolage-grotesque`, weight and width axes). Headline 56 to 144, weight 800, width 80. Card text 30 to 44, weight 800, sized in container units so it fits the card. Labels 13, weight 600 to 700.

**Layout.** One card fills the screen. Top: progress bars, a tilted perspective sticker, the date. Middle: one sentence. Bottom: a "N sources" sticker, the AI narration label, pause, save. Under the card: a row of side pills. On a laptop the card sits in a 400 px frame between "Your path" and an always-open "How this was grounded" rail. Radius 8, 28, full. 2 px ink borders, hard offset shadows on choices, no soft shadows.

**Motion and the signature.** The swipe. The card leaves with a 5 degree tilt and the next side's card springs in from the edge (spring, about 500 ms), with a haptic tick on phones. Inside a scene, each sentence is a card and its words pop in 70 ms apart; a progress bar advances by itself and pauses on demand. Reduced motion: no auto-advance, no word pop, a crossfade for the swipe.

**Trust UI.** The cover card carries the illustration and its AI label. Captions are the content. The "N sources" sticker is on every card and opens the grounding sheet (always open on a laptop). A contradiction is its own card: two color blocks, one per account, with a black seam between them that says "Sources disagree" and states the claim, followed by a "Why they differ" card. Any text card saves as a 1080 by 1920 image that carries the source line and the AI and sample notes.

**Phone.** Native. Tap zones are the whole card, controls are 44 px, safe areas are respected.

**Risks.** Trust: on a phone the grounding list is one tap away, not on screen. Accessibility: auto-advance and swipe both need equivalents (they have them: pause, arrow keys, pills), and this is the direction most likely to be scored down for motion. Effort: high, because it is a new player model and the graph, map and voice sync need new homes. Demo: on a projector the phone frame is small.

```
LANDING (phone)        PLAYER (phone)         EVIDENCE (sheet)       CONTRADICTION (card)
+------------------+   +------------------+   +------------------+   +------------------+
| Vantage   Sample |   | Vantage   Sample |   | card, dimmed     |   | == == == == -- --|
|                  |   |+----------------+|   |                  |   | [Inquiries] date |
| Four sides.      |   || == == -- -- -- ||   |+----------------+|   | One account      |
| One story.       |   || [Crew]    date ||   || How this was   ||   | text ...         |
| The sinking of.. |   ||                ||   || grounded   (x) ||   | source  (block A)|
| [Start the story]|   || On Sunday, 14  ||   || claim          ||   |##################|
| 15 sources ...   |   || April 1912,    ||   || (doc Type, who)||   |(≠) Sources       |
|  +-----------+   |   || Titanic's ...  ||   ||  Title         ||   |disagree. Claim   |
|  |[Crew]     |\  |   ||                ||   ||  "excerpt"     ||   |##################|
|  | lead      | | |   ||(2 sources) AI  ||   ||  Open original ||   | Another account  |
|  | sentence  | | |   ||  narr (||) (v) ||   || claim          ||   | text ... (block B)|
|  +-----------+/  |   |+----------------+|   |+----------------+|   | (3 sources) (||) |
+------------------+   | (Crew)(Passen..) |   +------------------+   +------------------+
```

On a laptop: `[ Your path ] [ card ] [ How this was grounded ]`.

---

## How each would handle the states I did not build

| State | Aperture | Editorial | Diff | Stories |
| --- | --- | --- | --- | --- |
| Ungrounded segment | Frame stays soft (never sharpens), card says "We could not ground this part in the sources, so we are not narrating it", one action | A boxed editor's note in place of the body, no drop cap | A file with zero narration lines and a status of `ungrounded`, the notes shown as a comment | A paper-colored card (no perspective color), same sentence, one button |
| Loading the next part | Ring mark pulses, frame holds its blur, status line on the frame | Tab rule sweeps back and forth, "Setting the page" | Status bar prints the action, column spine pulses | Pill fills with the block color, choice presses in |
| Error | Thin signal rule on the card, sentence, "Try again" | Red rule above a one-line note | Status bar turns to the conflict color with a retry key | A tilted paper sticker with "Try again" |
| Offline or demo | Note in the bar | Colophon line | Status bar, right side | Top bar |

---

## Scores

1 to 5, and **5 is always the good end** (so 5 on a risk row means low risk). Effort is my estimate in hours to roll the direction out across the whole app behind `?ui=v2`, one person, including graph, map, voice input and states.

| | Aperture | Editorial | Diff | Stories |
| --- | --- | --- | --- | --- |
| Wow in five seconds | 5 | 4 | 3 | 5 |
| Idea clear in ten seconds | 4 | 4 | 5 | 4 |
| Fit with creativity, utility, charity, avidity | 4 | 4 | 3 | 4 |
| Mobile quality | 3 | 5 | 3 | 5 |
| Visibility of trust UI | 4 | 5 | 5 | 3 |
| Accessibility (5 = low risk) | 3 | 5 | 4 | 3 |
| Performance (5 = low risk) | 3 | 5 | 5 | 4 |
| Distinct from a typical hackathon UI | 3 | 4 | 4 | 5 |
| **Total of the eight rows** | **29** | **36** | **32** | **33** |
| Build effort, whole app | about 9 h | about 11 h | about 13 h | about 12 h |

These are my judgments from building and using the four prototypes, not measurements. The contrast figures above are computed; frame rate on a real mid-range phone has not been measured for any of them.

## Recommendation

**Build Aperture, and set all of its evidence in Editorial's language.** A specific hybrid:

- **Aperture for the first ten seconds and the signature moment:** the full-bleed frame, the lens ring, the focus pull, the split frame for a contradiction.
- **Editorial for everything a viewer has to trust:** the evidence sheet becomes Editorial's paper, with Newsreader for claims, numbered notes that open in place, and the side-by-side disagreement passage under a red rule. The illustration credit sits in a caption line under the frame on phones.

Why this and not the highest total:

1. **The product is a documentary with a voice and a picture.** Editorial scores best on paper because it is the safest page, but it turns the film into an article, and the two-minute demo is won by the moment the voice, the grade and the frame change together. Aperture is the only direction where that moment is the whole screen.
2. **It is the cheapest to ship.** `Stage`, `GradeLayers`, `LensRail`, `Iris` and `usePerspectivePull` map one to one onto Aperture, and the existing rule in `DESIGN.md` (screen is narration, paper is evidence) is exactly this hybrid. With the deadline at 8:30 tomorrow, about 9 hours against 11 to 13 is the difference between a finished Tier 2 and a half-converted app.
3. **The hybrid fixes Aperture's two weak rows.** Putting evidence on a calm, high-contrast paper page raises trust visibility and accessibility, and it gives the demo a second "look": dark for the story, white for the proof.

What I would not do: Stories as the base. It is the most original and I would enjoy building it, but it is a new player model with the highest risk of a broken demo, and it shows small on a projector.

**The two strongest ideas to borrow from the others:**

1. **From Stories: save any moment as a share card.** One canvas function, about an hour, no dependencies. It gives the Devpost a gallery, gives judges something to take away, and every card carries its source line.
2. **From Diff: the Cmd+K palette, and lettered A and B accounts.** The palette makes the live demo fast and keyboard-complete (jump to any perspective or source by name). Lettering the two accounts makes a contradiction unmistakable without relying on color.

If the answer is "bolder", the alternative I would stand behind is **Editorial with Aperture's frame as the opening figure**: lower risk on phones and accessibility, about two hours more work, less cinematic.

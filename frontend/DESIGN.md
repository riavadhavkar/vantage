# Vantage design

This describes the new interface, which is opt-in at `?ui=v2`. Today's interface ("classic") is still the default and the demo fallback; nothing here changes it. The earlier design document described a serif, three-panel concept that the code had moved past; it is in git history.

Companion documents: [design/PLAN.md](design/PLAN.md) (build plan and decisions), [design/MOTION.md](design/MOTION.md) (every animation), [design/DIRECTIONS.md](design/DIRECTIONS.md) (the four directions explored first), [design/HANDOFF.md](design/HANDOFF.md) (what is done and how to review it).

## The idea

A documentary is one cut. Vantage is the same moment from every side, with every claim tied to its source. The interface says that with three materials:

- **The stage** (dark, full-bleed): the story. One frame, and a lens ring that decides who is telling it. Switching point of view pulls focus.
- **Glass** (panels over the stage): what is being said now, and where you can go next.
- **Paper** (light sheet): evidence. Text only, never a generated image.

Signal orange means one thing: sources disagree, or something failed. It is never decoration.

## How to see it

| URL | What |
| --- | --- |
| `/?ui=v2` | New interface, live backend (falls back to the cached demo, labeled, if the API is down) |
| `/?ui=v2&demo=1` | New interface on the cached demo, no network |
| `/?ui=v2&motion=slow` | Every animation at 3x, to judge timing |
| `/?ui=v2&motion=off` | Everything instant (same as the OS "reduce motion" setting) |
| `/` or `/?ui=classic` | Today's interface |
| `/lab`, `/lab/motion` | The four explored directions, and a bench that plays every motion token |

## Tokens

Color (perspective colors always come from the topic data; each is turned into a "look" in `src/v2/looks.js` and checked for contrast):

| Token | Value | Use |
| --- | --- | --- |
| stage | `#0A0C0F` | page and frame base |
| raised | `#14171B` | opaque panels |
| text, dim | `#F3F5F6`, `#C6CDD5` | 17.9 and 12.2 on stage |
| glass | `rgb(10 12 15 / 0.72)` + 18 px blur | panels over the frame; opaque on phones, in lite mode, and while the frame is changing |
| signal | `#FF6A4D`, text `#FF8F78` | disagreement and errors only |
| paper, ink, ink-dim | `#EFEDE6`, `#14171B`, `#4C535C` | evidence sheet |
| look.accent | topic hue at L 0.80 | ring marks, dates, dots, underlines (7:1 or better on stage) |
| look.highlight / shadow | topic hue at L 0.86 / 0.16 | duotone baked into drawn scenes |
| look.tint | classic highlight | faint wash over color illustrations |
| look.mark | topic hue at L 0.84 | highlighter on paper |

Type: **Archivo Variable** for everything (the width axis gives the ring and titles their engraved feel). **Geist Mono** at 12 px for metadata only. **Newsreader** for quoted source excerpts only, because that is the one text on screen Vantage did not write; it is one token, `--font-quote`.

Scales: type 12, 13, 15, 17, 20, 28, 40, display 44 to 112. Space 4, 8, 12, 16, 24, 32, 48, 64. Radius 6, 14, full.

Motion tokens live in `src/constants/theme.js` and the `@theme static` block of `src/index.css`: durations 120, 200, 320, 600, 900 ms, the 700 ms signature, a 60 ms stagger, three easings and one spring. See MOTION.md.

The v2 root re-points the classic color and font variables, so classic components reused inside it (graph, map, voice input, ambient, continue on phone) take the new look without edits.

## Trust rules (these are structural, not stylistic)

1. A generated image is shown only by `Frame`, which adds the "AI-generated illustration" badge itself once an image has loaded. There is no prop to hide it. A drawn placeholder scene is not AI and carries no badge.
2. Synthetic voice always shows "AI narration", plus "Device voice" when the browser is speaking.
3. The evidence sheet renders text only.
4. Every grounded scene has a "Grounded in n sources" control on its card.
5. An ungrounded scene is never narrated: no captions, no voice, a frame that stays out of focus, and a plain sentence saying why.
6. Captions are always on. Screen readers get the full text at once.
7. A contradiction is marked by the words "Sources disagree", an unequal-sign badge and accounts lettered A and B. Color is a fourth cue, never the only one.
8. Cached, sample or offline content is labeled in the bar.

## Structure

`src/v2/`: `V2App` (root), `Landing`, `Player` (composition), `Frame` (stage), `Captions`, `LensRing`, `Choices`, `Evidence`, `Disagreement`, `ui.jsx` (primitives), `usePlayer` (data and actions, the same calls as classic), `usePull` (the signature transition on one clock), `looks`, `claims` (claim to sentence matching), `gradedScene`, `softImage`.

Unchanged and shared with classic: `src/api/`, `src/mocks/`, `useSession`, `useNarration`.

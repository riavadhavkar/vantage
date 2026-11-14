# Handoff: landing redo and 13 player fixes

**Branch:** `b/ui-polish`, worktree `../vantage-polish`, from `main` at `04986bb`. 21 commits, not pushed.
**Tested with:** the in-browser mock server and the cached demo. The real backend was not running (`curl localhost:8000/api/health` refused both times I checked), so nothing here was tried against live `/api/translate`, `/api/tts` or `/api/image`.

## How to review

```
cd ../vantage-polish/frontend
VITE_VANTAGE_USE_MOCKS=1 npm run dev -- --port 5178          # http://localhost:5178
```

- **Port 5178, not 5177.** Port 5177 was already taken by a dev server running in `../vantage-ui` (not started by me), so I left it alone.
- **Photon test number.** The server I left running on 5178 also sets `VITE_VANTAGE_PHOTON_NUMBER=+15555550123`, a fictional 555 number, so the share sheet's "text with photon" section shows up. It is not in any file. Without that variable the section stays hidden, as before.
- **Demo mode:** run `npm run dev -- --port 5179` (no mocks), then open `/?demo=1`.

## What changed

### Part 0: housekeeping

- **Branches deleted locally** (`git branch -d`, all fully merged): `b/v2-only`, `b/graph-ui`, `b/media`, `b/ui-sketch`.
- **Worktree removed:** `../vantage-sketch`. It was clean, and the only dev servers in it were two I had started earlier, which I stopped first.
- **Branches deleted on origin** (merged, mine): `b/graph-ui`, `b/ui-sketch`, `b/v2-only`.
- **Skipped `b/ui-redesign`, local and remote:**
  - It is checked out in `../vantage-ui` with a dev server running on 5177.
  - The local branch has 2 commits that were never pushed (`5fde147`, `b656d40`).
  - Its remote copy is merged, but deleting it while that worktree is live seemed wrong.
- **Other people's merged remote branches, left alone:**
  - `a/`: agents, colorful, continuity, contract, deepagents, deepfix, docs, fallback, fast-translate, gemini, grok43, grounding, imagemodel-final, knowledge, languages, media, narrator, photon, polish, provider, storyboard, storyboard-ui, tighter-shots, topic, transcribe, voices.
  - `c/`: data, prompts.
- **`?ui=classic` and `/lab`:** these were already removed on `main` by PR #39 (`b/v2-only`) before this task started, so there was nothing left to keep.
- **Code removed:**
  - Classic-only CSS: vignette, caret, pulse-twice, loading-bar, stage, node-grow, the React Flow attribution rules.
  - The unused `@fontsource-variable/bricolage-grotesque` package.
  - My stale `sketch-*` scripts.
  - Dead pin and chip-flight code (item 3).
  - The v2 caption-era Choices component and the wash effect (item 7).
  - The "jump to" button styles.
  - The classic-only `SettingsPopover` and `IconButton`.
  - `ContinueOnPhone`, whose text now lives in the share sheet.

### Part A: the landing page

- **Layout:** one 100dvh screen, with no header title, no sound icon and no footer. The three panels sit behind a giant lowercase "vantage" with the shutter logo, and the panel dividers sit above the letters so they cut across them.
- **Load sequence:**
  - 0 to 1.3 s: blur-in. A copy blurred once cross-fades into a sharp one; the blur itself never animates.
  - 1.3 to 2.0 s: shrink and move up, as a transform only.
  - From 2.0 s: the three step pills arrive in a short stagger.
  - Reduced motion: the final state, with a quick fade.
- **The steps:** ① narration language, ② subtitles language (off, same as narration, the languages), ③ story.
  - Choosing an option collapses that step and opens the next.
  - A pill can be reopened, and clicking ③ first keeps the defaults for ① and ②.
  - English and "same as narration" are preselected, and focus lands on the preselected option, so Enter accepts each step.
- **Keyboard and accessibility:**
  - The steps are an ordered list; the active pill has `aria-current="step"`.
  - Options are a radio group with arrows, Home and End, Enter to accept and Escape to collapse.
  - A polite live region announces "step n of 3".
- **Phones:** finished steps shrink to compact chips ("1 spanish", "2 same") and the active step runs full width. No page scroll at 390, 768 or 1440.
- **Stories:** the two stories (titanic, princeton) come from the bundled topic data, which matches the backend's `TOPICS`. Picking one calls `startSession(title, narrationLanguage)` and shows the shutter ("opening the archive...").
- **Demo and offline:** English only. Steps ① and ② close on their own and ③ opens.
- **What the footer held** (the tagline, "ai images and voices are labeled", the data-source note) is now in the share sheet under "about vantage", together with the React Flow and OpenStreetMap credits. The "sample content / cached demo, not live" badge stays in the landing page's bottom-left corner. It is a trust label, so I didn't hide it.

### Part B: the 13 fixes

1. **Finding another perspective:** the pull now shows the turning shutter mark with 22 to 30 px, weight 700, pure white text on a near-opaque box (14.5:1).
2. **Logo:**
   - I reused the shutter mark from `public/favicon.svg`; it is now `v2/Logo.jsx`, and `v2/logoMark.js` draws it on the canvas. No new artwork was made.
   - It sits next to "vantage" on the landing page and in the player.
   - Below 430 px wide the player shows the mark alone, labelled "vantage", because the six header controls need the room.
3. **Floating source tags:** the tags themselves left with classic (#39). This removes what was left of them in v2 (pins, chip flight, styles). Sources stay in the sources panel.
4. **Shutter until the illustration loads:**
   - A new live scene with no image stays behind the shutter until its illustration has decoded, not just been requested.
   - It applies to the first scene and to each new scene.
   - Narration and the subtitle clock wait behind it.
   - Failure lets go, and the drawn scene stays. Image requests still use the existing 100 s client timeout.
   - After 20 s a "continue without the image" link appears.
   - The first scene's shutter appears without a fade, so it takes over from the landing page's.
5. **One-line subtitles:**
   - Phrases are measured with the subtitle's own font (canvas `measureText`). Breaks prefer a comma once the line is half full.
   - Phrases are re-measured on resize and once web fonts load.
   - They advance proportionally over `audio_duration_ms`, or the typing speed when that is missing.
   - A failed translation shows a toast and keeps the original text; the inline note is gone.
   - New `components/Toaster.jsx` and `hooks/useToast.js`: `role="status"`, polite, about 4 s each, at most two, and a repeated id replaces the toast in place.
6. **Share sheet:**
   - "share this moment", with a 1080 × 1350 canvas image: the scene's illustration (fetched as a blob, so the canvas can be exported), the logo, "vantage", and `<story> • <date>` in lowercase.
   - The only other mark is a small ⓘ ai badge, about 3 percent of the height at 82 percent opacity. Hovering or tapping it shows "ai-generated illustration"; the same words appear as a caption under the preview.
   - **Save image:** a PNG named `vantage-<story>-<date>-ai-generated.png`, with `Description: ai-generated illustration (vantage)` in a PNG tEXt chunk.
   - **Text with photon:** the message and number are unchanged (`VANTAGE <code>` to `VITE_VANTAGE_PHOTON_NUMBER`). There is an `sms:` link in the existing `?&body=` form and a QR code from `qrcode` with the same link. The plain "text … to …" line stays as the fallback.
   - **Secondary actions:** "share..." (Web Share with the image file, only where the browser supports files) and "copy link". Neither existed in v2 before.
7. **Choice pills removed:**
   - The timeline (click or arrow keys) and the ask bar move the story on.
   - `selectPerspective` still uses the same choice logic underneath, and Cmd+K still lists the choices.
   - The "this thread ends here" card stays.
8. **Seamless narration change:** see "backend notes" below for why it works this way.
   - The stage and text stay put, and the toast reads "switching narration to spanish..." then "narration is now in spanish".
   - The scene's narration and title are translated with `/api/translate` and voiced with `/api/tts`, in the same session, perspective and scene.
   - The old voice plays until the new audio arrives, then the new one picks up at the same point, proportionally, in the scene.
   - Later scenes are translated before their voice starts.
   - There is no confirmation and no shutter.
9. **Language button:** a globe icon replaces the chevron and opens two controls, narration and subtitles (with "off" and "same as narration"). Photon is not in it.
10. **Ambient sound removed:** `AmbientPlayer`, `useAmbientAudio`, `public/ambient/`, the setting, the styles, and the mentions in `DESIGN.md` and `design/MOTION.md`. The speaker toggle stays (its on/off state is still remembered).
11. **Story connections:** the legend is on the right, in lowercase. The "React Flow" corner label is hidden with `proOptions.hideAttribution`, and React Flow is credited in the share sheet's "about vantage" (not the README: it belongs to Person C, see CONTRIBUTING.md).
12. **Map:** zoom controls are top-right, styled like the graph's, and the panel is titled "map" with the place name as its subtitle.
13. **Sources:**
    - Titled "sources". "How this was grounded" is the first, open section: numbered claims, each with a chip that opens its source.
    - Then there is one collapsible card per source. The header shows the type and a chevron.
    - An open card shows a backbone or supporting tag, "informed perspective", "cited for", the quoted excerpt, "open original ↗" (new tab, `rel="noopener noreferrer"`), and attribution and license in small text.
    - Sections: in this scene, then cited earlier, then not cited yet (collapsed). The interface text is lowercase; source titles, excerpts and claims keep their case. No generated images appear here.

Also: interface text left in other places (the Cmd+K palette, error copy, the error screen, badges, `aria-label`s) is now lowercase, and the self-hosted Noto Sans Devanagari is now in the v2 font stack. Before this, v2's stack left it out, so Hindi used whatever system font was installed.

## Screenshots (`frontend/screenshots/`, git-ignored)

Each name below has `-390`, `-768` and `-1440` versions unless marked otherwise.

- **Landing:** `polish-landing-1-blur`, `-2-shrink`, `-3-step1`, `-4-step2`, `-5-step3`, plus `polish-landing-reduced-1440` and `polish-landing-demo-1440`.
- **Shutter:** `polish-shutter-start` and `polish-shutter-pull`.
- **Player** (one-line subtitles, no pills, no tags): `polish-player`.
- **Share:** `polish-share` and `polish-share-tooltip-1440`.
- **Language:** `polish-language-popover` and `polish-language-switched-1440`.
- **Panels:** `polish-graph`, `polish-map`, `polish-sources-expanded` and `polish-sources-collapsed`.
- **Hindi:** `polish-hindi-1440`. The mock never translates for real, so a generic Devanagari sentence is put into the subtitle line to test the font.

Scripts to re-run them are in `frontend/scripts`: `polish-landing.mjs`, `polish-share.mjs`, `polish-subtitles.mjs`, `polish-language.mjs` and `polish-verify.mjs`.

## Verification

- **Build and lint** pass at every commit, with one exception:
  - The ambient-removal commit was first made with a broken stylesheet, because my check only grepped the build output.
  - I fixed it and amended that commit before going on, and switched to checking exit codes. The history as it stands builds at every commit.
- **Console errors:** none in any scripted run.
- **Keyboard only, end to end:**
  - Landing: Tab to the options, Enter, arrows, Enter, Enter to start.
  - Player: tab order is wordmark, ask, mic, share, story connections, map, sources, sound, language, transcript, then the timeline.
  - Enter opens sources and Escape closes them. An arrow key on the timeline changes perspective.
- **Reduced motion:** the step bar is there at once with no blur copy, and the shutter blades stand still.
- **Demo mode** (`?demo=1`): the only origin contacted was the dev server itself (82 requests, none to `:8000`).
- **Languages:** switching narration mid-scene and setting subtitles to Hindi over Spanish narration both work as above. The Hindi font loads (`document.fonts.check` is true).
- **Subtitles:** every line seen at 390, 768 and 1440 was one line with no clipping.
- **Frame rate:** 56.7 fps on average during the blur-in and shrink at 4× CPU throttling, with 2 of 119 frames over 50 ms.
- **Share image:** the PNG is 1080 × 1350 with the tEXt metadata. The sms link is `sms:+15555550123?&body=VANTAGE%201001`, and the QR image is generated.
- **Contrast**, worst case with white behind any translucent layer:

  | Element | Ratio |
  | --- | --- |
  | Shutter text | 15.5 (overlay), 14.5 (inline) |
  | Subtitles | 11.8 or better |
  | Landing pills | 9.7 (collapsed), 17.9 (active) |
  | Landing options | 15.0 (title), 10.2 (line) |
  | Toasts | 17.9 |
  | Sources card metadata | 7.3 |
  | Graph legend | 12.2 |

## Decisions (from the defaults table, and my own)

- **Narration toasts:** "switching narration to `<language>`...", then "narration is now in `<language>`". If the translation fails: "narration in X is unavailable right now. continuing in Y."
- **Share image text:** `<topic title> • <date label>`, lowercase. There is no perspective, title, quote or stats on the image; the old card's stats panel was dropped.
- **Share image mark:**
  - The ⓘ ai mark is drawn only when the real AI illustration was used.
  - If it could not be read (no image yet, or a cross-origin block), the image uses the drawn scene. Then it carries no AI mark, the caption says so, and the filename ends in `-drawn-scene` instead of `-ai-generated`. Labelling a drawing as AI would be just as wrong as the reverse.
- **Backbone:** the source cited by the most claims in this scene; ties go to the first cited. The others in the scene are "supporting". Sources cited only in earlier scenes get no role tag.
- **After the pills:** the viewer moves on through the timeline and the ask bar; Cmd+K still lists the next steps.
- **Logo:** the existing shutter mark, reused. No new mark was made.
- **Story list:** bundled data, because there is no list endpoint.
- **Focus on expand:** focus goes to the preselected option rather than the first, so Enter accepts the default. On step ① and the story step that is the first option anyway.

## Not done, or not fully checked

- **The 20 s "continue without the image" link** wasn't exercised end to end, because the mock illustration arrives in 1.8 s. The logic is simple (a timer per gated scene), but it is untested.
- **The QR code** wasn't decoded by a machine, and the `sms:` link wasn't tried on a real iPhone or Android phone. The string uses the `?&body=` form both platforms accept.
- **Live backend:** nothing was tested against it (translate, tts, image, CORS on `/media`).
- **Narration swap position:** the voice picks up at the same fraction of the scene, so the sentence boundaries across languages won't line up exactly.

## Recommend removing, or deciding (I left these)

- **`frontend/scripts/v2-flow.mjs`, `v2-verify.mjs`, `v2-states.mjs`, `v2-shots.mjs` and `fps.mjs`** were written for v2 before the sketch layout. Their selectors (caption card, choice rows, "Jump to") no longer exist. Rewrite them or remove them.
- **`api/normalize.js`:** the backend `Segment` still has no `claims`, `is_grounded` or `grounding_notes`, so the adapter is still needed. Only its `connected_to`-as-a-string branch is obsolete.
- **`frontend/design/PLAN.md` and `HANDOFF.md`** still mention ambient sound and the classic UI as history. I didn't edit them (the rules say to leave `frontend/design/` alone).
- **Old screenshots:** `frontend/screenshots/` holds older `sketch-*` and `v2-*` images. They are git-ignored, so they're only on disk.

## Backend notes (for the backend owner)

- **Narration language mid-session:** there is no endpoint for it, and the language is fixed at `/api/start`. A new session can't reproduce the viewer's path, because its segments and choices are generated fresh. So the change is done on the client by translating and voicing each scene. If you want the narrator to write natively in the new language, a `POST /api/language {session_id, language}` that sets `state["language"]` for the following segments would let the client drop the translation for new scenes.
- **No story list:** there is no `GET /api/topics`, so the landing page lists the two bundled stories, which match `routers/topics.py`.
- **CORS on `/media`:** `CORSMiddleware` allows a single `VANTAGE_FRONTEND_ORIGIN`. The share image fetches the illustration from `/media/...`, so any frontend origin not on that list (other dev ports, preview deploys) gets the drawn scene in the share image instead of the illustration. Allowing a list of origins, or serving `/media` through the Vite proxy, would fix it.
- **The `Segment` schema** still lacks `claims`, `is_grounded` and `grounding_notes`. The frontend defaults them (`is_grounded` to true).

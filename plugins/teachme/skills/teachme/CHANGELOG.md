# Changelog

## 1.15 (22 Oct 2026): leaner and faster, same lessons

Nothing a learner sees changes: built lessons render pixel-identical to 1.14 (checked on 4 lessons, 3 screen sizes,
8 views each), and the engine's zoom plan is identical on all 52 test and example lessons.

- **Lessons open 30-40% faster.** The zoom planner used to replay every earlier step for each step (work that
  grew with the square of the step count); it now plays the steps once. Heart lesson 1.25 s to 0.90 s, Rome 2.1 s to
  1.2 s.
- **check.py is about 40% faster** (heart 66 s to 38 s, Rome 87 s to 49 s) with word-for-word the same findings: the
  click-through and the screen-size checks run beside the step views instead of after them. It still catches every
  planted fault (syntax error, crash, NaN, unpressable part, leftover TODO), and a missing engine tag is now a
  PROBLEM line instead of a bare exit.
- **Code cleanup.** `teach.js` is formatted with Prettier (syntax tree unchanged), has a contents header and a list
  of the lesson-facing API, and lost three pieces of dead code. The scripts were rewritten as small documented
  functions (black, ruff clean): `build.py` is the one place that inlines the engine, and check.py's in-page probes
  live in `check_probe.js` and `check_drive.js`. `build.py`, `new.py` and `gallery.py` produce byte-identical output.
  Style settings: `pyproject.toml`, `.prettierrc.json`.
- **Instructions said once.** Repeated rules in SKILL.md, design.md and drawing.md now live in one place; an
  independent rule-by-rule review confirmed nothing was lost. drawing.md's out-of-date copy of the reserved names is
  gone, and api.md's list gained 12 engine globals it was missing (`smoothD`, `SMOOTH_TURN` and others), so a lesson
  can no longer clash with them by accident.

## 1.14 (22 Oct 2026): read and look at once, smooth curves

- **Read, look and press in one place.** On laptops and bigger screens one card sits in the picture's top-left
  corner, right beside the drawing: the progress bar, the words, what you touch (answers, slider, sandbox controls),
  then Back and the blue button directly under the last line you read. The drawing fills the space beside the card
  (or below it when that is much bigger), so the card never covers it, and the card is sized for the lesson's longest
  step so nothing jumps. Readouts move to the top right. Phones and short screens stack the same order with Back and
  Next fixed to the bottom. Removed: the separate side panel, the "Your turn" box around a `do` instruction and the
  "You can also tap the circled part" line (the pulsing ring says it). Labels keep a steady on-screen size.
- **Gallery thumbnails** are taken in the stacked layout, so the picture fills them instead of leaving room for the card.
- **Zoomed views stay on the drawing:** the camera never shows an empty band past the drawing's edge.
- **Smooth curves.** Paths were straight segments joined at corners, so routes, tubes, waves and outlines looked
  jagged, most of all when zoomed. Sampled curves are now drawn as smooth curves through their points; real corners
  (sharp turns, long straight edges meeting a curve, triangles and four-sided faces) stay sharp, and repeated points
  where two pieces join no longer make a kink.
- `check.py` looks again before reporting a covered press target, so a
  heavy page that is still drawing no longer gives a false problem.

## 1.13 (21 Oct 2026): clearer pictures for any topic

Round 1 scored pictures lowest (clarity 3.2/5, fit 2.7/5). Measuring the 16 lessons showed why: the weakest pictures
covered only 11-15% of the frame, and steps without a zoom changed about 2% of it, so the subject was small and the
steps looked alike. These changes target that for every topic.

- **Auto zoom.** `autoZoom: true` (now in the template) glides each step in on the parts it lights, measured at the
  start and end of the step, up to 2x, keeping the body of each part in view. `zoom: 'auto'` per step, `focus`
  points, `zoom: null` to stay wide.
- **Picture notes in `check.py`.** It prints how much of the frame the drawing covers, flags steps whose picture
  barely changes, and steps with no lit label.
- **Picture review in the fast path.** Before the facts go in, the builder writes the stranger test for every step
  and scores the picture with the rubric; anything below 4 is fixed then. New composition rules in drawing.md
  (fill the frame, one hero per step, every step looks different, one scale per view, real shapes, motion in stills).
- **Parts for any topic:**
  - living things: `blob` (soft rounded bodies) and `lathe` (round shells from a profile); tokens `cell`, `bcell`,
    `antibody`, `virus`, `bacterium`;
  - people: `person` (simple friendly figures, coloured by role) and `bubble` (speech and thought);
  - words: `card`, a sheet with real text, highlights, bold and crossings-out, for language, writing, logic and law;
  - relationships: `graph`, a real chart with axes, curves, dots, bands and guides, flat to the viewer;
  - mixed scales: `inset`, a magnifier bubble with a close-up drawn with the usual helpers;
  - motion: `hop` (a token passed between stations) and `trail` (motion that shows in a still); `packet` token.
- Labels accept a screen point (for labels inside an inset).
- The "Any topic" table now points each kind of topic at these parts, with new rows for cells and germs,
  relationships between amounts, and language.

- **After round 2** (12 more lessons, blind-reviewed; `evals/results/2026-10-21-round2.md`):
  - auto zoom now frames everything that changes in the step, keeps a card or chart whole (never half-cut),
    leaves room for the readouts, and stops at 1.8x;
  - colours take '#hex' anywhere a material goes; `dash` takes `3` or `'4 3'`; `vessel` takes `glass: true`;
  - `check.py` checks the script's syntax first, names the element where a NaN appears, lists steps the learner
    only watches, flags captions over 50 words and leftover TODO or placeholder text, and only warns about frame
    coverage below 10%; its notes are now `NOTE` lines;
  - `card` and `bubble` sizes are multipliers with bigger defaults; strike-through is visible; chart text bigger;
  - `table` (a real table or desk), `person` sit and hold poses with `personHand`, `litBall` (a body lit from one
    side), inset `view`, `marker` and the safe `FAR` spot, `graph` `size`, `from` and `to`;
  - sandbox sliders follow values the lesson changes;
  - rules: every step but one has a do or drag; show the consequence, not a glow; bubbles 2-6 words; readable
    text; furniture with shape; humanities sources; failed fetches count toward the budget;
  - four new examples built in the test: supply-demand, bill-to-law, sentence, moon-phases (each with its fact
    sheet), and api.md says which example shows each part;
  - evals: a blind reviewer step and prompt, before-and-after comparison in the gallery, 8 new suite topics.
  - gallery: `--after DIR` shows each lesson beside its rebuild; the step count now includes steps that start with `chapter:`.
  - Options has a Questions section with two switches, "Ask me to guess first" and "Quiz at the end" (remembered;
    `?quiz=0` in the address works too). The skill no longer asks about guessing before it builds.
  - The lessons use the Inter typeface (SIL Open Font License, in `assets/fonts/`). The build puts the font inside
    each built lesson (about 64 KB), so it works offline and in the video; unbuilt pages fall back to the system font.
  - Wider side margins on desktop, so the step panel no longer sits against the edge.
  - No fixed number of steps: one idea per step, as many as the knowledge needs (most topics 5-12, long ones up to
    20). New `chapter` on a step groups long lessons into parts ("Part 2 · The Senate") with gaps in the progress
    bar. Hands-on rule scales: at least 3 steps in 4 have a do or drag.
  - Clarity first (new rule 0): one new idea and at most one new word per step, built in order from something
    familiar. New `reveal: true` (in the template): a label appears only once its part has been introduced, so the
    first screen is calm. `check.py` notes steps that introduce more than 2 new parts at once.
  - Overlaps that don't make sense are prevented and caught. Cards, speech bubbles and the legend step aside from
    labels, each other, magnifier bubbles, people (a bubble's own speaker included), the readouts, the parts the step
    is about and the part to press, and take the least-covered spot in a crowded scene. A tap on the step's part
    goes through glass or a card in front of it, and the pulsing ring moves onto the part when `do.at` misses it.
    `check.py` reports words over words, a hidden person, a covered lit part, and a part to press that a tap can't
    reach or that doesn't exist yet. It also says when a lesson fails to start, instead of crashing.
  - `gallery.py` opens each lesson in a viewer inside the gallery page (hosts such as claude.ai refuse to open
    the lesson files on their own); the engine is embedded once.

## 1.12 (21 Oct 2026): any topic, from a 12-subject stress test

A test round built 12 lessons in 12 subjects (biology, chemistry, physics, maths, economics, computing, earth science,
medicine, civics, music, history, literature) from SKILL.md alone, then scored each one. These fixes come from what
they hit. Full results: `evals/results/2026-10-21.md`.

- **Works without sub-agents.** When the session can't start agents, the skill does budgeted research and a "cold"
  fact check itself, and the hand-off says so. (All 12 builders hit this.)
- **Labels and legends stay readable when zoomed.** Labels for parts out of view hide; labels step aside from each
  other, the legend, the readouts and the zoom buttons; `legend(keys, 'auto')` finds a free corner.
- **Front and top-down views.** `view: 'front'` for cross-sections and side cutaways, `view: 'plan'` for maps,
  diagrams and proofs, so a square stays square.
- **Any-topic guidance.** A pattern table in `references/drawing.md` for institutions, feelings, debated history,
  mixed scales, proofs, networks and more. Debated topics can show side-by-side `views`.
- **New ready-made parts:** `fade`, `curve`, `ring`, `ripples`, `prism`, `vessel`, `meter`, custom token drawings
  and `ion+`/`ion-` tokens.
- **Sound.** `playNote(freq, secs)` and a Sound switch in Options for topics like music.
- **Sturdier engine.** Shading arguments that aren't functions no longer blank the picture; every argument is now
  documented in `references/api.md`. Auto-framing ignores clipped and invisible drawing.
- **Quicker checks.** `check.py --step N` checks one step in about 3 seconds; the full check now tests legends.
- **Continuous improvement loop.** `evals/` holds the test suite, a scoring rubric, the builder prompt and each
  round's results; `scripts/gallery.py` turns a round into a browsable gallery; `IMPROVEMENTS.md` is the ranked
  backlog for the next round.

## 1.11 (21 Oct 2026): smooth video

- The video download is now drawn frame by frame: every frame is an exact 1/30 s step of the lesson, stamped with
  its own time and encoded with WebCodecs. It plays smoothly at 30 frames a second however slow the computer is.
  (1.10 recorded live, so slow frames showed up as stutter.)
- It is written as a standard MP4: H.264 in Chrome, Edge and Safari (plays everywhere, including QuickTime and
  phones), or VP9 where the browser has no H.264 encoder. A small built-in MP4 writer (`mp4Mux`) does this, with
  no outside libraries. Browsers without WebCodecs still get the live recording as before.
- Making the video takes a little longer than the lesson plays; a progress bar shows how far it has got.

## 1.10 (21 Oct 2026): faster to build, a video of every lesson, a steam engine

- **Download video.** Options has a new "Download video" button. It plays the whole lesson once into a 1280x720
  video: each step's animation, its title and text, and the big idea at the end. It saves an MP4 in Chrome, Edge
  and Safari, and a WebM in Firefox (which can't record MP4). It takes about as long as the lesson plays.
- **The fast path.** Building a lesson now takes far fewer tokens and turns, with the same output:
  - SKILL.md is a short workflow (8 KB, was 31 KB). Details moved to `references/` files that are read only at the
    step that needs them. `references/page.md` (how the page works) isn't needed to build a lesson at all.
  - `references/api.md` lists every engine function, so `teach.js` (71 KB) is never read.
  - `scripts/new.py` starts a lesson folder from `templates/`.
  - `scripts/check.py` does every check in one run, in about 20 seconds: each step, a full click-through, six
    screen sizes, page errors, labels overlapping or cut off. It saves one contact sheet image of every step, so
    one image replaces a dozen screenshots.
  - Research and the fact check run as background agents on a faster model with a fixed budget, with ready
    prompts in `references/research.md`. The object is drawn while the research runs.
- **Ready-made parts** in the engine, one line each: `pipe`, `wheel`, `gauge`, `puffs`, `fire`, `glow`, and moving
  tokens with `flow`, `legend` and `TOKENS`.
- **Fixes:** the main button stays in view on short screens and phones turned sideways (found by `check.py`).
- **New example: the steam engine** (adult level). It has a boiler with a window, a throttle, a cut-open cylinder
  with a moving slide valve and fresh and used steam, a crosshead, crank, eccentric, flywheel and a spinning
  governor. The learner lights the fire, opens the throttle, turns the engine through one stroke by hand and adds
  load. The sandbox has load, throttle and governor on or off. Its fact sheet has 37 facts from 20 sources; the
  independent check found nothing wrong and softened six lines.

## 1.9 (21 Oct 2026): drawn like an illustration, designed by subtraction

- **The drawing.** The Clear style now shades smoothly from light to dark, so round things look round, with a soft
  sheen where the light hits. Shadows are soft and blurred. The outline stays dark while inner lines are a warm
  grey, as an illustrator would draw them. Sketch and High contrast keep their flat bands.
- **Objects stand on the white page,** like a product photo, with a soft `ground` shadow instead of a wooden board.
  Boards stay only where they mean something (the money lesson's year line).
- **Automatic framing.** Leave out `bounds` and the engine measures everything the lesson will draw (every step and
  the sandbox) and frames it, so the picture fills its space and never jumps.
- **The page, by subtraction.** No frame round the picture and no card round the panel. The lesson's question is a
  large title. The intro is an opening paragraph with no "Before you start" heading. Live numbers are plain
  readouts, hidden until the lesson starts. Replay, Pause and zoom are one quiet row of round icon buttons.
- **Quieter labels.** White pills with a grey hairline; a lit label is yellow, and the others fade while a step
  lights some. Labels always stay inside the visible picture, so none are cut off on phones.
- **Photosynthesis redrawn:** folded two-tone leaves with pale veins, a tapering stem, a glass pot with a thick rim
  and highlights, crumbly soil with grit, tapering roots with side roots, and a glowing sun. The scene is tighter, so
  the plant is bigger on phones.
- The kettle stands on the page; the money lesson's numbers have a white halo so towers don't cut through them.

## 1.8 (21 Oct 2026): a living picture

- The picture keeps moving. The engine now owns a clock (`st.t`) that runs in every phase, so bubbles, steam,
  particle flows and dropping coins keep going after a step ends instead of freezing. Lessons add `t: 0` to their
  state; an optional `live(st, dt, ui)` adds other looping motion. The sandbox runs on the same clock.
- New play controls at the bottom left of the picture: Pause / Play (and the P key) stops everything that moves,
  including a step's animation and the sandbox; Replay plays the current step again. Icons only on phones. With
  reduced motion the picture starts paused, except the sandbox.
- More to do, less to watch: at most one plain step per lesson. The kettle's "The disc snaps" is now a drag (send
  the steam down to the disc); in photosynthesis you tap the stomata to let air into the leaf; the money lesson has
  coins dropping onto the newest tower and a "Show the pattern" step.
- Only a label's pill catches taps, not its leader line, so parts under a label's dot can be pressed.
- A label you tabbed to keeps keyboard focus while the picture redraws.

## 1.7 (21 Oct 2026): phones done right, white page, a third example

- Phones: labels are sized from the picture's real width (about 12 px on any screen); the picture runs edge to edge;
  the button bar is fixed to the bottom of the screen; the "Your turn" box holds the instruction, so the hint no
  longer repeats it; a smaller title.
- The hint now sits in the action row on one line.
- The page background is pure white in every style (the Sketch style changes the drawing only).
- New example: photosynthesis, with its fact sheet (`photosynthesis.facts.md`), a see-through pot, moving tokens
  for water, carbon dioxide, oxygen and sugar with a legend, guesses on where the oxygen and the plant's mass come
  from, and a light and carbon dioxide sandbox.
- New rule: moving tokens get a legend, not floating labels.
- The photosynthesis lesson went through the independent fact check: nothing wrong; four lines softened and five
  sources added to its fact sheet.

## 1.6 (21 Oct 2026): bigger picture, every screen size

- The picture is now the larger zone: about two-thirds of the width, with the panel capped at 300–460 px.
- Responsive at every size: the picture re-frames itself to the space it gets and when the screen changes shape,
  and is never taller than the screen. Wide monitors use up to 1800 px; tablets and phones stack (picture first,
  button bar pinned to the bottom, safe-area aware); phones on their side go back to side by side.
- Fluid text sizes; bigger labels and zoom buttons on small screens; the Options menu becomes a full-width sheet on
  phones.
- Checked at 360, 390, 768, 844 (landscape), 1024, 1280, 1440, 1920 and 2560 px wide.

## 1.5 (21 Oct 2026): a clear reading order

- New lesson-player layout. The picture on the left, a lesson panel on the right that stays in view. On phones the
  picture comes first and the button bar is pinned to the bottom of the screen.
- The panel answers four questions in order: where am I (step count and bar), what's happening (big step title, then
  the text), what do I do (a light-blue "Your turn" box), how do I go on (hint, Back, one blue button, always in the
  same place).
- One type scale: small grey context, a bold 22 px step title, 17 px reading text.
- Live numbers moved into small chips at the top left of the picture; zoom stays bottom right.
- Clearer hints: "Press the button below, or tap the circled part in the picture.", "Drag the slider to the end to
  continue.", "Pick an answer to see what happens."
- The drawing fills more of its frame.

## 1.4 (21 Oct 2026): designed by subtraction

- Everything on the page was listed and cut back to the essentials. The picture is bigger and is the hero; there is
  one thing to press at a time.
- Cut: the subtitle, the "Step 2 of 5" line and repeated step name (now a thin bar with "2/5"), the row of part chips
  (the labels in the picture are now the buttons, keyboard-focusable too).
- Merged: Start again, Full screen and Settings into one quiet **Options** menu; the two "leaves out" and "sources"
  links into one "Sources and what's simplified".
- Shorter, literal labels: "Start", "Take the quiz", "Skip", "Pick one", "Drag the slider to the end".
- Quieter details: pill-shaped primary button, grey Back link, smaller zoom buttons in the corner, lighter numbers,
  no dividers.
- Fact-check fix: the kettle sandbox no longer says steam "never" reaches the disc with the lid open; it now says
  not enough does, and the boil-dry cut-out is listed as not shown.

## 1.3 (21 Oct 2026): hands-on, realistic, minimal

- **Learners act, not just watch.** New `do` steps (press the real part to start a step, with a pulsing ring on it),
  `drag` steps (a slider drives the animation: heat the water, fast-forward the years), `parts` (tap a label or chip
  to learn what it is) and a `tryit` sandbox with toggles, sliders and buttons on the same picture and a live line
  saying what is happening.
- **Zoom controls.** + and − buttons, "Show whole picture", drag to look around, + − 0 keys. Steps can still zoom in
  on a small part; the learner can always zoom out.
- **Realistic colours.** New `MAT` materials (plastic, steel, glass, copper, brass, gold, silver, wood and more).
  Bright colours are kept for teaching signals. See-through parts stay see-through.
- **Controls stay part of the object.** The kettle's switch is now a rocker built into the handle base that tilts in
  place, highlighted with a yellow outline. Parts are never moved out of place to show a change.
- **Minimal page.** The lesson text sits under the picture with no box; Back is a text link; smaller headings,
  chips and zoom buttons; quiet tools row.
- **Fix: accidental guesses.** Answers ignore clicks for a moment after they appear, and slide in, so a double-click
  on "Next step" can't pick one. Your guess now shows in its own box under the step text.
- Examples updated: the kettle has a lid you can open in the sandbox (it keeps boiling, as manuals warn); the money
  lesson has silver and gold coins and rate and amount sliders.

## 1.2 (21 Oct 2026): clear layout, guessing, plain language

- One obvious next action: a single blue button named for what it does; when the learner must choose, the button
  disappears and a hint says what to do.
- Progress bar with the step name at the top; Start again, Full screen and Settings as quiet links.
- "Predict" renamed "guess". Guessing can be turned on or off: the skill asks when it builds a lesson, and learners
  can switch it in Settings.
- Writing rules from plain-language editing built into the skill; all example text rewritten; labels in sentence case.
- Phones: taller picture, bigger labels, full-width button.

## 1.1 (21 Oct 2026): clarity over charm

- Three drawing styles: Clear (default), Sketch (hand-drawn) and High contrast.
- Steps can zoom in on small parts.
- Drawing quality rules: the working part is the hero, one visual language, less clutter, the stranger test.
- Fact-check fixes from an independent review of both examples.

## 1.0 (21 Oct 2026): first version

- Lesson engine forked from Colorfigures (rotation code removed, wobble slider and colour swatches replaced by a
  lesson layer): captions per step, guesses, a quiz, what this lesson leaves out, sources, keyboard and screen-reader
  support, full screen, printable worksheet.
- Fact-check layer: research first, a fact sheet with sources, every claim traced, an independent check.
- Examples: an electric kettle and compound interest.

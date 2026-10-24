---
name: "teachme"
description: Turn any topic into a fact-checked, hands-on visual lesson in one HTML file, at its best for machines and objects (how a kettle, lock, engine or vending machine works), living things (the heart, a neuron, a cell, DNA, a plant, how a medicine acts) and ideas shown as real scenes or invented machines. The learner presses real parts, drags to make things happen, guesses first, zooms into detailed isometric drawings, plays in a sandbox and takes a quiz. Use for /teachme, "teach me X", "how does X work", "explain X visually", "show me inside X", an interactive diagram or explainer, or a lesson for a class.
---

# /teachme (v2)

One sentence in, one lesson out. The result is a single HTML page with a clear, detailed, realistic-looking
isometric picture that the learner works through one step at a time. They **do** things, not just read:

- press the real part to start a step ("Press the switch"),
- drag a slider to make a process happen (heat the water, fire the nerve, fast-forward the years),
- guess what happens before the surprising step,
- tap any part to learn what it is, and zoom in to see how it is built,
- play with a "Try it yourself" sandbox,
- then take a short quiz.

Each step has a short caption that says what happens and why. The page lists what the lesson leaves out, its scale
and the sources behind every fact. It works with a keyboard and screen readers, on phones and in full screen, saves
as a video, and prints as a worksheet, a poster with numbered parts, a labelled diagram or a multi-page handout. In Options, the learner switches the drawing style (Clear, Sketch or High
contrast) and turns the guesses and the quiz on or off.

Six rules come before everything else:

0. **Understood, never confusing, never overwhelming.** The goal is that the learner truly gets it. One new idea
   per step, at most one new word per step (said in plain words the first time), each step built only on what
   came before, starting from something they already know. Use as many steps as that takes; never compress.
1. **Accuracy first.** A lesson that teaches something false is worse than no lesson. Research first, write a fact
   sheet, make every claim and every number trace back to it, and have it checked by someone who didn't write it.
2. **The picture exists to teach.** For each step, ask: could a stranger tell what is happening from the picture
   alone? Charm is a bonus, never the goal.
3. **Real things look real.** A machine is built from its real parts; a living thing shows its real structure. At
   1x it reads as one clear thing; zoomed in, every region has something true to find. Detail is never decoration,
   and only 1-3 parts are lit per step.
4. **Hands-on, not slides.** The learner causes what happens. A lesson where they only press "Next" has failed.
5. **Plain and minimal words.** Plain words (design.md 2b) and a calm page. The engine's layout already does this;
   don't add to it.

## Pick the subject (it decides what to read)

| The topic is... | `kind` | Read |
|---|---|---|
| A machine, device, object, tool, instrument, building system | `'machine'` | machines.md |
| A body, organ, cell, germ, nerve, plant, animal, DNA, molecule, medicine | `'living'` | living.md |
| An abstract or technical mechanism (a cache, a market rule, a law of physics) | `'idea'` (or `'machine'` if you invent a machine for it) | machines.md section 4, drawing.md "Any topic" |
| People, institutions, language, history, numbers | `'idea'` | drawing.md "Any topic" |

Files in this skill (read them only at the step that needs them):
- `references/api.md`: every engine function and `mountLesson` option, including the v2 parts. **Use it instead of
  reading `teach.js`.**
- `references/design.md`: designing the steps, hands-on step types, plain-language writing rules.
- `references/drawing.md`: picking and drawing the picture, the quality bar, the detail pass, drawing rules.
- `references/machines.md`: the real process, building it like the real thing, physical rules, inventing a machine
  for an idea, exploded views, pipes and cables, the close-up check.
- `references/living.md`: real structure, literal or labelled metaphor, scale, numbers, living shapes, nerves,
  cells, molecules, plants, health and drugs.
- `references/research.md`: research rules, the fact sheet format, and ready prompts for the research and
  fact-check agents.
- `references/page.md`: how the built-in page works and the manual checks. Not needed to build a lesson.
- `templates/lesson.html`, `templates/facts.md`: skeletons; `scripts/new.py` copies them into a lesson folder.
- `scripts/check.py`: one-shot check (build, every step, click-through, screen sizes, subject notes, audits of
  labels, loose lines, numbers against facts.md and scale, one contact sheet image); `--step N --crop x,y,w,h` takes
  a sharp close-up.
- `scripts/print.py`: the lesson as PDF sheets for a class (worksheet, poster, labelled diagram, handout).
- `scripts/update.py`: moves an old built or published lesson onto the current engine without touching the lesson.
  When the person asks to update an existing lesson or artifact: get its HTML (read the artifact, or the file), run
  `update.py old.html new.html --check`, look at the sheet, then republish to the same link (with
  `capabilities: {downloads: true}`) or hand back the file. A published page's HTML may come wrapped in the viewer's
  own skeleton (a short `<!doctype html>...<body>` before the lesson's own `<!doctype html>`): publish from the
  lesson's own doctype onward.
- `scripts/build.py`: puts the engine inside the lesson so it becomes one self-contained file.
- `assets/teach.js`: the engine. `assets/examples/`: finished lessons, most with their fact sheets. Machines:
  kettle, steam-engine (many moving parts). Living things: nerve-signal (`tree`/`branch` neuron, `tube` axon,
  `membrane` and `channel` in insets, sodium and potassium tokens), photosynthesis. Every v2 part in one picture:
  parts-gallery. Ideas: compound-interest (amounts to scale), supply-demand (a `graph` beside a market of `person`
  figures). People and institutions: bill-to-law. Language: sentence. Space and second viewpoints: moon-phases
  (`'plan'` view, `inset`). Don't read them whole; `grep` for the part you need (for example
  `grep -n "membrane(" -B2 -A8 nerve-signal.html`).

## The fast path

Speed comes from doing work once, in parallel, and letting scripts check. The output standard doesn't change.

1. **Ask** (one round, below). Then, in the same turn:
2. **Start the research agent in the background** with the prompt in `references/research.md` (a faster model,
   a fixed budget). Don't research in the main thread. **No sub-agent tool** (claude.ai, or you are a sub-agent
   yourself)? Then the order is: scaffold (3), draw (5), run check.py once, then research yourself within the
   budget in `research.md` ("Without a sub-agent tool"), then write the text (7) and do the cold fact check.
3. **Scaffold:** `python3 <skill>/scripts/new.py <folder> "<question>" --level <level>`. Set `kind` in the lesson.
4. **Read** `references/api.md`, `references/drawing.md`, `references/design.md` and the subject guide (machines.md
   or living.md) once. Pick the picture pattern and the view (`iso`, `front` or `plan`). Skip anything you already
   know from this conversation.
5. **Draw the subject while the research runs.** Its parts and layout are common knowledge. First write, in the
   lesson's top comment, the real process (where every material, signal or amount is after each stage) and the
   parts list grouped by job; then one small model that every readout and moving part reads from. Use the
   ready-made parts in `api.md` before writing your own: machines (latheAx, gear, belt, valve, rail, pipeline,
   wheel, gauge, vessel, coil, knob, flap, chain, screws, ticks, slots, cable, flow, legend), forces (incline,
   force), effects (flame, steam, waterSurface, stream, beam, pool, sparks), living things (heart, brain, lungs,
   kidney, alveoli, arm, enzyme, blob, lathe, tube, tree and branch, membrane, channel, helix with a base sequence, molecule,
   ribbon, skeletal, cell, red blood cell and germ tokens, pulse), people (person, bubble), words
   (card), relationships (graph) and mixed scales (inset). A 3D shape that is itself the idea (a molecule) can turn
   (`turn: true`, drawing.md 3d). Plan the composition first (drawing.md 3a2): a big subject filling the frame, parts close
   together, every step visibly different. Write the whole lesson in one pass (scene, steps with placeholder text,
   sandbox) with one `Write`. Before using a part for the first time, `grep` an example that uses it (api.md says
   which) instead of guessing sizes.
6. **Run** `python3 <skill>/scripts/check.py <folder>/lesson.html` and open only the contact sheet it prints
   (`lesson.sheet.png`, every step in one image). Fix every PROBLEM and NOTE line with small `Edit`s, then run it
   again. Aim for 3-4 full runs; `--step N` saves a full-size look at one step in about 3 seconds. A full run takes
   about 30-90 seconds on a quiet machine and several minutes when other jobs share it: wait for it rather than
   starting a second run, and keep the busiest frame under about 1,500 elements (check.py reports slow frames).
   **Picture review** (on that contact sheet, before going on): for each step, cover the caption in your mind and
   write one line: what would a stranger say is happening? Then: is anything on screen or in the text that hasn't
   been explained yet, or more than one new thing at once? If so, split the step or hold that part back. And: does
   anything cover something the learner needs? Overlaps that make sense are fine; any other is fixed. Then score
   the picture 1-5 with `evals/rubric.md` (clarity, polish and detail). Anything below 4 gets fixed now with the
   composition rules (drawing.md 3a2) and the detail pass (drawing.md 3c).
   **Close-up** (machines and living things, once per round): `check.py lesson.html --step N --crop x,y,w,h` on the
   busiest region; fix what machines.md section 8 lists (wrong overlaps, floating parts, lines that stop mid-air,
   plain faces). The audit NOTEs (a label pointing at nothing, a lit label out of view, loose line ends, numbers
   facts.md doesn't contain) are fixed the same way.
7. **When the facts arrive,** write the captions, parts, quiz, sandbox lines, simplified, scale, notice and sources
   from `facts.md` in one edit. Then start the **fact-check agent** in the background (prompt in `research.md`) and
   run `check.py` again while it works. No sub-agent tool? Do the cold fact check in `research.md` instead. Apply its
   WEAK and WRONG fixes, and map the lesson lines at the end of `facts.md`.
8. **Build and hand over** (below).

Token savers: never read `teach.js` or a whole example; never paste long code into chat; don't re-read a file you
just wrote; look at one contact sheet and one close-up instead of many screenshots; keep tool output short (`| tail`,
`grep`).

## 0. Ask first (one short round)

Use AskUserQuestion when you have it; otherwise ask in one plain message. Ask only what isn't already clear:

- **Who is learning?** Kid (about 8–11), Student (about 12–17) or Adult. This sets the words, the caption length,
  how much detail the picture carries and how much the lesson includes. Always ask this unless the request says it.
- The topic, if it's vague ("teach me physics": which idea?). Offer 2–3 concrete choices.
- **Too big for one lesson?** A whole organ system, a whole car, a whole power plant: offer a course of 2-4 linked
  lessons, each on one mechanism, and build the first one the person picks.
- Only if it helps: what the learner already knows or finds confusing, and the language for the text.

Don't ask about guessing or the quiz: every lesson has both, and the learner switches either off in Options. If
nobody is there to answer, use Student and English, and say so when you hand over.

If the person wants a playable object more than a lesson ("make me an interactive vending machine"), build a short
lesson anyway: 3-5 steps that walk the real process, a rich sandbox with 2-5 controls, every part tappable.

## Lesson essentials (details in the references)

- One big idea in one sentence. As many steps as the knowledge needs, one idea per step, in order (most topics
  5-12, long ones up to 20, grouped with `chapter` from about 8): split a crowded step rather than compress it.
  `title` 1-4 words; `say` at most about 50 words. At least 3 steps in 4 have a `do` or a `drag` (the first is
  usually a `do`; a guess alone doesn't count), guesses on the most surprising steps (about 1 in 3-4), a `tryit`
  sandbox with 1-3 controls, 2-3 quiz questions (up to 5 for a long lesson), 2-5 `simplified` lines.
- Every caption, part, guess, quiz answer, sandbox line and number on screen traces to a numbered fact. Plain words,
  short sentences, one word for one thing, sentence case, no filler.
- The picture: a big subject that fills the frame, built from its real parts, realistic colours, see-through or cut
  open where it matters, controls built into the object, `autoZoom: true` so each step frames its lit parts, every
  step visibly different from the last, 3-6 labels pointing into empty space, moving tokens with a legend, and the
  stranger test on every step.
- Living things: `scale` set, literal structure by default, any comparison named as one. Health, medicine and drug
  topics: `notice: 'Educational, not medical advice.'` and no dosing or treatment advice (living.md).
- Every step ends in the same state whether it animates, is dragged or runs instantly. Looping motion uses `st.t`.

## Build and hand over

`python3 "<skill folder>/scripts/build.py" lesson.html OUT.html` (or the `.built.html` that `check.py` writes) puts
the engine inside the page, so `OUT.html` works on its own: open it from disk, email it, host it or embed it in an
iframe. If you can publish an HTML page (an Artifact tool, for example), publish it so the person gets a link
(with the Artifact tool, declare `capabilities: {downloads: true}` so "Download video" and saving a printable sheet
work inside the viewer, which blocks plain downloads and print dialogs);
otherwise hand over the file. In the hand-off, say briefly: who it's for, what the learner gets to do, the big idea,
how many sources you checked and what the fact check changed. Every lesson can also be saved as a video and printed
(Options): a worksheet, a one-page poster with numbered parts, a labelled diagram and a handout with every step
(inside a preview panel the print dialog is blocked, so the lesson offers to open the sheet in a new tab or save it;
printing is smoothest with the file opened in a browser). For
a teacher, also run `python3 "<skill folder>/scripts/print.py" lesson.html --format poster --png`, look at the page,
and hand over the PDFs they asked for.

## Don'ts
- Never state a fact you haven't sourced, and never invent a source, quote, number or citation.
- Never mark an answer right that the sources don't support, or let the sandbox show something they don't support.
- Never invent anatomy, parts or detail to fill space; every detail is a real part with a job.
- Never present a comparison (lock and key, gated valve) as the literal biology.
- Never give medical, dosing or treatment advice; for drugs of abuse, show the mechanism only.
- Never put real company logos, product names or trademarked shapes on the object; use generic forms.
- No external scripts or fonts; the file must run from disk with no outside requests.
- Don't add a turning view, a light control, colour pickers or a wobble slider. The play controls, the zoom buttons
  and the Options menu (style, guesses and quiz) are the only view controls.
- Don't move a part out of its place to highlight it (a real movement or an exploded view is fine).
- Don't let the picture freeze between steps when the real thing keeps moving.
- Don't build something the learner only watches. Every lesson has `do` or `drag` steps (at least 3 in 4), part
  explanations, a sandbox when anything can vary, a quiz, and guesses unless the person asked for none
  (`new.py --guess off`).

---
name: "teachme"
description: Turn any topic into a fact-checked, hands-on visual lesson in one HTML file. The learner presses parts, drags to make things happen, guesses first, tries it in a sandbox and takes a quiz. Use for /teachme, "teach me X", "how does X work", "explain X visually", or a lesson or interactive diagram for a class.
---

# /teachme

One sentence in, one lesson out. The result is a single HTML page with a clear, realistic-looking isometric picture
that the learner works through one step at a time. They **do** things, not just read:

- press the real part to start a step ("Press the switch"),
- drag a slider to make a process happen (heat the water, fast-forward the years),
- guess what happens before the surprising step,
- tap any part to learn what it is,
- play with a "Try it yourself" sandbox,
- then take a short quiz.

Each step has a short caption that says what happens and why. The page lists what the lesson leaves out and the
sources behind every fact. It works with a keyboard and screen readers, on phones and in full screen, prints as a
worksheet, and lets the learner zoom in and out. In Options, they can switch the drawing style (Clear, Sketch or
High contrast) and turn the guesses and the end-of-lesson quiz on or off.

Five rules come before everything else:

0. **Understood, never confusing, never overwhelming.** The goal is that the learner truly gets it. One new idea
   per step, at most one new word per step (said in plain words the first time), each step built only on what
   came before, starting from something they already know. Use as many steps as that takes; never compress.
1. **Accuracy first.** A lesson that teaches something false is worse than no lesson. Research first, write a fact
   sheet, make every claim trace back to it, and have it checked by someone who didn't write it.
2. **The picture exists to teach.** For each step, ask: could a stranger tell what is happening from the picture
   alone? Charm is a bonus, never the goal.
3. **Hands-on, not slides.** The learner causes what happens. A lesson where they only press "Next" has failed.
4. **Plain and minimal.** Plain words (section 2b) and a calm page. The engine's layout already does this; don't add
   to it.

Files in this skill (read them only at the step that needs them):
- `references/api.md`: every engine function and `mountLesson` option. **Use it instead of reading `teach.js`.**
- `references/design.md`: designing the steps, hands-on step types, plain-language writing rules.
- `references/drawing.md`: picking and drawing the picture, the quality bar, drawing rules.
- `references/research.md`: research rules, the fact sheet format, and ready prompts for the research and
  fact-check agents.
- `references/page.md`: how the built-in page works and the manual checks. Not needed to build a lesson.
- `templates/lesson.html`, `templates/facts.md`: skeletons; `scripts/new.py` copies them into a lesson folder.
- `scripts/check.py`: one-shot check (build, every step, click-through, screen sizes, one contact sheet image).
- `scripts/build.py`: puts the engine inside the lesson so it becomes one self-contained file.
- `assets/teach.js`: the engine. `assets/examples/`: finished lessons, each with its fact sheet except the first
  two. Machines: kettle, steam-engine (many moving parts). Ideas: compound-interest (amounts to scale),
  supply-demand (a `graph` beside a market of `person` figures). Living things: photosynthesis. People and
  institutions: bill-to-law (`person`, `card` that `hop`s, vote `meter`s). Language: sentence (word `card`s,
  `person`, `bubble`). Space and second viewpoints: moon-phases (`'plan'` view, `inset`, lit halves). Don't read
  them whole; `grep` for the part you need (for example `grep -n "inset(" -B2 -A8 moon-phases.html`).

## The fast path

Speed comes from doing work once, in parallel, and letting scripts check. The output standard doesn't change.

1. **Ask** (one round, below). Then, in the same turn:
2. **Start the research agent in the background** with the prompt in `references/research.md` (a faster model,
   a fixed budget). Don't research in the main thread. No sub-agent tool? Research yourself within the budget in
   `research.md` ("Without a sub-agent tool"), after step 5's first draft of the picture.
3. **Scaffold:** `python3 <skill>/scripts/new.py <folder> "<question>" --level <level>`.
4. **Read** `references/api.md`, `references/drawing.md` and `references/design.md` once. Pick the picture pattern
   for the topic from the table in `drawing.md` ("Any topic") and the view (`iso`, `front` or `plan`). Skip anything you
   already know from this conversation.
5. **Draw the object while the research runs.** Its parts and layout are common knowledge. Use the ready-made
   parts in `api.md` before writing your own: machines (pipe, wheel, gauge, vessel, puffs, fire, flow, legend),
   living things (blob, lathe, cell and germ tokens), people (person, bubble), words (card), relationships (graph)
   and mixed scales (inset). Plan the composition first (drawing.md 3a2): a big subject filling the frame, parts
   close together, every step visibly different. Write the whole lesson in one pass (scene, steps with placeholder
   text, sandbox) with one `Write`. Before using a part for the first time, `grep` an example that uses it
   (api.md says which) instead of guessing sizes.
6. **Run** `python3 <skill>/scripts/check.py <folder>/lesson.html` and open only the contact sheet it prints
   (`lesson.sheet.png`, every step in one image). Fix every PROBLEM and NOTE line with small `Edit`s, then run it
   again. Aim for 3-4 full runs; `--step N` saves a full-size look at one step in about 3 seconds (no full check),
   for checking a single fix.
   **Picture review** (on that contact sheet, before going on): for each step, cover the caption in your mind and
   write one line: what would a stranger say is happening? Then: is anything on screen or in the text that hasn't
   been explained yet, or more than one new thing at once? If so, split the step or hold that part back. And: does
   anything cover something the learner needs (words over words, a hidden person, the part to press)? Overlaps
   that make sense (a label on the card it names) are fine; any other is fixed. Then score the picture 1-5 with
   `evals/rubric.md` (clarity and polish). Anything below 4 gets fixed now with the composition rules in drawing.md
   3a2 (fill the frame, a bigger or brighter change, an `inset` for small things, real shapes such as `blob`,
   `person`, `table`, `card` and `graph` instead of boxes, show the consequence).
7. **When the facts arrive,** write the captions, parts, quiz, sandbox lines, simplified and sources from
   `facts.md` in one edit. Then start the **fact-check agent** in the background (prompt in `research.md`) and run
   `check.py` again while it works. No sub-agent tool? Do the cold fact check in `research.md` instead. Apply its
   WEAK and WRONG fixes, and map the lesson lines at the end of `facts.md`.
8. **Build and hand over** (below).

Token savers: never read `teach.js` or a whole example; never paste long code into chat; don't re-read a file you
just wrote; look at one contact sheet instead of many screenshots; keep tool output short (`| tail`, `grep`).

## 0. Ask first (one short round)
Use AskUserQuestion when you have it; otherwise ask in one plain message. Ask only what isn't already clear:

- **Who is learning?** Kid (about 8–11), Student (about 12–17) or Adult. This sets the words, the caption length and
  how much detail to include. Always ask this unless the request says it.
- The topic, if it's vague ("teach me physics": which idea?). Offer 2–3 concrete choices.
- Only if it helps: what the learner already knows or finds confusing, and the language for the text.

Don't ask about guessing or the quiz: every lesson has both, and the learner switches either off in Options
(Questions). If nobody is there to answer, use Student and English, and say so when you hand over.

## Lesson essentials (details in the references)

- One big idea in one sentence. As many steps as the knowledge needs, one idea per step, in order (most topics
  5-12, long ones up to 20, grouped with `chapter` from about 8): split a crowded step rather than compress it.
  `title` 1-4 words; `say` at most about 50 words. At least 3 steps in 4 have a `do` or a `drag` (the first is
  usually a `do`; a guess alone doesn't count), guesses on the most surprising steps (about 1 in 3-4), a `tryit`
  sandbox with 1-3 controls, 2-3 quiz questions (up to 5 for a long lesson), 2-5 `simplified` lines.
- Every caption, part, guess, quiz answer and sandbox line traces to a numbered fact. Plain words, short sentences,
  one word for one thing, sentence case, no filler.
- The picture: a big subject that fills the frame, realistic colours, see-through where it matters, controls built
  into the object, `autoZoom: true` so each step frames its lit parts, every step visibly different from the last,
  3-6 labels pointing into empty space, moving tokens with a legend, and the stranger test on every step.
- Every step ends in the same state whether it animates, is dragged or runs instantly. Looping motion uses `st.t`.

## Build and hand over

`python3 "<skill folder>/scripts/build.py" lesson.html OUT.html` (or the `.built.html` that `check.py` writes) puts
the engine inside the page, so `OUT.html` works on its own: open it from disk, email it, host it or embed it in an
iframe. If you can publish an HTML page (an Artifact tool, for example), publish it so the person gets a link;
otherwise hand over the file. In the hand-off, say briefly: who it's for, what the learner gets to do, the big idea,
how many sources you checked and what the fact check changed. Every lesson can also be saved as a video (Options,
Download video).

## Don'ts
- Never state a fact you haven't sourced, and never invent a source, quote, number or citation.
- Never mark an answer right that the sources don't support.
- Never let the sandbox show something the sources don't support.
- Never put real company logos, product names or trademarked shapes on the object; use generic forms.
- No external scripts or fonts; the file must run from disk with no outside requests.
- Don't add a turning view, a light control, colour pickers or a wobble slider. The play controls, the zoom buttons
  and the Options menu (style, guesses and quiz) are the only view controls.
- Don't move a part out of its place to show a change or to highlight it.
- Don't let the picture freeze between steps when the real thing keeps moving.
- Don't build something the learner only watches. Every lesson has `do` or `drag` steps (at least 3 in 4; Lesson essentials), part
  explanations, a sandbox when anything can vary, a quiz, and guesses unless the person asked for none
  (`new.py --guess off`).

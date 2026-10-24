# Lesson design and writing

Read before writing the steps. Contents: design the lesson, make it hands-on, writing rules.

## 2. Design the lesson (before drawing)

- **Never confusing, never overwhelming.** This comes before everything else in the design:
  - **One new idea per step.** If a caption needs "and also", it is two steps.
  - **At most one new word per step**, said in plain words where it first appears ("the atrium, the top chamber,
    ..."), then always called the same thing. No word is used before it is explained.
  - **Build in order.** Each step uses only what earlier steps showed. Start from something the learner already
    knows (a pump, a queue, a kettle) before the new mechanism.
  - **Show only what has been introduced.** `reveal: true` (in the template) keeps a part's label hidden until the
    step that lights it; the first screen shows the whole thing calmly, without a wall of labels. A step lights
    1-2 new parts at most; `check.py` notes steps that introduce more.
  - **Name the takeaway.** Each caption's last sentence says what to remember from the step, in plain words.
  - Long topics stay calm with `chapter`s and short steps, not with dense ones.
- **One big idea** in one sentence that says what makes it work. Everything else supports it.
- **As many steps as the knowledge needs, one idea per step**, each a real stage, in order. Split a step that
  carries two ideas rather than squeezing it into 50 words; never cut a stage to keep the count down, and never pad.
  Most topics land between 5 and 12 steps; a long or layered topic can run to 20. From about 8 steps, group them
  with `chapter` (a step that opens a section: "Part 2 · The Senate"), so the learner sees the shape of the lesson.
  Kids get shorter steps, not fewer ideas.
  - `title`: 1–4 words, sentence case, saying what happens ("Heat the water", "The disc snaps").
  - `say`: 1–3 sentences, at most about 50 words (about 70 for adults or a proof step that needs a chain of reasons), saying what happens and why. Name a technical term once and say
    what it means.
- **`parts`**: one or two plain sentences for every labelled part (and for anything the colours stand for, such as
  "Gold coins"). These are facts too, so they need sources.
- **`lit`**: for each step, the 1–2 labels of the parts doing the work right now. Keep 3–6 labels visible at once;
  with `reveal: true` a longer lesson can name more in total (a heart or a cell may need 10–14), because each label
  appears only when its step lights it.
- **Guesses** (`guess`) on the most surprising steps, about one in three or four: a question, 3 answers, one right. Use real mistaken beliefs
  from `facts.md` as the wrong answers. `why` explains the right answer in one or two sentences and shows after the
  learner answers, right or wrong, so it must make sense on its own.
- **2–3 quiz questions** (`check`) at the end: one about how it works, one that applies it to a new situation and
  one "what if". Each right answer must be backed by the fact sheet, and each wrong answer must really be wrong.
- **`simplified`**: 2–6 honest lines on what the lesson leaves out or draws differently from real life, including
  any sped-up time or rescaling in the sandbox.
- **`sources`**: the pages from `facts.md` the lesson uses, each with a short note of what it supports.
- At the end of `facts.md`, match every caption, part, guess, quiz line, sandbox message and simplified line to its
  fact numbers. Cut or soften ("on most kettles", "may") any line with no fact behind it before you draw.

### 2a. Make it hands-on

Mix step types so the lesson feels like using the thing:

- **At least three steps in four are something the learner causes** (a `do` or a `drag`); in a short lesson,
  every step but one. A guess makes the learner think first, but on its own the step is still watched: give guess
  steps a `do` or `drag` too (the guess comes first, then the learner acts). `check.py` lists the steps that are
  only watched or only guessed.
- **`do` steps**: the learner causes the step, the way they would in real life. "Press the switch",
  "Put in $1,000", "Open the valve". If the action happens on a part of the picture, give `part` (the `act` name)
  and `at` (a 3D point) so a ring pulses on that part and pressing it works. The first step is usually a `do`.
- **`drag` steps**: for anything continuous, the learner drags a slider and the process moves with
  their hand: heating, filling, time passing, pressure rising. Use them where "how it changes over time" matters.
- **Guess steps** play automatically after the guess, so the answer is revealed by the picture.
- **Plain steps** (no `do` or `drag`): at most one in four, for a pure explanation. A zoomed-in reveal ("the disc
  snaps") is a good `drag`; a part that lets something in or out ("the stomata") is a good `do` on that part.
- **Keep it alive.** Anything that runs on its own (bubbles, steam, a flow of particles, coins dropping in, a
  beating heart, a shaking ground, a vibrating string) keeps moving after its step ends, until the learner presses Pause. Draw that motion from the engine's
  clock `st.t` (put `t: 0` in `state`), so the picture never freezes into a still image between steps. Only looping motion
  (decorative, or a rhythm like a heartbeat) uses `st.t`; the values the step teaches still end fixed. If the point is a one-off event (a wave passing), keep a
  trace of it visible at the end (a ring that stays, a ghost with `fade`), so the end state passes the stranger test.
- **Moving parts that really move** (tiles in a proof, a removable salt bridge, a bill passed from desk to desk)
  are fine. The rule against moving parts out of place is about faking a highlight, not about real movement.
- **`tryit`** (always, unless there is genuinely nothing to vary): a sandbox after the last step with 1–3 controls
  (toggles, sliders, buttons) on the same picture and a live line (`observe`) that says what is happening in plain
  words. Pick controls that test the big idea and its most interesting what-if (lid open or closed, a higher rate).
  The sandbox must follow sourced facts. It may speed up time or rescale things if `simplified` says so. A control
  used out of order answers sensibly: it runs the missing step first, or says why not with `ui.note(...)` ("Fill the
  tank first"). Every number it shows comes from the lesson's one model (machines.md, section 1).
  **Illustrative models:** when a sandbox needs a constant no source gives (how fast suspense rises, the size of a
  shift in demand), keep the direction of every effect sourced, pick a round illustrative number, and say in
  `simplified` that the sizes are illustrative.
- **Comparisons are labelled.** When a step compares a living process to a machine ("a channel works like a gate"),
  the caption says it is a comparison, the real structure stays in view, and `simplified` says where the comparison
  stops working (living.md, section 2).
- **Debated topics** (history's causes, open science, schools of economics): never present one school's view as
  fact. Teach what is agreed in the steps, and put the main explanations side by side on one step with
  `views: [{who, says}]` (2-4 views, each sourced). The quiz asks only what is agreed, or "which view says...".

## 2b. Writing rules (every word the learner reads)

These follow plain-language editing. If a `plain-language-editor` skill is installed, run all lesson text through it.

- **Simpler words, same ideas.** Aim for about Grade 3–5 for kids, Grade 5–7 for students and Grade 8 for adults.
  Keep a needed technical term (convection, compound interest), but explain it in plain words the first time.
- **Short sentences.** About 8–15 words, one main idea each. Join closely linked ideas with "and", "so", "but" or
  "because" so the text doesn't sound choppy. Use the natural word pairs people say ("heart and lungs", "in and out",
  "push and pull"), not reversed or invented ones.
- **Common words:** use, not utilize. About, not approximately. Show, not demonstrate. Get, not obtain.
- **Active voice and real actors:** "The disc snaps", not "the switch is triggered".
- **One word for one thing.** If it is a "channel" in step 3, it is a "channel" in the label, the parts, the quiz and
  the simplified list. Never rotate synonyms.
- **Action labels say exactly what happens:** "Press the switch", "Drag to heat the water", "Wait one year".
- **Lead with what happens.** No set-ups ("Here's the thing", "What most people miss", "Plot twist").
- **No AI-sounding filler:** no "not X, it's Y" contrasts, no colon reveals, no "plays a vital role", "it's worth
  noting", "powerful", "seamless", "unlock", "dive into". No dramatic one-line endings. No em dashes.
- **Concrete over abstract.** Use the real number, part or example from the fact sheet.
- **Sentence case everywhere**, labels included ("Steam channel", not "STEAM CHANNEL").
- **Questions are fair.** Wrong answers are believable but clearly wrong. Never use a trick answer that is partly true.


# /teachme

An AI skill. Ask it to teach you anything, and you get one hands-on lesson in a single web page. Version 2 is
built for visual learning about **machines and objects**, **living things** and the ideas behind them: the
pictures are detailed enough to zoom into, built from the real parts of the real thing. You don't
just read: you press the real part to start, drag a slider to make things happen, guess before the surprising
step, tap parts to learn what they are, play in a "Try it yourself" sandbox, and finish with a short quiz. Every
fact is checked against sources listed on the page.

## Install

**ChatGPT**: in ChatGPT, open Skills, choose New skill, upload `teachme-chatgpt.zip` and switch it on.

**Codex**: move the `teachme` folder into `~/.codex/skills/`, then restart Codex.

## Try

- /teachme how does a kettle know when to switch off?
- teach me why compound interest snowballs
- teach me photosynthesis
- how does a steam engine work? (for adults)
- how does a toilet flush refill itself? (for kids)
- how does a nerve cell send a signal?
- show me inside a pin-tumbler lock
- how does the heart pump blood? (for kids)
- how does DNA copy itself?
- how does a vending machine know which snack to drop?
- teach me how a heat pump moves heat uphill, for adults
- how does a bill become a law?
- why did the Western Roman Empire fall?
- how do writers build suspense?

The model asks who's learning (kid, student or adult) and whether to include guesses. Then it researches the topic,
writes a fact sheet, builds the lesson and has a second agent check the facts. You get one `.html` file that opens
in any browser.

## In the lesson

- One clear button moves you forward, named for what it does: **Start**, **Press the switch**, **Next step**, **Try it yourself**.
- Some steps ask you to act: press the part in the picture, or drag a slider to heat, fill or fast-forward.
- Before the key steps, you guess what happens by picking A, B or C.
- Tap any label in the picture to read what that part is.
- **Try it yourself:** change things (open the lid, raise the interest rate) and watch what happens.
- A short quiz at the end explains each answer.
- The picture keeps moving between steps (bubbles, steam, flows). Pause it any time, or replay a step.
- Zoom in and out, and drag to look around.
- Save the whole lesson as a smooth 30 fps video (Options, Download video), with each step's title and text on screen.
- **Options:** start again, full screen for a classroom display, drawing style (Clear, Sketch or High contrast), and switches to turn the guesses and the quiz on or off.
- Print or save as PDF: a worksheet with an answer key, a one-page poster with numbered parts, a labelled diagram, or a handout with every step.
- Some lessons let you turn the picture to see a 3D shape from every side (molecules, for example).
- "Sources and what's simplified" sits under every lesson, with the drawing's scale for living things.
- Health and medicine lessons carry an "Educational, not medical advice" notice and never give dosing advice.
- Works with a keyboard and screen readers, on phones, and with reduced-motion settings.

## What's inside

- `SKILL.md`: the short workflow the model follows (ask, research in the background, draw, check, fact-check, hand over)
- `references/`: details read only when needed (engine API, drawing rules, lesson design and writing, research and fact-check prompts, how the page works), plus two subject guides: `machines.md` (real process, build it like the real thing, invented machines for ideas, exploded views) and `living.md` (real structure, labelled metaphors, scale, sourced numbers, nerves, cells, molecules, plants, health and drugs)
- `assets/teach.js`: the engine (drawing, shading, ready-made parts, labels, the lesson page and the video recorder)
- `assets/fonts/`: the Inter typeface the lessons use, and its licence (SIL Open Font License)
- `assets/examples/`: ten finished lessons to copy from: machines (kettle, steam engine), living things (how a nerve cell sends a signal, photosynthesis), molecules (why water is bent, which you can turn), ideas (compound interest, supply and demand), an institution (how a bill becomes law), language (how a sentence works) and space (Moon phases), most with their fact sheets; and `parts-gallery.html`, every v2 drawing part in one picture
- `templates/` and `scripts/new.py`: start a lesson folder
- `scripts/check.py`: checks a lesson in one run and makes one contact sheet image (needs Playwright), with notes on real detail, scale and health notices, and `--crop` for a sharp close-up; its in-page checks are `check_probe.js` and `check_drive.js`
- `scripts/build.py`: makes one self-contained file
- `scripts/print.py`: makes the printable sheets as PDFs
- `CHANGELOG.md`: what changed in each version
- `pyproject.toml`, `.prettierrc.json`: code style settings (black and ruff for the scripts, Prettier for the JavaScript)

Nothing runs on install. Lessons run in the browser like any web page, with no outside requests.

## Licence

MIT. See [LICENSE](LICENSE).

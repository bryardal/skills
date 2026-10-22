# /teachme

A Claude skill. Ask Claude to teach you anything, and you get one hands-on lesson in a single web page. You don't
just read: you press the real part to start, drag a slider to make things happen, guess before the surprising
step, tap parts to learn what they are, play in a "Try it yourself" sandbox, and finish with a short quiz. Every
fact is checked against sources listed on the page.

## Install

**Claude Code plugin**: `/plugin install teachme --marketplace bryardal/skills`, or get every install route at https://skills.siaccelerator.co/teachme

**Claude Code**: unzip and move the `teachme` folder into `~/.claude/skills/` (or `.claude/skills/` in a project),
then restart Claude Code.

**Claude.ai**: upload `teachme.skill` in Claude's skills settings and switch it on (code execution must be on).

## Try

- /teachme how does a kettle know when to switch off?
- teach me why compound interest snowballs
- teach me photosynthesis
- how does a steam engine work? (for adults)
- how does a toilet flush refill itself? (for kids)
- teach me how a heat pump moves heat uphill, for adults
- how does a bill become a law?
- why did the Western Roman Empire fall?
- how do writers build suspense?

Claude asks who's learning (kid, student or adult) and whether to include guesses. Then it researches the topic,
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
- Printing gives a worksheet with an answer key.
- "Sources and what's simplified" sits under every lesson.
- Works with a keyboard and screen readers, on phones, and with reduced-motion settings.

## What's inside

- `SKILL.md`: the short workflow Claude follows (ask, research in the background, draw, check, fact-check, hand over)
- `references/`: details read only when needed (engine API, drawing rules, lesson design and writing, research and fact-check prompts, how the page works)
- `assets/teach.js`: the engine (drawing, shading, ready-made parts, labels, the lesson page and the video recorder)
- `assets/fonts/`: the Inter typeface the lessons use, and its licence (SIL Open Font License)
- `assets/examples/`: eight finished lessons to copy from: machines (kettle, steam engine), ideas (compound interest, supply and demand), a living process (photosynthesis), an institution (how a bill becomes law), language (how a sentence works) and space (Moon phases), most with their fact sheets
- `templates/` and `scripts/new.py`: start a lesson folder
- `scripts/check.py`: checks a lesson in one run and makes one contact sheet image (needs Playwright); its in-page checks are `check_probe.js` and `check_drive.js`
- `scripts/build.py`: makes one self-contained file
- `evals/`: the stress-test suite (24 topics across 20 subjects), scoring rubric, builder and blind-reviewer prompts, and the results of each test round
- `scripts/gallery.py`: turns a test round into a gallery page
- `IMPROVEMENTS.md`: ranked list of what to improve next
- `CHANGELOG.md`: what changed in each version
- `pyproject.toml`, `.prettierrc.json`: code style settings (black and ruff for the scripts, Prettier for the JavaScript)

Nothing runs on install. Lessons run in the browser like any web page, with no outside requests.

## Licence

MIT. See [LICENSE](LICENSE).

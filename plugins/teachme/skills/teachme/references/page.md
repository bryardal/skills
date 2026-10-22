# The lesson page and the manual checks

You don't need this to build a lesson: `mountLesson` builds the page and `scripts/check.py` runs the checks. Read it only when changing the engine or checking by hand without Playwright.

## 3c. The lesson page (built in; don't rebuild it)

The page is a lesson player with one reading order on every screen: **the picture, the words, then what you
touch.** The learner reads and looks at once, never switching between two sides of the screen. `mountLesson` builds
it, so every lesson looks and behaves the same:

- **One card beside the drawing: read, look and press in one place** (laptops and bigger screens). A white card
  sits in the picture's top-left corner and holds, top to bottom: the progress bar, the words (17 px title, 15 px
  text), what you touch (A, B, C answers, the slider for a `drag` step, the Try it yourself controls), then Back and
  the blue button directly under the last line you read. The drawing fills the space beside the card (or below it,
  when that is much bigger), so the card never covers it; the card is sized for the lesson's longest step, so nothing
  jumps between steps. Labels and the colour key keep off it, live readouts move to the top right, and a zoomed view
  stays on the drawing. Phones and short screens stack the same order: picture, words, controls, with Back and Next
  fixed to the bottom. The lesson's question is the page title.
- **Readouts and buttons on the picture.** Live numbers sit top left as plain readouts (small grey name, large
  number) and appear once the lesson starts. One quiet row of round buttons sits bottom right: Replay, Pause, zoom
  out, zoom in.
- **Responsive at every size.** The picture re-frames itself to the space it gets (and again when a phone rotates or
  a window is resized), leaving room for the controls so Back and Next stay on screen. Phones and short screens: the
  same order stacked, the picture edge to edge, then the words, then the controls, with Back and Next fixed to the
  bottom of the screen (clear of the phone's home bar). Labels in the picture read at about 12 px on any screen.
- **The words and the controls answer four questions in order:**
  1. *Where am I?* "Step 2 of 5" and a thin progress bar (click a segment to jump). Before the start, the intro
     reads as a larger opening paragraph with no heading.
  2. *What's happening?* The step title, large and bold, then the step text.
  3. *What do I do?* The instruction for a `do` step is in the words (the pulsing ring shows the part); the
     slider, the Try it yourself controls and the large A, B, C answers sit below the picture.
  4. *How do I go on?* At the bottom, always in the same place: a one-line hint when needed, "Back" on the left and
     one blue button on the right, named for exactly what it does ("Start", "Press the switch", "Next step", "Try it
     yourself", "Take the quiz", "See my score"). While an animation plays the button becomes a plain "Skip". When the
     learner must answer or drag, the button steps aside and the hint says what to do. If the text is long, only
     the text scrolls; the buttons stay in place.
- **One type scale:** small grey text for context (step count, hints, labels on numbers), a 20 px bold step title,
  16–17 px reading text, and nothing else competing.
- **Above it all, one line:** the lesson title on the left and a quiet "Options" link on the right (Start again,
  Full screen, drawing style, guessing on or off, keyboard keys). Under the picture: one quiet link, "Sources and
  what's simplified".
- **The labels are the buttons.** Tapping (or tabbing to) a label in the picture shows its `parts` sentence in the
  words. The intro says so once. Labels are quiet (white pill, grey hairline); a lit label turns yellow, and while a
  step lights some, the rest fade back. Labels always stay inside the visible picture, even zoomed in on a phone.
- Answers ignore clicks for a moment after they appear, so a double-click on the button can't pick one by accident.
- Feedback names what happened: "Your guess: B, a thermometer in the water. Not quite." then the reason.
- Zoom: − and + on the picture, "Whole picture" when zoomed, drag to look around, and the + − 0 keys. Lines and
  labels keep their size when zoomed.
- Play controls, bottom left of the picture: **Pause / Play** (also the P key) stops and restarts everything that
  moves, including a step's animation and the sandbox. **Replay** plays the current step again (a `do` or `drag`
  step waits for the learner again). On phones both show as icons only. With reduced motion the picture starts
  paused, except the sandbox, which runs.
- Keyboard and screen-reader friendly, visible focus, respects reduced motion, and the learner's style and guessing
  choices are remembered.

Don't add your own buttons, panels, frames, headings or instructions to the page. Put everything the learner needs
into the steps, parts, guesses, sandbox and quiz, and keep the text short enough to fit the band without scrolling
on a laptop (the step text about 50 words at most).

## 5. Check it (two layers, keep it light)

**A. It works and looks right.** Do at most two rounds of fixes. Render with headless Chrome or Playwright over
`file://` (Linux: `chromium`; macOS: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`):
```bash
chrome --headless=new --hide-scrollbars --user-data-dir="$PWD/.shot" --window-size=960,1100 \
  --virtual-time-budget=9000 --screenshot=step3.png "file://$PWD/lesson.html?step=3"
```
- Shoot `?step=N` for every step, `?dostep=N` for each do or drag step (it waits for the learner), `?guessstep=K`
  for each guess step, `?try=1` for the sandbox and `?check=1` for the quiz. Look at each one full size: nothing cut
  off, labels clear, the pulsing ring sits on the right part, nearer parts cover farther ones, the end state is
  right and the picture matches the caption. Apply the stranger test (3b) to every step.
- With Playwright, click through the whole lesson once (press the `do` part, drag each slider to the end, answer the
  guesses and quiz), and in the sandbox try each control and read the live line: it must match the sourced what-ifs.
- Check the live picture: after a step ends, the motion keeps going (`window.__st().t` rises and the picture
  changes); Pause stops it, and pausing during a step freezes that step; Replay plays the step again; with reduced
  motion it starts paused.
- Shoot one step in each style (`&style=clear`, `&style=sketch`, `&style=contrast`) and one with `&guess=0`.
- Check these screen sizes: 360×740, 390×844 (phones), 844×390 (phone on its side), 768×1024 (tablet), 1280×800
  (laptop) and 1920×1080 (monitor). At each: no sideways scrolling, the picture is the larger zone (or on top when
  stacked), labels are readable, the words cover nothing the step is about, and the main button is visible.
- Run one URL with `--dump-dom` and check `<html data-errors="…">`, and search the output for `NaN`.
- Read every caption, part, guess, sandbox message and quiz line once more against the writing rules (2b).

**B. The facts are right.** Get an independent check. If you can start a sub-agent (the Agent tool), give it the
lesson file and `facts.md`. Ask it to open the sources and rate every caption, part, guess, quiz answer, sandbox
message and simplified line as SUPPORTED (with a quote), WEAK or WRONG, and to confirm each marked answer is right and
the others are wrong. Without a sub-agent, do this yourself as a separate pass and open every source again. Fix or
cut anything that isn't SUPPORTED, then check the changed lines again.


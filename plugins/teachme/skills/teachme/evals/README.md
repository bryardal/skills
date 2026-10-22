# Keeping /teachme improving

The skill gets better in rounds. Each round builds lessons on topics chosen to break it, scores them the same way
every time, and turns what broke into fixes. Run a round after any big change to the engine or the instructions,
and at least once a month.

## One round

1. **Build.** Pick 8-12 topics from `suite.md`: always the ones that scored lowest last round, plus a few new
   subjects. Start one builder agent per topic, in parallel, in the background, with the prompt in
   `agent-prompt.md`. Each builds in `stress/NN-slug/` and returns a structured report.
2. **Check independently.** Run `python3 scripts/check.py stress/NN-slug/lesson.html` on every lesson yourself.
3. **Review blind.** Copy every built lesson, its contact sheet and its fact sheet into a review folder under codes
   (L01, L02...) in random order, mixed with last round's versions of any rebuilt topics, and keep the key
   elsewhere. Start one fresh reviewer agent with the reviewer prompt in `agent-prompt.md`. One reviewer for the
   whole set keeps the scale consistent; comparing the same topic before and after is the fairest signal.
4. **Record.** Write `results/YYYY-MM-DD.md`: the scoreboard (both scores, minutes, tool calls, check runs), the
   findings grouped by how many lessons hit them, and what you fixed.
5. **Fix the common problems first.** A problem that hit 3 or more lessons goes into the engine or the instructions
   now. One-off problems go into `../IMPROVEMENTS.md`. Every fix gets a line in `../CHANGELOG.md`.
6. **Regress.** Re-run `check.py` on the examples and last round's lessons, so a fix never breaks an old lesson.
7. **Show.** `python3 scripts/gallery.py stress/ gallery/` builds a page of every lesson with its scores, to look at
   side by side and share. Put the blind scores in `stress/scores.json`; add `compare` rows for rebuilt topics.

## What "better" means

Track these between rounds (in `results/`):
- Average picture clarity and fit (rubric), and the lowest single lesson: the floor matters more than the average.
- Minutes and tool calls per lesson, and `check.py` runs per lesson.
- How many lessons needed a workaround the engine should provide.
- Fact checks: WRONG lines found (should be 0 after the fix pass) and whether the check was independent.

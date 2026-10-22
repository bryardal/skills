# Builder prompt for a test round

Start one agent per topic (in parallel, in the background). Fill in the brackets.

> You are stress-testing a Claude skill called /teachme, which turns any topic into a fact-checked, hands-on,
> interactive visual lesson in one HTML file. The skill lives at [skill folder] (read-only for you: never edit
> anything inside it). Build ONE lesson by following its SKILL.md exactly, as if a user had asked for it, then report
> honestly on how well the skill handled the topic.
>
> Topic: "[question]"  Subject: [subject].  Level: [kid | student | adult].  Guessing: on.
> Work folder: [stress folder]/[NN-slug]/ (create it; put lesson.html and facts.md there).
>
> Rules:
> - Run `date` at the very start and the very end and record both times.
> - Nobody is available to answer questions: use the level and guessing given above.
> - Follow SKILL.md's fast path. If you can't start sub-agents, use the fallbacks it names. Don't read teach.js.
>   Check with scripts/check.py and look at the contact sheet it makes. Run the fact check as the skill says.
> - If the engine lacks something you need, work around it inside your lesson and record exactly what was missing.
>   Don't change the skill.
> - Keep your own effort reasonable (aim for about 40 tool calls).
>
> Reply with your report as text (don't write a report file), under 450 words, with exactly these sections:
> `# Stress test: <topic>` (subject, level, start and end time, check.py runs, final check line, tool calls);
> `## Visual approach` (the picture, and whether a stranger could follow it); `## Scores (1-5, be strict)`
> (accuracy, picture clarity, hands-on, writing, visual polish, fit of the skill to this topic);
> `## What was hard or impossible`; `## Workarounds that should become features`; `## Instruction problems`;
> `## Top 3 improvements (ranked)`.

Save each reply as `[stress folder]/[NN-slug]/report.md`.

# Reviewer prompt (blind)

> You are an independent, strict reviewer of interactive visual lessons. Folder: [review folder]. It has lessons
> L01 to LNN, each with `sheet.png` (a contact sheet of every step, the sandbox, the quiz and a phone view),
> `lesson.html` (the built lesson; `?step=N` shows the end of step N, `?try=1` the sandbox) and `facts.md`. Some
> topics appear twice; score each on its own merits. You know nothing about who made them or how.
>
> Score every lesson with [rubric.md] (1-5 for accuracy, picture clarity, hands-on, writing, visual polish). Be
> strict and consistent; 3 means "works, with clear flaws"; half points allowed. Picture clarity: for each step,
> cover the caption and decide whether a stranger could name what happens (5 every step, 4 all but one, 3 several
> need the caption, 2 the picture decorates the text). Look at every sheet.png. Don't browse the web; a fact sheet
> that says the check was self-run caps accuracy at 4. About 40-60 tool calls.
>
> Reply with text only: a table (Lesson, Topic, Accuracy, Picture, Hands-on, Writing, Polish, Mean); one or two
> lines per lesson on its picture's biggest strength and weakness; the 5 most common problems, ranked, with the
> lessons where you saw each.

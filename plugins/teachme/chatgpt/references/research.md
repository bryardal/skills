# Research, the fact sheet and the fact check

Contents: research rules, the fact sheet format, the research prompt, the fact-check prompt.

## 1. Research and fact sheet (always, before any drawing)

1. Search the web and **open** the pages (WebSearch and WebFetch). A search snippet is not a source.
2. Use **at least two independent, reputable sources**: manufacturers and product manuals, universities,
   government and standards bodies, museums, textbooks, encyclopedias, peer-reviewed reviews and professional bodies.
   Forums, Q&A sites and content farms can only back up another source. Skip pages that look AI-written.
   Living things, health and molecules: see living.md ("Extra sources") for NCBI Bookshelf, PubMed reviews,
   PubChem and PDB structure records and official medicine labels; keep each number's species, tissue and conditions.
   Where to look outside science: writing and literature (university writing centres such as Purdue OWL, Britannica's
   literature entries, the Poetry Foundation glossary, published craft books quoted by reputable reviews); art
   (museum education pages: the Met, Tate, MoMA, National Gallery; university art courseware); law and civics
   (government and court websites, legislation, bar associations, university law schools); psychology (peer-reviewed
   reviews, university departments, APA); history (Britannica, university presses, museums, national archives).
3. Write `facts.md` in the working folder:
   - The real process as an ordered list: each stage, and where every material, signal or amount is after it.
   - For machines: the real parts list (what the object is built from, for the detail pass). For living things:
     the organism, tissue or cell type, and the scale facts (real sizes) if the drawing will be to scale.
   - Numbered facts, one per line: the claim, the source URL and a short quote that supports it.
   - What varies (by model, place or era) or is debated, and the common mistakes people believe. These make good
     wrong answers for guesses.
   - **What-if facts** for the sandbox: what really happens when you change one thing (lid open, higher rate). Only
     sourced what-ifs go into the sandbox.
   - Every number and how you worked it out. **Compute numbers in code** (python or node), never in your head.
4. If two sources disagree, use the more authoritative one and mention the difference in `simplified`.
5. No web access, or no reputable source? Tell the user before you build. Either stop, or build only the
   well-established core, set `subtitle` to say it is an unchecked draft, and list what you couldn't check.


## Fact sheet format

Copy `templates/facts.md` (or `assets/examples/photosynthesis.facts.md` as a filled-in example): the real process as an
ordered list, a numbered facts table (fact | source name and URL | short verbatim quote), common mistakes (used as
wrong answers), what-ifs for the sandbox, then at the end every lesson line mapped to its fact numbers.

## Research prompt (run it in the background with a faster model, then draw while it works)

Start this with the Agent tool as soon as the topic and level are known (`model: "sonnet"`, `run_in_background:
true`). Drawing the object doesn't wait for the facts: the parts and their layout are common knowledge; only the
captions, parts text, numbers, sandbox and quiz need the fact sheet. Fill in the brackets:

> Research facts for an interactive lesson "[question]" for [level] learners. The picture shows [the object and its
> parts]. Write the fact sheet to [folder]/facts.md using the exact format of [skill]/templates/facts.md.
> Budget: at most 10 page fetches and 4-6 reputable, independent sources (encyclopedias, museums, universities,
> government or standards bodies, manuals, textbooks; Wikipedia and blogs only as backup). Open every page you cite;
> quotes verbatim and under 25 words. Aim for 15-22 facts covering: [the stages], [the parts], [key numbers], the
> what-ifs for a sandbox with [controls], and 3-4 common mistakes you can contradict with a source. Stop when the
> list is covered; don't keep searching for extra sources. For living things, give every number its units and
> conditions (species, cell type, at rest or active). Reply in under 150 words: the path, the fact count, the
> sources, and anything you couldn't source.

## Fact-check prompt (run it in the background while `check.py` and the visual fixes run)

Start it with the Agent tool (`model: "sonnet"`, `run_in_background: true`) once the lesson text is written:

> Independently fact-check the lesson [folder]/lesson.html against [folder]/facts.md. Read only the lesson's text:
> intro, step titles and captions (say), parts, guesses, quiz, sandbox messages (observe and notes), simplified and
> idea. For each line, rate SUPPORTED (fact number), WEAK or WRONG against the fact sheet's quotes. Open a source page
> only when a line rests on a fact whose quote doesn't clearly support it (at most 6 fetches). Confirm each marked
> answer is right and the other choices are wrong. Reply with only the WEAK and WRONG lines, each with a suggested
> rewrite in plain words, and a one-line count of the rest. Under 300 words.

Fix or cut anything that isn't SUPPORTED, then map the lesson lines to facts at the end of `facts.md`.

## Without a sub-agent tool (or when you are already a sub-agent)

Do the same work yourself, in the same order, with these limits so it stays fast and honest:

- **Order:** draw first (step 5's first picture of the object needs no facts), then research, then write the
  captions, parts text, guesses and quiz from the fact sheet.
- **Research budget:** at most 10 page fetches and 4-6 sources (failed fetches count, but a site the fetch tool
  refuses counts once: don't try it again. If 3 fail, stop fetching and build with what you have).
- **When searches return spam or a site is blocked**, go to sources that are usually reachable and reputable:
  OpenStax and LibreTexts (free textbooks), MedlinePlus and NIH pages, NCBI Bookshelf, Britannica, university and
  museum pages, manufacturers' manuals; Wikipedia only as backup. Search with the source's name in the query
  ("openstax kidney nephron") rather than the bare topic. Fetch with a prompt that asks for exact sentences:
  "Quote, word for word, the sentences that say ... Do not summarise." Fetch tools can return paraphrases; when a
  quote matters (a number, a surprising claim), fetch the page once more asking for that sentence only, and mark any
  quote you couldn't confirm word for word as "(as returned by the fetch tool)". Some fetch tools cap a quote at
  about 120 characters: ask for the key clause only, or for two short quotes instead of one long one.
- **Cold fact check:** write the whole lesson first, then check it as a separate pass that doesn't trust memory:
  1. Print the lesson's text with `grep -n "say:\|q:\|choices:\|why:\|observe\|simplified\|idea:\|parts" lesson.html` (or
     read from `mountLesson(` down), not the version you remember writing.
  2. For each line, find its fact number in `facts.md` and compare it with the quote, word by word. A line passes
     only if the quote says it; "it's well known" is not a pass.
  3. For every guess and quiz question, check that each wrong choice is fully wrong (not partly true).
  4. Fix WEAK and WRONG lines, then record at the end of `facts.md`: "Fact check: self-run, not independent", with
     the counts and what changed.
- In the hand-off, say the fact check was self-run, so the person knows.

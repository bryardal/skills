#!/usr/bin/env python3
"""One-shot lesson check. Builds the lesson, then in one headless browser run:
  - every step's end state, the sandbox and the quiz: page errors, NaN, labels overlapping or outside the picture
  - a full automatic click-through (do parts, drags, guesses, sandbox, quiz) to the end screen
  - screen sizes from phone to monitor: no sideways scrolling, the main button visible
  - ONE contact sheet image of every step (+ sandbox and a phone view) to look at instead of many screenshots
  - NOTE lines: how much of the frame the drawing covers, steps that barely change the picture, steps with no lit
    label, steps the learner only watches, captions over 50 words, too few real parts for a machine or living
    thing, a living lesson with no stated scale, a health topic with no notice
  - audits: a lit name that matches no label, labels with no parts text or pointing at empty space, outline lines
    that stop in mid-air, numbers in the lesson that facts.md doesn't contain, sizes that break the stated scale
Prints only what needs attention, then "ALL OK" or the problems. Act on NOTE lines too: they predict low review scores.

  python3 check.py lesson.html                 # writes lesson.built.html and lesson.sheet.png next to it
  python3 check.py lesson.html --out OUT.html  # choose the built file
  python3 check.py lesson.html --step 3        # quick: only build and save a full-size screenshot of step 3 (~3 s)
  python3 check.py lesson.html --step 3 --crop .4,.3,.3,.3   # a sharp close-up of part of step 3's picture
  python3 check.py lesson.html --video         # also record the video download and report its size and length

Needs: pip install playwright pillow (and a Chromium: `playwright install chromium` if none is installed).
"""

from __future__ import annotations

import argparse
import asyncio
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build import build  # noqa: E402

HERE = Path(__file__).resolve().parent

# In-page scripts: PROBE reports what needs attention in the current view, DRIVE clicks through the whole lesson.
PROBE = (HERE / "check_probe.js").read_text(encoding="utf-8").strip().rstrip(";")
DRIVE = (HERE / "check_drive.js").read_text(encoding="utf-8").strip().rstrip(";")
AUDIT = (HERE / "check_audit.js").read_text(encoding="utf-8").strip().rstrip(";")

DESKTOP = {"width": 1280, "height": 800}
SCREEN_SIZES = [(360, 740), (390, 844), (844, 390), (768, 1024), (1280, 800), (1920, 1080)]
PHONE = (390, 844)

BUTTON_IN_VIEW = """(() => {
  const nb = document.getElementById('next').getBoundingClientRect();
  return { scroll: document.documentElement.scrollWidth > innerWidth, btn: nb.bottom <= innerHeight + 1 && nb.top >= 0 };
})()"""

HIDE_OVERLAYS = (
    "document.querySelectorAll('#art .tag,#art .lg,.zoombar,.stats').forEach(e=>e.style.visibility='hidden')"
)

LESSON_TEXT = r"""(() => {
  const c = window.__cfg || {}, w = t => String(t || '').trim().split(/\s+/).filter(Boolean).length;
  return {
    steps: (c.steps || []).map((s, i) => ({
      n: i + 1, title: s.title, act: !!(s.do || s.drag), do: !!s.do, guess: !!s.guess, words: w(s.say),
    })),
    text: JSON.stringify([c.intro, c.idea, (c.steps || []).map(s => [s.title, s.say, s.guess]), c.parts, c.check, c.simplified]),
    kind: c.kind || '', scale: c.scale || '', notice: c.notice || '',
    lit: [...new Set((c.steps || []).flatMap(s => s.lit || []))], parts: Object.keys(c.parts || {}),
    words: JSON.stringify([c.intro, c.idea, (c.steps || []).map(s => [s.title, s.say, s.guess, (s.views || [])]), c.parts,
      c.check, c.simplified, c.tryit && c.tryit.say]),
    measure: (c.measure || []).map(m => ({ what: m.what, d: Math.hypot(m.a[0] - m.b[0], m.a[1] - m.b[1], m.a[2] - m.b[2]),
      real: m.real })), unitsPer: c.unitsPer || 0,
  };
})()"""

NEW_PARTS_PER_STEP = """(() => {
  const c = window.__cfg || {}, seen = new Set();
  return (c.steps || []).map((s, i) => {
    const fresh = (s.lit || []).filter(x => !seen.has(x));
    fresh.forEach(x => seen.add(x));
    return { n: i + 1, title: s.title, fresh };
  });
})()"""

SHAPES = """[...document.querySelectorAll('#art path,#art circle,#art rect,#art ellipse,#art polygon')]
  .filter(e => !e.closest('.tag')).length"""

# every label the scene can draw in the current state, ignoring what is in view (so a zoomed step still counts)
ALL_NAMES = """(() => { const v = VIEW, s = SEEN; VIEW = null; SEEN = null;
  let h = ''; try { h = String(window.__cfg.scene(window.__st(), MAT.steel)); } catch (e) {}
  VIEW = v; SEEN = s; return [...h.matchAll(/data-part="([^"]+)"/g)].map(m => m[1]); })()"""

UNFINISHED = re.compile(r"(?i)\b(TODO|TBD|placeholder|lorem ipsum|FIXME|XXX)\b")
HEALTH = re.compile(
    r"(?i)\b(drugs?|medicines?|medications?|doses?|dosage|mg|tablets?|pills?|vaccines?|diseases?|symptoms?|"
    r"treatments?|therap(y|ies)|diagnos\w*|addict\w*|overdose|prescri\w*|surgery|cancer)\b"
)


# ---------------------------------------------------------------------------------------------------------------
# Before the browser: syntax
# ---------------------------------------------------------------------------------------------------------------


def syntax_problem(src: str) -> str | None:
    """Check each inline script of the lesson with `node --check`; a typo would otherwise look like a crash."""
    if not shutil.which("node"):
        return None
    for js in re.findall(r"<script>(.*?)</script>", Path(src).read_text(encoding="utf-8"), re.S):
        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as tf:
            tf.write(js)
        result = subprocess.run(["node", "--check", tf.name], capture_output=True, text=True)
        os.remove(tf.name)
        if result.returncode:
            msg = [line for line in result.stderr.splitlines() if line.strip()][:4]
            line = re.search(r":(\d+)", msg[0] if msg else "")
            where = f" near line {int(line.group(1))} of the script" if line else ""
            return (
                "syntax error in the lesson script" + where + ": " + " | ".join(m.strip() for m in msg[1:4])
            )
    return None


# ---------------------------------------------------------------------------------------------------------------
# Reading probe results
# ---------------------------------------------------------------------------------------------------------------


def view_problems(label: str, r: dict) -> list[str]:
    """Problems found by PROBE in one view of the full check."""
    found = []
    if r["nan"]:
        found.append(
            f"{label}: NaN/undefined in the drawing at {r['nanAt']} (usually a helper given the wrong type: see api.md)"
        )
    if r["out"]:
        found.append(f"{label}: labels outside the picture: {', '.join(r['out'])}")
    if r["over"]:
        found.append(f"{label}: labels overlap: {'; '.join(r['over'])}")
    if r["clash"]:
        found.append(
            f"{label}: "
            + "; ".join(r["clash"][:4])
            + " (move it with dx/dy, or let it find its own place: drop fixed positions)"
        )
    if r["errors"]:
        found.append(f"{label}: {r['errors']}")
    return found


def quick_step_problems(r: dict, errors: list[str]) -> list[str]:
    """Problems found by PROBE in the single view of a --step run."""
    found = []
    if r["nan"]:
        found.append(f"NaN/undefined in the drawing at {r['nanAt']}")
    if r["out"]:
        found.append(f"labels outside the picture: {', '.join(r['out'])}")
    if r["over"]:
        found.append(f"labels overlap: {'; '.join(r['over'])}")
    if r["clash"]:
        found.append("overlap: " + "; ".join(r["clash"][:4]))
    return found + ["page error: " + e for e in errors]


def share(image, test) -> float:
    """Share of the pixels of a greyscale image that pass `test`."""
    histogram = image.point(lambda v: 255 if test(v) else 0).histogram()
    return histogram[255] / (image.width * image.height)


def contact_sheet(thumbs: list, phone, path: str) -> int:
    """Save every view in a three-column grid, plus the phone view on the right. Returns the number of views."""
    from PIL import Image, ImageDraw

    tw, cols = 420, 3
    cells = [(label, im.resize((tw, int(im.height * tw / im.width)))) for label, im in thumbs]
    ch = max(im.height for _, im in cells) + 22
    rows = (len(cells) + cols - 1) // cols
    phone_img = phone.resize((300, int(phone.height * 300 / phone.width))) if phone else None
    pw = 320 if phone_img else 0
    height = max(rows * ch + 10, (phone_img.height + 32) if phone_img else 0)
    sheet = Image.new("RGB", (cols * (tw + 10) + pw + 10, height), "white")
    draw = ImageDraw.Draw(sheet)
    for i, (label, im) in enumerate(cells):
        x, y = 10 + (i % cols) * (tw + 10), 6 + (i // cols) * ch
        draw.text((x, y), label[:70], fill=(60, 60, 60))
        sheet.paste(im, (x, y + 16))
        draw.rectangle([x, y + 16, x + tw - 1, y + 16 + im.height - 1], outline=(225, 225, 225))
    if phone_img:
        x = cols * (tw + 10) + 10
        draw.text((x, 6), "Phone 390x844", fill=(60, 60, 60))
        sheet.paste(phone_img, (x, 22))
    sheet.save(path)
    return len(cells)


# ---------------------------------------------------------------------------------------------------------------
# Browser checks
# ---------------------------------------------------------------------------------------------------------------


PAGE_TIMEOUT = 120000  # heavy scenes on a busy machine can take a while to open; never fail on a slow load


async def open_page(browser, **kw):
    """A new page with generous timeouts, so a slow scene is reported as slow instead of crashing the check."""
    page = await browser.new_page(**kw)
    page.set_default_timeout(PAGE_TIMEOUT)
    page.set_default_navigation_timeout(PAGE_TIMEOUT)
    return page


async def screenshot(element_or_page, path: str, mode: str):
    """Screenshot to a temporary file and return it as a PIL image (`mode` 'RGB' or 'L')."""
    from PIL import Image

    await element_or_page.screenshot(path=path)
    image = Image.open(path).convert(mode)
    os.remove(path)
    return image


async def quick_step(browser, url: str, base: str, step: int, crop=None) -> int:
    """--step N: one full-size screenshot of a step, and the probe's findings for it (--crop: a sharp close-up)."""
    page = await open_page(browser, viewport=DESKTOP, device_scale_factor=3 if crop else 1)
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    await page.goto(url + f"?step={step}")
    await page.wait_for_timeout(400)
    r = await page.evaluate(PROBE)
    shot = base + f".step{step}.png"
    if crop:
        # a sharp close-up of part of the picture (fractions of the drawing's box), to inspect joints and detail
        fb = await page.evaluate("(() => { const b = document.getElementById('fig').getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; })()")
        x, y, w, h = crop
        shot = base + f".step{step}.closeup.png"
        await page.screenshot(path=shot, clip={"x": fb[0] + x * fb[2], "y": fb[1] + y * fb[3], "width": w * fb[2], "height": h * fb[3]})
    else:
        await page.screenshot(path=shot)
    await browser.close()
    found = quick_step_problems(r, errors)
    print(f'step {step} ({r["title"]}): {shot}')
    print("\n".join("PROBLEM " + x for x in found) if found else "STEP OK")
    return 1 if found else 0


async def click_through(browser, url: str, errors: list[str]) -> dict:
    """Play the whole lesson like a learner, on its own page."""
    page = await open_page(browser, viewport=DESKTOP)
    page.on("pageerror", lambda e: errors.append(str(e)))
    await page.goto(url)
    await page.wait_for_timeout(300)
    result = await page.evaluate(DRIVE)
    await page.close()
    return result


async def screen_sizes(browser, url: str, step: int, base: str, errors: list[str]):
    """Open a middle step at every screen size: no sideways scroll, the main button in view, labels inside."""
    found, phone = [], None
    for w, h in SCREEN_SIZES:
        page = await open_page(browser, viewport={"width": w, "height": h})
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto(url + f"?step={step}")
        await page.wait_for_timeout(300)
        layout = await page.evaluate(BUTTON_IN_VIEW)
        r = await page.evaluate(PROBE)
        if layout["scroll"]:
            found.append(f"{w}x{h}: page scrolls sideways")
        if not layout["btn"]:
            found.append(f"{w}x{h}: main button not visible")
        if r["out"]:
            found.append(f"{w}x{h}: labels outside the picture: {', '.join(r['out'])}")
        if (w, h) == PHONE:
            phone = await screenshot(page, base + ".phone.tmp.png", "RGB")
        await page.close()
    return found, phone


async def record_video(browser, url: str, base: str, problems: list[str]) -> None:
    """--video: play the lesson into the video download and report the file."""
    ctx = await browser.new_context(viewport=DESKTOP, accept_downloads=True)
    page = await ctx.new_page()
    page.set_default_timeout(PAGE_TIMEOUT)
    await page.goto(url)
    await page.wait_for_timeout(300)
    if not await page.evaluate("window.__video && window.__video()"):
        problems.append("video: this browser cannot record")
        return
    async with page.expect_download(timeout=1200000) as download_info:  # long lessons with effects take minutes headless
        await page.click("#optB")
        await page.click("#video")
    download = await download_info.value
    path = base + os.path.splitext(download.suggested_filename)[1]
    await download.save_as(path)
    print(f"video: {os.path.basename(path)}, {os.path.getsize(path) / 1e6:.1f} MB")


async def main(args) -> int:
    from PIL import ImageChops
    from playwright.async_api import async_playwright

    src = os.path.abspath(args.lesson)
    base = os.path.splitext(src)[0]
    out = os.path.abspath(args.out or base + ".built.html")
    page_text = Path(src).read_text(encoding="utf-8")
    try:
        if 'src="teach.js"' not in page_text and "function mountLesson(" in page_text:
            # already built (a downloaded or published lesson, or update.py's output): check it as it is
            if os.path.abspath(out) != src:
                Path(out).write_text(page_text, encoding="utf-8")
        else:
            build(src, out)
    except ValueError as err:
        print(f"PROBLEM {err}")
        return 1
    problem = syntax_problem(src)
    if problem:
        print("PROBLEM " + problem)
        return 1

    url = "file://" + out
    problems: list[str] = []
    notes: list[str] = []
    errors: list[str] = []
    t0 = time.time()
    async with async_playwright() as p:
        exe = os.environ.get("CHROME") or None
        browser = await (p.chromium.launch(executable_path=exe) if exe else p.chromium.launch())
        if args.step is not None and not args.full:
            crop = [float(v) for v in args.crop.split(",")] if args.crop else None
            return await quick_step(browser, url, base, args.step, crop)

        page = await open_page(browser, viewport=DESKTOP)
        page.on("pageerror", lambda e: errors.append(str(e)))
        t_open = time.time()
        await page.goto(url)
        await page.wait_for_function("document.getElementById('art') && document.getElementById('art').childElementCount > 0")
        open_secs = time.time() - t_open
        scene_ms = await page.evaluate(
            "(() => { const t = performance.now(); for (let i = 0; i < 3; i++) window.__cfg.scene(window.__st(), MAT.steel);"
            " return (performance.now() - t) / 3; })()"
        )
        await page.wait_for_timeout(300)
        if not await page.evaluate("!!document.getElementById('fig')"):
            reason = "; ".join(sorted(set(errors))) or "no error message (is mountLesson called?)"
            print("PROBLEM the lesson did not start: " + reason)
            await browser.close()
            return 1
        n = await page.evaluate('document.querySelectorAll("#bar .seg").length')

        # The click-through and the screen sizes mostly wait on animations: run them beside the step views.
        drive_task = asyncio.create_task(click_through(browser, url, errors))
        sizes_task = asyncio.create_task(screen_sizes(browser, url, max(1, n // 2), base, errors))

        # Every view: the start, each step's end state, the sandbox and the quiz.
        states = [("Start", "")] + [(f"Step {k}", f"step={k}") for k in range(1, n + 1)]
        start_shapes = 0
        most_el = [0, ""]
        seen_names: set[str] = set()
        drawn_names: set[str] = set()
        out_of_view: list = []
        empty_labels: dict[str, str] = {}
        loose_views: list = []
        states += [("Try it", "try=1"), ("Quiz", "check=1")]
        thumbs, pics = [], []
        for name, query in states:
            await page.goto(url + ("?" + query if query else ""))
            await page.wait_for_timeout(250)
            r = await page.evaluate(PROBE)
            start_shapes = max(start_shapes, await page.evaluate(SHAPES))  # the richest view (close-ups count)
            n_el = await page.evaluate("document.querySelectorAll('#art *').length")
            if n_el > most_el[0]:
                most_el[:] = [n_el, name]
            label = f"{name}: {r['title']}" if r["title"] and name.startswith("Step") else name
            au = await page.evaluate(AUDIT)
            seen_names.update(au["names"])
            drawn_names.update(await page.evaluate(ALL_NAMES))
            if name.startswith("Step"):
                k = int(name.split()[1]) - 1
                step_lit = (await page.evaluate(f"(window.__cfg.steps[{k}].lit || [])")) or []
                for nm in step_lit:
                    if nm not in au["names"]:
                        out_of_view.append((label, nm))
            for nm in au["empty"]:
                empty_labels.setdefault(nm, label)
            if au["loose"]:
                loose_views.append((label, au["loose"]))
            problems += view_problems(label, r)
            if r["cover"]:
                notes.append(
                    f"{label}: "
                    + "; ".join(r["cover"][:3])
                    + " (fine only if that is the point; otherwise move one of them)"
                )
            stage = await page.query_selector("#stage")
            thumbs.append((label, await screenshot(stage, base + ".tmp.png", "RGB")))
            await page.evaluate(HIDE_OVERLAYS)
            fig = await page.query_selector("#fig")
            drawing = (await screenshot(fig, base + ".tmp.png", "L")).resize((320, 200))
            pics.append((name, label, drawing, r))
            if args.step is not None and query == f"step={args.step}":
                await page.screenshot(path=base + f".step{args.step}.png")

        # Lesson notes: too many new parts at once, steps the learner only watches, long or unfinished text.
        lesson = await page.evaluate(LESSON_TEXT)
        for x in await page.evaluate(NEW_PARTS_PER_STEP):
            if len(x["fresh"]) > 2:
                notes.append(
                    f"Step {x['n']}: {x['title']}: introduces {len(x['fresh'])} new parts at once "
                    f"({', '.join(x['fresh'])}); 1-2 per step keeps it easy to follow (split the step)"
                )
        idle = [x for x in lesson["steps"] if not x["act"]]
        allow = max(1, len(lesson["steps"]) // 4)
        if len(idle) > allow:
            notes.append(
                "the learner only watches (or only guesses) in steps "
                + ", ".join(str(x["n"]) for x in idle)
                + f": at most {allow} may; give the others a do or drag (press the part that causes it, drag time forward)"
            )
        for x in lesson["steps"]:
            if x["words"] > 50:
                notes.append(
                    f"Step {x['n']}: {x['title']}: the caption has {x['words']} words "
                    "(aim for 50 or fewer; 70 for adults)"
                )
        if most_el[0] > 1500:
            notes.append(
                f"{most_el[1]} has {most_el[0]} drawn elements (aim for under about 1,500): the page gets slow to open and "
                "to animate. Lighter parts: fewer gears or teeth you can't see, `latheAx(..., {n: 16})` for small round "
                "parts, `ring`/`wheel` for thin rings, and nothing drawn that is hidden or off screen"
            )
        if scene_ms > 60 or open_secs > 6:
            notes.append(
                f"the lesson takes {open_secs:.1f} s to open and {scene_ms:.0f} ms to draw one frame (aim for under 40 ms): "
                "draw fewer, simpler parts (fewer tube points, one organ call per frame, no hidden parts), or the "
                "animation stutters on slower devices"
            )
        # Subject notes (kind: 'machine' | 'living' | 'idea'): real detail, a stated scale, a health notice.
        kind = lesson["kind"]
        if not kind:
            notes.append("no kind set: add kind: 'machine', 'living' or 'idea' to mountLesson (it picks the checks)")
        if kind in ("machine", "living") and start_shapes < 150:
            notes.append(
                f"even the richest view has only {start_shapes} shapes: a {kind} reads as real with its real "
                "parts (screws, seams, bevels, ticks, ribs, veins, organelles); see the detail pass in drawing.md"
            )
        if kind == "living" and not lesson["scale"]:
            notes.append("living things need a stated scale: scale: 'Schematic, not to scale' or 'Drawn to scale: ...'")
        if HEALTH.search(lesson["text"]) and not lesson["notice"]:
            notes.append(
                "the lesson talks about health, drugs or treatment: add notice: 'Educational, not medical advice.' "
                "(see living.md, Health and drugs)"
            )
        # Audits: lit names that match no label, labels with no explanation, labels pointing at nothing, lines that
        # stop in mid-air, numbers that the fact sheet doesn't contain, sizes that don't match the stated scale.
        for nm in sorted(set(lesson["lit"]) - drawn_names):
            notes.append(
                f"a step lights '{nm}' but no label in the picture is called that: check the spelling "
                "(fine only if your scene reads it as a switch, as compound-interest does)"
            )
        for where, nm in out_of_view:
            if nm in drawn_names:
                notes.append(f"{where}: it lights '{nm}' but that label is out of view in this step (zoom out or include it)")
        for nm in sorted((seen_names | drawn_names) - set(lesson["parts"])):
            notes.append(f"label '{nm}' has no parts text, so tapping it explains nothing (add it to parts)")
        for nm, where in empty_labels.items():
            notes.append(f"{where}: the label '{nm}' points at empty space (move its point onto the part)")
        if loose_views:
            most = max(len(v) for _, v in loose_views)
            first = "; ".join(f"{lab} at {pts[0][0]},{pts[0][1]}" for lab, pts in loose_views[:2])
            notes.append(
                f"up to {most} outline line end(s) per view stop in mid-air ({len(loose_views)} view(s); {first}): a line "
                "should end on a face edge, another line or a part. Marks that stand for print (a scale, MAX and MIN) may "
                "stop freely. Look with --step N --crop"
            )
        facts = Path(args.lesson).with_name("facts.md")
        if not facts.exists():
            facts = Path(args.lesson).with_name(Path(args.lesson).stem.replace(".built", "") + ".facts.md")
        if facts.exists():
            ftext = facts.read_text(encoding="utf-8").replace(",", "").replace("\u2212", "-")
            nums = set(re.findall(r"(?<![\w.])\d[\d,]*(?:\.\d+)?", lesson["words"].replace("\\u2019", "'")))
            missing = sorted(
                {x.replace(",", "") for x in nums if float(x.replace(",", "")) >= 2 or "." in x}
                - set(re.findall(r"\d+(?:\.\d+)?", ftext)),
                key=lambda v: float(v),
            )
            if missing:
                notes.append(
                    "numbers in the lesson that facts.md doesn't contain: " + ", ".join(missing[:12])
                    + " (every number needs a sourced fact; add it or cut it)"
                )
        if lesson["measure"] and lesson["unitsPer"]:
            for m in lesson["measure"]:
                drawn = m["d"] / lesson["unitsPer"]
                if m["real"] and abs(drawn - m["real"]) / m["real"] > 0.05:
                    problems.append(
                        f"scale: '{m['what']}' is drawn {drawn:.3g} long but is really {m['real']:.3g} "
                        f"(unitsPer {lesson['unitsPer']}); fix the size or the scale line"
                    )
        unfinished = UNFINISHED.findall(lesson["text"])
        if unfinished:
            problems.append("unfinished text left in the lesson: " + ", ".join(sorted(set(unfinished))))

        # Picture notes: how much of the frame the drawing fills, and whether each step visibly changes it.
        coverage = share(pics[0][2], lambda v: v < 252)
        if coverage < 0.1:
            notes.append(
                f"the drawing covers only {coverage:.0%} of the frame at the start: is the subject big enough? "
                "(fine for one slender object or a wide space scene; not for small objects with empty space between them)"
            )
        prev = pics[0]
        for x in (x for x in pics if x[0].startswith("Step")):
            change = share(ImageChops.difference(prev[2], x[2]), lambda v: v > 25)
            if x[3]["vb"] == prev[3]["vb"] and change < 0.015:
                notes.append(
                    f"{x[1]}: the picture barely changes ({change:.1%}) and the view stays the same; zoom in on what "
                    "changes (zoom: 'auto') or make the change bigger (colour, size, motion, an arrow)"
                )
            if not x[3]["lit"]:
                notes.append(
                    f"{x[1]}: no label is lit, so nothing points the learner at what this step is about (add lit: [...])"
                )
            prev = x

        # Every do step: nothing may cover the part to press.
        for x in lesson["steps"]:
            if not x.get("do"):
                continue
            await page.goto(url + f"?dostep={x['n']}")
            await page.wait_for_timeout(350)
            r = await page.evaluate(PROBE)
            if r["clash"]:  # a heavy page may still be drawing: a real cover stays
                await page.wait_for_timeout(1500)
                r = await page.evaluate(PROBE)
            if r["clash"]:
                problems.append(
                    f"Step {x['n']} ({x['title']}), before pressing: " + "; ".join(r["clash"][:3])
                )

        try:
            drive = await drive_task
        except Exception as e:  # a slow or broken page: report it, never crash
            drive = {"ok": False, "seen": [f"(the click-through stopped: {str(e).splitlines()[0][:120]})"]}
        if not drive["ok"]:
            problems.append("click-through did not reach the end: " + " > ".join(drive["seen"][-12:]))
        try:
            size_problems, phone = await sizes_task
        except Exception as e:
            size_problems, phone = [f"screen sizes could not be checked: {str(e).splitlines()[0][:120]}"], None
        problems += size_problems
        if args.video:
            await record_video(browser, url, base, problems)
        await browser.close()

    problems += ["page error: " + e for e in sorted(set(errors))]
    sheet_path = base + ".sheet.png"
    views = contact_sheet(thumbs, phone, sheet_path)
    seen = drive["seen"]
    print(f"built: {out}")
    print(f"sheet: {sheet_path}  ({views} views; read this one image)")
    print(
        f'click-through: {" > ".join(seen[:1] + [s for i, s in enumerate(seen[1:], 1) if s != seen[i - 1]])}'
    )
    for x in notes:
        print("NOTE " + x)
    print("\n".join("PROBLEM " + x for x in problems) if problems else "ALL OK", f"({time.time() - t0:.0f}s)")
    return 1 if problems else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Check a teachme lesson in a headless browser.")
    parser.add_argument("lesson")
    parser.add_argument("--out")
    parser.add_argument("--step", type=int)
    parser.add_argument("--video", action="store_true")
    parser.add_argument("--full", action="store_true", help="with --step: run the full check too")
    parser.add_argument(
        "--crop", help="with --step: x,y,w,h as fractions of the picture (e.g. .4,.3,.3,.3) for a sharp 3x close-up"
    )
    try:
        sys.exit(asyncio.run(main(parser.parse_args())))
    except Exception as e:  # never end with ALL OK after a crash: say what stopped the check
        print(f"PROBLEM check.py stopped: {type(e).__name__}: {str(e).splitlines()[0][:200] if str(e) else ''}")
        print("(a slow or stuck page is the usual cause: see the NOTE about drawing time, or try again)")
        sys.exit(1)

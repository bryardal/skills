#!/usr/bin/env python3
"""One-shot lesson check. Builds the lesson, then in one headless browser run:
  - every step's end state, the sandbox and the quiz: page errors, NaN, labels overlapping or outside the picture
  - a full automatic click-through (do parts, drags, guesses, sandbox, quiz) to the end screen
  - screen sizes from phone to monitor: no sideways scrolling, the main button visible
  - ONE contact sheet image of every step (+ sandbox and a phone view) to look at instead of many screenshots
  - NOTE lines: how much of the frame the drawing covers, steps that barely change the picture, steps with no lit
    label, steps the learner only watches, captions over 50 words
Prints only what needs attention, then "ALL OK" or the problems. Act on NOTE lines too: they predict low review scores.

  python3 check.py lesson.html                 # writes lesson.built.html and lesson.sheet.png next to it
  python3 check.py lesson.html --out OUT.html  # choose the built file
  python3 check.py lesson.html --step 3        # quick: only build and save a full-size screenshot of step 3 (~3 s)
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

UNFINISHED = re.compile(r"(?i)\b(TODO|TBD|placeholder|lorem ipsum|FIXME|XXX)\b")


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


async def screenshot(element_or_page, path: str, mode: str):
    """Screenshot to a temporary file and return it as a PIL image (`mode` 'RGB' or 'L')."""
    from PIL import Image

    await element_or_page.screenshot(path=path)
    image = Image.open(path).convert(mode)
    os.remove(path)
    return image


async def quick_step(browser, url: str, base: str, step: int) -> int:
    """--step N: one full-size screenshot of a step, and the probe's findings for it."""
    page = await browser.new_page(viewport=DESKTOP)
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    await page.goto(url + f"?step={step}")
    await page.wait_for_timeout(400)
    r = await page.evaluate(PROBE)
    shot = base + f".step{step}.png"
    await page.screenshot(path=shot)
    await browser.close()
    found = quick_step_problems(r, errors)
    print(f'step {step} ({r["title"]}): {shot}')
    print("\n".join("PROBLEM " + x for x in found) if found else "STEP OK")
    return 1 if found else 0


async def click_through(browser, url: str, errors: list[str]) -> dict:
    """Play the whole lesson like a learner, on its own page."""
    page = await browser.new_page(viewport=DESKTOP)
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
        page = await browser.new_page(viewport={"width": w, "height": h})
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
    await page.goto(url)
    await page.wait_for_timeout(300)
    if not await page.evaluate("window.__video && window.__video()"):
        problems.append("video: this browser cannot record")
        return
    async with page.expect_download(timeout=400000) as download_info:
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
    try:
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
            return await quick_step(browser, url, base, args.step)

        page = await browser.new_page(viewport=DESKTOP)
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto(url)
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
        states += [("Try it", "try=1"), ("Quiz", "check=1")]
        thumbs, pics = [], []
        for name, query in states:
            await page.goto(url + ("?" + query if query else ""))
            await page.wait_for_timeout(250)
            r = await page.evaluate(PROBE)
            label = f"{name}: {r['title']}" if r["title"] and name.startswith("Step") else name
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

        drive = await drive_task
        if not drive["ok"]:
            problems.append("click-through did not reach the end: " + " > ".join(drive["seen"][-12:]))
        size_problems, phone = await sizes_task
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
    sys.exit(asyncio.run(main(parser.parse_args())))

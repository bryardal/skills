#!/usr/bin/env python3
"""Print a lesson as PDF sheets for a class: worksheet, poster, labelled diagram and handout.

  python3 print.py lesson.html                      # all four formats: lesson.poster.pdf, lesson.diagram.pdf, ...
  python3 print.py lesson.html --format poster      # one format (worksheet | poster | diagram | handout | all)
  python3 print.py lesson.html --paper letter       # US Letter instead of A4
  python3 print.py lesson.html --png                # also save each page as a PNG to look at (needs pdftoppm)

The same sheets are in the lesson itself (Options, Print or save as PDF), so a teacher can make them in the browser.
Needs: pip install playwright (and a Chromium).
"""

from __future__ import annotations

import argparse
import asyncio
import os
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build import build  # noqa: E402

FORMATS = ["worksheet", "poster", "diagram", "handout"]

# In print layout: a list item whose bottom lies below the box that clips it is cut off. Try the page with smaller
# text ("tight", then "tighter") and keep the first that fits; return the names of items still cut off.
FIT_JS = """() => {
  const cutOff = () => {
    const out = [];
    for (const li of document.querySelectorAll('.ppage.poster li, .ppage.handout.first li, .ppage.diagram tr')) {
      const b = li.getBoundingClientRect();
      for (let p = li.parentElement; p && !p.classList.contains('sheet'); p = p.parentElement) {
        const o = getComputedStyle(p).overflow;
        if (o === 'hidden' && b.bottom > p.getBoundingClientRect().bottom + 1) {
          out.push(li.textContent.trim().slice(0, 40));
          break;
        }
      }
    }
    return out;
  };
  const pages = [...document.querySelectorAll('.ppage.poster, .ppage.handout.first, .ppage.diagram')];
  let cut = cutOff();
  for (const lvl of ['tight', 'tighter']) {
    if (!cut.length) break;
    pages.forEach(p => p.classList.add(lvl));
    cut = cutOff();
  }
  return cut;
}"""


async def make(built: Path, formats: list[str], paper: str, png: bool) -> list[Path]:
    from playwright.async_api import async_playwright

    out: list[Path] = []
    async with async_playwright() as p:
        exe = os.environ.get("CHROME") or None
        browser = await (p.chromium.launch(executable_path=exe) if exe else p.chromium.launch())
        page = await browser.new_page(viewport={"width": 1280, "height": 800})
        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        for fmt in formats:
            url = built.resolve().as_uri() + f"?print={fmt}&paper={paper}"
            await page.emulate_media(media="screen")
            await page.goto(url)
            await page.wait_for_function("document.documentElement.dataset.printReady", timeout=120000)
            await page.wait_for_timeout(300)
            # lay the sheet out as it prints, and shrink the text a step at a time until every list item fits
            await page.emulate_media(media="print")
            cut = await page.evaluate(FIT_JS)
            pdf = built.with_name(built.name.replace(".built.html", "") + f".{fmt}.pdf")
            await page.pdf(path=str(pdf), prefer_css_page_size=True, print_background=True)
            out.append(pdf)
            pages = "?"
            if shutil.which("pdfinfo"):
                info = subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True).stdout
                pages = next((ln.split()[-1] for ln in info.splitlines() if ln.startswith("Pages:")), "?")
            moment = await page.evaluate("document.documentElement.dataset.printMoment || ''")
            choices = await page.evaluate("document.documentElement.dataset.printChoices || ''")
            print(f"{fmt}: {pdf}  ({pages} page{'s' if pages != '1' else ''})" + (
                f"; picture from {moment} (choose another with print: {{overview: k}})" if moment else ""))
            if moment and choices:
                print(f"  labels shown at each moment: {choices}")
            if cut:
                print(f"PROBLEM {fmt}: {len(cut)} item(s) do not fit on the page and are cut off: " + "; ".join(cut[:6]) +
                      " (shorten the parts' descriptions or step titles, or pick a less crowded overview)")
            if png and shutil.which("pdftoppm"):
                stem = str(pdf)[:-4]
                subprocess.run(["pdftoppm", "-png", "-r", "70", str(pdf), stem], check=True)
                print("  pages as PNG: " + stem + "-*.png")
        await browser.close()
        for e in sorted(set(errors)):
            print("PROBLEM page error: " + e)
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description="Print a lesson as PDF sheets.")
    ap.add_argument("lesson")
    ap.add_argument("--format", default="all", choices=FORMATS + ["all"])
    ap.add_argument("--paper", default="a4", choices=["a4", "letter"])
    ap.add_argument("--png", action="store_true")
    args = ap.parse_args()
    src = Path(args.lesson)
    built = src if src.name.endswith(".built.html") else src.with_name(src.stem + ".built.html")
    if built != src:
        build(str(src), str(built))
    asyncio.run(make(built, FORMATS if args.format == "all" else [args.format], args.paper, args.png))
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Update a lesson that was already built (or published) to the current engine.

A built lesson carries its own copy of the engine, so it keeps the version it was made with. This swaps that copy
for the current one and leaves the lesson itself (scene, steps, text) exactly as it was.

  python3 update.py old-lesson.html                 # writes old-lesson.updated.html
  python3 update.py old-lesson.html new.html        # or to a name you choose
  python3 update.py lesson.html --check             # also run check.py on the result

Works on a .built.html, a downloaded lesson, or a published page's HTML (the engine is found by its mountLesson).
Then open the result, or run check.py on it, before republishing it to the same link.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build import engine_js  # noqa: E402

SCRIPT_OPEN = re.compile(r"<script\b[^>]*>", re.I)


def swap_engine(page: str) -> str:
    """Return the page with its inlined engine replaced by the current engine."""
    at = page.find("function mountLesson(")
    if at < 0:
        raise ValueError("no teachme engine found in this page (it has no mountLesson)")
    opens = [m for m in SCRIPT_OPEN.finditer(page, 0, at)]
    if not opens:
        raise ValueError("the engine is not inside a <script> tag")
    start = opens[-1]
    end = page.find("</script>", at)
    if end < 0:
        raise ValueError("the engine's <script> tag is not closed")
    if "mountLesson({" in page[start.end() : end] and "function mountLesson(" not in page[start.end() : end]:
        raise ValueError("found the lesson's own script, not the engine")
    engine = engine_js().replace("</script", "<\\/script")
    return page[: start.start()] + "<script>\n" + engine + "\n" + page[end:]


def main(argv: list[str]) -> int:
    args = [a for a in argv[1:] if not a.startswith("--")]
    if not args:
        print(__doc__)
        return 1
    src = Path(args[0])
    out = Path(args[1]) if len(args) > 1 else src.with_name(re.sub(r"(\.built)?\.html?$", "", src.name) + ".updated.html")
    page = src.read_text(encoding="utf-8")
    try:
        new = swap_engine(page)
    except ValueError as err:
        print(f"PROBLEM {src}: {err}")
        return 1
    out.write_text(new, encoding="utf-8")
    print(f"wrote {out}")
    if "--check" in argv:
        return subprocess.call([sys.executable, str(Path(__file__).resolve().parent / "check.py"), str(out)])
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

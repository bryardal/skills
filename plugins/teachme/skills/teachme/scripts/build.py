#!/usr/bin/env python3
"""Turn a teachme lesson page into one self-contained HTML file.

    python3 build.py lesson.html [OUT.html]

lesson.html loads the engine with <script src="teach.js"></script> (handy while working: put a copy of
assets/teach.js next to it). The build replaces that tag with the engine itself, so OUT.html (default:
lesson.built.html) runs on its own: open it from disk, email it, host it, embed it in an iframe.
"""

from __future__ import annotations

import base64
import re
import sys
from pathlib import Path

ASSETS = Path(__file__).resolve().parent.parent / "assets"
ENGINE = ASSETS / "teach.js"
FONT = ASSETS / "fonts" / "inter-latin-wght.woff2"
FONT_MARKER = "__TEACHME_FONT__"
ENGINE_TAG = re.compile(r"""<script\s+src=["'](?:\./)?teach\.js["']\s*>\s*</script>""")


def engine_js() -> str:
    """The engine source with the lesson font embedded in place of its marker, ready to inline."""
    js = ENGINE.read_text(encoding="utf-8")
    if FONT.exists():
        js = js.replace(FONT_MARKER, base64.b64encode(FONT.read_bytes()).decode(), 1)
    return js


def inline_engine(page: str, engine: str | None = None) -> str:
    """Replace the page's <script src="teach.js"> tag with the engine itself."""
    tag = ENGINE_TAG.search(page)
    if not tag:
        raise ValueError('the lesson must load the engine with <script src="teach.js"></script>')
    engine = engine_js() if engine is None else engine
    script = "<script>\n" + engine.replace("</script", "<\\/script") + "\n</script>"
    return page[: tag.start()] + script + page[tag.end() :]


def build(src: str | Path, out: str | Path) -> None:
    """Write the self-contained version of the lesson at `src` to `out`."""
    page = Path(src).read_text(encoding="utf-8")
    Path(out).write_text(inline_engine(page), encoding="utf-8")


def main(argv: list[str]) -> None:
    if len(argv) < 2:
        sys.exit(__doc__)
    src = argv[1]
    out = argv[2] if len(argv) > 2 else re.sub(r"\.html?$", "", src) + ".built.html"
    try:
        build(src, out)
    except ValueError as err:
        sys.exit(f"{src}: {err}")
    print(f"wrote {out}")


if __name__ == "__main__":
    main(sys.argv)

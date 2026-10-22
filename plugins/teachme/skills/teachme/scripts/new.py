#!/usr/bin/env python3
"""Start a lesson folder from the templates.

  python3 new.py FOLDER "How does a steam engine work?" --level adult --guess off

Writes FOLDER/lesson.html (page skeleton with every mountLesson option) and FOLDER/facts.md (fact sheet skeleton,
unless one is already there). Then check with: python3 check.py FOLDER/lesson.html
"""

import argparse
import datetime
from pathlib import Path

TEMPLATES = Path(__file__).resolve().parent.parent / "templates"


def fill(template: str, title: str, level: str, guess: bool) -> str:
    """Put the lesson's title, level, guess setting and today's date into a template."""
    return (
        template.replace("__TITLE__", title)
        .replace("__LEVEL__", level)
        .replace("__GUESS__", "true" if guess else "false")
        .replace("__DATE__", datetime.date.today().strftime("%d %b %Y"))
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Start a lesson folder from the templates.")
    parser.add_argument("folder")
    parser.add_argument("title")
    parser.add_argument("--level", default="student", choices=["kid", "student", "adult"])
    parser.add_argument("--guess", default="on", choices=["on", "off"])
    args = parser.parse_args()

    folder = Path(args.folder)
    folder.mkdir(parents=True, exist_ok=True)
    for name in ["lesson.html", "facts.md"]:
        dst = folder / name
        if name == "facts.md" and dst.exists():
            print("kept", dst)
            continue
        template = (TEMPLATES / name).read_text(encoding="utf-8")
        dst.write_text(fill(template, args.title, args.level, args.guess == "on"), encoding="utf-8")
        print("wrote", dst)


if __name__ == "__main__":
    main()

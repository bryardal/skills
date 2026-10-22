#!/usr/bin/env python3
"""Build a gallery page of test-round lessons, to look at side by side and share.

  python3 gallery.py STRESS_DIR OUT_DIR [--artifact] [--after NEWER_DIR]

STRESS_DIR holds one folder per lesson (NN-slug/lesson.html) and, optionally, scores.json:
  {"round": "...", "skill": "...", "lessons": {"NN-slug": {"subject", "level", "minutes", "calls", "runs", "accuracy",
   "picture", "hands", "writing", "polish", "fit", "pattern", "note"}}, "findings": [[problem, lessons, fix], ...],
   "next": ["...", ...]}
OUT_DIR gets index.html, lessons/<slug>.html (self-contained) and thumbs/<slug>.webp (a mid-lesson view).
--artifact leaves out the <!doctype>/<head> wrapper (for publishing hosts that add their own).
--after shows each lesson before and after, from a folder with newer builds of the same lessons.
Needs: playwright, pillow.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from html import escape, unescape
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build import build, engine_js  # noqa: E402

DIMS = [
    ("accuracy", "Accuracy"),
    ("picture", "Picture"),
    ("hands", "Hands-on"),
    ("writing", "Writing"),
    ("polish", "Polish"),
    ("fit", "Fit"),
]
DEFAULT_LEDE = (
    "Each lesson below was built by its own agent from the skill's instructions alone, on a subject chosen to "
    "stretch it, then scored from its pictures and a full click-through. Open any lesson to try it."
)


async def make_thumbs(items: list[tuple[str, Path, int]], out: Path) -> None:
    """Save a picture-only view of each lesson as thumbs/<slug>.webp."""
    from PIL import Image
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        # A short screen gets the stacked layout, so the picture fills the stage instead of sharing it with the card.
        page = await browser.new_page(viewport={"width": 1280, "height": 520})
        for slug, built, _ in items:
            await page.goto(f"file://{built}?try=1")  # the whole picture, everything on
            await page.wait_for_timeout(700)
            await page.add_style_tag(content=".stats,.zoombar,.cap{visibility:hidden!important}")
            stage = await page.query_selector("#stage")
            tmp = out / "thumbs" / f"{slug}.png"
            await stage.screenshot(path=str(tmp))
            image = Image.open(tmp).convert("RGB")
            image = image.resize((720, int(image.height * 720 / image.width)))
            image.save(out / "thumbs" / f"{slug}.webp", "WEBP", quality=82)
            tmp.unlink()
        await browser.close()


def dots(value) -> str:
    """A score out of 5 as five dots (full, half or empty) and the number."""
    v = float(value or 0)
    full, half = int(v), v - int(v) >= 0.5
    level = "lo" if v < 3 else "mid" if v < 4 else "hi"
    marks = "".join(
        '<i class="on"></i>' if i < full else '<i class="half"></i>' if (i == full and half) else "<i></i>"
        for i in range(5)
    )
    return f'<span class="dots {level}" aria-label="{v:g} out of 5">{marks}<b>{v:g}</b></span>'


def count_steps(source: str) -> int:
    """Count the steps of a lesson from its source (a step may start with chapter:, so match any title: key)."""
    if "steps:" not in source:
        return 4
    steps = source.split("steps:", 1)[1].split("tryit", 1)[0]
    return len(re.findall(r"(?<![\w.])title:\s*['\"]", steps))


def card_meta(slug: str, m: dict) -> str:
    return (
        f'<div class="meta"><span class="chip">{escape(m.get("subject", ""))}</span>'
        f'<span class="lvl">{escape(m.get("level", ""))}</span><span class="num">{slug.split("-")[0]}</span></div>'
    )


def thumb_figure(slug: str, label: str, steps: int, aria: str, quiet: bool) -> str:
    return (
        f'<figure><button class="thumb" type="button" data-l="{slug}" aria-label="{aria}"><img src="thumbs/{slug}.webp"'
        f' alt="" loading="lazy" width="720" height="460"></button><figcaption><b>{label}</b> · {steps} steps'
        f'<button class="open{" quiet" if quiet else ""}" type="button" data-l="{slug}">Open</button></figcaption></figure>'
    )


def pair_card(slug: str, title: str, m: dict, before_steps: int, after_steps: int) -> str:
    """A card showing the same lesson before and after."""
    before = thumb_figure(slug, "Before", before_steps, "Open the earlier version", quiet=True)
    after = thumb_figure(slug + ".after", "After", after_steps, "Open the rebuilt version", quiet=False)
    return f"""<article class="card pair">
  {card_meta(slug, m)}
  <h3>{escape(title)}</h3>
  <div class="ba">
    {before}
    {after}
  </div>
  <p class="note">{escape(m.get('after_note', ''))}</p>
</article>"""


def lesson_card(slug: str, title: str, m: dict) -> str:
    """A card for one lesson: picture, subject and level, scores, note and build facts."""
    scores = "".join(
        f'<div class="sc"><span>{label}</span>{dots(m[key])}</div>' for key, label in DIMS if key in m
    )
    facts = " · ".join(
        x
        for x in [
            f"{m['minutes']} min" if "minutes" in m else "",
            f"{m['calls']} tool calls" if "calls" in m else "",
            f"{m['runs']} checks" if "runs" in m else "",
        ]
        if x
    )
    return f"""<article class="card">
  <button class="thumb" type="button" data-l="{slug}" aria-label="Open the lesson: {escape(title)}"><img src="thumbs/{slug}.webp" alt="" loading="lazy" width="720" height="460"></button>
  {card_meta(slug, m)}
  <h3>{escape(title)}</h3>
  <p class="pattern">{escape(m.get('pattern', ''))}</p>
  <div class="scores">{scores}</div>
  <p class="note">{escape(m.get('note', ''))}</p>
  <div class="foot"><span class="facts">{facts}</span><button class="open" type="button" data-l="{slug}">Open lesson</button></div>
</article>"""


def summary_stats(slugs: list[str], lessons: dict) -> str:
    """The strip of round totals and averages."""

    def avg(key: str) -> float:
        values = [float(v[key]) for v in lessons.values() if key in v]
        return sum(values) / max(1, len(values))

    stats = [
        (str(len(slugs)), "lessons"),
        (str(len({v.get("subject") for v in lessons.values()}) or len(slugs)), "subjects"),
        (f"{avg('minutes'):.0f} min" if lessons else "-", "average build"),
        (f"{avg('picture'):.1f}" if lessons else "-", "picture clarity, of 5"),
        (f"{avg('fit'):.1f}" if lessons else "-", "fit of the skill, of 5"),
    ]
    return "".join(f'<div class="stat"><b>{v}</b><span>{label}</span></div>' for v, label in stats)


def compare_table(meta: dict) -> str:
    """Optional blind-review table: [[topic, picture before, picture after, mean before, mean after], ...]."""
    rows = meta.get("compare")
    if not rows:
        return ""
    body = "".join(
        f'<tr><td>{escape(t)}</td><td class="n">{a1}</td><td class="n"><b>{a2}</b></td>'
        f'<td class="n">{b1}</td><td class="n"><b>{b2}</b></td></tr>'
        for t, a1, a2, b1, b2 in rows
    )
    return (
        '<h2>Same topic, before and after</h2><p class="sub">'
        + escape(meta.get("compare_note", ""))
        + '</p><div class="tbl"><table><thead><tr><th>Topic</th><th>Picture before</th><th>Picture after</th>'
        + "<th>All scores before</th><th>All scores after</th></tr></thead><tbody>"
        + body
        + "</tbody></table></div>"
    )


def embedded_sources(sources: list[tuple[str, str, str]]) -> str:
    """The engine and each lesson's source, embedded once so lessons open inside the gallery page.

    Hosts may refuse to open the lesson files on their own; the viewer joins engine and lesson into its frame.
    """

    def embed(text: str) -> str:
        return text.replace("</script", "<\\/script")

    blocks = f'<script type="text/plain" id="engine">{embed(engine_js())}</script>'
    blocks += "".join(
        f'<script type="text/plain" id="L-{slug}" data-title="{escape(title)}">{embed(src)}</script>'
        for slug, title, src in sources
    )
    return blocks


def render_page(meta: dict, slugs: list[str], cards: list[str], sources, pairs: bool, artifact: bool) -> str:
    lessons = meta["lessons"]
    findings = "".join(
        f'<tr><td>{escape(p)}</td><td class="n">{escape(str(c))}</td><td>{escape(fix)}</td></tr>'
        for p, c, fix in meta.get("findings", [])
    )
    next_steps = "".join(f"<li>{escape(x)}</li>" for x in meta.get("next", []))

    page = TEMPLATE.replace("{{ROUND}}", escape(meta.get("round", "Test round")))
    page = page.replace("{{SKILL}}", escape(meta.get("skill", "")))
    page = page.replace("{{LEDE}}", escape(meta.get("lede", DEFAULT_LEDE)))
    if not any(k in v for v in lessons.values() for k in ("minutes", "picture", "fit")):
        # no scores yet: no score panel or key
        page = re.sub(r'\s*<div class="stats">\{\{STATS\}\}</div>', "", page)
        page = re.sub(r'\s*<p class="legend">.*?</p>', "", page, flags=re.S)
    page = page.replace("{{STATS}}", summary_stats(slugs, lessons)).replace("{{CARDS}}", "\n".join(cards))
    if not findings:
        page = re.sub(r"\s*<h2>What broke, and what changed</h2>.*?</table></div>", "", page, flags=re.S)
    if not next_steps:
        page = re.sub(r'\s*<h2>Next round</h2>\s*<ul class="next">\{\{NEXT\}\}</ul>', "", page)
    page = page.replace("{{FINDINGS}}", findings).replace("{{NEXT}}", next_steps)
    page = page.replace("{{GRIDCLASS}}", " pairs" if pairs else "")
    page = page.replace("{{COMPARE}}", compare_table(meta))
    page = page.replace("{{EMBED}}", embedded_sources(sources))
    if not artifact:
        page = (
            '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            + page.replace("</style>", "</style></head><body>", 1)
            + "\n</body></html>"
        )
    return page


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a gallery page of test-round lessons.")
    parser.add_argument("stress")
    parser.add_argument("out")
    parser.add_argument("--artifact", action="store_true")
    parser.add_argument(
        "--after",
        help="a folder with newer builds of the same lessons (same NN-slug names): each card shows before and after",
    )
    args = parser.parse_args()

    stress, out = Path(args.stress).resolve(), Path(args.out).resolve()
    (out / "lessons").mkdir(parents=True, exist_ok=True)
    (out / "thumbs").mkdir(parents=True, exist_ok=True)
    scores = stress / "scores.json"
    meta = json.loads(scores.read_text()) if scores.exists() else {"lessons": {}}
    slugs = sorted(d.name for d in stress.iterdir() if (d / "lesson.html").exists())

    items, cards, sources = [], [], []
    for slug in slugs:
        src = stress / slug / "lesson.html"
        built = out / "lessons" / f"{slug}.html"
        build(src, built)
        text = src.read_text(encoding="utf-8")
        title = unescape(re.search(r"<title>(.*?)</title>", text, re.S).group(1).strip())
        steps = count_steps(text)
        items.append((slug, built, steps))
        sources.append((slug, title, text))
        m = meta["lessons"].get(slug, {})

        after_src = Path(args.after).resolve() / slug / "lesson.html" if args.after else None
        if after_src and after_src.exists():
            after_text = after_src.read_text(encoding="utf-8")
            after_built = out / "lessons" / f"{slug}.after.html"
            build(after_src, after_built)
            after_steps = count_steps(after_text)
            items.append((slug + ".after", after_built, after_steps))
            sources.append((slug + ".after", title + " (rebuilt)", after_text))
            cards.append(pair_card(slug, title, m, steps, after_steps))
        else:
            cards.append(lesson_card(slug, title, m))

    asyncio.run(make_thumbs(items, out))
    page = render_page(meta, slugs, cards, sources, pairs=bool(args.after), artifact=args.artifact)
    (out / "index.html").write_text(page, encoding="utf-8")
    print("gallery:", out / "index.html", f"({len(slugs)} lessons)")


TEMPLATE = r"""<title>Teachme Test Round</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@500;700;800&family=Public+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap">
<style>
/* Layout: a lab notebook of lesson specimens: summary strip, then a grid of lesson cards, then what broke. */
:root{--bg:#ffffff;--fg:#1b1e24;--muted:#646a76;--rule:#e3e5ea;--soft:#f4f5f8;--accent:#2a4fd6;--hi:#ffc93c;--lo:#c2412d;--ok:#1d7a45;
  --display:"Schibsted Grotesk",system-ui,sans-serif;--body:"Public Sans",system-ui,sans-serif;--mono:"JetBrains Mono",ui-monospace,Menlo,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#121419;--fg:#eceef3;--muted:#9aa1ae;--rule:#2a2e37;--soft:#1b1e25;--accent:#7f9bff;--hi:#ffcf52;--lo:#ff8a73;--ok:#5fcf8d;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#121419;--fg:#eceef3;--muted:#9aa1ae;--rule:#2a2e37;--soft:#1b1e25;--accent:#7f9bff;--hi:#ffcf52;--lo:#ff8a73;--ok:#5fcf8d;color-scheme:dark}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--fg);font:16px/1.55 var(--body);margin:0}
.wrap{max-width:1280px;margin:0 auto;padding-block:40px 64px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.eyebrow{font:500 12px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
h1{font:800 clamp(30px,4.4vw,52px)/1.05 var(--display);letter-spacing:-.02em;margin:10px 0 12px;text-wrap:balance}
.lede{max-width:68ch;color:var(--muted);margin:0 0 28px;font-size:17px}
.stats{display:flex;flex-wrap:wrap;gap:1px;background:var(--rule);border:1px solid var(--rule);border-radius:14px;overflow:hidden;margin-bottom:40px}
.stat{flex:1 1 140px;background:var(--bg);padding:16px 18px}
.stat b{display:block;font:700 28px/1.1 var(--display);font-variant-numeric:tabular-nums}
.stat span{font-size:13px;color:var(--muted)}
h2{font:700 24px/1.2 var(--display);margin:48px 0 6px;letter-spacing:-.01em}
.sub{color:var(--muted);margin:0 0 18px;max-width:72ch}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,360px),1fr));gap:22px}
.grid.pairs{grid-template-columns:repeat(auto-fill,minmax(min(100%,560px),1fr))}
.ba{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:8px 0 6px}
.ba figure{margin:0;min-width:0} .ba figcaption{display:flex;align-items:center;gap:8px;margin-top:6px;font-size:13.5px;color:var(--muted)} .ba figcaption b{color:var(--fg)}
.ba figcaption .open{margin-left:auto;padding:5px 12px;font-size:13px} .open.quiet{background:var(--soft);color:var(--fg)}
.card{display:flex;flex-direction:column;min-width:0;border-top:1px solid var(--rule);padding-top:14px}
.thumb{display:block;width:100%;border:0;padding:0;cursor:pointer;border-radius:10px;overflow:hidden;background:var(--soft);aspect-ratio:720/460;max-width:100%}
.thumb img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .25s}
.thumb:hover img{transform:scale(1.025)}
.meta{display:flex;align-items:center;gap:8px;margin:12px 0 6px;font-size:13px}
.chip{font-weight:600;padding:2px 9px;border-radius:999px;background:var(--soft)}
.lvl{color:var(--muted)}
.num{margin-left:auto;font:500 12px var(--mono);color:var(--muted)}
.card h3{font:700 19px/1.25 var(--display);margin:0 0 4px;text-wrap:balance}
.pattern{margin:0 0 10px;font-size:14px;color:var(--muted)}
.scores{display:grid;grid-template-columns:1fr 1fr;gap:4px 18px;margin-bottom:10px}
.sc{display:flex;justify-content:space-between;align-items:center;font-size:13px}
.sc>span{color:var(--muted)}
.dots{display:inline-flex;align-items:center;gap:3px}
.dots i{width:8px;height:8px;border-radius:50%;background:var(--rule)}
.dots.hi i.on,.dots.hi i.half{background:var(--ok)} .dots.mid i.on,.dots.mid i.half{background:var(--accent)} .dots.lo i.on,.dots.lo i.half{background:var(--lo)}
.dots i.half{opacity:.45}
.dots b{font:500 12px var(--mono);margin-left:6px;min-width:22px;text-align:right;font-variant-numeric:tabular-nums}
.note{margin:0 0 12px;font-size:14.5px}
.foot{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.facts{font:500 12px var(--mono);color:var(--muted)}
.open{font:600 14px var(--body,inherit);color:#fff;background:var(--accent);padding:7px 14px;border:0;border-radius:999px;cursor:pointer}
dialog.viewer{width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0;background:#fff;display:none;flex-direction:column}
dialog.viewer[open]{display:flex} dialog.viewer::backdrop{background:rgba(20,22,28,.5)}
.vbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;border-bottom:1px solid #e3e5ea;background:#fff;color:#1b1e24}
.vbar b{font:700 15px/1.3 system-ui,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vclose{font:600 14px system-ui,sans-serif;border:1px solid #d6d9df;background:#fff;color:#1b1e24;border-radius:999px;padding:7px 16px;cursor:pointer;flex:none}
.vclose:focus-visible{outline:2px solid #2f5fd6;outline-offset:2px}
dialog.viewer iframe{flex:1;width:100%;border:0;background:#fff}
.open:hover{filter:brightness(1.08)} .open:focus-visible,.thumb:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.tbl{overflow-x:auto;border:1px solid var(--rule);border-radius:12px}
table{border-collapse:collapse;width:100%;min-width:640px;font-size:14.5px}
th,td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--rule);vertical-align:top}
th{font:600 12px var(--mono);letter-spacing:.04em;text-transform:uppercase;color:var(--muted);background:var(--soft)}
tr:last-child td{border-bottom:0}
td.n{font:500 14px var(--mono);text-align:center;width:90px}
ul.next{padding-left:20px;max-width:75ch} ul.next li{margin-bottom:6px}
.legend{font-size:13px;color:var(--muted);margin:-6px 0 18px}
@media (prefers-reduced-motion:reduce){.thumb img{transition:none}}
</style>
<div class="wrap">
  <div class="eyebrow">{{ROUND}} · teachme {{SKILL}}</div>
  <h1>Can it teach anything?</h1>
  <p class="lede">{{LEDE}}</p>
  <div class="stats">{{STATS}}</div>
  <h2>The lessons</h2>
  <p class="legend">Scores out of 5: green 4 and up, blue 3 to 3.5, red below 3. Fit means how well the skill suited the topic.</p>
  <div class="grid{{GRIDCLASS}}">
{{CARDS}}
  </div>
{{COMPARE}}
  <h2>What broke, and what changed</h2>
  <p class="sub">Problems grouped by how many lessons hit them. Common problems were fixed in the engine and instructions straight away.</p>
  <div class="tbl"><table><thead><tr><th>Problem</th><th>Lessons</th><th>Fix</th></tr></thead><tbody>{{FINDINGS}}</tbody></table></div>
  <h2>Next round</h2>
  <ul class="next">{{NEXT}}</ul>
</div>
<dialog class="viewer" id="viewer" aria-labelledby="vtitle"><div class="vbar"><b id="vtitle"></b><button class="vclose" id="vclose" type="button">Close</button></div><iframe id="vframe" title="Lesson"></iframe></dialog>
{{EMBED}}
<script>
(() => {
  const dlg = document.getElementById('viewer'), fr = document.getElementById('vframe'), ttl = document.getElementById('vtitle');
  const engine = () => document.getElementById('engine').textContent;
  let opener = null;
  const open = slug => {
    const el = document.getElementById('L-' + slug); if (!el) return;
    const src = el.textContent.replace(/<\\\/script/g, '<' + '/script').replace('<script src="teach.js"><' + '/script>', () => '<script>' + engine() + '<' + '/script>');
    ttl.textContent = el.dataset.title || 'Lesson'; fr.srcdoc = src; opener = document.activeElement;
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    document.getElementById('vclose').focus();
  };
  const close = () => { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); };
  dlg.addEventListener('close', () => { fr.srcdoc = ''; if (opener) opener.focus(); });
  document.getElementById('vclose').addEventListener('click', close);
  document.addEventListener('click', e => { const b = e.target.closest('[data-l]'); if (b) open(b.dataset.l); });
})();
</script>"""


if __name__ == "__main__":
    main()

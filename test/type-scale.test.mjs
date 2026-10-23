import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Every page uses the small type scale in site/assets/site.css (same scale as siaccelerator.co).
// Only --fs-display, the skill name, may go past 44px, and never past 64px.
const css = readFileSync(new URL("../site/assets/site.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

test("text sizes come only from the --fs-* scale", () => {
  for (const [decl] of css.matchAll(/(?<![-\w])font(?:-size)?:[^;}]+/g)) {
    if (/\d(?:\.\d+)?em\b/.test(decl)) continue; // relative to the parent, e.g. inline code
    assert.match(decl, /var\(--fs-[a-z0-9]+\)/, `size outside the scale: ${decl}`);
  }
});

test("the scale stays small", () => {
  const tokens = [...css.matchAll(/--fs-([a-z0-9]+):([^;]+);/g)];
  assert.ok(tokens.length >= 8);
  for (const [, name, value] of tokens) {
    const max = name === "display" ? 64 : 44;
    for (const [, px] of value.matchAll(/(\d+(?:\.\d+)?)px/g)) assert.ok(Number(px) <= max, `--fs-${name} ${value} goes past ${max}px`);
  }
});

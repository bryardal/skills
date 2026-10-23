import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";

// Built pages must point at the current site.css and site.js, so a browser never reuses an old copy.
// If this fails, run: node scripts/build.mjs
const site = new URL("../site/", import.meta.url);
const hash = (f) => createHash("sha256").update(readFileSync(new URL(`assets/${f}`, site))).digest("hex").slice(0, 8);

test("built pages carry the current asset versions", () => {
  const pages = readdirSync(site, { recursive: true }).filter((f) => f.endsWith(".html") && !f.includes("examples/"));
  const css = hash("site.css"), js = hash("site.js");
  for (const page of pages) {
    const html = readFileSync(new URL(page, site), "utf8");
    if (!html.includes("/assets/site.css")) continue;
    assert.ok(html.includes(`/assets/site.css?v=${css}`), `${page} has an old site.css version`);
    assert.ok(html.includes(`/assets/site.js?v=${js}`), `${page} has an old site.js version`);
  }
});

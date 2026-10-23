import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { hub, landing, privacy } from "../templates/parts.mjs";

const brand = JSON.parse(readFileSync(new URL("../brand.json", import.meta.url), "utf8"));
const script = readFileSync(new URL("../site/assets/site.js", import.meta.url), "utf8");
const skill = { slug: "sample", name: "/sample", tagline: "A sample skill." };

// Run the actual signup script with a small DOM fixture and a mocked subscribe response.
function visit({ page = "hub", storage = new Map(), cookie = "", blockedStorage = false, succeeds = true } = {}) {
  const listeners = new Map();
  const button = { disabled: false };
  const message = { textContent: "" };
  const member = { hidden: true }, guest = { hidden: false };
  const main = { inert: false, focus() {} };
  const gate = { hidden: true, querySelector: () => ({ focus() {} }) };
  const form = {
    email: { value: "visitor@example.com" }, company: { value: "" },
    parentElement: { querySelector: () => message },
    querySelector: () => button, closest: () => gate,
    addEventListener: (name, callback) => listeners.set(name, callback)
  };
  const requests = [];
  const document = {
    cookie,
    body: { dataset: { gated: "true", skill: page }, classList: { add() {}, remove() {}, toggle() {} } },
    addEventListener() {},
    getElementById: (id) => id === "gate" ? gate : main,
    querySelectorAll: (selector) => ({
      "form.js-signup": [form], "[data-when-member]": [member], "[data-when-guest]": [guest]
    })[selector] || []
  };
  runInNewContext(script, {
    window: { SIA: {}, dispatchEvent() {} }, document,
    localStorage: {
      getItem(key) { if (blockedStorage) throw new Error("Storage blocked"); return storage.get(key); },
      setItem(key, value) { if (blockedStorage) throw new Error("Storage blocked"); storage.set(key, value); }
    },
    matchMedia: () => ({ matches: true }), addEventListener() {}, scrollY: 0,
    setTimeout: (callback) => callback(), Event: class {},
    fetch: async (url, options) => {
      requests.push({ url, body: JSON.parse(options.body) });
      return { ok: succeeds, json: async () => ({ ok: succeeds, error: "Try again." }) };
    }
  });
  return { gate, main, member, guest, storage, document, form, message, requests,
    submit: () => listeners.get("submit")({ preventDefault() {} }) };
}

test("hub and skill pages offer the shared gate; privacy remains open", () => {
  const home = hub([], brand), page = landing(skill, brand);
  for (const html of [home, page]) {
    assert.match(html, /data-gated="true"/);
    assert.equal((html.match(/id="gate"/g) || []).length, 1);
  }
  assert.match(home, /Get the skills free/);
  assert.match(home, />Get the skills<\/button>/);
  assert.match(page, /Get \/sample free/);
  assert.match(page, />Get the skill<\/button>/);
  assert.match(privacy(brand), /data-gated="false"/);
  assert.doesNotMatch(privacy(brand), /id="gate"/);
});

for (const first of ["hub", "sample"]) {
  test(`signup on ${first} unlocks later hub and skill visits`, async () => {
    const initial = visit({ page: first });
    assert.equal(initial.gate.hidden, false);
    assert.equal(initial.main.inert, true);
    await initial.submit();
    assert.equal(initial.requests[0].body.skill, first);
    assert.equal(initial.gate.hidden, true);
    assert.equal(initial.main.inert, false);
    assert.match(initial.document.cookie, /Path=\//);
    for (const next of ["hub", "sample", "another-skill"]) {
      const returning = visit({ page: next, storage: initial.storage });
      assert.equal(returning.gate.hidden, true);
      assert.equal(returning.member.hidden, false);
      assert.equal(returning.guest.hidden, true);
      assert.equal(returning.requests.length, 0);
    }
  });
}

test("cookie remembers members when localStorage is unavailable", async () => {
  const initial = visit({ blockedStorage: true });
  await initial.submit();
  const returning = visit({ page: "sample", cookie: initial.document.cookie, blockedStorage: true });
  assert.equal(returning.gate.hidden, true);
  assert.equal(returning.member.hidden, false);
});

test("failed signup keeps the gate open and does not remember membership", async () => {
  const page = visit({ succeeds: false });
  await page.submit();
  assert.equal(page.gate.hidden, false);
  assert.equal(page.storage.size, 0);
  assert.equal(page.document.cookie, "");
  assert.equal(page.message.textContent, "Try again.");
});

test("invalid email never submits or unlocks the page", async () => {
  const page = visit();
  page.form.email.value = "not-an-email";
  await page.submit();
  assert.equal(page.requests.length, 0);
  assert.equal(page.gate.hidden, false);
  assert.equal(page.storage.size, 0);
});

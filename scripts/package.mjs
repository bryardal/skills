#!/usr/bin/env node
// Packages one skill for every install route.
// Usage: node scripts/package.mjs <slug> [--allow-claude-mentions]
//
// Writes:
//   site/<slug>/dl/<slug>.zip, .tar.gz              Claude app upload, Claude Code one-liner, manual install
//   site/<slug>/dl/<slug>-chatgpt.zip, .tar.gz      ChatGPT Skills upload, Codex one-liner
//   dist/<slug>/<slug>-chatgpt-plugin.zip           upload for platform.openai.com/plugins (Skills only)
//   dist/<slug>/SHA256SUMS.txt
//
// The ChatGPT build uses plugins/<slug>/chatgpt/SKILL.md in place of the Claude SKILL.md when it exists,
// and refuses to build if any text file still mentions Claude or artifacts (OpenAI asks for neutral wording).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [slug, ...flags] = process.argv.slice(2);
if (!slug) { console.error("Usage: node scripts/package.mjs <slug>"); process.exit(1); }

const plugin = path.join(root, "plugins", slug);
const skill = path.join(plugin, "skills", slug);
if (!fs.existsSync(path.join(skill, "SKILL.md"))) { console.error(`Missing ${path.relative(root, skill)}/SKILL.md`); process.exit(1); }

const JUNK = new Set([".DS_Store", "__pycache__", "node_modules", ".git", ".pytest_cache", "Thumbs.db"]);
const copyClean = (from, to) => fs.cpSync(from, to, { recursive: true, filter: (src) => !JUNK.has(path.basename(src)) && !src.endsWith(".pyc") });
const env = { ...process.env, COPYFILE_DISABLE: "1" };
const zip = (cwd, out, name) => { fs.rmSync(out, { force: true }); execFileSync("zip", ["-qrX", out, name], { cwd, env }); };
const tgz = (cwd, out, name) => execFileSync("tar", ["-czf", out, name], { cwd, env });

const dl = path.join(root, "site", slug, "dl");
const dist = path.join(root, "dist", slug);
fs.mkdirSync(dl, { recursive: true }); fs.mkdirSync(dist, { recursive: true });

// 1. Claude builds: a single top-level folder named <slug>.
const stageA = fs.mkdtempSync(path.join(os.tmpdir(), "pkg-"));
copyClean(skill, path.join(stageA, slug));
zip(stageA, path.join(dl, `${slug}.zip`), slug);
tgz(stageA, path.join(dl, `${slug}.tar.gz`), slug);

// 2. ChatGPT builds.
const stageB = fs.mkdtempSync(path.join(os.tmpdir(), "pkg-"));
const gptSkill = path.join(stageB, slug);
copyClean(skill, gptSkill);
// plugins/<slug>/chatgpt/ is an overlay: any file there replaces the same path in the skill,
// and chatgpt/.exclude lists paths (one per line) to leave out of the ChatGPT build.
const overlay = path.join(plugin, "chatgpt");
if (fs.existsSync(overlay)) {
  fs.cpSync(overlay, gptSkill, { recursive: true, filter: (src) => path.basename(src) !== ".exclude" });
  const ex = path.join(overlay, ".exclude");
  if (fs.existsSync(ex)) for (const line of fs.readFileSync(ex, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))) {
    const target = path.resolve(gptSkill, line);
    if (!target.startsWith(gptSkill + path.sep)) throw new Error(`.exclude path escapes the skill folder: ${line}`);
    fs.rmSync(target, { recursive: true, force: true });
  }
}

const TEXT = /\.(md|txt|html|js|mjs|py|json|ya?ml|css|sh)$/i;
const hits = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) return walk(p);
  if (!TEXT.test(e.name) || /^(LICENSE|CHANGELOG)/i.test(e.name)) return;
  fs.readFileSync(p, "utf8").split("\n").forEach((line, i) => {
    if (/\bClaude\b|\bAnthropic\b|\bartifacts?\b/i.test(line)) hits.push(`${path.relative(stageB, p)}:${i + 1}: ${line.trim().slice(0, 140)}`);
  });
});
walk(gptSkill);
if (hits.length && !flags.includes("--allow-claude-mentions")) {
  console.error(`ChatGPT build stopped: ${hits.length} line(s) mention Claude, Anthropic or artifacts.`);
  console.error(`Write plugins/${slug}/chatgpt/SKILL.md with neutral wording ("the model"), or fix the other files, then rerun.`);
  console.error(`Lines in example outputs or credits can stay: rerun with --allow-claude-mentions once you've checked them.\n`);
  hits.slice(0, 60).forEach((h) => console.error("  " + h));
  process.exit(2);
}
zip(stageB, path.join(dl, `${slug}-chatgpt.zip`), slug);
tgz(stageB, path.join(dl, `${slug}-chatgpt.tar.gz`), slug);

// 3. OpenAI portal upload: plugin layout with the Claude manifest, which the portal converts.
const stageC = fs.mkdtempSync(path.join(os.tmpdir(), "pkg-"));
const pc = path.join(stageC, slug);
fs.mkdirSync(path.join(pc, ".claude-plugin"), { recursive: true });
fs.copyFileSync(path.join(plugin, ".claude-plugin", "plugin.json"), path.join(pc, ".claude-plugin", "plugin.json"));
copyClean(gptSkill, path.join(pc, "skills", slug));
for (const f of ["README.md", "LICENSE"]) {
  const src = [path.join(gptSkill, f), path.join(plugin, f)].find((x) => fs.existsSync(x)); // prefer the neutral copy
  if (src) fs.copyFileSync(src, path.join(pc, f));
}
if (fs.existsSync(path.join(plugin, "assets"))) copyClean(path.join(plugin, "assets"), path.join(pc, "assets"));
zip(stageC, path.join(dist, `${slug}-chatgpt-plugin.zip`), slug);

// Checksums and a listing a stranger would see.
const files = [...fs.readdirSync(dl).map((f) => path.join(dl, f)), path.join(dist, `${slug}-chatgpt-plugin.zip`)];
fs.writeFileSync(path.join(dist, "SHA256SUMS.txt"), files.map((f) => `${crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex")}  ${path.basename(f)}`).join("\n") + "\n");
for (const f of files) console.log(`${(fs.statSync(f).size / 1024).toFixed(0).padStart(6)} KB  ${path.relative(root, f)}`);
const top = execFileSync("tar", ["-tzf", path.join(dl, `${slug}.tar.gz`)]).toString().split("\n").filter(Boolean);
if (!top.every((l) => l === `${slug}/` || l.startsWith(`${slug}/`)) || !top.includes(`${slug}/SKILL.md`)) {
  console.error(`Archive layout is wrong: expected ${slug}/SKILL.md at the top.`); process.exit(3);
}
if (hits.length) console.log(`\nNote: ${hits.length} Claude/artifact mention(s) kept in the ChatGPT build (--allow-claude-mentions).`);
for (const d of [stageA, stageB, stageC]) fs.rmSync(d, { recursive: true, force: true });

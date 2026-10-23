// Page templates for the skills site. Pure functions: (data, brand) -> HTML string.
// Text fields are escaped; fields named *Html are trusted HTML written by ship-skill.
//
// Design rules (keep them when editing):
// - Gold means "do this". Only primary actions are gold: the Copy on the install command, Add to Claude/ChatGPT,
//   the signup button. Everything else is ink, white, mist and hairlines.
// - No badges, labels or arrows as decoration. Every element has a job.
// - Section order follows the skill page layout: hero + live demo, the one idea, three examples, gallery,
//   install, prompts, questions, footer.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// Cache-busting: each asset URL carries a short hash of its contents, so a changed file gets a new URL.
const ver = (file) => createHash("sha256").update(readFileSync(new URL(`../site/assets/${file}`, import.meta.url))).digest("hex").slice(0, 8);
const cssV = ver("site.css"), jsV = ver("site.js");

export const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const isVideo = (src = "") => /\.(mp4|webm|mov)$/i.test(src);
const media = (src, alt) =>
  !src ? "" : isVideo(src)
    ? `<video src="${esc(src)}" poster="${esc(src.replace(/\.(mp4|webm|mov)$/i, ".jpg"))}" muted loop playsinline preload="none" data-autoplay aria-label="${esc(alt)}"></video>`
    : `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;

export const urls = (brand, slug) => {
  const site = brand.siteUrl.replace(/\/$/, "");
  const page = `${site}/${slug}`;
  return {
    site, page,
    zip: `${page}/dl/${slug}.zip`,
    tgz: `${page}/dl/${slug}.tar.gz`,
    gptZip: `${page}/dl/${slug}-chatgpt.zip`,
    gptTgz: `${page}/dl/${slug}-chatgpt.tar.gz`,
    repo: `https://github.com/${brand.githubOwner}/${brand.githubRepo}`,
  };
};

export const commands = (brand, slug) => {
  const u = urls(brand, slug);
  return {
    curl: `mkdir -p ~/.claude/skills && curl -fsSL ${u.tgz} | tar -xz -C ~/.claude/skills`,
    marketplace: `/plugin marketplace add ${brand.githubOwner}/${brand.githubRepo}`,
    plugin: `/plugin install ${slug}@${brand.marketplaceName}`,
    oneStep: `/plugin install ${slug} --marketplace ${brand.githubOwner}/${brand.githubRepo}`,
    codex: `mkdir -p ~/.codex/skills && curl -fsSL ${u.gptTgz} | tar -xz -C ~/.codex/skills`,
  };
};

const cmd = (text, { quiet = false } = {}) =>
  `<div class="cmd${quiet ? " quiet" : ""}"><code>${esc(text)}</code><button type="button" data-copy="${esc(text)}">Copy</button></div>`;

const ext = ' target="_blank" rel="noopener"';

export const head = ({ title, description, url, image, brand }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
${brand.icon ? `<link rel="icon" href="${esc(brand.icon)}">` : ""}
<meta name="theme-color" content="#FFFFFF">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(brand.brandName)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
${image ? `<meta property="og:image" content="${esc(image)}">
<meta name="twitter:image" content="${esc(image)}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="${esc(brand.x.handle)}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<link rel="preload" href="/assets/fonts/geist-latin-300-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/geist-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css?v=${cssV}">
<script>window.SIA=${JSON.stringify({ turnstileSiteKey: brand.turnstileSiteKey })}</script>
<script>/* show the email gate before the first paint for visitors who haven't signed up (site.js takes over) */
(function(){var m=false;try{m=localStorage.getItem("sia_member")==="1"}catch(e){}if(!m&&document.cookie.split("; ").indexOf("sia_member=1")<0)document.documentElement.classList.add("pre-gate")})()</script>
<script src="/assets/site.js?v=${jsV}" defer></script>
</head>`;

export const topbar = (brand, links = []) => `
<a class="skip" href="#main">Skip to content</a>
<header class="bar"><div class="wrap">
  <a class="brand" href="${esc(brand.homeUrl)}" aria-label="${esc(brand.brandName)}, home"><img src="${esc(brand.logo)}" alt="${esc(brand.brandName)}" width="138" height="44"></a>
  <nav aria-label="Site">${links.map((l) => `<a href="${esc(l.href)}"${l.external ? ext : ""}>${esc(l.label)}</a>`).join("")}</nav>
</div></header>`;

let formN = 0;
const signupForm = (button) => { const id = `email-${++formN}`; return `
<form class="form js-signup" novalidate>
  <label class="sr-only" for="${id}">Email address</label>
  <input id="${id}" name="email" type="email" inputmode="email" autocomplete="email" placeholder="Your email" required>
  <input class="hp" name="company" tabindex="-1" autocomplete="off" aria-hidden="true">
  <button class="btn" type="submit">${esc(button)}</button>
  <div class="ts"></div>
</form>
<p class="form-msg" role="status" aria-live="polite"></p>`; };

export const gate = (brand, skillName = "") => `
<div class="gate" id="gate" role="dialog" aria-modal="true" aria-labelledby="gate-title" aria-describedby="gate-desc" hidden>
  <div class="box">
    <img src="${esc(brand.logo)}" alt="${esc(brand.brandName)}" width="94" height="30">
    <h2 id="gate-title">Get ${skillName ? esc(skillName) : "the skills"} free</h2>
    ${signupForm(skillName ? "Get the skill" : "Get the skills")}
    <p class="fine" id="gate-desc">We'll email you when new skills ship. Unsubscribe any time. <a href="${esc(brand.privacyUrl)}">Privacy</a></p>
  </div>
</div>`;

const join = (brand) => `
<section class="band mist" id="join" aria-labelledby="join-title"><div class="wrap narrow">
  <h2 id="join-title">Get new skills when they ship</h2>
  <div data-when-guest>
    <p class="intro">You'll get one short email when a new skill or a big update is out.</p>
    ${signupForm("Sign up")}
  </div>
  <p class="intro" data-when-member hidden>You're on the list. New skills will land in your inbox.</p>
</div></section>`;

export const footer = (brand, extraHtml = "") => `
<footer class="foot"><div class="wrap">
  <img src="${esc(brand.footerMark)}" alt="${esc(brand.brandName)}" width="25" height="32">
  <nav aria-label="Elsewhere">
    <a href="${esc(brand.x.url)}"${ext}>${esc(brand.x.handle)} on X</a>
    <a href="${esc(brand.substackUrl)}"${ext}>Newsletter</a>
    <a href="https://github.com/${esc(brand.githubOwner)}/${esc(brand.githubRepo)}"${ext}>GitHub</a>
    <a href="${esc(brand.privacyUrl)}">Privacy</a>
  </nav>
  <div class="small">
    <p>Made by ${esc(brand.author)}.</p>
    ${extraHtml}
  </div>
</div></footer>`;

/* ---------- install ---------- */

const steps = (list) =>
  `<ol class="steps">${list.map((s) => `<li><h3>${esc(s.title)}</h3>${s.bodyHtml}</li>`).join("")}</ol>`;

export const install = (p, brand) => {
  const u = urls(brand, p.slug), c = commands(brand, p.slug), L = p.listings || {};
  const slashCmd = `<code class="inline">/${esc(p.slug)}</code>`;
  const ask = (how) => ({ title: `Ask for ${p.askNoun || "it"}`, bodyHtml: `<p>${how}</p>` });

  const routes = [
    { id: "claude-app", label: "Claude app", html: steps(L.claude ? [
      { title: "Add it", bodyHtml: `<p>Open ${esc(p.name)} in Claude's directory and add it to your account.</p><p><a class="btn" href="${esc(L.claude)}"${ext}>Add to Claude</a></p>` },
      { title: "Start a new chat", bodyHtml: `<p>New chats can use the skill right away.</p>` },
      ask(`Describe what you want, or start with ${slashCmd}.`),
    ] : [
      { title: "Download", bodyHtml: `<p>Get the skill as a zip. Keep it zipped.</p><p><a class="link" href="${esc(u.zip)}" download>Download ${esc(p.slug)}.zip</a></p>` },
      { title: "Upload", bodyHtml: `<p>In Claude, go to <b>Customize</b>, then <b>Skills</b>. Click <b>+</b>, then <b>Create skill</b>, then <b>Upload a skill</b>, and choose the zip.</p><p class="note">First, turn on code execution in Settings, then Capabilities.</p>` },
      ask(`Start a new chat and describe what you want, or start with ${slashCmd}.`),
    ]) },
    { id: "claude-code", label: "Claude Code", html: steps([
      { title: "Install", bodyHtml: `<p>Run this in Claude Code.</p>${cmd(c.oneStep, { quiet: true })}<p class="note">On an older Claude Code, run <code class="inline">${esc(c.marketplace)}</code>, then <code class="inline">${esc(c.plugin)}</code>.</p>` },
      { title: "Reload", bodyHtml: `<p>Run <code class="inline">/reload-plugins</code>, or restart Claude Code.</p>` },
      ask(`Describe what you want, or start with ${slashCmd}.`),
    ]) },
    { id: "chatgpt", label: "ChatGPT", html: steps(L.chatgpt ? [
      { title: "Add it", bodyHtml: `<p>Open ${esc(p.name)} in ChatGPT's plugin directory and add it.</p><p><a class="btn" href="${esc(L.chatgpt)}"${ext}>Add to ChatGPT</a></p>` },
      { title: "Start a new chat", bodyHtml: `<p>Skills need a ChatGPT plan that includes them.</p>` },
      ask(`Describe what you want, or mention <code class="inline">@${esc(p.slug)}</code>.`),
    ] : [
      { title: "Download", bodyHtml: `<p>Get the ChatGPT version as a zip. Keep it zipped.</p><p><a class="link" href="${esc(u.gptZip)}" download>Download ${esc(p.slug)}-chatgpt.zip</a></p>` },
      { title: "Upload", bodyHtml: `<p>In ChatGPT, open <b>Skills</b>, choose <b>New skill</b>, then upload the zip from your computer.</p><p class="note">Skills need a ChatGPT plan that includes them.</p>` },
      ask(`Start a new chat and describe what you want, or mention <code class="inline">@${esc(p.slug)}</code>.`),
    ]) },
    { id: "codex", label: "Codex", html: steps([
      { title: "Install", bodyHtml: `<p>Paste this in your terminal.</p>${cmd(c.codex, { quiet: true })}` },
      { title: "Restart Codex", bodyHtml: `<p>Quit and reopen the Codex app, CLI or IDE extension.</p>` },
      ask(`Describe what you want, or start with <code class="inline">$${esc(p.slug)}</code>.`),
    ]) },
    { id: "manual", label: "Manual", html: steps([
      { title: "Download", bodyHtml: `<p><a class="link" href="${esc(u.zip)}" download>Download ${esc(p.slug)}.zip</a></p>` },
      { title: "Move the folder", bodyHtml: `<p>Unzip it and move the <code class="inline">${esc(p.slug)}</code> folder into <code class="inline">~/.claude/skills/</code>. On Windows: <code class="inline">%USERPROFILE%\\.claude\\skills\\</code>.</p>` },
      ask(`Restart Claude Code, then describe what you want or start with ${slashCmd}.`),
    ]) },
  ];

  return `
<div class="seg" role="tablist" aria-label="Where you use AI">
  ${routes.map((r, i) => `<button type="button" role="tab" id="tab-${r.id}" aria-controls="panel-${r.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(r.label)}</button>`).join("")}
</div>
${routes.map((r, i) => `<div class="panel" role="tabpanel" id="panel-${r.id}" aria-labelledby="tab-${r.id}" tabindex="0"${i ? " hidden" : ""}>${r.html}</div>`).join("")}`;
};

/* ---------- skill page ---------- */

const tile = (t, { ratio = "wide" } = {}) =>
  `<a class="tile ${ratio}" href="${esc(t.href)}"${ext}><span class="frame">${media(t.media, t.title)}</span><span class="title">${esc(t.title)}</span></a>`;

export const landing = (p, brand) => {
  const u = urls(brand, p.slug), c = commands(brand, p.slug), L = p.listings || {};
  const title = `${p.name}: ${p.tagline.split(".")[0]} · ${brand.brandName}`;
  const listed = L.claude || L.chatgpt;

  return `${head({ title, description: p.metaDescription || p.tagline, url: u.page, image: p.ogImage ? u.site + p.ogImage : "", brand })}
<body data-gated="true" data-skill="${esc(p.slug)}">
${topbar(brand, [{ label: "All skills", href: "/" }, { label: brand.author, href: brand.authorUrl, external: true }])}
<main id="main" tabindex="-1">

<section class="hero"><div class="wrap">
  <h1>${esc(p.name)}</h1>
  <p class="lede">${esc(p.tagline)}</p>
  ${listed ? `<div class="btns">
    ${L.claude ? `<a class="btn" href="${esc(L.claude)}"${ext}>Add to Claude</a>` : ""}
    ${L.chatgpt ? `<a class="btn" href="${esc(L.chatgpt)}"${ext}>Add to ChatGPT</a>` : ""}
  </div>` : ""}
  ${cmd(c.curl, { quiet: !!listed })}
  <p class="meta">Paste in Terminal for Claude Code. <a href="#install">Other ways to install</a> <span aria-hidden="true">·</span> <a href="${esc(u.zip)}" download>Download .zip</a></p>
</div>
${p.demo ? `<div class="wrap"><figure class="demo">
  <div class="screen">${isVideo(p.demo.src) ? media(p.demo.src, p.demo.caption) : `<iframe src="${esc(p.demo.src)}" title="${esc(p.demo.caption || p.name + " demo")}"></iframe>`}</div>
  <figcaption><span>${esc(p.demo.caption || "")}</span>${p.demo.liveUrl ? `<a href="${esc(p.demo.liveUrl)}"${ext}>${esc(p.demo.liveLabel || "Try it live")}</a>` : ""}</figcaption>
</figure></div>` : ""}
</section>

${p.feature ? `<section class="band mist idea"><div class="wrap split">
  <h2>${esc(p.feature.title)}</h2>
  <p>${esc(p.feature.text)}</p>
</div></section>` : ""}

${p.examples?.length ? `<section class="band" aria-labelledby="ex-title"><div class="wrap">
  <h2 id="ex-title">${esc(p.examplesIntro?.title || "One sentence in. A finished result out.")}</h2>
  <p class="intro">${esc(p.examplesIntro?.text || "Each one came from the prompt above it.")}</p>
  <div class="examples">
  ${p.examples.map((e) => `<figure class="example"><blockquote>${esc(e.prompt)}</blockquote>${tile(e)}</figure>`).join("")}
  </div>
</div></section>` : ""}

${p.gallery?.items?.length ? `<section class="band cont" aria-labelledby="gal-title"><div class="wrap">
  <h2 id="gal-title">${esc(p.gallery.title || `More made with ${p.name}`)}</h2>
  ${p.gallery.text ? `<p class="intro">${esc(p.gallery.text)}</p>` : ""}
  <div class="gallery" style="--n:${Math.min(p.gallery.items.length, 5)}">${p.gallery.items.map((g) => tile(g, { ratio: "square" })).join("")}</div>
</div></section>` : ""}

<section class="band mist" id="install" aria-labelledby="in-title"><div class="wrap">
  <h2 id="in-title">Install in a minute</h2>
  <p class="intro">Pick where you use AI.</p>
  ${install(p, brand)}
</div></section>

${p.prompts?.length ? `<section class="band" aria-labelledby="pr-title"><div class="wrap narrow">
  <h2 id="pr-title">Try these prompts</h2>
  <p class="intro">Copy one, paste it into your AI, and open what it makes.</p>
  <ul class="prompts">${p.prompts.map((t) => `<li><span>${esc(t)}</span><button class="copy" type="button" data-copy="${esc(t)}" aria-label="Copy prompt: ${esc(t)}">Copy</button></li>`).join("")}</ul>
</div></section>` : ""}

${p.faq?.length ? `<section class="band mist" aria-labelledby="faq-title"><div class="wrap narrow">
  <h2 id="faq-title">Questions</h2>
  <div class="faq">${p.faq.map((f) => `<details><summary>${esc(f.q)}</summary><div class="a">${f.aHtml}</div></details>`).join("")}</div>
</div></section>` : ""}
</main>
${footer(brand, `${p.creditsHtml ? `<p>${p.creditsHtml}</p>` : ""}<p>${esc(p.name)} is ${esc(p.license || "MIT")} licensed.</p>`)}
${gate(brand, p.name)}
<noscript><style>.gate{display:none!important}</style></noscript>
</body></html>
`;
};

/* ---------- hub index ---------- */

export const hub = (pages, brand) => `${head({ title: `Skills · ${brand.brandName}`, description: `Free skills for Claude and ChatGPT by ${brand.author}.`, url: brand.siteUrl, image: "", brand })}
<body data-gated="true" data-skill="hub">
${topbar(brand, [{ label: brand.author, href: brand.authorUrl, external: true }])}
<main id="main" tabindex="-1">
<section class="hero"><div class="wrap">
  <h1>Skills</h1>
  <p class="lede">Each skill teaches Claude or ChatGPT to do one job well. Install it once and use it in any chat.</p>
  ${cmd(commands(brand, "").marketplace)}
  <p class="meta">Run this in Claude Code to get every skill here and each new one.</p>
</div></section>
<section class="band tight"><div class="wrap">
  <div class="cards">
  ${pages.map((p) => `<a class="tile wide card" href="/${esc(p.slug)}"><span class="frame">${media(p.cardMedia || p.examples?.[0]?.media, p.name)}</span><span class="title">${esc(p.name)}</span><span class="desc">${esc(p.tagline)}</span></a>`).join("")}
  </div>
</div></section>
${join(brand)}
</main>
${footer(brand)}
${gate(brand)}
<noscript><style>.gate{display:none!important}</style></noscript>
</body></html>
`;

export const privacy = (brand) => `${head({ title: `Privacy · ${brand.brandName}`, description: "What happens to your email when you sign up.", url: `${brand.siteUrl}/privacy`, image: "", brand })}
<body data-gated="false">
${topbar(brand, [{ label: "All skills", href: "/" }])}
<main id="main" class="band"><div class="wrap narrow prose">
  <h1 class="page-title">Privacy</h1>
  <p class="lede">We only use your email to send you the skills and updates you signed up for.</p>
  <h3>What we keep</h3>
  <p>We keep your email address and the skill page you signed up on. Cloudflare Turnstile checks each signup to stop bots.</p>
  <h3>Where it's kept</h3>
  <p>Your email is stored with our email provider, Resend. We use it only to send emails from ${esc(brand.author)}, and we never sell or share it.</p>
  <h3>Leaving</h3>
  <p>Every email has an unsubscribe link. To have your address deleted, reply to any email and ask.</p>
  <h3>On this site</h3>
  <p>Your browser remembers that you signed up, so the site doesn't ask again. The site has no ads and no tracking scripts.</p>
</div></main>
${footer(brand)}
</body></html>
`;

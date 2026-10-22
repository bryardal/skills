// Page templates for the skills site. Pure functions: (data, brand) -> HTML string.
// Text fields are escaped; fields named *Html are trusted HTML written by ship-skill.

export const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const isVideo = (src = "") => /\.(mp4|webm|mov)$/i.test(src);
const media = (src, alt) =>
  !src ? "" : isVideo(src)
    ? `<video src="${esc(src)}" muted loop playsinline preload="metadata" aria-label="${esc(alt)}"></video>`
    : `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy">`;

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

const cmd = (text, label = "Copy") =>
  `<div class="cmd"><code>${esc(text)}</code><button type="button" data-copy="${esc(text)}">${label}</button></div>`;

export const head = ({ title, description, url, image, brand }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
${brand.icon ? `<link rel="icon" href="${esc(brand.icon)}">` : ""}
<meta property="og:type" content="website">
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
<link rel="stylesheet" href="/assets/site.css">
<script>window.SIA=${JSON.stringify({ turnstileSiteKey: brand.turnstileSiteKey })}</script>
<script src="/assets/site.js" defer></script>
</head>`;

export const topbar = (brand, links = []) => `
<header class="bar"><div class="wrap">
  <a class="brand" href="/"><img src="${esc(brand.logo)}" alt="${esc(brand.brandName)} ${esc(brand.byline)}"></a>
  <nav aria-label="Site">${links.map((l) => `<a href="${esc(l.href)}"${l.external ? ' target="_blank" rel="noopener"' : ""}>${esc(l.label)}${l.external ? " ↗" : ""}</a>`).join("")}</nav>
</div></header>`;

let formN = 0;
const signupForm = (button) => { const id = `email-${++formN}`; return `
<form class="form js-signup" novalidate>
  <label class="sr-only" for="${id}">Email address</label>
  <input id="${id}" name="email" type="email" autocomplete="email" placeholder="you@example.com" required>
  <input class="hp" name="company" tabindex="-1" autocomplete="off" aria-hidden="true">
  <button class="btn" type="submit">${esc(button)}</button>
  <div class="ts"></div>
</form>
<p class="form-msg" role="status" aria-live="polite"></p>`; };

export const gate = (brand, skillName) => `
<div class="gate" id="gate" role="dialog" aria-modal="true" aria-labelledby="gate-title" hidden>
  <div class="box">
    <img src="${esc(brand.logoDark)}" alt="${esc(brand.brandName)}">
    <h2 id="gate-title">Get ${esc(skillName)} free</h2>
    <p>Enter your email to unlock the install steps and examples. You'll also hear when new skills ship.</p>
    ${signupForm(`Unlock ${skillName}`)}
    <p class="fine">Already signed up? Enter the same email. Unsubscribe any time. <a href="${esc(brand.privacyUrl)}">Privacy</a></p>
  </div>
</div>`;

export const join = (brand) => `
<section class="band dark join" id="join"><div class="wrap">
  <span class="badge">Free</span>
  <h2>Get new skills when they ship</h2>
  <div data-when-guest>
    <p class="muted prose">One email when a new skill or a big update is out. Unsubscribe any time.</p>
    ${signupForm("Get new skills")}
  </div>
  <p class="muted" data-when-member hidden>You're on the list. New skills land in your inbox.</p>
  <p class="muted" style="margin-top:18px">Follow <a href="${esc(brand.x.url)}" target="_blank" rel="noopener">${esc(brand.x.handle)} on X</a> or read the <a href="${esc(brand.substackUrl)}" target="_blank" rel="noopener">newsletter</a>.</p>
</div></section>`;

export const footer = (brand, extraHtml = "") => `
<footer class="band dark"><div class="wrap">
  <img src="${esc(brand.logoDark)}" alt="${esc(brand.brandName)} ${esc(brand.byline)}">
  <p>Made by ${esc(brand.author)} · <a href="${esc(brand.x.url)}" target="_blank" rel="noopener">${esc(brand.x.handle)}</a> · <a href="${esc(brand.substackUrl)}" target="_blank" rel="noopener">Newsletter</a> · <a href="${esc(brand.privacyUrl)}">Privacy</a></p>
  ${extraHtml}
</div></footer>`;

/* ---------- skill landing page ---------- */

const installSteps = (steps) =>
  `<ol class="steps">${steps.map((s, i) => `<li class="card"><span class="n" aria-hidden="true">${i + 1}</span><h3>${esc(s.title)}</h3>${s.bodyHtml}</li>`).join("")}</ol>`;

const tabset = (id, tabs, cls = "") => `
<div class="tabs ${cls}" role="tablist" aria-label="${esc(id)}">
  ${tabs.map((t, i) => `<button type="button" role="tab" id="tab-${t.id}" aria-controls="panel-${t.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(t.label)}</button>`).join("")}
</div>
${tabs.map((t, i) => `<div class="panel" role="tabpanel" id="panel-${t.id}" aria-labelledby="tab-${t.id}"${i ? " hidden" : ""}>${t.html}</div>`).join("")}`;

export const install = (p, brand) => {
  const u = urls(brand, p.slug), c = commands(brand, p.slug), L = p.listings || {};
  const ask = (how) => ({ title: `Ask for ${p.askNoun || "it"}`, bodyHtml: `<p>${how}</p>` });

  const claudeApp = installSteps(L.claude ? [
    { title: "Open the listing", bodyHtml: `<p>Open ${esc(p.name)} in Claude's directory and add it to your account.</p><p><a class="btn" href="${esc(L.claude)}" target="_blank" rel="noopener">Add to Claude</a></p>` },
    { title: "Start a new chat", bodyHtml: `<p>New chats can use the skill straight away.</p>` },
    ask(`Describe what you want in plain words, or start with <code class="inline">/${esc(p.slug)}</code>.`),
  ] : [
    { title: "Download", bodyHtml: `<p>Get the skill as a zip. Don't unzip it.</p><p><a class="btn ghost" href="${esc(u.zip)}">${esc(p.slug)}.zip</a></p>` },
    { title: "Upload", bodyHtml: `<p>In Claude, go to <b>Customize</b> → <b>Skills</b>, click <b>+</b> → <b>Create skill</b> → <b>Upload a skill</b> and pick the zip. Turn on <b>Code execution</b> in Settings → Capabilities first.</p>` },
    ask(`Start a new chat and describe what you want, or start with <code class="inline">/${esc(p.slug)}</code>.`),
  ]);

  const claudeCode = installSteps([
    { title: "Add the plugin", bodyHtml: `<p>In Claude Code, run:</p>${cmd(c.oneStep)}<p class="muted" style="margin-top:10px;font-size:14px">On an older Claude Code, run <code class="inline">${esc(c.marketplace)}</code> first, then <code class="inline">${esc(c.plugin)}</code>.</p>` },
    { title: "Reload", bodyHtml: `<p>Run <code class="inline">/reload-plugins</code> or restart Claude Code so it picks up the skill.</p>` },
    ask(`Describe what you want in plain words, or start with <code class="inline">/${esc(p.slug)}</code>.`),
  ]);

  const claudeManual = installSteps([
    { title: "Download", bodyHtml: `<p><a class="btn ghost" href="${esc(u.zip)}">${esc(p.slug)}.zip</a></p>` },
    { title: "Move the folder", bodyHtml: `<p>Unzip it and move the <code class="inline">${esc(p.slug)}</code> folder into <code class="inline">~/.claude/skills/</code> (on Windows, <code class="inline">%USERPROFILE%\\.claude\\skills\\</code>).</p>` },
    ask(`Restart Claude Code, then describe what you want or start with <code class="inline">/${esc(p.slug)}</code>.`),
  ]);

  const gptApp = installSteps(L.chatgpt ? [
    { title: "Open the listing", bodyHtml: `<p>Open ${esc(p.name)} in ChatGPT's plugin directory and add it.</p><p><a class="btn" href="${esc(L.chatgpt)}" target="_blank" rel="noopener">Add to ChatGPT</a></p>` },
    { title: "Start a new chat", bodyHtml: `<p>Skills need a ChatGPT plan that includes them.</p>` },
    ask(`Describe what you want, or mention <code class="inline">@${esc(p.slug)}</code>.`),
  ] : [
    { title: "Download", bodyHtml: `<p>Get the ChatGPT version as a zip. Don't unzip it.</p><p><a class="btn ghost" href="${esc(u.gptZip)}">${esc(p.slug)}-chatgpt.zip</a></p>` },
    { title: "Upload", bodyHtml: `<p>In ChatGPT, open <b>Skills</b>, choose <b>New skill</b>, then upload from your computer and pick the zip. Skills need a plan that includes them.</p>` },
    ask(`Start a new chat and describe what you want, or mention <code class="inline">@${esc(p.slug)}</code>.`),
  ]);

  const codex = installSteps([
    { title: "Install", bodyHtml: `<p>Paste this in your terminal.</p>${cmd(c.codex)}` },
    { title: "Restart Codex", bodyHtml: `<p>Quit and reopen the Codex app, CLI or IDE extension.</p>` },
    ask(`Describe what you want, or start with <code class="inline">$${esc(p.slug)}</code>.`),
  ]);

  return tabset("Choose your AI", [
    { id: "claude", label: "Claude", html: tabset("Claude apps", [
      { id: "claude-app", label: "Claude app", html: claudeApp },
      { id: "claude-code", label: "Claude Code", html: claudeCode },
      { id: "claude-zip", label: "Manual (.zip)", html: claudeManual },
    ], "sub") },
    { id: "chatgpt", label: "ChatGPT", html: tabset("ChatGPT apps", [
      { id: "gpt-app", label: "ChatGPT app", html: gptApp },
      { id: "gpt-codex", label: "Codex", html: codex },
    ], "sub") },
  ]);
};

export const landing = (p, brand) => {
  const u = urls(brand, p.slug), c = commands(brand, p.slug), L = p.listings || {};
  const title = `${p.name} · ${brand.brandName}`;
  const listingBtns = (L.claude || L.chatgpt) ? `<div class="btns listing-btns">
      ${L.claude ? `<a class="btn" href="${esc(L.claude)}" target="_blank" rel="noopener">Add to Claude</a>` : ""}
      ${L.chatgpt ? `<a class="btn" href="${esc(L.chatgpt)}" target="_blank" rel="noopener">Add to ChatGPT</a>` : ""}
    </div>` : "";

  return `${head({ title, description: p.metaDescription || p.tagline, url: u.page, image: p.ogImage ? u.site + p.ogImage : "", brand })}
<body data-gated="true" data-skill="${esc(p.slug)}">
${topbar(brand, [
  ...(p.demo?.liveUrl ? [{ label: "Live demo", href: p.demo.liveUrl, external: true }] : []),
  { label: "All skills", href: "/" },
  { label: `Made by ${brand.author}`, href: brand.authorUrl, external: true },
])}
<main id="main" tabindex="-1">
<section class="hero"><div class="wrap">
  <span class="badge">Free skill for Claude and ChatGPT</span>
  <h1>${esc(p.name)}</h1>
  <p class="lede">${esc(p.tagline)}</p>
  ${listingBtns}
  ${cmd(c.curl)}
  <p class="cmd-note muted">Paste in Terminal for Claude Code. Using the Claude app, ChatGPT or Windows? <a href="#install">Other ways to install</a>.</p>
  <div class="btns">
    <a class="btn ghost" href="${esc(u.zip)}">Download skill (.zip)</a>
    ${p.gallery?.more ? `<a class="btn ghost" href="${esc(p.gallery.more.href)}">${esc(p.gallery.more.label)}</a>` : ""}
  </div>
  ${p.demo ? `<div class="demo">${isVideo(p.demo.src) ? media(p.demo.src, p.demo.caption) : `<iframe src="${esc(p.demo.src)}" title="${esc(p.demo.caption || p.name + " demo")}"></iframe>`}</div>
  ${p.demo.caption ? `<p class="demo-cap muted">${esc(p.demo.caption)}</p>` : ""}` : ""}
</div></section>

${p.feature ? `<section class="band dark"><div class="wrap">
  ${p.feature.badge ? `<span class="badge">${esc(p.feature.badge)}</span>` : ""}
  <h2>${esc(p.feature.title)}</h2>
  <p class="muted prose">${esc(p.feature.text)}</p>
  ${p.feature.link ? `<p><a class="btn ghost" href="${esc(p.feature.link.href)}">${esc(p.feature.link.label)}</a></p>` : ""}
</div></section>` : ""}

${p.examples?.length ? `<section class="band mist"><div class="wrap">
  <h2>${esc(p.examplesIntro?.title || "One sentence in, a finished result out")}</h2>
  <p class="muted prose">${esc(p.examplesIntro?.text || "Each of these came from the prompt beside it, in a fresh install of the skill.")}</p>
  <div class="pairs">
  ${p.examples.map((e) => `<div class="pair">
    <p class="you"><small>You</small><br>${esc(e.prompt)}</p>
    <a class="card" href="${esc(e.href)}" target="_blank" rel="noopener"><div class="media">${media(e.media, e.title)}</div><div class="cap"><span>${esc(e.title)}</span><span class="go">Open ↗</span></div></a>
  </div>`).join("")}
  </div>
</div></section>` : ""}

${p.gallery?.items?.length ? `<section class="band"><div class="wrap">
  <h2>${esc(p.gallery.title || `More made with ${p.name}`)}</h2>
  ${p.gallery.text ? `<p class="muted prose">${esc(p.gallery.text)}</p>` : ""}
  <div class="grid" style="--cols:${[5,6].includes(p.gallery.items.length) ? (p.gallery.items.length===6?3:5) : 4}">
  ${p.gallery.items.map((g) => `<a class="card" href="${esc(g.href)}" target="_blank" rel="noopener"><div class="media">${media(g.media, g.title)}</div><div class="cap"><span>${esc(g.title)}</span><span class="go">Open ↗</span></div></a>`).join("")}
  </div>
  ${p.gallery.more ? `<p class="more"><a class="btn ghost" href="${esc(p.gallery.more.href)}">${esc(p.gallery.more.label)}</a></p>` : ""}
</div></section>` : ""}

<section class="band mist" id="install"><div class="wrap">
  <h2>How to install</h2>
  <p class="muted prose">Pick your AI. Three steps, about a minute.</p>
  ${install(p, brand)}
</div></section>

${p.prompts?.length ? `<section class="band"><div class="wrap">
  <h2>Try these prompts</h2>
  <p class="muted prose">Copy one, paste it into your AI and open what it makes.</p>
  <ul class="prompts">${p.prompts.map((t) => `<li class="card"><span>${esc(t)}</span><button class="copy" type="button" data-copy="${esc(t)}">Copy</button></li>`).join("")}</ul>
</div></section>` : ""}

${join(brand)}

${p.faq?.length ? `<section class="band"><div class="wrap">
  <h2>Questions</h2>
  <div class="faq">${p.faq.map((f) => `<details><summary>${esc(f.q)}</summary><div class="a">${f.aHtml}</div></details>`).join("")}</div>
</div></section>` : ""}
</main>
${footer(brand, `${p.creditsHtml ? `<p class="muted">${p.creditsHtml}</p>` : ""}<p class="muted">${esc(p.name)} is ${esc(p.license || "MIT")} licensed. Source on <a href="${esc(u.repo)}" target="_blank" rel="noopener">GitHub</a>.</p>`)}
${gate(brand, p.name)}
<noscript><style>.gate{display:none!important}</style></noscript>
</body></html>
`;
};

/* ---------- hub index ---------- */

export const hub = (pages, brand) => `${head({ title: `Skills · ${brand.brandName}`, description: `Free skills for Claude and ChatGPT by ${brand.author}.`, url: brand.siteUrl, image: "", brand })}
<body data-gated="false" data-skill="hub">
${topbar(brand, [{ label: "GitHub", href: `https://github.com/${brand.githubOwner}/${brand.githubRepo}`, external: true }, { label: `Made by ${brand.author}`, href: brand.authorUrl, external: true }])}
<main id="main" tabindex="-1">
<section class="hero"><div class="wrap">
  <span class="badge">Free</span>
  <h1>Skills</h1>
  <p class="lede">Skills that teach Claude and ChatGPT to do one job well. Install once, use them in any chat.</p>
  ${cmd(commands(brand, "").marketplace)}
  <p class="cmd-note muted">Run in Claude Code to get every skill here, plus new ones as they ship.</p>
  <div class="cards">
  ${pages.map((p) => `<a class="card" href="/${esc(p.slug)}"><div class="media">${media(p.cardMedia || p.examples?.[0]?.media, p.name)}</div><div class="body"><h3>${esc(p.name)}</h3><p>${esc(p.tagline)}</p></div></a>`).join("")}
  </div>
</div></section>
</main>
${join(brand)}
${footer(brand)}
</body></html>
`;

export const privacy = (brand) => `${head({ title: `Privacy · ${brand.brandName}`, description: "What happens to your email when you sign up.", url: `${brand.siteUrl}/privacy`, image: "", brand })}
<body data-gated="false">
${topbar(brand, [{ label: "All skills", href: "/" }])}
<main id="main" class="band"><div class="wrap prose">
  <h1 style="font-size:clamp(44px,7vw,72px)">Privacy</h1>
  <p class="lede">Your email is used to send you the skills and updates you signed up for. Nothing else.</p>
  <h3>What we collect</h3>
  <p>Your email address and which skill page you signed up from. Signups go through a bot check by Cloudflare Turnstile.</p>
  <h3>Where it's kept</h3>
  <p>Emails are stored with our email provider, Resend, and used only to send messages from ${esc(brand.author)}. They are never sold or shared.</p>
  <h3>Leaving</h3>
  <p>Every email has an unsubscribe link. To have your address deleted, reply to any email and ask.</p>
  <h3>On this site</h3>
  <p>The site remembers that you signed up, in your browser, so it doesn't ask again. There are no ads or tracking scripts.</p>
</div></main>
${footer(brand)}
</body></html>
`;

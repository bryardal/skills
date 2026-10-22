// Shared helpers for the signup functions: Resend calls, the welcome email, unsubscribe links.
import crypto from "node:crypto";
import { brand, skills } from "./data.mjs";

const API = "https://api.resend.com";

export const env = (name, required = true) => {
  const v = process.env[name];
  if (required && !v) throw new Error(`Missing environment variable ${name}`);
  return v || "";
};

export async function resend(method, path, body, headers = {}) {
  const r = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

export const isEmail = (s) => typeof s === "string" && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

export const unsubToken = (email) =>
  crypto.createHmac("sha256", env("UNSUB_SECRET")).update(email.toLowerCase()).digest("base64url").slice(0, 32);

export const unsubUrl = (email) =>
  `${brand.siteUrl}/api/unsubscribe?e=${encodeURIComponent(email)}&t=${unsubToken(email)}`;

export const safeEqual = (a = "", b = "") => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const esc = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function welcomeEmail(email, slug) {
  const s = skills[slug];
  const unsub = unsubUrl(email);
  const subject = s ? `Your copy of ${s.name}` : `You're on the ${brand.brandName} list`;
  const link = s ? s.url + "#install" : brand.siteUrl;
  const html = `<!doctype html><html><body style="margin:0;background:#EDEDED;font-family:Helvetica,Arial,sans-serif;color:#151A1A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#FFFFFF;border:1px solid #F2C14E;border-radius:16px">
<tr><td style="padding:36px 36px 8px;font-size:15px;color:#151A1A"><b>${esc(brand.brandName)}</b> <span style="opacity:.6">${esc(brand.byline)}</span></td></tr>
<tr><td style="padding:8px 36px 0;font-size:30px;line-height:1.15;letter-spacing:-1px">${s ? `Here's ${esc(s.name)}` : "You're in"}</td></tr>
<tr><td style="padding:16px 36px 0;font-size:16px;line-height:1.6">
${s ? `<p style="margin:0 0 14px">${esc(s.tagline)}</p>
<p style="margin:0 0 22px">Install steps for Claude and ChatGPT are on the page. It takes about a minute.</p>` : `<p style="margin:0 0 22px">Thanks for signing up. You'll get an email when a new skill or a big update ships.</p>`}
<a href="${esc(link)}" style="display:inline-block;background:#F2C14E;color:#151A1A;text-decoration:none;padding:13px 24px;border-radius:999px;font-weight:bold">${s ? `Install ${esc(s.name)}` : "See all skills"}</a>
${s && s.firstPrompt ? `<p style="margin:26px 0 6px;opacity:.7;font-size:14px">A first prompt to try:</p><p style="margin:0;padding:14px 16px;background:#EDEDED;border-radius:10px">${esc(s.firstPrompt)}</p>` : ""}
<p style="margin:26px 0 0">${esc(brand.author)}</p>
</td></tr>
<tr><td style="padding:28px 36px 32px;font-size:12.5px;line-height:1.5;color:#151A1A;opacity:.6">You're getting this because you signed up at ${esc(brand.siteUrl.replace(/^https?:\/\//, ""))}. <a href="${esc(unsub)}" style="color:#151A1A">Unsubscribe</a></td></tr>
</table></td></tr></table></body></html>`;
  const text = `${s ? `Here's ${s.name}\n\n${s.tagline}\n\nInstall it: ${link}` : `You're in. You'll get an email when a new skill ships.\n\n${link}`}\n\n${brand.author}\n\nUnsubscribe: ${unsub}`;
  return { subject, html, text, unsub };
}

export async function sendWelcome(email, slug) {
  const { subject, html, text, unsub } = welcomeEmail(email, slug);
  const from = `${brand.email.fromName} <${brand.email.fromAddress}>`;
  const key = "welcome-" + crypto.createHash("sha256").update(email.toLowerCase() + slug).digest("hex").slice(0, 40);
  return resend("POST", "/emails", {
    from, to: email, subject, html, text,
    reply_to: brand.email.replyTo,
    headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    tags: [{ name: "type", value: "welcome" }, { name: "skill", value: slug.replace(/[^a-zA-Z0-9_-]/g, "") || "hub" }],
  }, { "Idempotency-Key": key });
}

// Over the daily or rate limit: Resend answers 429.
export const overLimit = (r) => r.status === 429 || /quota|rate.?limit|daily/i.test(JSON.stringify(r.data));

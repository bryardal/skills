// GET  /api/unsubscribe?e=<email>&t=<token>   link in every email: shows a confirmation page
// POST /api/unsubscribe?e=<email>&t=<token>   one-click unsubscribe from mail apps (RFC 8058)
import { resend, unsubToken, safeEqual, isEmail } from "./_lib/mail.mjs";
import { brand } from "./_lib/data.mjs";

const page = (title, text) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · ${brand.brandName}</title><link rel="stylesheet" href="/assets/site.css"></head>
<body><main class="band"><div class="wrap prose"><h1 style="font-size:clamp(44px,8vw,80px)">${title}</h1><p class="lede">${text}</p>
<p><a class="btn ghost" href="/">Back to skills</a></p></div></main></body></html>`;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const email = String(req.query?.e || "").trim().toLowerCase();
  const token = String(req.query?.t || "");
  if (!isEmail(email) || !safeEqual(token, unsubToken(email))) {
    res.status(400).setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(page("Link not valid", "This unsubscribe link is incomplete or has been changed. Use the link from your most recent email, or reply to it and ask to be removed."));
  }
  const r = await resend("PATCH", `/contacts/${encodeURIComponent(email)}`, { unsubscribed: true });
  if (req.method === "POST") return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
  res.status(r.ok ? 200 : 502).setHeader("Content-Type", "text/html; charset=utf-8");
  return res.send(r.ok
    ? page("You're unsubscribed", `${email} won't get emails from ${brand.brandName} anymore. The skills you installed keep working.`)
    : page("That didn't work", "Your address couldn't be removed just now. Try the link again in a few minutes, or reply to any email and ask to be removed."));
}

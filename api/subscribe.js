// POST /api/subscribe  { email, skill, token, company }
// Checks the bot test, saves the contact in Resend (tagged with the skill page), sends the welcome email.
// If the daily email limit is hit, the person is still saved and put on the "welcome pending" list,
// which /api/cron-welcome works through the next day.
import { resend, sendWelcome, overLimit, isEmail, env } from "./_lib/mail.mjs";
import { skills } from "./_lib/data.mjs";

async function humanCheck(token, ip) {
  const secret = env("TURNSTILE_SECRET_KEY", false);
  if (!secret) return true; // not configured yet (local testing)
  if (!token) return false;
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
  });
  const d = await r.json().catch(() => ({}));
  return d.success === true;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Use POST." });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const email = String(body?.email || "").trim().toLowerCase();
  const slug = skills[body?.skill] ? body.skill : "hub";

  if (body?.company) return res.status(200).json({ ok: true }); // honeypot filled: quietly ignore
  if (!isEmail(email)) return res.status(400).json({ ok: false, error: "Enter a full email address, like you@example.com." });

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  if (!(await humanCheck(body?.token, ip)))
    return res.status(400).json({ ok: false, error: "The bot check didn't pass. Wait a second and try again." });

  try {
    const all = env("RESEND_SEGMENT_ALL", false);
    const created = await resend("POST", "/contacts", {
      email, unsubscribed: false,
      properties: { source_skill: slug },
      ...(all ? { segments: [{ id: all }] } : {}),
    });

    if (!created.ok) {
      const exists = created.status === 409 || /exist/i.test(JSON.stringify(created.data));
      if (!exists) {
        console.error("contact create failed", created.status, created.data);
        return res.status(502).json({ ok: false, error: "Signup didn't go through. Try again in a minute." });
      }
      // Signing up again is a fresh opt-in: make sure they're subscribed. No second welcome email.
      await resend("PATCH", `/contacts/${encodeURIComponent(email)}`, { unsubscribed: false });
      return res.status(200).json({ ok: true, message: "Welcome back. You're unlocked." });
    }

    const sent = await sendWelcome(email, slug);
    if (!sent.ok) {
      const pending = env("RESEND_SEGMENT_PENDING", false);
      if (overLimit(sent) && pending) await resend("POST", `/contacts/${encodeURIComponent(email)}/segments/${pending}`);
      console.error("welcome email not sent", sent.status, sent.data);
      return res.status(200).json({ ok: true, message: "You're in. Your welcome email is on its way shortly." });
    }
    return res.status(200).json({ ok: true, message: "You're in. Check your inbox for the welcome email." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "Signup didn't go through. Try again in a minute." });
  }
}

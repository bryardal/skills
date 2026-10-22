// Runs once a day (see vercel.json). Sends welcome emails that missed the daily limit,
// oldest first, and takes each person off the "welcome pending" list once it's sent.
import { resend, sendWelcome, overLimit, env } from "./_lib/mail.mjs";

const BATCH = 90; // stay under Resend's free daily limit of 100

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${env("CRON_SECRET")}`) return res.status(401).end();
  const pending = env("RESEND_SEGMENT_PENDING", false);
  if (!pending) return res.status(200).json({ ok: true, sent: 0, note: "RESEND_SEGMENT_PENDING not set" });

  const list = await resend("GET", `/contacts?segment_id=${pending}&limit=100`);
  if (!list.ok) return res.status(502).json({ ok: false, error: list.data });

  let sent = 0;
  for (const c of (list.data.data || []).filter((c) => !c.unsubscribed).slice(0, BATCH)) {
    const full = await resend("GET", `/contacts/${encodeURIComponent(c.email)}`);
    const slug = full.data?.properties?.source_skill?.value ?? full.data?.properties?.source_skill ?? "hub";
    const r = await sendWelcome(c.email, typeof slug === "string" ? slug : "hub");
    if (!r.ok) { if (overLimit(r)) break; continue; }
    await resend("DELETE", `/contacts/${encodeURIComponent(c.email)}/segments/${pending}`);
    sent++;
  }
  return res.status(200).json({ ok: true, sent, waiting: Math.max(0, (list.data.data || []).length - sent) });
}

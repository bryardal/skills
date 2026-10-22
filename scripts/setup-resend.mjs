#!/usr/bin/env node
// One-time Resend setup. Run on your own machine:
//   RESEND_API_KEY=re_xxx node scripts/setup-resend.mjs
// Creates the "source_skill" contact property and two segments, then prints the IDs to put in Vercel.
const key = process.env.RESEND_API_KEY;
if (!key) { console.error("Set RESEND_API_KEY first."); process.exit(1); }
const call = async (method, path, body) => {
  const r = await fetch("https://api.resend.com" + path, { method, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: body && JSON.stringify(body) });
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) };
};
const prop = await call("POST", "/contact-properties", { key: "source_skill", type: "string", fallback_value: "hub" });
console.log(prop.ok ? "✓ contact property source_skill" : `! contact property: ${prop.status} ${JSON.stringify(prop.data)} (fine if it already exists)`);
for (const [name, envName] of [["All subscribers", "RESEND_SEGMENT_ALL"], ["Welcome pending", "RESEND_SEGMENT_PENDING"]]) {
  const s = await call("POST", "/segments", { name });
  if (s.ok) console.log(`✓ segment "${name}" → set ${envName}=${s.data.id}`);
  else console.log(`! segment "${name}": ${s.status} ${JSON.stringify(s.data)}. Create it in the Resend dashboard and copy its ID into ${envName}.`);
}

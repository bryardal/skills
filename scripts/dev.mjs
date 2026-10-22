#!/usr/bin/env node
// Local preview that behaves like Vercel: clean URLs for site/ and /api/* functions.
//   node scripts/dev.mjs            uses real Resend/Turnstile with keys from your environment
//   MOCK=1 node scripts/dev.mjs     fakes Resend and Turnstile so you can test the gate offline
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteDir = path.join(root, "site");
const port = Number(process.env.PORT || 3000);
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".mp4": "video/mp4", ".webm": "video/webm", ".zip": "application/zip", ".gz": "application/gzip", ".xml": "application/xml", ".txt": "text/plain" };

if (process.env.MOCK) {
  process.env.RESEND_API_KEY ||= "re_mock"; process.env.UNSUB_SECRET ||= "dev"; process.env.CRON_SECRET ||= "dev";
  process.env.RESEND_SEGMENT_PENDING ||= "seg_pending";
  const contacts = new Map(); globalThis.__mock = { contacts, sent: [] };
  const real = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const u = new URL(String(url)); const body = opts.body && typeof opts.body === "string" ? JSON.parse(opts.body) : {};
    const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
    if (u.hostname === "api.resend.com") {
      const m = (opts.method || "GET").toUpperCase(), p = u.pathname;
      if (m === "POST" && p === "/contacts") { if (contacts.has(body.email)) return json(409, { message: "Contact already exists" }); contacts.set(body.email, { ...body, segments: [] }); return json(200, { id: "c_" + contacts.size }); }
      if (m === "PATCH" && p.startsWith("/contacts/")) { const e = decodeURIComponent(p.split("/")[2]); Object.assign(contacts.get(e) || {}, body); return json(200, { object: "contact" }); }
      if (m === "POST" && p === "/emails") { if (process.env.MOCK === "quota") return json(429, { name: "daily_quota_exceeded" }); globalThis.__mock.sent.push(body); console.log(`  [mock] email to ${body.to}: ${body.subject}`); return json(200, { id: "e_1" }); }
      if (m === "POST" && /\/segments\//.test(p)) { const e = decodeURIComponent(p.split("/")[2]); contacts.get(e)?.segments.push(p.split("/")[4]); return json(200, {}); }
      return json(200, {});
    }
    if (u.hostname === "challenges.cloudflare.com") return json(200, { success: true });
    return real(url, opts);
  };
}

const send = (res, status, type, body) => { res.writeHead(status, { "content-type": type }); res.end(body); };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (url.pathname.startsWith("/api/")) {
    const file = path.join(root, "api", url.pathname.slice(5).replace(/[^a-z0-9-]/gi, "") + ".js");
    if (!fs.existsSync(file)) return send(res, 404, "text/plain", "No such function");
    const chunks = []; for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString();
    let body = raw; try { body = raw ? JSON.parse(raw) : {}; } catch {}
    const vreq = Object.assign(req, { query: Object.fromEntries(url.searchParams), body });
    const vres = Object.assign(res, {
      status(c) { res.statusCode = c; return vres; },
      json(o) { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(o)); return vres; },
      send(s) { res.end(s); return vres; },
    });
    const mod = await import(pathToFileURL(file).href + "?t=" + Date.now());
    try { await mod.default(vreq, vres); } catch (e) { console.error(e); if (!res.headersSent) send(res, 500, "text/plain", String(e)); }
    return;
  }
  let p = decodeURIComponent(url.pathname);
  const candidates = [p, p + ".html", path.join(p, "index.html")];
  for (const c of candidates) {
    const f = path.join(siteDir, path.normalize(c));
    if (f.startsWith(siteDir) && fs.existsSync(f) && fs.statSync(f).isFile())
      return send(res, 200, TYPES[path.extname(f)] || "application/octet-stream", fs.readFileSync(f));
  }
  send(res, 404, "text/plain", "Not found");
}).listen(port, () => console.log(`Preview: http://localhost:${port}${process.env.MOCK ? "  (mock email)" : ""}`));

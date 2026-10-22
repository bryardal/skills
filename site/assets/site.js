/* Copy buttons, install tabs, gallery previews, signup forms and the first-visit email gate. */
(() => {
  const cfg = window.SIA || {};
  const KEY = "sia_member";

  const store = {
    get() {
      try { if (localStorage.getItem(KEY) === "1") return true; } catch (_) {}
      return document.cookie.split("; ").includes(KEY + "=1");
    },
    set() {
      try { localStorage.setItem(KEY, "1"); } catch (_) {}
      document.cookie = KEY + "=1; Max-Age=31536000; Path=/; SameSite=Lax; Secure";
    }
  };

  /* copy */
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-copy]");
    if (!b) return;
    const text = b.getAttribute("data-copy");
    try { await navigator.clipboard.writeText(text); }
    catch (_) {
      const t = document.createElement("textarea"); t.value = text; document.body.append(t); t.select();
      try { document.execCommand("copy"); } catch (_) {} t.remove();
    }
    const old = b.textContent; b.textContent = "Copied"; setTimeout(() => (b.textContent = old), 1600);
  });

  /* tabs: any [role=tablist] controls panels listed in aria-controls */
  document.querySelectorAll('[role="tablist"]').forEach((list) => {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const select = (tab) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1;
        const p = document.getElementById(t.getAttribute("aria-controls")); if (p) p.hidden = !on;
      });
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(t));
      t.addEventListener("keydown", (e) => {
        const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (d) { const n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); select(n); }
      });
    });
  });
  /* "Other ways to install" links can pick a tab: href="#install" data-tab="tab-id" */
  document.querySelectorAll("[data-tab]").forEach((a) => a.addEventListener("click", () => {
    const t = document.getElementById(a.dataset.tab); if (t) t.click();
  }));

  /* clips play while on screen; with reduced motion they stay on their poster */
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clips = document.querySelectorAll("video[data-autoplay]");
  if (!still && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting && !document.body.classList.contains("gated")) { v.preload = "auto"; v.play().catch(() => {}); }
      else v.pause();
    }), { threshold: 0.35 });
    clips.forEach((v) => io.observe(v));
    // the gate covers the page: start visible clips once it closes
    window.addEventListener("sia:unlocked", () => clips.forEach((v) => { const r = v.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) { v.preload = "auto"; v.play().catch(() => {}); } }));
  }

  /* hairline under the top bar once the page scrolls */
  const onScroll = () => document.body.classList.toggle("scrolled", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* Turnstile (bot check), rendered explicitly into each form's .ts box */
  const tsKey = cfg.turnstileSiteKey && !/^TODO/.test(cfg.turnstileSiteKey) ? cfg.turnstileSiteKey : "";
  const widgets = new Map();
  if (tsKey) {
    window.siaTs = () => document.querySelectorAll("form.js-signup .ts").forEach((el) => {
      widgets.set(el.closest("form"), window.turnstile.render(el, { sitekey: tsKey, appearance: "interaction-only" }));
    });
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=siaTs";
    s.async = true; document.head.append(s);
  }

  /* gate */
  const gate = document.getElementById("gate");
  const main = document.getElementById("main");
  const openGate = () => {
    if (!gate) return;
    gate.hidden = false; document.body.classList.add("gated");
    if (main) main.inert = true;
    setTimeout(() => gate.querySelector("input[type=email]")?.focus(), 50);
  };
  const closeGate = () => {
    if (!gate) return;
    gate.hidden = true; document.body.classList.remove("gated");
    if (main) { main.inert = false; main.focus({ preventScroll: true }); }
    window.dispatchEvent(new Event("sia:unlocked"));
  };
  const markJoined = () => {
    document.querySelectorAll("[data-when-member]").forEach((el) => (el.hidden = false));
    document.querySelectorAll("[data-when-guest]").forEach((el) => (el.hidden = true));
  };
  if (store.get()) { markJoined(); }
  else if (document.body.dataset.gated === "true") openGate();

  /* signup forms */
  document.querySelectorAll("form.js-signup").forEach((form) => {
    const msg = form.parentElement.querySelector(".form-msg");
    const say = (t) => { if (msg) msg.textContent = t; };
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return say("Enter a full email address, like you@example.com.");
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true; say("One moment…");
      if (cfg.preview) { // preview copy of the page: no email is sent
        store.set(); markJoined(); say("Preview only: no email was sent.");
        if (form.closest("#gate")) setTimeout(closeGate, 600);
        btn.disabled = false; return;
      }
      const wid = widgets.get(form);
      const token = wid !== undefined && window.turnstile ? window.turnstile.getResponse(wid) : "";
      try {
        const r = await fetch("/api/subscribe", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, skill: document.body.dataset.skill || "hub", token, company: form.company?.value || "" })
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data.ok) throw new Error(data.error || "Signup didn't go through. Try again in a moment.");
        store.set(); markJoined();
        say(data.message || "You're in. Check your inbox for a welcome email.");
        if (form.closest("#gate")) setTimeout(closeGate, 700);
      } catch (err) {
        say(err.message);
        if (wid !== undefined && window.turnstile) window.turnstile.reset(wid);
      } finally { btn.disabled = false; }
    });
  });
})();

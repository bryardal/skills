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

  /* gallery videos play on hover or focus */
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll(".card video").forEach((v) => {
    const card = v.closest(".card");
    const play = () => { if (!still) v.play().catch(() => {}); };
    const stop = () => { v.pause(); };
    card.addEventListener("mouseenter", play); card.addEventListener("focus", play);
    card.addEventListener("mouseleave", stop); card.addEventListener("blur", stop);
  });

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
      btn.disabled = true; say("Signing you up…");
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

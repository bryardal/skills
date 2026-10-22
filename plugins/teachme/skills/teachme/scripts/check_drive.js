// Runs in the lesson page (check.py): clicks through the whole lesson like a learner (presses, drags, guesses,
// the sandbox and the quiz) and returns the phases it passed through.
async () => {
  const ui = window.__ui,
    seen = [],
    sleep = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 120; i++) {
    const ph = ui.phase;
    seen.push(ph + (ui.step >= 0 ? ui.step + 1 : ''));
    if (ph === 'end') return { ok: true, seen };
    if (ui.busy) {
      document.getElementById('next').click();
      await sleep(60);
      continue;
    }
    if (ph === 'drag') {
      const r = document.getElementById('dragR');
      for (let v = 100; v <= 1000; v += 100) {
        r.value = v;
        r.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(15);
      }
      await sleep(80);
      continue;
    }
    if (ph === 'guess' || (ph === 'check' && !document.querySelector('.choice[disabled]'))) {
      await sleep(700);
      const c = document.querySelector('.choice:not([disabled])');
      if (c) c.click();
      await sleep(80);
      continue;
    }
    if (ph === 'try') {
      for (const el of document.querySelectorAll('.ctrls input[type=range]')) {
        el.value = el.max;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      for (const el of document.querySelectorAll('.ctrls .switch, .ctrls .btn')) {
        el.click();
        await sleep(150);
      }
      await sleep(400);
    }
    document.getElementById('next').click();
    await sleep(120);
  }
  return { ok: false, seen };
};

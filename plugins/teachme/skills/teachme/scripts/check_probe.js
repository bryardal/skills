// Runs in the lesson page (check.py) and reports what needs attention in the current view: labels outside
// the picture or overlapping, overlays that hide something, a part to press that a tap would miss, and NaNs.
(() => {
  const svg = document.getElementById('fig'),
    sr = svg.getBoundingClientRect(),
    art = document.getElementById('art');
  const tags = [...art.querySelectorAll('.tag rect')].map(r => {
    const b = r.getBoundingClientRect();
    return { n: r.parentNode.dataset.part, x: b.x, y: b.y, w: b.width, h: b.height };
  });
  const lgs = [...art.querySelectorAll('.lg')];
  if (lgs.length) {
    const bs = lgs.map(g => g.getBoundingClientRect()),
      x = Math.min(...bs.map(b => b.x)),
      y = Math.min(...bs.map(b => b.y));
    tags.push({
      n: 'legend',
      x,
      y,
      w: Math.max(...bs.map(b => b.right)) - x,
      h: Math.max(...bs.map(b => b.bottom)) - y,
    });
  }
  const out = [],
    over = [];
  for (const t of tags) {
    if (t.x < sr.x - 2 || t.y < sr.y - 2 || t.x + t.w > sr.right + 2 || t.y + t.h > sr.bottom + 2)
      out.push(t.n);
  }
  for (let i = 0; i < tags.length; i++)
    for (let j = i + 1; j < tags.length; j++) {
      const a = tags[i],
        b = tags[j];
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x),
        iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ix > 3 && iy > 3) over.push(a.n + ' / ' + b.n);
    }
  // overlays that hide something: cards, speech bubbles, the legend, magnifier bubbles, labels, the readouts, the buttons
  const R = e => {
    const b = e.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  };
  const ov = (a, b, m = 2) =>
    Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > m &&
    Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > m;
  const area = (a, b) =>
    Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const boxes = [];
  art.querySelectorAll('.card').forEach((e, i) =>
    boxes.push({
      n: 'a card' + ((e.textContent || '').trim() ? ' ("' + e.textContent.trim().slice(0, 24) + '")' : ''),
      k: 'card',
      ...R(e.querySelector('rect:nth-of-type(2)') || e),
    })
  );
  art.querySelectorAll('.bubble').forEach(e =>
    boxes.push({
      n: 'a speech bubble ("' + (e.textContent || '').trim().slice(0, 24) + '")',
      k: 'bubble',
      ...R(e.querySelector('rect') || e),
    })
  );
  if (lgs.length) {
    const t = tags[tags.length - 1];
    if (t && t.n === 'legend') boxes.push({ n: 'the legend', k: 'legend', x: t.x, y: t.y, w: t.w, h: t.h });
  }
  const ins = [...art.querySelectorAll('circle.inset')].map(e => ({
    n: 'a magnifier bubble',
    k: 'inset',
    ...R(e),
  }));
  const page = [document.getElementById('stats'), document.querySelector('.zoombar')]
    .filter(e => e && e.getBoundingClientRect().width)
    .map(e => ({ n: e.id === 'stats' ? 'the readouts' : 'the picture buttons', k: 'page', ...R(e) }));
  const labels = tags
    .filter(t => t.n !== 'legend')
    .map(t => ({ n: 'the label "' + t.n + '"', k: 'tag', x: t.x, y: t.y, w: t.w, h: t.h }));
  const clash = [],
    cover = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++)
      if (ov(boxes[i], boxes[j])) clash.push(boxes[i].n + ' overlaps ' + boxes[j].n);
    for (const o of labels.concat(page, ins))
      if (ov(boxes[i], o)) clash.push(boxes[i].n + ' overlaps ' + o.n);
  }
  for (const a of ins) for (const o of page) if (ov(a, o)) clash.push(a.n + ' sits under ' + o.n);
  // a person hidden behind an overlay
  art.querySelectorAll('.person').forEach(pe => {
    const p = R(pe);
    if (!p.w) return;
    for (const o of boxes.concat(ins)) if (area(p, o) > 0.35 * p.w * p.h) cover.push(o.n + ' hides a person');
  });
  // a lit part's point hidden under a card, bubble or the legend
  const cards = [...art.querySelectorAll('.card')];
  art.querySelectorAll('.tag.on circle').forEach(c => {
    const b = c.getBoundingClientRect(),
      pt = { x: b.x, y: b.y, w: b.width, h: b.height },
      nm = c.parentNode.dataset.part;
    const cx = +c.getAttribute('cx'),
      cy = +c.getAttribute('cy');
    // a label that points at a card itself is fine
    if (
      cards.some(e => {
        const bb = e.getBBox();
        return Math.hypot(cx - +e.dataset.ax, cy - +e.dataset.ay) < 0.6 * Math.max(bb.width, bb.height);
      })
    )
      return;
    for (const o of boxes) if (ov(o, pt, 0)) cover.push(o.n + ' covers the part "' + nm + '" points at');
  });
  // the part the learner must press: is it really what a tap there hits?
  const pulse = document.querySelector('#fx .pulse'),
    ui = window.__ui,
    cf = window.__cfg;
  if (pulse && ui && cf) {
    const b = pulse.getBoundingClientRect(),
      x = b.x + b.width / 2,
      y = b.y + b.height / 2,
      want = ((cf.steps[ui.step] || {}).do || {}).part;
    const stack = document.elementsFromPoint(x, y).filter(e => !e.closest('#fx')),
      top = stack[0];
    // a tap goes through glass and cards to the part, but a label or the page controls catch it first
    const blocked = top && (top.closest('.tag') || top.closest('.zoombar,#stats,.cap,.dock'));
    const reach = stack.some(e => {
      const g = e.closest('[data-act]');
      return g && g.dataset.act === want;
    });
    if (want && (blocked || !reach)) {
      const w =
        top &&
        (top.closest('.card')
          ? 'a card'
          : top.closest('.bubble')
            ? 'a speech bubble'
            : top.closest('.tag')
              ? 'a label'
              : top.closest('.lg')
                ? 'the legend'
                : top.closest('.zoombar,#stats')
                  ? 'the page controls'
                  : 'another part of the drawing');
      clash.push(
        !art.querySelector('[data-act="' + CSS.escape(want) + '"]')
          ? 'the part to press ("' +
              want +
              '") is not in the picture before the step runs, so it cannot be pressed (wrap it in act() from the start)'
          : 'the part to press ("' +
              want +
              '") is covered by ' +
              (w || 'nothing pressable') +
              ', so a tap there misses it'
      );
    }
  }
  const h = art.innerHTML;
  // where a NaN comes from: the first element with a bad number, its clickable part or label, and its start
  let nanAt = '';
  if (/NaN|undefined|Infinity/.test(h)) {
    for (const el of art.querySelectorAll('*')) {
      const bad = [...el.attributes].find(a => /NaN|undefined|Infinity/.test(a.value));
      if (bad) {
        const host = el.closest('[data-act],[data-part],.card,.bubble,.lg');
        nanAt =
          `<${el.tagName} ${bad.name}="${bad.value.slice(0, 40)}">` +
          (host
            ? ` inside ${host.dataset.act ? 'act ' + host.dataset.act : host.dataset.part ? 'label ' + host.dataset.part : host.getAttribute('class')}`
            : '') +
          (el.previousElementSibling
            ? ` after <${el.previousElementSibling.tagName} ${[...el.previousElementSibling.attributes]
                .slice(0, 2)
                .map(a => a.name + '="' + a.value.slice(0, 24) + '"')
                .join(' ')}>`
            : '');
        break;
      }
    }
  }
  return {
    nan: /NaN|undefined|Infinity/.test(h),
    nanAt,
    clash: [...new Set(clash)],
    cover: [...new Set(cover)],
    out,
    over,
    lit: art.querySelectorAll('.tag.on').length,
    vb: svg.getAttribute('viewBox'),
    title: (document.querySelector('#body h2') || {}).textContent || '',
    errors: document.documentElement.dataset.errors || '',
    parts: [...art.querySelectorAll('.tag')].map(t => t.dataset.part),
  };
})();

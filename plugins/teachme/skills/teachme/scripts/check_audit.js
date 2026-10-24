// Runs in the lesson page (check.py) for one view and reports what a careful reviewer would catch by zooming in:
// labels whose leader points at empty space, and outline strokes that stop in mid-air (a line that ends on
// nothing). Labels and overlays are hidden while it looks, so they never count as "something".
(() => {
  const art = document.getElementById('art'),
    svg = document.getElementById('fig');
  const tags = [...art.querySelectorAll('.tag[data-part]')];
  const names = tags.map(t => t.dataset.part);
  const hide = [...art.querySelectorAll('.tag,.lg')]; // cards and bubbles stay: a label may name one
  hide.forEach(e => (e.style.visibility = 'hidden'));
  const M = svg.getScreenCTM();
  const toScreen = (x, y) => {
    const p = new DOMPoint(x, y).matrixTransform(M);
    return [p.x, p.y];
  };
  const sr = svg.getBoundingClientRect();
  const inView = ([x, y]) => x > sr.left + 2 && x < sr.right - 2 && y > sr.top + 2 && y < sr.bottom - 2;
  const offs = r => [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r * 0.7, r * 0.7], [-r * 0.7, -r * 0.7], [r * 0.7, -r * 0.7], [-r * 0.7, r * 0.7]];
  const hits = (x, y, self) =>
    document.elementsFromPoint(x, y).filter(e => e !== self && e !== svg && e.tagName !== 'g' && art.contains(e) && !hide.some(h => h.contains(e)));
  // anything drawn at (x, y) within r pixels, other than `self`
  const near = (x, y, r, self) => offs(r).some(([dx, dy]) => hits(x + dx, y + dy, self).length > 0);
  // an edge within r pixels: a line, a dot or the border of a shape (something under some probe points but not all);
  // a face lying under the whole neighbourhood doesn't count, since a line drawn on a face can still stop in mid-air
  const edgeNear = (x, y, r, self) => {
    const sets = offs(r).map(([dx, dy]) => new Set(hits(x + dx, y + dy, self)));
    const all = new Set(sets.flatMap(st => [...st]));
    for (const e of all) if (!sets.every(st => st.has(e))) return true;
    return false;
  };
  // 1. labels that point at nothing
  const empty = [];
  for (const t of tags) {
    const dot = t.querySelector('circle');
    if (!dot) continue;
    const s = toScreen(+dot.getAttribute('cx'), +dot.getAttribute('cy'));
    if (inView(s) && !near(s[0], s[1], 3, null)) empty.push(t.dataset.part);
  }
  // 2. outline strokes (ink colours, no fill) whose ends touch nothing
  const loose = [];
  const inks = new Set(['#231e16', '#5a5045']);
  for (const p of art.querySelectorAll('path')) {
    if (hide.some(h => h.contains(p))) continue;
    const fillA = p.getAttribute('fill'),
      st = p.getAttribute('stroke');
    if (fillA !== 'none' || !inks.has(st)) continue;
    const d = p.getAttribute('d') || '';
    if (/z\s*$/i.test(d) || /M/.test(d.slice(1))) continue; // closed shapes, and multi-part paths (rings, ticks)
    if (p.closest('[clip-path]') || p.closest('[opacity]') && +p.closest('[opacity]').getAttribute('opacity') < 0.3) continue;
    const L = p.getTotalLength ? p.getTotalLength() : 0;
    if (L < 3) continue;
    const w = +(p.getAttribute('stroke-width') || 1);
    for (const at of [0, L]) {
      const q = p.getPointAtLength(at),
        s = toScreen(q.x, q.y);
      if (!inView(s)) continue;
      if (!edgeNear(s[0], s[1], Math.max(2.5, w * 1.6), p)) loose.push([Math.round(s[0] - sr.left), Math.round(s[1] - sr.top)]);
    }
  }
  hide.forEach(e => (e.style.visibility = ''));
  return { names, empty, loose };
})();

/* ============================================================================================
   teachme engine: hand-inked isometric drawing + an interactive lesson around it.

   A lesson page includes this file (scripts/build.py inlines it), then calls mountLesson({...}).
   Everything is plain browser JavaScript with no dependencies; the lesson's scene function returns
   SVG strings built from the drawing helpers below. One fixed view (front-left-top), one fixed light.

   Contents
     palettes and materials        projection and depth sorting      2D shapes on a plane
     vectors and shading           drawing primitives                labels
     helpers for ideas             ready-made parts                  parts for any topic
     drawing styles                on-screen line weight             MP4 writer (video download)
     lesson page (CSS)             mountLesson (the lesson runtime)

   Drawing core forked from Colorfigures (April Zhu, MIT), itself built on iso-figure (Tolga Cohce, MIT).
   See LICENSE.
   ============================================================================================ */

// Lesson-facing API: these are called from lesson pages, not from inside this file.
/* exported act, blob, board, box, bubble, card, castShadow, CERAMIC, CLEAR, cylX, DARK, extrude,
            facing, fire, flow, gauge, glow, graph, hop, inset, insetPt, lathe, legend, litBall, METAL,
            meter, mountLesson, onFace, person, pipe, playNote, puffs, ripples, stack, table, tag,
            trail, tx, txY, txZ, wheel, WOOD,
            tube, cable, tree, branch, membrane, channel, helix, coil, ATOMS, molecule, screw, screws, bolts,
            ticks, knob, slots, shift, mul3, upTo, latheAx, gear, gearAt, meshAng, valve, rail, carriage, pipeline,
            heart, brain, lungs, kidney, ribbon, skeletal, BLOOD_LOW, BLOOD_HIGH, MUSCLE,
            flame, steam, waterSurface, stream, beam, pool, sparks, pulse, bloodColour, pad, flap, chain, arm, enzyme */

/* ---------- palettes ---------- */
const PALS = {
  mustard: { l: '#f4b829', m: '#d49c1f', d: '#4e4a18' },
  tomato: { l: '#ef6a4c', m: '#cf5038', d: '#4a2219' },
  mint: { l: '#93d3b0', m: '#71b693', d: '#1f4034' },
  cobalt: { l: '#76a0e2', m: '#5a82c6', d: '#1c2948' },
  blush: { l: '#f3a6bb', m: '#d8869c', d: '#4b2430' },
};
const METAL = { l: '#eef0f0', m: '#c6ccce', d: '#8f989b' };
const CLEAR = { l: '#e4f2f4', m: '#c4dfe4', d: '#97b9c0' };
const CERAMIC = { l: '#fbfaf3', m: '#e3e0d2', d: '#bdb8a6' };
const DARK = { l: '#55504a', m: '#3d3935', d: '#272421' };
const WATER = { l: '#9fd3ea', m: '#7bbcd9', d: '#4f8fae' };
// realistic materials: use the colours things really have, so the object is easy to recognise.
// Keep bright colours for teaching signals (red = hot, blue = cold or water, yellow = working now).
const MAT = {
  whitePlastic: { l: '#f4f5f6', m: '#d9dce0', d: '#a3a9b1' },
  blackPlastic: { l: '#5a5f66', m: '#3f444a', d: '#26292d' },
  steel: { l: '#eef0f1', m: '#c3c8cc', d: '#8a9095' },
  glass: { l: '#e4f2f4', m: '#c4dfe4', d: '#97b9c0' },
  copper: { l: '#e8a77c', m: '#c47e52', d: '#8a5230' },
  brass: { l: '#e9cf7a', m: '#c9a94f', d: '#8c722c' },
  gold: { l: '#f6cf4a', m: '#d9a926', d: '#94701a' },
  silver: { l: '#e9ecef', m: '#c4c9cf', d: '#8d949c' },
  rubber: { l: '#4a4d52', m: '#36393d', d: '#202225' },
  wood: { l: '#d9a86c', m: '#bf8a4f', d: '#8e6236' },
  counter: { l: '#ece8e1', m: '#d6d0c5', d: '#aea698' },
  paper: { l: '#fbfaf6', m: '#e8e5dc', d: '#bdb8aa' },
  brick: { l: '#c9765a', m: '#a85d44', d: '#6f3a29' },
  leaf: { l: '#8cc46a', m: '#6aa24b', d: '#3f6c2a' },
  soil: { l: '#9a7556', m: '#7a5a40', d: '#4e3826' },
};
// The lesson font: Inter (SIL Open Font License, see fonts/Inter-OFL.txt). The build scripts put the font file in
// place of the marker below, so a built lesson carries it and works offline; unbuilt, the system font is used.
const FONT_B64 = '__TEACHME_FONT__';
const FONT_FACE =
  FONT_B64.indexOf('__') === 0
    ? ''
    : "@font-face{font-family:'Inter';src:url(data:font/woff2;base64," +
      FONT_B64 +
      ") format('woff2');font-weight:100 900;font-style:normal;font-display:block}";
const SANS = "Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
const INK = '#231e16',
  INK_SOFT = '#5a5045'; // INK_SOFT: thin inner lines in the Clear style
let SHADOW = '#41538f'; // set by the drawing style

/* ---------- projection (x = depth toward viewer-right, y = toward viewer-left, z = up) ---------- */
const C = Math.cos(Math.PI / 6),
  S = Math.sin(Math.PI / 6);
let OX = 0,
  OY = 0;
// Views: 'iso' (default, front-left-top), 'front' (straight at the +x face: y runs left, z up; for cross-sections,
// layers, side views) and 'plan' (straight down: x right, y down; for geometry, maps, charts on a table).
let VIEW_MODE = 'iso',
  VDIR = [1, 1, 1];
const setView = v => {
  VIEW_MODE = v === 'front' || v === 'plan' ? v : 'iso';
  VDIR0 = VIEW_MODE === 'front' ? [1, 0.002, 0.001] : VIEW_MODE === 'plan' ? [0.002, 0.001, 1] : [1, 1, 1];
  setTurn(VIEW_AZ);
};
// Turning (lessons with turn: true): the whole scene turns about an upright axis through PIV, by VIEW_AZ radians.
// The light stays where the viewer is, so shading and shadows follow the turn.
let VIEW_AZ = 0,
  _CA = 1,
  _SA = 0,
  PIV = [0, 0, 0],
  VDIR0 = [1, 1, 1];
const _rz = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a), v[2]];
function setTurn(az) {
  VIEW_AZ = az || 0;
  _CA = Math.cos(VIEW_AZ);
  _SA = Math.sin(VIEW_AZ);
  VDIR = _rz(VDIR0, -VIEW_AZ);
  if (typeof L0 !== 'undefined') {
    L = _rz(L0, -VIEW_AZ);
    LIN = _rz(LIN0, -VIEW_AZ);
    const sh = _rz([SH0[0], SH0[1], 0], -VIEW_AZ);
    SH = [sh[0], sh[1]];
  }
}
const _tw = (x, y) => [PIV[0] + (x - PIV[0]) * _CA - (y - PIV[1]) * _SA, PIV[1] + (x - PIV[0]) * _SA + (y - PIV[1]) * _CA];
const P = (x, y, z) => {
  if (VIEW_AZ) [x, y] = _tw(x, y);
  return VIEW_MODE === 'iso'
    ? [(x - y) * C + OX, (x + y) * S - z + OY]
    : VIEW_MODE === 'front'
      ? [-y + OX, -z + OY]
      : [x + OX, y + OY];
};
const Dv = (x, y, z) => {
  if (VIEW_AZ) [x, y] = [x * _CA - y * _SA, x * _SA + y * _CA];
  return VIEW_MODE === 'iso' ? [(x - y) * C, (x + y) * S - z] : VIEW_MODE === 'front' ? [-y, -z] : [x, y];
};
const depthOf = p => p[0] * VDIR[0] + p[1] * VDIR[1] + p[2] * VDIR[2];
// sort [{at:[x,y,z], svg}] back-to-front and join
const byDepth = parts =>
  parts
    .filter(Boolean)
    .sort((p, q) => depthOf(p.at) - depthOf(q.at))
    .map(p => p.svg)
    .join('');
// faces [{at, d, c}] back to front, with neighbours in that order that share a colour joined into one path: the
// picture is the same, the page has far fewer elements (fewer elements, a lighter page)
// {group: true} goes further: one path per colour, the colours drawn in the order of their middle face. Use it only
// where faces of different colours barely overlap on screen (the side walls of a fine-toothed gear).
const facesByDepth = (items, o = {}) => {
  if (o.group) {
    const by = new Map();
    items
      .filter(Boolean)
      .sort((p, q) => depthOf(p.at) - depthOf(q.at))
      .forEach((it, i) => {
        const g = by.get(it.c) || { d: '', n: [] };
        g.d += it.d;
        g.n.push(i);
        by.set(it.c, g);
      });
    return [...by]
      .map(([c, g]) => ({ k: g.n[g.n.length >> 1], svg: face(g.d, c) }))
      .sort((a, b) => a.k - b.k)
      .map(g => g.svg)
      .join('');
  }
  let out = '',
    d = '',
    c = null;
  for (const it of items.filter(Boolean).sort((p, q) => depthOf(p.at) - depthOf(q.at))) {
    if (it.c !== c && d) (out += face(d, c)), (d = '');
    c = it.c;
    d += it.d;
  }
  return d ? out + face(d, c) : out;
};
const f = v => v.toFixed(1);
// Screen points to path data. Sampled curves (circles, tubes, routes, waves) are drawn as smooth curves through
// their points; real corners (a turn sharper than SMOOTH_TURN, like box edges, arrowheads, triangles) stay sharp.
// Each curve arm is a third of its own segment, so a curve never overshoots its points.
const SMOOTH_TURN = (50 * Math.PI) / 180;
function smoothD(qs, close) {
  qs = qs.filter((q, i) => i === 0 || Math.abs(q[0] - qs[i - 1][0]) + Math.abs(q[1] - qs[i - 1][1]) > 0.02); // repeated points (where two pieces join)
  let n = qs.length;
  if (close && n > 2 && Math.hypot(qs[0][0] - qs[n - 1][0], qs[0][1] - qs[n - 1][1]) < 0.05) {
    qs = qs.slice(0, -1);
    n--;
  }
  const pt = q => f(q[0]) + ' ' + f(q[1]);
  if (n < (close ? 5 : 3)) return 'M' + qs.map(pt).join('L') + (close ? 'Z' : ''); // triangles and quads (faces) keep their corners
  const at = i => qs[close ? (i + n) % n : i];
  const tan = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (!close && (i === 0 || i === n - 1)) continue;
    const a = at(i - 1),
      b = at(i),
      c = at(i + 1);
    const ux = b[0] - a[0],
      uy = b[1] - a[1],
      vx = c[0] - b[0],
      vy = c[1] - b[1],
      lu = Math.hypot(ux, uy),
      lv = Math.hypot(vx, vy);
    if (lu < 1e-3 || lv < 1e-3 || Math.max(lu, lv) > 2.5 * Math.min(lu, lv)) continue; // a long straight edge meeting a curve stays straight
    const turn = Math.acos(clamp((ux * vx + uy * vy) / (lu * lv), -1, 1));
    if (turn > SMOOTH_TURN) continue;
    const tx = ux / lu + vx / lv,
      ty = uy / lu + vy / lv,
      lt = Math.hypot(tx, ty);
    if (lt > 1e-6) tan[i] = [tx / lt, ty / lt];
  }
  let d = 'M' + pt(qs[0]);
  const segs = close ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const a = at(i),
      b = at(i + 1),
      j = close ? (i + 1) % n : i + 1,
      L3 = Math.hypot(b[0] - a[0], b[1] - a[1]) / 3;
    if (!tan[i] && !tan[j]) {
      d += close && i === segs - 1 ? '' : 'L' + pt(b);
      continue;
    }
    const c1 = tan[i] ? [a[0] + tan[i][0] * L3, a[1] + tan[i][1] * L3] : a,
      c2 = tan[j] ? [b[0] - tan[j][0] * L3, b[1] - tan[j][1] * L3] : b;
    d += 'C' + pt(c1) + ' ' + pt(c2) + ' ' + pt(b);
  }
  return d + (close ? 'Z' : '');
}
const pd = (pts, close = true) =>
  smoothD(
    pts.map(p => P(p[0], p[1], p[2])),
    close
  );
const sp = pts => smoothD(pts, true);

/* ---------- 2D shapes in a plane's (u,v) coords (v up), mapped to 3D by a plane ---------- */
const arcUV = (cu, cv, r, a0, a1, n = 7) => {
  const o = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    o.push([cu + r * Math.cos(a), cv + r * Math.sin(a)]);
  }
  return o;
};
const rectUV = (u0, v0, u1, v1) => [
  [u0, v0],
  [u1, v0],
  [u1, v1],
  [u0, v1],
];
const rrUV = (u0, v0, u1, v1, r, n = 7) =>
  r <= 0
    ? rectUV(u0, v0, u1, v1)
    : [
        ...arcUV(u1 - r, v0 + r, r, -90, 0, n),
        ...arcUV(u1 - r, v1 - r, r, 0, 90, n),
        ...arcUV(u0 + r, v1 - r, r, 90, 180, n),
        ...arcUV(u0 + r, v0 + r, r, 180, 270, n),
      ];
const ellUV = (cu, cv, ru, rv, n = 24) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI;
    return [cu + ru * Math.cos(a), cv + rv * Math.sin(a)];
  });
const PX =
  x =>
  ([u, v]) => [x, u, v]; // front-facing plane x = const (u = y, v = z)
const PY =
  y =>
  ([u, v]) => [u, y, v]; // side plane y = const (u = x, v = z)
const PZ =
  z =>
  ([u, v]) => [u, v, z]; // horizontal plane z = const (u = x, v = y)
const on = (plane, uv) => uv.map(plane);

/* ---------- vectors + shading ---------- */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => {
  const l = Math.hypot(...a) || 1;
  return a.map(v => v / l);
};
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const avg = ps =>
  ps.reduce((s, p) => [s[0] + p[0] / ps.length, s[1] + p[1] / ps.length, s[2] + p[2] / ps.length], [0, 0, 0]);
const vis = n => n[0] * VDIR[0] + n[1] * VDIR[1] + n[2] * VDIR[2] > 1e-6; // faces the viewer (VDIR points at the viewer)
const facing = vis;
const SHADOW_K = 0.85,
  SHADOW_LEN = 0.45; // cast shadows drawn short so they stay attached to the object
let L = [0, 0, 1],
  SH = [0, 0],
  L0 = [0, 0, 1],
  SH0 = [0, 0];
function setLight(deg) {
  const a = (deg * Math.PI) / 180;
  SH0 = [SHADOW_K * Math.cos(a), SHADOW_K * Math.sin(a)];
  L0 = norm([-SH0[0], -SH0[1], 1]);
  setTurn(VIEW_AZ);
}
const LIN0 = norm([0.6, 0.2, 1]); // fixed light for interiors / small props
let LIN = LIN0;
// Shading. Clear style: smooth light-to-dark, like a painted illustration (curved bodies look round), with a soft
// sheen where the light hits hardest. Sketch and High contrast: three flat bands.
const asM = m => (typeof m === 'string' ? matOf(m) : m && m.l ? m : MAT.steel); // a material, or '#hex' for one
const ramp = (m, t) => (t < 0.5 ? mix(m.d, m.m, t * 2) : mix(m.m, m.l, (t - 0.5) * 2));
const sheen = (c, d, from) => (d > from ? mix(c, '#ffffff', Math.min(0.22, (d - from) * 0.45)) : c);
const tone = (n, m) => {
  m = asM(m);
  const d = dot(n, L);
  if (STYLE.smooth) return sheen(ramp(m, clamp((d + 0.8) / 0.8)), d, 0.25);
  return d > -0.15 ? m.l : d > -0.45 ? m.m : m.d;
}; // exterior
const toneI = (n, m) => {
  m = asM(m);
  const d = dot(n, LIN);
  if (STYLE.smooth) return sheen(ramp(m, clamp((d + 0.3) / 1)), d, 0.78);
  return d > 0.6 ? m.l : d > 0.05 ? m.m : m.d;
}; // interior / props
const mix = (a, b, t) =>
  '#' +
  [1, 3, 5]
    .map(i =>
      Math.round(parseInt(a.substr(i, 2), 16) * (1 - t) + parseInt(b.substr(i, 2), 16) * t)
        .toString(16)
        .padStart(2, '0')
    )
    .join('');
const matOf = hex => ({ l: hex, m: mix(hex, '#000000', 0.16), d: mix(hex, '#000000', 0.42) });
const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

/* ---------- drawing primitives (all return SVG strings) ---------- */
const ink = (d, w = 1.0) =>
  `<path d="${d}" fill="none" stroke="${STYLE.smooth && w < 1.15 ? INK_SOFT : INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
const fill = (d, c, extra = '') => `<path d="${d}" fill="${c}" ${extra}/>`;
const face = (d, c) => `<path d="${d}" fill="${c}" stroke="${c}" stroke-width=".7" stroke-linejoin="round"/>`;
const shape = (pts, c, w = 0.9) => fill(pd(pts), c) + (w ? ink(pd(pts), w) : '');
const line = (pts, w = 0.9) => ink(pd(pts, false), w);
// Loft between two rings of equal length (closed). colour(n) picks each strip's fill; flip = seen from inside.
function loft(A, B, colour, flip = false) {
  const n = A.length,
    cen = avg(A.concat(B));
  let s = '';
  for (let i = 0; i < n; i++) {
    const a0 = A[i],
      a1 = A[(i + 1) % n],
      b1 = B[(i + 1) % n],
      b0 = B[i];
    let nr = norm(cross(sub(a1, a0), sub(b0, a0)));
    if (!isFinite(nr[0])) continue;
    if (dot(nr, sub(avg([a0, a1, b1, b0]), cen)) < 0) nr = nr.map(v => -v);
    if (flip) nr = nr.map(v => -v);
    if (vis(nr)) s += face(pd([a0, a1, b1, b0]), colour(nr));
  }
  return s;
}
function hull(pts) {
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [],
    up = [];
  for (const p of pts) {
    while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
    lo.push(p);
  }
  for (const p of pts.reverse()) {
    while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop();
    up.push(p);
  }
  lo.pop();
  up.pop();
  return lo.concat(up);
}
// Silhouette ink, weighted by how thick the part is on screen: thin parts stay light, big bodies get the heavy line.
const hullInk = (pts3, w = 1.4) => {
  const h = hull(pts3.map(p => P(...p)));
  let a = 0,
    per = 0;
  for (let i = 0; i < h.length; i++) {
    const p = h[i],
      q = h[(i + 1) % h.length];
    a += p[0] * q[1] - q[0] * p[1];
    per += Math.hypot(q[0] - p[0], q[1] - p[1]);
  }
  const thick = per ? Math.abs(a) / per / (INK_K * INK_REF_VB) : 0;
  return ink(sp(h), Math.min(w, 0.9 + 20 * thick));
};
// Axis-aligned box: visible faces, shaded, each outlined.
const shadeFn = (s, d) => (typeof s === 'function' ? s : d); // a shade that isn't a function falls back to the default
function box(x0, y0, z0, x1, y1, z1, m, shade = toneI, w = 0.9) {
  shade = shadeFn(shade, toneI);
  // all six faces; only the ones that face the viewer are drawn (three in the usual view, any three when turning)
  const F = [
    [[0, 1, 0], [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]],
    [[1, 0, 0], [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]],
    [[0, 0, 1], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]],
    [[0, -1, 0], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]],
    [[-1, 0, 0], [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]]],
    [[0, 0, -1], [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]]],
  ];
  return F.filter(([n]) => vis(n))
    .map(([n, q]) => shape(q, shade(n, m), w))
    .join('');
}
// Rounded-profile extrusion: profile (u=y, v=z) swept along x from x0 to x1. Convex profiles only.
function extrude(profileUV, x0, x1, m, shade = tone) {
  shade = shadeFn(shade, tone);
  return loft(on(PX(x0), profileUV), on(PX(x1), profileUV), n => shade(n, m));
}
// Vertical cylinder (axis z) centred (x,y), radius r from z0 to z1, with top cap. r1 = top radius for a taper.
function cyl(x, y, z0, z1, r, m, shade = toneI, w = 1.2, n = 24, r1 = r) {
  shade = shadeFn(shade, toneI);
  const A = on(PZ(z0), ellUV(x, y, r, r, n)),
    B = on(PZ(z1), ellUV(x, y, r1, r1, n));
  return (
    loft(A, B, nr => shade(nr, m)) +
    fill(pd(B), shade([0, 0, 1], m)) +
    hullInk([...A, ...B], w) +
    ink(pd(B), w * 0.8)
  );
}
// Cylinder lying along x (a knob or dial sticking out of a front face): centred (y,z), from x0 to x1.
function cylX(x0, x1, y, z, r, m, shade = toneI, w = 1.1, n = 20) {
  shade = shadeFn(shade, toneI);
  const A = on(PX(x0), ellUV(y, z, r, r, n)),
    B = on(PX(x1), ellUV(y, z, r, r, n));
  return (
    loft(A, B, nr => shade(nr, m)) +
    fill(pd(B), shade([1, 0, 0], m)) +
    hullInk([...A, ...B], w) +
    ink(pd(B), w * 0.8)
  );
}
// Cylinder between any two 3D points a and b (an arm, a rod, a pipe at an angle), radius r (r1 at b for a taper).
function rod(a, b, r, m, shade = toneI, w = 1, r1 = r, n = 16) {
  shade = shadeFn(shade, toneI);
  const d = norm(sub(b, a)),
    u = norm(cross(d, Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0])),
    v = cross(d, u);
  const ring = (p, rr) =>
    Array.from({ length: n }, (_, i) => {
      const t = (i / n) * 2 * Math.PI,
        c = Math.cos(t) * rr,
        s2 = Math.sin(t) * rr;
      return [p[0] + u[0] * c + v[0] * s2, p[1] + u[1] * c + v[1] * s2, p[2] + u[2] * c + v[2] * s2];
    });
  const A = ring(a, r),
    B = ring(b, r1),
    capB = vis(d),
    cap = capB ? B : A,
    cn = capB ? d : d.map(x => -x);
  return (
    loft(A, B, nr => shade(nr, m)) +
    (Math.max(r, r1) > 0 ? fill(pd(cap), shade(cn, m)) + ink(pd(cap), w * 0.8) : '') +
    hullInk([...A, ...B], w)
  );
}
// Sphere / ball / token: a shaded circle at a 3D centre (radius r in model units).
function ball(p3, r, m, w = 1) {
  m = asM(m);
  const [X, Y] = P(...p3),
    R = r * 1.2247;
  return (
    `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(R)}" fill="${m.m}" stroke="${INK}" stroke-width="${w}"/>` +
    `<circle cx="${f(X - R * 0.18)}" cy="${f(Y - R * 0.18)}" r="${f(R * 0.72)}" fill="${m.l}"/>` +
    `<circle cx="${f(X - R * 0.38)}" cy="${f(Y - R * 0.4)}" r="${f(R * 0.18)}" fill="#fff" opacity=".7"/>`
  );
}
// Text on a front plane x = const, centred at (y,z) baseline; on a side plane y = const (txY); flat on the floor (txZ).
const txM = (o, U, V) =>
  `matrix(${U[0].toFixed(4)} ${U[1].toFixed(4)} ${V[0].toFixed(4)} ${V[1].toFixed(4)} ${f(o[0])} ${f(o[1])})`;
const TXT = (tr, str, size, col, weight) =>
  `<text transform="${tr}" font-size="${size}" fill="${col}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="${weight}" letter-spacing=".04em">${str}</text>`;
const tx = (x, y, z, str, size, col = INK, weight = 700) =>
  TXT(txM(P(x, y, z), Dv(0, -1, 0), Dv(0, 0, -1)), str, size, col, weight);
const txY = (x, y, z, str, size, col = INK, weight = 700) =>
  TXT(txM(P(x, y, z), Dv(1, 0, 0), Dv(0, 0, -1)), str, size, col, weight);
// txZ: text lying flat on a horizontal surface; along = 'x' (runs right-down) or '-y' (runs right-up)
const txZ = (x, y, z, str, size, col = INK, weight = 700, along = 'x') =>
  TXT(
    along === 'x' ? txM(P(x, y, z), Dv(1, 0, 0), Dv(0, 1, 0)) : txM(P(x, y, z), Dv(0, -1, 0), Dv(1, 0, 0)),
    str,
    size,
    col,
    weight
  );
// Cast shadow of a set of 3D points pushed along the light onto z = z0. clip: outline of the surface it falls on.
const SOFT_SHADOW = 'rgba(28,32,48,.2)';
const castShadow = (pts3, z0 = 0, clip = null) => {
  const k = SHADOW_LEN / SHADOW_K;
  const d = sp(hull(pts3.map(([x, y, z]) => P(x + (z - z0) * SH[0] * k, y + (z - z0) * SH[1] * k, z0))));
  const s = STYLE.soft ? fill(d, SOFT_SHADOW, 'filter="url(#soft)"') : fill(d, SHADOW);
  return clip ? clipTo(clip, s) : s;
};
// ground(x, y, z, r): the soft shadow under an object that stands on the white page (no board needed), like a
// product photo: a wide faint shadow thrown away from the light, and a darker one where it touches the ground.
const ground = (x, y, z, r, ry = r) => {
  const k = (SHADOW_LEN / SHADOW_K) * 1.6 * (VIEW_MODE === 'iso' ? 1 : 0.15);
  if (!STYLE.soft)
    return fill(
      pd(on(PZ(z), ellUV(x + r * SH[0] * k * 0.3, y + r * SH[1] * k * 0.3, r * 1.04, ry * 1.04, 32))),
      SHADOW
    );
  return (
    fill(
      pd(on(PZ(z), ellUV(x + r * SH[0] * k * 0.7, y + r * SH[1] * k * 0.7, r * 1.3, ry * 1.3, 32))),
      'rgba(28,32,48,.08)',
      'filter="url(#softL)"'
    ) + fill(pd(on(PZ(z), ellUV(x, y, r * 1.02, ry * 1.02, 32))), 'rgba(28,32,48,.2)', 'filter="url(#soft)"')
  );
};
// A board for things to stand on (a tray, a desk, a table for a "diorama" of an idea).
const BOARD = { l: '#e6e1d4', m: '#cfc8b8', d: '#aaa293' },
  WOOD = { l: '#d9a86c', m: '#bf8a4f', d: '#8e6236' };
const boardTop = (x0, y0, x1, y1, h = 3, r = 5) => on(PZ(h), rrUV(x0, y0, x1, y1, r));
function board(x0, y0, x1, y1, h = 3, r = 5, m = BOARD) {
  const A = on(PZ(0), rrUV(x0, y0, x1, y1, r)),
    B = boardTop(x0, y0, x1, y1, h, r);
  return loft(A, B, n => toneI(n, m)) + fill(pd(B), m.l) + ink(pd(B), 1) + hullInk([...A, ...B], 1.8);
}
// Clickable part, clip to an opening.
const act = (name, inner, data = '') => `<g data-act="${name}" ${data}>${inner}</g>`;
let _clipN = 0;
const clipTo = (pts3, inner) => {
  const id = 'k' + ++_clipN;
  return `<clipPath id="${id}"><path d="${pd(pts3)}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`;
};

/* ---------- labels ---------- */
// Part label: a cream pill with a leader line to a 3D point. dx, dy = pill offset in screen units at the reference zoom.
// on = that part is doing its job right now (accent colour). If on is omitted, the pill lights when the current
// step lists this label in its `lit` array.
let LIT = new Set();
let SEEN = null,
  ALLLIT = new Set(); // reveal: a label shows once a step has introduced its part (SEEN), if any step does (ALLLIT)
let LABEL_K = 1; // labels grow on small screens so they stay readable
let VIEW = null; // the part of the picture on screen now; labels are kept inside it
let _TAGS = []; // label and legend boxes placed in this render, so later labels step aside
let _LITPTS = null; // when set, lit labels record where their parts are (for zoom: 'auto')
let _PINS = null; // printing: a Map of label -> number; labels draw as numbered pins
// Keeping overlays readable: cards, bubbles and the legend are placed so they don't cover each other, labels,
// magnifier bubbles (_INSETS), the part to press (_DOPT) or the parts the step is about (_LASTLIT, last frame).
let _INSETS = [],
  _DOPT = null,
  _LASTLIT = [],
  _LITNOW = [],
  _PEOPLE = [],
  _LASTPEOPLE = [];
const _covers = (cx, cy, w, h, p, m) => Math.abs(p[0] - cx) < w / 2 + m && Math.abs(p[1] - cy) < h / 2 + m;
function _place(cx, cy, w, h, own, speaker) {
  if (!VIEW) return [cx, cy];
  const pad = 2 * INK_K,
    m = 3 * INK_K,
    inView =
      own && own[0] >= VIEW.x && own[0] <= VIEW.x + VIEW.w && own[1] >= VIEW.y && own[1] <= VIEW.y + VIEW.h;
  const fit = (x, y) =>
    inView
      ? [
          clamp(x, VIEW.x + w / 2 + pad, VIEW.x + VIEW.w - w / 2 - pad),
          clamp(y, VIEW.y + h / 2 + pad, VIEW.y + VIEW.h - h / 2 - pad),
        ]
      : [x, y];
  const far = p => !own || Math.hypot(p[0] - own[0], p[1] - own[1]) > 6 * INK_K; // the overlay's own anchor (its speaker, its spot) is not an obstacle
  const pts = _LASTLIT.concat(_DOPT ? [_DOPT] : []).filter(far);
  // nobody may be hidden, a bubble's own speaker included (only its tail reaches them)
  const people = _LASTPEOPLE;
  const ovl = (r, x, y) =>
    Math.max(0, (r.w + w) / 2 + pad - Math.abs(r.x - x)) *
    Math.max(0, (r.h + h) / 2 + pad - Math.abs(r.y - y));
  // words over words is the worst overlap, then a magnifier, then a person
  const cost = (x, y) =>
    _TAGS.reduce((c, r) => c + 4 * ovl(r, x, y), 0) +
    _INSETS.reduce((c, r) => c + 2 * ovl(r, x, y), 0) +
    people.reduce((c, r) => c + ovl(r, x, y), 0) +
    pts.reduce((c, p) => c + (_covers(x, y, w, h, p, m) ? 2 * w * h : 0), 0);
  let q = fit(cx, cy),
    best = q,
    bc = cost(...q);
  if (!bc) return q;
  const sx = w * 0.55 + 4 * INK_K,
    sy = h * 0.6 + 4 * INK_K;
  const tries = [];
  for (const d of [1, 1.6, 2.3, 3])
    for (const [a, b] of [
      [0, -1],
      [0, 1],
      [1, 0],
      [-1, 0],
      [1, -1],
      [-1, -1],
      [1, 1],
      [-1, 1],
    ])
      tries.push([a * d, b * d]);
  for (const [a, b] of tries) {
    const r = fit(cx + a * sx, cy + b * sy),
      c = cost(...r);
    if (!c) return r;
    if (c < bc) {
      bc = c;
      best = r;
    }
  }
  return best; // nowhere free: the least-covered spot
}
function tag(p3, dx, dy, text, on) {
  if (on === undefined) on = LIT.has(text);
  if (SEEN && ALLLIT.has(text) && !SEEN.has(text) && !on) return ''; // not introduced yet: keep the picture calm
  if (_LITPTS && LIT.has(text))
    _LITPTS.push(p3.length === 2 ? [p3[0] - OX, p3[1] - OY] : P(...p3).map((v, i) => v - (i ? OY : OX)));
  const k = INK_K,
    [X, Y] = p3.length === 2 ? p3 : P(...p3),
    fs = 9 * k * LABEL_K,
    pin = _PINS && (_PINS.get(text) || (_PINS.set(text, _PINS.size + 1), _PINS.get(text))),
    w = pin ? fs * 2.1 : text.length * fs * 0.6 + fs * 1.6,
    h = fs * 2;
  let cx = X + dx * k * (1 + (LABEL_K - 1) * 0.6),
    cy = Y + dy * k * (1 + (LABEL_K - 1) * 0.6);
  if (_LITPTS && on) _LITPTS.push([cx - OX, cy - OY]);
  if (on) _LITNOW.push([X, Y]);
  if (VIEW) {
    const pad = 2 * k;
    if (X < VIEW.x - pad || X > VIEW.x + VIEW.w + pad || Y < VIEW.y - pad || Y > VIEW.y + VIEW.h + pad)
      return ''; // its part is out of view
    const m = 3 * k,
      fit = () => {
        cx = clamp(cx, VIEW.x + w / 2 + m, VIEW.x + VIEW.w - w / 2 - m);
        cy = clamp(cy, VIEW.y + h / 2 + m, VIEW.y + VIEW.h - h / 2 - m);
      };
    fit();
    const hit = () =>
      _TAGS.some(
        r => Math.abs(r.x - cx) < (r.w + w) / 2 + k && Math.abs(r.y - cy) < (r.h + h) / 2 + k * 0.5
      ) ||
      (_DOPT && _covers(cx, cy, w, h, _DOPT, 4 * k));
    const y0 = cy;
    for (let i = 1; i <= 8 && hit(); i++) {
      cy = y0 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (h + 2 * k);
      fit();
    }
    _TAGS.push({ x: cx, y: cy, w, h });
  }
  if (pin) {
    const r = fs * 1.02;
    return (
      `<g class="tag pin${on ? ' on' : ''}" data-part="${text}"><path d="M${f(X)} ${f(Y)}L${f(cx)} ${f(cy)}" fill="none" stroke="${INK}" stroke-width="1"/>` +
      `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(1.4 * k)}" fill="${INK}"/>` +
      `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${on ? '#ffc93c' : INK}" stroke="${INK}" stroke-width="1.2"/>` +
      `<text x="${f(cx)}" y="${f(cy + fs * 0.36)}" font-size="${f(fs * 1.05)}" text-anchor="middle" font-family="${SANS}" font-weight="750" fill="${on ? INK : '#fff'}">${pin}</text></g>`
    );
  }
  const q = STYLE.soft && !on,
    lc = q ? '#8b919a' : INK;
  return (
    `<g class="tag${on ? ' on' : ''}" data-part="${text}"><path d="M${f(X)} ${f(Y)}L${f(cx)} ${f(cy)}" fill="none" stroke="${lc}" stroke-width="${on ? 1.3 : q ? 0.8 : 1}" pointer-events="none"/>` +
    `<circle cx="${f(X)}" cy="${f(Y)}" r="${f((q ? 1.15 : 1.4) * k)}" fill="${lc}" pointer-events="none"/>` +
    `<rect x="${f(cx - w / 2)}" y="${f(cy - h / 2)}" width="${f(w)}" height="${f(h)}" rx="${f(h / 2)}" fill="${on ? 'var(--hi,#ffc93c)' : '#ffffff'}" stroke="${q ? '#cdd1d7' : INK}" stroke-width="${on ? 1.8 : q ? 0.9 : 1.1}"/>` +
    `<text x="${f(cx)}" y="${f(cy + fs * 0.36)}" font-size="${f(fs)}" text-anchor="middle" font-family="${SANS}" font-weight="${on ? 750 : 600}" fill="${INK}">${text}</text></g>`
  );
}

/* ---------- helpers for ideas, not just machines ---------- */
// Point a fraction t (0..1) along a 3D polyline. Use it to move tokens (coins, packets, molecules) along a path.
function along(pts3, t) {
  const seg = [];
  let total = 0;
  for (let i = 1; i < pts3.length; i++) {
    const l = Math.hypot(...sub(pts3[i], pts3[i - 1]));
    seg.push(l);
    total += l;
  }
  let d = clamp(t) * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1)
      return lerp3(pts3[i], pts3[i + 1], seg[i] ? clamp(d / seg[i]) : 0);
    d -= seg[i];
  }
  return pts3[0];
}
// Arrow along a 3D polyline (a flow, a cause → effect link). dash = true for a "travelling" dashed look; phase animates it.
// upTo(points3, t): the part of a path from its start to the fraction t (0..1) along it: fluid advancing along a tube,
// a line being drawn, a route travelled so far. Draw it with tube(), curve() or arrow3().
function upTo(pts3, t) {
  t = clamp(t);
  if (t <= 0) return [pts3[0], pts3[0]];
  let total = 0;
  const seg = [];
  for (let i = 1; i < pts3.length; i++) {
    const l = Math.hypot(...sub(pts3[i], pts3[i - 1]));
    seg.push(l);
    total += l;
  }
  const out = [pts3[0]];
  let left = total * t;
  for (let i = 1; i < pts3.length; i++) {
    if (left >= seg[i - 1]) {
      out.push(pts3[i]);
      left -= seg[i - 1];
    } else {
      out.push(lerp3(pts3[i - 1], pts3[i], left / (seg[i - 1] || 1)));
      break;
    }
  }
  return out;
}
function arrow3(pts3, w = 1.6, col = INK, opts = {}) {
  const s = pts3.map(p => P(...p)),
    a = s[s.length - 2],
    b = s[s.length - 1];
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]),
    hl = (opts.head || 7) * INK_K,
    hw = hl * 0.55;
  const tip = b,
    l = [b[0] - hl * Math.cos(ang) + hw * Math.sin(ang), b[1] - hl * Math.sin(ang) - hw * Math.cos(ang)],
    r = [b[0] - hl * Math.cos(ang) - hw * Math.sin(ang), b[1] - hl * Math.sin(ang) + hw * Math.cos(ang)];
  const body = smoothD(
    s.slice(0, -1).concat([[b[0] - hl * 0.8 * Math.cos(ang), b[1] - hl * 0.8 * Math.sin(ang)]]),
    false
  );
  const dash = opts.dash
    ? ` stroke-dasharray="${f(4 * INK_K)} ${f(3 * INK_K)}" stroke-dashoffset="${f(-(opts.phase || 0) * 7 * INK_K)}"`
    : '';
  return (
    `<path d="${body}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${dash}/>` +
    `<path d="M${f(tip[0])} ${f(tip[1])}L${f(l[0])} ${f(l[1])}L${f(r[0])} ${f(r[1])}Z" fill="${col}" stroke="${col}" stroke-width="${w * 0.6}" stroke-linejoin="round"/>`
  );
}
// Flat 2D content on any plane (a chart on a screen, a sign, a diagram on a wall). origin = 3D top-left corner,
// U = 3D direction of +u (right), V = 3D direction of +v (DOWN), both per unit. inner = SVG in local units.
const onFace = (o3, U3, V3, inner) => {
  const o = P(...o3),
    u = Dv(...U3),
    v = Dv(...V3);
  return `<g class="flatface" transform="matrix(${u[0].toFixed(4)} ${u[1].toFixed(4)} ${v[0].toFixed(4)} ${v[1].toFixed(4)} ${f(o[0])} ${f(o[1])})">${inner}</g>`;
};
// A stack of coins / a tower whose height carries a quantity. layers = [{h, m}] bottom to top.
function stack(x, y, z0, r, layers, ridge = 2.2) {
  let s = '',
    z = z0;
  for (const L2 of layers) {
    if (L2.h <= 0) continue;
    const A = on(PZ(z), ellUV(x, y, r, r, 24)),
      B = on(PZ(z + L2.h), ellUV(x, y, r, r, 24));
    s += loft(A, B, n => toneI(n, L2.m));
    for (let zz = z + ridge; zz < z + L2.h - 0.4; zz += ridge)
      s += ink(pd(on(PZ(zz), arcUV(x, y, r, -45, 135, 10)), false), 0.5);
    z += L2.h;
  }
  const top = layers.filter(l => l.h > 0).slice(-1)[0];
  if (!top) return '';
  const A0 = on(PZ(z0), ellUV(x, y, r, r, 24)),
    B = on(PZ(z), ellUV(x, y, r, r, 24));
  return (
    s +
    fill(pd(B), top.m.l) +
    ink(pd(B), 0.9) +
    ink(pd(on(PZ(z), ellUV(x, y, r * 0.66, r * 0.66, 20))), 0.6) +
    hullInk([...A0, ...B], 1.6)
  );
}

/* ---------- ready-made parts: use these before drawing your own ---------- */
// planeAt(axis, c): the flat plane through c that faces along axis 'x' (front), 'y' (left side) or 'z' (top).
// Returns [plane, u0, v0]: 2D shapes at (u0 + du, v0 + dv) in that plane. US(axis) = +1, or -1 when +u runs to the
// viewer's left (the front plane), so angles and needles turn the right way on every face.
const AXN = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
const planeAt = (axis, c) =>
  axis === 'x' ? [PX(c[0]), c[1], c[2]] : axis === 'y' ? [PY(c[1]), c[0], c[2]] : [PZ(c[2]), c[0], c[1]];
const US = axis => (axis === 'x' ? -1 : 1);
const frac = v => v - Math.floor(v);
let _gid = 0;
const gid = p => p + ++_clipN + '_' + (++_gid % 1000);

// pipe(points, r, m): a bent pipe through 3D points, with rounded joints. Draws back to front by itself.
function pipe(pts3, r, m, w = 1) {
  const parts = [];
  for (let i = 0; i < pts3.length - 1; i++)
    parts.push({ at: lerp3(pts3[i], pts3[i + 1], 0.5), svg: rod(pts3[i], pts3[i + 1], r, m, tone, w) });
  for (let i = 1; i < pts3.length - 1; i++)
    parts.push({ at: add(pts3[i], [0.01, 0.01, 0.01]), svg: ball(pts3[i], r * 0.82, m, w) });
  return byDepth(parts);
}

// wheel(c, axis, R, angle, m, {spokes, thick, rim, hub}): a spoked wheel (flywheel, pulley, handwheel) centred at c,
// turning about axis. angle in radians; feed it from st (e.g. st.ang) so it turns as the engine runs.
function wheel(c, axis, R, ang, m, o = {}) {
  const n = o.spokes ?? 6,
    th = o.thick ?? R * 0.16,
    rw = o.rim ?? R * 0.13,
    hr = o.hub ?? R * 0.18,
    sw = o.spokeW ?? R * 0.075,
    us = US(axis);
  const A = AXN[axis],
    cf = add(
      c,
      A.map(v => (v * th) / 2)
    ),
    cb = add(
      c,
      A.map(v => (-v * th) / 2)
    );
  const [pf, u0, v0] = planeAt(axis, cf),
    [pb] = planeAt(axis, cb),
    ri = R - rw;
  const ring = (pl, r, k = 48) => on(pl, ellUV(u0, v0, r, r, k));
  let s = fill(pd([...ring(pb, R), ...ring(pb, ri).reverse()]), m.d, 'fill-rule="evenodd"');
  s += loft(ring(pb, ri, 40), ring(pf, ri, 40), nr => tone(nr, m), true);
  for (let k = 0; k < n; k++) {
    const a = ang + (k * 2 * Math.PI) / n,
      ca = Math.cos(a),
      sa = Math.sin(a),
      px = -sa * sw,
      py = ca * sw;
    const q = [
      [u0 + us * (ca * hr * 0.8 + px), v0 + sa * hr * 0.8 + py],
      [u0 + us * (ca * (ri + 0.3) + px * 0.8), v0 + sa * (ri + 0.3) + py * 0.8],
      [u0 + us * (ca * (ri + 0.3) - px * 0.8), v0 + sa * (ri + 0.3) - py * 0.8],
      [u0 + us * (ca * hr * 0.8 - px), v0 + sa * hr * 0.8 - py],
    ];
    s += shape(on(pf, q), tone(A, m), 0.7);
  }
  s += loft(ring(pb, R), ring(pf, R), nr => tone(nr, m));
  s +=
    fill(pd([...ring(pf, R), ...ring(pf, ri).reverse()]), tone(A, m), 'fill-rule="evenodd"') +
    ink(pd(ring(pf, ri)), 0.8);
  const hb = add(
    c,
    A.map(v => v * th * 0.9)
  );
  s +=
    loft(ring(pb, hr, 20), on(planeAt(axis, hb)[0], ellUV(u0, v0, hr, hr, 20)), nr => tone(nr, m)) +
    shape(on(planeAt(axis, hb)[0], ellUV(u0, v0, hr, hr, 20)), tone(A, m), 0.8) +
    fill(pd(on(planeAt(axis, hb)[0], ellUV(u0, v0, hr * 0.4, hr * 0.4, 14))), m.d);
  return s + hullInk([...ring(pb, R), ...ring(pf, R)], 1.6);
}

// gauge(c, axis, r, v, {label}): a round dial on a face (pressure, temperature). v from 0 to 1 moves the needle;
// the last fifth of the scale is red.
function gauge(c, axis, r, v, o = {}) {
  const [pl, u0, v0] = planeAt(axis, c),
    us = US(axis),
    at = (a, rr) => [u0 + us * Math.cos(a) * rr, v0 + Math.sin(a) * rr];
  const a0 = (225 * Math.PI) / 180,
    span = (270 * Math.PI) / 180,
    ang = t => a0 - span * clamp(t);
  let s =
    shape(on(pl, ellUV(u0, v0, r, r, 32)), MAT.brass.m, 1.1) +
    fill(pd(on(pl, ellUV(u0, v0, r * 0.84, r * 0.84, 32))), '#fbfaf6');
  const red = [];
  for (let i = 0; i <= 8; i++) red.push(at(ang(0.8 + (0.2 * i) / 8), r * 0.78));
  for (let i = 8; i >= 0; i--) red.push(at(ang(0.8 + (0.2 * i) / 8), r * 0.62));
  s += fill(pd(on(pl, red)), '#d9534a');
  for (let i = 0; i <= 10; i++)
    s += line(
      on(pl, [at(ang(i / 10), r * 0.78), at(ang(i / 10), r * (i % 5 ? 0.7 : 0.6))]),
      i % 5 ? 0.4 : 0.6
    );
  const a = ang(v),
    tip = at(a, r * 0.72),
    b1 = at(a + Math.PI / 2, r * 0.07),
    b2 = at(a - Math.PI / 2, r * 0.07);
  s +=
    fill(pd(on(pl, [b1, tip, b2])), '#c0392b') + fill(pd(on(pl, ellUV(u0, v0, r * 0.1, r * 0.1, 12))), INK);
  return s + ink(pd(on(pl, ellUV(u0, v0, r * 0.84, r * 0.84, 32))), 0.6);
}

// puffs(p, t, amt, {n, rise, drift, r0, r1, speed, col}): steam or smoke rising from a 3D point and fading.
// t = st.t (the clock), amt 0..1 how much. drift = [dx, dy] per unit of rise.
function puffs(p3, t, amt, o = {}) {
  if (amt <= 0.01) return '';
  const n = o.n ?? 6,
    rise = o.rise ?? 22,
    dr = o.drift ?? [0.25, -0.15],
    r0 = o.r0 ?? 1.6,
    r1 = o.r1 ?? 6,
    sp = o.speed ?? 0.45,
    col = o.col ?? '#ffffff';
  let s = '';
  for (let i = 0; i < n; i++) {
    const ph = frac(t * sp + i / n),
      z = rise * ph,
      [X, Y] = P(p3[0] + dr[0] * z, p3[1] + dr[1] * z, p3[2] + z),
      r = r0 + (r1 - r0) * ph;
    const op = amt * Math.min(1, ph * 6) * (1 - ph);
    s += `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(r)}" fill="${col}" fill-opacity="${(op * 0.92).toFixed(2)}" stroke="#8f99a5" stroke-width=".55" stroke-opacity="${(op * 0.75).toFixed(2)}"/>`;
  }
  return s;
}

// glow(p, r, amt, colour): a soft round glow (a fire, a lamp, a hot part). Draw it under the thing that glows.
function glow(p3, r, amt, col = '#ff9a3c') {
  if (amt <= 0.01) return '';
  const [X, Y] = P(...p3),
    id = gid('gl');
  return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${col}" stop-opacity=".75"/><stop offset=".5" stop-color="${col}" stop-opacity=".28"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient></defs><circle cx="${f(X)}" cy="${f(Y)}" r="${f(r)}" fill="url(#${id})" opacity="${clamp(amt).toFixed(2)}"/>`;
}

// fire(p, w, h, amt, t): flickering flames standing on a 3D point (w, h in drawing units), for a firebox or burner.
function fire(p3, w, h, amt, t) {
  if (amt <= 0.01) return '';
  const [X, Y] = P(...p3);
  let s = '';
  const tongue = (dx, hh, ww, c) =>
    `<path d="M${f(X + dx - ww)} ${f(Y)}C${f(X + dx - ww)} ${f(Y - hh * 0.45)} ${f(X + dx - ww * 0.2)} ${f(Y - hh * 0.6)} ${f(X + dx)} ${f(Y - hh)}C${f(X + dx + ww * 0.25)} ${f(Y - hh * 0.6)} ${f(X + dx + ww)} ${f(Y - hh * 0.45)} ${f(X + dx + ww)} ${f(Y)}Z" fill="${c}"/>`;
  for (let i = 0; i < 5; i++) {
    const dx = ((i - 2) / 2) * w * 0.38,
      k = 0.55 + 0.45 * Math.abs(Math.sin(t * (5 + i) + i * 1.9)),
      hh = h * amt * k * (i === 2 ? 1 : 0.75);
    s += tongue(dx, hh, w * 0.17, '#f0782a') + tongue(dx, hh * 0.62, w * 0.1, '#ffcf4a');
  }
  return `<g opacity="${clamp(amt * 1.4).toFixed(2)}">${s}</g>`;
}

// Moving tokens for flows (water, gas, money, energy): flow(path, kind, amt, t, n, speed) moves n tokens along a
// 3D path; legend(items, at) lists them. Kinds: TOKENS.water, .steam, .air, .sugar, .coin, .heat; add your own:
// TOKENS.co2 = {shape: 'ball', m: {l, m, d}}. Shapes: 'drop', 'ball', 'cube', or your own: {draw([X, Y], R, kind) => svg}
// drawn in screen units at screen point [X, Y] (an antibody, an ion with a + sign, a packet). Kinds: also ion+ and ion-.
const TOKENS = {
  water: { shape: 'drop', m: WATER },
  steam: { shape: 'ball', m: { l: '#ffffff', m: '#e3e8ee', d: '#9aa5b2' } },
  air: { shape: 'ball', m: { l: '#dfe9f2', m: '#bccbd9', d: '#7d8fa3' } },
  sugar: { shape: 'cube', m: { l: '#ffffff', m: '#f0eee6', d: '#8a8578' } },
  coin: { shape: 'ball', m: MAT.gold },
  heat: { shape: 'ball', m: { l: '#ffb08a', m: '#f0784a', d: '#b8461f' } },
  'ion+': {
    m: { l: '#ffd6cf', m: '#e8735f', d: '#9c3b2c' },
    draw: ([X, Y], R, k) =>
      `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(R)}" fill="${k.m.l}" stroke="${k.m.d}" stroke-width=".8"/><path d="M${f(X - R * 0.5)} ${f(Y)}H${f(X + R * 0.5)}M${f(X)} ${f(Y - R * 0.5)}V${f(Y + R * 0.5)}" stroke="${k.m.d}" stroke-width="${f(R * 0.28)}" stroke-linecap="round"/>`,
  },
  'ion-': {
    m: { l: '#d4e4fb', m: '#5f8fe0', d: '#2d5296' },
    draw: ([X, Y], R, k) =>
      `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(R)}" fill="${k.m.l}" stroke="${k.m.d}" stroke-width=".8"/><path d="M${f(X - R * 0.5)} ${f(Y)}H${f(X + R * 0.5)}" stroke="${k.m.d}" stroke-width="${f(R * 0.28)}" stroke-linecap="round"/>`,
  },
};
function token(p3, kind, r = 2.1) {
  const k = TOKENS[kind] || TOKENS.air,
    [X, Y] = P(...p3),
    R = r * 1.2247;
  if (k.draw) return k.draw([X, Y], R, k);
  if (k.shape === 'drop')
    return `<path d="M${f(X)} ${f(Y - R * 1.5)}C${f(X + R)} ${f(Y - R * 0.3)} ${f(X + R)} ${f(Y + R)} ${f(X)} ${f(Y + R)}C${f(X - R)} ${f(Y + R)} ${f(X - R)} ${f(Y - R * 0.3)} ${f(X)} ${f(Y - R * 1.5)}Z" fill="${k.m.l}" stroke="${k.m.d}" stroke-width=".8"/>`;
  if (k.shape === 'cube')
    return `<rect x="${f(X - R * 0.8)}" y="${f(Y - R * 0.8)}" width="${f(R * 1.6)}" height="${f(R * 1.6)}" rx="${f(R * 0.25)}" fill="${k.m.l}" stroke="${INK}" stroke-width=".8"/>`;
  return ball(p3, r, k.m, 0.8);
}
function flow(path3, kind, amt, t, n = 6, speed = 0.3, r = 2.1) {
  if (amt <= 0.01) return '';
  let s = '';
  for (let i = 0; i < n; i++) {
    const ph = frac(t * speed + i / n),
      p = along(path3, ph);
    s += `<g opacity="${(Math.min(1, amt) * Math.min(1, Math.sin(Math.PI * ph) * 2.2)).toFixed(2)}">${token(p, kind, r)}</g>`;
  }
  return s;
}
// legend([[kind, 'Name'], ...], at): a small key for the tokens moving now, at a 3D point in empty space. A kind can
// also be a colour ('#e2483d') or a material (MAT.copper): a swatch, to key the colours of parts (A, T, G, C in DNA).
function legend(items, at3 = 'auto') {
  if (!items.length) return '';
  const k = INK_K * LABEL_K * 1.3,
    row = 10 * k,
    lw = (9 + 4.6 * Math.max(...items.map(x => String(x[1]).length))) * k;
  let [LX, LY] = at3 === 'auto' ? [NaN, NaN] : P(...at3);
  const lh = items.length * row + 4 * k,
    free = (x, y) =>
      !_TAGS
        .concat(_INSETS)
        .some(
          r =>
            Math.abs(r.x - (x + lw / 2)) < (r.w + lw) / 2 &&
            Math.abs(r.y - (y + lh / 2 - row / 2)) < (r.h + lh) / 2
        ) &&
      !(_DOPT && _covers(x + lw / 2, y + lh / 2, lw, lh, _DOPT, 3 * INK_K)) &&
      !_LASTLIT.some(p => _covers(x + lw / 2, y + lh / 2, lw, lh, p, 2 * INK_K));
  if (
    VIEW &&
    (!(LX >= VIEW.x) ||
      LX + lw > VIEW.x + VIEW.w ||
      !(LY >= VIEW.y) ||
      LY + items.length * row > VIEW.y + VIEW.h ||
      !free(LX, LY))
  ) {
    const c = [
      [VIEW.x + VIEW.w - lw - 4 * k, VIEW.y + 8 * k],
      [VIEW.x + 8 * k, VIEW.y + 8 * k],
      [VIEW.x + VIEW.w - lw - 4 * k, VIEW.y + VIEW.h - lh - 2 * k],
      [VIEW.x + 8 * k, VIEW.y + VIEW.h - lh - 2 * k],
    ];
    [LX, LY] = c.find(([x, y]) => free(x, y)) || c[0];
  }
  if (!isFinite(LX)) {
    LX = 0;
    LY = 0;
  }
  _TAGS.push({
    x: LX + lw / 2 - 4 * k,
    y: LY + ((items.length - 1) * row) / 2,
    w: lw,
    h: items.length * row + 4 * k,
  });
  let s = '';
  items.forEach(([kind, name], i) => {
    // a colour ('#e2483d') or a material (MAT.copper) as the kind gives a plain swatch: a key for colours in the picture
    const sw = typeof kind === 'string' && kind[0] === '#' ? kind : kind && typeof kind === 'object' && !kind.draw ? asM(kind).m : null;
    const tk = (typeof kind === 'string' && TOKENS[kind]) || TOKENS.air,
      m = tk.m || TOKENS.air.m,
      sh = tk.shape;
    const icon = sw
      ? `<rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="1.2" fill="${sw}" stroke="${INK}" stroke-width="1"/>`
      : tk.draw
      ? tk.draw([0, 0], 2.6, tk)
      : sh === 'drop'
        ? `<path d="M0 -4C2.6 -.8 2.6 2.6 0 2.6C-2.6 2.6 -2.6 -.8 0 -4Z" fill="${m.l}" stroke="${m.d}" stroke-width="1"/>`
        : sh === 'cube'
          ? `<rect x="-2.4" y="-2.4" width="4.8" height="4.8" rx=".8" fill="${m.l}" stroke="${INK}" stroke-width="1"/>`
          : `<circle r="3" fill="${m.m}" stroke="${INK}" stroke-width="1"/><circle cx="-.6" cy="-.6" r="2.1" fill="${m.l}"/>`;
    s += `<g class="lg" transform="translate(${f(LX)} ${f(LY + i * row)}) scale(${k.toFixed(3)})">${icon}<text x="7" y="3" font-size="7.5" font-family="${SANS}" font-weight="600" fill="${INK}" stroke="#fff" stroke-width="2.4" paint-order="stroke">${name}</text></g>`;
  });
  return s;
}

// fade(opacity, svg): show something partly (a shape fading in, a ghost of where something was).
const fade = (op, svg) =>
  clamp(op) <= 0.005 ? '' : clamp(op) >= 0.995 ? svg : `<g opacity="${clamp(op).toFixed(2)}">${svg}</g>`;
// curve(points3, colour, w, {dash, op, close}): a plain line in any colour (a graph line, a path, a boundary).
const curve = (pts3, col = INK, w = 1, o = {}) =>
  `<path d="${pd(pts3, !!o.close)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${o.dash ? ` stroke-dasharray="${(typeof o.dash === 'string' ? o.dash.split(/[\s,]+/).map(Number) : [o.dash, o.dash * 0.8]).map(v => f((v || 1) * INK_K)).join(' ')}"` : ''}${o.op != null ? ` stroke-opacity="${clamp(o.op).toFixed(2)}"` : ''}/>`;
// ring(c3, axis, r, colour, w, op): a circle on a face. ripples(c3, axis, st.t, amt, {n, speed, r0, r1, col, w}): rings
// spreading out and fading (sound, waves on water, an earthquake), on the plane facing axis 'x' | 'y' | 'z'.
const ring = (c3, axis, r, col = INK, w = 1, op = 1) => {
  const [pl, u0, v0] = planeAt(axis, c3);
  return curve(on(pl, ellUV(u0, v0, r, r, 40)), col, w, { close: true, op });
};
function ripples(c3, axis, t, amt, o = {}) {
  if (amt <= 0.01) return '';
  const n = o.n ?? 4,
    sp = o.speed ?? 0.5,
    r0 = o.r0 ?? 1,
    r1 = o.r1 ?? 30;
  let s = '';
  for (let i = 0; i < n; i++) {
    const ph = frac(t * sp + i / n);
    s += ring(
      c3,
      axis,
      r0 + (r1 - r0) * ph,
      o.col ?? '#3b6fd8',
      o.w ?? 1.2,
      amt * (1 - ph) * Math.min(1, ph * 8)
    );
  }
  return s;
}
// prism(points2, z0, h, m, w): an upright solid from ANY flat outline [[x, y], ...] (a tile, a map region, a plinth,
// a letter shape), convex or not. Sides shaded, top on top, every visible edge inked.
function prism(pts2, z0, h, m, w = 0.9) {
  let area = 0;
  for (let i = 0; i < pts2.length; i++) {
    const a = pts2[i],
      b = pts2[(i + 1) % pts2.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const sg = area > 0 ? 1 : -1,
    sides = [];
  for (let i = 0; i < pts2.length; i++) {
    const a = pts2[i],
      b = pts2[(i + 1) % pts2.length],
      nr = norm([sg * (b[1] - a[1]), -sg * (b[0] - a[0]), 0]);
    if (!vis(nr)) continue;
    const q = [
      [a[0], a[1], z0],
      [b[0], b[1], z0],
      [b[0], b[1], z0 + h],
      [a[0], a[1], z0 + h],
    ];
    sides.push({ at: avg(q), svg: shape(q, tone(nr, m), w * 0.8) });
  }
  return (
    byDepth(sides) +
    shape(
      pts2.map(p => [p[0], p[1], z0 + h]),
      tone([0, 0, 1], m),
      w
    )
  );
}
// vessel(c3, r, h, level, liquidM, {glass, tint}): an upright glass vessel (beaker, jar, tank) standing at c3, filled
// to level (0..1). Returns {back, liquid, front, svg}: draw back, then anything inside (an electrode, a plant's roots),
// then liquid, then front, so the inside stays visible. liquidM null = empty.
function vessel(c3, r, h, level, liquidM, o = {}) {
  const [x, y, z] = c3,
    G = o.glass && o.glass !== true ? asM(o.glass) : MAT.glass,
    ringAt = (zz, rr = r) => on(PZ(zz), ellUV(x, y, rr, rr, 36)),
    lz = z + 0.6 + (h - 1) * clamp(level);
  const back =
    `<g opacity=".85">${loft(ringAt(z + 0.5, r - 0.3), ringAt(z + h, r - 0.3), n => toneI(n, G), true)}</g>` +
    fill(pd(ringAt(z + 0.5, r - 0.3)), mix(G.m, '#ffffff', 0.4));
  const liquid =
    (liquidM = liquidM && asM(liquidM)) && level > 0.01
      ? `<g opacity="${o.liquidOp ?? 0.8}">${loft(ringAt(z + 0.6, r - 0.4), ringAt(lz, r - 0.4), n => tone(n, liquidM))}${fill(pd(ringAt(lz, r - 0.4)), liquidM.l)}</g>` +
        ink(pd(ringAt(lz, r - 0.4)), 0.5)
      : '';
  const hl = a => {
    const c = Math.cos(a),
      d = Math.sin(a);
    return `<path d="${pd(
      [
        [x + r * c, y + r * d, z + h * 0.12],
        [x + r * c, y + r * d, z + h * 0.88],
      ],
      false
    )}" stroke="#fff" stroke-width="${f(Math.max(0.8, r * 0.12))}" stroke-linecap="round" opacity=".75" fill="none"/>`;
  };
  const front =
    `<g opacity="${o.tint ?? 0.25}">${loft(ringAt(z), ringAt(z + h), n => toneI(n, G))}</g>` +
    hl(-0.6) +
    hl(-0.35) +
    fill(
      pd([...ringAt(z + h), ...ringAt(z + h, r - 0.5).reverse()]),
      'rgba(255,255,255,.6)',
      'fill-rule="evenodd"'
    ) +
    hullInk([...ringAt(z), ...ringAt(z + h)], 1.4) +
    ink(pd(ringAt(z + h)), 1);
  return { back, liquid, front, svg: back + liquid + front };
}
// meter(c3, h, r, v, {m, marks: [{at, label}], label}): a glass tube that fills to v (0..1), for any amount you want to
// compare with a line: votes against a majority, suspense, antibodies, a budget. Marks are rings with short text.
function meter(c3, h, r, v, o = {}) {
  const ves = vessel(c3, r, h, v, o.m || { l: '#7fd18b', m: '#45a95a', d: '#2b6e3a' }, { liquidOp: 0.92 });
  let s = ves.back + ves.liquid;
  for (const mk of o.marks || []) {
    const zz = c3[2] + 0.6 + (h - 1) * clamp(mk.at),
      [X, Y] = P(c3[0] + r * 0.72, c3[1] - r * 0.72, zz);
    s +=
      ring([c3[0], c3[1], zz], 'z', r + 0.2, INK, 0.8) +
      (mk.label
        ? `<text x="${f(X + 2.2 * INK_K)}" y="${f(Y + 1.2 * INK_K)}" font-size="${f(5.5 * INK_K * LABEL_K)}" font-family="${SANS}" font-weight="650" fill="${INK}" stroke="#fff" stroke-width="${f(2 * INK_K)}" paint-order="stroke">${esc(mk.label)}</text>`
        : '');
  }
  return s + ves.front;
}
/* ---------- parts for any topic: organic shapes, people, words, graphs, mixed scales ---------- */
// blob(c3, rx, ry, rz, m, {lumps, seed, w}): a soft rounded body (a cell, an organ, a cloud, a stone, a head of
// broccoli). rx/ry/rz = radii; lumps 0..0.3 makes it uneven. Shaded smoothly, heavy outline.
function blob(c3, rx, ry, rz, m, o = {}) {
  m = asM(m);
  const lum = o.lumps || 0,
    sd = o.seed || 1,
    pts = [];
  for (let i = 0; i <= 10; i++)
    for (let j = 0; j < 18; j++) {
      const th = (i / 10) * Math.PI,
        ph = (j / 18) * 2 * Math.PI,
        nz = Math.sin(ph * 3 + sd) * Math.sin(th * 2 + sd * 1.7) + Math.sin(ph * 5 + sd * 2.3) * 0.5;
      const k = 1 + lum * nz;
      pts.push(
        P(
          c3[0] + rx * k * Math.sin(th) * Math.cos(ph),
          c3[1] + ry * k * Math.sin(th) * Math.sin(ph),
          c3[2] + rz * k * Math.cos(th)
        )
      );
    }
  const h = hull(pts),
    id = gid('bl');
  return (
    `<radialGradient id="${id}" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="${mix(m.l, '#ffffff', 0.25)}"/><stop offset=".5" stop-color="${m.l}"/><stop offset=".85" stop-color="${m.m}"/><stop offset="1" stop-color="${m.d}"/></radialGradient>` +
    `<path d="${sp(h)}" fill="url(#${id})" stroke="${INK}" stroke-width="${o.w ?? 1.3}" stroke-linejoin="round"/>`
  );
}
// lathe(c3, profile, m, {n, w, cap}): a round shell spun around an upright axis (a vase, a bottle, a cell body,
// a heart chamber, a tree trunk, a lamp). profile = [[radius, height], ...] from bottom to top, heights above c3.
function lathe(c3, prof, m, o = {}) {
  const n = o.n || 28,
    rings = prof.map(([r, z]) =>
      on(PZ(c3[2] + z), ellUV(c3[0], c3[1], Math.max(r, 0.001), Math.max(r, 0.001), n))
    );
  let s = '';
  for (let i = 1; i < rings.length; i++) s += loft(rings[i - 1], rings[i], nr => toneI(nr, m));
  const top = rings[rings.length - 1],
    w = o.w ?? 1.3;
  if (o.cap !== false && prof[prof.length - 1][0] > 0.01)
    s += fill(pd(top), toneI([0, 0, 1], m)) + ink(pd(top), w * 0.7);
  if (VIEW_MODE === 'plan') {
    const big = rings[prof.reduce((b, p, i) => (p[0] > prof[b][0] ? i : b), 0)];
    return s + ink(pd(big), w);
  }
  const side = pick => rings.map(rg => rg.map(p => P(...p)).reduce((a, b) => (pick(b[0], a[0]) ? b : a)));
  const L2 = side((u, v) => u < v),
    R2 = side((u, v) => u > v);
  return (
    s +
    `<path d="M${L2.map(q => f(q[0]) + ' ' + f(q[1])).join('L')}M${R2.map(q => f(q[0]) + ' ' + f(q[1])).join('L')}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>` +
    ink(
      pd(on(PZ(c3[2] + prof[0][1]), arcUV(c3[0], c3[1], Math.max(prof[0][0], 0.001), -45, 135, 16)), false),
      w
    )
  );
}
// person(p3, {m, skin, hair, h, arms: 'down' | 'up' | 'out' | 'wave' | 'hold', sit, sad, face}): a simple friendly
// figure at p3 (its feet, or the floor under its stool when sit: true): a voter, a judge, a reader, a customer.
// Colour people by role, not by look. h = standing height (default 14). arms: 'hold' puts one hand forward at chest
// height: draw what they hold at personHand(p3, o).
const _pBody = (p3, o) => {
  const h = o.h || 14,
    b = p3[2] + (o.sit ? h * 0.27 : 0),
    k = o.sit ? 0.62 : 1;
  return { h, b, k, sh: b + h * 0.56 * k, hd: b + h * (0.56 * k + 0.24) };
};
function personHand(p3, o = {}) {
  const { h, b, k } = _pBody(p3, o);
  return [p3[0] + h * 0.24, p3[1] + h * 0.1, b + h * 0.42 * k + (o.sit ? h * 0.05 : 0)];
}
function person(p3, o = {}) {
  const [x, y, z] = p3,
    m = asM(o.m || '#4f7fd6'),
    skin = asM(o.skin || '#e9b48e'),
    { h, b, k, sh: shz, hd: hdz } = _pBody(p3, o);
  const sh = [x, y, shz],
    hd = [x, y, hdz],
    ar = o.arms || 'down',
    aw = h * 0.055;
  const arm = sgn => {
    const s0 = [x, y + sgn * h * 0.15, shz - h * 0.04];
    const e =
      ar === 'hold' && sgn > 0
        ? personHand(p3, o)
        : ar === 'up' || (ar === 'wave' && sgn < 0)
          ? [x + h * 0.05, y + sgn * h * 0.25, shz + h * 0.34]
          : ar === 'out'
            ? [x + h * 0.15, y + sgn * h * 0.36, shz - h * 0.06]
            : [x + h * 0.02, y + sgn * h * 0.2, shz - h * 0.34 * k];
    return rod(s0, e, aw, m) + ball(e, aw * 1.4, skin, 0.8);
  };
  let s = ground(x, y, z, h * 0.28) + '<g class="person">';
  {
    const pa = P(x, y, z),
      pb = P(...hd),
      Rh = h * 0.2 * 1.25;
    _PEOPLE.push({
      x: (pa[0] + pb[0]) / 2,
      y: (pa[1] + pb[1] - Rh) / 2,
      w: Rh * 2.2,
      h: Math.abs(pa[1] - pb[1]) + Rh * 1.4,
    });
  }
  if (o.sit) s += cyl(x, y, z, b - h * 0.02, h * 0.19, asM(o.seat || MAT.wood), toneI, 1, 16);
  s +=
    arm(1) +
    rod([x, y, b], sh, h * 0.2 * (o.sit ? 0.95 : 1), m, toneI, 1.2, h * 0.15) +
    ball(sh, h * 0.15, m, 1.1) +
    arm(-1);
  const [X, Y] = P(...hd),
    R = h * 0.14 * 1.2247;
  s += ball(hd, h * 0.14, skin, 1);
  if (o.hair)
    s += `<path d="M${f(X - R * 1.02)} ${f(Y - R * 0.02)}A${f(R * 1.02)} ${f(R * 1.02)} 0 0 1 ${f(X + R * 1.02)} ${f(Y - R * 0.02)}Q${f(X + R * 0.5)} ${f(Y - R * 0.62)} ${f(X - R * 0.1)} ${f(Y - R * 0.5)}Q${f(X - R * 0.7)} ${f(Y - R * 0.42)} ${f(X - R * 1.02)} ${f(Y - R * 0.02)}Z" fill="${o.hair}" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`;
  if (o.face !== false)
    s +=
      `<circle cx="${f(X - R * 0.28)}" cy="${f(Y + R * 0.05)}" r="${f(R * 0.11)}" fill="${INK}"/><circle cx="${f(X + R * 0.28)}" cy="${f(Y + R * 0.05)}" r="${f(R * 0.11)}" fill="${INK}"/>` +
      `<path d="M${f(X - R * 0.3)} ${f(Y + R * (o.sad ? 0.5 : 0.36))}Q${f(X)} ${f(Y + R * (o.sad ? 0.22 : 0.64))} ${f(X + R * 0.3)} ${f(Y + R * (o.sad ? 0.5 : 0.36))}" fill="none" stroke="${INK}" stroke-width="${f(R * 0.11)}" stroke-linecap="round"/>`;
  return s + '</g>';
}
// Words in the picture. Wraps to cols characters. Inline marks: [[words]] highlighted, [[words|#c7e3ff]] in a colour,
// **words** bold, ~~words~~ struck out. Text stays flat and readable at any zoom.
function _words(lines, cols) {
  const out = [];
  let cur = [],
    len = 0;
  for (const ln of [].concat(lines)) {
    const toks = [];
    String(ln).replace(
      /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]|\*\*([^*]+)\*\*|~~([^~]+)~~|([^\s\[*~]+|[\[*~])/g,
      (_, hi, hc, b, st, w) => {
        const st2 = hi ? { hi: hc || '#ffe07a' } : b ? { b: 1 } : st ? { st: 1 } : {};
        for (const word of String(hi || b || st || w).split(/\s+/)) if (word) toks.push({ t: word, ...st2 });
        return '';
      }
    );
    for (const t of toks) {
      if (len && len + 1 + t.t.length > cols) {
        out.push(cur);
        cur = [];
        len = 0;
      }
      t.at = len ? len + 1 : 0;
      len = t.at + t.t.length;
      cur.push(t);
    }
    out.push(cur);
    cur = [];
    len = 0;
  }
  return out;
}
function _textBlock(x0, y0, rows, fs, col = INK, sans = false) {
  const cw = fs * (sans ? 0.55 : 0.6),
    lh = fs * 1.45,
    fam = sans ? SANS : 'ui-monospace,Menlo,Consolas,monospace';
  let s = '';
  rows.forEach((r, i) => {
    const yb = y0 + i * lh;
    for (const t of r) {
      const x = x0 + t.at * cw,
        w = t.t.length * cw;
      if (t.hi)
        s += `<rect x="${f(x - cw * 0.2)}" y="${f(yb - fs * 0.95)}" width="${f(w + cw * 0.4)}" height="${f(fs * 1.25)}" rx="${f(fs * 0.2)}" fill="${t.hi}"/>`;
      s += `<text x="${f(x)}" y="${f(yb)}" font-size="${f(fs)}" font-family="${fam}" font-weight="${t.b || t.hi ? 700 : 450}" fill="${col}">${esc(t.t)}</text>`;
      if (t.st)
        s += `<path d="M${f(x - cw * 0.15)} ${f(yb - fs * 0.3)}h${f(w + cw * 0.3)}" stroke="#c8322a" stroke-width="${f(fs * 0.16)}" stroke-linecap="round"/>`;
    }
  });
  return s;
}
// card(p3, lines, {cols, dx, dy, title, size, tilt}): a sheet of paper with real words on it, pinned near p3 (a sentence
// being edited, a line of a poem, a rule, a law's text, code). Use for language, writing, logic and law topics.
function card(p3, lines, o = {}) {
  const k = INK_K * (1 + (LABEL_K - 1) * 0.5),
    sz = o.size || 1,
    fs = (sz > 3 ? sz : 8.5 * sz) * k,
    rows = _words(lines, o.cols || 30),
    cw = fs * 0.6,
    lh = fs * 1.45;
  const w =
    Math.max(
      ...rows.map(r => (r.length ? r[r.length - 1].at + r[r.length - 1].t.length : 0)),
      o.title ? o.title.length * 0.95 : 0
    ) *
      cw +
    fs * 2.2;
  const th = o.title ? fs * 1.6 : 0,
    hgt = rows.length * lh + fs * 1.2 + th,
    [X, Y] = p3.length === 2 ? p3 : P(...p3);
  const [pcx, pcy] = _place(X + (o.dx ?? 0) * INK_K, Y + (o.dy ?? 0) * INK_K, w, hgt, [X, Y]),
    x0 = pcx - w / 2,
    y0 = pcy - hgt / 2;
  if (_TAGS) _TAGS.push({ x: x0 + w / 2, y: y0 + hgt / 2, w, h: hgt });
  return (
    `<g class="card whole" data-ax="${f(X)}" data-ay="${f(Y)}"${o.tilt ? ` transform="rotate(${o.tilt} ${f(X)} ${f(Y)})"` : ''}><rect x="${f(x0 + 2 * INK_K)}" y="${f(y0 + 2.5 * INK_K)}" width="${f(w)}" height="${f(hgt)}" rx="${f(2 * INK_K)}" fill="rgba(28,32,48,.14)"/>` +
    `<rect x="${f(x0)}" y="${f(y0)}" width="${f(w)}" height="${f(hgt)}" rx="${f(2 * INK_K)}" fill="#fffdf6" stroke="${INK}" stroke-width="1"/>` +
    (o.title
      ? `<text x="${f(x0 + fs * 1.1)}" y="${f(y0 + fs * 1.55)}" font-size="${f(fs * 0.8)}" font-family="${SANS}" font-weight="700" fill="#6b6455" letter-spacing=".06em">${esc(o.title.toUpperCase())}</text>`
      : '') +
    _textBlock(x0 + fs * 1.1, y0 + th + fs * 1.45, rows, fs) +
    '</g>'
  );
}
// bubble(p3, text, {dx, dy, cols, think}): a speech (or thought) bubble with its tail at p3 (what a person says).
function bubble(p3, text, o = {}) {
  const k = INK_K * (1 + (LABEL_K - 1) * 0.5),
    sz = o.size || 1,
    fs = (sz > 3 ? sz : 8.5 * sz) * k,
    rows = _words(text, o.cols || 24),
    cw = fs * 0.52,
    lh = fs * 1.45;
  const w =
      Math.max(...rows.map(r => (r.length ? r[r.length - 1].at + r[r.length - 1].t.length : 0))) * cw +
      fs * 1.8,
    hgt = rows.length * lh + fs * 1;
  const [X, Y] = p3.length === 2 ? p3 : P(...p3),
    [cx, cy] = _place(X + (o.dx ?? 18) * INK_K, Y + (o.dy ?? -26) * INK_K, w, hgt, [X, Y], true),
    x0 = cx - w / 2,
    y0 = cy - hgt / 2;
  if (_TAGS) _TAGS.push({ x: cx, y: cy, w, h: hgt });
  const bx = clamp(X, x0 + hgt * 0.4, x0 + w - hgt * 0.4),
    by = Y < cy ? y0 : y0 + hgt,
    ox = (X < cx ? 1 : -1) * fs * 0.7;
  const tail = o.think
    ? [0.35, 0.6]
        .map(
          (t, i) =>
            `<circle cx="${f(X + (bx - X) * t)}" cy="${f(Y + (by - Y) * t)}" r="${f(fs * (0.22 + i * 0.14))}" fill="#fff" stroke="${INK}" stroke-width="1"/>`
        )
        .join('')
    : `<path d="M${f(bx - ox)} ${f(by)}L${f(X)} ${f(Y)}L${f(bx + ox)} ${f(by)}" fill="#fff" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`;
  return (
    `<g class="bubble">${tail}<rect x="${f(x0)}" y="${f(y0)}" width="${f(w)}" height="${f(hgt)}" rx="${f(Math.min(hgt / 2, fs * 1.4))}" fill="#fff" stroke="${INK}" stroke-width="1.1"/>` +
    (o.think
      ? ''
      : `<path d="M${f(bx - ox * 0.8)} ${f(by)}L${f(bx + ox * 0.8)} ${f(by)}" stroke="#fff" stroke-width="2"/>`) +
    (sans => {
      const g = [];
      rows.forEach(r => {
        let line = r.map(t => t.t).join(' ');
        g.push(line);
      });
      return g
        .map(
          (ln, i) =>
            `<text x="${f(x0 + w / 2)}" y="${f(y0 + fs * 1.35 + i * lh)}" font-size="${f(fs)}" text-anchor="middle" font-family="${SANS}" font-weight="550" fill="${INK}">${esc(ln)}</text>`
        )
        .join('');
    })() +
    '</g>'
  );
}
// graph(c3, w, h, {xr, yr, axis}): a real chart standing in the scene (or flat in view 'front' / 'plan'). c3 = the
// bottom-left corner, w and h its size. Returns helpers that each give SVG: g.axes({x, y, ticks}), g.curve(fn or
// [[x, y]...], colour, {w, dash, label}), g.dot(x, y, colour, {r, label}), g.band(x0, x1, y0, y1, colour, op),
// g.guide({x} or {y}, colour, label), and g.pt(x, y) = the 3D point (for tags and tokens).
function graph(c3, w, h, o = {}) {
  const [x0, x1] = o.xr || [0, 10],
    [y0, y1] = o.yr || [0, 10],
    ax = o.axis || 'screen';
  // 'screen' (default): flat to the viewer like a poster, so it reads in every view; 'x' / 'y' / 'z': painted on that face
  const H =
    ax === 'screen'
      ? VIEW_MODE === 'iso'
        ? [0.5 / C, -0.5 / C, 0]
        : VIEW_MODE === 'front'
          ? [0, -1, 0]
          : [1, 0, 0]
      : ax === 'y' || ax === 'z'
        ? [1, 0, 0]
        : [0, -1, 0];
  const V = (ax === 'screen' && VIEW_MODE === 'plan') || ax === 'z' ? [0, -1, 0] : [0, 0, 1];
  const pt = (xv, yv) => {
    const a = ((xv - x0) / (x1 - x0)) * w,
      b = ((yv - y0) / (y1 - y0)) * h;
    return [c3[0] + H[0] * a + V[0] * b, c3[1] + H[1] * a + V[1] * b, c3[2] + H[2] * a + V[2] * b];
  };
  const lbl = (p, t, col = INK, dx = 0, dy = 0, anc = 'middle', size = 7.5) => {
    const [X, Y] = P(...p),
      k = INK_K * LABEL_K * (o.size || 1.15);
    return `<text x="${f(X + dx * k)}" y="${f(Y + dy * k)}" font-size="${f(size * k)}" text-anchor="${anc}" font-family="${SANS}" font-weight="650" fill="${col}" stroke="#fff" stroke-width="${f(2.2 * INK_K)}" paint-order="stroke">${esc(t)}</text>`;
  };
  const g = {
    pt,
    panel: (m = '#f8f9fb') =>
      `<g class="whole">` + shape([pt(x0, y0), pt(x1, y0), pt(x1, y1), pt(x0, y1)], m, 0.6) + '</g>',
    axes: (a = {}) => {
      let s =
        '<g class="whole">' +
        arrow3([pt(x0, y0), pt(x1, y0)], 1.2, INK, { head: 4 }) +
        arrow3([pt(x0, y0), pt(x0, y1)], 1.2, INK, { head: 4 });
      for (const t of a.xticks || [])
        s +=
          line([pt(t, y0), pt(t, y0 - (y1 - y0) * 0.03)], 0.7) +
          lbl(pt(t, y0), String(a.xfmt ? a.xfmt(t) : t), INK_SOFT, 0, 10, 'middle', 6.5);
      for (const t of a.yticks || [])
        s +=
          line([pt(x0, t), pt(x0 - (x1 - x0) * 0.02, t)], 0.7) +
          lbl(pt(x0, t), String(a.yfmt ? a.yfmt(t) : t), INK_SOFT, -4, 2, 'end', 6.5);
      if (a.x) s += lbl(pt(x1, y0), a.x, INK, 0, a.xticks ? 17 : 10, 'end');
      if (a.y) s += lbl(pt(x0, y1), a.y, INK, 4, -3, 'start');
      return s + '</g>';
    },
    curve: (fnOrPts, col = '#2f6fd0', c = {}) => {
      const pts =
        typeof fnOrPts === 'function'
          ? Array.from({ length: 61 }, (_, i) => {
              const xv = x0 + ((x1 - x0) * i) / 60;
              return [xv, fnOrPts(xv)];
            })
          : fnOrPts;
      const vis2 = pts.filter(
        p =>
          isFinite(p[1]) &&
          (c.to == null || p[0] <= c.to) &&
          (c.from == null || p[0] >= c.from) &&
          p[1] >= y0 - (y1 - y0) * 0.02 &&
          p[1] <= y1 + (y1 - y0) * 0.02
      );
      if (vis2.length < 2) return '';
      const end = vis2[vis2.length - 1];
      return (
        curve(
          vis2.map(p => pt(p[0], p[1])),
          col,
          c.w || 2,
          { dash: c.dash, op: c.op }
        ) + (c.label ? lbl(pt(end[0], end[1]), c.label, col, 4, -4, 'start') : '')
      );
    },
    dot: (xv, yv, col = '#e0452f', c = {}) => {
      const [X, Y] = P(...pt(xv, yv)),
        r = (c.r || 2.6) * INK_K;
      return (
        `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(r)}" fill="${col}" stroke="${INK}" stroke-width="1"/>` +
        (c.label ? lbl(pt(xv, yv), c.label, INK, 5, -5, 'start') : '')
      );
    },
    band: (bx0, bx1, by0, by1, col = '#f2c94c', op = 0.35) =>
      `<path d="${pd([pt(bx0, by0), pt(bx1, by0), pt(bx1, by1), pt(bx0, by1)])}" fill="${col}" fill-opacity="${op}"/>`,
    guide: (at, col = INK_SOFT, label) => {
      const p = at.x != null ? [pt(at.x, y0), pt(at.x, y1)] : [pt(x0, at.y), pt(x1, at.y)];
      return (
        curve(p, col, 0.9, { dash: 2.5 }) +
        (label
          ? lbl(
              p[1],
              label,
              col,
              at.x != null ? 0 : -2,
              at.x != null ? -4 : -3,
              at.x != null ? 'middle' : 'end',
              5.5
            )
          : '')
      );
    },
    label: (xv, yv, t, col = INK) => lbl(pt(xv, yv), t, col),
  };
  return g;
}
// inset({at, r, src, k, from, label}, draw): a round magnifier bubble for things too small to see at the scene's
// scale (cells in an arm, atoms in a wire, a chip on a board). draw() draws the close-up with the usual helpers,
// around src: a spot far away from the main scene, e.g. [400, 0, 0]. It is shown k times bigger in a bubble of
// radius r centred at at, with lines to from (the place it magnifies). Label things inside with
// tag(insetPt(o, p3), dx, dy, 'Name'): insetPt maps a close-up point into the bubble.
const FAR = [0, 1000, 1000]; // a spot off the scene in every view: draw inset close-ups around it
function insetPt(o, p3) {
  o.src = o.src || FAR;
  const [X, Y] = P(...o.at),
    pv = VIEW_MODE;
  if (o.view) setView(o.view);
  const [SX, SY] = P(...o.src),
    [x, y] = P(...p3);
  setView(pv);
  return [X + (x - SX) * o.k, Y + (y - SY) * o.k];
}
function inset(o, draw) {
  o.src = o.src || FAR;
  const [X, Y] = P(...o.at),
    R = o.r,
    k = o.k || 4,
    id = gid('in'),
    pv = VIEW_MODE;
  if (o.view) setView(o.view);
  _INK_DIV = k;
  const [SX, SY] = P(...o.src),
    raw = String(draw());
  _INK_DIV = 1;
  setView(pv);
  const inner = raw.replace(/stroke-width="([\d.]+)"/g, (_, w) => `stroke-width="${(+w / k).toFixed(3)}"`);
  let s = '';
  if (o.from) {
    const [FX, FY] = P(...o.from),
      fr = (o.fromR || 3) * 1.2,
      dx = X - FX,
      dy = Y - FY,
      dl = Math.hypot(dx, dy) || 1,
      nx = -dy / dl,
      ny = dx / dl;
    s +=
      `<path d="M${f(FX + nx * fr)} ${f(FY + ny * fr)}L${f(X + nx * R)} ${f(Y + ny * R)}M${f(FX - nx * fr)} ${f(FY - ny * fr)}L${f(X - nx * R)} ${f(Y - ny * R)}" stroke="${INK_SOFT}" stroke-width=".8" stroke-dasharray="${f(2 * INK_K)} ${f(1.6 * INK_K)}" fill="none"/>` +
      (o.marker === false
        ? ''
        : `<circle cx="${f(FX)}" cy="${f(FY)}" r="${f(fr)}" fill="rgba(255,255,255,.35)" stroke="${INK}" stroke-width="1.1"/>`);
  }
  s +=
    `<circle cx="${f(X + 1.6 * INK_K)}" cy="${f(Y + 2.2 * INK_K)}" r="${f(R)}" fill="rgba(28,32,48,.16)"/>` +
    `<clipPath id="${id}"><circle cx="${f(X)}" cy="${f(Y)}" r="${f(R)}"/></clipPath><g clip-path="url(#${id})"><circle cx="${f(X)}" cy="${f(Y)}" r="${f(R)}" fill="${o.bg || '#f6f8fb'}"/>` +
    `<g transform="translate(${f(X)} ${f(Y)}) scale(${k}) translate(${f(-SX)} ${f(-SY)})">${inner}</g></g>` +
    `<circle class="inset" cx="${f(X)}" cy="${f(Y)}" r="${f(R)}" fill="none" stroke="${INK}" stroke-width="1.8"/>`;
  _INSETS.push({ x: X, y: Y, w: 2 * R, h: 2 * R });
  if (o.label) {
    const fs = 6.5 * INK_K * LABEL_K;
    s += `<text x="${f(X)}" y="${f(Y + R + fs * 1.5)}" font-size="${f(fs)}" text-anchor="middle" font-family="${SANS}" font-weight="650" fill="${INK_SOFT}" stroke="#fff" stroke-width="${f(2.2 * INK_K)}" paint-order="stroke">${esc(o.label)}</text>`;
  }
  return s;
}
// litBall(p3, r, sun3, {m, night, k, ang}): a ball lit from one side by a distant light in direction sun3 (a planet,
// the Moon, a ball under a lamp): the lit part and the dark part split along the true line between day and night,
// as seen from the viewer. k (-1..1, how much faces the viewer: 1 full, 0 half, -1 new) and ang (degrees, the
// screen direction the light comes from) override the geometry, e.g. to draw the Moon "as seen from Earth".
function litBall(p3, r, sun3, o = {}) {
  const m = asM(o.m || '#e8e4da'),
    night = o.night || '#3a3f4b',
    [X, Y] = P(...p3),
    R = r * 1.2247;
  const sd = norm(sun3),
    v = norm(VDIR),
    ds = Dv(...sd),
    k = o.k ?? dot(sd, v),
    a = o.ang ?? (Math.atan2(ds[1], ds[0]) * 180) / Math.PI;
  const e = Math.abs(k) * R,
    id = gid('lb');
  const lit = `M0 ${f(-R)}A${f(R)} ${f(R)} 0 0 1 0 ${f(R)}A${f(Math.max(e, 0.01))} ${f(R)} 0 0 ${k > 0 ? 1 : 0} 0 ${f(-R)}Z`;
  return (
    `<radialGradient id="${id}" cx=".62" cy=".42" r=".7"><stop offset="0" stop-color="${mix(m.l, '#ffffff', 0.3)}"/><stop offset="1" stop-color="${m.m}"/></radialGradient>` +
    `<g transform="translate(${f(X)} ${f(Y)}) rotate(${a.toFixed(1)})"><circle r="${f(R)}" fill="${night}"/><path d="${lit}" fill="url(#${id})"/><circle r="${f(R)}" fill="none" stroke="${INK}" stroke-width="1.1"/></g>`
  );
}
// table(c3, w, d, h, m, {top, legs}): a table or desk standing at c3 (centre of its footprint), w along y, d along x:
// a rounded top with thickness on four tapered legs, not a plain box. legs: false gives a solid counter.
function table(c3, w, d, h, m, o = {}) {
  const [x, y, z] = c3,
    mm = asM(m || MAT.wood),
    t = o.top || Math.max(0.8, h * 0.07),
    r = Math.min(w, d) * 0.12,
    s0 = ground(x, y, z, Math.max(w, d) * 0.55, Math.min(w, d) * 0.5);
  const top = rrUV(x - d / 2, y - w / 2, x + d / 2, y + w / 2, r);
  if (o.legs === false) return s0 + prism(top, z, h, mm);
  let s = s0;
  const lx = d / 2 - r * 0.9,
    ly = w / 2 - r * 0.9,
    lr = Math.max(0.35, Math.min(w, d) * 0.035);
  for (const [sx, sy] of [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ])
    s += rod(
      [x + sx * lx, y + sy * ly, z],
      [x + sx * lx, y + sy * ly, z + h - t],
      lr * 0.75,
      mm,
      toneI,
      0.9,
      lr
    );
  return s + prism(top, z + h - t, t, mm);
}
// hop(points3, s, lift): where something is at stage s (0 = first point, 1 = second, 1.5 = halfway to the third...),
// hopping in an arc of height lift between points. For a bill passed desk to desk, a ball passed between players.
function hop(pts3, s, lift = 10) {
  const i = Math.min(Math.floor(clamp(s, 0, pts3.length - 1)), pts3.length - 2),
    t = clamp(s - i);
  const p = lerp3(pts3[i], pts3[i + 1], ease(t));
  return [p[0], p[1], p[2] + Math.sin(Math.PI * t) * lift];
}
// trail(t, draw, {n, dt, op}): faded copies of draw(time) a little in the past, so motion shows even in a still
// (a swinging pendulum, a vibrating string, a falling ball). draw(tt) returns SVG for time tt.
function trail(t, draw, o = {}) {
  const n = o.n ?? 4,
    dt = o.dt ?? 0.05,
    op = o.op ?? 0.45;
  let s = '';
  for (let i = n; i >= 1; i--) s += fade(op * (1 - i / (n + 1)), draw(t - i * dt));
  return s + draw(t);
}

/* ---------- v2 parts: tubes, branches, membranes, helices, molecules, fine machine detail ---------- */
// Seeded random numbers, so a branching tree or a scatter looks the same on every frame: _rng(seed)() gives 0..1.
const _rng = seed => {
  let a = (Math.round(seed * 9973) * 2654435761) >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const _axis = a => (typeof a === 'string' ? AXN[a.replace('-', '')].map(v => (a[0] === '-' ? -v : v)) : norm(a));
// rotate vector v about unit axis k by angle a (radians)
const _rot = (v, k, a) => {
  const c = Math.cos(a),
    s = Math.sin(a),
    kv = cross(k, v),
    kd = dot(k, v);
  return [0, 1, 2].map(i => v[i] * c + kv[i] * s + k[i] * kd * (1 - c));
};
const _perp = d => norm(cross(d, Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]));
// A smooth route through 3D points (Catmull-Rom), resampled about `step` units apart. Ends stay where they are.
function _smooth3(pts, step = 3, close = false) {
  if (pts.length < 2) return pts.slice();
  const src = close ? pts.concat([pts[0]]) : pts,
    n = src.length,
    out = [src[0]];
  const at = i => (close ? src[(i + n - 1) % (n - 1)] : src[clamp(i, 0, n - 1)]);
  for (let i = 0; i < n - 1; i++) {
    const p0 = at(i - 1),
      p1 = src[i],
      p2 = src[i + 1],
      p3 = close && i + 2 >= n ? src[(i + 2) % (n - 1)] : at(i + 2),
      k = Math.max(1, Math.ceil(Math.hypot(...sub(p2, p1)) / step));
    for (let j = 1; j <= k; j++) {
      const t = j / k,
        t2 = t * t,
        t3 = t2 * t;
      out.push(
        [0, 1, 2].map(
          c =>
            0.5 *
            (2 * p1[c] +
              (-p0[c] + p2[c]) * t +
              (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 +
              (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)
        )
      );
    }
  }
  return out;
}
const _RK = () => (VIEW_MODE === 'iso' ? 1.12 : 1); // how wide a round tube of radius 1 looks on screen
const _LGT = [-0.42, -0.91]; // the light, as a screen direction (up and a little left)
let _INK_DIV = 1; // inside an inset, outlines are drawn k times thinner so they look the same after its zoom
// A tube drawn as layered strokes along screen points q with radii rr (screen units): an ink layer, the body, and
// shading (a dark side, a lit side and, in Clear, a soft shine). Strokes keep cusps and tight bends clean. The widths
// are written as style so they stay physical when the picture zooms. cap: 'round' or 'butt' (for pieces that join).
function _tubeLayers(q, rr, m, w = 1, cap = 'round') {
  const runs = [],
    n = q.length,
    span = Math.max(...rr) - Math.min(...rr);
  if (n < 2) return { ink: '', body: '', shade: '' };
  if (span < 0.04 * Math.max(...rr)) runs.push([0, n - 1]);
  else {
    // a tapering tube: one stroke per stretch whose radius stays within about 8%, overlapping by a point
    let a = 0;
    for (let i = 1; i < n; i++)
      if (i === n - 1 || Math.abs(rr[i] - rr[a]) > 0.08 * Math.max(rr[a], 0.3)) {
        runs.push([a, i]);
        a = i;
      }
  }
  const P2 = (d, col, wd, extra = '') =>
    `<path d="${d}" fill="none" stroke="${col}" style="stroke-width:${f(Math.max(0.1, wd))}" stroke-linecap="${cap}" stroke-linejoin="round"${extra}/>`;
  const wInk = (w * INK_K * STYLE.inkMul) / _INK_DIV;
  let ink = '',
    body = '',
    shade = '';
  for (const [i, j] of runs) {
    const d = smoothD(q.slice(i, j + 1), false),
      r = rr.slice(i, j + 1).reduce((a, v) => a + v, 0) / (j - i + 1);
    ink += P2(d, INK, 2 * r + 2 * wInk);
    body += P2(d, m.m, 2 * r);
  }
  // shading: one continuous stroke sized for the thinnest point (pieces would look dashed on a taper)
  // butt-ended pieces (a chunk of a longer tube) trim their shading a little, so it never pokes past the joint
  const qs =
    cap === 'butt' && n > 2
      ? [
          [q[0][0] + (q[1][0] - q[0][0]) * 0.45, q[0][1] + (q[1][1] - q[0][1]) * 0.45],
          ...q.slice(1, -1),
          [q[n - 1][0] + (q[n - 2][0] - q[n - 1][0]) * 0.45, q[n - 1][1] + (q[n - 2][1] - q[n - 1][1]) * 0.45],
        ]
      : q;
  for (const [i, j] of [[0, n - 1]]) {
    const d = smoothD(qs.slice(i, j + 1), false),
      r = Math.min(...rr.slice(i, j + 1)),
      c = cap,
      tr = k => ` transform="translate(${f(_LGT[0] * r * k)} ${f(_LGT[1] * r * k)})"`,
      S2 = (col, wd, extra) =>
        `<path d="${d}" fill="none" stroke="${col}" style="stroke-width:${f(Math.max(0.1, wd))}" stroke-linecap="${c}" stroke-linejoin="round"${extra}/>`;
    if (STYLE.smooth && r < 1.1) shade += S2(m.l, 0.8 * r, ` opacity=".9"${tr(0.35)}`); // a thin line: one highlight is enough
    else if (STYLE.smooth)
      shade +=
        S2(m.d, 0.9 * r, ` opacity=".4"${tr(-0.5)}`) +
        S2(m.l, 0.9 * r, ` opacity=".9"${tr(0.32)}`) +
        S2('#ffffff', 0.22 * r, ` opacity=".5"${tr(0.55)}`);
    else shade += S2(m.l, 0.8 * r, tr(0.4));
  }
  return { ink, body, shade };
}
// tube(points3, r, m, {r1, w, smooth, step, split}): a smooth round tube through 3D points: a cable, a hose, a blood
// vessel, an intestine, a nerve, a straw, a wire. r1 = radius at the end (taper). Drawn in one layer; for a tube
// that passes in front of some parts and behind others, pass split: true and mix the returned [{at, svg}] pieces
// into byDepth with the other parts.
function tube(pts3, r, m, o = {}) {
  m = asM(m);
  // sample about every 2 units (or more for fat tubes): smoothD draws curves through the points, so more adds only weight
  const pts = o.smooth === false ? pts3 : _smooth3(pts3, o.step || Math.max(2.2, r * 1.1)),
    n = pts.length,
    r1 = o.r1 ?? r,
    K = _RK(),
    rr = pts.map((_, i) => (r + (r1 - r) * (i / (n - 1 || 1))) * K),
    q = pts.map(p => P(...p));
  if (!o.split) {
    const t = _tubeLayers(q, rr, m, o.w ?? 1);
    return t.ink + t.body + t.shade;
  }
  const parts = [],
    step = o.chunk || 6;
  for (let i = 0; i < n - 1; i += step) {
    const j = Math.min(n - 1, i + step),
      t = _tubeLayers(q.slice(Math.max(0, i - 1), Math.min(n - 1, j + 1) + 1), rr.slice(Math.max(0, i - 1), Math.min(n - 1, j + 1) + 1), m, o.w ?? 1, i === 0 || j === n - 1 ? 'round' : 'butt');
    parts.push({ at: pts[Math.round((i + j) / 2)], svg: t.ink + t.body + t.shade });
  }
  return parts;
}
// cable(a3, b3, {sag, r, m, plug}): a cable or hose hanging between two points, sagging by `sag` units in the
// middle. plug: draw a small connector shell at each end so the cable visibly ends on something.
function cable(a3, b3, o = {}) {
  const r = o.r ?? 0.9,
    sag = o.sag ?? Math.hypot(...sub(b3, a3)) * 0.15,
    pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10,
      p = lerp3(a3, b3, t);
    pts.push([p[0], p[1], p[2] - sag * 4 * t * (1 - t)]);
  }
  let s = tube(pts, r, o.m || MAT.rubber, { w: o.w ?? 0.9 });
  if (o.plug !== false) {
    const d0 = norm(sub(pts[1], pts[0])),
      d1 = norm(sub(pts[9], pts[10]));
    s += rod(a3, add(a3, mul3(d0, r * 3)), r * 1.5, MAT.blackPlastic, toneI, 0.8);
    s += rod(b3, add(b3, mul3(d1, r * 3)), r * 1.5, MAT.blackPlastic, toneI, 0.8);
  }
  return s;
}
// tree(at3, dir3, {len, r, levels, kids, spread, shrink, taper, wiggle, seed, plane, droop}): a branching structure
// for branch(): nerve dendrites, roots, blood vessels, airways in a lung, tree limbs, river channels. Each level
// splits into `kids` branches turned up to `spread` degrees, `shrink` times as long. plane: keep every branch in
// the plane with this normal (e.g. [1, 0, 0] for a picture in 'front' view). droop: bend branches down (roots,
// willow) with a positive number, up with a negative one. Same seed, same tree.
function tree(at, dir, o = {}) {
  const rnd = _rng(o.seed ?? 7),
    segs = [],
    levels = o.levels ?? 3,
    kids = o.kids ?? 2,
    spread = ((o.spread ?? 34) * Math.PI) / 180,
    shrink = o.shrink ?? 0.7,
    taper = o.taper ?? 0.62,
    wig = o.wiggle ?? 0.14,
    droop = o.droop ?? 0,
    plane = o.plane ? norm(o.plane) : null,
    K = 6;
  const grow = (p, d, len, r, lev) => {
    const pts = [p];
    let cur = p,
      dd = norm(d);
    for (let i = 1; i <= K; i++) {
      const side = plane ? norm(cross(plane, dd)) : _rot(_perp(dd), dd, rnd() * 6.283);
      dd = norm(add(dd, mul3(side, wig * (rnd() * 2 - 1))));
      if (droop) dd = norm(add(dd, [0, 0, -droop * 0.08]));
      cur = add(cur, mul3(dd, len / K));
      pts.push(cur);
    }
    const r1 = r * taper;
    segs.push({ pts, r0: r, r1, level: lev });
    if (lev >= levels) return;
    for (let j = 0; j < kids; j++) {
      const t = kids === 1 ? 1 : 0.62 + (0.38 * j) / (kids - 1),
        idx = Math.round(t * K),
        rb = r + (r1 - r) * t,
        sign = j % 2 ? 1 : -1,
        ax = plane || norm(cross(dd, _rot(_perp(dd), dd, rnd() * 6.283))),
        nd = _rot(dd, ax, sign * spread * (0.6 + 0.5 * rnd()));
      grow(pts[idx], nd, len * shrink * (0.85 + 0.3 * rnd()), rb * 0.82, lev + 1);
    }
  };
  grow(at, dir, o.len ?? 30, o.r ?? 2.4, 1);
  return segs;
}
// branch(segments, m, {w, tips}): draw tree() output (or your own [{pts, r0, r1}]) as one smooth living shape: the
// branches merge where they join, with no seam, and taper to round tips. The result is one layer.
function branch(segs, m, o = {}) {
  m = asM(m);
  const K = _RK();
  let ink = '',
    body = '',
    shade = '';
  for (const sg of segs) {
    const pts = _smooth3(sg.pts, Math.max(2.2, (sg.r0 || 1) * 1.2)),
      n = pts.length,
      r1 = sg.r1 ?? sg.r0,
      t = _tubeLayers(
        pts.map(p => P(...p)),
        pts.map((_, i) => Math.max(0.15, sg.r0 + (r1 - sg.r0) * (i / (n - 1 || 1))) * K),
        m,
        o.w ?? 1
      );
    ink += t.ink;
    body += t.body;
    shade += t.shade;
  }
  return `<g class="bio">${ink}${body}${shade}</g>`;
}
// membrane(points3, {thick, gap, head, m, gaps: [{at, w}], close, tails}): a cell membrane cut through, along a
// route, drawn flat to the viewer: two rows of round heads with paired tails between them (a lipid bilayer). thick:
// how thick (units); gaps: places (at = 0..1 along the route, w = width in units) left open for a channel or pump.
// Best in 'front' view or inside an inset with view: 'front'.
function membrane(pts3, o = {}) {
  const th = o.thick ?? 7,
    gap = o.gap ?? th * 0.36,
    hr = o.head ?? th * 0.17,
    m = asM(o.m || '#f3c66d'),
    close = !!o.close,
    pts = _smooth3(pts3, Math.min(1, gap / 2), close),
    q = pts.map(p => P(...p)),
    n = q.length,
    cum = [0];
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]));
  const tot = cum[n - 1],
    sc = tot / Math.max(1e-6, pts.reduce((s, p, i) => (i ? s + Math.hypot(...sub(p, pts[i - 1])) : 0), 0)),
    G = (o.gaps || []).map(g => [g.at * tot - ((g.w ?? th) * sc) / 2, g.at * tot + ((g.w ?? th) * sc) / 2]);
  const thS = th * sc,
    hS = hr * sc;
  const nrm = i => {
    const a = q[Math.max(0, i - 1)],
      b = q[Math.min(n - 1, i + 1)],
      l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
  };
  const band = [],
    band2 = [];
  for (let i = 0; i < n; i++) {
    const [nx, ny] = nrm(i);
    band.push([q[i][0] + (nx * thS) / 2, q[i][1] + (ny * thS) / 2]);
    band2.push([q[i][0] - (nx * thS) / 2, q[i][1] - (ny * thS) / 2]);
  }
  let s = fill(close ? sp(band) + sp(band2) : sp(band.concat(band2.reverse())), mix(m.l, '#ffffff', 0.55), 'fill-rule="evenodd"'),
    tails = '',
    heads = '';
  let i = 0;
  for (let d = gap / 2; d < tot; d += gap * sc) {
    if (G.some(([a, b]) => d > a && d < b)) continue;
    while (i < n - 2 && cum[i + 1] < d) i++;
    const t = (d - cum[i]) / Math.max(1e-6, cum[i + 1] - cum[i]),
      c = [q[i][0] + (q[i + 1][0] - q[i][0]) * t, q[i][1] + (q[i + 1][1] - q[i][1]) * t],
      [nx, ny] = nrm(i),
      tx2 = -ny,
      ty2 = nx;
    for (const side of [1, -1]) {
      const hx = c[0] + side * nx * (thS / 2 - hS),
        hy = c[1] + side * ny * (thS / 2 - hS);
      if (o.tails !== false)
        for (const k of [-0.32, 0.32]) {
          const bx = hx + tx2 * hS * k,
            by = hy + ty2 * hS * k,
            ex = c[0] + side * nx * thS * 0.05 + tx2 * hS * k * 0.6,
            ey = c[1] + side * ny * thS * 0.05 + ty2 * hS * k * 0.6,
            mx = (bx + ex) / 2 + tx2 * hS * 0.25 * k,
            my = (by + ey) / 2 + ty2 * hS * 0.25 * k;
          tails += `M${f(bx)} ${f(by)}Q${f(mx)} ${f(my)} ${f(ex)} ${f(ey)}`;
        }
      heads += `<circle cx="${f(hx)}" cy="${f(hy)}" r="${f(hS)}" fill="${m.l}" stroke="${m.d}" stroke-width=".5"/>`;
    }
  }
  if (tails) s += `<path d="${tails}" fill="none" stroke="${m.d}" stroke-width=".45" stroke-linecap="round" opacity=".8"/>`;
  return `<g class="bio">${s}${heads}</g>`;
}
// channel(at3, dir3, {h, w, open, m, plug}): a protein channel or pore through a membrane at at3; dir3 = the
// membrane's normal (the way through). open 0..1 widens the pore between its two halves. plug: a gate drawn in
// the pore while it is closed (a ball or a flap, for gated channels). Flat to the viewer, like membrane().
function channel(at3, dir3, o = {}) {
  const m = asM(o.m || '#7f9fd6'),
    h = o.h ?? 10,
    w = o.w ?? 4,
    open = clamp(o.open ?? 1),
    [X, Y] = P(...at3),
    dv = Dv(...dir3),
    dl = Math.hypot(...dv) || 1,
    nd = [dv[0] / dl, dv[1] / dl],
    td = [-nd[1], nd[0]],
    gapW = 0.25 + open * w * 0.55;
  const lobe = side => {
    const cx = X + td[0] * side * (gapW / 2 + w / 2),
      cy = Y + td[1] * side * (gapW / 2 + w / 2),
      pts = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * 2 * Math.PI,
        // a capsule bulging a little in the middle
        u = Math.cos(a) * (w / 2) * (1 + 0.12 * Math.cos(2 * a)),
        v = Math.sin(a) * (h / 2);
      pts.push([cx + td[0] * u + nd[0] * v, cy + td[1] * u + nd[1] * v]);
    }
    const hl = pts.map(([x, y]) => [cx + (x - cx) * 0.55 + _LGT[0] * w * 0.15, cy + (y - cy) * 0.7 + _LGT[1] * w * 0.15]);
    return fill(sp(pts), m.m, `stroke="${INK}" stroke-width=".9" stroke-linejoin="round"`) + fill(sp(hl), m.l, 'opacity=".85"');
  };
  let s = lobe(-1) + lobe(1);
  if (o.plug && open < 0.6)
    s += `<circle cx="${f(X + nd[0] * h * 0.42)}" cy="${f(Y + nd[1] * h * 0.42)}" r="${f(w * 0.36 * (1 - open * 0.6))}" fill="${m.d}" stroke="${INK}" stroke-width=".7"/>`;
  return `<g class="bio">${s}</g>`;
}
// helix(a3, b3, {r, turns, strands, wire, m, m2, offset, rungs, pair, seq, letters, phase, split}): a helix from a3 to
// b3: DNA (strands: 2, rungs: base pairs coloured by `pair` [A, T, G, C], offset ~150 for its two unequal grooves;
// seq: 'ATGCCA' sets the pairs in order along the first strand, letters: true writes them on), a coil spring
// (strands: 1), a screw thread or a spiral staircase rail. Sorted back to front by itself; split: true returns
// {back, front} so a rod inside a coil can be drawn between them.
function helix(a3, b3, o = {}) {
  const r = o.r ?? 6,
    turns = o.turns ?? 3,
    ns = o.strands ?? 2,
    wire = o.wire ?? 0.9,
    m = asM(o.m || '#5a82c6'),
    m2 = asM(o.m2 || o.m || '#e2683d'),
    off = ((o.offset ?? 180) * Math.PI) / 180,
    ph = o.phase ?? 0,
    d = sub(b3, a3),
    dn = norm(d),
    u = _perp(dn),
    v = cross(dn, u),
    N = Math.max(12, Math.round(turns * 28)),
    K = _RK();
  const at = (t, k) => {
    const a = ph + t * turns * 2 * Math.PI + k * off;
    return add(add(a3, mul3(d, t)), add(mul3(u, Math.cos(a) * r), mul3(v, Math.sin(a) * r)));
  };
  const parts = [];
  for (let k = 0; k < ns; k++) {
    const pts = Array.from({ length: N + 1 }, (_, i) => at(i / N, k)),
      q = pts.map(p => P(...p)),
      rr = pts.map(() => wire * K),
      mm = k ? m2 : m;
    for (let i = 0; i < N; i += 3) {
      const j = Math.min(N, i + 3),
        t = _tubeLayers(q.slice(Math.max(0, i - 1), Math.min(N, j + 1) + 1), rr.slice(Math.max(0, i - 1), Math.min(N, j + 1) + 1), mm, 0.8, i === 0 || j === N ? 'round' : 'butt'), // pieces overlap by a point so joints on a curve leave no gap
        s = t.ink + t.body + t.shade;
      parts.push({ at: pts[Math.round((i + j) / 2)], axisAt: lerp3(a3, b3, (i + j) / 2 / N), svg: s });
    }
  }
  if (ns === 2 && o.rungs !== false) {
    const seq = o.seq ? String(o.seq).toUpperCase().replace(/[^ATGCU]/g, '') : '',
      nr = seq ? seq.length : typeof o.rungs === 'number' ? o.rungs : Math.round(turns * 10),
      cols = o.pair || ['#f2c14e', '#4fb286', '#e26d5a', '#7a8ce0'],
      rnd = _rng(o.seed ?? 3),
      fs = Math.max(2.4, wire * K * 2.8);
    for (let i = 0; i < nr; i++) {
      const t = (i + 0.5) / nr,
        A = at(t, 0),
        B = at(t, 1),
        M = lerp3(A, B, 0.5),
        // seq: 'ATGC...' read along the first strand; its partner on the other strand follows the pairing rule
        pick = seq ? 'ATGC'.indexOf(seq[i] === 'U' ? 'T' : seq[i]) : Math.floor(rnd() * 4),
        // a base pair: one colour for each half (A-T or G-C)
        ca = cols[pick],
        cb = cols[pick ^ 1];
      for (const [p0, p1, c] of [
        [A, M, ca],
        [M, B, cb],
      ]) {
        const q0 = P(...p0),
          q1 = P(...p1),
          lx = q1[0] - q0[0],
          ly = q1[1] - q0[1],
          l = Math.hypot(lx, ly) || 1,
          hw = wire * 0.55,
          nx = (-ly / l) * hw,
          ny = (lx / l) * hw;
        parts.push({
          at: lerp3(p0, p1, 0.5),
          axisAt: lerp3(a3, b3, t),
          svg: `<path d="M${f(q0[0] + nx)} ${f(q0[1] + ny)}L${f(q1[0] + nx)} ${f(q1[1] + ny)}L${f(q1[0] - nx)} ${f(q1[1] - ny)}L${f(q0[0] - nx)} ${f(q0[1] - ny)}Z" fill="${c}" stroke="${INK}" stroke-width=".5" stroke-linejoin="round"/>`,
        });
      }
      if (o.letters) {
        // the base letters, on each half of the rung (U on the first strand stays U: RNA)
        const la = seq && seq[i] === 'U' ? 'U' : 'ATGC'[pick],
          lb = 'ATGC'[pick ^ 1];
        for (const [p, L] of [
          [lerp3(A, M, 0.45), la],
          [lerp3(B, M, 0.45), lb],
        ]) {
          const q = P(...p);
          parts.push({
            at: add(p, mul3(VDIR, 0.01)),
            axisAt: lerp3(a3, b3, t),
            svg: `<text x="${f(q[0])}" y="${f(q[1] + fs * 0.36)}" font-size="${f(fs)}" text-anchor="middle" font-family="${SANS}" font-weight="750" fill="${INK}" stroke="#fff" stroke-width="${f(fs * 0.28)}" paint-order="stroke">${L}</text>`,
          });
        }
      }
    }
  }
  if (!o.split) return byDepth(parts);
  return {
    back: byDepth(parts.filter(p => depthOf(p.at) <= depthOf(p.axisAt))),
    front: byDepth(parts.filter(p => depthOf(p.at) > depthOf(p.axisAt))),
  };
}
// coil(a3, b3, r, turns, wire, m, {split}): a coil spring (or a heating coil) from a3 to b3. split: {back, front}.
const coil = (a3, b3, r, turns, wire, m, o = {}) =>
  helix(a3, b3, { r, turns, strands: 1, wire, m, rungs: false, ...o });
// Atom colours (the usual chemistry colours) and sizes for molecule().
const ATOMS = {
  H: ['#f4f4f2', 0.55],
  C: ['#5b5f66', 0.85],
  N: ['#3f6fd8', 0.82],
  O: ['#e2483d', 0.8],
  S: ['#f2c94c', 1],
  P: ['#f08a24', 1],
  F: ['#93dd8c', 0.72],
  Cl: ['#4cbf4c', 0.95],
  Br: ['#a33c2a', 1.05],
  I: ['#7a3fa0', 1.15],
  Na: ['#a87ce0', 1.1],
  K: ['#8f5fd0', 1.25],
  Ca: ['#7fbf7f', 1.15],
  Mg: ['#5fcf6f', 1.05],
  Fe: ['#d0732e', 1],
  Zn: ['#7d80b0', 1],
};
// molecule(atoms, bonds, {r, bond, letters, at, scale}): a ball-and-stick molecule. atoms = [{el: 'C', at: [x,y,z]}];
// bonds = [[i, j, order]] (order 1, 2 or 3). at/scale place and size coordinates taken from a structure record
// (e.g. a PubChem 3D conformer, in angstroms). letters: write each element's symbol on its ball.
function molecule(atoms, bonds, o = {}) {
  const R = o.r ?? 2.2,
    bw = o.bond ?? 0.45,
    sc = o.scale ?? 1,
    o3 = o.at || [0, 0, 0],
    pos = atoms.map(a => add(o3, mul3(a.at, sc))),
    parts = [];
  for (const [i, j, ord = 1] of bonds) {
    const a = pos[i],
      b = pos[j],
      M = lerp3(a, b, 0.5),
      q0 = P(...a),
      q1 = P(...b),
      lx = q1[0] - q0[0],
      ly = q1[1] - q0[1],
      l = Math.hypot(lx, ly) || 1,
      px = -ly / l,
      py = lx / l;
    for (let k = 0; k < ord; k++) {
      const sh = (k - (ord - 1) / 2) * R * bw * 1.25,
        hw = (R * bw * (ord > 1 ? 0.55 : 0.75)) / 2;
      for (const [s0, s1, el] of [
        [q0, [(q0[0] + q1[0]) / 2, (q0[1] + q1[1]) / 2], atoms[i].el],
        [[(q0[0] + q1[0]) / 2, (q0[1] + q1[1]) / 2], q1, atoms[j].el],
      ]) {
        const c = (ATOMS[el] || ATOMS.C)[0],
          x0 = s0[0] + px * sh,
          y0 = s0[1] + py * sh,
          x1 = s1[0] + px * sh,
          y1 = s1[1] + py * sh;
        parts.push({
          at: el === atoms[i].el && s0 === q0 ? lerp3(a, M, 0.5) : lerp3(M, b, 0.5),
          svg: `<path d="M${f(x0 + px * hw)} ${f(y0 + py * hw)}L${f(x1 + px * hw)} ${f(y1 + py * hw)}L${f(x1 - px * hw)} ${f(y1 - py * hw)}L${f(x0 - px * hw)} ${f(y0 - py * hw)}Z" fill="${mix(c, '#ffffff', 0.15)}" stroke="${INK}" stroke-width=".55" stroke-linejoin="round"/>`,
        });
      }
    }
  }
  atoms.forEach((a, i) => {
    const [c, k] = ATOMS[a.el] || ATOMS.C,
      r = a.r ?? R * k,
      [X, Y] = P(...pos[i]);
    let s = ball(pos[i], r, matOf(c), 0.8);
    if (o.letters)
      s += `<text x="${f(X)}" y="${f(Y + r * 0.45)}" font-size="${f(r * 1.25)}" text-anchor="middle" font-family="${SANS}" font-weight="700" fill="${INK}" stroke="#fff" stroke-width="${f(r * 0.28)}" paint-order="stroke">${esc(a.el)}</text>`;
    parts.push({ at: add(pos[i], [0.001, 0.001, 0.001]), svg: s });
  });
  return byDepth(parts);
}
// screw(p3, axis, r, {ang, hex, m}): a screw head (slotted) or a hex bolt head on a face: 'x' front, 'y' side,
// 'z' top. screws([points], axis, r, o): several. bolts(c3, axis, R, n, r, o): n heads on a circle of radius R (a
// flange, a hub, a lid).
function screw(p3, axis, r = 1.1, o = {}) {
  const m = asM(o.m || MAT.steel),
    a = ((o.ang ?? 35) * Math.PI) / 180,
    [, u, v] = _basis(typeof axis === 'string' ? axis.replace('-', '') : axis),
    pt = (du, dv) => add(p3, add(mul3(u, du), mul3(v, dv))),
    circ = (cu, cv, rr, n) => Array.from({ length: n }, (_, i) => pt(cu + Math.cos((i / n) * 2 * Math.PI) * rr, cv + Math.sin((i / n) * 2 * Math.PI) * rr));
  if (o.hex) return shape(circ(0, 0, r, 6), m.m, 0.6) + shape(circ(-r * 0.15, r * 0.15, r * 0.45, 10), m.l, 0);
  return shape(circ(0, 0, r, 14), m.l, 0.6) + line([pt(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72), pt(-Math.cos(a) * r * 0.72, -Math.sin(a) * r * 0.72)], 0.65);
}
const screws = (pts, axis, r, o) => pts.map(p => screw(p, axis, r, o)).join('');
function bolts(c3, axis, R, n = 6, r = 0.9, o = {}) {
  const [, u, v] = _basis(typeof axis === 'string' ? axis.replace('-', '') : axis);
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = ((o.start ?? 0) + i / n) * 2 * Math.PI;
    s += screw(add(c3, add(mul3(u, Math.cos(a) * R), mul3(v, Math.sin(a) * R))), axis, r, { hex: o.hex ?? true, m: o.m });
  }
  return s;
}
// ticks(a3, b3, n, len, dir3, {major, w, col}): a ruler's tick marks from a3 to b3 (n gaps), each pointing along
// dir3, every `major`-th one longer. Hang them from the edge of a strip so they end on something.
function ticks(a3, b3, n, len, dir3, o = {}) {
  const maj = o.major ?? 5;
  let d = '';
  for (let i = 0; i <= n; i++) {
    const p = lerp3(a3, b3, i / n),
      q = add(p, mul3(dir3, len * (i % maj === 0 ? 1.8 : 1))),
      A = P(...p),
      B = P(...q);
    d += `M${f(A[0])} ${f(A[1])}L${f(B[0])} ${f(B[1])}`;
  }
  return `<path d="${d}" fill="none" stroke="${o.col || INK_SOFT}" stroke-width="${o.w ?? 0.55}" stroke-linecap="round"/>`;
}
// knob(c3, axis, r, h, m, {ang, ridges, pointer}): a knurled knob or dial sticking out of a face along axis
// ('x', 'y', 'z' or a vector), with grip ridges and a pointer line on its cap at `ang` degrees.
function knob(c3, axis, r, h, m, o = {}) {
  m = asM(m);
  const dn = _axis(axis),
    top = add(c3, mul3(dn, h)),
    u = _perp(dn),
    v = cross(dn, u),
    nr = o.ridges ?? 20;
  let s = rod(c3, top, r, m, toneI, 1, r * 0.94, 24),
    d = '';
  for (let i = 0; i < nr; i++) {
    const a = (i / nr) * 2 * Math.PI,
      nv = add(mul3(u, Math.cos(a)), mul3(v, Math.sin(a)));
    if (dot(nv, VDIR) < 0.15) continue;
    const A = P(...add(add(c3, mul3(dn, h * 0.08)), mul3(nv, r * 1.0))),
      B = P(...add(add(c3, mul3(dn, h * 0.9)), mul3(nv, r * 0.95)));
    d += `M${f(A[0])} ${f(A[1])}L${f(B[0])} ${f(B[1])}`;
  }
  if (d) s += `<path d="${d}" stroke="${m.d}" stroke-width=".5" stroke-linecap="round" opacity=".8"/>`;
  if (o.pointer !== false && vis(dn)) {
    const a = ((o.ang ?? 90) * Math.PI) / 180,
      tip = add(top, add(mul3(u, Math.cos(a) * r * 0.8), mul3(v, Math.sin(a) * r * 0.8)));
    s += line([add(top, mul3(sub(tip, top), 0.15)), tip], 1.1);
  }
  return s;
}
// slots(axis, c3, w, h, n, {gap, along, m}): n closed vent slots on a face, centred at c3, each w by h units,
// in a row along 'u' (across the face) or 'v' (up the face).
function slots(axis, c3, w, h, n = 6, o = {}) {
  const [pl, u0, v0] = planeAt(axis, c3),
    gap = o.gap ?? (o.along === 'v' ? h * 1.9 : w * 1.9),
    col = o.col || '#2c2a27';
  let s = '';
  for (let i = 0; i < n; i++) {
    const k = (i - (n - 1) / 2) * gap,
      cu = u0 + (o.along === 'v' ? 0 : k),
      cv = v0 + (o.along === 'v' ? k : 0);
    s += shape(on(pl, rrUV(cu - w / 2, cv - h / 2, cu + w / 2, cv + h / 2, Math.min(w, h) / 2)), col, 0.55);
  }
  return s;
}
// shift(d3, svg): draw svg moved by the 3D offset d3 (an exploded view, a lifted lid, a part sliding out of its
// place for real). Move a part's labels with it: tag(add(p, d3), ...).
const shift = (d3, svg) => {
  const [X, Y] = Dv(...d3);
  return Math.abs(X) + Math.abs(Y) < 0.01 ? svg : `<g transform="translate(${f(X)} ${f(Y)})">${svg}</g>`;
};

/* ---------- v2 machine parts: round bodies on any axis, gears, valves, rails, piping ---------- */
// The two directions across an axis (the same pair every time for the same axis, so parts that share an axis line up).
const _basis = axis => {
  const d = _axis(axis),
    u = _perp(d);
  return [d, u, cross(d, u)];
};
// latheAx(c3, axis, profile, m, {n, w, shade, caps}): a round body turned about ANY axis ('x', 'y', 'z', '-x', or a
// vector): a drum lying on its side, a nozzle, a bolt, a bottle on its side, a piston, a pipe fitting. profile =
// [[radius, s], ...] with s (distance along the axis from c3) increasing. A step (two points at the same s) makes a
// shoulder. Faces are shaded by the way they face the light and drawn back to front, so flanges and waists read.
function latheAx(c3, axis, prof, m, o = {}) {
  m = asM(m);
  const [d, u, v] = _basis(axis),
    n = o.n || 28,
    w = o.w ?? 1.1,
    shade = shadeFn(o.shade, tone);
  const radAt = a => add(mul3(u, Math.cos(a)), mul3(v, Math.sin(a)));
  const R = prof.map(([r, sv]) =>
    Array.from({ length: n }, (_, i) => add(add(c3, mul3(d, sv)), mul3(radAt((i / n) * 2 * Math.PI), Math.max(r, 0.001))))
  );
  const faces = [];
  for (let i = 1; i < R.length; i++) {
    const dr = prof[i][0] - prof[i - 1][0],
      ds = prof[i][1] - prof[i - 1][1];
    if (Math.abs(dr) < 1e-6 && Math.abs(ds) < 1e-6) continue;
    for (let j = 0; j < n; j++) {
      const j1 = (j + 1) % n,
        rad = radAt(((j + 0.5) / n) * 2 * Math.PI),
        nr = norm(sub(mul3(rad, ds), mul3(d, dr)));
      if (!vis(nr)) continue;
      const q = [R[i - 1][j], R[i - 1][j1], R[i][j1], R[i][j]];
      faces.push({ at: avg(q), d: pd(q), c: shade(nr, m) });
    }
  }
  let s = facesByDepth(faces);
  // end caps: the one that faces the viewer is drawn filled; the far one shows only its near rim
  const ends = [
    [0, d.map(x => -x)],
    [R.length - 1, d],
  ];
  for (const [i, nrm] of ends) {
    const r = prof[i][0];
    if (r < 0.01 || o.caps === false) continue;
    if (vis(nrm)) s += fill(pd(R[i]), shade(nrm, m)) + ink(pd(R[i]), w * 0.75);
  }
  // silhouette: the two outer edges across the axis as seen on screen, plus the rim of any end facing away
  const ad = Dv(...d),
    al = Math.hypot(...ad);
  if (al < 0.15) {
    const big = R[prof.reduce((b, p, i) => (p[0] > prof[b][0] ? i : b), 0)];
    return s + ink(pd(big), w);
  }
  const pn = [-ad[1] / al, ad[0] / al];
  const rmax = Math.max(...prof.map(p => p[0])),
    Rs = R.filter((rg, i) => prof[i][0] > rmax * 0.03);
  const side = sg =>
    Rs.map(rg =>
      rg
        .map(p => P(...p))
        .reduce((a, b) => (sg * (b[0] * pn[0] + b[1] * pn[1]) > sg * (a[0] * pn[0] + a[1] * pn[1]) ? b : a))
    );
  s += ink(smoothD(side(1), false), w) + ink(smoothD(side(-1), false), w);
  // a near-side arc of ring i (the part of its rim in front of the axis), in order round the ring
  const frontArc = i => {
    const idx = R[i].map((p, j) => dot(radAt((j / n) * 2 * Math.PI), VDIR) > -0.05),
      start = idx.findIndex((x, j) => x && !idx[(j - 1 + n) % n]),
      pts = [];
    for (let k = 0; k < n; k++) {
      const j = (start + k) % n;
      if (idx[j]) pts.push(R[i][j]);
    }
    return pts.length > 2 ? ink(pd(pts, false), w) : '';
  };
  for (const [i, nrm] of ends) {
    if (prof[i][0] < 0.01 || (vis(nrm) && o.caps !== false)) continue;
    s += frontArc(i);
  }
  // an end closed by the profile itself (it runs in to radius 0 across a flat face): give its rim an outline too
  for (const [i, j, nrm] of [
    [0, 1, d.map(x => -x)],
    [R.length - 1, R.length - 2, d],
  ]) {
    if (R.length < 3 || prof[i][0] >= 0.01 || prof[j][0] < 0.01 || Math.abs(prof[i][1] - prof[j][1]) > 1e-6) continue;
    s += vis(nrm) ? ink(pd(R[j]), w * 0.75) : frontArc(j);
  }
  return s;
}
// gear(c3, axis, r, teeth, ang, m, {thick, hole, spokes, hub, w}): a spur gear turning about axis, r = pitch radius
// (where it meshes), ang = its turn in radians (feed it from st). Two gears mesh when their centres are r1 + r2 apart
// on a shared face: put the second at gearAt(c1, axis, r1, r2, phi) and turn it by meshAng(ang1, n1, n2, phi).
// Speeds follow the tooth counts: the small gear turns n1/n2 times as fast, the other way.
function gear(c3, axis, r, teeth, ang, m, o = {}) {
  m = asM(m);
  const [d, u, v] = _basis(axis),
    th = o.thick ?? r * 0.28,
    mod = (2 * r) / teeth,
    ra = r + mod,
    rf = r - 1.25 * mod,
    pa = (2 * Math.PI) / teeth,
    fsg = vis(d) ? 1 : -1,
    w = o.w ?? 1;
  const at = (a, rr, sv) => add(add(c3, mul3(d, sv)), add(mul3(u, Math.cos(a) * rr), mul3(v, Math.sin(a) * rr)));
  const prof = [];
  for (let i = 0; i < teeth; i++) {
    const a = ang + i * pa;
    prof.push([a - pa * 0.5, rf], [a - pa * 0.3, rf], [a - pa * 0.17, ra], [a + pa * 0.17, ra], [a + pa * 0.3, rf]);
  }
  const front = prof.map(([a, rr]) => at(a, rr, (fsg * th) / 2)),
    back = prof.map(([a, rr]) => at(a, rr, (-fsg * th) / 2)),
    walls = [];
  for (let k = 0; k < prof.length; k++) {
    const k1 = (k + 1) % prof.length,
      q = [back[k], back[k1], front[k1], front[k]];
    let nr = norm(cross(sub(front[k1], front[k]), d));
    if (dot(nr, sub(avg([front[k], front[k1]]), add(c3, mul3(d, (fsg * th) / 2)))) < 0) nr = nr.map(x => -x);
    if (!vis(nr)) continue;
    if (STYLE.smooth) {
      // snap the wall's direction to one of 16 so neighbouring walls share a colour and join into one path
      const a = Math.round((Math.atan2(dot(nr, v), dot(nr, u)) / (2 * Math.PI)) * 16) * ((2 * Math.PI) / 16);
      nr = add(mul3(u, Math.cos(a)), mul3(v, Math.sin(a)));
    }
    walls.push({ at: avg(q), d: pd(q), c: tone(nr, m) });
  }
  const fn = d.map(x => x * fsg),
    hole = o.hole ?? r * 0.16,
    ring = (rr, nn = 28) => Array.from({ length: nn }, (_, i) => at((i / nn) * 2 * Math.PI, rr, (fsg * th) / 2));
  let dPath = pd(front);
  if (hole > 0) dPath += pd(ring(hole, 20));
  const nsp = o.spokes ?? (r > 9 ? 5 : 0);
  if (nsp) {
    // windows between the spokes, so the gear reads as cast metal rather than a disc
    const r0 = Math.max(hole * 2.2, r * 0.32),
      r1 = rf - mod * 1.1;
    for (let i = 0; i < nsp; i++) {
      const a0 = ang + (i / nsp) * 2 * Math.PI + 0.22,
        a1 = ang + ((i + 1) / nsp) * 2 * Math.PI - 0.22,
        pts = [];
      for (let k = 0; k <= 6; k++) pts.push(at(a0 + ((a1 - a0) * k) / 6, r1, (fsg * th) / 2));
      for (let k = 6; k >= 0; k--) pts.push(at(a0 + ((a1 - a0) * k) / 6 + (k === 0 ? 0.06 : k === 6 ? -0.06 : 0), r0, (fsg * th) / 2));
      dPath += pd(pts);
    }
  }
  const inner = hole > 0 ? fill(pd(ring(hole, 20)), '#3b3734') : '';
  return (
    facesByDepth(walls, { group: teeth > 16 }) +
    inner +
    fill(dPath, tone(fn, m), 'fill-rule="evenodd"') +
    ink(dPath, w * 0.8) +
    hullInk(front.concat(back), w * 1.2) +
    (o.hub !== false && hole > 0 ? ink(pd(ring(hole * 1.9, 20)), 0.6) : '')
  );
}
const gearAt = (c1, axis, r1, r2, phi = 0) => {
  const [, u, v] = _basis(axis);
  return add(c1, add(mul3(u, Math.cos(phi) * (r1 + r2)), mul3(v, Math.sin(phi) * (r1 + r2))));
};
const meshAng = (ang1, n1, n2, phi = 0) => -(ang1 - phi) * (n1 / n2) + phi + Math.PI + Math.PI / n2;
// valve(c3, axis, r, open, m, {lever, handle}): a quarter-turn ball valve on a pipe running along axis, centred at
// c3, for a pipe of radius r. open 0..1 turns the lever from across the pipe (shut) to along it (open), as on a
// real valve. lever: the direction the lever stands up from the pipe (default up, or sideways on an upright pipe).
function valve(c3, axis, r, open, m, o = {}) {
  m = asM(m || MAT.brass);
  const [d] = _basis(axis),
    up = o.lever ? _axis(o.lever) : Math.abs(d[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1],
    L = r * 2.4;
  let s = latheAx(sub(c3, mul3(d, L)), d, [[r * 1.15, 0], [r * 1.15, r * 0.5], [r * 1.25, r * 0.5], [r * 1.25, r * 0.7], [r * 1.75, r * 1.4], [r * 1.8, L], [r * 1.75, 2 * L - r * 1.4], [r * 1.25, 2 * L - r * 0.7], [r * 1.25, 2 * L - r * 0.5], [r * 1.15, 2 * L - r * 0.5], [r * 1.15, 2 * L]], m);
  const top = add(c3, mul3(up, r * 1.8)),
    stem = add(c3, mul3(up, r * 2.7));
  s += rod(top, stem, r * 0.42, METAL, tone, 0.9);
  // the lever turns a quarter turn about the stem: along the pipe = open, across it = shut
  const across = norm(cross(up, d)),
    a = (open * Math.PI) / 2,
    dir = add(mul3(across, Math.cos(a)), mul3(d, Math.sin(a))),
    tip = add(stem, mul3(dir, r * 4.2));
  s += rod(stem, tip, r * 0.36, o.handle || '#d8452f', tone, 1, r * 0.3);
  s += ball(stem, r * 0.5, METAL, 0.9);
  return s;
}
// rail(a3, axis, len, {w, h, m, ticks, stops}): a straight guide rail from a3 along 'x' or 'y', with end stops and
// a ruler (ticks every unit of `ticks`). carriage(at3, axis, len, w, h, m): a block that rides on it, with screws.
function rail(a3, axis, len, o = {}) {
  const w = o.w ?? 6,
    h = o.h ?? 2.5,
    m = asM(o.m || MAT.steel),
    X = axis === 'x',
    [x0, y0, z0] = a3,
    x1 = X ? x0 + len : x0 + w / 2,
    y1 = X ? y0 + w / 2 : y0 + len,
    xs = X ? x0 : x0 - w / 2,
    ys = X ? y0 - w / 2 : y0;
  let s = box(xs, ys, z0, x1, y1, z0 + h, m, tone);
  if (o.stops !== false)
    for (const t of [0, 1]) {
      const p = X ? [x0 + t * (len - 2), ys] : [xs, y0 + t * (len - 2)];
      s += box(p[0], p[1], z0 + h, p[0] + (X ? 2 : w), p[1] + (X ? w : 2), z0 + h + 3, DARK, tone);
    }
  if (o.ticks) {
    const n = Math.floor(len / o.ticks);
    s += X
      ? ticks([x0, y1, z0 + h], [x0 + n * o.ticks, y1, z0 + h], n, 1.1, [0, -1, 0])
      : ticks([x1, y0, z0 + h], [x1, y0 + n * o.ticks, z0 + h], n, 1.1, [-1, 0, 0]);
  }
  return s;
}
function carriage(at3, axis, len, w, h, m) {
  m = asM(m || MAT.steel);
  const X = axis === 'x',
    [x, y, z] = at3,
    hx = X ? len / 2 : w / 2,
    hy = X ? w / 2 : len / 2;
  return (
    box(x - hx, y - hy, z, x + hx, y + hy, z + h, m, tone) +
    screws([[x - hx * 0.7, y - hy * 0.7, z + h], [x + hx * 0.7, y - hy * 0.7, z + h], [x - hx * 0.7, y + hy * 0.7, z + h], [x + hx * 0.7, y + hy * 0.7, z + h]], 'z', Math.min(hx, hy) * 0.16)
  );
}
// pipeline(points3, r, m, {bend, flanges, bands, w}): a pipe along a route of straight legs with smooth bends
// (radius `bend` times r, default 2.6) and a bolted flange at each end, so it starts and ends on something.
// bands: places 0..1 along the route for clamps. Draw it on top of what it passes in front of.
function pipeline(pts3, r, m, o = {}) {
  m = asM(m || MAT.steel);
  const R = (o.bend ?? 2.6) * r,
    route = [pts3[0]];
  for (let i = 1; i < pts3.length - 1; i++) {
    const a = pts3[i - 1],
      b = pts3[i],
      c = pts3[i + 1],
      u1 = norm(sub(a, b)),
      u2 = norm(sub(c, b)),
      cosT = clamp(dot(u1, u2), -1, 1),
      half = Math.acos(cosT) / 2;
    if (half > Math.PI / 2 - 0.01) {
      route.push(b);
      continue;
    }
    const cut = Math.min(R / Math.tan(half), Math.hypot(...sub(a, b)) * 0.48, Math.hypot(...sub(c, b)) * 0.48),
      p1 = add(b, mul3(u1, cut)),
      p2 = add(b, mul3(u2, cut));
    for (let k = 0; k <= 8; k++) {
      const t = k / 8,
        q = add(add(mul3(p1, (1 - t) * (1 - t)), mul3(b, 2 * t * (1 - t))), mul3(p2, t * t));
      route.push(q);
    }
  }
  route.push(pts3[pts3.length - 1]);
  let s = '';
  const flange = (p, dir) => {
    const t = r * 0.5;
    return latheAx(sub(p, mul3(dir, t / 2)), dir, [[r * 1.7, 0], [r * 1.7, t]], m) + (vis(dir) ? bolts(add(p, mul3(dir, t / 2)), dir, r * 1.3, 6, r * 0.22) : vis(dir.map(x => -x)) ? bolts(sub(p, mul3(dir, t / 2)), dir.map(x => -x), r * 1.3, 6, r * 0.22) : '');
  };
  const d0 = norm(sub(route[1], route[0])),
    d1 = norm(sub(route[route.length - 1], route[route.length - 2]));
  const ends = o.flanges === false ? [] : [{ at: route[0], svg: flange(route[0], d0) }, { at: route[route.length - 1], svg: flange(route[route.length - 1], d1) }];
  const far = ends.filter(e => depthOf(e.at) < depthOf(avg(route))),
    near = ends.filter(e => depthOf(e.at) >= depthOf(avg(route)));
  s += far.map(e => e.svg).join('');
  s += tube(route, r, m, { smooth: false, w: o.w ?? 1 });
  for (const t of o.bands || []) {
    const p = along(route, t),
      q = along(route, Math.min(1, t + 0.01)),
      dir = norm(sub(q, p));
    s += latheAx(sub(p, mul3(dir, r * 0.35)), dir, [[r * 1.18, 0], [r * 1.18, r * 0.7]], METAL, { w: 0.8 });
  }
  return s + near.map(e => e.svg).join('');
}

/* ---------- v2 living parts: organs drawn flat to the viewer, protein ribbons, skeletal formulas ---------- */
// The two 3D directions that show as screen-right and screen-up in the current view, so a flat drawing (an organ
// section, a formula) faces the viewer in every view and still has real 3D points for tags, tokens and flow().
const _screenPlane = () => _screenPlane0().map(e => _rz(e, -VIEW_AZ));
const _screenPlane0 = () =>
  VIEW_MODE === 'front'
    ? [
        [0, -1, 0],
        [0, 0, 1],
      ]
    : VIEW_MODE === 'plan'
      ? [
          [1, 0, 0],
          [0, -1, 0],
        ]
      : [
          [1 / (2 * C), -1 / (2 * C), 0],
          [0, 0, 1],
        ];
// A flat frame at c3, k units per local unit: F(u, v) gives the 3D point (u right, v up on screen).
const _flat = (c3, k) => {
  const [e1, e2] = _screenPlane();
  return (u, v) => add(c3, add(mul3(e1, u * k), mul3(e2, v * k)));
};
// A closed smooth outline through local points.
const _loop = (F, pts) => pts.map(([u, v]) => F(u, v));
// An organ result: use it as a string (s += heart(...)); .pt.name are 3D points for tag(), .path.name are 3D routes
// for flow() and along(), .names lists them.
function _organ(svg, pt, path) {
  return { svg, pt, path, names: Object.keys(pt), toString: () => svg };
}
// Organs are drawn once per look and then reused: the same organ with the same options, in the same view, turn, frame
// and style, comes from this small cache (its ids made unique, so it never clashes with what is drawn around it).
// So it is fine to call heart(...) in every scene(); never keep the result yourself between frames, because its
// points belong to the frame it was drawn in.
const _ORGANS = new Map();
let _organN = 0;
const _memoOrgan = (name, fn) =>
  function (c3, size, o) {
    const key = [name, JSON.stringify([c3, size, o || {}]), VIEW_MODE, VIEW_AZ.toFixed(4), f(OX), f(OY), INK_K.toFixed(4), STYLE.label, STYLE.smooth].join('|');
    let r = _ORGANS.get(key);
    if (!r) {
      const raw = fn(c3, size, o),
        pre = 'g' + ++_organN + '_';
      const svg = raw.svg
        .replace(/\bid="([^"]+)"/g, (_, id) => `id="${pre}${id}"`)
        .replace(/url\(#([^)]+)\)/g, (_, id) => (/^(soft|softL|hand)$/.test(id) ? `url(#${id})` : `url(#${pre}${id})`));
      r = _organ(svg, raw.pt, raw.path);
      if (_ORGANS.size > 24) _ORGANS.delete(_ORGANS.keys().next().value);
      _ORGANS.set(key, r);
    }
    return r;
  };
const BLOOD_LOW = { l: '#8f8fd6', m: '#5b5fb3', d: '#34367a' },
  BLOOD_HIGH = { l: '#f08080', m: '#d63c3c', d: '#8a1f1f' },
  MUSCLE = { l: '#f2b3a8', m: '#d9786b', d: '#9c4438' };
const _ff = (F, pts, col, w = 1, extra = '') => fill(pd(_loop(F, pts)), col, extra) + (w ? ink(pd(_loop(F, pts)), w) : '');
const _ell = (cu, cv, ru, rv, n = 28, a0 = 0) =>
  Array.from({ length: n }, (_, i) => {
    const a = a0 + (i / n) * 2 * Math.PI;
    return [cu + Math.cos(a) * ru, cv + Math.sin(a) * rv];
  });
// heart(c3, size, {beat, open, m}): the heart cut open from the front (a coronal section, as in a textbook): the
// four chambers, the septum, the four valves and the great vessels, oxygen-poor blood in blue, oxygen-rich in red.
// The patient's right is on the viewer's left. size = width in units (default 100). beat 0..1 squeezes the
// ventricles; the valves follow it (inflow valves shut and outflow valves open while the ventricles squeeze), or set
// open: {tricuspid, mitral, pulmonary, aortic} (0..1) yourself.
// pt: rightAtrium leftAtrium rightVentricle leftVentricle septum tricuspid mitral pulmonaryValve aorticValve aorta
//     pulmonaryArtery superiorVenaCava inferiorVenaCava pulmonaryVeins apex
// path: bodyIn (veins to right atrium) rightSide (right atrium to lungs) lungsIn (pulmonary veins to left atrium)
//       leftSide (left atrium out of the aorta)
function _heartDraw(c3, size = 100, o = {}) {
  const F = _flat(c3, size / 100),
    K = size / 100,
    b = clamp(o.beat ?? 0),
    sq = 1 - 0.14 * b,
    av = o.open ? o.open : { tricuspid: 1 - b, mitral: 1 - b, pulmonary: b, aortic: b },
    wall = o.m ? asM(o.m) : MUSCLE;
  let s = '';
  // behind the heart: the pulmonary veins (into the left atrium), the inferior vena cava, the right pulmonary
  // artery (it passes behind the aorta and the superior vena cava), then the superior vena cava and the aorta
  s += tube([F(64, 30), F(52, 26), F(40, 22)], 3.2 * K, BLOOD_HIGH, { w: 0.9 });
  s += tube([F(64, 14), F(52, 14), F(42, 14)], 3.2 * K, BLOOD_HIGH, { w: 0.9 });
  s += tube([F(-27, -30), F(-28, -50), F(-28, -66)], 6.2 * K, BLOOD_LOW, { w: 1 });
  s += tube([F(4, 42), F(-20, 46), F(-42, 46)], 4.2 * K, BLOOD_LOW, { w: 1 });
  s += tube([F(-28, 78), F(-28, 50), F(-28, 26)], 6.2 * K, BLOOD_LOW, { w: 1.1 });
  s += tube([F(6, 26), F(2, 40), F(2, 54), F(12, 62), F(28, 60), F(42, 50), F(46, 34), F(46, 16)], 6.6 * K, BLOOD_HIGH, { w: 1.1 });
  for (const [u0, v0, u1, v1] of [[4, 58, 0, 74], [12, 62, 11, 77], [20, 62, 23, 76]]) s += tube([F(u0, v0), F(u1, v1)], 2.2 * K, BLOOD_HIGH, { w: 0.8 });
  // the heart's muscle wall
  const body = [[-44, 18], [-46, 0], [-42, -22], [-30, -40], [-12, -52], [8, -62], [22, -66], [34, -58], [46, -38], [50, -14], [48, 6], [42, 22], [30, 30], [14, 32], [-4, 31], [-22, 31], [-36, 28]];
  s += _ff(F, body, wall.m, 1.4);
  s += fill(pd(_loop(F, body.map(([u, v]) => [u * 0.93 - 2, v * 0.93 + 2.5]))), wall.l, 'opacity=".5"');
  // the four chambers; each touches the vessel it fills from or empties into, so blood has a path
  const sqz = (pts, cu, cv, k) => pts.map(([u, v]) => [cu + (u - cu) * k, cv + (v - cv) * k]);
  const RA = sqz([[-34, 28], [-39, 14], [-38, 0], [-32, -8], [-16, -8], [-12, 2], [-13, 16], [-22, 28]], -26, 10, 1 - 0.08 * (1 - b)),
    LA = sqz([[16, 26], [16, 12], [20, 2], [34, 2], [44, 10], [44, 22], [34, 28], [24, 29]], 30, 15, 1 - 0.08 * (1 - b)),
    RV = sqz([[-38, -14], [-28, -12], [-12, -12], [-11, 4], [-10, 30], [-2, 30], [-2, 6], [0, -12], [-2, -30], [-8, -44], [-20, -40], [-32, -28]], -18, -22, sq),
    LV = sqz([[12, -6], [22, -4], [34, -6], [40, -22], [34, -42], [24, -54], [14, -48], [9, -30], [8, -14], [9, 4], [9, 28], [2, 28], [2, 8], [4, -10]], 22, -24, sq);
  s += _ff(F, RA, BLOOD_LOW.l, 0.9) + _ff(F, LA, BLOOD_HIGH.l, 0.9) + _ff(F, RV, BLOOD_LOW.l, 0.9) + _ff(F, LV, BLOOD_HIGH.l, 0.9);
  // the openings between atrium and ventricle, where the valves sit (they join the two chambers' edges)
  const gap = (A, i, j, V, k, l, col) => fill(pd(_loop(F, [[A[i][0] + 1.5, A[i][1] + 1], [A[j][0] - 1.5, A[j][1] + 1], [V[l][0] - 1.5, V[l][1] - 1], [V[k][0] + 1.5, V[k][1] - 1]])), col);
  s += gap(RA, 3, 4, RV, 1, 2, BLOOD_LOW.l) + gap(LA, 2, 3, LV, 1, 2, BLOOD_HIGH.l);
  // septum: the thick muscle wall between the two sides
  s += curve(_loop(F, [[-2, 30], [-1, 8], [1, -12], [-1, -30], [4, -50]]), wall.d, 0.6, { op: 0.45 });
  s += curve(_loop(F, [[2, 28], [3, 6], [5, -12], [8, -32], [12, -50]]), wall.d, 0.6, { op: 0.45 });
  // valves: two leaflets each, hinged at the ring; across the opening when shut, along the flow when open
  const flaps = (pu, pv, dir, half, open, col) => {
    const ang = Math.atan2(dir[1], dir[0]),
      a = (clamp(open) * 75 * Math.PI) / 180;
    let out = '';
    for (const sg of [-1, 1]) {
      const hx = Math.cos(ang - Math.PI / 2) * half * sg,
        hy = Math.sin(ang - Math.PI / 2) * half * sg,
        h = [pu + hx, pv + hy],
        // shut: pointing to the middle; open: pointing downstream
        cu = -hx / half,
        cv = -hy / half,
        du = cu * Math.cos(a) + Math.cos(ang) * Math.sin(a),
        dv = cv * Math.cos(a) + Math.sin(ang) * Math.sin(a),
        tip = [h[0] + du * half * 0.96, h[1] + dv * half * 0.96],
        mid = [(h[0] + tip[0]) / 2 + Math.cos(ang) * half * 0.18, (h[1] + tip[1]) / 2 + Math.sin(ang) * half * 0.18];
      out += `<path d="${pd(_loop(F, [h, mid, tip]), false)}" fill="none" stroke="${INK}" stroke-width="${f(3.6 * K)}" stroke-linecap="round"/>` +
        `<path d="${pd(_loop(F, [h, mid, tip]), false)}" fill="none" stroke="${col}" stroke-width="${f(2.2 * K)}" stroke-linecap="round"/>`;
    }
    return out;
  };
  s += flaps(-24, -10, [0, -1], 7, av.tricuspid, '#fbf1da');
  s += flaps(26.5, -1, [0, -1], 6.5, av.mitral, '#fbf1da');
  s += flaps(-6, 26, [0, 1], 4, av.pulmonary, '#fbf1da');
  s += flaps(5.5, 24, [0, 1], 3.5, av.aortic, '#fbf1da');
  // in front: the pulmonary trunk crossing in front of the aorta, and its branch to the left lung
  s += tube([F(-6, 29), F(-4, 38), F(6, 44), F(16, 44), F(34, 42)], 5 * K, BLOOD_LOW, { w: 1.1 });
  const pt = {
    rightAtrium: F(-27, 12), leftAtrium: F(32, 16), rightVentricle: F(-18, -26), leftVentricle: F(24, -28),
    septum: F(5, -32), tricuspid: F(-24, -10), mitral: F(26.5, -1), pulmonaryValve: F(-6, 26), aorticValve: F(5.5, 24),
    aorta: F(22, 61), pulmonaryArtery: F(20, 44), superiorVenaCava: F(-28, 64), inferiorVenaCava: F(-28, -58),
    pulmonaryVeins: F(58, 22), apex: F(22, -64),
    centre: F(4, -16), svcEnd: F(-28, 78), ivcEnd: F(-28, -66), aortaEnd: F(46, 16), pulmonaryArteryEnd: F(34, 42), // vessel ends
  };
  const path = {
    bodyIn: _loop(F, [[-28, 78], [-28, 40], [-27, 14]]),
    rightSide: _loop(F, [[-27, 14], [-24, -2], [-24, -18], [-14, -26], [-6, -10], [-6, 14], [-5, 34], [4, 43], [32, 42]]),
    lungsIn: _loop(F, [[64, 30], [48, 24], [32, 16]]),
    leftSide: _loop(F, [[32, 16], [27, 4], [26, -14], [20, -30], [6, -18], [5, 10], [4, 34], [2, 52], [12, 61], [30, 59], [44, 46], [46, 20]]),
  };
  return _organ(`<g class="organ heart">${s}</g>`, pt, path);
}
// brain(c3, size, {lit: ['frontal', ...], gyri}): the left side of the brain (front of the head on the viewer's
// left): the four lobes of the cerebrum in soft colours with the sulci between them, folds (gyri) as fine lines,
// the cerebellum and the brainstem. lit: lobes to fill strongly (frontal parietal temporal occipital cerebellum
// brainstem motor sensory). pt: the same names, plus centralSulcus lateralSulcus spinalCord.
function _brainDraw(c3, size = 100, o = {}) {
  const F = _flat(c3, size / 100),
    lit = new Set(o.lit || []);
  const col = { frontal: '#f5c6a5', parietal: '#c9dff2', temporal: '#d7ecc6', occipital: '#ecd2ee', cerebellum: '#ead7b5', brainstem: '#e4cbc1' };
  const hot = { frontal: '#f09a5f', parietal: '#76aee0', temporal: '#8ccf6b', occipital: '#cc8ed4', cerebellum: '#d1a35e', brainstem: '#c98d7d' };
  const fillOf = n => (lit.has(n) ? hot[n] : col[n]);
  // the outline of the cerebrum seen from the left: frontal pole at the front (viewer's left), the temporal pole
  // tucked under the frontal lobe, the occipital pole at the back
  const cer = [[-48, 6], [-50, 20], [-44, 32], [-30, 42], [-10, 48], [12, 48], [32, 42], [46, 30], [54, 14], [56, 0], [52, -10], [40, -14], [24, -16], [10, -22], [-4, -28], [-18, -30], [-30, -26], [-39, -19], [-42, -11], [-40, -6], [-46, -2]];
  const outline = _loop(F, cer),
    reg = (pts, c) => clipTo(outline, fill(pd(_loop(F, pts)), c));
  let s = '';
  // brainstem (midbrain, the bulging pons, the medulla) and the cerebellum, both under the back of the cerebrum
  s += _ff(F, [[2, -16], [16, -18], [18, -26], [17, -34], [14, -44], [13, -64], [5, -64], [5, -46], [-2, -36], [-4, -26]], fillOf('brainstem'), 1.1);
  s += curve(_loop(F, [[-2, -26], [6, -24], [16, -26]]), '#8a6458', 0.6, { op: 0.7 });
  s += curve(_loop(F, [[-1, -38], [8, -38], [16, -38]]), '#8a6458', 0.6, { op: 0.7 });
  const cbPts = _ell(32, -26, 22, 12, 32),
    cbOut = _loop(F, cbPts);
  s += _ff(F, cbPts, fillOf('cerebellum'), 1.2);
  let folia = '';
  for (let i = 1; i <= 7; i++) {
    const k = 1 - i * 0.12;
    folia += pd(_loop(F, Array.from({ length: 15 }, (_, j) => { const a = Math.PI * (1.08 + (j / 14) * 0.84); return [30 + Math.cos(a) * 22 * k * 1.08, -24 + i * 1.4 + Math.sin(a) * 12 * k + Math.sin(j * 1.7 + i) * 0.35]; })), false);
  }
  s += clipTo(cbOut, `<path d="${folia}" fill="none" stroke="#8a6a3c" stroke-width=".6" stroke-linecap="round" opacity=".7"/>`);
  // the cerebrum split into its four lobes along the central sulcus, the lateral sulcus and the line to the back
  s += fill(pd(outline), fillOf('temporal'));
  s += reg([[-70, 70], [4, 70], [0, 36], [-4, 20], [-8, 12], [-20, 4], [-36, -6], [-70, -6]], fillOf('frontal'));
  s += reg([[4, 70], [70, 70], [70, 30], [40, 12], [30, 10], [14, 6], [-8, 12], [-4, 20], [0, 36]], fillOf('parietal'));
  s += reg([[70, 30], [70, -40], [42, -40], [38, -8], [40, 12]], fillOf('occipital'));
  s += reg([[-36, -6], [-20, 4], [-8, 12], [14, 6], [30, 10], [40, 12], [38, -8], [42, -40], [-70, -40]], fillOf('temporal'));
  if (lit.has('motor')) s += reg([[-6, 70], [4, 70], [0, 36], [-4, 20], [-8, 12], [-14, 10], [-11, 20], [-8, 36], [-11, 70]], '#e8622a');
  if (lit.has('sensory')) s += reg([[4, 70], [12, 70], [9, 36], [6, 20], [4, 10], [-8, 12], [-4, 20], [0, 36]], '#2f7fd0');
  // the main sulci (grooves) as fine wavy lines: precentral, postcentral, frontal, temporal and intraparietal
  if (o.gyri !== false) {
    const wav = pts => {
      const out = [];
      for (let i = 0; i < pts.length - 1; i++)
        for (let k = 0; k < 4; k++) {
          const t = k / 4,
            u = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t,
            v = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t;
          out.push([u + Math.sin((i * 4 + k) * 1.9) * 0.9, v + Math.cos((i * 4 + k) * 2.3) * 0.9]);
        }
      out.push(pts[pts.length - 1]);
      return pd(_loop(F, out), false);
    };
    const sulci = [
      [[-8, 46], [-11, 34], [-14, 22], [-16, 14]],
      [[11, 47], [8, 34], [6, 22], [4, 14]],
      [[-12, 36], [-24, 34], [-38, 28], [-44, 20]],
      [[-15, 22], [-26, 18], [-38, 12], [-44, 6]],
      [[-30, -14], [-14, -10], [4, -6], [22, -2], [36, 2]],
      [[-26, -22], [-10, -20], [8, -16], [24, -12], [38, -6]],
      [[8, 28], [22, 30], [36, 26], [46, 18]],
      [[-20, 44], [-32, 38]],
      [[22, 44], [34, 38], [44, 30]],
      [[46, 6], [50, -4]],
    ];
    s += clipTo(outline, `<path d="${sulci.map(wav).join('')}" fill="none" stroke="#6f625c" stroke-width=".7" stroke-linecap="round" opacity=".7"/>`);
  }
  // the two big landmarks: the central sulcus and the lateral sulcus; the back boundary is only a guide line
  s += curve(_loop(F, [[2, 48], [0, 36], [-4, 20], [-8, 12]]), INK, 1.4);
  s += curve(_loop(F, [[-36, -6], [-20, 4], [-8, 12], [14, 6], [30, 10]]), INK, 1.4);
  s += clipTo(outline, curve(_loop(F, [[42, 37], [40, 12], [38, -8]]), INK_SOFT, 0.8, { dash: '3 2', op: 0.8 }));
  s += ink(pd(outline), 1.5);
  const pt = {
    frontal: F(-30, 24), parietal: F(24, 36), temporal: F(-4, -16), occipital: F(48, 2), cerebellum: F(34, -30),
    brainstem: F(9, -50), motor: F(-6, 30), sensory: F(5, 30), centralSulcus: F(-1, 32), lateralSulcus: F(-14, 7),
    spinalCord: F(9, -63),
  };
  return _organ(`<g class="organ brain">${s}</g>`, pt, {});
}
// lungs(c3, size, {breath}): the lungs from the front: the windpipe (trachea) with its cartilage rings, the two
// main bronchi branching inside, the right lung (viewer's left) with three lobes and the left lung with two and a
// notch for the heart, and the diaphragm under them. breath 0..1 fills the lungs and pulls the diaphragm down.
// pt: trachea bronchus rightLung leftLung upperLobe middleLobe lowerLobe diaphragm cardiacNotch
// path: airIn (nose side of the trachea down into the right lung's lower lobe), airInLeft
function _lungsDraw(c3, size = 100, o = {}) {
  const F = _flat(c3, size / 100),
    br = clamp(o.breath ?? 0),
    k = 1 + 0.07 * br,
    dz = -6 * br;
  const L = (u, v) => [u * k, v * k + (v < -10 ? dz * 0.6 : 0)];
  const right = [[-8, 34], [-20, 36], [-34, 26], [-44, 4], [-48, -24], [-46, -46], [-30, -52], [-14, -48], [-8, -36], [-6, 0]].map(([u, v]) => L(u, v)),
    left = [[8, 34], [20, 36], [34, 26], [44, 4], [48, -24], [46, -46], [32, -52], [16, -48], [10, -36], [16, -24], [12, -10], [8, 4]].map(([u, v]) => L(u, v));
  const lungM = { l: '#f8c9cf', m: '#eda1ab', d: '#b8606e' };
  let s = '';
  s += _ff(F, right, lungM.m, 1.4) + _ff(F, left, lungM.m, 1.4);
  for (const shp of [right, left]) s += clipTo(_loop(F, shp), fill(pd(_loop(F, shp.map(([u, v]) => [u * 0.8, v * 0.88 + 4]))), lungM.l, 'opacity=".6"'));
  // fissures: on the right the horizontal and oblique fissures make three lobes; on the left one oblique fissure
  s += clipTo(_loop(F, right), curve(_loop(F, [L(-50, -12), L(-30, -28), L(-10, -44)]), lungM.d, 1.1) + curve(_loop(F, [L(-48, -12), L(-28, -6), L(-4, -4)]), lungM.d, 1.1));
  s += clipTo(_loop(F, left), curve(_loop(F, [L(48, 2), L(30, -18), L(12, -44)]), lungM.d, 1.1));
  // the windpipe with C-shaped rings, then the bronchi branching into each lung
  s += tube([F(0, 70), F(0, 30)], 5.2 * (size / 100), { l: '#f4ece4', m: '#dccfc2', d: '#9d8b7a' }, { w: 1.1 });
  for (let v = 66; v > 32; v -= 4.2) s += curve(_loop(F, [[-4.4, v], [-2, v - 1.1], [2, v - 1.1], [4.4, v]]), '#a8968a', 0.7);
  const bTree = side =>
    tree(F(side * 1.5, 30), norm(add(mul3(_screenPlane()[0], side * 0.9), mul3(_screenPlane()[1], -1))), {
      plane: cross(_screenPlane()[0], _screenPlane()[1]),
      len: 22 * (size / 100) * k,
      r: 3.6 * (size / 100),
      levels: 4,
      kids: 2,
      spread: 34,
      shrink: 0.68,
      taper: 0.66,
      wiggle: 0.08,
      seed: side > 0 ? 5 : 8,
    });
  s += branch(bTree(-1), { l: '#f4ece4', m: '#dccfc2', d: '#9d8b7a' }, { w: 0.8 });
  s += branch(bTree(1), { l: '#f4ece4', m: '#dccfc2', d: '#9d8b7a' }, { w: 0.8 });
  // the diaphragm: a dome muscle under the lungs that flattens and drops when you breathe in
  const dome = [[-58, -52], [-40, -56], [-20, -50 + dz * 0.2], [0, -46], [20, -50 + dz * 0.2], [40, -56], [58, -52]].map(([u, v]) => [u, v + dz]);
  s += fill(pd(_loop(F, dome.concat([[58, -62 + dz], [-58, -62 + dz]]))), MUSCLE.m) + ink(pd(_loop(F, dome), false), 1.2);
  const pt = {
    trachea: F(0, 56), bronchus: F(-10, 24), rightLung: F(...L(-34, 8)), leftLung: F(...L(34, 8)), upperLobe: F(...L(-28, 18)),
    middleLobe: F(...L(-22, -18)), lowerLobe: F(...L(-36, -36)), diaphragm: F(0, -48 + dz), cardiacNotch: F(...L(14, -20)),
    tracheaTop: F(0, 70),
  };
  const path = { airIn: _loop(F, [[0, 72], [0, 30], [-12, 18], [-24, 0], [-30, -24]]), airInLeft: _loop(F, [[0, 72], [0, 30], [12, 18], [24, 0], [30, -24]]) };
  return _organ(`<g class="organ lungs">${s}</g>`, pt, path);
}
// kidney(c3, size, {lit}): a kidney cut in half lengthwise: the outer cortex, the striped pyramids of the medulla,
// the calyces and renal pelvis that collect urine, the ureter leaving at the bottom, and the renal artery (red) and
// vein (blue) at the dent (hilum). pt: cortex medulla pyramid pelvis calyx ureter renalArtery renalVein hilum
// path: bloodIn (renal artery into the cortex), urineOut (a pyramid tip down the ureter)
function _kidneyDraw(c3, size = 100, o = {}) {
  const F = _flat(c3, size / 100);
  const bean = [[0, 50], [-18, 46], [-30, 32], [-34, 10], [-32, -14], [-24, -36], [-8, -48], [8, -46], [16, -36], [14, -22], [8, -12], [6, 0], [8, 12], [14, 22], [16, 36], [10, 46]];
  let s = '';
  s += tube([F(10, 6), F(30, 8), F(50, 12)], 3.2 * (size / 100), BLOOD_HIGH, { w: 1 });
  s += tube([F(10, -4), F(30, -6), F(50, -8)], 3.6 * (size / 100), BLOOD_LOW, { w: 1 });
  s += _ff(F, bean, '#c56a5e', 1.5);
  s += _ff(F, bean.map(([u, v]) => [u * 0.86 - 2, v * 0.88]), '#e7a090', 0.6);
  // pyramids (the medulla): bases out toward the cortex, tips in toward the pelvis, each tip in a cup (a calyx)
  const H = [7, 0],
    urine = { l: '#f7ecc8', m: '#e6d39a', d: '#a3904f' },
    pyrs = [100, 131, 162, 193, 224, 255].map(deg => {
      const a = (deg * Math.PI) / 180,
        dx = Math.cos(a),
        dy = Math.sin(a);
      return { base: [H[0] + dx * 28, H[1] + dy * 28], tip: [H[0] + dx * 14, H[1] + dy * 14], px: -dy, py: dx, dx, dy };
    });
  for (const q of pyrs) {
    const b1 = [q.base[0] + q.px * 7.5, q.base[1] + q.py * 7.5],
      b2 = [q.base[0] - q.px * 7.5, q.base[1] - q.py * 7.5];
    s += _ff(F, [b1, [q.base[0] + q.dx * 1.5, q.base[1] + q.dy * 1.5], b2, q.tip], '#a94e48', 0.8);
    for (let k = 1; k < 5; k++) s += curve(_loop(F, [[b1[0] + ((b2[0] - b1[0]) * k) / 5, b1[1] + ((b2[1] - b1[1]) * k) / 5], q.tip]), '#7d3430', 0.4, { op: 0.6 });
  }
  // calyces: a short funnel from each pyramid tip into the renal pelvis, which narrows into the ureter
  for (const q of pyrs) s += tube([F(q.tip[0] - q.dx * 1.5, q.tip[1] - q.dy * 1.5), F(H[0] + q.dx * 4, H[1] + q.dy * 4)], 1.7 * (size / 100), urine, { w: 0.7 });
  for (const q of pyrs) s += _ff(F, Array.from({ length: 9 }, (_, i) => { const a = Math.atan2(q.dy, q.dx) + Math.PI / 2 + (i / 8) * Math.PI; return [q.tip[0] - q.dx * 1.6 + Math.cos(a) * 3, q.tip[1] - q.dy * 1.6 + Math.sin(a) * 3]; }), urine.l, 0.7);
  s += _ff(F, [[2, 9], [10, 8], [15, 1], [14, -8], [9, -12], [2, -9], [-1, 0]], urine.l, 1);
  s += tube([F(11, -10), F(16, -30), F(18, -60), F(16, -80)], 2.4 * (size / 100), urine, { w: 1 });
  const pt = {
    cortex: F(-29, 24), medulla: F(-17, 10), pyramid: F(-14, -18), pelvis: F(8, -2), calyx: F(-5, 9), ureter: F(17, -60),
    renalArtery: F(40, 10), renalVein: F(40, -7), hilum: F(10, 2),
    ureterEnd: F(16, -80), arteryEnd: F(50, 12), veinEnd: F(50, -8), // ends to join your own bladder or vessels to
  };
  const path = { bloodIn: _loop(F, [[50, 12], [28, 8], [10, 6], [-6, 12], [-26, 26]]), urineOut: _loop(F, [[-12, 6], [-4, 3], [7, 0], [12, -12], [16, -30], [18, -60], [16, -80]]) };
  return _organ(`<g class="organ kidney">${s}</g>`, pt, path);
}
const heart = _memoOrgan('heart', _heartDraw),
  brain = _memoOrgan('brain', _brainDraw),
  lungs = _memoOrgan('lungs', _lungsDraw),
  kidney = _memoOrgan('kidney', _kidneyDraw);
// ribbon(points3, {helices, sheets, w, m, m2, m3}): a protein drawn as a cartoon along its backbone route: thin coil,
// alpha helices as a coiled ribbon and beta strands as wide arrows. helices / sheets: [[t0, t1], ...] as fractions
// 0..1 of the route. Say in simplified that it is a cartoon of the fold, not every atom.
function ribbon(pts3, o = {}) {
  const route = _smooth3(pts3, 1),
    n = route.length,
    w = o.w ?? 1.4,
    mc = asM(o.m || '#9aa3b5'),
    mh = asM(o.m2 || '#e05d6f'),
    ms = asM(o.m3 || '#f2c14e'),
    seg = (t0, t1) => route.slice(Math.round(t0 * (n - 1)), Math.round(t1 * (n - 1)) + 1),
    spans = [...(o.helices || []).map(x => ['h', ...x]), ...(o.sheets || []).map(x => ['s', ...x])].sort((a, b) => a[1] - b[1]);
  let s = '',
    t = 0;
  const coil = (a, b) => {
    const p = seg(a, b);
    return p.length > 1 ? tube(p, w * 0.45, mc, { smooth: false, w: 0.8 }) : '';
  };
  for (const [kind, t0, t1] of spans) {
    s += coil(t, t0);
    const p = seg(t0, t1);
    if (p.length < 2) continue;
    if (kind === 'h') {
      const a = p[0],
        bb = p[p.length - 1],
        len = Math.hypot(...sub(bb, a));
      s += helix(a, bb, { r: w * 1.5, turns: Math.max(1, len / (w * 4.6)), strands: 1, wire: w * 1.05, m: mh, rungs: false });
    } else {
      const q = p.map(x => P(...x)),
        L = q.length,
        hw = w * 1.4,
        hi = Math.max(1, Math.round(L * 0.78)),
        left = [],
        right = [],
        nrm = i => {
          const a2 = q[Math.max(0, i - 1)],
            b2 = q[Math.min(L - 1, i + 1)],
            dl = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]) || 1;
          return [-(b2[1] - a2[1]) / dl, (b2[0] - a2[0]) / dl];
        };
      for (let i = 0; i <= hi; i++) {
        const [nx, ny] = nrm(i);
        left.push([q[i][0] + nx * hw, q[i][1] + ny * hw]);
        right.push([q[i][0] - nx * hw, q[i][1] - ny * hw]);
      }
      // a beta strand ends in an arrowhead pointing along the chain
      const [nx, ny] = nrm(hi),
        hl = [q[hi][0] + nx * hw * 2, q[hi][1] + ny * hw * 2],
        hr = [q[hi][0] - nx * hw * 2, q[hi][1] - ny * hw * 2],
        tip = q[L - 1],
        pt2 = z => f(z[0]) + ' ' + f(z[1]);
      const dArrow = smoothD(left, false) + `L${pt2(hl)}L${pt2(tip)}L${pt2(hr)}L` + right.slice().reverse().map(pt2).join('L') + 'Z';
      s += `<path d="${dArrow}" fill="${ms.l}" stroke="${INK}" stroke-width=".8" stroke-linejoin="round"/>`;
    }
    t = t1;
  }
  s += coil(t, 1);
  return s;
}
// skeletal(atoms, bonds, {at, scale, size}): a flat skeletal formula (the way chemists draw molecules on paper),
// facing the viewer. atoms = [{el: 'C', xy: [x, y]}, ...] in bond lengths (take them from a structure record);
// carbons are corners with no letter, other atoms are written ('OH', 'NH2' as given in el). bonds = [[i, j, order]];
// order 2 draws a second line inside rings. scale = units per bond length (default 8).
function skeletal(atoms, bonds, o = {}) {
  const F = _flat(o.at || [0, 0, 0], o.scale ?? 8),
    fs = (o.size ?? 1) * 4.2,
    labelled = a => a.el !== 'C',
    pos = atoms.map(a => P(...F(a.xy[0], a.xy[1]))),
    cen = pos.reduce((m, p) => [m[0] + p[0] / pos.length, m[1] + p[1] / pos.length], [0, 0]);
  let d = '',
    t = '';
  for (const [i, j, ord = 1] of bonds) {
    let a = pos[i],
      b = pos[j];
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      L = Math.hypot(dx, dy) || 1,
      ux = dx / L,
      uy = dy / L,
      cut = fs * 0.75;
    if (labelled(atoms[i])) a = [a[0] + ux * cut, a[1] + uy * cut];
    if (labelled(atoms[j])) b = [b[0] - ux * cut, b[1] - uy * cut];
    d += `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`;
    if (ord >= 2) {
      // the second line sits toward the middle of the molecule (inside a ring), shortened at both ends
      let nx = -uy,
        ny = ux;
      const mx = (a[0] + b[0]) / 2,
        my = (a[1] + b[1]) / 2;
      if ((cen[0] - mx) * nx + (cen[1] - my) * ny < 0) {
        nx = -nx;
        ny = -ny;
      }
      const off = fs * 0.55;
      for (let k = 1; k < ord; k++) {
        const sh = ord === 3 ? (k === 1 ? off : -off) : off,
          a2 = [a[0] + nx * sh + ux * L * 0.12, a[1] + ny * sh + uy * L * 0.12],
          b2 = [b[0] + nx * sh - ux * L * 0.12, b[1] + ny * sh - uy * L * 0.12];
        d += `M${f(a2[0])} ${f(a2[1])}L${f(b2[0])} ${f(b2[1])}`;
      }
    }
  }
  atoms.forEach((a, i) => {
    if (!labelled(a)) return;
    const c = (ATOMS[a.el.replace(/[^A-Z][a-z]?/g, '').slice(0, 2)] || ATOMS[a.el[0]] || ATOMS.C)[0];
    t += `<text x="${f(pos[i][0])}" y="${f(pos[i][1] + fs * 0.36)}" font-size="${f(fs)}" text-anchor="middle" font-family="${SANS}" font-weight="700" fill="${a.el[0] === 'O' ? '#c4302b' : a.el[0] === 'N' ? '#2f5fc4' : a.el[0] === 'S' ? '#a07a00' : c === ATOMS.C[0] ? INK : INK}" stroke="#fff" stroke-width="${f(fs * 0.3)}" paint-order="stroke">${esc(a.el)}</text>`;
  });
  return `<g class="formula"><path d="${d}" fill="none" stroke="${INK}" stroke-width="${f(fs * 0.16)}" stroke-linecap="round"/>${t}</g>`;
}

/* ---------- v2 effects: real-looking flame, steam, water and light ----------
   Drawn with SVG gradients and filters, so they show in the lesson, the video download and the printed sheets alike.
   In the Clear style they move like the real thing (a flame flickers, steam drifts and blurs, light ripples on water);
   Sketch and High contrast get calm flat versions. Every effect takes an amount (0..1) that fades it in and out, so
   nothing pops on or off: drive it from st with ui.tween, never switch it. */
// A seamless moving noise field for one effect: a tile of turbulence repeated and slid along by `slide`
// (screen units), so the pattern drifts forever without jumping.
function _noiseFilter(id, box, o) {
  const [x, y, w, h] = box,
    tw = o.tw || 60,
    th = o.th || 60,
    sx = (o.sx || 0) % tw,
    sy = (o.sy || 0) % th;
  return (
    `<filter id="${id}" filterUnits="userSpaceOnUse" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="${o.type || 'fractalNoise'}" baseFrequency="${o.freq || '0.06 0.03'}" numOctaves="${o.oct || 2}" seed="${o.seed || 3}" stitchTiles="stitch" x="${f(x)}" y="${f(y)}" width="${f(tw)}" height="${f(th)}" result="t0"/>` +
    `<feTile in="t0" x="${f(x - tw)}" y="${f(y - th)}" width="${f(w + 2 * tw)}" height="${f(h + 2 * th)}" result="t1"/>` +
    `<feOffset in="t1" dx="${f(sx)}" dy="${f(sy)}" result="t2"/>` +
    (o.after || `<feDisplacementMap in="SourceGraphic" in2="t2" scale="${f(o.scale || 6)}" xChannelSelector="R" yChannelSelector="G"/>`) +
    `</filter>`
  );
}
// flame(p3, w, h, amt, t, {blue, n}): a real-looking flame standing on p3 (a candle, a gas burner, a fire in a
// firebox): a yellow-orange outer flame, a bright core and a blue base, flickering upward. w, h in scene units.
// blue: 0 (a candle or wood fire) to 1 (a gas burner's clean blue cone). n: several tongues side by side.
function flame(p3, w, h, amt, t, o = {}) {
  amt = clamp(amt);
  if (amt < 0.01) return '';
  const [X, Y] = P(...p3),
    sc = Math.hypot(...Dv(1, 0, 0)) || 1,
    W = w * sc,
    H = h * (VIEW_MODE === 'plan' ? 0.5 : 1) * amt,
    blue = clamp(o.blue ?? 0),
    n = o.n || 1,
    id = gid('fl'),
    gO = gid('flo'),
    gI = gid('fli'),
    gG = gid('flg');
  // a teardrop tongue: wide round base, narrowing to a wavering tip
  const tongue = (cx, ww, hh, ph) => {
    const lean = Math.sin(t * 3.1 + ph) * ww * 0.18,
      pts = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * 2 * Math.PI,
        side = Math.sin(a),
        up = (1 - Math.cos(a)) / 2; // 0 at the base, 1 at the tip
      const wid = ww * 0.5 * Math.pow(Math.sin(Math.PI * Math.min(1, up * 1.08 + 0.02)), 0.75) * (1 - up * 0.35);
      pts.push([cx + side * wid + lean * up * up, Y - hh * up]);
    }
    return pts;
  };
  const body = (k, hk, col) => {
    let s = '';
    for (let i = 0; i < n; i++) {
      const cx = X + (n > 1 ? (i / (n - 1) - 0.5) * W * 0.8 : 0),
        hh = H * hk * (n > 1 ? 0.75 + 0.25 * Math.sin(i * 2.3 + 1) : 1) * (1 + Math.sin(t * 7 + i * 1.7) * 0.05);
      s += `<path d="${smoothD(tongue(cx, (W / Math.max(1, n * 0.7)) * k, hh, i * 1.3), true)}" fill="${col}"/>`;
    }
    return s;
  };
  const outerTop = blue > 0.5 ? '#8fc4ff' : '#ff9a2e',
    outerMid = blue > 0.5 ? '#4f8df0' : '#ffb21e',
    coreCol = blue > 0.5 ? '#bfe0ff' : '#fff4c2';
  const defs =
    `<linearGradient id="${gO}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${mix('#2f6bff', outerMid, 1 - blue * 0.7)}" stop-opacity="${0.85 * amt}"/><stop offset=".25" stop-color="${outerMid}" stop-opacity="${0.95 * amt}"/><stop offset=".7" stop-color="${outerTop}" stop-opacity="${0.85 * amt}"/><stop offset="1" stop-color="${outerTop}" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="${gI}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#3a7bff" stop-opacity="${amt}"/><stop offset=".22" stop-color="${coreCol}" stop-opacity="${amt}"/><stop offset="1" stop-color="${coreCol}" stop-opacity="${0.2 * amt}"/></linearGradient>` +
    `<radialGradient id="${gG}"><stop offset="0" stop-color="${blue > 0.5 ? '#7fb2ff' : '#ffb347'}" stop-opacity="${0.45 * amt}"/><stop offset="1" stop-color="${blue > 0.5 ? '#7fb2ff' : '#ffb347'}" stop-opacity="0"/></radialGradient>`;
  const halo = `<ellipse cx="${f(X)}" cy="${f(Y - H * 0.45)}" rx="${f(W * 1.4)}" ry="${f(H * 0.8)}" fill="url(#${gG})"/>`;
  const shapes = `<g fill="url(#${gO})">${body(1, 1, `url(#${gO})`)}</g>${body(0.5, blue > 0.5 ? 0.45 : 0.55, `url(#${gI})`)}`;
  if (!STYLE.smooth) return `<g>${defs}${body(1, 1, `url(#${gO})`)}${body(0.5, 0.5, `url(#${gI})`)}</g>`;
  const filt = _noiseFilter(id, [X - W * 1.5, Y - H * 1.3, W * 3, H * 1.6], {
    freq: `${(0.9 / W).toFixed(3)} ${(0.5 / H).toFixed(3)}`,
    tw: W * 3,
    th: H * 1.6,
    sy: (t * H * 1.4) % (H * 1.6),
    scale: W * 0.32,
    seed: 5,
  });
  // the flame itself can be pressed (wrap it in act); its soft halo lets presses through to what is behind
  return `<g>${defs}${filt}<g pointer-events="none">${halo}</g><g filter="url(#${id})">${shapes}</g></g>`;
}
// steam(p3, amt, t, {n, rise, spread, r, drift, col}): soft rising steam (or smoke with col '#8a8f96') from p3:
// blurred puffs that grow, drift and fade as they rise. rise and spread in scene units.
function steam(p3, amt, t, o = {}) {
  amt = clamp(amt);
  if (amt < 0.01) return '';
  const n = o.n || 7,
    rise = o.rise || 30,
    spread = o.spread || 8,
    r = o.r || 3,
    col = o.col || '#aebccb', // pale grey-blue: white steam would vanish on the white page
    id = gid('stm'),
    sc = Math.hypot(...Dv(1, 0, 0)) || 1;
  let s = '';
  for (let i = 0; i < n; i++) {
    const ph = frac(t * (o.speed || 0.25) + i / n),
      wob = Math.sin(t * 1.3 + i * 2.1) * spread * 0.4 * ph + (o.drift || 0) * ph * rise * 0.4,
      pz = p3[2] + rise * ph,
      q = P(p3[0] + wob * 0.5, p3[1] - wob * 0.5, pz),
      rr = r * sc * (0.6 + ph * 1.8),
      op = amt * Math.sin(Math.PI * Math.min(1, ph * 1.15)) * 0.9;
    s += `<circle cx="${f(q[0])}" cy="${f(q[1])}" r="${f(rr)}" fill="${col}" opacity="${op.toFixed(2)}"/><circle cx="${f(q[0] - rr * 0.2)}" cy="${f(q[1] - rr * 0.25)}" r="${f(rr * 0.55)}" fill="#ffffff" opacity="${(op * 0.8).toFixed(2)}"/>`;
  }
  if (!STYLE.smooth) return `<g pointer-events="none" stroke="#8fa2b3" stroke-width=".6">${s}</g>`;
  return `<g pointer-events="none"><filter id="${id}" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="${f(r * sc * 0.32)}"/></filter><g filter="url(#${id})">${s}</g></g>`;
}
// waterSurface(c3, rx, ry, t, {m, ripple, op}): the surface of water in an open container or a pool, an ellipse on
// the plane z = c3[2]: a blue gradient with bright ripples of light (caustics) drifting across it.
function waterSurface(c3, rx, ry, t, o = {}) {
  const m = asM(o.m || WATER),
    ring = on(PZ(c3[2]), ellUV(c3[0], c3[1], rx, ry, 40)),
    d = pd(ring),
    g = gid('ws'),
    id = gid('wc');
  const xs = ring.map(p => P(...p)),
    x0 = Math.min(...xs.map(q => q[0])),
    x1 = Math.max(...xs.map(q => q[0])),
    y0 = Math.min(...xs.map(q => q[1])),
    y1 = Math.max(...xs.map(q => q[1]));
  let s =
    `<linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mix(m.l, '#ffffff', 0.35)}"/><stop offset=".6" stop-color="${m.l}"/><stop offset="1" stop-color="${m.m}"/></linearGradient>` +
    `<path d="${d}" fill="url(#${g})" opacity="${o.op ?? 0.92}"/>`;
  if (STYLE.smooth && o.ripple !== false) {
    const w = x1 - x0,
      h = y1 - y0,
      tile = Math.max(w, h) * 0.8;
    s +=
      _noiseFilter(id, [x0, y0, w, h], {
        type: 'turbulence',
        freq: `${(2.2 / tile).toFixed(3)} ${(3.6 / tile).toFixed(3)}`,
        oct: 2,
        tw: tile,
        th: tile,
        sx: t * tile * 0.12,
        sy: t * tile * 0.05,
        // keep only a thin band of the noise's values: contour lines that look like rippling light
        after: `<feColorMatrix in="t2" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 0" result="a"/><feComponentTransfer in="a" result="lines"><feFuncA type="table" tableValues="0 0 0 .9 0 0 0 0"/></feComponentTransfer><feComposite in="lines" in2="SourceGraphic" operator="in"/>`,
      }) + `<path d="${d}" fill="#fff" filter="url(#${id})" opacity=".55"/>`;
  }
  return `<g pointer-events="none">${s}${ink(d, 0.7)}</g>`;
}
// stream(points3, w, amt, t, {m}): a stream of water falling or pouring along points (a tap, a jug's spout), with
// light streaks running down it. End it on a surface and add ripples() where it lands.
function stream(pts3, w, amt, t, o = {}) {
  amt = clamp(amt);
  if (amt < 0.01) return '';
  const m = asM(o.m || WATER),
    q = _smooth3(pts3, Math.max(0.8, w * 0.6)),
    d = smoothD(
      q.map(p => P(...p)),
      false
    ),
    sc = Math.hypot(...Dv(1, 0, 0)) || 1,
    W = w * sc * amt;
  const dash = (len, gap, speed, col, wd, op) =>
    `<path d="${d}" fill="none" stroke="${col}" style="stroke-width:${f(wd)}" stroke-linecap="round" stroke-dasharray="${f(len)} ${f(gap)}" stroke-dashoffset="${f(-t * speed)}" opacity="${op}"/>`;
  return (
    `<g pointer-events="none"><path d="${d}" fill="none" stroke="${m.m}" style="stroke-width:${f(W)}" stroke-linecap="round" opacity=".75"/>` +
    `<path d="${d}" fill="none" stroke="${m.l}" style="stroke-width:${f(W * 0.6)}" stroke-linecap="round" opacity=".8"/>` +
    dash(W * 2.2, W * 3.1, W * 14, '#ffffff', W * 0.22, 0.85) +
    dash(W * 1.2, W * 4.3, W * 19, '#ffffff', W * 0.14, 0.6) +
    `</g>`
  );
}
// beam(from3, to3, r0, r1, amt, col): a beam of light from a lamp's opening (radius r0 at from3) to where it lands
// (radius r1 at to3), fading with distance. pool(c3, rx, ry, amt, col): the soft bright patch it makes on a floor or
// table (z = c3[2]). Draw both before the parts that sit in front of them, and keep them pale.
function beam(from3, to3, r0, r1, amt, col = '#ffe9a8') {
  amt = clamp(amt);
  if (amt < 0.01) return '';
  const dn = norm(sub(to3, from3)),
    u = _perp(dn),
    v = cross(dn, u),
    ring = (c, r) => Array.from({ length: 24 }, (_, i) => add(c, add(mul3(u, Math.cos((i / 24) * 2 * Math.PI) * r), mul3(v, Math.sin((i / 24) * 2 * Math.PI) * r))));
  const pts = ring(from3, r0)
      .concat(ring(to3, r1))
      .map(p => P(...p)),
    h = hull(pts),
    A = P(...from3),
    B = P(...to3),
    g = gid('bm');
  return (
    `<linearGradient id="${g}" gradientUnits="userSpaceOnUse" x1="${f(A[0])}" y1="${f(A[1])}" x2="${f(B[0])}" y2="${f(B[1])}"><stop offset="0" stop-color="${col}" stop-opacity="${(0.75 * amt).toFixed(2)}"/><stop offset="1" stop-color="${col}" stop-opacity="${(0.12 * amt).toFixed(2)}"/></linearGradient>` +
    `<path d="${sp(h)}" fill="url(#${g})" pointer-events="none"/>`
  );
}
function pool(c3, rx, ry, amt, col = '#ffe9a8') {
  amt = clamp(amt);
  if (amt < 0.01) return '';
  const g = gid('pl');
  return (
    `<radialGradient id="${g}"><stop offset="0" stop-color="${col}" stop-opacity="${(0.85 * amt).toFixed(2)}"/><stop offset=".6" stop-color="${col}" stop-opacity="${(0.45 * amt).toFixed(2)}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>` +
    `<path d="${pd(on(PZ(c3[2]), ellUV(c3[0], c3[1], rx, ry, 36)))}" fill="url(#${g})" pointer-events="none"/>`
  );
}
// sparks(p3, t, amt, {n, speed, spread, col}): bright sparks thrown up from p3 and falling back (a grinder, a
// short circuit, a fire), each with a short trail.
function sparks(p3, t, amt, o = {}) {
  amt = clamp(amt);
  if (amt < 0.01) return '';
  const n = o.n || 10,
    rnd = _rng(o.seed || 9),
    sp0 = o.speed || 30,
    col = o.col || '#ffd25a';
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = rnd() * 2 * Math.PI,
      el = 0.6 + rnd() * 0.9,
      v0 = sp0 * (0.6 + rnd() * 0.6),
      ph = frac(t * 0.9 + rnd()),
      tt = ph * 1.1,
      vx = Math.cos(a) * Math.cos(el) * v0 * (o.spread || 1),
      vy = Math.sin(a) * Math.cos(el) * v0 * (o.spread || 1),
      vz = Math.sin(el) * v0,
      at = k => [p3[0] + vx * k, p3[1] + vy * k, p3[2] + vz * k - 24 * k * k],
      A = P(...at(Math.max(0, tt - 0.06))),
      B = P(...at(tt)),
      op = amt * (1 - ph);
    s += `<path d="M${f(A[0])} ${f(A[1])}L${f(B[0])} ${f(B[1])}" stroke="${col}" stroke-width="1.1" stroke-linecap="round" opacity="${op.toFixed(2)}"/><circle cx="${f(B[0])}" cy="${f(B[1])}" r=".9" fill="#fff8d0" opacity="${op.toFixed(2)}"/>`;
  }
  return `<g pointer-events="none">${s}</g>`;
}

/* ---------- v2 parts asked for by the stress test: body, enzymes, hinges, chains, helpers ---------- */
// pulse(t, perMinute, squeeze): a smooth repeating beat, 0..1 (a heartbeat, a pump stroke, breathing). squeeze is the
// share of each cycle spent contracting (default .35). Feed it st.t for looping motion: heart(..., {beat: pulse(st.t, 70)}).
function pulse(t, perMinute = 70, squeeze = 0.35) {
  const ph = frac((t * perMinute) / 60);
  return ph < squeeze ? Math.sin((Math.PI * ph) / squeeze) : 0;
}
// bloodColour(oxygen): the colour of blood from oxygen-poor (0, drawn blue by convention) to oxygen-rich (1, red), as
// '#hex' for any part. BLOOD_LOW and BLOOD_HIGH are materials ({l, m, d}); use their .m for one colour.
const bloodColour = ox => mix(BLOOD_LOW.m, BLOOD_HIGH.m, clamp(ox));
// pad(p3, r): an invisible press area, r units round p3. Put it inside act() to make a small, thin or see-through part
// (a flame, a wire, a part inside a magnifier bubble) easy to press: act('wick', svg + pad(p, 4)).
const pad = (p3, r) => {
  const [X, Y] = P(...p3),
    R = r * (Math.hypot(...Dv(1, 0, 0)) || 1) * 1.2;
  return `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(R)}" fill="#ffffff" fill-opacity="0.001"/>`;
};
// flap(a3, b3, out3, angle, m, {thick}): a flat flap, lid or door hinged along the edge a3-b3, reaching out3 (a vector:
// its width and direction when shut), turned `angle` degrees about the hinge (positive lifts it toward the viewer's
// side of out3 x hinge). A toilet flapper, a box lid, a valve flap, a trapdoor. Returns svg; hinge pins included.
function flap(a3, b3, out3, angle, m, o = {}) {
  m = asM(m);
  const ax = norm(sub(b3, a3)),
    ang = (angle * Math.PI) / 180,
    rot = v => _rotAxis(v, ax, ang),
    o3 = rot(out3),
    th = o.thick ?? 0.8,
    nrm = norm(cross(ax, o3)),
    up = mul3(nrm, th / 2),
    q = [a3, b3, add(b3, o3), add(a3, o3)],
    top = q.map(p => add(p, up)),
    bot = q.map(p => sub(p, up)),
    faces = [
      [nrm, top],
      [nrm.map(x => -x), bot],
    ];
  let s = '';
  const sides = [];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4,
      side = [top[i], top[j], bot[j], bot[i]],
      sn = norm(sub(avg([q[i], q[j]]), avg(q)));
    if (vis(sn)) sides.push({ at: avg(side), svg: shape(side, toneI(sn, m), 0.7) });
  }
  s += byDepth(sides);
  for (const [n, pts] of faces) if (vis(n)) s += shape(pts, tone(n, m), 0.9);
  s += rod(sub(a3, mul3(ax, 0.6)), add(a3, mul3(ax, 1.4)), th * 0.8, METAL, tone, 0.6) + rod(sub(b3, mul3(ax, 1.4)), add(b3, mul3(ax, 0.6)), th * 0.8, METAL, tone, 0.6);
  return s;
}
// rotate v about the unit axis k by angle a (radians)
const _rotAxis = (v, k, a) => {
  const c = Math.cos(a),
    sn = Math.sin(a),
    kv = cross(k, v),
    kd = dot(k, v);
  return [0, 1, 2].map(i => v[i] * c + kv[i] * sn + k[i] * kd * (1 - c));
};
// chain(a3, b3, {links, sag, r, m}): a metal chain hanging between two points (a toilet's lift chain, a swing, a
// pull chain), its links turning alternately so it reads as a chain. sag in units (0 for a taut chain).
function chain(a3, b3, o = {}) {
  const n = o.links || Math.max(4, Math.round(Math.hypot(...sub(b3, a3)) / 2.2)),
    sag = o.sag ?? 0,
    r = o.r ?? 0.7,
    m = asM(o.m || METAL),
    at = t => {
      const p = lerp3(a3, b3, t);
      return [p[0], p[1], p[2] - sag * 4 * t * (1 - t)];
    };
  let s = '';
  for (let i = 0; i < n; i++) {
    const p0 = at(i / n),
      p1 = at((i + 1) / n),
      c = lerp3(p0, p1, 0.5),
      d = norm(sub(p1, p0)),
      L = Math.hypot(...sub(p1, p0)) * 0.62,
      side = i % 2 ? _perp(d) : cross(d, _perp(d)),
      ring = Array.from({ length: 14 }, (_, k) => {
        const a = (k / 14) * 2 * Math.PI;
        return add(c, add(mul3(d, Math.cos(a) * L), mul3(side, Math.sin(a) * r * 1.1)));
      });
    s += `<path d="${pd(ring)}" fill="none" stroke="${INK}" stroke-width="${f(r * 1.25 + 0.5)}"/><path d="${pd(ring)}" fill="none" stroke="${m.l}" stroke-width="${f(r * 1.0)}"/>`;
  }
  return s;
}
// belt(centres3, radii, axis, {m, w, chain, t, pitch}): a closed belt or bike chain wrapped round pulleys, sprockets
// or rollers whose centres share one plane across axis ('x', 'y', 'z' or a vector; the axis the wheels turn about).
// List the centres in order round the loop; every wheel sits inside it. t = how far the belt has moved (in model
// units: feed it from the driving wheel, e.g. st.ang * r1, so the links and the teeth agree). chain: true draws dark
// links with plates; pitch = link length; w = its width in model units. Returns a string; .len is the loop length and .at(s) the 3D point at
// distance s along it (to ride a token on the belt). Draw it after the wheels so it sits on their rims.
function belt(cs, rs, axis = 'x', o = {}) {
  const [, u, v] = _basis(axis),
    c0 = cs[0],
    to3 = ([x, y]) => add(c0, add(mul3(u, x), mul3(v, y)));
  let C = cs.map(p => [dot(sub(p, c0), u), dot(sub(p, c0), v)]),
    R = rs.slice(0, cs.length);
  let area = 0;
  for (let i = 0; i < C.length; i++) {
    const j = (i + 1) % C.length;
    area += C[i][0] * C[j][1] - C[j][0] * C[i][1];
  }
  const flip = area < 0;
  if (flip) (C = C.reverse()), (R = R.reverse());
  const n = C.length,
    nrm = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n,
      dx = C[j][0] - C[i][0],
      dy = C[j][1] - C[i][1],
      L = Math.hypot(dx, dy) || 1,
      ph = Math.asin(clamp((R[i] - R[j]) / L, -1, 1));
    // the outside tangent: the loop runs round the wheels with them on its left
    nrm.push([Math.cos(ph) * (dy / L) + Math.sin(ph) * (dx / L), Math.cos(ph) * (-dx / L) + Math.sin(ph) * (dy / L)]);
  }
  const pts = [];
  for (let i = 0; i < n; i++) {
    const nin = nrm[(i - 1 + n) % n],
      nout = nrm[i],
      a0 = Math.atan2(nin[1], nin[0]);
    let da = Math.atan2(nout[1], nout[0]) - a0;
    while (da < 0) da += 2 * Math.PI;
    if (n === 1) da = 2 * Math.PI;
    const k = Math.max(2, Math.ceil(da / 0.17));
    for (let q = 0; q <= k; q++) {
      const a = a0 + (da * q) / k;
      pts.push([C[i][0] + Math.cos(a) * R[i], C[i][1] + Math.sin(a) * R[i]]);
    }
  }
  if (flip) pts.reverse(); // so t runs the way the centres were listed
  const P3 = pts.map(to3),
    cum = [0];
  for (let i = 1; i <= P3.length; i++) cum.push(cum[i - 1] + Math.hypot(...sub(P3[i % P3.length], P3[i - 1])));
  const len = cum[P3.length],
    scr = P3.map(p => P(...p));
  let slen = 0;
  for (let i = 0; i < scr.length; i++) slen += Math.hypot(scr[(i + 1) % scr.length][0] - scr[i][0], scr[(i + 1) % scr.length][1] - scr[i][1]);
  const k = slen / (len || 1),
    d = pd(P3),
    chainy = !!o.chain,
    // width in model units, like the wheels: a bike chain is about a tenth of a small sprocket's radius
    w = (o.w ?? Math.max(0.5, Math.min(...R) * (chainy ? 0.22 : 0.18))) * k,
    m = asM(o.m || (chainy ? '#55585e' : '#3b3a3f')),
    pitch = o.pitch ?? 2,
    off = f(-(o.t || 0) * k);
  // widths in model units go in style="stroke-width:..", which the on-screen line weight leaves alone
  const sw = x => `style="stroke-width:${f(x)}"`;
  let out =
    `<path d="${d}" fill="none" stroke="${INK}" ${sw(w + 1.3 * INK_K)} stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${m.m}" ${sw(w)} stroke-linejoin="round"/>`;
  out += chainy
    ? `<path d="${d}" fill="none" stroke="${m.l}" ${sw(w * 0.5)} stroke-dasharray="${f(pitch * k * 0.62)} ${f(pitch * k * 0.38)}" stroke-dashoffset="${off}"/>`
    : `<path d="${d}" fill="none" stroke="${m.l}" ${sw(w * 0.22)} stroke-dasharray="${f(pitch * k * 0.3)} ${f(pitch * k * 1.7)}" stroke-dashoffset="${off}" opacity=".8"/>`;
  const res = new String(out);
  res.len = len;
  res.at = sv => {
    let x = (((sv + (o.t || 0)) % len) + len) % len,
      i = 1;
    while (i < cum.length - 1 && cum[i] < x) i++;
    const t = (x - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    return lerp3(P3[i - 1], P3[i % P3.length], t);
  };
  return res;
}
// force(at3, vec3, {scale, col, w, tip}): a force arrow: its length is the force (vec3 times scale, in model units)
// and it gets a little bolder as it grows, so two forces compare at a glance. It starts at at3 (a pull or a weight);
// tip: true ends it at at3 instead (a push into the point). Name it with tag() at its middle.
function force(at3, vec3, o = {}) {
  const sc = o.scale ?? 1,
    v = mul3(vec3, sc),
    L = Math.hypot(...v);
  if (L < 1e-6) return '';
  const a = o.tip ? sub(at3, v) : at3,
    b = o.tip ? at3 : add(at3, v),
    w = o.w ?? (2.6 + Math.min(2, L * 0.05)) * INK_K;
  return arrow3([a, b], w, o.col || '#d9472b', { head: o.head || 8 + Math.min(4, L * 0.12) });
}
// incline(c3, len, wide, deg, m, {dir}): a solid slope (an inclined plane, a hill, a wedge) rising deg degrees along dir
// ('x', '-x', 'y', '-y' or a level vector) from its low edge at c3, len long and wide across. Returns a string with
// .pt(s, h, k): the 3D point s along the slope from the bottom, h above its surface, k across it (0..1, default .5),
// .along (the up-slope direction) and .up (the slope's outward normal): sit a box on it, split the weight into
// force(.., .along) and force(.., .up) parts.
function incline(c3, len, wide, deg, m, o = {}) {
  m = asM(m);
  const dirs = { x: [1, 0, 0], '-x': [-1, 0, 0], y: [0, 1, 0], '-y': [0, -1, 0] },
    dir = norm(dirs[o.dir || 'x'] || [o.dir[0], o.dir[1], 0]),
    sd = cross([0, 0, 1], dir),
    a = (deg * Math.PI) / 180,
    h = len * Math.tan(a),
    p0 = c3,
    p1 = add(c3, mul3(sd, wide)),
    p2 = add(c3, mul3(dir, len)),
    p3 = add(p1, mul3(dir, len)),
    q2 = add(p2, [0, 0, h]),
    q3 = add(p3, [0, 0, h]),
    along = norm(add(mul3(dir, Math.cos(a)), [0, 0, Math.sin(a)])),
    up = norm(add(mul3(dir, -Math.sin(a)), [0, 0, Math.cos(a)])),
    mid = avg([p0, p1, p2, p3, q2, q3]),
    faces = [
      [p0, p1, q3, q2],
      [p2, p3, q3, q2],
      [p0, p2, q2],
      [p1, p3, q3],
      [p0, p1, p3, p2],
    ];
  // straight edges: a wedge's sharp tip must not be rounded off
  const lp = q => 'M' + q.map(p => P(...p).map(f).join(' ')).join('L') + 'Z';
  let s = '',
    edges = '';
  for (const q of faces) {
    let nr = norm(cross(sub(q[1], q[0]), sub(q[2], q[0])));
    if (dot(nr, sub(avg(q), mid)) < 0) nr = nr.map(x => -x);
    if (vis(nr)) (s += face(lp(q), tone(nr, m))), (edges += lp(q));
  }
  s += ink(edges, 1.1);
  const res = new String(s);
  res.along = along;
  res.up = up;
  res.pt = (sv, hh = 0, k = 0.5) => add(add(add(p0, mul3(sd, wide * k)), mul3(along, sv)), mul3(up, hh));
  return res;
}
// arm(shoulder3, {len, bend, flex, side, skin, m, hand}): a human arm hanging from the shoulder: upper arm, elbow,
// forearm and a hand with fingers, in the plane facing the viewer (works in every view). bend = elbow angle in degrees
// (0 straight down, 140 fully bent); flex 0..1 bulges the biceps (it shortens and fattens as the elbow bends). len =
// whole length (default 60). side: 1 = the arm's front faces the viewer's right (default), -1 the left.
// Returns an object you add as a string, with .pt: shoulder elbow wrist hand fingertip biceps triceps forearm.
function arm(sh3, o = {}) {
  const L = o.len ?? 60,
    sd = o.side ?? 1,
    [e1, e2] = _screenPlane(),
    F = (u, v) => add(sh3, add(mul3(e1, u * sd), mul3(e2, v))),
    up = L * 0.46,
    fa = L * 0.4,
    bend = ((o.bend ?? 0) * Math.PI) / 180,
    flex = clamp(o.flex ?? (o.bend ?? 0) / 140),
    skin = asM(o.skin || '#e8b896'),
    elbow = [0, -up],
    wrist = [Math.sin(bend) * fa, -up - Math.cos(bend) * fa],
    hd = [Math.sin(bend), -Math.cos(bend)],
    hp = [-hd[1], hd[0]],
    palmC = [wrist[0] + hd[0] * L * 0.07, wrist[1] + hd[1] * L * 0.07];
  let s = '';
  // the upper arm and forearm as tapering tubes, the biceps as a muscle on the front of the upper arm
  s += tube([F(0, 0), F(0, -up * 0.5), F(...elbow)], L * 0.085, skin, { r1: L * 0.062, w: 1 });
  s += tube([F(...elbow), F((elbow[0] + wrist[0]) / 2, (elbow[1] + wrist[1]) / 2), F(...wrist)], L * 0.062, skin, { r1: L * 0.042, w: 1 });
  const bc = [L * 0.05 + flex * L * 0.02, -up * (0.5 + flex * 0.05)];
  s += blob(F(...bc), L * 0.05, L * 0.05 * (1 + flex * 0.5), L * 0.13 * (1 - flex * 0.2), skin, { w: 0.9 });
  s += ball(F(...elbow), L * 0.05, skin, 0.9);
  // the hand: a palm and four fingers, curled a little, and a thumb
  s += blob(F(...palmC), L * 0.045, L * 0.045, L * 0.055, skin, { w: 0.9 });
  const tips = [];
  for (let k = 0; k < 4; k++) {
    const off = (k - 1.5) * L * 0.022,
      b0 = [palmC[0] + hd[0] * L * 0.05 + hp[0] * off, palmC[1] + hd[1] * L * 0.05 + hp[1] * off],
      lenF = L * (k === 0 || k === 3 ? 0.06 : 0.075),
      t1 = [b0[0] + hd[0] * lenF * 0.6 + hp[0] * lenF * 0.1 * sd, b0[1] + hd[1] * lenF * 0.6],
      t2 = [t1[0] + hd[0] * lenF * 0.45 + hp[0] * lenF * 0.25, t1[1] + hd[1] * lenF * 0.45 + hp[1] * lenF * 0.25];
    tips.push(t2);
    s += tube([F(...b0), F(...t1), F(...t2)], L * 0.0125, skin, { w: 0.7 });
  }
  const th0 = [palmC[0] - hp[0] * L * 0.04, palmC[1] - hp[1] * L * 0.04];
  s += tube([F(...th0), F(th0[0] - hp[0] * L * 0.03 + hd[0] * L * 0.03, th0[1] - hp[1] * L * 0.03 + hd[1] * L * 0.03)], L * 0.014, skin, { w: 0.7 });
  const pt = {
    shoulder: F(0, 0), elbow: F(...elbow), wrist: F(...wrist), hand: F(...palmC), fingertip: F(...tips[1]),
    biceps: F(...bc), triceps: F(-L * 0.05, -up * 0.5), forearm: F((elbow[0] + wrist[0]) / 2, (elbow[1] + wrist[1]) / 2),
  };
  return _organ(`<g class="organ arm">${s}</g>`, pt, {});
}
// enzyme(c3, size, {open, m, pocket, label}): a protein drawn as a soft lumpy shape with a pocket (its active or
// binding site) on one side, flat to the viewer: an enzyme, a receptor, a transporter. pocket: the side the pocket
// faces, in degrees (0 = right, 90 = up). open 0..1 widens the pocket. Returns an object with .pt: centre, pocket
// (where a small molecule fits; dock a token there), entrance (just outside the pocket). Say in simplified that the
// shape is a sketch, not the real structure.
function enzyme(c3, size = 20, o = {}) {
  const m = asM(o.m || '#8fb0e8'),
    [e1, e2] = _screenPlane(),
    F = (u, v) => add(c3, add(mul3(e1, u), mul3(e2, v))),
    pa = ((o.pocket ?? 0) * Math.PI) / 180,
    open = clamp(o.open ?? 0.6),
    R = size / 2,
    rnd = _rng(o.seed ?? 4),
    bumps = Array.from({ length: 7 }, () => 0.9 + rnd() * 0.2),
    pts = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * 2 * Math.PI;
    let d = Math.abs(Math.atan2(Math.sin(a - pa), Math.cos(a - pa)));
    const notch = d < 0.45 + open * 0.2 ? Math.cos((d / (0.45 + open * 0.2)) * (Math.PI / 2)) * (0.42 + open * 0.08) : 0,
      bump = bumps[Math.floor((i / 48) * 7)] + 0.05 * Math.sin(a * 5 + 1);
    const rr = R * (bump - notch);
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.85]);
  }
  const P2 = pts.map(([u, v]) => F(u, v)),
    g = gid('enz');
  let s =
    `<radialGradient id="${g}" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="${mix(m.l, '#ffffff', 0.3)}"/><stop offset=".6" stop-color="${m.l}"/><stop offset="1" stop-color="${m.m}"/></radialGradient>` +
    `<path d="${pd(P2)}" fill="url(#${g})" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`;
  // a few inner folds so it reads as a folded protein, not a stone
  let d = '';
  for (let k = 0; k < 4; k++) {
    const a0 = pa + Math.PI * (0.5 + k * 0.35),
      p = [];
    for (let j = 0; j <= 6; j++) {
      const a = a0 + j * 0.18,
        rr = R * (0.35 + 0.08 * Math.sin(j + k));
      p.push(F(Math.cos(a) * rr, Math.sin(a) * rr * 0.85));
    }
    d += pd(p, false);
  }
  s += `<path d="${d}" fill="none" stroke="${m.d}" stroke-width=".6" opacity=".6"/>`;
  const pt = {
    centre: F(0, 0),
    pocket: F(Math.cos(pa) * R * 0.62, Math.sin(pa) * R * 0.62 * 0.85),
    entrance: F(Math.cos(pa) * R * 1.25, Math.sin(pa) * R * 1.25 * 0.85),
  };
  return _organ(`<g class="organ enzyme">${s}</g>`, pt, {});
}
// alveoli(c3, size, {breath, m}): the end of an airway, flat to the viewer: a bronchiole that splits into a cluster
// of air sacs (alveoli), each wrapped in a net of capillaries that runs blue (oxygen-poor) on the left to red
// (oxygen-rich) on the right, with the arteriole coming in and the venule leaving. breath 0..1 inflates the sacs.
// Returns an object with .pt: bronchiole duct sac wall air capillary arteriole venule, and .path: airIn (down the
// bronchiole into a sac) and bloodIn (along the capillary past the sacs). Say in scale that it is enlarged hugely
// (an alveolus is about 0.2 mm across).
function alveoli(c3, size = 60, o = {}) {
  const [e1, e2] = _screenPlane(),
    F = (u, v) => add(c3, add(mul3(e1, u * size), mul3(e2, v * size))),
    b = clamp(o.breath ?? 0.5),
    m = asM(o.m || '#f4b8b4'),
    rs = 0.125 * (0.88 + 0.24 * b);
  // the sacs: a rosette round the end of the duct, the front one last
  const ring = [
    [-0.27, -0.02],
    [-0.2, -0.26],
    [0.02, -0.36],
    [0.24, -0.25],
    [0.29, -0.01],
    [0.14, 0.12],
    [-0.13, 0.12],
    [0.02, -0.12],
  ];
  const circ = (cu, cv, r, n = 30) => Array.from({ length: n }, (_, i) => F(cu + Math.cos((i / n) * 2 * Math.PI) * r, cv + Math.sin((i / n) * 2 * Math.PI) * r));
  let s = '';
  // the arteriole (oxygen-poor) in from the left and the venule (oxygen-rich) out to the right, behind the sacs
  const art = [F(-0.62, 0.05), F(-0.45, -0.05), F(-0.33, -0.18), F(-0.15, -0.42), F(0.05, -0.47)],
    ven = [F(0.05, -0.47), F(0.25, -0.4), F(0.38, -0.18), F(0.47, -0.04), F(0.62, 0.06)];
  s += tube(art, 0.035 * size, BLOOD_LOW.m, { r1: 0.022 * size }) + tube(ven, 0.022 * size, BLOOD_HIGH.m, { r1: 0.035 * size });
  // the bronchiole and its duct
  s += tube([F(0, 0.62), F(0, 0.4), F(0.01, 0.22), F(0.02, 0.02)], 0.065 * size, mix(m.l, m.m, 0.5), { r1: 0.045 * size });
  const g = gid('alv');
  s += `<radialGradient id="${g}" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="${mix(m.l, '#ffffff', 0.5)}"/><stop offset=".7" stop-color="${m.l}"/><stop offset="1" stop-color="${m.m}"/></radialGradient>`;
  for (const [cu, cv] of ring) {
    const r = rs * (cu === 0.02 && cv === -0.12 ? 1.08 : 1);
    s += `<path d="${pd(circ(cu, cv, r))}" fill="url(#${g})" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`;
    // capillaries over the sac: three arcs whose colour follows where they are, blue on the left, red on the right
    let net = '';
    for (let k = 0; k < 4; k++) {
      const a0 = -1.6 + k * 0.85,
        pts = [];
      for (let j = 0; j <= 8; j++) {
        const a = a0 + (j / 8) * 2.2,
          rr = r * (0.55 + 0.38 * Math.sin((j / 8) * Math.PI));
        pts.push(F(cu + Math.cos(a) * rr, cv + Math.sin(a) * rr));
      }
      net += `<path d="${pd(pts, false)}" fill="none" stroke="${bloodColour(clamp((cu + 0.3) / 0.6))}" stroke-width="1.6" stroke-linecap="round" opacity=".9"/>`;
    }
    s += net;
  }
  const front = ring[ring.length - 1];
  const pt = {
    bronchiole: F(0, 0.45),
    duct: F(0.015, 0.08),
    sac: F(front[0], front[1]),
    air: F(front[0] - 0.03, front[1] + 0.02),
    wall: F(front[0] + rs * 1.05, front[1]),
    capillary: F(0.24 + rs * 0.6, -0.25),
    arteriole: F(-0.52, 0.0),
    venule: F(0.52, 0.0),
  };
  const path = {
    airIn: [F(0, 0.62), F(0, 0.4), F(0.01, 0.2), F(0.02, 0.02), F(front[0], front[1])],
    bloodIn: art.concat(ven.slice(1)),
  };
  return _organ(`<g class="organ alveoli">${s}</g>`, pt, path);
}
// Ready-made tokens for living things and messages: cell, bcell (cell with receptors), antibody, virus, bacterium,
// packet. Use with token(), flow() and legend(), or token(p3, 'virus', 4) for a big one.
Object.assign(TOKENS, {
  cell: {
    m: { l: '#fde3e3', m: '#f1a9a9', d: '#b85c5c' },
    draw: ([X, Y], R, k) =>
      `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(R)}" fill="${k.m.l}" stroke="${k.m.d}" stroke-width="${f(Math.max(0.6, R * 0.12))}"/><circle cx="${f(X + R * 0.15)}" cy="${f(Y + R * 0.1)}" r="${f(R * 0.38)}" fill="${k.m.m}" stroke="${k.m.d}" stroke-width="${f(R * 0.06)}"/>`,
  },
  bcell: {
    m: { l: '#dce9ff', m: '#8db2ee', d: '#3d63a8' },
    draw: ([X, Y], R, k) => {
      let s = '';
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * 2 * Math.PI,
          c = Math.cos(a),
          d = Math.sin(a),
          bx = X + c * R,
          by = Y + d * R,
          tx = X + c * R * 1.45,
          ty = Y + d * R * 1.45,
          px = -d * R * 0.22,
          py = c * R * 0.22;
        s += `<path d="M${f(bx)} ${f(by)}L${f(X + c * R * 1.25)} ${f(Y + d * R * 1.25)}L${f(tx + px)} ${f(ty + py)}M${f(X + c * R * 1.25)} ${f(Y + d * R * 1.25)}L${f(tx - px)} ${f(ty - py)}" stroke="${k.m.d}" stroke-width="${f(R * 0.1)}" stroke-linecap="round" fill="none"/>`;
      }
      return (
        s +
        `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(R)}" fill="${k.m.l}" stroke="${k.m.d}" stroke-width="${f(Math.max(0.6, R * 0.12))}"/><circle cx="${f(X + R * 0.12)}" cy="${f(Y + R * 0.1)}" r="${f(R * 0.42)}" fill="${k.m.m}"/>`
      );
    },
  },
  antibody: {
    m: { l: '#cfe0ff', m: '#4f7fd6', d: '#2a4f9a' },
    draw: ([X, Y], R, k) =>
      `<path d="M${f(X)} ${f(Y + R * 1.1)}V${f(Y)}L${f(X - R * 0.8)} ${f(Y - R * 0.9)}M${f(X)} ${f(Y)}L${f(X + R * 0.8)} ${f(Y - R * 0.9)}" stroke="${k.m.d}" stroke-width="${f(Math.max(1, R * 0.42))}" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M${f(X)} ${f(Y + R * 1.1)}V${f(Y)}L${f(X - R * 0.8)} ${f(Y - R * 0.9)}M${f(X)} ${f(Y)}L${f(X + R * 0.8)} ${f(Y - R * 0.9)}" stroke="${k.m.l}" stroke-width="${f(Math.max(0.4, R * 0.16))}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  },
  virus: {
    m: { l: '#d9f0c8', m: '#7cba54', d: '#3f7a24' },
    draw: ([X, Y], R, k) => {
      let s = '';
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * 2 * Math.PI,
          c = Math.cos(a),
          d = Math.sin(a);
        s += `<path d="M${f(X + c * R)} ${f(Y + d * R)}L${f(X + c * R * 1.4)} ${f(Y + d * R * 1.4)}" stroke="${k.m.d}" stroke-width="${f(R * 0.12)}"/><circle cx="${f(X + c * R * 1.45)}" cy="${f(Y + d * R * 1.45)}" r="${f(R * 0.16)}" fill="#e0452f" stroke="${k.m.d}" stroke-width="${f(R * 0.05)}"/>`;
      }
      return (
        s +
        `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(R)}" fill="${k.m.m}" stroke="${k.m.d}" stroke-width="${f(Math.max(0.6, R * 0.12))}"/><circle cx="${f(X - R * 0.3)}" cy="${f(Y - R * 0.3)}" r="${f(R * 0.35)}" fill="${k.m.l}" opacity=".7"/>`
      );
    },
  },
  bacterium: {
    m: { l: '#f6e7b8', m: '#d9b04a', d: '#8d6a16' },
    draw: ([X, Y], R, k) =>
      `<rect x="${f(X - R * 1.5)}" y="${f(Y - R * 0.7)}" width="${f(R * 3)}" height="${f(R * 1.4)}" rx="${f(R * 0.7)}" fill="${k.m.l}" stroke="${k.m.d}" stroke-width="${f(Math.max(0.6, R * 0.12))}" transform="rotate(-25 ${f(X)} ${f(Y)})"/>`,
  },
  // red blood cells: a disc with a pale dimple; rbc carries oxygen (red), rbcLow has given it up (darker, blue-red)
  rbc: {
    m: { l: '#f08080', m: '#d63c3c', d: '#8a1f1f' },
    draw: ([X, Y], R, k) =>
      `<ellipse cx="${f(X)}" cy="${f(Y)}" rx="${f(R * 1.25)}" ry="${f(R)}" fill="${k.m.m}" stroke="${k.m.d}" stroke-width="${f(Math.max(0.5, R * 0.12))}"/><ellipse cx="${f(X)}" cy="${f(Y)}" rx="${f(R * 0.55)}" ry="${f(R * 0.42)}" fill="${k.m.l}"/>`,
  },
  rbcLow: {
    m: { l: '#a77fb2', m: '#7b3f6e', d: '#4a1f43' },
    draw: ([X, Y], R, k) =>
      `<ellipse cx="${f(X)}" cy="${f(Y)}" rx="${f(R * 1.25)}" ry="${f(R)}" fill="${k.m.m}" stroke="${k.m.d}" stroke-width="${f(Math.max(0.5, R * 0.12))}"/><ellipse cx="${f(X)}" cy="${f(Y)}" rx="${f(R * 0.55)}" ry="${f(R * 0.42)}" fill="${k.m.l}"/>`,
  },
  packet: {
    m: { l: '#ffffff', m: '#e8eef8', d: '#3b5b92' },
    draw: ([X, Y], R, k) =>
      `<rect x="${f(X - R * 1.3)}" y="${f(Y - R * 0.9)}" width="${f(R * 2.6)}" height="${f(R * 1.8)}" rx="${f(R * 0.2)}" fill="${k.m.l}" stroke="${k.m.d}" stroke-width="${f(Math.max(0.6, R * 0.14))}"/><path d="M${f(X - R * 1.3)} ${f(Y - R * 0.9)}L${f(X)} ${f(Y + R * 0.1)}L${f(X + R * 1.3)} ${f(Y - R * 0.9)}" fill="none" stroke="${k.m.d}" stroke-width="${f(Math.max(0.5, R * 0.12))}"/>`,
  },
});

// playNote(freq, secs, {type, vol}): play a short note (music, sound topics). Silent while steps replay instantly or the
// video is made, and when the learner turns Sound off in Options (shown when the lesson sets sound: true).
const SOUND = { on: true, silent: false, ctx: null };
function playNote(freq, secs = 0.9, o = {}) {
  if (!SOUND.on || SOUND.silent || typeof AudioContext === 'undefined') return;
  try {
    const ac = SOUND.ctx || (SOUND.ctx = new AudioContext()),
      t0 = ac.currentTime,
      g = ac.createGain();
    g.connect(ac.destination);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(o.vol ?? 0.22, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0005, t0 + secs);
    for (const [mul, a] of [
      [1, 1],
      [2, 0.35],
      [3, 0.15],
    ]) {
      const os = ac.createOscillator(),
        og = ac.createGain();
      os.type = o.type || 'triangle';
      os.frequency.value = freq * mul;
      og.gain.value = a;
      os.connect(og);
      og.connect(g);
      os.start(t0);
      os.stop(t0 + secs + 0.05);
    }
  } catch (e) {}
}

/* ---------- drawing styles (the learner can switch; the lesson sets the default) ---------- */
// clear    = an illustrator's drawing: smooth shading, soft shadows, dark outline with lighter inner lines (default)
// sketch   = hand-inked wobble and paper grain: built for charm
// contrast = white page, heavy black lines, light shadow: projectors, bright rooms, low vision
const STYLES = {
  clear: { label: 'Clear', filter: false, inkMul: 1, shadow: '#c3cadb', smooth: true, soft: true },
  sketch: { label: 'Sketch', filter: true, inkMul: 1, shadow: '#41538f', smooth: false, soft: false },
  contrast: {
    label: 'High contrast',
    filter: false,
    inkMul: 1.55,
    shadow: '#d5d8de',
    smooth: false,
    soft: false,
  },
};
let STYLE = STYLES.clear;

/* ---------- constant on-screen line weight ---------- */
const INK_REF_VB = 585;
let INK_K = 1;
const inkScale = svg => {
  const k = INK_K * STYLE.inkMul;
  return k === 1
    ? svg
    : svg.replace(/stroke-width="([\d.]+)"/g, (_, w) => `stroke-width="${(+w * k).toFixed(2)}"`);
};

const filterFor =
  k => `<filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${(2 * k).toFixed(2)}"/></filter>
<filter id="softL" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${(6 * k).toFixed(2)}"/></filter>
<filter id="hand" x="-3%" y="-3%" width="106%" height="106%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${(0.045 / k).toFixed(4)}" numOctaves="2" seed="4" result="warp"/>
  <feDisplacementMap in="SourceGraphic" in2="warp" scale="${(2.4 * k).toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="wob"/>
  <feTurbulence type="fractalNoise" baseFrequency="${(0.9 / k).toFixed(4)}" numOctaves="3" seed="11" result="n1"/>
  <feColorMatrix in="n1" type="matrix" values=".3 0 0 0 .84 .3 0 0 0 .84 .3 0 0 0 .84 0 0 0 0 1" result="grain"/>
  <feTurbulence type="fractalNoise" baseFrequency="${(0.012 / k).toFixed(4)}" numOctaves="2" seed="7" result="n2"/>
  <feColorMatrix in="n2" type="matrix" values=".3 0 0 0 .85 .3 0 0 0 .85 .3 0 0 0 .85 0 0 0 0 1" result="blot"/>
  <feBlend in="wob" in2="grain" mode="multiply" result="g1"/><feBlend in="g1" in2="blot" mode="multiply" result="g2"/>
  <feComposite in="g2" in2="wob" operator="in"/></filter>`;

/* ---------- MP4 writer for the video download (one video track, H.264 or VP9, moov first) ---------- */
function mp4Mux({ vp9, width, height, fps, desc, samples }) {
  const u32 = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255],
    u16 = n => [(n >> 8) & 255, n & 255];
  const str = t => [...t].map(c => c.charCodeAt(0)),
    cat = parts => {
      const out = [];
      for (const p of parts) for (const b of p) out.push(b);
      return out;
    };
  const box = (type, ...parts) => {
    const body = cat(parts);
    return [...u32(body.length + 8), ...str(type), ...body];
  };
  const full = (type, v, flags, ...parts) => box(type, [v, ...u32(flags).slice(1)], ...parts);
  const TS = fps * 1000,
    D = 1000,
    n = samples.length,
    durMs = Math.round((n * 1000) / fps);
  const MATRIX = [
    ...u32(0x10000),
    ...u32(0),
    ...u32(0),
    ...u32(0),
    ...u32(0x10000),
    ...u32(0),
    ...u32(0),
    ...u32(0),
    ...u32(0x40000000),
  ];
  const cfgBox = vp9
    ? full('vpcC', 1, 0, [0, 31, (8 << 4) | (1 << 1), 1, 1, 1], u16(0))
    : box('avcC', Array.from(desc || []));
  const entry = box(
    vp9 ? 'vp09' : 'avc1',
    [0, 0, 0, 0, 0, 0],
    u16(1),
    u16(0),
    u16(0),
    u32(0),
    u32(0),
    u32(0),
    u16(width),
    u16(height),
    u32(0x00480000),
    u32(0x00480000),
    u32(0),
    u16(1),
    new Array(32).fill(0),
    u16(0x18),
    u16(0xffff),
    cfgBox
  );
  const keys = samples.map((s, i) => (s.key ? i + 1 : 0)).filter(Boolean);
  const moov = off =>
    box(
      'moov',
      full(
        'mvhd',
        0,
        0,
        u32(0),
        u32(0),
        u32(1000),
        u32(durMs),
        u32(0x10000),
        u16(0x100),
        new Array(10).fill(0),
        MATRIX,
        new Array(24).fill(0),
        u32(2)
      ),
      box(
        'trak',
        full(
          'tkhd',
          0,
          3,
          u32(0),
          u32(0),
          u32(1),
          u32(0),
          u32(durMs),
          new Array(8).fill(0),
          u16(0),
          u16(0),
          u16(0),
          u16(0),
          MATRIX,
          u32(width << 16),
          u32(height << 16)
        ),
        box(
          'mdia',
          full('mdhd', 0, 0, u32(0), u32(0), u32(TS), u32(n * D), u16(0x55c4), u16(0)),
          full('hdlr', 0, 0, u32(0), str('vide'), new Array(12).fill(0), str('VideoHandler'), [0]),
          box(
            'minf',
            full('vmhd', 0, 1, new Array(8).fill(0)),
            box('dinf', full('dref', 0, 0, u32(1), full('url ', 0, 1))),
            box(
              'stbl',
              full('stsd', 0, 0, u32(1), entry),
              full('stts', 0, 0, u32(1), u32(n), u32(D)),
              full('stss', 0, 0, u32(keys.length), ...keys.map(u32)),
              full('stsc', 0, 0, u32(1), u32(1), u32(n), u32(1)),
              full('stsz', 0, 0, u32(0), u32(n), ...samples.map(s => u32(s.data.length))),
              full('stco', 0, 0, u32(1), u32(off))
            )
          )
        )
      )
    );
  const ftyp = box(
    'ftyp',
    str('isom'),
    u32(512),
    str('isom'),
    str('iso2'),
    str(vp9 ? 'vp09' : 'avc1'),
    str('mp41')
  );
  const mlen = moov(0).length,
    off = ftyp.length + mlen + 8;
  let dataLen = 0;
  for (const s of samples) dataLen += s.data.length;
  const head = new Uint8Array([...ftyp, ...moov(off), ...u32(dataLen + 8), ...str('mdat')]);
  const out = new Uint8Array(head.length + dataLen);
  out.set(head, 0);
  let p = head.length;
  for (const s of samples) {
    out.set(s.data, p);
    p += s.data.length;
  }
  return out;
}

/* ---------- lesson page ---------- */
// Page design: one obvious next action at a time, inside the lesson card under the text. Progress at the top.
// The learner acts (press a part, drag a slider, explore parts, try it yourself), not just watches.
const LESSON_CSS = `${FONT_FACE}
:root{--page:#ffffff;--soft:#f3f4f6;--ink:#1d1f24;--muted:#6b7079;--rule:#e1e2e5;--card:#ffffff;--act:#2a4fd6;--act-dark:#1f3fb0;--hi:#ffc93c;--good:#1d7a45;--bad:#b3392b}
*{box-sizing:border-box}
html,body{margin:0;background:var(--page)}
body{color:var(--ink);font:17px/1.55 ${SANS};display:flex;flex-direction:column;align-items:center;padding:28px clamp(24px,3.6vw,64px) 48px;min-height:100vh;-webkit-font-smoothing:antialiased}
.wrap{width:100%;max-width:1800px}
.top{display:flex;justify-content:space-between;align-items:baseline;gap:16px}
.top h1{font-size:clamp(22px,2.1vw,32px);line-height:1.15;font-weight:700;margin:0;letter-spacing:-.022em;max-width:40ch}
.opts{position:relative;flex:none}
.optbtn{font:inherit;font-size:14px;color:var(--muted);background:none;border:0;padding:6px 2px;cursor:pointer}
.optbtn:hover,.optbtn[aria-expanded=true]{color:var(--ink)}
.menu{position:absolute;right:0;top:calc(100% + 6px);z-index:5;width:290px;background:var(--card);border:1px solid var(--rule);border-radius:14px;box-shadow:0 10px 30px rgba(20,24,32,.12);padding:14px 16px}
.menu[hidden]{display:none}
.menu h3{font-size:13px;font-weight:600;color:var(--muted);margin:14px 0 6px}
.mrow{display:flex;gap:8px}
.mrow.prow{flex-wrap:wrap}.prow .mbtn{flex:1 1 40%}
.mbtn{flex:1;font:inherit;font-size:14px;font-weight:600;color:var(--ink);background:var(--soft);border:0;border-radius:9px;padding:9px 10px;cursor:pointer}
.mbtn:hover{background:#eceef1}
.opts-list{display:flex;flex-direction:column;gap:4px}
.opt{display:flex;gap:10px;align-items:flex-start;text-align:left;font:inherit;font-size:14px;background:none;border:0;border-radius:9px;padding:6px 8px;cursor:pointer;color:var(--ink)}
.opt:hover{background:var(--soft)}
.opt small{display:block;color:var(--muted);font-size:12.5px}
.opt .dot{flex:none;width:15px;height:15px;margin-top:3px;border-radius:50%;border:1.5px solid var(--muted)}
.opt[aria-checked=true] .dot{background:var(--act);border-color:var(--act);box-shadow:inset 0 0 0 3px #fff}
.switch{display:flex;gap:10px;align-items:center;font:inherit;font-size:14px;background:none;border:0;padding:4px 8px;cursor:pointer;color:var(--ink);text-align:left}
.switch .track{flex:none;width:38px;height:22px;border-radius:11px;background:var(--rule);position:relative}
.switch .track::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25)}
.switch[aria-checked=true] .track{background:var(--act)}
.switch[aria-checked=true] .track::after{left:19px}
.keys{margin:0;padding:0 8px;list-style:none;font-size:13px;color:var(--muted);display:grid;gap:3px}
.keys kbd{font:inherit;font-size:12px;color:var(--ink);border:1px solid var(--rule);border-bottom-width:2px;border-radius:5px;padding:0 5px;background:#fff}
.layout{display:block;margin-top:clamp(8px,1.4vw,20px)}
.stage{position:relative;background:#fff;padding:clamp(4px,1vw,12px) 0 0;min-width:0}
#fig{width:100%;height:auto;max-height:calc(100vh - 120px);display:block;margin:0 auto;user-select:none;-webkit-user-select:none;overflow:visible;touch-action:pan-y}
#fig.zoomed{overflow:hidden;border-radius:12px;cursor:grab;touch-action:none}
#fig.zoomed.panning{cursor:grabbing}
#fig [data-act],#fig .tag.has-info{cursor:pointer}
#fig .tag.has-info:focus{outline:none} #fig .tag.has-info:focus-visible rect{stroke:var(--act);stroke-width:3}
#fig:focus-visible{outline:2px solid var(--act);outline-offset:4px;border-radius:8px}
.flatface *{vector-effect:non-scaling-stroke}
@keyframes tm-pulse{from{transform:scale(.55);opacity:.95}to{transform:scale(1.5);opacity:0}}
.pulse{animation:tm-pulse 1.3s ease-out infinite;transform-box:fill-box;transform-origin:center}
/* read, look and press in one place. On wide screens one card sits in the picture's top-left corner, right beside
   the drawing: the progress bar, the words, what you touch (answers, a slider, the sandbox controls), then Back and
   the blue button directly under the last line you read. The drawing fills the rest. Phones stack the same order. */
.cap{padding:8px 2px 0}
html.ov .cap{position:absolute;left:0;top:0;width:clamp(320px,30%,400px);max-height:calc(100% - 4px);overflow:auto;z-index:3;padding:14px 18px 0;
  background:rgba(255,255,255,.95);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border-radius:14px;box-shadow:0 4px 22px rgba(20,24,32,.08)}
html.ov .pbody h2{font-size:17px;line-height:1.3;margin-bottom:4px}
html.ov .pbody .say,html.ov .pbody .q,html.ov .pbody .lede{font-size:15px;line-height:1.5}
html.ov .chap{font-size:12px}
html.ov .stats{left:auto;right:0;text-align:right}
.cap .todo{margin:8px 0 0;padding:0;background:none}
.dock{margin-top:12px}
.act{margin:0 0 14px} .act:empty{display:none}
.act .choices{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:10px}
.act .todo{margin:0;max-width:760px}
html.ov .dock .pfoot{margin-top:0;position:static;padding-bottom:0}
/* stacked (phones, short screens): Back and Next stay on screen, fixed to the bottom */
html:not(.ov) body{padding-bottom:calc(78px + env(safe-area-inset-bottom))}
html:not(.ov) .dock .pfoot{position:fixed;left:0;right:0;bottom:0;margin:0;padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:rgba(255,255,255,.96);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-top:1px solid var(--rule);z-index:20}
html:not(.ov) .actions .btn.primary{margin-left:auto}
.actions .progress{flex:1;max-width:560px;margin:0 0 0 8px;gap:6px}
html.ov #fig{max-height:calc(100vh - var(--below,130px))}
html.ov .cap .progress{margin:0 0 12px;gap:6px}
html.ov .cap .act{margin:12px 0 0}
html.ov .cap .act .choices{grid-template-columns:1fr;gap:8px}
html.ov .cap .choice{min-height:42px;font-size:15px;padding:8px 12px}
html.ov .cap .act .todo{max-width:none;padding:10px 12px}
html.ov .cap .act .ctrls{grid-template-columns:1fr}
html.ov .cap .pfoot{position:sticky;bottom:0;margin:12px -18px 0;padding:10px 18px 12px;background:rgba(255,255,255,.97);border-top:1px solid var(--rule)}
html.ov .cap .actions{gap:10px} html.ov .cap .hint{font-size:13px}
html.ov .cap .btn.primary{white-space:normal;text-align:center;line-height:1.25}
html.ov .dock{display:none}
.act .todo .yt{display:inline;margin:0 10px 0 0}
.act .ctrls{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:8px 24px;align-items:end}
.act .ctrls .ctrl-row{grid-column:1/-1}
.act .todo{padding:8px 14px} .act .todo .range{margin-top:2px}

.progress{display:flex;flex-direction:column;gap:8px;margin:0 0 18px}
.count{font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums}
.bar{display:flex;gap:4px} .seg.cstart{margin-left:6px}
.chap{margin:0 0 2px;font-size:13px;font-weight:600;letter-spacing:.02em;color:var(--muted)}
.seg{flex:1;height:14px;padding:5px 0;border:0;background:none;cursor:pointer}
.seg span{display:block;height:4px;border-radius:2px;background:var(--rule)}
.seg.done span{background:var(--ink)} .seg.now span{background:var(--act)}
.seg:focus-visible{outline:2px solid var(--act);outline-offset:2px;border-radius:4px}
.pbody{flex:1}
.pfoot{margin-top:26px;position:sticky;bottom:0;background:#fff;padding-bottom:2px}
@media (min-width:820px) and (max-height:560px){ body{padding-top:12px} .top h1{font-size:20px} .layout{margin-top:6px} .pfoot{margin-top:12px} }
.stats{position:absolute;top:10px;left:2px;display:flex;gap:22px;pointer-events:none;z-index:1;transition:opacity .3s}
.stats.idle{opacity:0}
.stat{text-shadow:0 0 6px #fff,0 0 2px #fff}

.stat .k{font-size:12px;color:var(--muted);letter-spacing:.01em}
.stat .v{font-size:22px;line-height:1.15;font-weight:650;font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.stat.small .v{font-size:22px}
.zoombar{position:absolute;right:0;bottom:4px;display:flex;gap:6px;align-items:center;z-index:1}
.zb{font:inherit;font-size:17px;font-weight:500;min-width:36px;height:36px;border-radius:999px;border:0;background:var(--soft);color:var(--ink);cursor:pointer;padding:0;display:inline-grid;place-items:center;transition:background .15s}
.zb:hover{background:#e6e8ec}
.zsep{width:1px;height:18px;background:var(--rule);margin:0 2px}
.zb:focus-visible{outline:2px solid var(--act);outline-offset:2px}
.zb.fit{font-size:13px;font-weight:600;padding:0 14px}
.zb[hidden]{display:none}
.zb svg{width:14px;height:14px}
.zb.pp[aria-pressed="true"]{background:var(--act);color:#fff}
.pbody h2{font-size:clamp(19px,1.5vw,24px);line-height:1.25;font-weight:650;margin:0 0 10px;letter-spacing:-.01em}
.pbody .say{margin:0;font-size:clamp(15.5px,1.1vw,18px);line-height:1.6}
.pbody .q{margin:0 0 14px;font-size:clamp(15.5px,1.1vw,18px);line-height:1.5}
.todo{margin:14px 0 0;padding:12px 14px;border-radius:12px;background:#eef2ff;font-size:16px}
.todo .yt{display:block;font-size:12px;font-weight:650;color:var(--act);margin-bottom:2px}
.todo .range{margin-top:8px}
.todo .also{display:block;margin-top:4px;font-size:13.5px;color:var(--muted)}
.tip{margin:14px 0 0;font-size:14px;color:var(--muted)}
.views{margin:14px 0 0;padding:10px 0 0;border-top:1px solid var(--rule)}
.views .vt{display:block;font-size:12px;font-weight:650;color:var(--muted);margin-bottom:4px}
.views p{margin:0 0 6px;font-size:15px;line-height:1.5}
.pbody .lede{margin:0;font-size:clamp(17px,1.3vw,20px);line-height:1.55}
html.nolabels #art .tag{display:none} #fig.lit .tag:not(.on){opacity:.72;transition:opacity .2s} #fig.lit .tag:not(.on):hover{opacity:1}
.partinfo{margin:14px 0 0;font-size:15px;padding:10px 12px;border-radius:10px;background:var(--soft)}
.partinfo[hidden]{display:none}
@keyframes tm-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.enter{animation:tm-in .28s ease-out}
.guessbox{margin:12px 0 0;padding:9px 12px;border-radius:8px;font-size:15px;border:1.5px solid}
.guessbox.right{border-color:var(--good);background:#eef8f2} .guessbox.wrong{border-color:var(--bad);border-style:dashed;background:#fdf1ef}
.guessbox b{display:block;margin-bottom:2px}
.choices{display:flex;flex-direction:column;gap:8px}
.choice{display:flex;gap:12px;align-items:center;width:100%;min-height:46px;text-align:left;font:inherit;font-size:16px;color:var(--ink);background:#fff;border:1px solid var(--rule);border-radius:10px;padding:9px 14px;cursor:pointer}
.choice .l{flex:none;width:26px;height:26px;border-radius:50%;border:1.5px solid var(--muted);display:grid;place-items:center;font-size:13px;font-weight:600}
.choice:hover:not([disabled]){border-color:var(--act)}
.choice[disabled]{cursor:default;opacity:.65}
.choice.right{opacity:1;border:2px solid var(--good);background:#eef8f2}
.choice.wrong{opacity:1;border:2px dashed var(--bad);background:#fdf1ef}
.choice .tagline{margin-left:auto;font-size:13px;font-weight:600}
.choice.right .tagline{color:var(--good)} .choice.wrong .tagline{color:var(--bad)}
.why{margin:10px 0 0;font-size:16px}
.ctrls{display:grid;gap:12px;margin-top:4px}
.range label{display:flex;justify-content:space-between;gap:12px;font-size:15px;font-weight:600;margin-bottom:2px}
.range output{font-variant-numeric:tabular-nums}
.range input{width:100%;accent-color:var(--act);height:30px;cursor:pointer}
.ctrl-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.observe{margin:12px 0 0;padding:2px 0 2px 12px;border-left:3px solid var(--hi);font-size:16px}
.actions{display:flex;align-items:center;gap:12px}
.hint{flex:1;margin:0;font-size:13.5px;line-height:1.35;color:var(--muted);text-align:right}
.btn{font:inherit;font-size:15px;font-weight:600;border-radius:999px;min-height:44px;padding:9px 22px;cursor:pointer;white-space:nowrap}
.btn.primary{background:var(--act);color:#fff;border:0}
.btn.primary:hover{background:var(--act-dark)}
.btn.secondary{background:#fff;color:var(--ink);border:1px solid var(--rule)}
.btn.secondary:hover{border-color:var(--muted)}
.btn.quiet{background:none;border:0;color:var(--muted);padding:9px 4px}
.btn.quiet:hover{color:var(--ink)}
.btn[hidden]{display:none}
.btn:focus-visible,.choice:focus-visible,.switch:focus-visible,.opt:focus-visible,.mbtn:focus-visible,.optbtn:focus-visible,summary:focus-visible,.range input:focus-visible{outline:2px solid var(--act);outline-offset:3px}
.about{margin-top:20px;font-size:14px;color:var(--muted);max-width:720px}
.about summary{cursor:pointer;padding:6px 0}
.about h3{font-size:13px;font-weight:600;margin:12px 0 4px;color:var(--ink)}
.about ul{margin:0;padding-left:20px;color:var(--ink)}
.about a{color:var(--act)}
.notice{margin:16px 0 0;max-width:720px;font-size:13px;color:var(--muted);border-left:3px solid #e2b23a;padding:2px 0 2px 10px}
.credit{margin-top:10px;font-size:12px;color:var(--muted)}
.credit a{color:inherit}
.vid{position:fixed;inset:0;z-index:50;display:grid;place-items:center;background:rgba(255,255,255,.9);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);padding:20px}
.vid[hidden]{display:none}
.vid .card{width:min(420px,100%);background:#fff;border:1px solid var(--rule);border-radius:18px;box-shadow:0 20px 50px rgba(20,24,32,.14);padding:24px}
.vid h2{margin:0 0 6px;font-size:21px;font-weight:650;letter-spacing:-.01em}
.vid p{margin:0 0 16px;font-size:15px;color:var(--muted)}
.vid .vbar{height:6px;border-radius:3px;background:var(--rule);overflow:hidden;margin-bottom:18px}
.vid .vbar span{display:block;height:100%;width:0;background:var(--act);transition:width .2s linear}
.vid .vact{display:flex;justify-content:flex-end;gap:10px}
.vid a.btn{text-decoration:none;display:inline-grid;place-items:center}
.score{font-size:40px;font-weight:650;margin:0 0 6px;font-variant-numeric:tabular-nums}
.sheet{display:none}
/* the page is always pure white; the Sketch style changes the drawing only */
html.st-contrast{--page:#ffffff;--ink:#000000;--muted:#2a2a2a;--rule:#5c5c5c;--card:#ffffff;--act:#0033cc;--act-dark:#002699}
html.st-contrast .choice,html.st-contrast .btn.secondary,html.st-contrast .zb{border-width:2px;border-color:#000}
html.st-contrast .menu{border:2px solid #000}
html.st-contrast .zb{background:#fff;border:2px solid #000}
html.full body{padding:16px 32px}
html.full .wrap{max-width:1280px}
html.full.ov .cap{width:clamp(340px,32%,520px)}
html.full .pbody h2{font-size:28px}
html.full .pbody .say,html.full .pbody .q,html.full .todo{font-size:22px}
html.full .choice{font-size:22px;min-height:62px}
html.full .about,html.full .credit,html.full .notice{display:none}
@media (max-width:819px){
  body{padding:10px 14px calc(78px + env(safe-area-inset-bottom))}
  .top{align-items:center} .top h1{font-size:20px;line-height:1.2}
  .layout{margin-top:8px}
  .stage{margin:0 -14px;padding:4px 4px 0}
  #fig{max-height:62vh}
  .actions .progress{margin:0} .actions .count{display:none} .act{margin-top:8px}
  .progress{margin-bottom:12px}
  .pbody h2{font-size:20px} .pbody .say,.pbody .q{font-size:16px}
  .stats{top:6px;left:14px;gap:16px} .stat .v,.stat.small .v{font-size:17px} .stat .k{font-size:11px}
  .zoombar{right:12px;bottom:4px} .zb{min-width:40px;height:40px}
  .pfoot{position:fixed;left:0;right:0;bottom:0;margin:0;padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:rgba(255,255,255,.96);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-top:1px solid var(--rule);z-index:20}
  .actions .btn.primary{flex:1 1 auto;max-width:68%;margin-left:auto}
  .hint{text-align:right}
  .about{padding:0 2px 12px;margin-top:22px}
  .menu{position:fixed;right:12px;left:12px;top:52px;width:auto;max-height:calc(100vh - 140px);overflow:auto}
}
@media (max-width:819px) and (orientation:landscape) and (max-height:500px){
  #fig{max-height:calc(100vh - 70px)} body{padding-bottom:12px} .stage{margin:0}
  .pfoot{position:sticky;bottom:0;margin:12px 0 0;padding:8px 0 4px;background:#fff;border-top:1px solid var(--rule);-webkit-backdrop-filter:none;backdrop-filter:none}
}
@media (max-width:360px){ .pbody h2{font-size:18px} .choice{font-size:15px} .btn{padding:9px 16px} }
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}.pulse{opacity:.8;transform:scale(1.1)}}
@media print{
  body{background:#fff;padding:0} .dock,.cap,.opts,.about,.credit,.zoombar,.stats{display:none!important} .layout{display:block} .stage{border:0}
  .sheet{display:block;font-size:13px} .sheet h2{font-size:15px;margin:14px 0 6px} .sheet ol{padding-left:20px} .sheet li{margin-bottom:6px}
  .sheet .blank{border-bottom:1px solid #999;height:22px;margin:4px 0 10px} .sheet .key{margin-top:18px;font-size:11px;color:#555;border-top:1px dashed #999;padding-top:8px}
  html.pr-poster .wrap>*:not(.sheet),html.pr-diagram .wrap>*:not(.sheet),html.pr-handout .wrap>*:not(.sheet){display:none!important}
  html.pr-poster .wrap,html.pr-diagram .wrap,html.pr-handout .wrap{padding:0;max-width:none;margin:0}
  .ppage{break-after:page;page-break-after:always;color:#1d1f24} .ppage:last-child{break-after:auto;page-break-after:auto}
  .phead h1{font-size:30px;line-height:1.15;margin:0 0 6px;letter-spacing:-.01em} .phead.small h1{font-size:22px}
  .pidea{font-size:15px;margin:0 0 10px;padding:8px 12px;background:#fff7dc;border-left:4px solid #f2b705;border-radius:4px}
  .pfig{display:block;width:100%;height:auto} figure{margin:0}
  .poster,.diagram,.handout.first{height:var(--ph,274mm);display:flex;flex-direction:column;overflow:hidden} .poster>*,.diagram>*,.handout.first>*{flex:0 0 auto}
  .poster .pbig,.handout.first .pbig{flex:1 1 0;min-height:40mm} .poster .pbig .pfig,.handout.first .pbig .pfig{height:100%;max-height:none}
  .diagram .pcols{flex:1 1 0;min-height:0;overflow:hidden;align-items:stretch;grid-template-rows:minmax(0,1fr)} .diagram .pbig{min-height:0;height:100%;overflow:hidden} .diagram .pbig .pfig{height:100%;width:100%} .diagram .ptable{align-self:start}
  .poster.wide .pwide{flex:1 1 0;min-height:0;display:grid;grid-template-columns:1.5fr 1fr;gap:14px;overflow:hidden} .poster.wide .pwide .pbig .pfig{height:100%;max-height:none} .poster.wide .pparts{columns:1;margin-top:0}
  .poster.xwide .pbelow{display:grid;grid-template-columns:1.3fr 1fr;gap:16px;flex-shrink:1;overflow:hidden;min-height:0} .poster.xwide .pbelow .pparts{columns:2;margin-top:6px} .poster.xwide .pbelow .psteps ol{columns:2}
  .poster.wide .pmain{display:flex;flex-direction:column;min-height:0;overflow:hidden} .poster.wide .pmain .pbig{flex:1 1 0;min-height:40mm} .poster.wide .pside{overflow:hidden}
  .ppage.tight .pparts,.ppage.tight .psteps{font-size:9.5px} .ppage.tight .pparts li,.ppage.tight .psteps li{margin-bottom:1px} .ppage.tight .psteps h2{font-size:13px;margin:6px 0 3px}
  .ppage.tighter .pparts,.ppage.tighter .psteps{font-size:8.5px;line-height:1.25}
  .compact .pparts,.compact .psteps{font-size:10.5px} .psteps.short ol{columns:3} .poster.wide .psteps.short ol{columns:3} .poster.wide .psteps:not(.short) ol{columns:2} .compact .pparts li,.compact .psteps li{margin-bottom:2px} .pfoot2{flex-shrink:0}
  .poster .psteps,.poster .pparts{flex-shrink:1;overflow:hidden}
  .pparts{columns:2;column-gap:22px;font-size:12px;margin:10px 0 6px;padding-left:22px} .pparts li{break-inside:avoid;margin-bottom:4px} .pparts li.nopin{list-style:disc}
  .psteps{font-size:12px} .psteps h2,.ph2,.pquiz h2{font-size:16px;margin:10px 0 6px} .psteps ol{columns:2;column-gap:22px;padding-left:20px;margin:0} .psteps li{break-inside:avoid;margin-bottom:3px}
  .pfoot2{font-size:10px;color:#555;border-top:1px solid #ccc;margin-top:10px;padding-top:6px} .pfoot2 p{margin:2px 0}
  .pcols{display:grid;grid-template-columns:1.35fr 1fr;gap:14px;align-items:start}
  .ptable{border-collapse:collapse;font-size:11px;width:100%} .ptable th,.ptable td{border-bottom:1px solid #ddd;padding:4px 6px;text-align:left;vertical-align:top} .ptable th{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#666}
  .pstrip{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-top:8px} .pcell{break-inside:avoid;page-break-inside:avoid;border:1px solid #e3e5e8;border-radius:6px;padding:4px}
  .pstrip .pfig{max-height:34mm} .pcell figcaption{font-size:10.5px;line-height:1.35;margin-top:3px}
  .pgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px} .pcell.big .pfig{max-height:60mm} .pcell.big figcaption{font-size:11px}
  .pch{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#777} .pstat{margin:3px 0 0;color:#444}
  .pintro{font-size:13px;margin:0 0 8px} .pquiz{font-size:12.5px} .psrc{font-size:11px;word-break:break-all}
  .pin text{paint-order:normal}
}`;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* Mount a lesson on the page and run it. The config:

   mountLesson({
     title, subtitle?, level: 'kid' | 'student' | 'adult',
     style?: 'clear' | 'sketch' | 'contrast',      // default drawing style (the learner can switch)
     guess?: true | false,                         // ask the learner to guess before guess steps (they can switch)
     bounds: [[x0,y0,z0],[x1,y1,z1]],              // the scene's true envelope (or size: [W,D,H] from 0)
     palette: MAT.whitePlastic | {l,m,d} | 'cobalt',  // the body's real colour (see MAT)
     state: {...}, scene: (st, m) => svg, stats?: st => [{label, value, small?}],
     intro: 'what the learner sees before step 1',
     parts?: { 'Heater': 'one or two plain sentences', ... },   // tap a label or a chip to read about a part
     steps: [{ title, say, lit?: ['Heater'], zoom?: {at:[x,y,z], k:2},
               guess?: {q, choices:[...], answer: i, why},
               do?: {label: 'Press the switch', part?: 'switch', at?: [x,y,z], hint?},   // the learner causes the step
               drag?: {label: 'Drag to heat the water', secs?: 3},                       // the learner drives the animation
               run(st, ui) { ui.tween({...}, secs, after) or ui.animate(dt => {...; return stillRunning}, after) } }],
     tryit?: { title?, say, setup?(st), tick?(st, dt, ui), observe?(st) => 'live text',
               controls: [{type:'range', key, label, min, max, step, format?(v), onChange?(st, ui)},
                          {type:'toggle', key, label, onChange?(st, ui)},
                          {type:'button', label: 'text' | st => 'text', onClick(st, ui)}] },
     idea, simplified: [...], check: [{q, choices:[...], answer: i, why}], sources: [{title, url, note?}],
     acts?: { name(st, el, ui) {} }, credit?: {text, href} | false,
     notice?: 'Educational, not medical advice.',   // shown under the lesson and on the worksheet
     scale?: 'Schematic, not to scale' | 'Drawn to scale: 10 units = 1 micrometre'
   }) */
addEventListener('error', e => {
  document.documentElement.dataset.errors =
    (document.documentElement.dataset.errors || '') + ' ' + e.message + ';';
});
// A page shown in a hidden or not-yet-sized frame (a preview panel, a tab opened in the background) has no layout:
// nothing can be measured, so the picture would be framed wrong. Wait until the page has a size, then build it.
function mountLesson(cfg) {
  if (!(innerWidth > 0 && innerHeight > 0)) {
    let done = false;
    const go = () => {
      if (done || !(innerWidth > 0 && innerHeight > 0)) return;
      done = true;
      removeEventListener('resize', go);
      _mountLesson(cfg);
    };
    addEventListener('resize', go);
    const poll = () => (done ? 0 : innerWidth > 0 && innerHeight > 0 ? go() : setTimeout(poll, 100));
    poll();
    return;
  }
  _mountLesson(cfg);
}
function _mountLesson(cfg) {
  document.title = cfg.title;
  document.documentElement.lang = cfg.lang || 'en';
  const style = document.createElement('style');
  style.textContent = LESSON_CSS;
  document.head.appendChild(style);
  const N = cfg.steps.length,
    CHECK = cfg.check || [],
    T = cfg.tryit,
    PARTS = cfg.parts || {};
  cfg.steps.forEach(s => {
    if (!s.guess && s.predict) s.guess = s.predict;
  });
  const who = { kid: 'kids', student: 'students', adult: 'adults' }[cfg.level];
  const subtitle = cfg.subtitle || `A ${N}-step lesson${who ? ' for ' + who : ''}.`; // used on the printed worksheet
  const credit =
    cfg.credit === false
      ? ''
      : `<p class="credit">${cfg.credit && cfg.credit.href ? `<a href="${esc(cfg.credit.href)}" target="_blank" rel="noopener">${esc(cfg.credit.text || 'Made with /teachme')}</a>` : esc((cfg.credit && cfg.credit.text) || 'Made with /teachme')}</p>`;
  const partNames = Object.keys(PARTS);
  document.body.innerHTML = `
<div class="wrap">
<header class="top">
  <h1>${esc(cfg.title)}</h1>
  <div class="opts">
    <button class="optbtn" id="optB" aria-expanded="false" aria-controls="menu">Options</button>
    <div class="menu" id="menu" hidden>
      <div class="mrow"><button class="mbtn" id="restart">Start again</button><button class="mbtn" id="full" aria-pressed="false">Full screen</button></div>
      <div class="mrow" style="margin-top:8px"><button class="mbtn" id="video">Download video</button></div>
      <h3>Print or save as PDF</h3>
      <div class="mrow prow"><button class="mbtn" data-print="worksheet">Worksheet</button><button class="mbtn" data-print="poster">Poster</button><button class="mbtn" data-print="diagram">Labelled diagram</button><button class="mbtn" data-print="handout">Handout</button></div>
      <h3 id="styleH">Drawing style</h3>
      <div class="opts-list" role="radiogroup" aria-labelledby="styleH" id="styles">${Object.entries(STYLES)
        .map(
          ([k, v]) =>
            `<button class="opt" role="radio" data-style="${k}" aria-checked="false"><span class="dot"></span><span>${v.label}<small>${{ clear: 'Crisp lines. Easiest to read.', sketch: 'Hand-drawn look.', contrast: 'Bold lines on white. For projectors.' }[k]}</small></span></button>`
        )
        .join('')}</div>
      ${cfg.sound ? '<h3>Sound</h3><button class="switch" role="switch" id="soundSw" aria-checked="true"><span class="track"></span><span>Play sounds</span></button>' : ''}
      <h3>Labels</h3>
      <button class="switch" role="switch" id="labelSw" aria-checked="true"><span class="track"></span><span>Show labels</span></button>
      <h3>Questions</h3>
      <button class="switch" role="switch" id="guessSw" aria-checked="true"><span class="track"></span><span>Ask me to guess first</span></button>
      ${(cfg.check || []).length ? '<button class="switch" role="switch" id="quizSw" aria-checked="true" style="margin-top:6px"><span class="track"></span><span>Quiz at the end</span></button>' : ''}
      <h3>Keyboard</h3>
      <ul class="keys"><li><kbd>&rarr;</kbd> or <kbd>Space</kbd> next, <kbd>&larr;</kbd> back</li><li><kbd>A</kbd> <kbd>B</kbd> <kbd>C</kbd> answer</li><li><kbd>P</kbd> pause or play</li><li><kbd>+</kbd> <kbd>&minus;</kbd> zoom, <kbd>0</kbd> whole picture</li><li><kbd>F</kbd> full screen, <kbd>R</kbd> start again</li><li><kbd>L</kbd> labels on or off</li></ul>
    </div>
  </div>
</header>
<main class="layout">
<div class="stage" id="stage">
  ${cfg.stats ? '<div class="stats" id="stats" aria-hidden="true"></div>' : ''}
  <svg id="fig" role="img" tabindex="0" aria-label="${esc(cfg.title)}. ${esc(cfg.idea || '')}"><defs id="fdefs"></defs><g id="art"></g><g id="fx"></g></svg>
  <div class="zoombar" role="group" aria-label="Picture controls"><button class="zb fit" id="zfit" hidden>Whole picture</button><button class="zb rp" id="replay" hidden title="Replay this step" aria-label="Replay this step"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3.2 4.4A5 5 0 1 1 2 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M1.6 1.8v3.4H5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button><button class="zb pp" id="pp" aria-pressed="false" title="Pause (P)"></button>${cfg.turn ? '<span class="zsep" aria-hidden="true"></span><button class="zb" id="tl" aria-label="Turn left" title="Turn left ([)">&#x27F2;</button><button class="zb" id="tr" aria-label="Turn right" title="Turn right (])">&#x27F3;</button>' : ''}<span class="zsep" aria-hidden="true"></span><button class="zb" id="zout" aria-label="Zoom out" title="Zoom out (&minus;)">&minus;</button><button class="zb" id="zin" aria-label="Zoom in" title="Zoom in (+)">+</button></div>
<div class="cap" id="cap"><div class="pbody" aria-live="polite"><div id="body"></div><p class="partinfo" id="partinfo" hidden></p></div></div>
</div>
<div class="dock" id="dock">
  <div class="act" id="act"></div>
  <div class="pfoot"><div class="actions"><button class="btn quiet" id="back">Back</button><nav class="progress" aria-label="Lesson progress"><span class="count" id="count"></span><div class="bar" id="bar"></div></nav><span class="hint" id="hint"></span><button class="btn primary" id="next">Start</button></div></div>
</div>
</main>
${cfg.notice ? `<p class="notice">${esc(cfg.notice)}</p>` : ''}
${
  (cfg.simplified && cfg.simplified.length) || (cfg.sources && cfg.sources.length)
    ? `<details class="about"><summary>Sources and what&rsquo;s simplified</summary>
${cfg.scale ? `<h3>Scale</h3><ul><li>${esc(cfg.scale)}</li></ul>` : ''}
${cfg.simplified && cfg.simplified.length ? `<h3>What this lesson leaves out</h3><ul>${cfg.simplified.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
${cfg.sources && cfg.sources.length ? `<h3>Where the facts come from</h3><ul>${cfg.sources.map(x => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a>${x.note ? '. ' + esc(x.note) : ''}</li>`).join('')}</ul>` : ''}
</details>`
    : ''
}
${credit}
<section class="sheet" id="sheet"></section>
<div class="vid" id="vid" hidden role="dialog" aria-modal="true" aria-labelledby="vidH"><div class="card"><h2 id="vidH">Making your video</h2><p id="vidP"></p><div class="vbar"><span id="vidBar"></span></div><div class="vact" id="vidAct"></div></div></div>
</div>`;

  const fresh = () => JSON.parse(JSON.stringify(cfg.state || {}));
  let st = fresh();
  const pal = typeof cfg.palette === 'object' ? cfg.palette : PALS[cfg.palette] || PALS.cobalt;

  // framing: centre the scene's envelope; phones get a taller frame and bigger labels
  // framing: fit the scene's envelope into a frame shaped like the space it gets on this screen.
  // Recomputed when the screen changes shape (rotating a phone, resizing a window).
  const [lo, hi] = cfg.bounds || [[0, 0, 0], cfg.size || [100, 100, 100]];
  let fitBox = null; // without bounds: the measured outline of everything the lesson draws (see "fit" below)
  const svg = document.getElementById('fig'),
    stage = document.getElementById('stage');
  let vbW = 100,
    vbH = 60,
    INK_BASE = 1,
    frameKey = '',
    ENV = null; // ENV: the drawing's outline in the frame
  // wide screens (html.ov): the words sit in the picture's top-left corner, small, so the drawing and the words show
  // at a glance. The drawing is framed in the space beside them or below them, whichever lets it be bigger:
  // RX, RY = where that space starts (a share of the picture's width or height). The corner is sized for the
  // longest text in the lesson, so the drawing never jumps from step to step.
  const ovMQ = matchMedia('(min-width:820px) and (min-height:540px)'); // phones and short screens: words under the picture
  const capEl = document.getElementById('cap');
  let RX = 0,
    RY = 0,
    CB = 0; // CB: any words' area (0 on phones, where the words sit under the picture)
  const capNeed = () => {
    const m = capEl.cloneNode(false);
    m.removeAttribute('id');
    m.setAttribute('aria-hidden', 'true');
    m.style.cssText = 'visibility:hidden;top:0;bottom:auto;max-height:none;overflow:visible';
    stage.appendChild(m);
    const texts = [`<p class="lede">${esc(cfg.intro || '')}</p>`]
      .concat(
        cfg.steps.map(
          s => `<p class="chap">Part</p><h2>${esc(s.title)}</h2><p class="say">${esc(s.say || '')}</p>`
        )
      )
      .concat(
        cfg.steps
          .filter(s => s.guess || s.predict)
          .map(s => {
            const g = s.guess || s.predict;
            return `<h2>Make a guess</h2><p class="q">${esc(g.q)}</p></div><div class="act"><div class="choices">${(g.choices || []).map(c => `<button class="choice"><span class="l">A</span>${esc(c)}</button>`).join('')}</div>`;
          })
      )
      .concat(
        cfg.steps
          .filter(s => s.drag)
          .map(
            s =>
              `<p class="chap">Part</p><h2>${esc(s.title)}</h2><p class="say">${esc(s.say || '')}</p></div><div class="act"><div class="todo"><div class="range"><label>x</label><input type="range"></div></div>`
          )
      );
    let h = 0;
    for (const t of texts) {
      m.innerHTML = `<div class="pbody">${t}</div>`;
      h = Math.max(h, m.offsetHeight);
    }
    m.remove();
    return h + 112;
  }; // + the progress bar and the buttons
  // the tallest the row under the picture gets (answers, a slider, the sandbox controls), so Back and Next stay on screen
  const frameShape = () => {
    const w = innerWidth,
      h = innerHeight;
    if (!ovMQ.matches) return w < 480 ? 0.92 : Math.min(0.8, Math.max(0.6, (h / w) * 0.55)); // phones: picture on top, words under it
    const sw = stage.getBoundingClientRect().width || w,
      room = 130; // the card holds the controls
    document.documentElement.style.setProperty('--below', room + 'px');
    return Math.min(0.72, Math.max(0.4, (h - room) / sw)); // fill the height above the controls
  };
  const frame = () => {
    // measure with the offsets at zero, but put them back if nothing changed: a second call with the same size used
    // to leave them at zero, which threw the drawing into the top-left corner until the window was resized
    const keepOX = OX,
      keepOY = OY;
    OX = OY = 0;
    const pts = [];
    if (fitBox) pts.push([fitBox[0], fitBox[1]], [fitBox[2], fitBox[3]]);
    else
      for (const x of [lo[0], hi[0]])
        for (const y of [lo[1], hi[1]]) for (const z of [lo[2], hi[2]]) pts.push(P(x, y, z));
    const xs = pts.map(p => p[0]),
      ys = pts.map(p => p[1]);
    const bw = Math.max(...xs) - Math.min(...xs),
      bh = Math.max(...ys) - Math.min(...ys);
    document.documentElement.classList.toggle('ov', ovMQ.matches);
    {
      const home = ovMQ.matches ? stage : stage.parentElement,
        dock = document.getElementById('dock'),
        act = document.getElementById('act'),
        foot = document.querySelector('.pfoot'),
        prog = document.querySelector('.progress'),
        acts = document.querySelector('.actions');
      if (capEl.parentElement !== home) home.insertBefore(capEl, ovMQ.matches ? null : dock);
      if (ovMQ.matches) {
        if (prog.parentElement !== capEl) {
          capEl.insertBefore(prog, capEl.firstChild);
          capEl.appendChild(act);
          capEl.appendChild(foot);
        }
      } else if (prog.parentElement === capEl) {
        acts.insertBefore(prog, document.getElementById('hint'));
        dock.appendChild(act);
        dock.appendChild(foot);
      }
    }
    const sw = svg.getBoundingClientRect().width || innerWidth,
      lk = clamp(780 / sw, 1, 2.3);
    let tall = frameShape();
    RX = RY = CB = 0;
    if (ovMQ.matches) {
      const cw = capEl.getBoundingClientRect().width || 380,
        ch = Math.min(capNeed(), sw * tall * 0.9) + 14;
      // how big the drawing can be beside the words (full height) or below them (full width)
      const scale = (aw, ah) => Math.min((aw * sw) / (bw / 0.92), (ah * sw * tall) / (bh / 0.86));
      const side = scale(1 - (cw + 16) / sw, 1),
        under = scale(1, 1 - ch / (sw * tall));
      if (side * 1.3 >= under) RX = (cw + 16) / sw;
      else {
        // beside the card unless below is much bigger
        RY = ch / (sw * tall);
        // a wide drawing under the words: no empty band at the bottom
        const fit = bh / 0.86 / (bw / 0.92) / (1 - RY);
        if (fit < tall) {
          const t2 = Math.max(0.42, fit);
          RY = clamp(ch / (sw * t2), 0, 0.6);
          tall = t2;
        }
      }
      CB = 1;
      capEl.style.maxHeight = f(Math.max(100, Math.min(sw * tall, innerHeight - 150) - 12)) + 'px';
    } else capEl.style.removeProperty('max-height');
    document.documentElement.classList.toggle('cap-side', RX > 0);
    const key =
      tall.toFixed(3) +
      '|' +
      lk.toFixed(2) +
      '|' +
      RX.toFixed(3) +
      '|' +
      RY.toFixed(3) +
      '|' +
      f(bw) +
      '|' +
      f(bh);
    if (key === frameKey) {
      OX = keepOX;
      OY = keepOY;
      return false;
    }
    frameKey = key;
    LABEL_K = lk;
    const aw = 1 - RX,
      ah = 1 - RY;
    vbW = Math.max(bw / 0.92 / aw, bh / 0.86 / tall / ah);
    vbH = vbW * tall; // room around the drawing for labels
    OX = RX * vbW + (aw * vbW - bw) / 2 - Math.min(...xs);
    OY = RY * vbH + (ah * vbH - bh) / 2 - Math.min(...ys);
    ENV = [Math.min(...xs) + OX, Math.min(...ys) + OY, Math.max(...xs) + OX, Math.max(...ys) + OY];
    svg.setAttribute('viewBox', `0 0 ${f(vbW)} ${f(vbH)}`);
    // lines and labels: a steady on-screen size (they grow a little on big pictures, never to poster size)
    INK_BASE = (vbW / sw) * Math.min(sw / INK_REF_VB, 1.2);
    INK_K = INK_BASE;
    document.getElementById('fdefs').innerHTML = filterFor(INK_K);
    return true;
  };
  setView(cfg.view);
  frame();
  setLight(cfg.light || 105);
  const TURN = cfg.turn ? (typeof cfg.turn === 'object' ? cfg.turn : {}) : null;
  if (TURN) {
    PIV = TURN.pivot || [0, 0, 0];
    setTurn(((TURN.start || 0) * Math.PI) / 180);
  }

  const art = document.getElementById('art'),
    fx = document.getElementById('fx'),
    body = document.getElementById('body'),
    hint = document.getElementById('hint');
  const nextB = document.getElementById('next'),
    backB = document.getElementById('back');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ui = { st, step: -1, phase: 'intro', busy: false, _skip: false, _instant: false };
  const statsEl = document.getElementById('stats');

  let reframeT = 0,
    lastBox = '',
    fitPassFn = null; // set once the fit pass below is defined
  // fit the picture to its box again: on a window resize, and whenever the box itself changes size (a preview panel
  // that opens or grows, the font arriving, a scrollbar), so the drawing is never left in a corner
  const reframe = force => {
    if (!(innerWidth > 0 && innerHeight > 0)) return;
    const r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    if (!fitBox && !cfg.bounds && ui.phase === 'intro' && ui.step === -1 && fitPassFn) {
      fitPassFn();
      ui.render();
      return;
    }
    if (force) frameKey = '';
    if (frame()) {
      camTok++;
      cam = camFor(ui.phase === 'step' || ui.phase === 'do' || ui.phase === 'drag' ? zoomOf(ui.step) : null);
      applyCam();
      ui.render();
    }
  };
  const reframeSoon = force => {
    clearTimeout(reframeT);
    reframeT = setTimeout(() => reframe(force), 120);
  };
  addEventListener('resize', () => reframeSoon(false));
  if (typeof ResizeObserver === 'function')
    new ResizeObserver(() => {
      const r = stage.getBoundingClientRect(),
        k = Math.round(r.width) + 'x' + Math.round(r.height);
      if (k !== lastBox) {
        lastBox = k;
        reframeSoon(false);
      }
    }).observe(stage);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => reframeSoon(true));
  addEventListener('load', () => reframeSoon(true));
  addEventListener('pageshow', () => reframeSoon(true));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) reframeSoon(false);
  });
  // camera: steps can zoom in on a small part; the learner can also zoom (+ / - / whole picture) and drag to look around
  let cam = { x: 0, y: 0, w: vbW, h: vbH },
    camTok = 0;
  // a zoomed view stays on the drawing: no empty band past its edge (when the view is bigger than the drawing, centre it)
  const clampCam = c => {
    if (c.w >= vbW) return { x: 0, y: 0, w: vbW, h: vbH };
    const e = ENV || [RX * vbW, RY * vbH, vbW, vbH];
    const ax = (lo, hi, size, v) => {
      const m = (hi - lo) * 0.04;
      return hi - lo + 2 * m <= size ? (lo + hi) / 2 - size / 2 : clamp(v, lo - m, hi + m - size);
    };
    // the drawing's part of the view starts RX, RY in from its top-left corner (the words sit there)
    return {
      x: ax(e[0], e[2], c.w * (1 - RX), c.x + RX * c.w) - RX * c.w,
      y: ax(e[1], e[3], c.h * (1 - RY), c.y + RY * c.h) - RY * c.h,
      w: c.w,
      h: c.h,
    };
  };
  const camFor = z => {
    if (!z || !z.k || z.k <= 1) return { x: 0, y: 0, w: vbW, h: vbH };
    const w = vbW / z.k,
      h = vbH / z.k,
      c = z.xy ? [z.xy[0] + OX, z.xy[1] + OY] : P(...z.at);
    return clampCam({ x: c[0] - w * (RX + (1 - RX) / 2), y: c[1] - h * (RY + (1 - RY) / 2), w, h });
  };
  // zoom: 'auto' (or cfg.autoZoom for steps without a zoom): frame the parts this step lights up, measured at the
  // start and end of the step, so the thing that changes fills the picture.
  const autoCam = [],
    autoWhole = [];
  const zoomOf = k => {
    const s = cfg.steps[k];
    if (!s) return null;
    const z = s.zoom === undefined && cfg.autoZoom ? 'auto' : s.zoom;
    if (z !== 'auto') return z || null;
    let b = autoCam[k];
    if (!b) return null;
    if (statsEl && cfg.stats(st).filter(Boolean).length) b = [b[0], b[1] - vbH * 0.1, b[2], b[3]]; // room for the readouts at the top
    const camOf = b => {
      const bw = Math.max(b[2] - b[0], 1),
        bh = Math.max(b[3] - b[1], 1),
        pad = vbW * 0.1,
        need = Math.max((bw * 1.25 + 2 * pad) / (vbW * (1 - RX)), (bh * 1.25 + 2 * pad) / (vbH * (1 - RY)));
      const kz = clamp(1 / need, 1, cfg.autoZoomMax || 1.8);
      return kz < 1.25 ? null : { xy: [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], k: kz };
    };
    // never cut a card or a chart in half: take it in whole (or, if that leaves no zoom, show the whole picture)
    for (let pass = 0; pass < 3; pass++) {
      const c = camOf(b);
      if (!c) return null;
      const w2 = (vbW / c.k / 2) * (1 - RX),
        h2 = (vbH / c.k / 2) * (1 - RY),
        cam = [c.xy[0] - w2, c.xy[1] - h2, c.xy[0] + w2, c.xy[1] + h2];
      const cut = (autoWhole[k] || []).filter(
        w =>
          w[0] < cam[2] &&
          w[2] > cam[0] &&
          w[1] < cam[3] &&
          w[3] > cam[1] &&
          (w[0] < cam[0] || w[2] > cam[2] || w[1] < cam[1] || w[3] > cam[3])
      );
      if (!cut.length) return c;
      for (const w of cut)
        b = [Math.min(b[0], w[0]), Math.min(b[1], w[1]), Math.max(b[2], w[2]), Math.max(b[3], w[3])];
    }
    return camOf(b);
  };
  const applyCam = () => {
    svg.setAttribute('viewBox', `${f(cam.x)} ${f(cam.y)} ${f(cam.w)} ${f(cam.h)}`);
    const z = cam.w < vbW - 0.5;
    svg.classList.toggle('zoomed', z);
    stage.classList.toggle('zoomed-in', z);
    document.getElementById('zfit').hidden = !z;
  };
  const glide = (to, instant) => {
    const from = { ...cam },
      my = ++camTok;
    if (instant || reduce) {
      cam = to;
      applyCam();
      ui.render();
      return;
    }
    let t = 0;
    const loop = () => {
      if (my !== camTok) return;
      t = Math.min(1, t + 0.016 / 0.6);
      const e = ease(t);
      for (const k in to) cam[k] = from[k] + (to[k] - from[k]) * e;
      applyCam();
      if (!ui.busy) ui.render();
      if (t < 1) setTimeout(loop, 16);
    };
    loop();
  };
  const setCam = (z, instant) => glide(camFor(z), instant);
  const zoomBy = m => {
    const w = clamp(cam.w / m, vbW / 4, vbW),
      h = (w * vbH) / vbW,
      cx = cam.x + cam.w / 2,
      cy = cam.y + cam.h / 2;
    glide(clampCam({ x: cx - w / 2, y: cy - h / 2, w, h }), false);
  };
  document.getElementById('zin').onclick = () => zoomBy(1.5);
  document.getElementById('zout').onclick = () => zoomBy(1 / 1.5);
  document.getElementById('zfit').onclick = () => glide(camFor(null), false);
  let pan = null;
  svg.addEventListener('pointerdown', e => {
    if (e.button || cam.w >= vbW - 0.5 || e.target.closest('[data-act],[data-part]')) return;
    pan = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, k: cam.w / svg.getBoundingClientRect().width };
    svg.setPointerCapture(e.pointerId);
    svg.classList.add('panning');
  });
  svg.addEventListener('pointermove', e => {
    if (!pan) return;
    camTok++;
    cam = clampCam({
      x: pan.cx - (e.clientX - pan.x) * pan.k,
      y: pan.cy - (e.clientY - pan.y) * pan.k,
      w: cam.w,
      h: cam.h,
    });
    applyCam();
  });
  const endPan = () => {
    pan = null;
    svg.classList.remove('panning');
  };
  svg.addEventListener('pointerup', endPan);
  svg.addEventListener('pointercancel', endPan);
  // turning: drag across the whole picture (or press the turn buttons, or [ and ]) to turn the scene
  if (TURN) {
    let tdrag = null,
      tTok = 0;
    const turnTo = (az, secs = 0.45) => {
      const a0 = VIEW_AZ,
        my = ++tTok,
        t0 = performance.now();
      const step = () => {
        if (my !== tTok) return;
        const k = clamp((performance.now() - t0) / (secs * 1000));
        setTurn(a0 + (az - a0) * ease(k));
        ui.render();
        if (k < 1) requestAnimationFrame(step);
      };
      step();
    };
    window.__turn = a => {
      setTurn((a * Math.PI) / 180);
      ui.render();
    };
    document.getElementById('tl').onclick = () => turnTo(VIEW_AZ - Math.PI / 4);
    document.getElementById('tr').onclick = () => turnTo(VIEW_AZ + Math.PI / 4);
    addEventListener('keydown', e => {
      if (e.target.closest && e.target.closest('input,textarea')) return;
      if (e.key === '[') turnTo(VIEW_AZ - Math.PI / 8);
      if (e.key === ']') turnTo(VIEW_AZ + Math.PI / 8);
    });
    svg.addEventListener('pointerdown', e => {
      if (e.button || cam.w < vbW - 0.5 || e.target.closest('[data-act],[data-part]')) return;
      tTok++;
      tdrag = { x: e.clientX, a: VIEW_AZ };
      svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove', e => {
      if (!tdrag) return;
      setTurn(tdrag.a + (e.clientX - tdrag.x) * 0.012);
      ui.render();
    });
    const endT = () => (tdrag = null);
    svg.addEventListener('pointerup', endT);
    svg.addEventListener('pointercancel', endT);
    if (TURN.auto) {
      // a slow turn while the learner reads the intro, so they see at once that it turns; it stops at the first touch
      let on = true;
      const stop = () => (on = false);
      svg.addEventListener('pointerdown', stop, { once: true });
      document.getElementById('next').addEventListener('click', stop, { once: true });
      const spin = () => {
        if (!on || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        setTurn(VIEW_AZ + 0.004);
        if (paused) ui.render();
        requestAnimationFrame(spin);
      };
      requestAnimationFrame(spin);
    }
  }

  // areas of the picture covered by the page's own controls (number readouts, the button row): labels avoid them
  const reserved = () => {
    const sr = svg.getBoundingClientRect();
    if (!sr.width) return [];
    const k = cam.w / sr.width,
      out = [];
    for (const el of [statsEl, document.querySelector('.zoombar'), CB ? capEl : null]) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      out.push({
        x: cam.x + (r.x + r.width / 2 - sr.x) * k,
        y: cam.y + (r.y + r.height / 2 - sr.y) * k,
        w: r.width * k + 4 * k,
        h: r.height * k + 4 * k,
      });
    }
    return out;
  };
  ALLLIT = new Set(cfg.steps.flatMap(s2 => s2.lit || []));
  // where a do step's ring pulses, in screen units: do.at may be a 3D point, a screen point [X, Y] (for a part inside
  // a magnifier bubble: insetPt), or a function of st that returns either
  const doAt = d => {
    let a = typeof d.at === 'function' ? d.at(st) : d.at;
    if (!a) return null;
    return a.length === 2 ? a : P(...a);
  };
  const seenNow = () => {
    if (!cfg.reveal) return null;
    const ph = ui.phase;
    if (ph === 'try' || ph === 'check' || ph === 'end') return null;
    const upto = Math.max(ui.step, ph === 'guess' && ui.pending != null ? ui.pending : -1),
      out = new Set();
    for (let i = 0; i <= upto && i < N; i++) for (const n of cfg.steps[i].lit || []) out.add(n);
    return out;
  };
  ui.render = () => {
    _clipN = 0;
    _TAGS = reserved();
    _INSETS = [];
    _LITNOW = [];
    _PEOPLE = [];
    ui.st = st;
    INK_K = INK_BASE * (cam.w / vbW);
    VIEW = CB
      ? { x: cam.x + RX * cam.w, y: cam.y + RY * cam.h, w: cam.w * (1 - RX), h: cam.h * (1 - RY) }
      : cam;
    SEEN = seenNow();
    {
      const s0 = ui.phase === 'do' && cfg.steps[ui.step],
        at0 = s0 && s0.do && doAt(s0.do);
      _DOPT = at0 ? at0 : null;
    }
    const fe = document.activeElement,
      fpart = fe && art.contains(fe) && fe.dataset ? fe.dataset.part : null;
    art.innerHTML = inkScale(cfg.scene(st, pal));
    svg.classList.toggle('lit', LIT.size > 0);
    _LASTLIT = _LITNOW;
    _LASTPEOPLE = _PEOPLE;
    // a pulsing ring on the part the learner should press
    const s = ui.phase === 'do' && cfg.steps[ui.step],
      at = s && s.do && doAt(s.do);
    const ring = at
      ? (() => {
          let [X, Y] = at;
          const r = 9 * INK_K * LABEL_K;
          const el = s.do.part && art.querySelector(`[data-act="${CSS.escape(s.do.part)}"]`),
            M = svg.getScreenCTM();
          if (el && M) {
            const sp = new DOMPoint(X, Y).matrixTransform(M),
              els = [...art.querySelectorAll(`[data-act="${CSS.escape(s.do.part)}"]`)];
            // a tap at (x, y) reaches the part: it is under the point and no label or control is on top of it
            const hits = (x, y) => {
              const stk = document.elementsFromPoint(x, y).filter(e => !e.closest('#fx')),
                top = stk[0];
              if (!top || top.closest('.tag,.zoombar,#stats,.cap,.dock')) return false;
              return stk.some(e => els.some(g => g.contains(e)));
            };
            if (!hits(sp.x, sp.y)) {
              // the nearest point on any of the part's shapes that a tap really reaches
              let best = null,
                bd = Infinity;
              for (const g of els) {
                const b = g.getBoundingClientRect();
                if (!b.width && !b.height) continue;
                for (let i = 0; i <= 10; i++)
                  for (let j = 0; j <= 10; j++) {
                    const x = b.x + (b.width * i) / 10,
                      y = b.y + (b.height * j) / 10,
                      d = Math.hypot(x - sp.x, y - sp.y);
                    if (d < bd && hits(x, y)) (bd = d), (best = [x, y]);
                  }
              }
              if (!best && el) {
                const b = el.getBoundingClientRect();
                if (b.width) best = [b.x + b.width / 2, b.y + b.height / 2];
              }
              if (best) {
                const q = new DOMPoint(best[0], best[1]).matrixTransform(M.inverse());
                X = q.x;
                Y = q.y;
              }
            }
          }
          return `<g style="pointer-events:none"><circle class="pulse" cx="${f(X)}" cy="${f(Y)}" r="${f(r)}" fill="none" stroke="var(--act)" stroke-width="${f(2.2 * INK_K)}"/><circle cx="${f(X)}" cy="${f(Y)}" r="${f(r * 0.62)}" fill="none" stroke="var(--act)" stroke-width="${f(1.6 * INK_K)}"/></g>`;
        })()
      : '';
    if (fx._h !== ring) {
      fx._h = ring;
      fx.innerHTML = ring;
    }
    art.querySelectorAll('.tag[data-part]').forEach(g => {
      if (PARTS[g.dataset.part]) {
        g.classList.add('has-info');
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'button');
        g.setAttribute('aria-label', 'About the ' + g.dataset.part);
      }
    });
    if (fpart) {
      const g = art.querySelector(`.tag[data-part="${CSS.escape(fpart)}"]`);
      g && g.focus({ preventScroll: true });
    }
    if (statsEl) statsEl.classList.toggle('idle', ui.phase === 'intro');
    if (statsEl)
      statsEl.innerHTML = cfg
        .stats(st)
        .filter(Boolean)
        .map(
          x =>
            `<div class="stat${x.small ? ' small' : ''}"><div class="k">${esc(x.label)}</div><div class="v">${esc(x.value)}</div></div>`
        )
        .join('');
    if (ui.phase === 'try') refreshTry();
  };

  // drawing style
  const setStyle = (name, save) => {
    if (!STYLES[name]) name = 'clear';
    STYLE = STYLES[name];
    SHADOW = STYLE.shadow;
    document.documentElement.classList.remove('st-clear', 'st-sketch', 'st-contrast');
    document.documentElement.classList.add('st-' + name);
    if (STYLE.filter) art.setAttribute('filter', 'url(#hand)');
    else art.removeAttribute('filter');
    document
      .querySelectorAll('#styles .opt')
      .forEach(b => b.setAttribute('aria-checked', b.dataset.style === name));
    if (save) {
      try {
        localStorage.setItem('teachme-style', name);
      } catch (e) {}
    }
    ui.render();
  };
  let guessOn = cfg.guess !== false,
    quizOn = cfg.quiz !== false;
  const qN = () => (quizOn ? CHECK.length : 0); // quiz questions the learner gets (none when the quiz is switched off)
  const guessSw = document.getElementById('guessSw');
  const setGuess = (on, save) => {
    guessOn = on;
    guessSw.setAttribute('aria-checked', on);
    if (save) {
      try {
        localStorage.setItem('teachme-guess', on ? '1' : '0');
      } catch (e) {}
    }
    if (!on && ui.phase === 'guess') startStep(ui.pending);
  };
  // labels on or off for this viewer: off hides every label in the picture (the printed sheets keep their pins)
  const labelSw = document.getElementById('labelSw');
  let labelsOn = true;
  const setLabels = (on, save) => {
    labelsOn = on;
    labelSw.setAttribute('aria-checked', on);
    document.documentElement.classList.toggle('nolabels', !on);
    if (save) {
      try {
        localStorage.setItem('teachme-labels', on ? '1' : '0');
      } catch (e) {}
    }
  };
  const quizSw = document.getElementById('quizSw');
  const setQuiz = (on, save) => {
    quizOn = on;
    if (quizSw) quizSw.setAttribute('aria-checked', on);
    if (save) {
      try {
        localStorage.setItem('teachme-quiz', on ? '1' : '0');
      } catch (e) {}
    }
    if (!on && ui.phase === 'check') {
      ui.phase = 'end';
      show();
      sync();
    } else if (ui.phase === 'end') {
      show();
      sync();
    } else if (ui.phase !== 'intro') sync();
  };

  // part info: tap a label in the picture or a chip
  const partinfo = document.getElementById('partinfo');
  const showPart = name => {
    if (!PARTS[name]) return;
    const same = !partinfo.hidden && partinfo.dataset.part === name;
    partinfo.hidden = same;
    partinfo.dataset.part = name;
    partinfo.innerHTML = `<b>${esc(name)}.</b> ${esc(PARTS[name])}`;
  };

  // animate(step): step(dt) runs every frame until it returns false. Back, the progress bar, reduced motion and
  // "Skip animation" run it to the end at once, so every step must END in the same state either way.
  // In a drag step, the learner's slider feeds the time instead of the clock.
  let token = 0,
    drag = null;
  ui.animate = (stepFn, done) => {
    if (ui._rec) {
      ui._rec.push({ fn: stepFn, done });
      return;
    }
    const finish = () => {
      ui.busy = false;
      drag = null;
      ui.render();
      done && done();
      sync();
    };
    if (ui._instant || ui._skip || reduce) {
      for (let i = 0; i < 4000 && stepFn(0.05) !== false; i++);
      finish();
      return;
    }
    if (ui._dragNext) {
      ui._dragNext = false;
      drag = { fn: stepFn, finish };
      return;
    }
    ui.busy = true;
    const my = ++token;
    let last = performance.now();
    const loop = () => {
      if (my !== token) return;
      if (ui._skip) {
        for (let i = 0; i < 4000 && stepFn(0.05) !== false; i++);
        finish();
        return;
      }
      if (paused) {
        last = performance.now();
        setTimeout(loop, 50);
        return;
      }
      const now = performance.now(),
        dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      const more = stepFn(dt) !== false;
      ui.render();
      if (more) setTimeout(loop, 16);
      else finish();
    };
    setTimeout(loop, 16);
    sync();
  };
  ui.tween = (targets, secs = 1.2, after) => {
    const from = {};
    for (const k in targets) from[k] = st[k];
    let t = 0;
    ui.animate(dt => {
      t = Math.min(1, t + dt / secs);
      const e = ease(t);
      for (const k in targets) st[k] = from[k] + (targets[k] - from[k]) * e;
      return t < 1;
    }, after);
  };
  // short notes from the lesson ("The switch won't stay on yet") shown in the live line of Try it
  let noteT = 0;
  ui.note = (text, ms = 2600) => {
    ui._note = text;
    clearTimeout(noteT);
    noteT = setTimeout(() => {
      ui._note = null;
      ui.render();
    }, ms);
    ui.render();
  };

  const L3 = i => String.fromCharCode(65 + i);
  const choiceList = (c, picked, answer, words) =>
    c
      .map((txt, i) => {
        const done = picked != null,
          cls = !done ? '' : i === answer ? ' right' : i === picked ? ' wrong' : '';
        const tl = !done
          ? ''
          : i === answer
            ? `<span class="tagline">${words[0]}</span>`
            : i === picked
              ? `<span class="tagline">${words[1]}</span>`
              : '';
        return `<button class="choice${cls}" data-i="${i}"${done ? ' disabled' : ''}><span class="l" aria-hidden="true">${L3(i)}</span><span>${esc(txt)}</span>${tl}</button>`;
      })
      .join('');
  // answers ignore clicks for a moment after they appear, so a double-click on "Next" can't pick one by accident
  const armChoices = fn => {
    const t0 = performance.now();
    body.querySelectorAll('.choice:not([disabled])').forEach(
      b =>
        (b.onclick = ev => {
          if (performance.now() - t0 < 650 && ev.detail > 0) return;
          fn(+b.dataset.i);
        })
    );
  };

  const guesses = {};
  let qi = 0,
    score = 0;
  const qPicked = [];
  // views: when experts disagree, list the main explanations under the step text
  function viewsBox(s) {
    if (!s.views || !s.views.length) return '';
    return `<div class="views"><span class="vt">${esc(s.viewsTitle || 'Not everyone agrees')}</span>${s.views.map(v => `<p><b>${esc(v.who)}.</b> ${esc(v.says)}</p>`).join('')}</div>`;
  }
  function guessBox(k) {
    const g = cfg.steps[k].guess,
      a = guesses[k];
    if (!g || a == null) return '';
    return a === g.answer
      ? `<div class="guessbox right"><b>&#10003; Your guess: ${L3(a)}, ${esc(g.choices[a].charAt(0).toLowerCase() + g.choices[a].slice(1))}. Right.</b>${esc(g.why || '')}</div>`
      : `<div class="guessbox wrong"><b>&#10007; Your guess: ${L3(a)}, ${esc(g.choices[a].charAt(0).toLowerCase() + g.choices[a].slice(1))}. Not quite.</b>${esc(g.why || '')}</div>`;
  }
  // the words go in the caption; answers, sliders and controls move to the row below the picture
  const actEl = document.getElementById('act');
  function show() {
    showText();
    actEl.innerHTML = '';
    body.querySelectorAll('.choices').forEach(el => actEl.appendChild(el));
    body.querySelectorAll('.todo').forEach(el => {
      if (el.querySelector('input,button,.ctrls')) actEl.appendChild(el);
    });
  }
  function showText() {
    const ph = ui.phase;
    partinfo.hidden = true;
    const chap = k => {
      let c = null,
        n = cfg.steps[0].chapter ? 0 : cfg.steps.some(s2 => s2.chapter) ? 1 : 0; // steps before the first chapter are Part 1
      for (let i = 0; i <= k && i < N; i++)
        if (cfg.steps[i].chapter) {
          c = cfg.steps[i].chapter;
          n++;
        }
      return c ? `<p class="chap">Part ${n} · ${esc(c)}</p>` : '';
    };
    if (ph === 'intro')
      body.innerHTML = `<p class="lede">${esc(cfg.intro || '')}</p>${partNames.length && !cfg.reveal ? '<p class="tip">Tap a label in the picture to learn what that part does.</p>' : ''}`;
    else if (ph === 'do') {
      const s = cfg.steps[ui.step];
      body.innerHTML = `${chap(ui.step)}<h2>${esc(s.title)}</h2><div class="todo enter"><span class="yt">Your turn</span>${esc(s.do.hint || s.do.label)}</div>`;
    } else if (ph === 'drag') {
      const s = cfg.steps[ui.step];
      body.innerHTML = `${chap(ui.step)}<h2>${esc(s.title)}</h2><p class="say">${esc(s.say)}</p><div class="todo enter"><span class="yt">Your turn</span><div class="range"><label for="dragR">${esc(s.drag.label)}</label><input type="range" id="dragR" min="0" max="1000" value="0"></div></div>`;
      const r = document.getElementById('dragR');
      let lastV = 0;
      const secs = s.drag.secs || 3;
      r.oninput = () => {
        if (!drag) return;
        const v = +r.value;
        let d = ((v - lastV) / 1000) * secs;
        if (d <= 0) {
          r.value = lastV;
          return;
        }
        lastV = v;
        while (d > 0 && drag) {
          const c = Math.min(0.05, d);
          d -= c;
          if (drag.fn(c) === false) {
            const fin = drag.finish;
            drag = null;
            fin();
            afterStep();
            return;
          }
        }
        if (v >= 1000 && drag) {
          const fn = drag.fn,
            fin = drag.finish;
          drag = null;
          for (let i = 0; i < 4000 && fn(0.05) !== false; i++);
          fin();
          afterStep();
          return;
        }
        ui.render();
      };
      r.focus({ preventScroll: true });
    } else if (ph === 'step') {
      const s = cfg.steps[ui.step];
      body.innerHTML = `${chap(ui.step)}<h2>${esc(s.title)}</h2><p class="say">${esc(s.say)}</p>${viewsBox(s)}${guessBox(ui.step)}`;
    } else if (ph === 'guess') {
      const g = cfg.steps[ui.pending].guess;
      body.innerHTML = `<div class="enter"><h2>Make a guess</h2><p class="q">${esc(g.q)}</p><div class="choices">${choiceList(g.choices)}</div></div>`;
      armChoices(i => {
        guesses[ui.pending] = i;
        startStep(ui.pending);
      });
    } else if (ph === 'try') showTry();
    else if (ph === 'check') {
      const q = CHECK[qi],
        p = qPicked[qi];
      body.innerHTML =
        `<div class="${p == null ? 'enter' : ''}"><h2>Question ${qi + 1} of ${CHECK.length}</h2><p class="q">${esc(q.q)}</p><div class="choices">${choiceList(q.choices, p, q.answer, ['Right answer', 'Your answer'])}</div>` +
        (p != null
          ? `<p class="why"><b>${p === q.answer ? 'Correct.' : 'Not quite.'}</b> ${esc(q.why || '')}</p>`
          : '') +
        '</div>';
      armChoices(i => {
        qPicked[qi] = i;
        if (i === q.answer) score++;
        show();
        sync();
        nextB.focus({ preventScroll: true });
      });
    } else if (ph === 'end')
      body.innerHTML =
        (qN()
          ? `<h2>Your score</h2><p class="score">${score} out of ${CHECK.length}</p>`
          : '<h2>You finished the lesson</h2>') +
        `<p class="say"><b>The big idea.</b> ${esc(cfg.idea || '')}</p>`;
  }
  function afterStep() {
    if (ui.phase === 'drag') {
      ui.phase = 'step';
      show();
      sync();
      nextB.focus({ preventScroll: true });
    }
  }
  // a step starts: "do" waits for the learner's action, "drag" waits for the slider, otherwise it plays
  function startStep(k) {
    const s = cfg.steps[k];
    ui._skip = false;
    ui.step = k;
    LIT = new Set(s.lit || []);
    setCam(zoomOf(k), false);
    if (s.do && !reduce) {
      ui.phase = 'do';
      show();
      ui.render();
      sync();
      return;
    }
    playStep(k, !!s.drag && !reduce);
  }
  function playStep(k, byDrag) {
    const s = cfg.steps[k];
    ui.phase = byDrag ? 'drag' : 'step';
    ui._dragNext = byDrag;
    show();
    if (s.run) s.run(st, ui);
    else ui.render();
    if (byDrag && !drag) {
      ui._dragNext = false;
      ui.phase = 'step';
      show();
    } // nothing to drag (instant step)
    sync();
  }
  const doAction = () => {
    if (ui.phase !== 'do') return;
    playStep(ui.step, false);
    nextB.focus({ preventScroll: true });
  };
  // instant replay: rebuild "after step k" from a fresh start (Back, the progress bar, ?step=)
  function jumpTo(k) {
    token++;
    ui.busy = false;
    ui._skip = false;
    drag = null;
    ui._dragNext = false;
    st = fresh();
    ui.st = st;
    ui._instant = true;
    SOUND.silent = true;
    for (let i = 0; i <= k; i++) {
      LIT = new Set(cfg.steps[i].lit || []);
      const s = cfg.steps[i];
      if (s.run) s.run(st, ui);
    }
    ui._instant = false;
    SOUND.silent = false;
    ui.step = k;
    ui.phase = k < 0 ? 'intro' : 'step';
    if (k < 0) LIT = new Set();
    setCam(k >= 0 ? zoomOf(k) : null, true);
    show();
    sync();
  }

  // try it yourself: live controls on the same picture
  function startTry() {
    ui.phase = 'try';
    LIT = new Set();
    setCam(null, false);
    if (T.setup) T.setup(st, ui);
    if (paused && !pausedByUser) setPaused(false, false); // the sandbox is the point: it runs even with reduced motion
    show();
    ui.render();
    sync();
  }
  function showTry() {
    const c = T.controls || [];
    body.innerHTML =
      `<div class="enter"><h2>${esc(T.title || 'Try it yourself')}</h2><p class="say">${esc(T.say || '')}</p><div class="todo"><span class="yt">Your turn</span><div class="ctrls">` +
      c
        .map((x, i) =>
          x.type === 'range'
            ? `<div class="range"><label for="tc${i}">${esc(x.label)}<output id="to${i}"></output></label><input type="range" id="tc${i}" min="${x.min}" max="${x.max}" step="${x.step || 1}" value="${st[x.key]}"></div>`
            : ''
        )
        .join('') +
      `<div class="ctrl-row">` +
      c
        .map((x, i) =>
          x.type === 'toggle'
            ? `<button class="switch" role="switch" id="tc${i}" aria-checked="${!!st[x.key]}"><span class="track"></span><span>${esc(x.label)}</span></button>`
            : x.type === 'button'
              ? `<button class="btn secondary" id="tc${i}"></button>`
              : ''
        )
        .join('') +
      `</div>` +
      `</div></div><p class="observe" id="observe" aria-live="polite"></p></div>`;
    c.forEach((x, i) => {
      const el = document.getElementById('tc' + i);
      if (x.type === 'range')
        el.oninput = () => {
          st[x.key] = +el.value;
          x.onChange && x.onChange(st, ui);
          ui.render();
        };
      if (x.type === 'toggle')
        el.onclick = () => {
          st[x.key] = !st[x.key];
          el.setAttribute('aria-checked', !!st[x.key]);
          x.onChange && x.onChange(st, ui);
          ui.render();
        };
      if (x.type === 'button')
        el.onclick = () => {
          x.onClick(st, ui);
          ui.render();
        };
    });
    refreshTry();
  }
  function refreshTry() {
    const c = T.controls || [];
    c.forEach((x, i) => {
      const el = document.getElementById('tc' + i);
      if (!el) return;
      if (x.type === 'range') {
        const o = document.getElementById('to' + i);
        if (o) o.textContent = x.format ? x.format(st[x.key]) : st[x.key];
        if (document.activeElement !== el && +el.value !== +st[x.key]) el.value = st[x.key];
      }
      if (x.type === 'button') {
        const t = typeof x.label === 'function' ? x.label(st) : x.label;
        if (el.textContent !== t) el.textContent = t;
      }
      if (x.type === 'toggle') el.setAttribute('aria-checked', !!st[x.key]);
    });
    const o = document.getElementById('observe');
    if (o) {
      const t = ui._note || (T.observe ? T.observe(st) : '');
      if (o.textContent !== t) o.textContent = t;
      o.hidden = !t;
    }
  }

  function toCheck() {
    ui.phase = 'check';
    LIT = new Set();
    setCam(null, false);
    ui.render();
    show();
    sync();
  }
  function next() {
    if (ui.busy) {
      ui._skip = true;
      return;
    }
    if (ui.phase === 'guess' || ui.phase === 'drag') return;
    if (ui.phase === 'do') {
      doAction();
      return;
    }
    if (ui.phase === 'check') {
      if (qPicked[qi] == null) return;
      if (qi + 1 < CHECK.length) {
        qi++;
        show();
        sync();
        focusFirst();
      } else {
        ui.phase = 'end';
        show();
        sync();
      }
      return;
    }
    if (ui.phase === 'end') {
      restart();
      return;
    }
    if (ui.phase === 'try') {
      if (qN()) {
        qi = 0;
        score = 0;
        qPicked.length = 0;
        toCheck();
        focusFirst();
      } else {
        ui.phase = 'end';
        show();
        sync();
      }
      return;
    }
    const k = ui.step + 1;
    if (k >= N) {
      if (T) {
        startTry();
        return;
      }
      if (qN()) {
        qi = 0;
        score = 0;
        qPicked.length = 0;
        toCheck();
        focusFirst();
      } else {
        ui.phase = 'end';
        show();
        sync();
      }
      return;
    }
    if (cfg.steps[k].guess && guessOn && guesses[k] == null) {
      ui.pending = k;
      ui.phase = 'guess';
      show();
      sync();
    } else startStep(k);
  }
  function back() {
    if (ui.phase === 'end') {
      if (!qN()) {
        if (T) startTry();
        else jumpTo(N - 1);
        return;
      }
      ui.phase = 'check';
      qi = CHECK.length - 1;
      show();
      sync();
      return;
    }
    if (ui.phase === 'check') {
      if (qi > 0) {
        qi--;
        show();
        sync();
      } else if (T) startTry();
      else jumpTo(N - 1);
      return;
    }
    if (ui.phase === 'try') {
      jumpTo(N - 1);
      return;
    }
    if (ui.phase === 'guess') {
      ui.phase = ui.step < 0 ? 'intro' : 'step';
      show();
      sync();
      return;
    }
    if (ui.phase === 'do' || ui.phase === 'drag') {
      jumpTo(ui.step - 1);
      return;
    }
    if (ui.step >= 0) jumpTo(ui.step - 1);
  }
  function restart() {
    for (const k in guesses) delete guesses[k];
    qi = 0;
    score = 0;
    qPicked.length = 0;
    jumpTo(-1);
    nextB.focus({ preventScroll: true });
  }
  const focusFirst = () =>
    setTimeout(() => {
      const c = actEl.querySelector('.choice:not([disabled])');
      c && c.focus({ preventScroll: true });
    }, 0);

  // live: the picture keeps moving between steps (bubbles, steam, flows). The engine owns the clock st.t;
  // cfg.live(st, dt, ui) may add other ambient motion; in Try it yourself, tryit.tick runs instead.
  // Pause stops all of it, including a step's animation. Reduced motion starts paused.
  let paused = reduce,
    pausedByUser = false;
  const ppB = document.getElementById('pp'),
    replayB = document.getElementById('replay');
  const PAUSE_I =
    '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="1.5" width="3" height="9" rx=".8" fill="currentColor"/><rect x="7" y="1.5" width="3" height="9" rx=".8" fill="currentColor"/></svg>';
  const PLAY_I =
    '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.6v8.8a.6.6 0 0 0 .9.5l7-4.4a.6.6 0 0 0 0-1L3.9 1.1a.6.6 0 0 0-.9.5z" fill="currentColor"/></svg>';
  function setPaused(on, byUser) {
    paused = on;
    if (byUser) pausedByUser = on;
    ppB.innerHTML = on ? PLAY_I : PAUSE_I;
    ppB.setAttribute('aria-pressed', on);
    ppB.setAttribute('aria-label', on ? 'Play the animation' : 'Pause the animation');
    ppB.title = (on ? 'Play' : 'Pause') + ' (P)';
  }
  setPaused(paused, false);
  ppB.onclick = () => setPaused(!paused, true);
  function replay() {
    if (ui.phase !== 'step' || ui.busy || ui.step < 0) return;
    const k = ui.step;
    jumpTo(k - 1);
    startStep(k);
    if (paused) setPaused(false, true);
  }
  replayB.onclick = replay;
  const hasClock = () => typeof st.t === 'number';
  let lastL = performance.now();
  const live = () => {
    const now = performance.now(),
      dt = Math.min(0.05, (now - lastL) / 1000);
    lastL = now;
    if (!paused && !document.hidden) {
      const inTry = ui.phase === 'try';
      if (hasClock()) st.t += dt;
      if (inTry) {
        if (T && T.tick) T.tick(st, dt, ui);
      } else if (cfg.live) cfg.live(st, dt, ui);
      if (!ui.busy && (inTry || cfg.live || hasClock())) ui.render();
    }
    replayB.hidden = !(ui.phase === 'step' && !ui.busy && ui.step >= 0);
    setTimeout(live, 33);
  };
  setTimeout(live, 33);

  // video: plays the whole lesson once into a 1280x720 canvas (picture, step title and text) and records it.
  // MP4 where the browser can record it (Chrome, Edge, Safari), WebM otherwise (Firefox).
  const vidEl = document.getElementById('vid'),
    vidP = document.getElementById('vidP'),
    vidBar = document.getElementById('vidBar'),
    vidAct = document.getElementById('vidAct');
  // Saving a file: a published Claude artifact may not download by itself, so there the file goes through the
  // viewer's save prompt (the page is published with the downloads capability); anywhere else a plain link works.
  let claudeDL = null;
  try {
    if (window.claude && typeof window.claude.use === 'function')
      window.claude
        .use('downloads')
        .then(d => (claudeDL = d))
        .catch(() => {});
  } catch (e) {}
  const wireSave = (a, name, blob, say) =>
    a.addEventListener('click', e => {
      if (!claudeDL) return;
      e.preventDefault();
      claudeDL
        .save({ filename: name, data: blob })
        .then(() => say && say('Saved ' + name + '.'))
        .catch(err => {
          const c = err && err.code;
          if (c === 'declined') return;
          if (say)
            say(
              c === 'rate_limited'
                ? 'A save is already waiting for your answer. Try again in a moment.'
                : 'Files cannot be saved from this view. Open the lesson file in your browser to save it.'
            );
        });
    });
  const VTYPES = [
    'video/mp4;codecs=avc1.42E01F',
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm',
  ];
  const vType =
    window.MediaRecorder && HTMLCanvasElement.prototype.captureStream
      ? VTYPES.find(t => {
          try {
            return MediaRecorder.isTypeSupported(t);
          } catch (e) {
            return false;
          }
        })
      : null;
  let vidCancel = false;
  const slug =
    String(cfg.title || 'lesson')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'lesson';
  const wrapText = (ctx, text, maxW) => {
    const out = [];
    let line = '';
    for (const w of String(text).split(/\s+/)) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) {
        out.push(line);
        line = w;
      } else line = t;
    }
    if (line) out.push(line);
    return out;
  };
  // Frame by frame: every frame is drawn at an exact 1/30 s step and stamped with its own time, so the video is
  // smooth however long a frame takes to draw. WebCodecs (H.264, else VP9) into MP4; MediaRecorder as a last resort.
  const VCODECS = [
    { codec: 'avc1.4d0028', avc: { format: 'avc' } },
    { codec: 'avc1.42001f', avc: { format: 'avc' } },
    { codec: 'vp09.00.31.08' },
  ];
  let vcfg = null;
  const vReady = (async () => {
    if (!window.VideoEncoder) return;
    for (const c of VCODECS) {
      try {
        const r = await VideoEncoder.isConfigSupported({
          ...c,
          width: 1280,
          height: 720,
          bitrate: 6e6,
          framerate: 30,
        });
        if (r.supported) {
          vcfg = c;
          return;
        }
      } catch (e) {}
    }
  })();
  async function recordVideo() {
    await vReady;
    if (!vcfg && !vType) return;
    const W = 1280,
      H = 720,
      FPS = 30,
      DT = 1 / FPS,
      cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d'),
      font = SANS;
    const was = { step: ui.step, phase: ui.phase, paused };
    vidCancel = false;
    setMenu(false);
    paused = true;
    token++;
    ui.busy = false;
    drag = null;
    ui._dragNext = false;
    SOUND.silent = true;
    vidEl.hidden = false;
    document.getElementById('vidH').textContent = 'Making your video';
    vidP.textContent =
      'Drawing every frame for a smooth video. This takes a few minutes. Keep this tab open.';
    vidBar.style.width = '0%';
    vidAct.innerHTML = '<button class="btn secondary" id="vidX">Cancel</button>';
    document.getElementById('vidX').onclick = () => {
      vidCancel = true;
    };
    // timeline: intro, every step (its animation, then time to read), the big idea
    const words = t => String(t || '').split(/\s+/).length,
      readT = t => clamp(1.5 + words(t) / 3.3, 4, 13);
    const total = 4 + cfg.steps.reduce((a, s) => a + 2.5 + readT(s.say), 0) + 5;
    let done = 0,
      nFrame = 0;
    st = fresh();
    ui.st = st;
    LIT = new Set();
    ui.phase = 'intro';
    ui.step = -1;
    cam = camFor(null);
    let goal = cam;
    const VX0 = 40,
      VY0 = 96,
      PW = 820,
      PH = 590,
      TX = 900,
      TW = 340;
    const img = new Image();
    const drawFrame = async cap => {
      ui.render();
      const vw = cam.w * (1 - RX),
        vh = cam.h * (1 - RY),
        vb = `${f(cam.x + RX * cam.w)} ${f(cam.y + RY * cam.h)} ${f(vw)} ${f(vh)}`,
        k = Math.min(PW / vw, PH / vh),
        w = vw * k,
        h = vh * k; // the drawing, without the words' corner
      const svgS =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${f(w)}" height="${f(h)}"><style>${FONT_FACE}.lit .tag:not(.on){opacity:.72}${labelsOn ? '' : '.tag{display:none}'}</style><defs>${document.getElementById('fdefs').innerHTML}</defs><g class="${LIT.size ? 'lit' : ''}"${STYLE.filter ? ' filter="url(#hand)"' : ''}>${art.innerHTML}</g></svg>`.replace(
          /var\(--hi,#ffc93c\)/g,
          '#ffc93c'
        );
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgS);
      try {
        await img.decode();
      } catch (e) {}
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, VX0 + (PW - w) / 2, VY0 + (PH - h) / 2, w, h);
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#1d1f24';
      ctx.font = `700 30px ${font}`;
      ctx.fillText(cfg.title || '', 40, 56);
      if (cfg.stats && ui.phase !== 'intro') {
        let x = VX0;
        for (const sx of cfg.stats(st).filter(Boolean)) {
          ctx.font = `400 15px ${font}`;
          ctx.fillStyle = '#6b7079';
          ctx.fillText(sx.label, x, VY0 + 16);
          ctx.font = `650 26px ${font}`;
          ctx.fillStyle = '#1d1f24';
          ctx.fillText(sx.value, x, VY0 + 46);
          ctx.font = `400 15px ${font}`;
          const lw = ctx.measureText(sx.label).width;
          ctx.font = `650 26px ${font}`;
          x += Math.max(lw, ctx.measureText(sx.value).width) + 30;
        }
      }
      let y = 120;
      if (cap.count) {
        ctx.font = `400 17px ${font}`;
        ctx.fillStyle = '#6b7079';
        ctx.fillText(cap.count, TX, y);
        y += 16;
        const gw = (TW - (N - 1) * 5) / N;
        for (let i = 0; i < N; i++) {
          ctx.fillStyle = i < cap.k ? '#1d1f24' : i === cap.k ? '#2a4fd6' : '#e1e2e5';
          ctx.fillRect(TX + i * (gw + 5), y, gw, 5);
        }
        y += 52;
      }
      if (cap.title) {
        ctx.font = `650 32px ${font}`;
        ctx.fillStyle = '#1d1f24';
        for (const l of wrapText(ctx, cap.title, TW)) {
          ctx.fillText(l, TX, y);
          y += 40;
        }
        y += 8;
      }
      if (cap.text) {
        ctx.font = `400 ${cap.big ? 25 : 22}px ${font}`;
        ctx.fillStyle = '#1d1f24';
        for (const l of wrapText(ctx, cap.text, TW)) {
          ctx.fillText(l, TX, y);
          y += cap.big ? 38 : 34;
        }
      }
      if (cfg.credit !== false) {
        ctx.font = `400 14px ${font}`;
        ctx.fillStyle = '#9aa0a8';
        ctx.fillText((cfg.credit && cfg.credit.text) || 'Made with /teachme', TX, H - 32);
      }
    };
    // the sink: an encoder writing timestamped frames (smooth), or a real-time recorder (fallback)
    const chunks = [],
      samples = [];
    let desc = null,
      enc = null,
      rec = null,
      encErr = null,
      last = performance.now();
    if (vcfg) {
      enc = new VideoEncoder({
        output: (ch, meta) => {
          if (meta && meta.decoderConfig && meta.decoderConfig.description)
            desc = new Uint8Array(meta.decoderConfig.description.buffer || meta.decoderConfig.description);
          const b = new Uint8Array(ch.byteLength);
          ch.copyTo(b);
          samples.push({ data: b, key: ch.type === 'key' });
        },
        error: e => {
          encErr = e;
        },
      });
      enc.configure({ ...vcfg, width: W, height: H, bitrate: 6e6, framerate: FPS, latencyMode: 'quality' });
    } else {
      rec = new MediaRecorder(cv.captureStream(FPS), { mimeType: vType, videoBitsPerSecond: 6e6 });
      rec.ondataavailable = e => {
        if (e.data && e.data.size) chunks.push(e.data);
      };
      rec.start(250);
    }
    const emit = async () => {
      if (enc) {
        if (encErr) throw encErr;
        const fr = new VideoFrame(cv, {
          timestamp: Math.round((nFrame * 1e6) / FPS),
          duration: Math.round(1e6 / FPS),
        });
        enc.encode(fr, { keyFrame: nFrame % (FPS * 2) === 0 });
        fr.close();
        while (enc.encodeQueueSize > 6)
          await new Promise(r => enc.addEventListener('dequeue', r, { once: true }));
      } else {
        const wait = 1000 / FPS - (performance.now() - last);
        if (wait > 1) await new Promise(r => setTimeout(r, wait));
        last = performance.now();
      }
      nFrame++;
    };
    const tick = async (cap, adv) => {
      if (vidCancel) throw new Error('cancel');
      if (typeof st.t === 'number') st.t += DT;
      if (cfg.live) cfg.live(st, DT, ui);
      for (const kk in goal) cam[kk] += (goal[kk] - cam[kk]) * Math.min(1, DT * 3.5);
      if (adv) adv(DT);
      await drawFrame(cap);
      await emit();
      done += DT;
      vidBar.style.width = Math.min(100, (done / total) * 100).toFixed(1) + '%';
    };
    const hold = async (secs, cap) => {
      const end = done + secs;
      while (done < end - 1e-6) await tick(cap);
    };
    try {
      await hold(4, { title: '', text: cfg.intro || '', big: true });
      for (let k = 0; k < N; k++) {
        const s = cfg.steps[k],
          cap = { count: `Step ${k + 1} of ${N}`, k, title: s.title, text: s.say };
        LIT = new Set(s.lit || []);
        ui.step = k;
        ui.phase = 'step';
        goal = camFor(zoomOf(k));
        const q = [];
        ui._rec = q;
        if (s.run) s.run(st, ui);
        while (q.length) {
          const a = q.shift();
          let more = true;
          while (more)
            await tick(cap, dt => {
              more = a.fn(dt) !== false;
            });
          a.done && a.done();
        }
        ui._rec = null;
        await hold(readT(s.say), cap);
      }
      LIT = new Set();
      goal = camFor(null);
      ui.phase = 'end';
      await hold(5, { title: 'The big idea', text: cfg.idea || '', big: true });
      let blob,
        mp4 = true;
      if (enc) {
        await enc.flush();
        enc.close();
        if (encErr) throw encErr;
        blob = new Blob(
          [mp4Mux({ vp9: vcfg.codec.startsWith('vp09'), width: W, height: H, fps: FPS, desc, samples })],
          { type: 'video/mp4' }
        );
      } else {
        await new Promise(r => {
          rec.onstop = r;
          rec.stop();
        });
        mp4 = vType.startsWith('video/mp4');
        blob = new Blob(chunks, { type: mp4 ? 'video/mp4' : 'video/webm' });
      }
      const url = URL.createObjectURL(blob),
        name = slug + (mp4 ? '.mp4' : '.webm');
      document.getElementById('vidH').textContent = 'Your video is ready';
      const how = enc
        ? vcfg.codec.startsWith('avc1')
          ? ''
          : ' This browser can only make VP9 video. It plays in Chrome, Firefox and VLC; for QuickTime or an iPhone, make it in Chrome, Edge or Safari.'
        : ' This browser recorded it live, so it may not be fully smooth. Chrome, Edge or Safari make a smoother MP4.';
      vidP.textContent =
        `${name}, ${(blob.size / 1e6).toFixed(1)} MB, ${Math.round(nFrame / FPS)} seconds.` + how;
      vidBar.style.width = '100%';
      vidAct.innerHTML = `<button class="btn quiet" id="vidX">Close</button><a class="btn primary" id="vidS" href="${url}" download="${name}">Save video</a>`;
      const sv = document.getElementById('vidS');
      wireSave(sv, name, blob, t => (vidP.textContent = t));
      sv.focus({ preventScroll: true });
      sv.click();
      document.getElementById('vidX').onclick = () => {
        vidEl.hidden = true;
        nextB.focus({ preventScroll: true });
      };
    } catch (e) {
      try {
        if (rec && rec.state !== 'inactive') rec.stop();
      } catch (e2) {}
      try {
        if (enc && enc.state !== 'closed') enc.close();
      } catch (e2) {}
      vidEl.hidden = true;
    } finally {
      ui._rec = null;
      SOUND.silent = false;
      paused = was.paused;
      setPaused(paused, false);
      if (was.phase === 'intro' || was.step < 0) jumpTo(-1);
      else jumpTo(was.step);
    }
  }
  const vidB = document.getElementById('video');
  vReady.then(() => {
    if (!vcfg && !vType) vidB.parentElement.remove();
  });
  vidB.onclick = () => recordVideo();
  window.__video = () => (vcfg ? vcfg.codec : vType);

  const bar = document.getElementById('bar');
  cfg.steps.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'seg';
    b.innerHTML = '<span></span>';
    b.dataset.c = s.chapter && i ? ' cstart' : '';
    b.setAttribute('aria-label', `Step ${i + 1} of ${N}: ${s.title}`);
    b.title = `Step ${i + 1}: ${s.title}`;
    b.onclick = () => {
      if (i <= ui.step || guesses[i] != null || !cfg.steps[i].guess || !guessOn) {
        jumpTo(i - 1);
        startStep(i);
      } else {
        jumpTo(i - 1);
        next();
      }
    };
    bar.appendChild(b);
  });

  function sync() {
    const ph = ui.phase,
      inQuiz = ph === 'check' || ph === 'end';
    let label = 'Next step',
      show_ = true,
      hintTxt = '';
    if (ui.busy) label = 'Skip';
    else if (ph === 'intro') label = 'Start';
    else if (ph === 'do') {
      const d = cfg.steps[ui.step].do;
      label = d.label;
      hintTxt = '';
    } else if (ph === 'drag') {
      show_ = false;
      hintTxt = 'Drag the slider to the end';
    } else if (ph === 'guess') {
      show_ = false;
      hintTxt = 'Pick an answer to see what happens';
    } else if (ph === 'try') label = qN() ? 'Take the quiz' : 'Finish';
    else if (ph === 'step' && ui.step + 1 >= N)
      label = T ? 'Try it yourself' : qN() ? 'Take the quiz' : 'Finish';
    else if (ph === 'check') {
      if (qPicked[qi] == null) {
        show_ = false;
        hintTxt = 'Pick an answer';
      } else label = qi + 1 < CHECK.length ? 'Next question' : 'See my score';
    } else if (ph === 'end') label = 'Start again';
    nextB.textContent = label;
    nextB.hidden = !show_;
    hint.textContent = hintTxt;
    nextB.className = 'btn ' + (ui.busy ? 'secondary' : 'primary');
    backB.style.visibility = ph === 'intro' ? 'hidden' : 'visible';
    const cur = ph === 'guess' ? ui.pending : ui.step;
    document.getElementById('count').textContent = inQuiz
      ? 'Quiz'
      : ph === 'try'
        ? 'Try it yourself'
        : ph === 'intro'
          ? `${N} steps`
          : `Step ${Math.max(1, cur + 1)} of ${N}`;
    bar.querySelectorAll('.seg').forEach((d, i) => {
      d.className =
        'seg' +
        d.dataset.c +
        (inQuiz || ph === 'try' || i < cur ? ' done' : i === cur && ph !== 'intro' ? ' now' : '');
      d.setAttribute('aria-current', i === cur ? 'step' : 'false');
    });
  }
  nextB.onclick = next;
  backB.onclick = back;
  const optB = document.getElementById('optB'),
    menu = document.getElementById('menu');
  const setMenu = on => {
    menu.hidden = !on;
    optB.setAttribute('aria-expanded', on);
  };
  optB.onclick = e => {
    e.stopPropagation();
    setMenu(menu.hidden);
  };
  menu.onclick = e => e.stopPropagation();
  document.addEventListener('click', () => setMenu(false));
  document.getElementById('restart').onclick = () => {
    setMenu(false);
    restart();
  };
  const fullB = document.getElementById('full');
  const setFull = on => {
    document.documentElement.classList.toggle('full', on);
    fullB.setAttribute('aria-pressed', on);
    fullB.textContent = on ? 'Exit full screen' : 'Full screen';
    try {
      if (on && !document.fullscreenElement) document.documentElement.requestFullscreen();
      if (!on && document.fullscreenElement) document.exitFullscreen();
    } catch (e) {}
  };
  fullB.onclick = () => {
    setMenu(false);
    setFull(!document.documentElement.classList.contains('full'));
  };
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) setFull(false);
  });
  document.querySelectorAll('#styles .opt').forEach(b => (b.onclick = () => setStyle(b.dataset.style, true)));
  guessSw.onclick = () => setGuess(guessSw.getAttribute('aria-checked') !== 'true', true);
  if (quizSw) quizSw.onclick = () => setQuiz(quizSw.getAttribute('aria-checked') !== 'true', true);
  labelSw.onclick = () => setLabels(!labelsOn, true);
  const soundSw = document.getElementById('soundSw');
  if (soundSw) {
    try {
      SOUND.on = localStorage.getItem('teachme-sound') !== '0';
    } catch (e) {}
    soundSw.setAttribute('aria-checked', SOUND.on);
    soundSw.onclick = () => {
      SOUND.on = !SOUND.on;
      soundSw.setAttribute('aria-checked', SOUND.on);
      try {
        localStorage.setItem('teachme-sound', SOUND.on ? '1' : '0');
      } catch (e) {}
    };
  }
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.matches && e.target.matches('input[type=range]')) return; // arrows move the slider
    if (e.key === 'Escape') {
      setMenu(false);
      return;
    }
    const tagEl = e.target.closest && e.target.closest('#fig .tag.has-info');
    if (tagEl && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      showPart(tagEl.dataset.part);
      return;
    }
    const onCtl = e.target.closest && e.target.closest('button, summary, a');
    if (e.key === 'ArrowRight' || ((e.key === ' ' || e.key === 'Enter') && !onCtl)) {
      e.preventDefault();
      if (ui.phase !== 'end') next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      back();
    } else if (e.key === 'r' || e.key === 'R') restart();
    else if (e.key === 'p' || e.key === 'P') setPaused(!paused, true);
    else if (e.key === 'l' || e.key === 'L') setLabels(!labelsOn, true);
    else if (e.key === 'f' || e.key === 'F') setFull(!document.documentElement.classList.contains('full'));
    else if (e.key === '+' || e.key === '=') zoomBy(1.5);
    else if (e.key === '-' || e.key === '_') zoomBy(1 / 1.5);
    else if (e.key === '0') glide(camFor(null), false);
    else {
      const i = /^[1-9]$/.test(e.key)
        ? +e.key - 1
        : /^[a-iA-I]$/.test(e.key)
          ? e.key.toUpperCase().charCodeAt(0) - 65
          : -1;
      const b = i >= 0 && actEl.querySelectorAll('.choice:not([disabled])')[i];
      if (b) {
        e.preventDefault();
        b.click();
      }
    }
  });
  // presses in the picture: a label shows its part's info; the step's "do" part runs the step; other parts use acts
  svg.addEventListener('pointerdown', e => {
    if (e.button) return;
    const tg = e.target.closest('[data-part]');
    if (tg && PARTS[tg.dataset.part]) {
      e.preventDefault();
      showPart(tg.dataset.part);
      return;
    }
    const s = ui.phase === 'do' && cfg.steps[ui.step];
    let a = e.target.closest('[data-act]');
    // a tap meant for the step's part can land on glass, a shadow or a card in front of it: look underneath
    if (s && s.do.part && (!a || a.dataset.act !== s.do.part)) {
      const u = document
        .elementsFromPoint(e.clientX, e.clientY)
        .map(el => el.closest && el.closest('[data-act]'))
        .find(x => x && x.dataset.act === s.do.part);
      if (u) a = u;
    }
    if (!a) return;
    if (s && s.do.part === a.dataset.act) {
      e.preventDefault();
      doAction();
      return;
    }
    if (cfg.acts && cfg.acts[a.dataset.act]) {
      e.preventDefault();
      cfg.acts[a.dataset.act](st, a, ui);
      ui.render();
    }
  });

  // printable worksheet: the picture prints as it is on screen, then the steps and the quiz
  document.getElementById('sheet').innerHTML =
    `<p>${esc(subtitle)}</p>${cfg.notice ? `<p><i>${esc(cfg.notice)}</i></p>` : ''}${cfg.scale ? `<p>Scale: ${esc(cfg.scale)}</p>` : ''}<h2>The steps</h2><ol>${cfg.steps.map(s => `<li><b>${esc(s.title)}.</b> ${esc(s.say)}${(s.views || []).map(v => `<br><i>${esc(v.who)}:</i> ${esc(v.says)}`).join('')}</li>`).join('')}</ol>` +
    (partNames.length
      ? `<h2>The parts</h2><ul>${partNames.map(n => `<li><b>${esc(n)}.</b> ${esc(PARTS[n])}</li>`).join('')}</ul>`
      : '') +
    (CHECK.length
      ? `<h2>Quiz</h2><ol>${CHECK.map(q => `<li>${esc(q.q)}<br>${q.choices.map((c, i) => `${L3(i)}. ${esc(c)}`).join(' &nbsp; ')}<div class="blank"></div></li>`).join('')}</ol>`
      : '') +
    `<p><b>The big idea.</b> ${esc(cfg.idea || '')}</p>` +
    (cfg.sources && cfg.sources.length
      ? `<p class="key">Sources: ${cfg.sources.map(x => esc(x.title) + ' (' + esc(x.url) + ')').join('; ')}</p>`
      : '') +
    (CHECK.length
      ? `<p class="key">Answers: ${CHECK.map((q, i) => `${i + 1} ${L3(q.answer)}`).join(', ')}</p>`
      : '');


  // ---- printing: worksheet (default), poster, labelled diagram and handout ----
  // A still is the picture after step k (k = -1: the start), drawn off screen into an SVG string with its own ids.
  // pins: labels as numbered pins (one numbering across the sheet); zoomed: use the step's own zoom.
  const worksheetHtml = document.getElementById('sheet').innerHTML;
  let pinMap = new Map();
  const stillFrame = (k, zoomed) => {
    const z = zoomed && k >= 0 ? zoomOf(k) : null;
    if (z) {
      const c = camFor(z);
      return { x: c.x + RX * c.w, y: c.y + RY * c.h, w: c.w * (1 - RX), h: c.h * (1 - RY) };
    }
    if (fitBox) {
      const w = fitBox[2] - fitBox[0],
        h = fitBox[3] - fitBox[1],
        pad = Math.max(w, h) * 0.08;
      return { x: fitBox[0] + OX - pad, y: fitBox[1] + OY - pad, w: w + 2 * pad, h: h + 2 * pad };
    }
    return { x: 0, y: 0, w: vbW, h: vbH };
  };
  let stillN = 0;
  const still = (k, o = {}) => {
    const keep = { st, LIT, cam, SEEN, VIEW, INK_K, LABEL_K, step: ui.step, phase: ui.phase };
    st = fresh();
    ui.st = st;
    ui._instant = true;
    SOUND.silent = true;
    for (let i = 0; i <= k; i++) {
      LIT = new Set(cfg.steps[i].lit || []);
      if (cfg.steps[i].run) cfg.steps[i].run(st, ui);
    }
    ui._instant = false;
    SOUND.silent = false;
    if (k < 0 || o.unlit) LIT = new Set();
    let fr = stillFrame(k, o.zoomed);
    const pins0 = new Map(pinMap);
    const render = () => {
      _clipN = 0;
      _TAGS = [];
      _INSETS = [];
      _LITNOW = [];
      _PEOPLE = [];
      _LASTLIT = [];
      _LASTPEOPLE = [];
      _DOPT = null;
      VIEW = fr;
      INK_K = (fr.w / INK_REF_VB) * (o.ink || 1);
      LABEL_K = o.label || 1.5;
      SEEN = null;
      if (cfg.reveal && k >= 0 && !o.all) {
        SEEN = new Set();
        for (let i = 0; i <= k; i++) for (const n of cfg.steps[i].lit || []) SEEN.add(n);
      }
      _PINS = o.pins ? pinMap : null;
      const b = inkScale(cfg.scene(st, pal));
      _PINS = null;
      return b;
    };
    let body = render();
    if (o.nolegend) {
      // small pictures in a strip: the key is on the big picture, so leave it out here
      const tg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      tg.innerHTML = body;
      tg.querySelectorAll('.lg').forEach(e => e.remove());
      body = tg.innerHTML;
    }
    if (o.tight) {
      // crop to what is drawn at this moment (the lesson's frame also holds every other moment), then draw again
      // at that size so lines and labels keep their weight on paper
      const ms = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      ms.setAttribute('style', 'position:absolute;left:-9999px;top:0;width:800px;height:600px;visibility:hidden');
      ms.setAttribute('viewBox', `${fr.x} ${fr.y} ${fr.w} ${fr.h}`);
      ms.innerHTML = `<g>${body}</g>`;
      document.body.appendChild(ms);
      let bb = null;
      try {
        bb = ms.firstChild.getBBox();
      } catch (e) {}
      ms.remove();
      if (bb && bb.width > 0 && bb.height > 0) {
        const x0 = Math.max(fr.x, bb.x),
          y0 = Math.max(fr.y, bb.y),
          x1 = Math.min(fr.x + fr.w, bb.x + bb.width),
          y1 = Math.min(fr.y + fr.h, bb.y + bb.height),
          w = x1 - x0,
          h = y1 - y0;
        if (w > 0 && h > 0 && (w < fr.w * 0.8 || h < fr.h * 0.8)) {
          const pad = Math.max(w, h) * 0.05;
          fr = { x: x0 - pad, y: y0 - pad, w: w + 2 * pad, h: h + 2 * pad };
          pinMap = new Map(pins0); // number the pins afresh in the redraw
          body = render();
        }
      }
    }
    const stats = cfg.stats && k >= 0 ? cfg.stats(st).filter(Boolean) : [];
    const lit = LIT.size > 0;
    // restore the live lesson exactly as it was
    st = keep.st;
    ui.st = st;
    LIT = keep.LIT;
    cam = keep.cam;
    SEEN = keep.SEEN;
    VIEW = keep.VIEW;
    INK_K = keep.INK_K;
    LABEL_K = keep.LABEL_K;
    // every still gets its own ids, so gradients and clips never clash between pictures on one sheet
    const pre = 'p' + ++stillN + '_';
    body = body
      .replace(/\bid="([^"]+)"/g, (_, id) => `id="${pre}${id}"`)
      .replace(/url\(#([^)]+)\)/g, (_, id) => (/^(soft|softL|hand)$/.test(id) ? `url(#${id})` : `url(#${pre}${id})`))
      .replace(/href="#([^"]+)"/g, (_, id) => `href="#${pre}${id}"`)
      .replace(/var\(--hi,#ffc93c\)/g, '#ffc93c');
    const svgS =
      `<svg class="pfig${lit ? ' lit' : ''}" viewBox="${f(fr.x)} ${f(fr.y)} ${f(fr.w)} ${f(fr.h)}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(k >= 0 ? cfg.steps[k].title : cfg.title)}">` +
      `<g${STYLE.filter ? ' filter="url(#hand)"' : ''}>${body}</g></svg>`;
    return { svg: svgS, stats, aspect: fr.w / fr.h };
  };
  const statLine = a => (a.length ? `<p class="pstat">${a.map(x => `${esc(x.label)}: <b>${esc(x.value)}</b>`).join(' &middot; ')}</p>` : '');
  // the overview picture: the moment (start, or the end of a step) that shows the most labelled parts at once,
  // unless the lesson names one with print: {overview: k} (k = step number, 0 = the start)
  const overview = () => {
    let best = -1;
    if (cfg.print && cfg.print.overview != null) best = cfg.print.overview - 1;
    else {
      let most = -1;
      const choices = [];
      for (let k = -1; k < N; k++) {
        pinMap = new Map();
        const sv = still(k, { pins: true, all: true, unlit: true }).svg;
        // most labels wins; between equals, the moment with more going on (more drawn) wins, so a lit flame beats
        // a candle that has gone out
        const score = pinMap.size * 1e6 + sv.length;
        choices.push((k < 0 ? 'start' : 'step ' + (k + 1)) + ': ' + pinMap.size);
        if (score > most) {
          most = score;
          best = k;
        }
      }
      document.documentElement.dataset.printChoices = choices.join(', ');
    }
    pinMap = new Map();
    stillN = 0;
    document.documentElement.dataset.printMoment = best < 0 ? 'the start' : 'the end of step ' + (best + 1);
    return still(best, { pins: true, all: true, unlit: true, tight: true });
  };
  const whereLit = n => {
    const k = cfg.steps.findIndex(s2 => (s2.lit || []).includes(n));
    return k >= 0 ? 'step ' + (k + 1) : 'in the lesson';
  };
  let posterWide = false;
  const partsList = () => {
    const names = [...pinMap.keys()],
      rest = Object.keys(PARTS).filter(n => !pinMap.has(n));
    return names.length || rest.length
      ? `<ol class="pparts">${names.map(n => `<li value="${pinMap.get(n)}"><b>${esc(n)}.</b> ${PARTS[n] ? esc(PARTS[n]) : ''}</li>`).join('')}` +
          `${rest.map(n => `<li class="nopin"><b>${esc(n)}.</b> ${esc(PARTS[n])} <i>(${whereLit(n)})</i></li>`).join('')}</ol>`
      : '';
  };
  // a step on the poster: the whole caption when it is short, otherwise its last sentence, which says what to remember
  const takeaway = say => {
    const t = String(say || '').trim();
    if (t.split(/\s+/).length <= 32) return t;
    const parts = t.split(/(?<=[.!?])\s+/);
    let out = parts[parts.length - 1];
    // a short last line ("It moves heat out.") needs the sentence before it to make sense
    for (let i = parts.length - 2; i >= 0 && out.split(/\s+/).length < 12; i--) out = parts[i] + ' ' + out;
    return out;
  };
  const stepsList = compact =>
    compact
      ? `<section class="psteps short"><h2>How it works</h2><ol>${cfg.steps.map(s => `<li>${esc(s.title)}</li>`).join('')}</ol></section>`
      : `<section class="psteps"><h2>How it works</h2><ol>${cfg.steps.map(s => `<li><b>${esc(s.title)}.</b> ${esc(takeaway(s.say))}</li>`).join('')}</ol></section>`;
  const head = (small = false) =>
    `<header class="phead${small ? ' small' : ''}"><h1>${esc(cfg.title)}</h1>${cfg.idea ? `<p class="pidea">${esc(cfg.idea)}</p>` : ''}</header>`;
  const foot = () =>
    `<footer class="pfoot2">${cfg.notice ? `<p><b>${esc(cfg.notice)}</b></p>` : ''}${cfg.scale ? `<p>Scale: ${esc(cfg.scale)}</p>` : ''}` +
    (cfg.sources && cfg.sources.length ? `<p>Sources: ${cfg.sources.map(x => esc(x.title)).join('; ')}.</p>` : '') +
    `</footer>`;
  const quizHtml = () =>
    CHECK.length
      ? `<section class="pquiz"><h2>Check yourself</h2><ol>${CHECK.map(q => `<li>${esc(q.q)}<br>${q.choices.map((c, i) => `${L3(i)}. ${esc(c)}`).join(' &nbsp; ')}<div class="blank"></div></li>`).join('')}</ol>` +
        `<p class="key">Answers: ${CHECK.map((q, i) => `${i + 1} ${L3(q.answer)}. ${esc(q.why || '')}`).join(' ')}</p></section>`
      : '';
  const sheets = {
    worksheet: () => worksheetHtml,
    // one page: the name set large, the big idea, the whole picture with numbered pins, every part in one line
    poster: () => {
      const a = overview();
      posterWide = a.aspect > 1.45; // a wide picture gets a landscape poster, so it isn't tiny on the page
      const compact = cfg.steps.length > 8 || Object.keys(PARTS).length > 9 ? ' compact' : '';
      if (a.aspect > 2.1)
        // a very wide picture: across the whole page, with the parts and the steps side by side under it
        return (
          `<div class="ppage poster xwide${compact}">${head()}<figure class="pbig">${a.svg}</figure>` +
          `<div class="pbelow">${partsList()}${stepsList(!!compact)}</div>${foot()}</div>`
        );
      if (posterWide)
        return (
          `<div class="ppage poster wide${compact}">${head()}<div class="pwide"><div class="pmain"><figure class="pbig">${a.svg}</figure>` +
          `${stepsList(!!compact)}</div><div class="pside">${partsList()}</div></div>${foot()}</div>`
        );
      return (
        `<div class="ppage poster${compact}">${head()}<figure class="pbig">${a.svg}</figure>${partsList()}` +
        `${stepsList(!!compact)}${foot()}</div>`
      );
    },
    // one landscape page: the picture with pins and a parts table, then a strip of key steps with their parts lit
    diagram: () => {
      const a = overview(),
        n = cfg.steps.length,
        pick = n <= 6 ? cfg.steps.map((_, i) => i) : [0, 1, 2, 3, 4, 5].map(i => Math.round((i * (n - 1)) / 5));
      const pinsSeen = new Map(pinMap),
        strip = pick
        .map(i => {
          const b = still(i, { pins: true, zoomed: true, label: 2.6, ink: 1.3, nolegend: true });
          return `<figure class="pcell">${b.svg}<figcaption><b>${i + 1}. ${esc(cfg.steps[i].title)}</b></figcaption></figure>`;
        })
        .join('');
      return (
        `<div class="ppage diagram">${head(true)}<div class="pcols"><figure class="pbig">${a.svg}</figure>` +
        `<table class="ptable"><thead><tr><th>No.</th><th>Part</th><th>What it does</th></tr></thead><tbody>${[...pinsSeen.keys()]
          .map(nm => `<tr><td>${pinMap.get(nm)}</td><td><b>${esc(nm)}</b></td><td>${PARTS[nm] ? esc(PARTS[nm]) : ''}</td></tr>`)
          .join('')}${Object.keys(PARTS)
          .filter(nm => !pinsSeen.has(nm))
          .map(nm => `<tr><td>${pinMap.get(nm) || ''}</td><td><b>${esc(nm)}</b></td><td>${esc(PARTS[nm])} <i>(in the steps)</i></td></tr>`)
          .join('')}</tbody></table></div>` +
        `<div class="pstrip">${strip}</div>${foot()}</div>`
      );
    },
    // several pages: an overview with pins, every step as a large still with its words (six to a page), the quiz
    handout: () => {
      const a = overview();
      let out = `<div class="ppage handout first">${head()}${cfg.intro ? `<p class="pintro">${esc(cfg.intro)}</p>` : ''}<figure class="pbig">${a.svg}</figure>${partsList()}</div>`;
      const cells = cfg.steps.map((s, i) => {
        const b = still(i, { zoomed: true, label: 2 });
        return (
          `<figure class="pcell big">${b.svg}<figcaption>${s.chapter ? `<span class="pch">${esc(s.chapter)}</span>` : ''}<b>${i + 1}. ${esc(s.title)}</b> ${esc(s.say || '')}${statLine(b.stats)}</figcaption></figure>`
        );
      });
      for (let i = 0; i < cells.length; i += 6)
        out += `<div class="ppage handout"><h2 class="ph2">How it works${cells.length > 6 ? ` (${Math.floor(i / 6) + 1} of ${Math.ceil(cells.length / 6)})` : ''}</h2><div class="pgrid">${cells.slice(i, i + 6).join('')}</div></div>`;
      out +=
        `<div class="ppage handout">${quizHtml()}` +
        ((cfg.simplified || []).length ? `<h2>What this lesson leaves out</h2><ul>${cfg.simplified.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '') +
        (cfg.sources && cfg.sources.length ? `<h2>Where the facts come from</h2><ul class="psrc">${cfg.sources.map(x => `<li>${esc(x.title)}. ${esc(x.url)}</li>`).join('')}</ul>` : '') +
        `${cfg.notice ? `<p><b>${esc(cfg.notice)}</b></p>` : ''}${cfg.scale ? `<p>Scale: ${esc(cfg.scale)}</p>` : ''}</div>`;
      return out;
    },
  };
  let pageStyle = document.getElementById('pagesz');
  if (!pageStyle) {
    pageStyle = document.createElement('style');
    pageStyle.id = 'pagesz';
    document.head.appendChild(pageStyle);
  }
  const preparePrint = (mode, paper) => {
    if (!sheets[mode]) mode = 'worksheet';
    const sh = document.getElementById('sheet');
    sh.innerHTML = sheets[mode]();
    const root = document.documentElement;
    root.classList.remove('pr-worksheet', 'pr-poster', 'pr-diagram', 'pr-handout');
    root.classList.add('pr-' + mode);
    const land = mode === 'diagram' || (mode === 'poster' && posterWide);
    const size = (paper === 'letter' ? 'letter' : 'A4') + (land ? ' landscape' : ' portrait');
    const ph = paper === 'letter' ? (land ? 195.9 : 259.4) : land ? 190 : 277;
    pageStyle.textContent = `@page{size:${size};margin:${mode === 'worksheet' ? '14mm' : '10mm'}}:root{--ph:${ph - 3}mm}`;
    root.dataset.printReady = mode;
    return mode;
  };
  window.__print = preparePrint;
  // The sheet as its own page: the print styles applied on screen too, so it looks like the paper and prints the same.
  // Used when this page cannot print itself (a preview panel or an embedded frame that blocks print dialogs).
  const sheetPage = mode => {
    const css = LESSON_CSS,
      i = css.indexOf('@media print{');
    let printCss = '';
    if (i >= 0) {
      let d = 0,
        j = i + 12;
      for (; j < css.length; j++) {
        if (css[j] === '{') d++;
        else if (css[j] === '}' && --d === 0) break;
      }
      printCss = css.slice(i + 13, j);
    }
    const names = { worksheet: 'Worksheet', poster: 'Poster', diagram: 'Labelled diagram', handout: 'Handout' };
    return (
      `<!doctype html><html lang="en" class="pr-${mode}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
      `<title>${esc(cfg.title)}: ${names[mode] || 'Sheet'}</title><style>${css}\n${printCss}\n${pageStyle.textContent}` +
      `@media screen{body{background:#eef0f3;padding:16px!important}.sheet{max-width:${/landscape/.test(pageStyle.textContent) ? 297 : 210}mm;margin:0 auto}` +
      `.ppage{background:#fff;padding:10mm;margin:0 auto 16px;box-shadow:0 2px 14px rgba(0,0,0,.12)}.pbar{max-width:${/landscape/.test(pageStyle.textContent) ? 297 : 210}mm;margin:0 auto 12px;font:15px ${SANS};display:flex;gap:10px;align-items:center}` +
      `.pbar button{font:inherit;padding:8px 16px;border-radius:999px;border:0;background:#2b59d9;color:#fff;cursor:pointer}}@media print{.pbar{display:none}body{padding:0!important;margin:0}}</style></head>` +
      `<body><div class="pbar"><button onclick="go()">Print or save as PDF</button><span id="pmsg">${esc(names[mode] || '')} for “${esc(cfg.title)}”</span></div>` +
      `<div class="wrap"><div class="sheet">${mode === 'worksheet' ? `<h1 style="font-size:26px;margin:0 0 6px">${esc(cfg.title)}</h1>` : ''}${document.getElementById('sheet').innerHTML}</div></div>` +
      // a tab opened from a sandboxed preview is sandboxed too and can't open the dialog from a script: then say how
      `<script>var mac=/Mac|iPhone|iPad/.test(navigator.platform);function go(){var ok=false;function on(){ok=true}addEventListener('beforeprint',on);` +
      `try{print()}catch(e){}setTimeout(function(){removeEventListener('beforeprint',on);if(!ok)document.getElementById('pmsg').innerHTML='Press <b>'+(mac?'Cmd':'Ctrl')+' + P</b> to print or save this page as a PDF.'},500)}` +
      `addEventListener('load',function(){setTimeout(go,400)})<\/script></body></html>`
    );
  };
  const printHelp = mode => {
    const html = sheetPage(mode),
      blob = new Blob([html], { type: 'text/html' }),
      url = URL.createObjectURL(blob),
      name = slug + '-' + mode + '.html';
    vidEl.hidden = false;
    document.getElementById('vidH').textContent = 'Printing is blocked here';
    vidP.textContent =
      'This window cannot open the print dialog (it is shown inside a preview or another page). Open the sheet in a new tab, or save it and open the file in your browser. It opens the print dialog by itself, or tells you the keys to press.';
    vidBar.parentElement.hidden = true;
    vidAct.innerHTML =
      `<button class="btn quiet" id="prX">Close</button><a class="btn secondary" id="prS" href="${url}" download="${name}">Save the sheet</a>` +
      `<button class="btn primary" id="prO">Open in a new tab</button>`;
    const close = () => {
      vidEl.hidden = true;
      vidBar.parentElement.hidden = false;
      preparePrint('worksheet');
    };
    document.getElementById('prX').onclick = close;
    wireSave(document.getElementById('prS'), name, blob, t => (vidP.textContent = t));
    document.getElementById('prO').onclick = () => {
      let w = null;
      try {
        w = window.open(url, '_blank');
      } catch (e) {}
      if (!w) {
        // pop-ups are blocked too: saving the file is the way out
        vidP.textContent = 'New tabs are blocked here as well. Press "Save the sheet", open the file it saves in your browser, and print from there.';
      }
    };
  };
  // print the sheet; if the print dialog never starts (a sandboxed preview blocks it silently), offer another way
  const tryPrint = mode => {
    let started = false;
    const on = () => (started = true);
    addEventListener('beforeprint', on);
    try {
      window.print();
    } catch (e) {}
    setTimeout(() => {
      removeEventListener('beforeprint', on);
      if (!started) printHelp(mode);
    }, 500);
  };
  window.__printHelp = printHelp;
  document.querySelectorAll('[data-print]').forEach(b => {
    b.onclick = () => {
      setMenu(false);
      const mode = preparePrint(b.dataset.print);
      setTimeout(() => tryPrint(mode), 60);
    };
  });
  addEventListener('afterprint', () => {
    if (!document.documentElement.classList.contains('pr-worksheet')) preparePrint('worksheet');
  });

  // remembered per viewer; testing hooks: ?style= ?labels=0|1 ?guess=0|1 ?step=N ?guessstep=N ?dostep=N ?try=1 ?check=1 ?full=1
  const q = new URLSearchParams(location.search);
  let savedStyle = null,
    savedGuess = null,
    savedQuiz = null,
    savedLabels = null;
  try {
    savedLabels = localStorage.getItem('teachme-labels');
    savedStyle = localStorage.getItem('teachme-style');
    savedGuess = localStorage.getItem('teachme-guess');
    savedQuiz = localStorage.getItem('teachme-quiz');
  } catch (e) {}
  window.__st = () => st;
  window.__ui = ui;
  window.__cfg = cfg;
  setStyle(q.get('style') || savedStyle || cfg.style || 'clear', false);
  setGuess(
    q.has('guess') ? q.get('guess') !== '0' : savedGuess != null ? savedGuess === '1' : cfg.guess !== false,
    false
  );
  setLabels(
    q.has('labels') ? q.get('labels') !== '0' : savedLabels != null ? savedLabels === '1' : cfg.labels !== false,
    false
  );
  setQuiz(
    q.has('quiz') ? q.get('quiz') !== '0' : savedQuiz != null ? savedQuiz === '1' : cfg.quiz !== false,
    false
  );
  // fit: with no bounds, draw the start, the end of every step and the sandbox once, measure the drawing (labels
  // left out) and frame the union, so the picture fills its space and never jumps between steps.
  // run again if the page had no size the first time (nothing could be measured)
  const fitPass = () => {
  if (!cfg.bounds)
    for (let pass = 0; pass < 2; pass++) {
      const boxes = [],
        grab = () => {
          _clipN = 0;
          _TAGS = [];
          _INSETS = [];
          VIEW = null;
          INK_K = INK_BASE;
          art.innerHTML = cfg.scene(st, pal);
          art.querySelectorAll('.tag').forEach(t => t.remove());
          // count only what can be seen: clipped groups by their clip shape, and nothing fully transparent
          art.querySelectorAll('[clip-path]').forEach(g => {
            const id = (g.getAttribute('clip-path').match(/#([^)]+)/) || [])[1],
              cp = id && art.querySelector('#' + CSS.escape(id));
            if (cp) {
              g.innerHTML = cp.innerHTML;
              g.removeAttribute('clip-path');
            }
          });
          art.querySelectorAll('[opacity="0"],[opacity="0.00"],[opacity="0.0"]').forEach(e => e.remove());
          art.querySelectorAll('[fill-opacity="0"],[fill-opacity="0.00"]').forEach(e => {
            if (
              !e.getAttribute('stroke') ||
              e.getAttribute('stroke') === 'none' ||
              /^0(\.0+)?$/.test(e.getAttribute('stroke-opacity') || '')
            )
              e.remove();
          });
          const b = art.getBBox();
          if (b.width) boxes.push([b.x, b.y, b.x + b.width, b.y + b.height]);
        };
      OX = OY = 0;
      st = fresh();
      ui.st = st;
      grab();
      ui._instant = true;
      SOUND.silent = true;
      cfg.steps.forEach(s2 => {
        LIT = new Set(s2.lit || []);
        if (s2.run) s2.run(st, ui);
        OX = OY = 0;
        grab();
        if (TURN) {
          // a lesson that turns is framed for every side, so turning never pushes the drawing off the picture
          const a0 = VIEW_AZ;
          for (const k of [0.5, 1, 1.5]) {
            setTurn(a0 + k * Math.PI);
            grab();
          }
          setTurn(a0);
        }
      });
      if (T && T.setup) {
        T.setup(st, ui);
        if (T.tick) T.tick(st, 0.05, ui);
        OX = OY = 0;
        grab();
      }
      ui._instant = false;
      SOUND.silent = false;
      LIT = new Set();
      st = fresh();
      ui.st = st;
      ui.step = -1;
      ui.phase = 'intro';
      if (boxes.length) {
        const pad = 0.03,
          bx = [
            Math.min(...boxes.map(b => b[0])),
            Math.min(...boxes.map(b => b[1])),
            Math.max(...boxes.map(b => b[2])),
            Math.max(...boxes.map(b => b[3])),
          ];
        const w = bx[2] - bx[0],
          h = bx[3] - bx[1];
        fitBox = [bx[0] - w * pad, bx[1] - h * pad, bx[2] + w * pad, bx[3] + h * pad];
      }
      frameKey = '';
      frame();
      cam = camFor(null);
      applyCam();
    }
  };
  fitPass();
  fitPassFn = fitPass;
  if (svg.getScreenCTM() && cfg.steps.some(s2 => s2.zoom === 'auto' || (s2.zoom === undefined && cfg.autoZoom))) {
    // auto zoom frames what this step is about: its lit labels (and the part under each), its do ring, its focus
    // points, and everything in the drawing that changes between the start and the end of the step
    ui._instant = true;
    SOUND.silent = true;
    VIEW = null;
    INK_K = INK_BASE;
    SEEN = null;
    const svgM = () => svg.getScreenCTM().inverse();
    const draw = () => {
      _LITPTS = [];
      _clipN = 0;
      _TAGS = [];
      _INSETS = [];
      art.innerHTML = cfg.scene(st, pal);
      const lit = _LITPTS;
      _LITPTS = null;
      const M = svgM(),
        leaves = new Map();
      for (const el of art.querySelectorAll('path,circle,rect,ellipse,polygon,polyline,line,text')) {
        if (el.closest('.tag,.lg,clipPath,radialGradient,linearGradient,filter')) continue;
        const r = (el.closest('.whole') || el).getBoundingClientRect();
        if (!r.width && !r.height) continue; // a change inside a card or chart frames the whole of it
        const p0 = new DOMPoint(r.x, r.y).matrixTransform(M),
          p1 = new DOMPoint(r.right, r.bottom).matrixTransform(M);
        const key =
          el.tagName +
          [...el.attributes].map(a => a.name + '=' + a.value).join(';') +
          (el.tagName === 'text' ? el.textContent : '');
        (leaves.get(key) || leaves.set(key, []).get(key)).push([p0.x, p0.y, p1.x, p1.y]);
      }
      const wholes = [...art.querySelectorAll('.whole')].map(g => {
        const r = g.getBoundingClientRect(),
          p0 = new DOMPoint(r.x, r.y).matrixTransform(M),
          p1 = new DOMPoint(r.right, r.bottom).matrixTransform(M);
        return [p0.x, p0.y, p1.x, p1.y];
      });
      return { lit, leaves, wholes };
    };
    const changed = (A, B) => {
      let b = null;
      for (const [k, bs] of B.leaves) {
        const n = (A.leaves.get(k) || []).length;
        for (const q of bs.slice(n))
          b = b
            ? [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[2]), Math.max(b[3], q[3])]
            : q.slice();
      }
      return b;
    };
    st = fresh();
    ui.st = st; // play the steps once, in order: each step starts where the one before it ended
    cfg.steps.forEach((s2, k) => {
      LIT = new Set(s2.lit || []);
      const A = draw();
      if (s2.run) s2.run(st, ui);
      const B = draw();
      const all = A.lit.concat(B.lit),
        un = p => [p[0] - OX, p[1] - OY];
      const big = b => (b && (b[2] - b[0]) * (b[3] - b[1]) > vbW * vbH * 0.5 ? null : b); // a change all over the picture says nothing about where to look
      for (const b of [big(changed(A, B)), big(changed(B, A))])
        if (b) {
          all.push(un([b[0], b[1]]), un([b[2], b[3]]));
        }
      if (s2.do && s2.do.at && doAt(s2.do)) all.push(un(doAt(s2.do)));
      for (const p of s2.focus || []) all.push(un(p.length === 2 ? p : P(...p)));
      if (!s2.focus) for (const p of A.lit.slice()) all.push([p[0], p[1] + vbH * 0.16]); // labels sit on top of their parts: keep the body below in view
      if (!all.length) return;
      let bx = [
        Math.min(...all.map(p => p[0])),
        Math.min(...all.map(p => p[1])),
        Math.max(...all.map(p => p[0])),
        Math.max(...all.map(p => p[1])),
      ];
      // a card or a chart that the step touches is kept whole
      for (const w0 of B.wholes) {
        const w = [w0[0] - OX, w0[1] - OY, w0[2] - OX, w0[3] - OY];
        if (w[0] < bx[2] && w[2] > bx[0] && w[1] < bx[3] && w[3] > bx[1])
          bx = [Math.min(bx[0], w[0]), Math.min(bx[1], w[1]), Math.max(bx[2], w[2]), Math.max(bx[3], w[3])];
      }
      autoCam[k] = bx;
      autoWhole[k] = B.wholes.map(w0 => [w0[0] - OX, w0[1] - OY, w0[2] - OX, w0[3] - OY]);
    });
    ui._instant = false;
    SOUND.silent = false;
    LIT = new Set();
    st = fresh();
    ui.st = st;
    ui.step = -1;
    ui.phase = 'intro';
  }
  if (q.has('step')) jumpTo(Math.min(N, +q.get('step')) - 1);
  else {
    ui.render();
    show();
  }
  if (q.has('print')) preparePrint(q.get('print'), q.get('paper')); // ?print=poster|diagram|handout|worksheet&paper=letter
  if (q.has('guessstep')) {
    const k = +q.get('guessstep') - 1;
    jumpTo(k - 1);
    if (cfg.steps[k] && cfg.steps[k].guess) {
      ui.pending = k;
      ui.phase = 'guess';
      show();
    }
  }
  if (q.has('dostep')) {
    const k = +q.get('dostep') - 1;
    jumpTo(k - 1);
    startStep(k);
  }
  if (q.has('try') && T) {
    jumpTo(N - 1);
    startTry();
  }
  if (q.has('check')) {
    jumpTo(N - 1);
    qi = 0;
    toCheck();
  }
  if (q.get('full') === '1') document.documentElement.classList.add('full');
  sync();
  return ui;
}

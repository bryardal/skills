# Engine API (`assets/teach.js`)

Everything a lesson can call. **Don't read `teach.js`**; this page is the reference. Contents: page skeleton,
`mountLesson` options, animation rules, coordinates, materials, shapes, ready-made parts, flows, labels, reserved names.

## Page skeleton

Start from `templates/lesson.html` (or run `scripts/new.py`). One inline `<script>` after
`<script src="teach.js"></script>`: a comment with the real process and sandbox facts, the geometry constants,
`scene(st, m)`, any sandbox functions, then `mountLesson({...})`. Prefix your own names (`seX`, `kRing`) so they never
clash with the engine.

## `mountLesson` options

- `title`, `subtitle` (optional; only printed on the worksheet), `level` (`kid`, `student` or `adult`), `style`
  (`clear` default, `sketch`, `contrast`), `guess` and `quiz` (both `true` by default; the learner can switch each off in Options, and the choice is
  remembered), `view` (`'iso'` default, `'front'`,
  `'plan'`; see drawing.md), `sound` (`true` shows a Sound switch in Options; play notes with `playNote`).
- `bounds` (optional; usually leave it out): without it, the engine draws the start, the end of every step and the
  sandbox once, measures them and frames all of it, so the picture fills its space and never jumps between steps.
  Give `bounds: [[x0,y0,z0],[x1,y1,z1]]` only to force a frame.
- Colours and materials: wherever a part takes a material `m`, you can pass a `MAT` entry, `matOf('#hex')` or just
  `'#hex'`. `MAT` keys: `whitePlastic blackPlastic steel glass copper brass gold silver rubber wood counter paper brick
  leaf soil`.
- `palette`: the body's real colour, usually from `MAT`. It arrives in `scene(st, m)` as `m`.
- `state`, `scene`, `stats` (`st => [{label, value, small}]`, big numbers for a measured amount), `intro`, `parts`
  (`{'Label text': 'One or two sentences.'}`).
- `st.t` is the engine's clock: if `state` has `t: 0`, the engine adds the time to it about 30 times a second while
  the picture plays, in every phase. Use it only for looping motion (`frac(st.t * speed + i / n)`), and never add to
  it yourself. `live(st, dt, ui)` (optional) runs on the same clock for other looping motion, outside the sandbox.
- `reveal: true` (the template sets it): a label appears only from the first step that lights it (`lit`), so the
  learner meets parts one at a time. Labels no step lights always show; the sandbox and quiz show everything.
- `autoZoom: true` (the template sets it): every step without its own `zoom` glides in on the parts it lights
  (`lit`), measured at the start and end of the step, plus the `do` ring; up to 2x (`autoZoomMax`). Steps whose lit
  parts are spread across the picture stay on the whole picture. Leave it on; it is the biggest single gain in
  picture clarity.
- `steps: [{title, say, lit, zoom, focus, chapter, guess, do: {label, part, at, hint}, drag: {label, secs}, views, run(st, ui)}]`.
  Any number of steps. `chapter: 'The Senate'` on the first step of a section shows "Part 2 · The Senate" above
  that step's title and every step after it, until the next chapter, and leaves a gap in the progress bar.
  `zoom: {at: [x,y,z], k: 1.6-2.5}` (lower for long objects), `zoom: 'auto'` (frame the lit parts, as above) or
  `zoom: null` (whole picture even with `autoZoom`). `focus: [[x,y,z], ...]` adds points the auto zoom must keep in
  view (the body of a tall part whose label sits on top). A step can have a `guess` and a `do` or `drag`
  together: the guess comes first. `views: [{who, says}]` (and optional `viewsTitle`) lists explanations side by side
  under the text, for debated topics. `guess: {q, choices: [3], answer, why}`. `do.part` is an `act` name, `do.at` the
  3D point where the ring pulses.
- `tryit: {title, say, setup(st), tick(st, dt, ui), observe(st), controls: [...]}`. `setup` changes `st` for the
  sandbox only: Back and the progress bar rebuild every step from `state`. Controls:
  `{type:'button', label, onClick(st, ui)}` (label can be a function of `st`), `{type:'toggle', key, label}` and
  `{type:'range', key, label, min, max, step, format, onChange(st, ui)}`. A toggle stores `true`/`false` in
  `st[key]`; toggles also take `onChange`. The learner's controls and `tick` may both change a value, but give the
  learner's choice its own key (`priceHand`) and let `tick` move the shown value toward it. Use `ui.note('text')` for a short message
  in the live line ("The switch won't stay on yet").
- `idea`, `simplified` (list), `check` (`[{q, choices, answer, why}]`), `sources` (`[{title, url, note}]`), `acts`
  (`{name(st, el, ui){}}`, optional clicks on parts), `credit`.

The page, Pause/Replay, zoom, Options, keyboard, printing and **Download video** are all built in.

## Animation rules

In `run(st, ui)`, animate with `ui.tween({key: target, ...}, seconds, after)` or `ui.animate(dt => {...; return
stillRunning;}, after)`. **Every step must end in the same state whether it animates, is dragged or runs instantly.**
Back, the progress bar, reduced motion and "Skip" replay steps instantly, and a drag feeds the same animation from
the slider. So drive everything from `st`, move values only toward fixed targets, and chain sub-moves with `after`
(only the first move of a drag step follows the slider; chained moves play on their own). Keep each animation under
about 3 seconds. If a step has several moves that a slider should drive, write them as one timeline in a single
`ui.animate` (as the kettle's "The disc snaps" does). A sandbox `tick` is a small simulation: move values a little
each frame, and follow the sourced what-ifs exactly.

## Coordinates and projection

- x runs toward the viewer's right (down-right on screen), y toward the viewer's left (down-left), z up. Visible
  faces: front `+x`, left side `+y`, top `+z`. Units are free; objects are usually 60-100 units across.
- `P(x,y,z)` gives screen `[X, Y]`; `pd(points3)` gives an SVG path (closed; `pd(pts, false)` open); `Dv` is a
  screen direction; `depthOf`, `byDepth([{at, svg}])` sorts back to front.
- Plane mappers for 2D shapes: `PX(x)` front plane (u = y, v = z), `PY(y)` side plane (u = x, v = z), `PZ(z)`
  horizontal (u = x, v = y); `on(plane, uvPoints)`. 2D shapes: `rectUV`, `rrUV(u0,v0,u1,v1,r)`, `ellUV(cu,cv,ru,rv,n)`,
  `arcUV(cu,cv,r,a0,a1,n)` (degrees). `planeAt(axis, c)` gives `[plane, u0, v0]` for a face through `c`; `US(axis)`
  is -1 on the front plane where +u runs to the viewer's left.
- Vectors: `add sub dot cross norm lerp3 avg`, `vis(normal)` (faces the viewer), `clamp`, `ease`, `frac`, `mix(hexA,
  hexB, t)` (both 7-character hex colours).
- In `'front'` view the screen shows y (to the left) and z (up); x is depth. In `'plan'` view it shows x (right) and
  y (down); z is height and only orders what is drawn on top. The same scene code works in every view.

## Materials and colour

`MAT`: `whitePlastic blackPlastic steel glass copper brass gold silver rubber wood counter paper brick leaf soil`;
also `CLEAR WATER METAL DARK CERAMIC BOARD WOOD`, and `matOf('#hex')` for any colour. A material is `{l, m, d}`.
`tone(normal, m)` shades an outside surface, `toneI(normal, m)` a small prop or inside. `INK` is the outline colour.

## Shapes (all return SVG strings)

In every shape, `m` is a material `{l, m, d}`; `shade` is a function `(normal, m) => colour`, normally `tone` (outside
surfaces) or `toneI` (props, insides); leave it out, or pass anything else, to get the default. `w` is the outline
width (about 0.6-2.4).
- `box(x0,y0,z0,x1,y1,z1, m, shade?, w?)`: shaded block.
- `cyl(x,y,z0,z1,r, m, shade?, w?, n?, rTop?)`: upright cylinder, can taper. `cylX(x0,x1,y,z,r, m)`: lying along x.
- `rod(a3, b3, r, m, shade?, w?, rEnd?, n?)`: a bar or tube between any two points, can taper.
- `prism(points2, z0, h, m, w?)`: an upright solid from ANY flat outline `[[x,y], ...]`, convex or not (tiles, map
  regions, plinths, a guitar body outline).
- `loft(ringA, ringB, n => colour, flipInside?)`: surface between two rings of equal length (cups, domes, bottles).
- `extrude(profileUV, x0, x1, m)`: a rounded body swept along x (convex profiles only).
- `ball(p3, r, m)`, `stack(x,y,z0,r,[{h,m}], ridge?)` (coin or block towers; ridge = spacing of the coin lines),
  `board(x0,y0,x1,y1,h,r,m)` (only when a board means something), `ground(x,y,z,r,ry?)` (soft shadow under an
  object standing on the page: r across x, ry across y).
- `shape(points3, colour, w?)`, `fill(path, colour, extra?)` (`extra` is raw SVG attributes, e.g.
  `'fill-rule="evenodd"'`), `face`, `ink(path, w)`, `line(points3, w)` (dark outline colour),
  `curve(points3, colour, w, {dash, op, close})` (any colour, dashed or faded), `hullInk(points3, w)` (the silhouette
  outline, after each body), `castShadow(points3, z0, clip?)`, `fade(opacity, svg)` (see-through or fading in).
- `byDepth([{at, svg}])` returns one SVG string, the parts sorted back to front.
- Text: `tx` (on a front face), `txY` (side face), `txZ` (flat on the floor; `along` 'x' or '-y'): `(x,y,z, text,
  size, colour, weight)`. The text is centred on the point, which is its baseline. Plain characters only.
- `onFace(origin3, U3, V3, innerSvg)`: flat 2D drawing on any face (a screen, a sign, a cross-section).
- `act('name', svg)`: a part the learner can press. `clipTo(points3, svg)`: clip to an opening.

## Ready-made parts (prefer these; each is one line in a lesson)

- `pipe(points3, r, m)`: a bent pipe with rounded joints.
- `wheel(c3, axis, R, angle, m, {spokes, thick, rim, hub})`: spoked wheel (flywheel, pulley, handwheel) turning
  about `axis` 'x' | 'y' | 'z'.
- `gauge(c3, axis, r, v)`: round dial on a face, needle from 0 to 1, red zone at the top end.
- `puffs(p3, st.t, amt, {n, rise, drift, r0, r1, speed, col})`: steam or smoke rising and fading.
- `fire(p3, w, h, amt, st.t)`: flickering flames. `glow(p3, r, amt, colour)`: a soft round glow.
- `vessel(c3, r, h, level, liquidM, {glass, tint})`: a glass beaker, jar or tank filled to `level` (0..1). Returns
  `{back, liquid, front, svg}`: draw `back`, then anything inside, then `liquid`, then `front`.
- `meter(c3, h, r, v, {m, marks: [{at, label}]})`: a glass tube filled to v (0..1) with labelled lines: votes against
  a majority, a budget, antibodies, even a feeling (say so in `simplified`).
- `ring(c3, axis, r, colour, w, op)` and `ripples(c3, axis, st.t, amt, {n, speed, r0, r1, col, w})`: circles on a
  face, and rings spreading and fading (sound, water, an earthquake).
- `playNote(freq, secs, {type, vol})`: a short note (set `sound: true`). It stays silent while steps replay instantly
  or the video is made, and when the learner turns sound off.
- `flow(path3, kind, amt, st.t, n, speed, r)`: tokens moving along a path; `legend([[kind, 'Name'], ...], at3?)`:
  the key for them. Leave out `at3` (or pass `'auto'`) to put it top right of the visible picture; a legend that
  would fall outside the view (when zoomed) moves there too. Kinds in `TOKENS`: `water steam air sugar coin heat
  ion+ ion-`; add your own as `TOKENS.co2 = {shape: 'ball' | 'drop' | 'cube', m: {l, m, d}}`, or any drawing as
  `TOKENS.antibody = {m, draw: ([X, Y], R, kind) => svg}` (screen units; used by both `flow` and `legend`).
- Ready-made tokens for living things and messages: `cell bcell antibody virus bacterium packet` (use a bigger `r`
  for a hero germ: `token(p3, 'virus', 5)`).
- `along(points3, t)`: the point a fraction t along a path. `arrow3(points3, w, colour, {dash, phase, head})`: the
  head is at the LAST point. `dash` (here and in `curve`) is a number (`3`) or a string (`'4 3'`).

## Parts for any topic (people, words, graphs, living shapes, mixed scales)

- `blob(c3, rx, ry, rz, m, {lumps, seed})`: a soft rounded body, smoothly shaded: a cell, an organ, a stone, a
  cloud. `lumps` 0-0.3 makes it uneven.
- `lathe(c3, [[r, h], ...], m)`: a round shell spun around an upright axis from a profile of radius and height
  pairs, bottom to top: a vase, a bottle, a heart chamber, a cell body, a tree trunk, a lamp, a chess piece.
- `person(p3, {m, skin, hair, h, arms: 'down' | 'up' | 'out' | 'wave' | 'hold', sit, seat, sad, face})`: a simple
  friendly figure standing with its feet at p3 (14 units tall by default; `sit: true` puts it on a stool there).
  Colour by role (voters orange, judges dark), never by looks; `m`, `skin` and `seat` take '#hex' or a material,
  `hair` a '#hex'. `arms: 'hold'` holds one hand forward: draw the held thing at `personHand(p3, o)` (same o).
  `sad: true` turns the mouth down. Examples: `supply-demand.html`, `bill-to-law.html`, `sentence.html`.
- `table(c3, w, d, h, m, {top, legs})`: a table or desk centred at c3 (w along y, d along x, h tall): a rounded top
  on tapered legs (`legs: false` for a solid counter or bench). Use it instead of a plain `box` for furniture. `bubble(p3, 'text', {dx, dy,
  cols, think, size})`: a speech or thought bubble with its tail at p3 and its middle `dx`, `dy` screen units away
  (default 18, -26). Keep bubbles to 2-6 words: a stranger should get the step from them at a glance.
- `card(p3, lines, {title, cols, size, dx, dy, tilt})`: a sheet of paper with real words, flat to the viewer and
  the same readable size at any zoom. Centred on p3 (plus `dx`, `dy` screen units). `size` is a multiplier: 1 is
  the default (about the size of a label), 1.3 bigger; `cols` is the line width in characters (default 30). Keep it
  to 1-3 short lines; labels and bubbles step aside from it. Marks inside the text: `[[words]]` highlighted (`[[words|#c7e3ff]]` in a colour), `**bold**`,
  `~~struck out~~`. For grammar, writing, poems, logic, laws and code.
- `graph(c3, w, h, {xr, yr, axis, size})`: a real chart flat to the viewer (`size` scales its text; example:
  `supply-demand.html`) (`axis: 'x' | 'y' | 'z'` paints it on a face
  instead). `c3` is its bottom-left corner. Returns `g` with `g.panel()`, `g.axes({x, y, xticks, yticks, xfmt,
  yfmt})`, `g.curve(fn or [[x, y]...], colour, {w, dash, label, op, from, to})` (points outside the axis range and NaN
  values are left out; `to: 30` draws only up to x = 30), `g.dot(x, y, colour, {r, label})`,
  `g.band(x0, x1, y0, y1, colour, op)` (a shaded region: a surplus, a safe range), `g.guide({x} or {y}, colour,
  label)`, `g.label(x, y, text)` and `g.pt(x, y)` (the 3D point, for `tag` and tokens). Use when the idea IS a
  relationship between two amounts (price and quantity, speed and time).
- `inset(I, () => svg)` with `I = {at, r, k, from, label, view, marker, bg}`: a round magnifier bubble showing
  something too small to see at the scene's scale (cells in an arm, atoms in a wire), or a second viewpoint (the
  Moon as seen from Earth). Draw the close-up with the usual helpers around the point `FAR` (a spot off the scene in
  every view; or give `src`). It appears `k` times bigger (default 4) in a bubble of radius `r` (scene units, like
  the drawing) centred at the 3D point `at`, with dashed lines to `from` (`marker: false` hides the ring there).
  `view: 'front' | 'plan'` draws the close-up flat on (no iso skew). Label things inside with
  `tag(insetPt(I, p3), dx, dy, 'Name')` (same I object). Example: `moon-phases.html`.
- `litBall(p3, r, sun3, {m, night, k, ang})`: a ball lit from one side by a distant light in direction `sun3`
  (planets, the Moon, a ball under a lamp), split along the true day and night line as the viewer sees it. `k`
  (1 full, 0 half, -1 dark) and `ang` (degrees) override it, e.g. inside an inset for the Moon "as seen from Earth".
- `hop(points3, s, lift)`: where something is at stage `s` (0 = first point, 1.5 = halfway from the second to the
  third), hopping in an arc between points: a bill passed desk to desk, a ball between players.
- `trail(st.t, tt => svg, {n, dt, op})`: faded copies of a moving part a moment earlier, so motion and speed show
  even in a still image (a pendulum, a vibrating string, a falling ball).

## Labels

**Overlaps.** Cards, speech bubbles and the legend place themselves: they start where you put them (`dx`, `dy`) and
step aside from labels, each other, magnifier bubbles, people, the readouts, the parts the step is about and the
part to press, taking the least-covered spot when the scene is crowded. A tap on the step's part goes through glass
or a card in front of it, and the pulsing ring moves onto the part if `do.at` misses it. `check.py` reports any
overlap that still hides something (words over words, a hidden person, a lit part or the part to press covered).
An overlap that is the point (a label on the card it names, a token passing behind glass) is fine.

Keep the step's lit label on the part that changes: `autoZoom` frames lit labels plus everything that changes in
the step, keeps a card or chart it touches whole, and leaves room for the readouts.

`tag([x,y,z], dx, dy, 'Text')` (or a screen point `[X, Y]`, e.g. from `insetPt`): a label pill with a leader line to the point, offset (dx, dy) in screen units. It
lights when the current step lists `'Text'` in `lit`, and becomes a button if `parts` has the same key. The engine
keeps labels inside the visible picture, hides a label whose part is out of view (when zoomed), and moves a label
that would overlap an earlier label or the legend. Draw labels last, most important first. Legend entries don't
count toward the label limit and don't need `parts` text.

## Unique ids

A gradient or clip path in a lesson needs an id that is unique per render: `gid('name')`.

## Reserved names (never declare these in a lesson)

`PALS METAL CLEAR CERAMIC DARK WATER MAT INK INK_SOFT SHADOW SOFT_SHADOW C S OX OY P Dv depthOf byDepth f pd sp arcUV
rectUV rrUV ellUV PX PY PZ on sub add dot cross norm lerp3 avg vis facing SHADOW_K SHADOW_LEN L SH setLight LIN tone
toneI ramp sheen mix matOf ease clamp frac ink fill face shape line loft hull hullInk box extrude cyl cylX rod ball txM
TXT tx txY txZ castShadow ground BOARD WOOD boardTop board act clipTo LIT LABEL_K VIEW tag along arrow3 onFace stack
AXN planeAt US gid pipe wheel gauge puffs glow fire TOKENS token flow legend STYLES STYLE INK_REF_VB INK_K inkScale
filterFor LESSON_CSS esc mountLesson mp4Mux _clipN _gid _TAGS VIEW_MODE VDIR setView shadeFn fade curve ring ripples
prism vessel meter SOUND playNote blob lathe person bubble card graph inset insetPt hop trail _words _textBlock
_LITPTS asM FAR litBall personHand _pBody table FONT_B64 FONT_FACE SANS SMOOTH_TURN smoothD SEEN ALLLIT
_INSETS _DOPT _LASTLIT _LITNOW _PEOPLE _LASTPEOPLE _covers _place`.

Inside your own functions, don't name a variable after an engine helper either (`on`, `f`, `P`, `S`, `C`, `L`,
`ring`, `line`, `tag`, `fill`, `face`, `shape`): `const on = ...` hides the helper and blanks the page.

A note on writing files: some file-writing tools turn `\u2019`-style escapes into the real characters. That is
harmless, but edit scripts that search for the escape will then miss; search for the character instead.

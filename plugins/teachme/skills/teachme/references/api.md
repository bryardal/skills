# Engine API (`assets/teach.js`)

Everything a lesson can call. **Don't read `teach.js`**; this page is the reference. Contents: page skeleton,
`mountLesson` options, animation rules, coordinates, materials, shapes, ready-made parts, flows, labels, reserved names.

## Page skeleton

Start from `templates/lesson.html` (or run `scripts/new.py`). One inline `<script>` after
`<script src="teach.js"></script>`: a comment with the real process and sandbox facts, the geometry constants,
`scene(st, m)`, any sandbox functions, then `mountLesson({...})`. Prefix your own names (`seX`, `kRing`) so they never
clash with the engine.

## `mountLesson` options

- `kind`: `'machine'` (objects, devices, buildings), `'living'` (bodies, organs, cells, plants, animals) or
  `'idea'` (everything else). It picks which checks `check.py` runs (detail for machines and living things, a stated
  scale for living things).
- `scale` (living things, and anything far bigger or smaller than life): one line saying whether the drawing is to
  scale, e.g. `'Schematic, not to scale'` or `'Drawn to scale: 10 units = 1 micrometre'`. Shown in "Sources and
  what's simplified" and on the worksheet.
- `turn: true` or `turn: {auto, start, pivot}`: the learner can turn the whole scene about an upright axis through
  `pivot` (default [0, 0, 0]: build the scene around it) by dragging across the picture, with the turn buttons, or
  with [ and ]. `auto: true` turns it slowly until the first touch; `start` is the opening angle in degrees. Use it
  only when the 3D shape is the idea (a molecule, a crystal, a skeleton, a sculpture) and only with parts that look
  right from every side: `ball`, `molecule`, `helix`, `tube`, `blob`, `lathe`, `latheAx`, `rod`, `box` (any three
  faces), `ground`. Flat parts (cards, graphs, organs, formulas) stay facing the viewer. Not for machines with
  printed fronts, `prism` stacks or insets. drawing.md, "Turning".
- `print: {overview: k}` (optional): which moment the printed poster, diagram and handout use for their big
  labelled picture (k = step number, 0 = the start). By default the moment that shows the most labels is used.
- `measure: [{what, a: [x,y,z], b: [x,y,z], real}]` with `unitsPer` (drawing units per real unit): check.py proves
  that each measured size matches the stated scale (living.md, section 3).
- `notice`: a short line shown under the lesson and on the worksheet. Health, medicine and drug topics always set
  `notice: 'Educational, not medical advice.'` (living.md says what else such lessons need).
- `title`, `subtitle` (optional; only printed on the worksheet), `level` (`kid`, `student` or `adult`), `style`
  (`clear` default, `sketch`, `contrast`), `guess` and `quiz` (both `true` by default; the learner can switch each off in Options, and the choice is
  remembered), `labels` (`true` by default: the learner can hide every label with "Show labels" in Options or the L
  key, remembered per viewer; the legend and the printed sheets' pins stay), `view` (`'iso'` default, `'front'`,
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

The page, Pause/Replay, zoom, Options, keyboard, printing and **Download video** are all built in. Options,
"Print or save as PDF" offers four sheets: Worksheet, Poster (one page: the picture with numbered pins, every part in
one line, the steps), Labelled diagram (one landscape page: the picture, a parts table, a strip of key steps) and
Handout (an overview, every step as a large still with its words, the quiz and answers). `scripts/print.py` makes
the same sheets as PDFs; `?print=poster` opens a lesson ready to print one.

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
- `flow(path3, kind, amt, st.t, n, speed, r)`: n tokens moving along a path. `amt` 0..1 is how visible the flow is
  (tween it to start or stop a flow, never jump); `speed` = trips along the whole path per second, whatever its
  length (0.3 = one trip in about 3 s); `r` = token radius in model units. `legend([[kind, 'Name'], ...], at3?)`:
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

## Parts for machines: fine, real detail (v2)

The parts a real object is built from, each one line. Use them so the object reads as real at 1x and still rewards
a zoom (drawing.md, "The detail pass"). Examples: `parts-gallery.html` (every part) and `nerve-signal.html`.
- `screw(p3, axis, r, {ang, hex, m})`: a slotted screw head (or `hex: true` bolt head) on a face: `axis` `'x'`
  front, `'y'` side, `'z'` top. `screws([p3, ...], axis, r)` for several; `bolts(c3, axis, R, n, r, {start, hex})`
  for n heads on a circle (a flange, a hub, a lid).
- `ticks(a3, b3, n, len, dir3, {major, w, col})`: ruler ticks from a3 to b3 (n gaps) pointing along `dir3`, every
  `major`-th (default 5) longer. Hang them from the edge of a strip so they end on something.
- `knob(c3, axis, r, h, m, {ang, ridges, pointer})`: a knurled knob or dial sticking out of a face along `axis`
  (`'x'`, `'y'`, `'z'`, or a vector), with grip ridges and a pointer line at `ang` degrees (feed it from `st`).
- `slots(axis, c3, w, h, n, {gap, along, col})`: n closed vent slots on a face, centred at c3, in a row along
  `'u'` (across) or `'v'` (up).
- `coil(a3, b3, r, turns, wire, m, {split})`: a coil spring or heating coil. With `split: true` it returns
  `{back, front}`: draw `back`, then the rod inside, then `front`, so the coil wraps the rod.
- `tube(points3, r, m, {r1, w, split})`: a smooth round tube through 3D points (a hose, a cable, a vessel, a nerve,
  a gut), tapering to `r1`. One layer; `split: true` returns `[{at, svg}]` pieces to mix into `byDepth` when the
  tube passes in front of some parts and behind others.
- `cable(a3, b3, {sag, r, m, plug})`: a cable hanging between two points with a connector shell at each end, so it
  visibly ends on something.
- `shift(d3, svg)`: draw a part moved by a 3D offset: an exploded view (`shift(mul3([0,0,1], st.apart * 20),
  lidSvg)`), a lid lifted off. Move its labels too: `tag(add(p, d3), ...)`. `mul3(v, k)` scales a vector.

More machine parts (v2):
- `latheAx(c3, axis, profile, m, {n, w, caps})`: a round body turned about ANY axis ('x', 'y', 'z', '-x', or a
  vector): a drum on its side, a nozzle, a bolt, a piston, a bottle lying down. profile = [[radius, s], ...] with s
  (distance along the axis) increasing; two points at the same s make a shoulder. Shaded and ordered by itself.
- `gear(c3, axis, r, teeth, ang, m, {thick, hole, spokes})`: a spur gear (r = pitch radius, ang in radians from
  `st`). Mesh a second one with `c2 = gearAt(c1, axis, r1, r2, phi)` and `gear(c2, axis, r2, n2, meshAng(ang1, n1,
  n2, phi), m)`: the teeth interlock and the speeds follow the tooth counts (the small gear turns n1/n2 times as
  fast, the other way). Draw the farther gear first. Sizes are model units: `thick` (default r x .28) and `hole`
  (radius, default r x .16; 0 for none); `spokes` is a count (default 5 when r > 9, 0 for a solid disc). A larger
  `ang` turns the gear counter-clockwise as you look along `axis` from its tip (for `'x'`: seen from the front).
  Fine teeth are cheap: the side walls are joined into a few paths, so 8 gears of 48 teeth stay light.
- `belt(centres3, radii, axis, {chain, t, pitch, w, m})`: a closed belt, or a bike chain with `chain: true`, wrapped
  round wheels whose centres share a plane across `axis`. List the centres in order round the loop (radii a little
  over the pitch radius so it sits on the teeth). `t` = distance moved in model units: drive it from the wheel,
  `t: st.ang * r1`, so the links keep pace with the teeth. Returns a string with `.len` and `.at(s)` (a 3D point s
  along the loop: a token riding the belt). Draw it after the wheels.
- `incline(c3, len, wide, deg, m, {dir})`: a solid slope (a ramp, a hill, a wedge) rising `deg` degrees along `dir`
  (`'x'`, `'-x'`, `'y'`, `'-y'`). `.pt(s, h, k)` = the point s up the slope, h above it, k across it (0..1);
  `.along` and `.up` are its directions. Sit things on it with `.pt`, and tilt it by tweening `deg`.
- `force(at3, vec3, {scale, col, tip, w})`: a force arrow whose length is the force (vec3 x scale, model units) and
  which grows a little bolder as it grows, so two forces compare at a glance. `tip: true` ends it at at3 (a push).
  The parts of a weight on a slope: `force(p, ramp.along, {scale: -W * Math.sin(a)})` and
  `force(p, ramp.up, {scale: W * Math.cos(a)})`. Name each with `tag` and key colours with `legend`.
- Cost: every element slows the page. Aim for under about 1,500 elements in the busiest frame (check.py reports the
  count and slow frames); `latheAx` is about 80 elements, `gear` about 10 to 35, a `box` 4 to 8. For a thin ring or
  a tyre use `ring`/`wheel`, not `latheAx`; `{n: 16}` makes a small `latheAx` lighter.
- `valve(c3, axis, r, open, m, {lever, handle})`: a quarter-turn ball valve on a pipe along `axis`; the lever lies
  along the pipe when open (open = 1) and across it when shut, as on a real valve.
- `rail(a3, 'x' | 'y', len, {w, h, m, ticks, stops})` and `carriage(at3, axis, len, w, h, m)`: a guide rail with
  end stops and a ruler, and a block with screws that rides on it.
- `pipeline(points3, r, m, {bend, flanges, bands})`: a pipe along straight legs with smooth bends and a bolted flange
  at each end (so it starts and ends on something); `bands` are clamps at fractions 0..1 along it.

Effects (v2): real-looking flame, steam, water and light, drawn with gradients and SVG filters, so they also show in
the video and the printed sheets; Clear moves them like the real thing, Sketch and High contrast draw calm flat
versions. Each takes an amount 0..1: tween it, never switch it on and off. Example: `parts-gallery.html`.
- `flame(p3, w, h, amt, st.t, {blue, n})`: a flame standing on p3 (a candle, a burner, a fire). `blue: 1` is a gas
  burner's clean blue cone; `n` tongues for a wider fire. Replaces `fire` when the flame is the subject.
- `steam(p3, amt, st.t, {n, rise, spread, r, drift, col})`: soft rising steam (`col: '#8a8f96'` for smoke).
- `waterSurface(c3, rx, ry, st.t, {m, ripple})`: the top of water in an open container, with light rippling on it.
  Draw it after a `vessel`'s liquid and before its front.
- `stream(points3, w, amt, st.t)`: water pouring or falling along points, with light running down it.
- `beam(from3, to3, r0, r1, amt, col)` and `pool(c3, rx, ry, amt, col)`: a beam of light and the bright patch it
  makes on a surface. Draw both before the parts in front of them.
- `sparks(p3, st.t, amt, {n, speed, spread})`: sparks thrown up and falling back.
- Small hinged and linked parts: `flap(a3, b3, out3, angle, m, {thick})` (a flat flap, lid or door hinged along
  a3-b3, reaching out3 when shut, turned `angle` degrees: a toilet flapper, a trapdoor) and `chain(a3, b3, {links,
  sag, r, m})` (a hanging chain of links, e.g. from a lever to a flapper).
- `pad(p3, r)`: an invisible press area r units round p3; put it inside `act()` to make a thin, small or see-through
  part easy to press: `act('wick', svg + pad(p, 4))`. The flame from `flame()` is pressable already.
- `upTo(points3, t)`: the first fraction t of a path (fluid advancing along a tube, a line drawn so far); draw it with
  `tube`, `curve` or `arrow3`.
- `pulse(st.t, perMinute, squeeze)`: a smooth repeating beat 0..1 for a heartbeat, a pump stroke or breathing:
  `heart(c, 80, {beat: pulse(st.t, 70)})`.

## Parts for living things (v2)

Soft, smooth shapes for biology. All are drawn so they read at any zoom; see living.md for the accuracy rules.
- `tree(at3, dir3, {len, r, levels, kids, spread, shrink, taper, wiggle, droop, plane, seed})`: a branching
  structure (dendrites, roots, blood vessels, airways, tree limbs, rivers) as segments for `branch`. `levels` deep,
  `kids` per split, `spread` degrees, each level `shrink` as long; `plane: [1, 0, 0]` keeps it flat for a `'front'`
  view; `droop` bends branches down (roots) or up (negative). Same `seed`, same tree. Returns `[{pts, r0, r1}]`, which
  you can also write by hand.
- `branch(segments, m, {w})`: draws `tree()` output as one smooth living shape: the branches merge where they join and
  taper to round tips.
- `membrane(points3, {thick, gap, head, m, gaps: [{at, w}], close, tails})`: a cell membrane cut through along a
  route: two rows of round heads with paired tails (a lipid bilayer). `gaps` leave room (at = 0..1 along the route)
  for a `channel`; `close: true` for a whole cell outline. Flat to the viewer: use it in `'front'` view or inside an
  `inset` with `view: 'front'`. Place things on it with `along(points3, at)`.
- `channel(at3, dir3, {h, w, open, m, plug})`: a protein channel or pore through a membrane; `dir3` is the way
  through. `open` 0..1 widens the pore between its two halves; `plug: true` shows a gate while it is closed. Make it
  a little taller than the membrane is thick.
- `helix(a3, b3, {r, turns, strands, wire, m, m2, offset, rungs, pair, seq, letters, seed, split})`: DNA (two
  strands, base-pair rungs, `offset: 150` for its two unequal grooves), or any helix. `seq: 'ATGCGTAC'` sets the pairs
  in order along the first strand (the partner follows the pairing rule; U for RNA); `letters: true` writes the
  bases on; `pair` = the colours of A, T, G, C. Key them with `legend([[colour, 'A (adenine)'], ...])`. Sorts itself
  back to front; `split: true` returns `{back, front}`.
- `molecule(atoms, bonds, {at, scale, r, bond, letters})`: a ball-and-stick molecule. `atoms = [{el: 'O', at:
  [x, y, z]}]` in the source's units (angstroms from a PubChem 3D conformer), placed at `at` and multiplied by
  `scale`; `bonds = [[i, j, order]]`. Atoms take the usual chemistry colours (`ATOMS`); `letters: true` writes each
  symbol on its ball.
- Organs, ready-made and true to anatomy, drawn flat to the viewer like a textbook section (they work in every
  view): `heart(c3, size, {beat, open})`, `brain(c3, size, {lit, gyri})`, `lungs(c3, size, {breath})`,
  `kidney(c3, size)`. size = width in units (default 100). Each returns an object you add as a string (`s += h`)
  that also carries `.pt.name` (3D points for `tag`), `.path.name` (3D routes for `flow` and `along`) and `.names`.
  - heart: the four chambers, septum, the four valves and the great vessels; oxygen-poor blood blue, oxygen-rich red;
    the patient's right on the viewer's left. `beat` 0..1 squeezes the ventricles and moves the valves (or set
    `open: {tricuspid, mitral, pulmonary, aortic}`). pt: rightAtrium leftAtrium rightVentricle leftVentricle septum
    tricuspid mitral pulmonaryValve aorticValve aorta pulmonaryArtery superiorVenaCava inferiorVenaCava
    pulmonaryVeins apex. path: bodyIn rightSide lungsIn leftSide.
  - brain: the left side: four lobes in soft colours, the main sulci, cerebellum and brainstem. `lit: ['frontal',
    'motor', ...]` fills lobes strongly (frontal parietal temporal occipital cerebellum brainstem motor sensory). pt:
    those names plus centralSulcus lateralSulcus spinalCord.
  - lungs: trachea with rings, bronchi branching, three lobes on the right and two on the left with the heart's
    notch, the diaphragm. `breath` 0..1 fills them and lowers the diaphragm. pt: trachea bronchus rightLung leftLung
    upperLobe middleLobe lowerLobe diaphragm cardiacNotch. path: airIn airInLeft.
  - kidney: cut lengthwise: cortex, pyramids, calyces, pelvis, ureter, renal artery and vein. pt: cortex medulla
    pyramid pelvis calyx ureter renalArtery renalVein hilum. path: bloodIn urineOut.
  Colours for your own blood vessels: `BLOOD_LOW`, `BLOOD_HIGH`, `MUSCLE` are materials (`{l, m, d}`): pass them as
  `m`, or use `.m` for one colour; `bloodColour(ox)` gives the colour of blood at oxygen 0..1. Tokens `rbc` and
  `rbcLow` are red blood cells with and without oxygen.
  Call an organ inside `scene()` every frame and take its `.pt` and `.path` from that call: the points follow the
  view, the turn and the zoom, so points saved from another frame (or from outside `scene`) land in the wrong place.
  Organs are cached, so calling them each frame is cheap.
- `arm(shoulder3, {len, bend, flex, side, skin})`: a human arm from the shoulder, flat to the viewer: upper arm, elbow,
  forearm, hand. `bend` = elbow angle in degrees (0 straight down, about 140 fully bent); `flex` 0..1 bulges the
  biceps. `.pt`: shoulder elbow wrist hand fingertip biceps triceps forearm.
- `alveoli(c3, size, {breath})`: the end of an airway, flat to the viewer: a bronchiole into a cluster of air sacs,
  each wrapped in capillaries that run blue on the arteriole side to red on the venule side. `breath` 0..1 inflates
  them. `.pt`: bronchiole duct sac air wall capillary arteriole venule; `.path`: airIn, bloodIn (flow `rbc` along
  it). Use it in a close-up step or an `inset` beside `lungs`; state the scale (an alveolus is about 0.2 mm across).
- `enzyme(c3, size, {open, pocket, m, seed})`: a protein (an enzyme, receptor or transporter) as a soft lumpy shape
  with a pocket facing `pocket` degrees (0 right, 90 up); `open` 0..1 widens it. `.pt`: centre pocket entrance (dock a
  token at `pocket`). Say in `simplified` that the shape is a sketch.
- `ribbon(points3, {helices: [[t0, t1]], sheets: [[t0, t1]], w})`: a protein as a cartoon along its backbone: coils,
  helices as coiled ribbons, strands as arrows. Say in `simplified` it is a cartoon of the fold.
- `skeletal(atoms, bonds, {at, scale, size})`: a flat skeletal formula as chemists draw it, facing the viewer.
  atoms = [{el: 'C', xy: [x, y]}] in bond lengths (from a structure record); carbons are unlabelled corners, other
  atoms written as given ('OH', 'NH2'); bonds = [[i, j, order]].
- With `blob`, `lathe`, `tube`, `inset` and the cell and germ tokens above, these cover organs, cells, membranes,
  nerves, vessels, plants and molecules.

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
count toward the label limit and don't need `parts` text. A legend key can be a token kind, a colour or a material:
`legend([['water', 'Water'], ['#f2c14e', 'A (adenine)'], [MAT.copper, 'Copper wire']])`.

How many labels: 3 to 6 visible at once, so each one can be read; a lesson can name 12 or more in total by lighting
them step by step with `reveal: true`.

`do.at` (where a do step's ring pulses) can be a 3D point, a screen point `[X, Y]` (e.g. from `insetPt`) or a function
of `st` that returns either, for a part that moves: `at: st => arm1.pt.hand`. If it misses the part, the ring moves
onto the part's own shapes.

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
_INSETS _DOPT _LASTLIT _LITNOW _PEOPLE _LASTPEOPLE _covers _place _rng mul3 _axis _rot _perp _smooth3 _RK _LGT
_tubeLayers _INK_DIV tube cable tree branch membrane channel helix coil ATOMS molecule screw screws bolts ticks knob slots
shift _basis latheAx gear gearAt meshAng valve rail carriage pipeline _screenPlane _screenPlane0 _flat _loop _organ _ff
_ell heart brain lungs kidney ribbon skeletal BLOOD_LOW BLOOD_HIGH MUSCLE _noiseFilter flame steam waterSurface stream
beam pool sparks VIEW_AZ _CA _SA PIV VDIR0 _rz setTurn _tw L0 SH0 LIN0 LIN _PINS pulse bloodColour pad flap
_rotAxis chain arm enzyme alveoli upTo belt force incline facesByDepth _ORGANS _organN _memoOrgan _heartDraw _brainDraw
_lungsDraw _kidneyDraw`.

Inside your own functions, don't name a variable after an engine helper either (`on`, `f`, `P`, `S`, `C`, `L`,
`ring`, `line`, `tag`, `fill`, `face`, `shape`, and from v2 `tube`, `coil`, `tree`, `shift`, `ticks`, `knob`,
`gear`, `valve`, `rail`, `heart`, `brain`, `lungs`, `kidney`, `flame`, `steam`, `stream`, `beam`, `pool`, `pulse`,
`pad`, `arm`, `chain`, `belt`, `force`):
`const on = ...` hides the helper and blanks the page (a local name is safe only if that function never calls the
helper).

A note on writing files: some file-writing tools turn `\u2019`-style escapes into the real characters. That is
harmless, but edit scripts that search for the escape will then miss; search for the character instead.

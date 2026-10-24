# Drawing the picture

Read before drawing. Contents: pick the picture, the quality bar, the detail pass, drawing rules. The helper
functions are in api.md. Two subject guides go deeper: machines.md (devices, objects, invented machines for
ideas) and living.md (bodies, cells, plants, molecules, health). Read the one that fits the topic.

## 3. Pick the picture

- **A physical thing** (machine, device, appliance, building system): model the real object, built from its real
  parts, see-through where the working parts are hidden (glass walls, a cutaway window, a clear tube). Follow its
  real proportions and its real process (machines.md).
- **A physical thing stands on the white page**, like a product photo: no table or board under it, just its soft
  `ground` shadow. Use a board only when it carries meaning (the base of a chart, a desk in a scene).
- **An idea** (money, data, a process, a law of nature): build a small scene on a board where something you can see
  stands for the idea and matches it exactly: tower height for an amount (`stack`), tokens moving along arrows for a
  flow (`along`, `arrow3`), boxes or cylinders for stages, a screen or sign for a graph or rule (`onFace`). Heights
  and numbers must be to scale, and the intro says what the pieces stand for.
- **Living things**: the real structure, in soft natural shapes, never boxes: `blob` for cells and organs, `lathe`
  for chambers, bodies and trunks, `tube` for vessels, guts and stems, `tree` + `branch` for anything that branches,
  `membrane` and `channel` for a cell's edge up close, `helix` for DNA, `molecule` for small molecules. Show the
  inside with a cut or see-through shell. Literal by default; a metaphor only when labelled as one (living.md).
- **A mechanism you can't see** (software, an algorithm, a rule, a control loop): invent a real, well-made machine
  whose working is the idea, one to one (machines.md, section 4), or use the patterns below.
- **People**: `person` figures, simple and friendly, coloured by role, with a `bubble` for what they say or think.
  No detailed faces or real people.
- **Mixed scales** (body to cell, wire to electron, city to street): draw the big thing, and the small world inside
  an `inset` magnifier bubble attached to the spot it magnifies. Never shrink cells to dots on an organ.
- **Pick the view** (`view` in `mountLesson`; it never turns, and the learner can zoom and drag):
  - `'iso'` (default): front, left side and top toward the viewer. Objects, machines, scenes.
  - `'front'`: straight at the front, like a textbook cross-section. Layers, the sky and atmosphere, a side view of
    a wave, the inside of a pipe, anything where true heights and depths matter.
  - `'plan'`: straight down. Geometry and proofs (squares stay square, angles stay true), maps, board games, charts
    laid on a table.
- One fixed light.

## 3a. Any topic: pick a pattern

Every subject can be shown; what changes is what the picture stands for. Pick the closest pattern, say in the intro
what the pieces stand for, and list any made-up quantity in `simplified`.

| The topic is... | Show it as | Parts to use |
|---|---|---|
| A machine, device or building system | The real object, built from its real parts, cut open or exploded where it matters | `box cyl latheAx rod pipeline valve gear wheel gauge vessel rail carriage screws knob ticks slots coil cable shift` |
| Fire, heat, water and light (a candle, a burner, a boiling pan, a lamp, a tap) | The real object with the effect itself drawn real: a flickering flame, rising steam, rippling water, a beam and its pool of light | `flame steam waterSurface stream beam pool sparks vessel` |
| A technical or invisible mechanism (a cache, a queue, feedback, a threshold) | An invented machine whose working is the idea, one to one (machines.md, section 4) | `box rod coil knob wheel gauge flow` |
| A living process (organ, plant, body) | The organ or organism in cross-section, soft rounded shapes; chambers as see-through shells. For the heart, brain, lungs and kidney use the ready-made organ and its `.pt` and `.path` | `heart brain lungs kidney blob lathe tube tree branch flow legend fade` |
| Nerves, membranes and signals | The cell drawn whole, and an `inset` (view 'front') on the membrane or synapse with channels and moving ions | `tree branch tube membrane channel inset flow` (example: nerve-signal) |
| DNA, proteins and molecules | The molecule from its structure record, with a legend for colours; the cell around it in an inset or beside it; a protein as a `ribbon`; a formula as `skeletal`. When the 3D shape is the idea, let the learner turn it (`turn: true`) | `helix molecule ribbon skeletal inset legend` |
| Cells, germs and the immune system | The body part, and an `inset` bubble where the cells are big enough to see, as `cell bcell antibody virus bacterium` tokens | `inset blob token flow legend` |
| Invisible particles (chemistry, electricity) | The real apparatus at true size, with particles as tokens far larger than life (or in an `inset`), a legend, and "far larger than real" in `simplified` | `flow legend TOKENS (ion+ ion-, custom draw) vessel inset` |
| Light, sound and waves | The source and the path in `'front'` view; waves as `ripples`; sound with `playNote` and `sound: true` | `ripples curve glow playNote` |
| Earth science | A block diagram (cut slab with layers) or a `'front'` cross-section | `prism box ripples curve` |
| Space and orbits | `'plan'` view looking down on the orbit; bodies lit from the Sun's side; an `inset` for what an observer sees | `litBall inset curve arrow3` (example: moon-phases) |
| Art and drawing technique | A sheet of paper on a board in `'front'` view; the drawing grows one stroke per step; an `inset` for the real scene it shows | `card curve inset` (own projection maths is fine) |
| Geometry and proofs | `'plan'` view, pieces as `prism` tiles the learner moves; numbers on screen | `prism curve onFace txZ` |
| Amounts, money | Objects whose size is the amount (towers, filled tubes), to scale | `stack meter` |
| A relationship between two amounts (supply and demand, speed and time, a law of physics) | A real `graph` standing beside the thing it describes (people, objects that show the same amounts); the learner moves a value and the dot slides along the curve | `graph person stack meter` (example: supply-demand) |
| A process run by people or institutions (laws, elections, a trial) | `person` figures at a few stations close together (`table`s, seated people), the document as a `card` that `hop`s between them, `bubble`s for what they decide, `meter`s for thresholds that are numbers (a majority), never for a standard that isn't one (reasonable doubt) | `person table bubble card hop meter` (example: bill-to-law) |
| History and debated causes | A map or timeline board whose pieces change over the years (drag through time); several explanations side by side with `views` on a step | `prism meter flow views` |
| Feelings, ideas and stories (suspense, motivation, an argument) | A small stage scene with `person` figures, `bubble`s for what they say and think, a `meter` for the feeling | `person bubble meter fade` |
| Language, writing, logic, law text, code | The words themselves on `card`s, changing step by step (highlight, strike out, swap), beside a small scene that acts out what the words mean | `card bubble person` (example: sentence) |
| Pure numbers and rules | Tokens being counted, grouped or rearranged in `'plan'` view | `prism stack flow` |

A meter for something that can't be measured (suspense) is fine if `simplified` says it is a picture of the idea,
not a measurement.

## 3a2. Composition (what makes a picture score high)

Reviewers score the picture by the stranger test: could someone name what happens in each step with the caption
hidden? These choices decide it:
- **Fill the frame.** `check.py` prints how much of the frame the drawing covers; clear lessons cover 20-35%. One
  slender object (a plant) can cover less and still be clear; several small objects with empty space between them
  can't. Put stations and objects close together; cut empty board; make the main object big. A small subject in a big
  empty frame is the most common reason for a low score.
- **One hero per step, big.** Keep `autoZoom: true` so each step glides in on its lit parts, and light 1-3 labels
  per step. If the lit parts are spread out, the step stays wide: then make the change itself big.
- **Every step looks different.** Compare neighbouring steps in the contact sheet at thumbnail size. The change must
  be obvious without the caption: a colour change, something filling or emptying, a part moving, tokens appearing,
  a dot sliding on a graph. If two stills look the same, the step needs a visible change.
- **One scale per view.** Things too small to see at the scene's scale go in an `inset`, never as dots.
- **Real shapes.** A stranger should name each object without labels: rounded shapes for living things, figures for
  people, real words on a card for language, a real chart for a relationship.
- **Show speed and motion in stills** with `trail`, `puffs`, `ripples` or arrows, since a screenshot can't move.
- **Show the consequence, not a mood.** A glow, a highlight or a speech bubble on its own is not a visible change.
  For an abstract step (caring, a reward, a judge's instruction), show what it causes: a meter fills, a person
  turns to look, something appears, a colour changes. Bubbles carry 2-6 words, never the explanation.
- **Text a stranger can read.** Words in the picture (cards, bubbles, chart labels) must be readable in the
  contact sheet's thumbnails. Fewer, bigger words beat many small ones.
- **Furniture and props have shape.** Use `table`, `lathe`, `blob` and tapered `rod`s rather than plain boxes; a
  plain box reads as a block, not a desk.

## 3b. Make it clear (the drawing quality bar)

**Draw like an illustrator.** The default Clear style already shades smoothly from light to dark (round things look
round), softens and blurs shadows, and draws inner lines in a warm grey under a dark outline. Add the touches an
artist would, where they help the eye believe the object:
- Glass: a faint tint, a rim with thickness, and two or three white highlight streaks on the lit side.
- Surfaces with texture (soil, wood, stone): a few dozen small speckles from a seeded `hash`, never random per frame.
- Natural forms taper and branch: stems narrow toward the top (`rod` with a smaller end radius), roots thin out and
  sprout side roots, leaves fold along the midrib so each half catches the light differently, with pale veins.
- Light sources glow: a radial gradient disc, a soft halo and tapered rays (see the sun in `photosynthesis.html`).
- A gradient in a lesson needs a unique id per render: `gid('name')`.
These are finish, not decoration: if a touch hides the mechanism or adds clutter, leave it out.

- **Pure white page.** The page background is always pure white, in every style; only the drawing changes.
- **Realistic colours.** Draw things in the colours they really have, from `MAT`: `whitePlastic`, `blackPlastic`,
  `steel`, `glass`, `copper`, `brass`, `gold`, `silver`, `rubber`, `wood`, `counter`, `paper`, `brick`, `leaf`, `soil`.
  The same colours apply in every drawing style.
- **Bright colours are for teaching only:** red or orange for hot or energy going in, blue for cold or water, arrows
  for movement or flow (dashed and moving while it happens), yellow for the part working right now. Only the thing
  that changes moves.
- **See-through stays see-through.** Realistic colours never cover a glass wall, a cutaway or a clear tube that the
  lesson depends on. If a real material would hide the mechanism, show it through a window.
- **Controls are part of the object.** Switches, buttons, dials and valves are built into the surface they sit on
  (a rocker that tilts in place, a dial that turns in place). Never slide or float a part out of its place to show
  it changed state, and never highlight a part by moving it. Highlight with the yellow outline or the lit label.
- **The working part is the hero.** In each step, the part doing the work is visible, not covered, and big enough to
  read. For a part too tiny for `autoZoom` (3a2), give that step `zoom: {at: [x,y,z], k: 2–2.5}` so the view glides in on it; leave `zoom` out
  when the whole picture matters again. The learner can always zoom back out.
- **Show the inside.** Hidden parts go behind glass, a cutaway window or a see-through panel on a visible face (the
  front `+x`, the left side `+y` or the top).
- **Real, not busy.** Build the subject from its real parts (the detail pass below), and nothing else: no
  decoration, no extra props, no texture fill, no more than 6 labels. Clarity comes from lighting 1-3 parts per step,
  not from leaving the object half built.
- **True proportions and amounts.** Real shapes; in an idea scene, sizes exactly to scale.
- **Labels:** one or two words in sentence case. Light only the ones that matter in this step (placement and `parts`
  rules: Drawing rules below).
- **Moving tokens get a legend, not floating labels.** When small things travel (water drops, gas molecules, sugar,
  money), draw a small legend in empty space that lists only the tokens moving right now, as `photosynthesis.html`
  does. Keep it inside the frame on a 390 px phone.
- **Default style `clear`.** Only set `style: 'sketch'` when the person asks for a hand-drawn look.
- **The stranger test.** For every step's screenshot, write one line saying what a stranger would think is happening
  with the caption hidden. If it doesn't match the caption, fix the drawing (zoom, cutaway, arrow, highlight, less
  clutter), not the caption.

## 3c. The detail pass (machines and living things)

A recognisable subject is what makes a learner trust the picture. Check it with two looks:
- **At 1x:** one clear thing a stranger names at a glance.
- **Zoomed in** (`check.py --step N --crop ...`, or the zoom buttons): every region still has something true to
  find. A bare face or an empty corner is unfinished work. Machines: screws at the corners of plates, seams, bevels,
  label plates, ruler ticks, bushings, connectors, knobs with grip (machines.md, section 2). Living things: veins,
  folds, organelles, valves, branching that thins at every split (living.md, section 5).

Detail scales with the learner (about 15-30 real parts for kids, 30-60 for students, 40-80+ for adults), and every
detail is a real part with a job that ends on an edge. `check.py` notes a machine or living picture with very few
shapes. Ideas (`kind: 'idea'`) keep their scenes simple.

## 3d. Turning (turn: true)

Turning helps only when the 3D shape itself is what the learner must understand: the angles of a molecule, the
twist of DNA, a crystal, a skeleton. Keep the subject at the pivot (default [0, 0, 0]) and fill the picture with it.
Build it from parts that look right from every side (api.md lists them); a flat card, graph, organ or formula stays
facing the viewer as the rest turns. Ask a step to turn it with a `do` ("Turn the molecule to see the angle") so the
learner discovers the control, and say in the intro that they can drag to turn it. Don't use turning for machines
(their printed fronts and cutaways face one way) or for scenes with insets. The video and the printed sheets show
the scene at the angle it has when they are made.

## Drawing rules

- Coordinates: `x` is depth (the front face is at `x = W`, facing viewer-right), `y` is width (+y goes viewer-left),
  `z` is up, and the ground is `z = 0`. Visible faces: `+x` (front), `+y` (left side) and `+z` (top). Use about 1
  unit per cm, but model small objects (a kettle) bigger (60–100 units) so details read.
- Body: one palette `m = {l,m,d}` shaded with `tone(normal, m)`; small props and insides use `toneI`. Materials come
  from `MAT`, plus `CLEAR`, `WATER`, `METAL`, `DARK`, `CERAMIC`, `BOARD`, `WOOD` or `matOf('#hex')`.
- Shapes: `box`, `cyl` (upright, can taper), `cylX` (sticking out of a front face), `rod(a, b, r, m)` (any angle, can
  taper), `loft` between rings (`on(PZ(z), ellUV(...))`) for cups, domes and bottles, `extrude` of an `rrUV` profile
  for rounded bodies (convex profiles only; split C or L shapes), `ball` for spheres and tokens, `stack` for towers of
  coins or blocks, `ground(x, y, z, r, ry)` for the soft shadow under an object standing on the page, and `board`
  only when a board means something. Flat details on a face: `shape(on(PX(x), rectUV(...)), colour)`.
- A part that rotates (a lid, a door, a lever): rotate its 3D points about the hinge line before drawing, as
  `kLid` in `kettle.html` does, and draw whichever side faces the viewer.
- Ink: an outline `hullInk(points, ~2.4)` after each body; details 0.6–1.4. Draw through `pd()` on 3D points;
  `pd(pts, false)` or `line(...)` for open lines. No SVG transforms except text and `onFace`.
- Curves: `pd` (and everything built on it: `shape`, `curve`, `line`, `arrow3`, hulls) draws a smooth curve through
  sampled points and keeps real corners sharp (a turn over 50°, a long straight edge meeting a curve, triangles and
  four-sided faces). So sample a curve evenly (a circle: 16 or more points; a route: points about the same distance
  apart) and give a deliberate corner a clear turn. Never join two pieces of a route with a repeated point and a
  sharp kink; let them meet smoothly.
- Draw back to front (there is no depth buffer): `ground` shadow (or board), then cast shadows (`castShadow(pts, z0, boardTop(...))`,
  one per object, short and touching it), then things seen through openings or glass (far wall, contents, then glass
  tint and 1–2 white streaks), then front faces, parts on the front, nearer objects, outlines and labels (`tag`)
  last. Sort several objects with `byDepth`.
- Glass containers: far wall, then contents, then a light tint. Liquids stay level.
- Doors hinge on the viewer-right edge (y = 0) so the inside swings into view.
- Thin parts stay thin, attached parts visibly join their body, at most 8–18 repeated thin lines, and nothing too
  small to read. Leave clear space on the board between objects.
- Text on the object: `tx` (front), `txY` (side) or `txZ` (flat on the floor; `along` 'x' or '-y'), at least about 2
  units tall. Plain letters, numbers and simple punctuation only; emoji and symbols smear in the Sketch style.
- Fine detail and living shapes: `screw(s)`, `bolts`, `ticks`, `knob`, `slots`, `coil`, `tube`, `cable`, `tree` +
  `branch`, `membrane`, `channel`, `helix`, `molecule`, and `shift` for exploded views; round bodies on any axis
  (`latheAx`), gears, valves, rails and bent pipes; the ready-made organs; effects (api.md, v2 parts). Before
  using one for the first time, `grep` it in `nerve-signal.html` or `parts-gallery.html`.
- Labels: `tag([x,y,z], dx, dy, 'Text')` lights up when the current step lists `'Text'` in `lit`. Point labels out
  into empty space. They must not cover each other, the action, moving parts or printed text at any step. Every label
  text matches a `parts` key exactly, so the label becomes a button that explains the part.
- Clickable parts: wrap them in `act('name', svg)`. Use the same name in a step's `do.part`.
- `teach.js` owns the global names listed under "Reserved names" in api.md; **never declare them again** in a lesson
  (a clash blanks the page). Prefix your own, e.g. `kRing`, `ciX`.


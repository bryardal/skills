# Machines and objects

Read this when the lesson's subject is a physical thing (`kind: 'machine'`): a device, an appliance, an engine, a
tool, an instrument, a building system, a vehicle part. Also read section 4 when the topic is an abstract or
technical idea you will show as an invented machine. The parts are in api.md ("Parts for machines").

Parts made for machines (api.md): `latheAx` (round bodies on any axis), `gear` + `gearAt` + `meshAng` (gear trains
that really mesh), `valve`, `rail` + `carriage`, `pipeline` (bends and flanges), `screws`, `bolts`, `ticks`, `knob`,
`slots`, `coil`, `cable`, `shift`, and the effects `flame`, `steam`, `waterSurface`, `stream`, `beam`, `pool`,
`sparks`.

Contents: 1. the real process, 2. build it like the real thing, 3. physical rules, 4. invent a machine for an idea,
5. exploded views and cutaways, 6. pipes, cables and things that wrap, 7. anti-patterns, 8. close-up check.

## 1. Follow the real process

Before drawing, write the real sequence in the lesson's top comment (and in `facts.md`): each stage, and where every
material, part or amount is after it. Beans in the hopper, then grounds in the grinder's cup, then grounds in the
filter, then water through the bed, then coffee in the server, then coffee in the cup.

- **Things move only along their real path.** Nothing appears somewhere it couldn't get to, and no container is
  skipped. Check every step's picture against the list, not just that the button "did something".
- **Every supply comes from something in the scene.** A refill needs its source drawn and used: water from a tap or
  a jug, coins from a hand or a slot, paper from a roll. If a step adds something, show where it comes from and let
  it travel from there.
- **Every number comes from one model.** Keep one small model in the lesson (a few functions of `st`): the readouts
  (`stats`), the motion and the sandbox all read from it, so the dial, the needle and the caption can never
  disagree. Use real sizes, rates and thresholds from the fact sheet.
- **Out-of-order presses answer sensibly.** In the sandbox, a button pressed too early either runs the missing step
  first or says why not with `ui.note('The tank is empty: fill it first')`. Never leave a control that silently
  ignores a press.

## 2. Build it like the real thing (the detail pass)

A learner believes an object they recognise. Recognition comes from the parts a real one is built from, not from
texture. Two looks decide it:

- **At 1x** it reads as one clear thing: the stranger names it at a glance.
- **Zoomed in** (the learner can zoom to about 2-3x), every region still has something true to find: the screws
  that hold a panel, the seam where two shells meet, the bevel on an edge, the label plate, the ruler on a gauge, the
  bushing a shaft runs in, the connector a cable ends on. A bare face or an empty corner is unfinished work.

How much detail scales with the learner (and never at the cost of the lit part):

| Level | Real parts in the object |
|---|---|
| Kid | about 15-30: the big recognisable pieces, a few screws and seams, chunky controls |
| Student | about 30-60 |
| Adult | about 40-80+, every part that does a job |

Rules that keep detail calm instead of busy:
- **Purposeful, never noise.** Every detail belongs to a part with a job: it sits on another part and ends on an
  edge. No random scratches, no decoration, no texture fill.
- **Structure, not texture.** Density comes from feet, rails, stops, bushings, knobs, screws, hinges and seams.
- **Small and precise.** Bevels and seams thin (0.6-1 line), screws as small heads at the corners of plates
  (`screws`), ticks hanging from a ruler strip (`ticks`), knobs with grip ridges (`knob`), vents as closed slots
  (`slots`), springs that wrap their rod (`coil` with `split`).
- **One thing is lit.** However rich the object, the step lights 1-3 labels and the yellow outline shows the part
  doing the work. Detail sits in the object's own colours; bright colour is for teaching signals only.
- **Lines resolve.** Every line ends on something: a face, another line, a screw. A seam runs edge to edge; a pipe
  ends on a flange or a connector; a cable ends on a plug (`cable` draws the shells).
- **Check it last.** On the contact sheet and one close-up (section 8), find the plain regions and add the real
  parts that are missing there.

## 3. Physical rules (each one came from a picture that looked wrong)

- **Real proportions.** Before modelling, picture the real object and note its key proportions and where parts
  attach: a gooseneck spout leaves the kettle low but its tip rises to about lid height; a jug's handle meets the
  body at two points. Thin parts stay thin (arms, rods, handles, spouts), long parts stay long, nothing is chunkier
  than the real thing.
- **Attached parts visibly join their body.** Both ends of a handle touch, nothing floats beside its body, and
  nothing sits on a face without a reason to be there.
- **Hinges:** doors hinge on the viewer-right edge (y = 0) so the inside swings into view; a flap hinged at the top
  that swings up covers the opening, so hinge it at the bottom or slide it.
- **Seeing inside:** a point (x, y, z) inside appears on the front plane x = W at y' = y + (W - x), z' = z + (W - x).
  Only things whose (y', z') land inside the opening are visible: do this arithmetic when placing contents.
- **Liquids** stay level, even in a tilted container (draw the surface as a horizontal ring). In an open container
  a surface more than about half the radius below the rim is hidden by the front wall: use glass or a cutaway.
- **Glass:** draw the far wall, then the contents, then a light tint and one or two white streaks. Heavy glass over a
  liquid turns it grey. See-through parts cast a lighter shadow (`fade(.45, castShadow(...))`).
- **A stream into an opening** (water into a cup): split it at the rim. The part above the rim draws on top; the part
  inside goes in the receiving container's clip, or it is drawn over the near wall.
- **Motion straight toward the viewer** (air from a fan, water from a hose aimed at you) draws as straight down the
  screen and reads as falling. Turn the object 15-20 degrees so its "forward" is a diagonal.
- **Shadows stay attached.** One shadow per object, short and touching it. A tall thing on a thin support (a lamp
  shade on an arm) casts its base, support and head so the shadows touch. Something lifted in the air (a kettle while
  pouring) gets its shadow at half opacity.
- **Light an object gives off** (a lamp, a screen, a torch): `beam` from the opening to where it lands and `pool` on
  that surface, drawn before the parts in front of them, kept pale.
- **Fire, steam and water are the real thing, not icons.** Use `flame` (with `blue: 1` for a gas burner), `steam`,
  `waterSurface` and `stream`; fade each with its amount so nothing pops on or off.
- **Gears mesh.** Place the second gear with `gearAt` and turn it with `meshAng`, so teeth interlock and the speed
  ratio is the real one; the readout of turns comes from the same tooth counts.
- **Outlines per part.** One `hullInk` over several separate parts draws false straight lines across gaps (pot to
  saucer). Ink each part's hull separately, right after that part, before whatever covers it.
- **One object's ink never crosses another object.** Draw each object completely before anything in front of it.
- **Cones that narrow downward** (a funnel, a dripper) come out almost all in shade with `tone()`: shade them as if
  the wall were upright (use the horizontal part of the normal).
- **Text on a curved surface** only where the surface faces the viewer; elsewhere it shears unreadably.

## 4. An abstract or technical idea: invent the machine

When the topic is a mechanism you can't see (a cache, an algorithm, a market rule, a law of physics, an immune
response), the strongest picture is often a real, well-made object whose working **is** the idea, one to one. Say in
the intro what the machine stands for, and put "This machine is a picture of the idea, not a real device" in
`simplified`.

| Idea | Machine that maps one to one |
|---|---|
| A cache that skips work when nothing changed | A pin-tumbler lock: when every pin matches, the plug turns and nothing is redone |
| Memory with different sizes per kind | A chest of drawers, each as deep as its size |
| A shared resource serving many users | A gantry plotter: one print head visiting every well in turn |
| A filter or sieve in a process | Stacked sieves on a shaker, each mesh finer |
| A feedback loop (thermostat, hormone control) | A float valve in a cistern: the rising float closes the valve |
| A threshold (all-or-none) | A spring-loaded latch that snaps only when pushed past its catch |
| A queue | A gumball chute: first ball in is first ball out |

Two ways this fails: **too abstract** (floating slabs or labelled boxes that read as nothing) and **too flat** (one
big plain slab with a few lines). The fix for both is the same: a recognisable machine built from real parts.
When the idea is a relationship between two amounts, a real `graph` beside the scene is still the clearer choice
(drawing.md, "Any topic").

## 5. Exploded views and cutaways

- **Exploded view:** a `drag` step that pulls an assembly apart along its real axes (`shift(mul3(dir, st.apart *
  k), partSvg)`), each part straight out from where it sits, so the learner sees how it goes together. Move each
  part's label with it. Bring it back together in a later step or the sandbox. This is real movement, not a fake
  highlight.
- **Cutaway:** a window on a visible face (`clipTo` the opening, contents drawn inside, recess walls drawn) or a
  see-through shell. The cut edge is an edge: draw it. Never use dashed hidden lines or see-through wireframes.
- **An open box or tank with parts inside** (a toilet cistern, a fridge, a fuse box): draw the back and the floor
  first, then the parts inside, then the front and near side wall as glass (`fade(.3, box(...))` with its outline
  kept) or leave the front wall off and draw its cut edge. Never draw a solid front wall and the inside parts on top
  of it: they would float in front of the wall. Lift the lid off with `shift` rather than cutting it.
- **Small hero parts:** when the part the lesson is about is small next to the whole (bike cogs next to the wheel),
  keep the true proportions in the overview and give the small part its close-up: a `zoom` on the steps about it,
  or an `inset` bubble that stays on screen. Don't enlarge the part in the main picture.

## 6. Pipes, cables and things that wrap

- A pipe or cable starts and ends on something real: a port with a flange, a connector, a terminal. It never stops
  in the air.
- Route it along the structure, not across the face of the part being taught. Bends are smooth (`pipeline` makes
  real bends and flanges; `tube` and `pipe` round corners); a pipe doesn't kink.
- Nothing passes through anything: no pipe through another pipe or a solid, in any step. Keep about 1.5 radii of
  clear space.
- Few sizes, clearly different: main pipes, feed lines, thin sense lines, cables.
- Things that wrap another part (a spring round a rod, a frame round a carriage) are drawn back half, inside part,
  front half: `coil(..., {split: true})` gives the halves.
- A part that slides out of a sleeve is one part drawn at its position, inside the sleeve's clip.

## 7. Anti-patterns (each one made a picture fail)

- Floating slabs, stacked tiles or labelled boxes standing for parts.
- One big plain face with a few lines on it.
- Blueprint clutter in the picture: leader lines everywhere, numbered balloons, dimension arrows, hatching.
  Labels are the lesson's `tag`s, 3-6 of them, lit one step at a time.
- Lines that stop in mid-air; a texture (ribs, bolt rows, ticks) that stops in the middle of a face instead of on
  an edge.
- Pipes through pipes; cables that end short of their part.
- Colour everywhere: real materials, and bright colour only for teaching signals.
- Real brand logos, product names or trademarked shapes.

## 8. The close-up check

The person who reviews a picture finds faults by zooming in, so zoom in first. After the contact sheet looks right,
take one sharp close-up of the busiest region (joints, a row of screws, glass with contents, a spring on its rod):

`python3 check.py lesson.html --step N --crop x,y,w,h` (fractions of the picture, e.g. `.35,.3,.3,.3`)

Look for: a nearer part drawn behind a farther one, a line crossing an object, a floating piece, a shadow that
doesn't match, a seam or texture that stops mid-face, a part chunkier than the real one. Fix and move on; one
close-up per round is enough.

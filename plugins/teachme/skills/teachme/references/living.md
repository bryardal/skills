# Living things

Read this when the lesson's subject is alive or was (`kind: 'living'`): the body and its organs, cells, germs and
the immune system, nerves and the brain, plants, animals, DNA and molecules of life, medicines and drugs. The parts
are in api.md ("Parts for living things"); the research rules in research.md still apply, with the extra source
rules below.

Contents: 1. show the real structure, 2. literal or metaphor, 3. scale, 4. numbers, 5. drawing living shapes,
6. by topic (nerves and brain, cells and molecules, plants, health and drugs), 7. verify.

## 1. The real structure is the explanation

Draw the structures the topic is about faithfully, then use motion, cutaways, insets and lit labels to show how they
work. A learner who later sees a real heart, leaf or neuron should recognise it from the lesson.

- **Name the context** in the fact sheet and, when it matters, the intro: which organism (human, plant, mouse),
  tissue, cell type and stage. "A motor neuron in the spinal cord", not just "a neuron", when the details depend on it.
- **Keep spatial relationships true:** what is inside what, what connects to what, which side is which (left and
  right of the body as the body sees them, top and bottom of a leaf).
- **Show the direction of every flow** (blood, signals, sap, ions): arrows or moving tokens, consistent through the
  lesson, and never backwards.
- **Distinguish kinds of action:** binding is not opening, opening is not pumping, pumping is not signalling
  downstream. Each gets its own visible change.
- **Don't invent anatomy.** No extra chambers, organelles or branches to fill space. Every labelled part exists and
  is drawn where it really is.

## 2. Literal anatomy or a labelled metaphor

| Mode | Use it for | Rules |
|---|---|---|
| **Literal** (the default) | Organs, tissues, cells, organelles, molecules | Recognisable shape, true relationships, sizes honest to the stated scale |
| **Metaphor** | A process that is easier to grasp as a familiar mechanism: a receptor and its signal as a lock and key, an ion channel as a gated valve, a kidney nephron as a sieve and a sorting line | Say it is a picture of the idea ("Think of it like a lock and key"), keep the real structure on screen beside it or in an inset, and list in `simplified` where the comparison stops working |

A metaphor never replaces the biology and never implies it is literally a machine. If the learner could leave
believing something false ("the heart is a pump with valves made of metal"), add the literal view.

## 3. Scale

Every living lesson sets `scale` (check.py notes a missing one):

- **To scale:** decide how many drawing units stand for one real unit (for example 10 units = 1 micrometre), compute
  every sized part from that number in code, and say it: `scale: 'Drawn to scale: 10 units = 1 micrometre'`. Add
  `unitsPer: 10` and `measure: [{what: 'Red blood cell', a: [...], b: [...], real: 7.5}]` so check.py proves the
  sizes match.
- **Schematic:** when the real sizes can't all fit (a 1 m long axon and a 20 nm synaptic gap), say so:
  `scale: 'Schematic, not to scale: ...'` and name what is drawn bigger.
- **One scale per view.** Something too small to see at the scene's scale goes in an `inset` with its own stated
  scale, attached to where it lives. Never shrink cells to dots on an organ, or ions to specks on a nerve.
- **Size is not importance.** Don't let a drawn size suggest abundance, concentration, strength or clinical
  importance unless it is measured and sourced. Many tokens on screen are "far more than shown" or "far fewer";
  say which in `simplified`.

## 4. Numbers

- Every number the learner sees (a size, a voltage, a speed, a concentration, a rate, a count) traces to a numbered
  fact with its **units and conditions** (species, tissue, temperature, at rest or during activity).
- **Typical, not universal.** Biology varies by species, cell type, person and conditions. Write "about -70 mV in a
  typical neuron", and show a range when sources give one.
- **Don't mix sources silently.** Never combine a number from one species or method with another from a different
  one as if they were measured together. If sources disagree, show the range or leave the number out.
- **Readouts come from one model** (machines.md, section 1): the voltage trace, the meter and the caption all read
  the same values.

## 5. Drawing living shapes

- **Ready-made organs:** `heart`, `brain`, `lungs` and `kidney` are drawn true to anatomy as textbook sections, with
  named points (`.pt`) for labels and routes (`.path`) for blood, air and urine to flow along. Start from them rather
  than drawing your own, and add what the lesson needs around them (an `inset` on an alveolus, a nephron, a valve).
  Smaller ready-made parts: `alveoli` (air sacs wrapped in capillaries), `arm` (a limb that bends at the elbow),
  `enzyme` (a protein with a binding pocket), `helix({seq, letters})` for a real base sequence, and the `rbc` and
  `rbcLow` tokens for red blood cells with and without oxygen. `pulse(st.t, 70)` gives a heartbeat.
- **Soft and natural:** `blob` for cells, organs and nuclei; `lathe` for round chambers, bodies and trunks; `tube`
  for vessels, guts, nerves and stems (tapering with `r1`); `tree` + `branch` for anything that branches (dendrites,
  roots, blood vessels, airways, leaf veins drawn as thin branches); `membrane` and `channel` for a cell's edge seen
  up close; `helix` for DNA; `molecule` for small molecules.
- **Natural forms taper and branch:** stems narrow toward the top, roots thin out and sprout side roots, vessels
  narrow as they divide, dendrites get thinner at every split.
- **The detail pass applies** (drawing.md): at 1x the organ or cell is clear; zoomed in, there is more true detail to
  find (veins on a leaf, folds in a membrane, organelles in a cell, valves in a heart). Detail must be real and
  sourced, never decoration.
- **Cutaways and insets** show the inside: a cut organ with its cut surface drawn, a cell opened to its organelles,
  a magnifier bubble on a patch of membrane.
- **Colour:** natural colours for tissue (`MAT.leaf`, soft pinks and reds for muscle and blood), consistent token
  colours for molecules and ions with a legend, and never colour alone to tell two parts apart (shape or a label too).
- **Living motion:** a beating heart, flowing blood, drifting molecules keep moving between steps (`st.t`), slowly
  enough to follow.

## 6. By topic

### Nerves and the brain
- Show the direction of information: dendrites in, cell body, axon start (the trigger zone), axon, terminals out.
- Don't imply every neuron looks the same or is myelinated. Name the type when it matters.
- An action potential travels along the membrane; in a myelinated axon it jumps from node to node (saltatory
  conduction). Show local ion flow at the membrane, not current running down the middle like a wire.
- At a chemical synapse the signal crosses as released molecules: vesicles, transmitter crossing the gap,
  receptors, then the signal ends (reuptake, breakdown, diffusion). Never draw it as a spark jumping the gap.
- Cite resting potential, threshold, peak and timing, and say they vary by cell type and conditions.

### Cells and molecules
- Say which cell type and organism. Distinguish a structure from a structure record (a PDB or PubChem entry) from a
  schematic cartoon, and say which you drew.
- Molecules: take the structure from a structure record (PubChem gives 3D conformers), place it with `molecule` (or
  `skeletal` for a flat formula), and check the atom count against the molecular formula. When the 3D shape is the
  idea (bond angles, a twist), let the learner turn it (`turn: true`, drawing.md 3d). Proteins: `ribbon`. Proteins are drawn as clearly simplified shapes and labelled
  as such; one shape is not "the" conformation unless the lesson is about that state.
- DNA: two strands with base-pair rungs; keep A with T and G with C (one colour pair each, with a legend).

### Plants
- Light, water, carbon dioxide and sugar travel their real paths (roots up the stem, leaves to the rest of the
  plant). Stomata, veins and roots are drawn where they really are.

### Health, medicine and drugs
- Always set `notice: 'Educational, not medical advice.'` (check.py notes a missing one).
- Show **how it works** (the target, what the molecule does to it, what follows), never advice: no doses,
  schedules, who should take it, or what to start, stop or change.
- Keep affinity, potency, effect and dose apart: binding is not activating; an agonist, a partial agonist and a
  blocker have different effects.
- Use the official product label for anything about approved use, and peer-reviewed or textbook sources for the
  mechanism. Keep animal findings visibly separate from human evidence, and say when human evidence is early or mixed.
- **Drugs of abuse and addiction:** mechanism only (the target and what the drug does to it). No doses, routes,
  purity, preparation or how it feels, and never present use as a goal. Label models of addiction as models, keep
  human and animal work apart, say addiction has many causes, and end the lesson's `simplified` with a pointer to a
  local health service or helpline.
- Disease lessons: what happens in the body, sourced; no diagnosis from symptoms and no treatment choices.

## 7. Verify

- Every label is on the part it names, and that part exists in the real structure (check against the fact sheet).
- The scale line matches what is drawn (if it says "to scale", the sizes were computed from one factor).
- Membranes and outlines don't cross each other unless they really fuse; a channel spans its membrane.
- Every number on screen has a fact number with units and conditions.
- A metaphor is named as one, and `simplified` says where it stops working.
- A passing check is not proof of accuracy: the fact check (research.md) is what makes the biology right.

## Extra sources for living things

Prefer: NCBI Bookshelf textbooks (Purves Neuroscience, Molecular Biology of the Cell, Physiology texts), peer-reviewed
reviews (PubMed), university course pages, NIH institutes, PubChem and the Protein Data Bank for structures, the
official product label (FDA DailyMed, EMA) for medicines, and Kew, RHS or university botany pages for plants. A
number from a source must keep that source's species, tissue and conditions.

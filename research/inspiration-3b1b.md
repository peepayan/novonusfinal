# The 3Blue1Brown / manim Animation Language

Research notes for recreating the *feeling* of Grant Sanderson's math explainers in a
scroll-driven product diagram (GSAP + SVG + React). Facts below were verified against the
manim source trees (3b1b/manim "manimGL" and ManimCommunity/manim "ManimCE"), Grant's own
production config in the 3b1b/videos repo, 3blue1brown.com/about, and manim-to-web
practitioner writeups. Everything else is analysis in our own words.

**The three laws that produce the feeling:**

1. **Nothing appears.** Every object is *constructed* on screen — drawn, grown, or written —
   so the viewer watches it come into being.
2. **Nothing is discarded.** When the topic advances, the old object *morphs into* the new
   one (or exits deliberately). The eye tracks the relationship; this is the object-permanence
   trick that makes explanations feel continuous instead of slide-like.
3. **Nothing moves linearly.** Every discrete move uses a symmetric S-curve ease with dead-flat
   ends (zero velocity *and* zero acceleration at t=0 and t=1). No bounce, no elastic, no
   overshoot — ever. Linear is reserved exclusively for ambient, endless motion (rotating
   vectors, flowing streams, conveyor loops).

Grant's stated design rule, from 3blue1brown.com/about: "Every movement on the screen should
be deliberate, with an identifiable purpose." Motion and narration must reinforce each other,
never compete. And pedagogically: "concrete before abstract" — show the example first, name
it after.

---

## A. The Grammar — 15 named moves

Default timing baseline (verified in source): every manim animation runs **1.0 s** unless
noted, with rate function **`smooth`**. manimGL's `smooth` is the quintic *smootherstep*:

```
smooth(t) = 10t³ − 15t⁴ + 6t⁵        # "equivalent to bezier([0,0,0,1,1,1])"
```

ManimCE's `smooth` is a clamped sigmoid `sigmoid(10·(t−0.5))` — visually the same S-curve.
Peak velocity ≈ 1.9× average, at the midpoint; both ends are perfectly flat.

**GSAP ease mapping (use everywhere):**

```js
// Exact manim ease — register once, use as ease: "manimSmooth"
gsap.registerEase("manimSmooth", t => t * t * t * (t * (6 * t - 15) + 10));
```

Nearest stock eases if you must: `power1.inOut` (same peak speed, slightly harder shoulders);
`power2.inOut` for long travels where you want extra decisiveness. Other manim rate functions:
`there_and_back` → tween with `yoyo: true, repeat: 1` at half duration; `rush_from`
(fast start, soft landing) ≈ `power2.out`; `rush_into` ≈ `power2.in`; `double_smooth`
(two chained S-curves) → a 2-phase timeline; `linear` → ambient loops only.

Unit conversion for all recipes: manim's frame is **8 units tall**; at 1080p **1 unit = 135 px**.
Standard spacing buffs: SMALL 0.1 / MED_SMALL 0.25 / MED_LARGE 0.5 / LARGE 1.0 units
(≈ 13 / 34 / 67 / 135 px). A typical FadeIn shift of 0.5–1 unit ≈ 67–135 px at video scale;
at web component scale use 24–48 px.

---

### 1. Draw-on `(Create / Uncreate)`

- **What:** A stroke traces the path from its start point to its end, like a pen. On a
  multi-part object, parts draw *sequentially* (Create's `lag_ratio` is 1.0 — one sub-path
  finishes before the next starts).
- **Defaults:** 1 s, smooth. Uncreate is the same reversed.
- **3b1b use:** Introducing any structural line-work — axes, curves, boxes, diagrams. This is
  the bread-and-butter entrance; it says "watch this being built."
- **Recipe:** stroke-dashoffset. `const L = path.getTotalLength();` then
  `gsap.fromTo(path, {strokeDasharray: L, strokeDashoffset: L}, {strokeDashoffset: 0, duration: 1, ease: "manimSmooth"})`
  — or DrawSVGPlugin (`drawSVG: "0% 100%"`), free since April 2025. For multi-segment
  figures, sequence the segments (`stagger` with `each` ≈ segment duration, i.e. no overlap)
  to match Create's sequential feel.

### 2. Border-then-fill `(DrawBorderThenFill)`

- **What:** Two phases: the outline draws on as a thin stroke (stroke_width 2 during the draw),
  then the stroke relaxes to final weight while the fill fades in.
- **Defaults:** **2 s** total, rate `double_smooth` (an S-curve per phase, 50/50 split).
- **3b1b use:** Any filled shape — blobs, areas under curves, solid arrows, icons. Filled
  things never pop in; they are drawn as wireframe first, then "inked."
- **Recipe:** timeline: phase 1 dashoffset draw at `stroke-width: 2` and `fill-opacity: 0`;
  phase 2 tween `stroke-width` to final (e.g. 4) and `fill-opacity` to target (see fills in
  §B — usually 0.2–0.5, not 1). Each phase `ease: "manimSmooth"`, 1 s each.

### 3. Write-on `(Write / AddTextLetterByLetter)`

- **What:** Handwriting for text/equations: each glyph runs its own border-then-fill, with the
  glyphs heavily overlapped (a wave of writing sweeps across the word).
- **Defaults (verified):** run_time **1 s if < 15 glyph sub-paths, else 2 s**; stagger
  `lag_ratio = min(4/n_glyphs, 0.2)`; the *envelope* is linear while each glyph's own draw is
  eased — the wave moves at constant speed, each letter lands softly. `AddTextLetterByLetter`
  is the cheap variant: 0.1 s per character, linear.
- **3b1b use:** Titles, labels, every equation. Text is never faded in when it's the point;
  it's written.
- **Recipe:** Real glyph outlines need text-as-paths (export from design tool, or opentype.js).
  Then per-glyph dashoffset draw + fill fade, `stagger: {each: 0.05–0.1}`. Pragmatic cheat for
  UI labels: SplitText (now free) chars with a 0.02–0.04 s stagger of
  `{opacity: 0→1, y: 6→0}` plus a one-off underline draw — reads as "written" at small sizes.

### 4. Fade-shift `(FadeIn / FadeOut with shift & scale)`

- **What:** Opacity fade combined with a small directional slide (and optionally a scale from
  ~0.8). FadeOut slides *away* in the given direction. Pure in-place fades exist but 3b1b
  usually adds the shift — direction implies meaning (new idea rises in; discarded idea sinks
  out).
- **Defaults:** 1 s, smooth; shift defaults to none, typical authored value 0.5–1 unit.
- **3b1b use:** Secondary/supporting elements — captions, side remarks, things not worth a
  full draw-on. Also the polite exit for anything that won't morph.
- **Recipe:** `gsap.from(el, {opacity: 0, y: 32, duration: 1, ease: "manimSmooth"})`;
  exits `{opacity: 0, y: -32}`. Keep shifts small (24–48 px) — manim's shifts are subtle.

### 5. Morph-carry `(Transform / ReplacementTransform)`

- **What:** THE signature move. Object A's points interpolate into object B's shape, color and
  position. The viewer never loses the thread: the equation *becomes* the graph, the square
  *becomes* the circle. Optionally along an arc (`path_arc`) so the morph rotates gracefully
  rather than crossing through itself.
- **Defaults:** 1 s, smooth, straight-line point interpolation (arc when authored).
- **3b1b use:** Any time two successive ideas are related. This is "transforms over cuts":
  where a slide deck would cut, manim morphs. It is the single biggest contributor to the
  feeling.
- **Recipe:** MorphSVGPlugin (`gsap.to("#a", {morphSVG: "#b", duration: 1, ease: "manimSmooth"})`)
  — it resamples point counts for you; flubber is the no-GSAP alternative. Keep stroke
  width/opacity constant through the morph; tween position along a slight curve
  (MotionPathPlugin with a 1-control-point path) to fake `path_arc`. Design shapes with
  compatible topology (one path each) wherever a morph is planned.

### 6. Match-morph `(TransformMatchingShapes / TransformMatchingTex)`

- **What:** Structured morph for composite objects: sub-parts that exist in both states glide
  to their new positions (a per-part Transform); parts only in the source FadeOut toward the
  newcomers; parts only in the target FadeIn. In equations this is the "terms rearrange
  themselves" effect.
- **Defaults:** matching by normalized shape hash (or tex string); mismatches fade by default.
- **3b1b use:** Algebra steps, re-layouts, regrouping a diagram — anywhere most of the content
  survives but the arrangement changes.
- **Recipe:** This is FLIP. Give sub-elements stable `data-key`s across the two states; use
  GSAP's Flip plugin (`Flip.getState` → swap layout → `Flip.from(state, {duration: 1, ease: "manimSmooth"})`);
  fade unmatched-out with a small shift toward the new group's centroid, fade unmatched-in
  from it. For pure-SVG scenes, tween x/y/transform of matched nodes manually.

### 7. Grow-arrow `(GrowArrow / GrowFromPoint)`

- **What:** An arrow scales up from its **tail** point along its own direction — it *shoots*
  toward its target rather than materializing. GrowFromPoint generalizes to any origin.
- **Defaults:** 1 s, smooth.
- **3b1b use:** Vectors, "this maps to that" connectors, annotations pointing at things. The
  grow direction itself carries meaning (cause → effect).
- **Recipe:** group shaft+head, set `transformOrigin` at the tail coordinate, scale 0→1. Or,
  richer: dashoffset-draw the shaft over 0–80% of the duration and pop the head with a fast
  scale from the shaft tip over the last 20%. Never ease-out-back — no overshoot.

### 8. Grow-pop `(GrowFromCenter / SpinInFromNothing)`

- **What:** Object scales 0→1 from its center. The spin variant adds a rotation on the way in
  (used sparingly, for playfulness).
- **Defaults:** 1 s, smooth.
- **3b1b use:** Dots, points of interest, small badges — things whose *location* matters more
  than their construction.
- **Recipe:** `gsap.from(el, {scale: 0, transformOrigin: "50% 50%", duration: 0.6–1, ease: "manimSmooth"})`.
  Resist `back.out`; the manim look is a clean S, arriving with zero velocity.

### 9. Lagged-build `(LaggedStart / LaggedStartMap)`

- **What:** A family of elements runs the same entrance with a cascading offset. manim's
  `lag_ratio` = fraction of one child's duration that elapses before the next starts.
- **Defaults (verified):** LaggedStart `lag_ratio = 0.05` (near-simultaneous ripple);
  authored values in 3b1b scenes commonly 0.1–0.5 for legible cascades. Plain AnimationGroup
  is 0 (simultaneous); Succession is 1.0 (strictly sequential).
- **3b1b use:** Lists, grids of samples, tick marks, groups of arrows — "here are many of the
  same kind of thing." The cascade communicates family membership.
- **Recipe:** `stagger: {each: childDuration * lagRatio, ease: "power1.in"}` — e.g. 1 s
  children with lag 0.15 → `each: 0.15`. For big collections keep total ≤ 2 s by shrinking
  `each`, exactly as manim squeezes run_time.

### 10. Indicate-pulse `(Indicate; variant Wiggle)`

- **What:** Attention without addition: the object scales to **1.2×** and tints **yellow**,
  then returns. Rate is `there_and_back` (smooth out, smooth back). Wiggle is the comic
  cousin: scale 1.1 plus a ±3.6° rotation oscillation, 6 wiggles over 2 s.
- **Defaults (verified):** Indicate: 1 s, scale 1.2, color PURE_YELLOW, there_and_back.
  Wiggle: 2 s, scale 1.1, rotation 0.01·TAU, n=6.
- **3b1b use:** "*This* term. Look at *this*." — synced to a stressed word in narration.
  Never decorative; one pulse per verbal stress.
- **Recipe:** `gsap.to(el, {scale: 1.2, stroke: ACCENT, duration: 0.5, yoyo: true, repeat: 1, ease: "sine.inOut", transformOrigin: "50% 50%"})`.
  On scroll, fire via ScrollTrigger `toggleActions` at a waypoint rather than scrubbing it
  (a scrubbed pulse can freeze mid-bulge — ugly).

### 11. Circumscribe-underline `(Circumscribe / Underline / SurroundingRectangle)`

- **What:** A yellow rectangle (or ellipse) *draws itself* around the target, as a moving
  sliver of stroke — by default the head of the line chases the tail (time_width 0.3 ≈ only
  30% of the perimeter visible at once), so it reads as a pen circling the object; optional
  fade-out instead. Underline is the static cousin: a line draws under text.
- **Defaults (verified):** 1 s, PURE_YELLOW, buff SMALL (0.1 u ≈ 13 px), Rectangle shape,
  time_width 0.3, fade_out False.
- **3b1b use:** Marking a sub-expression or region *while talking about it*, then releasing.
- **Recipe:** rounded rect at bbox+10 px, stroke-only. Sliding-window draw with DrawSVG:
  `gsap.fromTo(rect, {drawSVG: "0% 30%"}, {drawSVG: "70% 100%", duration: 1, ease: "manimSmooth"})`
  then fade out. Underline: line under the text, `scaleX: 0→1, transformOrigin: "left center"`,
  0.4–0.6 s.

### 12. Flash-radiate `(Flash)`

- **What:** 12 short line segments (length 0.2 u) burst radially from a point and vanish —
  a spark marking "this exact spot, this exact moment."
- **Defaults (verified):** 1 s, PURE_YELLOW, num_lines 12, line_length 0.2 u (~27 px),
  flash_radius 0.1 u.
- **3b1b use:** The instant something *happens*: an intersection appears, a value hits zero,
  a click. Punctuation, not decoration.
- **Recipe:** pre-build 12 line elements around the point; each draws outward
  (dashoffset 0→100%) then fades, `stagger: {each: 0.02}`, total ≈ 0.6 s. Event-triggered
  (`toggleActions: "play none none reverse"`), never scrubbed.

### 13. Passing-pulse `(ShowPassingFlash)`

- **What:** A short bright window of stroke travels along a path and disappears — energy
  flowing down a wire. time_width 0.1 = the visible sliver is 10% of the path.
- **Defaults:** inherits 1 s; typically run on a brighter/thicker copy of an existing path.
- **3b1b use:** Re-emphasizing an existing curve without redrawing it; showing flow/direction
  through a diagram. Perfect for pipelines.
- **Recipe:** duplicate the path, accent stroke, wider by 1–2 px:
  `gsap.fromTo(copy, {drawSVG: "0% 10%"}, {drawSVG: "90% 100%", duration: 1, ease: "manimSmooth"})`
  with opacity in/out ramps. Loop it (`repeat: -1, repeatDelay: 1`) for ambient "the system is
  live" texture.

### 14. Trace-path `(MoveAlongPath + TracedPath + updaters, ValueTracker count-ups)`

- **What:** A dot travels a path; an updater draws the trail behind it; other updaters keep
  labels/arrows/numbers attached and live. Numbers roll via ValueTracker + DecimalNumber.
  This is manim's "everything is a function of t" machinery.
- **Defaults:** authored duration; motion eased with smooth unless it's ambient (then linear).
- **3b1b use:** Parametric motion, sampling a curve, a point exploring a space while a readout
  updates. The trail + live-readout combo is a strong "measurement happening" signal.
- **Recipe:** MotionPathPlugin for the dot (`motionPath: {path, align, autoRotate}`); the trail
  is the same path with dashoffset revealed by the same progress value (one tween driving
  both via `onUpdate` or a shared timeline). Counters:
  `gsap.to(state, {value: 128, snap: {value: 1}, onUpdate: () => el.textContent = state.value})`.

### 15. Focus-dim `(FocusOn + dim-the-rest + camera frame moves)`

- **What:** Attention by subtraction: everything except the current idea drops to ~20%
  opacity (FocusOn's spotlight uses opacity 0.2, GREY, over 2 s), and/or the camera frame
  itself glides and zooms to reframe the one thing that matters. manimGL treats the camera as
  just another object animated with smooth.
- **3b1b use:** "One idea on screen": before a detailed aside, the rest of the scene recedes;
  the camera leans into the region under discussion, then pulls back for context. Zooms are
  rare and always meaningful.
- **Recipe:** dim: `gsap.to(".stage .obj:not(.focus)", {opacity: 0.2, duration: 0.8, ease: "manimSmooth"})`.
  Camera: tween the SVG `viewBox` — `gsap.to(svg, {attr: {viewBox: "x y w h"}, duration: 1.2, ease: "manimSmooth"})`
  — this is the exact web equivalent of manim's frame; it scales strokes with the zoom just
  like manim does. Pull focus maximum once or twice per act.

**Pacing note (the invisible 16th move):** manim scenes are full of `self.wait()` — a second
or two of stillness after every beat. Roughly a third of a 3b1b video is nothing moving.
Build the pauses in; they are what make the moves land.

---

## B. The Visual System

### Background

| Context | Value |
|---|---|
| ManimCE default | `#000000` |
| manimGL out-of-the-box default | `#333333` |
| **Grant's actual production config** (3b1b/videos `custom_config.yml`) | **`#000000`**, with camera saturation boosted 1.5× |
| The "classic 3b1b charcoal" as perceived (early era / GREY_E) | `#222222` |

Recommendation for web: a near-black in the `#0e0e11`–`#1a1a1a` band. Pure `#000` works for a
cinematic pinned stage; `#161616`-ish is friendlier when the diagram sits inside a page. The
crucial part is *dark ground, luminous strokes* — the whole grammar reads as light being
added to darkness.

### Palette (hex values from manim source — identical in GL and CE except yellow)

Each hue is a 5-step ramp, **E (dark) → A (light)**. The `_C` middle step is the workhorse and
is what the bare name aliases to.

| Role | E | D | **C (default)** | B | A |
|---|---|---|---|---|---|
| BLUE | `#1C758A`* | `#29ABCA` | **`#58C4DD`** | `#9CDCEB` | `#C7E9F1` |
| TEAL | `#49A88F` | `#55C1A7` | **`#5CD0B3`** | `#76DDC0` | `#ACEAD7` |
| GREEN | `#699C52` | `#77B05D` | **`#83C167`** | `#A6CF8C` | `#C9E2AE` |
| YELLOW | `#E8C11C` | `#F4D345` | **`#FFFF00`** (GL) / `#F7D96F` (CE) | `#FFEA94` | `#FFF1B6` |
| GOLD | `#C78D46` | `#E1A158` | **`#F0AC5F`** | `#F9B775` | `#F7C797` |
| RED | `#CF5044` | `#E65A4C` | **`#FC6255`** | `#FF8080` | `#F7A1A3` |
| MAROON | `#94424F` | `#A24D61` | **`#C55F73`** | `#EC92AB` | `#ECABC1` |
| PURPLE | `#644172` | `#715582` | **`#9A72AC`** | `#B189C6` | `#CAA3E8` |
| GREY | `#222222` | `#444444` | `#888888` | `#BBBBBB` | `#DDDDDD` |

Singles: WHITE `#FFFFFF` · BLACK `#000000` · ORANGE `#FF862F` · PINK `#D147BD` ·
LIGHT_PINK `#DC75CD` · GREY_BROWN `#736357`. (*CE's BLUE_E is `#236B8E`.)

### How color is used (the semantic rules — more important than the hexes)

- **White = structure.** Axes, boxes, connective tissue, body text. Default stroke color in
  manimGL is GREY_A `#DDDDDD`; headline objects get pure white.
- **One hue = one concept, for the whole piece.** A vector introduced in BLUE stays BLUE in
  every later scene; color is *identity*. Two related concepts get related hues
  (BLUE vs TEAL), opposed concepts get opposed hues (RED vs GREEN, e.g. negative/positive,
  fail/pass).
- **Yellow is reserved for transient emphasis.** Indicate, Flash, Circumscribe, underlines —
  yellow is the voice saying "here." It is almost never an object's identity color, which is
  what keeps the highlight legible.
- **Ramps do depth:** `_E` steps for filled areas and de-emphasized copies, `_C` for live
  strokes, `_A/_B` for glints and highlights on top.
- **Fills are translucent, strokes are opaque.** VMobjects default to fill_opacity ~0.5 or
  stroke-only; the "glass shapes with bright wireframes" look lets the grid and layered
  objects read through each other.

### Line, text, glow

- **Stroke width: default 4** (both engines) ≈ 4 px at 1080p. Practical web scale on a
  ~1000 px stage: 1.5–2 px for grids/ghosts, **3–4 px primary strokes**, 6–8 px for the one
  hero stroke. During Border-then-fill the drawing stroke is 2.
- **Text:** Grant's production font is **CMU Serif** (the LaTeX face), white, centered — the
  math-textbook voice is part of the brand. For Novonus, keep our own voice: Inter Tight for
  labels/headings (project rule — never Kode Mono). Adopt the *treatment*, not the font:
  white text on dark, generous margins (edge buffer ~0.5 u ≈ 67 px), labels small and few.
- **Glow:** modern 3b1b uses glow-dots and boosted saturation on black. Web equivalent: a
  blurred duplicate underneath (`feGaussianBlur` stdDeviation 3–6 at 30–50% opacity) or a
  radial-gradient halo circle — apply only to the accent element, and prefer static glow
  (animating blur is expensive).

---

## C. Narration Sync → Scroll-Scrub

### How the sync works in the videos

The manim script *is* the storyboard: one `self.play(...)` per spoken clause, then
`self.wait()` while the sentence finishes. The discipline that results:

- **Build-as-you-narrate.** An element enters at the moment it is first spoken, not before.
  Nothing on screen is unexplained; nothing explained is invisible.
- **One move cluster per sentence.** A sentence gets one coordinated `play` (possibly an
  AnimationGroup with lags), then stillness. Attention pulses (Indicate/Flash) land on the
  stressed word.
- **Breathing.** After each beat, a genuine pause. The viewer's eye settles before the next
  move begins.
- Motion Canvas (built by a motion designer explicitly to get this workflow on the web)
  formalizes it as *time events*: named `waitUntil` markers dragged against the voiceover
  waveform in an editor — timing lives with the audio, animation code stays declarative.
  It also demonstrates the web-native shift: animate *properties* (x, scale, dash) rather
  than whole-object states, which is exactly GSAP's model.

### Translating to scroll (the narration is now the user's reading)

Treat each on-screen sentence of copy as a "spoken" clause; scroll position is the playhead.

1. **Pin one stage.** A single pinned SVG for the whole diagram
   (`ScrollTrigger: pin, scrub: 1`). One master timeline; the ~1 s catch-up smoothing of
   `scrub: 1` restores some of the eased feel even mid-scrub. Keep `ease: "manimSmooth"` on
   tweens anyway for slow scrollers.
2. **Label per sentence.** `tl.addLabel("a2s1")` etc. Each sentence owns a **move cluster
   (55–70% of its segment) followed by a dead zone (30–45%)** — spacer tweens
   (`.to({}, {duration: n})`) are the `self.wait()` equivalent. The caption for the sentence
   fade-shifts in at the head of its cluster; keystone moves align with it.
3. **Budget.** ≈ 1 s of "manim time" per 250–400 px of scroll. An act of 4–5 sentences ≈
   120–150 vh. Five acts ≈ 600–700 vh total. Optional `snap: {snapTo: "labelsDirectional"}`
   to settle between sentences.
4. **Reverse-safety.** Scrub runs backwards. Draws, morphs, fades and grows all read
   perfectly in reverse (Uncreate/Unwrite are literally this). But fire-and-forget effects —
   Flash, Indicate, glow pops — should be *waypoint-triggered*
   (`toggleActions: "play none none reverse"`), not scrubbed, so they never freeze mid-pulse.
5. **Ambient layer runs on rAF, not scroll.** The conveyor/pulse loops (`repeat: -1, ease: "none"`)
   live outside the scrubbed timeline — the world keeps breathing when the user stops.
6. **Performance:** animate only `transform`, `opacity`, `stroke-dasharray/offset`, and
   `viewBox`; pre-flatten morph pairs to single paths; one `will-change` layer for the pinned
   stage; avoid per-frame filters.

---

## D. Storyboard — "Novonus pipeline" in the 3b1b grammar

Five acts, one pinned SVG stage, ~650 vh. **Every act transforms out of the previous act's
ending state — nothing is ever deleted, only morphed, dimmed, or parked.**

**Palette mapping (semantic roles → Novonus):** ground = near-black `#111114`; structure =
white/`#DDDDDD` strokes at width 3–4; **identity hue for "the skill" = brand purple**
(`#6d28d9`, brightened toward `#8b5cf6` on dark); **the accent role (manim-yellow's job:
"the current idea") = turquoise `#5eead4`** — closest to manim TEAL, high luminance on black;
pass/fail = manim GREEN `#83C167` / RED `#FC6255`; ghosts and history = GREY `#444`–`#888`.
Exactly **one element per act carries the accent.** Labels: Inter Tight, white, sparse.

**The unifying conceit:** the conveyor dot-stream under the bench is the only *linear*
animation in the piece, it starts in Act 1 at "the line never stops," and it **never stops** —
running (dimmed to 25%) beneath Acts 2–4 and returning to full strength in Act 5. Everything
else obeys smootherstep.

### Persistent cast & morph lineage

| Element | Born in | Morphs into / carried as |
|---|---|---|
| Bench + sensor rig | A1 draw-on | dims A2–A3 → returns as deployment workcell A4–A5 |
| Hand-path curve | A1 trace-path | → demo-trace stack (A2) → library cards (A3) → robot end-effector motion path (A4) |
| Force waveform (signature) | A1 draw-on, **accent** | → training gate template (A2) → verification overlay (A3) |
| Demo-trace stack | A2 lagged copies | → converges into skill block (A2); residue → library (A3) |
| Skill block | A2 (born by morph) | the protagonist; travels A3 gate → A4 cloud → edge chip → A5 retrain loop |
| Robot+gripper glyph | A2 draw-on | → scales up into full robot-arm polyline (A4–A5) |
| Check tally | A3 draw-ons, **accent** | → version chip "v1.0" (A4) → rolls v1.1 / back (A5) |
| Conveyor dot-stream | A1, linear loop | never stops; carries varying part silhouettes in A5 |
| Cloud outline | A4 draw-on | persists; target of the A5 retrain loop arrow |
| Loop arrows | A5, **accent** | close the whole diagram into a cycle at the coda |

---

### Act 1 — Demonstrate (~130 vh)

*Elements: bench (h-line + legs), sensor rig (arc + 3 camera nodes), hand glyph (5-dot finger
skeleton), hand-path curve, force arrows, waveform strip, conveyor dots.*
**Accent carrier: the force waveform** — it is the data the entire pipeline exists for.

| Sentence | Beats (draw order) |
|---|---|
| "A worker performs the task by hand, in a sensor rig at a bench." | Bench **draw-on** (1 s eq). Rig **border-then-fill**; camera nodes **grow-pop**, lag 0.15. Hand glyph **grow-pop** above bench. Then the performance: hand runs the task — **trace-path** dot cluster travels, leaving the hand-path curve behind it (2 s eq). |
| "Motion, finger pose, and force — captured." | Three-channel **lagged-build**, one per word: *motion* = **passing-pulse** sweeps the freshly drawn hand-path; *finger pose* = skeleton re-poses at 3 stations with a **flash-radiate** at each sample; *force* = **grow-arrows** normal to the path at contact points, while the waveform **draws on** left→right in the bottom strip (accent, glow halo). Waveform gets an **underline** as the caption lands. |
| "The line never stops." | Conveyor dots begin their **linear** march under the bench (`repeat: -1, ease: "none"`, rAF-driven). One **indicate-pulse** on the stream (waypoint-triggered). Then stillness — a long dead zone. |

**Ending state:** bench + rig + hand-path + accent waveform + marching dots.

### Act 2 — Train (~130 vh)

*New elements: demo-trace stack, skill block (rounded rect, purple identity), robot+gripper
glyph, input stream + gate.* **Accent carrier: the signature waveform as gate template**
(same object from Act 1 — moved, never re-created).

| Sentence | Beats |
|---|---|
| "Demonstrations become a force-aware skill — for a specific robot and gripper." | Bench/rig **fade-shift** down to 25% (focus-dim; conveyor keeps running, dimmed). Hand-path **lagged-build** replicates into a fanned stack of 8 ghost traces (greys) — *demonstrations, plural*. On "become": the marquee **morph-carry** — the stack converges and braids into the **skill block** (match-morph: traces become the block's inner curve glyph; block **border-then-fills** in purple; label writes on, Inter Tight). On "specific robot and gripper": gripper glyph **draw-on** at the block's edge, docking pin **grow-arrow**, then **circumscribe** around block+gripper as a pair. |
| "Trained only on data matching the worker's real force signature." | The Act-1 waveform **morph-carries** upward, scaling into a gate template above an input lane. **Lagged-build** stream of small waveform chips approaches the gate. Matching chips (accent stroke) pass through with a **passing-pulse** into the block; mismatched grey chips stop — small **cross draw-on** (RED) + **fade-shift** down. Repeat 3–4 chips with lag 0.3. |

**Ending state:** purple skill block + gripper, gate + signature template, ghost stack residue.

### Act 3 — Verify (~120 vh)

*New elements: library cards, comparison overlay, check/cross marks, exit gate.*
**Accent carrier: the check marks / tally.**

| Sentence | Beats |
|---|---|
| "The skill is proven against the library of real demonstrations." | Block glides left (**morph-carry** of position, slight arc). Ghost stack **match-morphs** into a right-hand column of thin cards — *the library* (each card keeps a mini-trace; FLIP with stable keys). Test loop ×3, **lagged**: card slides to block → both mini-waveforms overlay with simultaneous **passing-pulses** (the comparison) → **check draw-on** (0.4 s eq, accent, GREEN-tinted) appends to a tally under the block. Iteration 3 fails: **cross draw-on** (RED) + **wiggle** on the card → card **fade-shifts** out, down. |
| "Only passing skills make it out." | Exit gate **draw-on** at stage right. Block + tally passes through with an **indicate-pulse** at the threshold. A dimmed ghost block (no tally) halts at the gate — **flash-radiate** on its RED cross. **Focus-dim** everything but the emerging block. |

**Ending state:** verified block (tally attached) beyond the gate; dimmed library behind.

### Act 4 — Deploy (~140 vh)

*New elements: cloud outline + shelf, connection wire, edge chip, full robot arm polyline,
program bar, weeks→hours ruler.* **Accent carrier: the traveling skill copy / the "hard part"
segment of the program bar.**

| Sentence | Beats |
|---|---|
| "The skill lands in a cloud library — versioned." | Cloud **draw-on**, top center. Block flies up into it (**morph-carry** with arc, scaling down). The tally **match-morphs into a version chip "v1.0"** snapped to the block (count-up sets the number). Older siblings (v0.9, greyed) **fade-shift** in on the cloud shelf — a library, not a file. |
| "It pushes to an edge device beside the robot." | Wire **draws on** from cloud down to stage floor. Edge chip **border-then-fills** (rounded square + pin stubs). The bench **fade-shifts back** from Act 1 as the workcell; the gripper glyph **morph-carries** up into the full robot-arm polyline (scale + unfold — same object, bigger role). A copy of the block departs the cloud and **trace-paths** down the wire wrapped in a **passing-pulse** (accent), landing on the chip with a single waypoint **flash-radiate**. |
| "It runs on-site. The robot's program calls the skill for the hard part — and hands back." | Program bar **draws on** under the arm: segmented timeline, white. Playhead runs (trace-path). At the accent-colored *hard part* segment: **grow-arrow** up from bar to the edge block, **passing-pulse** along it (the call); the arm's end-effector runs a tight curve — **the hand-path shape from Act 1, re-played by the robot** (deepest morph-carry in the piece); return **grow-arrow** hands control back; playhead continues to the end. |
| "Hours, not weeks." | Side ruler: long "weeks" bar **match-morphs** into a short "hours" bar while a counter rolls down (count-up in reverse). **Indicate-pulse** on "hours" label (waypoint). Long pause. |

**Ending state:** full workcell (bench, arm, edge chip + skill v1.0), cloud above, wire between.

### Act 5 — Adapt (~140 vh)

*New elements: varying part silhouettes, independent inspector glyph (eye/gauge), control
chart (drift band + dots), moon tick, retrain loop arrow, human glyph, rollback arrow,
one-click button dot.* **Accent carrier: the retrain loop arrow** — adaptation is the closing
idea.

| Sentence | Beats |
|---|---|
| "Parts vary." | The conveyor (still running since Act 1) brightens to full. Its dots **morph-carry** into small part silhouettes, each a slightly different polygon (successive micro-morphs as they pass the gripper) — variation made visible. |
| "Every cycle is checked by an independent success test." | Inspector glyph **draw-on** above the line — deliberately white and *detached* from the purple skill block (independence encoded spatially and chromatically). Per cycle, **lagged**: mini **check draw-on** over each part; checks stream into a control chart **border-then-filling** bottom-right — dots accumulating inside a tolerance band. |
| "Drift means an overnight retrain." | Chart dots trend toward the band edge (**trace-path** of positions, colors sliding GREEN→GOLD). One crosses: **circumscribe** alarm on the chart (RED-tinted, waypoint). Stage dims one shade; moon tick **grow-pops** (night). The **retrain loop arrow draws on** (accent, glow): a long arc from chart back up to the cloud — a **passing-pulse** cycles along it; in the cloud, the version chip **rolls v1.0 → v1.1** (count-up) and the fresh copy re-runs the Act-4 push down the wire, fast (0.5× duration — the pipeline is now routine). |
| "A human approves." | Human glyph (head + shoulders) **grow-pops** beside the loop, at the gate before the deploy leg. Approval **check draws on** next to it; only then does the loop's deploy pulse pass — the arrow visibly waits (its pulse holds at the gate through a dead zone until this beat). |
| "One-click rollback." | A single button dot **indicate-pulses** once (one click). A short reverse arrow **draws counter-clockwise**; version chip **rolls back v1.1 → v1.0** in one beat; the edge chip's block swaps with a quick **match-morph**. Calm, instant, unceremonious — that is the point. |
| **Coda** (no copy) | **Focus-pull-back**: `viewBox` tween widens to reveal the whole diagram as one closed cycle — bench → waveform → block → checks → cloud → edge → line → chart → cloud. The loop arrows connect it end to end (final **draw-on**); ambient **passing-pulses** circulate; the conveyor marches on, linear, eternal. Stillness otherwise. |

### Implementation skeleton

```js
gsap.registerEase("manimSmooth", t => t*t*t*(t*(6*t-15)+10));
const master = gsap.timeline({
  scrollTrigger: { trigger: "#pipeline", pin: true, scrub: 1, end: "+=6500",
                   snap: { snapTo: "labelsDirectional", duration: 0.4 } },
  defaults: { ease: "manimSmooth", duration: 1 }
});
// per act: master.addLabel("a1s1").add(drawBench()).add(tracePath(), "<0.4")
//          .to({}, { duration: 0.6 })  // the self.wait()
// ambient conveyor lives OUTSIDE master: gsap.to(".dot", {x: "+=…", repeat: -1, ease: "none"})
// pulses/flashes: own ScrollTriggers with toggleActions: "play none none reverse"
```

---

## Sources

- manim source (verified constants/defaults): [ManimCE color constants](https://raw.githubusercontent.com/ManimCommunity/manim/main/manim/utils/color/manim_colors.py) · [manimGL default_config.yml](https://raw.githubusercontent.com/3b1b/manim/master/manimlib/default_config.yml) · [manimGL rate_functions.py](https://raw.githubusercontent.com/3b1b/manim/master/manimlib/utils/rate_functions.py) · [CE rate_functions.py](https://raw.githubusercontent.com/ManimCommunity/manim/main/manim/utils/rate_functions.py) · [CE creation.py](https://raw.githubusercontent.com/ManimCommunity/manim/main/manim/animation/creation.py) · [CE indication.py](https://raw.githubusercontent.com/ManimCommunity/manim/main/manim/animation/indication.py) · [CE composition.py](https://raw.githubusercontent.com/ManimCommunity/manim/main/manim/animation/composition.py) · [CE fading.py](https://raw.githubusercontent.com/ManimCommunity/manim/main/manim/animation/fading.py) · [CE transform_matching_parts.py](https://raw.githubusercontent.com/ManimCommunity/manim/main/manim/animation/transform_matching_parts.py)
- Grant's production config: [3b1b/videos custom_config.yml](https://raw.githubusercontent.com/3b1b/videos/master/custom_config.yml)
- Philosophy: [3blue1brown.com/about](https://www.3blue1brown.com/about) · [Dropbox blog profile](https://blog.dropbox.com/topics/work-culture/grant-sanderson-channels-his-passion-for-math-into-marvelously-i) · [Wikipedia: 3Blue1Brown](https://en.wikipedia.org/wiki/3Blue1Brown)
- Web translation: [From Manim to Motion Canvas (slama.dev)](https://slama.dev/motion-canvas/introduction/) · [Remotion vs Motion Canvas](https://www.remotion.dev/docs/compare/motion-canvas) · [GSAP MorphSVG docs](https://gsap.com/docs/v3/Plugins/MorphSVGPlugin/) · [GSAP plugins now free (Apr 2025)](https://medium.com/@chedganemouhssine/big-news-for-web-animators-gsap-just-made-all-plugins-free-384576258c03) · [Codrops: free GSAP plugin demos](https://tympanus.net/codrops/2025/05/14/from-splittext-to-morphsvg-5-creative-demos-using-free-gsap-plugins/)

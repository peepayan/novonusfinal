# Animation libs for a manim / 3blue1brown-style scrubbed SVG diagram

Scouted 2026-08-03 for **novonus-v2** (Vite + React 19 + TS + `gsap@^3.15.0` + `@gsap/react@^2.1.2` + three/r3f + lenis).
All licenses verified against the npm registry and the GitHub API on that date. Driving mechanism assumed throughout: one GSAP timeline with `scrollTrigger: { scrub }`.

---

## 1. Draw-on (stroke reveal, manim `Create`/`Write`)

### GSAP DrawSVGPlugin
- **URL:** https://gsap.com/docs/v3/Plugins/DrawSVGPlugin/ · npm `gsap`
- **License (verified):** GSAP Standard "no charge" license (https://gsap.com/standard-license), granted by Webflow. **Free for commercial use since GSAP 3.13** — the only real restrictions are: no building no-code animation tools that compete with Webflow, no reverse-engineering, keep proprietary notices. Not OSI/MIT, but fine for a marketing site.
- **Verified in package:** `node_modules/gsap/DrawSVGPlugin.js` exists in the installed `gsap@3.15.0` (npm publishes all former Club plugins in the public package since 3.13; confirmed locally).
- **What it does:** Animates any stroked SVG element (`path`, `line`, `polyline`, `polygon`, `rect`, `ellipse`) by managing `stroke-dasharray`/`stroke-dashoffset` for you, with percentage-based start/end segments (`drawSVG: "20% 80%"`), so you can reveal, un-reveal, or slide a "live" segment along a stroke.
- **Integration notes:**
  - `import { DrawSVGPlugin } from "gsap/DrawSVGPlugin"` then `gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin)` once at app entry (or inside `useGSAP`).
  - Scrub-safe: it is a normal tween, so `ease: "none"` inside a scrubbed timeline behaves deterministically both directions.
  - Gotchas: (1) don't also set `stroke-dasharray` in CSS — it fights the plugin; (2) chained tweens on the same target's `drawSVG` need `immediateRender: false` on the later `fromTo`s; (3) lengths are measured when the tween first renders — keep the SVG laid out (not `display:none`) and use `viewBox` + `vector-effect="non-scaling-stroke"` for responsive diagrams.
- **Suitability:** **5/5** — already installed, zero new deps, exactly manim's draw-on.

### Raw `stroke-dasharray` / `stroke-dashoffset` (no library)
- **URL:** https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-dashoffset
- **License:** n/a (platform technique).
- **What it does:** Set `pathLength="100"` on the path, `stroke-dasharray: 100`, then tween `stroke-dashoffset` 100→0. The `pathLength` attribute normalizes units so you never call `getTotalLength()`.
- **Integration notes:** `gsap.fromTo(el, { strokeDashoffset: 100 }, { strokeDashoffset: 0, ease: "none" })` in the scrubbed timeline. Fine for single simple reveals; DrawSVG is strictly more capable (partial segments, multiple element types) and costs nothing extra.
- **Suitability:** **4/5** — use when you want zero plugin registration (e.g. one-off checkmark).

### vivus
- **URL:** https://github.com/maxwellito/vivus · npm `vivus@0.4.6`
- **License (verified):** MIT. Last publish 2022-06; repo last push 2022-07 — dormant but stable.
- **What it does:** Standalone SVG draw-on library (delayed / sync / oneByOne modes).
- **Integration notes:** It *is* technically scrubbable — `new Vivus(el, { start: "manual" })` plus `setFrameProgress(0..1)` (verified in the readme) can be driven from a ScrollTrigger `onUpdate`. But that duplicates what DrawSVG does natively inside a timeline.
- **Suitability:** **2/5** — redundant with DrawSVG in this project.

### @svgdotjs/svg.js
- **URL:** https://svgjs.dev/ · npm `@svgdotjs/svg.js@3.2.7`
- **License (verified):** MIT. Actively maintained (published 2026-07).
- **What it does:** Imperative SVG creation/manipulation DSL.
- **Integration notes:** In React you already declare SVG in JSX; only relevant for runtime-generated geometry (procedural diagrams), and even then plain string-building of `d` attributes usually suffices.
- **Suitability:** **2/5** — healthy library, low relevance here.

---

## 2. Shape morphing (manim `Transform`)

### GSAP MorphSVGPlugin
- **URL:** https://gsap.com/docs/v3/Plugins/MorphSVGPlugin/ · npm `gsap`
- **License (verified):** GSAP Standard license (see above). **Verified present** as `node_modules/gsap/MorphSVGPlugin.js` in `gsap@3.15.0`.
- **What it does:** Morphs any path to any other path regardless of point count; converts primitives (`circle`, `rect`, …) to paths automatically (`MorphSVGPlugin.convertToPath("circle, rect")`); handles multi-subpath morphs.
- **Integration notes:**
  - `import { MorphSVGPlugin } from "gsap/MorphSVGPlugin"`; register with ScrollTrigger.
  - **`shapeIndex`** controls which point maps to which (tweak until rotation artifacts disappear; `shapeIndex: "auto"` default). **`type: "rotational"`** morphs via angle/length instead of coordinates — far fewer kinks for organic shapes. `map: "complexity" | "position" | "size"` picks subpath pairing.
  - **Scrub perf:** pass `precompile: "log"` once in dev, paste the logged arrays back as `precompile: [dStart, dEnd]` — skips per-refresh parsing, which matters when ScrollTrigger recalculates on resize.
  - Keep the target shape in `<defs>` (rendered but invisible) so it has resolvable geometry.
- **Suitability:** **5/5** — already installed; nothing open-source matches its edge-case handling.

### flubber
- **URL:** https://github.com/veltman/flubber · npm `flubber@0.4.2`
- **License (verified):** MIT. Unmaintained (last publish 2017-era code, npm metadata touch 2022; repo push 2022) but small and stable.
- **What it does:** Interpolators for *closed* shapes that "always look pleasing": `interpolate(a, b)`, plus **`separate()` / `combine()` / `interpolateAll()`** for one-shape→many-shapes topology changes.
- **When it beats MorphSVG:** (1) you need a pure-OSI-licensed morph; (2) one blob splitting into N blobs (or merging) with automatic triangulation — MorphSVG's `map` can do multi-subpath but flubber's separate/combine is purpose-built for it.
- **Integration notes:** Returns `f(t) → d-string`; drive from a scrubbed timeline with a proxy: `const o = { t: 0 }; tl.to(o, { t: 1, ease: "none", onUpdate: () => path.setAttribute("d", f(o.t)) })`. Closed shapes only — bad for open strokes.
- **Suitability:** **3/5** — niche complement, not a replacement.

### d3-interpolate-path
- **URL:** https://github.com/pbeshai/d3-interpolate-path · npm `d3-interpolate-path@2.3.0`
- **License (verified):** BSD-3-Clause. Last publish 2022, stable.
- **What it does:** Interpolates two `d` strings by *adding points* so line-chart-like paths with different point counts transition smoothly (no D3 dependency required despite the name).
- **When it beats MorphSVG:** morphing open polylines/curves that represent data (waveform A → waveform B) where you want point-order preserved, not shape-blended.
- **Integration notes:** Same proxy-tween pattern as flubber.
- **Suitability:** **3/5** — the right tool specifically for chart/wave line morphs.

### polymorph-js
- **URL:** https://github.com/notoriousb1t/polymorph · npm `polymorph-js@1.0.2`
- **License (verified):** MIT. Effectively dead (no substantive release since ~2018).
- **Suitability:** **1/5** — skip; flubber or MorphSVG cover everything it did.

---

## 3. Motion along a path (manim `MoveAlongPath`)

### GSAP MotionPathPlugin
- **URL:** https://gsap.com/docs/v3/Plugins/MotionPathPlugin/ · npm `gsap`
- **License (verified):** GSAP Standard license; this one was always free. **Verified present** as `node_modules/gsap/MotionPathPlugin.js` (and `MotionPathHelper.js`, a dev-time visual path editor, is also in the package).
- **What it does:** Moves any element along an SVG path (or an array of points) with **`autoRotate`** (orient to direction, optional angle offset), `align`/`alignOrigin` to snap the mover onto the path's coordinate space, and `start`/`end` to traverse partial segments (>1 or <0 wraps — usable for loops).
- **Integration notes:** `motionPath: { path: "#wire", align: "#wire", alignOrigin: [0.5, 0.5], autoRotate: true }` with `ease: "none"` inside the scrubbed timeline gives a perfectly reversible "electron along the wire". For HTML movers over an SVG, `align` handles the coordinate mapping — call `ScrollTrigger.refresh()` after fonts/images settle so alignment measures correctly.
- **Suitability:** **5/5** — already installed; this + DrawSVG is 80% of a manim scene.

### CustomEase / CustomWiggle (supporting eases)
- **URL:** https://gsap.com/docs/v3/Eases/CustomEase/ · npm `gsap`
- **License (verified):** GSAP Standard license; **verified present** (`CustomEase.js`, `CustomWiggle.js` in the installed package).
- **What it does:** Arbitrary SVG-path-defined eases; CustomWiggle generates oscillating eases — the closest web analogue to manim's `Wiggle`/`Indicate` snap.
- **Integration notes:** `gsap.registerPlugin(CustomEase, CustomWiggle)` — **CustomWiggle requires CustomEase registered first.** Inside a *scrubbed* timeline, eases reshape progress-vs-scroll rather than time — still deterministic and reversible; use sparingly (mostly keep `ease: "none"` and let scroll be the clock; use CustomWiggle for `toggleActions`-triggered accents instead).
- **Suitability:** **4/5**.

---

## 4. Emphasis / hand-drawn annotation (manim `Circumscribe`, `Underline`, `Indicate`)

### rough-notation
- **URL:** https://roughnotation.com / https://github.com/pshihn/rough-notation · npm `rough-notation@0.5.1`
- **License (verified):** MIT. Core last published 2022 (repo push 2024) — feature-complete and stable, ~9.7k stars.
- **What it does:** Sketchy animated annotations on any DOM element: `underline`, `box`, `circle`, `highlight`, `strike-through`, `crossed-off`, `bracket` — literally manim's Circumscribe/Underline aesthetic, plus `annotationGroup()` for sequenced reveals.
- **Integration notes:**
  - `annotate(el, { type: "circle", color: "#5eead4", animationDuration: 600 }).show()`.
  - **It is time-based, not progress-based — you cannot scrub it.** Two patterns: (1) fire from ScrollTrigger callbacks: `onEnter: () => a.show(), onLeaveBack: () => a.hide()` — feels great even in a scrubbed section; (2) for true scrub, skip this lib and DrawSVG a rough.js-generated path (below).
  - Works on HTML *and* SVG child elements; annotations live in an absolutely-positioned overlay SVG.
- **Suitability:** **4/5** — fastest route to sketch-emphasis; loses a point only for non-scrubbability.

### react-rough-notation
- **URL:** https://github.com/linkstrifer/react-rough-notation · npm `react-rough-notation@1.0.8`
- **License (verified):** MIT. Published 2025-09; **peerDependencies verified: `react ^18.2 || ^19`** — React 19 safe.
- **What it does:** `<RoughNotation type="box" show={inView}>` declarative wrapper + `<RoughNotationGroup>` sequencing.
- **Integration notes:** Bind `show` to state toggled by a ScrollTrigger callback. Same non-scrubbable caveat as the core lib.
- **Suitability:** **4/5** if you want the declarative form; the imperative core inside `useGSAP` is equally fine.

### rough.js
- **URL:** https://roughjs.com / https://github.com/pshihn/rough · npm `roughjs@4.6.6`
- **License (verified):** MIT. Last publish 2023-11; stable.
- **What it does:** Generates hand-drawn-style shapes (circle/rect/path/arc with `roughness`, `bowing`, hachure fills). Crucially, `rough.generator()` returns drawable ops you can convert to real SVG `<path>` elements.
- **Integration notes:** **The scrub-proof Circumscribe:** at mount, generate a rough ellipse around the target's bbox, insert it as a stroked path, then `drawSVG` it inside the scrubbed timeline. Full scroll reversibility + sketch aesthetic, all MIT/GSAP.
- **Suitability:** **4/5** — the geometry factory that makes emphasis scrubbable.

---

## 5. Flow effects (dashed conveyor, marching ants, energy flow)

### stroke-dashoffset marching (no library)
- **URL:** platform technique (see snippet (c) below).
- **License:** n/a.
- **What it does:** A repeating dash pattern (`stroke-dasharray="8 12"`) whose `stroke-dashoffset` is tweened by exactly one dash period per loop reads as a conveyor/data-flow. Layer two paths (solid faint + dashed bright) for the 3b1b "energy in a wire" look.
- **Integration notes:** Two modes: **(1) self-running** while the pinned section is active — `repeat: -1` tween gated by `toggleActions: "play pause resume pause"` (a scrubbed timeline freezes when scroll stops; a parallel time-based tween keeps flow alive, which usually looks better); **(2) scrub-locked** — put the dashoffset tween in the scrubbed timeline with `ease: "none"` so flow speed equals scroll speed. `pathLength` normalizes units so one period is a known number.
- **Suitability:** **5/5** — zero deps, core diagram vocabulary.

### Magic UI "Animated Beam" (as a flow/connector reference)
See Galleries below — its technique (animated `<linearGradient>` sliding along a connector path) is the polished alternative to dashes.

---

## 6. Glow / pulse (SVG filters)

### feGaussianBlur + feMerge (no library)
- **URL:** https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feGaussianBlur
- **License:** n/a.
- **What it does:** `<filter><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` = neon glow on any stroke. Pulse by animating `stdDeviation`.
- **Integration notes:** `gsap.to("#glowBlur", { attr: { stdDeviation: 8 }, ... })` works, **but SVG filters re-rasterize every frame — expensive during scrub.** Cheaper pattern for scrubbed timelines: duplicate the path, pre-apply a *static* blur filter to the duplicate, and tween only its `opacity`/`stroke-width` (compositor-friendly). Also set `filterUnits`/generous filter region (`x="-50%" width="200%"`) so the glow isn't clipped.
- **Suitability:** **5/5** technique (with the static-blur-duplicate pattern for perf).

---

## 7. Callouts, labels, leader lines, waveforms, checkmarks

### perfect-arrows
- **URL:** https://github.com/steveruizok/perfect-arrows · npm `perfect-arrows@0.3.7`
- **License (verified):** MIT. Last publish 2020/2022-era — but it is a pure geometry function (no DOM, no React version coupling), so staleness is low-risk.
- **What it does:** `getArrow(x0,y0,x1,y1)` / `getBoxToBoxArrow(...)` return arc control points + end angle for a natural-looking leader arrow between points or boxes.
- **Integration notes:** Compute geometry → render your own `<path d={...}>` in JSX → animate with DrawSVG in the scrubbed timeline. Composes perfectly; you own the SVG.
- **Suitability:** **4/5** — best leader-line option for this stack.

### leader-line
- **URL:** https://github.com/anseki/leader-line · npm `leader-line@1.0.8` (MIT, verified)
- **Verdict:** **Repo archived April 2025** (verified via GitHub API: `archived: true`). Imperative, appends its own absolutely-positioned SVG to `<body>`, fights React reconciliation.
- **Suitability:** **1/5** — avoid.

### react-xarrows
- **URL:** https://github.com/Eliav2/react-xarrows · npm `react-xarrows@2.0.2` (MIT, verified)
- **Verdict:** Unmaintained since 2022 (v3 rewrite stalled). Works, but ref-tracking internals predate React 19.
- **Suitability:** **2/5** — prefer perfect-arrows + own SVG.

### d3-shape (waveform / oscilloscope path generation)
- **URL:** https://d3js.org/d3-shape · npm `d3-shape@3.2.0`
- **License (verified):** ISC. Stable (2023 publish; D3 modules are long-term stable).
- **What it does:** `line().curve(curveNatural | curveBasis)` turns a `number[]` of samples into a smooth `d` string — the clean way to build oscilloscope traces, envelopes, and bell curves without hand-writing Béziers.
- **Integration notes:** Generate once (static trace) and DrawSVG it; or regenerate per-frame from a phase proxy for a *travelling* wave (`tl.to(proxy, { phase: Math.PI * 4, ease: "none", onUpdate: redraw })`); or morph trace A→B with `d3-interpolate-path`. Tree-shakes to a few KB. Add `@types/d3-shape` for TS.
- **Suitability:** **4/5** — the one genuinely worthwhile new "math→path" dep.

### wavesurfer.js
- **URL:** https://wavesurfer.xyz · npm `wavesurfer.js@7.12.11` (BSD-3-Clause, verified; actively maintained 2026-07)
- **What it does:** Renders waveforms *of actual audio files* with playback.
- **Suitability:** **1/5** here — only if a real audio asset appears; for synthetic scope lines use d3-shape.

### Animated checkmark / cross (no library)
- **What:** A check is a 2-segment polyline, a cross is two lines — author them stroked and DrawSVG them (`drawSVG: 0 → "100%"`, `ease: "power2.out"` via triggered tween, or `"none"` scrubbed). **Lucide** (npm `lucide-react`, **ISC license verified**) is a ready-made source of 24×24 stroke-based icon paths (`check`, `x`, `zap`, …) — copy the `<path>` data into your SVG rather than importing the React components if you want DrawSVG control.
- **Suitability:** **5/5** technique.

### @number-flow/react (already installed)
- **License:** MIT. Already in novonus-v2 — use for numeric label callouts (count-ups next to leader lines) instead of adding anything new.

---

## 8. Motion Canvas — evaluated and ruled out for this use

- **URL:** https://motioncanvas.io / https://github.com/motion-canvas/motion-canvas · npm `@motion-canvas/core|2d|player@3.17.2`
- **License (verified):** MIT (all packages + repo).
- **Maintenance:** last npm release 2025-02; repo still receives pushes (2026-07) but cadence is slow.
- **What it is:** A TypeScript *animation authoring tool* (aarthificial): scenes are generator functions rendered to **canvas** inside its own Vite-based editor; output is video or a web player.
- **Embedding reality (verified in source):** the `@motion-canvas/player` web component `<motion-canvas-player>` observes exactly `['src', 'quality', 'width', 'height', 'auto', 'variables']` (checked `packages/player/src/main.ts`). That is play/pause/loop/hover-play + injected variables — **no documented seek/progress attribute, i.e. no supported scroll-scrub**. Scrubbing would mean driving undocumented internals through the shadow root. It is also a parallel runtime — scenes are not React components, and canvas output won't inherit your CSS/design tokens.
- **Verdict:** **1/5** for scrubbed in-page diagrams — use GSAP. (Worth **4/5** as an *offline* tool if you ever want to render a standalone explainer video in true manim style.)

---

## 9. Component galleries (diagram beats to lift)

### Magic UI — Animated Beam (and friends)
- **URL:** https://magicui.design/docs/components/animated-beam · repo https://github.com/magicuidesign/magicui
- **License (verified):** **MIT** (GitHub API `spdx_id: MIT`; repo active 2026-07). Copy-paste/shadcn-registry model: `npx shadcn@latest add @magicui/animated-beam` or copy the source.
- **What it does:** SVG connector path between two element refs (`containerRef`, `fromRef`, `toRef`, `curvature`, `reverse`, `duration`, `delay`, y-offsets) with a **gradient that travels along the path** — the canonical "node A talks to node B" beat. Registry also has (verified names): `animated-beam` demos for unidirectional / bidirectional / multiple-inputs / multiple-outputs, plus `border-beam`, `orbiting-circles`, `arc-timeline`, `animated-list`, `grid-beams`, `ripple`, `avatar-circles`, `globe`.
- **Integration notes:** It animates via **`motion` (framer-motion)** — a new dep in a GSAP project. MIT allows porting: keep its ref-measuring + path-building code, replace the motion gradient tween with `gsap.to(gradEl, { attr: { x1, x2 }, repeat: -1 })` or a scrub-locked equivalent (~20 lines). Port > adopt.
- **Suitability:** **4/5** as a pattern to port; 3/5 used as-is (drags in framer-motion).

### React Bits
- **URL:** https://reactbits.dev · repo https://github.com/DavidHDev/react-bits (44k stars, active 2026-08)
- **License (verified, read LICENSE text):** **MIT + Commons Clause** — free commercial use *inside an application/website*; you may not resell/redistribute the components themselves. Fine for Novonus.
- **Relevant inventory (verified in repo registry):** `Beams`, `LaserFlow`, `ElectricBorder`, `BorderGlow`, `StarBorder`, `OrbitImages`, `FlowingMenu` — mostly WebGL/three eye-candy backgrounds and borders, **no node-to-node connector/diagram primitives**.
- **Suitability:** **2/5** for diagram beats (may still be useful elsewhere on the site since three.js is already present).

### 21st.dev
- **URL:** https://21st.dev · platform repo https://github.com/serafimcloud/21st (**MIT**, verified)
- **What it is:** shadcn-style community marketplace; the platform is MIT and the free tier advertises MIT components, but entries are community-published — **check the license shown on each component page before lifting**. Productive searches for this project: "beam", "connect", "orbit", "timeline", "flow" (many hits are re-hosted Magic UI derivatives, which are MIT).
- **Suitability:** **3/5** as a discovery index; verify per component.

---

## Recommended Stack

Everything core is **already installed** — `gsap@3.15` ships ScrollTrigger + DrawSVG + MorphSVG + MotionPath + CustomEase/CustomWiggle in the public package (files verified in `node_modules/gsap/`), free for commercial use under the Webflow Standard license.
Add only three small MIT/ISC helpers: **rough.js** (sketch geometry → DrawSVG-scrubbed Circumscribe), **perfect-arrows** (leader-line geometry), **d3-shape** (waveform `d` generation); optionally **rough-notation** for callback-triggered emphasis. Port Magic UI's Animated Beam pattern (MIT) to GSAP instead of adding framer-motion; skip Motion Canvas, vivus, leader-line (archived), polymorph-js.

```
npm i roughjs perfect-arrows d3-shape rough-notation && npm i -D @types/d3-shape
```

**(a) Scrubbed DrawSVG segment**
```ts
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);

const tl = gsap.timeline({
  scrollTrigger: { trigger: "#diagram", start: "top top", end: "+=2400", scrub: 0.6, pin: true },
});
tl.from("#axes path", { drawSVG: "0%", ease: "none", stagger: 0.2 })
  .fromTo("#trace", { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", ease: "none", immediateRender: false });
```

**(b) MorphSVG inside the same scrubbed timeline**
```ts
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
gsap.registerPlugin(MorphSVGPlugin);
// #stateB lives in <defs>; run precompile:"log" once in dev, then inline the arrays.
tl.to("#stateA", {
  morphSVG: { shape: "#stateB", type: "rotational", shapeIndex: "auto", origin: "50% 50%" },
  ease: "none",
}, ">-0.15");
```

**(c) Dashed-flow conveyor (marching dashes)**
```tsx
// <path id="flow" d="M24 120 C 180 120 260 40 420 40" pathLength="200"
//       fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="8 12" />
gsap.to("#flow", {                       // dash period = 8 + 12 = 20 → seamless loop
  strokeDashoffset: -20, duration: 0.8, ease: "none", repeat: -1,
  scrollTrigger: { trigger: "#diagram", toggleActions: "play pause resume pause" },
});
// Scrub-locked variant instead: tl.to("#flow", { strokeDashoffset: -200, ease: "none" }, 0);
```

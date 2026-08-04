# Inspiration & Component Catalog — Novonus v2

Target: single-page marketing site, Vite + React + TypeScript + GSAP (ScrollTrigger), optional three.js.
Aesthetic: premium, cinematic, industrial-frontier-tech (Sanctuary AI / Scale AI caliber), dark-capable, editorial type, awwwards-level motion.

All versions/licenses below were verified against the npm registry and source repos on 2026-08-03.

---

## 0. Core libraries (verified)

| Package | Version | License | Notes |
|---|---|---|---|
| `gsap` | 3.15.0 | GSAP Standard "no charge" license | **100% free since Webflow acquired GreenSock** (v3.13, April 2025). ALL formerly-paid Club plugins are free: **SplitText, ScrollTrigger, ScrollSmoother, ScrambleTextPlugin, DrawSVG, MorphSVG, Inertia, CustomEase, Flip, Observer**. Free for commercial use incl. client work. Not OSS: you may not redistribute GSAP itself or build a competing tool. `import { SplitText } from "gsap/SplitText"` — everything ships in the one npm package. |
| `@gsap/react` | 2.1.2 | Same GSAP license | Provides `useGSAP()` — scoped, StrictMode-safe cleanup hook. Use it for every GSAP effect in React. |
| `lenis` | 1.3.25 | MIT | Smooth scroll. **The `@studio-freight/lenis` package is deprecated — install `lenis`.** React wrapper ships in-package: `import { ReactLenis } from "lenis/react"`. <4KB gz. |
| `three` | 0.185.1 | MIT | WebGL engine. |
| `@react-three/fiber` | 9.7.0 | MIT | React renderer for three. v9 targets React 19; works fine in Vite. |
| `@react-three/drei` | 10.7.7 | MIT | Helpers: `shaderMaterial`, `Sparkles`, `Stars`, `MeshDistortMaterial`, `Float`, `Environment`, `ScrollControls`. |
| `ogl` | 1.0.11 | **Unlicense (public domain)** | Tiny WebGL library (~35KB vs three's ~600KB). React Bits' best backgrounds run on it. Ideal when you want ONE shader hero without shipping all of three.js. |
| `split-type` | 0.3.4 | ISC | Text splitting. **Only needed if you refuse GSAP SplitText** — since SplitText is now free, split-type is a fallback, not a need. |
| `@tsparticles/react` + `@tsparticles/slim` | 4.3.2 | MIT | Config-driven particles. Heavier + more "template-y" than a custom shader; use only if you need out-of-the-box particle presets fast. |
| `@shadergradient/react` | 2.4.20 | MIT | Animated 3D shader gradients (the Framer favorite). Pulls in three + R3F. Design in shadergradient.co GUI, paste the URL string. |
| `vanta` | 0.5.24 | MIT | Preset animated 3D backgrounds (WAVES, FOG, NET, GLOBE, HALO, TOPOLOGY, TRUNK, DOTS, RINGS, CELLS, CLOUDS). ~120KB gz incl. three. |
| `react-fast-marquee` | 1.6.5 | MIT | Dead-simple marquee component. |
| `react-countup` | 6.5.3 | MIT | Count-up numbers with scroll spy. |
| `@number-flow/react` | 0.6.2 | MIT | Beautiful odometer-style number transitions (the current "premium" counter look). |
| `mouse-follower` | 1.1.2 | MIT | Cuberto's production cursor-follower library (requires GSAP). |
| `cobe` | 2.0.1 | MIT | 5KB WebGL dotted globe (Stripe/Vercel look). |
| `maath` | 0.10.8 | MIT | Math helpers for particle fields with R3F. |
| `postprocessing` | 6.39.4 | Zlib | Bloom/noise/DOF passes for three — cinematic grade. |
| `use-scramble` | 2.x | MIT | 1KB React hook for scramble/decode text; alternative to GSAP ScrambleText. |

---

## Component galleries — what to take from each

| Gallery | License / pricing | Best pickings for us |
|---|---|---|
| **React Bits** — https://reactbits.dev (repo: https://github.com/DavidHDev/react-bits) | **MIT + Commons Clause** — free for personal AND commercial sites; you just can't resell the library itself. 140+ components, each in 4 variants (JS/TS × CSS/Tailwind). Install: copy-paste or `npx shadcn@latest add @react-bits/<Name>-TS-TW` / jsrepo. | Backgrounds: **Aurora, Threads, Lightning, Hyperspeed, Particles, Dot Grid, Dither, Faulty Terminal, Letter Glitch** (many OGL-based — perfect for industrial-tech). Text: **Decrypted Text, Scrambled Text, Split Text, Blur Text, Count Up**. Interaction: **Magnet, Click Spark, Star Border, Spotlight Card, Tilted Card**. The single highest-value gallery for our aesthetic. |
| **Magic UI** — https://magicui.design (repo: magicuidesign/magicui) | **MIT**, 150+ free components (React + TS + Tailwind + Motion). Paid "Pro" is templates only — ignore. | **Marquee, Border Beam, Number Ticker, Text Reveal, Shine Border, Meteors, Particles, Globe (cobe), Animated Grid Pattern, Flickering Grid, Retro Grid, Word Rotate, Scroll Progress, Velocity Scroll**. Note: components use `motion` (Framer Motion) — fine next to GSAP but adds a second animation dep; port the simple ones to GSAP/CSS. |
| **Aceternity UI** — https://ui.aceternity.com | Freemium. Free components are copy-paste and usable in commercial projects (per site FAQ); "All-Access" one-time payment covers premium templates/blocks. **No formal OSS license — don't redistribute; fine to ship in a site.** | **Spotlight, Aurora Background, Background Beams, Vortex, Sparkles, Wavy Background, Lamp Effect, Tracing Beam, Sticky Scroll Reveal, Hero Parallax, Macbook Scroll, 3D Card, Card Spotlight, Hover Border Gradient, Glare Card, Evervault Card, Text Generate Effect, Typewriter, Flip Words**. Requires framer-motion. Widely copied — use as reference more than verbatim. |
| **21st.dev** — https://21st.dev | Community registry (shadcn format). Free browsing, 2 free component copies/day; membership for unlimited + AI credits. **License varies per author — check each component before shipping.** | Search "hero", "background", "text animation", "cursor". Good discovery layer over everything above; treat as an index, not a source of truth. |
| **hover.dev** — https://www.hover.dev | Some free, most paid. **Components copyrighted, no redistribution; usable in your own projects once accessed.** React + Tailwind + Framer Motion. | Free tier: Encrypt Button (scramble-on-hover — very us). Paid: hero sections, navbars, carousels. Lower priority given MIT alternatives exist for almost everything. |
| **Animata** — https://animata.design (repo: https://github.com/codse/animata) | **MIT**, copy-paste (shadcn-style), React + Tailwind + Framer Motion. | Bento grids, text effects, skill-icon marquees, card interactions, counters. Solid MIT fallback pool. |
| **Uiverse** — https://uiverse.io (repo: uiverse-io/galaxy) | **MIT**, 6000+ community CSS/Tailwind elements. | Loaders/spinners for the preloader, toggles, buttons. Quality varies wildly — cherry-pick and restyle. |

**Codrops** — https://tympanus.net/codrops — per https://tympanus.net/codrops/licensing/ : **downloadable demos are MIT — commercial use allowed, no attribution required** (design freebies only restrict resale of the asset itself). This makes Codrops the best source of awwwards-tier techniques you can legally lift.

Shortlist for this build:
1. **How to Build Cinematic 3D Scroll Experiences with GSAP** (Nov 2025) — https://tympanus.net/codrops/2025/11/19/how-to-build-cinematic-3d-scroll-experiences-with-gsap/ — GSAP + three.js pinned camera scroll. Suitability 5.
2. **Layered Zoom Scroll Effect with ScrollSmoother + ScrollTrigger** (Oct 2025) — https://tympanus.net/codrops/2025/10/29/building-a-layered-zoom-scroll-effect-with-gsap-scrollsmoother-and-scrolltrigger/ — Telescope-style zoom-through sections. Suitability 5.
3. **Creating 3D Scroll-Driven Text Animations with CSS and GSAP** (Nov 2025) — https://tympanus.net/codrops/2025/11/04/creating-3d-scroll-driven-text-animations-with-css-and-gsap/ — three scroll-linked type treatments. Suitability 5.
4. **From SplitText to MorphSVG: 5 Creative Demos Using Free GSAP Plugins** (May 2025) — https://tympanus.net/codrops/2025/05/14/from-splittext-to-morphsvg-5-creative-demos-using-free-gsap-plugins/ — free-plugin cookbook. Suitability 4.
5. **How to Animate WebGL Shaders with GSAP: Ripples, Reveals, Dynamic Blur** (Oct 2025) — https://tympanus.net/codrops/2025/10/08/how-to-animate-webgl-shaders-with-gsap-ripples-reveals-and-dynamic-blur-effects/ — driving shader uniforms from ScrollTrigger; the key technique for a custom hero. Suitability 5.
6. **Scroll-Revealed WebGL Gallery with GSAP + Three.js** (Feb 2026) — https://tympanus.net/codrops/2026/02/02/building-a-scroll-revealed-webgl-gallery-with-gsap-three-js-astro-and-barba-js/ — ScrollSmoother + ScrollTrigger + SplitText + Flip + three. Suitability 4.
7. **WebGL Distortion Hover Effects** (2018) — https://tympanus.net/codrops/2018/04/10/webgl-distortion-hover-effects/ — displacement-map image transitions. Suitability 4.
8. **Interactive WebGL Hover Effects** (2020) — https://tympanus.net/codrops/2020/04/14/interactive-webgl-hover-effects/ — mouse-reactive image planes. Suitability 4.

---

## 1. Preloaders / loaders

1. **Hand-rolled GSAP counter + curtain preloader** — original snippet below — License: n/a (ours) — Percent counter climbs 0→100, wordmark reveals, curtain wipes up, then hero intro fires. Integration: gsap only. **Suitability 5** — exactly the cinematic-industrial opener; matches the "coordinated intro gate" pattern proven in novonus v1.

```tsx
// Preloader.tsx — gsap + @gsap/react
import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export function Preloader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [pct, setPct] = useState(0);

  useGSAP(() => {
    const n = { v: 0 };
    gsap.timeline({ defaults: { ease: "power3.inOut" } })
      .to(n, { v: 100, duration: 1.6, ease: "power2.out",
        onUpdate: () => setPct(Math.round(n.v)) })
      .to(".pre-mark", { opacity: 1, y: 0, duration: 0.5 }, "-=0.5")
      .to(root.current, { yPercent: -100, duration: 0.9, delay: 0.2,
        onComplete: onDone });
  }, { scope: root });

  return (
    <div ref={root} className="preloader" aria-hidden>
      <span className="pre-pct">{String(pct).padStart(3, "0")}</span>
      <span className="pre-mark">NOVONUS</span>
    </div>
  );
}
```

2. **Uiverse loaders** — https://uiverse.io/loaders — MIT — 100s of pure-CSS spinners/bars; strip one down to a monochrome bar or dot-matrix pulse. Integration: copy CSS, zero deps. **Suitability 3** — raw material only; restyle heavily or it reads "free asset".
3. **Codrops preloader/intro patterns** (e.g. the Cinematic 3D Scroll demo's loading gate, link above) — MIT — production-grade sequencing to study/lift. Integration: extract the GSAP timeline logic. **Suitability 4**.

## 2. Hero WebGL / canvas backgrounds

1. **React Bits OGL backgrounds (Aurora / Threads / Lightning / Dot Grid / Faulty Terminal / Dither)** — https://reactbits.dev/backgrounds/aurora etc. — MIT + Commons Clause — GPU shader backgrounds as drop-in React components on **ogl** (public domain, tiny). Integration: `npm i ogl`, copy TS-Tailwind variant, mount absolutely-positioned behind hero. **Suitability 5** — Threads/Dot Grid/Dither hit the industrial-frontier look precisely, dark-native, cheap to run.
2. **Custom R3F particle/terrain field** — https://github.com/pmndrs/react-three-fiber + drei + maath — MIT — bespoke dot-terrain or particle field (the Novonus topographic identity) with `<points>` + `shaderMaterial`, scroll-driven uniforms via ScrollTrigger (technique: Codrops #5 above). Integration: three + @react-three/fiber + @react-three/drei + maath. **Suitability 5** — unique, ownable; highest effort of the options.
3. **ShaderGradient** — https://github.com/ruucm/shadergradient — MIT — designer-tunable animated 3D gradients; `<ShaderGradientCanvas><ShaderGradient urlString=... /></...>`, configured visually at shadergradient.co. Integration: `@shadergradient/react` + three + R3F. **Suitability 4** — gorgeous but recognizable (Framer-famous); best muted/monochrome.
4. **Vanta.js (TOPOLOGY / NET / TRUNK / HALO)** — https://github.com/tengbao/vanta — MIT — preset animated backgrounds, mouse-reactive, ~120KB gz incl. three; init in `useEffect`, destroy on unmount. **Suitability 3** — TOPOLOGY/NET fit the aesthetic but are widely seen; fallback if custom work slips.
5. **tsparticles** — https://github.com/tsparticles/tsparticles — MIT — config-driven particle systems (`@tsparticles/react` + `@tsparticles/slim`). **Suitability 2** — capable but generic-looking next to shader options.
6. **cobe globe** — https://github.com/shuding/cobe — MIT — 5KB dotted globe for a "global deployment" beat. **Suitability 3**.

## 3. Typography effects

1. **GSAP SplitText (now free)** — https://gsap.com/docs/v3/Plugins/SplitText/ — GSAP free license — line/word/char splitting with masked line reveals (`type: "lines", mask: "lines"`), responsive re-splitting, screen-reader safe (aria handling built in). Integration: ships inside `gsap`; pair with ScrollTrigger. **Suitability 5** — the editorial masked-line reveal IS the premium type move.

```ts
// masked editorial line reveal
gsap.registerPlugin(SplitText, ScrollTrigger);
const split = SplitText.create(".headline", { type: "lines", mask: "lines" });
gsap.from(split.lines, {
  yPercent: 110, duration: 1.1, stagger: 0.08, ease: "power4.out",
  scrollTrigger: { trigger: ".headline", start: "top 80%", once: true },
});
```

2. **GSAP ScrambleTextPlugin (now free)** — https://gsap.com/docs/v3/Plugins/ScrambleTextPlugin/ — GSAP free license — decode/scramble text (`scrambleText: { text, chars: "upperCase", speed: 0.4 }`); terminal/telemetry flavor. Integration: in `gsap`. **Suitability 5** — signature industrial-tech detail for eyebrows, stats labels, nav.
3. **use-scramble** — https://github.com/tol-is/use-scramble — MIT — 1KB React hook alternative if you want scramble without touching GSAP timelines. **Suitability 4**.
4. **React Bits Decrypted Text / Blur Text / Split Text** — https://reactbits.dev/text-animations/decrypted-text — MIT + CC — prop-driven drop-ins when speed matters. **Suitability 4**.
5. **Aceternity Text Generate / Flip Words** — https://ui.aceternity.com/components/text-generate-effect — free-to-use — LLM-style word-by-word materialize; on-brand for an AI company. Needs framer-motion. **Suitability 3**.
6. **Kinetic/scroll-velocity type**: Magic UI **Velocity Scroll** — https://magicui.design/docs/components/scroll-based-velocity — MIT — scroll-speed-reactive skewing marquee type. **Suitability 4**.

## 4. Marquees / tickers

1. **Magic UI Marquee** — https://magicui.design/docs/components/marquee — MIT — pause-on-hover, reverse, vertical, fade edges; pure CSS animation under the hood, copy-paste (needs Tailwind). **Suitability 5** — logos/partners/spec-ticker rows, restylable to editorial mono labels.
2. **react-fast-marquee** — https://github.com/justin-chu/react-fast-marquee — MIT — `<Marquee speed={40} gradient={false}>` and done; no Tailwind requirement. **Suitability 4** — fastest path, slightly less control.
3. **Original CSS marquee** (no deps, 12 lines): duplicate track, `animation: marquee linear infinite`, `@keyframes marquee { to { transform: translateX(-50%) } }`, mask-image fade at edges. **Suitability 4** — zero-dep and exact control; combine with GSAP `timeScale()` for scroll-velocity response.

## 5. Pinned scroll storytelling sections

1. **GSAP ScrollTrigger pin + scrub (hand-built)** — https://gsap.com/docs/v3/Plugins/ScrollTrigger/ — GSAP free — `pin: true, scrub: 1, snap` timelines; the exact pattern behind the v1 six-slide hero. Integration: gsap + @gsap/react; one timeline per chapter. **Suitability 5** — this is the backbone; no library replaces it.
2. **Codrops Cinematic 3D Scroll Experiences** (link in shortlist) — MIT — pinned camera moves through three.js scenes, scroll-scrubbed. **Suitability 5** for the flagship "process" chapter.
3. **Aceternity Sticky Scroll Reveal** — https://ui.aceternity.com/components/sticky-scroll-reveal — free-to-use — sticky text list with swapping media panel; classic product-story section. Framer-motion based — consider re-implementing with ScrollTrigger for one animation system. **Suitability 4**.
4. **Aceternity Macbook Scroll / Hero Parallax** — https://ui.aceternity.com/components/macbook-scroll — free-to-use — scroll-driven device/gallery set pieces. **Suitability 3** — impressive but SaaS-flavored.

## 6. Horizontal scroll galleries

1. **ScrollTrigger horizontal translate (hand-built)** — GSAP free — pin a viewport-height section, `gsap.to(track, { xPercent: -100 * (n-1), scrollTrigger: { pin: true, scrub: 1, end: () => "+=" + track.scrollWidth } })`. Integration: pure GSAP, ~20 lines. **Suitability 5** — canonical awwwards pattern, total control, works with Lenis.
2. **Codrops Scroll-Revealed WebGL Gallery** (shortlist #6) — MIT — horizontal/grid gallery with WebGL reveal transitions. **Suitability 4** — lift the reveal shader, drop Astro/Barba parts.
3. **Olivier Larose "Awwwards Project Gallery"** — https://blog.olivierlarose.com/tutorials/project-gallery-mouse-hover — public source on GitHub but **no explicit license — treat as educational reference and re-implement**. **Suitability 4** as a pattern source.

## 7. Magnetic buttons + custom cursors

1. **Original magnetic button (GSAP quickTo)** — snippet below — n/a (ours) — Integration: gsap only. **Suitability 5** — the premium micro-interaction, 30 lines.

```tsx
// Magnetic.tsx
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export function Magnetic({ children, strength = 0.35 }:
  { children: React.ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const el = ref.current!;
    const xTo = gsap.quickTo(el, "x", { duration: 0.8, ease: "elastic.out(1,0.4)" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.8, ease: "elastic.out(1,0.4)" });
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const leave = () => { xTo(0); yTo(0); };
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    return () => { el.removeEventListener("mousemove", move);
      el.removeEventListener("mouseleave", leave); };
  }, { scope: ref });
  return <div ref={ref} style={{ display: "inline-block" }}>{children}</div>;
}
```

2. **mouse-follower (Cuberto)** — https://github.com/Cuberto/mouse-follower — MIT — production cursor library (requires GSAP): inertial dot/ring, `-hidden/-pointer/-text/-media` states, sticky/magnetic modes, media previews inside the cursor. Integration: `npm i mouse-follower`, init once, add `data-cursor` attributes. **Suitability 5** — the agency-grade cursor with none of the build cost.
3. **React Bits Magnet + Click Spark** — https://reactbits.dev/animations/magnet — MIT + CC — prop-driven magnetic wrapper if you'd rather not own the code. **Suitability 4**.
4. **jmarellanes GSAP direction-aware cursor** — https://github.com/jmarellanes/gsap__change-cursor-hover--01 — MIT — cursor expands into rotating "View" badge with direction-aware rotation; nice for the gallery. **Suitability 3** — vanilla JS, needs React adaptation.

## 8. Card hover effects (spotlight, tilt, border-beam)

1. **Magic UI Border Beam + Shine Border** — https://magicui.design/docs/components/border-beam — MIT — animated beam orbiting card borders; the "energized hardware" look on dark. Copy-paste, Tailwind + Motion. **Suitability 5** for spec/stat cards.
2. **Aceternity Card Spotlight / Hover Border Gradient / Glare Card** — https://ui.aceternity.com/components/card-spotlight — free-to-use — radial spotlight following the pointer (also trivially re-implementable: track mouse, move a `radial-gradient` background — ~15 lines of ours if we want zero framer-motion). **Suitability 4**.
3. **React Bits Spotlight Card / Tilted Card** — https://reactbits.dev/components/spotlight-card — MIT + CC — spotlight + 3D tilt variants, TS/Tailwind copy-paste. **Suitability 4** — restrained tilt only; heavy tilt reads consumer.
4. **Codrops WebGL Distortion Hover** (shortlist #7/#8) + **robin-dela/hover-effect** — https://github.com/robin-dela/hover-effect — npm shows no license field — **verify repo license or use the MIT Codrops source instead** — displacement-map image hover for case-study imagery. **Suitability 4** (via Codrops MIT path).

## 9. Number counters

1. **@number-flow/react** — https://github.com/barvian/number-flow — MIT — odometer-style digit transitions, formatting-aware, a11y-clean; current best-in-class counter feel. Integration: `npm i @number-flow/react`, trigger value change on `ScrollTrigger.onEnter`. **Suitability 5** — precision-instrument vibe fits telemetry/stats.
2. **react-countup** — https://github.com/glennreyes/react-countup — MIT — `<CountUp end={99.98} decimals={2} enableScrollSpy scrollSpyOnce />`. **Suitability 4** — simpler, proven.
3. **Magic UI Number Ticker** — https://magicui.design/docs/components/number-ticker — MIT — copy-paste, Motion-based. **Suitability 3** (adds framer dep for one feature).
4. GSAP-native: tween `{ v: 0 } → { v: end }` with `snap` — zero deps, matches the preloader counter. **Suitability 4**.

## 10. Grain / noise overlays

1. **Original SVG fractal-noise overlay** — n/a (ours) — fixed full-viewport film grain, zero deps:

```css
.grain::after {
  content: ""; position: fixed; inset: -100%; z-index: 60; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: 0.05; mix-blend-mode: overlay;
  animation: grain-shift 8s steps(10) infinite;
}
@keyframes grain-shift {
  0%,100% { transform: translate(0,0) } 20% { transform: translate(-8%,4%) }
  40% { transform: translate(6%,-6%) } 60% { transform: translate(-4%,8%) }
  80% { transform: translate(8%,-2%) }
}
```
**Suitability 5** — instant filmic texture on dark; keep opacity 0.03–0.06.

2. **postprocessing NoiseEffect/GrainEffect (in-canvas)** — https://github.com/pmndrs/postprocessing — Zlib — grain + bloom + vignette inside the three.js scene via `@react-three/postprocessing`. **Suitability 4** when the hero is WebGL — grade the scene, not the DOM.

## 11. Smooth scrolling

1. **Lenis** — https://github.com/darkroomengineering/lenis — MIT — industry-default smooth scroll; keeps CSS sticky + IntersectionObserver working. Glue to GSAP (standard pattern from the README):

```ts
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
const lenis = new Lenis({ lerp: 0.1, anchors: true });
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
```
**Suitability 5** — the correct default; `lenis/react` `<ReactLenis root>` for the React tree.

2. **GSAP ScrollSmoother (now free)** — https://gsap.com/docs/v3/Plugins/ScrollSmoother/ — GSAP free — native-scrollbar smoothing + `data-speed`/`data-lag` parallax attributes, zero glue code with ScrollTrigger. Requires wrapper/content divs. **Suitability 4** — pick this INSTEAD of Lenis if you want built-in per-element parallax; don't run both.

## 12. Section transitions / wipes

1. **Original clip-path wipe on ScrollTrigger** — n/a (ours) — panel reveals via `clip-path: inset()` scrub:

```ts
gsap.fromTo(".panel-next",
  { clipPath: "inset(100% 0 0 0)" },
  { clipPath: "inset(0% 0 0 0)", ease: "none",
    scrollTrigger: { trigger: ".panel-next", start: "top bottom",
      end: "top top", scrub: true } });
```
**Suitability 5** — cinematic curtain between chapters; also works as diagonal (`polygon()`) wipes.

2. **Codrops Layered Zoom Scroll** (shortlist #2) — MIT — zoom-through transition between stacked sections via ScrollSmoother+ScrollTrigger. **Suitability 5** for one hero-grade transition moment.
3. **Olivier Larose page transitions (curve/stair/perspective)** — https://blog.olivierlarose.com/articles/nextjs-page-transition-guide — no explicit license; re-implement the curve-wipe idea as an in-page section divider with GSAP. **Suitability 3** (single-page site limits its use).
4. **GSAP Flip plugin (free)** — https://gsap.com/docs/v3/Plugins/Flip/ — GSAP free — grid-card → detail-view morph transitions (the "grid-to-detail" awwwards move). **Suitability 4**.

---

## Recommended Build Kit

One coherent system — everything below is license-safe for a commercial site:

- **Scroll system**: **Lenis (MIT) + GSAP ScrollTrigger** with the ticker glue above; all storytelling pinned/scrubbed via ScrollTrigger; snap only in the hero.
- **Hero background**: **custom R3F particle/dot-terrain field** (three + R3F + drei + maath, all MIT) with uniforms scrubbed by ScrollTrigger (Codrops technique #5); **fallback/secondary sections**: React Bits OGL backgrounds (Threads / Dot Grid / Faulty Terminal) on public-domain `ogl`.
- **Type system**: **GSAP SplitText** masked line reveals for editorial headlines + **ScrambleTextPlugin** decode for eyebrows/labels/stats — both now free, zero extra deps.
- **Micro-interactions**: original `Magnetic` wrapper (above) + **mouse-follower** cursor (MIT) + Magic UI **Border Beam** on cards (MIT, copy-paste) + **@number-flow/react** counters (MIT) + original grain overlay + clip-path section wipes.
- **Marquee**: Magic UI Marquee (copy-paste) or `react-fast-marquee` if not using Tailwind utilities.
- **Preloader**: original GSAP counter+curtain (snippet above), gating section intros.

```bash
npm i gsap @gsap/react lenis three @react-three/fiber @react-three/drei maath ogl mouse-follower @number-flow/react react-fast-marquee
npm i -D @types/three
```

Framer Motion is deliberately excluded — one animation system (GSAP) keeps motion language consistent; port any Magic UI/Aceternity component you adopt onto GSAP or plain CSS.

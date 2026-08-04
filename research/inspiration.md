# INSPIRATION — Novonus v2 Master Design Document

> Synthesis of three parallel research streams (2026-08-03):
> - `inspiration-sanctuary.md` — sanctuary.ai teardown · 15 pages · 78 screenshots · 20 computed-style dumps
> - `inspiration-scale.md` — scale.com teardown · 17 pages · 105 screenshots · per-page style JSON
> - `inspiration-components.md` — license-verified component/effect catalog (GSAP now fully free, Codrops MIT, React Bits, Magic UI…)
>
> Screenshots: `research/shots/…` · Raw style data: `research/data/…`

---

## 1. What the references actually teach

### Sanctuary.ai — the architecture lesson
- **Black table, white sheets.** `<body>` is pure black; content lives on white rounded "sheets" (16px radius) laid onto it. Light/dark alternation is *structure*, not decoration.
- **One accent, militarized.** Amber appears only as CTA fill, 8px dot bullets, chips, radial blooms, icon strokes. ~24 amber occurrences vs ~1,900 black on the homepage.
- **Scale replaces weight.** 80px headlines at weight 400, −2.5% tracking, on every page — even 15-word article titles. Nothing bolds; things simply occupy space.
- **Two voices.** Variable sans for narrative; mono-uppercase for the "system layer" (nav, chips, buttons, breadcrumbs with `/` and `>` grammar). They never blur.
- **Hairlines are the connective tissue.** 1px rules structure heroes, grids, accordions, ledgers. Max two shadows site-wide. No boxes.
- **Motion restraint with one indulgence.** 150ms utility transitions everywhere; the single luxury is a 1.2s `cubic-bezier(0.33,0,0,1)` image zoom+brighten on hover. 40s linear ticker. Everything `motion-safe:` gated.
- **Evidence over claims.** Autoplay videos of real machines; photography art-directed so the hardware itself carries the accent color.
- Signature kit: floating white header card · hero bottom information rail · amber dot bullet · eyebrow chip with `/` prefix · split band (h2 | hairline + dot-paragraph) · hairline feature grids · milestone ledger · scroll puck · radial bloom.

### Scale.com — the choreography lesson
- **One grotesk, one weight, huge ratio.** aeonik 400 at 116/64/40/24/16/11px, −1% tracking on all display sizes. Hierarchy = size + gray + case, never bold.
- **The sans/mono duet as brand voice.** 11px uppercase mono labels (+5% tracking) with a tiny glyph prefix on *everything* — the "apparatus" layer.
- **Annotation as identity.** Bounding boxes with corner ticks, dotted leader lines, mono captions overlaid on photos/3D/diagrams — the product becomes the design language.
- **Wireframe depth.** White 1px line-art 3D (WebGL) on black; shadows nearly absent; elevation via background-tier contrast and hairlines.
- **Keynote-paced, scroll-owned motion.** Lenis everywhere; pinned pull-apart 3D stacks (~1800px runways); word-by-word statement reveals on black; 150/300/600/1000ms ease-out ladder; nothing bounces.
- **Color as a scalpel.** Black/white/gray ramp + exactly ONE accent band per page (forest green, tan, or steel blue).
- **Evidence architecture.** Logo walls (brightness(0)), stat bentos with icon tiles + count-ups, case-study bands, comparison tables, giant 116px footer statement on black.
- Signature kit: inset 24px-radius hero media card · detail-mono eyebrow · giant-type footer · stat bento · annotation overlay kit · node-graph diagrams · pinned N-step walkthrough with progress segments · mono "instrument" sub-aesthetic for data sections.

### Component kit — the implementation lesson
- **GSAP is 100% free now** (v3.15+): SplitText, ScrambleText, ScrollTrigger, ScrollSmoother, Flip all ship in the one package.
- **Scroll system:** Lenis (MIT, `lenis` package) + ScrollTrigger ticker glue.
- **Type moves:** SplitText masked line reveals (`type:"lines", mask:"lines"`, yPercent 110 → 0, power4.out, 0.08 stagger) + ScrambleText decode for mono labels.
- **Micro:** original Magnetic wrapper (quickTo + elastic.out), Cuberto `mouse-follower` (MIT), SVG fractal-noise grain overlay (opacity 0.03–0.06), clip-path `inset()` section wipes, `@number-flow/react` counters.
- **Hero WebGL:** three + R3F + drei + maath (all MIT) with ScrollTrigger-scrubbed uniforms (Codrops technique, MIT); `ogl` (public domain) for cheap secondary shaders.
- License flags: React Bits = MIT+Commons Clause (fine to ship); Aceternity free tier usable but not OSS; hover.dev no-redistribute; Codrops demos MIT, no attribution required.

---

## 2. The synthesis — what Novonus v2 takes from each

| Layer | Source | Decision |
|---|---|---|
| Page architecture | Sanctuary | Black body; white rounded sheets butted onto it; light/dark alternation as structure |
| Scroll choreography | Scale | Lenis + long pinned runways: statement word-reveal, 5-step pinned walkthrough with progress segments |
| Type philosophy | Both | ONE grotesk at weight 400–500, huge scale ratio, −2.5% display tracking; mono uppercase system layer with `/` + glyph grammar |
| Accent discipline | Both | ONE accent total; ≤6 sanctioned roles (CTA fill, dot bullet, chip, live marker, bloom, active link); one solid accent band per page |
| Depth language | Scale | White 1px wireframe WebGL on black; hairlines everywhere; near-zero shadows |
| Annotation motif | Scale | Corner-tick frames, leader lines, mono captions on media/diagrams |
| Signature indulgence | Sanctuary | One slow luxury move (1.2s heavy-decel zoom) against a 150ms utility system |
| Evidence structure | Scale | Stat band, ledger rows, giant-type footer statement |
| Micro-interactions | Kit | Magnetic CTAs, scramble-decode labels, grain film layer, custom dot cursor, clip-path wipes |

## 3. Anti-overlap contract (vs novonus.com)

The old site owns: purple/cyan on near-black + **cream paper** sections · Inter Tight + Crimson serif + JetBrains Mono + EB Garamond · **topographical dot-field / particle brain** hero · color-wipe (green→purple→white) text reveals · crossfade phase stage on a mesh gradient · liquid-glass dark top bar + edge sidebar · dictionary-card etymology.

Novonus v2 therefore uses **none of that**:
- **No dots, no particles, no brain, no topo field** → the WebGL identity is *flowing contour LINES* (a force-field oscilloscope landscape).
  - *Rev 2 (founder call): two brand elements are deliberately carried over — the accent is now violet `#8b5cf6`, and a clean dots-to-brain moment (`DotBrain.tsx`) lives in the Brand/etymology section as "nous, rendered literally." The hero identity remains lines, never dots.*
- **No cyan, no cream** → monochrome black/white/gray + the violet accent.
- **No Inter Tight / Crimson / JetBrains / Garamond / Kode** → **General Sans** (Fontshare, free) + **DM Mono** (Google, free).
- **No color-wipe reveals** → masked SplitText line rises + scramble decodes.
- **No glassy dark top bar** → floating **white** header card with transparent-over-hero state.
- **No cream dictionary card** → the brand etymology becomes a giant black typographic set piece with a hairline ledger.

## 4. Locked design system

**Palette**
- `--black #060605` body · `--white #ffffff` sheets · `--sheet-alt #f2f1ee`
- Ink on light `#121210` · muted-on-dark `rgba(255,255,255,.55)` · muted-on-light `rgba(18,18,16,.60)`
- Hairlines: `rgba(255,255,255,.16)` on dark / `rgba(18,18,16,.14)` on light
- **Accent `#8b5cf6`** (violet — Rev 2, founder call; originally signal orange `#ff4f00`). Roles: CTA fill · 8px dot bullet · chip outline/active · live markers + annotation ticks · radial bloom · the CTA band. Nothing else.
- Dark elevated card `#111110`; orange-band ink `#140a04`.

**Type**
- Display/body: **General Sans** (variable 200–700, Fontshare CDN) — display weight 400, −0.025em; body 400/16px/1.6.
- System layer: **DM Mono** 400/500 — 11–12px, uppercase, +0.08em, always inside chip/label grammar with `/` prefix and `▸`-style glyph.
- Scale: hero clamp(56 → 120px)/0.98 · section h2 clamp(40 → 64px)/1.05 · step titles 40px · card 20–24px/500 · body 16px · labels 11px.
- Footer statement: clamp(64 → 128px)/0.95, two lines.

**Geometry**
- Container 1360px + 24–48px gutters; sheets radius 20px with 12px page inset; cards 12px; buttons/chips 8px; pills 999px for the scroll puck + WATCH-style controls.
- 1px borders only. Two shadows max (header card `0 4px 8px rgba(0,0,0,.10)`).

**Motion**
- Lenis (lerp 0.1) + ScrollTrigger. Ladder: 150ms color/UI (`cubic-bezier(.4,0,.2,1)`) · 350ms reveals (power2.out) · 600–1000ms entrances · 1.2s `cubic-bezier(0.33,0,0,1)` image/media zoom (THE indulgence) · 40s linear ticker.
- Set pieces: hero intro gated by counter+curtain preloader · pinned word-by-word problem statement (~200vh) · pinned 5-step HOW pinned walkthrough (~500vh, progress segments, wireframe diagram morphs) · clip-path wipes between black↔sheet transitions.
- All gated by `prefers-reduced-motion` (gsap.matchMedia + CSS `motion-safe`).

**WebGL identity** — "FORCE FIELD": ~90 horizontal contour lines on a plane, vertices displaced by layered simplex noise (three.js `Line` strips, additive white `rgba(255,255,255,.35)`); one line lit in orange sweeping the field; mouse parallax ±; scroll scrubs noise amplitude down as the hero exits — the field "calms" as the story starts. Lines, never dots.

## 5. Page program (single page, top → bottom)

1. **Preloader** — black; mono counter 000→100 + wordmark; curtain wipes up; gates hero intro.
2. **Nav** — floating white header card (transparent-over-hero variant); logo left; mono links; orange pill CTA; magnetic.
3. **HERO** (black, 100svh) — force-field lines canvas · eyebrow chip `/ ROBOT PROGRAMMING …` (scramble-decode) · giant SplitText headline · hero bottom rail: hairline, orange-dot mission line, chip CTAs, circular scroll puck.
4. **Ticker** (hairline-framed, 40s) — task keywords + orange dot separators, mono.
5. **PROBLEM** (black, ~220vh pinned) — statement reveals word-by-word (#333→#fff); then three annotated ledger rows (mono numerals, corner-tick frames, footnote marks ¹²³⁴).
6. **SOLUTION** (white sheet) — Sanctuary split band: h2 left · vertical hairline · orange-dot paragraph right + pull-quote line.
7. **HOW IT WORKS** (black, pinned ~500vh) — `STEP X OF 5` mono chip, left title/body swap per step, right wireframe SVG diagram that reconfigures, bottom 5 progress segments. Steps: Demonstrate · Retarget · Verify · Deploy · Improve.
8. **WHO** (white sheet) — h2 + `WHERE IT FITS` chip row + 3-col hairline feature grid (no boxes).
9. **STATS** (black) — 4 elevated cards `#111110`: mono label + orange tick, scramble-decoded value words (Off-robot / Verified / Zero / You approve), gray caption; staggered rise.
10. **WHY** (white sheet) — 4 ledger rows (mono 01–04 · title · body) with hairlines; 1.2s-zoom treatment reserved for any imagery.
11. **SCOPE** (sheet-alt `#f2f1ee`) — split band variant.
12. **BRAND** (black) — `novo·nus` as giant outlined/solid duet type + etymology hairline ledger + punchline.
13. **CTA BAND** (solid orange sheet) — "Bring us one task." black display type; black pill + outline buttons; bloom.
14. **FOOTER** (black) — giant two-line statement (clamp to 128px), mono link/source columns (¹²³⁴ sources), legal row. Grain overlay sits over everything at 0.04.

Cursor: 8px dot + trailing ring (mouse-follower pattern), desktop only, `-pointer` grow on interactive, hidden on touch.

— Everything on the page is Novonus copy from `src/content.ts`. Design facts above are abstractions of the referenced systems, re-composed; no copy, assets, or code were taken from sanctuary.ai or scale.com.

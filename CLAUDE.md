# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server at localhost:5173
npm run build    # production build: tsc -b && vite build (output in dist/)
npm run preview  # serve the production build locally
```

There are no automated tests. Verify changes by running the dev server and inspecting in-browser (Playwright screenshot scripts in `%TEMP%\novonus-shots\` have been the working pattern).

## Architecture

**Novonus** is a single-page marketing site for an industrial-robotics startup ("robot programming for contact-rich assembly"). Vite + React 19 + TypeScript, deployed on Vercel (framework pinned to `vite` in `vercel.json`).

This codebase replaced the previous Next.js site (recoverable from git history before the "Replace v1 site with the v2 site" commit).

### Structure

- `src/content.ts` — ALL site copy lives here. Edit text here, not in components.
- `src/sections/` — one component per page section, composed in `src/App.tsx`:
  Hero, Problem, HowItWorks, Solution/Stats/Why/Who bands, Scope, Brand, CtaBand, Footer.
- `src/components/` — Nav (auto-hiding liquid-glass bar), Preloader (cinematic intro), ForceField (three.js contour-line hero background), DotBrain / MorphFigure (canvas dot-field figures), ContactModal (Web3Forms), DemoVideoModal (Vercel Blob player), Magnetic.
- `src/hooks/useReveal.ts` — masked line reveal + fade-up entrance hooks.
- `src/styles/base.css` — the whole design system: tokens, hairlines, chips, sheets, responsive rules.
- `research/` — design-system and animation research docs (inspiration.md is the master).

### Animation system

- **GSAP 3** everywhere (ScrollTrigger, DrawSVG, SplitText, ScrambleText), registered once in `src/lib/gsapSetup.ts`; **Lenis** smooth scroll drives ScrollTrigger via the ticker glue there.
- HowItWorks is a 3blue1brown-style scrubbed SVG scene: one persistent 960×720 world, five acts on a master timeline, leaf-targeted draw-on helpers, ambient loops (conveyor, robotic hand) outside the scrub.
- Problem uses pinned movements with a canvas dot brain and morphing dot figures; chapters snap one-per-scroll-gesture.
- GSAP + SVG gotcha: tweening `y`/`x` on a group with a `transform` attribute is ABSOLUTE (it replaces the translate). Bob/offset an inner group instead.

### Design system (see research/inspiration.md)

- Black body `#060605`, white sheets and deep-violet sheets (`.sheet`, `.sheet--purple`), 20px radius, `margin-inline: var(--inset)`.
- ONE accent: violet `#8b5cf6` (`--accent`). Fonts: General Sans (Fontshare) + DM Mono (labels), loaded in `index.html`.
- Label grammar: "/"-prefixed mono chips (`.chip` renders the slash via `::before`).

### Copy rules

- **No em dashes anywhere in site text.** Use commas, periods, or middots.
- Tone/style reference: `sanctuary.md` in the repo root.

### Integrations

- **Cal.com** popup booking on every "Start a pilot" button (`@calcom/embed-react`, namespace/link `deepayan`).
- **Web3Forms** contact modal (access key in `src/components/ContactModal.tsx`).
- Demo video streams from Vercel Blob (`DemoVideoModal.tsx`); the hero robot-arm loop is `public/robot-arm-hero-alpha-1080p.webm` with an mp4 fallback selected in JS (Safari can't decode VP9 alpha).

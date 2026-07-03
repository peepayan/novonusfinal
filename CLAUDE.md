# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start Next.js dev server at localhost:3000
npm run build    # production build
npm run start    # run production build locally
npm run lint     # Next.js ESLint checks
```

There are no automated tests — verify changes by running the dev server and inspecting in-browser.

## Architecture

**Novonus** is a Next.js 16 App Router marketing site for an industrial robotics company. The entire application is a single-page scroll experience.

### Key structural fact

`app/page.tsx` (~5,700 lines) contains **all React components** for the site — ~40+ components declared as named functions in a single file, organized by comment section headers. There is no `components/` directory. When adding or editing UI, work within this file.

### Page sections (top to bottom)

1. **Preloader** — Cinematic 2.95s intro: loading bar → logo pop → dock fade-in, coordinated via `IntroProvider` context
2. **Hero** — Pinned six-slide presentation with typewriter terminal text and topographical dot-field animation
3. **Pipeline** — Sequential data/training process visualization with animated fluid arrows and dots
4. **FluidSection** — Contextual transition content
5. **Evidence** — Stats cards with count-up animations on scroll-enter
6. **Etymology** — Dictionary entry on "νοῦς" (nous), newspaper aesthetic
7. **Footer** — Contact and closing content

### Animation system

All animations use **Framer Motion 11**. Patterns used throughout:
- `useScroll()` + `useTransform()` for scroll-driven parallax and reveals
- `motion.div` with `initial/animate/exit` for entrance choreography
- `IntersectionObserver` via Framer's `whileInView` for lazy triggers
- `IntroProvider` context gates section entrance animations until the preloader finishes

### Styling

- **Tailwind CSS v4** — uses the new `@import "tailwindcss"` syntax in `globals.css` (not `@tailwind base/components/utilities`)
- **Design tokens** in `globals.css`: `--ink` (#000), `--paper` (#fff), `--cyan` (#6d28d9 purple), `--royal` (#2563eb), `--turq` (#5eead4)
- **Font override**: All CSS font variables are rewired to `--font-kode-mono` (monospace). The site loads many Google Fonts but Kode Mono takes precedence globally — this is intentional.
- Custom keyframes and utility classes (`.bg-grid`, `.glow-accent`, `.animate-marquee`, `.eyebrow`) are defined in `globals.css`

### Fonts

TT Norms Pro (5 weights, self-hosted WOFF2 in `app/fonts/`) is loaded in `layout.tsx` via `next/font/local`. Kode Mono is loaded from Google Fonts. All font CSS variables are then overridden in `globals.css` to point to Kode Mono.

**IMPORTANT — font rule**: NEVER use Kode Mono (`--font-kode-mono`, `var(--font-kode-mono)`, or `'Kode Mono'`) in any new or edited UI components. Use **Inter Tight** (`var(--font-inter-tight)`) for display headings and **Inter Tight** or **TT Norms Pro** for body text instead.

### No backend

Pure static/client-side rendering. No API routes, no database, no server components doing data fetching.

## Tech stack

| | |
|---|---|
| Next.js | 16.2.4 (App Router) |
| React | 18.3.1 |
| TypeScript | 5, strict mode, path alias `@/*` → root |
| Tailwind CSS | 4.0 with `@tailwindcss/postcss` |
| Framer Motion | 11.11.17 |
| @paper-design/shaders-react | 0.0.76 — custom GLSL shader visuals |
| Lucide React | icons |

## Deployment

Vercel — `vercel.json` marks this as a Next.js project. No special build configuration needed beyond `npm run build`.

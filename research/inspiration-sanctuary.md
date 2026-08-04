# Design Inspiration Dossier — sanctuary.ai

> Exhaustive design-system teardown of https://sanctuary.ai (captured 2026-08-03, desktop 1440×900 + one mobile 390×844 pass).
> Method: rendered Playwright/Chromium analysis — 78 screenshots (hero, mid-scroll, full-page, hover, dropdown, mobile, preloader states), computed-style extraction on every page, plus static analysis of the theme's compiled CSS (108KB) and JS (430KB) bundles.
> Purpose: design facts and patterns only, for a brand-new site with different copy. No copy reproduced beyond ≤10-word style fragments; no assets downloaded.

---

## 1. Site Map Analyzed

Discovered via nav/footer crawl + `sitemap.xml` (Yoast index → page/post/press sitemaps). 15 pages fully rendered, scrolled, and measured:

| Page | URL | Height @1440 | Theme |
|---|---|---|---|
| Home | `/` | 6,929px | dark hero → light sheets → dark close |
| Solutions (roadmap) | `/solutions/` | 7,676px | dark-dominant |
| Physical AI | `/solutions/physical-ai/` | 7,138px | light sheets on black |
| Robotic Hands | `/solutions/hydraulic-hands/` | 5,499px | light sheets on black |
| About Us | `/about-us/` | 4,087px | fully dark |
| Team | `/team-members/` | 8,046px | fully dark, white cards |
| Milestones | `/milestones/` | 4,140px | fully dark |
| News index | `/news/` | 3,957px | dark, white cards |
| Press | `/press/` | 4,846px | dark, white cards |
| Careers | `/careers/` | 5,895px | dark hero → light sheets |
| Contact | `/contact-sanctuary-ai/` | 1,754px | fully dark, dark form |
| News article A (industrial strategy) | `/news/…industrial-robotics…/` | 5,307px | dark article body |
| News article B (zero-shot demo) | `/news/…zero-shot…/` | 3,503px | dark article body |
| News article C (tactile sensors) | `/news/…tactile-sensors…/` | 4,179px | dark article body |
| Terms (legal) | `/terms/` | 4,292px | dark — legal pages keep full art direction |

Tech stack found: WordPress 7 with a fully custom block theme (`sai`, credited "Website By Takt"), Vite-compiled **Tailwind CSS v4** bundle, **GSAP 3.15.8 + ScrollTrigger**, **Swiper**, **Alpine.js** for state (nav/accordions/filters), nprogress (route progress bar), IntersectionObserver + `matchMedia` gating, native `scroll-behavior: smooth`. No three.js, no Lenis/locomotive, no custom cursor, no canvas — every "wow" moment is video, photography, or CSS/GSAP.

Custom block vocabulary (their section system, visible in class names): `takt-hero`, `takt-header`, `takt-media-content`, `takt-video-carousel`, `takt-post-carousel`, `takt-press-ticker`, `takt-icon-card-grid`, `takt-call-to-action`.

---

## 2. Design System

### 2.1 Palette (measured hex, from CSS custom properties + computed styles)

Core tokens (defined as `--color-*` in their Tailwind theme):

| Token | Hex | Role |
|---|---|---|
| black | `#000000` | **Body background of the entire site.** Dark sections, footer, text on light |
| white | `#ffffff` | Sheet/card surfaces, text on dark |
| charcoal | `#262121` | Warm near-black (accent dark surface, some text) |
| phoenix (amber) | `#e68c24` | THE single accent: primary buttons, chips, dot bullets, radial glows, icon gradients, link-active |
| blue (pale blue-grey) | `#d9dfea` | Secondary surface: testimonial cards, scroll puck, alternate card fills |
| grey-light | `#eaeaea` | Eyebrow pill fill, mobile menu panel, light alt surface |
| grey | `#8d8d8d` | Muted text |
| grey-dark | `#505050` | Secondary text/borders |
| hairline grey | `#d0d0d0` | 1px rules on light surfaces (140 occurrences on home alone) |
| dark surfaces | `#121212`, `#2a2a2a`, `#474444` | Elevated dark panels, form fields |
| muted mid | `#7b7b7b` | Placeholder/disabled text |

Rules observed:
- Near-monochrome black/white base; **one warm accent used with total discipline** (24 computed occurrences of amber on home vs 1,908 of black).
- No color gradients except: (a) black↔transparent photographic vignettes, (b) the amber radial bloom utility `has-radial-gradient-left/right` → `::before { background: radial-gradient(50% 50%, #e68c24, rgba(230,140,36,0)) }`, heavily blurred, bleeding off-canvas at section edges, (c) amber→grey gradient strokes inside line icons.
- Hairlines: `1px` at `rgba(0,0,0,0.5)` on light surfaces, `rgba(255,255,255,~0.2–0.5)` on dark, `#d0d0d0` for card borders.
- Shadows almost banned. Exactly two in use: header card `0 4px 8px rgba(0,0,0,0.10)` and a faint `0 -1px 10px rgba(172,171,171,0.3)`.

### 2.2 Typography

Two variable families only (Adobe/CoFo "CoFo Sans" pair — substitute freely):

- `--font-sans: "cofo-sans-variable"` (weight axis 100–900 loaded) — ALL headings + body.
- `--font-mono: "cofo-sans-mono-variable"` (400–900) — ALL "system" text: nav, buttons, chips, eyebrows, breadcrumbs, category tags, footer links, form labels.

The core trick: **display type is huge but weight 400** — authority through scale, never boldness. Bold (500/700) appears only in: open accordion titles, inline article emphasis, footer column headings (18px/700).

Measured scale (computed, desktop 1440):

| Role | Size/Line | Weight | Tracking | Notes |
|---|---|---|---|---|
| h1 (every page) | **80px / 80px (1.0)** | 400 | **−2px (−0.025em)** | White, left-aligned, wraps 2–4 lines; even long article titles use it |
| h2 display | 64px / 80px | 400 | −1.6px | Dark-section statements |
| h2 standard | 48px / 60px (1.25) | 400 | −1.2px | Section headings |
| h2 compact / h3 feature | 40px / 40–50px | 400 | −1px | Split-band headings, accordion titles ~32px |
| card h3 | 20px / 28px | 400 | −0.5px | News/press card titles |
| icon-card h3 | 24px / 33px | 400 | −0.6px | Feature columns |
| body | 16px / 26px | 400 | −0.4px | Dominant body style |
| body large / intro | 18px / 28px | 400 | 0 | Hero mission lines, lead paragraphs |
| small / captions / footer | 14px / 20px | 400 | 0 | |
| mono button/label | 16px, uppercase | 400 | **+0.8px (+0.05em)** | All CTAs |
| mono nav | 14–16px, uppercase | 400 | 0 to +0.8px | |
| mono micro (tags, SCROLL) | 12px / 16px, uppercase | 400 | 0 | Category pills, scroll puck |

Tailwind v4 tokens customized in their theme: `--text-3xl: 2rem/1.2`, `--text-8xl: 5rem/1`, `--tracking-tight: -0.025em`, `--tracking-tighter: -0.05em`, `--tracking-wider: +0.05em`, `--leading-relaxed: 1.625`. Tracking is applied as computed px proportional to size (−0.4/−0.5/−1/−1.2/−1.6/−2px) = a constant −2.5% at every scale.

Typographic voice: sans = story (sentence case, tight, calm); mono = machine (uppercase, wider, always in a chip/label/button). The two never blur.

### 2.3 Layout & Spacing

- **Container**: `--max-container: min(100% − 2·gutter, 100rem)` → content max **1600px**; gutter responsive `1rem → 2rem → 3rem` (48px at desktop, giving the 1344px working width measured everywhere).
- Narrow measures: article body **848–896px** centered; intro paragraphs capped ~640–800px (`max-w` 30/40/48/56rem tokens, `65ch` prose).
- **Header**: fixed, total 88–96px (`--fixed-header-height: 6rem`); inner card 1344×72px.
- **The sheet architecture** (the site's structural signature): `<body>` is black; content blocks are white or pale rounded "sheets" (radius 16px, sometimes 24px) laid on the black canvas, usually butted edge-to-edge with 0 margins so vertical rhythm lives INSIDE blocks. Repeating media-content bands measured at exactly **628px tall** each — modules have uniform heights, giving a metronome rhythm (900 hero / 628 / 628 / 1437 carousel / 628 / 1265 posts / 292 ticker / 600 CTA on home).
- Split-band grid: recurring 2-col pattern — h2 left (~45%), right column starts with a **vertical 1px hairline** + amber-dot paragraph (~45%), optional chip button below. Left/right roles swap freely.
- Feature grids: 3-col and 4-col with **vertical hairline dividers between columns** (no card boxes on light sheets).
- Section padding inside sheets ≈ 80px vertical (`pb-20` measured on hero; `py-6`+internal spacing elsewhere); gaps 24px (`gap-6`).
- Breakpoints: Tailwind defaults + custom `3xl: 100rem`.

### 2.4 Border / Radius / Shape language

| Element | Radius |
|---|---|
| Buttons, chips, eyebrow pills, inputs | **8px** |
| Cards, header card, sheets, media | **16px** (28 occurrences on home — the house radius) |
| Large media frames | 24px |
| Tags, WATCH pill, scroll puck, pagination dots, quote badge | fully round (9999px / 50%) |

Borders: 1px everywhere, no 2px anywhere. Outlined buttons = `1px solid currentColor` + transparent fill. A `--mask-border-width: 1px` drop-shadow trick creates hairline outlines around masked logo art (the embossed dark-on-dark hero glyph).

### 2.5 Motion & Interaction (measured)

Libraries: GSAP 3.15.8 + ScrollTrigger (bundled, module-scoped), Swiper for all carousels, Alpine for state, CSS transitions for micro-UI. `scroll-behavior: smooth` native. **Every animated utility is `motion-safe:` prefixed** — full prefers-reduced-motion compliance.

Timing vocabulary:
- Default UI transition: **0.15s cubic-bezier(0.4, 0, 0.2, 1)** (color/bg/border on buttons, opacity on links).
- Header card state: `transition-all 200ms`.
- Reveals: 0.3–0.4s `opacity` + small `transform` (measured `opacity 0.4s, transform 0.4s`).
- GSAP durations in bundle: mostly **0.35s** and **0.12s**, then 0.25/0.5; easings **power2.out** (dominant), power2.in, back.out(2), power1.inOut; staggers **0.05 / 0.12**.
- **Signature move — card image zoom**: image inside `.group` card gets `transition: scale 1.2s cubic-bezier(0.33, 0, 0, 1), filter 1.2s cubic-bezier(0.33, 0, 0, 1)` (+0.15s delay); hover state = `scale: 1.1` + `brightness(1.1)`. That bezier (instant start, extremely long decelerate) makes imagery feel heavy and expensive. Used on every news/press/photo card.
- Arrow micro-motion: `group-hover:translate-x-1` (4px), `translate-x-0.5`, `-translate-y-0.5` lifts, `scale-105` on small elements.
- Press ticker: CSS `@keyframes ticker-scroll`, **40s linear infinite** on a duplicated flex track — very slow, dignified marquee.
- Button hover: amber pill inverts to **black bg / white text** in 0.15s (via `--btn-hover-*` vars that flip to white-on-black inside dark sections — theme-aware hover). Outlined buttons fill with currentColor scheme the same way.
- Nav link hover: opacity dim 0.15s (no color change). Footer links: opacity dim; active/current link rendered amber.
- Accordion (Alpine): open ≈ height auto-expand w/ `transition: all`, open title switches 400 → 700 weight, thin arrow rotates 180°.
- Carousels: Swiper with 8px round bullet dots (`inactive opacity 0.2, currentColor`) bottom-left + 40px square outlined prev/next buttons (1px border, 8px radius) bottom-right, both sitting under a full-width hairline.
- Page load: **no preloader**. nprogress thin bar on navigation; layout renders instantly as skeleton (hairlines + chips first), media fades in ~0.3–0.4s. Hero video autoplays immediately.
- No parallax, no pinned scroll-jacking, no horizontal scroll sections, no custom cursor, no scrollbar styling. Restraint IS the motion brand: one slow luxurious hover zoom vs. an otherwise 150ms snappy system.

### 2.6 Imagery & Texture

- **Video-first**: 4 autoplay/loop/muted MP4s on home alone (full-bleed 1440×900 hero reel + three 624×468 inline demo loops). Every product claim is paired with a video of a real robot doing a real task — unedited-feeling, industrial settings.
- Photography: real factories, labs, candid team shots. Warm-graded; ambient darks crush to true black so photos melt into the black body. Several heroes are macro shots of hardware (amber-anodized metal, cables, PCBs with green LEDs) — **hardware itself is art-directed to carry the amber accent** (even a top-down photo of amber pill bottles echoes the brand color).
- Dark hero treatment: full-bleed media + overlay `linear-gradient(#000 0%, transparent 40%, transparent 60%, #000 100%)` — black vignette top and bottom, guaranteeing white nav/headline legibility. (Mobile variant 0/30/40/100.)
- No grain, no noise, no duotone, no 3D renders (one exception: a humanoid concept render), no stock illustration. Diagrams appear as thin-line technical schematics with small circular photo insets.
- Iconography: ~96px thin-stroke geometric line icons with **amber→grey gradient strokes**; logo mark is a hexagonal knot rendered in contexts from plain white to embossed dark-on-dark (drop-shadow 1px hairline mask trick).
- White-card-on-black galleries: news/press/partner logos live in white 16px-radius cards, giving the dark pages a "printed documents on a black table" quality.

---

## 3. Page-by-Page Anatomy

### 3.1 Home (`/`)
1. **Hero (100vh, black)** — full-bleed autoplay video, top+bottom black vignette. Fixed header over it (transparent-at-top variant: white logo/links; amber CTA pill stays filled). Under the header: outlined eyebrow chip (mono 14px). H1 80px white, left, ~70% width. **Hero bottom strip**: full-width hairline, then a 2-col row — left: amber dot + 18px mission line; right: two chip-links (amber filled + outlined); far right: **96px pale-blue circular scroll puck** (`#d9dfea`, ↓ arrow + mono "SCROLL"). This bottom-strip anatomy repeats on every hero.
2. **Media-content band A (white sheet, 628px)** — "Trusted industrial partner…" pattern: framed 16:9 photo card left, right column = eyebrow pill, 40px h2, hairline, amber-dot body, chip CTA. Partner-logo row beneath.
3. **Media-content band B (628px, light grey)** — mirrored: text left, technical line-diagram right (robot schematics with circular photo insets).
4. **Video carousel (1437px, white)** — "/ TECH DEMO" eyebrow pill; 48px h2 left of vertical hairline; stat chips ("99.5%+…" style); 3-up 624×468 autoplay video cards; Swiper dots + arrows under a hairline.
5. **Use-case band (full-width dark)** — 40px white h3 over large dark industrial photos, WATCH pill (white, fully-round) top-right of media.
6. **Media-content band C (628px, pale blue `#d9dfea`)** — team photo card + text; amber "MEET…" + outlined "EXPLORE…" buttons.
7. **Post carousel (1265px, white)** — 48px h2; 3–4 white news cards (image top w/ 1.2s zoom hover, category pill, 20px title, "Read More →").
8. **Press ticker (292px)** — "/ IN THE NEWS" pill; hairline; 40s marquee of headline + amber dot separator + white source-tag pills; prev/next arrows.
9. **CTA band (600px)** — photographic grey-gradient bg with warm amber bloom at edges (`has-radial-gradient-left`), white 64px "Let's Talk." headline, large amber button right.
10. **Footer (black, 504px)** — centered logo lockup; 4 hairline-separated columns (sans-700 18px titles, mono 14px uppercase links, current link amber); social glyph row; legal row with mono links + builder credit.

### 3.2 Solutions (`/solutions/`)
- Hero: **black with floating mosaic** — a loose grid of small square tiles (greyscale photo thumbs + solid amber squares) scattered on a faint grid, like a pixel-map; outlined eyebrow chip; 80px white h1; standard hero bottom strip.
- **Numbered slide deck** (dark): pagination chips `01–05` top-left; each slide = statement h2 (white, 40px) + large product render/photo (humanoid with amber geometric chest detail).
- **Accordion section (white sheet)**: split-band intro (48px h2 + hairline + amber-dot para + outlined chip), then 5 accordion rows — 32px sans titles, 1px hairlines, thin down-arrows; open row: bold title, 16px body; giant blurred amber radial bloom bleeding from the left edge.
- **Proof band**: "/ PROOF OF" pill; 48px h2; WATCH-labeled video card carousel.
- Team band (pale blue), black Contact band, footer.

### 3.3 Physical AI (`/solutions/physical-ai/`)
- **Split-card hero**: white 16px-radius sheet on black; left half = full-bleed photo (amber-toned subject), right half = breadcrumb chip (mono, "/" + ">" separators), 40px h1, amber-dot para, amber button. (Product pages use this compact card hero instead of full-bleed.)
- "End-to-end…" split band; **4-col feature grid with vertical hairlines** (20px h3 + grey body).
- Statement band ("Real performance…" style) + 2-up large video cards.
- Hardware-compatibility diagram band; CTA; footer.

### 3.4 Robotic Hands (`/solutions/hydraulic-hands/`)
- Same split-card hero (photo left / text right).
- "The Problem" — numbered list rows with hairlines.
- Full-width photo interlude.
- Benefits split band → **3×2 feature grid** with hairline dividers.
- "Recent Demonstrations": black video-card carousel (rounded 16–24px, caption + WATCH pill, prev/next).
- Inline contact form block (dark) + condensed logo bar; footer.

### 3.5 About (`/about-us/`) — fully dark
- Hero: macro photo of amber-anodized hardware with engraved logo; 80px white h1; standard bottom strip (amber + outlined buttons).
- "Solving…" — 3-col icon-card grid on black (24px white h3, grey body, links).
- News band: white cards on black + amber "EXPLORE ALL NEWS" button.
- Funding partners: grid of white logo cards on black; footer.

### 3.6 Team (`/team-members/`) — fully dark, the "documents on black" page
- Hero: black with giant **embossed dark-on-dark logo glyph** (1px hairline mask edges); breadcrumb chip; 80px "Our Team"; bottom strip.
- Leadership: white sheet cards — circular headshots, name/title rows, LinkedIn glyphs.
- Board: white card with table-like hairline rows.
- Photo collage band (candid grid).
- Credential cards: white sheets listing stat rows (checklist style).
- **Stats band**: 4 white cards with big numerals (~48–64px) + mono captions.
- Accordion + product photo band; CTA; footer.

### 3.7 Milestones (`/milestones/`)
- Hero: macro electronics photo (cables/PCBs, green LEDs); 80px h1; bottom strip.
- Two mirrored milestone sections (Physical AI / Robotic Hand): photo card + **white "Completed Milestones" card containing year-by-year hairline rows** (mono year + sans title; current row bolded). Timeline-as-ledger, no graphics.
- Team video band; condensed contact bar; footer.

### 3.8 News index (`/news/`)
- Dark hero: 80px h1 + amber-dot subline.
- Featured band: large photo card + 2 white text-cards with co-brand logo headers, category pill, title, Read More →.
- **Filter toolbar**: white 48px inputs/selects, 1px black border, 8px radius, sans 18px; result count.
- Card grid: 3–4 col white cards (image top, date + category pills, 20px title). Numeric pagination chips.
- Video thumb strip; condensed contact; footer.

### 3.9 Press (`/press/`)
- Same skeleton as news; press cards are **text-only white cards**: source chip (mono 12px pill) + 20px title + Read More. Grid of ~9/page + pagination; then "Latest News" carousel; footer.

### 3.10 Careers (`/careers/`)
- Full-bleed photo hero (lab, cool tones) + 80px h1 + amber "EXPLORE OPEN POSITIONS".
- Intro sheet + 2-up photo grid.
- **"Why We're Here" icon columns**: white sheet, 3 cols split by vertical hairlines, amber-gradient line icons ~96px, 24px h3, grey body.
- **Testimonial carousel**: pale-blue 16px-radius cards, 20px quote, mono uppercase role label, **48px black circular quote badge** bottom-right; Swiper dots + outlined arrows under hairline.
- "Life at…" split band + candid photo masonry (~6 tiles).
- Dark job-board band (embedded listings); footer.

### 3.11 Contact (`/contact-sanctuary-ai/`) — 1,754px, shortest page
- Fully dark. Breadcrumb chip, 48–80px h1, amber-dot intro.
- Split: left 40px h2 + note; right **dark form** — small white labels, transparent inputs with 1px grey borders (8px radius), select, consent checkbox, outlined mono submit button. Footer.

### 3.12 News articles (3 sampled) — dark editorial
- Black article pages: breadcrumb chip trail, **80px h1 even for 15-word titles** (wraps 4–5 lines — monumental), date/category chips.
- Body: white 16px/28px text on black, ~848px centered measure; inline bold names; embedded 16:9 video cards (16–24px radius, WATCH pill); captions 14px grey.
- Boilerplate block: hairline + logo lockup.
- **File-tab sheet**: related-news section is a grey sheet with a literal folder-tab chip ("/ NEWS +") attached to its top-left corner — the eyebrow becomes a physical tab.
- Share row, news carousel, condensed contact, footer.

### 3.13 Terms (`/terms/`)
- Even legal pages stay on-brand: black bg, breadcrumb chip, ~72–80px white h1, centered white body, bold white h2s. No de-arted "plain" template.

### 3.14 Navigation & chrome (global)
- **Floating header card**: fixed; inner white card `rounded-2xl bg-white p-4 shadow-[0_4px_8px_0_rgba(0,0,0,0.10)] transition-all duration-200`, 1344px wide, 72px tall, 48px side margins. Over dark heroes at top: transparent variant, white text. Contents: logo lockup left; mono nav items + thin chevrons; outlined CAREERS pill; filled amber pill CTA. Dropdowns triggered by button click (Alpine).
- Mobile: white top bar + hamburger → full-screen `#eaeaea` panel with mono uppercase accordion nav (~20px rows, chevrons).
- Buttons (all): mono 16px uppercase +0.8px, **padding 8px 16px, radius 8px**; filled amber (black text) / outlined 1px currentColor; hover inverts to black/white in 0.15s.
- Chips/eyebrows: same 8×16/8px geometry; fills: `#eaeaea` (light), amber, or 1px outline; slash prefix (some via CSS `content: "/"`), `>` breadcrumb separators via `content: ">"`.
- Category tags: 4px 12px, fully-round, white fill, mono 12px.
- Scroll puck: 96px `#d9dfea` circle, ↓ + mono "SCROLL", desktop-only.
- No custom cursor; default scrollbar; cookie banner is stock CookieYes (unbranded — visibly third-party).

---

## 4. Signature Components (the reusable kit)

1. **Floating white header card** — rounded-2xl white bar with 10%-black shadow hovering over every page; transparent variant over dark heroes.
2. **Hero bottom strip** — hairline-topped row: amber-dot mission line | chip CTAs | circular scroll puck. Turns the hero's bottom edge into an information rail.
3. **Amber dot bullet** — 8px round amber dot preceding every intro paragraph; the site's smallest, most repeated brand gesture.
4. **Eyebrow chip** — mono uppercase pill w/ "/" prefix; fills or outlines; doubles as breadcrumb (`/ HOME > PAGE`) and as folder-tab on sheets.
5. **Split band** — h2 (40–48px) on one side; vertical hairline + amber-dot paragraph + chip button on the other. The default section opener everywhere.
6. **Hairline feature grid** — 3–4 columns divided by 1px vertical rules; no boxes, no shadows.
7. **White card on black** — 16px-radius white sheets/cards floating on the black body (news, rosters, stats, milestones, logos).
8. **1.2s zoom card** — group-hover image `scale(1.1) brightness(1.1)` with cubic-bezier(0.33,0,0,1); the single indulgent motion.
9. **Press ticker** — 40s linear marquee: headline · amber dot · source pill, with hairline frame and arrow controls.
10. **Video demo card** — 16:9 rounded media with white round WATCH ▶ pill; 3-up carousels of autoplaying loops.
11. **Testimonial card** — pale-blue rounded card + mono role label + black circular quote badge.
12. **Milestone ledger** — white card of hairline rows (mono year + sans item, current row bold). Timeline without a timeline graphic.
13. **Scroll puck** — 96px pastel circle with arrow + mono label; also reused as prev/next and WATCH controls (round-control family).
14. **Amber radial bloom** — `::before` radial-gradient amber glow, blurred, hung off section corners (`has-radial-gradient-left/right`).
15. **Dark form** — transparent inputs, 1px grey borders, 8px radius, mono submit; forms feel like terminal panels, not SaaS forms.

---

## 5. What Makes It Captivating (analysis)

1. **A single structural metaphor** — white "documents" laid on a black table. Because `<body>` itself is black, light sections read as physical sheets (rounded corners reinforce it, the article "file tab" makes it literal). Light/dark alternation is architecture, not decoration.
2. **One accent, militarized** — amber appears only as: CTA fill, dot bullet, chip, glow, icon gradient, active link. Everything else is grayscale. So every amber pixel is a pointer to action or identity, and the eye learns the rule within seconds.
3. **Scale replaces weight** — 80px/weight-400/−2.5%-tracked headlines feel monumental yet calm. Nothing shouts; it simply occupies space. Long article titles at 80px are a confidence statement.
4. **Machine voice vs. human voice** — the mono/uppercase "system layer" (nav, chips, labels, buttons) sits visually apart from the sans "narrative layer". The UI feels like instrumentation wrapped around a story.
5. **Motion restraint with one indulgence** — the entire site runs on 150ms utility transitions; the only slow move is the 1.2s heavy-deceleration image zoom. That contrast makes hovers feel expensive, and the site feel engineered rather than animated.
6. **Evidence over claims** — autoplaying videos of real machines doing real tasks in real factories, everywhere. The aesthetic thesis: *we don't decorate; we document.* Even the palette's amber is planted in the photography (anodized parts, pill bottles) so brand and evidence fuse.
7. **Hairlines as the connective tissue** — 1px rules structure heroes, grids, accordions, tickers, ledgers. They read as engineering drawings and let the design skip boxes/shadows entirely.
8. **Uniform module heights** (628px media bands, 600px CTA) create a steady scroll cadence — the page feels metered, like a spec sheet.
9. **Total system integrity** — legal pages, forms, cookie-adjacent chrome, mobile menu all obey the same rules. (The one stock element — the blue CookieYes widget — instantly reads as foreign, proving how tight the rest is.)

Emotional net effect: **precise, warm-restrained, cinematic-industrial** — a lab notebook art-directed like a luxury magazine.

---

## 6. Top 15 Steal-Worthy Patterns (with GSAP + three.js + React implementation notes)

1. **Black-body / white-sheet architecture.** Set `body { background:#000 }`; render sections as `rounded-[16px] bg-white` sheets butted at 0-margin. Implementation: each sheet is a React `<Sheet dark|light>` wrapper; use ScrollTrigger `onEnter` to toggle a `data-theme` attr on `<html>` so nav/buttons re-skin via CSS vars (`--btn-hover-bg` flip like theirs).
2. **Floating header card with transparent-over-hero state.** Fixed header, inner `max-w-[1600px] rounded-2xl p-4 shadow-[0_4px_8px_rgba(0,0,0,0.1)] transition-all duration-200`. Add a ScrollTrigger on the hero: while hero is in view at top, apply `bg-transparent text-white shadow-none`; else `bg-white text-black`.
3. **Hero bottom information rail.** Compose hero as `min-h-screen flex flex-col`; last child = `border-t border-white/30 pt-6 grid grid-cols-[1fr_auto_auto]` containing accent-dot mission line, chip CTAs, and a scroll puck. Animate the hairline `scaleX 0→1` (GSAP, 0.8s power2.out) on load — "system booting".
4. **The 1.2s heavy-decel image zoom.** On card media: `transition: scale 1.2s cubic-bezier(0.33,0,0,1), filter 1.2s cubic-bezier(0.33,0,0,1); transition-delay: .15s`; hover → `scale:1.1; filter:brightness(1.1)`. Gate with `@media (prefers-reduced-motion: no-preference)`. Reserve for imagery only; keep buttons at 150ms so the contrast reads.
5. **Accent-dot paragraph + vertical hairline split band.** Reusable `<SplitBand>`: `grid grid-cols-2`; right cell `border-l border-black/20 pl-10` with an 8px accent dot inline-block before the lead. GSAP entrance: heading y:24→0 / hairline scaleY 0→1 / paragraph fade, stagger 0.12, duration 0.35, power2.out.
6. **Mono system-layer.** Define `--font-mono` for ALL nav/labels/buttons/chips: 12–16px, uppercase, +0.05em. Eyebrow component renders `::before { content:"/" }` and breadcrumbs join with `content:">"` — the slash/chevron grammar is free brand equity.
7. **Chip grammar (one geometry, three fills).** Single `<Chip>` primitive: `px-4 py-2 rounded-lg font-mono uppercase text-[16px] tracking-[0.8px]`, variants filled-accent / outlined-1px / neutral-fill; tags variant `px-3 py-1 rounded-full text-[12px]`. Buttons hover-invert via CSS vars in 0.15s.
8. **Press ticker.** Duplicate a flex track ≥2×, `@keyframes ticker { to { transform: translateX(-50%) } }` **40s linear infinite** (pause on hover); items = headline + accent dot + source pill; frame with top/bottom hairlines + arrow buttons. With GSAP: `gsap.to(track,{xPercent:-50,ease:"none",duration:40,repeat:-1})` for scrub/hover-speed control.
9. **Milestone ledger instead of timeline art.** White rounded card; rows `grid grid-cols-[90px_1fr] py-4 border-t border-black/20`, mono year + sans item, current row weight 700. Reveal rows with ScrollTrigger `batch`, stagger 0.05, y:12, 0.35s.
10. **Amber radial bloom utility.** `.bloom-left::before { content:""; position:absolute; inset:-20%; background:radial-gradient(50% 50%, var(--accent), transparent 70%); filter:blur(80px); pointer-events:none }` hung off section corners. three.js upgrade: replace with a soft additive sprite/plane that drifts ±20px on scroll (useTransform of scroll progress) for living light.
11. **Hero video vignette.** Full-bleed `<video autoplay muted loop playsinline>` + overlay `linear-gradient(#000 0%, transparent 40%, transparent 60%, #000 100%)`. Guarantees white text legibility with zero text-shadows. three.js option: render video as a texture on a plane and add subtle scroll-scale (1.0→1.06) for depth.
12. **Uniform module heights.** Fix repeating band components to a constant height (their 628px). The consistent cadence + `scroll-behavior: smooth` (or Lenis) yields the "metered spec-sheet" scroll feel; makes ScrollTrigger choreography trivially predictable.
13. **Numbered slide-deck section.** Dark section with `01–05` mono pagination chips; implement as pinned ScrollTrigger (`pin:true, snap:1/(n-1)`) crossfading slides (opacity 0.35s power2.out) while chips fill; or Swiper with custom fraction pagination for the non-pinned equivalent.
14. **White-cards-on-black content system.** All CMS content (news, people, stats, logos) rendered as white rounded-2xl cards on the black body — instant hierarchy, photography pops, and dark pages stay readable. Pair with mono metadata chips inside each card.
15. **Skeleton-first load + route progress.** Skip preloaders: SSR the layout so hairlines/chips paint immediately, fade media in 0.3–0.4s on ready, and use a 2px top progress bar (nprogress-style) for route changes; GSAP `from` autoAlpha on `.reveal` batches (0.35s, stagger 0.05–0.12) for entrances. Feels fast, engineered, un-flashy.

Bonus discipline rules worth adopting wholesale: max two shadows site-wide; 1px borders only; weight 400 display type at −2.5% tracking; accent color in ≤6 sanctioned roles; wrap every animated utility in `motion-safe:`; art-direct photography to contain the accent color.

---

*Sources: 78 PNGs in `C:\Users\deepa\novonus-v2\research\shots\sanctuary\` and 20 JSON computed-style dumps in `C:\Users\deepa\novonus-v2\research\data\sanctuary\` (per-page typography, palette counts, section maps, geometry probes, hover-state measurements). Audit scripts in `C:\Users\deepa\novonus-v2\research\scripts\`.*

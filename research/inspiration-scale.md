# Scale.com — Design-System Research Dossier

Research date: 2026-08-03. Rendered at 1440×900 (Chromium/Playwright), 97 screenshots in `research/shots/scale/`, computed-style JSON per page in `research/data/`. This document captures design facts and patterns only — for a new build with different branding and copy.

---

## 1. Site Map Analyzed

17 distinct pages rendered, scrolled, and measured:

| Page | URL | Notes |
|---|---|---|
| Homepage | scale.com/ | 11,310px tall; WebGL canvas hero; 3 looping MP4s |
| Data Engine (product) | /data-engine | 7,755px; template A ("photo-card hero") |
| GenAI Platform (product) | /genai-platform | 16,479px; dark-first; pinned 4-step slideshow; WebGL |
| Donovan (gov product) | /donovan | Template A; architecture-diagram section |
| Enterprise (solutions) | /enterprise | 15,403px; constellation hero; WebGL circuit visual; 4 videos |
| US Public Sector | /public-sector | Template A; 6-card photo grid |
| Global Public Sector | /global-public-sector | Template A; warm architectural hero photo |
| Automotive | /automotive | Template A; LiDAR/segmentation imagery |
| Physical AI | /physical-ai | Template A; robotics photo sets, chart panels |
| Customer story | /customers/time | Editorial two-column case-study template |
| Blog index | /blog | Filter pills + featured grid + table-row list |
| Blog post (research) | /blog/swe-bench-pro | 64px title, 640px measure |
| Blog post (product) | /blog/physical-ai | Same template |
| About | /about | Photo-led; stat cards; news-video wall |
| Careers | /careers | Values cards; benefit photo cards |
| Demo (contact) | /demo | Split form / testimonial-blue panel |
| SEAL Leaderboards | labs.scale.com/leaderboard | Separate all-mono "labs" sub-brand |

Also captured: 4 nav-dropdown open states, scrolled-nav state, footer bottom state, CTA hover. `/customers` (index) 301s to a featured story; `/resources` redirects home; no public pricing page exists — pricing is gated behind "Book Demo" (enterprise sales motion).

**Stack detected:** Next.js (Turbopack chunks) + Sanity CMS (media at cdn.sanity.io) + **Lenis smooth scroll on every page** + raw WebGL canvases on home/enterprise/genai-platform (no THREE/GSAP globals exposed — bundled). No Lottie/Rive/Spline. Component system is CMS-slice-based: class names reveal reusable slices — `CMSSliceRenderer`, `FullBleedMediaSection`, `CardGrid`, `BlogPreview`, `ScrollingQuote`, `PullApartContent`, `TwoColumnTextWithVideo`, `SgpStack`, `SgpPlatformDifferentiators`, `SgpSecurity`, `SgpDemo`, `Faqs`, `EnterprisePillars`, `EnterprisePoweredBy`, `EnterpriseBuiltToBeTrusted`.

---

## 2. Design System

### 2.1 Palette

Measured hex inventory (frequency-weighted across 17 pages):

**Core neutrals (95% of the site)**
- `#000000` — dominant. True black backgrounds, text, buttons.
- `#ffffff` — page base, text-on-dark, cards.
- Gray ramp (Tailwind-style tokens observed as `scale-gray-95/90/80`):
  `#f5f5f5` / `#f2f2f2` (section tint, "gray-95") → `#eaeaea` ("gray-90") → `#d9d9d9` (scrolled-nav bg) → `#c7c7c7` ("gray-80", security band) → `#929292` (muted text on dark) → `#696969`, `#575757`, `#525252` (eyebrow gray on light) → `#212121`, `#171717`, `#111111`, `#101010` (dark cards on black).

**Brand accents (used sparingly, one per moment)**
- `#72ce7b` — signature green (charts, live markers, icon tints). High count but concentrated in data-viz.
- `#193a29` — deep forest green. Full-bleed quote/stat bands and icon tiles. THE brand color-moment.
- `#a8927c` — warm tan/khaki. Quote bands, chip backgrounds, serif accent words, wireframe highlight nodes.
- `#839cb2` / `#27455c` — steel blue + navy. Demo-page testimonial panel, some eyebrows, cool photo grading.
- `#3860be` — royal blue (links/markers, rare).
- `#79648c` / `#d1aad7` — muted purple + lilac (two-tone sentence accents, research artwork).
- `#d5e9ff` — pale ice blue (subtle tints).

**Data-viz categorical set (labs leaderboard):** salmon `#e07856`-family, teal `#4fc4a8`-family, mustard `#d4b83a`, sky `#6bc6e8`, royal `#4a7fd4` — flat fills, square corners, black whisker error bars.

**Gradients (measured):**
- Photo scrims: `linear-gradient(rgba(0,0,0,.55) 0%, rgba(0,0,0,.14) 50%, transparent 100%)` and bottom-up `transparent → #000`.
- Purple ambience: `radial-gradient(80% 50% at 50% 100%, rgba(113,77,255,0.08), transparent 70%)` — an 8%-alpha glow, barely-there.
- Sheen sweep: horizontal `transparent 5% → rgba(255,255,255,.14) 30% → .18 50% → .14` (animated highlight across dark UI).
- Metallic text/object fill: `linear-gradient(to right bottom, #9a9a9a, #1a1a1a 50%, #6a6a6a)`.
- Diagonal hatch texture built from two 45°/135° hard-stop gradients of `#171717` (dither/hatch fills on dark).

Rule of use: black + white + one gray tier per section; a single saturated accent (forest green, tan, or steel blue) claims one full band per page. Never two accents in one viewport.

### 2.2 Typography

**Families loaded (self-hosted):**
- `aeonik` — the everything-sans (geometric grotesk, close to Aeonik/Neue Montreal). ONE weight does 90% of the site: **400**. Medium 500 appears only at ≤24px.
- `mono` (custom mono, DM-Mono-like) — eyebrows, labels, meta, legal, chips.
- Labs sub-brand: full mono UI (`PP Supply Mono` 200/400/500/700, `DM Mono`).
- A stash of display fonts loaded on home for special accent moments: `New Forest`, `Test Manuka`, `TRJN DaVinci Display`, `Neue Montreal`, `IBM Plex Sans Var`, `Roboto Flex` — used for single accent words (e.g., a serif accent word inside a sans headline) and font-cycling stunts.

**Measured scale (desktop 1440):**

| Role | Size/Line-height | Weight | Tracking | Notes |
|---|---|---|---|---|
| Giant footer statement / home H1 | 116px / 116px (1.0) | 400 | -1.16px (-1%) | 2 lines, white on black, on EVERY page footer |
| Hero headline (home center, product heroes) | 64px / 67.2px (1.05) | 400 | -0.64px (-1%) | White over photo |
| Section display / blog H1 | 64px / 80px (1.25) | 400 | -0.64px | Blog titles |
| Big centered section head | 48–56px / 1.1 | 400 | -1% | e.g. "at a glance" heads |
| About-style H1 / quote text | 54.4px / 62.6px | 400 | -1.088px | Mission statements |
| Sub-section head / card group | 40px / 50px | 400 | -1% | Demo H1, two-col heads |
| Case-study section head | 32–36px / 1.2 | 400 | -1% | |
| Card title / feature head | 24px / 36px (1.5) | **500** | -0.24px | Only place medium appears |
| Body | 16px / 24px (1.5) | 400 | normal | #000 on white, #929292 on black |
| Article body | 18px / ~1.65 | 400 | normal | 620–700px measure |
| Eyebrow style A | 11px / 11px | 400 mono | **+0.55px (+5%), UPPERCASE** | `detail-mono` class |
| Eyebrow style B | 12px | 400 mono | +1px, UPPERCASE | #525252 on light |
| Case-study rail label | 14px | 400 | +1.4px (+10%), UPPERCASE | rgba(0,0,0,.48), sticky left rail |
| Legal/meta | 12px mono | 400 | +0.5–1px, UPPERCASE | |
| Labs display | 60px / 75px | **300 mono** | **-3px (-5%)** | terminal aesthetic |

**Type rules worth stealing:**
- One family, one weight (400), size does all the work. Hierarchy comes from scale ratio (~116/64/40/24/16/11), color (black vs #929292 gray), and case — not from bolding.
- Negative 1% tracking on every display size; positive 5–10% tracking + uppercase + mono for all labels. This sans/mono pairing IS the brand voice.
- Sentence case with a terminal period on headlines ("…decisions.") — declarative, calm.
- Two-tone sentences: second clause of a headline in `#929292` (dark sections) or an accent word swapped to a serif/display face in tan `#a8927c` (light sections).
- Numerals: stat numbers set 48–56px aeonik 400, units kept in the same size ("15B", "$29B", "6 weeks").

### 2.3 Layout & Spacing

**Containers (px, measured frequency):**
- Page gutter: 16px outer margin for full-bleed media cards (1408px card at 1440 viewport); text gutters 24px.
- Content max-widths: **1472px** (wide band inner), **1280px** (standard), **1216/1152px** (text blocks; home hero text = 1152px starting at x=144), **1024px** (narrow), **768px** (article), **640px** (blog body measure).
- Card widths: 404px (3-up in 1280), 368px, 347px (4-up), 325px.
- 12-col grid with 24px gaps implied by `col-span` classes.

**Vertical rhythm:** Tailwind paddings observed: `py-12/14/16/18/20/24` → 48/56/64/72/80/96px. Standard section = 80px bottom pad; hero sections `pt-24` (96px). Sections frequently butt tight (0 top pad) after a full-bleed band. Footer: 878px tall.

**Nav:** `position: fixed`, **88px tall**, z-50, `transition-colors 300ms`. Transparent over dark heroes (white logo/links), solid `#d9d9d9`/white over content. Announcement bar above (40px, black bg, white 14–16px text + dismiss ×). Layout: logo left → 4 text items (16px, 400) → right: ghost "Log In" (outline 1px #d9d9d9, radius 6–8px) + solid black "Book Demo" pill-ish (radius 8px, 40px tall). On dark pages the CTA inverts to white/black.

**Dropdowns:** full-width light panel slides down under the bar; 2–3 link columns with 12px mono uppercase gray group labels + 16px black links + one featured image card (rounded 12–16px) on the right; page beneath stays visible (no dark overlay).

**Radius language:**
- Full-bleed media/hero cards: **24px**.
- Cards: 8px (grid cards, per `!rounded-[8px]`), 12–16px (stat/photo cards), 16–24px (big panels, FAQ block `rounded-2xl`).
- Buttons: THREE tiers — primary rectangles **2px** (near-square, engineering feel; pad 12×30), soft buttons 6–8px (nav), and full pills (9999px) for hero CTAs with arrow glyph `>`.
- Chips/tags: 2–4px rectangles with mono uppercase text.
- Labs sub-brand: 0px everywhere — square scientific tables.

**Borders/shadows:** hairline `1px` dividers at rgba(0,0,0,.1) on light / rgba(255,255,255,.14) on dark; box-shadows are almost absent — elevation via bg-tier contrast (#fff card on #f2f2f2, #212121 card on #000). No glassmorphism except the cookie bar (`rgba(255,255,255,.2)` buttons). Outline-only cards on colored bands (1px lighter-tone border, transparent fill).

### 2.4 Motion & Interaction

**Global scroll:** Lenis smooth scrolling sitewide — inertial, ~1.1–1.2 lerp feel. Everything else hangs off scroll position.

**Measured transition inventory (CSS):**
- Micro (hover): 150–200ms `cubic-bezier(0.4, 0, 0.2, 1)` for color/bg/border; 20ms stagger delays.
- Standard: 300ms `cubic-bezier(0, 0, 0.2, 1)` (decel) for transform/translate/scale; nav color swap 300ms.
- Entrances: 600ms transform + 1000ms opacity, decel curve; `AnimatedText` class with `isnt-visible` state toggling — text reveals are class-driven (fade + small rise), staggered per element.
- Hero headline: word-level rise-and-fade on load.

**Signature scroll choreography:**
1. **Pull-apart exploded stack (home):** sticky full-viewport (`h-dvh`) section, ~1800px of scroll driving a CSS-3D (`perspective-midrange`) stack of 3–5 rounded planes that separate in Z, tilted isometric; wireframe traces + tiny annotation glyphs float between layers; a photo sits mid-stack; caption crossfades (gray→white). Class: `PullApartContent`.
2. **ScrollingQuote:** 1800px-tall black section; a large statement fades word-by-word from #333→#fff as you scroll (progress-mapped opacity), then the annotated stat band slides in.
3. **Pinned product slideshow (GenAI):** `h-screen` pinned section with 4 numbered steps ("X OF 4" tan mono chip), left text swaps, right 3D wireframe re-arranges; segmented progress bars bottom; prev/next square-outline buttons (44px, 1px border, radius 8px) — hybrid scroll/click control.
4. **Constellation hero (enterprise):** photo thumbnails (rounded 12px, ~120×90) scattered around a centered display headline, connected by 1px lines with node dots + mono uppercase captions with a small glyph marker; thumbnails drift subtly (parallax at different rates); lines redraw.
5. **WebGL moments:** full-viewport canvas behind home hero (1440×900, top 39px) and enterprise mid-page "circuit-board" — hundreds of tiny outlined rectangles wired by curved traces in isometric 3D, slow rotation/drift, ONE node lit with a photo texture. White 1px lines on #000, single accent node.
6. **Count-up stats** on scroll-enter; cards stagger-fade in sequence (visible mid-animation states captured: opacity ~0.35 → 1, ~120ms stagger).
7. **Video usage:** autoplay/muted/loop MP4s — (a) montage hero videos cycling industrial scenes ~4s per cut; (b) motion-blurred crowd/office strips as section dividers; (c) product-UI screen recordings inside device frames.
8. **Hover states:** blog rows tint `#f2f2f2`; cards lift ~2px with border lightening; buttons swap bg/fg in 150ms; logo-glyph chat FAB (56px black rounded-12px square, bottom-right, white glyph).

**Feel:** slow, heavy, confident. Nothing bounces. Ease-out only, opacity+translate ≤40px, durations 300–1000ms, long scroll runways (sections claim 1.5–2 viewports of scroll for one idea).

### 2.5 Imagery & Texture

- **Photography, not illustration:** industrial/mission real-world scenes (oil rigs, ports, surgery, ops centers, robot labs, soldiers, architecture). Color-graded dark with cool shadows; often motion-blurred for divider strips. People are shown working, from behind/side — no grinning stock.
- **The annotation motif (brand-defining):** photos and 3D scenes are overlaid with data-labeling UI — thin white bounding boxes with corner ticks, dotted leader lines, tiny mono glyph markers (a little chevron/arrow logo mark), uppercase mono captions ("ENERGY", "HEALTH"). The world literally appears "labeled by Scale."
- **Wireframe 3D line-art:** white 1px outlined planes/boxes in isometric perspective on black — platform diagrams, exploded data stacks, circuit-board networks. Tan `#a8927c` or green nodes as the only color.
- **Product UI screenshots:** dark-theme app frames (rounded 8–12px, near-black #101010 chrome) with green/teal accent charts; often inside laptop/tablet mockups on gray bands.
- **CV imagery:** LiDAR point clouds, semantic-segmentation color overlays on street scenes, MRI scans with markers — the data itself as decoration.
- **Logo walls:** ~9 logos/row, forced monochrome via `filter: brightness(0)` (or inverted on dark), ~23px tall, generous spacing, no boxes.
- **Texture:** none on white; on black — faint dot fields, hatch gradients (#171717 diagonals), 8%-alpha purple radial glow. Paper-flat otherwise.

---

## 3. Page-by-Page Anatomy

### 3.1 Homepage (11,310px)
1. **Announcement bar** (black, 40px, dismissible) above transparent nav.
2. **Hero (900px):** full-bleed montage video (industrial scenes cycling); centered white 64px two-line headline with period; scrim gradient; WebGL canvas layer behind; "Scroll to explore" + glyph bottom-right.
3. **Pull-apart stack** (sticky, ~1800px runway): exploded 3D layers + annotation wireframes over a photo; then centered 11px mono eyebrow with glyph marker ("DATA") → 28–32px white head → gray body → **outline pill CTA** ("Explore … >" 1px white border, radius 9999).
4. Repeat pull-apart pattern for 2–3 product pillars (each gets its own full-viewport beat, alternating photo content).
5. **ScrollingQuote → stat band:** black word-reveal statement, then a **forest-green (#193a29) band**: left black panel with annotated MRI photo, right 40px white claim; corner-rounded 24px.
6. **Collage section (light #f2f2f2):** scattered polaroid-size photo thumbs (rounded 8px) drifting at parallax rates around a centered two-tone headline (sans + serif accent word in tan); black pill CTA.
7. **Industry carousel (white):** "Proven across every industry" label + 4-up card row (404px cards, radius 8px, #fff on #f2f2f2, logo + 24px/500 title + mono footer link), square-outline prev/next arrows.
8. **Benchmark band:** 3 gray cards (icon tile top-left, 24px/500 title, gray body, ghost "Learn More").
9. **Blog preview (white):** giant centered 80px display statement (two lines), then 3-col article cards (16:9 dark artwork, mono category chip, title).
10. **Legacy CTA band (tan #a8927c):** left white statement + black pill; dotted world-map texture right.
11. **Footer (black, 878px):** tiny glyph left; 5 columns of links under 12px mono uppercase gray labels; **116px white 2-line brand statement**; social tiles (48px dark squares); mono legal line.

### 3.2 Product template A (Data Engine / Donovan / Public Sector / Global PS / Automotive / Physical AI)
1. **Hero:** white page, inset **1408px-wide media card, radius 24px**, dark photo/video; left-aligned 64px white title + 16px one-liner + **white pill CTA** (40px, black text, arrow).
2. **Logo bar:** ~9 monochrome logos on white, 23px tall.
3. **Intro split:** left 32–40px statement; right 2×2 mini-cards (white, radius 8px) or checklist columns; sometimes 3D wireframe object left.
4. **Case-study band:** brand-color rounded panel (e.g., solid red 24px-radius logo card) left; right: mono eyebrow "CUSTOMER CASE STUDY" → 40px headline → **black 2px-radius button**.
5. **Long gray (#f2f2f2) build section:** centered mono eyebrows ("BUILD AI" etc.) segmenting: product-UI tabs, **node-and-arrow flow diagram** (white rounded nodes, 1px gray arrows, dashed feedback loops, footnote), 4-col checklist w/ check icons, annotation-type card grid.
6. **Resource cards:** 3–4-up dark-artwork cards ("Learn More About…").
7. **Quote band:** steel-blue or green panel, 26–36px quote, attribution.
8. **Motion-blur photo strip** (full-bleed divider).
9. **Black CTA band:** "The future of your industry starts here" pattern — 40–48px white + pill CTA over dark video.
10. Footer.

### 3.3 GenAI Platform (dark-first, 16,479px)
Black hero with **isometric wireframe platform diagram** (animated 1px white line-art, labeled planes) right of a 32–40px white headline; gray partner logos; chat widget card (white, radius 16px) bottom-right. → pinned **4-step slideshow** (tan step chip, progress bars). → dark-gray stack panel (#212121 cards). → **green transition statement band**. → white chart section (light-gray rounded chart card with white mono label chip "PERFORMANCE OVER TIME"). → giant logo-glyph banner on gray. → **comparison table** (differentiators × columns, check glyphs). → #c7c7c7 security band (photo + compliance badges). → tan quote band. → black `h-screen` demo section (product UI). → **FAQ accordion** in rounded-2xl #f2f2f2 block. → black blog preview → footer.

### 3.4 Enterprise (15,403px)
White **constellation hero** (photo nodes + connecting lines around centered 64px black headline, mono node captions) → black **WebGL circuit-board section** (2 viewports, centered white statement below) → **dark stat bento:** offset rows of #1a1a1a rounded-12px cards; each: green icon tile + 11px mono label + 48–56px numeral + gray caption → film-strip photo row → white two-col video sections → pillars grid → #eaeaea "powered by" band w/ dark product UI + **two-tone lilac sentence accent** → "built to be trusted" grid → photo CTA → footer.

### 3.5 Case study (customers/time)
All-white editorial: big customer logo (~130px) + one-line gray dek → hairline rule → **two-col article:** sticky left rail labels (14px mono uppercase, 48% black — "OVERVIEW", "THE PROBLEM"…) beside 32px heads + 18px/1.65 body in ~1000px column → full-width italic pull-quotes between hairlines → embedded video card + product screenshots (rounded 12px) → black CTA band → footer. Reads like a magazine feature; zero decoration.

### 3.6 Blog index & posts
Index: mono breadcrumb eyebrow → 64px "Blog" → filter **pill row** (active = solid black pill, inactive = 1px outline pill) + right-aligned search field → 2×2 featured dark-artwork cards (category chip top-left, bottom scrim + title) → **table-row archive:** mono date left / 26px title / mono category right, hairline dividers, row hover = #f2f2f2 → centered "LOAD MORE" pill.
Post: breadcrumb + black category chip (glyph + mono) → 64/80px title → mono byline row + "COPY LINK" → 16:9 dark hero artwork (one accent hue per post: purple, green…) → 640px measure body, 18px; h2 28px; gray bullets; end-of-post gray CTA banner → footer.

### 3.7 About / Careers
About: overhead-photography hero card (title bottom-left) → centered 54px mission → wide photo card w/ mono caption → logo row → black "what we do" band → **"at a glance" stat cards** (light #f2f2f2, radius 16px, ~380px tall: forest-green 32px icon tile + 12px mono label top; 48px numeral + gray caption bottom; staggered count-up) → news-video card wall → office-photo CTA band → footer.
Careers: dark architectural hero + white pill → 3 brand-colored news cards (green/black/navy) → mission text → **values grid:** 2-col #f2f2f2 rounded-16 cards with 64px thin-line custom icons (2px stroke, diagrammatic) + 20px title + gray body → photo benefit cards → centered statement → student-program band → footer.

### 3.8 Demo (contact)
50/50 split. Left: 40px head + one-liner + form — inputs 48px tall, white, 1px #d9d9d9, radius 8px, gray placeholders; checkbox topic list; dropdowns. Right: **steel-blue (#839cb2) panel**: oversized quote marks, 26px quote, name + role, hairline, mono "TRUSTED BY…" label + 2×3 mono logo grid. Chat widget overlays bottom-right. No nav distraction — conversion page keeps full nav anyway.

### 3.9 SEAL Leaderboard (labs.scale.com) — sub-brand
Complete aesthetic pivot: everything monospace. Nav: "scale labs" + `[BRACKETED]` mono items + ⌘K search. Hero: 60px **light-weight (300) mono** lowercase headline with -5% tracking; right rail mono stat blocks with hairlines. **Square black CTA** (no radius, mono uppercase). Tab pills → 3-col grid of **square-corner white cards, 1px #d9d9d9 border**: mono title, mono gray desc, ranked rows — black circle rank badge (24px), model name mono, score + ±error, **flat categorical bar** (salmon/teal/mustard/sky) with black error whiskers; gray "NEW" chips; mono "View Full Ranking →". Data-dense, zero decoration — reads as an instrument, which makes the claims feel objective.

---

## 4. Signature Components (recipes)

1. **Inset media hero card** — full-bleed photo/video inside a 24px-radius card with 16px page margins; white text bottom-left; scrim `rgba(0,0,0,.55)→0`; pill CTA. The white border frame makes dark photography feel curated, not template-y.
2. **Detail-mono eyebrow** — 11px mono, uppercase, +5% tracking, preceded by a tiny brand glyph (▸-like mark). Gray #525252 on light, #929292 on dark, sometimes steel-blue.
3. **Giant-type footer** — 5 link columns (12px mono labels) floating above a 116px/1.0 two-line white statement on black; social squares; mono legal.
4. **Stat card** — rounded card (#f2f2f2 light or #1a1a1a dark), forest-green rounded icon tile (32px) + mono uppercase label top-left, 48–56px numeral + gray caption pinned bottom-left, generous dead space between (card ~380px tall). Count-up + stagger.
5. **Annotation overlay** — bounding boxes w/ corner ticks, dotted leader lines, glyph markers, mono captions applied over photos/videos/3D.
6. **Node-graph flow diagram** — white rounded nodes (1px border, 13px title + 11px gray desc), thin arrows, dashed feedback loops, asterisk footnote. On #f5f5f5.
7. **Outline-on-color cards** — on green/tan bands, cards are transparent with 1px lighter-tone borders, white text.
8. **Quote band** — full-bleed accent color (forest green / steel blue / tan), rounded 24px, mono kicker top-left, 26–40px quote, speaker chip (white outline, mono uppercase role), square-outline prev/next.
9. **Comparison/differentiator table** — hairline rows, check glyphs, column headers as chips.
10. **Table-row archive list** — date / title / category in mono-sans-mono, hairlines, hover tint. Elegant blog index without cards.
11. **Filter pills** — solid-black active, 1px-outline inactive, mono uppercase 12px.
12. **Chat FAB** — 56px black rounded-12px square with white brand glyph; expands to white 16px-radius card w/ black full-width pill CTA.
13. **Step slideshow chip** — tan bg chip, mono "STEP X OF N", with segmented progress bars bottom of pinned section.
14. **Two-tone headline** — clause two in gray, or one word swapped to serif/display in tan; single flourish per page.
15. **Mono chart label chip** — white 1px-border rectangle, 12px mono uppercase, floated top-left of chart cards ("PERFORMANCE OVER TIME" pattern).

---

## 5. What Makes It Captivating

1. **One typeface, one weight, huge scale ratio.** 116→64→24→16→11px with weight 400 nearly everywhere. Confidence is communicated by restraint; the site never "shouts" with bold.
2. **The sans/mono duet.** Grotesk for statements, mono for apparatus (labels, data, legal). It encodes "human mission / machine precision" in typography itself.
3. **The annotation motif unifies everything.** Bounding boxes, leader lines, and glyph markers appear on photos, 3D, diagrams, and even nav captions — the company's product (labeling reality) becomes the design language.
4. **Real-world photography over abstraction.** Rigs, hospitals, robots, command centers — graded dark and serious. It sells stakes ("important decisions"), not software.
5. **Black is the brand.** Long black scroll runways with white 1px wireframes feel classified/mission-grade; white sections then read as clarity and honesty. The alternation (white→black→green→white→tan→black) gives the scroll a cinematic reel structure.
6. **Color as a scalpel.** Forest green, tan, steel blue each get exactly one band per page; data-viz green appears only where data lives. Accent scarcity = enterprise credibility; accent choice (unusual green/tan, not SaaS blue/purple) = distinctiveness.
7. **Scroll pacing like a keynote.** Each idea gets 1.5–2 viewports (pinned pull-aparts, 1800px quote reveals). Lenis inertia + slow decel easings make the page feel weighty and expensive.
8. **Evidence architecture.** Logo walls → stat bentos → case-study bands → benchmark tables → compliance badges, rhythmically repeated on every page; the design system itself argues "proven."
9. **Sub-brand contrast.** The all-mono, square-cornered labs/leaderboard property feels like raw instrumentation next to the polished marketing site — lending scientific credibility back to the main brand.
10. **CTAs are calm.** Two buttons max ("Book Demo" + ghost login), pill or 2px-radius, black/white, arrow glyph; a demo-CTA band recurs before every footer. Cadence: hero → after proof → pre-footer.

---

## 6. Top 15 Steal-Worthy Patterns (for a GSAP + three.js + React build)

1. **Inset 24px-radius hero media card (16px page margins).**
   Impl: hero `<section class="p-4"><div class="rounded-3xl overflow-hidden relative h-[86vh]">` with `<video autoplay muted loop playsinline>`; GSAP `gsap.from(headline.words, {yPercent: 60, opacity: 0, stagger: 0.06, duration: 0.9, ease: "power3.out"})`; scrim via CSS gradient.

2. **Scroll-driven exploded 3D layer stack ("pull-apart").**
   Impl: ScrollTrigger `pin: true, scrub: 1, end: "+=1800"`; either CSS 3D (`perspective: 1200px`, per-layer `translateZ/rotateX` mapped to progress) or three.js planes with `MeshBasicMaterial` wireframes + one `VideoTexture` plane; timeline moves layers apart in Z while captions crossfade.

3. **Word-by-word statement reveal on black.**
   Impl: SplitText → words; ScrollTrigger scrub maps each word `color: #333 → #fff` (or opacity .25→1) sequentially; section height ~200vh, content `position: sticky; top: 0`.

4. **Constellation hero (annotated thumbnails around centered headline).**
   Impl: absolutely-positioned thumbs with `gsap.to(y: ±20, scrollTrigger scrub)` at varied rates; SVG overlay draws lines between anchor points (`getBoundingClientRect` → `<line>`), `stroke-dashoffset` draw-in on load; mono captions + marker glyph; recompute on resize.

5. **WebGL wireframe circuit-board with one photo-lit node.**
   Impl: three.js `LineSegments` over an isometric grid of small rounded-rect outlines (merge geometry for perf), curved traces via `CatmullRomCurve3` + `TubeGeometry` or fat lines; slow `rotation.y` drift + mouse parallax; a single plane with `TextureLoader` photo; fog for depth fade; render on black, lines `#ffffff` at 0.35 opacity, one accent node `#a8927c`.

6. **Detail-mono label system.**
   Impl: a `<Eyebrow>` component: 11px mono, `tracking-[0.05em] uppercase`, optional glyph SVG prefix; color prop (gray/blue/white). Use for section kickers, card labels, chart chips, footer column heads — consistency is the trick.

7. **Giant-type footer statement.**
   Impl: footer h1 at `clamp(64px, 8vw, 116px)`, line-height 1.0, tracking -1%; links row above in 12px mono; optional GSAP batch fade-up on enter. Put the brand promise here on every page.

8. **Stat bento with icon tiles + count-up.**
   Impl: CSS grid with offset second row (`translate-y-8` on alternates); cards 380px tall, `justify-between`; GSAP `ScrollTrigger.batch` stagger 120ms; numerals via `gsap.to({val}, {snap, onUpdate})`; icon tile = 32px rounded-lg in deep green with white SVG.

9. **Annotation overlay kit.**
   Impl: reusable `<Annotate>` wrapper rendering corner-tick bounding boxes (4 SVG "L" corners), dotted leader lines, and mono captions over any media; animate ticks drawing in (200ms, 40ms stagger) when in view. Use sparingly on photos/renders to brand them.

10. **Pinned N-step product walkthrough with progress segments.**
    Impl: ScrollTrigger pin over `N * 100vh`; step chip ("X OF N" mono on tan), left text swaps via timeline labels, right three.js/SVG diagram re-arranges per step; bottom `N` progress bars fill with scrub; also clickable arrows that `scrollTo` the matching progress point.

11. **Section-color reel (white→black→green→tan rhythm).**
    Impl: plan page as color-blocked slices; give each accent band `rounded-3xl` + inner container; animate `background-color` of a shared wrapper with ScrollTrigger snap between bands for the "reel" feel; keep one accent hue per page-third.

12. **Table-row index with hover tint (blog/archive).**
    Impl: CSS grid rows `[date | title | tag]`, hairline `border-b border-black/10`, `hover:bg-neutral-100 transition-colors duration-150`; mono date/tag, 26px sans title. Zero-card layout that scales to hundreds of entries.

13. **Node-and-arrow process diagram.**
    Impl: SVG with white rounded-rect nodes + thin arrows (`marker-end`), dashed feedback path; GSAP draws paths (`drawSVG` or dashoffset) then pops nodes 0.3s stagger on enter; footnote line in 12px gray. Far more credible than icon rows for technical pipelines.

14. **Adaptive chrome nav.**
    Impl: fixed 88px header, transparent over hero (white foreground), swap to solid light bg + black foreground after `hero.bottom` via ScrollTrigger `toggleClass`; 300ms color transition; full-width dropdown panel (grouped mono-labeled columns + featured image) animated `height/opacity` 250ms decel; black announcement bar above with dismiss.

15. **Mono "instrument" sub-aesthetic for data/benchmark sections.**
    Impl: switch a route (or section) to 100% monospace: square corners, 1px #d9d9d9 borders, black circle rank badges, flat categorical bar charts (CSS widths) with error whiskers (absolute-positioned brackets), `[BRACKET]` nav labels, ⌘K hint. The style-break itself signals scientific rigor — use for evals/telemetry/benchmarks.

**Bonus micro-specs to reuse:** ease-out `cubic-bezier(0,0,0.2,1)` for movement, `cubic-bezier(0.4,0,0.2,1)` for color; 150/300/600/1000ms duration ladder; hairlines `1px black/10` – `white/14`; scrim `rgba(0,0,0,.55)→transparent`; purple ambience `radial-gradient(80% 50% at 50% 100%, rgba(113,77,255,.08), transparent 70%)`; logo walls `filter: brightness(0)` + 23px height; buttons 40px tall.

---

## 7. Aesthetic Thesis

Scale fuses **institutional gravitas** (one grotesk at weight 400, black/white austerity, real-world mission photography, evidence-dense sections) with **frontier-tech energy** (WebGL wireframes, scroll-pinned 3D choreography, annotation overlays, terminal-mono apparatus). The tension is deliberate: the marketing voice is calm and declarative while the "machine layer" — mono labels, bounding boxes, diagrams, leaderboards — hums underneath everything like exposed instrumentation. Color is rationed to one unusual accent band per page (forest green, tan, steel blue), so when it appears it reads as intent, not decoration. Motion is slow, eased-out, and scroll-owned — a keynote you drive with your thumb. The result: a site that feels simultaneously like a defense contractor's briefing and a research lab's demo — exactly the "trustworthy + frontier" duality an AI-infrastructure brand needs.

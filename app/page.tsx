"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  type MotionValue,
} from "framer-motion";
import {
  Cpu,
  Workflow,
  TrendingUp,
  ScanLine,
  Truck,
  Boxes,
  ShieldCheck,
  Quote,
} from "lucide-react";

/* ============================================================================
   INTRO PROVIDER — cinematic preloader phase machine
   ========================================================================== */

type IntroPhase =
  | "pop"
  | "text"
  | "linesExit"
  | "logoPop"
  | "dock"
  | "hero"
  | "done";

/* Intro choreography:
     pop        — line 1 'Thirty years.' enters, line 2 starts.
     text       — line 3 enters, all three hold for read time.
     linesExit  — lines fade up + away.
     logoPop    — logo scales into the center (large, glass), holds.
     dock       — logo shrinks down to the top, the persistent
                  rounded-rectangle top bar appears around it, and the
                  site fades in.
     hero       — pinned hero artwork reveals.
     done       — site fully interactive. */
const POP_MS = 700;
const HOLD_MS = 200;
const TEXT_MS = 900;
const TEXT_HOLD_MS = 650;
const LINES_EXIT_MS = 520;
/* logoPop covers logo scale-in, wordmark wipe-in, and a hold for read
   time. The dock phase is the transition: wordmark and logo retract /
   fly to the top in one quick beat — no separate fade-out. */
const LOGO_POP_MS = 2200;
const DOCK_MS = 500;
const HERO_DELAY_MS = 200;
const HERO_MS = 900;
const MORPH_S = 0.75;
const POP_S = 0.45;
const EASE_MORPH = [0.65, 0, 0.35, 1] as const;
const EASE_POP = [0.34, 1.56, 0.64, 1] as const;
const EASE_FADE = [0.22, 1, 0.36, 1] as const;

const IntroContext = createContext<{ phase: IntroPhase }>({ phase: "done" });
const useIntro = () => useContext(IntroContext);

function IntroProvider({
  sidebar,
  children,
}: {
  sidebar?: ReactNode;
  children: ReactNode;
}) {
  const [phase, setPhase] = useState<IntroPhase>("pop");

  useEffect(() => {
    const t0 = POP_MS + HOLD_MS;
    const t1 = t0 + TEXT_MS + TEXT_HOLD_MS;
    const t2 = t1 + LINES_EXIT_MS;
    const t3 = t2 + LOGO_POP_MS;
    const t4 = t3 + DOCK_MS + HERO_DELAY_MS;
    const t5 = t4 + HERO_MS;

    const timers = [
      window.setTimeout(() => setPhase("text"), t0),
      window.setTimeout(() => setPhase("linesExit"), t1),
      window.setTimeout(() => setPhase("logoPop"), t2),
      window.setTimeout(() => setPhase("dock"), t3),
      window.setTimeout(() => setPhase("hero"), t4),
      window.setTimeout(() => setPhase("done"), t5),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, []);

  /* Website content (excluding hero) fades in during the dock phase */
  const siteVisible = phase === "dock" || phase === "hero" || phase === "done";

  return (
    <IntroContext.Provider value={{ phase }}>
      <Preloader />
      <IntroLines />
      <BrandLockup />
      {sidebar}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: siteVisible ? 1 : 0 }}
        transition={{ duration: MORPH_S * 0.9, ease: EASE_FADE }}
        aria-hidden={!siteVisible}
      >
        {children}
      </motion.div>
    </IntroContext.Provider>
  );
}

/* ============================================================================
   LOGO MARK
   ========================================================================== */

function LogoMark({ glass = false }: { glass?: boolean }) {
  void glass;
  return (
    <span className="relative inline-flex h-full w-full select-none">
      <Image
        src="/novonus-logo.png"
        alt="Novonus"
        width={288}
        height={288}
        priority
        draggable={false}
        className="object-contain select-none"
        style={{ width: "100%", height: "100%", opacity: 0.85 }}
      />
    </span>
  );
}

/* LogoGlass — liquid-glass overlays masked to the logo silhouette. Mounts at
   full intensity and dissolves to 0 when `glass` is false; halo is rendered
   separately in <Preloader> so it stays anchored at screen center. */

function LogoGlass({ glass }: { glass: boolean }) {
  const mask = {
    WebkitMaskImage: "url(/novonus-logo.png)",
    maskImage: "url(/novonus-logo.png)",
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
  } as const;
  const morph = { duration: MORPH_S, ease: EASE_MORPH };
  return (
    <>
      {/* Cyan→royal tint on the logo body */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          ...mask,
          background:
            "linear-gradient(135deg, rgba(125,224,255,0.85) 0%, rgba(34,211,238,0.7) 45%, rgba(70,130,255,0.55) 100%)",
          mixBlendMode: "screen",
        }}
        initial={{ opacity: 0.85 }}
        animate={{ opacity: glass ? 0.85 : 0 }}
        transition={morph}
      />
      {/* Specular sweep — light catching the top-left edge */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          ...mask,
          background:
            "linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.45) 18%, transparent 45%)",
          mixBlendMode: "overlay",
        }}
        initial={{ opacity: 1 }}
        animate={{ opacity: glass ? 1 : 0 }}
        transition={morph}
      />
      {/* Bottom-right depth shadow — gives the glass volume */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          ...mask,
          background:
            "linear-gradient(135deg, transparent 55%, rgba(10,30,60,0.35) 100%)",
          mixBlendMode: "multiply",
        }}
        initial={{ opacity: 0.7 }}
        animate={{ opacity: glass ? 0.7 : 0 }}
        transition={morph}
      />
    </>
  );
}

/* ============================================================================
   PRELOADER — full-viewport black overlay with logo pop & dock
   ========================================================================== */

function Preloader() {
  const { phase } = useIntro();
  const overlayVisible =
    phase === "pop" ||
    phase === "text" ||
    phase === "linesExit" ||
    phase === "logoPop";
  const haloVisible = overlayVisible;

  return (
    <AnimatePresence>
      {phase !== "done" && phase !== "hero" && (
        <motion.div
          key="preloader-overlay"
          aria-hidden
          initial={{ opacity: 1 }}
          animate={{ opacity: overlayVisible ? 1 : 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: MORPH_S * 0.9, ease: EASE_FADE }}
          className="fixed inset-0 z-[100] bg-ink"
          style={{ pointerEvents: overlayVisible ? "auto" : "none" }}
        >
          <div className="bg-grid absolute inset-0 opacity-25" />
          <div className="glow-accent absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2" />
        </motion.div>
      )}

      {/* Cyan halo — anchored at screen center during the centered intro
          phases (lines + logo pop). */}
      {haloVisible && (
        <motion.div
          key="halo"
          aria-hidden
          className="pointer-events-none fixed left-1/2 top-1/2 z-[105] -translate-x-1/2 -translate-y-1/2"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{
            opacity: phase === "logoPop" ? 1 : 0.7,
            scale: phase === "logoPop" ? 1.05 : 1,
          }}
          exit={{ opacity: 0, scale: 1.9 }}
          transition={{
            duration: 0.7,
            ease: EASE_FADE,
          }}
        >
          <div
            style={{
              width: 240,
              height: 240,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(34,211,238,0.65), rgba(120,200,255,0.25) 45%, transparent 72%)",
              filter: "blur(24px)",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ============================================================================
   INTRO LINES — three statement lines that stagger in at center during the
   pop/text phases, fade up and out during the dock phase, and are gone for
   the rest of the site.
   ========================================================================== */

const INTRO_LINES = [
  { text: "Thirty years.", accent: false },
  { text: "One missing signal.", accent: false },
  { text: "We found it.", accent: true },
] as const;

function IntroLines() {
  const { phase } = useIntro();
  const animateState =
    phase === "pop" || phase === "text"
      ? "visible"
      : phase === "linesExit"
        ? "exit"
        : "hidden";

  return (
    <motion.div
      aria-hidden={animateState !== "visible"}
      className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center px-8"
    >
      <motion.div
        className="text-balance"
        initial="hidden"
        animate={animateState}
        variants={{
          hidden: {},
          visible: {
            transition: { staggerChildren: 0.5, delayChildren: 0.15 },
          },
          exit: {
            transition: { staggerChildren: 0.05 },
          },
        }}
        style={{
          fontFamily: "var(--font-inter), ui-sans-serif, system-ui",
          fontWeight: 800,
          fontSize: "clamp(2.4rem, 5.4vw, 4.8rem)",
          lineHeight: 1.05,
          letterSpacing: "-0.045em",
          color: "rgba(245, 250, 255, 0.98)",
          maxWidth: "62rem",
        }}
      >
        {INTRO_LINES.map(({ text, accent }) => (
          <motion.span
            key={text}
            style={{
              display: "block",
              color: accent ? "rgba(34, 211, 238, 1)" : undefined,
            }}
            variants={{
              hidden: { opacity: 0, y: 22 },
              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  duration: 0.7,
                  ease: [0.22, 1, 0.36, 1],
                },
              },
              exit: {
                opacity: 0,
                y: -10,
                transition: {
                  duration: 0.45,
                  ease: [0.4, 0, 0.6, 1],
                },
              },
            }}
          >
            {text}
          </motion.span>
        ))}
      </motion.div>
    </motion.div>
  );
}

/* ============================================================================
   BRAND LOCKUP — composed of two pieces:
     1. TopBar — full-width glassy rectangle with curved corners that
        appears once the dock phase fires and then follows the user
        across the rest of the site.
     2. Logo + 'Novonus' wordmark — logo pops into the center after the
        intro lines leave, the wordmark wipes out from behind it, then
        the lockup flies up to the top center where the wordmark
        retracts and only the logo remains inside the bar.
   ========================================================================== */

function BrandLockup() {
  const { phase } = useIntro();
  const visible =
    phase === "logoPop" ||
    phase === "dock" ||
    phase === "hero" ||
    phase === "done";
  const centered = phase === "logoPop";
  const docked =
    phase === "dock" || phase === "hero" || phase === "done";

  return (
    <>
      {/* Full-width top bar — only fades in once docked, persists for
          the rest of the site. Rounded corners, glassy backdrop. */}
      {docked && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed inset-x-2.5 top-2.5 z-[119] h-14 md:inset-x-3 md:top-3 md:h-16"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_FADE, delay: 0.3 }}
          style={{
            borderRadius: 18,
            background:
              "linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(8, 14, 24, 0.5) 100%)",
            backdropFilter: "blur(22px) saturate(180%)",
            WebkitBackdropFilter: "blur(22px) saturate(180%)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow:
              "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 12px 32px rgba(0, 0, 0, 0.32)",
          }}
        />
      )}

      {/* Logo + wordmark lockup. Floats above the bar (z-120 vs z-119). */}
      <motion.div
        className="pointer-events-none fixed left-1/2 z-[120] flex items-center"
        initial={{
          top: "50%",
          x: "-50%",
          y: "-50%",
          scale: 0,
          opacity: 0,
        }}
        animate={{
          top: docked ? "1.125rem" : "50%",
          x: "-50%",
          y: docked ? "0%" : "-50%",
          scale: visible ? 1 : 0,
          opacity: visible ? 1 : 0,
        }}
        transition={{
          top: { duration: 0.5, ease: EASE_MORPH },
          y: { duration: 0.5, ease: EASE_MORPH },
          scale: {
            duration: centered ? 0.55 : 0.5,
            ease: centered ? EASE_POP : EASE_MORPH,
          },
          opacity: { duration: 0.45, ease: EASE_FADE },
        }}
      >
        {/* Logo */}
        <motion.div
          className="relative shrink-0"
          style={{ zIndex: 2 }}
          animate={{
            width: centered ? 144 : 38,
            height: centered ? 144 : 38,
          }}
          transition={{ duration: 0.55, ease: EASE_MORPH }}
        >
          <LogoMark glass={centered} />
        </motion.div>

        {/* Novonus wordmark — width-wipe from behind the logo, holds
            until the dock phase fires. No standalone fade-out; the
            dock transition itself collapses the wordmark (width +
            opacity → 0) at the same time the logo flies up to the
            top bar. Heavy-impact Inter 800. */}
        <motion.div
          style={{ overflow: "hidden", flexShrink: 0, zIndex: 1 }}
          initial={{ width: 0, opacity: 0 }}
          animate={{
            width: centered ? 240 : 0,
            opacity: centered ? 1 : 0,
          }}
          transition={{
            duration: centered ? 0.6 : 0.4,
            ease: centered ? EASE_MORPH : EASE_FADE,
            delay: centered ? 0.55 : 0,
          }}
        >
          <span
            className="block select-none"
            style={{
              fontFamily: "var(--font-inter), ui-sans-serif, system-ui",
              fontWeight: 800,
              fontSize: "48px",
              letterSpacing: "-0.04em",
              lineHeight: 1,
              color: "rgba(245, 250, 255, 0.98)",
              whiteSpace: "nowrap",
              paddingLeft: 14,
            }}
          >
            Novonus
          </span>
        </motion.div>
      </motion.div>
    </>
  );
}

/* ============================================================================
   SIDEBAR
   ========================================================================== */

const NAV_ITEMS = ["System", "Markets", "Insights", "Resources", "About"];

function Sidebar() {
  const { phase } = useIntro();
  const ready = phase === "hero" || phase === "done";
  const [open, setOpen] = useState(false);

  /* Edge-hover trigger: opens when the cursor hits the extreme left
     edge, closes when the cursor moves well past the panel. The
     hysteresis avoids flicker between trigger zone and panel. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const TRIGGER_EDGE = 14;   /* px — open zone */
    const CLOSE_THRESHOLD = 320; /* px — past sidebar width + buffer */
    const handler = (e: PointerEvent) => {
      if (e.clientX <= TRIGGER_EDGE) setOpen(true);
      else if (e.clientX > CLOSE_THRESHOLD) setOpen(false);
    };
    window.addEventListener("pointermove", handler, { passive: true });
    return () => window.removeEventListener("pointermove", handler);
  }, []);

  const panelVisible = ready && open;
  const tabVisible = ready && !open;

  return (
    <>
      {/* Hidden curved-edge tab — signals the hover trigger zone */}
      <motion.div
        aria-hidden
        initial={false}
        animate={{
          opacity: tabVisible ? 1 : 0,
          x: tabVisible ? 0 : -6,
        }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none fixed left-0 top-1/2 z-30 hidden -translate-y-1/2 md:block"
      >
        <div className="sidebar-trigger" />
      </motion.div>

      <motion.aside
        initial={false}
        animate={{
          opacity: panelVisible ? 1 : 0,
          x: panelVisible ? 0 : -120,
        }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ pointerEvents: panelVisible ? "auto" : "none" }}
        className="liquid-glass fixed left-6 top-1/2 z-40 hidden -translate-y-1/2 md:block"
        aria-label="Primary navigation"
      >
        <div className="liquid-glass-panel relative flex flex-col items-stretch gap-1 p-3">
          <span className="px-3 pb-2 pt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/55">
            Navigate
          </span>
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="liquid-glass-btn group relative flex items-center justify-between px-4 py-2.5 text-sm text-paper/85"
              >
                <span className="relative z-10">{item}</span>
                <span className="relative z-10 h-1.5 w-1.5 rounded-full bg-cyan/0 transition-colors group-hover:bg-cyan" />
              </a>
            ))}
          </nav>
          <div className="mt-2 border-t border-white/10 pt-3">
            <a
              href="#contact"
              className="liquid-glass-btn liquid-glass-cta group relative flex items-center justify-between px-4 py-2.5 text-sm font-medium text-ink"
            >
              <span className="relative z-10">Contact</span>
              <Arrow className="relative z-10 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

/* ============================================================================
   DIGIT REEL — rolling counter
   ========================================================================== */

function DigitReel({
  target,
  size = 72,
  delay = 0,
  duration = 1600,
}: {
  target: number;
  size?: number;
  delay?: number;
  duration?: number;
}) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setActive(true), delay);
    return () => window.clearTimeout(t);
  }, [delay]);

  const offset = active ? -target * size : 0;

  return (
    <span
      className="relative inline-block overflow-hidden align-middle"
      style={{ height: size, width: size * 0.62 }}
      aria-hidden="true"
    >
      <span
        className="flex flex-col"
        style={{
          transform: `translateY(${offset}px)`,
          transition: `transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        }}
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className="flex items-center justify-center font-mono font-medium tabular-nums"
            style={{ height: size, fontSize: size * 0.78, lineHeight: 1 }}
          >
            {i}
          </span>
        ))}
      </span>
    </span>
  );
}

/* ============================================================================
   ARROW — small reusable inline arrow icon
   ========================================================================== */

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 14 14"
      className={className}
      fill="none"
      aria-hidden
    >
      <path
        d="M3 7h8m0 0L7.5 3.5M11 7l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ============================================================================
   HERO BACKGROUND — Black chart paper, minimal version.

   Pure black field with two layers of structure only:
     1. A faint printed chart grid — 48px squares, 1px strokes at #070707
        (~3% gray). Barely-readable rules.
     2. A sparse network of fine "microcrack" specks — anisotropic
        turbulence (horizontal-streak-shaped peaks) pushed through a
        steep gamma curve so only the very brightest crests survive.
        Reads as the intricate fine cracks/scratches of a worn paper
        surface, not as broad noise.

   No blotches, no isotropic grain, no directional lighting, no vignette.
   Earlier versions had broader low-frequency layers that created visible
   "puddles" of lighter hue across the field — those have been removed
   so the surface stays uniformly near-black except for the fine cracks.

   The earlier Warp/Lava shader version is archived at
   _archive/lava-background.tsx for restoration.
   ========================================================================== */
function LinenBackground({
  idPrefix = "paper",
}: {
  idPrefix?: string;
} = {}) {
  const gridId = `${idPrefix}-grid`;
  const cracksId = `${idPrefix}-microcracks`;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={{ background: "#000000", contain: "layout paint" }}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern
            id={gridId}
            width="48"
            height="48"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke="#070707"
              strokeWidth="1"
            />
          </pattern>
          <filter id={cracksId} x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.4 1.8"
              numOctaves="4"
              seed="73"
            />
            <feComponentTransfer>
              <feFuncA type="gamma" amplitude="1" exponent="4.8" offset="0" />
            </feComponentTransfer>
            <feColorMatrix
              values="0 0 0 0 0.65
                      0 0 0 0 0.65
                      0 0 0 0 0.65
                      0 0 0 0.45 0"
            />
          </filter>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${gridId})`} />
        <rect width="100%" height="100%" filter={`url(#${cracksId})`} />
      </svg>
    </div>
  );
}

/* ============================================================================
   SLIDE 2 — scroll-driven per-character reveal.

   Single sentence, displayed letter by letter as the user scrolls. Each
   character emerges as cyan, holds briefly, then smoothly blends to
   white. The "reveal head" is a motion value driven directly by
   scrollYProgress, so the reveal is continuous and stops mid-word if
   the user pauses scrolling. No internal animation timers — every
   visual state is a pure function of the current head position.

   Per-character timeline (units = "characters", local = head − index):
     local <= 0       hidden (opacity 0)
     0 < local < 1    emerging — opacity 0→1, color stays cyan
     1 ≤ local ≤ 2.5  pure cyan hold
     2.5 < local < 6.5 smooth lerp cyan → white
     local ≥ 6.5      pure white

   The transition window (~6 chars wide) means a small wave of
   colour-blending letters always trails the head. Smooth feel.
   ========================================================================== */
const SLIDE2_TEXT =
  "Modern robotics has trained on the wrong data for thirty years.";

function RevealChar({
  char,
  index,
  head,
}: {
  char: string;
  index: number;
  head: MotionValue<number>;
}) {
  const opacity = useTransform(head, (h) => {
    const local = h - index;
    if (local <= 0) return 0;
    if (local >= 1) return 1;
    return local;
  });

  const color = useTransform(head, (h) => {
    const local = h - index;
    if (local <= 2.5) return "rgba(34, 211, 238, 1)";
    if (local >= 6.5) return "rgba(245, 250, 255, 0.96)";
    const t = (local - 2.5) / 4;
    const r = Math.round(34 + (245 - 34) * t);
    const g = Math.round(211 + (250 - 211) * t);
    const b = Math.round(238 + (255 - 238) * t);
    return `rgba(${r}, ${g}, ${b}, 0.96)`;
  });

  return <motion.span style={{ opacity, color }}>{char}</motion.span>;
}

/* ============================================================================
   SLIDE 3 — pair of crayon-style eyes, a red crayon strip drawn across,
   and a "Vision can't see force" caption — all scroll-driven.

   Aesthetic: simplistic geometric shapes (circles, short lines, arcs)
   rendered through a turbulence + displacement filter so every edge
   wobbles hand-drawn-crayon style. Stroke colour is a warm paper-cream
   that sits cleanly on the chart-paper backdrop.

   Geometry (viewBox 800 × 400):
     OPEN state:
       • Left  eye outline: circle (260, 200) r=90
       • Right eye outline: circle (540, 200) r=90
       • Pupils: filled black r=32 inside each circle
       • Lashes: 5 short lines fanning above each eye, pointing UP

     CLOSED state (the "blink"):
       • Eye outline = lower semicircular arc + a straight base line at
         y=200 connecting the two endpoints. The two together form a
         closed half-disk shape (D rotated 90°).
       • No pupils (eyes are closed)
       • Lashes: 5 short lines per eye whose bases sit at the red
         strip's centre line (y≈215). Because the strip is rendered
         after the eyes with a 42-px stroke, the upper part of each
         lash gets hidden by the strip; only the lower portion (y≈236
         onward) is visible, so the lashes appear to emerge from the
         strip's lower edge and fan downward.

   Choreography (all scroll-driven, no time-based animation):
     • Wrapper opacity : scroll [0.88, 0.90] → 0 → 1
     • Crayon strip    : scroll [0.91, 1.00] → pathLength 0 → 1
                         (0.09 wide; ~¼ strip per wheel notch at 500svh)
     • Caption reveal  : scroll [0.91, 1.00] → revealHead 0 → length+7
                         (in lockstep with strip — caption fills as the
                         line is drawn)
     • Blink           : multi-keyframe crossfade. Eyes are open up to
                         scroll 0.9325 (= ¼ of the strip drawn), close
                         briefly, and snap back open at scroll 0.955
                         (= ½ of the strip drawn). Each crossfade window
                         is ~0.0025 progress wide so the close/open
                         transitions read as a quick blink.
   ========================================================================== */
const SLIDE3_TEXT = "Vision can't see force.";

function EyesScene({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  /* Wrapper opacity — fade-in over [0.3903, 0.4076], hold through
     the strip reveal AND the 8-scroll hold, then fade-out
     [0.5464, 0.5638] so slide 3 cleanly hands off to slide 4. */
  const opacity = useTransform(
    scrollYProgress,
    [0.3903, 0.4076, 0.5464, 0.5638],
    [0, 1, 1, 0],
  );

  /* Strip pathLength is a direct projection of scrollYProgress onto
     [0.4076, 0.4539]. At 900svh a wheel notch covers ~0.01157 of
     progress, so the 0.0463-wide range exposes ~¼ of the strip per
     notch — four notches reveal it fully. After 0.4539 it clamps at
     1, holding the strip fully drawn during the 8-scroll wait. */
  const stripPathLength = useTransform(
    scrollYProgress,
    [0.4076, 0.4539],
    [0, 1],
  );

  /* Caption reveal head — same scroll range as the strip, so the text
     fills in lockstep with the line being drawn across the eyes. */
  const captionHead = useTransform(
    scrollYProgress,
    [0.4076, 0.4539],
    [0, SLIDE3_TEXT.length + 7],
  );

  /* Eye state — open / closed / open, gated to the strip's progress.
     Strip range is [0.4076, 0.4539] (0.0463 wide):
       1/4 of strip drawn ≈ scroll 0.4193
       1/2 of strip drawn ≈ scroll 0.4309
     Eyes close at 1/4, hold closed, snap back open at 1/2. */
  const openOpacity = useTransform(
    scrollYProgress,
    [0.4193, 0.4218, 0.4309, 0.4334],
    [1, 0, 0, 1],
  );
  const closedOpacity = useTransform(
    scrollYProgress,
    [0.4193, 0.4218, 0.4309, 0.4334],
    [0, 1, 1, 0],
  );

  const stroke = "#f3eee2";
  const pupil = "#0a0a0a";

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-[7] flex flex-col items-center justify-center gap-6 px-8"
      style={{ opacity }}
      aria-hidden
    >
      <div className="w-full max-w-[640px]">
        <svg
          viewBox="0 0 800 400"
          preserveAspectRatio="xMidYMid meet"
          className="h-auto w-full"
        >
          <defs>
            <filter
              id="crayon-rough"
              x="-10%"
              y="-10%"
              width="120%"
              height="120%"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.06"
                numOctaves="2"
                seed="5"
              />
              <feDisplacementMap in="SourceGraphic" scale="3" />
            </filter>
          </defs>

          {/* OPEN STATE — full circles, pupils, up-pointing lashes. */}
          <motion.g style={{ opacity: openOpacity }}>
            <circle
              cx="260"
              cy="200"
              r="90"
              fill="none"
              stroke={stroke}
              strokeWidth="5"
              strokeLinecap="round"
              filter="url(#crayon-rough)"
            />
            <circle
              cx="260"
              cy="200"
              r="32"
              fill={pupil}
              filter="url(#crayon-rough)"
            />
            <circle
              cx="540"
              cy="200"
              r="90"
              fill="none"
              stroke={stroke}
              strokeWidth="5"
              strokeLinecap="round"
              filter="url(#crayon-rough)"
            />
            <circle
              cx="540"
              cy="200"
              r="32"
              fill={pupil}
              filter="url(#crayon-rough)"
            />
            <g
              stroke={stroke}
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              filter="url(#crayon-rough)"
            >
              <line x1="200" y1="125" x2="186" y2="92" />
              <line x1="225" y1="115" x2="220" y2="78" />
              <line x1="260" y1="110" x2="260" y2="68" />
              <line x1="295" y1="115" x2="300" y2="78" />
              <line x1="320" y1="125" x2="334" y2="92" />
              <line x1="480" y1="125" x2="466" y2="92" />
              <line x1="505" y1="115" x2="500" y2="78" />
              <line x1="540" y1="110" x2="540" y2="68" />
              <line x1="575" y1="115" x2="580" y2="78" />
              <line x1="600" y1="125" x2="614" y2="92" />
            </g>
          </motion.g>

          {/* CLOSED STATE — closed half-disk eyes (lower semicircle arc
              + connecting straight base line at y=200) and lashes that
              originate at the red strip line (y≈215) so they read as
              hairs sprouting from the strip. The strip is rendered
              after the eyes, so the upper portion of each lash gets
              covered by the strip's 42-px stroke; only the lower
              portion (roughly y≈236 onward) remains visible, giving
              the impression of lashes emerging from the strip's lower
              edge and pointing down toward the closed eye. */}
          <motion.g style={{ opacity: closedOpacity }}>
            {/* Left eye — semicircle curve + connected base line. */}
            <path
              d="M 170 200 A 90 90 0 0 1 350 200"
              fill="none"
              stroke={stroke}
              strokeWidth="5"
              strokeLinecap="round"
              filter="url(#crayon-rough)"
            />
            <line
              x1="170"
              y1="200"
              x2="350"
              y2="200"
              stroke={stroke}
              strokeWidth="5"
              strokeLinecap="round"
              filter="url(#crayon-rough)"
            />
            {/* Right eye — semicircle curve + connected base line. */}
            <path
              d="M 450 200 A 90 90 0 0 1 630 200"
              fill="none"
              stroke={stroke}
              strokeWidth="5"
              strokeLinecap="round"
              filter="url(#crayon-rough)"
            />
            <line
              x1="450"
              y1="200"
              x2="630"
              y2="200"
              stroke={stroke}
              strokeWidth="5"
              strokeLinecap="round"
              filter="url(#crayon-rough)"
            />
            {/* Down-lashes — bases lifted to y=215 (the strip's centre)
                so they appear to emerge from the red line; vectors
                preserved from the original outward-normal calculation
                so the fan shape stays the same. */}
            <g
              stroke={stroke}
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              filter="url(#crayon-rough)"
            >
              <line x1="200" y1="215" x2="180" y2="237" />
              <line x1="225" y1="215" x2="213" y2="243" />
              <line x1="260" y1="215" x2="260" y2="245" />
              <line x1="295" y1="215" x2="307" y2="243" />
              <line x1="320" y1="215" x2="340" y2="237" />
              <line x1="480" y1="215" x2="460" y2="237" />
              <line x1="505" y1="215" x2="493" y2="243" />
              <line x1="540" y1="215" x2="540" y2="245" />
              <line x1="575" y1="215" x2="587" y2="243" />
              <line x1="600" y1="215" x2="620" y2="237" />
            </g>
          </motion.g>

          {/* Red crayon strip — drawn last so it sits on top of the eyes
              regardless of which state they're in. */}
          <motion.path
            d="M 50 218 Q 200 208 400 213 T 750 220"
            stroke="#dc2f3a"
            strokeWidth="42"
            strokeLinecap="round"
            fill="none"
            filter="url(#crayon-rough)"
            style={{ pathLength: stripPathLength, opacity: 0.94 }}
          />
        </svg>
      </div>

      {/* Caption — letter-by-letter reveal driven by the same scroll range
          as the strip, so each new letter appears as the line extends. */}
      <div className="w-full max-w-[820px] text-center">
        <h3
          className="text-balance"
          style={{
            fontFamily:
              "var(--font-tt-norms-pro), ui-sans-serif, system-ui",
            fontWeight: 700,
            fontSize: "clamp(1.4rem, 3vw, 2.4rem)",
            lineHeight: 1.15,
            letterSpacing: "-0.018em",
            margin: 0,
          }}
        >
          {SLIDE3_TEXT.split("").map((c, i) => (
            <RevealChar key={i} char={c} index={i} head={captionHead} />
          ))}
        </h3>
      </div>
    </motion.div>
  );
}

/* ============================================================================
   SLIDE 4 — alarm bell going off + "Sensors react too late." caption.

   Same crayon aesthetic as slide 3. Lives inside the hero's pinned
   scroll region so it crossfades cleanly out of slide 3 instead of
   feeling like the page jumped to a new section.

   Geometry (viewBox 800 × 500):
     • Bell body: M 280 320 Q 280 160, 400 130 Q 520 160, 520 320 Z
       — closed dome wider at the bottom, narrower toward the top.
     • Mouth rim: line at y=320 from x=265 to x=535 (slight flare).
     • Stem: vertical line from (400, 130) up to (400, 94).
     • Crown: filled circle r=12 at (400, 86).
     • Clapper: short vertical line + filled ball hanging just below
       the bell mouth — circle r=14 at (400, 362).
     • Sound waves: three nested "(" arcs on the left at increasing
       distances from the bell, plus their mirrors ")" on the right.

   Choreography (all scroll-driven; reads from the hero's global
   scrollYProgress over the slide-4 sub-range [0.558, 0.708]):
     • Wrapper opacity     : scroll [0.558, 0.575] → 0 → 1 (fade-in)
                             scroll [0.691, 0.708] → 1 → 0 (fade-out
                             into slide 5)
     • Bell rocking        : scroll [0.5754, 0.5919, 0.6085, 0.6250,
                                     0.6415, 0.6580, 0.6745, 0.6911] →
                             [0°, -12°, 10°, -8°, 6°, -4°, 2°, 0°]
                             damped pendulum, ~1 swing per wheel notch.
     • Sound wave opacity  : scroll [0.5712, 0.5852, 0.6745, 0.6911] →
                             [0, 1, 1, 0]
     • Caption reveal head : scroll [0.5754, 0.6310] → [0, length+7] —
                             "Sensors react too late." reveals letter
                             by letter, ~¼ line per wheel notch.
   ========================================================================== */
const SLIDE4_TEXT = "Sensors react too late.";

function BellScene({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  /* Fade in then fade out so slide 4 hands cleanly off to slide 5. */
  const opacity = useTransform(
    scrollYProgress,
    [0.558, 0.5754, 0.6911, 0.7085],
    [0, 1, 1, 0],
  );

  const bellRotation = useTransform(
    scrollYProgress,
    [0.5754, 0.5919, 0.6085, 0.625, 0.6415, 0.658, 0.6745, 0.6911],
    [0, -12, 10, -8, 6, -4, 2, 0],
  );

  const waveOpacity = useTransform(
    scrollYProgress,
    [0.5712, 0.5852, 0.6745, 0.6911],
    [0, 1, 1, 0],
  );

  const captionHead = useTransform(
    scrollYProgress,
    [0.5754, 0.631],
    [0, SLIDE4_TEXT.length + 7],
  );

  const stroke = "#f3eee2";

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-[7] flex flex-col items-center justify-center gap-6 px-8"
      style={{ opacity }}
      aria-hidden
    >
      <div className="w-full max-w-[640px]">
        <svg
          viewBox="0 0 800 500"
          preserveAspectRatio="xMidYMid meet"
          className="h-auto w-full"
        >
          <defs>
            <filter
              id="crayon-rough-bell"
              x="-10%"
              y="-10%"
              width="120%"
              height="120%"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.06"
                numOctaves="2"
                seed="11"
              />
              <feDisplacementMap in="SourceGraphic" scale="3" />
            </filter>
            {/* Vibrating filter — same crayon wobble, but the
                turbulence seed cycles continuously via SMIL animation
                so every frame computes a new displacement pattern.
                Result: the rendered edges shimmer, reading as an
                alarm "buzzing" out sound. Slightly larger
                displacement scale (5 vs 3) makes the vibration more
                visible than the static crayon filter. */}
            <filter
              id="alarm-vibrate"
              x="-15%"
              y="-15%"
              width="130%"
              height="130%"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.08"
                numOctaves="2"
                seed="0"
              >
                <animate
                  attributeName="seed"
                  values="0;3;6;9;12;15;18;21;24;27;30"
                  dur="0.35s"
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" scale="5" />
            </filter>
          </defs>

          {/* Sound waves — three nested arcs on each side. They stay
              put while the bell rocks; their visibility pulses in /
              out via waveOpacity. The vibrating filter makes their
              edges shimmer continuously to read as an alarm sounding. */}
          <motion.g
            style={{ opacity: waveOpacity }}
            stroke="#dc2f3a"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            filter="url(#alarm-vibrate)"
          >
            <path d="M 245 195 Q 225 240 245 285" />
            <path d="M 215 175 Q 190 240 215 305" />
            <path d="M 185 155 Q 155 240 185 325" />
            <path d="M 555 195 Q 575 240 555 285" />
            <path d="M 585 175 Q 610 240 585 305" />
            <path d="M 615 155 Q 645 240 615 325" />
          </motion.g>

          {/* Bell body — rotates around the top of the stem (400, 92).
              transform-box defaults to view-box for SVG, so the
              transform-origin is interpreted in viewBox units. */}
          <motion.g
            style={{
              rotate: bellRotation,
              transformOrigin: "400px 92px",
            }}
          >
            {/* Bell dome */}
            <path
              d="M 280 320 Q 280 160 400 130 Q 520 160 520 320 Z"
              fill="none"
              stroke={stroke}
              strokeWidth="5"
              strokeLinejoin="round"
              strokeLinecap="round"
              filter="url(#crayon-rough-bell)"
            />
            {/* Mouth rim — slight flare beyond the dome's bottom edge */}
            <line
              x1="265"
              y1="320"
              x2="535"
              y2="320"
              stroke={stroke}
              strokeWidth="5"
              strokeLinecap="round"
              filter="url(#crayon-rough-bell)"
            />
            {/* Stem */}
            <line
              x1="400"
              y1="130"
              x2="400"
              y2="94"
              stroke={stroke}
              strokeWidth="5"
              strokeLinecap="round"
              filter="url(#crayon-rough-bell)"
            />
            {/* Crown */}
            <circle
              cx="400"
              cy="86"
              r="12"
              fill={stroke}
              filter="url(#crayon-rough-bell)"
            />
            {/* Clapper hanging below the bell mouth */}
            <line
              x1="400"
              y1="320"
              x2="400"
              y2="350"
              stroke={stroke}
              strokeWidth="4"
              strokeLinecap="round"
              filter="url(#crayon-rough-bell)"
            />
            <circle
              cx="400"
              cy="362"
              r="14"
              fill={stroke}
              filter="url(#crayon-rough-bell)"
            />
          </motion.g>
        </svg>
      </div>

      {/* Caption — letter-by-letter reveal, in lockstep with the ringing
          via the same captionHead motion value. */}
      <div className="w-full max-w-[820px] text-center">
        <h3
          className="text-balance"
          style={{
            fontFamily:
              "var(--font-tt-norms-pro), ui-sans-serif, system-ui",
            fontWeight: 700,
            fontSize: "clamp(1.4rem, 3vw, 2.4rem)",
            lineHeight: 1.15,
            letterSpacing: "-0.018em",
            margin: 0,
          }}
        >
          {SLIDE4_TEXT.split("").map((c, i) => (
            <RevealChar key={i} char={c} index={i} head={captionHead} />
          ))}
        </h3>
      </div>
    </motion.div>
  );
}

/* ============================================================================
   SLIDE 5 — hammer striking the ground + "Simulators can't accurately
   model contact physics." caption.

   Same crayon aesthetic as slides 3 and 4. The hammer hangs from a
   grip point at (400, 100) that acts as the rotation pivot; the
   handle hangs down to (400, 350) with a head-block (350,350)–
   (450,380) attached at the bottom. In the rest/striking pose
   (rotation = 0°) the bottom of the head sits exactly on the ground
   line at y=380. The hammer is initially raised to -75° and swings
   clockwise to 0° to strike, with a small bounce afterwards.

   At impact, six red reaction lines burst outward from (400, 380)
   along radial directions (above-flat-left, up-left, up-left-strong,
   up-right-strong, up-right, above-flat-right). They use motion.path
   d="M 400 380 L tx ty" with a shared pathLength motion value driven
   from 0 → 1 over the impact window, so each spike grows out from
   the impact point. The same animated-seed turbulence filter from
   the alarm bell (alarm-vibrate-hammer) is applied so the lines
   shimmer continuously, matching the bell's vibration aesthetic.

   Choreography:
     • Wrapper opacity     : scroll [0.7026, 0.7200] → 0 → 1 (fade-in)
                             scroll [0.8415, 0.8589] → 1 → 0 (fade-out)
     • Hammer rotation     : scroll [0.7200, 0.7724, 0.7840, 0.7956] →
                             [-75°, 0°, -8°, 0°] — raise→swing→bounce
                             →rest. Impact occurs at scroll 0.7724.
     • Reaction line opacity: scroll [0.7724, 0.7840] → 0 → 1
     • Reaction pathLength : scroll [0.7724, 0.7956] → 0 → 1
     • Caption reveal head : scroll [0.7724, 0.8415] → [0, length+7]
   ========================================================================== */
const SLIDE5_TEXT =
  "Simulators can't accurately model contact physics.";

function HammerScene({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  const opacity = useTransform(
    scrollYProgress,
    [0.7026, 0.72, 0.8415, 0.8589],
    [0, 1, 1, 0],
  );

  const hammerRotation = useTransform(
    scrollYProgress,
    [0.72, 0.7724, 0.784, 0.7956],
    [-75, 0, -8, 0],
  );

  const reactionOpacity = useTransform(
    scrollYProgress,
    [0.7724, 0.784],
    [0, 1],
  );

  const reactionLineLength = useTransform(
    scrollYProgress,
    [0.7724, 0.7956],
    [0, 1],
  );

  const captionHead = useTransform(
    scrollYProgress,
    [0.7724, 0.8415],
    [0, SLIDE5_TEXT.length + 7],
  );

  const stroke = "#f3eee2";

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-[7] flex flex-col items-center justify-center gap-6 px-8"
      style={{ opacity }}
      aria-hidden
    >
      <div className="w-full max-w-[640px]">
        <svg
          viewBox="0 0 800 500"
          preserveAspectRatio="xMidYMid meet"
          className="h-auto w-full"
        >
          <defs>
            <filter
              id="crayon-rough-hammer"
              x="-10%"
              y="-10%"
              width="120%"
              height="120%"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.06"
                numOctaves="2"
                seed="17"
              />
              <feDisplacementMap in="SourceGraphic" scale="3" />
            </filter>
            {/* Same vibrating filter recipe as the alarm bell — animated
                seed cycles produce a shimmering shimmer on whatever the
                filter is applied to. Used for the red reaction lines. */}
            <filter
              id="alarm-vibrate-hammer"
              x="-15%"
              y="-15%"
              width="130%"
              height="130%"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.08"
                numOctaves="2"
                seed="0"
              >
                <animate
                  attributeName="seed"
                  values="0;3;6;9;12;15;18;21;24;27;30"
                  dur="0.35s"
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" scale="5" />
            </filter>
          </defs>

          {/* Ground — horizontal line the hammer strikes against. */}
          <line
            x1="150"
            y1="380"
            x2="650"
            y2="380"
            stroke={stroke}
            strokeWidth="5"
            strokeLinecap="round"
            filter="url(#crayon-rough-hammer)"
          />

          {/* Hammer — handle + head, rotates around the grip at
              (400, 100). At rotation = 0° the head's bottom edge sits
              exactly on the ground line. */}
          <motion.g
            style={{
              rotate: hammerRotation,
              transformOrigin: "400px 100px",
            }}
          >
            {/* Handle */}
            <line
              x1="400"
              y1="100"
              x2="400"
              y2="350"
              stroke={stroke}
              strokeWidth="6"
              strokeLinecap="round"
              filter="url(#crayon-rough-hammer)"
            />
            {/* Head — perpendicular block at the bottom of the handle */}
            <path
              d="M 350 350 L 450 350 L 450 380 L 350 380 Z"
              fill="none"
              stroke={stroke}
              strokeWidth="5"
              strokeLinejoin="round"
              strokeLinecap="round"
              filter="url(#crayon-rough-hammer)"
            />
            {/* Grip dot at the pivot for visual emphasis */}
            <circle
              cx="400"
              cy="100"
              r="8"
              fill={stroke}
              filter="url(#crayon-rough-hammer)"
            />
          </motion.g>

          {/* Reaction lines — six red spikes radiating from the impact
              point at (400, 380). pathLength grows them outward; the
              animated turbulence filter shimmers their edges. */}
          <motion.g
            style={{ opacity: reactionOpacity }}
            stroke="#dc2f3a"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            filter="url(#alarm-vibrate-hammer)"
          >
            <motion.path
              d="M 400 380 L 320 360"
              style={{ pathLength: reactionLineLength }}
            />
            <motion.path
              d="M 400 380 L 340 320"
              style={{ pathLength: reactionLineLength }}
            />
            <motion.path
              d="M 400 380 L 375 300"
              style={{ pathLength: reactionLineLength }}
            />
            <motion.path
              d="M 400 380 L 425 300"
              style={{ pathLength: reactionLineLength }}
            />
            <motion.path
              d="M 400 380 L 460 320"
              style={{ pathLength: reactionLineLength }}
            />
            <motion.path
              d="M 400 380 L 480 360"
              style={{ pathLength: reactionLineLength }}
            />
          </motion.g>
        </svg>
      </div>

      {/* Caption — letter-by-letter reveal, starts at impact and runs
          through the rest of the slide. */}
      <div className="w-full max-w-[820px] text-center">
        <h3
          className="text-balance"
          style={{
            fontFamily:
              "var(--font-tt-norms-pro), ui-sans-serif, system-ui",
            fontWeight: 700,
            fontSize: "clamp(1.4rem, 3vw, 2.4rem)",
            lineHeight: 1.15,
            letterSpacing: "-0.018em",
            margin: 0,
          }}
        >
          {SLIDE5_TEXT.split("").map((c, i) => (
            <RevealChar key={i} char={c} index={i} head={captionHead} />
          ))}
        </h3>
      </div>
    </motion.div>
  );
}

/* ============================================================================
   SLIDE 6 — long manifesto paragraph + tiny grey citation.

   Final beat of the pinned story. Just text — no icon, no animation.
   The whole block fades in as a unit (a per-letter reveal would take
   far too much scroll for 290 chars), then holds for ~11 wheel notches
   so the user has time to read before the section unpins.

   Typography:
     • Paragraph: TT Norms Pro Medium (500) — the "regular" weight in
       this project's loaded set, since 400 isn't loaded. Justified
       at body-text size on a comfortable reading column.
     • Citation: TT Norms Pro Light (300), tiny, dim cool-grey,
       right-aligned beneath the paragraph as a footnote.
   ========================================================================== */
const SLIDE6_TEXT =
  "Industrial robots excel at pick-and-place in controlled environments but break down on contact-rich manipulation, where success depends on fine-grained force control and physical precision. They lack feel *. They find out they're pressing too hard 200 milliseconds after the part is already crushed.";
const SLIDE6_CITATION = "*NVIDIA R2D2, 2025";

function ManifestoScene({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  /* Fade in over [0.8474, 0.8647] (overlaps slide 5 fade-out for a
     clean crossfade), then hold visible to the end of the section. */
  const opacity = useTransform(
    scrollYProgress,
    [0.8474, 0.8647],
    [0, 1],
  );

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-[7] flex items-center justify-center px-8"
      style={{ opacity }}
      aria-hidden
    >
      <div className="pointer-events-auto w-full max-w-[820px] cursor-text select-text">
        <p
          style={{
            fontFamily:
              "var(--font-tt-norms-pro), ui-sans-serif, system-ui",
            fontWeight: 500,
            fontSize: "clamp(1.05rem, 1.55vw, 1.4rem)",
            lineHeight: 1.55,
            letterSpacing: "-0.005em",
            color: "rgba(245, 250, 255, 0.94)",
            margin: 0,
            textAlign: "justify",
            hyphens: "auto",
          }}
        >
          {SLIDE6_TEXT}
        </p>
        <p
          style={{
            marginTop: "1.4em",
            fontFamily:
              "var(--font-tt-norms-pro), ui-sans-serif, system-ui",
            fontWeight: 300,
            fontStyle: "normal",
            fontSize: "clamp(0.7rem, 0.82vw, 0.85rem)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "rgba(170, 180, 195, 0.55)",
            textAlign: "right",
            margin: 0,
          }}
        >
          {SLIDE6_CITATION}
        </p>
      </div>
    </motion.div>
  );
}

/* ============================================================================
   HERO
   ========================================================================== */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.15 + i * 0.08,
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

function Hero() {
  const { phase } = useIntro();
  const heroReady = phase === "hero" || phase === "done";
  const sectionRef = useRef<HTMLElement | null>(null);

  /* Click-to-pulse: bumping the key remounts the flash overlays so their
     0 → 1 → 0 keyframe runs again on every click. */
  const [flashKey, setFlashKey] = useState(0);
  const triggerFlash = () => setFlashKey((k) => k + 1);

  /* Scroll-pin: section is 200svh tall with a sticky 100svh viewport inside.
     Progress goes 0 → 1 over the 100svh of pinned scrolling — that drives
     the red fill. Once it completes the section unpins and the page
     continues scrolling normally to the stats / next sections. */
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  /* Mixed model:
       0    → 0.32 : red helmet fill rises / drops          (scroll-driven)
       0.4  → 0.5  : NOVONUS backdrop fades out / back in   (scroll-driven)
       past 0.55   : stage 1 → hero artwork snaps right     (single scroll)
       past 0.65   : stage 2 → tagline snaps in             (single scroll)
       past 0.80   : stage 3 → hero + tagline fade out,
                                manifesto replaces them      (single scroll)
     The stage transitions use a duration-based animation, so a single
     scroll past the threshold plays the whole beat regardless of how far
     the user pushes the wheel. */
  /* Scroll-driven phases:
       0    → 0.30 : helmet mask fills with red (rises bottom → top)
       0.30 → 0.38 : 'Somatic Layer' pill fades out
       0.40 onwards: red glow whole-screen animation begins. */
  const fillHeight = useTransform(scrollYProgress, [0, 0.0926], ["0%", "100%"]);
  const fillOpacity = useTransform(
    scrollYProgress,
    [0, 0.012, 1],
    [0, 1, 1],
  );
  const novonusOpacity = useTransform(
    scrollYProgress,
    [0.0926, 0.1157],
    [1, 0],
  );

  /* Late phase — hero artwork and red glow are out of the transition.
     Section height is 900svh (800svh of pinned scroll), so 1 wheel
     notch ≈ 0.01157 of progress. Early phases below preserve the
     same wheel-notch counts as the original 350svh layout (helmet 8,
     somatic 2, artwork 4) so they scroll at the original speed; the
     post-0.168 region holds the six-slide story.
         v=0.093 → 0.116 somatic layer text fades.
         v=0.122 → 0.168 hero artwork fades out cleanly.
         v=0.168 → 0.286 slide 2 sentence reveals char-by-char
                         (~¼ line / wheel notch).
         v=0.286 → 0.379 slide 2 holds (8 wheel notches).
         v=0.379 → 0.396 slide 2 fades out.
         v=0.390 → 0.408 slide 3 eyes fade in.
         v=0.408 → 0.454 slide 3 strip + caption reveal.
         v≈0.419         eyes blink shut (strip ¼ mark).
         v≈0.431         eyes open again (strip ½ mark).
         v=0.454 → 0.546 slide 3 holds (8 wheel notches).
         v=0.546 → 0.564 slide 3 fades out.
         v=0.558 → 0.575 slide 4 (alarm bell) fades in.
         v=0.575 → 0.691 bell rings + "Sensors react too late."
         v=0.691 → 0.708 slide 4 fades out.
         v=0.703 → 0.720 slide 5 (hammer) fades in.
         v=0.720 → 0.842 hammer raises, swings down, impacts, red
                         reaction lines burst out vibrating, and
                         "Simulators can't accurately model contact
                         physics" caption reveals letter-by-letter.
         v=0.842 → 0.859 slide 5 fades out.
         v=0.847 → 0.865 slide 6 (manifesto + citation) fades in.
         v=0.865 → 1.000 slide 6 holds — long enough to read the
                         paragraph (~11 wheel notches). */
  const heroFadeOpacity = useTransform(
    scrollYProgress,
    [0.1215, 0.1678],
    [1, 0],
  );
  /* Reveal head — drives the per-char color/opacity in slide 2.
     Range [0.1678, 0.2862] = 0.1184 wide. At 900svh that's ~10 wheel
     notches, giving ¼-line-per-scroll reveal speed. */
  const revealHead = useTransform(
    scrollYProgress,
    [0.1678, 0.2862],
    [0, SLIDE2_TEXT.length + 7],
  );
  /* Slide 2 fade-out — clears the sentence after the 8-notch hold so
     the eyes scene can land on a clean chart-paper field. */
  const slide2FadeOpacity = useTransform(
    scrollYProgress,
    [0.3787, 0.3961],
    [1, 0],
  );

  const [stage, setStage] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    /* aria-hidden flips off once the reveal has fully completed, so
       screen readers announce the finished sentence as one unit. */
    setStage(v > 0.2862 ? 3 : 0);
  });

  return (
    <>
      <section
        ref={sectionRef}
        className="relative bg-ink"
        style={{ height: "900svh" }}
      >
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          <LinenBackground />


          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-[20svh]"
            style={{
              background:
                "linear-gradient(to bottom, transparent 0%, rgba(8,10,16,0.4) 70%, rgb(8,10,16) 100%)",
            }}
          />

          <div className="relative z-[2] mx-auto flex h-full max-w-[1400px] flex-col items-center justify-center px-6 md:px-10">
            {/* Hero fade wrapper — clean scroll-driven opacity fade-out.
                No scale, no translate, no glow. Inner stack keeps its
                intro reveal + 32% right-shift. */}
            <motion.div
              className="relative w-full max-w-[1100px]"
              style={{ opacity: heroFadeOpacity }}
            >
            {/* Hero image container — graceful reveal after intro docking.
                After the NOVONUS fade completes, a single scroll past the
                stage-1 threshold snaps the artwork to its right-shifted
                position via a fixed-duration animation, independent of how
                far the user actually scrolls. */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 24, x: "32%" }}
              animate={{
                opacity: heroReady ? 1 : 0,
                scale: heroReady ? 1 : 0.96,
                y: heroReady ? 0 : 24,
                x: "32%",
              }}
              transition={{
                duration: 0.9,
                ease: [0.22, 1, 0.36, 1],
                opacity: { duration: 0.7, ease: [0.4, 0, 0.2, 1] },
              }}
              className="hero-stack relative aspect-[16/10] w-full mix-blend-screen select-none"
              style={{
                WebkitUserSelect: "none",
                userSelect: "none",
              }}
            >
              {/* LAYER 1 (BACK): Cyan brain outline glow */}
              <motion.div
                aria-hidden
                className="pointer-events-none absolute mix-blend-screen z-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: heroReady ? 1 : 0 }}
                transition={{
                  duration: 1.6,
                  ease: [0.22, 1, 0.36, 1],
                  delay: heroReady ? 0.3 : 0,
                }}
                style={{
                  left: "29%",
                  top: "6.5%",
                  width: "35%",
                  height: "47%",
                }}
              >
                <Image
                  src="/brain_outline.png"
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 1100px, (min-width: 768px) 80vw, 95vw"
                  className="object-fill neon-reveal-cyan"
                />
              </motion.div>

              {/* LAYER 2 (MIDDLE): Base hero image */}
              <Image
                src="/hero-image.png"
                alt="Novonus yard intelligence"
                fill
                priority
                sizes="(min-width: 1280px) 1100px, (min-width: 768px) 80vw, 95vw"
                className="object-contain mix-blend-screen"
              />

              {/* LAYER 2.5: Scroll-driven red fill — rises from the bottom of
                  the helmet, clipped to the outline silhouette so it stays
                  inside the enclosed area defined by hero-lines-overlay.png. */}
              <div
                aria-hidden
                className="pointer-events-none absolute z-[15] overflow-hidden"
                style={{
                  left: "19.38%",
                  top: "2.43%",
                  width: "48.70%",
                  height: "70.66%",
                  WebkitMaskImage: "url(/helmet-silhouette.png)",
                  maskImage: "url(/helmet-silhouette.png)",
                  WebkitMaskSize: "100% 100%",
                  maskSize: "100% 100%",
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                }}
              >
                <motion.div
                  className="absolute inset-x-0 bottom-0"
                  style={{
                    height: fillHeight,
                    opacity: fillOpacity,
                    background:
                      "linear-gradient(to top, rgba(255, 25, 50, 0.82) 0%, rgba(255, 35, 65, 0.78) 55%, rgba(255, 55, 85, 0.62) 78%, rgba(255, 90, 120, 0.28) 92%, rgba(255, 130, 155, 0) 100%)",
                    mixBlendMode: "screen",
                  }}
                />
              </div>

              {/* LAYER 3 (FRONT): Red neon outline */}
              <motion.div
                aria-hidden
                className="pointer-events-none absolute mix-blend-screen z-20"
                initial={{ opacity: 0 }}
                animate={{ opacity: heroReady ? 1 : 0 }}
                transition={{
                  duration: 1.4,
                  ease: [0.22, 1, 0.36, 1],
                  delay: heroReady ? 0.4 : 0,
                }}
                style={{
                  left: "19.38%",
                  top: "2.43%",
                  width: "48.70%",
                  height: "70.66%",
                }}
              >
                <Image
                  src="/hero-lines-overlay.png"
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 540px, (min-width: 768px) 40vw, 47vw"
                  className="object-fill neon-reveal"
                />
              </motion.div>

              {/* CLICK FLASH — cyan bloom inside the brain only. Brain
                  outline is the mask, heavy blur lets cyan light bleed
                  inward to fill the enclosed area. Smooth ramp/hold/fade. */}
              {flashKey > 0 && (
                <motion.div
                  key={`flash-cyan-${flashKey}`}
                  aria-hidden
                  className="pointer-events-none absolute mix-blend-screen z-[17]"
                  style={{
                    left: "29%",
                    top: "6.5%",
                    width: "35%",
                    height: "47%",
                    background: "rgba(40, 220, 255, 1)",
                    WebkitMaskImage: "url(/brain_outline.png)",
                    maskImage: "url(/brain_outline.png)",
                    WebkitMaskSize: "100% 100%",
                    maskSize: "100% 100%",
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    filter: "blur(28px) saturate(1.4)",
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 0] }}
                  transition={{
                    duration: 2.6,
                    times: [0, 0.22, 0.5, 1],
                    ease: [0.4, 0, 0.2, 1],
                  }}
                />
              )}

              {/* CLICK FLASH — red bloom inside the helmet silhouette. */}
              {flashKey > 0 && (
                <motion.div
                  key={`flash-red-${flashKey}`}
                  aria-hidden
                  className="pointer-events-none absolute mix-blend-screen z-[18]"
                  style={{
                    left: "19.38%",
                    top: "2.43%",
                    width: "48.70%",
                    height: "70.66%",
                    background: "rgba(255, 22, 55, 1)",
                    WebkitMaskImage: "url(/helmet-silhouette.png)",
                    maskImage: "url(/helmet-silhouette.png)",
                    WebkitMaskSize: "100% 100%",
                    maskSize: "100% 100%",
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    filter: "saturate(1.4)",
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 0] }}
                  transition={{
                    duration: 2.6,
                    times: [0, 0.22, 0.5, 1],
                    ease: [0.4, 0, 0.2, 1],
                  }}
                />
              )}

              {/* CLICK TARGET — pixel-precise to the helmet silhouette.
                  SVG <image> with pointer-events="visiblePainted" only
                  fires on opaque silhouette pixels, so clicks register
                  anywhere inside the red helmet outline (and ignore the
                  surrounding empty area). */}
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden
                className="absolute z-[19]"
                style={{
                  left: "19.38%",
                  top: "2.43%",
                  width: "48.70%",
                  height: "70.66%",
                  pointerEvents: "none",
                }}
              >
                <image
                  href="/helmet-silhouette.png"
                  x={0}
                  y={0}
                  width={100}
                  height={100}
                  preserveAspectRatio="none"
                  onClick={triggerFlash}
                  style={{
                    pointerEvents: "visiblePainted",
                    cursor: "pointer",
                    opacity: 0.01,
                  }}
                />
              </svg>
            </motion.div>
            </motion.div>
          </div>

          {/* Slide 2 — single sentence revealed letter by letter as the
              user scrolls. Vertically centered, generous max-width so
              lines run long. Per-char visual reveal is owned by the
              transforms inside RevealChar; the wrapper additionally
              fades the whole sentence out at 0.85 → 0.90 to make room
              for slide 3. aria-hidden flips off after full reveal so
              screen readers get the finished sentence as one unit. */}
          <motion.div
            className="pointer-events-none absolute inset-0 z-[6] flex items-center justify-center px-4 md:px-8"
            style={{ opacity: slide2FadeOpacity }}
            aria-hidden={stage < 3}
          >
            <div className="pointer-events-auto w-full max-w-[1320px] cursor-text select-text">
              <h2
                className="text-balance"
                style={{
                  fontFamily:
                    "var(--font-tt-norms-pro), ui-sans-serif, system-ui",
                  fontWeight: 800,
                  fontSize: "clamp(2.6rem, 5.6vw, 5.2rem)",
                  lineHeight: 1.04,
                  letterSpacing: "-0.025em",
                  margin: 0,
                  textAlign: "center",
                }}
              >
                {SLIDE2_TEXT.split("").map((c, i) => (
                  <RevealChar
                    key={i}
                    char={c}
                    index={i}
                    head={revealHead}
                  />
                ))}
              </h2>
            </div>
          </motion.div>

          {/* Slide 3 — pair of crayon-style eyes that blink once and then
              get a red crayon strip drawn across them. Owns its own
              scroll-driven fade-in/out and the strip+caption reveal. */}
          <EyesScene scrollYProgress={scrollYProgress} />

          {/* Slide 4 — alarm bell + "Sensors react too late." caption.
              Crossfades in over slide 3's fade-out so the transition
              happens inside the same pinned region instead of jumping
              to a new section. */}
          <BellScene scrollYProgress={scrollYProgress} />

          {/* Slide 5 — hammer striking ground + red reaction lines +
              "Simulators can't accurately model contact physics."
              caption. Crossfades in over slide 4's fade-out. */}
          <HammerScene scrollYProgress={scrollYProgress} />

          {/* Slide 6 — long manifesto paragraph + tiny *NVIDIA R2D2
              citation. Final beat; just fades in and holds long
              enough to read. */}
          <ManifestoScene scrollYProgress={scrollYProgress} />

          {/* Main landing-page heading — big bold technical statement on
              the left side of the viewport, balancing the hero artwork
              shifted to the right. Outer wrapper fades it via
              novonusOpacity so it leaves as the helmet glow takes over;
              inner motion.div handles the intro fade-in. Both layers
              are pointer-events-none so clicks pass through to the
              brain SVG hit-target on the helmet. */}
          <motion.div
            className="pointer-events-none absolute left-0 top-1/2 z-[5] hidden w-[56%] max-w-[820px] -translate-y-1/2 px-8 md:block md:pl-[6vw] lg:pl-[8vw]"
            style={{ opacity: novonusOpacity }}
          >
            <motion.div
              className="pointer-events-none"
              initial={{ opacity: 0, y: 16 }}
              animate={{
                opacity: heroReady ? 1 : 0,
                y: heroReady ? 0 : 16,
              }}
              transition={{
                duration: 0.85,
                ease: [0.22, 1, 0.36, 1],
                delay: heroReady ? 0.5 : 0,
              }}
            >
              <p
                className="pointer-events-none"
                style={{
                  fontFamily:
                    "var(--font-tt-norms-pro), ui-sans-serif, system-ui",
                  fontWeight: 300,
                  fontStyle: "normal",
                  fontSize: "clamp(0.92rem, 1.1vw, 1.1rem)",
                  lineHeight: 1.5,
                  letterSpacing: "0.005em",
                  color: "var(--cyan)",
                  margin: 0,
                  marginBottom: "1em",
                }}
              >
                [ pipeline for robots powered by humans ]
              </p>
              <h1
                className="pointer-events-none text-balance text-paper"
                style={{
                  fontFamily:
                    "var(--font-tt-norms-pro), ui-sans-serif, system-ui",
                  fontWeight: 600,
                  fontStyle: "normal",
                  fontSize: "clamp(2.1rem, 4.4vw, 3.8rem)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  margin: 0,
                }}
              >
                The Somatic Layer for Industrial Autonomy
              </h1>
              <p
                className="pointer-events-none"
                style={{
                  fontFamily:
                    "var(--font-tt-norms-pro), ui-sans-serif, system-ui",
                  fontWeight: 300,
                  fontStyle: "normal",
                  fontSize: "clamp(0.92rem, 1.1vw, 1.1rem)",
                  lineHeight: 1.55,
                  letterSpacing: "0.005em",
                  color: "rgba(255, 255, 255, 1)",
                  margin: 0,
                  marginTop: "1.4em",
                  maxWidth: "32em",
                }}
              >
                We capture the biological signal that decides whether
                contact-rich assembly succeeds or fails, and we just
                solved a thirty-year problem industrial robotics
                couldn&apos;t.{" "}
                <span
                  style={{
                    color: "var(--cyan)",
                    fontWeight: 500,
                  }}
                >
                  Robots can finally feel.
                </span>
              </p>
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* Stats — visible after the pinned hero releases */}
      <section className="relative bg-ink py-16 md:py-24">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="grid w-full gap-8 border-t border-paper/10 pt-10 md:grid-cols-3 md:gap-12"
          >
            <Stat label="Loads orchestrated" digits={[8, 4, 2]} suffix="K+" />
            <Stat label="Reduction in dwell time" digits={[3, 7]} suffix="%" />
            <Stat label="Yards going live" digits={[2, 4]} suffix="/wk" />
          </motion.div>
        </div>
      </section>
    </>
  );
}

function Stat({
  label,
  digits,
  suffix,
}: {
  label: string;
  digits: number[];
  suffix: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-1 text-cyan">
        {digits.map((d, i) => (
          <DigitReel key={i} target={d} size={64} delay={300 + i * 120} />
        ))}
        <span className="ml-1 font-mono text-3xl font-medium leading-none">
          {suffix}
        </span>
      </div>
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-paper/55">
        {label}
      </p>
    </div>
  );
}

/* ============================================================================
   FEATURE LIST
   ========================================================================== */

const FEATURES = [
  "Autonomous, agentic AI-driven workflows from gate to dock",
  "Single pane of glass visibility of all yard operations",
  "Managed by a unified platform with AI computer vision",
  "Highly configurable to all yards in your network",
  "Unlocked value of your existing WMS/TMS",
  "Digitally transformed, data rich, and predictive",
];

function FeatureList() {
  return (
    <section
      id="system"
      className="relative bg-ink pt-24 pb-32 md:pt-32 md:pb-40"
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <p className="eyebrow mb-10">◆ The System</p>

        <ul className="grid gap-x-12 gap-y-2 md:grid-cols-2">
          {FEATURES.map((line, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{
                duration: 0.6,
                delay: i * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="group flex items-start gap-6 border-b border-paper/10 py-6"
            >
              <span className="mt-1 font-mono text-xs tracking-widest text-cyan">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="text-balance text-xl leading-snug text-paper md:text-2xl">
                {line}
              </p>
            </motion.li>
          ))}
        </ul>

        <div className="mt-24 flex flex-col gap-4">
          <p className="font-mono text-sm uppercase tracking-[0.18em] text-paper/55">
            That&apos;s the
          </p>
          <h2 className="text-balance text-[44px] font-medium leading-[0.95] tracking-[-0.02em] text-paper md:text-[96px]">
            <SpacedReveal text="Somatic Control Stack." />
          </h2>
          <p className="mt-4 font-mono text-2xl tracking-[0.4em] text-cyan md:text-4xl">
            YOS™
          </p>
        </div>
      </div>
    </section>
  );
}

/* Single letter whose opacity & y are scroll-bound — buttery smooth in both
   directions because it tracks scrollYProgress rather than time-based delays. */
function ScrollLetter({
  ch,
  progress,
  start,
  end,
}: {
  ch: string;
  progress: MotionValue<number>;
  start: number;
  end: number;
}) {
  const opacity = useTransform(progress, [start, end], [0, 1]);
  const y = useTransform(progress, [start, end], [10, 0]);
  return (
    <motion.span
      aria-hidden
      style={{
        opacity,
        y,
        display: "inline-block",
        marginRight: ch === " " ? "0.28ch" : "0.01ch",
      }}
    >
      {ch === " " ? " " : ch}
    </motion.span>
  );
}

/* Splits a string into staggered scroll-bound letters. Letters are grouped
   per word and the word wrappers carry `white-space: nowrap` so line breaks
   only ever land between words — never inside one. */
function LetterStream({
  text,
  progress,
  start,
  end,
}: {
  text: string;
  progress: MotionValue<number>;
  start: number;
  end: number;
}) {
  const chars = text.split("");
  const N = chars.length;
  const span = end - start;
  const window = Math.min(span, (span / N) * 3);

  /* Walk characters once, grouping non-space runs into word buckets while
     preserving each character's global index for stagger timing. */
  const words: { ch: string; index: number }[][] = [];
  let current: { ch: string; index: number }[] | null = null;
  chars.forEach((ch, i) => {
    if (ch === " ") {
      current = null;
    } else {
      if (!current) {
        current = [];
        words.push(current);
      }
      current.push({ ch, index: i });
    }
  });

  const letterStart = (i: number) =>
    start + (span - window) * (i / Math.max(N - 1, 1));

  return (
    <span className="inline">
      {words.map((wordChars, wi) => (
        <span
          key={wi}
          style={{ display: "inline-block", whiteSpace: "nowrap" }}
        >
          {wordChars.map(({ ch, index }) => (
            <ScrollLetter
              key={index}
              ch={ch}
              progress={progress}
              start={letterStart(index)}
              end={letterStart(index) + window}
            />
          ))}
          {wi < words.length - 1 ? " " : null}
        </span>
      ))}
    </span>
  );
}

function SpacedReveal({ text }: { text: string }) {
  return (
    <span aria-label={text} className="inline-block">
      {text.split("").map((ch, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.5,
            delay: 0.02 * i,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="inline-block"
          style={{ marginRight: ch === " " ? "0.4ch" : "0.04ch" }}
        >
          {ch === " " ? "\u00A0" : ch}
        </motion.span>
      ))}
    </span>
  );
}

/* ============================================================================
   BENEFITS
   ========================================================================== */

const BENEFITS = [
  {
    icon: Cpu,
    title: "A single solution for maximum, automated throughput",
    body: "Deep integrations anticipate incoming loads, enabling our AI computer vision technology to automate gate check-ins and all critical yard operations: from assigning locations and maintaining real-time visibility to coordinating spotters for efficient load movement. It then closes the loop by validating assets before exit, providing comprehensive performance supervision across your entire yard network.",
  },
  {
    icon: Workflow,
    title: "Easy, scalable operation",
    body: "Novonus was designed from the ground up for disruption-free operations. Easy to deploy and support, the system has a low IT lift with no 3rd party devices to support, and a modern UI/UX that's super-easy for operators to use from day one. Configurable to your yard, Novonus YOS integrates seamlessly with most TMS and WMS systems.",
  },
  {
    icon: TrendingUp,
    title: "Rapid, repeatable ROI",
    body: "We know that yard operations run on lean budgets, which is why we price our all-inclusive solution as a service with terms that won't bust the bank. Ready to deploy right away, and rapid to scale over time.",
  },
];

function Benefits() {
  return (
    <section className="relative bg-paper/[0.02] py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="mb-16 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow mb-4">◆ Benefits</p>
            <h2 className="max-w-3xl text-balance text-4xl font-medium leading-[1.05] tracking-[-0.02em] text-paper md:text-6xl">
              Everything operators need.{" "}
              <span className="text-paper/55">Nothing they don&apos;t.</span>
            </h2>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {BENEFITS.map((b, i) => {
            const Icon = b.icon;
            return (
              <motion.article
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{
                  duration: 0.7,
                  delay: i * 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="group relative flex flex-col gap-6 overflow-hidden rounded-3xl border border-paper/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-7 transition-colors hover:border-cyan/30"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs tracking-[0.22em] text-cyan">
                    BENEFIT {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="grid h-10 w-10 place-items-center rounded-full border border-paper/15 bg-cyan/5 text-cyan transition-colors group-hover:bg-cyan group-hover:text-ink">
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                  </span>
                </div>

                <h3 className="text-balance text-2xl font-medium leading-snug text-paper">
                  {b.title}
                </h3>

                <p className="text-[15px] leading-relaxed text-paper/65">
                  {b.body}
                </p>

                <div className="mt-auto flex items-center gap-2 pt-2 text-sm text-cyan opacity-0 transition-opacity group-hover:opacity-100">
                  Read more
                  <Arrow className="h-3 w-3" />
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   INDUSTRY LOGOS
   ========================================================================== */

const BUILDERS = ["Ryder", "Prologis", "NFI", "Lineage", "8VC"];
const OPERATORS = [
  "Coca-Cola",
  "HP",
  "DHL",
  "Maersk",
  "Schneider",
  "C.H. Robinson",
  "FedEx",
  "Amazon",
];

function IndustryLogos() {
  return (
    <section className="relative bg-ink py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="mb-12 flex flex-col gap-3">
          <p className="eyebrow">◆ Built by the Industry</p>
          <h2 className="max-w-3xl text-balance text-3xl font-medium leading-[1.1] tracking-[-0.02em] text-paper md:text-5xl">
            Built by logistics leaders who want a new industry standard in the
            yard.
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-paper/10 bg-paper/10 md:grid-cols-5">
          {BUILDERS.map((name) => (
            <div
              key={name}
              className="flex h-32 items-center justify-center bg-ink"
            >
              <span className="font-mono text-base tracking-[0.16em] text-paper/70">
                {name.toUpperCase()}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-24 flex flex-col gap-3">
          <p className="eyebrow">◆ Trusted by Operators</p>
          <h2 className="max-w-3xl text-balance text-3xl font-medium leading-[1.1] tracking-[-0.02em] text-paper md:text-5xl">
            Trusted by leading operators looking for real yard innovation.
          </h2>
        </div>

        <div className="relative mt-12 overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-ink to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-ink to-transparent" />
          <div className="flex w-max animate-marquee gap-px">
            {[...OPERATORS, ...OPERATORS].map((name, i) => (
              <div
                key={i}
                className="flex h-24 w-56 shrink-0 items-center justify-center border border-paper/10 bg-white/[0.02]"
              >
                <span className="font-mono text-sm tracking-widest text-paper/55">
                  {name.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   TESTIMONIAL
   ========================================================================== */

function Testimonial() {
  return (
    <section className="relative overflow-hidden bg-ink py-24 md:py-36">
      <div className="glow-accent absolute -right-40 top-1/2 h-[500px] w-[500px] -translate-y-1/2" />

      <div className="relative mx-auto grid max-w-[1400px] gap-12 px-6 md:grid-cols-12 md:px-10">
        <div className="md:col-span-5">
          <div className="aspect-[4/5] w-full overflow-hidden rounded-3xl border border-paper/10 bg-gradient-to-br from-cyan/15 via-royal/20 to-ink">
            <div className="flex h-full w-full items-end justify-start p-6">
              <div className="rounded-full bg-black/40 px-4 py-2 backdrop-blur">
                <p className="font-mono text-xs tracking-[0.2em] text-paper/80">
                  RYDER · FACILITY
                </p>
              </div>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col justify-center md:col-span-7"
        >
          <Quote
            className="mb-6 h-10 w-10 text-cyan"
            strokeWidth={1.5}
            aria-hidden
          />
          <blockquote className="text-balance text-3xl font-medium leading-tight tracking-[-0.01em] text-paper md:text-[44px]">
            &ldquo;We have not seen this kind of accuracy with computer-vision
            technology… this is a significant milestone in the race to modernize
            the yard.&rdquo;
          </blockquote>
          <div className="mt-10 flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-cyan/15 font-mono text-sm text-cyan">
              KJ
            </div>
            <div>
              <p className="text-base font-medium text-paper">Karen Jones</p>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-paper/55">
                Head of New Product · Ryder System, Inc.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ============================================================================
   HOW IT WORKS
   ========================================================================== */

const STEPS = [
  {
    icon: ScanLine,
    label: "At the Gate",
    body: "AI computer vision automates check-in, identifies assets, validates loads.",
  },
  {
    icon: Truck,
    label: "In the Yard",
    body: "Spotter coordination and live location tracking from a single pane of glass.",
  },
  {
    icon: Boxes,
    label: "At the Dock",
    body: "Predictive sequencing keeps trailers flowing and dock doors humming.",
  },
  {
    icon: ShieldCheck,
    label: "Across Operations",
    body: "Closed-loop validation and performance supervision across every yard.",
  },
];

function HowItWorks() {
  return (
    <section className="relative bg-ink py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="mb-14 flex flex-col gap-4">
          <p className="eyebrow">◆ How it works</p>
          <h2 className="max-w-4xl text-balance text-4xl font-medium leading-[1.05] tracking-[-0.02em] text-paper md:text-6xl">
            Revolutionary technology that transforms your yard{" "}
            <span className="text-paper/55">from gate to dock.</span>
          </h2>
        </div>

        <div className="grid gap-px overflow-hidden rounded-3xl border border-paper/10 bg-paper/10 md:grid-cols-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="group flex flex-col gap-6 bg-ink p-8 transition-colors hover:bg-paper/[0.04]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs tracking-[0.22em] text-cyan/70">
                    {String(i + 1).padStart(2, "0")} / 04
                  </span>
                  <Icon
                    className="h-5 w-5 text-cyan transition-transform group-hover:scale-110"
                    strokeWidth={1.5}
                  />
                </div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-paper/55">
                  Novonus
                </p>
                <h3 className="text-2xl font-medium text-paper">{s.label}</h3>
                <p className="text-sm leading-relaxed text-paper/65">
                  {s.body}
                </p>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-12 flex justify-center">
          <a
            href="#contact"
            className="group inline-flex items-center gap-2 rounded-full border border-paper/20 px-6 py-3 text-sm text-paper transition-colors hover:border-cyan hover:bg-cyan/5 hover:text-cyan"
          >
            Take a closer look
            <Arrow className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   CONTACT
   ========================================================================== */

const OPTIONS = [
  "Schedule a 30-minute meeting with a yard expert",
  "Schedule a YOS™ Demo",
  "Arrange ROI consultation",
  "Set Up a 2-Day Proof of Value on site",
  "Something else",
];

function Contact() {
  const [option, setOption] = useState(OPTIONS[0]);

  return (
    <section
      id="contact"
      className="relative overflow-hidden border-t border-paper/10 bg-ink py-24 md:py-32"
    >
      <div className="glow-accent absolute -left-40 top-0 h-[600px] w-[600px]" />

      <div className="relative mx-auto grid max-w-[1400px] gap-16 px-6 md:grid-cols-12 md:px-10">
        <div className="md:col-span-5">
          <p className="eyebrow mb-5">◆ Contact</p>
          <h2 className="text-balance text-4xl font-medium leading-[1.05] tracking-[-0.02em] text-paper md:text-6xl">
            The yard of the future starts today.
          </h2>
          <p className="mt-8 max-w-md text-lg text-paper/65">
            Reach out to learn more about Novonus, on your terms.
          </p>

          <ul className="mt-10 space-y-2">
            {OPTIONS.map((o) => (
              <li key={o}>
                <button
                  type="button"
                  onClick={() => setOption(o)}
                  suppressHydrationWarning
                  className={`flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left transition-colors ${
                    option === o
                      ? "border-cyan bg-cyan/10 text-paper"
                      : "border-paper/10 bg-white/[0.02] text-paper/70 hover:border-paper/25 hover:text-paper"
                  }`}
                >
                  <span className="text-sm">{o}</span>
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-full border ${
                      option === o
                        ? "border-cyan bg-cyan text-ink"
                        : "border-paper/30"
                    }`}
                    aria-hidden
                  >
                    {option === o && (
                      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
                        <path
                          d="M2.5 6.5l2.5 2.5 4.5-5"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <form
          className="md:col-span-7"
          onSubmit={(e) => {
            e.preventDefault();
            alert(`Thanks — we'll be in touch about: ${option}`);
          }}
        >
          <div className="grid gap-4 rounded-3xl border border-paper/10 bg-white/[0.02] p-6 md:p-8">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-paper/55">
              Tell us a bit about you
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full name *" name="name" required />
              <Field label="Role or position *" name="role" required />
              <Field label="Phone number" name="phone" />
              <Field label="Email *" name="email" type="email" required />
              <Field label="Company name *" name="company" required full />
            </div>
            <div className="grid gap-2">
              <label className="font-mono text-xs uppercase tracking-[0.18em] text-paper/55">
                How can we help? *
              </label>
              <select
                className="rounded-xl border border-paper/15 bg-ink px-4 py-3 text-sm text-paper outline-none transition-colors focus:border-cyan"
                value={option}
                onChange={(e) => setOption(e.target.value)}
                suppressHydrationWarning
              >
                {OPTIONS.map((o) => (
                  <option key={o} value={o} className="bg-ink">
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              suppressHydrationWarning
              className="group mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-cyan px-6 py-3.5 text-sm font-medium text-ink transition-all hover:bg-cyan/90"
            >
              Take charge of your yard
              <Arrow className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  full,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  full?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-2 ${full ? "md:col-span-2" : ""}`}>
      <span className="font-mono text-xs uppercase tracking-[0.18em] text-paper/55">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        suppressHydrationWarning
        className="rounded-xl border border-paper/15 bg-ink px-4 py-3 text-sm text-paper outline-none transition-colors placeholder:text-paper/30 focus:border-cyan"
      />
    </label>
  );
}

/* ============================================================================
   FOOTER
   ========================================================================== */

const COLS: { title: string; items: string[] }[] = [
  {
    title: "Technology",
    items: [
      "Homepage",
      "Somatic Control Stack",
      "The Agentic AI Yard",
      "Yard Efficiency Calculator",
    ],
  },
  {
    title: "Company",
    items: ["About", "Resources", "Contact"],
  },
  {
    title: "Reach us",
    items: [
      "Ready for your yard of the future?",
      "+1 (737) 279-5032",
      "Give us a call today.",
    ],
  },
];

function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-paper/10 bg-ink pt-24 pb-10">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-md border border-cyan/40 bg-cyan/10 text-cyan">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                  <path
                    d="M3 6h18M6 12h12M9 18h6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span className="font-mono text-sm tracking-[0.18em] text-paper">
                NOVONUS
              </span>
            </div>
            <p className="mt-6 max-w-md text-base leading-relaxed text-paper/65">
              Moving the world by making goods flow. AI-native technology for
              the yard of the future.
            </p>
            <span className="mt-8 inline-flex items-center gap-3 rounded-full border border-paper/15 bg-white/[0.02] px-4 py-2 text-xs text-paper/70">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
              2025 Market Guide · Yard Management Featured Vendor
            </span>
          </div>

          {COLS.map((col) => (
            <div key={col.title} className="md:col-span-2">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-paper/45">
                {col.title}
              </p>
              <ul className="mt-5 space-y-3">
                {col.items.map((it) => (
                  <li key={it}>
                    <a
                      href="#"
                      className="text-sm text-paper/80 transition-colors hover:text-cyan"
                    >
                      {it}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-20 select-none overflow-hidden">
          <p className="text-center font-mono text-[14vw] font-medium leading-none tracking-[0.04em] text-paper/[0.08]">
            NOVONUS
          </p>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-paper/10 pt-6 text-xs text-paper/45 md:flex-row">
          <p>Copyright Novonus © 2025 · All Rights Reserved</p>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-paper">
              Technical Index
            </a>
            <a href="#" className="hover:text-paper">
              Privacy
            </a>
            <a href="#" className="hover:text-paper">
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================================
   PAGE — root export
   ========================================================================== */

export default function Home() {
  return (
    <IntroProvider sidebar={<Sidebar />}>
      <main>
        <Hero />
        <FeatureList />
        <Benefits />
        <IndustryLogos />
        <Testimonial />
        <HowItWorks />
        <Contact />
      </main>
      <Footer />
    </IntroProvider>
  );
}

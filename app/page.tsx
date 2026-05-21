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
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
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
   PAPER BACKGROUND — the redbud cream surface with a 96 × 96 grid in
   #f5efe5 (rgba 0.085), small filled diamonds at every intersection.
   Drop-in replacement for LinenBackground in any section that should
   carry the light treatment. Absolute-positioned, so the parent must
   be relative. The diamond/grid layers were originally inlined in
   FluidSection — this component is the single source of truth.
   ========================================================================== */
function PaperBackground() {
  const PATTERN = [
    `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><path d='M 48 45 L 51 48 L 48 51 L 45 48 Z' fill='%23191218' fill-opacity='0.085'/></svg>")`,
    `linear-gradient(to right, rgba(245, 239, 229, 0.085) 2px, transparent 2px)`,
    `linear-gradient(to bottom, rgba(245, 239, 229, 0.085) 2px, transparent 2px)`,
  ].join(", ");
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0"
      style={{
        backgroundColor: "#17120d",
        backgroundImage: PATTERN,
        backgroundSize: "96px 96px, 96px 96px, 96px 96px",
        backgroundPosition: "-48px -48px, 0 0, 0 0",
      }}
    />
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

  /* Char animation: cyan → cream. The dark page bg means the final
     colour needs to land at #f5efe5 (rgba 245, 239, 229) for legibility. */
  const color = useTransform(head, (h) => {
    const local = h - index;
    if (local <= 2.5) return "rgba(34, 211, 238, 1)";
    if (local >= 6.5) return "rgba(245, 239, 229, 0.96)";
    const t = (local - 2.5) / 4;
    const r = Math.round(34 + (245 - 34) * t);
    const g = Math.round(211 + (239 - 211) * t);
    const b = Math.round(238 + (229 - 238) * t);
    return `rgba(${r}, ${g}, ${b}, 0.96)`;
  });

  return <motion.span style={{ opacity, color }}>{char}</motion.span>;
}

/* ============================================================================
   THE PROBLEM TRIPTYCH — three hover-activated cards in a single slide.
   Each card sits perfectly still at rest; the SVG animation only plays
   while the pointer is over the card (or the card has keyboard focus).
   The triptych crossfades in from slide 2's text reveal; from there on
   the rest of the page scrolls naturally — no more pinned choreography
   after this beat.

     • Box 01  Vision can't see force.                  (eyes + red strip)
     • Box 02  Sensors react too late.                  (alarm bell)
     • Box 03  Simulators can't accurately model        (hammer + spikes)
                  contact physics.
   ========================================================================== */

function BoxFrame({
  caption,
  index,
  active,
  onHoverChange,
  children,
}: {
  caption: string;
  index: number;
  active: boolean;
  onHoverChange: (next: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onFocus={() => onHoverChange(true)}
      onBlur={() => onHoverChange(false)}
      tabIndex={0}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-black/40 outline-none transition-colors"
      style={{
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
        border: "1px solid rgba(243, 238, 226, 0.13)",
        boxShadow:
          "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 14px 32px rgba(0, 0, 0, 0.4)",
      }}
    >
      {/* corner brackets — cyan only when the card itself is active. Driven
          by React state rather than :hover / :focus so a click that leaves
          focus behind doesn't strand the brackets in the active colour. */}
      <span
        aria-hidden
        className={`pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t transition-colors ${
          active ? "border-cyan/80" : "border-paper/25"
        }`}
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute right-2 top-2 h-3 w-3 border-r border-t transition-colors ${
          active ? "border-cyan/80" : "border-paper/25"
        }`}
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l transition-colors ${
          active ? "border-cyan/80" : "border-paper/25"
        }`}
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r transition-colors ${
          active ? "border-cyan/80" : "border-paper/25"
        }`}
      />

      {/* top rail — index + state badge */}
      <div className="flex items-center justify-between px-5 pt-5 text-[10px] uppercase tracking-[0.22em] text-paper/45">
        <span className="font-mono">0{index + 1}&nbsp;/&nbsp;03</span>
        <span
          className={`flex items-center gap-1.5 transition-colors ${
            active ? "text-cyan" : "text-paper/35"
          }`}
        >
          <span
            className={`block h-1 w-1 rounded-full transition-all ${
              active
                ? "bg-cyan shadow-[0_0_6px_rgba(34,211,238,0.9)]"
                : "bg-paper/30"
            }`}
          />
          {active ? "active" : "hover to play"}
        </span>
      </div>

      {/* animation area */}
      <div className="flex aspect-[5/4] items-center justify-center px-6 pb-3 pt-4 md:px-7 md:pt-5">
        {children}
      </div>

      {/* divider */}
      <div
        aria-hidden
        className="mx-6 h-px md:mx-7"
        style={{
          background:
            "linear-gradient(to right, transparent 0%, rgba(243, 238, 226, 0.22) 50%, transparent 100%)",
        }}
      />

      {/* caption */}
      <div className="flex flex-1 items-center justify-center px-7 py-8 md:px-8 md:py-10">
        <h3
          className="text-balance text-center"
          style={{
            fontFamily:
              "var(--font-tt-norms-pro), ui-sans-serif, system-ui",
            fontWeight: 700,
            fontSize: "clamp(1.2rem, 1.65vw, 1.6rem)",
            lineHeight: 1.25,
            letterSpacing: "-0.018em",
            color: "rgba(245, 250, 255, 0.96)",
            margin: 0,
          }}
        >
          {caption}
        </h3>
      </div>
    </motion.div>
  );
}

/* Hidden SVG filter library shared by every card's crayon artwork. */
function TriptychFilters() {
  return (
    <svg aria-hidden style={{ position: "absolute", width: 0, height: 0 }}>
      <defs>
        <filter id="tri-crayon" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.06"
            numOctaves="2"
            seed="5"
          />
          <feDisplacementMap in="SourceGraphic" scale="3" />
        </filter>
        <filter id="tri-vibrate" x="-15%" y="-15%" width="130%" height="130%">
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
    </svg>
  );
}

/* ----- Box 01: Vision can't see force.
   Hovering animates a red crayon strip drawing across two open eyes; at
   25% of the strip the eyes blink shut, at 50% they open again. Reset
   on hover-out retracts the strip and reopens the eyes. */
function EyesBox() {
  const [active, setActive] = useState(false);
  const stripLength = useMotionValue(0);

  useEffect(() => {
    const controls = animate(stripLength, active ? 1 : 0, {
      duration: active ? 1.2 : 0.4,
      ease: active ? [0.22, 1, 0.36, 1] : [0.4, 0, 0.2, 1],
    });
    return () => controls.stop();
  }, [active, stripLength]);

  const openOpacity = useTransform(stripLength, (v) =>
    v < 0.25 ? 1 : v < 0.5 ? 0 : 1,
  );
  const closedOpacity = useTransform(stripLength, (v) =>
    v < 0.25 ? 0 : v < 0.5 ? 1 : 0,
  );

  const stroke = "#f3eee2";
  const pupil = "#0a0a0a";

  return (
    <BoxFrame
      caption="Vision can't see force."
      index={0}
      active={active}
      onHoverChange={setActive}
    >
      <svg
        viewBox="0 0 800 400"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
      >
        <motion.g style={{ opacity: openOpacity }}>
          <circle cx="260" cy="200" r="90" fill="none" stroke={stroke} strokeWidth="5" filter="url(#tri-crayon)" />
          <circle cx="260" cy="200" r="32" fill={pupil} filter="url(#tri-crayon)" />
          <circle cx="540" cy="200" r="90" fill="none" stroke={stroke} strokeWidth="5" filter="url(#tri-crayon)" />
          <circle cx="540" cy="200" r="32" fill={pupil} filter="url(#tri-crayon)" />
          <g stroke={stroke} strokeWidth="4" strokeLinecap="round" fill="none" filter="url(#tri-crayon)">
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
        <motion.g style={{ opacity: closedOpacity }}>
          <path d="M 170 200 A 90 90 0 0 1 350 200" fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" filter="url(#tri-crayon)" />
          <line x1="170" y1="200" x2="350" y2="200" stroke={stroke} strokeWidth="5" strokeLinecap="round" filter="url(#tri-crayon)" />
          <path d="M 450 200 A 90 90 0 0 1 630 200" fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" filter="url(#tri-crayon)" />
          <line x1="450" y1="200" x2="630" y2="200" stroke={stroke} strokeWidth="5" strokeLinecap="round" filter="url(#tri-crayon)" />
          <g stroke={stroke} strokeWidth="4" strokeLinecap="round" fill="none" filter="url(#tri-crayon)">
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
        <motion.path
          d="M 50 218 Q 200 208 400 213 T 750 220"
          stroke="#dc2f3a"
          strokeWidth="42"
          strokeLinecap="round"
          fill="none"
          filter="url(#tri-crayon)"
          style={{ pathLength: stripLength, opacity: 0.94 }}
        />
      </svg>
    </BoxFrame>
  );
}

/* ----- Box 02: Sensors react too late.
   Bell stays still at rest. Hover rocks the bell continuously (keyframed
   via framer-motion so leaving smoothly returns it upright) and reveals
   the red alarm waves on either side, whose edges shimmer continuously
   via the SMIL-driven seed cycle on #tri-vibrate. */
function BellBox() {
  const [active, setActive] = useState(false);
  const stroke = "#f3eee2";

  return (
    <BoxFrame
      caption="Sensors react too late."
      index={1}
      active={active}
      onHoverChange={setActive}
    >
      <svg
        viewBox="0 0 800 500"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
      >
        <motion.g
          stroke="#dc2f3a"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          filter="url(#tri-vibrate)"
          animate={{ opacity: active ? 1 : 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          <path d="M 245 195 Q 225 240 245 285" />
          <path d="M 215 175 Q 190 240 215 305" />
          <path d="M 185 155 Q 155 240 185 325" />
          <path d="M 555 195 Q 575 240 555 285" />
          <path d="M 585 175 Q 610 240 585 305" />
          <path d="M 615 155 Q 645 240 615 325" />
        </motion.g>

        <motion.g
          initial={false}
          animate={{ rotate: active ? [0, -9, 0, 9, 0] : 0 }}
          transition={
            active
              ? { duration: 0.55, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
          }
          style={{ transformOrigin: "400px 92px" }}
        >
          <path
            d="M 280 320 Q 280 160 400 130 Q 520 160 520 320 Z"
            fill="none"
            stroke={stroke}
            strokeWidth="5"
            strokeLinejoin="round"
            strokeLinecap="round"
            filter="url(#tri-crayon)"
          />
          <line x1="265" y1="320" x2="535" y2="320" stroke={stroke} strokeWidth="5" strokeLinecap="round" filter="url(#tri-crayon)" />
          <line x1="400" y1="130" x2="400" y2="94" stroke={stroke} strokeWidth="5" strokeLinecap="round" filter="url(#tri-crayon)" />
          <circle cx="400" cy="86" r="12" fill={stroke} filter="url(#tri-crayon)" />
          <line x1="400" y1="320" x2="400" y2="350" stroke={stroke} strokeWidth="4" strokeLinecap="round" filter="url(#tri-crayon)" />
          <circle cx="400" cy="362" r="14" fill={stroke} filter="url(#tri-crayon)" />
        </motion.g>
      </svg>
    </BoxFrame>
  );
}

/* ----- Box 03: Simulators can't accurately model contact physics.
   Hammer rests raised at -75°. Hover swings it down to 0° (impact on the
   ground line) with a brief bounce-back to -8° before settling; six red
   reaction spikes burst out of the impact point as the hammer lands. */
function HammerBox() {
  const [active, setActive] = useState(false);
  const stroke = "#f3eee2";

  const swingTransition = active
    ? {
        duration: 0.9,
        times: [0, 0.55, 0.78, 1],
        ease: ["easeIn", "easeOut", "easeOut"] as const,
      }
    : { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const };

  const reactionTransition = active
    ? {
        duration: 0.9,
        times: [0, 0.55, 0.85, 1],
        ease: "easeOut" as const,
      }
    : { duration: 0.25 };

  const reactionLines = [
    "M 400 380 L 320 360",
    "M 400 380 L 340 320",
    "M 400 380 L 375 300",
    "M 400 380 L 425 300",
    "M 400 380 L 460 320",
    "M 400 380 L 480 360",
  ];

  return (
    <BoxFrame
      caption="Simulators can't accurately model contact physics."
      index={2}
      active={active}
      onHoverChange={setActive}
    >
      <svg
        viewBox="0 0 800 500"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
      >
        <line x1="150" y1="380" x2="650" y2="380" stroke={stroke} strokeWidth="5" strokeLinecap="round" filter="url(#tri-crayon)" />

        <motion.g
          initial={{ rotate: -75 }}
          animate={{ rotate: active ? [-75, 0, -8, 0] : -75 }}
          transition={swingTransition}
          style={{ transformOrigin: "400px 100px" }}
        >
          <line x1="400" y1="100" x2="400" y2="350" stroke={stroke} strokeWidth="6" strokeLinecap="round" filter="url(#tri-crayon)" />
          <path d="M 350 350 L 450 350 L 450 380 L 350 380 Z" fill="none" stroke={stroke} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" filter="url(#tri-crayon)" />
          <circle cx="400" cy="100" r="8" fill={stroke} filter="url(#tri-crayon)" />
        </motion.g>

        <motion.g
          stroke="#dc2f3a"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          filter="url(#tri-vibrate)"
          animate={{ opacity: active ? [0, 0, 1, 1] : 0 }}
          transition={reactionTransition}
        >
          {reactionLines.map((d, i) => (
            <motion.path
              key={i}
              d={d}
              animate={{ pathLength: active ? [0, 0, 1, 1] : 0 }}
              transition={reactionTransition}
            />
          ))}
        </motion.g>
      </svg>
    </BoxFrame>
  );
}

/* Standalone section — sits below the hero and is reached by normal
   scrolling. No fade-in, no scroll-pinning, just the three cards on the
   shared chart-paper backdrop. */
function ProblemTriptych() {
  return (
    <section className="relative overflow-hidden">
      <PaperBackground />
      <div className="relative mx-auto max-w-[1440px] px-6 pb-16 pt-8 md:px-8 md:pb-20 md:pt-10">
        <p
          className="mb-6 font-mono text-[11px] uppercase tracking-[0.22em] md:mb-7"
          style={{ color: "var(--cyan)" }}
        >
          [
          <span style={{ color: "#f5efe5" }}> the problem </span>
          ]
        </p>
        <TriptychFilters />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-7">
          <EyesBox />
          <BellBox />
          <HammerBox />
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   MANIFESTO — flowing section that follows the hero. No fade-in; the
   highlighter strokes draw across each phrase as it enters the viewport.
   ========================================================================== */
function HighlightedText({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const progress = useMotionValue(0);
  const bgSize = useTransform(progress, (v) => `${v * 100}% 100%`);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          animate(progress, 1, {
            duration: 1.6,
            delay,
            ease: [0.22, 1, 0.36, 1],
          });
          obs.disconnect();
        }
      },
      { threshold: 0.45 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [delay, progress]);

  return (
    <span ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <motion.span
        aria-hidden
        style={{
          position: "absolute",
          left: "-0.22em",
          right: "-0.22em",
          top: "-0.10em",
          bottom: "-0.10em",
          backgroundImage:
            "linear-gradient(102deg, rgba(255, 232, 25, 0.62) 0%, rgba(255, 218, 0, 0.74) 35%, rgba(255, 230, 18, 0.58) 65%, rgba(255, 222, 8, 0.68) 100%)",
          backgroundSize: bgSize,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "left center",
          filter: "url(#highlighter-rough)",
          transform: "rotate(-1.2deg)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
    </span>
  );
}

function Manifesto() {
  return (
    <section className="relative overflow-hidden">
      <PaperBackground />
      <svg
        aria-hidden
        style={{ position: "absolute", width: 0, height: 0 }}
      >
        <defs>
          <filter id="highlighter-rough">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.05"
              numOctaves="2"
              seed="3"
            />
            <feDisplacementMap in="SourceGraphic" scale="2.6" />
          </filter>
        </defs>
      </svg>
      <div className="relative mx-auto max-w-[820px] px-6 py-16 md:px-8 md:py-20">
        <p
          style={{
            fontFamily:
              "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
            fontWeight: 500,
            fontSize: "clamp(1.05rem, 1.55vw, 1.4rem)",
            lineHeight: 1.55,
            letterSpacing: "-0.005em",
            color: "rgba(245, 239, 229, 0.92)",
            margin: 0,
            textAlign: "justify",
            hyphens: "auto",
          }}
        >
          Industrial robots excel at pick-and-place in controlled
          environments but{" "}
          <HighlightedText delay={0.2}>
            break down on contact-rich manipulation
          </HighlightedText>
          , where success depends on fine-grained force control and
          physical precision.{" "}
          <HighlightedText delay={1.4}>They lack feel</HighlightedText>
          {" "}*. They find out they&apos;re pressing too hard 200
          milliseconds after the part is already crushed. And the
          systems that almost work require teams of expert engineers,
          hundreds of teleoperated demonstrations, and weeks of
          reprogramming every time the product changes.
        </p>
        <p
          style={{
            marginTop: "1.4em",
            fontFamily:
              "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
            fontWeight: 300,
            fontStyle: "normal",
            fontSize: "clamp(0.7rem, 0.82vw, 0.85rem)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "rgba(245, 239, 229, 0.55)",
            textAlign: "right",
            margin: 0,
          }}
        >
          *<span style={{ color: "#76B900" }}>NVIDIA</span> R2D2, 2025
        </p>
      </div>
    </section>
  );
}

/* ============================================================================
   PROBLEM LABEL — small "[the problem]" tag at the top-left of the
   pinned hero. Loads with a scrambled-character animation: each
   non-space slot cycles through random letters / numbers / symbols
   for ~0.9 s, settling into the final phrase letter-by-letter from
   left to right. Fades in at scrollYProgress 0.13 (just before slide
   2 starts) and stays visible until the section unpins.

   Same font size as the "[ pipeline for robots powered by humans ]"
   tag in slide 1. Brackets stay cyan, inner text is white — matching
   the styling of that pipeline tag exactly.

   Initial state uses static placeholder dots ("·") so server-rendered
   markup matches client-rendered markup (avoiding hydration warnings
   from a Math.random() initial state). The actual scramble runs only
   after the user scrolls past the trigger threshold on the client.
   ========================================================================== */
function ProblemLabel({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  const TARGET = "the problem";
  const PLACEHOLDER = TARGET.split("")
    .map((c) => (c === " " ? " " : "·"))
    .join("");
  const [text, setText] = useState(PLACEHOLDER);
  const [active, setActive] = useState(false);

  /* Activate when scroll crosses the threshold downwards, deactivate
     when it crosses back upwards. Each fresh down-cross retriggers
     the scramble effect via the useEffect below. */
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (v > 0.20) {
      if (!active) setActive(true);
    } else {
      if (active) {
        setActive(false);
        setText(PLACEHOLDER);
      }
    }
  });

  useEffect(() => {
    if (!active) return;
    const POOL =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*<>?/+=";
    const TOTAL_MS = 900;
    const TICK_MS = 45;
    const start = Date.now();
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(1, elapsed / TOTAL_MS);
      const lockedCount = Math.floor(progress * TARGET.length);

      let result = "";
      for (let i = 0; i < TARGET.length; i++) {
        if (i < lockedCount) {
          result += TARGET[i];
        } else if (TARGET[i] === " ") {
          result += " ";
        } else {
          result += POOL[Math.floor(Math.random() * POOL.length)];
        }
      }
      setText(result);

      if (progress < 1) {
        timeout = setTimeout(tick, TICK_MS);
      } else {
        setText(TARGET);
      }
    };

    tick();

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [active]);

  const opacity = useTransform(scrollYProgress, [0.20, 0.24], [0, 1]);

  return (
    <motion.div
      className="pointer-events-none absolute left-6 top-24 z-[15] md:left-10 md:top-32"
      style={{ opacity }}
      aria-hidden
    >
      <p
        style={{
          fontFamily:
            "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
          fontWeight: 400,
          fontSize: "clamp(0.92rem, 1.1vw, 1.1rem)",
          letterSpacing: "0.02em",
          color: "var(--cyan)",
          margin: 0,
          whiteSpace: "pre",
        }}
      >
        [
        <span style={{ color: "#f5efe5" }}> {text} </span>
        ]
      </p>
    </motion.div>
  );
}

/* ============================================================================
   FLUID SECTION — warm cream panel after the hero, styled in the
   redbud.vc aesthetic: solid #191218 background and Inter Tight body
   text on dark ink (#f5efe5). No grid; the surface stays calm and
   typographic, the way redbud presents itself.
   ========================================================================== */
function FluidSection() {
  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        fontFamily: "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
        color: "#f5efe5",
      }}
    >
      <PaperBackground />
      <div className="relative mx-auto flex max-w-[1400px] flex-col items-center justify-center px-6 py-16 text-center md:px-10 md:py-24">
        <h2
          className="max-w-5xl text-balance text-[44px] leading-[0.98] tracking-[-0.025em] md:text-[88px]"
          style={{
            fontFamily: "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
            fontWeight: 600,
            color: "#f5efe5",
          }}
        >
          We built the layer everyone missed.
        </h2>
        <p
          className="mt-10 max-w-3xl text-balance text-lg leading-[1.55] md:text-2xl md:leading-[1.45]"
          style={{
            fontFamily: "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
            fontWeight: 400,
            color: "rgba(245, 239, 229, 0.72)",
            letterSpacing: "-0.005em",
          }}
        >
          We are a deep-tech company building the data infrastructure that lets robots learn contact-rich manipulation from human operators. Building toward the first deployable robot cells that can be retrained by your own factory workers, on whatever robot brand you already trust.
        </p>
      </div>
    </section>
  );
}

/* ============================================================================
   PIPELINE — five-station production schematic. Lives directly under the
   white FluidSection so the page hard-cuts back to ink-black for the
   technical reveal: header rail with the Δ glyph and section index, a
   split-tone headline, a horizontal connector diagram showing the flow
   from station 01 → 05, and five framed cells with bracket corners,
   gradient numerals, status dots and stage ticks. Mono throughout.
   ========================================================================== */

const PIPELINE_STEPS = [
  {
    n: "01",
    title: "CAPTURE",
    sub: "Signal acquisition",
    body: "Operator wears rig. Sensors record everything.",
  },
  {
    n: "02",
    title: "PROCESS",
    sub: "Data refinement",
    body: "Raw signals become clean, labeled training data.",
  },
  {
    n: "03",
    title: "AUGMENT",
    sub: "Synthetic expansion",
    body: "Real demos become 100× synthetic variations.",
  },
  {
    n: "04",
    title: "TRAIN",
    sub: "Force-aware learning",
    body: "Multimodal AI learns force-aware control.",
  },
  {
    n: "05",
    title: "DEPLOY",
    sub: "Edge inference",
    body: "Edge inference with continuous retraining.",
  },
] as const;

function PipelineArrow() {
  return (
    <div className="flex shrink-0 items-center justify-center py-1 md:py-0">
      <svg
        viewBox="0 0 64 24"
        className="h-7 w-16 rotate-90 md:h-8 md:w-20 md:rotate-0"
      >
        {/* Flowing dot — translates along the line, looped, gives the
            connector a sense of data moving downstream. */}
        <motion.circle
          r="2.6"
          cy="12"
          fill="rgba(34, 211, 238, 0.95)"
          style={{ filter: "drop-shadow(0 0 4px rgba(34, 211, 238, 0.9))" }}
          initial={{ cx: 4 }}
          animate={{ cx: [4, 48, 48] }}
          transition={{
            duration: 1.8,
            times: [0, 0.85, 1],
            repeat: Infinity,
            ease: "easeInOut",
            repeatDelay: 0.2,
          }}
        />
        {/* Dashed track */}
        <line
          x1="4"
          y1="12"
          x2="48"
          y2="12"
          stroke="rgba(245, 239, 229, 0.28)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        {/* Arrow head */}
        <path
          d="M 48 6 L 56 12 L 48 18"
          stroke="rgba(34, 211, 238, 0.85)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function Pipeline() {
  return (
    <section
      className="relative overflow-hidden py-20 md:py-28"
      style={{
        fontFamily: "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
        color: "#f5efe5",
      }}
    >
      <PaperBackground />

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        {/* ============ HEADER RAIL ============ */}
        <div
          className="mb-6 flex items-center justify-between gap-4 pb-4 text-[10px] uppercase tracking-[0.28em] md:text-[11px]"
          style={{ borderBottom: "1px solid rgba(245, 239, 229, 0.12)", color: "rgba(245, 239, 229, 0.55)" }}
        >
          <span className="flex items-center gap-2 text-cyan">
            <span className="block h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
            <span className="font-medium">Δ&nbsp;&nbsp;//&nbsp;&nbsp;the pipeline</span>
          </span>
          <span className="hidden md:inline">section&nbsp;/&nbsp;02</span>
          <span>01&nbsp;—&nbsp;05</span>
        </div>

        {/* ============ HEADLINE + INTRO ============ */}
        <div className="mb-12 grid gap-8 md:mb-16 md:grid-cols-12 md:gap-10">
          <h2
            className="text-balance text-[40px] leading-[0.98] tracking-[-0.015em] md:col-span-7 md:text-[72px]"
            style={{ fontWeight: 600, color: "#f5efe5" }}
          >
            Five steps from human demonstration{" "}
            <span style={{ color: "rgba(245, 239, 229, 0.40)" }}>to deployed robot.</span>
          </h2>
          <div className="md:col-span-5 md:pt-3">
            <p
              className="max-w-md text-[14px] leading-[1.65] md:text-[15px]"
              style={{ color: "rgba(245, 239, 229, 0.72)" }}
            >
              A single integrated system that captures biological signals from
              a human operator and transforms them into a production-ready
              robot policy. Each step builds on the previous one. Together
              they form the only pipeline in the industry that captures{" "}
              <span style={{ color: "#f5efe5", fontWeight: 500 }}>
                what the body knew before contact ever happened
              </span>
              .
            </p>
          </div>
        </div>

        {/* ============ SCHEMATIC RAIL (desktop only) — overview with
             chevron arrows between each step. */}
        <div
          className="mb-10 hidden items-center gap-3 text-[10px] uppercase tracking-[0.24em] md:flex"
          style={{ color: "rgba(245, 239, 229, 0.55)" }}
        >
          {PIPELINE_STEPS.flatMap((s, i) => {
            const node = (
              <span
                key={`stage-${s.n}`}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <span
                  className="grid h-6 w-6 place-items-center rounded-full text-[10px] leading-none text-cyan"
                  style={{ border: "1px solid rgba(34, 211, 238, 0.55)", background: "rgba(34, 211, 238, 0.08)" }}
                >
                  ●
                </span>
                <span style={{ color: "rgba(245, 239, 229, 0.75)" }}>
                  {s.n}&nbsp;·&nbsp;{s.title}
                </span>
              </span>
            );
            if (i === PIPELINE_STEPS.length - 1) return [node];
            return [
              node,
              <span
                key={`chev-${i}`}
                aria-hidden
                className="flex flex-1 items-center justify-center"
              >
                <svg
                  viewBox="0 0 64 12"
                  className="h-3 w-full"
                  preserveAspectRatio="none"
                >
                  <line x1="0" y1="6" x2="56" y2="6" stroke="rgba(245, 239, 229, 0.18)" strokeWidth="1" />
                  <path d="M 52 1 L 58 6 L 52 11" stroke="rgba(34, 211, 238, 0.7)" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>,
            ];
          })}
        </div>

        {/* ============ CELLS + ARROW CONNECTORS ============ */}
        <div className="flex flex-col gap-6 md:flex-row md:items-stretch md:gap-2">
          {PIPELINE_STEPS.flatMap((s, i) => {
            const cell = (
              <motion.article
                key={`cell-${s.n}`}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{
                  duration: 0.7,
                  delay: i * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="group relative isolate flex flex-1 flex-col rounded-2xl p-8 transition-colors md:p-9"
                style={{
                  background: "rgba(245, 239, 229, 0.04)",
                  border: "1px solid rgba(245, 239, 229, 0.10)",
                }}
              >
                {/* corner brackets — technical-drawing feel */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-3 h-3 w-3 border-l border-t border-cyan/55"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-3 top-3 h-3 w-3 border-r border-t border-cyan/55"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute bottom-3 left-3 h-3 w-3 border-b border-l border-cyan/55"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute bottom-3 right-3 h-3 w-3 border-b border-r border-cyan/55"
                />

                {/* status row: sub-label + pulsing active dot */}
                <div
                  className="mb-8 flex items-center justify-between text-[10px] uppercase tracking-[0.24em]"
                  style={{ color: "rgba(245, 239, 229, 0.50)" }}
                >
                  <span className="lowercase tracking-[0.18em]">// {s.sub}</span>
                  <span className="flex items-center gap-1.5 text-cyan/80">
                    <span className="block h-1 w-1 animate-pulse rounded-full bg-cyan shadow-[0_0_6px_rgba(34,211,238,0.9)]" />
                    active
                  </span>
                </div>

                {/* big gradient numeral */}
                <div className="relative mb-6">
                  <span className="text-gradient block text-[88px] font-bold leading-none tracking-tight md:text-[104px]">
                    {s.n}
                  </span>
                  <span
                    aria-hidden
                    className="absolute -bottom-2 left-0 block h-px w-12 bg-cyan/60 shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                  />
                </div>

                {/* title + body */}
                <h3
                  className="mb-3 text-[17px] font-medium uppercase tracking-[0.2em] md:text-[19px]"
                  style={{ color: "#f5efe5" }}
                >
                  {s.title}
                </h3>
                <p
                  className="mb-10 text-[13px] leading-[1.6] md:text-[14px]"
                  style={{ color: "rgba(245, 239, 229, 0.70)" }}
                >
                  {s.body}
                </p>

                {/* stage progression ticks — five dashes where the current
                    step is solid cyan and others are dimmed. */}
                <div
                  aria-hidden
                  className="mt-auto flex items-center gap-1.5 pt-6"
                >
                  {PIPELINE_STEPS.map((_, j) => (
                    <span
                      key={j}
                      className="block h-px w-6 transition-colors"
                      style={{
                        background:
                          j === i
                            ? "rgba(34, 211, 238, 0.95)"
                            : j < i
                              ? "rgba(245, 239, 229, 0.35)"
                              : "rgba(245, 239, 229, 0.14)",
                        boxShadow:
                          j === i ? "0 0 6px rgba(34, 211, 238, 0.9)" : "none",
                      }}
                    />
                  ))}
                </div>
              </motion.article>
            );
            if (i === PIPELINE_STEPS.length - 1) return [cell];
            return [cell, <PipelineArrow key={`arrow-${i}`} />];
          })}
        </div>

        {/* ============ FOOTER STATUS BAR ============ */}
        <div
          className="mt-6 flex flex-col gap-3 pt-5 text-[10px] uppercase tracking-[0.24em] md:mt-8 md:flex-row md:items-center md:justify-between md:text-[11px]"
          style={{ borderTop: "1px solid rgba(245, 239, 229, 0.12)", color: "rgba(245, 239, 229, 0.55)" }}
        >
          <span
            className="lowercase tracking-[0.18em]"
            style={{ color: "rgba(245, 239, 229, 0.65)" }}
          >
            //&nbsp;the body knew before contact ever happened
          </span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span>
              <span style={{ color: "rgba(245, 239, 229, 0.32)" }}>system:</span>
              &nbsp;novonus™
            </span>
            <span>
              <span style={{ color: "rgba(245, 239, 229, 0.32)" }}>stages:</span>
              &nbsp;05
            </span>
            <span>
              <span style={{ color: "rgba(245, 239, 229, 0.32)" }}>status:</span>{" "}
              <span className="text-cyan">operational</span>
            </span>
          </div>
        </div>
      </div>
    </section>
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
  /* Scroll-driven phases on a 500svh section (400svh of pinned scroll
     after the initial 100svh stick):
         v=0     → 0.05 helmet mask fills with red.
         v=0.10  → 0.18 NOVONUS heading fades out.
         v=0.10  → 0.20 hero artwork fades out.
         v=0.22  → 0.50 slide 2 reveals char-by-char.
         v=0.50  → 0.55 slide 2 holds.
         v=0.55  → 0.65 slide 2 fades out / triptych fades in
                        (the last fade in the experience).
         v=0.58  → 0.68 triptych settles fully visible.
         v=0.68  → 1.00 triptych holds while the section unpins —
                        gives the user a comfortable buffer to hover
                        the cards before scrolling on to the
                        Manifesto and the rest of the page. */
  const fillHeight = useTransform(scrollYProgress, [0, 0.05], ["0%", "100%"]);
  const fillOpacity = useTransform(
    scrollYProgress,
    [0, 0.01, 1],
    [0, 1, 1],
  );
  const novonusOpacity = useTransform(
    scrollYProgress,
    [0.10, 0.18],
    [1, 0],
  );
  const heroFadeOpacity = useTransform(
    scrollYProgress,
    [0.10, 0.20],
    [1, 0],
  );
  const revealHead = useTransform(
    scrollYProgress,
    [0.22, 0.80],
    [0, SLIDE2_TEXT.length + 7],
  );

  const [stage, setStage] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    /* aria-hidden flips off once the reveal has fully completed, so
       screen readers announce the finished sentence as one unit. */
    setStage(v > 0.80 ? 3 : 0);
  });

  return (
    <>
      <section
        ref={sectionRef}
        className="relative"
        style={{ height: "260svh" }}
      >
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          <PaperBackground />

          {/* "[the problem]" — top-left tag that scrambles in just
              before slide 2 and stays visible through slide 6. */}
          <ProblemLabel scrollYProgress={scrollYProgress} />

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
          <div
            className="pointer-events-none absolute inset-0 z-[6] flex items-center justify-center px-4 md:px-8"
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
          </div>

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
                [<span style={{ color: "#f5efe5" }}> somatic pipeline for robots powered by humans </span>]
              </p>
              <h1
                className="pointer-events-none text-balance"
                style={{
                  fontFamily:
                    "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
                  fontWeight: 600,
                  fontStyle: "normal",
                  fontSize: "clamp(2.1rem, 4.4vw, 3.8rem)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.025em",
                  margin: 0,
                  color: "#f5efe5",
                }}
              >
                Training Robots using Brain-Muscle signals
              </h1>
              <p
                className="pointer-events-none"
                style={{
                  fontFamily:
                    "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
                  fontWeight: 400,
                  fontStyle: "normal",
                  fontSize: "clamp(1.15rem, 1.45vw, 1.45rem)",
                  lineHeight: 1.6,
                  letterSpacing: "-0.005em",
                  color: "rgba(245, 239, 229, 0.78)",
                  margin: 0,
                  marginTop: "1.4em",
                  maxWidth: "38em",
                }}
              >
                We capture the biological signal that decides whether
                contact-rich assembly succeeds or fails, and we just
                solved the sim-to-real problem industrial automation
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
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink/55">
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
      className="relative bg-paper pt-24 pb-32 md:pt-32 md:pb-40"
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
              className="group flex items-start gap-6 border-b border-ink/10 py-6"
            >
              <span className="mt-1 font-mono text-xs tracking-widest text-cyan">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="text-balance text-xl leading-snug text-ink md:text-2xl">
                {line}
              </p>
            </motion.li>
          ))}
        </ul>

        <div className="mt-24 flex flex-col gap-4">
          <p className="font-mono text-sm uppercase tracking-[0.18em] text-ink/55">
            That&apos;s the
          </p>
          <h2 className="text-balance text-[44px] font-medium leading-[0.95] tracking-[-0.02em] text-ink md:text-[96px]">
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
    <section className="relative bg-paper py-24 md:py-32">
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
              className="flex h-32 items-center justify-center bg-paper"
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
    <section className="relative overflow-hidden bg-paper py-24 md:py-36">
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
    <section className="relative bg-paper py-24 md:py-32">
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
                className="group flex flex-col gap-6 bg-paper p-8 transition-colors hover:bg-ink/[0.04]"
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
      className="relative overflow-hidden border-t border-paper/10 bg-paper py-24 md:py-32"
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
                className="rounded-xl border border-paper/15 bg-paper px-4 py-3 text-sm text-paper outline-none transition-colors focus:border-cyan"
                value={option}
                onChange={(e) => setOption(e.target.value)}
                suppressHydrationWarning
              >
                {OPTIONS.map((o) => (
                  <option key={o} value={o} className="bg-paper">
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
        className="rounded-xl border border-paper/15 bg-paper px-4 py-3 text-sm text-paper outline-none transition-colors placeholder:text-paper/30 focus:border-cyan"
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
    <footer className="relative overflow-hidden border-t border-paper/10 bg-paper pt-24 pb-10">
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
        <ProblemTriptych />
        <Manifesto />
        <FluidSection />
        <Pipeline />
      </main>
    </IntroProvider>
  );
}

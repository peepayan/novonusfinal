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
  | "loadingBar"
  | "logoPop"
  | "dock"
  | "done";

/* Intro choreography:
     loadingBar — hero artwork centered, red fill rises bottom→top.
     logoPop    — logo scales into the center (large, glass), holds.
     dock       — logo shrinks down to the top, the persistent
                  rounded-rectangle top bar appears around it, and the
                  site fades in.
     done       — site fully interactive. */
const LOADING_BAR_MS = 2200;
const LOADING_BAR_HOLD_MS = 250;
/* logoPop covers logo scale-in, wordmark wipe-in, and a hold for read
   time. The dock phase is the transition: wordmark and logo retract /
   fly to the top in one quick beat — no separate fade-out. */
const LOGO_POP_MS = 2200;
const DOCK_MS = 500;
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
  const [phase, setPhase] = useState<IntroPhase>("loadingBar");

  useEffect(() => {
    const t0 = LOADING_BAR_MS + LOADING_BAR_HOLD_MS;
    const t1 = t0 + LOGO_POP_MS;
    const t2 = t1 + DOCK_MS;

    const timers = [
      window.setTimeout(() => setPhase("logoPop"), t0),
      window.setTimeout(() => setPhase("dock"), t1),
      window.setTimeout(() => setPhase("done"), t2),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, []);

  /* Website content fades in during the dock phase */
  const siteVisible = phase === "dock" || phase === "done";

  return (
    <IntroContext.Provider value={{ phase }}>
      <Preloader />
      <HeroLoadingBar />
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
      {/* Light-violet → deep-violet tint on the logo body */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          ...mask,
          background:
            "linear-gradient(135deg, rgba(167,139,250,0.85) 0%, rgba(109,40,217,0.85) 45%, rgba(76,29,149,0.7) 100%)",
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
    phase === "loadingBar" || phase === "logoPop";
  const haloVisible = phase === "logoPop";

  return (
    <AnimatePresence>
      {phase !== "done" && (
        <motion.div
          key="preloader-overlay"
          aria-hidden
          initial={{ opacity: 1 }}
          animate={{ opacity: overlayVisible ? 1 : 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: MORPH_S * 0.9, ease: EASE_FADE }}
          className="fixed inset-0 z-[100]"
          style={{
            backgroundColor: "#0f0e0d",
            pointerEvents: overlayVisible ? "auto" : "none",
          }}
        >
          <div className="glow-accent absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2" />
        </motion.div>
      )}

      {/* Purple halo — anchored at screen center during the centered intro
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
                "radial-gradient(circle, rgba(109,40,217,0.7), rgba(124,58,237,0.3) 45%, transparent 72%)",
              filter: "blur(24px)",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ============================================================================
   HERO LOADING BAR — centred hero artwork during the loadingBar intro
   phase. The helmet silhouette fills with a red gradient from the
   bottom up over LOADING_BAR_MS, acting as a progress bar. When the
   phase advances the whole stack fades out.
   ========================================================================== */

function HeroLoadingBar() {
  const { phase } = useIntro();
  const visible = phase === "loadingBar";
  const fillProgress = useMotionValue(0);
  const fillHeight = useTransform(fillProgress, (v) => `${v * 100}%`);

  useEffect(() => {
    if (phase !== "loadingBar") return;
    const controls = animate(fillProgress, 1, {
      duration: LOADING_BAR_MS / 1000,
      ease: [0.4, 0, 0.2, 1],
    });
    return () => controls.stop();
  }, [phase, fillProgress]);

  return (
    <AnimatePresence>
      {phase !== "done" && phase !== "dock" && (
        <motion.div
          key="hero-loading-bar"
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[115] flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: visible ? 1 : 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: EASE_FADE }}
        >
          <div
            className="relative aspect-[16/10] mix-blend-screen select-none"
            style={{
              width: "min(62vw, calc(62svh * 1.6), 760px)",
              WebkitUserSelect: "none",
              userSelect: "none",
            }}
          >
            {/* Cyan brain outline glow */}
            <div
              className="pointer-events-none absolute mix-blend-screen z-0"
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
                sizes="(min-width: 1300px) 760px, 62vw"
                className="object-fill neon-reveal-cyan"
              />
            </div>

            {/* Base hero image */}
            <Image
              src="/hero-image.png"
              alt=""
              fill
              priority
              sizes="(min-width: 1300px) 760px, 62vw"
              className="object-contain mix-blend-screen"
            />

            {/* Timed red fill — rises from bottom of the helmet silhouette */}
            <div
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
                  background:
                    "linear-gradient(to top, rgba(255, 25, 50, 0.82) 0%, rgba(255, 35, 65, 0.78) 55%, rgba(255, 55, 85, 0.62) 78%, rgba(255, 90, 120, 0.28) 92%, rgba(255, 130, 155, 0) 100%)",
                  mixBlendMode: "screen",
                }}
              />
            </div>

            {/* Red neon helmet outline */}
            <div
              className="pointer-events-none absolute mix-blend-screen z-20"
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
                sizes="(min-width: 1300px) 380px, 31vw"
                className="object-fill neon-reveal"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
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
    phase === "done";
  const centered = phase === "logoPop";
  const docked =
    phase === "dock" || phase === "done";

  return (
    <>
      {/* Full-width top bar — only fades in once docked, persists for
          the rest of the site. Rounded corners, glassy backdrop. */}
      {docked && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-[119] h-[74px]"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_FADE, delay: 0.3 }}
          style={{ backgroundColor: "#0f0e0d" }}
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
          top: docked ? "37px" : "50%",
          x: "-50%",
          y: "-50%",
          height: centered ? 144 : 38,
          scale: visible ? 1 : 0,
          opacity: visible ? 1 : 0,
        }}
        transition={{
          top: { duration: 0.5, ease: EASE_MORPH },
          y: { duration: 0.5, ease: EASE_MORPH },
          height: { duration: 0.55, ease: EASE_MORPH },
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
  const ready = phase === "done";
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
   #0f0e0d (rgba 0.085), small filled diamonds at every intersection.
   Drop-in replacement for LinenBackground in any section that should
   carry the light treatment. Absolute-positioned, so the parent must
   be relative. The diamond/grid layers were originally inlined in
   FluidSection — this component is the single source of truth.
   ========================================================================== */
function PaperBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0"
      style={{ backgroundColor: "#f5efe5" }}
    />
  );
}

/* ============================================================================
   TOPOGRAPHICAL DOTS — canvas grid of dark dots that responds to cursor
   motion only. A stationary cursor leaves the field flat. While moving,
   the cursor raises a velocity-scaled peak directly under it AND emits
   ring waves that expand outward and fade, like ripples on water.
   ========================================================================== */
function TopographicalDots() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const host = canvas.parentElement;
    if (!host) return;

    const SPACING = 26;
    const SIGMA = 90;
    const TWO_SIGMA_SQ = 2 * SIGMA * SIGMA;
    const LIFT_PX = 34;
    const PEAK_SIZE = 2.6;
    const BASE_SIZE = 1.05;
    const BASE_ALPHA = 0.32;

    /* Velocity → peak amplitude. ~30px/frame ≈ a fast drag, saturates
       the peak; small ~1px/frame drifts produce a barely-there bump. */
    const VELOCITY_MAX = 30;
    const SPEED_SMOOTH = 0.55;
    const SPEED_FLOOR = 0.05;

    /* Ring waves: thickness controls how broad each ripple looks; speed
       controls how fast it travels; life caps how far it goes before
       fading out completely. */
    const WAVE_SPEED = 8.5;
    const WAVE_LIFE = 75;
    const WAVE_THICKNESS = 34;
    const WAVE_AMP_SCALE = 0.85;
    const EMIT_INTERVAL_FRAMES = 3;
    const EMIT_MIN_AMP = 0.08;
    const MAX_WAVES = 28;

    const BASE_DARK = { r: 15, g: 14, b: 13 };
    const PURPLE = { r: 109, g: 40, b: 217 };
    const GREEN = { r: 110, g: 231, b: 183 };

    type Wave = { x: number; y: number; t: number; amp: number };
    const waves: Wave[] = [];

    const cursor = { x: -9999, y: -9999, has: false };
    const prev = { x: -9999, y: -9999 };
    let smoothSpeed = 0;
    let frame = 0;
    let lastEmit = -1000;

    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      cursor.x = e.clientX - rect.left;
      cursor.y = e.clientY - rect.top;
      if (!cursor.has) {
        /* Reset prev on (re-)entry so re-entering doesn't fake a huge
           teleport into a single-frame velocity spike. */
        prev.x = cursor.x;
        prev.y = cursor.y;
        cursor.has = true;
      }
    };
    const onLeave = () => {
      cursor.has = false;
    };

    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let raf = 0;
    const render = () => {
      frame++;

      /* Per-frame velocity = displacement since last frame. If the
         cursor isn't in the field, treat speed as 0 so existing waves
         keep propagating but no new peak/waves get spawned. */
      let rawSpeed = 0;
      if (cursor.has) {
        const dx = cursor.x - prev.x;
        const dy = cursor.y - prev.y;
        rawSpeed = Math.sqrt(dx * dx + dy * dy);
        prev.x = cursor.x;
        prev.y = cursor.y;
      }
      smoothSpeed = smoothSpeed * SPEED_SMOOTH + rawSpeed * (1 - SPEED_SMOOTH);
      if (smoothSpeed < SPEED_FLOOR) smoothSpeed = 0;

      const peakAmp = Math.min(1, smoothSpeed / VELOCITY_MAX);

      if (
        cursor.has &&
        peakAmp > EMIT_MIN_AMP &&
        frame - lastEmit >= EMIT_INTERVAL_FRAMES
      ) {
        waves.push({ x: cursor.x, y: cursor.y, t: 0, amp: peakAmp * WAVE_AMP_SCALE });
        lastEmit = frame;
        while (waves.length > MAX_WAVES) waves.shift();
      }

      for (let i = waves.length - 1; i >= 0; i--) {
        waves[i].t += 1;
        if (waves[i].t > WAVE_LIFE) waves.splice(i, 1);
      }

      ctx.clearRect(0, 0, width, height);

      const cols = Math.ceil(width / SPACING) + 2;
      const rows = Math.ceil(height / SPACING) + 2;
      const ox = (width - (cols - 1) * SPACING) / 2;
      const oy = (height - (rows - 1) * SPACING) / 2;

      const peakActive = peakAmp > 0.01 && cursor.has;
      const px = cursor.x;
      const py = cursor.y;
      const waveCount = waves.length;
      const hasAnyMotion = peakActive || waveCount > 0;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const bx = ox + c * SPACING;
          const by = oy + r * SPACING;

          let elev = 0;

          if (peakActive) {
            const dx = bx - px;
            const dy = by - py;
            elev += peakAmp * Math.exp(-(dx * dx + dy * dy) / TWO_SIGMA_SQ);
          }

          for (let i = 0; i < waveCount; i++) {
            const w = waves[i];
            const wdx = bx - w.x;
            const wdy = by - w.y;
            const dist = Math.sqrt(wdx * wdx + wdy * wdy);
            const ringR = WAVE_SPEED * w.t;
            const delta = dist - ringR;
            const life = 1 - w.t / WAVE_LIFE;
            const amp = w.amp * life * life;
            elev +=
              amp *
              Math.exp(
                -(delta * delta) /
                  (2 * WAVE_THICKNESS * WAVE_THICKNESS),
              );
          }

          if (!hasAnyMotion || elev < 0.012) {
            ctx.fillStyle = `rgba(${BASE_DARK.r}, ${BASE_DARK.g}, ${BASE_DARK.b}, ${BASE_ALPHA})`;
            ctx.beginPath();
            ctx.arc(bx, by, BASE_SIZE, 0, Math.PI * 2);
            ctx.fill();
            continue;
          }

          const elevClamped = Math.min(elev, 1.2);
          const lift = elevClamped * LIFT_PX;
          const size = BASE_SIZE + Math.min(elevClamped, 1) * PEAK_SIZE;

          /* Horizontal-across-canvas purple → green gradient. Using bx
             (not relative-to-peak) keeps the gradient consistent across
             ripple rings, so the whole field reveals one coherent
             colour scheme rather than flipping per ripple. */
          const m = width > 0 ? bx / width : 0.5;
          const gr = PURPLE.r * (1 - m) + GREEN.r * m;
          const gg = PURPLE.g * (1 - m) + GREEN.g * m;
          const gb = PURPLE.b * (1 - m) + GREEN.b * m;
          const blend = Math.min(1, elevClamped * 1.4);
          const cr = BASE_DARK.r * (1 - blend) + gr * blend;
          const cg = BASE_DARK.g * (1 - blend) + gg * blend;
          const cb = BASE_DARK.b * (1 - blend) + gb * blend;
          const alpha = BASE_ALPHA + Math.min(elevClamped, 1) * 0.55;

          ctx.fillStyle = `rgba(${cr | 0}, ${cg | 0}, ${cb | 0}, ${alpha})`;
          ctx.beginPath();
          ctx.arc(bx, by - lift, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1]"
      style={{ width: "100%", height: "100%", display: "block" }}
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
     colour needs to land at #0f0e0d (rgba 245, 239, 229) for legibility. */
  const color = useTransform(head, (h) => {
    const local = h - index;
    if (local <= 2.5) return "rgba(109, 40, 217, 1)";
    if (local >= 6.5) return "rgba(15, 14, 13, 0.96)";
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
                ? "bg-cyan shadow-[0_0_6px_rgba(109,40,217,0.9)]"
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
          <span style={{ color: "#0f0e0d" }}> the problem </span>
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
            color: "rgba(15, 14, 13, 0.92)",
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
          reprogramming every time the product changes. The same
          tasks driving the carpal tunnel and repetitive strain
          epidemic in factories are the same tasks that have resisted
          automation. Manufacturers pay twice: in injury claims and
          in failed automation budgets.
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
            color: "rgba(15, 14, 13, 0.55)",
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
        <span style={{ color: "#0f0e0d" }}> {text} </span>
        ]
      </p>
    </motion.div>
  );
}

/* ============================================================================
   FLUID SECTION — warm cream panel after the hero, styled in the
   redbud.vc aesthetic: solid #191218 background and Inter Tight body
   text on dark ink (#0f0e0d). No grid; the surface stays calm and
   typographic, the way redbud presents itself.
   ========================================================================== */
function FluidSection() {
  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        fontFamily: "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
        color: "#0f0e0d",
      }}
    >
      <PaperBackground />
      <div className="relative mx-auto flex max-w-[1400px] flex-col items-center justify-center px-6 py-16 text-center md:px-10 md:py-24">
        <h2
          className="max-w-5xl text-balance text-[44px] leading-[0.98] tracking-[-0.025em] md:text-[88px]"
          style={{
            fontFamily: "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
            fontWeight: 600,
            color: "#0f0e0d",
          }}
        >
          We built the layer everyone missed.
        </h2>
        <p
          className="mt-10 max-w-3xl text-balance text-lg leading-[1.55] md:text-2xl md:leading-[1.45]"
          style={{
            fontFamily: "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
            fontWeight: 400,
            color: "rgba(15, 14, 13, 0.72)",
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
          fill="rgba(109, 40, 217, 0.95)"
          style={{ filter: "drop-shadow(0 0 4px rgba(109, 40, 217, 0.9))" }}
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
          stroke="rgba(15, 14, 13, 0.28)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        {/* Arrow head */}
        <path
          d="M 48 6 L 56 12 L 48 18"
          stroke="rgba(109, 40, 217, 0.85)"
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
        color: "#0f0e0d",
      }}
    >
      <PaperBackground />

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        {/* ============ HEADER RAIL ============ */}
        <div
          className="mb-6 flex items-center justify-between gap-4 pb-4 text-[10px] uppercase tracking-[0.28em] md:text-[11px]"
          style={{ borderBottom: "1px solid rgba(15, 14, 13, 0.12)", color: "rgba(15, 14, 13, 0.55)" }}
        >
          <span className="flex items-center gap-2 text-cyan">
            <span className="block h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_10px_rgba(109,40,217,0.9)]" />
            <span className="font-medium">Δ&nbsp;&nbsp;//&nbsp;&nbsp;the pipeline</span>
          </span>
          <span className="hidden md:inline">section&nbsp;/&nbsp;02</span>
          <span>01&nbsp;—&nbsp;05</span>
        </div>

        {/* ============ HEADLINE + INTRO — centered ============ */}
        <div className="mb-12 flex flex-col items-center text-center md:mb-16">
          <h2
            className="max-w-4xl text-balance text-[40px] leading-[0.98] tracking-[-0.015em] md:text-[72px]"
            style={{ fontWeight: 600, color: "#0f0e0d" }}
          >
            Five steps from human demonstration{" "}
            <span style={{ color: "rgba(15, 14, 13, 0.40)" }}>to deployed robot.</span>
          </h2>
          <p
            className="mt-8 max-w-2xl text-balance text-[14px] leading-[1.65] md:text-[15px]"
            style={{ color: "rgba(15, 14, 13, 0.72)" }}
          >
            A single integrated system that captures biological signals from
            a human operator and transforms them into a production-ready
            robot policy. Each step builds on the previous one. Together
            they form the only pipeline in the industry that captures{" "}
            <span style={{ color: "#0f0e0d", fontWeight: 500 }}>
              what the body knew before contact ever happened
            </span>
            .
          </p>
        </div>

        {/* ============ SCHEMATIC RAIL (desktop only) — overview with
             chevron arrows between each step. */}
        <div
          className="mx-auto mb-10 hidden max-w-[1100px] items-center gap-3 text-[10px] uppercase tracking-[0.24em] md:flex"
          style={{ color: "rgba(15, 14, 13, 0.55)" }}
        >
          {PIPELINE_STEPS.flatMap((s, i) => {
            const node = (
              <span
                key={`stage-${s.n}`}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <span
                  className="grid h-6 w-6 place-items-center rounded-full text-[10px] leading-none text-cyan"
                  style={{ border: "1px solid rgba(109, 40, 217, 0.55)", background: "rgba(109, 40, 217, 0.08)" }}
                >
                  ●
                </span>
                <span style={{ color: "rgba(15, 14, 13, 0.75)" }}>
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
                  <line x1="0" y1="6" x2="56" y2="6" stroke="rgba(15, 14, 13, 0.18)" strokeWidth="1" />
                  <path d="M 52 1 L 58 6 L 52 11" stroke="rgba(109, 40, 217, 0.7)" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>,
            ];
          })}
        </div>

        {/* ============ CELLS + ARROW CONNECTORS — centered ============ */}
        <div className="mx-auto flex max-w-[1100px] flex-col gap-6 md:flex-row md:items-stretch md:justify-center md:gap-2">
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
                  background: "rgba(15, 14, 13, 0.04)",
                  border: "1px solid rgba(15, 14, 13, 0.10)",
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
                  style={{ color: "rgba(15, 14, 13, 0.50)" }}
                >
                  <span className="lowercase tracking-[0.18em]">// {s.sub}</span>
                  <span className="flex items-center gap-1.5 text-cyan/80">
                    <span className="block h-1 w-1 animate-pulse rounded-full bg-cyan shadow-[0_0_6px_rgba(109,40,217,0.9)]" />
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
                    className="absolute -bottom-2 left-0 block h-px w-12 bg-cyan/60 shadow-[0_0_8px_rgba(109,40,217,0.6)]"
                  />
                </div>

                {/* title + body */}
                <h3
                  className="mb-3 text-[17px] font-medium uppercase tracking-[0.2em] md:text-[19px]"
                  style={{ color: "#0f0e0d" }}
                >
                  {s.title}
                </h3>
                <p
                  className="mb-10 text-[13px] leading-[1.6] md:text-[14px]"
                  style={{ color: "rgba(15, 14, 13, 0.70)" }}
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
                            ? "rgba(109, 40, 217, 0.95)"
                            : j < i
                              ? "rgba(15, 14, 13, 0.35)"
                              : "rgba(15, 14, 13, 0.14)",
                        boxShadow:
                          j === i ? "0 0 6px rgba(109, 40, 217, 0.9)" : "none",
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

        {/* ============ PAYOFF PARAGRAPH — centered ============ */}
        <p
          className="mx-auto mt-12 max-w-4xl text-balance text-center text-base leading-[1.6] md:mt-14 md:text-lg md:leading-[1.55]"
          style={{
            color: "rgba(15, 14, 13, 0.78)",
            fontWeight: 400,
          }}
        >
          The capture step turns biology into data. The processing step
          turns data into training samples. The augmentation step
          multiplies samples through physics simulation. The training
          step turns samples into policy. The deployment step runs
          policy in production while feeding new data back to the
          start. Robots inherit human force intuition. Simulators
          finally transfer to reality. Contact-rich tasks that
          traditional automation has failed at for thirty years get
          solved.{" "}
          <span style={{ color: "var(--cyan)", fontWeight: 500 }}>
            By us.
          </span>
        </p>

        {/* ============ FOOTER STATUS BAR ============ */}
        <div
          className="mt-6 flex flex-col gap-3 pt-5 text-[10px] uppercase tracking-[0.24em] md:mt-8 md:flex-row md:items-center md:justify-between md:text-[11px]"
          style={{ borderTop: "1px solid rgba(15, 14, 13, 0.12)", color: "rgba(15, 14, 13, 0.55)" }}
        >
          <span
            className="lowercase tracking-[0.18em]"
            style={{ color: "rgba(15, 14, 13, 0.65)" }}
          >
            //&nbsp;the body knew before contact ever happened
          </span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span>
              <span style={{ color: "rgba(15, 14, 13, 0.32)" }}>system:</span>
              &nbsp;novonus™
            </span>
            <span>
              <span style={{ color: "rgba(15, 14, 13, 0.32)" }}>stages:</span>
              &nbsp;05
            </span>
            <span>
              <span style={{ color: "rgba(15, 14, 13, 0.32)" }}>status:</span>{" "}
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
  /* Heading reveal is gated on `done` — the dark page sits empty while
     the logo finishes docking, then the text smoothly fades in. */
  const textReady = phase === "done";
  const sectionRef = useRef<HTMLElement | null>(null);

  /* Scroll-pin: section is 200svh tall with a sticky 100svh viewport inside.
     Progress goes 0 → 1 over the 100svh of pinned scrolling. */
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  /* Scroll-driven phases on the pinned section:
         v=0.10  → 0.18 landing heading fades out.
         v=0.22  → 0.80 slide 2 reveals char-by-char.
         v>0.80         aria-hidden lifts so screen readers announce
                        the full sentence as one unit. */
  const novonusOpacity = useTransform(
    scrollYProgress,
    [0.10, 0.18],
    [1, 0],
  );
  const revealHead = useTransform(
    scrollYProgress,
    [0.22, 0.80],
    [0, SLIDE2_TEXT.length + 7],
  );

  const [stage, setStage] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
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
          <TopographicalDots />

          {/* "[the problem]" — top-left tag that scrambles in just
              before slide 2 and stays visible through slide 6. */}
          <ProblemLabel scrollYProgress={scrollYProgress} />

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

          {/* Main landing-page heading — big bold technical statement,
              centered on the viewport. novonusOpacity fades it out as
              the user scrolls toward slide 2. */}
          <motion.div
            className="pointer-events-none absolute inset-0 z-[5] hidden items-center justify-center px-6 md:flex md:px-10"
            style={{ opacity: novonusOpacity }}
          >
            <div className="pointer-events-none flex w-full max-w-[1100px] flex-col items-center">
              {/* Eyebrow — rises from its overflow-hidden barrier after the title */}
              <div
                style={{
                  overflow: "hidden",
                  marginBottom: "1em",
                  paddingBottom: "0.15em",
                }}
              >
                <motion.p
                  className="pointer-events-none"
                  initial={{ y: "120%", opacity: 0 }}
                  animate={{
                    y: textReady ? "0%" : "120%",
                    opacity: textReady ? 1 : 0,
                  }}
                  transition={{
                    duration: 0.6,
                    ease: [0.22, 1, 0.36, 1],
                    delay: textReady ? 0.35 : 0,
                  }}
                  style={{
                    position: "relative",
                    fontFamily:
                      "var(--font-tt-norms-pro), ui-sans-serif, system-ui",
                    fontWeight: 300,
                    fontStyle: "normal",
                    fontSize: "clamp(0.92rem, 1.1vw, 1.1rem)",
                    lineHeight: 1.5,
                    letterSpacing: "0.005em",
                    color: "var(--cyan)",
                    margin: 0,
                    textAlign: "center",
                  }}
                >
                  [<span style={{ color: "#0f0e0d" }}> somatic pipeline for robots powered by humans </span>]
                  <motion.span
                    aria-hidden
                    initial={{
                      maskImage:
                        "linear-gradient(45deg, transparent -18%, #000 0%)",
                      WebkitMaskImage:
                        "linear-gradient(45deg, transparent -18%, #000 0%)",
                    }}
                    animate={{
                      maskImage: textReady
                        ? [
                            "linear-gradient(45deg, transparent -18%, #000 0%)",
                            "linear-gradient(45deg, transparent 41%, #000 59%)",
                            "linear-gradient(45deg, transparent 100%, #000 118%)",
                          ]
                        : "linear-gradient(45deg, transparent -18%, #000 0%)",
                      WebkitMaskImage: textReady
                        ? [
                            "linear-gradient(45deg, transparent -18%, #000 0%)",
                            "linear-gradient(45deg, transparent 41%, #000 59%)",
                            "linear-gradient(45deg, transparent 100%, #000 118%)",
                          ]
                        : "linear-gradient(45deg, transparent -18%, #000 0%)",
                    }}
                    transition={{
                      duration: 0.6,
                      ease: "linear",
                      times: [0, 0.5, 1],
                      delay: textReady ? 0.35 : 0,
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "block",
                      backgroundImage:
                        "linear-gradient(90deg, #cdbef3 0%, #b9c2ef 40%, #c5e8d1 75%, #9bd8b3 100%)",
                      backgroundClip: "text",
                      WebkitBackgroundClip: "text",
                      color: "transparent",
                      WebkitTextFillColor: "transparent",
                      pointerEvents: "none",
                    }}
                  >
                    [ somatic pipeline for robots powered by humans ]
                  </motion.span>
                </motion.p>
              </div>

              {/* Title — first to rise from below the barrier */}
              <div
                className="w-full"
                style={{ overflow: "hidden", paddingBottom: "0.2em" }}
              >
                <motion.h1
                  className="pointer-events-none text-balance"
                  initial={{ y: "120%", opacity: 0 }}
                  animate={{
                    y: textReady ? "0%" : "120%",
                    opacity: textReady ? 1 : 0,
                  }}
                  transition={{
                    duration: 0.7,
                    ease: [0.22, 1, 0.36, 1],
                    delay: 0,
                  }}
                  style={{
                    position: "relative",
                    fontFamily:
                      "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
                    fontWeight: 900,
                    fontStyle: "normal",
                    fontSize: "clamp(2.4rem, 5.2vw, 4.6rem)",
                    lineHeight: 1.03,
                    letterSpacing: "-0.035em",
                    margin: 0,
                    color: "#0f0e0d",
                    textAlign: "center",
                  }}
                >
                  Training Robots using Brain-Muscle signals
                  <motion.span
                    aria-hidden
                    className="text-balance"
                    initial={{
                      maskImage:
                        "linear-gradient(45deg, transparent -18%, #000 0%)",
                      WebkitMaskImage:
                        "linear-gradient(45deg, transparent -18%, #000 0%)",
                    }}
                    animate={{
                      maskImage: textReady
                        ? [
                            "linear-gradient(45deg, transparent -18%, #000 0%)",
                            "linear-gradient(45deg, transparent 41%, #000 59%)",
                            "linear-gradient(45deg, transparent 100%, #000 118%)",
                          ]
                        : "linear-gradient(45deg, transparent -18%, #000 0%)",
                      WebkitMaskImage: textReady
                        ? [
                            "linear-gradient(45deg, transparent -18%, #000 0%)",
                            "linear-gradient(45deg, transparent 41%, #000 59%)",
                            "linear-gradient(45deg, transparent 100%, #000 118%)",
                          ]
                        : "linear-gradient(45deg, transparent -18%, #000 0%)",
                    }}
                    transition={{
                      duration: 0.7,
                      ease: "linear",
                      times: [0, 0.5, 1],
                      delay: 0,
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "block",
                      backgroundImage:
                        "linear-gradient(90deg, #cdbef3 0%, #b9c2ef 40%, #c5e8d1 75%, #9bd8b3 100%)",
                      backgroundClip: "text",
                      WebkitBackgroundClip: "text",
                      color: "transparent",
                      WebkitTextFillColor: "transparent",
                      pointerEvents: "none",
                    }}
                  >
                    Training Robots using Brain-Muscle signals
                  </motion.span>
                </motion.h1>
              </div>

              {/* Subtitle — rises last, narrower max-width */}
              <div
                className="w-full"
                style={{
                  overflow: "hidden",
                  marginTop: "1.4em",
                  paddingBottom: "0.2em",
                  maxWidth: "42em",
                }}
              >
                <motion.p
                  className="pointer-events-none"
                  initial={{ y: "120%", opacity: 0 }}
                  animate={{
                    y: textReady ? "0%" : "120%",
                    opacity: textReady ? 1 : 0,
                  }}
                  transition={{
                    duration: 0.6,
                    ease: [0.22, 1, 0.36, 1],
                    delay: textReady ? 0.5 : 0,
                  }}
                  style={{
                    position: "relative",
                    fontFamily:
                      "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
                    fontWeight: 400,
                    fontStyle: "normal",
                    fontSize: "clamp(1.15rem, 1.45vw, 1.45rem)",
                    lineHeight: 1.6,
                    letterSpacing: "-0.005em",
                    color: "rgba(15, 14, 13, 0.78)",
                    margin: 0,
                    textAlign: "center",
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
                  <motion.span
                    aria-hidden
                    initial={{
                      maskImage:
                        "linear-gradient(45deg, transparent -18%, #000 0%)",
                      WebkitMaskImage:
                        "linear-gradient(45deg, transparent -18%, #000 0%)",
                    }}
                    animate={{
                      maskImage: textReady
                        ? [
                            "linear-gradient(45deg, transparent -18%, #000 0%)",
                            "linear-gradient(45deg, transparent 41%, #000 59%)",
                            "linear-gradient(45deg, transparent 100%, #000 118%)",
                          ]
                        : "linear-gradient(45deg, transparent -18%, #000 0%)",
                      WebkitMaskImage: textReady
                        ? [
                            "linear-gradient(45deg, transparent -18%, #000 0%)",
                            "linear-gradient(45deg, transparent 41%, #000 59%)",
                            "linear-gradient(45deg, transparent 100%, #000 118%)",
                          ]
                        : "linear-gradient(45deg, transparent -18%, #000 0%)",
                    }}
                    transition={{
                      duration: 0.6,
                      ease: "linear",
                      times: [0, 0.5, 1],
                      delay: textReady ? 0.5 : 0,
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "block",
                      backgroundImage:
                        "linear-gradient(90deg, #cdbef3 0%, #b9c2ef 40%, #c5e8d1 75%, #9bd8b3 100%)",
                      backgroundClip: "text",
                      WebkitBackgroundClip: "text",
                      color: "transparent",
                      WebkitTextFillColor: "transparent",
                      pointerEvents: "none",
                    }}
                  >
                    We capture the biological signal that decides whether
                    contact-rich assembly succeeds or fails, and we just
                    solved the sim-to-real problem industrial automation
                    couldn&apos;t. Robots can finally feel.
                  </motion.span>
                </motion.p>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

    </>
  );
}


/* ============================================================================
   SECTION TAG — shared header used by every standalone section. Matches
   the "[ the problem ]" treatment in ProblemTriptych: cyan brackets,
   cream-coloured inner label, mono small-caps tracking.
   ========================================================================== */
function SectionTag({ label }: { label: string }) {
  return (
    <p
      className="mb-6 font-mono text-[11px] uppercase tracking-[0.22em] md:mb-7"
      style={{ color: "var(--cyan)" }}
    >
      [<span style={{ color: "#0f0e0d" }}> {label} </span>]
    </p>
  );
}

/* ============================================================================
   WHAT WE BUILD — concrete offering + a four-row comparison table
   ========================================================================== */

const WHAT_WE_BUILD_ROWS = [
  {
    label: "Deployment time",
    trad: "8-16 weeks",
    novonus: "2-4 weeks",
    adv: "4× faster",
  },
  {
    label: "Programming labor",
    trad: "40-200 hours expert work",
    novonus: "1-3 days operator demos",
    adv: "Removes engineers",
  },
  {
    label: "Reprogramming cost",
    trad: "$20K-$40K per change",
    novonus: "Operator's time",
    adv: "Near-zero",
  },
  {
    label: "Contact-rich tasks",
    trad: "Often fail outright",
    novonus: "Designed for",
    adv: "Solves the gap",
  },
] as const;

function WhatWeBuild() {
  const cellBorder = "1px solid rgba(15, 14, 13, 0.10)";
  const tableBorder = "1px solid rgba(15, 14, 13, 0.14)";
  return (
    <section
      className="relative overflow-hidden"
      style={{
        fontFamily:
          "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
        color: "#0f0e0d",
      }}
    >
      <PaperBackground />
      <div className="relative mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-20">
        <SectionTag label="what we build" />
        <h2
          className="max-w-4xl text-balance text-[36px] leading-[1.05] tracking-[-0.02em] md:text-[64px]"
          style={{ fontWeight: 600 }}
        >
          Robot cells your factory workers can teach.
        </h2>
        <p
          className="mt-8 max-w-3xl text-base leading-[1.6] md:text-lg md:leading-[1.55]"
          style={{ color: "rgba(15, 14, 13, 0.72)", fontWeight: 400 }}
        >
          We deploy autonomous manipulation systems onto our customers&apos;
          existing robot infrastructure. We bring the biological-signal
          capture rig, the training pipeline, the deployed policy, the safety
          supervisor, and the integration software. Customers bring the
          robots they already trust. The result is the same as buying a
          complete new cell from a traditional integrator, except faster to
          deploy, dramatically cheaper, and built on top of hardware they
          already own.
        </p>

        {/* Comparison table — 4-col grid on desktop, stacked card per row
            on mobile with inline column labels. */}
        <div
          className="mt-12 overflow-hidden rounded-2xl"
          style={{ border: tableBorder }}
        >
          {/* Desktop header row */}
          <div
            className="hidden font-mono text-[10px] uppercase tracking-[0.22em] md:grid md:grid-cols-[1.2fr_1fr_1fr_1fr]"
            style={{
              background: "rgba(15, 14, 13, 0.04)",
              color: "rgba(15, 14, 13, 0.55)",
            }}
          >
            <div className="p-5" />
            <div className="p-5" style={{ borderLeft: cellBorder }}>
              Traditional integrator
            </div>
            <div
              className="p-5 text-cyan"
              style={{ borderLeft: cellBorder }}
            >
              Novonus
            </div>
            <div className="p-5" style={{ borderLeft: cellBorder }}>
              Advantage
            </div>
          </div>

          {WHAT_WE_BUILD_ROWS.map((r, i) => (
            <div
              key={r.label}
              className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr_1fr]"
              style={{ borderTop: cellBorder }}
            >
              <div className="flex flex-col gap-1 p-5">
                <span
                  className="font-mono text-[10px] uppercase tracking-[0.20em]"
                  style={{ color: "rgba(15, 14, 13, 0.40)" }}
                >
                  // {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="text-base md:text-[15px]"
                  style={{ color: "#0f0e0d", fontWeight: 500 }}
                >
                  {r.label}
                </span>
              </div>
              <div
                className="flex flex-col gap-1 p-5 text-[14px] leading-[1.45] md:text-[14px]"
                style={{ borderTop: cellBorder, color: "rgba(15, 14, 13, 0.62)" }}
              >
                <span
                  className="font-mono text-[10px] uppercase tracking-[0.20em] md:hidden"
                  style={{ color: "rgba(15, 14, 13, 0.40)" }}
                >
                  Traditional
                </span>
                {r.trad}
              </div>
              <div
                className="flex flex-col gap-1 p-5 text-[14px] leading-[1.45]"
                style={{
                  borderTop: cellBorder,
                  color: "#0f0e0d",
                  fontWeight: 500,
                }}
              >
                <span
                  className="font-mono text-[10px] uppercase tracking-[0.20em] md:hidden"
                  style={{ color: "var(--cyan)" }}
                >
                  Novonus
                </span>
                {r.novonus}
              </div>
              <div
                className="flex flex-col gap-1 p-5 text-[14px] leading-[1.45]"
                style={{ borderTop: cellBorder, color: "var(--cyan)" }}
              >
                <span
                  className="font-mono text-[10px] uppercase tracking-[0.20em] md:hidden"
                  style={{ color: "rgba(15, 14, 13, 0.40)" }}
                >
                  Advantage
                </span>
                {r.adv}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


/* ============================================================================
   EVIDENCE — research-backed stats with intersection-observer count-up
   ========================================================================== */

function StatCounter({
  target,
  suffix = "",
  duration = 800,
}: {
  target: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState<string>(() =>
    Number.isInteger(target) ? "0" : "0.0",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const node = ref.current;
    if (!node) return;
    let started = false;
    let rafId = 0;
    const isFloat = !Number.isInteger(target);

    const obs = new IntersectionObserver(
      (entries) => {
        if (!started && entries.some((e) => e.isIntersecting)) {
          started = true;
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            const current = target * eased;
            setDisplay(isFloat ? current.toFixed(1) : String(Math.round(current)));
            if (t < 1) rafId = requestAnimationFrame(tick);
          };
          rafId = requestAnimationFrame(tick);
          obs.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    obs.observe(node);
    return () => {
      obs.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [target, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {display}
      {suffix}
    </span>
  );
}

const EVIDENCE_STATS = [
  {
    num: 54.5,
    suffix: "%",
    label: "Success rate improvement",
    caption:
      "Force-aware imitation learning over vision-only on contact-rich tasks.",
    source: "ForceMimic, IROS 2024",
  },
  {
    num: 89,
    suffix: "%",
    label: "Faster execution",
    caption:
      "Bio-signal augmented teleoperation over traditional methods.",
    source: "Intelligence & Robotics, 2026",
  },
  {
    num: 91.4,
    suffix: "%",
    label: "Intent recognition",
    caption:
      "LSTM-based motion intention recognition accuracy under 10ms latency.",
    source: "Intelligence & Robotics, 2026",
  },
  {
    num: 542,
    suffix: "K",
    label: "Robots installed",
    caption:
      "Industrial robots installed globally in 2024. Demand growing.",
    source: "World Robotics 2025 Report, IFR",
  },
  {
    num: 79,
    suffix: "%",
    label: "Cite labor shortage",
    caption:
      "Manufacturing executives identify skilled-labor shortage as top challenge in 2026.",
    source: "CADDi 2026 Manufacturing Outlook Study",
  },
  {
    num: 60,
    suffix: "%",
    label: "Better precision",
    caption:
      "Improvement in placement accuracy on contact-rich assembly.",
    source: "Intelligence & Robotics, 2026",
  },
] as const;

function Evidence() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        fontFamily:
          "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
        color: "#0f0e0d",
      }}
    >
      <PaperBackground />
      <div className="relative mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-20">
        <SectionTag label="the evidence" />
        <h2
          className="text-balance text-[36px] leading-[1.05] tracking-[-0.02em] md:text-[64px]"
          style={{ fontWeight: 600 }}
        >
          Peer-reviewed. Quantified. Settled.
        </h2>
        <p
          className="mt-8 max-w-3xl text-base leading-[1.6] md:text-lg md:leading-[1.55]"
          style={{ color: "rgba(15, 14, 13, 0.72)", fontWeight: 400 }}
        >
          Every claim we make about contact-rich manipulation is backed by
          published research. The science is settled. The remaining question
          is who builds the deployed product.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {EVIDENCE_STATS.map((s) => (
            <motion.article
              key={s.label}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-3 rounded-2xl p-6 md:p-7"
              style={{
                border: "1px solid rgba(15, 14, 13, 0.14)",
                background: "rgba(15, 14, 13, 0.03)",
              }}
            >
              <div
                className="text-[44px] leading-none tracking-[-0.025em] text-cyan md:text-[56px]"
                style={{ fontWeight: 700 }}
              >
                <StatCounter target={s.num} suffix={s.suffix} />
              </div>
              <p
                className="font-mono text-[11px] uppercase tracking-[0.20em]"
                style={{ color: "rgba(15, 14, 13, 0.85)" }}
              >
                {s.label}
              </p>
              <p
                className="text-[13px] leading-[1.55]"
                style={{ color: "rgba(15, 14, 13, 0.62)" }}
              >
                {s.caption}
              </p>
              <p
                className="mt-auto pt-3 font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{ color: "rgba(15, 14, 13, 0.38)" }}
              >
                {s.source}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}



/* ============================================================================
   TECHNICALS — animated terminal pipeline.

   Lines reveal one-at-a-time with timed delays (no per-char typing per
   spec). Progress bars fill from 0 → 20 segments over 800 ms with an
   ease-out cubic curve. Once the sequence completes, the final cursor
   keeps blinking forever via the .terminal-cursor CSS class.
   Animation runs once per page load — triggered when the section
   enters the viewport at 30% threshold. If the user has
   prefers-reduced-motion enabled, every line and progress bar renders
   fully filled immediately.
   ========================================================================== */

type TermItem =
  | { kind: "comment"; text: string; delayBefore: number }
  | { kind: "command"; text: string; delayBefore: number }
  | { kind: "output"; text: string; delayBefore: number }
  | { kind: "status"; marker: string; text: string; delayBefore: number }
  | { kind: "progress"; delayBefore: number }
  | { kind: "blank"; delayBefore: number }
  | { kind: "promptCursor"; delayBefore: number };

const TERM_BAR_SEGMENTS = 20;
const TERM_BAR_DURATION = 800;

const TERM_PIPELINE: TermItem[] = [
  { kind: "comment", text: "# initializing novonus pipeline...", delayBefore: 0 },
  { kind: "blank", delayBefore: 420 },

  { kind: "command", text: "$ capture --emg --vision --imu --sync", delayBefore: 380 },
  { kind: "output", text: "  → EMG channels (4): active", delayBefore: 260 },
  { kind: "output", text: "  → RealSense D435i: streaming RGB-D", delayBefore: 220 },
  { kind: "output", text: "  → IMU: orientation locked", delayBefore: 200 },
  { kind: "output", text: "  → LSL sync: <1ms drift", delayBefore: 220 },
  { kind: "status", marker: "OK", text: "all sensors online", delayBefore: 320 },
  { kind: "blank", delayBefore: 240 },

  { kind: "command", text: "$ process --filter --normalize --label", delayBefore: 360 },
  { kind: "output", text: "  → bandpass 20-450Hz: applied", delayBefore: 240 },
  { kind: "output", text: "  → mains rejection 60/120/180Hz: applied", delayBefore: 220 },
  { kind: "output", text: "  → MVC normalization: per-operator calibrated", delayBefore: 220 },
  { kind: "output", text: "  → LSTM intention estimator: running", delayBefore: 220 },
  { kind: "progress", delayBefore: 280 },
  { kind: "status", marker: "OK", text: "signals cleaned and labeled", delayBefore: 280 },
  { kind: "blank", delayBefore: 240 },

  { kind: "command", text: "$ fuse --multimodal", delayBefore: 360 },
  { kind: "output", text: "  → vision encoder (DINOv2): 384-dim features", delayBefore: 240 },
  { kind: "output", text: "  → emg encoder (1D-CNN): 128-dim features", delayBefore: 220 },
  { kind: "output", text: "  → temporal alignment: sub-ms", delayBefore: 220 },
  { kind: "status", marker: "OK", text: "observation tensor assembled", delayBefore: 300 },
  { kind: "blank", delayBefore: 240 },

  { kind: "command", text: "$ augment --newton --domain-random", delayBefore: 360 },
  { kind: "output", text: "  → physics scene compiled", delayBefore: 240 },
  { kind: "output", text: "  → variations: pose, friction, lighting", delayBefore: 220 },
  { kind: "output", text: "  → real demos: 50 → synthetic samples: 5000", delayBefore: 220 },
  { kind: "progress", delayBefore: 280 },
  { kind: "status", marker: "OK", text: "dataset expanded 100x", delayBefore: 280 },
  { kind: "blank", delayBefore: 240 },

  { kind: "command", text: "$ train --diffusion-policy --multimodal", delayBefore: 360 },
  { kind: "output", text: "  → architecture: Diffusion Policy", delayBefore: 240 },
  { kind: "output", text: "  → action horizon: 16 frames", delayBefore: 220 },
  { kind: "output", text: "  → conditioning: vision + emg + state", delayBefore: 220 },
  { kind: "progress", delayBefore: 280 },
  { kind: "status", marker: "OK", text: "policy trained, validation passed", delayBefore: 280 },
  { kind: "blank", delayBefore: 240 },

  { kind: "command", text: "$ deploy --tensorrt --edge", delayBefore: 360 },
  { kind: "output", text: "  → model optimized: FP16", delayBefore: 240 },
  { kind: "output", text: "  → target: Jetson AGX Orin", delayBefore: 220 },
  { kind: "output", text: "  → middleware: ROS 2 Humble", delayBefore: 220 },
  { kind: "output", text: "  → safety supervisor: active", delayBefore: 220 },
  { kind: "status", marker: "DONE", text: "policy deployed to robot", delayBefore: 320 },
  { kind: "blank", delayBefore: 280 },

  { kind: "comment", text: "# pipeline complete.", delayBefore: 360 },
  { kind: "comment", text: "# robots inherit human force intuition.", delayBefore: 260 },
  { kind: "promptCursor", delayBefore: 320 },
];

const TERM_MONO_STACK =
  'ui-monospace, "JetBrains Mono", "Fira Code", "IBM Plex Mono", "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';
const TERM_BODY = "rgba(15, 14, 13, 0.86)";
const TERM_MUTED = "rgba(15, 14, 13, 0.42)";

function ProgressBar({ filled }: { filled: number }) {
  const total = TERM_BAR_SEGMENTS;
  const pct = Math.round((filled / total) * 100);
  return (
    <>
      <span>{"  ["}</span>
      <span>{"█".repeat(filled)}</span>
      <span style={{ color: TERM_MUTED }}>
        {"█".repeat(Math.max(0, total - filled))}
      </span>
      <span>{"] "}</span>
      <span>{String(pct).padStart(3, " ")}%</span>
    </>
  );
}

function Technicals() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [progress, setProgress] = useState<Record<number, number>>({});
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduced) {
      // Show everything in final state immediately.
      setVisibleCount(TERM_PIPELINE.length);
      const filled: Record<number, number> = {};
      TERM_PIPELINE.forEach((item, i) => {
        if (item.kind === "progress") filled[i] = TERM_BAR_SEGMENTS;
      });
      setProgress(filled);
      setCompleted(true);
      return;
    }

    const node = ref.current;
    if (!node) return;
    let started = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const rafs: number[] = [];

    const run = () => {
      let cumulative = 0;
      TERM_PIPELINE.forEach((item, i) => {
        cumulative += item.delayBefore;
        const appearAt = cumulative;
        timeouts.push(
          setTimeout(() => {
            setVisibleCount((c) => Math.max(c, i + 1));
          }, appearAt),
        );
        if (item.kind === "progress") {
          // Animate fill 0 → TERM_BAR_SEGMENTS over TERM_BAR_DURATION
          // ms, ease-out cubic. Subsequent lines wait until done.
          timeouts.push(
            setTimeout(() => {
              const start = performance.now();
              const tick = (now: number) => {
                const t = Math.min(1, (now - start) / TERM_BAR_DURATION);
                const eased = 1 - Math.pow(1 - t, 3);
                const fill = Math.round(TERM_BAR_SEGMENTS * eased);
                setProgress((prev) =>
                  prev[i] === fill ? prev : { ...prev, [i]: fill },
                );
                if (t < 1) {
                  const id = requestAnimationFrame(tick);
                  rafs.push(id);
                }
              };
              const id = requestAnimationFrame(tick);
              rafs.push(id);
            }, appearAt),
          );
          cumulative += TERM_BAR_DURATION;
        }
      });
      timeouts.push(
        setTimeout(() => setCompleted(true), cumulative + 80),
      );
    };

    const obs = new IntersectionObserver(
      (entries) => {
        if (!started && entries.some((e) => e.isIntersecting)) {
          started = true;
          run();
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(node);

    return () => {
      obs.disconnect();
      timeouts.forEach(clearTimeout);
      rafs.forEach(cancelAnimationFrame);
    };
  }, []);

  return (
    <section
      className="relative overflow-hidden"
      style={{
        fontFamily:
          "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
        color: "#0f0e0d",
      }}
    >
      <PaperBackground />
      <div className="relative mx-auto max-w-[1200px] px-6 py-16 md:px-10 md:py-20">
        <SectionTag label="technicals" />
        <h2
          className="max-w-4xl text-balance text-[36px] leading-[1.05] tracking-[-0.02em] md:text-[64px]"
          style={{ fontWeight: 600 }}
        >
          The pipeline in motion.
        </h2>
        <p
          className="mt-8 max-w-3xl text-base leading-[1.6] md:text-lg md:leading-[1.55]"
          style={{ color: "rgba(15, 14, 13, 0.72)", fontWeight: 400 }}
        >
          Five stages, executed in sequence. Biological signals captured,
          processed, fused with vision, augmented through simulation, and
          trained into a deployable policy. Watch it run.
        </p>

        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 overflow-hidden"
          style={{
            background: "#0a0805",
            border: "1px solid rgba(15, 14, 13, 0.14)",
            borderRadius: "4px",
          }}
        >
          {/* Top chrome bar — three dots + centered prompt label */}
          <div
            className="relative flex items-center px-4 py-3"
            style={{
              borderBottom: "1px solid rgba(15, 14, 13, 0.10)",
              background: "rgba(15, 14, 13, 0.02)",
            }}
          >
            <div className="flex items-center gap-1.5">
              {["#ff5f56", "#ffbd2e", "#27c93f"].map((c, i) => (
                <span
                  key={i}
                  aria-hidden
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: c,
                    opacity: 0.4,
                  }}
                />
              ))}
            </div>
            <p
              className="absolute left-1/2 -translate-x-1/2 text-[11px] md:text-[12px]"
              style={{
                fontFamily: TERM_MONO_STACK,
                color: "rgba(15, 14, 13, 0.45)",
              }}
            >
              novonus@pipeline ~ %
            </p>
          </div>

          {/* Body — whiteSpace: pre preserves indentation and the
              alignment of progress bars. overflow-x-auto keeps any
              spill contained to this block (the page itself stays at
              normal width). */}
          <div
            className="overflow-x-auto p-4 text-[11px] leading-[1.6] sm:p-5 sm:text-[12px] md:p-8 md:text-[14px]"
            style={{
              fontFamily: TERM_MONO_STACK,
              color: TERM_BODY,
              whiteSpace: "pre",
            }}
          >
            {TERM_PIPELINE.slice(0, visibleCount).map((item, i) => {
              if (item.kind === "comment") {
                return (
                  <div key={i} style={{ color: TERM_MUTED }}>
                    {item.text}
                  </div>
                );
              }
              if (item.kind === "command") {
                const rest = item.text.slice(1);
                return (
                  <div key={i}>
                    <span style={{ color: "var(--cyan)" }}>$</span>
                    <span>{rest}</span>
                  </div>
                );
              }
              if (item.kind === "output") {
                return (
                  <div key={i} style={{ color: TERM_MUTED }}>
                    {item.text}
                  </div>
                );
              }
              if (item.kind === "status") {
                return (
                  <div key={i}>
                    {"  ["}
                    <span style={{ color: "var(--cyan)" }}>{item.marker}</span>
                    {"] "}
                    <span>{item.text}</span>
                  </div>
                );
              }
              if (item.kind === "progress") {
                const filled = progress[i] ?? 0;
                return (
                  <div key={i} style={{ color: "var(--cyan)" }}>
                    <ProgressBar filled={filled} />
                  </div>
                );
              }
              if (item.kind === "blank") {
                return (
                  <div key={i} aria-hidden>
                    {" "}
                  </div>
                );
              }
              if (item.kind === "promptCursor") {
                return (
                  <div key={i}>
                    <span style={{ color: "var(--cyan)" }}>$</span>{" "}
                    <span
                      className={completed ? "terminal-cursor" : undefined}
                      style={{ color: "var(--cyan)" }}
                      aria-hidden
                    >
                      ▊
                    </span>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ============================================================================
   SITE FOOTER — minimal two-line strip
   ========================================================================== */
function SiteFooter() {
  return (
    <footer
      className="relative overflow-hidden"
      style={{
        fontFamily:
          "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <PaperBackground />
      <div
        className="relative mx-auto max-w-[1400px] px-6 py-10 md:px-10 md:py-12"
        style={{ borderTop: "1px solid rgba(15, 14, 13, 0.10)" }}
      >
        <div
          className="flex flex-col items-start justify-between gap-2 text-[12px] md:flex-row md:items-center md:text-[13px]"
          style={{ color: "rgba(15, 14, 13, 0.55)" }}
        >
          <p>Novonus / The somatic layer for industrial robotics</p>
          <p>© 2026</p>
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
        <WhatWeBuild />
        <Pipeline />
        <Technicals />
        <Evidence />
        <SiteFooter />
      </main>
    </IntroProvider>
  );
}

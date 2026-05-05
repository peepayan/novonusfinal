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

type IntroPhase = "pop" | "text" | "dock" | "hero" | "done";

const POP_MS = 400;        /* logo scales in */
const HOLD_MS = 500;       /* hold logo alone at center */
const TEXT_MS = 700;       /* logo shifts left, text slides right */
const TEXT_HOLD_MS = 400;  /* hold the centralized lockup */
const DOCK_MS = 800;       /* logo+text fly to top bar, site fades in */
const HERO_DELAY_MS = 200; /* small pause before hero reveal */
const HERO_MS = 900;       /* hero reveal duration */
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
    const t2 = t1 + DOCK_MS + HERO_DELAY_MS;
    const t3 = t2 + HERO_MS;

    const timers = [
      window.setTimeout(() => setPhase("text"), t0),
      window.setTimeout(() => setPhase("dock"), t1),
      window.setTimeout(() => setPhase("hero"), t2),
      window.setTimeout(() => setPhase("done"), t3),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, []);

  /* Website content (excluding hero) fades in during the dock phase */
  const siteVisible = phase === "dock" || phase === "hero" || phase === "done";

  return (
    <IntroContext.Provider value={{ phase }}>
      <CursorGlow />
      <Preloader />
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
   CURSOR GLOW — soft blue light that follows the cursor and reveals the grid
   ========================================================================== */

function CursorGlow() {
  const ref = useRef<HTMLDivElement | null>(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const visible = useRef(0);
  const targetVisible = useRef(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    target.current = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
    current.current = { ...target.current };

    const handleMove = (e: PointerEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
      targetVisible.current = 1;
    };
    const handleLeave = () => {
      targetVisible.current = 0;
    };
    const handleEnter = () => {
      targetVisible.current = 1;
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    window.addEventListener("pointerleave", handleLeave);
    window.addEventListener("pointerenter", handleEnter);

    const tick = () => {
      const lerp = 0.85;
      current.current.x += (target.current.x - current.current.x) * lerp;
      current.current.y += (target.current.y - current.current.y) * lerp;
      visible.current += (targetVisible.current - visible.current) * 0.4;

      const el = ref.current;
      if (el) {
        el.style.transform = `translate3d(${current.current.x}px, ${current.current.y}px, 0) translate(-50%, -50%)`;
        el.style.opacity = String(visible.current);
      }
      raf.current = window.requestAnimationFrame(tick);
    };
    raf.current = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerleave", handleLeave);
      window.removeEventListener("pointerenter", handleEnter);
      if (raf.current !== null) window.cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="cursor-glow pointer-events-none fixed left-0 top-0 z-[60]"
      style={{ opacity: 0 }}
    />
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
  const overlayVisible = phase === "pop" || phase === "text";

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

      {/* Cyan halo — anchored at screen center during pop phase */}
      {(phase === "pop" || phase === "text") && (
        <motion.div
          key="halo"
          aria-hidden
          className="pointer-events-none fixed left-1/2 top-1/2 z-[105] -translate-x-1/2 -translate-y-1/2"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{
            opacity: phase === "pop" ? 1 : 0.6,
            scale: phase === "pop" ? 1 : 1.2,
          }}
          exit={{ opacity: 0, scale: 1.9 }}
          transition={{
            duration: phase === "pop" ? 0.6 : MORPH_S,
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
   BRAND LOCKUP — top-center docking destination
   ========================================================================== */

function BrandLockup() {
  const { phase } = useIntro();
  const centered = phase === "pop" || phase === "text";
  const docked = !centered;
  const morph = { duration: MORPH_S, ease: EASE_MORPH };

  /* Phase-dependent values */
  const logoSize = centered ? 144 : 38;

  /* Text only shows during the centered intro phase. Once the logo docks
     at the top, the wrapper collapses to 0 and the text fades — only the
     logo remains in the top bar from then on. */
  const wrapperWidth = phase === "text" ? 168 : 0;
  const innerPad = 4;
  const textOpacity = phase === "text" ? 1 : 0;

  return (
    <motion.div
      className="pointer-events-none fixed left-1/2 z-[120] flex items-center"
      initial={{ top: "50%", x: "-50%", y: "-50%" }}
      animate={{
        top: docked ? "1.25rem" : "50%",
        x: "-50%",
        y: docked ? "0%" : "-50%",
      }}
      transition={morph}
    >
      {/* Logo — pops in center during "pop", smoothly shifts left as
          the wrapper width grows during "text" phase. */}
      <motion.div
        className="relative shrink-0"
        style={{ zIndex: 2 }}
        initial={{ width: 144, height: 144, scale: 0, opacity: 0 }}
        animate={{
          width: logoSize,
          height: logoSize,
          scale: 1,
          opacity: 1,
        }}
        transition={{
          width: morph,
          height: morph,
          scale: { duration: POP_S, ease: EASE_POP },
          opacity: { duration: 0.35, ease: "easeOut" },
        }}
      >
        <LogoMark glass={phase === "pop" || phase === "text"} />
      </motion.div>

      {/* Text wrapper — width wipe from 0.
          paddingLeft is INSIDE, so the wipe first reveals the gap
          (empty space), then the text. Feels like one continuous
          reveal emerging from behind the logo. */}
      <motion.div
        style={{ overflow: "hidden", zIndex: 1, flexShrink: 0 }}
        initial={{ width: 0, y: 0 }}
        animate={{ width: wrapperWidth, y: docked ? 6 : 0 }}
        transition={{ width: morph, y: morph }}
      >
        <motion.span
          className="block font-sans font-semibold tracking-[0.02em] text-paper select-none"
          style={{ whiteSpace: "nowrap" }}
          initial={{ paddingLeft: 4, fontSize: "34px", opacity: 0 }}
          animate={{
            paddingLeft: innerPad,
            fontSize: "34px",
            opacity: textOpacity * 0.9,
          }}
          transition={{
            paddingLeft: morph,
            fontSize: morph,
            opacity: { duration: 0.5, ease: EASE_FADE },
          }}
        >
          Novonus
        </motion.span>
      </motion.div>
    </motion.div>
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
  const fillHeight = useTransform(scrollYProgress, [0, 0.32], ["0%", "100%"]);
  const fillOpacity = useTransform(
    scrollYProgress,
    [0, 0.04, 1],
    [0, 1, 1],
  );
  const novonusOpacity = useTransform(scrollYProgress, [0.4, 0.5], [1, 0]);

  const [stage, setStage] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    let next = 0;
    if (v > 0.8) next = 3;
    else if (v > 0.65) next = 2;
    else if (v > 0.55) next = 1;
    setStage((prev) => (prev === next ? prev : next));
  });

  return (
    <>
      <section
        ref={sectionRef}
        className="relative bg-ink"
        style={{ height: "300svh" }}
      >
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          <div className="bg-grid absolute inset-0 opacity-50" />
          <div className="glow-accent absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2" />

          {/* Giant NOVONUS backdrop — cyan top → transparent bottom,
              sits behind the hero artwork. Fades out as red fill completes. */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
            style={{ opacity: novonusOpacity }}
          >
            <motion.span
              className="hero-backdrop-text"
              initial={{ opacity: 0, y: 18 }}
              animate={{
                opacity: heroReady ? 1 : 0,
                y: heroReady ? 0 : 18,
              }}
              transition={{
                duration: 1.6,
                ease: [0.22, 1, 0.36, 1],
                delay: heroReady ? 0.15 : 0,
              }}
            >
              NOVONUS
            </motion.span>
          </motion.div>

          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-[20svh]"
            style={{
              background:
                "linear-gradient(to bottom, transparent 0%, rgba(8,10,16,0.4) 70%, rgb(8,10,16) 100%)",
            }}
          />

          <div className="relative z-[2] mx-auto flex h-full max-w-[1400px] flex-col items-center justify-center px-6 md:px-10">
            {/* Hero image container — graceful reveal after intro docking.
                After the NOVONUS fade completes, a single scroll past the
                stage-1 threshold snaps the artwork to its right-shifted
                position via a fixed-duration animation, independent of how
                far the user actually scrolls. */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 24, x: "0%" }}
              animate={{
                opacity: heroReady ? (stage >= 3 ? 0 : 1) : 0,
                scale: heroReady ? (stage >= 3 ? 0.98 : 1) : 0.96,
                y: heroReady ? (stage >= 3 ? -12 : 0) : 24,
                x: stage >= 1 ? "20%" : "0%",
              }}
              transition={{
                duration: 0.9,
                ease: [0.22, 1, 0.36, 1],
                x: { duration: 0.85, ease: [0.4, 0, 0.2, 1] },
                opacity: { duration: 0.7, ease: [0.4, 0, 0.2, 1] },
              }}
              className="hero-stack relative aspect-[16/10] w-full max-w-[1100px] mix-blend-screen select-none"
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

              {/* CLICK TARGET — small, pixel-precise to the brain outline.
                  SVG <image> with pointer-events="visiblePainted" only fires
                  on opaque brain-outline pixels, so the click radius is
                  tightly contained to the brain area. */}
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden
                className="absolute z-[19]"
                style={{
                  left: "29%",
                  top: "6.5%",
                  width: "35%",
                  height: "47%",
                  pointerEvents: "none",
                }}
              >
                <image
                  href="/brain_outline.png"
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
          </div>

          {/* Tagline — appears as a single beat once stage 2 is reached. A
              fixed-duration animation drives the slide-in, so any scroll
              past the threshold reveals the whole tagline in one go. */}
          <motion.div
            className="pointer-events-none absolute left-0 top-1/2 z-[5] hidden w-[52%] max-w-[760px] -translate-y-1/2 px-8 md:block md:pl-[6vw] lg:pl-[8vw]"
            initial={{ opacity: 0, x: -28 }}
            animate={{
              opacity: stage === 2 ? 1 : 0,
              x: stage >= 2 ? (stage >= 3 ? -28 : 0) : -28,
            }}
            transition={{ duration: 0.85, ease: [0.4, 0, 0.2, 1] }}
          >
            <p
              className="text-balance"
              aria-label="Thirty years. One missing signal. We found it."
              style={{
                fontFamily:
                  "var(--font-space-grotesk), ui-sans-serif, system-ui",
                fontWeight: 700,
                fontStyle: "italic",
                fontSize: "clamp(2.05rem, 3.55vw, 3.25rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.032em",
                color: "rgba(234, 246, 255, 0.99)",
                margin: 0,
                textShadow:
                  "2px 0 0 rgba(34, 211, 238, 0.32), -2px 0 0 rgba(255, 90, 130, 0.3)",
                filter:
                  "drop-shadow(0 0 22px rgba(34, 211, 238, 0.1)) drop-shadow(0 1px 0 rgba(0, 0, 0, 0.4))",
              }}
            >
              <span style={{ display: "block" }}>Thirty years.</span>
              <span style={{ display: "block", marginTop: "0.62em" }}>
                One missing signal.
              </span>
              <span
                style={{
                  display: "block",
                  marginTop: "0.62em",
                  color: "rgba(34, 211, 238, 1)",
                  textShadow:
                    "2px 0 0 rgba(34, 211, 238, 0.5), -2px 0 0 rgba(255, 90, 130, 0.32)",
                }}
              >
                We found it.
              </span>
            </p>
          </motion.div>

          {/* Manifesto — at stage 3 the hero artwork and the ceiling
              tagline fade out and this paragraph block fades into the
              same pinned space. No page scroll happens between the
              two beats; the swap is part of the pin. */}
          <motion.div
            className="pointer-events-none absolute inset-0 z-[6] flex items-center justify-center px-6 md:px-10"
            initial={false}
            animate={{
              opacity: stage >= 3 ? 1 : 0,
              y: stage >= 3 ? 0 : 16,
            }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            aria-hidden={stage < 3}
          >
            <div
              className="w-full max-w-[820px] text-balance"
              style={{
                fontFamily:
                  "var(--font-space-grotesk), ui-sans-serif, system-ui",
                fontWeight: 400,
                fontSize: "clamp(1.05rem, 1.55vw, 1.4rem)",
                lineHeight: 1.55,
                letterSpacing: "-0.01em",
                color: "rgba(220, 235, 250, 0.88)",
              }}
            >
              <p>
                Modern robotics has trained on the wrong data for thirty
                years. Vision systems learned to see, foundation models
                learned to plan, manipulation policies learned to move.
                Almost none of them learned to{" "}
                <span style={{ color: "rgba(34, 211, 238, 1)", fontWeight: 600 }}>
                  feel
                </span>
                .
              </p>
              <p className="mt-6 md:mt-8">
                The result is the{" "}
                <span style={{ color: "rgba(255, 95, 115, 0.98)", fontWeight: 600 }}>
                  contact-rich ceiling
                </span>
                . Robots fail at connector insertion, cable routing, and
                fragile assembly because they can&apos;t anticipate force.
                They find out they&apos;re pressing too hard{" "}
                <span style={{ color: "rgba(255, 215, 225, 0.98)", fontWeight: 600 }}>
                  200 milliseconds
                </span>{" "}
                after the part is already crushed.
              </p>
              <p className="mt-6 md:mt-8">
                The richest manipulation signal in the room has been
                ignored: what the human&apos;s{" "}
                <span style={{ color: "rgba(34, 211, 238, 1)", fontWeight: 600 }}>
                  muscles
                </span>{" "}
                were doing before contact. We capture it.{" "}
                <span
                  style={{
                    color: "rgba(240, 248, 255, 1)",
                    fontWeight: 700,
                  }}
                >
                  Industrial robots are about to start feeling.
                </span>
              </p>
            </div>
          </motion.div>

          {/* Bottom badge — small centered pill that wraps just the title.
              Heavily translucent liquid-glass backdrop with a soft iridescent
              tint and rounded corners. The outer wrapper binds opacity to
              novonusOpacity so the pill fades with the giant NOVONUS backdrop
              as the user scrolls. The inner motion.div handles the intro
              fade-in and the stage 3 hand-off to the manifesto. */}
          <motion.div
            className="absolute left-1/2 bottom-8 z-[40] hidden -translate-x-1/2 md:block lg:bottom-10"
            style={{ opacity: novonusOpacity }}
          >
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{
              opacity: heroReady ? (stage >= 3 ? 0 : 1) : 0,
              y: heroReady ? (stage >= 3 ? 8 : 0) : 14,
            }}
            transition={{
              duration: 0.9,
              ease: [0.22, 1, 0.36, 1],
              delay: heroReady && stage < 3 ? 0.55 : 0,
            }}
            aria-hidden={stage >= 3}
          >
            <div
              className="relative overflow-hidden rounded-full px-7 py-3 lg:px-9 lg:py-3.5"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255, 255, 255, 0.045) 0%, rgba(255, 255, 255, 0.015) 100%)",
                backdropFilter:
                  "blur(28px) saturate(200%) brightness(1.04)",
                WebkitBackdropFilter:
                  "blur(28px) saturate(200%) brightness(1.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                boxShadow:
                  "inset 0 1px 0 rgba(255, 255, 255, 0.09), 0 18px 50px rgba(0, 0, 0, 0.22)",
              }}
            >
              {/* Iridescent chromatic tint — cyan from the lower-left,
                  magenta from the lower-right, blended in screen so the
                  glass keeps its translucence. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(80% 220% at 0% 100%, rgba(34, 211, 238, 0.1) 0%, transparent 60%), radial-gradient(80% 220% at 100% 100%, rgba(255, 90, 130, 0.07) 0%, transparent 60%)",
                  mixBlendMode: "screen",
                }}
              />

              <h2
                className="relative whitespace-nowrap"
                style={{
                  fontFamily:
                    "var(--font-space-grotesk), ui-sans-serif, system-ui",
                  fontWeight: 400,
                  fontSize: "clamp(1.02rem, 1.4vw, 1.4rem)",
                  lineHeight: 1.15,
                  letterSpacing: "-0.022em",
                  color: "rgba(232, 244, 255, 0.97)",
                  margin: 0,
                }}
              >
                The{" "}
                <em style={{ fontStyle: "italic", fontWeight: 700 }}>
                  Somatic Layer
                </em>{" "}
                for{" "}
                <span
                  style={{
                    fontFamily:
                      "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontStyle: "normal",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                    fontSize: "0.74em",
                    color: "rgba(34, 211, 238, 0.95)",
                    verticalAlign: "0.06em",
                    paddingLeft: "0.05em",
                  }}
                >
                  Industrial Autonomy
                </span>
              </h2>
            </div>
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

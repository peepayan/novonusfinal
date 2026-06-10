"use client";

import {
  Fragment,
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
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

const IntroContext = createContext<{ phase: IntroPhase; skipIntroAnim: boolean }>({
  phase: "done",
  skipIntroAnim: false,
});
const useIntro = () => useContext(IntroContext);

function IntroProvider({
  sidebar,
  children,
}: {
  sidebar?: ReactNode;
  children: ReactNode;
}) {
  /* When the browser restores a non-zero scroll position on
     refresh, the user is past the hero — playing the intro
     choreography and the title-text entrance animation is jarring.
     We can't resolve this in useState initializers without
     mismatching SSR vs client first render (hydration error), so
     we keep the defaults that match SSR and detect "skip" in a
     post-hydration useEffect instead. Animated children that get
     re-mounted after the flip pick up `skipIntroAnim = true` and
     initialize in their already-settled state. */
  const [phase, setPhase] = useState<IntroPhase>("loadingBar");
  const [skipIntroAnim, setSkipIntroAnim] = useState(false);

  /* useLayoutEffect runs synchronously BEFORE the browser paints, so
     when we flip `skipIntroAnim` + `phase` here, the re-render and
     subsequent remount of `key`-gated children happens before the
     user ever sees the intro state. No flash, no animation. */
  useLayoutEffect(() => {
    if (typeof window !== "undefined" && window.scrollY > 0) {
      setSkipIntroAnim(true);
      setPhase("done");
      return;
    }
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
    <IntroContext.Provider value={{ phase, skipIntroAnim }}>
      <Preloader />
      <HeroLoadingBar />
      <BrandLockup />
      {sidebar}
      <motion.div
        initial={{ opacity: skipIntroAnim ? 1 : 0 }}
        animate={{ opacity: siteVisible ? 1 : 0 }}
        transition={{
          duration: skipIntroAnim ? 0 : MORPH_S * 0.9,
          ease: EASE_FADE,
        }}
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
  const { phase, skipIntroAnim } = useIntro();
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() || 0;
    // Keep it visible if we are near the top of the page
    if (latest <= 100) {
      setHidden(false);
      return;
    }
    // If scrolling down, hide the bar
    if (latest > previous && latest > 150) {
      setHidden(true);
    } 
    // If scrolling up, show the bar
    else if (latest < previous) {
      setHidden(false);
    }
  });

  const visible =
    phase === "logoPop" ||
    phase === "dock" ||
    phase === "done";
  const centered = phase === "logoPop";
  const docked =
    phase === "dock" || phase === "done";

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[120]"
      animate={{ y: hidden && docked ? "-120px" : "0px" }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
    >
      {/* Floating top bar — detached from edges with curved corners */}
      {docked && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-4 right-4 top-4 z-[119] h-[56px] rounded-2xl md:left-8 md:right-8 lg:left-12 lg:right-12"
          initial={
            skipIntroAnim ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }
          }
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: skipIntroAnim ? 0 : 0.6,
            ease: EASE_FADE,
            delay: skipIntroAnim ? 0 : 0.3,
          }}
          style={{ backgroundColor: "rgba(15, 14, 13, 0.75)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
        />
      )}

      {/* Logo + wordmark lockup. Floats above the bar (z-120 vs z-119).
          When skipped, mounts already docked at the top bar with no
          fly-in animation. The `key` changes when skipIntroAnim
          flips so framer-motion remounts the element with fresh
          initial values (mounted state from before is discarded). */}
      <motion.div
        key={skipIntroAnim ? "lockup-skip" : "lockup-normal"}
        className="pointer-events-none absolute left-1/2 z-[120] flex items-center"
        initial={
          skipIntroAnim
            ? {
                top: "44px",
                x: "-50%",
                y: "-50%",
                scale: 1,
                opacity: 1,
                height: 38,
              }
            : {
                top: "50%",
                x: "-50%",
                y: "-50%",
                scale: 0,
                opacity: 0,
              }
        }
        animate={{
          top: docked ? "44px" : "50%",
          x: "-50%",
          y: "-50%",
          height: centered ? 144 : 38,
          scale: visible ? 1 : 0,
          opacity: visible ? 1 : 0,
        }}
        transition={
          skipIntroAnim
            ? { duration: 0 }
            : {
                top: { duration: 0.5, ease: EASE_MORPH },
                y: { duration: 0.5, ease: EASE_MORPH },
                height: { duration: 0.55, ease: EASE_MORPH },
                scale: {
                  duration: centered ? 0.55 : 0.5,
                  ease: centered ? EASE_POP : EASE_MORPH,
                },
                opacity: { duration: 0.45, ease: EASE_FADE },
              }
        }
      >
        {/* Logo */}
        <motion.div
          className="relative shrink-0"
          style={{ zIndex: 2 }}
          initial={
            skipIntroAnim
              ? { width: 38, height: 38 }
              : { width: 144, height: 144 }
          }
          animate={{
            width: centered ? 144 : 38,
            height: centered ? 144 : 38,
          }}
          transition={{
            duration: skipIntroAnim ? 0 : 0.55,
            ease: EASE_MORPH,
          }}
        >
          <LogoMark glass={centered} />
        </motion.div>

        {/* Novonus wordmark — appears large during the logoPop intro,
            then stays visible at a smaller size when docked in the top bar. 
            Two layers crossfade: the large intro text fades out while the
            small docked text fades in, avoiding ugly font-size interpolation. */}
        <motion.div
          style={{ overflow: "hidden", flexShrink: 0, zIndex: 1, position: "relative" }}
          initial={
            skipIntroAnim
              ? { width: 120, opacity: 1 }
              : { width: 0, opacity: 0 }
          }
          animate={{
            width: centered ? 240 : (phase === "done") ? 120 : 0,
            opacity: centered || (phase === "done") ? 1 : 0,
          }}
          transition={{
            duration: centered ? 0.6 : (phase === "done") ? 0.5 : 0.2,
            ease: centered ? EASE_MORPH : EASE_FADE,
            delay: centered ? 0.55 : (phase === "done") ? 0.1 : 0,
          }}
        >
          {/* Large intro wordmark — visible only during logoPop */}
          <motion.span
            className="block select-none"
            initial={{ opacity: skipIntroAnim ? 0 : 0 }}
            animate={{ opacity: centered ? 1 : 0 }}
            transition={{ duration: centered ? 0.35 : 0.15, ease: EASE_FADE }}
            style={{
              fontFamily: "var(--font-inter-tight), Inter, ui-sans-serif, system-ui",
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
          </motion.span>
          {/* Small docked wordmark — visible once docked in the top bar */}
          <motion.span
            className="block select-none"
            initial={{ opacity: skipIntroAnim ? 1 : 0 }}
            animate={{ opacity: phase === "done" ? 1 : 0 }}
            transition={{
              duration: skipIntroAnim ? 0 : 0.4,
              ease: EASE_FADE,
              delay: skipIntroAnim ? 0 : (phase === "done" ? 0.1 : 0),
            }}
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              transform: "translateY(-50%)",
              fontFamily: "var(--font-inter-tight), Inter, ui-sans-serif, system-ui",
              fontWeight: 600,
              fontSize: "16px",
              letterSpacing: "-0.02em",
              lineHeight: 1,
              color: "rgba(245, 250, 255, 0.92)",
              whiteSpace: "nowrap",
              paddingLeft: 10,
            }}
          >
            Novonus
          </motion.span>
        </motion.div>
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
   TOPOGRAPHICAL DOTS — canvas grid of dots that (a) responds to cursor
   velocity with a topographical peak + ring waves, and (b) when driven
   by scroll, smoothly lerps every dot from its grid cell into a brain
   silhouette while its color crossfades from dark to cream. The brain
   target for each cell is computed once on resize via a square → disk
   warp so no two grid points collide on the same target.
   ========================================================================== */
function TopographicalDots({
  morphProgress,
  invertProgress,
  eyeMorphProgress,
  eyeOffsetProgress,
  earthMorphProgress,
  earthOffsetProgress,
  cliffMorphProgress,
  cliffPhaseProgress,
}: {
  morphProgress?: MotionValue<number>;
  invertProgress?: MotionValue<number>;
  eyeMorphProgress?: MotionValue<number>;
  eyeOffsetProgress?: MotionValue<number>;
  earthMorphProgress?: MotionValue<number>;
  earthOffsetProgress?: MotionValue<number>;
  cliffMorphProgress?: MotionValue<number>;
  cliffPhaseProgress?: MotionValue<number>;
} = {}) {
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
    /* Cream needs more alpha to read on the dark inverted background. */
    const INVERT_ALPHA = 0.78;

    const VELOCITY_MAX = 30;
    const SPEED_SMOOTH = 0.55;
    const SPEED_FLOOR = 0.05;

    const WAVE_SPEED = 8.5;
    const WAVE_LIFE = 75;
    const WAVE_THICKNESS = 34;
    const WAVE_AMP_SCALE = 0.85;
    const EMIT_INTERVAL_FRAMES = 3;
    const EMIT_MIN_AMP = 0.08;
    const MAX_WAVES = 28;

    const BASE_DARK = { r: 15, g: 14, b: 13 };
    const BASE_CREAM = { r: 245, g: 239, b: 229 };
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

    type Cell = {
      gx: number; gy: number;
      bx: number; by: number;
      ex: number; ey: number;
      fx: number; fy: number;
      cx: number; cy: number;
    };
    let cells: Cell[] = [];
    /* Brain centre in canvas pixels — used to compute tilt direction
       relative to the brain's centre rather than the canvas centre. */
    let brainCenterX = 0;
    let brainCenterY = 0;
    /* Smoothed CSS perspective-tilt angles (degrees). The canvas
       itself tilts in 3D toward the cursor, like a card surface. */
    let smoothTiltX = 0;
    let smoothTiltY = 0;
    /* Previous-frame morph values, used to detect that dots are
       actively transitioning. While they are, we partial-fade the
       canvas instead of clearing so each moving dot leaves a
       fading velocity trail behind it. */
    let prevMorph = 0;
    let prevEyeMorph = 0;
    let prevEyeOffset = 0;
    let prevEarthMorph = 0;
    let prevEarthOffset = 0;
    let prevCliffMorph = 0;
    let prevCliffPhase = 0;

    /* Brain silhouette comes from the real reference image at
       /brain-reference.jpg. On image load we threshold dark pixels
       and densify with a window-sum so only the solid brain region
       survives — the scattered dispersing dots on the side get
       filtered out. Until the image arrives we fall back to a
       procedural side-profile (main cerebrum + cerebellum +
       brainstem) so the morph still works during the brief load
       window. */

    /* Procedural fallback constants — side-profile brain facing LEFT. */
    const MAIN_CX = -0.02;
    const MAIN_CY = -0.06;
    const MAIN_A = 0.46;
    const MAIN_B = 0.42;
    const MAIN_TILT = 0.122;
    const MAIN_COS = Math.cos(MAIN_TILT);
    const MAIN_SIN = Math.sin(MAIN_TILT);
    const CEREB_X = 0.32;
    const CEREB_Y = 0.30;
    const CEREB_A = 0.16;
    const CEREB_B = 0.14;
    const STEM_X = 0.08;
    const STEM_Y = 0.46;
    const STEM_A = 0.06;
    const STEM_B = 0.14;

    const insideBrainProcedural = (x: number, y: number) => {
      const tx = x - MAIN_CX;
      const ty = y - MAIN_CY;
      const rx = tx * MAIN_COS + ty * MAIN_SIN;
      const ry = -tx * MAIN_SIN + ty * MAIN_COS;
      const mdx = rx / MAIN_A;
      const mdy = ry / MAIN_B;
      if (mdx * mdx + mdy * mdy <= 1) return true;
      const cdx = (x - CEREB_X) / CEREB_A;
      const cdy = (y - CEREB_Y) / CEREB_B;
      if (cdx * cdx + cdy * cdy <= 1) return true;
      const sdx = (x - STEM_X) / STEM_A;
      const sdy = (y - STEM_Y) / STEM_B;
      if (sdx * sdx + sdy * sdy <= 1) return true;
      return false;
    };

    /* Mask state — populated asynchronously after each image loads. */
    let brainMask: Uint8Array | null = null;
    let brainMaskW = 0;
    let brainMaskH = 0;
    let bboxMinX = 0;
    let bboxMinY = 0;
    let bboxMaxX = 0;
    let bboxMaxY = 0;
    /* Earth has its own mask + bbox, traced from a separate reference
       image with the same pipeline (threshold → close → CC → bbox). */
    let earthMask: Uint8Array | null = null;
    let earthMaskW = 0;
    let earthMaskH = 0;
    let earthBboxMinX = 0;
    let earthBboxMinY = 0;
    let earthBboxMaxX = 0;
    let earthBboxMaxY = 0;

    const insideEarthMask = (u: number, v: number): boolean => {
      if (!earthMask) return false;
      const bbW = earthBboxMaxX - earthBboxMinX;
      const bbH = earthBboxMaxY - earthBboxMinY;
      if (bbW <= 0 || bbH <= 0) return false;
      const px = earthBboxMinX + Math.floor(u * bbW);
      const py = earthBboxMinY + Math.floor(v * bbH);
      if (px < 0 || px >= earthMaskW || py < 0 || py >= earthMaskH) return false;
      return earthMask[py * earthMaskW + px] > 0;
    };

    const insideBrainMask = (u: number, v: number): boolean => {
      if (!brainMask) return false;
      const bbW = bboxMaxX - bboxMinX;
      const bbH = bboxMaxY - bboxMinY;
      if (bbW <= 0 || bbH <= 0) return false;
      const px = bboxMinX + Math.floor(u * bbW);
      const py = bboxMinY + Math.floor(v * bbH);
      if (px < 0 || px >= brainMaskW || py < 0 || py >= brainMaskH) return false;
      return brainMask[py * brainMaskW + px] > 0;
    };

    /* Build the per-cell grid AND brain-target arrays. Run on resize
       AND when the reference image finishes loading. Strategy:
         1) build the grid, 2) reject-sample N brain interior points
         using a seeded PRNG so the shape is stable, 3) sort both
         lists by polar angle (then radius) around the brain centre
         and pair index-by-index to minimise path crossings during
         the morph. */
    const buildCells = () => {
      const cols = Math.ceil(width / SPACING) + 2;
      const rows = Math.ceil(height / SPACING) + 2;
      const ox = (width - (cols - 1) * SPACING) / 2;
      const oy = (height - (rows - 1) * SPACING) / 2;

      const next: Cell[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          next.push({
            gx: ox + c * SPACING,
            gy: oy + r * SPACING,
            bx: 0,
            by: 0,
            ex: 0,
            ey: 0,
            fx: 0,
            fy: 0,
            cx: 0,
            cy: 0,
          });
        }
      }

      const usingMask = !!brainMask;
      const BRAIN_SCALE = Math.min(width, height) * 0.58;
      const cx = width * 0.5;
      let cy = height * 0.42;

      /* Pixel extent of the brain in canvas space. With the mask we
         preserve the actual image-derived aspect ratio; without it
         we use the procedural shape's own approximate aspect. */
      let brainPxW: number;
      let brainPxH: number;
      if (usingMask) {
        const bbW = bboxMaxX - bboxMinX;
        const bbH = bboxMaxY - bboxMinY;
        const aspect = bbW / bbH;
        brainPxH = BRAIN_SCALE;
        brainPxW = BRAIN_SCALE * aspect;
        if (brainPxW > width * 0.92) {
          brainPxW = width * 0.92;
          brainPxH = brainPxW / aspect;
        }
      } else {
        brainPxW = BRAIN_SCALE * 1.0;
        brainPxH = BRAIN_SCALE * 1.18;
        cy = height * 0.5 - 0.06 * BRAIN_SCALE;
      }

      /* Seeded LCG so the same canvas size always produces the same
         brain — no per-frame jitter, no resampling on scroll. */
      let seed = 0x1a2b3c4d;
      const rnd = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 0xffffffff;
      };

      const wanted = next.length;
      const targets: { x: number; y: number }[] = [];
      let attempts = 0;
      const ATTEMPT_CAP = wanted * 80;
      while (targets.length < wanted && attempts < ATTEMPT_CAP) {
        attempts++;
        if (usingMask) {
          const u = rnd();
          const v = rnd();
          if (insideBrainMask(u, v)) {
            const x = cx - brainPxW * 0.5 + u * brainPxW;
            const y = cy - brainPxH * 0.5 + v * brainPxH;
            targets.push({ x, y });
          }
        } else {
          const u = rnd() * 1.05 - 0.55;
          const v = rnd() * 1.20 - 0.55;
          if (insideBrainProcedural(u, v)) {
            targets.push({ x: cx + u * BRAIN_SCALE, y: cy + v * BRAIN_SCALE });
          }
        }
      }
      while (targets.length < wanted) targets.push({ x: cx, y: cy });

      const sortKey = (px: number, py: number) => {
        const dx = px - cx;
        const dy = py - cy;
        return { ang: Math.atan2(dy, dx), r: Math.sqrt(dx * dx + dy * dy) };
      };
      const cellOrder = next
        .map((c, i) => ({ i, ...sortKey(c.gx, c.gy) }))
        .sort((a, b) => a.ang - b.ang || a.r - b.r);
      const targOrder = targets
        .map((t, i) => ({ i, ...sortKey(t.x, t.y) }))
        .sort((a, b) => a.ang - b.ang || a.r - b.r);

      for (let k = 0; k < cellOrder.length; k++) {
        const t = targets[targOrder[k].i];
        const c = next[cellOrder[k].i];
        c.bx = t.x;
        c.by = t.y;
      }

      /* ------------------------------------------------------------
         CLOCK TARGETS — dot-art clock. Composed explicitly per
         feature so the result reads as a clock with all parts
         visible, not a uniform disc:
            · FACE RING   — thin annular outline (most dots)
            · HOUR MARKERS — 12 small dense clusters around the ring
            · HOUR HAND   — short thick line, pointing at 10
            · MINUTE HAND — longer thin line, pointing at 2 (= :10)
            · CENTRE PIVOT — small dense disc at the centre
         Hands at 10:10 — the classic advertising-clock pose, looks
         like a smile. Dot counts per feature are explicit so the
         features stay legible regardless of how many cells exist.
         ------------------------------------------------------------ */
      const CLOCK_R = BRAIN_SCALE * 0.52;
      const FACE_INNER = CLOCK_R * 0.88;
      const FACE_OUTER = CLOCK_R * 1.0;
      const MARKER_RING = CLOCK_R * 0.79;
      const MARKER_DOT_R = CLOCK_R * 0.05;
      const CENTER_R = CLOCK_R * 0.055;
      const HOUR_HAND_LEN = CLOCK_R * 0.42;
      const HOUR_HAND_W = CLOCK_R * 0.028;
      const MIN_HAND_LEN = CLOCK_R * 0.70;
      const MIN_HAND_W = CLOCK_R * 0.020;
      /* Angles: 0° at 12 o'clock (top), increasing clockwise. */
      const HOUR_ANGLE = (10 / 12) * Math.PI * 2 - Math.PI / 2;
      const MIN_ANGLE = (2 / 12) * Math.PI * 2 - Math.PI / 2;

      const clockTargets: { x: number; y: number }[] = [];

      /* Reset seed for stable clock targets. */
      seed = 0x5a3e9c11;
      const rnd2 = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 0xffffffff;
      };
      const pushAt = (u: number, v: number) =>
        clockTargets.push({ x: cx + u, y: cy + v });

      /* Centre pivot. */
      const CENTRE_COUNT = Math.max(20, Math.floor(wanted * 0.018));
      for (let i = 0; i < CENTRE_COUNT; i++) {
        let placed = false;
        for (let t = 0; t < 80 && !placed; t++) {
          const u = (rnd2() * 2 - 1) * CENTER_R;
          const v = (rnd2() * 2 - 1) * CENTER_R;
          if (u * u + v * v <= CENTER_R * CENTER_R) {
            pushAt(u, v);
            placed = true;
          }
        }
      }

      /* Hour hand — line of dots from centre toward 10 o'clock. */
      const HOUR_COUNT = Math.max(70, Math.floor(wanted * 0.05));
      const huX = Math.cos(HOUR_ANGLE);
      const huY = Math.sin(HOUR_ANGLE);
      const huPerpX = -huY;
      const huPerpY = huX;
      for (let i = 0; i < HOUR_COUNT; i++) {
        const t = rnd2();
        const w = (rnd2() * 2 - 1) * HOUR_HAND_W;
        const u = huX * (HOUR_HAND_LEN * t) + huPerpX * w;
        const v = huY * (HOUR_HAND_LEN * t) + huPerpY * w;
        pushAt(u, v);
      }

      /* Minute hand — longer thinner line toward 2 o'clock. */
      const MIN_COUNT = Math.max(110, Math.floor(wanted * 0.072));
      const mhX = Math.cos(MIN_ANGLE);
      const mhY = Math.sin(MIN_ANGLE);
      const mhPerpX = -mhY;
      const mhPerpY = mhX;
      for (let i = 0; i < MIN_COUNT; i++) {
        const t = rnd2();
        const w = (rnd2() * 2 - 1) * MIN_HAND_W;
        const u = mhX * (MIN_HAND_LEN * t) + mhPerpX * w;
        const v = mhY * (MIN_HAND_LEN * t) + mhPerpY * w;
        pushAt(u, v);
      }

      /* 12 hour markers — small dense clusters around the perimeter. */
      const MARKER_PER = Math.max(18, Math.floor(wanted * 0.015));
      for (let h = 0; h < 12; h++) {
        const ang = (h / 12) * Math.PI * 2 - Math.PI / 2;
        const mx = Math.cos(ang) * MARKER_RING;
        const my = Math.sin(ang) * MARKER_RING;
        for (let i = 0; i < MARKER_PER; i++) {
          let placed = false;
          for (let t = 0; t < 60 && !placed; t++) {
            const u = (rnd2() * 2 - 1) * MARKER_DOT_R;
            const v = (rnd2() * 2 - 1) * MARKER_DOT_R;
            if (u * u + v * v <= MARKER_DOT_R * MARKER_DOT_R) {
              pushAt(mx + u, my + v);
              placed = true;
            }
          }
        }
      }

      /* Face ring fills the remainder. Random angle + radius inside
         the face annulus. */
      const RING_RADIAL = FACE_OUTER - FACE_INNER;
      while (clockTargets.length < wanted) {
        const a = rnd2() * Math.PI * 2;
        const r = FACE_INNER + RING_RADIAL * rnd2();
        pushAt(Math.cos(a) * r, Math.sin(a) * r);
      }
      /* Trim any overshoot. */
      if (clockTargets.length > wanted) clockTargets.length = wanted;

      /* Replicate the existing name so the assignment block below
         keeps reading naturally. */
      const eyeTargets = clockTargets;

      const eyeOrder = eyeTargets
        .map((t, i) => ({ i, ...sortKey(t.x, t.y) }))
        .sort((a, b) => a.ang - b.ang || a.r - b.r);
      for (let k = 0; k < cellOrder.length; k++) {
        const t = eyeTargets[eyeOrder[k].i];
        const c = next[cellOrder[k].i];
        c.ex = t.x;
        c.ey = t.y;
      }

      /* ------------------------------------------------------------
         EARTH TARGETS — traced from the reference image silhouette
         (same pipeline as the brain). Image-derived dots fill the
         exact outline of the globe + visible continents. Procedural
         disc + continent ellipses are used as a fallback while the
         image is still loading.
         ------------------------------------------------------------ */
      const usingEarthMask = !!earthMask;
      let earthPxW: number;
      let earthPxH: number;
      const EARTH_BASE = BRAIN_SCALE * 1.5;
      if (usingEarthMask) {
        const ebbW = earthBboxMaxX - earthBboxMinX;
        const ebbH = earthBboxMaxY - earthBboxMinY;
        const eAspect = ebbW / Math.max(1, ebbH);
        earthPxH = EARTH_BASE;
        earthPxW = EARTH_BASE * eAspect;
        if (earthPxW > width * 0.95) {
          earthPxW = width * 0.95;
          earthPxH = earthPxW / eAspect;
        }
      } else {
        earthPxW = EARTH_BASE;
        earthPxH = EARTH_BASE;
      }

      const earthTargets: { x: number; y: number }[] = [];
      const earthAttemptCap = wanted * 120;
      let earthTries = 0;
      if (usingEarthMask) {
        while (earthTargets.length < wanted && earthTries < earthAttemptCap) {
          earthTries++;
          const u = rnd2();
          const v = rnd2();
          if (!insideEarthMask(u, v)) continue;
          const x = cx - earthPxW * 0.5 + u * earthPxW;
          const y = cy - earthPxH * 0.5 + v * earthPxH;
          earthTargets.push({ x, y });
        }
      } else {
        /* Procedural fallback — simple disc + continents (used only
           while the image is still loading). */
        const EARTH_R = EARTH_BASE * 0.5;
        const EARTH_R2 = EARTH_R * EARTH_R;
        const CONTINENTS = [
          { cx: -0.06, cy: -0.12, rx: 0.20, ry: 0.32 },
          { cx: 0.28, cy: 0.05, rx: 0.24, ry: 0.22 },
          { cx: -0.42, cy: 0.18, rx: 0.14, ry: 0.22 },
          { cx: 0.18, cy: -0.45, rx: 0.18, ry: 0.10 },
        ];
        const inContinent = (u: number, v: number) => {
          for (let i = 0; i < CONTINENTS.length; i++) {
            const c = CONTINENTS[i];
            const dx = u - c.cx * EARTH_R;
            const dy = v - c.cy * EARTH_R;
            const rxp = c.rx * EARTH_R;
            const ryp = c.ry * EARTH_R;
            if ((dx * dx) / (rxp * rxp) + (dy * dy) / (ryp * ryp) <= 1) {
              return true;
            }
          }
          return false;
        };
        const OCEAN_ACCEPT = 0.42;
        while (earthTargets.length < wanted && earthTries < earthAttemptCap) {
          earthTries++;
          const u = (rnd2() * 2 - 1) * EARTH_R;
          const v = (rnd2() * 2 - 1) * EARTH_R;
          if (u * u + v * v > EARTH_R2) continue;
          if (!inContinent(u, v)) {
            if (rnd2() > OCEAN_ACCEPT) continue;
          }
          earthTargets.push({ x: cx + u, y: cy + v });
        }
      }
      while (earthTargets.length < wanted) {
        earthTargets.push({ x: cx, y: cy });
      }
      const earthOrder = earthTargets
        .map((t, i) => ({ i, ...sortKey(t.x, t.y) }))
        .sort((a, b) => a.ang - b.ang || a.r - b.r);
      for (let k = 0; k < cellOrder.length; k++) {
        const t = earthTargets[earthOrder[k].i];
        const c = next[cellOrder[k].i];
        c.fx = t.x;
        c.fy = t.y;
      }

      /* ------------------------------------------------------------
         CLIFF TARGETS — two solid filled rectangles with irregular,
         jagged top edges and a void/gap between them. The gap reads
         as the "sim-to-real gap" the section text speaks to. Inner
         edges of the cliffs are at ±0.18w from canvas centre so the
         gap is roughly 36% of viewport wide.
         ------------------------------------------------------------ */
      const CLIFF_GAP_HALF = width * 0.18;
      const CLIFF_OUTER_PAD = width * 0.04;
      const CLIFF_TOP_BASE = height * 0.20;
      const CLIFF_BOTTOM = height * 0.86;
      const CLIFF_TOP_AMP = height * 0.06;
      const cliffTopAt = (absX: number) =>
        CLIFF_TOP_BASE +
        Math.sin(absX * 0.013) * CLIFF_TOP_AMP +
        Math.sin(absX * 0.041 + 1.3) * CLIFF_TOP_AMP * 0.55 +
        Math.sin(absX * 0.087 + 2.7) * CLIFF_TOP_AMP * 0.28;

      const leftCliffMaxX = cx - CLIFF_GAP_HALF;
      const leftCliffMinX = CLIFF_OUTER_PAD;
      const rightCliffMinX = cx + CLIFF_GAP_HALF;
      const rightCliffMaxX = width - CLIFF_OUTER_PAD;
      const leftCliffWidth = leftCliffMaxX - leftCliffMinX;
      const rightCliffWidth = rightCliffMaxX - rightCliffMinX;

      const cliffTargets: { x: number; y: number }[] = [];
      const halfCliff = Math.ceil(wanted / 2);
      const sampleCliff = (
        xLo: number,
        widthPx: number,
        count: number,
      ) => {
        let made = 0;
        let tries = 0;
        const CAP = count * 40;
        while (made < count && tries < CAP) {
          tries++;
          const x = xLo + rnd2() * widthPx;
          const top = cliffTopAt(x);
          if (top >= CLIFF_BOTTOM) continue;
          const y = top + rnd2() * (CLIFF_BOTTOM - top);
          cliffTargets.push({ x, y });
          made++;
        }
      };
      sampleCliff(leftCliffMinX, leftCliffWidth, halfCliff);
      sampleCliff(rightCliffMinX, rightCliffWidth, wanted - halfCliff);
      while (cliffTargets.length < wanted) {
        cliffTargets.push({ x: cx, y: cy });
      }

      const cliffOrder = cliffTargets
        .map((t, i) => ({ i, ...sortKey(t.x, t.y) }))
        .sort((a, b) => a.ang - b.ang || a.r - b.r);
      for (let k = 0; k < cellOrder.length; k++) {
        const t = cliffTargets[cliffOrder[k].i];
        const c = next[cellOrder[k].i];
        c.cx = t.x;
        c.cy = t.y;
      }

      cells = next;
      brainCenterX = cx;
      brainCenterY = cy;
    };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildCells();
    };
    resize();

    /* Generic image-silhouette tracer. Pipeline:
         1) downscale to 320 px wide, brightness-threshold to a raw
            dark mask;
         2) morphological closing (separable dilate → erode, R=5) so
            individual dots merge into a solid region while the outer
            outline is preserved;
         3) iterative-DFS connected-component labelling — keep only
            the largest component. Stray ink outside (e.g. dispersing
            dots in the reference art) falls away as tiny components;
         4) compute bounding box and hand the mask back to the caller.
       Box morphology is separable so this all runs in well under a
       frame at 320². */
    let disposed = false;
    const traceImage = (
      url: string,
      opts: {
        closingR?: number;
        keepLargestOnly?: boolean;
        darkBrightness?: number;
      },
      onMask: (
        mask: Uint8Array,
        sw: number,
        sh: number,
        mnX: number,
        mnY: number,
        mxX: number,
        mxY: number,
      ) => void,
    ) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (disposed) return;
        const SW = 320;
        const ratio =
          img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 1;
        const SH = Math.max(1, Math.round(SW * ratio));
        const off = document.createElement("canvas");
        off.width = SW;
        off.height = SH;
        const offCtx = off.getContext("2d", { willReadFrequently: true });
        if (!offCtx) return;
        offCtx.fillStyle = "#ffffff";
        offCtx.fillRect(0, 0, SW, SH);
        offCtx.drawImage(img, 0, 0, SW, SH);
        const data = offCtx.getImageData(0, 0, SW, SH).data;

        const DARK_BRIGHTNESS = opts.darkBrightness ?? 195;
        const N = SW * SH;
        const raw = new Uint8Array(N);
        for (let i = 0, j = 0; i < N; i++, j += 4) {
          const b = (data[j] + data[j + 1] + data[j + 2]) / 3;
          if (b < DARK_BRIGHTNESS) raw[i] = 1;
        }

        const R = opts.closingR ?? 5;
        const dilateH = (src: Uint8Array) => {
          const out = new Uint8Array(N);
          for (let y = 0; y < SH; y++) {
            const row = y * SW;
            for (let x = 0; x < SW; x++) {
              const xs = x - R < 0 ? 0 : x - R;
              const xe = x + R >= SW ? SW - 1 : x + R;
              let hit = 0;
              for (let nx = xs; nx <= xe; nx++) {
                if (src[row + nx]) {
                  hit = 1;
                  break;
                }
              }
              out[row + x] = hit;
            }
          }
          return out;
        };
        const dilateV = (src: Uint8Array) => {
          const out = new Uint8Array(N);
          for (let x = 0; x < SW; x++) {
            for (let y = 0; y < SH; y++) {
              const ys = y - R < 0 ? 0 : y - R;
              const ye = y + R >= SH ? SH - 1 : y + R;
              let hit = 0;
              for (let ny = ys; ny <= ye; ny++) {
                if (src[ny * SW + x]) {
                  hit = 1;
                  break;
                }
              }
              out[y * SW + x] = hit;
            }
          }
          return out;
        };
        const erodeH = (src: Uint8Array) => {
          const out = new Uint8Array(N);
          for (let y = 0; y < SH; y++) {
            const row = y * SW;
            for (let x = 0; x < SW; x++) {
              const xs = x - R < 0 ? 0 : x - R;
              const xe = x + R >= SW ? SW - 1 : x + R;
              let ok = 1;
              for (let nx = xs; nx <= xe; nx++) {
                if (!src[row + nx]) {
                  ok = 0;
                  break;
                }
              }
              out[row + x] = ok;
            }
          }
          return out;
        };
        const erodeV = (src: Uint8Array) => {
          const out = new Uint8Array(N);
          for (let x = 0; x < SW; x++) {
            for (let y = 0; y < SH; y++) {
              const ys = y - R < 0 ? 0 : y - R;
              const ye = y + R >= SH ? SH - 1 : y + R;
              let ok = 1;
              for (let ny = ys; ny <= ye; ny++) {
                if (!src[ny * SW + x]) {
                  ok = 0;
                  break;
                }
              }
              out[y * SW + x] = ok;
            }
          }
          return out;
        };
        const closed = R > 0 ? erodeV(erodeH(dilateV(dilateH(raw)))) : raw;

        const keepLargest = opts.keepLargestOnly ?? true;
        let finalMask: Uint8Array;
        if (keepLargest) {
          /* Connected-component labelling — keep only the largest
             component. Filters scattered ink (e.g. dispersing dots in
             the brain reference) into separate tiny components that
             get discarded. */
          const labels = new Int32Array(N);
          let nextLabel = 0;
          let bestLabel = 0;
          let bestSize = 0;
          const stack: number[] = [];
          for (let seed = 0; seed < N; seed++) {
            if (!closed[seed] || labels[seed]) continue;
            nextLabel++;
            let size = 0;
            stack.push(seed);
            while (stack.length > 0) {
              const p = stack.pop() as number;
              if (labels[p]) continue;
              labels[p] = nextLabel;
              size++;
              const px = p % SW;
              const py = (p - px) / SW;
              if (px > 0 && closed[p - 1] && !labels[p - 1]) stack.push(p - 1);
              if (px < SW - 1 && closed[p + 1] && !labels[p + 1])
                stack.push(p + 1);
              if (py > 0 && closed[p - SW] && !labels[p - SW])
                stack.push(p - SW);
              if (py < SH - 1 && closed[p + SW] && !labels[p + SW])
                stack.push(p + SW);
            }
            if (size > bestSize) {
              bestSize = size;
              bestLabel = nextLabel;
            }
          }
          if (bestLabel === 0) return;
          finalMask = new Uint8Array(N);
          for (let i = 0; i < N; i++) {
            if (labels[i] === bestLabel) finalMask[i] = 1;
          }
        } else {
          /* No CC — keep every ink pixel (the whole vector art). */
          finalMask = closed;
        }

        let mnX = SW;
        let mnY = SH;
        let mxX = -1;
        let mxY = -1;
        for (let i = 0; i < N; i++) {
          if (finalMask[i]) {
            const px = i % SW;
            const py = (i - px) / SW;
            if (px < mnX) mnX = px;
            if (px > mxX) mxX = px;
            if (py < mnY) mnY = py;
            if (py > mxY) mxY = py;
          }
        }
        if (mxX < mnX) return;

        onMask(finalMask, SW, SH, mnX, mnY, mxX + 1, mxY + 1);
      };
      img.onerror = () => {
        /* Fail silently — procedural fallback stays. */
      };
      img.src = url;
    };

    /* Brain: halftone art with dispersing dots — needs closing (to
       merge halftone dots into a solid mass) AND CC (to drop the
       stray dispersing dots). */
    traceImage(
      "/brain-reference-2.png",
      { closingR: 5, keepLargestOnly: true, darkBrightness: 195 },
      (mask, sw, sh, mnX, mnY, mxX, mxY) => {
        brainMask = mask;
        brainMaskW = sw;
        brainMaskH = sh;
        bboxMinX = mnX;
        bboxMinY = mnY;
        bboxMaxX = mxX;
        bboxMaxY = mxY;
        buildCells();
      },
    );
    /* Earth: clean black-on-white vector art. NO closing (else the
       ocean space between outline ring + continents would fill in
       and erase all interior detail). NO CC filter (keep every dark
       pixel, including any continents that don't touch the ring). */
    traceImage(
      "/earth-vector.jpg",
      { closingR: 0, keepLargestOnly: false, darkBrightness: 150 },
      (mask, sw, sh, mnX, mnY, mxX, mxY) => {
        earthMask = mask;
        earthMaskW = sw;
        earthMaskH = sh;
        earthBboxMinX = mnX;
        earthBboxMinY = mnY;
        earthBboxMaxX = mxX;
        earthBboxMaxY = mxY;
        buildCells();
      },
    );

    const onMove = (e: PointerEvent) => {
      /* Use HOST's rect — the canvas may be CSS-transformed for the
         card tilt, which would shift `canvas.getBoundingClientRect`
         and silently break cursor coords. The host stays untransformed. */
      const rect = host.getBoundingClientRect();
      cursor.x = e.clientX - rect.left;
      cursor.y = e.clientY - rect.top;
      if (!cursor.has) {
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

      const morph = morphProgress
        ? Math.max(0, Math.min(1, morphProgress.get()))
        : 0;
      const invert = invertProgress
        ? Math.max(0, Math.min(1, invertProgress.get()))
        : 0;
      const eyeMorph = eyeMorphProgress
        ? Math.max(0, Math.min(1, eyeMorphProgress.get()))
        : 0;
      const eyeOffset = eyeOffsetProgress
        ? Math.max(0, Math.min(1, eyeOffsetProgress.get()))
        : 0;
      const earthMorph = earthMorphProgress
        ? Math.max(0, Math.min(1, earthMorphProgress.get()))
        : 0;
      const earthOffset = earthOffsetProgress
        ? Math.max(0, Math.min(1, earthOffsetProgress.get()))
        : 0;
      const cliffMorph = cliffMorphProgress
        ? Math.max(0, Math.min(1, cliffMorphProgress.get()))
        : 0;
      const cliffPhase = cliffPhaseProgress
        ? Math.max(0, Math.min(1, cliffPhaseProgress.get()))
        : 0;
      /* Cursor interaction belongs to the open grid. As the field morphs
         into the brain we fade it, so the brain doesn't ripple under the
         pointer. */
      const cursorAttenuation = 1 - morph;

      let rawSpeed = 0;
      if (cursor.has) {
        const dxc = cursor.x - prev.x;
        const dyc = cursor.y - prev.y;
        rawSpeed = Math.sqrt(dxc * dxc + dyc * dyc);
        prev.x = cursor.x;
        prev.y = cursor.y;
      }
      smoothSpeed = smoothSpeed * SPEED_SMOOTH + rawSpeed * (1 - SPEED_SMOOTH);
      if (smoothSpeed < SPEED_FLOOR) smoothSpeed = 0;

      const peakAmp =
        Math.min(1, smoothSpeed / VELOCITY_MAX) * cursorAttenuation;

      if (
        cursor.has &&
        cursorAttenuation > 0.05 &&
        peakAmp > EMIT_MIN_AMP &&
        frame - lastEmit >= EMIT_INTERVAL_FRAMES
      ) {
        waves.push({
          x: cursor.x,
          y: cursor.y,
          t: 0,
          amp: peakAmp * WAVE_AMP_SCALE,
        });
        lastEmit = frame;
        while (waves.length > MAX_WAVES) waves.shift();
      }

      for (let i = waves.length - 1; i >= 0; i--) {
        waves[i].t += 1;
        if (waves[i].t > WAVE_LIFE) waves.splice(i, 1);
      }

      /* Velocity-trail clearing: while the field is actively
         changing (brain → clock or color invert in progress), use a
         destination-out partial fade so each dot's previous frame
         lingers and decays — that's the trail behind the moving
         dot. Once the field settles, fully clear so static dots
         don't accumulate halos. */
      /* Trails ONLY engage for the brain → clock → earth → cliff
         transitions. grid → brain is excluded intentionally — dots
         flying in from every corner would leave huge crisscrossing
         streaks. We still track `morph`'s prev for parity but it
         doesn't feed the trail-decision delta. */
      const morphDelta =
        Math.abs(eyeMorph - prevEyeMorph) +
        Math.abs(eyeOffset - prevEyeOffset) +
        Math.abs(earthMorph - prevEarthMorph) +
        Math.abs(earthOffset - prevEarthOffset) +
        Math.abs(cliffMorph - prevCliffMorph) +
        Math.abs(cliffPhase - prevCliffPhase);
      const transitioning = morphDelta > 0.0008;
      if (transitioning) {
        /* Lower FADE → each frame erases LESS of the previous frame,
           so trails persist many more frames before they're gone.
           0.06 lets a trail last roughly 60+ frames (~1 s) at full
           visibility before fading. */
        const FADE = 0.06;
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = `rgba(0, 0, 0, ${FADE})`;
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = "source-over";
      } else {
        ctx.clearRect(0, 0, width, height);
      }
      prevMorph = morph;
      prevEyeMorph = eyeMorph;
      prevEyeOffset = eyeOffset;
      prevEarthMorph = earthMorph;
      prevEarthOffset = earthOffset;
      prevCliffMorph = cliffMorph;
      prevCliffPhase = cliffPhase;

      const peakActive = peakAmp > 0.01 && cursor.has;
      const px = cursor.x;
      const py = cursor.y;
      const waveCount = waves.length;
      const hasAnyMotion =
        (peakActive || waveCount > 0) && cursorAttenuation > 0.02;

      /* Base color lerped between dark (initial) and cream (inverted). */
      const baseR = BASE_DARK.r * (1 - invert) + BASE_CREAM.r * invert;
      const baseG = BASE_DARK.g * (1 - invert) + BASE_CREAM.g * invert;
      const baseB = BASE_DARK.b * (1 - invert) + BASE_CREAM.b * invert;
      const baseAlpha = BASE_ALPHA * (1 - invert) + INVERT_ALPHA * invert;
      const baseFill = `rgba(${baseR | 0}, ${baseG | 0}, ${baseB | 0}, ${baseAlpha})`;

      /* Card-style 3D tilt: the canvas surface tilts toward the
         cursor via CSS perspective + rotateX/Y, scaled by morph so
         the effect only kicks in once the brain has formed. The
         dots themselves stay flat — we tilt the surface they're
         drawn on. Cursor position relative to the brain's centre
         drives the tilt direction. */
      const TILT_MAX_DEG = 22;
      let targetTiltX = 0;
      let targetTiltY = 0;
      if (cursor.has && width > 0 && height > 0) {
        const nx = (cursor.x - brainCenterX) / width;
        const ny = (cursor.y - brainCenterY) / height;
        /* Sign chosen so the side of the canvas closest to the
           cursor tilts FORWARD (toward the viewer). */
        targetTiltX = -ny * 2 * TILT_MAX_DEG;
        targetTiltY = nx * 2 * TILT_MAX_DEG;
      }
      smoothTiltX += (targetTiltX - smoothTiltX) * 0.08;
      smoothTiltY += (targetTiltY - smoothTiltY) * 0.08;
      /* Cursor tilt is active for the brain, clock, and earth
         poses — each tracks the cursor with a card-like swivel.
         Only the cliffs pose disables it (two separate cliff
         shapes shouldn't tilt as one unit). */
      const tiltFade = morph * (1 - cliffPhase);
      const effTiltX = smoothTiltX * tiltFade;
      const effTiltY = smoothTiltY * tiltFade;

      /* Canvas scale + translate. Eye phase pushes RIGHT, earth
         phase pushes LEFT, cliff phase lerps everything back to
         centred + full scale so the gap between the cliffs lines
         up with the viewport centre. */
      const baseScale = 1 - 0.42 * Math.max(eyeOffset, earthOffset);
      const eyeScale = baseScale + (1 - baseScale) * cliffPhase;
      const baseTranslateX =
        width * 0.22 * eyeOffset - width * 0.44 * earthOffset;
      const eyeTranslateX = baseTranslateX * (1 - cliffPhase);
      /* Order matters: translate + scale FIRST so the canvas's
         centre lands at the shape's screen position, then rotate
         around that point. With the previous order (rotate before
         translate), the rotation pivot stayed at the canvas centre
         and the clock/earth swung in an arc instead of swiveling
         in place. */
      canvas.style.transform = `perspective(1200px) translateX(${eyeTranslateX.toFixed(1)}px) scale(${eyeScale.toFixed(3)}) rotateX(${effTiltX.toFixed(2)}deg) rotateY(${effTiltY.toFixed(2)}deg)`;

      const textAlpha = 1 - invert;
      const drawBox = textAlpha > 0;
      // Make the box large enough to encase the eyebrow, title, and subtitle
      const boxW = Math.min(width * 0.92, 1060);
      const boxH = Math.min(height * 0.85, 580);
      // The text is centered in the viewport, not at the brain's offset center
      const canvasCenterX = width * 0.5;
      const canvasCenterY = height * 0.5;
      const boxMinX = canvasCenterX - boxW / 2;
      const boxMaxX = canvasCenterX + boxW / 2;
      const boxMinY = canvasCenterY - boxH / 2;
      const boxMaxY = canvasCenterY + boxH / 2;

      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        /* Four-stage morph: grid → brain → clock → earth → cliffs.
           Each stage lerps from the previous result to its target
           so partial morphs always travel along the path between
           adjacent targets. */
        const s1X = cell.gx + (cell.bx - cell.gx) * morph;
        const s1Y = cell.gy + (cell.by - cell.gy) * morph;
        const s2X = s1X + (cell.ex - s1X) * eyeMorph;
        const s2Y = s1Y + (cell.ey - s1Y) * eyeMorph;
        const s3X = s2X + (cell.fx - s2X) * earthMorph;
        const s3Y = s2Y + (cell.fy - s2Y) * earthMorph;
        const baseX = s3X + (cell.cx - s3X) * cliffMorph;
        const baseY = s3Y + (cell.cy - s3Y) * cliffMorph;

        if (drawBox) {
          const padW = boxW / 2 + 16;
          const padH = boxH / 2 + 16;
          if (Math.abs(baseX - canvasCenterX) < padW && Math.abs(baseY - canvasCenterY) < padH) {
            continue;
          }
        }

        let elev = 0;
        if (peakActive) {
          const dx = baseX - px;
          const dy = baseY - py;
          elev += peakAmp * Math.exp(-(dx * dx + dy * dy) / TWO_SIGMA_SQ);
        }
        for (let j = 0; j < waveCount; j++) {
          const w = waves[j];
          const wdx = baseX - w.x;
          const wdy = baseY - w.y;
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
        elev *= cursorAttenuation;

        if (!hasAnyMotion || elev < 0.012) {
          ctx.fillStyle = baseFill;
          ctx.beginPath();
          ctx.arc(baseX, baseY, BASE_SIZE, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }

        const elevClamped = Math.min(elev, 1.2);
        const lift = elevClamped * LIFT_PX;
        const size = BASE_SIZE + Math.min(elevClamped, 1) * PEAK_SIZE;

        const m = width > 0 ? baseX / width : 0.5;
        const gr = PURPLE.r * (1 - m) + GREEN.r * m;
        const gg = PURPLE.g * (1 - m) + GREEN.g * m;
        const gb = PURPLE.b * (1 - m) + GREEN.b * m;
        const blend = Math.min(1, elevClamped * 1.4);
        const cr = baseR * (1 - blend) + gr * blend;
        const cg = baseG * (1 - blend) + gg * blend;
        const cb = baseB * (1 - blend) + gb * blend;
        const alpha =
          baseAlpha + Math.min(elevClamped, 1) * 0.55 * cursorAttenuation;

        ctx.fillStyle = `rgba(${cr | 0}, ${cg | 0}, ${cb | 0}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(baseX, baseY - lift, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw the glowing text bounding box outline using small line segments so the
      // color blending matches the hover logic, but intentionally omits the waves
      // so the line stays perfectly still.
      if (drawBox) {
        ctx.lineWidth = 1;
        const drawSeg = (x: number, y: number) => {
          let elev = 0;
          if (peakActive) {
            const dx = x - px;
            const dy = y - py;
            elev += peakAmp * Math.exp(-(dx * dx + dy * dy) / TWO_SIGMA_SQ);
          }
          // Exclude waves calculation so the border does not move with the wave!
          elev *= cursorAttenuation;
          
          const elevClamped = Math.min(elev, 1.2);
          const m = width > 0 ? x / width : 0.5;
          const gr = PURPLE.r * (1 - m) + GREEN.r * m;
          const gg = PURPLE.g * (1 - m) + GREEN.g * m;
          const gb = PURPLE.b * (1 - m) + GREEN.b * m;
          const blend = Math.min(1, elevClamped * 1.4);
          const cr = baseR * (1 - blend) + gr * blend;
          const cg = baseG * (1 - blend) + gg * blend;
          const cb = baseB * (1 - blend) + gb * blend;
          const alpha = (baseAlpha + Math.min(elevClamped, 1) * 0.55 * cursorAttenuation) * textAlpha;
          return `rgba(${cr | 0}, ${cg | 0}, ${cb | 0}, ${alpha})`;
        };

        const STEP = 10;
        const strokeLine = (x1: number, y1: number, x2: number, y2: number) => {
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          const steps = Math.ceil(len / STEP);
          for (let i = 0; i < steps; i++) {
            const t1 = i / steps;
            const t2 = (i + 1) / steps;
            const sx = x1 + dx * t1;
            const sy = y1 + dy * t1;
            const ex = x1 + dx * t2;
            const ey = y1 + dy * t2;
            
            ctx.strokeStyle = drawSeg((sx + ex) / 2, (sy + ey) / 2);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
          }
        };
        
        strokeLine(boxMinX, boxMinY, boxMaxX, boxMinY);
        strokeLine(boxMaxX, boxMinY, boxMaxX, boxMaxY);
        strokeLine(boxMaxX, boxMaxY, boxMinX, boxMaxY);
        strokeLine(boxMinX, boxMaxY, boxMinX, boxMinY);
      }

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      ro.disconnect();
    };
  }, [
    morphProgress,
    invertProgress,
    eyeMorphProgress,
    eyeOffsetProgress,
    earthMorphProgress,
    earthOffsetProgress,
    cliffMorphProgress,
    cliffPhaseProgress,
  ]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1]"
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        transformOrigin: "center center",
        willChange: "transform",
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

  /* Char animation: purple → white. The page background has inverted
     to dark by the time slide 2 reveals, so white reads cleanest. */
  const color = useTransform(head, (h) => {
    const local = h - index;
    if (local <= 2.5) return "rgba(109, 40, 217, 1)";
    if (local >= 6.5) return "rgba(255, 255, 255, 0.96)";
    const t = (local - 2.5) / 4;
    const r = Math.round(109 + (255 - 109) * t);
    const g = Math.round(40 + (255 - 40) * t);
    const b = Math.round(217 + (255 - 217) * t);
    return `rgba(${r}, ${g}, ${b}, 0.96)`;
  });

  return <motion.span style={{ opacity, color }}>{char}</motion.span>;
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
   FLUID SECTION — declarative statement section. Asymmetric two-column:
   massive left-aligned headline, body text as a quiet column on the right.
   ========================================================================== */
function FluidSection() {
  return (
    <section className="relative overflow-hidden" style={{ color: "#0f0e0d" }}>
      <PaperBackground />
      <div className="relative mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-36">
        {/* Section header bar */}
        <div
          style={{
            borderTop: "1px solid rgba(15,14,13,0.10)",
            paddingTop: "2rem",
            marginBottom: "4.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            className="font-mono text-[10px] uppercase tracking-[0.28em]"
            style={{ color: "rgba(15,14,13,0.38)" }}
          >
            the layer
          </span>
          <span
            className="font-mono text-[10px] uppercase tracking-[0.28em]"
            style={{ color: "rgba(15,14,13,0.20)" }}
          >
            §&nbsp;02
          </span>
        </div>

        {/* Two-column layout: headline + body */}
        <div className="grid grid-cols-1 items-start gap-14 md:grid-cols-[1fr_0.6fr] md:gap-20">
          <motion.h2
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontWeight: 600,
              fontSize: "clamp(3.2rem, 7vw, 7rem)",
              lineHeight: 0.91,
              letterSpacing: "-0.035em",
              color: "#0f0e0d",
            }}
          >
            We built<br />
            <span style={{ color: "rgba(15,14,13,0.20)" }}>the layer</span><br />
            everyone<br />
            missed.
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.85, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            style={{ paddingTop: "clamp(0rem, 1.5vw, 2rem)" }}
          >
            <p
              style={{
                fontSize: "clamp(0.975rem, 1.3vw, 1.2rem)",
                lineHeight: 1.65,
                color: "rgba(15,14,13,0.60)",
                fontWeight: 400,
              }}
            >
              We are a deep-tech company building the data infrastructure
              that lets robots learn contact-rich manipulation from human
              operators. Building toward the first deployable robot cells
              that can be retrained by your own factory workers, on
              whatever robot brand you already trust.
            </p>
          </motion.div>
        </div>
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

function PipelineArrow({ index }: { index: number }) {
  // One dot travels across all 4 arrows in sequence, 1→2→3→4→5, then repeats.
  const N = 4;
  const SLOT = 1.1;              // seconds per arrow slot
  const TRAVEL = 0.65;           // actual travel time
  const FADE = 0.12;             // fade-out time at end
  const TOTAL = N * SLOT;        // 4.4s full cycle

  return (
    <div className="flex shrink-0 items-center justify-center py-1 md:py-0">
      <svg
        viewBox="0 0 64 24"
        className="h-7 w-16 rotate-90 md:h-8 md:w-20 md:rotate-0"
      >
        <motion.circle
          r="2.6"
          cy="12"
          fill="#0f0e0d"
          initial={{ cx: 4, opacity: 0 }}
          animate={{
            cx:      [4,   48,  48, 4],
            opacity: [1,    1,   0, 0],
          }}
          transition={{
            duration: TRAVEL + FADE,
            times: [0, TRAVEL / (TRAVEL + FADE), 0.97, 1],
            delay: index * SLOT,
            repeat: Infinity,
            repeatDelay: TOTAL - TRAVEL - FADE,
            ease: "easeInOut",
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
          stroke="rgba(15, 14, 13, 0.60)"
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
    <section className="relative overflow-hidden" style={{ color: "#0f0e0d" }}>
      <PaperBackground />
      <div className="relative mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-36">

        {/* Section header bar */}
        <div
          style={{
            borderTop: "1px solid rgba(15,14,13,0.10)",
            paddingTop: "2rem",
            marginBottom: "4.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            className="font-mono text-[10px] uppercase tracking-[0.28em]"
            style={{ color: "rgba(15,14,13,0.38)" }}
          >
            the pipeline
          </span>
          <span
            className="font-mono text-[10px] uppercase tracking-[0.28em]"
            style={{ color: "rgba(15,14,13,0.20)" }}
          >
            01&nbsp;—&nbsp;05
          </span>
        </div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontWeight: 600,
            fontSize: "clamp(2.2rem, 4.8vw, 4.5rem)",
            lineHeight: 1.0,
            letterSpacing: "-0.028em",
            color: "#0f0e0d",
            maxWidth: "20ch",
            marginBottom: "5rem",
          }}
        >
          Five steps from human demonstration to deployed robot.
        </motion.h2>

        {/* Steps — open numbered ledger */}
        <div>
          {PIPELINE_STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.65,
                delay: i * 0.07,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                display: "grid",
                gridTemplateColumns: "clamp(3rem, 5.5vw, 5.5rem) 1fr",
                gap: "clamp(1rem, 2.5vw, 3rem)",
                padding: "2.5rem 0",
                borderTop: "1px solid rgba(15,14,13,0.08)",
                alignItems: "start",
              }}
            >
              {/* Ghost step number */}
              <span
                aria-hidden
                style={{
                  fontWeight: 700,
                  fontSize: "clamp(2.2rem, 4vw, 4rem)",
                  lineHeight: 1,
                  color: "rgba(15,14,13,0.09)",
                  letterSpacing: "-0.04em",
                  fontVariantNumeric: "tabular-nums",
                  paddingTop: "0.15rem",
                  userSelect: "none",
                }}
              >
                {s.n}
              </span>

              {/* Content */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    marginBottom: "0.6rem",
                  }}
                >
                  <span
                    className="font-mono text-[9px] uppercase tracking-[0.26em]"
                    style={{ color: "rgba(15,14,13,0.33)" }}
                  >
                    {s.sub}
                  </span>
                  <span
                    aria-hidden
                    style={{
                      display: "inline-block",
                      width: "3px",
                      height: "3px",
                      borderRadius: "50%",
                      background: "rgba(15,14,13,0.22)",
                    }}
                  />
                  <span
                    className="font-mono text-[9px] uppercase tracking-[0.26em]"
                    style={{ color: "rgba(15,14,13,0.20)" }}
                  >
                    active
                  </span>
                </div>
                <h3
                  style={{
                    fontWeight: 600,
                    fontSize: "clamp(0.875rem, 1.2vw, 1.1rem)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#0f0e0d",
                    marginBottom: "0.5rem",
                  }}
                >
                  {s.title}
                </h3>
                <p
                  style={{
                    fontSize: "0.875rem",
                    lineHeight: 1.7,
                    color: "rgba(15,14,13,0.55)",
                  }}
                >
                  {s.body}
                </p>
              </div>
            </motion.div>
          ))}

          {/* Close rule after last step */}
          <div style={{ borderTop: "1px solid rgba(15,14,13,0.08)" }} />
        </div>

        {/* Payoff paragraph */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.9, delay: 0.15, ease: "easeOut" }}
          style={{
            marginTop: "4rem",
            maxWidth: "58ch",
            fontSize: "clamp(0.9375rem, 1.2vw, 1.1rem)",
            lineHeight: 1.7,
            color: "rgba(15,14,13,0.58)",
            fontWeight: 400,
          }}
        >
          The capture step turns biology into data. The processing step
          turns data into training samples. The augmentation step
          multiplies samples through physics simulation. The training
          step turns samples into policy. The deployment step runs
          policy in production while feeding new data back to the start.{" "}
          <span style={{ color: "#0f0e0d", fontWeight: 600 }}>
            Robots inherit human force intuition. By us.
          </span>
        </motion.p>

        {/* Footer metadata */}
        <div
          style={{
            marginTop: "4rem",
            paddingTop: "2rem",
            borderTop: "1px solid rgba(15,14,13,0.08)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem 1.5rem",
          }}
        >
          <span
            className="font-mono text-[9px] uppercase tracking-[0.22em]"
            style={{ color: "rgba(15,14,13,0.30)" }}
          >
            //&nbsp;the body knew before contact ever happened
          </span>
          <div
            className="flex flex-wrap items-center gap-x-6 gap-y-1"
            style={{ color: "rgba(15,14,13,0.30)" }}
          >
            {[
              ["system", "novonus™"],
              ["stages", "05"],
              ["status", "operational"],
            ].map(([k, v]) => (
              <span key={k} className="font-mono text-[9px] uppercase tracking-[0.22em]">
                <span style={{ color: "rgba(15,14,13,0.22)" }}>{k}:</span>
                &nbsp;{v}
              </span>
            ))}
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

/* ============================================================================
   HERO WORD — each hero text token (word, bracket, or punctuated word)
   is its own inline-block that, on scroll, slides a fraction of an em
   to the right and fades out. The literal space between tokens stays
   put, so visually each word disappears into the space adjacent to it
   ("the invisible barrier"). Per-token start/end windows give a left-
   to-right cascade rather than a synchronized block move.
   ========================================================================== */
function HeroWord({
  scrollProgress,
  start,
  end,
  children,
  color,
}: {
  scrollProgress: MotionValue<number>;
  start: number;
  end: number;
  children: ReactNode;
  color?: string;
}) {
  const opacity = useTransform(scrollProgress, [start, end], [1, 0]);
  const x = useTransform(scrollProgress, [start, end], ["0em", "0.45em"]);
  return (
    <motion.span
      style={{
        display: "inline-block",
        opacity,
        x,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </motion.span>
  );
}

/* Build N staggered scroll windows of width `perWord` between `start`
   and `end` so the cascade fits inside the disappear scroll range. */
function staggerWindows(
  n: number,
  start: number,
  end: number,
  perWord: number,
) {
  const spread = Math.max(0, end - start - perWord);
  const step = n <= 1 ? 0 : spread / (n - 1);
  return Array.from({ length: n }, (_, i) => ({
    start: start + i * step,
    end: start + i * step + perWord,
  }));
}

/* Subtitle token arrays — also used by the overlay wipes so the
   overlay text wraps at the EXACT same points as the base token
   spans. Without this, hyphenated words like "latency-corrupted"
   wrap differently in the overlays (plain text breaks at the
   hyphen) vs the base text (each token is whitespace:nowrap so it
   never breaks). That mismatch made the green/purple overlay text
   sit on different lines than the white base, misaligning the
   colored wipe. */
const MODERN_TELEOP_SUBTITLE_TOKENS = [
  "It's", "reactive", "by", "nature.",
  "It", "takes", "weeks", "to", "collect,",
  "gets", "latency-corrupted", "at", "capture,",
  "and", "only", "captures", "kinematics,",
  "never", "force.", "Built", "for", "trajectory",
  "replay,", "not", "contact-rich", "manipulation,",
  "the", "signal", "that", "decides", "whether",
  "fragile", "parts", "survive", "was", "never",
  "in", "the", "data.",
] as const;

const ERODING_SUBTITLE_TOKENS = [
  "79%", "of", "US", "manufacturers", "cite", "skilled",
  "labor", "as", "their", "top", "constraint,", "with",
  "50", "million", "manufacturing", "jobs", "projected",
  "unfilled", "by", "2030.", "Modern", "assembly", "demands",
  "more", "precision", "than", "ever,", "but", "training",
  "takes", "6-12", "months", "and", "fewer", "workers",
  "are", "entering", "the", "trade.",
] as const;

const HERO_TITLE_TOKENS = [
  "Training", "Robots", "using", "Brain-Muscle", "signals",
] as const;

const HERO_SUBTITLE_TOKENS = [
  "We", "capture", "muscle", "signals", "from", "human",
  "operators", "during", "demonstration,", "close", "the",
  "sim-to-real", "gap", "on", "contact", "dynamics,", "and",
  "produce", "industrial", "robots", "that", "inherit",
  "human", "force", "intuition", "for", "contact-rich",
  "assembly", "tasks", "vision-only", "and",
  "teleoperation-based", "systems", "cannot", "solve.",
] as const;

const MODERN_TELEOP_TITLE_TOKENS = [
  "Current", "Teleoperation", "systems", "are", "outdated",
] as const;

const ERODING_TITLE_TOKENS = [
  "The", "skilled", "labor", "base", "is", "eroding",
] as const;

const GAP_TITLE_TOKENS = [
  "The", "sim-to-real", "gap", "is", "still", "wide",
] as const;

const GAP_SUBTITLE_TOKENS = [
  "Visual", "and", "kinematic", "accuracy", "have", "been",
  "advancing,", "but", "contact", "dynamics", "remain",
  "unsolved.", "No", "simulator", "can", "model", "the",
  "friction,", "deformation,", "and", "multi-point",
  "interactions", "that", "determine", "whether", "industrial",
  "assembly", "automation", "succeeds.",
] as const;

/* Shared initial/final states for the text-block entrance animations.
   When `skipIntroAnim` is true (page loaded with browser-restored
   scroll past the top), every text wrapper picks the FINAL value as
   its initial — so framer-motion mounts already settled and no
   entrance animation can ever fire on mount. */
const TEXT_INITIAL = { y: "120%", opacity: 0 };
const TEXT_FINAL = { y: "0%", opacity: 1 };
const MASK_OPAQUE = {
  maskImage: "linear-gradient(45deg, transparent -100%, #000 0%)",
  WebkitMaskImage: "linear-gradient(45deg, transparent -100%, #000 0%)",
};
const MASK_WIPED = {
  maskImage: "linear-gradient(45deg, transparent 100%, #000 200%)",
  WebkitMaskImage: "linear-gradient(45deg, transparent 100%, #000 200%)",
};

/* Render a token array as inline-block + nowrap spans, joined by
   regular spaces. Matches HeroWord's flow behavior exactly so the
   overlay text wraps to the same lines as the base.

   Optional `accent` predicate marks tokens that should render at
   fontWeight 500 — used by the hero subtitle whose base text bolds
   the trailing "teleoperation-based systems cannot solve." phrase.
   Without matching weights, those tokens render slightly narrower
   in the overlay and break onto different lines than the base. */
function renderTokenOverlay(
  tokens: readonly string[],
  options?: { accent?: (i: number) => boolean },
) {
  const isAccent = options?.accent ?? (() => false);
  return tokens.map((tok, i) => (
    <Fragment key={i}>
      <span
        style={{
          display: "inline-block",
          whiteSpace: "nowrap",
          fontWeight: isAccent(i) ? 500 : undefined,
        }}
      >
        {tok}
      </span>
      {i < tokens.length - 1 ? " " : ""}
    </Fragment>
  ));
}

function Hero() {
  const { phase, skipIntroAnim } = useIntro();
  /* Heading reveal is gated on `done` — the dark page sits empty while
     the logo finishes docking, then the text smoothly fades in. */
  const textReady = phase === "done";
  const sectionRef = useRef<HTMLElement | null>(null);
  /* `pinRef` spans the first 880svh of the (now 950svh) section as an
     invisible measurement marker. The existing scrollYProgress is bound
     to pinRef so all original animation thresholds (HeroWord windows,
     morph progresses, etc.) keep firing over the same absolute scroll
     range they always did — the extra 70svh tacked onto the section
     is reserved for the exit transition only. */
  const pinRef = useRef<HTMLDivElement | null>(null);

  /* Scroll-pin: section is 200svh tall with a sticky 100svh viewport inside.
     Progress goes 0 → 1 over the 100svh of pinned scrolling. */
  const { scrollYProgress } = useScroll({
    target: pinRef,
    offset: ["start start", "end end"],
  });
  /* `deepDive` gates the long cliff-scene timeline (Current Teleop →
     Skilled labor → Sim-to-real gap, with all the morphs). */
  const [deepDive, setDeepDive] = useState(false);

  /* Abrupt cut to Current Teleop when Learn More is clicked. NOT a
     smooth scroll — the user should feel like the page snaps to a
     different room. scrollYProgress 0.51 (≈4.0 viewports into the
     section) lands just after visionReady triggers, so the Current
     Teleop title is on screen the instant the new mode commits. */
  const handleLearnMore = () => {
    setDeepDive(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const sec = sectionRef.current;
        if (!sec) return;
        const rect = sec.getBoundingClientRect();
        const sectionTop = rect.top + window.scrollY;
        const targetY = sectionTop + window.innerHeight * 4.0;
        window.scrollTo({ top: targetY, behavior: "instant" as ScrollBehavior });
      });
    });
  };

  /* Exit handler for the "Back to main page" button. Always lands the
     user on the short-path "three problems together" view — the
     moment in short mode where the brain holds and Current Teleop /
     Skilled labor / Sim-to-real titles are all on screen at once.
     That maps to ~scrollYProgress 0.70 of the 370svh short-mode
     pinRef → ≈189svh past sectionTop → 1.9 viewports. */
  const handleBackToMain = () => {
    setDeepDive(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const sec = sectionRef.current;
        if (!sec) return;
        const rect = sec.getBoundingClientRect();
        const sectionTop = rect.top + window.scrollY;
        const targetY = sectionTop + window.innerHeight * 1.9;
        window.scrollTo({ top: targetY, behavior: "instant" as ScrollBehavior });
      });
    });
  };

  /* Scroll trap for deep-dive mode. Once committed, the user is locked
     between the start of Current Teleop (scrollYProgress 0.50 of the
     880svh pinRef ≈ 3.9 viewports past sectionTop) and the end of the
     cliff sequence at Sim-to-real Gap (scrollYProgress 1.0 ≈ 7.8
     viewports past sectionTop). Cannot scroll up past Current Teleop
     (no return to the modern-robotics text). Cannot scroll down past
     Sim-to-real Gap (no entry to Novonus / Manifesto). The learn-more
     room is self-contained. */
  useEffect(() => {
    if (!deepDive) return;
    const sec = sectionRef.current;
    if (!sec) return;

    let startY = 0;
    let endY = 0;
    const updateBounds = () => {
      const sectionTop = sec.getBoundingClientRect().top + window.scrollY;
      startY = sectionTop + window.innerHeight * 3.9;
      endY = sectionTop + window.innerHeight * 7.8;
    };
    updateBounds();

    const clamp = () => {
      const y = window.scrollY;
      if (y < startY - 1) {
        window.scrollTo({ top: startY, behavior: "instant" as ScrollBehavior });
      } else if (y > endY + 1) {
        window.scrollTo({ top: endY, behavior: "instant" as ScrollBehavior });
      }
    };
    const onResize = () => {
      updateBounds();
      clamp();
    };

    window.addEventListener("scroll", clamp, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", clamp);
      window.removeEventListener("resize", onResize);
    };
  }, [deepDive]);

  /* Scroll-driven phases on the pinned section, sequenced cleanly:
         v=0.03 → 0.10  hero heading words cascade-disappear into
                        the invisible barriers beside them.
         v=0.10 → 0.15  hero bg flips cream → dark, dots flip dark
                        → cream (the screen turns dark BEFORE the
                        brain forms).
         v=0.15 → 0.27  every dot lerps from its grid cell into the
                        brain-silhouette target on the dark bg.
         v=0.27 → 0.48  slide 2 sentence reveals char-by-char,
                        starting the moment the brain is done.
         v=0.48 → 0.55  hold the fully-revealed sentence.
         v=0.55 → 0.62  slide 2 sentence reverses out (the same
                        wipe animation played backwards).
         v=0.60 → 0.78  brain morphs into a dot-art CLOCK while
                        simultaneously scaling down and translating
                        to the right edge of the viewport.
         v=0.78 → 0.90  "Current Teleoperation systems are outdated"
                        text + subtitle reveal on the LEFT with the
                        same purple-wipe pattern as the title.
         v=0.50 → 0.58  "Current Teleoperation systems are outdated"
                        reveal on the LEFT.
         v=0.58 → 0.64  hold the modern-teleop block.
         v=0.64 → 0.69  modern-teleop block reverses out (same
                        wipe pattern, reversed).
         v=0.67 → 0.82  clock morphs into EARTH and the canvas
                        sweeps from the right edge over to the
                        LEFT edge — velocity trails throughout.
         v=0.82 → 0.90  "The skilled labor base is eroding" +
                        subtitle reveal on the RIGHT.
         v>0.90         hold the final state. */
  const HERO_DISAPPEAR_START = 0.02;
  const HERO_DISAPPEAR_END = 0.07;
  const HERO_WORD_DURATION = 0.04;
  const invertProgress = useTransform(scrollYProgress, [0.07, 0.11], [0, 1]);
  const morphProgress = useTransform(scrollYProgress, [0.11, 0.19], [0, 1]);
  const heroBg = useTransform(invertProgress, [0, 1], ["#f5efe5", "#0f0e0d"]);
  const revealHead = useTransform(
    scrollYProgress,
    [0.19, 0.30, 0.34, 0.39],
    [
      0,
      SLIDE2_TEXT.length + 7,
      SLIDE2_TEXT.length + 7,
      0,
    ],
  );
  /* All deep-dive morphs (brain → clock → earth → cliffs) are gated
     on `deepDive`. In default (short) mode each raw transform is
     wrapped through a gate that forces 0, so the dots stay locked
     in the brain layout while the three headlines appear together. */
  const eyeMorphRaw = useTransform(scrollYProgress, [0.37, 0.50], [0, 1]);
  const eyeOffsetRaw = useTransform(scrollYProgress, [0.37, 0.50], [0, 1]);
  const eyeMorphProgress = useTransform(eyeMorphRaw, (v) => (deepDive ? v : 0));
  const eyeOffsetProgress = useTransform(eyeOffsetRaw, (v) => (deepDive ? v : 0));
  /* Earth morph + earth offset run concurrently. The offset eases
     the canvas from +right (clock pose) all the way to −left so
     the earth ends up on the OPPOSITE side from the clock. The
     long sweep automatically pulls velocity trails out of every
     dot via the existing partial-fade clear. */
  const earthMorphRaw = useTransform(scrollYProgress, [0.67, 0.82], [0, 1]);
  const earthOffsetRaw = useTransform(scrollYProgress, [0.67, 0.82], [0, 1]);
  const earthMorphProgress = useTransform(earthMorphRaw, (v) => (deepDive ? v : 0));
  const earthOffsetProgress = useTransform(earthOffsetRaw, (v) => (deepDive ? v : 0));
  /* Cliffs morph + phase. cliffMorph drives the dot positions from
     the earth → two-cliff-with-a-gap layout. cliffPhase ALSO drives
     the canvas back to centered+full-scale (lerps the eyeOffset/
     earthOffset translate and scale back to neutral) so the cliffs
     read at full size with the gap centered on the viewport. */
  const cliffMorphRaw = useTransform(scrollYProgress, [0.91, 0.97], [0, 1]);
  const cliffPhaseRaw = useTransform(scrollYProgress, [0.91, 0.97], [0, 1]);
  const cliffMorphProgress = useTransform(cliffMorphRaw, (v) => (deepDive ? v : 0));
  const cliffPhaseProgress = useTransform(cliffPhaseRaw, (v) => (deepDive ? v : 0));

  const [stage, setStage] = useState(0);
  const [visionReady, setVisionReady] = useState(false);
  const [erodingReady, setErodingReady] = useState(false);
  const [cliffReady, setCliffReady] = useState(false);
  /* `hydrated` flips true after the first useLayoutEffect runs.
     The animated text blocks render conditionally on it, which
     means they only MOUNT after we've synced ready flags with the
     current scroll position. Combined with `skipIntroAnim`-aware
     `initial` values on every motion component, this guarantees
     scrolled-refreshes show the text in its already-settled state
     with zero entrance animation. */
  const [hydrated, setHydrated] = useState(false);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setStage(v > 0.30 && v < 0.39 ? 3 : 0);
    /* visionReady / erodingReady / cliffReady trigger the entrance
       of the per-stage cliff overlays (Current Teleop / Skilled
       labor / Sim-to-real gap). They are gated on `deepDive` so the
       short path never reveals them — instead the `HeadlinesTogether`
       overlay shows all three titles simultaneously over the brain. */
    setVisionReady(deepDive && v > 0.50);
    setErodingReady(deepDive && v > 0.82);
    setCliffReady(deepDive && v > 0.96);
  });
  useLayoutEffect(() => {
    /* Initial scroll-based sync runs once, BEFORE first paint, so
       motion components mount with the correct ready-flag state
       (and `initial` matches `animate` → no entrance animation). */
    const v = scrollYProgress.get();
    if (deepDive && v > 0.50) setVisionReady(true);
    if (deepDive && v > 0.82) setErodingReady(true);
    if (deepDive && v > 0.96) setCliffReady(true);
    setHydrated(true);
  }, [scrollYProgress, deepDive]);

  /* Opacity of the Learn More button — fades in just after SLIDE2
     text has fully revealed (~0.30 of pinRef progress) and fades
     out as the short-path "headlines together" view takes over.
     Forced to 0 in deep-dive mode (the user has already chosen). */
  const learnMoreOpacityRaw = useTransform(
    scrollYProgress,
    [0.28, 0.32, 0.42, 0.47],
    [0, 1, 1, 0],
  );
  const learnMoreOpacity = useTransform(learnMoreOpacityRaw, (v) =>
    deepDive ? 0 : v,
  );
  const learnMorePointer = useTransform(learnMoreOpacityRaw, (v) =>
    !deepDive && v > 0.5 ? "auto" : "none",
  );

  /* Opacity driving the "three headlines together" overlay that
     replaces the deep-dive cliff sequence in the short path. Brain
     stays as the dot art; the three titles + subtitles fade in
     simultaneously, sit briefly, then begin fading as the frame
     exit kicks in. Forced to 0 in deep-dive mode. */
  const headlinesTogetherRaw = useTransform(
    scrollYProgress,
    [0.45, 0.62, 0.95, 1.0],
    [0, 1, 1, 0.6],
  );
  const headlinesTogetherOpacity = useTransform(
    headlinesTogetherRaw,
    (v) => (deepDive ? 0 : v),
  );

  return (
    <>
      {/* BACK TO MAIN PAGE — only rendered in deep-dive mode. Fixed
          to the top-right of the viewport so it stays visible while
          the user is locked in the cliff sequence; clicking it flips
          deepDive off, un-traps scroll, and snaps the user to
          Manifesto so they continue browsing the main page. */}
      {deepDive && (
        <button
          type="button"
          onClick={handleBackToMain}
          aria-label="Back to main page"
          style={{
            position: "fixed",
            bottom: "clamp(1.25rem, 3vh, 2.25rem)",
            right: "clamp(1.25rem, 3vw, 2.25rem)",
            zIndex: 50,
            fontFamily:
              "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
            fontSize: "clamp(0.85rem, 1vw, 1rem)",
            fontWeight: 500,
            padding: "0.7rem 1.3rem",
            border: "1px solid rgba(245, 239, 229, 0.34)",
            borderRadius: "999px",
            backgroundColor: "rgba(15, 14, 13, 0.55)",
            color: "rgba(245, 239, 229, 0.96)",
            letterSpacing: "0.02em",
            cursor: "pointer",
            backdropFilter: "blur(10px) saturate(140%)",
            WebkitBackdropFilter: "blur(10px) saturate(140%)",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.55rem",
          }}
        >
          <span aria-hidden>←</span>
          Back to main page
        </button>
      )}
      <section
        ref={sectionRef}
        className="relative"
        style={{
          height: deepDive ? "880svh" : "370svh",
        }}
      >
        {/* Invisible scroll-measurement marker. */}
        <div
          ref={pinRef}
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 top-0"
          style={{ height: deepDive ? "880svh" : "370svh" }}
        />
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          {/* Hero content — fills the viewport while pinned */}
          <div className="absolute inset-0 overflow-hidden">
          {/* Scroll-driven cream → dark backdrop. Replaces the static
              PaperBackground for the hero so it can invert with the
              dot color crossfade. */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0"
            style={{ backgroundColor: heroBg }}
          />
          <TopographicalDots
            morphProgress={morphProgress}
            invertProgress={invertProgress}
            eyeMorphProgress={eyeMorphProgress}
            eyeOffsetProgress={eyeOffsetProgress}
            earthMorphProgress={earthMorphProgress}
            earthOffsetProgress={earthOffsetProgress}
            cliffMorphProgress={cliffMorphProgress}
            cliffPhaseProgress={cliffPhaseProgress}
          />


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
                    "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
                  fontWeight: 700,
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

          {/* LEARN MORE button — appears just after the SLIDE2 sentence
              completes (scrollYProgress ≈ 0.30) and fades out by 0.47.
              Click flips deepDive=true and smooth-scrolls into Current
              Teleoperation; scroll past without clicking takes the
              short path (HeadlinesTogether → frame exit → dictionary).
              Forced invisible + non-interactive once deepDive is true. */}
          <motion.div
            className="pointer-events-none absolute inset-x-0 z-[8] flex justify-center px-6"
            style={{
              bottom: "clamp(3.5rem, 10vh, 7rem)",
              opacity: learnMoreOpacity,
            }}
          >
            <motion.button
              type="button"
              onClick={handleLearnMore}
              style={{
                pointerEvents: learnMorePointer,
                fontFamily:
                  "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
                fontSize: "clamp(0.95rem, 1.1vw, 1.1rem)",
                fontWeight: 500,
                padding: "0.85rem 1.7rem",
                border: "1px solid rgba(245, 239, 229, 0.34)",
                borderRadius: "999px",
                backgroundColor: "rgba(245, 239, 229, 0.07)",
                color: "rgba(245, 239, 229, 0.96)",
                letterSpacing: "0.02em",
                cursor: "pointer",
                backdropFilter: "blur(8px) saturate(140%)",
                WebkitBackdropFilter: "blur(8px) saturate(140%)",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.7rem",
              }}
            >
              Learn more
              <span aria-hidden style={{ display: "inline-block" }}>
                →
              </span>
            </motion.button>
          </motion.div>

          {/* HEADLINES TOGETHER — short-path payoff: the three deep-dive
              titles fade in simultaneously over the brain dot art,
              hold while the user reads, then begin to fade as the
              frame exit kicks in. Hidden in deep-dive mode (those
              titles play out sequentially with their own morphs). */}
          {hydrated && (
            <motion.div
              className="pointer-events-none absolute inset-x-0 z-[7] hidden md:block"
              style={{
                bottom: "clamp(3.5rem, 10vh, 7rem)",
                opacity: headlinesTogetherOpacity,
              }}
              aria-hidden={deepDive}
            >
              <div className="mx-auto grid max-w-[1320px] grid-cols-3 gap-8 px-10 lg:gap-12 lg:px-14">
                {[
                  {
                    tokens: MODERN_TELEOP_TITLE_TOKENS,
                    note: "vision-only stacks plateau on contact-rich tasks.",
                  },
                  {
                    tokens: ERODING_TITLE_TOKENS,
                    note: "50M manufacturing roles projected unfilled by 2030.",
                  },
                  {
                    tokens: GAP_TITLE_TOKENS,
                    note: "no simulator yet models friction, deformation, multi-point contact.",
                  },
                ].map((col, idx) => (
                  <div key={idx} className="flex flex-col">
                    <h3
                      style={{
                        fontFamily:
                          "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
                        fontWeight: 600,
                        fontSize: "clamp(1.05rem, 1.55vw, 1.55rem)",
                        lineHeight: 1.15,
                        letterSpacing: "-0.015em",
                        margin: 0,
                        color: "rgba(245, 239, 229, 0.96)",
                      }}
                    >
                      {col.tokens.join(" ")}
                    </h3>
                    <p
                      style={{
                        marginTop: "0.55rem",
                        fontFamily:
                          "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
                        fontWeight: 400,
                        fontSize: "clamp(0.82rem, 0.95vw, 1rem)",
                        lineHeight: 1.45,
                        letterSpacing: "0.005em",
                        color: "rgba(245, 239, 229, 0.55)",
                      }}
                    >
                      {col.note}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* "Current Teleoperation systems are outdated" — appears on the LEFT side of
              the viewport once the brain has reformed into the eyes
              on the right. Same 3-stage colour reveal as the title:
              green → purple/pink → white, with two diagonal mask
              wipes. Gated on `visionReady` which flips when scroll
              progress crosses the cue. Outer rendering is gated on
              `hydrated` so motion components only mount AFTER the
              initial scroll-flag sync — no on-mount animation runs
              on a scrolled-refresh. */}
          {hydrated && (
          <div
            className="pointer-events-none absolute inset-0 z-[7] hidden items-center md:flex"
            aria-hidden={!visionReady}
          >
            <div
              className="pointer-events-none w-full"
              style={{
                paddingLeft: "8vw",
                paddingRight: "55vw",
              }}
            >
              <div
                style={{
                  overflow: "hidden",
                  paddingBottom: "0.2em",
                }}
              >
                <motion.h2
                  className="text-balance"
                  initial={skipIntroAnim ? TEXT_FINAL : TEXT_INITIAL}
                  animate={{
                    y: visionReady ? "0%" : "120%",
                    opacity: visionReady ? 1 : 0,
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
                    fontWeight: 600,
                    fontSize: "clamp(1.7rem, 3.4vw, 3.2rem)",
                    lineHeight: 1.1,
                    letterSpacing: "-0.025em",
                    margin: 0,
                    color: "#ffffff",
                    textAlign: "left",
                  }}
                >
                  {(() => {
                    const tokens = MODERN_TELEOP_TITLE_TOKENS;
                    const wins = staggerWindows(
                      tokens.length,
                      0.64,
                      0.70,
                      0.04,
                    );
                    return tokens.map((tok, i) => (
                      <Fragment key={i}>
                        <HeroWord
                          scrollProgress={scrollYProgress}
                          start={wins[i].start}
                          end={wins[i].end}
                        >
                          {tok}
                        </HeroWord>
                        {i < tokens.length - 1 ? " " : ""}
                      </Fragment>
                    ));
                  })()}
                  {/* Purple/pink overlay — wipes off in the second
                      half so the white base shows through. */}
                  <motion.span
                    aria-hidden
                    className="text-balance"
                    initial={skipIntroAnim ? MASK_WIPED : MASK_OPAQUE}
                    animate={{
                      maskImage: visionReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : [
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                          ],
                      WebkitMaskImage: visionReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : [
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                          ],
                    }}
                    transition={{
                      duration: 0.42,
                      ease: "linear",
                      times: [0, 0.5, 1],
                      delay: visionReady ? 0.28 : 0,
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "block",
                      color: "#883a8d",
                      pointerEvents: "none",
                    }}
                  >
                    {renderTokenOverlay(MODERN_TELEOP_TITLE_TOKENS)}
                  </motion.span>
                  {/* Green overlay — wipes off first; reveal order:
                      green → purple → normal (white). */}
                  <motion.span
                    aria-hidden
                    className="text-balance"
                    initial={skipIntroAnim ? MASK_WIPED : MASK_OPAQUE}
                    animate={{
                      maskImage: visionReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : [
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                          ],
                      WebkitMaskImage: visionReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : [
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                          ],
                    }}
                    transition={{
                      duration: 0.32,
                      ease: "linear",
                      times: [0, 0.5, 1],
                      delay: 0,
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "block",
                      color: "#059669",
                      pointerEvents: "none",
                    }}
                  >
                    {renderTokenOverlay(MODERN_TELEOP_TITLE_TOKENS)}
                  </motion.span>
                </motion.h2>
              </div>
              {/* Subtitle — same 3-stage colour wipe, slightly
                  delayed so it lands after the h2 settles. */}
              <div
                style={{
                  overflow: "hidden",
                  marginTop: "1em",
                  paddingBottom: "0.25em",
                  maxWidth: "32em",
                }}
              >
                <motion.p
                  initial={skipIntroAnim ? TEXT_FINAL : TEXT_INITIAL}
                  animate={{
                    y: visionReady ? "0%" : "120%",
                    opacity: visionReady ? 1 : 0,
                  }}
                  transition={{
                    duration: 0.6,
                    ease: [0.22, 1, 0.36, 1],
                    delay: visionReady ? 0.35 : 0,
                  }}
                  style={{
                    position: "relative",
                    fontFamily:
                      "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
                    fontWeight: 400,
                    fontSize: "clamp(0.95rem, 1.15vw, 1.15rem)",
                    lineHeight: 1.55,
                    letterSpacing: "-0.005em",
                    margin: 0,
                    color: "rgba(255, 255, 255, 0.78)",
                    textAlign: "left",
                  }}
                >
                  {(() => {
                    const tokens = MODERN_TELEOP_SUBTITLE_TOKENS;
                    const wins = staggerWindows(
                      tokens.length,
                      0.64,
                      0.72,
                      0.03,
                    );
                    return tokens.map((tok, i) => (
                      <Fragment key={i}>
                        <HeroWord
                          scrollProgress={scrollYProgress}
                          start={wins[i].start}
                          end={wins[i].end}
                        >
                          {tok}
                        </HeroWord>
                        {i < tokens.length - 1 ? " " : ""}
                      </Fragment>
                    ));
                  })()}
                  {/* Purple/pink overlay — wipes off second. */}
                  <motion.span
                    aria-hidden
                    initial={skipIntroAnim ? MASK_WIPED : MASK_OPAQUE}
                    animate={{
                      maskImage: visionReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : [
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                          ],
                      WebkitMaskImage: visionReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : [
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                          ],
                    }}
                    transition={{
                      duration: 0.35,
                      ease: "linear",
                      times: [0, 0.5, 1],
                      delay: visionReady ? 0.65 : 0,
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "block",
                      color: "#883a8d",
                      pointerEvents: "none",
                    }}
                  >
                    {renderTokenOverlay(MODERN_TELEOP_SUBTITLE_TOKENS)}
                  </motion.span>
                  {/* Green overlay — wipes off first. */}
                  <motion.span
                    aria-hidden
                    initial={skipIntroAnim ? MASK_WIPED : MASK_OPAQUE}
                    animate={{
                      maskImage: visionReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : [
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                          ],
                      WebkitMaskImage: visionReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : [
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                          ],
                    }}
                    transition={{
                      duration: 0.28,
                      ease: "linear",
                      times: [0, 0.5, 1],
                      delay: visionReady ? 0.35 : 0,
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "block",
                      color: "#059669",
                      pointerEvents: "none",
                    }}
                  >
                    {renderTokenOverlay(MODERN_TELEOP_SUBTITLE_TOKENS)}
                  </motion.span>
                </motion.p>
              </div>
            </div>
          </div>
          )}

          {/* "The skilled labor base is eroding" — appears on the
              RIGHT side after the clock has morphed into the earth
              and slid all the way to the left. Same 3-stage colour
              wipe (green → purple/pink → white) gated on
              `erodingReady`. Mirrors the modern-teleop block's
              layout but anchored to the right edge. */}
          {hydrated && (
          <div
            className="pointer-events-none absolute inset-0 z-[7] hidden items-center md:flex"
            aria-hidden={!erodingReady}
          >
            <div
              className="pointer-events-none w-full"
              style={{
                paddingLeft: "55vw",
                paddingRight: "8vw",
              }}
            >
              <div
                style={{
                  overflow: "hidden",
                  paddingBottom: "0.2em",
                }}
              >
                <motion.h2
                  className="text-balance"
                  initial={skipIntroAnim ? TEXT_FINAL : TEXT_INITIAL}
                  animate={{
                    y: erodingReady ? "0%" : "120%",
                    opacity: erodingReady ? 1 : 0,
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
                    fontWeight: 600,
                    fontSize: "clamp(1.7rem, 3.4vw, 3.2rem)",
                    lineHeight: 1.1,
                    letterSpacing: "-0.025em",
                    margin: 0,
                    color: "#ffffff",
                    textAlign: "left",
                  }}
                >
                  {(() => {
                    const wins = staggerWindows(
                      ERODING_TITLE_TOKENS.length,
                      0.92,
                      0.96,
                      0.025,
                    );
                    return ERODING_TITLE_TOKENS.map((tok, i) => (
                      <Fragment key={i}>
                        <HeroWord
                          scrollProgress={scrollYProgress}
                          start={wins[i].start}
                          end={wins[i].end}
                        >
                          {tok}
                        </HeroWord>
                        {i < ERODING_TITLE_TOKENS.length - 1 ? " " : ""}
                      </Fragment>
                    ));
                  })()}
                  {/* Purple/pink overlay — wipes off second. */}
                  <motion.span
                    aria-hidden
                    className="text-balance"
                    initial={skipIntroAnim ? MASK_WIPED : MASK_OPAQUE}
                    animate={{
                      maskImage: erodingReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                      WebkitMaskImage: erodingReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                    }}
                    transition={{
                      duration: 0.42,
                      ease: "linear",
                      times: [0, 0.5, 1],
                      delay: erodingReady ? 0.28 : 0,
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "block",
                      color: "#883a8d",
                      pointerEvents: "none",
                    }}
                  >
                    {renderTokenOverlay(ERODING_TITLE_TOKENS)}
                  </motion.span>
                  {/* Green overlay — wipes off first. */}
                  <motion.span
                    aria-hidden
                    className="text-balance"
                    initial={skipIntroAnim ? MASK_WIPED : MASK_OPAQUE}
                    animate={{
                      maskImage: erodingReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                      WebkitMaskImage: erodingReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                    }}
                    transition={{
                      duration: 0.32,
                      ease: "linear",
                      times: [0, 0.5, 1],
                      delay: 0,
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "block",
                      color: "#059669",
                      pointerEvents: "none",
                    }}
                  >
                    {renderTokenOverlay(ERODING_TITLE_TOKENS)}
                  </motion.span>
                </motion.h2>
              </div>
              {/* Subtitle — same 3-stage wipe, slightly delayed
                  so it lands after the heading. Mirrors the
                  modern-teleop subtitle but anchored right. */}
              <div
                style={{
                  overflow: "hidden",
                  marginTop: "1em",
                  paddingBottom: "0.25em",
                  maxWidth: "32em",
                }}
              >
                <motion.p
                  initial={skipIntroAnim ? TEXT_FINAL : TEXT_INITIAL}
                  animate={{
                    y: erodingReady ? "0%" : "120%",
                    opacity: erodingReady ? 1 : 0,
                  }}
                  transition={{
                    duration: 0.6,
                    ease: [0.22, 1, 0.36, 1],
                    delay: erodingReady ? 0.35 : 0,
                  }}
                  style={{
                    position: "relative",
                    fontFamily:
                      "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
                    fontWeight: 400,
                    fontSize: "clamp(0.95rem, 1.15vw, 1.15rem)",
                    lineHeight: 1.55,
                    letterSpacing: "-0.005em",
                    margin: 0,
                    color: "rgba(255, 255, 255, 0.78)",
                    textAlign: "left",
                  }}
                >
                  {(() => {
                    const wins = staggerWindows(
                      ERODING_SUBTITLE_TOKENS.length,
                      0.92,
                      0.96,
                      0.02,
                    );
                    return ERODING_SUBTITLE_TOKENS.map((tok, i) => (
                      <Fragment key={i}>
                        <HeroWord
                          scrollProgress={scrollYProgress}
                          start={wins[i].start}
                          end={wins[i].end}
                        >
                          {tok}
                        </HeroWord>
                        {i < ERODING_SUBTITLE_TOKENS.length - 1 ? " " : ""}
                      </Fragment>
                    ));
                  })()}
                  {/* Purple/pink overlay — wipes off second. */}
                  <motion.span
                    aria-hidden
                    initial={skipIntroAnim ? MASK_WIPED : MASK_OPAQUE}
                    animate={{
                      maskImage: erodingReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                      WebkitMaskImage: erodingReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                    }}
                    transition={{
                      duration: 0.35,
                      ease: "linear",
                      times: [0, 0.5, 1],
                      delay: erodingReady ? 0.65 : 0,
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "block",
                      color: "#883a8d",
                      pointerEvents: "none",
                    }}
                  >
                    {renderTokenOverlay(ERODING_SUBTITLE_TOKENS)}
                  </motion.span>
                  {/* Green overlay — wipes off first. */}
                  <motion.span
                    aria-hidden
                    initial={skipIntroAnim ? MASK_WIPED : MASK_OPAQUE}
                    animate={{
                      maskImage: erodingReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                      WebkitMaskImage: erodingReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                    }}
                    transition={{
                      duration: 0.28,
                      ease: "linear",
                      times: [0, 0.5, 1],
                      delay: erodingReady ? 0.35 : 0,
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "block",
                      color: "#059669",
                      pointerEvents: "none",
                    }}
                  >
                    {renderTokenOverlay(ERODING_SUBTITLE_TOKENS)}
                  </motion.span>
                </motion.p>
              </div>
            </div>
          </div>
          )}

          {/* "The sim-to-real gap is still wide" — appears in the GAP
              between the two cliffs after the earth has reformed
              into them and the canvas re-centered. Title sits above
              centerline; subtitle just below it. Same 3-stage
              colour wipe (green → purple → white) gated on
              `cliffReady`. */}
          {hydrated && (
          <div
            className="pointer-events-none absolute inset-0 z-[7] hidden flex-col items-center justify-center px-6 md:flex md:px-10"
            aria-hidden={!cliffReady}
          >
            <div className="pointer-events-none flex w-full max-w-[28rem] flex-col items-center">
              <div
                style={{
                  overflow: "hidden",
                  paddingBottom: "0.2em",
                }}
              >
                <motion.h2
                  className="text-balance"
                  initial={skipIntroAnim ? TEXT_FINAL : TEXT_INITIAL}
                  animate={{
                    y: cliffReady ? "0%" : "120%",
                    opacity: cliffReady ? 1 : 0,
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
                    fontWeight: 600,
                    fontSize: "clamp(1.7rem, 3.4vw, 3.2rem)",
                    lineHeight: 1.1,
                    letterSpacing: "-0.025em",
                    margin: 0,
                    color: "#ffffff",
                    textAlign: "center",
                  }}
                >
                  {renderTokenOverlay(GAP_TITLE_TOKENS)}
                  {/* Purple/pink overlay — wipes off second. */}
                  <motion.span
                    aria-hidden
                    className="text-balance"
                    initial={skipIntroAnim ? MASK_WIPED : MASK_OPAQUE}
                    animate={{
                      maskImage: cliffReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                      WebkitMaskImage: cliffReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                    }}
                    transition={{
                      duration: 0.42,
                      ease: "linear",
                      times: [0, 0.5, 1],
                      delay: cliffReady ? 0.28 : 0,
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "block",
                      color: "#883a8d",
                      pointerEvents: "none",
                    }}
                  >
                    {renderTokenOverlay(GAP_TITLE_TOKENS)}
                  </motion.span>
                  {/* Green overlay — wipes off first. */}
                  <motion.span
                    aria-hidden
                    className="text-balance"
                    initial={skipIntroAnim ? MASK_WIPED : MASK_OPAQUE}
                    animate={{
                      maskImage: cliffReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                      WebkitMaskImage: cliffReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                    }}
                    transition={{
                      duration: 0.32,
                      ease: "linear",
                      times: [0, 0.5, 1],
                      delay: 0,
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "block",
                      color: "#059669",
                      pointerEvents: "none",
                    }}
                  >
                    {renderTokenOverlay(GAP_TITLE_TOKENS)}
                  </motion.span>
                </motion.h2>
              </div>

              {/* Subtitle — same wipe pattern, slightly delayed. */}
              <div
                style={{
                  overflow: "hidden",
                  marginTop: "1em",
                  paddingBottom: "0.25em",
                  maxWidth: "26em",
                }}
              >
                <motion.p
                  initial={skipIntroAnim ? TEXT_FINAL : TEXT_INITIAL}
                  animate={{
                    y: cliffReady ? "0%" : "120%",
                    opacity: cliffReady ? 1 : 0,
                  }}
                  transition={{
                    duration: 0.6,
                    ease: [0.22, 1, 0.36, 1],
                    delay: cliffReady ? 0.35 : 0,
                  }}
                  style={{
                    position: "relative",
                    fontFamily:
                      "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
                    fontWeight: 400,
                    fontSize: "clamp(0.95rem, 1.15vw, 1.15rem)",
                    lineHeight: 1.55,
                    letterSpacing: "-0.005em",
                    margin: 0,
                    color: "rgba(255, 255, 255, 0.78)",
                    textAlign: "center",
                  }}
                >
                  {renderTokenOverlay(GAP_SUBTITLE_TOKENS)}
                  {/* Purple/pink overlay — wipes off second. */}
                  <motion.span
                    aria-hidden
                    initial={skipIntroAnim ? MASK_WIPED : MASK_OPAQUE}
                    animate={{
                      maskImage: cliffReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                      WebkitMaskImage: cliffReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                    }}
                    transition={{
                      duration: 0.35,
                      ease: "linear",
                      times: [0, 0.5, 1],
                      delay: cliffReady ? 0.65 : 0,
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "block",
                      color: "#883a8d",
                      pointerEvents: "none",
                    }}
                  >
                    {renderTokenOverlay(GAP_SUBTITLE_TOKENS)}
                  </motion.span>
                  {/* Green overlay — wipes off first. */}
                  <motion.span
                    aria-hidden
                    initial={skipIntroAnim ? MASK_WIPED : MASK_OPAQUE}
                    animate={{
                      maskImage: cliffReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                      WebkitMaskImage: cliffReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                    }}
                    transition={{
                      duration: 0.28,
                      ease: "linear",
                      times: [0, 0.5, 1],
                      delay: cliffReady ? 0.35 : 0,
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "block",
                      color: "#059669",
                      pointerEvents: "none",
                    }}
                  >
                    {renderTokenOverlay(GAP_SUBTITLE_TOKENS)}
                  </motion.span>
                </motion.p>
              </div>
            </div>
          </div>
          )}

          {/* Main landing-page heading — big bold technical statement,
              centered on the viewport. The disappearance is owned
              per-token by HeroWord (each word slides into the
              space beside it on its own staggered scroll window).
              Gated on `hydrated` for the same reason as the other
              text blocks — no on-mount entrance animation on a
              scrolled-refresh. */}
          {hydrated && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-[5] hidden items-center justify-center px-6 md:flex md:px-10"
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
                  initial={skipIntroAnim ? TEXT_FINAL : TEXT_INITIAL}
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
                  {(() => {
                    const tokens = [
                      "[",
                      "training",
                      "pipeline",
                      "for",
                      "robots",
                      "powered",
                      "by",
                      "humans",
                      "]",
                    ];
                    const wins = staggerWindows(
                      tokens.length,
                      HERO_DISAPPEAR_START,
                      HERO_DISAPPEAR_END,
                      HERO_WORD_DURATION,
                    );
                    return tokens.map((tok, i) => {
                      const isBracket = tok === "[" || tok === "]";
                      return (
                        <Fragment key={i}>
                          <HeroWord
                            scrollProgress={scrollYProgress}
                            start={wins[i].start}
                            end={wins[i].end}
                            color={isBracket ? undefined : "#0f0e0d"}
                          >
                            {tok}
                          </HeroWord>
                          {i < tokens.length - 1 ? " " : ""}
                        </Fragment>
                      );
                    });
                  })()}
                  {/* Purple/pink overlay — wipes off in the second
                      half of the appearance, revealing the normal
                      base treatment (purple brackets, dark inner). */}
                  <motion.span
                    aria-hidden
                    initial={skipIntroAnim ? MASK_WIPED : MASK_OPAQUE}
                    animate={{
                      maskImage: textReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                      WebkitMaskImage: textReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                    }}
                    transition={{
                      duration: 0.35,
                      ease: "linear",
                      times: [0, 0.5, 1],
                      delay: textReady ? 0.6 : 0,
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "block",
                      color: "#883a8d",
                      pointerEvents: "none",
                    }}
                  >
                    [ training pipeline for robots powered by humans ]
                  </motion.span>
                  {/* Green overlay — sits on top of the purple, wipes
                      off first so green → purple → normal. */}
                  <motion.span
                    aria-hidden
                    initial={skipIntroAnim ? MASK_WIPED : MASK_OPAQUE}
                    animate={{
                      maskImage: textReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                      WebkitMaskImage: textReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                    }}
                    transition={{
                      duration: 0.28,
                      ease: "linear",
                      times: [0, 0.5, 1],
                      delay: textReady ? 0.35 : 0,
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "block",
                      color: "#059669",
                      pointerEvents: "none",
                    }}
                  >
                    [ training pipeline for robots powered by humans ]
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
                  initial={
                    skipIntroAnim
                      ? { y: "0%", opacity: 1 }
                      : { y: "120%", opacity: 0 }
                  }
                  animate={{
                    y: textReady ? "0%" : "120%",
                    opacity: textReady ? 1 : 0,
                  }}
                  transition={{
                    duration: skipIntroAnim ? 0 : 0.7,
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
                  {(() => {
                    const tokens = [
                      "Training",
                      "Robots",
                      "using",
                      "Brain-Muscle",
                      "signals",
                    ];
                    const wins = staggerWindows(
                      tokens.length,
                      HERO_DISAPPEAR_START,
                      HERO_DISAPPEAR_END,
                      HERO_WORD_DURATION,
                    );
                    return tokens.map((tok, i) => (
                      <Fragment key={i}>
                        <HeroWord
                          scrollProgress={scrollYProgress}
                          start={wins[i].start}
                          end={wins[i].end}
                        >
                          {tok}
                        </HeroWord>
                        {i < tokens.length - 1 ? " " : ""}
                      </Fragment>
                    ));
                  })()}
                  {/* Purple/pink overlay — wipes off in the second
                      half of the appearance, revealing dark base. */}
                  <motion.span
                    aria-hidden
                    className="text-balance"
                    initial={
                      skipIntroAnim
                        ? {
                            maskImage:
                              "linear-gradient(45deg, transparent 100%, #000 200%)",
                            WebkitMaskImage:
                              "linear-gradient(45deg, transparent 100%, #000 200%)",
                          }
                        : {
                            maskImage:
                              "linear-gradient(45deg, transparent -100%, #000 0%)",
                            WebkitMaskImage:
                              "linear-gradient(45deg, transparent -100%, #000 0%)",
                          }
                    }
                    animate={{
                      maskImage: textReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                      WebkitMaskImage: textReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                    }}
                    transition={{
                      duration: skipIntroAnim ? 0 : 0.42,
                      ease: "linear",
                      times: [0, 0.5, 1],
                      delay: skipIntroAnim ? 0 : textReady ? 0.28 : 0,
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "block",
                      color: "#883a8d",
                      pointerEvents: "none",
                    }}
                  >
                    {renderTokenOverlay(HERO_TITLE_TOKENS)}
                  </motion.span>
                  {/* Green overlay — sits on top of the purple, wipes
                      off first so green → purple → dark. */}
                  <motion.span
                    aria-hidden
                    className="text-balance"
                    initial={
                      skipIntroAnim
                        ? {
                            maskImage:
                              "linear-gradient(45deg, transparent 100%, #000 200%)",
                            WebkitMaskImage:
                              "linear-gradient(45deg, transparent 100%, #000 200%)",
                          }
                        : {
                            maskImage:
                              "linear-gradient(45deg, transparent -100%, #000 0%)",
                            WebkitMaskImage:
                              "linear-gradient(45deg, transparent -100%, #000 0%)",
                          }
                    }
                    animate={{
                      maskImage: textReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                      WebkitMaskImage: textReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                    }}
                    transition={{
                      duration: skipIntroAnim ? 0 : 0.32,
                      ease: "linear",
                      times: [0, 0.5, 1],
                      delay: 0,
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "block",
                      color: "#059669",
                      pointerEvents: "none",
                    }}
                  >
                    {renderTokenOverlay(HERO_TITLE_TOKENS)}
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
                  initial={skipIntroAnim ? TEXT_FINAL : TEXT_INITIAL}
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
                  {(() => {
                    const darkTokens = [
                      "We",
                      "capture",
                      "muscle",
                      "signals",
                      "from",
                      "human",
                      "operators",
                      "during",
                      "demonstration,",
                      "close",
                      "the",
                      "sim-to-real",
                      "gap",
                      "on",
                      "contact",
                      "dynamics,",
                      "and",
                      "produce",
                      "industrial",
                      "robots",
                      "that",
                      "inherit",
                      "human",
                      "force",
                      "intuition",
                      "for",
                      "contact-rich",
                      "assembly",
                      "tasks",
                      "vision-only",
                      "and",
                    ];
                    const accentTokens = [
                      "teleoperation-based",
                      "systems",
                      "cannot",
                      "solve.",
                    ];
                    const tokens = [
                      ...darkTokens.map((t) => ({ t, accent: false })),
                      ...accentTokens.map((t) => ({ t, accent: true })),
                    ];
                    const wins = staggerWindows(
                      tokens.length,
                      HERO_DISAPPEAR_START,
                      HERO_DISAPPEAR_END,
                      HERO_WORD_DURATION,
                    );
                    return tokens.map(({ t, accent }, i) => (
                      <Fragment key={i}>
                        <HeroWord
                          scrollProgress={scrollYProgress}
                          start={wins[i].start}
                          end={wins[i].end}
                          color={accent ? "var(--cyan)" : undefined}
                        >
                          {accent ? (
                            <span style={{ fontWeight: 500 }}>{t}</span>
                          ) : (
                            t
                          )}
                        </HeroWord>
                        {i < tokens.length - 1 ? " " : ""}
                      </Fragment>
                    ));
                  })()}
                  {/* Purple/pink overlay — wipes off in the second
                      half of the appearance, revealing the normal
                      treatment (dark body + purple highlight span). */}
                  <motion.span
                    aria-hidden
                    initial={skipIntroAnim ? MASK_WIPED : MASK_OPAQUE}
                    animate={{
                      maskImage: textReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                      WebkitMaskImage: textReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                    }}
                    transition={{
                      duration: 0.35,
                      ease: "linear",
                      times: [0, 0.5, 1],
                      delay: textReady ? 0.75 : 0,
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "block",
                      color: "#883a8d",
                      pointerEvents: "none",
                    }}
                  >
                    {renderTokenOverlay(HERO_SUBTITLE_TOKENS, {
                      accent: (i) =>
                        i >= HERO_SUBTITLE_TOKENS.length - 4,
                    })}
                  </motion.span>
                  {/* Green overlay — sits on top of purple, wipes off
                      first so green → purple → normal. */}
                  <motion.span
                    aria-hidden
                    initial={skipIntroAnim ? MASK_WIPED : MASK_OPAQUE}
                    animate={{
                      maskImage: textReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                      WebkitMaskImage: textReady
                        ? [
                            "linear-gradient(45deg, transparent -100%, #000 0%)",
                            "linear-gradient(45deg, transparent 0%, #000 100%)",
                            "linear-gradient(45deg, transparent 100%, #000 200%)",
                          ]
                        : "linear-gradient(45deg, transparent -100%, #000 0%)",
                    }}
                    transition={{
                      duration: 0.28,
                      ease: "linear",
                      times: [0, 0.5, 1],
                      delay: textReady ? 0.5 : 0,
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "block",
                      color: "#059669",
                      pointerEvents: "none",
                    }}
                  >
                    {renderTokenOverlay(HERO_SUBTITLE_TOKENS, {
                      accent: (i) =>
                        i >= HERO_SUBTITLE_TOKENS.length - 4,
                    })}
                  </motion.span>
                </motion.p>
              </div>
            </div>
          </motion.div>
          )}

          </div>
        </div>
      </section>

    </>
  );
}


/* ============================================================================
   SECTION TAG — shared header used by every standalone section.
   ========================================================================== */
function SectionTag({ label }: { label: string }) {
  return (
    <div
      className="mb-8 flex items-center gap-3 md:mb-10"
      style={{ color: "rgba(15, 14, 13, 0.38)" }}
    >
      <span
        aria-hidden
        style={{
          display: "block",
          width: "2rem",
          height: "1px",
          background: "rgba(15, 14, 13, 0.22)",
        }}
      />
      <span className="font-mono text-[10px] uppercase tracking-[0.28em]">
        {label}
      </span>
    </div>
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
  return (
    <section className="relative overflow-hidden" style={{ color: "#0f0e0d" }}>
      <PaperBackground />
      <div className="relative mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-36">

        {/* Section header bar */}
        <div
          style={{
            borderTop: "1px solid rgba(15,14,13,0.10)",
            paddingTop: "2rem",
            marginBottom: "4.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            className="font-mono text-[10px] uppercase tracking-[0.28em]"
            style={{ color: "rgba(15,14,13,0.38)" }}
          >
            what we build
          </span>
          <span
            className="font-mono text-[10px] uppercase tracking-[0.28em]"
            style={{ color: "rgba(15,14,13,0.20)" }}
          >
            §&nbsp;01
          </span>
        </div>

        {/* Headline — large with tonal hierarchy */}
        <motion.h2
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontWeight: 600,
            fontSize: "clamp(2.8rem, 5.8vw, 5.8rem)",
            lineHeight: 0.93,
            letterSpacing: "-0.032em",
            color: "#0f0e0d",
            marginBottom: "2.5rem",
          }}
        >
          Robot cells your{" "}
          <span style={{ color: "rgba(15,14,13,0.22)" }}>factory workers</span>{" "}
          can teach.
        </motion.h2>

        {/* Body text */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.75, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          style={{
            maxWidth: "54ch",
            fontSize: "clamp(0.9375rem, 1.2vw, 1.1rem)",
            lineHeight: 1.65,
            color: "rgba(15,14,13,0.58)",
            fontWeight: 400,
            marginBottom: "5rem",
          }}
        >
          We deploy autonomous manipulation systems onto our customers&apos;
          existing robot infrastructure. We bring the biological-signal
          capture rig, the training pipeline, the deployed policy, the safety
          supervisor, and the integration software. Customers bring the
          robots they already trust.
        </motion.p>

        {/* Editorial comparison — no box, just hairline rules */}
        <div>
          {/* Desktop column headers */}
          <div
            className="hidden md:grid"
            style={{
              gridTemplateColumns: "1.5fr 1fr 1.1fr 0.65fr",
              gap: "0 2rem",
              paddingBottom: "1.25rem",
              borderBottom: "1px solid rgba(15,14,13,0.14)",
            }}
          >
            <div />
            <span
              className="font-mono text-[9px] uppercase tracking-[0.26em]"
              style={{ color: "rgba(15,14,13,0.35)" }}
            >
              Traditional integrator
            </span>
            <span
              className="font-mono text-[9px] uppercase tracking-[0.26em]"
              style={{
                color: "#0f0e0d",
                borderLeft: "2px solid #0f0e0d",
                paddingLeft: "1.25rem",
              }}
            >
              Novonus
            </span>
            <span
              className="font-mono text-[9px] uppercase tracking-[0.26em]"
              style={{ color: "rgba(15,14,13,0.35)" }}
            >
              Advantage
            </span>
          </div>

          {/* Data rows */}
          {WHAT_WE_BUILD_ROWS.map((r, i) => (
            <motion.div
              key={r.label}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{
                duration: 0.6,
                delay: i * 0.07,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1.1fr_0.65fr]"
              style={{
                gap: "0.5rem 2rem",
                padding: "2rem 0",
                borderBottom: "1px solid rgba(15,14,13,0.08)",
                alignItems: "center",
              }}
            >
              {/* Row label */}
              <div>
                <span
                  className="font-mono text-[9px] uppercase tracking-[0.22em]"
                  style={{ color: "rgba(15,14,13,0.28)" }}
                >
                  // {String(i + 1).padStart(2, "0")}
                </span>
                <p
                  style={{
                    marginTop: "0.3rem",
                    fontSize: "0.9375rem",
                    fontWeight: 500,
                    color: "#0f0e0d",
                  }}
                >
                  {r.label}
                </p>
              </div>

              {/* Traditional */}
              <div>
                <span
                  className="font-mono text-[9px] uppercase tracking-[0.22em] md:hidden"
                  style={{ color: "rgba(15,14,13,0.35)", display: "block", marginBottom: "0.2rem" }}
                >
                  Traditional
                </span>
                <p
                  style={{
                    fontSize: "0.875rem",
                    lineHeight: 1.5,
                    color: "rgba(15,14,13,0.48)",
                  }}
                >
                  {r.trad}
                </p>
              </div>

              {/* Novonus — accent column */}
              <div
                style={{
                  borderLeft: "2px solid #0f0e0d",
                  paddingLeft: "1.25rem",
                }}
              >
                <span
                  className="font-mono text-[9px] uppercase tracking-[0.22em] md:hidden"
                  style={{ color: "#0f0e0d", display: "block", marginBottom: "0.2rem" }}
                >
                  Novonus
                </span>
                <p
                  style={{
                    fontSize: "0.875rem",
                    lineHeight: 1.5,
                    fontWeight: 600,
                    color: "#0f0e0d",
                  }}
                >
                  {r.novonus}
                </p>
              </div>

              {/* Advantage */}
              <div>
                <span
                  className="font-mono text-[9px] uppercase tracking-[0.22em] md:hidden"
                  style={{ color: "rgba(15,14,13,0.35)", display: "block", marginBottom: "0.2rem" }}
                >
                  Advantage
                </span>
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.18em]"
                  style={{ color: "#0f0e0d", fontWeight: 600 }}
                >
                  {r.adv}
                </p>
              </div>
            </motion.div>
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
    <section className="relative overflow-hidden" style={{ color: "#0f0e0d" }}>
      <PaperBackground />
      <div className="relative mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-36">

        {/* Section header bar */}
        <div
          style={{
            borderTop: "1px solid rgba(15,14,13,0.10)",
            paddingTop: "2rem",
            marginBottom: "4.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            className="font-mono text-[10px] uppercase tracking-[0.28em]"
            style={{ color: "rgba(15,14,13,0.38)" }}
          >
            the evidence
          </span>
          <span
            className="font-mono text-[10px] uppercase tracking-[0.28em]"
            style={{ color: "rgba(15,14,13,0.20)" }}
          >
            §&nbsp;03
          </span>
        </div>

        {/* Headline + intro */}
        <div className="mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontWeight: 600,
              fontSize: "clamp(2.2rem, 4.8vw, 4.5rem)",
              lineHeight: 1.0,
              letterSpacing: "-0.028em",
              color: "#0f0e0d",
              maxWidth: "22ch",
              marginBottom: "1.5rem",
            }}
          >
            Peer-reviewed. Quantified. Settled.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.75, delay: 0.15 }}
            style={{
              maxWidth: "48ch",
              fontSize: "0.9375rem",
              lineHeight: 1.65,
              color: "rgba(15,14,13,0.52)",
            }}
          >
            Every claim we make about contact-rich manipulation is backed
            by published research. The science is settled. The remaining
            question is who builds the deployed product.
          </motion.p>
        </div>

        {/* Open stat grid — no cards, only hairline rules */}
        <div
          className="grid grid-cols-2 overflow-hidden md:grid-cols-3"
          style={{ borderTop: "1px solid rgba(15,14,13,0.10)" }}
        >
          {EVIDENCE_STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{
                duration: 0.6,
                delay: (i % 3) * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                padding: "2.5rem 2rem",
                borderBottom: "1px solid rgba(15,14,13,0.08)",
                borderRight: "1px solid rgba(15,14,13,0.08)",
              }}
            >
              {/* Dominant number */}
              <div
                style={{
                  fontSize: "clamp(2.8rem, 4.2vw, 4.2rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                  color: "#0f0e0d",
                  marginBottom: "0.75rem",
                }}
              >
                <StatCounter target={s.num} suffix={s.suffix} />
              </div>

              {/* Label */}
              <p
                className="font-mono text-[10px] uppercase tracking-[0.22em]"
                style={{ color: "rgba(15,14,13,0.70)", marginBottom: "0.55rem" }}
              >
                {s.label}
              </p>

              {/* Caption */}
              <p
                style={{
                  fontSize: "0.8125rem",
                  lineHeight: 1.6,
                  color: "rgba(15,14,13,0.48)",
                }}
              >
                {s.caption}
              </p>

              {/* Source citation */}
              <p
                className="font-mono text-[8.5px] uppercase tracking-[0.18em]"
                style={{ color: "rgba(15,14,13,0.26)", marginTop: "1.25rem" }}
              >
                {s.source}
              </p>
            </motion.div>
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
          className="max-w-4xl text-balance leading-[1.05] tracking-[-0.02em]"
          style={{ fontWeight: 600, fontSize: "clamp(2.1rem, 4.4vw, 4rem)" }}
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
          <p>Novonus / The training layer for industrial robotics</p>
          <p>© 2026</p>
        </div>
      </div>
    </footer>
  );
}



/* ============================================================================
   ETYMOLOGY ENTRY — dictionary-style dissection of NOVONUS rendered as the
   cream reveal layer behind the cliff frame's exit transition. Sits inside
   the Hero's sticky div at z:0; the cliff frame at z:1 covers it until it
   begins to shrink and slide off, at which point this entry is revealed
   directly underneath in the same viewport — no scroll required.

   Lexicon conventions: small-caps "Introducing" lead, bold headword
   `novo·nus` with a single middle-dot dividing the two roots, IPA-flavored
   pronunciation in backslashes, italic part-of-speech, bracketed etymology.
   The two roots appear FIRST as their own sub-entries (verb / noun) so the
   compound definition lands last as the punchline; a cheeky italic line
   closes the entry. Cream `#f5efe5` matches every other paper section on
   the site exactly — no grain overlay so the swatch reads identically.
   ========================================================================== */
function EtymologyEntry() {
  const garamond =
    "var(--font-eb-garamond), 'EB Garamond', Garamond, 'Times New Roman', Times, serif";
  const ink = "#1a1714";
  const muted = "rgba(26, 23, 20, 0.55)";
  const accent = "rgba(26, 23, 20, 0.78)";
  const hairline = "rgba(26, 23, 20, 0.22)";

  return (
    <div
      className="absolute inset-0 flex items-center justify-center px-6 md:px-14"
      style={{
        backgroundColor: "#f5efe5",
        fontFamily: garamond,
        color: ink,
        fontFeatureSettings: '"liga", "kern", "onum", "calt"',
      }}
    >
      {/* FRAMED CARD — the dictionary entry (Introducing kicker
          included) sits inside a rounded card with a slightly
          darker cream than the surrounding page so it reads as an
          inset panel. Hairline border, large radius, generous
          interior padding. Stays centered in the viewport via the
          parent's flex centering. */}
      <div
        className="relative mx-auto w-full max-w-[1180px]"
        style={{
          backgroundColor: "#ece4d2",
          border: "1px solid rgba(26, 23, 20, 0.14)",
          borderRadius: "26px",
          padding: "clamp(2.6rem, 5.4vw, 4.4rem) clamp(2rem, 5vw, 4rem)",
          boxShadow: "0 1px 0 rgba(255, 255, 255, 0.45) inset",
        }}
      >
        {/* INTRODUCING — kicker sits at the top of the framed card,
            centered, with generous letter-spacing so it reads as
            a running head over the entry below. */}
        <p
          className="text-center"
          style={{
            margin: "0 0 2.2rem",
            fontFamily:
              "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
            fontSize: "clamp(1rem, 1.35vw, 1.3rem)",
            letterSpacing: "0.55em",
            textTransform: "uppercase",
            color: ink,
            fontWeight: 600,
          }}
        >
          Introducing
        </p>

        {/* PRIMARY HEADWORD — `novo·nus` with a single middle-dot
            between the two roots. */}
        <header style={{ marginBottom: "1.8rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              flexWrap: "wrap",
              gap: "0.8rem 1rem",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontWeight: 600,
                fontSize: "clamp(2.6rem, 5.4vw, 4.8rem)",
                letterSpacing: "-0.005em",
                lineHeight: 1,
              }}
            >
              novo
              <span
                style={{
                  color: muted,
                  fontWeight: 400,
                  padding: "0 0.06em",
                }}
              >
                ·
              </span>
              nus
            </h2>
            <span
              style={{
                fontSize: "clamp(1rem, 1.6vw, 1.4rem)",
                color: muted,
                fontWeight: 400,
                letterSpacing: "0.01em",
              }}
            >
              <span style={{ marginRight: "0.5em" }}>|</span>
              {"\\ "}
              <span style={{ fontStyle: "italic" }}>ˈnoʊ-voʊ-nəs</span>
              {" \\"}
            </span>
          </div>
          <p
            style={{
              margin: "0.55rem 0 0",
              fontSize: "clamp(0.95rem, 1.15vw, 1.1rem)",
              color: accent,
              fontWeight: 400,
              letterSpacing: "0.005em",
            }}
          >
            <em>noun</em>
            <span style={{ color: muted, margin: "0 0.55rem" }}>·</span>
            <span>
              [Latin <em>novāre</em> + Ancient Greek <em>νοῦς</em>]
            </span>
          </p>
        </header>

        {/* ROOTS — the two individual meanings come FIRST so the
            compound definition lands as the punchline below. */}
        <div className="grid grid-cols-1 gap-7 md:grid-cols-2 md:gap-12">
          {/* NOVO */}
          <article>
            <header style={{ marginBottom: "0.55rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  flexWrap: "wrap",
                  gap: "0.55rem 0.75rem",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontWeight: 600,
                    fontSize: "clamp(1.55rem, 2.4vw, 2rem)",
                    lineHeight: 1,
                    letterSpacing: "-0.003em",
                  }}
                >
                  novo
                </h3>
                <span
                  style={{
                    fontSize: "clamp(0.92rem, 1.1vw, 1.05rem)",
                    color: muted,
                    fontWeight: 400,
                  }}
                >
                  {"\\ "}
                  <span style={{ fontStyle: "italic" }}>ˈnoʊ-voʊ</span>
                  {" \\"}
                </span>
              </div>
              <p
                style={{
                  margin: "0.35rem 0 0",
                  fontSize: "0.95rem",
                  color: accent,
                  fontWeight: 400,
                }}
              >
                <em>verb, transitive</em>
                <span style={{ color: muted, margin: "0 0.5rem" }}>·</span>
                <span
                  style={{
                    fontVariant: "small-caps",
                    letterSpacing: "0.08em",
                    fontSize: "0.92em",
                  }}
                >
                  Latin
                </span>
              </p>
            </header>

            <p
              style={{
                margin: 0,
                fontSize: "1.05rem",
                lineHeight: 1.55,
                paddingLeft: "1.3rem",
                textIndent: "-1.3rem",
                color: ink,
              }}
            >
              <span style={{ fontWeight: 600, marginRight: "0.5rem" }}>1</span>
              <span style={{ color: muted, marginRight: "0.4rem" }}>:</span>
              to make new; to renew; to refresh.
            </p>
          </article>

          {/* NOUS */}
          <article>
            <header style={{ marginBottom: "0.55rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  flexWrap: "wrap",
                  gap: "0.55rem 0.75rem",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontWeight: 600,
                    fontSize: "clamp(1.55rem, 2.4vw, 2rem)",
                    lineHeight: 1,
                    letterSpacing: "-0.003em",
                  }}
                >
                  nous
                </h3>
                <span
                  style={{
                    fontSize: "clamp(0.92rem, 1.1vw, 1.05rem)",
                    color: muted,
                    fontWeight: 400,
                  }}
                >
                  {"\\ "}
                  <span style={{ fontStyle: "italic" }}>ˈnuːs</span>
                  {" \\"}
                </span>
                <span
                  lang="grc"
                  style={{
                    fontStyle: "italic",
                    fontSize: "clamp(1.35rem, 2vw, 1.7rem)",
                    color: ink,
                    fontWeight: 500,
                    letterSpacing: "0.005em",
                    marginLeft: "0.15rem",
                  }}
                >
                  νοῦς
                </span>
              </div>
              <p
                style={{
                  margin: "0.35rem 0 0",
                  fontSize: "0.95rem",
                  color: accent,
                  fontWeight: 400,
                }}
              >
                <em>noun, masculine</em>
                <span style={{ color: muted, margin: "0 0.5rem" }}>·</span>
                <span
                  style={{
                    fontVariant: "small-caps",
                    letterSpacing: "0.08em",
                    fontSize: "0.92em",
                  }}
                >
                  Ancient Greek
                </span>
              </p>
            </header>

            <p
              style={{
                margin: 0,
                fontSize: "1.05rem",
                lineHeight: 1.55,
                paddingLeft: "1.3rem",
                textIndent: "-1.3rem",
                color: ink,
              }}
            >
              <span style={{ fontWeight: 600, marginRight: "0.5rem" }}>1</span>
              <span style={{ color: muted, marginRight: "0.4rem" }}>:</span>
              the mind; the intellect; the faculty by which one apprehends.
            </p>
          </article>
        </div>

        <hr
          style={{
            border: 0,
            borderTop: `1px solid ${hairline}`,
            margin: "2rem 0 1.7rem",
          }}
        />

        {/* COMPOUND DEFINITION — the punchline, set larger than the
            individual roots so the eye lands here last. */}
        <p
          style={{
            margin: 0,
            fontSize: "clamp(1.35rem, 2.1vw, 1.95rem)",
            lineHeight: 1.35,
            color: ink,
            fontWeight: 400,
            paddingLeft: "1.6rem",
            textIndent: "-1.6rem",
          }}
        >
          <span style={{ fontWeight: 600, marginRight: "0.55rem" }}>1</span>
          <span style={{ color: muted, marginRight: "0.45rem" }}>:</span>
          the making of a new mind.
        </p>

        {/* CHEEKY TAILPIECE — sits below the compound definition,
            horizontally centered with a bit more breathing room.
            Inter Tight to match the site's body text, plain roman,
            no em-dash so it reads as its own clean line. */}
        <p
          className="text-center"
          style={{
            margin: "4.5rem 0 0",
            fontFamily:
              "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
            fontSize: "clamp(1.05rem, 1.4vw, 1.3rem)",
            color: ink,
            fontWeight: 500,
            letterSpacing: "0.005em",
          }}
        >
          because that&rsquo;s what we help robots do.
        </p>
      </div>
    </div>
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
        <WhatWeBuild />
        <Pipeline />
        <FluidSection />
        <Evidence />
        <section className="relative" style={{ minHeight: "100svh" }}>
          <EtymologyEntry />
        </section>
        <SiteFooter />
      </main>
    </IntroProvider>
  );
}

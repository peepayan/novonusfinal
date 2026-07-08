"use client";

import {
  Fragment,
  createContext,
  useCallback,
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
  cubicBezier,
  motion,
  motionValue,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { gsap } from "gsap";
import * as THREE from "three";
import { MeshGradient } from "@paper-design/shaders-react";
import { SplineScene } from "@/components/ui/splite";
import { Spotlight } from "@/components/ui/spotlight";
import { Component as EtherealShadow } from "@/components/ui/etheral-shadow";

/* MotionValue provided by CrossfadeLayer — goes 0 (masked) → 1 (fully visible).
   Section components subscribe to this to fire their GSAP entrance animations
   exactly once when the crossfade reveals them. */
const ZERO_MV = motionValue(0);
const SectionVisibleCtx = createContext<MotionValue<number>>(ZERO_MV);
const ContactModalCtx = createContext<() => void>(() => {});

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
const LOADING_BAR_MS = 850;
const LOADING_BAR_HOLD_MS = 60;
/* logoPop covers logo scale-in, wordmark wipe-in, and a hold for read
   time. The dock phase is the transition: wordmark and logo retract /
   fly to the top in one quick beat — no separate fade-out. */
const LOGO_POP_MS = 1200;
const DOCK_MS = 180;
const MORPH_S = 0.18;
const POP_S = 0.28;
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

  /* Website content fades in during the dock phase.
     Children are NOT mounted until siteVisible to prevent the Hero
     canvas, MeshGradient shader, and Three.js from competing with the
     preloader animations for GPU time. */
  const siteVisible = phase === "dock" || phase === "done";
  const [mountSite, setMountSite] = useState(skipIntroAnim);
  useEffect(() => {
    if (siteVisible && !mountSite) setMountSite(true);
  }, [siteVisible, mountSite]);

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
        style={{ willChange: "opacity" }}
        aria-hidden={!siteVisible}
      >
        {mountSite ? children : null}
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
   MOBILE HOOK — SSR-safe, updates on resize
   ========================================================================== */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
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
            willChange: "opacity",
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
          exit={{ opacity: 0, scale: 1.6 }}
          transition={{
            duration: 0.38,
            ease: EASE_FADE,
          }}
          style={{ willChange: "transform, opacity" }}
        >
          <div
            style={{
              width: 240,
              height: 240,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(109,40,217,0.7), rgba(124,58,237,0.3) 45%, transparent 72%)",
              filter: "blur(8px)",
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
          transition={{ duration: 0.3, ease: EASE_FADE }}
          style={{ willChange: "opacity" }}
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
                priority
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
                priority
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
  const [centeredY, setCenteredY] = useState(0);
  useEffect(() => {
    const calc = () => setCenteredY(window.innerHeight / 2 - 20 - 72);
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

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
      transition={{ duration: 0.3, ease: "easeInOut" }}
      style={{ willChange: "transform" }}
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
            duration: skipIntroAnim ? 0 : 0.42,
            ease: EASE_FADE,
            delay: skipIntroAnim ? 0 : 0.18,
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
        style={{ top: "20px", willChange: "transform, opacity" }}
        initial={
          skipIntroAnim
            ? { x: "-50%", y: 0, scale: 1, opacity: 1 }
            : { x: "-50%", y: centeredY, scale: 0, opacity: 0 }
        }
        animate={{
          x: "-50%",
          y: docked ? 0 : centeredY,
          scale: visible ? 1 : 0,
          opacity: visible ? 1 : 0,
        }}
        transition={
          skipIntroAnim
            ? { duration: 0 }
            : {
                y: { duration: centered ? 0.62 : 0.36, ease: EASE_MORPH },
                scale: {
                  duration: centered ? 0.62 : 0.32,
                  ease: centered ? EASE_POP : EASE_MORPH,
                },
                opacity: { duration: centered ? 0.42 : 0.26, ease: EASE_FADE },
              }
        }
      >
        {/* Logo */}
        <motion.div
          className="relative shrink-0"
          style={{ zIndex: 2, willChange: "transform" }}
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
            duration: skipIntroAnim ? 0 : (centered ? 0.58 : 0.38),
            ease: EASE_MORPH,
          }}
        >
          <LogoMark glass={centered} />
        </motion.div>

        {/* Novonus wordmark — appears large during the logoPop intro,
            then stays visible at a smaller size when docked in the top bar. 
            Two layers crossfade: the large intro text fades out while the
            small docked text fades in, avoiding ugly font-size interpolation. */}
        <div
          style={{
            overflow: "hidden",
            flexShrink: 0,
            zIndex: 1,
            position: "relative",
            width: centered ? 240 : 120,
            transition: `width ${centered ? 0 : 0.32}s`,
          }}
        >
          <motion.div
            style={{ willChange: "transform, opacity" }}
            initial={
              skipIntroAnim
                ? { clipPath: "inset(0 0% 0 0)", opacity: 1 }
                : { clipPath: "inset(0 100% 0 0)", opacity: 0 }
            }
            animate={{
              clipPath: centered || (phase === "done") ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)",
              opacity: centered || (phase === "done") ? 1 : 0,
            }}
            transition={{
              duration: centered ? 0.65 : (phase === "done") ? 0.36 : 0.15,
              ease: centered ? EASE_MORPH : EASE_FADE,
              delay: centered ? 0.38 : (phase === "done") ? 0.06 : 0,
            }}
          >
          {/* Large intro wordmark — visible only during logoPop */}
          <motion.span
            className="block select-none"
            initial={{ opacity: skipIntroAnim ? 0 : 0 }}
            animate={{ opacity: centered ? 1 : 0 }}
            transition={{ duration: centered ? 0.42 : 0.12, ease: EASE_FADE, delay: centered ? 0.38 : 0 }}
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
        </div>
      </motion.div>

      {/* Nav links — right side of top bar, cream text, no styling */}
      {docked && (
        <motion.nav
          className="pointer-events-auto absolute z-[120] hidden items-center gap-10 md:flex"
          style={{ top: "16px", right: "clamp(6rem, 10vw, 12rem)", height: "56px" }}
          initial={skipIntroAnim ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: phase === "done" ? 1 : 0 }}
          transition={{ duration: 0.4, ease: EASE_FADE, delay: skipIntroAnim ? 0 : 0.15 }}
        >
          {([
            { label: "What", p: 0.130 },
            { label: "Who",  p: 0.440 },
            { label: "How",  p: 0.550 },
          ] as { label: string; p: number }[]).map(({ label, p }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                const el = document.getElementById("force-grounded");
                if (!el) return;
                const top = el.getBoundingClientRect().top + window.scrollY;
                window.scrollTo({ top: top + p * el.offsetHeight, behavior: "smooth" });
              }}
              style={{
                fontFamily: "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
                fontSize: "16px",
                fontWeight: 500,
                letterSpacing: "0.04em",
                color: "rgba(245, 239, 229, 0.82)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                lineHeight: 1,
              }}
            >
              {label}
            </button>
          ))}
        </motion.nav>
      )}
    </motion.div>
  );
}

/* ============================================================================
   SIDEBAR
   ========================================================================== */

const NAV_ITEMS = ["System", "Markets", "Insights", "Resources", "About"];

function Sidebar({ onContactClick }: { onContactClick?: () => void }) {
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
            <button
              type="button"
              onClick={onContactClick}
              className="liquid-glass-btn liquid-glass-cta group relative flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-ink"
            >
              <span className="relative z-10">Contact</span>
              <Arrow className="relative z-10 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </button>
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
  boxAlphaProgress,
  dotFillProgress,
  dotOpacity,
}: {
  morphProgress?: MotionValue<number>;
  invertProgress?: MotionValue<number>;
  eyeMorphProgress?: MotionValue<number>;
  eyeOffsetProgress?: MotionValue<number>;
  earthMorphProgress?: MotionValue<number>;
  earthOffsetProgress?: MotionValue<number>;
  cliffMorphProgress?: MotionValue<number>;
  cliffPhaseProgress?: MotionValue<number>;
  boxAlphaProgress?: MotionValue<number>;
  dotFillProgress?: MotionValue<number>;
  dotOpacity?: MotionValue<number>;
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
    const PURPLE = { r: 139, g: 92, b: 246 };
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

    /* Pre-allocated draw buffers — reused every frame to avoid GC pressure.
       Instead of N individual arc+fill calls we collect positions into typed
       arrays and flush with 2 batch fill() calls (inside + outside) plus a
       small number of individual calls for the rare elevated dots. */
    const TWO_PI = Math.PI * 2;
    const MAX_DOTS = 8000;
    const dInsideX = new Float32Array(MAX_DOTS);
    const dInsideY = new Float32Array(MAX_DOTS);
    const dOutsideX = new Float32Array(MAX_DOTS);
    const dOutsideY = new Float32Array(MAX_DOTS);
    const MAX_ELEV = 512;
    const dElevX = new Float32Array(MAX_ELEV);
    const dElevY = new Float32Array(MAX_ELEV);
    const dElevR = new Float32Array(MAX_ELEV);
    const dElevFill: string[] = new Array(MAX_ELEV).fill('');

    /* Frame-skip counter — when nothing is animating, render at ~30fps
       instead of 60fps to halve GPU load. */
    let skipFrame = false;

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
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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
      const boxAlpha = boxAlphaProgress
        ? Math.max(0, Math.min(1, boxAlphaProgress.get()))
        : 1;
      const dotFill = dotFillProgress
        ? Math.max(0, Math.min(1, dotFillProgress.get()))
        : 0;
      const dotOpacityVal = dotOpacity
        ? Math.max(0, Math.min(1, dotOpacity.get()))
        : 1;
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

      /* Idle frame-skip: when nothing is moving (no cursor, no waves,
         no morph in progress) render at ~30fps instead of 60fps. */
      const isIdleFrame = morphDelta < 0.0005 && !cursor.has && waves.length === 0;
      skipFrame = isIdleFrame ? !skipFrame : false;
      if (skipFrame) {
        raf = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);
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
      const outsideDotFactor = Math.max(0.12, dotOpacityVal);
      const baseFillInside = `rgba(${baseR | 0}, ${baseG | 0}, ${baseB | 0}, ${baseAlpha * dotOpacityVal})`;
      const baseFillOutside = `rgba(${baseR | 0}, ${baseG | 0}, ${baseB | 0}, ${baseAlpha * outsideDotFactor})`;

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
      const tiltFade = morph * (1 - eyeMorph) * (1 - cliffPhase);
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

      const textAlpha = boxAlpha;
      const drawBox = textAlpha > 0.01;
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
      const padW = boxW / 2 + 16;
      const padH = boxH / 2 + 16;

      /* ── BATCHED DOT DRAW ──────────────────────────────────────────────
         Collect positions into pre-allocated typed arrays (one pass),
         then flush with 2 batch fill() calls + a small set of individual
         fills for the rare elevated dots. Reduces GPU draw calls from
         N (3 000+) per frame down to ~3–5 in the common case.          */
      let insideCount = 0;
      let outsideCount = 0;
      let elevCount = 0;

      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const s1X = cell.gx + (cell.bx - cell.gx) * morph;
        const s1Y = cell.gy + (cell.by - cell.gy) * morph;
        const s2X = s1X + (cell.ex - s1X) * eyeMorph;
        const s2Y = s1Y + (cell.ey - s1Y) * eyeMorph;
        const s3X = s2X + (cell.fx - s2X) * earthMorph;
        const s3Y = s2Y + (cell.fy - s2Y) * earthMorph;
        const baseX = s3X + (cell.cx - s3X) * cliffMorph;
        const baseY = s3Y + (cell.cy - s3Y) * cliffMorph;

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
          elev += amp * Math.exp(-(delta * delta) / (2 * WAVE_THICKNESS * WAVE_THICKNESS));
        }
        elev *= cursorAttenuation;

        const isInsideBox = Math.abs(baseX - canvasCenterX) < padW && Math.abs(baseY - canvasCenterY) < padH;

        if (!hasAnyMotion || elev < 0.012 || (!isInsideBox && dotOpacityVal < 1)) {
          if (isInsideBox) {
            dInsideX[insideCount] = baseX;
            dInsideY[insideCount++] = baseY;
          } else {
            dOutsideX[outsideCount] = baseX;
            dOutsideY[outsideCount++] = baseY;
          }
          continue;
        }

        if (elevCount < MAX_ELEV) {
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
          const dotFactor = isInsideBox ? dotOpacityVal : outsideDotFactor;
          const alpha = (baseAlpha + Math.min(elevClamped, 1) * 0.55 * cursorAttenuation) * dotFactor;
          dElevX[elevCount] = baseX;
          dElevY[elevCount] = baseY - lift;
          dElevR[elevCount] = size;
          dElevFill[elevCount++] = `rgba(${cr | 0},${cg | 0},${cb | 0},${alpha})`;
        }
      }

      // Batch draw: inside dots — moveTo before each arc lifts the pen so
      // the canvas doesn't draw connecting lines between circles.
      if (insideCount > 0) {
        ctx.fillStyle = baseFillInside;
        ctx.beginPath();
        for (let i = 0; i < insideCount; i++) {
          ctx.moveTo(dInsideX[i] + BASE_SIZE, dInsideY[i]);
          ctx.arc(dInsideX[i], dInsideY[i], BASE_SIZE, 0, TWO_PI);
        }
        ctx.fill();
      }
      // Batch draw: outside dots
      if (outsideCount > 0) {
        ctx.fillStyle = baseFillOutside;
        ctx.beginPath();
        for (let i = 0; i < outsideCount; i++) {
          ctx.moveTo(dOutsideX[i] + BASE_SIZE, dOutsideY[i]);
          ctx.arc(dOutsideX[i], dOutsideY[i], BASE_SIZE, 0, TWO_PI);
        }
        ctx.fill();
      }
      // Individual draw: elevated dots (rare — cursor/wave interaction only)
      for (let i = 0; i < elevCount; i++) {
        ctx.fillStyle = dElevFill[i];
        ctx.beginPath();
        ctx.arc(dElevX[i], dElevY[i], dElevR[i], 0, TWO_PI);
        ctx.fill();
      }

      // Box outline — batched when no cursor interaction, segmented only when hovering.
      if (drawBox) {
        ctx.lineWidth = 1;
        if (!peakActive) {
          // Fast path: single rect stroke, no per-segment color variation.
          ctx.strokeStyle = `rgba(${baseR | 0},${baseG | 0},${baseB | 0},${baseAlpha * textAlpha})`;
          ctx.beginPath();
          ctx.moveTo(boxMinX, boxMinY);
          ctx.lineTo(boxMaxX, boxMinY);
          ctx.lineTo(boxMaxX, boxMaxY);
          ctx.lineTo(boxMinX, boxMaxY);
          ctx.closePath();
          ctx.stroke();
        } else {
          // Hover path: coarser segments (step=24 instead of 10) for speed.
          const drawSeg = (x: number, y: number) => {
            let elev = 0;
            const dx = x - px;
            const dy = y - py;
            elev += peakAmp * Math.exp(-(dx * dx + dy * dy) / TWO_SIGMA_SQ);
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
            return `rgba(${cr | 0},${cg | 0},${cb | 0},${alpha})`;
          };
          const STEP = 24;
          const strokeLine = (x1: number, y1: number, x2: number, y2: number) => {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const steps = Math.max(1, Math.ceil(Math.sqrt(dx * dx + dy * dy) / STEP));
            for (let i = 0; i < steps; i++) {
              ctx.strokeStyle = drawSeg(x1 + dx * (i + 0.5) / steps, y1 + dy * (i + 0.5) / steps);
              ctx.beginPath();
              ctx.moveTo(x1 + dx * i / steps, y1 + dy * i / steps);
              ctx.lineTo(x1 + dx * (i + 1) / steps, y1 + dy * (i + 1) / steps);
              ctx.stroke();
            }
          };
          strokeLine(boxMinX, boxMinY, boxMaxX, boxMinY);
          strokeLine(boxMaxX, boxMinY, boxMaxX, boxMaxY);
          strokeLine(boxMaxX, boxMaxY, boxMinX, boxMaxY);
          strokeLine(boxMinX, boxMaxY, boxMinX, boxMinY);
        }
      }

      raf = requestAnimationFrame(render);
    };

    // Pause the loop when canvas leaves the viewport (e.g. after scrolling past the hero)
    let paused = false;
    const visObs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && paused) {
        paused = false;
        raf = requestAnimationFrame(render);
      } else if (!entry.isIntersecting) {
        paused = true;
        cancelAnimationFrame(raf);
      }
    }, { threshold: 0 });
    visObs.observe(host);

    raf = requestAnimationFrame(render);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      visObs.disconnect();
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
    boxAlphaProgress,
    dotFillProgress,
    dotOpacity,
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
  "Modern robotics has been training on the wrong data.";

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
  const openContact = useContext(ContactModalCtx);
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

  /* Exit handler — scrolls to scrollYProgress 0.50 of the 230svh
     short-mode section (scroll range 130svh → 0.50 × 1.3 = 0.65 vh).
     That lands with "Modern robotics has been training on the wrong
     data." fully revealed and the three-headline overlay not yet shown. */
  const handleBackToMain = () => {
    setDeepDive(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const sec = sectionRef.current;
        if (!sec) return;
        const rect = sec.getBoundingClientRect();
        const sectionTop = rect.top + window.scrollY;
        const targetY = sectionTop + window.innerHeight * 0.65;
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
      endY = sectionTop + window.innerHeight * 6.4;
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
  /* Fractions scaled from original 370svh design so each animation phase
     covers the same absolute scroll distance at the current 230svh section.
     Scale factor: 370/230 ≈ 1.609.  Hold after last text = only ~82svh. */
  const HERO_DISAPPEAR_START = 0.032;
  const HERO_DISAPPEAR_END = 0.113;
  const HERO_WORD_DURATION = 0.064;
  const invertProgress = useTransform(scrollYProgress, [0, 1], [1, 1]);
  const morphProgress = useTransform(scrollYProgress, [0.177, 0.400], [0, 1]);
  const dotEnterProgress = useTransform(scrollYProgress, [0.080, 0.161], [0, 1]);
  const boxAlphaProgress = useTransform(scrollYProgress, [0.113, 0.161], [1, 0]);

  const dotFillProgress = useTransform(scrollYProgress, [0.113, 0.177], [0, 1]);
  const heroBg = useTransform(invertProgress, [0, 1], ["#f5efe5", "#0f0e0d"]);
  const revealHead = useTransform(
    scrollYProgress,
    [0.400, 0.577],
    [0, SLIDE2_TEXT.length + 7],
  );
  /* All deep-dive morphs (brain → clock → earth → cliffs) are gated
     on `deepDive`. In default (short) mode each raw transform is
     wrapped through a gate that forces 0, so the dots stay locked
     in the brain layout while the three headlines appear together. */
  const eyeMorphRaw = useTransform(scrollYProgress, [0.464, 0.594], [0, 1]);
  const eyeOffsetRaw = useTransform(scrollYProgress, [0.464, 0.594], [0, 1]);
  const eyeMorphProgress = useTransform(eyeMorphRaw, (v) => (deepDive ? v : 0));
  const eyeOffsetProgress = useTransform(eyeOffsetRaw, (v) => (deepDive ? v : 0));
  /* Earth morph + earth offset run concurrently. The offset eases
     the canvas from +right (clock pose) all the way to −left so
     the earth ends up on the OPPOSITE side from the clock. The
     long sweep automatically pulls velocity trails out of every
     dot via the existing partial-fade clear. */
  const earthMorphRaw = useTransform(scrollYProgress, [0.664, 0.744], [0, 1]);
  const earthOffsetRaw = useTransform(scrollYProgress, [0.664, 0.744], [0, 1]);
  /* Fade the Current Teleop text out the instant earth morph begins */
  const visionTextExit = useTransform(scrollYProgress, [0.649, 0.669], [1, 0]);
  const erodingTextExit = useTransform(scrollYProgress, [0.799, 0.819], [1, 0]);
  const earthMorphProgress = useTransform(earthMorphRaw, (v) => (deepDive ? v : 0));
  const earthOffsetProgress = useTransform(earthOffsetRaw, (v) => (deepDive ? v : 0));
  /* Cliffs morph + phase. cliffMorph drives the dot positions from
     the earth → two-cliff-with-a-gap layout. cliffPhase ALSO drives
     the canvas back to centered+full-scale (lerps the eyeOffset/
     earthOffset translate and scale back to neutral) so the cliffs
     read at full size with the gap centered on the viewport. */
  const cliffMorphRaw = useTransform(scrollYProgress, [0.814, 0.894], [0, 1]);
  const cliffPhaseRaw = useTransform(scrollYProgress, [0.814, 0.894], [0, 1]);
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
    setStage(v > 0.577 && v < 0.625 ? 3 : 0);
    /* visionReady / erodingReady / cliffReady trigger the entrance
       of the per-stage cliff overlays (Current Teleop / Skilled
       labor / Sim-to-real gap). They are gated on `deepDive` so the
       short path never reveals them — instead the `HeadlinesTogether`
       overlay shows all three titles simultaneously over the brain. */
    setVisionReady(deepDive && v > 0.594);
    setErodingReady(deepDive && v > 0.744);
    setCliffReady(deepDive && v > 0.894);
  });
  useLayoutEffect(() => {
    /* Initial scroll-based sync runs once, BEFORE first paint, so
       motion components mount with the correct ready-flag state
       (and `initial` matches `animate` → no entrance animation). */
    const v = scrollYProgress.get();
    if (deepDive && v > 0.594) setVisionReady(true);
    if (deepDive && v > 0.744) setErodingReady(true);
    if (deepDive && v > 0.894) setCliffReady(true);
    setHydrated(true);
  }, [scrollYProgress, deepDive]);

  /* Shared opacity for the "three problems + Learn More" overlay.
     Fades in once the brain has fully formed and slide-2 text has
     peaked, then holds for most of the short-path section before
     fading as the section exits. Forced to 0 in deep-dive mode. */
  const headlinesTogetherRaw = useTransform(
    scrollYProgress,
    [0.625, 0.738],
    [0, 1],
  );
  const headlinesTogetherOpacity = useTransform(
    headlinesTogetherRaw,
    (v) => (deepDive ? 0 : v),
  );
  const learnMorePointer = useTransform(headlinesTogetherRaw, (v) =>
    !deepDive && v > 0.5 ? "auto" : "none",
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
          height: deepDive ? "880svh" : "230svh",
        }}
      >
        {/* Invisible scroll-measurement marker. */}
        <div
          ref={pinRef}
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 top-0"
          style={{ height: deepDive ? "880svh" : "230svh" }}
        />
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          {/* Hero content — fills the viewport while pinned */}
          <div className="hero-canvas-host absolute inset-0 overflow-hidden">
          {/* Scroll-driven cream → dark backdrop. Replaces the static
              PaperBackground for the hero so it can invert with the
              dot color crossfade. */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0"
            style={{ backgroundColor: heroBg }}
          />

          {/* Ethereal shadow — hero background, fades out with slide-1 content */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{ opacity: boxAlphaProgress }}
          >
            <EtherealShadow
              color="rgba(109, 40, 217, 0.85)"
              animation={{ scale: 100, speed: 90 }}
              noise={{ opacity: 1, scale: 1.2 }}
              sizing="fill"
            />
          </motion.div>

          {/* Topographical dots — dots hidden on slide 1, box always visible */}
          <TopographicalDots
            morphProgress={morphProgress}
            invertProgress={invertProgress}
            eyeMorphProgress={eyeMorphProgress}
            eyeOffsetProgress={eyeOffsetProgress}
            earthMorphProgress={earthMorphProgress}
            earthOffsetProgress={earthOffsetProgress}
            cliffMorphProgress={cliffMorphProgress}
            cliffPhaseProgress={cliffPhaseProgress}
            boxAlphaProgress={boxAlphaProgress}
            dotFillProgress={dotFillProgress}
            dotOpacity={dotEnterProgress}
          />

          {/* CTA buttons — below the canvas box, at the bottom of the hero */}
          <motion.div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "calc(50% + min(42.5vh, 290px) + 1rem)",
              zIndex: 10,
              opacity: boxAlphaProgress,
              display: "flex",
              justifyContent: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
              padding: "0 1rem",
            }}
          >
            <a
              href="https://novonus.com/demo"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
                fontSize: "clamp(0.85rem, 0.95vw, 1rem)",
                fontWeight: 600,
                padding: "0.8rem 1.8rem",
                border: "1px solid rgba(255,255,255,0.6)",
                borderRadius: "0.625rem",
                backgroundColor: "#ffffff",
                color: "#0f0e0d",
                letterSpacing: "0.01em",
                cursor: "pointer",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                whiteSpace: "nowrap",
              }}
            >
              View Demo
              <span aria-hidden style={{ fontSize: "0.9em" }}>↗</span>
            </a>
            <button
              type="button"
              onClick={openContact}
              style={{
                fontFamily: "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
                fontSize: "clamp(0.85rem, 0.95vw, 1rem)",
                fontWeight: 600,
                padding: "0.8rem 1.8rem",
                border: "1px solid rgba(255,255,255,0.6)",
                borderRadius: "0.625rem",
                backgroundColor: "#ffffff",
                color: "#0f0e0d",
                letterSpacing: "0.01em",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                whiteSpace: "nowrap",
              }}
            >
              Contact
            </button>
          </motion.div>


          {/* Slide 2 — single sentence revealed letter by letter as the
              user scrolls. Vertically centered, generous max-width so
              lines run long. Per-char visual reveal is owned by the
              transforms inside RevealChar; the wrapper additionally
              fades the whole sentence out at 0.85 → 0.90 to make room
              for slide 3. aria-hidden flips off after full reveal so
              screen readers get the finished sentence as one unit. */}
          {!deepDive && (
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
          )}

          {/* THREE PROBLEMS + LEARN MORE — short-path payoff. All three
              problem titles appear together with a Learn More button
              on the right. Fades in once the brain is fully formed
              and slide-2 text has peaked. Hidden in deep-dive mode. */}
          {hydrated && (
            <motion.div
              className="absolute inset-x-0 z-[7] hidden md:block"
              style={{
                bottom: "clamp(4rem, 8vh, 7rem)",
                opacity: headlinesTogetherOpacity,
              }}
              aria-hidden={deepDive}
            >
              <div className="mx-auto flex max-w-[1320px] flex-col items-center gap-8 px-10 lg:px-14">
                <div className="pointer-events-none grid w-full grid-cols-3 gap-8 lg:gap-12">
                  {[
                    {
                      tokens: MODERN_TELEOP_TITLE_TOKENS,
                      note: "Vision-only stacks plateau on contact-rich tasks. Tactile force sensors aren't accurate enough for precise manufacturing.",
                    },
                    {
                      tokens: ERODING_TITLE_TOKENS,
                      note: "Skilled labor is really expensive now. 50M manufacturing roles projected unfilled by 2030.",
                    },
                    {
                      tokens: GAP_TITLE_TOKENS,
                      note: "No simulator yet models friction, deformation, or multi-point contact.",
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
                <motion.button
                  type="button"
                  onClick={handleLearnMore}
                  style={{
                    pointerEvents: learnMorePointer,
                    fontFamily:
                      "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
                    fontSize: "clamp(0.85rem, 0.95vw, 1rem)",
                    fontWeight: 500,
                    padding: "0.75rem 1.5rem",
                    border: "1px solid rgba(139, 92, 246, 0.45)",
                    borderRadius: "999px",
                    backgroundColor: "rgba(109, 40, 217, 0.15)",
                    color: "rgba(221, 214, 254, 0.95)",
                    letterSpacing: "0.02em",
                    cursor: "pointer",
                    backdropFilter: "blur(8px) saturate(140%)",
                    WebkitBackdropFilter: "blur(8px) saturate(140%)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.6rem",
                  }}
                >
                  Learn more
                  <span aria-hidden style={{ display: "inline-block" }}>→</span>
                </motion.button>
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
          <motion.div
            className="pointer-events-none absolute inset-0 z-[7] hidden items-center md:flex"
            aria-hidden={!visionReady}
            style={{ opacity: visionTextExit }}
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
          </motion.div>
          )}

          {/* "The skilled labor base is eroding" — appears on the
              RIGHT side after the clock has morphed into the earth
              and slid all the way to the left. Same 3-stage colour
              wipe (green → purple/pink → white) gated on
              `erodingReady`. Mirrors the modern-teleop block's
              layout but anchored to the right edge. */}
          {hydrated && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-[7] hidden items-center md:flex"
            aria-hidden={!erodingReady}
            style={{ opacity: erodingTextExit }}
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
          </motion.div>
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
          <>
          {/* Border — fades on scroll exactly like the original canvas box */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center"
            style={{ opacity: boxAlphaProgress }}
          >
            <div
              className="border border-[rgba(245,239,229,0.18)]"
              style={{ width: "min(92vw, 1060px)", height: "min(85svh, 580px)" }}
            />
          </motion.div>
          <motion.div
            className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center px-6 md:px-10"
            style={{ opacity: boxAlphaProgress }}
          >
            <div className="pointer-events-none flex flex-col items-center justify-center" style={{ width: "min(92vw, 1060px)", height: "min(85svh, 580px)" }}>
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
                      "var(--font-jetbrains-mono), 'JetBrains Mono', 'Fira Code', monospace",
                    fontWeight: 400,
                    fontStyle: "normal",
                    fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
                    lineHeight: 1.5,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
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
                            color={isBracket ? undefined : "rgba(245, 239, 229, 0.72)"}
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
                      "var(--font-crimson-text), Georgia, 'Times New Roman', serif",
                    fontWeight: 400,
                    fontStyle: "normal",
                    fontSize: "clamp(2.8rem, 5.8vw, 5.4rem)",
                    lineHeight: 1.0,
                    letterSpacing: "-0.015em",
                    margin: 0,
                    color: "rgba(245, 239, 229, 0.96)",
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
                    color: "rgba(245, 239, 229, 0.96)",
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
                    ];
                    const accentTokens = [
                      "vision-only",
                      "and",
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


</>
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
/* ============================================================================
   CONTACT MODAL
   ========================================================================== */

type ContactState = "idle" | "submitting" | "success" | "error";

function ContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<ContactState>("idle");

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setName(""); setEmail(""); setMessage(""); setStatus("idle");
      }, 400);
      return () => clearTimeout(t);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: "9fd2589c-5724-420a-9224-85c431af712b",
          name,
          email,
          message,
        }),
      });
      const data = await res.json();
      setStatus(data.success ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  const IT = "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif";

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid rgba(245,239,229,0.15)",
    padding: "0.55rem 0",
    color: "#f5efe5",
    fontFamily: IT,
    fontSize: "14px",
    outline: "none",
    lineHeight: 1.6,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontFamily: IT,
    fontSize: "10px",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "rgba(245,239,229,0.38)",
    marginBottom: "0.3rem",
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="contact-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
          }}
        >
          <motion.div
            key="contact-card"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 520,
              background: "#1a1917",
              borderRadius: 8,
              overflow: "hidden",
              boxShadow: "0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(245,239,229,0.07)",
              fontFamily: IT,
            }}
          >
            {/* Gradient accent line */}
            <div style={{
              height: 1,
              background: "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.6) 30%, rgba(110,231,183,0.6) 70%, transparent 100%)",
            }} />

            <div style={{ padding: "1.75rem 2rem 2.25rem" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.75rem" }}>
                <div>
                  <p style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(245,239,229,0.35)", marginBottom: "0.35rem", fontFamily: IT }}>
                    Novonus
                  </p>
                  <h2 style={{ fontSize: "22px", fontWeight: 600, color: "#f5efe5", lineHeight: 1.2, margin: 0, fontFamily: IT }}>
                    Get in touch
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "rgba(245,239,229,0.35)",
                    padding: "0.2rem",
                    lineHeight: 1,
                    marginTop: "0.15rem",
                    transition: "color 0.15s",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 3L13 13M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {status === "success" ? (
                <div style={{ textAlign: "center", padding: "1.5rem 0 0.5rem" }}>
                  <p style={{ fontSize: "15px", fontWeight: 500, color: "rgba(110,231,183,0.9)", marginBottom: "0.5rem", fontFamily: IT }}>
                    Message sent.
                  </p>
                  <p style={{ fontSize: "13px", color: "rgba(245,239,229,0.42)", fontFamily: IT }}>
                    We&apos;ll be in touch shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>
                    <div>
                      <label style={labelStyle}>Name</label>
                      <input
                        type="text"
                        className="contact-field"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="Your name"
                        style={fieldStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Email</label>
                      <input
                        type="email"
                        className="contact-field"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="your@email.com"
                        style={fieldStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Message</label>
                      <textarea
                        className="contact-field"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                        placeholder="What would you like to discuss?"
                        rows={4}
                        style={{ ...fieldStyle, resize: "none" }}
                      />
                    </div>
                  </div>

                  {status === "error" && (
                    <p style={{ fontSize: "12px", color: "rgba(248,113,113,0.8)", marginTop: "1rem", fontFamily: IT }}>
                      Something went wrong — please try again.
                    </p>
                  )}

                  <div style={{ marginTop: "1.75rem" }}>
                    <button
                      type="submit"
                      disabled={status === "submitting"}
                      style={{
                        width: "100%",
                        padding: "0.72rem 1.5rem",
                        background: status === "submitting" ? "rgba(245,239,229,0.08)" : "#f5efe5",
                        color: status === "submitting" ? "rgba(245,239,229,0.35)" : "#1a1917",
                        border: "none",
                        borderRadius: 4,
                        fontFamily: IT,
                        fontSize: "13px",
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                        cursor: status === "submitting" ? "not-allowed" : "pointer",
                        transition: "background 0.18s, color 0.18s",
                      }}
                    >
                      {status === "submitting" ? "Sending…" : "Send message"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SiteFooter() {
  const trackRef = useRef<HTMLDivElement>(null);
  const lineRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || typeof window === "undefined") return;
    // Wait one frame for layout
    const id = requestAnimationFrame(() => {
      const w = el.scrollWidth / 2;
      gsap.fromTo(
        el,
        { x: 0 },
        { x: -w, duration: 30, ease: "none", repeat: -1 }
      );
    });
    return () => {
      cancelAnimationFrame(id);
      gsap.killTweensOf(el);
    };
  }, []);

  const text = "NOVONUS — THE TRAINING LAYER FOR INDUSTRIAL ROBOTICS — ";
  const looped = text.repeat(12);

  return (
    <footer
      className="relative overflow-hidden"
      style={{
        fontFamily: "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif",
        backgroundColor: "#0f0e0d",
        color: "#f5efe5",
      }}
    >
      {/* Gradient accent line */}
      <div
        ref={lineRef}
        style={{
          height: 1,
          background: "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.6) 30%, rgba(110,231,183,0.6) 70%, transparent 100%)",
        }}
      />

      {/* Marquee strip */}
      <div
        style={{
          overflow: "hidden",
          borderBottom: "1px solid rgba(245,239,229,0.06)",
          padding: "1.1rem 0",
        }}
      >
        <div
          ref={trackRef}
          style={{ display: "flex", whiteSpace: "nowrap", width: "max-content" }}
        >
          <span
            className="font-mono text-[9px] uppercase tracking-[0.34em]"
            style={{ color: "rgba(245,239,229,0.20)", display: "inline-block" }}
          >
            {looped}
          </span>
        </div>
      </div>

      {/* Footer content */}
      <div
        className="relative mx-auto max-w-[1400px] px-6 py-10 md:px-10 md:py-12"
      >
        <div
          className="flex flex-col items-start justify-between gap-2 text-[12px] md:flex-row md:items-center md:text-[13px]"
          style={{ color: "rgba(245,239,229,0.38)" }}
        >
          <p style={{ letterSpacing: "0.01em" }}>
            Novonus{" "}
            <span style={{ color: "rgba(245,239,229,0.18)", margin: "0 0.4em" }}>—</span>
            The training layer for industrial robotics
          </p>
          <p style={{ fontVariantNumeric: "tabular-nums" }}>© 2026</p>
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

  const cardRef     = useRef<HTMLDivElement>(null);
  const kickerRef   = useRef<HTMLParagraphElement>(null);
  const headRef     = useRef<HTMLElement>(null);
  const bodyRef     = useRef<HTMLDivElement>(null);
  const tailRef     = useRef<HTMLParagraphElement>(null);
  const visible     = useContext(SectionVisibleCtx);
  const animated    = useRef(false);

  useEffect(() => {
    if (!visible) return;
    return visible.on("change", (v: number) => {
      if (v < 0.05 && animated.current) {
        animated.current = false;
        gsap.set(cardRef.current, { opacity: 0, y: 48, scale: 0.97 });
        gsap.set(kickerRef.current, { opacity: 0, letterSpacing: "0.85em" });
        gsap.set(headRef.current, { opacity: 0, y: 18 });
        gsap.set(bodyRef.current, { opacity: 0 });
        gsap.set(tailRef.current, { opacity: 0, y: 12 });
      }
      if (v > 0.35 && !animated.current) {
        animated.current = true;
        const mm = gsap.matchMedia();
        mm.add("(prefers-reduced-motion: no-preference)", () => {
          const tl = gsap.timeline();
          tl.fromTo(
            cardRef.current,
            { opacity: 0, y: 48, scale: 0.97 },
            { opacity: 1, y: 0, scale: 1, duration: 1.0, ease: "power3.out" }
          );
          tl.fromTo(
            kickerRef.current,
            { opacity: 0, letterSpacing: "0.85em" },
            { opacity: 1, letterSpacing: "0.55em", duration: 0.9, ease: "power2.out" },
            "-=0.6"
          );
          tl.fromTo(
            headRef.current,
            { opacity: 0, y: 18 },
            { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" },
            "-=0.55"
          );
          tl.fromTo(
            bodyRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 0.6, ease: "power2.out" },
            "-=0.4"
          );
          tl.fromTo(
            tailRef.current,
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" },
            "-=0.3"
          );
        });
        mm.add("(prefers-reduced-motion: reduce)", () => {
          gsap.set([cardRef.current, kickerRef.current, headRef.current, bodyRef.current, tailRef.current], { opacity: 1, y: 0, scale: 1 });
        });
      }
    });
  }, [visible]);

  return (
    <div
      className="section-offscreen relative flex min-h-[100svh] w-full items-center justify-center px-6 md:px-14"
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
        ref={cardRef}
        className="relative mx-auto w-full max-w-[1180px]"
        style={{
          backgroundColor: "#ece4d2",
          border: "1px solid rgba(26, 23, 20, 0.14)",
          borderRadius: "26px",
          padding: "clamp(2.6rem, 5.4vw, 4.4rem) clamp(2rem, 5vw, 4rem)",
          boxShadow: "0 1px 0 rgba(255, 255, 255, 0.45) inset",
          opacity: 0,
        }}
      >
        {/* INTRODUCING — kicker sits at the top of the framed card,
            centered, with generous letter-spacing so it reads as
            a running head over the entry below. */}
        <p
          ref={kickerRef}
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
        <header ref={headRef} style={{ marginBottom: "1.8rem" }}>
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
        <div ref={bodyRef} className="grid grid-cols-1 gap-7 md:grid-cols-2 md:gap-12">
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
          ref={tailRef}
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
   CROSSFADE STAGE — one constant cream background, content crossfades in place

   The five cream sections share a SINGLE pinned, full-screen cream stage that
   never moves and has no rounded corners. All sections are stacked absolutely
   inside it; only their opacity (and, for tall ones, an internal scroll) is
   driven by the page scroll.

   Per-section scroll timeline (px), measured from real content height:

     ┌─ HOLD ───────────┬─ SCROLL-THROUGH ─────┬─ CROSSFADE ──────────┐
     │ text fully shown, │ tall content slides  │ this text fades out, │
     │ nothing moving    │ up to reveal bottom  │ next text fades in   │
     │ opacity 1, y 0    │ opacity 1, y 0→bottom │ opacity 1→0 / 0→1    │
     └───────────────────┴──────────────────────┴──────────────────────┘

   Reading (scroll-through) and transitioning (crossfade) never overlap, so
   the scroll and the fade never fight each other. Short sections simply have
   a zero-length scroll-through. The next section's fade-in is the SAME scroll
   window as the current section's fade-out — a true crossfade on one
   unchanging background.
   ========================================================================== */

function StageMeshBackground() {
  const { phase } = useIntro();
  const [dims, setDims] = useState({ width: 1920, height: 1080 });
  useEffect(() => {
    const update = () => setDims({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  if (phase !== "done") return <div style={{ position: "absolute", inset: 0, zIndex: 0, background: "#0f0e0d" }} />;
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
      <MeshGradient
        width={dims.width}
        height={dims.height}
        colors={["#f5efe5", "#e8d5b7", "#c9b0e8", "#e8d0f5", "#d4c5a9", "#f0e6d3"]}
        distortion={1.2}
        swirl={0.6}
        speed={0.2}
        grainMixer={0}
        grainOverlay={0}
      />
    </div>
  );
}

const STAGE_HOLD = 0.45; // viewport-heights a section stays fully visible
const STAGE_CROSSFADE = 0.4; // viewport-heights the transition spans
/* Smooth, slightly cinematic ease for the leave/enter motion. */
const EASE_STAGE = cubicBezier(0.4, 0, 0.2, 1);

type StageWindow = {
  fadeIn: [number, number];
  fadeOut: [number, number];
  read: [number, number];
  travel: number;
  isFirst: boolean;
  isLast: boolean;
};

function CrossfadeLayer({
  index,
  progress,
  win,
  onMeasure,
  children,
}: {
  index: number;
  progress: MotionValue<number>;
  win: StageWindow;
  onMeasure: (index: number, height: number) => void;
  children: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  /* Measure natural content height (the inner div is height:auto even though
     the layer above it is pinned to the viewport box). ResizeObserver keeps it
     correct across font swap, responsive reflow and window resize. */
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const report = () => onMeasure(index, el.offsetHeight);
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [index, onMeasure]);

  /* No fade. Same diagonal mask-wipe the Hero uses to make its title text
     vanish on scroll. `wipe` goes 0 (fully shown) → 1 (fully wiped away).
       fadeIn window  : wipe 1 → 0  (incoming text un-wipes into view)
       fadeOut window : wipe 0 → 1  (outgoing text wipes itself away)
     The two windows never overlap a single layer, so each value is just one
     ramp; summing them keeps it 0 while the section is being read. */
  const wipeIn = useTransform(progress, win.fadeIn, [win.isFirst ? 0 : 1, 0], {
    ease: EASE_STAGE,
  });
  const wipeOut = useTransform(progress, win.fadeOut, [0, win.isLast ? 0 : 1], {
    ease: EASE_STAGE,
  });
  const maskImage = useTransform(() => {
    const t = wipeIn.get() + wipeOut.get();
    return `linear-gradient(46deg, transparent ${(-100 + 200 * t).toFixed(1)}%, #000 ${(200 * t).toFixed(1)}%)`;
  });

  /* Subtle directional drift so leave/enter read as motion, not a clip alone:
     outgoing text glides up as it wipes out, incoming rises into place. */
  const enterY = useTransform(progress, win.fadeIn, [win.isFirst ? 0 : 48, 0], {
    ease: EASE_STAGE,
  });
  const exitY = useTransform(progress, win.fadeOut, [0, win.isLast ? 0 : -48], {
    ease: EASE_STAGE,
  });
  const readY = useTransform(progress, win.read, [0, win.travel]);
  const y = useTransform(() => readY.get() + enterY.get() + exitY.get());

  /* Disable interaction once a layer is more than half wiped away. */
  const pointerEvents = useTransform(() =>
    wipeIn.get() + wipeOut.get() > 0.5 ? "none" : "auto",
  );

  /* 0 when section is wiped away, 1 when fully visible. */
  const sectionVisible = useTransform(() => {
    const t = wipeIn.get() + wipeOut.get();
    return Math.max(0, 1 - t * 2.5);
  });

  return (
    <motion.div
      style={{ position: "absolute", inset: 0, pointerEvents }}
    >
      <motion.div
        style={{
          y,
          maskImage,
          WebkitMaskImage: maskImage,
          width: "100%",
          willChange: "transform",
        }}
      >
        <div ref={contentRef} style={{ width: "100%" }}>
          <SectionVisibleCtx.Provider value={sectionVisible}>
            {children}
          </SectionVisibleCtx.Provider>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* Three.js ambient dust — tiny cream-section particles that drift slowly upward.
   Positioned absolute to fill whatever parent it lives in. */
function FloatingDust() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 5;

    const N = 65;
    const positions = new Float32Array(N * 3);
    const velocities = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
      velocities[i * 2]     = (Math.random() - 0.5) * 0.0015;
      velocities[i * 2 + 1] = Math.random() * 0.0008 + 0.0002;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x0f0e0d,
      size: 0.025,
      transparent: true,
      opacity: 0.15,
      sizeAttenuation: true,
    });

    const mesh = new THREE.Points(geo, mat);
    scene.add(mesh);

    let raf = 0;
    let paused = false;
    const tick = () => {
      if (paused) return;
      raf = requestAnimationFrame(tick);
      const pos = geo.attributes.position.array as Float32Array;
      for (let i = 0; i < N; i++) {
        pos[i * 3]     += velocities[i * 2];
        pos[i * 3 + 1] += velocities[i * 2 + 1];
        if (pos[i * 3]     >  7) pos[i * 3]     = -7;
        if (pos[i * 3]     < -7) pos[i * 3]     =  7;
        if (pos[i * 3 + 1] >  5) pos[i * 3 + 1] = -5;
      }
      geo.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
    };

    const visObs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && paused) {
        paused = false;
        tick();
      } else if (!entry.isIntersecting) {
        paused = true;
        cancelAnimationFrame(raf);
      }
    }, { threshold: 0 });
    visObs.observe(canvas);
    tick();

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      visObs.disconnect();
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

function CrossfadeStage({ sections }: { sections: ReactNode[] }) {
  const N = sections.length;
  const outerRef = useRef<HTMLDivElement>(null);
  const [vh, setVh] = useState(0);
  const [heights, setHeights] = useState<number[]>(() => Array(N).fill(0));

  useLayoutEffect(() => {
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const onMeasure = useCallback((i: number, h: number) => {
    setHeights((prev) => {
      if (Math.abs((prev[i] ?? 0) - h) < 1) return prev;
      const next = prev.slice();
      next[i] = h;
      return next;
    });
  }, []);

  /* Build the pixel timeline from measured heights, then express every window
     as a fraction of total scroll T so it maps straight onto scrollYProgress. */
  const safeVh = vh || 800;
  const hold = safeVh * STAGE_HOLD;
  const crossfade = safeVh * STAGE_CROSSFADE;

  let cursor = 0;
  const segs = sections.map((_, i) => {
    const contentH = heights[i] || safeVh;
    const scrollThrough = Math.max(0, contentH - safeVh);
    const readStart = cursor;
    const transStart = cursor + hold; // translate begins after the hold
    const readEnd = transStart + scrollThrough;
    cursor = readEnd;
    const isLast = i === N - 1;
    let fadeOutStart = 0;
    let fadeOutEnd = 0;
    if (!isLast) {
      fadeOutStart = cursor;
      cursor += crossfade;
      fadeOutEnd = cursor;
    }
    return {
      readStart,
      transStart,
      readEnd,
      fadeOutStart,
      fadeOutEnd,
      scrollThrough,
      isLast,
    };
  });
  const T = Math.max(cursor, 1);

  const windows: StageWindow[] = segs.map((s, i) => {
    const isFirst = i === 0;
    /* Off-range sentinels so the value clamps to a constant: the first section
       is always visible until its fade-out; the last never fades out. */
    const fadeIn: [number, number] = isFirst
      ? [-2, -1]
      : [segs[i - 1].fadeOutStart / T, segs[i - 1].fadeOutEnd / T];
    const fadeOut: [number, number] = s.isLast
      ? [2, 3]
      : [s.fadeOutStart / T, s.fadeOutEnd / T];
    const readA = s.transStart / T;
    const readB = s.readEnd / T;
    const read: [number, number] =
      readB > readA ? [readA, readB] : [readA, readA + 1e-4];
    return {
      fadeIn,
      fadeOut,
      read,
      travel: -s.scrollThrough,
      isFirst,
      isLast: s.isLast,
    };
  });

  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ["start start", "end end"],
  });

  return (
    <div
      ref={outerRef}
      style={{ position: "relative", height: `calc(100svh + ${T}px)` }}
    >
      <div
        className="sticky top-0 h-[100svh] overflow-hidden"
      >
        <StageMeshBackground />
        {sections.map((node, i) => (
          <CrossfadeLayer
            key={i}
            index={i}
            progress={scrollYProgress}
            win={windows[i]}
            onMeasure={onMeasure}
          >
            {node}
          </CrossfadeLayer>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   SCROLL SECTION — simple wrapper that provides SectionVisibleCtx via
   IntersectionObserver, replacing the CrossfadeLayer's wipe-based trigger.
   ========================================================================== */
function ScrollSection({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useMotionValue(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { visible.set(entry.isIntersecting ? 1 : 0); },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible]);
  return (
    <div ref={ref}>
      <SectionVisibleCtx.Provider value={visible}>
        {children}
      </SectionVisibleCtx.Provider>
    </div>
  );
}

/* ── Count-up hook — animates 0→target once when `active` fires ── */
function useCountUp(target: number, active: boolean, duration = 1400): number {
  const [count, setCount] = useState(0);
  const fired = useRef(false);
  useEffect(() => {
    if (!active || fired.current) return;
    fired.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(eased * target));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [active, target, duration]);
  return count;
}

/* ── Typewriter hook — types once when `active` first fires ── */
function useTypewriter(text: string, active: boolean, charDelay = 16): string {
  const [count, setCount] = useState(0);
  const fired = useRef(false);
  useEffect(() => {
    if (!active || fired.current) return;
    fired.current = true;
    let i = 0;
    const id = setInterval(() => { i++; setCount(i); if (i >= text.length) clearInterval(id); }, charDelay);
    return () => clearInterval(id);
  }, [active, text, charDelay]);
  return text.slice(0, count);
}

/* ── Step card with typewriter animation ── */
function StepCard({ step, revealed, isLast, s }: {
  step: { num: string; title: string; tagline: string; body: string };
  revealed: boolean;
  isLast: boolean;
  s: { tight: string; ink: string; inkMuted: string; inkGhost: string; divider: string; pad: string };
}) {
  const [ever, setEver] = useState(false);
  useEffect(() => { if (revealed) setEver(true); }, [revealed]);
  const title = useTypewriter(step.title, ever, 28);
  const typing = ever && title.length < step.title.length;
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: ever ? 1 : 0, y: ever ? 0 : 22 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ padding: s.pad, flex: 1, borderBottom: isLast ? "none" : s.divider }}
    >
      <span style={{ fontFamily: s.tight, fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.18em", color: s.inkGhost, textTransform: "uppercase", display: "block", marginBottom: "0.75rem" }}>
        {step.num}
      </span>
      <h3 style={{ fontFamily: s.tight, fontSize: "clamp(1.15rem, 1.45vw, 1.45rem)", fontWeight: 700, letterSpacing: "-0.02em", color: s.ink, margin: 0, marginBottom: "0.35rem" }}>
        {title}{typing && <span style={{ opacity: 0.35 }}>|</span>}
      </h3>
      <p style={{ fontFamily: s.tight, fontSize: "clamp(0.92rem, 1.05vw, 1.05rem)", fontWeight: 600, color: s.inkMuted, margin: 0, marginBottom: "0.65rem", letterSpacing: "-0.01em" }}>
        {ever ? step.tagline : ""}
      </p>
      <p style={{ fontFamily: s.tight, fontSize: "clamp(0.9rem, 1vw, 1rem)", fontWeight: 400, lineHeight: 1.72, color: "rgba(15,14,13,0.52)", margin: 0 }}>
        {ever ? step.body : ""}
      </p>
    </motion.div>
  );
}

/* ============================================================================
   FORCE-GROUNDED SECTION — editorial cream section between the dark Hero
   and Etymology. Establishes the platform pitch with a massive display
   headline and a two-column body layout.
   ========================================================================== */
function ForceGroundedSection() {
  const isMobile = useIsMobile();
  const tight = "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif";
  const jb = "var(--font-jetbrains-mono), 'JetBrains Mono', 'Fira Code', monospace";
  const ink = "rgba(15, 14, 13, 0.96)";
  const inkMuted = "rgba(15, 14, 13, 0.6)";
  const inkGhost = "rgba(15, 14, 13, 0.32)";
  const divider = "1px solid rgba(15, 14, 13, 0.1)";
  const pad = "clamp(2rem, 3vw, 3rem)";

  const steps = [
    {
      num: "01",
      title: "Capture",
      body: "The demonstrator wears our rig, capturing the force intuition cameras and teleoperation miss.",
    },
    {
      num: "02",
      title: "Learn",
      body: "We predict force and intent from muscle signals, grounded in real force data.",
    },
    {
      num: "03",
      title: "Ground",
      body: "We augment demos into thousands of scenarios, keeping only what matches reality.",
    },
    {
      num: "04",
      title: "Deploy",
      body: "A force-aware policy runs on your existing robots, safety supervisor included.",
    },
  ];

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ["start start", "end end"],
  });

  // Phase 1: solution hero holds 0→0.073, fades out 0.073→0.139
  const solutionOpacity = useTransform(scrollYProgress, [0.073, 0.139], [1, 0]);
  const solutionY = useTransform(scrollYProgress, [0.073, 0.139], [0, -40]);

  // Phase 2: fades in 0.125→0.176, fades out 0.396→0.440
  const headerOpacity = useTransform(scrollYProgress, [0.125, 0.176, 0.396, 0.440], [0, 1, 1, 0]);

  // Phase 3: fades in 0.433→0.477, fades out 0.528→0.557
  const phase3Opacity = useTransform(scrollYProgress, [0.433, 0.477, 0.528, 0.557], [0, 1, 1, 0]);

  // Phase 5 (Why Novonus): fades in 0.543→0.587, fades out 0.631→0.670
  const whyOpacity = useTransform(scrollYProgress, [0.543, 0.587, 0.631, 0.670], [0, 1, 1, 0]);

  // Phase 4: fades in 0.660→0.700, fades out 0.745→0.785
  const phase4Opacity = useTransform(scrollYProgress, [0.660, 0.700, 0.745, 0.785], [0, 1, 1, 0]);

  // Pipeline container: fades in at 0.745→0.785, stays
  const pipelineOpacity = useTransform(scrollYProgress, [0.745, 0.785], [0, 1]);

  const [hasPhase2, setHasPhase2] = useState(false);
  const [hasBox1, setHasBox1] = useState(false);
  const [hasBox2, setHasBox2] = useState(false);
  const [hasBox3, setHasBox3] = useState(false);
  const [hasBox4, setHasBox4] = useState(false);
  const [hasPhase3, setHasPhase3] = useState(false);
  const [hasWhy, setHasWhy] = useState(false);
  const [hasPhase4, setHasPhase4] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(-1);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setHasPhase2(v >= 0.125);
    setHasBox1(v >= 0.176);
    setHasBox2(v >= 0.242);
    setHasBox3(v >= 0.301);
    setHasBox4(v >= 0.359);
    setHasPhase3(v >= 0.433);
    setHasWhy(v >= 0.543);
    setHasPhase4(v >= 0.660);
    if      (v < 0.785) setPipelineStep(-1);
    else if (v < 0.828) setPipelineStep(0);
    else if (v < 0.871) setPipelineStep(1);
    else if (v < 0.914) setPipelineStep(2);
    else if (v < 0.957) setPipelineStep(3);
    else                setPipelineStep(4);
  });

  const boxVisible = [hasBox1, hasBox2, hasBox3, hasBox4];

  // Entrance progress: 0 when scrollRef bottom = viewport bottom, 1 when scrollRef top = viewport top
  // At entranceProgress 0.8 → section occupies 80% of the viewport (slides in from below)
  const { scrollYProgress: entranceProgress } = useScroll({
    target: scrollRef,
    offset: ["start 100%", "start 0%"],
  });

  const [hasEntered, setHasEntered] = useState(false);
  useMotionValueEvent(entranceProgress, "change", (v) => {
    setHasEntered(v >= 0.8);
  });

  return (
    <div
      id="force-grounded"
      ref={scrollRef}
      style={{ height: "1500vh", position: "relative", zIndex: 1 }}
    >
      <section
        className="relative overflow-hidden"
        style={{ position: "sticky", top: 0, height: "100vh" }}
      >
        {/* Gradient background — shared across all phases */}
        <MeshGradient
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }}
          colors={["#f0e6d3", "#a87fd4", "#f5efe5", "#c9a0e8", "#e8d0b0"]}
          speed={0.15}
        />

        {/* ── PHASE 1: SOLUTION HERO ── */}
        <motion.div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 clamp(2rem, 8vw, 10rem)",
            gap: "2rem",
            opacity: solutionOpacity,
            y: solutionY,
            pointerEvents: "none",
          }}
        >
          {/* eyebrow reveal */}
          <div style={{ overflow: "hidden", paddingBottom: "0.1em" }}>
            <motion.p
              initial={{ y: "110%" }}
              animate={{ y: hasEntered ? "0%" : "110%" }}
              transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: jb,
                fontSize: "clamp(1.1rem, 1.6vw, 1.6rem)",
                fontWeight: 400,
                letterSpacing: "0.14em",
                color: "#6d28d9",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              [ THE SOLUTION ]
            </motion.p>
          </div>

          {/* divider draws in from center */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: hasEntered ? 1 : 0, opacity: hasEntered ? 1 : 0 }}
            transition={{ duration: 0.45, delay: 0.52, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: "clamp(3rem, 5vw, 5rem)",
              height: "2px",
              background: "linear-gradient(90deg, #6d28d9, #8b5cf6)",
              borderRadius: "999px",
              transformOrigin: "center center",
            }}
          />

          {/* headline reveal — slides up from clip line */}
          <div style={{ overflow: "hidden", paddingBottom: "0.12em" }}>
            <motion.h2
              initial={{ y: "105%" }}
              animate={{ y: hasEntered ? "0%" : "105%" }}
              transition={{ duration: 1.1, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{
                fontFamily: tight,
                fontSize: "clamp(3rem, 6.5vw, 7rem)",
                fontWeight: 300,
                lineHeight: 0.96,
                letterSpacing: "-0.036em",
                color: ink,
                margin: 0,
                maxWidth: "22ch",
              }}
            >
              Teach your robots the human touch
            </motion.h2>
          </div>

          {/* subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: hasEntered ? 1 : 0, y: hasEntered ? 0 : 12 }}
            transition={{ duration: 0.75, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: tight,
              fontSize: "clamp(0.95rem, 1.1vw, 1.1rem)",
              fontWeight: 400,
              lineHeight: 1.72,
              letterSpacing: "-0.005em",
              color: inkMuted,
              margin: 0,
              maxWidth: "48ch",
            }}
          >
            Cameras, motion sensors, tactile gloves, and EMG sensors capture the demonstration; our pipeline turns it into deployable robot policies
          </motion.p>
        </motion.div>

        {/* ── PHASE 2: WHAT WE BUILD ── */}
        <motion.div
          style={{
            position: "absolute",
            inset: 0,
            opacity: headerOpacity,
            display: "flex",
            flexDirection: "column",
            willChange: "opacity",
          }}
        >
          <motion.div
            className="relative mx-auto flex flex-col"
            style={{ width: isMobile ? "92%" : "80%", paddingTop: isMobile ? "clamp(3rem, 6vh, 5rem)" : "clamp(5rem, 11vh, 11rem)", paddingBottom: 0, flex: 1, minHeight: 0 }}
          >
            {/* Header cluster — label + tagline */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
                paddingBottom: "clamp(1rem, 2vh, 2rem)",
                flexShrink: 0,
              }}
            >
              <div style={{ overflow: "hidden", paddingBottom: "0.1em" }}>
                <motion.span
                  initial={{ y: "110%" }}
                  animate={{ y: hasPhase2 ? "0%" : "110%" }}
                  transition={{ duration: 0.65, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    display: "block",
                    fontFamily: jb,
                    fontSize: "clamp(0.75rem, 1vw, 1rem)",
                    fontWeight: 400,
                    letterSpacing: "0.14em",
                    color: "#6d28d9",
                    textTransform: "uppercase",
                  }}
                >
                  [ What we build ]
                </motion.span>
              </div>
              <div style={{ overflow: "hidden", paddingBottom: "0.12em" }}>
                <motion.h2
                  initial={{ y: "105%" }}
                  animate={{ y: hasPhase2 ? "0%" : "105%" }}
                  transition={{ duration: 0.9, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    fontFamily: tight,
                    fontSize: "clamp(2.6rem, 4.5vw, 5.5rem)",
                    fontWeight: 300,
                    lineHeight: 1.05,
                    letterSpacing: "-0.025em",
                    color: ink,
                    margin: 0,
                  }}
                >
                  Collect, Train and Deploy With Us
                </motion.h2>
              </div>
            </div>

            {/* Top header row — title + description */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                borderBottom: divider,
                borderTop: divider,
                flexShrink: 0,
                alignItems: "center",
                paddingBottom: "clamp(1rem, 2vh, 2rem)",
              }}
            >
              <div style={{ padding: pad, paddingBottom: "clamp(1rem, 1.5vh, 1.5rem)" }}>
                <div style={{ overflow: "hidden", paddingBottom: "0.12em" }}>
                  <motion.h2
                    initial={{ y: "105%" }}
                    animate={{ y: hasPhase2 ? "0%" : "105%" }}
                    transition={{ duration: 1.1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      fontFamily: tight,
                      fontSize: "clamp(1.6rem, 2.6vw, 3rem)",
                      fontWeight: 700,
                      lineHeight: 1.08,
                      letterSpacing: "-0.025em",
                      color: ink,
                      margin: 0,
                    }}
                  >
                    Force-Grounded Intelligence for Precision Manufacturing
                  </motion.h2>
                </div>
              </div>
              {!isMobile && (
              <div style={{ padding: pad, paddingBottom: "clamp(1rem, 1.5vh, 1.5rem)", paddingLeft: "clamp(4rem, 7vw, 7rem)" }}>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: hasPhase2 ? 1 : 0 }}
                  transition={{ duration: 0.75, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    fontFamily: tight,
                    fontSize: "clamp(0.95rem, 1.1vw, 1.08rem)",
                    fontWeight: 400,
                    lineHeight: 1.74,
                    letterSpacing: "-0.005em",
                    color: inkMuted,
                    margin: 0,
                  }}
                >
                  Novonus is a complete imitation learning pipeline for capturing
                  human force expertise, training force-aware policies, and
                  deploying them onto existing industrial robots. It records how
                  skilled operators apply force during contact-rich tasks, through
                  muscle signals, force, motion, and vision, and grounds training
                  in that real human data. This gives robots the force awareness
                  vision-only systems lack, and closes the sim-to-real gap by
                  verifying every simulated scenario against real human force. The
                  result is reliable automation for the fragile, high-precision
                  assembly current systems can&apos;t handle, turning expert human
                  touch into robots that keep it.
                </motion.p>
              </div>
              )}
            </div>

            {/* ── STEP BOXES — one per scroll beat, 2×2 on mobile ── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
                gap: "clamp(0.5rem, 1vw, 1rem)",
                marginTop: "clamp(0.75rem, 1.5vh, 1.5rem)",
                marginBottom: 0,
                flex: 1,
              }}
            >
              {steps.map((step, i) => (
                <div
                  key={step.num}
                  style={{
                    overflow: "hidden",
                    minHeight: 0,
                  }}
                >
                  <motion.div
                    initial={{ y: "105%" }}
                    animate={{ y: boxVisible[i] ? "0%" : "105%" }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      height: "100%",
                      border: divider,
                      padding: isMobile ? "1rem" : "clamp(2rem, 2.8vw, 2.8rem)",
                      display: "flex",
                      flexDirection: "column",
                      gap: isMobile ? "0.5rem" : "1rem",
                      willChange: "transform",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: jb,
                        fontSize: "0.78rem",
                        fontWeight: 400,
                        letterSpacing: "0.2em",
                        color: "var(--cyan)",
                        textTransform: "uppercase",
                      }}
                    >
                      {step.num}
                    </span>
                    <div style={{ overflow: "hidden" }}>
                      <motion.h3
                        initial={{ y: "110%" }}
                        animate={{ y: boxVisible[i] ? "0%" : "110%" }}
                        transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                          fontFamily: tight,
                          fontSize: "clamp(1.5rem, 2vw, 2rem)",
                          fontWeight: 700,
                          letterSpacing: "-0.022em",
                          color: ink,
                          margin: 0,
                          willChange: "transform",
                        }}
                      >
                        {step.title}
                      </motion.h3>
                    </div>
                    <p
                      style={{
                        fontFamily: tight,
                        fontSize: "clamp(0.9rem, 1.05vw, 1.05rem)",
                        fontWeight: 500,
                        lineHeight: 1.7,
                        color: "rgba(15,14,13,0.52)",
                        margin: 0,
                      }}
                    >
                      {step.body}
                    </p>
                  </motion.div>
                </div>
              ))}
            </div>


          </motion.div>

        </motion.div>

        {/* ── PHASE 3: WHO WE BUILD FOR ── */}
        <motion.div
          style={{
            position: "absolute",
            inset: 0,
            opacity: phase3Opacity,
            display: "flex",
            flexDirection: "column",
            willChange: "opacity",
          }}
        >
          <div
            className="relative mx-auto flex flex-col"
            style={{ width: isMobile ? "92%" : "80%", paddingTop: isMobile ? "clamp(2.5rem, 5vh, 4rem)" : "clamp(5rem, 11vh, 11rem)", paddingBottom: isMobile ? "clamp(1.5rem, 3vh, 3rem)" : "clamp(3rem, 6vh, 6rem)", flex: 1, minHeight: 0, gap: isMobile ? "clamp(1rem, 2vh, 1.5rem)" : "clamp(1.5rem, 3vh, 3rem)" }}
          >
            {/* Label + title row */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", flexShrink: 0 }}>
              <div style={{ overflow: "hidden", paddingBottom: "0.1em" }}>
                <motion.span
                  initial={{ y: "110%" }}
                  animate={{ y: hasPhase3 ? "0%" : "110%" }}
                  transition={{ duration: 0.65, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                  style={{ display: "block", fontFamily: jb, fontSize: "clamp(0.75rem, 1vw, 1rem)", fontWeight: 400, letterSpacing: "0.14em", color: "#6d28d9", textTransform: "uppercase" }}
                >
                  [ Who We Build For ]
                </motion.span>
              </div>
              <div style={{ overflow: "hidden", paddingBottom: "0.25em" }}>
                <motion.h2
                  initial={{ y: "105%" }}
                  animate={{ y: hasPhase3 ? "0%" : "105%" }}
                  transition={{ duration: 0.9, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                  style={{ fontFamily: tight, fontSize: "clamp(2.6rem, 4.5vw, 5.5rem)", fontWeight: 300, lineHeight: 1.05, letterSpacing: "-0.025em", color: ink, margin: 0 }}
                >
                  Companies needing precise automation for skilled manufacturing
                </motion.h2>
              </div>
            </div>

            {/* Industries served — centred above boxes */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: hasPhase3 ? 1 : 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}
            >
              <span style={{ fontFamily: jb, fontSize: "0.72rem", fontWeight: 400, letterSpacing: "0.18em", color: inkGhost, textTransform: "uppercase" }}>
                Industries targeted
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
                {["Medical Device Assembly", "Aerospace & Defense", "Semiconductor & Electronics", "Automotive Precision Parts", "Industrial Equipment", "Robotics & Automation"].map((tag, i) => (
                  <motion.span
                    key={tag}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: hasPhase3 ? 1 : 0, y: hasPhase3 ? 0 : 6 }}
                    transition={{ duration: 0.45, delay: 0.35 + i * 0.07 }}
                    style={{ fontFamily: tight, fontSize: "clamp(0.82rem, 0.95vw, 0.95rem)", fontWeight: 500, color: ink, padding: "0.35rem 0.9rem", border: divider, background: "#ffffff", display: "inline-block" }}
                  >
                    {tag}
                  </motion.span>
                ))}
              </div>
            </motion.div>

            {/* Customer boxes — 2×2 on mobile, 4-col on desktop */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: "clamp(0.5rem, 1vw, 1rem)", flexShrink: 0 }}>
              {[
                { title: "Contract Manufacturers", body: "High-mix, low-volume shops doing connector, harness, and delicate assembly by hand. We automate the force-critical steps they can't staff, without disrupting the lines they already run." },
                { title: "Precision OEMs", body: "Aerospace, medical, and electronics makers whose fragile assembly still needs skilled human hands. We capture that expertise before it retires and deploy it onto the robots they already own." },
                { title: "Hardware Startups", body: "Fast-moving teams hand-building delicate prototypes and low-volume products. We give them force-aware automation early, so precision assembly never becomes their bottleneck." },
                { title: "Robotics Platforms", body: "Companies building the arms and humanoids that need force intelligence to handle contact-rich work. We provide the training layer that teaches their hardware the human touch." },
              ].map((card, i) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: hasPhase3 ? 1 : 0, y: hasPhase3 ? 0 : 16 }}
                  transition={{ duration: 0.7, delay: 0.25 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    aspectRatio: "auto",
                    padding: isMobile ? "clamp(0.9rem, 3vw, 1.25rem)" : "clamp(1.25rem, 2vw, 2rem)",
                    border: divider,
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    overflow: "hidden",
                  }}
                >
                  <h3 style={{ fontFamily: tight, fontSize: "clamp(1.05rem, 1.3vw, 1.3rem)", fontWeight: 700, letterSpacing: "-0.02em", color: ink, margin: 0 }}>{card.title}</h3>
                  <p style={{ fontFamily: tight, fontSize: "clamp(0.82rem, 0.93vw, 0.93rem)", fontWeight: 400, lineHeight: 1.65, color: inkMuted, margin: 0 }}>{card.body}</p>
                </motion.div>
              ))}
            </div>

            {/* Hardware Agnostic Training blurb — desktop only to prevent mobile overflow */}
            {!isMobile && <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: hasPhase3 ? 1 : 0, y: hasPhase3 ? 0 : 12 }}
              transition={{ duration: 0.7, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: "flex", flexDirection: "row", gap: "clamp(3rem, 6vw, 7rem)", alignItems: "flex-end", paddingTop: "clamp(3rem, 6vh, 6rem)", borderTop: divider, flexShrink: 0 }}
            >
              {/* Left: eyebrow + heading, bottom-aligned with paragraph */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flexShrink: 0 }}>
                <span style={{ fontFamily: jb, fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)", fontWeight: 400, letterSpacing: "0.18em", color: "#6d28d9", textTransform: "uppercase" }}>
                  [ Hardware Agnostic Training ]
                </span>
                <h3 style={{ fontFamily: tight, fontSize: "clamp(2.2rem, 3.5vw, 4rem)", fontWeight: 300, letterSpacing: "-0.03em", color: ink, margin: 0, flexShrink: 0, lineHeight: 1.05 }}>
                  Train on Robots You Rely on
                </h3>
              </div>
              <p style={{ fontFamily: tight, fontSize: "clamp(0.88rem, 1vw, 1rem)", fontWeight: 400, lineHeight: 1.72, color: inkMuted, margin: 0 }}>
                Our Physical AI is built for multi-embodiment, training on human data and not robot specific control, supporting diverse hardware options by retargeting a single set of human demonstrations across robots rather than re-collecting data for each one. Novonus trains the robots you already rely on, no new hardware, no rebuilding your line.
              </p>
            </motion.div>}

          </div>
        </motion.div>

        {/* ── PHASE 5: WHY NOVONUS ── */}
        <motion.div
          style={{
            position: "absolute",
            inset: 0,
            opacity: whyOpacity,
            display: "flex",
            flexDirection: "column",
            willChange: "opacity",
          }}
        >
          <div
            className="relative mx-auto flex flex-col"
            style={{ width: isMobile ? "92%" : "80%", paddingTop: isMobile ? "clamp(2.5rem, 5vh, 4rem)" : "clamp(5rem, 11vh, 11rem)", paddingBottom: isMobile ? "clamp(1.5rem, 3vh, 2rem)" : "clamp(3rem, 6vh, 6rem)", flex: 1, minHeight: 0, gap: isMobile ? "clamp(1rem, 2vh, 1.5rem)" : "clamp(1.5rem, 3vh, 3rem)" }}
          >
            {/* Label + title */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", flexShrink: 0 }}>
              <div style={{ overflow: "hidden", paddingBottom: "0.1em" }}>
                <motion.span
                  initial={{ y: "110%" }}
                  animate={{ y: hasWhy ? "0%" : "110%" }}
                  transition={{ duration: 0.65, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                  style={{ display: "block", fontFamily: jb, fontSize: "clamp(0.75rem, 1vw, 1rem)", fontWeight: 400, letterSpacing: "0.14em", color: "#6d28d9", textTransform: "uppercase" }}
                >
                  [ Why Novonus ]
                </motion.span>
              </div>
              <div style={{ overflow: "hidden", paddingBottom: "0.3em" }}>
                <motion.h2
                  initial={{ y: "105%" }}
                  animate={{ y: hasWhy ? "0%" : "105%" }}
                  transition={{ duration: 0.9, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                  style={{ fontFamily: tight, fontSize: "clamp(2.6rem, 4.5vw, 5.5rem)", fontWeight: 300, lineHeight: 1.05, letterSpacing: "-0.025em", color: ink, margin: 0 }}
                >
                  The Signal Others Miss
                </motion.h2>
              </div>
            </div>

            {/* 4-item editorial rows */}
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              {[
                {
                  heading: "Beyond sight. Beyond force.",
                  body: "Cameras can't feel how hard to grip. Force sensors can, but they miss how stiff the hand is — the muscle co-contraction that makes a grip loose or rigid. Two grips with identical force can behave completely differently, and that difference shapes whether a delicate part seats or jams. EMG reads that stiffness straight from the muscle: the compliance skilled hands use that cameras and touch sensors both miss.",
                },
                {
                  heading: "Grounded in reality.",
                  body: "Simulators can't model real contact physics, so robots trained in them fail on real parts. We verify every simulated scenario against real human force, keeping only what holds up. Reality is our filter.",
                },
                {
                  heading: "Runs on the robots you trust.",
                  body: "No new hardware, no rebuilding your line. Because we capture human intent rather than robot-specific control, our policies deploy onto the grippers, arms, and humanoids you already own.",
                },
                {
                  heading: "Deep where the giants stay shallow.",
                  body: "General-purpose robotics companies chase broad capability. We go deep on the fragile, force-critical assembly they can't prioritize — building the richest force dataset in the hardest corner of manufacturing.",
                },
              ].map((item, i) => (
                <motion.div
                  key={item.heading}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: hasWhy ? 1 : 0, y: hasWhy ? 0 : 18 }}
                  transition={{ duration: 0.6, delay: 0.2 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    flex: 1,
                    minHeight: 0,
                    borderTop: divider,
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "clamp(2.8rem,8vw,3.5rem) 1fr"
                      : "clamp(3.5rem,5vw,5rem) 1fr 1.6fr",
                    columnGap: isMobile ? "clamp(0.75rem,3vw,1rem)" : "clamp(2rem,4vw,5rem)",
                    alignItems: "start",
                    paddingTop: isMobile ? "clamp(0.75rem,1.5vh,1.25rem)" : "clamp(1.25rem,2.2vh,2.2rem)",
                  }}
                >
                  {/* Counter */}
                  <span style={{
                    fontFamily: jb,
                    fontSize: isMobile ? "0.65rem" : "0.72rem",
                    fontWeight: 400,
                    letterSpacing: "0.16em",
                    color: "#6d28d9",
                    textTransform: "uppercase",
                    paddingTop: isMobile ? "0.15rem" : "0.3rem",
                    lineHeight: 1,
                  }}>
                    [ 0{i + 1} ]
                  </span>

                  {/* Heading */}
                  <h3 style={{
                    fontFamily: tight,
                    fontSize: isMobile ? "clamp(0.9rem,3.5vw,1.1rem)" : "clamp(1.1rem,1.5vw,1.45rem)",
                    fontWeight: 500,
                    letterSpacing: "-0.022em",
                    lineHeight: 1.22,
                    color: ink,
                    margin: 0,
                  }}>
                    {item.heading}
                  </h3>

                  {/* Body — desktop only; mobile screens can't fit the full paragraphs */}
                  {!isMobile && (
                    <p style={{
                      fontFamily: tight,
                      fontSize: "clamp(0.85rem,0.95vw,0.95rem)",
                      fontWeight: 400,
                      lineHeight: 1.76,
                      color: inkMuted,
                      margin: 0,
                    }}>
                      {item.body}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── PHASE 4: HOW IT WORKS ── */}
        <motion.div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 clamp(2rem, 8vw, 10rem)",
            gap: "2rem",
            opacity: phase4Opacity,
            pointerEvents: "none",
          }}
        >
          <div style={{ overflow: "hidden", paddingBottom: "0.1em" }}>
            <motion.p
              initial={{ y: "110%" }}
              animate={{ y: hasPhase4 ? "0%" : "110%" }}
              transition={{ duration: 0.65, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontFamily: jb, fontSize: "clamp(1.1rem, 1.6vw, 1.6rem)", fontWeight: 400, letterSpacing: "0.14em", color: "#6d28d9", textTransform: "uppercase", margin: 0 }}
            >
              [ How It Works ]
            </motion.p>
          </div>

          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: hasPhase4 ? 1 : 0, opacity: hasPhase4 ? 1 : 0 }}
            transition={{ duration: 0.45, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: "clamp(3rem, 5vw, 5rem)", height: "2px", background: "linear-gradient(90deg, #6d28d9, #8b5cf6)", borderRadius: "999px", transformOrigin: "center center" }}
          />

          <div style={{ overflow: "hidden", paddingBottom: "0.12em" }}>
            <motion.h2
              initial={{ y: "105%" }}
              animate={{ y: hasPhase4 ? "0%" : "105%" }}
              transition={{ duration: 1.1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ fontFamily: tight, fontSize: "clamp(3rem, 6.5vw, 7rem)", fontWeight: 300, lineHeight: 0.96, letterSpacing: "-0.036em", color: ink, margin: 0 }}
            >
              The Pipeline
            </motion.h2>
          </div>
        </motion.div>

        {/* ── PIPELINE PHASES 5–9: single persistent container ── */}
        <motion.div
          style={{ position: "absolute", inset: 0, opacity: pipelineOpacity, display: "flex", flexDirection: "column", willChange: "opacity" }}
        >
          {/* Static header — renders once, never re-animates between steps */}
          <div style={{ paddingTop: "clamp(6rem, 11vh, 11rem)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.15rem", flexShrink: 0 }}>
            <span style={{ fontFamily: jb, fontSize: "0.85rem", fontWeight: 400, letterSpacing: "0.18em", color: "#6d28d9", textTransform: "uppercase" }}>[ How It Works ]</span>
            <span style={{ fontFamily: tight, fontSize: "0.95rem", fontWeight: 500, letterSpacing: "0.08em", color: inkMuted }}>The Pipeline</span>
          </div>

          {/* Step content — exits out, next slides up from below */}
          <div
            className="relative mx-auto flex flex-col"
            style={{ width: isMobile ? "92%" : "80%", flex: 1, minHeight: 0, justifyContent: "center", paddingBottom: "clamp(3rem, 6vh, 6rem)" }}
          >
            <AnimatePresence mode="wait">
              {pipelineStep >= 0 && (
                <motion.div
                  key={pipelineStep}
                  initial={{ y: 80, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -40, opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  style={{ display: "flex", flexDirection: "column", gap: "clamp(1.5rem, 3vh, 3rem)" }}
                >
                  {(() => {
                    const steps = [
                      { num: "01", title: "Sync",    body: "All sensor streams, muscle, force, motion, and vision, are locked to a common clock, so every modality aligns to the same instant." },
                      { num: "02", title: "Process", body: "Each stream is cleaned and normalized: filtering muscle signals, calibrating force to real units, fusing motion, and encoding vision into scene features." },
                      { num: "03", title: "Learn",   body: "A model predicts force and intent from the multimodal data, grounded against real force sensors so it learns what human touch actually feels like." },
                      { num: "04", title: "Ground",  body: "Each demonstration is augmented into thousands of simulated scenarios, keeping only those that match real human force, closing the sim-to-real gap." },
                      { num: "05", title: "Deploy",  body: "The verified data trains a force-aware policy that runs on your existing robots, with a real-time safety supervisor watching contact force." },
                    ];
                    const { num, title, body } = steps[pipelineStep];
                    return (
                      <>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          <span style={{ fontFamily: jb, fontSize: "clamp(0.75rem, 1vw, 1rem)", fontWeight: 400, letterSpacing: "0.2em", color: "#6d28d9", textTransform: "uppercase" }}>
                            {num}
                          </span>
                          <div style={{ overflow: "hidden", paddingBottom: "0.12em" }}>
                            <h2 style={{ fontFamily: tight, fontSize: isMobile ? "clamp(2.5rem, 12vw, 4rem)" : "clamp(3rem, 6vw, 7rem)", fontWeight: 300, lineHeight: 0.96, letterSpacing: "-0.036em", color: ink, margin: 0 }}>
                              {title}
                            </h2>
                          </div>
                        </div>
                        <p style={{ fontFamily: tight, fontSize: "clamp(1rem, 1.3vw, 1.3rem)", fontWeight: 400, lineHeight: 1.75, color: inkMuted, margin: 0, maxWidth: "52ch" }}>
                          {body}
                        </p>
                      </>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

      </section>
    </div>
  );
}

/* ============================================================================
   CONTENT SECTIONS — Proof, Applications, Why Different, Moat, Traction, CTA
   ========================================================================== */
function ContentSections() {
  const isMobile = useIsMobile();
  const tight = "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif";
  const ink = "rgba(15, 14, 13, 0.96)";
  const inkMuted = "rgba(15, 14, 13, 0.6)";
  const inkGhost = "rgba(15, 14, 13, 0.32)";
  const divider = "1px solid rgba(15, 14, 13, 0.1)";
  const dividerLight = "1px solid rgba(15, 14, 13, 0.06)";
  const pad = "clamp(2rem, 3vw, 3rem)";
  const accent = "#6d28d9";
  const vp = { once: true, margin: "-5%" as const };
  const ease = [0.22, 1, 0.36, 1] as const;
  const wb = {
    backgroundColor: "transparent" as const,
  };
  const strip = (label: string) => (
    <div style={{ paddingTop: "2rem", borderBottom: dividerLight, display: "flex", alignItems: "flex-end" }}>
      <div style={{ ...wb, display: "inline-flex", alignItems: "center", padding: "0.55rem 1.5rem", border: divider }}>
        <span style={{ fontFamily: tight, fontSize: "clamp(1.2rem, 2vw, 2rem)", fontWeight: 700, letterSpacing: "-0.02em", color: ink }}>{label}</span>
      </div>
    </div>
  );

  return (
    <div>
      <div className="relative mx-auto" style={{ width: "80%" }}>

        {/* ══ THE PROOF ══════════════════════════════════════════════════ */}
        {strip("The Proof")}
        <div style={{ ...wb, display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: divider, marginBottom: "3rem" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={vp}
            transition={{ duration: 0.7, ease }}
            style={{ padding: pad, borderRight: divider, display: "flex", flexDirection: "column", justifyContent: "center", gap: "1rem" }}
          >
            <div style={{ fontFamily: tight, fontSize: "clamp(4.5rem, 8vw, 8.5rem)", fontWeight: 700, lineHeight: 0.88, letterSpacing: "-0.04em", color: ink }}>
              0.96<span style={{ fontSize: "0.28em", color: accent, verticalAlign: "super", fontWeight: 700, letterSpacing: "-0.01em" }}>R²</span>
            </div>
            <p style={{ fontFamily: tight, fontSize: "0.63rem", fontWeight: 600, letterSpacing: "0.22em", color: inkGhost, textTransform: "uppercase", margin: 0 }}>
              Force prediction accuracy
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={vp}
            transition={{ duration: 0.7, delay: 0.1, ease }}
            style={{ padding: pad, display: "flex", flexDirection: "column", justifyContent: "center", gap: "1.5rem" }}
          >
            <p style={{ fontFamily: tight, fontSize: "clamp(0.95rem, 1.1vw, 1.1rem)", fontWeight: 400, lineHeight: 1.78, color: inkMuted, margin: 0 }}>
              That&apos;s how accurately Novonus predicts real grip force from nothing but human muscle signals, measured against a calibrated force sensor, on data it had never seen.
            </p>
            <p style={{ fontFamily: tight, fontSize: "clamp(0.95rem, 1.1vw, 1.1rem)", fontWeight: 400, lineHeight: 1.78, color: inkMuted, margin: 0 }}>
              The single hardest question in this field — can you actually read force from the body? — already has an answer. The rest is execution.
            </p>
          </motion.div>
        </div>

        {/* ══ THE APPLICATIONS ══════════════════════════════════════════ */}
        {strip("The Applications")}
        <div style={{ ...wb, borderBottom: divider, marginBottom: "3rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", borderBottom: divider }}>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={vp}
              transition={{ duration: 0.7, ease }}
              style={{ padding: pad, borderRight: isMobile ? "none" : divider, borderBottom: isMobile ? divider : "none" }}
            >
              <h2 style={{ fontFamily: tight, fontSize: "clamp(1.8rem, 2.6vw, 3rem)", fontWeight: 700, lineHeight: 1.06, letterSpacing: "-0.025em", color: ink, margin: 0 }}>
                We go where robots break.
              </h2>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={vp}
              transition={{ duration: 0.7, delay: 0.1, ease }}
              style={{ padding: pad }}
            >
              <p style={{ fontFamily: tight, fontSize: "clamp(0.95rem, 1.1vw, 1.08rem)", fontWeight: 400, lineHeight: 1.76, color: inkMuted, margin: 0 }}>
                Not the easy, repetitive work that&apos;s already automated — the delicate tasks that still run on human hands because one wrong squeeze ruins the part.
              </p>
            </motion.div>
          </div>
          <div className="content-grid-4" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", borderBottom: divider }}>
            {[
              { n: "01", title: "Seating and mating fragile connectors", body: "Sub-millimeter positioning with controlled insertion force. No crushing, no missed engagement, no rework." },
              { n: "02", title: "Placing components too delicate to crush", body: "Force-limited handling from pick to place. The grip adjusts to the part, not the other way around." },
              { n: "03", title: "Fastening judged by feel, not position", body: "Torque-aware tightening that stops when the joint is right — not when the angle says so." },
              { n: "04", title: "Handling parts where too much force destroys", body: "Brittle assemblies and pressure-sensitive materials where a human hand wouldn&apos;t be forgiven for guessing." },
            ].map((item, i) => (
              <motion.div
                key={item.n}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={vp}
                transition={{ duration: 0.6, delay: i * 0.07, ease }}
                style={{
                  padding: pad,
                  borderRight: i % 2 === 0 ? divider : "none",
                  borderBottom: i < 2 ? divider : "none",
                }}
              >
                <span style={{ fontFamily: tight, fontSize: "0.63rem", fontWeight: 600, letterSpacing: "0.2em", color: inkGhost, textTransform: "uppercase", display: "block", marginBottom: "0.75rem" }}>{item.n}</span>
                <h3 style={{ fontFamily: tight, fontSize: "clamp(1rem, 1.2vw, 1.22rem)", fontWeight: 700, letterSpacing: "-0.018em", color: ink, margin: "0 0 0.65rem", lineHeight: 1.28 }}>{item.title}</h3>
                <p style={{ fontFamily: tight, fontSize: "clamp(0.88rem, 0.95vw, 0.96rem)", fontWeight: 400, lineHeight: 1.72, color: "rgba(15,14,13,0.52)", margin: 0 }}>{item.body}</p>
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={vp}
            transition={{ duration: 0.6, ease }}
            style={{ padding: pad, display: "flex", alignItems: "center", gap: "clamp(1.5rem, 3vw, 3rem)", flexWrap: "wrap" as const }}
          >
            <span style={{ fontFamily: tight, fontSize: "0.63rem", fontWeight: 600, letterSpacing: "0.2em", color: inkGhost, textTransform: "uppercase", flexShrink: 0 }}>Industries</span>
            {["Aerospace", "Electronics & Semiconductors", "Medical Devices", "EV & Batteries"].map((ind) => (
              <span key={ind} style={{ fontFamily: tight, fontSize: "clamp(0.88rem, 1vw, 1rem)", fontWeight: 500, color: inkMuted }}>{ind}</span>
            ))}
          </motion.div>
        </div>

        {/* ══ WHY NOVONUS IS DIFFERENT ═══════════════════════════════════ */}
        {strip("Why Novonus Is Different")}
        <div style={{ ...wb, borderBottom: divider, marginBottom: "3rem" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={vp}
            transition={{ duration: 0.75, ease }}
            style={{ padding: pad, borderBottom: divider }}
          >
            <h2 style={{ fontFamily: tight, fontSize: "clamp(1.8rem, 3vw, 3.5rem)", fontWeight: 700, lineHeight: 1.06, letterSpacing: "-0.03em", color: ink, margin: 0, maxWidth: "28ch" }}>
              Everyone else is looking in the wrong place.
            </h2>
          </motion.div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
            <motion.div
              initial={{ opacity: 0, x: isMobile ? 0 : -14 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={vp}
              transition={{ duration: 0.7, ease }}
              style={{ padding: pad, borderRight: isMobile ? "none" : divider, borderBottom: isMobile ? divider : "none" }}
            >
              <p style={{ fontFamily: tight, fontSize: "0.63rem", fontWeight: 600, letterSpacing: "0.2em", color: inkGhost, textTransform: "uppercase", margin: "0 0 1rem" }}>The industry</p>
              <p style={{ fontFamily: tight, fontSize: "clamp(0.95rem, 1.1vw, 1.08rem)", fontWeight: 400, lineHeight: 1.78, color: inkMuted, margin: 0 }}>
                Billions into better cameras. But a camera has never felt anything — it can watch a hand grip a wire and have no idea whether it&apos;s holding gently or crushing. Teleoperation isn&apos;t the answer either: puppeting a robot from across the room is slow, expensive, and discards the exact signal that matters.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 14 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={vp}
              transition={{ duration: 0.7, delay: 0.1, ease }}
              style={{ padding: pad, display: "flex", flexDirection: "column", gap: "1.5rem" }}
            >
              <p style={{ fontFamily: tight, fontSize: "0.63rem", fontWeight: 600, letterSpacing: "0.2em", color: inkGhost, textTransform: "uppercase", margin: 0 }}>We went to the source</p>
              <p style={{ fontFamily: tight, fontSize: "clamp(0.95rem, 1.1vw, 1.08rem)", fontWeight: 400, lineHeight: 1.78, color: inkMuted, margin: 0 }}>
                Force captured straight from the muscles of a skilled human, working naturally, before contact even happens. Every step of training grounded in that real human force.
              </p>
              <p style={{ fontFamily: tight, fontSize: "clamp(0.95rem, 1.1vw, 1.08rem)", fontWeight: 600, lineHeight: 1.6, color: ink, margin: 0, borderLeft: `3px solid ${accent}`, paddingLeft: "1rem" }}>
                Force-aware robots outperform vision-only systems by over 50% on contact-rich tasks. Force was never a feature to add later — it&apos;s the whole game.
              </p>
            </motion.div>
          </div>
        </div>

        {/* ══ THE MOAT ═══════════════════════════════════════════════════ */}
        {strip("The Moat")}
        <div style={{ ...wb, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", borderBottom: divider, marginBottom: "3rem" }}>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={vp}
            transition={{ duration: 0.75, ease }}
            style={{ padding: pad, borderRight: isMobile ? "none" : divider, borderBottom: isMobile ? divider : "none", display: "flex", alignItems: "center" }}
          >
            <h2 style={{ fontFamily: tight, fontSize: "clamp(1.8rem, 2.8vw, 3.2rem)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.03em", color: ink, margin: 0 }}>
              The dataset is the company.
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={vp}
            transition={{ duration: 0.75, delay: 0.1, ease }}
            style={{ padding: pad, display: "flex", flexDirection: "column", justifyContent: "center", gap: "1.25rem" }}
          >
            <p style={{ fontFamily: tight, fontSize: "clamp(0.95rem, 1.1vw, 1.08rem)", fontWeight: 400, lineHeight: 1.78, color: inkMuted, margin: 0 }}>
              The pipeline is how we start. What makes us impossible to catch is what accumulates behind it — a proprietary, force-grounded dataset in the hardest corner of manufacturing, deepening with every deployment.
            </p>
            <p style={{ fontFamily: tight, fontSize: "clamp(0.95rem, 1.1vw, 1.08rem)", fontWeight: 400, lineHeight: 1.78, color: inkMuted, margin: 0 }}>
              Models get commoditized. A dataset that everyone needs and no one else has — that you can only build by going out and collecting it, part by part — doesn&apos;t.
            </p>
          </motion.div>
        </div>

        {/* ══ TRACTION ═══════════════════════════════════════════════════ */}
        {strip("Traction")}
        <div style={{ ...wb, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", borderBottom: divider, marginBottom: "3rem" }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={vp}
            transition={{ duration: 0.7, ease }}
            style={{ padding: pad, borderRight: isMobile ? "none" : divider, borderBottom: isMobile ? divider : "none", display: "flex", alignItems: "center" }}
          >
            <h2 style={{ fontFamily: tight, fontSize: "clamp(1.6rem, 2.4vw, 2.8rem)", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.025em", color: ink, margin: 0 }}>
              Momentum.
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={vp}
            transition={{ duration: 0.7, delay: 0.1, ease }}
            style={{ padding: pad }}
          >
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {[
                "Building inside Founders Inc's current cohort",
                "In conversation with the robotics platforms whose arms we deploy on",
                "In conversation with the manufacturing teams who live this problem every day",
              ].map((item, i) => (
                <li key={i} style={{ display: "flex", gap: "0.875rem", alignItems: "flex-start" }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: accent, marginTop: "0.5em", flexShrink: 0, display: "block" }} />
                  <span style={{ fontFamily: tight, fontSize: "clamp(0.95rem, 1.1vw, 1.08rem)", fontWeight: 400, lineHeight: 1.72, color: inkMuted }}>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* ══ CALL TO ACTION ══════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={vp}
          transition={{ duration: 0.8, ease }}
          style={{ ...wb, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}
        >
          <div style={{ padding: pad, display: "flex", flexDirection: "column", justifyContent: "center", borderBottom: isMobile ? divider : "none" }}>
            <h2 style={{ fontFamily: tight, fontSize: "clamp(1.5rem, 2.2vw, 2.6rem)", fontWeight: 700, lineHeight: 1.12, letterSpacing: "-0.025em", color: ink, margin: 0 }}>
              Let&apos;s put force-aware robots on your line.
            </h2>
          </div>
          <div style={{ padding: pad, display: "flex", flexDirection: "column", justifyContent: "center", gap: "1.5rem" }}>
            <p style={{ fontFamily: tight, fontSize: "clamp(0.95rem, 1.1vw, 1.08rem)", fontWeight: 400, lineHeight: 1.78, color: inkMuted, margin: 0 }}>
              A manufacturer working through delicate assembly you can&apos;t automate. An investor. A builder who wants in. We want to hear from you.
            </p>
            <a
              href="mailto:deepayanc10@gmail.com"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                fontFamily: tight,
                fontSize: "clamp(0.88rem, 1vw, 1rem)",
                fontWeight: 600,
                color: ink,
                textDecoration: "none",
                letterSpacing: "-0.01em",
                borderBottom: `1.5px solid ${ink}`,
                paddingBottom: "0.15rem",
                alignSelf: "flex-start",
              }}
            >
              deepayanc10@gmail.com →
            </a>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

/* ============================================================================
   EVIDENCE SECTION — stat cards with count-up animations
   ========================================================================== */
function EvidenceStatCard({
  value, display, unit, label, index,
  tight, ink, inkMuted, inkGhost, accent, divider,
}: {
  value: number; display?: string; unit: string; label: string; index: number;
  tight: string; ink: string; inkMuted: string; inkGhost: string; accent: string; divider: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setActive(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const count = useCountUp(value, active, 1500);
  const shown = display ? (active ? display : "—") : String(count) + unit;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={active ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      style={{
        padding: "clamp(2rem, 3vw, 3rem)",
        borderRight: index < 3 ? divider : "none",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      <div style={{
        fontFamily: tight,
        fontSize: "clamp(3rem, 5.5vw, 5.5rem)",
        fontWeight: 700,
        lineHeight: 0.9,
        letterSpacing: "-0.04em",
        color: ink,
      }}>
        {shown}
      </div>
      <p style={{ fontFamily: tight, fontSize: "clamp(0.88rem, 1vw, 1rem)", fontWeight: 400, lineHeight: 1.65, color: inkMuted, margin: 0 }}>{label}</p>
    </motion.div>
  );
}

function EvidenceSection() {
  const tight = "var(--font-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif";
  const ink = "rgba(15, 14, 13, 0.96)";
  const inkMuted = "rgba(15, 14, 13, 0.6)";
  const inkGhost = "rgba(15, 14, 13, 0.32)";
  const divider = "1px solid rgba(15, 14, 13, 0.1)";
  const accent = "#6d28d9";

  const stats = [
    { value: 96, display: "0.96", unit: "", label: "R² accuracy predicting grip force from muscle signals alone — validated against a calibrated sensor on unseen data." },
    { value: 50, display: undefined, unit: "%+", label: "Performance advantage force-aware policies hold over vision-only systems on contact-rich industrial tasks." },
    { value: 4,  display: undefined, unit: "",   label: "Sensor modalities synchronized in real time: EMG, force, motion, and vision." },
    { value: 0,  display: "Zero",   unit: "",    label: "Changes needed to your existing robot fleet. We deploy on the arms you already trust." },
  ];

  return (
    <section className="section-offscreen" style={{ position: "relative", background: "#f0e6d3" }}>
      <div className="relative mx-auto" style={{ width: "80%" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          {stats.map((s, i) => (
            <EvidenceStatCard
              key={i}
              index={i}
              value={s.value}
              display={s.display}
              unit={s.unit}
              label={s.label}
              tight={tight}
              ink={ink}
              inkMuted={inkMuted}
              inkGhost={inkGhost}
              accent={accent}
              divider={divider}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   PAGE — root export
   ========================================================================== */

export default function Home() {
  const [contactOpen, setContactOpen] = useState(false);
  const openContact = useCallback(() => setContactOpen(true), []);
  return (
    <ContactModalCtx.Provider value={openContact}>
    <IntroProvider sidebar={<Sidebar onContactClick={openContact} />}>
      <main>
        <Hero />
        <ForceGroundedSection />
        <EvidenceSection />
        <div className="relative" style={{ background: "#f0e6d3" }}>
          <ScrollSection><EtymologyEntry /></ScrollSection>
        </div>
        <div className="relative z-[60] bg-[#0f0e0d]">
          <SiteFooter />
        </div>
      </main>
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </IntroProvider>
    </ContactModalCtx.Provider>
  );
}

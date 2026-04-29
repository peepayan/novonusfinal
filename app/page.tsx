"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
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

type IntroPhase = "pop" | "dock" | "reveal" | "done";

const POP_MS = 400;
const HOLD_MS = 700;
const DOCK_MS = 650;
const REVEAL_MS = 450;

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
    const t1 = window.setTimeout(() => setPhase("dock"), POP_MS + HOLD_MS);
    const t2 = window.setTimeout(
      () => setPhase("reveal"),
      POP_MS + HOLD_MS + DOCK_MS,
    );
    const t3 = window.setTimeout(
      () => setPhase("done"),
      POP_MS + HOLD_MS + DOCK_MS + REVEAL_MS,
    );
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  const siteVisible = phase === "reveal" || phase === "done";

  return (
    <IntroContext.Provider value={{ phase }}>
      <LayoutGroup>
        <Preloader />
        <BrandLockup />
        {sidebar}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: siteVisible ? 1 : 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden={!siteVisible}
        >
          {children}
        </motion.div>
      </LayoutGroup>
    </IntroContext.Provider>
  );
}

/* ============================================================================
   LOGO MARK
   ========================================================================== */

function LogoMark({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/novonus-logo.png"
      alt="Novonus"
      width={size}
      height={size}
      priority
      draggable={false}
      className={`object-contain select-none ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/* ============================================================================
   PRELOADER — full-viewport black overlay with logo pop & dock
   ========================================================================== */

function Preloader() {
  const { phase } = useIntro();

  return (
    <AnimatePresence>
      {phase !== "done" && (
        <motion.div
          key="preloader-overlay"
          aria-hidden
          initial={{ opacity: 1 }}
          animate={{ opacity: phase === "reveal" ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] bg-ink"
          style={{ pointerEvents: phase === "pop" ? "auto" : "none" }}
        >
          <div className="bg-grid absolute inset-0 opacity-25" />
          <div className="glow-accent absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2" />
        </motion.div>
      )}

      {phase === "pop" && (
        <div
          key="preloader-stage"
          className="pointer-events-none fixed inset-0 z-[110] flex items-center justify-center"
        >
          <motion.div
            layoutId="primary-logo"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 1 }}
            transition={{
              scale: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] },
              opacity: { duration: 0.3, ease: "easeOut" },
              layout: { duration: 0.65, ease: [0.65, 0, 0.35, 1] },
            }}
            className="flex items-center justify-center"
          >
            <LogoMark size={72} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ============================================================================
   BRAND LOCKUP — top-center docking destination
   ========================================================================== */

function BrandLockup() {
  const { phase } = useIntro();
  const showLogo = phase !== "pop";
  const showText = phase === "reveal" || phase === "done";

  return (
    <div
      className="pointer-events-none fixed left-1/2 top-5 z-[120] -translate-x-1/2"
      aria-hidden={!showText}
    >
      <div className="flex items-center gap-2.5">
        <span className="relative inline-flex h-9 w-9 items-center justify-center">
          {showLogo && (
            <motion.span
              layoutId="primary-logo"
              transition={{
                layout: { duration: 0.65, ease: [0.65, 0, 0.35, 1] },
              }}
              className="inline-flex items-center justify-center"
            >
              <LogoMark size={36} />
            </motion.span>
          )}
        </span>
        <motion.span
          initial={{ opacity: 0, x: -6 }}
          animate={{
            opacity: showText ? 1 : 0,
            x: showText ? 0 : -6,
          }}
          transition={{
            duration: 0.45,
            ease: [0.22, 1, 0.36, 1],
            delay: showText ? 0.05 : 0,
          }}
          className="font-brand text-base tracking-[0.02em] text-paper"
        >
          Novonus
        </motion.span>
      </div>
    </div>
  );
}

/* ============================================================================
   SIDEBAR
   ========================================================================== */

const NAV_ITEMS = ["System", "Markets", "Insights", "Resources", "About"];

function Sidebar() {
  const { phase } = useIntro();
  const visible = phase === "reveal" || phase === "done";

  return (
    <motion.aside
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : -16 }}
      transition={{
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
        delay: visible ? 0.1 : 0,
      }}
      className="fixed left-6 top-1/2 z-40 hidden -translate-y-1/2 md:block"
      aria-label="Primary navigation"
    >
      <div className="flex flex-col items-stretch gap-1 rounded-3xl border border-white/10 bg-black/20 p-3 shadow-[0_24px_64px_-32px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
        <span className="px-3 pb-2 pt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/40">
          Navigate
        </span>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="group flex items-center justify-between rounded-full px-4 py-2.5 text-sm text-paper/75 transition-colors hover:bg-white/10 hover:text-paper"
            >
              <span>{item}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-cyan/0 transition-colors group-hover:bg-cyan" />
            </a>
          ))}
        </nav>
        <div className="mt-2 border-t border-white/10 pt-3">
          <a
            href="#contact"
            className="group flex items-center justify-between rounded-full bg-cyan/90 px-4 py-2.5 text-sm font-medium text-ink transition-all hover:bg-cyan"
          >
            Contact
            <Arrow className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </motion.aside>
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
  return (
    <section className="relative overflow-hidden bg-ink pt-32 pb-24 md:pt-40 md:pb-32">
      <div className="bg-grid absolute inset-0 opacity-50" />
      <div className="glow-accent absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink" />

      <div className="relative mx-auto flex max-w-[1400px] flex-col items-center px-6 md:px-10">
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          className="eyebrow mb-10"
        >
          ◆ Yard Operating System
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="relative aspect-[16/10] w-full max-w-[1100px]"
        >
          {/* Base hero image */}
          <Image
            src="/hero-image.png"
            alt="Novonus yard intelligence"
            fill
            priority
            sizes="(min-width: 1280px) 1100px, (min-width: 768px) 80vw, 95vw"
            className="feathered-mask object-contain mix-blend-screen"
          />

          {/* Neon overlay — sized/positioned so its red outline lands on the red helmet
              in the base image; values derived from the red bboxes of both PNGs. */}
          <div
            aria-hidden
            className="pointer-events-none absolute"
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
              className="object-fill mix-blend-screen drop-shadow-neon-red animate-neon-pulse"
            />
          </div>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
          className="mt-12 grid w-full gap-8 border-t border-paper/10 pt-10 md:grid-cols-3 md:gap-12"
        >
          <Stat label="Loads orchestrated" digits={[8, 4, 2]} suffix="K+" />
          <Stat label="Reduction in dwell time" digits={[3, 7]} suffix="%" />
          <Stat label="Yards going live" digits={[2, 4]} suffix="/wk" />
        </motion.div>
      </div>
    </section>
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
            <SpacedReveal text="Yard Operating System." />
          </h2>
          <p className="mt-4 font-mono text-2xl tracking-[0.4em] text-cyan md:text-4xl">
            YOS™
          </p>
        </div>
      </div>
    </section>
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
      "Yard Operating System",
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

import { useRef } from "react";
import { gsap, ScrollTrigger } from "../lib/gsapSetup";
import { useGSAP } from "@gsap/react";
import { Magnetic } from "./Magnetic";

/* SVG displacement filter powering the liquid-glass surface. */
function GlassFilter() {
  return (
    <svg style={{ display: "none" }} aria-hidden>
      <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
        <feTurbulence type="fractalNoise" baseFrequency="0.001 0.005" numOctaves="1" seed="17" result="turbulence" />
        <feComponentTransfer in="turbulence" result="mapped">
          <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
          <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
          <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
        </feComponentTransfer>
        <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
        <feSpecularLighting
          in="softMap"
          surfaceScale="5"
          specularConstant="1"
          specularExponent="100"
          lightingColor="white"
          result="specLight"
        >
          <fePointLight x="-200" y="-200" z="300" />
        </feSpecularLighting>
        <feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage" />
        <feDisplacementMap in="SourceGraphic" in2="softMap" scale="200" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}

/* Floating header card. Transparent (white foreground) while the dark hero
   is under it; becomes a translucent liquid-glass bar once scrolled. */
export function Nav({ ready }: { ready: boolean }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ready) return;
      gsap.from(root.current, {
        y: -24,
        autoAlpha: 0,
        duration: 0.7,
        ease: "power2.out",
        delay: 0.15,
      });
      /* auto-hiding header: slides away scrolling down, returns the moment
         the user scrolls back up */
      let hidden = false;
      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => {
          const y = self.scroll();
          root.current?.classList.toggle("nav--solid", y > 72);
          const down = self.direction === 1;
          if (down && y > 200 && !hidden) {
            hidden = true;
            gsap.to(root.current, { yPercent: -160, duration: 0.4, ease: "power3.out", overwrite: "auto" });
          } else if ((!down || y < 100) && hidden) {
            hidden = false;
            gsap.to(root.current, { yPercent: 0, duration: 0.45, ease: "power3.out", overwrite: "auto" });
          }
        },
      });
    },
    { dependencies: [ready] },
  );

  const links = [
    { label: "Problem", href: "#problem" },
    { label: "How", href: "#how" },
    { label: "Who", href: "#who" },
    { label: "Why", href: "#why" },
  ];

  return (
    <header
      ref={root}
      className="nav"
      style={{
        position: "fixed",
        top: 14,
        left: 0,
        right: 0,
        zIndex: 100,
        visibility: ready ? "visible" : "hidden",
      }}
    >
      <GlassFilter />
      <div
        className="nav__card"
        style={{
          position: "relative",
          width: "min(100% - 2 * var(--gutter), var(--container))",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 18px",
          borderRadius: 14,
        }}
      >
        {/* liquid-glass layers — visible only in the scrolled state */}
        <span className="nav__glass" aria-hidden>
          <span className="nav__glass-distort" />
          <span className="nav__glass-tint" />
          <span className="nav__glass-shine" />
        </span>
        <a
          href="#top"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontWeight: 400,
            letterSpacing: "-0.025em",
            fontSize: 19,
          }}
        >
          {/* dark tile keeps the white glyph legible on both nav states;
              the intro lockup docks onto this element */}
          <span
            className="nav-brand-logo"
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: "var(--black)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <img src="/novonus-logo.png" alt="" style={{ width: 18, height: 18, objectFit: "contain" }} />
          </span>
          Novonus
        </a>
        <nav
          className="nav__links"
          style={{ display: "flex", gap: "1.9rem", alignItems: "center" }}
        >
          {links.map((l) => (
            <a key={l.label} href={l.href} className="mono-label nav__link">
              {l.label}
            </a>
          ))}
        </nav>
        {/* start a pilot — Cal.com popup; purple with black text */}
        <Magnetic strength={0.25}>
          <button
            type="button"
            className="btn btn--fill"
            style={{
              padding: "10px 20px",
              background: "var(--accent)",
              borderColor: "var(--accent)",
              color: "#0a0a09",
            }}
            data-cal-namespace="deepayan"
            data-cal-link="deepayan"
            data-cal-config={'{"layout":"month_view"}'}
          >
            Start a pilot
          </button>
        </Magnetic>
      </div>
    </header>
  );
}

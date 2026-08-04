import { useRef } from "react";
import { gsap } from "../lib/gsapSetup";
import { useGSAP } from "@gsap/react";

/* ============================================================================
   INTRO SEQUENCE — the novonus.com cinematic opener, ported to v2:

     loadingBar (850ms) — the hero artwork centered; the helmet visor fills
                          bottom-up (red, as on the original) as progress.
     logoPop   (1200ms) — violet halo; the N glyph pops into the center;
                          the wordmark slides out from behind it.
     dock       (~450ms) — the lockup flies to the nav's brand tile, the
                          wordmark retracts, the site fades in beneath.

   Smoothness/compat notes: every animated property is transform/opacity
   (the wipe is a masked x-slide, the fill is a scaleY — no clip-path, no
   height animation); intro images are decoded before the timeline starts
   (with a timeout fallback); vh units only; reduced-motion skips it all.
   ========================================================================== */

const LOADING_BAR_S = 0.85;
const HOLD_S = 0.06;
const INTRO_IMAGES = [
  "/hero-image.png",
  "/helmet-silhouette.png",
  "/hero-lines-overlay.png",
  "/novonus-logo.png",
];

export function Preloader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduced = false;
      if (reduced) {
        gsap.set(root.current, { display: "none" });
        onDone();
        return;
      }
      const q = gsap.utils.selector(root);

      gsap.set(q(".intro-lockup"), { autoAlpha: 0, scale: 0, force3D: true });
      gsap.set(q(".intro-wordmark-inner"), { xPercent: -108 });
      gsap.set(q(".intro-halo"), { autoAlpha: 0, scale: 0.6 });
      gsap.set(q(".intro-fill"), { scaleY: 0, transformOrigin: "50% 100%" });

      let cancelled = false;

      /* decode the intro imagery first so the sequence never plays over a
         blank frame on slow connections/devices; cap the wait at 900ms */
      const decodeAll = Promise.all(
        INTRO_IMAGES.map((src) => {
          const im = new Image();
          im.src = src;
          return im.decode().catch(() => {});
        }),
      );
      const timeout = new Promise((r) => setTimeout(r, 900));

      Promise.race([decodeAll, timeout]).then(() => {
        if (cancelled || !root.current) return;
        const tl = gsap.timeline({ defaults: { force3D: true } });

        /* — loading bar: the helmet fills bottom-up — */
        tl.to(q(".intro-fill"), { scaleY: 1, duration: LOADING_BAR_S, ease: "power1.inOut" });
        tl.to({}, { duration: HOLD_S });

        /* — logo pop — */
        tl.to(q(".intro-art"), { autoAlpha: 0, duration: 0.3, ease: "power2.out" });
        tl.to(q(".intro-halo"), { autoAlpha: 1, scale: 1.05, duration: 0.38, ease: "power2.out" }, "<");
        tl.to(q(".intro-lockup"), { autoAlpha: 1, scale: 1, duration: 0.62, ease: "back.out(1.5)" }, "<0.05");
        tl.to(q(".intro-wordmark-inner"), { xPercent: 0, duration: 0.65, ease: "power3.inOut" }, "<0.38");
        tl.to({}, { duration: 0.17 });

        /* — dock: fly to the nav brand tile; the site rises beneath — */
        tl.add(() => {
          onDone();
          const rootEl = root.current;
          if (!rootEl) return;
          const lockup = rootEl.querySelector<HTMLElement>(".intro-lockup");
          const logo = rootEl.querySelector<HTMLElement>(".intro-logo");
          const nav = document.querySelector<HTMLElement>(".nav-brand-logo");
          if (!lockup || !logo) return;
          const lr = logo.getBoundingClientRect();
          const gr = lockup.getBoundingClientRect();
          const nr = nav?.getBoundingClientRect();
          /* rects arrive in zoomed visual px, gsap x/y apply in layout px */
          const z = parseFloat(document.body.style.zoom || "1") || 1;
          const dx = (nr ? nr.left + nr.width / 2 - (lr.left + lr.width / 2) : 0) / z;
          const dy =
            (nr
              ? nr.top + nr.height / 2 - (lr.top + lr.height / 2)
              : -(lr.top + lr.height / 2 - 40)) / z;
          const sc = nr ? nr.height / lr.height : 0.16;
          const originX = (lr.left - gr.left + lr.width / 2) / z;
          gsap.to(lockup, {
            x: dx,
            y: dy,
            scale: sc,
            duration: 0.45,
            ease: "power3.inOut",
            force3D: true,
            transformOrigin: `${originX}px 50%`,
          });
        });
        tl.to(q(".intro-wordmark-inner"), { xPercent: -108, duration: 0.22, ease: "power3.in" }, "<");
        tl.to(q(".intro-halo"), { autoAlpha: 0, scale: 1.6, duration: 0.3, ease: "power2.in" }, "<");
        tl.to(q(".intro-overlay"), { autoAlpha: 0, duration: 0.3, ease: "power2.out" }, "<0.1");
        tl.to(q(".intro-lockup"), { autoAlpha: 0, duration: 0.2 }, "-=0.08");
        tl.set(root.current, { display: "none" });
      });

      return () => {
        cancelled = true;
      };
    },
    { scope: root },
  );

  return (
    <div ref={root} aria-hidden style={{ position: "fixed", inset: 0, zIndex: 300 }}>
      {/* black overlay with a faint violet center glow */}
      <div
        className="intro-overlay"
        style={{ position: "absolute", inset: 0, background: "var(--black)", willChange: "opacity" }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: "min(700px, 90vw)",
            height: "min(700px, 90vw)",
            transform: "translate(-50%, -50%)",
            background:
              "radial-gradient(circle, rgba(139,92,246,0.12), rgba(139,92,246,0.04) 45%, transparent 70%)",
            filter: "blur(10px)",
          }}
        />
      </div>

      {/* — loadingBar artwork: hero image + helmet fill + neon lines — */}
      <div
        className="intro-art"
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 1.5rem",
          mixBlendMode: "screen",
          willChange: "opacity",
        }}
      >
        <div
          style={{
            position: "relative",
            aspectRatio: "16 / 10",
            width: "min(72vw, calc(62vh * 1.6), 760px)",
            userSelect: "none",
          }}
        >
          <img
            src="/hero-image.png"
            alt=""
            decoding="async"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              mixBlendMode: "screen",
            }}
          />
          {/* timed fill — a full-height gradient scaled up from the bottom
              (transform-only) inside the helmet mask */}
          <div
            style={{
              position: "absolute",
              left: "19.38%",
              top: "2.43%",
              width: "48.70%",
              height: "70.66%",
              overflow: "hidden",
              WebkitMaskImage: "url(/helmet-silhouette.png)",
              maskImage: "url(/helmet-silhouette.png)",
              WebkitMaskSize: "100% 100%",
              maskSize: "100% 100%",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
            }}
          >
            <div
              className="intro-fill"
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to top, rgba(255,25,50,0.82) 0%, rgba(255,35,65,0.78) 55%, rgba(255,55,85,0.62) 78%, rgba(255,90,120,0.28) 92%, rgba(255,130,155,0) 100%)",
                mixBlendMode: "screen",
                willChange: "transform",
              }}
            />
          </div>
          {/* neon helmet line-work, red glow like the original */}
          <img
            src="/hero-lines-overlay.png"
            alt=""
            decoding="async"
            style={{
              position: "absolute",
              left: "19.38%",
              top: "2.43%",
              width: "48.70%",
              height: "70.66%",
              mixBlendMode: "screen",
              filter: "drop-shadow(0 0 10px rgba(255,55,85,0.7))",
            }}
          />
        </div>
      </div>

      {/* — violet halo behind the logo pop — */}
      <div
        className="intro-halo"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: 240,
          height: 240,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(139,92,246,0.7), rgba(139,92,246,0.3) 45%, transparent 72%)",
          filter: "blur(8px)",
          pointerEvents: "none",
          willChange: "transform, opacity",
        }}
      />

      {/* — logo + wordmark lockup — */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          className="intro-lockup"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "clamp(10px, 1.6vw, 18px)",
            willChange: "transform, opacity",
          }}
        >
          <img
            className="intro-logo"
            src="/novonus-logo.png"
            alt=""
            decoding="async"
            style={{
              width: "clamp(88px, 22vw, 144px)",
              aspectRatio: "1 / 1",
              objectFit: "contain",
            }}
          />
          {/* masked x-slide wipe — transform-only; padding protects the
              final glyph from the tight tracking */}
          <span
            className="intro-wordmark"
            style={{ overflow: "hidden", display: "inline-block", paddingRight: "0.12em" }}
          >
            <span
              className="intro-wordmark-inner"
              style={{
                display: "inline-block",
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                fontSize: "clamp(2rem, 8vw, 3.5rem)",
                whiteSpace: "nowrap",
                paddingRight: "0.12em",
                willChange: "transform",
              }}
            >
              Novonus
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

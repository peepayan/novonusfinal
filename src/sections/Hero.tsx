import { useEffect, useRef, useState } from "react";
import { getCalApi } from "@calcom/embed-react";
import { gsap, ScrollTrigger } from "../lib/gsapSetup";
import { useGSAP } from "@gsap/react";
import { ForceField } from "../components/ForceField";
import { Magnetic } from "../components/Magnetic";
import { ContactModal } from "../components/ContactModal";
import { DemoVideoModal } from "../components/DemoVideoModal";
import { useLineReveal } from "../hooks/useReveal";
import { hero } from "../content";

export function Hero({ ready }: { ready: boolean }) {
  const root = useRef<HTMLElement>(null);
  const railLine = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [amp, setAmp] = useState(1);
  /* distance from the section's bottom up to the rail hairline — the video's
     bottom edge is pinned to that line */
  const [videoInset, setVideoInset] = useState<number | null>(null);
  /* where the arm's visible left edge should land: just right of the
     headline's last glyph, measured from the real text boxes */
  const [videoLeft, setVideoLeft] = useState<number | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  /* pick the arm video in JS: Safari/WebKit answers "maybe" for webm and
     then can't decode the VP9 alpha, so only browsers that affirm VP9 get
     the alpha webm; everyone else gets the black-bg mp4, which the screen
     blend makes equivalent (QA-4 #1) */
  const [armSrc, setArmSrc] = useState<{ src: string; alpha: boolean } | null>(null);
  const title = useLineReveal<HTMLHeadingElement>({ when: ready, scroll: false, delay: 0.1 });

  useEffect(() => {
    /* real Safari answers "probably" for VP9 webm but strips the ALPHA
       channel, painting an opaque slab behind the arm; no codec query
       exposes alpha support, so Safari is excluded by UA and gets the
       black-bg mp4 (the screen blend makes it equivalent) */
    const isSafari = /^((?!chrome|crios|chromium|android|edg).)*safari/i.test(navigator.userAgent);
    const probe = document.createElement("video");
    const webm = !isSafari && probe.canPlayType('video/webm; codecs="vp9"') === "probably";
    setArmSrc(
      webm
        ? { src: "/robot-arm-hero-alpha-1080p.webm", alpha: true }
        : { src: "/robot-arm-hero-1080p.mp4", alpha: false },
    );
  }, []);

  /* Safari refuses autoplay unless the muted ATTRIBUTE is present (React
     only sets the property) and shows a play-button overlay on the poster
     frame. Force the attributes and retry playback on readiness and on the
     first user gesture. */
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !armSrc) return;
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute("muted", "");
    v.setAttribute("webkit-playsinline", "");
    const tryPlay = () => {
      const p = v.play();
      if (p) p.catch(() => {});
    };
    tryPlay();
    v.addEventListener("canplay", tryPlay);
    const onFirst = () => {
      tryPlay();
      window.removeEventListener("pointerdown", onFirst);
      window.removeEventListener("touchstart", onFirst);
      window.removeEventListener("wheel", onFirst);
    };
    window.addEventListener("pointerdown", onFirst);
    window.addEventListener("touchstart", onFirst, { passive: true });
    window.addEventListener("wheel", onFirst, { passive: true });
    return () => {
      v.removeEventListener("canplay", tryPlay);
      window.removeEventListener("pointerdown", onFirst);
      window.removeEventListener("touchstart", onFirst);
      window.removeEventListener("wheel", onFirst);
    };
  }, [armSrc]);

  /* Cal.com popup booking — drives every "Start a pilot" button */
  useEffect(() => {
    (async () => {
      const cal = await getCalApi({ namespace: "deepayan" });
      cal("ui", { hideEventTypeDetails: false, layout: "month_view" });
    })();
  }, []);

  useEffect(() => {
    const measure = () => {
      const line = railLine.current;
      const sec = root.current;
      if (!line || !sec) return;
      /* the proportional page zoom (App.tsx) scales painted output, but the
         transform/inset values below are applied in LAYOUT px; rects and
         innerWidth arrive in zoomed visual px, so divide them back down */
      const z = parseFloat(document.body.style.zoom || "1") || 1;
      setVideoInset(Math.max(0, (sec.getBoundingClientRect().bottom - line.getBoundingClientRect().top) / z));
      const h1 = title.current;
      const vid = videoRef.current;
      if (h1 && vid) {
        /* walk text nodes only — element rects from the split-mask line
           wrappers span the full container width and would lie */
        const walker = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
        let textRight = 0;
        while (walker.nextNode()) {
          const r = document.createRange();
          r.selectNodeContents(walker.currentNode);
          for (const box of r.getClientRects()) {
            if (box.width > 0) textRight = Math.max(textRight, box.right);
          }
        }
        if (textRight > 0) {
          const w = vid.offsetWidth; /* offsetWidth is already layout px */
          setVideoLeft(Math.min(textRight / z - 95, window.innerWidth / z + 70 - 0.301 * w));
        }
      }
    };
    measure();
    document.fonts?.ready.then(() => measure()).catch(() => {});
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [ready, title, armSrc]);

  useGSAP(
    () => {
      if (!ready) return;
      const reduced = false;

      /* eyebrow decodes like an instrument booting */
      if (!reduced) {
        gsap.to(".hero-eyebrow-text", {
          duration: 1.4,
          delay: 0.25,
          scrambleText: {
            text: hero.eyebrow.toUpperCase(),
            chars: "upperCase",
            speed: 0.4,
          },
        });
      } else {
        /* no scramble: write the label directly (QA-4 #5) */
        const el = root.current?.querySelector(".hero-eyebrow-text");
        if (el) el.textContent = hero.eyebrow.toUpperCase();
      }

      /* bottom rail boots: hairline draws, contents rise */
      gsap
        .timeline({ delay: 0.55 })
        .from(".hero-rail-line", { scaleX: 0, transformOrigin: "left", duration: 0.9, ease: "power3.out" })
        .from(
          ".hero-rail > *",
          { y: 22, autoAlpha: 0, duration: 0.6, stagger: 0.09, ease: "power2.out" },
          "-=0.45",
        );

      /* the field calms as the hero exits */
      ScrollTrigger.create({
        trigger: root.current,
        start: "top top",
        end: "bottom top",
        scrub: true,
        onUpdate: (self) => setAmp(1 - self.progress * 0.85),
      });
    },
    { dependencies: [ready], scope: root },
  );

  return (
    <section
      ref={root}
      id="top"
      style={{
        position: "relative",
        minHeight: "calc(100svh / var(--z, 1))",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        overflow: "hidden",
      }}
    >
      {/* WebGL mounts only after the intro so it never competes with the
          preloader for GPU time on weaker devices */}
      {ready && <ForceField amplitude={amp} />}
      {/* looping robot-arm background — alpha webm over the page background,
          black-background mp4 as the Safari fallback. Screen-blended into the
          force field with a top fade so it reads as part of the scene; its
          bottom edge is pinned to the rail hairline under the title. Contained
          so the arm never crops, and click-transparent. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: videoInset ?? "38%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-start",
          pointerEvents: "none",
        }}
      >
        {/* violet ground pool where the arm's base meets the rail line */}
        <div
          style={{
            position: "absolute",
            bottom: -70,
            left:
              videoLeft != null
                ? `calc(${Math.round(videoLeft)}px + 0.15 * min(76vw, 1120px) - 260px)`
                : "auto",
            right: videoLeft == null ? "4vw" : "auto",
            width: 520,
            height: 190,
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at center, rgba(139,92,246,0.32), rgba(139,92,246,0.10) 48%, transparent 72%)",
            filter: "blur(18px)",
            pointerEvents: "none",
          }}
        />
        {/* the arm's pixels occupy x 39.9–69.9% of the frame (30.1–60.1% once
            mirrored), bottom 90.4% — the translate lands the CONTENT's left
            edge just right of the headline text, its true bottom on the rail
            line; scaleX(-1) flips the arm to face the text. The drop-shadow
            follows the webm's alpha, rimming the arm in violet. */}
        {armSrc && (
          <video
            ref={videoRef}
            src={armSrc.src}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            style={{
              width: "min(76vw, 1120px)",
              aspectRatio: "16 / 9",
              objectFit: "contain",
              transform: `translate(${
                videoLeft != null ? `calc(${Math.round(videoLeft)}px - 30.1%)` : "calc(62vw - 30.1%)"
              }, 9.6%) scaleX(-1)`,
              mixBlendMode: "screen",
              opacity: 0.92,
              /* the silhouette glow needs the alpha channel; on the mp4 it
                 would halo the whole rectangle */
              filter: armSrc.alpha ? "drop-shadow(0 0 22px rgba(139,92,246,0.45))" : "none",
              WebkitMaskImage: "linear-gradient(to top, black 72%, transparent 98%)",
              maskImage: "linear-gradient(to top, black 72%, transparent 98%)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>
      {/* legibility vignette, top + bottom */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(#060605 0%, transparent 32%, transparent 62%, #060605 100%)",
          pointerEvents: "none",
        }}
      />

      <div className="container" style={{ position: "relative", zIndex: 2, paddingBottom: "1.8rem" }}>
        <span
          className="chip"
          style={{
            visibility: ready ? "visible" : "hidden",
            background: "rgba(255, 255, 255, 0.72)",
            borderColor: "rgba(255, 255, 255, 0.4)",
            color: "#0a0a09",
            WebkitBackdropFilter: "blur(8px)",
            backdropFilter: "blur(8px)",
          }}
        >
          <span className="hero-eyebrow-text">{" "}</span>
        </span>

        {/* hero.title with a controlled two-line break:
            "Infrastructure for Training / Robots in Manufacturing" */}
        <h1
          ref={title}
          className="display split-mask"
          style={{
            marginTop: "1.1rem",
            maxWidth: "100%",
            fontSize: "clamp(3rem, 6.6vw, 6.2rem)",
            visibility: ready ? "visible" : "hidden",
          }}
        >
          Infrastructure for Training
          <br className="hero-br" />
          Robots in Manufacturing
        </h1>

        {/* hero bottom information rail */}
        <div
          ref={railLine}
          className="hero-rail-line"
          style={{
            marginTop: "clamp(1.8rem, 4vh, 3rem)",
            borderTop: "1px solid var(--hair-dark)",
          }}
        />
        <div
          className="hero-rail"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "1.5rem 2.5rem",
            justifyContent: "space-between",
            paddingTop: "1.4rem",
          }}
        >
          <p
            className="dot body-mut"
            style={{ maxWidth: "52ch", fontSize: 15, lineHeight: 1.55, flex: "1 1 380px" }}
          >
            {hero.subtitle}
          </p>
          <div style={{ display: "flex", gap: "0.8rem", alignItems: "center", flexWrap: "wrap" }}>
            <Magnetic strength={0.25}>
              <button
                type="button"
                onClick={() => setVideoOpen(true)}
                aria-label="Play demo video"
                className="btn btn--fill"
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <svg width="10" height="10" viewBox="0 0 11 11" fill="currentColor" aria-hidden>
                  <path d="M1.5 1.2v8.6a.6.6 0 0 0 .92.5l7-4.3a.6.6 0 0 0 0-1.02l-7-4.3A.6.6 0 0 0 1.5 1.2z" />
                </svg>
                Demo Video
              </button>
            </Magnetic>
            <button type="button" className="btn btn--ghost" onClick={() => setContactOpen(true)}>
              {hero.ctaContact}
            </button>
            <a href="https://novonus.com/demo" className="btn btn--ghost">
              {hero.ctaSecondary}
            </a>
          </div>
          <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
          <DemoVideoModal open={videoOpen} onClose={() => setVideoOpen(false)} />
          <a
            href="#problem"
            aria-label="Scroll to the problem section"
            className="hero-puck mono-label"
            style={{
              width: 84,
              height: 84,
              borderRadius: "50%",
              border: "1px solid var(--hair-dark)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              color: "var(--mut-dark)",
            }}
          >
            <span aria-hidden style={{ fontSize: 14 }}>
              ↓
            </span>
            Scroll
          </a>
        </div>
      </div>
    </section>
  );
}

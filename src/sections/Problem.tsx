import { Fragment, useRef, useState, type CSSProperties } from "react";
import { gsap, ScrollTrigger } from "../lib/gsapSetup";
import { useGSAP } from "@gsap/react";
import { DotBrain } from "../components/DotBrain";
import { MorphFigure } from "../components/MorphFigure";
import { problem } from "../content";

/* ============================================================================
   PROBLEM — two pinned movements.
   1. Statement: the heading reveals word-by-word while fig. 01 (the brain)
      assembles beside it.
   2. Chapters: the v1 deep-dive translated into the v2 system — each of the
      three problems gets a full-viewport beat; the copy crossfades while one
      dot field re-forms itself: clock → globe → the gap.
   ========================================================================== */

const CHAPTER_META = [
  { fig: "fig. 02", caption: "/ 16 hours to teach one part" },
  { fig: "fig. 03", caption: "/ 1.9M hands short by 2033" },
  { fig: "fig. 04", caption: "/ the gap vision can't cross" },
];

const N = problem.items.length;

export function Problem() {
  const root = useRef<HTMLElement>(null);
  const [chapter, setChapter] = useState(0);
  const chapterRef = useRef(0);
  const [entry, setEntry] = useState(0);

  useGSAP(
    () => {
      const reduced = false;

      /* — movement 1: word-by-word statement — */
      const words = gsap.utils.toArray<HTMLElement>(".problem-word");
      if (reduced) {
        gsap.set(words, { opacity: 1 });
      } else {
        gsap.fromTo(
          words,
          { opacity: 0.16 },
          {
            opacity: 1,
            ease: "none",
            stagger: 0.06,
            scrollTrigger: {
              trigger: ".problem-pin",
              start: "top top",
              end: "bottom bottom",
              scrub: 0.4,
            },
          },
        );
      }

      /* — movement 2: chapters — one animation per scroll: the page snaps
         to each chapter's center and rests there while the figure morphs */
      ScrollTrigger.create({
        trigger: ".problem-chapters",
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        snap: {
          snapTo: [0, 0.5 / N, 1.5 / N, 2.5 / N, 1],
          duration: { min: 0.35, max: 0.8 },
          delay: 0.02,
          ease: "power2.inOut",
          directional: true,
        },
        onUpdate: (self) => {
          setEntry(Math.min(1, self.progress * 4));
          const idx = Math.min(N - 1, Math.floor(self.progress * N));
          if (idx !== chapterRef.current) {
            chapterRef.current = idx;
            setChapter(idx);
          }
        },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="problem">
      {/* — movement 1: pinned statement + fig. 01 — a purple sheet; the
          chapters after it stay on black */}
      <div
        className="problem-pin"
        style={
          {
            height: "calc(220vh / var(--z, 1))",
            position: "relative",
            background: "#4c1d95",
            borderRadius: 20,
            marginInline: "var(--inset)",
            "--accent": "#c4b5fd",
          } as CSSProperties
        }
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            height: "calc(100svh / var(--z, 1))",
            display: "flex",
            alignItems: "center",
          }}
        >
          <div className="container">
            <div
              className="problem-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.25fr) minmax(0, 1fr)",
                gap: "clamp(2rem, 5vw, 5rem)",
                alignItems: "center",
              }}
            >
              <div>
                <span
                  className="chip"
                  style={
                    {
                      background: "rgba(255, 255, 255, 0.72)",
                      borderColor: "rgba(255, 255, 255, 0.4)",
                      color: "#0a0a09",
                      WebkitBackdropFilter: "blur(8px)",
                      backdropFilter: "blur(8px)",
                      /* the chip's "/" is a ::before colored by --accent */
                      "--accent": "#5b21b6",
                    } as CSSProperties
                  }
                >
                  {problem.eyebrow}
                </span>
                <h2
                  className="h2"
                  style={{ marginTop: "1.6rem", maxWidth: "18ch", fontSize: "clamp(2.3rem, 4.6vw, 4.4rem)" }}
                >
                  {problem.heading.split(" ").map((w, i, arr) => (
                    <Fragment key={i}>
                      <span className="problem-word" style={{ display: "inline-block" }}>
                        {w}
                      </span>
                      {i < arr.length - 1 ? " " : ""}
                    </Fragment>
                  ))}
                </h2>
              </div>

              {/* the know-how at stake — dots assemble in sync with the words */}
              <div
                className="ticks problem-brain"
                style={{
                  position: "relative",
                  aspectRatio: "1 / 1",
                  maxHeight: "min(calc(58vh / var(--z, 1)), 30rem)",
                  justifySelf: "end",
                  width: "min(100%, 30rem)",
                  padding: 14,
                }}
              >
                <span className="tick-b" aria-hidden />
                <DotBrain trigger=".problem-pin" start="top top" end="bottom bottom" />
                <span
                  className="mono-label"
                  style={{ position: "absolute", left: 16, bottom: 12, color: "var(--dim-dark)" }}
                >
                  / the know-how on the line
                </span>
                <span
                  className="mono-label"
                  style={{ position: "absolute", right: 16, top: 12, color: "var(--accent)" }}
                >
                  fig. 01
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* — movement 2: the deep-dive chapters — */}
      {/* 240vh per chapter: the snap gap outruns a single wheel flick, so one
          gesture advances exactly one chapter and rests there */}
      <div className="problem-chapters" style={{ height: `calc(${N * 240}vh / var(--z, 1))`, position: "relative" }}>
        <div
          style={{
            position: "sticky",
            top: 0,
            height: "calc(100svh / var(--z, 1))",
            overflow: "hidden",
            /* framed stage: top padding clears the fixed nav; header and
               progress anchor the frame edges, content owns the middle */
            paddingTop: "clamp(5rem, 9vh, 6.5rem)",
            paddingBottom: "clamp(1.8rem, 4vh, 3rem)",
            display: "flex",
          }}
        >
          <div
            className="container"
            style={{
              width: "100%",
              /* pulled in from the viewport edges — the chapter stage reads
                 as a centered composition, not a full-bleed spread */
              maxWidth: "min(100%, 1080px)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: 0,
              gap: "clamp(1rem, 2.5vh, 2rem)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                flexWrap: "wrap",
                flexShrink: 0,
                paddingBottom: "0.9rem",
                borderBottom: "1px solid var(--hair-dark)",
              }}
            >
              <span className="mono-label" style={{ color: "var(--dim-dark)" }}>
                / the hard way, up close
              </span>
              <span className="mono-label" style={{ color: "var(--accent)" }}>
                {String(chapter + 1).padStart(2, "0")} / {String(N).padStart(2, "0")}
              </span>
            </div>

            <div
              style={{
                flex: "1 1 auto",
                minHeight: 0,
                display: "flex",
                alignItems: "center",
              }}
            >
              <div
                className="chapters-grid"
                style={{
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 1fr)",
                  gap: "clamp(2rem, 4.5vw, 4.5rem)",
                  alignItems: "center",
                }}
              >
                {/* left: crossfading chapter copy — every chapter is centered
                    in the same fixed box so midlines never jump */}
                <div
                  className="chapter-copy"
                  style={{ position: "relative", height: "clamp(19rem, calc(44vh / var(--z, 1)), 25rem)" }}
                >
                  {problem.items.map((item, i) => (
                    <div
                      key={item.n}
                      style={{
                        position: "absolute",
                        inset: 0,
                        opacity: chapter === i ? 1 : 0,
                        transform: chapter === i ? "translateY(0)" : "translateY(14px)",
                        transition: "opacity 0.4s var(--ease-ui), transform 0.4s var(--ease-ui)",
                        pointerEvents: chapter === i ? "auto" : "none",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                      }}
                    >
                      <span className="mono-label" style={{ color: "var(--accent)" }}>
                        [{item.n}]
                      </span>
                      <h3
                        style={{
                          marginTop: "0.9rem",
                          fontWeight: 400,
                          letterSpacing: "-0.02em",
                          lineHeight: 1.1,
                          fontSize: "clamp(1.7rem, 3.1vw, 3rem)",
                          maxWidth: "20ch",
                        }}
                      >
                        {item.title}
                      </h3>
                      <p
                        className="body-mut chapter-body"
                        style={{ marginTop: "1.1rem", maxWidth: "54ch", fontSize: 15.5, lineHeight: 1.72 }}
                      >
                        {item.body}
                      </p>
                    </div>
                  ))}
                </div>

                {/* right: the morphing figure */}
                <div
                  className="ticks chapter-figure"
                  style={{
                    position: "relative",
                    aspectRatio: "1 / 1",
                    maxHeight: "min(calc(52vh / var(--z, 1)), 29rem)",
                    justifySelf: "end",
                    alignSelf: "center",
                    width: "min(100%, 29rem)",
                    padding: 14,
                  }}
                >
                  <span className="tick-b" aria-hidden />
                  <MorphFigure shapeIndex={chapter} entry={entry} />
                  <span
                    className="mono-label"
                    style={{ position: "absolute", left: 16, bottom: 12, color: "var(--dim-dark)" }}
                  >
                    {CHAPTER_META[chapter].caption}
                  </span>
                  <span
                    className="mono-label"
                    style={{ position: "absolute", right: 16, top: 12, color: "var(--accent)" }}
                  >
                    {CHAPTER_META[chapter].fig}
                  </span>
                </div>
              </div>
            </div>

            {/* chapter progress hairlines — anchored to the frame's foot */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${N}, 1fr)`,
                gap: 8,
                flexShrink: 0,
              }}
            >
              {problem.items.map((item, i) => (
                <div key={item.n}>
                  <div
                    style={{
                      height: 2,
                      background: chapter >= i ? "var(--accent)" : "rgba(255,255,255,0.14)",
                      transition: "background-color 0.3s var(--ease-ui)",
                    }}
                  />
                  <span
                    className="mono-label chapter-seg-label"
                    style={{
                      marginTop: 8,
                      display: "block",
                      fontSize: 10,
                      color: chapter === i ? "var(--mut-dark)" : "var(--dim-dark)",
                      transition: "color 0.3s var(--ease-ui)",
                    }}
                  >
                    [{item.n}]
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

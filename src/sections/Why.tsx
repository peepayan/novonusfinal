import { useRef } from "react";
import { gsap } from "../lib/gsapSetup";
import { useGSAP } from "@gsap/react";
import { useLineReveal } from "../hooks/useReveal";
import { why } from "../content";

/* White sheet: heading + four hairline ledger rows (mono numeral · title · body). */
export function Why() {
  const root = useRef<HTMLElement>(null);
  const head = useLineReveal<HTMLHeadingElement>();

  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>(".why-row").forEach((row) => {
        gsap.from(row, {
          autoAlpha: 0,
          y: 22,
          duration: 0.55,
          ease: "power2.out",
          scrollTrigger: { trigger: row, start: "top 88%", once: true },
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="sheet section-pad" id="why" style={{ marginTop: "var(--inset)" }}>
      <div className="container">
        <span className="chip">{why.eyebrow}</span>
        <h2 ref={head} className="h2 split-mask" style={{ marginTop: "1.6rem" }}>
          {why.heading}
        </h2>

        <div style={{ marginTop: "clamp(2.5rem, 6vh, 4rem)" }}>
          {why.rows.map((r) => (
            <div
              key={r.n}
              className="why-row"
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(52px, 80px) minmax(0, 0.9fr) minmax(0, 1.4fr)",
                gap: "clamp(1rem, 3vw, 3rem)",
                padding: "clamp(1.4rem, 2.6vh, 2.2rem) 0",
                borderTop: "1px solid var(--hair-light)",
                alignItems: "start",
              }}
            >
              <span className="mono-label" style={{ color: "var(--accent)", paddingTop: 5 }}>
                [{r.n}]
              </span>
              <h3
                style={{
                  fontWeight: 500,
                  letterSpacing: "-0.015em",
                  fontSize: "clamp(1.15rem, 1.7vw, 1.5rem)",
                  lineHeight: 1.25,
                }}
              >
                {r.title}
              </h3>
              <p className="body-mut why-row-body" style={{ fontSize: 14.5, lineHeight: 1.72 }}>
                {r.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

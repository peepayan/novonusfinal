import { useState } from "react";
import { useLineReveal, useFadeUp } from "../hooks/useReveal";
import { Magnetic } from "../components/Magnetic";
import { ContactModal } from "../components/ContactModal";
import { cta } from "../content";

/* THE accent moment — a solid accent-purple sheet with dark type. */
export function CtaBand() {
  const head = useLineReveal<HTMLHeadingElement>();
  const right = useFadeUp<HTMLDivElement>({ delay: 0.12 });
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <section
      className="on-accent"
      id="cta"
      style={{
        background: "var(--accent)",
        color: "var(--accent-ink)",
        borderRadius: 20,
        marginInline: "var(--inset)",
        paddingBlock: "clamp(4.5rem, 10vh, 8rem)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: "-30% -30% auto auto",
          width: "60%",
          height: "120%",
          background:
            "radial-gradient(50% 50%, rgba(255,255,255,0.28), rgba(255,255,255,0) 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />
      <div className="container" style={{ position: "relative" }}>
        <span
          className="mono-label"
          style={{ color: "rgba(18,10,30,0.72)" }}
        >
          / {cta.eyebrow}
        </span>
        <div
          className="split-band"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)",
            gap: "clamp(2rem, 5vw, 5rem)",
            marginTop: "1.6rem",
          }}
        >
          <h2
            ref={head}
            className="display split-mask"
            style={{ fontSize: "clamp(3rem, 7vw, 6.5rem)" }}
          >
            {cta.heading}
          </h2>
          <div
            ref={right}
            style={{
              borderLeft: "1px solid rgba(18,10,30,0.30)",
              paddingLeft: "clamp(1.5rem, 3vw, 2.8rem)",
              display: "flex",
              flexDirection: "column",
              gap: "1.8rem",
              justifyContent: "center",
            }}
          >
            <p style={{ color: "rgba(18,10,30,0.85)", fontSize: 16, lineHeight: 1.7 }}>
              {cta.body}
            </p>
            <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
              <Magnetic strength={0.25}>
                <button
                  type="button"
                  className="btn btn--dark"
                  data-cal-namespace="deepayan"
                  data-cal-link="deepayan"
                  data-cal-config={'{"layout":"month_view"}'}
                >
                  {cta.primary}
                </button>
              </Magnetic>
              <button
                type="button"
                onClick={() => setContactOpen(true)}
                className="btn"
                style={{ border: "1px solid rgba(18,10,30,0.55)" }}
              >
                {cta.secondary}
              </button>
            </div>
            <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
          </div>
        </div>
      </div>
    </section>
  );
}

import { useLineReveal, useFadeUp } from "../hooks/useReveal";
import { scope } from "../content";

/* Purple sheet: what Novonus brings vs the integrator, the three-step
   engagement, pricing, and the hardware-agnostic closer from novonus.com. */
export function Scope() {
  const head = useLineReveal<HTMLHeadingElement>();
  const right = useFadeUp<HTMLDivElement>({ delay: 0.12 });
  const pricing = useFadeUp<HTMLDivElement>();
  const agnostic = useFadeUp<HTMLDivElement>();

  return (
    <section
      className="sheet sheet--purple section-pad"
      id="scope"
      style={{ marginTop: "var(--inset)" }}
    >
      <div className="container">
        <span className="chip">{scope.eyebrow}</span>
        <div
          className="split-band"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1fr)",
            gap: "clamp(2rem, 5vw, 5rem)",
            marginTop: "2rem",
          }}
        >
          <h2 ref={head} className="h2 split-mask" style={{ maxWidth: "16ch" }}>
            {scope.heading}
          </h2>
          {/* the three-step engagement, stacked beside the heading */}
          <div
            ref={right}
            style={{
              borderLeft: "1px solid var(--hair-light)",
              paddingLeft: "clamp(1.5rem, 3vw, 2.8rem)",
              display: "flex",
              flexDirection: "column",
              gap: "clamp(1.6rem, 3.5vh, 2.4rem)",
            }}
          >
            {scope.steps.map((s, i) => (
              <div
                key={s.n}
                style={
                  i > 0
                    ? { borderTop: "1px solid var(--hair-light)", paddingTop: "clamp(1.6rem, 3.5vh, 2.4rem)" }
                    : undefined
                }
              >
                <span className="mono-label" style={{ color: "var(--accent)" }}>
                  [{s.n}]
                </span>
                <h3
                  style={{
                    marginTop: "0.7rem",
                    fontWeight: 400,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.15,
                    fontSize: "clamp(1.3rem, 1.9vw, 1.7rem)",
                  }}
                >
                  {s.title}
                </h3>
                <p style={{ marginTop: "0.7rem", color: "var(--mut-light)", fontSize: 15, lineHeight: 1.7 }}>
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* pricing — chip label in its own rounded box, like /scope */}
        <div
          ref={pricing}
          className="split-band"
          style={{
            marginTop: "clamp(2.5rem, 6vh, 4rem)",
            paddingTop: "clamp(1.8rem, 4vh, 2.6rem)",
            borderTop: "1px solid var(--hair-light)",
            display: "grid",
            gridTemplateColumns: "minmax(120px, 220px) minmax(0, 1fr)",
            gap: "clamp(1.5rem, 4vw, 4rem)",
          }}
        >
          <span className="chip" style={{ justifySelf: "start", alignSelf: "start" }}>
            {scope.pricingLabel}
          </span>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "72ch" }}>
            {scope.pricingPoints.map((pt, i) => (
              <li
                key={i}
                style={{ display: "flex", gap: "0.9rem", color: "var(--mut-light)", fontSize: 15.5, lineHeight: 1.65 }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    marginTop: "0.5em",
                    flexShrink: 0,
                  }}
                />
                {pt}
              </li>
            ))}
          </ul>
        </div>

        {/* hardware agnostic — from novonus.com */}
        <div
          ref={agnostic}
          className="split-band"
          style={{
            marginTop: "clamp(2.5rem, 6vh, 4rem)",
            paddingTop: "clamp(1.8rem, 4vh, 2.6rem)",
            borderTop: "1px solid var(--hair-light)",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1fr)",
            gap: "clamp(2rem, 5vw, 5rem)",
            alignItems: "end",
          }}
        >
          <div>
            <span className="chip" style={{ justifySelf: "start" }}>
              {scope.agnosticKicker}
            </span>
            <h3
              style={{
                marginTop: "0.9rem",
                fontWeight: 400,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                fontSize: "clamp(1.8rem, 3vw, 2.8rem)",
                maxWidth: "18ch",
              }}
            >
              {scope.agnosticHeading}
            </h3>
          </div>
          <p style={{ color: "var(--mut-light)", fontSize: 15, lineHeight: 1.72 }}>
            {scope.agnosticBody}
          </p>
        </div>
      </div>
    </section>
  );
}

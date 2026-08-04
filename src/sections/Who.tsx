import { useLineReveal, useFadeUp } from "../hooks/useReveal";
import { who } from "../content";

/* White sheet: h2, "where it fits" chip row, 3-col hairline feature grid. */
export function Who() {
  const head = useLineReveal<HTMLHeadingElement>();
  const chips = useFadeUp<HTMLDivElement>({ delay: 0.1 });
  const grid = useFadeUp<HTMLDivElement>({ delay: 0.15 });

  return (
    <section className="sheet section-pad" id="who" style={{ marginTop: "var(--inset)" }}>
      <div className="container">
        <span className="chip">{who.eyebrow}</span>
        <h2 ref={head} className="h2 split-mask" style={{ marginTop: "1.6rem", maxWidth: "20ch" }}>
          {who.heading}
        </h2>

        <div
          ref={chips}
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "0.6rem",
            marginTop: "2.2rem",
          }}
        >
          <span className="mono-label" style={{ color: "var(--dim-light)", marginRight: "0.6rem" }}>
            {who.fitsLabel}
          </span>
          {who.fits.map((f) => (
            <span key={f} className="chip">
              {f}
            </span>
          ))}
        </div>

        <div
          ref={grid}
          className="who-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            marginTop: "clamp(2.5rem, 6vh, 4rem)",
            borderTop: "1px solid var(--hair-light)",
          }}
        >
          {who.cards.map((c, i) => (
            <article
              key={c.title}
              style={{
                padding: "clamp(1.6rem, 2.6vw, 2.6rem) clamp(1.2rem, 2.2vw, 2.2rem)",
                borderLeft: i > 0 ? "1px solid var(--hair-light)" : "none",
              }}
            >
              <span className="mono-label" style={{ color: "var(--accent)" }}>
                [{String(i + 1).padStart(2, "0")}]
              </span>
              <h3
                style={{
                  marginTop: "1rem",
                  fontWeight: 500,
                  letterSpacing: "-0.015em",
                  fontSize: "clamp(1.15rem, 1.6vw, 1.45rem)",
                  lineHeight: 1.2,
                }}
              >
                {c.title}
              </h3>
              <p className="body-mut" style={{ marginTop: "0.8rem", fontSize: 14.5, lineHeight: 1.7 }}>
                {c.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

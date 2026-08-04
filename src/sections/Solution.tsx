import { useLineReveal, useFadeUp } from "../hooks/useReveal";
import { solution } from "../content";

/* White sheet, split band: h2 left · vertical hairline · dot-paragraph right. */
export function Solution() {
  const head = useLineReveal<HTMLHeadingElement>();
  const right = useFadeUp<HTMLDivElement>({ delay: 0.15 });
  const quote = useFadeUp<HTMLParagraphElement>();

  return (
    <section className="sheet section-pad" id="solution">
      <div className="container">
        <span className="chip">{solution.eyebrow}</span>
        <div
          className="split-band"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1fr)",
            gap: "clamp(2rem, 5vw, 5rem)",
            marginTop: "2rem",
          }}
        >
          <h2 ref={head} className="h2 split-mask" style={{ maxWidth: "14ch" }}>
            {solution.heading}
          </h2>
          <div
            ref={right}
            style={{
              borderLeft: "1px solid var(--hair-light)",
              paddingLeft: "clamp(1.5rem, 3vw, 2.8rem)",
            }}
          >
            <p className="dot" style={{ color: "var(--mut-light)", fontSize: 16.5, lineHeight: 1.72 }}>
              {solution.body}
            </p>
          </div>
        </div>

        <p
          ref={quote}
          style={{
            marginTop: "clamp(3rem, 7vh, 5.5rem)",
            paddingTop: "1.6rem",
            borderTop: "1px solid var(--hair-light)",
            fontWeight: 500,
            letterSpacing: "-0.015em",
            lineHeight: 1.3,
            fontSize: "clamp(1.25rem, 2.2vw, 1.8rem)",
            maxWidth: "34ch",
          }}
        >
          {solution.pullQuote}
        </p>
      </div>
    </section>
  );
}

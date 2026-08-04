import { footer } from "../content";

/* Black footer: small print, then the giant NOVONUS. wordmark dissolving
   into the page's very end. */
export function Footer() {
  return (
    <footer className="section-pad" style={{ paddingBottom: 0, overflow: "hidden" }}>
      <div className="container">
        <div
          className="hair-t"
          style={{
            paddingTop: "1.2rem",
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <span className="mono-label" style={{ color: "var(--dim-dark)" }}>
            {footer.line}
          </span>
          <span className="mono-label" style={{ color: "var(--dim-dark)" }}>
            {footer.year}
          </span>
        </div>

        {/* the very end: NOVONUS. fading out top-to-bottom into the page edge */}
        <p
          aria-label="Novonus"
          className="display"
          style={{
            margin: "clamp(2rem, 5vh, 3.5rem) 0 0",
            fontSize: "clamp(2.6rem, 15.5vw, 15rem)",
            lineHeight: 0.82,
            letterSpacing: "-0.03em",
            whiteSpace: "nowrap",
            textAlign: "center",
            color: "var(--accent)",
            WebkitMaskImage: "linear-gradient(to bottom, black 6%, rgba(0,0,0,0) 92%)",
            maskImage: "linear-gradient(to bottom, black 6%, rgba(0,0,0,0) 92%)",
          }}
        >
          NOVONUS
        </p>
      </div>
    </footer>
  );
}

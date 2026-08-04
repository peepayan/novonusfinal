import { useRef } from "react";
import { gsap } from "../lib/gsapSetup";
import { useGSAP } from "@gsap/react";
import { useFadeUp } from "../hooks/useReveal";
import { brand } from "../content";

/* Black typographic set piece: the name as a giant solid/outline duet,
   then the novonus.com dictionary entry (per-root IPA, the Greek glyph,
   small-caps language tags, numbered senses) in the site's own type. */
export function Brand() {
  const root = useRef<HTMLElement>(null);
  const ledger = useFadeUp<HTMLDivElement>();
  const tail = useFadeUp<HTMLDivElement>({ delay: 0.1 });

  useGSAP(
    () => {
      gsap.from(".brand-word > span", {
        yPercent: 60,
        autoAlpha: 0,
        duration: 1,
        stagger: 0.12,
        ease: "power4.out",
        scrollTrigger: { trigger: ".brand-word", start: "top 82%", once: true },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="section-pad" id="brand">
      <div className="container">
        <span className="chip">{brand.kicker}</span>

        <div
          className="brand-word display"
          aria-label={brand.word}
          style={{
            marginTop: "1.8rem",
            fontSize: "clamp(4.2rem, 13vw, 12rem)",
            lineHeight: 0.95,
            letterSpacing: "-0.03em",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
          }}
        >
          <span>novo</span>
          <span style={{ color: "var(--accent)" }}>·</span>
          <span
            style={{
              color: "transparent",
              WebkitTextStroke: "1px rgba(255,255,255,0.65)",
            }}
          >
            nus
          </span>
        </div>

        <p className="mono-label" style={{ marginTop: "1rem", color: "var(--dim-dark)" }}>
          \ {brand.ipa} \ · noun · [{brand.etymology}]
        </p>

        {/* dictionary roots — the novonus.com entry: per-root IPA, the Greek
            glyph, small-caps language tags, numbered senses */}
        <div
          ref={ledger}
          style={{
            marginTop: "clamp(2.5rem, 6vh, 4rem)",
            maxWidth: 980,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "2.2rem clamp(2rem, 5vw, 4rem)",
          }}
        >
          {brand.roots.map((r) => (
            <article key={r.word}>
              <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem 0.75rem" }}>
                <h3
                  style={{
                    margin: 0,
                    fontWeight: 500,
                    fontSize: "clamp(1.55rem, 2.4vw, 2rem)",
                    lineHeight: 1,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {r.word}
                </h3>
                <span className="body-mut" style={{ fontSize: 15 }}>
                  {"\\ "}
                  <em>{r.ipa}</em>
                  {" \\"}
                </span>
                {r.greek ? (
                  <span
                    lang="grc"
                    style={{ fontStyle: "italic", fontSize: "clamp(1.3rem, 2vw, 1.6rem)", fontWeight: 500 }}
                  >
                    {r.greek}
                  </span>
                ) : null}
              </div>
              <p style={{ margin: "0.4rem 0 0", fontSize: 14.5, color: "var(--accent)" }}>
                <em>{r.pos}</em>
                <span style={{ color: "var(--dim-dark)", margin: "0 0.5rem" }}>·</span>
                <span style={{ fontVariant: "small-caps", letterSpacing: "0.08em" }}>{r.lang}</span>
              </p>
              <p
                className="body-mut"
                style={{
                  margin: "0.7rem 0 0",
                  fontSize: 16,
                  lineHeight: 1.55,
                  paddingLeft: "1.3rem",
                  textIndent: "-1.3rem",
                }}
              >
                <span style={{ fontWeight: 600, marginRight: "0.5rem" }}>1</span>
                <span style={{ color: "var(--dim-dark)", marginRight: "0.4rem" }}>:</span>
                {r.def}
              </p>
            </article>
          ))}
        </div>

        <hr
          style={{
            border: 0,
            borderTop: "1px solid var(--hair-dark)",
            margin: "2.2rem 0 1.8rem",
            maxWidth: 980,
          }}
        />

        {/* compound definition — the punchline lands last, numbered like a
            dictionary sense; the tailpiece sits centered beneath */}
        <div ref={tail} style={{ maxWidth: 980 }}>
          <p
            style={{
              margin: 0,
              fontSize: "clamp(1.35rem, 2.1vw, 1.95rem)",
              lineHeight: 1.35,
              fontWeight: 400,
              letterSpacing: "-0.015em",
              paddingLeft: "1.6rem",
              textIndent: "-1.6rem",
            }}
          >
            <span style={{ fontWeight: 600, marginRight: "0.55rem" }}>1</span>
            <span style={{ color: "var(--dim-dark)", marginRight: "0.45rem" }}>:</span>
            {brand.punchline}
          </p>
          <p
            style={{
              margin: "1.8rem 0 0",
              fontWeight: 400,
              fontSize: "clamp(1.05rem, 1.5vw, 1.35rem)",
              lineHeight: 1.4,
              letterSpacing: "-0.015em",
            }}
          >
            {brand.tail}
          </p>
        </div>
      </div>
    </section>
  );
}

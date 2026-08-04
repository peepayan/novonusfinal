import { useRef } from "react";
import { gsap } from "../lib/gsapSetup";
import { useGSAP } from "@gsap/react";
import { stats } from "../content";

/* Black stat band: four elevated cards; values decode with ScrambleText. */
export function Stats() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduced = false;
      const cards = gsap.utils.toArray<HTMLElement>(".stat-card");
      gsap.from(cards, {
        autoAlpha: reduced ? 1 : 0,
        y: reduced ? 0 : 36,
        duration: 0.7,
        stagger: 0.12,
        ease: "power2.out",
        scrollTrigger: { trigger: root.current, start: "top 78%", once: true },
      });
      if (!reduced) {
        gsap.utils.toArray<HTMLElement>(".stat-value").forEach((el, i) => {
          const text = el.dataset.value ?? "";
          gsap.to(el, {
            duration: 1.1,
            delay: 0.25 + i * 0.12,
            scrambleText: { text, chars: "upperCase", speed: 0.5 },
            scrollTrigger: { trigger: root.current, start: "top 78%", once: true },
          });
        });
      }
    },
    { scope: root },
  );

  return (
    <section ref={root} className="section-pad" id="stats">
      <div className="container">
        <span className="chip">{stats.eyebrow}</span>
        <div
          className="stats-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "clamp(0.8rem, 1.2vw, 1.2rem)",
            marginTop: "2rem",
          }}
        >
          {stats.items.map((s, i) => (
            <article
              key={i}
              className="stat-card"
              style={{
                background: "var(--card-dark)",
                border: "1px solid var(--hair-dark)",
                borderRadius: 12,
                padding: "clamp(1.4rem, 2vw, 2rem)",
                minHeight: "15.5rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "2.2rem",
              }}
            >
              <span className="mono-label" style={{ color: "var(--accent)" }}>
                /{String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <div
                  className="stat-value mono-label"
                  data-value={s.value.toUpperCase()}
                  style={{
                    fontSize: "clamp(1.5rem, 2.4vw, 2.2rem)",
                    letterSpacing: "0.02em",
                    color: "var(--white)",
                    minHeight: "1.2em",
                  }}
                >
                  {s.value.toUpperCase()}
                </div>
                <p className="body-mut" style={{ marginTop: "0.8rem", fontSize: 13.5, lineHeight: 1.65 }}>
                  {s.label}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

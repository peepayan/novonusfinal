import { useEffect, useState } from "react";
import { initSmoothScroll } from "./lib/gsapSetup";
import { Preloader } from "./components/Preloader";
import { Nav } from "./components/Nav";
import { Hero } from "./sections/Hero";
import { Problem } from "./sections/Problem";
import { Solution } from "./sections/Solution";
import { HowItWorks } from "./sections/HowItWorks";
import { Who } from "./sections/Who";
import { Stats } from "./sections/Stats";
import { Why } from "./sections/Why";
import { Scope } from "./sections/Scope";
import { Brand } from "./sections/Brand";
import { CtaBand } from "./sections/CtaBand";
import { Footer } from "./sections/Footer";

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initSmoothScroll();
  }, []);

  /* Proportional scaling: 1536px (the founder's laptop viewport) is the
     reference composition. Only wider viewports zoom the page up linearly
     (capped at 1.5x) so every component keeps the same distribution
     instead of pooling dead space; at and below the reference nothing
     changes and the responsive rules take over. */
  useEffect(() => {
    const applyScale = () => {
      const w = window.innerWidth;
      const REF = 1536;
      const z = w > REF ? Math.min(w / REF, 1.5) : 1;
      document.body.style.zoom = z === 1 ? "" : String(z);
      /* viewport units (vh/svh) resolve against the REAL viewport and then
         get scaled by zoom; stage heights divide by --z to compensate */
      document.documentElement.style.setProperty("--z", String(z));
    };
    applyScale();
    window.addEventListener("resize", applyScale);
    return () => window.removeEventListener("resize", applyScale);
  }, []);

  return (
    <div className="grain">
      <Preloader onDone={() => setReady(true)} />
      <Nav ready={ready} />
      <main>
        <Hero ready={ready} />
        <Problem />
        <Solution />
        <HowItWorks />
        <Who />
        <Stats />
        <Why />
        <Scope />
        <Brand />
        <CtaBand />
        <Footer />
      </main>
    </div>
  );
}

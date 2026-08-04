import { useEffect, useState } from "react";
import { initSmoothScroll } from "./lib/gsapSetup";
import { Preloader } from "./components/Preloader";
import { Cursor } from "./components/Cursor";
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

  return (
    <div className="grain">
      <Preloader onDone={() => setReady(true)} />
      <Cursor />
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

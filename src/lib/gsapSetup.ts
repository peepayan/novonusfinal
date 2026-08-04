/* Single GSAP registration point — import this before any component that
   animates. Lenis drives scroll; ScrollTrigger listens to it via the
   standard ticker glue so pins/scrubs stay frame-accurate. */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);

let lenis: Lenis | null = null;

export function initSmoothScroll() {
  if (lenis) return lenis;
  lenis = new Lenis({ lerp: 0.1, anchors: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export function getLenis() {
  return lenis;
}

export { gsap, ScrollTrigger, SplitText };

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, SplitText } from "../lib/gsapSetup";

/* Masked SplitText line reveal — the site's standard headline entrance.
   Lines rise from behind an overflow mask on scroll-enter (or immediately
   when `when` flips true for above-the-fold text gated by the preloader). */
export function useLineReveal<T extends HTMLElement>(opts?: {
  when?: boolean;
  delay?: number;
  scroll?: boolean;
}) {
  const ref = useRef<T>(null);
  const { when = true, delay = 0, scroll = true } = opts ?? {};

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || !when) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      /* Hand-rolled line masks instead of SplitText's mask option: each
         wrapper clips the rising line but extends 0.18em below the line box
         (padding cancelled by negative margin) so descenders — g, y, p —
         are never cut off by tight display line-heights. */
      const split = SplitText.create(el, { type: "lines" });
      const wrappers: HTMLElement[] = [];
      split.lines.forEach((line) => {
        const wrap = document.createElement("div");
        wrap.style.overflow = "hidden";
        wrap.style.paddingBottom = "0.18em";
        wrap.style.marginBottom = "-0.18em";
        line.parentNode!.insertBefore(wrap, line);
        wrap.appendChild(line);
        wrappers.push(wrap);
      });
      gsap.from(split.lines, {
        yPercent: 125,
        duration: 1.05,
        stagger: 0.08,
        delay,
        ease: "power4.out",
        scrollTrigger: scroll
          ? { trigger: el, start: "top 85%", once: true }
          : undefined,
      });
      return () => {
        wrappers.forEach((w) => w.replaceWith(...Array.from(w.childNodes)));
        split.revert();
      };
    },
    { dependencies: [when], scope: ref },
  );

  return ref;
}

/* Fade-up batch for secondary elements. */
export function useFadeUp<T extends HTMLElement>(opts?: {
  when?: boolean;
  delay?: number;
  y?: number;
}) {
  const ref = useRef<T>(null);
  const { when = true, delay = 0, y = 26 } = opts ?? {};

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || !when) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(el, {
        autoAlpha: 0,
        y,
        duration: 0.7,
        delay,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    },
    { dependencies: [when], scope: ref },
  );

  return ref;
}

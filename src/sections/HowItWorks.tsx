import { useRef, useState } from "react";
import { gsap } from "../lib/gsapSetup";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { useGSAP } from "@gsap/react";
import { pipeline } from "../content";

gsap.registerPlugin(DrawSVGPlugin);
/* manim's `smooth` — quintic smootherstep, flat at both ends (research/inspiration-3b1b.md) */
gsap.registerEase("manimSmooth", (t) => t * t * t * (t * (6 * t - 15) + 10));

/* ============================================================================
   HOW IT WORKS — the pipeline told in the 3b1b grammar (see
   research/inspiration-3b1b.md): one persistent SVG world, five acts, one
   master scrubbed timeline. Nothing appears (everything draws on), nothing
   is discarded (objects carry across acts), nothing moves linearly except
   the conveyor — which never stops — and the deployed robot hand, which
   never stops working.

   SPATIAL ZONES (960×720) — every part of the process owns its own space:
     bench/demonstrate  bottom-left   (60–420,  400–580)
       glove hand rides the task path, presses the part in the fixture
     signature strip    under bench   (70–420,  620–668)
     train gate+skill   center        (330–670, 200–390)
     library            mid-left      (100–210, 150–380)  — bench dims first
     exit gate          x=700
     cloud              top, x≈725    (650–800,  48–140)  — the skill rises
     edge + robot hand  bottom-right  (660–910, 400–560)  STRAIGHT UP into it
     program bar        strip         (620–900, 630–655)
     control chart      top-left      (80–300,   60–200)  — ruler leaves first
     retrain loop       arcs chart → cloud across the top
   ========================================================================== */

const N = pipeline.steps.length;

const SENTENCES: string[][] = [
  [
    "Your worker performs the task by hand in the sensor rig, at a bench.",
    "Motion, finger pose, and force are all captured.",
    "The line never stops.",
  ],
  [
    "The pipeline turns those demonstrations into a force-aware skill built for your exact robot and gripper,",
    "trained only on data that matches your worker's real force signature.",
  ],
  [
    "Before a skill ever touches your robot, it is proven against the library of real demonstrations.",
    "Only skills that pass make it out.",
  ],
  [
    "The skill lands in your cloud library, versioned and never lost,",
    "then pushes to a compact edge device beside each robot.",
    "It runs entirely on-site, no internet required.",
    "Your robot's own program calls the skill for the hard part and takes control back.",
    "Hours, not weeks.",
  ],
  [
    "Parts vary, batches shift, lines change.",
    "Every cycle is checked by an independent success test,",
    "and when the world moves, the skill retrains overnight to keep up.",
    "You approve every update, and rollback is one click.",
  ],
];

/* the worker's hand path — the motif that echoes through the whole piece;
   it ends directly above the fixture so the press lands on the part */
const HAND_PATH = "M 104 486 C 158 446 202 466 236 452 C 268 444 282 410 316 420 C 348 430 366 436 392 448";

const W = "rgba(255,255,255,0.85)";
const WDIM = "rgba(255,255,255,0.4)";
const GHOST = "rgba(255,255,255,0.22)";
const PURPLE = "#8b5cf6";
const TEAL = "#5eead4";
const GREEN = "#83C167";
const RED = "#FC6255";
const MONO = "'DM Mono', monospace";

/* Original articulated robotic hand — palm block, three 2-joint fingers,
   opposing thumb; joints marked with circles (our line-art language).
   Each finger sits in its own group so the ambient loop can flex it. */
function RoboticHand({
  className,
  x,
  y,
  scale = 1,
  flip = false,
}: {
  className: string;
  x: number;
  y: number;
  scale?: number;
  flip?: boolean;
}) {
  const s = `${flip ? -scale : scale}, ${scale}`;
  return (
    <g className={className} transform={`translate(${x}, ${y}) scale(${s})`}>
      {/* inner group takes the ambient bob — tweening y on the outer group
          would clobber its absolute translate (QA-2 #1) */}
      <g className="rh-inner">
        {/* wrist + palm */}
        <path d="M 24 -6 l 12 0 l 0 30 l -12 0" stroke={W} strokeWidth="3.5" fill="none" />
        <rect x="0" y="-10" width="24" height="38" rx="5" stroke={W} strokeWidth="3.5" fill="#060605" />
        {/* status LED on the palm — blinks while the hand works */}
        <circle className="rh-led" cx="12" cy="9" r="2.8" fill={TEAL} stroke="none" />
        {/* fingers (2 segments each, joint circles) */}
        <g className="rh-f1">
          <path d="M 0 -4 L -16 -8 L -30 -4" stroke={W} strokeWidth="3" fill="none" />
          <circle cx="-16" cy="-8" r="3.2" fill="#060605" stroke={W} strokeWidth="2.4" />
        </g>
        <g className="rh-f2">
          <path d="M 0 8 L -18 8 L -32 12" stroke={W} strokeWidth="3" fill="none" />
          <circle cx="-18" cy="8" r="3.2" fill="#060605" stroke={W} strokeWidth="2.4" />
        </g>
        <g className="rh-f3">
          <path d="M 0 20 L -16 22 L -28 28" stroke={W} strokeWidth="3" fill="none" />
          <circle cx="-16" cy="22" r="3.2" fill="#060605" stroke={W} strokeWidth="2.4" />
        </g>
        {/* thumb */}
        <g className="rh-thumb">
          <path d="M 8 28 L 0 40 L -12 44" stroke={W} strokeWidth="3" fill="none" />
          <circle cx="0" cy="40" r="3.2" fill="#060605" stroke={W} strokeWidth="2.4" />
        </g>
      </g>
    </g>
  );
}

export function HowItWorks() {
  const root = useRef<HTMLElement>(null);
  const [act, setAct] = useState(0);
  const actRef = useRef(0);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const reduced = false;

      /* ---- helpers (the grammar) — leaf-targeted, immediateRender-safe ---- */
      const D = 1;
      const LEAF = "path, circle, rect, line, ellipse, text, polyline";
      const leaves = (sel: string): Element[] =>
        q(sel).flatMap((el: Element) =>
          el instanceof SVGGElement ? Array.from(el.querySelectorAll(LEAF)) : [el],
        );
      const strokes = (sel: string) => leaves(sel).filter((el) => el.tagName !== "text");

      const drawOn = (sel: string, d = D) => {
        const els = strokes(sel);
        return gsap
          .timeline()
          .set(els, { autoAlpha: 1 }, 0)
          .fromTo(
            els,
            { drawSVG: "0% 0%" },
            {
              drawSVG: "0% 100%",
              duration: d,
              ease: "manimSmooth",
              immediateRender: false,
              stagger: els.length > 1 ? { each: (d * 0.5) / els.length } : 0,
            },
            0,
          );
      };
      const fadeShift = (sel: string, d = 0.8, y = 18) =>
        gsap.fromTo(
          leaves(sel),
          { autoAlpha: 0, y },
          { autoAlpha: 1, y: 0, duration: d, ease: "manimSmooth", immediateRender: false },
        );
      const fadeOut = (sel: string, d = 0.7, y = -14) =>
        gsap.to(q(sel), { autoAlpha: 0, y, duration: d, ease: "manimSmooth" });
      const growPop = (sel: string, d = 0.6) =>
        gsap.fromTo(
          leaves(sel),
          { scale: 0, autoAlpha: 0, transformOrigin: "50% 50%" },
          { scale: 1, autoAlpha: 1, duration: d, ease: "manimSmooth", immediateRender: false },
        );
      /* passing pulse — the window travels the path and shrinks out at the
         end, leaving no residue (QA #9) */
      const pulse = (sel: string, d = D) =>
        gsap.fromTo(
          q(sel),
          { drawSVG: "0% 12%", autoAlpha: 1 },
          { drawSVG: "100% 100%", duration: d, ease: "manimSmooth", immediateRender: false },
        );
      /* manim Flash — radial strokes burst from the contact point, then vanish */
      const flash = (sel: string) =>
        gsap.timeline().add(drawOn(sel, 0.28)).add(dimTo(sel, 0, 0.3), ">-0.05");
      /* a sensor node registers the signal — quick scale blink */
      const nodeBlink = (sel: string) =>
        gsap
          .timeline()
          .to(q(sel), { scale: 1.5, transformOrigin: "50% 50%", duration: 0.16, ease: "power2.out" })
          .to(q(sel), { scale: 1, duration: 0.22, ease: "power2.in" });
      const dimTo = (sel: string, o: number, d = 0.8) =>
        gsap.to(q(sel), { autoAlpha: o, duration: d, ease: "manimSmooth" });

      /* ---- initial state: the world is dark ---- */
      gsap.set(q(".hiw-svg " + LEAF.split(", ").join(", .hiw-svg ")), { autoAlpha: 0 });
      gsap.set(q("path[class*='hiw-underline']"), { autoAlpha: 0 });
      gsap.set(q(".hiw-sentence, .hiw-act-title"), { autoAlpha: 0, y: 18 });

      /* ---- ambient motion — outside the scrub, never stops ---- */
      if (!reduced) {
        gsap.to(q(".w-conveyor-track"), { x: 60, duration: 1.7, ease: "none", repeat: -1 });
        /* the deployed hand keeps working: reach down, flex the fingers
           around the part, release, rise — a full work cycle on loop */
        const flex = ".w-robohand .rh-f1, .w-robohand .rh-f2, .w-robohand .rh-f3";
        gsap
          .timeline({ repeat: -1, repeatDelay: 0.5, defaults: { ease: "sine.inOut" } })
          .to(q(".w-robohand .rh-inner"), { y: 7, duration: 0.7 })
          .to(q(flex), { rotation: -11, transformOrigin: "100% 50%", duration: 0.55, stagger: 0.07 }, "<0.1")
          .to(q(".w-robohand .rh-thumb"), { rotation: 9, transformOrigin: "100% 0%", duration: 0.55 }, "<")
          .to(q(".w-robohand .rh-inner"), { y: 0, duration: 0.85 }, "+=0.3")
          .to(q(flex), { rotation: 0, duration: 0.6, stagger: 0.05 }, "<0.1")
          .to(q(".w-robohand .rh-thumb"), { rotation: 0, duration: 0.6 }, "<");
        /* heartbeat LED — scale-only so it stays hidden until the hand draws on */
        gsap.to(q(".w-robohand .rh-led"), {
          scale: 1.5,
          transformOrigin: "50% 50%",
          duration: 0.55,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      }

      /* ---- the master timeline ---- */
      const tl = gsap.timeline({
        defaults: { ease: "manimSmooth", duration: D },
        scrollTrigger: {
          trigger: ".hiw-pin",
          start: "top top",
          end: "bottom bottom",
          scrub: reduced ? true : 1,
          onUpdate: (self) => {
            const segs = gsap.utils.toArray<HTMLElement>(".hiw-seg-fill");
            segs.forEach((s, i) => {
              s.style.transform = `scaleX(${gsap.utils.clamp(0, 1, self.progress * N - i)})`;
            });
            const idx = Math.min(N - 1, Math.floor(self.progress * N));
            if (idx !== actRef.current) {
              actRef.current = idx;
              setAct(idx);
            }
          },
        },
      });
      const wait = (d = 0.6) => tl.to({}, { duration: d });
      /* the whole act paragraph appears at once on its first beat; later
         beats keep their timeline positions via matching no-op tweens */
      const say = (a: number, s: number) =>
        tl.add(s === 0 ? fadeShift(`.hiw-par-${a}`, 0.7) : gsap.to({}, { duration: 0.7 }), "<");
      const actTitle = (a: number) => {
        if (a > 0) tl.add(fadeOut(`.hiw-act-${a - 1}`, 0.6));
        tl.add(fadeShift(`.hiw-act-title-${a}`, 0.8), a > 0 ? "<0.25" : undefined);
        tl.add(drawOn(`.hiw-underline-${a}`, 0.5), "<0.3");
      };

      /* ================= ACT 1 — DEMONSTRATE ================= */
      actTitle(0);
      say(0, 0);
      tl.add(drawOn(".w-bench", 0.9), "<0.1");
      tl.add(drawOn(".w-work", 0.6), "-=0.45"); /* the fixture + part: the task made visible */
      /* dashed strokes fade in — DrawSVG would erase their dash pattern (QA-2 #5) */
      tl.add(fadeShift(".w-rig", 0.8, 0), "-=0.3");
      tl.add(growPop(".w-rig-n1", 0.4), "-=0.2");
      tl.add(growPop(".w-rig-n2", 0.4), "-=0.25");
      tl.add(growPop(".w-rig-n3", 0.4), "-=0.25");
      /* the gloved hand draws on, sensor tips light up */
      tl.add(drawOn(".w-glove", 0.8));
      tl.add(growPop(".w-glove-dots", 0.4), "-=0.3");
      tl.add(drawOn(".w-hand-path", 1.6), "<0.2");
      const tracerState = { t: 0 };
      tl.add(gsap.set(q(".w-tracer"), { autoAlpha: 1 }), "<");
      /* the hand RIDES the path it draws — the worker moving through the task */
      tl.add(
        gsap.fromTo(
          tracerState,
          { t: 0 },
          {
            t: 1,
            duration: 1.6,
            ease: "manimSmooth",
            immediateRender: false,
            onUpdate: () => {
              const p = root.current?.querySelector<SVGPathElement>(".w-hand-path-geo");
              if (p) {
                const L = p.getTotalLength();
                const pt = p.getPointAtLength(L * tracerState.t);
                gsap.set(q(".w-tracer"), { attr: { cx: pt.x, cy: pt.y } });
                gsap.set(q(".w-hand"), { x: pt.x, y: pt.y });
              }
            },
          },
        ),
        "<",
      );
      tl.add(dimTo(".w-tracer", 0, 0.3));
      wait(0.5);

      say(0, 1);
      /* press one — anticipation up, strike down; the part seats with a settle */
      tl.add(gsap.to(q(".w-hand-inner"), { y: -5, duration: 0.28, ease: "power1.out" }), "<0.2");
      tl.add(gsap.to(q(".w-hand-inner"), { y: 20, duration: 0.2, ease: "power3.in" }));
      tl.add(flash(".w-flash-1"), "<0.16");
      tl.add(gsap.to(q(".w-work-part"), { y: 3, duration: 0.16, ease: "power3.out" }), "<");
      tl.add(growPop(".w-force-1", 0.4), "<");
      tl.add(growPop(".w-force-2", 0.4), "<0.1");
      tl.add(gsap.to(q(".w-work-part"), { y: 2, duration: 0.25, ease: "power2.out" }), "-=0.1");
      tl.add(gsap.to(q(".w-hand-inner"), { y: 0, duration: 0.45, ease: "power2.inOut" }), "-=0.2");
      /* press two — softer; the rig nodes blink the signal inward, tip to bench */
      tl.add(gsap.to(q(".w-hand-inner"), { y: 19, duration: 0.24, ease: "power3.in" }), "+=0.05");
      tl.add(flash(".w-flash-2"), "<0.14");
      tl.add(growPop(".w-force-3", 0.45), "<");
      tl.add(nodeBlink(".w-rig-n3"), "<0.1");
      tl.add(nodeBlink(".w-rig-n2"), "<0.12");
      tl.add(nodeBlink(".w-rig-n1"), "<0.12");
      tl.add(gsap.to(q(".w-hand-inner"), { y: 4, duration: 0.4, ease: "power2.inOut" }));
      tl.add(pulse(".w-hand-pulse", 1), "<");
      tl.add(drawOn(".w-wave", 1.4), "-=0.6");
      wait(0.5);

      say(0, 2);
      tl.add(fadeShift(".w-conveyor", 0.8, 0), "<0.2");
      wait(0.9);

      /* ================= ACT 2 — TRAIN ================= */
      actTitle(1);
      say(1, 0);
      tl.add(dimTo(".w-bench", 0.22, 0.8), "<");
      tl.add(dimTo(".w-work", 0.22, 0.8), "<");
      tl.add(dimTo(".w-rig", 0.22, 0.8), "<");
      tl.add(dimTo(".w-hand", 0.14, 0.8), "<");
      tl.add(dimTo(".w-force", 0.18, 0.8), "<");
      tl.add(dimTo(".w-hand-path", 0.22, 0.8), "<");
      tl.add(dimTo(".w-conveyor", 0.25, 0.8), "<");
      tl.add(fadeShift(".w-ghost-1", 0.5, 10));
      tl.add(fadeShift(".w-ghost-2", 0.5, 10), "-=0.3");
      tl.add(fadeShift(".w-ghost-3", 0.5, 10), "-=0.3");
      /* the demonstrations converge into the skill (morph-carry) */
      tl.add(
        gsap.to(q(".w-ghosts"), {
          x: 300,
          y: -170,
          scale: 0.32,
          autoAlpha: 0,
          transformOrigin: "50% 50%",
          duration: 1.1,
          ease: "manimSmooth",
        }),
      );
      tl.add(drawOn(".w-block-border", 1), "-=0.5");
      tl.add(fadeShift(".w-block-fill", 0.6, 0), "-=0.2");
      tl.add(drawOn(".w-block-curve", 0.8), "-=0.2");
      tl.add(fadeShift(".w-block-label", 0.4, 6), "-=0.2");
      tl.add(drawOn(".w-grip", 0.9)); /* the robot hand docks at the skill */
      tl.add(pulse(".w-block-ring", 1), "<0.2");
      wait(0.5);

      say(1, 1);
      /* the signature becomes the training gate — same object, carried up */
      tl.add(
        gsap.to(q(".w-wave"), {
          x: 250,
          y: -428,
          scale: 0.72,
          transformOrigin: "0% 50%",
          duration: 1.1,
          ease: "manimSmooth",
        }),
        "<0.1",
      );
      tl.add(drawOn(".w-gate", 0.6), "<0.3"); /* the posts frame the template */
      tl.add(fadeShift(".w-chip-1", 0.4, 0));
      tl.add(gsap.to(q(".w-chip-1"), { x: 150, duration: 0.7, ease: "manimSmooth" }));
      tl.add(pulse(".w-chip-pass-1", 0.5), "<0.3");
      tl.add(dimTo(".w-chip-1", 0, 0.3), "<0.3");
      tl.add(fadeShift(".w-chip-2", 0.4, 0), "-=0.4");
      tl.add(gsap.to(q(".w-chip-2"), { x: 105, duration: 0.6, ease: "manimSmooth" }));
      /* the mismatched demonstration simply stalls and fades — no cross mark */
      tl.add(dimTo(".w-chip-2", 0.15, 0.4), "<0.3");
      tl.add(fadeShift(".w-chip-3", 0.4, 0), "-=0.3");
      tl.add(gsap.to(q(".w-chip-3"), { x: 150, duration: 0.7, ease: "manimSmooth" }));
      tl.add(pulse(".w-chip-pass-2", 0.5), "<0.3");
      tl.add(dimTo(".w-chip-3", 0, 0.3), "<0.3");
      wait(0.9);

      /* ================= ACT 3 — VERIFY ================= */
      actTitle(2);
      say(2, 0);
      tl.add(dimTo(".w-gate", 0.18, 0.7), "<");
      tl.add(dimTo(".w-wave", 0.18, 0.7), "<");
      tl.add(dimTo(".w-chips", 0, 0.5), "<");
      tl.add(fadeShift(".w-lib-1", 0.5, 14));
      tl.add(fadeShift(".w-lib-2", 0.5, 14), "-=0.32");
      tl.add(fadeShift(".w-lib-3", 0.5, 14), "-=0.32");
      tl.add(pulse(".w-cmp-1", 0.7));
      tl.add(drawOn(".w-check-1", 0.45), "-=0.1");
      tl.add(pulse(".w-cmp-2", 0.7));
      tl.add(drawOn(".w-check-2", 0.45), "-=0.1");
      tl.add(pulse(".w-cmp-3", 0.7));
      tl.add(drawOn(".w-check-cross", 0.45), "-=0.1");
      tl.add(dimTo(".w-lib-3", 0.15, 0.5), "<0.2");
      wait(0.5);

      say(2, 1);
      tl.add(drawOn(".w-exit", 0.7), "<0.1");
      /* only the passing skill moves through the gate — to under the cloud */
      tl.add(gsap.to(q(".w-skill-unit"), { x: 180, duration: 1.1, ease: "manimSmooth" }));
      tl.add(pulse(".w-exit-pulse", 0.6), "<0.4");
      wait(0.9);

      /* ================= ACT 4 — DEPLOY ================= */
      actTitle(3);
      say(3, 0);
      tl.add(drawOn(".w-cloud", 1.1), "<0.1");
      tl.add(fadeOut(".w-exit", 0.5), "<"); /* the gate's job is done (QA #16) */
      tl.add(fadeOut(".w-checks", 0.4), "<"); /* the verify tally stays behind (QA #2) */
      tl.add(dimTo(".w-grip", 0, 0.4), "<"); /* fade in place — fadeOut's y would clobber its translate (QA-2 #2) */
      /* the skill rises STRAIGHT UP into the cloud (QA #1: centered) */
      tl.add(
        gsap.to(q(".w-skill-unit"), {
          x: 157,
          y: -204,
          scale: 0.38,
          transformOrigin: "50% 50%",
          duration: 1.2,
          ease: "manimSmooth",
        }),
      );
      tl.add(fadeShift(".w-version", 0.5, 6), "-=0.3");
      tl.add(fadeShift(".w-shelf", 0.6, 6), "-=0.2");
      wait(0.4);

      say(3, 1);
      tl.add(drawOn(".w-wire", 0.9), "<0.1");
      tl.add(drawOn(".w-edge", 0.9), "-=0.2");
      tl.add(dimTo(".w-bench", 0.5, 0.7), "<");
      tl.add(drawOn(".w-arm", 1.2), "-=0.3");
      tl.add(drawOn(".w-robohand", 1), "-=0.4"); /* the robotic hand arrives */
      tl.add(pulse(".w-wire-pulse", 0.9));
      tl.add(growPop(".w-edge-dot", 0.4), "-=0.2");
      wait(0.4);

      say(3, 2);
      tl.add(pulse(".w-edge-ring", 0.8), "<0.2");
      wait(0.4);

      say(3, 3);
      tl.add(drawOn(".w-bar", 0.8), "<0.1");
      tl.add(fadeShift(".w-call", 0.5, 0));
      tl.add(drawOn(".w-replay", 1.1), "<0.2"); /* the hand re-plays the human path */
      tl.add(fadeShift(".w-return", 0.5, 0), "-=0.2");
      wait(0.4);

      say(3, 4);
      tl.add(fadeShift(".w-ruler", 0.6, 8), "<0.1");
      tl.add(
        gsap.fromTo(
          q(".w-ruler-bar"),
          { attr: { x2: 612 } },
          { attr: { x2: 460 }, duration: 1, ease: "manimSmooth", immediateRender: false },
        ),
      );
      wait(0.9);

      /* ================= ACT 5 — ADAPT ================= */
      actTitle(4);
      say(4, 0);
      tl.add(dimTo(".w-conveyor", 1, 0.7), "<");
      tl.add(fadeShift(".w-parts", 0.7, 0), "<0.2");
      tl.add(dimTo(".w-ruler", 0, 0.5), "<");
      tl.add(dimTo(".w-lib", 0, 0.5), "<"); /* clear the chart's zone (QA #11) */
      wait(0.4);

      say(4, 1);
      tl.add(drawOn(".w-eye", 0.8), "<0.1");
      tl.add(drawOn(".w-cycle-check-1", 0.35));
      tl.add(drawOn(".w-cycle-check-2", 0.35), "-=0.1");
      tl.add(drawOn(".w-chart", 0.9), "-=0.1");
      tl.add(fadeShift(".w-chart-grid", 0.5, 0), "-=0.4");
      tl.add(fadeShift(".w-chart-dots", 0.6, 4), "-=0.3");
      wait(0.4);

      say(4, 2);
      tl.add(gsap.to(q(".w-drift-dot"), { attr: { cy: 108 }, duration: 0.8, ease: "manimSmooth" }), "<0.1");
      tl.add(drawOn(".w-alarm", 0.7)); /* the alarm ring persists (QA #10) */
      tl.add(growPop(".w-moon", 0.5), "-=0.3");
      tl.add(drawOn(".w-loop", 1.2), "<0.1"); /* the loop starts earlier (QA #20) */
      tl.add(pulse(".w-loop-pulse", 0.9), "<0.5");
      tl.add(fadeOut(".w-version", 0.25, -6));
      tl.add(fadeShift(".w-version-2", 0.25, 6), "<0.1");
      tl.add(pulse(".w-wire-pulse", 0.6));
      wait(0.4);

      say(4, 3);
      tl.add(growPop(".w-human", 0.6), "<0.1");
      tl.add(drawOn(".w-approve", 0.45));
      tl.add(drawOn(".w-roll", 0.6), "<0.3");
      wait(0.6);

      /* ---- coda: pull back, the whole thing is one cycle ---- */
      tl.add(
        gsap.to(q(".hiw-svg"), {
          attr: { viewBox: "-40 -30 1040 800" },
          duration: 1.6,
          ease: "manimSmooth",
        }),
      );
      tl.add(pulse(".w-loop-pulse", 1.2), "<0.4");
      wait(0.8);
    },
    { scope: root },
  );

  return (
    <section ref={root} id="how">
      <div className="hiw-pin" style={{ height: `calc(${N * 130}vh / var(--z, 1))`, position: "relative" }}>
        <div
          style={{
            position: "sticky",
            top: 0,
            height: "calc(100svh / var(--z, 1))",
            overflow: "hidden",
            paddingTop: "clamp(5rem, 9vh, 6.5rem)",
            paddingBottom: "clamp(1.8rem, 4vh, 3rem)",
            display: "flex",
          }}
        >
          <div
            className="container"
            style={{
              width: "100%",
              maxWidth: "min(100%, 1260px)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: 0,
              gap: "clamp(1rem, 2.5vh, 2rem)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                flexWrap: "wrap",
                flexShrink: 0,
                paddingBottom: "0.9rem",
                borderBottom: "1px solid var(--hair-dark)",
              }}
            >
              <span className="chip">{pipeline.eyebrow}</span>
              <span className="mono-label" style={{ color: "var(--accent)" }}>
                Step {String(act + 1).padStart(2, "0")} of {String(N).padStart(2, "0")}
              </span>
            </div>

            <div style={{ flex: "1 1 auto", minHeight: 0, display: "flex", alignItems: "center" }}>
              <div
                className="hiw-grid"
                style={{
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 0.85fr) minmax(0, 1.45fr)",
                  gap: "clamp(2rem, 4.5vw, 4rem)",
                  alignItems: "center",
                }}
              >
                {/* left: act titles + narration sentences */}
                <div className="hiw-copy" style={{ position: "relative", height: "clamp(20rem, calc(48vh / var(--z, 1)), 27rem)" }}>
                  {pipeline.steps.map((s, a) => (
                    <div
                      key={s.n}
                      className={`hiw-act-${a}`}
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                      }}
                    >
                      <div className={`hiw-act-title hiw-act-title-${a}`}>
                        <span className="mono-label" style={{ color: "var(--accent)" }}>
                          [{s.n}]
                        </span>
                        <h3 className="display" style={{ fontSize: "clamp(2.2rem, 4vw, 3.6rem)", marginTop: "0.5rem" }}>
                          {s.title}
                        </h3>
                        <svg width="140" height="8" style={{ marginTop: 8 }} aria-hidden>
                          <path className={`hiw-underline-${a}`} d="M 1 4 L 139 4" stroke={PURPLE} strokeWidth="3" fill="none" />
                        </svg>
                      </div>
                      <p
                        className={`hiw-sentence hiw-par-${a}`}
                        style={{ marginTop: "1.1rem", maxWidth: "44ch", fontSize: 15, lineHeight: 1.72, color: "var(--mut-dark)" }}
                      >
                        {SENTENCES[a].join(" ")}
                      </p>
                    </div>
                  ))}
                </div>

                {/* right: the persistent world */}
                <div
                  className="ticks hiw-world"
                  style={{
                    position: "relative",
                    aspectRatio: "960 / 720",
                    maxHeight: "min(calc(64vh / var(--z, 1)), 36rem)",
                    justifySelf: "end",
                    width: "100%",
                    padding: 10,
                  }}
                >
                  <span className="tick-b" aria-hidden />
                  <svg className="hiw-svg" viewBox="0 0 960 720" style={{ width: "100%", height: "100%" }} aria-hidden>
                    {/* ——— conveyor (linear, eternal) — y 580 ——— */}
                    <g className="w-conveyor">
                      <line x1="40" y1="580" x2="920" y2="580" stroke={GHOST} strokeWidth="1.5" />
                      <g className="w-conveyor-track">
                        {Array.from({ length: 17 }).map((_, i) => (
                          <circle key={i} cx={-20 + i * 60} cy="580" r="4" fill={WDIM} />
                        ))}
                      </g>
                    </g>
                    <g className="w-parts">
                      <path d="M 180 566 l 16 0 l -3 12 l -10 0 z" stroke={W} strokeWidth="2.8" fill="none" />
                      <path d="M 430 564 l 14 4 l -2 10 l -14 -2 z" stroke={W} strokeWidth="2.8" fill="none" />
                      <path d="M 560 566 l 12 -2 l 6 10 l -14 4 z" stroke={W} strokeWidth="2.8" fill="none" />
                    </g>

                    {/* ——— ZONE: bench / demonstrate (bottom-left) ——— */}
                    <g className="w-bench">
                      <path d="M 84 512 L 420 512 M 110 512 L 110 576 M 394 512 L 394 576" stroke={W} strokeWidth="4" fill="none" />
                    </g>
                    {/* the task: a part seated in a two-post fixture on the bench */}
                    <g className="w-work">
                      <path d="M 372 512 L 372 470 L 384 470 L 384 494 L 400 494 L 400 470 L 412 470 L 412 512" stroke={W} strokeWidth="3.5" fill="none" />
                      <rect className="w-work-part" x="385" y="468" width="14" height="26" rx="2" stroke={W} strokeWidth="2.5" fill="#060605" />
                    </g>
                    <g className="w-rig">
                      <path d="M 110 494 C 140 376 364 376 394 494" stroke={WDIM} strokeWidth="3" fill="none" strokeDasharray="6 8" />
                    </g>
                    {/* the worker's gloved hand — origin = index fingertip, so it
                        rides the path tip-first */}
                    <g className="w-hand" transform="translate(104, 486)">
                      <g className="w-hand-inner">
                        <g className="w-glove">
                          {/* one closed hand silhouette, seen from the back while
                              pressing: extended index (tip = origin), three curled
                              knuckle bumps, thumb lobe left, arched wrist */}
                          <path
                            d="M 0 0 C 4 -1 5 -3 4 -6 L 8 -22 C 10 -12 15 -12 16 -19 C 19 -11 24 -11 26 -18 C 29 -11 34 -12 36 -19 L 40 -42 C 28 -49 10 -49 -2 -44 C -7 -40 -11 -35 -12 -30 C -13 -25 -12 -19 -9 -16 C -7 -14 -5 -15 -4 -18 L -4 -6 C -5 -3 -4 -1 0 0 Z"
                            stroke={W}
                            strokeWidth="3.5"
                            strokeLinejoin="round"
                            fill="#060605"
                          />
                          {/* thumb crease — separates the thumb lobe from the palm */}
                          <path d="M -4 -18 C -6 -24 -8 -28 -11 -30" stroke={W} strokeWidth="2.8" fill="none" />
                          {/* double cuff hugging the arched wrist — the sleeve that says "worker" */}
                          <path d="M -2 -46 C 10 -51 28 -51 40 -44" stroke={W} strokeWidth="3" fill="none" />
                          <path d="M 0 -51 C 12 -56 28 -56 40 -49" stroke={W} strokeWidth="3" fill="none" />
                        </g>
                        {/* sensor tips — the glove's whole point */}
                        <g className="w-glove-dots">
                          <circle cx="0" cy="0" r="3.6" fill={TEAL} />
                          <circle cx="11" cy="-13" r="3.2" fill={TEAL} />
                          <circle cx="21" cy="-12" r="3.2" fill={TEAL} />
                          <circle cx="31" cy="-12" r="3.2" fill={TEAL} />
                          <circle cx="-9" cy="-17" r="3.2" fill={TEAL} />
                        </g>
                      </g>
                    </g>
                    {/* rig nodes after the hand in DOM — they stay visible when the
                        glove passes beneath them (QA-3 #1) */}
                    <circle className="w-rig-n1" cx="152" cy="418" r="7.5" stroke={W} strokeWidth="2.5" fill="#060605" />
                    <circle className="w-rig-n2" cx="252" cy="388" r="7.5" stroke={W} strokeWidth="2.5" fill="#060605" />
                    <circle className="w-rig-n3" cx="352" cy="418" r="7.5" stroke={W} strokeWidth="2.5" fill="#060605" />
                    {/* manim Flash — after the hand so the burst renders over the
                        palm, shifted to the deeper contact point (QA-3 #2/#3) */}
                    <g className="w-flash-1" transform="translate(0, 6)">
                      <path d="M 400 460 L 412 460" stroke={TEAL} strokeWidth="2.6" fill="none" />
                      <path d="M 398 454 L 406 446" stroke={TEAL} strokeWidth="2.6" fill="none" />
                      <path d="M 392 452 L 392 440" stroke={TEAL} strokeWidth="2.6" fill="none" />
                      <path d="M 386 454 L 378 446" stroke={TEAL} strokeWidth="2.6" fill="none" />
                      <path d="M 384 460 L 372 460" stroke={TEAL} strokeWidth="2.6" fill="none" />
                      <path d="M 385 465 L 376 471" stroke={TEAL} strokeWidth="2.6" fill="none" />
                      <path d="M 399 465 L 408 471" stroke={TEAL} strokeWidth="2.6" fill="none" />
                    </g>
                    <g className="w-flash-2" transform="translate(0, 6)">
                      <path d="M 405 458 L 418 452" stroke={TEAL} strokeWidth="2.6" fill="none" />
                      <path d="M 399 451 L 404 438" stroke={TEAL} strokeWidth="2.6" fill="none" />
                      <path d="M 390 451 L 384 438" stroke={TEAL} strokeWidth="2.6" fill="none" />
                      <path d="M 383 457 L 370 452" stroke={TEAL} strokeWidth="2.6" fill="none" />
                      <path d="M 383 467 L 370 472" stroke={TEAL} strokeWidth="2.6" fill="none" />
                      <path d="M 405 467 L 418 472" stroke={TEAL} strokeWidth="2.6" fill="none" />
                    </g>
                    <path className="w-hand-path w-hand-path-geo" d={HAND_PATH} stroke={W} strokeWidth="3.5" fill="none" />
                    <path className="w-hand-pulse" d={HAND_PATH} stroke={TEAL} strokeWidth="5.5" fill="none" opacity="0.9" />
                    <circle className="w-tracer" cx="104" cy="486" r="6.5" fill={TEAL} />
                    {/* force vectors at the contact — down into the part, and the
                        reaction answering back up */}
                    <g className="w-force">
                      <path className="w-force-1" d="M 392 420 L 392 444 M 392 444 l -8 -10 M 392 444 l 8 -10" stroke={TEAL} strokeWidth="3.4" fill="none" transform="translate(-40, 16)" />
                      <path className="w-force-2" d="M 392 420 L 392 444 M 392 444 l -8 -10 M 392 444 l 8 -10" stroke={TEAL} strokeWidth="3.4" fill="none" transform="translate(52, 6)" />
                      <path className="w-force-3" d="M 356 486 L 356 462 M 356 462 l -8 10 M 356 462 l 8 10" stroke={TEAL} strokeWidth="3.4" fill="none" transform="translate(-14, 0)" />
                    </g>
                    {/* signature strip — its own zone under the bench */}
                    <g className="w-wave">
                      <path
                        d="M 90 644 L 140 644 L 160 620 L 178 660 L 196 610 L 214 654 L 232 626 L 260 644 L 330 644 L 350 632 L 368 652 L 396 644 L 420 644"
                        stroke={TEAL}
                        strokeWidth="3.5"
                        fill="none"
                        style={{ filter: "drop-shadow(0 0 6px rgba(94,234,212,0.55))" }}
                      />
                    </g>

                    {/* ——— ZONE: train (center) — gate above the chip lane, skill block right ——— */}
                    <g className="w-ghosts">
                      <path className="w-ghost-1" d={HAND_PATH} stroke={GHOST} strokeWidth="2.8" fill="none" transform="translate(0,-26)" />
                      <path className="w-ghost-2" d={HAND_PATH} stroke={GHOST} strokeWidth="2.8" fill="none" transform="translate(10,-52)" />
                      <path className="w-ghost-3" d={HAND_PATH} stroke={GHOST} strokeWidth="2.8" fill="none" transform="translate(20,-78)" />
                    </g>
                    <g className="w-skill-unit">
                      <g className="w-block">
                        <rect className="w-block-border" x="470" y="250" width="150" height="110" rx="12" stroke={PURPLE} strokeWidth="4" fill="none" />
                        <rect className="w-block-fill" x="470" y="250" width="150" height="110" rx="12" fill="rgba(139,92,246,0.12)" stroke="none" />
                        <path className="w-block-curve" d="M 490 322 C 510 300 522 316 536 310 C 550 305 556 288 570 293 C 584 298 590 305 602 300" stroke={PURPLE} strokeWidth="3.5" fill="none" />
                        <text className="w-block-label" x="545" y="278" textAnchor="middle" fill={W} fontFamily={MONO} fontSize="15" letterSpacing="2">
                          SKILL
                        </text>
                      </g>
                      {/* the robot's hand docks at the skill — small instance */}
                      <RoboticHand className="w-grip" x={648} y={292} scale={0.68} flip />
                      <g className="w-checks">
                        <path className="w-check-1" d="M 482 390 l 7 8 l 12 -14" stroke={GREEN} strokeWidth="3.2" fill="none" />
                        <path className="w-check-2" d="M 514 390 l 7 8 l 12 -14" stroke={GREEN} strokeWidth="3.2" fill="none" />
                        <path className="w-check-cross" d="M 548 386 l 14 14 m 0 -14 l -14 14" stroke={RED} strokeWidth="3.2" fill="none" />
                      </g>
                      <rect className="w-block-ring" x="458" y="238" width="238" height="140" rx="16" stroke={TEAL} strokeWidth="2.8" fill="none" />
                    </g>
                    {/* the chip lane runs at y≈306; gate posts frame the wave template */}
                    <g className="w-gate">
                      <path d="M 336 178 L 336 244 M 588 178 L 588 244" stroke={GHOST} strokeWidth="3" fill="none" />
                    </g>
                    <g className="w-chips">
                      <g className="w-chip-1">
                        <rect x="238" y="296" width="34" height="20" rx="4" stroke={TEAL} strokeWidth="2.8" fill="none" />
                        <path d="M 244 306 l 6 -6 l 5 10 l 6 -8 l 5 4" stroke={TEAL} strokeWidth="2.4" fill="none" />
                      </g>
                      <g className="w-chip-2">
                        <rect x="238" y="296" width="34" height="20" rx="4" stroke={WDIM} strokeWidth="2.8" fill="none" />
                        <path d="M 244 302 l 8 8 m 6 -8 l 8 6" stroke={WDIM} strokeWidth="2.4" fill="none" />
                      </g>
                      <g className="w-chip-3">
                        <rect x="238" y="296" width="34" height="20" rx="4" stroke={TEAL} strokeWidth="2.8" fill="none" />
                        <path d="M 244 308 l 7 -8 l 5 8 l 6 -10 l 5 6" stroke={TEAL} strokeWidth="2.4" fill="none" />
                      </g>
                      <path className="w-chip-pass-1" d="M 292 306 C 360 306 410 298 470 296" stroke={TEAL} strokeWidth="3.5" fill="none" />
                      <path className="w-chip-pass-2" d="M 292 306 C 360 306 410 314 470 316" stroke={TEAL} strokeWidth="3.5" fill="none" />
                    </g>

                    {/* ——— ZONE: library (mid-left, above the dimmed bench) ——— */}
                    <g className="w-lib">
                      <g className="w-lib-1">
                        <rect x="104" y="150" width="96" height="54" rx="6" stroke={W} strokeWidth="2.8" fill="none" />
                        <path d="M 116 184 c 12 -14 20 2 32 -4 c 12 -6 16 -12 40 -8" stroke={WDIM} strokeWidth="2.4" fill="none" />
                      </g>
                      <g className="w-lib-2">
                        <rect x="104" y="218" width="96" height="54" rx="6" stroke={W} strokeWidth="2.8" fill="none" />
                        <path d="M 116 252 c 14 -10 22 0 34 -6 c 10 -5 18 -8 38 -4" stroke={WDIM} strokeWidth="2.4" fill="none" />
                      </g>
                      <g className="w-lib-3">
                        <rect x="104" y="286" width="96" height="54" rx="6" stroke={W} strokeWidth="2.8" fill="none" />
                        <path d="M 116 320 c 10 -16 24 6 36 -8 c 8 -9 16 -4 36 -2" stroke={WDIM} strokeWidth="2.4" fill="none" />
                      </g>
                    </g>
                    <path className="w-cmp-1" d="M 200 177 C 300 177 380 240 470 268" stroke={TEAL} strokeWidth="3.2" fill="none" />
                    <path className="w-cmp-2" d="M 200 245 C 300 245 380 280 470 296" stroke={TEAL} strokeWidth="3.2" fill="none" />
                    <path className="w-cmp-3" d="M 200 313 C 300 313 380 320 470 324" stroke={TEAL} strokeWidth="3.2" fill="none" />
                    <g className="w-exit">
                      <path d="M 700 226 L 700 246 M 700 364 L 700 384" stroke={W} strokeWidth="3.5" fill="none" />
                    </g>
                    <path className="w-exit-pulse" d="M 640 306 L 780 306" stroke={TEAL} strokeWidth="4" fill="none" />

                    {/* ——— ZONE: cloud (top, directly above the post-gate skill) ——— */}
                    <g className="w-cloud">
                      <path
                        d="M 650 96 c -4 -22 18 -36 38 -30 c 8 -20 40 -22 52 -6 c 20 -8 42 6 40 26 c 16 4 18 26 2 32 l -122 0 c -14 -4 -16 -18 -10 -22 z"
                        stroke={W}
                        strokeWidth="3.5"
                        fill="none"
                      />
                    </g>
                    <g className="w-version">
                      <rect x="697" y="127" width="56" height="22" rx="4" stroke={PURPLE} strokeWidth="2.8" fill="rgba(139,92,246,0.15)" />
                      <text x="725" y="143" textAnchor="middle" fill={W} fontFamily={MONO} fontSize="14">
                        v1.0
                      </text>
                    </g>
                    <g className="w-version-2">
                      <rect x="697" y="127" width="56" height="22" rx="4" stroke={PURPLE} strokeWidth="2.8" fill="rgba(139,92,246,0.25)" />
                      <text x="725" y="143" textAnchor="middle" fill={W} fontFamily={MONO} fontSize="14">
                        v1.1
                      </text>
                    </g>
                    <g className="w-shelf">
                      <rect x="632" y="129" width="44" height="18" rx="3" stroke={GHOST} strokeWidth="2.4" fill="none" />
                      <text x="654" y="142" textAnchor="middle" fill={GHOST} fontFamily={MONO} fontSize="12">
                        v0.9
                      </text>
                    </g>

                    {/* ——— ZONE: edge + robot hand (bottom-right) ——— */}
                    <path className="w-wire" d="M 725 152 L 725 428" stroke={WDIM} strokeWidth="3" fill="none" />
                    <path className="w-wire-pulse" d="M 725 152 L 725 428" stroke={PURPLE} strokeWidth="4.5" fill="none" />
                    <g className="w-edge">
                      <rect x="701" y="428" width="48" height="48" rx="8" stroke={W} strokeWidth="3.5" fill="none" />
                      <path d="M 701 440 l -10 0 m 10 24 l -10 0 m 58 -24 l 10 0 m -10 24 l 10 0" stroke={WDIM} strokeWidth="2.8" fill="none" />
                    </g>
                    <circle className="w-edge-dot" cx="725" cy="452" r="7.5" fill={PURPLE} />
                    <rect className="w-edge-ring" x="691" y="418" width="68" height="68" rx="12" stroke={TEAL} strokeWidth="2.8" fill="none" />
                    <g className="w-arm">
                      <path d="M 896 576 L 896 520 L 860 458 L 812 436" stroke={W} strokeWidth="4.5" fill="none" />
                      <circle cx="896" cy="520" r="6.5" stroke={W} strokeWidth="2.5" fill="#060605" />
                      <circle cx="860" cy="458" r="6.5" stroke={W} strokeWidth="2.5" fill="#060605" />
                    </g>
                    {/* the robotic hand — full instance, working over the task */}
                    <RoboticHand className="w-robohand" x={812} y={430} scale={1.1} />
                    {/* the hand re-plays the human path, under its fingertips */}
                    <path className="w-replay" d="M 772 484 c 14 12 24 2 34 8 c 10 6 14 16 28 12" stroke={TEAL} strokeWidth="3.5" fill="none" />
                    <g className="w-bar">
                      <path d="M 620 648 L 920 648" stroke={WDIM} strokeWidth="2.8" fill="none" />
                      <path d="M 620 642 L 620 654 M 712 642 L 712 654 M 752 642 L 752 654 M 848 642 L 848 654 M 920 642 L 920 654" stroke={WDIM} strokeWidth="2.8" fill="none" />
                      <path d="M 712 648 L 752 648" stroke={PURPLE} strokeWidth="5.5" fill="none" />
                    </g>
                    <path className="w-call" d="M 728 640 C 726 590 726 520 726 480" stroke={TEAL} strokeWidth="2.8" fill="none" strokeDasharray="4 5" />
                    <path className="w-return" d="M 744 480 C 744 530 742 600 740 640" stroke={WDIM} strokeWidth="2.8" fill="none" strokeDasharray="4 5" />
                    {/* WEEKS→HOURS ruler — top of the frame, left of the cloud;
                        empty sky during act 4, and it fades before act 5's loop */}
                    <g className="w-ruler">
                      <text x="408" y="68" fill={WDIM} fontFamily={MONO} fontSize="14.5" letterSpacing="1">
                        WEEKS
                      </text>
                      <line className="w-ruler-bar" x1="408" y1="84" x2="612" y2="84" stroke={TEAL} strokeWidth="5.5" />
                      <text x="408" y="116" fill={W} fontFamily={MONO} fontSize="14.5" letterSpacing="1">
                        HOURS
                      </text>
                    </g>

                    {/* ——— ZONE: adapt (top-left chart, loop across the top) ——— */}
                    <g className="w-eye">
                      <path d="M 434 512 c 20 -16 44 -16 64 0 c -20 16 -44 16 -64 0 z" stroke={W} strokeWidth="3" fill="none" />
                      <circle cx="466" cy="512" r="6" stroke={W} strokeWidth="2.5" fill="none" />
                    </g>
                    <path className="w-cycle-check-1" d="M 182 548 l 5 6 l 9 -10" stroke={GREEN} strokeWidth="3" fill="none" />
                    <path className="w-cycle-check-2" d="M 432 546 l 5 6 l 9 -10" stroke={GREEN} strokeWidth="3" fill="none" />
                    <g className="w-chart">
                      <rect x="84" y="60" width="210" height="120" rx="8" stroke={W} strokeWidth="3" fill="none" />
                    </g>
                    <path className="w-chart-grid" d="M 84 96 L 294 96 M 84 144 L 294 144" stroke={GHOST} strokeWidth="2.4" fill="none" strokeDasharray="4 5" />
                    <g className="w-chart-dots">
                      <circle cx="114" cy="120" r="4.5" fill={GREEN} />
                      <circle cx="144" cy="114" r="4.5" fill={GREEN} />
                      <circle cx="174" cy="126" r="4.5" fill={GREEN} />
                      <circle cx="204" cy="106" r="4.5" fill="#F0AC5F" />
                      <circle className="w-drift-dot" cx="238" cy="118" r="4.5" fill={RED} />
                    </g>
                    <ellipse className="w-alarm" cx="238" cy="110" rx="22" ry="15" stroke={RED} strokeWidth="2.8" fill="none" />
                    <circle className="w-moon" cx="318" cy="26" r="9" stroke={W} strokeWidth="2.8" fill="#060605" />
                    <path
                      className="w-loop"
                      d="M 298 70 C 370 10 560 6 652 66"
                      stroke={TEAL}
                      strokeWidth="3.5"
                      fill="none"
                      style={{ filter: "drop-shadow(0 0 6px rgba(94,234,212,0.5))" }}
                    />
                    <path className="w-loop-pulse" d="M 298 70 C 370 10 560 6 652 66" stroke={TEAL} strokeWidth="5.5" fill="none" />
                    <g className="w-human">
                      <circle cx="472" cy="22" r="10.5" stroke={W} strokeWidth="2.8" fill="#060605" />
                      <path d="M 456 46 c 4 -11 28 -11 32 0" stroke={W} strokeWidth="2.8" fill="none" />
                    </g>
                    <path className="w-approve" d="M 494 20 l 6 7 l 11 -12" stroke={GREEN} strokeWidth="3.5" fill="none" />
                    <path className="w-roll" d="M 812 96 c 22 6 26 28 8 38 m 0 0 l 10 -2 m -10 2 l 2 -10" stroke={WDIM} strokeWidth="2.8" fill="none" />
                  </svg>
                  <span className="mono-label" style={{ position: "absolute", left: 14, bottom: 10, color: "var(--dim-dark)" }}>
                    / the pipeline, drawn
                  </span>
                  <span className="mono-label" style={{ position: "absolute", right: 14, top: 10, color: "var(--accent)" }}>
                    fig. 05
                  </span>
                </div>
              </div>
            </div>

            {/* progress segments */}
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${N}, 1fr)`, gap: 8, flexShrink: 0 }}>
              {pipeline.steps.map((s, i) => (
                <div key={s.n}>
                  <div style={{ height: 2, background: "rgba(255,255,255,0.14)", overflow: "hidden" }}>
                    <div
                      className="hiw-seg-fill"
                      style={{ height: "100%", background: "var(--accent)", transform: "scaleX(0)", transformOrigin: "left" }}
                    />
                  </div>
                  <span
                    className="mono-label hiw-seg-label"
                    style={{
                      marginTop: 8,
                      display: "block",
                      fontSize: 10,
                      color: act === i ? "var(--mut-dark)" : "var(--dim-dark)",
                      transition: "color 0.3s var(--ease-ui)",
                    }}
                  >
                    {s.n} · {s.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

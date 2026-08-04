import { useEffect, useRef } from "react";
import { ScrollTrigger } from "../lib/gsapSetup";

/* ============================================================================
   DOT BRAIN — scattered dots assemble into a brain as the section scrolls
   into view. The silhouette is sampled from the site's own reference image
   (/brain-reference-2.png): the stipple is blurred into a solid mask, its
   boundary becomes bright OUTLINE dots, and the interior is covered with
   sparser random FILL dots. A few dots glow accent-purple like neurons.
   ========================================================================== */

const OUTLINE_COUNT = 780;
const FILL_COUNT = 980;
const ACCENT = "#8b5cf6";

type Dot = {
  tu: number;
  tv: number;
  su: number;
  sv: number;
  delay: number;
  r: number;
  color: string;
  phase: number;
  amp: number;
};

type Targets = { outline: [number, number][]; fill: [number, number][] };

/* Sample the reference image into outline + interior target sets (unit
   coords). The stipple is rendered small with a slight blur so it fuses
   into a solid region; luminance thresholding gives the mask. */
async function buildTargets(): Promise<Targets> {
  const img = new Image();
  img.src = "/brain-reference-2.png";
  await img.decode();

  const W = 170;
  const H = Math.max(40, Math.round((img.naturalHeight / img.naturalWidth) * W));
  const off = document.createElement("canvas");
  off.width = W;
  off.height = H;
  const c = off.getContext("2d", { willReadFrequently: true })!;
  c.filter = "blur(1.6px)";
  c.drawImage(img, 0, 0, W, H);
  const data = c.getImageData(0, 0, W, H).data;

  const mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const a = data[i + 3];
      const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (a > 100 && lum < 208) mask[y * W + x] = 1;
    }
  }

  const isIn = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < W && y < H && mask[y * W + x] === 1;

  /* despeckle: drop mask cells with fewer than 3 of 8 neighbors */
  const clean = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!isIn(x, y)) continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          if ((dx || dy) && isIn(x + dx, y + dy)) n++;
      if (n >= 3) clean[y * W + x] = 1;
    }
  }
  const isClean = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < W && y < H && clean[y * W + x] === 1;

  const outline: [number, number][] = [];
  const fill: [number, number][] = [];
  let minX = W,
    minY = H,
    maxX = 0,
    maxY = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!isClean(x, y)) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      const edge =
        !isClean(x - 1, y) ||
        !isClean(x + 1, y) ||
        !isClean(x, y - 1) ||
        !isClean(x, y + 1);
      (edge ? outline : fill).push([x, y]);
    }
  }

  /* normalize into unit space with a small margin, preserving aspect */
  const bw = Math.max(1, maxX - minX);
  const bh = Math.max(1, maxY - minY);
  const scale = 0.94 / Math.max(bw, bh);
  const oxU = (1 - bw * scale) / 2;
  const oyU = (1 - bh * scale) / 2;
  const norm = (pts: [number, number][]) =>
    pts.map(
      ([x, y]) =>
        [oxU + (x - minX) * scale, oyU + (y - minY) * scale] as [number, number],
    );
  return { outline: norm(outline), fill: norm(fill) };
}

export function DotBrain({
  trigger,
  start = "top 85%",
  end = "top 32%",
}: {
  /* Optional external ScrollTrigger config — e.g. a pinned ancestor's
     runway — so assembly can sync with another scrubbed timeline. */
  trigger?: string;
  start?: string;
  end?: string;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    el.appendChild(canvas);
    const ctx = canvas.getContext("2d")!;

    const reduced = false;

    let seed = 1337;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    const dots: Dot[] = [];
    let disposed = false;

    buildTargets()
      .then(({ outline, fill }) => {
        if (disposed) return;
        const jitter = 0.9 / 170; // ≈ one sample cell, in unit space
        /* OUTLINE — dense, bright, slightly larger: the drawn contour.
           Tight jitter + earlier delays so the rim traces in first. */
        for (let i = 0; i < OUTLINE_COUNT; i++) {
          const [u, v] = outline[Math.floor(rand() * outline.length)];
          const accent = rand() < 0.04;
          dots.push({
            tu: u + (rand() - 0.5) * jitter * 0.6,
            tv: v + (rand() - 0.5) * jitter * 0.6,
            su: rand() * 1.6 - 0.3,
            sv: rand() * 1.6 - 0.3,
            delay: rand() * 0.25,
            r: 1.15 + rand() * 0.85,
            color: accent ? ACCENT : `rgba(255,255,255,${(0.82 + rand() * 0.18).toFixed(2)})`,
            phase: rand() * Math.PI * 2,
            amp: 0.3 + rand() * 0.55,
          });
        }
        /* FILL — sparser, dimmer random coverage of the interior */
        for (let i = 0; i < FILL_COUNT; i++) {
          const [u, v] = fill[Math.floor(rand() * fill.length)];
          const accent = rand() < 0.07;
          dots.push({
            tu: u + (rand() - 0.5) * jitter * 2.2,
            tv: v + (rand() - 0.5) * jitter * 2.2,
            su: rand() * 1.6 - 0.3,
            sv: rand() * 1.6 - 0.3,
            delay: 0.18 + rand() * 0.45,
            r: 0.6 + rand() * 0.8,
            color: accent ? ACCENT : `rgba(255,255,255,${(0.24 + rand() * 0.36).toFixed(2)})`,
            phase: rand() * Math.PI * 2,
            amp: 0.5 + rand() * 1.2,
          });
        }
      })
      .catch(() => {
        /* reference missing — leave the panel empty rather than wrong */
      });

    let W = 0;
    let H = 0;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const resize = () => {
      W = el.clientWidth;
      H = el.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const prog = { v: reduced ? 1 : 0 };
    const st = ScrollTrigger.create({
      trigger: trigger ?? el,
      start,
      end,
      scrub: 0.6,
      onUpdate: (self) => {
        if (!reduced) prog.v = self.progress;
      },
    });

    let raf = 0;
    let running = true;
    let t = 0;
    let last = performance.now();
    const smooth = (x: number) => x * x * (3 - 2 * x);

    const draw = (now: number) => {
      if (!running) return;
      const dt = (now - last) / 1000;
      last = now;
      if (!reduced) t += dt;

      ctx.clearRect(0, 0, W, H);
      const size = Math.min(W, H) * 0.96;
      const ox = (W - size) / 2;
      const oy = (H - size) / 2;

      const P = prog.v;
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        const local = smooth(Math.min(1, Math.max(0, P * 1.45 - d.delay)));
        const jx = Math.sin(t * 0.9 + d.phase) * d.amp * local;
        const jy = Math.cos(t * 0.7 + d.phase * 1.7) * d.amp * local;
        const u = d.su + (d.tu - d.su) * local;
        const v = d.sv + (d.tv - d.sv) * local;
        ctx.globalAlpha = 0.12 + 0.88 * local;
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(ox + u * size + jx, oy + v * size + jy, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(draw);
      } else if (!e.isIntersecting && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(el);

    return () => {
      disposed = true;
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      st.kill();
      el.removeChild(canvas);
    };
  }, []);

  return (
    <div
      ref={host}
      aria-hidden
      style={{ position: "absolute", inset: 0, overflow: "hidden" }}
    />
  );
}

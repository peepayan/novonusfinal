import { useEffect, useRef } from "react";

/* ============================================================================
   MORPH FIGURE — one dot field, three procedural figures. The deep-dive
   visuals translated into the v2 system: a clock (robot downtime), a globe
   (the labor gap), and two masses split by a void (the contact gap vision
   can't cross). Dots assemble on entry, then re-target and fly between
   figures as the chapter changes. Two-tier dots: bright outline, dim fill.
   ========================================================================== */

const OUTLINE_N = 560;
const FILL_N = 1160;
const ACCENT = "#8b5cf6";

type Pt = [number, number];
type Shape = { outline: Pt[]; fill: Pt[] };

function makeRand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* fill an array to exactly n points using a generator of candidate points */
function take(n: number, gen: () => Pt): Pt[] {
  const out: Pt[] = [];
  while (out.length < n) out.push(gen());
  return out;
}

/* — CLOCK: ring, 12 ticks, two dotted hands at ten-past-ten, hub — */
function clockShape(rand: () => number): Shape {
  const cx = 0.5;
  const cy = 0.5;
  const R = 0.44;
  const ring = take(Math.round(OUTLINE_N * 0.62), () => {
    const a = rand() * Math.PI * 2;
    const r = R + (rand() - 0.5) * 0.014;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
  const ticks = take(Math.round(OUTLINE_N * 0.18), () => {
    const k = Math.floor(rand() * 12);
    const a = (k / 12) * Math.PI * 2;
    const r = R - 0.03 - rand() * 0.035;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
  const hand = (angle: number, len: number, n: number) =>
    take(n, () => {
      const t = rand();
      const spread = (rand() - 0.5) * 0.016;
      return [
        cx + Math.cos(angle) * len * t + Math.cos(angle + Math.PI / 2) * spread,
        cy + Math.sin(angle) * len * t + Math.sin(angle + Math.PI / 2) * spread,
      ];
    });
  const hour = hand(-Math.PI * 0.75, 0.24, Math.round(OUTLINE_N * 0.09));
  const minute = hand(-Math.PI * 0.25, 0.34, Math.round(OUTLINE_N * 0.11));
  const outline = [...ring, ...ticks, ...hour, ...minute];
  while (outline.length < OUTLINE_N) outline.push(ring[Math.floor(rand() * ring.length)]);
  outline.length = OUTLINE_N;

  const fill = take(FILL_N, () => {
    if (rand() < 0.06) {
      const a = rand() * Math.PI * 2;
      const r = rand() * 0.025;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; // hub
    }
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * (R - 0.05);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
  return { outline, fill };
}

/* — EARTH: sampled from the site's own reference (/earth-vector.jpg) —
   the rim ring and the continent COASTLINES become bright outline dots,
   continent interiors get the dim fill, and the ocean stays empty. The
   disc is normalized to the same center/radius as the clock ring so the
   two morph into each other cleanly. */
async function earthShape(rand: () => number): Promise<Shape> {
  const img = new Image();
  img.src = "/earth-vector.jpg";
  await img.decode();

  const S = 320;
  const H = Math.max(60, Math.round((img.naturalHeight / img.naturalWidth) * S));
  const off = document.createElement("canvas");
  off.width = S;
  off.height = H;
  const c = off.getContext("2d", { willReadFrequently: true })!;
  c.drawImage(img, 0, 0, S, H); // no blur — keep coastlines crisp (QA #5)
  const data = c.getImageData(0, 0, S, H).data;

  const dark = new Uint8Array(S * H);
  let minX = S,
    minY = H,
    maxX = 0,
    maxY = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (lum < 150) {
        dark[y * S + x] = 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  /* disc geometry from the dark bounding box (the rim ring) */
  const dcx = (minX + maxX) / 2;
  const dcy = (minY + maxY) / 2;
  const R = Math.max(maxX - minX, maxY - minY) / 2;
  /* the source ring is thick — keep only its OUTER sliver as a hairline
     rim, discard the rest of the band entirely (QA #1) */
  const landMax = R * 0.855;
  const rimMin = R * 0.955;

  const isDark = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < S && y < H && dark[y * S + x] === 1;
  const dist = (x: number, y: number) => Math.hypot(x - dcx, y - dcy);

  const rim: Pt[] = [];
  const coast: Pt[] = [];
  const land: Pt[] = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!isDark(x, y)) continue;
      const d = dist(x, y);
      if (d > R * 1.02) continue;
      if (d >= rimMin) {
        rim.push([x, y]);
        continue;
      }
      if (d > landMax) continue; // interior of the thick ring — skip
      const border =
        !isDark(x - 1, y) || !isDark(x + 1, y) || !isDark(x, y - 1) || !isDark(x, y + 1);
      (border ? coast : land).push([x, y]);
    }
  }

  /* normalize the disc onto the clock's geometry: center (0.5,0.5), r 0.44 */
  const norm = ([x, y]: Pt): Pt => [
    0.5 + ((x - dcx) / R) * 0.44,
    0.5 + ((y - dcy) / R) * 0.44,
  ];
  const pick = (pool: Pt[]) => norm(pool[Math.floor(rand() * pool.length)]);
  const jit = 0.35 / 320;

  /* outline = coastlines with a hairline rim share (QA #1, #9) */
  const outline = take(OUTLINE_N, () => {
    const pool = rand() < 0.1 && rim.length ? rim : coast.length ? coast : rim;
    const [u, v] = pick(pool);
    return [u + (rand() - 0.5) * jit, v + (rand() - 0.5) * jit];
  });
  /* fill = continent interiors only, tight jitter — the ocean stays empty */
  const fill = take(FILL_N, () => {
    const [u, v] = pick(land.length ? land : coast);
    return [u + (rand() - 0.5) * jit, v + (rand() - 0.5) * jit];
  });
  return { outline, fill };
}

/* — THE GAP: two dotted masses with a void between; bright torn edges — */
function gapShape(rand: () => number): Shape {
  const y0 = 0.16;
  const y1 = 0.86;
  const edge = (y: number, side: 1 | -1) => {
    /* jagged inner edge via layered sines */
    const j =
      Math.sin(y * 21.7) * 0.02 + Math.sin(y * 9.3 + 2) * 0.028 + Math.sin(y * 47) * 0.01;
    return 0.5 + side * (0.09 + j * side);
  };
  const outline = take(OUTLINE_N, () => {
    const side = rand() < 0.5 ? -1 : 1;
    const y = y0 + rand() * (y1 - y0);
    const ex = edge(y, side as 1 | -1);
    if (rand() < 0.78) {
      /* torn inner edges facing the void */
      return [ex + side * rand() * 0.02, y];
    }
    /* top rims */
    const x = side === -1 ? 0.06 + rand() * (edge(y0, -1) - 0.06) : edge(y0, 1) + rand() * (0.94 - edge(y0, 1));
    return [x, y0 + (rand() - 0.5) * 0.015];
  });
  const fill = take(FILL_N, () => {
    const side = rand() < 0.5 ? -1 : 1;
    const y = y0 + rand() * (y1 - y0);
    const ex = edge(y, side as 1 | -1);
    const x =
      side === -1 ? 0.06 + rand() * Math.max(0.02, ex - 0.02 - 0.06) : ex + 0.02 + rand() * Math.max(0.02, 0.94 - ex - 0.02);
    return [x, y];
  });
  return { outline, fill };
}

type Dot = {
  su: number;
  sv: number;
  cu: number; // current shape-target (from)
  cv: number;
  nu: number; // next shape-target (to)
  nv: number;
  delay: number;
  mDelay: number;
  r: number;
  color: string;
  phase: number;
  amp: number;
  /* stored random keys so per-shape styles are deterministic */
  k1: number;
  k2: number;
  k3: number;
};

/* Per-shape dot styling (QA #2/#4/#6/#7): the earth renders like the v1
   globe — uniform small bright white dots, no accent flecks, calm idle —
   while the clock and gap keep the two-tier outline/fill language. */
function styleFor(
  shapeIdx: number,
  isOutline: boolean,
  k1: number,
  k2: number,
  k3: number,
): { color: string; r: number; amp: number } {
  if (shapeIdx === 1) {
    return {
      color: `rgba(255,255,255,${(0.72 + k1 * 0.28).toFixed(2)})`,
      r: 0.95 + k2 * 0.3,
      amp: 0.12 + k3 * 0.22,
    };
  }
  if (isOutline) {
    return {
      color:
        k1 < 0.04 ? ACCENT : `rgba(255,255,255,${(0.8 + k2 * 0.2).toFixed(2)})`,
      r: 1.1 + k2 * 0.85,
      amp: 0.3 + k3 * 0.55,
    };
  }
  return {
    color:
      k1 < 0.07 ? ACCENT : `rgba(255,255,255,${(0.24 + k2 * 0.36).toFixed(2)})`,
    r: 0.6 + k2 * 0.8,
    amp: 0.5 + k3 * 1.1,
  };
}

export function MorphFigure({
  shapeIndex,
  entry,
}: {
  shapeIndex: number;
  /* 0→1 assembly progress supplied by the owning section's scrub */
  entry: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const entryRef = useRef(entry);
  entryRef.current = entry;
  const shapeRef = useRef(shapeIndex);
  const api = useRef<{ setShape: (i: number) => void } | null>(null);

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
    const rand = makeRand(2026);
    let disposed = false;
    let shapes: Shape[] = [];
    const dots: Dot[] = [];

    let morphStart = -1;
    const MORPH_MS = 950;

    /* the earth is sampled from the reference image — shapes build async */
    (async () => {
      const clock = clockShape(rand);
      const gap = gapShape(rand);
      let earth: Shape;
      try {
        earth = await earthShape(rand);
      } catch {
        earth = clock; // reference missing: degrade to the ring
      }
      if (disposed) return;
      shapes = [clock, earth, gap];

      const startIdx = Math.max(0, Math.min(shapes.length - 1, shapeRef.current));
      const start = shapes[startIdx];
      for (let i = 0; i < OUTLINE_N + FILL_N; i++) {
        const isOutline = i < OUTLINE_N;
        const src = isOutline ? start.outline[i] : start.fill[i - OUTLINE_N];
        const k1 = rand();
        const k2 = rand();
        const k3 = rand();
        const st = styleFor(startIdx, isOutline, k1, k2, k3);
        dots.push({
          su: rand() * 1.6 - 0.3,
          sv: rand() * 1.6 - 0.3,
          cu: src[0],
          cv: src[1],
          nu: src[0],
          nv: src[1],
          delay: rand() * 0.4,
          mDelay: rand() * 0.22,
          r: st.r,
          color: st.color,
          phase: rand() * Math.PI * 2,
          amp: st.amp,
          k1,
          k2,
          k3,
        });
      }
    })();

    api.current = {
      setShape: (idx: number) => {
        if (!shapes.length || !dots.length) return; // still loading; build uses shapeRef
        const clamped = Math.max(0, Math.min(shapes.length - 1, idx));
        const s = shapes[clamped];
        for (let i = 0; i < dots.length; i++) {
          const d = dots[i];
          const isOutline = i < OUTLINE_N;
          /* freeze current interpolated target as the new "from" */
          const t = morphT(performance.now(), d.mDelay);
          d.cu = d.cu + (d.nu - d.cu) * t;
          d.cv = d.cv + (d.nv - d.cv) * t;
          const p = isOutline ? s.outline[i] : s.fill[i - OUTLINE_N];
          d.nu = p[0];
          d.nv = p[1];
          /* restyle for the destination figure */
          const st = styleFor(clamped, isOutline, d.k1, d.k2, d.k3);
          d.color = st.color;
          d.r = st.r;
          d.amp = st.amp;
        }
        morphStart = performance.now();
      },
    };

    const smooth = (x: number) => x * x * (3 - 2 * x);
    const morphT = (now: number, delay: number) => {
      if (morphStart < 0) return 1;
      const raw = (now - morphStart) / MORPH_MS - delay;
      return smooth(Math.min(1, Math.max(0, raw / (1 - 0.22))));
    };

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

    let raf = 0;
    let running = true;
    let t = 0;
    let last = performance.now();

    const draw = (now: number) => {
      if (!running) return;
      const dt = (now - last) / 1000;
      last = now;
      if (!reduced) t += dt;

      ctx.clearRect(0, 0, W, H);
      const size = Math.min(W, H) * 0.96;
      const ox = (W - size) / 2;
      const oy = (H - size) / 2;
      const P = reduced ? 1 : entryRef.current;

      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        const mt = reduced ? 1 : morphT(now, d.mDelay);
        const tu = d.cu + (d.nu - d.cu) * mt;
        const tv = d.cv + (d.nv - d.cv) * mt;
        const local = smooth(Math.min(1, Math.max(0, P * 1.45 - d.delay)));
        const jx = Math.sin(t * 0.9 + d.phase) * d.amp * local;
        const jy = Math.cos(t * 0.7 + d.phase * 1.7) * d.amp * local;
        const u = d.su + (tu - d.su) * local;
        const v = d.sv + (tv - d.sv) * local;
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
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      el.removeChild(canvas);
      api.current = null;
      disposed = true;
    };
  }, []);

  /* react to chapter changes */
  useEffect(() => {
    if (shapeRef.current !== shapeIndex) {
      shapeRef.current = shapeIndex;
      api.current?.setShape(shapeIndex);
    }
  }, [shapeIndex]);

  return (
    <div
      ref={host}
      aria-hidden
      style={{ position: "absolute", inset: 0, overflow: "hidden" }}
    />
  );
}

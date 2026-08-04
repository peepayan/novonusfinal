import { useEffect, useRef } from "react";
import * as THREE from "three";

/* ============================================================================
   FORCE FIELD — the site's WebGL identity. A landscape of horizontal contour
   LINES (never dots) displaced by layered value noise, drawn 1px white on
   black, with a single signal-orange line sweeping the field. Mouse tilts
   the plane; scroll calms the amplitude as the hero exits.
   ========================================================================== */

/* Small value-noise (original implementation): hash grid + smooth lerp. */
function makeNoise(seed = 7) {
  const hash = (x: number, y: number) => {
    let h = x * 374761393 + y * 668265263 + seed * 144665;
    h = (h ^ (h >> 13)) * 1274126177;
    return (((h ^ (h >> 16)) >>> 0) % 2048) / 1024 - 1;
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const a = hash(xi, yi);
    const b = hash(xi + 1, yi);
    const c = hash(xi, yi + 1);
    const d = hash(xi + 1, yi + 1);
    const u = smooth(xf);
    const v = smooth(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

export function ForceField({ amplitude = 1 }: { amplitude?: number }) {
  const mount = useRef<HTMLDivElement>(null);
  const ampRef = useRef(amplitude);
  ampRef.current = amplitude;

  useEffect(() => {
    const host = mount.current;
    if (!host) return;

    const reduced = false;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x060605, 14, 40);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 5.2, 14.5);
    camera.lookAt(0, 0, 0);

    const group = new THREE.Group();
    group.rotation.x = -0.12;
    scene.add(group);

    const noise = makeNoise();
    const LINES = 64;
    const POINTS = 130;
    const WIDTH = 42;
    const DEPTH = 26;

    type Strip = { line: THREE.Line; z: number; positions: Float32Array };
    const strips: Strip[] = [];

    const baseMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.28,
    });
    const accentMat = new THREE.LineBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.95,
    });

    for (let i = 0; i < LINES; i++) {
      const z = (i / (LINES - 1) - 0.5) * DEPTH;
      const positions = new Float32Array(POINTS * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const line = new THREE.Line(geo, baseMat);
      group.add(line);
      strips.push({ line, z, positions });
    }

    /* The sweeping accent line reuses geometry shape but its own material. */
    const accentIndex = { v: 0 };

    const displace = (t: number) => {
      const amp = ampRef.current;
      for (let i = 0; i < strips.length; i++) {
        const s = strips[i];
        const p = s.positions;
        for (let j = 0; j < POINTS; j++) {
          const x = (j / (POINTS - 1) - 0.5) * WIDTH;
          const nz = s.z * 0.24;
          const h =
            noise(x * 0.16 + t * 0.22, nz + t * 0.12) * 1.6 +
            noise(x * 0.05 - t * 0.08, nz * 0.5) * 2.6;
          p[j * 3] = x;
          p[j * 3 + 1] = h * amp;
          p[j * 3 + 2] = s.z;
        }
        s.line.geometry.attributes.position.needsUpdate = true;
        /* accent line sweeps front→back and loops */
        const isAccent = i === Math.floor(accentIndex.v) % LINES;
        s.line.material = isAccent ? accentMat : baseMat;
      }
    };

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    /* mouse parallax */
    const target = { rx: -0.12, ry: 0 };
    const onMove = (e: PointerEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      target.ry = nx * 0.14;
      target.rx = -0.12 + ny * 0.08;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let raf = 0;
    let running = true;
    const clock = new THREE.Clock();
    let elapsed = 0;

    const tick = () => {
      if (!running) return;
      const dt = clock.getDelta();
      if (!reduced) elapsed += dt;
      accentIndex.v += dt * 9;
      displace(elapsed);
      group.rotation.y += (target.ry - group.rotation.y) * 0.04;
      group.rotation.x += (target.rx - group.rotation.x) * 0.04;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    displace(0.001);
    tick();

    /* pause when offscreen */
    const io = new IntersectionObserver(([e]) => {
      const should = e.isIntersecting;
      if (should && !running) {
        running = true;
        clock.getDelta();
        tick();
      } else if (!should) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(host);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      strips.forEach((s) => s.line.geometry.dispose());
      baseMat.dispose();
      accentMat.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mount}
      aria-hidden
      style={{ position: "absolute", inset: 0, overflow: "hidden" }}
    />
  );
}

"""Visual QA scrub of the How-it-works pinned SVG scene.

Loads localhost:5173, waits out the preloader, scrolls the .hiw-pin to fixed
progress fractions, and captures full-viewport + .hiw-world element shots.
Also dumps client rects + opacities of named SVG groups per stop (rects.json)
so pixel positions can be mapped back to SVG viewBox coordinates.
"""

import json
import os

from playwright.sync_api import sync_playwright

OUT = r"C:\Users\deepa\novonus-v2\research\qa"
os.makedirs(OUT, exist_ok=True)

FRACS = [0.10, 0.30, 0.50, 0.68, 0.88, 0.99]

GROUPS = [
    ".w-conveyor", ".w-parts", ".w-bench", ".w-rig", ".w-hand", ".w-hand-path",
    ".w-force", ".w-wave", ".w-ghosts", ".w-skill-unit", ".w-block", ".w-grip",
    ".w-checks", ".w-block-ring", ".w-gate", ".w-chips", ".w-lib-1", ".w-lib-2",
    ".w-lib-3", ".w-cmp-1", ".w-cmp-2", ".w-cmp-3", ".w-exit", ".w-cloud",
    ".w-version", ".w-version-2", ".w-shelf", ".w-wire", ".w-edge", ".w-edge-ring",
    ".w-arm", ".w-robohand", ".w-replay", ".w-bar", ".w-call", ".w-return",
    ".w-ruler", ".w-eye", ".w-chart", ".w-chart-dots", ".w-alarm", ".w-moon",
    ".w-loop", ".w-human", ".w-approve", ".w-roll",
]

DUMP_JS = """
(groups) => {
  const svg = document.querySelector('.hiw-svg');
  const sr = svg.getBoundingClientRect();
  const vb = svg.getAttribute('viewBox').split(/\\s+/).map(Number);
  const toSvg = (px, py) => [
    +(vb[0] + (px - sr.left) / sr.width * vb[2]).toFixed(1),
    +(vb[1] + (py - sr.top) / sr.height * vb[3]).toFixed(1),
  ];
  const out = { viewBox: vb, svgRect: { l: sr.left, t: sr.top, w: sr.width, h: sr.height }, els: {} };
  for (const sel of groups) {
    const el = svg.querySelector(sel) || document.querySelector(sel);
    if (!el) { out.els[sel] = null; continue; }
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    let leafOp = null, leafVis = null;
    const leaf = el.matches('g') ? el.querySelector('path,circle,rect,line,ellipse,text,polyline') : el;
    if (leaf) { const lc = getComputedStyle(leaf); leafOp = +lc.opacity; leafVis = lc.visibility; }
    const [x1, y1] = toSvg(r.left, r.top);
    const [x2, y2] = toSvg(r.right, r.bottom);
    out.els[sel] = {
      svgBox: [x1, y1, x2, y2],
      op: +cs.opacity, vis: cs.visibility, leafOp, leafVis,
    };
  }
  return out;
}
"""

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(
        viewport={"width": 1440, "height": 900}, device_scale_factor=2
    )
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.goto("http://localhost:5173", wait_until="load")
    page.wait_for_timeout(4500)  # preloader

    pin = page.evaluate(
        """() => {
      const el = document.querySelector('.hiw-pin');
      const r = el.getBoundingClientRect();
      return { top: r.top + window.scrollY, height: el.offsetHeight };
    }"""
    )
    print(f"pin top={pin['top']:.0f} height={pin['height']:.0f}")

    all_dumps = {}
    for frac in FRACS:
        y = pin["top"] + frac * (pin["height"] - 900)
        page.evaluate(f"window.scrollTo(0, {y})")
        page.wait_for_timeout(2400)
        tag = f"p{int(round(frac * 100)):03d}"
        before = page.evaluate("window.scrollY")
        page.screenshot(path=os.path.join(OUT, f"{tag}_full.png"))
        page.locator(".hiw-world").screenshot(path=os.path.join(OUT, f"{tag}_world.png"))
        after = page.evaluate("window.scrollY")
        if abs(after - before) > 1:
            print(f"WARN {tag}: scroll shifted {before:.0f}->{after:.0f} during element shot")
        dump = page.evaluate(DUMP_JS, GROUPS)
        all_dumps[tag] = dump
        vis = [
            s for s, d in dump["els"].items()
            if d and d["vis"] != "hidden" and d["op"] > 0.05
            and (d["leafOp"] is None or d["leafOp"] > 0.05 or d["leafVis"] == "visible")
        ]
        print(f"{tag} scrollY={after:.0f} viewBox={dump['viewBox']} visible={len(vis)}")

    with open(os.path.join(OUT, "rects.json"), "w") as f:
        json.dump(all_dumps, f, indent=1)

    if errors:
        print("CONSOLE ERRORS:")
        for e in errors[:10]:
            print("  ", e[:200])
    browser.close()
print("done")

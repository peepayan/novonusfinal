"""Zoomed clip captures of specific SVG regions at several scrub stops."""

import os

from playwright.sync_api import sync_playwright

OUT = r"C:\Users\deepa\novonus-v2\research\qa"

# (frac, name, svg region x1,y1,x2,y2)
SHOTS = [
    (0.30, "z030_gate_block", (290, 150, 730, 420)),
    (0.50, "z050_block_at_gate", (590, 190, 910, 430)),
    (0.50, "z050_lib_beams", (70, 130, 510, 360)),
    (0.68, "z068_cloud_block", (580, 20, 900, 200)),
    (0.68, "z068_edge_hand", (590, 370, 960, 700)),
    (0.77, "z077_ruler_lib", (60, 120, 340, 330)),
    (0.77, "z077_edge_hand_full", (580, 370, 960, 700)),
    (0.77, "z077_cloud", (580, 20, 900, 200)),
    (0.88, "z088_chart_moon", (50, 10, 400, 210)),
    (0.88, "z088_parts_eye", (350, 460, 660, 620)),
    (0.99, "z099_loop_human", (270, -30, 880, 170)),
    (0.99, "z099_cloud_area", (600, 20, 900, 210)),
]

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=3)
    page.goto("http://localhost:5173", wait_until="load")
    page.wait_for_timeout(4500)

    pin = page.evaluate(
        """() => { const el = document.querySelector('.hiw-pin');
      const r = el.getBoundingClientRect();
      return { top: r.top + window.scrollY, height: el.offsetHeight }; }"""
    )

    cur = None
    for frac, name, (x1, y1, x2, y2) in SHOTS:
        if frac != cur:
            y = pin["top"] + frac * (pin["height"] - 900)
            page.evaluate(f"window.scrollTo(0, {y})")
            page.wait_for_timeout(2400)
            cur = frac
        m = page.evaluate(
            """() => { const svg = document.querySelector('.hiw-svg');
          const r = svg.getBoundingClientRect();
          const vb = svg.getAttribute('viewBox').split(/\\s+/).map(Number);
          return { l: r.left, t: r.top, w: r.width, h: r.height, vb }; }"""
        )
        vb = m["vb"]
        sx = m["w"] / vb[2]
        sy = m["h"] / vb[3]
        clip = {
            "x": m["l"] + (x1 - vb[0]) * sx,
            "y": m["t"] + (y1 - vb[1]) * sy,
            "width": (x2 - x1) * sx,
            "height": (y2 - y1) * sy,
        }
        page.screenshot(path=os.path.join(OUT, f"{name}.png"), clip=clip)
        print(name, "ok", {k: round(v) for k, v in clip.items()})
    browser.close()
print("done")

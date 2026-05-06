/* ============================================================================
   ARCHIVED — original "fluidy" hero background.

   This is the Paper Shaders' Warp-shader-based liquid/lava background that
   used to live in app/page.tsx. Saved here verbatim so it can be restored
   later. To put it back:

   1. Add the import at the top of app/page.tsx:
        import { Warp } from "@paper-design/shaders-react";

   2. Paste the LavaBackground function below back into app/page.tsx
      (immediately above the HERO section).

   3. Replace <StarryBackground /> with <LavaBackground /> at the hero
      mount site inside the sticky 100svh container.

   Package: @paper-design/shaders-react (already installed).
   ========================================================================== */

import { Warp } from "@paper-design/shaders-react";

/* ============================================================================
   HERO BACKGROUND — Paper Shaders' Warp shader, configured to match the
   "Lava" preset used by tnkr.ai's #leonardo section, but with the orange
   palette replaced by cyan.

   Original Lava preset (tnkr.ai):
     colors: ['#FF9F21', '#FF0303', '#000000']
     rotation: 114, proportion: 100, scale: 0.52, speed: 30,
     distortion: 7, swirl: 18, swirlIterations: 20, softness: 100,
     shape: 'Edge', shapeSize: 12
   Framer's wrapper scales the slider-friendly preset values to the React
   component's 0..1 ranges (proportion/100, softness/100, distortion/50,
   swirl/100, shapeSize/100, speed/30 → 1.0).

   The 180° wrapper rotation matches tnkr.ai's setup — flips the
   shader's natural color1-at-top orientation so the bright pole lands
   at the top after the 114° UV rotation tilts the gradient.

   Cyan palette mapping:
     #FF9F21 (bright orange) → #22D3EE (site-primary cyan, var(--cyan))
     #FF0303 (saturated red) → #0891B2 (cyan-700, deeper saturated mid)
     #000000 (black)         → #000000
   ========================================================================== */
export function LavaBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={{ background: "#000000" }}
    >
      <Warp
        colors={["#22D3EE", "#000000"]}
        rotation={0}
        proportion={0.06}
        softness={1}
        scale={0.52}
        speed={2.5}
        distortion={0.14}
        swirl={0.18}
        swirlIterations={20}
        shape="edge"
        shapeScale={0.12}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

"""
Generate a silhouette mask from hero-lines-overlay.png.

The overlay PNG contains red helmet/face outlines on a transparent background.
We turn it into a solid-white silhouette of the enclosed interior so the
scroll-driven fill can be constrained to that shape via CSS mask.

Steps:
  1. Read alpha channel of overlay.
  2. Build a binary "lines" image (1 where any visible line exists).
  3. Slightly dilate the lines so any small gaps in the outline are sealed
     before flood-fill leaks through.
  4. Flood-fill the EXTERIOR from all four image corners.
  5. The interior = NOT exterior AND NOT lines  (and we union back the lines
     so the silhouette covers the lines too).
  6. Feather the edge with a Gaussian blur for soft transitions.
  7. Save as RGBA PNG: white interior with alpha = silhouette mask.
"""

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "public" / "hero-lines-overlay.png"
DST = ROOT / "public" / "helmet-silhouette.png"

ALPHA_THRESHOLD = 24      # pixels with alpha above this count as "line"
DILATE_PX = 3             # seal small gaps in the outline
FEATHER_PX = 4            # soft edge for blending


def dilate(mask: np.ndarray, radius: int) -> np.ndarray:
    """Square-kernel dilation via PIL MaxFilter."""
    if radius <= 0:
        return mask
    img = Image.fromarray((mask * 255).astype(np.uint8), mode="L")
    img = img.filter(ImageFilter.MaxFilter(radius * 2 + 1))
    return (np.asarray(img) > 127).astype(np.uint8)


def flood_fill_exterior(lines: np.ndarray) -> np.ndarray:
    """BFS flood-fill from all border pixels through cells where lines==0.

    Returns a uint8 mask where 1 = exterior (reachable from border)."""
    h, w = lines.shape
    exterior = np.zeros_like(lines, dtype=np.uint8)
    queue: deque[tuple[int, int]] = deque()

    def push(y: int, x: int) -> None:
        if 0 <= y < h and 0 <= x < w and exterior[y, x] == 0 and lines[y, x] == 0:
            exterior[y, x] = 1
            queue.append((y, x))

    for x in range(w):
        push(0, x)
        push(h - 1, x)
    for y in range(h):
        push(y, 0)
        push(y, w - 1)

    while queue:
        y, x = queue.popleft()
        push(y - 1, x)
        push(y + 1, x)
        push(y, x - 1)
        push(y, x + 1)

    return exterior


def main() -> None:
    src = Image.open(SRC).convert("RGBA")
    arr = np.asarray(src)
    alpha = arr[..., 3]

    lines = (alpha > ALPHA_THRESHOLD).astype(np.uint8)
    sealed = dilate(lines, DILATE_PX)

    exterior = flood_fill_exterior(sealed)
    silhouette = (1 - exterior).astype(np.uint8)  # interior + the lines themselves

    mask_img = Image.fromarray((silhouette * 255).astype(np.uint8), mode="L")
    if FEATHER_PX > 0:
        mask_img = mask_img.filter(ImageFilter.GaussianBlur(FEATHER_PX))

    out = Image.new("RGBA", src.size, (255, 255, 255, 0))
    out.putalpha(mask_img)
    out.save(DST, "PNG")

    coverage = float((np.asarray(mask_img) > 8).sum()) / (src.size[0] * src.size[1])
    print(f"saved {DST.name}  size={src.size}  interior coverage={coverage:.1%}")


if __name__ == "__main__":
    main()

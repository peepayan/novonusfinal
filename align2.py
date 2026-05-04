import cv2
import numpy as np

hero = cv2.imread('public/hero-image.png')
brain = cv2.imread('public/brain_outline.png', cv2.IMREAD_UNCHANGED)

alpha = brain[:,:,3]
hero_gray = cv2.cvtColor(hero, cv2.COLOR_BGR2GRAY)

best_score = 0
best_scale = 1.0
best_x = 0
best_y = 0

scales = np.linspace(0.15, 0.45, 60)

coords = cv2.findNonZero(alpha)
x, y, w, h = cv2.boundingRect(coords)
cropped_alpha = alpha[y:y+h, x:x+w]

for scale in scales:
    new_w = int(w * scale)
    new_h = int(h * scale)
    if new_w <= 0 or new_h <= 0: continue
    
    resized_mask = cv2.resize(cropped_alpha, (new_w, new_h), interpolation=cv2.INTER_AREA)
    
    res = cv2.matchTemplate(hero_gray, resized_mask, cv2.TM_CCORR_NORMED)
    
    min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(res)
    
    if max_val > best_score:
        best_score = max_val
        best_scale = scale
        best_x = max_loc[0]
        best_y = max_loc[1]

# We need the percentages for the FULL brain_outline.png canvas, not just the cropped area!
# To align the full canvas, we must subtract the scaled offset of the crop from the matched position.
# The crop top-left is (x, y) in the original brain_outline.png.
# When scaled, that offset becomes (x * scale, y * scale).
# So the full canvas top-left in the hero image should be:
canvas_x = best_x - int(x * best_scale)
canvas_y = best_y - int(y * best_scale)
canvas_w = int(1746 * best_scale)
canvas_h = int(1344 * best_scale)

print(f"Best Match: score={best_score:.4f}, scale={best_scale:.4f}")
print(f"Canvas in hero: x={canvas_x}, y={canvas_y}, w={canvas_w}, h={canvas_h}")

pct_left = (canvas_x / 1739) * 100
pct_top = (canvas_y / 1344) * 100
pct_width = (canvas_w / 1739) * 100
pct_height = (canvas_h / 1344) * 100

print(f"CSS Percentages:")
print(f"left: {pct_left:.2f}%")
print(f"top: {pct_top:.2f}%")
print(f"width: {pct_width:.2f}%")
print(f"height: {pct_height:.2f}%")

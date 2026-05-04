import cv2
import numpy as np

# Load images
hero = cv2.imread('public/hero-image.png')
brain = cv2.imread('public/brain_outline.png', cv2.IMREAD_UNCHANGED)

# hero is 1739x1344. brain is 1746x1344.
# The brain image has an alpha channel.
alpha = brain[:,:,3]

# The brain lines in hero are light blue.
# Convert hero to grayscale
hero_gray = cv2.cvtColor(hero, cv2.COLOR_BGR2GRAY)

best_score = 0
best_scale = 1.0
best_x = 0
best_y = 0

# We need to test scales. The brain is smaller than the full canvas.
# Let's test scales from 0.2 to 0.6
scales = np.linspace(0.3, 0.5, 40)

# Crop the alpha mask to its bounding box to speed up template matching
coords = cv2.findNonZero(alpha)
x, y, w, h = cv2.boundingRect(coords)
cropped_alpha = alpha[y:y+h, x:x+w]

print(f"Cropped brain outline bounds: x={x}, y={y}, w={w}, h={h}")

for scale in scales:
    # Resize the cropped alpha mask
    new_w = int(w * scale)
    new_h = int(h * scale)
    if new_w <= 0 or new_h <= 0: continue
    
    resized_mask = cv2.resize(cropped_alpha, (new_w, new_h), interpolation=cv2.INTER_AREA)
    
    # Use matchTemplate with TM_CCORR (Cross Correlation)
    # We correlate the resized mask with the hero_gray image.
    # Since the mask is 255 where lines are, and hero_gray is bright where lines are,
    # the maximum correlation should be when they overlap perfectly!
    res = cv2.matchTemplate(hero_gray, resized_mask, cv2.TM_CCORR_NORMED)
    
    min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(res)
    
    if max_val > best_score:
        best_score = max_val
        best_scale = scale
        # max_loc is the top-left corner of the matched region in hero
        best_x = max_loc[0]
        best_y = max_loc[1]

print(f"Best Match: score={best_score:.4f}, scale={best_scale:.4f}")
print(f"Matched top-left in hero: x={best_x}, y={best_y}")
print(f"Matched size in hero: w={int(w * best_scale)}, h={int(h * best_scale)}")

# Calculate percentages for the bounding box relative to hero-image.png (1739x1344)
pct_left = (best_x / 1739) * 100
pct_top = (best_y / 1344) * 100
pct_width = (int(w * best_scale) / 1739) * 100
pct_height = (int(h * best_scale) / 1344) * 100

print(f"CSS Percentages:")
print(f"left: {pct_left:.2f}%")
print(f"top: {pct_top:.2f}%")
print(f"width: {pct_width:.2f}%")
print(f"height: {pct_height:.2f}%")

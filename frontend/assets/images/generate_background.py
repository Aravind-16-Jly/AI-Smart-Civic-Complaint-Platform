from PIL import Image, ImageDraw, ImageFilter
import math
from pathlib import Path

w, h = 1920, 1080
img = Image.new('RGB', (w, h), (5, 10, 25))

for y in range(h):
    t = y / (h - 1)
    r = int(5 + 55 * (1 - t) + 20 * t)
    g = int(10 + 75 * (1 - t) + 40 * t)
    b = int(25 + 110 * (1 - t) + 85 * t)
    for x in range(w):
        img.putpixel((x, y), (r, g, b))

draw = ImageDraw.Draw(img)
for i in range(220):
    x = int((i / 220) * w)
    y = int(h * 0.28 + math.sin(i / 10) * 42 + (i % 8) * 10)
    radius = 2 + (i % 4)
    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(70, 150, 220))

for i in range(120):
    x = int((i * 37) % w)
    y = int(200 + (i * 23) % (h - 280))
    radius = 1 + (i % 3)
    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(58, 220, 220))

for i in range(8):
    cx = int(w * 0.18 + i * 140)
    cy = int(h * 0.16 + (i * 70) % 280)
    r = 120 + i * 30
    bbox = (cx - r, cy - r, cx + r, cy + r)
    draw.ellipse(bbox, fill=(20, 40, 90))

img = img.filter(ImageFilter.GaussianBlur(radius=2))
out = Path(__file__).with_name('background.jpg')
img.save(out)
print(out)

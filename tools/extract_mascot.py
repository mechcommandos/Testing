"""Extract the LayJou mascot from the source screenshot: crop + remove the flat background."""
import sys
from collections import deque
from PIL import Image, ImageFilter

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB").crop((200, 840, 1020, 1880))
w, h = im.size
px = im.load()
bg = px[5, 5]

def dist(p):
    return max(abs(p[0] - bg[0]), abs(p[1] - bg[1]), abs(p[2] - bg[2]))

T = 9  # flood-fill tolerance (white outline of the robot is ~13+ away from the bg)
mask = Image.new("L", (w, h), 255)
m = mask.load()
q = deque()
for x in range(w):
    q.append((x, 0)); q.append((x, h - 1))
for y in range(h):
    q.append((0, y)); q.append((w - 1, y))
while q:
    x, y = q.popleft()
    if x < 0 or y < 0 or x >= w or y >= h or m[x, y] == 0:
        continue
    if dist(px[x, y]) > T:
        continue
    m[x, y] = 0
    q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
rgba = im.convert("RGBA")
rgba.putalpha(mask)
box = rgba.getbbox()
rgba = rgba.crop(box)
rgba.save(out)
print(rgba.size)

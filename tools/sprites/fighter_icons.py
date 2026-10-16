"""Fighter select icons: a 2x close-up of each fighter's face on a burst of their colours.
Run:  python3 tools/sprites/fighter_icons.py
Writes public/assets/fighters/<id>/icon.png (72x38 = the select tile above its name bar).

For each fighter: crop a 36x19 window around the face from the first idle frame, scale it 2x with
hard pixels, add a 2 px dark outline around the silhouette, and lay it over a background of diagonal
light rays in the fighter's two theme colours (like a fighting-game roster card).
"""
import math, os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'assets', 'fighters')
W, H = 72, 38
FIGHTERS = {
    #  id              sheet path                     frame size  crop (x, y) of a 36x19 window   background dark / light / ray
    'soul-summoner': ('soul-summoner/idle_sheet.png', (64, 64), (14, 3), (0x0e1a3a, 0x2c5aa8, 0x78a0c6)),
    'mr-wake':       ('mr-wake/idle_sheet.png',       (64, 64), (18, 4), (0x1e0a1e, 0x5a1a40, 0x9b5de5)),
    'hero-knight':   ('hero-knight/idle_sheet.png',   (150, 90), (48, 37), (0x1c1418, 0x5a2a30, 0xc9c9c9)),
}

def rgb(c): return ((c >> 16) & 255, (c >> 8) & 255, c & 255)

def background(dark, light, ray):
    img = Image.new('RGBA', (W, H))
    px = img.load()
    cx, cy = W * 0.62, H * 0.35                       # light source behind the face
    for y in range(H):
        for x in range(W):
            k = min(1, math.hypot(x - cx, (y - cy) * 1.6) / 60)
            base = [round(a + (b - a) * (1 - k)) for a, b in zip(rgb(dark), rgb(light))]
            ang = math.atan2(y - cy, x - cx)
            if int((ang + math.pi) / (math.pi / 9)) % 2 == 0 and k > 0.15:   # alternating light rays
                base = [round(v + (r - v) * 0.22 * (1 - k)) for v, r in zip(base, rgb(ray))]
            if (x + y) % 2 == 0 and k > 0.8: base = [max(0, v - 8) for v in base]   # dithered dark corners
            px[x, y] = tuple(base) + (255,)
    return img

def make(fid, path, frame, crop):
    sheet = Image.open(os.path.join(ROOT, path)).convert('RGBA')
    fw, fh = frame
    face = sheet.crop((crop[0], crop[1], crop[0] + 36, crop[1] + 19))
    big = face.resize((72, 38), Image.NEAREST)
    a = big.getchannel('A')
    outline = Image.new('RGBA', big.size, (0, 0, 0, 0))
    op = outline.load()
    for y in range(H):
        for x in range(W):
            if a.getpixel((x, y)): continue
            if any(0 <= x + dx < W and 0 <= y + dy < H and a.getpixel((x + dx, y + dy)) for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2) if abs(dx) + abs(dy) <= 2):
                op[x, y] = (10, 8, 20, 255)
    return outline, big

for fid, (path, frame, crop, cols) in FIGHTERS.items():
    out = background(*cols)
    outline, big = make(fid, path, frame, crop)
    out.alpha_composite(outline); out.alpha_composite(big)
    dst = os.path.join(ROOT, path.split('/')[0], 'icon.png')
    out.save(dst)
    print('saved', dst)

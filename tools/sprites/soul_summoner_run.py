"""Soul Summoner's run: the designer's 8-frame run atlas turned into the game's strip.
Run:  python3 tools/sprites/soul_summoner_run.py
Reads  tools/sprites/soul-summoner/run_atlas.png  (192x192 atlas, 3 columns of 64x64 frames, 8 frames)
Writes public/assets/fighters/soul-summoner/run_sheet.png  (8 frames side by side, 512x64)

The frames already share the idle sheet's canvas (feet on row 58), so they are copied as they are,
except for a few stray green pixels left by the generator along the cape and legs: each is replaced by
the colour of its non-green neighbours, or cleared if it sits at the edge of the silhouette.
Frames 1-3 ease from standing into the stride (played once when he starts running), 4-8 are the loop.
"""
import colorsys, os
from collections import Counter
from PIL import Image

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, 'soul-summoner', 'run_atlas.png')
DST = os.path.join(HERE, '..', '..', 'public', 'assets', 'fighters', 'soul-summoner', 'run_sheet.png')

def green(p):
    if p[3] == 0: return False
    h, s, v = colorsys.rgb_to_hsv(p[0] / 255, p[1] / 255, p[2] / 255)
    return 0.22 < h < 0.45 and s > 0.3

atlas = Image.open(SRC).convert('RGBA')
sheet = Image.new('RGBA', (64 * 8, 64), (0, 0, 0, 0))
fixed = 0
for k in range(8):
    f = atlas.crop(((k % 3) * 64, (k // 3) * 64, (k % 3) * 64 + 64, (k // 3) * 64 + 64))
    src = f.copy().load(); px = f.load()
    for y in range(64):
        for x in range(64):
            if not green(src[x, y]): continue
            near = [src[x + dx, y + dy] for dx in (-1, 0, 1) for dy in (-1, 0, 1)
                    if (dx or dy) and 0 <= x + dx < 64 and 0 <= y + dy < 64]
            solid = [p for p in near if p[3] > 0 and not green(p)]
            px[x, y] = Counter(solid).most_common(1)[0][0] if len(solid) >= 4 else (0, 0, 0, 0)
            fixed += 1
    sheet.alpha_composite(f, (k * 64, 0))
sheet.save(DST)
print('saved', DST, sheet.size, '-', fixed, 'stray pixels cleaned')

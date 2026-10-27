"""BASEPLATE 2012's background guests, from Mason's drawings:
  tools/sprites/art/baseplate_guest.png         - the guest who spawns in all the time
  tools/sprites/art/baseplate_guest_glitch.png  - the one in fifty that isn't right
They stand on the far plates, so they're drawn half size: each 2x2 block of the drawing becomes one pixel, and a
block with any of the black outline in it stays black (so the 1 px lines don't vanish).
Writes public/assets/stages/baseplate/guest.png and guest_glitch.png (32x32).

  python3 tools/sprites/baseplate_guests.py
"""
import os
from collections import Counter
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
OUT = os.path.join(ROOT, 'public/assets/stages/baseplate')

def half(a, need=1):
    H, W = a.shape[0] // 2, a.shape[1] // 2
    out = np.zeros((H, W, 4), np.uint8)
    for y in range(H):
        for x in range(W):
            blk = a[y * 2:y * 2 + 2, x * 2:x * 2 + 2].reshape(-1, 4)
            solid = [tuple(int(v) for v in p) for p in blk if p[3] > 0]
            if len(solid) < 2: continue
            dark = [p for p in solid if sum(p[:3]) < 120]
            light = [p for p in solid if sum(p[:3]) >= 120]
            out[y, x] = dark[0] if len(dark) >= need or not light else Counter(light).most_common(1)[0][0]
    return out

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    # (the glitched one's cracks are finer: a block needs three black pixels to go black, or it'd be all black)
    for src, dst, need in (('baseplate_guest.png', 'guest.png', 1), ('baseplate_guest_glitch.png', 'guest_glitch.png', 3)):
        a = np.array(Image.open(os.path.join(os.path.dirname(__file__), 'art', src)).convert('RGBA'))
        Image.fromarray(half(a, need)).save(os.path.join(OUT, dst))
    print('guests written')

"""SOUL HEART pickup: Mason's 16-frame drawing (tools/sprites/art/soul_heart.png, a 4x4 grid on black) ->
src/items/soul_heart_sheet.png, one strip of FxF frames. The drawing is a big upscaled image whose pixel grid isn't exact
(about 6 screen px per pixel, drifting a little), so each frame is snapped back to its own pixel grid: the grid's size
and offset are found from where the colour changes, then each grid square becomes one clean pixel (its middle's colour).
Colours are then cut down to one small shared palette, stray single pixels are cleaned off, every frame is lined up
on the heart, and the black is made see-through (the glow stays as stepped, half see-through light).
The sheet is inlined into the game's JS (items.js imports it with ?inline), so it doesn't add a file to the build."""
from PIL import Image
import numpy as np, os

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, 'art', 'soul_heart.png')
OUT = os.path.join(HERE, '..', '..', 'src', 'items', 'soul_heart_sheet.png')
F = 56            # frame size in game pixels
COLORS = 14       # how many colours the whole sheet is cut down to (black counts as one)
GLOW = [0.0, 0.35, 0.6, 0.85, 1.0]   # the see-through steps the glow is snapped to

src = np.array(Image.open(SRC).convert('RGB')).astype(float)
H, W = src.shape[:2]

def grid(prof, lo=5.4, hi=7.2):
    """the pixel size and offset along one axis, from a profile of colour changes"""
    prof = prof - prof.mean(); n = np.arange(len(prof)); best = (0, 6, 0)
    for p in np.arange(lo, hi, 0.01):
        s = (prof * np.exp(2j * np.pi * n / p)).sum()
        if abs(s) > best[0]: best = (abs(s), p, (np.angle(s) / (2 * np.pi)) * p)
    return best[1], best[2] % best[1]     # edges sit at off + k * p

def snap(cell):
    dx = np.abs(np.diff(cell, axis=1)).sum(2).sum(0); dy = np.abs(np.diff(cell, axis=0)).sum(2).sum(1)
    px, ox = grid(dx); py, oy = grid(dy)
    xs = np.arange(ox + 0.5, cell.shape[1] - px, px); ys = np.arange(oy + 0.5, cell.shape[0] - py, py)
    out = np.zeros((len(ys), len(xs), 3))
    for j, y in enumerate(ys):
        for i, x in enumerate(xs):   # the middle of each square (its edges blur)
            blk = cell[int(y + py * 0.3):int(y + py * 0.7) + 1, int(x + px * 0.3):int(x + px * 0.7) + 1]
            out[j, i] = np.median(blk.reshape(-1, 3), 0)
    return out

cw, ch = W / 4, H / 4
cells = [snap(src[round(r * ch):round((r + 1) * ch), round(c * cw):round((c + 1) * cw)]) for r in range(4) for c in range(4)]

# one shared palette (k-means over every frame's pixels)
allpx = np.concatenate([c.reshape(-1, 3) for c in cells])
rng = np.random.default_rng(1)
cent = np.vstack([[0, 0, 0], allpx[rng.choice(len(allpx), COLORS - 1, replace=False)]])
for _ in range(30):
    lab = np.argmin(((allpx[:, None] - cent[None]) ** 2).sum(2), 1)
    for k in range(1, COLORS):
        if (lab == k).any(): cent[k] = allpx[lab == k].mean(0)
    cent[0] = 0

def solid_mask(a):
    return (a[..., 0] > 150) & (a[..., 0] > a[..., 1] * 1.6)

frames, centres = [], []
for c in cells:
    q = cent[np.argmin(((c[..., None, :] - cent[None, None]) ** 2).sum(3), 2)]
    mx = q.max(2)
    solid = solid_mask(q)
    # the face (eyes, mouth) and anything else boxed in by the heart counts as body too
    h, w = solid.shape; outside = np.zeros_like(solid)
    stack = [(y, x) for y in range(h) for x in (0, w - 1)] + [(y, x) for x in range(w) for y in (0, h - 1)]
    while stack:
        y, x = stack.pop()
        if 0 <= y < h and 0 <= x < w and not outside[y, x] and not solid[y, x]:
            outside[y, x] = True; stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    body = ~outside
    # a dark outline round the body where the drawing is dark there
    pad = np.pad(body, 1); near = np.zeros_like(body)
    for oy in (-1, 0, 1):
        for ox in (-1, 0, 1): near |= pad[1 + oy:1 + oy + h, 1 + ox:1 + ox + w]
    ring = near & ~body & (mx < 70)
    # glow: its colour at full brightness, see-through snapped to a few steps
    alpha = np.clip((mx / 255) ** 1.1 * 1.3, 0, 1)
    alpha = np.array(GLOW)[np.argmin(np.abs(alpha[..., None] - np.array(GLOW)), -1)]
    rgb = q * (255 / np.maximum(mx, 1))[..., None]
    alpha[ring] = 1; rgb[ring] = [42, 8, 12]
    alpha[body] = 1; rgb[body] = q[body]
    alpha[(mx < 20) & ~body & ~ring] = 0
    # stray single glow pixels with nothing round them go
    on = alpha > 0; padd = np.pad(on, 1); nb = sum(padd[1 + oy:1 + oy + h, 1 + ox:1 + ox + w] for oy in (-1, 0, 1) for ox in (-1, 0, 1)) - on
    alpha[on & (nb == 0) & ~body & (mx < 200)] = 0
    ys, xs = np.nonzero(solid_mask(q) & body)
    centres.append((ys.mean(), xs.mean()))
    frames.append(np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8))

# line every frame up on the heart (the drawing drifts a pixel or two between frames)
sheet = Image.new('RGBA', (F * 16, F))
for i, (f, (cy, cx)) in enumerate(zip(frames, centres)):
    im = Image.fromarray(f, 'RGBA'); fr = Image.new('RGBA', (F, F))
    fr.paste(im, (round(F / 2 - cx), round(F / 2 - cy)), im)      # (on its own canvas, so nothing spills into the next frame)
    sheet.paste(fr, (i * F, 0))
sheet.save(OUT, optimize=True)
print(OUT, os.path.getsize(OUT), 'bytes', [f.shape[:2] for f in frames])

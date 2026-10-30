"""SOUL HEART pickup: Mason's 16-frame drawing (tools/sprites/art/soul_heart.png, a 4x4 grid on black) ->
src/items/soul_heart_sheet.png, one strip of FxF frames with the black turned see-through (the glow stays as soft light).
The sheet is inlined into the game's JS (items.js imports it with ?inline), so it doesn't add a file to the build."""
from PIL import Image, ImageFilter
import numpy as np, os

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, 'art', 'soul_heart.png')
OUT = os.path.join(HERE, '..', '..', 'src', 'items', 'soul_heart_sheet.png')
F = 56            # frame size in game pixels (the drawing's own pixels are ~6 screen px)

src = Image.open(SRC).convert('RGB')
cw, ch = src.width / 4, src.height / 4
frames = []
for i in range(16):
    r, c = divmod(i, 4)
    cell = src.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch))).resize((F, F), Image.BOX)
    a = np.array(cell).astype(float)
    mx = a.max(2)
    # the heart and its tendrils: strong red -> solid
    solid = (a[..., 0] > 150) & (a[..., 0] > a[..., 1] * 1.6)
    # anything enclosed by them (the face: eyes and mouth) is solid too - flood the outside from the frame's edge
    outside = np.zeros_like(solid); stack = [(y, x) for y in range(F) for x in (0, F - 1)] + [(y, x) for x in range(F) for y in (0, F - 1)]
    while stack:
        y, x = stack.pop()
        if 0 <= y < F and 0 <= x < F and not outside[y, x] and not solid[y, x]:
            outside[y, x] = True; stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    body = ~outside
    # a dark outline one pixel round them, only where the drawing is dark there (not where it glows)
    ring = (np.array(Image.fromarray((body * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))) > 0) & ~body & (mx < 70)
    # the glow and sparkles: their colour at full brightness, as see-through as they are dim
    alpha = np.clip((mx / 255) ** 1.1 * 1.3, 0, 0.92)
    rgb = a * (255 / np.maximum(mx, 1))[..., None]
    alpha[ring] = 1; rgb[ring] = [42, 8, 12]
    alpha[body] = 1; rgb[body] = a[body]
    alpha[(mx < 16) & ~body & ~ring] = 0
    out = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)
    frames.append(Image.fromarray(out, 'RGBA'))

sheet = Image.new('RGBA', (F * 16, F))
for i, f in enumerate(frames): sheet.paste(f, (i * F, 0))
sheet.save(OUT, optimize=True)
print(OUT, os.path.getsize(OUT), 'bytes')

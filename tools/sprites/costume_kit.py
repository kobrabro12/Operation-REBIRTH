"""Helpers for costumes that are more than a recolour (the shop costumes, tools/sprites/shop_costumes.py):

  recolor(a, groups, rules)   the game's own costume recolour (src/fighters/skins.js recolorFn), ported so a
                              costume's colours can be baked into its own sheets
  stamp(layer, x, y, rows, pal)
                              draws a little pixel picture into a layer: rows of characters, each one a colour
                              from pal ('.' or ' ' = leave alone, '-' = erase)
  graft(frame, orig, new, extras)
                              puts a costume's changes onto one of Mason's hand-made frames (idle, run...):
                              finds where each body part sits in that frame (by matching its pixels), then
                              copies the costume's changed and added pixels there. Parts it can't find are
                              just recoloured.
  rig_from(layers, order, parent, ...)
                              a puppet (tools/sprites/puppet.py) from part layers, with extra parts (crowns,
                              collars, halos...) riding on a parent part.
"""
import colorsys
import numpy as np
from puppet import Part, Rig

def hexrgb(c): return ((c >> 16) & 255, (c >> 8) & 255, c & 255)

# ------------------------------------------------------------------ recolour (as skins.js)
def _rgb2hsv(r, g, b):
    r, g, b = r / 255, g / 255, b / 255
    mx, mn = max(r, g, b), min(r, g, b); d = mx - mn
    h = 0
    if d:
        if mx == r: h = ((g - b) / d) % 6
        elif mx == g: h = (b - r) / d + 2
        else: h = (r - g) / d + 4
    return ((h * 60 + 360) % 360, d / mx if mx else 0, mx)

def _hsv2rgb(h, s, v):
    c = v * s; x = c * (1 - abs(((h / 60) % 2) - 1)); m = v - c
    r, g, b = ((c, x, 0) if h < 60 else (x, c, 0) if h < 120 else (0, c, x) if h < 180 else (0, x, c) if h < 240 else (x, 0, c) if h < 300 else (c, 0, x))
    return (round((r + m) * 255), round((g + m) * 255), round((b + m) * 255))

def _inr(v, r): return r is None or r[0] <= v <= r[1]

def color_fn(groups, rules):
    cache = {}
    def f(rgb):
        if rgb in cache: return cache[rgb]
        out = rgb; h, s, v = _rgb2hsv(*rgb)
        for name, g in groups.items():
            if not (_inr(h, g.get('h')) and _inr(s, g.get('s')) and _inr(v, g.get('v'))): continue
            rule = rules.get(name)
            if rule:
                nh = rule['hue'] if 'hue' in rule else (h + rule['to'] - g['center'] + 720) % 360 if 'to' in rule else h
                ns = min(1, max(0, s * rule.get('sat', 1) + rule.get('satAdd', 0)))
                nv = min(1, v * rule.get('val', 1))
                out = _hsv2rgb(nh, ns, nv)
            break
        cache[rgb] = out
        return out
    return f

def recolor(a, groups, rules, fn=None):
    fn = fn or color_fn(groups, rules)
    out = a.copy()
    op = a[..., 3] > 0
    if not op.any(): return out
    cols = np.unique(a[op][:, :3], axis=0)
    for c in cols:
        n = fn(tuple(int(v) for v in c))
        if n != tuple(c):
            m = op & np.all(a[..., :3] == c, -1)
            out[m, :3] = n
    return out

# ------------------------------------------------------------------ drawing
def stamp(layer, x0, y0, rows, pal, only_empty=False, only_full=False):
    H, W = layer.shape[:2]
    for r, row in enumerate(rows):
        for c, ch in enumerate(row):
            if ch in '. ': continue
            x, y = x0 + c, y0 + r
            if not (0 <= x < W and 0 <= y < H): continue
            if only_empty and layer[y, x, 3]: continue
            if only_full and not layer[y, x, 3]: continue
            if ch == '-': layer[y, x] = 0; continue
            col = pal[ch]
            layer[y, x] = (*(hexrgb(col) if isinstance(col, int) else col), 255)

def put(layer, x, y, col):
    H, W = layer.shape[:2]
    if 0 <= x < W and 0 <= y < H: layer[y, x] = (*(hexrgb(col) if isinstance(col, int) else col), 255)

def shade_of(rgb):
    """0..1 brightness of a colour (the V of HSV)."""
    return max(rgb[:3]) / 255

def ramp_pick(ramp, v, lo=0.1, hi=0.9):
    k = min(0.999, max(0.0, (v - lo) / (hi - lo)))
    return ramp[int(k * len(ramp))]

# ------------------------------------------------------------------ puppets
def rig_from(layers, order, parent, feet, canvas, offset, follow=None, variants=None, upright=None, extras=()):
    """extras: (name, layer, parent, pivot, z) - z is a float between the existing parts' z (their index in order)."""
    follow, variants, upright = follow or {}, variants or {}, upright or {}
    parts = []
    for z, name in enumerate(order):
        par, pivot = parent[name]
        dr, sw = follow.get(name, (0, 0))
        var = variants.get(name) or [layers[name]]
        mask = np.any([v[..., 3] > 0 for v in var], axis=0)
        parts.append(Part(name, mask, pivot, par, z=z, variants=var, upright=upright.get(name, 0), drag=dr, sway=sw))
    for name, lay, par, pivot, z in extras:
        dr, sw = follow.get(par, (0, 0))
        parts.append(Part(name, lay[..., 3] > 0, pivot, par, z=z, variants=[lay], drag=dr, sway=sw))
    base = np.zeros_like(next(iter(layers.values())))
    for p in sorted(parts, key=lambda p: p.z):
        v = p.variants[0]; m = v[..., 3] > 0; base[m] = v[m]
    small = Rig(base, parts, (64, 64), (0, 0), feet)
    big = Rig(base, parts, canvas, offset, feet)
    return small, big

# ------------------------------------------------------------------ grafting onto hand-made frames
def _shift(a, dx, dy):
    out = np.zeros_like(a); H, W = a.shape[:2]
    xs, xd = (0, dx) if dx >= 0 else (-dx, 0); ys, yd = (0, dy) if dy >= 0 else (-dy, 0)
    w, h = W - abs(dx), H - abs(dy)
    out[yd:yd + h, xd:xd + w] = a[ys:ys + h, xs:xs + w]
    return out

def find(frame, layer, search=6, centre=(0, 0)):
    """Where the part `layer` sits in `frame`: (dx, dy, how many of its pixels matched)."""
    m = layer[..., 3] > 0
    best = (0, 0, -1)
    for dy in range(centre[1] - search, centre[1] + search + 1):
        for dx in range(centre[0] - search, centre[0] + search + 1):
            sh = _shift(layer, dx, dy); sm = sh[..., 3] > 0
            score = int(np.sum(sm & np.all(frame == sh, -1)))
            if score > best[2] or (score == best[2] and abs(dx) + abs(dy) < abs(best[0]) + abs(best[1])): best = (dx, dy, score)
    return best

def graft(frame, orig, new, recol, extras=(), parts=None, search=6, need=0.3, behind=(), paint=None):
    """frame: one of Mason's frames (H, W, 4). orig / new: the part layers before and after the costume's
    changes (new already in the costume's colours). recol: the costume's recolour of a whole frame.
    extras: (name, layer, parent, ...) added parts placed with their parent. behind: names of parts / extras
    whose new pixels only go where the frame is empty (they sit behind the body)."""
    out = recol(frame)
    if paint: paint(frame, out)                    # patterns painted straight onto the frame (by colour, not by part)
    where = {}
    for name in (parts or orig):
        O = orig[name]; n = int(np.sum(O[..., 3] > 0))
        if not n: continue
        dx, dy, score = find(frame, O, search)
        if score < need * n: continue
        where[name] = (dx, dy)
        N = new[name]; R = recol(O)
        changed = np.any(N != R, -1) & ((N[..., 3] > 0) | (O[..., 3] > 0))
        ys, xs = np.nonzero(changed)
        H, W = frame.shape[:2]
        for y, x in zip(ys, xs):
            ty, tx = y + dy, x + dx
            if not (0 <= tx < W and 0 <= ty < H): continue
            if O[y, x, 3]:
                if np.array_equal(frame[ty, tx], O[y, x]): out[ty, tx] = N[y, x]      # (only where that bit of the part shows)
            elif name in behind:
                if frame[ty, tx, 3] == 0: out[ty, tx] = N[y, x]
            else: out[ty, tx] = N[y, x]
    for ex in extras:
        name, lay, par = ex[0], ex[1], ex[2]
        if par not in where: continue
        dx, dy = where[par]
        ys, xs = np.nonzero(lay[..., 3] > 0)
        H, W = frame.shape[:2]
        for y, x in zip(ys, xs):
            ty, tx = y + dy, x + dx
            if not (0 <= tx < W and 0 <= ty < H): continue
            if name in behind and frame[ty, tx, 3]: continue
            out[ty, tx] = lay[y, x]
    return out

def strip_frames(img, fw, fh):
    a = np.array(img.convert('RGBA'))
    return [a[:fh, i * fw:(i + 1) * fw] for i in range(a.shape[1] // fw)]

def save_strip(frames, path, fw, fh):
    from PIL import Image
    out = np.zeros((fh, fw * len(frames), 4), np.uint8)
    for i, f in enumerate(frames): out[:, i * fw:(i + 1) * fw] = f
    Image.fromarray(out, 'RGBA').save(path)

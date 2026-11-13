"""The TROPHY HALL's paintings: ten pixel-art pictures of the fighters - meeting, fighting, partying - and moments
from their lore, hung in the gold frames along the hall (src/scenes/TrophyHallScene.js, list `PAINTINGS` in
src/data/trophyHall.js).

Each painting is 160x112 px, composed here from the game's own sprite frames (idle / run / jump strips and moves
sheets, so the fighters look exactly like themselves) over backgrounds painted in code: skies in dithered bands
(a 4x4 Bayer pattern, like old pixel art), silhouettes, light rays, speed lines and impact bursts, glows, then a
colour grade per picture and a soft vignette. Fighters get a 1 px rim of the scene's light so they sit in the
picture instead of on it.

Run:  python3 tools/sprites/hall_paintings.py [--preview FILE]   -> public/assets/hall/paintings.png (5 to a row)
"""
import os, re, sys, json, math
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
FIG = os.path.join(ROOT, 'public/assets/fighters')
OUT = os.path.join(ROOT, 'public/assets/hall/paintings.png')
W, H = 160, 112
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0
rng = np.random.default_rng(64)


def hexc(c): return ((c >> 16) & 255, (c >> 8) & 255, c & 255)


# ------------------------------------------------------------------ sprites from the game's sheets
_sheets = {}
def sheet(path):
    if path not in _sheets: _sheets[path] = Image.open(os.path.join(FIG, path)).convert('RGBA')
    return _sheets[path]

def strip(path, i, fw=64, fh=64):
    """Frame i of a strip (idle / run / jump ...)."""
    s = sheet(path); n = s.width // fw
    i %= n
    return s.crop((i * fw, 0, i * fw + fw, fh))

MOVES = {  # fighter -> (moves table file, export name, sheet, frame w, h)
    'ss': ('ssMoves.js', 'soul-summoner/moves_sheet.png', 112, 104), 'wake': ('mwMoves.js', 'mr-wake/moves_sheet.png', 176, 120),
    'hk': ('hkMoves.js', 'hero-knight/moves_sheet.png', 180, 140), 'nu': ('nuMoves.js', 'nu/moves_sheet.png', 112, 104),
    'aero': ('aeroMoves.js', 'aero/moves_sheet.png', 112, 104), 'dv': ('dvMoves.js', 'devoted/moves_sheet.png', 112, 104),
    'wow': ('wowMoves.js', 'what-once-was/moves_sheet.png', 112, 104), 'ls': ('lsMoves.js', 'last-seen/moves_sheet.png', 112, 104),
    'seen': ('lsWrongMoves.js', 'last-seen/wrong/moves_sheet.png', 112, 104), 'nusurf': ('nuMoves.js', 'nu/surf/moves_sheet.png', 112, 104),
    'king': ('aeroMoves.js', 'aero/king/moves_sheet.png', 112, 104),
    'pr': ('prMoves.js', 'presto/moves_sheet.png', 112, 104), 'ch': ('chMoves.js', 'chef/moves_sheet.png', 112, 104),
}
_tables = {}
def move(who, name, k):
    """Frame of a move, k = 0..1 through it."""
    js, path, fw, fh = MOVES[who]
    if js not in _tables:
        src = open(os.path.join(ROOT, 'src/fighters', js)).read()
        body = src[src.index('{', src.index('export const')):]
        depth = 0
        for j, ch in enumerate(body):
            depth += ch == '{'; depth -= ch == '}'
            if depth == 0: body = body[:j + 1]; break
        body = re.sub(r'(\w+)\s*:', r'"\1":', body.replace("'", '"'))
        body = re.sub(r'""(\w+)"":', r'"\1":', body)
        body = re.sub(r',\s*([}\]])', r'\1', body)
        _tables[js] = json.loads(body)
    first, count = _tables[js][name][:2]
    s = sheet(path); cols = s.width // fw; i = first + min(count - 1, int(k * count))
    return s.crop(((i % cols) * fw, (i // cols) * fh, (i % cols) * fw + fw, (i // cols) * fh + fh))

def trim(im):
    bb = im.getbbox()
    return im.crop(bb) if bb else im

def tint(im, rgb, k):
    """Pulls a sprite's colours toward the scene's light (k 0-1), keeping its alpha."""
    a = np.array(im).astype(float); c = np.array(rgb, float)
    a[..., :3] = a[..., :3] * (1 - k) + c * k
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))

def rim(im, rgb, side=-1):
    """A 1 px edge of light on one side of a sprite (the side facing the scene's light)."""
    a = np.array(im); al = a[..., 3] > 0
    sh = np.zeros_like(al)
    if side < 0: sh[:, 1:] = al[:, 1:] & ~al[:, :-1]
    else: sh[:, :-1] = al[:, :-1] & ~al[:, 1:]
    top = np.zeros_like(al); top[1:] = al[1:] & ~al[:-1]
    m = sh | top
    b = a.copy(); b[m, :3] = (a[m, :3] * 0.4 + np.array(rgb) * 0.6).astype(np.uint8)
    return Image.fromarray(b)

def put(cv, im, x, y, flip=False, scale=1, light=None, side=-1, shade=None, alpha=1.0):
    """Stands a sprite on the canvas with its feet (bottom middle of its pixels) at x, y."""
    im = trim(im)
    if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    if scale != 1: im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.NEAREST)
    if shade: im = tint(im, shade[0], shade[1])
    if light: im = rim(im, light, side)
    if alpha < 1: a = np.array(im); a[..., 3] = (a[..., 3] * alpha).astype(np.uint8); im = Image.fromarray(a)
    cv.alpha_composite(im, (int(x - im.width / 2), int(y - im.height)))
    return im

def silhouette(im, rgb):
    a = np.array(trim(im)); a[..., :3] = rgb; return Image.fromarray(a)


# ------------------------------------------------------------------ painting the backgrounds (numpy RGB, then a PIL canvas)
def bands(cols, frac):
    """Dithered colour bands: frac (0-1 array) picks between consecutive colours of cols with the Bayer pattern."""
    cols = np.array([hexc(c) for c in cols], float); n = len(cols) - 1
    v = np.clip(frac, 0, 0.9999) * n; i = np.floor(v).astype(int); f = v - i
    hh, ww = frac.shape
    th = np.tile(BAYER, (hh // 4 + 1, ww // 4 + 1))[:hh, :ww]
    j = np.where(f > th, np.minimum(i + 1, n), i)
    return cols[j]

def sky(top, *mid):
    yy = np.repeat(np.linspace(0, 1, H)[:, None], W, 1)
    return bands([top, *mid], yy)

def radial(cx, cy, r, cols, img, squash=1.0, strength=1.0):
    """A dithered round glow (cols from the middle out) painted over img."""
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt((xx - cx) ** 2 + ((yy - cy) / squash) ** 2) / r
    m = d < 1
    c = bands(cols, d)
    th = np.tile(BAYER, (H // 4 + 1, W // 4 + 1))[:H, :W]
    keep = m & ((1 - d) * strength * 1.4 > th * 0.6)
    img[keep] = c[keep]
    return img

def ridge(img, base, amp, col, seed, rough=0.08, step=1):
    """A mountain / city / treeline silhouette along the bottom."""
    r = np.random.default_rng(seed); h = base; ys = []
    for x in range(W):
        if x % step == 0: h += r.normal(0, amp * rough * 4); h = h * 0.92 + base * 0.08
        ys.append(int(h))
    for x, y in enumerate(ys): img[max(0, y):, x] = hexc(col)
    return img

def to_im(arr): return Image.fromarray(arr.clip(0, 255).astype(np.uint8)).convert('RGBA')

def stars(img, n, seed, cols=(0xffffff, 0xc8d8ff), ymax=0.6):
    r = np.random.default_rng(seed)
    for _ in range(n):
        x, y = r.integers(0, W), r.integers(0, int(H * ymax)); img[y, x] = hexc(cols[r.integers(0, len(cols))])
    return img

def draw(cv): return ImageDraw.Draw(cv)

def rays(cv, cx, cy, n, col, alpha, spread=1.0, start=0.0, length=260):
    """Light rays / speed lines fanning out from a point (drawn into an overlay and blended)."""
    ov = Image.new('RGBA', cv.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for i in range(n):
        a = start + i * 2 * math.pi / n * spread; w = 0.06
        d.polygon([(cx, cy), (cx + math.cos(a - w) * length, cy + math.sin(a - w) * length), (cx + math.cos(a + w) * length, cy + math.sin(a + w) * length)], fill=hexc(col) + (alpha,))
    cv.alpha_composite(ov)

def speed(cv, cx, cy, col, n=30, alpha=120, r0=40, seed=1):
    """Manga speed lines rushing in toward a point."""
    ov = Image.new('RGBA', cv.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov); r = np.random.default_rng(seed)
    for _ in range(n):
        a = r.uniform(0, 2 * math.pi); r1 = r0 + r.uniform(0, 30); r2 = 200
        d.line([(cx + math.cos(a) * r1, cy + math.sin(a) * r1), (cx + math.cos(a) * r2, cy + math.sin(a) * r2)], fill=hexc(col) + (alpha,), width=1)
    cv.alpha_composite(ov)

def burst(cv, cx, cy, r, col, col2=None, n=10, alpha=255):
    """A comic impact star."""
    pts = []
    for i in range(n * 2):
        a = i * math.pi / n; rr = r if i % 2 == 0 else r * 0.45
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    ov = Image.new('RGBA', cv.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    d.polygon(pts, fill=hexc(col) + (alpha,))
    if col2 is not None: d.polygon([(cx + (x - cx) * 0.55, cy + (y - cy) * 0.55) for x, y in pts], fill=hexc(col2) + (alpha,))
    cv.alpha_composite(ov)

def glow(cv, cx, cy, r, col, alpha=90):
    ov = Image.new('RGBA', cv.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for i in range(5, 0, -1):
        rr = r * i / 5; d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=hexc(col) + (int(alpha / 5),))
    cv.alpha_composite(ov)

def sparkle(cv, x, y, col, s=2):
    d = draw(cv); c = hexc(col) + (255,)
    d.line([(x - s, y), (x + s, y)], fill=c); d.line([(x, y - s), (x, y + s)], fill=c); d.point((x, y), fill=(255, 255, 255, 255))

def grade(cv, tintc, k=0.12, vig=0.35, contrast=1.08):
    """The finish: a colour wash toward the picture's mood, a little contrast, a soft vignette, a faint canvas grain."""
    a = np.array(cv.convert('RGB')).astype(float)
    a = (a - 128) * contrast + 128
    a = a * (1 - k) + np.array(hexc(tintc), float) * k
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    a *= (1 - vig * np.clip(d - 0.55, 0, 1) ** 1.5)[..., None]
    a += rng.normal(0, 3, a.shape[:2])[..., None]
    return Image.fromarray(a.clip(0, 255).astype(np.uint8)).convert('RGBA')


# ------------------------------------------------------------------ the ten paintings
def p_gates():
    """GATES OF THE SANCTUM: Soul Summoner holds the gate alone, blue fire raised, the souls of his fallen friends rising behind him."""
    img = sky(0x2a0a3a, 0x8a1a3a, 0xff6a2a, 0xffc86a)
    img = radial(80, 74, 40, [0xfff2b0, 0xffc86a], img, 0.8)
    img = ridge(img, 80, 8, 0x3a0a2a, 3, step=2)
    cv = to_im(img); d = draw(cv)
    for gx in (18, 142):                                                          # the gate's two towers
        d.rectangle((gx - 12, 34, gx + 12, 112), fill=hexc(0x24081c)); d.rectangle((gx - 14, 30, gx + 14, 36), fill=hexc(0x24081c))
        for k in range(-12, 13, 6): d.rectangle((gx + k - 2, 26, gx + k + 1, 30), fill=hexc(0x24081c))
        d.rectangle((gx - 3, 48, gx + 2, 56), fill=hexc(0xffc86a))
    d.arc((18, 20, 142, 120), 200, 340, fill=hexc(0x24081c), width=5)
    for i, (x, y) in enumerate(((44, 52), (62, 36), (98, 36), (116, 52), (80, 26))):   # the souls of the fallen, rising behind him
        sm = trim(strip('soul-summoner/soul_minion_sheet.png', i * 2, 60, 68)); sm = sm.resize((sm.width // 2, sm.height // 2), Image.NEAREST)
        glow(cv, x, y - 8, 10, 0x7ad0ff, 80); put(cv, sm, x, y, flip=i > 2, alpha=0.8)
    d = draw(cv)
    d.rectangle((0, 100, W, H), fill=hexc(0x1a0612))
    for i in range(9):                                                            # the horde coming for the gate, in silhouette
        src = ['what-once-was/menu_idle_sheet.png', 'last-seen/wrong/idle_sheet.png', 'devoted/drowned/idle_sheet.png'][i % 3]
        x = 4 + i * 6 if i < 5 else 156 - (i - 5) * 7
        put(cv, silhouette(strip(src, i * 3), (26, 6, 20)), x, 114, flip=i < 5)
    glow(cv, 80, 70, 22, 0x7ad0ff, 110)
    put(cv, move('ss', 'fireball', 0.55), 80, 104, light=hexc(0xffd890), side=1)
    rays(cv, 80, 74, 16, 0xffe8b0, 26, start=0.1)
    for x, y in ((50, 30), (112, 22), (126, 44), (34, 50)): sparkle(cv, x, y, 0x9ae8ff)
    return grade(cv, 0xff8a40, 0.08)

def p_star():
    """THE NIGHT THE STAR FELL: a purple star streaks into the black water under Gravemoon Bridge - and something polite climbs out."""
    img = sky(0x05040e, 0x120a2a, 0x2a1a4a)
    img = stars(img, 70, 5)
    img = radial(124, 22, 20, [0xffffff, 0xe0c8ff, 0x8a5ad8], img, 1.0)
    cv = to_im(img); d = draw(cv)
    d.line([(124, 22), (96, 60)], fill=hexc(0xc89aff), width=3); d.line([(124, 22), (98, 58)], fill=(255, 255, 255), width=1)   # the star falling
    for i in range(6): d.point((128 + i * 3, 16 - i * 2), fill=hexc(0xc89aff))
    d.rectangle((0, 56, W, 62), fill=hexc(0x1a1424))                                # the bridge
    for x in range(0, W, 26): d.rectangle((x + 4, 62, x + 9, 80), fill=hexc(0x1a1424)); d.arc((x + 6, 56, x + 32, 92), 180, 360, fill=hexc(0x1a1424), width=3)
    for x in range(0, W, 12): d.rectangle((x, 50, x + 1, 56), fill=hexc(0x1a1424))
    d.rectangle((0, 49, W, 50), fill=hexc(0x1a1424))
    d.ellipse((140, 42, 150, 52), fill=hexc(0xffd27a)); glow(cv, 145, 47, 12, 0xffd27a, 70)   # a lamp on the bridge
    water = np.array(cv)
    for y in range(80, H):                                                          # the black water, with the star's light rippling on it
        for x in range(W):
            water[y, x, :3] = (8, 6, 20) if (x + y * 3) % 7 else (24, 16, 48)
    cv = Image.fromarray(water); d = draw(cv)
    for i in range(10): w = 30 - i * 2; d.line([(96 - w, 84 + i * 3), (96 + w, 84 + i * 3)], fill=hexc(0x8a5ad8 if i % 2 else 0xc89aff))
    wake = trim(move('wake', 'upb', 0.3)); wake = wake.crop((0, 0, wake.width, int(wake.height * 0.8)))
    glow(cv, 96, 66, 30, 0xb07aff, 120)
    put(cv, wake, 96, 90, light=hexc(0xc89aff), side=1)
    d = draw(cv)
    for i in range(14): a = i * 0.45; d.point((96 + math.cos(a) * 26, 88 + math.sin(a) * 4), fill=(255, 255, 255))
    # a little boat with a fisherman, staring
    d.polygon([(10, 92), (40, 92), (36, 98), (14, 98)], fill=hexc(0x3a2414)); d.rectangle((22, 82, 26, 92), fill=hexc(0x2a1a10)); d.ellipse((21, 78, 27, 84), fill=hexc(0x2a1a10))
    d.text((30, 70), '!', fill=(255, 255, 255))
    return grade(cv, 0x6a3aa8, 0.1)

def p_tea():
    """TEA ON THE ROCKS: Mr Wake, ever the host, pours tea for Soul Summoner and Lacy on a rock floating over the clouds. Lacy keeps her sword close."""
    img = sky(0x3a8ae8, 0x7ac0ff, 0xc8eaff)
    cv = to_im(img); d = draw(cv)
    for cx, cy, r in ((20, 92, 18), (50, 98, 22), (100, 96, 24), (140, 92, 20), (130, 30, 10), (24, 26, 8)):   # clouds
        d.ellipse((cx - r * 1.6, cy - r * 0.6, cx + r * 1.6, cy + r * 0.6), fill=(255, 255, 255)); d.ellipse((cx - r, cy - r, cx + r, cy + r * 0.3), fill=(255, 255, 255))
    d.ellipse((128, 4, 152, 28), fill=hexc(0xfff2a0)); glow(cv, 140, 16, 22, 0xfff2a0, 70)
    d.polygon([(26, 80), (134, 80), (118, 96), (92, 108), (60, 104), (36, 94)], fill=hexc(0x7a6a5a))   # the floating rock
    d.polygon([(26, 80), (134, 80), (130, 84), (30, 84)], fill=hexc(0x5ac85a)); d.line([(26, 80), (134, 80)], fill=hexc(0x8af08a))
    put(cv, strip('mr-wake/idle_sheet.png', 6), 80, 78, light=(255, 255, 240))
    put(cv, strip('soul-summoner/idle_sheet.png', 4), 44, 80, light=(255, 255, 240), side=1)
    put(cv, strip('hero-knight/idle_sheet.png', 3, 150, 90), 120, 80, flip=True, light=(255, 255, 240))
    d = draw(cv)
    d.rectangle((58, 62, 102, 66), fill=hexc(0xf0f0f0)); d.rectangle((58, 66, 102, 70), fill=hexc(0xff8aa8))   # the table, a pink cloth
    d.rectangle((64, 70, 66, 80), fill=hexc(0x8a5a3a)); d.rectangle((94, 70, 96, 80), fill=hexc(0x8a5a3a))
    for cx in (64, 96): d.rectangle((cx - 2, 58, cx + 2, 62), fill=(255, 255, 255)); d.point((cx + 3, 60), fill=(255, 255, 255))
    d.ellipse((70, 50, 82, 60), fill=hexc(0xf0f0f0)); d.rectangle((74, 48, 78, 50), fill=hexc(0xf0f0f0)); d.line([(81, 54), (88, 50)], fill=hexc(0xf0f0f0), width=2)   # the teapot, pouring
    d.line([(88, 50), (95, 57)], fill=hexc(0xb07a3a), width=1)
    d.rectangle((72, 54, 80, 55), fill=hexc(0x6ab0ff))
    for i, (x, y) in enumerate(((60, 52), (64, 46), (100, 40))): d.ellipse((x, y, x + 3, y + 3), outline=(255, 255, 255))   # little steam / hearts
    d.text((116, 44), '...', fill=hexc(0x3a3a5a))
    return grade(cv, 0xfff0d0, 0.06, vig=0.2)

def p_burned():
    """THE NIGHT THE CASTLE BURNED: Lacy walks out of the fire with the order's last sword. Her hair turned white that night."""
    img = sky(0x14040a, 0x5a0a10, 0xc82a10, 0xff8a2a)
    cv = to_im(img); d = draw(cv)
    for x, w, h in ((10, 16, 60), (30, 22, 46), (54, 30, 70), (84, 18, 56), (100, 26, 78), (126, 20, 50), (146, 16, 62)):   # the castle's burning towers
        d.rectangle((x, 112 - h, x + w, 112), fill=hexc(0x1a0408))
        for k in range(0, w, 5): d.rectangle((x + k, 112 - h - 4, x + k + 2, 112 - h), fill=hexc(0x1a0408))
        d.rectangle((x + w // 2 - 1, 112 - h + 10, x + w // 2 + 1, 112 - h + 14), fill=hexc(0xffd040))
    arr = np.array(cv)
    for _ in range(90):                                                             # flames licking up the towers
        x = rng.integers(0, W); y0 = rng.integers(70, 100); h = rng.integers(4, 22)
        for k in range(h): arr[max(0, y0 - k), min(W - 1, x + int(math.sin(k * 0.6 + x) * 1.5)), :3] = hexc([0xff3a10, 0xff8a2a, 0xffd040][min(2, k * 3 // h)])
    cv = Image.fromarray(arr); d = draw(cv)
    d.rectangle((0, 98, W, H), fill=hexc(0x0e0206))
    glow(cv, 80, 70, 40, 0xff8a2a, 60)
    put(cv, strip('hero-knight/run_sheet.png', 2, 150, 90), 80, 104, light=hexc(0xffb050), side=-1, shade=((40, 10, 10), 0.25))
    for _ in range(40):                                                             # embers
        x, y = rng.integers(0, W), rng.integers(0, 100); cv.putpixel((int(x), int(y)), hexc([0xffd040, 0xff8a2a, 0xffffff][rng.integers(0, 3)]) + (255,))
    return grade(cv, 0xff4a20, 0.1, vig=0.5)

def p_encore():
    """ENCORE: NU leaps off the amps mid-solo; the whole roster is in the crowd - even Mr Wake is waving his staff."""
    img = sky(0x0a0414, 0x1a0a3a, 0x3a0a4a)
    cv = to_im(img); d = draw(cv)
    for i, (x, c) in enumerate(((20, 0xff3ad8), (60, 0x20e8ff), (100, 0xffe848), (140, 0xff3a3a))):   # stage lights
        rays(cv, x, 0, 1, c, 60, start=math.pi / 2 + (i - 1.5) * 0.18, length=120)
    d = draw(cv)
    d.rectangle((0, 70, W, 76), fill=hexc(0x2a1a2a))                                # the stage
    for x in (8, 126):                                                              # amp stacks
        d.rectangle((x, 38, x + 26, 70), fill=hexc(0x141014)); d.rectangle((x + 2, 40, x + 24, 52), fill=hexc(0x2a2a2a)); d.rectangle((x + 2, 54, x + 24, 68), fill=hexc(0x2a2a2a))
        for cx, cy in ((x + 13, 46), (x + 13, 61)): d.ellipse((cx - 5, cy - 5, cx + 5, cy + 5), fill=hexc(0x080808))
    speed(cv, 80, 40, 0xffffff, 40, 70, 30, 3)
    put(cv, move('nu', 'usmash', 0.55), 80, 70, light=hexc(0xff8ad8), side=1)
    burst(cv, 104, 28, 9, 0xffe848, 0xffffff, 8)
    d = draw(cv)
    for i in range(26):                                                             # confetti
        x, y = rng.integers(0, W), rng.integers(0, 70); d.rectangle((x, y, x + 1, y), fill=hexc([0xff3ad8, 0x20e8ff, 0xffe848, 0x5aff8a][i % 4]))
    crowd = [('soul-summoner/idle_sheet.png', 3, 64, 64), ('aero/idle_sheet.png', 7, 64, 64), ('mr-wake/idle_sheet.png', 2, 64, 64),
             ('last-seen/idle_sheet.png', 5, 64, 64), ('hero-knight/idle_sheet.png', 1, 150, 90), ('devoted/idle_sheet.png', 9, 64, 64), ('what-once-was/menu_idle_sheet.png', 4, 64, 64)]
    for i, (pth, f, fw, fh) in enumerate(crowd):                                    # the crowd, from behind, lit by the stage
        put(cv, silhouette(strip(pth, f, fw, fh), (14, 8, 22)), 12 + i * 23, 112 + (i % 2) * 6, flip=i % 2 == 1)
    d = draw(cv)
    for x in (30, 58, 90, 122, 146): d.line([(x, 92), (x - 2, 84)], fill=hexc(0x0e0816), width=2); d.rectangle((x - 3, 82, x - 1, 84), fill=hexc(0x0e0816))   # hands up
    return grade(cv, 0xb03ad8, 0.08)

def p_purge():
    """PURGE.EXE: AERO in his meadow, clicking every pop-up shut while his fishbowl bubbles - the infection never stood a chance."""
    img = sky(0x2a8af0, 0x7ad0ff, 0xd8f4ff)
    img = radial(130, 18, 24, [0xffffff, 0xfff6c8], img, 1.0)
    img = ridge(img, 86, 3, 0x48b848, 9, step=3)
    cv = to_im(img); d = draw(cv)
    d.rectangle((0, 94, W, H), fill=hexc(0x3aa83a))
    for x in range(0, W, 7): d.line([(x, 94), (x + 2, 90)], fill=hexc(0x6ae86a))
    for i, (x, y, w, h) in enumerate(((8, 14, 38, 26), (112, 40, 40, 24), (20, 52, 32, 20), (60, 6, 36, 22), (118, 70, 30, 18))):   # the pop-ups
        sh = (x + 2, y + 2, x + w + 2, y + h + 2); d.rectangle(sh, fill=(0, 0, 0, 255) if False else hexc(0x1a3a6a))
        d.rectangle((x, y, x + w, y + h), fill=hexc(0xe8e8f0), outline=hexc(0x3a3a5a)); d.rectangle((x, y, x + w, y + 5), fill=hexc(0x2a5ae8))
        d.rectangle((x + w - 5, y + 1, x + w - 1, y + 4), fill=hexc(0xe83a3a)); d.text((x + 3, y + 7), ['ERROR', 'VIRUS', 'WIN!!', '404', 'OK?'][i], fill=hexc(0xe83a3a) if i % 2 == 0 else hexc(0x2a2a5a))
        if i in (1, 3): burst(cv, x + w // 2, y + h // 2, 12, 0xffe848, 0xffffff, 7, 200); d = draw(cv)
    put(cv, move('aero', 'fsmash', 0.5), 70, 96, light=(255, 255, 255), side=1)
    for i in range(10): sparkle(cv, int(rng.integers(40, 120)), int(rng.integers(20, 80)), 0x9af0ff, 1)
    return grade(cv, 0xc8f0ff, 0.06, vig=0.2)

def p_level0():
    """LEVEL 0: down the endless yellow halls, WHAT ONCE WAS has seen her. Rosemary runs."""
    img = np.zeros((H, W, 3))
    vx, vy = 112, 50
    yy, xx = np.mgrid[0:H, 0:W]
    img[:] = hexc(0xd8c870)                                                         # the yellow wallpaper
    stripes = ((xx // 3) % 2 == 0); img[stripes] = hexc(0xc8b860)
    floor = yy > vy + (np.abs(xx - vx) * 0.55); img[floor] = bands([0x8a7a40, 0x6a5a30], (yy[floor] - vy) / (H - vy))[..., :] if False else hexc(0x8a7a40)
    ceil = yy < vy - (np.abs(xx - vx) * 0.45); img[ceil] = hexc(0xe8e0b0)
    cv = to_im(img); d = draw(cv)
    for k in range(1, 8):                                                           # the corridor's frames, receding
        s = 1 / (k * 0.55); w, h = 120 * s, 90 * s
        d.rectangle((vx - w, vy - h * 0.6, vx + w * 0.4, vy + h * 0.7), outline=hexc(0xa89a50))
    for k in range(1, 6): s = 1 / (k * 0.6); d.rectangle((vx - 40 * s, vy - 50 * s - 2, vx + 10 * s, vy - 50 * s), fill=hexc(0xfffff0))   # ceiling lights
    d.rectangle((vx - 6, vy - 10, vx + 6, vy + 6), fill=hexc(0x2a2410))           # the dark at the end
    glow(cv, 60, 20, 30, 0xfffff0, 60)
    put(cv, strip('last-seen/run_sheet.png', 3), 46, 100, flip=True, light=(255, 250, 220), side=1)
    put(cv, strip('what-once-was/menu_idle_sheet.png', 9), 118, 80, flip=True, shade=((40, 30, 10), 0.2))
    speed(cv, 46, 70, 0x6a5a30, 18, 90, 26, 7)
    d = draw(cv); d.text((50, 50), '!', fill=hexc(0xe83a3a))
    return grade(cv, 0xe8d880, 0.1, vig=0.55)

def p_birthday():
    """HAPPY BIRTHDAY, ROSEMARY: the old pizza-place mascot brought a cake. Make a wish. Don't look at its eyes."""
    img = sky(0x1a0a1a, 0x3a1430, 0x5a2040)
    cv = to_im(img); d = draw(cv)
    for x in range(0, W, 8): d.rectangle((x, 0, x + 3, 56), fill=hexc(0x4a1a3a))   # curtains
    d.rectangle((0, 84, W, H), fill=hexc(0x2a1a14))
    for x in range(0, W, 10):
        for y in range(84, H, 10): d.rectangle((x + (5 if (y // 10) % 2 else 0), y, x + (5 if (y // 10) % 2 else 0) + 4, y + 4), fill=hexc(0x3a2a1a))   # checker floor
    for i in range(8): x = 6 + i * 20; d.line([(x, 0), (x + 10, 8)], fill=hexc([0xff3a5a, 0xffe848, 0x3a8aff, 0x5aff8a][i % 4]), width=2)   # streamers
    for x, y, c in ((24, 20, 0xff3a5a), (36, 14, 0x3a8aff), (132, 18, 0xffe848)):   # balloons
        d.ellipse((x - 6, y - 8, x + 6, y + 8), fill=hexc(c)); d.line([(x, y + 8), (x + 2, y + 40)], fill=hexc(0xd0d0d0)); d.point((x - 2, y - 4), fill=(255, 255, 255))
    glow(cv, 70, 74, 26, 0xffd070, 110)
    put(cv, strip('last-seen/wrong/idle_sheet.png', 4), 104, 96, flip=True, light=hexc(0xffd070), side=-1)
    put(cv, strip('last-seen/idle_sheet.png', 2), 44, 96, light=hexc(0xffd070), side=1)
    d = draw(cv)
    d.rectangle((58, 70, 82, 80), fill=hexc(0xf0e0e8)); d.rectangle((58, 70, 82, 72), fill=hexc(0xff7aa0)); d.rectangle((62, 66, 78, 70), fill=hexc(0xf0e0e8))   # the cake
    for x in (64, 70, 76): d.line([(x, 62), (x, 66)], fill=hexc(0x8ad0ff)); d.point((x, 61), fill=hexc(0xffd040)); glow(cv, x, 60, 4, 0xffd040, 160); d = draw(cv)
    d.rectangle((56, 80, 84, 82), fill=hexc(0xd0d0d0))
    return grade(cv, 0xff8a6a, 0.08, vig=0.6)

def p_listens():
    """SHE LISTENS: THE DEVOTED kneels at her dying tree, and something enormous kneels behind her."""
    img = sky(0x08060c, 0x1a1020, 0x2a1a30, 0x4a2a40)
    cv = to_im(img); d = draw(cv)
    big = trim(strip('devoted/drowned/idle_sheet.png', 6)).resize((0, 0)) if False else trim(strip('devoted/drowned/idle_sheet.png', 6))
    big = big.resize((big.width * 3, big.height * 3), Image.NEAREST)
    put(cv, silhouette(big, (34, 22, 44)), 92, 110, light=hexc(0x6a4a8a), side=1)    # what she'll become, huge in the dark
    d = draw(cv)
    for ex in (84, 96): d.rectangle((ex, 34, ex + 2, 35), fill=hexc(0xd8b0ff)); glow(cv, ex + 1, 34, 5, 0xb07aff, 140); d = draw(cv)
    d.rectangle((0, 92, W, H), fill=hexc(0x0a080c))
    tree = [(40, 92), (41, 78), (39, 66), (42, 56), (44, 56), (46, 66), (45, 78), (47, 92)]   # her tree
    d.polygon(tree, fill=hexc(0x2a2018))
    for (x1, y1, x2, y2) in ((42, 62, 30, 52), (30, 52, 26, 56), (44, 58, 56, 46), (56, 46, 60, 48), (43, 70, 52, 66)): d.line([(x1, y1), (x2, y2)], fill=hexc(0x2a2018), width=2)
    d.ellipse((40, 72, 45, 76), fill=hexc(0x060508)); d.line([(42, 76), (42, 84)], fill=hexc(0x060508))
    put(cv, move('dv', 'downB', 0.6), 64, 94, flip=True, light=hexc(0xd8c8e8), side=-1)
    d = draw(cv)
    for i in range(18): x = int(rng.integers(0, W)); d.ellipse((x, 92 + int(rng.integers(0, 4)), x + int(rng.integers(4, 14)), 95 + int(rng.integers(0, 4))), fill=hexc(0x060508))   # sludge pools
    for x, y in ((14, 70), (140, 74), (150, 60)): d.rectangle((x, y, x + 1, y), fill=hexc(0xd8b0ff)); d.rectangle((x + 4, y, x + 5, y), fill=hexc(0xd8b0ff))   # eyes in the dark
    return grade(cv, 0x5a3a7a, 0.1, vig=0.65)

def p_surf():
    """SURF'S UP: NU rides the big one at golden hour; AERO bobs past on his float, waving. Somewhere a crab is unimpressed."""
    img = sky(0xff6a5a, 0xffa86a, 0xffd88a)
    img = radial(40, 52, 22, [0xfff6c8, 0xffd060], img, 1.0)
    cv = to_im(img); d = draw(cv)
    d.rectangle((0, 56, W, H), fill=hexc(0x1a7aa8))
    for y in range(58, H, 3): d.line([(0, y), (W, y)], fill=hexc(0x2a9ac8 if y % 2 else 0x1a6a98))
    for i in range(6): d.line([(30 - i * 2, 58 + i * 3), (50 + i * 2, 58 + i * 3)], fill=hexc(0xffd88a))   # the sun on the water
    wave = [(60, 112), (80, 64), (100, 40), (124, 30), (146, 36), (160, 50), (160, 112)]   # the wave, curling
    d.polygon(wave, fill=hexc(0x0a6a98)); d.polygon([(100, 40), (124, 30), (146, 36), (136, 46), (118, 46)], fill=hexc(0x3abad8))
    for i in range(12): x = 96 + i * 5; d.ellipse((x - 3, 30 + abs(6 - i) - 3, x + 3, 30 + abs(6 - i) + 3), fill=(255, 255, 255))   # foam on its lip
    nu = trim(move('nusurf', 'fair', 0.45))
    d.polygon([(70, 74), (104, 66), (106, 70), (72, 78)], fill=hexc(0xff7a3a)); d.line([(72, 76), (104, 68)], fill=(255, 255, 255))   # the board
    put(cv, nu, 88, 72, light=hexc(0xffe0a0), side=-1)
    put(cv, strip('aero/tide/idle_sheet.png', 3), 26, 86, light=hexc(0xffe0a0), side=1)
    d = draw(cv)
    for y in range(78, 92, 3): d.line([(8, y), (44, y)], fill=hexc(0x2a9ac8 if y % 2 else 0x1a6a98))   # the water over his legs
    d.ellipse((12, 72, 40, 82), outline=hexc(0xff4a6a), width=3); d.arc((12, 72, 40, 82), 200, 260, fill=(255, 255, 255))   # his float
    for i in range(16): sparkle(cv, int(rng.integers(60, 158)), int(rng.integers(36, 100)), 0xffffff, 1)
    d = draw(cv); d.rectangle((140, 100, 148, 104), fill=hexc(0xe84a2a)); d.point((141, 99), fill=(0, 0, 0)); d.point((146, 99), fill=(0, 0, 0))   # the crab
    return grade(cv, 0xffa860, 0.06, vig=0.3)

SHOP = os.path.join(ROOT, 'public/assets/shop')
def shop(name, i=0, fw=64, fh=64):
    s = Image.open(os.path.join(SHOP, name)).convert('RGBA'); n = max(1, s.width // fw); i %= n
    return s.crop((i * fw, 0, i * fw + fw, fh))

def demon(cv, x, y, kind, col=0x060508, eye=0xd8b0ff, s=1.0):
    """One of THE DEVOTED's sludge demons, drawn small: glutton (a fat maw), wraith (a hooded drape), weeper (an eye-ball)."""
    d = draw(cv); C = hexc(col); E = hexc(eye)
    if kind == 'glutton':
        d.ellipse((x - 9 * s, y - 14 * s, x + 9 * s, y), fill=C); d.rectangle((x - 6 * s, y - 6 * s, x + 6 * s, y - 3 * s), fill=hexc(0x5a0a1a))
        for k in range(-5, 6, 3): d.polygon([(x + k * s, y - 6 * s), (x + (k + 1.5) * s, y - 6 * s), (x + (k + 0.7) * s, y - 4 * s)], fill=(240, 236, 224))
        d.rectangle((x - 4 * s, y - 11 * s, x - 3 * s, y - 10 * s), fill=E); d.rectangle((x + 3 * s, y - 11 * s, x + 4 * s, y - 10 * s), fill=E)
    elif kind == 'wraith':
        d.polygon([(x, y - 22 * s), (x + 8 * s, y - 12 * s), (x + 10 * s, y), (x + 4 * s, y - 3 * s), (x, y), (x - 4 * s, y - 3 * s), (x - 10 * s, y), (x - 8 * s, y - 12 * s)], fill=C)
        d.ellipse((x - 4 * s, y - 18 * s, x + 4 * s, y - 11 * s), fill=(232, 226, 236)); d.point((x - 2 * s, y - 15 * s), fill=(0, 0, 0)); d.point((x + 2 * s, y - 15 * s), fill=(0, 0, 0))
    else:
        d.ellipse((x - 8 * s, y - 16 * s, x + 8 * s, y), fill=C)
        for k in range(8): a = k * 0.785; d.line([(x + math.cos(a) * 8 * s, y - 8 * s + math.sin(a) * 8 * s), (x + math.cos(a) * 11 * s, y - 8 * s + math.sin(a) * 11 * s)], fill=C)
        d.ellipse((x - 4 * s, y - 12 * s, x + 4 * s, y - 4 * s), fill=(240, 236, 224)); d.ellipse((x - 2 * s, y - 10 * s, x + 2 * s, y - 6 * s), fill=E)
        d.line([(x - 1, y - 4 * s), (x - 1, y + 3 * s)], fill=hexc(0x8a6ad8))

def p_shop():
    """THE BELL: three rings and the shopkeeper's screen lights up. Everyone wants the GOLDEN capsule."""
    img = sky(0x2a1a14, 0x4a2a1a, 0x5a3420); cv = to_im(img); d = draw(cv)
    for y in range(10, 72, 20):                                                    # shelves of wares
        d.rectangle((0, y + 14, W, y + 16), fill=hexc(0x6a4020))
        for x in range(6, W, 14): d.rectangle((x, y + 4, x + 8, y + 14), fill=hexc([0x3a8aff, 0xffd040, 0xff3a5a, 0x5aff8a, 0xb04aff][(x + y) % 5]))
    d.rectangle((44, 66, 116, 112), fill=hexc(0x6a3a1a)); d.rectangle((44, 66, 116, 70), fill=hexc(0x8a5a2a))   # the desk
    d.rectangle((56, 26, 104, 66), fill=hexc(0x2a2a2a)); d.rectangle((60, 30, 100, 60), fill=hexc(0x0a1a10))   # the CRT
    face = trim(shop('face_happy.png', 0)).resize((34, 26), Image.NEAREST); cv.alpha_composite(face, (63, 32))
    d = draw(cv); d.rectangle((58, 62, 66, 64), fill=hexc(0x1a1a1a)); d.ellipse((96, 61, 102, 65), fill=hexc(0xe83a3a))
    d.polygon([(110, 60), (116, 60), (118, 66), (108, 66)], fill=hexc(0xffd040))   # the bell
    burst(cv, 113, 56, 6, 0xffffff, None, 6, 180)
    put(cv, strip('nu/idle_sheet.png', 2), 26, 112, side=1, light=hexc(0xffd890))
    put(cv, strip('aero/idle_sheet.png', 4), 136, 112, flip=True, light=hexc(0xffd890))
    put(cv, strip('soul-summoner/idle_sheet.png', 1), 150, 112, flip=True, shade=((20, 10, 6), 0.35))
    d = draw(cv)
    for i in range(14): x, y = 30 + i * 8, 20 + (i * 37) % 30; d.ellipse((x, y, x + 4, y + 4), fill=hexc(0xffd040)); d.point((x + 1, y + 1), fill=(255, 255, 255))   # coins flying
    return grade(cv, 0xffb060, 0.08, vig=0.45)

def p_spar():
    """MORNING DRILLS: NU swears he can beat Lacy before breakfast. He cannot."""
    img = sky(0xffb07a, 0xffd8a0, 0xfff0d0); img = radial(30, 70, 22, [0xffffff, 0xfff0b0], img, 1.0)
    img = ridge(img, 74, 3, 0x9a6a8a, 4, step=3); cv = to_im(img); d = draw(cv)
    d.rectangle((0, 90, W, H), fill=hexc(0xc89a6a))
    for x in range(0, W, 16): d.line([(x, 90), (x - 8, H)], fill=hexc(0xa87a4a))   # the dojo boards
    d.rectangle((0, 88, W, 90), fill=hexc(0x6a3a1a))
    for x in (6, 150): d.rectangle((x, 20, x + 4, 90), fill=hexc(0x6a2a1a)); d.rectangle((x - 3, 20, x + 7, 24), fill=hexc(0x3a1a0a))
    d.rectangle((0, 14, W, 18), fill=hexc(0x3a1a0a))
    put(cv, move('nu', 'fsmash', 0.5), 62, 92, light=(255, 240, 210), side=1)
    put(cv, move('hk', 'ftilt', 0.45), 104, 92, flip=True, light=(255, 240, 210))
    burst(cv, 82, 64, 9, 0xffffff, 0xffe070, 7); speed(cv, 82, 64, 0xffffff, 20, 90, 18, 11)
    d = draw(cv); d.text((52, 30), '?!', fill=hexc(0xe83a3a))
    return grade(cv, 0xffc890, 0.06, vig=0.25)

def p_demons():
    """THE PAGES TURN: THE DEVOTED reads aloud from the shadow book, and they come when they are called."""
    img = sky(0x060408, 0x140a1a, 0x24122a); cv = to_im(img); d = draw(cv)
    d.rectangle((0, 94, W, H), fill=hexc(0x0a080c))
    glow(cv, 80, 58, 34, 0x7a2ad8, 120)
    put(cv, move('dv', 'demonpick', 0.3), 80, 98, light=hexc(0xc89aff), side=1)
    d = draw(cv)
    d.polygon([(84, 58), (98, 54), (98, 64), (84, 68)], fill=hexc(0x1a1020)); d.line([(91, 56), (91, 66)], fill=hexc(0x8a5ad8))   # the book, glowing script
    for k in range(4): d.line([(86, 59 + k * 2), (90, 58 + k * 2)], fill=hexc(0xc89aff))
    demon(cv, 30, 98, 'glutton', s=1.2); demon(cv, 128, 96, 'wraith', s=1.2); demon(cv, 50, 40, 'weeper', s=1.0); demon(cv, 120, 44, 'weeper', s=0.8)
    for i in range(30): x, y = int(rng.integers(0, W)), int(rng.integers(0, 90)); cv.putpixel((x, y), hexc([0x7a2ad8, 0xc89aff, 0x3a1a4a][i % 3]) + (255,))
    return grade(cv, 0x4a2a6a, 0.1, vig=0.6)

def p_fountain():
    """WISHES IN THE WATER: AERO and NU at the Starlight Fountain after a match. NU wished for a record deal. AERO wished for NU to stop talking."""
    img = sky(0x0a0a2a, 0x2a1a5a, 0x6a3a8a, 0xb07ab0); img = stars(img, 60, 21, ymax=0.5); cv = to_im(img); d = draw(cv)
    d.ellipse((110, 8, 128, 26), fill=hexc(0xf0e8ff)); glow(cv, 119, 17, 16, 0xd0c0ff, 60); d = draw(cv)
    d.rectangle((0, 86, W, H), fill=hexc(0xd8d0e8)); d.rectangle((0, 86, W, 88), fill=hexc(0xffffff))
    d.ellipse((40, 66, 120, 92), fill=hexc(0xb8b0d0)); d.ellipse((46, 68, 114, 86), fill=hexc(0x4a8ad8))   # the fountain
    d.rectangle((76, 38, 84, 74), fill=hexc(0xd8d0e8)); d.ellipse((62, 34, 98, 44), fill=hexc(0xb8b0d0)); d.ellipse((66, 35, 94, 41), fill=hexc(0x6aaaf0))
    for i in range(10):
        a = -math.pi / 2 + (i - 4.5) * 0.25
        for t in range(14): x, y = 80 + math.cos(a) * t * 2.4, 34 + math.sin(a) * t * 2 + t * t * 0.18; d.point((x, y), fill=hexc(0xc8e8ff))
    put(cv, strip('aero/idle_sheet.png', 3), 34, 98, light=hexc(0xc8b0ff), side=1)
    put(cv, strip('nu/idle_sheet.png', 5), 128, 98, flip=True, light=hexc(0xc8b0ff))
    for x, y in ((60, 80), (96, 78), (80, 84)): d.ellipse((x, y, x + 3, y + 2), fill=hexc(0xffd040))   # coins in the water
    for i in range(12): sparkle(cv, int(rng.integers(20, 140)), int(rng.integers(20, 80)), 0xe0d0ff, 1)
    return grade(cv, 0x8a6ad8, 0.08, vig=0.4)

def p_willow():
    """DON'T ANSWER IT: 13 Willow Lane, 1996. The phone on the porch is ringing. Rosemary is going to answer it."""
    img = sky(0x04060c, 0x0c1424, 0x1a2434); cv = to_im(img); d = draw(cv)
    for i in range(3): d.line([(20 + i * 50, 0), (28 + i * 50, 20), (22 + i * 50, 30)], fill=hexc(0xd0e0ff) if i == 1 else hexc(0x2a3448))   # lightning
    glow(cv, 78, 10, 40, 0xd0e0ff, 50); d = draw(cv)
    d.polygon([(30, 50), (80, 18), (130, 50)], fill=hexc(0x2a2a30)); d.rectangle((36, 50, 124, 100), fill=hexc(0x6a6a70))   # the house
    for x in range(36, 124, 4): d.line([(x, 50), (x, 100)], fill=hexc(0x5a5a60))
    d.rectangle((48, 58, 62, 72), fill=hexc(0xffd890)); d.rectangle((98, 58, 112, 72), fill=hexc(0x1a1a20))
    d.ellipse((102, 60, 108, 66), fill=hexc(0xe8e0d0)); d.point((104, 62), fill=(0, 0, 0)); d.point((106, 62), fill=(0, 0, 0))   # someone in the window
    d.rectangle((72, 78, 86, 100), fill=hexc(0x2a1a10)); d.rectangle((30, 76, 130, 78), fill=hexc(0x3a3a40))
    d.rectangle((0, 100, W, H), fill=hexc(0x1a2a14))
    d.rectangle((92, 84, 98, 90), fill=hexc(0xe83a3a)); d.text((99, 78), ')))', fill=(255, 255, 255))   # the ringing phone
    put(cv, strip('last-seen/idle_sheet.png', 4), 112, 104, flip=True, light=hexc(0xd0e0ff), side=-1)
    arr = np.array(cv)
    for _ in range(220): x, y = int(rng.integers(0, W)), int(rng.integers(0, H - 3)); arr[y:y + 3, x, :3] = (120, 140, 180)   # rain
    return grade(Image.fromarray(arr), 0x3a5a8a, 0.12, vig=0.55)

def p_desert():
    """ROOF RIDE: Soul Summoner and Mr Wake settle it on the roof of a speeding motorhome. The DEA would like a word."""
    img = sky(0x3a8ad8, 0xffb87a, 0xffe0a0); img = ridge(img, 70, 6, 0xc86a3a, 13, step=4); cv = to_im(img); d = draw(cv)
    d.rectangle((0, 84, W, H), fill=hexc(0xe0b070)); d.rectangle((0, 96, W, 104), fill=hexc(0x3a3a3a))
    for x in range(0, W, 16): d.rectangle((x, 99, x + 8, 100), fill=hexc(0xffe070))
    d.rectangle((28, 62, 140, 96), fill=hexc(0xf0e8d0)); d.rectangle((28, 72, 140, 76), fill=hexc(0x8a4a2a)); d.rectangle((28, 78, 140, 80), fill=hexc(0xd8a040))   # the motorhome
    d.rectangle((126, 64, 140, 74), fill=hexc(0x6ab0e0)); d.ellipse((40, 90, 54, 104), fill=hexc(0x1a1a1a)); d.ellipse((112, 90, 126, 104), fill=hexc(0x1a1a1a))
    for x in range(0, 28, 4): d.line([(x, 70 + x % 8), (x + 3, 70 + x % 8)], fill=hexc(0xd8c8a0))   # dust
    put(cv, move('ss', 'fsmash', 0.5), 64, 62, light=(255, 230, 190), side=1)
    put(cv, move('wake', 'fsmash', 0.45), 108, 62, flip=True, light=(255, 230, 190))
    burst(cv, 86, 40, 8, 0xffffff, 0x7ad0ff, 7)
    d = draw(cv); d.ellipse((128, 10, 156, 22), fill=hexc(0x1a2a4a)); d.line([(124, 8), (160, 8)], fill=hexc(0x3a3a3a)); d.rectangle((150, 14, 158, 16), fill=hexc(0x1a2a4a))   # the helicopter
    return grade(cv, 0xffb070, 0.06, vig=0.3)

def p_winter():
    """STALINGRAD, 1942: Rosemary in her greatcoat, alone in the ruins. Snow on her shoulders. She doesn't feel the cold any more."""
    img = sky(0x4a5468, 0x8a94a8, 0xc8ccd8); cv = to_im(img); d = draw(cv)
    for x, w, h in ((0, 30, 50), (34, 24, 64), (62, 18, 40), (104, 30, 58), (138, 22, 46)):   # the ruins
        d.rectangle((x, 112 - h, x + w, 112), fill=hexc(0x3a3a44))
        for k in range(3): d.rectangle((x + 4 + k * 8, 112 - h + 8, x + 8 + k * 8, 112 - h + 14), fill=hexc(0x1a1a20))
        d.polygon([(x, 112 - h), (x + w * 0.4, 112 - h - 8), (x + w, 112 - h + 4)], fill=hexc(0x3a3a44))
    d.rectangle((0, 96, W, H), fill=hexc(0xe8ecf4))
    put(cv, strip('last-seen/soviet/idle_sheet.png', 6), 80, 100, light=(240, 244, 255), side=-1)
    d = draw(cv)
    for i in range(140): x, y = int(rng.integers(0, W)), int(rng.integers(0, H)); d.point((x, y), fill=(255, 255, 255)); d.point((x + 1, y), fill=(220, 226, 240)) if i % 3 == 0 else None
    return grade(cv, 0x8a9ab8, 0.12, vig=0.5)

def p_throne():
    """THE KING WHO HAS NO FACE: Lacy stands before the Masked Throne. Every mask on its crown turns to look at her."""
    img = sky(0x040306, 0x0e0a14, 0x1a1420); cv = to_im(img); d = draw(cv)
    rays(cv, 80, 0, 1, 0xd8c8a0, 50, start=math.pi / 2, length=130)
    d = draw(cv)
    d.polygon([(52, 112), (60, 40), (100, 40), (108, 112)], fill=hexc(0x3a3a44))   # the stone king
    d.ellipse((66, 18, 94, 46), fill=hexc(0x4a4a54)); d.rectangle((58, 40, 102, 48), fill=hexc(0x4a4a54))
    crown = trim(Image.open(os.path.join(SHOP, 'crown.png')).convert('RGBA')); crown = crown.resize((crown.width // 2, crown.height // 2), Image.NEAREST)
    cv.alpha_composite(crown, (80 - crown.width // 2, 6))
    d = draw(cv); d.rectangle((0, 100, W, H), fill=hexc(0x2a2a30))
    for x in range(0, W, 12): d.line([(x, 100), (x, H)], fill=hexc(0x1a1a20))
    glow(cv, 80, 92, 18, 0xffd890, 70)
    put(cv, strip('hero-knight/idle_sheet.png', 5, 150, 90), 80, 104, light=hexc(0xffe0a0), side=1)
    return grade(cv, 0x6a5a4a, 0.08, vig=0.65)

def p_fractured():
    """FRACTURED: Soul Summoner on the galaxy shard, the last light for a thousand miles. The stars here are cracks."""
    img = sky(0x02020a, 0x0a0820, 0x1a0a3a); img = stars(img, 120, 33, cols=(0xffffff, 0xc8a8ff, 0x8ad8ff), ymax=1.0)
    img = radial(120, 30, 40, [0x8a4ad8, 0x3a1a6a], img, 0.6, 0.6); cv = to_im(img)
    frag = trim(Image.open(os.path.join(SHOP, 'fragment.png')).convert('RGBA')); frag = frag.resize((frag.width * 2, frag.height * 2), Image.NEAREST)
    cv.alpha_composite(frag, (80 - frag.width // 2, 62))
    d = draw(cv)
    for i in range(6): x = 30 + i * 22; d.line([(x, 0), (x + 10, 30)], fill=hexc(0xe0d0ff)); d.line([(x + 10, 30), (x + 6, 40)], fill=hexc(0xe0d0ff))   # cracks in the sky
    glow(cv, 80, 52, 20, 0x7ad0ff, 110)
    put(cv, strip('soul-summoner/idle_sheet.png', 6), 80, 70, light=hexc(0xb8e8ff), side=1)
    return grade(cv, 0x4a3a9a, 0.08, vig=0.5)

def p_baseplate():
    """BASEPLATE 2012: AERO built a house out of bricks. WHAT ONCE WAS is standing inside it, and nobody let it in."""
    img = sky(0x5aa8ff, 0x9ad0ff, 0xd8f0ff); cv = to_im(img); d = draw(cv)
    d.rectangle((0, 90, W, H), fill=hexc(0x3aa83a))
    for x in range(0, W, 6):
        for y in range(90, H, 6): d.ellipse((x + 1, y + 1, x + 4, y + 3), fill=hexc(0x4ac84a))   # studs
    for bx, by, c in ((90, 78, 0xe83a3a), (102, 78, 0xe83a3a), (114, 78, 0xe83a3a), (90, 66, 0xffd040), (114, 66, 0xffd040), (90, 54, 0x3a8aff), (102, 54, 0x3a8aff), (114, 54, 0x3a8aff)):
        d.rectangle((bx, by, bx + 11, by + 11), fill=hexc(c), outline=hexc(0x1a1a1a)); d.rectangle((bx + 3, by - 2, bx + 8, by), fill=hexc(c))
    d.rectangle((102, 66, 113, 77), fill=hexc(0x2a2a2a))
    put(cv, strip('what-once-was/menu_idle_sheet.png', 2), 108, 80, shade=((0, 0, 0), 0.2))
    put(cv, strip('aero/idle_sheet.png', 8), 50, 94, light=(255, 255, 255), side=1)
    d = draw(cv); d.rectangle((24, 30, 64, 44), fill=(255, 255, 255), outline=hexc(0x3a3a3a)); d.text((27, 33), 'nice', fill=hexc(0x2a2a2a))
    d.ellipse((132, 20, 152, 30), fill=(255, 255, 255)); d.ellipse((20, 10, 44, 20), fill=(255, 255, 255))
    return grade(cv, 0xd0f0ff, 0.04, vig=0.2)

def p_photo():
    """PICTURE DAY: everyone, smile! WHAT ONCE WAS's screen says :) - THE DEVOTED's glutton ate the photographer's sandwich."""
    img = sky(0x3a2a5a, 0x6a4a8a, 0x8a6aa8); cv = to_im(img); d = draw(cv)
    d.rectangle((0, 92, W, H), fill=hexc(0x4a3a5a))
    for i, (pth, f, fw, fh, x, fl) in enumerate((
        ('hero-knight/idle_sheet.png', 2, 150, 90, 18, False), ('soul-summoner/idle_sheet.png', 4, 64, 64, 38, False), ('mr-wake/idle_sheet.png', 1, 64, 64, 58, False),
        ('nu/idle_sheet.png', 6, 64, 64, 78, False), ('aero/idle_sheet.png', 2, 64, 64, 98, True), ('last-seen/idle_sheet.png', 0, 64, 64, 116, True),
        ('what-once-was/menu_idle_sheet.png', 3, 64, 64, 134, True), ('devoted/idle_sheet.png', 4, 64, 64, 150, True))):
        put(cv, strip(pth, f, fw, fh), x, 100 - (i % 2) * 3, flip=fl, light=(255, 255, 255), side=1)
    demon(cv, 150, 104, 'glutton', s=0.8)
    d = draw(cv); d.rectangle((146, 96, 152, 99), fill=hexc(0xf0d090))
    d.rectangle((126, 50, 138, 58), fill=hexc(0x2a2a2a)); d.text((127, 49), ':)', fill=hexc(0x5aff8a))
    ov = Image.new('RGBA', cv.size, (255, 255, 255, 60)); cv.alpha_composite(ov)   # the flash
    glow(cv, 80, 10, 50, 0xffffff, 90)
    return grade(cv, 0xffffff, 0.04, vig=0.35)

def p_ascend():
    """FULL AERO: the fishbowl cracks, the light pours out, and a king floats up with a golden spear. Everyone covers their eyes."""
    img = sky(0x1a2a6a, 0x5a7ad8, 0xc8d8ff); img = radial(80, 40, 50, [0xffffff, 0xfff6c8, 0xffd870], img, 1.0); cv = to_im(img)
    rays(cv, 80, 40, 18, 0xfff0b0, 50, start=0.05)
    glow(cv, 80, 44, 30, 0xffffff, 140)
    put(cv, strip('aero/king/idle_sheet.png', 4), 80, 74, light=(255, 255, 220), side=1)
    d = draw(cv); d.rectangle((0, 96, W, H), fill=hexc(0x4a5a8a))
    for i, (pth, f, fw, fh, x, fl) in enumerate((('soul-summoner/idle_sheet.png', 7, 64, 64, 22, False), ('mr-wake/idle_sheet.png', 3, 64, 64, 46, False),
                                                  ('hero-knight/idle_sheet.png', 6, 150, 90, 116, True), ('nu/idle_sheet.png', 1, 64, 64, 140, True))):
        put(cv, strip(pth, f, fw, fh), x, 104, flip=fl, shade=((255, 240, 200), 0.25), light=(255, 255, 230), side=1 if x < 80 else -1)
    for i in range(16): sparkle(cv, int(rng.integers(30, 130)), int(rng.integers(10, 80)), 0xffffff, 2)
    return grade(cv, 0xffe8a0, 0.06, vig=0.3)


def p_volunteer():
    """THE VOLUNTEER: THE GREAT PRESTO saws CHEF ROUX in half, live, for one night only. Roux was promised a free dinner."""
    img = sky(0x12040a, 0x2a0a14, 0x3a0e1a); cv = to_im(img); d = draw(cv)
    for x in range(0, W, 6):                                                        # the red velvet curtains
        c = 0x7a1020 if (x // 6) % 2 else 0x5a0a18
        d.rectangle((x, 0, x + 5, 12), fill=hexc(c))
        d.rectangle((x, 0, x + 5, 96), fill=hexc(c)) if x < 22 or x > W - 28 else None
    for x in range(0, W, 12): d.pieslice((x - 2, 4, x + 14, 22), 0, 180, fill=hexc(0x8a1828))   # the swags
    d.rectangle((0, 0, W, 5), fill=hexc(0xd8a030))
    spot = Image.new('RGBA', (W, H), (0, 0, 0, 0)); sd = draw(spot)
    sd.polygon([(70, 0), (96, 0), (150, 96), (20, 96)], fill=(255, 240, 190, 46))   # the spotlight cone
    cv.alpha_composite(spot); d = draw(cv)
    d.rectangle((0, 96, W, H), fill=hexc(0x3a1a0e))
    for x in range(0, W, 10): d.line([(x, 96), (x, H)], fill=hexc(0x2a1008))           # the boards
    d.rectangle((0, 96, W, 98), fill=hexc(0xd8a030))
    for i in range(8): d.pieslice((4 + i * 21, 99, 12 + i * 21, 107), 180, 360, fill=hexc(0xffe8a0))   # footlights
    glow(cv, 80, 104, 70, 0xffd070, 50); d = draw(cv)
    # the cabinet on its trestle, split down the middle, Roux's toque and boots poking out
    d.rectangle((86, 70, 150, 86), fill=hexc(0x1a0a3a)); d.rectangle((86, 70, 150, 72), fill=hexc(0xd8a030))
    for x in (98, 128): d.rectangle((x, 72, x + 6, 84), fill=hexc(0x3a1a6a))
    for x, y in ((92, 76), (110, 78), (138, 76)): sparkle(cv, x, y, 0xffe070, 1)
    d = draw(cv)
    d.line([(118, 70), (118, 86)], fill=hexc(0x000000))
    d.rectangle((92, 86, 96, 96), fill=hexc(0x2a1a0e)); d.rectangle((140, 86, 144, 96), fill=hexc(0x2a1a0e))
    d.ellipse((76, 66, 88, 78), fill=hexc(0xe8b890)); d.point((80, 71), fill=0); d.point((84, 71), fill=0)   # Roux's worried face
    d.line([(80, 75), (84, 74)], fill=hexc(0x6a2a1a))
    d.rectangle((76, 56, 88, 66), fill=hexc(0xf8f8f8)); d.ellipse((74, 52, 90, 62), fill=hexc(0xffffff))   # his toque
    d.rectangle((150, 74, 158, 82), fill=hexc(0x2a2a2a)); d.rectangle((156, 72, 160, 82), fill=hexc(0x1a1a1a))   # his boots
    d.polygon([(100, 70), (138, 58), (139, 66), (104, 74)], fill=hexc(0xd8d8e8))       # the saw, biting into the lid
    d.line([(100, 70), (138, 58)], fill=hexc(0xffffff))
    for k in range(9): x = 104 + k * 4; d.point((x, 74 - k * 8 // 9), fill=hexc(0x6a6a7a))   # its teeth
    d.rectangle((138, 54, 148, 68), fill=hexc(0x6a3a1a)); d.rectangle((141, 58, 145, 64), fill=hexc(0x12040a))   # handle
    d.rectangle((115, 70, 121, 72), fill=hexc(0x000000))                              # the cut
    put(cv, move('pr', 'limit', 0.55), 48, 96, light=hexc(0xffe0a0), side=1)
    for i in range(16): sparkle(cv, int(rng.integers(30, 150)), int(rng.integers(20, 70)), [0xffe070, 0xffffff][i % 2], 1)
    d = draw(cv)
    for x, y, c in ((20, 40, 0xffffff), (30, 30, 0xe83a3a), (140, 34, 0xffffff)):  # cards fluttering
        d.rectangle((x, y, x + 4, y + 6), fill=hexc(c)); d.rectangle((x + 1, y + 2, x + 3, y + 4), fill=hexc(0xc01828 if c == 0xffffff else 0xffffff))
    return grade(cv, 0xd87050, 0.08, vig=0.45)

def p_staffmeal():
    """STAFF MEAL: CHEF ROUX feeds the roster after every tournament. NU always asks for seconds. AERO asks what the purple bit is."""
    img = sky(0x2a1a10, 0x4a2a14, 0x6a3a18); cv = to_im(img); d = draw(cv)
    for y in range(0, 74, 8):                                                       # white kitchen tiles
        for x in range(-(y // 8 % 2) * 6, W, 12): d.rectangle((x, y, x + 11, y + 7), fill=hexc(0xd8ccb8)); d.rectangle((x, y, x + 11, y), fill=hexc(0xf0e8d8))
    for x in (20, 60, 100, 140):                                                    # hanging copper pans
        d.line([(x, 0), (x, 10)], fill=hexc(0x3a2a1a)); d.ellipse((x - 7, 10, x + 7, 22), fill=hexc(0xc8783a)); d.ellipse((x - 5, 12, x + 5, 19), fill=hexc(0xe89a5a))
    d.rectangle((0, 74, W, 80), fill=hexc(0x8a8a90)); d.rectangle((0, 80, W, H), fill=hexc(0x5a5a62))   # the steel counter
    for x in range(0, W, 20): d.line([(x, 80), (x, H)], fill=hexc(0x4a4a52))
    d.rectangle((0, 74, W, 75), fill=hexc(0xd8d8e0))
    glow(cv, 46, 52, 30, 0xff8a2a, 110); d = draw(cv)
    d.rectangle((30, 68, 62, 74), fill=hexc(0x2a2a2a)); d.ellipse((32, 60, 60, 70), fill=hexc(0x3a3a3a))   # the pan, flambe roaring
    for i in range(14):
        x = 46 + int(rng.integers(-12, 12)); h = int(rng.integers(10, 30))
        d.polygon([(x - 3, 64), (x + 3, 64), (x + int(rng.integers(-3, 3)), 64 - h)], fill=hexc([0xff5a1a, 0xffa030, 0xffe070][i % 3]))
    put(cv, move('ch', 'upb', 0.35), 72, 74, light=hexc(0xffc080), side=-1)
    put(cv, strip('nu/idle_sheet.png', 2), 118, 76, flip=True, light=hexc(0xffd8a0))
    put(cv, strip('aero/idle_sheet.png', 4), 146, 76, flip=True, light=hexc(0xffd8a0))
    d = draw(cv)
    for x in (110, 138):                                                            # their bowls, steaming
        d.pieslice((x, 66, x + 14, 78), 0, 180, fill=hexc(0xf0f0f0)); d.ellipse((x + 1, 68, x + 13, 72), fill=hexc(0x9a3ad8 if x == 138 else 0xd8783a))
        for k in range(3): d.line([(x + 4 + k * 3, 64), (x + 5 + k * 3, 56)], fill=hexc(0xe8e0d0))
    for i in range(18): x, y = int(rng.integers(30, 64)), int(rng.integers(20, 50)); cv.putpixel((x, y), hexc([0xffe070, 0xff8a2a][i % 2]) + (255,))
    d.text((150, 40), '?', fill=hexc(0x40e8ff))
    return grade(cv, 0xffa860, 0.08, vig=0.4)

PAINTINGS = [p_gates, p_star, p_tea, p_burned, p_encore, p_purge, p_level0, p_birthday, p_listens, p_surf,
             p_shop, p_spar, p_demons, p_fountain, p_willow, p_desert, p_winter, p_throne, p_fractured, p_baseplate, p_photo, p_ascend,
             p_volunteer, p_staffmeal]


def build(preview=None):
    out = Image.new('RGBA', (W * 5, H * ((len(PAINTINGS) + 4) // 5)))
    for i, fn in enumerate(PAINTINGS):
        im = fn().convert('RGB').convert('RGBA')
        out.paste(im, ((i % 5) * W, (i // 5) * H))
        print(fn.__name__, flush=True)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    if preview: out.resize((out.width * 3, out.height * 3), Image.NEAREST).save(preview); return
    q = out.convert('RGB').quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    q.save(OUT, optimize=True)


if __name__ == '__main__':
    a = sys.argv[1:]
    build(a[a.index('--preview') + 1] if '--preview' in a else None)

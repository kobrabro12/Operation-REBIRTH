"""LOADING SCREENS (Fortnite-style): for each screen a vivid pixel-art backdrop and a big hero cut out of the
fighter's own sheets in an action pose. The page (index.html + public/loading-screens.js) stacks them into a living
screen - the backdrop slowly pushing in, light rays turning behind the hero, the hero sliding in and floating with a
glow, the screen's own particles, its name and tips, and a slanted progress bar.

Writes public/assets/ui/loading/<id>_bg.png (BG_W x BG_H, shown pixelated, full screen) and <id>_hero.png (the
trimmed pose with a dark outline; CSS scales it). Every file stays a palette PNG (few colours, dithered bands).
Run:  python3 tools/sprites/loading_screens.py [--preview FILE]
"""
import os, re, json, math, sys, random
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), '../..')
OUT = os.path.join(ROOT, 'public/assets/ui/loading')
FIGHTERS = os.path.join(ROOT, 'public/assets/fighters')
BG_W, BG_H = 320, 180                                  # backdrop size (16:9; the page shows it at 4-6x, pixelated)
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0

# which frame of which moves sheet each hero is cut from: (fighter folder, frame w, h, moves table, frame index)
POSES = {
    'soul-summoner': ('soul-summoner', 112, 104, 111),     # FSMASH: the lunge, soul fire in his hand
    'mr-wake': ('mr-wake', 176, 120, 418),                 # NEUTRAL B: the staff blast
    'hero-knight': ('hero-knight', 180, 140, 74),          # USMASH: the arcing slash
    'nu': ('nu', 112, 104, 167),                           # FSMASH: the flying kick
    'aero': ('aero', 112, 104, 489),                       # FSMASH: the dashing punch
    'gnash': ('gnash', 180, 168, 101),                     # USMASH: the axe overhead
}


def hexc(h):
    """'#rrggbb' -> (r, g, b)."""
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def bands(stops, w=BG_W, h=BG_H, y0=0, y1=None):
    """A sky of flat colour bands from top to bottom through `stops` [(0..1, '#hex'), ...], each step between two
    bands blended with the 4x4 ordered dither (the 16-bit look). Returns an RGB numpy array."""
    y1 = h if y1 is None else y1
    img = np.zeros((h, w, 3), np.uint8)
    cols = [(p, np.array(hexc(c))) for p, c in stops]
    for y in range(h):
        u = min(1, max(0, (y - y0) / max(1, y1 - y0)))
        for i in range(len(cols) - 1):
            if cols[i][0] <= u <= cols[i + 1][0]: break
        a, b = cols[i], cols[i + 1]; k = (u - a[0]) / max(1e-6, b[0] - a[0])
        steps = 4; kq = k * steps
        for x in range(w):
            q = math.floor(kq + BAYER[y % 4, x % 4] - 0.5 + 0.5)
            q = min(steps, max(0, q)) / steps
            img[y, x] = (a[1] * (1 - q) + b[1] * q).astype(np.uint8)
    return img


def dither_blend(img, mask, color, k):
    """Paints `color` over the pixels in `mask` with ordered-dither coverage k (0..1, scalar or per pixel)."""
    h, w = mask.shape
    th = np.tile(BAYER, (h // 4 + 1, w // 4 + 1))[:h, :w]
    kk = k if np.ndim(k) else np.full((h, w), k)
    on = mask & (th < kk)
    img[on] = hexc(color)


def rays(img, cx, cy, n, color, k, spin=0.0):
    """Wedges of light fanning out from (cx, cy): every other wedge lit with dither coverage k, fading with distance."""
    h, w = img.shape[:2]; yy, xx = np.mgrid[0:h, 0:w]
    a = (np.arctan2(yy - cy, xx - cx) + spin) % (2 * math.pi)
    lit = (np.floor(a / (2 * math.pi) * n * 2) % 2) == 0
    d = np.hypot(xx - cx, yy - cy)
    dither_blend(img, lit, color, k * np.clip(1 - d / (w * 0.8), 0, 1))


def glow(img, cx, cy, r, color, k=0.8):
    """A soft round glow at (cx, cy), radius r, dithered (densest in the middle)."""
    h, w = img.shape[:2]; yy, xx = np.mgrid[0:h, 0:w]
    d = np.hypot(xx - cx, yy - cy) / r
    dither_blend(img, d < 1, color, k * np.clip(1 - d, 0, 1) ** 1.3)


def to_im(arr):
    """numpy RGB -> PIL image (RGBA)."""
    return Image.fromarray(arr).convert('RGBA')


def poly(d, pts, c):
    """A filled polygon in a hex colour."""
    d.polygon([(int(x), int(y)) for x, y in pts], fill=hexc(c))


def cloud(d, x, y, w, c, hi):
    """A chunky stacked cloud (a few rounded blobs) with a lighter top edge."""
    for i, (dx, dy, r) in enumerate([(0, 6, 0.3), (0.22, 0, 0.36), (0.5, 3, 0.3), (0.72, 7, 0.24)]):
        R = w * r / 2
        d.ellipse((x + dx * w - R * 0.2, y + dy + 4, x + dx * w + R * 1.8, y + dy + 4 + R * 1.2), fill=hexc(hi))
        d.ellipse((x + dx * w - R * 0.2, y + dy + 6, x + dx * w + R * 1.8, y + dy + 6 + R * 1.2), fill=hexc(c))


def stars(d, n, color, seed, ymax=110):
    """A scatter of 1 px stars (a few brighter crosses)."""
    r = random.Random(seed)
    for i in range(n):
        x, y = r.randrange(BG_W), r.randrange(ymax)
        d.point((x, y), fill=hexc(color))
        if i % 9 == 0: d.point((x - 1, y), fill=hexc(color)); d.point((x + 1, y), fill=hexc(color)); d.point((x, y - 1), fill=hexc(color)); d.point((x, y + 1), fill=hexc(color))


# ---------------------------------------------------------------------------------------------- the backdrops
def bg_soul():
    """THE SKY SANCTUM at golden hour: teal sky into gold, a low sun with rays, floating islands, ruined pillars."""
    a = bands([(0, '#0b1d3a'), (0.35, '#1d5a7a'), (0.62, '#4fa3a0'), (0.8, '#f2c46a'), (1, '#ffe8a8')], y1=150)
    rays(a, 205, 108, 14, '#ffe7a0', 0.35); glow(a, 205, 108, 70, '#fff2c0', 0.7); glow(a, 205, 108, 26, '#ffffff', 0.95)
    im = to_im(a); d = ImageDraw.Draw(im); stars(d, 40, '#cfe8ff', 3, 50)
    cloud(d, 10, 60, 70, '#e3b56a', '#ffe0a0'); cloud(d, 250, 48, 60, '#d9a35c', '#ffe0a0')
    for x, y, w in [(28, 92, 56), (258, 84, 46), (120, 70, 30)]:                         # floating islands
        poly(d, [(x, y), (x + w, y), (x + w * 0.7, y + 10), (x + w * 0.55, y + 22), (x + w * 0.4, y + 12)], '#163848')
        d.rectangle((x, y - 2, x + w, y), fill=hexc('#3f8a5a'))
    for x in (8, 44, 278, 304):                                                             # broken pillars
        top = 96 + (x % 3) * 8
        d.rectangle((x, top, x + 10, 180), fill=hexc('#10263a')); d.rectangle((x - 2, top, x + 12, top + 3), fill=hexc('#1d4258'))
    poly(d, [(0, 150), (60, 142), (140, 148), (220, 140), (320, 146), (320, 180), (0, 180)], '#0e2232')
    d.rectangle((0, 158, 320, 180), fill=hexc('#0a1724'))
    return im


def bg_wake():
    """GRAVEMOON BRIDGE: violet night, a huge pale moon, the bridge's arches, the black water with the moon in it."""
    a = bands([(0, '#07040f'), (0.4, '#1e0f3d'), (0.75, '#4a1f6a'), (1, '#7a3a8a')], y1=128)
    glow(a, 196, 62, 80, '#6a3aa0', 0.6); rays(a, 196, 62, 10, '#8a5ac0', 0.18)
    im = to_im(a); d = ImageDraw.Draw(im); stars(d, 70, '#d8c8ff', 7)
    d.ellipse((160, 26, 232, 98), fill=hexc('#efe4ff')); d.ellipse((168, 30, 232, 98), fill=hexc('#ddd0f4'))
    for cx, cy, r in [(186, 52, 6), (204, 70, 9), (214, 46, 4), (180, 80, 5)]: d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=hexc('#c8b8e6'))
    d.rectangle((0, 112, 320, 118), fill=hexc('#120a22'))                                    # the bridge deck
    for x in range(0, 320, 64):
        d.rectangle((x + 26, 118, x + 38, 140), fill=hexc('#120a22'))
        d.arc((x - 6, 108, x + 70, 168), 180, 360, fill=hexc('#120a22'), width=4)
    for x in range(0, 320, 10): d.rectangle((x, 104, x + 2, 112), fill=hexc('#1c1030'))
    d.rectangle((0, 103, 320, 105), fill=hexc('#1c1030'))
    a = np.array(im.convert('RGB')); w = bands([(0, '#1a0c30'), (1, '#06030c')], h=40)
    a[140:180] = w
    im = to_im(a); d = ImageDraw.Draw(im)
    for i in range(10):                                                                     # the moon on the water
        y = 144 + i * 3; ww = 36 - i * 2 + (i % 2) * 6
        d.rectangle((196 - ww // 2, y, 196 + ww // 2, y), fill=hexc('#b8a0e8' if i % 3 else '#efe4ff'))
    return im


def bg_lacy():
    """THE LAST OATH: a burning crimson sunset, the fallen castle's towers and torn banners, the smoke."""
    a = bands([(0, '#14040c'), (0.35, '#4a0c1e'), (0.65, '#a8242a'), (0.85, '#ff6a3a'), (1, '#ffc070')], y1=140)
    rays(a, 110, 120, 12, '#ff9a5a', 0.3); glow(a, 110, 124, 60, '#ffd890', 0.8)
    im = to_im(a); d = ImageDraw.Draw(im)
    d.pieslice((80, 94, 140, 154), 180, 360, fill=hexc('#ffe8b0'))
    cloud(d, 170, 40, 90, '#5a1420', '#a83a3a'); cloud(d, -10, 66, 80, '#6a1824', '#c04a3a')
    base = '#1a060c'
    for x, w, h in [(150, 22, 70), (178, 40, 48), (222, 18, 84), (244, 34, 54), (282, 22, 66), (20, 16, 40)]:
        d.rectangle((x, 140 - h, x + w, 150), fill=hexc(base))
        for bx in range(x, x + w, 6): d.rectangle((bx, 136 - h, bx + 3, 140 - h), fill=hexc(base))
        if h > 60: poly(d, [(x - 2, 140 - h), (x + w / 2, 122 - h), (x + w + 2, 140 - h)], base)
    for x, y in [(231, 40), (160, 54)]:                                                     # torn banners
        d.line((x, y, x, y - 14), fill=hexc('#2a0a10'))
        poly(d, [(x, y - 14), (x + 12, y - 11), (x + 8, y - 8), (x + 13, y - 5), (x, y - 6)], '#7a1020')
    poly(d, [(0, 150), (80, 144), (180, 150), (320, 144), (320, 180), (0, 180)], '#10040a')
    return im


def bg_nu():
    """THE MAIN STAGE: a dark arena cut by pink and cyan spotlights, speaker stacks, a crowd with its hands up."""
    a = bands([(0, '#05020f'), (0.5, '#1a0838'), (1, '#3a0c5a')], y1=150)
    h, w = a.shape[:2]; yy, xx = np.mgrid[0:h, 0:w]
    for cx, ang, col in [(40, 0.55, '#ff4ad8'), (110, 0.25, '#3ae8ff'), (210, -0.25, '#ff4ad8'), (280, -0.55, '#3ae8ff')]:
        dx = xx - (cx + yy * math.tan(ang)); beam = np.abs(dx) < 4 + yy * 0.16
        dither_blend(a, beam, col, 0.32 * (yy / h + 0.2))
    glow(a, 205, 120, 70, '#ff7ae0', 0.35)
    im = to_im(a); d = ImageDraw.Draw(im)
    for x in (6, 270):                                                                       # speaker stacks
        for j in range(3):
            y = 92 + j * 22; d.rectangle((x, y, x + 44, y + 20), fill=hexc('#0c0816')); d.rectangle((x, y, x + 44, y + 1), fill=hexc('#2a1a40'))
            d.ellipse((x + 6, y + 3, x + 20, y + 17), fill=hexc('#1a1030')); d.ellipse((x + 26, y + 5, x + 38, y + 15), fill=hexc('#1a1030'))
    d.rectangle((0, 150, 320, 180), fill=hexc('#080412'))
    r = random.Random(4)
    for i in range(46):                                                                      # the crowd
        x = i * 7 + r.randrange(4); y = 156 + r.randrange(6)
        d.ellipse((x, y - 6, x + 6, y), fill=hexc('#120826')); d.rectangle((x, y - 1, x + 6, 180), fill=hexc('#120826'))
        if r.random() < 0.45: d.line((x + 1, y - 2, x - 2 + r.randrange(3), y - 12), fill=hexc('#120826'), width=2)
    for x in range(0, 320, 16): d.rectangle((x, 4, x + 6, 6), fill=hexc('#ffd8f8' if (x // 16) % 2 else '#a8f8ff'))
    return im


def bg_aero():
    """AERO MEADOW: a glossy Frutiger Aero sky, a bright sun, shiny rolling hills, bubbles."""
    a = bands([(0, '#1a8ef0'), (0.45, '#5cc8ff'), (0.8, '#b8f0ff'), (1, '#eafff8')], y1=130)
    rays(a, 230, 40, 12, '#ffffff', 0.22); glow(a, 230, 40, 46, '#ffffff', 0.85)
    im = to_im(a); d = ImageDraw.Draw(im)
    cloud(d, 20, 30, 80, '#e8f8ff', '#ffffff'); cloud(d, 120, 56, 60, '#e0f4ff', '#ffffff')
    for cx, cy, rr, top, side in [(60, 190, 120, '#7ae05a', '#3aa83a'), (250, 196, 140, '#5ad04a', '#2a9030'), (160, 210, 110, '#9ae86a', '#4ab840')]:
        d.ellipse((cx - rr, cy - rr * 0.55, cx + rr, cy + rr * 0.55), fill=hexc(side))
        d.ellipse((cx - rr + 4, cy - rr * 0.55, cx + rr - 4, cy + rr * 0.5 - 6), fill=hexc(top))
        d.arc((cx - rr + 14, cy - rr * 0.5 + 3, cx + rr - 14, cy + rr * 0.5), 200, 250, fill=hexc('#e8ffd0'), width=2)
    for cx, cy, rr in [(30, 100, 9), (296, 76, 12), (270, 120, 6), (90, 64, 5)]:          # bubbles
        d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), outline=hexc('#ffffff'))
        d.arc((cx - rr + 2, cy - rr + 2, cx + rr - 2, cy + rr - 2), 200, 260, fill=hexc('#ffffff'))
    return im


def bg_gnash():
    """AFTER HOURS: a city at night in magenta, a skyline of neon windows, a big neon sign, wet rooftop."""
    a = bands([(0, '#060110'), (0.45, '#200632'), (0.8, '#6a0e5a'), (1, '#c02a7a')], y1=130)
    glow(a, 120, 128, 90, '#ff3aa8', 0.35)
    im = to_im(a); d = ImageDraw.Draw(im); stars(d, 30, '#ff9ad8', 9, 60)
    r = random.Random(11)
    for layer, col, win in [(0, '#1a0628', '#5a2a8a'), (1, '#0c0216', '#3af0ff')]:
        x = -4
        while x < 320:
            bw = 14 + r.randrange(22); bh = (40 if layer else 60) + r.randrange(50)
            top = 130 - bh + layer * 10
            d.rectangle((x, top, x + bw, 160), fill=hexc(col))
            for wy in range(top + 4, 150, 6):
                for wx in range(x + 3, x + bw - 2, 5):
                    if r.random() < 0.32: d.rectangle((wx, wy, wx + 1, wy + 2), fill=hexc(win if r.random() < 0.7 else '#c8ff3a'))
            x += bw + 2
    d.rectangle((228, 52, 296, 70), outline=hexc('#c8ff3a'), width=2)                       # a neon sign (no words, just a skull-ish X)
    d.line((240, 56, 252, 66), fill=hexc('#3af0ff'), width=2); d.line((252, 56, 240, 66), fill=hexc('#3af0ff'), width=2)
    d.line((272, 56, 284, 66), fill=hexc('#3af0ff'), width=2); d.line((284, 56, 272, 66), fill=hexc('#3af0ff'), width=2)
    d.rectangle((0, 156, 320, 180), fill=hexc('#08020e'))
    for x in range(0, 320, 3): d.point((x, 158 + (x * 7) % 4), fill=hexc('#ff4ab8' if x % 2 else '#3af0ff'))   # wet reflections
    return im


def bg_hanz():
    """HIS POLYGON ROOM (hanz_poly.py's own picture), shrunk to the backdrop's size."""
    im = Image.open(os.path.join(ROOT, 'public/assets/shop/lost/poly_room.png')).convert('RGBA')
    bgc = Image.new('RGBA', im.size, (40, 20, 70, 255)); bgc.alpha_composite(im)
    return bgc.resize((BG_W, BG_H), Image.NEAREST)


def bg_roster():
    """OPERATION REBIRTH: a stormy violet-to-orange sky, giant rays from the horizon, clouds lit from below."""
    a = bands([(0, '#0a0618'), (0.4, '#2a0e4a'), (0.7, '#8a2a6a'), (0.88, '#ff7a4a'), (1, '#ffd08a')], y1=150)
    rays(a, 160, 150, 16, '#ffb070', 0.3); glow(a, 160, 150, 90, '#ffd8a0', 0.6)
    im = to_im(a); d = ImageDraw.Draw(im); stars(d, 50, '#e8d8ff', 21, 60)
    cloud(d, 0, 50, 100, '#4a1a5a', '#c05a7a'); cloud(d, 220, 38, 110, '#4a1a5a', '#c05a7a')
    poly(d, [(0, 152), (50, 120), (90, 140), (130, 110), (170, 136), (220, 104), (270, 132), (320, 116), (320, 180), (0, 180)], '#160a24')
    d.rectangle((0, 160, 320, 180), fill=hexc('#0c0616'))
    return im


# ---------------------------------------------------------------------------------------------- the heroes
def outline(im, color=(10, 6, 18, 255)):
    """Adds a 1 px dark outline round a sprite (the comic-art edge that separates it from a busy backdrop)."""
    a = np.array(im); al = a[..., 3] > 0
    ring = np.zeros_like(al)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): ring |= np.roll(np.roll(al, dy, 0), dx, 1)
    ring &= ~al
    a[ring] = color
    return Image.fromarray(a)


def trim(im, pad=2):
    """Crops a sprite to its pixels (plus pad)."""
    bb = im.getbbox(); return im.crop((bb[0] - pad, bb[1] - pad, bb[2] + pad, bb[3] + pad))


def hero_from(fid, w, h, i):
    """The pose: frame i of the fighter's moves sheet, trimmed and outlined."""
    sheet = Image.open(os.path.join(FIGHTERS, fid, 'moves_sheet.png')).convert('RGBA'); cols = sheet.width // w
    fr = sheet.crop(((i % cols) * w, (i // cols) * h, (i % cols) * w + w, (i // cols) * h + h))
    return outline(trim(fr))


def hero_hanz():
    """HANZ & $@L: his whole-body render facing you, arms up to the sky (hanz_fight.py's `raise`, THE STARFALL)."""
    src = open(os.path.join(ROOT, 'src/scenes/lostFrames.js')).read()
    L = json.loads(src.split('LOST_FRAMES = ', 1)[1].rstrip().rstrip(';'))
    s = L['fight']['f']['raise']; f = s['frames'][-6]
    sheet = Image.open(os.path.join(ROOT, 'public/assets/shop/lost', s['sheets'][f['k']])).convert('RGBA')
    return outline(trim(sheet.crop((f['sx'], f['sy'], f['sx'] + f['w'], f['sy'] + f['h']))))


def hero_roster():
    """The three founders side by side: Lacy, Soul Summoner in front, Mr Wake."""
    a, b, c = hero_from(*POSES['hero-knight']), hero_from(*POSES['soul-summoner']), hero_from(*POSES['mr-wake'])
    W = a.width + b.width + c.width - 40; H = max(a.height, b.height, c.height)
    im = Image.new('RGBA', (W, H))
    im.alpha_composite(a, (0, H - a.height)); im.alpha_composite(c, (W - c.width, H - c.height)); im.alpha_composite(b, (a.width - 20, H - b.height))
    return im


SCREENS = {
    'roster': (bg_roster, hero_roster), 'soul-summoner': (bg_soul, None), 'mr-wake': (bg_wake, None),
    'hero-knight': (bg_lacy, None), 'nu': (bg_nu, None), 'aero': (bg_aero, None), 'gnash': (bg_gnash, None), 'hanz': (bg_hanz, hero_hanz),
}


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith('.png'): os.remove(os.path.join(OUT, f))
    previews = []
    for sid, (bgf, herof) in SCREENS.items():
        bg = bgf(); hero = herof() if herof else hero_from(*POSES[sid])
        bg.convert('RGB').quantize(255, dither=Image.NONE).save(os.path.join(OUT, sid + '_bg.png'), optimize=True)
        hero.save(os.path.join(OUT, sid + '_hero.png'), optimize=True)
        print(sid, bg.size, hero.size)
        if '--preview' in sys.argv:
            p = bg.resize((BG_W * 3, BG_H * 3), Image.NEAREST); k = int(BG_H * 3 * 0.78 / hero.height) or 1
            hh = hero.resize((hero.width * k, hero.height * k), Image.NEAREST)
            p.alpha_composite(hh, (int(BG_W * 3 * 0.66 - hh.width / 2), BG_H * 3 - hh.height - 20)); previews.append(p)
    if previews:
        sheet = Image.new('RGBA', (BG_W * 3 * 2, BG_H * 3 * 4))
        for i, p in enumerate(previews): sheet.paste(p, ((i % 2) * BG_W * 3, (i // 2) * BG_H * 3))
        sheet.save(sys.argv[sys.argv.index('--preview') + 1])


if __name__ == '__main__':
    main()

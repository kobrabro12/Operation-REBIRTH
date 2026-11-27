"""LOADING LEGENDS: ten more story loading screens - the bosses at home and the places worth the trip, each one big
painted picture (320x180) in the style of loading_stories.py: hall_paintings.py's kit (dithered skies, glows, ridges,
rays, rim-lit sprites from the fighters' real sheets) plus a few helpers of its own for depth - `layer` (a silhouette
band in a colour that fades toward the sky: atmospheric perspective), `fog` (a soft band of haze), `shaft` (a slanted
beam of light), `mist_ridge`. Every sprite at a whole-number scale, so nothing shimmers when the page blows it up.

The bosses are painted as they look in their arenas (src/stage/*BossStage.js), from the front, big against their skies:
THE CLOCKWORK COLOSSUS over the foundry at dusk, KING POLYGON over his peak, KARNAX on the burning keep, THORNWARD
asleep in the grove, BEIGE.EXE in the dark bedroom, SMUDGE in the blank canvas, THE PHANTOM MAESTRO on opening night;
and three places: FRACTURED in deep space, DUST RUNNER on the highway at sundown, JUNGLE FALLS at first light.

Writes public/assets/ui/loading/story-<id>_bg.png. Run after loading_screens.py (it clears the folder):
  python3 tools/sprites/loading_legends.py [--preview FILE]
"""
import os, sys, math
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
import hall_paintings as P

P.W, P.H = 320, 180                                   # (the kit reads these when it paints)
W, H = P.W, P.H
OUT = os.path.join(P.ROOT, 'public/assets/ui/loading')
hx = P.hexc


# ------------------------------------------------------------------ helpers for depth
def layer(cv, base, amp, col, seed, step=2, rough=0.08):
    """A silhouette band (hills, trees, a skyline) painted straight onto the canvas."""
    a = np.array(cv.convert('RGB')).astype(float)
    a = P.ridge(a, base, amp, col, seed, rough, step)
    return P.to_im(a)

def fog(cv, y0, y1, col, alpha=120):
    """A band of haze from y0 (clear) to its middle (thickest) to y1 (clear)."""
    ov = Image.new('RGBA', cv.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for y in range(int(y0), int(y1)):
        u = (y - y0) / max(1, y1 - y0); k = math.sin(u * math.pi)
        d.line([(0, y), (W, y)], fill=hx(col) + (int(alpha * k),))
    cv.alpha_composite(ov); return cv

def shaft(cv, x, top, w, slant, col, alpha=60, length=200):
    """A slanted beam of light from (x, top) down, widening a little, fading toward its foot."""
    ov = Image.new('RGBA', cv.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for i in range(length):
        k = 1 - i / length; ww = w * (1 + i / length)
        cx = x + slant * i
        d.line([(cx - ww / 2, top + i), (cx + ww / 2, top + i)], fill=hx(col) + (int(alpha * k),))
    cv.alpha_composite(ov); return cv

def over(cv, fn):
    """Draws fn(d) into a see-through layer (fills may carry alpha) and lays it over the canvas."""
    ov = Image.new('RGBA', cv.size, (0, 0, 0, 0)); fn(ImageDraw.Draw(ov)); cv.alpha_composite(ov); return cv

def motes(cv, n, cols, y0=0, y1=H, s=1, seed=1):
    """A scatter of glowing specks (embers, fireflies, dust in the light)."""
    r = np.random.default_rng(seed); d = P.draw(cv)
    for i in range(n):
        x, y = int(r.integers(0, W)), int(r.integers(y0, y1)); c = cols[i % len(cols)]
        d.point((x, y), fill=hx(c))
        if s > 1 and i % 4 == 0: P.sparkle(cv, x, y, c, s)
    return cv

def a(c, alpha): return hx(c) + (alpha,)


# ------------------------------------------------------------------ 1 THE CLOCKWORK COLOSSUS
def s_brass():
    """BRASS AT DUSK: the foundry district at sundown, chimneys smoking into an orange sky - and over the rooftops
    THE CLOCKWORK COLOSSUS straightens up: top-hat smokestack, cyclops lens, the furnace burning behind the clock-face
    in his chest, the wind-up key turning over his shoulder. On the nearest roof Lacy draws her sword."""
    img = P.sky(0x1a1030, 0x5a2a48, 0xc8543a, 0xf29a4a, 0xffd88a)
    img = P.radial(250, 150, 70, [0xfff4c0, 0xffc870, 0xf28a3a], img, 0.7)
    cv = P.to_im(img)
    P.rays(cv, 250, 150, 22, 0xffe0a0, 26, length=320)
    cx, top = 150, 22                                                                     # the Colossus
    C = 0x2a1a20
    over(cv, lambda d: (
        d.polygon([(cx - 70, 180), (cx - 64, 92), (cx - 40, 70), (cx + 40, 70), (cx + 64, 92), (cx + 70, 180)], fill=a(C, 255)),   # chest and body
        d.ellipse([cx - 92, 64, cx - 46, 104], fill=a(C, 255)), d.ellipse([cx + 46, 64, cx + 92, 104], fill=a(C, 255)),         # pauldrons
        d.polygon([(cx - 92, 90), (cx - 108, 150), (cx - 96, 180), (cx - 74, 180), (cx - 70, 100)], fill=a(C, 255)),             # arms
        d.polygon([(cx + 92, 90), (cx + 112, 140), (cx + 130, 150), (cx + 120, 164), (cx + 96, 152), (cx + 70, 100)], fill=a(C, 255)),
        d.rounded_rectangle([cx - 22, 34, cx + 22, 72], 6, fill=a(C, 255)),                                                     # head
        d.rectangle([cx - 16, top - 10, cx + 16, 36], fill=a(C, 255)), d.rectangle([cx - 24, 32, cx + 24, 38], fill=a(C, 255)),   # top hat stack
        d.rectangle([cx + 40, 30, cx + 50, 70], fill=a(C, 255)), d.rectangle([cx - 52, 36, cx - 42, 70], fill=a(C, 255)),       # shoulder stacks
        d.rectangle([cx - 72, 44, cx - 66, 76], fill=a(C, 255)), d.ellipse([cx - 84, 30, cx - 54, 50], outline=a(C, 255), width=5)))   # the key
    over(cv, lambda d: (d.line([(cx + 64, 92), (cx + 70, 180)], fill=a(0xffb04a, 180)), d.line([(cx + 22, 38), (cx + 22, 72)], fill=a(0xffc870, 200)),
                         d.line([(cx + 16, top - 10), (cx + 16, 32)], fill=a(0xffc870, 200)), d.arc([cx + 46, 64, cx + 92, 104], 270, 60, fill=a(0xffb04a, 220))))
    P.glow(cv, cx, 52, 22, 0xffb02a, 120); over(cv, lambda d: (d.ellipse([cx - 7, 45, cx + 7, 59], fill=a(0xffe070, 255)), d.ellipse([cx - 3, 49, cx + 3, 55], fill=a(0xffffff, 255))))   # cyclops lens
    P.glow(cv, cx, 112, 40, 0xff6a1a, 150)
    over(cv, lambda d: (d.ellipse([cx - 22, 90, cx + 22, 134], fill=a(0xff8a2a, 255)), d.ellipse([cx - 16, 96, cx + 16, 128], fill=a(0xffd060, 255)),
                         d.ellipse([cx - 22, 90, cx + 22, 134], outline=a(0xd8a040, 255), width=2),
                         *[d.line([(cx, 112), (cx + math.cos(t) * 13, 112 + math.sin(t) * 13)], fill=a(0x3a1a10, 255), width=2) for t in (0.4, 1.9, 3.5, 5.0)]))   # the heart behind the clock-face
    for sx, sy in ((cx, top - 10), (cx + 45, 30), (cx - 47, 36)):                         # smoke
        for k in range(7): over(cv, lambda d, k=k: d.ellipse([sx - 6 - k * 3 + k * 5, sy - 10 - k * 9, sx + 6 + k * 3 + k * 5, sy - k * 9], fill=a(0x5a3a4a, 150 - k * 15)))
    cv = fog(cv, 100, 160, 0xf2a050, 90)
    d = P.draw(cv); r = np.random.default_rng(4)                                          # the foundry rooftops
    x = -6
    while x < W:
        w = 18 + int(r.integers(0, 24)); h = 128 + int(r.integers(0, 22))
        d.rectangle([x, h, x + w, H], fill=hx(0x160c14)); d.polygon([(x - 2, h), (x + w // 2, h - 8), (x + w + 2, h)], fill=hx(0x160c14))
        if r.random() < 0.5: d.rectangle([x + 4, h - 26, x + 9, h], fill=hx(0x160c14))
        for wy in range(h + 6, H - 4, 8):
            for wx in range(x + 3, x + w - 3, 6):
                if r.random() < 0.3: d.rectangle([wx, wy, wx + 2, wy + 3], fill=hx(0xffb04a))
        x += w + 1
    d.polygon([(0, 180), (0, 160), (110, 156), (130, 180)], fill=hx(0x0a0608))                # the nearest roof
    P.put(cv, P.move('hk', 'taunt', 0.55), 60, 160, light=hx(0xffc870), side=1)
    motes(cv, 40, (0xffd060, 0xff8a2a), 90, 175, 2, 5)
    return P.grade(cv, 0xff8a4a, 0.07)


# ------------------------------------------------------------------ 2 KING POLYGON
def s_peak():
    """THE 64-BIT KING: a bright cartridge sky over POLYGON PEAK - faceted mountains, a checkerboard arena on its rock
    - and KING POLYGON's great faceted head rising behind it with diamond eyes and a crown, a gem gauntlet either side."""
    img = P.sky(0x2a5ad8, 0x4a8af0, 0x8ac8ff, 0xd8f0ff)
    cv = P.to_im(img); d = P.draw(cv)
    for x, y, w in ((20, 30, 60), (200, 20, 80), (110, 46, 44)):                         # blocky clouds
        for i in range(4): d.rectangle([x + i * w // 5, y - (i % 2) * 5, x + i * w // 5 + w // 3, y + 10], fill=hx(0xffffff))
        d.rectangle([x, y + 8, x + w, y + 12], fill=hx(0xc8e0ff))
    def facet_mtn(x0, x1, peak, base, cl, cd):
        mx = (x0 + x1) / 2
        d.polygon([(x0, base), (mx, peak), (mx, base)], fill=hx(cl)); d.polygon([(mx, peak), (x1, base), (mx, base)], fill=hx(cd))
        d.polygon([(mx - 6, peak + 10), (mx, peak), (mx + 6, peak + 10), (mx, peak + 6)], fill=hx(0xffffff))
    for x0, x1, pk, c1, c2 in ((-40, 90, 70, 0x6a7ad8, 0x4a5ab0), (230, 360, 64, 0x6a7ad8, 0x4a5ab0), (40, 160, 86, 0x5a9a6a, 0x3a7a4a), (180, 300, 90, 0x5a9a6a, 0x3a7a4a)):
        facet_mtn(x0, x1, pk, 140, c1, c2)
    kx, ky = 160, 72                                                                      # the King's head
    faces = [((kx - 40, ky - 30), (kx, ky - 44), (kx, ky), 0xc890ff), ((kx, ky - 44), (kx + 40, ky - 30), (kx, ky), 0x9a5ad8),
             ((kx - 40, ky - 30), (kx - 46, ky + 10), (kx, ky), 0xb070f0), ((kx + 40, ky - 30), (kx + 46, ky + 10), (kx, ky), 0x7a3ab8),
             ((kx - 46, ky + 10), (kx - 22, ky + 38), (kx, ky), 0x9a5ad8), ((kx + 46, ky + 10), (kx + 22, ky + 38), (kx, ky), 0x6a2aa0),
             ((kx - 22, ky + 38), (kx + 22, ky + 38), (kx, ky), 0x8a4ac8)]
    for p1, p2, p3, c in faces: d.polygon([p1, p2, p3], fill=hx(c))
    for p1, p2, p3, c in faces: d.line([p1, p2], fill=hx(0x3a1a6a))
    for s in (-1, 1):                                                                      # diamond eyes and brows
        ex = kx + s * 18; ey = ky - 6
        d.polygon([(ex, ey - 8), (ex + 6, ey), (ex, ey + 8), (ex - 6, ey)], fill=hx(0x3af0ff)); d.polygon([(ex, ey - 4), (ex + 3, ey), (ex, ey + 4), (ex - 3, ey)], fill=hx(0xffffff))
        d.polygon([(ex - 10, ey - 14 + s * 0), (ex + 10, ey - 18 if s > 0 else ey - 10), (ex + 10, ey - 14 if s > 0 else ey - 6), (ex - 10, ey - 10)], fill=hx(0x3a1a6a))
    d.polygon([(kx - 14, ky + 20), (kx + 14, ky + 20), (kx + 8, ky + 30), (kx - 8, ky + 30)], fill=hx(0x2a0a4a))       # the jaw
    crown = [(kx - 34, ky - 38), (kx - 30, ky - 62), (kx - 18, ky - 46), (kx - 8, ky - 70), (kx, ky - 50), (kx + 8, ky - 70), (kx + 18, ky - 46), (kx + 30, ky - 62), (kx + 34, ky - 38)]
    d.polygon(crown, fill=hx(0xffc83a)); d.polygon(crown[:5] + [(kx, ky - 40), (kx - 34, ky - 38)], fill=hx(0xffe07a))
    for gx, gy in ((kx - 30, ky - 62), (kx - 8, ky - 70), (kx + 8, ky - 70), (kx + 30, ky - 62)): d.ellipse([gx - 3, gy - 3, gx + 3, gy + 3], fill=hx(0xff3a6a))
    P.glow(cv, kx, ky, 80, 0xd8a0ff, 50)
    for s in (-1, 1):                                                                      # gem gauntlets
        gx, gy = kx + s * 112, 96
        d = P.draw(cv)
        d.polygon([(gx - 16, gy - 10), (gx, gy - 24), (gx + 16, gy - 10), (gx + 12, gy + 14), (gx - 12, gy + 14)], fill=hx(0x9a5ad8))
        d.polygon([(gx - 16, gy - 10), (gx, gy - 24), (gx, gy + 2)], fill=hx(0xc890ff))
        for f in range(4): d.polygon([(gx - 12 + f * 7, gy - 12), (gx - 8 + f * 7, gy - 28 - (f % 2) * 4), (gx - 4 + f * 7, gy - 12)], fill=hx(0xb070f0))
        d.polygon([(gx - 4, gy - 4), (gx, gy - 10), (gx + 4, gy - 4), (gx, gy + 2)], fill=hx(0x3af0ff))
    d = P.draw(cv)
    d.polygon([(40, 150), (60, 136), (260, 136), (280, 150), (250, 180), (70, 180)], fill=hx(0x6a4a3a))                  # the rock
    for i in range(10):                                                                     # the checkerboard
        for j in range(3):
            x0 = 70 + i * 18; y0 = 136 + j * 4
            d.rectangle([x0, y0, x0 + 17, y0 + 3], fill=hx(0xffffff if (i + j) % 2 else 0x3a8a4a))
    d.polygon([(40, 150), (60, 148), (260, 148), (280, 150), (250, 180), (70, 180)], fill=hx(0x4a3020))
    P.put(cv, P.strip('nu/idle_sheet.png', 4), 92, 137, light=hx(0xffffff), side=-1)
    P.put(cv, P.strip('aero/idle_sheet.png', 6), 228, 137, flip=True, light=hx(0xffffff), side=1)
    for i in range(16): P.sparkle(cv, int(P.rng.integers(20, 300)), int(P.rng.integers(10, 120)), 0xffffff, 1)
    return P.grade(cv, 0x8a6ad8, 0.05, vig=0.25)


# ------------------------------------------------------------------ 3 KARNAX
def s_keep():
    """THE MAD BLADE: a red moon over black mountains and a burning town; on the battlement of the keep KARNAX stands
    with his wings half open and his long blade down, his heart burning behind his ribs. Embers everywhere."""
    img = P.sky(0x08020a, 0x2a0612, 0x6a0e14, 0xb02a1a, 0xff6a2a)
    img = P.radial(214, 52, 34, [0xffd0b0, 0xff4a3a, 0xb0141a], img, 1, 1.0)
    cv = P.to_im(img)
    P.glow(cv, 214, 52, 70, 0xff2a1a, 90)
    cv = layer(cv, 118, 14, 0x1a0408, 3, step=3)
    d = P.draw(cv); r = np.random.default_rng(9)                                            # the burning town
    for i in range(26):
        x = int(r.integers(0, W)); w = 6 + int(r.integers(0, 10)); h = 124 + int(r.integers(0, 10))
        d.rectangle([x, h, x + w, 150], fill=hx(0x10030a)); d.polygon([(x - 1, h), (x + w / 2, h - 6), (x + w + 1, h)], fill=hx(0x10030a))
        if r.random() < 0.4: d.rectangle([x + 2, h + 4, x + 3, h + 6], fill=hx(0xffa03a))
    for fx in (40, 96, 250, 296):
        P.glow(cv, fx, 128, 22, 0xff7a1a, 120)
        for k in range(6): over(cv, lambda d, k=k: d.ellipse([fx - 8 + k * 3, 110 - k * 12, fx + 8 + k * 5, 124 - k * 12], fill=a(0x2a0a0e, 120 - k * 15)))
    cv = fog(cv, 120, 150, 0xff5a2a, 80)
    d = P.draw(cv)
    d.rectangle([0, 146, W, H], fill=hx(0x0c0408))                                            # the battlement
    for x in range(0, W, 22): d.rectangle([x, 136, x + 12, 146], fill=hx(0x0c0408))
    d.line([(0, 146), (W, 146)], fill=hx(0x5a1a14))
    cx = 150                                                                                   # KARNAX
    K = 0x0a0306
    over(cv, lambda d: [d.line([(cx + dx, 50), (cx + dx * 2.2, 74 + abs(dx))], fill=a(0xd8d0c8, 255), width=2) for dx in (-9, -6, -3, 3, 6, 9)])   # the wild white mane, behind his head
    over(cv, lambda d: (
        d.polygon([(cx - 10, 70), (cx - 60, 40), (cx - 96, 56), (cx - 84, 66), (cx - 104, 82), (cx - 78, 84), (cx - 88, 104), (cx - 40, 92), (cx - 10, 96)], fill=a(K, 255)),   # wings
        d.polygon([(cx + 10, 70), (cx + 60, 40), (cx + 96, 56), (cx + 84, 66), (cx + 104, 82), (cx + 78, 84), (cx + 88, 104), (cx + 40, 92), (cx + 10, 96)], fill=a(K, 255)),
        d.polygon([(cx - 16, 66), (cx + 16, 66), (cx + 20, 108), (cx - 20, 108)], fill=a(K, 255)),                          # torso
        d.polygon([(cx - 16, 104), (cx - 26, 124), (cx - 18, 140), (cx - 24, 146), (cx - 12, 146), (cx - 8, 124), (cx, 108)], fill=a(K, 255)),   # goat legs
        d.polygon([(cx + 16, 104), (cx + 26, 124), (cx + 18, 140), (cx + 24, 146), (cx + 12, 146), (cx + 8, 124), (cx, 108)], fill=a(K, 255)),
        d.ellipse([cx - 11, 46, cx + 11, 68], fill=a(K, 255)),                                                              # head
        d.polygon([(cx - 8, 50), (cx - 24, 34), (cx - 30, 40), (cx - 26, 22), (cx - 16, 30), (cx - 4, 48)], fill=a(K, 255)),  # horns
        d.polygon([(cx + 8, 50), (cx + 24, 34), (cx + 30, 40), (cx + 26, 22), (cx + 16, 30), (cx + 4, 48)], fill=a(K, 255)),
        d.polygon([(cx + 18, 70), (cx + 30, 92), (cx + 34, 98), (cx + 26, 98), (cx + 14, 76)], fill=a(K, 255)),             # sword arm
        d.polygon([(cx + 28, 96), (cx + 34, 96), (cx + 54, 146), (cx + 48, 146)], fill=a(0x1a0a0e, 255)),                     # the blade
        d.polygon([(cx - 18, 70), (cx - 30, 92), (cx - 26, 100), (cx - 14, 80)], fill=a(K, 255))))
    over(cv, lambda d: (d.line([(cx + 34, 96), (cx + 54, 146)], fill=a(0xff6a3a, 255)), d.line([(cx + 16, 66), (cx + 20, 108)], fill=a(0xff4a2a, 200)),
                         d.line([(cx + 60, 40), (cx + 96, 56)], fill=a(0xff4a2a, 220)), d.line([(cx + 96, 56), (cx + 104, 82)], fill=a(0xff6a2a, 200)),
                         d.arc([cx - 11, 46, cx + 11, 68], 290, 80, fill=a(0xff6a3a, 230))))
    for x in (-6, 6): over(cv, lambda d, x=x: d.ellipse([cx + x - 2, 54, cx + x + 2, 57], fill=a(0xffe070, 255)))       # his eyes
    P.glow(cv, cx, 84, 14, 0xff3a1a, 200); over(cv, lambda d: (d.ellipse([cx - 4, 80, cx + 4, 88], fill=a(0xffb040, 255)), d.line([(cx - 10, 84), (cx - 4, 84)], fill=a(0xff5a2a, 255)), d.line([(cx + 4, 84), (cx + 12, 90)], fill=a(0xff5a2a, 255))))
    P.put(cv, P.silhouette(P.strip('soul-summoner/idle_sheet.png', 2), (12, 4, 8)), 34, 146, light=hx(0xff6a3a), side=1)
    motes(cv, 70, (0xffb040, 0xff5a1a, 0xffe08a), 0, 170, 2, 8)
    return P.grade(cv, 0xb0141a, 0.08)


# ------------------------------------------------------------------ 4 THORNWARD
def s_grove():
    """THE ROOTBOUND KNIGHT: a misty forest clearing at morning, beams of light slanting through the trunks - and
    THORNWARD kneeling in the middle of it on his maul, roots grown over his armour, moss on his cloak, his antlered
    helm bowed and the slit in it glowing. Fireflies. A ruined arch behind him."""
    img = P.sky(0x0a1a14, 0x1a3a2a, 0x3a6a4a, 0x8ab88a)
    cv = P.to_im(img)
    r = np.random.default_rng(12)
    for depth, col, n in ((0, 0x2a4a3a, 14), (1, 0x1a3428, 10), (2, 0x0e2018, 7)):         # trunks, fading into the mist
        d = P.draw(cv)
        for i in range(n):
            x = int(r.integers(-10, W)); w = 6 + depth * 6 + int(r.integers(0, 6))
            d.rectangle([x, 0, x + w, 150], fill=hx(col)); d.line([(x + 1, 0), (x + 1, 150)], fill=hx(col + 0x0a0a0a))
        cv = fog(cv, 40 + depth * 20, 170, 0x9ad0a8, 70 - depth * 15)
    for x, sl in ((70, 0.3), (130, 0.35), (210, 0.3), (250, 0.32)): shaft(cv, x, 0, 10, sl, 0xf0ffc8, 46, 170)
    d = P.draw(cv)
    d.arc([206, 50, 300, 170], 180, 360, fill=hx(0x3a4a42), width=10)                       # the ruined arch and its sigil
    d.rectangle([206, 110, 216, 150], fill=hx(0x3a4a42)); d.rectangle([290, 110, 300, 150], fill=hx(0x3a4a42))
    P.glow(cv, 253, 60, 10, 0x7aff9a, 140); d = P.draw(cv); d.ellipse([249, 56, 257, 64], outline=hx(0xd0ffd8))
    cv = layer(cv, 146, 4, 0x1a2a14, 21, step=2)
    d = P.draw(cv)
    cx = 132                                                                                  # THORNWARD, kneeling
    for c, pts in ((0x2a4a24, [(cx - 30, 70), (cx + 26, 70), (cx + 40, 146), (cx - 44, 146)]),                         # moss cloak
                   (0x4a5a52, [(cx - 18, 66), (cx + 18, 66), (cx + 20, 112), (cx - 20, 112)]),                          # plate
                   (0x3a4a42, [(cx - 20, 108), (cx + 30, 120), (cx + 34, 146), (cx + 6, 146), (cx, 126), (cx - 26, 146), (cx - 34, 146)])):
        d.polygon(pts, fill=hx(c))
    d.rectangle([cx - 20, 84, cx + 20, 88], fill=hx(0x8a6a3a))                                 # bronze band
    d.rounded_rectangle([cx - 14, 40, cx + 14, 70], 6, fill=hx(0x4a5a52))                       # the great helm (bowed)
    d.rectangle([cx - 10, 54, cx + 10, 57], fill=hx(0x0a120e)); d.line([(cx - 9, 55), (cx + 9, 55)], fill=hx(0x9aff7a))
    P.glow(cv, cx, 56, 14, 0x9aff7a, 90); d = P.draw(cv)
    for s in (-1, 1):                                                                          # antlers
        pts = [(cx + s * 10, 42), (cx + s * 22, 26), (cx + s * 30, 14), (cx + s * 36, 4)]
        d.line(pts, fill=hx(0x8a7a5a), width=3)
        for (bx, by), (lx, ly) in (((cx + s * 22, 26), (cx + s * 34, 24)), ((cx + s * 28, 16), (cx + s * 22, 4))): d.line([(bx, by), (lx, ly)], fill=hx(0x8a7a5a), width=2)
    d.line([(cx + 30, 76), (cx + 44, 146)], fill=hx(0x5a4a3a), width=4)                         # the maul's haft
    d.rounded_rectangle([cx + 32, 132, cx + 60, 150], 3, fill=hx(0x3a4a42))
    for i in range(14):                                                                         # roots wound over him
        t = i / 14; x0 = cx - 20 + t * 40
        d.line([(x0, 70 + (i % 3) * 10), (x0 + 6, 80 + (i % 3) * 12), (x0 - 2, 96 + (i % 2) * 8)], fill=hx(0x6a5030), width=2)
    for x, y in ((cx - 18, 66), (cx + 18, 66), (cx - 22, 108), (cx + 30, 118)): d.ellipse([x - 3, y - 3, x + 3, y + 1], fill=hx(0x6ac84a))   # leaves at the joints
    over(cv, lambda d: (d.line([(cx - 30, 70), (cx - 44, 146)], fill=a(0xf0ffc8, 140)), d.arc([cx - 14, 40, cx + 14, 70], 180, 270, fill=a(0xf0ffc8, 180))))
    d = P.draw(cv)
    for x, c in ((60, 0xb8f0ff), (90, 0xff9ad8), (196, 0xffe07a), (290, 0xb8f0ff)): d.ellipse([x - 2, 146, x + 2, 150], fill=hx(c)); d.line([(x, 150), (x, 156)], fill=hx(0x3a6a2a))   # flowers
    for x in (34, 280):
        d.ellipse([x - 6, 140, x + 6, 148], fill=hx(0x5ad8ff)); d.rectangle([x - 1, 148, x + 1, 156], fill=hx(0xd8e8d0)); P.glow(cv, x, 144, 14, 0x5ad8ff, 90); d = P.draw(cv)   # glowing mushrooms
    d.rectangle([0, 154, W, H], fill=hx(0x0e1a0e))
    P.put(cv, P.strip('lumen/idle_sheet.png', 2), 262, 154, flip=True, light=hx(0xf0ffc8), side=-1)
    motes(cv, 50, (0xe8ff7a, 0xb8ff9a), 50, 150, 2, 13)
    return P.grade(cv, 0x3a8a5a, 0.07)


# ------------------------------------------------------------------ 5 BEIGE.EXE
def s_machine():
    """THE OLD MACHINE: a bedroom at night, the only light a fat old computer on the desk - its green screen showing
    a pixel face that has just noticed you. The light spills over the keyboard and the posters; the street outside is
    blue; the lava lamp glows."""
    img = P.sky(0x06060e, 0x0c0c1a, 0x141424)
    cv = P.to_im(img); d = P.draw(cv)
    for x in range(0, W, 12): d.rectangle([x, 0, x + 5, 120], fill=hx(0x101020))                  # striped wallpaper
    d.rectangle([22, 24, 92, 84], fill=hx(0x1a2a5a))                                                # the window: a blue street
    for x, y, w, h in ((24, 52, 16, 32), (42, 40, 20, 44), (64, 58, 26, 26)): d.rectangle([x, y, x + w, y + h], fill=hx(0x0e1638))
    for x, y in ((30, 60), (48, 48), (54, 60), (72, 66), (80, 66)): d.rectangle([x, y, x + 2, y + 3], fill=hx(0xffd88a))
    d.ellipse([74, 30, 84, 40], fill=hx(0xe8f0ff)); d.line([(57, 24), (57, 84)], fill=hx(0x2a1e2a), width=2); d.line([(22, 54), (92, 54)], fill=hx(0x2a1e2a), width=2)
    d.rectangle([14, 20, 22, 92], fill=hx(0x3a1a2a)); d.rectangle([92, 20, 100, 92], fill=hx(0x3a1a2a))   # curtains
    d.rectangle([244, 18, 280, 62], fill=hx(0x2a1a3a)); d.rectangle([248, 22, 276, 58], fill=hx(0x5a2a6a))   # a poster (a rocket)
    d.polygon([(262, 26), (268, 40), (256, 40)], fill=hx(0xff9a4a)); d.rectangle([258, 40, 266, 52], fill=hx(0xd8d8e0))
    d.rectangle([286, 30, 312, 60], fill=hx(0x3a2a1a)); [d.rectangle([288 + i * 6, 32 + (i % 2) * 6, 292 + i * 6, 40 + (i % 2) * 6], fill=hx(c)) for i, c in enumerate((0xffe07a, 0x7af0ff, 0xff7a9a, 0xb0ff7a))]   # a corkboard
    d.rectangle([0, 120, W, H], fill=hx(0x1a120e))                                                   # the desk
    d.rectangle([0, 118, W, 122], fill=hx(0x2a1c14))
    cx = 172
    P.glow(cv, cx, 80, 120, 0x3aff7a, 60); P.glow(cv, cx, 80, 60, 0x7aff9a, 50)
    d = P.draw(cv)
    d.rounded_rectangle([cx - 46, 30, cx + 46, 112], 8, fill=hx(0xd8ccaa))                          # the CRT
    d.polygon([(cx - 40, 112), (cx + 40, 112), (cx + 28, 120), (cx - 28, 120)], fill=hx(0xb8ac8a))
    d.rounded_rectangle([cx - 36, 38, cx + 36, 96], 6, fill=hx(0x0a2a12))
    for y in range(40, 95, 2): d.line([(cx - 34, y), (cx + 34, y)], fill=hx(0x0e3418))
    for (ex, ey) in ((cx - 14, 56), (cx + 10, 56)): d.rectangle([ex, ey, ex + 5, ey + 8], fill=hx(0x7aff9a))   # its face
    d.rectangle([cx - 14, 76, cx + 14, 78], fill=hx(0x7aff9a)); d.rectangle([cx - 16, 72, cx - 14, 76], fill=hx(0x7aff9a)); d.rectangle([cx + 14, 72, cx + 16, 76], fill=hx(0x7aff9a))
    d.rectangle([cx + 28, 102, cx + 32, 104], fill=hx(0x7aff3a))
    d.rectangle([cx + 56, 50, cx + 86, 120], fill=hx(0xc8bc9a)); d.rectangle([cx + 60, 60, cx + 82, 64], fill=hx(0x8a806a)); d.rectangle([cx + 76, 106, cx + 80, 108], fill=hx(0xff4a2a))   # the tower
    d.polygon([(cx - 58, 132), (cx + 52, 132), (cx + 60, 146), (cx - 66, 146)], fill=hx(0xc8bc9a))    # the keyboard, lit green
    for j in range(3):
        for i in range(14): d.rectangle([cx - 58 + i * 8 + j * 2, 134 + j * 4, cx - 53 + i * 8 + j * 2, 136 + j * 4], fill=hx(0x9a907a))
    over(cv, lambda d: d.polygon([(cx - 58, 132), (cx + 52, 132), (cx + 60, 146), (cx - 66, 146)], fill=a(0x3aff7a, 40)))
    d = P.draw(cv)
    d.rectangle([cx + 70, 138, cx + 82, 152], fill=hx(0xd8ccaa)); d.line([(cx + 76, 138), (cx + 60, 124)], fill=hx(0x3a3020))   # the mouse
    lx = 52                                                                                           # the lava lamp
    d.polygon([(lx - 6, 120), (lx + 6, 120), (lx + 4, 106), (lx - 4, 106)], fill=hx(0x3a3a4a)); d.polygon([(lx - 4, 106), (lx + 4, 106), (lx + 6, 80), (lx - 6, 80)], fill=hx(0xff5a8a))
    d.ellipse([lx - 3, 84, lx + 2, 92], fill=hx(0xffd04a)); d.ellipse([lx - 2, 96, lx + 3, 102], fill=hx(0xffd04a))
    P.glow(cv, lx, 92, 26, 0xff5a8a, 70)
    d = P.draw(cv)
    d.rectangle([92, 124, 110, 136], fill=hx(0xe8e0d0)); d.rectangle([94, 120, 108, 124], fill=hx(0x3a6aff)); d.rectangle([96, 112, 98, 122], fill=hx(0xff4a4a)); d.rectangle([102, 110, 104, 122], fill=hx(0x4aff4a))   # a mug of pens
    for x, w in ((14, 40), (230, 50)): d.rectangle([x, 138, x + w, 141], fill=hx(0xd8d0c0))           # papers
    d.rectangle([0, 152, W, H], fill=hx(0x120c08))
    return P.grade(cv, 0x2a8a4a, 0.06)


# ------------------------------------------------------------------ 6 SMUDGE
def s_canvas():
    """WET PAINT: inside the blank canvas, a white floor of tiles running off to forever, giant balls and cubes
    hanging in the air - and splashed across all of it, every colour at once. SMUDGE, the little master, stands on a
    paint pot with his bucket on his head and a brush taller than he is, admiring his work."""
    img = P.sky(0xf4efe4, 0xece4d4, 0xe0d6c4)
    cv = P.to_im(img); d = P.draw(cv)
    hzn, vx = 96, 160
    for i in range(-20, 21):                                                                         # the tile floor in perspective
        d.line([(vx, hzn), (vx + i * 40, H + 40)], fill=hx(0xcfc4b0))
    for k in range(1, 10):
        y = hzn + (H - hzn) * (k / 9) ** 1.8; d.line([(0, y), (W, y)], fill=hx(0xcfc4b0))
    d.rectangle([0, hzn - 1, W, hzn], fill=hx(0xd8ccb8))
    for x, y, rr, c in ((60, 50, 18, 0xe8e0d0), (250, 36, 24, 0xe8e0d0), (200, 74, 10, 0xe8e0d0)):    # balls in the air
        d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=hx(c)); d.ellipse([x - rr + 3, y - rr + 3, x, y], fill=hx(0xffffff))
        d.arc([x - rr, y - rr, x + rr, y + rr], 0, 120, fill=hx(0xb8ac98), width=2)
    for x, y, s in ((120, 30, 16), (290, 80, 10), (24, 88, 12)):                                      # cubes in the air
        d.polygon([(x, y), (x + s, y - s // 2), (x + 2 * s, y), (x + s, y + s // 2)], fill=hx(0xffffff))
        d.polygon([(x, y), (x + s, y + s // 2), (x + s, y + s * 3 // 2), (x, y + s)], fill=hx(0xd8ccb8))
        d.polygon([(x + s, y + s // 2), (x + 2 * s, y), (x + 2 * s, y + s), (x + s, y + s * 3 // 2)], fill=hx(0xc0b49e))
    r = np.random.default_rng(31)
    def splat(x, y, rr, c):
        """A paint splat: a blob, smaller blobs round it, a few drips running down."""
        d = P.draw(cv); d.ellipse([x - rr, y - rr * 0.7, x + rr, y + rr * 0.7], fill=hx(c))
        for k in range(9):
            ang = r.uniform(0, 6.3); dist = rr * r.uniform(0.9, 1.8); s = rr * r.uniform(0.1, 0.3)
            d.ellipse([x + math.cos(ang) * dist - s, y + math.sin(ang) * dist * 0.7 - s, x + math.cos(ang) * dist + s, y + math.sin(ang) * dist * 0.7 + s], fill=hx(c))
        for k in range(3):
            dx = r.uniform(-rr * 0.6, rr * 0.6); ln = r.uniform(4, 16); d.line([(x + dx, y), (x + dx, y + ln)], fill=hx(c), width=2); d.ellipse([x + dx - 2, y + ln - 1, x + dx + 2, y + ln + 3], fill=hx(c))
    for x, y, rr, c in ((40, 140, 22, 0xff3a5a), (110, 160, 16, 0x3a8aff), (230, 150, 26, 0xffd23a), (290, 130, 14, 0x3ad87a), (180, 120, 10, 0xff8a2a),
                        (60, 30, 8, 0x3a8aff), (250, 36, 9, 0xff3a5a), (130, 70, 7, 0xb04aff), (300, 20, 12, 0xffd23a)):
        splat(x, y, rr, c)
    over(cv, lambda d: [d.arc([20 + i * 4, 40 + i * 3, 300 - i * 4, 210 - i * 3], 200, 340, fill=a(c, 255), width=3) for i, c in enumerate((0xff3a5a, 0xff8a2a, 0xffd23a, 0x3ad87a, 0x3a8aff, 0xb04aff))])   # a rainbow brush-stroke
    d = P.draw(cv); sx = 160                                                                          # SMUDGE on his paint pot
    d.rectangle([sx - 14, 134, sx + 14, 158], fill=hx(0x8a8a9a)); d.ellipse([sx - 14, 130, sx + 14, 138], fill=hx(0xb0b0c0)); d.ellipse([sx - 11, 131, sx + 11, 137], fill=hx(0xff3a5a))
    d.line([(sx - 14, 150), (sx - 16, 158)], fill=hx(0xff3a5a), width=2)
    d.rectangle([sx - 6, 112, sx + 6, 132], fill=hx(0x2a2a3a))                                          # smock and legs
    d.rectangle([sx - 7, 96, sx + 7, 114], fill=hx(0xf0ece0)); [d.point((sx - 4 + i * 2, 100 + (i * 5) % 12), fill=hx(c)) for i, c in enumerate((0xff3a5a, 0x3a8aff, 0xffd23a, 0x3ad87a, 0xb04aff))]
    d.ellipse([sx - 6, 82, sx + 6, 96], fill=hx(0xf0c09a)); d.point((sx - 2, 89), fill=hx(0x14101c)); d.point((sx + 3, 89), fill=hx(0x14101c))
    d.polygon([(sx - 9, 84), (sx + 9, 84), (sx + 7, 72), (sx - 7, 72)], fill=hx(0x8a8a9a)); d.arc([sx - 7, 66, sx + 7, 80], 180, 360, fill=hx(0x5a5a6a))   # the bucket head
    d.line([(sx - 9, 84), (sx - 12, 90)], fill=hx(0x3a8aff), width=2)
    d.line([(sx + 6, 100), (sx + 22, 54)], fill=hx(0x8a5a3a), width=3); d.polygon([(sx + 20, 58), (sx + 26, 42), (sx + 30, 46), (sx + 26, 60)], fill=hx(0xff3a5a))   # the brush
    return P.grade(cv, 0xf2e0c0, 0.04, vig=0.2, contrast=1.04)


# ------------------------------------------------------------------ 7 THE PHANTOM MAESTRO
def s_opera():
    """OPENING NIGHT: the grand opera from the stage - the horseshoe of gold balconies full of pale ghosts, the great
    chandelier, and in one white spotlight over the orchestra pit THE PHANTOM MAESTRO, his crimson-lined cape flung
    open like wings, the porcelain half-mask catching the light."""
    img = P.sky(0x0a0408, 0x1a060e, 0x2a0a14)
    cv = P.to_im(img); d = P.draw(cv)
    for tier in range(4):                                                                             # the balconies
        y = 30 + tier * 26; rr = 200 - tier * 18
        d.arc([160 - rr, y - 40, 160 + rr, y + 60], 0, 180, fill=hx(0xc8963a), width=3)
        d.arc([160 - rr, y - 36, 160 + rr, y + 66], 0, 180, fill=hx(0x4a0e1a), width=6)
        for k in range(28):                                                                          # the ghost audience
            t = k / 27 * math.pi; gx = 160 + math.cos(t) * (rr - 4); gy = y + 10 + math.sin(t) * 46
            if 0 < gy < 150 and k % 2 == tier % 2: d.ellipse([gx - 2, gy - 4, gx + 2, gy], fill=hx(0xd8e0ff)); d.point((gx - 1, gy - 3), fill=hx(0x2a2a4a)); d.point((gx + 1, gy - 3), fill=hx(0x2a2a4a))
    cx = 160; P.glow(cv, cx, 18, 40, 0xffe0a0, 90); d = P.draw(cv)                                         # the chandelier
    for k in range(3): d.arc([cx - 30 + k * 6, 6 + k * 6, cx + 30 - k * 6, 26 + k * 4], 0, 180, fill=hx(0xffd06a), width=1)
    for k in range(9): d.point((cx - 26 + k * 6.5, 18 + (k % 2) * 4), fill=hx(0xffffff))
    d.line([(cx, 0), (cx, 8)], fill=hx(0xc8963a))
    for s in (-1, 1):                                                                                  # the curtains
        pts = [(160 + s * 160, 0), (160 + s * 120, 0)] + [(160 + s * (118 - 10 * math.sin(y / 14) - y * 0.12), y) for y in range(0, 181, 6)] + [(160 + s * 160, 180)]
        d.polygon(pts, fill=hx(0x8a0e1e))
        for k in range(5): d.line([(160 + s * (128 + k * 6), 0), (160 + s * (140 + k * 4), 180)], fill=hx(0x5a0612))
        d.line([(160 + s * 118, 0), (160 + s * 96, 180)], fill=hx(0xd8a04a))
    d.polygon([(40, 0), (280, 0), (270, 12), (50, 12)], fill=hx(0x6a0a18)); [d.arc([46 + k * 24, -6, 70 + k * 24, 16], 0, 180, fill=hx(0x8a0e1e), width=3) for k in range(10)]   # the valance
    shaft(cv, cx, 0, 30, 0, 0xffffff, 40, 150)
    P.glow(cv, cx, 90, 40, 0xffffff, 60)
    d = P.draw(cv); py = 70                                                                            # the Maestro
    def wing(sd, grow, col):
        """One side of the cape flung open: a curve up and out from his shoulder, a scalloped hem back down to him."""
        top = [(cx + sd * (6 + t * 84 * grow), py - math.sin(t * math.pi * 0.9) * 26 * grow) for t in np.linspace(0, 1, 14)]
        hem = []
        for j, t in enumerate(np.linspace(1, 0, 12)):
            x = cx + sd * (8 + t * 84 * grow); y = py + 20 + (1 - t) * 40 + t * 30 * grow + (5 if j % 2 else 0)
            hem.append((x, y))
        return top + hem
    over(cv, lambda d: (d.polygon(wing(-1, 1.0, 0), fill=a(0x0a0406, 255)), d.polygon(wing(1, 1.0, 0), fill=a(0x0a0406, 255)),
                         d.polygon(wing(-1, 0.86, 0), fill=a(0xb0142a, 255)), d.polygon(wing(1, 0.86, 0), fill=a(0xb0142a, 255))))
    over(cv, lambda d: [d.line([(cx + sd * 10, py + 8), (cx + sd * 70, py - 12 + j * 14)], fill=a(0x7a0a1a, 255)) for sd in (-1, 1) for j in range(4)])   # folds in the lining
    d = P.draw(cv)
    d.polygon([(cx - 12, py), (cx + 12, py), (cx + 14, py + 50), (cx + 4, py + 66), (cx - 4, py + 66), (cx - 14, py + 50)], fill=hx(0x101018))   # tailcoat
    d.polygon([(cx - 5, py), (cx + 5, py), (cx + 3, py + 30), (cx - 3, py + 30)], fill=hx(0xf0f0f4)); d.polygon([(cx - 4, py + 2), (cx, py + 6), (cx + 4, py + 2)], fill=hx(0x101018))   # white tie
    d.ellipse([cx + 4, py + 8, cx + 8, py + 12], fill=hx(0xff2a3a))                                    # the rose
    d.polygon([(cx - 14, py - 4), (cx - 18, py - 20), (cx - 8, py - 4)], fill=hx(0x101018)); d.polygon([(cx + 14, py - 4), (cx + 18, py - 20), (cx + 8, py - 4)], fill=hx(0x101018))   # high collar
    d.ellipse([cx - 9, py - 24, cx + 9, py - 2], fill=hx(0xe8d0c0)); d.pieslice([cx - 10, py - 28, cx + 10, py - 8], 180, 360, fill=hx(0x101014))   # head, slicked hair
    d.chord([cx - 9, py - 24, cx + 9, py - 2], 270, 90, fill=hx(0xffffff)); d.ellipse([cx + 2, py - 16, cx + 6, py - 12], fill=hx(0xf2c84a)); d.point((cx - 4, py - 14), fill=hx(0x2a1018))   # the half-mask, gold eye
    for s in (-1, 1): d.line([(cx + s * 12, py + 6), (cx + s * 34, py - 14)], fill=hx(0x101018), width=3); d.ellipse([cx + s * 34 - 2, py - 16, cx + s * 34 + 2, py - 12], fill=hx(0xffffff))
    d.line([(cx + 34, py - 14), (cx + 46, py - 34)], fill=hx(0xffffff))                                   # the baton
    d.rectangle([0, 156, W, H], fill=hx(0x1a0a08)); d.rectangle([0, 154, W, 156], fill=hx(0x6a3a14))     # the stage edge, footlights
    for x in range(14, W, 22): d.ellipse([x - 2, 150, x + 2, 154], fill=hx(0xffe8a0)); P.glow(cv, x, 150, 8, 0xffd080, 80); d = P.draw(cv)
    motes(cv, 30, (0xffe8a0, 0xffffff), 20, 150, 1, 19)
    return P.grade(cv, 0x8a0e1e, 0.06)


# ------------------------------------------------------------------ 8 FRACTURED
def s_fractured():
    """THE GALAXY FRAGMENT: deep space, a spiral of nebula in violet and teal - and in the middle of it the crystal
    island of FRACTURED floating on its own light, shards drifting off it, two fighters tiny on its top."""
    img = P.sky(0x02010a, 0x080420, 0x120836, 0x0a1a3a)
    img = P.stars(img, 260, 41, (0xffffff, 0xc8d8ff, 0xffd8f8), 1.0)
    cv = P.to_im(img)
    for k in range(60):                                                                                # the nebula: a spiral of soft blobs
        t = k / 60 * 4.2; rr = 20 + t * 26; x = 160 + math.cos(t * 1.5) * rr * 1.4; y = 80 + math.sin(t * 1.5) * rr * 0.6
        P.glow(cv, x, y, 24 + k * 0.4, (0x9a3aff, 0x3ad8ff, 0xff5ac8)[k % 3], 34)
    P.glow(cv, 160, 90, 60, 0xc8a0ff, 70)
    d = P.draw(cv); cx, ty = 160, 104                                                                  # the crystal island
    facets = [((cx - 70, ty), (cx - 30, ty + 36), (cx, ty), 0x7a4ad8), ((cx, ty), (cx - 30, ty + 36), (cx + 6, ty + 64), 0x5a2ab0),
              ((cx, ty), (cx + 6, ty + 64), (cx + 40, ty + 30), 0x3a1a8a), ((cx, ty), (cx + 40, ty + 30), (cx + 72, ty), 0x6a3ac8),
              ((cx - 30, ty + 36), (cx - 10, ty + 76), (cx + 6, ty + 64), 0x2a1270)]
    for p1, p2, p3, c in facets: d.polygon([p1, p2, p3], fill=hx(c)); d.line([p1, p2], fill=hx(0xc8a0ff))
    d.polygon([(cx - 70, ty), (cx - 50, ty - 6), (cx + 50, ty - 6), (cx + 72, ty)], fill=hx(0x9ae8ff))   # its glowing top
    d.line([(cx - 70, ty), (cx + 72, ty)], fill=hx(0xffffff))
    for x, h in ((cx - 44, 22), (cx + 30, 30), (cx + 52, 14), (cx - 20, 12)):                          # crystal spires
        d.polygon([(x - 4, ty - 4), (x, ty - 4 - h), (x + 4, ty - 4)], fill=hx(0xb8f0ff)); d.line([(x, ty - 4 - h), (x + 4, ty - 4)], fill=hx(0x5aa8d8))
    P.glow(cv, cx, ty + 30, 60, 0x9a6aff, 60)
    for i in range(18):                                                                                # shards drifting off it
        x = int(P.rng.integers(40, 280)); y = int(P.rng.integers(20, 170)); s = int(P.rng.integers(2, 6))
        d = P.draw(cv); d.polygon([(x, y - s), (x + s // 2 + 1, y), (x, y + s), (x - s // 2 - 1, y)], fill=hx((0xb8f0ff, 0xd8a0ff, 0xff9ae8)[i % 3]))
    P.put(cv, P.strip('vanta/idle_sheet.png', 3), cx - 34, ty - 5, light=hx(0x9ae8ff), side=1)
    P.put(cv, P.strip('lumen/idle_sheet.png', 6), cx + 30, ty - 5, flip=True, light=hx(0xd8a0ff), side=-1)
    motes(cv, 30, (0xffffff, 0x9ae8ff), 0, 180, 2, 23)
    return P.grade(cv, 0x3a1a8a, 0.06)


# ------------------------------------------------------------------ 9 DUST RUNNER
def s_road():
    """DUST RUNNER: sundown on an empty desert highway, red mesas, the sun a huge disc on the horizon, heat shimmer -
    and the old motorhome barrelling toward us with two fighters braced on its roof."""
    img = P.sky(0x2a1050, 0x8a2a5a, 0xf2604a, 0xffa84a, 0xffe08a)
    cv = P.to_im(img)
    P.glow(cv, 160, 104, 70, 0xffd070, 110)
    d = P.draw(cv); d.ellipse([124, 68, 196, 140], fill=hx(0xffe8a0))
    for y in range(92, 120, 4): d.line([(120, y), (200, y)], fill=hx(0xf2a050))                       # the sun's bands
    for x0, x1, top, c in ((-10, 70, 80, 0x8a2a3a), (40, 110, 92, 0x6a1a2a), (230, 300, 76, 0x8a2a3a), (270, 340, 94, 0x6a1a2a)):   # mesas
        d.polygon([(x0, 120), (x0 + 10, top), (x1 - 10, top), (x1, 120)], fill=hx(c)); d.line([(x0 + 10, top), (x1 - 10, top)], fill=hx(0xff8a5a))
    d.rectangle([0, 118, W, H], fill=hx(0xc86a3a))
    for k in range(6): d.line([(0, 120 + k * k * 1.6), (W, 120 + k * k * 1.6)], fill=hx(0xb05a30))
    d.polygon([(150, 118), (170, 118), (300, 180), (20, 180)], fill=hx(0x2a1a22))                        # the highway
    for k in range(6):
        u = (k + 0.5) / 6; y = 118 + u * u * 62; w = 1 + u * 4; d.polygon([(160 - w, y), (160 + w, y), (160 + w * 1.2, y + u * 8), (160 - w * 1.2, y + u * 8)], fill=hx(0xffd04a))
    for x, h in ((40, 26), (286, 34), (250, 18)):                                                         # saguaros
        d.rectangle([x, 150 - h, x + 4, 150], fill=hx(0x2a3a1a)); d.rectangle([x - 6, 150 - h + 8, x - 2, 150 - h + 16], fill=hx(0x2a3a1a)); d.rectangle([x - 6, 150 - h + 14, x, 150 - h + 17], fill=hx(0x2a3a1a))
    mx, my, k = 160, 178, 1.7                                                                              # the motorhome, coming at us (1.7x)
    def R(x0, y0, x1, y1): return [mx + x0 * k, my + y0 * k, mx + x1 * k, my + y1 * k]
    def Q(pts): return [(mx + x * k, my + y * k) for x, y in pts]
    d.rounded_rectangle(R(-36, -46, 36, 0), 8, fill=hx(0xe8dcc0))
    d.rectangle(R(-36, -30, 36, -26), fill=hx(0x8a4a1a)); d.rectangle(R(-36, -24, 36, -22), fill=hx(0xd8a04a))
    d.polygon(Q([(-28, -44), (28, -44), (30, -32), (-30, -32)]), fill=hx(0x3a4a6a)); d.line(Q([(-24, -42), (-10, -34)]), fill=hx(0xd8e8ff), width=2)
    d.polygon(Q([(-30, -40), (-20, -40), (-30, -34)]), fill=hx(0xff9a6a))
    d.rectangle(R(-20, -18, 20, -8), fill=hx(0x1a1a1a)); [d.line(Q([(-18, -16 + j * 3), (18, -16 + j * 3)]), fill=hx(0x5a5a5a)) for j in range(3)]
    for sd in (-1, 1): d.rectangle(R(sd * 28 - 4, -16, sd * 28 + 4, -10), fill=hx(0xfff0b0)); P.glow(cv, mx + sd * 28 * k, my - 13 * k, 18, 0xfff0b0, 110); d = P.draw(cv)
    d.rectangle(R(-38, -2, 38, 4), fill=hx(0x1a1a1a))
    roof = my - 46 * k
    for j in range(10): over(cv, lambda d, j=j: d.ellipse([mx - 66 - j * 10, my - 8 - j * 3, mx - 40 - j * 7, my + 4 - j], fill=a(0xd8945a, 120 - j * 10)))   # the dust it throws
    P.put(cv, P.strip('gnash/idle_sheet.png', 2, 160, 96), mx - 24, roof + 1, light=hx(0xffd070), side=-1)
    P.put(cv, P.strip('mr-wake/idle_sheet.png', 3), mx + 30, roof + 1, flip=True, light=hx(0xffd070), side=1)
    return P.grade(cv, 0xff7a4a, 0.06)


# ------------------------------------------------------------------ 10 JUNGLE FALLS
def s_falls():
    """FIRST LIGHT AT JUNGLE FALLS: a wall of waterfalls pouring off the cliffs into a green gorge, spray and a
    rainbow in the morning sun, layer on layer of jungle, birds, and AERO and KAMI on a mossy ledge looking out."""
    img = P.sky(0x7ac8ff, 0xa8e0ff, 0xe8f8ff, 0xfff4d8)
    cv = P.to_im(img)
    P.glow(cv, 250, 30, 50, 0xffffff, 110)
    d = P.draw(cv)
    for x0, w, top in ((30, 60, 40), (110, 90, 30), (220, 70, 46)):                                       # the cliffs
        d.rectangle([x0, top, x0 + w, 140], fill=hx(0x4a6a5a)); d.rectangle([x0, top, x0 + w, top + 5], fill=hx(0x5aa84a))
        for k in range(4): d.line([(x0 + k * w / 4 + 4, top + 6), (x0 + k * w / 4 + 8, 140)], fill=hx(0x3a5a4a))
    for x, top, w in ((48, 44, 14), (66, 44, 8), (130, 34, 22), (160, 34, 12), (186, 34, 10), (238, 50, 16), (262, 50, 8)):   # the falls
        d.rectangle([x, top, x + w, 140], fill=hx(0xd8f4ff))
        for k in range(0, w, 3): d.line([(x + k, top), (x + k, 140)], fill=hx(0xa8e0ff if k % 2 else 0xffffff))
    cv = fog(cv, 110, 160, 0xffffff, 170)
    over(cv, lambda d: [d.arc([60 - i * 2, 60 - i * 2, 260 + i * 2, 240 + i * 2], 200, 340, fill=a(c, 90), width=2) for i, c in enumerate((0xff5a5a, 0xffa84a, 0xffe84a, 0x5ad84a, 0x4a9aff, 0x9a5aff))])   # the rainbow
    cv = layer(cv, 132, 6, 0x2a7a4a, 44, step=2)
    cv = layer(cv, 148, 8, 0x1a5a36, 45, step=2)
    d = P.draw(cv)
    r = np.random.default_rng(7)
    for cx0, cy0, n in ((0, 30, 34), (320, 20, 30), (0, 180, 24)):                                        # leaves framing it
        for k in range(n):
            ang = r.uniform(0, 6.3); dist = r.uniform(0, 34); lx, ly = cx0 + math.cos(ang) * dist, cy0 + math.sin(ang) * dist * 0.8
            c = (0x0e3a1e, 0x14502a, 0x1e6a34)[k % 3]; d.ellipse([lx - 9, ly - 4, lx + 9, ly + 4], fill=hx(c)); d.line([(lx - 7, ly), (lx + 7, ly)], fill=hx(0x2a8a44))
    d.polygon([(170, 180), (180, 148), (320, 140), (320, 180)], fill=hx(0x0e2a18)); d.line([(180, 148), (320, 140)], fill=hx(0x5ac84a))   # the mossy ledge
    for x, y in ((90, 50), (100, 46), (110, 52)): d.line([(x - 3, y), (x, y - 2), (x + 3, y)], fill=hx(0x2a3a3a))   # birds
    P.put(cv, P.strip('aero/idle_sheet.png', 2), 212, 147, light=hx(0xfff4c0), side=-1)
    P.put(cv, P.strip('kami/idle_sheet.png', 4), 262, 144, light=hx(0xfff4c0), side=-1)
    motes(cv, 30, (0xffffff, 0xd8f4ff), 90, 160, 1, 29)
    return P.grade(cv, 0x7ad8a8, 0.04, vig=0.25)


LEGENDS = {'brass': s_brass, 'peak': s_peak, 'keep': s_keep, 'grove': s_grove, 'machine': s_machine,
           'canvas': s_canvas, 'opera': s_opera, 'fractured': s_fractured, 'road': s_road, 'falls': s_falls}


def main():
    os.makedirs(OUT, exist_ok=True); shots = []
    only = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else None
    for sid, fn in LEGENDS.items():
        if only and sid not in only: continue
        P.rng = np.random.default_rng(len(sid) * 37)
        im = fn().convert('RGB')
        im.quantize(255, dither=Image.NONE).save(os.path.join(OUT, 'story-' + sid + '_bg.png'), optimize=True)
        shots.append(im); print('legend', sid)
    if '--preview' in sys.argv:
        sheet = Image.new('RGB', (W * 2 * 2, H * 2 * ((len(shots) + 1) // 2)))
        for i, im in enumerate(shots): sheet.paste(im.resize((W * 2, H * 2), Image.NEAREST), ((i % 2) * W * 2, (i // 2) * H * 2))
        sheet.save(sys.argv[sys.argv.index('--preview') + 1])


if __name__ == '__main__':
    main()

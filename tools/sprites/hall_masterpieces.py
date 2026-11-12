"""The TROPHY HALL's three MASTERPIECES: big (320x224), detailed, ANIMATED pixel paintings (8 frames that loop) that
hang in the great frames at the far end of the hall (src/scenes/TrophyHallScene.js; list `PAINTINGS` in
src/data/trophyHall.js, entries with `big: true`).

  clash   THE CLASH AT SKY SANCTUM - the whole roster in one battle over the floating sanctum at dusk: Soul Summoner's
          fire meets Mr Wake's water in a blast, Lacy dives in, NU lands a chord, FULL AERO shines above; waterfalls
          pour off the islands, clouds drift, embers and souls swirl.
  feast   THE FEAST OF FIGHTERS - one long candlelit table: Soul Summoner raises a toast, Mr Wake pours tea, Lacy guards
          her plate, NU plays on his chair, AERO's bowl steams up, Rosemary eats cake, WHAT ONCE WAS shows static, and
          THE DEVOTED prays while her glutton steals the roast. Candles flicker, steam rises, the glutton chews.
  drowned THE DROWNED HOUR - a storm over a sea of sludge: THE DEVOTED, DROWNED, rises with her demons out of the waves
          while Soul Summoner and Lacy stand on the last cliff and Mr Wake holds back the tide. Rain, lightning, waves.

Built on hall_paintings.py's helpers (sprites from the game's sheets, dithered skies, glows, rays) at twice the size.
Run:  python3 tools/sprites/hall_masterpieces.py [name ...] [--preview DIR]  -> public/assets/hall/master_<name>.png
"""
import os, sys, math
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
import hall_paintings as hp
from hall_paintings import strip, move, trim, put, silhouette, hexc, glow, burst, sparkle, rays, demon

W, H, FR = 320, 224, 8
hp.W, hp.H = W, H                                      # (the helpers paint at the module's size)
OUTD = os.path.join(hp.ROOT, 'public/assets/hall')


def ph(f, k=1.0): return (f / FR) * 2 * math.pi * k

def big(im, k=2):
    im = trim(im); return im.resize((im.width * k, im.height * k), Image.NEAREST)

def finish(cv, tint, k=0.07, vig=0.4, seed=1):
    hp.rng = np.random.default_rng(seed)                # the same grain every frame (no shimmer)
    return hp.grade(cv, tint, k, vig)

def cloud(d, x, y, w, cols, seed):
    """A big pixel cumulus: lumps lit from above (cols = light, mid, shadow)."""
    r = np.random.default_rng(seed)
    for i in range(int(w / 6)):
        cx = x + r.uniform(0, w); cy = y + r.uniform(-4, 4); rr = r.uniform(6, 13)
        d.ellipse((cx - rr * 1.3, cy - rr, cx + rr * 1.3, cy + rr * 0.7), fill=hexc(cols[2]))
    for i in range(int(w / 7)):
        cx = x + r.uniform(4, w - 4); cy = y + r.uniform(-7, 0); rr = r.uniform(5, 10)
        d.ellipse((cx - rr * 1.2, cy - rr, cx + rr * 1.2, cy + rr * 0.4), fill=hexc(cols[1]))
        d.ellipse((cx - rr * 0.8, cy - rr, cx + rr * 0.6, cy - rr * 0.3), fill=hexc(cols[0]))

def island(d, x, y, w, h, top, rock, dark, seed, grass=True):
    """A floating island: a grassy top and a jagged rock cone under it, shaded in bands."""
    r = np.random.default_rng(seed); pts = [(x, y)]
    n = 9
    for i in range(1, n):
        t = i / n; pts.append((x + w * t + r.uniform(-3, 3), y + h * math.sin(t * math.pi) * r.uniform(0.7, 1.1)))
    pts.append((x + w, y))
    d.polygon(pts, fill=hexc(dark))
    d.polygon([(px * 0.85 + (x + w / 2) * 0.15 - 2, py * 0.8 + y * 0.2) for px, py in pts], fill=hexc(rock))
    for i in range(int(w / 10)):                                                    # cracks and strata
        sx = x + r.uniform(4, w - 4); d.line([(sx, y + 4), (sx + r.uniform(-4, 4), y + r.uniform(8, h * 0.6))], fill=hexc(dark))
    if grass:
        d.rectangle((x - 1, y - 3, x + w + 1, y + 1), fill=hexc(top))
        for gx in range(int(x), int(x + w), 3): d.line([(gx, y + 1), (gx, y + 1 + r.integers(1, 5))], fill=hexc(top))


# ------------------------------------------------------------------ THE CLASH AT SKY SANCTUM
def clash(f):
    p = ph(f)
    img = hp.sky(0x1a0a3a, 0x4a1a5a, 0x8a2a5a, 0xd84a3a, 0xff8a3a, 0xffc870)
    img = hp.radial(160, 150, 70, [0xfff6d0, 0xffd880, 0xffa850], img, 0.7, 1.0)
    img = hp.stars(img, 40, 7, ymax=0.25)
    cv = hp.to_im(img); d = ImageDraw.Draw(cv)
    for i, (y, w, sp) in enumerate(((40, 90, 6), (62, 120, 4), (28, 70, 8), (88, 140, 3))):   # drifting cloud banks
        x = (i * 97 + f * sp) % (W + w) - w
        cloud(d, x, y, w, [(0xffd8a0, 0xd88a6a, 0x8a4a6a), (0xffb880, 0xc86a5a, 0x6a3a5a)][i % 2], 10 + i)
    for k, (x, y, w, h) in enumerate(((10, 120, 60, 40), (250, 112, 64, 46), (196, 150, 40, 26))):   # far islands with waterfalls
        island(d, x, y, w, h, 0x5a8a5a, 0x6a5a6a, 0x4a3a50, 30 + k)
        wx = x + w * 0.6
        for j in range(26): yy = y + 2 + ((j * 5 + f * 3) % 70); d.point((wx + (j % 2), yy), fill=hexc(0xc8e8ff if j % 3 else 0xffffff))
    hp.glow(cv, 160, 150, 60, 0xffd890, 50); d = ImageDraw.Draw(cv)
    # the sanctum: a white temple with gold domes on the middle island
    island(d, 100, 132, 120, 60, 0x6aa85a, 0x8a7a8a, 0x5a4a60, 41)
    d.rectangle((124, 100, 196, 132), fill=hexc(0xe8e0d8)); d.rectangle((120, 96, 200, 102), fill=hexc(0xf6f0e8))
    for cx in range(128, 196, 10): d.rectangle((cx, 102, cx + 4, 132), fill=hexc(0xd0c8c0)); d.line([(cx, 102), (cx, 132)], fill=hexc(0xffffff))
    d.ellipse((140, 78, 180, 104), fill=hexc(0xe8b040)); d.ellipse((146, 80, 166, 92), fill=hexc(0xffe080)); d.rectangle((158, 70, 161, 80), fill=hexc(0xe8b040))
    d.polygon([(124, 96), (160, 84), (196, 96)], fill=hexc(0xf6f0e8))
    # the foreground cliff the fight is on
    C = [(0, 200), (50, 194), (110, 198), (170, 192), (240, 196), (320, 190)]
    d.polygon(C + [(320, 224), (0, 224)], fill=hexc(0x4a3446))
    for i in range(70):                                                             # the rock: strata, cracks, pebbles
        x = (i * 37) % W; y = 204 + (i * 13) % 20; d.line([(x, y), (x + 6 + i % 5, y + (i % 3) - 1)], fill=hexc([0x3a2636, 0x5a4256, 0x2a1a26][i % 3]))
    d.polygon(C + [(320, 196), (0, 206)], fill=hexc(0x4a8a3a))
    for gx in range(0, W, 2):                                                       # grass blades along the edge
        top = 200 - 10 * gx / W - (gx * 7 % 5) - (gx % 9 == 0) * 3
        d.line([(gx, top), (gx, 204)], fill=hexc(0x6ab84a if gx % 3 else 0x8ad86a))
    for i, (x, c) in enumerate(((20, 0xff6a8a), (34, 0xffe060), (238, 0xc08aff), (300, 0xff6a8a), (284, 0xffffff))):   # wildflowers
        d.point((x, 194), fill=hexc(c)); d.point((x + 1, 195), fill=hexc(c)); d.line([(x, 196), (x, 200)], fill=hexc(0x3a7a2a))
    d.rectangle((292, 150, 302, 196), fill=hexc(0xd8d0c8)); d.rectangle((289, 146, 305, 151), fill=hexc(0xe8e0d8)); d.line([(292, 150), (292, 196)], fill=(255, 255, 255))   # a broken sanctum pillar
    d.polygon([(289, 146), (296, 140), (305, 146)], fill=hexc(0xc8c0b8))
    d.polygon([(298, 152), (316, 154), (316, 176), (308, 170), (298, 174)], fill=hexc(0x7a1424)); d.line([(298, 152), (316, 154)], fill=hexc(0xe0b040))   # a torn banner on it
    d.line([(16, 198), (22, 168)], fill=hexc(0xc8d0e0), width=2); d.rectangle((15, 166, 25, 168), fill=hexc(0xe0b040))   # a sword stuck in the ground
    # FULL AERO shining above it all
    hp.glow(cv, 160, 34, 34, 0xfff6c8, 120 + int(20 * math.sin(p)))
    rays(cv, 160, 34, 14, 0xfff0b0, 22, start=p / 7)
    put(cv, strip('aero/king/idle_sheet.png', f * 2), 160, 56 + math.sin(p) * 2, light=(255, 255, 220), side=1)
    # the clash: fire meets water in the middle
    cx, cy = 160, 150
    put(cv, move('ss', 'fireball', 0.55), 100, 200, scale=2, light=hexc(0xffc070), side=1)
    put(cv, move('wake', 'fsmash', 0.5), 228, 200, scale=2, flip=True, light=hexc(0xc8a0ff), side=-1)
    rr = 22 + 4 * math.sin(p * 2)
    burst(cv, cx, cy, rr + 6, 0xff6a2a, None, 9, 200); burst(cv, cx, cy, rr, 0x7ad0ff, 0xffffff, 9)
    d = ImageDraw.Draw(cv)
    for i in range(16):                                                             # sparks thrown off the blast
        a = i * 0.39 + p * 0.5; r1 = 20 + ((f * 4 + i * 7) % 28)
        d.point((cx + math.cos(a) * r1, cy + math.sin(a) * r1 * 0.7), fill=hexc(0xffe8a0 if i % 2 else 0xa8e8ff))
    # Lacy diving in from the left, NU landing a chord on the right, the rest watching from the islands
    put(cv, move('hk', 'fair', 0.4), 96, 92 + math.sin(p) * 2, light=(255, 230, 200), side=1)
    put(cv, move('nu', 'usmash', 0.5), 280, 112, flip=True, light=hexc(0xff9ad8), side=-1)
    hp.speed(cv, 96, 76, 0xffffff, 12, 60, 24, 4)
    put(cv, strip('devoted/idle_sheet.png', f), 50, 120, light=hexc(0xc89aff), side=1, shade=((40, 20, 60), 0.2))
    put(cv, strip('last-seen/idle_sheet.png', f), 214, 150, flip=True, shade=((60, 30, 40), 0.3), light=hexc(0xffc890), side=-1)
    put(cv, strip('what-once-was/menu_idle_sheet.png', f), 22, 120, shade=((40, 20, 40), 0.4))
    d = ImageDraw.Draw(cv)
    for i in range(30):                                                             # embers riding the wind
        x = (i * 41 + f * (3 + i % 3)) % W; y = 220 - ((i * 29 + f * 5) % 200)
        d.point((x, y), fill=hexc([0xffd040, 0xff8a2a, 0xffffff][i % 3]))
    for i in range(5):                                                              # souls circling the sanctum
        a = p + i * 1.256; x, y = 160 + math.cos(a) * 70, 100 + math.sin(a) * 18
        hp.glow(cv, x, y, 5, 0x7ad0ff, 160); ImageDraw.Draw(cv).point((x, y), fill=(255, 255, 255))
    d = ImageDraw.Draw(cv)
    for i in range(4):                                                              # birds
        bx = (40 + i * 70 + f * 5) % W; by = 60 + (i * 13) % 30; wing = 1 if (f + i) % 2 else -1
        d.line([(bx - 3, by + wing), (bx, by), (bx + 3, by + wing)], fill=hexc(0x2a1a2a))
    return finish(cv, 0xffa060, 0.05, 0.45, seed=3)


# ------------------------------------------------------------------ THE FEAST OF FIGHTERS
def feast(f):
    p = ph(f)
    img = hp.sky(0x1a0e14, 0x2a1820, 0x3a2028)
    cv = hp.to_im(img); d = ImageDraw.Draw(cv)
    for x in range(0, W, 24):                                                       # stone walls
        for y in range(0, 150, 12): d.rectangle((x + (12 if (y // 12) % 2 else 0), y, x + (12 if (y // 12) % 2 else 0) + 22, y + 10), outline=hexc(0x24141c))
    for wx in (40, 280):                                                            # tall arched windows with moonlight
        d.rectangle((wx - 16, 30, wx + 16, 110), fill=hexc(0x1a2a5a)); d.ellipse((wx - 16, 14, wx + 16, 46), fill=hexc(0x1a2a5a))
        d.line([(wx, 14), (wx, 110)], fill=hexc(0x0a0a14), width=2); d.line([(wx - 16, 60), (wx + 16, 60)], fill=hexc(0x0a0a14), width=2)
        d.ellipse((wx - 8, 26, wx + 2, 36), fill=hexc(0xe8e8ff))
        for i in range(8): d.point((wx - 12 + (i * 7) % 24, 40 + (i * 11) % 60), fill=hexc(0xc8d8ff))
    for tx, c in ((96, 0x7a1424), (224, 0x1a3a7a)):                                 # tapestries
        d.rectangle((tx - 14, 10, tx + 14, 70), fill=hexc(c)); d.polygon([(tx - 14, 70), (tx, 78), (tx + 14, 70)], fill=hexc(c))
        d.rectangle((tx - 14, 10, tx + 14, 13), fill=hexc(0xe0b040)); d.ellipse((tx - 6, 30, tx + 6, 42), outline=hexc(0xe0b040))
    # the shopkeeper's portrait on the wall, watching
    d.rectangle((146, 14, 174, 40), fill=hexc(0xe0b040)); d.rectangle((149, 17, 171, 37), fill=hexc(0x2a2a2a))
    face = trim(hp.shop('face_happy.png', 0)).resize((20, 16), Image.NEAREST); cv.alpha_composite(face, (150, 19)); d = ImageDraw.Draw(cv)
    # the chandelier, its candles flickering
    d.line([(160, 0), (160, 46)], fill=hexc(0x6a4a1a)); d.ellipse((120, 44, 200, 54), outline=hexc(0xe0b040), width=2)
    for i in range(7):
        x = 124 + i * 12; fl = 1 + ((f + i) % 3 == 0)
        d.rectangle((x, 38, x + 2, 46), fill=hexc(0xf8f0d8)); d.ellipse((x - 1, 33 - fl, x + 3, 38), fill=hexc(0xffd040)); d.point((x + 1, 35), fill=(255, 255, 255))
    hp.glow(cv, 160, 40, 70, 0xffc860, 70 + int(10 * math.sin(p * 3)))
    d = ImageDraw.Draw(cv)
    d.rectangle((0, 150, W, H), fill=hexc(0x2a1810))
    for x in range(0, W, 16): d.line([(x, 150), (x - 10, H)], fill=hexc(0x1a0e08))
    # the diners, close up behind the table (left to right)
    diners = [('last-seen/idle_sheet.png', 64, 64, 24, False), ('mr-wake/idle_sheet.png', 64, 64, 66, False),
              ('soul-summoner/idle_sheet.png', 64, 64, 120, False), ('aero/idle_sheet.png', 64, 64, 200, True),
              ('what-once-was/menu_idle_sheet.png', 64, 64, 244, True), ('devoted/idle_sheet.png', 64, 64, 292, True)]
    for i, (pth, fw, fh, x, fl) in enumerate(diners):
        put(cv, strip(pth, f + i * 3, fw, fh), x, 196, scale=2, flip=fl, light=hexc(0xffc870), side=1 if x < 160 else -1)
    put(cv, move('nu', 'fsmash', 0.2 + 0.08 * (f % 2)), 160, 140, scale=2, light=hexc(0xffc870), side=1)   # NU up on his chair, playing for everyone
    put(cv, strip('hero-knight/idle_sheet.png', f, 150, 90), 212, 196, scale=2, flip=True, shade=((0, 0, 0), 0.0), light=hexc(0xffc870), side=-1)
    d = ImageDraw.Draw(cv)
    # the table: white cloth, gold runner, and everything on it
    T = 150
    d.rectangle((0, T, W, T + 14), fill=hexc(0xf0e8e0))
    cloth = hp.bands([0xe8e0d8, 0xd0c4bc, 0xa89a94], np.repeat(np.linspace(0, 1, 204 - T - 14)[:, None], W, 1))   # the cloth falling into shadow
    cv.alpha_composite(Image.fromarray(np.dstack([cloth, np.full(cloth.shape[:2], 255)]).astype(np.uint8)), (0, T + 14)); d = ImageDraw.Draw(cv)
    for x in range(0, W, 16): d.line([(x, T + 14), (x + 5, 200)], fill=hexc(0xb8aca4)); d.line([(x + 1, T + 14), (x + 6, 200)], fill=hexc(0xf4ece4))   # folds
    for x in range(0, W, 8): d.ellipse((x, 198, x + 8, 206), fill=hexc(0xf0e8e0)); d.point((x + 4, 202), fill=hexc(0xb8aca4))   # a lace hem
    for px in range(20, W, 46):                                                     # plates and cutlery along the front edge
        d.ellipse((px - 10, T + 9, px + 10, T + 15), fill=hexc(0xffffff), outline=hexc(0xc8c0b8)); d.ellipse((px - 5, T + 10, px + 5, T + 13), fill=hexc(0xe8e0e8))
        d.line([(px - 14, T + 9), (px - 14, T + 15)], fill=hexc(0xc8c8d0)); d.line([(px + 14, T + 9), (px + 14, T + 15)], fill=hexc(0xc8c8d0))
    d.rectangle((0, T + 4, W, T + 8), fill=hexc(0xe0b040)); d.line([(0, T + 4), (W, T + 4)], fill=hexc(0xfff0a0))
    d.rectangle((0, 204, W, H), fill=hexc(0x1a0e08))
    # the feast, drawn big
    d.ellipse((128, T - 22, 176, T + 2), fill=hexc(0x8a4a1a)); d.ellipse((132, T - 26, 172, T - 6), fill=hexc(0xc0702a)); d.ellipse((140, T - 24, 158, T - 16), fill=hexc(0xe8a050))   # the roast
    d.rectangle((168, T - 32, 186, T - 26), fill=hexc(0xf0e0c0)); d.ellipse((182, T - 34, 190, T - 26), fill=hexc(0xf0e0c0))
    d.rectangle((24, T - 18, 50, T), fill=hexc(0xf0d0e0)); d.rectangle((24, T - 18, 50, T - 14), fill=hexc(0xff7aa0)); d.rectangle((30, T - 26, 44, T - 18), fill=hexc(0xf0d0e0))   # Rosemary's cake
    d.rectangle((37, T - 32, 38, T - 26), fill=hexc(0x8ad0ff)); d.ellipse((35, T - 36 - (f % 2), 40, T - 31), fill=hexc(0xffd040))
    for gx in (64, 104, 232, 268): d.rectangle((gx + 2, T - 10, gx + 5, T), fill=hexc(0xe0b040)); d.polygon([(gx - 2, T - 20), (gx + 9, T - 20), (gx + 6, T - 10), (gx + 1, T - 10)], fill=hexc(0xe0b040)); d.rectangle((gx, T - 19, gx + 7, T - 15), fill=hexc(0x8a1a2a))   # goblets of wine
    d.ellipse((206, T - 14, 236, T + 2), fill=hexc(0xd0a040)); d.ellipse((210, T - 22, 220, T - 12), fill=hexc(0xe83a3a)); d.ellipse((218, T - 24, 228, T - 14), fill=hexc(0x5ac83a)); d.ellipse((222, T - 18, 232, T - 8), fill=hexc(0xb04ad8))   # fruit
    d.ellipse((84, T - 26, 104, T - 6), fill=hexc(0xf0f0f0)); d.rectangle((90, T - 30, 98, T - 26), fill=hexc(0xf0f0f0)); d.line([(103, T - 18), (112, T - 26)], fill=hexc(0xf0f0f0), width=3)   # Mr Wake's teapot, pouring
    d.line([(112, T - 26), (118, T - 8)], fill=hexc(0xb07a3a), width=2); d.ellipse((112, T - 8, 124, T - 2), fill=(255, 255, 255))
    for xx in (8, 300): d.rectangle((xx, T - 30, xx + 4, T), fill=hexc(0xf8f0d8)); d.ellipse((xx - 1, T - 37 - (f + xx) % 3, xx + 5, T - 30), fill=hexc(0xffd040)); hp.glow(cv, xx + 2, T - 34, 14, 0xffc860, 90); d = ImageDraw.Draw(cv)   # table candles
    for i, sx in enumerate((150, 94, 116, 37)):                                     # steam curling up
        for k in range(10):
            y = T - 30 - k * 3 - (f % 4); x = sx + math.sin(k * 0.7 + p + i) * 2.5
            d.point((x, y), fill=hexc(0xf0e8f0 if k % 2 else 0xd8d0e0))
    # Soul Summoner's toast: a goblet raised, a clink of light
    hp.burst(cv, 132, 92, 5 + (f % 2) * 3, 0xffffff, None, 6, 200)
    # the glutton, climbing up the cloth to steal the roast
    g = 1 + 0.12 * math.sin(p * 2)
    demon(cv, 178, T + 4, 'glutton', s=2.4 * g)
    d = ImageDraw.Draw(cv)
    for i in range(14): d.point((166 + (i * 3) % 26, T - 6 - (f + i * 2) % 8), fill=hexc(0xd0803a))   # crumbs flying
    return finish(cv, 0xffa860, 0.06, 0.5, seed=5)


# ------------------------------------------------------------------ THE DROWNED HOUR
def drowned(f):
    p = ph(f); flash = f in (3, 4)
    img = hp.sky(0x05040a, 0x100a1a, 0x1e1028, 0x2a1830) if not flash else hp.sky(0x2a2440, 0x4a3a6a, 0x6a5088, 0x8a6aa0)
    cv = hp.to_im(img); d = ImageDraw.Draw(cv)
    for i in range(6):                                                              # storm clouds rolling
        x = (i * 70 + f * 2) % (W + 120) - 60
        cloud(d, x, 20 + (i % 3) * 14, 110, (0x3a2a48, 0x24182e, 0x140c1a) if not flash else (0x8a7aa8, 0x5a4a78, 0x3a2a50), 60 + i)
    if flash:                                                                       # the lightning
        pts = [(230, 0)]; r = np.random.default_rng(9)
        for k in range(8): pts.append((pts[-1][0] + r.uniform(-14, 10), pts[-1][1] + 16))
        d.line(pts, fill=(255, 255, 255), width=2); hp.glow(cv, 230, 40, 60, 0xd8d0ff, 70); d = ImageDraw.Draw(cv)
    # what she has become, vast, behind her
    ghost = big(strip('devoted/drowned/idle_sheet.png', 6), 4)
    put(cv, silhouette(ghost, (28, 18, 38) if not flash else (60, 44, 80)), 176, 210)
    d = ImageDraw.Draw(cv)
    blink = f == 6
    for ex in (164, 184):
        if not blink: d.rectangle((ex, 70, ex + 3, 71), fill=hexc(0xe0c0ff)); hp.glow(cv, ex + 1, 70, 6, 0xb07aff, 150); d = ImageDraw.Draw(cv)
    # the sea of sludge, heaving
    for y in range(150, H):
        k = (y - 150) / (H - 150)
        for x in range(0, W, 2):
            wave = math.sin(x * 0.05 + p + y * 0.3) * 1.5
            c = 0x0a0610 if (y + int(wave)) % 6 else 0x2a1a3a
            d.line([(x, y), (x + 1, y)], fill=hexc(c))
    for i in range(14):                                                             # crests catching the violet light
        x = (i * 37 + f * 4) % W; y = 152 + (i * 11) % 60; d.line([(x, y), (x + 6, y - 1), (x + 10, y)], fill=hexc(0x8a5ad8))
    # her tree on a rock in the sludge, and her, rising
    d.polygon([(100, 162), (122, 150), (140, 164)], fill=hexc(0x1a1420))           # her tree on a rock in the sludge
    T = [(112, 152), (114, 128), (112, 116), (116, 108), (118, 116), (120, 128), (119, 152)]
    d.polygon(T, fill=hexc(0x2a2018))
    for (x1, y1, x2, y2) in ((114, 120, 102, 110), (117, 114, 128, 104), (116, 128, 124, 122)): d.line([(x1, y1), (x2, y2)], fill=hexc(0x2a2018), width=2)
    hp.glow(cv, 170, 116, 46, 0x7a2ad8, 150 + int(30 * math.sin(p)))
    hp.glow(cv, 170, 112, 26, 0xc89aff, 120 + int(30 * math.sin(p)))                # a violet halo so she stands out from what's behind her
    d = ImageDraw.Draw(cv)
    for k in range(3): r = 30 + k * 6 + (f % 4) * 2; d.ellipse((170 - r, 112 - r * 0.8, 170 + r, 112 + r * 0.8), outline=hexc(0x6a3aa8 if k else 0xb07aff))
    put(cv, big(strip('devoted/drowned/idle_sheet.png', f), 2), 170, 150 + math.sin(p) * 3, light=hexc(0xe0c8ff), side=-1, shade=((176, 130, 230), 0.12))
    for i, (x, y, kind) in enumerate(((126, 172, 'glutton'), (214, 172, 'wraith'), (218, 112, 'weeper'), (126, 110, 'weeper'))):   # her demons, rising
        demon(cv, x, y + math.sin(p + i) * 2, kind, s=1.4)
    d = ImageDraw.Draw(cv)
    for i in range(10):                                                             # sludge dripping off her
        x = 166 + (i * 7) % 22; y = 150 + ((f * 4 + i * 9) % 40); d.line([(x, y), (x, y + 3)], fill=hexc(0x0a0610))
    # the last cliff: Soul Summoner and Lacy facing her; Mr Wake on a rock holding the tide back
    cl = [(0, 176), (40, 166), (86, 170), (104, 186), (100, 224), (0, 224)]
    d.polygon(cl, fill=hexc(0x1e1820)); d.line(cl[:4], fill=hexc(0x5a4a68), width=2)
    for i in range(16): x = (i * 13) % 96; y = 182 + (i * 7) % 40; d.line([(x, y), (x + 5, y + 1)], fill=hexc(0x2e2632))
    put(cv, strip('soul-summoner/idle_sheet.png', f), 34, 170, scale=2, light=hexc(0xa8d8ff), side=1)
    hp.glow(cv, 50, 128, 16, 0x7ad0ff, 150)
    put(cv, strip('hero-knight/idle_sheet.png', f, 150, 90), 78, 174, scale=2, light=hexc(0xc8b0ff), side=1)
    d = ImageDraw.Draw(cv)
    wv = [(236, 224), (232, 190), (240, 160), (256, 140), (270, 134), (262, 150), (258, 176), (266, 224)]   # Mr Wake's wall of water, holding back the tide
    d.polygon(wv, fill=hexc(0x2a5aa8)); d.polygon([(240, 224), (238, 190), (246, 164), (258, 146), (256, 170), (252, 224)], fill=hexc(0x4a8ad8))
    for k in range(6): y = 140 + k * 14 + (f * 3) % 14; d.line([(236 + k, y), (248 + k, y - 4)], fill=hexc(0xc8e8ff))
    for i in range(8): a = p + i * 0.8; d.point((268 + math.cos(a) * 4, 136 + math.sin(a) * 3), fill=(255, 255, 255))
    d.polygon([(262, 224), (282, 196), (306, 192), (320, 200), (320, 224)], fill=hexc(0x1e1820))
    put(cv, move('wake', 'upb', 0.3), 298, 198, scale=2, flip=True, light=hexc(0xc89aff), side=-1)
    # the rain, slanting
    arr = np.array(cv); r = np.random.default_rng(77)
    for i in range(360):
        x0, y0 = r.integers(0, W), r.integers(0, H); y = (y0 + f * 14) % H; x = (x0 - f * 4) % W
        for k in range(4):
            yy, xx = y + k, x - k // 2
            if 0 <= yy < H and 0 <= xx < W: arr[yy, xx, :3] = (150, 140, 190) if not flash else (230, 230, 255)
    cv = Image.fromarray(arr)
    return finish(cv, 0x5a3a8a if not flash else 0xc8c0ff, 0.08, 0.55, seed=7)


PIECES = {'clash': clash, 'feast': feast, 'drowned': drowned}


def build(names, preview=None):
    os.makedirs(OUTD, exist_ok=True)
    for nm in names:
        sheet = Image.new('RGB', (W * FR, H))
        for f in range(FR): sheet.paste(PIECES[nm](f).convert('RGB'), (f * W, 0))
        print(nm, flush=True)
        if preview: sheet.save(os.path.join(preview, 'master_' + nm + '.png')); continue
        sheet.quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(os.path.join(OUTD, 'master_' + nm + '.png'), optimize=True)


if __name__ == '__main__':
    a = sys.argv[1:]; prev = a[a.index('--preview') + 1] if '--preview' in a else None
    names = [x for x in a if x in PIECES] or list(PIECES)
    build(names, prev)

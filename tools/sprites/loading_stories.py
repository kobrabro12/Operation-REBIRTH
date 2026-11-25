"""LOADING STORIES: loading screens that are whole stories in one picture (a picture is worth a thousand words).
Each is a 320x180 pixel-art scene painted with hall_paintings.py's kit (dithered skies, glows, ridges, rays, rim-lit
sprites from the fighters' real sheets) - every sprite at a whole-number scale on the same pixel grid as the scene, so
nothing shimmers or looks broken when the page blows it up. The page (public/loading-screens.js, `story` screens)
shows the picture full screen with a slow camera drift and its title and story underneath.

Writes public/assets/ui/loading/story-<id>_bg.png. Run after loading_screens.py (it clears the folder):
  python3 tools/sprites/loading_stories.py [--preview FILE]
"""
import os, sys, math
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import hall_paintings as P

P.W, P.H = 320, 180                                   # (the kit reads these when it paints)
W, H = P.W, P.H
OUT = os.path.join(P.ROOT, 'public/assets/ui/loading')
hx = P.hexc


def grave(d, x, y, kind):
    """A gravestone with its feet at (x, y): a rounded slab, a cross, or a broken pillar."""
    c, e = hx(0x2a3448), hx(0x46566e)
    if kind == 0: d.rectangle((x - 7, y - 16, x + 7, y), fill=c); d.ellipse((x - 7, y - 22, x + 7, y - 10), fill=c); d.line((x - 6, y - 17, x - 6, y), fill=e)
    elif kind == 1: d.rectangle((x - 2, y - 22, x + 2, y), fill=c); d.rectangle((x - 8, y - 17, x + 8, y - 13), fill=c); d.line((x - 2, y - 22, x - 2, y), fill=e)
    else: d.rectangle((x - 5, y - 14, x + 5, y), fill=c); d.polygon([(x - 5, y - 14), (x - 1, y - 19), (x + 2, y - 15), (x + 5, y - 18), (x + 5, y - 14)], fill=c)
    d.rectangle((x - 10, y, x + 10, y + 2), fill=hx(0x1a2030))


def wisp(cv, x, y, h, col=0x6ad8ff):
    """A soul flame rising out of the ground: a glow, a flickering blue tongue, a white heart."""
    P.glow(cv, x, y - h * 0.6, h * 0.8, col, 70); d = P.draw(cv)
    for i in range(int(h)):
        w = max(1, int((1 - i / h) * 4 * (1 + 0.4 * math.sin(i * 0.9))))
        d.line((x - w + int(math.sin(i * 0.5) * 2), y - i, x + w + int(math.sin(i * 0.5) * 2), y - i), fill=hx(col) + (230,))
    d.ellipse((x - 1, y - h * 0.45, x + 1, y - h * 0.3), fill=(255, 255, 255, 255))


def s_names():
    """THEIR NAMES: Soul Summoner among the graves of his friends at night; blue soul fire rising from each grave, and
    over one of them the ghost of a knight has stood up to answer him."""
    img = P.sky(0x050818, 0x0e1a3a, 0x1e3a5a, 0x3a5a7a)
    img = P.stars(img, 120, 4, (0xffffff, 0xa8d8ff), 0.55)
    img = P.radial(250, 40, 26, [0xf4f8ff, 0xc8d8f0], img); img = P.radial(250, 40, 60, [0x6a8ab0, 0x2a4060], img, 1, 0.5)
    img = P.ridge(img, 120, 10, 0x0e1830, 8, step=3)
    img = P.ridge(img, 146, 6, 0x0a1222, 9, step=2)
    cv = P.to_im(img); d = P.draw(cv)
    for x, k in ((60, 0), (100, 1), (140, 2), (238, 1), (276, 0)): grave(d, x, 150, k)
    for x in (60, 100, 140, 238, 276): wisp(cv, x, 132, 14 + (x % 7))
    P.put(cv, P.silhouette(P.strip('hero-knight/idle_sheet.png', 2, 150, 90), (120, 200, 255)), 100, 132, alpha=0.45)   # the one who answers
    P.glow(cv, 100, 108, 30, 0x8ae8ff, 60)
    P.put(cv, P.strip('soul-summoner/idle_sheet.png', 4), 190, 158, flip=True, scale=2, light=hx(0x8ae8ff), side=-1)
    d = P.draw(cv); d.rectangle((0, 158, W, H), fill=hx(0x070c18))
    for i in range(30): x, y = P.rng.integers(0, W), P.rng.integers(60, 150); P.sparkle(cv, int(x), int(y), 0x8ae8ff, 1)
    return P.grade(cv, 0x3a6ab0, 0.08)


def s_bridge():
    """WHAT THE WATER KEEPS: Mr Wake fishing off Gravemoon Bridge with his staff; under the black water two huge eyes
    have opened and a long hand is reaching for his line. AERO, at the far end, has seen it."""
    img = P.sky(0x07040f, 0x1e0f3d, 0x4a1f6a, 0x6a2a7a)
    img = P.stars(img, 90, 2, (0xffffff, 0xd8c8ff), 0.45)
    img = P.radial(80, 40, 22, [0xf4ecff, 0xd8c8f4], img)
    cv = P.to_im(img); d = P.draw(cv)
    d.rectangle((0, 136, W, H), fill=hx(0x0a0612))                                          # the black water
    for i in range(10): y = 140 + i * 4; d.line((60 + i * 2, y, 100 - i * 2, y), fill=hx(0x6a5a8a))   # the moon in it
    for ex in (150, 206):                                                                   # the eyes under the water
        P.glow(cv, ex, 160, 24, 0xffd23a, 60); d = P.draw(cv)
        d.ellipse((ex - 16, 154, ex + 16, 166), fill=hx(0xffe07a)); d.ellipse((ex - 4, 154, ex + 4, 166), fill=hx(0x0a0612))
    d.line((236, 180, 240, 156, 250, 142), fill=hx(0x2a1a3a), width=4)                      # a long hand reaching up for his line
    for k in range(4): d.line((250, 142, 244 + k * 4, 134), fill=hx(0x2a1a3a), width=2)
    d.rectangle((0, 120, W, 126), fill=hx(0x160c28)); d.rectangle((0, 118, W, 119), fill=hx(0x2c1a48))   # the bridge
    for x in range(0, W, 12): d.rectangle((x, 108, x + 2, 118), fill=hx(0x1c1030))
    d.rectangle((0, 107, W, 109), fill=hx(0x1c1030))
    for x in (30, 140, 270): d.rectangle((x, 126, x + 12, 136), fill=hx(0x120a22))
    P.put(cv, P.strip('mr-wake/idle_sheet.png', 6), 190, 120, scale=2, light=hx(0xd8b8ff), side=-1)
    d = P.draw(cv); d.line((222, 32, 246, 18), fill=hx(0x6a4a3a), width=2); d.line((246, 18, 252, 146), fill=hx(0xd8d0ff))   # his line into the water
    P.put(cv, P.strip('aero/idle_sheet.png', 12), 40, 118, light=hx(0xd8b8ff), side=-1)
    d = P.draw(cv); d.text((38, 78), '!', fill=hx(0xffffff))
    P.glow(cv, 54, 106, 8, 0xffd27a, 120)                                                    # his lantern
    return P.grade(cv, 0x5a2a8a, 0.07)


def s_oath():
    """THE LAST OATH: the kingdom burns on the horizon; on the hill above it Lacy raises her sword beside the torn
    banner of her fallen order, an empty helmet at her feet."""
    img = P.sky(0x12030a, 0x4a0c1e, 0xa8242a, 0xff6a3a, 0xffc070)
    img = P.radial(70, 120, 46, [0xfff0c0, 0xffb060, 0xff6a3a], img, 0.8)
    img = P.ridge(img, 128, 8, 0x2a0810, 5, step=2)
    cv = P.to_im(img); d = P.draw(cv)
    for x, w, h in ((40, 14, 40), (58, 26, 26), (88, 12, 52), (104, 20, 30), (128, 16, 44)):   # the burning castle
        d.rectangle((x, 128 - h, x + w, 132), fill=hx(0x1a060c))
        for bx in range(x, x + w, 4): d.rectangle((bx, 125 - h, bx + 2, 128 - h), fill=hx(0x1a060c))
        P.glow(cv, x + w / 2, 128 - h, 14, 0xff8a3a, 90); d = P.draw(cv)
    for i in range(6): P.glow(cv, 60 + i * 18, 90 - (i % 3) * 14, 18, 0x3a1a1a, 70)                  # smoke
    d = P.draw(cv)
    d.polygon([(150, 180), (210, 140), (290, 146), (320, 160), (320, 180)], fill=hx(0x10040a))     # the hill
    d.line((262, 146, 262, 86), fill=hx(0x2a1a14), width=2)                                       # the torn banner
    d.polygon([(263, 88), (290, 92), (282, 100), (294, 106), (263, 112)], fill=hx(0x7a1020))
    d.rectangle((268, 96, 276, 102), fill=hx(0xd8a040))
    d.ellipse((232, 140, 244, 148), fill=hx(0x6a6a72)); d.rectangle((235, 143, 241, 144), fill=hx(0x10040a))   # the empty helmet
    P.put(cv, P.move('hk', 'taunt', 0.45), 216, 152, scale=2, light=hx(0xffb070), side=-1)
    for i in range(50): x, y = int(P.rng.integers(0, W)), int(P.rng.integers(0, 150)); d = P.draw(cv); d.point((x, y), fill=hx(0xff9a4a if i % 3 else 0xffe0a0))   # ash and embers
    return P.grade(cv, 0xff6a3a, 0.06)


def s_soundcheck():
    """SOUNDCHECK, 6 AM: NU is on stage and ready to go; GNASH is asleep on the amp hugging his axe, and AERO is
    hopelessly tangled in the cables."""
    img = P.sky(0x0a0418, 0x1e0a36, 0x3a1450)
    cv = P.to_im(img)
    P.rays(cv, 160, -20, 1, 0xffe8a8, 70, start=math.pi / 2, length=200)
    d = P.draw(cv)
    d.rectangle((0, 140, W, 146), fill=hx(0x3a2a3a)); d.rectangle((0, 146, W, H), fill=hx(0x140c18))   # the stage
    for x in (20, 250):                                                                     # amps
        d.rectangle((x, 84, x + 52, 140), fill=hx(0x141018)); d.rectangle((x + 4, 88, x + 48, 110), fill=hx(0x2a2a30)); d.rectangle((x + 4, 114, x + 48, 136), fill=hx(0x2a2a30))
        for cx, cy in ((x + 26, 99), (x + 26, 125)): d.ellipse((cx - 9, cy - 9, cx + 9, cy + 9), fill=hx(0x0a0a0c))
    P.put(cv, P.strip('gnash/idle_sheet.png', 0, 160, 96), 280, 85, flip=True, shade=((40, 20, 70), 0.25))   # GNASH asleep on the amp
    d = P.draw(cv); d.text((288, 44), 'Z', fill=hx(0xc8c8ff)); d.text((296, 34), 'z', fill=hx(0xc8c8ff)); d.text((302, 26), 'z', fill=hx(0xc8c8ff))
    P.put(cv, P.move('nu', 'limit', 0.15), 160, 142, scale=2, light=hx(0xffe8a8), side=-1)
    P.put(cv, P.strip('aero/idle_sheet.png', 20), 70, 142, flip=True)
    d = P.draw(cv)                                                                          # the cables he's wound up in
    for k in range(6): d.arc((52 + k * 2, 100 + k * 6, 88 - k, 128 + k * 3), 180 + k * 20, 520 + k * 15, fill=hx(0x101010), width=2)
    d.line((88, 130, 130, 146), fill=hx(0x101010), width=2); d.line((52, 120, 40, 138), fill=hx(0x101010), width=2)
    d.text((54, 72), '?!', fill=hx(0xffffff))
    return P.grade(cv, 0x8a3ad8, 0.06)


def s_eater():
    """THE STAR-EATER: the night is going dark one star at a time - at the edge of the world a giant eclipse face is
    swallowing them, and three tiny heroes on a cliff look up at it."""
    img = P.sky(0x020108, 0x0a0420, 0x1a0838)
    img = P.stars(img, 220, 11, (0xffffff, 0xffe8a8, 0xc8b8ff), 0.9)
    cv = P.to_im(img)
    cx, cy = 196, 62
    P.glow(cv, cx, cy, 70, 0xffb84a, 90); P.glow(cv, cx, cy, 46, 0xffe8a8, 110)
    d = P.draw(cv)
    for i in range(24):                                                                     # stars being pulled into it
        a = i * 0.26 + 0.3; r1, r2 = 60 + (i % 5) * 18, 40
        d.line((cx + math.cos(a) * r1, cy + math.sin(a) * r1 * 0.8, cx + math.cos(a) * r2, cy + math.sin(a) * r2 * 0.8), fill=hx(0xfff4d0) + (160,))
        d.point((cx + math.cos(a) * r1, cy + math.sin(a) * r1 * 0.8), fill=hx(0xffffff))
    for k in range(16):                                                                     # the corona
        a = k / 16 * math.pi * 2; d.polygon([(cx + math.cos(a - 0.12) * 34, cy + math.sin(a - 0.12) * 34), (cx + math.cos(a) * (50 + (k % 3) * 8), cy + math.sin(a) * (50 + (k % 3) * 8)), (cx + math.cos(a + 0.12) * 34, cy + math.sin(a + 0.12) * 34)], fill=hx(0xffc84a))
    d.ellipse((cx - 36, cy - 36, cx + 36, cy + 36), fill=hx(0x05030a))                       # the black face
    d.polygon([(cx - 22, cy - 8), (cx - 6, cy - 4), (cx - 22, cy - 2)], fill=hx(0xff3a3a)); d.polygon([(cx + 22, cy - 8), (cx + 6, cy - 4), (cx + 22, cy - 2)], fill=hx(0xff3a3a))   # slit eyes
    d.ellipse((cx - 14, cy + 8, cx + 14, cy + 22), fill=hx(0x1a0a2a))                         # the maw, a little vortex in it
    for k in range(6): d.point((cx - 10 + k * 4, cy + 10 + (k % 2) * 2), fill=hx(0xfff4d0))
    d.polygon([(0, 180), (0, 150), (40, 140), (90, 146), (120, 160), (130, 180)], fill=hx(0x07040e))   # the cliff
    for i, (path, f, fw, fh, x) in enumerate((('soul-summoner/idle_sheet.png', 1, 64, 64, 24), ('hero-knight/idle_sheet.png', 3, 150, 90, 62), ('nu/idle_sheet.png', 5, 64, 64, 100))):
        P.put(cv, P.silhouette(P.strip(path, f, fw, fh), (34, 20, 54)), x, 147 - (i == 1) * 4, light=hx(0xffc84a), side=1)
    return P.grade(cv, 0x3a1a6a, 0.06)


def s_closing():
    """CLOSING TIME: a little shop on a dark street, its window warm. NU and AERO hurry away with bags of things they
    don't remember buying - and in the window two eyes, one red and one grey, watch them go."""
    img = P.sky(0x040612, 0x0e1028, 0x1a1a3a)
    img = P.stars(img, 40, 5, (0xffffff,), 0.3)
    cv = P.to_im(img); d = P.draw(cv)
    d.rectangle((0, 150, W, H), fill=hx(0x101018)); d.rectangle((0, 148, W, 150), fill=hx(0x2a2a3a))   # the street
    d.rectangle((20, 40, 200, 150), fill=hx(0x1a1420)); d.polygon([(14, 40), (110, 14), (206, 40)], fill=hx(0x140e1a))   # the shop
    for i in range(8): d.rectangle((30 + i * 20, 52, 38 + i * 20, 58), fill=hx(0xb8121c if i % 2 else 0xd2d0cc))   # an awning
    d.rectangle((36, 70, 150, 136), fill=hx(0xffc870))                                       # the warm window
    P.glow(cv, 93, 103, 70, 0xffb050, 70); d = P.draw(cv)
    d.ellipse((76, 80, 112, 118), fill=hx(0x1a0c10)); d.rectangle((70, 112, 118, 136), fill=hx(0x1a0c10))   # him, behind the counter
    d.polygon([(82, 84), (78, 64), (88, 80)], fill=hx(0xb8121c))                              # his one horn
    d.ellipse((84, 94, 90, 99), fill=hx(0xff2a3a)); d.ellipse((98, 94, 104, 99), fill=hx(0xd2d0cc))   # his two eyes
    d.rectangle((36, 120, 150, 136), fill=hx(0x6a3a20))                                       # the counter
    d.rectangle((160, 80, 192, 148), fill=hx(0x2a1a14)); d.rectangle((164, 84, 188, 144), fill=hx(0x3a241a))   # the door
    d.rectangle((166, 66, 188, 76), fill=hx(0x0a0a10)); d.text((168, 67), 'OPEN', fill=hx(0xff4a8a))
    P.glow(cv, 177, 71, 14, 0xff4a8a, 60)
    for x in (230, 300):                                                                     # a lamp post
        d = P.draw(cv); d.rectangle((x, 60, x + 2, 150), fill=hx(0x1a1a22)); P.glow(cv, x + 1, 60, 20, 0xffe8b0, 80)
    P.put(cv, P.strip('nu/run_sheet.png', 3), 250, 150, light=hx(0xffc870), side=-1)
    P.put(cv, P.strip('aero/run_sheet.png', 5), 282, 150, light=hx(0xffc870), side=-1)
    d = P.draw(cv)
    for bx, by in ((258, 126), (290, 124)): d.rectangle((bx, by, bx + 8, by + 9), fill=hx(0xe8d0a0)); d.line((bx + 2, by, bx + 4, by - 3, bx + 6, by), fill=hx(0x6a4a2a))   # shopping bags
    return P.grade(cv, 0x2a1a4a, 0.06)


def s_dawn():
    """SECOND LIFE: dawn over the floating islands, and the six of them walk out over the hill together toward it."""
    img = P.sky(0x1a0a3a, 0x6a1a5a, 0xff6a5a, 0xffc070, 0xfff0c0)
    img = P.radial(160, 140, 60, [0xffffff, 0xfff0b0, 0xffc070], img, 0.8)
    cv = P.to_im(img)
    P.rays(cv, 160, 140, 18, 0xfff0c0, 40, length=320)
    img = np.array(cv.convert('RGB')).astype(float)
    img = P.ridge(img, 150, 6, 0x2a0e30, 3, step=3)
    cv = P.to_im(img); d = P.draw(cv)
    for x, y, w in ((30, 60, 40), (250, 50, 50)):                                            # floating islands far off
        d.polygon([(x, y), (x + w, y), (x + w * 0.6, y + 16), (x + w * 0.4, y + 22)], fill=hx(0x6a2a5a)); d.rectangle((x, y - 2, x + w, y), fill=hx(0xa85a6a))
    d.polygon([(0, 180), (0, 160), (160, 150), (320, 160), (320, 180)], fill=hx(0x14061a))
    crew = [('hero-knight/run_sheet.png', 1, 150, 90), ('soul-summoner/run_sheet.png', 2, 64, 64), ('mr-wake/run_sheet.png', 4, 64, 64),
            ('nu/run_sheet.png', 6, 64, 64), ('aero/run_sheet.png', 1, 64, 64), ('gnash/run_sheet.png', 3, 160, 96)]
    for i, (path, f, fw, fh) in enumerate(crew):
        P.put(cv, P.silhouette(P.strip(path, f, fw, fh), (16, 6, 22)), 60 + i * 40, 158 - (i % 2), light=hx(0xffe0a0), side=1)
    return P.grade(cv, 0xff8a5a, 0.06)


STORIES = {'names': s_names, 'bridge': s_bridge, 'oath': s_oath, 'soundcheck': s_soundcheck, 'eater': s_eater, 'closing': s_closing, 'dawn': s_dawn}


def main():
    os.makedirs(OUT, exist_ok=True); shots = []
    for sid, fn in STORIES.items():
        P.rng = np.random.default_rng(len(sid) * 31)
        im = fn().convert('RGB')
        im.quantize(255, dither=Image.NONE).save(os.path.join(OUT, 'story-' + sid + '_bg.png'), optimize=True)
        shots.append(im); print('story', sid)
    if '--preview' in sys.argv:
        sheet = Image.new('RGB', (W * 2 * 2, H * 2 * 4))
        for i, im in enumerate(shots): sheet.paste(im.resize((W * 2, H * 2), Image.NEAREST), ((i % 2) * W * 2, (i // 2) * H * 2))
        sheet.save(sys.argv[sys.argv.index('--preview') + 1])


if __name__ == '__main__':
    main()

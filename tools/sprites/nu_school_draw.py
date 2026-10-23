"""NU's HOMEROOM costume: a school uniform worn the way he'd wear it. Same body, joints and rig as nu_draw.py (so
every animation in nu_moves.py plays on it), redrawn:

  - a navy blazer with a gold crest, a white shirt with the collar open and a red tie pulled loose
  - grey slacks, brown loafers, white shirt cuffs
  - his bleached spikes with blue tips, a plaster on his cheek, a red backpack slung over one shoulder

Its AMP DROP is its own drawing too: a school locker with a boombox on top (school_amp(), saved as
public/assets/fighters/nu/school/amp.png - two frames, the second with the speaker cones pumped).

  python3 tools/sprites/nu_school_draw.py preview.png
"""
import os
import numpy as np
from PIL import Image, ImageDraw
import nu_draw as N

NAVY = (0x4a5a9e, 0x2a3670, 0x161d44)
PAL = {
    'hood': NAVY,                                     # the blazer
    'pants': (0x9a9aa4, 0x74747e, 0x4a4a54),         # grey slacks
    'shoe': (0xa8724a, 0x6e4426, 0x3e2412),          # brown loafers
    'tip': (0xb8d4ff, 0x5a8ae8, 0x2a3e8a),           # blue tips on the bleached spikes
    'acid': (0xff6a5a, 0xd8221e, 0x8a0e0e),          # school red
    'band': (0xffffff, 0xe8e8ee, 0xa8a8b4),          # white shirt cuffs
}
OUT = 0x10101a
GOLD = (0xfff0a8, 0xe0a83a, 0x8a5a14)
WHITE = (0xffffff, 0xe8e8ee, 0xb0b0bc)
hx = N.hx

def put(a, pts, col):
    for (x, y) in pts:
        if 0 <= y < 64 and 0 <= x < 64 and a[y, x, 3]: a[y, x] = hx(col)

def draw_parts():
    old = dict(N.PAL)
    N.PAL.update(PAL)
    try:
        P = N.draw_parts()
    finally:
        N.PAL.clear(); N.PAL.update(old)
    # ---- the blazer: no print or drawstrings; shirt and loose tie down the front, lapels, crest, buttons
    t = P['torso']; body = t[..., 3] > 0
    outl = tuple(hx(N.OUT)[:3])
    for y in range(18, 41):
        for x in range(23, 44):
            if body[y, x] and tuple(t[y, x, :3]) != outl and tuple(t[y, x, :3]) not in (tuple(hx(NAVY[0])[:3]), tuple(hx(NAVY[2])[:3])): t[y, x] = hx(NAVY[1])
    for y in range(22, 32):                                                   # the open shirt: a white V narrowing down
        w = max(1, 3 - (y - 22) // 3)
        for x in range(35 - w, 36 + w): put(t, [(x, y)], WHITE[1])
        put(t, [(35 - w, y)], WHITE[2])
    put(t, [(33, 22), (37, 22)], WHITE[0])                                     # collar points
    put(t, [(34, 23), (35, 23), (36, 23)], 0xd8221e)                          # the tie: a loose knot and a long tail
    for y in range(24, 33): put(t, [(35, y), (36, y)], 0xd8221e if y % 3 else 0x8a0e0e)
    put(t, [(35, 33)], 0x8a0e0e)
    for y in range(23, 34): put(t, [(33 - (y - 23) // 4, y)], NAVY[2]); put(t, [(37 + (y - 23) // 5, y)], NAVY[0])   # lapels
    put(t, [(28, 27), (29, 27), (30, 27), (28, 28), (30, 28), (29, 29)], GOLD[1]); put(t, [(29, 28)], 0xd8221e)   # the crest
    put(t, [(36, 35), (36, 38)], GOLD[1])                                      # buttons
    t[40, 25:42][t[40, 25:42, 3] > 0] = hx(PAL['pants'][1])
    for y in range(24, 37):                                                    # the backpack behind him, a strap over his shoulder
        for x in range(21, 25):
            t[y, x] = hx(0xd8221e if x in (22, 23) else 0x8a0e0e)
    t[24:37, 20] = hx(OUT); t[23, 21:25] = hx(OUT); t[37, 21:25] = hx(OUT); put(t, [(22, 30), (23, 30)], 0xffd23a)
    put(t, [(26, 22), (27, 23), (28, 24), (29, 25)], 0x8a0e0e)
    P['torso'] = t
    # ---- slacks: a crease; loafers: a lighter strap
    for nm in ('fthigh', 'bthigh', 'fshin', 'bshin'):
        a = P[nm]; ys, xs = np.nonzero(a[..., 3])
        if len(xs): cx = int(np.median(xs)); put(a, [(cx, y) for y in range(ys.min() + 1, ys.max())], PAL['pants'][2])
    for nm, x0 in (('bshoe', 17), ('fshoe', 39)):
        a = P[nm]
        for y in range(53, 59):
            for x in range(64):
                if a[y, x, 3] and tuple(a[y, x, :3]) in [tuple(hx(c)[:3]) for c in PAL['acid']]: a[y, x] = hx(PAL['shoe'][0])
        put(a, [(x0 + i, 55) for i in range(1, 6)], 0x3e2412)
    # ---- face: no war paint, a plaster on the cheek
    h = P['head']
    h[12:15, 31:40][h[12:15, 31:40, 3] > 0] = hx(N.PAL['skin'][1])
    h[13, 36] = hx(0x2a2630); h[13, 37] = hx(0xffffff); h[13, 33] = hx(0x2a2630); h[12, 36:38] = hx(0x6a4a2a); h[12, 33] = hx(0x6a4a2a)
    h[16, 35:38] = hx(0xf0dcc0); h[16, 36] = hx(0xd8b898)
    P['head'] = h
    # ---- hair: goggles off, a red sweatband instead
    a = P['hair']
    a[8:12, 35:40][a[8:12, 35:40, 3] > 0] = hx(N.PAL['hair'][1])
    for x in range(27, 41):
        if a[9, x, 3]: a[9, x] = hx(0xd8221e)
        if a[10, x, 3]: a[10, x] = hx(0x8a0e0e)
    P['hair'] = a
    return P

ORDER, RIG = N.ORDER, N.RIG
def composite(P, hide=('can',)): return N.composite(P, hide)

def school_amp():
    """AMP DROP in HOMEROOM: a blue school locker with a chunky boombox on top. 32x64, two frames (cones pumped)."""
    frames = []
    for pump in (0, 1):
        im = Image.new('RGBA', (32, 64), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        O = hx(0x10141c)
        # -- the locker
        d.rectangle([1, 30, 30, 63], fill=O); d.rectangle([2, 31, 29, 62], fill=hx(0x3a6ac8))
        d.line([(2, 31), (29, 31)], fill=hx(0x7aa8f0)); d.line([(2, 31), (2, 62)], fill=hx(0x6a9ae8)); d.line([(29, 32), (29, 62)], fill=hx(0x24448a))
        d.rectangle([4, 33, 27, 60], outline=hx(0x24448a))                      # the door
        d.line([(5, 34), (26, 34)], fill=hx(0x6a9ae8))
        for y in (36, 38, 40):                                                   # vent slats
            d.line([(8, y), (23, y)], fill=hx(0x16244a)); d.line([(8, y + 1), (23, y + 1)], fill=hx(0x7aa8f0))
        d.rectangle([11, 43, 20, 47], fill=hx(0xc8ccd4), outline=hx(0x5a5e6a))   # number plate: 07
        for (x, y) in [(13, 44), (14, 44), (13, 45), (14, 46), (13, 46), (16, 44), (17, 44), (18, 44), (18, 45), (17, 46)]: d.point((x, y), fill=hx(0x16244a))
        d.rectangle([23, 46, 25, 52], fill=hx(0xc8ccd4), outline=hx(0x5a5e6a))   # latch
        d.arc([22, 51, 27, 56], 180, 360, fill=hx(0xa8acb4))                      # the padlock's shackle...
        d.rectangle([22, 54, 27, 58], fill=hx(0xe0a83a), outline=hx(0x8a5a14)); d.point((24, 56), fill=hx(0x3e2412))   # ...and body
        for (x, y) in [(7, 50), (6, 51), (7, 51), (8, 51), (7, 52), (5, 51), (9, 51), (6, 53), (8, 53)]: d.point((x, y), fill=hx(0xffd23a))   # a gold star sticker
        d.rectangle([5, 56, 11, 58], fill=hx(0xffffff)); d.line([(6, 57), (10, 57)], fill=hx(0xd8221e))   # a NU sticker
        # -- the boombox
        d.arc([8, 2, 23, 14], 180, 360, fill=hx(0x3a3e48), width=2)             # carry handle
        d.line([(28, 1), (28, 10)], fill=hx(0x8a90a0)); d.point((28, 0), fill=hx(0xd8221e))   # antenna
        d.rectangle([0, 9, 31, 30], fill=O); d.rectangle([1, 10, 30, 29], fill=hx(0xc8ccd4))
        d.line([(1, 10), (30, 10)], fill=hx(0xeef2f6)); d.line([(1, 29), (30, 29)], fill=hx(0x8a90a0)); d.line([(30, 11), (30, 28)], fill=hx(0x8a90a0))
        d.rectangle([1, 26, 30, 28], fill=hx(0x3a3e48))                          # the dark band along the bottom
        for i, c in enumerate((0xd8221e, 0xffd23a, 0x3ac85a, 0x3a8ae8)): d.rectangle([11 + i * 3, 11, 12 + i * 3, 12], fill=hx(c))   # buttons
        d.rectangle([12, 14, 19, 20], fill=hx(0x1a1c22), outline=hx(0x5a5e6a))   # cassette window, two reels turning
        for rx in (14, 17): d.ellipse([rx - 1, 16, rx + 1, 18], fill=hx(0xc8ccd4)); d.point((rx, 17), fill=hx(0x1a1c22))
        d.rectangle([13, 22, 18, 24], fill=hx(0x8a90a0))                         # the tuner strip
        d.point((14 + pump * 3, 23), fill=hx(0xd8221e))
        for cx in (6, 25):                                                       # the speakers
            r = 5 + pump
            d.ellipse([cx - r, 19 - r, cx + r, 19 + r], fill=O)
            d.ellipse([cx - r + 1, 19 - r + 1, cx + r - 1, 19 + r - 1], fill=hx(0x4a4e58))
            d.ellipse([cx - 2 - pump, 17 - pump, cx + 2 + pump, 21 + pump], fill=hx(0x2a2c34))
            d.point((cx, 19), fill=hx(0xd8221e)); d.point((cx - 2, 16), fill=hx(0x8a90a0))
        frames.append(np.array(im))
    return np.concatenate(frames, 1)

if __name__ == '__main__':
    import sys
    c = composite(draw_parts())
    bg = Image.new('RGBA', (64, 64), (60, 70, 90, 255)); bg.alpha_composite(Image.fromarray(c))
    bg.resize((640, 640), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else 'nu_school.png')
    amp = Image.fromarray(school_amp())
    out = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'assets', 'fighters', 'nu', 'school')
    os.makedirs(out, exist_ok=True); amp.save(os.path.join(out, 'amp.png'))
    if len(sys.argv) > 2:
        bg = Image.new('RGBA', amp.size, (60, 70, 90, 255)); bg.alpha_composite(amp); bg.resize((amp.size[0] * 8, amp.size[1] * 8), Image.NEAREST).save(sys.argv[2])

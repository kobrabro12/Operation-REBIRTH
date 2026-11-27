"""VITRAIL - THE ROSE OF SEVEN HOURS. The great stained-glass window of the Sky Sanctum's chapel, broken by the falling
star on the night of the Starfall and reborn as a person. His drawing, part by part on NU's joints (nu_draw.ORDER /
RIG), animated by trio_moves.py with the puppet rig.

An original design, made of what a window is made of - coloured glass held in black lead came:
- his head is a ROSE WINDOW: a round frame of lead with gold tracery knots on the rim, eight petal panes in jewel colours
  and, in the middle, one white-violet pane where the star went through - his eye;
- behind it a broken HALO of loose glass shards that float apart from each other (the `hair` slot), and two lead
  strips hanging down his back like the ends of a veil;
- his body is a pointed LANCET WINDOW: a mullion down the middle, transoms across, every pane its own colour, a violet
  star-shaped pane in his chest, and the bottom of the window broken off into three hanging shards with gaps between;
- glass sleeves (sapphire above the elbow, ruby below) round lead hands with one glowing gold fingertip;
- thin lead legs with a gold glass pane in each shin and pointed feet like a cathedral's finials;
- in his front hand (the `mic` slot) a little prism - the pane he casts with.

Every part is a 64x64 layer facing right, feet on row 58. Glass is lit from behind: each pane gets its colour, a brighter
top-left edge, a darker bottom-right edge and the odd white glint; the lead is the outline. draw_parts() returns
{name: RGBA array}.
"""
import math
import numpy as np
from PIL import Image, ImageDraw
from nu_draw import blank, shade5, limb, hx, ORDER, RIG, composite   # noqa: F401  (ORDER / RIG / composite: the rig uses them)

VARIANT = 'default'

# each look: the lead (5 tones, light to dark), the glass colours, the eye, and the gold of the tracery
LOOKS = {
    # the window as it was: ruby, sapphire, emerald, gold and amethyst, the star's violet in the middle
    'default': {'lead': (0x6a6480, 0x4a4560, 0x2c2838, 0x1a1724, 0x0c0a12),
                'glass': {'ruby': 0xe0283e, 'sapphire': 0x2a66e0, 'emerald': 0x26b45a, 'gold': 0xf2b42a, 'amethyst': 0x9a48e8},
                'eye': (0xffffff, 0xe8c8ff, 0xb87aff), 'gild': 0xf2c84a},
    # THE NIGHT WINDOW: the same window by moonlight - blues, teals and silver, a silver eye
    'nocturne': {'lead': (0x9aa2b8, 0x6a7088, 0x3a4058, 0x22263a, 0x0e1020),
                 'glass': {'ruby': 0x5a7ad8, 'sapphire': 0x24408e, 'emerald': 0x2a9aa8, 'gold': 0xc8d8f0, 'amethyst': 0x6a5ac8},
                 'eye': (0xffffff, 0xe8f2ff, 0x9ac8ff), 'gild': 0xd8e2f4},
    # THE BURNING ROSE: the night the chapel burned - amber, orange, blood red, charred lead with glowing cracks
    'ember': {'lead': (0x5a3a30, 0x3a2620, 0x241612, 0x160c0a, 0x080404),
              'glass': {'ruby': 0xd8301a, 'sapphire': 0xa83a1a, 'emerald': 0xe8781e, 'gold': 0xffc84a, 'amethyst': 0x8a1a2a},
              'eye': (0xffffff, 0xfff0b0, 0xff9a2a), 'gild': 0xff8a2a, 'crack': 0xff6a1a},
}
VARIANTS = {k: {} for k in LOOKS}

def L():
    """The current look."""
    return LOOKS.get(VARIANT, LOOKS['default'])

def tone(c, k):
    """Colour c lightened (k > 0, toward white) or darkened (k < 0, toward black)."""
    r, g, b = (c >> 16) & 255, (c >> 8) & 255, c & 255
    if k >= 0: r, g, b = r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k
    else: r, g, b = r * (1 + k), g * (1 + k), b * (1 + k)
    return (int(r) << 16) | (int(g) << 8) | int(b)

def blank_arr(): return np.zeros((64, 64, 4), np.uint8)

def setp(a, pts, c):
    """Sets pixels whether or not the layer has anything there."""
    for (x, y) in pts:
        if 0 <= y < 64 and 0 <= x < 64: a[y, x] = hx(c)

def over(a, b):
    """Lays layer b's pixels onto a."""
    m = b[..., 3] > 0; a[m] = b[m]; return a

def mask_of(draw_fn):
    """A boolean 64x64 mask from a PIL drawing function d -> None."""
    im = Image.new('L', (64, 64), 0); draw_fn(ImageDraw.Draw(im)); return np.array(im) > 0

def glass(a, m, c, glint=None):
    """Fills mask m with a pane of glass in colour c, lit from behind: a brighter top-left edge, a darker
    bottom-right edge, a glint pixel (or a short diagonal glint line) if asked."""
    H, W = m.shape
    for y, x in zip(*np.nonzero(m)):
        tl = (y == 0 or not m[y - 1, x]) or (x == 0 or not m[y, x - 1])
        br = (y == H - 1 or not m[y + 1, x]) or (x == W - 1 or not m[y, x + 1])
        a[y, x] = hx(tone(c, 0.4) if tl else tone(c, -0.35) if br else c)
    if glint:
        for (x, y) in glint:
            if 0 <= x < 64 and 0 <= y < 64 and m[y, x]: a[y, x] = hx(0xffffff)

def lead(a, m, outline=True):
    """Fills mask m with lead came: dark with a lighter top edge; `outline` = darkest rim."""
    LD = L()['lead']
    for y, x in zip(*np.nonzero(m)):
        edge = any(not (0 <= y + dy < 64 and 0 <= x + dx < 64 and m[y + dy, x + dx]) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        top = y > 0 and not m[y - 1, x]
        a[y, x] = hx(LD[4] if (edge and outline and not top) else LD[1] if top else LD[2])

def cracks(a, pts):
    """THE BURNING ROSE only: glowing cracks through the lead."""
    c = L().get('crack')
    if c: setp(a, pts, c)

def draw_parts():
    """VITRAIL, part by part (see the top of the file)."""
    lk = L(); G = lk['glass']; LD = lk['lead']; EYE = lk['eye']; GILD = lk['gild']
    P = {}
    # ---------------- legs: thin lead with a gold pane in each shin, pointed finial feet
    for side, hip, knee, ank in (('b', (29, 41), (26, 48), (25, 54)), ('f', (36, 41), (39, 48), (39, 54))):
        dark = side == 'b'
        a = blank_arr(); lead(a, mask_of(lambda d: limb(d, hip, knee, 4, 255))); P[side + 'thigh'] = a
        a = blank_arr(); lead(a, mask_of(lambda d: limb(d, knee, ank, 4, 255)))
        glass(a, mask_of(lambda d: d.line([(knee[0], knee[1] + 2), (ank[0], ank[1] - 2)], fill=255, width=2)), tone(G['gold'], -0.25 if dark else 0))
        P[side + 'shin'] = a
        x0 = ank[0] - 3
        a = blank_arr(); lead(a, mask_of(lambda d: d.polygon([(x0 + 1, 53), (x0 + 4, 53), (x0 + 9, 57), (x0 + 9, 58), (x0, 58)], fill=255)))
        setp(a, [(x0 + 8, 57), (x0 + 9, 57)], GILD); setp(a, [(x0 + 2, 54)], tone(G['gold'], -0.2))     # a gilt point at the toe
        P[side + 'shoe'] = a
    # ---------------- back arm: a darker glass sleeve, a lead hand
    a = blank_arr(); lead(a, mask_of(lambda d: limb(d, (27, 24), (25, 31), 5, 255)))
    glass(a, mask_of(lambda d: limb(d, (27, 25), (25, 30), 2, 255)), tone(G['sapphire'], -0.3)); P['bupper'] = a
    a = blank_arr(); lead(a, mask_of(lambda d: limb(d, (25, 31), (26, 36), 5, 255)))
    glass(a, mask_of(lambda d: limb(d, (25, 32), (26, 35), 2, 255)), tone(G['ruby'], -0.3))
    lead(a, mask_of(lambda d: d.ellipse([24, 35, 28, 39], fill=255))); setp(a, [(27, 39)], tone(GILD, -0.2))
    P['bfore'] = a
    P['can'] = blank_arr()
    # ---------------- torso: the lancet window - a pointed arch, a mullion, transoms, panes, the star pane, the broken hem
    a = blank_arr()
    body = [(33, 14), (36, 15), (38, 18), (39, 24), (39, 32), (40, 40), (41, 44), (25, 44), (26, 40), (27, 32), (27, 24), (28, 18), (30, 15)]
    lead(a, mask_of(lambda d: d.polygon(body, fill=255)))
    inner = mask_of(lambda d: d.polygon([(33, 16), (35, 16.5), (37, 19), (38, 24), (38, 32), (39, 40), (39, 43), (27, 43), (27, 40), (28, 32), (28, 24), (29, 19), (31, 16.5)], fill=255))
    rows = [(16, 21), (22, 27), (28, 33), (34, 38), (39, 43)]                            # transoms between these bands
    cols = [['amethyst', 'amethyst'], ['ruby', 'sapphire'], ['gold', 'emerald'], ['sapphire', 'ruby'], ['emerald', 'gold']]
    for (y0, y1), pair in zip(rows, cols):
        for side, name in zip((0, 1), pair):
            m = inner.copy(); m[:y0, :] = False; m[y1 + 1:, :] = False
            if side == 0: m[:, 33:] = False
            else: m[:, :34] = False
            # each pane is split by a diagonal came into two triangles of different glass (the leading of a real window)
            names = list(G); other = names[(names.index(name) + 2 + side) % len(names)]
            ys, xs = np.nonzero(m)
            if not len(xs): continue
            X0, X1, Y0, Y1 = xs.min(), xs.max(), ys.min(), ys.max()
            u = (np.arange(64)[None, :] - X0) / max(1, X1 - X0); v = (np.arange(64)[:, None] - Y0) / max(1, Y1 - Y0)
            diag = (u - v) if (side + rows.index((y0, y1))) % 2 else (u + v - 1)
            glass(a, m & (diag < -0.08), G[name], glint=[(X0 + 1, Y0 + 1)] if y0 in (22, 34) else None)
            glass(a, m & (diag > 0.08), G[other])
            a[m & (np.abs(diag) <= 0.08)] = hx(LD[3])
    # the STAR PANE in his chest, where the light comes through brightest
    star = [(33, 22), (34, 24), (36, 24.5), (34.5, 26), (35, 28), (33, 27), (31, 28), (31.5, 26), (30, 24.5), (32, 24)]
    sm = mask_of(lambda d: d.polygon(star, fill=255))
    a[sm] = hx(EYE[2]); setp(a, [(33, 24), (33, 25), (32, 25), (34, 25)], EYE[1]); setp(a, [(33, 25)], EYE[0])
    rim = mask_of(lambda d: d.polygon(star, outline=255))
    a[rim & ~sm] = hx(LD[3])
    # the hem: broken into three hanging shards with gaps between
    for poly, name in (([(26, 44), (30, 44), (29, 48), (27, 47)], 'ruby'), ([(31, 44), (35, 44), (34, 49), (32, 48)], 'amethyst'), ([(36, 44), (40, 44), (40, 47), (38, 49)], 'sapphire')):
        lead(a, mask_of(lambda d: d.polygon(poly, fill=255)))
        glass(a, mask_of(lambda d: d.polygon([(poly[0][0] + 1, poly[0][1] + 1), (poly[1][0] - 1, poly[1][1] + 1), (poly[2][0], poly[2][1] - 2), (poly[3][0], poly[3][1] - 1)], fill=255)), G[name])
    setp(a, [(33, 13), (32, 14), (34, 14)], GILD)                                          # the finial at the arch's point
    cracks(a, [(29, 30), (30, 31), (36, 37), (37, 38), (31, 40)])
    P['torso'] = a
    # ---------------- head: the ROSE WINDOW - a round lead frame, gilt knots, eight petal panes, the star's pane as his eye
    a = blank_arr(); cx, cy, R0 = 35.0, 12.0, 7.2
    petals = ['ruby', 'gold', 'sapphire', 'emerald', 'ruby', 'amethyst', 'sapphire', 'gold']
    for y in range(64):
        for x in range(64):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy; d = math.hypot(dx, dy)
            if d > R0: continue
            ang = (math.atan2(dy, dx) + math.pi * 2 + math.pi / 8) % (math.pi * 2); sec = int(ang / (math.pi / 4)); off = ang - sec * math.pi / 4
            if d > R0 - 1.1: a[y, x] = hx(LD[4] if dy > 0 else LD[3])                      # the outer rim
            elif d > R0 - 1.9: a[y, x] = hx(LD[2])
            elif d < 1.6: a[y, x] = hx(EYE[0] if d < 0.8 else EYE[1])                        # the eye: the star's pane
            elif d < 2.4: a[y, x] = hx(LD[3])                                               # the ring round it
            elif off < 0.11 or off > math.pi / 4 - 0.11: a[y, x] = hx(LD[3])                # lead between the petals
            else:
                c = G[petals[sec]]; k = 0.35 if (dx + dy) < -2 else -0.3 if (dx + dy) > 3.5 else 0
                a[y, x] = hx(tone(c, k))
    setp(a, [(36, 12)], EYE[2]); setp(a, [(35, 12)], EYE[0])
    for i in range(8):                                                                       # gilt tracery knots on the rim
        t = i * math.pi / 4; setp(a, [(int(round(cx - 0.5 + math.cos(t) * (R0 - 0.6))), int(round(cy - 0.5 + math.sin(t) * (R0 - 0.6))))], GILD)
    setp(a, [(32, 8), (33, 7)], 0xffffff)                                                    # a glint on the glass
    lead(a, mask_of(lambda d: d.rectangle([33, 19, 35, 21], fill=255)))                     # the lead stem it stands on
    cracks(a, [(30, 10), (31, 9), (39, 15), (40, 14)])
    P['head'] = a
    # ---------------- hair: the broken HALO - loose shards fanned behind his head, two lead strips hanging down his back
    a = blank_arr()
    shards = [([(27, 4), (30, 2), (29, 6)], 'gold'), ([(23, 8), (26, 6), (26, 10)], 'amethyst'), ([(21, 13), (25, 12), (23, 16)], 'gold'),
              ([(32, 1), (35, 0), (34, 3)], 'amethyst'), ([(24, 18), (27, 17), (25, 21)], 'sapphire')]
    for poly, name in shards:
        lead(a, mask_of(lambda d: d.polygon(poly, fill=255, outline=255)))
        cx2 = sum(p[0] for p in poly) / 3; cy2 = sum(p[1] for p in poly) / 3
        setp(a, [(int(cx2), int(cy2))], G[name]); setp(a, [(int(cx2) - 1, int(cy2))], tone(G[name], 0.4))
    lead(a, mask_of(lambda d: d.line([(29, 16), (25, 26), (24, 31)], fill=255, width=1)))
    lead(a, mask_of(lambda d: d.line([(30, 18), (27, 27), (27, 33)], fill=255, width=1)))
    setp(a, [(24, 31), (27, 33)], GILD)
    P['hair'] = a
    # ---------------- front arm: glass sleeves (sapphire, ruby), a lead hand with a gold fingertip, the prism
    a = blank_arr(); lead(a, mask_of(lambda d: limb(d, (38, 24), (42, 31), 5, 255)))
    glass(a, mask_of(lambda d: limb(d, (38, 25), (41, 30), 2, 255)), G['sapphire']); P['fupper'] = a
    a = blank_arr(); lead(a, mask_of(lambda d: limb(d, (42, 31), (44, 28), 5, 255)))
    glass(a, mask_of(lambda d: d.line([(42, 30), (43, 29)], fill=255, width=2)), G['ruby']); P['ffore'] = a
    k = blank_arr()                                                                          # the prism floating over his hand
    lead(k, mask_of(lambda d: d.polygon([(45, 17), (48, 22), (42, 22)], fill=255)))
    glass(k, mask_of(lambda d: d.polygon([(45, 18.5), (47, 21.5), (43, 21.5)], fill=255)), EYE[2], glint=[(45, 19)])
    setp(k, [(45, 20)], 0xffffff)
    P['mic'] = k
    a = blank_arr(); lead(a, mask_of(lambda d: d.ellipse([42, 23, 46, 28], fill=255)))
    setp(a, [(46, 24)], GILD); setp(a, [(45, 23)], LD[0]); P['ffist'] = a
    return P

if __name__ == '__main__':
    import sys
    for v in LOOKS:
        VARIANT = v
        c = composite(draw_parts())
        bg = Image.new('RGBA', (64, 64), (24, 20, 40, 255)); bg.alpha_composite(Image.fromarray(c))
        bg.resize((512, 512), Image.NEAREST).save((sys.argv[1] if len(sys.argv) > 1 else 'vitrail_preview') + '_' + v + '.png')

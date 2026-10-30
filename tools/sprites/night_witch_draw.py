"""NIGHT WITCH - the fighter at the bottom of the rarest nesting doll in the shop (code PAPERSPLEASE): a WW2 night-bomber
pilot, named after the women's night-bomber regiment the enemy called the "night witches". An original design, drawn
part by part on the same joints as ROSEMARY (last_seen_draw.py, on NU's rig) so the same puppet animates her, and
in the same style: slim, small head, each piece outlined in a darker shade of its own colour, five-tone shading.

  a close leather flying helmet with its ear flaps and chin strap, brass-rimmed goggles pushed up on her forehead,
  a dark braid; a brown leather flight jacket with a thick sheepskin collar and a belt; a white silk scarf, its tail
  streaming out behind her; dark blue jodhpurs flaring at the thigh,
  tall black boots; leather gloves - and a big steel wrench in her hand.

  python3 tools/sprites/night_witch_draw.py preview.png
"""
import numpy as np
from PIL import Image, ImageDraw
import nu_draw
from nu_draw import blank, hx
import last_seen_draw as LS
from last_seen_draw import shade, limb, put

LEATHER = (0xd09a62, 0xa8703c, 0x8a5428, 0x643a18, 0x341c08)
FLEECE = (0xfffaee, 0xf2e6cc, 0xdccaa6, 0xb8a07a, 0x6a5a3e)
PANTS = (0x8a96a8, 0x667286, 0x4c566a, 0x343c4c, 0x181c26)
BOOT = (0x6a6a72, 0x44444c, 0x2c2c32, 0x1a1a1e, 0x08080a)
GLOVE = (0x8a6a4a, 0x6a4a30, 0x4e3420, 0x342214, 0x180e06)
SKIN = (0xfbe9dc, 0xf0d0bc, 0xd9ae98, 0xa87c6c, 0x5a3a34)
HAIR = (0x6a4a3a, 0x4a2e22, 0x34201a, 0x22140e, 0x100806)
SCARF = (0xffffff, 0xf2f2f6, 0xdadae4, 0xb2b2c2, 0x6a6a7c)
STEEL = (0xe8e8f0, 0xb4b4c0, 0x86869a, 0x5a5a6c, 0x26262e)

def draw_parts():
    P = {}
    # ---------------- legs: jodhpurs that flare at the thigh, tall black boots
    for side, hip, knee, ank in (('b', (28, 40), (25, 48), (24, 55)), ('f', (37, 40), (40, 48), (40, 55))):
        im = blank(); d = ImageDraw.Draw(im); limb(d, hip, knee, 6, hx(PANTS[2]))
        mx, my = (hip[0] + knee[0]) // 2, (hip[1] + knee[1]) // 2
        d.ellipse([mx - 4, my - 3, mx + 3, my + 3], fill=hx(PANTS[2]))                     # the flare
        a = shade(im, PANTS); put(a, [(mx - 2, my - 1), (mx - 2, my)], PANTS[1]); P[side + 'thigh'] = a
        im = blank(); d = ImageDraw.Draw(im); limb(d, knee, (ank[0], 50), 4, hx(PANTS[2]))
        d.polygon([(knee[0] - 2, 49), (knee[0] + 2, 49), (ank[0] + 1, 56), (ank[0] - 2, 56)], fill=hx(BOOT[2]))   # the boot's tall shaft
        a = np.array(im)
        pants = np.array(shade(Image.fromarray(np.where((np.arange(64)[:, None, None] < 49), a, 0).astype(np.uint8)), PANTS))
        boot = shade(Image.fromarray(np.where((np.arange(64)[:, None, None] >= 49), a, 0).astype(np.uint8)), BOOT)
        a = pants.copy(); m = boot[..., 3] > 0; a[m] = boot[m]
        put(a, [(ank[0] - 1, 51), (ank[0] - 1, 52), (ank[0] - 1, 53)], BOOT[0])           # a shine down the leather
        P[side + 'shin'] = a
        im = blank(); d = ImageDraw.Draw(im); x0 = ank[0] - 3
        d.polygon([(x0 + 1, 55), (x0 + 5, 55), (x0 + 8, 57), (x0 + 8, 58), (x0 + 1, 58)], fill=hx(BOOT[2]))
        a = shade(im, BOOT); put(a, [(x, 58) for x in range(x0 + 1, x0 + 9)], 0x101014); put(a, [(x0 + 2, 56)], BOOT[0])
        P[side + 'shoe'] = a
    # ---------------- back arm: a leather sleeve, a gloved hand
    im = blank(); d = ImageDraw.Draw(im); limb(d, (27, 24), (25, 31), 4, hx(LEATHER[2])); a = shade(im, LEATHER); put(a, [(26, 27)], LEATHER[3]); P['bupper'] = a
    im = blank(); d = ImageDraw.Draw(im); limb(d, (25, 31), (26, 37), 4, hx(LEATHER[2])); a = shade(im, LEATHER)
    im2 = blank(); d2 = ImageDraw.Draw(im2); d2.ellipse([24, 36, 28, 40], fill=hx(GLOVE[2])); g = shade(im2, GLOVE); m = g[..., 3] > 0; a[m] = g[m]
    put(a, [(25, 35), (26, 35), (27, 35)], FLEECE[2])                                       # the fleece cuff
    P['bfore'] = a
    P['poster'] = np.array(blank())
    # ---------------- torso: the flight jacket - sheepskin collar, a zip, a belt - and the jodhpurs' seat below it
    im = blank(); d = ImageDraw.Draw(im)
    d.polygon([(28, 21), (38, 21), (39, 24), (39, 38), (38, 41), (28, 41), (27, 38), (27, 24)], fill=hx(LEATHER[2]))
    a = shade(im, LEATHER)
    im2 = blank(); d2 = ImageDraw.Draw(im2); d2.polygon([(27, 39), (39, 39), (40, 45), (26, 45)], fill=hx(PANTS[2])); pt = shade(im2, PANTS)
    m = pt[..., 3] > 0; m[:41] = False; a[m] = pt[m]
    put(a, [(x, y) for y in (35, 36) for x in range(27, 40)], 0x3a2410); put(a, [(33, 35), (34, 35), (33, 36), (34, 36)], 0xc8a040)   # belt, buckle
    put(a, [(33, y) for y in range(24, 35)], LEATHER[3]); put(a, [(33, 26), (33, 30)], STEEL[1])                                     # zip
    put(a, [(29, y) for y in (27, 28)], LEATHER[3]); put(a, [(37, y) for y in (28, 29)], LEATHER[3])                                  # pocket seams
    put(a, [(29, 24), (29, 25), (30, 24)], LEATHER[0])
    sc = blank(); ds = ImageDraw.Draw(sc)                                                   # the white silk scarf: its tail streaming out behind her
    ds.polygon([(30, 21), (25, 21), (20, 23), (16, 22), (18, 25), (23, 25), (29, 24)], fill=hx(SCARF[2])); ds.polygon([(18, 25), (14, 28), (17, 28), (21, 25)], fill=hx(SCARF[2]))
    s_ = shade(sc, SCARF); put(s_, [(22, 22), (26, 22)], SCARF[0]); put(s_, [(16, 22), (14, 28)], 0xc8202a)
    m = s_[..., 3] > 0; a[m] = s_[m]
    im3 = blank(); d3 = ImageDraw.Draw(im3); d3.polygon([(28, 19), (39, 19), (40, 23), (36, 25), (31, 25), (27, 23)], fill=hx(FLEECE[2])); fl = shade(im3, FLEECE)   # the collar
    m = fl[..., 3] > 0; a[m] = fl[m]
    for (x, y) in ((29, 20), (31, 21), (35, 20), (37, 21), (30, 23), (38, 22)): put(a, [(x, y)], FLEECE[0])   # fluffy
    put(a, [(32, 20), (33, 20), (34, 20)], SKIN[2]); put(a, [(33, 21)], SKIN[3])            # her neck in the collar
    P['torso'] = a
    # ---------------- head: a small, determined face under the flying helmet, goggles up on her forehead
    im = blank(); d = ImageDraw.Draw(im)
    d.rectangle([32, 17, 34, 22], fill=hx(SKIN[2]))
    d.polygon([(31, 9), (37, 9), (38, 12), (39, 15), (38, 16), (37, 18), (35, 19), (32, 19), (31, 17)], fill=hx(SKIN[2]))
    a = shade(im, SKIN)
    put(a, [(34, 13), (37, 13)], 0x2a1a14); put(a, [(35, 13)], 0xffffff); put(a, [(38, 13)], 0xffffff)   # sharp eyes
    put(a, [(34, 12), (35, 12), (37, 12), (38, 12)], HAIR[2])                                # level brows
    put(a, [(39, 15)], SKIN[3]); put(a, [(36, 17), (37, 17)], 0xb06a5a); put(a, [(38, 16)], 0xb06a5a)   # nose, a small smirk
    put(a, [(35, 15), (38, 15)], 0xf0a8a0)                                                  # wind-chapped cheeks
    # the helmet: close brown leather over the top and back of her head, ear flaps, a chin strap
    hel = blank(); dh = ImageDraw.Draw(hel)
    dh.polygon([(30, 13), (29, 9), (31, 6), (36, 5), (39, 7), (40, 10), (38, 10), (33, 10), (32, 13), (32, 17), (30, 17)], fill=hx(LEATHER[2]))
    hl = shade(hel, LEATHER); m = hl[..., 3] > 0; a[m] = hl[m]
    put(a, [(31, y) for y in range(13, 19)], LEATHER[3]); put(a, [(32, 18), (33, 19), (34, 19)], LEATHER[4])   # the ear flap, the strap under her chin
    put(a, [(31, 14)], 0xc8a040)                                                            # its buckle
    for x in range(31, 38): put(a, [(x, 6 + (1 if x < 33 else 0))], LEATHER[0]) if x % 2 else None   # stitching catching the light
    # the goggles, pushed up: two brass-rimmed lenses on a strap
    put(a, [(x, 9) for x in range(30, 40)], 0x3a2a18)
    for cx in (34, 38):
        put(a, [(cx - 1, 8), (cx, 8), (cx + 1, 8), (cx - 1, 10), (cx, 10), (cx + 1, 10), (cx - 2, 9), (cx + 2, 9)], 0xc8a040)
        put(a, [(cx - 1, 9), (cx, 9), (cx + 1, 9)], 0x6ab8e0); put(a, [(cx - 1, 9)], 0xd8f4ff)
    P['head'] = a
    # ---------------- hair: a dark braid out the back of the helmet
    im = blank(); d = ImageDraw.Draw(im)
    for i, (x, y) in enumerate(((29, 13), (28, 15), (28, 17), (27, 19))): d.ellipse([x - 1, y - 1, x + 1, y + 1], fill=hx(HAIR[2 if i % 2 else 1]))
    a = np.array(im)
    P['hair'] = a
    # ---------------- front arm: a leather sleeve, a gloved fist - holding a big steel wrench (drawn on the 'axe' part)
    im = blank(); d = ImageDraw.Draw(im); limb(d, (38, 24), (42, 31), 4, hx(LEATHER[2])); a = shade(im, LEATHER); put(a, [(39, 26)], LEATHER[0]); P['fupper'] = a
    im = blank(); d = ImageDraw.Draw(im); limb(d, (42, 31), (44, 27), 4, hx(LEATHER[2])); a = shade(im, LEATHER); put(a, [(43, 28), (44, 28)], FLEECE[2]); P['ffore'] = a
    im = blank(); d = ImageDraw.Draw(im); d.ellipse([42, 24, 46, 28], fill=hx(GLOVE[2])); a = shade(im, GLOVE); put(a, [(43, 25)], GLOVE[0]); P['ffist'] = a
    w = blank(); dw = ImageDraw.Draw(w)
    dw.line([(44, 26), (50, 17)], fill=hx(STEEL[2]), width=2)                               # the handle
    dw.polygon([(48, 18), (51, 12), (54, 13), (52, 16), (54, 18), (51, 21)], fill=hx(STEEL[2]))   # the open jaw
    dw.line([(42, 29), (44, 26)], fill=hx(STEEL[2]), width=2); dw.ellipse([40, 29, 43, 32], fill=hx(STEEL[2]))   # the ring end
    wr = shade(w, STEEL); put(wr, [(45, 24), (47, 21)], STEEL[0]); put(wr, [(52, 15)], 0x26262e); put(wr, [(41, 31)], 0x26262e)
    P['axe'] = wr
    for k in ('axed', 'jaw', 'face'): P[k] = np.array(blank())
    return P

ORDER = LS.ORDER
RIG = LS.RIG
def composite(P, hide=()): return LS.composite(P, hide)

if __name__ == '__main__':
    import sys
    c = composite(draw_parts())
    bg = Image.new('RGBA', (64, 64), (90, 100, 110, 255)); bg.alpha_composite(Image.fromarray(c))
    bg.resize((512, 512), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else 'night_witch.png')

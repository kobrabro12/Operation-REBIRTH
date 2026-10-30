"""ROSEMARY's other form in her RED ARMY costume (the shop's code PAPERSPLEASE): when her SIGHTINGS fill she doesn't turn
into SEEN - she turns into a TANK, with herself up in the turret hatch in her fur hat. Its own drawing and its own moves
(lastSeen.js TANK). Drawn frame by frame, piece by piece, in code: a Soviet-green hull with a sloped front, fenders,
rivets, spare track links, fuel drums and exhaust pipes at the back; tracks whose links run and road wheels that turn;
a cast turret with a red star, a mantlet and a long gun that aims and recoils; a ball-mounted machine gun in the hull;
and Rosemary in the open hatch, doing what each move needs (pointing, waving a flag, binoculars, a flare pistol...).
Effects that belong to the frame are drawn in too: muzzle flashes, gun smoke, machine-gun fire, exhaust, dust, rockets.

  python3 tools/sprites/rosemary_tank.py [--preview DIR]
  -> public/assets/fighters/last-seen/tank/{idle,run,jump,fall,moves}_sheet.png, icon.png (112x104 frames, its tracks
     resting on 56,95), and src/fighters/lsTankMoves.js (the moves' frame index: [first frame, count, ticks per frame, loops?])
"""
import os, sys, math, json
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
OUT = os.path.join(ROOT, 'public/assets/fighters/last-seen/tank')
JS = os.path.join(ROOT, 'src/fighters/lsTankMoves.js')
FW, FH, GX, GY = 112, 104, 56, 95          # frame size; where the middle of its tracks touches the ground

def hx(c, a=255): return ((c >> 16) & 255, (c >> 8) & 255, c & 255, a)
# five tones per material: highlight, light, mid, shadow, outline
HULL = (0x9aaa62, 0x748646, 0x56682f, 0x3c4a20, 0x161c0a)
STEEL = (0x9a9aa2, 0x6a6a72, 0x46464e, 0x2c2c32, 0x0e0e12)
TRACK = (0x6a6a6e, 0x4a4a50, 0x34343a, 0x222228, 0x0c0c10)
WOOD = (0xb08a5a, 0x8a6a3a, 0x6a4a26, 0x4a3218, 0x241808)
SNOW = 0xeef2fa
RED, REDD, WHITE = 0xd8201e, 0x8a100e, 0xf4f4ec
FUR = (0xc8ac88, 0x9a7e5c, 0x7a6044, 0x56422e, 0x2e2218)
SKIN = (0xfbe9dc, 0xf0d0bc, 0xd9ae98, 0xa87c6c, 0x5a3a34)
HAIR = (0xd88a52, 0xb0603a, 0x8a4426)
COAT = (0xb2aa78, 0x8e8656, 0x726a40, 0x524a2a, 0x2a2614)

def rot(px, py, cx, cy, deg):
    a = math.radians(deg); dx, dy = px - cx, py - cy
    return (cx + dx * math.cos(a) + dy * math.sin(a), cy - dx * math.sin(a) + dy * math.cos(a))   # (y down; +deg = counterclockwise on screen)

# ------------------------------------------------------------------------------------------------ the tank itself
def draw_tank(p):
    """The tank (no effects) as an RGBA array, in the frame, upright. p: the pose (see pose())."""
    im = Image.new('RGBA', (FW, FH), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    dy, ph, ang, rec = p['dy'], p['ph'], p['ang'], p['rec']
    Y = lambda y: y + dy                                               # the hull bobs on its suspension; the tracks don't
    # ---- the tracks: a long loop of links over the road wheels, a drive sprocket at the front, an idler at the back
    d.rounded_rectangle([19, 81, 93, 95], radius=7, fill=hx(TRACK[4]))
    d.rounded_rectangle([20, 82, 92, 94], radius=6, fill=hx(TRACK[2]))
    for x in range(22, 91):                                            # the links: they run as it drives (ph)
        k = int(x + ph * 4) % 4
        d.point((x, 82), fill=hx(TRACK[0] if k == 0 else TRACK[1] if k == 1 else TRACK[2]))
        d.point((x, 94), fill=hx(TRACK[1] if (int(x - ph * 4) % 4) < 2 else TRACK[3]))
        if k == 0: d.point((x, 83), fill=hx(TRACK[3]))
    for (cx, r, teeth) in ((26, 4.6, False), (86, 5.2, True)) + tuple((x, 4.6, False) for x in (35, 45, 55, 65, 75)):
        d.ellipse([cx - r, 88.5 - r, cx + r, 88.5 + r], fill=hx(HULL[3]), outline=hx(TRACK[4]))
        d.ellipse([cx - r + 1.6, 88.5 - r + 1.6, cx + r - 1.6, 88.5 + r - 1.6], fill=hx(HULL[2]))
        d.point((cx - 1, 87), fill=hx(HULL[1]))
        a = ph * 1.3 + cx                                                  # a bolt going round: the wheels turn
        d.point((round(cx + math.cos(a) * 2), round(88.5 + math.sin(a) * 2)), fill=hx(STEEL[0]))
        d.ellipse([cx - 1, 87.5, cx + 1, 89.5], fill=hx(STEEL[1]))
        if teeth:
            for t in range(6):
                b = ph * 1.3 + t * math.pi / 3
                d.point((round(cx + math.cos(b) * 5.6), round(88.5 + math.sin(b) * 5.6)), fill=hx(TRACK[0]))
    if p.get('snowtrack'): d.line([(24, 94), (88, 94)], fill=hx(SNOW, 140))
    # ---- the hull: a sloped front plate (glacis), a sloped back, fenders over the tracks
    hull = [(17, Y(81)), (21, Y(72)), (77, Y(72)), (95, Y(81))]
    d.polygon([(x - 1, y + 1) for x, y in hull], fill=hx(HULL[4]))
    d.polygon(hull, fill=hx(HULL[2]))
    d.polygon([(77, Y(72)), (95, Y(81)), (90, Y(81)), (75, Y(74))], fill=hx(HULL[1]))           # the glacis catching light
    d.line([(21, Y(72)), (77, Y(72))], fill=hx(HULL[0])); d.line([(17, Y(81)), (21, Y(73))], fill=hx(HULL[3]))
    d.rectangle([16, Y(79), 96, Y(81)], fill=hx(HULL[3])); d.line([(16, Y(79)), (96, Y(79))], fill=hx(HULL[1]))   # the fenders
    for x in range(20, 94, 6): d.point((x, Y(80)), fill=hx(HULL[0]))                                # rivets
    for x in range(26, 72, 8): d.point((x, Y(74)), fill=hx(HULL[0]))
    # spare track links on the glacis, a towing hook, a headlight, the ball-mounted machine gun
    for k in range(2): d.rectangle([80 + k * 5, Y(74 + k * 2), 83 + k * 5, Y(76 + k * 2)], fill=hx(TRACK[2]), outline=hx(TRACK[4]))
    d.ellipse([88, Y(74), 91, Y(77)], fill=hx(0xe8e0a0), outline=hx(HULL[4]))
    d.ellipse([80, Y(76), 84, Y(80)], fill=hx(HULL[3]), outline=hx(HULL[4]))
    d.line([(84, Y(78)), (89, Y(78) - (1 if p.get('mgUp') else 0))], fill=hx(STEEL[3]), width=1)
    # at the back: two fuel drums and the exhaust pipes
    for k in range(2): d.rounded_rectangle([18 + k * 2, Y(66 + k * 6), 27 + k * 2, Y(71 + k * 6)], radius=2, fill=hx(HULL[3]), outline=hx(HULL[4]))
    d.rectangle([15, Y(76), 18, Y(78)], fill=hx(STEEL[3])); d.point((15, Y(77)), fill=hx(0x1a1a1a))
    # a tow cable looped along the side, and snow on the fenders (it's winter)
    d.line([(30, Y(76)), (40, Y(77)), (50, Y(76)), (60, Y(77))], fill=hx(STEEL[2]))
    for x in range(18, 95, 3):
        if (x * 7) % 5 < 3: d.point((x, Y(78)), fill=hx(SNOW))
    # ---- the turret: cast steel, sloped, a red star on the side, the gun's mantlet at the front, a hatch on top
    tur = [(35, Y(72)), (37, Y(61)), (43, Y(55)), (62, Y(55)), (68, Y(60)), (69, Y(72))]
    d.polygon([(x + 1, y + 1) for x, y in tur], fill=hx(HULL[4]))
    d.polygon(tur, fill=hx(HULL[2]))
    d.polygon([(37, Y(61)), (43, Y(55)), (55, Y(55)), (50, Y(60)), (40, Y(66))], fill=hx(HULL[1]))     # light on its upper left
    d.line([(43, Y(55)), (61, Y(55))], fill=hx(HULL[0])); d.line([(68, Y(61)), (69, Y(71))], fill=hx(HULL[3]))
    d.line([(36, Y(71)), (69, Y(71))], fill=hx(HULL[3]))                                                 # the turret ring
    sx, sy = 50, Y(64)                                                                                   # the star
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5; r = 4.2 if i % 2 == 0 else 1.8
        pts.append((sx + math.cos(a) * r, sy + math.sin(a) * r))
    d.polygon([(x, y) for x, y in pts], fill=hx(RED), outline=hx(WHITE))
    d.point((sx, sy - 1), fill=hx(0xff6a5a))
    for x, y in ((40, Y(68)), (60, Y(58)), (64, Y(68))): d.point((x, y), fill=hx(HULL[0]))           # cast bumps / bolts
    d.rectangle([66, Y(60), 71, Y(67)], fill=hx(HULL[3]), outline=hx(HULL[4]))                        # the mantlet
    d.line([(67, Y(61)), (67, Y(66))], fill=hx(HULL[1]))
    # ---- the gun: aims (ang, degrees up) and recoils (rec, pixels back)
    px, py = 70, Y(63)
    L = 32 - rec
    tip = rot(px + L, py, px, py, ang)
    for w, col in ((5, HULL[4]), (3, HULL[3])):
        d.line([(px, py), tip], fill=hx(col), width=w)
    a0 = rot(px + 1, py - 1, px, py, ang); a1 = rot(px + L - 2, py - 1, px, py, ang)
    d.line([a0, a1], fill=hx(HULL[1]))                                                                     # light along the top of the barrel
    b0 = rot(px + L - 4, py, px, py, ang); b1 = rot(px + L + 1, py, px, py, ang)
    d.line([b0, b1], fill=hx(HULL[4]), width=5); d.line([b0, b1], fill=hx(STEEL[2]), width=3)             # the muzzle brake
    p['tip'] = (tip[0] + math.cos(math.radians(ang)), tip[1] - math.sin(math.radians(ang)))
    # ---- the hatch (open: its lid stands up behind her) and Rosemary
    if p['hatch'] == 'open':
        d.polygon([(44, Y(55)), (47, Y(55)), (44, Y(46)), (41, Y(47))], fill=hx(HULL[3]), outline=hx(HULL[4]))
        draw_rose(d, 52, Y(55), p)
    else:
        d.ellipse([45, Y(52), 57, Y(56)], fill=hx(HULL[3]), outline=hx(HULL[4])); d.point((49, Y(53)), fill=hx(HULL[1]))
    return np.array(im)

def draw_rose(d, cx, by, p):
    """Rosemary up in the hatch: her shoulders in the greatcoat, her face, her auburn hair under the fur hat with its red
    star - and her arms doing what the pose says (p['rose'])."""
    pose, lk = p.get('rose', 'look'), p.get('look', 0)
    if pose == 'duck': by += 6                                                       # ducking down into the hatch
    hy = by - 9 - (1 if pose == 'cheer' else 0)                                      # the top of her face
    d.rectangle([cx - 5, by - 3, cx + 5, by], fill=hx(COAT[2]), outline=hx(COAT[4]))          # shoulders
    d.point((cx - 2, by - 3), fill=hx(RED)); d.point((cx + 2, by - 3), fill=hx(RED))           # collar tabs
    fx = cx + round(lk)                                                              # her face turns with `look`
    d.rectangle([fx - 3, hy, fx + 3, hy + 6], fill=hx(SKIN[2])); d.line([(fx - 3, hy), (fx - 3, hy + 6)], fill=hx(SKIN[3]))
    d.line([(fx - 4, hy + 1), (fx - 4, hy + 5)], fill=hx(HAIR[1]))                    # hair at the side
    face = 1 if lk >= 0 else -1
    d.point((fx + face * 1, hy + 2), fill=hx(0xffffff)); d.point((fx + face * 2, hy + 2), fill=hx(0x1a1010))   # her wide eye (Mason's edit)
    d.point((fx + face * 1, hy + 5), fill=hx(0xc74848))
    if pose in ('shout', 'cheer', 'flare'): d.rectangle([fx + face * 1 - 1, hy + 4, fx + face * 1, hy + 5], fill=hx(0x6a1a1a))   # shouting
    # the ushanka: fur band, cloth crown, the front flap up with a red star, ear flaps out
    d.ellipse([fx - 6, hy - 8, fx + 6, hy + 1], fill=hx(FUR[4]))                    # the hat's outline...
    d.ellipse([fx - 5, hy - 7, fx + 5, hy], fill=hx(0x5e6044))                       # ...its cloth crown
    d.line([(fx - 3, hy - 6), (fx + 1, hy - 6)], fill=hx(0x7a7c5a))
    d.rounded_rectangle([fx - 6, hy - 3, fx + 6, hy + 1], radius=2, fill=hx(FUR[1]), outline=hx(FUR[4]))   # the fur band
    for x in range(fx - 5, fx + 6): d.point((x, hy - 2 + (x % 2)), fill=hx(FUR[0] if x % 3 else FUR[2]))
    for sx_ in (fx - 6, fx + 6): d.line([(sx_, hy + 1), (sx_, hy + 4)], fill=hx(FUR[2]))   # the ear flaps, down
    d.point((fx + face * 2, hy - 2), fill=hx(RED)); d.point((fx + face * 2, hy - 1), fill=hx(REDD)); d.point((fx + face * 2 - 1, hy - 1), fill=hx(RED)); d.point((fx + face * 2 + 1, hy - 1), fill=hx(RED))   # the red star
    if pose == 'hat':                                                                # holding her hat on (falling, the wind)
        d.line([(fx - face * 4, by - 2), (fx - face * 6, hy - 4)], fill=hx(COAT[2]), width=2); d.point((fx - face * 6, hy - 5), fill=hx(SKIN[1]))
    # arms
    def arm(x0, y0, x1, y1): d.line([(x0, y0), (x1, y1)], fill=hx(COAT[4]), width=3); d.line([(x0, y0), (x1, y1)], fill=hx(COAT[2]), width=1); d.ellipse([x1 - 1, y1 - 1, x1 + 1, y1 + 1], fill=hx(SKIN[1]))
    if pose == 'point': arm(cx + 4, by - 2, cx + 13, by - 8)
    elif pose == 'wave':
        w = p.get('wv', 0); arm(cx + 4, by - 2, cx + 9 + w, by - 14)
        d.line([(cx + 9 + w, by - 14), (cx + 9 + w, by - 26)], fill=hx(WOOD[2]))      # a little red flag on a stick
        fl = [(cx + 9 + w, by - 26), (cx + 17 + w, by - 25 + (1 if w > 0 else 0)), (cx + 17 + w, by - 21), (cx + 9 + w, by - 21)]
        d.polygon(fl, fill=hx(RED)); d.point((cx + 11 + w, by - 24), fill=hx(0xffd040))
    elif pose == 'salute': arm(cx + 4, by - 2, fx + face * 3, hy - 1)
    elif pose == 'cheer': arm(cx - 4, by - 2, cx - 8, by - 14); arm(cx + 4, by - 2, cx + 8, by - 14)
    elif pose == 'binoc':
        arm(cx + 3, by - 2, fx + face * 3, hy + 3); d.rectangle([fx + face * 2 - 1, hy + 1, fx + face * 5, hy + 4], fill=hx(0x1a1a1e)); d.point((fx + face * 5, hy + 2), fill=hx(0x8ab0e8))
    elif pose == 'flare':
        arm(cx + 4, by - 2, cx + 8, by - 16); d.rectangle([cx + 7, by - 20, cx + 9, by - 16], fill=hx(0x3a3a42)); d.point((cx + 8, by - 21), fill=hx(0x8a8a92))
    elif pose == 'grab': arm(cx + 4, by - 2, cx + 18, by + 2)

# ------------------------------------------------------------------------------------------------ effects in the frame
def fx_draw(a, effects):
    im = Image.fromarray(a); d = ImageDraw.Draw(im, 'RGBA')
    for e in effects:
        k = e[0]
        if k == 'flash':                                            # a muzzle flash: a star of fire at the gun's tip
            _, x, y, s, ang = e
            for r, col in ((s, (255, 150, 40, 210)), (s * 0.6, (255, 230, 120, 240)), (s * 0.3, (255, 255, 240, 255))):
                pts = []
                for i in range(12):
                    b = math.radians(ang) * -1 + i * math.pi / 6; rr = r if i % 2 == 0 else r * 0.45
                    if i == 0: rr = r * 1.6                                # longest straight out of the barrel
                    pts.append((x + math.cos(b) * rr, y + math.sin(b) * rr))
                d.polygon(pts, fill=col)
        elif k == 'smoke':                                          # a puff of gun / exhaust smoke
            _, x, y, r, al = e
            d.ellipse([x - r, y - r, x + r, y + r], fill=(70, 70, 66, int(al * 255)))
            d.ellipse([x - r * 0.6 - 1, y - r * 0.7, x + r * 0.3, y], fill=(110, 108, 100, int(al * 200)))
        elif k == 'mg':                                             # machine-gun fire from the hull: a flash and a tracer
            _, x, y, n, ang = e
            d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=(255, 230, 120, 255))
            ex, ey = x + math.cos(math.radians(ang)) * n, y - math.sin(math.radians(ang)) * n
            d.line([(x + 3, y), (ex, ey)], fill=(255, 210, 90, 220), width=1)
        elif k == 'dust':                                           # dust / snow kicked up by the tracks
            _, x, y, r, al = e
            d.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(220, 214, 200, int(al * 255)))
        elif k == 'rocket':                                         # rocket flames under the hull (ROCKET HOP)
            _, x, y, n = e
            d.polygon([(x - 3, y), (x + 3, y), (x, y + n)], fill=(255, 140, 40, 230)); d.polygon([(x - 1.5, y), (x + 1.5, y), (x, y + n * 0.6)], fill=(255, 240, 160, 255))
        elif k == 'ring':                                           # a shock ring along the ground
            _, x, y, r, al = e
            d.ellipse([x - r, y - r * 0.25, x + r, y + r * 0.25], outline=(240, 236, 220, int(al * 255)), width=2)
        elif k == 'spark':
            _, x, y = e
            d.line([(x - 2, y), (x + 2, y)], fill=(255, 230, 140, 255)); d.line([(x, y - 2), (x, y + 2)], fill=(255, 230, 140, 255))
        elif k == 'exhaustfire':                                    # a blast of fire out of the exhaust (back air)
            _, x, y, n = e
            d.polygon([(x, y - 3), (x, y + 3), (x - n, y)], fill=(255, 140, 40, 230)); d.polygon([(x, y - 1.5), (x, y + 1.5), (x - n * 0.6, y)], fill=(255, 240, 160, 255))
        elif k == 'sand':                                           # sandbags thrown up round it (ENTRENCH)
            _, x, y = e
            d.ellipse([x - 6, y - 3, x + 6, y + 3], fill=(138, 122, 86, 255), outline=(60, 50, 30, 255)); d.line([(x - 4, y - 2), (x + 3, y - 2)], fill=(168, 152, 106, 255))
        elif k == 'line':                                           # a speed line
            _, x0, y0, x1, y1 = e
            d.line([(x0, y0), (x1, y1)], fill=(240, 240, 240, 150))
    return np.array(im)

# ------------------------------------------------------------------------------------------------ poses and frames
def pose(**kw):
    p = dict(dy=0, ph=0.0, ang=0.0, rec=0.0, hatch='open', rose='look', look=0, tilt=0.0, fx=[], sx=1.0, sy=1.0, ox=0, oy=0)
    p.update(kw); return p

def render(p):
    a = draw_tank(p)
    if p['tilt'] or p['sx'] != 1 or p['sy'] != 1 or p['ox'] or p['oy']:
        im = Image.fromarray(a)
        if p['sx'] != 1 or p['sy'] != 1:                             # a squash / stretch, round its tracks
            w, h = round(FW * p['sx']), round(FH * p['sy'])
            s = im.resize((w, h), Image.NEAREST); im = Image.new('RGBA', (FW, FH)); im.alpha_composite(s, (round(GX - GX * p['sx']), round(GY - GY * p['sy'])))
        if p['tilt']: im = im.rotate(p['tilt'], resample=Image.NEAREST, center=(GX, GY - 14))
        if p['ox'] or p['oy']: s = im; im = Image.new('RGBA', (FW, FH)); im.alpha_composite(s, (int(p['ox']), int(p['oy'])))
        a = np.array(im)
    tip = p.get('tip', (102, 63))
    fx = [(e if not (isinstance(e, tuple) and len(e) > 1 and e[1] == 'TIP') else (e[0], tip[0], tip[1]) + e[2:]) for e in p['fx']]
    return fx_draw(a, fx)

def idle_life(i, n=32):
    """The engine idling: the hull shudders on its suspension, exhaust puffs out; she looks round from the hatch."""
    return dict(dy=1 if (i // 2) % 2 else 0, look=round(math.sin(i * 2 * math.pi / n) * 1.6), fx=[('smoke', 14 - (i % 8), 72 - (i % 8) * 1.5, 2 + (i % 8) * 0.4, 0.5 - (i % 8) * 0.05)])

def anim_idle():
    return [render(pose(**idle_life(i), ang=2 * math.sin(i * 2 * math.pi / 32))) for i in range(32)]

def anim_run():
    out = []
    for i in range(8):
        out.append(render(pose(ph=i * 0.5, dy=-1 if i % 2 else 0, look=1, rose='point' if i < 0 else 'look', tilt=-1,
                               fx=[('dust', 18 - (i % 4) * 3, 93, 4 + (i % 4), 0.5 - (i % 4) * 0.1), ('dust', 12 - (i % 4) * 3, 90, 3, 0.35), ('smoke', 13 - i, 70 - i, 2 + i * 0.3, 0.4)])))
    return out

def anim_jump(): return [render(pose(ph=i * 0.6, tilt=8 + i, rose='cheer', fx=[('dust', 30 - i * 3, 96, 5, 0.5 - i * 0.1)])) for i in range(4)]
def anim_fall(): return [render(pose(ph=i * 0.3, tilt=-5, rose='hat', dy=-1 if i % 2 else 0)) for i in range(4)]

# each move: (name, ticks, ticks per frame, loops?, fn(t) -> pose)  -  t = the game tick the frame starts on
def lerp(a, b, k): return a + (b - a) * max(0, min(1, k))

def m_jab(t):                    # MG BURST: three bursts from the hull machine gun
    on = t in (4, 5, 8, 9, 12, 13)
    return pose(rose='duck', mgUp=False, fx=[('mg', 86, 78, 40 + (t % 3) * 6, 0)] if on else [], ox=-1 if on else 0)
def m_ftilt(t):                  # BARREL RAM: the turret jabs the gun forward
    k = 1 if 9 <= t <= 13 else lerp(0, 1, t / 9) if t < 9 else lerp(1, 0, (t - 13) / 12)
    return pose(rec=-8 * k, ang=-4 * k, ox=round(3 * k), rose='shout' if 8 <= t <= 14 else 'look', look=1)
def m_utilt(t):                  # TURRET SWEEP: the gun sweeps up overhead
    ang = lerp(0, 75, (t - 4) / 8) if t < 14 else lerp(75, 0, (t - 14) / 12)
    return pose(ang=ang, rose='duck' if 6 <= t <= 16 else 'look', fx=[('line', 70, 40, 90, 20)] if 8 <= t <= 13 else [])
def m_dtilt(t):                  # TREAD GRIND: digs its front tracks in
    return pose(ph=t * 0.9, tilt=-3 if 5 <= t <= 10 else 0, fx=[('dust', 96, 92, 5 + (t % 3), 0.7), ('dust', 102, 88, 4, 0.5)] if 5 <= t <= 11 else [], ox=2 if 5 <= t <= 10 else 0)
def m_dash(t):                   # RAM: charges forward behind its sloped front
    on = 4 <= t <= 18
    return pose(ph=t * 0.8, tilt=-4 if on else 0, rose='shout' if on else 'look', look=1, ox=3 if on else 0,
                fx=([('dust', 14 - (t % 4) * 3, 92, 5, 0.6), ('line', 4, 70, 16, 70), ('line', 2, 80, 14, 80)] if on else []))
def m_fsmash(t):                 # MAIN GUN: aims... and fires point-blank
    if t < 16: return pose(ang=lerp(0, 4, t / 16), rec=lerp(0, -2, t / 16), rose='point' if t > 6 else 'look', look=1, dy=1 if t % 4 < 2 and t > 10 else 0)
    st = t - 16
    return pose(ang=4, rec=lerp(6, 0, (st - 4) / 14) if st >= 4 else 6, rose='duck' if st < 16 else 'look', ox=-3 if st < 4 else -1 if st < 10 else 0,
                fx=([('flash', 'TIP', 14 - st * 2, 4)] if st < 6 else []) + [('smoke', 104 + st * 0.6, 58 - st * 0.4, 3 + st * 0.5, max(0, 0.7 - st * 0.03))])
def m_usmash(t):                 # FLAK: the gun straight up, one big shot
    if t < 14: return pose(ang=lerp(0, 82, t / 10), rose='duck', dy=1 if t % 4 < 2 and t > 8 else 0)
    st = t - 14
    return pose(ang=82, rec=6 if st < 4 else lerp(6, 0, (st - 4) / 12), rose='duck', oy=2 if st < 3 else 0,
                fx=([('flash', 'TIP', 13 - st * 2, 82)] if st < 6 else []) + [('smoke', 76 - st * 0.2, 28 - st * 0.8, 3 + st * 0.5, max(0, 0.7 - st * 0.03))])
def m_dsmash(t):                 # SLAM: hops and slams down - shock rings along the floor
    if t < 16: return pose(sy=lerp(1, 0.86, t / 10), sx=lerp(1, 1.08, t / 10), rose='duck')
    st = t - 16
    if st < 4: return pose(oy=-6 + st * 2, rose='cheer')
    return pose(sy=0.9 if st < 7 else 1, sx=1.06 if st < 7 else 1, rose='look', fx=[('ring', GX - 30, 95, 10 + st * 4, max(0, 0.9 - st * 0.04)), ('ring', GX + 30, 95, 10 + st * 4, max(0, 0.9 - st * 0.04)), ('dust', 20, 92, 6, 0.6 - st * 0.02), ('dust', 92, 92, 6, 0.6 - st * 0.02)])
def m_nair(t):                   # SPIN: a full turn in the air, gun out
    return pose(tilt=-360 * lerp(0, 1, (t - 3) / 16), rose='duck', ph=t, fx=[('line', 30, 50, 80, 50)] if 6 <= t <= 14 else [])
def m_fair(t):                   # GUN SWING: the gun swings from high to low in front
    return pose(ang=lerp(50, -40, (t - 6) / 8), rose='shout' if 8 <= t <= 13 else 'look', look=1)
def m_bair(t):                   # EXHAUST BLAST: fire out of the back
    on = 7 <= t <= 12
    return pose(rose='look', look=-1, ox=2 if on else 0, fx=[('exhaustfire', 15, 77, 16 + (t % 2) * 4), ('smoke', 6 - t * 0.5, 76, 4, 0.5)] if on else [('smoke', 12, 76, 2, 0.3)])
def m_uair(t):                   # AA BURST: the gun up, a quick shot
    st = t - 8
    return pose(ang=lerp(10, 85, t / 7), rec=4 if 0 <= st < 3 else 0, rose='duck', fx=[('flash', 'TIP', 9, 85)] if 0 <= st < 4 else [])
def m_dair(t):                   # CRUSH: tips nose-down and drops like an anvil
    return pose(tilt=lerp(0, -30, t / 10) if t < 26 else lerp(-30, 0, (t - 26) / 8), rose='hat', ph=t, fx=[('spark', 92, 98), ('spark', 80, 100)] if 12 <= t <= 18 and t % 2 == 0 else [])
def m_grab(t):                   # she leans out of the hatch and grabs
    return pose(rose='grab' if 3 <= t <= 14 else 'look', look=1)
def m_holding(t): return pose(rose='grab', look=1, dy=1 if (t // 4) % 2 else 0)
def m_throw(d):
    def f(t):
        if d == 'forward': return pose(rec=-6 if t < 8 else 0, rose='shout', ox=3 if t < 8 else 0, look=1)
        if d == 'back': return pose(tilt=8 if t < 8 else 0, rose='shout', look=-1)
        if d == 'up': return pose(ang=lerp(0, 70, t / 6) if t < 10 else 70, rose='cheer', fx=[('flash', 'TIP', 8, 70)] if 4 <= t <= 7 else [])
        return pose(sy=0.88 if t < 8 else 1, rose='duck', fx=[('dust', 80, 93, 6, 0.6)] if t < 10 else [])
    return f
def m_hitstun(t): return pose(tilt=4 if t % 2 else -3, rose='hat', ox=-1 if t % 2 else 1, fx=[('spark', 60 + t * 3, 62 + (t % 3) * 4)] if t % 3 == 0 else [])
def m_shield(t): return pose(hatch='closed', fx=[('spark', 70 + (t % 6) * 2, 58 + (t % 4) * 4)] if t % 6 == 0 else [])
def m_grabbed(t): return pose(tilt=6 if t % 2 else -6, rose='hat')
def m_ledge(t): return pose(tilt=-40, oy=10, ox=-10, rose='hat', ph=t)
def m_neutralB(t):               # CANNON: aims (the gun lifts a little) and fires a shell (the shell is made by the game at tick 14)
    if t < 14: return pose(ang=lerp(0, 8, t / 10), rose='binoc', look=1)
    st = t - 14
    return pose(ang=8, rec=7 if st < 3 else lerp(7, 0, (st - 3) / 14), rose='duck' if st < 10 else 'look', ox=-3 if st < 3 else -1 if st < 8 else 0,
                fx=([('flash', 'TIP', 13 - st * 2, 8)] if st < 6 else []) + [('smoke', 104 + st * 0.5, 58 - st * 0.5, 3 + st * 0.4, max(0, 0.7 - st * 0.03))])
def m_sideB(t):                  # TREAD RUSH: guns the engine and rams forward
    on = 6 <= t <= 30
    return pose(ph=t * 1.1, tilt=-5 if on else 0, ox=4 if on else 0, rose='shout' if on else 'look', look=1,
                fx=([('dust', 12 - (t % 4) * 3, 92, 6, 0.7), ('dust', 6 - (t % 4) * 3, 88, 5, 0.5), ('line', 0, 66, 14, 66), ('line', 2, 76, 16, 76), ('line', 0, 86, 12, 86), ('smoke', 10, 70 - (t % 6), 4, 0.6)] if on else []))
def m_upb(t):                    # ROCKET HOP: rockets under the hull blast it upward
    on = 6 <= t <= 26
    return pose(tilt=6 if on else 0, rose='hat' if on else 'look', ph=t,
                fx=([('rocket', 34, 96, 10 + (t % 3) * 4), ('rocket', 56, 96, 12 + ((t + 1) % 3) * 4), ('rocket', 78, 96, 10 + ((t + 2) % 3) * 4), ('smoke', 56 + (t % 5) * 4 - 8, 100, 6, 0.5)] if on else []))
def m_downB(t):                  # ENTRENCH: digs in behind sandbags, hatch shut, and sprays the machine gun
    k = min(1, t / 16)
    sand = [('sand', 14 + i * 6, 96 - 3 * k - (i % 2) * 4 * k) for i in range(3)] + [('sand', 86 + i * 6, 96 - 3 * k - (i % 2) * 4 * k) for i in range(3)]
    fire = 20 <= t <= 80 and t % 4 < 2
    return pose(oy=round(3 * k), hatch='closed' if 8 <= t <= 84 else 'open', rose='duck', fx=sand + ([('mg', 86, 78 + round(3 * k), 44 + (t % 3) * 8, 0)] if fire else []))
def m_limit(t):                  # KATYUSHA: she pops up and fires a red flare into the sky - the barrage is the game's
    if t < 20: return pose(rose='binoc', look=1)
    if t < 40: return pose(rose='flare', fx=[('flash', cx_flare(), 34, 5, 90)] if t < 26 else [])
    return pose(rose='cheer' if (t // 20) % 2 else 'point', hatch='open', look=1)
def cx_flare(): return GX + 4 + 8
def m_turning(t):                # it rolls out of a cloud of smoke as she changes
    k = t / 34
    al = max(0, 1 - k * 1.6)
    p = pose(rose='cheer' if t > 26 else 'look', ox=round(lerp(-30, 0, k * 1.4)), ph=t,
             fx=[('smoke', GX - 20 + i * 12, 80 - (i % 2) * 14, 14 - i, al * 0.9) for i in range(5)])
    return p
def m_taunt(t):                  # she stands up in the hatch and waves a little red flag
    return pose(rose='wave', wv=1 if (t // 6) % 2 else -1, look=1, ang=6 * math.sin(t * 0.15))

MOVES = [
    ('jab', 24, 1, False, m_jab), ('ftilt', 28, 1, False, m_ftilt), ('utilt', 26, 1, False, m_utilt), ('dtilt', 22, 1, False, m_dtilt),
    ('dashAttack', 34, 1, False, m_dash), ('fsmash', 46, 1, False, m_fsmash), ('usmash', 44, 1, False, m_usmash), ('dsmash', 44, 1, False, m_dsmash),
    ('nair', 26, 1, False, m_nair), ('fair', 26, 1, False, m_fair), ('bair', 24, 1, False, m_bair), ('uair', 24, 1, False, m_uair), ('dair', 34, 1, False, m_dair),
    ('grab', 26, 1, False, m_grab), ('holding', 24, 1, True, m_holding),
    ('throw_forward', 18, 1, False, m_throw('forward')), ('throw_back', 18, 1, False, m_throw('back')), ('throw_up', 18, 1, False, m_throw('up')), ('throw_down', 18, 1, False, m_throw('down')),
    ('hitstun', 16, 2, True, m_hitstun), ('shield', 24, 2, True, m_shield), ('grabbed', 16, 2, True, m_grabbed), ('ledge', 24, 2, True, m_ledge),
    ('neutralB', 40, 1, False, m_neutralB), ('sideB', 48, 1, False, m_sideB), ('upb', 40, 1, False, m_upb), ('downB', 96, 2, False, m_downB),
    ('limit', 160, 2, False, m_limit), ('turning', 70, 2, False, m_turning), ('taunt', 84, 2, False, m_taunt),
]

def save_strip(frames, path):
    a = np.zeros((FH, FW * len(frames), 4), np.uint8)
    for i, f in enumerate(frames): a[:, i * FW:(i + 1) * FW] = f
    Image.fromarray(a).save(path)

def build():
    os.makedirs(OUT, exist_ok=True)
    save_strip(anim_idle(), os.path.join(OUT, 'idle_sheet.png'))
    save_strip(anim_run(), os.path.join(OUT, 'run_sheet.png'))
    save_strip(anim_jump(), os.path.join(OUT, 'jump_sheet.png'))
    save_strip(anim_fall(), os.path.join(OUT, 'fall_sheet.png'))
    frames, index = [], {}
    for name, ticks, step, loop, fn in MOVES:
        n = math.ceil(ticks / step)
        index[name] = [len(frames), n, step] + ([1] if loop else [])
        frames += [render(fn(i * step)) for i in range(n)]
    per = 24
    rows = math.ceil(len(frames) / per)
    sheet = np.zeros((rows * FH, per * FW, 4), np.uint8)
    for i, f in enumerate(frames): r, c = divmod(i, per); sheet[r * FH:(r + 1) * FH, c * FW:(c + 1) * FW] = f
    Image.fromarray(sheet).save(os.path.join(OUT, 'moves_sheet.png'))
    icon = Image.fromarray(anim_idle()[0]).crop((GX - 24, 44, GX + 24, 92)).resize((32, 32), Image.NEAREST)
    icon.save(os.path.join(OUT, 'icon.png'))
    lines = ['// Generated by tools/sprites/rosemary_tank.py - do not edit by hand.',
             '// ROSEMARY\'s TANK (her RED ARMY costume\'s other form): move animations in last-seen/tank/moves_sheet.png',
             '// (112x104 frames, 24 to a row, its tracks resting on 56,95). move: [first frame, frame count, game ticks per frame, loops?]',
             'export const LS_TANK_MOVES = {']
    lines += ['  %s: %s,' % (json.dumps(k), json.dumps(v)) for k, v in index.items()]
    lines += ['};', '']
    open(JS, 'w').write('\n'.join(lines))
    return frames, index

if __name__ == '__main__':
    frames, index = build()
    print(len(frames), 'move frames')
    if '--preview' in sys.argv:
        d = sys.argv[sys.argv.index('--preview') + 1]; os.makedirs(d, exist_ok=True)
        for name, (first, n, step, *_) in index.items():
            strip = frames[first:first + n]
            save_strip(strip, os.path.join(d, name + '.png'))

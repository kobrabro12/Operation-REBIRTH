"""Lacy's own move animations for the moves that used to borrow her two sword strips: forward, up and down
tilts and all five aerials. Each move is cut from her hand-drawn poses (idle, attack1, attack2, guard,
jump, fall) - re-timed, leaned, flipped, spun and squashed with clean RotSprite rotation - plus slash
crescents drawn in the same pale colour as the big cut in her Attack2 strip.

  ftilt  draws the sword back, then lunges into a straight thrust with a streak off the blade tip
  utilt  dips low, springs up with the sword raised and cuts a crescent over her head, front to back
  dtilt  crouches and sweeps a flat crescent along the floor in front of her
  nair   spins once with the sword held out, inside a full ring of light
  fair   raises the sword in mid-air and chops down in front of her
  bair   turns round in the air and thrusts the sword out behind her through a backward crescent
  uair   a backflip slash - the arc goes over her head
  dair   rises, then plunges point-first beneath her

Run for every costume that has its own strips (normal, Battle-Worn 1-3, Samurai, Akatsuki); recolour
costumes (1-BIT and friends) recolour this sheet in game like any other.

Output: <costume dir>/moves_sheet.png - 180x140 frames, 16 per row, feet at (81, 111) (her 150x90 drawings
placed at (15, 25)).
src/fighters/hkMoves.js gets the frame index: move: [first frame, frame count, ticks per frame].

  python3 tools/sprites/hero_knight_moves.py [--preview DIR]
"""
import os, sys, json, math
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from puppet import Part, Rig, EASE, save_atlas, contact

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
HK = os.path.join(ROOT, 'public/assets/fighters/hero-knight')
JS = os.path.join(ROOT, 'src/fighters/hkMoves.js')
COSTUMES = ['', 'worn1', 'worn2', 'worn3', 'samurai', 'akatsuki']
FW, FH, FEET, MID = 150, 90, (66, 86), (66, 62)      # her strips' frames (feet, body centre)
CW, CH, OX, OY = 180, 140, 15, 25                       # move frames: bigger, so spins and plunges never clip
STEP = 2

class Costume:
    def __init__(self, sub):
        self.dir = os.path.join(HK, sub) if sub else HK
        self.strips, self.rigs = {}, {}
        a2 = self.frame('attack2', 3); idle = self.frame('idle', 0)
        have = {tuple(p) for p in idle[idle[..., 3] > 0][:, :3]} | {tuple(p) for p in self.frame('attack2', 0).reshape(-1, 4)[:, :3]}
        cols = {}
        for p in a2[a2[..., 3] > 0]:
            c = tuple(int(v) for v in p[:3])
            if c not in have and sum(c) > 450: cols[c] = cols.get(c, 0) + 1
        ranked = sorted(cols, key=lambda c: -cols[c])
        self.arc = ranked[0] if ranked else (208, 216, 240)                  # the slash crescent's colour
        self.rim = max(ranked[:4] or [(240, 244, 255)], key=sum)             # its brightest edge

    def frame(self, strip, i):
        if strip not in self.strips:
            self.strips[strip] = np.array(Image.open(os.path.join(self.dir, strip + '_sheet.png')).convert('RGBA'))
        return self.strips[strip][:, i * FW:(i + 1) * FW]

    def rig(self, strip, i, flip, center):
        key = (strip, i, flip, center)
        if key not in self.rigs:
            f = self.frame(strip, i)
            if flip:                      # mirror around her feet column, so she turns on the spot
                g = np.zeros_like(f); src = f[:, ::-1]
                sh = (2 * FEET[0]) - (FW - 1)
                if sh >= 0: g[:, sh:] = src[:, :FW - sh]
                else: g[:, :FW + sh] = src[:, -sh:]
                f = g
            self.rigs[key] = Rig(f, [Part('b', f[..., 3] > 0, center)], (CW, CH), (OX, OY), center)
        return self.rigs[key]

# ---------------------------------------------------------------- effects
def paint(img, m, col, a):
    """Lay a colour over the pixels in mask m at opacity a (straight onto empty pixels, blended over hers)."""
    empty = m & (img[..., 3] == 0)
    over = m & (img[..., 3] > 0)
    img[empty, :3] = col; img[empty, 3] = int(255 * a)
    img[over, :3] = (img[over, :3] * (1 - a) + np.array(col) * a).astype(np.uint8)

def crescent(img, c, r, lead, sweep, width, col, rim, alpha=1.0):
    """A slash crescent: the arc from (lead - sweep) to lead degrees around c (0 = forward, 90 = down),
    thick at the leading edge and thinning to a point at the tail. A negative sweep runs the other way."""
    cx, cy = c[0] + OX, c[1] + OY
    ys, xs = np.mgrid[0:CH, 0:CW]
    d = np.hypot(xs + 0.5 - cx, ys + 0.5 - cy)
    ang = np.degrees(np.arctan2(ys + 0.5 - cy, xs + 0.5 - cx))
    rel = ((lead - ang) * np.sign(sweep)) % 360          # how far behind the leading edge (degrees)
    k = 1 - rel / abs(sweep)                              # 1 at the lead, 0 at the tail
    inside = (rel <= abs(sweep)) & (d <= r) & (d >= r - width * np.clip(k, 0, 1) ** 0.7 - 0.5)
    edge = inside & (d >= r - 1.2)
    for m, colr, a in ((inside, col, 0.85 * alpha), (edge, rim, alpha)):
        paint(img, m & (np.clip(k, 0, 1) > 0.08), colr, a)

def streak(img, p0, ang, length, col, rim, alpha=1.0, thick=2):
    """A thrust streak: speed lines flying off a point along a direction."""
    a = math.radians(ang)
    for j, (off, ln, cl) in enumerate(((0, length, rim), (-2, length * 0.7, col), (2, length * 0.55, col))):
        for s in range(int(ln)):
            x = p0[0] + OX + math.cos(a) * s - math.sin(a) * off
            y = p0[1] + OY + math.sin(a) * s + math.cos(a) * off
            xi, yi = int(round(x)), int(round(y))
            if 0 <= xi < CW and 0 <= yi < CH and (s / ln) < alpha + 0.15:
                img[yi, xi, :3] = cl; img[yi, xi, 3] = 255

# ---------------------------------------------------------------- moves
# A key: (tick, cel, (angle, dx, dy, sx, sy), ease). cel = (strip, frame[, flip]). The cel shows from its
# key until the next one; the transform eases from the previous key's into this one's.
def K(t, strip, f, xf=(0, 0, 0, 1, 1), ease='inout', flip=False):
    return (t, (strip, f, flip), tuple(list(xf) + [0, 0, 0, 1, 1][len(xf):]), ease)

MOVES = {}
def move(name, ticks, keys, center=FEET, fx=None):
    MOVES[name] = (ticks, keys, center, fx)

# --- forward tilt: draw back, then a lunging thrust
def ftilt_fx(img, t, C):
    if 12 <= t <= 17: streak(img, (124, 59), 22, 20, C.arc, C.rim, alpha=1 - (t - 12) / 7)
move('ftilt', 28, [
    K(0, 'idle', 0),
    K(4, 'attack2', 0, (-4, -2, 0, 1.02, 0.98), 'out'),
    K(10, 'attack2', 0, (-6, -3, 0, 1.03, 0.97)),
    K(12, 'guard', 0, (0, 6, 0, 1.05, 0.97), 'snap'),
    K(17, 'guard', 0, (0, 8, 0, 1.02, 0.99), 'linear'),
    K(24, 'attack2', 6, (0, 4, 0), 'inout'),
    K(28, 'idle', 0, (0, 0, 0), 'inout'),
], fx=ftilt_fx)

# --- up tilt: crouch, spring up, crescent over the head from front to back
def utilt_fx(img, t, C):
    if 11 <= t <= 19:
        k = (t - 11) / 7
        crescent(img, (66, 46), 34, -10 - 200 * EASE['out'](min(1, k)), -130, 9, C.arc, C.rim, alpha=1 if t < 18 else 0.5)
move('utilt', 30, [
    K(0, 'idle', 0),
    K(5, 'attack2', 6, (0, 0, 0, 1.08, 0.88), 'out'),
    K(10, 'attack1', 0, (0, 0, -3, 0.94, 1.08), 'snap'),
    K(14, 'attack1', 2, (-6, 0, -2, 0.97, 1.04), 'out'),
    K(19, 'attack1', 6, (-4, -1, 0, 1, 1), 'linear'),
    K(30, 'idle', 0, (0, 0, 0), 'inout'),
], fx=utilt_fx)

# --- down tilt: crouch and sweep low along the floor
def dtilt_fx(img, t, C):
    if 9 <= t <= 15:
        k = (t - 9) / 4
        crescent(img, (78, 40), 46, 115 - 95 * EASE['snap'](min(1, k)), -70, 7, C.arc, C.rim, alpha=1 if t < 14 else 0.5)
move('dtilt', 24, [
    K(0, 'idle', 0),
    K(4, 'guard', 0, (0, -3, 1, 1.04, 0.92), 'out'),
    K(9, 'guard', 0, (2, -4, 1, 1.05, 0.9)),
    K(10, 'attack2', 6, (0, 5, 0, 1.06, 0.94), 'snap'),
    K(16, 'attack2', 6, (0, 6, 0, 1.03, 0.97), 'linear'),
    K(24, 'idle', 0, (0, 0, 0), 'inout'),
], fx=dtilt_fx)

# --- neutral air: one full spin, sword out, in a ring of light
def nair_fx(img, t, C):
    if 9 <= t <= 19:
        k = (t - 9) / 9
        crescent(img, MID, 36, 30 + 380 * EASE['inout'](min(1, k)), 240, 8, C.arc, C.rim, alpha=1 if t < 18 else 0.5)
move('nair', 28, [
    K(0, 'jump', 1, (0, 0, 0)),
    K(6, 'attack2', 6, (-30, 0, -2, 0.96, 0.96), 'out'),
    K(18, 'attack2', 6, (330, 0, -2, 0.96, 0.96), 'inout'),
    K(22, 'fall', 1, (360, 0, 0), 'out'),
    K(28, 'fall', 1, (360, 0, 0)),
], center=MID, fx=nair_fx)

# --- forward air: sword up, then chop down in front
def fair_fx(img, t, C):
    if 10 <= t <= 17:
        k = (t - 10) / 5
        crescent(img, (74, 56), 36, -60 + 140 * EASE['snap'](min(1, k)), 120, 9, C.arc, C.rim, alpha=1 if t < 16 else 0.5)
move('fair', 28, [
    K(0, 'jump', 1, (0, 0, 0)),
    K(7, 'attack1', 0, (-14, -2, 0, 0.98, 1.03), 'out'),
    K(11, 'attack1', 0, (-18, -2, 0, 0.97, 1.04)),
    K(12, 'attack2', 6, (16, 4, 0, 1.03, 0.97), 'snap'),
    K(18, 'attack2', 6, (12, 3, 0), 'linear'),
    K(28, 'fall', 1, (0, 0, 0), 'inout'),
], center=MID, fx=fair_fx)

# --- back air: turns round and thrusts behind through a backward crescent
def bair_fx(img, t, C):
    if 9 <= t <= 15:
        k = (t - 9) / 5
        crescent(img, (60, 60), 34, 235 - 90 * EASE['snap'](min(1, k)), -85, 9, C.arc, C.rim, alpha=1 if t < 14 else 0.5)
        if t <= 13: streak(img, (16, 70), 200, 16, C.arc, C.rim, alpha=1 - (t - 9) / 5)
move('bair', 26, [
    K(0, 'jump', 1, (0, 0, 0)),
    K(5, 'attack2', 2, (8, 2, 0), 'out', flip=True),
    K(9, 'attack2', 2, (10, 3, 0), flip=True),
    K(10, 'guard', 0, (-8, -6, 0, 1.05, 0.97), 'snap', flip=True),
    K(16, 'guard', 0, (-6, -5, 0), 'linear', flip=True),
    K(21, 'jump', 1, (0, 0, 0), 'inout'),
    K(26, 'fall', 1, (0, 0, 0)),
], center=MID, fx=bair_fx)

# --- up air: a backflip slash over her head
def uair_fx(img, t, C):
    if 9 <= t <= 17:
        k = (t - 9) / 7
        crescent(img, MID, 38, -10 - 180 * EASE['out'](min(1, k)), -150, 9, C.arc, C.rim, alpha=1 if t < 16 else 0.5)
move('uair', 26, [
    K(0, 'jump', 1, (0, 0, 0)),
    K(5, 'attack2', 6, (10, 0, 2, 1.04, 0.95), 'out'),
    K(16, 'attack2', 6, (-300, 0, -2), 'inout'),
    K(21, 'fall', 1, (-360, 0, 0), 'out'),
    K(26, 'fall', 1, (-360, 0, 0)),
], center=MID, fx=uair_fx)

# --- down air: rises with the sword raised, then plunges point-first
def dair_fx(img, t, C):
    if 14 <= t <= 20:
        for side, ln in ((-1, 14), (0, 20), (1, 12)):          # speed lines trailing above the plunge
            streak(img, (64 + side * 9, 44), 270, ln, C.arc, C.rim, alpha=1 - (t - 14) / 7)
move('dair', 32, [
    K(0, 'jump', 1, (0, 0, 0)),
    K(8, 'attack1', 0, (0, 0, -4, 0.95, 1.06), 'out'),
    K(13, 'attack1', 0, (-4, 0, -5, 0.94, 1.07)),
    K(14, 'guard', 0, (58, -4, 4, 0.96, 1.06), 'snap'),
    K(24, 'guard', 0, (56, -4, 3), 'linear'),
    K(32, 'fall', 1, (0, 0, 0), 'inout'),
], center=MID, fx=dair_fx)

def lerp(a, b, k): return tuple(x + (y - x) * k for x, y in zip(a, b))

def render_move(C, name):
    ticks, keys, center, fx = MOVES[name]
    out = []
    for t in range(0, ticks, STEP):
        cur = max(i for i, kk in enumerate(keys) if kk[0] <= t)
        nxt = min(cur + 1, len(keys) - 1)
        t0, cel, xf0, _ = keys[cur]; t1, _, xf1, e = keys[nxt]
        k = 0 if nxt == cur else EASE[e]((t - t0) / max(1, t1 - t0))
        a, dx, dy, sx, sy = lerp(xf0, xf1, k)
        strip, f, flip = cel
        rig = C.rig(strip, f, flip, center)
        img = rig.render({'root': (a, dx, dy, sx, sy)})
        if fx: fx(img, t, C)
        out.append(img)
    return out

def main():
    index = None
    previews = {}
    for sub in COSTUMES:
        C = Costume(sub)
        frames = {n: render_move(C, n) for n in MOVES}
        idx = save_atlas(frames, os.path.join(C.dir, 'moves_sheet.png'))
        index = index or {n: idx[n] + [STEP] for n in MOVES}
        previews[sub or 'default'] = frames
    with open(JS, 'w') as f:
        f.write('// Generated by tools/sprites/hero_knight_moves.py - do not edit by hand.\n')
        f.write("// Lacy's own move animations in each costume's moves_sheet.png (180x140 frames, feet at 81,111):\n")
        f.write('// move: [first frame, frame count, game ticks per frame]\n')
        f.write('export const HK_MOVES = ' + json.dumps(index).replace('],', '],\n  ').replace('{', '{\n  ').replace(']}', '],\n};') + '\n')
    return previews

if __name__ == '__main__':
    pv = main()
    if '--preview' in sys.argv:
        d = sys.argv[sys.argv.index('--preview') + 1]; os.makedirs(d, exist_ok=True)
        for c, frames in pv.items():
            allf = [f for fr in frames.values() for f in fr]
            contact(allf, os.path.join(d, 'hk_' + c + '.png'), scale=2, cols=14)
    print('moves:', ', '.join(MOVES))

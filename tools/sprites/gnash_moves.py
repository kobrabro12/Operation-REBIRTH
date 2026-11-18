"""GNASH (the street punk kid with the giant neon axe): his animations, from his drawing (gnash_draw.py) on NU's puppet rig (show_moves.build). His normals use
NU's poses (nu_moves.MOVES - same joints and frame timings, so the hitboxes in gnash.js line up, the axe where NU has
his mic); his idle, specials, Limit and taunt are his own (below):

  idle      - the axe propped up at his side, chest heaving, rolling his neck; now and then he hefts it
  neutralB  - SEETHE (loops while held): crouched, roaring at the sky, shaking - his RAGE meter fills
  sideB     - AXE THROW: winds the axe back over his shoulder and hurls it end over end (hidden while it's out)
  upb       - SKYSPLITTER: down low, then a rising uppercut that carries the axe up over his head
  downB     - GROUND SPLITTER: axe overhead and down into the floor (the blow bounces him up) ...
  downB2    - ... then, in the air, overhead again and down - the second slam
  limit     - EXECUTIONER: hauls the axe up, leaps, and brings it down
  taunt     - axe on his shoulder, a big shaking laugh

  -> public/assets/fighters/gnash/[<costume>/]{idle,run,jump,fall}_sheet.png (64x64) + moves_sheet.png (112x104,
     36 to a row, feet at 56,95), icon.png; frame table src/fighters/gnMoves.js.

  python3 tools/sprites/gnash_moves.py [--preview DIR]
"""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
import nu_moves as N
from nu_moves import k, P, mix, legs, CROUCH, DEEP, STANCE, FALL
import gnash_draw
import show_moves
from show_moves import build
from puppet import Rig, Part
import numpy as np

# ---- his bigger canvas: the parts are drawn 96x96 (gnash_draw.PAD = 16 px in) so the giant axe fits, and his idle /
# run / jump / fall frames are 112x64 (not 64x64) so the axe dragging behind him isn't cut off. Feet: 56,58 in those
# frames, 56,95 in the moves frames (like everyone's).
FEET96 = (32 + gnash_draw.PAD, 58 + gnash_draw.PAD)
SMALL_CANVAS, SMALL_FEET = (112, 96), (56, 90)     # his idle / run / jump / fall frames: taller and wider than everyone's 64x64
BIG_CANVAS, BIG_FEET = (128, 136), (64, 115)      # his moves frames: bigger than everyone's (112x104), so the axe swung overhead isn't cut off
_save_atlas = show_moves.save_atlas
show_moves.save_atlas = lambda frames, path, cols=16: _save_atlas(frames, path, cols=32)   # 32 to a row (128 px frames: 4096 px wide)

def build_rig96(draw, follow, order=None):
    """nu_moves.build_rig for GNASH's 96x96 drawing: (small 112x64 rig, big 112x104 rig)."""
    layers = draw.draw_parts(); base = draw.composite(layers, hide=())
    parts = [Part(n, layers[n][..., 3] > 0, draw.RIG[n][0], draw.RIG[n][1], z=z, variants=[layers[n]], drag=follow.get(n, (0, 0))[0], sway=follow.get(n, (0, 0))[1])
             for z, n in enumerate(draw.ORDER)]
    fx, fy = FEET96
    return Rig(base, parts, SMALL_CANVAS, (SMALL_FEET[0] - fx, SMALL_FEET[1] - fy), FEET96), Rig(base, parts, BIG_CANVAS, (BIG_FEET[0] - fx, BIG_FEET[1] - fy), FEET96)

_build_rig = N.build_rig
N.build_rig = lambda draw, follow, order=None: build_rig96(draw, follow, order) if draw is gnash_draw else _build_rig(draw, follow, order)

# ---- THE TWO-HANDED GRIP: after every pose is worked out, his back arm is bent (two-bone IK) so its fist lands on the
# haft just under his front fist - wherever the axe is. Arms stretch a little lengthwise (`MAX_REACH`) rather than let go.
GRIP = (44.6 + gnash_draw.PAD, 36.0 + gnash_draw.PAD)   # where the back hand holds the haft (in the drawing's coordinates)
B_SHOULDER, B_ELBOW, B_HAND = (49, 40), (47, 48), (48, 55)        # the back arm's joints (96x96 canvas)
MAX_REACH = 1.45                       # how far the arm may stretch (x its length) to keep hold
_RIG = None

def _rig():
    """A rig of his parts, only used to find where the axe's grip is in a pose."""
    global _RIG
    if _RIG is None: _RIG = N.build_rig(gnash_draw, N.FOLLOW)[1]
    return _RIG

def two_hands(pose):
    """The pose with the back arm reaching across to grip the axe (skipped while the axe is thrown - 'mic' hidden):
    an analytic two-bone guess (elbow bent down and back), then refined on the real rig so the fist lands on the grip,
    letting the arm stretch up to MAX_REACH if it must."""
    from scipy.optimize import minimize
    if 'mic' in pose.get('_hide', ()): return pose
    R = _rig(); p = dict(pose); p['bupper'] = (0, 0, 0); p['bfore'] = (0, 0, 0)
    g = (R.matrix('mic', p) @ np.array([GRIP[0], GRIP[1], 1.0]))[:2]
    tx, ty, _ = np.linalg.inv(R.matrix('torso', p)) @ np.array([g[0], g[1], 1.0])     # the grip, in the torso's own frame
    sx, sy = B_SHOULDER; dx, dy = tx - sx, ty - sy; dist = math.hypot(dx, dy) or 1
    l1 = math.hypot(B_ELBOW[0] - sx, B_ELBOW[1] - sy); l2 = math.hypot(B_HAND[0] - B_ELBOW[0], B_HAND[1] - B_ELBOW[1]); d = min(dist, (l1 + l2) * 0.999)
    a = math.degrees(math.atan2(dy, dx)); bend = math.degrees(math.acos(max(-1, min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))))
    up = a + bend; ex, ey = sx + math.cos(math.radians(up)) * l1, sy + math.sin(math.radians(up)) * l1
    fore = math.degrees(math.atan2(ty - ey, tx - ex))
    rest1 = math.degrees(math.atan2(B_ELBOW[1] - sy, B_ELBOW[0] - sx)); rest2 = math.degrees(math.atan2(B_HAND[1] - B_ELBOW[1], B_HAND[0] - B_ELBOW[0]))
    u0, f0 = up - rest1, fore - rest2 - (up - rest1)
    def place(v):
        q = dict(p); q['bupper'] = (v[0], 0, 0, 1, v[2]); q['bfore'] = (v[1], 0, 0); return q
    def cost(v):
        h = (R.matrix('bfore', place(v)) @ np.array([B_HAND[0], B_HAND[1], 1.0]))[:2]
        return float(np.sum((h - g) ** 2)) + 4 * (v[2] - 1) ** 2 + (100 if not 1 <= v[2] <= MAX_REACH else 0)
    v = minimize(cost, [u0, f0, 1.0], method='Nelder-Mead', options={'xatol': 0.2, 'fatol': 0.05, 'maxiter': 300}).x
    out = dict(pose); out['bupper'] = (v[0], 0, 0, 1, v[2]); out['bfore'] = (v[1], 0, 0)
    return out

_life = N.life
def gnash_life(pose, t):
    """NU's breathing, then both hands on the axe."""
    return two_hands(_life(pose, t))

GN = {}
def gmove(name, ticks, keys, step=1, smear=(), loop=False): GN[name] = (ticks, keys, step, smear, loop, None)

# THE DRAG: both hands on the bottom of the haft down by his hip, the giant blade trailing behind him on the floor
DRAG = dict(torso=(10, 1, 1), fupper=(50, 0, 0), ffore=(80, 0, 0), mic=(100, 0, 0))

def gnash_idle():
    """Hunched over the axe dragging behind him, its blade resting on the floor, chest heaving, rolling his neck; once a
    loop he heaves it up off the floor and lets it drop with a thunk."""
    keys = []
    for i in range(0, 193, 6):
        br = math.sin(i * math.pi / 24); heave = math.sin((i - 120) * math.pi / 48) if 120 <= i <= 168 else 0
        keys.append(k(i, P(torso=(10 + 2 * br - 6 * heave, 1, 1), head=(-4 + 6 * math.sin(i * math.pi / 96), 0, 0), hair=(3 * br, 0, 0),
                           fupper=(50 + 10 * heave, 0, 0), ffore=(80, 0, 0), mic=(100 + 35 * heave, 0, 0),
                           root=(0, 0, 0, 1 + 0.025 * br, 1 - 0.02 * br), **legs(6, -4, -8, 6)), 'linear'))
    return keys

def gnash_run():
    """NU's run legs, but both hands on the axe and its blade dragging along the floor behind him (bouncing a little)."""
    out = []
    for i, (t, pose, e) in enumerate(_run_keys()):
        p = dict(pose); bob = (-1) ** i
        p.update(fupper=(50 + 4 * bob, 0, 0), ffore=(80, 0, 0), mic=(100 - 4 * bob, 0, 0), torso=(16, 1, 1))
        out.append((t, p, e))
    return out
_run_keys = N.run_keys
N.run_keys = lambda: gnash_run() if _BUILDING else _run_keys()
_BUILDING = False
# in the air: the axe hauled up behind his head in both hands
for nm in ('JUMP', 'JUMP2', 'FALL', 'FALL2'):
    setattr(N, '_GN_' + nm, getattr(N, nm))

def air_poses(on):
    """Swap nu_moves' jump / fall poses for his (axe up behind his head) while his sheets are built."""
    for nm, d in (('JUMP', -10), ('JUMP2', -16), ('FALL', 6), ('FALL2', 10)):
        base = getattr(N, '_GN_' + nm)
        setattr(N, nm, mix(base, fupper=(-165 + d, 0, 0), ffore=(140, 0, 0), mic=(-40 + d, 0, 0)) if on else base)

# ---- his big swings
OVER = P(torso=(-14, -2, -1), head=(-12, 0, 0), fupper=(-170, 0, -2), ffore=(140, 0, 0), mic=(-30, 0, 0), bupper=(-150, 0, -1), bfore=(-30, 0, 0), root=(0, -2, -2, 0.96, 1.05), **legs(10, -4, -10, 6))
CHOP = P(torso=(32, 5, 3), head=(6, 1, 1), fupper=(-40, 3, 2), ffore=(80, 0, 0), mic=(130, 0, 0), bupper=(-20, 0, 0), bfore=(-20, 0, 0), root=(0, 6, 1, 1.1, 0.9), **legs(30, -14, -30, 24, 0, -10))
LOW = P(torso=(22, 3, 2), head=(10, 0, 0), fupper=(40, 0, 0), ffore=(30, 0, 0), mic=(150, 0, 0), bupper=(30, 0, 0), bfore=(20, 0, 0), **DEEP)
HIGH = P(torso=(-12, -1, -2), head=(-22, 0, 0), fupper=(-165, 0, -2), ffore=(165, 0, 0), mic=(10, 0, 0), bupper=(-60, 0, 0), bfore=(-20, 0, 0), root=(0, 0, -3, 0.92, 1.1), **legs(-10, 20, -16, 20, -6, -6))
ROAR = lambda s: P(torso=(-12 + s, -1, 0), head=(-28 + 2 * s, 0, 0), hair=(-10, 0, 0), fupper=(24, 0, 0), ffore=(30, 0, 0), mic=(70, 0, 0), bupper=(34 + 2 * s, 0, 0), bfore=(40, 0, 0),
                   root=(s * 0.6, 0, 0, 1.06, 0.94), **legs(24, -20, -24, 24, 8, -10))
NOAXE = ('mic',)

# SEETHE (neutral, loops while held): crouched, roaring at the sky, shaking all over
gmove('neutralB', 24, [k(0, ROAR(-1)), k(3, ROAR(1), 'linear'), k(6, ROAR(-1), 'linear'), k(9, ROAR(1), 'linear'), k(12, ROAR(-1), 'linear'), k(15, ROAR(1), 'linear'), k(18, ROAR(-1), 'linear'), k(21, ROAR(1), 'linear'), k(24, ROAR(-1), 'linear')], loop=True)
# AXE THROW (side): winds it back over his shoulder, then hurls it - his hand's empty till it comes back
gmove('sideB', 46, [k(0, P()), k(8, mix(OVER, torso=(-20, -2, -1), fupper=(-190, -1, -2), ffore=(120, 0, 0), mic=(-40, 0, 0)), 'out'),
                    k(12, P(_hide=NOAXE, torso=(26, 5, 1), head=(-10, 2, 0), fupper=(-70, 0, 0), ffore=(10, 0, 0), bupper=(40, 0, 0), root=(0, 5, 0, 1.06, 0.95), **STANCE), 'snap'),
                    k(26, P(_hide=NOAXE, torso=(12, 2, 0), fupper=(-60, 0, 0), ffore=(20, 0, 0), **STANCE), 'inout'), k(38, P(_hide=NOAXE, fupper=(-30, 0, 0), ffore=(60, 0, 0)), 'inout'), k(46, P(fupper=(-10, 0, 0), ffore=(10, 0, 0)), 'snap')], smear=('ffore', 'fupper'))
# SKYSPLITTER (up): down low, then a rising uppercut that carries the axe up over his head
gmove('upb', 40, [k(0, LOW), k(6, mix(LOW, torso=(26, 4, 2)), 'out'), k(10, HIGH, 'snap'), k(24, mix(HIGH, torso=(-16, -1, -2), mic=(25, 0, 0)), 'inout'), k(40, FALL, 'inout')], smear=('ffore', 'mic', 'fupper'))
# GROUND SPLITTER (down): overhead, CHOP into the floor (the blow bounces him up)...
gmove('downB', 30, [k(0, P()), k(8, OVER, 'out'), k(12, CHOP, 'snap'), k(20, mix(CHOP, torso=(30, 5, 3)), 'linear'), k(30, mix(OVER, **legs(-20, 40, -30, 40, -10, -10)), 'inout')], smear=('ffore', 'mic', 'fupper'))
# ... and the second slam, in the air: axe overhead, legs tucked, then down
gmove('downB2', 30, [k(0, mix(OVER, **legs(-20, 40, -30, 40, -10, -10))), k(10, mix(OVER, torso=(-20, -2, -2), fupper=(-185, 0, -2), ffore=(130, 0, 0)), 'inout'), k(14, CHOP, 'snap'), k(30, mix(CHOP, torso=(26, 4, 2)), 'linear')], smear=('ffore', 'mic', 'fupper'))
# EXECUTIONER (limit): hauls the axe up, a great leap, holds at the top - and brings it down
gmove('limit', 150, [k(0, P()), k(14, mix(LOW, mic=(170, 0, 0)), 'out'), k(26, HIGH, 'snap'), k(40, mix(OVER, **legs(-30, 60, -40, 60, -10, -10)), 'inout'),
                     k(96, mix(OVER, torso=(-22, -2, -2), fupper=(-190, 0, -2), ffore=(125, 0, 0), **legs(-30, 60, -40, 60, -10, -10)), 'inout'), k(102, CHOP, 'snap'), k(140, mix(CHOP, torso=(28, 4, 2)), 'linear'), k(150, P(), 'inout')], step=2)
# THE TAUNT: axe up on his shoulder, then a big shaking laugh, head thrown back
SHOULDER = P(fupper=(-200, 0, 0), ffore=(110, 0, 0), mic=(-60, 0, 0), torso=(-4, 0, 0), head=(-6, 0, 0), bupper=(-30, 0, 0), bfore=(-60, 0, 0))
LAUGH = lambda s: mix(SHOULDER, torso=(-12 + 4 * s, -1, 0), head=(-28 + 6 * s, 0, 0), hair=(-8 * s, 0, 0), root=(0, 0, s, 1 + 0.03 * s, 1 - 0.03 * s), bupper=(20, 0, 0), bfore=(90, 0, 0))
gmove('taunt', 84, [k(0, P()), k(12, SHOULDER, 'out'), k(20, mix(SHOULDER, head=(-2, 0, 0)), 'inout')] + [k(26 + 6 * i, LAUGH(1 if i % 2 else 0), 'inout') for i in range(8)] + [k(84, P(), 'back')], step=2)

if __name__ == '__main__':
    _BUILDING = True; air_poses(True)
    build(gnash_draw, {**N.FOLLOW, 'hair': (0.25, 0.5), 'mic': (0, 0), 'bfore': (0, 0), 'ffore': (0, 0)}, GN, 'gnash', 'gnMoves.js', 'GN_MOVES', gnash_idle, ['default', 'bloodmoon', 'gravestone'], (255, 120, 60))
    js = os.path.join(os.path.dirname(__file__), '../../src/fighters/gnMoves.js'); t = open(js).read()
    open(js, 'w').write(t.replace('Generated by tools/sprites/show_moves.py', 'Generated by tools/sprites/gnash_moves.py (via show_moves.py)').replace('(112x104 frames, 36 to a row, feet at 56,95)', '(128x136 frames, 32 to a row, feet at 64,115)'))
    # his icon: the head out of the first idle frame (show_moves' crop is for 64x64 frames)
    from PIL import Image as _I
    _I.open(os.path.join(os.path.dirname(__file__), '../../public/assets/fighters/gnash/idle_sheet.png')).crop((46, 36, 82, 55)).resize((72, 38), _I.NEAREST).save(
        os.path.join(os.path.dirname(__file__), '../../public/assets/fighters/gnash/icon.png'))
    print('done')

"""Mr Wake's move animations: every attack, special, grab and throw, plus hurt, shield and ledge poses,
animated from his idle drawing with the puppet rig (tools/sprites/puppet.py).

He is cut into cloak tail, feet, robe (torso), hatted head, sleeve (arm) and the gem staff. The staff is
one long rigid piece held at his hand, so it can be swung like a bat, twirled overhead, flipped round
to thrust the gem forward or planted in the floor. Where the staff crossed in front of his robe, the
robe behind it is filled back in so nothing shows a hole when the staff moves away.

Runs once per costume: the default drawing and the Rosebud costume (roses/idle_sheet.png), which has
the same silhouette - same cut, same animation.

Output: public/assets/fighters/mr-wake/moves_sheet.png (and roses/moves_sheet.png), 176x120 frames.
His feet stand at (92, 110) (the idle drawing is placed at (56, 48)), and src/fighters/mwMoves.js gets the
frame index for each move: [first frame, frame count, ticks per frame, loops?].

  python3 tools/sprites/mr_wake_moves.py [--preview DIR]
"""
import os, sys, json
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from puppet import Part, Rig, animate, save_atlas, contact

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
DIR = os.path.join(ROOT, 'public/assets/fighters/mr-wake')
JS = os.path.join(ROOT, 'src/fighters/mwMoves.js')
CANVAS, OFF, FEET = (176, 120), (56, 48), (36, 61)
MID = (37, 38)

def hexrgb(h): return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
STAFF_COLS = {hexrgb(c) for c in ('2c2828', '545150', '443d4a', '33293c')}
# Rosebud: the staff is a green stem with long leaves (tools/sprites/mr_wake_roses.py)
STEM_COLS = {hexrgb(c) for c in ('1e4a1e', '2f7a2c', '58b048', '1f5524', '3c8c38', '7ccb5c')}

def cut(base, staff_cols=STAFF_COLS, width=2.3):
    """Cut the drawing into parts. The staff is found by its colours along the line it lies on."""
    H, W = base.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W]
    solid = base[..., 3] > 0
    rgb = [tuple(p) for p in base[..., :3].reshape(-1, 3)]
    is_staff_col = np.array([c in staff_cols for c in rgb]).reshape(H, W)
    # the shaft: a line from the gem (14, 15) to the butt end (59, 33)
    ax, ay, bx, by = 14, 15, 59, 33
    dx, dy = bx - ax, by - ay
    tt = ((xx - ax) * dx + (yy - ay) * dy) / (dx * dx + dy * dy)
    dist = np.abs((xx - ax) * dy - (yy - ay) * dx) / np.hypot(dx, dy)
    shaft = is_staff_col & (dist <= width) & (tt > -0.1) & (tt < 1.1) & solid
    gem = solid & (xx <= 22) & (yy <= 36)                                  # gem head and its purple drips
    staff = shaft | gem
    legs = solid & (yy >= 54) & ~staff & ((xx <= 30) | (xx >= 36))     # the robe hem between the feet stays on the robe
    bfoot = legs & (xx <= 30)
    ffoot = legs & (xx >= 36)
    cloak = solid & (xx <= 30) & (yy >= 33) & (yy <= 55) & ~staff & ~legs
    head = solid & (yy <= 20) & (xx >= 26) & ~staff
    arm = solid & (xx >= 42) & (yy >= 24) & (yy <= 34) & ~staff
    torso = solid & ~staff & ~legs & ~cloak & ~head & ~arm
    # fill the robe back in where the staff covered it (inside the body's outline)
    filled = base.copy()
    hole = shaft & (xx >= 29) & (xx <= 46)
    body = torso | arm
    for _ in range(4):
        ys, xs = np.nonzero(hole & ~body)
        for y, x in zip(ys, xs):
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x - 1), (y, x + 1), (y + 1, x - 1), (y - 1, x + 1)):
                if 0 <= ny < H and 0 <= nx < W and body[ny, nx] and not shaft[ny, nx]:
                    filled[y, x] = filled[ny, nx]; body[y, x] = True; break
    torso = torso | (hole & body & ~arm)
    # the stretch of shaft hidden behind his robe and hand: redrawn from a clean cross-section of the shaft
    # (a column near x=24), so the staff stays one piece when it swings out from behind him
    line_y = lambda x: ay + (x - ax) * dy / dx
    x0 = min(range(20, 30), key=lambda x: (abs(int(shaft[:, x].sum()) - 3), abs(x - 24)))
    ys0 = np.nonzero(shaft[:, x0])[0]
    back = base.copy(); back[...] = 0
    hidden = np.zeros((H, W), bool)
    for x in range(x0 + 1, bx):
        sh = int(round(line_y(x) - line_y(x0)))
        for y in ys0:
            ny = y + sh
            if 0 <= ny < H and not shaft[ny, x]:
                back[ny, x] = base[y, x0]; hidden[ny, x] = True
    return filled, [
        Part('cloak', cloak, (31, 36), 'torso', z=0),
        Part('bfoot', bfoot, (25, 55), None, z=1),
        Part('ffoot', ffoot, (41, 54), None, z=2),
        Part('staffback', hidden, (47, 29), 'staff', z=2.5, variants=[back]),   # behind the robe
        Part('torso', torso, (37, 52), None, z=3),
        Part('head', head, (38, 21), 'torso', z=4),
        Part('arm', arm, (42, 26), 'torso', z=5),
        Part('staff', staff, (47, 29), 'arm', z=6, variants=[base], upright=1),   # drawn from the original, not the filled-in robe
    ], base

def P(**kw): return kw
def k(t, pose, ease='inout'): return (t, pose, ease)
REST = P()
MOVES = {}
def move(name, ticks, keys, step=2, smear=('staff', 'staffback'), loop=False, center=None):
    MOVES[name] = (ticks, keys, step, smear, loop, center)

# Angles: + turns clockwise on screen. The staff keeps its own direction on screen (it doesn't inherit the
# lean of his arm and body), so poses aim the gem directly with G(direction); at rest it points to 203
# (back and up). Moving from one G to another sweeps the gem the short or long way round as written.
STEP = dict(bfoot=(10, -1, 0), ffoot=(-10, 2, 0))
def G(d): return d - 203        # staff angle that points the gem in screen direction d (0 = forward, 90 = down, 270 = up)
CROUCH = dict(root=(0, 0, 0, 1.06, 0.88), bfoot=(14, -1, 0), ffoot=(-14, 2, 0))

# --- jab: a baseball-bat swing - staff cocked back over the shoulder, then a big flat swing through the front
move('jab', 27, [
    k(0, REST),
    k(6, P(arm=(-30, -3, -2), staff=(G(250), 0, 0), torso=(-8, -1, 0), head=(4, 0, 0), cloak=(14, 0, 0), root=(0, -2, 0, 1.03, 0.97), bfoot=(6, 0, 0)), 'out'),
    k(9, P(arm=(10, 3, 1), staff=(G(330), 0, 0), torso=(10, 2, 0), head=(-6, 1, 0), cloak=(-22, 0, 0), root=(0, 3, 0, 1.03, 0.97), **STEP), 'snap'),
    k(13, P(arm=(20, 3, 1), staff=(G(358), 0, 0), torso=(12, 2, 0), head=(-6, 1, 0), cloak=(-18, 0, 0), root=(0, 3, 0), **STEP), 'out'),
    k(27, REST, 'inout'),
])
# --- ftilt: flips the staff and thrusts the gem straight out in front
move('ftilt', 28, [
    k(0, REST),
    k(7, P(arm=(-12, -4, 0), staff=(G(345), -6, 0), torso=(-6, -1, 0), head=(3, 0, 0), cloak=(10, 0, 0), root=(0, -2, 0)), 'out'),
    k(10, P(arm=(4, 6, 1), staff=(G(360), 6, 0), torso=(10, 3, 1), head=(-4, 1, 0), cloak=(-20, 0, 0), root=(0, 4, 0, 1.04, 0.96), **STEP), 'snap'),
    k(17, P(arm=(4, 5, 1), staff=(G(360), 5, 0), torso=(8, 3, 1), head=(-3, 1, 0), cloak=(-14, 0, 0), root=(0, 4, 0), **STEP), 'linear'),
    k(28, REST, 'inout'),
])
# --- dtilt: crouches and sweeps the butt of the staff low along the ground
move('dtilt', 22, [
    k(0, REST),
    k(5, P(arm=(-20, -2, 0), staff=(G(230), 0, 0), torso=(10, 0, 2), head=(-4, 0, 0), cloak=(-6, 0, 0), **CROUCH), 'out'),
    k(8, P(arm=(30, 4, 3), staff=(G(200), 2, 2), torso=(20, 2, 3), head=(-10, 0, 0), cloak=(-20, 0, 0), root=(0, 3, 0, 1.08, 0.84), bfoot=(18, -1, 0), ffoot=(-20, 3, 0)), 'snap'),
    k(14, P(arm=(28, 4, 3), staff=(G(198), 2, 2), torso=(18, 2, 3), head=(-8, 0, 0), cloak=(-14, 0, 0), root=(0, 3, 0, 1.08, 0.85), bfoot=(16, -1, 0), ffoot=(-18, 3, 0)), 'linear'),
    k(22, REST, 'inout'),
])
# --- utilt: twirls the staff overhead like a propeller
move('utilt', 26, [
    k(0, REST),
    k(5, P(arm=(-70, -2, -4), staff=(0, 0, 0), torso=(-4, 0, -1), head=(-6, 0, 0), root=(0, 0, -1, 0.97, 1.04)), 'out'),
    k(14, P(arm=(-85, -2, -5), staff=(-360, 0, 0), torso=(-6, 0, -1), head=(-8, 0, 0), cloak=(14, 0, 0), root=(0, 0, -2, 0.96, 1.06)), 'linear'),
    k(18, P(arm=(-80, -2, -5), staff=(-400, 0, 0), torso=(-5, 0, -1), head=(-6, 0, 0), cloak=(10, 0, 0), root=(0, 0, -1)), 'out'),
    k(26, P(staff=(-360, 0, 0)), 'inout'),
])
# --- fsmash: raises the gem high behind him (charging), then slams it down in front with everything
move('fsmash', 51, [
    k(0, REST),
    k(14, P(arm=(-90, -4, -4), staff=(G(240), 0, 0), torso=(-14, -2, 0), head=(6, 0, 0), cloak=(20, 0, 0), root=(0, -3, 0, 0.98, 1.04), bfoot=(8, 0, 0)), 'out'),
    k(17, P(arm=(-96, -4, -4), staff=(G(236), 0, 0), torso=(-16, -2, 0), head=(8, 0, 0), cloak=(22, 0, 0), root=(0, -3, 0, 0.97, 1.05), bfoot=(8, 0, 0)), 'linear'),
    k(20, P(arm=(20, 6, 3), staff=(G(350), 0, 0), torso=(20, 4, 2), head=(-8, 1, 0), cloak=(-26, 0, 0), root=(0, 5, 0, 1.08, 0.9), bfoot=(18, -1, 0), ffoot=(-18, 3, 0)), 'snap'),
    k(34, P(arm=(22, 6, 3), staff=(G(352), 0, 0), torso=(18, 4, 2), head=(-6, 1, 0), cloak=(-16, 0, 0), root=(0, 5, 0, 1.06, 0.92), bfoot=(16, -1, 0), ffoot=(-16, 3, 0)), 'linear'),
    k(51, REST, 'inout'),
])
# --- usmash: plants himself and thrusts the gem straight up overhead
move('usmash', 45, [
    k(0, REST),
    k(13, P(arm=(10, 0, 2), staff=(G(200), 0, 0), torso=(6, 0, 2), head=(4, 0, 0), **CROUCH), 'out'),
    k(16, P(arm=(-80, -2, -6), staff=(G(270), 0, -4), torso=(-6, 0, -2), head=(-12, 0, 0), cloak=(20, 0, 0), root=(0, 0, -3, 0.92, 1.12)), 'snap'),
    k(30, P(arm=(-82, -2, -6), staff=(G(268), 0, -4), torso=(-6, 0, -2), head=(-10, 0, 0), cloak=(14, 0, 0), root=(0, 0, -2, 0.95, 1.07)), 'linear'),
    k(45, REST, 'inout'),
])
# --- dsmash: cloak spin - crouches and whirls, staff swept round both sides at ankle height
move('dsmash', 43, [
    k(0, REST),
    k(11, P(arm=(20, 0, 2), staff=(G(220), 0, 2), torso=(10, 0, 2), cloak=(-10, 0, 0), **CROUCH), 'out'),
    k(14, P(arm=(40, 4, 4), staff=(G(380), 2, 2), torso=(20, 2, 3), head=(-8, 0, 0), cloak=(-40, 0, 0), root=(0, 0, 0, 1.12, 0.84), bfoot=(18, -1, 0), ffoot=(-20, 3, 0)), 'snap'),
    k(17, P(arm=(40, -4, 4), staff=(G(520), 2, 2), torso=(-20, -2, 3), head=(8, 0, 0), cloak=(40, 0, 0), root=(0, 0, 0, 1.12, 0.84), bfoot=(18, -1, 0), ffoot=(-20, 3, 0)), 'linear'),
    k(30, P(arm=(30, -3, 3), staff=(G(515), 2, 2), torso=(-14, -2, 3), head=(6, 0, 0), cloak=(30, 0, 0), root=(0, 0, 0, 1.1, 0.86), bfoot=(16, -1, 0), ffoot=(-18, 3, 0)), 'linear'),
    k(43, P(staff=(G(563), 0, 0)), 'inout'),
], smear=('staff', 'staffback', 'cloak'))

TUCK = dict(bfoot=(-20, 2, -4), ffoot=(-26, 0, -5))
AIR = P(**TUCK)
# --- nair: tucks and spins, staff held out like a wheel spoke
move('nair', 23, [
    k(0, AIR),
    k(4, P(arm=(10, 2, 0), staff=(G(163), 0, 0), root=(-20, 0, -4, 0.96, 0.96), cloak=(14, 0, 0), **TUCK), 'out'),
    k(12, P(arm=(10, 2, 0), staff=(G(523), 0, 0), root=(340, 0, -4, 0.96, 0.96), cloak=(-18, 0, 0), **TUCK), 'linear'),
    k(17, P(root=(360, 0, -2), staff=(360, 0, 0), cloak=(-8, 0, 0), **TUCK), 'out'),
    k(23, P(root=(360, 0, 0), staff=(360, 0, 0), **TUCK), 'inout'),
], smear=('staff', 'staffback', 'cloak'), center=MID)
# --- fair: overhead chop with the gem end, bringing it down in front
move('fair', 30, [
    k(0, AIR),
    k(9, P(arm=(-80, -3, -4), staff=(G(250), 0, 0), torso=(-10, -1, 0), head=(4, 0, 0), cloak=(16, 0, 0), root=(-6, 0, 0), **TUCK), 'out'),
    k(12, P(arm=(10, 4, 2), staff=(G(400), 0, 0), torso=(14, 3, 2), head=(-6, 1, 0), cloak=(-24, 0, 0), root=(12, 2, 0, 1.03, 0.97), **TUCK), 'snap'),
    k(20, P(arm=(14, 4, 2), staff=(G(405), 0, 0), torso=(12, 2, 2), head=(-4, 1, 0), cloak=(-14, 0, 0), root=(8, 2, 0), **TUCK), 'linear'),
    k(30, P(staff=(G(563), 0, 0), **TUCK), 'inout'),
])
# --- bair: jabs the butt of the staff out behind him, cloak flaring
move('bair', 25, [
    k(0, AIR),
    k(7, P(arm=(-10, 2, 0), staff=(G(223), 4, 0), torso=(6, 1, 0), cloak=(16, 0, 0), root=(6, 2, 0), **TUCK), 'out'),
    k(9, P(arm=(-20, -6, 0), staff=(G(360), -14, 2), torso=(-12, -2, 0), head=(-8, 0, 0), cloak=(-40, -3, 0), root=(-12, -3, 0, 1.04, 0.96), bfoot=(40, -3, -2), ffoot=(10, -2, -3)), 'snap'),
    k(16, P(arm=(-18, -6, 0), staff=(G(358), -13, 2), torso=(-10, -2, 0), head=(-6, 0, 0), cloak=(-30, -3, 0), root=(-10, -3, 0), bfoot=(30, -3, -2), ffoot=(4, -2, -3)), 'linear'),
    k(25, AIR, 'inout'),
], smear=('staff', 'staffback', 'cloak'))
# --- dair: raises the staff then drives it straight down beneath him, legs splayed
move('dair', 39, [
    k(0, AIR),
    k(12, P(arm=(-80, -2, -6), staff=(G(270), 0, -2), torso=(-4, 0, -2), head=(6, 0, 0), cloak=(14, 0, -2), root=(0, 0, -6, 1.04, 0.92), bfoot=(-30, 2, -6), ffoot=(-36, 0, -6)), 'out'),
    k(15, P(arm=(70, 0, 4), staff=(G(450), -4, 6), torso=(6, 0, 2), head=(-8, 0, 0), cloak=(-14, 0, 2), root=(0, 0, 4, 0.94, 1.08), bfoot=(14, -2, 2), ffoot=(-14, 2, 2)), 'snap'),
    k(26, P(arm=(66, 0, 4), staff=(G(448), -4, 6), torso=(4, 0, 2), head=(-6, 0, 0), cloak=(-18, 0, 2), root=(0, 0, 3, 0.95, 1.06), bfoot=(12, -2, 2), ffoot=(-12, 2, 2)), 'linear'),
    k(39, AIR, 'inout'),
])

# ---- grab and throws (the free hand is under his cloak: he hooks them with the staff)
LUNGE = dict(torso=(12, 3, 1), head=(-4, 1, 0), cloak=(-18, 0, 0), root=(0, 5, 0, 1.03, 0.97), **STEP)
move('grab', 26, [
    k(0, REST),
    k(4, P(arm=(-10, -2, 0), staff=(G(193), 0, 0), torso=(-5, -1, 0), cloak=(8, 0, 0)), 'out'),
    k(7, P(arm=(10, 8, 2), staff=(G(370), 4, 0), **LUNGE), 'snap'),
    k(14, P(arm=(8, 7, 2), staff=(G(372), 4, 0), **LUNGE), 'linear'),
    k(26, REST, 'inout'),
], smear=())
HOLD = P(arm=(6, 6, 1), staff=(G(372), 3, 0), torso=(8, 2, 1), head=(-2, 0, 0), cloak=(-8, 0, 0), ffoot=(-8, 1, 0), root=(0, 2, 0))
move('holding', 24, [k(0, HOLD), k(12, P(arm=(9, 7, 1), staff=(G(375), 3, 0), torso=(10, 2, 1), head=(-4, 0, 0), cloak=(-12, 0, 0), ffoot=(-8, 1, 0), root=(0, 2, 0, 1.02, 0.98))), k(24, HOLD)], smear=(), loop=True)
move('throw_forward', 18, [
    k(0, P(arm=(-50, -2, -2), staff=(G(250), 0, 0), torso=(-10, -1, 0), head=(4, 0, 0), cloak=(14, 0, 0), root=(0, -2, 0))),
    k(5, P(arm=(10, 6, 2), staff=(G(400), 0, 0), **LUNGE), 'snap'),
    k(18, REST, 'inout'),
])
move('throw_back', 18, [
    k(0, P(arm=(10, 4, 1), staff=(G(330), 0, 0), torso=(8, 1, 0), cloak=(-10, 0, 0))),
    k(5, P(arm=(-20, -6, -1), staff=(G(160), 0, 0), torso=(-16, -3, 0), head=(-8, 0, 0), cloak=(26, 0, 0), root=(-8, -4, 0, 1.03, 0.97), bfoot=(10, 0, 0)), 'snap'),
    k(11, P(arm=(-22, -6, -1), staff=(G(165), 0, 0), torso=(-14, -3, 0), head=(-6, 0, 0), cloak=(22, 0, 0), root=(-6, -4, 0)), 'linear'),
    k(18, REST, 'inout'),
])
move('throw_up', 18, [
    k(0, P(arm=(20, 2, 2), staff=(G(200), 0, 0), torso=(8, 0, 1), **CROUCH)),
    k(4, P(arm=(-80, -2, -6), staff=(G(270), 0, -4), torso=(-6, 0, -2), head=(-12, 0, 0), cloak=(16, 0, 0), root=(0, 0, -3, 0.94, 1.1)), 'snap'),
    k(10, P(arm=(-78, -2, -6), staff=(G(272), 0, -4), torso=(-5, 0, -2), head=(-10, 0, 0), cloak=(12, 0, 0), root=(0, 0, -2, 0.96, 1.06)), 'linear'),
    k(18, REST, 'inout'),
])
move('throw_down', 18, [
    k(0, P(arm=(-60, -2, -4), staff=(G(270), 0, -2), torso=(-4, 0, -1), root=(0, 0, -2, 0.96, 1.05))),
    k(4, P(arm=(40, 4, 4), staff=(G(450), 2, 4), torso=(20, 2, 3), head=(-8, 0, 0), cloak=(-18, 0, 0), root=(0, 3, 0, 1.08, 0.86), bfoot=(18, -1, 0), ffoot=(-20, 3, 0)), 'snap'),
    k(10, P(arm=(38, 4, 4), staff=(G(448), 2, 4), torso=(18, 2, 3), head=(-6, 0, 0), cloak=(-14, 0, 0), root=(0, 3, 0, 1.08, 0.87), bfoot=(16, -1, 0), ffoot=(-18, 3, 0)), 'linear'),
    k(18, REST, 'inout'),
])

# ---- specials
# Void Orb: draws the gem back, then swings it forward and the orb leaves it at frame 11
move('neutralB', 28, [
    k(0, REST),
    k(8, P(arm=(-40, -4, -2), staff=(G(230), 0, 0), torso=(-10, -2, 0), head=(4, 0, 0), cloak=(16, 0, 0), root=(0, -2, 0, 1.03, 0.97)), 'out'),
    k(11, P(arm=(4, 6, 1), staff=(G(360), 6, 0), **LUNGE), 'snap'),
    k(19, P(arm=(2, 5, 1), staff=(G(362), 5, 0), torso=(10, 3, 1), head=(-3, 1, 0), cloak=(-12, 0, 0), root=(0, 4, 0), **STEP), 'linear'),
    k(28, REST, 'inout'),
])
# Drifting Soul: lifts the gem and a lost soul rises out of it, released with an open sweep
move('sideB', 39, [
    k(0, REST),
    k(10, P(arm=(-60, -2, -4), staff=(G(275), 0, -2), torso=(-6, 0, -1), head=(-8, 0, 0), cloak=(12, 0, 0), root=(0, 0, -2, 0.97, 1.04)), 'out'),
    k(16, P(arm=(-66, -2, -4), staff=(G(272), 0, -2), torso=(-8, 0, -1), head=(-10, 0, 0), cloak=(16, 0, 0), root=(0, 0, -3, 0.96, 1.05)), 'inout'),
    k(20, P(arm=(10, 6, 1), staff=(G(345), 4, 0), **LUNGE), 'snap'),
    k(30, P(arm=(8, 5, 1), staff=(G(350), 4, 0), torso=(10, 3, 1), head=(-3, 1, 0), cloak=(-12, 0, 0), root=(0, 4, 0), **STEP), 'linear'),
    k(39, REST, 'inout'),
])
# Shadow Pool: stabs the staff into the ground and sinks low as his body seeps out
move('downB', 50, [
    k(0, REST),
    k(8, P(arm=(-60, -2, -4), staff=(G(290), 0, -2), torso=(-4, 0, -1), head=(-6, 0, 0), root=(0, 0, -2, 0.96, 1.06)), 'out'),
    k(11, P(arm=(40, 4, 4), staff=(G(450), 0, 6), torso=(16, 2, 3), head=(-6, 0, 0), cloak=(-20, 0, 0), root=(0, 0, 0, 1.16, 0.8), bfoot=(16, -2, 0), ffoot=(-16, 3, 0)), 'snap'),
    k(34, P(arm=(38, 4, 4), staff=(G(448), 0, 6), torso=(14, 2, 3), head=(-4, 0, 0), cloak=(-30, -2, 0), root=(0, 0, 0, 1.2, 0.76), bfoot=(18, -2, 0), ffoot=(-18, 3, 0)), 'linear'),
    k(50, REST, 'inout'),
])
# Gem Rocket: points the gem at the floor beneath him and blasts off it, body stretched upward
move('upb', 38, [
    k(0, P(arm=(10, 0, 2), staff=(G(230), 0, 0), torso=(8, 0, 2), **CROUCH)),
    k(7, P(arm=(50, 0, 4), staff=(G(450), 0, 4), torso=(4, 0, 2), head=(6, 0, 0), cloak=(-10, 0, 0), root=(0, 0, 2, 1.1, 0.86), bfoot=(14, -1, 0), ffoot=(-14, 2, 0)), 'out'),
    k(9, P(arm=(60, 0, 4), staff=(G(452), 0, 6), torso=(-2, 0, 0), head=(-10, 0, 0), cloak=(30, 0, 2), root=(0, 0, -2, 0.88, 1.16), bfoot=(6, 1, 0), ffoot=(-6, -1, 0)), 'snap'),
    k(24, P(arm=(56, 0, 4), staff=(G(449), 0, 6), torso=(-2, 0, 0), head=(-12, 0, 0), cloak=(36, 0, 2), root=(0, 0, -2, 0.9, 1.12), bfoot=(8, 1, 0), ffoot=(-4, -1, 0)), 'linear'),
    k(38, AIR, 'inout'),
])

# ---- reactions
HURT = P(root=(-12, -2, 0, 1.05, 0.95), torso=(-10, -1, 0), head=(-16, -1, 0), arm=(30, 0, 2), staff=(G(225), 0, 0), cloak=(28, 0, 0), bfoot=(16, 0, 0), ffoot=(-16, 0, 0))
move('hitstun', 16, [k(0, HURT), k(8, P(root=(-16, -3, 0, 1.03, 0.97), torso=(-12, -1, 0), head=(-20, -1, 0), arm=(44, 0, 2), staff=(G(235), 0, 0), cloak=(36, 0, 0), bfoot=(22, 0, 0), ffoot=(-22, 0, 0))), k(16, HURT)], smear=(), loop=True)
GUARD = P(root=(0, 0, 0, 1.04, 0.94), torso=(6, 0, 1), head=(4, 0, 1), arm=(-60, -3, -2), staff=(G(268), 0, 0), cloak=(-8, 0, 0), bfoot=(8, 0, 0), ffoot=(-8, 0, 0))
move('shield', 24, [k(0, GUARD), k(12, P(root=(0, 0, 0, 1.05, 0.93), torso=(7, 0, 1), head=(5, 0, 1), arm=(-62, -3, -2), staff=(G(270), 0, 0), cloak=(-10, 0, 0), bfoot=(8, 0, 0), ffoot=(-8, 0, 0))), k(24, GUARD)], smear=(), loop=True)
HELD = P(root=(-8, 0, -2), torso=(-8, 0, 0), head=(-12, 0, 0), arm=(50, 0, 2), staff=(G(230), 0, 0), bfoot=(-10, 0, 0), ffoot=(-18, 0, 0), cloak=(20, 0, 0))
move('grabbed', 16, [k(0, HELD), k(8, P(root=(-5, 0, -3), torso=(-4, 0, 0), head=(-8, 0, 0), arm=(60, 0, 2), staff=(G(240), 0, 0), bfoot=(-18, 0, 0), ffoot=(-8, 0, 0), cloak=(24, 0, 0))), k(16, HELD)], smear=(), loop=True)
HANG = P(arm=(-80, -2, -4), staff=(G(275), 0, 0), torso=(-4, 0, 0), head=(-8, 0, 0), bfoot=(10, 0, 0), ffoot=(-6, 0, 0), cloak=(6, 0, 0), root=(0, 0, 0, 0.98, 1.04))
move('ledge', 24, [k(0, HANG), k(12, P(arm=(-78, -2, -4), staff=(G(273), 0, 0), torso=(-2, 0, 0), head=(-6, 0, 0), bfoot=(16, 0, 0), ffoot=(-2, 0, 0), cloak=(10, 0, 0), root=(0, 0, 0, 0.98, 1.04))), k(24, HANG)], smear=(), loop=True)


def build(src_rel, out_rel, staff_cols=STAFF_COLS, width=2.3):
    sheet = np.array(Image.open(os.path.join(DIR, src_rel)).convert('RGBA'))
    base = sheet[:, :64]
    filled, parts, _ = cut(base, staff_cols, width)
    rig = Rig(filled, parts, CANVAS, OFF, FEET)
    ghost = tuple(int(v) for v in base[13, 13, :3]) if base[13, 13, 3] else (214, 51, 108)   # the gem's purple (or the tulip's pink)
    out = {}
    for name, (ticks, keys, step, smear, loop, center) in MOVES.items():
        out[name] = animate(rig, keys, ticks, step=step, smear=smear, smear_tint=ghost, center=center)
    idx = save_atlas(out, os.path.join(DIR, out_rel))
    return out, idx, rig, base

if __name__ == '__main__':
    out, idx, rig, ref = build('idle_sheet.png', 'moves_sheet.png')
    build('roses/idle_sheet.png', 'roses/moves_sheet.png', STEM_COLS, 3.6)
    index = {n: idx[n] + [MOVES[n][2]] + ([1] if MOVES[n][4] else []) for n in MOVES}
    with open(JS, 'w') as f:
        f.write('// Generated by tools/sprites/mr_wake_moves.py - do not edit by hand.\n')
        f.write('// Mr Wake move animations in moves_sheet.png (176x120 frames, feet at 92,110):\n')
        f.write('// move: [first frame, frame count, game ticks per frame, loops?]\n')
        f.write('export const MW_MOVES = ' + json.dumps(index).replace('],', '],\n  ').replace('{', '{\n  ').replace(']}', '],\n};') + '\n')
    if '--preview' in sys.argv:
        d = sys.argv[sys.argv.index('--preview') + 1]; os.makedirs(d, exist_ok=True)
        for name, fr in out.items(): contact(fr, os.path.join(d, 'mw_' + name + '.png'))
    print('frames:', sum(len(f) for f in out.values()))

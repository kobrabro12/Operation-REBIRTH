"""Soul Summoner's move animations: every attack, special, grab and throw, plus hurt, shield and ledge
poses, animated from his idle drawing with the puppet rig (tools/sprites/puppet.py).

He is cut into cape, legs, robe (torso), head, flame arm and the soul-flame itself. The flame keeps
flickering through its five idle frames while it's swung around, and fast swings leave a faint blue
afterimage of the arm and flame.

Output: public/assets/fighters/soul-summoner/moves_sheet.png, 96x96 frames. His feet stand at (48, 91)
of every frame (the idle drawing is placed at (16, 32)), and src/fighters/ssMoves.js gets the frame
index for each move: [first frame, frame count, ticks per frame].

  python3 tools/sprites/soul_summoner_moves.py [--preview DIR]
"""
import os, sys, json
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from puppet import Part, Rig, animate, save_atlas, contact

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
SRC = os.path.join(ROOT, 'public/assets/fighters/soul-summoner/idle_sheet.png')
OUT = os.path.join(ROOT, 'public/assets/fighters/soul-summoner/moves_sheet.png')
JS = os.path.join(ROOT, 'src/fighters/ssMoves.js')

sheet = np.array(Image.open(SRC).convert('RGBA'))
frames = [sheet[:, i * 64:(i + 1) * 64] for i in range(sheet.shape[1] // 64)]
base = frames[0]
H, W = base.shape[:2]
yy, xx = np.mgrid[0:H, 0:W]
solid = base[..., 3] > 0

# ---------------------------------------------------------------- the cut
flame = (xx >= 43) & (yy <= 25)
arm = (xx >= 41) & (yy >= 26) & (yy <= 30)
head = (yy <= 16) & (xx < 43)
cape = (xx <= 20) & (yy >= 30) & (yy <= 54)
legs = (yy >= 50) & ~cape & ~((xx >= 42) & (yy <= 50))
back_leg = legs & (xx <= 30)
front_leg = legs & (xx >= 31)
torso = solid & ~flame & ~arm & ~head & ~cape & ~legs

parts = [
    Part('cape', cape & solid, (21, 31), 'torso', z=0),
    Part('bleg', back_leg & solid, (26, 50), None, z=1),
    Part('fleg', front_leg & solid, (35, 50), None, z=2),
    Part('torso', torso, (32, 48), None, z=3),
    Part('head', head & solid, (33, 17), 'torso', z=4),
    Part('arm', arm & solid, (41, 27), 'torso', z=5),
    Part('flame', flame, (48, 27), 'arm', z=6, variants=frames[0:5], upright=0.75, drag=0.6),
]
CANVAS, OFF, FEET = (96, 96), (16, 32), (32, 58)
rig = Rig(base, parts, CANVAS, OFF, FEET)
GHOST = (120, 160, 198)        # 78A0C6 - his light flame blue (skins recolour it with the rest)

# ---------------------------------------------------------------- poses
# A pose is {part: (angle, dx, dy[, sx, sy])}, 'root': (angle, dx, dy, sx, sy) around the feet.
# Positive angles turn clockwise on screen. The arm points right (forward) at 0; -90 is straight up.
def P(**kw):
    """A pose. The arm never slides off his shoulder: a push forward (dx) stretches the sleeve from the
    shoulder instead (the arm is about 10 px long), so the hand reaches without coming detached."""
    if 'arm' in kw:
        a = list(kw['arm']) + [0, 0, 0, 1, 1][len(kw['arm']):]
        a[3] = a[3] * (1 + max(-0.3, a[1] / 10)); a[1] = 0; a[2] = max(-1, min(1, a[2]))
        kw['arm'] = tuple(a)
    return kw
REST = P()

def k(t, pose, ease='inout'): return (t, pose, ease)

MOVES = {}
def move(name, ticks, keys, step=2, smear=('arm', 'flame'), loop=False, center=None):
    MOVES[name] = (ticks, keys, step, smear, loop, center)

# --- jab: a quick flame punch - shoulder dips back, arm snaps forward, settles
move('jab', 18, [
    k(0, P(root=(0, 0, 0, 1, 1))),
    k(2, P(arm=(-25, -2, 0), torso=(-4, 0, 0), head=(3, 0, 0), root=(0, 0, 0, 1.02, 0.98)), 'out'),
    k(5, P(arm=(8, 6, 1), torso=(6, 2, 0), head=(-3, 0, 0), cape=(-10, 0, 0), fleg=(-6, 0, 0)), 'snap'),
    k(10, P(arm=(4, 5, 1), torso=(5, 2, 0), head=(-2, 0, 0), cape=(-14, 0, 0), fleg=(-6, 0, 0)), 'linear'),
    k(18, REST, 'inout'),
])
# --- ftilt: a wide forward rake of flame - wind back high, then sweep down across, weight onto the front foot
move('ftilt', 28, [
    k(0, REST),
    k(5, P(arm=(-75, -3, -1), torso=(-9, -1, 0), head=(5, 0, 0), cape=(12, 0, 0), bleg=(5, 0, 0), fleg=(-4, 0, 0), root=(0, -2, 0, 1, 1)), 'out'),
    k(7, P(arm=(-55, -2, -1), torso=(-6, 0, 0), head=(3, 0, 0), cape=(8, 0, 0), root=(0, -1, 0)), 'in'),
    k(10, P(arm=(40, 6, 2), torso=(12, 3, 1), head=(-6, 1, 0), cape=(-22, 0, 0), bleg=(14, 0, 0), fleg=(-14, 2, 0), root=(0, 4, 0, 1.04, 0.96)), 'snap'),
    k(18, P(arm=(48, 5, 2), torso=(10, 3, 1), head=(-4, 1, 0), cape=(-16, 0, 0), bleg=(12, 0, 0), fleg=(-12, 2, 0), root=(0, 4, 0)), 'linear'),
    k(28, REST, 'inout'),
])
# --- utilt: the flame swung up and over his head in an arc, body arching back
move('utilt', 26, [
    k(0, REST),
    k(4, P(arm=(35, 0, 2), torso=(6, 0, 1), head=(4, 0, 0), root=(0, 0, 0, 1.05, 0.93)), 'out'),
    k(7, P(arm=(-95, -2, -2), torso=(-8, 0, 0), head=(-10, 0, 0), cape=(16, 0, 0), root=(0, 0, -2, 0.96, 1.06)), 'snap'),
    k(10, P(arm=(-125, -3, -3), torso=(-12, -1, 0), head=(-14, 0, 0), cape=(20, 0, 0), root=(0, -1, -2, 0.96, 1.06)), 'out'),
    k(17, P(arm=(-118, -4, -3), torso=(-10, -1, 0), head=(-10, 0, 0), cape=(14, 0, 0), root=(0, -1, -1)), 'linear'),
    k(26, REST, 'inout'),
])
# --- dtilt: crouch and sweep the flame low along the floor
LOW = dict(root=(0, 2, 0, 1.06, 0.86), bleg=(18, 0, -1), fleg=(-22, 0, -1))
move('dtilt', 20, [
    k(0, REST),
    k(3, P(arm=(-30, -2, 0), torso=(14, 0, 2), head=(-6, 0, 0), cape=(-6, 0, 0), **LOW), 'out'),
    k(5, P(arm=(62, 6, 3), torso=(24, 3, 3), head=(-12, 0, 0), cape=(-20, 0, 0), root=(0, 4, 0, 1.08, 0.84), bleg=(22, 0, -1), fleg=(-28, 2, -1)), 'snap'),
    k(12, P(arm=(58, 5, 3), torso=(22, 3, 3), head=(-10, 0, 0), cape=(-14, 0, 0), root=(0, 4, 0, 1.08, 0.85), bleg=(20, 0, -1), fleg=(-26, 2, -1)), 'linear'),
    k(20, REST, 'inout'),
])

# ---- aerials: legs tucked
TUCK = dict(bleg=(-28, 1, -3), fleg=(-34, 1, -4))
AIRREST = P(**TUCK)
MID = (32, 36)                 # aerial flips turn around his middle
# --- nair: a full body flip, flame trailing a ring around him
move('nair', 26, [
    k(0, AIRREST),
    k(3, P(arm=(-20, 0, 0), root=(-20, 0, -4, 0.95, 0.95), cape=(14, 0, 0), **TUCK), 'out'),
    k(13, P(arm=(10, 2, 0), root=(340, 0, -4, 0.95, 0.95), cape=(-20, 0, 0), **TUCK), 'linear'),
    k(18, P(arm=(5, 1, 0), root=(360, 0, -2), cape=(-8, 0, 0), **TUCK), 'out'),
    k(26, P(root=(360, 0, 0), **TUCK), 'inout'),
], smear=('arm', 'flame', 'cape'), center=MID)
# --- fair: overhead flame chop to the front, body folding over it
move('fair', 28, [
    k(0, AIRREST),
    k(6, P(arm=(-120, -3, -2), torso=(-12, -1, 0), head=(-8, 0, 0), cape=(18, 0, 0), root=(-8, 0, 0), bleg=(-10, 0, -2), fleg=(-40, 1, -4)), 'out'),
    k(9, P(arm=(55, 5, 3), torso=(18, 3, 2), head=(6, 0, 0), cape=(-24, 0, 0), root=(14, 2, 0, 1.03, 0.97), bleg=(-40, 0, -4), fleg=(-20, 2, -3)), 'snap'),
    k(18, P(arm=(70, 4, 3), torso=(14, 2, 2), head=(4, 0, 0), cape=(-14, 0, 0), root=(10, 2, 0), **TUCK), 'linear'),
    k(28, AIRREST, 'inout'),
])
# --- bair: turns his back and lashes the cape and a backward kick behind him
move('bair', 26, [
    k(0, AIRREST),
    k(5, P(arm=(20, 0, 1), torso=(10, 1, 0), head=(6, 0, 0), cape=(20, 2, 0), root=(10, 2, 0), bleg=(-50, 0, -3), fleg=(-40, 0, -3)), 'out'),
    k(8, P(arm=(-20, -2, -1), torso=(-16, -2, 0), head=(-10, 0, 0), cape=(-70, -4, 2), root=(-18, -3, 0, 1.04, 0.96), bleg=(55, -4, -2), fleg=(30, -2, -2)), 'snap'),
    k(16, P(arm=(-15, -2, -1), torso=(-12, -2, 0), head=(-6, 0, 0), cape=(-55, -3, 2), root=(-12, -3, 0), bleg=(45, -3, -2), fleg=(20, -2, -2)), 'linear'),
    k(26, AIRREST, 'inout'),
], smear=('cape', 'bleg'))
# --- uair: flame flung straight up overhead in a fan
move('uair', 24, [
    k(0, AIRREST),
    k(4, P(arm=(40, 0, 2), torso=(8, 0, 1), head=(6, 0, 0), root=(0, 0, 2, 1.06, 0.92), **TUCK), 'out'),
    k(7, P(arm=(-100, -2, -3), torso=(-6, 0, -1), head=(-14, 0, 0), cape=(20, 0, 0), root=(-4, 0, -2, 0.94, 1.08), bleg=(10, 0, 0), fleg=(5, 0, 0)), 'snap'),
    k(10, P(arm=(-160, -4, -3), torso=(-10, -1, -1), head=(-16, 0, 0), cape=(22, 0, 0), root=(-6, 0, -2, 0.95, 1.06), bleg=(12, 0, 0), fleg=(6, 0, 0)), 'out'),
    k(16, P(arm=(-150, -3, -3), torso=(-8, -1, 0), head=(-10, 0, 0), cape=(14, 0, 0), root=(-4, 0, -1)), 'linear'),
    k(24, AIRREST, 'inout'),
])
# --- dair: curls up, then stomps both feet down with the flame thrust under him
move('dair', 32, [
    k(0, AIRREST),
    k(8, P(arm=(-60, -2, -2), torso=(-6, 0, -2), head=(6, 0, 0), cape=(18, 0, -2), root=(0, 0, -6, 1.05, 0.9), bleg=(-50, 0, -6), fleg=(-60, 0, -6)), 'out'),
    k(10, P(arm=(95, 0, 4), torso=(6, 0, 2), head=(-8, 0, 0), cape=(-10, 0, 2), root=(0, 0, 4, 0.94, 1.1), bleg=(6, 0, 4), fleg=(-4, 0, 4)), 'snap'),
    k(20, P(arm=(88, 0, 3), torso=(4, 0, 2), head=(-6, 0, 0), cape=(-14, 0, 1), root=(0, 0, 3, 0.96, 1.06), bleg=(4, 0, 3), fleg=(-4, 0, 3)), 'linear'),
    k(32, AIRREST, 'inout'),
])

# ---- smash attacks
# Soul Flare: draws the flame back behind him, swelling, then shoves it forward underhand with a lunge
move('fsmash', 44, [
    k(0, REST),
    k(10, P(arm=(150, -4, 2), torso=(-12, -2, 0), head=(6, 0, 0), cape=(16, 0, 0), bleg=(6, 0, 0), fleg=(-8, 0, 0), root=(0, -3, 0, 1.03, 0.97), flame=(0, 0, 0, 1.3, 1.3)), 'out'),
    k(15, P(arm=(156, -4, 2), torso=(-14, -2, 0), head=(8, 0, 0), cape=(20, 0, 0), bleg=(6, 0, 0), fleg=(-8, 0, 0), root=(0, -3, 0, 1.05, 0.95), flame=(0, 0, 0, 1.45, 1.45))),
    k(17, P(arm=(-8, 10, 1), torso=(18, 4, 1), head=(-8, 1, 0), cape=(-28, 0, 0), bleg=(20, 0, 0), fleg=(-18, 3, 0), root=(0, 7, 0, 1.06, 0.94), flame=(0, 0, 0, 1.7, 1.25)), 'snap'),
    k(26, P(arm=(-4, 9, 1), torso=(16, 4, 1), head=(-6, 1, 0), cape=(-20, 0, 0), bleg=(18, 0, 0), fleg=(-16, 3, 0), root=(0, 7, 0), flame=(0, 0, 0, 1.2, 1.1)), 'linear'),
    k(44, REST, 'inout'),
])
# Pyre: crouches low, then thrusts the flame straight up as it roars into a pillar
move('usmash', 42, [
    k(0, REST),
    k(9, P(arm=(40, 0, 2), torso=(10, 0, 2), head=(6, 0, 0), cape=(-6, 0, 0), root=(0, 0, 0, 1.1, 0.84), bleg=(16, -1, 0), fleg=(-18, 2, 0), flame=(0, 0, 0, 1.2, 1.2)), 'out'),
    k(14, P(arm=(-95, -2, -4), torso=(-6, 0, -1), head=(-14, 0, 0), cape=(22, 0, 0), root=(0, 0, -4, 0.9, 1.14), flame=(0, 0, 0, 1.7, 2.1)), 'snap'),
    k(21, P(arm=(-100, -2, -4), torso=(-8, 0, -1), head=(-12, 0, 0), cape=(16, 0, 0), root=(0, 0, -3, 0.94, 1.08), flame=(0, 0, 0, 1.8, 2.2)), 'linear'),
    k(42, REST, 'inout'),
])
# Grave Sweep: crouches and sweeps the flame low in front, then round behind him
move('dsmash', 42, [
    k(0, REST),
    k(8, P(arm=(-20, -2, 0), torso=(16, 0, 2), head=(-6, 0, 0), cape=(-8, 0, 0), root=(0, 0, 0, 1.08, 0.86), bleg=(18, -1, -1), fleg=(-22, 2, -1), flame=(0, 0, 0, 1.2, 1.2)), 'out'),
    k(11, P(arm=(70, 6, 5), torso=(24, 3, 3), head=(-10, 0, 0), cape=(-20, 0, 0), root=(0, 2, 0, 1.12, 0.82), bleg=(22, -1, -1), fleg=(-28, 2, -1), flame=(0, 0, 0, 1.3, 1.0)), 'snap'),
    k(15, P(arm=(160, -8, 5), torso=(-6, -2, 3), head=(4, 0, 0), cape=(24, 0, 0), root=(0, -2, 0, 1.12, 0.82), bleg=(22, -1, -1), fleg=(-28, 2, -1), flame=(0, 0, 0, 1.3, 1.0)), 'linear'),
    k(22, P(arm=(150, -7, 4), torso=(-4, -2, 3), head=(4, 0, 0), cape=(16, 0, 0), root=(0, -2, 0, 1.1, 0.85), bleg=(18, -1, -1), fleg=(-24, 2, -1)), 'out'),
    k(42, REST, 'inout'),
], smear=('arm', 'flame', 'cape'))

# ---- grab and throws
move('grab', 26, [
    k(0, REST),
    k(4, P(arm=(-15, -2, 0), torso=(-5, -1, 0), cape=(8, 0, 0)), 'out'),
    k(7, P(arm=(10, 9, 2), torso=(14, 3, 1), head=(-4, 1, 0), cape=(-18, 0, 0), bleg=(16, 0, 0), fleg=(-14, 2, 0), root=(0, 5, 0, 1.03, 0.97)), 'snap'),
    k(14, P(arm=(8, 8, 2), torso=(12, 3, 1), head=(-3, 1, 0), cape=(-14, 0, 0), bleg=(14, 0, 0), fleg=(-12, 2, 0), root=(0, 5, 0)), 'linear'),
    k(26, REST, 'inout'),
], smear=())
# holding: arm out, flame gripping them, a slight strain
move('holding', 24, [
    k(0, P(arm=(5, 6, 1), torso=(8, 2, 1), head=(-2, 0, 0), cape=(-8, 0, 0), fleg=(-8, 1, 0), root=(0, 2, 0))),
    k(12, P(arm=(9, 7, 1), torso=(10, 2, 1), head=(-4, 0, 0), cape=(-12, 0, 0), fleg=(-8, 1, 0), root=(0, 2, 0, 1.02, 0.98))),
    k(24, P(arm=(5, 6, 1), torso=(8, 2, 1), head=(-2, 0, 0), cape=(-8, 0, 0), fleg=(-8, 1, 0), root=(0, 2, 0))),
], smear=(), loop=True)
move('throw_forward', 18, [
    k(0, P(arm=(-60, -2, -1), torso=(-10, -1, 0), head=(4, 0, 0), cape=(14, 0, 0), root=(0, -2, 0))),
    k(5, P(arm=(30, 8, 2), torso=(16, 3, 1), head=(-6, 1, 0), cape=(-24, 0, 0), bleg=(16, 0, 0), fleg=(-14, 2, 0), root=(0, 5, 0, 1.04, 0.96)), 'snap'),
    k(18, REST, 'inout'),
])
move('throw_back', 18, [
    k(0, P(arm=(20, 4, 1), torso=(10, 1, 0), cape=(-10, 0, 0))),
    k(4, P(arm=(-170, -6, -2), torso=(-18, -3, 0), head=(-10, 0, 0), cape=(26, 0, 0), root=(-10, -4, 0, 1.03, 0.97), bleg=(10, 0, 0), fleg=(-6, 0, 0)), 'snap'),
    k(10, P(arm=(-185, -6, -2), torso=(-16, -3, 0), head=(-8, 0, 0), cape=(22, 0, 0), root=(-8, -4, 0)), 'linear'),
    k(18, REST, 'inout'),
])
move('throw_up', 18, [
    k(0, P(arm=(30, 2, 2), torso=(8, 0, 1), root=(0, 0, 0, 1.06, 0.9))),
    k(4, P(arm=(-120, -3, -3), torso=(-8, 0, -1), head=(-14, 0, 0), cape=(16, 0, 0), root=(0, 0, -3, 0.94, 1.1)), 'snap'),
    k(10, P(arm=(-115, -3, -3), torso=(-6, 0, -1), head=(-12, 0, 0), cape=(12, 0, 0), root=(0, 0, -2, 0.96, 1.06)), 'linear'),
    k(18, REST, 'inout'),
])
move('throw_down', 18, [
    k(0, P(arm=(-50, -2, -1), torso=(-6, 0, 0), root=(0, 0, -2, 0.96, 1.05))),
    k(4, P(arm=(80, 4, 4), torso=(22, 3, 3), head=(-8, 0, 0), cape=(-18, 0, 0), root=(0, 3, 0, 1.08, 0.86), bleg=(20, 0, -1), fleg=(-22, 2, -1)), 'snap'),
    k(10, P(arm=(76, 4, 4), torso=(20, 3, 3), head=(-6, 0, 0), cape=(-14, 0, 0), root=(0, 3, 0, 1.08, 0.87), bleg=(18, 0, -1), fleg=(-20, 2, -1)), 'linear'),
    k(18, REST, 'inout'),
])

# ---- specials
# fireball charge (loops): hand held out where the fireball gathers, flame swelling, his body coiled back
COIL = P(arm=(-18, -2, 0, 1, 1), torso=(-8, -1, 1), head=(4, 0, 0), cape=(12, 0, 0), bleg=(6, 0, 0), fleg=(-6, 0, 0), root=(0, -1, 0, 1.03, 0.97))
COIL2 = P(arm=(-24, -2, -1, 1, 1), torso=(-10, -1, 1), head=(6, 0, 0), cape=(16, 0, 0), bleg=(6, 0, 0), fleg=(-6, 0, 0), root=(0, -1, 0, 1.05, 0.95), flame=(0, 0, 0, 1.15, 1.15))
move('charge', 24, [k(0, COIL), k(12, COIL2), k(24, COIL)], loop=True, smear=())
# fireball release: push the flame forward with the whole body
move('fireball', 16, [
    k(0, COIL2),
    k(3, P(arm=(-5, 8, 1), torso=(14, 3, 1), head=(-6, 1, 0), cape=(-24, 0, 0), bleg=(16, 0, 0), fleg=(-14, 2, 0), root=(0, 5, 0, 1.05, 0.95), flame=(0, 0, 0, 0.7, 0.7)), 'snap'),
    k(8, P(arm=(0, 7, 1), torso=(12, 3, 1), head=(-4, 1, 0), cape=(-16, 0, 0), bleg=(14, 0, 0), fleg=(-12, 2, 0), root=(0, 4, 0), flame=(0, 0, 0, 0.8, 0.8)), 'linear'),
    k(16, REST, 'inout'),
])
# Soul Hex: draws a sigil with the flame (a circle in the air), then thrusts the curse forward
move('sideB', 34, [
    k(0, REST),
    k(4, P(arm=(-60, -2, -1), torso=(-6, 0, 0), head=(4, 0, 0), cape=(10, 0, 0)), 'out'),
    k(7, P(arm=(-130, -3, -2), torso=(-8, 0, 0), head=(-4, 0, 0), cape=(14, 0, 0)), 'linear'),
    k(9, P(arm=(10, 9, 1), torso=(14, 3, 1), head=(-6, 1, 0), cape=(-22, 0, 0), bleg=(16, 0, 0), fleg=(-14, 2, 0), root=(0, 5, 0, 1.04, 0.96), flame=(0, 0, 0, 1.25, 1.25)), 'snap'),
    k(20, P(arm=(6, 8, 1), torso=(12, 3, 1), head=(-4, 1, 0), cape=(-16, 0, 0), bleg=(14, 0, 0), fleg=(-12, 2, 0), root=(0, 5, 0), flame=(0, 0, 0, 1.1, 1.1)), 'linear'),
    k(34, REST, 'inout'),
])
# summon: raises the flame high, then plunges it down into the ground and the dead rise
move('summon', 40, [
    k(0, REST),
    k(10, P(arm=(-100, -3, -3), torso=(-8, 0, -1), head=(-14, 0, 0), cape=(18, 0, 0), root=(0, 0, -3, 0.95, 1.08), flame=(0, 0, 0, 1.2, 1.3)), 'out'),
    k(18, P(arm=(-110, -3, -4), torso=(-10, 0, -1), head=(-16, 0, 0), cape=(20, 0, 0), root=(0, 0, -4, 0.94, 1.1), flame=(0, 0, 0, 1.35, 1.45)), 'inout'),
    k(21, P(arm=(80, 4, 4), torso=(24, 3, 3), head=(-6, 0, 0), cape=(-20, 0, 0), root=(0, 3, 0, 1.08, 0.84), bleg=(20, 0, -1), fleg=(-24, 2, -1)), 'snap'),
    k(32, P(arm=(76, 4, 4), torso=(22, 3, 3), head=(-10, 0, 0), cape=(-12, 0, 0), root=(0, 3, 0, 1.08, 0.86), bleg=(18, 0, -1), fleg=(-22, 2, -1)), 'linear'),
    k(40, REST, 'inout'),
])
# Soulfire Jet: crouch, then streamline upward - arm pointing up, legs together, cape streaming
move('upb', 40, [
    k(0, P(root=(0, 0, 2, 1.1, 0.84), arm=(30, 0, 2), torso=(10, 0, 2), bleg=(14, 0, 0), fleg=(-18, 0, 0), cape=(-6, 0, 0))),
    k(6, P(root=(0, 0, -2, 0.88, 1.14), arm=(-95, -2, -3), torso=(-4, 0, -1), head=(-10, 0, 0), cape=(30, 0, 2), bleg=(8, 1, 0), fleg=(-8, -1, 0)), 'snap'),
    k(27, P(root=(0, 0, -2, 0.9, 1.12), arm=(-100, -2, -3), torso=(-4, 0, -1), head=(-12, 0, 0), cape=(36, 0, 2), bleg=(10, 1, 0), fleg=(-6, -1, 0)), 'linear'),
    k(31, P(root=(0, 0, -2, 1.05, 0.95), arm=(-150, -4, -3), torso=(-10, 0, -1), head=(-16, 0, 0), cape=(-10, 0, 0), **TUCK), 'snap'),
    k(40, AIRREST, 'inout'),
])
# Soulfire Beam (Limit): gathers the fire overhead, then braces and holds his palm out at the enemy
move('limit', 118, [
    k(0, REST),
    k(16, P(arm=(-105, -3, -3), torso=(-8, 0, -1), head=(-16, 0, 0), cape=(20, 0, 0), root=(0, 0, -2, 0.96, 1.06), flame=(0, 0, 0, 1.3, 1.4))),
    k(34, P(arm=(-112, -3, -4), torso=(-12, 0, -1), head=(-18, 0, 0), cape=(26, 0, 0), root=(0, 0, -3, 0.95, 1.08), flame=(0, 0, 0, 1.6, 1.7))),
    k(42, P(arm=(-4, 7, 1), torso=(10, 2, 1), head=(-4, 0, 0), cape=(-30, 0, 0), bleg=(18, -1, 0), fleg=(-18, 3, 0), root=(0, 3, 0, 1.06, 0.94), flame=(0, 0, 0, 0.9, 0.9)), 'snap'),
    k(102, P(arm=(-2, 7, 1), torso=(12, 2, 1), head=(-6, 0, 0), cape=(-36, 0, 0), bleg=(20, -1, 0), fleg=(-20, 3, 0), root=(0, 3, 0, 1.07, 0.93), flame=(0, 0, 0, 0.9, 0.9)), 'linear'),
    k(118, REST, 'inout'),
], step=4)

# ---- reactions
move('hitstun', 16, [
    k(0, P(root=(-14, -2, 0, 1.06, 0.94), torso=(-10, -1, 0), head=(-18, -1, 0), arm=(50, 0, 2), cape=(30, 0, 0), bleg=(20, 0, 0), fleg=(-20, 0, 0))),
    k(8, P(root=(-18, -3, 0, 1.03, 0.97), torso=(-12, -1, 0), head=(-22, -1, 0), arm=(70, 0, 2), cape=(40, 0, 0), bleg=(28, 0, 0), fleg=(-26, 0, 0))),
    k(16, P(root=(-14, -2, 0, 1.06, 0.94), torso=(-10, -1, 0), head=(-18, -1, 0), arm=(50, 0, 2), cape=(30, 0, 0), bleg=(20, 0, 0), fleg=(-20, 0, 0))),
], smear=(), loop=True)
move('shield', 24, [
    k(0, P(root=(0, 0, 0, 1.04, 0.94), torso=(6, 0, 1), head=(4, 0, 1), arm=(-75, -4, 2), cape=(-8, 0, 0), bleg=(8, 0, 0), fleg=(-8, 0, 0))),
    k(12, P(root=(0, 0, 0, 1.05, 0.93), torso=(7, 0, 1), head=(5, 0, 1), arm=(-78, -4, 2), cape=(-10, 0, 0), bleg=(8, 0, 0), fleg=(-8, 0, 0))),
    k(24, P(root=(0, 0, 0, 1.04, 0.94), torso=(6, 0, 1), head=(4, 0, 1), arm=(-75, -4, 2), cape=(-8, 0, 0), bleg=(8, 0, 0), fleg=(-8, 0, 0))),
], smear=(), loop=True)
move('grabbed', 16, [
    k(0, P(root=(-10, 0, -2), torso=(-8, 0, 0), head=(-12, 0, 0), arm=(60, 0, 2), bleg=(-10, 0, 0), fleg=(-18, 0, 0), cape=(20, 0, 0))),
    k(8, P(root=(-6, 0, -3), torso=(-4, 0, 0), head=(-8, 0, 0), arm=(80, 0, 2), bleg=(-18, 0, 0), fleg=(-8, 0, 0), cape=(24, 0, 0))),
    k(16, P(root=(-10, 0, -2), torso=(-8, 0, 0), head=(-12, 0, 0), arm=(60, 0, 2), bleg=(-10, 0, 0), fleg=(-18, 0, 0), cape=(20, 0, 0))),
], smear=(), loop=True)
move('ledge', 24, [
    k(0, P(arm=(-100, -2, -2), torso=(-4, 0, 0), head=(-8, 0, 0), bleg=(10, 0, 0), fleg=(-6, 0, 0), cape=(6, 0, 0), root=(0, 0, 0, 0.98, 1.04))),
    k(12, P(arm=(-98, -2, -2), torso=(-2, 0, 0), head=(-6, 0, 0), bleg=(16, 0, 0), fleg=(-2, 0, 0), cape=(10, 0, 0), root=(0, 0, 0, 0.98, 1.04))),
    k(24, P(arm=(-100, -2, -2), torso=(-4, 0, 0), head=(-8, 0, 0), bleg=(10, 0, 0), fleg=(-6, 0, 0), cape=(6, 0, 0), root=(0, 0, 0, 0.98, 1.04))),
], smear=(), loop=True)


def build():
    out, index = {}, {}
    for name, (ticks, keys, step, smear, loop, center) in MOVES.items():
        fr = animate(rig, keys, ticks, step=step, smear=smear, smear_tint=GHOST, center=center)
        out[name] = fr
    idx = save_atlas(out, OUT)
    for name, (ticks, keys, step, smear, loop, center) in MOVES.items():
        index[name] = idx[name] + [step] + ([1] if loop else [])
    with open(JS, 'w') as f:
        f.write('// Generated by tools/sprites/soul_summoner_moves.py - do not edit by hand.\n')
        f.write('// Soul Summoner move animations in moves_sheet.png (96x96 frames, feet at 48,91):\n')
        f.write('// move: [first frame, frame count, game ticks per frame, loops?]\n')
        f.write('export const SS_MOVES = ' + json.dumps(index).replace('],', '],\n  ').replace('{', '{\n  ').replace(']}', '],\n};') + '\n')
    return out

if __name__ == '__main__':
    out = build()
    if '--preview' in sys.argv:
        d = sys.argv[sys.argv.index('--preview') + 1]; os.makedirs(d, exist_ok=True)
        for name, fr in out.items(): contact(fr, os.path.join(d, 'ss_' + name + '.png'))
    print('frames:', sum(len(f) for f in out.values()))

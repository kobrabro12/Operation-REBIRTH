"""THE WANDERER's animations: his drawing (tools/sprites/wanderer_draw.py) on the same puppet rig and
joints as NU, so the body poses come from NU's library (tools/sprites/nu_moves.py) and his own moves
(the flashlight, the WET FLOOR sign, almond water, NOCLIP, the elevator, the wrong door) are keyed here.

What keeps him loose: the backpack and the flashlight lag behind every swing (drag), his breathing is a
little ragged (he's been walking these halls a long time), and he startles - recoveries overshoot.

  idle / run / jump / fall strips (64x64) and moves_sheet.png (112x104, 24 to a row, feet at 56,95)
  -> public/assets/fighters/wanderer/, frame index -> src/fighters/wnMoves.js

  python3 tools/sprites/wanderer_moves.py [--preview DIR]
"""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image
from puppet import contact
import wanderer_draw
import nu_moves as N
from nu_moves import k, legs, CROUCH, DEEP, TUCK, STANCE

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
DIR = os.path.join(ROOT, 'public/assets/fighters/wanderer')
JS = os.path.join(ROOT, 'src/fighters/wnMoves.js')
FOLLOW = {'head': (0.16, 0.15), 'pack': (0.35, 0.6), 'lamp': (0.3, 0.2), 'sign': (0.45, 0.3), 'bottle': (0.3, 0), 'ffist': (0.12, 0), 'bfore': (0.15, 0), 'ffore': (0.1, 0)}
SMALL, BIG = N.build_rig(wanderer_draw, FOLLOW)
N.GHOST = (255, 240, 150)           # pale fluorescent afterimages
PROPS = wanderer_draw.PROPS

def P(**kw):
    kw.setdefault('_hide', PROPS)
    return kw
def mix(a, **kw): return P(**{**a, **kw})
REST = P()
SIGN = ('bottle',)                  # _hide for poses with the sign out
BOTTLE = ('sign',)                  # ... and with the bottle out
AIR = P(**TUCK, fupper=(-50, 0, 0), ffore=(30, 0, 0), bupper=(-40, 0, 0), bfore=(-30, 0, 0))

def life(pose, t):
    """NU's breathing, a bit more ragged, and the backpack settling as he breathes."""
    p = N.life(pose, t)
    pk = N.full(p.get('pack'))
    pk[0] += 2 * math.sin(t * 0.09 + 1.2) + 1.2 * math.sin(t * 0.31)
    p['pack'] = tuple(pk)
    return p

MOVES = {}
def move(name, ticks, keys, step=1, smear=('ffore', 'lamp', 'ffist'), loop=False, center=None):
    MOVES[name] = (ticks, keys, step, smear, loop, center)

def borrow(name, as_name=None):
    """One of NU's moves on the Wanderer: same joints, with his props hidden and the mic swapped for the flashlight."""
    ticks, keys, step, smear, loop, center = N.MOVES[name]
    keys = [(t, {**pose, '_hide': PROPS}, e) for (t, pose, e) in keys]
    MOVES[as_name or name] = (ticks, keys, step, tuple('lamp' if x == 'mic' else x for x in smear if x != 'can'), loop, center)

for name in ('dtilt', 'dashAttack', 'grab', 'holding', 'throw_forward', 'throw_back', 'throw_up', 'throw_down',
             'hitstun', 'shield', 'grabbed', 'ledge', 'nair', 'fair', 'bair', 'usmash', 'dsmash', 'uair', 'dair'):
    borrow(name)

# ======================================================================= idle / run
def idle_keys():
    # standing still, uneasy: a slow look forward, a glance back over his shoulder, the light dipping
    LOOK = P(head=(-6, 0, 0), fupper=(-12, 0, 0), ffore=(-6, 0, 0), torso=(2, 0, 0))
    GLANCE = P(head=(14, -1, 0), torso=(-5, -1, 0), fupper=(10, 0, 0), ffore=(10, 0, 0), bupper=(6, 0, 0), root=(0, 0, 0, 1.01, 0.99))
    return [k(0, REST), k(40, LOOK, 'inout'), k(80, LOOK, 'linear'), k(96, GLANCE, 'out'), k(130, GLANCE, 'linear'), k(150, mix(REST, head=(-2, 0, 0)), 'back'), k(192, REST)]

def run_keys():
    # a hurried, hunched jog: the light held out front, the pack bouncing
    A = P(torso=(16, 1, 1), head=(-10, 0, 0), bupper=(50, 0, 0), bfore=(-40, 0, 0), fupper=(-60, 0, 0), ffore=(30, 0, 0), root=(0, 0, 2, 1.04, 0.96), **legs(40, 30, -48, 18, 0, -12))
    B = P(torso=(18, 1, 0), head=(-12, 0, 0), bupper=(20, 0, 0), bfore=(-30, 0, 0), fupper=(-56, 0, 0), ffore=(26, 0, 0), root=(0, 0, -1, 0.97, 1.04), **legs(-4, 70, -8, 14, -16, 0))
    C = P(torso=(16, 1, 1), head=(-10, 0, 0), bupper=(-50, 0, 0), bfore=(-60, 0, 0), fupper=(-52, 0, 0), ffore=(22, 0, 0), root=(0, 0, 2, 1.04, 0.96), **legs(-24, 34, 22, 56, -8, 0))
    D = P(torso=(18, 1, 0), head=(-12, 0, 0), bupper=(-20, 0, 0), bfore=(-40, 0, 0), fupper=(-58, 0, 0), ffore=(28, 0, 0), root=(0, 0, -1, 0.97, 1.04), **legs(-8, 14, -4, 70, 0, -16))
    return [k(0, A), k(12, B, 'out'), k(24, C, 'in'), k(36, D, 'out'), k(48, A, 'in')]

JUMP = P(fupper=(-70, 0, 0), ffore=(30, 0, 0), bupper=(-60, 0, 0), bfore=(-40, 0, 0), head=(-10, 0, 0), torso=(-4, 0, 0), **TUCK)
JUMP2 = P(fupper=(-80, 0, -1), ffore=(36, 0, 0), bupper=(-70, 0, -1), bfore=(-40, 0, 0), head=(-12, 0, 0), torso=(-6, 0, 0), **legs(-28, 86, -54, 88, -20, -20))
FALL = P(fupper=(-120, 0, 0), ffore=(26, 0, 0), bupper=(-130, 0, 0), bfore=(16, 0, 0), head=(8, 0, 0), torso=(4, 0, 0), **legs(20, 14, -14, 26, 0, -8))
FALL2 = P(fupper=(-132, 0, 0), ffore=(34, 0, 0), bupper=(-140, 0, 0), bfore=(22, 0, 0), head=(6, 0, 0), torso=(3, 0, 0), **legs(26, 18, -20, 30, 0, -8))

# ======================================================================= ground attacks
# jab: FLASHLIGHT BONK - two quick bonks with the torch, then clicks it on full in their face
BONK = P(torso=(12, 2, 0), head=(-6, 1, 0), fupper=(-60, 0, 0), ffore=(70, 0, 0), lamp=(30, 0, 0), bupper=(10, 0, 0), root=(0, 3, 0, 1.04, 0.96), **STANCE)
RAISE = P(torso=(-4, -1, 0), head=(4, 0, 0), fupper=(-120, 0, 0), ffore=(-20, 0, 0), lamp=(-20, 0, 0), root=(0, -1, 0, 0.98, 1.02))
THRUST = P(torso=(18, 4, 1), head=(-12, 2, 0), fupper=(-88, 0, 0), ffore=(84, 0, 0), bupper=(30, 0, 0), bfore=(-30, 0, 0), root=(0, 4, 0, 1.06, 0.95), **STANCE)
move('jab', 28, [k(0, REST), k(2, RAISE, 'out'), k(4, BONK, 'snap'), k(7, RAISE, 'out'), k(9, BONK, 'snap'), k(12, mix(RAISE, fupper=(-40, 0, 0), ffore=(-40, 0, 0)), 'out'),
                 k(15, THRUST, 'snap'), k(19, mix(THRUST, torso=(16, 4, 1)), 'linear'), k(28, REST, 'back')])
# ftilt: WET FLOOR SIGN - swings the yellow caution sign round from behind him
SW_BACK = P(_hide=SIGN, bupper=(70, 0, 0), bfore=(-20, 0, 0), sign=(10, 0, 0), torso=(-12, -2, 0), head=(8, 0, 0), fupper=(-20, 0, 0), root=(0, -3, 0, 0.97, 1.03), **legs(10, -4, -6, 4))
SW_HIT = P(_hide=SIGN, bupper=(-84, 0, 0), bfore=(0, 0, 0), sign=(-4, 0, 0), torso=(18, 3, 0), head=(-10, 1, 0), fupper=(20, 0, 0), ffore=(10, 0, 0), root=(0, 4, 0, 1.05, 0.95), **STANCE)
move('ftilt', 32, [k(0, P(_hide=SIGN)), k(8, SW_BACK, 'out'), k(11, SW_HIT, 'snap'), k(15, mix(SW_HIT, bupper=(-104, 0, 0), sign=(-12, 0, 0), _hide=SIGN), 'out'),
                   k(22, mix(SW_HIT, bupper=(-98, 0, 0), _hide=SIGN), 'inout'), k(32, P(_hide=SIGN), 'back')], smear=('bfore', 'sign'))
# utilt: CEILING CHECK - sweeps the torch beam overhead, front to back
move('utilt', 26, [
    k(0, REST),
    k(4, P(fupper=(-80, 0, 0), ffore=(-10, 0, 0), head=(-8, 0, 0), torso=(4, 0, 0), root=(0, 0, 0, 1.03, 0.97), **legs(6, 0, -6, 0)), 'out'),
    k(9, P(fupper=(-160, 0, -1), ffore=(-20, 0, 0), head=(-26, 0, -1), torso=(-6, 0, -1), bupper=(20, 0, 0), root=(0, 0, -2, 0.95, 1.07)), 'snap'),
    k(15, P(fupper=(-215, 0, -1), ffore=(-20, 0, 0), head=(-30, -1, -1), torso=(-12, -1, -1), bupper=(30, 0, 0), root=(0, -1, -2, 0.96, 1.05)), 'linear'),
    k(26, REST, 'back'),
])
# fsmash: WET FLOOR - the sign heaved overhead and slammed down in front of him
SL_UP = P(_hide=SIGN, bupper=(-190, -1, 0), bfore=(-30, 0, 0), sign=(10, 0, 0), fupper=(-150, 0, 0), ffore=(-20, 0, 0), torso=(-18, -2, -1), head=(-14, 0, 0), root=(0, -4, -2, 0.96, 1.06), **legs(14, -8, -10, 6))
SL_HIT = P(_hide=SIGN, bupper=(-70, 3, 2), bfore=(-20, 0, 0), sign=(-10, 0, 0), fupper=(-50, 0, 0), ffore=(20, 0, 0), torso=(32, 4, 4), head=(6, 2, 2), root=(0, 6, 1, 1.07, 0.92), **legs(24, -30, -24, 32, 6, -8))
move('fsmash', 48, [k(0, P(_hide=SIGN)), k(10, SL_UP, 'out'), k(16, mix(SL_UP, bupper=(-200, -1, 0), root=(0, -5, -2, 0.95, 1.08), _hide=SIGN), 'inout'),
                    k(19, SL_HIT, 'snap'), k(24, mix(SL_HIT, bupper=(-60, 3, 2), root=(0, 7, 1, 1.08, 0.91), _hide=SIGN), 'out'),
                    k(34, mix(SL_HIT, torso=(28, 4, 4), _hide=SIGN), 'inout'), k(48, P(_hide=SIGN), 'back')], smear=('bfore', 'sign'))

# ======================================================================= specials
# neutral special: ALMOND WATER - an underhand lob of a bottle; it smashes where it lands into a puddle
move('neutralB', 30, [
    k(0, P(_hide=BOTTLE)),
    k(8, P(_hide=BOTTLE, bupper=(50, 0, 0), bfore=(-30, 0, 0), torso=(-8, -1, 0), head=(6, 0, 0), root=(0, -2, 0, 0.98, 1.03), **legs(8, -4, -6, 4)), 'out'),
    k(12, P(_hide=BOTTLE, bupper=(-130, 0, -1), bfore=(-20, 0, 0), torso=(14, 3, 0), head=(-12, 1, 0), root=(0, 3, -1, 1.04, 0.97), **STANCE), 'snap'),
    k(14, P(bupper=(-150, 0, -1), bfore=(-10, 0, 0), torso=(14, 3, 0), head=(-14, 1, 0), root=(0, 3, -1, 1.03, 0.98), **STANCE), 'out'),
    k(30, REST, 'back'),
], smear=('bfore', 'bottle'))
# side special: NOCLIP - crouches, dives into the air in front of him as if it were a doorway... and is gone,
# then stumbles out the far side
DIVE = P(torso=(70, 6, 4), head=(14, 0, 0), fupper=(-150, 0, 0), ffore=(10, 0, 0), bupper=(-160, 0, 0), bfore=(10, 0, 0), root=(0, 2, -3, 1.0, 1.0), **legs(-40, 30, -50, 40, 0, 0))
OUT = P(torso=(-10, -2, 0), head=(-16, 0, 0), fupper=(-100, 0, 0), ffore=(30, 0, 0), bupper=(-60, 0, 0), bfore=(-40, 0, 0), root=(0, 0, -2, 0.92, 1.1), **legs(18, -10, -16, 14, 0, -6))
move('sideB', 40, [k(0, REST), k(5, P(**DEEP, torso=(16, 0, 2), fupper=(40, 0, 0), bupper=(40, 0, 0), head=(10, 0, 0)), 'out'), k(8, DIVE, 'snap'),
                   k(20, mix(DIVE, torso=(76, 6, 4)), 'linear'), k(24, OUT, 'snap'), k(30, mix(OUT, root=(0, 0, 0, 1.04, 0.96)), 'out'), k(40, REST, 'back')], smear=())
# up special: ELEVATOR - braces, then stands stiff and still as the car carries him up, looking at the ceiling
STAND = P(torso=(-2, 0, -1), head=(-20, 0, -1), fupper=(4, 0, 0), ffore=(-4, 0, 0), bupper=(-4, 0, 0), root=(0, 0, 0, 0.98, 1.03), **legs(4, 0, -4, 0))
move('upb', 40, [k(0, P(**CROUCH, fupper=(20, 0, 0), bupper=(20, 0, 0))), k(8, STAND, 'snap'), k(30, mix(STAND, head=(-26, 0, -1)), 'linear'), k(40, FALL, 'inout')], smear=())
# down special: WRONG DOOR - sets a door frame down behind him and pats it into place
PLACE = P(torso=(-30, -2, 2), head=(-10, 0, 0), bupper=(70, -2, 2), bfore=(-40, 0, 0), fupper=(10, 0, 0), ffore=(10, 0, 0), root=(0, -2, 2, 1.06, 0.92), **legs(10, -20, -20, 30, 0, -6))
move('downB', 30, [k(0, REST), k(6, mix(PLACE, torso=(-20, -1, 1)), 'out'), k(12, PLACE, 'snap'), k(18, mix(PLACE, bupper=(50, -2, 2)), 'inout'), k(30, REST, 'back')], smear=())
# ... and stepping through it: a few hurried steps forward, light first
move('doorwalk', 28, [k(0, REST), k(6, P(torso=(16, 2, 0), head=(-8, 0, 0), fupper=(-60, 0, 0), ffore=(30, 0, 0), bupper=(30, 0, 0), root=(0, 2, 0), **legs(30, 20, -40, 20, 0, -8)), 'out'),
                      k(14, P(torso=(16, 2, 0), head=(-8, 0, 0), fupper=(-60, 0, 0), ffore=(30, 0, 0), bupper=(-30, 0, 0), root=(0, 2, 0), **legs(-20, 30, 22, 50, -8, 0)), 'inout'),
                      k(22, mix(REST, head=(8, 0, 0), torso=(-4, 0, 0)), 'out'), k(28, REST, 'back')], smear=())
# LEVEL 0 (Limit): holds the torch up... it flickers... and he clicks it off
move('limit', 160, [
    k(0, REST),
    k(16, P(fupper=(-120, 0, -1), ffore=(-10, 0, 0), head=(-14, 0, 0), torso=(-4, 0, 0), root=(0, 0, -1, 0.98, 1.03))),
    k(40, P(fupper=(-124, 0, -1), ffore=(-14, 0, 0), head=(-18, 0, 0), torso=(-6, 0, 0), root=(0, 0, -1, 0.97, 1.04))),
    k(48, P(fupper=(-90, 0, 0), ffore=(60, 0, 0), lamp=(20, 0, 0), head=(6, 1, 1), torso=(10, 1, 1), bupper=(-20, 0, 0), bfore=(-60, 0, 0), root=(0, 1, 0, 1.03, 0.97)), 'snap'),
    k(140, P(fupper=(-84, 0, 0), ffore=(64, 0, 0), lamp=(20, 0, 0), head=(10, 1, 1), torso=(12, 1, 1), bupper=(-20, 0, 0), bfore=(-60, 0, 0), root=(0, 1, 0, 1.02, 0.98)), 'linear'),
    k(160, REST, 'back'),
], step=4, smear=())
# ---- taunt: LOST - shines the torch one way, then the other, then a helpless shrug
LOOKUP = P(fupper=(-150, 0, -1), ffore=(-10, 0, 0), head=(-20, 0, 0), torso=(-6, 0, 0), root=(0, 0, -1, 0.98, 1.02))
LOOKBACK = P(fupper=(-200, -1, -1), ffore=(-20, 0, 0), head=(16, -1, 0), torso=(-14, -2, 0), root=(0, -2, 0, 0.99, 1.01), **legs(6, 0, -8, 4))
SHRUG = P(bupper=(-30, 0, -2), bfore=(-80, 0, 0), fupper=(-20, 0, -2), ffore=(-70, 0, 0), head=(14, 0, 1), torso=(2, 0, -1), root=(0, 0, -2, 0.96, 1.05))
move('taunt', 96, [k(0, REST), k(12, LOOKUP, 'out'), k(26, mix(LOOKUP, fupper=(-110, 0, 0)), 'inout'), k(42, LOOKBACK, 'inout'), k(56, mix(LOOKBACK, fupper=(-220, -1, -1)), 'inout'),
                   k(66, SHRUG, 'back'), k(80, mix(SHRUG, head=(18, 0, 1)), 'inout'), k(96, REST, 'back')], smear=())


def build():
    base, out = N.build_all(SMALL, BIG, MOVES, DIR, JS, 'WN_MOVES', 'wanderer_moves.py', life_fn=life, idle=idle_keys, run=run_keys, jumps=((JUMP, JUMP2), (FALL, FALL2)))
    # select-screen icon: the hood and mask
    Image.fromarray(base['idle'][0]).crop((22, 4, 50, 19)).resize((72, 38), Image.NEAREST).save(os.path.join(DIR, 'icon.png'))
    return base, out

if __name__ == '__main__':
    base, out = build()
    if '--preview' in sys.argv:
        d = sys.argv[sys.argv.index('--preview') + 1]; os.makedirs(d, exist_ok=True)
        for name, fr in {**base, **out}.items(): contact(fr, os.path.join(d, 'wn_' + name + '.png'))
    print('frames:', sum(len(f) for f in out.values()))

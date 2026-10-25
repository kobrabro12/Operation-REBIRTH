"""DEAD AIR: its animations, from its part-by-part drawing (tools/sprites/dead_air_draw.py) on NU's rig and joints.

It moves wrong on purpose: an idle that's far too still (a slow head tilt, then a sudden snap), a run that's a
stiff forward-leaning glide with the arms hanging back, and a twitch under everything. Its normal attacks are
NU's swings (borrowed, on this body); its specials, Limit and taunt are its own.

  idle / run / jump / fall strips (64x64) and moves_sheet.png (112x104, 24 to a row, feet at 56,95) in
  public/assets/fighters/dead-air/; frame index -> src/fighters/daMoves.js

  python3 tools/sprites/dead_air_moves.py [--preview DIR]
"""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
from puppet import contact
import dead_air_draw as D
import nu_moves as N
from nu_moves import k, legs, CROUCH, DEEP, TUCK, STANCE

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
DIR = os.path.join(ROOT, 'public/assets/fighters/dead-air')
JS = os.path.join(ROOT, 'src/fighters/daMoves.js')
FOLLOW = {'head': (0.25, 0.2), 'hair': (0.1, 0.1), 'ffore': (0.2, 0.1), 'ffist': (0.3, 0.1), 'bfore': (0.2, 0)}
SMALL, BIG = N.build_rig(D, FOLLOW)
N.GHOST = (200, 210, 230)            # pale grey afterimages, like a smeared tape

def P(**kw): return kw
def mix(a, **kw): return {**a, **kw}
REST = P()
AIR = P(**TUCK, fupper=(-30, 0, 0), ffore=(-20, 0, 0), bupper=(-30, 0, 0), bfore=(-20, 0, 0))

def life(pose, t):
    """Barely breathing - and every so often the head ticks sideways, like a skipped frame."""
    p = dict(pose)
    hd = N.full(p.get('head'))
    if (t // 6) % 11 == 0: hd[0] += 9 * (1 if (t // 66) % 2 else -1)
    hd[0] += 1.2 * math.sin(t * 0.05)
    p['head'] = tuple(hd)
    ff = N.full(p.get('ffist')); ff[0] += 6 * math.sin(t * 0.7) if (t // 20) % 5 == 0 else 0; p['ffist'] = tuple(ff)   # finger twitch
    return p

MOVES = {}
def move(name, ticks, keys, step=1, smear=('ffore', 'ffist'), loop=False, center=None):
    MOVES[name] = (ticks, keys, step, smear, loop, center)

PARTS = set(D.ORDER)
def borrow(name):
    ticks, keys, step, smear, loop, center = N.MOVES[name]
    keys = [(t, {kk: vv for kk, vv in pose.items() if kk in PARTS or kk == 'root'}, e) for (t, pose, e) in keys]
    MOVES[name] = (ticks, keys, step, tuple(x for x in smear if x in PARTS), loop, center)
for name in ('jab', 'ftilt', 'utilt', 'dtilt', 'dashAttack', 'fsmash', 'usmash', 'dsmash', 'nair', 'fair', 'bair', 'uair', 'dair',
             'grab', 'holding', 'throw_forward', 'throw_back', 'throw_up', 'throw_down', 'hitstun', 'shield', 'grabbed', 'ledge'):
    borrow(name)

# ======================================================================= idle / run / jump / fall
def idle_keys():
    """Standing far too still: the head tilts slowly over... then snaps upright. Twice per loop."""
    keys = []
    for b in range(2):
        t0 = b * 96
        s = 1 if b == 0 else -1
        keys += [k(t0, P(head=(0, 0, 0), bupper=(4, 0, 0), fupper=(10, 0, 0), ffore=(60, 0, 0)), 'inout'),
                 k(t0 + 60, P(head=(22 * s, 0, 1), torso=(-2, 0, 0), bupper=(4, 0, 0), fupper=(10, 0, 0), ffore=(62, 0, 0)), 'inout'),
                 k(t0 + 64, P(head=(-6 * s, 0, 0), torso=(1, 0, 0), bupper=(4, 0, 0), fupper=(12, 0, 0), ffore=(58, 0, 0)), 'snap'),
                 k(t0 + 96, P(head=(0, 0, 0), bupper=(4, 0, 0), fupper=(10, 0, 0), ffore=(60, 0, 0)), 'inout')]
    return keys

def run_keys():
    """A stiff, gliding lean: small fast steps, the body pitched forward, both arms hanging back."""
    A = P(torso=(30, 2, 1), head=(-26, 0, 0), bupper=(70, 0, 0), bfore=(10, 0, 0), fupper=(60, 0, 0), ffore=(20, 0, 0), root=(0, 0, 1), **legs(30, 20, -30, 24, 0, -8))
    B = P(torso=(30, 2, 0), head=(-24, 0, 0), bupper=(66, 0, 0), bfore=(12, 0, 0), fupper=(56, 0, 0), ffore=(22, 0, 0), root=(0, 0, 0), **legs(-6, 30, -4, 14, -8, 0))
    C = P(torso=(30, 2, 1), head=(-26, 0, 0), bupper=(70, 0, 0), bfore=(10, 0, 0), fupper=(60, 0, 0), ffore=(20, 0, 0), root=(0, 0, 1), **legs(-26, 26, 26, 30, -8, 0))
    D2 = P(torso=(30, 2, 0), head=(-24, 0, 0), bupper=(66, 0, 0), bfore=(12, 0, 0), fupper=(56, 0, 0), ffore=(22, 0, 0), root=(0, 0, 0), **legs(-4, 14, -6, 30, 0, -8))
    return [k(0, A), k(12, B, 'linear'), k(24, C, 'linear'), k(36, D2, 'linear'), k(48, A, 'linear')]

JUMP = P(fupper=(-40, 0, 0), ffore=(20, 0, 0), bupper=(-30, 0, 0), bfore=(-20, 0, 0), head=(-8, 0, 0), **TUCK)
JUMP2 = P(fupper=(-50, 0, -1), ffore=(24, 0, 0), bupper=(-40, 0, -1), bfore=(-20, 0, 0), head=(-10, 0, 0), **legs(-28, 86, -54, 88, -20, -20))
FALL = P(fupper=(-150, 0, 0), ffore=(10, 0, 0), bupper=(-160, 0, 0), bfore=(10, 0, 0), head=(14, 0, 0), **legs(10, 6, -6, 12, 0, -4))
FALL2 = P(fupper=(-156, 0, 0), ffore=(14, 0, 0), bupper=(-166, 0, 0), bfore=(14, 0, 0), head=(18, 0, 0), **legs(12, 8, -8, 14, 0, -4))

# ======================================================================= specials
# EMERGENCY ALERT: raises one long hand, palm out, holds it while the alert goes out
PALM = P(torso=(6, 1, 0), head=(-10, 0, 0), fupper=(-60, 0, 0), ffore=(105, 0, 0), ffist=(-50, 0, 0), bupper=(10, 0, 0), root=(0, 1, 0), **STANCE)
move('neutralB', 32, [k(0, REST), k(8, P(torso=(-8, -1, 0), head=(14, 0, 0), fupper=(-30, 0, 0), ffore=(-90, 0, 0)), 'out'),
                      k(12, PALM, 'snap'), k(26, mix(PALM, head=(-14, 0, 0)), 'linear'), k(32, REST, 'back')], smear=())
# REWIND: thrown backwards like a tape being reversed - limbs flung forward, body pitched back
REW = P(torso=(-30, -3, 0), head=(26, 0, 0), fupper=(-20, 0, 0), ffore=(30, 0, 0), bupper=(-40, 0, 0), bfore=(20, 0, 0), root=(0, -3, 0, 1.06, 0.96), **legs(-20, 30, 20, 20))
move('sideB', 30, [k(0, REST), k(4, REW, 'snap'), k(22, mix(REW, head=(34, 0, 0), torso=(-34, -3, 0)), 'linear'), k(30, REST, 'back')], smear=())
# SIGNAL LOST: folds down, arms over its head, and goes out like a switched-off set (the game hides it)
FOLD = P(torso=(30, 0, 3), head=(30, 0, 2), fupper=(-150, 0, 0), ffore=(-40, 0, 0), bupper=(-150, 0, 0), bfore=(-40, 0, 0), **DEEP)
move('upb', 36, [k(0, REST), k(8, FOLD, 'out'), k(14, P(torso=(-6, 0, -2), head=(-20, 0, 0), fupper=(-175, 0, 0), bupper=(-175, 0, 0), root=(0, 0, -4, 0.9, 1.15)), 'snap'),
                 k(28, P(torso=(-4, 0, -1), head=(-14, 0, 0), fupper=(-165, 0, 0), bupper=(-165, 0, 0)), 'linear'), k(36, FALL, 'inout')], smear=())
# DO NOT ANSWER: bends right down and sets something on the floor, very carefully
SET = P(torso=(46, 3, 7), head=(10, 1, 2), fupper=(-20, 4, 4), ffore=(10, 0, 0), bupper=(-10, 0, 0), root=(0, 0, 0, 1.08, 0.86), **legs(56, -76, -22, 40, 18, -18))
move('downB', 30, [k(0, REST), k(9, SET, 'inout'), k(16, mix(SET, ffist=(30, 0, 0)), 'inout'), k(30, REST, 'inout')], smear=())
# LOOK AWAY (Limit): spreads its arms slowly, wider and wider, head tipped back... then lurches forward, face first
WIDE = P(fupper=(-60, 0, 0), ffore=(120, 0, 0), bupper=(74, 0, 0), bfore=(38, 0, 0), head=(-30, 0, -1), torso=(-6, 0, -1), root=(0, 0, -3, 0.95, 1.08))
LURCH = P(fupper=(-40, 0, 0), ffore=(-10, 0, 0), bupper=(-30, 0, 0), bfore=(-10, 0, 0), head=(-8, 3, 1), torso=(34, 6, 2), root=(0, 6, 0, 1.06, 0.95), **STANCE)
move('limit', 160, [k(0, REST), k(40, mix(WIDE, fupper=(-20, 0, 0), ffore=(80, 0, 0), bupper=(40, 0, 0), bfore=(20, 0, 0), head=(-10, 0, 0)), 'inout'), k(110, WIDE, 'inout'),
                    k(118, mix(WIDE, head=(-40, 0, -1)), 'inout'), k(124, LURCH, 'snap'), k(150, mix(LURCH, head=(-12, 3, 1)), 'linear'), k(160, REST, 'back')],
     step=2, smear=())
# TAUNT: its head turns all the way round, slowly... and snaps back
move('taunt', 84, [k(0, REST), k(50, P(head=(360, 0, 0), fupper=(10, 0, 0), ffore=(60, 0, 0)), 'linear'), k(54, P(head=(350, 0, 0)), 'snap'),
                   k(70, P(head=(360, 0, 0)), 'inout'), k(84, REST, 'inout')], smear=())

def build():
    return N.build_all(SMALL, BIG, MOVES, DIR, JS, 'DA_MOVES', 'dead_air_moves.py', life_fn=life, idle=idle_keys, run=run_keys, jumps=((JUMP, JUMP2), (FALL, FALL2)))

if __name__ == '__main__':
    base, out = build()
    if '--preview' in sys.argv:
        d = sys.argv[sys.argv.index('--preview') + 1]; os.makedirs(d, exist_ok=True)
        for name, fr in {**base, **out}.items(): contact(fr, os.path.join(d, 'da_' + name + '.png'))
    print('frames:', sum(len(f) for f in out.values()))

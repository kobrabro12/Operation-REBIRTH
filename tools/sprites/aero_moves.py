"""AERO's animations: his drawing (tools/sprites/aero_draw.py) on the same puppet rig and joints as NU,
so the body poses come from NU's library (tools/sprites/nu_moves.py) and AERO's own moves are keyed here.

What keeps him loose: the goldfish keeps swimming round the bowl and sloshes when he turns (drag), the
leaf scarf streams behind every lunge and jump (sway) and flutters on its own, and he floats - every
idle, landing and recovery has a little bob and overshoot, like he's underwater.

  idle / run / jump / fall strips (64x64) and moves_sheet.png (112x104, 24 to a row, feet at 56,95)
  -> public/assets/fighters/aero/, frame index -> src/fighters/aeroMoves.js

  python3 tools/sprites/aero_moves.py [--preview DIR]
"""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
from puppet import contact
import aero_draw
import nu_moves as N
from nu_moves import P, k, mix, legs, CROUCH, DEEP, TUCK, STANCE, AIR, REST

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
DIR = os.path.join(ROOT, 'public/assets/fighters/aero')
JS = os.path.join(ROOT, 'src/fighters/aeroMoves.js')
FOLLOW = {'head': (0.15, 0.15), 'fish': (0.6, 0.8), 'scarf': (0.75, 1.6), 'ffist': (0.12, 0), 'bfore': (0.15, 0), 'ffore': (0.12, 0)}
SMALL, BIG = N.build_rig(aero_draw, FOLLOW)
N.GHOST = (159, 240, 255)           # bright aqua afterimages

def life(pose, t):
    """NU's breathing, plus the goldfish swimming and turning round and the scarf fluttering."""
    p = N.life(pose, t)
    sw = math.sin(t * 0.11)
    if 'fish' not in p:
        turn = math.cos(t * 0.045)
        p['fish'] = (4 * sw, 3 * math.sin(t * 0.07), math.sin(t * 0.05), max(-1, min(1, turn * 3)), 1)
    sc = N.full(p.get('scarf'))
    sc[0] += 10 * math.sin(t * 0.21) + 4 * math.sin(t * 0.53)
    p['scarf'] = tuple(sc)
    return p

MOVES = {}
def move(name, ticks, keys, step=1, smear=('ffore', 'ffist'), loop=False, center=None):
    MOVES[name] = (ticks, keys, step, smear, loop, center)

# borrowed straight from NU's library (the same joints), minus his mic and spray can
for name in ('dtilt', 'grab', 'holding', 'throw_forward', 'throw_back', 'throw_up', 'throw_down', 'hitstun', 'shield', 'grabbed', 'ledge', 'nair', 'bair', 'usmash', 'dsmash', 'dair'):
    ticks, keys, step, smear, loop, center = N.MOVES[name]
    MOVES[name] = (ticks, keys, step, tuple(x for x in smear if x not in ('mic', 'can')), loop, center)

# jab: BUBBLE POP - a quick palm that pops a bubble in their face
PALM = P(torso=(16, 3, 0), head=(-8, 1, 0), fupper=(-86, 0, 0), ffore=(82, 0, 0), bupper=(20, 0, 0), bfore=(-30, 0, 0), root=(0, 4, 0, 1.06, 0.95), **STANCE)
move('jab', 20, [k(0, REST), k(3, P(torso=(-6, -1, 0), head=(6, 0, 0), fupper=(-10, 0, 0), ffore=(-50, 0, 0), root=(0, -1, 0, 0.98, 1.02)), 'out'),
                 k(5, PALM, 'snap'), k(9, mix(PALM, torso=(13, 3, 0), ffore=(76, 0, 0)), 'out'), k(20, REST, 'back')])
# ftilt: AURORA SWOOSH - winds the arm right round behind him, then sweeps a wide ribbon of light
move('ftilt', 28, [
    k(0, REST),
    k(7, P(fupper=(-200, -1, 0), ffore=(-30, 0, 0), torso=(-16, -2, 0), head=(10, 0, 0), bupper=(40, 0, 0), bfore=(-20, 0, 0), root=(0, -3, 0, 0.97, 1.03), **legs(10, -4, -6, 4)), 'out'),
    k(10, P(fupper=(-90, 0, 0), ffore=(30, 0, 0), torso=(16, 3, 0), head=(-10, 1, 0), bupper=(-30, 0, 0), root=(0, 4, 0, 1.05, 0.95), **STANCE), 'snap'),
    k(14, P(fupper=(10, 0, 0), ffore=(40, 0, 0), torso=(20, 3, 0), head=(-8, 1, 0), bupper=(-40, 0, 0), root=(0, 4, 0, 1.03, 0.97), **STANCE), 'out'),
    k(28, REST, 'back'),
])
# utilt: FOUNTAIN - both hands thrown up, water spouting overhead
UP2 = P(fupper=(-172, 0, -2), ffore=(-10, 0, 0), bupper=(-164, 0, -2), bfore=(10, 0, 0), head=(-20, 0, 0), torso=(-8, 0, -1), root=(0, 0, -4, 0.9, 1.14))
move('utilt', 24, [k(0, REST), k(5, P(**DEEP, torso=(16, 0, 1), head=(10, 0, 0), fupper=(30, 0, 0), bupper=(30, 0, 0)), 'out'), k(7, UP2, 'snap'),
                   k(12, mix(UP2, root=(0, 0, -2, 0.96, 1.05)), 'out'), k(24, REST, 'back')], smear=())
# dash attack: SLIP N' SLIDE - throws himself flat on his belly and slides along a sheet of water, arms out in front
SLIDE = P(torso=(84, 8, 6), head=(30, 0, 0), fupper=(-150, 0, 0), ffore=(-10, 0, 0), bupper=(-160, 0, 0), bfore=(-10, 0, 0), root=(0, 0, 10, 1.0, 1.0), **legs(-80, 20, -86, 30, 20, 20))
move('dashAttack', 36, [k(0, P(torso=(20, 2, 0), **legs(30, 20, -30, 30))), k(4, mix(SLIDE, root=(0, 0, 4)), "snap"),
                        k(8, SLIDE, 'out'), k(22, mix(SLIDE, torso=(80, 8, 6), head=(36, 0, 0)), 'linear'),
                        k(28, P(**DEEP, torso=(20, 2, 2)), 'out'), k(36, REST, 'back')], smear=())
# fsmash: LENS FLARE - draws both hands to the chest, then thrusts them out into a blinding flare
FLARE = P(torso=(20, 4, 0), head=(-10, 1, 0), fupper=(-88, 0, 0), ffore=(84, 0, 0), bupper=(-82, 0, 0), bfore=(74, 0, 0), root=(0, 6, 0, 1.08, 0.93), **legs(24, -6, -26, 16, 0, -10))
move('fsmash', 46, [
    k(0, REST),
    k(12, P(torso=(-16, -3, 0), head=(10, 0, 0), fupper=(14, -1, 0), ffore=(-124, 0, 0), bupper=(24, 0, 0), bfore=(-114, 0, 0), root=(0, -4, 0, 0.96, 1.05), **legs(10, -4, -6, 4)), 'out'),
    k(16, P(torso=(-20, -3, 0), head=(12, 0, 0), fupper=(18, -1, 0), ffore=(-128, 0, 0), bupper=(28, 0, 0), bfore=(-118, 0, 0), root=(0, -5, 0, 0.95, 1.06), **legs(12, -4, -6, 4))),
    k(18, FLARE, 'snap'), k(22, mix(FLARE, torso=(24, 5, 0), root=(0, 7, 0, 1.06, 0.95)), 'out'), k(30, mix(FLARE, torso=(16, 4, 0)), 'inout'), k(46, REST, 'back'),
], smear=())
# fair: a falling raindrop chop - arm right up behind the head, then down through the target
move('fair', 26, [
    k(0, AIR), k(6, P(**TUCK, fupper=(-200, 0, -1), ffore=(-20, 0, 0), bupper=(20, 0, 0), torso=(-12, 0, 0), head=(8, 0, 0), root=(-10, 0, 0)), 'out'),
    k(9, P(**TUCK, fupper=(-10, 0, 0), ffore=(30, 0, 0), bupper=(-60, 0, 0), torso=(20, 3, 0), head=(-8, 0, 0), root=(14, 2, 0, 1.05, 0.96)), 'snap'),
    k(14, P(**TUCK, fupper=(10, 0, 0), ffore=(30, 0, 0), bupper=(-60, 0, 0), torso=(16, 2, 0), root=(10, 2, 0)), 'out'), k(26, AIR, 'back'),
])
# up air: BUBBLE STREAM - hands cupped over his head, blowing a column of bubbles straight up (several hits)
BLOW = P(**legs(-20, 50, -30, 50), torso=(-10, 0, -2), head=(-26, 0, -1), fupper=(-165, 0, -2), ffore=(-30, 0, 0), bupper=(-155, 0, -2), bfore=(-30, 0, 0), root=(0, 0, -3, 0.94, 1.08))
move('uair', 30, [k(0, AIR), k(4, P(**TUCK, torso=(14, 0, 1), head=(16, 0, 1), fupper=(10, 0, 0), bupper=(10, 0, 0), root=(0, 0, 2, 1.05, 0.94)), 'out'), k(6, BLOW, 'snap')]
     + [k(6 + 3 * i, mix(BLOW, head=(-26 - 6 * (i % 2), 0, -1), root=(0, 0, -3, 0.94 + 0.03 * (i % 2), 1.08 - 0.03 * (i % 2))), 'inout') for i in range(1, 6)]
     + [k(30, AIR, 'back')], smear=())
# ---- specials
# BUBBLE TRAP: cups his hands to the bowl, then blows a big bubble forward
move('neutralB', 30, [
    k(0, REST),
    k(8, P(torso=(-8, -1, 0), head=(8, 0, 0), fupper=(-60, 0, 0), ffore=(-100, 0, 0), bupper=(-80, 0, 0), bfore=(-90, 0, 0), root=(0, -2, 0, 0.97, 1.04)), 'out'),
    k(12, P(torso=(14, 3, 0), head=(-8, 1, 0), fupper=(-92, 0, 0), ffore=(74, 0, 0), bupper=(-72, 0, 0), bfore=(54, 0, 0), root=(0, 3, 0, 1.06, 0.94), **STANCE), 'snap'),
    k(22, P(torso=(10, 2, 0), head=(-4, 1, 0), fupper=(-86, 0, 0), ffore=(66, 0, 0), bupper=(-66, 0, 0), bfore=(46, 0, 0), root=(0, 2, 0), **STANCE), 'inout'),
    k(30, REST, 'back'),
], smear=())
# GLASS WINDOW: swipes a pane of glossy glass into being in front of him
move('sideB', 32, [
    k(0, REST),
    k(6, P(fupper=(-150, 0, 0), ffore=(-40, 0, 0), torso=(-10, -1, 0), head=(6, 0, 0), bupper=(30, 0, 0), root=(0, -2, 0, 0.98, 1.02)), 'out'),
    k(10, P(fupper=(-70, 0, 0), ffore=(64, 0, 0), torso=(14, 3, 0), head=(-8, 1, 0), bupper=(-20, 0, 0), root=(0, 3, 0, 1.05, 0.95), **STANCE), 'snap'),
    k(20, P(fupper=(-74, 0, 0), ffore=(64, 0, 0), torso=(10, 2, 0), head=(-4, 1, 0), root=(0, 2, 0), **STANCE), 'inout'),
    k(32, REST, 'back'),
], smear=())
# BUBBLE RIDE: curled up inside a big bubble, bobbing upward
BALL = P(**legs(-50, 100, -70, 100, -10, -10), torso=(16, 0, 2), head=(10, 0, 2), fupper=(-30, 0, 0), ffore=(-110, 0, 0), bupper=(-20, 0, 0), bfore=(-100, 0, 0))
move('upb', 40, [k(0, P(**DEEP)), k(6, BALL, 'snap')] + [k(6 + 6 * i, mix(BALL, root=((-6, 6)[i % 2], 0, -2, 1.03 - 0.05 * (i % 2), 0.97 + 0.05 * (i % 2)))) for i in range(1, 5)]
     + [k(32, P(**N.FALL, root=(0, 0, 0, 1.08, 0.94)), 'snap'), k(40, P(**N.FALL), 'back')], smear=())
# LEAF SPRING: kneels and plants a seed in the ground
PLANT = P(torso=(34, 3, 5), head=(12, 1, 2), bupper=(-10, 2, 3), fupper=(-30, 3, 4), ffore=(40, 0, 0), root=(0, 0, 0, 1.12, 0.82), **legs(54, -74, -22, 38, 18, -18))
move('downB', 32, [k(0, REST), k(8, mix(PLANT, fupper=(-90, 3, 4), torso=(26, 3, 4)), 'out'), k(12, PLANT, 'snap'), k(20, mix(PLANT, torso=(30, 3, 5)), 'inout'), k(32, REST, 'back')], smear=())
# SCREENSAVER (Limit): spreads his arms wide... and the whole world goes glossy
SPREAD = P(fupper=(-120, 0, -2), ffore=(10, 0, 0), bupper=(-120, 0, -2), bfore=(10, 0, 0), head=(-14, 0, 0), torso=(-6, 0, -1), root=(0, 0, -3, 0.95, 1.08))
move('limit', 120, [k(0, REST), k(20, SPREAD), k(40, mix(SPREAD, fupper=(-150, 0, -2), bupper=(-150, 0, -2))), k(46, UP2, 'snap'), k(100, mix(UP2, head=(-18, 0, 0)), 'linear'), k(120, REST, 'back')], step=4, smear=())

def idle_keys():
    keys = []
    for b in range(4):                                                   # a slow float, like treading water
        t0 = b * 48
        keys += [k(t0, P(root=(0, 0, 0))),
                 k(t0 + 24, P(root=(0, 0, -2, 0.98, 1.03), fupper=(-14, 0, 0), ffore=(-10, 0, 0), bupper=(-12, 0, 0), bfore=(-10, 0, 0), head=(-5, 0, 0), torso=(-2, 0, 0), **legs(-3, 4, 3, 4)), 'inout')]
    keys.append(k(192, P()))
    return keys

def build():
    return N.build_all(SMALL, BIG, MOVES, DIR, JS, 'AERO_MOVES', 'aero_moves.py', life_fn=life, idle=idle_keys)

if __name__ == '__main__':
    base, out = build()
    if '--preview' in sys.argv:
        d = sys.argv[sys.argv.index('--preview') + 1]; os.makedirs(d, exist_ok=True)
        for name, fr in {**base, **out}.items(): contact(fr, os.path.join(d, 'aero_' + name + '.png'))
    print('frames:', sum(len(f) for f in out.values()))

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
# GOLDFISH FLING: tips his head back, then flicks it forward - the goldfish leaps out of the bowl
# (the fish is hidden from the bowl once it's thrown)
NOFISH = ('can', 'fish')
move('sideB', 30, [
    k(0, REST),
    k(6, P(torso=(-14, -2, 0), head=(-22, 0, -1), fupper=(-10, 0, 0), ffore=(-40, 0, 0), bupper=(30, 0, 0), root=(0, -3, 0, 0.97, 1.04), **legs(10, -4, -6, 4)), 'out'),
    k(9, P(_hide=NOFISH, torso=(22, 4, 1), head=(28, 2, 2), fupper=(30, 0, 0), ffore=(-20, 0, 0), bupper=(40, 0, 0), root=(0, 5, 0, 1.07, 0.93), **STANCE), 'snap'),
    k(16, P(_hide=NOFISH, torso=(18, 3, 1), head=(20, 2, 1), fupper=(20, 0, 0), bupper=(30, 0, 0), root=(0, 4, 0), **STANCE), 'out'),
    k(30, P(_hide=NOFISH), 'back'),
], smear=())
# RAIN CLOUD: cups his hands low, then tosses a cloud up ahead of him (again: DOWNPOUR, the same toss)
TOSS = P(torso=(-8, 1, -1), head=(-20, 0, 0), fupper=(-80, 0, -1), ffore=(90, 0, 0), bupper=(-60, 0, -1), bfore=(40, 0, 0), root=(0, 2, -3, 0.92, 1.1), **legs(10, -4, -8, 6))
move('downB', 28, [k(0, REST), k(7, P(**DEEP, torso=(18, 1, 2), head=(8, 0, 1), fupper=(30, 0, 0), ffore=(-60, 0, 0), bupper=(30, 0, 0)), 'out'),
                   k(10, TOSS, 'snap'), k(18, mix(TOSS, root=(0, 2, -2, 0.95, 1.06)), 'out'), k(28, REST, 'back')], smear=())
# SCREENSAVER (Limit): spreads his arms wide... and the whole world goes glossy
SPREAD = P(fupper=(-120, 0, -2), ffore=(10, 0, 0), bupper=(-120, 0, -2), bfore=(10, 0, 0), head=(-14, 0, 0), torso=(-6, 0, -1), root=(0, 0, -3, 0.95, 1.08))
move('limit', 120, [k(0, REST), k(20, SPREAD), k(40, mix(SPREAD, fupper=(-150, 0, -2), bupper=(-150, 0, -2))), k(46, UP2, 'snap'), k(100, mix(UP2, head=(-18, 0, 0)), 'linear'), k(120, REST, 'back')], step=4, smear=())

# taunt: FISHBOWL BOOGIE - a bubbly side-to-side dance, a twirl (the goldfish does a flip) and a big V
SWAY_L = P(root=(-7, -1, 0, 1.02, 0.98), torso=(-8, 0, 0), head=(-6, 0, 0), fupper=(-80, 0, -1), ffore=(90, 0, 0), bupper=(-60, 0, 0), bfore=(-50, 0, 0), **legs(14, -10, -16, 22, 0, -6))
SWAY_R = P(root=(7, 1, 0, 1.02, 0.98), torso=(8, 0, 0), head=(8, 0, 0), fupper=(-10, 0, 0), ffore=(30, 0, 0), bupper=(-20, 0, 0), bfore=(-70, 0, 0), **legs(-4, 8, 4, 10, -6, 0))
VEE = P(fupper=(-105, 0, -2), ffore=(45, 0, 0), bupper=(-100, 0, -2), bfore=(40, 0, 0), head=(-18, 0, 0), torso=(-6, 0, -1), root=(0, 0, -3, 0.92, 1.1), **legs(6, 0, -6, 0))
move('taunt', 90, [k(0, REST)]
     + [k(6 + 10 * b, SWAY_L if b % 2 == 0 else SWAY_R, 'back') for b in range(4)]
     + [k(44, P(**DEEP, torso=(10, 0, 1), fupper=(20, 0, 0), bupper=(20, 0, 0)), 'out'),
        k(49, P(root=(0, 0, -4, 0.05, 1.12), fupper=(-90, 0, 0), bupper=(-90, 0, 0), fish=(180, 0, -2)), 'in'),
        k(54, P(root=(0, 0, -4, -1, 1.1), fupper=(-110, 0, 0), bupper=(-110, 0, 0), fish=(360, 0, -3)), 'linear'),
        k(58, P(root=(0, 0, -2, 0.05, 1.06), fish=(540, 0, -1)), 'linear'),
        k(62, VEE, 'out'), k(80, mix(VEE, head=(-22, 0, 0), root=(0, 0, -3, 0.94, 1.08)), 'inout'), k(90, REST, 'back')],
     smear=())

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

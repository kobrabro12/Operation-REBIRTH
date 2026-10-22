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
    if name.startswith('k_'):                     # spear moves: turn the forearm the short way between keys
        prev = None
        for i, (t, pose, ease) in enumerate(keys):
            f = N.full(pose.get('ffore'))
            if prev is not None: f[0] = prev + ((f[0] - prev + 180) % 360 - 180)
            prev = f[0]; keys[i] = (t, dict(pose, ffore=tuple(f)), ease)
        for i, (t, pose, ease) in enumerate(keys):   # and keep the spear's point inside the 112x104 frame (nudging him back)
            M = _AIM.matrix('spear', pose); tx, ty, _ = M @ [44 + _UX * 27, 26 + _UY * 27, 1]
            dx = min(0, 108 - tx) + max(0, 4 - tx); dy = max(0, 3 - ty) + min(0, 101 - ty)
            if dx or dy:
                r = N.full(pose.get('root')); r[1] += dx; r[2] += dy
                keys[i] = (t, dict(pose, root=tuple(r)), ease)
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
# ---- FULL AERO's GOLDEN SPEAR attacks (k_*: the game uses these instead of his normal attacks while he's
# FULL AERO). The spear lies along his forearm (aero_king_draw.py), so each pose is aimed: aimed() turns the
# forearm until the spear points at the angle given (0 = forward, -90 = straight up, 90 = down, 180 = back).
import aero_king_draw as _K
_AIM = N.build_rig(_K, FOLLOW)[1]
_UX, _UY = 2 / math.hypot(2, 5), -5 / math.hypot(2, 5)
def _spear_angle(pose):
    M = _AIM.matrix('spear', pose)
    a = M @ [44, 26, 1]; b = M @ [44 + _UX * 20, 26 + _UY * 20, 1]
    return math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))
def _wrap(d): return (d + 180) % 360 - 180
def aimed(pose, deg):
    p = dict(pose)
    for _ in range(4):
        f = N.full(p.get('ffore')); now = _spear_angle(p)
        f2 = list(f); f2[0] += 1; p2 = dict(p, ffore=tuple(f2)); d = _wrap(_spear_angle(p2) - now) or 1
        f[0] += _wrap(deg - now) / d; p['ffore'] = tuple(f)
    f = N.full(p['ffore']); f[0] = _wrap(f[0]); p['ffore'] = tuple(f)        # (so neighbouring keys don't spin the long way round)
    return p
LUNGE = dict(torso=(22, 4, 0), head=(-12, 1, 0), bupper=(30, 0, 0), bfore=(-40, 0, 0), root=(0, 6, 0, 1.06, 0.94), **legs(26, -8, -30, 18, 0, -10))
DRAW = dict(torso=(-14, -3, 0), head=(8, 0, 0), bupper=(-30, 0, 0), bfore=(-60, 0, 0), root=(0, -4, 0, 0.97, 1.04), **legs(10, -4, -8, 6))
# jab: a quick spear jab - draws back, snaps it straight out
move('k_jab', 20, [k(0, aimed(REST, -60)), k(3, aimed(P(**DRAW, fupper=(10, 0, 0)), -10), 'out'),
                   k(5, aimed(P(**LUNGE, fupper=(-80, 0, 0)), 0), 'snap'), k(9, aimed(P(**LUNGE, fupper=(-76, 0, 0)), 2), 'out'), k(20, aimed(REST, -60), 'back')], smear=('spear', 'ffist'))
# ftilt: a stepping thrust, the whole body behind it
move('k_ftilt', 28, [k(0, aimed(REST, -60)), k(8, aimed(P(**DRAW, fupper=(30, -2, 0)), -5), 'out'),
                     k(11, aimed(P(**LUNGE, fupper=(-82, 0, 0)), 0), 'snap'), k(16, aimed(P(**LUNGE, fupper=(-80, 0, 0)), 3), 'out'), k(28, aimed(REST, -60), 'back')], smear=('spear', 'ffist'))
# dtilt: down on one knee, a low thrust along the floor
LOW = dict(torso=(30, 4, 2), head=(-16, 1, 0), bupper=(20, 0, 0), root=(0, 8, 8, 1.1, 0.82), **legs(50, -70, -40, 60, 14, -14))
move('k_dtilt', 22, [k(0, aimed(REST, -60)), k(4, aimed(P(**LOW, fupper=(20, 0, 0)), 20), 'out'), k(6, aimed(P(**LOW, fupper=(-50, 0, 0)), 14), 'snap'),
                     k(10, aimed(P(**LOW, fupper=(-48, 0, 0)), 16), 'out'), k(22, aimed(REST, -60), 'back')], smear=('spear', 'ffist'))
# dash attack: a charging lance, leaning right into it
CHARGE = dict(torso=(40, 6, 2), head=(-24, 2, 0), bupper=(40, 0, 0), bfore=(-40, 0, 0), root=(0, 6, 2, 1.06, 0.92), **legs(40, -20, -40, 30, 0, -10))
move('k_dashAttack', 36, [k(0, aimed(P(torso=(20, 2, 0), fupper=(20, 0, 0)), -20)), k(4, aimed(P(**CHARGE, fupper=(-70, 0, 0)), 4), 'snap'),
                          k(22, aimed(P(**CHARGE, fupper=(-66, 0, 0)), 6), 'linear'), k(28, aimed(P(**DEEP, torso=(16, 2, 2), fupper=(-20, 0, 0)), -30), 'out'), k(36, aimed(REST, -60), 'back')], smear=())
# fsmash: winds the spear all the way back over his shoulder... then a huge lunging thrust
WIND = dict(torso=(-22, -4, 0), head=(12, 0, 0), bupper=(-60, 0, 0), bfore=(-40, 0, 0), root=(-6, -5, 0, 0.95, 1.06), **legs(14, -6, -4, 4))
BIGLUNGE = dict(torso=(20, 5, 0), head=(-14, 1, 0), bupper=(50, 0, 0), bfore=(-30, 0, 0), root=(-4, 8, 0, 1.1, 0.9), **legs(34, -10, -40, 24, 0, -12))
move('k_fsmash', 46, [k(0, aimed(REST, -60)), k(12, aimed(P(**WIND, fupper=(70, -2, 0)), -170), 'out'), k(16, aimed(P(**WIND, fupper=(76, -2, 0)), -172)),
                      k(18, aimed(P(**BIGLUNGE, fupper=(-80, 0, 0)), 0), 'snap'), k(23, aimed(P(**BIGLUNGE, fupper=(-78, 0, 0)), 2), 'out'),
                      k(32, aimed(P(**LUNGE, fupper=(-60, 0, 0)), -10), 'inout'), k(46, aimed(REST, -60), 'back')], smear=('spear', 'ffist'))
# utilt: a thrust straight up overhead
UPT = dict(torso=(-6, 0, -1), head=(-18, 0, 0), bupper=(-30, 0, 0), root=(0, 0, -4, 0.92, 1.12), **legs(4, 0, -4, 0))
move('k_utilt', 24, [k(0, aimed(REST, -60)), k(5, aimed(P(**DEEP, torso=(14, 0, 1), fupper=(20, 0, 0)), -80), 'out'),
                     k(7, aimed(P(**UPT, fupper=(-168, 0, -2)), -90), 'snap'), k(12, aimed(P(**UPT, fupper=(-166, 0, -2)), -92), 'out'), k(24, aimed(REST, -60), 'back')], smear=())
# usmash: crouches deep, then springs up driving the spear into the sky
move('k_usmash', 44, [k(0, aimed(REST, -60)), k(12, aimed(P(**DEEP, torso=(24, 0, 2), head=(16, 0, 1), fupper=(30, 0, 0)), -70), 'out'),
                      k(15, aimed(P(**{**UPT, 'root': (0, 0, -10, 0.88, 1.16)}, fupper=(-170, 0, -3)), -90), 'snap'), k(20, aimed(P(**{**UPT, 'root': (0, 0, -8, 0.9, 1.14)}, fupper=(-170, 0, -3)), -90), 'out'),
                      k(30, aimed(P(**UPT, fupper=(-150, 0, -1)), -80), 'inout'), k(44, aimed(REST, -60), 'back')], smear=())
# dsmash: stabs low in front, then spins and stabs low behind
move('k_dsmash', 44, [k(0, aimed(REST, -60)), k(12, aimed(P(**DEEP, torso=(10, 0, 2), fupper=(10, 0, 0)), -40), 'out'),
                      k(15, aimed(P(**LOW, fupper=(-40, 0, 0)), 18), 'snap'), k(17, aimed(P(**{**LOW, 'torso': (-10, 0, 2)}, fupper=(60, 0, 0)), 165), 'snap'),
                      k(22, aimed(P(**{**LOW, 'torso': (-12, 0, 2)}, fupper=(62, 0, 0)), 162), 'out'), k(44, aimed(REST, -60), 'back')], smear=())
# nair: twirls the spear right round in front of him
TW = dict(**TUCK, torso=(6, 0, 0), head=(-4, 0, 0), fupper=(-70, 0, 0))
move('k_nair', 26, [k(0, aimed(AIR, -60))] + [k(3 + 2 * i, aimed(P(**TW), -60 + i * 60), 'linear') for i in range(1, 7)] + [k(26, aimed(AIR, -60), 'back')], smear=('spear',))
# fair: an aerial thrust
move('k_fair', 26, [k(0, aimed(AIR, -60)), k(6, aimed(P(**TUCK, torso=(-10, 0, 0), fupper=(20, 0, 0)), -20), 'out'),
                    k(9, aimed(P(**TUCK, torso=(18, 2, 0), fupper=(-80, 0, 0)), 4), 'snap'), k(14, aimed(P(**TUCK, torso=(16, 2, 0), fupper=(-78, 0, 0)), 6), 'out'), k(26, aimed(AIR, -60), 'back')], smear=('spear', 'ffist'))
# bair: stabs straight back behind him without looking
move('k_bair', 24, [k(0, aimed(AIR, -60)), k(5, aimed(P(**TUCK, torso=(10, 0, 0), fupper=(10, 0, 0)), -120), 'out'),
                    k(7, aimed(P(**TUCK, torso=(-14, 0, 0), head=(16, 0, 0), fupper=(80, 0, 0)), 178), 'snap'), k(11, aimed(P(**TUCK, torso=(-12, 0, 0), fupper=(78, 0, 0)), 176), 'out'), k(24, aimed(AIR, -60), 'back')], smear=('spear', 'ffist'))
# uair: rapid stabs straight up
move('k_uair', 30, [k(0, aimed(AIR, -60)), k(5, aimed(P(**TUCK, fupper=(-120, 0, 0)), -80), 'out')]
     + [k(7 + 3 * i, aimed(P(**TUCK, torso=(-6, 0, -1), head=(-14, 0, 0), fupper=(-168 + 14 * (i % 2), 0, -2 + (i % 2))), -90), 'snap') for i in range(5)]
     + [k(30, aimed(AIR, -60), 'back')], smear=())
# dair: drives the spear straight down beneath him
DOWNS = dict(**legs(-20, 40, -30, 40), torso=(6, 0, 0), head=(14, 0, 0), bupper=(-60, 0, 0))
move('k_dair', 34, [k(0, aimed(AIR, -60)), k(8, aimed(P(**DOWNS, fupper=(-60, 0, -2)), -60), 'out'),
                    k(11, aimed(P(**DOWNS, fupper=(30, 0, 2)), 90), 'snap'), k(16, aimed(P(**DOWNS, fupper=(32, 0, 2)), 90), 'out'), k(34, aimed(AIR, -60), 'back')], smear=())

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
# BUBBLE RIDE: curled up inside a big bubble, bobbing upward; it pops at tick 30
BALL = P(**legs(-50, 100, -70, 100, -10, -10), torso=(16, 0, 2), head=(10, 0, 2), fupper=(-30, 0, 0), ffore=(-110, 0, 0), bupper=(-20, 0, 0), bfore=(-100, 0, 0))
def bubble_ride(pop, total):
    bob = [k(6 + 6 * i, mix(BALL, root=((-6, 6)[i % 2], 0, -2, 1.03 - 0.05 * (i % 2), 0.97 + 0.05 * (i % 2)))) for i in range(1, (pop - 6) // 6 + 1)]
    return [k(0, P(**DEEP)), k(6, BALL, 'snap')] + bob + [k(pop + 2, P(**N.FALL, root=(0, 0, 0, 1.08, 0.94)), 'snap'), k(total, P(**N.FALL), 'back')]
move('upb', 40, bubble_ride(30, 40), smear=())
move('upb_king', 56, bubble_ride(46, 56), smear=())      # FULL AERO: a much longer ride
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
    N.GHOST = (159, 240, 255)
    return N.build_all(SMALL, BIG, MOVES, DIR, JS, 'AERO_MOVES', 'aero_moves.py', life_fn=life, idle=idle_keys)

# ---- FULL AERO: the transformed look (tools/sprites/aero_king_draw.py) - the same animations on his
# winged, haloed, caped form, with the wings beating slowly and the halo bobbing. Same frame layout as
# the normal sheet, so src/fighters/aeroMoves.js indexes both.
import aero_king_draw
KFOLLOW = dict(FOLLOW, wings=(0.35, 0.8), halo=(0.3, 0.2))
KSMALL, KBIG = N.build_rig(aero_king_draw, KFOLLOW)
def king_life(pose, t):
    p = life(pose, t)
    w = N.full(p.get('wings')); w[0] += 9 * math.sin(t * 0.15); p['wings'] = tuple(w)
    h = N.full(p.get('halo')); h[2] += math.sin(t * 0.1) * 0.8; p['halo'] = tuple(h)
    return p
def build_king():
    N.GHOST = (243, 195, 88)        # golden afterimages
    return N.build_all(KSMALL, KBIG, MOVES, os.path.join(DIR, 'king'), os.devnull, 'AERO_MOVES', 'aero_moves.py', life_fn=king_life, idle=idle_keys)

if __name__ == '__main__':
    base, out = build()
    kbase, kout = build_king()
    if '--preview' in sys.argv:
        d = sys.argv[sys.argv.index('--preview') + 1]; os.makedirs(d, exist_ok=True)
        for name, fr in {**base, **out}.items(): contact(fr, os.path.join(d, 'aero_' + name + '.png'))
    print('frames:', sum(len(f) for f in out.values()))

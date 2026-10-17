"""NU's animations, from his part-by-part drawing (tools/sprites/nu_draw.py) with the puppet rig.

  idle_sheet.png   32 frames, 64x64: nodding to a beat only he can hear, mic bouncing
  run_sheet.png     8 frames, 64x64: a loose, swaggering run, arms pumping
  jump_sheet.png    4 frames, 64x64: knees tucked     fall_sheet.png  4 frames: legs hanging, arms up
  moves_sheet.png   every attack, special, grab, throw and reaction, 112x104 frames, feet at (56, 95)
src/fighters/nuMoves.js gets the frame index for the moves sheet.

  python3 tools/sprites/nu_moves.py [--preview DIR]
"""
import os, sys, json
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from puppet import Part, Rig, animate, save_atlas, contact
import nu_draw

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
DIR = os.path.join(ROOT, 'public/assets/fighters/nu')
JS = os.path.join(ROOT, 'src/fighters/nuMoves.js')
FEET = (32, 58)

LAYERS = nu_draw.draw_parts()
BASE = nu_draw.composite(LAYERS, hide=())
parts = []
for z, name in enumerate(nu_draw.ORDER):
    pivot, parent = nu_draw.RIG[name]
    parts.append(Part(name, LAYERS[name][..., 3] > 0, pivot, parent, z=z, variants=[LAYERS[name]]))

def rig(canvas, off): return Rig(BASE, parts, canvas, off, FEET)
SMALL = rig((64, 64), (0, 0))
BIG = rig((112, 104), (24, 36))
MID = (32, 34)
GHOST = (155, 227, 42)          # acid green afterimages (skins recolour it with the rest)

def P(**kw):
    kw.setdefault('_hide', ('can',))
    return kw
def k(t, pose, ease='inout'): return (t, pose, ease)
REST = P()

# ---- building blocks
def legs(bt=0, bs=0, ft=0, fs=0, bshoe=0, fshoe=0):
    return dict(bthigh=(bt, 0, 0), bshin=(bs, 0, 0), fthigh=(ft, 0, 0), fshin=(fs, 0, 0), bshoe=(bshoe, 0, 0), fshoe=(fshoe, 0, 0))
CROUCH = dict(root=(0, 0, 0, 1.06, 0.88), **legs(18, -24, -18, 26, 6, -8))
TUCK = legs(-30, 70, -55, 70, -20, -20)
MICUP = dict(fupper=(-30, 0, 0), ffore=(0, 0, 0))                      # mic at his mouth (rest)
MICOUT = dict(fupper=(-75, 0, 0), ffore=(60, 0, 0), mic=(30, 0, 0))     # arm straight out, mic pointed forward

# ======================================================================= idle / run / jump / fall
def idle_keys():
    keys = []
    for b in range(4):                                                   # four nods
        t0 = b * 48
        keys += [k(t0, P(head=(0, 0, 0), torso=(0, 0, 0), fupper=(0, 0, 0), bupper=(0, 0, 0), hair=(0, 0, 0))),
                 k(t0 + 10, P(head=(10, 1, 1), hair=(-4, 0, 0), torso=(3, 0, 1), fupper=(4, 0, 1), ffore=(-6, 0, 0), bupper=(4, 0, 1), root=(0, 0, 0, 1.02, 0.98)), 'out'),
                 k(t0 + 24, P(head=(-2, 0, 0), hair=(2, 0, 0), torso=(-1, 0, 0), fupper=(-2, 0, 0), bupper=(-2, 0, 0)), 'inout')]
    keys.append(k(192, P()))
    return keys

def run_keys():
    A = P(torso=(10, 1, 1), head=(-6, 0, 0), bupper=(40, 0, 0), bfore=(-30, 0, 0), fupper=(-50, 0, 0), ffore=(30, 0, 0),
          root=(0, 0, 1, 1.02, 0.98), **legs(36, 30, -40, 20, 0, -10))
    B = P(torso=(12, 1, -1), head=(-8, 0, 0), bupper=(0, 0, 0), bfore=(-10, 0, 0), fupper=(-20, 0, 0), ffore=(10, 0, 0),
          root=(0, 0, -2, 0.98, 1.03), **legs(0, 60, -5, 10, -10, 0))
    C = P(torso=(10, 1, 1), head=(-6, 0, 0), bupper=(-40, 0, 0), bfore=(-40, 0, 0), fupper=(20, 0, 0), ffore=(-10, 0, 0),
          root=(0, 0, 1, 1.02, 0.98), **legs(-40, 20, 36, 30, -10, 0))
    D = P(torso=(12, 1, -1), head=(-8, 0, 0), bupper=(0, 0, 0), bfore=(-10, 0, 0), fupper=(-20, 0, 0), ffore=(10, 0, 0),
          root=(0, 0, -2, 0.98, 1.03), **legs(-5, 10, 0, 60, 0, -10))
    return [k(0, A), k(12, B, 'inout'), k(24, C, 'inout'), k(36, D, 'inout'), k(48, A, 'inout')]

JUMP = P(fupper=(-60, 0, 0), ffore=(20, 0, 0), bupper=(-50, 0, 0), bfore=(-30, 0, 0), head=(-6, 0, 0), hair=(6, 0, 0), **TUCK)
JUMP2 = P(fupper=(-66, 0, -1), ffore=(24, 0, 0), bupper=(-56, 0, -1), bfore=(-30, 0, 0), head=(-8, 0, 0), hair=(10, 0, 0), **legs(-26, 74, -50, 74, -20, -20))
FALL = P(fupper=(-110, 0, 0), ffore=(20, 0, 0), bupper=(-120, 0, 0), bfore=(10, 0, 0), head=(6, 0, 0), hair=(-8, 0, 0), **legs(16, 10, -12, 20, 0, -8))
FALL2 = P(fupper=(-118, 0, 0), ffore=(26, 0, 0), bupper=(-126, 0, 0), bfore=(14, 0, 0), head=(4, 0, 0), hair=(-12, 0, 0), **legs(20, 14, -16, 24, 0, -8))

# ======================================================================= moves
MOVES = {}
def move(name, ticks, keys, step=2, smear=('ffore', 'mic', 'ffist'), loop=False, center=None):
    MOVES[name] = (ticks, keys, step, smear, loop, center)

def barrage(t, n):                                                       # one rap-barrage beat: lean in, mic forward, mouth open
    s = 1 if n % 2 else -1
    return P(torso=(8 + 2 * s, 1, 0), head=(-10, 1, 0), hair=(8, 0, 0), fupper=(-70, 0, 0), ffore=(54, 0, 0), mic=(30 + 4 * s, 0, 0),
             bupper=(-20 - 10 * s, 0, 0), bfore=(-40, 0, 0), root=(0, 1, 0, 1.03 + 0.02 * s, 0.97), **legs(10, 0, -12, 10, 0, -6))
# jab: RAP BARRAGE - four quick verses spat into the mic, then a shove of sound
move('jab', 26, [k(0, REST), k(3, barrage(3, 0), 'snap'), k(8, barrage(8, 1), 'snap'), k(13, barrage(13, 2), 'snap'), k(18, barrage(18, 3), 'snap'),
                 k(20, P(torso=(14, 3, 0), head=(-14, 2, 0), hair=(12, 0, 0), fupper=(-85, 0, 0), ffore=(70, 0, 0), mic=(40, 0, 0), root=(0, 3, 0, 1.06, 0.95), **legs(16, 0, -18, 12, 0, -8)), 'snap'),
                 k(26, REST, 'inout')], smear=())
# ftilt: MIC SWING - whips the mic out on its cable like a flail
move('ftilt', 30, [
    k(0, REST),
    k(6, P(fupper=(-150, -1, 0), ffore=(-20, 0, 0), mic=(-60, 0, 0), torso=(-8, -1, 0), head=(6, 0, 0), bupper=(20, 0, 0), root=(0, -2, 0), **legs(8, 0, -6, 0)), 'out'),
    k(9, P(fupper=(-70, 0, 0), ffore=(40, 0, 0), mic=(70, 0, 0), torso=(12, 2, 0), head=(-8, 1, 0), hair=(10, 0, 0), bupper=(-20, 0, 0), root=(0, 3, 0, 1.03, 0.97), **legs(16, 0, -16, 10, 0, -6)), 'snap'),
    k(13, P(fupper=(-30, 0, 0), ffore=(50, 0, 0), mic=(140, 0, 0), torso=(14, 2, 0), head=(-6, 1, 0), hair=(12, 0, 0), bupper=(-20, 0, 0), root=(0, 3, 0), **legs(16, 0, -16, 10, 0, -6)), 'out'),
    k(30, REST, 'inout'),
])
# utilt: twirls the mic overhead on its cable
move('utilt', 26, [
    k(0, REST),
    k(4, P(fupper=(-130, 0, -1), ffore=(-30, 0, 0), mic=(0, 0, 0), head=(-10, 0, 0), torso=(-4, 0, 0), root=(0, 0, -1, 0.97, 1.04)), 'out'),
    k(12, P(fupper=(-150, 0, -2), ffore=(-40, 0, 0), mic=(360, 0, 0), head=(-14, 0, 0), hair=(10, 0, 0), torso=(-6, 0, -1), root=(0, 0, -2, 0.95, 1.06)), 'linear'),
    k(16, P(fupper=(-140, 0, -1), ffore=(-30, 0, 0), mic=(420, 0, 0), head=(-10, 0, 0), torso=(-4, 0, 0)), 'out'),
    k(26, P(mic=(360, 0, 0)), 'inout'),
])
# dtilt: a low sweeping kick
move('dtilt', 22, [
    k(0, REST),
    k(4, P(torso=(14, 0, 2), head=(-6, 0, 0), **CROUCH), 'out'),
    k(6, P(torso=(-10, -2, 3), head=(4, 0, 0), bupper=(-30, 0, 0), fupper=(-40, 0, 0), root=(0, -2, 2, 1.08, 0.86), **legs(30, -40, -80, -10, 0, 0)), 'snap'),
    k(12, P(torso=(-8, -2, 3), head=(4, 0, 0), bupper=(-30, 0, 0), fupper=(-40, 0, 0), root=(0, -2, 2, 1.08, 0.86), **legs(30, -40, -76, -8, 0, 0)), 'linear'),
    k(22, REST, 'inout'),
], smear=('fthigh', 'fshin', 'fshoe'))
# fsmash: KICK - a huge front kick
KICK_WIND = P(torso=(-16, -2, 0), head=(8, 0, 0), hair=(-8, 0, 0), fupper=(-20, 0, 0), bupper=(30, 0, 0), root=(0, -3, 0, 1.0, 1.0), **legs(10, -10, 30, 60, 0, -10))
KICK = P(torso=(-24, -3, 1), head=(10, 0, 0), hair=(-12, 0, 0), fupper=(-100, 0, 0), ffore=(30, 0, 0), bupper=(-60, 0, 0), root=(0, 4, 0, 1.04, 0.97), **legs(20, -6, -100, 0, 0, -10))
move('fsmash', 46, [
    k(0, REST),
    k(12, KICK_WIND, 'out'),
    k(15, P(**{**KICK_WIND, 'torso': (-18, -2, 0), 'root': (0, -3, 0, 1.02, 0.98)})),
    k(17, KICK, 'snap'),
    k(26, P(**{**KICK, 'fthigh': (-92, 0, 0)}), 'linear'),
    k(46, REST, 'inout'),
], smear=('fthigh', 'fshin', 'fshoe'))
# usmash: BREAKDOWN - crouches, then throws his arms wide and roars a blast of sound upward
move('usmash', 44, [
    k(0, REST),
    k(10, P(torso=(18, 0, 2), head=(16, 1, 2), hair=(-10, 0, 0), fupper=(20, 0, 0), ffore=(-30, 0, 0), bupper=(20, 0, 0), **CROUCH), 'out'),
    k(14, P(torso=(-10, 0, -2), head=(-24, 0, -1), hair=(16, 0, 0), fupper=(-150, 0, -2), ffore=(10, 0, 0), mic=(-30, 0, 0), bupper=(-150, 0, -2), bfore=(20, 0, 0), root=(0, 0, -4, 0.9, 1.14), **legs(16, 0, -16, 0)), 'snap'),
    k(22, P(torso=(-8, 0, -2), head=(-22, 0, -1), hair=(14, 0, 0), fupper=(-146, 0, -2), ffore=(10, 0, 0), mic=(-30, 0, 0), bupper=(-146, 0, -2), bfore=(20, 0, 0), root=(0, 0, -3, 0.94, 1.08), **legs(16, 0, -16, 0)), 'linear'),
    k(44, REST, 'inout'),
], smear=())
# dsmash: GROUND POUND - drops to a knee and punches the floor; the shockwave runs both ways
move('dsmash', 44, [
    k(0, REST),
    k(12, P(torso=(-10, 0, -2), head=(-6, 0, 0), bupper=(-170, 0, -2), bfore=(30, 0, 0), fupper=(-40, 0, 0), root=(0, 0, -3, 0.95, 1.06), **legs(6, 0, -6, 0)), 'out'),
    k(15, P(torso=(34, 3, 6), head=(8, 1, 2), hair=(-10, 0, 0), bupper=(-30, 4, 4), bfore=(-20, 0, 0), fupper=(-20, 0, 0), root=(0, 0, 0, 1.12, 0.8), **legs(60, -80, -20, 40, 20, -20)), 'snap'),
    k(24, P(torso=(32, 3, 6), head=(6, 1, 2), bupper=(-30, 4, 4), bfore=(-20, 0, 0), fupper=(-20, 0, 0), root=(0, 0, 0, 1.12, 0.82), **legs(58, -78, -20, 38, 20, -20)), 'linear'),
    k(44, REST, 'inout'),
], smear=())
# ---- aerials
AIR = P(**TUCK, fupper=(-40, 0, 0), bupper=(-30, 0, 0))
move('nair', 26, [
    k(0, AIR),
    k(4, P(**TUCK, fupper=(-90, 0, 0), ffore=(60, 0, 0), mic=(60, 0, 0), root=(-20, 0, -2, 0.96, 0.96)), 'out'),
    k(14, P(**TUCK, fupper=(-90, 0, 0), ffore=(60, 0, 0), mic=(90, 0, 0), root=(340, 0, -2, 0.96, 0.96)), 'linear'),
    k(19, P(**TUCK, fupper=(-40, 0, 0), bupper=(-30, 0, 0), root=(360, 0, -1)), 'out'),
    k(26, P(**TUCK, fupper=(-40, 0, 0), bupper=(-30, 0, 0), root=(360, 0, 0))),
], smear=('ffore', 'mic', 'ffist', 'bshoe', 'fshoe'), center=MID)
move('fair', 26, [
    k(0, AIR),
    k(5, P(torso=(-10, 0, 0), fupper=(-60, 0, 0), bupper=(10, 0, 0), root=(-6, 0, 0), **legs(-10, 60, 20, 100, 0, 0)), 'out'),
    k(8, P(torso=(-20, -2, 0), head=(10, 0, 0), fupper=(-110, 0, 0), bupper=(-60, 0, 0), root=(-8, 3, 0, 1.03, 0.97), **legs(-20, 70, -100, 0, 0, -10)), 'snap'),
    k(14, P(torso=(-18, -2, 0), head=(8, 0, 0), fupper=(-100, 0, 0), bupper=(-60, 0, 0), root=(-6, 3, 0), **legs(-20, 70, -96, 0, 0, -10)), 'linear'),
    k(26, AIR, 'inout'),
], smear=('fthigh', 'fshin', 'fshoe'))
move('bair', 24, [
    k(0, AIR),
    k(4, P(torso=(14, 1, 0), head=(-6, 0, 0), root=(10, 1, 0), **legs(-40, 90, -50, 70, 0, 0)), 'out'),
    k(7, P(torso=(24, 3, 0), head=(-14, 1, 0), hair=(14, 0, 0), fupper=(-60, 0, 0), bupper=(-20, 0, 0), root=(16, 2, 0, 1.04, 0.96), **legs(100, 0, -40, 70, 10, 0)), 'snap'),
    k(13, P(torso=(22, 3, 0), head=(-12, 1, 0), fupper=(-60, 0, 0), bupper=(-20, 0, 0), root=(14, 2, 0), **legs(96, 0, -40, 70, 10, 0)), 'linear'),
    k(24, AIR, 'inout'),
], smear=('bthigh', 'bshin', 'bshoe'))
move('uair', 24, [
    k(0, AIR),
    k(4, P(**TUCK, torso=(10, 0, 1), head=(14, 0, 1), fupper=(10, 0, 0), ffore=(-20, 0, 0), root=(0, 0, 2, 1.04, 0.94)), 'out'),
    k(6, P(**legs(-6, 20, -14, 20), torso=(-8, 0, -1), head=(-30, 0, -1), hair=(18, 0, 0), fupper=(-160, 0, -2), ffore=(-10, 0, 0), mic=(-20, 0, 0), bupper=(-150, 0, -2), root=(0, 0, -3, 0.94, 1.1)), 'snap'),
    k(12, P(**legs(-6, 20, -14, 20), torso=(-8, 0, -1), head=(-28, 0, -1), hair=(16, 0, 0), fupper=(-156, 0, -2), ffore=(-10, 0, 0), mic=(-20, 0, 0), bupper=(-146, 0, -2), root=(0, 0, -2, 0.96, 1.06)), 'linear'),
    k(24, AIR, 'inout'),
], smear=())
# dair: STAGE DIVE (DOWN) - curls up, then stomps straight down with both feet
move('dair', 34, [
    k(0, AIR),
    k(8, P(**legs(-60, 110, -80, 110, -10, -10), torso=(10, 0, -2), head=(10, 0, 0), fupper=(-140, 0, 0), bupper=(-140, 0, 0), root=(0, 0, -5, 1.04, 0.92)), 'out'),
    k(10, P(**legs(4, 0, -4, 0, 0, 0), torso=(-4, 0, 2), head=(-12, 0, 0), hair=(10, 0, -1), fupper=(-150, 0, -1), bupper=(-150, 0, -1), root=(0, 0, 4, 0.92, 1.12)), 'snap'),
    k(22, P(**legs(4, 0, -4, 0, 0, 0), torso=(-2, 0, 2), head=(-10, 0, 0), fupper=(-140, 0, -1), bupper=(-140, 0, -1), root=(0, 0, 3, 0.95, 1.08)), 'linear'),
    k(34, AIR, 'inout'),
], smear=())
# ---- grab and throws
REACH = P(torso=(12, 2, 0), head=(-6, 1, 0), fupper=(-80, 0, 0), ffore=(70, 0, 0), bupper=(-60, 0, 0), bfore=(40, 0, 0), root=(0, 4, 0, 1.03, 0.97), **legs(14, 0, -14, 10, 0, -6))
move('grab', 26, [k(0, REST), k(4, P(torso=(-4, -1, 0), bupper=(20, 0, 0)), 'out'), k(7, REACH, 'snap'), k(14, P(**{**REACH, 'torso': (10, 2, 0)}), 'linear'), k(26, REST, 'inout')], smear=())
HOLD = P(torso=(8, 1, 0), head=(-4, 0, 0), fupper=(-70, 0, 0), ffore=(60, 0, 0), bupper=(-60, 0, 0), bfore=(40, 0, 0), root=(0, 2, 0), **legs(10, 0, -10, 6))
move('holding', 24, [k(0, HOLD), k(12, P(**{**HOLD, 'head': (6, 1, 1), 'torso': (10, 1, 1)})), k(24, HOLD)], smear=(), loop=True)
move('throw_forward', 18, [k(0, P(**{**HOLD, 'torso': (-10, -1, 0)})), k(5, P(torso=(18, 4, 1), head=(-10, 1, 0), fupper=(-60, 0, 0), ffore=(30, 0, 0), bupper=(-90, 0, 0), bfore=(10, 0, 0), root=(0, 5, 0, 1.05, 0.95), **legs(20, 0, -20, 12, 0, -8)), 'snap'), k(18, REST, 'inout')], smear=())
move('throw_back', 18, [k(0, HOLD), k(5, P(torso=(-24, -4, 0), head=(-14, 0, 0), fupper=(-200, 0, 0), bupper=(-160, 0, 0), root=(-10, -4, 0, 1.03, 0.97), **legs(10, 0, -16, 10)), 'snap'), k(11, P(torso=(-20, -4, 0), head=(-10, 0, 0), fupper=(-190, 0, 0), bupper=(-150, 0, 0), root=(-8, -4, 0), **legs(10, 0, -16, 10)), 'linear'), k(18, REST, 'inout')], smear=())
move('throw_up', 18, [k(0, P(**{**HOLD, **CROUCH})), k(4, P(torso=(-6, 0, -1), head=(-20, 0, 0), fupper=(-160, 0, -2), bupper=(-160, 0, -2), root=(0, 0, -3, 0.94, 1.1)), 'snap'), k(10, P(torso=(-6, 0, -1), head=(-18, 0, 0), fupper=(-156, 0, -2), bupper=(-156, 0, -2), root=(0, 0, -2, 0.96, 1.06)), 'linear'), k(18, REST, 'inout')], smear=())
move('throw_down', 18, [k(0, P(torso=(-6, 0, -1), fupper=(-150, 0, -1), bupper=(-150, 0, -1), root=(0, 0, -2, 0.96, 1.05))), k(4, P(torso=(30, 3, 5), head=(6, 1, 2), fupper=(-30, 0, 2), bupper=(-30, 0, 2), root=(0, 0, 0, 1.1, 0.84), **legs(50, -70, -20, 36, 16, -16)), 'snap'), k(10, P(torso=(28, 3, 5), head=(6, 1, 2), fupper=(-30, 0, 2), bupper=(-30, 0, 2), root=(0, 0, 0, 1.1, 0.85), **legs(48, -66, -20, 34, 16, -16)), 'linear'), k(18, REST, 'inout')], smear=())
# ---- specials
# CROWD CALL: cups a hand to his ear, then screams into the mic - a wall of sound rolls forward
move('neutralB', 30, [
    k(0, REST),
    k(8, P(torso=(-8, -1, 0), head=(-14, 0, 0), bupper=(-150, 2, 0), bfore=(-80, 0, 0), fupper=(-20, 0, 0), root=(0, -1, 0)), 'out'),
    k(12, P(torso=(14, 3, 1), head=(-12, 2, 0), hair=(14, 0, 0), fupper=(-60, 0, 0), ffore=(40, 0, 0), mic=(20, 0, 0), bupper=(10, 0, 0), bfore=(-20, 0, 0), root=(0, 3, 0, 1.06, 0.95), **legs(16, 0, -16, 10, 0, -8)), 'snap'),
    k(22, P(torso=(12, 3, 1), head=(-10, 2, 0), hair=(12, 0, 0), fupper=(-60, 0, 0), ffore=(40, 0, 0), mic=(20, 0, 0), bupper=(10, 0, 0), root=(0, 3, 0), **legs(16, 0, -16, 10, 0, -8)), 'linear'),
    k(30, REST, 'inout'),
], smear=())
# STAGE DIVE: a flat-out dive forward, arms first
DIVE = P(torso=(70, 6, 4), head=(10, 0, 0), hair=(-20, 0, 0), fupper=(-150, 0, 0), ffore=(10, 0, 0), bupper=(-160, 0, 0), bfore=(10, 0, 0), root=(0, 0, -6, 1.0, 1.0), **legs(-40, 20, -50, 30, 0, 0))
move('sideB', 34, [
    k(0, REST),
    k(6, P(**CROUCH, torso=(10, 0, 2), fupper=(40, 0, 0), bupper=(40, 0, 0)), 'out'),
    k(9, P(**{**DIVE}), 'snap'),
    k(22, P(**{**DIVE, 'root': (0, 0, -6, 1.04, 0.96)}), 'linear'),
    k(34, AIR, 'inout'),
], smear=())
# CROWD SURF: laid back on a sea of hands, arms out, riding upward
SURF = P(torso=(-80, -6, 6), head=(-10, 0, 0), hair=(20, 0, 0), fupper=(-120, 0, 0), ffore=(-20, 0, 0), bupper=(-140, 0, 0), bfore=(-20, 0, 0), root=(0, 0, -2), **legs(-60, 20, -70, 10, 0, 0))
move('upb', 40, [
    k(0, P(**CROUCH, fupper=(30, 0, 0), bupper=(30, 0, 0))),
    k(8, SURF, 'snap'),
    k(28, P(**{**SURF, 'torso': (-84, -6, 6), 'fupper': (-110, 0, 0)}), 'linear'),
    k(40, P(**FALL), 'inout'),
], smear=())
# GRAFFITI TAG: pulls a can and sprays his tag on the floor in front of him
SPRAY = P(_hide=(), torso=(16, 2, 2), head=(6, 0, 1), bupper=(-60, 3, 2), bfore=(-40, 0, 0), can=(-20, 0, 0), fupper=(-10, 0, 0), root=(0, 0, 0, 1.06, 0.9), **legs(20, -30, -20, 30, 6, -6))
move('downB', 34, [
    k(0, P(_hide=())),
    k(8, P(**{**SPRAY, 'bupper': (-90, 3, 2)}), 'out'),
    k(12, SPRAY, 'inout'),
    k(18, P(**{**SPRAY, 'bupper': (-40, 3, 2)}), 'inout'),
    k(24, P(**{**SPRAY, 'bupper': (-70, 3, 2)}), 'inout'),
    k(34, REST, 'inout'),
], smear=())
# MOSH PIT (Limit): raises the mic high... and drops it
move('limit', 120, [
    k(0, REST),
    k(20, P(torso=(-8, 0, -1), head=(-20, 0, 0), hair=(14, 0, 0), fupper=(-170, 0, -3), ffore=(-10, 0, 0), mic=(-10, 0, 0), bupper=(-150, 0, -2), root=(0, 0, -2, 0.95, 1.08))),
    k(40, P(torso=(-10, 0, -1), head=(-24, 0, 0), hair=(16, 0, 0), fupper=(-176, 0, -3), ffore=(-10, 0, 0), mic=(-10, 0, 0), bupper=(-156, 0, -2), root=(0, 0, -3, 0.94, 1.1))),
    k(44, P(torso=(30, 3, 5), head=(10, 1, 2), hair=(-10, 0, 0), fupper=(-20, 2, 3), ffore=(30, 0, 0), mic=(60, 0, 0), bupper=(-20, 0, 2), root=(0, 0, 0, 1.12, 0.82), **legs(50, -70, -20, 36, 16, -16)), 'snap'),
    k(100, P(torso=(26, 3, 5), head=(-10, 1, 2), hair=(10, 0, 0), fupper=(-20, 2, 3), ffore=(30, 0, 0), mic=(60, 0, 0), bupper=(-20, 0, 2), root=(0, 0, 0, 1.1, 0.84), **legs(48, -66, -20, 34, 16, -16)), 'linear'),
    k(120, REST, 'inout'),
], step=4, smear=())
# ---- reactions
HURT = P(root=(-14, -2, 0, 1.06, 0.94), torso=(-12, -1, 0), head=(-20, -1, 0), hair=(20, 0, 0), fupper=(40, 0, 2), bupper=(50, 0, 0), **legs(24, 0, -24, 10))
move('hitstun', 16, [k(0, HURT), k(8, P(**{**HURT, 'root': (-18, -3, 0, 1.03, 0.97), 'head': (-26, -1, 0)})), k(16, HURT)], smear=(), loop=True)
GUARD = P(root=(0, 0, 0, 1.04, 0.94), torso=(8, 0, 1), head=(8, 0, 1), fupper=(-100, 0, 0), ffore=(-60, 0, 0), bupper=(-90, 0, 0), bfore=(-60, 0, 0), **legs(10, -10, -10, 14))
move('shield', 24, [k(0, GUARD), k(12, P(**{**GUARD, 'torso': (9, 0, 1)})), k(24, GUARD)], smear=(), loop=True)
HELD = P(root=(-8, 0, -2), torso=(-10, 0, 0), head=(-14, 0, 0), fupper=(60, 0, 0), bupper=(70, 0, 0), **legs(-14, 10, -24, 10))
move('grabbed', 16, [k(0, HELD), k(8, P(**{**HELD, 'head': (-8, 0, 0)})), k(16, HELD)], smear=(), loop=True)
HANG = P(fupper=(-170, 0, -2), ffore=(0, 0, 0), bupper=(-170, 0, -2), head=(-8, 0, 0), root=(0, 0, 0, 0.98, 1.04), **legs(10, 10, -6, 16))
move('ledge', 24, [k(0, HANG), k(12, P(**{**HANG, 'bthigh': (16, 0, 0)})), k(24, HANG)], smear=(), loop=True)


def strip(frames, path):
    sheet = Image.new('RGBA', (64 * len(frames), 64), (0, 0, 0, 0))
    for i, f in enumerate(frames): sheet.alpha_composite(Image.fromarray(f, 'RGBA'), (i * 64, 0))
    sheet.save(path)

def build():
    os.makedirs(DIR, exist_ok=True)
    idle = animate(SMALL, idle_keys(), 192, step=6)
    run = animate(SMALL, run_keys(), 48, step=6)
    jump = animate(SMALL, [k(0, JUMP), k(12, JUMP2), k(24, JUMP)], 24, step=6)
    fall = animate(SMALL, [k(0, FALL), k(12, FALL2), k(24, FALL)], 24, step=6)
    strip(idle, os.path.join(DIR, 'idle_sheet.png')); strip(run, os.path.join(DIR, 'run_sheet.png'))
    strip(jump, os.path.join(DIR, 'jump_sheet.png')); strip(fall, os.path.join(DIR, 'fall_sheet.png'))
    out = {}
    for name, (ticks, keys, step, smear, loop, center) in MOVES.items():
        out[name] = animate(BIG, keys, ticks, step=step, smear=smear, smear_tint=GHOST, center=center)
    idx = save_atlas(out, os.path.join(DIR, 'moves_sheet.png'))
    index = {n: idx[n] + [MOVES[n][2]] + ([1] if MOVES[n][4] else []) for n in MOVES}
    with open(JS, 'w') as f:
        f.write('// Generated by tools/sprites/nu_moves.py - do not edit by hand.\n')
        f.write("// NU's move animations in moves_sheet.png (112x104 frames, feet at 56,95):\n")
        f.write('// move: [first frame, frame count, game ticks per frame, loops?]\n')
        f.write('export const NU_MOVES = ' + json.dumps(index).replace('],', '],\n  ').replace('{', '{\n  ').replace(']}', '],\n};') + '\n')
    # select-screen icon: his head and shoulders, 2x
    icon = Image.fromarray(idle[0]).crop((16, 0, 52, 19)).resize((72, 38), Image.NEAREST)
    icon.save(os.path.join(DIR, 'icon.png'))
    return {'idle': idle, 'run': run, 'jump': jump, 'fall': fall}, out

if __name__ == '__main__':
    base, out = build()
    if '--preview' in sys.argv:
        d = sys.argv[sys.argv.index('--preview') + 1]; os.makedirs(d, exist_ok=True)
        for name, fr in {**base, **out}.items(): contact(fr, os.path.join(d, 'nu_' + name + '.png'))
    print('frames:', sum(len(f) for f in out.values()))

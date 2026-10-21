"""NU's animations, from his part-by-part drawing (tools/sprites/nu_draw.py) with the puppet rig.

What keeps it loose rather than stiff:
  - secondary motion: his head, hair, mic and fist trail behind every swing (Part.drag) and his hair
    streams back when he lunges or jumps (Part.sway), so nothing stops dead with the body
  - a life layer under every move: a little breathing and head bob that never quite stops
  - big poses: wind-ups that coil the whole body, strikes that over-extend, overshoot ('back' eases)
    and a settle before he recovers, squash on landings and stretch on launches
  - attacks are drawn at the full 60 frames a second (one frame per game tick)

  idle_sheet.png   32 frames, 64x64: nodding to a beat only he can hear, mic bouncing
  run_sheet.png     8 frames, 64x64: a loose, bouncing swagger, arms pumping
  jump_sheet.png    4 frames, 64x64: knees tucked     fall_sheet.png  4 frames: legs hanging, arms up
  moves_sheet.png   every attack, special, grab, throw and reaction, 112x104 frames, feet at (56, 95)
src/fighters/nuMoves.js gets the frame index for the moves sheet.

Other fighters on the same rig and joints (AERO) import the pose helpers from here.

  python3 tools/sprites/nu_moves.py [--preview DIR]
"""
import os, sys, json, math
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from puppet import Part, Rig, animate, save_atlas, contact
import nu_draw

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
DIR = os.path.join(ROOT, 'public/assets/fighters/nu')
JS = os.path.join(ROOT, 'src/fighters/nuMoves.js')
FEET = (32, 58)
MID = (32, 34)
GHOST = (155, 227, 42)          # acid green afterimages (skins recolour it with the rest)
# how much each part trails behind its parent's swing / streams back when the body moves
FOLLOW = {'head': (0.18, 0.2), 'hair': (0.55, 1.4), 'mic': (0.5, 0.4), 'ffist': (0.12, 0), 'can': (0.3, 0), 'bfore': (0.15, 0), 'ffore': (0.1, 0)}

def build_rig(draw, follow, order=None):
    layers = draw.draw_parts()
    base = draw.composite(layers, hide=())
    parts = []
    for z, name in enumerate(draw.ORDER):
        pivot, parent = draw.RIG[name]
        dr, sw = follow.get(name, (0, 0))
        parts.append(Part(name, layers[name][..., 3] > 0, pivot, parent, z=z, variants=[layers[name]], drag=dr, sway=sw))
    return Rig(base, parts, (64, 64), (0, 0), FEET), Rig(base, parts, (112, 104), (24, 36), FEET)

SMALL, BIG = build_rig(nu_draw, FOLLOW)

def P(**kw):
    kw.setdefault('_hide', ('can',))
    return kw
def k(t, pose, ease='inout'): return (t, pose, ease)
def mix(a, **kw): return P(**{**a, **kw})            # a pose with a few parts changed
REST = P()

# ---- building blocks
def legs(bt=0, bs=0, ft=0, fs=0, bshoe=0, fshoe=0):
    return dict(bthigh=(bt, 0, 0), bshin=(bs, 0, 0), fthigh=(ft, 0, 0), fshin=(fs, 0, 0), bshoe=(bshoe, 0, 0), fshoe=(fshoe, 0, 0))
CROUCH = dict(root=(0, 0, 0, 1.08, 0.86), **legs(22, -30, -22, 32, 8, -10))
DEEP = dict(root=(0, 0, 0, 1.12, 0.8), **legs(36, -50, -34, 50, 14, -14))
TUCK = legs(-34, 80, -60, 84, -20, -20)
STANCE = legs(16, -4, -18, 12, 0, -8)                   # weight forward, front knee bent

def full(v):
    v = list(v or ())
    return v + [0, 0, 0, 1, 1][len(v):]

def life(pose, t):
    """Breathing and a slow head bob under everything, so a held pose never freezes solid."""
    p = dict(pose)
    br = math.sin(t * 0.09)
    tor = full(p.get('torso'))
    tor[0] += br * 1.2; tor[2] += br * 0.4
    p['torso'] = tuple(tor)
    hd = full(p.get('head'))
    hd[0] += math.sin(t * 0.09 + 0.8) * 1.5
    p['head'] = tuple(hd)
    return p

# ======================================================================= idle / run / jump / fall
def idle_keys():
    keys = []
    for b in range(4):                                                   # four nods to the beat, each one bigger than the breath
        t0 = b * 48
        keys += [k(t0, P(root=(0, 0, 0)), 'inout'),
                 k(t0 + 8, P(head=(14, 1, 1), hair=(-8, 0, 0), torso=(4, 0, 1), fupper=(6, 0, 1), ffore=(-10, 0, 0), mic=(8, 0, 0), bupper=(6, 0, 1), root=(0, 0, 0, 1.03, 0.97), **legs(4, -4, -4, 6)), 'out'),
                 k(t0 + 20, P(head=(-4, 0, -1), hair=(6, 0, 0), torso=(-2, 0, 0), fupper=(-4, 0, 0), ffore=(4, 0, 0), bupper=(-4, 0, 0), root=(0, 0, 0, 0.99, 1.02)), 'back'),
                 k(t0 + 34, P(root=(0, 0, 0)), 'inout')]
    keys.append(k(192, P()))
    return keys

def run_keys():
    # contact - down (weight sinks) - passing (up) - contact, with the arms swinging opposite the legs
    A = P(torso=(14, 1, 1), head=(-8, 0, 0), bupper=(50, 0, 0), bfore=(-40, 0, 0), fupper=(-70, 0, 0), ffore=(40, 0, 0), root=(0, 0, 2, 1.04, 0.96), **legs(40, 30, -48, 18, 0, -12))
    B = P(torso=(16, 1, 0), head=(-10, 0, 0), bupper=(20, 0, 0), bfore=(-30, 0, 0), fupper=(-40, 0, 0), ffore=(20, 0, 0), root=(0, 0, -1, 0.97, 1.04), **legs(-4, 70, -8, 14, -16, 0))
    C = P(torso=(14, 1, 1), head=(-8, 0, 0), bupper=(-50, 0, 0), bfore=(-60, 0, 0), fupper=(30, 0, 0), ffore=(-20, 0, 0), root=(0, 0, 2, 1.04, 0.96), **legs(-24, 34, 22, 56, -8, 0))
    D = P(torso=(16, 1, 0), head=(-10, 0, 0), bupper=(-20, 0, 0), bfore=(-40, 0, 0), fupper=(-10, 0, 0), ffore=(10, 0, 0), root=(0, 0, -1, 0.97, 1.04), **legs(-8, 14, -4, 70, 0, -16))
    return [k(0, A), k(12, B, 'out'), k(24, C, 'in'), k(36, D, 'out'), k(48, A, 'in')]

JUMP = P(fupper=(-70, 0, 0), ffore=(30, 0, 0), bupper=(-60, 0, 0), bfore=(-40, 0, 0), head=(-10, 0, 0), hair=(14, 0, 0), torso=(-4, 0, 0), **TUCK)
JUMP2 = P(fupper=(-80, 0, -1), ffore=(36, 0, 0), bupper=(-70, 0, -1), bfore=(-40, 0, 0), head=(-12, 0, 0), hair=(18, 0, 0), torso=(-6, 0, 0), **legs(-28, 86, -54, 88, -20, -20))
FALL = P(fupper=(-120, 0, 0), ffore=(26, 0, 0), bupper=(-130, 0, 0), bfore=(16, 0, 0), head=(8, 0, 0), hair=(-12, 0, 0), torso=(4, 0, 0), **legs(20, 14, -14, 26, 0, -8))
FALL2 = P(fupper=(-132, 0, 0), ffore=(34, 0, 0), bupper=(-140, 0, 0), bfore=(22, 0, 0), head=(6, 0, 0), hair=(-18, 0, 0), torso=(3, 0, 0), **legs(26, 18, -20, 30, 0, -8))
AIR = P(**TUCK, fupper=(-50, 0, 0), ffore=(30, 0, 0), bupper=(-40, 0, 0), bfore=(-30, 0, 0))

# ======================================================================= moves
MOVES = {}
def move(name, ticks, keys, step=1, smear=('ffore', 'mic', 'ffist'), loop=False, center=None):
    MOVES[name] = (ticks, keys, step, smear, loop, center)

# ---- jab: RAP BARRAGE - leans into the mic and spits verse after verse (hold attack to keep going),
# head bobbing on every beat, then a shove of sound to finish
def verse(n):
    s = 1 if n % 2 else -1
    return P(torso=(12 + 3 * s, 1, 0), head=(-14 + 6 * s, 1, 0), hair=(10, 0, 0), fupper=(-80, 0, 0), ffore=(66, 0, 0), mic=(36 + 6 * s, 0, 0),
             bupper=(-30 - 20 * s, 0, 0), bfore=(-60 + 20 * s, 0, 0), root=(0, 1, 0, 1.04 + 0.02 * s, 0.96), **legs(14, -4, -16, 14, 0, -8))
SHOVE = P(torso=(20, 4, 1), head=(-18, 2, 0), hair=(16, 0, 0), fupper=(-95, 0, 0), ffore=(84, 0, 0), mic=(50, 0, 0), bupper=(40, 0, 0), bfore=(-20, 0, 0), root=(0, 4, 0, 1.08, 0.93), **legs(22, -6, -24, 16, 0, -10))
move('jab', 30, [k(0, REST), k(2, P(torso=(-6, -1, 0), head=(8, 0, 0), fupper=(-20, 0, 0), ffore=(-20, 0, 0)), 'out'),
                 k(4, verse(0), 'snap'), k(8, verse(1), 'snap'), k(12, verse(2), 'snap'), k(16, verse(3), 'snap'),
                 k(19, P(**{**verse(0), 'torso': (2, -1, 0), 'mic': (0, 0, 0), 'fupper': (-60, 0, 0), 'ffore': (20, 0, 0)}), 'out'),
                 k(22, SHOVE, 'snap'), k(25, mix(SHOVE, torso=(18, 4, 1)), 'linear'), k(30, REST, 'back')], smear=())
# ---- ftilt: MIC SWING - winds the mic all the way back, then whips it out on its cable like a flail
move('ftilt', 30, [
    k(0, REST),
    k(7, P(fupper=(-170, -1, 0), ffore=(-30, 0, 0), mic=(-80, 0, 0), torso=(-14, -2, 0), head=(10, 0, 0), bupper=(40, 0, 0), bfore=(-20, 0, 0), root=(0, -3, 0, 0.97, 1.03), **legs(12, -6, -4, 4)), 'out'),
    k(10, P(fupper=(-70, 0, 0), ffore=(50, 0, 0), mic=(90, 0, 0), torso=(18, 3, 0), head=(-12, 1, 0), bupper=(-40, 0, 0), bfore=(-30, 0, 0), root=(0, 4, 0, 1.05, 0.95), **STANCE), 'snap'),
    k(14, P(fupper=(-20, 0, 0), ffore=(60, 0, 0), mic=(170, 0, 0), torso=(20, 3, 0), head=(-10, 1, 0), bupper=(-50, 0, 0), root=(0, 4, 0, 1.03, 0.97), **STANCE), 'out'),
    k(20, P(fupper=(-10, 0, 0), ffore=(50, 0, 0), mic=(200, 0, 0), torso=(14, 2, 0), head=(-6, 0, 0), root=(0, 3, 0), **STANCE), 'inout'),
    k(30, REST, 'back'),
])
# ---- utilt: twirls the mic overhead on its cable, twice round, then catches it
move('utilt', 26, [
    k(0, REST),
    k(4, P(fupper=(-140, 0, -1), ffore=(-30, 0, 0), mic=(0, 0, 0), head=(-14, 0, 0), torso=(-6, 0, 0), bupper=(-20, 0, 0), root=(0, 0, -1, 0.96, 1.05), **legs(6, 0, -6, 0)), 'out'),
    k(12, P(fupper=(-165, 0, -2), ffore=(-40, 0, 0), mic=(400, 0, 0), head=(-20, 0, 0), hair=(14, 0, 0), torso=(-8, 0, -1), bupper=(-30, 0, 0), root=(0, 0, -2, 0.94, 1.08)), 'linear'),
    k(17, P(fupper=(-150, 0, -1), ffore=(-30, 0, 0), mic=(560, 0, 0), head=(-14, 0, 0), torso=(-6, 0, 0)), 'out'),
    k(26, P(mic=(720, 0, 0)), 'back'),
])
# ---- dtilt: drops low and sweeps a leg along the floor
move('dtilt', 22, [
    k(0, REST),
    k(4, P(torso=(18, 0, 2), head=(-6, 0, 0), bupper=(20, 0, 0), fupper=(20, 0, 0), **CROUCH), 'out'),
    k(6, P(torso=(-16, -3, 4), head=(8, 0, 0), bupper=(-50, 0, 0), bfore=(-20, 0, 0), fupper=(-60, 0, 0), root=(0, -2, 3, 1.1, 0.84), **legs(40, -60, -92, -6, 0, 10)), 'snap'),
    k(12, P(torso=(-14, -3, 4), head=(6, 0, 0), bupper=(-46, 0, 0), fupper=(-56, 0, 0), root=(0, -2, 3, 1.1, 0.85), **legs(38, -56, -88, -6, 0, 8)), 'linear'),
    k(22, REST, 'back'),
], smear=('fthigh', 'fshin', 'fshoe'))
# ---- dash attack: STAGE SLIDE - drops to his knees and slides across the floor, mic held high
SLIDE = P(torso=(-20, -2, 6), head=(-16, 0, 0), hair=(18, 0, 0), fupper=(-160, 0, -1), ffore=(10, 0, 0), mic=(-20, 0, 0), bupper=(-100, 0, 0), bfore=(-40, 0, 0), root=(0, 0, 4, 1.12, 0.82), **legs(70, -110, 60, -100, 30, 30))
move('dashAttack', 34, [k(0, P(torso=(18, 2, 0), root=(0, 0, 0, 1.04, 0.96), **legs(30, 20, -30, 30))), k(5, SLIDE, 'snap'), k(22, mix(SLIDE, head=(-22, 0, 0), torso=(-24, -2, 6)), 'linear'), k(34, REST, 'back')], smear=())

# ---- smash attacks
KICK_WIND = P(torso=(-22, -2, 0), head=(12, 0, 0), hair=(-12, 0, 0), fupper=(-10, 0, 0), ffore=(-20, 0, 0), bupper=(40, 0, 0), bfore=(-30, 0, 0), root=(0, -4, 0, 1.0, 1.0), **legs(14, -14, 40, 80, 0, -14))
KICK = P(torso=(-30, -3, 1), head=(14, 0, 0), hair=(-16, 0, 0), fupper=(-120, 0, 0), ffore=(40, 0, 0), bupper=(-80, 0, 0), bfore=(-20, 0, 0), root=(0, 6, 0, 1.06, 0.95), **legs(26, -10, -112, -6, 0, -16))
move('fsmash', 46, [
    k(0, REST),
    k(10, KICK_WIND, 'out'),
    k(16, mix(KICK_WIND, torso=(-26, -2, 0), root=(0, -5, 0, 1.03, 0.97), fthigh=(48, 0, 0)), 'inout'),         # holding the coil
    k(18, KICK, 'snap'),
    k(22, mix(KICK, fthigh=(-120, 0, 0), root=(0, 7, 0, 1.04, 0.97)), 'out'),                                     # over-extends
    k(30, mix(KICK, fthigh=(-100, 0, 0)), 'inout'),
    k(46, REST, 'back'),
], smear=('fthigh', 'fshin', 'fshoe'))
# BREAKDOWN: drops into a deep squat, then throws his arms and head back and roars straight up
move('usmash', 44, [
    k(0, REST),
    k(10, P(torso=(26, 0, 2), head=(22, 1, 2), hair=(-14, 0, 0), fupper=(30, 0, 0), ffore=(-40, 0, 0), bupper=(30, 0, 0), bfore=(-30, 0, 0), **DEEP), 'out'),
    k(14, P(torso=(-14, 0, -3), head=(-32, 0, -1), hair=(22, 0, 0), fupper=(-170, 0, -2), ffore=(10, 0, 0), mic=(-30, 0, 0), bupper=(-170, 0, -2), bfore=(20, 0, 0), root=(0, 0, -6, 0.86, 1.18), **legs(18, 0, -18, 0)), 'snap'),
    k(18, P(torso=(-10, 0, -2), head=(-28, 0, -1), hair=(18, 0, 0), fupper=(-160, 0, -2), ffore=(16, 0, 0), mic=(-30, 0, 0), bupper=(-160, 0, -2), bfore=(26, 0, 0), root=(0, 0, -4, 0.92, 1.1), **legs(16, 0, -16, 0)), 'out'),
    k(26, P(torso=(-8, 0, -2), head=(-24, 0, -1), fupper=(-155, 0, -2), ffore=(16, 0, 0), bupper=(-155, 0, -2), bfore=(26, 0, 0), root=(0, 0, -3, 0.95, 1.06)), 'linear'),
    k(44, REST, 'back'),
], smear=())
# GROUND POUND: leaps a little, raises a fist and punches the floor; the shockwave runs both ways
move('dsmash', 44, [
    k(0, REST),
    k(10, P(torso=(-14, 0, -3), head=(-10, 0, 0), bupper=(-180, 0, -2), bfore=(30, 0, 0), fupper=(-50, 0, 0), root=(0, 0, -6, 0.94, 1.08), **legs(10, 0, -10, 0)), 'out'),
    k(15, P(torso=(40, 3, 7), head=(12, 1, 2), hair=(-14, 0, 0), bupper=(-24, 4, 5), bfore=(-20, 0, 0), fupper=(-10, 0, 0), root=(0, 0, 1, 1.16, 0.78), **legs(66, -90, -24, 46, 22, -22)), 'snap'),
    k(19, P(torso=(38, 3, 7), head=(8, 1, 2), bupper=(-24, 4, 5), bfore=(-20, 0, 0), fupper=(-10, 0, 0), root=(0, 0, 0, 1.14, 0.8), **legs(64, -88, -24, 44, 22, -22)), 'out'),
    k(28, P(torso=(34, 3, 6), head=(4, 1, 2), bupper=(-30, 4, 4), fupper=(-20, 0, 0), root=(0, 0, 0, 1.12, 0.83), **legs(60, -82, -22, 40, 20, -20)), 'linear'),
    k(44, REST, 'back'),
], smear=())

# ---- aerials
move('nair', 26, [
    k(0, AIR),
    k(4, P(**TUCK, fupper=(-95, 0, 0), ffore=(70, 0, 0), mic=(70, 0, 0), bupper=(60, 0, 0), root=(-30, 0, -2, 0.96, 0.96)), 'out'),
    k(15, P(**TUCK, fupper=(-95, 0, 0), ffore=(70, 0, 0), mic=(110, 0, 0), bupper=(60, 0, 0), root=(340, 0, -2, 0.96, 0.96)), 'linear'),
    k(19, P(**TUCK, fupper=(-50, 0, 0), ffore=(30, 0, 0), bupper=(-40, 0, 0), root=(372, 0, -1)), 'out'),
    k(26, P(**TUCK, fupper=(-50, 0, 0), ffore=(30, 0, 0), bupper=(-40, 0, 0), root=(360, 0, 0)), 'back'),
], smear=('ffore', 'mic', 'ffist', 'bshoe', 'fshoe'), center=MID)
move('fair', 26, [
    k(0, AIR),
    k(6, P(torso=(-14, 0, 0), head=(6, 0, 0), fupper=(-60, 0, 0), bupper=(20, 0, 0), root=(-10, 0, 0), **legs(-14, 70, 30, 120, 0, 0)), 'out'),
    k(8, P(torso=(-26, -2, 0), head=(14, 0, 0), hair=(-10, 0, 0), fupper=(-130, 0, 0), ffore=(30, 0, 0), bupper=(-70, 0, 0), root=(-12, 4, 0, 1.05, 0.96), **legs(-24, 80, -110, -6, 0, -14)), 'snap'),
    k(14, P(torso=(-22, -2, 0), head=(10, 0, 0), fupper=(-115, 0, 0), bupper=(-70, 0, 0), root=(-8, 3, 0), **legs(-22, 80, -102, -4, 0, -12)), 'linear'),
    k(26, AIR, 'back'),
], smear=('fthigh', 'fshin', 'fshoe'))
move('bair', 24, [
    k(0, AIR),
    k(5, P(torso=(18, 1, 0), head=(-8, 0, 0), root=(14, 1, 0), **legs(-50, 100, -60, 80, 0, 0)), 'out'),
    k(7, P(torso=(30, 3, 0), head=(-18, 1, 0), hair=(18, 0, 0), fupper=(-70, 0, 0), bupper=(-20, 0, 0), root=(20, 2, 0, 1.06, 0.95), **legs(112, -6, -50, 80, 14, 0)), 'snap'),
    k(13, P(torso=(26, 3, 0), head=(-14, 1, 0), fupper=(-70, 0, 0), bupper=(-20, 0, 0), root=(16, 2, 0), **legs(104, -4, -50, 80, 12, 0)), 'linear'),
    k(24, AIR, 'back'),
], smear=('bthigh', 'bshin', 'bshoe'))
# up air: FEEDBACK - points the mic straight up and lets it scream
move('uair', 24, [
    k(0, AIR),
    k(4, P(**TUCK, torso=(14, 0, 1), head=(18, 0, 1), fupper=(20, 0, 0), ffore=(-30, 0, 0), root=(0, 0, 3, 1.06, 0.92)), 'out'),
    k(6, P(**legs(-8, 24, -16, 24), torso=(-12, 0, -2), head=(-36, 0, -1), hair=(22, 0, 0), fupper=(-175, 0, -2), ffore=(-10, 0, 0), mic=(-20, 0, 0), bupper=(-160, 0, -2), root=(0, 0, -4, 0.9, 1.14)), 'snap'),
    k(12, P(**legs(-8, 24, -16, 24), torso=(-10, 0, -2), head=(-32, 0, -1), hair=(18, 0, 0), fupper=(-170, 0, -2), ffore=(-10, 0, 0), mic=(-20, 0, 0), bupper=(-155, 0, -2), root=(0, 0, -3, 0.94, 1.08)), 'linear'),
    k(24, AIR, 'back'),
], smear=())
# down air: STAGE DIVE (DOWN) - curls into a ball, then stomps straight down with both feet
move('dair', 34, [
    k(0, AIR),
    k(8, P(**legs(-70, 120, -90, 120, -10, -10), torso=(14, 0, -3), head=(14, 0, 0), fupper=(-150, 0, 0), bupper=(-150, 0, 0), root=(0, 0, -6, 1.06, 0.9)), 'out'),
    k(10, P(**legs(6, 0, -6, 0, 0, 0), torso=(-6, 0, 3), head=(-16, 0, 0), hair=(14, 0, -1), fupper=(-160, 0, -1), bupper=(-160, 0, -1), root=(0, 0, 5, 0.88, 1.16)), 'snap'),
    k(22, P(**legs(6, 0, -6, 0, 0, 0), torso=(-4, 0, 2), head=(-12, 0, 0), fupper=(-150, 0, -1), bupper=(-150, 0, -1), root=(0, 0, 3, 0.94, 1.08)), 'linear'),
    k(34, AIR, 'back'),
], smear=())

# ---- grab and throws
REACH = P(torso=(16, 3, 0), head=(-8, 1, 0), fupper=(-86, 0, 0), ffore=(80, 0, 0), bupper=(-70, 0, 0), bfore=(50, 0, 0), root=(0, 5, 0, 1.04, 0.96), **STANCE)
move('grab', 26, [k(0, REST), k(4, P(torso=(-6, -1, 0), bupper=(30, 0, 0), fupper=(10, 0, 0)), 'out'), k(7, REACH, 'snap'), k(14, mix(REACH, torso=(12, 2, 0)), 'linear'), k(26, REST, 'back')], smear=())
HOLD = P(torso=(10, 1, 0), head=(-4, 0, 0), fupper=(-74, 0, 0), ffore=(64, 0, 0), bupper=(-64, 0, 0), bfore=(44, 0, 0), root=(0, 2, 0), **legs(12, -2, -12, 8))
move('holding', 24, [k(0, HOLD), k(12, mix(HOLD, head=(8, 1, 1), torso=(13, 1, 1), hair=(-6, 0, 0))), k(24, HOLD)], smear=(), loop=True)
move('throw_forward', 18, [k(0, mix(HOLD, torso=(-14, -1, 0), fupper=(-30, 0, 0))), k(5, P(torso=(24, 5, 1), head=(-14, 1, 0), fupper=(-60, 0, 0), ffore=(40, 0, 0), bupper=(-100, 0, 0), bfore=(20, 0, 0), root=(0, 6, 0, 1.06, 0.94), **legs(24, -6, -24, 16, 0, -10)), 'snap'), k(18, REST, 'back')], smear=())
move('throw_back', 18, [k(0, HOLD), k(5, P(torso=(-30, -5, 0), head=(-18, 0, 0), fupper=(-210, 0, 0), bupper=(-170, 0, 0), root=(-14, -5, 0, 1.04, 0.96), **legs(14, 0, -20, 12)), 'snap'), k(11, P(torso=(-24, -4, 0), head=(-12, 0, 0), fupper=(-200, 0, 0), bupper=(-160, 0, 0), root=(-10, -4, 0), **legs(12, 0, -18, 12)), 'linear'), k(18, REST, 'back')], smear=())
move('throw_up', 18, [k(0, mix(HOLD, **CROUCH)), k(4, P(torso=(-8, 0, -2), head=(-24, 0, 0), fupper=(-170, 0, -2), bupper=(-170, 0, -2), root=(0, 0, -4, 0.9, 1.14)), 'snap'), k(10, P(torso=(-6, 0, -1), head=(-20, 0, 0), fupper=(-160, 0, -2), bupper=(-160, 0, -2), root=(0, 0, -2, 0.95, 1.07)), 'linear'), k(18, REST, 'back')], smear=())
move('throw_down', 18, [k(0, P(torso=(-8, 0, -2), fupper=(-160, 0, -1), bupper=(-160, 0, -1), root=(0, 0, -3, 0.95, 1.06))), k(4, P(torso=(36, 3, 6), head=(8, 1, 2), fupper=(-30, 0, 2), bupper=(-30, 0, 2), root=(0, 0, 0, 1.12, 0.82), **legs(56, -76, -22, 40, 18, -18)), 'snap'), k(10, P(torso=(32, 3, 5), head=(6, 1, 2), fupper=(-30, 0, 2), bupper=(-30, 0, 2), root=(0, 0, 0, 1.1, 0.84), **legs(52, -70, -22, 36, 18, -18)), 'linear'), k(18, REST, 'back')], smear=())

# ---- specials
# CROWD CALL: cups a hand to his ear ("I can't hear you!"), then screams into the mic
move('neutralB', 30, [
    k(0, REST),
    k(8, P(torso=(-12, -1, 0), head=(-18, 0, 0), hair=(10, 0, 0), bupper=(-160, 2, 0), bfore=(-90, 0, 0), fupper=(-20, 0, 0), root=(0, -2, 0, 0.98, 1.03), **legs(8, 0, -4, 0)), 'out'),
    k(12, P(torso=(18, 4, 1), head=(-16, 2, 0), hair=(18, 0, 0), fupper=(-70, 0, 0), ffore=(50, 0, 0), mic=(24, 0, 0), bupper=(20, 0, 0), bfore=(-30, 0, 0), root=(0, 4, 0, 1.08, 0.94), **STANCE), 'snap'),
    k(22, P(torso=(16, 4, 1), head=(-14, 2, 0), hair=(14, 0, 0), fupper=(-66, 0, 0), ffore=(46, 0, 0), mic=(24, 0, 0), bupper=(16, 0, 0), root=(0, 4, 0), **STANCE), 'linear'),
    k(30, REST, 'back'),
], smear=())
# STAGE DIVE: a flat-out dive forward, arms first
DIVE = P(torso=(78, 6, 4), head=(14, 0, 0), hair=(-26, 0, 0), fupper=(-160, 0, 0), ffore=(10, 0, 0), bupper=(-170, 0, 0), bfore=(10, 0, 0), root=(0, 0, -6, 1.0, 1.0), **legs(-50, 30, -60, 40, 0, 0))
move('sideB', 34, [k(0, REST), k(6, P(**DEEP, torso=(14, 0, 2), fupper=(50, 0, 0), bupper=(50, 0, 0), head=(10, 0, 0)), 'out'), k(9, DIVE, 'snap'), k(22, mix(DIVE, root=(0, 0, -6, 1.05, 0.96), torso=(82, 6, 4)), 'linear'), k(34, AIR, 'inout')], smear=())
# CROWD SURF: laid back on a sea of hands, arms spread, riding upward
SURF = P(torso=(-86, -6, 6), head=(-12, 0, 0), hair=(24, 0, 0), fupper=(-130, 0, 0), ffore=(-20, 0, 0), bupper=(-150, 0, 0), bfore=(-20, 0, 0), root=(0, 0, -2), **legs(-66, 26, -76, 16, 0, 0))
move('upb', 40, [k(0, P(**DEEP, fupper=(30, 0, 0), bupper=(30, 0, 0))), k(8, SURF, 'snap'), k(18, mix(SURF, fupper=(-110, 0, 0), bupper=(-170, 0, 0))), k(28, mix(SURF, fupper=(-140, 0, 0), bupper=(-140, 0, 0), torso=(-90, -6, 6))), k(40, FALL, 'inout')], smear=())
# GRAFFITI TAG: pulls out a can, shakes it, and sprays his tag along the floor
SPRAY = P(_hide=(), torso=(20, 2, 2), head=(8, 0, 1), bupper=(-60, 3, 2), bfore=(-40, 0, 0), can=(-20, 0, 0), fupper=(-10, 0, 0), ffore=(10, 0, 0), root=(0, 0, 0, 1.08, 0.88), **legs(24, -34, -22, 34, 6, -6))
move('downB', 34, [
    k(0, P(_hide=())),
    k(4, P(_hide=(), bupper=(-120, 0, 0), bfore=(-40, 0, 0), can=(-30, 0, 0)), 'out'),
    k(6, P(_hide=(), bupper=(-100, 0, 0), bfore=(-20, 0, 0), can=(20, 0, 0)), 'inout'),             # shake shake
    k(8, P(_hide=(), bupper=(-120, 0, 0), bfore=(-40, 0, 0), can=(-30, 0, 0)), 'inout'),
    k(12, SPRAY, 'snap'),
    k(18, mix(SPRAY, bupper=(-30, 3, 2), _hide=()), 'inout'),
    k(24, mix(SPRAY, bupper=(-80, 3, 2), _hide=()), 'inout'),
    k(34, REST, 'back'),
], smear=())
# MOSH PIT (Limit): raises the mic high, holds it, then spikes it into the floor
move('limit', 120, [
    k(0, REST),
    k(20, P(torso=(-10, 0, -1), head=(-24, 0, 0), hair=(16, 0, 0), fupper=(-178, 0, -3), ffore=(-10, 0, 0), mic=(-10, 0, 0), bupper=(-150, 0, -2), root=(0, 0, -3, 0.94, 1.1))),
    k(40, P(torso=(-14, 0, -1), head=(-28, 0, 0), hair=(18, 0, 0), fupper=(-182, 0, -3), ffore=(-12, 0, 0), mic=(-10, 0, 0), bupper=(-158, 0, -2), root=(0, 0, -4, 0.92, 1.12))),
    k(44, P(torso=(36, 3, 6), head=(12, 1, 2), hair=(-12, 0, 0), fupper=(-20, 2, 3), ffore=(30, 0, 0), mic=(60, 0, 0), bupper=(-20, 0, 2), root=(0, 0, 0, 1.16, 0.78), **legs(58, -80, -22, 40, 18, -18)), 'snap'),
    k(100, P(torso=(28, 3, 5), head=(-14, 1, 2), hair=(14, 0, 0), fupper=(-20, 2, 3), ffore=(30, 0, 0), mic=(60, 0, 0), bupper=(-20, 0, 2), root=(0, 0, 0, 1.1, 0.84), **legs(50, -68, -20, 34, 16, -16)), 'linear'),
    k(120, REST, 'back'),
], step=4, smear=())
# ---- reactions
HURT = P(root=(-16, -2, 0, 1.08, 0.92), torso=(-16, -1, 0), head=(-26, -1, 0), hair=(26, 0, 0), fupper=(50, 0, 2), bupper=(60, 0, 0), **legs(28, 0, -28, 14))
move('hitstun', 16, [k(0, HURT), k(8, mix(HURT, root=(-20, -3, 0, 1.03, 0.97), head=(-32, -1, 0))), k(16, HURT)], smear=(), loop=True, step=2)
GUARD = P(root=(0, 0, 0, 1.05, 0.93), torso=(10, 0, 1), head=(10, 0, 1), fupper=(-104, 0, 0), ffore=(-64, 0, 0), bupper=(-94, 0, 0), bfore=(-64, 0, 0), **legs(12, -12, -12, 16))
move('shield', 24, [k(0, GUARD), k(12, mix(GUARD, torso=(12, 0, 1))), k(24, GUARD)], smear=(), loop=True, step=2)
HELD = P(root=(-10, 0, -2), torso=(-12, 0, 0), head=(-18, 0, 0), fupper=(70, 0, 0), bupper=(80, 0, 0), **legs(-16, 14, -28, 14))
move('grabbed', 16, [k(0, HELD), k(8, mix(HELD, head=(-8, 0, 0), bthigh=(-30, 0, 0))), k(16, HELD)], smear=(), loop=True, step=2)
HANG = P(fupper=(-175, 0, -2), ffore=(0, 0, 0), bupper=(-175, 0, -2), head=(-10, 0, 0), root=(0, 0, 0, 0.98, 1.04), **legs(12, 14, -8, 20))
move('ledge', 24, [k(0, HANG), k(12, mix(HANG, bthigh=(22, 0, 0), fthigh=(-14, 0, 0))), k(24, HANG)], smear=(), loop=True, step=2)

# ---- taunt: HEADBANG - throws a fist in the air and bangs his head to four beats, hair flying,
# then points the mic straight at them
HORNS = dict(bupper=(-60, 0, 0), bfore=(-30, 0, 0))
MIC_UP = dict(fupper=(-80, 0, -1), ffore=(90, 0, 0), mic=(0, 0, 0))          # the mic thrust up to the sky
def bang(down):
    return P(**HORNS, **MIC_UP, torso=(16, 2, 1) if down else (-6, -1, -1), head=(34, 2, 2) if down else (-22, 0, -1),
             root=(0, 0, 0, 1.05, 0.94) if down else (0, 0, -1, 0.98, 1.03), **(legs(18, -24, -20, 26, 6, -8) if down else legs(8, -6, -8, 8)))
POINT = P(torso=(14, 3, 0), head=(-10, 1, 0), fupper=(-40, 0, 0), ffore=(80, 0, 0), mic=(30, 0, 0), bupper=(30, 0, 0), bfore=(-40, 0, 0), root=(0, 3, 0, 1.04, 0.96), **STANCE)
move('taunt', 84, [k(0, REST), k(8, bang(False), 'back')]
     + [kk for b in range(4) for kk in (k(13 + 10 * b, bang(True), 'in'), k(18 + 10 * b, bang(False), 'out'))]
     + [k(54, mix(POINT, ffore=(-30, 0, 0), torso=(-4, 0, 0)), 'out'), k(58, POINT, 'snap'), k(74, mix(POINT, head=(-14, 1, 0)), 'inout'), k(84, REST, 'back')],
     smear=())


def strip(frames, path):
    sheet = Image.new('RGBA', (64 * len(frames), 64), (0, 0, 0, 0))
    for i, f in enumerate(frames): sheet.alpha_composite(Image.fromarray(f, 'RGBA'), (i * 64, 0))
    sheet.save(path)

def build_all(small, big, moves, out_dir, js, const, name, life_fn=life, idle=idle_keys, run=run_keys, jumps=None):
    os.makedirs(out_dir, exist_ok=True)
    J = jumps or ((JUMP, JUMP2), (FALL, FALL2))
    base = {
        'idle': animate(small, idle(), 192, step=6, life=life_fn),
        'run': animate(small, run(), 48, step=6, life=life_fn),
        'jump': animate(small, [k(0, J[0][0]), k(12, J[0][1]), k(24, J[0][0])], 24, step=6, life=life_fn),
        'fall': animate(small, [k(0, J[1][0]), k(12, J[1][1]), k(24, J[1][0])], 24, step=6, life=life_fn),
    }
    for nm, fr in base.items(): strip(fr, os.path.join(out_dir, nm + '_sheet.png'))
    out = {}
    for mname, (ticks, keys, step, smear, loop, center) in moves.items():
        out[mname] = animate(big, keys, ticks, step=step, smear=smear, smear_tint=GHOST, center=center, life=life_fn)
    idx = save_atlas(out, os.path.join(out_dir, 'moves_sheet.png'), cols=24)
    index = {n: idx[n] + [moves[n][2]] + ([1] if moves[n][4] else []) for n in moves}
    with open(js, 'w') as f:
        f.write('// Generated by tools/sprites/%s - do not edit by hand.\n' % name)
        f.write('// move animations in moves_sheet.png (112x104 frames, 24 to a row, feet at 56,95):\n')
        f.write('// move: [first frame, frame count, game ticks per frame, loops?]\n')
        f.write('export const %s = ' % const + json.dumps(index).replace('],', '],\n  ').replace('{', '{\n  ').replace(']}', '],\n};') + '\n')
    Image.fromarray(base['idle'][0]).crop((16, 0, 52, 19)).resize((72, 38), Image.NEAREST).save(os.path.join(out_dir, 'icon.png'))
    return base, out

def build():
    return build_all(SMALL, BIG, MOVES, DIR, JS, 'NU_MOVES', 'nu_moves.py')

if __name__ == '__main__':
    base, out = build()
    if '--preview' in sys.argv:
        d = sys.argv[sys.argv.index('--preview') + 1]; os.makedirs(d, exist_ok=True)
        for name, fr in {**base, **out}.items(): contact(fr, os.path.join(d, 'nu_' + name + '.png'))
    print('frames:', sum(len(f) for f in out.values()))

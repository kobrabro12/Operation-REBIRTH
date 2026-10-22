"""WHAT ONCE WAS: its animations, from its part-by-part drawing (tools/sprites/what_once_was_draw.py) on the
same puppet rig and joints as NU. Every move also picks what its TV head shows (static, a warning sign,
a MISSING poster, an eye, red static) by hiding the other screen layers.

What keeps it unsettling rather than stiff: it never quite stops twitching (a jerky head tick and a
lurch layered under every pose), its long arm drags and lags behind the body (drag), the power cord
swings, and its strikes snap out far too fast then hang there.

  idle / run / jump / fall strips (64x64) and moves_sheet.png (112x104, 24 to a row, feet at 56,95) - all
  drawn WITHOUT the head - for each body: the costumes' own (what-once-was/, frutiger/, root-access/,
  ronin/, each also with a menu_idle_sheet.png with the head on) and the bodies OUT OF BODY grows
  (body-suit/, body-swat/, body-doctor/). The TV heads -> what-once-was/heads.png, where the head is in
  every frame -> src/fighters/wowScreens.js, the animated MODE screens -> what-once-was/mode_screens.png,
  frame index -> src/fighters/wowMoves.js

  python3 tools/sprites/what_once_was_moves.py [--preview DIR]
"""
import os, sys, math, json
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image
from puppet import contact, pose_at
import what_once_was_draw as D
import nu_moves as N
from nu_moves import k, legs, CROUCH, DEEP, TUCK

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
DIR = os.path.join(ROOT, 'public/assets/fighters/what-once-was')
JS = os.path.join(ROOT, 'src/fighters/wowMoves.js')
SCR_JS = os.path.join(ROOT, 'src/fighters/wowScreens.js')
FOLLOW = {'head': (0.22, 0.2), 'cord': (0.6, 1.2), 'ffore': (0.25, 0.1), 'ffist': (0.35, 0.2), 'bfore': (0.2, 0)}
SMALL, BIG = N.build_rig(D, FOLLOW)
N.GHOST = (255, 236, 140)           # sickly yellow afterimages

def screen(name):
    return tuple(s for s in D.SCREENS if s != name)
def P(scr='scr_static', **kw):
    kw.setdefault('_hide', screen(scr))
    return kw
def mix(a, scr=None, **kw):
    out = {**a, **kw}
    if scr: out['_hide'] = screen(scr)
    return out
REST = P()
STANCE = legs(14, -6, -14, 10, 0, -6)
AIR = P(**TUCK, fupper=(-30, 0, 0), ffore=(-20, 0, 0), bupper=(-30, 0, 0), bfore=(-20, 0, 0))

def life(pose, t):
    """NU's breathing, plus a twitch: every so often the head jerks and the body lurches."""
    p = N.life(pose, t)
    hd = N.full(p.get('head'))
    if (t // 7) % 9 == 0: hd[0] += 7 * math.sin(t * 2.3)            # a sudden tick of the head
    hd[0] += 2 * math.sin(t * 0.37)
    p['head'] = tuple(hd)
    cd = N.full(p.get('cord')); cd[0] += 6 * math.sin(t * 0.13); p['cord'] = tuple(cd)
    fa = N.full(p.get('ffore')); fa[0] += 3 * math.sin(t * 0.11 + 1); p['ffore'] = tuple(fa)
    return p

MOVES = {}
def move(name, ticks, keys, step=1, smear=('ffore', 'ffist'), loop=False, center=None):
    MOVES[name] = (ticks, keys, step, smear, loop, center)

def borrow(name):
    ticks, keys, step, smear, loop, center = N.MOVES[name]
    keys = [(t, {**pose, '_hide': screen('scr_static')}, e) for (t, pose, e) in keys]
    MOVES[name] = (ticks, keys, step, tuple(x for x in smear if x in ('ffore', 'ffist', 'bfore')), loop, center)
for name in ('grab', 'holding', 'throw_forward', 'throw_back', 'throw_up', 'throw_down', 'hitstun', 'shield', 'grabbed', 'ledge'):
    borrow(name)

# ======================================================================= idle / run / air
def idle_keys():
    # swaying, the screen flicking to a MISSING poster... back to static... a flash of a warning sign
    SWAY = P(torso=(4, 0, 0), head=(-6, 0, 0), fupper=(6, 0, 0), ffore=(4, 0, 0))
    return [k(0, REST), k(40, SWAY), k(64, mix(SWAY, scr='scr_missing', head=(-10, 0, 0))), k(110, mix(SWAY, scr='scr_missing', head=(-4, 0, 0)), 'linear'),
            k(118, P(head=(10, 0, 0), torso=(-2, 0, 0))), k(150, P('scr_warn', head=(4, 0, 0))), k(162, REST, 'snap'), k(192, REST)]

def run_keys():
    # a lurching, uneven shamble - the swollen leg drags, the long arm swings low
    A = P(torso=(14, 1, 1), head=(-8, 0, 0), fupper=(-30, 0, 0), ffore=(-10, 0, 0), bupper=(30, 0, 0), root=(0, 0, 2, 1.05, 0.95), **legs(36, 26, -40, 16, 0, -10))
    B = P(torso=(18, 1, -1), head=(-14, 0, 0), fupper=(10, 0, 0), ffore=(10, 0, 0), bupper=(10, 0, 0), root=(0, 0, -2, 0.97, 1.04), **legs(-4, 60, -6, 12, -12, 0))
    C = P(torso=(12, 1, 1), head=(-4, 0, 0), fupper=(30, 0, 0), ffore=(16, 0, 0), bupper=(-30, 0, 0), root=(0, 0, 3, 1.06, 0.94), **legs(-22, 30, 18, 46, -6, 0))
    D2 = P(torso=(16, 1, 0), head=(-10, 0, 0), fupper=(0, 0, 0), ffore=(0, 0, 0), bupper=(-10, 0, 0), root=(0, 0, 0, 0.99, 1.02), **legs(-6, 12, -2, 50, 0, -10))
    return [k(0, A), k(10, B, 'out'), k(26, C, 'in'), k(36, D2, 'out'), k(48, A, 'in')]

JUMP = P(fupper=(-60, 0, 0), ffore=(-20, 0, 0), bupper=(-60, 0, 0), bfore=(-30, 0, 0), head=(-10, 0, 0), torso=(-4, 0, 0), **TUCK)
JUMP2 = P(fupper=(-70, 0, -1), ffore=(-26, 0, 0), bupper=(-70, 0, -1), bfore=(-30, 0, 0), head=(-14, 0, 0), torso=(-6, 0, 0), **legs(-28, 86, -54, 88, -20, -20))
FALL = P('scr_eye', fupper=(-40, 0, 0), ffore=(-20, 0, 0), bupper=(-70, 0, 0), bfore=(10, 0, 0), head=(10, 0, 0), torso=(4, 0, 0), **legs(20, 14, -14, 26, 0, -8))
FALL2 = P('scr_eye', fupper=(-50, 0, 0), ffore=(-26, 0, 0), bupper=(-80, 0, 0), bfore=(16, 0, 0), head=(8, 0, 0), torso=(3, 0, 0), **legs(26, 18, -20, 30, 0, -8))

# ======================================================================= ground attacks
# jab: SCREEN BASH - two headbutts with the TV, then a burst of static from the screen
BUTT = P(torso=(24, 4, 1), head=(30, 4, 2), fupper=(20, 0, 0), root=(0, 4, 0, 1.05, 0.95), **STANCE)
BACK = P(torso=(-6, -1, 0), head=(-14, -1, 0), root=(0, -1, 0, 0.98, 1.02))
move('jab', 28, [k(0, REST), k(3, BACK, 'out'), k(5, BUTT, 'snap'), k(8, BACK, 'out'), k(10, BUTT, 'snap'), k(13, BACK, 'out'),
                 k(16, P('scr_red', torso=(14, 3, 0), head=(-4, 3, 0), fupper=(10, 0, 0), root=(0, 3, 0, 1.06, 0.95), **STANCE), 'snap'),
                 k(21, P('scr_red', torso=(12, 3, 0), head=(-2, 3, 0), root=(0, 3, 0), **STANCE), 'linear'), k(28, REST, 'back')], smear=('head',))
# ftilt: LONG REACH - that too-long arm lashes straight out
move('ftilt', 30, [
    k(0, REST),
    k(7, P(fupper=(60, -1, 0), ffore=(20, 0, 0), torso=(-10, -2, 0), head=(6, 0, 0), root=(0, -2, 0, 0.98, 1.02), **legs(8, -4, -4, 4)), 'out'),
    k(10, P(fupper=(-70, 0, 0), ffore=(-24, 0, 0), ffist=(-20, 0, 0), torso=(18, 3, 0), head=(-8, 1, 0), root=(0, 4, 0, 1.04, 0.96), **STANCE), 'snap'),
    k(16, P(fupper=(-74, 0, 0), ffore=(-26, 0, 0), ffist=(-30, 0, 0), torso=(18, 3, 0), head=(-8, 1, 0), root=(0, 4, 0), **STANCE), 'linear'),
    k(30, REST, 'back'),
])
# utilt: ANTENNA WHIP - the head snaps back and the rabbit ears whip overhead
move('utilt', 24, [
    k(0, REST),
    k(4, P(head=(24, 1, 1), torso=(8, 0, 0), root=(0, 0, 1, 1.04, 0.96)), 'out'),
    k(7, P('scr_warn', head=(-70, -1, -2), torso=(-12, 0, -1), fupper=(20, 0, 0), root=(0, 0, -2, 0.94, 1.08)), 'snap'),
    k(13, P('scr_warn', head=(-90, -2, -2), torso=(-16, -1, -1), fupper=(26, 0, 0), root=(0, -1, -2, 0.95, 1.06)), 'linear'),
    k(24, REST, 'back'),
], smear=('head',))
# dtilt: CARPET CLAW - drops low and rakes the long arm along the floor
move('dtilt', 22, [
    k(0, REST),
    k(4, P(torso=(24, 0, 2), head=(-6, 0, 0), fupper=(40, 0, 0), ffore=(20, 0, 0), **CROUCH), 'out'),
    k(7, P(torso=(34, 1, 4), head=(-20, 0, 1), fupper=(-40, 0, 0), ffore=(-50, 0, 0), ffist=(-20, 0, 0), root=(0, 2, 3, 1.1, 0.84), **legs(30, -40, -30, 40, 8, -10)), 'snap'),
    k(13, P(torso=(32, 1, 4), head=(-18, 0, 1), fupper=(-46, 0, 0), ffore=(-56, 0, 0), ffist=(-30, 0, 0), root=(0, 2, 3, 1.1, 0.85), **legs(30, -40, -30, 40, 8, -10)), 'linear'),
    k(22, REST, 'back'),
])
# dash attack: LURCH - it trips forward and slides headfirst, screen first
LURCH = P('scr_static', torso=(60, 4, 6), head=(20, 2, 2), fupper=(-140, 0, 0), ffore=(-10, 0, 0), bupper=(-150, 0, 0), root=(0, 4, 6, 1.0, 1.0), **legs(-30, 20, -50, 30, 0, 0))
move('dashAttack', 34, [k(0, P(torso=(18, 2, 0), root=(0, 0, 0, 1.04, 0.96), **legs(30, 20, -30, 30))), k(5, LURCH, 'snap'), k(22, mix(LURCH, torso=(64, 4, 6)), 'linear'), k(34, REST, 'back')], smear=())

# ======================================================================= smash attacks
# fsmash: CRT BLAST - it rears back, the screen flashes a WARNING sign, then thrusts its head forward and
# the screen blasts out a beam of white light
REAR = P('scr_warn', torso=(-22, -3, 0), head=(-26, -2, -1), fupper=(40, 0, 0), bupper=(30, 0, 0), root=(0, -4, 0, 0.97, 1.04), **legs(14, -10, -10, 6))
BLAST = P('scr_warn', torso=(30, 5, 2), head=(16, 5, 2), fupper=(50, 0, 0), ffore=(10, 0, 0), bupper=(40, 0, 0), root=(0, 6, 1, 1.07, 0.93), **legs(24, -16, -26, 30, 6, -10))
move('fsmash', 48, [k(0, REST), k(10, REAR, 'out'), k(16, mix(REAR, torso=(-26, -3, 0), root=(0, -5, 0, 0.96, 1.06)), 'inout'),
                    k(18, BLAST, 'snap'), k(30, mix(BLAST, torso=(28, 5, 2)), 'linear'), k(48, REST, 'back')], smear=())
# usmash: ANTENNA SURGE - head thrown back, antennae to the sky, a column of red static
move('usmash', 44, [
    k(0, REST),
    k(10, P(torso=(26, 0, 2), head=(26, 1, 2), fupper=(40, 0, 0), **DEEP), 'out'),
    k(14, P('scr_red', torso=(-10, 0, -3), head=(-60, 0, -2), fupper=(-150, 0, -2), ffore=(-20, 0, 0), bupper=(-160, 0, -2), root=(0, 0, -6, 0.86, 1.18), **legs(18, 0, -18, 0)), 'snap'),
    k(26, P('scr_red', torso=(-8, 0, -2), head=(-56, 0, -2), fupper=(-145, 0, -2), ffore=(-16, 0, 0), bupper=(-150, 0, -2), root=(0, 0, -3, 0.95, 1.06)), 'linear'),
    k(44, REST, 'back'),
], smear=())
# dsmash: DEAD SIGNAL - slams the TV face-down into the floor; static crawls out both ways
move('dsmash', 44, [
    k(0, REST),
    k(10, P(torso=(-16, 0, -3), head=(-20, 0, 0), fupper=(-140, 0, -2), bupper=(-140, 0, -2), root=(0, 0, -5, 0.94, 1.08), **legs(10, 0, -10, 0)), 'out'),
    k(15, P('scr_static', torso=(70, 4, 8), head=(40, 2, 4), fupper=(-30, 0, 2), ffore=(20, 0, 0), bupper=(-20, 0, 2), root=(0, 2, 2, 1.12, 0.84), **legs(60, -80, -20, 40, 20, -20)), 'snap'),
    k(28, P('scr_static', torso=(66, 4, 8), head=(36, 2, 4), fupper=(-30, 0, 2), bupper=(-20, 0, 2), root=(0, 2, 2, 1.1, 0.86), **legs(58, -76, -20, 38, 18, -18)), 'linear'),
    k(44, REST, 'back'),
], smear=())

# ======================================================================= aerials
move('nair', 26, [k(0, AIR), k(4, P(**TUCK, fupper=(-90, 0, 0), ffore=(-20, 0, 0), bupper=(60, 0, 0), root=(-30, 0, -2, 0.96, 0.96)), 'out'),
                  k(15, P(**TUCK, fupper=(-90, 0, 0), ffore=(-20, 0, 0), bupper=(60, 0, 0), root=(340, 0, -2, 0.96, 0.96)), 'linear'),
                  k(19, mix(AIR, root=(372, 0, -1)), 'out'), k(26, mix(AIR, root=(360, 0, 0)), 'back')], smear=('ffore', 'ffist', 'head'), center=N.MID)
# fair: a flying headbutt, screen first
move('fair', 26, [k(0, AIR), k(6, P(torso=(-14, 0, 0), head=(-20, 0, 0), fupper=(40, 0, 0), root=(-10, 0, 0), **legs(-14, 70, 30, 100, 0, 0)), 'out'),
                  k(8, P('scr_red', torso=(30, 4, 0), head=(26, 4, 1), fupper=(60, 0, 0), bupper=(50, 0, 0), root=(10, 4, 0, 1.05, 0.96), **legs(-30, 60, -50, 60, 0, 0)), 'snap'),
                  k(14, P('scr_red', torso=(26, 3, 0), head=(22, 3, 1), fupper=(60, 0, 0), bupper=(50, 0, 0), root=(8, 3, 0), **legs(-30, 60, -50, 60, 0, 0)), 'linear'),
                  k(26, AIR, 'back')], smear=('head',))
# bair: the swollen leg kicks back
borrow('bair')
# uair: ANTENNA - head snapped straight up
move('uair', 24, [k(0, AIR), k(4, P(**TUCK, torso=(14, 0, 1), head=(30, 0, 1), root=(0, 0, 3, 1.06, 0.92)), 'out'),
                  k(6, P('scr_warn', **legs(-8, 24, -16, 24), torso=(-12, 0, -2), head=(-80, 0, -2), fupper=(-150, 0, -2), bupper=(-150, 0, -2), root=(0, 0, -4, 0.9, 1.14)), 'snap'),
                  k(12, P('scr_warn', **legs(-8, 24, -16, 24), torso=(-10, 0, -2), head=(-74, 0, -2), fupper=(-140, 0, -2), bupper=(-140, 0, -2), root=(0, 0, -3, 0.94, 1.08)), 'linear'),
                  k(24, AIR, 'back')], smear=('head',))
# dair: POWER CORD - curls up, then whips its cord straight down like a hook (a spike)
move('dair', 34, [k(0, AIR), k(8, P(**legs(-70, 120, -90, 120, -10, -10), torso=(14, 0, -3), head=(14, 0, 0), cord=(-60, 0, 0), fupper=(-150, 0, 0), bupper=(-150, 0, 0), root=(0, 0, -6, 1.06, 0.9)), 'out'),
                  k(10, P('scr_red', **legs(6, 0, -6, 0), torso=(-6, 0, 3), head=(-16, 0, 0), cord=(80, 0, 0), fupper=(-160, 0, -1), bupper=(-160, 0, -1), root=(0, 0, 5, 0.88, 1.16)), 'snap'),
                  k(22, P('scr_red', **legs(6, 0, -6, 0), torso=(-4, 0, 2), head=(-12, 0, 0), cord=(70, 0, 0), fupper=(-150, 0, -1), bupper=(-150, 0, -1), root=(0, 0, 3, 0.94, 1.08)), 'linear'),
                  k(34, AIR, 'back')], smear=('cord',))

# ======================================================================= specials
# MISSING POSTER (neutral): the screen shows the poster... and the long arm flings one out
move('neutralB', 30, [
    k(0, P('scr_missing')),
    k(8, P('scr_missing', fupper=(70, 0, 0), ffore=(30, 0, 0), torso=(-10, -1, 0), head=(-6, 0, 0), root=(0, -2, 0, 0.98, 1.03), **legs(8, -4, -6, 4)), 'out'),
    k(12, P('scr_missing', fupper=(-90, 0, 0), ffore=(-20, 0, 0), ffist=(-30, 0, 0), torso=(16, 3, 0), head=(-10, 1, 0), root=(0, 3, 0, 1.04, 0.97), **STANCE), 'snap'),
    k(18, P('scr_missing', fupper=(-96, 0, 0), ffore=(-24, 0, 0), ffist=(-40, 0, 0), torso=(16, 3, 0), head=(-10, 1, 0), root=(0, 3, 0), **STANCE), 'linear'),
    k(30, REST, 'back'),
])
# CHANNEL SURF (side): it dissolves into static, head first, and comes back further on
DIVE = P('scr_static', torso=(70, 6, 4), head=(30, 0, 0), fupper=(-150, 0, 0), ffore=(10, 0, 0), bupper=(-160, 0, 0), root=(0, 2, -3), **legs(-40, 30, -50, 40, 0, 0))
OUT = P('scr_red', torso=(-10, -2, 0), head=(-20, 0, 0), fupper=(-60, 0, 0), ffore=(-20, 0, 0), bupper=(-60, 0, 0), root=(0, 0, -2, 0.92, 1.1), **legs(18, -10, -16, 14, 0, -6))
move('sideB', 40, [k(0, REST), k(5, P(**DEEP, torso=(16, 0, 2), fupper=(40, 0, 0), bupper=(40, 0, 0), head=(10, 0, 0)), 'out'), k(8, DIVE, 'snap'),
                   k(20, mix(DIVE, torso=(76, 6, 4)), 'linear'), k(24, OUT, 'snap'), k(30, mix(OUT, root=(0, 0, 0, 1.04, 0.96)), 'out'), k(40, REST, 'back')], smear=())
# OUT OF BODY (up): it crouches, then heaves its whole body upward and the TV launches off its neck (the game
# flies the TV from frame 10; this body stays behind and plays body_drop)
HEAVE = P(torso=(-12, 0, -2), head=(-20, 0, -4), fupper=(-150, 0, -2), ffore=(-20, 0, 0), bupper=(-150, 0, -2), bfore=(-20, 0, 0), root=(0, 0, -4, 0.9, 1.14), **legs(8, 0, -8, 0))
move('upb', 16, [k(0, REST), k(6, P(**DEEP, torso=(20, 0, 2), fupper=(40, 0, 0), bupper=(40, 0, 0), head=(16, 0, 1))), k(9, HEAVE, 'snap'), k(16, mix(HEAVE, root=(0, 0, -3, 0.94, 1.08)), 'linear')], smear=())
# the body it left behind: arms still up, it staggers... its knees go... it slumps (the game sinks it into the floor)
move('body_drop', 48, [k(0, HEAVE), k(8, P(torso=(-16, -2, 0), fupper=(-60, 0, 0), ffore=(30, 0, 0), bupper=(-40, 0, 0), root=(0, -2, 0), **legs(10, -6, -14, 10)), 'out'),
                       k(18, P(torso=(10, 0, 4), fupper=(20, 0, 0), ffore=(10, 0, 0), bupper=(30, 0, 0), root=(0, 0, 8, 1.04, 0.9), **legs(70, -110, -40, 80, 20, -20)), 'in'),
                       k(30, P(torso=(56, 2, 6), fupper=(40, 0, 0), ffore=(20, 0, 0), bupper=(50, 0, 0), bfore=(10, 0, 0), root=(0, 0, 10, 1.06, 0.86), **legs(80, -130, -60, 110, 30, -30)), 'in'),
                       k(36, P(torso=(64, 2, 7), fupper=(50, 0, 0), ffore=(30, 0, 0), bupper=(60, 0, 0), bfore=(20, 0, 0), root=(0, 0, 12, 1.08, 0.84), **legs(84, -136, -64, 116, 30, -30)), 'out'),
                       k(48, P(torso=(66, 2, 7), fupper=(54, 0, 0), ffore=(30, 0, 0), bupper=(62, 0, 0), bfore=(20, 0, 0), root=(0, 0, 12, 1.08, 0.84), **legs(84, -136, -64, 116, 30, -30)))], step=2, smear=())
# a new body grows up out of the floor where the TV landed, bends down, picks the TV up and puts it on
# (the game moves the TV: on the floor in front until frame 34, lifted to the neck by frame 46)
GROWN = P(torso=(10, 0, 0), fupper=(10, 0, 0), ffore=(10, 0, 0), bupper=(10, 0, 0), root=(0, 0, 0, 1.0, 1.0), **legs(6, -4, -6, 6))
STOOP = P(torso=(56, 4, 6), fupper=(50, 0, 0), ffore=(20, 0, 0), bupper=(40, 0, 0), bfore=(10, 0, 0), root=(0, 2, 4, 1.04, 0.92), **legs(40, -70, -30, 50, 10, -10))
LIFT = P(torso=(-8, 0, -1), fupper=(-150, 0, -1), ffore=(-30, 0, 0), bupper=(-150, 0, -1), bfore=(-30, 0, 0), root=(0, 0, -2, 0.96, 1.06), **legs(6, 0, -6, 0))
move('regrow', 64, [k(0, mix(P(**DEEP), torso=(60, 0, 6), fupper=(80, 0, 0), bupper=(80, 0, 0), root=(0, 0, 6, 0.3, 0.06))), k(14, mix(P(**DEEP), torso=(40, 0, 4), fupper=(60, 0, 0), bupper=(60, 0, 0), root=(0, 0, 2, 0.8, 0.6)), 'out'),
                    k(24, GROWN, 'back'), k(32, STOOP, 'inout'), k(36, mix(STOOP, fupper=(40, 0, 0), bupper=(30, 0, 0)), 'inout'),
                    k(44, LIFT, 'inout'), k(48, mix(LIFT, fupper=(-120, 0, -1), bupper=(-125, 0, -1)), 'out'), k(56, mix(REST, torso=(-4, 0, 0)), 'back'), k(64, REST)], smear=())
# WRONG DOOR (down): sets a door frame down behind it
PLACE = P(torso=(-30, -2, 2), head=(-10, 0, 0), bupper=(70, -2, 2), bfore=(-40, 0, 0), fupper=(30, 0, 0), ffore=(10, 0, 0), root=(0, -2, 2, 1.06, 0.92), **legs(10, -20, -20, 30, 0, -6))
move('downB', 30, [k(0, REST), k(6, mix(PLACE, torso=(-20, -1, 1)), 'out'), k(12, PLACE, 'snap'), k(18, mix(PLACE, bupper=(50, -2, 2)), 'inout'), k(30, REST, 'back')], smear=())
move('doorwalk', 28, [k(0, REST), k(6, P(torso=(16, 2, 0), head=(-8, 0, 0), fupper=(-30, 0, 0), bupper=(30, 0, 0), root=(0, 2, 0), **legs(30, 20, -40, 20, 0, -8)), 'out'),
                      k(14, P(torso=(16, 2, 0), head=(-8, 0, 0), fupper=(10, 0, 0), bupper=(-30, 0, 0), root=(0, 2, 0), **legs(-20, 30, 22, 50, -8, 0)), 'inout'),
                      k(22, mix(REST, head=(10, 0, 0), torso=(-4, 0, 0)), 'out'), k(28, REST, 'back')], smear=())
# ======================================================================= MODE side specials (SEE / INCOMING / SMILE)
# SEE: the long arm shoots out to grab them by the neck (see_side); caught (see_hold): lifted, the claw
# twists - the snap - raised higher, then slammed down into the floor
SEE_REACH = P('scr_eye', fupper=(-62, 0, 0), ffore=(0, 0, 0), ffist=(-20, 0, 0), torso=(14, 3, 0), head=(-6, 1, 0), root=(0, 4, 0, 1.03, 0.97), **STANCE)
move('see_side', 30, [k(0, P('scr_eye')), k(5, P('scr_eye', fupper=(30, 0, 0), torso=(-8, -1, 0), head=(6, 0, 0), root=(0, -2, 0, 0.98, 1.02))), k(8, SEE_REACH, 'snap'),
                      k(14, mix(SEE_REACH, fupper=(-64, 0, 0)), 'linear'), k(30, P('scr_eye'), 'back')])
SEE_LIFT = P('scr_eye', fupper=(-110, 0, 0), ffore=(-10, 0, 0), ffist=(-30, 0, 0), torso=(-6, -1, 0), head=(-14, 0, 0), root=(0, 0, -1, 0.98, 1.03))
SEE_SLAM = P('scr_eye', fupper=(10, 0, 0), ffore=(10, 0, 0), ffist=(10, 0, 0), torso=(34, 4, 4), head=(10, 2, 2), root=(0, 4, 3, 1.1, 0.86), **legs(30, -40, -30, 40, 8, -10))
move('see_hold', 58, [k(0, SEE_REACH), k(12, SEE_LIFT, 'out'), k(20, mix(SEE_LIFT, head=(-18, 0, 0))), k(22, mix(SEE_LIFT, ffist=(40, 0, 0), head=(18, 0, 0)), 'snap'),
                      k(32, mix(SEE_LIFT, fupper=(-124, 0, 0), ffist=(40, 0, 0), head=(-10, 0, 0)), 'inout'), k(38, SEE_SLAM, 'snap'), k(48, mix(SEE_SLAM, torso=(30, 4, 4)), 'linear'), k(58, P('scr_eye'), 'back')])
# INCOMING: a shoulder-first lunge (inc_side); caught (inc_hold): pinned to the floor, a fury of blows with
# both arms, hauled up overhead, thrown
RUSH = P('scr_red', torso=(50, 6, 4), head=(20, 2, 2), fupper=(-90, 0, 0), ffore=(-10, 0, 0), bupper=(-80, 0, 0), root=(0, 4, 2, 1.05, 0.95), **legs(-30, 30, -50, 40, 0, 0))
move('inc_side', 34, [k(0, P('scr_red')), k(5, P('scr_red', **DEEP, torso=(16, 0, 2), fupper=(40, 0, 0), bupper=(40, 0, 0), head=(10, 0, 0)), 'out'), k(7, RUSH, 'snap'),
                      k(20, mix(RUSH, torso=(54, 6, 4)), 'linear'), k(34, P('scr_red'), 'back')], smear=('head', 'ffore'))
PIN = P('scr_red', torso=(46, 4, 6), head=(20, 2, 3), fupper=(-20, 0, 0), ffore=(10, 0, 0), bupper=(-10, 0, 0), root=(0, 2, 4, 1.1, 0.86), **legs(40, -60, -30, 50, 10, -10))
PUNCH_A = mix(PIN, fupper=(-80, 0, 0), ffore=(-30, 0, 0), bupper=(10, 0, 0))
PUNCH_B = mix(PIN, fupper=(20, 0, 0), ffore=(14, 0, 0), bupper=(-100, 0, 0), bfore=(-30, 0, 0))
HAUL = P('scr_red', torso=(-10, -1, -2), head=(-20, 0, 0), fupper=(-150, 0, 0), ffore=(-20, 0, 0), bupper=(-160, 0, 0), bfore=(-20, 0, 0), root=(0, 0, -3, 0.92, 1.1), **legs(10, 0, -10, 0))
HURL = P('scr_red', torso=(24, 4, 1), head=(-6, 2, 0), fupper=(-50, 0, 0), ffore=(0, 0, 0), bupper=(-40, 0, 0), root=(0, 5, 0, 1.06, 0.94), **STANCE)
move('inc_hold', 80, [k(0, RUSH), k(4, PIN, 'snap')] + [k(12 + 3 * i, PUNCH_A if i % 2 else PUNCH_B, 'snap') for i in range(11)]
                     + [k(46, PIN, 'out'), k(56, HAUL, 'out'), k(64, HURL, 'snap'), k(70, mix(HURL, torso=(22, 4, 1)), 'linear'), k(80, P('scr_red'), 'back')], smear=('ffore', 'ffist', 'bfore'))
# SMILE: a flicker - it crouches into the static and stands up somewhere else (smile_side); caught
# (smile_hold): a long shaking laugh, the power cord whips up over its head, shocks, and a flick to send them off
UP = P('scr_smile', head=(-10, 0, 0), torso=(-4, 0, 0), fupper=(-20, 0, 0), root=(0, 0, 0, 0.98, 1.03))
move('smile_side', 34, [k(0, P('scr_smile')), k(6, P('scr_smile', **{**CROUCH, 'torso': (10, 0, 1), 'head': (30, 0, 0)}), 'out'), k(8, UP, 'snap'), k(22, UP, 'linear'), k(34, P('scr_smile'), 'back')], smear=())
CORDUP = P('scr_smile', head=(10, 1, 1), cord=(-150, 0, 0), torso=(6, 0, 0), fupper=(-40, 0, 0), bupper=(20, 0, 0))
move('smile_hold', 96, [k(0, UP)] + [k(3 + 4 * i, mix(UP, head=(-34 if i % 2 else -12, 0, 0), torso=(-8 if i % 2 else 2, 0, 0), root=(0, 0, -1 if i % 2 else 0, 0.97, 1.04)), 'snap') for i in range(6)]
                       + [k(30, CORDUP, 'out')] + [k(44 + 2 * i, mix(CORDUP, root=(0, 1 if i % 2 else -1, 0), head=(14 if i % 2 else 6, 1, 1)), 'snap') for i in range(11)]
                       + [k(78, mix(CORDUP, cord=(-60, 0, 0), head=(-20, 0, 0)), 'snap'), k(84, mix(CORDUP, cord=(-50, 0, 0), head=(-24, 0, 0))), k(96, P('scr_smile'), 'back')], smear=('cord',))
# LEVEL 0 (Limit): the eye stares... then the screen floods red and it reaches out
move('limit', 160, [
    k(0, P('scr_eye')),
    k(16, P('scr_eye', head=(-10, 0, 0), torso=(-4, 0, 0), fupper=(-30, 0, 0), root=(0, 0, -1, 0.98, 1.03))),
    k(40, P('scr_eye', head=(-14, 0, 0), torso=(-6, 0, 0), fupper=(-36, 0, 0), root=(0, 0, -1, 0.97, 1.04))),
    k(48, P('scr_red', fupper=(-90, 0, 0), ffore=(-30, 0, 0), ffist=(-30, 0, 0), head=(10, 1, 1), torso=(14, 2, 1), root=(0, 2, 0, 1.03, 0.97)), 'snap'),
    k(140, P('scr_red', fupper=(-86, 0, 0), ffore=(-26, 0, 0), ffist=(-30, 0, 0), head=(14, 1, 1), torso=(16, 2, 1), root=(0, 2, 0, 1.02, 0.98)), 'linear'),
    k(160, REST, 'back'),
], step=4, smear=())
# ---- taunt: NO SIGNAL - its head tilts all the way over; the screen flicks through MISSING posters
TILT = P(head=(50, 2, 2), torso=(-4, 0, 0), fupper=(10, 0, 0))
move('taunt', 96, [k(0, REST), k(12, mix(TILT, scr='scr_missing'), 'out'), k(30, mix(TILT, scr='scr_static', head=(56, 2, 2)), 'snap'), k(40, mix(TILT, scr='scr_missing', head=(52, 2, 2)), 'snap'),
                   k(58, mix(TILT, scr='scr_eye', head=(-20, 0, 0)), 'snap'), k(80, mix(TILT, scr='scr_eye', head=(-24, 0, 0)), 'linear'), k(96, REST, 'back')], smear=())


# every body the TV can sit on, and where its sheets go. The costumes' own bodies, then the bodies OUT OF BODY
# can grow. All are drawn WITHOUT the head: the game draws the TV head (heads.png) on top, wherever wowScreens.js
# says it is, so any body can wear any costume's TV.
STYLE_DIRS = {'default': '', 'aero': 'frutiger', 'hack': 'root-access', 'ronin': 'ronin', 'suit': 'body-suit', 'swat': 'body-swat', 'doctor': 'body-doctor'}
HEAD_PARTS = ('head',) + tuple(D.SCREENS)
HEAD_CROP = (20, 0, 52, 32)                       # the box round the TV (with its neck, crest or hood) in heads.png

def screen_track(rig, keys, ticks, step, center, life_fn):
    """Where the screen is in every frame of one animation: [x, y] of its centre (in frame pixels, x10),
    its angle (degrees), scale (x100), and which baked screen picture the pose shows (index into D.SCREENS)."""
    out = []
    feet = rig.feet
    if center: rig.feet = center
    for t in range(0, ticks, step):
        pose = dict(pose_at(keys, t)); prev = dict(pose_at(keys, max(0, t - 3)))
        pose = life_fn(pose, t); prev = life_fn(prev, max(0, t - 3)); pose['_prev'] = prev
        M = rig.matrix('scr_static', pose)
        c = M @ np.array([36.5, 12.5, 1.0]); ux = M @ np.array([1.0, 0, 0]); uy = M @ np.array([0, 1.0, 0])
        ang = math.degrees(math.atan2(ux[1], ux[0]))
        shown = [i for i, n in enumerate(D.SCREENS) if n not in pose.get('_hide', ())]
        out.append([round(c[0] * 10), round(c[1] * 10), round(ang), round(math.hypot(ux[0], ux[1]) * 100), round(math.hypot(uy[0], uy[1]) * 100), shown[0] if shown else 0])
    rig.feet = feet
    return out

def without(rig, names):
    """The same rig with some parts left out of the drawing (their joints still move the rest)."""
    rig.order = [p for p in rig.order if p.name not in names]
    return rig

def build_style(style):
    D.set_style(style)
    small, big = N.build_rig(D, FOLLOW)
    d = os.path.join(DIR, STYLE_DIRS[style]) if STYLE_DIRS[style] else DIR
    os.makedirs(d, exist_ok=True)
    if style not in D.HUMAN:                      # the costume's whole look, head and all, for menus (select screens, results...)
        menu = N.animate(small, idle_keys(), 192, step=6, life=life)
        N.strip(menu, os.path.join(d, 'menu_idle_sheet.png'))
    hide = HEAD_PARTS + (('cord',) if style in D.HUMAN else ())
    base, out = N.build_all(without(small, hide), without(big, hide), MOVES, d, JS, 'WOW_MOVES', 'what_once_was_moves.py', life_fn=life, idle=idle_keys, run=run_keys, jumps=((JUMP, JUMP2), (FALL, FALL2)))
    icon = os.path.join(d, 'icon.png')                # build_all cropped a headless icon: the costumes get the TV head back
    if style in D.HUMAN: os.remove(icon)
    else: Image.fromarray(menu[0]).crop((22, 0, 50, 15)).resize((72, 38), Image.NEAREST).save(icon)
    return base, out

def heads_row(style):
    """The costume's TV head with each screen picture (D.SCREENS order), cropped to HEAD_CROP."""
    D.set_style(style)
    parts = D.draw_parts()
    tiles = []
    for scr in D.SCREENS:
        img = np.zeros((64, 64, 4), np.uint8)
        for n in ('head', scr):
            a = parts[n]; m = a[..., 3] > 0; img[m] = a[m]
        x1, y1, x2, y2 = HEAD_CROP
        tiles.append(img[y1:y2, x1:x2])
    return tiles

def build():
    for style in ('suit', 'swat', 'doctor', 'aero', 'hack', 'ronin', 'default'):
        base, out = build_style(style)
    D.set_style('default')
    small, big = N.build_rig(D, FOLLOW)
    # where the screen (and so the head) is in every frame - the same for every body: read by the game
    J = ((JUMP, JUMP2), (FALL, FALL2))
    track = {
        'idle': screen_track(small, idle_keys(), 192, 6, None, life), 'run': screen_track(small, run_keys(), 48, 6, None, life),
        'jump': screen_track(small, [k(0, J[0][0]), k(12, J[0][1]), k(24, J[0][0])], 24, 6, None, life),
        'fall': screen_track(small, [k(0, J[1][0]), k(12, J[1][1]), k(24, J[1][0])], 24, 6, None, life),
        'moves': [f for name, (ticks, keys, step, smear, loop, center) in MOVES.items() for f in screen_track(big, keys, ticks, step, center, life)],
    }
    with open(SCR_JS, 'w') as f:
        f.write('// Generated by tools/sprites/what_once_was_moves.py - do not edit by hand.\n')
        f.write('// WHAT ONCE WAS: where its TV head is in every frame of each sheet - [screen centre x*10, y*10, angle in\n')
        f.write('// degrees, x scale*100, y scale*100, which screen picture] in frame pixels. The game draws the head\n')
        f.write('// (heads.png) and its MODE screens there; the body sheets are drawn without a head.\n')
        f.write('export const WOW_SCREENS = ' + json.dumps(track, separators=(',', ':')) + ';\n')
        f.write('export const WOW_HEAD = ' + json.dumps({'w': HEAD_CROP[2] - HEAD_CROP[0], 'h': HEAD_CROP[3] - HEAD_CROP[1], 'ox': 36.5 - HEAD_CROP[0], 'oy': 12.5 - HEAD_CROP[1], 'screens': len(D.SCREENS)}) + ';\n')
    # the TV heads, one row per costume, one column per screen picture
    rows = [heads_row(st) for st in ('default', 'aero', 'hack', 'ronin')]
    hw, hh = HEAD_CROP[2] - HEAD_CROP[0], HEAD_CROP[3] - HEAD_CROP[1]
    sheet = Image.new('RGBA', (hw * len(D.SCREENS), hh * len(rows)), (0, 0, 0, 0))
    for r, tiles in enumerate(rows):
        for i, tl in enumerate(tiles): sheet.alpha_composite(Image.fromarray(tl, 'RGBA'), (i * hw, r * hh))
    sheet.save(os.path.join(DIR, 'heads.png'))
    # the animated MODE screens, one row per costume: SEE x4, INCOMING x4, SMILE x4 (11x9 frames)
    rows = [D.mode_screens(st) for st in ('default', 'aero', 'hack', 'ronin')]
    sheet = Image.new('RGBA', (D.MODE_W * 12, D.MODE_H * len(rows)), (0, 0, 0, 0))
    for r, frames in enumerate(rows):
        for i, fr in enumerate(frames): sheet.alpha_composite(Image.fromarray(fr, 'RGBA'), (i * D.MODE_W, r * D.MODE_H))
    sheet.save(os.path.join(DIR, 'mode_screens.png'))
    return base, out

if __name__ == '__main__':
    base, out = build()
    if '--preview' in sys.argv:
        d = sys.argv[sys.argv.index('--preview') + 1]; os.makedirs(d, exist_ok=True)
        for name, fr in {**base, **out}.items(): contact(fr, os.path.join(d, 'wow_' + name + '.png'))
    print('frames:', sum(len(f) for f in out.values()))

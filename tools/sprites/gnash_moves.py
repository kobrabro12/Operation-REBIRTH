"""GNASH (the street punk kid with the giant neon axe): his animations, from his drawing (gnash_draw.py) on NU's puppet rig (show_moves.build). His normals use
NU's poses (nu_moves.MOVES - same joints and frame timings, so the hitboxes in gnash.js line up, the axe where NU has
his mic); his idle, specials, Limit and taunt are his own (below):

  idle      - the axe propped up at his side, chest heaving, rolling his neck; now and then he hefts it
  neutralB  - SEETHE (loops while held): crouched, roaring at the sky, shaking - his RAGE meter fills
  sideB     - AXE THROW: winds the axe back over his shoulder and hurls it end over end (hidden while it's out)
  upb       - SKYSPLITTER: down low, then a rising uppercut that carries the axe up over his head
  downB     - GROUND SPLITTER: axe overhead and down into the floor (the blow bounces him up) ...
  downB2    - ... then, in the air, overhead again and down - the second slam
  limit     - EXECUTIONER: hauls the axe up, leaps, and brings it down
  taunt     - axe on his shoulder, a big shaking laugh

  -> public/assets/fighters/gnash/[<costume>/]{idle,run,jump,fall}_sheet.png (64x64) + moves_sheet.png (112x104,
     36 to a row, feet at 56,95), icon.png; frame table src/fighters/gnMoves.js.

  python3 tools/sprites/gnash_moves.py [--preview DIR]
"""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
import nu_moves as N
from nu_moves import k, P, mix, legs, CROUCH, DEEP, STANCE, FALL
import gnash_draw
from show_moves import build

GN = {}
def gmove(name, ticks, keys, step=1, smear=(), loop=False): GN[name] = (ticks, keys, step, smear, loop, None)

def gnash_idle():
    """The axe propped up at his side, his big chest heaving, rolling his neck; every other loop he hefts the axe."""
    keys = []
    for i in range(0, 193, 6):
        br = math.sin(i * math.pi / 24); heft = max(0, math.sin((i - 120) * math.pi / 48)) if 120 <= i <= 168 else 0
        keys.append(k(i, P(torso=(2 + 2 * br, 0, 0), head=(-4 + 6 * math.sin(i * math.pi / 96), 0, 0), hair=(3 * br, 0, 0),
                           fupper=(-10 - 30 * heft, 0, 0), ffore=(10 + 50 * heft, 0, 0), mic=(-10 * heft, 0, -3 * heft),
                           bupper=(12, 0, 0), bfore=(-14 + 4 * br, 0, 0), root=(0, 0, 0, 1 + 0.025 * br, 1 - 0.02 * br), **legs(6, -4, -8, 6)), 'linear'))
    return keys

# ---- his big swings
OVER = P(torso=(-14, -2, -1), head=(-12, 0, 0), fupper=(-170, 0, -2), ffore=(140, 0, 0), mic=(-30, 0, 0), bupper=(-150, 0, -1), bfore=(-30, 0, 0), root=(0, -2, -2, 0.96, 1.05), **legs(10, -4, -10, 6))
CHOP = P(torso=(32, 5, 3), head=(6, 1, 1), fupper=(-40, 3, 2), ffore=(80, 0, 0), mic=(130, 0, 0), bupper=(-20, 0, 0), bfore=(-20, 0, 0), root=(0, 6, 1, 1.1, 0.9), **legs(30, -14, -30, 24, 0, -10))
LOW = P(torso=(22, 3, 2), head=(10, 0, 0), fupper=(40, 0, 0), ffore=(30, 0, 0), mic=(150, 0, 0), bupper=(30, 0, 0), bfore=(20, 0, 0), **DEEP)
HIGH = P(torso=(-12, -1, -2), head=(-22, 0, 0), fupper=(-165, 0, -2), ffore=(165, 0, 0), mic=(10, 0, 0), bupper=(-60, 0, 0), bfore=(-20, 0, 0), root=(0, 0, -3, 0.92, 1.1), **legs(-10, 20, -16, 20, -6, -6))
ROAR = lambda s: P(torso=(-12 + s, -1, 0), head=(-28 + 2 * s, 0, 0), hair=(-10, 0, 0), fupper=(24, 0, 0), ffore=(30, 0, 0), mic=(70, 0, 0), bupper=(34 + 2 * s, 0, 0), bfore=(40, 0, 0),
                   root=(s * 0.6, 0, 0, 1.06, 0.94), **legs(24, -20, -24, 24, 8, -10))
NOAXE = ('mic',)

# SEETHE (neutral, loops while held): crouched, roaring at the sky, shaking all over
gmove('neutralB', 24, [k(0, ROAR(-1)), k(3, ROAR(1), 'linear'), k(6, ROAR(-1), 'linear'), k(9, ROAR(1), 'linear'), k(12, ROAR(-1), 'linear'), k(15, ROAR(1), 'linear'), k(18, ROAR(-1), 'linear'), k(21, ROAR(1), 'linear'), k(24, ROAR(-1), 'linear')], loop=True)
# AXE THROW (side): winds it back over his shoulder, then hurls it - his hand's empty till it comes back
gmove('sideB', 46, [k(0, P()), k(8, mix(OVER, torso=(-20, -2, -1), fupper=(-190, -1, -2), ffore=(120, 0, 0), mic=(-40, 0, 0)), 'out'),
                    k(12, P(_hide=NOAXE, torso=(26, 5, 1), head=(-10, 2, 0), fupper=(-70, 0, 0), ffore=(10, 0, 0), bupper=(40, 0, 0), root=(0, 5, 0, 1.06, 0.95), **STANCE), 'snap'),
                    k(26, P(_hide=NOAXE, torso=(12, 2, 0), fupper=(-60, 0, 0), ffore=(20, 0, 0), **STANCE), 'inout'), k(38, P(_hide=NOAXE, fupper=(-30, 0, 0), ffore=(60, 0, 0)), 'inout'), k(46, P(fupper=(-10, 0, 0), ffore=(10, 0, 0)), 'snap')], smear=('ffore', 'fupper'))
# SKYSPLITTER (up): down low, then a rising uppercut that carries the axe up over his head
gmove('upb', 40, [k(0, LOW), k(6, mix(LOW, torso=(26, 4, 2)), 'out'), k(10, HIGH, 'snap'), k(24, mix(HIGH, torso=(-16, -1, -2), mic=(25, 0, 0)), 'inout'), k(40, FALL, 'inout')], smear=('ffore', 'mic', 'fupper'))
# GROUND SPLITTER (down): overhead, CHOP into the floor (the blow bounces him up)...
gmove('downB', 30, [k(0, P()), k(8, OVER, 'out'), k(12, CHOP, 'snap'), k(20, mix(CHOP, torso=(30, 5, 3)), 'linear'), k(30, mix(OVER, **legs(-20, 40, -30, 40, -10, -10)), 'inout')], smear=('ffore', 'mic', 'fupper'))
# ... and the second slam, in the air: axe overhead, legs tucked, then down
gmove('downB2', 30, [k(0, mix(OVER, **legs(-20, 40, -30, 40, -10, -10))), k(10, mix(OVER, torso=(-20, -2, -2), fupper=(-185, 0, -2), ffore=(130, 0, 0)), 'inout'), k(14, CHOP, 'snap'), k(30, mix(CHOP, torso=(26, 4, 2)), 'linear')], smear=('ffore', 'mic', 'fupper'))
# EXECUTIONER (limit): hauls the axe up, a great leap, holds at the top - and brings it down
gmove('limit', 150, [k(0, P()), k(14, mix(LOW, mic=(170, 0, 0)), 'out'), k(26, HIGH, 'snap'), k(40, mix(OVER, **legs(-30, 60, -40, 60, -10, -10)), 'inout'),
                     k(96, mix(OVER, torso=(-22, -2, -2), fupper=(-190, 0, -2), ffore=(125, 0, 0), **legs(-30, 60, -40, 60, -10, -10)), 'inout'), k(102, CHOP, 'snap'), k(140, mix(CHOP, torso=(28, 4, 2)), 'linear'), k(150, P(), 'inout')], step=2)
# THE TAUNT: axe up on his shoulder, then a big shaking laugh, head thrown back
SHOULDER = P(fupper=(-200, 0, 0), ffore=(110, 0, 0), mic=(-60, 0, 0), torso=(-4, 0, 0), head=(-6, 0, 0), bupper=(-30, 0, 0), bfore=(-60, 0, 0))
LAUGH = lambda s: mix(SHOULDER, torso=(-12 + 4 * s, -1, 0), head=(-28 + 6 * s, 0, 0), hair=(-8 * s, 0, 0), root=(0, 0, s, 1 + 0.03 * s, 1 - 0.03 * s), bupper=(20, 0, 0), bfore=(90, 0, 0))
gmove('taunt', 84, [k(0, P()), k(12, SHOULDER, 'out'), k(20, mix(SHOULDER, head=(-2, 0, 0)), 'inout')] + [k(26 + 6 * i, LAUGH(1 if i % 2 else 0), 'inout') for i in range(8)] + [k(84, P(), 'back')], step=2)

if __name__ == '__main__':
    build(gnash_draw, {**N.FOLLOW, 'hair': (0.25, 0.5), 'mic': (0.35, 0.3), 'bfore': (0.2, 0)}, GN, 'gnash', 'gnMoves.js', 'GN_MOVES', gnash_idle, ['default', 'bloodmoon', 'gravestone'], (255, 120, 60))
    print('done')

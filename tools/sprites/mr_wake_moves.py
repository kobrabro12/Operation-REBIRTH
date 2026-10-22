"""Mr Wake's move animations: every attack, special, grab and throw, hurt, shield and ledge poses, plus his
jump and fall - animated like a person, not a cut-out: he's a full puppet (tools/sprites/mw_rig.py, cut from
Mason's idle drawing) with a shoulder, elbow and wrist on his staff arm, and hips, knees and ankles under the
robe (each half of the robe skirt rides on a leg, so it parts when he steps).

How the poses are made (biped.Body): his hips move, his torso leans, his boots are planted where they should
be and the legs bend to reach them, his arm is aimed by direction, and the staff by where its GEM points
(staff=('w', d): 0 = forward, 90 = down, -90 = up, 180 = back). Under every pose he breathes, his head and
hat lag a beat, and his cloak trails every swing.

Runs once per costume: the default drawing and the Rosebud costume (roses/idle_sheet.png - same silhouette,
the staff a green stem). Output: moves_sheet.png (176x120 frames, feet at 92,109) and jump_sheet.png /
fall_sheet.png (64x64, 4 frames) in public/assets/fighters/mr-wake/ (and roses/), and the frame index
src/fighters/mwMoves.js: [first frame, frame count, game ticks per frame, loops?].

  python3 tools/sprites/mr_wake_moves.py [--preview DIR]
"""
import os, sys, json, math
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from puppet import animate, save_atlas, contact
import mw_rig, biped
from mw_rig import body as B

DIR = mw_rig.DIR
JS = os.path.join(mw_rig.ROOT, 'src/fighters/mwMoves.js')
FOLLOW = {'cape': (0.7, 1.4), 'head': (0.18, 0.12)}
MID = (37, 38)

def life(pose, t):
    p = dict(pose)
    def add(name, i, v):
        a = list(p.get(name, ())) + [0, 0, 0, 1, 1][len(p.get(name, ())):]
        a[i] += v; p[name] = tuple(a)
    br = math.sin(t * 0.09)
    add('torso', 0, br * 0.8); add('torso', 2, br * 0.3)
    add('head', 0, math.sin(t * 0.09 + 1.0) * 1.6)
    add('cape', 0, 4 * math.sin(t * 0.15) + 2 * math.sin(t * 0.41))
    return p

def k(t, pose, ease='inout'): return (t, pose, ease)
MOVES = {}
def move(name, ticks, keys, step=None, smear=('staff', 'staffback'), loop=False, center=None):
    step = step or (2 if ticks >= 38 else 1)      # long moves at 30 fps keep the sheet under 4096 px tall
    MOVES[name] = (ticks, biped.unwrap(keys), step, smear, loop, center)
def S(d): return ('w', d)        # point the gem: 0 forward, 90 down, -90 up, 180 back

REST = B()
CROUCH = dict(hip=(0, 6), bfoot=(-3, 0), ffoot=(3, 0))
DEEP = dict(hip=(0, 11), bfoot=(-5, 0), ffoot=(5, 0))
WIDE = dict(hip=(3, 3), bfoot=(-4, 0), ffoot=(9, 0))
TUCK = dict(bfoot=(6, -9), ffoot=(4, -8))
HANG = dict(bfoot=(-1, 2), ffoot=(1, 3))
AIR = B(**TUCK, lean=4, fa=50, ff=0, staff=S(-150))

# ======================================================================= ground attacks
# jab: a baseball-bat swing - staff cocked back over his shoulder, then a big flat swing through the front
move('jab', 23, [k(0, REST),
    k(6, B(lean=-8, head=4, hip=(-2, 0), bfoot=(-1, 0), fa=-30, ff=-110, staff=S(-150), cape=-10), 'out'),
    k(9, B(lean=12, head=-6, **WIDE, fa=10, ff=0, staff=S(0), cape=20), 'snap'),
    k(13, B(lean=14, head=-6, **WIDE, fa=40, ff=40, staff=S(45), cape=24), 'out'),
    k(23, REST, 'back')])
# ftilt: flips the staff round and thrusts the gem straight out in front
move('ftilt', 24, [k(0, REST),
    k(6, B(lean=-8, head=4, hip=(-3, 0), bfoot=(-2, 0), fa=120, ff=170, staff=S(0), cape=-10), 'out'),
    k(9, B(lean=14, head=-6, **WIDE, fa=0, ff=0, staff=S(0), cape=22), 'snap'),
    k(13, B(lean=14, head=-6, **WIDE, fa=2, ff=2, staff=S(2), cape=26), 'linear'),
    k(24, REST, 'back')])
# dtilt: drops low and sweeps the staff along the ground
LOW = dict(hip=(2, 11), bfoot=(-6, 0), ffoot=(7, 0), lean=26, head=-12, cape=16)
move('dtilt', 20, [k(0, REST),
    k(3, B(**{**LOW, 'lean': 18}, fa=80, ff=80, staff=S(150)), 'out'),
    k(6, B(**LOW, fa=60, ff=30, staff=S(12)), 'snap'),
    k(9, B(**LOW, fa=50, ff=20, staff=S(2)), 'out'),
    k(20, REST, 'back')])
# utilt: twirls the staff overhead like a propeller
UPH = dict(hip=(0, -1), lean=-6, head=-12, fa=-80, ff=-92, cape=-12)
move('utilt', 23, [k(0, REST), k(4, B(**UPH, staff=S(0)), 'out')]
     + [k(5 + 2 * i, B(**UPH, staff=S(-90 * (i + 1))), 'linear') for i in range(5)]
     + [k(23, REST, 'back')])
# ======================================================================= smash attacks
# fsmash: raises the gem high behind him (charging), then slams it down in front with everything
move('fsmash', 47, [k(0, REST),
    k(14, B(lean=-12, head=6, hip=(-3, -1), bfoot=(-3, 0), fa=-110, ff=-130, staff=S(-130), cape=-14), 'out'),
    k(17, B(lean=-14, head=7, hip=(-3, -1), bfoot=(-3, 0), fa=-114, ff=-136, staff=S(-136), cape=-16)),
    k(19, B(lean=24, head=-10, hip=(4, 7), bfoot=(-5, 0), ffoot=(11, 0), fa=30, ff=40, staff=S(28), cape=28), 'snap'),
    k(24, B(lean=26, head=-10, hip=(4, 7), bfoot=(-5, 0), ffoot=(11, 0), fa=36, ff=50, staff=S(40), cape=32), 'out'),
    k(34, B(lean=10, head=-4, **CROUCH, fa=50, ff=20, staff=S(-60), cape=10), 'inout'),
    k(47, REST, 'back')])
# usmash: plants himself and thrusts the gem straight up overhead, up on his toes
move('usmash', 45, [k(0, REST),
    k(12, B(**DEEP, lean=14, head=6, fa=80, ff=80, staff=S(-100)), 'out'),
    k(15, B(hip=(0, -4), bfoot=(-1, -2), ffoot=(1, -2), btoe=-20, ftoe=-20, lean=-4, head=-14, fa=-84, ff=-90, staff=S(-90), cape=-18), 'snap'),
    k(21, B(hip=(0, -3), bfoot=(-1, -1), ffoot=(1, -1), btoe=-14, ftoe=-14, lean=-3, head=-12, fa=-86, ff=-90, staff=S(-90), cape=-14), 'out'),
    k(32, B(lean=-2, head=-4, fa=-30, ff=-60, staff=S(-120)), 'inout'),
    k(45, REST, 'back')])
# dsmash: a cloak spin - crouches and whirls the staff round both sides at ankle height
move('dsmash', 43, [k(0, REST),
    k(10, B(**DEEP, lean=10, fa=60, ff=-40, staff=S(-150), cape=-10), 'out'),
    k(13, B(**DEEP, lean=22, head=-8, fa=70, ff=40, staff=S(12), cape=20), 'snap'),
    k(15, B(**DEEP, lean=16, head=-2, fa=80, ff=80, staff=S(90), cape=6), 'linear'),
    k(18, B(**DEEP, lean=6, head=6, fa=90, ff=120, staff=S(170), cape=-14), 'out'),
    k(30, B(**CROUCH, lean=4, fa=60, ff=20, staff=S(-120)), 'inout'),
    k(43, REST, 'back')])
# ======================================================================= aerials
# nair: tucks and spins, the staff held out like a wheel spoke
move('nair', 23, [k(0, AIR), k(3, B(**TUCK, lean=6, fa=10, ff=0, staff=S(0)), 'out'),
    k(8, B(**TUCK, lean=6, fa=10, ff=0, staff=S(0), spin=180), 'linear'), k(12, B(**TUCK, lean=6, fa=10, ff=0, staff=S(0), spin=360), 'linear'),
    k(23, AIR, 'back')], center=MID)
# fair: an overhead chop with the gem end, bringing it down in front
move('fair', 30, [k(0, AIR),
    k(7, B(**TUCK, lean=-10, head=6, fa=-100, ff=-125, staff=S(-110), cape=-12), 'out'),
    k(10, B(**TUCK, lean=18, head=-8, fa=20, ff=30, staff=S(35), cape=22), 'snap'),
    k(14, B(**TUCK, lean=20, head=-8, fa=40, ff=55, staff=S(65), cape=26), 'out'),
    k(30, AIR, 'back')])
# bair: whips the staff out behind him, the cloak flaring
move('bair', 25, [k(0, AIR),
    k(5, B(**TUCK, lean=8, fa=40, ff=10, staff=S(20), cape=-10), 'out'),
    k(8, B(**TUCK, lean=16, head=-6, fa=165, ff=175, staff=S(178), cape=36), 'snap'),
    k(11, B(**TUCK, lean=16, head=-6, fa=165, ff=175, staff=S(176), cape=40), 'linear'),
    k(25, AIR, 'back')])
# uair: drives the gem straight up overhead
move('uair', 26, [k(0, AIR),
    k(4, B(**TUCK, lean=10, fa=60, ff=30, staff=S(-20)), 'out'),
    k(6, B(**HANG, lean=-6, head=-14, fa=-84, ff=-90, staff=S(-90), cape=-18), 'snap'),
    k(11, B(**HANG, lean=-6, head=-14, fa=-86, ff=-92, staff=S(-92), cape=-20), 'linear'),
    k(26, AIR, 'back')])
# dair: raises the staff, then drives it straight down beneath him, legs splayed
move('dair', 39, [k(0, AIR),
    k(10, B(**TUCK, lean=6, head=6, fa=-100, ff=-110, staff=S(-90), cape=-16), 'out'),
    k(14, B(bfoot=(-9, -4), ffoot=(9, -4), lean=2, head=10, fa=80, ff=90, staff=S(90), cape=10), 'snap'),
    k(18, B(bfoot=(-9, -4), ffoot=(9, -4), lean=2, head=10, fa=82, ff=90, staff=S(90), cape=12), 'linear'),
    k(39, AIR, 'back')])
# ======================================================================= grab and throws (he hooks them with the staff)
REACH = B(lean=12, head=-6, hip=(3, 1), ffoot=(5, 0), fa=0, ff=0, staff=S(10), cape=14)
move('grab', 30, [k(0, REST), k(4, B(lean=-2, fa=90, ff=60, staff=S(-60)), 'out'), k(6, REACH, 'snap'), k(12, REACH, 'linear'), k(30, REST, 'back')])
HOLD = dict(lean=9, head=-4, hip=(2, 1), ffoot=(3, 0), cape=8)
move('holding', 24, [k(0, B(**HOLD, fa=10, ff=5, staff=S(20))), k(12, B(**{**HOLD, 'lean': 11}, fa=12, ff=8, staff=S(24))), k(24, B(**HOLD, fa=10, ff=5, staff=S(20)))], loop=True, smear=())
move('throw_forward', 18, [k(0, B(**HOLD, fa=10, ff=5, staff=S(20))), k(4, B(lean=-8, hip=(-2, 0), fa=120, ff=150, staff=S(-150), cape=-10), 'out'),
    k(7, B(lean=16, head=-8, **WIDE, fa=0, ff=-6, staff=S(5), cape=24), 'snap'), k(18, REST, 'back')])
move('throw_back', 18, [k(0, B(**HOLD, fa=10, ff=5, staff=S(20))), k(4, B(lean=6, fa=40, ff=30, staff=S(40)), 'out'),
    k(7, B(lean=-12, head=10, hip=(-3, 0), bfoot=(-8, 0), fa=160, ff=175, staff=S(172), cape=-20), 'snap'), k(18, REST, 'back')])
move('throw_up', 18, [k(0, B(**HOLD, fa=10, ff=5, staff=S(20))), k(4, B(**CROUCH, lean=10, fa=60, ff=40, staff=S(30)), 'out'),
    k(7, B(hip=(0, -2), lean=-8, head=-16, fa=-84, ff=-90, staff=S(-90), cape=-18), 'snap'), k(18, REST, 'back')])
move('throw_down', 18, [k(0, B(**HOLD, fa=10, ff=5, staff=S(20))), k(4, B(hip=(0, -1), lean=-6, fa=-50, ff=-70, staff=S(-80)), 'out'),
    k(7, B(**DEEP, lean=26, head=-10, fa=70, ff=90, staff=S(90), cape=18), 'snap'), k(18, REST, 'back')])
# ======================================================================= specials
# Void Orb: draws the gem back, then swings it forward and the orb leaves it at frame 11
move('neutralB', 28, [k(0, REST),
    k(7, B(lean=-10, head=6, hip=(-2, 0), bfoot=(-2, 0), fa=140, ff=170, staff=S(-172), cape=-12), 'out'),
    k(11, B(lean=12, head=-6, **WIDE, fa=8, ff=0, staff=S(0), cape=22), 'snap'),
    k(16, B(lean=12, head=-6, **WIDE, fa=8, ff=2, staff=S(4), cape=24), 'linear'), k(28, REST, 'back')])
# Drifting Soul: lifts the gem and a lost soul rises out of it, released with an open sweep
move('sideB', 39, [k(0, REST),
    k(10, B(hip=(0, -1), lean=-6, head=-10, fa=-60, ff=-80, staff=S(-70), cape=-10), 'out'),
    k(16, B(lean=10, head=-4, hip=(2, 1), ffoot=(5, 0), fa=10, ff=0, staff=S(0), cape=18), 'back'),
    k(24, B(lean=10, head=-4, hip=(2, 1), ffoot=(5, 0), fa=12, ff=4, staff=S(6), cape=20), 'linear'), k(39, REST, 'back')])
# Shadow Pool: stabs the staff down into the ground and sinks low as his body seeps out
SINK = dict(hip=(0, 15), bfoot=(-6, 0), ffoot=(6, 0), lean=20, head=10, cape=10)
move('downB', 50, [k(0, REST),
    k(8, B(hip=(0, -2), lean=-6, head=-6, fa=-40, ff=-80, staff=S(-90), cape=-10), 'out'),
    k(10, B(**SINK, fa=70, ff=90, staff=S(-90)), 'snap'),
    k(33, B(**{**SINK, 'hip': (0, 17), 'squash': (1.08, 0.86)}, fa=72, ff=92, staff=S(-90)), 'linear'),
    k(42, B(**CROUCH, lean=6, fa=40, ff=30, staff=S(-120)), 'out'), k(50, REST, 'back')])
# Gem Rocket: points the gem at the floor beneath him and blasts off it, his body stretched upward
ROCKET = dict(hip=(0, -3), **HANG, btoe=40, ftoe=40, lean=-4, head=-12, fa=90, ff=90, cape=30)
move('upb', 38, [k(0, B(**CROUCH, lean=10, fa=80, ff=60, staff=S(60))),
    k(6, B(**DEEP, lean=14, fa=88, ff=90, staff=S(90), cape=6), 'out'),
    k(8, B(**ROCKET, staff=S(90)), 'snap'), k(17, B(**ROCKET, staff=S(92)), 'linear'),
    k(24, B(**TUCK, lean=-6, head=-10, fa=-40, ff=-60, staff=S(-120), cape=-10), 'out'), k(38, AIR, 'inout')], smear=())
# ======================================================================= reactions
def hurt(s): return B(hip=(-3 - s, -1), bfoot=(-2, 0), lean=-14 - 4 * s, head=-18 - 4 * s, fa=150, ff=170, staff=S(-110), cape=-30 - 8 * s)
move('hitstun', 16, [k(0, hurt(0)), k(8, hurt(1)), k(16, hurt(0))], loop=True, smear=())
GUARD = dict(hip=(0, 4), bfoot=(-3, 0), ffoot=(3, 0), lean=6, head=6, cape=8)
move('shield', 24, [k(0, B(**GUARD, fa=20, ff=-60, staff=S(-90))), k(12, B(**{**GUARD, 'lean': 7}, fa=22, ff=-62, staff=S(-92))), k(24, B(**GUARD, fa=20, ff=-60, staff=S(-90)))], loop=True, smear=())
def held(s): return B(hip=(0, -2), bfoot=(-2 + 3 * s, 2), ffoot=(2 - 3 * s, 3), lean=-10 + 4 * s, head=-12, fa=60 + 20 * s, ff=30 - 30 * s, staff=S(-120), cape=24)
move('grabbed', 16, [k(0, held(0)), k(8, held(1)), k(16, held(0))], loop=True, smear=())
def hang(s): return B(lean=-4, head=-8, bfoot=(-1 + 2 * s, 2), ffoot=(1, 3), fa=-80, ff=-88, staff=S(-150), cape=-8)
move('ledge', 24, [k(0, hang(0)), k(12, hang(1)), k(24, hang(0))], loop=True, smear=())
# ======================================================================= taunt: GEM TWIRL
# spins the staff twice overhead like a baton, catches it, plants it at his side and tips his head in a bow
PLANT = dict(fa=70, ff=40, staff=S(-90))
move('taunt', 82, [k(0, REST), k(8, B(**UPH, staff=S(-90)), 'out')]
     + [k(10 + 4 * i, B(**UPH, staff=S(-90 - 90 * (i + 1))), 'linear') for i in range(8)]
     + [k(46, B(lean=2, **PLANT), 'back'), k(56, B(lean=26, head=24, hip=(1, 2), **PLANT, cape=8), 'inout'),
        k(66, B(lean=26, head=26, hip=(1, 2), **PLANT, cape=10), 'inout'), k(82, REST, 'back')], smear=())

# ======================================================================= jump / fall (64x64 strips, 4 frames)
JUMP = B(**TUCK, lean=-4, head=-8, fa=40, ff=10, staff=S(-140), cape=-20)
JUMP2 = B(bfoot=(5, -11), ffoot=(4, -10), lean=-6, head=-10, fa=36, ff=6, staff=S(-136), cape=-26)
FALL = B(**HANG, lean=4, head=6, fa=30, ff=-10, staff=S(-160), cape=26)
FALL2 = B(bfoot=(0, 3), ffoot=(1, 2), lean=3, head=5, fa=26, ff=-16, staff=S(-164), cape=32)

def strip(frames, path):
    sheet = Image.new('RGBA', (64 * len(frames), 64), (0, 0, 0, 0))
    for i, f in enumerate(frames): sheet.alpha_composite(Image.fromarray(f, 'RGBA'), (i * 64, 0))
    sheet.save(path)

def build(src='idle_sheet.png', sub='', staff_cols=mw_rig.STAFF_COLS, width=2.3):
    small, big, L, base = mw_rig.build_rig(src, staff_cols, width, follow=FOLLOW)
    ghost = tuple(int(v) for v in base[13, 13, :3]) if base[13, 13, 3] else (214, 51, 108)   # the gem's purple (or the tulip's pink)
    d = os.path.join(DIR, sub)
    for nm, (a, b) in {'jump': (JUMP, JUMP2), 'fall': (FALL, FALL2)}.items():
        strip(animate(small, [k(0, a), k(12, b), k(24, a)], 24, step=6, life=life), os.path.join(d, nm + '_sheet.png'))
    out = {}
    for name, (ticks, keys, step, smear, loop, center) in MOVES.items():
        out[name] = animate(big, keys, ticks, step=step, smear=smear, smear_tint=ghost, center=center, life=life)
    idx = save_atlas(out, os.path.join(d, 'moves_sheet.png'), cols=23)
    return out, idx

if __name__ == '__main__':
    out, idx = build()
    build('roses/idle_sheet.png', 'roses', mw_rig.STEM_COLS, 3.6)
    index = {n: idx[n] + [MOVES[n][2]] + ([1] if MOVES[n][4] else []) for n in MOVES}
    with open(JS, 'w') as f:
        f.write('// Generated by tools/sprites/mr_wake_moves.py - do not edit by hand.\n')
        f.write('// Mr Wake move animations in moves_sheet.png (176x120 frames, 23 to a row, feet at 92,109):\n')
        f.write('// move: [first frame, frame count, game ticks per frame, loops?]\n')
        f.write('export const MW_MOVES = ' + json.dumps(index).replace('],', '],\n  ').replace('{', '{\n  ').replace(']}', '],\n};') + '\n')
    if '--preview' in sys.argv:
        d = sys.argv[sys.argv.index('--preview') + 1]; os.makedirs(d, exist_ok=True)
        for name, fr in out.items(): contact(fr, os.path.join(d, 'mw_' + name + '.png'))
    print('frames:', sum(len(f) for f in out.values()))

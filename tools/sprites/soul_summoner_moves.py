"""Soul Summoner's move animations: every attack, special, grab and throw, hurt, shield and ledge poses,
plus his jump and fall - animated like a person, not a cut-out: he's a full puppet (tools/sprites/ss_rig.py,
cut from Mason's idle drawing) with shoulders, elbows, wrists, hips, knees and ankles.

How the poses are made (biped.Body): the hips move, the torso leans, the FEET are planted where they
should be and the legs bend to reach them (so his weight shifts and his knees bend instead of the whole
body tilting like a plank), and each arm is aimed at a direction on screen. Under every pose he breathes,
his head lags a beat behind his body, his cape trails every swing and streams in the air, and the
soulfire keeps burning upward whatever his arm does.

Output: public/assets/fighters/soul-summoner/moves_sheet.png - 112x104 frames, his feet at (56, 94) -
and jump_sheet.png / fall_sheet.png (64x64, 4 frames); src/fighters/ssMoves.js gets each move's
[first frame, frame count, game ticks per frame, loops?]. His idle and the designer's run are kept as drawn.

  python3 tools/sprites/soul_summoner_moves.py [--preview DIR]
"""
import os, sys, json, math
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from puppet import animate, save_atlas, contact
import ss_rig, biped
from ss_rig import body as B

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
DIR = os.path.join(ROOT, 'public/assets/fighters/soul-summoner')
JS = os.path.join(ROOT, 'src/fighters/ssMoves.js')
FOLLOW = {'cape': (0.7, 1.5), 'head': (0.15, 0.1), 'flame': (0.6, 0.4)}
SMALL, BIG, _ = ss_rig.build_rig(follow=FOLLOW)
GHOST = (120, 160, 198)          # his light flame blue (skins recolour it with the rest)
MID = (32, 34)                   # spin round the middle of the body for flips

def life(pose, t):
    """Breathing, the head settling a beat late, the cape stirring."""
    p = dict(pose)
    def add(name, i, v):
        a = list(p.get(name, ())) + [0, 0, 0, 1, 1][len(p.get(name, ())):]
        a[i] += v; p[name] = tuple(a)
    br = math.sin(t * 0.1)
    add('torso', 0, br * 1.0); add('torso', 2, br * 0.3)
    add('head', 0, math.sin(t * 0.1 + 0.9) * 1.5)
    add('cape', 0, 5 * math.sin(t * 0.17) + 2 * math.sin(t * 0.43))
    return p

def k(t, pose, ease='inout'): return (t, pose, ease)
MOVES = {}
def move(name, ticks, keys, step=1, smear=('ffore', 'ffist', 'flame'), loop=False, center=None):
    MOVES[name] = (ticks, biped.unwrap(keys), step, smear, loop, center)
def FL(sx, sy=None): return (0, 0, 0, sx, sy if sy is not None else sx)    # flame size

# ---- building blocks. Arms by direction: 0 forward, 90 down, -90 up, 180 back. REST: fa 45, ff 0 (flame held out).
REST = B()
CROUCH = dict(hip=(0, 6), bfoot=(-3, 0), ffoot=(3, 0))
DEEP = dict(hip=(0, 10), bfoot=(-5, 0), ffoot=(5, 0))
WIDE = dict(hip=(2, 3), bfoot=(-5, 0), ffoot=(8, 0))              # lunging: front foot steps out, weight on it
TUCK = dict(bfoot=(5, -9), ffoot=(5, -8))                         # in the air: knees drawn up
HANG = dict(bfoot=(-1, 2), ffoot=(2, 3))                          # in the air: legs dangling
AIR = B(**TUCK, fa=60, ff=10, ba=110, bf=80, lean=4)

# ======================================================================= ground attacks
# jab: a quick flame punch - the elbow cocks back, then the palm snaps out and the weight shifts onto the front foot
move('jab', 18, [k(0, REST),
    k(2, B(lean=-4, head=-2, hip=(-1, 0), fa=110, ff=-40, ba=60, bf=90, cape=-6), 'out'),
    k(4, B(lean=10, head=-6, hip=(3, 1), ffoot=(5, 0), fa=-2, ff=-2, ba=130, bf=110, cape=12), 'snap'),
    k(8, B(lean=9, head=-5, hip=(3, 1), ffoot=(5, 0), fa=0, ff=2, ba=130, bf=110, cape=16), 'linear'),
    k(18, REST, 'back')])
# ftilt: a wide rake of flame - winds it up high behind his head, steps in and sweeps it down across the front
move('ftilt', 28, [k(0, REST),
    k(5, B(lean=-10, head=4, hip=(-2, -1), bfoot=(-1, 0), fa=-120, ff=-150, ba=40, bf=70, cape=-10), 'out'),
    k(7, B(lean=-12, head=5, hip=(-2, -1), fa=-128, ff=-160, ba=40, bf=70, cape=-12)),
    k(9, B(lean=18, head=-8, **WIDE, fa=10, ff=30, ba=150, bf=130, cape=24), 'snap'),
    k(13, B(lean=22, head=-6, **WIDE, fa=55, ff=75, ba=150, bf=140, cape=28), 'out'),
    k(28, REST, 'back')])
# utilt: swings the flame up and over his head in an arc, arching his back
move('utilt', 26, [k(0, REST),
    k(3, B(**CROUCH, lean=10, head=4, fa=70, ff=100, ba=80, bf=90), 'out'),
    k(6, B(hip=(0, -2), lean=-6, head=-10, fa=-50, ff=-75, ba=110, bf=100, cape=-14), 'snap'),
    k(10, B(hip=(-1, -1), lean=-14, head=-16, fa=-105, ff=-140, ba=120, bf=100, cape=-20), 'out'),
    k(26, REST, 'back')])
# dtilt: drops into a crouch and sweeps the flame along the floor
LOWSWEEP = dict(hip=(2, 11), bfoot=(-6, 0), ffoot=(7, 0), lean=28, head=-14, ba=150, bf=120, cape=20)
move('dtilt', 20, [k(0, REST),
    k(3, B(**{**LOWSWEEP, 'lean': 22}, fa=120, ff=160), 'out'),
    k(5, B(**LOWSWEEP, fa=50, ff=12), 'snap'),
    k(8, B(**LOWSWEEP, fa=40, ff=2), 'out'),
    k(20, REST, 'back')])
# dash attack (uses ftilt's anim in game if none): a running shoulder of flame
# ======================================================================= smash attacks
# Soul Flare: draws the flame all the way back behind him, swelling, then shoves it forward underhand with a lunge
move('fsmash', 44, [k(0, REST),
    k(10, B(lean=-14, head=8, hip=(-4, 1), bfoot=(-6, 0), ffoot=(2, 0), fa=150, ff=170, ba=10, bf=-20, cape=-16, flame=FL(1.2)), 'out'),
    k(15, B(lean=-16, head=9, hip=(-5, 1), bfoot=(-6, 0), ffoot=(2, 0), fa=155, ff=176, ba=10, bf=-25, cape=-18, flame=FL(1.4)), 'inout'),
    k(17, B(lean=20, head=-8, hip=(6, 2), bfoot=(-4, 0), ffoot=(13, 0), fa=8, ff=-2, ba=160, bf=140, cape=30, flame=FL(1.5)), 'snap'),
    k(22, B(lean=22, head=-8, hip=(6, 2), bfoot=(-4, 0), ffoot=(13, 0), fa=12, ff=4, ba=160, bf=140, cape=34, flame=FL(1.3)), 'out'),
    k(32, B(lean=10, head=-4, hip=(3, 1), bfoot=(-2, 0), ffoot=(8, 0), fa=35, ff=10, ba=120, bf=100, cape=14), 'inout'),
    k(44, REST, 'back')])
# Pyre: crouches low, then thrusts the flame straight up, rising onto his toes as it roars into a pillar
move('usmash', 42, [k(0, REST),
    k(10, B(**DEEP, lean=16, head=6, fa=100, ff=120, ba=60, bf=80, cape=6, flame=FL(0.9)), 'out'),
    k(12, B(**DEEP, lean=18, head=7, fa=104, ff=126, ba=60, bf=80, cape=8, flame=FL(0.9))),
    k(14, B(hip=(0, -4), bfoot=(-1, -2), ffoot=(1, -2), btoe=-20, ftoe=-20, lean=-6, head=-16, fa=-88, ff=-90, ba=120, bf=110, cape=-26, flame=FL(1.6, 1.9)), 'snap'),
    k(20, B(hip=(0, -3), bfoot=(-1, -1), ffoot=(1, -1), btoe=-14, ftoe=-14, lean=-5, head=-14, fa=-90, ff=-92, ba=120, bf=110, cape=-22, flame=FL(1.4, 1.6)), 'out'),
    k(30, B(lean=-2, head=-6, fa=-40, ff=-60, ba=100, bf=90, cape=-8), 'inout'),
    k(42, REST, 'back')])
# Grave Sweep: crouches and sweeps the flame low in front, then all the way round behind him
move('dsmash', 42, [k(0, REST),
    k(9, B(**DEEP, lean=14, head=4, fa=-60, ff=-100, ba=100, bf=110, flame=FL(1.2)), 'out'),
    k(11, B(**DEEP, lean=26, head=-10, fa=40, ff=8, ba=150, bf=130, cape=16, flame=FL(1.3)), 'snap'),
    k(13, B(**DEEP, lean=20, head=-4, fa=90, ff=100, ba=150, bf=130, cape=8, flame=FL(1.3)), 'linear'),
    k(16, B(**DEEP, lean=4, head=6, fa=150, ff=172, ba=40, bf=20, cape=-6, flame=FL(1.2)), 'out'),
    k(28, B(**CROUCH, lean=6, fa=110, ff=150, ba=80, bf=90), 'inout'),
    k(42, REST, 'back')])
# ======================================================================= aerials
# nair: a full body flip, the flame trailing a ring round him
move('nair', 26, [k(0, AIR),
    k(3, B(**TUCK, lean=10, fa=0, ff=0, ba=150, bf=150), 'out'),
    k(8, B(**TUCK, lean=10, fa=0, ff=0, ba=150, bf=150, spin=180), 'linear'),
    k(13, B(**TUCK, lean=10, fa=0, ff=0, ba=150, bf=150, spin=360), 'linear'),
    k(26, AIR, 'back')], center=MID)
# fair: an overhead chop of flame to the front, his body folding over it
move('fair', 28, [k(0, AIR),
    k(5, B(**TUCK, lean=-12, head=6, fa=-115, ff=-150, ba=60, bf=80, cape=-14), 'out'),
    k(8, B(**TUCK, lean=22, head=-10, fa=30, ff=55, ba=150, bf=130, cape=24), 'snap'),
    k(12, B(**TUCK, lean=24, head=-8, fa=60, ff=85, ba=150, bf=130, cape=28), 'out'),
    k(28, AIR, 'back')])
# bair: turns his shoulder and drives a heel back behind him, the cape lashing with it
move('bair', 26, [k(0, AIR),
    k(4, B(bfoot=(4, -10), ffoot=(6, -9), lean=6, head=-4, fa=40, ff=20, ba=110, bf=90, cape=-10), 'out'),
    k(6, B(bfoot=(-18, -10), ffoot=(5, -8), btoe=-60, lean=24, head=-12, fa=150, ff=160, ba=170, bf=160, cape=40), 'snap'),
    k(9, B(bfoot=(-17, -10), ffoot=(5, -8), btoe=-60, lean=22, head=-10, fa=150, ff=160, ba=170, bf=160, cape=44), 'linear'),
    k(26, AIR, 'back')], smear=('bthigh', 'bshin', 'bshoe', 'cape'))
# uair: flings the flame straight up over his head in a fan
move('uair', 24, [k(0, AIR),
    k(3, B(**TUCK, lean=12, head=6, fa=110, ff=130, ba=40, bf=60), 'out'),
    k(5, B(**HANG, lean=-6, head=-16, fa=-70, ff=-80, ba=120, bf=110, cape=-20, flame=FL(1.3, 1.5)), 'snap'),
    k(9, B(**HANG, lean=-10, head=-18, fa=-100, ff=-120, ba=120, bf=110, cape=-24, flame=FL(1.2, 1.4)), 'out'),
    k(24, AIR, 'back')])
# dair: curls up tight, then stomps both heels down with the flame thrust under him
move('dair', 32, [k(0, AIR),
    k(6, B(bfoot=(6, -14), ffoot=(7, -13), lean=14, head=8, fa=-40, ff=-80, ba=-40, bf=-80, cape=-20), 'out'),
    k(9, B(bfoot=(-1, 4), ffoot=(2, 4), btoe=30, ftoe=30, lean=4, head=10, fa=88, ff=90, ba=100, bf=100, cape=10, flame=FL(1.3)), 'snap'),
    k(13, B(bfoot=(-1, 4), ffoot=(2, 4), btoe=30, ftoe=30, lean=4, head=10, fa=88, ff=92, ba=100, bf=100, cape=14), 'linear'),
    k(32, AIR, 'back')])
# ======================================================================= grab and throws
REACH = B(lean=12, head=-6, hip=(3, 1), ffoot=(5, 0), fa=0, ff=-2, ba=120, bf=100, cape=12)
move('grab', 26, [k(0, REST), k(3, B(lean=-2, fa=90, ff=60, ba=60, bf=80), 'out'), k(5, REACH, 'snap'), k(10, REACH, 'linear'), k(26, REST, 'back')])
HOLD = dict(lean=8, head=-4, hip=(2, 1), ffoot=(3, 0), ba=110, bf=100, cape=8)
move('holding', 24, [k(0, B(**HOLD, fa=4, ff=-4)), k(12, B(**{**HOLD, 'lean': 10}, fa=6, ff=-10)), k(24, B(**HOLD, fa=4, ff=-4))], loop=True, smear=())
move('throw_forward', 18, [k(0, B(**HOLD, fa=4, ff=-4)), k(4, B(lean=-6, hip=(-2, 0), fa=110, ff=150, ba=40, bf=60, cape=-8), 'out'),
    k(7, B(lean=16, head=-8, **WIDE, fa=-8, ff=-20, ba=150, bf=130, cape=24), 'snap'), k(18, REST, 'back')])
move('throw_back', 18, [k(0, B(**HOLD, fa=4, ff=-4)), k(4, B(lean=6, fa=40, ff=30, ba=90, bf=90), 'out'),
    k(7, B(lean=-14, head=10, hip=(-3, 0), bfoot=(-8, 0), fa=-170, ff=180, ba=60, bf=40, cape=-20), 'snap'), k(18, REST, 'back')])
move('throw_up', 18, [k(0, B(**HOLD, fa=4, ff=-4)), k(4, B(**CROUCH, lean=10, fa=60, ff=40), 'out'),
    k(7, B(hip=(0, -2), lean=-8, head=-16, fa=-85, ff=-95, ba=120, bf=110, cape=-18), 'snap'), k(18, REST, 'back')])
move('throw_down', 18, [k(0, B(**HOLD, fa=4, ff=-4)), k(4, B(hip=(0, -1), lean=-6, fa=-40, ff=-70), 'out'),
    k(7, B(**DEEP, lean=26, head=-10, fa=75, ff=90, ba=150, bf=120, cape=18), 'snap'), k(18, REST, 'back')])
# ======================================================================= specials
# fireball charge (loops): coiled back, palm held out where the fireball gathers, the flame swelling
COIL = dict(lean=-8, head=2, hip=(-2, 2), bfoot=(-4, 0), ffoot=(4, 0), ba=60, bf=40, cape=-12)
move('charge', 24, [k(0, B(**COIL, fa=20, ff=-4, flame=FL(1.2))), k(12, B(**{**COIL, 'lean': -10}, fa=22, ff=-8, flame=FL(1.4))), k(24, B(**COIL, fa=20, ff=-4, flame=FL(1.2)))], loop=True, smear=())
# fireball: shoves the flame forward with his whole body
move('fireball', 16, [k(0, B(**COIL, fa=20, ff=-4)), k(3, B(lean=14, head=-6, **WIDE, fa=-2, ff=-4, ba=150, bf=130, cape=24), 'snap'),
    k(7, B(lean=12, head=-5, **WIDE, fa=0, ff=0, ba=150, bf=130, cape=26), 'linear'), k(16, REST, 'back')])
# Soul Hex: draws a sigil in the air with the flame (a full circle with his forearm), then thrusts the curse forward
SIG = dict(lean=-2, head=-6, ba=90, bf=70)
move('sideB', 34, [k(0, REST)] + [k(1 + i, B(**SIG, fa=10, ff=-90 + i * 45), 'linear') for i in range(8)]
     + [k(9, B(lean=16, head=-8, **WIDE, fa=-4, ff=-4, ba=150, bf=140, cape=24, flame=FL(1.3)), 'snap'),
        k(14, B(lean=14, head=-6, **WIDE, fa=-2, ff=0, ba=150, bf=140, cape=28), 'linear'), k(34, REST, 'back')])
# summon: raises the flame high, then kneels and plunges it into the ground, and the dead rise
KNEEL = dict(hip=(2, 13), bfoot=(-9, 0), ffoot=(7, 0), btoe=40, lean=24, head=-6, ba=110, bf=90, cape=10)
move('summon', 40, [k(0, REST),
    k(12, B(hip=(0, -1), lean=-10, head=-16, fa=-90, ff=-92, ba=100, bf=90, cape=-18, flame=FL(1.3, 1.5)), 'out'),
    k(20, B(**KNEEL, fa=82, ff=92, flame=FL(1.4, 0.8)), 'snap'),
    k(30, B(**KNEEL, fa=84, ff=94, flame=FL(1.2, 0.9)), 'linear'),
    k(40, REST, 'back')])
# Soulfire Jet: a crouch, then he streamlines upward - arm pointing up, legs together, cape streaming below
STREAM = dict(hip=(0, -2), bfoot=(1, 3), ffoot=(-1, 3), btoe=40, ftoe=40, lean=-4, head=-10, ba=100, bf=95, cape=10)
move('upb', 40, [k(0, B(**DEEP, lean=12, fa=90, ff=100, ba=80, bf=90)),
    k(6, B(**STREAM, fa=-90, ff=-90, flame=FL(1.2, 1.6)), 'snap'),
    k(27, B(**{**STREAM, 'cape': 14}, fa=-92, ff=-92, flame=FL(1.2, 1.6)), 'linear'),
    k(31, B(**TUCK, lean=-10, head=-16, fa=-150, ff=-160, ba=-30, bf=-50, cape=10), 'snap'),
    k(40, AIR, 'inout')], smear=())
# Soulfire Beam (Limit): gathers the fire overhead, then braces wide and holds his palm out at the enemy
RAISED = B(hip=(0, -1), lean=-10, head=-16, fa=-90, ff=-92, ba=110, bf=100, cape=-22)
BRACE = dict(hip=(0, 5), bfoot=(-8, 0), ffoot=(9, 0), lean=12, head=-4, ba=160, bf=140, cape=34)
move('limit', 118, [k(0, REST),
    k(16, {**RAISED, 'flame': FL(1.3, 1.4)}), k(34, {**RAISED, 'flame': FL(1.6, 1.7), 'head': (-18, 0, 0)}),
    k(42, B(**BRACE, fa=-2, ff=-2, flame=FL(0.9)), 'snap'), k(102, B(**{**BRACE, 'lean': 14}, fa=0, ff=0, flame=FL(0.9)), 'linear'),
    k(118, REST, 'inout')], step=4)
# ======================================================================= reactions
def recoil(s): return B(hip=(-3 - s, -1), bfoot=(-2, 0), lean=-16 - 4 * s, head=-20 - 4 * s, fa=150 + 10 * s, ff=170, ba=-130, bf=-100, cape=-30 - 8 * s)
move('hitstun', 16, [k(0, recoil(0)), k(8, recoil(1)), k(16, recoil(0))], loop=True, smear=())
GUARD = dict(hip=(0, 4), bfoot=(-3, 0), ffoot=(3, 0), lean=8, head=6, ba=110, bf=60, cape=8)
move('shield', 24, [k(0, B(**GUARD, fa=20, ff=-80)), k(12, B(**{**GUARD, 'lean': 9}, fa=22, ff=-82)), k(24, B(**GUARD, fa=20, ff=-80))], loop=True, smear=())
def held(s): return B(hip=(0, -2), bfoot=(-2 + 3 * s, 2), ffoot=(2 - 3 * s, 3), lean=-10 + 4 * s, head=-12, fa=60 + 20 * s, ff=30 - 30 * s, ba=110, bf=140, cape=-24)
move('grabbed', 16, [k(0, held(0)), k(8, held(1)), k(16, held(0))], loop=True, smear=())
def hang(s): return B(lean=-4, head=-8, bfoot=(-1 + 2 * s, 2), ffoot=(1, 3), fa=-80, ff=-88, ba=110, bf=100, cape=-8)
move('ledge', 24, [k(0, hang(0)), k(12, hang(1)), k(24, hang(0))], loop=True, smear=())
# ======================================================================= taunt: SOUL FLARE
# gathers the flame low, thrusts it overhead where it swells and roars, then lowers his palm and beckons them in
BECKON = dict(hip=(1, 2), bfoot=(-3, 0), ffoot=(4, 0), lean=8, head=-4, ba=120, bf=100, cape=14)
move('taunt', 80, [k(0, REST),
    k(10, B(**DEEP, lean=18, head=6, fa=80, ff=60, ba=80, bf=90, cape=14, flame=FL(0.8)), 'out'),
    k(16, {**RAISED, 'flame': FL(1.7, 1.9)}, 'back'),
    k(26, {**RAISED, 'flame': FL(2.1, 2.3), 'head': (-20, 0, 0)}, 'inout'),
    k(34, {**RAISED, 'flame': FL(1.8, 2.0)}, 'inout'),
    k(42, {**RAISED, 'flame': FL(2.2, 2.4), 'head': (-20, 0, 0)}, 'inout'),
    k(50, B(**BECKON, fa=10, ff=-4), 'back'), k(56, B(**BECKON, fa=10, ff=-60), 'inout'),
    k(62, B(**BECKON, fa=10, ff=-6), 'inout'), k(68, B(**BECKON, fa=10, ff=-62), 'inout'),
    k(80, REST, 'back')], smear=())

# ======================================================================= jump / fall (64x64 strips, 4 frames)
JUMP = B(**TUCK, lean=-4, head=-8, fa=40, ff=60, ba=70, bf=90, cape=-30, flame=FL(1.1, 0.8))
JUMP2 = B(bfoot=(4, -11), ffoot=(5, -10), lean=-6, head=-10, fa=36, ff=56, ba=60, bf=80, cape=-36, flame=FL(1.1, 0.75))
FALL = B(**HANG, lean=4, head=6, fa=20, ff=-20, ba=130, bf=110, cape=30, flame=FL(0.9, 1.4))
FALL2 = B(bfoot=(0, 3), ffoot=(1, 2), lean=3, head=5, fa=16, ff=-26, ba=136, bf=116, cape=36, flame=FL(0.9, 1.5))

def strip(frames, path):
    sheet = Image.new('RGBA', (64 * len(frames), 64), (0, 0, 0, 0))
    for i, f in enumerate(frames): sheet.alpha_composite(Image.fromarray(f, 'RGBA'), (i * 64, 0))
    sheet.save(path)

def build():
    for nm, (a, b) in {'jump': (JUMP, JUMP2), 'fall': (FALL, FALL2)}.items():
        strip(animate(SMALL, [k(0, a), k(12, b), k(24, a)], 24, step=6, life=life), os.path.join(DIR, nm + '_sheet.png'))
    out = {}
    for name, (ticks, keys, step, smear, loop, center) in MOVES.items():
        out[name] = animate(BIG, keys, ticks, step=step, smear=smear, smear_tint=GHOST, center=center, life=life)
    idx = save_atlas(out, os.path.join(DIR, 'moves_sheet.png'), cols=32)
    index = {n: idx[n] + [MOVES[n][2]] + ([1] if MOVES[n][4] else []) for n in MOVES}
    with open(JS, 'w') as f:
        f.write('// Generated by tools/sprites/soul_summoner_moves.py - do not edit by hand.\n')
        f.write('// Soul Summoner move animations in moves_sheet.png (112x104 frames, 32 to a row, feet at 56,94):\n')
        f.write('// move: [first frame, frame count, game ticks per frame, loops?]\n')
        f.write('export const SS_MOVES = ' + json.dumps(index).replace('],', '],\n  ').replace('{', '{\n  ').replace(']}', '],\n};') + '\n')
    return out

if __name__ == '__main__':
    out = build()
    if '--preview' in sys.argv:
        d = sys.argv[sys.argv.index('--preview') + 1]; os.makedirs(d, exist_ok=True)
        for name, fr in out.items(): contact(fr, os.path.join(d, 'ss_' + name + '.png'))
    print('frames:', sum(len(f) for f in out.values()))

"""AERO's animations: his drawing (tools/sprites/aero_draw.py) on the same puppet rig and joints as NU,
so the body poses come from NU's library (tools/sprites/nu_moves.py) and AERO's own moves are keyed here.
The goldfish keeps swimming around the bowl and the leaf scarf flutters in every animation.

  idle / run / jump / fall strips (64x64) and moves_sheet.png (112x104, feet at 56,95)
  -> public/assets/fighters/aero/, frame index -> src/fighters/aeroMoves.js

  python3 tools/sprites/aero_moves.py [--preview DIR]
"""
import os, sys, json, math
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from puppet import Part, Rig, animate, save_atlas, contact, pose_at
import aero_draw
import nu_moves as N
from nu_moves import P, k, legs, CROUCH, TUCK

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
DIR = os.path.join(ROOT, 'public/assets/fighters/aero')
JS = os.path.join(ROOT, 'src/fighters/aeroMoves.js')
FEET = (32, 58)

LAYERS = aero_draw.draw_parts()
BASE = aero_draw.composite(LAYERS)
parts = []
for z, name in enumerate(aero_draw.ORDER):
    pivot, parent = aero_draw.RIG[name]
    parts.append(Part(name, LAYERS[name][..., 3] > 0, pivot, parent, z=z, variants=[LAYERS[name]]))
SMALL = Rig(BASE, parts, (64, 64), (0, 0), FEET)
BIG = Rig(BASE, parts, (112, 104), (24, 36), FEET)
GHOST = (159, 240, 255)           # bright aqua afterimages

def alive(keys, ticks):
    """Add the goldfish's swimming and the scarf's flutter on top of any animation's keys: extra keys
    for 'fish' and 'scarf' merged into each key pose, by time."""
    out = []
    for (t, pose, e) in keys:
        p = dict(pose)
        sw = math.sin(t * 0.11)
        p.setdefault('fish', (4 * sw, 3 * math.sin(t * 0.07), math.sin(t * 0.05), -1 if math.cos(t * 0.07) < 0 else 1, 1))   # swims back and forth, turning round
        sc = p.get('scarf', (0, 0, 0))
        p['scarf'] = (sc[0] + 10 * math.sin(t * 0.21), sc[1], sc[2])
        out.append((t, p, e))
    return out

def flutter_keys(keys, ticks, every=6):
    """Re-key an animation every few ticks so the fish and scarf keep moving between the body's keys."""
    times = sorted(set([kk[0] for kk in keys] + list(range(0, ticks + 1, every))))
    return alive([(t, pose_at(keys, t), 'linear') for t in times], ticks)   # the samples already carry the easing

MOVES = {}
def move(name, ticks, keys, step=2, smear=('ffore', 'ffist'), loop=False, center=None):
    MOVES[name] = (ticks, flutter_keys(keys, ticks), step, smear, loop, center)

REST = P()
PALM = P(torso=(12, 2, 0), head=(-6, 1, 0), fupper=(-80, 0, 0), ffore=(76, 0, 0), bupper=(-10, 0, 0), root=(0, 3, 0, 1.03, 0.97), **legs(14, 0, -14, 10, 0, -6))
# jab: BUBBLE POP - a quick palm that pops a bubble in their face
move('jab', 20, [k(0, REST), k(3, P(torso=(-4, -1, 0), fupper=(-20, 0, 0), ffore=(-40, 0, 0)), 'out'), k(5, PALM, 'snap'), k(10, P(**{**PALM, 'torso': (10, 2, 0)}), 'linear'), k(20, REST, 'inout')])
# ftilt: AURORA SWOOSH - a wide sweeping arm that leaves a glossy ribbon of light
move('ftilt', 28, [
    k(0, REST),
    k(6, P(fupper=(-160, -1, 0), ffore=(-20, 0, 0), torso=(-8, -1, 0), head=(6, 0, 0), bupper=(20, 0, 0), root=(0, -2, 0), **legs(8, 0, -6, 0)), 'out'),
    k(9, P(fupper=(-80, 0, 0), ffore=(30, 0, 0), torso=(12, 2, 0), head=(-8, 1, 0), bupper=(-20, 0, 0), root=(0, 3, 0, 1.03, 0.97), **legs(16, 0, -16, 10, 0, -6)), 'snap'),
    k(13, P(fupper=(-10, 0, 0), ffore=(40, 0, 0), torso=(14, 2, 0), head=(-6, 1, 0), bupper=(-20, 0, 0), root=(0, 3, 0), **legs(16, 0, -16, 10, 0, -6)), 'out'),
    k(28, REST, 'inout'),
])
# utilt: FOUNTAIN - both hands thrown up, water spouting overhead
UP2 = P(fupper=(-170, 0, -2), ffore=(-10, 0, 0), bupper=(-160, 0, -2), bfore=(10, 0, 0), head=(-14, 0, 0), torso=(-4, 0, -1), root=(0, 0, -2, 0.95, 1.08))
move('utilt', 24, [k(0, REST), k(4, P(**CROUCH, fupper=(20, 0, 0), bupper=(20, 0, 0)), 'out'), k(7, UP2, 'snap'), k(13, P(**{**UP2, 'root': (0, 0, -1, 0.97, 1.04)}), 'linear'), k(24, REST, 'inout')], smear=())
# dtilt: GRASS SWEEP - a low sweeping kick
for name in ('dtilt', 'dair', 'grab', 'holding', 'throw_forward', 'throw_back', 'throw_up', 'throw_down', 'hitstun', 'shield', 'grabbed', 'ledge', 'nair', 'bair', 'uair', 'usmash', 'dsmash'):
    ticks, keys, step, smear, loop, center = N.MOVES[name]
    MOVES[name] = (ticks, flutter_keys(keys, ticks), step, tuple(x for x in smear if x not in ('mic', 'can')), loop, center)
# fsmash: LENS FLARE - draws both hands to the chest, then thrusts them out into a blinding flare
FLARE = P(torso=(14, 3, 0), head=(-8, 1, 0), fupper=(-85, 0, 0), ffore=(80, 0, 0), bupper=(-80, 0, 0), bfore=(70, 0, 0), root=(0, 4, 0, 1.05, 0.95), **legs(18, 0, -18, 12, 0, -8))
move('fsmash', 46, [
    k(0, REST),
    k(12, P(torso=(-12, -2, 0), head=(8, 0, 0), fupper=(10, -1, 0), ffore=(-120, 0, 0), bupper=(20, 0, 0), bfore=(-110, 0, 0), root=(0, -3, 0, 0.98, 1.03), **legs(6, 0, -6, 0)), 'out'),
    k(16, P(torso=(-14, -2, 0), head=(9, 0, 0), fupper=(14, -1, 0), ffore=(-124, 0, 0), bupper=(24, 0, 0), bfore=(-114, 0, 0), root=(0, -3, 0, 0.97, 1.04), **legs(6, 0, -6, 0))),
    k(18, FLARE, 'snap'), k(27, P(**{**FLARE, 'torso': (12, 3, 0)}), 'linear'), k(46, REST, 'inout'),
], smear=())
# fair: a falling raindrop chop
move('fair', 26, [
    k(0, P(**TUCK)), k(6, P(**TUCK, fupper=(-170, 0, -1), ffore=(-20, 0, 0), torso=(-8, 0, 0), root=(-6, 0, 0)), 'out'),
    k(9, P(**TUCK, fupper=(-20, 0, 0), ffore=(30, 0, 0), torso=(16, 2, 0), head=(-6, 0, 0), root=(10, 2, 0, 1.03, 0.97)), 'snap'),
    k(15, P(**TUCK, fupper=(-10, 0, 0), ffore=(30, 0, 0), torso=(14, 2, 0), root=(8, 2, 0)), 'linear'), k(26, P(**TUCK), 'inout'),
])
# ---- specials
# BUBBLE TRAP: cups his hands to the bowl, then blows a big bubble forward
move('neutralB', 30, [
    k(0, REST),
    k(8, P(torso=(-4, 0, 0), head=(6, 0, 0), fupper=(-60, 0, 0), ffore=(-100, 0, 0), bupper=(-80, 0, 0), bfore=(-90, 0, 0)), 'out'),
    k(12, P(torso=(10, 2, 0), head=(-6, 1, 0), fupper=(-90, 0, 0), ffore=(70, 0, 0), bupper=(-70, 0, 0), bfore=(50, 0, 0), root=(0, 2, 0, 1.04, 0.96), **legs(14, 0, -14, 10, 0, -6)), 'snap'),
    k(22, P(torso=(8, 2, 0), head=(-4, 1, 0), fupper=(-86, 0, 0), ffore=(66, 0, 0), bupper=(-66, 0, 0), bfore=(46, 0, 0), root=(0, 2, 0), **legs(14, 0, -14, 10, 0, -6)), 'linear'),
    k(30, REST, 'inout'),
], smear=())
# GLASS WINDOW: swipes a pane of glossy glass into being in front of him
move('sideB', 32, [
    k(0, REST),
    k(6, P(fupper=(-120, 0, 0), ffore=(-40, 0, 0), torso=(-6, -1, 0), head=(4, 0, 0)), 'out'),
    k(10, P(fupper=(-70, 0, 0), ffore=(60, 0, 0), torso=(10, 2, 0), head=(-6, 1, 0), root=(0, 2, 0, 1.03, 0.97), **legs(14, 0, -14, 10, 0, -6)), 'snap'),
    k(20, P(fupper=(-74, 0, 0), ffore=(64, 0, 0), torso=(8, 2, 0), head=(-4, 1, 0), root=(0, 2, 0), **legs(14, 0, -14, 10, 0, -6)), 'linear'),
    k(32, REST, 'inout'),
], smear=())
# BUBBLE RIDE: curled up inside a big bubble, floating upward
BALL = P(**legs(-50, 100, -70, 100, -10, -10), torso=(16, 0, 2), head=(10, 0, 2), fupper=(-30, 0, 0), ffore=(-110, 0, 0), bupper=(-20, 0, 0), bfore=(-100, 0, 0))
move('upb', 40, [k(0, P(**CROUCH)), k(8, BALL, 'snap'), k(30, P(**{**BALL, 'root': (0, 0, -2, 1.02, 0.98)}), 'linear'), k(40, P(**N.FALL), 'inout')], smear=())
# LEAF SPRING: kneels and plants a seed in the ground
PLANT = P(torso=(30, 3, 5), head=(10, 1, 2), bupper=(-10, 2, 3), fupper=(-30, 3, 4), ffore=(40, 0, 0), root=(0, 0, 0, 1.1, 0.84), **legs(50, -70, -20, 36, 16, -16))
move('downB', 32, [k(0, REST), k(8, P(**{**PLANT, 'fupper': (-60, 3, 4)}), 'out'), k(12, PLANT, 'snap'), k(20, PLANT, 'linear'), k(32, REST, 'inout')], smear=())
# SCREENSAVER (Limit): spreads his arms wide... and the whole world goes glossy
SPREAD = P(fupper=(-120, 0, -2), ffore=(10, 0, 0), bupper=(-120, 0, -2), bfore=(10, 0, 0), head=(-14, 0, 0), torso=(-6, 0, -1), root=(0, 0, -3, 0.95, 1.08))
move('limit', 120, [k(0, REST), k(20, SPREAD), k(40, P(**{**SPREAD, 'fupper': (-150, 0, -2), 'bupper': (-150, 0, -2)})), k(46, P(**UP2), 'snap'), k(100, P(**{**UP2, 'head': (-18, 0, 0)}), 'linear'), k(120, REST, 'inout')], step=4, smear=())

def strip(frames, path):
    sheet = Image.new('RGBA', (64 * len(frames), 64), (0, 0, 0, 0))
    for i, f in enumerate(frames): sheet.alpha_composite(Image.fromarray(f, 'RGBA'), (i * 64, 0))
    sheet.save(path)

def build():
    os.makedirs(DIR, exist_ok=True)
    idle_body = []
    for b in range(4):                                                   # a gentle bob, like floating in water
        t0 = b * 48
        idle_body += [k(t0, P(root=(0, 0, 0))), k(t0 + 24, P(root=(0, 0, -1, 0.99, 1.02), fupper=(-6, 0, 0), bupper=(-4, 0, 0), head=(-3, 0, 0)), 'inout')]
    idle_body.append(k(192, P()))
    idle = animate(SMALL, flutter_keys(idle_body, 192, 6), 192, step=6)
    run = animate(SMALL, flutter_keys(N.run_keys(), 48, 6), 48, step=6)
    jump = animate(SMALL, flutter_keys([k(0, N.JUMP), k(12, N.JUMP2), k(24, N.JUMP)], 24, 6), 24, step=6)
    fall = animate(SMALL, flutter_keys([k(0, N.FALL), k(12, N.FALL2), k(24, N.FALL)], 24, 6), 24, step=6)
    for nm, fr in (('idle', idle), ('run', run), ('jump', jump), ('fall', fall)): strip(fr, os.path.join(DIR, nm + '_sheet.png'))
    out = {}
    for name, (ticks, keys, step, smear, loop, center) in MOVES.items():
        out[name] = animate(BIG, keys, ticks, step=step, smear=smear, smear_tint=GHOST, center=center)
    idx = save_atlas(out, os.path.join(DIR, 'moves_sheet.png'))
    index = {n: idx[n] + [MOVES[n][2]] + ([1] if MOVES[n][4] else []) for n in MOVES}
    with open(JS, 'w') as f:
        f.write('// Generated by tools/sprites/aero_moves.py - do not edit by hand.\n')
        f.write("// AERO's move animations in moves_sheet.png (112x104 frames, feet at 56,95):\n")
        f.write('// move: [first frame, frame count, game ticks per frame, loops?]\n')
        f.write('export const AERO_MOVES = ' + json.dumps(index).replace('],', '],\n  ').replace('{', '{\n  ').replace(']}', '],\n};') + '\n')
    Image.fromarray(idle[0]).crop((16, 2, 52, 21)).resize((72, 38), Image.NEAREST).save(os.path.join(DIR, 'icon.png'))
    return {'idle': idle, 'run': run, 'jump': jump, 'fall': fall}, out

if __name__ == '__main__':
    base, out = build()
    if '--preview' in sys.argv:
        d = sys.argv[sys.argv.index('--preview') + 1]; os.makedirs(d, exist_ok=True)
        for name, fr in {**base, **out}.items(): contact(fr, os.path.join(d, 'aero_' + name + '.png'))
    print('frames:', sum(len(f) for f in out.values()))

"""THE GREAT PRESTO and CHEF ROUX (test fighters): their animations, from their drawings (presto_draw.py,
chef_draw.py) on NU's puppet rig. Their normals use NU's poses (nu_moves.MOVES - same joints, same frame
timings, so their hitboxes in presto.js / chef.js line up); their idles, specials, counter, Limit and taunt
are their own (below).

  PRESTO: twirls his wand (NU's mic twirl); CARD TRICK, VANISHING ACT, DOVE LIFT, THE CABINET (counter + strike),
          THE GRAND ILLUSION (limit), HAT TRICK (taunt)
  ROUX:   tosses and catches his cleaver; FRYING PAN, CLEAVER TOSS, FLAMBE, HOT OIL, FULL COURSE (limit), CHEF'S KISS (taunt)

  -> public/assets/fighters/<presto|chef>/[<costume>/]{idle,run,jump,fall}_sheet.png (64x64) + moves_sheet.png
     (112x104, 36 to a row, feet at 56,95), icon.png; frame tables src/fighters/prMoves.js / chMoves.js.

  python3 tools/sprites/show_moves.py [presto|chef] [--preview DIR]
"""
import os, sys, json, math
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image
from puppet import animate, save_atlas, contact
import nu_moves as N
from nu_moves import k, P, mix, legs, REST, CROUCH, DEEP, TUCK, STANCE, FALL
import presto_draw, chef_draw

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
SKIP = ('micdrop', 'spraytag', 'neutralB', 'sideB', 'upb', 'downB', 'limit', 'taunt')   # NU's own specials / extras

# ======================================================================= THE GREAT PRESTO
PR = {}
def prmove(name, ticks, keys, step=1, smear=(), loop=False): PR[name] = (ticks, keys, step, smear, loop, None)
# CARD TRICK: draws the wand back across his chest, then flicks it out - a fan of cards flies off it
FLICK = P(torso=(14, 3, 0), head=(-10, 1, 0), fupper=(-80, 0, 0), ffore=(20, 0, 0), mic=(30, 0, 0), bupper=(30, 0, 0), bfore=(-40, 0, 0), root=(0, 3, 0, 1.05, 0.96), **STANCE)
prmove('neutralB', 28, [k(0, REST), k(6, P(torso=(-12, -1, 0), head=(6, 0, 0), fupper=(-20, 0, 0), ffore=(-120, 0, 0), mic=(-60, 0, 0), bupper=(20, 0, 0), root=(0, -2, 0, 0.97, 1.03), **legs(10, -6, -6, 6)), 'out'),
                        k(10, FLICK, 'snap'), k(18, mix(FLICK, torso=(12, 2, 0)), 'linear'), k(28, REST, 'back')])
# VANISHING ACT: sweeps the cape across himself (he vanishes - the game hides him 8-22), reappears arms flung wide - TA-DA! - and stabs the wand
TADA = P(torso=(-8, 0, -1), head=(-14, 0, 0), fupper=(-150, 0, -1), ffore=(10, 0, 0), bupper=(-150, 0, -1), bfore=(10, 0, 0), root=(0, 0, -2, 0.95, 1.07), **legs(8, -4, -8, 6))
STAB = P(torso=(22, 4, 1), head=(-14, 2, 0), fupper=(-86, 0, 0), ffore=(70, 0, 0), mic=(60, 0, 0), bupper=(40, 0, 0), bfore=(-20, 0, 0), root=(0, 6, 0, 1.08, 0.94), **legs(26, -8, -28, 18, 0, -10))
prmove('sideB', 40, [k(0, REST), k(6, P(torso=(18, 1, 2), head=(16, 1, 1), fupper=(-150, -2, 0), ffore=(-100, 0, 0), bupper=(10, 0, 0), **CROUCH), 'out'), k(22, TADA, 'snap'), k(26, mix(TADA, root=(0, 0, -1)), 'out'), k(28, STAB, 'snap'), k(33, mix(STAB, torso=(18, 4, 1)), 'linear'), k(40, REST, 'back')])
# DOVE LIFT: arms raised, a flock of doves carrying him up by his hands
LIFT = P(torso=(-4, 0, -1), head=(-18, 0, 0), fupper=(-170, 0, -2), ffore=(-10, 0, 0), bupper=(-165, 0, -2), bfore=(-10, 0, 0), root=(0, 0, -2, 0.96, 1.06), **legs(-10, 30, -24, 34, -10, -10))
prmove('upb', 40, [k(0, P(**DEEP, fupper=(30, 0, 0), bupper=(30, 0, 0))), k(8, LIFT, 'snap'), k(20, mix(LIFT, **legs(-20, 50, -34, 40, -10, -10)), 'inout'), k(30, mix(LIFT, head=(-10, 0, 0)), 'inout'), k(40, FALL, 'inout')])
# THE CABINET (counter): wraps the cape round himself, ducks into the box - and bursts out with a wand slash
WRAP = P(torso=(14, 0, 2), head=(14, 0, 1), fupper=(-30, 0, 0), ffore=(-130, 0, 0), bupper=(40, 0, 0), bfore=(-60, 0, 0), **CROUCH)
prmove('counter', 52, [k(0, REST), k(5, WRAP, 'out'), k(28, mix(WRAP, head=(10, 0, 1)), 'inout'), k(36, mix(WRAP, torso=(4, 0, 1)), 'inout'), k(52, REST, 'inout')], step=2)
prmove('counterstrike', 30, [k(0, WRAP), k(3, TADA, 'snap'), k(5, STAB, 'snap'), k(12, mix(STAB, ffore=(80, 0, 0)), 'linear'), k(30, REST, 'back')])
# THE GRAND ILLUSION (limit): wand to the sky, conducts the trick - the box, the saw - then flings his arms wide
CONDUCT = lambda s: P(torso=(-4 + 4 * s, 0, 0), head=(-12, 0, 0), fupper=(-150 + 40 * s, 0, -1), ffore=(30 * s, 0, 0), mic=(-20 + 40 * s, 0, 0), bupper=(-40, 0, 0), bfore=(-60, 0, 0), **STANCE)
prmove('limit', 150, [k(0, REST), k(14, P(fupper=(-178, 0, -2), ffore=(-10, 0, 0), head=(-24, 0, 0), torso=(-8, 0, 0), bupper=(-60, 0, 0), root=(0, 0, -3, 0.94, 1.08)), 'out')]
       + [k(30 + 12 * i, CONDUCT(1 if i % 2 else -1), 'inout') for i in range(7)]
       + [k(118, TADA, 'snap'), k(134, mix(TADA, head=(-20, 0, 0)), 'inout'), k(150, REST, 'back')], step=2)
# HAT TRICK (taunt): tips his hat with a bow - the hat lifts off his head - then a flourish of the wand
BOW = P(torso=(24, 2, 2), head=(26, 1, 1), hair=(-30, -2, -3), fupper=(-150, 0, -1), ffore=(-110, 0, 0), bupper=(50, 0, 0), bfore=(-80, 0, 0), **legs(18, -10, -16, 14))
prmove('taunt', 84, [k(0, REST), k(12, mix(REST, fupper=(-160, 0, -1), ffore=(-110, 0, 0)), 'out'), k(24, BOW, 'inout'), k(44, mix(BOW, torso=(26, 2, 2)), 'inout'),
                     k(56, mix(REST, fupper=(-160, 0, -1), ffore=(-110, 0, 0)), 'inout'), k(62, TADA, 'snap'), k(76, mix(TADA, mic=(360, 0, 0)), 'linear'), k(84, REST, 'back')], step=2)

# ======================================================================= CHEF ROUX
CH = {}
def chmove(name, ticks, keys, step=1, smear=(), loop=False): CH[name] = (ticks, keys, step, smear, loop, None)
def chef_idle():
    """Flips his cleaver up off his hand and catches it, again and again, rocking on his heels, the pan hanging."""
    keys = []
    for i in range(0, 193, 6):
        ph = (i % 48) / 48; spin = -ph * 360 if ph < 0.6 else -216
        up = math.sin(min(1, ph / 0.6) * math.pi) * 8 if ph < 0.6 else 0
        keys.append(k(i, P(fupper=(-30 - up * 2, 0, 0), ffore=(80 - up * 3, 0, 0), mic=(spin, 0, -up), torso=(1 * math.sin(i * 0.13), 0, 0),
                           head=(-4 + 3 * math.sin(i * 0.13), 0, 0), bupper=(6, 0, 0), bfore=(-10, 0, 0), root=(0, 0, 0, 1 + 0.015 * math.sin(i * 0.13), 1)), 'linear'))
    return keys
# FRYING PAN: hauls the pan up overhead with his back hand, then brings it down in front - BONG
PAN_UP = P(torso=(-12, -1, -1), head=(-12, 0, 0), bupper=(-175, 0, -2), bfore=(-30, 0, 0), fupper=(10, 0, 0), ffore=(40, 0, 0), root=(0, -2, -2, 0.96, 1.05), **legs(10, -4, -10, 6))
PAN_DOWN = P(torso=(26, 4, 2), head=(6, 1, 1), bupper=(-60, 3, 2), bfore=(-40, 0, 0), fupper=(30, 0, 0), ffore=(20, 0, 0), root=(0, 5, 1, 1.08, 0.92), **legs(26, -10, -28, 20, 0, -10))
chmove('neutralB', 30, [k(0, REST), k(7, PAN_UP, 'out'), k(10, PAN_DOWN, 'snap'), k(16, mix(PAN_DOWN, torso=(22, 4, 2)), 'linear'), k(30, REST, 'back')], smear=('bfore',))
# CLEAVER TOSS: winds the cleaver back over his shoulder and flings it spinning (hidden while it's out)
NOCL = ('mic',)
chmove('sideB', 44, [k(0, REST), k(6, P(torso=(-16, -2, 0), head=(8, 0, 0), fupper=(-170, -1, 0), ffore=(-40, 0, 0), mic=(-40, 0, 0), bupper=(40, 0, 0), root=(0, -3, 0, 0.97, 1.03), **legs(12, -6, -4, 4)), 'out'),
                     k(10, P(_hide=NOCL, torso=(22, 4, 1), head=(-10, 2, 0), fupper=(-80, 0, 0), ffore=(10, 0, 0), bupper=(40, 0, 0), root=(0, 5, 0, 1.06, 0.95), **STANCE), 'snap'),
                     k(24, P(_hide=NOCL, torso=(10, 2, 0), fupper=(-70, 0, 0), ffore=(20, 0, 0), **STANCE), 'inout'), k(36, P(_hide=NOCL, fupper=(-40, 0, 0), ffore=(60, 0, 0)), 'inout'), k(44, P(fupper=(-30, 0, 0), ffore=(70, 0, 0)), 'snap')])
# FLAMBE: crouches, a burst of fire under his clogs blasts him up, pan and cleaver held high
BLAST = P(torso=(-6, 0, -2), head=(-20, 0, 0), fupper=(-165, 0, -2), ffore=(-10, 0, 0), bupper=(-170, 0, -2), bfore=(-20, 0, 0), root=(0, 0, -3, 0.92, 1.12), **legs(-10, 20, -16, 20, -6, -6))
chmove('upb', 40, [k(0, P(**DEEP, fupper=(30, 0, 0), bupper=(30, 0, 0))), k(8, BLAST, 'snap'), k(22, mix(BLAST, **TUCK), 'inout'), k(40, FALL, 'inout')])
# HOT OIL: swings the pan forward and tips it - sizzling oil pours onto the floor in front of him
POUR = P(torso=(18, 3, 1), head=(4, 1, 0), bupper=(-90, 2, 0), bfore=(60, 0, 0), fupper=(20, 0, 0), ffore=(50, 0, 0), root=(0, 3, 0, 1.04, 0.96), **STANCE)
chmove('downB', 34, [k(0, REST), k(8, P(torso=(-10, -1, 0), bupper=(-40, 0, 0), bfore=(-20, 0, 0), root=(0, -2, 0)), 'out'), k(12, POUR, 'snap'), k(24, mix(POUR, bfore=(80, 0, 0)), 'linear'), k(34, REST, 'back')])
# FULL COURSE (limit): slams both arms down (the pot crashes in), stirs it with the cleaver, then hoists the ladle - ORDER UP!
STIR = lambda s: P(torso=(14, 2, 1), head=(4 + 4 * s, 0, 0), fupper=(-70 + 25 * s, 0, 0), ffore=(60 - 20 * s, 0, 0), mic=(90, 0, 0), bupper=(-40 - 10 * s, 0, 0), bfore=(-20, 0, 0), **STANCE)
chmove('limit', 150, [k(0, REST), k(12, PAN_UP, 'out'), k(18, mix(PAN_DOWN, fupper=(-40, 3, 2)), 'snap'), k(30, STIR(0), 'inout')]
       + [k(36 + 10 * i, STIR(1 if i % 2 else -1), 'inout') for i in range(8)]
       + [k(116, P(torso=(-14, -2, -2), head=(-24, 0, 0), fupper=(-178, 0, -3), ffore=(-10, 0, 0), bupper=(-170, 0, -2), root=(0, 0, -4, 0.92, 1.12)), 'snap'), k(136, mix(BLAST, head=(-26, 0, 0)), 'inout'), k(150, REST, 'back')], step=2)
# CHEF'S KISS (taunt): fingers to his lips - mwah! - flung out wide, then a big belly laugh
KISS = P(fupper=(-120, 0, 0), ffore=(-150, 0, 0), mic=(-30, 0, 0), head=(-6, 0, 0), torso=(-4, 0, 0), bupper=(10, 0, 0))
FLING = P(fupper=(-110, 0, 0), ffore=(40, 0, 0), mic=(20, 0, 0), head=(-18, 0, 0), torso=(-8, 0, 0), bupper=(-60, 0, 0), bfore=(-30, 0, 0), root=(0, 0, -1, 0.97, 1.04))
LAUGH = lambda s: P(torso=(-12 + 4 * s, -1, 0), head=(-26 + 6 * s, 0, 0), fupper=(20, 0, 0), ffore=(90, 0, 0), bupper=(20, 0, 0), bfore=(90, 0, 0), root=(0, 0, s, 1 + 0.03 * s, 1 - 0.03 * s))
chmove('taunt', 84, [k(0, REST), k(10, KISS, 'out'), k(22, mix(KISS, head=(-2, 0, 0)), 'inout'), k(26, FLING, 'snap'), k(38, mix(FLING, head=(-20, 0, 0)), 'inout')]
       + [k(44 + 6 * i, LAUGH(1 if i % 2 else 0), 'inout') for i in range(6)] + [k(84, REST, 'back')], step=2)


def strip(frames, path):
    sheet = Image.new('RGBA', (64 * len(frames), 64), (0, 0, 0, 0))
    for i, f in enumerate(frames): sheet.alpha_composite(Image.fromarray(f, 'RGBA'), (i * 64, 0))
    sheet.save(path)

def build(draw, follow, own, folder, js, const, idle, sets, ghost=(200, 200, 255)):
    """Every costume of one fighter: its own moves on top of NU's, written to folder/<costume>/ and one frame table."""
    moves = {n: v for n, v in N.MOVES.items() if n not in SKIP}; moves.update(own)
    table = None
    for s in sets:
        draw.VARIANT = s
        small, big = N.build_rig(draw, follow)
        out_dir = os.path.join(ROOT, 'public/assets/fighters', folder, '' if s == 'default' else s); os.makedirs(out_dir, exist_ok=True)
        base = {
            'idle': animate(small, idle(), 192, step=6, life=N.life),
            'run': animate(small, N.run_keys(), 48, step=6, life=N.life),
            'jump': animate(small, [k(0, N.JUMP), k(12, N.JUMP2), k(24, N.JUMP)], 24, step=6, life=N.life),
            'fall': animate(small, [k(0, N.FALL), k(12, N.FALL2), k(24, N.FALL)], 24, step=6, life=N.life),
        }
        for nm, fr in base.items(): strip(fr, os.path.join(out_dir, nm + '_sheet.png'))
        frames = {m: animate(big, kk, t, step=st, smear=sm, smear_tint=ghost, center=c, life=N.life) for m, (t, kk, st, sm, lp, c) in moves.items()}
        idx = save_atlas(frames, os.path.join(out_dir, 'moves_sheet.png'), cols=36)
        table = {n: idx[n] + [moves[n][2]] + ([1] if moves[n][4] else []) for n in moves}
        if s == 'default': Image.fromarray(base['idle'][0]).crop((16, 0, 52, 19)).resize((72, 38), Image.NEAREST).save(os.path.join(out_dir, 'icon.png'))
        if '--preview' in sys.argv:
            d = sys.argv[sys.argv.index('--preview') + 1]; os.makedirs(d, exist_ok=True)
            for nm in ('idle', 'run'): contact(base[nm], os.path.join(d, '%s_%s_%s.png' % (folder, s, nm)))
            for nm in ('neutralB', 'sideB', 'upb', 'counter', 'downB', 'limit', 'taunt', 'ftilt', 'fsmash'):
                if nm in frames: contact(frames[nm], os.path.join(d, '%s_%s_%s.png' % (folder, s, nm)), scale=2)
    with open(os.path.join(ROOT, 'src/fighters', js), 'w') as f:
        f.write('// Generated by tools/sprites/show_moves.py - do not edit by hand.\n')
        f.write('// move animations in moves_sheet.png (112x104 frames, 36 to a row, feet at 56,95):\n')
        f.write('// move: [first frame, frame count, game ticks per frame, loops?]\n')
        f.write('export const %s = ' % const + json.dumps(table).replace('],', '],\n  ').replace('{', '{\n  ').replace(']}', '],\n};') + '\n')

if __name__ == '__main__':
    which = [a for a in sys.argv[1:] if a in ('presto', 'chef')] or ['presto', 'chef']
    if 'presto' in which:
        build(presto_draw, {**N.FOLLOW, 'cape': (0.45, 1.6), 'hair': (0.2, 0.3), 'mic': (0.3, 0.2)}, PR, 'presto', 'prMoves.js', 'PR_MOVES', N.idle_keys, ['default', 'royal', 'phantom'], (190, 130, 255))
    if 'chef' in which:
        build(chef_draw, {**N.FOLLOW, 'apron': (0.35, 1.0), 'hair': (0.3, 0.4), 'mic': (0.2, 0.1), 'bfore': (0.2, 0)}, CH, 'chef', 'chMoves.js', 'CH_MOVES', chef_idle, ['default', 'grill', 'pastry'], (255, 170, 80))
    print('done')

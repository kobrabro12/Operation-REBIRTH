"""The three new fighters' animations - LUMEN (lumen_draw.py), VANTA (vanta_draw.py) and KAMI (kami_draw.py) - on
NU's puppet rig with show_moves.build: NU's normals (jab, tilts, smashes, aerials, grab, throws, reactions) plus each
fighter's own idle, specials, Limit and taunt (`OWN[name]`). Writes public/assets/fighters/<id>/[<costume>/] (idle /
run / jump / fall strips 64x64, moves 112x104 at 36 a row, feet at 56,95, icon) and src/fighters/<xx>Moves.js.

  python3 tools/sprites/trio_moves.py [lumen|vanta|kami ...] [--preview DIR]
"""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
import nu_moves as N
from nu_moves import P, k, mix, legs, REST, DEEP, CROUCH, STANCE, LIFT, SLAM, HORN_UP, POINT, SHOVE, TOSS, FALL, HOLD
from show_moves import build
import lumen_draw, vanta_draw, kami_draw

def move(t, keys, step=1, smear=(), loop=False):
    """One of the fighter's own moves, in show_moves' format (ticks, keys, step, smear parts, loops, centre)."""
    return (t, keys, step, smear, loop, None)

UP_HIGH = mix(HORN_UP, mic=(10, 0, 0))                                     # the front arm (staff / cards / fan) held high
ARMS_WIDE = P(torso=(-8, 0, -1), head=(-16, 0, 0), fupper=(-140, 0, -1), ffore=(-20, 0, 0), bupper=(-140, 0, -1), bfore=(-20, 0, 0), root=(0, 0, -2, 0.96, 1.05))
HUG = P(torso=(18, 1, 2), head=(16, 1, 1), fupper=(40, 0, 0), ffore=(110, 0, 0), bupper=(50, 0, 0), bfore=(-90, 0, 0), **CROUCH)
WIND = P(torso=(-16, -2, 0), head=(8, 0, 0), fupper=(30, 0, 0), ffore=(60, 0, 0), bupper=(-40, 0, 0), bfore=(-30, 0, 0), root=(0, -3, 0), **STANCE)

# ======================================================================= LUMEN
def lumen_idle():
    """Floating: a slow breath, the staff swaying, her free hand drifting, the hood's tail streaming."""
    out = []
    for i in range(0, 193, 8):
        ph = i * math.pi / 48
        out.append(k(i, P(root=(0, 0, round(math.sin(ph) * 1.2), 1, 1), torso=(-2 + 2 * math.sin(ph), 0, 0), head=(-6 + 4 * math.sin(ph + 1), 0, 0), hair=(8 * math.sin(ph + 0.6), 0, 0),
                          fupper=(-6 + 4 * math.sin(ph), 0, 0), ffore=(10, 0, 0), mic=(6 * math.sin(ph + 0.4), 0, 0), bupper=(-30 + 14 * math.sin(ph + 2), 0, 0), bfore=(-40 + 10 * math.sin(ph), 0, 0),
                          **legs(6, 10, -4, 14, 10, 6)), 'linear'))
    return out

LUMEN = {
    # PLANT STAR: the staff swung up, then planted in the air ahead with a flick
    'neutralB': move(30, [k(0, REST), k(7, UP_HIGH, 'out'), k(12, mix(POINT, mic=(-30, 0, 0)), 'snap'), k(20, mix(POINT, mic=(-20, 0, 0)), 'linear'), k(30, REST, 'back')]),
    # COMET: wound back, then the staff thrust forward - the comet leaves its crescent
    'sideB': move(32, [k(0, REST), k(8, WIND, 'out'), k(12, mix(SHOVE, mic=(-70, 0, 0)), 'snap'), k(22, mix(SHOVE, mic=(-60, 0, 0)), 'linear'), k(32, REST, 'back')]),
    # STARBLINK: curls in, then stretches up as she bursts into light (the game hides her while she travels)
    'upb': move(36, [k(0, REST), k(6, mix(HUG, mic=(20, 0, 0)), 'out'), k(12, LIFT, 'snap'), k(24, mix(LIFT, root=(0, 0, -3, 0.9, 1.1))), k(36, FALL)]),
    # CONSTELLATE: staff raised to the sky in both hands... then driven down
    'downB': move(40, [k(0, REST), k(10, ARMS_WIDE, 'out'), k(22, mix(ARMS_WIDE, head=(-24, 0, 0))), k(29, mix(SLAM, mic=(60, 0, 0)), 'snap'), k(40, REST, 'back')]),
    # THE STARFALL: staff to the sky, holding, swaying - then down on the last shard
    'limit': move(150, [k(0, REST), k(14, ARMS_WIDE, 'out')] + [k(14 + 12 * j, mix(ARMS_WIDE, torso=(-8 + 4 * (j % 2), 0, -1), head=(-20 - 4 * (j % 2), 0, 0))) for j in range(1, 9)] +
                  [k(124, mix(SLAM, mic=(60, 0, 0)), 'snap'), k(150, REST, 'back')], step=2),
    # TAUNT: STAFF TWIRL - spins the staff round her hand twice, then plants it
    'taunt': move(72, [k(0, REST), k(8, mix(POINT, mic=(0, 0, 0)), 'out')] + [k(8 + 6 * j, mix(POINT, mic=(-90 * j, 0, 0)), 'linear') for j in range(1, 9)] + [k(72, REST, 'back')], step=2),
}

# ======================================================================= VANTA
def vanta_idle():
    """Street samurai at rest: blade held low and ready, weight rolling foot to foot, the scarf streaming, a flick of
    the katana every loop."""
    out = []
    for i in range(0, 193, 8):
        ph = i * math.pi / 48
        flick = max(0.0, math.sin(i * math.pi / 96) ** 8)                                        # once a loop he flicks the blade
        out.append(k(i, P(torso=(6 + 2 * math.sin(ph), 1, 1), head=(-4 + 3 * math.sin(ph + 1), 0, 0), hair=(10 * math.sin(ph + 0.4), 0, 0),
                          fupper=(10 + 4 * math.sin(ph), 0, 0), ffore=(30 - 60 * flick, 0, 0), mic=(40 - 120 * flick, 0, 0), bupper=(-20 + 6 * math.sin(ph), 0, 0), bfore=(-50, 0, 0),
                          root=(0, 1, 1, 1, 1), **legs(10, -8, -10, 12, 8 + 2 * math.sin(ph), 4)), 'linear'))
    return out

DRAW_STANCE = P(torso=(22, 2, 3), head=(-18, 1, 1), fupper=(70, 0, 0), ffore=(60, 0, 0), mic=(150, 0, 0), bupper=(40, 0, 0), bfore=(70, 0, 0), root=(0, 2, 4, 1.05, 0.95), **legs(26, -20, -26, 30, 10, 6))
CROSS = mix(SHOVE, torso=(-10, 0, -1), head=(-6, 0, 0), fupper=(-60, 0, 0), ffore=(-10, 0, 0), mic=(-100, 0, 0), root=(0, 6, 0, 1.08, 0.94))
VANTA = {
    # IAI (neutral, held): sinks into a draw stance, blade low behind him - loops while special is held
    'neutralB': move(24, [k(0, mix(DRAW_STANCE, torso=(20, 2, 3))), k(12, mix(DRAW_STANCE, torso=(24, 2, 4), head=(-20, 1, 1)), 'inout'), k(24, mix(DRAW_STANCE, torso=(20, 2, 3)), 'inout')], loop=True),
    # IAI CUT: the release - one explosive cut across his body, then the follow-through
    'iaicut': move(26, [k(0, DRAW_STANCE), k(3, CROSS, 'snap'), k(12, mix(CROSS, mic=(-130, 0, 0), fupper=(-90, 0, 0)), 'out'), k(26, REST, 'back')]),
    # GHOST DASH (side): a low lunge, blade trailing back
    'sideB': move(30, [k(0, mix(CROUCH, fupper=(40, 0, 0), mic=(120, 0, 0))), k(4, mix(SHOVE, torso=(40, 4, 4), head=(-30, 2, 0), fupper=(60, 0, 0), mic=(150, 0, 0), root=(0, 6, 4, 1.15, 0.85)), 'snap'),
                       k(20, mix(SHOVE, torso=(34, 4, 3), head=(-26, 2, 0), fupper=(50, 0, 0), mic=(140, 0, 0), root=(0, 6, 3, 1.1, 0.88)), 'linear'), k(30, REST, 'back')]),
    # NEON WIRE (up): fires the wire from his free hand, up and ahead, then rides it up blade first
    'upb': move(36, [k(0, CROUCH), k(5, mix(HORN_UP, bupper=(-150, 0, 0), bfore=(-10, 0, 0), mic=(60, 0, 0)), 'snap'), k(16, mix(LIFT, mic=(-20, 0, 0)), 'out'), k(28, mix(LIFT, mic=(-40, 0, 0), root=(0, 0, -2, 0.92, 1.08))), k(36, FALL)]),
    # SAVE STATE (down): two fingers to his visor, then the blade planted - the checkpoint saves / he rewinds to it
    'downB': move(30, [k(0, REST), k(6, mix(HOLD, ffore=(120, 0, 0), head=(-8, 0, 0)), 'out'), k(14, mix(HOLD, ffore=(130, 0, 0), head=(-10, 0, 0))), k(20, mix(SLAM, mic=(70, 0, 0)), 'snap'), k(30, REST, 'back')]),
    # BLACKOUT (Limit): a draw stance held in the dark... gone... then back, the blade slowly sheathed
    'limit': move(150, [k(0, REST), k(14, DRAW_STANCE, 'out'), k(40, mix(DRAW_STANCE, torso=(26, 2, 4))), k(46, CROSS, 'snap'), k(110, mix(CROSS, mic=(-130, 0, 0))),
                        k(128, mix(HOLD, mic=(90, 0, 0), torso=(4, 0, 0)), 'inout'), k(140, mix(HOLD, mic=(110, 0, 0), head=(-6, 0, 0)), 'snap'), k(150, REST, 'back')], step=2),
    # TAUNT: spins the katana round his hand three times, then a slow, smug sheathe
    'taunt': move(72, [k(0, REST), k(8, mix(POINT, mic=(0, 0, 0)), 'out')] + [k(8 + 5 * j, mix(POINT, mic=(-120 * j, 0, 0)), 'linear') for j in range(1, 10)] +
                       [k(60, mix(HOLD, mic=(100, 0, 0)), 'inout'), k(72, REST, 'back')], step=2),
}

# ======================================================================= KAMI
def kami_idle():
    """Light as paper: a springy bounce, the fan fluttering, the crane bobbing."""
    out = []
    for i in range(0, 193, 6):
        ph = i * math.pi / 24
        b = abs(math.sin(ph / 2))
        out.append(k(i, P(root=(0, 0, round(-b * 1.5), 1 - 0.03 * b, 1 + 0.04 * b), torso=(4 * math.sin(ph / 2), 0, 0), head=(-4 + 6 * math.sin(ph / 2 + 1), 0, 0), hair=(-10 * math.sin(ph / 2 + 0.4), 0, 0),
                          fupper=(-20, 0, 0), ffore=(40, 0, 0), mic=(18 * math.sin(ph * 2), 0, 0), bupper=(-10 + 10 * math.sin(ph / 2), 0, 0), bfore=(-30, 0, 0), **legs(8 * b, -10 * b, -8 * b, 12 * b)), 'linear'))
    return out

KAMI = {
    # FOLD SHOT: wound up, a snapping throw - a crane, a hop or a fan of shuriken, by his fold
    'neutralB': move(28, [k(0, REST), k(6, WIND, 'out'), k(10, mix(TOSS, mic=(-40, 0, 0), _hide=('can',)), 'snap'), k(18, mix(TOSS, _hide=('can',)), 'linear'), k(28, REST, 'back')]),
    # PAPER CUT: a crouch, then a lunge low and flat, the fan out ahead like a blade
    'sideB': move(34, [k(0, mix(CROUCH, fupper=(30, 0, 0))), k(4, mix(SHOVE, torso=(40, 4, 4), head=(-30, 2, 0), mic=(-80, 0, 0), root=(0, 6, 4, 1.15, 0.85)), 'snap'),
                       k(24, mix(SHOVE, torso=(36, 4, 3), head=(-26, 2, 0), mic=(-80, 0, 0), root=(0, 6, 3, 1.1, 0.88)), 'linear'), k(34, REST, 'back')]),
    # KITE: crouch, spring - arms up, the fan held over his head like a kite
    'upb': move(40, [k(0, P(**DEEP, fupper=(30, 0, 0), bupper=(30, 0, 0))), k(8, mix(LIFT, mic=(80, 0, 0)), 'snap'), k(24, mix(LIFT, mic=(90, 0, 0), root=(0, 0, -2, 0.94, 1.06))), k(40, FALL)]),
    # FOLD: he folds himself small - squash, squash - then pops open into the new shape
    'downB': move(36, [k(0, REST), k(8, mix(HUG, root=(0, 0, 3, 1.18, 0.74)), 'out'), k(16, mix(HUG, root=(0, 0, 5, 1.3, 0.58), head=(30, 2, 3)), 'inout'),
                       k(23, mix(ARMS_WIDE, root=(0, 0, -4, 0.86, 1.18)), 'snap'), k(36, REST, 'back')]),
    # PAPER TIGER: a sheet raised high - then a point, and it pounces
    'limit': move(150, [k(0, REST), k(16, ARMS_WIDE, 'out'), k(60, mix(ARMS_WIDE, head=(-24, 0, 0))), k(70, mix(POINT, mic=(-60, 0, 0)), 'snap'), k(140, mix(POINT, mic=(-50, 0, 0))), k(150, REST, 'back')], step=2),
    # TAUNT: folds a paper plane (hands together, twice) and throws it up and away
    'taunt': move(72, [k(0, REST), k(8, HOLD, 'out'), k(16, mix(HOLD, ffore=(80, 0, 0))), k(24, HOLD), k(32, mix(HOLD, ffore=(80, 0, 0))), k(42, WIND, 'inout'), k(48, mix(HORN_UP, mic=(-30, 0, 0)), 'snap'), k(72, REST, 'back')], step=2),
}

FIGHTERS = {
    'lumen': (lumen_draw, LUMEN, lumen_idle, 'lumen', 'lmMoves.js', 'LM_MOVES', ['default', 'dawn', 'void'], (190, 150, 255)),
    'vanta': (vanta_draw, VANTA, vanta_idle, 'vanta', 'vtMoves.js', 'VT_MOVES', ['default', 'redline', 'glitch'], (80, 240, 255)),
    'kami': (kami_draw, KAMI, kami_idle, 'kami', 'kmMoves.js', 'KM_MOVES', ['default', 'newsprint', 'gold'], (255, 150, 140)),
}

if __name__ == '__main__':
    names = [a for a in sys.argv[1:] if a in FIGHTERS] or list(FIGHTERS)
    for n in names:
        draw, own, idle, folder, js, const, sets, ghost = FIGHTERS[n]
        follow = {**N.FOLLOW, 'mic': (0.25, 0.2)}
        build(draw, follow, own, folder, js, const, idle, sets, ghost)
        p = os.path.join(os.path.dirname(__file__), '../../src/fighters', js); t = open(p).read()
        open(p, 'w').write(t.replace('Generated by tools/sprites/show_moves.py', 'Generated by tools/sprites/trio_moves.py (via show_moves.py)'))
        print('built', n)

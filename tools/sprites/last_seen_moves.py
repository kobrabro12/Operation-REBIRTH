"""LAST SEEN: her animations, for both forms, from tools/sprites/last_seen_draw.py on NU's rig and joints. Her
normal attacks are NU's swings on her body (borrowed); her idle, specials, Limit, taunt and the transformation
are her own.

  calm  (LAST SEEN) -> public/assets/fighters/last-seen/,       frame index src/fighters/lsMoves.js (LS_MOVES)
  wrong (SEEN)      -> public/assets/fighters/last-seen/wrong/, frame index src/fighters/lsWrongMoves.js (LS_WRONG_MOVES)

  python3 tools/sprites/last_seen_moves.py [--preview DIR]
"""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
from puppet import contact
import last_seen_draw as D
import nu_moves as N
from nu_moves import k, legs, CROUCH, DEEP, TUCK, STANCE

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
DIR = os.path.join(ROOT, 'public/assets/fighters/last-seen')
FOLLOW = {'head': (0.2, 0.2), 'hair': (0.45, 1.0), 'ffore': (0.15, 0.1), 'ffist': (0.2, 0.1), 'bfore': (0.15, 0), 'poster': (0.4, 0.6)}
PARTS = set(D.ORDER)

def P(**kw): return kw
def mix(a, **kw): return {**a, **kw}
REST = P()
WIDE = P(fupper=(-60, 0, 0), ffore=(120, 0, 0), bupper=(74, 0, 0), bfore=(38, 0, 0), head=(-30, 0, -1), torso=(-6, 0, -1), root=(0, 0, -3, 0.95, 1.08))

def calm_life(pose, t):
    """A little shiver that never stops, and now and then a nervous glance."""
    p = dict(pose)
    tor = N.full(p.get('torso')); tor[0] += 0.8 * math.sin(t * 0.6); p['torso'] = tuple(tor)
    hd = N.full(p.get('head')); hd[0] += 1.5 * math.sin(t * 0.07); p['head'] = tuple(hd)
    return p

def wrong_life(pose, t):
    """Never still: the head ticks and jerks, the shoulders hitch."""
    p = dict(pose)
    hd = N.full(p.get('head'))
    if (t // 5) % 7 == 0: hd[0] += 14 * (1 if (t // 35) % 2 else -1)
    hd[0] += 3 * math.sin(t * 0.31)
    p['head'] = tuple(hd)
    tor = N.full(p.get('torso')); tor[0] += 2 * math.sin(t * 0.23); p['torso'] = tuple(tor)
    for n in ('ffist', 'bfore'):
        a = N.full(p.get(n)); a[0] += 5 * math.sin(t * 0.9 + len(n)) if (t // 9) % 4 == 0 else 0; p[n] = tuple(a)
    return p

def borrowed():
    out = {}
    for name in ('jab', 'ftilt', 'utilt', 'dtilt', 'dashAttack', 'fsmash', 'usmash', 'dsmash', 'nair', 'fair', 'bair', 'uair', 'dair',
                 'grab', 'holding', 'throw_forward', 'throw_back', 'throw_up', 'throw_down', 'hitstun', 'shield', 'grabbed', 'ledge'):
        ticks, keys, step, smear, loop, center = N.MOVES[name]
        keys = [(t, {kk: vv for kk, vv in pose.items() if kk in PARTS or kk == 'root'}, e) for (t, pose, e) in keys]
        out[name] = (ticks, keys, step, tuple(x for x in smear if x in PARTS), loop, center)
    return out

def mv(M, name, ticks, keys, step=1, smear=(), loop=False, center=None):
    M[name] = (ticks, keys, step, smear, loop, center)

# ======================================================================= LAST SEEN (calm)
def calm_idle():
    """Arms wrapped round herself, glancing over one shoulder, then the other."""
    HUG = dict(fupper=(30, 0, 0), ffore=(-120, 0, 0), bupper=(-10, 0, 0), bfore=(-40, 0, 0))
    return [k(0, P(**HUG, head=(0, 0, 0))), k(40, P(**HUG, head=(14, 0, 0)), 'inout'), k(48, P(**HUG, head=(-20, 0, 0)), 'snap'),
            k(96, P(**HUG, head=(-16, 0, 0)), 'inout'), k(140, P(**HUG, head=(8, 0, 0), torso=(4, 0, 0)), 'inout'), k(192, P(**HUG, head=(0, 0, 0)), 'inout')]

CALM = borrowed()
mv(CALM, 'neutralB', 30, [k(0, REST), k(8, P(torso=(-12, -1, 0), head=(8, 0, 0), fupper=(-160, 0, 0), ffore=(-30, 0, 0)), 'out'),
                          k(12, P(torso=(18, 3, 1), head=(-10, 1, 0), fupper=(-70, 0, 0), ffore=(20, 0, 0), root=(0, 4, 0), **STANCE), 'snap'),
                          k(20, P(torso=(14, 2, 1), fupper=(-60, 0, 0), ffore=(30, 0, 0), **STANCE), 'linear'), k(30, REST, 'back')], smear=('ffore', 'ffist'))
# PLEASE HELP ME: a desperate lunge, one hand reaching out ahead of her
REACH = P(torso=(56, 5, 3), head=(-30, 0, 0), hair=(-20, 0, 0), fupper=(-60, 0, 0), ffore=(120, 0, 0), ffist=(-10, 0, 0), bupper=(74, 0, 0), bfore=(38, 0, 0), root=(0, 0, -4), **legs(-40, 30, -50, 40))
mv(CALM, 'sideB', 34, [k(0, REST), k(6, P(**DEEP, torso=(14, 0, 2), head=(10, 0, 0), fupper=(20, 0, 0)), 'out'), k(9, REACH, 'snap'), k(22, mix(REACH, torso=(60, 5, 3), ffist=(-20, 0, 0)), 'linear'), k(34, REST, 'inout')])
# clinging on: both arms wrapped round them, face pressed in, shaking
HOLD = P(torso=(30, 4, 1), head=(-14, 2, 0), fupper=(-50, 0, 0), ffore=(110, 0, 0), bupper=(-100, 0, 0), bfore=(32, 0, 0), root=(0, 2, 0), **legs(18, -10, -18, 14, 0, -6))
mv(CALM, 'cling', 24, [k(0, HOLD), k(6, mix(HOLD, head=(-6, 2, 0), torso=(34, 4, 1)), 'snap'), k(12, HOLD, 'inout'), k(18, mix(HOLD, head=(-20, 2, 0), torso=(28, 4, 1)), 'snap'), k(24, HOLD, 'inout')], loop=True, step=2)
mv(CALM, 'upb', 40, [k(0, P(**DEEP)), k(8, P(fupper=(-170, 0, -1), ffore=(10, 0, 0), bupper=(-170, 0, -1), head=(-20, 0, 0), hair=(20, 0, 0), **TUCK), 'snap'),
                     k(28, P(fupper=(-150, 0, 0), bupper=(-150, 0, 0), head=(-14, 0, 0), **TUCK), 'linear'), k(40, P(fupper=(-120, 0, 0), bupper=(-130, 0, 0), **legs(20, 14, -14, 26)), 'inout')])
HIDE = P(torso=(40, 3, 6), head=(30, 1, 2), fupper=(-150, 0, 0), ffore=(-70, 0, 0), bupper=(-150, 0, 0), bfore=(-60, 0, 0), root=(0, 0, 0, 1.1, 0.82), **legs(56, -80, -24, 44, 18, -18))
mv(CALM, 'downB', 34, [k(0, REST), k(5, HIDE, 'snap'), k(26, mix(HIDE, head=(34, 1, 2)), 'linear'), k(34, REST, 'inout')])
mv(CALM, 'limit', 40, [k(0, REST), k(16, WIDE, 'out'), k(40, mix(WIDE, head=(-40, 0, -1)), 'linear')])
# the transformation, as she starts it: doubled over, clutching her head, wrenching side to side
CLUTCH = P(torso=(46, 3, 6), head=(30, 1, 2), fupper=(-150, 0, 0), ffore=(-90, 0, 0), bupper=(-150, 0, 0), bfore=(-80, 0, 0), **DEEP)
mv(CALM, 'turning', 70, [k(0, REST)] + [k(6 + i * 6, mix(CLUTCH, torso=(46 + (10 if i % 2 else -10), 3, 6), head=(30 + (20 if i % 2 else -20), 1, 2)), 'snap') for i in range(8)] + [k(70, CLUTCH, 'inout')], step=2)
mv(CALM, 'taunt', 84, [k(0, REST), k(12, P(bupper=(-80, 0, 0), bfore=(-70, 0, 0), head=(-6, 0, 0), torso=(4, 0, 0)), 'out'),
                      k(60, P(bupper=(-84, 0, 0), bfore=(-74, 0, 0), head=(6, 0, 0), torso=(6, 0, 0)), 'linear'), k(84, REST, 'inout')])

# ======================================================================= SEEN (wrong)
def wrong_idle():
    """Hunched over, long arms hanging, swaying."""
    H = dict(torso=(30, 2, 2), head=(-24, 0, 0), fupper=(10, 0, 0), ffore=(80, 0, 0), ffist=(30, 0, 0), bupper=(20, 0, 0), bfore=(20, 0, 0), **legs(26, -30, -26, 30, 8, -8))
    return [k(0, P(**H)), k(96, P(**mix(H, torso=(36, 2, 2), fupper=(16, 0, 0))), 'inout'), k(192, P(**H), 'inout')]
def wrong_run():
    """On all fours: a fast, scuttling crawl."""
    def C(s): return P(torso=(78, 4, 6), head=(-70, 0, 0), hair=(-20, 0, 0), fupper=(60 + 30 * s, 0, 0), ffore=(10, 0, 0), bupper=(60 - 30 * s, 0, 0), bfore=(10, 0, 0),
                       root=(0, 0, 6, 1.1, 0.86), **legs(60 - 20 * s, -90, 40 + 20 * s, -80, 20, 10))
    return [k(0, C(1)), k(12, C(0), 'linear'), k(24, C(-1), 'linear'), k(36, C(0), 'linear'), k(48, C(1), 'linear')]

WRONG = borrowed()
# ---- SEEN's own attacks: hunched over, swinging the bloody axe (they replace the borrowed upright swings)
HB = dict(torso=(30, 2, 2), head=(-24, 0, 0), **legs(26, -30, -26, 30, 8, -8))       # the hunch
def AX(fu, ff, fist=0, **kw):                                                          # a pose with the axe arm set (axe raised / chopping / dragging...)
    return P(**{**HB, 'fupper': (fu, 0, 0), 'ffore': (ff, 0, 0), 'ffist': (fist, 0, 0), 'bupper': (20, 0, 0), 'bfore': (20, 0, 0), **kw})
LOW = AX(10, 80, 30)                     # dragging it, blade on the floor
RAISED = AX(-70, 40)                     # raised in front
HIGH = AX(-150, 60, 0, head=(-34, 0, 0), torso=(14, 0, 0))     # wound right up over its head
CHOP = AX(-20, 70, 0, torso=(36, 4, 3), head=(-14, 2, 0))      # chopped out level in front
FLOOR = AX(10, 80, 30, torso=(44, 4, 5), head=(-10, 2, 1), root=(0, 0, 0, 1.08, 0.88))   # buried in the floor
BEHIND = AX(70, 60, 0, torso=(18, 0, 1))                       # swung behind it
ATK = {
    'jab': (24, [k(0, LOW), k(3, RAISED, 'out'), k(5, CHOP, 'snap'), k(12, mix(CHOP, torso=(42, 4, 3)), 'linear'), k(24, LOW, 'back')]),
    'ftilt': (30, [k(0, LOW), k(8, BEHIND, 'out'), k(11, CHOP, 'snap'), k(15, AX(0, 90, 20, torso=(48, 4, 3)), 'out'), k(30, LOW, 'back')]),
    'utilt': (26, [k(0, LOW), k(5, RAISED, 'out'), k(10, AX(-160, 30, 0, head=(-40, 0, 0)), 'snap'), k(16, AX(-200, 20, 0, head=(-40, 0, 0)), 'linear'), k(26, LOW, 'back')]),
    'dtilt': (22, [k(0, LOW), k(4, mix(BEHIND, **DEEP), 'out'), k(7, mix(FLOOR, torso=(50, 4, 6)), 'snap'), k(12, mix(FLOOR, torso=(48, 4, 6)), 'linear'), k(22, LOW, 'back')]),
    'dashAttack': (34, [k(0, LOW), k(5, mix(CHOP, torso=(48, 6, 4), root=(0, 0, 2, 1.06, 0.94)), 'snap'), k(20, mix(CHOP, torso=(44, 6, 4)), 'linear'), k(34, LOW, 'back')]),
    'fsmash': (46, [k(0, LOW), k(10, HIGH, 'out'), k(16, mix(HIGH, fupper=(-160, 0, 0), torso=(8, 0, 0)), 'inout'), k(18, CHOP, 'snap'), k(21, FLOOR, 'snap'), k(32, mix(FLOOR, head=(-20, 2, 1)), 'linear'), k(46, LOW, 'back')]),
    'usmash': (44, [k(0, LOW), k(10, mix(LOW, **DEEP), 'out'), k(14, AX(-170, 20, 0, head=(-44, 0, -1), torso=(-6, 0, -2), root=(0, 0, -4, 0.9, 1.14)), 'snap'),
                    k(22, AX(-180, 10, 0, head=(-40, 0, -1), torso=(-4, 0, -1)), 'linear'), k(44, LOW, 'back')]),
    'dsmash': (44, [k(0, LOW), k(10, HIGH, 'out'), k(15, mix(FLOOR, torso=(50, 4, 7)), 'snap'), k(19, mix(FLOOR, fupper=(60, 0, 0), ffore=(70, 0, 0), torso=(50, 4, 7)), 'linear'), k(30, FLOOR, 'inout'), k(44, LOW, 'back')]),
    'nair': (26, [k(0, mix(CHOP, **TUCK)), k(4, mix(CHOP, **TUCK, root=(-30, 0, -2)), 'out'), k(15, mix(CHOP, **TUCK, root=(340, 0, -2)), 'linear'), k(26, mix(CHOP, **TUCK, root=(360, 0, 0)), 'back')]),
    'fair': (26, [k(0, mix(RAISED, **TUCK)), k(6, mix(HIGH, **TUCK), 'out'), k(9, mix(CHOP, **TUCK), 'snap'), k(13, mix(FLOOR, **TUCK, torso=(40, 0, 0)), 'linear'), k(26, mix(RAISED, **TUCK), 'back')]),
    'bair': (24, [k(0, mix(RAISED, **TUCK)), k(5, mix(CHOP, **TUCK), 'out'), k(8, mix(BEHIND, **TUCK, fupper=(90, 0, 0), torso=(10, 0, 0)), 'snap'), k(13, mix(BEHIND, **TUCK), 'linear'), k(24, mix(RAISED, **TUCK), 'back')]),
    'uair': (24, [k(0, mix(CHOP, **TUCK)), k(4, mix(CHOP, **TUCK), 'out'), k(7, mix(AX(-160, 30, 0, head=(-40, 0, 0)), **TUCK), 'snap'), k(12, mix(AX(-200, 20, 0, head=(-40, 0, 0)), **TUCK), 'linear'), k(24, mix(RAISED, **TUCK), 'back')]),
    'dair': (34, [k(0, mix(RAISED, **TUCK)), k(8, mix(HIGH, **TUCK), 'out'), k(10, mix(AX(30, 80, 40, torso=(40, 0, 0), head=(-10, 0, 0)), **legs(6, 0, -6, 0)), 'snap'), k(24, mix(AX(30, 80, 40, torso=(36, 0, 0)), **legs(6, 0, -6, 0)), 'linear'), k(34, mix(RAISED, **TUCK), 'back')]),
}
for name, (ticks, keys) in ATK.items():
    mv(WRONG, name, ticks, keys, smear=('ffore', 'ffist', 'axe'))

WAIL = P(torso=(22, 3, 1), head=(-34, 2, 0), hair=(30, 0, 0), fupper=(70, 0, 0), ffore=(20, 0, 0), bupper=(70, 0, 0), bfore=(20, 0, 0), root=(0, 3, 0, 1.06, 0.95), **STANCE)
mv(WRONG, 'neutralB', 40, [k(0, P(torso=(30, 2, 2), head=(-24, 0, 0))), k(10, P(torso=(-10, -1, -1), head=(30, 0, 0), fupper=(-120, 0, 0), bupper=(-120, 0, 0), **DEEP), 'out'),
                           k(14, WAIL, 'snap'), k(30, mix(WAIL, head=(-40, 2, 0)), 'linear'), k(40, P(torso=(30, 2, 2), head=(-24, 0, 0)), 'inout')])
SKIT = P(torso=(84, 4, 8), head=(-76, 0, 0), hair=(-30, 0, 0), fupper=(-10, 0, 0), ffore=(-20, 0, 0), bupper=(10, 0, 0), bfore=(-10, 0, 0), root=(0, 0, 8, 1.12, 0.84), **legs(80, -100, 50, -90, 20, 10))
mv(WRONG, 'sideB', 34, [k(0, P(torso=(30, 2, 2))), k(5, SKIT, 'snap'), k(12, mix(SKIT, fupper=(40, 0, 0), bupper=(-30, 0, 0)), 'linear'), k(18, mix(SKIT, fupper=(-30, 0, 0), bupper=(40, 0, 0)), 'linear'),
                        k(24, mix(SKIT, fupper=(40, 0, 0), bupper=(-30, 0, 0)), 'linear'), k(34, P(torso=(30, 2, 2), head=(-24, 0, 0)), 'inout')])
def claw(s): return P(fupper=(-170 + 30 * s, 0, -1), ffore=(-20, 0, 0), bupper=(-140 - 30 * s, 0, -1), bfore=(-20, 0, 0), head=(-30, 0, 0), torso=(-6, 0, 0), **legs(10, 40, -30, 60))
mv(WRONG, 'upb', 40, [k(0, P(**DEEP, torso=(30, 2, 2)))] + [k(6 + i * 6, claw(i % 2), 'snap') for i in range(5)] + [k(40, mix(claw(0), fupper=(-120, 0, 0)), 'inout')])
DRAGUP = P(torso=(-14, 0, -2), head=(-30, 0, 0), fupper=(-175, 0, -2), ffore=(-10, 0, 0), bupper=(-170, 0, -2), bfore=(-10, 0, 0), root=(0, 0, -5, 0.92, 1.12), **legs(10, 0, -10, 0))
DRAG = P(torso=(56, 3, 8), head=(-30, 1, 2), fupper=(-30, 4, 4), ffore=(10, 0, 0), bupper=(-30, 4, 4), bfore=(10, 0, 0), root=(0, 0, 0, 1.16, 0.78), **legs(66, -90, -24, 46, 22, -22))
mv(WRONG, 'downB', 36, [k(0, P(torso=(30, 2, 2))), k(10, DRAGUP, 'out'), k(13, DRAG, 'snap'), k(24, mix(DRAG, torso=(52, 3, 8)), 'linear'), k(36, P(torso=(30, 2, 2), head=(-24, 0, 0)), 'inout')])
SLASH = lambda s: P(torso=(30, 4, 2), head=(-30, 1, 0), fupper=(-150 if s else 30, 0, 0), ffore=(40, 0, 0), bupper=(30 if s else -150, 0, 0), bfore=(40, 0, 0), root=(0, 3, 0), **STANCE)
mv(WRONG, 'limit', 150, [k(0, P(**DEEP, torso=(40, 2, 4), head=(-30, 0, 0))), k(30, P(**DEEP, torso=(50, 2, 6), head=(-40, 0, 0)), 'inout')]
   + [k(40 + i * 12, SLASH(i % 2), 'snap') for i in range(7)] + [k(126, mix(SLASH(0), torso=(46, 6, 2), fupper=(-60, 0, 0)), 'snap'), k(150, P(torso=(30, 2, 2), head=(-24, 0, 0)), 'inout')], step=2)
# the transformation, as it finishes: unfolding up out of the crouch, arms spreading, and hunching
mv(WRONG, 'turning', 70, [k(0, CLUTCH), k(50, CLUTCH, 'linear'), k(60, mix(WIDE, head=(-40, 0, -1)), 'snap'), k(70, P(torso=(30, 2, 2), head=(-24, 0, 0), fupper=(30, 0, 0), bupper=(20, 0, 0)), 'inout')], step=2)
mv(WRONG, 'taunt', 84, [k(0, P(torso=(30, 2, 2), head=(-24, 0, 0))), k(40, P(torso=(30, 2, 2), head=(-110, 0, 0)), 'linear'), k(46, P(torso=(30, 2, 2), head=(-80, 0, 0)), 'snap'),
                        k(70, P(torso=(30, 2, 2), head=(-100, 0, 0)), 'inout'), k(84, P(torso=(30, 2, 2), head=(-24, 0, 0)), 'inout')])

WJUMP = P(torso=(20, 0, 0), head=(-30, 0, 0), fupper=(-60, 0, 0), bupper=(-50, 0, 0), **TUCK)
WFALL = P(torso=(10, 0, 0), head=(-20, 0, 0), fupper=(-140, 0, 0), ffore=(20, 0, 0), bupper=(-150, 0, 0), **legs(20, 14, -14, 26))

def build():
    out = {}
    D.set_style('calm'); small, big = N.build_rig(D, FOLLOW); N.GHOST = (232, 200, 106)
    out['calm'] = N.build_all(small, big, CALM, DIR, os.path.join(ROOT, 'src/fighters/lsMoves.js'), 'LS_MOVES', 'last_seen_moves.py', life_fn=calm_life, idle=calm_idle)
    D.set_style('wrong'); small, big = N.build_rig(D, {**FOLLOW, 'hair': (0.1, 0.15), 'axe': (0.15, 0)}); N.GHOST = (154, 16, 16)   # the crest is stiff; a red smear behind the axe
    out['wrong'] = N.build_all(small, big, WRONG, os.path.join(DIR, 'wrong'), os.path.join(ROOT, 'src/fighters/lsWrongMoves.js'), 'LS_WRONG_MOVES', 'last_seen_moves.py',
                               life_fn=wrong_life, idle=wrong_idle, run=wrong_run, jumps=((WJUMP, mix(WJUMP, head=(-36, 0, 0))), (WFALL, mix(WFALL, head=(-26, 0, 0)))))
    return out

if __name__ == '__main__':
    out = build()
    if '--preview' in sys.argv:
        d = sys.argv[sys.argv.index('--preview') + 1]; os.makedirs(d, exist_ok=True)
        for form, (base, mv_) in out.items():
            for name, fr in {**base, **mv_}.items(): contact(fr, os.path.join(d, form + '_' + name + '.png'))
    print('built')

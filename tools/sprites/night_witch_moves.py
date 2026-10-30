"""NIGHT WITCH's animations: her drawing (night_witch_draw.py) on ROSEMARY's rig, playing ROSEMARY's animation set
(last_seen_moves.py CALM: NU's swings for her normals, plus a throw, a lunge, a jump, a crouch, a Limit pose and a
taunt) - so she shares Rosemary's frame index (LS_MOVES). Her own: a steady, ready idle (no shivering) and a
confident breathing sway; her white scarf (on her hair part) trails and swings behind every move.

  python3 tools/sprites/night_witch_moves.py   -> public/assets/fighters/night-witch/
"""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
import nu_moves as N
from nu_moves import k
import last_seen_moves as LM
import night_witch_draw as NW

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
DIR = os.path.join(ROOT, 'public/assets/fighters/night-witch')
def P(**kw): return kw

def witch_life(pose, t):
    """Steady: a slow breath, and her head turning now and then to scan the sky."""
    p = dict(pose)
    tor = N.full(p.get('torso')); tor[0] += 0.6 * math.sin(t * 0.08); p['torso'] = tuple(tor)
    hd = N.full(p.get('head')); hd[0] += 2 * math.sin(t * 0.03); p['head'] = tuple(hd)
    return p

def witch_idle():
    """Wrench ready, weight on her back foot, scanning the sky: a look up, a look ahead."""
    READY = dict(fupper=(-20, 0, 0), ffore=(-30, 0, 0), bupper=(10, 0, 0), bfore=(-10, 0, 0))
    return [k(0, P(**READY)), k(60, P(**READY, head=(-14, 0, 0)), 'inout'), k(120, P(**READY, head=(4, 0, 0), torso=(2, 0, 0)), 'inout'), k(192, P(**READY), 'inout')]

if __name__ == '__main__':
    small, big = N.build_rig(NW, LM.FOLLOW); N.GHOST = (240, 232, 214)
    N.build_all(small, big, LM.CALM, DIR, os.devnull, 'LS_MOVES', 'night_witch_moves.py', life_fn=witch_life, idle=witch_idle)
    print('built')

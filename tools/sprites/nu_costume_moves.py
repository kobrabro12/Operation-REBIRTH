"""NU's costumes with their own drawing: the same moves as nu_moves.py played on each costume's drawing.
Writes public/assets/fighters/nu/<costume>/*.png (same layout as the default sheets, so nuMoves.js indexes
every one of them).

  inferno  nu_inferno_draw.py   fire hair (5 flickering drawings), studded leather
  street   nu_street_draw.py    BLOCK BOSS: backwards snapback, white tee, gold chain, jeans
  bones    nu_bones_draw.py     BONEZ: a glow-in-the-dark skeleton onesie
  school   nu_school_draw.py    HOMEROOM: a school uniform (its locker amp: run nu_school_draw.py)

  python3 tools/sprites/nu_costume_moves.py [inferno street bones school]
"""
import os, sys, tempfile, importlib
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from puppet import Part, Rig
import nu_moves as M

COSTUMES = {'inferno': ('nu_inferno_draw', (255, 122, 26)), 'street': ('nu_street_draw', (255, 210, 90)), 'bones': ('nu_bones_draw', (154, 255, 106)), 'school': ('nu_school_draw', (90, 138, 232))}

def build_rig(D):
    layers = D.draw_parts()
    base = D.composite(layers, hide=())
    hair = D.hair_variants() if hasattr(D, 'hair_variants') else None
    parts = []
    for z, name in enumerate(D.ORDER):
        pivot, parent = D.RIG[name]
        dr, sw = M.FOLLOW.get(name, (0, 0))
        var = hair if (name == 'hair' and hair) else [layers[name]]
        mask = np.any([v[..., 3] > 0 for v in var], axis=0)
        parts.append(Part(name, mask, pivot, parent, z=z, variants=var, drag=dr, sway=sw))
    parts.append(M.fcan_part(layers, D.ORDER))
    return Rig(base, parts, (64, 64), (0, 0), M.FEET), Rig(base, parts, (112, 104), (24, 36), M.FEET)

if __name__ == '__main__':
    for name in (sys.argv[1:] or COSTUMES):
        mod, ghost = COSTUMES[name]
        small, big = build_rig(importlib.import_module(mod))
        M.GHOST = ghost                            # the afterimages in the costume's colour
        js = os.path.join(tempfile.gettempdir(), 'nu_costume_index.js')
        M.build_all(small, big, M.MOVES, os.path.join(M.DIR, name), js, 'NU_MOVES', 'nu_costume_moves.py')
        os.remove(js)
        print(name, 'sheets written')

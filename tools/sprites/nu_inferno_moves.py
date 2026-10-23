"""NU's INFERNO costume sheets: the same moves as nu_moves.py played on nu_inferno_draw.py's drawing, with his
fire hair flickering through its 5 drawings. Writes public/assets/fighters/nu/inferno/*.png (same layout as
the default sheets, so nuMoves.js indexes both).

  python3 tools/sprites/nu_inferno_moves.py
"""
import os, sys, tempfile
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from puppet import Part, Rig
import nu_moves as M
import nu_inferno_draw as D

def build_rig():
    layers = D.draw_parts()
    base = D.composite(layers, hide=())
    hair = D.hair_variants()
    parts = []
    for z, name in enumerate(D.ORDER):
        pivot, parent = D.RIG[name]
        dr, sw = M.FOLLOW.get(name, (0, 0))
        var = hair if name == 'hair' else [layers[name]]
        mask = np.any([v[..., 3] > 0 for v in var], axis=0)
        parts.append(Part(name, mask, pivot, parent, z=z, variants=var, drag=dr, sway=sw))
    return Rig(base, parts, (64, 64), (0, 0), M.FEET), Rig(base, parts, (112, 104), (24, 36), M.FEET)

if __name__ == '__main__':
    small, big = build_rig()
    M.GHOST = (255, 122, 26)                     # fiery afterimages
    js = os.path.join(tempfile.gettempdir(), 'nu_inferno_index.js')
    M.build_all(small, big, M.MOVES, os.path.join(M.DIR, 'inferno'), js, 'NU_MOVES', 'nu_inferno_moves.py')
    os.remove(js)
    print('INFERNO sheets written')

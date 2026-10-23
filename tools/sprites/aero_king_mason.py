"""FULL AERO from Mason's own drawings: tools/sprites/art/full_aero.png (his everyday FULL AERO) and
art/full_aero_infected.png (the white-and-navy version he wears on INFECTED.EXE). Both are 64x64, drawn over
the same pose as aero_king_draw.py's build, so they're cut into the same parts on the same joints - and
every animation in aero_moves.py plays with Mason's pixels.

How the cut works: each of his pixels goes to the part that covers that spot in the generated drawing
(the topmost one); pixels he added outside it go to the nearest part. The bits of each part that are hidden
behind other parts (the chest behind the arm, the wing behind the body...) are filled in from that part's own
visible pixels, so nothing shows a hole when a limb moves away.

Use it like a draw module: source('full_aero.png') returns an object with draw_parts / composite / ORDER / RIG.
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage
import aero_king_draw as K
import biped

ART = os.path.join(os.path.dirname(__file__), 'art')

def cut(path):
    art = np.array(Image.open(os.path.join(ART, path)).convert('RGBA'))
    gen = K.draw_parts()
    H, W = art.shape[:2]
    # who covers each spot in the generated drawing (topmost part wins)
    owner = np.full((H, W), -1, int)
    for i, n in enumerate(K.ORDER):
        owner[gen[n][..., 3] > 0] = i
    solid = art[..., 3] > 0
    # Mason's pixels outside the generated silhouette: the nearest owned spot's part
    if (solid & (owner < 0)).any():
        _, (iy, ix) = ndimage.distance_transform_edt(owner < 0, return_indices=True)
        owner = np.where(owner < 0, owner[iy, ix], owner)
    layers = {}
    for i, n in enumerate(K.ORDER):
        a = np.zeros_like(art)
        mine = solid & (owner == i)
        a[mine] = art[mine]
        layers[n] = a
    for i, n in enumerate(K.ORDER):                       # the hidden parts of each piece, filled from its visible pixels
        if not (layers[n][..., 3] > 0).any(): continue
        hidden = (gen[n][..., 3] > 0) & solid & (owner != i)
        biped.fill(layers, n, hidden)
    return layers

class source:
    ORDER = K.ORDER
    RIG = K.RIG
    def __init__(self, path):
        self.path = path
        self._layers = None
    def draw_parts(self):
        if self._layers is None: self._layers = cut(self.path)
        return {n: a.copy() for n, a in self._layers.items()}
    def composite(self, P, hide=()):
        out = np.zeros((64, 64, 4), np.uint8)
        for n in self.ORDER:
            if n in hide: continue
            a = P[n]; m = a[..., 3] > 0; out[m] = a[m]
        return out

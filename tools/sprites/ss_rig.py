"""Soul Summoner as a puppet with real limbs (tools/sprites/biped.py), cut from Mason's own idle drawing
(public/assets/fighters/soul-summoner/idle_sheet.png, frame 0) so every pose is still his pixels.

Parts: cape, back arm (upper / fore), back leg (thigh / shin / boot), armoured torso, front leg, crowned
helm, front arm (pauldron / forearm / gauntlet) and the soulfire in his palm (five flicker frames).
Hidden pixels - the chest behind his arms, the cape behind his body, the armour where his legs join -
are filled in, so limbs can move anywhere without leaving holes.
"""
import os
import numpy as np
from PIL import Image
from puppet import Part, Rig
import biped

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
SRC = os.path.join(ROOT, 'public/assets/fighters/soul-summoner/idle_sheet.png')
FEET = (32, 58)

FLAME = {'076cc2', '78a0c6', 'f0f2f3'}
CAPE = {'3c2642', '60466a', '211129', '1c0f24'}
OUTLINE = (0x14, 0x11, 0x0f)

# joints (x, y) in the 64x64 drawing
J = {'neck': (34, 17), 'hip': (32, 46), 'cape': (24, 22),
     'fshoulder': (38, 25), 'felbow': (42, 28), 'fwrist': (46, 28), 'palm': (48, 26),
     'bshoulder': (24, 23), 'belbow': (24, 30),
     'bhip': (26, 48), 'bknee': (26, 52), 'bankle': (26, 56),
     'fhip': (36, 48), 'fknee': (37, 52), 'fankle': (37, 54)}

def box(x1, y1, x2, y2): return lambda x, y, c: x1 <= x <= x2 and y1 <= y <= y2

RULES = [
    ('flame', lambda x, y, c: c in FLAME and x >= 42),
    ('head', lambda x, y, c: y <= 16 and 25 <= x <= 42),
    ('ffist', box(45, 23, 53, 31)),
    ('ffore', box(41, 25, 44, 31)),
    ('fupper', lambda x, y, c: x >= 36 and x <= 40 and ((x - 38) / 3.2) ** 2 + ((y - 26) / 4.2) ** 2 <= 1),
    ('cape', lambda x, y, c: (c in CAPE and x <= 27) or x <= 19 or (x <= 21 and y >= 40)),
    ('bupper', box(21, 21, 26, 29)),
    ('bfore', box(21, 30, 26, 37)),
    ('bshoe', box(21, 56, 30, 59)),
    ('bshin', box(21, 52, 30, 55)),
    ('bthigh', box(21, 48, 30, 51)),
    ('fshoe', box(31, 54, 44, 59)),
    ('fshin', box(31, 52, 44, 53)),
    ('fthigh', box(31, 48, 44, 51)),
    ('torso', lambda x, y, c: True),
]
ORDER = ['cape', 'bupper', 'bfore', 'bthigh', 'bshin', 'bshoe', 'torso', 'fthigh', 'fshin', 'fshoe', 'head', 'fupper', 'ffore', 'ffist', 'flame']
PARENT = {'cape': ('torso', J['cape']), 'torso': (None, J['hip']), 'head': ('torso', J['neck']),
          'bupper': ('torso', J['bshoulder']), 'bfore': ('bupper', J['belbow']),
          'fupper': ('torso', J['fshoulder']), 'ffore': ('fupper', J['felbow']), 'ffist': ('ffore', J['fwrist']), 'flame': ('ffist', J['palm']),
          'bthigh': (None, J['bhip']), 'bshin': ('bthigh', J['bknee']), 'bshoe': ('bshin', J['bankle']),
          'fthigh': (None, J['fhip']), 'fshin': ('fthigh', J['fknee']), 'fshoe': ('fshin', J['fankle'])}

def ell(cx, cy, rx, ry):
    yy, xx = np.mgrid[0:64, 0:64]
    return ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1
def rect(x1, y1, x2, y2):
    yy, xx = np.mgrid[0:64, 0:64]
    return (xx >= x1) & (xx <= x2) & (yy >= y1) & (yy <= y2)

def layers_from(sheet):
    frames = [sheet[:, i * 64:(i + 1) * 64] for i in range(min(5, sheet.shape[1] // 64))]
    base = frames[0]
    L, owner = biped.cut(base, RULES)
    body = base[..., 3] > 0                                # fills stay inside his silhouette: they're only ever seen once something moves
    # hidden pixels: the chest behind both arms, the hips behind the legs, the cape behind the body
    biped.fill(L, 'torso', (ell(38, 26, 4, 5) | rect(26, 44, 41, 47)) & body)
    biped.fill(L, 'cape', ((rect(14, 21, 30, 52) & ~rect(14, 21, 20, 24)) | ell(24, 34, 7, 14)) & body)
    # little overlaps at every joint, so bends never open a gap
    for name, j, r in (('ffore', 'felbow', 2.5), ('ffist', 'fwrist', 2), ('bfore', 'belbow', 2.5), ('fupper', 'fshoulder', 3),
                       ('bshin', 'bknee', 2.5), ('fshin', 'fknee', 2.5), ('bshoe', 'bankle', 2), ('fshoe', 'fankle', 2),
                       ('bthigh', 'bhip', 3), ('fthigh', 'fhip', 3.5), ('head', 'neck', 2)):
        biped.cap(L, name, base, J[j], r)
    biped.overlap(L, ['cape', 'torso', 'head', 'bupper', 'bfore', 'fupper', 'ffore', 'ffist', 'bthigh', 'bshin', 'bshoe', 'fthigh', 'fshin', 'fshoe'], base, 2)
    flames = []
    for f in frames:                                       # the flame's five flicker frames
        a = np.zeros_like(f)
        for y in range(64):
            for x in range(42, 64):
                if f[y, x, 3] and ('%02x%02x%02x' % tuple(f[y, x, :3])) in FLAME and y <= 30: a[y, x] = f[y, x]
        flames.append(a)
    return base, L, flames

def build_rig(path=SRC, canvas=(112, 104), offset=(24, 36), follow=None):
    sheet = np.array(Image.open(path).convert('RGBA'))
    base, L, flames = layers_from(sheet)
    follow = follow or {}
    parts = []
    for z, name in enumerate(ORDER):
        parent, pivot = PARENT[name]
        dr, sw = follow.get(name, (0, 0))
        var = flames if name == 'flame' else [L[name]]
        up = 0.75 if name == 'flame' else 0.55 if name == 'cape' else 0      # the cape keeps hanging when he leans
        parts.append(Part(name, var[0][..., 3] > 0, pivot, parent, z=z, variants=var, upright=up, drag=dr, sway=sw))
    small = Rig(base, parts, (64, 64), (0, 0), FEET)
    big = Rig(base, parts, canvas, offset, FEET)
    return small, big, L

def angle(a, b): return np.degrees(np.arctan2(b[1] - a[1], b[0] - a[0]))
# where each limb points in the drawing (degrees, 0 = forward, 90 = down) - for biped.Aim
BONES = {'fupper': ('torso', angle(J['fshoulder'], J['felbow'])), 'ffore': ('fupper', angle(J['felbow'], J['fwrist'])), 'ffist': ('ffore', 0.0),
         'bupper': ('torso', angle(J['bshoulder'], J['belbow'])), 'bfore': ('bupper', 90.0),
         'bthigh': (None, angle(J['bhip'], J['bknee'])), 'bshin': ('bthigh', angle(J['bknee'], J['bankle'])), 'bshoe': ('bshin', 0.0),
         'fthigh': (None, angle(J['fhip'], J['fknee'])), 'fshin': ('fthigh', angle(J['fknee'], J['fankle'])), 'fshoe': ('fshin', 0.0),
         'torso': (None, -90.0), 'head': ('torso', -90.0)}
LEGS = {'b': ('bthigh', 'bshin', 'bshoe', 'bhip', 'bknee', 'bankle'), 'f': ('fthigh', 'fshin', 'fshoe', 'fhip', 'fknee', 'fankle')}
body = biped.Body(J, BONES, LEGS)

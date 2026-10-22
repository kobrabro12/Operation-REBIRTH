"""Mr Wake as a puppet with real limbs (tools/sprites/biped.py), cut from Mason's own idle drawing
(public/assets/fighters/mr-wake/idle_sheet.png, frame 0 - or the Rosebud costume's) so every pose is still his pixels.

Parts: the cloak tail, his boots (with invisible legs above them - the robe hides his legs), the two halves
of his robe skirt (each one rides on a leg, so his robe parts when he steps), the robed torso, the hatted
head and mask, his sleeve (upper arm / forearm / hand) and the gem staff - one rigid piece held in his
hand, with the stretch hidden behind his body redrawn so it stays whole when it swings out from behind him.
"""
import os, math
import numpy as np
from PIL import Image
from puppet import Part, Rig
import biped

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
DIR = os.path.join(ROOT, 'public/assets/fighters/mr-wake')
FEET = (36, 61)
def hexrgb(h): return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
STAFF_COLS = {hexrgb(c) for c in ('2c2828', '545150', '443d4a', '33293c')}
STEM_COLS = {hexrgb(c) for c in ('1e4a1e', '2f7a2c', '58b048', '1f5524', '3c8c38', '7ccb5c')}   # Rosebud: a green stem

J = {'neck': (38, 21), 'hip': (37, 40), 'cape': (31, 35),
     'fshoulder': (42, 26), 'felbow': (45, 31), 'fwrist': (48, 29), 'grip': (47, 29),
     'bhip': (33, 41), 'bknee': (30, 50), 'bankle': (26, 57),
     'fhip': (41, 41), 'fknee': (43, 49), 'fankle': (43, 56)}
GEM, BUTT = (14, 15), (59, 33)

def angle(a, b): return math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))

def layers_from(base, staff_cols=STAFF_COLS, width=2.3):
    H, W = base.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W]
    solid = base[..., 3] > 0
    rgb = base[..., :3]
    is_staff_col = np.zeros((H, W), bool)
    for c in staff_cols: is_staff_col |= np.all(rgb == np.array(c), -1)
    ax, ay = GEM; bx, by = BUTT
    dx, dy = bx - ax, by - ay
    tt = ((xx - ax) * dx + (yy - ay) * dy) / (dx * dx + dy * dy)
    dist = np.abs((xx - ax) * dy - (yy - ay) * dx) / np.hypot(dx, dy)
    shaft = is_staff_col & (dist <= width) & (tt > -0.1) & (tt < 1.1) & solid
    gem = solid & (xx <= 22) & (yy <= 36)
    staff = shaft | gem
    bshoe = solid & (yy >= 55) & (xx <= 30) & ~staff
    fshoe = solid & (yy >= 55) & (xx >= 37) & ~staff
    cape = solid & (xx <= 29) & (yy >= 33) & ~staff & ~bshoe
    head = solid & (((yy <= 17) & (xx >= 20)) | ((yy <= 21) & (xx >= 32))) & ~staff
    fist = solid & (xx >= 49) & (yy >= 25) & (yy <= 33) & ~staff
    fore = solid & (xx >= 45) & (xx <= 48) & (yy >= 25) & (yy <= 34) & ~staff
    upper = solid & (xx >= 41) & (xx <= 44) & (yy >= 23) & (yy <= 34) & ~staff
    skirt = solid & (yy >= 41) & ~staff & ~bshoe & ~fshoe & ~cape
    bskirt = skirt & (xx <= 37)
    fskirt = skirt & (xx >= 38)
    torso = solid & ~(staff | bshoe | fshoe | cape | head | fist | fore | upper | bskirt | fskirt)
    L = {}
    def lay(m, src=base):
        a = np.zeros_like(base); a[m] = src[m]; return a
    for n, m in (('cape', cape), ('bshoe', bshoe), ('fshoe', fshoe), ('bskirt', bskirt), ('fskirt', fskirt), ('torso', torso),
                 ('head', head), ('fupper', upper), ('ffore', fore), ('ffist', fist), ('staff', staff)):
        L[n] = lay(m)
    for n in ('bthigh', 'bshin', 'fthigh', 'fshin'): L[n] = np.zeros_like(base)      # under the robe: never seen
    owner = np.full((H, W), '', object)
    for n in L:
        owner[L[n][..., 3] > 0] = n
    body = solid
    # hidden pixels: the robe behind the staff and the sleeve; the cloak and skirt behind each other
    biped.fill(L, 'torso', ((shaft & (xx >= 29) & (xx <= 48)) | ((xx >= 40) & (xx <= 50) & (yy >= 22) & (yy <= 36))) & body)
    biped.fill(L, 'cape', ((xx >= 24) & (xx <= 36) & (yy >= 33) & (yy <= 54)) & body)
    biped.fill(L, 'bskirt', ((xx >= 30) & (xx <= 42) & (yy >= 41) & (yy <= 54)) & body)       # (under the front half)
    biped.fill(L, 'torso', ((yy >= 36) & (yy <= 40) & (xx >= 30) & (xx <= 46)) & body)
    # the staff's middle, hidden behind his body: redrawn from a clean cross-section of the shaft
    line_y = lambda x: ay + (x - ax) * dy / dx
    x0 = min(range(20, 30), key=lambda x: (abs(int(shaft[:, x].sum()) - 3), abs(x - 24)))
    ys0 = np.nonzero(shaft[:, x0])[0]
    st = L['staffback'] = np.zeros_like(base)            # drawn behind his body, like the real staff
    for x in range(x0 + 1, 49):                          # (only the stretch behind his body)
        sh = int(round(line_y(x) - line_y(x0)))
        for y in ys0:
            ny = y + sh
            if 0 <= ny < H and not shaft[ny, x]: st[ny, x] = base[y, x0]
    biped.overlap(L, ['cape', 'torso', 'head', 'fupper', 'ffore', 'ffist', 'bskirt', 'fskirt', 'bshoe', 'fshoe'], base, 2)
    for name, j, r in (('ffore', 'felbow', 2.5), ('ffist', 'fwrist', 2), ('fupper', 'fshoulder', 3), ('head', 'neck', 2)):
        biped.cap(L, name, base, J[j], r)
    return L

ORDER = ['cape', 'staffback', 'bthigh', 'bshin', 'bshoe', 'bskirt', 'fthigh', 'fshin', 'fshoe', 'fskirt', 'torso', 'head', 'fupper', 'ffore', 'ffist', 'staff']
PARENT = {'cape': ('torso', J['cape']), 'torso': (None, J['hip']), 'head': ('torso', J['neck']),
          'fupper': ('torso', J['fshoulder']), 'ffore': ('fupper', J['felbow']), 'ffist': ('ffore', J['fwrist']), 'staff': ('ffist', J['grip']), 'staffback': ('staff', J['grip']),
          'bthigh': (None, J['bhip']), 'bshin': ('bthigh', J['bknee']), 'bshoe': ('bshin', J['bankle']), 'bskirt': ('bthigh', J['bhip']),
          'fthigh': (None, J['fhip']), 'fshin': ('fthigh', J['fknee']), 'fshoe': ('fshin', J['fankle']), 'fskirt': ('fthigh', J['fhip'])}

def build_rig(src='idle_sheet.png', staff_cols=STAFF_COLS, width=2.3, canvas=(176, 120), offset=(56, 48), follow=None):
    sheet = np.array(Image.open(os.path.join(DIR, src)).convert('RGBA'))
    base = sheet[:, :64]
    L = layers_from(base, staff_cols, width)
    follow = follow or {}
    parts = []
    for z, name in enumerate(ORDER):
        parent, pivot = PARENT[name]
        dr, sw = follow.get(name, (0, 0))
        parts.append(Part(name, L[name][..., 3] > 0, pivot, parent, z=z, variants=[L[name]], drag=dr, sway=sw, upright=0.5 if name == 'cape' else 0))   # the cloak keeps hanging when he leans
    return Rig(base, parts, (64, 64), (0, 0), FEET), Rig(base, parts, canvas, offset, FEET), L, base

BONES = {'fupper': ('torso', angle(J['fshoulder'], J['felbow'])), 'ffore': ('fupper', angle(J['felbow'], J['fwrist'])), 'ffist': ('ffore', angle(J['felbow'], J['fwrist'])),
         'staff': ('ffist', angle(BUTT, GEM)),            # the staff's direction = where the GEM points from his hand
         'bthigh': (None, angle(J['bhip'], J['bknee'])), 'bshin': ('bthigh', angle(J['bknee'], J['bankle'])), 'bshoe': ('bshin', 0.0),
         'fthigh': (None, angle(J['fhip'], J['fknee'])), 'fshin': ('fthigh', angle(J['fknee'], J['fankle'])), 'fshoe': ('fshin', 0.0),
         'bskirt': ('bthigh', 0.0), 'fskirt': ('fthigh', 0.0), 'torso': (None, -90.0), 'head': ('torso', -90.0)}
LEGS = {'b': ('bthigh', 'bshin', 'bshoe', 'bhip', 'bknee', 'bankle'), 'f': ('fthigh', 'fshin', 'fshoe', 'fhip', 'fknee', 'fankle')}
body = biped.Body(J, BONES, LEGS)

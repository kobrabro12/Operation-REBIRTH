"""THE ARCHIVIST's drawn faces (Mason's pixel drawings, 64x64, in tools/sprites/art/archivist/): the black ink is kept,
everything else made see-through, and the three put side by side -> public/assets/lore/records/faces.png
(frames: 0 smug, 1 annoyed, 2 shocked). The game puts one on her head like her drawn face (RecordsScene FACE_IMG).
Prints where each drawing's eyes sit, for FACE_IMG's anchors.  Run: python3 tools/sprites/archivist_faces.py"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, 'art/archivist')
OUT = os.path.join(HERE, '../../public/assets/lore/records/faces.png')
NAMES = ['smug', 'annoyed', 'shocked']

sheet = np.zeros((64, 64 * len(NAMES), 4), np.uint8)
for i, n in enumerate(NAMES):
    a = np.array(Image.open(os.path.join(SRC, 'face_%s.png' % n)).convert('RGBA'))
    ink = (a[..., 3] > 128) & (a[..., :3].max(axis=2) < 96)
    sheet[..., 64 * i:64 * (i + 1), :][ink] = (20, 18, 26, 255)
    ys, xs = np.nonzero(ink)
    top = ys < ys.min() + (ys.max() - ys.min()) * 0.4
    print(n, 'ink box', xs.min(), ys.min(), xs.max(), ys.max(), 'eyes at y %.1f x %.1f' % (ys[top].mean(), xs[top].mean()))
Image.fromarray(sheet).save(OUT, optimize=True)

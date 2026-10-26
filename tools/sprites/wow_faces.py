"""Mason's three faces for WHAT ONCE WAS's TV screen (his drawings: tools/sprites/art/wow_faces/face1-3.png).
The screen is only 11x9 pixels, so each face is redrawn here by hand at that size, keeping what makes it his:
  face 1  scribbled hair, angry > < eyes, a gritted grimace        (shown when it gets hit)
  face 2  two tall staring eyes, a wide flat mouth, tongue out     (taunting, and now and then)
  face 3  googly eyes looking two ways, a huge toothy grin         (when it lands a hit)
In each costume's screen colours (taken from the SMILE faces in mode_screens.png): a row per costume, like
mode_screens.png. Writes public/assets/fighters/what-once-was/faces.png (3 columns x 5 rows of 11x9).

  python3 tools/sprites/wow_faces.py
"""
import os
from collections import Counter
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
DIR = os.path.join(ROOT, 'public/assets/fighters/what-once-was')
# '#' line, '.' screen, 't' teeth (bright), 'r' red (tongue / gums), 'x' scribble (line, dimmed)
FACES = [
    ['xxxxxxxxxxx',
     '.x.xx.xx.x.',
     '...........',
     '##.......##',
     '..#.....#..',
     '##.......##',
     '...#####...',
     '..#t.t.t#..',
     '.#.#####.#.'],
    ['.###...###.',
     '#...#.#...#',
     '#.#.#.#.#.#',
     '#...#.#...#',
     '.###...###.',
     '...........',
     '.##......##',
     '..######rr.',
     '......rrr..'],
    ['.##....###.',
     '#.##..#.###',
     '.##....###.',
     '...........',
     '.#########.',
     '.#t.t.t.t#.',
     '.#.......#.',
     '..#t.t.t#..',
     '...#####...'],
]

def screen_colours(ms, row):
    """The screen's background and line colours for a costume row, from its SMILE face (column 8)."""
    tile = np.array(ms.crop((8 * 11, row * 9, 9 * 11, row * 9 + 9)))[..., :3].reshape(-1, 3)
    cnt = Counter(tuple(int(v) for v in px) for px in tile).most_common()
    bg = cnt[0][0]
    line = max((c for c, _ in cnt[:4]), key=lambda c: sum(c))
    return bg, line

def build():
    ms = Image.open(os.path.join(DIR, 'mode_screens.png')).convert('RGBA')
    rows = ms.height // 9
    out = np.zeros((rows * 9, 3 * 11, 4), np.uint8)
    for r in range(rows):
        bg, line = screen_colours(ms, r)
        dim = tuple(int(bg[i] * 0.4 + line[i] * 0.6) for i in range(3))
        col = {'.': bg, '#': line, 't': (255, 255, 255), 'r': (216, 58, 42), 'x': dim}
        for f, rowsF in enumerate(FACES):
            for y, s in enumerate(rowsF):
                for x, ch in enumerate(s):
                    out[r * 9 + y, f * 11 + x] = (*col[ch], 255)
    Image.fromarray(out).save(os.path.join(DIR, 'faces.png'))
    return out

if __name__ == '__main__':
    build(); print('faces.png written')

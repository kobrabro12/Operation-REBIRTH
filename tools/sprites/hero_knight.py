"""Hero Knight sprite sheets for the game, cut from the Hero Knight asset pack (CC0, see hero-knight/License.txt).
Run:  python3 tools/sprites/hero_knight.py tools/sprites/hero-knight/Sprites public/assets/fighters/hero-knight
The pack's frames are 180x180 with the knight's feet on row 113. Each frame is cropped to 150x90
(x 30..180, y 28..118): enough room for his widest sword swipe and his death fall, and his feet land
at (66, 85) inside the crop, which is the sprite origin the game uses.
The sword swipes in the two attack strips are the only pure-white (#ffffff) pixels, so they are made
partly see-through (alpha 150) so fighters inside the swipe stay visible.
guard_sheet.png is one frame for the counter stance: the last Attack2 frame (crouched, sword angled
down and toward the opponent) with the leftover swipe specks removed, and the sword raised to her shoulder.
"""
import os, sys
from PIL import Image

SRC, OUT = sys.argv[1], sys.argv[2]
CROP = (30, 28, 180, 118)
SHEETS = {'Idle': 'idle', 'Run': 'run', 'Attack1': 'attack1', 'Attack2': 'attack2', 'Jump': 'jump', 'Fall': 'fall', 'Take Hit': 'hit', 'Death': 'death'}
os.makedirs(OUT, exist_ok=True)
for src, name in SHEETS.items():
    im = Image.open(os.path.join(SRC, src + '.png')).convert('RGBA')
    n = im.width // 180
    w, h = CROP[2] - CROP[0], CROP[3] - CROP[1]
    sheet = Image.new('RGBA', (w * n, h), (0, 0, 0, 0))
    for i in range(n):
        sheet.alpha_composite(im.crop((i * 180 + CROP[0], CROP[1], i * 180 + CROP[2], CROP[3])), (i * w, 0))
    if name in ('attack1', 'attack2'):
        px = sheet.load()
        for y in range(sheet.height):
            for x in range(sheet.width):
                r, g, b, a = px[x, y]
                if a and (r, g, b) == (255, 255, 255): px[x, y] = (255, 255, 255, 150)
    sheet.save(os.path.join(OUT, name + '_sheet.png'))
    print(name, n, 'frames')

# counter guard: last Attack2 frame without the white swipe specks
a2 = Image.open(os.path.join(OUT, 'attack2_sheet.png')).convert('RGBA')
guard = a2.crop((6 * 150, 0, 7 * 150, 90))
px = guard.load()
for y in range(guard.height):
    for x in range(guard.width):
        r, g, b, a = px[x, y]
        if a and (r, g, b) == (255, 255, 255): px[x, y] = (0, 0, 0, 0)
# hold the sword up near her shoulder: lift the hands, hilt and blade 7 px (and 2 px back toward her),
# keeping the blade's downward-forward angle; the forearm left behind reads as a bent elbow
moving = lambda x, y: x >= 105 or (x >= 101 and y <= 69)
raised = Image.new('RGBA', guard.size, (0, 0, 0, 0)); rp = raised.load()
for y in range(guard.height):
    for x in range(guard.width):
        if px[x, y][3] and not moving(x, y): rp[x, y] = px[x, y]
for y in range(guard.height):
    for x in range(guard.width):
        if px[x, y][3] and moving(x, y) and 0 <= y - 7 < guard.height: rp[x - 2, y - 7] = px[x, y]
guard = raised
guard.save(os.path.join(OUT, 'guard_sheet.png'))
print('guard 1 frame')

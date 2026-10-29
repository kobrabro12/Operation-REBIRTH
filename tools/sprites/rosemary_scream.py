"""RTD (REMEMBER THAT DAY): the shopkeeper's secret screen - Rosemary's face, eyes gone solid black, screaming over
and over with black gunk pouring out of her mouth. Drawn as a 10-frame strip of 68x68 frames (the size of his screen),
played on a loop by ShopScene's RTD secret with VHS damage added live in the game.

Run: python3 tools/sprites/rosemary_scream.py   -> public/assets/shop/rtd_scream.png
Her colours come from her fighter art (tools/sprites/art/rosemary_base.png): brown hair, pale skin, yellow raincoat.
"""
import math, os, random
from PIL import Image, ImageDraw

S = 68                    # frame size (his screen)
N = 10                    # frames in the loop
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'assets', 'shop', 'rtd_scream.png')

HAIR = [(58, 28, 16), (88, 46, 24), (122, 66, 34), (150, 86, 44)]       # dark -> light
SKIN = [(122, 86, 78), (176, 132, 116), (214, 176, 156), (236, 208, 188)]
COAT = [(120, 92, 26), (176, 136, 40), (216, 176, 64), (240, 208, 104)]
GUNK = (8, 5, 7)
SHEEN = (54, 44, 52)
BG = (14, 10, 12)

# how far her jaw is open in each frame (pixels): opening, a long held scream that shudders, a gasp, again
JAW = [6, 11, 15, 17, 18, 17, 18, 16, 10, 7]
# her head shakes while she screams
SHAKE = [0, 0, 1, -1, 1, -1, 1, 0, 0, 0]


def frame(i, rng):
    im = Image.new('RGB', (S, S), BG)
    d = ImageDraw.Draw(im)
    # a dim light behind her head
    for r in range(30, 0, -3):
        c = 14 + (30 - r) // 3
        d.ellipse([34 - r, 26 - r, 34 + r, 26 + r], fill=(c + 4, c, c))
    sx = SHAKE[i]
    jaw = JAW[i]
    cx = 34 + sx
    # the raincoat: shoulders and a high collar
    d.polygon([(4, 68), (10, 54), (22, 49), (46, 49), (58, 54), (64, 68)], fill=COAT[1])
    d.polygon([(10, 68), (14, 57), (24, 52), (24, 68)], fill=COAT[2])
    d.polygon([(44, 52), (54, 57), (58, 68), (44, 68)], fill=COAT[0])
    d.polygon([(20, 50), (26, 44), (34, 50), (42, 44), (48, 50), (42, 56), (34, 52), (26, 56)], fill=COAT[2])   # the collar
    d.line([(26, 56), (34, 52), (42, 56)], fill=COAT[0])
    # hair behind the face, hanging long and lank
    d.ellipse([cx - 22, 5, cx + 22, 46], fill=HAIR[0])
    d.rectangle([cx - 22, 24, cx - 13, 52], fill=HAIR[0]); d.rectangle([cx + 13, 24, cx + 22, 52], fill=HAIR[0])
    # the neck and face (a longer face the wider the jaw opens)
    d.rectangle([cx - 6, 40, cx + 6, 51], fill=SKIN[1])
    face_bottom = 44 + jaw // 3
    d.ellipse([cx - 13, 11, cx + 13, face_bottom], fill=SKIN[2])
    d.ellipse([cx - 12, 12, cx + 6, face_bottom - 6], fill=SKIN[3])          # the lit side
    d.ellipse([cx + 4, 16, cx + 13, face_bottom - 2], fill=SKIN[1])          # the shadowed side
    # cheeks pulled taut, hollow
    d.line([(cx - 9, 27), (cx - 7, 36 + jaw // 4)], fill=SKIN[1]); d.line([(cx + 9, 27), (cx + 7, 36 + jaw // 4)], fill=SKIN[0])
    # brows: wrenched up
    d.line([(cx - 11, 17), (cx - 4, 15)], fill=HAIR[0], width=2); d.line([(cx + 4, 15), (cx + 11, 17)], fill=HAIR[0], width=2)
    # the eyes: solid black, with dark wet rings and a streak running down
    for ex in (cx - 7, cx + 7):
        d.ellipse([ex - 5, 18, ex + 5, 27], fill=SKIN[0])
        d.ellipse([ex - 4, 19, ex + 4, 26], fill=GUNK)
        streak = 4 + (i * 3 + (ex > cx) * 5) % 9
        d.line([(ex - 1 + (ex > cx), 26), (ex - 1 + (ex > cx), 26 + streak)], fill=GUNK)
    d.point([(cx - 9, 20), (cx + 5, 20)], fill=SHEEN)                       # a dull sheen on the black
    # nose
    d.line([(cx, 24), (cx - 1, 30)], fill=SKIN[1]); d.point([(cx - 2, 31), (cx + 1, 31)], fill=SKIN[0])
    # the mouth: wrenched open, black inside, gunk welling over the lip
    top, bot = 33, 33 + jaw
    w = 6 + jaw // 4
    d.ellipse([cx - w - 1, top - 1, cx + w + 1, bot + 1], fill=SKIN[0])     # lips
    d.ellipse([cx - w, top, cx + w, bot], fill=(40, 12, 14))                  # the open mouth: dark red inside
    d.ellipse([cx - w + 2, top + jaw // 3, cx + w - 2, bot], fill=GUNK)     # ...filling with black gunk from the throat
    if jaw > 9:                                                             # teeth at the top edge
        d.line([(cx - w + 3, top + 1), (cx + w - 3, top + 1)], fill=(200, 188, 170))
    # the gunk: pouring from the lower lip, down the chin and neck, onto the coat - longer as the scream goes on
    pour = 3 + i
    for k, (ox, wid) in enumerate([(-3, 2), (1, 3), (4, 1), (-6, 1)]):
        length = pour + (k * 7) % 9 + jaw // 2
        x0 = cx + ox
        d.rectangle([x0 - wid // 2, bot - 2, x0 + wid // 2, min(67, bot + length)], fill=GUNK)
        d.ellipse([x0 - wid // 2 - 1, min(66, bot + length) - 2, x0 + wid // 2 + 1, min(67, bot + length) + 2], fill=GUNK)   # a fat drip at the end
        d.point((x0 - wid // 2 + 1 if wid > 2 else x0, bot + 2 + (i * 5 + k * 3) % max(1, length - 2)), fill=SHEEN)       # a wet glint sliding down
    # splatter on the collar
    for _ in range(8):
        x = cx + rng.randint(-14, 14); y = rng.randint(50, 66)
        d.point((x, y), fill=GUNK)
    # hair over the forehead: lank strands in front
    for k, x in enumerate(range(cx - 14, cx + 15, 4)):
        top_y = 8 + abs(x - cx) // 5
        length = 5 + (k * 5) % 5 + (8 if abs(x - cx) > 9 else 0)
        d.line([(x, top_y), (x + (1 if x > cx else -1), top_y + length)], fill=HAIR[1 + (k % 2)], width=2)
    d.arc([cx - 18, 3, cx + 18, 30], 200, 340, fill=HAIR[3])
    # a little grain baked in
    px = im.load()
    for _ in range(140):
        x, y = rng.randrange(S), rng.randrange(S)
        r, g, b = px[x, y]; n = rng.randint(-18, 18)
        px[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)))
    return im


def main():
    rng = random.Random(1994)
    strip = Image.new('RGB', (S * N, S))
    for i in range(N):
        strip.paste(frame(i, rng), (i * S, 0))
    strip.save(OUT)
    print('wrote', os.path.normpath(OUT))


if __name__ == '__main__':
    main()

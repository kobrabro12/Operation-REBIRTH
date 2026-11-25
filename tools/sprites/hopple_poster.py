"""THE MISSING POSTER for HOPPLE's LOST BUILD cutscene (src/stage/hoppleBossStage.js, `HAUNT`).

A photocopied MISSING poster for a made-up girl, CASSIE HOLLOWAY (age 9, last seen playing a video game in 1994):
a school photo run through a cheap copier (grey toner, ordered-dither halftone, streaks), torn-off phone tabs, tape,
a staple, creases, a water stain and a rusty smear. Two frames side by side in one sheet:
  0 = the poster,  1 = the same poster after he's had it: the eyes in the photo scratched out black, red scrawl over it.
Written to public/assets/stages/hopple/missing.png (POSTER_W x POSTER_H per frame, palette PNG).
Also THE JUMPSCARE - his gored face filling a 320x180 screen, shaded and run through a bad tape (chromatic split,
scanlines, noise): public/assets/stages/hopple/scare.png, shown at 2x by IT SEES YOU and THE HAUNTING.

    python3 tools/sprites/hopple_poster.py [--preview FILE]

Needs Pillow + numpy. Uses DejaVu fonts if installed (most Linux / any machine with matplotlib has them), else
Pillow's built-in font.
"""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'public', 'assets', 'stages', 'hopple', 'missing.png')
SCARE_OUT = os.path.join(ROOT, 'public', 'assets', 'stages', 'hopple', 'scare.png')
# one frame's size in the game, and how much finer it's drawn first
POSTER_W, POSTER_H = 200, 272
SS = 3
W, H = POSTER_W * SS, POSTER_H * SS
# paper, toner and the red
PAPER = (232, 226, 206)
TONER = (28, 26, 30)
RED = (150, 18, 22)
RUST = (112, 40, 26)
RNG = np.random.default_rng(1994)


def font(size, bold=False, oblique=False):
    """A font at `size` (DejaVu if it can be found, else Pillow's default)."""
    name = 'DejaVuSans' + {(0, 0): '', (1, 0): '-Bold', (0, 1): '-Oblique', (1, 1): '-BoldOblique'}[(int(bold), int(oblique))] + '.ttf'
    dirs = ['/usr/share/fonts/truetype/dejavu', '/usr/share/fonts/dejavu', '/Library/Fonts', 'C:/Windows/Fonts']
    try:
        import matplotlib
        dirs.append(os.path.join(os.path.dirname(matplotlib.__file__), 'mpl-data', 'fonts', 'ttf'))
    except Exception:
        pass
    for d in dirs:
        p = os.path.join(d, name)
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    try:
        return ImageFont.load_default(size)
    except TypeError:
        return ImageFont.load_default()


def centred(d, y, text, f, fill):
    """Text centred across the poster at height y."""
    w = d.textlength(text, font=f)
    d.text(((W - w) / 2, y), text, font=f, fill=fill)


def photo(w, h, scratched):
    """The school photo: a girl with dark pigtails and a fringe, a little smile, a cardigan over a collar, on a
    mottled studio backdrop - then photocopied (grey, contrasty, halftoned). `scratched` = eyes gouged out black."""
    im = Image.new('RGB', (w, h), (120, 132, 150))
    d = ImageDraw.Draw(im)
    for i in range(140):                                                    # the mottled backdrop
        x, y, r = RNG.integers(0, w), RNG.integers(0, h), RNG.integers(10, 40)
        c = int(RNG.integers(100, 160))
        d.ellipse([x - r, y - r, x + r, y + r], fill=(c - 10, c, c + 14))
    im = im.filter(ImageFilter.GaussianBlur(14))
    d = ImageDraw.Draw(im)
    cx, cy = w // 2, int(h * 0.44)
    fw, fh = int(w * 0.30), int(h * 0.40)
    skin, skinD = (226, 186, 160), (196, 150, 126)
    hair, hairD = (70, 46, 34), (40, 26, 20)
    # shoulders: a cardigan over a white collar
    d.ellipse([cx - w * 0.46, h * 0.74, cx + w * 0.46, h * 1.45], fill=(150, 40, 54))
    d.polygon([(cx - w * 0.12, h * 0.76), (cx, h * 0.92), (cx + w * 0.12, h * 0.76), (cx + w * 0.06, h * 0.86), (cx - w * 0.06, h * 0.86)], fill=(240, 238, 232))
    d.polygon([(cx - w * 0.10, h * 0.77), (cx - w * 0.02, h * 0.84), (cx - w * 0.16, h * 0.84)], fill=(250, 250, 246))
    d.polygon([(cx + w * 0.10, h * 0.77), (cx + w * 0.02, h * 0.84), (cx + w * 0.16, h * 0.84)], fill=(250, 250, 246))
    d.rectangle([cx - fw * 0.22, cy + fh * 0.36, cx + fw * 0.22, h * 0.80], fill=skinD)          # neck
    # pigtails behind, with ribbons
    for s in (-1, 1):
        px = cx + s * fw * 0.62
        for k in range(5):
            yy = cy + fh * 0.05 + k * fh * 0.16
            d.ellipse([px - fw * 0.17 + s * k * 3, yy, px + fw * 0.17 + s * k * 3, yy + fh * 0.2], fill=hair if k % 2 else hairD)
        d.polygon([(px - fw * 0.16, cy - fh * 0.06), (px + fw * 0.16, cy - fh * 0.06), (px, cy + fh * 0.06)], fill=(210, 60, 90))
    # the head, hair over it, the fringe
    d.ellipse([cx - fw * 0.66, cy - fh * 0.62, cx + fw * 0.66, cy + fh * 0.42], fill=hair)
    d.ellipse([cx - fw * 0.5, cy - fh * 0.42, cx + fw * 0.5, cy + fh * 0.5], fill=skin)
    d.ellipse([cx - fw * 0.5, cy + fh * 0.05, cx + fw * 0.5, cy + fh * 0.5], fill=skinD)
    d.ellipse([cx - fw * 0.47, cy - fh * 0.40, cx + fw * 0.47, cy + fh * 0.44], fill=skin)
    d.chord([cx - fw * 0.6, cy - fh * 0.66, cx + fw * 0.6, cy - fh * 0.02], 180, 360, fill=hair)
    for k in range(9):                                                      # fringe strands
        x0 = cx - fw * 0.52 + k * fw * 0.13
        d.polygon([(x0, cy - fh * 0.3), (x0 + fw * 0.13, cy - fh * 0.3), (x0 + fw * 0.07, cy - fh * (0.1 + 0.04 * (k % 3)))], fill=hair if k % 2 else hairD)
    # eyes, nose, a small smile, freckles
    ey = cy - fh * 0.02
    for s in (-1, 1):
        ex = cx + s * fw * 0.22
        if scratched:
            for j in range(16):                                             # scratched out, hard
                a = RNG.uniform(-0.6, 0.6)
                d.line([(ex - fw * 0.17, ey + j * 1.4 - 11), (ex + fw * 0.17, ey + j * 1.4 - 11 + a * 12)], fill=(4, 2, 4), width=4)
        else:
            d.ellipse([ex - fw * 0.1, ey - fh * 0.05, ex + fw * 0.1, ey + fh * 0.05], fill=(250, 248, 244))
            d.ellipse([ex - fw * 0.06, ey - fh * 0.045, ex + fw * 0.06, ey + fh * 0.045], fill=(54, 40, 32))
            d.ellipse([ex - fw * 0.02, ey - fh * 0.03, ex + fw * 0.01, ey - fh * 0.005], fill=(255, 255, 255))
            d.arc([ex - fw * 0.12, ey - fh * 0.12, ex + fw * 0.12, ey - fh * 0.02], 200, 340, fill=hairD, width=3)
    d.line([(cx, ey + fh * 0.06), (cx - fw * 0.03, ey + fh * 0.15), (cx + fw * 0.02, ey + fh * 0.16)], fill=skinD, width=3)
    d.arc([cx - fw * 0.17, ey + fh * 0.14, cx + fw * 0.17, ey + fh * 0.3], 20, 160, fill=(150, 70, 70), width=4)
    for _ in range(14):
        fx, fy = cx + RNG.uniform(-fw * 0.32, fw * 0.32), ey + RNG.uniform(fh * 0.06, fh * 0.14)
        d.ellipse([fx - 2, fy - 2, fx + 2, fy + 2], fill=skinD)
    im = im.filter(ImageFilter.GaussianBlur(1.6))
    # the photocopier: grey, harsh, a 4x4 ordered dither, toner streaks
    g = np.asarray(im.convert('L')).astype(float) / 255
    g = np.clip((g - 0.5) * 1.3 + 0.58, 0, 1)
    bayer = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0
    cell = 2
    yy, xx = np.indices(g.shape)
    thr = bayer[(yy // cell) % 4, (xx // cell) % 4]
    ink = g < thr * 0.9 + 0.05
    out = np.where(ink[..., None], np.array(TONER), np.array(PAPER)).astype(np.uint8)
    for _ in range(3):                                                      # copier streaks
        x = RNG.integers(0, w)
        out[:, x:x + int(RNG.integers(1, 3))] = (out[:, x:x + 1] * 0.6).astype(np.uint8)
    return Image.fromarray(out)


def poster(scratched):
    """One frame of the poster at SS x size (see the top of the file)."""
    im = Image.new('RGB', (W, H), PAPER)
    px = np.asarray(im).astype(float)
    px += RNG.normal(0, 5, px.shape)                                        # paper grain
    yy, xx = np.indices((H, W))
    px *= (1 - 0.18 * (((xx - W / 2) / W) ** 2 + ((yy - H / 2) / H) ** 2))[..., None]   # yellowed edges
    im = Image.fromarray(np.clip(px, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(im)
    s = SS
    centred(d, 8 * s, 'MISSING', font(39 * s, bold=True), TONER)
    centred(d, 49 * s, 'HAVE YOU SEEN ME?', font(10 * s, bold=True), TONER)
    pw, ph = 116 * s, 104 * s
    im.paste(photo(pw, ph, scratched), ((W - pw) // 2, 64 * s))
    d.rectangle([(W - pw) // 2 - 2, 64 * s - 2, (W + pw) // 2 + 1, 64 * s + ph + 1], outline=TONER, width=s)
    centred(d, 172 * s, 'CASSIE HOLLOWAY', font(14 * s, bold=True), TONER)
    lines = ['AGE: 9      HEIGHT: 4\'2"', 'HAIR: BROWN, IN PIGTAILS', 'LAST SEEN OCT. 14, 1994, PLAYING', 'A VIDEO GAME AT A FRIEND\'S HOUSE.', 'WEARING A RED CARDIGAN.']
    for i, t in enumerate(lines):
        centred(d, (190 + i * 9) * s, t, font(7 * s), TONER)
    d.line([(10 * s, 237 * s), (W - 10 * s, 237 * s)], fill=TONER, width=s)
    # tear-off tabs (two already torn away)
    n, tw = 8, (W - 12 * s) / 8
    for i in range(n):
        x0 = 6 * s + i * tw
        if i in (2, 5):
            d.rectangle([x0, 238 * s, x0 + tw, H], fill=(0, 0, 0, 0))
            continue
        d.line([(x0, 238 * s), (x0, H - 2 * s)], fill=(150, 144, 128), width=1)
        t = Image.new('RGBA', (34 * s, int(tw)), (0, 0, 0, 0))
        ImageDraw.Draw(t).text((0, 0), '555-0143', font=font(5 * s), fill=TONER + (255,))
        t = t.rotate(90, expand=True)
        im.paste(t, (int(x0 + tw * 0.2), 239 * s), t)
    arr = np.asarray(im).copy()
    for i in (2, 5):                                                        # the torn-off tabs are holes in the paper
        x0 = int(6 * s + i * tw)
        arr[238 * s + 3:, x0:int(x0 + tw)] = 0
    im = Image.fromarray(arr)
    d = ImageDraw.Draw(im, 'RGBA')
    # creases, a water stain, tape, a staple, a rusty smear
    for y in (H * 0.34, H * 0.68):
        d.line([(0, y), (W, y + RNG.uniform(-6, 6))], fill=(255, 255, 250, 70), width=2)
        d.line([(0, y + 3), (W, y + 3)], fill=(120, 110, 90, 50), width=2)
    d.line([(W * 0.5, 0), (W * 0.52, H)], fill=(120, 110, 90, 40), width=2)
    for r in range(28 * s, 12 * s, -4):
        d.ellipse([W * 0.72 - r, H * 0.12 - r * 0.8, W * 0.72 + r, H * 0.12 + r * 0.8], outline=(150, 120, 70, 26), width=3)
    for (tx, ty, a) in ((W * 0.08, 6, 30), (W * 0.92, 6, -30)):
        tape = Image.new('RGBA', (34 * s, 11 * s), (236, 230, 200, 120))
        tape = tape.rotate(a, expand=True)
        im.paste(tape, (int(tx - tape.width / 2), int(ty - tape.height / 3)), tape)
    d = ImageDraw.Draw(im, 'RGBA')
    d.line([(W / 2 - 8 * s, 4 * s), (W / 2 + 8 * s, 4 * s)], fill=(150, 150, 160, 255), width=s)
    for _ in range(26):                                                     # a rusty smear down the right edge (old, dried): dragged fingers
        x, y = W * 0.84 + RNG.normal(0, 5 * s), H * 0.5 + RNG.normal(0, 10 * s)
        l, wdt = RNG.uniform(14, 46) * s, RNG.uniform(1, 3) * s
        d.line([(x, y), (x + RNG.normal(0, 2 * s), y + l)], fill=RUST + (int(RNG.uniform(50, 130)),), width=int(wdt))
    if scratched:                                                           # his handwriting, in red
        w = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        wd = ImageDraw.Draw(w)
        f = font(15 * s, bold=True, oblique=True)
        wd.text((18 * s, 126 * s), 'YOU DID THIS', font=f, fill=RED + (235,))
        wd.text((40 * s, 146 * s), 'TO HER', font=f, fill=RED + (235,))
        w = w.rotate(-9, center=(W / 2, H / 2))
        for _ in range(40):                                                 # drips off the letters
            x, y = RNG.uniform(20 * s, W - 30 * s), RNG.uniform(130 * s, 168 * s)
            l = RNG.uniform(6, 30) * s
            ImageDraw.Draw(w).line([(x, y), (x, y + l)], fill=RED + (200,), width=max(1, s - 1))
        im.paste(w, (0, 0), w)
    return im


def scare():
    """THE JUMPSCARE: his face, far too close - matted blood-stained fur, two black sockets with pinprick eyes weeping
    blood, a grin split ear to ear full of yellowed, broken teeth, stitches - drawn at 4x, shaded, then degraded like a
    bad tape and shrunk to 320x180 (see the top of the file)."""
    S = 4
    w, h = 320 * S, 180 * S
    yy, xx = np.indices((h, w)).astype(float)
    cx, cy = w / 2, h * 0.52
    # the head: fur with a fine noise texture, darker toward its edge, on black with a red bloom behind
    r = np.sqrt(((xx - cx) / (w * 0.56)) ** 2 + ((yy - cy) / (h * 0.78)) ** 2)
    fur = np.array([214, 204, 182], float)
    noise = RNG.normal(0, 1, (h // 4 + 1, w // 4 + 1)).repeat(4, 0).repeat(4, 1)[:h, :w]
    shade = np.clip(1.15 - r * 0.75, 0, 1)[..., None] * (0.92 + 0.06 * noise[..., None])
    img = fur * shade
    bg = np.zeros((h, w, 3)); bg[..., 0] = 60 * np.clip(1 - np.sqrt(((xx - cx) / w) ** 2 + ((yy - cy) / h) ** 2) * 1.6, 0, 1)
    img = np.where((r < 1)[..., None], img, bg)
    im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(im, 'RGBA')
    # matted blood in the fur
    for _ in range(26):
        x, y, rr = RNG.uniform(w * 0.1, w * 0.9), RNG.uniform(0, h * 0.5), RNG.uniform(14, 60) * S / 2
        for k in range(5):
            d.ellipse([x - rr * (1 - k * 0.15) + RNG.normal(0, 4), y - rr * 0.6 * (1 - k * 0.15), x + rr * (1 - k * 0.15), y + rr * 0.6 * (1 - k * 0.15)], fill=(96 - k * 12, 8, 12, 120))
    # the cheeks: old pink, smeared
    for s in (-1, 1):
        d.ellipse([cx + s * w * 0.33 - 90, cy - 20, cx + s * w * 0.33 + 90, cy + 70], fill=(190, 100, 110, 90))
    # the eyes: huge black sockets, a red rim inside, a pinprick each, blood running down
    for s in (-1, 1):
        ex, ey = cx + s * w * 0.21, h * 0.3
        for k in range(8):
            gr = 1 - k * 0.06
            d.ellipse([ex - 150 * gr, ey - 190 * gr, ex + 150 * gr, ey + 190 * gr], fill=(int(40 - k * 5), 0, 0, 255 if k > 2 else 140))
        d.ellipse([ex - 118, ey - 156, ex + 118, ey + 156], fill=(2, 0, 2, 255))
        d.ellipse([ex - 9 + s * 10, ey - 12, ex + 9 + s * 10, ey + 6], fill=(255, 240, 230, 255))
        for j in range(5):
            x0 = ex + RNG.uniform(-80, 80)
            l = RNG.uniform(120, 360)
            wdt = RNG.uniform(8, 20)
            d.rectangle([x0 - wdt / 2, ey + 120, x0 + wdt / 2, ey + 120 + l], fill=(150, 10, 18, 255))
            d.ellipse([x0 - wdt, ey + 110 + l, x0 + wdt, ey + 130 + l + wdt], fill=(150, 10, 18, 255))
    # the nose
    d.polygon([(cx - 40, h * 0.5), (cx + 40, h * 0.5), (cx, h * 0.56)], fill=(160, 80, 90, 255))
    # the grin: ear to ear, deep, rows of broken yellowed teeth, red gums, blood off every tooth
    mx0, mx1, my0, my1 = w * 0.08, w * 0.92, h * 0.58, h * 1.02
    d.ellipse([mx0, my0, mx1, my1], fill=(110, 10, 16, 255))
    d.ellipse([mx0 + 30, my0 + 26, mx1 - 30, my1 - 20], fill=(6, 0, 2, 255))
    for row, (yb, up) in enumerate(((my0 + 26, 1), (my1 - 26, -1))):
        n = 22
        for i in range(n):
            k = (i + 0.5) / n
            x = mx0 + 40 + k * (mx1 - mx0 - 80)
            edge = np.sqrt(max(0, 1 - ((x - (mx0 + mx1) / 2) / ((mx1 - mx0) / 2)) ** 2))
            yb2 = (my0 + my1) / 2 - up * (my1 - my0) / 2 * edge + up * 20
            tw, tl = RNG.uniform(20, 30), RNG.uniform(40, 85) * (0.55 if RNG.random() < 0.2 else 1) * (0.35 + 0.65 * edge)
            col = (int(RNG.uniform(200, 230)), int(RNG.uniform(180, 205)), int(RNG.uniform(130, 160)), 255)
            d.polygon([(x - tw, yb2), (x + tw, yb2), (x + RNG.uniform(-6, 6), yb2 + up * tl)], fill=col)
            d.line([(x - tw * 0.5, yb2 + up * 4), (x, yb2 + up * tl * 0.8)], fill=(120, 100, 70, 160), width=3)
            if RNG.random() < 0.55:
                l = RNG.uniform(20, 80)
                d.line([(x, yb2 + up * tl * 0.7), (x, yb2 + up * (tl + l))], fill=(170, 12, 20, 255), width=6)
    # stitches across one cheek
    sx0, sy0 = cx + w * 0.26, h * 0.42
    d.line([(sx0, sy0), (sx0 + 160, sy0 + 120)], fill=(80, 10, 14, 255), width=10)
    for k in range(7):
        px, py = sx0 + k * 23, sy0 + k * 17
        d.line([(px - 18, py + 14), (px + 18, py - 14)], fill=(20, 10, 10, 255), width=7)
    im = im.filter(ImageFilter.GaussianBlur(2))
    small = im.resize((320, 180), Image.LANCZOS)
    a = np.asarray(small).astype(float)
    # the bad tape: red/cyan split, scanlines, noise, a tracking tear, crushed to 16-bit colour
    out = a.copy()
    out[:, 2:, 0] = a[:, :-2, 0]
    out[:, :-2, 2] = a[:, 2:, 2]
    out[1::2] *= 0.82
    out += RNG.normal(0, 9, out.shape)
    for _ in range(3):
        y = int(RNG.integers(0, 176))
        out[y:y + 3] = np.roll(out[y:y + 3], int(RNG.integers(-12, 12)), axis=1) * 1.2
    out = (np.clip(out, 0, 255) // 8) * 8
    Image.fromarray(out.astype(np.uint8)).convert('P', palette=Image.ADAPTIVE, colors=200).save(SCARE_OUT, optimize=True)
    print('wrote', SCARE_OUT)


def main():
    frames = [poster(False), poster(True)]
    small = [f.resize((POSTER_W, POSTER_H), Image.LANCZOS) for f in frames]
    sheet = Image.new('RGBA', (POSTER_W * 2, POSTER_H), (0, 0, 0, 0))
    for i, f in enumerate(small):
        a = np.asarray(f.convert('RGBA')).copy()
        a[..., 3] = np.where(a[..., :3].sum(-1) < 8, 0, 255)               # the torn tabs: holes
        sheet.paste(Image.fromarray(a), (i * POSTER_W, 0))
    q = sheet.convert('RGBA').quantize(colors=255, method=Image.FASTOCTREE, dither=Image.NONE)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    q.save(OUT, optimize=True)
    print('wrote', OUT, sheet.size)
    scare()
    if '--preview' in sys.argv:
        p = sys.argv[sys.argv.index('--preview') + 1]
        sheet.resize((POSTER_W * 4, POSTER_H * 2), Image.NEAREST).save(p)


if __name__ == '__main__':
    main()

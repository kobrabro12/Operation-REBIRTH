"""THE DEVOTED's KNIFE TOSS: she dips, flicks the karambit straight up out of her hand, watches it spin end over end
above her head, then reaches up and snatches it out of the air by the ring and drops back into her guard.

Her own rig and moves frames (devoted_draw.py, 112x104, feet at 56,95). The knife leaves her fist, so the body is
animated twice - once with the karambit in her fist and once with it empty - and while it's in the air the frames
use the empty fist, with the karambit drawn on top, spinning along its arc (from where it left her hand to where
she catches it).

It is her TAUNT: the frames go into the `taunt` slot of every one of her moves sheets (FRAMES long, one frame a
tick - the slot dvMoves.js gives it), so nothing else in the sheets moves. devoted_draw.py calls patch_sheet() after
building each sheet; to redo just the taunt in the sheets that are already there:

  python3 tools/sprites/devoted_knife_toss.py --patch               (every costume and sludge stage but CARTRIDGE)
  python3 tools/sprites/devoted_knife_toss.py OUT_DIR [--set COSTUME] [--stage 0-3]
  -> OUT_DIR/knife_toss_sheet.png (a strip of 112x104 frames), knife_toss.gif (a looping preview, 3x)

CARTRIDGE is skipped: devoted_3d.py renders its sheets from her real 3D model, which a 2D toss would not match.
"""
import os, sys, math, re, types
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import devoted_draw as DV
import aero_draw as D

A = DV.A
P, k, mix = A.P, A.k, A.mix

# ---- timing (ticks; one frame every STEP ticks)
STEP = 2
RELEASE = 14        # the karambit leaves her hand (on the upswing, in front of her face)
CATCH = 54          # ...and lands back in it
TICKS = 76          # she's back in her guard
FRAMES = 90         # the taunt's slot in the moves sheet (dvMoves.js); she holds her guard after TICKS
SPINS = 3           # full turns it makes in the air
TOP = 12            # the height of the top of its arc in the 104 px frame (her head's top is at ~39)
AHEAD = 10          # how far out in front of her face the arc bulges (px), so it never crosses her head

# ---- poses
READY = P(torso=(1, 0, 0), head=(-3, 0, 0), fupper=(-14, 0, 0), ffore=(-38, 0, 0), ffist=(-30, 0, 0),
          bupper=(12, 0, 0), bfore=(-22, 0, 0), **A.legs(6, -3, -8, 6, 1, -3))
# the dip: knees give, the knife hand drops low and back, eyes on it
DIP = P(root=(0, 0, 2, 1.0, 1.0), torso=(10, 0, 1), head=(8, 0, 1), fupper=(24, 0, 0), ffore=(-20, 0, 0), ffist=(-50, 0, 0),
        bupper=(20, 0, 0), bfore=(-30, 0, 0), **A.legs(20, -24, -20, 26, 6, -6))
# the flick: she rises onto straight legs, arm snapping straight up, wrist flicked
FLICK = P(root=(0, 0, -1, 1.0, 1.0), torso=(-6, 0, -1), head=(-20, 0, 0), fupper=(-160, 0, -2), ffore=(-14, 0, 0), ffist=(-40, 0, 0),
          bupper=(-10, 0, 0), bfore=(-40, 0, 0), **A.legs(-2, 4, -4, 6, 0, -2))
# watching it spin: head tipped right back, the arm drifting down, the free hand loose
WATCH = P(torso=(-8, 0, -1), head=(-26, 0, 0), fupper=(-60, 0, 0), ffore=(-50, 0, 0), ffist=(0, 0, 0),
          bupper=(16, 0, 0), bfore=(-26, 0, 0), **A.legs(4, -2, -6, 6, 0, -2))
# reaching up for it, open hand high and out front
REACH = P(torso=(-6, 0, -1), head=(-24, 0, 0), fupper=(-140, 0, -2), ffore=(-20, 0, 0), ffist=(10, 0, 0),
          bupper=(10, 0, 0), bfore=(-30, 0, 0), **A.legs(2, 0, -4, 4, 0, -2))
# the snatch: the hand closes and pulls down a little as it takes the weight
SNATCH = mix(REACH, fupper=(-124, 0, -1), ffore=(-34, 0, 0), ffist=(-20, 0, 0), head=(-14, 0, 0), root=(0, 0, 1, 1.0, 1.0),
             **A.legs(10, -10, -10, 12, 2, -4))
# bringing it down beside her chin (the same CHIN beat as her idle), then back to the guard
CHIN = P(torso=(3, 0, 0), head=(6, 0, 1), fupper=(-80, 0, 0), ffore=(-100, 0, 0), ffist=(60, 0, 0),
         bupper=(6, 0, 0), bfore=(-30, 0, 0), **A.legs(6, -3, -8, 6, 1, -3))

KEYS = [k(0, READY), k(10, DIP, 'inout'), k(16, FLICK, 'snap'), k(24, mix(FLICK, fupper=(-130, 0, -1)), 'out'),
        k(36, WATCH, 'inout'), k(48, REACH, 'inout'), k(CATCH, SNATCH, 'snap'), k(64, CHIN, 'out'), k(TICKS, READY, 'inout'),
        k(FRAMES, READY, 'linear')]


def rigs(stage):
    """Two rigs of her: the karambit in her front fist, and the same fist empty (for while it's in the air)."""
    out = []
    for armed in (True, False):
        real = DV.knife
        if not armed: DV.knife = lambda a: a
        try: layers = DV.draw_parts(stage)
        finally: DV.knife = real
        look = types.SimpleNamespace(draw_parts=lambda L=layers: {n: a.copy() for n, a in L.items()},
                                     composite=DV.composite, ORDER=DV.ORDER, RIG=D.RIG)
        out.append(A.N.build_rig(look, DV.FOLLOW)[1])
    return out


def knife_sprite(stage):
    """The karambit on its own, cut out of her fist layer (what knife() adds), as an RGBA image, plus its centre."""
    real = DV.knife
    DV.knife = lambda a: a
    try: bare = DV.draw_parts(stage)['ffist']
    finally: DV.knife = real
    armed = DV.knife(bare)
    diff = np.any(armed != bare, axis=2) & (armed[..., 3] > 0)
    diff[:16] = False; diff[:, :40] = False                          # (only the blade, grip and ring)
    from scipy import ndimage
    lab, n = ndimage.label(diff, structure=np.ones((3, 3)))          # keep the one solid piece: the blade and its grip
    diff = lab == 1 + int(np.argmax(ndimage.sum(diff, lab, range(1, n + 1))))
    a = np.zeros_like(armed); a[diff] = armed[diff]
    ys, xs = np.nonzero(diff)
    im = Image.fromarray(a).crop((xs.min() - 1, ys.min() - 1, xs.max() + 2, ys.max() + 2))
    return im


def knife_at(armed, bare, t, life):
    """Where the karambit sits in the frame at tick t: the centre of the biggest patch of pixels where the armed render
    differs from the empty-handed one (works for any costume's blade colours, and over her face)."""
    from scipy import ndimage
    from puppet import pose_at
    pose = life(dict(pose_at(KEYS, t)), t)
    fa, fb = armed.render(pose, fi=t // 3), bare.render(pose, fi=t // 3)
    m = (fa[..., 3] > 0) & np.any(fa != fb, axis=2)
    lab, n = ndimage.label(m, structure=np.ones((3, 3)))
    ys, xs = np.nonzero(lab == 1 + int(np.argmax(ndimage.sum(m, lab, range(1, n + 1)))))
    return xs.mean(), ys.mean()


def build(stage=0, step=STEP):
    """Every frame of the toss (one per `step` ticks, FRAMES ticks in all) for one sludge stage, as RGBA arrays."""
    armed, bare = rigs(stage)
    life = DV.make_life(stage)
    with_k = A.N.animate(armed, KEYS, FRAMES, step=step, smear=('ffore', 'ffist'), smear_tint=A.N.GHOST, life=life)
    without = A.N.animate(bare, KEYS, FRAMES, step=step, smear=('ffore', 'ffist'), smear_tint=A.N.GHOST, life=life)
    p0 = knife_at(armed, bare, RELEASE - 2, life)
    p1 = knife_at(armed, bare, CATCH, life)
    blade = knife_sprite(stage)
    frames = []
    for i, t in enumerate(range(0, FRAMES, step)):
        if t < RELEASE or t >= CATCH:
            frames.append(with_k[i]); continue
        img = Image.fromarray(without[i])
        q = (t - RELEASE + 2) / (CATCH - RELEASE + 2)                  # 0 just after release -> 1 at the catch
        x = p0[0] + (p1[0] - p0[0]) * q + AHEAD * math.sin(math.pi * q)
        # up fast, hang at the top, down fast: a parabola through TOP
        y = (1 - q) * p0[1] + q * p1[1] - 4 * (min(p0[1], p1[1]) - TOP) * q * (1 - q)
        r = blade.rotate(-360 * SPINS * q, resample=Image.NEAREST, expand=True)
        img.alpha_composite(r, (int(round(x - r.width / 2)), int(round(y - r.height / 2))))
        frames.append(np.array(img))
    return frames


def taunt_slot():
    """[first frame, frame count] of the taunt in her moves sheets, read from src/fighters/dvMoves.js."""
    js = open(DV.JS).read()
    first, count, step = map(int, re.search(r'"taunt": \[(\d+), (\d+), (\d+)', js).groups())
    assert count == FRAMES and step == 1, 'dvMoves.js gives the taunt %d frames at %d ticks each - FRAMES is %d' % (count, step, FRAMES)
    return first, count


def patch_sheet(path, stage):
    """Draws the knife toss into the taunt slot of one moves sheet (the current costume - DV.apply_variant - at this
    sludge stage), leaving every other frame as it was."""
    first, count = taunt_slot()
    sheet = Image.open(path).convert('RGBA')
    cols = sheet.width // 112
    for i, f in enumerate(build(stage, step=1)):
        n = first + i; x, y = n % cols * 112, n // cols * 104
        sheet.paste((0, 0, 0, 0), (x, y, x + 112, y + 104))
        sheet.alpha_composite(Image.fromarray(f), (x, y))
    sheet.save(path)


if __name__ == '__main__':
    args = sys.argv[1:]
    if '--patch' in args:                                            # every costume, each in its own process (clean palettes)
        import subprocess
        for v in ['', 'murder'] + [n for n in DV.VARIANTS if n != 'cartridge']:
            subprocess.run([sys.executable, __file__, '--patch-one'] + ([v] if v else []), check=True)
        sys.exit()
    if '--patch-one' in args:
        v = args[args.index('--patch-one') + 1] if len(args) > args.index('--patch-one') + 1 else ''
        if v: DV.apply_variant(v)
        root = os.path.join(DV.OUT, v) if v else DV.OUT
        for st, name in enumerate(DV.STAGES):
            patch_sheet(os.path.join(root if st == 0 else os.path.join(root, name), 'moves_sheet.png'), st)
            print(v or 'default', name, 'patched')
        sys.exit()
    if '--set' in args:
        i = args.index('--set'); DV.apply_variant(args[i + 1]); del args[i:i + 2]
    stage = 0
    if '--stage' in args:
        i = args.index('--stage'); stage = int(args[i + 1]); del args[i:i + 2]
    out = args[0] if args else '.'
    os.makedirs(out, exist_ok=True)
    fr = build(stage)[:TICKS // STEP]
    sheet = Image.new('RGBA', (112 * len(fr), 104), (0, 0, 0, 0))
    for i, f in enumerate(fr): sheet.alpha_composite(Image.fromarray(f), (i * 112, 0))
    sheet.save(os.path.join(out, 'knife_toss_sheet.png'))
    gif = []
    for f in fr:
        bg = Image.new('RGBA', (112, 104), (120, 150, 190, 255)); bg.alpha_composite(Image.fromarray(f))
        gif.append(bg.convert('RGB').resize((336, 312), Image.NEAREST))
    gif[0].save(os.path.join(out, 'knife_toss.gif'), save_all=True, append_images=gif[1:], duration=1000 * STEP // 60, loop=0)
    print(len(fr), 'frames ->', out)

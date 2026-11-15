"""THE DEVOTED's KNIFE TOSS: she dips, flicks the karambit straight up out of her hand, watches it spin end over end
above her head, then reaches up and snatches it out of the air by the ring and drops back into her guard.

Her own rig and moves frames (devoted_draw.py, 112x104, feet at 56,95). The knife leaves her fist, so the body is
animated twice - once with the karambit in her fist and once with it empty - and while it's in the air the frames
use the empty fist, with the karambit drawn on top, spinning along its arc (from where it left her hand to where
she catches it).

  python3 tools/sprites/devoted_knife_toss.py OUT_DIR [--set COSTUME] [--stage 0-3]
  -> OUT_DIR/knife_toss_sheet.png (a strip of 112x104 frames), knife_toss.gif (a looping preview, 3x)
"""
import os, sys, math, types
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
TICKS = 76
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
        k(36, WATCH, 'inout'), k(48, REACH, 'inout'), k(CATCH, SNATCH, 'snap'), k(64, CHIN, 'out'), k(TICKS, READY, 'inout')]


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


# the karambit's own colours (knife() in devoted_draw.py): black blade, its sheen, the silver edge, the point, the ring
KNIFE_RGB = np.array([[0x16, 0x16, 0x1c], [0x3a, 0x3a, 0x46], [0xd8, 0xdc, 0xe4], [0xf4, 0xf6, 0xfa], [0x4a, 0x4a, 0x56]])

def centre_of_knife(fa, fb):
    """Where the karambit sits in a frame: the centre of its own-coloured pixels that the bare (knifeless) render lacks."""
    m = (fa[..., 3] > 0) & np.any(fa != fb, axis=2) & np.any(np.all(fa[..., None, :3] == KNIFE_RGB, axis=3), axis=2)
    ys, xs = np.nonzero(m)
    return (xs.mean(), ys.mean())


def build(stage=0):
    armed, bare = rigs(stage)
    life = DV.make_life(stage)
    with_k = A.N.animate(armed, KEYS, TICKS, step=STEP, smear=('ffore', 'ffist'), smear_tint=A.N.GHOST, life=life)
    without = A.N.animate(bare, KEYS, TICKS, step=STEP, smear=('ffore', 'ffist'), smear_tint=A.N.GHOST, life=life)
    ts = list(range(0, TICKS, STEP))
    i0, i1 = ts.index(RELEASE) - 1, ts.index(CATCH)
    p0 = centre_of_knife(with_k[i0], without[i0])
    p1 = centre_of_knife(with_k[i1], without[i1])
    blade = knife_sprite(stage)
    frames = []
    for i, t in enumerate(ts):
        if t < RELEASE or t >= CATCH:
            frames.append(with_k[i]); continue
        img = Image.fromarray(without[i])
        q = (t - RELEASE + STEP) / (CATCH - RELEASE + STEP)            # 0 just after release -> 1 at the catch
        x = p0[0] + (p1[0] - p0[0]) * q + AHEAD * math.sin(math.pi * q)
        # up fast, hang at the top, down fast: a parabola through TOP
        y = (1 - q) * p0[1] + q * p1[1] - 4 * (min(p0[1], p1[1]) - TOP) * q * (1 - q)
        r = blade.rotate(-360 * SPINS * q, resample=Image.NEAREST, expand=True)
        img.alpha_composite(r, (int(round(x - r.width / 2)), int(round(y - r.height / 2))))
        frames.append(np.array(img))
    return frames


if __name__ == '__main__':
    args = sys.argv[1:]
    if '--set' in args:
        i = args.index('--set'); DV.apply_variant(args[i + 1]); del args[i:i + 2]
    stage = 0
    if '--stage' in args:
        i = args.index('--stage'); stage = int(args[i + 1]); del args[i:i + 2]
    out = args[0] if args else '.'
    os.makedirs(out, exist_ok=True)
    fr = build(stage)
    sheet = Image.new('RGBA', (112 * len(fr), 104), (0, 0, 0, 0))
    for i, f in enumerate(fr): sheet.alpha_composite(Image.fromarray(f), (i * 112, 0))
    sheet.save(os.path.join(out, 'knife_toss_sheet.png'))
    gif = []
    for f in fr:
        bg = Image.new('RGBA', (112, 104), (120, 150, 190, 255)); bg.alpha_composite(Image.fromarray(f))
        gif.append(bg.convert('RGB').resize((336, 312), Image.NEAREST))
    gif[0].save(os.path.join(out, 'knife_toss.gif'), save_all=True, append_images=gif[1:], duration=1000 * STEP // 60, loop=0)
    print(len(fr), 'frames ->', out)

"""Dedicated Soul Summoner costume taunts: 80 ticks, 40 cels, native rig parts.

python3 tools/sprites/costume_taunts.py [--preview /tmp/costume-taunts.png]

Only eight taunt_sheet.png atlases are written. Each uses a 112x104 cel and the
same (56,94) foot point as the move rig. Twenty columns keep phone textures
below 4096 pixels. Costumes retain their own headwear, mask, cape and shoes.
"""
import argparse
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

import shop_costumes as S
import ss_rig
import soul_summoner_moves as M
from puppet import animate, save_atlas

ROOT = Path(__file__).resolve().parents[2]
FOLDER = ROOT / 'public/assets/fighters/soul-summoner'
NAMES = ['eclipse', 'aurora', 'celestial', 'olive', 'tricolore', 'orrery', 'judgment', 'ermac']


def source_prefix(name, end):
    """Read reusable rig definitions without running their atlas exporters."""
    path = ROOT / 'tools/sprites' / name
    source = path.read_text()
    scope = {'__file__': str(path), '__name__': '_costume_taunt_source'}
    exec(compile(source[:source.index(end)], str(path), 'exec'), scope)
    return scope


def costume_rig(name):
    """Assemble the exact costume parts and their attached accessories."""
    if name == 'judgment':
        data = source_prefix('judgment_costume.py', '# Bones, crown, eye and slippers')
        layers, flames, extras, color = data['N'], data['NF'], [], (164, 239, 255)
    else:
        if name == 'orrery': source_prefix('orrery_costume.py', "S.build_ss('orrery')")
        if name == 'ermac':
            from kombat_costumes import ermac
            S.SS_LOOKS[name] = (ermac, {'armor': {'sat': .2, 'val': .58}, 'cape': {'to': 354, 'sat': 1.3, 'val': 1.3}, 'gold': {'to': 355, 'sat': 1.2, 'val': .8}, 'flame': {'to': 112, 'sat': 1.2, 'val': 1.25}, 'eyes': {'to': 110, 'val': 1.3}}, (143, 255, 143))
        edit, rules, color = S.SS_LOOKS[name]
        sheet = np.array(Image.open(FOLDER / 'idle_sheet.png').convert('RGBA'))
        _, original, original_flames = ss_rig.layers_from(sheet)
        fn = S.K.color_fn(S.SSG, rules)
        layers = {n: S.K.recolor(a, S.SSG, rules, fn) for n, a in original.items()}
        flames = [S.K.recolor(a, S.SSG, rules, fn) for a in original_flames]
        extras, _, _ = edit(layers, original)
    _, big = S.K.rig_from(layers, ss_rig.ORDER, ss_rig.PARENT, ss_rig.FEET,
                          (112, 104), (24, 36), follow=M.FOLLOW,
                          variants={'flame': flames}, upright={'flame': .75, 'cape': .55}, extras=extras)
    return big, color


def keys():
    """Throw, catch and trade souls with both hands, then settle into idle."""
    b, k = M.B, M.k
    return [k(0, M.REST),
            k(10, b(lean=-3, head=-5, fa=-15, ff=-45, ba=110, bf=75, cape=-4), 'out'),
            k(20, b(lean=-2, head=-8, fa=-35, ff=-70, ba=90, bf=-20, cape=-6)),
            k(30, b(lean=3, head=-5, fa=25, ff=-10, ba=160, bf=-65, cape=6)),
            k(40, b(lean=1, head=-6, fa=5, ff=-35, ba=125, bf=-25, cape=3)),
            k(50, b(lean=-3, head=-8, fa=-25, ff=-65, ba=100, bf=65, cape=-5)),
            k(60, b(lean=3, head=-3, fa=25, ff=-5, ba=155, bf=-60, cape=5)),
            k(70, b(lean=1, head=0, fa=40, ff=0, ba=110, bf=75, cape=2)),
            k(80, M.REST)]


def life(pose, tick):
    """Return breathing and cloth movement smoothly to the starting pose."""
    return M.life(pose, (1 - math.cos(tick * math.pi * 2 / 80)) * 14)


def soul_effect(rig, color):
    """Launch crisp pixel souls between the animated hand joints."""
    def draw(array, tick, pose):
        image = Image.fromarray(array)
        brush = ImageDraw.Draw(image)
        front = rig.matrix('ffist', pose) @ np.array([48, 26, 1.0])
        back = rig.matrix('bfore', pose) @ np.array([24, 36, 1.0])
        fade = max(0, min(1, (tick - 4) / 10, (76 - tick) / 10))
        if fade <= 0: return
        col = (*color, round(255 * fade))
        bright = tuple(min(255, int(c + (255-c)*.7)) for c in color) + (round(255*fade),)
        for i in range(3):
            phase = ((tick - 8 + i * 8) % 24) / 24
            x = round(front[0] + (back[0] - front[0]) * phase)
            y = round(front[1] + (back[1] - front[1]) * phase - math.sin(phase * math.pi) * 35)
            brush.rectangle((x-2, y-3, x+2, y+1), fill=col)
            brush.rectangle((x-1, y-4, x+1, y-3), fill=bright)
            brush.line([(x-1, y+2), (x, y+3), (x-1, y+4)], fill=col)
            brush.point((x-1, y-1), fill=(20, 35, 40, col[3]))
            brush.point((x+1, y-1), fill=(20, 35, 40, col[3]))
        array[:] = np.array(image)
    return draw


def main():
    """Export only dedicated taunts and an optional visual contact sheet."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--preview')
    args = parser.parse_args()
    preview = Image.new('RGB', (8 * 224, len(NAMES) * 225), '#252536') if args.preview else None
    for row, name in enumerate(NAMES):
        rig, color = costume_rig(name)
        frames = animate(rig, keys(), 80, step=2, life=life, extra=soul_effect(rig, color), holes=6)
        assert len(frames) == 40 and len({f.tobytes() for f in frames}) > 30
        for frame in frames:
            solid = frame[..., 3] > 0
            assert not solid[0].any() and not solid[-1].any() and not solid[:,0].any() and not solid[:,-1].any(), name + ' clipped'
        path = FOLDER / name / 'taunt_sheet.png'
        save_atlas({'taunt': frames}, str(path), cols=20)
        assert Image.open(path).size == (2240, 208)
        print(name, '40 cels; 112x104; no border clipping', flush=True)
        if preview:
            brush = ImageDraw.Draw(preview); brush.text((4, row * 225 + 3), name.upper(), fill='white')
            for i, frame in enumerate(frames[::5]):
                image = Image.fromarray(frame).resize((224,208),Image.Resampling.NEAREST)
                preview.paste(image, (i * 224, row * 225 + 17), image)
    if preview: preview.save(args.preview)


if __name__ == '__main__':
    main()

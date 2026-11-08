"""Rebuild native puppet runs as continuous 24-cel pixel-art loops.

python3 tools/sprites/smooth_run_cycles.py [--preview /tmp/run-contact.png]

Only run_sheet.png strips and smoothRunHeads.js are written. Combat move atlases
and indexes remain intact. Runtime uses SMOOTH_RUN_FRAMES to preserve the old
cycle duration and bypass stale packed eight-cel atlases. WHAT ONCE WAS retains
headless bodies with an exact matching TV anchor for every new run cel.
"""
import argparse
import importlib
import json
import math
from pathlib import Path
from types import SimpleNamespace

import numpy as np
from PIL import Image, ImageDraw

import costume_kit as C
import nu_moves as N
import aero_moves as A
import shop_costumes as S
from puppet import fill_holes

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'public/assets/fighters'
PERIOD = 48
CELS = 24


def periodic_life(life, pose, tick):
    """Blend the secondary motion's cycle boundary with matching derivatives."""
    tick %= PERIOD
    u = tick / PERIOD
    weight = u * u * (3 - 2 * u)
    first, previous = life(dict(pose), tick), life(dict(pose), tick - PERIOD)
    out = dict(first)
    for key, value in first.items():
        other = previous.get(key)
        if isinstance(value, (list, tuple)) and isinstance(other, (list, tuple)) and len(value) == len(other):
            if all(isinstance(v, (int, float, np.number)) for v in [*value, *other]):
                out[key] = tuple(a * (1 - weight) + b * weight for a, b in zip(value, other))
    return out


def smooth_pose(keys, tick):
    """Join the authored contacts with cyclic cubic tangents instead of snaps."""
    tick %= PERIOD
    controls = keys[:-1]
    index = max(i for i, (at, _, _) in enumerate(controls) if at <= tick)
    left, right = controls[index], controls[(index + 1) % len(controls)]
    before, after = controls[(index - 1) % len(controls)], controls[(index + 2) % len(controls)]
    t0, t1 = left[0], right[0] + (PERIOD if index == len(controls) - 1 else 0)
    tb = before[0] - (PERIOD if index == 0 else 0)
    ta = after[0]
    while ta <= t1: ta += PERIOD
    span = t1 - t0; u = (tick - t0) / span
    a, b, c, d = 2*u**3-3*u**2+1, u**3-2*u**2+u, -2*u**3+3*u**2, u**3-u**2
    out = dict(left[1])
    for name in set().union(*(key[1] for key in controls)):
        values = [key[1].get(name, ()) for key in (before, left, right, after)]
        if name.startswith('_') or not all(isinstance(v, (list, tuple)) and all(isinstance(n, (int,float,np.number)) for n in v) for v in values):
            continue
        prev, start, end, following = map(lambda v: np.array(N.full(v)), values)
        tangent0, tangent1 = (end-prev)/(t1-tb), (following-start)/(ta-t0)
        out[name] = tuple(a*start + b*span*tangent0 + c*end + d*span*tangent1)
    return out


def cyclic_pose(keys, life, tick):
    """Resolve a real previous pose from the end of the loop at its first cel."""
    tick %= PERIOD
    pose = periodic_life(life, smooth_pose(keys, tick), tick)
    previous = (tick - 3) % PERIOD
    pose['_prev'] = periodic_life(life, smooth_pose(keys, previous), previous)
    return pose


def render_run(rig, keys, life):
    """Render hard pixels without interpolating or ghosting finished rasters."""
    frames = []
    for tick in range(0, PERIOD, PERIOD // CELS):
        frame = rig.render(cyclic_pose(keys, life, tick), fi=tick // 3)
        fill_holes(frame, 6)
        frames.append(frame)
    assert len({frame.tobytes() for frame in frames}) >= 20, 'run lacks distinct poses'
    # Exact endpoint equality verifies both secondary motion and joint lag wrap.
    start = rig.render(cyclic_pose(keys, life, 0), fi=0)
    end = rig.render(cyclic_pose(keys, life, PERIOD), fi=0)
    assert np.array_equal(start, end), 'loop endpoint differs'
    return frames


def look_from_layers(drawing, layers):
    """Keep the source drawing's joints and layer order with costume pixels."""
    return SimpleNamespace(draw_parts=lambda: {n: a.copy() for n, a in layers.items()},
                           composite=drawing.composite, ORDER=drawing.ORDER, RIG=drawing.RIG)


def shop_look(name):
    """Reuse the existing costume's palette and hand-drawn part edits."""
    fighter, module, groups, rules, edit, _ = S.PART_LOOKS[name]
    drawing = importlib.import_module(module)
    fn = C.color_fn(groups, rules)
    layers = {n: C.recolor(a, groups, rules, fn) for n, a in drawing.draw_parts().items()}
    edit(layers)
    return fighter, look_from_layers(drawing, layers)


def kombat_look(name):
    """Use the same masks, armor and weapons as the Mortal Kombat generator."""
    import kombat_costumes as K
    if name == 'scorpion':
        drawing = importlib.import_module('nu_draw')
        groups, rules = S.NUG, {'acid': {'to': 39, 'sat': 1.1}, 'hair': {'sat': .1, 'val': .3}, 'cloth': {'to': 30, 'sat': .5, 'val': .55}}
        edit = K.scorpion
    elif name == 'subzero':
        drawing = importlib.import_module('aero_draw')
        groups, rules = S.AEG, {'aqua': {'to': 213, 'sat': 1.2, 'val': .8}, 'lime': {'to': 205, 'sat': .4, 'val': 1.2}, 'fish': {'to': 195, 'sat': .5, 'val': 1.2}}
        edit = K.subzero
    else:
        drawing = importlib.import_module('aero_king_draw')
        groups, rules = {'ice': {'s': (.18, 1), 'center': 195}}, {'ice': {'to': 205, 'sat': .65, 'val': 1.12}}
        edit = K.subzero
    layers = {n: C.recolor(a, groups, rules) for n, a in drawing.draw_parts().items()}
    edit(layers)
    return look_from_layers(drawing, layers)


def wow_life(pose, tick):
    """Preserve the shamble and swinging cord while easing out random ticks."""
    p = N.life(pose, tick)
    head = N.full(p.get('head')); head[0] += 2 * math.sin(tick * .37); p['head'] = tuple(head)
    cord = N.full(p.get('cord')); cord[0] += 6 * math.sin(tick * .13); p['cord'] = tuple(cord)
    arm = N.full(p.get('ffore')); arm[0] += 3 * math.sin(tick * .11 + 1); p['ffore'] = tuple(arm)
    return p


def head_track(rig, keys, life):
    """Store the same screen transform format as wowScreens.js for each cel."""
    import what_once_was_draw as D
    tracks = []
    for tick in range(0, PERIOD, PERIOD // CELS):
        pose = cyclic_pose(keys, life, tick)
        matrix = rig.matrix('scr_static', pose)
        center = matrix @ np.array([36.5, 12.5, 1.0])
        ux, uy = matrix @ np.array([1.0, 0, 0]), matrix @ np.array([0, 1.0, 0])
        shown = [i for i, name in enumerate(D.SCREENS) if name not in pose.get('_hide', ())]
        tracks.append([round(center[0] * 10), round(center[1] * 10), round(math.degrees(math.atan2(ux[1], ux[0]))),
                       round(math.hypot(ux[0], ux[1]) * 100), round(math.hypot(uy[0], uy[1]) * 100), shown[0] if shown else 0])
    return tracks


def main():
    """Build all source-supported runs, keeping every existing costume identity."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--preview')
    args = parser.parse_args()
    results, heads, counts, previews = [], {}, {}, []

    def save(folder, key, rig, keys, life, extra_head=None):
        """Save one strip and record its cyclic silhouette continuity for QA."""
        frames = render_run(rig, keys, life)
        path = folder / 'run_sheet.png'; path.parent.mkdir(parents=True, exist_ok=True)
        C.save_strip(frames, str(path), 64, 64)
        alpha = [frame[..., 3] > 0 for frame in frames]
        changes = [int(np.count_nonzero(alpha[i] != alpha[(i + 1) % CELS])) for i in range(CELS)]
        report = {'path': str(path.relative_to(ROOT)), 'key': key, 'cels': CELS,
                  'seam': changes[-1], 'median': float(np.median(changes)), 'ratio': round(changes[-1] / max(1, float(np.median(changes))), 2)}
        results.append(report); counts[key] = CELS; previews.append((key, frames))
        if extra_head is not None: heads[key] = extra_head
        print(json.dumps(report), flush=True)

    import nu_draw
    save(ASSETS / 'nu', 'nu_run', N.build_rig(nu_draw, N.FOLLOW)[0], N.run_keys(), N.life)
    import nu_costume_moves as NC
    for name, (module, _) in NC.COSTUMES.items():
        save(ASSETS / 'nu' / name, 'nu_' + name + '_run', NC.build_rig(importlib.import_module(module))[0], N.run_keys(), N.life)
    for name in ['vapor', 'glam', 'luckyred', 'sunset', 'midnight', 'amber']:
        fighter, look = shop_look(name)
        is_aero = fighter == 'aero'
        save(ASSETS / fighter / name, ('aero_' if is_aero else 'nu_') + name + '_run', N.build_rig(look, A.FOLLOW if is_aero else N.FOLLOW)[0], N.run_keys(), A.life if is_aero else N.life)
    import aero_draw
    save(ASSETS / 'aero', 'aero_run', N.build_rig(aero_draw, A.FOLLOW)[0], N.run_keys(), A.life)
    save(ASSETS / 'nu/scorpion', 'nu_scorpion_run', N.build_rig(kombat_look('scorpion'), N.FOLLOW)[0], N.run_keys(), N.life)
    save(ASSETS / 'aero/subzero', 'aero_subzero_run', N.build_rig(kombat_look('subzero'), A.FOLLOW)[0], N.run_keys(), A.life)
    save(ASSETS / 'aero/subzero/king', 'aero_subzero_king_run', N.build_rig(kombat_look('subzero-king'), A.KFOLLOW)[0], N.run_keys(), A.king_life)
    import aero_king_mason
    for art, folder, key in [('full_aero.png', 'aero/king', 'aero_king_run'), ('full_aero_infected.png', 'aero/king/infected', 'aero_king_inf_run')]:
        save(ASSETS / folder, key, N.build_rig(aero_king_mason.source(art), A.KFOLLOW)[0], N.run_keys(), A.king_life)

    # This upstream-only costume uses an inlined small strip, rather than public assets.
    if (Path(__file__).parent / 'aero_scorched.py').exists():
        import aero_scorched as SC
        save(ROOT / 'src/fighters/aero_scorched', 'aero_scorched_run', N.build_rig(SC, SC.FOLLOW)[0], N.run_keys(), SC.life)

    import what_once_was_draw as WD
    import what_once_was_moves as W
    for style, folder in W.STYLE_DIRS.items():
        WD.set_style(style)
        rig = N.build_rig(WD, W.FOLLOW)[0]
        track = head_track(rig, W.run_keys(), wow_life)
        hidden = W.HEAD_PARTS + (('cord',) if style in WD.HUMAN else ())
        W.without(rig, hidden)
        key = 'wow_' + (style + '_' if style != 'default' else '') + 'run'
        save(ASSETS / 'what-once-was' / folder, key, rig, W.run_keys(), wow_life, track)
    WD.set_style('default')
    module = '// Generated by tools/sprites/smooth_run_cycles.py - do not edit by hand.\n'
    module += '// Run cel counts preserve nominal gait timing; TV anchors use wowScreens.js units.\n'
    module += 'export const SMOOTH_RUN_FRAMES = ' + json.dumps(counts, separators=(',', ':')) + ';\n'
    module += 'export const RUN_HEAD_TRACKS = ' + json.dumps(heads, separators=(',', ':')) + ';\n'
    (ROOT / 'src/fighters/smoothRunHeads.js').write_text(module)
    if args.preview:
        sheet = Image.new('RGB', (CELS * 64, len(previews) * 88), '#252536')
        draw = ImageDraw.Draw(sheet)
        for row, (name, frames) in enumerate(previews):
            draw.text((4, row * 88 + 2), name, fill='white')
            for i, frame in enumerate(frames):
                im = Image.fromarray(frame); sheet.paste(im, (i * 64, row * 88 + 20), im)
        sheet.save(args.preview)
    print('Generated', len(results), '24-cel runs and', len(heads), 'matching TV head tracks.', flush=True)


if __name__ == '__main__':
    main()

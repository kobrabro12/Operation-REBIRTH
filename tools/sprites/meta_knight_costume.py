"""Lacy's Meta Knight costume, drawn into every native cel before move assembly.

python3 tools/sprites/meta_knight_costume.py [--preview /tmp/meta-knight.png]

Silver mask and yellow eyes follow the source helmet, while the purple mantle
follows the neck-to-torso axis and opens into bat wings on airborne strips.
All base strips retain their original canvas and foot pivot. Existing authored
attacks/taunts are rebuilt into the same 180x140 move atlas without changing JS.
"""
import argparse
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

import costume_kit as C
import shop_costumes as S
import hero_knight_moves as M

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'public/assets/fighters/hero-knight'
OUT = SOURCE / 'metaknight'
NAVY = [(10, 16, 35), (20, 30, 62), (37, 51, 91), (67, 83, 131), (105, 125, 172)]
SILVER = [(30, 42, 64), (66, 85, 113), (119, 146, 179), (178, 201, 225), (231, 241, 251)]
PURPLE = [(24, 15, 49), (49, 27, 83), (88, 47, 126), (139, 83, 174), (190, 137, 214)]
GOLD = [(94, 56, 14), (153, 103, 28), (212, 158, 46), (255, 213, 94), (255, 246, 177)]
LOOK = dict(plate=lambda x, y, v, inside: C.ramp_pick(NAVY, v, .2, .76),
            cloth=[NAVY[0], NAVY[1]], scarf=PURPLE, helm=SILVER,
            glove=SILVER[1:], blade=lambda point, v: C.ramp_pick(GOLD, v, .4, .83),
            swipe=(255, 221, 111), hair=lambda v: C.ramp_pick(NAVY, v, .25, 1),
            glow=(255, 207, 74, 65))


def fit_points(points, anchor):
    """Keep decorative fabric inside the original 150x90 source canvas."""
    ax, ay = anchor
    scale = 1.0
    for x, y in points:
        dx, dy = x - ax, y - ay
        if dx < 0: scale = min(scale, (ax - 2) / -dx)
        if dx > 0: scale = min(scale, (147 - ax) / dx)
        if dy < 0: scale = min(scale, (ay - 2) / -dy)
        if dy > 0: scale = min(scale, (87 - ay) / dy)
    return [(round(ax + (x - ax) * scale), round(ay + (y - ay) * scale)) for x, y in points]


def body_axis(frame, helpers, anchor):
    """Follow bent and fallen bodies instead of pinning a cape upright."""
    a = np.array(frame)
    points = [(x, y) for y in range(90) for x in range(150) if helpers['is_plate'](tuple(a[y,x]))]
    if not points: return np.array([0.0, 1.0])
    center = np.mean(points, axis=0)
    axis = center - np.array(anchor)
    if np.linalg.norm(axis) < 3: return np.array([0.0, 1.0])
    return axis / np.linalg.norm(axis)


def cape(frame, helpers, anchor, strip, index, count):
    """Draw a folded purple mantle or articulated airborne bat wings behind Lacy."""
    layer = Image.new('RGBA', frame.size)
    draw = ImageDraw.Draw(layer)
    axis = body_axis(frame, helpers, anchor)
    side = np.array([-axis[1], axis[0]])
    def point(u, v):
        a = np.array(anchor) + side * u + axis * v
        return float(a[0]), float(a[1])
    airborne = strip in ['jump', 'fall', 'jump_u', 'fall_u']
    phase = index / max(1, count)
    flutter = math.sin(phase * math.pi * 2) * (2 if strip.startswith('run') else 1)
    if airborne:
        lift = 4 * math.sin(index / max(1, count-1) * math.pi)
        for sign in [-1, 1]:
            local = [(sign*2,2),(sign*11,-3-lift),(sign*30,-11-lift),
                     (sign*27,0),(sign*25,10),(sign*19,6),(sign*15,18),
                     (sign*11,12),(sign*5,19),(sign*2,9)]
            pts = fit_points([point(u,v) for u,v in local], anchor)
            draw.polygon(pts, fill=(*PURPLE[1],255), outline=(*NAVY[0],255))
            for j in [2,4,6,8]: draw.line([pts[0],pts[j]],fill=(*PURPLE[3],255),width=1)
            draw.line(pts[:3],fill=(*PURPLE[4],255),width=1)
    else:
        pts = fit_points([point(u,v) for u,v in [(1,0),(7,2),(15,8),(18+flutter,28),(12,23),(8,29),(2,22),(-1,9)]],anchor)
        draw.polygon(pts,fill=(*PURPLE[1],255),outline=(*NAVY[0],255))
        draw.line([pts[1],pts[3]],fill=(*PURPLE[3],255),width=1)
        draw.line([pts[0],pts[5]],fill=(*PURPLE[2],255),width=1)
        draw.line([pts[2],pts[4]],fill=(*PURPLE[0],255),width=1)
    return layer


def mask(out, original, helpers, anchor):
    """Replace the source helmet with a silver full-face mask and yellow slits."""
    ax, ay = anchor
    raw = original.load()
    points = [(x,y) for y in range(max(0,round(ay)-12),min(90,round(ay)+1))
              for x in range(max(0,round(ax)-7),min(150,round(ax)+11))
              if helpers['is_grey'](raw[x,y]) and .15 < max(raw[x,y][:3])/255 < .75 and raw[x,y][:3] not in helpers['BLADE']]
    if points:
        xs, ys = zip(*points)
        cx, cy = (min(xs)+max(xs))/2, (min(ys)+max(ys))/2
    else: cx, cy = ax+1, ay-6
    axis = body_axis(original,helpers,anchor)
    angle = math.atan2(axis[1],axis[0])-math.pi/2
    cosine, sine = math.cos(angle), math.sin(angle)
    def point(x,y): return round(cx+x*cosine-y*sine),round(cy+x*sine+y*cosine)
    draw = ImageDraw.Draw(out)
    poly = [(-3,-6),(3,-6),(6,-3),(6,2),(3,5),(0,6),(-4,4),(-6,0),(-5,-4)]
    draw.polygon([point(x,y) for x,y in poly],fill=(*SILVER[2],255),outline=(*NAVY[0],255))
    draw.line([point(-3,-5),point(2,-5),point(5,-3)],fill=(*SILVER[4],255),width=1)
    draw.polygon([point(x,y) for x,y in [(-5,-1),(-1,-2),(0,-1),(1,-2),(5,-1),(3,1),(0,2),(-3,1)]],fill=(*NAVY[0],255))
    draw.line([point(-4,-1),point(-2,-1)],fill=(255,227,80,255),width=1)
    draw.line([point(2,-1),point(4,-1)],fill=(255,227,80,255),width=1)
    draw.line([point(0,0),point(0,4)],fill=(*SILVER[4],255),width=1)
    draw.line([point(-3,3),point(-1,4)],fill=(*SILVER[1],255),width=1)
    draw.line([point(2,3),point(4,2)],fill=(*SILVER[1],255),width=1)


def galaxia(out, original, helpers, anchor):
    """Add a golden crossguard and small blade barbs along the existing sword."""
    blade = helpers['blade_pixels'](original.load())
    if len(blade) < 8: return
    a = np.array(blade,dtype=float)
    _, vectors = np.linalg.eigh(np.cov(a.T))
    along = vectors[:,-1]
    projection = a @ along
    ends = [a[np.argmin(projection)],a[np.argmax(projection)]]
    hilt, tip = sorted(ends,key=lambda p:np.linalg.norm(p-np.array(anchor)))
    direction = tip-hilt; length=np.linalg.norm(direction)
    if length < 8: return
    direction/=length;side=np.array([-direction[1],direction[0]])
    draw=ImageDraw.Draw(out)
    def pt(a):return tuple(int(round(n)) for n in a)
    draw.line([pt(hilt-side*4),pt(hilt+side*4)],fill=(*GOLD[2],255),width=2)
    draw.point(pt(hilt),fill=(164,97,244,255))
    for progress in [.35,.58]:
        base=hilt+direction*length*progress
        for sign in [-1,1]:
            draw.polygon([pt(base-direction),pt(base+side*sign*3-direction*2),pt(base+direction*2)],fill=(*GOLD[3],255))


def paint(frame, helpers, strip, index, count, fallback=None):
    """Repaint one original cel while preserving its limbs and source alignment."""
    anchor=helpers['anchor'](frame) or fallback
    if strip.startswith('shrine_hands') or strip=='shrine_weapon':
        out=frame.copy();pixels=out.load()
        for y in range(90):
            for x in range(150):
                p=pixels[x,y]
                if not p[3]:continue
                v=max(p[:3])/255
                pixels[x,y]=(*C.ramp_pick(GOLD if strip=='shrine_weapon' else SILVER,v),p[3])
        return out
    if not anchor: return frame.copy()
    out=S.hk_look(frame,helpers,LOOK,anchor)
    source=np.array(frame);pixels=out.load()
    # The old white helmet plume is replaced by the round mask and mantle,
    # rather than leaving an idle-only hair shape behind the new helmet.
    ax,ay=anchor
    for y in range(max(0,round(ay)-28),min(90,round(ay)+5)):
        for x in range(max(0,round(ax)-28),min(150,round(ax)+23)):
            p=tuple(source[y,x])
            if helpers['is_grey'](p) and max(p[:3])>=180 and p[:3] not in helpers['BLADE']:
                pixels[x,y]=(0,0,0,0)
    plates=[(x,y) for y in range(90) for x in range(150) if helpers['is_plate'](tuple(source[y,x]))]
    bottom=max((y for x,y in plates),default=86)
    for x,y in plates:
        if y>=bottom-7:pixels[x,y]=(*C.ramp_pick(SILVER,max(source[y,x,:3])/255,.10,.55),255)
    backing=cape(frame,helpers,anchor,strip,index,count)
    backing.alpha_composite(out);out=backing
    mask(out,frame,helpers,anchor)
    if not strip.endswith('_u'):galaxia(out,frame,helpers,anchor)
    return out


def main():
    """Write every source strip, then build the complete authored move library."""
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--preview');args=parser.parse_args()
    OUT.mkdir(parents=True,exist_ok=True)
    helpers=S.hk_helpers();previews=[];written=[]
    for path in sorted(SOURCE.glob('*_sheet.png')):
        sheet=Image.open(path).convert('RGBA')
        if sheet.height!=90 or sheet.width%150:continue
        strip=path.stem.removesuffix('_sheet');count=sheet.width//150
        result=Image.new('RGBA',sheet.size);previous=None;last_anchor=None
        for index in range(count):
            frame=sheet.crop((index*150,0,(index+1)*150,90))
            anchor=helpers['anchor'](frame) or helpers['ANCHOR_FALLBACK'].get((strip,index)) or last_anchor
            # The old full-white hurt flash hid every armor detail. Hold the
            # preceding fully clothed pose for that single source cel instead.
            if strip in ['hit','hit_u'] and index==1 and previous is not None:out=previous.copy()
            else:out=paint(frame,helpers,strip,index,count,anchor)
            if anchor:last_anchor=anchor
            result.alpha_composite(out,(index*150,0));previous=out
        result.save(OUT/path.name);written.append(path.name)
        if strip in ['idle','run','attack1','attack2','counter','jump','fall','death']:previews.append((strip,result))
    costume=M.Costume('metaknight')
    frames={name:M.render_move(costume,name) for name in M.MOVES}
    M.save_atlas(frames,str(OUT/'moves_sheet.png'))
    taunt=frames['taunt'];columns=max(n for n in range(1,21) if len(taunt)%n==0)
    M.save_atlas({'taunt':taunt},str(OUT/'taunt_sheet.png'),cols=columns)
    print('Meta Knight:',len(written),'native strips + moves and taunt; move indexes unchanged.',flush=True)
    if args.preview:
        sheet=Image.new('RGB',(1500,len(previews)*205),'#252536');draw=ImageDraw.Draw(sheet)
        for row,(name,source) in enumerate(previews):
            draw.text((4,row*205+2),name.upper(),fill='white')
            for i in range(min(5,source.width//150)):
                cel=source.crop((i*150,0,(i+1)*150,90)).resize((300,180),Image.Resampling.NEAREST)
                sheet.paste(cel,(i*300,row*205+18),cel)
        sheet.save(args.preview)


if __name__=='__main__':
    main()

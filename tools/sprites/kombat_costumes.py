"""Five Mortal Kombat shop homages, drawn into every rig layer and animation.

Run python3 tools/sprites/kombat_costumes.py. Existing move indexes are reused;
hoods, masks, hats and fans are attached to their animated source parts.
"""
import os
import math
import sys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(__file__))
import shop_costumes as S
import costume_kit as K


def put(layer, x, y, color):
    """Write an opaque pixel from a CSS hex color."""
    K.put(layer, x, y, int(color.lstrip('#'), 16))


def polygon(layer, points, color):
    """Paint an outlined, hard edged pixel polygon into a rig part."""
    im = Image.fromarray(layer)
    ImageDraw.Draw(im).polygon(points, fill=color, outline='#111320')
    layer[:] = np.array(im)


def stripe(layer, points, color, width=1):
    """Paint a seam or highlight without filtering the source pixels."""
    im = Image.fromarray(layer)
    ImageDraw.Draw(im).line(points, fill=color, width=width)
    layer[:] = np.array(im)


def ermac(parts, original):
    """Replace the crown with a wrapped red hood and a glowing masked face."""
    head = parts['head']; head[:] = 0
    polygon(head, [(28, 6), (34, 5), (39, 8), (40, 13), (37, 17), (30, 16), (27, 12)], '#661e32')
    stripe(head, [(29, 7), (34, 6), (38, 9)], '#c44a50')
    polygon(head, [(30, 10), (38, 10), (38, 12), (30, 13)], '#181a21')
    stripe(head, [(32, 11), (33, 11)], '#adff9b'); put(head, 37, 11, '#bfff9a')
    stripe(head, [(30, 14), (37, 13)], '#b54b50')
    stripe(head, [(31, 16), (37, 15)], '#411326')
    for key in ['torso', 'fupper', 'bupper', 'ffore', 'bfore']:
        if key not in parts: continue
        a = parts[key]; yy, xx = np.where(a[..., 3] > 0)
        for x, y in zip(xx, yy):
            if y % 5 == 1 and K.shade_of(a[y, x, :3]) > .18:
                put(a, x, y, '#af4b50')
    return [], [], None


def raiden(parts, original):
    """The straw hat, electric eyes and blue sash follow Mr Wake's rig."""
    a = parts['head']; a[:] = 0
    polygon(a, [(28, 12), (37, 12), (41, 17), (37, 23), (31, 20)], '#c9987d')
    polygon(a, [(24, 12), (35, 3), (40, 5), (51, 13), (37, 16)], '#bda46b')
    stripe(a, [(26, 12), (38, 14), (49, 12)], '#f2d99b')
    for x in [31, 35, 39, 43]: stripe(a, [(37, 6), (x, 12)], '#7b6348')
    stripe(a, [(34, 17), (36, 17)], '#efffff'); put(a, 39, 17, '#acffff')
    stripe(a, [(37, 20), (39, 19)], '#6e4c42')
    for name in ['torso', 'fupper', 'ffore']:
        b = parts[name]; yy, xx = np.where(b[..., 3] > 0)
        for x, y in zip(xx, yy):
            if (x + y) % 13 == 0 and K.shade_of(b[y, x, :3]) > .22: put(b, x, y, '#b6e8ff')
    return [], [], None


def scorpion(parts):
    """A hood, segmented yellow mask, armored tabard and chain kunai."""
    parts['hair'][:] = 0
    a = parts['head']; a[:] = 0
    polygon(a, [(30, 9), (33, 6), (38, 7), (40, 11), (39, 18), (35, 21), (30, 18)], '#24212a')
    stripe(a, [(31, 10), (32, 8), (36, 8)], '#54434a')
    polygon(a, [(33, 11), (39, 11), (38, 14), (33, 14)], '#b48e6b')
    stripe(a, [(35, 12), (38, 12)], '#fff0aa')
    polygon(a, [(33, 14), (39, 14), (38, 18), (34, 19), (32, 17)], '#d4a12d')
    stripe(a, [(34, 15), (38, 15)], '#ffe58b')
    for x in [34, 36, 38]: stripe(a, [(x, 16), (x-1, 18)], '#785226')
    a = parts['torso']
    polygon(a, [(28, 20), (31, 19), (34, 29), (32, 38), (28, 37)], '#c9952e')
    polygon(a, [(35, 21), (38, 23), (37, 37), (34, 38), (35, 30)], '#e5b845')
    stripe(a, [(29, 23), (30, 36)], '#f6d675')
    stripe(a, [(28, 34), (37, 34)], '#3a2529', 2)
    a = parts['mic']; a[:] = 0
    polygon(a, [(44, 14), (47, 20), (45, 26), (43, 20)], '#b9bec9')
    stripe(a, [(44, 16), (44, 22)], '#f6efcc')
    for i in range(9):
        x = 44 + round(math.sin(i*.6)*3); y = 27+i
        put(a, x, y, '#d9bd78'); put(a, x+1, y, '#775c46')
    parts['can'][:] = 0


def subzero(parts):
    """Cobalt ninja armor, facemask and an ice crystal in AERO's dome."""
    parts['fish'][:] = 0
    a = parts['head']; a[:] = 0
    polygon(a, [(27, 14), (30, 10), (36, 9), (41, 13), (42, 23), (37, 29), (29, 26)], '#152843')
    stripe(a, [(28, 16), (31, 12), (36, 11), (39, 14)], '#3876ad')
    polygon(a, [(31, 16), (40, 16), (40, 20), (31, 20)], '#a4b9c6')
    stripe(a, [(33, 18), (35, 18)], '#eaffff'); put(a, 39, 18, '#efffff')
    polygon(a, [(31, 20), (41, 20), (39, 26), (34, 27), (30, 24)], '#2368ab')
    stripe(a, [(33, 21), (39, 21)], '#a2eaff')
    for x in [33, 36, 39]: stripe(a, [(x, 23), (x-1, 25)], '#10385e')
    a = parts['torso']
    polygon(a, [(27, 29), (30, 27), (34, 34), (32, 41), (28, 40)], '#256db0')
    polygon(a, [(36, 29), (40, 30), (39, 41), (35, 42), (35, 35)], '#367fc0')
    stripe(a, [(28, 30), (30, 38)], '#92d9f1')
    polygon(a, [(32, 32), (34, 30), (36, 33), (34, 37)], '#cdfcff')
    a = parts['scarf']; a[:] = 0
    polygon(a, [(19, 27), (28, 27), (30, 29), (24, 30), (17, 32), (20, 29)], '#488cb6')
    stripe(a, [(18, 31), (26, 28)], '#b4efff')
    for key in ['ffore', 'bfore', 'fshin', 'bshin']:
        a = parts[key]; yy, xx = np.where(a[..., 3] > 0)
        for x, y in zip(xx, yy):
            if (x+y)%7 == 0: put(a, x, y, '#9fdcf3')


def kitana(frame, helpers, look, fallback=None):
    """Anchor the blue veil and steel fan to each original Lacy cel."""
    out = S.hk_look(frame, helpers, look, fallback)
    a = helpers['anchor'](frame) or fallback
    if not a: return out
    x, y = map(round, a); d = ImageDraw.Draw(out)
    # A veil covers the lower helmet; the original silhouette remains Lacy's.
    d.polygon([(x-2,y-5),(x+7,y-5),(x+5,y),(x,y+1)], fill='#2473c4', outline='#102441')
    d.line([(x-1,y-4),(x+5,y-4)], fill='#a7deff')
    blade = list(helpers['blade_pixels'](frame.load()))
    if blade:
        # Principal blade direction gives a consistent fan pivot in every cel.
        pts = np.array(blade); center = pts.mean(axis=0)
        vals, vecs = np.linalg.eigh(np.cov(pts.T)) if len(pts)>2 else (None,np.eye(2))
        axis = vecs[:,-1]
        if np.dot(axis, center-np.array(a))<0: axis=-axis
        pivot = center-axis*min(9,np.ptp(pts@axis)*.45)
        for bx,by in blade: out.putpixel((int(bx),int(by)),(0,0,0,0))
        angle = math.atan2(axis[1],axis[0]); radius = 14
        edge = [(round(pivot[0]+math.cos(angle+q)*radius),round(pivot[1]+math.sin(angle+q)*radius)) for q in np.linspace(-1.15,1.15,9)]
        pivot = tuple(map(lambda n:int(round(n)),pivot))
        d = ImageDraw.Draw(out); d.polygon([pivot]+edge,fill='#367bc2',outline='#10263f')
        for end in edge: d.line([pivot,end],fill='#c7eafa')
        d.line(edge,fill='#f2fcff',width=2)
    return out


def fit_phone_atlas(path, width, height):
    """Repack oversized sheets in frame order to fit 4096 px phone textures."""
    im = Image.open(path).convert('RGBA')
    if max(im.size) <= 4096: return
    old_columns = im.width // width
    count = old_columns * (im.height // height)
    columns = 4096 // width
    out = Image.new('RGBA', (columns * width, math.ceil(count / columns) * height))
    for i in range(count):
        x, y = (i % old_columns) * width, (i // old_columns) * height
        out.paste(im.crop((x, y, x + width, y + height)), ((i % columns) * width, (i // columns) * height))
    assert max(out.size) <= 4096, path
    out.save(path, optimize=True)


def kitana_counter():
    """The newer three-cel counter strip is outside Lacy's legacy strip list."""
    helpers = S.hk_helpers()
    source = Image.open(os.path.join(S.FIG,'hero-knight/counter_sheet.png')).convert('RGBA')
    out = Image.new('RGBA',source.size)
    for i in range(source.width//150):
        frame = source.crop((i*150,0,(i+1)*150,90))
        out.alpha_composite(kitana(frame,helpers,S.HK_LOOKS['kitana']),(i*150,0))
    out.save(os.path.join(S.FIG,'hero-knight/kitana/counter_sheet.png'))


def main():
    """Build only the five new outfits; keep generated move tables untouched."""
    S.SS_LOOKS['ermac']=(ermac, {'armor':{'sat':.2,'val':.58},'cape':{'to':354,'sat':1.3,'val':1.3},'gold':{'to':355,'sat':1.2,'val':.8},'flame':{'to':112,'sat':1.2,'val':1.25},'eyes':{'to':110,'val':1.3}}, (143,255,143))
    S.MW_LOOKS['raiden']=(raiden, {'robe':{'to':212,'sat':.9,'val':1.6},'cloth':{'to':215,'sat':.8,'val':1.5},'magic':{'to':195,'sat':.6,'val':1.35},'wood':{'sat':.15,'val':1.4}})
    S.PART_LOOKS['scorpion']=('nu','nu_draw',S.NUG,{'acid':{'to':39,'sat':1.1},'hair':{'sat':.1,'val':.3},'cloth':{'to':30,'sat':.5,'val':.55}},scorpion,(255,173,64))
    S.PART_LOOKS['subzero']=('aero','aero_draw',S.AEG,{'aqua':{'to':213,'sat':1.2,'val':.8},'lime':{'to':205,'sat':.4,'val':1.2},'fish':{'to':195,'sat':.5,'val':1.2}},subzero,(146,227,255))
    S.HK_LOOKS['kitana']=dict(plate=lambda x,y,v,inside:K.ramp_pick([(14,30,59),(22,58,115),(38,98,168),(99,174,222)],v),cloth=[(10,18,34),(22,39,72)],scarf=[(12,55,104),(38,115,195),(130,220,255)],helm=[(12,23,42),(22,39,64),(55,94,132),(110,171,209)],glove=[(14,28,49),(35,64,99),(92,144,186),(174,218,237)],blade=lambda p,v:(178,217,242),swipe=(130,216,255),hair=lambda v:(int(65*v),int(75*v),int(104*v)))
    for name, builder in [('ermac',S.build_ss),('raiden',S.build_mw),('scorpion',S.build_parts),('subzero',S.build_parts)]:
        print('Building',name,flush=True)
        graft = K.graft
        def clean_hat(frame, orig, new, recol, *args, **kwargs):
            """Remove the moving original hat above Raiden's new straw brim."""
            result = graft(frame, orig, new, recol, *args, **kwargs)
            dx,dy,_ = K.find(frame,orig['head'],search=kwargs.get('search',7))
            for y in range(max(0,dy),min(64,dy+14)):
                for x in range(max(0,dx+20),min(64,dx+57)):
                    result[y,x] = (0,0,0,0)
            lay = K._shift(new['head'],dx,dy);mask=lay[...,3]>0;result[mask]=lay[mask]
            return result
        if name == 'raiden': K.graft=clean_hat
        try: builder(name)
        finally: K.graft=graft
    # FULL AERO keeps the mask and gains ice wings and a frozen spear.
    import aero_king_draw as D
    import aero_moves as A
    from types import SimpleNamespace
    groups={'ice':{'s':(.18,1),'center':195}}
    rules={'ice':{'to':205,'sat':.65,'val':1.12}}
    layers={n:K.recolor(a,groups,rules) for n,a in D.draw_parts().items()}
    subzero(layers)
    look=SimpleNamespace(draw_parts=lambda:{n:a.copy() for n,a in layers.items()},ORDER=D.ORDER,RIG=D.RIG,composite=D.composite)
    small,big=A.N.build_rig(look,A.KFOLLOW);A.N.GHOST=(160,230,255)
    A.N.build_all(small,big,A.MOVES,os.path.join(S.FIG,'aero/subzero/king'),os.devnull,'AERO_MOVES','aero_moves.py',life_fn=A.king_life,idle=A.idle_keys)
    original = S.hk_look
    def paint(frame,H,look,fallback=None):
        S.hk_look=original
        try: return kitana(frame,H,look,fallback)
        finally: S.hk_look=paint
    S.hk_look=paint; S.build_hk('kitana'); S.hk_look=original;kitana_counter()
    import hero_knight_moves as M
    c = M.Costume('kitana')
    M.save_atlas({n:M.render_move(c,n) for n in M.MOVES},os.path.join(c.dir,'moves_sheet.png'))
    for folder in ['nu/scorpion', 'aero/subzero', 'aero/subzero/king']:
        fit_phone_atlas(os.path.join(S.FIG,folder,'moves_sheet.png'),112,104)
    print('All five costumes generated.',flush=True)


if __name__ == '__main__':
    main()

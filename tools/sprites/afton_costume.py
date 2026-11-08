"""Michael Afton / Springtrap: native pixel costumes on Rosemary's complete rig.

Run python3 tools/sprites/afton_costume.py. Builds calm, transformed, and disarmed
strips without changing generated move indexes. Every detail lives on its body
part, including the broken rabbit ears, uniform badge, wires, and lower jaw.
"""
import copy
import math
import os
import sys
from pathlib import Path
from types import SimpleNamespace

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).parent))
import last_seen_draw as D
import last_seen_moves as M
import nu_moves as N

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / 'public/assets/fighters/last-seen/afton'
BASE_DRAW = D.draw_parts
BASE_RIG = copy.deepcopy(D.RIG)
SPRINGTRAP_HEAD_SCALE = .8
NECK = (33, 21)

# Highlight, light, midtone, shade, edge: each material keeps the game's five-tone style.
SHIRT = (0xc2a3de, 0x9970bf, 0x744496, 0x4d2c68, 0x271a3a)
PANTS = (0x677287, 0x4e596e, 0x384258, 0x252d40, 0x141b29)
SKIN = (0xf4dfcc, 0xdfbda1, 0xc49980, 0x956955, 0x523b35)
HAIR = (0x95694c, 0x725037, 0x523826, 0x37271e, 0x211b18)
BOOT = (0x72737e, 0x4a4c59, 0x30323e, 0x1d202a, 0x10131d)
FUR = (0xb5b779, 0x989b58, 0x767d40, 0x525d32, 0x2b3623)
FURD = (0x9ea568, 0x7d894d, 0x5f6e39, 0x414e2b, 0x222e1e)
METAL = (0xd0d0b5, 0xa6aa98, 0x7a8276, 0x505b54, 0x2b3532)


def drawing(paint, palette=None):
    """Draw one unfiltered 64 px rig part, with optional material edge shading."""
    im = Image.new('RGBA', (64, 64))
    paint(ImageDraw.Draw(im))
    return D.shade(im, palette) if palette else np.array(im)


def over(part, paint):
    """Add small pixel details after the material's outline has been drawn."""
    im = Image.fromarray(part)
    paint(ImageDraw.Draw(im))
    return np.array(im)


def line_limb(a, b, width, palette):
    """Paint a limb on the existing joint centers so all original poses fit."""
    return drawing(lambda d: D.limb(d, a, b, width, D.hx(palette[2])), palette)


def michael_parts():
    """Purple security uniform, parted brown hair, navy trousers and a gold badge."""
    p = BASE_DRAW()
    for side, hip, knee, ankle in [('b', (28, 40), (25, 48), (24, 55)), ('f', (37, 40), (40, 48), (40, 55))]:
        p[side + 'thigh'] = line_limb(hip, knee, 5, PANTS)
        p[side + 'shin'] = line_limb(knee, ankle, 4, PANTS)
        x = ankle[0]
        p[side + 'shoe'] = drawing(lambda d, x=x: d.polygon([(x-3,54),(x+1,54),(x+5,57),(x+5,58),(x-3,58)],fill=D.hx(BOOT[2])), BOOT)
        p[side + 'shoe'] = over(p[side + 'shoe'], lambda d, x=x: d.line([(x-2,58),(x+5,58)],fill='#111624'))
    p['bupper'] = line_limb((27,24),(25,31),4,SHIRT)
    p['bfore'] = line_limb((25,31),(26,37),4,SHIRT)
    p['bfore'] = over(p['bfore'], lambda d: d.rectangle((25,37,27,40),fill='#c49980'))
    p['fupper'] = line_limb((38,24),(42,31),4,SHIRT)
    p['ffore'] = line_limb((42,31),(44,27),4,SHIRT)
    p['ffist'] = drawing(lambda d: d.ellipse((42,24,46,28),fill=D.hx(SKIN[2])),SKIN)

    def shirt(d):
        d.polygon([(29,21),(36,21),(39,24),(38,35),(38,40),(28,40),(27,35),(27,24)],fill=D.hx(SHIRT[2]))
        d.polygon([(29,20),(32,20),(34,24),(30,24)],fill=D.hx(SHIRT[2]))
    p['torso'] = drawing(shirt, SHIRT)
    def uniform(d):
        d.polygon([(31,21),(33,23),(35,21),(36,24),(33,25),(30,23)],fill='#b896d0')
        d.line([(34,25),(34,37)],fill='#38234e')
        for y in [26,30,34]: d.point((35,y),fill='#d6c9d8')
        d.line([(36,28),(38,28)],fill='#42265a')
        d.rectangle((28,39,38,40),fill='#1a2030')
        d.rectangle((33,39,35,40),fill='#ad9867')
        # A tiny gold guard badge remains attached to the chest on every pose.
        d.polygon([(29,25),(31,24),(33,25),(32,28),(30,28)],fill='#f1ce78')
        d.point((31,26),fill='#8a622d')
        d.line([(28,29),(28,35)],fill='#9b74b7')
    p['torso'] = over(p['torso'], uniform)

    def head(d):
        d.rectangle((32,17,34,22),fill=D.hx(SKIN[2]))
        d.polygon([(31,9),(37,9),(38,12),(39,15),(38,17),(36,20),(32,19),(30,16)],fill=D.hx(SKIN[2]))
    p['head'] = drawing(head, SKIN)
    def face(d):
        d.line([(32,12),(34,12)],fill='#523826')
        d.line([(36,12),(38,12)],fill='#523826')
        d.point((34,13),fill='#d8e8eb');d.point((37,13),fill='#d8e8eb')
        d.point((34,14),fill='#384b64');d.point((37,14),fill='#384b64')
        d.line([(35,17),(37,17)],fill='#745449')
        d.point((38,15),fill='#e0bca0')
        d.point((31,14),fill='#e0bca0')
    p['head'] = over(p['head'], face)
    def hair(d):
        d.polygon([(29,14),(29,9),(31,6),(36,5),(39,7),(40,10),(37,10),(35,8),(32,11),(31,16)],fill=D.hx(HAIR[2]))
    p['hair'] = drawing(hair, HAIR)
    p['hair'] = over(p['hair'],lambda d: [d.line([(31,8),(34,6)],fill='#957354'),d.line([(35,7),(38,9)],fill='#806046'),d.point((30,11),fill='#2f241f')])
    # His flyer is a security pass rather than Rosemary's missing-person sheet.
    def security_pass(d):
        d.polygon([(21,36),(28,35),(29,44),(25,45),(22,44)],fill='#c7c4b6')
        d.line([(22,37),(27,36)],fill='#73539a',width=2)
        d.rectangle((23,39,25,41),fill='#544433')
        d.line([(23,43),(27,42)],fill='#766687')
    p['poster'] = drawing(security_pass)
    p['jaw'][:] = 0;p['face'][:] = 0
    return p


def springtrap_parts():
    """Torn olive rabbit suit, metal seams, uneven ears and a hinged toothed jaw."""
    p = BASE_DRAW()
    def rabbit_head(d):
        # Long ear has a damaged rim; the other ends in a bare broken hinge.
        d.polygon([(28,13),(25,5),(26,0),(29,0),(32,11)],fill=D.hx(FUR[2]))
        d.polygon([(28,10),(27,3),(28,2),(30,10)],fill='#5a6040')
        d.line([(26,1),(26,5),(29,12)],fill='#b7b47c')
        d.polygon([(36,12),(35,6),(37,3),(40,3),(40,8),(38,13)],fill=D.hx(FUR[2]))
        d.rectangle((37,4,39,7),fill='#28362c')
        d.line([(38,4),(38,7)],fill='#b6b8a1')
        d.line([(39,6),(41,4),(40,2)],fill='#744c38')
        # The rabbit's cheeks and jutting snout are distinct from the canary rig.
        d.polygon([(27,12),(30,9),(36,9),(41,12),(43,17),(42,23),(37,26),(29,23),(26,18)],fill=D.hx(FUR[2]))
        d.rectangle((31,21,35,25),fill=D.hx(METAL[2]))
        d.polygon([(34,19),(40,18),(44,20),(43,24),(35,24),(32,22)],fill='#8d9660')
    p['head'] = drawing(rabbit_head,FUR)
    def mask_details(d):
        d.line([(28,13),(31,11),(35,11)],fill='#b8b780')
        d.ellipse((29,13,34,18),fill='#18241b');d.ellipse((36,13,41,18),fill='#18241b')
        d.rectangle((31,14,33,16),fill='#c2cfb4');d.rectangle((38,14,40,16),fill='#c2cfb4')
        d.point((32,15),fill='#eef2d3');d.point((39,15),fill='#eef2d3')
        d.point((33,16),fill='#374d36');d.point((40,16),fill='#374d36')
        d.polygon([(36,19),(40,19),(39,21),(37,21)],fill='#263428')
        d.line([(34,23),(42,23)],fill='#17261c')
        for x in [35,37,39,41]:d.point((x,22),fill='#d2cda5')
        # Torn shell and cheek hinge, with a copper wire peeking out.
        d.polygon([(27,17),(29,17),(30,20),(28,21)],fill='#2d3930')
        d.line([(28,18),(29,20)],fill='#a1aa91')
        d.line([(40,10),(39,12),(41,13)],fill='#3b4830')
        d.line([(28,22),(27,24),(30,27)],fill='#714c36')
        d.point((31,25),fill='#b7b8a0')
    p['head'] = over(p['head'],mask_details)
    def jaw(d):
        d.polygon([(34,23),(41,23),(44,21),(44,25),(40,29),(35,28),(32,25)],fill=D.hx(FUR[2]))
    p['jaw'] = drawing(jaw,FUR)
    def jaw_details(d):
        d.line([(34,25),(40,27),(43,24)],fill='#d1c89d')
        d.line([(35,26),(41,27)],fill='#243126')
        d.point((36,26),fill='#d9d3b1');d.point((39,27),fill='#d9d3b1')
        d.point((33,24),fill='#929b87')
    p['jaw'] = over(p['jaw'],jaw_details)
    p['hair'][:] = 0
    # Kept on the face hinge, visible only during the scream's wide-open jaw.
    p['face'] = drawing(lambda d: [d.rectangle((39,15,43,19),fill='#352a29'),d.point((41,16),fill='#a8b7b4'),d.line([(40,18),(42,18)],fill='#70544b')])

    def torso(d):
        d.polygon([(28,21),(36,21),(40,24),(42,33),(39,44),(29,45),(25,39),(24,29)],fill=D.hx(FUR[2]))
    p['torso'] = drawing(torso,FUR)
    def damage(d):
        d.polygon([(28,27),(31,25),(38,27),(38,40),(34,43),(29,40)],fill='#8c9158')
        # Ragged chest cavity and intact strips of metal endoskeleton.
        d.polygon([(31,28),(35,27),(38,30),(37,36),(33,38),(30,35)],fill='#1d2a21')
        for y in [29,32,35]:d.line([(32,y),(36,y+1)],fill='#939d86')
        d.line([(33,29),(34,36)],fill='#536356')
        d.line([(31,34),(30,39),(32,44)],fill='#7b4d39')
        d.line([(36,34),(38,39),(36,45)],fill='#463e48')
        d.point((31,28),fill='#b5b479');d.point((37,34),fill='#b5b479')
        d.polygon([(28,23),(31,23),(32,25),(30,26),(28,25)],fill='#303c28')
        d.polygon([(32,24),(35,22),(36,24),(34,26)],fill='#303c28')
        d.point((32,24),fill='#9c9b6b')
        for y in [29,33,38]:d.point((39,y),fill='#bec093')
        d.line([(27,29),(27,32),(29,34)],fill='#3c4c2e')
        d.line([(28,36),(27,40),(29,42)],fill='#b0ad70')
        d.line([(31,43),(31,47)],fill='#89583c')
        d.line([(36,43),(37,48)],fill='#4d4144')
        d.line([(39,39),(40,42)],fill='#1d2d23')
    p['torso'] = over(p['torso'],damage)
    # Rabbit paws replace both bird feet, keeping their original ankle pivots.
    for side,x in [('b',24),('f',40)]:
        palette=FURD if side=='b' else FUR
        def foot(d,x=x,palette=palette):
            d.polygon([(x-3,53),(x+2,53),(x+5,55),(x+7,57),(x+7,59),(x-5,59),(x-5,56)],fill=D.hx(palette[2]))
        p[side+'shoe']=drawing(foot,palette)
        p[side+'shoe']=over(p[side+'shoe'],lambda d,x=x:[d.line([(x+1,57),(x+1,59)],fill='#394b2e'),d.line([(x+4,57),(x+4,59)],fill='#394b2e'),d.point((x+6,58),fill='#abb094')])
    # A torn strip of shell covers one side of the otherwise bare back shin.
    p['bshin']=over(p['bshin'],lambda d:[d.polygon([(22,49),(24,49),(24,53),(22,54)],fill='#5d6c39'),d.point((24,50),fill='#a6aa98')])
    p['fupper']=over(p['fupper'],lambda d:[d.line([(39,24),(40,27)],fill='#9da26b'),d.line([(40,28),(42,29)],fill='#343e2c')])
    # Scale the entire articulated head assembly about its unchanged neck joint.
    # Nearest sampling keeps its eye lights, teeth and shell edges as hard pixels.
    factor=SPRINGTRAP_HEAD_SCALE
    inverse=(1/factor,0,NECK[0]-NECK[0]/factor,0,1/factor,NECK[1]-NECK[1]/factor)
    for name in ['head','jaw','face','hair']:
        p[name]=np.array(Image.fromarray(p[name]).transform((64,64),Image.Transform.AFFINE,inverse,resample=Image.Resampling.NEAREST))
    return p


def costume_parts():
    """Choose the calm human drawing or the fully redrawn animatronic drawing."""
    return springtrap_parts() if D.STYLE == 'wrong' else michael_parts()


def michael_life(pose,t):
    """A quiet breathing motion; no inherited rapid shiver or bobbing hair."""
    p=copy.deepcopy(pose)
    torso=N.full(p.get('torso'));torso[0]+=.6*math.sin(t*.055);p['torso']=tuple(torso)
    head=N.full(p.get('head'));head[0]+=.8*math.sin(t*.035);p['head']=tuple(head)
    return p


def springtrap_life(pose,t):
    """A measured mechanical sway, retaining the jaw's authored scream movement."""
    p=copy.deepcopy(pose)
    head=N.full(p.get('head'));head[0]+=2.3*math.sin(t*.07);p['head']=tuple(head)
    torso=N.full(p.get('torso'));torso[0]+=1.0*math.sin(t*.055);p['torso']=tuple(torso)
    return M.face_shows(p)


def michael_idle():
    """A restrained security-guard stance closes cleanly across the loop seam."""
    pose=dict(fupper=(18,0,0),ffore=(-50,0,0),bupper=(4,0,0),bfore=(-20,0,0))
    return [N.k(0,N.P(**pose)),N.k(48,N.P(**pose,head=(-5,0,0),torso=(1,0,0))),N.k(96,N.P(**pose)),N.k(144,N.P(**pose,head=(4,0,0),torso=(-1,0,0))),N.k(192,N.P(**pose))]


def fit_phone_atlas(path,width=112,height=104):
    """Keep every move's numeric frame index while reducing oversized grid height."""
    im=Image.open(path).convert('RGBA')
    if max(im.size)<=4096:return
    old_columns=im.width//width;count=old_columns*(im.height//height);columns=4096//width
    out=Image.new('RGBA',(columns*width,math.ceil(count/columns)*height))
    for i in range(count):
        x,y=(i%old_columns)*width,(i//old_columns)*height
        out.paste(im.crop((x,y,x+width,y+height)),((i%columns)*width,(i//columns)*height))
    assert max(out.size)<=4096,path
    out.save(path,optimize=True)


def configure():
    """Install this drawing into the legacy rig builder for this process only."""
    variant=copy.deepcopy(D.VARIANTS['scrap'])
    variant.update(FUR=FUR,FURD=FURD,METAL=METAL,BEAK=FUR,RUST=(0x685635,0x4d4d2d),WIRES=(0x81553d,0x4b464f,0xb1a568),TIE=(0x303b29,0x1d2d22),BLOOD=(0x786039,0x514c31,0x6d603a),COAT=0x52436a,HAIR=0x523826,CREST=None,EYE=(0xe4e8c4,0x263b2a))
    D.VARIANTS['afton']=variant
    D.draw_parts=costume_parts
    # Jaw/inner-face hinges shrink with the head, keeping the scream connected.
    D.RIG=copy.deepcopy(BASE_RIG)
    for name in ['jaw','face']:
        pivot,parent=BASE_RIG[name]
        D.RIG[name]=(tuple(NECK[i]+(pivot[i]-NECK[i])*SPRINGTRAP_HEAD_SCALE for i in range(2)),parent)


def smooth_runs():
    """Replace only the three run strips with seamless 24-cel cyclic rig motion."""
    from smooth_run_cycles import render_run
    import costume_kit as C
    configure()
    D.set_style('calm');small,_=N.build_rig(D,M.FOLLOW)
    calm=render_run(small,N.run_keys(),michael_life)
    C.save_strip(calm,str(DEST/'run_sheet.png'),64,64)
    D.set_style('wrong');D.set_variant('afton');small,_=N.build_rig(D,{**M.FOLLOW,**M.LOOSE})
    keys=M.wrong_run()
    for noaxe in [False,True]:
        frames=render_run(small,keys,M.unarmed(springtrap_life) if noaxe else springtrap_life)
        path=DEST/'wrong'/('noaxe' if noaxe else '')/'run_sheet.png'
        C.save_strip(frames,str(path),64,64)
    print('AFTON: all three runs use 24 seamless cels over their original 48-tick cycle.')


def main():
    """Export all three complete animation sets and the matching loose axe prop."""
    configure()
    D.set_style('calm');small,big=N.build_rig(D,M.FOLLOW);N.GHOST=(153,111,186)
    N.build_all(small,big,M.CALM,str(DEST),os.devnull,'LS_MOVES','afton_costume.py',life_fn=michael_life,idle=michael_idle)
    D.set_style('wrong');D.set_variant('afton');small,big=N.build_rig(D,{**M.FOLLOW,**M.LOOSE});N.GHOST=(164,175,95)
    jumps=((M.WJUMP,M.mix(M.WJUMP,head=(-38,0,0),bupper=(-80,0,0),ffist=(-30,0,0))),(M.WFALL,M.mix(M.WFALL,head=(-28,0,0),bupper=(-160,0,0),ffist=(-90,0,0))))
    M.save_axe(str(DEST/'wrong/axe.png'))
    for noaxe in [False,True]:
        path=DEST/'wrong'/('noaxe' if noaxe else '')
        N.build_all(small,big,M.WRONG,str(path),os.devnull,'LS_WRONG_MOVES','afton_costume.py',life_fn=M.unarmed(springtrap_life) if noaxe else springtrap_life,idle=M.wrong_idle,run=M.wrong_run,run_life=M.unarmed(springtrap_life) if noaxe else springtrap_life,jumps=jumps)
    for path in DEST.rglob('moves_sheet.png'):fit_phone_atlas(path)
    smooth_runs()
    print('AFTON: Michael, Springtrap, disarmed Springtrap and axe exported.')


if __name__=='__main__':
    main()

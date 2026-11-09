"""Rosemary's authored Aether-style recovery, on every existing costume rig.

Only recovery PNGs and lsRecoveryFrames.js are written. All variants share six
uniform clips and a 112x104 canvas with feet at (56,95). Finished rasters are never
cross-faded: limb interpolation and nearest-pixel rig rendering supply the cels.
"""
import ast
import copy
import json
import math
from pathlib import Path
from types import SimpleNamespace

import numpy as np
from PIL import Image, ImageDraw

import last_seen_draw as D
import last_seen_moves as M
import nu_moves as N
import afton_costume as A
from puppet import pose_at, fill_holes

ROOT=Path(__file__).resolve().parents[2]
DEST=ROOT/'public/assets/fighters/last-seen/recovery'
BASE_DRAW=D.draw_parts
BASE_RIG=copy.deepcopy(D.RIG)
CLIPS={'wind':[0,8],'throw':[8,6],'rise':[14,12],'catch':[26,6],'fall':[32,6],'land':[38,12]}
LOOKS=['base','bunny','soviet','afton','seen','seen_rave','seen_showtime','seen_drowned','seen_angler','seen_bunny','seen_afton']
LOOKS += [name+'_noaxe' for name in LOOKS if name.startswith('seen')]


def bunny_parts():
    """Reuse the bunny's actual part drawings without running its heavy exporter."""
    source=ast.parse((Path(__file__).parent/'broken_bunny.py').read_text())
    definitions=[node for node in source.body if isinstance(node,ast.FunctionDef)]
    namespace={'D':D,'base_draw':BASE_DRAW,'np':np,'Image':Image,'ImageDraw':ImageDraw}
    exec(compile(ast.Module(body=definitions,type_ignores=[]),'broken_bunny_parts','exec'),namespace)
    return namespace['parts']()


def layers_for(name):
    """Get independent body layers, retaining custom masks, ears and head hinges."""
    D.draw_parts=BASE_DRAW;D.RIG=copy.deepcopy(BASE_RIG)
    seen=name.startswith('seen');unarmed=name.endswith('_noaxe')
    costume=name.removeprefix('seen_').removesuffix('_noaxe') if seen else name
    if costume=='seen':costume='base'
    D.set_style('wrong' if seen else 'soviet' if costume=='soviet' else 'calm')
    D.set_variant(costume if costume in D.VARIANTS else 'scrap')
    if costume=='bunny':
        variant=copy.deepcopy(D.VARIANTS['scrap'])
        variant.update(FUR=(0xb2f4e4,0x69baa9,0x397c79,0x235353,0x102d31),FURD=(0x8cc8b7,0x57918a,0x356962,0x244b47,0x0d2827),BEAK=(0xddd7b8,0xaaa98e,0x737c70,0x474f4b,0x1a2826),TIE=(0x765088,0x37253d),CREST=None)
        D.VARIANTS['bunny']=variant;D.set_variant('bunny');parts=bunny_parts()
    elif costume=='afton':
        A.configure();D.set_variant('afton');parts=A.costume_parts()
    else:
        parts=BASE_DRAW()
    if not seen:
        style=D.STYLE;D.set_style('wrong')
        donor=A.springtrap_parts() if costume=='afton' else BASE_DRAW()
        D.set_style(style)
        parts['axe']=donor['axe'].copy();parts['axed']=donor['axed'].copy()
    parts['poster'][:]=0
    if unarmed:parts['axe'][:]=0;parts['axed'][:]=0
    return parts,copy.deepcopy(D.RIG)


def joint_angles(a,b,end,target,bend):
    """Aim two native limb segments at a target, preserving their real lengths."""
    u=np.array(b,dtype=float)-a;v=np.array(end,dtype=float)-b
    l1,l2=np.linalg.norm(u),np.linalg.norm(v);delta=np.array(target,dtype=float)-a
    distance=min(l1+l2-.01,max(abs(l1-l2)+.01,float(np.linalg.norm(delta))))
    direction=math.atan2(delta[1],delta[0])
    spread=math.acos(max(-1,min(1,(l1*l1+distance*distance-l2*l2)/(2*l1*distance))))
    upper=direction+bend*spread
    elbow=np.array(a)+np.array([math.cos(upper),math.sin(upper)])*l1
    aim=np.array(a)+delta/max(.01,float(np.linalg.norm(delta)))*distance
    fore=math.atan2(aim[1]-elbow[1],aim[0]-elbow[0])
    upper_rotation=math.degrees(upper-math.atan2(u[1],u[0]))
    fore_rotation=math.degrees(fore-math.atan2(v[1],v[0]))-upper_rotation
    return upper_rotation,fore_rotation


def stance(front,back,weapon,torso=0,head=0,legs=None,root=None,hide=False,back_end=(26,39)):
    """Pose arms and the axe as one articulated chain, with a deliberate body line."""
    fu,ff=joint_angles((38,24),(42,31),(44,26),front,-1)
    bu,bf=joint_angles((27,24),(25,31),back_end,back,1)
    p={'torso':(torso,0,0),'head':(head,0,0),'fupper':(fu,0,0),'ffore':(ff,0,0),'ffist':(weapon-torso-fu-ff,0,0),
       'bupper':(bu,0,0),'bfore':(bf,0,0),'root':root or (0,0,0,1,1),
       '_hide':('axed','poster','face')+(('axe',) if hide else ())}
    p.update(legs or N.legs())
    return p


def authored_keys(back_end):
    """Wind up, toss, follow the weapon, catch it and lead the plunge with its head."""
    make=lambda *args,**kwargs:stance(*args,back_end=back_end,**kwargs)
    ready=make((43,34),(27,38),177)
    crouch=make((43,29),(28,36),205,torso=10,head=-6,legs=N.legs(24,-32,-20,30,4,-6),root=(0,0,1,1.04,.95))
    toss=make((46,14),(28,31),0,torso=-4,head=-8,legs=N.legs(10,-10,-8,10),root=(0,0,0,1,1))
    release=copy.deepcopy(toss);release['_hide']+=('axe',)
    push=make((46,13),(26,29),0,torso=-6,head=-10,legs=N.legs(8,-4,-6,4),hide=True)
    rising=make((46,13),(24,25),0,torso=-5,head=-8,legs=N.legs(-26,68,-46,82,-12,-18),hide=True)
    reach=make((46,13),(30,20),0,torso=0,head=-8,legs=N.legs(-30,72,-40,78,-10,-16),hide=True)
    caught=copy.deepcopy(reach);caught['_hide']=('axed','poster','face')
    turn=make((43,23),(36,26),105,torso=4,head=-6,legs=N.legs(-34,76,-38,76,-10,-14))
    plunge=make((40,35),(39,31),177,torso=12,head=-10,legs=N.legs(-38,82,-42,84,-14,-18),root=(0,0,3,1,1))
    absorb=make((41,34),(39,30),177,torso=18,head=-12,legs=N.legs(30,-40,-28,38,6,-8),root=(0,0,2,1.05,.92))
    return {
        'wind':[(0,ready,'linear'),(.48,crouch,'inout'),(1,toss,'inout')],
        'throw':[(0,release,'linear'),(.6,push,'inout'),(1,push,'linear')],
        'rise':[(0,push,'linear'),(.55,rising,'inout'),(1,reach,'inout')],
        'catch':[(0,caught,'linear'),(.4,caught,'inout'),(1,turn,'inout')],
        'fall':[(0,turn,'linear'),(1,plunge,'inout')],
        'land':[(0,plunge,'linear'),(.35,absorb,'inout'),(1,ready,'inout')],
    }


def render(name):
    """Render fifty pixel cels; no old move atlases or normal idle/run art is touched."""
    layers,joints=layers_for(name)
    drawing=SimpleNamespace(draw_parts=lambda:{k:v.copy() for k,v in layers.items()},ORDER=D.ORDER,RIG=joints,composite=D.composite)
    _,rig=N.build_rig(drawing,{'head':(.1,0),'hair':(.18,0),'jaw':(0,0),'ffore':(.06,0),'bfore':(.06,0)})
    y,x=np.where(layers['bfore'][...,3]>0);lower=y>=max(y)-2
    back_end=(float(np.median(x[lower])),float(np.median(y[lower])))
    keys=authored_keys(back_end);frames=[];grips=[]
    for clip,(_,count) in CLIPS.items():
        controls=keys[clip]
        for index in range(count):
            phase=index/(count-1);pose=pose_at(controls,phase)
            # Give lagged parts a real neighboring pose, including the first cel.
            previous=max(0,phase-1/max(1,count-1));pose['_prev']=pose_at(controls,previous)
            if clip in ('wind','throw') or clip=='land' and phase>.3:
                feet=rig.render(pose,only=('bshoe','fshoe','bshin','fshin'))[...,3]>0
                lowest=int(np.where(feet)[0].max());root=list(N.full(pose.get('root')));root[2]+=95-lowest;pose['root']=tuple(root)
            image=rig.render(pose,fi=index);fill_holes(image,6);frames.append(image)
            grip=rig.matrix('axe',pose)@np.array([45,25,1]);grips.append([round(float(grip[0]-56),1),round(float(grip[1]-95),1)])
    return frames,grips


def save_palette(frames,path):
    """Save exact RGBA colors as palette indices, avoiding lossy quantization."""
    sheet=np.zeros((104*5,112*10,4),np.uint8)
    for index,frame in enumerate(frames):sheet[index//10*104:(index//10+1)*104,index%10*112:(index%10+1)*112]=frame
    packed=(sheet[...,0].astype(np.uint32)<<24)|(sheet[...,1].astype(np.uint32)<<16)|(sheet[...,2].astype(np.uint32)<<8)|sheet[...,3]
    colors,indices=np.unique(packed,return_inverse=True)
    if len(colors)>256:
        Image.fromarray(sheet).save(path,optimize=True,compress_level=9)
    else:
        image=Image.fromarray(indices.reshape(sheet.shape[:2]).astype(np.uint8),'P')
        palette=[];alpha=[]
        for color in colors:palette.extend([int(color>>24)&255,int(color>>16)&255,int(color>>8)&255]);alpha.append(int(color)&255)
        image.putpalette(palette+[0]*(768-len(palette)));image.info['transparency']=bytes(alpha)
        image.save(path,optimize=True,compress_level=9)
    restored=np.array(Image.open(path).convert('RGBA'))
    assert np.array_equal(restored,sheet),f'palette changed pixels: {path}'


def main():
    """Build uniform clips for human, transformed and disarmed costume variants."""
    DEST.mkdir(parents=True,exist_ok=True);grips={};total=0
    for name in LOOKS:
        frames,grips[name]=render(name)
        path=DEST/(name+'.png');save_palette(frames,path);total+=path.stat().st_size
        assert path.stat().st_size<2*1024*1024
        print(name,len(frames),'cels',path.stat().st_size,'bytes',flush=True)
    table='// Generated by tools/sprites/rosemary_recovery.py - do not edit by hand.\n'
    table+='// Logical112x104, feet(56,95). Clip[start,count]; body axe absent during throw/rise.\n'
    table+='export const LS_RECOVERY_CLIPS='+json.dumps(CLIPS,separators=(',',':'))+';\n'
    table+='export const LS_RECOVERY_GRIPS='+json.dumps(grips,separators=(',',':'))+';\n'
    (ROOT/'src/fighters/lsRecoveryFrames.js').write_text(table)
    print('Recovery PNG total:',total,'bytes',flush=True)


if __name__=='__main__':main()

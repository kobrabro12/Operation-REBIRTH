"""Check cel boundaries, lossless packed frames, and Meta Knight's authored animation data."""
from pathlib import Path
from PIL import Image
import json
import re
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
FOLDER=ROOT/'public/assets/fighters/hero-knight/metaknight'
text=(ROOT/'src/fighters/hkMetaMoves.js').read_text()


def table(name):
    """Read one JSON animation table from the generated module."""
    return json.loads(re.search(r'export const '+name+r'\s*=\s*([^;]+);',text).group(1))


def cells(path,fw,fh):
    """Split a logical grid without allowing one cel to borrow its neighbor's pixels."""
    im=Image.open(path).convert('RGBA');assert max(im.size)<=4096 and path.stat().st_size<2_000_000,path
    assert im.width%fw==0 and im.height%fh==0,path
    return [np.array(im.crop((x,y,x+fw,y+fh))) for y in range(0,im.height,fh) for x in range(0,im.width,fw)]


clips=table('HK_META_MOVES');anchors=table('HK_META_ANCHORS');hurt=table('HK_META_HURT')
assert len(clips)>=35
native={}
for path in FOLDER.glob('*_sheet.png'):
    name=path.name.removesuffix('_sheet.png')
    if name=='taunt':continue
    fw,fh=(180,140) if name in ['moves','bare_moves'] else (150,90)
    native[name]=cells(path,fw,fh)
    for i,cel in enumerate(native[name]):
        # Transparent guard pixels keep neighboring cels from bleeding into one another.
        alpha=cel[:,:,3]
        assert not alpha[0,:].any() and not alpha[-1,:].any() and not alpha[:,0].any() and not alpha[:,-1].any(),(name,i,'cel edge')
    if name in hurt:
        assert len(hurt[name])<=len(native[name]),(name,'body bounds count')
        assert all(not cel[:,:,3].any() for cel in native[name][len(hurt[name]):]),(name,'unmapped opaque cel')
assert len(native['idle'])==len(native['run'])==24
run=native['run'];assert len({cel.tobytes() for cel in run})>=20
delta=[np.any(a!=b,axis=2).sum() for a,b in zip(run,run[1:]+run[:1])]
assert delta[-1]<=max(delta[:-1])*1.25,('run seam',delta)
moves=native['moves']
for key,a in clips.items():
    assert a[0]>=0 and a[1]>0 and a[2]>0 and a[0]+a[1]<=len(moves),(key,a)
    for i in range(a[0],a[0]+a[1]):
        assert moves[i][:,:,3].any(),(key,i,'empty pose')
        anchor=anchors[i] if isinstance(anchors,list) else anchors[str(i)]
        assert all(np.isfinite(v) for v in anchor['hand']+anchor['tip']),(key,i,'anchor')
        box=hurt['moves'][i]
        assert box and box[0]<box[2] and box[1]<box[3],(key,i,'body bounds')
for key in ['limit_charge','limit_slash','limit_recover']:
    a=clips[key]
    for i in range(a[0],a[0]+a[1]):
        anchor=anchors[i] if isinstance(anchors,list) else anchors[str(i)]
        assert anchor.get('armed') is False,(key,i,'duplicate held sword')
a=clips['swordthrow']
for t in range(8,a[1]*a[2]):
    i=a[0]+t//a[2];anchor=anchors[i] if isinstance(anchors,list) else anchors[str(i)]
    assert anchor.get('armed') is False,('throw',t,'extra held sword')

bare_clips=table('HK_META_BARE_MOVES')
for key,a in bare_clips.items():
    for i in range(a[0],a[0]+a[1]):
        cel=native['bare_moves'][i];rgb=cel[:,:,:3].astype(float)
        warm=(rgb[:,:,0]>rgb[:,:,1]*.99)&(rgb[:,:,1]>110)&(rgb[:,:,1]>rgb[:,:,2]*1.3)&(cel[:,:,3]>0)
        assert int(warm.sum())<25,(key,i,'gold weapon pixels in swordless pose')

for stem,name in [('hk_meta_moves','moves'),('hk_meta_bare_moves','bare_moves')]:
    packed=Image.open(ROOT/('public/assets/mobile/'+stem+'.png')).convert('RGBA')
    assert max(packed.size)<=4096
    data=json.loads((ROOT/('public/assets/mobile/'+stem+'.json')).read_text())
    for frame,spec in data['frames'].items():
        i=int(frame);r=spec['frame'];b=spec['spriteSourceSize'];out=Image.new('RGBA',(180,140))
        out.paste(packed.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h'])),(b['x'],b['y']))
        actual=np.array(out);expected=native[name][i];visible=expected[:,:,3]>0
        assert np.array_equal(actual[:,:,3],expected[:,:,3]) and np.array_equal(actual[visible],expected[visible]),('packed pixels',name,i)
print(f'PASS {len(clips)} custom clips, {len(moves)} move cels, 24-cel run, swordless actions, cel borders, body bounds and lossless phone atlases')

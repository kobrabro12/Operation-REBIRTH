"""Check regenerated costume loops and Michael/Springtrap source assets."""
from pathlib import Path
from PIL import Image
import numpy as np
import json
import re

text=Path('src/fighters/smoothRunHeads.js').read_text()
frames=json.loads(re.search(r'export const SMOOTH_RUN_FRAMES\s*=\s*([^;]+);',text).group(1))
paths=[]
for path in Path('public/assets/fighters').rglob('run_sheet.png'):
    image=Image.open(path).convert('RGBA')
    if image.size!=(1536,64): continue
    a=np.array(image);cells=[a[:,i*64:(i+1)*64] for i in range(24)]
    assert len({c.tobytes() for c in cells})>=20,path
    changes=[np.count_nonzero((cells[i][...,3]>0)!=(cells[(i+1)%24][...,3]>0)) for i in range(24)]
    assert changes[-1]/max(1,np.median(changes[:-1]))<1.5,(path,changes[-1],np.median(changes[:-1]))
    paths.append(path)
assert len(paths)>=28,(len(paths),'expected shared runs and three Afton variants')
afton=list(Path('public/assets/fighters/last-seen/afton').rglob('*.png'))
assert len(afton)==19
for path in afton:
    im=Image.open(path)
    assert max(im.size)<=4096 and path.stat().st_size<2*1024*1024,path
for folder in ['','wrong/','wrong/noaxe/']:
    assert Image.open(Path('public/assets/fighters/last-seen/afton')/folder/'run_sheet.png').size==(1536,64)
print('PASS',len(paths),'smooth loops,',len(afton),'Afton assets, phone limits, distinct cels and loop seams')

"""Verify the standing hip/neck column and matching ready pose in both Springtrap forms."""
from pathlib import Path
from PIL import Image
import sys
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools/sprites'))
import afton_costume as A
from puppet import pose_at

A.configure();A.D.set_style('wrong');A.D.set_variant('afton')
rig,_=A.N.build_rig(A.D,{**A.M.FOLLOW,**A.M.LOOSE})
deviation=[]
for t in range(0,192,6):
    p=A.springtrap_life(pose_at(A.springtrap_idle(),t),t)
    matrix=rig.matrix('torso',p);neck=matrix@np.array([33,21,1]);hip=matrix@np.array([33,40,1])
    deviation.append(abs(neck[0]-hip[0]))
assert max(deviation)<.4,('standing hunch',max(deviation))
for folder in ['wrong','wrong/noaxe']:
    base=ROOT/'public/assets/fighters/last-seen/afton'/folder
    idle=Image.open(base/'idle_sheet.png').convert('RGBA').crop((0,0,64,64))
    ready=Image.open(base/'moves_sheet.png').convert('RGBA').crop((24,36,88,100))
    a,b=np.array(idle),np.array(ready);visible=a[:,:,3]>0
    assert np.array_equal(a[:,:,3],b[:,:,3]) and np.array_equal(a[visible],b[visible]),(folder,'ready/idle discontinuity')
    assert Image.open(base/'run_sheet.png').size==(1536,64)
print('PASS upright Springtrap:',round(max(deviation),4),'px maximum neck/hip deviation; both ready poses match idle')

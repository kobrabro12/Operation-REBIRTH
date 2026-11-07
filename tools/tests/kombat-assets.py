"""Costume details must survive movement, and every sheet must fit phone GPUs."""
from pathlib import Path
from PIL import Image
import numpy as np

root = Path('public/assets/fighters')
looks = [('soul-summoner','ermac',(102,30,50)),('mr-wake','raiden',(189,164,107)),
         ('hero-knight','kitana',(36,115,196)),('nu','scorpion',(212,161,45)),
         ('aero','subzero',(35,104,171))]
checked = 0
for fighter, look, marker in looks:
    for path in (root / fighter / look).rglob('*_sheet.png'):
        im = Image.open(path).convert('RGBA')
        assert max(im.size) <= 4096, (path, im.size)
        assert path.stat().st_size < 2*1024*1024, path
        move = path.name == 'moves_sheet.png'
        width, height = ((180,140) if fighter=='hero-knight' else (176,120) if fighter=='mr-wake' else (112,104)) if move else ((150,90) if fighter=='hero-knight' else (64,64))
        assert im.width%width == 0 and im.height%height == 0, path
        # Repacking may add empty padding frames, but must preserve all original frame indexes.
        base = Image.open(root / fighter / ('king' if 'king' in path.parts else '') / path.name)
        assert (im.width//width)*(im.height//height) >= (base.width//width)*(base.height//height), path
        if path.stem in ['idle_sheet','run_sheet','jump_sheet','fall_sheet','moves_sheet']:
            a = np.array(im); solid=marked=0
            for y in range(0,im.height,height):
                for x in range(0,im.width,width):
                    frame=a[y:y+height,x:x+width]
                    if not np.any(frame[...,3]): continue
                    solid+=1;marked+=bool(np.any(np.all(frame[...,:3]==marker,axis=-1)&(frame[...,3]>0)))
            assert solid and marked/solid>.65, (path,marked,solid,'costume detail disappears')
        checked+=1
assert checked >= 40, checked
print('PASS',checked,'costume sheets: moving costume details, frame capacity, pixel dimensions, phone limits')

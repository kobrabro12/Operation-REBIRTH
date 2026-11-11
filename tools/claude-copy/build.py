# Builds the claude.ai copy of the game: dist/ with every asset under assets/<subfolder>/ packed into a few
# bundle files, plus pack-shim.js, which serves those assets to the game from the bundles.
import os, sys, json, shutil
DIST = '/home/claude/operation-rebirth/dist'
OUT = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/rebirth-artifact'   # (outside the repo)
TARGET = 1536 * 1024; CAP = 3 * 1024 * 1024
SKIP = {'sw.js'}
shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
real, packed = [], {}
for root, _, files in os.walk(DIST):
    for f in sorted(files):
        p = os.path.relpath(os.path.join(root, f), DIST)
        if p in SKIP or p.endswith('.mp3'): continue
        parts = p.split('/')
        if parts[0] == 'assets' and len(parts) > 2 and p != 'assets/ui/loading-screen.png':
            packed.setdefault(os.path.dirname(p), []).append(p)
        else: real.append(p)
# group folders (in path order) into bundles of ~TARGET bytes
packs, cur, size = [], [], 0
for d in sorted(packed):
    for p in packed[d]:
        s = os.path.getsize(os.path.join(DIST, p))
        if cur and size + s > CAP: packs.append(cur); cur, size = [], 0
        cur.append(p); size += s
    if size >= TARGET: packs.append(cur); cur, size = [], 0
if cur: packs.append(cur)
index = {}
os.makedirs(os.path.join(OUT, 'packs'))
for i, files in enumerate(packs):
    off = 0
    with open(os.path.join(OUT, 'packs', 'p%02d.wasm' % i), 'wb') as o:
        for p in files:
            b = open(os.path.join(DIST, p), 'rb').read(); o.write(b)
            index[p] = [i, off, len(b)]; off += len(b)
for p in real:
    os.makedirs(os.path.dirname(os.path.join(OUT, p)) or OUT, exist_ok=True)
    shutil.copy(os.path.join(DIST, p), os.path.join(OUT, p))
shim = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shim_template.js')).read().replace('/*INDEX*/{}', json.dumps(index, separators=(',', ':')))
open(os.path.join(OUT, 'pack-shim.js'), 'w').write(shim)
h = open(os.path.join(OUT, 'index.html')).read()
h = h.replace('<script type="module"', '<script src="./pack-shim.js"></script>\n  <script type="module"', 1)
open(os.path.join(OUT, 'index.html'), 'w').write(h)
print('real files', len(real), 'packs', len(packs), 'packed files', len(index))
for i, f in enumerate(packs): print(i, len(f), round(sum(index[p][2] for p in f) / 1e6, 1), 'MB', f[0])

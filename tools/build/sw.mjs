// Writes dist/sw.js, the service worker for offline play (template: tools/build/sw-template.js), with the
// list of every file in dist/ and a short hash of its contents - which is how a new version knows what
// changed. Runs after `vite build` (package.json "build"), once every other build step has finished
// writing dist/ (Vite runs its plugins' end-of-build steps side by side, so this can't be one of them).
//
//   node tools/build/sw.mjs [distDir]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = path.resolve(process.argv[2] || path.join(ROOT, 'dist'));
// fetched when a version installs, so the game starts offline: the page, the code, the font, the home-screen bits
const PRECACHE = (p) => p === 'index.html' || p === 'manifest.webmanifest' || p === 'loading-screens.js' || p.startsWith('icons/')
  || (p.startsWith('assets/') && /\.(js|css|woff2?)$/.test(p) && !p.includes('/', 'assets/'.length)) || p === 'assets/ui/loading-screen.png';

/** Every file under a folder, as paths relative to it. */
function walk(dir, base = dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, base)); else out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}

if (!fs.existsSync(path.join(dist, 'index.html'))) { console.error('sw: no ' + dist + '/index.html - run vite build first'); process.exit(1); }
const files = {};
for (const p of walk(dist).sort()) {
  if (p === 'sw.js' || p.endsWith('.map')) continue;
  files[p] = crypto.createHash('sha1').update(fs.readFileSync(path.join(dist, p))).digest('hex').slice(0, 10);
}
const pre = Object.keys(files).filter(PRECACHE);
const src = fs.readFileSync(path.join(ROOT, 'tools/build/sw-template.js'), 'utf8')
  .replace('/*FILES*/{}', JSON.stringify(files))
  .replace('/*PRECACHE*/[]', JSON.stringify(pre));
fs.writeFileSync(path.join(dist, 'sw.js'), src);
console.log(`sw: ${path.relative(ROOT, path.join(dist, 'sw.js')) || 'sw.js'} lists ${Object.keys(files).length} files (${pre.length} fetched on install), ${(src.length / 1024).toFixed(0)} KB`);

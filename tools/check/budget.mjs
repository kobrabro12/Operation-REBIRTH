// Size budget: how much the built game asks players to download, by kind of file, against the limits in
// budget.json. Run after `npm run build`. Growing past a limit fails, so the game only gets bigger on
// purpose: shrink what you added, or raise that limit in budget.json in the same commit and say why.
//
//   npm run build && npm run check:budget
//   npm run check:budget -- --update    (rewrite budget.json to today's sizes + 10% headroom)
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(process.argv.find((a) => a.startsWith('--dist='))?.slice(7) || 'dist');
const BUDGET = new URL('./budget.json', import.meta.url);
if (!fs.existsSync(DIST)) { console.log('check:budget - no dist/ yet: run `npm run build` first'); process.exit(1); }

/** Every file in the build, as paths relative to dist/. */
function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p, base) : [path.relative(base, p).split(path.sep).join('/')];
  });
}

const files = new Set(walk(DIST));
const sizes = { images: 0, audio: 0, video: 0, code: 0, data: 0, other: 0 };
let biggest = { file: '', size: 0 };
for (const f of files) {
  const ext = path.extname(f).toLowerCase(), size = fs.statSync(path.join(DIST, f)).size;
  // what a player downloads: the .webp instead of its .png twin, the .ogg (or .mp3) - not both
  if (ext === '.png' && files.has(f.slice(0, -4) + '.webp')) continue;
  if (ext === '.mp3' && files.has(f.slice(0, -4) + '.ogg')) continue;
  if (ext === '.mp4' && files.has(f.slice(0, -4) + '.webm')) continue;
  const kind = { '.png': 'images', '.webp': 'images', '.ogg': 'audio', '.mp3': 'audio', '.wav': 'audio', '.webm': 'video', '.mp4': 'video',
    '.js': 'code', '.css': 'code', '.html': 'code', '.woff2': 'code', '.json': 'data' }[ext] || 'other';
  sizes[kind] += size;
  if (size > biggest.size) biggest = { file: f, size };
}
const total = Object.values(sizes).reduce((a, b) => a + b, 0);
const mb = (b) => (b / 1e6).toFixed(1).padStart(6) + ' MB';

if (process.argv.includes('--update')) {
  const limits = Object.fromEntries([...Object.entries(sizes), ['total', total]].map(([k, v]) => [k, Math.ceil(v * 1.1 / 1e5) / 10]));
  fs.writeFileSync(BUDGET, JSON.stringify({ note: 'Download budget in MB (what players fetch: WebP over PNG, one audio format). Raise a limit only on purpose, with the reason in the commit.', limits }, null, 2) + '\n');
  console.log('check:budget - budget.json rewritten:', JSON.stringify(limits));
  process.exit(0);
}

const { limits } = JSON.parse(fs.readFileSync(BUDGET, 'utf8'));
let over = 0;
console.log('check:budget - download size by kind (limit from tools/check/budget.json)');
for (const [k, v] of [...Object.entries(sizes), ['total', total]]) {
  const lim = limits[k], bad = lim !== undefined && v / 1e6 > lim;
  if (bad) over++;
  console.log(`  ${k.padEnd(7)} ${mb(v)}  / ${lim === undefined ? '  (none)' : mb(lim * 1e6)}${bad ? '   OVER' : ''}`);
}
console.log(`  biggest file: ${biggest.file} (${mb(biggest.size).trim()})`);
if (over) { console.log(`check:budget - ${over} limit(s) exceeded. Shrink what was added, or raise the limit in budget.json on purpose.`); process.exit(1); }
console.log('check:budget - ok');

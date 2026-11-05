// WebP copies of the game's richer images, made at build time.
//
// The palette step (optimize-png.mjs) shrinks every PNG with 256 colours or fewer - most of the pixel
// art. Images with more colours than that (painted art like the soul pictures, a few big sheets) can't
// use a palette, so this step writes a LOSSLESS .webp next to each one in dist/ whenever it's smaller:
// every pixel stays exactly the same (checked after encoding).
// Why not lossy WebP: it was tried and measured. The soul art is mostly semi-transparent pixels, and the
// game turns every pixel at least half opaque into a solid one (src/souls/portraits.js), which shows
// the colours lossy WebP is free to change there: 38-85% of the 96 px portrait pixels came out visibly
// different. Lossless keeps them all; the bigger saving for that art is shrinking it to its display size.
// The PNGs in public/ stay the source (edit those, never the .webp), and the PNG in dist/ stays too as a
// fallback. src/webp.js then makes the game load the .webp instead, so code keeps naming the .png.
// New images are picked up automatically: nothing to remember when adding art.
//
//   node tools/build/webp.mjs [publicDir]     - prints what would be converted and the sizes
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const MIN_SAVING = 0.1;         // only use the WebP if it's at least 10% smaller than the PNG
export const MANIFEST_ID = 'virtual:webp-manifest';

function pngsIn(dir, base = dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...pngsIn(p, base));
    else if (e.name.toLowerCase().endsWith('.png')) out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}

async function colourCount(file) {
  const { data } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = new Uint32Array(data.buffer, data.byteOffset, data.length / 4), seen = new Set();
  for (let i = 0; i < px.length; i++) { seen.add(px[i]); if (seen.size > 256) break; }
  return seen.size;
}

// One public/ PNG -> { rel, png, webp: Buffer } or null when it stays a PNG.
async function convert(publicDir, rel) {
  const file = path.join(publicDir, rel);
  if (await colourCount(file) <= 256) return null;     // the palette step handles these
  const webp = await sharp(file).webp({ lossless: true, effort: 6, exact: true }).toBuffer();
  const png = fs.statSync(file).size;
  if (webp.length > png * (1 - MIN_SAVING)) return null;
  // same pixels? Every alpha value and every colour that can show must match; only the hidden colour of
  // fully see-through pixels may differ (never drawn - the same rule as the palette step).
  const [a, b] = await Promise.all([sharp(file).ensureAlpha().raw().toBuffer(), sharp(webp).ensureAlpha().raw().toBuffer()]);
  if (a.length !== b.length) throw new Error('webp: ' + rel + ' changed size after encoding');
  for (let i = 0; i < a.length; i += 4) {
    if (a[i + 3] !== b[i + 3] || (a[i + 3] && (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]))) throw new Error('webp: ' + rel + ' changed after encoding');
  }
  return { rel, png, webp };
}

export async function planWebp(publicDir) {
  const files = pngsIn(publicDir), out = [];
  const n = Math.max(1, Math.min(os.availableParallelism ? os.availableParallelism() : os.cpus().length, 4));
  for (let i = 0; i < files.length; i += n) {
    const batch = await Promise.all(files.slice(i, i + n).map((rel) => convert(publicDir, rel)));
    for (const r of batch) if (r) out.push(r);
  }
  return out;
}

function report(list, log) {
  const mb = (b) => (b / 1e6).toFixed(1) + ' MB';
  const png = list.reduce((s, r) => s + r.png, 0), webp = list.reduce((s, r) => s + r.webp.length, 0);
  log(`webp: ${list.length} images over 256 colours ${mb(png)} -> ${mb(webp)} (lossless, same pixels)`);
}

// Vite plugin. In a build: converts, writes the .webp files into dist/, and gives src/webp.js the list.
// In dev the list is empty, so `npm run dev` loads the PNGs as they are.
export function webpPlugin() {
  let list = [], root = process.cwd(), outDir = 'dist', isBuild = false;
  return {
    name: 'webp-art',
    configResolved(c) { root = c.root; outDir = path.resolve(c.root, c.build.outDir); isBuild = c.command === 'build'; },
    async buildStart() {
      if (!isBuild || process.env.SKIP_WEBP) return;
      list = await planWebp(path.resolve(root, 'public'));
      report(list, (m) => this.info ? this.info(m) : console.log(m));
    },
    resolveId(id) { return id === MANIFEST_ID ? '\0' + MANIFEST_ID : null; },
    load(id) { return id === '\0' + MANIFEST_ID ? 'export default ' + JSON.stringify(list.map((r) => r.rel)) + ';' : null; },
    closeBundle() {
      for (const r of list) {
        const out = path.join(outDir, r.rel.replace(/\.png$/i, '.webp'));
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, r.webp);
      }
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const list = await planWebp(path.resolve(process.argv[2] || 'public'));
  report(list, console.log);
  for (const r of list.sort((a, b) => b.png - a.png)) console.log(`  ${(r.png / 1e3).toFixed(0).padStart(6)} KB -> ${(r.webp.length / 1e3).toFixed(0).padStart(5)} KB  ${r.rel}`);
}

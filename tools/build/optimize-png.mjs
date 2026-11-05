// Lossless PNG shrink for the built game. Runs after `vite build` on dist/ only, so the PNGs the
// generators in tools/ write into public/assets/ stay the source and are never touched.
//
// Pixel art rarely uses more than 256 colours, so most sheets fit a palette PNG (colour type 3)
// holding EXACTLY the same RGBA values: nothing is approximated or dithered. Every new file is decoded
// again and compared with the original, pixel for pixel, before it replaces anything; a sheet with
// more than 256 colours, or any file that would not come out smaller, is left as it is.
//
//   node tools/build/optimize-png.mjs [dir]     (default: dist) - prints what it saved
// A file that would change is an error: the build stops rather than ship a different picture.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import os from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

// ---------------------------------------------------------------- PNG writing
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

// Palette PNG from RGBA pixels, or null when the image has more than 256 distinct colours.
// `hideClear`: treat every fully see-through pixel as the same colour (its RGB is never drawn).
function encodePalette(width, height, rgba, hideClear) {
  const index = new Map(), colours = [];
  const px = new Uint32Array(width * height);
  for (let i = 0, p = 0; p < px.length; p++, i += 4) {
    const a = rgba[i + 3];
    const key = a === 0 && hideClear ? 0 : ((rgba[i] << 24) | (rgba[i + 1] << 16) | (rgba[i + 2] << 8) | a) >>> 0;
    let n = index.get(key);
    if (n === undefined) {
      if (colours.length === 256) return null;
      n = colours.length; index.set(key, n); colours.push(key);
    }
    px[p] = n;
  }
  // see-through colours first, so the tRNS chunk can stop at the last one
  const order = colours.map((c, i) => i).sort((x, y) => ((colours[x] & 255) === 255) - ((colours[y] & 255) === 255));
  const remap = new Uint8Array(colours.length);
  order.forEach((old, i) => { remap[old] = i; });
  const sorted = order.map((i) => colours[i]);
  const depth = sorted.length <= 2 ? 1 : sorted.length <= 4 ? 2 : sorted.length <= 16 ? 4 : 8;
  const rowBytes = Math.ceil((width * depth) / 8);
  const raw = Buffer.alloc((rowBytes + 1) * height);            // filter byte 0 (none) per row: best for palettes
  for (let y = 0; y < height; y++) {
    const row = y * (rowBytes + 1) + 1;
    for (let x = 0; x < width; x++) {
      const v = remap[px[y * width + x]];
      const bit = x * depth;
      raw[row + (bit >> 3)] |= v << (8 - depth - (bit & 7));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = depth; ihdr[9] = 3;                                  // colour type 3 = palette
  const plte = Buffer.alloc(sorted.length * 3);
  sorted.forEach((c, i) => { plte[i * 3] = c >>> 24; plte[i * 3 + 1] = (c >>> 16) & 255; plte[i * 3 + 2] = (c >>> 8) & 255; });
  const alphas = sorted.map((c) => c & 255);
  let last = alphas.length;
  while (last > 0 && alphas[last - 1] === 255) last--;
  const parts = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('PLTE', plte)];
  if (last) parts.push(chunk('tRNS', Buffer.from(alphas.slice(0, last))));
  parts.push(chunk('IDAT', zlib.deflateSync(raw, { level: 9, memLevel: 9 })), chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}

// Same picture? Fully see-through pixels only need to stay see-through when `hideClear` was used.
function samePixels(a, b, hideClear) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i + 3] !== b[i + 3]) return false;
    if (hideClear && a[i + 3] === 0) continue;
    if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) return false;
  }
  return true;
}

export function optimizeFile(file) {
  const before = fs.readFileSync(file);
  let img;
  try { img = PNG.sync.read(before); } catch (e) { return { file, before: before.length, after: before.length, skipped: 'unreadable' }; }
  if (img.depth && img.depth !== 8) return { file, before: before.length, after: before.length, skipped: '16-bit' };
  for (const hideClear of [false, true]) {                     // keep even hidden colours when they fit
    const out = encodePalette(img.width, img.height, img.data, hideClear);
    if (!out) continue;
    if (!samePixels(img.data, PNG.sync.read(out).data, hideClear)) throw new Error('optimize-png: ' + file + ' changed after re-encoding');
    if (out.length >= before.length) return { file, before: before.length, after: before.length, skipped: 'no gain' };
    fs.writeFileSync(file, out);
    return { file, before: before.length, after: out.length };
  }
  return { file, before: before.length, after: before.length, skipped: 'over 256 colours' };
}

function pngsIn(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...pngsIn(p));
    else if (e.name.toLowerCase().endsWith('.png')) out.push(p);
  }
  return out;
}

// Files are spread over worker threads (one per CPU core): deflate at level 9 is the slow part.
function runPool(files) {
  const n = Math.max(1, Math.min(os.availableParallelism ? os.availableParallelism() : os.cpus().length, files.length));
  const queue = files.slice(), results = [];
  return new Promise((resolve, reject) => {
    let live = n;
    for (let i = 0; i < n; i++) {
      const w = new Worker(new URL(import.meta.url), { workerData: { worker: true } });
      const next = () => { const f = queue.shift(); if (f) w.postMessage(f); else w.terminate(); };
      w.on('message', (r) => { if (r.error) { reject(new Error(r.error)); queue.length = 0; } else results.push(r); next(); });
      w.on('error', reject);
      w.on('exit', () => { if (--live === 0) resolve(results); });
      next();
    }
  });
}

if (!isMainThread && workerData && workerData.worker) {
  parentPort.on('message', (f) => {
    try { parentPort.postMessage(optimizeFile(f)); } catch (e) { parentPort.postMessage({ error: e.message }); }
  });
}

export async function optimizeDir(dir, log = console.log) {
  const t0 = Date.now();
  const results = await runPool(pngsIn(dir));
  const before = results.reduce((s, r) => s + r.before, 0), after = results.reduce((s, r) => s + r.after, 0);
  const mb = (n) => (n / 1e6).toFixed(1) + ' MB';
  const kept = results.filter((r) => r.skipped === 'over 256 colours').map((r) => path.relative(dir, r.file));
  log(`optimize-png: ${results.length} PNGs ${mb(before)} -> ${mb(after)} in ${((Date.now() - t0) / 1000).toFixed(0)} s (lossless)`);
  if (kept.length) log('optimize-png: kept as they are (over 256 colours): ' + kept.join(', '));
  return { before, after, results };
}

// Vite plugin: shrink the copied PNGs once the build has written dist/.
export function optimizePngPlugin() {
  let outDir = 'dist';
  return {
    name: 'optimize-png',
    apply: 'build',
    configResolved(c) { outDir = path.resolve(c.root, c.build.outDir); },
    async closeBundle() { if (!process.env.SKIP_PNG_OPTIMIZE) await optimizeDir(outDir); },
  };
}

if (isMainThread && process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  optimizeDir(path.resolve(process.argv[2] || 'dist')).catch((e) => { console.error(e.message); process.exit(1); });
}

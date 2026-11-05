// MP3 copies of the game's audio, made at build time.
//
// Every clip lives in public/ as an .ogg only. Older Safari (iPhone / iPad / Mac) can't play .ogg, so the
// game asks for ['x.ogg', 'x.mp3'] and those browsers take the MP3 - this step makes that MP3 next to each
// .ogg in dist/ (and the dev server makes one on the fly when Safari asks for it). Git ignores .mp3 files
// in public/ (.gitignore), so a script that still writes one doesn't add a second copy to the repo.
// The MP3 is encoded from the .ogg at its bitrate rounded up to a standard MP3 rate (48-192 kbps): about the size the old hand-made MP3s were.
// Encoded files are kept in node_modules/.cache/rebirth-mp3/ (by the .ogg's contents): a build only
// encodes clips that changed. ffmpeg comes from the ffmpeg-static package (or FFMPEG=/path/to/ffmpeg).
// SKIP_MP3=1 skips it (a quick build then has no MP3s: test it in Chrome or Firefox).
//
//   node tools/build/mp3.mjs [dir]     - makes the MP3 for every .ogg under dir (default dist/)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CACHE = path.join(ROOT, 'node_modules/.cache/rebirth-mp3');
const VERSION = 'v3';                      // change to re-encode everything (e.g. after changing the bitrate rule)
const RATES = [48, 56, 64, 80, 96, 112, 128, 160, 192];

/** Where ffmpeg is: $FFMPEG, the ffmpeg-static package, or `ffmpeg` on the PATH. */
function ffmpegPath() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try { const p = createRequire(import.meta.url)('ffmpeg-static'); if (p && fs.existsSync(p)) return p; } catch (e) { /* not installed */ }
  return 'ffmpeg';
}

/** Runs ffmpeg with some arguments; resolves with its stderr (where it prints the clip's details). */
function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath(), ['-hide_banner', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 || args.length === 2 ? resolve(err) : reject(new Error('ffmpeg failed: ' + err.slice(-400)))));
  });
}

/** The MP3 bitrate for an .ogg: its own, rounded up to a standard rate, 48-192 kbps. */
async function bitrateFor(ogg) {
  const info = await ffmpeg(['-i', ogg]);                     // (no output file: ffmpeg just describes the input)
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(info);
  const secs = m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
  const kbps = secs > 0 ? fs.statSync(ogg).size * 8 / secs / 1000 : 128;
  return RATES.find((r) => r >= kbps) || RATES[RATES.length - 1];
}

/**
 * The MP3 for one .ogg, from the cache or freshly encoded.
 * @param {string} ogg - path of the .ogg
 * @returns {Promise<string>} path of the cached .mp3
 */
export async function mp3For(ogg) {
  const hash = crypto.createHash('sha1').update(VERSION).update(fs.readFileSync(ogg)).digest('hex');
  const out = path.join(CACHE, hash + '.mp3');
  if (fs.existsSync(out)) return out;
  fs.mkdirSync(CACHE, { recursive: true });
  const tmp = out + '.' + process.pid + '.tmp.mp3';
  await ffmpeg(['-y', '-v', 'error', '-i', ogg, '-map_metadata', '-1', '-c:a', 'libmp3lame', '-b:a', (await bitrateFor(ogg)) + 'k', tmp]);
  fs.renameSync(tmp, out);
  return out;
}

/** Every .ogg under a folder. */
function oggsIn(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...oggsIn(p));
    else if (e.name.toLowerCase().endsWith('.ogg')) out.push(p);
  }
  return out;
}

/**
 * Writes x.mp3 next to every x.ogg under a folder (a few at a time).
 * @returns {Promise<{made: number, ms: number}>}
 */
export async function makeMp3s(dir) {
  const t0 = Date.now(), list = oggsIn(dir);
  let next = 0;
  const worker = async () => {
    while (next < list.length) {
      const ogg = list[next++];
      fs.copyFileSync(await mp3For(ogg), ogg.slice(0, -4) + '.mp3');
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(8, os.cpus().length)) }, worker));
  return { made: list.length, ms: Date.now() - t0 };
}

/** The Vite plugin: MP3s for dist/ after a build, and on request in the dev server. */
export function mp3Plugin() {
  let outDir = 'dist', publicDir = 'public', building = false;
  return {
    name: 'rebirth-mp3',
    configResolved(c) { outDir = path.resolve(c.root, c.build.outDir); publicDir = c.publicDir; building = c.command === 'build'; },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = decodeURIComponent((req.url || '').split('?')[0]);
        if (!url.endsWith('.mp3')) return next();
        const file = path.join(publicDir, url.replace(/^\/+/, ''));
        const ogg = file.slice(0, -4) + '.ogg';
        if (!file.startsWith(publicDir) || fs.existsSync(file) || !fs.existsSync(ogg)) return next();
        try { const mp3 = await mp3For(ogg); res.setHeader('Content-Type', 'audio/mpeg'); fs.createReadStream(mp3).pipe(res); } catch (e) { next(e); }
      });
    },
    async closeBundle() {
      if (!building) return;                     // (the dev server calls this too when it closes)
      if (process.env.SKIP_MP3) { console.log('mp3: skipped (SKIP_MP3)'); return; }
      const r = await makeMp3s(outDir);
      console.log(`mp3: ${r.made} MP3 copies for Safari in ${(r.ms / 1000).toFixed(1)} s`);
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = await makeMp3s(path.resolve(process.argv[2] || path.join(ROOT, 'dist')));
  console.log(`mp3: ${r.made} MP3 copies in ${(r.ms / 1000).toFixed(1)} s`);
}

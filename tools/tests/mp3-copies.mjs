// MP3 COPIES (tools/build/mp3.mjs): audio is kept as .ogg only and the MP3 Safari plays is made from it -
// by the dev server on request, and by the build in dist/. Checks the dev server answers an .mp3 request
// with real MP3 audio, and that an MP3 is made for an .ogg the same way the build does.
// If this fails: ffmpeg isn't found (npm install puts one in node_modules via ffmpeg-static, or set FFMPEG).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';
import { mp3For } from '../build/mp3.mjs';

const server = await createServer({ server: { host: '127.0.0.1', port: 0, hmr: false }, logLevel: 'silent' });
await server.listen();
try {
  const url = server.resolvedUrls.local[0] + 'assets/audio/sfx/fireball_throw.mp3';
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rebirth-mp3-'));
  const mp3Local = 'public/assets/audio/sfx/fireball_throw.mp3', moved = path.join(tmp, 'local.mp3');
  if (fs.existsSync(mp3Local)) fs.renameSync(mp3Local, moved);          // (a copy an old script left there would be served as is)
  try {
    const r = await fetch(url);
    assert.equal(r.status, 200, 'the dev server answers an .mp3 that only exists as .ogg');
    assert.match(r.headers.get('content-type') || '', /audio\/mpeg/);
    const b = Buffer.from(await r.arrayBuffer());
    assert.ok(b.length > 1000 && (b.slice(0, 3).toString() === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)), 'it is MP3 audio');
  } finally { if (fs.existsSync(moved)) fs.renameSync(moved, mp3Local); }
  const cached = await mp3For('public/assets/audio/sfx/fireball_charge.ogg');
  assert.ok(fs.statSync(cached).size > 1000, 'the build\'s encoder makes an MP3');
  assert.equal(await mp3For('public/assets/audio/sfx/fireball_charge.ogg'), cached, 'and keeps it in the cache');
  console.log('PASS MP3 copies are made from the .ogg (dev server and build)');
} finally { await server.close(); }

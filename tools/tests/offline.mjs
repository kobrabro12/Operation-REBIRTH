// OFFLINE PLAY + UPDATE READY (src/pwa.js, tools/build/sw.mjs + sw-template.js), end to end on a real build:
// 1. first visit: the service worker installs and keeps the files the game loads
// 2. with the network off, the game still starts and reaches the title screen
// 3. a new version is published: it downloads in the background, the title shows UPDATE READY - RESTART,
//    pressing it reloads into the new version (and drops the old version's changed files)
// If this fails: check dist/sw.js was written (npm run build runs tools/build/sw.mjs after vite build).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { preview } from 'vite';
import { chromium } from 'playwright-core';

const exe = process.env.SIM_CHROME || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => fs.existsSync(p));
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'rebirth-offline-'));
const env = { ...process.env, SKIP_PNG_OPTIMIZE: '1', SKIP_WEBP: '1', SKIP_MP3: '1' };     // a quick build: those steps don't matter here
execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', out, '--emptyOutDir', '--logLevel', 'error'], { env, stdio: 'inherit' });
execFileSync(process.execPath, ['tools/build/sw.mjs', out], { stdio: 'inherit' });

const server = await preview({ build: { outDir: out }, preview: { host: '127.0.0.1', port: 0 }, logLevel: 'silent' });
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
try {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const title = () => page.waitForFunction(() => window.game && window.game.scene.isActive('Title'), null, { timeout: 180000 });
  await page.goto(url + '?sw=1');
  await title();
  await page.waitForFunction(() => navigator.serviceWorker.controller || navigator.serviceWorker.ready.then(() => true), null, { timeout: 60000 });
  await page.reload(); await title();                                  // now under the worker: everything it loads gets kept
  await page.waitForTimeout(1500);
  const cached = await page.evaluate(async () => (await (await caches.open('rebirth')).keys()).length);

  // music streams with range requests: the first one fetches the whole file into the cache in the background
  await page.evaluate(() => fetch('assets/audio/music/title.ogg', { headers: { Range: 'bytes=0-99' } }).then((r) => r.arrayBuffer()));
  await page.waitForFunction(async () => (await (await caches.open('rebirth')).keys()).some((r) => r.url.includes('music/title.ogg')), null, { timeout: 30000 });

  // 2. offline
  await ctx.setOffline(true);
  await page.reload(); await title();
  const offlineOk = await page.evaluate(() => window.game.scene.isActive('Title'));
  const range = await page.evaluate(async () => { const r = await fetch('assets/audio/music/title.ogg', { headers: { Range: 'bytes=10-109' } }); return { status: r.status, len: (await r.arrayBuffer()).byteLength, cr: r.headers.get('content-range') }; });
  await ctx.setOffline(false);

  // 3. publish a new version: one changed file (the loading screen script) and a new sw.js listing it
  fs.appendFileSync(path.join(out, 'loading-screens.js'), '\n// new version\n');
  execFileSync(process.execPath, ['tools/build/sw.mjs', out], { stdio: 'ignore' });
  await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
  await page.waitForFunction(() => window.game.scene.getScene('Title').updateBtn?.visible, null, { timeout: 60000 });
  const before = await page.evaluate(() => fetch('loading-screens.js').then((r) => r.text()));
  const reloaded = page.waitForEvent('load', { timeout: 90000 });        // (listen first: the reload can be quick)
  await page.keyboard.press('u', { delay: 100 });
  await reloaded;
  await title();
  const after = await page.evaluate(() => fetch('loading-screens.js').then((r) => r.text()));
  const keys = await page.evaluate(async () => (await (await caches.open('rebirth')).keys()).map((r) => r.url).filter((u) => u.includes('loading-screens.js')));

  assert.deepEqual(errors, [], 'no page errors');
  assert.ok(cached > 100, 'the files the game loaded were kept (' + cached + ')');
  assert.equal(offlineOk, true, 'the game starts with no network');
  assert.equal(range.status, 206, 'a music range request is answered from the cache offline');
  assert.equal(range.len, 100);
  assert.match(range.cr || '', /^bytes 10-109\/\d+$/);
  assert.ok(!before.includes('new version'), 'before restarting, the old version is still the one running');
  assert.ok(after.includes('new version'), 'after UPDATE READY - RESTART, the new version runs');
  assert.equal(keys.length, 1, 'the old copy of the changed file was dropped');
  console.log(`PASS offline: ${cached} files kept, starts offline, update shows on the title and applies on restart`);
} finally { await browser.close(); await server.close(); fs.rmSync(out, { recursive: true, force: true }); }

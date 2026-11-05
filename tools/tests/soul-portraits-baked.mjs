// The baked soul portrait sheets (public/assets/souls/baked/, npm run bake:souls) must give exactly the
// textures the game would make from the full soul pictures. Boots the game twice - normally (baked) and
// with ?bakeSouls=1 (from the pictures) - and compares every portrait texture pixel for pixel. If this
// fails, a soul picture or SOUL_ATLASES changed without re-baking: run `npm run bake:souls`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { SOUL_ATLASES } from '../../src/souls/portraits.js';

const exe = process.env.SIM_CHROME || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => fs.existsSync(p));
const server = await createServer({ server: { host: '127.0.0.1', port: 0, hmr: false }, logLevel: 'silent' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });

/** Boots the game and returns each portrait texture as a hash of its pixels (plus the bake data, if any). */
async function portraits(query) {
  const page = await browser.newPage();
  const errors = [], fetched = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('request', (r) => { if (r.url().includes('/assets/souls/')) fetched.push(r.url().split('/assets/souls/')[1]); });
  await page.route('**/*', (r) => (r.request().url().startsWith(url) ? r.continue() : r.abort()));
  await page.goto(url + query);
  await page.waitForFunction(() => window.game && window.game.scene && window.game.scene.isActive('Title'), null, { timeout: 180000 });
  const tex = await page.evaluate((keys) => {
    const out = {};
    for (const k of keys) {
      if (k === 'soul_grimoire') continue;                       // its eye is painted on live, by real time
      const t = window.game.textures.get(k), c = t.getSourceImage(), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let h = 2166136261; for (let i = 0; i < d.length; i++) h = Math.imul(h ^ d[i], 16777619) >>> 0;
      out[k] = { w: c.width, h: c.height, frames: t.getFrameNames().length, hash: h };
    }
    return { out, bake: globalThis.__soulBake ? globalThis.__soulBake.soul_grimoire : null };
  }, SOUL_ATLASES.map((a) => a.key));
  await page.close();
  return { ...tex, errors, fetched };
}

try {
  const baked = await portraits('');
  const live = await portraits('?bakeSouls=1');
  assert.deepEqual(baked.errors, [], 'no errors with the baked sheets');
  assert.deepEqual(live.errors, [], 'no errors building from the pictures');
  assert.ok(baked.fetched.every((f) => f.startsWith('baked/') || !SOUL_ATLASES.some((a) => a.file === f)), 'the normal game fetches only the baked sheets: ' + baked.fetched.join(', '));
  for (const k of Object.keys(live.out)) assert.deepEqual(baked.out[k], live.out[k], k + ': baked sheet differs from the live one - run npm run bake:souls');
  // the grimoire: its sheet as baked vs as made from the picture just now (before the eye is drawn)
  const fromBake = await sharp('public/assets/souls/baked/soul_grimoire.png').ensureAlpha().raw().toBuffer();
  const fromLive = await sharp(Buffer.from(live.bake.split(',')[1], 'base64')).ensureAlpha().raw().toBuffer();
  assert.ok(fromBake.equals(fromLive), 'soul_grimoire: baked sheet differs - run npm run bake:souls');
  console.log(`PASS ${Object.keys(live.out).length + 1} soul portrait sheets identical to the ones made from the full pictures; the game fetched ${baked.fetched.filter((f) => f.startsWith('baked/')).length} baked sheets and none of those pictures`);
} finally { await browser.close(); await server.close(); }

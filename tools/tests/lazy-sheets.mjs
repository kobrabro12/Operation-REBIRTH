// COSTUME SHEETS ON DEMAND (src/fighters/lazySheets.js): a costume's strips other than idle are not loaded at
// boot, load when a match uses the costume, and are dropped again by the next match that doesn't.
// If this fails: a costume strip is loaded at boot again (check BootScene calls deferCostumeSheets), or a
// match started before its fighters' strips were there.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const exe = process.env.SIM_CHROME || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => fs.existsSync(p));
const server = await createServer({ server: { host: '127.0.0.1', port: 0, hmr: false }, logLevel: 'silent' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route('**/*', (r) => (r.request().url().startsWith(url) ? r.continue() : r.abort()));
  await page.goto(url);
  await page.waitForFunction(() => window.game && window.game.scene.isActive('Title'), null, { timeout: 180000 });
  const report = await page.evaluate(async () => {
    const { settings } = await import('/src/settings.js'), { skinsFor } = await import('/src/fighters/skins.js');
    const T = window.game.textures, has = (k) => T.exists(k);
    const demo = window.game.scene.getScene('Match'), demoMissing = demo && demo.fighters ? demo.fighters.flatMap((f) => Object.values(f.sheets)).filter((k) => !has(k)) : [];   // the title demo never waits for a download
    const inferno = skinsFor('nu').findIndex((s) => s.name === 'INFERNO');
    // what the title has (the title demo may wear a costume, so stop it first and look at a NU costume)
    const play = async (picks, skins) => {
      for (const s of window.game.scene.getScenes(true)) window.game.scene.stop(s.scene.key);
      Object.assign(settings, { mode: 'stock', stocks: 1, picks, skins, cpuCount: picks.length - 1, cpuLevels: [1, 1, 1], difficulty: 1, stage: 'sky-sanctum', items: false, hazards: false, p1Pad: null, extraPads: [], from: 'Setup' });
      window.game.scene.start('Match');
      const t0 = performance.now();
      while (!(window.game.scene.isActive('Match') && window.game.scene.getScene('Match').fighters)) { if (performance.now() - t0 > 60000) throw Error('match never started'); await new Promise((r) => setTimeout(r, 50)); }
      const m = window.game.scene.getScene('Match');
      return m.fighters.flatMap((f) => Object.values(f.sheets)).filter((k) => !has(k));
    };
    const atTitle = { idle: has('nu_inferno_idle'), moves: has('nu_inferno_moves') };
    const missingIn = await play(['nu', 'mr-wake'], [inferno, 0]);
    const inMatch = has('nu_inferno_moves') && has('nu_inferno_run');
    const missingAfter = await play(['soul-summoner', 'mr-wake'], [0, 0]);
    return { demoMissing, atTitle, missingIn, inMatch, dropped: !has('nu_inferno_moves'), idleKept: has('nu_inferno_idle'), missingAfter };
  });
  assert.deepEqual(errors, [], 'no page errors');
  assert.deepEqual(report.demoMissing, [], 'the title demo only wears costumes that are already loaded');
  assert.equal(report.atTitle.idle, true, 'a costume\'s idle strip is loaded at boot (menus show it)');
  assert.equal(report.atTitle.moves, false, 'a costume\'s moves strip is not loaded at boot');
  assert.deepEqual(report.missingIn, [], 'every strip the fighters use was there when the match started');
  assert.equal(report.inMatch, true, 'the costume\'s strips loaded for the match');
  assert.equal(report.dropped, true, 'the next match without the costume dropped its strips');
  assert.equal(report.idleKept, true, 'its idle strip stays');
  assert.deepEqual(report.missingAfter, [], 'the second match had all its strips');
  console.log('PASS costume strips load per match and are dropped after: ' + JSON.stringify(report));
} finally { await browser.close(); await server.close(); }

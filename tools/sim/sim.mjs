// Headless match simulator: runs all-CPU matches in a headless browser as fast as the CPU allows
// (no 60 fps wait) and prints damage, KOs and any errors. Same random seed = same match, so it can
// also check that a refactor didn't change how the game plays (compare --json output before/after).
//
//   npm run sim                                   4 random fighters, random stage, seed 1
//   npm run sim -- --fighters soul-summoner,mr-wake --stage sky-sanctum --matches 5
//   npm run sim -- --smoke                        every stage, every fighter, every costume: short matches
//   npm run sim -- --json > out.json              machine-readable result
//
// Options: --fighters a,b[,c,d]  --stage id|random  --seed N  --matches N  --frames N (cap per match)
//          --level 0|1|2 (CPU difficulty)  --stocks N  --no-items  --no-hazards  --draw-every N  --json  --smoke
//
// Needs Chrome or Edge installed (or set SIM_CHROME to a browser executable). Phaser is served from
// node_modules instead of the CDN, so it works offline.
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ---------------------------------------------------------------- options
const argv = process.argv.slice(2);
const opt = (name, def) => { const i = argv.indexOf('--' + name); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : def; };
const flag = (name) => argv.includes('--' + name);
const O = {
  fighters: opt('fighters', null), stage: opt('stage', 'random'), seed: +opt('seed', 1), matches: +opt('matches', 1),
  frames: +opt('frames', 60 * 60 * 4), level: +opt('level', 2), stocks: +opt('stocks', 2),
  items: !flag('no-items'), hazards: !flag('no-hazards'), drawEvery: +opt('draw-every', 3), json: flag('json'), smoke: flag('smoke'),
};

// ---------------------------------------------------------------- browser + dev server
function findBrowser() {
  const c = [process.env.SIM_CHROME, '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'];
  return c.find((p) => p && existsSync(p));
}

const server = await createServer({ root: ROOT, logLevel: 'silent', server: { port: 0, strictPort: false, hmr: false } });
await server.listen();
const url = server.resolvedUrls.local[0];
const exe = findBrowser();
if (!exe) { console.error('No Chrome/Edge found. Set SIM_CHROME to a browser executable.'); process.exit(2); }
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
const page = await browser.newPage();
const phaserJs = readFileSync(path.join(ROOT, 'node_modules/phaser/dist/phaser.min.js'));
await page.route('**/*', (r) => {
  const u = r.request().url();
  if (u.includes('/npm/phaser@')) return r.fulfill({ body: phaserJs, contentType: 'application/javascript' });
  if (u.startsWith(url)) return r.continue();
  return r.abort();                                   // fonts etc.: not needed to simulate
});
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) consoleErrors.push(m.text()); });   // ERR_FAILED = a blocked font request
page.on('pageerror', (e) => consoleErrors.push(String(e)));

await page.goto(url);
await page.waitForFunction(() => window.game && window.game.scene.isActive('Title'), null, { timeout: 60000 });
const info = await page.evaluate(async () => {
  const { ROSTER } = await import('/src/fighters/roster.js');
  const { STAGES } = await import('/src/stage/stages.js');
  const { skinsFor } = await import('/src/fighters/skins.js');
  const fighters = ROSTER.filter((f) => f.available).map((f) => f.id);
  return { fighters, stages: STAGES.filter((s) => s.available).map((s) => s.id), skins: Object.fromEntries(fighters.map((id) => [id, skinsFor(id).length])) };
});

// ---------------------------------------------------------------- one match, run inside the page
async function runMatch(spec) {
  return page.evaluate(async (spec) => {
    // seeded random so the same seed replays the same match
    let a = spec.seed >>> 0;
    Math.random = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const { demoRequest } = await import('/src/settings.js');
    const { MatchScene } = await import('/src/scenes/MatchScene.js');
    MatchScene.prototype.update = function () {};      // the script calls tick() itself: no real-time frames sneak in
    const game = window.game;
    game.loop.wake();
    for (const k of ['Title', 'Match']) if (game.scene.isActive(k) || game.scene.isPaused(k)) game.scene.stop(k);
    await new Promise((r) => setTimeout(r, 50));
    demoRequest.next = true;
    demoRequest.settings = {
      mode: 'stock', stocks: spec.stocks, hp: 150, minutes: 3, items: spec.items, hazards: spec.hazards, crt: false,
      stage: spec.stage, picks: spec.fighters, skins: spec.skins || spec.fighters.map(() => 0), cpuCount: spec.fighters.length,
      difficulty: spec.level, cpuLevels: spec.fighters.map(() => spec.level), p1Pad: null, extraPads: [],
    };
    game.scene.start('Match');
    const t0 = performance.now();
    while (!(game.scene.isActive('Match') && game.scene.getScene('Match').fighters)) {
      if (performance.now() - t0 > 20000) return { error: { frame: 0, message: 'Match scene never started' } };
      await new Promise((r) => setTimeout(r, 20));
    }
    const m = game.scene.getScene('Match');
    game.loop.sleep();                                  // from here the script drives the game, not the clock
    let error = null, frame = 0;
    const start = performance.now();
    try {
      for (; frame < spec.frames; frame++) {
        m.tick();
        if (spec.drawEvery > 0 && frame % spec.drawEvery === 0) m.draw();   // also exercises rendering code
        if (m.over === 1) break;
      }
    } catch (e) { error = { frame, message: String(e && e.message || e), stack: String(e && e.stack || '').split('\n').slice(0, 6).join('\n') }; }
    const ms = performance.now() - start;
    return {
      stage: m.stage.constructor.name, frames: frame, seconds: +(frame / 60).toFixed(1), simMs: Math.round(ms), ended: m.over === 1, error,
      fighters: m.fighters.map((f) => ({ id: f.def.id, kos: f.kos, falls: f.falls, stocks: f.stocks, dealt: Math.round(f.stats.damageDealt), taken: Math.round(f.stats.damageTaken), out: f.eliminated, state: f.state })),
    };
  }, spec);
}

// ---------------------------------------------------------------- plan the matches
let rnd = O.seed >>> 0;
const pick = (arr) => { rnd = (rnd * 1103515245 + 12345) >>> 0; return arr[rnd % arr.length]; };
const specs = [];
const base = { level: O.level, stocks: O.stocks, items: O.items, hazards: O.hazards, drawEvery: O.drawEvery };
if (O.smoke) {
  // every stage once, with every fighter on it; then each fighter mirrored. Short matches.
  let s = O.seed;
  for (const stage of info.stages) specs.push({ ...base, stage, fighters: [...info.fighters, info.fighters[0]].slice(0, 4), seed: s++, frames: Math.min(O.frames, 60 * 45) });
  for (const f of info.fighters) specs.push({ ...base, stage: info.stages[0], fighters: [f, f], seed: s++, frames: Math.min(O.frames, 60 * 45) });
  // every costume (some reshape abilities and effects): four copies of the fighter, costumes k..k+3
  for (const f of info.fighters) for (let k = 0; k < info.skins[f]; k += 4) {
    const skins = [0, 1, 2, 3].map((i) => (k + i) % info.skins[f]);
    specs.push({ ...base, stage: info.stages[(k / 4) % info.stages.length], fighters: [f, f, f, f], skins, seed: s++, frames: Math.min(O.frames, 60 * 30) });
  }
} else {
  for (let i = 0; i < O.matches; i++) {
    const fighters = O.fighters ? O.fighters.split(',') : [0, 1, 2, 3].map(() => pick(info.fighters));
    const stage = O.stage === 'random' ? pick(info.stages) : O.stage;
    specs.push({ ...base, stage, fighters, seed: O.seed + i, frames: O.frames });
  }
}
for (const sp of specs) {
  for (const f of sp.fighters) if (!info.fighters.includes(f)) { console.error(`Unknown fighter "${f}". Available: ${info.fighters.join(', ')}`); process.exit(2); }
  if (!info.stages.includes(sp.stage)) { console.error(`Unknown stage "${sp.stage}". Available: ${info.stages.join(', ')}`); process.exit(2); }
}

// ---------------------------------------------------------------- warm-up
// Stages and costumes build some textures once, using random numbers. Build them all up front so every
// real match starts from the same state (otherwise the title-screen demo decides what's already cached).
for (const stage of info.stages) await runMatch({ ...base, stage, fighters: info.fighters.slice(0, 4), seed: 0, frames: 2, drawEvery: 1 });
for (const f of info.fighters) for (let k = 0; k < info.skins[f]; k += 4) {
  await runMatch({ ...base, stage: info.stages[0], fighters: [f, f, f, f], skins: [0, 1, 2, 3].map((i) => (k + i) % info.skins[f]), seed: 0, frames: 2, drawEvery: 1 });
}

// ---------------------------------------------------------------- run + report
const results = [];
for (const sp of specs) {
  const r = await runMatch(sp);
  results.push({ spec: { stage: sp.stage, fighters: sp.fighters, skins: sp.skins, seed: sp.seed }, ...r });
  if (!O.json) {
    console.log(`\n${sp.stage}  seed ${sp.seed}${sp.skins ? '  costumes ' + sp.skins.join(',') : ''}  ${r.seconds}s game time in ${r.simMs}ms  ${r.error ? 'ERROR' : r.ended ? 'finished' : 'frame cap'}`);
    for (const f of r.fighters || []) console.log(`  ${f.id.padEnd(15)} KOs ${String(f.kos).padStart(2)}  falls ${String(f.falls).padStart(2)}  dealt ${String(f.dealt).padStart(4)}%  taken ${String(f.taken).padStart(4)}%${f.out ? '  (out)' : ''}`);
    if (r.error) console.log(`  !! frame ${r.error.frame}: ${r.error.message}\n${r.error.stack || ''}`);
  }
}
const failed = results.filter((r) => r.error);
if (O.json) console.log(JSON.stringify({ results, consoleErrors }, null, 1));
else {
  if (consoleErrors.length) console.log(`\nConsole errors (${consoleErrors.length}):\n  ` + [...new Set(consoleErrors)].slice(0, 10).join('\n  '));
  console.log(`\n${results.length} match(es), ${failed.length} with errors.`);
}
await browser.close(); await server.close();
process.exit(failed.length ? 1 : 0);

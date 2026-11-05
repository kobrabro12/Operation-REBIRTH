// DEBUG RECORDING end to end: plays a recorded training match in headless Chrome with real key presses,
// marks a bug (with a note), saves the .zip, then replays it with tools/replay/replay.mjs - which must
// match the recording at every checkpoint. If this fails after a change, recordings can no longer be
// replayed: usually match logic started using real time or a timer (AGENTS.md: Testing).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const exe = process.env.SIM_CHROME || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => fs.existsSync(p));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rebirth-rec-'));
const server = await createServer({ server: { host: '127.0.0.1', port: 0, hmr: false }, logLevel: 'silent' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
let zipFile;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, acceptDownloads: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('dialog', (d) => d.accept('the dummy flew too far'));      // MARK A BUG asks for a note
  await page.route('**/*', (r) => (r.request().url().startsWith(url) ? r.continue() : r.abort()));
  await page.goto(url);
  await page.waitForFunction(() => window.game && window.game.scene.isActive('Title'), null, { timeout: 120000 });
  // a training match vs one dummy that fights back, recording on (what training's button 8 does)
  await page.evaluate(async () => {
    const { settings } = await import('/src/settings.js');
    Object.assign(settings, { mode: 'training', dummy: 'fight', picks: ['soul-summoner', 'mr-wake'], skins: [0, 0], cpuCount: 1, cpuLevels: [1], difficulty: 1,
      stage: 'sky-sanctum', items: true, hazards: true, p1Pad: null, extraPads: [], debugRecord: true, from: 'Setup' });
    for (const s of window.game.scene.getScenes(true)) window.game.scene.stop(s.scene.key);
    window.game.scene.start('Match');
  });
  await page.waitForFunction(() => { const m = window.game.scene.getScene('Match'); return m && m.recorder && m.frame > 30; }, null, { timeout: 60000 });
  // play a little: run right, jump, attack, special, then a training reset (button 2) and more
  const hold = async (key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); };
  await hold('d', 600); await page.keyboard.press('Space'); await hold('j', 120); await page.waitForTimeout(300);
  await hold('a', 400); await hold('k', 150); await page.waitForTimeout(400);
  await hold('2', 120);                                                 // training: reset positions
  await hold('d', 300); await hold('j', 100); await page.waitForTimeout(500);
  await page.keyboard.press('8');                                       // MARK A BUG
  await page.waitForTimeout(2500);
  const dl = page.waitForEvent('download');
  await page.keyboard.press('9');                                       // SAVE RECORDING
  const download = await dl;
  zipFile = path.join(tmp, download.suggestedFilename());
  await download.saveAs(zipFile);
  assert.deepEqual(errors, [], 'no page errors while recording');
} finally { await browser.close(); await server.close(); }

assert.ok(fs.statSync(zipFile).size > 1000, 'the recording zip has content');
const r = spawnSync(process.execPath, ['tools/replay/replay.mjs', zipFile, '--out', path.join(tmp, 'replay')], { encoding: 'utf8', timeout: 240000, env: { ...process.env, SIM_CHROME: exe } });
const out = (r.stdout || '') + (r.stderr || '');
const report = JSON.parse(fs.readFileSync(path.join(tmp, 'replay', 'replay.json'), 'utf8'));
const rec = JSON.parse(spawnSync('unzip', ['-p', zipFile, 'recording.json'], { encoding: 'utf8' }).stdout || '{}');
assert.equal(r.status, 0, 'replay matched the recording\n' + out);
assert.equal(report.diverged, null, 'no divergence');
assert.equal(report.firstDifference, null, 'every traced frame (random numbers used + fighter states) matched');
assert.ok(rec.inputs.length > 5, 'button presses were recorded');
assert.ok(rec.events.some((e) => e.action === 'reset'), 'the training reset was recorded');
assert.equal(rec.marks.length, 1, 'one mark');
assert.equal(rec.marks[0].note, 'the dummy flew too far', 'the mark kept its note');
assert.ok(report.stops.some((s) => s.mark === 1 && s.picture), 'the replay pictured mark 1');
console.log(`PASS debug recorder: ${rec.frames} frames, ${rec.inputs.length} input changes, ${rec.checkpoints.length} checkpoints matched on replay, mark at frame ${rec.marks[0].frame}`);
if (!process.env.KEEP_RECORDING) fs.rmSync(tmp, { recursive: true, force: true }); else console.log('kept: ' + tmp);   // KEEP_RECORDING=1 keeps the zip and replay pictures

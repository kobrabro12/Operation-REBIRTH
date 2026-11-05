// Replays a DEBUG RECORDING (the .zip from training's "9 SAVE RECORDING", src/debug/recorder.js) frame for
// frame in headless Chrome, and reports what happened at each mark.
//
//   npm run replay -- recording.zip                    replay it all; screenshots + state at every mark
//   npm run replay -- recording.zip --at 1200,1260     also capture those frames (to zoom in on a bug)
//   npm run replay -- recording.zip --until 3          stop after mark 3
//   npm run replay -- recording.zip --out some/folder  where pictures and replay.json go
//                                                      (default recordings/replay-<zip name>/, git-ignored)
//
// It checks the replay against the recording's checkpoints (every 30 frames): if they ever differ it says
// at which frame and how - either the game changed since the recording (compare `game.commit` with
// `git log`), or something in match logic isn't repeatable (real time, timers - see AGENTS.md: Testing).
// Needs Chrome or Edge, like `npm run sim` (set SIM_CHROME if it isn't found).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : undefined; };
const zipPath = argv.find((a) => a.endsWith('.zip'));
if (!zipPath) { console.error('usage: npm run replay -- <recording.zip> [--at f1,f2] [--until markN] [--out dir]'); process.exit(2); }

/** Reads every file in a zip (stored or deflated) into a Map of name -> Buffer. */
function readZip(file) {
  const b = fs.readFileSync(file), out = new Map();
  let e = b.length - 22;
  while (e >= 0 && b.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error(file + ' is not a zip');
  let p = b.readUInt32LE(e + 16);
  for (let n = b.readUInt16LE(e + 10); n > 0; n--) {
    const method = b.readUInt16LE(p + 10), size = b.readUInt32LE(p + 20), nameLen = b.readUInt16LE(p + 28), extra = b.readUInt16LE(p + 30), comment = b.readUInt16LE(p + 32), local = b.readUInt32LE(p + 42);
    const name = b.toString('utf8', p + 46, p + 46 + nameLen);
    const start = local + 30 + b.readUInt16LE(local + 26) + b.readUInt16LE(local + 28), raw = b.subarray(start, start + size);
    out.set(name, method === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw));
    p += 46 + nameLen + extra + comment;
  }
  return out;
}

const zip = readZip(zipPath);
if (!zip.has('recording.json')) { console.error('no recording.json in ' + zipPath); process.exit(2); }
const rec = JSON.parse(zip.get('recording.json').toString('utf8'));
if (rec.format !== 'operation-rebirth-recording') { console.error('not an Operation REBIRTH recording'); process.exit(2); }
const outDir = path.resolve(opt('out') || path.join(ROOT, 'recordings', 'replay-' + path.basename(zipPath, '.zip')));
fs.mkdirSync(outDir, { recursive: true });
for (const [name, data] of zip) if (name.startsWith('shots/')) { fs.mkdirSync(path.join(outDir, 'recorded'), { recursive: true }); fs.writeFileSync(path.join(outDir, 'recorded', path.basename(name)), data); }

const untilMark = opt('until') ? +opt('until') : null;
const lastFrame = untilMark && rec.marks[untilMark - 1] ? rec.marks[untilMark - 1].frame : rec.frames;
const stops = [...new Set([...rec.marks.map((m) => m.frame), ...(opt('at') || '').split(',').filter(Boolean).map(Number)])].filter((f) => f <= lastFrame).sort((a, b) => a - b);

console.log(`recording: ${rec.startedAt}, game ${rec.game.commit}, ${rec.mode}${rec.training ? ' (training)' : ''} on ${rec.stage}, ${Math.round(rec.frames / 60)} s, ${rec.marks.length} mark(s), ${rec.errors.length} error(s)`);
console.log('fighters: ' + rec.fighters.map((f) => `${f.slot + 1} ${f.id}${f.cpu ? ' (cpu)' : ''}`).join(', '));
if (rec.soulBattle) { console.log('soul battles can be read (marks, errors, screenshots in ' + outDir + ') but not replayed yet'); process.exit(0); }

const exe = [process.env.SIM_CHROME, '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/google-chrome', '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => p && fs.existsSync(p));
if (!exe) { console.error('No Chrome/Edge found. Set SIM_CHROME to a browser executable.'); process.exit(2); }

const server = await createServer({ root: ROOT, logLevel: 'silent', server: { port: 0, strictPort: false, hmr: false } });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.route('**/*', (r) => (r.request().url().startsWith(url) ? r.continue() : r.abort()));
await page.addInitScript((storage) => {   // the player's save data, so unlocks and shop items match
  try { for (const k of Object.keys(localStorage)) if (k.startsWith('rebirth.')) localStorage.removeItem(k); for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, v); } catch (e) { /* no storage */ }
}, rec.storage || {});
const replayErrors = [];
page.on('pageerror', (e) => replayErrors.push(String(e)));
await page.goto(url);
await page.waitForFunction(() => window.game && window.game.scene.isActive('Title'), null, { timeout: 120000 });

// set up the match exactly as recorded, then drive it from the script (no real-time frames)
const setup = await page.evaluate(async (rec) => {
  const { settings, demoRequest } = await import('/src/settings.js');
  const { MatchScene } = await import('/src/scenes/MatchScene.js');
  const { seededRandom } = await import('/src/debug/rng.js');
  const { fingerprint } = await import('/src/debug/recorder.js');
  MatchScene.prototype.update = function () {};
  // the same two random streams as the recorder: seeded numbers for match logic (create, ticks,
  // training buttons), ordinary ones for everything else
  const logic = seededRandom(rec.seed), real = Math.random;
  let inLogic = false, logicCalls = 0;
  Math.random = () => { if (!inLogic) return real(); logicCalls++; if (globalThis.__randomSpy) globalThis.__randomSpy(); return logic(); };
  const create = MatchScene.prototype.create;
  MatchScene.prototype.create = function (...a) { inLogic = true; try { return create.apply(this, a); } finally { inLogic = false; } };
  const game = window.game;
  for (const s of game.scene.getScenes(true)) game.scene.stop(s.scene.key);
  await new Promise((r) => setTimeout(r, 50));
  Object.assign(settings, rec.setup, { debugRecord: false });
  demoRequest.next = false; demoRequest.settings = null;
  game.scene.start('Match');
  const t0 = performance.now();
  while (!(game.scene.isActive('Match') && game.scene.getScene('Match').fighters)) {
    if (performance.now() - t0 > 20000) return { error: 'the match never started' };
    await new Promise((r) => setTimeout(r, 20));
  }
  const m = game.scene.getScene('Match');
  game.loop.sleep();
  const got = m.fighters.map((f) => f.def.id + (f.isCpu ? ' (cpu)' : ''));
  // the human players press exactly what was recorded
  const bySlot = {};
  for (const e of rec.inputs) (bySlot[e[1]] = bySlot[e[1]] || []).push(e);
  m.fighters.forEach((f, slot) => {
    if (f.isCpu) return;
    const list = bySlot[slot] || [];
    let i = 0;
    f.ctrl.poll = function () {
      while (i < list.length && list[i][0] <= m.frame) {
        const [, , x, y, mask] = list[i++];
        this.x = x; this.y = y;
        rec.buttons.forEach((b, k) => { this.cur[b] = !!(mask & (1 << k)); });
      }
    };
  });
  const r2 = (v) => Math.round(v * 100) / 100;
  const checks = new Map(rec.checkpoints.map(([f, s]) => [f, s]));
  const trace = new Map((rec.trace || []).map(([f, n, fp]) => [f, [n, fp]]));
  const events = rec.events.slice();
  const draws = rec.draws.flatMap(([n, c]) => Array(c).fill(n));
  let d = 0, ev = 0;
  window.__replay = {
    m, diverged: null,
    state: () => m.fighters.map((f, i) => ({ slot: i + 1, id: f.def.id, x: r2(f.x), y: r2(f.y), vx: r2(f.vx), vy: r2(f.vy), percent: r2(f.percent), state: f.state, stocks: f.stocks, alive: f.alive })),
    // runs draw-steps until the match reaches `frame` (or the recording ends)
    run(frame) {
      while (d < draws.length && m.frame < frame) {
        for (let n = draws[d++]; n > 0; n--) {
          while (ev < events.length && events[ev].frame <= m.frame) { const e = events[ev++]; if (e.type === 'training' && m.training) { inLogic = true; try { m.training[e.action](); } finally { inLogic = false; } } }
          inLogic = true; try { m.tick(); } finally { inLogic = false; }
          window.__replayFrame = m.frame;
          const tr = trace.get(m.frame);
          if (tr && !this.firstDiff && (tr[0] !== logicCalls || tr[1] !== fingerprint(m))) {
            this.firstDiff = { frame: m.frame, recorded: { randomNumbersUsed: tr[0], fighters: tr[1] }, replayed: { randomNumbersUsed: logicCalls, fighters: fingerprint(m) } };
          }
          const want = checks.get(m.frame);
          if (want && !this.diverged) {
            const have = m.fighters.map((f) => [r2(f.x), r2(f.y), r2(f.vx), r2(f.vy), r2(f.percent), f.state, f.stocks]);
            if (JSON.stringify(have) !== JSON.stringify(want)) this.diverged = { frame: m.frame, recorded: want, replayed: have };
          }
        }
        m.draw();
      }
      return { frame: m.frame, done: d >= draws.length };
    },
  };
  return { fighters: got };
}, rec);
if (setup.error) { console.error('replay: ' + setup.error); await browser.close(); await server.close(); process.exit(1); }
const expected = rec.fighters.map((f) => f.id + (f.cpu ? ' (cpu)' : ''));
if (JSON.stringify(setup.fighters) !== JSON.stringify(expected)) console.log(`warning: the replay picked ${setup.fighters.join(', ')} but the recording had ${expected.join(', ')}`);

/** Draws the current frame for real and saves a screenshot of the game canvas. */
async function capture(name) {
  await page.evaluate(() => new Promise((r) => { window.game.loop.wake(); requestAnimationFrame(() => requestAnimationFrame(() => { window.game.loop.sleep(); r(); })); }));
  const file = path.join(outDir, name + '.png');
  await page.locator('canvas').first().screenshot({ path: file });
  return path.relative(ROOT, file);
}

const report = { recording: path.basename(zipPath), game: rec.game, stops: [], diverged: null, recordedErrors: rec.errors, replayErrors };
for (const f of [...stops, lastFrame]) {
  const r = await page.evaluate((f) => window.__replay.run(f), f);
  const state = await page.evaluate(() => window.__replay.state());
  const mark = rec.marks.find((m) => m.frame === f);
  const entry = { frame: r.frame, time: Math.floor(r.frame / 3600) + ':' + String(Math.floor(r.frame / 60) % 60).padStart(2, '0'), mark: mark ? mark.n : undefined, note: mark ? mark.note : undefined, state };
  if (mark || stops.includes(f)) entry.picture = await capture((mark ? 'mark-' + mark.n + '-' : '') + 'frame-' + r.frame);
  if (mark && mark.shot) entry.recordedPicture = path.relative(ROOT, path.join(outDir, 'recorded', path.basename(mark.shot)));
  report.stops.push(entry);
  if (r.done) break;
}
report.diverged = await page.evaluate(() => window.__replay.diverged);
report.firstDifference = await page.evaluate(() => window.__replay.firstDiff || null);
fs.writeFileSync(path.join(outDir, 'replay.json'), JSON.stringify(report, null, 1));

for (const s of report.stops) {
  console.log(`\n${s.mark ? 'MARK ' + s.mark : 'frame'} ${s.frame} (${s.time})${s.note ? '  "' + s.note + '"' : ''}`);
  for (const f of s.state) console.log(`  P${f.slot} ${f.id.padEnd(14)} ${f.state.padEnd(10)} x ${f.x} y ${f.y}  ${f.percent}%  stocks ${f.stocks}${f.alive ? '' : '  (out)'}`);
  if (s.picture) console.log(`  replay picture: ${s.picture}${s.recordedPicture ? '   recorded: ' + s.recordedPicture : ''}`);
}
if (rec.errors.length) console.log(`\nerrors while recording:\n` + rec.errors.map((e) => `  frame ${e.frame}: ${e.message}`).join('\n'));
if (replayErrors.length) console.log(`\nerrors while replaying:\n  ` + replayErrors.slice(0, 10).join('\n  '));
if (report.firstDifference) {
  const d = report.firstDifference;
  console.log(`\nfirst difference at frame ${d.frame}: random numbers used ${d.recorded.randomNumbersUsed} recorded vs ${d.replayed.randomNumbersUsed} replayed\n  recorded: ${d.recorded.fighters}\n  replayed: ${d.replayed.fighters}`);
}
console.log(report.diverged
  ? `\nDIVERGED at frame ${report.diverged.frame}: the replay stopped matching the recording there (game changed since ${rec.game.commit}, or something not repeatable). Later frames are not trustworthy.`
  : '\nreplay matched the recording at every checkpoint');
console.log('details: ' + path.relative(ROOT, path.join(outDir, 'replay.json')));
await browser.close(); await server.close();
process.exit(report.diverged ? 3 : 0);

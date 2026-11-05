// Runs every test in tools/tests/ (*.mjs and *.js; Python asset checks in *.py too when python3 exists),
// one at a time, and reports which passed. Browser tests use Chrome/Chromium: set SIM_CHROME to the
// browser if it isn't found. A test passes when it exits with code 0. Tests save their screenshots in
// recordings/test-output/ (git-ignored; CI keeps them as a download for a week).
//
//   npm test                     every test
//   npm test -- soul gravemoon   only tests whose file name contains one of the words
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';

const DIR = 'tools/tests', TIMEOUT = 5 * 60 * 1000;
// tests that were already failing when CI was added: they run and report, but don't fail the run
const KNOWN = (() => { try { return JSON.parse(fs.readFileSync(path.join(DIR, 'known-failing.json'), 'utf8')).tests || {}; } catch (e) { return {}; } })();
const words = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const chrome = process.env.SIM_CHROME || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].find((p) => fs.existsSync(p));
const hasPython = (() => { try { execFileSync('python3', ['--version'], { stdio: 'ignore' }); return true; } catch (e) { return false; } })();

const tests = fs.readdirSync(DIR).filter((f) => /\.(mjs|js|py)$/.test(f)).filter((f) => !words.length || words.some((w) => f.includes(w))).sort();
const results = [];
for (const f of tests) {
  const file = path.join(DIR, f), py = f.endsWith('.py');
  if (py && !hasPython) { results.push({ f, status: 'skip', why: 'no python3' }); continue; }
  const t0 = Date.now();
  const r = spawnSync(py ? 'python3' : process.execPath, [file], { encoding: 'utf8', timeout: TIMEOUT, env: { ...process.env, ...(chrome ? { SIM_CHROME: chrome } : {}) } });
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  const out = ((r.stdout || '') + (r.stderr || '')).trim().split('\n');
  let status = r.error && r.error.code === 'ETIMEDOUT' ? 'timeout' : r.status === 0 ? 'pass' : 'FAIL';
  if (KNOWN[f]) status = status === 'pass' ? 'FIXED' : 'known';
  const tail = status === 'pass' ? '' : status === 'known' ? 'already failing (known-failing.json): ' + KNOWN[f] : status === 'FIXED' ? 'passes now - remove it from tools/tests/known-failing.json' : out.filter((l) => l.trim()).slice(-12).join('\n      ');
  results.push({ f, status, secs, tail });
  console.log(`${status.padEnd(7)} ${secs.padStart(4)}s  ${f}${tail ? '\n      ' + tail : ''}`);
}
const failed = results.filter((r) => r.status === 'FAIL' || r.status === 'timeout');
const count = (s) => results.filter((r) => r.status === s).length;
console.log(`\ntests: ${count('pass')} passed, ${failed.length} failed, ${count('known')} known failures, ${count('FIXED')} known failures now passing, ${count('skip')} skipped${chrome ? '' : ' (no Chrome found: set SIM_CHROME)'}`);
process.exit(failed.length ? 1 : 0);

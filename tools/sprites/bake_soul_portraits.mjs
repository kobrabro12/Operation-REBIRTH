// Bakes the soul portrait sheets: runs the game's own makeAtlas (src/souls/portraits.js) on the full soul
// pictures in public/assets/souls/, in headless Chrome, and saves each 96 px sheet to
// public/assets/souls/baked/<key>.png - what the game loads instead of the 1254-2172 px pictures.
// Run it after changing a soul picture or SOUL_ATLASES:   npm run bake:souls
// (`npm run check:assets` reminds you when a soul picture changed without its sheet.)
// Needs Chrome or Edge, like `npm run sim` (set SIM_CHROME if it isn't found).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'public/assets/souls/baked');
const exe = [process.env.SIM_CHROME, '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/google-chrome', '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].find((p) => p && fs.existsSync(p));
if (!exe) { console.error('No Chrome/Edge found. Set SIM_CHROME to a browser executable.'); process.exit(2); }

const server = await createServer({ root: ROOT, logLevel: 'silent', server: { port: 0, hmr: false } });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route('**/*', (r) => (r.request().url().startsWith(url) ? r.continue() : r.abort()));
  await page.goto(url + '?bakeSouls=1');
  await page.waitForFunction(() => window.game && window.game.scene && window.game.scene.isActive('Title'), null, { timeout: 180000 });
  const baked = await page.evaluate(() => globalThis.__soulBake || {});
  const { SOUL_ATLASES } = await import(path.join(ROOT, 'src/souls/portraits.js')).catch(() => ({ SOUL_ATLASES: null }));
  const want = SOUL_ATLASES ? SOUL_ATLASES.map((a) => a.key) : Object.keys(baked);
  const missing = want.filter((k) => !baked[k]);
  if (errors.length || missing.length) { console.error('bake:souls - failed:', errors.slice(0, 3).join(' | '), missing.length ? 'missing ' + missing.join(', ') : ''); process.exitCode = 1; }
  fs.mkdirSync(OUT, { recursive: true });
  let total = 0;
  for (const key of want.filter((k) => baked[k])) {
    const png = Buffer.from(baked[key].split(',')[1], 'base64');
    fs.writeFileSync(path.join(OUT, key + '.png'), png);
    total += png.length;
  }
  console.log(`bake:souls - ${want.length - missing.length} sheets written to public/assets/souls/baked/ (${(total / 1e3).toFixed(0)} KB)`);
} finally { await browser.close(); await server.close(); }

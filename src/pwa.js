// OFFLINE PLAY + UPDATES: registers the service worker the build writes (dist/sw.js, tools/build/sw.mjs).
// After the first visit the game loads from the player's own device - and plays with no connection.
// When a new version has been published and downloaded in the background, `update.ready` turns true
// and the title screen shows UPDATE READY - RESTART (TitleScene); `applyUpdate()` switches to it.
// Off in the dev server, in the sim and tests (a browser driven by a script), and on the claude.ai copy.
// ?sw=1 turns it on anyway (to test a build); ?sw=0 removes it and its cache from this browser.

/** What the title screen needs to know: is a new version downloaded and waiting? */
export const update = { ready: false };
let waiting = null;

/**
 * Registers the service worker (production builds only). Safe to call once at startup.
 * @param {object} [env] - for tests: { prod, search, webdriver }
 */
export function setupOffline(env = {}) {
  const nav = globalThis.navigator;
  if (!nav || !('serviceWorker' in nav)) return;
  const search = env.search ?? globalThis.location?.search ?? '';
  if (/[?&]sw=0\b/.test(search)) { removeOffline(); return; }
  const forced = /[?&]sw=1\b/.test(search);
  const prod = env.prod ?? import.meta.env.PROD, driven = env.webdriver ?? nav.webdriver;
  if (!forced && (!prod || driven || /(^|\.)claude\.(ai|site)$|claudeusercontent/.test(globalThis.location?.hostname || ''))) return;
  nav.serviceWorker.register('./sw.js', { scope: './' }).then((reg) => {
    const found = (w) => { waiting = w; update.ready = true; };
    if (reg.waiting && nav.serviceWorker.controller) found(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && nav.serviceWorker.controller) found(w); });
    });
    setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);   // also look for a new version every half hour
  }).catch(() => { /* blocked (private mode, some embeds): the game just loads from the network */ });
  // keep the cached game from being cleared when the device runs low on space (browsers may say no)
  try { nav.storage?.persist?.(); } catch (e) { /* not supported */ }
}

/** Switches to the downloaded new version: the waiting worker takes over, then the page reloads once. */
export function applyUpdate() {
  const nav = globalThis.navigator;
  if (!waiting) { globalThis.location?.reload(); return; }
  let reloaded = false;
  nav.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; globalThis.location.reload(); } });
  waiting.postMessage('skip-waiting');
}

/** ?sw=0: unregisters the worker and deletes its cache (the game then loads from the network again). */
async function removeOffline() {
  try {
    for (const r of await globalThis.navigator.serviceWorker.getRegistrations()) await r.unregister();
    for (const k of await globalThis.caches.keys()) if (k === 'rebirth') await globalThis.caches.delete(k);
  } catch (e) { /* nothing to remove */ }
}

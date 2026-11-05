// OFFLINE PLAY: the service worker. tools/build/sw.mjs fills in FILES (every file in dist/ and a short hash
// of its contents) and writes it to dist/sw.js at build time - edit this template, never dist/sw.js.
//  - Every file the game has used is kept in one cache, under its URL plus its hash ("x.png?__h=1a2b3c"),
//    and served from there: repeat visits and offline play load nothing from the network.
//  - A file changed in a new build has a new hash, so it's fetched fresh; files that didn't change are reused.
//  - The page itself and the code are fetched when a new version installs (PRECACHE), and so are new copies of
//    any file the player already had that changed - so a player who updates can still play offline.
//  - The new version waits until the player restarts the game (src/pwa.js shows UPDATE READY on the title).
//  - Music streams with range requests: answered from the cache when the whole file is there (a 206 slice),
//    else from the network while the whole file is fetched into the cache in the background.
const FILES = /*FILES*/{};
const PRECACHE = /*PRECACHE*/[];
const CACHE = 'rebirth';
const scope = new URL(self.registration.scope);

/** The cache key for a file of this version (null if the file isn't part of the game). */
function keyFor(url) {
  const u = new URL(url, scope);
  if (u.origin !== scope.origin || !u.pathname.startsWith(scope.pathname)) return null;
  let path = decodeURIComponent(u.pathname.slice(scope.pathname.length));
  if (path === '' || path.endsWith('/')) path += 'index.html';
  const h = FILES[path];
  return h ? new URL(path + '?__h=' + h, scope).href : null;
}

/** Fetches a file for this version and stores it under its key. */
async function fetchInto(cache, url, key) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (res.ok && res.status === 200) await cache.put(key, res.clone());
  return res;
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const want = new Set(PRECACHE);
    // files the player already had that changed in this version: fetch their new copies too (offline after an update)
    for (const req of await cache.keys()) {
      const u = new URL(req.url), path = decodeURIComponent(u.pathname.slice(scope.pathname.length));
      if (FILES[path] && u.searchParams.get('__h') !== FILES[path]) want.add(path);
    }
    const list = [...want].filter((p) => FILES[p]);
    let i = 0;
    const worker = async () => {
      while (i < list.length) {
        const p = list[i++], key = keyFor(p);
        if (!(await cache.match(key))) await fetchInto(cache, new URL(p, scope).href, key).catch(() => {});
      }
    };
    await Promise.all([1, 2, 3, 4, 5, 6].map(worker));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // drop files of older versions (ones whose hash isn't this version's)
    for (const req of await cache.keys()) {
      const u = new URL(req.url), path = decodeURIComponent(u.pathname.slice(scope.pathname.length));
      if (FILES[path] !== u.searchParams.get('__h')) await cache.delete(req);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();             // the player pressed UPDATE READY - RESTART
});

/** Answers a range request (music streaming) from a whole cached file. */
async function rangeFrom(res, range) {
  const buf = await res.arrayBuffer(), m = /bytes=(\d*)-(\d*)/.exec(range || '');
  const size = buf.byteLength;
  let start = m && m[1] ? +m[1] : 0, end = m && m[2] ? +m[2] : size - 1;
  if (m && !m[1] && m[2]) { start = Math.max(0, size - +m[2]); end = size - 1; }
  end = Math.min(end, size - 1);
  if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
  return new Response(buf.slice(start, end + 1), { status: 206, headers: {
    'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream', 'Content-Range': `bytes ${start}-${end}/${size}`,
    'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const key = keyFor(req.url);
  if (!key) return;                                                     // not one of the game's files: the network as usual
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(key);
    const range = req.headers.get('range');
    if (range) {
      if (hit) return rangeFrom(hit, range);
      event.waitUntil(fetchInto(cache, req.url, key).catch(() => {}));   // the whole file, for next time / offline
      return fetch(req);
    }
    if (hit) return hit;
    try { return await fetchInto(cache, req.url, key); } catch (e) { return Response.error(); }
  })());
});

// The claude.ai copy of Operation REBIRTH keeps its art and sound in a few bundle files (packs/pNN.bin) because a
// claude.ai page can hold only 511 files. This runs before the game and serves each asset from its bundle: image,
// audio and video src, XMLHttpRequest and fetch all get a blob: URL of the right bytes.
(() => {
  const INDEX = /*INDEX*/{};
  const TYPES = { png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', json: 'application/json', ogg: 'audio/ogg', webm: 'video/webm', mp4: 'video/mp4', woff2: 'font/woff2', txt: 'text/plain', svg: 'image/svg+xml', js: 'text/javascript', css: 'text/css' };
  const base = new URL('./', document.currentScript ? document.currentScript.src : location.href);
  const realFetch = window.fetch.bind(window), packs = {}, urls = {};
  /** The packed path of a URL the game asks for, or null if it's a real file. */
  const keyOf = (u) => {
    if (typeof u !== 'string' && !(u instanceof URL)) return null;
    const s = String(u); if (s.startsWith('blob:') || s.startsWith('data:')) return null;
    let a; try { a = new URL(s, location.href); } catch { return null; }
    if (a.origin !== base.origin || !a.pathname.startsWith(base.pathname)) return null;
    const k = decodeURIComponent(a.pathname.slice(base.pathname.length));
    return INDEX[k] ? k : null;
  };
  /** A blob: URL for a packed asset (downloads its bundle the first time). */
  const blobUrl = (k) => urls[k] || (urls[k] = (async () => {
    const [p, off, len] = INDEX[k], name = 'packs/p' + String(p).padStart(2, '0') + '.wasm';
    const buf = await (packs[p] || (packs[p] = realFetch(new URL(name, base)).then((r) => { if (!r.ok) throw new Error(name + ' ' + r.status); return r.arrayBuffer(); })));
    return URL.createObjectURL(new Blob([buf.slice(off, off + len)], { type: TYPES[k.split('.').pop()] || 'application/octet-stream' }));
  })());
  window.__rebirthPack = { keyOf, blobUrl };
  // element src (images, audio, video, <source>)
  for (const C of [HTMLImageElement, HTMLMediaElement, HTMLSourceElement]) {
    const d = Object.getOwnPropertyDescriptor(C.prototype, 'src');
    Object.defineProperty(C.prototype, 'src', { configurable: true, enumerable: d.enumerable, get() { return d.get.call(this); },
      set(v) { const k = keyOf(v); if (!k) { d.set.call(this, v); return; } this.__packSrc = v; blobUrl(k).then((b) => { if (this.__packSrc === v) d.set.call(this, b); }, () => d.set.call(this, v)); } });
  }
  const setAttr = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (n, v) {
    if (String(n).toLowerCase() === 'src' && (this instanceof HTMLImageElement || this instanceof HTMLMediaElement || this instanceof HTMLSourceElement)) { this.src = v; return; }
    return setAttr.call(this, n, v);
  };
  const RealAudio = window.Audio;
  /** new Audio(url), with url served from the bundles. */
  function Audio(u) { const a = new RealAudio(); if (u !== undefined) a.src = u; return a; }
  Audio.prototype = RealAudio.prototype; window.Audio = Audio;
  // XMLHttpRequest: hold the request until the asset's blob URL is ready
  const X = XMLHttpRequest.prototype, open = X.open, send = X.send, setHeader = X.setRequestHeader;
  X.open = function (m, u, ...rest) { this.__pack = keyOf(u) ? { m, k: keyOf(u), rest, h: [] } : null; return open.call(this, m, u, ...rest); };
  X.setRequestHeader = function (n, v) { if (this.__pack) this.__pack.h.push([n, v]); return setHeader.call(this, n, v); };
  X.send = function (body) {
    const P = this.__pack; if (!P) return send.call(this, body);
    blobUrl(P.k).then((b) => { open.call(this, P.m, b, ...P.rest); for (const [n, v] of P.h) setHeader.call(this, n, v); send.call(this, body); },
      () => send.call(this, body));
  };
  window.fetch = (u, o) => { const k = keyOf(u instanceof Request ? u.url : u); return k ? blobUrl(k).then((b) => realFetch(b, o)) : realFetch(u, o); };
})();

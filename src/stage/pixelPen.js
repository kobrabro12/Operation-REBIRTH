// PixelPen - draws a code-drawn character as real pixel art, so it matches the sprite fighters (1 art pixel = 1 world
// pixel). You draw with the same calls as a Phaser Graphics (fillStyle, fillEllipse, lineBetween, fillPoints, ...)
// in world coordinates; `finish()` then crunches the frame like a sprite: hard edges (no soft alpha), every pixel
// snapped back to a colour you actually used, a 1 px outline all round, and a light rim on the top-left edges with a
// shade on the bottom-right ones. Used by SMUDGE (smudgeBossStage.js).

// how solid a soft edge pixel has to be to stay (0-255)
const KEEP = 110;
// the rim light and shade it adds (how far toward white / black)
const RIM = { light: 0.3, shade: 0.24 };

const rgb = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
const pack = (r, g, b) => (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;   // (ImageData's Uint32 view: ABGR, little-endian)
const toward = (c, t, k) => { const a = rgb(c), b = rgb(t); return pack(...a.map((v, i) => Math.round(v + (b[i] - v) * k))); };

/** A pen that turns Graphics-style drawing into crisp pixel art on a canvas texture (one image, redrawn every frame). */
export class PixelPen {
  /** A pen drawing into a w x h canvas texture `key`, shown by `this.img` (put it on the world layer yourself). */
  constructor(scene, key, w, h) {
    this.w = w; this.h = h;
    const tex = scene.textures.exists(key) ? scene.textures.get(key) : scene.textures.createCanvas(key, w, h);
    this.tex = tex;
    this.work = document.createElement('canvas'); this.work.width = w; this.work.height = h;
    this.ctx = this.work.getContext('2d', { willReadFrequently: true });
    this.img = scene.add.image(0, 0, key).setOrigin(0, 0);
    this.used = new Map(); this.snapCache = new Map(); this.rimCache = new Map();
    this.fill = 0xffffff; this.fa = 1; this.lw = 1; this.lc = 0; this.la = 1; this.budget = Infinity;
  }
  /** Starts a frame: world point (x0, y0) is the canvas's top-left (whole pixels); `budget` = how many shapes may be drawn (the stroke-by-stroke reveal). */
  begin(x0, y0, budget = Infinity) {
    const c = this.ctx; this.x0 = Math.round(x0); this.y0 = Math.round(y0); this.budget = budget;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, this.w, this.h); c.translate(-this.x0, -this.y0);
    c.lineCap = 'round'; c.lineJoin = 'round';
    this.used.clear(); this.img.setPosition(this.x0, this.y0);
  }
  /** One more shape allowed? (Counts down the reveal budget.) */
  go() { return this.budget-- > 0; }
  /** Remembers a colour as one the finished pixels may snap to. */
  use(c) { if (!this.used.has(c)) this.used.set(c, rgb(c)); return '#' + c.toString(16).padStart(6, '0'); }
  fillStyle(c, a = 1) { this.fill = c; this.fa = a; return this; }
  lineStyle(w, c, a = 1) { this.lw = w; this.lc = c; this.la = a; return this; }
  /** Fills the current path in the fill colour. */
  doFill() { const c = this.ctx; c.globalAlpha = this.fa; c.fillStyle = this.use(this.fill); c.fill(); }
  /** Strokes the current path in the line colour. */
  doStroke() { const c = this.ctx; if (this.lw <= 0) return; c.globalAlpha = this.la; c.strokeStyle = this.use(this.lc); c.lineWidth = this.lw; c.stroke(); }
  fillEllipse(x, y, w, h) { if (!this.go()) return; const c = this.ctx; c.beginPath(); c.ellipse(x, y, Math.max(0.5, w / 2), Math.max(0.5, h / 2), 0, 0, Math.PI * 2); this.doFill(); }
  fillCircle(x, y, r) { this.fillEllipse(x, y, r * 2, r * 2); }
  fillRect(x, y, w, h) { if (!this.go()) return; const c = this.ctx; c.globalAlpha = this.fa; c.fillStyle = this.use(this.fill); c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  /** Fills a polygon (an array of {x, y}). */
  fillPoints(pts) { if (!this.go() || pts.length < 3) return; const c = this.ctx; c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for (const p of pts) c.lineTo(p.x, p.y); c.closePath(); this.doFill(); }
  /** Strokes a polyline (closed: back to the start). */
  strokePoints(pts, closed) { if (!this.go() || pts.length < 2) return; const c = this.ctx; c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for (const p of pts) c.lineTo(p.x, p.y); if (closed) c.closePath(); this.doStroke(); }
  fillTriangle(x1, y1, x2, y2, x3, y3) { this.fillPoints([{ x: x1, y: y1 }, { x: x2, y: y2 }, { x: x3, y: y3 }]); }
  lineBetween(x1, y1, x2, y2) { this.strokePoints([{ x: x1, y: y1 }, { x: x2, y: y2 }]); }
  /** An arc stroked in the line colour. */
  arc(x, y, r, a0, a1) { if (!this.go()) return; const c = this.ctx; c.beginPath(); c.arc(x, y, r, a0, a1); this.doStroke(); }

  /** The nearest used colour to a blended edge pixel (cached). */
  snap(v) {
    let s = this.snapCache.get(v); if (s !== undefined) return s;
    const r = v & 255, g = (v >> 8) & 255, b = (v >> 16) & 255; let best = 0, bd = Infinity;
    for (const [, q] of this.used) { const d = (q[0] - r) ** 2 + (q[1] - g) ** 2 + (q[2] - b) ** 2; if (d < bd) { bd = d; best = pack(q[0], q[1], q[2]); } }
    if (this.snapCache.size > 20000) this.snapCache.clear();
    this.snapCache.set(v, best); return best;
  }
  /** A pixel colour pushed toward white (light) or black (shade), cached. */
  rim(v, light) {
    const key = v * 2 + (light ? 1 : 0); let s = this.rimCache.get(key); if (s !== undefined) return s;
    const c = (v & 255) << 16 | ((v >> 8) & 255) << 8 | ((v >> 16) & 255);
    s = light ? toward(c, 0xffffff, RIM.light) : toward(c, 0x000000, RIM.shade);
    if (this.rimCache.size > 20000) this.rimCache.clear();
    this.rimCache.set(key, s); return s;
  }
  /**
   * Ends the frame and shows it: hard alpha, colours snapped to the ones used (so blended edges don't make new
   * colours), a 1 px `ink` outline, the rim light and shade; `flash` turns everything but the outline white.
   */
  finish(ink, flash) {
    if (this.used.size === 0) this.use(ink);
    const W = this.w, H = this.h, img = this.ctx.getImageData(0, 0, W, H), u = new Uint32Array(img.data.buffer);
    for (let i = 0; i < u.length; i++) { const v = u[i]; if ((v >>> 24) < KEEP) u[i] = 0; else u[i] = this.snap(v & 0xffffff); }
    const inkP = pack(...rgb(ink)), white = pack(255, 255, 255), out = new Uint32Array(u);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x, v = u[i];
      if (!v) { if (u[i - 1] || u[i + 1] || u[i - W] || u[i + W]) out[i] = inkP; continue; }
      if (v === inkP) continue;
      if (flash) { out[i] = white; continue; }
      if (!u[i - W] || !u[i - 1]) out[i] = this.rim(v, true);
      else if (!u[i + W] || !u[i + 1]) out[i] = this.rim(v, false);
    }
    img.data.set(new Uint8ClampedArray(out.buffer));
    const ctx = this.tex.getContext(); ctx.clearRect(0, 0, W, H); ctx.putImageData(img, 0, 0); this.tex.refresh();
  }
}

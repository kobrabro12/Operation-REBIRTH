import {lowEffects} from '../performance.js';
// THE MENU LOOK ("bold arcade"): one kit every menu screen is built from, so the whole game reads as one thing.
//   ArcadeBg      the moving backdrop: dark base, two big slanted colour slabs drifting, speed stripes, sparks, vignette
//   titleBanner   a big slanted title plate top-left (slides in), with a small breadcrumb over it
//   panel         a slanted panel: hard drop shadow, dark body, a light top edge and the section's colour along the bottom
//   tab           a slanted label sitting on top of a panel
//   rowBar        the highlight behind the picked row in a list: a slanted colour bar with a chevron that slides in
//   hintBar       the bottom strip of controls, as key chips: [J] SELECT  [K] BACK
//   slant         the basic shape - a parallelogram leaning right
// Every screen has a section colour (ARC.sections): FIGHT red, OPTIONS blue, OTHER green, TRINKETS purple, SHOP gold...
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { settings } from '../settings.js';

export const ARC = {
  ink: 0x07060e, deep: 0x0d0b1a, panel: 0x14112a, panel2: 0x1c1838, line: 0x2c2650, edge: 0xe8e4ff, dim: 0x8a87a3,
  gold: 0xffd23f, white: 0xffffff,
  // how far a slanted shape leans (pixels across its height)
  skew: 8,
  sections: {
    fight: 0xff3b4e, options: 0x3b8bff, other: 0x2fe08a, trinkets: 0xb45cff, shop: 0xffb02e, files: 0xff6ad5,
    test: 0x7aff5a, achievements: 0xffd23f, stage: 0xff7a3b, title: 0x5ad0ff,
  },
};
export const hex = (c) => '#' + c.toString(16).padStart(6, '0');
// a colour mixed toward black (k = 0..1 how much of the colour is left)
export const shade = (c, k) => ((((c >> 16) & 255) * k) << 16) | ((((c >> 8) & 255) * k) << 8) | ((c & 255) * k);

/** The plain arcade parallelogram, whatever the menu style (the match HUD and match overlays use this). */
export function plainSlant(g, x, y, w, h, color, alpha = 1, sk = ARC.skew) {
  g.fillStyle(color, alpha);
  g.fillPoints([{ x: x + sk, y }, { x: x + w, y }, { x: x + w - sk, y: y + h }, { x, y: y + h }], true);
}

/**
 * The basic menu shape in the chosen MENU STYLE (settings.menuStyle): a parallelogram leaning right (its top edge
 * `sk` pixels right of its bottom) in BOLD ARCADE / RETRO REWIND, a longer lean in SLICK!, a rounded pill in
 * BUBBLE BLAST, a hand-sprayed wobbly one in GRAFFITI, a rectangle with a slipped slice in CORRUPTED CODE.
 */
export function slant(g, x, y, w, h, color, alpha = 1, sk = ARC.skew) {
  if (w <= 0 || h <= 0) return;
  const shape = STYLE.shape;
  if (shape === 'slant') return plainSlant(g, x, y, w, h, color, alpha, sk);
  g.fillStyle(color, alpha);
  if (shape === 'sleek') { const k = Math.min(sk * 1.7, w / 2); g.fillPoints([{ x: x + k, y }, { x: x + w, y }, { x: x + w - k, y: y + h }, { x, y: y + h }], true); return; }
  if (shape === 'round') { const r = Math.max(0, Math.min(9, h / 2 - 0.5, w / 2 - 0.5)); if (r < 1) g.fillRect(x, y, w, h); else g.fillRoundedRect(x, y, w, h, r); return; }
  if (shape === 'spray') {   // each corner nudged by a fixed amount from where it is, so the shape stays put frame to frame
    const j = (n) => ((hash(x * 3 + n, y * 7 - n) % 5) - 2) * Math.min(1, h / 12), k = sk * 1.2;
    g.fillPoints([{ x: x + k + j(1), y: y + j(2) }, { x: x + w + j(3), y: y + j(4) }, { x: x + w - k + j(5), y: y + h + j(6) }, { x: x + j(7), y: y + h + j(8) }], true);
    return;
  }
  // 'glitch': a plain block, and on bigger ones a thin slice pushed sideways
  if (h < 9 || w < 24) { g.fillRect(x, y, w, h); return; }
  const n = hash(x, y), sy = y + 2 + (n % Math.max(1, h - 6)), sh = 1 + (n % 3), off = ((n >> 4) % 9) - 4 || 3;
  g.fillRect(x, y, w, sy - y); g.fillRect(x + off, sy, w, sh); g.fillRect(x, sy + sh, w, y + h - sy - sh);
}

// a small fixed hash of two numbers (the same every frame - for wobble / glitches that don't flicker)
const hash = (a, b) => { let n = (Math.round(a) * 73856093) ^ (Math.round(b) * 19349663); n = (n ^ (n >>> 13)) * 1274126177; return (n ^ (n >>> 16)) >>> 0; };

// THE MENU STYLES (OPTIONS > MENU STYLE, saved as settings.menuStyle): the kit's colours, its basic shape and the
// look of its backdrop, panels, title plate and buttons. The match itself (HUD, banners) always stays BOLD ARCADE.
export const MENU_STYLES = [
  { id: 'arcade', name: 'BOLD ARCADE', shape: 'slant',
    pal: { ink: 0x07060e, deep: 0x0d0b1a, panel: 0x14112a, panel2: 0x1c1838, line: 0x2c2650, edge: 0xe8e4ff, dim: 0x8a87a3 } },
  // 80s VHS: a striped synthwave sun over a neon grid, scanlines, a tracking band, chrome plates
  { id: 'retro', name: 'RETRO REWIND', shape: 'slant', titleColor: '#fff0ff', titleStroke: '#2a0050', titleShadow: '#3be0ff',
    pal: { ink: 0x0c0420, deep: 0x1a0838, panel: 0x1a0a36, panel2: 0x2a1050, line: 0x4a2080, edge: 0xffe0ff, dim: 0xa080c0 } },
  // candy bubbles rising through a deep blue sea, round glossy pills
  { id: 'bubble', name: 'BUBBLE BLAST', shape: 'round', titleColor: '#ffffff', titleStroke: '#0a2a6a', titleShadow: '#ff6ad5',
    pal: { ink: 0x081838, deep: 0x0e2654, panel: 0x14306a, panel2: 0x1c3c80, line: 0x3a5aa8, edge: 0xe8f6ff, dim: 0x9ab8e0 } },
  // a brick wall under a street light: sprayed tags and drips, wobbly hand-sprayed shapes, tape on the panels
  { id: 'graffiti', name: 'GRAFFITI', shape: 'spray', titleColor: '#ffffff', titleStroke: '#000000', titleShadow: '#ff3b4e',
    pal: { ink: 0x140c0a, deep: 0x22160f, panel: 0x1c1616, panel2: 0x2c2222, line: 0x4a3a34, edge: 0xfff4e0, dim: 0xa89a8a } },
  // clean and modern: near-black, long lean, thin lines, no heavy shadows
  { id: 'slick', name: 'SLICK!', shape: 'sleek', titleColor: '#ffffff', titleStroke: '#05070c', titleShadow: '#05070c',
    pal: { ink: 0x05070c, deep: 0x0a0e18, panel: 0x0c1220, panel2: 0x141c2e, line: 0x24304a, edge: 0xffffff, dim: 0x7c8aa8 } },
  // a broken terminal: green code rain, torn scan lines, red/cyan ghosts, blocks with slipped slices
  { id: 'corrupt', name: 'CORRUPTED CODE', shape: 'glitch', titleColor: '#7aff9a', titleStroke: '#000000', titleShadow: '#002a10',
    pal: { ink: 0x000000, deep: 0x020a04, panel: 0x031008, panel2: 0x082014, line: 0x0a3a1a, edge: 0xc8ffd8, dim: 0x5aa070 } },
];
let STYLE = MENU_STYLES[0];
/** The menu style in use (one of MENU_STYLES). */
export const menuStyle = () => STYLE;
/** Switches the menu style: recolours ARC (the kit's colours every menu reads) and remembers the choice in settings. */
export function setMenuStyle(id) {
  STYLE = MENU_STYLES.find((m) => m.id === id) || MENU_STYLES[0];
  settings.menuStyle = STYLE.id;
  Object.assign(ARC, STYLE.pal);
}

/**
 * A menu panel: drop shadow, body, light top edge and the section's colour along the bottom, dressed for the
 * menu style (chrome edge + grid for RETRO REWIND, gloss for BUBBLE BLAST, drips + tape for GRAFFITI, a thin
 * frame for SLICK!, ghost outlines for CORRUPTED CODE).
 */
export function panel(g, x, y, w, h, accent, { sk = ARC.skew, fill = ARC.panel, alpha = 0.94, lit = false } = {}) {
  const id = STYLE.id;
  if (id === 'slick') {
    slant(g, x, y, w, h, fill, alpha, sk);
    g.lineStyle(1, lit ? accent : ARC.line, 1); g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    g.fillStyle(accent, 1); g.fillRect(x, y, 3, h); g.fillRect(x, y, Math.min(60, w), 1);
    g.fillStyle(ARC.edge, 0.06); g.fillRect(x + 3, y + 1, w - 4, Math.floor(h / 3));
    return;
  }
  if (id === 'corrupt') {
    slant(g, x, y, w, h, fill, alpha, sk);
    g.lineStyle(1, 0xff2a4a, 0.5); g.strokeRect(x - 1.5, y + 0.5, w, h);
    g.lineStyle(1, 0x2ae0ff, 0.5); g.strokeRect(x + 2.5, y - 0.5, w, h);
    g.lineStyle(1, lit ? accent : 0x2aff6a, 0.9); g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    g.fillStyle(accent, 1); g.fillRect(x + 1, y + h - 3, w - 2, 2);
    for (let i = 0; i < 5; i++) { const n = hash(x + i, y + w); g.fillStyle(i % 2 ? 0x2aff6a : accent, 0.5); g.fillRect(x + (n % Math.max(1, w - 30)), y + ((n >> 8) % Math.max(1, h)), 6 + (n % 24), 1); }
    return;
  }
  slant(g, x + 5, y + 5, w, h, 0x000000, 0.55, sk);
  slant(g, x, y, w, h, lit ? accent : shade(accent, 0.35), 1, sk);
  slant(g, x + 2, y + 2, w - 4, h - 5, fill, alpha, sk);
  if (id === 'bubble') {
    g.fillStyle(0xffffff, 0.07); g.fillRoundedRect(x + 6, y + 4, w - 12, Math.min(18, h / 3), 6);
    g.fillStyle(accent, 1); g.fillRoundedRect(x + 8, y + h - 5, w - 16, 3, 1);
    for (let i = 0; i < 3; i++) { g.fillStyle(0xffffff, 0.5 - i * 0.12); g.fillCircle(x + w - 16 - i * 9, y + 8 + (i % 2) * 2, 3 - i * 0.6); }
    return;
  }
  g.fillStyle(ARC.edge, 0.5); g.fillRect(x + sk + 2, y + 2, w - sk - 4, 1);
  g.fillStyle(accent, 1); g.fillRect(x + 2, y + h - 3, w - sk - 2, 3);
  if (id === 'retro') {
    for (let i = 0; i < 4; i++) { g.fillStyle([0x3be0ff, 0xffffff, 0xff6ad5, 0xb45cff][i], 0.7); g.fillRect(x + sk + 2, y + 3 + i, w - sk - 4, 1); }
    g.fillStyle(accent, 0.07);
    for (let gx = x + 14; gx < x + w - 8; gx += 16) g.fillRect(gx, y + 8, 1, h - 12);
    for (let gy = y + 16; gy < y + h - 4; gy += 16) g.fillRect(x + 4, gy, w - 10, 1);
    return;
  }
  if (id === 'graffiti') {
    for (let i = 0; i < 7; i++) {   // paint drips running off the bottom edge
      const n = hash(x + i * 31, y + h), dx = x + 8 + (n % Math.max(1, w - 20)), len = 4 + (n >> 6) % 14;
      g.fillStyle(accent, 1); g.fillRect(dx, y + h - 1, 2, len); g.fillCircle(dx + 1, y + h - 1 + len, 1.6);
    }
    g.fillStyle(0xe8dcb0, 0.75); g.fillRect(x + sk - 4, y - 3, 22, 7); g.fillRect(x + w - 26, y - 3, 22, 7);   // tape
    return;
  }
  for (let i = 0; i < 3; i++) slant(g, x + w - sk - 26 + i * 7, y + h - 9, 5, 5, accent, 0.9 - i * 0.25, 3);   // little go-faster slashes in the corner
}

// a slanted label on top of a panel (draw the text yourself at x + 10, y + 3)
export function tab(g, x, y, w, accent, on = true) {
  slant(g, x + 3, y + 3, w, 14, 0x000000, 0.5, 6);
  slant(g, x, y, w, 14, on ? accent : shade(accent, 0.45), 1, 6);
}

// the highlight behind the picked row: a colour bar that grows in, with a chevron sliding at its left
export function rowBar(g, x, y, w, h, accent, t, grow = 1) {
  const ww = Math.max(10, w * Math.min(1, grow));
  slant(g, x + 3, y + 3, ww, h, 0x000000, 0.45, 6);
  slant(g, x, y, ww, h, accent, 1, 6);
  slant(g, x, y, ww, Math.floor(h / 2), 0xffffff, 0.14, 3);
  const cx = x - 9 + Math.round(Math.sin(t * 0.25) * 2);
  g.fillStyle(ARC.white, 1); g.fillTriangle(cx, y + 2, cx, y + h - 2, cx + 5, y + h / 2);
}

/** The moving menu backdrop in the screen's colour, drawn in the menu style. Call `.update(t)` every frame. */
export class ArcadeBg {
  constructor(scene, accent, { second = null, depth = -20 } = {}) {
    this.scene = scene; this.depth = depth;
    this.g = scene.add.graphics().setDepth(depth);
    this.accent = accent; this.second = second ?? accent;
    this.sparks = Array.from({ length: 26 }, (_, i) => [((i * 7919) % 997) / 997, ((i * 104729) % 991) / 991, 0.3 + ((i * 31) % 97) / 140]);
  }
  /** Redraws the backdrop for frame t (every other frame on low effects). */
  update(t) {
    if(lowEffects()&&this.lastFrame!==undefined&&t-this.lastFrame<2&&t>=this.lastFrame)return;this.lastFrame=t;
    const g = this.g; g.clear();
    const id = STYLE.id;
    if (this.osd && id !== 'retro') { this.osd.destroy(); this.osd = null; }
    if (id === 'retro') this.retro(g, t);
    else if (id === 'bubble') this.bubble(g, t);
    else if (id === 'graffiti') this.graffiti(g, t);
    else if (id === 'slick') this.slick(g, t);
    else if (id === 'corrupt') this.corrupt(g, t);
    else this.arcade(g, t);
  }
  /** BOLD ARCADE: dark base, two big slanted colour slabs drifting, speed stripes, sparks, a dark frame. */
  arcade(g, t) {
    const W = VIEW_W, H = VIEW_H;
    g.fillStyle(ARC.ink, 1); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) { g.fillStyle(ARC.deep, 1 - i * 0.12); g.fillRect(0, H - 60 + i * 10, W, 10); }
    // two huge slanted slabs of colour, drifting
    const d = (t * 0.25) % 80;
    plainSlant(g, 380 + d * 0.5, -10, 340, H + 20, this.accent, 0.07, 160);
    plainSlant(g, 460 + d * 0.5, -10, 120, H + 20, this.second, 0.06, 160);
    plainSlant(g, -200 - d * 0.3, -10, 260, H + 20, this.accent, 0.04, 160);
    // speed stripes racing across
    for (let i = 0; i < 12; i++) {
      const s = this.sparks[i], y = 20 + s[1] * (H - 40), len = 30 + s[2] * 90, x = ((s[0] * W * 2 + t * (3 + s[2] * 6)) % (W + len * 2)) - len;
      g.fillStyle(i % 3 ? this.accent : ARC.edge, 0.06 + s[2] * 0.08); g.fillRect(x, y, len, 1);
    }
    // sparks twinkling
    for (let i = 12; i < this.sparks.length; i++) { const s = this.sparks[i], a = (Math.sin(t * 0.05 + i * 1.7) + 1) / 2; g.fillStyle(i % 2 ? this.accent : ARC.edge, 0.15 + a * 0.4); g.fillRect(s[0] * W, s[1] * H, 1 + (a > 0.8), 1 + (a > 0.8)); }
    // a dark frame at the edges
    for (let i = 0; i < 4; i++) { g.fillStyle(0x000000, 0.12); g.fillRect(0, i * 4, W, 4); g.fillRect(0, H - (i + 1) * 4, W, 4); }
  }
  /** RETRO REWIND: a dusk sky, a striped synthwave sun, a neon grid rolling toward you, scanlines, a VHS tracking band and REW / PLAY on screen. */
  retro(g, t) {
    const W = VIEW_W, H = VIEW_H, hz = 214;
    const sky = [0x0c0420, 0x14062e, 0x1e083c, 0x2c0a48, 0x3e0c50, 0x561050];
    sky.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(0, i * hz / sky.length, W, hz / sky.length + 1); });
    for (let i = 0; i < 18; i++) { const s = this.sparks[i]; g.fillStyle(0xffffff, 0.2 + 0.4 * ((Math.sin(t * 0.04 + i) + 1) / 2)); g.fillRect(s[0] * W, s[1] * 120, 1, 1); }
    const cx = 470, cy = hz - 6, r = 70, sun = [0xffe14a, 0xffb83a, 0xff7a3b, 0xff4a6a, 0xff3b9e, 0xd83ad0];
    for (let y = -r; y < 0; y += 2) {            // the sun, cut into stripes that thicken toward the horizon
      const k = (y + r) / r, gap = Math.floor(k * 4);
      if (k > 0.45 && ((y + r + Math.floor(t * 0.2)) % 9) < gap) continue;
      const hw = Math.sqrt(r * r - y * y);
      g.fillStyle(sun[Math.min(sun.length - 1, Math.floor(k * sun.length))], 1); g.fillRect(cx - hw, cy + y, hw * 2, 2);
    }
    g.fillStyle(this.accent, 0.08); g.fillCircle(cx, cy - 30, r + 30);
    for (let i = 0; i < 3; i++) { g.fillStyle([0x1a0630, 0x22083a, 0x2a0a44][i], 1); g.fillTriangle(40 + i * 160, hz, 120 + i * 160, hz - 40 - (i % 2) * 22, 220 + i * 160, hz); }   // mountains
    g.fillStyle(0x0a0218, 1); g.fillRect(0, hz, W, H - hz);
    const grid = 0xff3bd0;
    g.fillStyle(grid, 0.9); g.fillRect(0, hz, W, 1);
    for (let i = 0; i < 9; i++) {                // horizontal lines rushing toward you
      const k = ((i + (t * 0.02) % 1) / 9), y = hz + (H - hz) * k * k;
      g.fillStyle(grid, 0.25 + k * 0.6); g.fillRect(0, y, W, 1);
    }
    g.lineStyle(1, grid, 0.55);
    for (let i = -12; i <= 12; i++) g.lineBetween(W / 2 + i * 14, hz, W / 2 + i * 70, H);
    for (let y = 0; y < H; y += 3) { g.fillStyle(0x000000, 0.18); g.fillRect(0, y, W, 1); }   // scanlines
    const band = (t * 1.3) % (H + 120) - 60;   // the tracking band
    g.fillStyle(0xffffff, 0.05); g.fillRect(0, band, W, 10);
    for (let i = 0; i < 20; i++) { const n = hash(i, Math.floor(t / 3)); g.fillStyle(0xffffff, 0.25); g.fillRect(n % W, band + (n >> 9) % 10, 3 + (n % 12), 1); }
    if (!this.osd) this.osd = this.scene.add.text(VIEW_W - 60, VIEW_H - 34, '', { fontFamily: FONT, fontSize: '6px', color: '#ffffff', stroke: '#000000', strokeThickness: 2 }).setDepth(30).setAlpha(0.5);   // the VCR's on-screen display, over everything like a real one
    const sec = Math.floor(t / 60), rew = (t % 600) < 90;
    this.osd.setText((rew ? '<< REW' : 'PLAY  >') + '\n' + '0:' + String(Math.floor(sec / 60) % 60).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0'));
  }
  /** BUBBLE BLAST: a deep sea gradient, polka dots, glossy bubbles rising and wobbling, a few popping. */
  bubble(g, t) {
    const W = VIEW_W, H = VIEW_H, bands = [0x081838, 0x0a2048, 0x0e2858, 0x123068, 0x163878, 0x1a4088];
    bands.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(0, i * H / bands.length, W, H / bands.length + 1); });
    for (let y = 10; y < H; y += 24) for (let x = (y / 24 % 2) * 12 + 6; x < W; x += 24) { g.fillStyle(0xffffff, 0.035); g.fillCircle(x, y, 3); }
    const cols = [this.accent, 0x5ad0ff, 0xff6ad5, 0xffd23f, 0x7aff9a];
    for (let i = 0; i < this.sparks.length; i++) {
      const s = this.sparks[i], r = 4 + s[2] * 18, speed = 0.3 + s[2] * 0.5, span = H + r * 2 + 40;
      const y = H + r - ((s[1] * span + t * speed) % span), x = s[0] * W + Math.sin(t * 0.03 + i) * 8;
      const c = cols[i % cols.length];
      g.fillStyle(c, 0.12); g.fillCircle(x, y, r);
      g.lineStyle(1, c, 0.45); g.strokeCircle(x, y, r);
      g.fillStyle(0xffffff, 0.55); g.fillCircle(x - r * 0.4, y - r * 0.4, Math.max(1, r * 0.22));
    }
    g.fillStyle(0xffffff, 0.06); g.fillRoundedRect(-20, H - 40, W + 40, 60, 30);
  }
  /** GRAFFITI: a brick wall under a street light, old tags and drips in the screen's colours, a sprayed glow. */
  graffiti(g, t) {
    const W = VIEW_W, H = VIEW_H;
    g.fillStyle(0x1a100c, 1); g.fillRect(0, 0, W, H);
    for (let row = 0; row * 12 < H; row++) for (let x = -((row % 2) * 14); x < W; x += 28) {
      const n = hash(x, row); g.fillStyle([0x2e1a14, 0x341e16, 0x2a1812, 0x3a2219][n % 4], 1); g.fillRect(x + 1, row * 12 + 1, 26, 10);
    }
    const tags = [this.accent, this.second, 0xffd23f, 0x5ad0ff, 0xff6ad5, 0x7aff5a];
    for (let i = 0; i < 9; i++) {                // old tags: sprayed blobs with drips
      const n = hash(i * 97, 13), x = 30 + (n % (W - 60)), y = 40 + ((n >> 8) % (H - 100)), c = tags[i % tags.length];
      for (let k = 0; k < 7; k++) { const m = hash(i, k); g.fillStyle(c, 0.1); g.fillCircle(x + (m % 50) - 25, y + ((m >> 7) % 16) - 8, 6 + (m % 8)); }
      for (let k = 0; k < 3; k++) { const m = hash(k, i); g.fillStyle(c, 0.16); g.fillRect(x - 20 + (m % 40), y + 6, 1, 6 + (m % 18)); }
    }
    g.fillStyle(0xffd890, 0.05); g.fillCircle(120, -20, 180); g.fillStyle(0xffd890, 0.04); g.fillCircle(120, -20, 240);   // the street light
    const sx = (t * 2) % (W + 200) - 100;           // a fresh line being sprayed across
    for (let k = 0; k < 6; k++) { g.fillStyle(this.accent, 0.08 + k * 0.02); g.fillCircle(sx - k * 6, 300 + Math.sin((sx - k * 6) * 0.03) * 10, 5 - k * 0.5); }
    for (let i = 0; i < 4; i++) { g.fillStyle(0x000000, 0.14); g.fillRect(0, i * 4, W, 4); g.fillRect(0, H - (i + 1) * 4, W, 4); }
  }
  /** SLICK!: near-black, one wide soft band of the screen's colour sweeping slowly, a fine dot grid, thin lines gliding. */
  slick(g, t) {
    const W = VIEW_W, H = VIEW_H;
    g.fillStyle(ARC.ink, 1); g.fillRect(0, 0, W, H);
    const d = Math.sin(t * 0.006) * 60;
    for (let i = 0; i < 8; i++) plainSlant(g, 300 + d + i * 14, -10, 60, H + 20, this.accent, 0.018, 220);
    for (let y = 12; y < H; y += 16) for (let x = 12; x < W; x += 16) { g.fillStyle(0xffffff, 0.05); g.fillRect(x, y, 1, 1); }
    for (let i = 0; i < 5; i++) {
      const s = this.sparks[i], y = 30 + s[1] * (H - 60), len = 80 + s[2] * 160, x = ((s[0] * W + t * (0.6 + s[2])) % (W + len)) - len;
      g.fillStyle(i % 2 ? this.accent : 0xffffff, 0.12); g.fillRect(x, y, len, 1);
    }
    g.fillStyle(this.accent, 0.8); g.fillRect(0, H - 2, W * (0.5 + 0.5 * Math.sin(t * 0.01)), 1);
  }
  /** CORRUPTED CODE: black, falling columns of green code, torn scan lines, red/cyan glitch blocks now and then. */
  corrupt(g, t) {
    const W = VIEW_W, H = VIEW_H;
    g.fillStyle(0x000000, 1); g.fillRect(0, 0, W, H);
    for (let c = 0; c < 40; c++) {               // code rain: little pixel glyphs in columns
      const x = c * 16 + 4, speed = 1 + (hash(c, 1) % 3), head = (hash(c, 2) % H + t * speed) % (H + 120);
      for (let k = 0; k < 14; k++) {
        const y = Math.floor((head - k * 9) / 9) * 9; if (y < 0 || y > H) continue;
        const n = hash(c * 31 + k, Math.floor((t + c * 7) / 8));
        g.fillStyle(k === 0 ? 0xc8ffd8 : 0x2aff6a, k === 0 ? 0.8 : 0.4 - k * 0.025);
        for (let b = 0; b < 6; b++) if ((n >> b) & 1) g.fillRect(x + (b % 3) * 2, y + Math.floor(b / 3) * 3, 2, 2);
      }
    }
    for (let y = 0; y < H; y += 2) { g.fillStyle(0x000000, 0.25); g.fillRect(0, y, W, 1); }
    const burst = (t % 140) < 12;                  // every couple of seconds the screen tears
    const nb = burst ? 9 : 3;
    for (let i = 0; i < nb; i++) {
      const n = hash(i, Math.floor(t / 4)), y = n % H, h = 1 + (n >> 5) % (burst ? 14 : 4);
      g.fillStyle([0xff2a4a, 0x2ae0ff, 0x2aff6a, this.accent][i % 4], burst ? 0.35 : 0.15); g.fillRect(((n >> 9) % W) - 40, y, 40 + ((n >> 3) % 220), h);
    }
    for (let i = 0; i < 4; i++) { g.fillStyle(0x003a10, 0.2); g.fillRect(0, i * 4, W, 4); g.fillRect(0, H - (i + 1) * 4, W, 4); }
  }
}

/**
 * The title plate, top-left: big outlined text on a colour plate in the menu style, a breadcrumb beside it. Slides in.
 * CORRUPTED CODE adds red / cyan ghosts of the title that twitch. Returns { g, text, crumb, w, h }.
 */
export function titleBanner(scene, text, accent, { crumb = '', x = 70, y = 5, size = 15 } = {}) {
  const st = STYLE, id = st.id;
  const g = scene.add.graphics().setDepth(25);
  const look = { fontFamily: FONT, fontSize: size + 'px', color: st.titleColor || '#ffffff', stroke: st.titleStroke || '#07060e', strokeThickness: 5,
    shadow: st.titleShadow && !['#07060e', '#000000', '#05070c'].includes(st.titleShadow)   // a coloured shadow: just under the letters, or it smears them
      ? { offsetX: 2, offsetY: 2, color: st.titleShadow, fill: true, stroke: false }
      : { offsetX: 3, offsetY: 3, color: st.titleShadow || '#07060e', fill: true, stroke: true } };
  const ghosts = id === 'corrupt' ? ['#ff2a4a', '#2ae0ff'].map((c) => scene.add.text(0, 0, text, { ...look, color: c, stroke: c, strokeThickness: 1, shadow: undefined }).setDepth(25.5).setAlpha(0.6)) : [];
  const t = scene.add.text(0, 0, text, look).setDepth(26);
  const c = crumb ? scene.add.text(0, 0, crumb, { fontFamily: FONT, fontSize: '5px', color: hex(id === 'corrupt' ? 0x5aff8a : shade(accent, 0.9)) }).setDepth(26) : null;
  const w = t.width + 50, h = size + 16;   // (room for the two stripes after the text)
  let ox0 = 0;
  const draw = (ox) => {
    ox0 = ox; g.clear();
    const X = x + ox;
    if (id === 'slick') {
      slant(g, X, y, w, h, ARC.panel, 0.85, 12);
      g.fillStyle(accent, 1); g.fillRect(X, y + h - 2, w + 30, 2); g.fillRect(X - 8, y, 4, h);
      g.fillStyle(0xffffff, 0.7); g.fillRect(X + w + 34, y + h - 2, 8, 2);
    } else if (id === 'corrupt') {
      slant(g, X, y, w, h, 0x000000, 0.9, 12);
      g.lineStyle(1, 0x2aff6a, 1); g.strokeRect(X + 0.5, y + 0.5, w - 1, h - 1);
      g.fillStyle(accent, 1); g.fillRect(X + w - 22, y + 3, 6, h - 6); g.fillStyle(0x2aff6a, 1); g.fillRect(X + w - 13, y + 3, 3, h - 6);
    } else {
      slant(g, X + 6, y + 6, w, h, 0x000000, 0.6, 12);
      slant(g, X, y, w, h, accent, 1, 12);
      slant(g, X + 4, y + 3, w - 10, h - 6, shade(accent, 0.28), 1, 10);
      if (id === 'retro') for (let i = 0; i < 4; i++) slant(g, X + 4, y + 3 + (h - 6) * (0.5 + i * 0.12), w - 10, 2, [0xff6ad5, 0xffb83a, 0x3be0ff, 0xffffff][i], 0.35, 4);
      if (id === 'bubble') { g.fillStyle(0xffffff, 0.25); g.fillRoundedRect(X + 8, y + 3, w - 22, Math.floor(h / 3), 4); }
      slant(g, X + w - 30, y, 8, h, ARC.white, 0.85, 12); slant(g, X + w - 19, y, 4, h, ARC.white, 0.5, 12);
      if (id === 'graffiti') for (let i = 0; i < 5; i++) { const n = hash(i * 13, w), dx = X + 10 + (n % (w - 30)), len = 4 + (n >> 5) % 10; g.fillStyle(accent, 1); g.fillRect(dx, y + h - 1, 2, len); g.fillCircle(dx + 1, y + h - 1 + len, 1.5); }
    }
    t.setPosition(X + 14, y + (h - t.height) / 2 + 1);
    if (c) c.setPosition(X + w + (id === 'slick' ? 48 : 8), y + h / 2 - 2);
  };
  const o = { k: -1 };
  draw(-w - 40);
  scene.tweens.add({ targets: o, k: 0, duration: 260, ease: 'Back.Out', onUpdate: () => draw(o.k * (w + 40)) });
  if (id === 'bubble') scene.tweens.add({ targets: t, scaleY: 1.06, scaleX: 0.97, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  if (ghosts.length) {
    let f = 0;
    const twitch = () => {
      f++; const n = hash(f >> 2, 7), big = (f % 90) < 6;
      ghosts.forEach((gt, i) => gt.setPosition(t.x + (i ? 2 : -2) + (big ? ((n >> (i * 3)) % 7) - 3 : 0), t.y + (big && i ? 1 : 0)));
      t.setX(x + ox0 + 14 + (big && (n & 1) ? 2 : 0));
    };
    scene.events.on('update', twitch);
    t.once('destroy', () => { scene.events.off('update', twitch); ghosts.forEach((gt) => gt.destroy()); });
  }
  return { g, text: t, crumb: c, w, h };
}

// the bottom strip of controls. `str` is the old plain hint ('W/S SELECT   J / ENTER / A OPEN   K / ESC / B  BACK'):
// split on 3+ spaces into entries, and each entry into keys (the leading key-like words) and what they do
const KEYLIKE = /^([A-Z0-9]|[A-Z0-9]\/[A-Z0-9]|ENTER|ESC|SPACE|TAB|SHIFT|ARROWS|WASD|CLICK|RIGHT|START|SELECT|[<>+]|\/|Q E|X Y)$/;
export function hintBar(scene, str, accent, { y = VIEW_H - 13, depth = 24 } = {}) {
  const g = scene.add.graphics().setDepth(depth), texts = [];
  plainSlant(g, -20, y, VIEW_W + 40, 13, 0x000000, 0.72, 6);
  g.fillStyle(accent, 0.9); g.fillRect(0, y, VIEW_W, 1);
  const entries = str.split(/\s{3,}/).map((s) => s.trim()).filter(Boolean).filter((s) => s !== 'OR');
  const parts = entries.map((e) => {
    const words = e.split(/\s+/); const keys = []; let i = 0;
    while (i < words.length - 1 && KEYLIKE.test(words[i])) { if (words[i] !== '/' && words[i] !== '+') keys.push(words[i]); i++; }
    return { keys, label: words.slice(i).join(' ') };
  });
  // lay out left to right; measure first so the whole strip is centred
  const items = []; let wsum = 0;
  for (const p of parts) {
    const ks = p.keys.map((k) => scene.add.text(0, 0, k, { fontFamily: FONT, fontSize: '5px', color: '#07060e' }).setDepth(depth + 1));
    const lb = scene.add.text(0, 0, p.label, { fontFamily: FONT, fontSize: '5px', color: '#c9c4dc' }).setDepth(depth + 1);
    const w = ks.reduce((n, k) => n + k.width + 7, 0) + lb.width + 14;
    items.push({ ks, lb, w }); wsum += w; texts.push(...ks, lb);
  }
  const scale = wsum > VIEW_W - 16 ? (VIEW_W - 16) / wsum : 1;
  let x = Math.max(8, (VIEW_W - wsum * scale) / 2);
  for (const it of items) {
    for (const k of it.ks) {
      const kw = k.width * scale + 4;
      slant(g, x, y + 3, kw, 8, ARC.edge, 1, 0); g.fillStyle(accent, 1); g.fillRect(x + 1, y + 10, kw - 2, 1);
      k.setScale(scale).setPosition(x + 2, y + 4); x += kw + 3;
    }
    it.lb.setScale(scale).setPosition(x + 1, y + 4); x += it.lb.width * scale + 12 * scale;
  }
  return { g, texts };
}

// a small outlined heading for inside a panel
export function heading(scene, x, y, text, accent, size = 7) {
  return scene.add.text(x, y, text, { fontFamily: FONT, fontSize: size + 'px', color: hex(accent), stroke: '#07060e', strokeThickness: 3 });
}

// chunky pixel icons for menus, drawn around (cx, cy) with pixels `s` big. ids: files, flask, shop, trophy, dummy, pad,
// bulb, star, back, music, speaker, crt, touch, screen, hall (a columned gallery)
const ICONS = {
  boss: ['..######..', '.########.', '##..##..##', '##..##..##', '##########', '.###..###.', '..######..', '..#.##.#..', '..######..'],
  files: ['..######....', '.#......#...', '############', '#..........#', '#..######..#', '#..........#', '#..####....#', '#..........#', '############'],
  flask: ['...####...', '....##....', '....##....', '...#..#...', '..#....#..', '.#.*..*.#.', '#..****..#', '#.******.#', '##########'],
  shop: ['...####...', '..#....#..', '##########', '#........#', '#..****..#', '#..*..*..#', '#..****..#', '#........#', '##########'],
  hall: ['##########', '.########.', '.#.#..#.#.', '.#.#..#.#.', '.#.#..#.#.', '.#.#..#.#.', '.#.#..#.#.', '##########', '##########'],
  trophy: ['##########', '#.######.#', '#.######.#', '.#.####.#.', '...####...', '....##....', '....##....', '..######..', '..######..'],
  dummy: ['...####...', '...####...', '....##....', '.########.', '#...##...#', '....##....', '...####...', '...#..#...', '..##..##..'],
  pad: ['.########.', '#........#', '#.#....*.#', '###..*.*.#', '#.#....*.#', '#........#', '.###..###.', '.#......#.'],
  bulb: ['...####...', '..#....#..', '.#..**..#.', '.#.*..*.#.', '.#..**..#.', '..#....#..', '...####...', '...####...', '....##....'],
  star: ['....##....', '....##....', '...####...', '##########', '.########.', '..######..', '..##..##..', '.##....##.'],
  back: ['...#......', '..##......', '.#######..', '########..', '.#######..', '..##...#..', '...#...#..', '.......#..', '..#####...'],
  speaker: ['.....#....', '....##..#.', '#####.#..#', '#####.#.#.', '#####.#.#.', '#####.#..#', '....##..#.', '.....#....'],
  crt: ['##########', '#........#', '#.******.#', '#.******.#', '#.******.#', '#........#', '##########', '...####...'],
  touch: ['...##.....', '..#..#....', '..#..###..', '..#..#..#.', '#.#.....#.', '##.......#', '.#.......#', '..#.....#.', '...#####..'],
  screen: ['###....###', '#........#', '#........#', '..........', '..........', '#........#', '#........#', '###....###'],
};
export function pixIcon(g, id, cx, cy, s, color, alpha = 1, accent = 0xffffff) {
  const rows = ICONS[id]; if (!rows) return;
  const w = rows[0].length, h = rows.length, x0 = cx - (w * s) / 2, y0 = cy - (h * s) / 2;
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '.') return; g.fillStyle(ch === '*' ? accent : color, alpha); g.fillRect(Math.round(x0 + x * s), Math.round(y0 + y * s), s, s); }));
}

setMenuStyle(settings.menuStyle);

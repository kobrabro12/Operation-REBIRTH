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

// a parallelogram leaning right: its top edge is shifted `sk` pixels right of its bottom edge
export function slant(g, x, y, w, h, color, alpha = 1, sk = ARC.skew) {
  g.fillStyle(color, alpha);
  g.fillPoints([{ x: x + sk, y }, { x: x + w, y }, { x: x + w - sk, y: y + h }, { x, y: y + h }], true);
}

// a slanted panel: drop shadow, body, light top edge, colour along the bottom and the right
export function panel(g, x, y, w, h, accent, { sk = ARC.skew, fill = ARC.panel, alpha = 0.94, lit = false } = {}) {
  slant(g, x + 5, y + 5, w, h, 0x000000, 0.55, sk);
  slant(g, x, y, w, h, lit ? accent : shade(accent, 0.35), 1, sk);
  slant(g, x + 2, y + 2, w - 4, h - 5, fill, alpha, sk);
  g.fillStyle(ARC.edge, 0.5); g.fillRect(x + sk + 2, y + 2, w - sk - 4, 1);
  g.fillStyle(accent, 1); g.fillRect(x + 2, y + h - 3, w - sk - 2, 3);
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

// the moving backdrop
export class ArcadeBg {
  constructor(scene, accent, { second = null, depth = -20 } = {}) {
    this.g = scene.add.graphics().setDepth(depth);
    this.accent = accent; this.second = second ?? accent;
    this.sparks = Array.from({ length: 26 }, (_, i) => [((i * 7919) % 997) / 997, ((i * 104729) % 991) / 991, 0.3 + ((i * 31) % 97) / 140]);
  }
  update(t) {
    const g = this.g, W = VIEW_W, H = VIEW_H; g.clear();
    g.fillStyle(ARC.ink, 1); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) { g.fillStyle(ARC.deep, 1 - i * 0.12); g.fillRect(0, H - 60 + i * 10, W, 10); }
    // two huge slanted slabs of colour, drifting
    const d = (t * 0.25) % 80;
    slant(g, 380 + d * 0.5, -10, 340, H + 20, this.accent, 0.07, 160);
    slant(g, 460 + d * 0.5, -10, 120, H + 20, this.second, 0.06, 160);
    slant(g, -200 - d * 0.3, -10, 260, H + 20, this.accent, 0.04, 160);
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
}

// the title plate, top-left: big outlined text on a slanted colour plate, a breadcrumb over it. Slides in.
export function titleBanner(scene, text, accent, { crumb = '', x = 70, y = 5, size = 15 } = {}) {
  const g = scene.add.graphics().setDepth(25);
  const t = scene.add.text(0, 0, text, { fontFamily: FONT, fontSize: size + 'px', color: '#ffffff', stroke: '#07060e', strokeThickness: 5,
    shadow: { offsetX: 3, offsetY: 3, color: '#07060e', fill: true, stroke: true } }).setDepth(26);
  const c = crumb ? scene.add.text(0, 0, crumb, { fontFamily: FONT, fontSize: '5px', color: hex(shade(accent, 0.9)) }).setDepth(26) : null;
  const w = t.width + 34, h = size + 16;
  const draw = (ox) => {
    g.clear();
    slant(g, x + ox + 6, y + 6, w, h, 0x000000, 0.6, 12);
    slant(g, x + ox, y, w, h, accent, 1, 12);
    slant(g, x + ox + 4, y + 3, w - 10, h - 6, shade(accent, 0.28), 1, 10);
    slant(g, x + ox + w - 30, y, 8, h, ARC.white, 0.85, 12); slant(g, x + ox + w - 19, y, 4, h, ARC.white, 0.5, 12);
    t.setPosition(x + ox + 14, y + (h - t.height) / 2 + 1);
    if (c) c.setPosition(x + ox + w + 8, y + h / 2 - 2);
  };
  const o = { k: -1 };
  draw(-w - 40);
  scene.tweens.add({ targets: o, k: 0, duration: 260, ease: 'Back.Out', onUpdate: () => draw(o.k * (w + 40)) });
  return { g, text: t, crumb: c, w, h };
}

// the bottom strip of controls. `str` is the old plain hint ('W/S SELECT   J / ENTER / A OPEN   K / ESC / B  BACK'):
// split on 3+ spaces into entries, and each entry into keys (the leading key-like words) and what they do
const KEYLIKE = /^([A-Z0-9]|[A-Z0-9]\/[A-Z0-9]|ENTER|ESC|SPACE|TAB|SHIFT|ARROWS|WASD|CLICK|RIGHT|START|SELECT|[<>+]|\/|Q E|X Y)$/;
export function hintBar(scene, str, accent, { y = VIEW_H - 13, depth = 24 } = {}) {
  const g = scene.add.graphics().setDepth(depth), texts = [];
  slant(g, -20, y, VIEW_W + 40, 13, 0x000000, 0.72, 6);
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
      g.fillStyle(ARC.edge, 1); g.fillRect(x, y + 3, kw, 8); g.fillStyle(accent, 1); g.fillRect(x, y + 10, kw, 1);
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
// bulb, star, back, music, speaker, crt, touch, screen
const ICONS = {
  files: ['..######....', '.#......#...', '############', '#..........#', '#..######..#', '#..........#', '#..####....#', '#..........#', '############'],
  flask: ['...####...', '....##....', '....##....', '...#..#...', '..#....#..', '.#.*..*.#.', '#..****..#', '#.******.#', '##########'],
  shop: ['...####...', '..#....#..', '##########', '#........#', '#..****..#', '#..*..*..#', '#..****..#', '#........#', '##########'],
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

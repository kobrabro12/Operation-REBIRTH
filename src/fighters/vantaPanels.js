// VANTA's NEON PANELS - his own comic-book streak. When his combo climbs, when he lands a big hit, and when he KOs
// someone, a comic panel slams onto the top of the screen: a slanted frame in neon over halftone dots and speed lines,
// a close-up (his visor flaring, his two blades crossing, or whoever he just hit as a black silhouette cut through),
// an onomatopoeia in a starburst and a caption box. KOs without being KO'd himself build his KO STREAK: each KO plays a
// three-panel page (TARGET LOCKED -> the cut -> DELETED. / DOUBLE DELETE / ...). Screen space, over the HUD; the match
// keeps running underneath. Owned by fighterVanta.js (`this.vtPanels`), counted from vantaLanded / vantaKO.
// Everything here only draws: no Math.random (its picks come from `hash`), no effect on the match.
import { FONT } from '../config.js';
import { sfx } from '../audio/sfx.js';

export const PANELS = {
  // frames between his hits before a combo counts as over
  window: 70,
  // hits closer together than this count as one (a multi-hit move's beats)
  merge: 16,
  // a panel at these combo counts (then one every `every` hits past the last, with a `beyond` word)
  combo: [
    { at: 3, word: 'SHNK!', cap: '3-HIT CHAIN' },
    { at: 5, word: 'SLASH!!', cap: 'COMBO x5' },
    { at: 8, word: 'ZZRAK!!', cap: 'OVERDRIVE x8' },
    { at: 12, word: 'KRSSH!!!', cap: 'MAX SYNC x12' },
  ],
  every: 4, beyond: ['SYS//BREAK', 'OVERFLOW!', 'NO SIGNAL'],
  // a BIG HIT panel: base damage at least `dmg`, or knockback (before weight) at least `kb`
  big: { dmg: 11, kb: 8.5, words: ['KRAK!', 'SHING!', 'VWOOM!', 'SKRAA!', 'THOOM!'] },
  // the KO STREAK's words (KOs in a row without being KO'd); past the end it stays on the last
  ko: ['DELETED.', 'DOUBLE DELETE', 'TRIPLE DELETE', 'RAMPAGE.EXE', 'UNSTOPPABLE'],
  // a single panel's size, life (frames), how many fit along the top, its top edge; the KO page's panel size and life
  w: 168, h: 96, life: 84, slots: 3, top: 26, slant: 12,
  koW: 192, koH: 118, koLife: 150, koGap: 8, koStagger: 7,
};

const INK = 0x07060e, W = 640;
/** A repeatable 0..1 number from two integers (the panels' "random" - never Math.random). */
function hash(a, b) { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); }

/** One VANTA's comic panels: spawns, ages and draws them. */
export class NeonPanels {
  constructor(f) { this.f = f; this.m = f.match; this.list = []; this.n = 0; }

  /** His combo just reached `n` hits: a panel at the milestones. */
  combo(n, foe) {
    const C = PANELS.combo, last = C[C.length - 1];
    let hit = C.find((c) => c.at === n);
    if (!hit && n > last.at && (n - last.at) % PANELS.every === 0) {
      const B = PANELS.beyond; hit = { word: B[Math.floor((n - last.at) / PANELS.every - 1) % B.length], cap: 'COMBO x' + n };
    }
    if (!hit) return;
    const tier = C.indexOf(hit);
    this.single({ word: hit.word, cap: hit.cap, art: (this.n % 2 ? 'blades' : 'visor'), foe, size: tier >= 2 ? 24 : 16 });
    sfx('shing', 0.4, 1 + Math.max(0, tier) * 0.15);
  }

  /** A big hit on `foe` (dmg / knockback past PANELS.big): a panel with them in it, cut through. */
  big(foe) {
    const L = PANELS.big.words, word = L[Math.floor(hash(this.f.age, this.n) * L.length)];
    this.single({ word, cap: 'CRITICAL // ' + (foe.def.name || 'TARGET'), art: 'foe', foe, size: 24 });
  }

  /** He KO'd `foe` with `streak` KOs in a row: the three-panel page. */
  ko(foe, streak) {
    for (const p of this.list) p.life = Math.min(p.life, p.t + 6);                              // the page clears the row
    const K = PANELS.ko, word = K[Math.min(streak, K.length) - 1], w = PANELS.koW, h = PANELS.koH, g = PANELS.koGap;
    const x0 = (W - (3 * w + 2 * g)) / 2, name = (foe.def.name || 'TARGET').toUpperCase();
    const arts = [['visor', '...', 'TARGET LOCKED'], ['blades', 'SHNK', name + ' // CUT'], ['foe', word, 'KO STREAK x' + streak]];
    arts.forEach(([art, wd, cap], i) => this.add({ x: x0 + i * (w + g), y: PANELS.top, w, h, art, word: wd, cap, foe, size: i === 2 ? 24 : 16,
      delay: i * PANELS.koStagger, life: PANELS.koLife - i * PANELS.koStagger, page: true, last: i === 2 }));
    sfx('clang', 0.55, 0.8); sfx('shing', 0.5, 0.7);
  }

  /** A panel in the first free slot along the top (the oldest gives way when they're all taken). */
  single(o) {
    const used = new Set(this.list.filter((p) => !p.page && p.t < p.life - 10).map((p) => p.slot));
    let slot = [...Array(PANELS.slots).keys()].find((s) => !used.has(s));
    if (slot === undefined) { const old = this.list.filter((p) => !p.page).sort((a, b) => b.t - a.t)[0]; slot = old ? old.slot : 0; if (old) old.life = old.t + 4; }
    const w = PANELS.w, h = PANELS.h, gap = 12, x0 = (W - (PANELS.slots * w + (PANELS.slots - 1) * gap)) / 2;
    this.add({ ...o, slot, x: x0 + slot * (w + gap), y: PANELS.top + (slot % 2) * 6, w, h, life: PANELS.life });
  }

  /** Makes one panel's display objects (a container on the UI camera). */
  add(o) {
    const m = this.m, P = this.f.pal, seed = this.n++;
    const p = { t: 0, delay: 0, ...o, seed, colA: P.mid, colB: P.accent ?? 0xff2ad8, tilt: (hash(seed, 3) - 0.5) * 0.05, rims: [] };
    p.box = m.add.container(p.x + p.w / 2, p.y + p.h / 2).setDepth(42).setVisible(false);
    p.g = m.add.graphics(); p.box.add(p.g);
    p.fx = p.art === 'visor' ? -p.w * 0.2 : p.art === 'foe' ? -p.w * 0.16 : -p.w * 0.06;          // where the close-up sits
    if (p.art === 'foe' && p.foe && p.foe.sprite) {                                              // whoever he hit, as a silhouette
      const s = p.foe.sprite;
      p.img = m.add.image(p.fx, p.h * 0.08, s.texture.key, s.frame.name).setScale(p.page ? 1.25 : 1.05).setFlipX(s.flipX)
        .setTintMode(Phaser.TintModes.FILL).setTint(0x05040a);
      p.rims = [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dy]) => m.add.image(p.fx + dx, p.h * 0.08 + dy, s.texture.key, s.frame.name)
        .setScale(p.img.scale).setFlipX(s.flipX).setTintMode(Phaser.TintModes.FILL).setTint(p.colA));   // its neon rim
      p.box.add([...p.rims, p.img]);
    }
    p.fg = m.add.graphics(); p.box.add(p.fg);                                                    // the cut, the burst, the frame
    const hex = (c) => '#' + c.toString(16).padStart(6, '0');
    p.word = m.add.text(p.w * 0.2, -p.h * 0.2, p.word, { fontFamily: FONT, fontSize: p.size + 'px', color: '#ffffff', stroke: '#07060e', strokeThickness: 5 }).setOrigin(0.5).setAngle(-8);
    p.word.setShadow(3, 3, hex(p.colB), 0, true, true);
    p.ws = Math.min(1, (p.w * 0.56) / p.word.width);                                            // (long words shrink to fit their corner)
    p.word.x = Math.min(p.word.x, p.w / 2 - 10 - p.word.width * p.ws / 2);
    p.cap = m.add.text(-p.w / 2 + 6, p.h / 2 - 7, p.cap, { fontFamily: FONT, fontSize: '8px', color: hex(p.colA) }).setOrigin(0, 1);
    p.box.add([p.word, p.cap]);
    m.addUI(p.box);
    this.list.push(p);
    return p;
  }

  /** Ages every panel one frame and redraws it; gone ones are destroyed. */
  step() {
    for (const p of this.list) {
      p.t++;
      const tt = p.t - p.delay;
      if (tt < 0 || !p.box.scene) continue;
      this.draw(p, tt);
    }
    this.list = this.list.filter((p) => { if (p.t < p.life && p.box.scene) return true; if (p.box.scene) p.box.destroy(); return false; });
  }

  /** Clears them all (he was KO'd mid-page, or the match ended). */
  clear() { for (const p of this.list) if (p.box.scene) p.box.destroy(); this.list = []; }

  /** Draws panel p, `tt` frames after it appeared: it slams in (big, white flash), shakes, sits, then slides up and out. */
  draw(p, tt) {
    const g = p.g, fg = p.fg, { w, h, colA, colB } = p, s = PANELS.slant, left = p.life - p.delay - tt;
    const pop = Math.min(1, tt / 6), out = left < 10 ? 1 - left / 10 : 0;
    const shake = tt < 10 ? Math.sin(tt * 2.7) * (10 - tt) * 0.35 : 0;
    p.box.setVisible(true).setScale(1.35 - 0.35 * (1 - (1 - pop) ** 3)).setAlpha(Math.min(1, tt / 3) * (1 - out))
      .setPosition(p.x + w / 2 + shake, p.y + h / 2 - out * 24).setRotation(p.tilt);
    const X0 = -w / 2, Y0 = -h / 2, edge = (y) => { const k = (y - Y0) / h; return [X0 + s * (1 - k), -X0 - s * k]; };
    const poly = (d) => [{ x: X0 + s - d, y: Y0 - d }, { x: -X0 + d, y: Y0 - d }, { x: -X0 - s + d, y: -Y0 + d }, { x: X0 - d, y: -Y0 + d }];
    g.clear(); fg.clear();
    g.fillStyle(0x000000, 0.55); g.fillPoints(poly(0).map((q) => ({ x: q.x + 4, y: q.y + 4 })), true);   // drop shadow
    g.fillStyle(INK, 1); g.fillPoints(poly(0), true);
    const fx = p.fx, fy = 0;
    for (let y = Y0 + 3; y < -Y0 - 2; y += 6) {                                                 // halftone dots, big near the focus
      const [xl, xr] = edge(y);
      for (let x = xl + 3 + ((y - Y0) / 6 % 2) * 3; x < xr - 2; x += 6) {
        const d = Math.min(1, Math.hypot(x - fx, (y - fy) * 1.6) / (w * 0.6)), r = Math.round(1 + 2.6 * (1 - d));
        g.fillStyle(colA, 0.18 + 0.3 * (1 - d)); g.fillRect(Math.round(x - r / 2), Math.round(y - r / 2), r, r);
      }
    }
    for (let i = 0; i < 22; i++) {                                                              // speed lines out from the focus
      const u = (i + hash(p.seed, i) * 0.6) / 22, y = Y0 + 2 + (h - 4) * hash(p.seed + 1, i);
      const [xl, xr] = edge(y), ex = u < 0.5 ? xl + 1 : xr - 1, flick = (tt + i) % 4 < 2 ? 0.35 : 0.2;
      g.lineStyle(1, i % 3 ? colA : 0xffffff, flick); g.lineBetween(fx + (ex - fx) * 0.35, fy + (y - fy) * 0.35, ex, y);
    }
    this['art_' + p.art](p, g, fg, tt, fx, fy);
    // the starburst behind the word
    const wx = p.word.x, wy = p.word.y, br = p.word.width * p.ws * 0.62 + 6, bh = p.word.height * p.ws * 0.9 + 6, pts = [];
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, k = i % 2 ? 0.62 : 1 + 0.18 * hash(p.seed, i + 40); pts.push({ x: wx + Math.cos(a) * br * k, y: wy + Math.sin(a) * bh * k }); }
    fg.fillStyle(colB, 1); fg.fillPoints(pts, true); fg.lineStyle(2, 0x000000, 1); fg.strokePoints(pts, true);
    fg.fillStyle(0xffffff, 0.25); fg.fillPoints(pts.map((q) => ({ x: wx + (q.x - wx) * 0.55, y: wy + (q.y - wy) * 0.55 })), true);
    p.word.setScale(p.ws * (tt < 4 ? 1.6 - tt * 0.15 : 1 + 0.04 * Math.sin(tt * 0.5)));
    // the caption box
    const cw = p.cap.width + 8, cx = X0 + 2, cy = -Y0 - 18;
    fg.fillStyle(0x000000, 1); fg.fillRect(cx, cy, cw, 14); fg.lineStyle(1, colA, 1); fg.strokeRect(cx + 0.5, cy + 0.5, cw - 1, 13);
    // the frame: thick ink, a neon rim, a thin inner line in the accent
    fg.lineStyle(4, 0x000000, 1); fg.strokePoints(poly(0), true);
    fg.lineStyle(1.5, colA, 1); fg.strokePoints(poly(3), true);
    fg.lineStyle(1, colB, 0.7); fg.strokePoints(poly(-3), true);
    if (tt % 23 < 2) { const ry = Y0 + h * hash(p.seed, tt); fg.fillStyle(colB, 0.6); fg.fillRect(X0 + 4, ry, w - 8, 2); fg.fillStyle(colA, 0.6); fg.fillRect(X0 + 8, ry + 2, w - 12, 1); }   // a glitch tear
    if (tt < 3) { fg.fillStyle(0xffffff, 0.85 - tt * 0.25); fg.fillPoints(poly(0), true); }   // the impact flash as it lands
    if (p.last && left < 14 && left > 6) {                                                     // the page ends cut in two
      const k = (14 - left) / 8; fg.lineStyle(3, 0xffffff, 1 - k * 0.5); fg.lineBetween(X0 - 10, -Y0 + 6, X0 - 10 + (w + 20) * Math.min(1, k * 2), -Y0 + 6 - (h + 12) * Math.min(1, k * 2));
    }
  }

  /** Close-up: his helmet, the visor slit flaring open. */
  art_visor(p, g, fg, tt, fx, fy) {
    const hw = p.h * 0.62, hh = p.h * 0.46, open = Math.min(1, tt / 8), sl = 2 + 6 * open;
    g.fillStyle(p.colA, 1); g.fillRoundedRect(fx - hw / 2 - 2, fy - hh / 2 - 2, hw + 4, hh + 4, 14);
    g.fillStyle(0x101016, 1); g.fillRoundedRect(fx - hw / 2, fy - hh / 2, hw, hh, 12);
    g.fillStyle(0x4a4a5c, 1); g.fillRect(fx - hw * 0.34, fy - hh * 0.38, hw * 0.18, 3);         // a shine
    g.fillStyle(p.colB, 0.25); g.fillRect(fx - hw * 0.7, fy - sl - 1, hw * 1.4, sl * 2);
    g.fillStyle(p.colB, 1); g.fillRect(fx - hw * 0.42, fy - sl / 2, hw * 0.84 + 6, sl);
    g.fillStyle(0xffffff, 1); g.fillRect(fx + hw * 0.05, fy - sl / 4, hw * 0.3, Math.max(1, sl / 2));
    if (open >= 1) { const k = (tt % 30) / 30; g.fillStyle(0xffffff, 0.8 * (1 - k)); g.fillRect(fx + hw * 0.2 - 30 * k, fy - 0.5, 60 * k, 1); g.fillRect(fx + hw * 0.2 - 0.5, fy - 10 * k, 1, 20 * k); }   // the glint
  }

  /** Close-up: his two katanas crossing in an X, a glint running down each. */
  art_blades(p, g, fg, tt, fx) {
    const L = p.w * 0.3, k = Math.min(1, tt / 5);
    [[p.colA, 1], [p.colB, -1]].forEach(([c, sd], i) => {
      const ax = fx - sd * L * k, ay = p.h * 0.32, bx = fx + sd * L * 0.8 * k, by = -p.h * 0.36;
      g.lineStyle(5, 0x000000, 1); g.lineBetween(ax, ay, bx, by);
      g.lineStyle(3, c, 1); g.lineBetween(ax, ay, bx, by);
      g.lineStyle(1, 0xffffff, 1); g.lineBetween(ax + (bx - ax) * 0.1, ay + (by - ay) * 0.1, bx, by);
      g.fillStyle(0x101016, 1); g.fillRect(ax - 5, ay - 2, 10, 4); g.fillStyle(c, 1); g.fillRect(ax - 1, ay + 2, 3, 8);   // guard + hilt
      const q = ((tt + i * 9) % 26) / 26, gx = ax + (bx - ax) * q, gy = ay + (by - ay) * q, r = 5 * Math.sin(q * Math.PI);
      g.fillStyle(0xffffff, 1); g.fillRect(gx - r, gy - 0.5, r * 2, 1); g.fillRect(gx - 0.5, gy - r, 1, r * 2);
    });
    if (tt < 8) { g.fillStyle(0xffffff, 1 - tt / 8); g.fillCircle(fx, -p.h * 0.02, 10 - tt); }  // the clash where they cross
  }

  /** Close-up: whoever he hit, a black silhouette, a neon cut straight through them and sparks off it. */
  art_foe(p, g, fg, tt, fx, fy) {
    const k = Math.min(1, tt / 4), x0 = fx - p.w * 0.32, y0 = fy + p.h * 0.34, x1 = fx + p.w * 0.3, y1 = fy - p.h * 0.36;
    const ix = fx + (tt < 8 ? (8 - tt) * 0.6 : 0), iy = fy + p.h * 0.1;
    if (p.img) { p.img.setPosition(ix, iy); [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy], i) => p.rims[i].setPosition(ix + dx, iy + dy)); }
    const ex = x0 + (x1 - x0) * k, ey = y0 + (y1 - y0) * k;
    fg.lineStyle(5, p.colB, 0.5); fg.lineBetween(x0, y0, ex, ey);
    fg.lineStyle(2, 0xffffff, 1); fg.lineBetween(x0, y0, ex, ey);
    for (let i = 0; i < 6; i++) {
      const q = hash(p.seed, i + 9), sx = x0 + (x1 - x0) * q, sy = y0 + (y1 - y0) * q, d = Math.min(1, tt / 12) * 14 * (0.5 + hash(p.seed, i + 20));
      fg.fillStyle(i % 2 ? p.colA : 0xffffff, Math.max(0, 1 - tt / 24)); fg.fillRect(sx + d * (i % 2 ? 1 : -0.6), sy - d * 0.6, 2, 2);
    }
  }
}

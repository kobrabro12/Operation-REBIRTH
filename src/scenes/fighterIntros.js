// ARRIVALS: how each fighter (and each special costume) gets onto the stage during the "3, 2, 1" countdown - not a
// cutscene, just a short entrance. MatchScene makes one FighterIntros; step() runs every countdown tick, draw() runs
// after the fighters have drawn themselves (it hides them until they arrive and adds the effects). Off in training
// and in the title demo (they have no countdown).
//
// An intro is { kind, ...options }. Kinds:
//   rise    a pillar of colour rises from the ground and they rise up out of it          (color, color2, shape)
//   drop    they fall from the top of the screen and land hard: dust, a shockwave         (color, trail)
//   swarm   things swirl in from all around and gather into them                          (shape, colors, n)
//   portal  a ring opens on the ground and they come up through it                        (color, color2)
//   warp    a scan line sweeps, they flicker and glitch into place                        (color)
//   bubble  a bubble drifts down with them inside, then pops                              (color)
//   flicker darkness, a light that won't stay on - they're there in the flashes           (color)
//   bolt    a bolt of lightning strikes the spot and they're standing in it              (color)
//   iris    a spotlight opens like an old film iris                                       (color)
//   slash   two brush strokes cut across the spot and they're there                       (color)
//   shapes for swarm/rise: wisp, bat, petal, note, pixel, star, leaf, ember, bubble, drop, coin, ring
// `sfx`: [name, volume, rate] played on arrival; `pre`: one played as the intro starts.
import { sfx } from '../audio/sfx.js';
import { skinInfo } from '../fighters/skins.js';

// how long one arrival takes (frames), when in it they actually arrive (0-1), and the gap between fighters
const TIME = { dur: 72, arrive: 0.62, first: 8, gap: 14 };

// each fighter's own arrival
export const INTROS = {
  'soul-summoner': { kind: 'rise', color: 'pal', shape: 'wisp', pre: ['summon', 0.5, 0.8], sfx: ['flame', 0.6, 1] },
  'mr-wake': { kind: 'portal', color: 0x1a3a5a, color2: 0x5aa0d8, pre: ['geyser', 0.4, 0.8], sfx: ['staff', 0.5, 0.9] },
  'hero-knight': { kind: 'drop', color: 0xd8e8ff, trail: 0xbff6ff, sfx: ['shing', 0.7, 1] },
  'nu': { kind: 'drop', color: 0xc8ff5a, trail: 0xc8ff5a, notes: true, sfx: ['bighit', 0.5, 1.2] },
  'aero': { kind: 'bubble', color: 0x7ad8f0, pre: ['popup', 0.3, 1.2], sfx: ['glass', 0.5, 1.4] },
  'what-once-was': { kind: 'warp', color: 0x9affd8, pre: ['glitch', 0.5, 0.8], sfx: ['buzz', 0.4, 0.8] },
  // NIGHT WITCH glides in out of the dark, engines off, and drops to the stage
  'night-witch': { kind: 'drop', color: 0xf2e6cc, trail: 0x3a5aa0, pre: ['whoosh', 0.4, 0.5], sfx: ['clang', 0.5, 1.1] },
  'last-seen': { kind: 'flicker', color: 0xfff0c0, pre: ['buzz', 0.35, 0.6], sfx: ['curse', 0.35, 0.7] },
};

// the special costumes' own arrivals ('fighter id:COSTUME NAME')
export const SKIN_INTROS = {
  // Soul Summoner
  "soul-summoner:JACK-O'-LANTERN": { kind: 'rise', color: 0xff8a1a, color2: 0x5aff5a, shape: 'ember', sfx: ['laugh', 0.4, 1.2] },
  'soul-summoner:HIGH NOON': { kind: 'swarm', shape: 'leaf', colors: [0xc8a060, 0x8a6a3a, 0xe8d0a0], n: 22, pre: ['whoosh', 0.4, 0.6], sfx: ['clang', 0.5, 0.6] },
  'soul-summoner:ECLIPSE': { kind: 'portal', color: 0x0a0806, color2: 0xf3c358, sfx: ['limitready', 0.5, 0.8] },
  'last-seen:RED ARMY': { kind: 'drop', color: 0x726a40, trail: 0xd8201e, sfx: ['go', 0.5, 1.0] },
  'soul-summoner:OLIVE DRAB': { kind: 'drop', color: 0x6a7232, trail: 0xffb84a, sfx: ['bighit', 0.6, 0.7] },
  'soul-summoner:CELESTIAL': { kind: 'swarm', shape: 'star', colors: [0xb4d2ff, 0xffffff, 0xb07ae0], n: 22, sfx: ['glass', 0.5, 1.3] },
  'soul-summoner:AURORA': { kind: 'swarm', shape: 'ring', colors: [0x3affa8, 0x5ad0ff, 0xd85aff], n: 18, sfx: ['glass', 0.5, 0.9] },
  'soul-summoner:THE HOLLOW KING': { kind: 'rise', color: 0x3a1a5a, color2: 0xf3c358, shape: 'star', sfx: ['roar', 0.4, 1.3] },
  'soul-summoner:1-BIT': { kind: 'warp', color: 0xffffff },
  // Mr Wake
  'mr-wake:ROSEBUD': { kind: 'swarm', shape: 'petal', colors: [0xff5a8a, 0xd8203a, 0xffb0c8], n: 26, sfx: ['petal', 0.6, 1] },
  'mr-wake:NEON': { kind: 'warp', color: 0xff4fd8, sfx: ['laser', 0.4, 1.4] },
  'mr-wake:CREATURE FEATURE': { kind: 'bolt', color: 0xffffff, sfx: ['thunder', 0.6, 1] },
  'mr-wake:VAMPIRE': { kind: 'swarm', shape: 'bat', colors: [0x1a0a14, 0x5a0a1a, 0x2a1a2a], n: 20, pre: ['bats', 0.5, 1], sfx: ['curse', 0.4, 1.2] },
  'mr-wake:PLAGUE DOCTOR': { kind: 'portal', color: 0x1a2a1e, color2: 0x5aff6a, sfx: ['curse', 0.4, 0.7] },
  'mr-wake:SAKURA': { kind: 'swarm', shape: 'petal', colors: [0xffb8d0, 0xffd8e8, 0xff8ab0], n: 26, sfx: ['petal', 0.6, 1.2] },
  'mr-wake:TIDEFATHER': { kind: 'portal', color: 0x0a2a4a, color2: 0x5ae8ff, sfx: ['geyser', 0.6, 0.7] },
  // Lacy
  'hero-knight:SAMURAI': { kind: 'slash', color: 0x1a1414, sfx: ['slash', 0.7, 0.9] },
  'hero-knight:AKATSUKI': { kind: 'swarm', shape: 'leaf', colors: [0xe8202a, 0x1a1414, 0xffffff], n: 20, sfx: ['smoke', 0.5, 1] },
  'hero-knight:16-BIT HERO': { kind: 'warp', color: 0x5aff8a, pre: ['menu', 0.6, 1.4], sfx: ['ding', 0.5, 1] },
  'hero-knight:OBSIDIAN': { kind: 'rise', color: 0xff5a1a, color2: 0x2a1a1a, shape: 'ember', sfx: ['rumble', 0.6, 0.9] },
  'hero-knight:WILDWOOD': { kind: 'swarm', shape: 'leaf', colors: [0x8aff6a, 0x3aa84a, 0xe8ff9a], n: 24, sfx: ['petal', 0.6, 0.8] },
  'hero-knight:CYBERBLADE': { kind: 'warp', color: 0x3affff, pre: ['glitch', 0.4, 1.2], sfx: ['laser', 0.4, 1.8] },
  'hero-knight:SERAPH': { kind: 'drop', color: 0xfff4c0, trail: 0xffffff, feathers: true, sfx: ['limitready', 0.5, 1.2] },
  'hero-knight:SOLID GOLD': { kind: 'swarm', shape: 'coin', colors: [0xf3c358, 0xffe48a, 0xc8962a], n: 18, sfx: ['ding', 0.6, 1.2] },
  // NU
  'nu:INFERNO': { kind: 'rise', color: 0xff5a1a, color2: 0xffd23a, shape: 'ember', sfx: ['flame', 0.6, 0.8] },
  'nu:BLOCK BOSS': { kind: 'drop', color: 0xffffff, trail: 0xf3c358, notes: true, sfx: ['bighit', 0.5, 1.1] },
  'nu:BONEZ': { kind: 'rise', color: 0x5aff5a, color2: 0xe8e8d8, shape: 'wisp', sfx: ['laugh', 0.4, 0.8] },
  'nu:HOMEROOM': { kind: 'swarm', shape: 'note', colors: [0xffffff, 0xf3c358, 0x5ad0ff], n: 16, sfx: ['ding', 0.5, 0.9] },
  'nu:SILENT FILM': { kind: 'iris', color: 0xf4efe0, sfx: ['menu', 0.5, 0.6] },
  'nu:GLAM': { kind: 'drop', color: 0xff4ab8, trail: 0xffd23a, notes: true, sfx: ['ding', 0.5, 1.4] },
  'nu:VAPORWAVE': { kind: 'warp', color: 0xff8ad8, sfx: ['glitch', 0.4, 1.6] },
  // AERO
  'aero:KOI': { kind: 'bubble', color: 0xff8a2a, sfx: ['glass', 0.5, 1.2] },
  'aero:FORECAST': { kind: 'bolt', color: 0xfff4a8, sfx: ['thunder', 0.5, 1.3] },
  'aero:MIDNIGHT': { kind: 'bubble', color: 0x7a96ff, sfx: ['glass', 0.5, 0.7] },
  'aero:SUNSET': { kind: 'bubble', color: 0xffb84a, sfx: ['glass', 0.5, 1] },
  // WHAT ONCE WAS
  'what-once-was:FRUTIGER': { kind: 'bubble', color: 0x7ad8f0, sfx: ['glass', 0.5, 1.2] },
  'what-once-was:ROOT ACCESS': { kind: 'warp', color: 0x5aff6a, pre: ['glitch', 0.5, 1], sfx: ['laser', 0.3, 0.8] },
  'what-once-was:RONIN': { kind: 'slash', color: 0x1a1414, sfx: ['slash', 0.6, 1] },
  'what-once-was:DIAL-UP': { kind: 'warp', color: 0x5ad0ff, pre: ['dialup', 0.3, 1.2], sfx: ['buzz', 0.4, 1.2] },
  // ROSEMARY
  'last-seen:DEEP SEA': { kind: 'bubble', color: 0x2a6a8a, lure: true, sfx: ['geyser', 0.4, 0.6] },
  'last-seen:AFTER HOURS': { kind: 'flicker', color: 0xff4fd8, rave: true, sfx: ['laser', 0.4, 1] },
  'last-seen:GRAND OPENING': { kind: 'iris', color: 0xffd23a, sfx: ['ding', 0.5, 0.8] },
  'last-seen:LAKEBED': { kind: 'portal', color: 0x1a2a2a, color2: 0x5a8a7a, sfx: ['geyser', 0.4, 0.5] },
};

export class FighterIntros {
  constructor(m) {
    this.m = m; this.t = 0; this.done = false;
    this.g = m.add.graphics().setDepth(6); m.addWorld(this.g);        // effects in the world, over the fighters
    this.list = m.fighters.map((f, i) => {
      const sk = skinInfo(f.def.id, f.skin);
      const I = SKIN_INTROS[f.def.id + ':' + sk.name] || INTROS[f.def.id] || INTROS['soul-summoner'];
      const col = I.color === 'pal' ? (f.pal && f.pal.light) || f.fxColor : I.color;
      return { f, I, col, col2: I.color2 ?? (f.pal && f.pal.core) ?? 0xffffff, start: TIME.first + i * TIME.gap, x: f.x, y: f.y, parts: [], arrived: false, played: false };
    });
  }
  // 0 before it starts, 0..1 through it, >1 when over
  prog(e) { return (this.t - e.start) / TIME.dur; }

  step() {
    if (this.done) return;
    this.t++;
    for (const e of this.list) {
      const p = this.prog(e);
      if (p >= 0 && !e.played) { e.played = true; if (e.I.pre) sfx(...e.I.pre); }
      if (p >= TIME.arrive && !e.arrived) this.arrive(e);
      for (const q of e.parts) { q.x += q.vx; q.y += q.vy; q.vy += q.grav || 0; q.vx *= q.drag || 1; q.vy *= q.drag || 1; q.life--; }
      e.parts = e.parts.filter((q) => q.life > 0);
    }
    if (this.list.every((e) => this.prog(e) > 1.2 && !e.parts.length)) this.finish();
  }
  finish() {
    this.done = true; this.g.clear();
    for (const e of this.list) this.show(e.f, 1, 0, 1);
  }
  // the moment they're here: a flash, a burst, a sound
  arrive(e) {
    e.arrived = true;
    const { f, I } = e, R = Math.random;
    f.flash = 3;
    if (I.sfx) sfx(...I.sfx);
    const burst = (n, cols, sp = 3, shape = 'pixel', grav = 0.05) => { for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, v = sp * (0.4 + R()); e.parts.push({ shape, x: e.x, y: e.y - 26, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 26 + R() * 16, max: 40, color: cols[i % cols.length], grav, drag: 0.95 }); } };
    if (I.kind === 'drop') {
      this.m.shake(5, 6);
      for (let i = 0; i < 16; i++) { const s = i % 2 ? 1 : -1; e.parts.push({ shape: 'dust', x: e.x + s * (4 + R() * 10), y: e.y - 2, vx: s * (1.5 + R() * 3), vy: -R() * 1.2, life: 24 + R() * 10, max: 34, color: 0xd8d0c0, drag: 0.92 }); }
      e.ring = { t: 0, color: e.col };
      if (I.notes) burst(8, [e.col, 0xffffff], 2.5, 'note', -0.02);
      if (I.feathers) burst(14, [0xffffff, 0xfff4c0], 2.2, 'petal', 0.02);
    } else if (I.kind === 'bubble') { burst(16, [e.col, 0xffffff], 2.6, 'drop', 0.12); }
    else if (I.kind === 'swarm') burst(10, I.colors || [e.col], 2.4, I.shape, 0.03);
    else burst(12, [e.col, e.col2, 0xffffff], 2.4, I.shape || 'pixel', 0.03);
  }

  // show/hide the fighter and everything that's part of them: vis 0..1, dy = pixels lower than normal, sc = scale
  show(f, vis, dy, sc) {
    const objs = [f.sprite, f.fx, f.fxBack, f.tag, f.headImg, f.scrImg, f.faceImg, ...(f.ghosts || [])].filter(Boolean);
    for (const o of objs) { if (o.setAlpha) o.setAlpha(o === f.tag ? Math.min(1, vis) : vis); }
    if (dy) for (const o of [f.sprite, f.headImg, f.scrImg, f.faceImg]) if (o) o.y += dy;
    if (sc !== 1) f.sprite.setScale(f.sprite.scaleX * sc, f.sprite.scaleY * sc);
  }

  draw() {
    if (this.done) return;
    const g = this.g, R = Math.random; g.clear();
    for (const e of this.list) {
      const p = this.prog(e), { f, I } = e, A = TIME.arrive, x = e.x, y = e.y, c = e.col, c2 = e.col2;
      const pre = Math.max(0, Math.min(1, p / A)), post = Math.max(0, (p - A) / (1 - A));   // before / after the arrival, 0..1
      let vis = p < A ? 0 : 1, dy = 0, sc = 1;
      if (p > 0 && p <= 1.05) switch (I.kind) {
        case 'rise': {                                                     // a pillar of colour, they come up out of it
          const hgt = 100 * Math.min(1, pre * 1.4) * (p > A ? Math.max(0, 1 - post * 1.4) : 1), w = 26 + 6 * Math.sin(this.t * 0.4);
          for (let i = 0; i < 4; i++) { g.fillStyle(i % 2 ? c2 : c, 0.18 + i * 0.12); g.fillRect(x - w / 2 + i * 3, y - hgt, w - i * 6, hgt); }
          g.fillStyle(0xffffff, 0.5 * (p < A ? pre : 1 - post)); g.fillEllipse(x, y, 40 + pre * 10, 8);
          if (this.t % 2 === 0 && p < A + 0.1) e.parts.push({ shape: I.shape || 'wisp', x: x + (R() - 0.5) * 24, y: y - R() * 20, vx: (R() - 0.5) * 0.6, vy: -1.5 - R() * 2, life: 30, max: 30, color: R() < 0.6 ? c : c2 });
          if (p >= A) { vis = Math.min(1, post * 4); dy = Math.max(0, 30 * (1 - post * 3)); }
          break;
        }
        case 'drop': {                                                     // falls from the sky, slams down
          if (p < A) { vis = 1; dy = -380 * Math.pow(1 - pre, 2); for (let i = 1; i < 5; i++) { g.fillStyle(I.trail ?? c, 0.18 - i * 0.03); g.fillRect(x - 8, y + dy - 50 - i * 18, 16, 18); } if (pre > 0.6) { g.fillStyle(0x000000, 0.25 * pre); g.fillEllipse(x, y, 30 * pre, 5); } }
          else sc = 1 + Math.max(0, 0.18 * (1 - post * 5)) * (post < 0.1 ? -1 : 1);
          if (e.ring) { e.ring.t++; const r = e.ring.t * 5; g.lineStyle(3, e.ring.color, Math.max(0, 1 - e.ring.t / 16)); g.strokeEllipse(x, y, r * 2, r * 0.45); }
          break;
        }
        case 'swarm': {                                                    // things swirl in and gather into them
          const n = I.n || 18, cols = I.colors || [c];
          if (p < A) for (let i = 0; i < n; i++) {
            const a = i / n * Math.PI * 2 + pre * 5 + i, r = 150 * (1 - pre) + 6, px = x + Math.cos(a) * r, py = y - 26 + Math.sin(a) * r * 0.6;
            this.shape(g, I.shape, px, py, cols[i % cols.length], 1, this.t + i * 7);
          }
          if (p >= A) { vis = Math.min(1, post * 6); sc = 1 + Math.max(0, 0.25 * (1 - post * 4)); }
          break;
        }
        case 'portal': {                                                   // a ring opens on the ground, they come up through it
          const open = p < A ? pre : Math.max(0, 1 - post * 1.6), w = 70 * open;
          g.fillStyle(c, 0.9); g.fillEllipse(x, y, w, w * 0.28); g.lineStyle(2, c2, 1); g.strokeEllipse(x, y, w, w * 0.28);
          for (let i = 1; i < 3; i++) { g.lineStyle(1, c2, 0.5 / i); g.strokeEllipse(x, y, w + i * 10 * ((this.t >> 2) % 3), (w + i * 10) * 0.28); }
          if (p >= A) { vis = Math.min(1, post * 5); dy = Math.max(0, 50 * (1 - post * 2.5)); }
          break;
        }
        case 'warp': {                                                     // a scan line sweeps; they flicker and glitch in
          const sy = y - 70 + pre * 70;
          if (p < A) { g.fillStyle(c, 0.8); g.fillRect(x - 24, sy, 48, 2); g.fillStyle(c, 0.15); g.fillRect(x - 24, sy, 48, y - sy); for (let i = 0; i < 6; i++) { g.fillStyle(c, R()); g.fillRect(x - 22 + R() * 44, sy + R() * (y - sy), 3, 3); } vis = pre > 0.4 && R() < pre * 0.5 ? 0.6 : 0; }
          else { vis = post < 0.25 ? (R() < 0.7 ? 1 : 0.3) : 1; if (post < 0.25) dy = 0, f.sprite.x += Math.round((R() - 0.5) * 6); }
          break;
        }
        case 'bubble': {                                                   // a bubble floats down with them inside, then pops
          const by = y - 30 - 160 * Math.pow(1 - pre, 2);
          if (p < A) { vis = 0.85; dy = by - (y - 30); g.fillStyle(c, 0.18); g.fillCircle(x, by, 34); g.lineStyle(2, 0xffffff, 0.8); g.strokeCircle(x, by, 34); g.lineStyle(2, c, 0.7); g.strokeCircle(x, by, 32); g.fillStyle(0xffffff, 0.8); g.fillEllipse(x - 14, by - 16, 10, 5); if (I.lure) { g.fillStyle(0xfff4a8, 0.6 + 0.4 * Math.sin(this.t * 0.3)); g.fillCircle(x + 20, by - 40, 4); g.lineStyle(1, 0x2a4a5a, 1); g.lineBetween(x + 6, by - 30, x + 20, by - 40); } }
          break;
        }
        case 'flicker': {                                                  // the lights won't stay on; they're there in the flashes
          const on = p >= A ? (post > 0.3 || (this.t >> 1) % 3 !== 0) : (R() < pre * 0.35);
          const dark = p < A ? 0.55 : 0.55 * Math.max(0, 1 - post * 2);
          for (let i = 0; i < 12; i++) { g.fillStyle(0x000000, dark * 0.1); g.fillCircle(x, y - 30, 26 + i * 4); }   // soft-edged gloom
          if (on) { g.fillStyle(c, 0.22); g.fillTriangle(x, y - 120, x - 34, y, x + 34, y); g.fillStyle(c, 0.12); g.fillEllipse(x, y, 70, 10); }
          if (I.rave && on) for (let i = 0; i < 3; i++) { g.fillStyle([0xff4fd8, 0x5ad0ff, 0x7aff8a][(i + (this.t >> 3)) % 3], 0.25); g.fillTriangle(x + (i - 1) * 60, y - 140, x - 20 + (i - 1) * 10, y, x + 20 + (i - 1) * 10, y); }
          vis = on ? 1 : 0;
          break;
        }
        case 'bolt': {                                                     // lightning hits the spot
          if (p < A && pre > 0.75) { g.lineStyle(3, c, 1); let bx = x, byy = y - 300; for (let i = 0; i < 9; i++) { const nx = x + (R() - 0.5) * 30 * (1 - i / 9), ny = byy + 300 / 9; g.lineBetween(bx, byy, nx, ny); bx = nx; byy = ny; } }
          if (p >= A && post < 0.2) { g.fillStyle(c, 0.6 * (1 - post * 5)); g.fillRect(x - 400, y - 400, 800, 500); }
          if (p >= A) { g.fillStyle(0x000000, 0.4 * Math.max(0, 1 - post * 2)); g.fillEllipse(x, y, 40, 6); }
          break;
        }
        case 'iris': {                                                     // an old-film iris opening on them
          const r = p < A ? 0 : Math.min(60, post * 140);
          if (p >= A - 0.15) { g.fillStyle(c, 0.25 * Math.max(0, 1 - post)); g.fillCircle(x, y - 30, r + 4); g.lineStyle(4, 0x1a1414, Math.max(0, 1 - post)); g.strokeCircle(x, y - 30, r + 6); }
          if (p >= A) vis = Math.min(1, post * 3);
          break;
        }
        case 'slash': {                                                    // two brush strokes cross the spot
          if (p > A - 0.25) {
            const k = Math.min(1, (p - (A - 0.25)) / 0.12), fade = p >= A ? Math.max(0, 1 - post * 1.6) : 1;
            for (const [s, ofs] of [[1, 0], [-1, 6]]) { g.lineStyle(5, c, 0.9 * fade); g.lineBetween(x - 50 * s, y - 70 + ofs, x - 50 * s + 100 * s * k, y - 70 + ofs + 60 * k); g.lineStyle(2, 0xe8202a, 0.6 * fade); g.lineBetween(x - 46 * s, y - 66 + ofs, x - 46 * s + 92 * s * k, y - 66 + ofs + 55 * k); }
          }
          if (p >= A) vis = Math.min(1, post * 6);
          break;
        }
      }
      if (p <= 0) vis = 0;
      if (p > 1.05) { vis = 1; dy = 0; sc = 1; }
      this.show(f, vis, dy, sc);
      // the arrival flash and the burst bits
      if (p >= A && post < 0.12) { g.fillStyle(0xffffff, 0.7 * (1 - post / 0.12)); g.fillCircle(x, y - 28, 30 + post * 120); }
      for (const q of e.parts) this.shape(g, q.shape, q.x, q.y, q.color, Math.min(1, q.life / ((q.max || 30) * 0.5)), this.t + q.x);
    }
  }

  // one little thing: a soul wisp, a bat, a petal, a note...
  shape(g, s, x, y, col, a, t) {
    g.fillStyle(col, a);
    switch (s) {
      case 'wisp': case 'ember': g.fillCircle(x, y, s === 'ember' ? 2 : 3); g.fillStyle(0xffffff, a * 0.6); g.fillRect(x - 1, y - 1, 1, 1); break;
      case 'bat': { const fl = (t >> 2) % 2; g.fillTriangle(x - 7, y - (fl ? 3 : -1), x, y, x - 2, y + 2); g.fillTriangle(x + 7, y - (fl ? 3 : -1), x, y, x + 2, y + 2); g.fillRect(x - 1, y - 1, 3, 3); break; }
      case 'petal': case 'leaf': g.fillEllipse(x, y, s === 'leaf' ? 6 : 5, 3); break;
      case 'note': g.fillCircle(x, y + 2, 2); g.fillRect(x + 1, y - 5, 1, 7); g.fillRect(x + 1, y - 5, 3, 1); break;
      case 'star': g.fillRect(x - 3, y, 7, 1); g.fillRect(x, y - 3, 1, 7); break;
      case 'coin': { const w = 3 + 2 * Math.abs(Math.cos(t * 0.2)); g.fillEllipse(x, y, w, 6); break; }
      case 'ring': g.lineStyle(1, col, a); g.strokeCircle(x, y, 3); break;
      case 'bubble': g.lineStyle(1, col, a); g.strokeCircle(x, y, 3); break;
      case 'drop': g.fillCircle(x, y, 2); break;
      case 'dust': g.fillStyle(col, a * 0.7); g.fillCircle(x, y, 3); break;
      default: g.fillRect(x - 1, y - 1, 3, 3);
    }
  }
  cleanup() { this.g.destroy(); }
}

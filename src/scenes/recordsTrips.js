// THE ARCHIVIST's TRINKET TRIPS (RecordsScene; methods copied onto its prototype at the bottom of RecordsScene.js -
// a name may only exist once). Leave her alone for TRIP.quiet frames and she snaps her fingers: a portal opens beside
// her in the style of an old video game (`drawGate`), it swallows the room (a white flash) and she's standing at her
// desk inside that game's world (`world_<kind>`: falling blocks, a neon maze, a marching sky, brick hills, a green
// field, a court, duck season, a sunset circuit, a rock field, a text cave - our own homages, no real game's art).
// She looks round, reaches out and grabs the iconic thing hanging in the air (the world reacts), admires it, snaps
// again - flash, home - and it flies to the little shelf on her wall (`drawShelf`). Click a trinket for its card
// (`openTrinket`: the trinket big in a glass case, where it came from, its lore). She can't be interrupted while
// she's away (`routine` = 'trip', ONE SEC!). Data: src/data/trinkets.js. Animations `warp` / `grab` / `snapback`.
import { FONT, VIEW_W, VIEW_H } from '../config.js';
import { sfx } from '../audio/sfx.js';
import { RECORDS_FRAMES as RF } from './recordsFrames.js';
import { TRINKETS, trinketsOwned, addTrinket, trinketSeen, markTrinketSeen, trinketById } from '../data/trinkets.js';

// quiet frames (no clicks, keys or pad) before she goes; frames after one trip before the next can start
export const TRIP = { quiet: 60 * 30, every: 60 * 40, first: 60 * 20 };
// the shelf on her wall: left edge, the board's top, slot width; the art's scale on it
const SHELF = { x: 440, y: 206, slot: 19.6, scale: 2 };
// the gate before it swallows the room: radii (screen px), how many frames it takes to open / swallow / shut
const GATE = { rx: 46, ry: 54, open: 16, swallow: 14, shut: 20 };
const BLOCK_COLS = [0x40e0f0, 0xf0e040, 0xb050f0, 0x50e050, 0xf04040, 0x4060f0, 0xf09030];
const SHAPES = [[[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0], [1, 1]], [[1, 0], [2, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [1, 1], [2, 1]], [[0, 0], [0, 1], [1, 1], [2, 1]], [[2, 0], [0, 1], [1, 1], [2, 1]]];
// the alien of THE MARCHING SKY (two frames) - our own: a one-eyed dome on little legs
const ALIEN = [['...xxxxx...', '..xxxxxxx..', '.xxwwwwwxx.', '.xxwwoowxx.', '.xxwwwwwxx.', '..xxxxxxx..', '.x..x.x..x.', 'x..x...x..x'],
  ['...xxxxx...', '..xxxxxxx..', '.xxwwwwwxx.', '.xxwoowwxx.', '.xxwwwwwxx.', '..xxxxxxx..', '.x..x.x..x.', '..x.x.x.x..']];
// a flying duck (two frames), facing right
const DUCK = [['.......gg.', '......ggwy', '..bbb.ggg.', '.bbbbbbb..', 'bbBBBBbb..', '.bbbbbb...'], ['.......gg.', '..bb..ggwy', '.bBBb.ggg.', '.bbbbbbb..', 'bbbbbbbb..', '.bbbbbb...']];
// 3x5 digits for THE COURT's score
const DIGITS = { 0: '111101101101111', 3: '111001111001111', 7: '111001001001001' };
const TEXT_CAVE = ['YOU ARE IN A DAMP CAVE. WATER DRIPS', 'SOMEWHERE IN THE DARK.', '', 'A BRASS LANTERN HANGS IN THE AIR', 'HERE, GLOWING. NOBODY IS HOLDING IT.', '', 'EXITS: NORTH, DOWN, AND BACK.'];
const TEXT_TAKEN = ['> TAKE LANTERN', 'TAKEN.', '', 'IT IS NOW VERY DARK IN HERE.'];

/** A tiny repeatable random stream (for a world's fixed layout). */
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/** THE TRINKET TRIPS (see the top of the file). */
export class RecordsTrips {
  /** Sets up the shelf, the world layer and the trip timer. */
  initTrips() {
    this.trip = null; this.quietAt = 0; this.nextTrip = TRIP.first;
    this.shelfG = this.add.graphics().setDepth(0.6);
    this.shelfT = this.add.text(SHELF.x - 2, SHELF.y + 4, '', { fontFamily: FONT, fontSize: '5px', color: '#f4e6c4' }).setDepth(0.65);
    this.worldG = this.add.graphics().setDepth(0.7);
    this.gateG = this.add.graphics().setDepth(1.6);
    this.itemG = this.add.graphics().setDepth(4.2);
    this.flashG = this.add.graphics().setDepth(14);
    this.worldTs = Array.from({ length: 14 }, () => this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '7px', color: '#ffffff' }).setDepth(0.75).setVisible(false));
  }

  /** Draws a pixel map (one string a row) centred on x, y at scale s. */
  pix(g, map, pal, x, y, s, a = 1) {
    const w = Math.max(...map.map((r) => r.length)), h = map.length, x0 = Math.round(x - (w * s) / 2), y0 = Math.round(y - (h * s) / 2);
    map.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const c = pal[row[i]]; if (c !== undefined) { g.fillStyle(c, a); g.fillRect(x0 + i * s, y0 + j * s, s, s); } } });
  }
  /** Draws a trinket's art at x, y (scale s) with a soft glow behind it. */
  trinketArt(g, tr, x, y, s, a = 1, glow = 0.35) {
    if (glow > 0) { g.fillStyle(tr.glow, glow * a * 0.5); g.fillCircle(x, y, s * 7); g.fillStyle(tr.glow, glow * a); g.fillCircle(x, y, s * 4.5); }
    this.pix(g, tr.map, tr.pal, x, y, s, a);
  }

  // ------------------------------------------------------------------ the trip
  /** Whether she should go now: left alone long enough, free, not too soon after the last one. */
  tripDue() { return !this.trip && this.t >= this.nextTrip && this.t - this.quietAt > TRIP.quiet && this.free(); }
  /** Off she goes: the next trinket she doesn't have yet (or a random world once she has all ten). */
  startTrip(id) {
    const owned = trinketsOwned(), left = TRINKETS.filter((t) => !owned.includes(t.id));
    const tr = trinketById(id) || (left.length ? left[Math.floor(Math.random() * left.length)] : TRINKETS[Math.floor(Math.random() * TRINKETS.length)]);
    this.routine = 'trip'; this.lifeFx = this.lifeFx.filter((p) => p.k !== 'note');
    const T = this.trip = { tr, kind: tr.portal.kind, on: false, gate: null, flash: 0, item: 'none', fly: null, react: 0, wt: 0, seed: Math.floor(Math.random() * 1e6), again: owned.includes(tr.id) };
    this.makeWorld(T);
    this.say(tr.say, 'sly');
    this.play('warp', (ev, f) => {
      if (ev === 'snap') {
        const h = this.frame()[7];
        T.gate = { x: Math.max(110, Math.min(210, h[0] - 70)), y: h[1] - 4, k: 0, grow: 1, big: 0 };
        sfx('glass', 0.35, 1.7); sfx('summon', 0.3, 1.1); this.setExpr('wink');
        for (let i = 0; i < 12; i++) this.lifeFx.push({ k: 'spark', x: h[0], y: h[1], vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, t: 0, c: tr.glow });
      }
      if (ev === 'swallow' && T.gate) { T.gate.big = 1; sfx('whoosh', 0.4, 0.6); this.setExpr('surprised'); }
      if (ev === 'look') {
        if (f === RF.anims.warp.ev.look[0]) { this.setExpr('happy'); this.say(tr.look, 'happy'); }
        if (f % 6 === 0) this.ambient(T);
      }
    }, () => this.play('grab', (ev) => {
      if (ev === 'reach') this.setExpr('focus');
      if (ev === 'grab') { T.item = 'held'; T.react = 1; this.reactSfx(T); this.setExpr('happy'); this.say('GOT IT! ' + tr.name + '!', 'happy'); }
    }, () => this.play('snapback', (ev) => {
      if (ev === 'admire') this.setExpr('smug');
      if (ev === 'snap') {
        const h = this.frame()[8], hand = this.frame()[7];
        T.on = false; T.flash = 1; T.gate = { x: h[0] + 50, y: h[1] - 10, k: 1, shut: 1, big: 0 };
        sfx('glass', 0.35, 2.0); sfx('smoke', 0.25, 1.3); this.setExpr('wink'); this.cameras.main.shake(100, 0.003);
        const fresh = addTrinket(tr.id), slot = this.slotOf(tr.id);
        T.fly = { x0: hand[0] + 2, y0: hand[1] - 8, x1: slot.x, y1: slot.y, t: 0, fresh }; T.item = 'fly';
      }
    }, () => this.endTrip())));
  }
  /** Home again: she says what it is (or that it's a souvenir), and the shelf has it. */
  endTrip() {
    const T = this.trip; if (!T) return;
    this.routine = null; this.nextTrip = this.t + TRIP.every; this.lastAct = this.t; this.play('idle');
    if (T.again) this.say(['ANOTHER ' + T.tr.name.replace(/^(AN?|THE) /, '') + '... I\'LL SNEAK IT BACK LATER.'], 'sly');
    else this.say(['NEW ON THE SHELF: ' + T.tr.name + '!', 'CLICK IT IF YOU WANT THE STORY.'], 'happy');
    this.trip = null; this.worldG.clear(); this.gateG.clear(); this.worldTs.forEach((t) => t.setVisible(false));
  }

  /** Where trinket `id` sits on the shelf (its slot's middle, standing on the board). */
  slotOf(id) {
    const i = Math.max(0, TRINKETS.findIndex((t) => t.id === id)), tr = TRINKETS[i];
    return { x: SHELF.x + SHELF.slot * (i + 0.5), y: SHELF.y - (tr.map.length * SHELF.scale) / 2 - 1, i };
  }
  /** The shelf slot under point p (-1 if none, or that trinket isn't there yet). */
  shelfAt(p) {
    if (p.y < SHELF.y - 28 || p.y > SHELF.y + 6 || p.x < SHELF.x || p.x > SHELF.x + SHELF.slot * TRINKETS.length) return -1;
    const i = Math.floor((p.x - SHELF.x) / SHELF.slot), tr = TRINKETS[i];
    if (!tr || !trinketsOwned().includes(tr.id) || (this.trip && this.trip.fly && this.trip.tr.id === tr.id)) return -1;
    return i;
  }

  /** Every frame: is it time to go? the world's clock. */
  stepTrips() {
    if (this.trip) { this.trip.wt++; if (this.trip.flash > 0) this.trip.flash = Math.max(0, this.trip.flash - 0.05); }
  }
  /** A world-flavoured little noise now and then while she's there. */
  ambient(T) {
    const k = T.kind, n = Math.floor(T.wt / 6);
    if (k === 'blocks') sfx('menu', 0.12, 1.6);
    else if (k === 'maze' && n % 2 === 0) sfx('menu', 0.1, 2.2 + (n % 4) * 0.2);
    else if (k === 'invaders') sfx('land', 0.18, [0.6, 0.55, 0.5, 0.45][n % 4]);
    else if (k === 'coins' && n % 4 === 0) sfx('jump', 0.12, 1.3);
    else if (k === 'tennis' && n % 3 === 0) sfx('menu', 0.18, n % 6 === 0 ? 1.0 : 1.25);
    else if (k === 'duck' && n % 4 === 0) sfx('laser', 0.08, 1.8);
    else if (k === 'racer' && n % 2 === 0) sfx('rumble', 0.1, 1.4);
    else if (k === 'rocks' && n % 2 === 0) sfx('land', 0.2, n % 4 === 0 ? 0.5 : 0.42);
    else if (k === 'text') sfx('menu', 0.08, 2.6);
  }
  /** The world notices she took it. */
  reactSfx(T) {
    const k = T.kind;
    if (k === 'blocks') { sfx('limitready', 0.3, 1.2); sfx('clang', 0.2, 2); }
    else if (k === 'maze') { sfx('item', 0.35, 0.7); sfx('warn', 0.15, 2); }
    else if (k === 'invaders') sfx('warn', 0.3, 1.4);
    else if (k === 'coins') { sfx('item', 0.4, 1.7); this.time.delayedCall(200, () => sfx('limitready', 0.3, 1.5)); }
    else if (k === 'quest') [0, 160, 320, 520].forEach((ms, i) => this.time.delayedCall(ms, () => sfx('ding', 0.3, [1.5, 1.68, 1.89, 2.0][i])));
    else if (k === 'tennis') sfx('menu', 0.3, 0.6);
    else if (k === 'duck') { sfx('whoosh', 0.35, 1.3); sfx('bats', 0.2, 1.5); }
    else if (k === 'racer') sfx('go', 0.4, 1);
    else if (k === 'rocks') sfx('clang', 0.3, 0.8);
    else sfx('menu', 0.3, 1.4);
  }
  /** Builds a world's fixed layout (stacks, maze dots, stars, rocks...) into T. */
  makeWorld(T) {
    const r = rng(T.seed), k = T.kind;
    T.stars = Array.from({ length: 70 }, () => [r() * VIEW_W, r() * 240, r()]);
    if (k === 'blocks') {
      T.stack = []; for (let row = 0; row < 4; row++) for (let c = 0; c < 40; c++) if (r() < 0.82 - row * 0.12) T.stack.push([c, row, BLOCK_COLS[Math.floor(r() * 7)]]);
      T.falls = [0, 1, 2].map((i) => ({ col: [10, 25, 33][i], shape: Math.floor(r() * 7), c: BLOCK_COLS[Math.floor(r() * 7)], y: -4 - i * 3 }));
    }
    if (k === 'maze') {
      const L = [[52, 60, 76, 28], [156, 60, 60, 28], [52, 116, 76, 16], [156, 112, 16, 64], [52, 164, 40, 52], [120, 164, 52, 16], [200, 140, 64, 16]];
      T.walls = [...L, ...L.map(([x, y, w, h]) => [VIEW_W - x - w, y, w, h])];
      T.dots = [];
      for (let y = 40; y < 232; y += 16) for (let x = 32; x < 612; x += 16) if (!T.walls.some(([wx, wy, w, h]) => x > wx - 6 && x < wx + w + 6 && y > wy - 6 && y < wy + h + 6)) T.dots.push([x, y]);
      T.bugs = [[0xff5a5a, 44, 0], [0xffa0e0, 100, 1], [0x5af0ff, 150, 2], [0xffb050, 220, 3]];
    }
    if (k === 'rocks') T.rocks = Array.from({ length: 8 }, () => ({ x: r() * VIEW_W, y: r() * 230, vx: (r() - 0.5) * 0.8, vy: (r() - 0.5) * 0.6, a: r() * 6, va: (r() - 0.5) * 0.02, r: 12 + r() * 20, pts: Array.from({ length: 9 }, () => 0.7 + r() * 0.35) }));
    if (k === 'quest') T.tufts = Array.from({ length: 90 }, () => [r() * VIEW_W, 40 + r() * 200]);
    if (k === 'duck') T.grass = Array.from({ length: 80 }, () => [r() * VIEW_W, 0.6 + r() * 0.6]);
  }

  // ------------------------------------------------------------------ drawing
  /** Draws the trip (the gate, the world, the trinket hanging / held / flying, the flash) and the shelf. */
  drawTrips() {
    this.drawShelf();
    const g = this.worldG, ig = this.itemG, T = this.trip; g.clear(); ig.clear(); this.gateG.clear(); this.flashG.clear();
    this.worldTs.forEach((t) => t.setVisible(false));
    if (!T) return;
    if (T.gate) this.drawGate(T);
    if (T.on) { this.wTexts = []; this[('world_' + T.kind)](g, T, this.t); this.drawWorldTexts(); }
    const tr = T.tr;
    if (T.on && T.item === 'none') T.item = 'float';
    if (T.item === 'float') {
      const a = RF.anims.grab, h = a.frames[a.ev.grab][7], bob = Math.sin(this.t * 0.08) * 3;
      this.trinketArt(ig, tr, h[0], h[1] - 6 + bob, 3, 1, 0.45 + 0.15 * Math.sin(this.t * 0.2));
      if (this.t % 10 === 0) this.lifeFx.push({ k: 'spark', x: h[0] + (Math.random() - 0.5) * 30, y: h[1] - 6 + (Math.random() - 0.5) * 30, vx: 0, vy: -0.3, t: 20, c: tr.glow });
    } else if (T.item === 'held') {
      const h = this.frame()[7]; if (h) this.trinketArt(ig, tr, h[0] + 2, h[1] - 10, 3, 1, 0.3);
    } else if (T.item === 'fly' && T.fly) {
      const F = T.fly, k = Math.min(1, ++F.t / 34), e = k * k * (3 - 2 * k);
      const x = F.x0 + (F.x1 - F.x0) * e, y = F.y0 + (F.y1 - F.y0) * e - Math.sin(Math.PI * e) * 70;
      this.trinketArt(ig, tr, x, y, k < 1 ? 3 - e : SHELF.scale, 1, 0.5);
      if (F.t % 3 === 0 && k < 1) this.lifeFx.push({ k: 'spark', x, y, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, t: 10, c: tr.glow });
      if (k >= 1 && !F.landed) { F.landed = true; sfx('item', 0.35, 1.5); for (let i = 0; i < 10; i++) this.lifeFx.push({ k: 'spark', x: F.x1, y: F.y1, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, t: 0, c: tr.glow }); }
      if (k >= 1) T.item = 'shelved';
    }
    if (T.flash > 0) { this.flashG.fillStyle(0xffffff, Math.min(1, T.flash * 1.3)); this.flashG.fillRect(0, 0, VIEW_W, VIEW_H); }
  }
  /** Her shelf of trinkets on the wall (an empty dent where each missing one goes; NEW ones glint). */
  drawShelf() {
    const g = this.shelfG; g.clear();
    if (this.trip && this.trip.on) { this.shelfT.setVisible(false); return; }
    const owned = trinketsOwned(), W = SHELF.slot * TRINKETS.length, y = SHELF.y;
    g.fillStyle(0x1e120c, 0.55); g.fillRoundedRect(SHELF.x - 6, y - 30, W + 12, 32, 3);        // a dark felt back to the shelf
    g.lineStyle(1, 0xd9ab48, 0.6); g.strokeRoundedRect(SHELF.x - 6, y - 30, W + 12, 32, 3);
    g.fillStyle(0x000000, 0.25); g.fillRect(SHELF.x - 2, y + 3, W + 6, 4);
    g.fillStyle(0x8a5a32, 1); g.fillRect(SHELF.x - 8, y, W + 16, 4); g.fillStyle(0xb07a44, 1); g.fillRect(SHELF.x - 8, y, W + 16, 1.5);
    g.fillStyle(0x4a2b18, 1); g.fillRect(SHELF.x + 6, y + 4, 3, 6); g.fillRect(SHELF.x + W - 10, y + 4, 3, 6);
    const hover = this.mouse && !this.overlay ? this.shelfAt(this.mouse) : -1;
    TRINKETS.forEach((tr, i) => {
      const s = this.slotOf(tr.id), flying = this.trip && this.trip.tr.id === tr.id && this.trip.item !== 'shelved' && !this.trip.again;
      if (!owned.includes(tr.id) || flying) { g.fillStyle(0x2a1a10, 0.35); g.fillRect(s.x - 5, y - 4, 10, 3); return; }
      const fresh = !trinketSeen(tr.id);
      this.trinketArt(g, tr, s.x, s.y, SHELF.scale, 1, i === hover ? 0.55 : fresh ? 0.25 + 0.2 * Math.sin(this.t * 0.12 + i) : 0);
      if (fresh && this.t % 50 < 30) { g.fillStyle(0xffffff, 0.9); const sx = s.x + 6, sy = s.y - 10; g.fillRect(sx - 0.5, sy - 3, 1, 6); g.fillRect(sx - 3, sy - 0.5, 6, 1); }
      if (i === hover) { g.lineStyle(1, 0xffe9a0, 0.9); g.strokeRect(s.x - 9, y - 26, 18, 25); }
    });
    this.shelfT.setVisible(owned.length > 0).setText('TRINKETS ' + owned.length + '/' + TRINKETS.length).setPosition(SHELF.x - 2, y + 6);
  }
  /** The portal before it swallows the room (and after, shutting): the trinket's world inside, its own rim. */
  drawGate(T) {
    const G = T.gate, g = this.gateG, P = T.tr.portal;
    if (G.grow) G.k = Math.min(1, G.k + 1 / GATE.open);
    let sc = 1;
    if (G.big) { G.big++; const q = G.big / GATE.swallow; sc = 1 + q * q * 9; if (G.big >= GATE.swallow) { T.on = true; T.flash = 1; T.gate = null; sfx('summon', 0.3, 0.7); return; } }
    if (G.shut) { G.shut++; G.k = Math.max(0, 1 - G.shut / GATE.shut); sc = 1 + (1 - Math.min(1, G.shut / 8)) * 3; if (G.k <= 0) { T.gate = null; return; } }
    const k = G.k, rx = GATE.rx * sc * k, ry = GATE.ry * sc * k; if (rx < 1) return;
    const half = (dy) => {
      const v = dy / ry; if (Math.abs(v) > 1) return 0;
      if (P.shape === 'rect') return rx;
      if (P.shape === 'arch') return v > -0.4 ? rx : rx * Math.sqrt(Math.max(0, 1 - ((v + 0.4) / 0.6) ** 2));
      if (P.shape === 'oct') return Math.abs(v) < 0.45 ? rx : rx * (1 - (Math.abs(v) - 0.45) / 0.55 * 0.6);
      if (P.shape === 'circle') { const r = Math.min(rx, ry); return Math.abs(dy) > r ? 0 : Math.sqrt(r * r - dy * dy); }
      return rx * Math.sqrt(1 - v * v);
    };
    for (let dy = -ry; dy < ry; dy += 2) {                            // the inside: the world's colours, top to bottom
      const w = half(dy); if (w < 1) continue;
      const v = (dy + ry) / (2 * ry); g.fillStyle(P.inside[v < 0.4 ? 0 : v < 0.75 ? 1 : 2], 1); g.fillRect(G.x - w, G.y + dy, w * 2, 2);
    }
    this.trinketArt(g, T.tr, G.x, G.y, Math.max(1, Math.round(2 * k * Math.min(sc, 2))), k, 0.5);
    this.gateRim(g, P.kind, G.x, G.y, rx, ry, k);
  }
  /** Each portal's personality: its rim. */
  gateRim(g, kind, x, y, rx, ry, k) {
    const t = this.t;
    if (kind === 'blocks') {                                          // blocks round a square, stepping round in turns
      const s = 10, n = Math.floor((rx * 2) / s), m = Math.floor((ry * 2) / s), step = Math.floor(t / 8);
      for (let i = 0; i < n; i++) { this.block(g, x - rx + i * s, y - ry - s, s, BLOCK_COLS[(i + step) % 7]); this.block(g, x - rx + i * s, y + ry, s, BLOCK_COLS[(i + step + 3) % 7]); }
      for (let j = -1; j <= m; j++) { this.block(g, x - rx - s, y - ry + j * s, s, BLOCK_COLS[(j + step + 5) % 7]); this.block(g, x + rx, y - ry + j * s, s, BLOCK_COLS[(j + step + 1) % 7]); }
    } else if (kind === 'maze') {                                     // a neon double line, dots chasing round it
      g.lineStyle(3, 0x2040ff, k); g.strokeRoundedRect(x - rx - 4, y - ry - 4, rx * 2 + 8, ry * 2 + 8, 10);
      g.lineStyle(1.5, 0x80a0ff, k); g.strokeRoundedRect(x - rx - 8, y - ry - 8, rx * 2 + 16, ry * 2 + 16, 12);
      const per = 4 * (rx + ry); for (let i = 0; i < 16; i++) { const d = ((t * 2 + i * per / 16) % per); const p = this.rectPoint(x, y, rx + 6, ry + 6, d); g.fillStyle(i === 0 ? 0xffd8a8 : 0xffc8a0, k); g.fillRect(p.x - (i === 0 ? 3 : 1), p.y - (i === 0 ? 3 : 1), i === 0 ? 6 : 2, i === 0 ? 6 : 2); }
    } else if (kind === 'invaders') {                                 // little aliens marching round the ring
      g.lineStyle(2, 0x7cf06a, 0.6 * k); g.strokeEllipse(x, y, rx * 2, ry * 2);
      for (let i = 0; i < 10; i++) { const a = Math.floor(t / 10) * 0.08 + i * Math.PI / 5; this.pix(g, ALIEN[Math.floor(t / 10) % 2], { x: [0xff60c0, 0x60e0ff, 0x7cf06a, 0xf0f060][i % 4], w: 0xffffff, o: 0x000000 }, x + Math.cos(a) * (rx + 8), y + Math.sin(a) * (ry + 8), 1, k); }
    } else if (kind === 'coins') {                                    // a ring of spinning coins
      for (let i = 0; i < 12; i++) { const a = t * 0.03 + i * Math.PI / 6, cx = x + Math.cos(a) * (rx + 6), cy = y + Math.sin(a) * (ry + 6), w = Math.abs(Math.cos(t * 0.12 + i)) * 5 + 1; g.fillStyle(0xa87020, k); g.fillEllipse(cx, cy, w * 2 + 2, 12); g.fillStyle(0xffd040, k); g.fillEllipse(cx, cy, w * 2, 10); }
    } else if (kind === 'quest') {                                    // a stone arch with a torch either side
      g.lineStyle(7, 0x8a8a90, k); this.archPath(g, x, y, rx + 4, ry + 4); g.lineStyle(2, 0x5a5a60, k); this.archPath(g, x, y, rx + 8, ry + 8);
      for (const s of [-1, 1]) { const fx = x + s * (rx + 16), fy = y - ry * 0.1; g.fillStyle(0x5a3a1a, k); g.fillRect(fx - 2, fy, 4, 14); const fl = 1 + Math.sin(t * 0.5 + s) * 0.3; g.fillStyle(0xff7020, k); g.fillEllipse(fx, fy - 4, 8 * fl, 12 * fl); g.fillStyle(0xffe060, k); g.fillEllipse(fx, fy - 3, 4, 7 * fl); }
    } else if (kind === 'tennis') {                                   // a little screen: a thick white frame, the net, a rally
      g.lineStyle(4, 0xffffff, k); g.strokeRect(x - rx, y - ry, rx * 2, ry * 2);
      g.fillStyle(0xffffff, k); for (let dy = -ry + 4; dy < ry - 6; dy += 10) g.fillRect(x - 1, y + dy, 2, 5);
      const bx = x + Math.sin(t * 0.07) * (rx - 10), by = y + Math.sin(t * 0.11) * (ry - 10); g.fillRect(bx - 2, by - 2, 4, 4);
      g.fillRect(x - rx + 4, by - 8, 3, 16); g.fillRect(x + rx - 7, by - 8, 3, 16);
    } else if (kind === 'duck') {                                     // a crosshair
      const r = Math.min(rx, ry); g.lineStyle(3, 0xffffff, k); g.strokeCircle(x, y, r + 3); g.lineStyle(1.5, 0xd8323a, k); g.strokeCircle(x, y, r + 7);
      g.lineStyle(2, 0xffffff, k); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.lineBetween(x + dx * (r - 6), y + dy * (r - 6), x + dx * (r + 14), y + dy * (r + 14));
    } else if (kind === 'racer') {                                    // a checkered ring
      for (let i = 0; i < 32; i++) { const a0 = i * Math.PI / 16 + t * 0.01, a1 = a0 + Math.PI / 16; g.fillStyle(i % 2 ? 0xffffff : 0x101010, k); g.fillPoints([{ x: x + Math.cos(a0) * rx, y: y + Math.sin(a0) * ry }, { x: x + Math.cos(a1) * rx, y: y + Math.sin(a1) * ry }, { x: x + Math.cos(a1) * (rx + 8), y: y + Math.sin(a1) * (ry + 8) }, { x: x + Math.cos(a0) * (rx + 8), y: y + Math.sin(a0) * (ry + 8) }], true); }
    } else if (kind === 'rocks') {                                    // a turning wireframe of light
      for (const [w, a] of [[5, 0.15], [1.5, 1]]) { g.lineStyle(w, 0xffffff, a * k); g.strokePoints(Array.from({ length: 8 }, (_, i) => { const an = i * Math.PI / 4 + t * 0.02 + Math.PI / 8; return { x: x + Math.cos(an) * (rx + 6), y: y + Math.sin(an) * (ry + 6) }; }), true); }
    } else {                                                          // a green terminal window, a blinking cursor
      g.lineStyle(2, 0x5aff6a, k); g.strokeRect(x - rx - 3, y - ry - 12, rx * 2 + 6, ry * 2 + 15);
      g.fillStyle(0x5aff6a, k); g.fillRect(x - rx - 3, y - ry - 12, rx * 2 + 6, 8);
      g.fillStyle(0x031203, k); g.fillRect(x - rx + 2, y - ry - 10, 6, 4);
      if (t % 40 < 22) { g.fillStyle(0x5aff6a, k); g.fillRect(x - rx + 6, y + ry - 12, 6, 9); }
    }
  }
  /** A point d along a rectangle's edge (rx, ry half sizes round x, y). */
  rectPoint(x, y, rx, ry, d) {
    const w = rx * 2, h = ry * 2;
    if (d < w) return { x: x - rx + d, y: y - ry }; d -= w;
    if (d < h) return { x: x + rx, y: y - ry + d }; d -= h;
    if (d < w) return { x: x + rx - d, y: y + ry }; d -= w;
    return { x: x - rx, y: y + ry - d };
  }
  /** Strokes an arch (round top, straight sides). */
  archPath(g, x, y, rx, ry) {
    const top = y - ry * 0.4, pts = [{ x: x - rx, y: y + ry }, { x: x - rx, y: top }];
    for (let i = 0; i <= 12; i++) { const a = Math.PI + i * Math.PI / 12; pts.push({ x: x + Math.cos(a) * rx, y: top + Math.sin(a) * ry * 0.6 }); }
    pts.push({ x: x + rx, y: y + ry }); g.strokePoints(pts, false);
  }
  /** A bevelled block (THE WELL). */
  block(g, x, y, s, c) {
    g.fillStyle(c, 1); g.fillRect(x, y, s, s);
    g.fillStyle(0xffffff, 0.35); g.fillRect(x, y, s, 2); g.fillRect(x, y, 2, s);
    g.fillStyle(0x000000, 0.3); g.fillRect(x, y + s - 2, s, 2); g.fillRect(x + s - 2, y, 2, s);
  }
  /** Queues a text for the world this frame (drawn by drawWorldTexts). */
  wText(x, y, s, size, color, origin = 0) { this.wTexts.push([x, y, s, size, color, origin]); }
  /** Puts this frame's world texts on screen. */
  drawWorldTexts() {
    this.worldTs.forEach((o, i) => {
      const q = this.wTexts[i]; if (!q) return;
      o.setVisible(true).setPosition(q[0], q[1]).setText(q[2]).setFontSize(q[3]).setColor(q[4]).setOrigin(q[5], 0);
    });
  }
  /** Where the trinket hangs before she grabs it. */
  itemSpot() { const a = RF.anims.grab, h = a.frames[a.ev.grab][7]; return { x: h[0], y: h[1] - 6 }; }

  // ------------------------------------------------------------------ the ten worlds (drawn behind her desk)
  /** THE WELL: a dark grid, a stack at the bottom, pieces dropping a row at a time. */
  world_blocks(g, T, t) {
    g.fillStyle(0x0a0a20, 1); g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.lineStyle(1, 0x1a1a44, 1); for (let x = 0; x < VIEW_W; x += 16) g.lineBetween(x, 0, x, 240); for (let y = 0; y < 240; y += 16) g.lineBetween(0, y, VIEW_W, y);
    const S = 16;
    for (const [c, row, col] of T.stack) this.block(g, c * S, 232 - (row + 1) * S, S, col);
    for (const F of T.falls) {
      F.y += 1 / 14; if (F.y > 10) { F.y = -3; F.shape = Math.floor(Math.random() * 7); F.c = BLOCK_COLS[Math.floor(Math.random() * 7)]; }
      for (const [cx, cy] of SHAPES[F.shape]) this.block(g, (F.col + cx) * S, Math.floor(F.y + cy) * S, S, F.c);
    }
    if (T.react > 0) { T.react++; const a = Math.max(0, 1 - T.react / 40); g.fillStyle(0xffffff, a); g.fillRect(0, 232 - S, VIEW_W, S); if (T.react < 40) this.wText(80, 190, 'LINE!', '12px', '#ffffff'); }
    g.fillStyle(0x000000, 0.8); g.fillRect(16, 36, 110, 70); g.lineStyle(2, 0x8a8aa8, 1); g.strokeRect(16, 36, 110, 70);
    this.wText(26, 46, 'LINES  0' + (41 + (T.react ? 1 : 0)), '7px', '#ffffff'); this.wText(26, 62, 'LEVEL  09', '7px', '#ffffff'); this.wText(26, 78, 'SCORE', '7px', '#a8a8c8'); this.wText(26, 90, String(271840 + (T.react ? 1200 : 0)).padStart(7, '0'), '7px', '#ffe060');
  }
  /** THE NEON MAZE: blue walls, dots, blinking pellets, little sparks wandering the corridors (blue and running once
   *  she takes the pellet). */
  world_maze(g, T, t) {
    g.fillStyle(0x000000, 1); g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.lineStyle(2, 0x2040ff, 1); g.strokeRoundedRect(16, 26, VIEW_W - 32, 220, 10); g.lineStyle(1, 0x6080ff, 0.7); g.strokeRoundedRect(20, 30, VIEW_W - 40, 212, 8);
    for (const [x, y, w, h] of T.walls) { g.lineStyle(2, 0x2040ff, 1); g.strokeRoundedRect(x, y, w, h, 6); g.lineStyle(1, 0x6080ff, 0.6); if (w > 8 && h > 8) g.strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, 4); }
    g.fillStyle(0xffc8a0, 1); for (const [x, y] of T.dots) g.fillRect(x - 1, y - 1, 2, 2);
    if (t % 30 < 18) for (const [x, y] of [[32, 40], [608, 40], [32, 216], [608, 216]]) { g.fillStyle(0xffd8a8, 1); g.fillCircle(x, y, 5); }
    const scared = T.react > 0;
    for (const [c, y, i] of T.bugs) {
      const sp = scared ? 2.4 : 1, x = 60 + ((t * sp + i * 140) % 540), sq = scared && t % 20 < 10;
      const col = scared ? (sq ? 0xffffff : 0x2030c0) : c;
      g.fillStyle(col, 1); g.fillPoints([{ x, y: y - 8 }, { x: x + 8, y }, { x, y: y + 8 }, { x: x - 8, y }], true);
      g.fillStyle(col, 1); for (let l = -1; l <= 1; l++) g.fillRect(x + l * 4 - 1, y + 6 + ((t + l) % 8 < 4 ? 1 : 0), 2, 4);
      if (!scared) { g.fillStyle(0xffffff, 1); g.fillCircle(x - 3, y - 1, 2.4); g.fillCircle(x + 3, y - 1, 2.4); g.fillStyle(0x2030c0, 1); g.fillCircle(x - 2, y - 1, 1.2); g.fillCircle(x + 4, y - 1, 1.2); }
      else { g.fillStyle(sq ? 0x2030c0 : 0xffffff, 1); for (let w = -4; w < 4; w += 2) g.fillRect(x + w, y + 1 + (w % 4 ? 1 : 0), 2, 1); g.fillRect(x - 3, y - 3, 2, 2); g.fillRect(x + 2, y - 3, 2, 2); }
    }
    this.wText(244, 9, '1UP 004560   HI 999990', '6px', '#ffffff');
  }
  /** THE MARCHING SKY: rows of one-eyed aliens stepping across, bunkers, a cannon firing, a saucer now and then. */
  world_invaders(g, T, t) {
    g.fillStyle(0x000004, 1); g.fillRect(0, 0, VIEW_W, VIEW_H);
    for (const [x, y, b] of T.stars) { g.fillStyle(0xffffff, 0.3 + 0.5 * Math.abs(Math.sin(t * 0.02 + b * 9))); g.fillRect(x, y, 1, 1); }
    const every = T.react ? 3 : 14, step = Math.floor(t / every), off = (step % 40 < 20 ? step % 20 : 20 - (step % 20)) * 5 - 50, frame = step % 2;
    const cols = [0xff60c0, 0x60e0ff, 0x7cf06a, 0xf0f060];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) {
      if ((r * 9 + c) % 7 === 3) continue;
      const fl = T.react && t % 8 < 4 ? 0xffffff : cols[r];
      this.pix(g, ALIEN[frame], { x: fl, w: 0xffffff, o: 0x000000 }, 110 + c * 46 + off, 44 + r * 28 + Math.min(20, Math.floor(step / 40) * 4), 2);
    }
    for (const bx of [60, 170, 470, 580]) { g.fillStyle(0x3cd83c, 1); g.fillRect(bx - 18, 196, 36, 14); g.fillRect(bx - 12, 190, 24, 6); g.fillStyle(0x000004, 1); g.fillRect(bx - 6, 204, 12, 6); }
    const cx = 60 + Math.abs(((t * 0.8) % 260) - 130); g.fillStyle(0x3cd83c, 1); g.fillRect(cx - 10, 222, 20, 8); g.fillRect(cx - 2, 216, 4, 6);
    const sy = 216 - ((t * 5) % 200); g.fillStyle(0xffffff, 1); g.fillRect(cx - 1, sy, 2, 8);
    if (t % 400 < 180) { const ux = -30 + (t % 400) * 4; g.fillStyle(0xff3040, 1); g.fillEllipse(ux, 30, 30, 8); g.fillEllipse(ux, 26, 14, 8); g.fillStyle(0xffff80, t % 10 < 5 ? 1 : 0.3); for (let i = -2; i <= 2; i++) g.fillRect(ux + i * 5 - 1, 29, 2, 2); }
    this.wText(244, 9, 'SCORE<1> 01980  HI 08870', '6px', '#ffffff');
  }
  /** THE BRICK HILLS: blue sky, clouds, round hills, floating bricks and coin blocks, coins spinning in rows. */
  world_coins(g, T, t) {
    g.fillStyle(0x5c94fc, 1); g.fillRect(0, 0, VIEW_W, VIEW_H);
    for (const [cx, cy] of [[90, 70], [300, 40], [520, 200], [200, 150]]) { const x = ((cx + t * 0.15) % 760) - 60; g.fillStyle(0xffffff, 1); g.fillEllipse(x, cy, 50, 18); g.fillEllipse(x - 18, cy + 4, 30, 14); g.fillEllipse(x + 18, cy + 4, 30, 14); g.fillEllipse(x, cy - 7, 26, 16); }
    for (const [hx, hw, hh] of [[70, 200, 110], [380, 260, 80], [600, 180, 120]]) { g.fillStyle(0x0a6a1a, 1); g.fillEllipse(hx, 232, hw + 6, hh * 2 + 6); g.fillStyle(0x48b838, 1); g.fillEllipse(hx, 232, hw, hh * 2); }
    const brick = (x, y) => { g.fillStyle(0xc85020, 1); g.fillRect(x, y, 16, 16); g.fillStyle(0x000000, 0.5); g.fillRect(x, y + 7, 16, 1); g.fillRect(x + 7, y, 1, 7); g.fillRect(x + 3, y + 8, 1, 8); g.fillRect(x + 12, y + 8, 1, 8); g.fillStyle(0xffffff, 0.25); g.fillRect(x, y, 16, 1); };
    const cblock = (x, y) => { g.fillStyle(0xe8a020, 1); g.fillRect(x, y, 16, 16); g.lineStyle(1, 0x7a3a10, 1); g.strokeRect(x + 0.5, y + 0.5, 15, 15); g.fillStyle(0x7a3a10, 1); g.fillEllipse(x + 8, y + 8, 6, 9); g.fillStyle(0xffe080, t % 40 < 20 ? 1 : 0.6); g.fillEllipse(x + 8, y + 8, 3, 6); };
    for (let i = 0; i < 6; i++) (i === 2 ? cblock : brick)(30 + i * 16, 120);
    for (let i = 0; i < 5; i++) (i === 3 ? cblock : brick)(440 + i * 16, 196);
    for (const [x0, y, n] of [[34, 84, 6], [444, 166, 5]]) for (let i = 0; i < n; i++) { const w = Math.abs(Math.cos(t * 0.1 + i * 0.6)) * 5 + 1, x = x0 + i * 16 + 6; g.fillStyle(0xa87020, 1); g.fillEllipse(x, y, w * 2 + 2, 14); g.fillStyle(0xffd040, 1); g.fillEllipse(x, y, w * 2, 12); }
    for (let x = 0; x < VIEW_W; x += 16) { g.fillStyle(0xc85020, 1); g.fillRect(x, 216, 16, 16); g.fillStyle(0x000000, 0.4); g.fillRect(x, 216, 16, 1); g.fillRect(x, 216, 1, 16); }
    this.wText(244, 9, 'COINS x' + (T.react ? '00' : '99') + '   WORLD 4-2', '6px', '#ffffff'); this.wText(24, 32, 'PLAYER 1  0031650', '6px', '#ffffff');
    if (T.react > 0 && T.react++ < 90) { const s = this.itemSpot(); this.wText(s.x, s.y - 34 - T.react * 0.3, '1UP!', '10px', '#7cf06a', 0.5); }
  }
  /** THE GREEN FIELD: seen from above - grass, a sandy path, trees, rocks, a cave in the cliff, a row of hearts. */
  world_quest(g, T, t) {
    g.fillStyle(0x58b048, 1); g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle(0x408a34, 1); for (const [x, y] of T.tufts) { g.fillRect(x, y, 2, 3); g.fillRect(x + 3, y + 1, 2, 3); }
    g.fillStyle(0xe0c890, 1); g.fillRect(296, 70, 48, 170); g.fillRect(0, 170, VIEW_W, 32);
    g.fillStyle(0xa86a30, 1); g.fillRect(0, 36, VIEW_W, 40); g.fillStyle(0x7a4a20, 1); for (let x = 0; x < VIEW_W; x += 24) { g.fillRect(x, 36, 2, 40); g.fillRect(x + 12, 56, 2, 20); } g.fillRect(0, 74, VIEW_W, 3);
    g.fillStyle(0x000000, 1); g.fillRect(104, 50, 32, 27); g.fillEllipse(120, 52, 32, 14);
    for (const [x, y] of [[40, 110], [80, 130], [200, 110], [450, 110], [560, 130], [600, 100], [40, 220], [220, 230], [440, 230], [590, 220]]) {
      g.fillStyle(0x0a4a14, 1); g.fillCircle(x, y, 17); g.fillStyle(0x1a7a2a, 1); g.fillCircle(x - 1, y - 1, 15); g.fillStyle(0x2a9a3a, 1); g.fillCircle(x - 5, y - 5, 6);
    }
    for (const [x, y] of [[150, 140], [520, 150], [380, 120]]) { g.fillStyle(0x6a6a70, 1); g.fillEllipse(x, y, 22, 16); g.fillStyle(0x9a9aa0, 1); g.fillEllipse(x - 3, y - 3, 12, 8); }
    g.fillStyle(0x000000, 1); g.fillRect(0, 0, VIEW_W, 36);
    g.fillStyle(0x6a6a70, 1); g.fillRect(380, 8, 50, 22); g.fillStyle(0x58b048, 1); g.fillRect(396 + Math.floor(t / 30) % 3 * 6, 16, 5, 5);
    this.wText(260, 4, '-LIFE-', '6px', '#f03040');
    const full = 2 + (T.react ? 1 : 0); for (let i = 0; i < 5; i++) { const hx = 250 + i * 14, hy = 22; this.pix(g, TRINKETS[4].map, i < full ? TRINKETS[4].pal : { r: 0x801020, R: 0x000000, W: 0x000000 }, hx, hy, 1.5); }
    if (T.react > 0 && T.react++ < 100) { const s = this.itemSpot(); this.wText(s.x, s.y - 40, 'YOU GOT A HEART!', '7px', '#ffffff', 0.5); }
  }
  /** THE COURT: black, a dashed net, two paddles, the big score; the ball is the trinket - they wait for it. */
  world_tennis(g, T, t) {
    g.fillStyle(0x000000, 1); g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle(0xffffff, 1); g.fillRect(0, 30, VIEW_W, 3); for (let y = 40; y < 240; y += 20) g.fillRect(318, y, 4, 10);
    const digit = (d, x) => DIGITS[d].split('').forEach((b, i) => { if (b === '1') g.fillRect(x + (i % 3) * 8, 44 + Math.floor(i / 3) * 8, 8, 8); });
    digit(3, 230); digit(7, 386);
    const s = this.itemSpot(), lost = T.item !== 'float';
    const ty = lost ? 130 + Math.sin(t * 0.13) * 40 : s.y, ty2 = lost ? 130 + Math.sin(t * 0.1 + 2) * 50 : s.y;
    T.p1 = (T.p1 == null ? 130 : T.p1) + (ty - (T.p1 == null ? 130 : T.p1)) * 0.08; T.p2 = (T.p2 == null ? 130 : T.p2) + (ty2 - (T.p2 == null ? 130 : T.p2)) * 0.08;
    g.fillRect(40, T.p1 - 20, 8, 40); g.fillRect(592, T.p2 - 20, 8, 40);
    if (lost) { this.wText(44, T.p1 - 36, '?', '10px', '#ffffff', 0.5); this.wText(596, T.p2 - 36, '?', '10px', '#ffffff', 0.5); }
  }
  /** DUCK SEASON: a big tree, tall grass, ducks flying in zigzags; every so often the screen goes black and the ducks
   *  are white boxes for a frame (how the light gun saw them). They scatter when she takes one. */
  world_duck(g, T, t) {
    g.fillStyle(0x60b8ff, 1); g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle(0x6a4020, 1); g.fillRect(40, 60, 26, 200); g.fillRect(66, 110, 30, 8);
    g.fillStyle(0x2a7a2a, 1); g.fillEllipse(54, 56, 110, 70); g.fillEllipse(100, 100, 60, 34); g.fillStyle(0x3a9a3a, 1); g.fillEllipse(44, 46, 60, 34);
    g.fillStyle(0x2a7a2a, 1); g.fillEllipse(560, 200, 140, 70);
    const flash = t % 240 < 2;
    const ducks = [0, 1, 2].map((i) => {
      const run = T.react ? Math.min(1, T.react / 50) : 0, base = (t * (1.4 + i * 0.3) + i * 220) % 760 - 60;
      return { x: base, y: 70 + i * 40 + Math.sin(t * 0.05 + i * 2) * 26 - run * run * 300, i };
    });
    if (T.react > 0) T.react++;
    if (flash) { g.fillStyle(0x000000, 1); g.fillRect(0, 0, VIEW_W, VIEW_H); g.fillStyle(0xffffff, 1); for (const d of ducks) g.fillRect(d.x - 10, d.y - 7, 20, 14); return; }
    for (const d of ducks) this.pix(g, DUCK[Math.floor(t / 8 + d.i) % 2], { g: [0x2a8a3a, 0x3a5ad8, 0xc83a3a][d.i], w: 0x000000, y: 0xf0b020, b: 0x8a5a2a, B: 0x6a4020 }, d.x, d.y, 2);
    g.fillStyle(0x58a808, 1); g.fillRect(0, 200, VIEW_W, 40);
    for (const [x, h] of T.grass) { g.fillStyle(h > 0.9 ? 0x80d010 : 0x58a808, 1); g.fillTriangle(x - 6, 204, x + 6, 204, x + Math.sin(t * 0.03 + x) * 3, 204 - 46 * h); }
    const cx = 320 + Math.sin(t * 0.021) * 220, cy = 110 + Math.sin(t * 0.033) * 60;
    g.lineStyle(2, 0xffffff, 0.9); g.strokeCircle(cx, cy, 10); g.lineBetween(cx - 16, cy, cx - 5, cy); g.lineBetween(cx + 5, cy, cx + 16, cy); g.lineBetween(cx, cy - 16, cx, cy - 5); g.lineBetween(cx, cy + 5, cx, cy + 16);
    g.fillStyle(0x000000, 0.75); g.fillRect(20, 30, 120, 22); this.wText(28, 36, 'R=3   SHOT ||| ', '7px', '#7cf0ff');
  }
  /** SUNSET CIRCUIT: a striped sunset, a sun, mountains, and a road rushing at you with palms flying past. */
  world_racer(g, T, t) {
    const sky = [0x281850, 0x3a2060, 0x502868, 0x902870, 0xe04870, 0xf08050, 0xf8b048], H = 140;
    sky.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(0, (i * H) / sky.length, VIEW_W, H / sky.length + 1); });
    const sx = 170, sy = 112; g.fillStyle(0xfff060, 1); g.fillCircle(sx, sy, 44); g.fillStyle(0xff7090, 1); g.fillRect(sx - 44, sy, 88, 30);
    g.fillStyle(0xf08050, 1); for (let i = 0; i < 5; i++) g.fillRect(sx - 46, sy + 4 + i * 7, 92, 2 + i * 0.6);
    g.fillStyle(0x3a1850, 1); g.fillPoints([{ x: 0, y: H }, { x: 0, y: 110 }, { x: 70, y: 96 }, { x: 140, y: 120 }, { x: 260, y: 92 }, { x: 360, y: 122 }, { x: 470, y: 100 }, { x: 560, y: 118 }, { x: VIEW_W, y: 104 }, { x: VIEW_W, y: H }], true);
    const sc = t * 0.35;
    for (let y = H; y < 240; y += 2) {
      const d = y - H + 1, z = 60 / d, band = Math.floor(z * 6 + sc) % 2, half = 8 + d * 3.4;
      g.fillStyle(band ? 0x10a050 : 0x0c8040, 1); g.fillRect(0, y, VIEW_W, 2);
      g.fillStyle(band ? 0x6a6a74 : 0x60606a, 1); g.fillRect(320 - half, y, half * 2, 2);
      g.fillStyle(band ? 0xffffff : 0xd8323a, 1); g.fillRect(320 - half - half * 0.12, y, half * 0.12, 2); g.fillRect(320 + half, y, half * 0.12, 2);
      if (band) { g.fillStyle(0xffffff, 1); g.fillRect(320 - half * 0.02, y, half * 0.04, 2); }
    }
    for (let i = 0; i < 4; i++) {
      const q = ((t * 0.006 + i / 4) % 1), d = q * q * 100 + 1, y = H + d, half = 8 + d * 3.4, s = d / 40;
      for (const side of [-1, 1]) { const x = 320 + side * (half * 1.3 + 10 * s); g.fillStyle(0x2a1030, 1); g.fillRect(x - 2 * s, y - 50 * s, 4 * s, 50 * s); for (let f = 0; f < 5; f++) { const a = -Math.PI / 2 + (f - 2) * 0.6; g.fillTriangle(x, y - 50 * s, x + Math.cos(a - 0.2) * 24 * s, y - 50 * s + Math.sin(a - 0.2) * 24 * s + 10 * s, x + Math.cos(a) * 26 * s, y - 50 * s + Math.sin(a) * 26 * s + 12 * s); } }
    }
    this.wText(24, 30, 'TIME', '7px', '#ffe060'); this.wText(24, 40, String(Math.max(0, 59 - Math.floor(T.wt / 60))).padStart(2, '0'), '14px', '#ffffff');
    this.wText(244, 9, 'SPEED  ' + (280 + Math.floor(Math.sin(t * 0.05) * 8)) + ' KM/H', '7px', '#ffffff');
    if (T.react > 0 && T.react++ < 120) {
      g.fillStyle(0xffffff, 1); for (let x = 0; x < VIEW_W; x += 16) { g.fillStyle((x / 16) % 2 ? 0xffffff : 0x101010, 1); g.fillRect(x, 56, 16, 8); g.fillStyle((x / 16) % 2 ? 0x101010 : 0xffffff, 1); g.fillRect(x, 64, 16, 8); }
      this.wText(120, 80, 'FINISH!', '16px', '#ffe060', 0.5);
    }
  }
  /** THE ROCK FIELD: lines of light - drifting rocks, a little ship turning and firing; the rocks break when she
   *  takes one. */
  world_rocks(g, T, t) {
    g.fillStyle(0x000000, 1); g.fillRect(0, 0, VIEW_W, VIEW_H);
    for (const [x, y, b] of T.stars) if (b < 0.4) { g.fillStyle(0xffffff, 0.25); g.fillRect(x, y, 1, 1); }
    if (T.react === 1) { T.react = 2; T.rocks = T.rocks.flatMap((r) => (r.r > 14 ? [0, 1].map((i) => ({ ...r, r: r.r * 0.6, vx: r.vx + (i ? 1 : -1) * 0.8, vy: r.vy + (i ? -0.5 : 0.5) })) : [r])); }
    for (const r of T.rocks) {
      r.x = (r.x + r.vx + VIEW_W) % VIEW_W; r.y = ((r.y + r.vy) + 240) % 240; r.a += r.va;
      const pts = r.pts.map((m, i) => { const a = r.a + i * Math.PI * 2 / r.pts.length; return { x: r.x + Math.cos(a) * r.r * m, y: r.y + Math.sin(a) * r.r * m }; });
      g.lineStyle(4, 0xffffff, 0.08); g.strokePoints(pts, true); g.lineStyle(1.5, 0xffffff, 0.95); g.strokePoints(pts, true);
    }
    const sa = t * 0.02, sx = 120, sy = 170, P = (a, d) => ({ x: sx + Math.cos(sa + a) * d, y: sy + Math.sin(sa + a) * d });
    g.lineStyle(1.5, 0xffffff, 1); g.strokePoints([P(0, 12), P(2.5, 9), P(Math.PI, 4), P(-2.5, 9)], true);
    for (let i = 0; i < 4; i++) { const age = (t + i * 12) % 48, a = sa - (age / 48) * 0; const b = { x: sx + Math.cos(a) * (14 + age * 4), y: sy + Math.sin(a) * (14 + age * 4) }; g.fillStyle(0xffffff, 1); g.fillRect(b.x - 1, b.y - 1, 2, 2); }
    this.wText(30, 32, '04380', '12px', '#ffffff');
    for (let i = 0; i < 3; i++) { const x = 34 + i * 12, y = 56; g.lineStyle(1, 0xffffff, 1); g.strokePoints([{ x, y: y - 6 }, { x: x + 4, y: y + 4 }, { x, y: y + 2 }, { x: x - 4, y: y + 4 }], true); }
  }
  /** THE TEXT CAVE: green words on a dark screen, typed out; TAKE LANTERN, and the words go dim. */
  world_text(g, T, t) {
    g.fillStyle(0x031203, 1); g.fillRect(0, 0, VIEW_W, VIEW_H);
    const lines = TEXT_CAVE.concat(T.react ? [''].concat(TEXT_TAKEN) : []).concat(['', '> ' + (t % 40 < 22 ? '_' : '')]);
    let chars = T.wt * 1.4; const col = T.react ? '#2f9a3a' : '#5aff6a';
    if (T.react) { T.react++; chars = 999; }
    lines.slice(0, 13).forEach((s, i) => { const n = Math.max(0, Math.min(s.length, Math.floor(chars))); chars -= s.length; this.wText(24, 30 + i * 13, s.slice(0, n), '7px', i >= TEXT_CAVE.length + 1 && T.react ? '#5aff6a' : col); });
    g.fillStyle(0x000000, 0.22); for (let y = 0; y < 240; y += 3) g.fillRect(0, y, VIEW_W, 1);
    g.fillStyle(0x000000, 0.25); g.fillRect(0, 0, VIEW_W, 10); g.fillRect(0, 0, 10, 240); g.fillRect(VIEW_W - 10, 0, 10, 240);
    if (T.react > 1) { g.fillStyle(0x000000, Math.min(0.45, T.react / 100)); g.fillRect(0, 0, VIEW_W, 240); }
  }

  // ------------------------------------------------------------------ the trinket's card
  /** Opens trinket i's card (the shelf's order); A/D or clicking the sides flips through the ones she has. */
  openTrinket(i) {
    if (this.busyLine() || this.busy) return;
    const list = trinketsOwned(), id = TRINKETS[i].id;
    this.closeOver(true);
    this.overlay = { kind: 'trinket', list, i: Math.max(0, list.indexOf(id)) };
    sfx('item', 0.35, 1.4);
    this.drawTrinket();
  }
  /** Flips to the next / previous trinket on the card. */
  flipTrinket(d) { const o = this.overlay, n = o.list.length; if (n < 2) return; o.i = (o.i + d + n) % n; sfx('menu', 0.4, 1.3); this.drawTrinket(); }
  /** Draws the open trinket card: the trinket big in a glass case, its name, where she found it, its story. */
  drawTrinket() {
    const o = this.overlay, tr = trinketById(o.list[o.i]); this.clearOver();
    markTrinketSeen(tr.id);
    const g = this.overG, X = 60, Y = 30, W = 520, Hh = 300;
    g.fillStyle(0x0a0608, 0.75); g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle(0x3a2214, 1); g.fillRoundedRect(X - 4, Y - 4, W + 8, Hh + 8, 8);
    g.fillStyle(0xf4ecd6, 1); g.fillRoundedRect(X, Y, W, Hh, 6);
    g.lineStyle(2, 0x7c1f30, 1); g.strokeRoundedRect(X + 6, Y + 6, W - 12, Hh - 12, 4);
    // the glass case on its plinth
    const cx = X + 100, cy = Y + 130;
    g.fillStyle(0x1a1420, 1); g.fillRect(cx - 70, cy - 80, 140, 160);
    g.fillStyle(tr.glow, 0.1); g.fillCircle(cx, cy, 62); g.fillStyle(tr.glow, 0.12); g.fillCircle(cx, cy, 40);
    this.trinketArt(g, tr, cx, cy, Math.floor(110 / Math.max(tr.map.length, ...tr.map.map((r) => r.length))), 1, 0);
    g.fillStyle(0xffffff, 0.12); g.fillPoints([{ x: cx - 70, y: cy - 80 }, { x: cx - 40, y: cy - 80 }, { x: cx - 70, y: cy - 30 }], true);
    g.lineStyle(2, 0xd9ab48, 1); g.strokeRect(cx - 70, cy - 80, 140, 160);
    g.fillStyle(0x6b4226, 1); g.fillRect(cx - 78, cy + 80, 156, 14); g.fillStyle(0x86552f, 1); g.fillRect(cx - 78, cy + 80, 156, 3);
    g.fillStyle(0xd9ab48, 1); g.fillRect(cx - 40, cy + 98, 80, 12);
    this.oText(cx, cy + 100, 'No. ' + String(TRINKETS.indexOf(tr) + 1).padStart(2, '0'), '6px', '#3a2410').setOrigin(0.5, 0);
    // the label
    const LX = X + 196;
    this.oText(LX, Y + 18, 'THE ARCHIVIST\'S TRINKETS', '5px', '#8a6a4a');
    this.oText(LX, Y + 30, tr.name, '11px', '#2a1810', { wordWrap: { width: W - 216 } });
    this.oText(LX, Y + 50, 'FROM ' + tr.world + '   /   ' + tr.genre, '5px', '#7c1f30', { wordWrap: { width: W - 216 } });
    this.oText(LX, Y + 66, tr.lore, '6px', '#2a2018', { lineSpacing: 4, wordWrap: { width: W - 216 } });
    this.oText(X + W / 2, Y + Hh - 16, (o.list.length > 1 ? '<   ' : '') + (o.i + 1) + ' / ' + o.list.length + ' ON THE SHELF   (' + o.list.length + ' OF ' + TRINKETS.length + ' FOUND)' + (o.list.length > 1 ? '   >' : ''), '6px', '#5a3a1a').setOrigin(0.5);
    this.oText(VIEW_W / 2, VIEW_H - 9, 'A/D NEXT TRINKET   K / ESC / CLICK OUTSIDE: CLOSE', '5px', '#e8dcc0').setOrigin(0.5);
  }
}

// "Neon Arcade": a synthwave arcade world. A striped sunset sun over a scrolling neon grid, giant
// arcade cabinets on the horizon, and the stage itself is the control panel of a huge cabinet.
// Plays its own music ("Insert Coin", tools/audio/arcade_music.py).
//
// Stage hazards, inspired by famous retro video game moves (original designs, no real characters).
// One at a time, every 10-14 s, each announced with a flashing arcade-style CAUTION banner first:
//   PIXEL WAVE   - an energy-ball special charges at one edge of the screen, then flies across at
//                  standing height. Jump over it! (sometimes one from each side)
//   SPIN DASH    - a spiked wheel revs up at the edge, then blasts across the floor.
//   BLOCK DROP   - three falling puzzle blocks drop from the sky; their shadows show where. Once they
//                  land they are platforms for a few seconds, then blink away.
//   INVADER RAID - a squadron of pixel aliens marches in overhead, stepping side to side and raining
//                  lasers down, then retreats.
import { sfx } from '../audio/sfx.js';
import { FONT } from '../config.js';

export const APAL = {
  outline: 0x0a0418,
  sky: [0x0d0221, 0x150530, 0x1f0a40, 0x2b0f52, 0x3d1462, 0x541d6e, 0x6e2373, 0x8a2876, 0xa52d78, 0xc2357a, 0xe0407c],
  sun: [0xffe56a, 0xffc85a, 0xffa058, 0xff7a62, 0xff5a72, 0xff3f86],
  grid: 0xff3fd0, gridDim: 0x8a2aa0, floor: 0x14042a, star: 0xf0e6ff,
  cab: 0x1a0c34, cabLit: 0x34205e, screen: 0x3ae6ff,
  brick: 0x3a1a6a, brickLit: 0x5a2e9a, brickDark: 0x24104a, neon: 0x3ae6ff, neonPink: 0xff3fd0,
  panel: 0x1c1036, panelLit: 0x2e1c56,
  btn: [0xff3f5a, 0xffd23f, 0x3ae6ff, 0x5aff8a],
  wave: [0x0a2a8a, 0x2a6aff, 0x5ae0ff, 0xc8f8ff, 0xffffff],
  saw: [0x5a0a3a, 0xc8186a, 0xff4fa0, 0xffb8d8],
  blocks: [[0xff3f5a, 0xff8aa0, 0x8a0a2a], [0xffd23f, 0xfff0a0, 0x9a6a00], [0x3ae6ff, 0xb8f8ff, 0x0a6a8a], [0x5aff8a, 0xc8ffd8, 0x0a7a3a], [0xb06aff, 0xe0c0ff, 0x4a1a8a]],
  alien: { D: 0x7aff5a, E: 0x0a2a0a, X: 0xb06aff, L: 0xffd23f, T: 0x7a3ac0 }, laser: 0xff3f5a,
};

// the falling puzzle pieces, as cells (cell = 14 px)
const PIECES = [
  [[0, 0], [1, 0], [2, 0], [3, 0]],        // line
  [[0, 0], [1, 0], [0, 1], [1, 1]],        // square
  [[0, 0], [1, 0], [2, 0], [1, 1]],        // tee
  [[0, 0], [0, 1], [1, 1], [2, 1]],        // hook
  [[1, 0], [2, 0], [0, 1], [1, 1]],        // zigzag
];
const CELL = 14;
// the raiders: little flying saucers with a green pilot under a glass dome, blinking hull lights
// and dangling tentacle-legs (two frames). D dome, E eyes, X hull, L lights, T tentacles
const ALIEN = [
  ['....DDDDD....', '...DDEDEDD...', '..DDDDDDDDD..', '.XXXXXXXXXXX.', 'XXLXXLXXLXXLX', '.XXXXXXXXXXX.', '...T..T..T...', '..T...T...T..'],
  ['....DDDDD....', '...DDEDEDD...', '..DDDDDDDDD..', '.XXXXXXXXXXX.', 'XLXXLXXLXXLXX', '.XXXXXXXXXXX.', '...T..T..T...', '....T.T.T....'],
];

export class ArcadeStage {
  constructor(scene) {
    this.scene = scene;
    this.platforms = [
      { x1: -290, x2: 290, y: 0, solid: true, bottom: 48 },
      { x1: -215, x2: -105, y: -88, solid: false },
      { x1: 105, x2: 215, y: -88, solid: false },
      { x1: -56, x2: 56, y: -172, solid: false },
    ];
    this.base = this.platforms.length;
    this.spawns = [{ x: -150, y: 0 }, { x: 150, y: 0 }, { x: -50, y: 0 }, { x: 50, y: 0 }];
    this.hazardsOn = true;
    this.t = 0;
    this.music = 'bgm_arcade';
    this.hz = null;                              // the hazard in progress
    this.next = 480;                             // first one 8 s in
    this.last = null; this.uid = 0;
  }

  // ---------------------------------------------------------------- drawing
  draw(worldLayer, bgLayer) {
    const s = this.scene, A = APAL;
    // sky: hard synthwave bands, deep purple fading to hot pink at the horizon
    const sky = s.add.graphics().setScrollFactor(0);
    A.sky.forEach((c, i) => { sky.fillStyle(c, 1); sky.fillRect(-400, -60 + i * 26, 1440, 27); });
    for (let i = 0; i < 70; i++) { sky.fillStyle(A.star, (i % 4) ? 0.45 : 0.95); sky.fillRect((i * 263) % 660, (i * 97) % 150, (i % 9) ? 1 : 2, (i % 9) ? 1 : 2); }
    bgLayer.push(sky);
    this.twinkleG = s.add.graphics().setScrollFactor(0); bgLayer.push(this.twinkleG);
    // the striped sunset sun
    const sun = s.add.graphics().setScrollFactor(0.03);
    const sx = 330, sy = 176, R = 74;
    sun.fillStyle(A.sun[5], 0.12); sun.fillCircle(sx, sy, R + 18);
    sun.fillStyle(A.sun[4], 0.12); sun.fillCircle(sx, sy, R + 9);
    for (let y = -R; y <= 0; y += 2) {
      const half = Math.round(Math.sqrt(R * R - y * y)), k = (y + R) / R;
      const gap = y > -R * 0.55 && ((y + R) % 12) >= 12 - Math.round(2 + k * 5);   // the retro stripes
      if (gap) continue;
      sun.fillStyle(A.sun[Math.min(5, Math.floor(k * 6))], 1); sun.fillRect(sx - half, sy + y, half * 2, 2);
    }
    bgLayer.push(sun);
    // giant arcade cabinets on the horizon, their screens glowing
    const cabs = s.add.graphics().setScrollFactor(0.12);
    for (const [cx, h, w] of [[40, 120, 46], [104, 88, 38], [560, 128, 50], [628, 92, 40], [210, 54, 26], [452, 60, 28]]) this.cabinet(cabs, cx, 178, w, h);
    bgLayer.push(cabs);
    this.cabScreens = s.add.graphics().setScrollFactor(0.12); bgLayer.push(this.cabScreens);
    // neon grid floor, scrolling toward you (animated in step)
    this.gridG = s.add.graphics().setScrollFactor(0.2); bgLayer.push(this.gridG);
    // CAUTION banner (screen space, top centre) for incoming hazards
    this.banner = s.add.text(320, 76, '', { fontFamily: FONT, fontSize: '12px', color: '#ffd23f', stroke: '#0a0418', strokeThickness: 5, align: 'center', lineSpacing: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(40).setVisible(false);
    s.addUI(this.banner);                        // on the HUD layer, over everything

    // ---- the stage: the control panel of a giant arcade cabinet
    const g = s.add.graphics(), P = this.platforms[0], w = P.x2 - P.x1;
    // cabinet body under the panel, tapering into the void, with a glowing coin door
    for (let row = 0; row < 12; row++) {
      const y = P.bottom + row * 10, inset = 20 + row * row * 1.2 + row * 6;
      if (w - inset * 2 < 40) break;
      g.fillStyle(A.outline, 1); g.fillRect(P.x1 + inset - 2, y, w - inset * 2 + 4, 10);
      g.fillStyle(row % 2 ? A.cab : A.cabLit, 1); g.fillRect(P.x1 + inset, y, w - inset * 2, 10);
      g.fillStyle(A.neonPink, 0.6); g.fillRect(P.x1 + inset, y, 2, 10); g.fillRect(P.x2 - inset - 2, y, 2, 10);
    }
    for (const dx of [-34, 14]) {                // two coin doors
      g.fillStyle(A.outline, 1); g.fillRect(dx - 2, 60, 24, 36);
      g.fillStyle(0x2a1a4a, 1); g.fillRect(dx, 62, 20, 32);
      g.fillStyle(0xff3f5a, 1); g.fillRect(dx + 6, 68, 8, 10);
      g.fillStyle(0x0a0418, 1); g.fillRect(dx + 9, 70, 2, 6);
    }
    // panel front face (y 0..48): dark with a neon trim, joystick and buttons printed on the front
    g.fillStyle(A.outline, 1); g.fillRect(P.x1 - 3, -3, w + 6, P.bottom + 5);
    g.fillStyle(A.panel, 1); g.fillRect(P.x1, 10, w, P.bottom - 10);
    g.fillStyle(A.panelLit, 1); g.fillRect(P.x1, 10, w, 4);
    g.fillStyle(A.neonPink, 1); g.fillRect(P.x1, P.bottom - 3, w, 2);
    // brick top surface: two rows of retro bricks with a cyan neon edge
    for (let row = 0; row < 2; row++) {
      for (let x = P.x1 + (row ? -8 : 0); x < P.x2; x += 16) {
        const x0 = Math.max(P.x1, x), x1 = Math.min(P.x2, x + 15);
        g.fillStyle(A.brick, 1); g.fillRect(x0, row * 5, x1 - x0, 4);
        g.fillStyle(A.brickLit, 1); g.fillRect(x0, row * 5, x1 - x0, 1);
        g.fillStyle(A.brickDark, 1); g.fillRect(x0, row * 5 + 4, x1 - x0, 1);
      }
    }
    g.fillStyle(A.neon, 1); g.fillRect(P.x1, -1, w, 2);
    g.fillStyle(0xffffff, 0.6); g.fillRect(P.x1, -1, w, 1);
    // joystick (left) and buttons (right) on the front face
    const jx = P.x1 + 70;
    g.fillStyle(A.outline, 1); g.fillCircle(jx, 30, 12);
    g.fillStyle(0x2a2a3a, 1); g.fillCircle(jx, 30, 10);
    g.fillStyle(0x6a6a8a, 1); g.fillRect(jx - 2, 18, 4, 12);
    g.fillStyle(0xff3f5a, 1); g.fillCircle(jx, 17, 6); g.fillStyle(0xffa0b0, 1); g.fillRect(jx - 3, 13, 3, 2);
    A.btn.forEach((c, i) => {
      const bx = P.x2 - 150 + i * 30, by = 30 + (i % 2 ? -4 : 2);
      g.fillStyle(A.outline, 1); g.fillCircle(bx, by, 9);
      g.fillStyle(c, 1); g.fillCircle(bx, by, 7);
      g.fillStyle(0xffffff, 0.6); g.fillRect(bx - 3, by - 4, 3, 2);
    });
    // "1P" / "2P" labels and a speaker grille in the middle
    for (let k = -6; k <= 6; k++) { g.fillStyle(0x0a0418, 1); g.fillRect(k * 7 - 1, 22, 3, 14); }
    worldLayer.push(g);

    // floating neon bar platforms (their lights chase in step) and a game cartridge on top
    const pg = s.add.graphics();
    for (const p of [this.platforms[1], this.platforms[2]]) {
      pg.fillStyle(A.outline, 1); pg.fillRect(p.x1 - 2, p.y - 2, p.x2 - p.x1 + 4, 12);
      pg.fillStyle(A.brickDark, 1); pg.fillRect(p.x1, p.y, p.x2 - p.x1, 8);
      pg.fillStyle(A.neonPink, 1); pg.fillRect(p.x1, p.y, p.x2 - p.x1, 2);
      pg.fillStyle(A.neonPink, 0.25); pg.fillRect(p.x1 + 6, p.y + 10, p.x2 - p.x1 - 12, 6);
    }
    const C = this.platforms[3], cw = C.x2 - C.x1;
    pg.fillStyle(A.outline, 1); pg.fillRect(C.x1 - 2, C.y - 2, cw + 4, 46);
    pg.fillStyle(0x8a8aa0, 1); pg.fillRect(C.x1, C.y, cw, 42);
    pg.fillStyle(0xb8b8cc, 1); pg.fillRect(C.x1, C.y, cw, 3);
    pg.fillStyle(0x5a5a70, 1); for (let k = C.x1 + 6; k < C.x2 - 4; k += 6) pg.fillRect(k, C.y + 4, 2, 6);   // grip ridges
    pg.fillStyle(0x1a0c34, 1); pg.fillRect(C.x1 + 10, C.y + 13, cw - 20, 24);                              // label
    pg.fillStyle(A.sun[0], 1); pg.fillRect(C.x1 + 14, C.y + 17, cw - 28, 3);
    pg.fillStyle(A.neonPink, 1); pg.fillRect(C.x1 + 14, C.y + 23, cw - 28, 3);
    pg.fillStyle(A.neon, 1); pg.fillRect(C.x1 + 14, C.y + 29, cw - 28, 3);
    pg.fillStyle(0x4a4a60, 1); pg.fillRect(C.x1 + 12, C.y + 42, cw - 24, 6);
    pg.fillStyle(0xd8b040, 1); for (let k = C.x1 + 14; k < C.x2 - 12; k += 5) pg.fillRect(k, C.y + 43, 3, 4); // gold contacts
    worldLayer.push(pg);

    this.lightsG = s.add.graphics();
    this.hzBack = s.add.graphics();              // shadows, landed blocks
    this.hzG = s.add.graphics();                 // the hazards themselves
    worldLayer.push(this.lightsG, this.hzBack, this.hzG);
  }

  cabinet(g, cx, baseY, w, h) {
    const A = APAL, x = cx - w / 2, top = baseY - h;
    g.fillStyle(A.cab, 1); g.fillRect(x, top + 10, w, h - 10);
    g.fillRect(x + 3, top, w - 6, 12);                      // marquee
    g.fillStyle(A.cabLit, 1); g.fillRect(x, top + 10, 3, h - 10);
    g.fillStyle(A.neonPink, 0.7); g.fillRect(x + 4, top + 2, w - 8, 6);
    g.fillStyle(0x05020c, 1); g.fillRect(x + 5, top + 18, w - 10, h * 0.32);   // screen bezel
    g.fillStyle(A.cabLit, 1); g.fillRect(x + 2, top + 22 + h * 0.32, w - 4, 6);  // control ledge
  }

  // ---------------------------------------------------------------- per frame
  step(match) {
    this.t++;
    const t = this.t, A = APAL;
    // twinkling stars
    const tw = this.twinkleG; tw.clear();
    for (let i = 0; i < 8; i++) { const on = Math.sin(t * 0.05 + i * 1.9); if (on > 0.6) { const x = (i * 181 + 40) % 640, y = (i * 53) % 140; tw.fillStyle(0xffffff, on); tw.fillRect(x - 2, y, 5, 1); tw.fillRect(x, y - 2, 1, 5); } }
    // neon grid floor scrolling toward the viewer
    const gg = this.gridG; gg.clear();
    const hy = 178, vx = 330;
    gg.fillStyle(A.floor, 1); gg.fillRect(-300, hy, 1300, 400);
    gg.fillStyle(A.grid, 1); gg.fillRect(-300, hy, 1300, 2);
    for (let k = 0; k < 14; k++) {
      const z = ((k + (t * 0.02) % 1) / 14), y = hy + 2 + Math.pow(z, 2.2) * 260;
      gg.fillStyle(A.grid, 0.25 + z * 0.75); gg.fillRect(-300, Math.round(y), 1300, z > 0.5 ? 2 : 1);
    }
    for (let k = -14; k <= 14; k++) { gg.lineStyle(1, A.gridDim, 0.8); gg.lineBetween(vx + k * 8, hy, vx + k * 120, hy + 300); }
    // tiny games playing on the far cabinet screens
    const cs = this.cabScreens; cs.clear();
    for (const [cx, h, w] of [[40, 120, 46], [104, 88, 38], [560, 128, 50], [628, 92, 40]]) {
      const x = cx - w / 2 + 5, y = 178 - h + 18, sw = w - 10, sh = h * 0.32;
      cs.fillStyle(A.screen, 0.18); cs.fillRect(x, y, sw, sh);
      const bx = x + 2 + Math.abs(((t * 0.7 + cx) % (2 * (sw - 4))) - (sw - 4)), by = y + 2 + Math.abs(((t * 0.5 + cx) % (2 * (sh - 4))) - (sh - 4));
      cs.fillStyle(0xffffff, 1); cs.fillRect(Math.round(bx), Math.round(by), 2, 2);          // bouncing ball
      cs.fillStyle(A.screen, 1); cs.fillRect(x + 1, Math.round(by) - 3, 1, 7); cs.fillRect(x + sw - 2, Math.round(by) - 2, 1, 7);
    }
    // chasing lights on the floating bars
    const L = this.lightsG; L.clear();
    for (const p of [this.platforms[1], this.platforms[2]]) {
      for (let x = p.x1 + 4, k = 0; x < p.x2 - 3; x += 8, k++) {
        const on = (k + (t >> 3)) % 4 === 0;
        L.fillStyle(on ? 0xffffff : A.neon, on ? 1 : 0.6); L.fillRect(x, p.y + 4, 4, 2);
      }
    }
    // "INSERT COIN" blink on the coin doors
    if ((t >> 5) % 2) { L.fillStyle(0xff3f5a, 0.5); L.fillRect(-28, 66, 8, 14); L.fillRect(20, 66, 8, 14); }

    return this.hazards(match);
  }

  // ---------------------------------------------------------------- hazards
  hazards(match) {
    const g = this.hzG, b = this.hzBack; g.clear(); b.clear();
    this.banner.setVisible(false);
    const out = [];
    this.stepBlocks(match, out);                  // landed blocks linger even after their hazard ends
    if (!this.hazardsOn) return out;
    if (!this.hz) {
      if (--this.next > 0) return out;
      const kinds = ['wave', 'spin', 'blocks', 'invaders'].filter((k) => k !== this.last);
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      this.last = kind; this.hz = { kind, t: 0, id: ++this.uid };
      this['start_' + kind](match);
      sfx('warn', 0.7);
    }
    const h = this.hz; h.t++;
    if (h.t < 90) {                               // CAUTION banner while it gets ready
      this.banner.setText('CAUTION!\n' + h.title).setVisible(h.t % 16 < 11);
      if (h.t % 30 === 0) sfx('warn', 0.5);
    }
    const done = this['step_' + h.kind](match, h, out);
    if (done) { this.hz = null; this.next = 600 + Math.floor(Math.random() * 240); }
    return out;
  }

  // ---- PIXEL WAVE: a charging energy ball that flies across at standing height
  start_wave() {
    const h = this.hz, side = Math.random() < 0.5 ? -1 : 1;
    h.title = 'PIXEL WAVE - JUMP!';
    h.balls = [{ side, x: side * 296, delay: 0 }];
    if (Math.random() < 0.4) h.balls.push({ side: -side, x: -side * 296, delay: 70 });
  }
  step_wave(match, h, out) {
    const g = this.hzG, A = APAL;
    let alive = 0;
    for (const w of h.balls) {
      const lt = h.t - w.delay;
      if (lt < 0) { alive++; continue; }
      const y = -26;
      if (lt < 80) {                              // charging at the edge: swirling sparks pulled into a growing orb
        alive++;
        const k = lt / 80, r = 4 + k * 10;
        for (let i = 0; i < 8; i++) { const a = lt * 0.3 + i * 0.8, d = 30 * (1 - ((lt + i * 6) % 24) / 24); g.fillStyle(A.wave[2 + (i % 3)], 1); g.fillRect(Math.round(w.x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d), 2, 2); }
        this.orb(g, w.x, y, r, lt);
        if (lt === 79) { sfx('limit', 0.5); match.shake(4, 6); }
        continue;
      }
      w.x -= w.side * 5.6;
      if (Math.abs(w.x) > 420) continue;
      alive++;
      for (let k = 1; k <= 6; k++) { g.fillStyle(A.wave[1 + (k % 3)], 0.5 - k * 0.07); g.fillRect(Math.round(w.x + w.side * k * 7) - 6, y - 7 + (k % 2), 12, 14 - k); }   // trail
      this.orb(g, w.x, y, 14, lt);
      out.push({ x1: w.x - 13, x2: w.x + 13, y1: y - 12, y2: y + 12, dmg: 12, angle: 36, base: 5, growth: 5.2, dirX: -w.side, id: 'wave' + h.id + w.side, hazard: true });
    }
    return h.t > 90 && !alive;
  }
  orb(g, x, y, r, t) {
    const A = APAL, X = Math.round(x), Y = Math.round(y);
    g.fillStyle(A.wave[1], 0.35); g.fillCircle(X, Y, r + 5 + (t % 4 < 2 ? 1 : 0));
    g.fillStyle(A.wave[0], 1); g.fillCircle(X, Y, r);
    g.fillStyle(A.wave[2], 1); g.fillCircle(X, Y, r * 0.75);
    g.fillStyle(A.wave[3], 1); g.fillCircle(X, Y, r * 0.45);
    g.fillStyle(A.wave[4], 1); g.fillRect(X - 2, Y - 2, 4, 4);
    for (let i = 0; i < 3; i++) { const a = t * 0.4 + i * 2.1; g.fillStyle(0xffffff, 0.9); g.fillRect(Math.round(X + Math.cos(a) * r * 0.7), Math.round(Y + Math.sin(a) * r * 0.7), 2, 2); }
  }

  // ---- SPIN DASH: a spiked wheel revs at the edge, then blasts along the floor
  start_spin() {
    const h = this.hz; h.side = Math.random() < 0.5 ? -1 : 1;
    h.title = 'SPIN DASH - GET OFF THE FLOOR!';
    h.x = h.side * 268; h.ang = 0;
  }
  step_spin(match, h, out) {
    const g = this.hzG, A = APAL, y = -14;
    if (h.t < 90) {                               // revving: spins faster and faster, kicking up dust
      h.ang += 0.1 + h.t * 0.012;
      if (h.t % 4 === 0) match.puff(h.x + h.side * 12, -2, 0xff4fa0, 2);
      if (h.t % 12 === 0) sfx('dodge', 0.5, 0.6 + h.t / 90);
    } else {
      if (h.t === 90) { sfx('djump', 0.9, 0.5); match.shake(5, 6); }
      h.x -= h.side * 9; h.ang += 0.9;
      for (let k = 1; k <= 5; k++) { g.fillStyle(A.saw[2], 0.45 - k * 0.08); g.fillRect(Math.round(h.x + h.side * k * 10) - 10, y - 8, 20, 16); }   // speed blur
      for (let k = 0; k < 3; k++) { g.fillStyle(0xffffff, 0.7); g.fillRect(Math.round(h.x + h.side * (20 + k * 14)), y - 10 + k * 8, 18, 1); }        // speed lines
      if (h.t % 2 === 0) match.puff(h.x, -2, 0xffb8d8, 1);
      out.push({ x1: h.x - 13, x2: h.x + 13, y1: y - 13, y2: y + 13, dmg: 11, angle: 55, base: 4.6, growth: 5.4, dirX: -h.side, id: 'spin' + h.id, hazard: true });
    }
    this.saw(g, h.x, y, h.ang);
    return Math.abs(h.x) > 420;
  }
  saw(g, x, y, ang) {
    const A = APAL, X = Math.round(x), Y = Math.round(y);
    for (let i = 0; i < 8; i++) {                 // spikes
      const a = ang + i * Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
      g.fillStyle(i % 2 ? A.saw[3] : A.saw[2], 1);
      g.fillTriangle(X + c * 9 - s * 4, Y + s * 9 + c * 4, X + c * 9 + s * 4, Y + s * 9 - c * 4, X + c * 16, Y + s * 16);
    }
    g.fillStyle(A.outline, 1); g.fillCircle(X, Y, 11);
    g.fillStyle(A.saw[1], 1); g.fillCircle(X, Y, 10);
    g.fillStyle(A.saw[0], 1); g.fillCircle(X, Y, 5);
    g.fillStyle(A.saw[3], 1); g.fillRect(Math.round(X + Math.cos(ang) * 7) - 1, Math.round(Y + Math.sin(ang) * 7) - 1, 3, 3);
  }

  // ---- BLOCK DROP: three puzzle pieces fall where their shadows show, then linger as platforms
  start_blocks(match) {
    const h = this.hz; h.title = 'BLOCK DROP - WATCH THE SHADOWS!';
    h.drops = [];
    const used = [];
    for (let i = 0; i < 3; i++) {
      const shape = PIECES[Math.floor(Math.random() * PIECES.length)], wCells = Math.max(...shape.map((c) => c[0])) + 1, hCells = Math.max(...shape.map((c) => c[1])) + 1;
      let x = 0;
      for (let tries = 0; tries < 20; tries++) {    // aim near fighters, keep pieces apart and on the stage
        const alive = match.fighters.filter((f) => f.alive);
        const tgt = alive.length && Math.random() < 0.7 ? alive[Math.floor(Math.random() * alive.length)].x : (Math.random() - 0.5) * 480;
        x = Math.max(-280 + wCells * CELL / 2, Math.min(280 - wCells * CELL / 2, Math.round(tgt / CELL) * CELL));
        if (used.every((u) => Math.abs(u - x) > 80)) break;
      }
      used.push(x);
      h.drops.push({ shape, wCells, hCells, x, y: -460, vy: 0, at: 40 + i * 45, landed: false, col: APAL.blocks[Math.floor(Math.random() * APAL.blocks.length)] });
    }
  }
  step_blocks(match, h, out) {
    const g = this.hzG, b = this.hzBack;
    let falling = 0;
    for (const d of h.drops) {
      if (d.landed) continue;
      falling++;
      const w = d.wCells * CELL, x0 = d.x - w / 2;
      // shadow on the floor, darker as it gets close
      const k = Math.min(1, Math.max(0.2, (d.y + 460) / 460));
      if ((h.t >> 2) % 2 || h.t > d.at) { b.fillStyle(0x000000, 0.25 + 0.35 * k); b.fillRect(x0 + 4 - 8 * (1 - k), -3, w - 8 + 16 * (1 - k), 3); }
      if (h.t < d.at) continue;
      d.vy = Math.min(14, d.vy + 0.45); d.y += d.vy;
      const hh = d.hCells * CELL;
      if (d.y + hh >= 0) {                          // landed
        d.y = -hh; d.landed = true; d.life = 330;
        match.shake(8, 6); sfx('bighit', 0.6, 0.7); match.puff(d.x, -2, d.col[0], 12);
        d.plat = { x1: x0, x2: x0 + w, y: d.y, solid: false, block: true };
        this.platforms.push(d.plat);
        this.landed = this.landed || []; this.landed.push(d);
      }
      this.drawPiece(g, d);
      out.push({ x1: x0, x2: x0 + w, y1: d.y, y2: d.y + hh, dmg: 14, angle: 72, base: 4.4, growth: 5, id: 'block' + h.id + ':' + d.x, hazard: true });
    }
    return h.t > 60 && falling === 0;
  }
  // landed pieces: platforms for 4 s, then they blink and vanish (anyone standing on one drops)
  stepBlocks(match) {
    if (!this.landed) return;
    for (const d of this.landed) {
      d.life--;
      if (d.life > 60 || (d.life >> 2) % 2) this.drawPiece(this.hzBack, d);
      if (d.life <= 0) {
        this.platforms.splice(this.platforms.indexOf(d.plat), 1);
        for (const f of match.fighters) if (f.platform === d.plat) { f.grounded = false; f.platform = null; if (['idle', 'run', 'land'].includes(f.state)) f.setState('air'); }
        match.puff(d.x, d.y + 10, d.col[1], 10); sfx('item', 0.5, 0.8);
      }
    }
    this.landed = this.landed.filter((d) => d.life > 0);
  }
  drawPiece(g, d) {
    const x0 = d.x - d.wCells * CELL / 2;
    for (const [cx, cy] of d.shape) {
      const x = Math.round(x0 + cx * CELL), y = Math.round(d.y + cy * CELL);
      g.fillStyle(APAL.outline, 1); g.fillRect(x, y, CELL, CELL);
      g.fillStyle(d.col[0], 1); g.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      g.fillStyle(d.col[1], 1); g.fillRect(x + 1, y + 1, CELL - 2, 2); g.fillRect(x + 1, y + 1, 2, CELL - 2);
      g.fillStyle(d.col[2], 1); g.fillRect(x + 1, y + CELL - 3, CELL - 2, 2); g.fillRect(x + CELL - 3, y + 1, 2, CELL - 2);
    }
  }

  // ---- INVADER RAID: a squadron marches in overhead and rains lasers
  start_invaders() {
    const h = this.hz; h.title = 'INVADER RAID - DODGE THE LASERS!';
    h.aliens = []; h.lasers = [];
    for (let i = 0; i < 6; i++) h.aliens.push({ col: i, row: i % 2, cool: 60 + Math.floor(Math.random() * 90), alive: true });
    h.oy = -330;
  }
  step_invaders(match, h, out) {
    const g = this.hzG, A = APAL, S = 3;           // each alien pixel is 3x3
    const leaving = h.t > 560;
    if (h.t < 80) h.oy += 2;                         // fly in
    else if (leaving) h.oy -= 3;                     // retreat
    const step = Math.floor(h.t / 22), march = ((step % 8) < 4 ? step % 4 : 4 - (step % 4)) * 24 - 48;
    const fr = step % 2;
    for (const a of h.aliens) {
      const ax = -150 + a.col * 60 + march, ay = h.oy + a.row * 26;
      a.x = ax; a.y = ay;
      ALIEN[fr].forEach((row, r) => { for (let c = 0; c < row.length; c++) { const col = A.alien[row[c]]; if (col !== undefined) { g.fillStyle(col, 1); g.fillRect(ax - 19 + c * S, ay + r * S, S, S); } } });
      g.fillStyle(0xffffff, 0.6); g.fillRect(ax - 7, ay + 2, 3, 2);                                       // glint on the dome
      g.fillStyle(A.laser, 0.25 + 0.2 * Math.sin(h.t * 0.3 + a.col)); g.fillRect(ax - 9, ay + 18, 18, 3);  // tractor glow
      if (h.t > 80 && !leaving && --a.cool <= 0) {
        a.cool = 70 + Math.floor(Math.random() * 60);
        h.lasers.push({ x: ax, y: ay + 26, id: ++this.uid });
        sfx('soulhit', 0.35, 1.6);
      }
    }
    for (const l of h.lasers) {
      l.y += 4.6;
      g.fillStyle(A.laser, 0.4); g.fillRect(Math.round(l.x) - 3, Math.round(l.y) - 14, 7, 16);
      g.fillStyle(A.laser, 1); g.fillRect(Math.round(l.x) - 1, Math.round(l.y) - 12, 3, 12);
      g.fillStyle(0xffffff, 1); g.fillRect(Math.round(l.x), Math.round(l.y) - 10, 1, 8);
      out.push({ x1: l.x - 4, x2: l.x + 4, y1: l.y - 12, y2: l.y, dmg: 5, angle: 82, base: 2.6, growth: 3, id: 'laser' + l.id, hazard: true });
      const P = this.platforms[0];
      if (l.y >= 0 && l.x > P.x1 && l.x < P.x2) { l.dead = true; match.puff(l.x, -2, A.laser, 4); }
      if (l.y > 400) l.dead = true;
    }
    h.lasers = h.lasers.filter((l) => !l.dead);
    return leaving && h.oy < -420 && !h.lasers.length;
  }
}

// Miniature of Neon Arcade drawn into a box (x, y, w, h), for the stage select screen.
export function drawArcadePreview(g, x, y, w, h) {
  const A = APAL, u = w / 100, v = h / 100;
  const bh = Math.ceil(h * 0.6 / A.sky.length);
  A.sky.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(x, y + i * bh, w, Math.min(bh, h * 0.6 - i * bh)); });
  for (let yy = -16; yy <= 0; yy += 1.5) {             // striped sun
    const half = Math.sqrt(256 - yy * yy) * v * 1.4, k = (yy + 16) / 16;
    if (yy > -9 && Math.floor(yy) % 3 === 0) continue;
    g.fillStyle(A.sun[Math.min(5, Math.floor(k * 6))], 1); g.fillRect(x + 50 * u - half, y + (56 + yy) * v, half * 2, 1.4 * v);
  }
  g.fillStyle(A.floor, 1); g.fillRect(x, y + 58 * v, w, 42 * v);
  g.fillStyle(A.grid, 1); g.fillRect(x, y + 58 * v, w, 1);
  for (let k = 0; k < 5; k++) { g.fillStyle(A.grid, 0.5 + k * 0.1); g.fillRect(x, y + (60 + k * k * 2) * v, w, 1); }
  for (let k = -5; k <= 5; k++) {                     // grid lines, clipped to the box
    const x0 = x + 50 * u + k * 2 * u, y0 = y + 58 * v; let x1 = x + 50 * u + k * 14 * u, y1 = y + h;
    if (x1 < x || x1 > x + w) { const ex = x1 < x ? x : x + w, f = (ex - x0) / (x1 - x0); x1 = ex; y1 = y0 + (y1 - y0) * f; }
    g.lineStyle(1, A.gridDim, 0.8); g.lineBetween(x0, y0, x1, y1);
  }
  for (const [cx, ch] of [[8, 30], [92, 32]]) { g.fillStyle(A.cab, 1); g.fillRect(x + (cx - 5) * u, y + (58 - ch) * v, 10 * u, ch * v); g.fillStyle(A.neonPink, 1); g.fillRect(x + (cx - 4) * u, y + (59 - ch) * v, 8 * u, 2 * v); }
  // the panel stage, bars and cartridge
  g.fillStyle(A.panel, 1); g.fillRect(x + 12 * u, y + 72 * v, 76 * u, 12 * v);
  g.fillStyle(A.brick, 1); g.fillRect(x + 12 * u, y + 70 * v, 76 * u, 3 * v);
  g.fillStyle(A.neon, 1); g.fillRect(x + 12 * u, y + 70 * v, 76 * u, 1);
  A.btn.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(x + (62 + i * 5) * u, y + 77 * v, 3 * u, 3 * v); });
  g.fillStyle(A.neonPink, 1); g.fillRect(x + 22 * u, y + 56 * v, 16 * u, 2 * v); g.fillRect(x + 62 * u, y + 56 * v, 16 * u, 2 * v);
  g.fillStyle(0x8a8aa0, 1); g.fillRect(x + 43 * u, y + 24 * v, 14 * u, 8 * v); g.fillStyle(A.neonPink, 1); g.fillRect(x + 45 * u, y + 27 * v, 10 * u, 1.5 * v);
  // a falling block and a pixel wave for flavour
  g.fillStyle(A.blocks[1][0], 1); g.fillRect(x + 30 * u, y + 20 * v, 4 * u, 4 * v); g.fillRect(x + 34 * u, y + 20 * v, 4 * u, 4 * v); g.fillRect(x + 34 * u, y + 24 * v, 4 * u, 4 * v);
  g.fillStyle(A.wave[2], 1); g.fillCircle(x + 80 * u, y + 66 * v, 2.4 * u); g.fillStyle(0xffffff, 1); g.fillRect(x + 79.4 * u, y + 65 * v, 1.2 * u, 1.6 * v);
}

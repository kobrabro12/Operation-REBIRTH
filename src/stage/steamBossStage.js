// BRASS FOUNDRY - the arena of THE CLOCKWORK COLOSSUS (boss I, steampunk; Trinkets > BOSS FIGHTS, src/data/bosses.js).
// A riveted iron deck inside a giant foundry at dusk: brick walls, arched windows onto a sky full of smokestacks and
// an airship, great gears turning on the wall, copper pipes, hanging lamps, a furnace glowing under the deck.
// Behind the deck stands the COLOSSUS (waist-up, brass plates, a boiler-helmet head with goggle eyes, a furnace in
// its chest), its two piston arms reaching over the deck.
//   Weak point: the FURNACE HEART in its chest (x1). Its head takes x0.7, a fist resting on the deck x0.5. After its
//   STEAM VENT attack it OVERHEATS: it slumps forward and the white-hot heart takes x1.6.
//   Attacks: PISTON SLAM (a fist tracks you overhead, then slams; ENRAGED: both fists), FLOOR SWEEP (a fist sweeps the
//   deck - jump it), COG SAWS (spinning cogs bounce out of its chest and roll across), STEAM VENT (the floor grates
//   blast steam, then it overheats), RIVET RAIN (ENRAGED: hot rivets fall on marked spots).
// Stage hazards (also in VS, where the Colossus stands switched off): PIPE BURST (a wall pipe blasts steam across the
// catwalks) and CRANE DROP (the overhead crane drops a crate on a marked spot).
import { HazardCycle } from './hazardCycle.js';
import { BossArena } from './bossBase.js';
import { sfx } from '../audio/sfx.js';

// sepia brass & iron palette, banded (16-bit look)
const C = { out: 0x1a0e08, brass: [0x6a4210, 0x9a6a20, 0xc8962e, 0xf0c860, 0xfff0b0], copper: [0x5a2410, 0x8a3a18, 0xc06030, 0xe89058],
  iron: [0x1c1a20, 0x2e2c34, 0x45424c, 0x625e68, 0x8a8690], brick: [0x3a1a14, 0x4e2418, 0x62301e], glow: [0xff5a10, 0xffa020, 0xffe070, 0xfffbe0],
  sky: [0x3a1e2e, 0x5e2e32, 0x8e4434, 0xc8683a, 0xf0a048, 0xffd070], steam: 0xf2ece4 };
// where the Colossus stands (its chest), how far it slumps when it overheats, and how far its arms reach
const COL = { coreY: -128, headY: -212, shoulderY: -182, shoulderX: 80, lean: 46, upper: 82, fore: 86, rest: [150, -110] };
// PISTON SLAM: frames tracking overhead, the drop, how long the fist rests in the deck, its hit and the shockwave's
const SLAM = { track: 56, high: -236, drop: 9, rest: 50, hit: [14, [62, 6.5, 1.0]], wave: [6, [30, 4.5, 0.6]], waveW: 80 };
// FLOOR SWEEP: wind-up at the side (frames), the sweep, its hit
const SWEEP = { wind: 50, cross: 42, edge: 330, hit: [12, [42, 6.2, 0.9]] };
// COG SAWS: how many (normal / enraged), frames between them, roll speed, size, hit
const COGS = { n: [2, 3], every: 20, speed: 3.1, r: 15, hit: [9, [40, 5, 0.7]] };
// STEAM VENT: the grates (x), warning frames, blast frames, its hit; then OVERHEATED for `hot` frames (heart x1.6)
const VENT = { xs: [-180, 0, 180], warn: 54, blast: 56, hit: [8, [88, 6, 0.6]], hot: 170 };
// RIVET RAIN (enraged): how many, frames between, warning per rivet, hit
const RIVETS = { n: 7, every: 9, warn: 46, hit: [7, [80, 4.5, 0.5]] };
// PIPE BURST hazard: the jet's height band, how long it builds and blasts, its hit (it ticks every `tick` frames)
const PIPE = { y1: -118, y2: -78, build: 60, blast: 80, tick: 20, hit: [5, [18, 4.5, 0.4]] };
// CRANE DROP hazard: the rail's height, travel frames, the crate's size, its hit
const CRANE = { rail: -300, travel: 90, w: 46, h: 40, hit: [13, [80, 6, 0.9]] };

/** BRASS FOUNDRY and its Colossus (see the top of the file). */
export class SteamBossStage extends BossArena {
  constructor(scene) {
    super();
    this.scene = scene; this.t = 0; this.hazardsOn = true; this.music = 'bgm_boss_colossus';
    this.platforms = [
      { x1: -260, x2: 260, y: 0, solid: true, bottom: 60 },
      { x1: -220, x2: -118, y: -92, solid: false },
      { x1: 118, x2: 220, y: -92, solid: false },
    ];
    this.spawns = [{ x: -110, y: 0 }, { x: 110, y: 0 }, { x: -40, y: 0 }, { x: 40, y: 0 }];
    this.cycle = new HazardCycle(this, ['pipe', 'crane'], { color: '#ffc860', stroke: '#2a1408', gap: 720 });
    this.fists = [{ x: -COL.rest[0], y: COL.rest[1], s: -1 }, { x: COL.rest[0], y: COL.rest[1], s: 1 }];
    this.lean = 0; this.sink = 0; this.dark = false; this.hot = 0; this.chest = 0; this.cogs = []; this.rivets = []; this.puffs = []; this.crane = null; this.jet = null;
    this.sparkColor = 0xffa020; this.bodyW = 190; this.bodyH = 170;
  }

  /** Builds the foundry: the dusk sky through the windows (background), the walls, gears, pipes, the deck. */
  draw(world, bg) {
    const s = this.scene;
    const sky = s.add.graphics().setScrollFactor(0.15); bg.push(sky); this.paintSky(sky);
    const wall = s.add.graphics(); world.push(wall); this.paintWall(wall);
    this.gearG = s.add.graphics(); world.push(this.gearG);
    this.bossG = s.add.graphics(); world.push(this.bossG);
    const deck = s.add.graphics(); world.push(deck); this.paintDeck(deck);
    this.armG = s.add.graphics(); world.push(this.armG);
    this.fxG = s.add.graphics(); world.push(this.fxG);
    this.cycle.makeBanner(s);
  }

  /** The sky through the windows: dusk bands, a low sun, smokestacks and an airship far off. */
  paintSky(g) {
    const W = 1400, x0 = -700, y0 = -420;
    C.sky.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(x0, y0 + i * 70, W, 72); });
    g.fillStyle(0xffe0a0, 1); g.fillCircle(150, -70, 46); g.fillStyle(0xfff4d0, 1); g.fillCircle(150, -70, 34);
    for (let i = 0; i < 14; i++) {                                                     // the factory town's chimneys
      const x = x0 + 40 + i * 100 + (i % 3) * 17, h = 120 + (i * 37) % 90;
      g.fillStyle(0x2a1620, 1); g.fillRect(x, 20 - h, 18, h + 200); g.fillRect(x - 3, 20 - h, 24, 8);
      g.fillStyle(0x3a2230, 1); g.fillRect(x - 30, 60 - (i * 23) % 50, 70, 200);
    }
    g.fillStyle(0x4a2a30, 1); g.fillEllipse(-260, -250, 150, 46); g.fillRect(-300, -232, 70, 16);     // an airship
    g.fillStyle(0x6a3a34, 1); g.fillEllipse(-260, -258, 130, 22);
    g.fillStyle(0x2a1620, 1); g.fillRect(-196, -262, 10, 24); g.fillTriangle(-188, -262, -176, -276, -176, -248);
  }

  /** The foundry walls (world space, behind everything): bricks, arched windows, pipes, gauges, lamps. */
  paintWall(g) {
    g.fillStyle(C.brick[0], 1); g.fillRect(-700, -460, 1400, 520);
    for (let y = -460; y < 60; y += 12) for (let x = -700 + ((y / 12) % 2) * 14; x < 700; x += 28) { g.fillStyle(C.brick[1 + ((x * 7 + y * 3) & 1)], 1); g.fillRect(x + 1, y + 1, 26, 10); }
    for (const wx of [-470, -330, 330, 470]) {                                         // arched windows (the sky shows through)
      g.fillStyle(C.out, 1); g.fillRect(wx - 46, -330, 92, 230); g.fillCircle(wx, -330, 46);
    }
    this.windows = [-470, -330, 330, 470];
    // the windows are cut out by drawing the sky colours straight in (the wall is in front of the background)
    for (const wx of this.windows) {
      for (let i = 0; i < 6; i++) { g.fillStyle(C.sky[i], 1); g.fillRect(wx - 40, -370 + i * 46, 80, 46); }
      g.fillStyle(C.sky[0], 1); g.fillCircle(wx, -330, 40); g.fillRect(wx - 40, -330, 80, 4);
      g.fillStyle(0x2a1620, 1); for (let k = 0; k < 3; k++) g.fillRect(wx - 34 + k * 26, -200 + (k * 23) % 40, 14, 100);
      g.fillStyle(C.iron[1], 1); g.fillRect(wx - 2, -372, 4, 268); g.fillRect(wx - 40, -250, 80, 4); g.fillRect(wx - 40, -170, 80, 4);
      g.lineStyle(4, C.iron[2], 1); g.strokeCircle(wx, -330, 42); g.lineStyle(0);
      g.fillStyle(C.iron[2], 1); g.fillRect(wx - 44, -104, 88, 8);
    }
    // copper pipes along the wall, with valves and gauges
    for (const [y, x1, x2] of [[-300, -700, -120], [-300, 120, 700], [-36, -700, 700], [-140, -700, -260], [-140, 260, 700]]) {
      g.fillStyle(C.copper[0], 1); g.fillRect(x1, y - 7, x2 - x1, 14); g.fillStyle(C.copper[2], 1); g.fillRect(x1, y - 5, x2 - x1, 6); g.fillStyle(C.copper[3], 1); g.fillRect(x1, y - 4, x2 - x1, 2);
      for (let x = x1 + 30; x < x2; x += 90) { g.fillStyle(C.brass[1], 1); g.fillRect(x - 4, y - 9, 8, 18); g.fillStyle(C.brass[3], 1); g.fillRect(x - 3, y - 8, 2, 16); }
    }
    for (const [x, y] of [[-560, -200], [560, -200], [-250, -260], [250, -260]]) {        // pressure gauges
      g.fillStyle(C.brass[1], 1); g.fillCircle(x, y, 15); g.fillStyle(0xf4ecd8, 1); g.fillCircle(x, y, 11);
      g.lineStyle(2, 0xc02818, 1); g.lineBetween(x, y, x + 7, y - 6); g.lineStyle(0); g.fillStyle(C.out, 1); g.fillCircle(x, y, 2);
    }
    for (const x of [-600, -200, 200, 600]) {                                            // hanging lamps
      g.fillStyle(C.iron[1], 1); g.fillRect(x - 1, -460, 2, 120); g.fillStyle(C.brass[1], 1); g.fillTriangle(x - 16, -332, x + 16, -332, x, -346);
      g.fillStyle(C.glow[2], 1); g.fillRect(x - 6, -332, 12, 8); g.fillStyle(C.glow[1], 0.12); g.fillCircle(x, -322, 46);
    }
    // the crane rail across the ceiling
    g.fillStyle(C.iron[1], 1); g.fillRect(-700, CRANE.rail - 14, 1400, 10); g.fillStyle(C.iron[3], 1); g.fillRect(-700, CRANE.rail - 14, 1400, 2);
    for (let x = -680; x < 700; x += 60) { g.fillStyle(C.iron[0], 1); g.fillRect(x, CRANE.rail - 60, 6, 50); }
  }

  /** The deck (in front of the Colossus): riveted iron plate, brass trim, hazard stripes, vent grates, trusses, furnace glow. */
  paintDeck(g) {
    const [m, l, r] = this.platforms;
    g.fillStyle(C.glow[0], 0.18); g.fillEllipse(0, 60, 420, 80); g.fillStyle(C.glow[1], 0.12); g.fillEllipse(0, 50, 260, 50);   // the furnace below
    for (let x = m.x1 + 20; x < m.x2; x += 52) { g.fillStyle(C.iron[0], 1); g.fillTriangle(x, 14, x + 26, 60, x + 52, 14); g.fillStyle(C.iron[1], 1); g.fillTriangle(x + 6, 14, x + 26, 50, x + 46, 14); }   // trusses
    g.fillStyle(C.iron[0], 1); g.fillRect(m.x1 + 16, 56, m.x2 - m.x1 - 32, 6);
    g.fillStyle(C.out, 1); g.fillRect(m.x1 - 2, -2, m.x2 - m.x1 + 4, 20);
    g.fillStyle(C.iron[2], 1); g.fillRect(m.x1, 0, m.x2 - m.x1, 10); g.fillStyle(C.iron[3], 1); g.fillRect(m.x1, 0, m.x2 - m.x1, 3);
    g.fillStyle(C.brass[2], 1); g.fillRect(m.x1, 10, m.x2 - m.x1, 6); g.fillStyle(C.brass[3], 1); g.fillRect(m.x1, 10, m.x2 - m.x1, 2);
    for (let x = m.x1 + 6; x < m.x2; x += 16) { g.fillStyle(C.iron[4], 1); g.fillRect(x, 5, 2, 2); g.fillStyle(C.brass[0], 1); g.fillRect(x + 4, 13, 2, 2); }
    for (const [x1, s] of [[m.x1, 1], [m.x2 - 30, -1]]) for (let k = 0; k < 5; k++) { g.fillStyle(k % 2 ? 0x1a1410 : 0xf0c020, 1); g.fillRect(x1 + k * 6, 0, 6, 10); }
    for (const vx of VENT.xs) {                                                            // the vent grates
      g.fillStyle(C.out, 1); g.fillRect(vx - 20, -1, 40, 6); for (let k = 0; k < 5; k++) { g.fillStyle(C.iron[3], 1); g.fillRect(vx - 18 + k * 8, 0, 4, 4); }
    }
    for (const p of [l, r]) {                                                               // the catwalks: grating on brackets
      g.fillStyle(C.out, 1); g.fillRect(p.x1 - 1, p.y - 1, p.x2 - p.x1 + 2, 8);
      g.fillStyle(C.iron[3], 1); g.fillRect(p.x1, p.y, p.x2 - p.x1, 5); for (let x = p.x1 + 3; x < p.x2; x += 6) { g.fillStyle(C.iron[1], 1); g.fillRect(x, p.y + 1, 2, 3); }
      g.fillStyle(C.brass[2], 1); g.fillRect(p.x1, p.y - 14, 2, 14); g.fillRect(p.x2 - 2, p.y - 14, 2, 14); g.fillRect(p.x1, p.y - 14, p.x2 - p.x1, 2);
      const sx = p.x1 < 0 ? p.x1 + 6 : p.x2 - 6; g.fillStyle(C.iron[1], 1); g.fillRect(sx - 2, p.y + 5, 4, 30); g.fillTriangle(sx - 2, p.y + 5, sx + (p.x1 < 0 ? 26 : -26), p.y + 5, sx - 2, p.y + 30);
    }
  }

  // ------------------------------------------------------------------ the Colossus
  /** The boss's own state when the fight starts. */
  makeBoss() { this.cycle.gap = 1200; this.cycle.next = 1500; }
  /** The chest (its furnace heart): what the camera, the death and the CPU aim at. */
  core() { return { x: 0, y: COL.coreY + this.lean * COL.lean + this.sink }; }
  /** Where the Colossus can be hit: its heart (white-hot = x1.6 while overheated), its head, a fist resting on the deck. */
  hurt() {
    const c = this.core(), hy = COL.headY + this.lean * (COL.lean + 10), out = [];
    out.push({ x1: c.x - 30, y1: c.y - 30, x2: c.x + 30, y2: c.y + 30, mult: this.hot > 0 ? 1.6 : 1 });
    out.push({ x1: -26, y1: hy - 24, x2: 26, y2: hy + 18, mult: 0.7 });
    for (const f of this.fists) if (f.resting) out.push({ x1: f.x - 28, y1: f.y - 22, x2: f.x + 28, y2: f.y + 22, mult: 0.5 });
    return out;
  }
  /** Attacks it can pick: normal, then enraged. */
  pattern(phase) { return phase === 1 ? ['slam', 'sweep', 'cogs', 'vent', 'slam'] : ['slam', 'sweep', 'cogs', 'vent', 'rivets', 'slam']; }
  /** At rest: fists hover by its sides, bobbing. */
  idle() { for (const f of this.fists) this.toward(f, f.s * COL.rest[0] + Math.sin(this.t * 0.04 + f.s) * 6, COL.rest[1] + Math.sin(this.t * 0.05 + f.s * 2) * 8, 0.08); }
  /** Moves a fist part of the way toward a point. */
  toward(f, x, y, k) { f.x += (x - f.x) * k; f.y += (y - f.y) * k; }
  rageLine() { return 'PRESSURE CRITICAL!'; }
  /** The freeze frame frames its head and both raised fists. */
  introAt() { return { x: 0, y: COL.headY + 40, zoom: 1.0 }; }

  /**
   * THE ENTRANCE (k = 0..1 through it): it rises from below the deck, dark, the floor rumbling and steam pouring
   * off the edge; its eyes and furnace ignite; then it throws both fists up overhead, its stacks blasting steam -
   * the pose the freeze frame stops on.
   */
  introPose(match, k, t) {
    this.t++;
    const e = (a, b) => Phaser.Math.Clamp((k - a) / (b - a), 0, 1), ease = (q) => 1 - (1 - q) * (1 - q);
    const rise = ease(e(0.05, 0.55));
    this.sink = 300 * (1 - rise); this.lean = 0.6 * (1 - e(0.55, 0.7)); this.dark = k < 0.62;
    if (k < 0.55 && t % 10 === 0) { match.shake(4, 8); sfx('rumble', 0.4, 0.8); }
    if (k < 0.6 && t % 3 === 0) for (const x of [-250, 250]) this.puff(x + (Math.random() - 0.5) * 40, 4, 1.2, -1.6);
    if (t === Math.round(0.62 * 140)) { sfx('clang', 1, 0.5); sfx('flame', 0.7, 0.6); }
    const up = ease(e(0.7, 0.92));
    for (const f of this.fists) {
      const hx = f.s * 150, hy = -110 + this.sink, px = f.s * 120, py = -268;
      f.x = hx + (px - hx) * up; f.y = hy + (py - hy) * up; f.resting = false;
    }
    this.chest = 0.5 * up;
    if (t === Math.round(0.9 * 140)) { sfx('geyser', 1, 0.6); for (let i = 0; i < 16; i++) this.puff((i % 2 ? -1 : 1) * 90 + (Math.random() - 0.5) * 20, COL.shoulderY - 70, 1.5, -2.5); }
    for (const p of this.puffs) { p.t++; p.x += p.vx; p.y += p.vy; p.r += 0.25; }
    this.puffs = this.puffs.filter((p) => p.t < p.life);
  }

  /** PISTON SLAM: a fist tracks the nearest player from high above (a shadow on the deck), slams down, rests a moment. */
  start_slam(match, a) {
    const tg = this.nearest(match); a.fists = this.boss.phase === 2 ? [0, 1] : [tg && tg.x > 0 ? 1 : 0]; a.i = 0; a.p = 0; a.tx = tg ? tg.x : 0;
  }
/** PISTON SLAM, frame by frame: track overhead, drop, rest in the deck (with a shockwave), then the next fist or back. */
  atk_slam(match, a, out) {
    const f = this.fists[a.fists[a.i]], tg = this.nearest(match, f.x);
    const track = this.sp(SLAM.track) + (a.i ? -12 : 0), tt = a.t - a.p;
    f.resting = false;
    if (tt < track) {                                                                      // up high, following them
      if (tg) a.tx += Math.max(-4.2, Math.min(4.2, Phaser.Math.Clamp(tg.x, -230, 230) - a.tx));
      this.toward(f, a.tx, SLAM.high, 0.16); f.shadow = { x: a.tx, k: tt / track };
      if (tt === 1) sfx('geyser', 0.4, 1.6);
    } else if (tt < track + SLAM.drop) {                                                    // the drop
      f.x = a.tx; f.y = SLAM.high + (-22 - SLAM.high) * ((tt - track + 1) / SLAM.drop); f.shadow = { x: a.tx, k: 1 };
      out.push(this.bhit('slam' + a.id + a.i, f.x - 30, f.y - 24, f.x + 30, f.y + 24, ...SLAM.hit));
    } else if (tt < track + SLAM.drop + this.sp(SLAM.rest) + 20) {                          // rests in the deck
      const k = tt - track - SLAM.drop; f.shadow = null; f.resting = true; f.y = -22;
      if (k === 0) {
        sfx('bighit', 1, 0.6); sfx('clang', 0.8, 0.5); match.shake(9, 12);
        for (let i = 0; i < 16; i++) match.particles.push({ x: f.x + (Math.random() - 0.5) * 60, y: -2, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 3, life: 24, color: i % 2 ? C.steam : 0xc8b090, size: 3, drag: 0.9 });
      }
      if (k < 8) { const w = SLAM.waveW * (1 + k / 4); out.push(this.bhit('wave' + a.id + a.i, f.x - w, -16, f.x - 30, 0, ...SLAM.wave, { dirX: -1 }), this.bhit('wavr' + a.id + a.i, f.x + 30, -16, f.x + w, 0, ...SLAM.wave, { dirX: 1 })); }
    } else {
      f.resting = false;
      if (a.i + 1 < a.fists.length) { a.i++; a.p = a.t; a.tx = tg ? tg.x : 0; return false; }
      this.toward(f, f.s * COL.rest[0], COL.rest[1], 0.12);
      if (tt > track + SLAM.drop + this.sp(SLAM.rest) + 50) return true;
    }
    return false;
  }

  /** FLOOR SWEEP: a fist drops to one side of the deck (steam hissing), then sweeps right across it at floor height. */
  start_sweep(match, a) { const tg = this.nearest(match); a.s = tg && tg.x > 0 ? -1 : 1; if (Math.random() < 0.3) a.s = -a.s; a.f = this.fists[a.s < 0 ? 0 : 1]; }
/** FLOOR SWEEP, frame by frame: wind up at the edge, sweep across at floor height, return. */
  atk_sweep(match, a, out) {
    const f = a.f, wind = this.sp(SWEEP.wind), cross = this.sp(SWEEP.cross);
    if (a.t < wind) { this.toward(f, a.s * SWEEP.edge, -24, 0.1); if (a.t % 6 === 0) this.puff(f.x - a.s * 10, -10, 1); if (a.t === 1) sfx('geyser', 0.6, 0.8); }
    else if (a.t < wind + cross) {
      const k = (a.t - wind) / cross; f.x = a.s * SWEEP.edge * (1 - 2 * k); f.y = -24;
      out.push(this.bhit('sweep' + a.id, f.x - 32, -48, f.x + 32, 0, ...SWEEP.hit, { dirX: -a.s }));
      if (a.t % 3 === 0) match.particles.push({ x: f.x, y: -2, vx: a.s * 2, vy: -1.5, life: 14, color: 0xffd070, size: 2 });
      if (a.t === wind) sfx('whoosh', 0.9, 0.6);
    } else { this.toward(f, f.s * COL.rest[0], COL.rest[1], 0.1); if (a.t > wind + cross + 40) return true; }
    return false;
  }

  /** COG SAWS: the chest grate swings open and spinning cogs bounce out, rolling across the deck. */
  atk_cogs(match, a, out) {
    const n = COGS.n[this.boss.phase - 1], open = this.sp(36);
    this.chest = Math.min(1, a.t / 20);
    if (a.t >= open && a.t < open + n * COGS.every && (a.t - open) % COGS.every === 0) {
      const tg = this.nearest(match), c = this.core(), dir = tg ? Math.sign(tg.x - c.x) || 1 : 1;
      this.cogs.push({ x: c.x, y: c.y, vx: dir * (1.4 + Math.random()), vy: -3.5, a: 0, id: this.sid('cog'), dir });
      sfx('clang', 0.7, 1.4); sfx('shing', 0.4, 0.7);
    }
    this.stepCogs(match, out);
    if (a.t > open + n * COGS.every) this.chest = Math.max(0, this.chest - 0.05);
    return a.t > open + n * COGS.every && !this.cogs.length;
  }
  /** Cogs fly, land, roll toward the edge and fall off. */
  stepCogs(match, out) {
    for (const g of this.cogs) {
      g.vy += 0.3; g.x += g.vx; g.y += g.vy; g.a += g.vx * 0.12;
      if (g.y > -COGS.r && Math.abs(g.x) < 260 && g.vy > 0) { g.y = -COGS.r; g.vy = Math.abs(g.vy) > 2 ? -g.vy * 0.35 : 0; g.vx = g.dir * COGS.speed; }
      out.push(this.bhit(g.id, g.x - COGS.r, g.y - COGS.r, g.x + COGS.r, g.y + COGS.r, ...COGS.hit, { dirX: g.dir }));
    }
    this.cogs = this.cogs.filter((g) => g.y < 340);
  }

  /** STEAM VENT: the grates hiss, then blast columns of steam - and the Colossus OVERHEATS, slumping forward. */
  atk_vent(match, a, out) {
    const warn = this.sp(VENT.warn), end = warn + VENT.blast;
    if (a.t < warn) { if (a.t % 5 === 0) for (const x of VENT.xs) this.puff(x + (Math.random() - 0.5) * 20, -4, 0.6); if (a.t === 1) sfx('geyser', 0.7, 1.2); }
    else if (a.t < end) {
      if (a.t === warn) { sfx('geyser', 1, 0.7); match.shake(4, 20); }
      for (const x of VENT.xs) { out.push(this.bhit('vent' + a.id + x, x - 20, -170, x + 20, 0, ...VENT.hit)); if (a.t % 2 === 0) this.puff(x + (Math.random() - 0.5) * 24, -10 - Math.random() * 140, 1.4, -2.4); }
    } else if (a.t === end) { this.hot = this.sp(VENT.hot) + 40; sfx('rumble', 0.8, 0.7); }
    else if (this.hot <= 0) return true;
    return false;
  }

  /** RIVET RAIN (enraged): its shoulder stacks fire hot rivets up; they come down on marked spots. */
  atk_rivets(match, a, out) {
    if (a.t <= RIVETS.n * RIVETS.every && a.t % RIVETS.every === 1) {
      const tg = this.nearest(match), x = Phaser.Math.Clamp((tg && Math.random() < 0.5 ? tg.x : (Math.random() - 0.5) * 480), -250, 250);
      this.rivets.push({ x, t: 0, id: this.sid('rivet') }); sfx('clang', 0.4, 1.8);
    }
    for (const r of this.rivets) {
      r.t++; const w = this.sp(RIVETS.warn);
      if (r.t > w) { r.y = -330 + (r.t - w) * 16; if (r.y > -24) { out.push(this.bhit(r.id, r.x - 10, r.y - 12, r.x + 10, r.y + 12, ...RIVETS.hit)); } }
      if (r.y >= -4 && !r.done) { r.done = true; sfx('hit', 0.5, 1.5); for (let i = 0; i < 6; i++) match.particles.push({ x: r.x, y: -3, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3, life: 14, color: C.glow[i % 3], size: 2 }); }
    }
    this.rivets = this.rivets.filter((r) => !r.done || r.t < 200);
    if (this.rivets.every((r) => r.done)) { if (a.t > RIVETS.n * RIVETS.every + 10) { this.rivets = []; return true; } }
    return false;
  }

  /** A puff of steam (drawn by render), rising. */
  puff(x, y, k = 1, vy = -0.8) { if (this.puffs.length < 160) this.puffs.push({ x, y, vx: (Math.random() - 0.5) * 0.8, vy: vy * (0.6 + Math.random() * 0.6), r: 5 + Math.random() * 6 * k, life: 30 + Math.random() * 20, t: 0 }); }

  /** The furnace heart takes a hit: sparks fly, and a fist resting in the deck jerks back up. */
  onHurt(match, r) { if (r.mult >= 1) for (let i = 0; i < 3; i++) this.puff(this.core().x + (Math.random() - 0.5) * 30, this.core().y, 0.5, -1.2); }
  /** The death: it slumps, its eyes go out, steam pours from every joint. */
  onDeath() { this.hot = 0; }

  // ------------------------------------------------------------------ hazards (VS too)
  start_pipe(match, h) { h.title = 'PIPE BURST!'; h.s = Math.random() < 0.5 ? -1 : 1; sfx('geyser', 0.5, 1.5); }
/** PIPE BURST: the wall pipe on one side rattles and puffs, then a jet of steam blasts across the catwalks. */
  step_pipe(match, h, out) {
    const x0 = h.s * 300;
    if (h.t < PIPE.build) { if (h.t % 6 === 0) this.puff(x0 - h.s * 6, (PIPE.y1 + PIPE.y2) / 2, 0.6, -0.3); }
    else if (h.t < PIPE.build + PIPE.blast) {
      const len = Math.min(330, (h.t - PIPE.build) * 18), x1 = h.s < 0 ? x0 : x0 - len, x2 = h.s < 0 ? x0 + len : x0;
      out.push(this.bhit('pipe' + h.id + Math.floor(h.t / PIPE.tick), x1, PIPE.y1, x2, PIPE.y2, ...PIPE.hit, { dirX: -h.s }));
      this.jet = { x0, len, s: h.s };
      if (h.t === PIPE.build) sfx('geyser', 0.9, 0.9);
    } else { this.jet = null; return true; }
    return false;
  }
  start_crane(match, h) { h.title = 'CRANE DROP!'; const tg = this.nearest(match); h.x = Phaser.Math.Clamp(tg ? tg.x : 0, -220, 220); h.from = h.x < 0 ? 420 : -420; this.crane = { x: h.from, y: CRANE.rail + 26, drop: false }; }
/** CRANE DROP: the crane carries a crate over the mark, drops it, then winches it back up. */
  step_crane(match, h, out) {
    const K = this.crane;
    if (h.t < CRANE.travel) { K.x = h.from + (h.x - h.from) * Phaser.Math.Easing.Sine.InOut(h.t / CRANE.travel); K.mark = h.t > 30; }
    else if (!K.landed) {
      K.vy = (K.vy || 0) + 0.7; K.y += K.vy; K.drop = true;
      out.push(this.bhit('crane' + h.id, K.x - CRANE.w / 2, K.y - CRANE.h / 2, K.x + CRANE.w / 2, K.y + CRANE.h / 2, ...CRANE.hit, { radial: true }));
      if (K.y >= -CRANE.h / 2) { K.y = -CRANE.h / 2; K.landed = h.t; sfx('bighit', 0.9, 0.7); match.shake(8, 10); for (let i = 0; i < 10; i++) this.puff(K.x + (Math.random() - 0.5) * 50, -6, 0.8, -0.5); }
    } else if (h.t - K.landed > 70) { K.y -= 6; K.mark = false; if (K.y < CRANE.rail) { this.crane = null; return true; } }
    return false;
  }

  /** Moves the foundry and its Colossus one frame; returns the hazard + boss hitboxes. */
  step(match) {
    this.t++;
    const out = [];
    this.cycle.run(match, out);
    if (this.boss) {
      this.bossStep(match, out);
      if (this.hot > 0) { this.hot--; if (this.hot % 4 === 0) this.puff((Math.random() - 0.5) * 120, this.core().y - 40, 0.8, -1.5); }
      this.lean += ((this.hot > 0 || this.boss.dying ? 1 : 0) - this.lean) * 0.06;
      if (!this.boss.atk || this.boss.atk.name !== 'cogs') { this.chest = Math.max(0, this.chest - 0.05); if (this.cogs.length) this.stepCogs(match, out); }
      if (this.t % 20 === 0 && !this.boss.dying) this.puff(0, COL.headY - 40 + this.lean * 55, 1.2, -1.4);   // its head's stack smokes
    } else this.lean = 1;
    for (const p of this.puffs) { p.t++; p.x += p.vx; p.y += p.vy; p.r += 0.25; }
    this.puffs = this.puffs.filter((p) => p.t < p.life);
    return out;
  }

  // ------------------------------------------------------------------ drawing (every frame)
  /** Draws the gears, the Colossus, its arms, steam, cogs, rivets, the crane - and its health bar. */
  render() {
    const t = this.t, B = this.boss, dk = this.deathK(), off = !B || dk > 0.6;
    this.drawGears(this.gearG, t);
    const g = this.bossG; g.clear(); g.setY(this.sink);
    this.drawBody(g, off || this.dark, B ? B.flash : 0);
    const a = this.armG; a.clear();
    for (const f of this.fists) {
      if (f.shadow) { a.fillStyle(0x000000, 0.25 + 0.3 * f.shadow.k); a.fillEllipse(f.shadow.x, 0, 30 + 30 * f.shadow.k, 8); }
      this.drawArm(a, f, B ? B.flash : 0, off || this.dark);
    }
    const x = this.fxG; x.clear();
    if (this.crane) {
      const K = this.crane;
      x.fillStyle(C.iron[1], 1); x.fillRect(K.x - 24, CRANE.rail - 18, 48, 14); x.fillStyle(C.brass[2], 1); x.fillRect(K.x - 20, CRANE.rail - 16, 40, 4);
      if (!K.drop || K.landed) { x.lineStyle(2, C.iron[0], 1); x.lineBetween(K.x, CRANE.rail - 4, K.x, K.y - CRANE.h / 2); x.lineStyle(0); }
      if (K.mark) { x.fillStyle(0xff3020, 0.35 + 0.25 * Math.sin(t * 0.4)); x.fillEllipse(K.x, 0, CRANE.w + 10, 8); }
      this.crate(x, K.x, K.y);
    }
    if (this.jet) {
      const J = this.jet;
      for (let i = 0; i < 18; i++) { const k = i / 18, px = J.x0 - J.s * J.len * k, w = 10 + 14 * k; x.fillStyle(C.steam, 0.75 - 0.4 * k); x.fillEllipse(px + Math.sin(t * 0.5 + i) * 3, (PIPE.y1 + PIPE.y2) / 2 + Math.sin(t * 0.7 + i * 2) * 4, w * 2, w); }
    }
    for (const r of this.rivets) {
      if (!r.done && r.t <= this.sp(RIVETS.warn)) { x.fillStyle(0xff3020, 0.3 + 0.3 * Math.sin(t * 0.5)); x.fillEllipse(r.x, 0, 26, 7); }
      if (r.y !== undefined && !r.done) { x.fillStyle(C.glow[0], 0.5); x.fillRect(r.x - 2, r.y - 26, 4, 22); x.fillStyle(C.glow[2], 1); x.fillCircle(r.x, r.y, 6); x.fillStyle(C.glow[3], 1); x.fillCircle(r.x - 1, r.y - 1, 3); }
    }
    for (const c of this.cogs) this.cog(x, c.x, c.y, COGS.r, c.a, C.brass);
    for (const p of this.puffs) { const k = p.t / p.life; x.fillStyle(C.steam, 0.55 * (1 - k)); x.fillCircle(p.x, p.y, p.r); }
    if (B) this.drawBar();
  }

  /** The great gears turning on the wall (faster when the Colossus is enraged). */
  drawGears(g, t) {
    if (t % 2) return;
    g.clear();
    const sp = this.boss && this.boss.phase === 2 ? 2.2 : 1;
    for (const [x, y, r, d] of [[-420, -150, 70, 1], [-318, -232, 44, -1.6], [420, -150, 70, -1], [318, -232, 44, 1.6], [-560, -360, 50, 1.3], [560, -360, 50, -1.3]]) this.cog(g, x, y, r, t * 0.006 * d * sp, [0x3a2410, 0x5a3a18, 0x7a5424, 0x9a6e30]);
  }
  /** One cog: a toothed wheel with spokes. pal: [dark, mid, light, highlight]. */
  cog(g, x, y, r, a, pal) {
    const n = Math.max(8, Math.round(r / 3)), pts = [];
    for (let i = 0; i < n * 2; i++) { const q = a + i * Math.PI / n, rr = i % 2 ? r : r * 0.82; pts.push({ x: x + Math.cos(q) * rr, y: y + Math.sin(q) * rr }); }
    g.fillStyle(C.out, 1); g.fillPoints(pts.map((p) => ({ x: x + (p.x - x) * 1.08, y: y + (p.y - y) * 1.08 })), true);
    g.fillStyle(pal[1], 1); g.fillPoints(pts, true);
    g.fillStyle(pal[2], 1); g.fillCircle(x, y, r * 0.66);
    g.fillStyle(pal[0], 1); g.fillCircle(x, y, r * 0.5);
    for (let i = 0; i < 4; i++) { const q = a + i * Math.PI / 2; g.lineStyle(Math.max(2, r * 0.14), pal[2], 1); g.lineBetween(x, y, x + Math.cos(q) * r * 0.5, y + Math.sin(q) * r * 0.5); }
    g.lineStyle(0); g.fillStyle(pal[3], 1); g.fillCircle(x, y, r * 0.16); g.fillStyle(pal[2], 1); g.fillCircle(x - r * 0.3, y - r * 0.45, Math.max(1, r * 0.08));
  }
  /** The crane's crate: a riveted iron box with brass corners. */
  crate(g, x, y) {
    const w = CRANE.w, h = CRANE.h;
    g.fillStyle(C.out, 1); g.fillRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4);
    g.fillStyle(C.iron[2], 1); g.fillRect(x - w / 2, y - h / 2, w, h); g.fillStyle(C.iron[3], 1); g.fillRect(x - w / 2, y - h / 2, w, 4);
    g.lineStyle(3, C.iron[1], 1); g.lineBetween(x - w / 2, y - h / 2, x + w / 2, y + h / 2); g.lineBetween(x + w / 2, y - h / 2, x - w / 2, y + h / 2); g.lineStyle(0);
    g.fillStyle(C.brass[2], 1); for (const [cx, cy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.fillRect(x + cx * w / 2 - 5, y + cy * h / 2 - 5, 10, 10);
  }

  /** The Colossus from the waist up: brass plates, pauldrons with smokestacks, the furnace heart, the boiler-helmet head. */
  drawBody(g, off, flash) {
    const L = this.lean, cy = COL.coreY + L * COL.lean, hy = COL.headY + L * (COL.lean + 10), sy = COL.shoulderY + L * COL.lean;
    const rage = this.boss && this.boss.phase === 2, hot = this.hot > 0, B = C.brass, fl = flash > 0;
    const P = (pts, col) => { g.fillStyle(col, 1); g.fillPoints(pts.map(([x, y]) => ({ x, y })), true); };
    // torso: an outlined trapezoid of banded brass plate
    P([[-104, sy - 14], [104, sy - 14], [74, 30], [-74, 30]], C.out);
    P([[-98, sy - 10], [98, sy - 10], [70, 26], [-70, 26]], fl ? 0xfff0d0 : B[1]);
    P([[-90, sy - 6], [90, sy - 6], [80, cy - 30], [-80, cy - 30]], fl ? 0xffffff : B[2]);
    P([[-80, cy + 34], [80, cy + 34], [70, 26], [-70, 26]], B[0]);
    g.fillStyle(B[3], 1); g.fillRect(-88, sy - 6, 176, 3);
    for (let i = -3; i <= 3; i++) { g.fillStyle(B[0], 1); g.fillRect(i * 26 - 1, sy, 2, cy - sy - 30); }
    for (let i = -4; i <= 4; i++) for (const yy of [sy - 1, cy - 34, cy + 38]) { g.fillStyle(B[4], 1); g.fillRect(i * 20 - 1, yy, 2, 2); }
    // gauges on the chest
    for (const gx of [-58, 58]) { g.fillStyle(C.out, 1); g.fillCircle(gx, cy - 2, 11); g.fillStyle(0xf4ecd8, 1); g.fillCircle(gx, cy - 2, 8); g.lineStyle(2, 0xc02818, 1); const q = -2.2 + (this.boss ? (1 - this.boss.hp / this.boss.max) * 3.4 : 0); g.lineBetween(gx, cy - 2, gx + Math.cos(q) * 6, cy - 2 + Math.sin(q) * 6); g.lineStyle(0); }
    // the furnace heart: a round window into the fire, behind a grate that swings open for the cogs
    const glow = off ? [0x3a1a10, 0x4a2414, 0x5a2a18, 0x6a3018] : hot ? [C.glow[1], C.glow[2], C.glow[3], 0xffffff] : rage ? [0xc01808, C.glow[0], C.glow[1], C.glow[2]] : C.glow;
    g.fillStyle(C.out, 1); g.fillCircle(0, cy, 33); g.fillStyle(B[2], 1); g.fillCircle(0, cy, 30); g.fillStyle(B[0], 1); g.fillCircle(0, cy, 26);
    const fl2 = Math.sin(this.t * 0.4) * 2;
    g.fillStyle(glow[0], 1); g.fillCircle(0, cy, 24); g.fillStyle(glow[1], 1); g.fillCircle(0, cy + 2, 18 + fl2); g.fillStyle(glow[2], 1); g.fillCircle(0, cy + 4, 11 + fl2); g.fillStyle(glow[3], 1); g.fillCircle(0, cy + 6, 5);
    if (!off) { g.fillStyle(glow[1], hot ? 0.3 : 0.15); g.fillCircle(0, cy, 44 + fl2 * 2); }
    const open = this.chest;
    for (let i = -2; i <= 2; i++) { const w = 3; g.fillStyle(C.iron[1], 1); g.fillRect(i * 10 - w / 2 + open * i * 6, cy - 22 + open * 12, w, 44 - open * 24); }
    g.fillStyle(C.iron[1], 1); g.fillRect(-24, cy - 1, 48 * (1 - open), 3);
    // pauldrons with smokestacks
    for (const s of [-1, 1]) {
      const px = s * COL.shoulderX;
      g.fillStyle(C.out, 1); g.fillCircle(px, sy, 36); g.fillStyle(B[1], 1); g.fillCircle(px, sy, 33); g.fillStyle(B[2], 1); g.fillCircle(px - s * 2, sy - 3, 27);
      g.fillStyle(B[3], 1); g.fillRect(px - 18, sy - 22, 26, 3);
      for (let k = 0; k < 6; k++) { const q = Math.PI + k * Math.PI / 5; g.fillStyle(B[4], 1); g.fillRect(px + Math.cos(q) * 28 - 1, sy + Math.sin(q) * 28 - 1, 2, 2); }
      g.fillStyle(C.out, 1); g.fillRect(px + s * 10 - 9, sy - 64, 18, 40); g.fillStyle(C.iron[2], 1); g.fillRect(px + s * 10 - 7, sy - 62, 14, 38); g.fillStyle(C.iron[3], 1); g.fillRect(px + s * 10 - 7, sy - 62, 3, 38);
      g.fillStyle(B[2], 1); g.fillRect(px + s * 10 - 10, sy - 66, 20, 6);
      if (!off && rage && this.t % 6 < 3) { g.fillStyle(C.glow[1], 0.8); g.fillRect(px + s * 10 - 5, sy - 70, 10, 4); }
    }
    // the head: a riveted boiler helmet, goggle eyes, a grille mouth, a smokestack on top
    const tilt = L * 8;
    g.fillStyle(C.out, 1); g.fillRoundedRect(-36, hy - 36 + tilt, 72, 66, 18);
    g.fillStyle(fl ? 0xfff0d0 : B[1], 1); g.fillRoundedRect(-33, hy - 33 + tilt, 66, 60, 16);
    g.fillStyle(B[2], 1); g.fillRoundedRect(-29, hy - 31 + tilt, 50, 26, 12);
    g.fillStyle(B[3], 1); g.fillRect(-22, hy - 28 + tilt, 22, 3);
    g.fillStyle(C.iron[1], 1); g.fillRect(-6, hy - 56 + tilt, 12, 22); g.fillStyle(B[2], 1); g.fillRect(-9, hy - 58 + tilt, 18, 5);
    const eye = off ? 0x2a1a14 : rage ? 0xff3a20 : 0xffc040;
    for (const s of [-1, 1]) {
      g.fillStyle(C.out, 1); g.fillCircle(s * 14, hy - 4 + tilt, 12); g.fillStyle(B[0], 1); g.fillCircle(s * 14, hy - 4 + tilt, 10);
      g.fillStyle(eye, 1); g.fillCircle(s * 14, hy - 4 + tilt + L * 2, off ? 7 : 7); if (!off) { g.fillStyle(0xffffff, 0.9); g.fillCircle(s * 14 - 3, hy - 7 + tilt, 2); g.fillStyle(eye, 0.18); g.fillCircle(s * 14, hy - 4 + tilt, 18); }
    }
    g.fillStyle(C.out, 1); g.fillRect(-16, hy + 12 + tilt, 32, 12); for (let k = 0; k < 5; k++) { g.fillStyle(C.iron[3], 1); g.fillRect(-14 + k * 6, hy + 14 + tilt, 3, 8); }
    for (let i = -2; i <= 2; i++) { g.fillStyle(B[4], 1); g.fillRect(i * 12 - 1, hy + 27 + tilt, 2, 2); }
  }

  /** One arm: a brass upper arm, an elbow gear, a piston forearm, a riveted gauntlet fist. */
  drawArm(g, f, flash, off) {
    const L = this.lean, sx = f.s * COL.shoulderX, sy = COL.shoulderY + L * COL.lean + 6 + this.sink;
    const dx = f.x - sx, dy = f.y - sy, d = Math.hypot(dx, dy) || 1, A = COL.upper, Bn = COL.fore;
    const reach = Math.min(d, A + Bn - 1), cosA = (A * A + reach * reach - Bn * Bn) / (2 * A * reach), ang = Math.atan2(dy, dx) - f.s * Math.acos(Phaser.Math.Clamp(cosA, -1, 1));   // (elbows out and up: hunched, gorilla arms)
    const ex = sx + Math.cos(ang) * A, ey = sy + Math.sin(ang) * A;
    const fl = flash > 0;
    const limb = (x1, y1, x2, y2, w, cols) => { g.lineStyle(w + 4, C.out, 1); g.lineBetween(x1, y1, x2, y2); g.lineStyle(w, cols[0], 1); g.lineBetween(x1, y1, x2, y2); g.lineStyle(Math.max(2, w * 0.35), cols[1], 1); g.lineBetween(x1 - 2, y1 - 2, x2 - 2, y2 - 2); g.lineStyle(0); };
    limb(sx, sy, ex, ey, 22, [C.brass[1], C.brass[3]]);
    limb(ex, ey, f.x, f.y, 12, [C.iron[2], C.iron[4]]);                                     // the piston rod
    const mx = ex + (f.x - ex) * 0.45, my = ey + (f.y - ey) * 0.45;
    limb(ex, ey, mx, my, 20, [C.copper[1], C.copper[3]]);                                   // its sleeve
    this.cog(g, ex, ey, 13, this.t * 0.05 * f.s, [C.brass[0], C.brass[1], C.brass[2], C.brass[4]]);
    // the fist
    const x = f.x, y = f.y;
    g.fillStyle(C.out, 1); g.fillRoundedRect(x - 31, y - 25, 62, 50, 10);
    g.fillStyle(fl ? 0xfff0d0 : C.brass[1], 1); g.fillRoundedRect(x - 28, y - 22, 56, 44, 8);
    g.fillStyle(C.brass[2], 1); g.fillRoundedRect(x - 26, y - 20, 52, 18, 6);
    for (let k = 0; k < 4; k++) { g.fillStyle(C.out, 1); g.fillRect(x - 25 + k * 13, y + 2, 2, 18); g.fillStyle(C.brass[3], 1); g.fillRect(x - 22 + k * 13, y - 18, 8, 3); }
    g.fillStyle(C.iron[2], 1); g.fillRect(x - 28, y - 4, 56, 6); for (let k = 0; k < 5; k++) { g.fillStyle(C.brass[4], 1); g.fillRect(x - 24 + k * 12, y - 2, 2, 2); }
    if (f.resting && !off) { g.fillStyle(0xffffff, 0.08 + 0.06 * Math.sin(this.t * 0.3)); g.fillRoundedRect(x - 28, y - 22, 56, 44, 8); }
  }
}

/** BRASS FOUNDRY's miniature for the stage select screen. */
export function drawBrassFoundryPreview(g, x, y, w, h) {
  C.sky.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(x, y + i * h / 6, w, h / 6 + 1); });
  g.fillStyle(C.brick[1], 1); g.fillRect(x, y, w * 0.18, h); g.fillRect(x + w * 0.82, y, w * 0.18, h);
  g.fillStyle(0x6a4a20, 1); g.fillCircle(x + w * 0.12, y + h * 0.4, h * 0.2); g.fillCircle(x + w * 0.88, y + h * 0.4, h * 0.2);
  g.fillStyle(C.brass[1], 1); g.fillRect(x + w * 0.32, y + h * 0.28, w * 0.36, h * 0.5); g.fillRoundedRect(x + w * 0.42, y + h * 0.08, w * 0.16, h * 0.22, 4);
  g.fillStyle(C.glow[1], 1); g.fillCircle(x + w * 0.5, y + h * 0.48, h * 0.09); g.fillStyle(0xffc040, 1); g.fillCircle(x + w * 0.47, y + h * 0.17, 2); g.fillCircle(x + w * 0.53, y + h * 0.17, 2);
  g.fillStyle(C.iron[2], 1); g.fillRect(x + w * 0.12, y + h * 0.72, w * 0.76, h * 0.07); g.fillStyle(C.brass[2], 1); g.fillRect(x + w * 0.12, y + h * 0.79, w * 0.76, h * 0.03);
}

// BRASS FOUNDRY - the arena of THE CLOCKWORK COLOSSUS (boss I, steampunk; Trinkets > BOSS FIGHTS, src/data/bosses.js).
// A riveted iron deck inside a giant foundry at dusk: brick walls, arched windows onto a sky full of smokestacks and
// an airship, great gears turning on the wall, copper pipes, hanging lamps, a furnace glowing under the deck.
// Behind the deck stands the COLOSSUS (waist-up, brass plates, a boiler-helmet head with goggle eyes, a furnace in
// its chest), its two piston arms reaching over the deck.
//   Weak point: the FURNACE HEART in its chest (x1). Its head takes x0.7, a fist resting on the deck x0.5. After its
//   STEAM VENT attack it OVERHEATS: it slumps forward and the white-hot heart takes x1.6.
//   Attacks: PISTON SLAM (a fist tracks you overhead, then slams; ENRAGED: both fists), FLOOR SWEEP (a fist sweeps the
//   deck - jump it), COG SAWS (spinning cogs bounce out of its chest and roll across), STEAM VENT (the floor grates
//   blast steam, then it overheats), RIVET RAIN (ENRAGED: hot rivets fall on marked spots), CUCKOO! (its top hat flips
//   open and a wooden cuckoo bird springs out on a coiled spring - CUCKOO! - and pecks at you, lunging across the arena).
// Stage hazards (also in VS, where the Colossus stands switched off): PIPE BURST (a wall pipe blasts steam across the
// catwalks) and CRANE DROP (the overhead crane drops a crate on a marked spot).
import { HazardCycle } from './hazardCycle.js';
import { BossArena } from './bossBase.js';
import { sfx } from '../audio/sfx.js';
import { FONT, VIEW_W } from '../config.js';

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
// CUCKOO!: the bird's size, the hat door opening, pecks (normal / enraged), aiming frames, the lunge, hold and pull-back, reach, the peck's hit
const CUCKOO = { size: 1.7, open: 26, pecks: [2, 4], aim: 38, lunge: 8, hold: 12, back: 14, reach: 380, r: 22, hit: [9, [45, 5.2, 0.75]] };
const CRANE = { rail: -300, travel: 90, w: 46, h: 40, hit: [13, [80, 6, 0.9]] };
// BROKEN (the third stage): the health left when its core breaks, how long the clock gives you (frames), the cutscene's
// length, how much more its exposed core takes, how far its sloppy attacks miss by, and its shorter pauses
const BROKE = { at: 0.25, time: 1800, cut: 170, mult: 1.5, slop: 70, wait: 46 };
// NOW I'VE GOTCHA (the clock ran out): the cutscene's length, when it says the line, launches, and the missile lands
const GOTCHA = { n: 300, line: 34, launch: 96, hit: 196 };
// the cracks across its chest when the core breaks: polylines from the porthole outward (x, y from the core)
const CRACKS = [[[-30, -12], [-48, -22], [-60, -20], [-76, -34]], [[28, -16], [44, -30], [58, -28], [70, -46]], [[-22, 24], [-34, 36], [-30, 46]], [[24, 22], [40, 30], [52, 26], [64, 40]], [[4, -34], [8, -46], [2, -60]]];

/** A point along the way from a to b (k = 0..1). */
const lerpY = (a, b, k) => a + (b - a) * k;

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
    this.lean = 0; this.sink = 0; this.dark = false; this.keyA = 0; this.broken = false; this.clock = 0; this.lid = 0; this.jaw = 0; this.missile = null; this.crackK = 0; this.hot = 0; this.chest = 0; this.cogs = []; this.rivets = []; this.puffs = []; this.crane = null; this.jet = null;
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
  /** The intro (a real player is watching): also makes THE CLOCK's pieces on the UI layer, and lets the cutscenes play. */
  startIntro(match) {
    super.startIntro(match);
    this.watched = true;
    this.clockG = match.add.graphics().setDepth(32).setVisible(false);
    this.clockT = match.add.text(VIEW_W / 2, 120, '', { fontFamily: FONT, fontSize: '14px', color: '#ffe08a', stroke: '#1a0e08', strokeThickness: 5 }).setOrigin(0.5).setDepth(33).setVisible(false);
    match.addUI(this.clockG, this.clockT);
  }
  /** The death card's form: NOW I'VE GOTCHA, the broken core, enraged or not. */
  cardForm() { return this.gotchaDone ? 'gotcha' : this.broken ? 'broken' : super.cardForm(); }
  /** The camera keeps the Colossus in view - and the cuckoo, while it's out. */
  camPoints() { const pts = super.camPoints(); if (this.cuckoo && pts.length) pts.push({ x: this.cuckoo.x, y: this.cuckoo.y - 30 }, { x: 0, y: this.hatTop().y - 70 }); return pts; }
  /** The chest (its furnace heart): what the camera, the death and the CPU aim at. */
  core() { return { x: 0, y: COL.coreY + this.lean * COL.lean + this.sink }; }
  /** Where the Colossus can be hit: its heart (white-hot = x1.6 while overheated), its head, a fist resting on the deck. */
  hurt() {
    const c = this.core(), hy = COL.headY + this.lean * (COL.lean + 10), out = [];
    out.push({ x1: c.x - 30, y1: c.y - 30, x2: c.x + 30, y2: c.y + 30, mult: (this.hot > 0 ? 1.6 : 1) * (this.broken ? BROKE.mult : 1) });
    out.push({ x1: -26, y1: hy - 24, x2: 26, y2: hy + 18, mult: 0.7 });
    for (const f of this.fists) if (f.resting) out.push({ x1: f.x - 28, y1: f.y - 22, x2: f.x + 28, y2: f.y + 22, mult: 0.5 });
    return out;
  }
  /** Attacks it can pick: normal, then enraged. */
  pattern(phase) { if (this.broken) return ['slam', 'sweep', 'cogs', 'rivets', 'slam', 'cuckoo', 'rivets']; return phase === 1 ? ['slam', 'sweep', 'cogs', 'vent', 'slam', 'cuckoo'] : ['slam', 'sweep', 'cogs', 'vent', 'rivets', 'slam', 'cuckoo']; }
  /** At rest: fists hover by its sides, bobbing. */
  idle() { for (const f of this.fists) this.toward(f, f.s * COL.rest[0] + Math.sin(this.t * 0.04 + f.s) * 6, COL.rest[1] + Math.sin(this.t * 0.05 + f.s * 2) * 8, 0.08); }
  /** Moves a fist part of the way toward a point. */
  toward(f, x, y, k) { f.x += (x - f.x) * k; f.y += (y - f.y) * k; }
  rageLine() { return 'PRESSURE CRITICAL!'; }
  /** The freeze frame frames its head and both raised fists. */
  introAt() { return { x: 0, y: COL.headY + 40, zoom: 1.0 }; }
  /** The entrance's camera: low on the deck as it rises into frame, tilting up to its eyes, pulling back for the fists. */
  introShot(k) { return k < 0.45 ? { x: 0, y: -40, zoom: 1.25 } : k < 0.72 ? { x: 0, y: COL.headY + 10, zoom: 1.3 } : { x: 0, y: -165, zoom: 0.95 }; }

  /**
   * THE ENTRANCE (k = 0..1 through it): it rises from below the deck, dark, the floor rumbling and steam pouring
   * off the edge; its eyes and furnace ignite; then it throws both fists up overhead, its stacks blasting steam -
   * the pose the freeze frame stops on.
   */
  introPose(match, k, t, n) {
    this.t++;
    const e = (a, b) => Phaser.Math.Clamp((k - a) / (b - a), 0, 1), ease = (q) => 1 - (1 - q) * (1 - q);
    const rise = ease(e(0.05, 0.55));
    this.sink = 300 * (1 - rise); this.lean = 0.6 * (1 - e(0.55, 0.7)); this.dark = k < 0.62;
    if (k < 0.55 && t % 10 === 0) { match.shake(4, 8); sfx('rumble', 0.4, 0.8); }
    if (k < 0.6 && t % 3 === 0) for (const x of [-250, 250]) this.puff(x + (Math.random() - 0.5) * 40, 4, 1.2, -1.6);
    if (t === Math.round(0.62 * n)) { sfx('clang', 1, 0.5); sfx('flame', 0.7, 0.6); }
    const up = ease(e(0.7, 0.92));
    for (const f of this.fists) {
      const hx = f.s * 150, hy = -110 + this.sink, px = f.s * 120, py = -268;
      f.x = hx + (px - hx) * up; f.y = hy + (py - hy) * up; f.resting = false;
    }
    this.chest = 0.5 * up;
    if (t === Math.round(0.9 * n)) { sfx('geyser', 1, 0.6); for (let i = 0; i < 16; i++) this.puff((i % 2 ? -1 : 1) * 90 + (Math.random() - 0.5) * 20, COL.shoulderY - 70, 1.5, -2.5); }
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
      const sp2 = this.broken ? 2.6 : 4.2;
      if (tg) a.tx += Math.max(-sp2, Math.min(sp2, Phaser.Math.Clamp(tg.x, -230, 230) - a.tx));
      if (this.broken) a.tx += (Math.random() - 0.5) * 6;                              // (BROKEN: its aim wobbles)
      this.toward(f, a.tx, SLAM.high, 0.16); f.shadow = { x: a.tx, k: tt / track };
      if (tt === 1) sfx('geyser', 0.4, 1.6);
    } else if (tt < track + SLAM.drop) {                                                    // the drop
      if (tt === track && this.broken) a.tx = Phaser.Math.Clamp(a.tx + (Math.random() - 0.5) * 2 * BROKE.slop, -240, 240);   // (BROKEN: and it misjudges the drop)
      f.x = a.tx; f.y = SLAM.high + (-30 - SLAM.high) * ((tt - track + 1) / SLAM.drop); f.shadow = { x: a.tx, k: 1 };
      out.push(this.bhit('slam' + a.id + a.i, f.x - 30, f.y - 24, f.x + 30, f.y + 24, ...SLAM.hit));
    } else if (tt < track + SLAM.drop + this.sp(SLAM.rest) + 20) {                          // rests in the deck
      const k = tt - track - SLAM.drop; f.shadow = null; f.resting = true; f.y = -30;
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
    if (a.t < wind) { this.toward(f, a.s * SWEEP.edge, -30, 0.1); if (a.t % 6 === 0) this.puff(f.x - a.s * 10, -10, 1); if (a.t === 1) sfx('geyser', 0.6, 0.8); }
    else if (a.t < wind + cross) {
      const k = (a.t - wind) / cross; f.x = a.s * SWEEP.edge * (1 - 2 * k); f.y = -30 - (this.broken ? Math.abs(Math.sin(a.t * 0.35)) * 26 : 0);   // (BROKEN: the sweep bounces - gaps to slip under)
      out.push(this.bhit('sweep' + a.id, f.x - 32, -48, f.x + 32, 0, ...SWEEP.hit, { dirX: -a.s }));
      if (a.t % 3 === 0) match.particles.push({ x: f.x, y: -2, vx: a.s * 2, vy: -1.5, life: 14, color: 0xffd070, size: 2 });
      if (a.t === wind) sfx('whoosh', 0.9, 0.6);
    } else { this.toward(f, f.s * COL.rest[0], COL.rest[1], 0.1); if (a.t > wind + cross + 40) return true; }
    return false;
  }

  /** COG SAWS: the chest grate swings open and spinning cogs bounce out, rolling across the deck. */
  atk_cogs(match, a, out) {
    const n = this.broken ? 5 : COGS.n[this.boss.phase - 1], open = this.sp(36);
    this.chest = Math.min(1, a.t / 20);
    if (a.t >= open && a.t < open + n * COGS.every && (a.t - open) % COGS.every === 0) {
      const tg = this.nearest(match), c = this.core(), dir = this.broken ? (Math.random() < 0.5 ? -1 : 1) : tg ? Math.sign(tg.x - c.x) || 1 : 1;   // (BROKEN: cogs spray every which way)
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
    const nR = this.broken ? RIVETS.n + 5 : RIVETS.n;
    if (a.t <= nR * RIVETS.every && a.t % RIVETS.every === 1) {
      const tg = this.nearest(match), x = Phaser.Math.Clamp((tg && !this.broken && Math.random() < 0.5 ? tg.x : (Math.random() - 0.5) * 480), -250, 250);
      this.rivets.push({ x, t: 0, id: this.sid('rivet') }); sfx('clang', 0.4, 1.8);
    }
    for (const r of this.rivets) {
      r.t++; const w = this.sp(RIVETS.warn);
      if (r.t > w) { r.y = -330 + (r.t - w) * 16; if (r.y > -24) { out.push(this.bhit(r.id, r.x - 10, r.y - 12, r.x + 10, r.y + 12, ...RIVETS.hit)); } }
      if (r.y >= -4 && !r.done) { r.done = true; sfx('hit', 0.5, 1.5); for (let i = 0; i < 6; i++) match.particles.push({ x: r.x, y: -3, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3, life: 14, color: C.glow[i % 3], size: 2 }); }
    }
    this.rivets = this.rivets.filter((r) => !r.done || r.t < 200);
    if (this.rivets.every((r) => r.done)) { if (a.t > nR * RIVETS.every + 10) { this.rivets = []; return true; } }
    return false;
  }

  /** Where the cuckoo's spring comes out: the top of its top hat (it moves when the Colossus slumps or sinks). */
  hatTop() { return { x: 0, y: COL.headY + this.lean * (COL.lean + 18) - 74 + this.sink }; }
  /**
   * CUCKOO!: the top hat's lid flips open and a carved wooden cuckoo bird springs out on a coiled brass spring with a
   * chime - CUCKOO! - then pecks: it eyes the nearest player, bobbing, locks on, and lunges along its spring across
   * the arena (up to `CUCKOO.reach`), holds, and springs back. Two pecks (four enraged), then it pops back in.
   */
  atk_cuckoo(match, a, out) {
    const o = this.hatTop(), n = CUCKOO.pecks[this.boss.phase - 1], aim = this.sp(CUCKOO.aim), cyc = aim + CUCKOO.lunge + CUCKOO.hold + CUCKOO.back;
    const K = this.cuckoo || (this.cuckoo = { door: 0, x: o.x, y: o.y, dx: -1, dy: -0.3, up: 0 });
    const rest = { x: o.x, y: o.y - 46 };
    if (a.t <= CUCKOO.open) {                                                       // the lid flips, it springs up
      K.door = a.t / CUCKOO.open; K.up = Math.max(0, (a.t - 10) / (CUCKOO.open - 10));
      K.x = o.x; K.y = o.y - 46 * (1 - Math.pow(1 - K.up, 3)) + Math.sin(a.t) * 4 * K.up;
      if (a.t === 12) { sfx('ding', 0.8, 1.5); sfx('ding', 0.6, 1.2); match.popText({ x: o.x, y: o.y - 20 }, 'CUCKOO!', '#ffe08a'); }
      return false;
    }
    const k = a.t - CUCKOO.open, i = Math.floor(k / cyc), q = k % cyc;
    if (i >= n) {                                                                   // back in the hat
      const r = Math.min(1, (k - n * cyc) / 18); K.x += (o.x - K.x) * 0.3; K.y = lerpY(K.y, o.y, 0.3); K.door = 1 - r; K.up = 1 - r;
      if (r >= 1) { this.cuckoo = null; return true; }
      return false;
    }
    if (q < aim) {                                                                  // eyeing you, bobbing
      const tg = this.nearest(match, K.x);
      if (tg) { const dx = tg.x - rest.x, dy = tg.y - 24 - rest.y, d = Math.hypot(dx, dy) || 1; K.dx += (dx / d - K.dx) * 0.2; K.dy += (dy / d - K.dy) * 0.2; K.tx = tg.x + (this.broken ? Math.sin(this.t * 0.3) * BROKE.slop : 0); K.ty = tg.y - 24; }
      K.x += (rest.x - K.dx * 10 - K.x) * 0.3; K.y += (rest.y - K.dy * 10 + Math.sin(q * 0.5) * 3 - K.y) * 0.3;
      if (q === 2) { sfx('ding', 0.6, 1.6 - i * 0.05); sfx('ding', 0.5, 1.25 - i * 0.05); match.popText({ x: K.x, y: K.y + 30 }, 'CUCKOO!', '#ffe08a'); }
      if (q === aim - 1) {                                                          // locks on
        const dx = (K.tx ?? 0) - rest.x, dy = (K.ty ?? 0) - rest.y, d = Math.hypot(dx, dy) || 1, L = Math.min(CUCKOO.reach, d);
        K.lx = rest.x + dx / d * L; K.ly = Math.min(-14, rest.y + dy / d * L); K.dx = dx / d; K.dy = dy / d; sfx('whoosh', 0.8, 1.4);
      }
      return false;
    }
    const e = q - aim;
    if (e < CUCKOO.lunge) { const u = (e + 1) / CUCKOO.lunge; K.x = lerpY(rest.x, K.lx, u); K.y = lerpY(rest.y, K.ly, u); }
    else if (e < CUCKOO.lunge + CUCKOO.hold) { if (e === CUCKOO.lunge) { sfx('clang', 0.6, 1.9); if (K.ly > -30) { match.shake(4, 6); for (let j = 0; j < 8; j++) match.particles.push({ x: K.x, y: -3, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3, life: 16, color: j % 2 ? 0xc8b090 : C.brass[3], size: 2 }); } } K.x = K.lx + Math.sin(e * 2) * 1.5; K.y = K.ly; }
    else { const u = (e - CUCKOO.lunge - CUCKOO.hold + 1) / CUCKOO.back; K.x = lerpY(K.lx, rest.x, u); K.y = lerpY(K.ly, rest.y, u); }
    if (e < CUCKOO.lunge + 4) out.push(this.bhit('cuckoo' + a.id + i, K.x - CUCKOO.r - 6, K.y - CUCKOO.r, K.x + CUCKOO.r + 6, K.y + CUCKOO.r, ...CUCKOO.hit, { dirX: Math.sign(K.dx) || 1 }));
    return false;
  }
  /** The top hat's lid, flipped open on its back hinge (`door` 0..1). */
  drawLid(g, door) {
    const o = this.hatTop(), la = -door * 1.9, hx = 17, lx = Math.cos(Math.PI + la) * 34, ly = Math.sin(Math.PI + la) * 34;
    g.lineStyle(6, C.out, 1); g.lineBetween(o.x + hx, o.y, o.x + hx + lx, o.y + ly); g.lineStyle(4, C.iron[1], 1); g.lineBetween(o.x + hx, o.y, o.x + hx + lx, o.y + ly); g.lineStyle(0);
  }
  /** THE MISSILE (NOW I'VE GOTCHA): a riveted brass rocket with a red nose cone and fins, flame and a smoke trail. */
  drawMissile(g, M) {
    for (let i = 0; i < M.trail.length; i++) { const p = M.trail[i], k = i / M.trail.length; g.fillStyle(C.steam, 0.5 * k); g.fillCircle(p.x, p.y, 3 + 6 * (1 - k)); }
    const ca = Math.cos(M.a), sa = Math.sin(M.a), P = (x, y) => ({ x: M.x + x * ca - y * sa, y: M.y + x * sa + y * ca });
    const poly = (pts, c) => { g.fillStyle(c, 1); g.fillPoints(pts.map(([x, y]) => P(x, y)), true); };
    const fl = 10 + Math.random() * 8; poly([[-18, -5], [-18 - fl, 0], [-18, 5]], C.glow[1]); poly([[-18, -3], [-18 - fl * 0.6, 0], [-18, 3]], C.glow[3]);
    poly([[-16, -7], [-26, -14], [-12, -7]], C.out); poly([[-16, 7], [-26, 14], [-12, 7]], C.out); poly([[-15, -6], [-23, -12], [-12, -6]], 0xc02818); poly([[-15, 6], [-23, 12], [-12, 6]], 0xc02818);
    poly([[-18, -8], [12, -8], [12, 8], [-18, 8]], C.out); poly([[-17, -6], [12, -6], [12, 6], [-17, 6]], C.brass[2]); poly([[-17, -6], [12, -6], [12, -3], [-17, -3]], C.brass[4]);
    poly([[12, -8], [26, 0], [12, 8]], C.out); poly([[12, -6], [23, 0], [12, 6]], 0xd02818); poly([[12, -6], [18, -3], [12, -2]], 0xff8a6a);
    for (const x of [-10, 0, 8]) { const p = P(x, 0); g.fillStyle(C.copper[1], 1); g.fillRect(p.x - 1, p.y - 1, 2, 2); }
  }
  /** The cuckoo, its spring and the open hat lid (drawn while it's out). */
  drawCuckoo(g) {
    const K = this.cuckoo; if (!K) return;
    const o = this.hatTop(), B = C.brass, t = this.t;
    this.drawLid(g, K.door);
    if (K.up <= 0) return;
    // the spring: a brass zigzag from the hat to the bird
    const dx = K.x - o.x, dy = K.y - o.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, coils = Math.max(5, Math.round(L / 9));
    const pts = []; for (let i = 0; i <= coils; i++) { const q = i / coils, w = i === 0 || i === coils ? 0 : (i % 2 ? 7 : -7); pts.push({ x: o.x + dx * q + nx * w, y: o.y + dy * q + ny * w }); }
    for (const [lw, c] of [[5, C.out], [3, B[2]], [1, B[4]]]) { g.lineStyle(lw, c, 1); for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y); }
    g.lineStyle(0);
    // the bird: a carved wooden cuckoo facing where it pecks
    const fx = K.dx >= 0 ? 1 : -1, ang = Math.atan2(K.dy, Math.abs(K.dx) || 0.01) * fx, ca = Math.cos(ang), sa = Math.sin(ang);
    const Z = CUCKOO.size, P = (lx2, ly2) => ({ x: K.x + (lx2 * ca - ly2 * sa) * fx * Z, y: K.y + (lx2 * sa * fx + ly2 * ca) * Z });
    const tri = (a, b, c, col) => { g.fillStyle(col, 1); g.fillTriangle(a.x, a.y, b.x, b.y, c.x, c.y); };
    tri(P(-14, -2), P(-30, -12), P(-28, 6), C.out); tri(P(-14, -1), P(-27, -9), P(-25, 4), 0x5a3418);       // tail
    g.fillStyle(C.out, 1); g.fillEllipse(K.x, K.y, 34 * Z, 24 * Z); g.fillStyle(0x8a5a2a, 1); g.fillEllipse(K.x, K.y, 30 * Z, 20 * Z); g.fillStyle(0xb07a3a, 1); g.fillEllipse(K.x + fx * 2 * Z, K.y + 3 * Z, 18 * Z, 10 * Z);
    tri(P(-8, -4), P(6, -2), P(-4, 6), 0x5a3418);                                                            // wing
    const hd = P(13, -8); g.fillStyle(C.out, 1); g.fillCircle(hd.x, hd.y, 11 * Z); g.fillStyle(0x9a6a32, 1); g.fillCircle(hd.x, hd.y, 9 * Z);
    tri(P(19, -11), P(19, -5), P(32, -8), C.out); tri(P(20, -10), P(20, -6), P(30, -8), 0xf0a020);           // beak
    const ey = P(15, -11); g.fillStyle(0xffffff, 1); g.fillCircle(ey.x, ey.y, 3 * Z); g.fillStyle(0x101010, 1); g.fillCircle(ey.x + fx * Z, ey.y, 1.6 * Z);
    g.fillStyle(0xd83020, 1); const ch = P(14, -4); g.fillCircle(ch.x, ch.y, 2 * Z);                             // a painted cheek
    if (t % 30 < 4) { g.fillStyle(0xffffff, 0.6); g.fillCircle(hd.x - 2 * Z, hd.y - 3 * Z, 2 * Z); }
  }

  /** You lost: it raises both fists in triumph, its hat blasting steam (BossArena.bossTaunt). */
  onGloat(match, t) { for (const f of this.fists) { f.resting = false; this.toward(f, f.s * 120, -250 + Math.sin(t * 0.2 + f.s) * 10, 0.1); } if (t % 5 === 0) this.puff(0, this.hatTop().y, 1.4, -2); if (t % 40 === 1) sfx('geyser', 0.4, 1.4); }
  /** A puff of steam (drawn by render), rising. */
  puff(x, y, k = 1, vy = -0.8) { if (this.puffs.length < 160) this.puffs.push({ x, y, vx: (Math.random() - 0.5) * 0.8, vy: vy * (0.6 + Math.random() * 0.6), r: 5 + Math.random() * 6 * k, life: 30 + Math.random() * 20, t: 0 }); }

  /** The furnace heart takes a hit: sparks fly, and a fist resting in the deck jerks back up. */
  onHurt(match, r) { if (r.mult >= 1) for (let i = 0; i < 3; i++) this.puff(this.core().x + (Math.random() - 0.5) * 30, this.core().y, 0.5, -1.2); }
  /** The death: it slumps, its eyes go out, steam pours from every joint. */
  onDeath() { this.hot = 0; this.cuckoo = null; }

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
      if (this.t % 16 === 0 && !this.boss.dying) this.puff((Math.random() - 0.5) * 10, COL.headY - 80 + this.lean * 54 + this.sink, 1.2, -1.4);   // its top hat smokes
      const B = this.boss;
      this.keyA += this.broken ? 0.12 : B.phase === 2 ? 0.05 : 0.025;                         // (the key in its back turns)
      if (!this.broken && B.phase === 2 && !B.dying && B.hp > 0 && B.hp <= B.max * BROKE.at && !match.over) this.breakCore(match);
      if (this.broken && !B.dying && !match.over && !this.gotchaDone) {
        if (!B.atk && B.wait > BROKE.wait) B.wait = BROKE.wait;                                   // (sloppy, but frantic)
        if (this.t % 5 === 0) { const c = this.core(); this.puff(c.x + (Math.random() - 0.5) * 120, c.y + (Math.random() - 0.5) * 60, 0.7, -1.2); if (this.t % 10 === 0) match.particles.push({ x: c.x + (Math.random() - 0.5) * 50, y: c.y, vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 3, life: 20, color: C.glow[2], size: 2, grav: 0.2 }); }
        this.clock--;
        if (this.clock % 60 === 0) sfx(this.clock <= 600 ? 'clang' : 'clocktick', this.clock <= 600 ? 0.5 : 0.6, this.clock <= 600 ? 1.9 : 1);
        if (this.clock <= 0) this.gotcha(match);
      }
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
    this.drawCuckoo(x);
    if (!this.cuckoo && this.lid > 0) this.drawLid(x, this.lid);
    if (this.missile) this.drawMissile(x, this.missile);
    for (const p of this.puffs) { const k = p.t / p.life; x.fillStyle(C.steam, 0.55 * (1 - k)); x.fillCircle(p.x, p.y, p.r); }
    if (B) this.drawBar();
    if (this.clockG && !this.cut) this.drawClockUI(this.broken && !this.gotchaDone && B && !B.dying && !this.scene.over ? 1 : 0);
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

  /**
   * The Colossus from the waist up - a gentleman automaton built like a steam titan: a great wind-up KEY turning in its
   * back, smokestacks behind its shoulders, a V-shaped chest of layered brass plates (rivets along every edge,
   * engraved filigree, verdigris), a porthole heart - the furnace roaring behind a spinning gear, under a clock-face
   * glass that swings open - glowing vials bubbling either side, an exposed gear train at its waist, layered copper
   * pauldrons, and a riveted iron head: a cyclops lens under a heavy brow, a handlebar moustache over a jaw grille that
   * drops when it speaks, bolt ears with whistles, and a top-hat smokestack with a gauge. BROKEN (third stage): the
   * glass is smashed, cracks run across its chest, the core sputters, a vial leaks, the lens is cracked and flickering.
   */
  drawBody(g, off, flash) {
    const L = this.lean, cy = COL.coreY + L * COL.lean, hy = COL.headY + L * (COL.lean + 10), sy = COL.shoulderY + L * COL.lean;
    const rage = this.boss && this.boss.phase === 2, hot = this.hot > 0, br = this.broken, B = C.brass, Cu = C.copper, I = C.iron, fl = flash > 0, t = this.t;
    const PAT = [0x2e6a5e, 0x4a9a8a, 0x7ac8b0];
    const P = (pts, col, a = 1) => { g.fillStyle(col, a); g.fillPoints(pts.map(([x, y]) => ({ x, y })), true); };
    const lit = (c) => (fl ? 0xfff0d0 : c);
    const rivets = (pts, col = B[4]) => { for (const [x, y] of pts) { g.fillStyle(C.out, 1); g.fillRect(x - 1.5, y - 1.5, 3, 3); g.fillStyle(col, 1); g.fillRect(x - 1, y - 1, 2, 2); } };
    const pipe = (pts, w, cols) => { for (const [lw, c] of [[w + 4, C.out], [w, cols[0]], [Math.max(2, w * 0.35), cols[1]]]) { g.lineStyle(lw, c, 1); for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]); } g.lineStyle(0); };
    // THE KEY in its back, poking up behind its left shoulder: a figure-eight brass bow on a shaft, turning
    const ka = this.keyA || 0, kx = -120, ky = sy - 64;
    g.lineStyle(10, C.out, 1); g.lineBetween(-70, sy - 10, kx, ky); g.lineStyle(6, B[1], 1); g.lineBetween(-70, sy - 10, kx, ky); g.lineStyle(2, B[4], 1); g.lineBetween(-71, sy - 12, kx - 1, ky - 2); g.lineStyle(0);
    for (const s2 of [-1, 1]) {
      const lx = kx + Math.cos(ka) * 22 * s2, ly = ky + Math.sin(ka) * 22 * s2;
      g.fillStyle(C.out, 1); g.fillCircle(lx, ly, 19); g.fillStyle(lit(B[1]), 1); g.fillCircle(lx, ly, 16); g.fillStyle(B[3], 1); g.fillCircle(lx - 3, ly - 3, 11);
      g.fillStyle(C.out, 1); g.fillCircle(lx, ly, 8); g.fillStyle(0x2a1a10, 1); g.fillCircle(lx, ly, 6);
    }
    g.fillStyle(C.out, 1); g.fillCircle(kx, ky, 9); g.fillStyle(B[2], 1); g.fillCircle(kx, ky, 7); g.fillStyle(B[4], 1); g.fillCircle(kx - 2, ky - 2, 2);
    // smokestacks rising behind its shoulders
    for (const s of [-1, 1]) {
      const x = s * 62;
      g.fillStyle(C.out, 1); g.fillRect(x - 11, sy - 112, 22, 90); g.fillStyle(I[2], 1); g.fillRect(x - 9, sy - 110, 18, 88); g.fillStyle(I[3], 1); g.fillRect(x - 9, sy - 110, 4, 88);
      g.fillStyle(C.out, 1); g.fillRect(x - 14, sy - 118, 28, 10); g.fillStyle(B[2], 1); g.fillRect(x - 12, sy - 116, 24, 6);
      for (const by of [sy - 86, sy - 56]) { g.fillStyle(Cu[2], 1); g.fillRect(x - 10, by, 20, 4); }
      if (!off && (rage || br) && t % 8 < 4) { g.fillStyle(br ? 0x9a3020 : C.glow[1], 0.85); g.fillRect(x - 7, sy - 121, 14, 4); }
    }
    // the pipes coiling up its sides and over its shoulders
    for (const s of [-1, 1]) pipe([[s * 70, 24], [s * 112, -26], [s * 122, sy + 14], [s * 100, sy - 30], [s * 66, sy - 36]], 10, [Cu[1], Cu[3]]);
    // the waist: an iron gearbox with its gear train exposed
    P([[-74, cy + 40], [74, cy + 40], [66, 40], [-66, 40]], C.out); P([[-70, cy + 42], [70, cy + 42], [62, 40], [-62, 40]], I[1]);
    g.fillStyle(0x120a06, 1); g.fillRect(-56, cy + 54, 112, 70);
    const gsp = (br ? 2.6 : rage ? 1.8 : 1) * (off ? 0 : 1);
    this.cog(g, -26, cy + 86, 24, t * 0.03 * gsp, [B[0], B[1], B[2], B[4]]); this.cog(g, 20, cy + 76, 16, -t * 0.045 * gsp, [Cu[0], Cu[1], Cu[2], Cu[3]]); this.cog(g, 34, cy + 108, 13, t * 0.055 * gsp, [I[1], I[2], I[3], I[4]]);
    if (!off) { g.fillStyle(C.glow[0], 0.12); g.fillRect(-56, cy + 54, 112, 70); }
    rivets([[-64, cy + 48], [64, cy + 48], [-62, cy + 120], [62, cy + 120]]);
    // the V chest: widest at the shoulders, pulled in at the waist
    const chest = [[-112, sy - 4], [112, sy - 4], [100, sy + 46], [74, cy + 44], [-74, cy + 44], [-100, sy + 46]];
    P(chest.map(([x, y]) => [x * 1.04, y + (y > cy ? 3 : -3)]), C.out); P(chest, lit(B[1]));
    // the plates: a centre keel and two great pectoral plates (lit from the upper left), with rivets along their edges
    P([[-24, sy - 2], [24, sy - 2], [18, cy + 42], [-18, cy + 42]], lit(Cu[1]));
    P([[-20, sy], [-8, sy], [-8, cy + 40], [-16, cy + 40]], lit(Cu[2]));
    for (const s of [-1, 1]) {
      const pl = [[s * 26, sy], [s * 108, sy - 2], [s * 98, sy + 40], [s * 70, cy + 10], [s * 26, cy + 18]];
      P(pl.map(([x, y]) => [x + s * 1, y + 2]), C.out); P(pl, lit(s < 0 ? B[2] : B[1]));
      if (s < 0) P([[-30, sy + 3], [-104, sy + 1], [-98, sy + 18], [-34, sy + 16]], lit(B[3]));   // (the lit top edge)
      else P([[30, cy + 4], [72, cy + 6], [70, cy + 12], [30, cy + 14]], B[0]);
      rivets([[s * 34, sy + 6], [s * 52, sy + 4], [s * 70, sy + 3], [s * 88, sy + 2], [s * 100, sy + 4], [s * 96, sy + 30], [s * 84, sy + 52], [s * 72, cy + 6], [s * 34, cy + 12]]);
      g.lineStyle(1, B[0], 0.8); g.beginPath(); g.arc(s * 64, sy + 30, 18, s < 0 ? -0.2 : Math.PI * 0.6, s < 0 ? Math.PI * 0.4 : Math.PI * 1.2); g.strokePath(); g.lineStyle(0);   // (engraved filigree)
    }
    for (const [x, y, rx, ry] of [[-84, sy + 30, 9, 5], [70, cy - 4, 7, 5], [-52, cy + 6, 6, 4], [92, sy + 12, 5, 6]]) { g.fillStyle(PAT[1], 0.75); g.fillEllipse(x, y, rx * 2, ry * 2); g.fillStyle(PAT[2], 0.5); g.fillEllipse(x - 2, y - 1, rx, ry); }   // verdigris
    // glowing vials either side of the heart (one cracked and leaking when it's broken)
    for (const s of [-1, 1]) {
      const vx = s * 64, vy = cy + 6, lvl = off ? 0.1 : 0.55 + 0.25 * Math.sin(t * 0.07 + s) - (br && s > 0 ? 0.35 : 0), liq = br ? 0xff6a20 : rage ? 0xff5a30 : 0x5affd0;
      g.fillStyle(C.out, 1); g.fillRoundedRect(vx - 9, vy - 22, 18, 40, 6); g.fillStyle(0x1a2a2a, 1); g.fillRoundedRect(vx - 7, vy - 20, 14, 36, 5);
      g.fillStyle(liq, off ? 0.3 : 0.9); g.fillRect(vx - 6, vy + 15 - 34 * lvl, 12, 34 * lvl);
      if (!off) for (let k = 0; k < 3; k++) { const by = vy + 12 - ((t * 0.6 + k * 11) % (34 * lvl)); g.fillStyle(0xffffff, 0.7); g.fillCircle(vx - 2 + k * 2, by, 1.2); }
      g.fillStyle(0xffffff, 0.35); g.fillRect(vx - 5, vy - 18, 2, 30);
      g.fillStyle(B[2], 1); g.fillRect(vx - 10, vy - 25, 20, 5); g.fillRect(vx - 10, vy + 16, 20, 5);
      if (br && s > 0) { g.lineStyle(1, 0xffffff, 0.8); g.lineBetween(vx - 4, vy - 14, vx + 3, vy - 4); g.lineBetween(vx + 3, vy - 4, vx - 1, vy + 4); g.lineStyle(0); if (!off) { g.fillStyle(liq, 0.9); g.fillRect(vx + 6, vy + 2, 2, 6 + (t % 12)); } }
    }
    // the heart: a porthole, the furnace roaring behind a spinning gear, a clock-face glass that swings open on its hinge
    const glow = off ? [0x3a1a10, 0x4a2414, 0x5a2a18, 0x6a3018] : br ? [0x8a1808, 0xd83a10, (t % 9 < 4 ? 0xffa030 : 0xff6a20), 0xffe0a0] : hot ? [C.glow[1], C.glow[2], C.glow[3], 0xffffff] : rage ? [0xc01808, C.glow[0], C.glow[1], C.glow[2]] : C.glow;
    const fl2 = Math.sin(t * 0.4) * 2 + (br ? (Math.random() - 0.5) * 3 : 0), open = br ? 1 : Math.max(this.chest, hot ? 1 : 0);
    g.fillStyle(C.out, 1); g.fillCircle(0, cy, 43); g.fillStyle(B[1], 1); g.fillCircle(0, cy, 40); g.fillStyle(B[3], 1); g.fillCircle(-3, cy - 3, 37); g.fillStyle(B[0], 1); g.fillCircle(0, cy, 33);
    for (let i = 0; i < 10; i++) { const q = i / 10 * Math.PI * 2; g.fillStyle(C.out, 1); g.fillCircle(Math.cos(q) * 37, cy + Math.sin(q) * 37, 2.6); g.fillStyle(B[4], 1); g.fillCircle(Math.cos(q) * 37 - 0.5, cy + Math.sin(q) * 37 - 0.5, 1.4); }   // the porthole's bolts
    g.fillStyle(glow[0], 1); g.fillCircle(0, cy, 31); g.fillStyle(glow[1], 1); g.fillCircle(0, cy + 3, 24 + fl2); g.fillStyle(glow[2], 1); g.fillCircle(0, cy + 5, 15 + fl2); g.fillStyle(glow[3], 1); g.fillCircle(0, cy + 7, 7);
    if (!off) this.cog(g, 0, cy, 20, t * 0.04 * (br ? 3 : rage ? 2 : 1), [0x1a0a04, 0x2a1408, 0x2a1408, 0x3a2010]);   // (the gear in front of the fire, a silhouette)
    if (!off) { g.fillStyle(glow[1], hot || br ? 0.3 : 0.14); g.fillCircle(0, cy, 56 + fl2 * 2); }
    const sx = 1 - open, hx = -31;
    if (sx > 0.04) {
      const fx = hx + 31 * sx;
      g.fillStyle(0xf4ecd8, off ? 1 : 0.55); g.fillEllipse(fx, cy, 62 * sx, 62);
      for (let i = 0; i < 12; i++) { const q = i / 12 * Math.PI * 2; g.fillStyle(C.out, 1); g.fillRect(fx + Math.cos(q) * 26 * sx - 1, cy + Math.sin(q) * 26 - 1, i % 3 ? 2 : 3, i % 3 ? 2 : 4); }
      const mq = t * 0.05 * (rage ? 4 : 1), hq = mq / 12;
      g.lineStyle(3, C.out, 1); g.lineBetween(fx, cy, fx + Math.cos(hq - 1.57) * 14 * sx, cy + Math.sin(hq - 1.57) * 14);
      g.lineStyle(2, C.out, 1); g.lineBetween(fx, cy, fx + Math.cos(mq - 1.57) * 23 * sx, cy + Math.sin(mq - 1.57) * 23); g.lineStyle(0);
      g.fillStyle(B[2], 1); g.fillCircle(fx, cy, 3); g.fillStyle(0xffffff, 0.35); g.fillEllipse(fx - 10 * sx, cy - 13, 17 * sx, 8);
    } else if (br) {                                                                     // smashed: jagged shards of glass left in the rim
      for (let i = 0; i < 9; i++) { const q = i / 9 * Math.PI * 2 + 0.3, r1 = 31, r2 = 18 + (i * 7) % 9; g.fillStyle(0xd8f0f0, 0.7); g.fillTriangle(Math.cos(q) * r1, cy + Math.sin(q) * r1, Math.cos(q + 0.4) * r1, cy + Math.sin(q + 0.4) * r1, Math.cos(q + 0.2) * r2, cy + Math.sin(q + 0.2) * r2); }
    }
    if (br) {                                                                            // cracks running out across the chest plates
      g.lineStyle(2, 0x120804, 1);
      for (const c of CRACKS) { let x = c[0][0], y = cy + c[0][1]; for (let i = 1; i < c.length; i++) { const nx = c[i][0], ny = cy + c[i][1]; g.lineBetween(x, y, nx, ny); x = nx; y = ny; } }
      g.lineStyle(1, glow[2], 0.7); for (const c of CRACKS) g.lineBetween(c[0][0], cy + c[0][1], c[1][0], cy + c[1][1]);
      g.lineStyle(0);
    }
    // pauldrons: three layered copper plates, brass rims, rivets, a ball joint under them
    for (const s of [-1, 1]) {
      const px = s * COL.shoulderX, py = sy;
      g.fillStyle(C.out, 1); g.fillCircle(px + s * 6, py + 26, 20); g.fillStyle(I[2], 1); g.fillCircle(px + s * 6, py + 26, 17); g.fillStyle(I[4], 1); g.fillCircle(px + s * 1, py + 21, 6);
      for (let k = 2; k >= 0; k--) {
        const ox = px + s * k * 9, oy = py + k * 12, r = 40 - k * 6;
        g.fillStyle(C.out, 1); g.fillEllipse(ox, oy, r * 2 + 6, r * 1.4 + 6); g.fillStyle(lit(k === 0 ? Cu[2] : Cu[1]), 1); g.fillEllipse(ox, oy, r * 2, r * 1.4);
        g.fillStyle(B[2], 1); g.fillEllipse(ox, oy + r * 0.5, r * 1.9, 6);
        if (k === 0) { g.fillStyle(Cu[3], 1); g.fillEllipse(ox - s * 10, oy - 12, 26, 9); rivets([[ox - 26, oy + 4], [ox - 9, oy + 12], [ox + 9, oy + 12], [ox + 26, oy + 4]]); }
      }
      this.cog(g, px - s * 4, py - 4, 10, t * 0.06 * s * (rage ? 3 : 1) * (off ? 0 : 1), [I[1], I[2], I[3], I[4]]);
    }
    // the head
    const tilt = L * 8 + (br ? Math.sin(t * 0.13) * 2 + 3 : 0), hY = hy + tilt, hx2 = br ? 3 : 0;
    g.fillStyle(I[1], 1); g.fillRect(-24, hY + 24, 48, 16); for (let k = 0; k < 4; k++) { g.fillStyle(I[3], 1); g.fillRect(-22 + k * 12, hY + 26, 8, 2); }   // the neck: a ribbed collar
    for (const s of [-1, 1]) { g.fillStyle(C.out, 1); g.fillRect(hx2 + s * 42 - 8, hY - 12, 16, 26); g.fillStyle(B[2], 1); g.fillRect(hx2 + s * 42 - 6, hY - 10, 12, 22); g.fillStyle(B[3], 1); g.fillRect(hx2 + s * 42 - 6, hY - 10, 3, 22);
      if (!(br && s > 0)) { g.fillStyle(I[2], 1); g.fillRect(hx2 + s * 46 - 2, hY - 28, 4, 16); g.fillStyle(B[3], 1); g.fillCircle(hx2 + s * 46, hY - 29, 3.5); } }   // bolt ears, whistles (one snapped off when broken)
    g.fillStyle(C.out, 1); g.fillRoundedRect(hx2 - 40, hY - 34, 80, 66, 14);
    g.fillStyle(lit(I[2]), 1); g.fillRoundedRect(hx2 - 37, hY - 31, 74, 60, 12);
    g.fillStyle(lit(B[1]), 1); g.fillRoundedRect(hx2 - 33, hY - 22, 66, 46, 10);                         // the brass faceplate
    g.fillStyle(B[2], 1); g.fillRoundedRect(hx2 - 31, hY - 21, 46, 14, 6);
    rivets([[hx2 - 34, hY - 28], [hx2 + 34, hY - 28], [hx2 - 34, hY + 26], [hx2 + 34, hY + 26], [hx2 - 12, hY - 28], [hx2 + 12, hY - 28]]);
    // the brow: two heavy iron plates, angled down in a scowl (more when enraged)
    const sc = rage || br ? 6 : 3;
    for (const s of [-1, 1]) P([[hx2 + s * 4, hY - 22 + sc], [hx2 + s * 32, hY - 26], [hx2 + s * 32, hY - 19], [hx2 + s * 4, hY - 15 + sc]], I[1]);
    // the cyclops lens: brass ring, glowing pupil, iris blades; a monocle chain
    const eye = off ? 0x2a1a14 : br ? (t % 23 < 3 ? 0x2a1a14 : 0xff2a10) : rage ? 0xff3a20 : 0xffc040, ex = hx2, ey = hY - 4, iris = off ? 1 : 0.45 + 0.25 * Math.sin(t * 0.05);
    g.fillStyle(C.out, 1); g.fillCircle(ex, ey, 20); g.fillStyle(B[3], 1); g.fillCircle(ex, ey, 18); g.fillStyle(B[0], 1); g.fillCircle(ex, ey, 15);
    g.fillStyle(eye, 1); g.fillCircle(ex, ey, 13);
    if (!off && eye !== 0x2a1a14) { g.fillStyle(0xffffff, 0.85); g.fillCircle(ex, ey, 4); g.fillStyle(eye, 0.2); g.fillCircle(ex, ey, 26); }
    for (let i = 0; i < 6; i++) { const q = i / 6 * Math.PI * 2 + t * 0.01, r1 = 13, r2 = 13 * (1 - iris); g.fillStyle(I[0], 0.95); g.fillTriangle(ex + Math.cos(q) * r1, ey + Math.sin(q) * r1, ex + Math.cos(q + 1.05) * r1, ey + Math.sin(q + 1.05) * r1, ex + Math.cos(q + 0.5) * r2, ey + Math.sin(q + 0.5) * r2); }
    g.fillStyle(0xffffff, 0.5); g.fillEllipse(ex - 6, ey - 8, 7, 4);
    if (br) { g.lineStyle(1, 0xffffff, 0.9); g.lineBetween(ex - 10, ey - 8, ex + 2, ey + 1); g.lineBetween(ex + 2, ey + 1, ex + 9, ey - 3); g.lineBetween(ex + 2, ey + 1, ex + 4, ey + 11); g.lineStyle(0); }
    g.lineStyle(1, B[3], 1); for (let k = 0; k < 6; k++) g.strokeCircle(ex + 16 + k * 3, ey + 14 + k * 4, 1.5); g.lineStyle(0);
    // the handlebar moustache over a jaw grille that drops when it speaks
    const jaw = (this.jaw || 0) * 7;
    g.fillStyle(C.out, 1); g.fillRect(hx2 - 16, hY + 14, 32, 11 + jaw); g.fillStyle(glow[1], off ? 0 : 0.5 * (this.jaw || 0)); g.fillRect(hx2 - 14, hY + 16, 28, 4 + jaw);
    for (let k = 0; k < 6; k++) { g.fillStyle(I[3], 1); g.fillRect(hx2 - 14 + k * 5, hY + 16 + jaw, 3, 7); }
    for (const s of [-1, 1]) {
      const pts = [[0, hY + 10], [s * 11, hY + 8], [s * 22, hY + 12], [s * 29, hY + 7], [s * 31, hY], [s * 26, hY + 2], [s * 24, hY + 8], [s * 13, hY + 15], [0, hY + 15]].map(([x, y]) => [x + hx2, y]);
      P(pts.map(([x, y]) => [hx2 + (x - hx2) * 1.08, y + 1]), C.out); P(pts, B[2]); P([[hx2 + s * 4, hY + 11], [hx2 + s * 15, hY + 10], [hx2 + s * 22, hY + 12], [hx2 + s * 13, hY + 12]], B[4]);
    }
    // the top hat smokestack, with a brass band, a little pressure gauge and a hinged lid (the cuckoo and the missile come out of it)
    g.fillStyle(C.out, 1); g.fillRect(hx2 - 32, hY - 40, 64, 9); g.fillRect(hx2 - 21, hY - 84, 42, 46);
    g.fillStyle(I[1], 1); g.fillRect(hx2 - 30, hY - 39, 60, 6); g.fillRect(hx2 - 19, hY - 82, 38, 43);
    g.fillStyle(I[2], 1); g.fillRect(hx2 - 19, hY - 82, 7, 43);
    g.fillStyle(B[2], 1); g.fillRect(hx2 - 19, hY - 54, 38, 7); g.fillStyle(B[3], 1); g.fillRect(hx2 - 19, hY - 54, 38, 2);
    g.fillStyle(C.out, 1); g.fillCircle(hx2 + 10, hY - 67, 6); g.fillStyle(0xf4ecd8, 1); g.fillCircle(hx2 + 10, hY - 67, 4.5); g.lineStyle(1, 0xc02818, 1); g.lineBetween(hx2 + 10, hY - 67, hx2 + 10 + Math.cos(-2 + (br ? 3.6 : rage ? 2 : 0.8)) * 4, hY - 67 + Math.sin(-2 + (br ? 3.6 : rage ? 2 : 0.8)) * 4); g.lineStyle(0);
    g.fillStyle(C.out, 1); g.fillEllipse(hx2, hY - 82, 40, 7);
    if (!off && (rage || br)) { g.fillStyle(br ? 0xff3a10 : C.glow[1], 0.6); g.fillEllipse(hx2, hY - 83, 30, 4); }
    // the furnace's warm light from below, over everything
    if (!off) { g.fillStyle(glow[1], 0.06); g.fillEllipse(0, cy + 30, 260, 200); }
  }

  /** One arm: a ball shoulder, a brass upper arm with a hydraulic piston along it, an elbow gear, an armoured gauntlet with plates and rivets, a four-fingered claw hand. */
  drawArm(g, f, flash, off) {
    const L = this.lean, sx = f.s * COL.shoulderX, sy = COL.shoulderY + L * COL.lean + 6 + this.sink;
    const dx = f.x - sx, dy = f.y - sy, d = Math.hypot(dx, dy) || 1, A = COL.upper, Bn = COL.fore;
    const reach = Math.min(d, A + Bn - 1), cosA = (A * A + reach * reach - Bn * Bn) / (2 * A * reach), ang = Math.atan2(dy, dx) - f.s * Math.acos(Phaser.Math.Clamp(cosA, -1, 1));   // (elbows out and up: hunched, gorilla arms)
    const ex = sx + Math.cos(ang) * A, ey = sy + Math.sin(ang) * A;
    const fl = flash > 0, B = C.brass, I = C.iron, Cu = C.copper;
    const limb = (x1, y1, x2, y2, w, cols) => { g.lineStyle(w + 4, C.out, 1); g.lineBetween(x1, y1, x2, y2); g.lineStyle(w, fl ? 0xfff0d0 : cols[0], 1); g.lineBetween(x1, y1, x2, y2); g.lineStyle(Math.max(2, w * 0.35), cols[1], 1); g.lineBetween(x1 - 2, y1 - 2, x2 - 2, y2 - 2); g.lineStyle(0); };
    const band = (x1, y1, x2, y2, k, w, col) => { const bx = x1 + (x2 - x1) * k, by = y1 + (y2 - y1) * k, l = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / l, ny = (x2 - x1) / l; g.lineStyle(5, C.out, 1); g.lineBetween(bx - nx * w, by - ny * w, bx + nx * w, by + ny * w); g.lineStyle(3, col, 1); g.lineBetween(bx - nx * w, by - ny * w, bx + nx * w, by + ny * w); g.lineStyle(0); };
    const ul = Math.hypot(ex - sx, ey - sy) || 1, nx = -(ey - sy) / ul * f.s, ny = (ex - sx) / ul * f.s;
    // the hydraulic piston along the upper arm (its rod slides as the elbow bends)
    const p1 = { x: sx + nx * 16, y: sy + ny * 16 }, p2 = { x: ex + nx * 14, y: ey + ny * 14 }, pm = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    limb(p1.x, p1.y, pm.x, pm.y, 9, [I[2], I[4]]); limb(pm.x, pm.y, p2.x, p2.y, 4, [0xd8d8e0, 0xffffff]);
    limb(sx, sy, ex, ey, 24, [B[1], B[3]]);
    for (const k of [0.25, 0.55, 0.8]) band(sx, sy, ex, ey, k, 13, Cu[2]);
    limb(ex, ey, f.x, f.y, 10, [I[2], I[4]]);                                               // the piston rod
    const mx = ex + (f.x - ex) * 0.45, my = ey + (f.y - ey) * 0.45;
    limb(ex, ey, mx, my, 21, [Cu[1], Cu[3]]);                                               // its sleeve
    const wx = ex + (f.x - ex) * 0.72, wy = ey + (f.y - ey) * 0.72;
    limb(wx, wy, f.x, f.y, 22, [B[2], B[4]]);                                               // the gauntlet
    band(ex, ey, f.x, f.y, 0.78, 13, B[0]); band(ex, ey, f.x, f.y, 0.9, 13, B[0]);
    this.cog(g, ex, ey, 15, this.t * 0.05 * f.s, [B[0], B[1], B[2], B[4]]);
    // the claw hand: a palm, four jointed fingers, a thumb, brass knuckle caps
    const x = f.x, y = f.y;
    g.fillStyle(C.out, 1); g.fillRoundedRect(x - 28, y - 22, 56, 31, 9);
    g.fillStyle(fl ? 0xfff0d0 : B[1], 1); g.fillRoundedRect(x - 25, y - 19, 50, 26, 7); g.fillStyle(B[2], 1); g.fillRoundedRect(x - 23, y - 18, 44, 10, 5);
    for (const [rx, ry] of [[-18, -14], [18, -14], [-18, 2], [18, 2]]) { g.fillStyle(B[4], 1); g.fillRect(x + rx - 1, y + ry - 1, 2, 2); }
    for (let k = 0; k < 4; k++) {
      const fx = x - 19 + k * 12.7;
      g.fillStyle(C.out, 1); g.fillRoundedRect(fx - 6, y + 2, 12, 22, 4); g.fillStyle(I[2], 1); g.fillRoundedRect(fx - 4, y + 4, 8, 18, 3);
      g.fillStyle(I[3], 1); g.fillRect(fx - 4, y + 4, 2, 16); g.fillStyle(B[3], 1); g.fillCircle(fx, y + 4, 3.5); g.fillStyle(C.out, 1); g.fillRect(fx - 4, y + 13, 8, 2);
      g.fillStyle(I[1], 1); g.fillTriangle(fx - 3.5, y + 22, fx + 3.5, y + 22, fx, y + 28);
    }
    const tx = x - f.s * 28;
    g.fillStyle(C.out, 1); g.fillRoundedRect(tx - 7, y - 10, 14, 20, 5); g.fillStyle(I[2], 1); g.fillRoundedRect(tx - 5, y - 8, 10, 16, 4); g.fillStyle(B[3], 1); g.fillCircle(tx, y - 6, 3.5);
    if (f.resting && !off) { g.fillStyle(0xffffff, 0.08 + 0.06 * Math.sin(this.t * 0.3)); g.fillRoundedRect(x - 25, y - 19, 50, 26, 7); }
    if (this.broken && !off && this.t % 11 < 2) { g.fillStyle(0xffe070, 1); g.fillRect(ex + (Math.random() - 0.5) * 10, ey + (Math.random() - 0.5) * 10, 2, 2); }   // (sparks at the elbows)
  }

  // ------------------------------------------------------------------ BROKEN: the third stage
  /**
   * Its core breaks (health under `BROKE.at`): with a player watching, a short cutscene - the camera on its chest, cracks
   * spreading, the glass bursts, a gout of fire and steam, it staggers, and the 30-SECOND CLOCK appears. Without one
   * (the sim) it just breaks. From then on its attacks get sloppy (they miss by more, come faster), its core is
   * exposed (x`BROKE.mult`) - and if the clock runs out first: NOW I'VE GOTCHA.
   */
  breakCore(match) {
    this.broken = true; this.clock = BROKE.time; this.boss.atk = null; this.cuckoo = null; this.cogs = []; this.rivets = []; this.hot = 0;
    this.rageText.setText('CORE BREACH!').setVisible(true); this.boss.rage = 90;
    if (this.watched) { const cam = match.worldCam || match.cameras.main; this.cut = { kind: 'break', t: 0, n: BROKE.cut, once: new Set(), armed: false }; this.ccam = { x: cam.midPoint.x, y: cam.midPoint.y, zoom: cam.zoom }; this.boss.rage = 0; this.rageText.setVisible(false); }
    else this.burst(match);
  }
  /** The glass bursting: a flash of fire, shards, steam everywhere. */
  burst(match) {
    const c = this.core(); sfx('bighit', 1, 0.5); sfx('glass', 1, 0.8); sfx('geyser', 1, 0.6); match.shake(14, 30);
    for (let i = 0; i < 30; i++) match.particles.push({ x: c.x + (Math.random() - 0.5) * 40, y: c.y + (Math.random() - 0.5) * 40, vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 7, life: 40, color: i % 3 ? C.glow[i % 4] : 0xd8f0f0, size: 3, grav: 0.2 });
    for (let i = 0; i < 24; i++) this.puff((Math.random() - 0.5) * 160, c.y + (Math.random() - 0.5) * 80, 1.6, -2);
  }
  /** The cutscene camera (MatchScene asks introCam): eased toward `cut.shot`. */
  introCam() {
    if (!this.cut) return super.introCam();
    const w = this.cut.shot || { x: 0, y: -150, zoom: 1 }; const k = this.missile ? 0.3 : 0.1; this.ccam = { x: lerpY(this.ccam.x, w.x, k), y: lerpY(this.ccam.y, w.y, k), zoom: lerpY(this.ccam.zoom, w.zoom, 0.1) };
    return { ...this.ccam, exact: true };
  }
  /** A fresh press skips to the end of a cutscene. */
  skipCut(match) { const C2 = this.cut; if (C2.kind === 'break') { if (!C2.once.has('burst')) this.burst(match); C2.t = C2.n; } else { C2.t = Math.max(C2.t, GOTCHA.hit - 1); } this.cutStep(match); }
  /** One frame of a cutscene: the core breaking, or NOW I'VE GOTCHA. */
  cutStep(match) {
    const C2 = this.cut, t = ++C2.t; this.t++;
    const once = (k, at) => t >= at && !C2.once.has(k) && !!C2.once.add(k);
    for (const p of this.puffs) { p.t++; p.x += p.vx; p.y += p.vy; p.r += 0.25; } this.puffs = this.puffs.filter((p) => p.t < p.life);
    for (const f of this.fists) this.toward(f, f.s * COL.rest[0], COL.rest[1], 0.08);
    if (C2.kind === 'break') {
      const c = this.core(); C2.shot = t < 100 ? { x: 0, y: c.y, zoom: 1.9 } : { x: 0, y: -150, zoom: 1 };
      this.crackK = Math.min(1, t / 70); this.keyA += t < 90 ? 0.02 : 0.2;
      if (t % 14 === 0 && t < 90) { sfx('clang', 0.5, 1.6 + t / 200); match.shake(2 + t / 30, 6); }
      if (once('burst', 90)) this.burst(match);
      if (t > 90) this.lean = Math.max(0, 0.8 - (t - 90) / 50);
      this.drawClockUI(t > 120 ? Math.min(1, (t - 120) / 20) : 0);
      if (once('clock', 125)) { sfx('ding', 1, 0.6); this.rageText.setText('30 SECONDS!').setVisible(true); }
      if (t >= C2.n) { this.cut = null; this.crackK = 1; this.boss.rage = 90; this.boss.wait = 40; this.rageText.setText('CORE BREACH!  BEAT THE CLOCK!').setVisible(true); }
      return;
    }
    // NOW I'VE GOTCHA: the lid flips, the line, the missile climbs out of its hat, arcs over and dives on you - BOOM
    const tg = C2.target, h = this.hatTop();
    C2.shot = t < GOTCHA.launch ? { x: 0, y: h.y + 40, zoom: 1.7 } : t < GOTCHA.hit ? (this.missile ? { x: this.missile.x, y: this.missile.y, zoom: 1.4 } : { x: 0, y: h.y, zoom: 1.4 }) : { x: tg ? tg.x : 0, y: tg ? Math.min(-40, tg.y - 30) : -60, zoom: 1.4 };
    this.lid = Math.min(1, t / 20); this.jaw = t > GOTCHA.line && t < GOTCHA.line + 50 ? 0.5 + 0.5 * Math.abs(Math.sin(t * 0.4)) : 0;
    if (once('line', GOTCHA.line)) { this.rageText.setText('NOW I\'VE GOTCHA.').setColor('#ffc860').setFontSize(16).setVisible(true); sfx('laugh', 1, 0.6); match.snapBoss(); }
    if (once('quiet', GOTCHA.launch + 20)) this.rageText.setVisible(false);
    if (once('launch', GOTCHA.launch)) { this.missile = { x: h.x, y: h.y, vx: 0, vy: -4, a: -Math.PI / 2, trail: [] }; sfx('flame', 1, 0.6); sfx('whoosh', 1, 0.5); sfx('geyser', 0.8, 1.2); }
    const M = this.missile;
    if (M && t < GOTCHA.hit) {                                                     // up out of the hat, over the top, then homing down
      const k = (t - GOTCHA.launch) / (GOTCHA.hit - GOTCHA.launch), aimX = tg ? tg.x : 0, aimY = tg ? tg.y - 20 : -20;
      if (k < 0.22) { M.vy -= 0.12; M.vx += (aimX > 0 ? 0.14 : -0.14); }
      else { const dx = aimX - M.x, dy = aimY - M.y, d = Math.hypot(dx, dy) || 1, sp = 6 + k * 10; M.vx += (dx / d * sp - M.vx) * 0.15; M.vy += (dy / d * sp - M.vy) * 0.15; }
      M.x += M.vx; M.y += M.vy; M.a = Math.atan2(M.vy, M.vx);
      M.trail.push({ x: M.x - Math.cos(M.a) * 16, y: M.y - Math.sin(M.a) * 16 }); if (M.trail.length > 30) M.trail.shift();
      if (t % 3 === 0) this.puff(M.x - Math.cos(M.a) * 18, M.y - Math.sin(M.a) * 18, 0.8, -0.3);
      if (t % 12 === 0) sfx('whoosh', 0.4, 1.6);
    }
    if (once('boom', GOTCHA.hit)) {                                                 // BOOM - blown to pieces
      this.missile = null; sfx('bighit', 1, 0.4); sfx('thunder', 1, 0.7); sfx('ko', 1, 0.5); match.shake(22, 40);
      for (const f of match.fighters) {
        if (!f.alive) continue;
        for (let i = 0; i < 60; i++) { const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 9; match.particles.push({ x: f.x, y: f.y - 25, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3, life: 50 + Math.random() * 40, color: [f.color, 0x1a1a1a, f.color, 0xffffff, C.glow[1]][i % 5], size: 2 + (i % 4), grav: 0.25, drag: 0.98 }); }
        for (let i = 0; i < 20; i++) this.puff(f.x + (Math.random() - 0.5) * 60, f.y - 20 - Math.random() * 60, 2, -1.5);
        f.x = 0; f.y = 3000;                                                          // (gone - in pieces)
      }
    }
    if (t >= GOTCHA.n) { this.cut = null; this.lid = 0; this.ending = true; this.ko(match); }
  }
  /** NOW I'VE GOTCHA (the clock ran out): with a player watching, the cutscene; then everyone is out - the fight is lost. */
  gotcha(match) {
    this.gotchaDone = true; this.boss.atk = null; this.cuckoo = null; this.cogs = []; this.rivets = [];
    this.taunts = ['NOW I\'VE GOTCHA.'];
    if (this.watched) { const cam = match.worldCam || match.cameras.main; this.cut = { kind: 'gotcha', t: 0, n: GOTCHA.n, once: new Set(), target: this.nearest(match), armed: false }; this.ccam = { x: cam.midPoint.x, y: cam.midPoint.y, zoom: cam.zoom }; this.rageText.setVisible(false); this.clockG.setVisible(false); this.clockT.setVisible(false); }
    else this.ko(match);
  }
  /** Everyone still in is knocked out on the spot (their last life too) - the game is over. */
  ko(match) { for (const f of match.fighters) { if (f.eliminated) continue; f.stocks = 1; f.alive = true; match.onKO(f); } }
  /**
   * THE CLOCK (UI layer, while broken): a brass pocket watch under the health bar - a red wedge of the time left
   * shrinking round the dial, a sweeping second hand, the seconds in big digits; it pulses red and ticks harder in
   * the last ten. `a` = how far it has faded in.
   */
  drawClockUI(a = 1) {
    const g = this.clockG, T = this.clockT; if (!g) return;
    g.clear(); g.setVisible(a > 0); T.setVisible(a > 0);
    if (a <= 0) return;
    const x = VIEW_W - 64, y = 80, r = 22, left = Math.max(0, this.clock) / BROKE.time, secs = Math.ceil(Math.max(0, this.clock) / 60), last = secs <= 10, pulse = last ? 0.5 + 0.5 * Math.sin(this.t * 0.4) : 0;
    g.setAlpha(a); T.setAlpha(a);
    g.fillStyle(0x000000, 0.4); g.fillCircle(x + 3, y + 3, r + 6);
    g.fillStyle(C.brass[0], 1); g.fillRect(x - 4, y - r - 12, 8, 8); g.fillStyle(C.brass[3], 1); g.fillCircle(x, y - r - 13, 5); g.fillStyle(C.brass[1], 1); g.fillCircle(x, y - r - 13, 3);   // the crown
    g.fillStyle(C.out, 1); g.fillCircle(x, y, r + 6); g.fillStyle(C.brass[2], 1); g.fillCircle(x, y, r + 4); g.fillStyle(C.brass[4], 1); g.fillCircle(x - 2, y - 2, r + 1); g.fillStyle(C.brass[1], 1); g.fillCircle(x, y, r + 1);
    g.fillStyle(last ? Phaser.Display.Color.GetColor(255, Math.round(236 - 120 * pulse), Math.round(216 - 140 * pulse)) : 0xf4ecd8, 1); g.fillCircle(x, y, r);
    if (left > 0) { g.fillStyle(0xd02818, 0.75); g.slice(x, y, r - 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left, false); g.fillPath(); }
    for (let i = 0; i < 12; i++) { const q = i / 12 * Math.PI * 2; g.fillStyle(C.out, 1); g.fillRect(x + Math.cos(q) * (r - 4) - 1, y + Math.sin(q) * (r - 4) - 1, 2, i % 3 ? 2 : 4); }
    const sq = -Math.PI / 2 + ((this.clock % 60) / 60) * -Math.PI * 2;
    g.lineStyle(2, C.out, 1); g.lineBetween(x, y, x + Math.cos(sq) * (r - 3), y + Math.sin(sq) * (r - 3)); g.lineStyle(0); g.fillStyle(C.brass[2], 1); g.fillCircle(x, y, 2.5);
    T.setText(String(secs)).setPosition(x, y + r + 16).setColor(last ? '#ff4a2a' : '#ffe08a').setScale(1 + pulse * 0.15);
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

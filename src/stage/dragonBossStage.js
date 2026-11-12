// DRAGON'S KEEP - the arena of ASHWING, THE ELDER DRAGON (boss III, medieval; Trinkets > BOSS FIGHTS, src/data/bosses.js).
// The battlement walk of a castle keep at night: a blood-red moon, a sky lit orange by the burning town below, black
// mountains, banners on two towers with braziers on top, torches along the wall.
// ASHWING hovers over one side of the keep (drawn in code every frame - drawDragon: beating wings, a scaled body
// with a pale belly, a neck that curves to a horned head with a hinged jaw, a long spiked tail).
//   Weak point: the HEAD (x1.3). The neck takes x0.8, the body x0.6. At half health she flies into a RAGE: her wings
//   glow like embers, everything is faster, she breathes fire both ways and calls down meteors.
//   Attacks: FIRE BREATH (she draws breath - her throat glows - then sweeps a stream of fire across the walk),
//   FIREBALLS (arcing; they leave burning patches), TAIL SWEEP (she turns, raises her tail, sweeps the floor - jump it),
//   SKY DIVE (she climbs out of sight, a streak warns where, then swoops across the walk at full speed and lands on
//   the other side), CHOMP (her head lunges at you), METEORS (ENRAGED: burning rocks fall on marked spots).
// Stage hazards (also in VS, where she circles far off over the burning town): CATAPULT STONE (a boulder lobbed in
// from off the keep, on a marked spot, then rolling) and BRAZIER FLARE (the tower braziers erupt into pillars of fire).
import { HazardCycle } from './hazardCycle.js';
import { BossArena } from './bossBase.js';
import { sfx } from '../audio/sfx.js';

const C = { out: 0x12060a, sky: [0x0a0614, 0x1a0a20, 0x2e0e22, 0x4a1420, 0x7a2018, 0xb83a14, 0xe86a1a], moon: [0xe8b0a0, 0xc88070, 0xa86058],
  stone: [0x1e1a26, 0x2e2834, 0x403848, 0x585060, 0x787080], banner: [0x6a0a12, 0x9a1418, 0xd8a838],
  scale: [0x2a0808, 0x5a1214, 0x8a1e1c, 0xb83226], belly: [0x9a6a34, 0xc89048, 0xe8bc68], horn: [0xf0e4c8, 0xb8a88a], wing: [0x3a0a10, 0x5a1418, 0x8a2420],
  fire: [0xc02008, 0xff5010, 0xff9a20, 0xffe060, 0xfff8d8], ember: [0xff7a1a, 0xffb040] };
// where ASHWING hovers (body), how far over the walk her head reaches, how big her head is drawn
const DR = { x: 178, y: -200, headX: 78, headY: -128, k: 1.55 };
// FIRE BREATH: drawing breath, the sweep (frames), how wide it is at the floor, its hit (ticks every `tick` frames)
const BREATH = { inhale: 52, sweep: 78, tick: 14, hit: [6, [52, 4.6, 0.55]] };
// FIREBALLS: how many (normal / enraged), frames between, flight time, size, hit; the burning patch: life, hit
const BALLS = { n: [3, 5], every: 16, flight: 46, grav: 0.26, r: 12, hit: [9, [55, 5.4, 0.7]], patch: 200, burn: [4, [80, 3.4, 0.3]] };
// TAIL SWEEP: raised (frames), the sweep, its hit
const TAIL = { raise: 46, sweep: 36, hit: [13, [38, 6.6, 1.0]] };
// SKY DIVE: the climb, the warning, swoop speed, the return; its hit
const DIVE = { up: 40, warn: 54, speed: 15, back: 70, y: -44, hit: [15, [35, 7, 1.0]] };
// CHOMP: the wind-up, the lunge, its hit
const CHOMP = { wind: 30, lunge: 12, hit: [12, [40, 6, 0.9]] };
// METEORS (enraged): how many, frames between, warning, hit
const METEOR = { n: 8, every: 10, warn: 46, hit: [9, [80, 5, 0.6]] };
// CATAPULT STONE hazard: flight frames, size, hit; BRAZIER FLARE: warning, flare frames, its hit (ticks)
const STONE = { flight: 70, r: 18, hit: [12, [60, 6, 0.8]] };
const FLARE = { warn: 70, on: 70, x: 208, hit: [6, [85, 5, 0.5]] };
// where the sky picture is placed on the background camera
const SKY = { x: 320, y: 255 };

/** A point on a quadratic curve (a, control b, c) at t. */
const qb = (a, b, c, t) => ({ x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * b.x + t * t * c.x, y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * b.y + t * t * c.y });

/** DRAGON'S KEEP and ASHWING (see the top of the file). */
export class DragonBossStage extends BossArena {
  constructor(scene) {
    super();
    this.scene = scene; this.t = 0; this.hazardsOn = true; this.music = 'bgm_boss_dragon';
    this.platforms = [
      { x1: -270, x2: 270, y: 0, solid: true, bottom: 70 },
      { x1: -252, x2: -164, y: -112, solid: false },
      { x1: 164, x2: 252, y: -112, solid: false },
    ];
    this.spawns = [{ x: -120, y: 0 }, { x: 60, y: 0 }, { x: -40, y: 0 }, { x: 120, y: 0 }];
    this.cycle = new HazardCycle(this, ['stone', 'flare'], { color: '#ffb040', stroke: '#2a0606', gap: 700 });
    this.dr = { bx: DR.x, by: DR.y, side: 1, hx: DR.headX, hy: DR.headY, jaw: 0, glow: 0, dir: -1, tail: null, flap: 0, hide: false };
    this.balls = []; this.patches = []; this.meteors = []; this.flame = null; this.stone = null; this.flare = null; this.streak = null;
    this.sparkColor = 0xff7a1a; this.bodyW = 200; this.bodyH = 120;
  }

  /** Builds the night sky, the burning town far below, the keep's back wall and towers, the walk's front. */
  draw(world, bg) {
    const s = this.scene;
    // (the background camera shows about 0..640 x 0..360: the sky is drawn round 0,0 and placed so its horizon sits behind the keep)
    const sky = s.add.graphics().setScrollFactor(0.12).setPosition(SKY.x, SKY.y); bg.push(sky); this.paintSky(sky);
    this.farG = s.add.graphics().setScrollFactor(0.12).setPosition(SKY.x, SKY.y); bg.push(this.farG);
    const back = s.add.graphics(); world.push(back); this.paintKeep(back);
    this.dragonG = s.add.graphics(); world.push(this.dragonG);
    const front = s.add.graphics(); world.push(front); this.paintWalk(front);
    this.fxG = s.add.graphics(); world.push(this.fxG);
    this.cycle.makeBanner(s);
  }

  /** The sky: night bands down to a burning orange horizon, stars, the red moon, black mountains, the burning town. */
  paintSky(g) {
    const x0 = -700, y0 = -440;
    g.fillStyle(C.sky[0], 1); g.fillRect(x0, y0 - 400, 1400, 400);
    C.sky.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(x0, y0 + i * 62, 1400, 64); });
    for (let i = 0; i < 90; i++) { const x = x0 + (i * 197) % 1400, y = y0 + (i * 89) % 320; g.fillStyle(0xffffff, 0.3 + (i % 4) * 0.15); g.fillRect(x, y, i % 9 ? 1 : 2, i % 9 ? 1 : 2); }
    g.fillStyle(C.moon[2], 0.25); g.fillCircle(-200, -180, 70); g.fillStyle(C.moon[1], 1); g.fillCircle(-200, -180, 50); g.fillStyle(C.moon[0], 1); g.fillCircle(-206, -186, 42);
    g.fillStyle(C.moon[1], 1); g.fillCircle(-188, -192, 8); g.fillCircle(-214, -170, 6);
    const ridge = (yb, h, col, seed) => { const pts = [{ x: x0, y: 200 }]; for (let x = x0; x <= 700; x += 40) pts.push({ x, y: yb - h * (0.4 + 0.6 * Math.abs(Math.sin(x * 0.013 + seed) * Math.cos(x * 0.004 + seed * 2))) }); pts.push({ x: 700, y: 200 }); g.fillStyle(col, 1); g.fillPoints(pts, true); };
    ridge(-40, 150, 0x1a0a14, 1); ridge(10, 90, 0x10060c, 3);
    for (let i = 0; i < 18; i++) {                                                         // the burning town
      const x = x0 + 60 + i * 76, h = 14 + (i * 13) % 22;
      g.fillStyle(0x0a0408, 1); g.fillRect(x, 40 - h, 30, h + 160); g.fillTriangle(x - 3, 40 - h, x + 33, 40 - h, x + 15, 26 - h);
      if (i % 3 !== 1) { g.fillStyle(C.fire[2], 0.8); g.fillRect(x + 8, 46 - h, 5, 5); }
    }
    g.fillStyle(C.fire[1], 0.25); g.fillRect(x0, 30, 1400, 30); g.fillStyle(C.fire[2], 0.15); g.fillRect(x0, 50, 1400, 30);
  }

  /** The keep behind the walk: the crenellated parapet, the two towers with banners, braziers and torches. */
  paintKeep(g) {
    const S = C.stone, brick = (x1, y1, x2, y2, c0) => {
      g.fillStyle(c0[0], 1); g.fillRect(x1, y1, x2 - x1, y2 - y1);
      for (let y = y1; y < y2; y += 10) for (let x = x1 + ((y - y1) / 10 % 2) * 9; x < x2; x += 18) { g.fillStyle(c0[1 + ((x * 3 + y) & 1)], 1); g.fillRect(x + 1, y + 1, Math.min(16, x2 - x - 1), 8); }
    };
    brick(-290, -50, 290, 4, [S[0], S[1], S[2]]);                                           // the parapet behind the walk
    for (let x = -290; x < 290; x += 36) { brick(x, -76, x + 22, -50, [S[0], S[1], S[2]]); g.fillStyle(S[3], 1); g.fillRect(x, -76, 22, 3); }
    for (const sx of [-1, 1]) {                                                              // the towers
      const x1 = sx < 0 ? -258 : 158, x2 = sx < 0 ? -158 : 258;
      brick(x1, -112, x2, 4, [S[1], S[2], S[3]]);
      for (let x = x1; x < x2; x += 25) { brick(x, -134, x + 15, -112, [S[1], S[2], S[3]]); g.fillStyle(S[4], 1); g.fillRect(x, -134, 15, 3); }
      g.fillStyle(C.out, 1); g.fillRect((x1 + x2) / 2 - 3, -92, 6, 18);                      // an arrow slit
      const bx = (x1 + x2) / 2;                                                              // a banner
      g.fillStyle(C.banner[0], 1); g.fillRect(bx - 22, -66, 44, 56); g.fillTriangle(bx - 22, -10, bx + 22, -10, bx, 4);
      g.fillStyle(C.banner[1], 1); g.fillRect(bx - 18, -66, 36, 50); g.fillTriangle(bx - 18, -16, bx + 18, -16, bx, -4);
      g.fillStyle(C.banner[2], 1); g.fillRect(bx - 22, -68, 44, 4); g.fillTriangle(bx - 10, -50, bx + 10, -50, bx, -28); g.fillTriangle(bx - 10, -30, bx + 10, -30, bx, -44);
      g.fillStyle(S[0], 1); g.fillRect(FLARE.x * sx - 10, -122, 20, 10); g.fillStyle(0x6a5030, 1); g.fillRect(FLARE.x * sx - 16, -128, 32, 7);   // the brazier
    }
    for (const x of [-110, 0, 110]) { g.fillStyle(0x3a2414, 1); g.fillRect(x - 2, -40, 4, 14); g.fillStyle(0x6a4a2a, 1); g.fillRect(x - 4, -44, 8, 5); }   // torch holders
  }

  /** The walk's front (in front of the dragon): stone with a lip, arrow slits, the wall dropping away. */
  paintWalk(g) {
    const S = C.stone, P = this.platforms[0];
    g.fillStyle(C.out, 1); g.fillRect(P.x1 - 3, -2, P.x2 - P.x1 + 6, 76);
    g.fillStyle(S[3], 1); g.fillRect(P.x1, 0, P.x2 - P.x1, 6); g.fillStyle(S[4], 1); g.fillRect(P.x1, 0, P.x2 - P.x1, 2);
    for (let y = 6; y < 72; y += 11) for (let x = P.x1 + ((y / 11) % 2) * 10; x < P.x2; x += 20) { g.fillStyle(S[1 + ((x + y) & 1)], 1); g.fillRect(x + 1, y + 1, Math.min(18, P.x2 - x - 1), 9); }
    for (const x of [-180, -60, 60, 180]) { g.fillStyle(C.out, 1); g.fillRect(x - 3, 22, 6, 22); }
    for (const sx of [-1, 1]) { g.fillStyle(C.out, 1); g.fillRect(sx * 208 - 46, -114, 92, 6); g.fillStyle(S[4], 1); g.fillRect(sx * 208 - 44, -113, 88, 2); }
  }

  // ------------------------------------------------------------------ ASHWING
  /** The boss's own state when the fight starts. */
  makeBoss() { this.cycle.gap = 1250; this.cycle.next = 1500; }
  /** Her head: what the CPU aims at and the explosions centre on. */
  core() { return { x: this.dr.hx, y: this.dr.hy }; }
  /** The camera keeps the whole keep in view (she flies off the screen in a dive). */
  camPoints() { return this.boss && this.boss.dying < 100 ? [{ x: -260, y: -250 }, { x: 260, y: 0 }] : []; }
  /** Where she can be hit: her head (x1.3), the middle of her neck (x0.8), her body (x0.6). Nothing while out of sight. */
  hurt() {
    const D = this.dr; if (D.hide) return [];
    const n = this.neckMid();
    return [{ x1: D.hx - 34, y1: D.hy - 26, x2: D.hx + 34, y2: D.hy + 24, mult: 1.3 }, { x1: n.x - 18, y1: n.y - 18, x2: n.x + 18, y2: n.y + 18, mult: 0.8 },
      { x1: D.bx - 60, y1: D.by - 30, x2: D.bx + 60, y2: D.by + 34, mult: 0.6 }];
  }
  /** The neck's base and the middle of its curve. */
  neckBase() { const D = this.dr; return { x: D.bx + D.dir * 50, y: D.by - 22 }; }
  neckCtl() { const D = this.dr, N = this.neckBase(); return { x: N.x + D.dir * 34, y: Math.min(N.y, D.hy) - 44 }; }
  neckMid() { return qb(this.neckBase(), this.neckCtl(), { x: this.dr.hx, y: this.dr.hy }, 0.5); }
  /** What she can do: ENRAGED adds METEORS and dives more often. */
  pattern(phase) { return phase === 1 ? ['breath', 'balls', 'tail', 'dive', 'chomp'] : ['breath', 'balls', 'tail', 'dive', 'meteor', 'chomp', 'dive']; }
  rageLine() { return 'ASHWING IS ENRAGED!'; }
  /** Ember wings, a ring of fire round her. */
  onRage(match) { for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2; match.particles.push({ x: this.dr.bx, y: this.dr.by, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, life: 30, color: C.fire[i % 4 + 1], size: 3, drag: 0.94 }); } }

  /** Hovering: her body bobs over her side of the keep, her head weaves above the walk, watching the nearest player. */
  idle(match) {
    const D = this.dr, tg = this.nearest(match, D.bx);
    D.dir = -D.side;
    this.ease(D, 'bx', D.side * DR.x + Math.sin(this.t * 0.02) * 10, 0.05); this.ease(D, 'by', DR.y + Math.sin(this.t * 0.05) * 10, 0.08);
    const hx = D.side * DR.headX + (tg ? Phaser.Math.Clamp((tg.x - D.side * DR.headX) * 0.15, -30, 30) : 0);
    this.ease(D, 'hx', hx + Math.sin(this.t * 0.035) * 8, 0.06); this.ease(D, 'hy', DR.headY + Math.sin(this.t * 0.045) * 10, 0.06);
    D.jaw = Math.max(0, D.jaw - 0.06); D.glow = Math.max(0, D.glow - 0.05); D.tail = null;
  }
  /** Moves one of her numbers part of the way to a target. */
  ease(o, k, v, a) { o[k] += (v - o[k]) * a; }
  /** Her mouth: where fire comes from. */
  mouth() { const D = this.dr; return { x: D.hx + D.dir * 40, y: D.hy + 6 }; }

  /** FIRE BREATH: she rears back drawing breath (throat glowing), then sweeps fire across the walk (and back, enraged). */
  atk_breath(match, a, out) {
    const D = this.dr, inh = this.sp(BREATH.inhale), sw = this.sp(BREATH.sweep), both = this.boss.phase === 2, end = inh + sw * (both ? 2 : 1);
    D.dir = -D.side;
    if (a.t < inh) { this.ease(D, 'hx', D.side * (DR.headX + 40), 0.08); this.ease(D, 'hy', DR.headY - 50, 0.08); D.glow = a.t / inh; D.jaw = 0.2; if (a.t === 1) sfx('roar', 0.5, 1.3); if (a.t % 6 === 0) this.smoke(match); return false; }
    if (a.t < end) {
      const k = ((a.t - inh) % sw) / sw, back = a.t - inh >= sw, kk = back ? 1 - k : k;
      const tx = D.side * 150 - D.side * 400 * kk;                                          // the fire's spot on the walk, sweeping away from her
      this.ease(D, 'hx', D.side * (DR.headX - 10) - D.side * 40 * kk, 0.15); this.ease(D, 'hy', DR.headY + 10, 0.1); D.jaw = 1; D.glow = 1;
      const m = this.mouth(); this.flame = { x0: m.x, y0: m.y, x1: tx, y1: -6 };
      for (let i = 1; i <= 6; i++) { const q = i / 6, x = m.x + (tx - m.x) * q, y = m.y + (-6 - m.y) * q, r = 10 + 18 * q; out.push(this.bhit('br' + a.id + i + Math.floor(a.t / BREATH.tick), x - r, y - r, x + r, y + r, ...BREATH.hit, { dirX: -D.side })); }
      if (a.t === inh) sfx('flame', 1, 0.6);
      if (a.t % 10 === 0) sfx('flame', 0.5, 0.8 + Math.random() * 0.3);
      if (a.t % 2 === 0) match.particles.push({ x: tx + (Math.random() - 0.5) * 30, y: -6, vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 2, life: 20, color: C.fire[1 + (a.t % 4)], size: 3 });
      return false;
    }
    this.flame = null; D.glow = 0;
    return a.t > end + 24;
  }

  /** FIREBALLS: she spits burning balls that arc onto the walk near the players; where they land, the stone burns. */
  atk_balls(match, a, out) {
    const D = this.dr, n = BALLS.n[this.boss.phase - 1], open = this.sp(26);
    D.dir = -D.side; D.jaw = Math.min(1, a.t / 12); D.glow = 0.5;
    if (a.t >= open && (a.t - open) % this.sp(BALLS.every) === 0 && (a.t - open) / this.sp(BALLS.every) < n) {
      const tg = this.nearest(match, D.hx), m = this.mouth(), T = BALLS.flight;
      const tx = Phaser.Math.Clamp((tg ? tg.x : 0) + (Math.random() - 0.5) * 120, -255, 255);
      this.balls.push({ x: m.x, y: m.y, vx: (tx - m.x) / T, vy: (0 - m.y - 0.5 * BALLS.grav * T * T) / T, id: this.sid('ball') });
      sfx('flame', 0.7, 1.2); D.jaw = 1;
    }
    return a.t > open + this.sp(BALLS.every) * n + 20;
  }
  /** Fireballs fly; landing they burst and leave a burning patch. Patches burn a while. */
  stepBalls(match, out) {
    for (const b of this.balls) {
      b.vy += BALLS.grav; b.x += b.vx; b.y += b.vy;
      out.push(this.bhit(b.id, b.x - BALLS.r, b.y - BALLS.r, b.x + BALLS.r, b.y + BALLS.r, ...BALLS.hit, { radial: true }));
      if (b.y >= -BALLS.r && Math.abs(b.x) < 270) { b.dead = true; this.patches.push({ x: b.x, t: 0, id: b.id }); sfx('flame', 0.6, 0.7); for (let i = 0; i < 10; i++) match.particles.push({ x: b.x, y: -6, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 4, life: 20, color: C.fire[1 + i % 4], size: 3, grav: 0.1 }); }
      if (b.y > 400) b.dead = true;
    }
    this.balls = this.balls.filter((b) => !b.dead);
    for (const p of this.patches) { p.t++; if (this.hazardsOn || this.boss) out.push(this.bhit(p.id + 'p' + Math.floor(p.t / 30), p.x - 24, -20, p.x + 24, 0, ...BALLS.burn)); }
    this.patches = this.patches.filter((p) => p.t < BALLS.patch);
  }

  /** TAIL SWEEP: she turns her back to the walk, raises her spiked tail high (rattling), then sweeps it across the floor. */
  atk_tail(match, a, out) {
    const D = this.dr, up = this.sp(TAIL.raise), sw = this.sp(TAIL.sweep);
    D.dir = D.side;                                                                          // (her back to the walk)
    this.ease(D, 'bx', D.side * 205, 0.08); this.ease(D, 'by', -150, 0.08);
    this.ease(D, 'hx', D.side * 290, 0.1); this.ease(D, 'hy', -200, 0.1);
    if (a.t < up) { D.tail = { x: D.side * 120 + Math.sin(a.t * 1.3) * 6, y: -310 }; if (a.t === 1) sfx('rumble', 0.6, 1.3); return false; }
    if (a.t < up + sw) {
      const k = (a.t - up) / sw, x = D.side * 240 - D.side * 470 * k, y = -18 - Math.sin(Math.min(1, k * 6) * Math.PI / 2) * 0 + (k < 0.12 ? -250 * (1 - k / 0.12) : 0);
      D.tail = { x, y };
      out.push(this.bhit('tail' + a.id, x - 34, y - 26, x + 34, y + 18, ...TAIL.hit, { dirX: -D.side }));
      if (a.t === up) sfx('whoosh', 1, 0.5);
      return false;
    }
    if (a.t === up + sw) { sfx('bighit', 0.6, 0.7); match.shake(5, 8); }
    D.tail = null; D.dir = -D.side;
    return a.t > up + sw + 34;
  }

  /** SKY DIVE: she climbs out of sight; a streak marks the height; she swoops across the walk and lands on the other side. */
  atk_dive(match, a, out) {
    const D = this.dr, up = DIVE.up, warn = this.sp(DIVE.warn);
    if (a.t < up) { D.dir = -D.side; this.ease(D, 'by', -560, 0.08); this.ease(D, 'hy', -520, 0.08); this.ease(D, 'hx', D.bx + D.dir * 70, 0.1); if (a.t === 1) sfx('whoosh', 0.8, 0.6); return false; }
    if (a.t < up + warn) {
      D.hide = true; this.streak = { y: DIVE.y, k: (a.t - up) / warn, s: D.side };
      if (a.t === up) sfx('roar', 1, 0.9);
      D.bx = D.side * 700; D.by = DIVE.y - 20; D.dir = -D.side; D.hx = D.bx + D.dir * 90; D.hy = DIVE.y - 30;
      return false;
    }
    if (!a.swoop) { a.swoop = true; D.hide = false; this.streak = null; sfx('whoosh', 1, 0.4); match.shake(6, 30); }
    if (Math.abs(D.bx) < 760 && !a.landing) {
      D.bx += D.dir * DIVE.speed; D.by = DIVE.y - 20 + Math.sin(a.t * 0.2) * 4; D.hx = D.bx + D.dir * 92; D.hy = DIVE.y - 26; D.jaw = 0.6;
      out.push(this.bhit('dive' + a.id, D.bx - 90, D.by - 46, D.bx + 90, D.by + 30, ...DIVE.hit, { dirX: D.dir }), this.bhit('divh' + a.id, D.hx - 34, D.hy - 24, D.hx + 34, D.hy + 24, ...DIVE.hit, { dirX: D.dir }));
      if (a.t % 3 === 0) match.particles.push({ x: D.bx, y: D.by + 30, vx: -D.dir * 2, vy: 1, life: 16, color: 0x8a7a70, size: 3 });
      return false;
    }
    if (!a.landing) { a.landing = a.t; D.side = -D.side; D.bx = D.side * 700; D.by = -320; D.hide = false; }
    D.dir = -D.side; this.ease(D, 'bx', D.side * DR.x, 0.06); this.ease(D, 'by', DR.y, 0.06); this.ease(D, 'hx', D.side * DR.headX, 0.06); this.ease(D, 'hy', DR.headY, 0.06);
    return a.t - a.landing > DIVE.back;
  }

  /** CHOMP: her head draws back, jaw wide, then snaps at the nearest player. */
  atk_chomp(match, a, out) {
    const D = this.dr, wind = this.sp(CHOMP.wind);
    D.dir = -D.side;
    if (a.t === 1) { const tg = this.nearest(match, D.hx); a.tx = Phaser.Math.Clamp(tg ? tg.x : D.side * 40, D.side * 260 - 260, D.side * 260 + 260); a.ty = Phaser.Math.Clamp(tg ? tg.y - 30 : -40, -170, -24); }
    if (a.t < wind) { this.ease(D, 'hx', D.side * (DR.headX + 60), 0.12); this.ease(D, 'hy', DR.headY - 30, 0.12); D.jaw = a.t / wind; return false; }
    if (a.t < wind + CHOMP.lunge) { this.ease(D, 'hx', a.tx, 0.3); this.ease(D, 'hy', a.ty, 0.3); D.jaw = 1; return false; }
    if (a.t === wind + CHOMP.lunge) { D.jaw = 0; sfx('slash', 0.9, 0.6); sfx('clang', 0.5, 0.6); }
    if (a.t < wind + CHOMP.lunge + 6) out.push(this.bhit('chomp' + a.id, D.hx - 40, D.hy - 26, D.hx + 40, D.hy + 26, ...CHOMP.hit, { dirX: D.dir }));
    return a.t > wind + CHOMP.lunge + 34;
  }

  /** METEORS (enraged): she roars at the sky and burning rocks fall on marked spots. */
  atk_meteor(match, a, out) {
    const D = this.dr; D.dir = -D.side; this.ease(D, 'hy', DR.headY - 70, 0.1); D.jaw = Math.min(1, a.t / 10);
    if (a.t === 2) { sfx('roar', 1, 0.7); match.shake(6, 30); }
    if (a.t > 20 && a.t <= 20 + METEOR.n * METEOR.every && (a.t - 20) % METEOR.every === 1) {
      const tg = this.nearest(match), x = Phaser.Math.Clamp(tg && a.t % 20 === 1 ? tg.x : (Math.random() - 0.5) * 500, -255, 255);
      this.meteors.push({ x, t: 0, id: this.sid('met'), dx: (Math.random() - 0.5) * 4 });
    }
    return a.t > 30 + METEOR.n * METEOR.every && !this.meteors.length;
  }
  /** Meteors: a warning ring, then a burning rock falls and bursts. */
  stepMeteors(match, out) {
    for (const m of this.meteors) {
      m.t++; const w = this.sp(METEOR.warn);
      if (m.t <= w) continue;
      const k = (m.t - w) / 16; m.y = -380 + k * 380; m.mx = m.x - m.dx * (1 - k) * 60;
      out.push(this.bhit(m.id, m.mx - 16, m.y - 16, m.mx + 16, m.y + 16, ...METEOR.hit, { radial: true }));
      if (k >= 1) { m.dead = true; sfx('bighit', 0.6, 0.9); match.shake(4, 5); for (let i = 0; i < 12; i++) match.particles.push({ x: m.x, y: -6, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 5, life: 22, color: C.fire[i % 4 + 1], size: 3, grav: 0.15 }); }
    }
    this.meteors = this.meteors.filter((m) => !m.dead);
  }

  /** Smoke from her nostrils. */
  smoke(match) { const m = this.mouth(); match.particles.push({ x: m.x, y: m.y - 8, vx: this.dr.dir * 0.6, vy: -1, life: 30, color: 0x6a5a5a, size: 3, drag: 0.98 }); }
  /** Her death: she falls out of the sky, trailing smoke and fire (stepDeath + the drawing). */
  onDeath() { this.flame = null; this.dr.tail = null; this.dr.hide = false; }

  // ------------------------------------------------------------------ hazards (VS too)
  start_stone(match, h) { h.title = 'CATAPULT STONE!'; const tg = this.nearest(match); h.s = Math.random() < 0.5 ? -1 : 1; h.tx = Phaser.Math.Clamp(tg ? tg.x : 0, -230, 230); this.stone = { x: h.s * 720, y: -60, mark: h.tx, a: 0 }; }
/** CATAPULT STONE: lobbed in on a high arc onto the mark, then rolls back the way it came and crumbles. */
  step_stone(match, h, out) {
    const S = this.stone, T = STONE.flight;
    if (h.t <= T) { const k = h.t / T; S.x = h.s * 720 + (h.tx - h.s * 720) * k; S.y = -60 - Math.sin(k * Math.PI) * 300 + k * 60 - STONE.r * k; S.a += 0.1; if (k > 0.5) out.push(this.bhit('st' + h.id, S.x - STONE.r, S.y - STONE.r, S.x + STONE.r, S.y + STONE.r, ...STONE.hit, { radial: true })); return false; }
    if (h.t === T + 1) { sfx('bighit', 0.9, 0.6); match.shake(7, 10); S.mark = null; }
    if (h.t < T + 50) { S.x -= h.s * 3; S.y = -STONE.r; S.a -= h.s * 0.15; out.push(this.bhit('sr' + h.id, S.x - STONE.r, S.y - STONE.r, S.x + STONE.r, S.y + STONE.r, 7, [40, 4.5, 0.5], { dirX: -h.s })); return false; }
    for (let i = 0; i < 8; i++) match.particles.push({ x: S.x, y: S.y, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3, life: 20, color: C.stone[3], size: 3, grav: 0.15 });
    sfx('clang', 0.5, 0.6); this.stone = null; return true;
  }
  start_flare(match, h) { h.title = 'BRAZIER FLARE!'; }
/** BRAZIER FLARE: the braziers smoulder higher, then erupt into pillars of fire over both towers. */
  step_flare(match, h, out) {
    if (h.t < FLARE.warn) { this.flare = { k: h.t / FLARE.warn }; return false; }
    if (h.t < FLARE.warn + FLARE.on) {
      this.flare = { on: true }; if (h.t === FLARE.warn) sfx('flame', 1, 0.5);
      for (const s of [-1, 1]) out.push(this.bhit('fl' + h.id + s + Math.floor(h.t / 20), s * FLARE.x - 36, -250, s * FLARE.x + 36, -112, ...FLARE.hit));
      return false;
    }
    this.flare = null; return true;
  }

  /** Moves the keep and ASHWING one frame; returns hazard + boss hitboxes. */
  step(match) {
    this.t++;
    const out = [], D = this.dr;
    this.cycle.run(match, out);
    D.flap += this.boss && this.boss.phase === 2 ? 0.16 : 0.12;
    if (this.boss) {
      this.bossStep(match, out);
      if (this.boss.dying) { D.by += 1.6 + this.boss.dying * 0.04; D.hy += 1.8 + this.boss.dying * 0.04; D.jaw = 0.8; this.flame = null; }
      else if (this.boss.atk && this.boss.atk.name !== 'breath') this.flame = null;
    } else {                                                                                  // VS: she circles far off
      D.bx = Math.cos(this.t * 0.006) * 300; D.by = -170 + Math.sin(this.t * 0.012) * 20; D.dir = -Math.sin(this.t * 0.006) >= 0 ? 1 : -1; D.hx = D.bx + D.dir * 70; D.hy = D.by + 20;
    }
    this.stepBalls(match, out); this.stepMeteors(match, out);
    return out;
  }

  // ------------------------------------------------------------------ drawing
  /** Draws ASHWING (small and far off in VS), fire, fireballs, patches, meteors, stones, flares, torches; and the health bar. */
  render() {
    const t = this.t, B = this.boss, D = this.dr;
    const far = this.farG; far.clear();
    const g = this.dragonG; g.clear();
    if (!B) this.drawDragon(far, D, 0.35, 0);
    else if (!D.hide) this.drawDragon(g, D, 1, B.flash);
    const x = this.fxG; x.clear();
    for (const tx of [-110, 0, 110]) this.fire(x, tx, -46, 5, 12, t + tx);                          // torches
    if (this.flare) for (const s of [-1, 1]) { if (this.flare.on) this.fire(x, s * FLARE.x, -128, 34, 130, t + s * 5); else this.fire(x, s * FLARE.x, -128, 8 + 16 * this.flare.k, 14 + 30 * this.flare.k, t); }
    else for (const s of [-1, 1]) this.fire(x, s * FLARE.x, -128, 9, 16, t + s * 7);
    for (const p of this.patches) { const k = 1 - p.t / BALLS.patch; this.fire(x, p.x, -2, 18 * k + 4, 22 * k + 6, t + p.x); }
    if (this.flame) {
      const F = this.flame;
      for (let i = 0; i < 20; i++) { const q = i / 20, px = F.x0 + (F.x1 - F.x0) * q + (Math.random() - 0.5) * 8, py = F.y0 + (F.y1 - F.y0) * q + (Math.random() - 0.5) * 8, r = 6 + 22 * q; x.fillStyle(C.fire[Math.min(4, 1 + Math.floor(Math.random() * 3))], 0.85); x.fillCircle(px, py, r); }
      for (let i = 0; i < 10; i++) { const q = i / 10, px = F.x0 + (F.x1 - F.x0) * q, py = F.y0 + (F.y1 - F.y0) * q; x.fillStyle(C.fire[4], 0.9); x.fillCircle(px, py, 3 + 8 * q); }
      x.fillStyle(C.fire[2], 0.25); x.fillEllipse(F.x1, -4, 120, 26);
    }
    for (const b of this.balls) { x.fillStyle(C.fire[1], 0.5); x.fillCircle(b.x - b.vx * 2, b.y - b.vy * 2, BALLS.r); x.fillStyle(C.fire[2], 1); x.fillCircle(b.x, b.y, BALLS.r); x.fillStyle(C.fire[4], 1); x.fillCircle(b.x - 2, b.y - 2, BALLS.r * 0.5); }
    for (const m of this.meteors) {
      if (m.t <= this.sp(METEOR.warn)) { x.lineStyle(2, 0xff3a1a, 0.5 + 0.4 * Math.sin(t * 0.5)); x.strokeEllipse(m.x, -1, 40, 9); x.lineStyle(0); continue; }
      x.fillStyle(C.fire[1], 0.5); x.fillTriangle(m.mx - 10, m.y, m.mx + 10, m.y, m.mx + m.dx * 20, m.y - 60);
      x.fillStyle(0x3a2420, 1); x.fillCircle(m.mx, m.y, 14); x.fillStyle(C.fire[2], 1); x.fillCircle(m.mx + 3, m.y + 3, 7);
    }
    if (this.stone) {
      const S = this.stone;
      if (S.mark != null) { x.fillStyle(0xff3020, 0.35 + 0.25 * Math.sin(t * 0.4)); x.fillEllipse(S.mark, 0, 44, 8); }
      x.fillStyle(C.out, 1); x.fillCircle(S.x, S.y, STONE.r + 2); x.fillStyle(C.stone[3], 1); x.fillCircle(S.x, S.y, STONE.r); x.fillStyle(C.stone[4], 1); x.fillCircle(S.x + Math.cos(S.a) * 6, S.y + Math.sin(S.a) * 6, 5);
    }
    if (this.streak) { const k = this.streak.k; x.fillStyle(0xff2a10, 0.15 + 0.25 * k); x.fillRect(-700, DIVE.y - 40, 1400, 66); x.fillStyle(0xffd040, 0.5 + 0.5 * (t % 8 < 4 ? 1 : 0)); for (let i = 0; i < 6; i++) { const ax = -this.streak.s * (-250 + i * 100); x.fillTriangle(ax, DIVE.y - 18, ax, DIVE.y + 4, ax - this.streak.s * 16, DIVE.y - 7); } }
    if (B) this.drawBar();
  }
  /** A flickering flame: a teardrop of fire colours, w wide and h tall, its base at (x, y). */
  fire(g, x, y, w, h, t) {
    const f = Math.sin(t * 0.37) * 0.15 + Math.sin(t * 0.91) * 0.1;
    g.fillStyle(C.fire[1], 0.85); g.fillTriangle(x - w, y, x + w, y, x + Math.sin(t * 0.2) * w * 0.3, y - h * (1 + f)); g.fillCircle(x, y - w * 0.4, w);
    g.fillStyle(C.fire[2], 0.95); g.fillTriangle(x - w * 0.65, y, x + w * 0.65, y, x, y - h * 0.75 * (1 - f)); g.fillCircle(x, y - w * 0.3, w * 0.65);
    g.fillStyle(C.fire[3], 1); g.fillTriangle(x - w * 0.3, y, x + w * 0.3, y, x, y - h * 0.45); g.fillStyle(C.fire[0], 0.18); g.fillCircle(x, y - h * 0.4, w + h * 0.4);
  }

  /**
   * ASHWING: wings (beating; ember-lit when enraged), the spiked tail curving away, her scaled body with a pale belly
   * and clawed legs, the neck curving to her horned head with its glowing eye and hinged jaw. s = scale (0.35 far off
   * in VS, round her body); flash = her hurt flash.
   */
  drawDragon(g, D, s, flash) {
    const d = D.dir, rage = this.boss && this.boss.phase === 2, fl = flash > 0, dk = this.deathK();
    const sc = fl ? [0xffffff, 0xffe0d8, 0xffffff, 0xffffff] : C.scale;
    const S = (x, y) => (s === 1 ? { x, y } : { x: D.bx + (x - D.bx) * s, y: D.by + (y - D.by) * s });
    const P = (pts, col, a = 1) => { g.fillStyle(col, a); g.fillPoints(pts.map((p) => S(p.x, p.y)), true); };
    const circ = (x, y, r, col, a = 1) => { const p = S(x, y); g.fillStyle(col, a); g.fillCircle(p.x, p.y, r * s); };
    const bx = D.bx, by = D.by + dk * 0, flap = Math.sin(D.flap) * (dk ? 0.2 : 1);
    // wings: an arm out from the shoulder, fingers spreading, the membrane between
    const wing = (off, dark) => {
      const sh = { x: bx + d * 8 + off, y: by - 26 }, el = { x: sh.x - d * 46, y: sh.y - 70 - flap * 34 };
      const tips = [0, 1, 2, 3].map((i) => ({ x: el.x - d * (60 + i * 12) + d * i * 6, y: el.y + (i * 40 - 30) + flap * (30 - i * 8) }));
      const mem = [sh, el, ...tips, { x: bx - d * 52, y: by + 4 }];
      const wc = rage ? [0x6a1a10, 0x9a3014, C.ember[0]] : C.wing;
      P(mem.map((p) => ({ x: p.x + (dark ? 4 : 0), y: p.y + 3 })), C.out);
      P(mem, dark ? C.wing[0] : wc[1]);
      for (let i = 0; i < 3; i++) P([el, tips[i], tips[i + 1]], dark ? C.wing[0] : (i % 2 ? wc[0] : wc[1]));
      if (rage && !dark) for (let i = 0; i < 4; i++) P([tips[i], { x: tips[i].x + d * 6, y: tips[i].y - 8 }, { x: tips[i].x + d * 10, y: tips[i].y + 4 }], C.ember[1], 0.9);
      g.lineStyle(Math.max(1, 5 * s), C.out, 1); const a = S(sh.x, sh.y), b = S(el.x, el.y); g.lineBetween(a.x, a.y, b.x, b.y);
      for (const tp of tips) { const c = S(tp.x, tp.y); g.lineBetween(b.x, b.y, c.x, c.y); }
      g.lineStyle(Math.max(1, 3 * s), dark ? C.scale[1] : sc[2], 1); g.lineBetween(a.x, a.y, b.x, b.y); for (const tp of tips) { const c = S(tp.x, tp.y); g.lineBetween(b.x, b.y, c.x, c.y); }
      g.lineStyle(0); circ(el.x, el.y, 5, C.horn[1]);
    };
    wing(-d * 18, true);
    // the tail: from her hip to its tip (or to the sweeping spot), spikes along its top, a spade at the end
    const t0 = { x: bx - d * 52, y: by + 10 }, tail = D.tail || { x: bx - d * 175 + Math.sin(this.t * 0.04) * 12, y: by + 40 + Math.sin(this.t * 0.05) * 20 };
    const tc = { x: (t0.x + tail.x) / 2 - d * 10, y: Math.max(t0.y, tail.y) + 60 };
    for (let i = 0; i <= 22; i++) { const q = i / 22, p = qb(t0, tc, tail, q), r = 17 - 13 * q; circ(p.x, p.y, r + 2, C.out); }
    for (let i = 0; i <= 22; i++) { const q = i / 22, p = qb(t0, tc, tail, q), r = 17 - 13 * q; circ(p.x, p.y, r, sc[1 + (i % 2)]); if (i % 3 === 1) { const pp = S(p.x, p.y); g.fillStyle(C.horn[1], 1); g.fillTriangle(pp.x - 4 * s, pp.y - r * s, pp.x + 4 * s, pp.y - r * s, pp.x, pp.y - (r + 9) * s); } }
    const tp = qb(t0, tc, tail, 0.94);
    P([{ x: tail.x - (tail.x - tp.x) * 0.2, y: tail.y - 16 }, { x: tail.x + (tail.x - tp.x) * 3, y: tail.y }, { x: tail.x - (tail.x - tp.x) * 0.2, y: tail.y + 16 }, { x: tail.x - (tail.x - tp.x) * 1.5, y: tail.y }], sc[2]);
    // legs hanging, with claws
    for (const [lx, ly] of [[-30, 26], [26, 22]]) {
      const kx = bx + d * lx, ky = by + ly;
      circ(kx, ky, 15, C.out); circ(kx, ky, 13, sc[1]);
      const f = { x: kx + d * 6, y: ky + 30 }; const a = S(kx, ky), b = S(f.x, f.y);
      g.lineStyle(12 * s, C.out, 1); g.lineBetween(a.x, a.y, b.x, b.y); g.lineStyle(8 * s, sc[2], 1); g.lineBetween(a.x, a.y, b.x, b.y); g.lineStyle(0);
      for (let c = -1; c <= 1; c++) P([{ x: f.x + c * 5, y: f.y }, { x: f.x + c * 5 + d * 4, y: f.y + 10 }, { x: f.x + c * 5 + 3, y: f.y }], C.horn[0]);
    }
    // the body: scaled, a pale plated belly, a ridge of spikes
    const body = (r1, r2, ox, oy, col) => { const pts = []; for (let i = 0; i < 20; i++) { const q = i / 20 * Math.PI * 2; pts.push({ x: bx + Math.cos(q) * r1 + ox, y: by + Math.sin(q) * r2 + oy - Math.cos(q) * d * 6 }); } P(pts, col); };
    body(64, 36, 0, 0, C.out); body(60, 32, 0, 0, sc[1]); body(54, 22, d * 4, -6, sc[2]);
    for (let i = 0; i < 7; i++) { const x = bx - d * 40 + d * i * 13, y = by + 18 - Math.abs(i - 3) * 1.5; P([{ x: x - 8, y }, { x: x + 8, y }, { x: x + 6, y: y + 9 }, { x: x - 6, y: y + 9 }], i % 2 ? C.belly[1] : C.belly[2]); }
    for (let i = 0; i < 6; i++) { const x = bx - d * 44 + d * i * 16; P([{ x: x - 6, y: by - 28 }, { x: x + 6, y: by - 28 }, { x: x - d * 4, y: by - 44 }], C.horn[1]); }
    wing(d * 14, false);
    // the neck: from the shoulders, curving up and over to the head, with belly plates underneath
    const N = this.neckBase(), Cn = this.neckCtl(), H = { x: D.hx, y: D.hy };
    const Ns = s === 1 ? N : { x: D.bx + d * 50, y: D.by - 22 }, Hs = s === 1 ? H : { x: D.bx + d * 95, y: D.by - 60 }, Cs = s === 1 ? Cn : { x: Ns.x + d * 30, y: Ns.y - 50 };
    for (let i = 0; i <= 16; i++) { const p = qb(Ns, Cs, Hs, i / 16); circ(p.x, p.y, 22 - 8 * (i / 16) + 2, C.out); }
    for (let i = 0; i <= 16; i++) { const q = i / 16, p = qb(Ns, Cs, Hs, q), r = 22 - 8 * q; circ(p.x, p.y, r, sc[1 + (i % 2)]); circ(p.x + d * r * 0.35, p.y + r * 0.45, r * 0.5, C.belly[i % 2]); if (i % 2 === 0 && i < 15) { const pp = S(p.x, p.y); g.fillStyle(C.horn[1], 1); g.fillTriangle(pp.x - 3 * s, pp.y - r * s, pp.x + 3 * s, pp.y - r * s, pp.x - d * 4 * s, pp.y - (r + 7) * s); } }
    // the head (drawn facing right in its own coordinates, then mirrored and scaled)
    const k = DR.k, hp = S(Hs.x, Hs.y), tilt = (D.jaw * -0.12) + (dk ? 0.5 : 0);
    const L = (lx, ly) => { const cx = Math.cos(tilt), sn = Math.sin(tilt), x = lx * cx - ly * sn, y = lx * sn + ly * cx; return { x: hp.x + d * x * k * s, y: hp.y + y * k * s }; };
    const HP = (pts, col, a = 1) => { g.fillStyle(col, a); g.fillPoints(pts.map(([x, y]) => L(x, y)), true); };
    const j = D.jaw * 0.55, jaw = ([x, y]) => { const px = -8, py = 4, cx = Math.cos(j), sn = Math.sin(j); return [px + (x - px) * cx - (y - py) * sn, py + (x - px) * sn + (y - py) * cx]; };
    HP([[-34, -26], [-10, -14], [-4, -10], [-14, -14]], C.horn[1]); HP([[-30, -18], [-6, -10], [-2, -6], [-12, -8]], C.horn[0]);   // horns
    const lower = [[-8, 4], [34, 3], [36, 8], [30, 12], [-6, 14]].map(jaw);
    HP(lower.map(([x, y]) => [x - 1, y + 1.5]), C.out); HP(lower, sc[1]);
    if (D.glow > 0 || D.jaw > 0.2) HP([[-6, 4], [32, 4], ...[[30, 10], [-4, 12]].map(jaw)], D.glow > 0.3 ? C.fire[2] : 0x3a0808, 1);   // inside the mouth
    for (let i = 0; i < 5; i++) { const x = 4 + i * 6; HP([[x, 4], [x + 3, 4], [x + 1.5, 8]], 0xffffff); HP([jaw([x, 10]), jaw([x + 3, 10]), jaw([x + 1.5, 6])], 0xffffff); }
    HP([[-18, -2], [-14, -14], [4, -17], [24, -12], [40, -6], [44, 1], [40, 4], [-8, 6], [-18, 4]], C.out);
    HP([[-16, -2], [-12, -12], [4, -15], [22, -10], [38, -5], [42, 1], [38, 3], [-8, 5], [-16, 3]], sc[2]);
    HP([[-12, -10], [4, -13], [22, -8], [10, -6], [-6, -6]], sc[3]);
    HP([[2, -12], [16, -11], [14, -9], [2, -9]], C.out);                                                // brow ridge
    const eye = dk > 0.3 ? 0x3a1010 : rage ? 0xff3a1a : 0xffd040;
    HP([[6, -9], [13, -9], [12, -5], [6, -5]], eye); HP([[9, -9], [10, -9], [10, -5], [9, -5]], C.out);
    if (dk < 0.3) { const e = L(9.5, -7); g.fillStyle(eye, 0.25); g.fillCircle(e.x, e.y, 9 * s); }
    HP([[36, -4], [39, -4], [39, -2], [36, -2]], C.out);                                                // nostril
    if (D.glow > 0) { const th = L(-6, 6); g.fillStyle(C.fire[2], 0.3 * D.glow); g.fillCircle(th.x, th.y, 24 * D.glow * s); const nc = qb(Ns, Cs, Hs, 0.75), np = S(nc.x, nc.y); g.fillStyle(C.fire[1], 0.35 * D.glow); g.fillCircle(np.x, np.y, 16 * s); }
  }
}

/** DRAGON'S KEEP's miniature for the stage select screen. */
export function drawDragonsKeepPreview(g, x, y, w, h) {
  C.sky.forEach((c, i, A) => { g.fillStyle(c, 1); g.fillRect(x, y + i * h / A.length, w, h / A.length + 1); });
  g.fillStyle(C.moon[1], 1); g.fillCircle(x + w * 0.2, y + h * 0.22, h * 0.11);
  g.fillStyle(C.stone[2], 1); g.fillRect(x + w * 0.08, y + h * 0.62, w * 0.84, h * 0.2); g.fillRect(x + w * 0.06, y + h * 0.42, w * 0.14, h * 0.4); g.fillRect(x + w * 0.8, y + h * 0.42, w * 0.14, h * 0.4);
  g.fillStyle(C.banner[1], 1); g.fillRect(x + w * 0.1, y + h * 0.5, w * 0.06, h * 0.14); g.fillRect(x + w * 0.84, y + h * 0.5, w * 0.06, h * 0.14);
  g.fillStyle(C.scale[1], 1); g.fillEllipse(x + w * 0.66, y + h * 0.3, w * 0.2, h * 0.12); g.fillTriangle(x + w * 0.62, y + h * 0.28, x + w * 0.5, y + h * 0.06, x + w * 0.42, y + h * 0.2);
  g.fillStyle(C.scale[2], 1); g.fillCircle(x + w * 0.5, y + h * 0.36, h * 0.05); g.fillStyle(0xffd040, 1); g.fillRect(x + w * 0.49, y + h * 0.34, 2, 2);
  g.fillStyle(C.fire[2], 1); g.fillTriangle(x + w * 0.46, y + h * 0.38, x + w * 0.3, y + h * 0.6, x + w * 0.4, y + h * 0.62);
}

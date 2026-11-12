// POLYGON PEAK - the arena of KING POLYGON (boss II, 64-bit era; Trinkets > BOSS FIGHTS, src/data/bosses.js).
// Everything is real low-poly 3D (poly3d.js, Gouraud-shaded like CASTLE COURT): a floating checkerboard arena with
// gold trim on a jagged rock, two side ledges, crystal pylons, high above faceted green hills, mountains and
// low-poly clouds in a big gradient sky.
// The KING is 3D too, built from faces every frame (kingFaces): a crowned, faceted lavender head with glowing
// diamond eyes and a jaw that drops open, and two floating gem-studded gauntlets.
//   Weak point: the HEAD (x1). The gauntlets take x0.4 (x0.6 resting on the floor). Every few attacks the King
//   FRAME-DROPS: he glitches, sinks low and his head takes x1.5 while he stutters.
//   Attacks: PALM SLAM (a gauntlet follows you from above, slams flat; ENRAGED: both), GROUND SWIPE (sweeps the
//   floor - jump it), FINGER GUN (a gauntlet turns into a finger gun, aims and fires - PEW; ENRAGED: both hands),
//   POLY GOONS (he summons little low-poly minions through warp rings that waddle after you - smash them),
//   POLYGON RAIN (cubes fall on marked spots), EYE BEAM (ENRAGED: a beam from his eyes sweeps across the floor).
//   BLOW THE CARTRIDGE: a giant gold game cartridge rises between his hands, he takes a breath and BLOWS into it - a
//   gale pushes everyone toward the edges (walk into it!) - then he slams it into the arena like a console: RESET!
//   A huge hit where it lands and a shockwave both ways.
//   BATTER UP (below 30% health): one gauntlet becomes a baseball bat and he plays ball WITH HIS OWN HEAD - HOME RUN
//   (tosses it up with one hand, swings with the other and line-drives it at you; it ricochets off the floor and the
//   bumpers, hits very hard) and POP FLY (bats it sky-high; it comes crashing down on your mark with a shockwave).
//   The stage breaks down with him: GLITCH TILES (floor tiles lose their texture - pink and black - then burn) and two
//   POLY BUMPERS float in over the ledges (they bounce you away - and his head ricochets off them).
// Stage hazards (also in VS, where the King's empty crown floats overhead): PYLON ZAP (arcs crackle along both ledges)
// and QUAKE RING (a shockwave ring runs out along the floor from the middle - jump it).
import { HazardCycle } from './hazardCycle.js';
import { BossArena } from './bossBase.js';
import { Poly3D, boxFaces, prismFaces, pyramidFaces, blobFaces, gradientSky } from './poly3d.js';
import { sfx } from '../audio/sfx.js';

const C = { sky: [0x2a1a8a, 0x3a3ac8, 0x4a78f0, 0x8ac0ff, 0xffd0e8], fog: 0xa8c8ff, tileA: 0x3a5af0, tileB: 0xf0f4ff, gold: 0xffc830, goldD: 0xd89818,
  rock: [0x8a7ab0, 0x6a5a98, 0x584880, 0xa898c8], grass: [0x40d048, 0x28a038, 0x58e060], crystal: [0x5af0ff, 0x30b8f0, 0xb8fcff],
  head: [0xa070f0, 0x8a58e0, 0xb888ff], jaw: 0x7a48d0, eye: 0xfff060, glove: [0x3a6ae8, 0x5a8aff, 0x2a4ac0], gem: [0xff3a8a, 0x3affa0, 0xffd040] };
// where the King floats (his head), how low a frame drop takes him, and the gauntlets' resting spots (x, y)
const KING = { x: 0, y: -206, z: 14, low: -112, rest: [168, -120] };
// PALM SLAM: frames following you up high, the drop, the rest on the floor, its hit, the shockwave's
const PALM = { track: 54, high: -240, drop: 8, rest: 46, hit: [13, [60, 6.4, 1.0]], wave: [6, [28, 4.4, 0.6]] };
// GROUND SWIPE: wind-up frames, the sweep, the edge it starts from, its hit
const SWIPE = { wind: 46, cross: 40, edge: 330, hit: [12, [40, 6.2, 0.9]] };
// FINGER GUN: shots per hand (normal / enraged - enraged fires with both hands), frames to aim, between shots,
// the shot's speed, size, hit
const GUN = { shots: [3, 4], aim: 34, every: 16, speed: 6.5, r: 7, hit: [7, [32, 4.6, 0.6]] };
// POLY GOONS (summoned minions): how many (normal / enraged), most at once, walk speed, health, how long they last,
// their touch's hit (once every `bite` frames), how big
const GOON = { n: [3, 4], max: 6, speed: 1.25, hp: 10, life: 1100, bite: 40, s: 13, hit: [6, [55, 5, 0.6]] };
// POLYGON RAIN: cubes, frames between them, the warning per cube, size, hit
const RAIN = { n: 6, every: 12, warn: 44, s: 20, hit: [10, [80, 5, 0.7]] };
// EYE BEAM (enraged): charge, sweep, its hit (ticks)
const BEAM = { charge: 50, sweep: 70, hit: [6, [70, 4.8, 0.5]] };
// FRAME DROP: every `every` attacks; how long he stutters low (head x1.5)
const DROP = { every: 4, dur: 170 };
// how big the gauntlets are drawn (x their model)
const HAND = 1.5;
// BLOW THE CARTRIDGE: it rising, the breath in, the gale (frames), how hard the wind pushes (px / frame, more in the air),
// the lift and the slam, the slam's hit and its shockwave
const BLOW = { rise: 40, breath: 30, gale: 110, push: 1.5, air: 1.25, lift: 26, slam: 8, hit: [17, [85, 7, 1.0]], wave: { speed: 6.5, reach: 270, hit: [9, [65, 5.2, 0.6]] } };
// BATTER UP: below this much health he starts using his head as a baseball
const LOW = { at: 0.3 };
// HOME RUN: wind-up (the toss), swing frames, the head's speed, gravity, bounces, flight frames, its hit (very hard)
const HOMER = { wind: 54, swing: 7, speed: 10.5, grav: 0.16, bounces: 2, flight: 100, r: 40, hit: [16, [38, 6.6, 1.0]] };
// POP FLY: how long the head is up (its mark follows you), the fall speed, the impact hit and its shockwave
const POP = { up: 46, track: 50, fall: 14, hit: [15, [80, 6.4, 0.9]], wave: { speed: 6, reach: 260, hit: [8, [70, 5.2, 0.6]] } };
// the bat: its handle and barrel (gauntlet units, x HAND), its wood
const BAT = { handle: [8, 44], barrel: [44, 110], r: [4, 8.5], wood: [0xc8904a, 0xe8b070, 0x8a5a2a] };
// GLITCH TILES: how often, how many tiles, warning, burning frames, the hit
const GLITCH = { every: 300, n: [2, 3], warn: 64, on: 120, hit: [6, [82, 4.6, 0.4]] };
// POLY BUMPERS: where they float (x, y), drift, radius, the bounce they give
const BUMP = { x: 150, y: -172, drift: 34, r: 22, hit: [4, [55, 5.6, 0.3]] };
// PYLON ZAP hazard: charge, crackle frames, its hit (ticks every 18); QUAKE RING: wind-up, ring speed, hit
const ZAP = { charge: 70, on: 70, hit: [5, [70, 4.5, 0.5]] };
const QUAKE = { wind: 50, speed: 5.5, hit: [8, [75, 6, 0.6]] };

/** Turns faces about a pivot (yaw about the vertical axis, then roll in the picture), and moves them. */
function xf(faces, px, py, pz, yaw = 0, roll = 0, k = 1) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cr = Math.cos(roll), sr = Math.sin(roll);
  const rot = ([x, y, z]) => { const x1 = x * cy + z * sy, z1 = -x * sy + z * cy; return [x1 * cr - y * sr, x1 * sr + y * cr, z1]; };
  return faces.map((f) => ({ ...f, p: f.p.map((v) => { const r = rot(v); return [px + r[0] * k, py + r[1] * k, pz + r[2] * k]; }), n: f.n && rot(f.n) }));
}

/** POLYGON PEAK and its King (see the top of the file). */
export class PolyBossStage extends BossArena {
  constructor(scene) {
    super();
    this.scene = scene; this.t = 0; this.hazardsOn = true; this.music = 'bgm_boss_polygon';
    this.platforms = [
      { x1: -250, x2: 250, y: 0, solid: true, bottom: 50 },
      { x1: -205, x2: -105, y: -90, solid: false },
      { x1: 105, x2: 205, y: -90, solid: false },
    ];
    this.spawns = [{ x: -110, y: 0 }, { x: 110, y: 0 }, { x: -40, y: 0 }, { x: 40, y: 0 }];
    this.cycle = new HazardCycle(this, ['zap', 'quake'], { color: '#7ae8ff', stroke: '#1a1050', gap: 660 });
    this.hands = [{ x: -KING.rest[0], y: KING.rest[1], s: -1, roll: 0 }, { x: KING.rest[0], y: KING.rest[1], s: 1, roll: 0 }];
    this.head = { x: KING.x, y: KING.y, yaw: 0, jaw: 0 };
    this.drop = 0; this.count = 0; this.shots = []; this.goons = []; this.warps = []; this.cubes = []; this.beam = null; this.zap = null; this.ring = null;
    this.sparkColor = 0x5af0ff; this.bodyW = 120; this.bodyH = 120;
  }

  /** Builds the sky and the 3D world: hills and mountains far below, clouds, the checkerboard arena, pylons. */
  draw(world, bg) {
    const s = this.scene;
    bg.push(gradientSky(s, C.sky));
    const R = this.R = new Poly3D(s, world, { fog: C.fog, zFar: 3400 });
    R.terrain({ x1: -3000, x2: 3000, z1: 400, z2: 3800, y: 560, nx: 30, nz: 14, amp: 18, seed: 9, cols: C.grass, hill: (x, z) => -Math.max(0, z - 1800) * (0.3 + 0.15 * Math.sin(x / 380)) });
    for (let i = 0; i < 7; i++) { const x = -2400 + i * 800, z = 2600 + (i % 2) * 500; R.pyramid(x, 560, z, 900, 700, 900 + (i % 3) * 200, i % 2 ? 0x7a6ab8 : 0x6a5aa8); R.pyramid(x, 560 - (900 + (i % 3) * 200) * 0.7, z - 40, 280, 220, 280 + (i % 3) * 60, 0xffffff); }
    for (let i = 0; i < 8; i++) R.blob(-2400 + i * 690, -300 + (i % 3) * 90, 1600 + (i % 4) * 300, 160 + (i % 2) * 80, 40, 80, [0xffffff, 0xf4f0ff, 0xe8e4fa], 30 + i, null, 0.3);
    for (const [x, y, z, r] of [[-620, -60, 700, 60], [640, 40, 900, 80], [-300, 200, 1200, 70]]) { R.blob(x, y, z, r, r * 0.3, r, [C.grass[0], C.grass[1]], x, C.grass[2], 0.15); R.rock(x, y + r * 0.25, z, r * 0.9, r * 1.4, r * 0.9, 6, C.rock, x); }
    // the arena: a checkerboard top on a gold-trimmed slab, a jagged rock beneath
    const P = this.platforms[0], n = 10, w = (P.x2 - P.x1) / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) R.box(P.x1 + i * w, -0.01, j * 50, P.x1 + (i + 1) * w, 0, (j + 1) * 50, (i + j) % 2 ? C.tileA : C.tileB, (i + j) % 2 ? C.tileA : C.tileB);
    R.box(P.x1, 0, 0, P.x2, 14, 150, C.gold, C.gold); R.box(P.x1 + 8, 14, 4, P.x2 - 8, 34, 146, C.rock[1]);
    R.rock(0, 32, 75, 235, 110, 140, 9, C.rock, 11);
    for (const p of this.platforms.slice(1)) { R.box(p.x1, p.y, 0, p.x2, p.y + 8, 70, C.tileA, C.tileB); R.box(p.x1 + 4, p.y + 8, 4, p.x2 - 4, p.y + 13, 66, C.gold); R.rock((p.x1 + p.x2) / 2, p.y + 12, 35, 46, 34, 34, 5, C.rock, p.x1); }
    for (const sx of [-1, 1]) { R.prism(sx * 238, -96, 0, 40, 6, 6, C.rock[2], C.rock[3]); }   // the pylons' stands
    this.fxG = s.add.graphics(); world.push(this.fxG);
    this.cycle.makeBanner(s);
  }

  // ------------------------------------------------------------------ the King
  /** The boss's own state when the fight starts. */
  makeBoss() { this.cycle.gap = 1150; this.cycle.next = 1400; }
  /** His head: what the camera, the death and the CPU aim at (during a POP FLY, the spot it's coming down on). */
  core() { return this.popMark ? { x: this.popMark.x, y: -160 } : { x: this.head.x, y: this.head.y }; }
  /** Where he can be hit: the head (x1.5 while frame-dropping) and the gauntlets. */
  hurt() {
    const h = this.head, out = [{ x1: h.x - 42, y1: h.y - 40, x2: h.x + 42, y2: h.y + 44, mult: this.drop > 0 ? 1.5 : 1 }];
    for (const g of this.hands) out.push({ x1: g.x - 36, y1: g.y - 18, x2: g.x + 36, y2: g.y + 18, mult: g.resting ? 0.6 : 0.4 });
    return out;
  }
  /** What he can do next: every few attacks a FRAME DROP; ENRAGED adds the EYE BEAM. */
  pattern(phase) {
    if (this.count % DROP.every === DROP.every - 1) return ['frame'];
    if (this.low) return ['homer', 'pop', 'homer', 'swipe', 'palm', 'beam', 'blow'];
    return phase === 1 ? ['palm', 'swipe', 'gun', 'goons', 'rain', 'blow'] : ['palm', 'swipe', 'gun', 'goons', 'rain', 'beam', 'gun', 'blow'];
  }
  start_palm(match, a) { this.count++; const tg = this.nearest(match); a.hands = this.boss.phase === 2 ? [0, 1] : [tg && tg.x > 0 ? 1 : 0]; a.i = 0; a.p = 0; a.tx = tg ? tg.x : 0; }
  start_swipe(match, a) { this.count++; const tg = this.nearest(match); a.s = tg && tg.x > 0 ? -1 : 1; a.h = this.hands[a.s < 0 ? 0 : 1]; }
  start_gun(match, a) { this.count++; const tg = this.nearest(match); a.hands = this.boss.phase === 2 ? [0, 1] : [tg && tg.x > this.head.x ? 0 : 1]; for (const i of a.hands) this.hands[i].mode = 'gun'; }
  start_goons(match, a) { this.count++; a.h = this.hands[Math.random() < 0.5 ? 0 : 1]; }
  start_rain(match, a) { this.count++; }
  start_beam(match, a) { this.count++; a.s = Math.random() < 0.5 ? -1 : 1; }
  start_frame(match, a) { this.count++; }
  start_blow(match, a) { this.count++; this.cart = { x: this.head.x, y: 120, a: 0, tilt: 0 }; sfx('limit', 0.6, 0.8); }
  start_homer(match, a) { this.count++; this.batUp(match, a); }
  start_pop(match, a) { this.count++; this.batUp(match, a); a.pop = true; }
  /** Picks the batting hand (the one away from the nearest player) and turns it into a bat. */
  batUp(match, a) {
    const tg = this.nearest(match, this.head.x); a.side = tg && tg.x < this.head.x ? 1 : -1;
    a.bat = this.hands[a.side < 0 ? 0 : 1]; a.toss = this.hands[a.side < 0 ? 1 : 0]; a.bat.mode = 'bat'; a.bat.resting = false; a.toss.resting = false;
    a.hx = this.head.x; sfx('ding', 0.5, 0.7);
  }
  rageLine() { return 'SYSTEM OVERCLOCKED!'; }
  /** The entrance's camera: following his falling head, wide as the gauntlets fly in, in close for the finger guns. */
  introShot(k) { return k < 0.45 ? { x: 0, y: Math.max(-300, this.head.y + 40), zoom: 1.15 } : k < 0.74 ? { x: 0, y: -140, zoom: 0.82 } : { x: 0, y: -185, zoom: 1.0 }; }
  /** The freeze frame: his head and both finger guns. */
  introAt() { return { x: 0, y: -180, zoom: 1.05 }; }

  /**
   * THE ENTRANCE (k = 0..1): his head drops out of the sky spinning, growing as it comes, and bounces into place;
   * his gauntlets fly in from either side; then both turn into finger guns, pointed out and up, jaw dropped in a
   * grin - the pose the freeze frame stops on.
   */
  introPose(match, k, t, n) {
    this.t++;
    const e = (a, b) => Phaser.Math.Clamp((k - a) / (b - a), 0, 1), H = this.head, drop = e(0.05, 0.45);
    H.y = -560 + (KING.y + 560) * drop - Math.sin(e(0.45, 0.6) * Math.PI) * 26; H.x = 0;
    H.yaw = (1 - drop) * Math.PI * 6; H.k = 0.3 + 0.7 * drop; H.jaw = e(0.75, 0.85) * 0.9;
    if (t === Math.round(0.45 * n)) { sfx('bighit', 0.8, 1.2); match.shake(6, 8); this.burst(match, 0, KING.y + 40, [C.gold, C.crystal[0], 0xffffff], 16); }
    const fly = 1 - Math.pow(1 - e(0.45, 0.72), 2);
    for (const h of this.hands) {
      h.x = h.s * (620 - (620 - 175) * fly); h.y = KING.rest[1] - 40 * e(0.75, 0.9); h.resting = false;
      h.mode = k > 0.75 ? 'gun' : null; h.roll = h.mode ? h.s * 0.6 : (1 - fly) * h.s * 3; h.flashT = 0;
    }
    if (t === Math.round(0.76 * n)) { sfx('laser', 0.8, 1.7); sfx('ding', 0.6, 1.2); }
    if (k >= 1) for (const h of this.hands) h.mode = 'gun';
  }
  /** After the intro: the gauntlets go back to open hands. */
  endIntro() { super.endIntro(); for (const h of this.hands) { h.mode = null; h.roll = 0; } this.head.k = 1; }

  /** At rest: his head bobs and turns toward the nearest player; the gauntlets hover by his sides. */
  idle(match) {
    const tg = this.nearest(match), r = this.boss.phase === 2;
    this.head.x += ((r ? Math.sin(this.t * 0.015) * 90 : 0) - this.head.x) * 0.03;
    this.head.y += (KING.y + Math.sin(this.t * 0.04) * 8 - this.head.y) * 0.08;
    this.head.yaw += ((tg ? Phaser.Math.Clamp((tg.x - this.head.x) / 400, -0.5, 0.5) : 0) - this.head.yaw) * 0.08;
    for (const h of this.hands) { h.resting = false; this.toward(h, this.head.x + h.s * KING.rest[0] + Math.sin(this.t * 0.05 + h.s) * 6, KING.rest[1] + Math.sin(this.t * 0.06 + h.s * 2) * 10, 0.08); h.roll += (0 - h.roll) * 0.1; }
  }
  /** Moves a gauntlet part of the way toward a point. */
  toward(h, x, y, k) { h.x += (x - h.x) * k; h.y += (y - h.y) * k; }

  /** PALM SLAM: a gauntlet follows the nearest player from above (its shadow on the floor), then slams down flat. */
  atk_palm(match, a, out) {
    const h = this.hands[a.hands[a.i]], tg = this.nearest(match, h.x), track = this.sp(PALM.track) - (a.i ? 14 : 0), tt = a.t - a.p;
    h.resting = false;
    if (tt < track) { if (tg) a.tx += Phaser.Math.Clamp(Phaser.Math.Clamp(tg.x, -230, 230) - a.tx, -4.4, 4.4); this.toward(h, a.tx, PALM.high, 0.16); h.shadow = { x: a.tx, k: tt / track }; h.roll = Math.sin(tt * 0.3) * 0.08; if (tt === 1) sfx('laser', 0.3, 0.6); }
    else if (tt < track + PALM.drop) { h.x = a.tx; h.y = PALM.high + (-13 - PALM.high) * ((tt - track + 1) / PALM.drop); out.push(this.bhit('palm' + a.id + a.i, h.x - 38, h.y - 20, h.x + 38, h.y + 20, ...PALM.hit)); }
    else if (tt < track + PALM.drop + this.sp(PALM.rest) + 16) {
      const k = tt - track - PALM.drop; h.y = -13; h.resting = true; h.shadow = null;
      if (k === 0) { sfx('bighit', 1, 0.7); match.shake(9, 12); this.burst(match, h.x, -4, [C.tileB, C.gold, C.crystal[0]], 14); }
      if (k < 8) { const w = 70 * (1 + k / 4); out.push(this.bhit('pw' + a.id + a.i, h.x - w, -14, h.x - 38, 0, ...PALM.wave, { dirX: -1 }), this.bhit('pr' + a.id + a.i, h.x + 38, -14, h.x + w, 0, ...PALM.wave, { dirX: 1 })); }
    } else {
      h.resting = false;
      if (a.i + 1 < a.hands.length) { a.i++; a.p = a.t; a.tx = tg ? tg.x : 0; return false; }
      if (tt > track + PALM.drop + this.sp(PALM.rest) + 40) return true;
      this.toward(h, this.head.x + h.s * KING.rest[0], KING.rest[1], 0.12);
    }
    return false;
  }

  /** GROUND SWIPE: a gauntlet lowers at one edge (rattling), then sweeps flat along the floor to the other. */
  atk_swipe(match, a, out) {
    const h = a.h, wind = this.sp(SWIPE.wind), cross = this.sp(SWIPE.cross);
    if (a.t < wind) { this.toward(h, a.s * SWIPE.edge, -14, 0.1); h.roll = Math.sin(a.t * 0.8) * 0.06; }
    else if (a.t < wind + cross) {
      h.x = a.s * SWIPE.edge * (1 - 2 * (a.t - wind) / cross); h.y = -14; h.roll = -a.s * 0.25;
      out.push(this.bhit('swipe' + a.id, h.x - 38, -32, h.x + 38, 0, ...SWIPE.hit, { dirX: -a.s }));
      if (a.t === wind) sfx('whoosh', 0.9, 0.7);
      if (a.t % 3 === 0) match.particles.push({ shape: 'polygem', x: h.x, y: -4, vx: a.s * 1.5, vy: -1.5, life: 18, color: C.tileB, size: 3 });
    } else { this.toward(h, this.head.x + h.s * KING.rest[0], KING.rest[1], 0.1); if (a.t > wind + cross + 40) return true; }
    return false;
  }

  /**
   * FINGER GUN: a gauntlet curls into a finger gun (thumb up, index out), hovers off to one side, aims at the nearest
   * player and fires shot after shot - each with a muzzle flash and a kick. ENRAGED: both hands, staggered.
   */
  atk_gun(match, a, out) {
    const n = GUN.shots[this.boss.phase - 1], aim = this.sp(GUN.aim), every = this.sp(GUN.every);
    let done = true;
    a.hands.forEach((hi, j) => {
      const h = this.hands[hi], start = aim + j * Math.round(every / 2), tg = this.nearest(match, h.x);
      const px = Phaser.Math.Clamp(this.head.x + h.s * 205, -300, 300), py = -170 + j * 50;
      this.toward(h, px, py + Math.sin(a.t * 0.1) * 6, 0.12); h.resting = false;
      const tx = tg ? tg.x : 0, ty = tg ? tg.y - 26 : 0, ang = Math.atan2(ty - h.y, tx - h.x);
      const want = h.s < 0 ? ang : Math.atan2(-(ty - h.y), -(tx - h.x));                       // (the right hand points the other way)
      h.kick = Math.max(0, (h.kick || 0) - 0.12); h.roll += (want + h.s * h.kick - h.roll) * 0.25;
      const k = a.t - start;
      if (k >= 0 && k % every === 0 && k / every < n) {
        const d = Math.hypot(tx - h.x, ty - h.y) || 1, mx = h.x + (tx - h.x) / d * 64, my = h.y + (ty - h.y) / d * 64 - 14;
        this.shots.push({ x: mx, y: my, vx: (tx - h.x) / d * GUN.speed, vy: (ty - h.y) / d * GUN.speed, id: this.sid('shot'), a: 0 });
        h.kick = 0.5; h.flashT = 5; sfx('laser', 0.7, 1.7); sfx('clang', 0.25, 2);
      }
      if (h.flashT > 0) h.flashT--;
      if (k < n * every + 20) done = false;
    });
    if (done) { for (const i of a.hands) this.hands[i].mode = null; return true; }
    return false;
  }
  /** The finger gun's shots: glowing gems flying straight; gone off screen or into the floor. */
  stepShots(match, out) {
    for (const s of this.shots) {
      s.x += s.vx; s.y += s.vy; s.a += 0.3;
      out.push(this.bhit(s.id, s.x - GUN.r, s.y - GUN.r, s.x + GUN.r, s.y + GUN.r, ...GUN.hit, { dirX: Math.sign(s.vx) || 1 }));
      if (s.y > -2 && Math.abs(s.x) < 250) { s.dead = true; this.burst(match, s.x, -3, [0xff5a3a, 0xffd040], 5); }
    }
    this.shots = this.shots.filter((s) => !s.dead && Math.abs(s.x) < 700 && s.y < 400 && s.y > -600);
  }

  /** POLY GOONS: he raises a gauntlet, warp rings open over the arena and little low-poly minions drop out of them. */
  atk_goons(match, a) {
    const h = a.h, n = GOON.n[this.boss.phase - 1];
    this.toward(h, this.head.x + h.s * 150, -260, 0.1); h.roll = h.s * -0.4; h.resting = false;
    if (a.t === 20) { sfx('limit', 0.5, 1.6); for (let i = 0; i < n; i++) this.warps.push({ x: Phaser.Math.Clamp(-200 + 400 * (i + 0.5) / n + (Math.random() - 0.5) * 50, -230, 230), y: -230, t: 0 }); }
    if (a.t === 60) {
      for (const w of this.warps) if (this.goons.length < GOON.max) this.goons.push({ x: w.x, y: w.y, vx: 0, vy: 0, hp: GOON.hp, t: 0, id: this.sid('goon'), seen: new Set(), col: C.gem[this.goons.length % 3], flash: 0, dir: 1 });
      sfx('ding', 0.6, 0.8); this.warps = [];
    }
    for (const w of this.warps) w.t++;
    return a.t > 80;
  }
  /** Goons fall, land, waddle after the nearest player and hop now and then; touching one hurts; they time out or fall off. */
  stepGoons(match, out) {
    for (const g of this.goons) {
      g.t++; if (g.flash > 0) g.flash--;
      const tg = this.nearest(match, g.x), floor = Math.abs(g.x) < 250 ? 0 : 999;
      g.vy += 0.4; g.y += g.vy; g.x += g.vx;
      if (g.y >= floor && g.vy >= 0) {
        g.y = floor; g.vy = 0;
        if (tg) { g.dir = Math.sign(tg.x - g.x) || g.dir; g.vx += (g.dir * GOON.speed - g.vx) * 0.15; }
        if (g.t % 90 === 45 && tg && Math.abs(tg.x - g.x) < 90) g.vy = -6.5;                     // a hop at you
      }
      if (g.t > 30) out.push(this.bhit(g.id + 'b' + Math.floor(g.t / GOON.bite), g.x - GOON.s, g.y - GOON.s * 2, g.x + GOON.s, g.y, ...GOON.hit, { dirX: g.dir }));
      if (g.t > GOON.life || g.y > 400) { g.dead = true; if (g.y < 400) this.burst(match, g.x, g.y - GOON.s, [g.col, 0xffffff], 8); }
    }
    this.goons = this.goons.filter((g) => !g.dead);
  }
  /** The players' attacks hit the King (BossArena) and smash his goons (two or three hits each). */
  strikeTargets(match, hbs) {
    super.strikeTargets(match, hbs);
    for (const g of this.goons) for (const hb of hbs) {
      if (!hb.owner || g.seen.has(hb.id) || !(hb.x1 < g.x + GOON.s && hb.x2 > g.x - GOON.s && hb.y1 < g.y && hb.y2 > g.y - GOON.s * 2)) continue;
      g.seen.add(hb.id); g.hp -= hb.h.dmg || 4; g.flash = 6; g.vx = (hb.facing || Math.sign(g.x - hb.owner.x) || 1) * 4; g.vy = -4; sfx('hit', 0.5, 1.5);
      if (g.hp <= 0 && !g.dead) { g.dead = true; this.burst(match, g.x, g.y - GOON.s, [g.col, 0xffffff, C.gold], 14); sfx('glass', 0.6, 1.4); }
    }
  }
  /** One goon's faces: a cube body, angry eyes, a spike on top, two waddling feet. */
  goonFaces(g) {
    const S = GOON.s, c = g.flash ? 0xffffff : g.col, step = Math.sin(g.t * 0.4) * 3, out = [];
    out.push(...boxFaces(-S, -S * 2, -S, S, 0, S, c, 0xffffff));
    out.push(...pyramidFaces(0, -S * 2, 0, S, S, 9, C.gold));
    for (const e of [-1, 1]) {
      out.push({ p: [[e * 4 - 3, -S * 1.4 + (e < 0 ? -2 : 0), -S - 0.5], [e * 4 + 3, -S * 1.4 + (e > 0 ? -2 : 0), -S - 0.5], [e * 4 + 3, -S * 1.4 + 4, -S - 0.5], [e * 4 - 3, -S * 1.4 + 4, -S - 0.5]], n: [0, 0, -1], c: 0xffffff, nofog: true, bias: -3 });
      out.push({ p: [[e * 4 - 1, -S * 1.4, -S - 0.8], [e * 4 + 2, -S * 1.4, -S - 0.8], [e * 4 + 2, -S * 1.4 + 3.5, -S - 0.8], [e * 4 - 1, -S * 1.4 + 3.5, -S - 0.8]], n: [0, 0, -1], c: 0x1a1030, nofog: true, bias: -4 });
      out.push(...boxFaces(e * 6 - 3, -4, -6, e * 6 + 3, 2, 6, 0x1a1030));
    }
    return xf(out, g.x + (g.vx ? step * 0.2 : 0), g.y - Math.abs(step) * 0.6, 0, g.dir < 0 ? Math.PI : 0, 0, 1);
  }

  /** POLYGON RAIN: cubes fall from the sky on marked spots, bounce once and shatter. */
  atk_rain(match, a, out) {
    if (a.t <= RAIN.n * RAIN.every && a.t % RAIN.every === 1) {
      const tg = this.nearest(match), x = Phaser.Math.Clamp(tg && a.t % (RAIN.every * 2) === 1 ? tg.x : (Math.random() - 0.5) * 460, -235, 235);
      this.cubes.push({ x, y: -420, t: 0, vy: 0, a: Math.random() * 6, id: this.sid('cube'), col: C.gem[Math.floor(Math.random() * 3)] });
      this.head.jaw = 0.6;
    }
    this.head.jaw = Math.max(0, this.head.jaw - 0.03);
    return a.t > RAIN.n * RAIN.every && !this.cubes.length;
  }
  /** Cubes wait (their mark shows), fall, bounce and shatter. */
  stepCubes(match, out) {
    for (const c of this.cubes) {
      c.t++; c.a += 0.08;
      if (c.t < this.sp(RAIN.warn)) continue;
      c.vy += 0.6; c.y += c.vy;
      out.push(this.bhit(c.id, c.x - RAIN.s, c.y - RAIN.s, c.x + RAIN.s, c.y + RAIN.s, ...RAIN.hit, { radial: true }));
      if (c.y > -RAIN.s && c.vy > 0) { if (c.bounced) { c.dead = true; this.burst(match, c.x, c.y, [c.col, 0xffffff], 12); sfx('glass', 0.5, 1.2); } else { c.bounced = true; c.y = -RAIN.s; c.vy = -5; sfx('clang', 0.5, 1.3); match.shake(3, 4); } }
    }
    this.cubes = this.cubes.filter((c) => !c.dead);
  }

  /** EYE BEAM (enraged): his eyes charge, then a beam sweeps across the floor from one side to the other. */
  atk_beam(match, a, out) {
    const ch = this.sp(BEAM.charge), sw = this.sp(BEAM.sweep);
    if (a.t < ch) { this.beam = { charge: a.t / ch }; if (a.t === 1) sfx('limit', 0.5, 1.4); }
    else if (a.t < ch + sw) {
      const x = a.s * 280 * (1 - 2 * (a.t - ch) / sw);
      this.beam = { x, on: true };
      out.push(this.bhit('beam' + a.id + Math.floor(a.t / 14), x - 16, -60, x + 16, 0, ...BEAM.hit, { dirX: -a.s }));
      if (a.t % 2 === 0) match.particles.push({ x, y: -3, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 3, life: 14, color: [C.eye, 0xff5a3a, 0xffffff][a.t % 3], size: 2 });
      if (a.t === ch) sfx('laser', 1, 0.6);
    } else { this.beam = null; return true; }
    return false;
  }

  /** The bat's angle on screen (0 = pointing right, +y down) for a hand, as that hand's roll. */
  batRoll(h, ang) { return h.s < 0 ? ang : ang - Math.PI; }
  /**
   * HOME RUN / POP FLY (BATTER UP): one gauntlet holds a bat, the other tosses his head up; he swings (over the
   * top, tennis-style - the bat sweeps from up-behind, through level, to down-front) and at contact his head flies:
   * a line drive at the nearest player (HOME RUN) or straight up (POP FLY). Then `flyHead` takes over.
   */
  atk_homer(match, a, out) {
    const H = this.head, s = a.side, wind = this.sp(HOMER.wind), sw = HOMER.swing, b = a.bat, tz = a.toss;
    const A0 = s > 0 ? -1.107 : Math.PI + 1.107, AC = s > 0 ? -Math.PI : 2 * Math.PI, A1 = s > 0 ? -Math.PI - 0.9 : 2 * Math.PI + 0.9;
    if (!a.ball) {
      const k = Math.min(1, a.t / wind);
      H.y += (KING.y - 70 * Math.sin(Math.PI * k) - H.y) * 0.3; H.x += (a.hx - H.x) * 0.2; H.yaw += (-s * 0.6 - H.yaw) * 0.1;
      this.toward(tz, H.x - s * 34, H.y + 78, 0.2); tz.roll = tz.s * -0.5;
      const bx = H.x + s * 122, by = (a.pop ? H.y + 40 : H.y) + 8;
      this.toward(b, bx, by, 0.25);
      let ang = A0;
      if (a.t >= wind) { const q = Math.min(1, (a.t - wind) / sw); ang = q < 1 ? A0 + (AC - A0) * q : AC; }
      if (a.pop) ang += s * 0.5;                                               // a pop fly: an uppercut
      b.roll = this.batRoll(b, ang);
      if (a.t < wind && a.t % 12 === 0) H.jaw = 0.5;
      if (a.t === wind - 8) sfx('whoosh', 0.8, 0.6);
      if (a.t >= wind + sw) {                                                  // CRACK!
        const tg = this.nearest(match, H.x), tx = tg ? tg.x : H.x - s * 200, ty = tg ? tg.y - 30 : 0, d = Math.hypot(tx - H.x, ty - H.y) || 1;
        a.ball = a.pop ? { vx: (tx - H.x) * 0.004, vy: -15, t: 0, n: 0, tx } : { vx: (tx - H.x) / d * HOMER.speed, vy: (ty - H.y) / d * HOMER.speed - 2, t: 0, n: 0 };
        sfx('bighit', 1, 1.3); sfx('clang', 0.8, 2.2); match.shake(10, 8); H.jaw = 1;
        match.popText({ x: H.x, y: H.y + 40 }, a.pop ? 'POP FLY!' : 'CRACK!', '#ffe08a');
        this.burst(match, H.x, H.y, [0xffffff, C.gold, C.head[0]], 14);
        match.particles.push({ shape: 'ring', x: H.x, y: H.y, vx: 0, vy: 0, life: 14, maxLife: 14, color: 0xffffff, grav: 0, r: 10, dr: 6 });
      }
      return false;
    }
    b.roll += (this.batRoll(b, A1) - b.roll) * 0.25;
    this.toward(tz, a.hx - s * 120, KING.rest[1], 0.08); tz.roll += (0 - tz.roll) * 0.1;
    return this.flyHead(match, a, out);
  }
  atk_pop(match, a, out) { return this.atk_homer(match, a, out); }
  /**
   * His head in flight. HOME RUN: a spinning line drive, ricocheting off the floor (up to `HOMER.bounces`) and off the
   * bumpers, hitting very hard, then it floats home. POP FLY: up off the screen, a mark follows the nearest player,
   * then it crashes down there - a big hit and a shockwave both ways along the floor - bounces once and floats home.
   */
  flyHead(match, a, out) {
    const H = this.head, B = a.ball; B.t++;
    if (B.home) {                                                              // floating home, spinning down
      H.x += (KING.x - H.x) * 0.08; H.y += (KING.y - H.y) * 0.08; H.yaw *= 0.9; H.roll = (H.roll || 0) * 0.9;
      if (Math.hypot(H.x - KING.x, H.y - KING.y) < 6) { H.roll = 0; a.bat.mode = null; return true; }
      return false;
    }
    H.yaw += 0.45; H.roll = (H.roll || 0) + 0.2 * Math.sign(B.vx || 1);
    if (a.pop) {
      if (!B.down) {
        H.x += B.vx; H.y += B.vy; B.vy = Math.min(B.vy + 0.25, -8);
        if (H.y < -620) { B.down = 1; B.mark = H.x; }
        return false;
      }
      if (B.down === 1) {                                                      // up out of sight: the mark follows you
        const tg = this.nearest(match, B.mark); B.mt = (B.mt || 0) + 1;
        if (tg) B.mark += Phaser.Math.Clamp(Phaser.Math.Clamp(tg.x, -230, 230) - B.mark, -5, 5);
        this.popMark = { x: B.mark, k: B.mt / this.sp(POP.track) };
        if (B.mt >= this.sp(POP.track)) { B.down = 2; H.x = B.mark; H.y = -600; B.vy = POP.fall; B.vx = 0; sfx('whoosh', 1, 0.5); }
        return false;
      }
      if (B.down === 2) {
        H.y += B.vy; B.vy += 0.3;
        out.push(this.bhit('pop' + a.id, H.x - 44, H.y - 44, H.x + 44, H.y + 44, ...POP.hit, { radial: true }));
        if (H.y >= -HOMER.r && Math.abs(H.x) < 250) {
          H.y = -HOMER.r; B.down = 3; B.vy = -6; this.popMark = null; this.shock = { x: H.x, r: 0, id: this.sid('popw') };
          sfx('bighit', 1, 0.6); sfx('ko', 0.6, 0.8); match.shake(16, 18); this.burst(match, H.x, -4, [C.tileA, C.tileB, C.gold, C.head[0]], 24);
        }
        if (H.y > 500) B.home = true;
        return false;
      }
      H.y += B.vy; B.vy += 0.35; if (B.vy > 0 && H.y >= -HOMER.r) { H.y = -HOMER.r; B.home = true; }
      return false;
    }
    H.x += B.vx; H.y += B.vy; B.vy += HOMER.grav;
    out.push(this.bhit('homer' + a.id + B.n, H.x - HOMER.r, H.y - HOMER.r, H.x + HOMER.r, H.y + HOMER.r, ...HOMER.hit, { dirX: Math.sign(B.vx) || 1 }));
    if (H.y > -HOMER.r && B.vy > 0 && Math.abs(H.x) < 250) {                   // off the floor
      if (B.n >= HOMER.bounces) B.home = true;
      else { H.y = -HOMER.r; B.vy = -Math.abs(B.vy) * 0.8 - 2; B.n++; sfx('bighit', 0.7, 1); match.shake(7, 8); this.burst(match, H.x, -4, [C.tileA, C.tileB, C.gold], 10); }
    }
    for (const bp of this.bumpers()) {                                         // off a bumper
      const dx = H.x - bp.x, dy = H.y - bp.y, d = Math.hypot(dx, dy);
      if (d < BUMP.r + HOMER.r - 6 && (B.vx * dx + B.vy * dy) < 0) {
        const nx = dx / d, ny = dy / d, dot = B.vx * nx + B.vy * ny; B.vx -= 2 * dot * nx; B.vy -= 2 * dot * ny; B.vx *= 1.1; B.vy *= 1.1;
        bp.set.flash = 10; sfx('ding', 0.9, 1.6); sfx('clang', 0.5, 1.8); match.shake(5, 6); B.n++; B.t = Math.min(B.t, HOMER.flight - 40);
      }
    }
    if (B.t > HOMER.flight || Math.abs(H.x) > 360 || H.y < -480 || H.y > 300) B.home = true;
    return false;
  }

  /**
   * BLOW THE CARTRIDGE: a giant gold cartridge rises up between his gauntlets, spinning; he breathes in (head back,
   * jaw shut), then BLOWS into it - jaw wide open, a gale of dust and wind lines - pushing every fighter away from
   * him toward the edges; then he lifts it high and slams it down into the arena, label first, like a console: RESET!
   * A huge hit where it lands and a shockwave running out both ways. The cartridge sinks into the floor.
   */
  atk_blow(match, a, out) {
    const H = this.head, K = this.cart, rise = this.sp(BLOW.rise), br = rise + this.sp(BLOW.breath), gale = br + BLOW.gale, lift = gale + BLOW.lift, slam = lift + BLOW.slam;
    const hold = (x, y) => { for (const h of this.hands) { h.resting = false; this.toward(h, x + h.s * 52, y, 0.25); h.roll += (h.s * -0.25 - h.roll) * 0.2; } };
    H.x += (0 - H.x) * 0.05;
    if (a.t < rise) { K.x = H.x; K.y += (H.y + 120 - K.y) * 0.12; K.a += 0.25 * (1 - a.t / rise); hold(K.x, K.y); return false; }
    if (a.t < br) { K.a *= 0.8; K.y += (H.y + 92 - K.y) * 0.2; hold(K.x, K.y); H.y += (KING.y - 26 - H.y) * 0.1; H.jaw = 0; if (a.t === rise) { sfx('rumble', 0.5, 1.8); match.popText({ x: H.x, y: H.y + 50 }, 'HHHHH...', '#c8d8ff'); } return false; }
    if (a.t < gale) {                                                          // the gale
      H.jaw = 1; H.y += (KING.y - H.y) * 0.2; K.tilt = Math.sin(a.t * 0.8) * 0.06; hold(K.x, K.y);
      if (a.t === br) { sfx('geyser', 1, 0.5); sfx('whoosh', 1, 0.4); match.shake(4, BLOW.gale); match.popText({ x: H.x, y: H.y + 70 }, 'FWOOOSH!', '#ffffff'); }
      if (a.t % 10 === 0) sfx('whoosh', 0.5, 0.5 + Math.random() * 0.3);
      for (const f of match.fighters) if (f.alive && f.state !== 'respawn') { const d = Math.sign(f.x - H.x) || 1; f.x += d * BLOW.push * (f.grounded ? 1 : BLOW.air); }
      this.wind = { k: Math.min(1, (a.t - br) / 10, (gale - a.t) / 10) };
      if (a.t % 2 === 0) for (const d of [-1, 1]) match.particles.push({ x: K.x + d * 30, y: K.y + (Math.random() - 0.5) * 40, vx: d * (6 + Math.random() * 4), vy: (Math.random() - 0.5), life: 30, color: [0xfff4d0, 0xd8c8a0, 0xffffff][a.t % 3], size: 2 });
      return false;
    }
    this.wind = null; H.jaw = Math.max(0, H.jaw - 0.1);
    if (a.t < lift) { const tg = this.nearest(match, K.x); if (a.t === gale) a.tx = Phaser.Math.Clamp(tg ? tg.x : 0, -190, 190); K.x += (a.tx - K.x) * 0.15; K.y += (-300 - K.y) * 0.15; K.tilt += (Math.PI - K.tilt) * 0.2; hold(K.x, K.y); a.mark = true; return false; }
    if (a.t < slam) { const u = (a.t - lift + 1) / BLOW.slam; K.y = -300 + (-48 + 300) * u * u; hold(K.x, K.y); out.push(this.bhit('cart' + a.id, K.x - 44, K.y - 50, K.x + 44, K.y + 50, ...BLOW.hit)); return false; }
    if (a.t === slam) {
      a.mark = false; sfx('bighit', 1, 0.5); sfx('ding', 1, 0.6); match.shake(18, 20); this.shock = { x: K.x, r: 0, id: this.sid('cartw'), wave: BLOW.wave };
      match.popText({ x: K.x, y: -120 }, 'RESET!', '#ffe08a'); this.flashT = 10;
      this.burst(match, K.x, -6, [C.gold, C.tileA, C.tileB, 0xffffff], 26);
    }
    hold(K.x, K.y);
    if (a.t > slam + 30) K.y += 2.5;                                           // it sinks into the floor
    if (a.t > slam + 64) { this.cart = null; return true; }
    return false;
  }

  /** FRAME DROP: he stutters and glitches, sinking low - his head takes x1.5 until he catches up. */
  atk_frame(match, a) {
    if (a.t === 1) { this.drop = this.sp(DROP.dur) + 40; sfx('glitch', 0.9, 0.8); this.frameText(); }
    this.head.y += (KING.low - this.head.y) * 0.1; this.head.yaw = Math.sin(a.t * 0.9) * 0.3 * (a.t % 20 < 10 ? 1 : 0);
    for (const h of this.hands) { h.resting = false; this.toward(h, this.head.x + h.s * 110, -40, 0.06); h.roll = h.s * 0.6; }
    if (a.t % 25 === 0) sfx('glitch', 0.4, 1 + Math.random() * 0.5);
    return this.drop <= 0;
  }
  /** Flashes FRAME DROP! over the health bar. */
  frameText() { if (this.rageText && !this.boss.rage) { this.rageText.setText('FRAME DROP!'); this.boss.rage = 60; } }

  /** The POLY BUMPERS (BATTER UP): where they are this frame (an empty list until they've floated in). */
  bumpers() {
    if (!this.low || !this.bump) return [];
    const k = Math.min(1, this.bump.t / 80);
    return [-1, 1].map((s, i) => ({ x: s * (BUMP.x + Math.sin(this.t * 0.012 + i * 2) * BUMP.drift), y: BUMP.y - (1 - k) * 400, i, set: this.bump.f[i] }));
  }
  /**
   * BATTER UP begins (below `LOW.at` health): the arena starts breaking down - the bumpers float in and the glitch
   * tiles start - and he grabs a bat.
   */
  startLow(match) {
    this.low = true; this.bump = { t: 0, f: [{ flash: 0 }, { flash: 0 }] }; this.glitch = { next: 90, tiles: [] };
    this.rageText.setText('BATTER UP!'); this.boss.rage = 120; this.boss.wait = Math.min(this.boss.wait, 50);
    sfx('glitch', 1, 0.6); sfx('laser', 0.8, 0.5); match.shake(8, 30); this.count = 0;
  }
  /** The breaking-down arena (BATTER UP): bumpers bounce you off, glitch tiles warn then burn; the pop fly's shockwave. */
  stepLow(match, out) {
    if (this.shock) {
      const S = this.shock, W = S.wave || POP.wave; S.r += W.speed;
      out.push(this.bhit(S.id + 'L', S.x - S.r - 14, -18, S.x - S.r + 14, 0, ...W.hit, { dirX: -1 }), this.bhit(S.id + 'R', S.x + S.r - 14, -18, S.x + S.r + 14, 0, ...W.hit, { dirX: 1 }));
      if (S.r > W.reach) this.shock = null;
    }
    if (!this.low || this.boss.dying) return;
    this.bump.t++;
    for (const b of this.bumpers()) {
      if (b.set.flash > 0) b.set.flash--;
      if (this.bump.t > 80) out.push(this.bhit('bump' + b.i + Math.floor(this.t / 30), b.x - BUMP.r, b.y - BUMP.r, b.x + BUMP.r, b.y + BUMP.r, ...BUMP.hit, { radial: true }));
    }
    for (const f of match.fighters) for (const b of this.bumpers()) if (f.alive && Math.hypot(f.x - b.x, f.y - 20 - b.y) < BUMP.r + 16 && !b.set.flash) { b.set.flash = 10; sfx('ding', 0.6, 1.3); }
    const G = this.glitch;
    if (--G.next <= 0) {
      G.next = this.sp(GLITCH.every);
      const n = GLITCH.n[this.boss.phase === 2 ? 1 : 0], pool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      for (let i = 0; i < n; i++) { const j = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; G.tiles.push({ i: j, t: 0, id: this.sid('gl') }); }
      sfx('glitch', 0.6, 1.3);
    }
    for (const T of G.tiles) {
      T.t++;
      const x1 = -250 + T.i * 50;
      if (T.t === GLITCH.warn) sfx('thunder', 0.3, 1.9);
      if (T.t >= GLITCH.warn) out.push(this.bhit(T.id + Math.floor(T.t / 30), x1 + 4, -26, x1 + 46, 0, ...GLITCH.hit));
    }
    G.tiles = G.tiles.filter((T) => T.t < GLITCH.warn + GLITCH.on);
  }

  /** A burst of tumbling polygon gems. */
  burst(match, x, y, cols, n) { for (let i = 0; i < n; i++) match.particles.push({ shape: 'polygem', x, y, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 4, life: 22 + Math.random() * 14, color: cols[i % cols.length], size: 3, grav: 0.15 }); }
  /** His death: the polygons come apart (handled by the drawing, with the explosions). */
  onDeath() { this.drop = 0; this.beam = null; this.popMark = null; this.wind = null; this.cart = null; if (this.glitch) this.glitch.tiles = []; }

  // ------------------------------------------------------------------ hazards (VS too)
  start_zap(match, h) { h.title = 'PYLON ZAP!'; sfx('laser', 0.4, 0.5); }
/** PYLON ZAP: the pylon crystals charge, then arcs crackle along both ledges. */
  step_zap(match, h, out) {
    if (h.t < ZAP.charge) { this.zap = { k: h.t / ZAP.charge }; return false; }
    if (h.t < ZAP.charge + ZAP.on) {
      this.zap = { on: true };
      if (h.t % 18 === 0) sfx('thunder', 0.25, 1.8);
      for (const p of this.platforms.slice(1)) out.push(this.bhit('zap' + h.id + p.x1 + Math.floor(h.t / 18), p.x1, p.y - 34, p.x2, p.y + 2, ...ZAP.hit));
      return false;
    }
    this.zap = null; return true;
  }
  start_quake(match, h) { h.title = 'QUAKE RING!'; }
/** QUAKE RING: the arena rumbles, then a shockwave runs out along the floor from the middle both ways. */
  step_quake(match, h, out) {
    if (h.t < QUAKE.wind) { if (h.t % 10 === 0) { match.shake(2, 6); sfx('rumble', 0.4, 1.4); } return false; }
    const r = (h.t - QUAKE.wind) * QUAKE.speed;
    if (h.t === QUAKE.wind) { sfx('bighit', 0.8, 0.5); match.shake(8, 14); }
    this.ring = r;
    out.push(this.bhit('qL' + h.id, -r - 14, -18, -r + 14, 0, ...QUAKE.hit, { dirX: -1 }), this.bhit('qR' + h.id, r - 14, -18, r + 14, 0, ...QUAKE.hit, { dirX: 1 }));
    if (r > 270) { this.ring = null; return true; }
    return false;
  }

  /** Moves the arena and its King one frame; returns hazard + boss hitboxes. */
  step(match) {
    this.t++;
    const out = [];
    this.cycle.run(match, out);
    if (this.boss) {
      this.bossStep(match, out);
      if (!this.low && !this.boss.dying && this.boss.hp <= this.boss.max * LOW.at) this.startLow(match);
      this.stepLow(match, out);
      if (this.drop > 0) this.drop--;
      this.stepShots(match, out); this.stepGoons(match, out); this.stepCubes(match, out);
      if (this.boss.atk && !['gun', 'rain', 'homer', 'pop'].includes(this.boss.atk.name)) this.head.jaw = Math.max(0, this.head.jaw - 0.1);
      for (const h of this.hands) if (this.boss.atk && !h.resting && h.shadow && this.boss.atk.name !== 'palm') h.shadow = null;
      if (!this.boss.atk) for (const h of this.hands) h.shadow = null;
    }
    return out;
  }

  // ------------------------------------------------------------------ drawing
  /** The King's faces: his head (crown, eyes, jaw) and the two gauntlets - all 3D, built fresh each frame. */
  kingFaces() {
    const out = [], H = this.head, B = this.boss, dk = this.deathK(), fl = B && B.flash > 0, rage = B && B.phase === 2;
    const glitch = this.drop > 0 && this.t % 8 < 3 ? (Math.random() - 0.5) * 8 : 0;
    const apart = dk * 60;                                                      // dying: his polygons drift apart
    const hc = fl ? [0xffffff, 0xf0e8ff, 0xffffff] : rage ? [0xc060e8, 0xa040d0, 0xe080ff] : C.head;
    const face = [];
    face.push(...blobFaces(0, 0, 0, 44, 38, 34, hc, 7, null, 0.05));
    face.push(...blobFaces(0, 30 + H.jaw * 18, 2, 30, 14, 26, [C.jaw, 0x6a38c0], 8, null, 0.04));                              // the jaw
    for (const s of [-1, 1]) {                                                  // diamond eyes, brows
      const ex = s * 17, ey = -4, z = -33.5, e = this.drop > 0 ? 0xff5a3a : rage ? 0xff7a3a : C.eye, w = 9, h = 11;
      face.push({ p: [[ex, ey - h, z], [ex + w, ey, z], [ex, ey + h, z], [ex - w, ey, z]], n: [0, 0, -1], c: e, nofog: true, bias: -6 });
      face.push({ p: [[ex - 2, ey - 4, z - 0.4], [ex + 2, ey - 4, z - 0.4], [ex + 2, ey + 4, z - 0.4], [ex - 2, ey + 4, z - 0.4]], n: [0, 0, -1], c: 0x1a1030, bias: -7 });
      face.push(...boxFaces(ex - 12, ey - 20 + (rage ? s * 3 : 0), -36, ex + 12, ey - 15, -26, 0x4a2890, 0x5a38a0));
    }
    face.push(...prismFaces(0, -50, -30, 0, 34, 8, C.gold, 0xffe070));         // the crown: a gold band, spikes, gems
    for (let i = 0; i < 8; i++) { const q = (i + 0.5) / 8 * Math.PI * 2; face.push(...pyramidFaces(Math.cos(q) * 30, -50, Math.sin(q) * 30, 12, 12, 16 + (i % 2) * 8, i % 2 ? C.gold : 0xffe070)); if (i % 2 === 0) face.push(...blobFaces(Math.cos(q) * 34, -40, Math.sin(q) * 34, 4, 4, 4, [C.gem[i / 2 % 3]], i, null, 0)); }
    out.push(...xf(face, H.x + glitch, H.y - apart * 0.5, KING.z, H.yaw, glitch * 0.02 + dk * 0.6 + (H.roll || 0), (1 + dk * 0.2) * (H.k ?? 1)));
    for (const h of this.hands) {                                               // the gauntlets: palm, four fingers, a thumb, a gold cuff with a gem
      const gc = fl ? [0xffffff, 0xf0f4ff, 0xffffff] : C.glove, hand = [];
      if (h.mode === 'gun') {                                                   // a finger gun, seen from the side: index out, thumb up, the rest curled
        hand.push(...boxFaces(-22, -12, -14, 16, 12, 14, gc[0], gc[1]));
        hand.push(...boxFaces(16, -12, -5, 44, -3, 5, gc[1], gc[1]), ...boxFaces(42, -11, -4, 46, -4, 4, C.gold, C.gold));
        hand.push(...boxFaces(-2, -30, -5, 9, -12, 5, gc[2], gc[1]));
        for (let k = 0; k < 3; k++) hand.push(...boxFaces(16, -3 + k * 5, -11 + k, 25, 2 + k * 5, 11 - k, gc[k % 2], gc[1]));
        if (h.flashT > 0) hand.push(...blobFaces(54, -8, 0, 9, 9, 6, [0xffffff, 0xffe070, 0xff8a3a], 4, null, 0.3).map((f) => ({ ...f, nofog: true })));
      } else if (h.mode === 'bat') {                                             // a fist round a baseball bat (handle, barrel, knob) pointing along +x
        hand.push(...boxFaces(-22, -12, -14, 14, 12, 14, gc[0], gc[1]));
        for (let k = 0; k < 4; k++) hand.push(...boxFaces(6, -11 + k * 5.5, -13, 18, -6 + k * 5.5, 13, gc[k % 2], gc[1]));
        hand.push(...xf(prismFaces(0, BAT.handle[0], BAT.handle[1], 0, BAT.r[0], 6, BAT.wood[2], BAT.wood[0]), 0, 0, 0, 0, -Math.PI / 2));
        hand.push(...xf(prismFaces(0, BAT.barrel[0], BAT.barrel[1], 0, BAT.r[1], 8, BAT.wood[0], BAT.wood[1]), 0, 0, 0, 0, -Math.PI / 2));
        hand.push(...xf(prismFaces(0, BAT.barrel[1], BAT.barrel[1] + 3, 0, BAT.r[1] * 0.8, 8, BAT.wood[1], BAT.wood[1]), 0, 0, 0, 0, -Math.PI / 2));
        hand.push(...xf(prismFaces(0, BAT.handle[1] + 6, BAT.handle[1] + 12, 0, BAT.r[1] * 0.75 + 0.6, 8, 0xd82a2a, 0xff5a4a), 0, 0, 0, 0, -Math.PI / 2));   // a red stripe
      } else {
        hand.push(...boxFaces(-22, -9, -18, 18, 9, 18, gc[0], gc[1]));
        for (let k = 0; k < 4; k++) hand.push(...boxFaces(18, -8, -16 + k * 9, 38 - Math.abs(k - 1.5) * 3, 6, -9 + k * 9, gc[k % 2], gc[1]));
        hand.push(...boxFaces(0, -6, -26, 16, 6, -18, gc[2], gc[1]));
      }
      hand.push(...xf(prismFaces(0, -12, 12, 0, 16, 8, C.gold, 0xffe070), -28, 0, 0, 0, Math.PI / 2));
      hand.push(...blobFaces(-4, -11, 0, 6, 3, 6, [C.gem[h.s < 0 ? 0 : 1]], 3, null, 0));
      out.push(...xf(hand, h.x + glitch, h.y + apart * 0.4, 10, h.s < 0 ? 0 : Math.PI, h.roll + dk * h.s, HAND));
    }
    return out;
  }

  /** Draws the 3D scene (scenery + King + stars + cubes + pylons) and the beams, zaps, shadows, rings; and the health bar. */
  render() {
    const t = this.t, dyn = [], B = this.boss;
    if (B && this.deathK() < 0.95) dyn.push(...this.kingFaces());
    else if (!B) dyn.push(...xf(prismFaces(0, -50, -30, 0, 34, 8, C.gold, 0xffe070), Math.sin(t * 0.01) * 40, -210 + Math.sin(t * 0.03) * 8, 30, t * 0.01));   // VS: his empty crown drifts overhead
    for (const s of this.shots) dyn.push(...blobFaces(s.x, s.y, 0, GUN.r, GUN.r, GUN.r, [0xff5a3a, 0xffd040, 0xffffff], Math.floor(s.a), null, 0.2).map((f) => ({ ...f, nofog: true })));
    for (const g of this.goons) dyn.push(...this.goonFaces(g));
    for (const w of this.warps) { const r = Math.min(1, w.t / 20) * 26, pts = [], inner = []; for (let i = 0; i < 12; i++) { const q = i / 12 * Math.PI * 2 + t * 0.1; pts.push([w.x + Math.cos(q) * r, w.y + Math.sin(q) * r * 0.35, 0]); inner.push([w.x + Math.cos(q) * r * 0.7, w.y + Math.sin(q) * r * 0.25, -1]); } dyn.push({ p: pts, n: null, c: C.crystal[0], nofog: true }, { p: inner, n: null, c: 0x2a1a8a, nofog: true }); }
    for (const c of this.cubes) if (c.t >= this.sp(RAIN.warn)) dyn.push(...xf(boxFaces(-RAIN.s, -RAIN.s, -RAIN.s, RAIN.s, RAIN.s, RAIN.s, c.col, 0xffffff), c.x, c.y, 20, c.a, c.a * 0.6));
    for (const sx of [-1, 1]) dyn.push(...xf(pyramidFaces(0, 0, 0, 16, 16, 30, this.zap && this.zap.on ? 0xffffff : C.crystal[t % 40 < 20 ? 0 : 1]), sx * 238, -96 + Math.sin(t * 0.05 + sx) * 3, 40, t * 0.03), ...xf(pyramidFaces(0, 0, 0, 16, 16, -18, C.crystal[1]), sx * 238, -96 + Math.sin(t * 0.05 + sx) * 3, 40, t * 0.03));
    if (this.cart) {                                                           // the giant cartridge: a gold shell, a purple label with a crowned K, ridges, contacts
      const K = this.cart, f = [];
      f.push(...boxFaces(-46, -56, -10, 46, 50, 10, C.gold, 0xffe070), ...boxFaces(-40, 50, -8, 40, 60, 8, C.goldD, C.goldD));
      f.push(...boxFaces(-34, -48, -10.6, 34, 4, -10, 0xa070f0, 0xb888ff), ...boxFaces(-24, -40, -11, 24, -30, -10.6, C.gold, C.gold));
      for (let i = 0; i < 5; i++) f.push(...pyramidFaces(-16 + i * 8, -30, -11, 6, 1, 8 + (i % 2) * 4, 0xffe070));
      f.push(...boxFaces(-6, -24, -11.2, 6, -6, -10.6, 0xfff060, 0xfff060));
      for (let i = 0; i < 5; i++) f.push(...boxFaces(-34, 14 + i * 6, -10.8, 34, 16 + i * 6, -10, C.goldD, C.goldD));
      for (let i = 0; i < 8; i++) f.push(...boxFaces(-32 + i * 8, 58, -6, -28 + i * 8, 62, 6, 0xe8c050, 0xe8c050));
      dyn.push(...xf(f, K.x, K.y, 8, K.a, K.tilt));
    }
    for (const b of this.bumpers()) {                                          // POLY BUMPERS: spinning gem octahedra with a tilted gold ring
      const c = b.set.flash > 0 ? 0xffffff : C.gem[b.i ? 1 : 0];
      dyn.push(...xf([...pyramidFaces(0, 0, 0, 40, 40, 30, c), ...pyramidFaces(0, 0, 0, 40, 40, -30, C.gem[2])], b.x, b.y, 20, this.t * 0.06, 0, 1 + (b.set.flash > 0 ? 0.3 : 0)));
      dyn.push(...xf(prismFaces(0, -4, 4, 0, BUMP.r + 6, 10, C.gold, 0xffe070), b.x, b.y, 20, this.t * 0.04, 0.35));
    }
    this.R.render(dyn);
    const g = this.fxG; g.clear();
    for (const h of this.hands) if (h.shadow) { g.fillStyle(0x10083a, 0.25 + 0.3 * h.shadow.k); g.fillEllipse(h.shadow.x, 0, 34 + 30 * h.shadow.k, 8); }
    for (const c of this.cubes) if (c.t < this.sp(RAIN.warn) || c.y < -60) { g.fillStyle(0xff2a6a, 0.3 + 0.25 * Math.sin(t * 0.5)); g.fillEllipse(c.x, 0, RAIN.s * 2 + 8, 7); }
    if (this.beam) {
      const H = this.head;
      if (this.beam.on) for (const s of [-1, 1]) { const ex = H.x + s * 17, ey = H.y - 4; g.lineStyle(9, 0xff5a3a, 0.5); g.lineBetween(ex, ey, this.beam.x, -2); g.lineStyle(4, C.eye, 1); g.lineBetween(ex, ey, this.beam.x, -2); g.lineStyle(0); g.fillStyle(0xffffff, 0.9); g.fillCircle(this.beam.x, -3, 10); }
      else for (const s of [-1, 1]) { g.fillStyle(C.eye, 0.4 * this.beam.charge); g.fillCircle(H.x + s * 17, H.y - 4, 4 + 14 * this.beam.charge); }
    }
    if (this.zap) for (const p of this.platforms.slice(1)) {
      const sx = p.x1 < 0 ? -238 : 238;
      if (this.zap.on) { g.lineStyle(2, 0xffffff, 1); let px = sx, py = -96; for (let i = 1; i <= 8; i++) { const nx = sx + (p.x1 < 0 ? 1 : -1) * (i / 8) * 150, ny = p.y - 14 + (Math.random() - 0.5) * 22; g.lineBetween(px, py, nx, ny); px = nx; py = ny; } g.lineStyle(6, C.crystal[0], 0.35); g.lineBetween(sx, -96, sx + (p.x1 < 0 ? 150 : -150), p.y - 14); g.lineStyle(0); }
      else { g.fillStyle(C.crystal[0], 0.2 + 0.4 * this.zap.k); g.fillCircle(sx, -96, 8 + 14 * this.zap.k); }
    }
    if (this.glitch) for (const T of this.glitch.tiles) {                      // GLITCH TILES: missing-texture checker, then burning
      const x1 = -250 + T.i * 50, on = T.t >= GLITCH.warn;
      for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { g.fillStyle((i + j + (on ? Math.floor(t / 4) : 0)) % 2 ? 0xff2aa8 : 0x0a0010, on ? 0.95 : (t % 10 < 5 ? 0.85 : 0.45)); g.fillRect(x1 + i * 8.33, -9 + j * 5, 8.4, 5); }
      if (on) { for (let i = 0; i < 3; i++) { const fx = x1 + 6 + ((t * 3 + i * 17) % 38); g.fillStyle([0xff2aa8, 0xffffff, 0x5af0ff][i], 0.8); g.fillRect(fx, -8 - ((t * 2 + i * 9) % 22), 3, 3); } g.fillStyle(0xff2aa8, 0.18); g.fillRect(x1, -26, 50, 22); }
    }
    if (this.wind) for (let i = 0; i < 16; i++) {                               // the gale: wind lines streaking out both ways
      const sd = i % 2 ? 1 : -1, y = -260 + (i * 37) % 260, x = sd * ((t * 14 + i * 53) % 340), len = 30 + (i % 3) * 20;
      g.lineStyle(2, 0xffffff, 0.5 * this.wind.k); g.lineBetween(x, y, x + sd * len, y); g.lineStyle(0);
    }
    if (this.cart && this.boss && this.boss.atk && this.boss.atk.mark) { g.fillStyle(0xff2a6a, 0.3 + 0.3 * Math.sin(t * 0.5)); g.fillEllipse(this.cart.x, 0, 100, 10); }
    if (this.flashT > 0) { this.flashT--; g.fillStyle(0xffffff, this.flashT / 14); g.fillRect(-700, -700, 1400, 1100); }
    if (this.popMark) { const k = Math.min(1, this.popMark.k); g.fillStyle(0xff2a6a, 0.25 + 0.4 * k * (t % 8 < 4 ? 1 : 0.6)); g.fillEllipse(this.popMark.x, 0, 50 + 40 * k, 10); g.lineStyle(2, 0xffffff, 0.7); g.strokeEllipse(this.popMark.x, 0, 90 - 40 * k, 14); g.lineStyle(0); }
    if (this.shock) { g.fillStyle(0xffffff, 0.7); for (const s2 of [-1, 1]) g.fillTriangle(this.shock.x + s2 * this.shock.r - 14, 0, this.shock.x + s2 * this.shock.r + 14, 0, this.shock.x + s2 * this.shock.r, -20); }
    if (this.ring != null) { g.fillStyle(0xffffff, 0.6); for (const s of [-1, 1]) { g.fillTriangle(s * this.ring - 14, 0, s * this.ring + 14, 0, s * this.ring, -18); } g.lineStyle(2, C.crystal[0], 0.7); g.strokeEllipse(0, 0, this.ring * 2, 14); g.lineStyle(0); }
    if (this.drop > 0 && t % 6 < 2) { g.fillStyle(0xff3a8a, 0.18); g.fillRect(this.head.x - 60, this.head.y - 50 + (t * 7) % 90, 120, 6); }
    if (B) this.drawBar();
  }
}

/** POLYGON PEAK's miniature for the stage select screen. */
export function drawPolygonPeakPreview(g, x, y, w, h) {
  C.sky.forEach((c, i, A) => { g.fillStyle(c, 1); g.fillRect(x, y + i * h / A.length, w, h / A.length + 1); });
  g.fillStyle(0x6a5aa8, 1); g.fillTriangle(x, y + h * 0.75, x + w * 0.25, y + h * 0.35, x + w * 0.5, y + h * 0.75); g.fillTriangle(x + w * 0.45, y + h * 0.75, x + w * 0.75, y + h * 0.3, x + w, y + h * 0.75);
  for (let i = 0; i < 8; i++) { g.fillStyle(i % 2 ? C.tileA : C.tileB, 1); g.fillRect(x + w * (0.14 + i * 0.09), y + h * 0.7, w * 0.09, h * 0.05); }
  g.fillStyle(C.gold, 1); g.fillRect(x + w * 0.14, y + h * 0.75, w * 0.72, h * 0.04);
  g.fillStyle(C.head[0], 1); g.fillCircle(x + w * 0.5, y + h * 0.33, h * 0.14); g.fillStyle(C.gold, 1); g.fillRect(x + w * 0.44, y + h * 0.12, w * 0.12, h * 0.07);
  g.fillStyle(C.eye, 1); g.fillRect(x + w * 0.46, y + h * 0.31, 3, 4); g.fillRect(x + w * 0.52, y + h * 0.31, 3, 4);
  g.fillStyle(C.glove[0], 1); g.fillRect(x + w * 0.25, y + h * 0.48, w * 0.08, h * 0.08); g.fillRect(x + w * 0.67, y + h * 0.48, w * 0.08, h * 0.08);
}

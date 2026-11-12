// THE BURNING KEEP - the arena of KARNAX, THE MAD BLADE (boss III, medieval; Trinkets > BOSS FIGHTS, src/data/bosses.js).
// The battlement walk of a castle keep at night: a blood-red moon, a sky lit orange by the burning town below, black
// mountains, banners on two towers with braziers on top, torches along the wall.
// KARNAX is a horned, grinning, laughing demon three times your height, with a jagged rune greatsword - he fights ON
// the walk with you. He's drawn every frame from a skeleton (`joints()`: hips, torso, head, two arms, two legs, the
// sword in his front hand) posed by keyframes (`POSES`, blended by `aim()`); `drawDemon` paints it: crimson muscle,
// curling ram horns and forehead spikes, a wild black mane, a huge jagged grin, a spiked pauldron, a skull belt,
// a tattered loincloth, and the black blade with glowing red runes (on fire when he's enraged).
//   Weak point: his HEAD (x1.3; x1.7 while he LAUGHS - every few attacks he throws his head back and cackles). His
//   body takes x0.9, his legs x0.75. At half health he goes MAD: red eyes, glowing cracks, a burning sword, faster everything.
//   Attacks: BLADE COMBO (stalks up, then slash - upswing - overhead slam), DEMON LEAP (crouches, leaps onto you, a
//   fire shockwave both ways - jump it), SWORD THROW (hurls the sword spinning out like a boomerang, laughing, and
//   catches it), BEHIND YOU (vanishes in smoke, red eyes glint behind you, then a lunging thrust), HELLFIRE (MAD: stabs
//   the walk and pillars of fire erupt outward).
// Stage hazards (also in VS, where his sword stands planted in the walk): CATAPULT STONE (a boulder lobbed in on a
// marked spot, then rolling) and BRAZIER FLARE (the tower braziers erupt into pillars of fire).
import { HazardCycle } from './hazardCycle.js';
import { BossArena } from './bossBase.js';
import { sfx } from '../audio/sfx.js';

const C = { out: 0x12060a, sky: [0x0a0614, 0x1a0a20, 0x2e0e22, 0x4a1420, 0x7a2018, 0xb83a14, 0xe86a1a], moon: [0xe8b0a0, 0xc88070, 0xa86058],
  stone: [0x1e1a26, 0x2e2834, 0x403848, 0x585060, 0x787080], banner: [0x6a0a12, 0x9a1418, 0xd8a838],
  skin: [0x2a060a, 0x5a1014, 0x8a1c1c, 0xb8302a, 0xe0583a], horn: [0xf0e4c8, 0xc8b898, 0x8a7a60], hair: [0x0a0608, 0x1e1418],
  iron: [0x141218, 0x2a2630, 0x48444e, 0x6a6672], rune: [0xff2a10, 0xff7a2a, 0xffd060], cloth: [0x14080c, 0x2a1418],
  fire: [0xc02008, 0xff5010, 0xff9a20, 0xffe060, 0xfff8d8] };
// his body (px): leg, torso, neck and head sizes, arm lengths, the sword's blade and grip; walking speed (normal / MAD)
const DM = { thigh: 42, shin: 42, torso: 70, neck: 16, head: 30, upper: 40, fore: 38, blade: 126, grip: 22, walk: 2.4, mad: 3.3, range: 240 };
// his poses (angles in radians): lean = torso forward; head = head tilt; u/f = upper arm / forearm from straight down,
// + toward the front (1 = sword arm, 2 = the other); t/s = thigh / shin the same way; sw = the sword from straight up,
// + toward the front. Missing legs = his ready stance.
const LEGS = { t1: 0.32, s1: -0.04, t2: -0.28, s2: -0.38 };
const POSES = {
  idle: { lean: 0.12, head: 0.22, u1: 0.35, f1: 0.95, u2: -0.25, f2: 0.35, sw: 2.25 },
  back: { lean: -0.12, head: 0.1, u1: -1.0, f1: -0.4, u2: 0.7, f2: 1.3, sw: -1.55, t1: 0.45, s1: 0.05, t2: -0.4, s2: -0.55 },
  slash: { lean: 0.38, head: 0.12, u1: 1.65, f1: 1.75, u2: -0.6, f2: -0.2, sw: 1.7, t1: 0.65, s1: 0.1, t2: -0.5, s2: -0.65 },
  up: { lean: -0.15, head: -0.25, u1: 2.9, f1: 3.15, u2: -0.4, f2: 0.25, sw: 0.15 },
  over: { lean: -0.22, head: -0.12, u1: 3.3, f1: 3.95, u2: 0.4, f2: 1.25, sw: -0.95 },
  down: { lean: 0.55, head: 0.3, u1: 1.3, f1: 1.6, u2: 0.2, f2: 0.65, sw: 2.65, t1: 0.8, s1: 0.2, t2: -0.55, s2: -0.85 },
  thrust: { lean: 0.42, head: 0.05, u1: 1.5, f1: 1.55, u2: -0.7, f2: -0.3, sw: 1.57, t1: 0.75, s1: 0.15, t2: -0.6, s2: -0.7 },
  laugh: { lean: -0.32, head: -0.65, u1: 0.45, f1: 0.75, u2: 1.4, f2: 2.3, sw: 2.6 },
  crouch: { lean: 0.45, head: 0.25, u1: 0.45, f1: 0.85, u2: 0.2, f2: 0.5, sw: 2.3, t1: 1.2, s1: -0.3, t2: 0.4, s2: -1.1 },
  air: { lean: 0.05, head: -0.1, u1: 3.05, f1: 3.45, u2: 0.6, f2: 1.6, sw: -0.55, t1: 0.95, s1: 0.1, t2: 0.25, s2: -0.9 },
  throw: { lean: 0.32, head: 0.1, u1: 1.75, f1: 1.6, u2: -0.5, f2: 0.1, sw: 1.6 },
  pose: { lean: 0.04, head: 0.38, u1: 2.75, f1: 3.05, u2: 1.05, f2: 2.55, sw: 0.42, t1: 0.48, s1: 0.0, t2: -0.38, s2: -0.52 },
  kneel: { lean: 0.65, head: 0.6, u1: 0.25, f1: 0.45, u2: 0.1, f2: 0.3, sw: 2.95, t1: 1.45, s1: -0.15, t2: 0.1, s2: -1.5 },
};
// BLADE COMBO: frames he'll stalk before swinging anyway, how close he gets; each swing's hit
const COMBO = { stalk: 80, reach: 105, hits: [[11, [38, 5.6, 0.85]], [10, [82, 5.4, 0.8]], [15, [58, 6.6, 1.0]]] };
// DEMON LEAP: crouch, flight frames, how high; the landing's hit; the fire shockwave (speed, life, hit)
const LEAP = { crouch: 22, flight: 40, high: 210, hit: [13, [70, 6, 0.9]], wave: { speed: 7, life: 38, hit: [8, [62, 5, 0.6]] } };
// SWORD THROW: wind-up, throw speed, its spinning hit
const THROW = { wind: 22, speed: 9.5, r: 46, hit: [10, [40, 5.6, 0.8]] };
// BEHIND YOU: fade, the warning (frames his eyes glint behind you), the lunge, its hit
const BEHIND = { fade: 12, warn: 36, lunge: 9, hit: [13, [35, 6.4, 0.9]] };
// HELLFIRE (MAD): pillars each side, spacing, delay between, warning, burning frames, hit
const HELL = { n: 5, gap: 62, every: 8, warn: 20, burn: 26, hit: [9, [86, 5.2, 0.6]] };
// HE LAUGHS every `every` attacks, for `dur` frames (head x1.7)
const LAUGH = { every: 4, dur: 110 };
// CATAPULT STONE hazard: flight frames, size, hit; BRAZIER FLARE: warning, flare frames, its hit (ticks)
const STONE = { flight: 70, r: 18, hit: [12, [60, 6, 0.8]] };
const FLARE = { warn: 70, on: 70, x: 208, hit: [6, [85, 5, 0.5]] };
// where the sky picture is placed on the background camera
const SKY = { x: 320, y: 255 };

/** A point along the way from a to b (k = 0..1). */
const lerp = (a, b, k) => a + (b - a) * k;

/** THE BURNING KEEP and KARNAX (see the top of the file). */
export class DemonBossStage extends BossArena {
  constructor(scene) {
    super();
    this.scene = scene; this.t = 0; this.hazardsOn = true; this.music = 'bgm_boss_demon';
    this.platforms = [
      { x1: -270, x2: 270, y: 0, solid: true, bottom: 70 },
      { x1: -252, x2: -164, y: -112, solid: false },
      { x1: 164, x2: 252, y: -112, solid: false },
    ];
    this.spawns = [{ x: -150, y: 0 }, { x: -60, y: 0 }, { x: -100, y: 0 }, { x: 150, y: 0 }];
    this.cycle = new HazardCycle(this, ['stone', 'flare'], { color: '#ffb040', stroke: '#2a0606', gap: 700 });
    this.dm = { x: 140, y: 0, dir: -1, p: { ...LEGS, ...POSES.idle }, alpha: 1, sink: 0, held: true, walk: 0 };
    this.count = 0; this.waves = []; this.pillars = []; this.blade = null; this.glint = null; this.introFire = 0;
    this.stone = null; this.flare = null;
    this.sparkColor = 0xff5a2a; this.bodyW = 120; this.bodyH = 170;
  }

  /** Builds the night sky, the burning town far below, the keep's back wall and towers, the walk's front. */
  draw(world, bg) {
    const s = this.scene;
    // (the background camera shows about 0..640 x 0..360: the sky is drawn round 0,0 and placed so its horizon sits behind the keep)
    const sky = s.add.graphics().setScrollFactor(0.12).setPosition(SKY.x, SKY.y); bg.push(sky); this.paintSky(sky);
    const back = s.add.graphics(); world.push(back); this.paintKeep(back);
    this.demonG = s.add.graphics(); world.push(this.demonG);
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

  /** The walk's front (in front of the demon): stone with a lip, arrow slits, the wall dropping away. */
  paintWalk(g) {
    const S = C.stone, P = this.platforms[0];
    g.fillStyle(C.out, 1); g.fillRect(P.x1 - 3, -2, P.x2 - P.x1 + 6, 76);
    g.fillStyle(S[3], 1); g.fillRect(P.x1, 0, P.x2 - P.x1, 6); g.fillStyle(S[4], 1); g.fillRect(P.x1, 0, P.x2 - P.x1, 2);
    for (let y = 6; y < 72; y += 11) for (let x = P.x1 + ((y / 11) % 2) * 10; x < P.x2; x += 20) { g.fillStyle(S[1 + ((x + y) & 1)], 1); g.fillRect(x + 1, y + 1, Math.min(18, P.x2 - x - 1), 9); }
    for (const x of [-180, -60, 60, 180]) { g.fillStyle(C.out, 1); g.fillRect(x - 3, 22, 6, 22); }
    for (const sx of [-1, 1]) { g.fillStyle(C.out, 1); g.fillRect(sx * 208 - 46, -114, 92, 6); g.fillStyle(S[4], 1); g.fillRect(sx * 208 - 44, -113, 88, 2); }
  }

  // ------------------------------------------------------------------ KARNAX
  /** The boss's own state when the fight starts. */
  makeBoss() { this.cycle.gap = 1250; this.cycle.next = 1500; }
  /** His head: what the camera, the death and the CPU aim at. */
  core() { const j = this.joints(); return { x: j.head.x, y: j.head.y }; }
  /** The camera keeps the whole walk and him in view. */
  camPoints() { return this.boss && this.boss.dying < 100 ? [{ x: -250, y: -230 }, { x: 250, y: 0 }] : []; }
  /** Where he can be hit: his head (x1.3, x1.7 while laughing), his body (x0.9) and his legs (x0.75). Nothing while he's vanished. */
  hurt() {
    if (this.dm.alpha < 0.5) return [];
    const j = this.joints(), lg = this.laughing;
    return [{ x1: j.head.x - 30, y1: j.head.y - 34, x2: j.head.x + 30, y2: j.head.y + 28, mult: lg ? 1.7 : 1.3 },
      { x1: Math.min(j.hip.x, j.chest.x) - 38, y1: j.chest.y - 10, x2: Math.max(j.hip.x, j.chest.x) + 38, y2: j.hip.y + 30, mult: 0.9 },
      { x1: Math.min(j.ft1.x, j.ft2.x, j.hip.x) - 14, y1: j.hip.y, x2: Math.max(j.ft1.x, j.ft2.x, j.hip.x) + 14, y2: Math.max(j.ft1.y, j.ft2.y), mult: 0.75 }];
  }

  /**
   * His skeleton in world space from his position, facing and pose: hips (set so his lower foot is on the floor),
   * chest, head, both shoulders / elbows / hands, knees / feet, and the sword (hilt to tip). Returns the points.
   */
  joints() {
    const D = this.dm, p = D.p, d = D.dir, down = (a, l) => ({ x: Math.sin(a) * d * l, y: Math.cos(a) * l });
    const k1 = down(p.t1, DM.thigh), f1 = down(p.s1, DM.shin), k2 = down(p.t2, DM.thigh), f2 = down(p.s2, DM.shin);
    const drop = Math.max(k1.y + f1.y, k2.y + f2.y);
    const hip = { x: D.x, y: D.y + D.sink - drop };
    const chest = { x: hip.x + Math.sin(p.lean) * d * DM.torso, y: hip.y - Math.cos(p.lean) * DM.torso };
    const head = { x: chest.x + Math.sin(p.lean + p.head) * d * (DM.neck + DM.head), y: chest.y - Math.cos(p.lean + p.head) * (DM.neck + DM.head) };
    const s1 = { x: chest.x + d * 14, y: chest.y + 8 }, s2 = { x: chest.x - d * 14, y: chest.y + 6 };
    const add = (a, v) => ({ x: a.x + v.x, y: a.y + v.y });
    const e1 = add(s1, down(p.u1, DM.upper)), h1 = add(e1, down(p.f1, DM.fore)), e2 = add(s2, down(p.u2, DM.upper)), h2 = add(e2, down(p.f2, DM.fore));
    const sv = { x: Math.sin(p.sw) * d, y: -Math.cos(p.sw) };
    const kn1 = add(hip, k1), ft1 = add(kn1, f1), kn2 = add(hip, k2), ft2 = add(kn2, f2);
    return { hip, chest, head, s1, e1, h1, s2, e2, h2, kn1, ft1, kn2, ft2, sv, tip: { x: h1.x + sv.x * DM.blade, y: h1.y + sv.y * DM.blade } };
  }
  /** Moves his pose part of the way (k) toward a named pose (plus his ready legs where it gives none). */
  aim(name, k) { const P = { ...LEGS, ...POSES[name] }, p = this.dm.p; for (const key of Object.keys(P)) p[key] = lerp(p[key] ?? P[key], P[key], k); }
  /** His walk: legs swinging, a little bob, moving toward x at his speed. Returns true once he's there. */
  walkTo(x, sp) {
    const D = this.dm, dx = Phaser.Math.Clamp(x, -DM.range, DM.range) - D.x;
    if (Math.abs(dx) < 6) return true;
    D.dir = Math.sign(dx); D.x += Math.sign(dx) * Math.min(Math.abs(dx), sp); D.walk += sp * 0.07;
    const w = Math.sin(D.walk);
    this.aim('idle', 0.2); D.p.t1 = 0.1 + w * 0.5; D.p.s1 = D.p.t1 - 0.25 - Math.max(0, -w) * 0.5; D.p.t2 = 0.1 - w * 0.5; D.p.s2 = D.p.t2 - 0.25 - Math.max(0, w) * 0.5;
    if (Math.floor(D.walk / Math.PI) !== Math.floor((D.walk - sp * 0.07) / Math.PI)) { sfx('land', 0.35, 0.6); this.match.shake(1.5, 3); }
    return false;
  }
  /** His speed (faster when MAD). */
  speed() { return this.boss && this.boss.phase === 2 ? DM.mad : DM.walk; }
  /** Hitboxes along his blade (hilt to tip) for one swing. */
  swordHits(out, id, [dmg, kb], more = {}) {
    const j = this.joints();
    for (let i = 1; i <= 4; i++) { const q = i / 4, x = j.h1.x + (j.tip.x - j.h1.x) * q, y = j.h1.y + (j.tip.y - j.h1.y) * q; out.push(this.bhit(id + i, x - 18, y - 18, x + 18, y + 18, dmg, kb, { dirX: this.dm.dir, ...more })); }
  }
  /** What he'll do: every few attacks he stops to LAUGH; MAD adds HELLFIRE. */
  pattern(phase) {
    if (this.count % LAUGH.every === LAUGH.every - 1) return ['laugh'];
    return phase === 1 ? ['combo', 'leap', 'throw', 'behind', 'combo'] : ['combo', 'leap', 'throw', 'behind', 'hellfire', 'combo'];
  }
  start_combo() { this.count++; } start_leap() { this.count++; } start_throw() { this.count++; } start_behind() { this.count++; } start_hellfire() { this.count++; } start_laugh() { this.count++; }
  rageLine() { return 'KARNAX HAS GONE MAD!'; }
  /** MAD: a burst of fire round him and a scream of laughter. */
  onRage(match) { const j = this.joints(); for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2; match.particles.push({ x: j.chest.x, y: j.chest.y, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, life: 30, color: C.fire[i % 4 + 1], size: 3, drag: 0.94 }); } sfx('laugh', 1, 0.6); }

  /** At rest: he faces the nearest player, breathes, and stalks closer if they keep away. */
  idle(match) {
    const D = this.dm, tg = this.nearest(match, D.x);
    this.laughing = false;
    if (tg && Math.abs(tg.x - D.x) > 170) this.walkTo(tg.x - Math.sign(tg.x - D.x) * 150, this.speed() * 0.6);
    else { if (tg) D.dir = Math.sign(tg.x - D.x) || D.dir; this.aim('idle', 0.12); D.p.lean = 0.12 + Math.sin(this.t * 0.06) * 0.04; D.p.head = 0.22 + Math.sin(this.t * 0.045) * 0.12; }
  }

  /** BLADE COMBO: he stalks into range, then slash - upswing - overhead slam, stepping in with each. */
  atk_combo(match, a, out) {
    const D = this.dm, tg = this.nearest(match, D.x);
    if (a.s == null) {
      if (!tg || Math.abs(tg.x - D.x) < COMBO.reach || a.t > COMBO.stalk || this.walkTo(tg.x - Math.sign(tg.x - D.x) * 90, this.speed())) { a.s = a.t; if (tg) D.dir = Math.sign(tg.x - D.x) || D.dir; sfx('laugh', 0.5, 1.2); }
      return false;
    }
    const t = a.t - a.s, w = this.sp(16), H = COMBO.hits;
    const step = (n) => { D.x = Phaser.Math.Clamp(D.x + D.dir * n, -DM.range, DM.range); };
    if (t < w) this.aim('back', 0.25);
    else if (t < w + 6) { this.aim('slash', 0.55); step(3); if (t === w) sfx('slash', 0.9, 0.6); this.swordHits(out, 'c1' + a.id, H[0]); }
    else if (t < w + 14) this.aim('slash', 0.2);
    else if (t < w + 20) { this.aim('up', 0.5); step(2); if (t === w + 14) sfx('slash', 0.8, 0.8); this.swordHits(out, 'c2' + a.id, H[1]); }
    else if (t < w + 20 + this.sp(14)) this.aim('over', 0.3);
    else if (t < w + 26 + this.sp(14)) {
      this.aim('down', 0.6); step(4); this.swordHits(out, 'c3' + a.id, H[2]);
      if (t === w + 24 + this.sp(14)) { const j = this.joints(); sfx('bighit', 1, 0.6); match.shake(9, 10); for (let i = 0; i < 14; i++) match.particles.push({ x: j.tip.x, y: -4, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 4, life: 22, color: C.fire[1 + i % 4], size: 3, grav: 0.12 }); }
    } else { this.aim('idle', 0.1); if (t > w + 60 + this.sp(14)) return true; }
    return false;
  }

  /** DEMON LEAP: he crouches, leaps high onto the nearest player, and lands sword-first - a fire wave runs out both ways. */
  atk_leap(match, a, out) {
    const D = this.dm, cr = this.sp(LEAP.crouch);
    if (a.t === 1) { const tg = this.nearest(match, D.x); a.x0 = D.x; a.tx = Phaser.Math.Clamp(tg ? tg.x : 0, -DM.range, DM.range); D.dir = Math.sign(a.tx - D.x) || D.dir; }
    if (a.t < cr) { this.aim('crouch', 0.25); return false; }
    const ft = a.t - cr;
    if (ft === 0) sfx('whoosh', 1, 0.5);
    if (ft < LEAP.flight) {
      const k = ft / LEAP.flight; D.x = lerp(a.x0, a.tx, k); D.y = -Math.sin(k * Math.PI) * LEAP.high; this.aim(k < 0.7 ? 'air' : 'down', k < 0.7 ? 0.2 : 0.4);
      if (k > 0.6) out.push(this.bhit('lp' + a.id, D.x - 40, D.y - 140, D.x + 40, D.y, ...LEAP.hit, { radial: true }));
      a.shadow = true; return false;
    }
    if (ft === LEAP.flight) {
      D.y = 0; a.shadow = false; sfx('bighit', 1, 0.5); match.shake(12, 14);
      for (const s of [-1, 1]) this.waves.push({ x: D.x + s * 30, dir: s, t: 0, id: this.sid('wave') });
    }
    this.aim('down', 0.3);
    return ft > LEAP.flight + 36;
  }
  /** The fire shockwaves: run out along the floor and burn out. */
  stepWaves(match, out) {
    const W = LEAP.wave;
    for (const w of this.waves) { w.t++; w.x += w.dir * W.speed; out.push(this.bhit(w.id, w.x - 14, -30, w.x + 14, 0, ...W.hit, { dirX: w.dir })); if (w.t > W.life || Math.abs(w.x) > 275) w.dead = true; }
    this.waves = this.waves.filter((w) => !w.dead);
  }

  /** SWORD THROW: he hurls his sword spinning out like a boomerang, cackling, and catches it on the way back. */
  atk_throw(match, a, out) {
    const D = this.dm, wind = this.sp(THROW.wind);
    if (a.t === 1) { const tg = this.nearest(match, D.x); if (tg) D.dir = Math.sign(tg.x - D.x) || D.dir; }
    if (a.t < wind) { this.aim('over', 0.25); return false; }
    if (a.t === wind) { const j = this.joints(); this.blade = { x: j.h1.x, y: Math.min(j.h1.y, -40), vx: D.dir * THROW.speed, a: 0, id: this.sid('blade'), back: false }; D.held = false; sfx('whoosh', 1, 0.7); }
    const B = this.blade;
    this.aim(a.t < wind + 20 ? 'throw' : 'laugh', 0.2); this.laughing = a.t > wind + 20;
    if (a.t % 20 === 0 && this.laughing) this.ha(match);
    if (B) {
      B.a += 0.55; B.vx -= D.dir * 0.22; B.x += B.vx;
      if (!B.back && Math.sign(B.vx) !== D.dir) { B.back = true; B.id = this.sid('blade'); }
      const j = this.joints(); if (B.back) B.y += (j.h1.y - B.y) * 0.08;
      out.push(this.bhit(B.id, B.x - THROW.r, B.y - THROW.r * 0.5, B.x + THROW.r, B.y + THROW.r * 0.5, ...THROW.hit, { dirX: Math.sign(B.vx) || 1 }));
      if (a.t % 8 === 0) sfx('whoosh', 0.35, 1.4);
      if (B.back && Math.abs(B.x - j.h1.x) < 26) { this.blade = null; D.held = true; sfx('clang', 0.8, 0.7); a.caught = a.t; }
      if (Math.abs(B.x) > 800) { this.blade = null; D.held = true; a.caught = a.t; }
    }
    this.laughing = this.laughing && !a.caught;
    return a.caught && a.t > a.caught + 16;
  }

  /** BEHIND YOU: he fades into smoke; his eyes glint behind the nearest player; then he lunges out with a thrust. */
  atk_behind(match, a, out) {
    const D = this.dm, fade = BEHIND.fade, warn = this.sp(BEHIND.warn);
    if (a.t <= fade) { D.alpha = 1 - a.t / fade; if (a.t === 1) sfx('smoke', 0.8, 0.6); if (a.t % 2 === 0) this.smoke(match); return false; }
    if (a.t === fade + 1) {
      const tg = this.nearest(match, D.x), face = tg ? (tg.facing || 1) : 1;
      D.x = Phaser.Math.Clamp((tg ? tg.x : 0) - face * 95, -DM.range, DM.range); D.dir = tg ? Math.sign(tg.x - D.x) || 1 : 1; D.y = 0;
      this.aim('back', 1); this.glint = { t: 0 }; sfx('laugh', 0.6, 0.8);
    }
    if (a.t <= fade + warn) { this.glint.t++; return false; }
    if (a.t === fade + warn + 1) { this.glint = null; D.alpha = 1; sfx('slash', 1, 0.5); this.smoke(match); }
    const k = a.t - fade - warn;
    if (k <= BEHIND.lunge) { this.aim('thrust', 0.6); D.x = Phaser.Math.Clamp(D.x + D.dir * 7, -DM.range, DM.range); this.swordHits(out, 'bh' + a.id, BEHIND.hit); return false; }
    this.aim('idle', 0.1);
    return k > BEHIND.lunge + 30;
  }

  /** HELLFIRE (MAD): he stabs his sword into the walk and pillars of fire erupt outward from it, one after another. */
  atk_hellfire(match, a) {
    const D = this.dm;
    if (a.t < this.sp(20)) { this.aim('over', 0.3); return false; }
    if (a.t < this.sp(20) + 8) { this.aim('down', 0.5); return false; }
    if (a.t === this.sp(20) + 8) {
      const j = this.joints(); sfx('bighit', 1, 0.5); sfx('flame', 1, 0.6); match.shake(10, 16);
      for (let k = 1; k <= HELL.n; k++) for (const s of [-1, 1]) { const x = j.tip.x + s * k * HELL.gap; if (Math.abs(x) < 265) this.pillars.push({ x, t: -k * HELL.every, id: this.sid('pil') }); }
    }
    this.aim('down', 0.2);
    return a.t > this.sp(20) + 8 && !this.pillars.length;
  }
  /** The fire pillars: a glowing crack, then a column of fire, then gone. */
  stepPillars(match, out) {
    for (const p of this.pillars) { p.t++; if (p.t > HELL.warn && p.t < HELL.warn + HELL.burn) { out.push(this.bhit(p.id, p.x - 20, -150, p.x + 20, 0, ...HELL.hit)); if (p.t === HELL.warn + 1) sfx('flame', 0.5, 0.9); } }
    this.pillars = this.pillars.filter((p) => p.t < HELL.warn + HELL.burn);
  }

  /** HE LAUGHS: he throws his head back and cackles - his head takes x1.7 the whole time. */
  atk_laugh(match, a) {
    this.laughing = true; this.aim('laugh', 0.2); this.dm.p.head += Math.sin(a.t * 0.9) * 0.08; this.dm.p.lean += Math.sin(a.t * 0.9) * 0.03;
    if (a.t % 18 === 1) this.ha(match);
    if (a.t >= LAUGH.dur) { this.laughing = false; return true; }
    return false;
  }
  /** A HA! floating up from his mouth. */
  ha(match) { const j = this.joints(); match.popText({ x: j.head.x + this.dm.dir * 10 + (Math.random() - 0.5) * 20, y: j.head.y + 60 }, ['HA!', 'HA HA!', 'HAHAHA!', 'HEH HEH!'][Math.floor(Math.random() * 4)], '#ff7a5a'); sfx('laugh', 0.6, 0.7 + Math.random() * 0.3); }
  /** A puff of black smoke round him. */
  smoke(match) { const j = this.joints(); for (let i = 0; i < 6; i++) match.particles.push({ x: j.chest.x + (Math.random() - 0.5) * 50, y: j.chest.y + (Math.random() - 0.5) * 90, vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 1.5, life: 30, color: [0x1a0a10, 0x3a1a20, 0x5a1a1a][i % 3], size: 4, drag: 0.95 }); }
  /** His death: he drops to his knees (the explosions come from BossArena). */
  onDeath() { this.laughing = false; this.blade = null; this.dm.held = true; this.dm.alpha = 1; this.glint = null; }

  /**
   * THE ENTRANCE (k = 0..1): a pillar of fire bursts up in the middle of the walk; he rises out of it laughing,
   * drags his sword up over his head - and swings it into his pose, fire bursting off it.
   */
  introPose(match, k, t, n) {
    this.t++;
    const D = this.dm, e = (a, b) => Phaser.Math.Clamp((k - a) / (b - a), 0, 1);
    D.x = 30; D.dir = -1; D.y = 0;
    this.introFire = e(0, 0.2) * (1 - e(0.6, 0.85));
    if (t === 2) { sfx('flame', 1, 0.5); sfx('rumble', 0.8, 0.7); }
    if (k < 0.6 && t % 6 === 0) match.shake(3, 6);
    const rise = e(0.2, 0.6); D.sink = 190 * (1 - rise * (2 - rise)); D.alpha = Math.min(1, rise * 2);
    if (k < 0.65) { this.aim('laugh', 0.2); this.laughing = true; if (t % 22 === 10 && k > 0.25) this.ha(match); }
    else if (k < 0.82) { this.aim('over', 0.25); this.laughing = false; }
    else this.aim('pose', 0.45);
    if (t === Math.round(0.82 * n)) { sfx('slash', 1, 0.5); sfx('bighit', 0.8, 0.7); match.shake(8, 10); const j = this.joints(); for (let i = 0; i < 24; i++) { const q = i / 24 * Math.PI * 2; match.particles.push({ x: j.tip.x, y: j.tip.y, vx: Math.cos(q) * 4, vy: Math.sin(q) * 4, life: 26, color: C.fire[1 + i % 4], size: 3, drag: 0.93 }); } }
    if (k >= 1) { D.sink = 0; D.alpha = 1; }
  }
  /** The freeze frame looks at his chest (he's tall: the head would put the name band over his body), less zoomed. */
  introAt() { const j = this.joints(); return { x: j.chest.x, y: j.chest.y - 10, zoom: 1.05 }; }
  /** The entrance's camera: close on the fire pillar, tilting up with him as he rises, pulling back for the swing. */
  introShot(k) { return k < 0.3 ? { x: 30, y: -90, zoom: 1.25 } : k < 0.66 ? { x: 30, y: -70 - 110 * (k - 0.3) / 0.36, zoom: 1.2 } : { x: 30, y: -130, zoom: 0.95 }; }
  /** After the intro the fire pillar is gone. */
  endIntro() { super.endIntro(); this.introFire = 0; this.dm.sink = 0; this.dm.alpha = 1; this.laughing = false; }

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
  /** Moves the keep and KARNAX one frame; returns hazard + boss hitboxes. */
  step(match) {
    this.t++;
    const out = [];
    this.cycle.run(match, out);
    if (this.boss) {
      this.bossStep(match, out);
      if (this.boss.dying) { this.aim('kneel', 0.05); this.dm.y = 0; }
      this.stepWaves(match, out); this.stepPillars(match, out);
      if (this.boss.phase === 2 && this.t % 3 === 0 && this.dm.held && !this.boss.dying) { const j = this.joints(), q = Math.random(); match.particles.push({ x: j.h1.x + (j.tip.x - j.h1.x) * q, y: j.h1.y + (j.tip.y - j.h1.y) * q, vx: (Math.random() - 0.5), vy: -1 - Math.random(), life: 18, color: C.fire[1 + Math.floor(Math.random() * 3)], size: 2 }); }
    }
    return out;
  }

  // ------------------------------------------------------------------ drawing
  /** Draws KARNAX (or, in VS, his sword planted in the walk), his thrown sword, waves, pillars, the hazards; the bar. */
  render() {
    const t = this.t, B = this.boss, D = this.dm, g = this.demonG, x = this.fxG;
    g.clear(); x.clear();
    if (this.introFire > 0) this.fire(g, 30, 4, 60 * this.introFire, 300 * this.introFire, t);
    if (B) { if (D.alpha > 0.02) this.drawDemon(g, B.flash > 0); }
    else this.drawSword(g, 0, -150, 0, -150 + DM.blade, false);
    if (this.blade) { const b = this.blade, ca = Math.cos(b.a), sa = Math.sin(b.a); this.drawSword(x, b.x - ca * 70, b.y - sa * 70, b.x + ca * 70, b.y + sa * 70, B && B.phase === 2); x.fillStyle(0xffffff, 0.15); x.fillEllipse(b.x, b.y, THROW.r * 2.4, THROW.r * 0.9); }
    if (this.glint) { const k = Math.min(1, this.glint.t / 10), gx = D.x + D.dir * 10, gy = -160; x.fillStyle(0xff2a10, 0.25 * k); x.fillCircle(gx, gy, 26); for (const s of [-1, 1]) { x.fillStyle(0xff3a1a, k); x.fillTriangle(gx + s * 9 - 6, gy - 3, gx + s * 9 + 6, gy - 5, gx + s * 9, gy + 3); } }
    for (const tx of [-110, 0, 110]) this.fire(x, tx, -46, 5, 12, t + tx);                         // torches
    if (this.flare) for (const s of [-1, 1]) { if (this.flare.on) this.fire(x, s * FLARE.x, -128, 34, 130, t + s * 5); else this.fire(x, s * FLARE.x, -128, 8 + 16 * this.flare.k, 14 + 30 * this.flare.k, t); }
    else for (const s of [-1, 1]) this.fire(x, s * FLARE.x, -128, 9, 16, t + s * 7);
    for (const w of this.waves) this.fire(x, w.x, 0, 16, 34 + Math.sin(t + w.x) * 6, t + w.x);
    for (const p of this.pillars) {
      if (p.t <= 0) continue;
      if (p.t <= HELL.warn) { x.fillStyle(C.rune[0], 0.4 + 0.4 * (p.t % 6 < 3 ? 1 : 0)); x.fillRect(p.x - 18, -3, 36, 4); }
      else this.fire(x, p.x, 2, 24, 150 * Math.min(1, (p.t - HELL.warn) / 6), t + p.x);
    }
    if (this.stone) {
      const S = this.stone;
      if (S.mark != null) { x.fillStyle(0xff3020, 0.35 + 0.25 * Math.sin(t * 0.4)); x.fillEllipse(S.mark, 0, 44, 8); }
      x.fillStyle(C.out, 1); x.fillCircle(S.x, S.y, STONE.r + 2); x.fillStyle(C.stone[3], 1); x.fillCircle(S.x, S.y, STONE.r); x.fillStyle(C.stone[4], 1); x.fillCircle(S.x + Math.cos(S.a) * 6, S.y + Math.sin(S.a) * 6, 5);
    }
    if (B) this.drawBar();
  }

  /** A flickering flame: a teardrop of fire colours, w wide and h tall, its base at (x, y). */
  fire(g, x, y, w, h, t) {
    const f = Math.sin(t * 0.37) * 0.15 + Math.sin(t * 0.91) * 0.1;
    g.fillStyle(C.fire[1], 0.85); g.fillTriangle(x - w, y, x + w, y, x + Math.sin(t * 0.2) * w * 0.3, y - h * (1 + f)); g.fillCircle(x, y - w * 0.4, w);
    g.fillStyle(C.fire[2], 0.95); g.fillTriangle(x - w * 0.65, y, x + w * 0.65, y, x, y - h * 0.75 * (1 - f)); g.fillCircle(x, y - w * 0.3, w * 0.65);
    g.fillStyle(C.fire[3], 1); g.fillTriangle(x - w * 0.3, y, x + w * 0.3, y, x, y - h * 0.45); g.fillStyle(C.fire[0], 0.18); g.fillCircle(x, y - h * 0.4, w + h * 0.4);
  }

  /** His sword from hilt (x1, y1) to tip (x2, y2): a jagged black blade with glowing runes, bone crossguard, skull pommel; burning when on. */
  drawSword(g, x1, y1, x2, y2, burning) {
    const L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L, px = -uy, py = ux;
    const P = (pts, col, a = 1) => { g.fillStyle(col, a); g.fillPoints(pts.map(([s, w]) => ({ x: x1 + ux * s + px * w, y: y1 + uy * s + py * w })), true); };
    const bl = DM.blade;
    P([[-DM.grip, -4], [0, -4], [0, 4], [-DM.grip, 4]], C.out); P([[-DM.grip + 1, -2.5], [-1, -2.5], [-1, 2.5], [-DM.grip + 1, 2.5]], 0x3a1a14);   // the grip
    const edge = [[4, -11], [bl * 0.9, -3], [bl, 0], [bl * 0.9, 4]]; for (let i = 0; i < 9; i++) { const s = bl * 0.85 - i * bl * 0.09; edge.push([s, 9 + (i % 2) * 6], [s - bl * 0.045, 9]); } edge.push([4, 11]);
    P(edge.map(([s, w]) => [s, w * 1.12 + (w > 0 ? 1.5 : -1.5)]), C.out); P(edge, C.iron[1]);
    P([[6, -8], [bl * 0.88, -2], [bl * 0.98, 0], [6, -2]], C.iron[3]);                                         // the edge's shine
    for (let i = 0; i < 6; i++) { const s = 14 + i * bl * 0.12; P([[s, 0], [s + 6, -2], [s + 10, 1], [s + 4, 3]], C.rune[i % 2 ? 1 : 0], 0.95); }   // runes
    P([[-2, -18], [3, -14], [3, 14], [-2, 18], [-6, 10], [-6, -10]], C.horn[1]); P([[-1, -16], [2, -13], [2, 13], [-1, 16]], C.horn[0]);   // the crossguard
    g.fillStyle(C.horn[1], 1); g.fillCircle(x1 - ux * (DM.grip + 4), y1 - uy * (DM.grip + 4), 6); g.fillStyle(C.out, 1); g.fillCircle(x1 - ux * (DM.grip + 4) + px * 2, y1 - uy * (DM.grip + 4) + py * 2, 1.5); g.fillCircle(x1 - ux * (DM.grip + 4) - px * 2, y1 - uy * (DM.grip + 4) - py * 2, 1.5);
    if (burning) for (let i = 0; i < 5; i++) { const s = 20 + i * bl * 0.18; g.fillStyle(C.fire[1 + (i + Math.floor(this.t / 4)) % 3], 0.55); g.fillCircle(x1 + ux * s + px * 10 + (Math.random() - 0.5) * 4, y1 + uy * s + py * 10 - 4, 6 + Math.random() * 4); }
  }

  /**
   * KARNAX, from his skeleton (joints): back arm and leg, his body (muscle, abs, the cracks that glow when he's MAD,
   * a skull belt, a tattered loincloth), front leg, head (wild mane, ram horns, forehead spikes, slanted glowing eyes,
   * a huge jagged grin), the spiked pauldron, front arm with an iron bracer, and the sword in his fist.
   */
  drawDemon(g, flash) {
    const j = this.joints(), D = this.dm, d = D.dir, mad = this.boss && this.boss.phase === 2, A = D.alpha;
    const sk = flash ? [0xffffff, 0xffe0d8, 0xffffff, 0xffffff, 0xffffff] : C.skin;
    const limb = (a, b, wa, wb, cols) => {
      const L = Math.hypot(b.x - a.x, b.y - a.y) || 1, nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L;
      const q = (w1, w2) => [{ x: a.x + nx * w1, y: a.y + ny * w1 }, { x: b.x + nx * w2, y: b.y + ny * w2 }, { x: b.x - nx * w2, y: b.y - ny * w2 }, { x: a.x - nx * w1, y: a.y - ny * w1 }];
      g.fillStyle(C.out, A); g.fillPoints(q(wa + 2.5, wb + 2.5), true); g.fillStyle(cols[0], A); g.fillPoints(q(wa, wb), true);
      g.fillStyle(cols[1], A); g.fillPoints([{ x: a.x + nx * wa * 0.2, y: a.y + ny * wa * 0.2 }, { x: b.x + nx * wb * 0.2, y: b.y + ny * wb * 0.2 }, { x: b.x + nx * wb * 0.8, y: b.y + ny * wb * 0.8 }, { x: a.x + nx * wa * 0.8, y: a.y + ny * wa * 0.8 }], true);
      g.fillStyle(C.out, A); g.fillCircle(b.x, b.y, wb + 2); g.fillStyle(cols[0], A); g.fillCircle(b.x, b.y, wb);
    };
    const back = [sk[1], sk[2]], front = [sk[2], sk[3]];
    // back arm and leg (darker), then the body
    limb(j.s2, j.e2, 15, 12, back); limb(j.e2, j.h2, 12, 10, back); g.fillStyle(sk[1], A); g.fillCircle(j.h2.x, j.h2.y, 12);
    limb(j.hip, j.kn2, 17, 13, back); limb(j.kn2, j.ft2, 13, 10, back); g.fillStyle(C.out, A); g.fillEllipse(j.ft2.x + d * 7, j.ft2.y - 3, 34, 11);
    const ht = { x: (j.hip.x + j.chest.x) / 2, y: (j.hip.y + j.chest.y) / 2 };
    const L2 = Math.hypot(j.chest.x - j.hip.x, j.chest.y - j.hip.y), nx = -(j.chest.y - j.hip.y) / L2, ny = (j.chest.x - j.hip.x) / L2;
    const tor = (w1, w2, e = 0) => [{ x: j.hip.x + nx * w1, y: j.hip.y + ny * w1 + e }, { x: j.chest.x + nx * w2, y: j.chest.y + ny * w2 - e }, { x: j.chest.x - nx * w2, y: j.chest.y - ny * w2 - e }, { x: j.hip.x - nx * w1, y: j.hip.y - ny * w1 + e }];
    g.fillStyle(C.out, A); g.fillPoints(tor(31, 50, 3), true); g.fillStyle(sk[2], A); g.fillPoints(tor(28, 47), true);
    g.fillStyle(sk[3], A); g.fillPoints(tor(14 * d, 32 * d).slice(0, 2).concat([{ x: ht.x + nx * 2 * d, y: ht.y + ny * 2 * d }]), true);
    const pec = { x: j.chest.x + (j.hip.x - j.chest.x) * 0.2, y: j.chest.y + (j.hip.y - j.chest.y) * 0.2 };   // muscle: chest and belly lit, the far side in shadow
    g.fillStyle(sk[1], A); g.fillPoints(tor(-28 * d, -47 * d).slice(0, 2).concat([{ x: ht.x - nx * 12 * d, y: ht.y - ny * 12 * d }]), true);
    g.fillStyle(sk[3], A); g.fillEllipse(pec.x + d * 10, pec.y + 6, 44, 22); g.fillStyle(sk[4], A); g.fillEllipse(pec.x + d * 14, pec.y + 2, 20, 8);
    g.fillStyle(sk[3], A * 0.8); g.fillEllipse(ht.x + d * 6, ht.y + 6, 26, 36);
    g.lineStyle(2, sk[0], A); for (let i = 1; i < 4; i++) { const q = i / 4, cx = j.hip.x + (j.chest.x - j.hip.x) * q * 0.7, cy = j.hip.y + (j.chest.y - j.hip.y) * q * 0.7; g.lineBetween(cx - nx * 14, cy - ny * 14, cx + nx * 14, cy + ny * 14); }   // abs
    g.lineBetween(j.chest.x + nx * 2, j.chest.y + 14, j.chest.x + nx * 36, j.chest.y + 6); g.lineBetween(j.chest.x - nx * 2, j.chest.y + 14, j.chest.x - nx * 36, j.chest.y + 6);
    if (mad) { g.lineStyle(2, C.rune[1], A); g.lineBetween(ht.x - 8, ht.y - 12, ht.x + 4, ht.y + 2); g.lineBetween(ht.x + 4, ht.y + 2, ht.x - 2, ht.y + 16); g.lineBetween(j.chest.x + 10, j.chest.y + 6, j.chest.x - 4, j.chest.y + 20); }
    g.lineStyle(0);
    g.fillStyle(C.iron[0], A); g.fillPoints(tor(32, 32, 0).map((p, i) => (i === 1 || i === 2 ? { x: j.hip.x + (p.x - j.hip.x) * 0.25 + (j.chest.x - j.hip.x) * 0.16, y: j.hip.y + (p.y - j.hip.y) * 0.25 + (j.chest.y - j.hip.y) * 0.16 } : p)), true);   // the belt
    g.fillStyle(C.horn[0], A); g.fillCircle(j.hip.x + d * 4, j.hip.y - 4, 7); g.fillStyle(C.out, A); g.fillCircle(j.hip.x + d * 2, j.hip.y - 5, 1.8); g.fillCircle(j.hip.x + d * 6, j.hip.y - 5, 1.8);
    for (let i = -2; i <= 2; i++) { g.fillStyle(C.cloth[i % 2 ? 0 : 1], A); g.fillTriangle(j.hip.x + i * 12 - 8, j.hip.y + 2, j.hip.x + i * 12 + 8, j.hip.y + 2, j.hip.x + i * 12 + Math.sin(this.t * 0.1 + i) * 3, j.hip.y + 34 + (i % 2) * 8); }
    // the front leg
    limb(j.hip, j.kn1, 18, 14, front); limb(j.kn1, j.ft1, 14, 11, front); g.fillStyle(C.out, A); g.fillEllipse(j.ft1.x + d * 7, j.ft1.y - 3, 36, 12); g.fillStyle(sk[1], A); g.fillEllipse(j.ft1.x + d * 7, j.ft1.y - 4, 31, 8);
    for (let c = 0; c < 3; c++) { g.fillStyle(C.horn[0], A); g.fillTriangle(j.ft1.x + d * (14 + c * 3), j.ft1.y - 4, j.ft1.x + d * (20 + c * 3), j.ft1.y, j.ft1.x + d * (14 + c * 3), j.ft1.y); }
    // the head
    const h = j.head, tilt = D.p.lean + D.p.head;
    const HK = 1.45, H = (lx, ly) => { lx *= HK; ly *= HK; const c = Math.cos(tilt), s = Math.sin(tilt); return { x: h.x + (lx * c - ly * s) * d, y: h.y + lx * s + ly * c }; };
    const HP = (pts, col) => { g.fillStyle(col, A); g.fillPoints(pts.map(([x, y]) => H(x, y)), true); };
    for (let i = 0; i < 7; i++) { const q = -2.6 + i * 0.32; HP([[Math.cos(q) * 12 - 8, Math.sin(q) * 12 - 4], [Math.cos(q) * 34 - 14, Math.sin(q) * 30 + 2], [Math.cos(q + 0.3) * 12 - 8, Math.sin(q + 0.3) * 12 - 4]], C.hair[i % 2]); }   // the wild mane
    for (const side of [-1, 1]) {                                                                                  // ram horns curling back
      const pts = []; for (let i = 0; i <= 12; i++) { const q = i / 12, ang = -1.2 - q * 3.6, r = 12 + q * 14; pts.push(H(-6 + Math.cos(ang) * r * 0.9 - q * 10, -14 + Math.sin(ang) * r * 0.8 + side * 2)); }
      pts.forEach((p, i) => { const r = (6.5 - i * 0.42) * HK; g.fillStyle(C.out, A); g.fillCircle(p.x, p.y, r + 1.8); });
      pts.forEach((p, i) => { const r = (6.5 - i * 0.42) * HK; g.fillStyle(C.horn[i % 2], A); g.fillCircle(p.x, p.y, r); });
    }
    HP([[-17, -6], [-12, -19], [2, -22], [15, -16], [21, -4], [20, 10], [10, 18], [-6, 17], [-16, 8]], C.out);
    HP([[-15, -6], [-11, -17], [2, -20], [14, -14], [19, -4], [18, 9], [9, 16], [-5, 15], [-14, 7]], sk[2]);
    HP([[-6, -18], [2, -19], [13, -13], [4, -12], [-6, -12]], sk[3]);
    for (const sx of [2, 10]) HP([[sx - 3, -16], [sx + 5, -36 - (sx === 10 ? 4 : 0)], [sx + 4, -16]], C.horn[sx === 10 ? 0 : 1]);   // forehead spikes
    const lg = this.laughing, eye = mad || lg ? C.rune[0] : C.rune[2];
    HP([[2, -6], [17, -10], [16, -4], [4, -3]], C.out);                                                           // the brow
    HP([[4, -5], [15, -8], [14, -3], [6, -2]], eye); HP([[11, -7], [13, -7], [13, -3], [11, -3]], C.out);          // the eye (slanted, mad)
    if (A > 0.5) { const e = H(10, -5); g.fillStyle(eye, 0.25); g.fillCircle(e.x, e.y, 13); }
    const open = lg ? 8 : 3;                                                                                       // the grin: wide, jagged, ear to ear
    HP([[-6, 4], [20, 1], [22, 4], [18, 8 + open], [4, 11 + open], [-4, 9]], C.out);
    for (let i = 0; i < 6; i++) { const x = -3 + i * 4; HP([[x, 4.5 - i * 0.4], [x + 3.4, 4 - i * 0.4], [x + 1.7, 8 - i * 0.4]], 0xffffff); HP([[x, 9 + open - i * 0.3], [x + 3.4, 9 + open - i * 0.4], [x + 1.7, 5.5 + open - i * 0.3]], 0xffffff); }
    // the spiked pauldron, then the front (sword) arm with an iron bracer, the sword in his fist
    const pa = j.s1;
    g.fillStyle(C.out, A); g.fillCircle(pa.x, pa.y, 21); g.fillStyle(C.iron[2], A); g.fillCircle(pa.x, pa.y, 19); g.fillStyle(C.iron[3], A); g.fillCircle(pa.x - 4, pa.y - 5, 9);
    for (let i = 0; i < 3; i++) { const q = -2.4 + i * 0.7; g.fillStyle(C.horn[1], A); g.fillTriangle(pa.x + Math.cos(q - 0.2) * 18, pa.y + Math.sin(q - 0.2) * 18, pa.x + Math.cos(q + 0.2) * 18, pa.y + Math.sin(q + 0.2) * 18, pa.x + Math.cos(q) * 36, pa.y + Math.sin(q) * 36); }
    limb(j.s1, j.e1, 16, 13, front); limb(j.e1, j.h1, 13, 11, front);
    const bm = { x: (j.e1.x + j.h1.x * 2) / 3, y: (j.e1.y + j.h1.y * 2) / 3 }; g.fillStyle(C.iron[1], A); g.fillCircle(bm.x, bm.y, 14); g.fillStyle(C.iron[3], A); g.fillCircle(bm.x - 3, bm.y - 4, 5);
    if (D.held) this.drawSword(g, j.h1.x, j.h1.y, j.tip.x, j.tip.y, mad);
    g.fillStyle(C.out, A); g.fillCircle(j.h1.x, j.h1.y, 14); g.fillStyle(sk[2], A); g.fillCircle(j.h1.x, j.h1.y, 12);
  }
}

/** THE BURNING KEEP's miniature for the stage select screen. */
export function drawBurningKeepPreview(g, x, y, w, h) {
  C.sky.forEach((c, i, A) => { g.fillStyle(c, 1); g.fillRect(x, y + i * h / A.length, w, h / A.length + 1); });
  g.fillStyle(C.moon[1], 1); g.fillCircle(x + w * 0.2, y + h * 0.22, h * 0.11);
  g.fillStyle(C.stone[2], 1); g.fillRect(x + w * 0.08, y + h * 0.66, w * 0.84, h * 0.2); g.fillRect(x + w * 0.06, y + h * 0.46, w * 0.14, h * 0.4); g.fillRect(x + w * 0.8, y + h * 0.46, w * 0.14, h * 0.4);
  g.fillStyle(C.banner[1], 1); g.fillRect(x + w * 0.1, y + h * 0.54, w * 0.06, h * 0.12); g.fillRect(x + w * 0.84, y + h * 0.54, w * 0.06, h * 0.12);
  const cx = x + w * 0.56, fy = y + h * 0.66;
  g.fillStyle(C.skin[2], 1); g.fillRect(cx - w * 0.05, fy - h * 0.42, w * 0.1, h * 0.3); g.fillRect(cx - w * 0.04, fy - h * 0.12, w * 0.03, h * 0.12); g.fillRect(cx + w * 0.01, fy - h * 0.12, w * 0.03, h * 0.12);
  g.fillCircle(cx, fy - h * 0.48, h * 0.07); g.fillStyle(C.horn[0], 1); g.fillTriangle(cx - 4, fy - h * 0.53, cx - 10, fy - h * 0.66, cx - 1, fy - h * 0.55); g.fillTriangle(cx + 4, fy - h * 0.53, cx + 10, fy - h * 0.66, cx + 1, fy - h * 0.55);
  g.fillStyle(C.rune[2], 1); g.fillRect(cx - 4, fy - h * 0.49, 2, 2); g.fillRect(cx + 2, fy - h * 0.49, 2, 2);
  g.fillStyle(C.iron[2], 1); g.fillTriangle(cx + w * 0.05, fy - h * 0.36, cx + w * 0.07, fy - h * 0.38, cx + w * 0.26, fy - h * 0.8); g.fillStyle(C.rune[0], 1); g.fillRect(cx + w * 0.12, fy - h * 0.55, 2, 2);
}

// THE BURNING KEEP - the arena of KARNAX, THE MAD BLADE (boss III, medieval; Trinkets > BOSS FIGHTS, src/data/bosses.js).
// The battlement walk of a castle keep at night: a blood-red moon, a sky lit orange by the burning town below, black
// mountains, banners on two towers with braziers on top, torches along the wall.
// KARNAX is a horned, grinning, laughing demon three times your height, with a jagged rune greatsword - he fights ON
// the walk with you, and climbs, kicks and cracks the keep itself. He's drawn every frame from a skeleton (`joints()`:
// hips, torso, head, two arms, two legs, the sword in his front hand) posed by keyframes (`POSES`, blended by `aim()`);
// `drawDemon` paints it: cracked obsidian skin with molten veins and a burning heart behind his ribs, tattered bat wings,
// a barbed tail, goat legs on cloven hooves, a wild white mane, long horns sweeping forward, a gaunt grinning face,
// shackles with broken chains on his wrists, clawed fists, and the black blade with glowing red runes.
//   Weak point: his HEAD (x1.3; x1.7 while he LAUGHS - every few attacks he throws his head back and cackles). His
//   body takes x0.9, his legs x0.75. At half health he goes MAD: red eyes, glowing cracks, a burning sword, faster everything.
//   Attacks: BLADE COMBO (stalks up, then slash - upswing - overhead slam), DEMON LEAP (crouches, leaps onto you, a
//   fire shockwave both ways - jump it), SWORD THROW (hurls the sword spinning out like a boomerang, laughing, and
//   catches it), BEHIND YOU (vanishes in smoke, red eyes glint behind you, then a lunging thrust), HELLFIRE (MAD: stabs
//   the walk and pillars of fire erupt outward), HOOF STOMP and TAIL SWEEP (if you stand at his feet, he stamps the
//   walk - a burst of fire round his hooves - or whips his barbed tail low along the floor), THE TOWER (he leaps onto a
//   tower, kicks its burning brazier down onto the walk - spilled fire - and dives off it sword-first onto you), BLADE STORM (he hurls the sword into the sky, it splits into a storm of
//   ghost blades that rain down point-first and stick in the walk - then he clenches his fist and every blade rips free
//   and flies back to his hand in a straight line, through anyone in the way).
// Stage hazards (also in VS, where his sword stands planted in the walk): CATAPULT STONE (a boulder lobbed in on a
// marked spot, then rolling) and BRAZIER FLARE (the tower braziers erupt into pillars of fire).
import { HazardCycle } from './hazardCycle.js';
import { BossArena } from './bossBase.js';
import { sfx } from '../audio/sfx.js';

const C = { out: 0x12060a, sky: [0x0a0614, 0x1a0a20, 0x2e0e22, 0x4a1420, 0x7a2018, 0xb83a14, 0xe86a1a], moon: [0xe8b0a0, 0xc88070, 0xa86058],
  stone: [0x1e1a26, 0x2e2834, 0x403848, 0x585060, 0x787080], banner: [0x6a0a12, 0x9a1418, 0xd8a838],
  skin: [0x1e0e14, 0x3e1e26, 0x5e2e34, 0x844440, 0xb06650], wing: [0x3a0a10, 0x5e1218, 0x8a2a24], horn: [0xf0e4c8, 0xc8b898, 0x8a7a60], hair: [0x0a0608, 0x1e1418],
  iron: [0x141218, 0x2a2630, 0x48444e, 0x6a6672], rune: [0xff2a10, 0xff7a2a, 0xffd060], cloth: [0x14080c, 0x2a1418],
  fire: [0xc02008, 0xff5010, 0xff9a20, 0xffe060, 0xfff8d8] };
// his body (px): leg, torso, neck and head sizes, arm lengths, the sword's blade and grip; walking speed (normal / MAD)
// HIS DEATH (TO ASH): when he plants the sword, when he laughs, when he starts to crumble, the whole length
const ASH = { plant: 48, laugh: 96, crumble: 170, len: 320 };
const DM = { thigh: 42, shin: 46, torso: 70, neck: 16, head: 30, upper: 40, fore: 38, blade: 126, grip: 22, walk: 2.4, mad: 3.3, range: 240 };
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
  pose: { lean: 0.02, head: 0.05, u1: 0.8, f1: 2.55, u2: 1.25, f2: 2.1, sw: -0.7, t1: 0.48, s1: 0.0, t2: -0.38, s2: -0.52 },
  stomp: { lean: -0.1, head: 0.1, u1: 0.9, f1: 1.6, u2: -0.6, f2: 0.2, sw: 2.1, t1: 1.5, s1: 0.5, t2: -0.15, s2: -0.3 },
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
// BLADE STORM: wind-up, the throw up, blades (normal / MAD), frames between them landing, the marks' warning, fall speed,
// how long they stay stuck, the recall (frames), the falling and returning hits
const STORM = { wind: 22, up: 26, n: [5, 7], every: 7, warn: 30, fall: 18, stuck: 46, recall: 20, hit: [10, [80, 5.4, 0.7]], back: [9, [40, 5.6, 0.75]] };
// HOOF STOMP: wind-up, reach round his hooves, hit; TAIL SWEEP: wind-up, sweep frames, hit
const STOMP = { wind: 16, r: 74, hit: [10, [72, 5.6, 0.75]] };
const TAIL = { wind: 16, sweep: 16, hit: [9, [28, 5.8, 0.7]] };
// who counts as "at his feet": closer than this (x) and lower than `below` (y); frames standing there before he reacts
const FEET = { x: 82, below: -70, react: 40 };
// THE TOWER: the leap up (frames, height), the laugh on top, the kick, the dive, its hit; the spilled fire (length,
// frames, hit) and how long the brazier stays out; the burning cracks his overhead slam leaves (frames, width, hit)
const TOWER = { leap: 34, high: 150, gloat: 30, kick: 16, dive: 22, top: -112, x: 208, hit: [15, [70, 6.6, 1.0]] };
const SPILL = { len: 150, life: 240, out: 1100, hit: [5, [80, 4.6, 0.4]] };
const CRACK = { life: 110, w: 26, hit: [4, [82, 4.4, 0.35]] };
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
    this.cracks = []; this.out = { '-1': 0, 1: 0 }; this.braz = null; this.spill = null; this.lying = null; this.tail = null; this.close = 0;
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
  /** The camera keeps the whole walk and him in view (up on a tower too). */
  camPoints() { if (!this.boss) return []; if (this.boss.dying) return [{ x: -250, y: -230 }, { x: 250, y: 0 }]; const p = [{ x: -250, y: -230 }, { x: 250, y: 0 }]; if (this.dm.y < -20) p.push({ x: this.dm.x, y: this.dm.y - 250 }); return p; }
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
    if (this.atFeet()) return ['stomp', 'tail'];
    if (this.count % LAUGH.every === LAUGH.every - 1) return ['laugh'];
    return phase === 1 ? ['combo', 'leap', 'throw', 'behind', 'combo', 'storm', 'tower'] : ['combo', 'leap', 'throw', 'behind', 'hellfire', 'combo', 'storm', 'tower'];
  }
  start_storm() { this.count++; } start_tower() { this.count++; } start_stomp() { this.close = 0; } start_tail() { this.close = 0; }
  /** Whether anyone is standing at his feet (close in x, low down) - where his sword can't reach. */
  atFeet() { const D = this.dm; return D.y === 0 && this.match && this.match.fighters.some((f) => f.alive && Math.abs(f.x - D.x) < FEET.x && f.y > FEET.below); }
  start_combo() { this.count++; } start_leap() { this.count++; } start_throw() { this.count++; } start_behind() { this.count++; } start_hellfire() { this.count++; } start_laugh() { this.count++; }
  /** The drawing layers that make up the boss itself, for its death card's portrait (MatchScene.paintBossCard). */
  cardObjs() { return [this.demonG]; }
  rageLine() { return 'KARNAX HAS GONE MAD!'; }
  /** MAD: a burst of fire round him and a scream of laughter. */
  onRage(match) { const j = this.joints(); for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2; match.particles.push({ x: j.chest.x, y: j.chest.y, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, life: 30, color: C.fire[i % 4 + 1], size: 3, drag: 0.94 }); } sfx('laugh', 1, 0.6); }

  /** At rest: he faces the nearest player, breathes, and stalks closer if they keep away. */
  idle(match) {
    const D = this.dm, tg = this.nearest(match, D.x);
    this.close = this.atFeet() ? (this.close || 0) + 1 : 0;
    if (this.close > FEET.react) this.boss.wait = Math.min(this.boss.wait, 2);       // camping at his feet? he reacts
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
      if (t === w + 24 + this.sp(14)) { const j = this.joints(); sfx('bighit', 1, 0.6); match.shake(9, 10); if (Math.abs(j.tip.x) < 255) this.cracks.push({ x: j.tip.x, t: 0, id: this.sid('crack') }); for (let i = 0; i < 14; i++) match.particles.push({ x: j.tip.x, y: -4, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 4, life: 22, color: C.fire[1 + i % 4], size: 3, grav: 0.12 }); }
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

  /**
   * BLADE STORM: he winds up and hurls his sword straight up into the sky - it splits into a storm of ghost blades
   * (one on each player, the rest spread across the walk), each falling point-first onto its glowing mark and
   * sticking in the stone. He laughs, then clenches his fist: every blade rips free and flies straight back to his
   * hand - hilt first, cutting through anyone between - and they merge into his sword again.
   */
  atk_storm(match, a, out) {
    const D = this.dm, wind = this.sp(STORM.wind), up = wind + STORM.up, n = STORM.n[this.boss.phase - 1], every = this.sp(STORM.every), warn = this.sp(STORM.warn);
    if (a.t === 1) { const tg = this.nearest(match, D.x); if (tg) D.dir = Math.sign(tg.x - D.x) || D.dir; }
    if (a.t < wind) { this.aim('crouch', 0.2); return false; }
    if (a.t === wind) { const j = this.joints(); this.toss = { x: j.h1.x, y: j.h1.y }; D.held = false; sfx('whoosh', 1, 0.6); }
    if (a.t < up) { this.aim('up', 0.3); this.toss.y -= 22; return false; }
    if (a.t === up) {                                                              // it splits into the storm
      this.toss = null; sfx('shing', 1, 0.6); sfx('laugh', 0.6, 0.9); match.shake(3, 10);
      const xs = match.fighters.filter((f) => f.alive).map((f) => Phaser.Math.Clamp(f.x, -250, 250));
      while (xs.length < n) xs.push((Math.random() - 0.5) * 500);
      this.storm = xs.slice(0, n).sort(() => Math.random() - 0.5).map((x, i) => ({ x, y: -520, t: -i * every, st: 'mark', id: this.sid('storm'), tilt: (Math.random() - 0.5) * 0.25 }));
    }
    const S = this.storm || [];
    this.aim(a.recall ? 'thrust' : 'laugh', 0.15); this.laughing = !a.recall;
    if (!a.recall && a.t % 24 === 0) this.ha(match);
    for (const b of S) {
      b.t++;
      if (b.st === 'mark' && b.t >= warn) { b.st = 'fall'; sfx('whoosh', 0.4, 1.5); }
      if (b.st === 'fall') {
        b.y += STORM.fall;
        out.push(this.bhit(b.id, b.x - 14, b.y - 60, b.x + 14, b.y, ...STORM.hit));
        if (b.y >= 6) { b.y = 6; b.st = 'stuck'; b.t = 0; sfx('clang', 0.7, 0.8 + Math.random() * 0.3); match.shake(3, 4); for (let i = 0; i < 6; i++) match.particles.push({ x: b.x, y: -3, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3, life: 16, color: i % 2 ? C.fire[2] : 0x8a7a7a, size: 2 }); }
      }
    }
    if (!a.recall && S.length && S.every((b) => b.st === 'stuck') && Math.min(...S.map((b) => b.t)) >= this.sp(STORM.stuck)) {
      a.recall = a.t; this.laughing = false; sfx('slash', 1, 0.4); match.popText({ x: D.x, y: -230 }, 'COME BACK!', '#ff7a5a');
      for (const b of S) { b.st = 'back'; b.x0 = b.x; b.y0 = b.y; b.id = this.sid('stormb'); }
    }
    if (a.recall) {
      const j = this.joints(), u = Math.min(1, (a.t - a.recall) / STORM.recall), e = u * u;
      for (const b of S) {
        b.x = b.x0 + (j.h1.x - b.x0) * e; b.y = b.y0 + (j.h1.y + 60 - b.y0) * e;
        out.push(this.bhit(b.id, b.x - 20, b.y - 70, b.x + 20, b.y, ...STORM.back, { dirX: Math.sign(j.h1.x - b.x0) || 1 }));
      }
      if (a.t - a.recall === 2) sfx('whoosh', 1, 0.8);
      if (u >= 1) { this.storm = null; D.held = true; sfx('clang', 1, 0.6); match.shake(6, 8); return a.t > a.recall + STORM.recall + 20; }
    }
    return false;
  }

  /** HOOF STOMP: he lifts a goat leg high and stamps the walk - a burst of fire round his hooves and two short flame waves. */
  atk_stomp(match, a, out) {
    const D = this.dm, w = this.sp(STOMP.wind);
    if (a.t === 1) { const tg = this.nearest(match, D.x); if (tg) D.dir = Math.sign(tg.x - D.x) || D.dir; sfx('laugh', 0.4, 1.4); }
    if (a.t < w) { this.aim('stomp', 0.3); return false; }
    if (a.t < w + 5) { this.aim('idle', 0.6); return false; }
    if (a.t < w + 9) {
      out.push(this.bhit('stomp' + a.id, D.x - STOMP.r, -46, D.x + STOMP.r, 2, ...STOMP.hit, { radial: true }));
      if (a.t === w + 5) {
        sfx('bighit', 1, 0.5); sfx('flame', 0.7, 0.9); match.shake(10, 10);
        for (const sd of [-1, 1]) this.waves.push({ x: D.x + sd * 40, dir: sd, t: 18, id: this.sid('swave') });
        for (let i = 0; i < 18; i++) match.particles.push({ x: D.x + (Math.random() - 0.5) * 100, y: -3, vx: (Math.random() - 0.5) * 5, vy: -1 - Math.random() * 4, life: 22, color: C.fire[1 + i % 4], size: 3, grav: 0.1 });
      }
      return false;
    }
    this.aim('idle', 0.1);
    return a.t > w + 30;
  }
  /** TAIL SWEEP: he twists and whips his barbed tail low along the walk, round past his hooves and out in front. */
  atk_tail(match, a, out) {
    const D = this.dm, w = this.sp(TAIL.wind);
    if (a.t === 1) { const tg = this.nearest(match, D.x); if (tg) D.dir = Math.sign(tg.x - D.x) || D.dir; this.tail = { k: 0, s: -D.dir, low: 0 }; sfx('whoosh', 0.6, 0.6); }
    const T = this.tail;
    this.aim('crouch', 0.2);
    if (a.t < w) { T.low = Math.min(1, a.t / w); return false; }
    if (a.t < w + TAIL.sweep) {
      T.low = 1; T.k = (a.t - w + 1) / TAIL.sweep; T.s = -D.dir * -1; T.hot = this.boss.phase === 2;
      if (a.t === w) sfx('whoosh', 1, 0.8);
      const tp = this.tailPts();
      for (let i = 4; i < tp.length; i += 2) out.push(this.bhit('tail' + a.id, tp[i].x - 16, tp[i].y - 20, tp[i].x + 16, tp[i].y + 6, ...TAIL.hit, { dirX: Math.sign(T.s) || 1 }));
      if (a.t % 3 === 0) { const e = tp[tp.length - 1]; match.particles.push({ x: e.x, y: -3, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2, life: 14, color: 0x8a7a7a, size: 2 }); }
      return false;
    }
    T.low = Math.max(0, T.low - 0.08); this.aim('idle', 0.1);
    if (T.low <= 0) { this.tail = null; return a.t > w + TAIL.sweep + 10; }
    return false;
  }
  /**
   * THE TOWER: he leaps up onto the nearer tower and crouches there grinning; kicks its burning brazier down onto the
   * walk (it crashes and spills a pool of fire along the stone, and that brazier stays out for a while); then dives off
   * the tower sword-first onto the nearest player - a big hit and fire waves both ways.
   */
  atk_tower(match, a, out) {
    const D = this.dm, up = TOWER.leap, gl = up + this.sp(TOWER.gloat), kk = gl + TOWER.kick, dv = kk + this.sp(12), land = dv + TOWER.dive;
    if (a.t === 1) { a.s = D.x < 0 ? -1 : 1; if (this.out[a.s] > 0) a.s = -a.s; a.x0 = D.x; a.tx = a.s * TOWER.x; D.dir = Math.sign(a.tx - D.x) || D.dir; sfx('laugh', 0.6, 1.0); }
    if (a.t < 10) { this.aim('crouch', 0.3); return false; }
    if (a.t < 10 + up) {                                                         // the leap up
      const k = (a.t - 10) / up; D.x = lerp(a.x0, a.tx, k); D.y = lerp(0, TOWER.top, k) - Math.sin(k * Math.PI) * TOWER.high; this.aim('air', 0.25);
      if (a.t === 10) sfx('whoosh', 1, 0.5);
      return false;
    }
    if (a.t === 10 + up) { D.x = a.tx; D.y = TOWER.top; D.dir = -a.s; sfx('bighit', 0.8, 0.7); match.shake(6, 8); for (let i = 0; i < 10; i++) match.particles.push({ x: D.x + (Math.random() - 0.5) * 60, y: TOWER.top - 2, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 2, life: 18, color: C.stone[3], size: 2, grav: 0.15 }); }
    if (a.t < 10 + gl) { this.aim('laugh', 0.2); this.laughing = true; if (a.t % 20 === 0) this.ha(match); return false; }
    this.laughing = false;
    if (a.t < 10 + kk) {                                                         // kicks the brazier off
      this.aim('stomp', 0.4);
      if (a.t === 10 + kk - 6) {
        sfx('clang', 1, 0.6); sfx('flame', 0.8, 0.8); this.out[a.s] = SPILL.out;
        this.braz = { x: a.s * FLARE.x, y: -126, vx: -a.s * 2.6, vy: -4, a: 0, s: a.s, id: this.sid('braz') };
        match.popText({ x: D.x, y: TOWER.top - 200 }, 'BURN!', '#ff7a5a');
      }
      return false;
    }
    if (a.t < 10 + dv) { this.aim('over', 0.3); const tg = this.nearest(match, D.x); a.dx = Phaser.Math.Clamp(tg ? tg.x : 0, -DM.range, DM.range); D.dir = Math.sign(a.dx - D.x) || D.dir; a.dx0 = D.x; return false; }
    if (a.t < 10 + land) {                                                       // the dive
      const k = (a.t - 10 - dv) / TOWER.dive; D.x = lerp(a.dx0, a.dx, k); D.y = lerp(TOWER.top, 0, k * k) - Math.sin(k * Math.PI) * 50; this.aim('down', 0.4);
      if (a.t === 10 + dv) sfx('whoosh', 1, 0.6);
      if (k > 0.4) out.push(this.bhit('dive' + a.id, D.x - 46, D.y - 150, D.x + 46, D.y + 4, ...TOWER.hit, { radial: true }));
      return false;
    }
    if (a.t === 10 + land) {
      D.y = 0; sfx('bighit', 1, 0.45); match.shake(14, 16);
      for (const sd of [-1, 1]) this.waves.push({ x: D.x + sd * 30, dir: sd, t: 0, id: this.sid('wave') });
      if (Math.abs(D.x) < 255) this.cracks.push({ x: D.x + D.dir * 40, t: 0, id: this.sid('crack') });
    }
    this.aim('idle', 0.1);
    return a.t > 10 + land + 34;
  }
  /** The kicked brazier tumbles onto the walk and spills fire; spilled fire and the burning cracks burn whoever stands in them. */
  stepFloorFire(match, out) {
    const Bz = this.braz;
    if (Bz) {
      Bz.vy += 0.4; Bz.x += Bz.vx; Bz.y += Bz.vy; Bz.a += 0.2 * Bz.s;
      out.push(this.bhit(Bz.id, Bz.x - 16, Bz.y - 12, Bz.x + 16, Bz.y + 12, 9, [60, 5, 0.6], { radial: true }));
      if (Bz.y >= -10) { this.braz = null; this.spill = { x: Bz.x, s: Bz.s, t: 0, id: this.sid('spill') }; this.lying = { x: Bz.x, s: Bz.s, t: 0 }; sfx('bighit', 0.7, 0.9); sfx('flame', 1, 0.6); match.shake(6, 8); for (let i = 0; i < 16; i++) match.particles.push({ x: Bz.x, y: -6, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 4, life: 24, color: C.fire[1 + i % 4], size: 3, grav: 0.12 }); }
    }
    const S = this.spill;
    if (S) {
      S.t++; const len = Math.min(1, S.t / 30) * SPILL.len, x1 = S.s > 0 ? S.x - len : S.x, x2 = S.s > 0 ? S.x : S.x + len;
      S.x1 = x1; S.x2 = x2;
      if (S.t > 6 && S.t < SPILL.life - 20) out.push(this.bhit(S.id + Math.floor(S.t / 24), x1, -30, x2, 2, ...SPILL.hit));
      if (S.t >= SPILL.life) this.spill = null;
    }
    for (const c of this.cracks) { c.t++; if (c.t > 10 && c.t < CRACK.life - 10) out.push(this.bhit(c.id + Math.floor(c.t / 26), c.x - CRACK.w, -22, c.x + CRACK.w, 2, ...CRACK.hit)); }
    this.cracks = this.cracks.filter((c) => c.t < CRACK.life);
    for (const s of [-1, 1]) if (this.out[s] > 0) this.out[s]--;
    if (this.lying && this.out[this.lying.s] <= 0) this.lying = null;
  }

  /** You lost: he throws his head back and laughs and laughs (BossArena.bossTaunt). */
  onGloat(match, t) { this.dm.y = 0; this.dm.alpha = 1; this.laughing = true; this.aim('laugh', 0.2); this.dm.p.head += Math.sin(t * 0.9) * 0.08; if (t % 22 === 1) this.ha(match); }
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
  /** His death runs longer than the default (TO ASH). */
  deathLen() { return ASH.len; }
  /**
   * HIS DEATH - TO ASH: he staggers and roars, drives his sword into the battlement and sinks to his knees on it;
   * cracks of molten light split his skin from the heart outward (`crackK`) while he laughs one last, weak HA... HA...;
   * then he crumbles - ash and embers stream up off him on the wind until nothing's left but his sword, planted in the
   * stone, its fire guttering out.
   */
  stepDeath(match) {
    const d = this.boss.dying, D = this.dm, j = this.joints();
    this.aim('kneel', d < ASH.plant ? 0.04 : 0.1);
    if (d === 1) sfx('roar', 1, 0.5);
    if (d === ASH.plant) { D.held = false; this.planted = { x: j.h1.x + D.dir * 20, fire: 1 }; sfx('clang', 1, 0.6); sfx('bighit', 0.8, 0.7); match.shake(10, 14); for (let i = 0; i < 16; i++) match.particles.push({ x: this.planted.x, y: -4, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 4, life: 24, color: [0xffd040, 0xff7a20, 0x8a8a8a][i % 3], size: 3, grav: 0.2 }); }
    if (d > ASH.plant) this.crackK = Math.min(1, (d - ASH.plant) / (ASH.crumble - ASH.plant));
    if (d === ASH.laugh || d === ASH.laugh + 34) { match.popText({ x: j.head.x, y: j.head.y + 40 }, d === ASH.laugh ? 'HA...' : '...HA.', '#ff9a7a'); sfx('laugh', 0.4, 0.45); }
    if (d > ASH.plant && d % 20 === 0 && d < ASH.crumble) sfx('flame', 0.4, 0.6 + this.crackK * 0.6);
    if (d >= ASH.crumble) {                                                          // crumbling to ash on the wind
      const k = (d - ASH.crumble) / (ASH.len - 40 - ASH.crumble); D.alpha = Math.max(0, 1 - k);
      if (d === ASH.crumble) { sfx('smoke', 1, 0.5); sfx('thunder', 0.6, 0.8); match.shake(8, 20); }
      if (D.alpha > 0) for (let i = 0; i < 4; i++) { const ps = [j.head, j.chest, j.hip, j.s1, j.s2, j.kn1, j.kn2, j.h2], q = ps[Math.floor(Math.random() * ps.length)]; match.particles.push({ x: q.x + (Math.random() - 0.5) * 30, y: q.y + (Math.random() - 0.5) * 30, vx: 1 + Math.random() * 2, vy: -1 - Math.random() * 2, life: 50 + Math.random() * 30, color: [0x3a3030, 0x5a4a44, 0xff7a20, 0xffc040, 0x2a2020][i % 5], size: 2 + (i % 2), drag: 0.98, grav: -0.02 }); }
    }
    if (this.planted && d > ASH.len - 80) this.planted.fire = Math.max(0, this.planted.fire - 0.015);
  }
  /** The death's cracks of light through him, and his sword planted in the stone. */
  drawAsh(x) {
    const B = this.boss; if (!B || !B.dying) return;
    const j = this.joints(), k = this.crackK || 0, A = this.dm.alpha, t = this.t;
    if (k > 0 && A > 0.02) {
      x.fillStyle(0xffa040, 0.25 * k * A); x.fillCircle(j.chest.x, j.chest.y, 20 + k * 30);
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2 + 0.4, L = (26 + (i * 37) % 30) * k, bx = j.chest.x + Math.cos(a) * L * 0.5 + Math.sin(i * 3) * 6, by = j.chest.y + Math.sin(a) * L * 0.5, ex = j.chest.x + Math.cos(a) * L, ey = j.chest.y + Math.sin(a) * L * 1.3;
        x.lineStyle(3, 0xff7a20, 0.8 * A); x.lineBetween(j.chest.x, j.chest.y, bx, by); x.lineBetween(bx, by, ex, ey); x.lineStyle(1, 0xfff0a0, A); x.lineBetween(j.chest.x, j.chest.y, bx, by); x.lineBetween(bx, by, ex, ey);
      }
      for (const q of [j.head, j.kn1, j.kn2, j.e1, j.e2]) { x.lineStyle(2, 0xff9a30, 0.7 * k * A); x.lineBetween(q.x - 5, q.y - 4, q.x + 4, q.y + 5); } x.lineStyle(0);
    }
    const P = this.planted;
    if (P) { this.drawSword(x, P.x, -DM.blade + 18, P.x, 18, P.fire > 0.3); if (P.fire > 0 && t % 3 === 0) { x.fillStyle(0xff7a20, 0.5 * P.fire); x.fillEllipse(P.x + Math.sin(t * 0.3) * 3, -DM.blade + 4, 10, 18 * P.fire); } if (P.fire < 0.6) { x.fillStyle(0x8a8a8a, 0.25); x.fillCircle(P.x + Math.sin(t * 0.05) * 6, -DM.blade - 20 - (t % 60), 6); } }
  }
  onDeath() { this.crackK = 0; this.planted = null; this.tail = null; this.braz = null; this.dm.y = 0; this.laughing = false; this.blade = null; this.storm = null; this.toss = null; this.dm.held = true; this.dm.alpha = 1; this.glint = null; }

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
  /** The freeze frame: high on him (his head, horns and wings), a little wider. */
  introAt() { const j = this.joints(); return { x: j.chest.x, y: j.head.y + 30, zoom: 0.95 }; }
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
      for (const s of [-1, 1]) if (!(this.out[s] > 0)) out.push(this.bhit('fl' + h.id + s + Math.floor(h.t / 20), s * FLARE.x - 36, -250, s * FLARE.x + 36, -112, ...FLARE.hit));
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
      this.stepWaves(match, out); this.stepPillars(match, out); this.stepFloorFire(match, out);
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
    if (B) { if (D.alpha > 0.02) this.drawDemon(g, B.flash > 0); this.drawAsh(x); }
    else this.drawSword(g, 0, -150, 0, -150 + DM.blade, false);
    if (this.blade) { const b = this.blade, ca = Math.cos(b.a), sa = Math.sin(b.a); this.drawSword(x, b.x - ca * 70, b.y - sa * 70, b.x + ca * 70, b.y + sa * 70, B && B.phase === 2); x.fillStyle(0xffffff, 0.15); x.fillEllipse(b.x, b.y, THROW.r * 2.4, THROW.r * 0.9); }
    if (this.toss) this.drawSword(x, this.toss.x, this.toss.y + DM.blade, this.toss.x, this.toss.y, B && B.phase === 2);
    if (this.storm) for (const b of this.storm) {                                  // BLADE STORM: marks, then ghost blades point-down
      if (b.st === 'mark') { if (b.t > 0) { const k = b.t / this.sp(STORM.warn); x.fillStyle(0xff2a10, 0.25 + 0.35 * k * (t % 6 < 3 ? 1 : 0.6)); x.fillEllipse(b.x, 0, 24 + 16 * k, 7); } continue; }
      const len = DM.blade, sk = b.tilt;
      x.fillStyle(0xff3a1a, b.st === 'stuck' ? 0.18 + 0.1 * Math.sin(t * 0.3 + b.x) : 0.12); x.fillEllipse(b.x, b.y - len / 2, 30, len + 20);
      if (b.st === 'back') { const j = this.joints(), dx = j.h1.x - b.x, dy = j.h1.y - b.y, d = Math.hypot(dx, dy) || 1; this.drawSword(x, b.x + dx / d * len * 0.6, b.y + dy / d * len * 0.6, b.x - dx / d * len * 0.4, b.y - dy / d * len * 0.4, true); }
      else this.drawSword(x, b.x + sk * len, b.y - len, b.x, b.y, B && B.phase === 2);
    }
    if (this.glint) { const k = Math.min(1, this.glint.t / 10), gx = D.x + D.dir * 10, gy = -160; x.fillStyle(0xff2a10, 0.25 * k); x.fillCircle(gx, gy, 26); for (const s of [-1, 1]) { x.fillStyle(0xff3a1a, k); x.fillTriangle(gx + s * 9 - 6, gy - 3, gx + s * 9 + 6, gy - 5, gx + s * 9, gy + 3); } }
    for (const tx of [-110, 0, 110]) this.fire(x, tx, -46, 5, 12, t + tx);                         // torches
    for (const s of [-1, 1]) {
      if (this.out[s] > 0) { x.fillStyle(0x2a2a2a, 0.5); x.fillCircle(s * FLARE.x, -134 - (t * 0.6 + s * 20) % 30, 4 + ((t * 0.3) % 6)); continue; }   // knocked off: a wisp of smoke
      if (this.flare && this.flare.on) this.fire(x, s * FLARE.x, -128, 34, 130, t + s * 5); else if (this.flare) this.fire(x, s * FLARE.x, -128, 8 + 16 * this.flare.k, 14 + 30 * this.flare.k, t); else this.fire(x, s * FLARE.x, -128, 9, 16, t + s * 7);
    }
    if (this.braz) { const Bz = this.braz; x.fillStyle(C.out, 1); x.fillRect(Bz.x - 17, Bz.y - 8, 34, 14); x.fillStyle(0x6a5030, 1); x.fillRect(Bz.x - 15, Bz.y - 6, 30, 10); this.fire(x, Bz.x, Bz.y - 6, 12, 24, t); }
    if (this.lying) { const L = this.lying; x.fillStyle(C.out, 1); x.fillRect(L.x - 10, -16, 22, 16); x.fillStyle(0x6a5030, 1); x.fillRect(L.x - 8, -14, 18, 12); x.fillStyle(C.stone[0], 1); x.fillRect(L.x - 3, -24, 6, 10); }
    if (this.spill && this.spill.x1 != null) { const S = this.spill, fade = Math.min(1, (SPILL.life - S.t) / 30); x.fillStyle(C.fire[0], 0.5 * fade); x.fillRect(S.x1, -4, S.x2 - S.x1, 5); for (let fx = S.x1 + 8; fx < S.x2; fx += 16) this.fire(x, fx, 1, 9 * fade, (20 + Math.sin(t * 0.3 + fx) * 6) * fade, t + fx); }
    for (const c of this.cracks) {                                                // burning cracks in the walk
      const fade = Math.min(1, (CRACK.life - c.t) / 20), k = Math.min(1, c.t / 8);
      x.lineStyle(4, C.out, fade); x.lineBetween(c.x - CRACK.w * k, -1, c.x - 8, 1); x.lineBetween(c.x - 8, 1, c.x + 6, -2); x.lineBetween(c.x + 6, -2, c.x + CRACK.w * k, 0);
      x.lineStyle(2, C.fire[2], fade); x.lineBetween(c.x - CRACK.w * k, -1, c.x - 8, 1); x.lineBetween(c.x - 8, 1, c.x + 6, -2); x.lineBetween(c.x + 6, -2, c.x + CRACK.w * k, 0); x.lineStyle(0);
      if (c.t > 10) for (const ox of [-14, 2, 16]) this.fire(x, c.x + ox, 1, 6 * fade, (14 + Math.sin(t * 0.4 + ox) * 4) * fade, t + ox + c.x);
    }
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
   * KARNAX, from his skeleton (joints): tattered bat wings behind him (spread wide and edged with fire when MAD), his
   * barbed tail, the back arm and goat leg, a lean V-shaped body of cracked obsidian with molten veins and a burning
   * heart showing through his ribs, a spined back, a chain belt and tattered loincloth, the front goat leg on a cloven
   * hoof, the head (wild white mane, long horns sweeping up and forward, ember eyes, a huge jagged grin that glows inside),
   * a spiked pauldron, iron shackles with broken chains on both wrists, and the sword in his clawed fist.
   */
  drawDemon(g, flash) {
    const j = this.joints(), D = this.dm, d = D.dir, mad = this.boss && this.boss.phase === 2, A = D.alpha, t = this.t;
    const sk = flash ? [0xffffff, 0xffe8e0, 0xffffff, 0xffffff, 0xffffff] : C.skin;
    const glow = mad ? C.rune[1] : C.rune[0], pulse = 0.65 + 0.35 * Math.sin(t * 0.15);
    const quad = (a, b, wa, wb) => { const L = Math.hypot(b.x - a.x, b.y - a.y) || 1, nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L; return [{ x: a.x + nx * wa, y: a.y + ny * wa }, { x: b.x + nx * wb, y: b.y + ny * wb }, { x: b.x - nx * wb, y: b.y - ny * wb }, { x: a.x - nx * wa, y: a.y - ny * wa }]; };
    const limb = (a, b, wa, wb, cols, vein = true) => {
      g.fillStyle(C.out, A); g.fillPoints(quad(a, b, wa + 2.5, wb + 2.5), true); g.fillStyle(cols[0], A); g.fillPoints(quad(a, b, wa, wb), true);
      g.fillStyle(cols[1], A); g.fillPoints(quad(a, b, wa * 0.45, wb * 0.45).slice(0, 2).concat(quad(a, b, wa * 0.05, wb * 0.05).slice(0, 2).reverse()), true);
      if (vein) { g.lineStyle(1.5, glow, A * pulse); const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; g.lineBetween(a.x, a.y, m.x + (b.y - a.y) * 0.08, m.y - (b.x - a.x) * 0.08); g.lineBetween(m.x + (b.y - a.y) * 0.08, m.y - (b.x - a.x) * 0.08, b.x, b.y); g.lineStyle(0); }
      g.fillStyle(C.out, A); g.fillCircle(b.x, b.y, wb + 2); g.fillStyle(cols[0], A); g.fillCircle(b.x, b.y, wb);
    };
    // a goat leg: thigh forward, the shin bending back at the hock, a cloven hoof
    const goat = (kn, ft, cols, front) => {
      const hock = { x: lerp(kn.x, ft.x, 0.5) - d * 13, y: lerp(kn.y, ft.y, 0.5) + 2 };
      limb(kn, hock, front ? 14 : 13, 9, cols, false); limb(hock, { x: ft.x, y: ft.y - 8 }, 9, 7, cols, false);
      g.fillStyle(C.out, A); g.fillPoints([{ x: ft.x - d * 9, y: ft.y - 12 }, { x: ft.x + d * 12, y: ft.y - 10 }, { x: ft.x + d * 15, y: ft.y + 1 }, { x: ft.x - d * 10, y: ft.y + 1 }], true);
      g.fillStyle(C.iron[1], A); g.fillPoints([{ x: ft.x - d * 7, y: ft.y - 10 }, { x: ft.x + d * 11, y: ft.y - 8 }, { x: ft.x + d * 13, y: ft.y - 1 }, { x: ft.x - d * 8, y: ft.y - 1 }], true);
      g.fillStyle(C.out, A); g.fillRect(ft.x + d * 2 - 1, ft.y - 8, 2, 8);
      for (let i = 0; i < 3; i++) { g.fillStyle(C.hair[1], A); g.fillTriangle(hock.x - 5 + i * 4, hock.y - 6, hock.x - 3 + i * 4, hock.y - 6, hock.x - d * 8 + i * 3, hock.y + 6); }   // a tuft of fur
    };
    // the wings, behind everything
    const wb = { x: j.chest.x - d * 14, y: j.chest.y + 2 }, spread = mad ? 1.25 : 1, flap = Math.sin(t * (mad ? 0.14 : 0.07)) * 0.18;
    for (const [side, k] of [[1, 0.8], [-1, 1]]) {
      const base = { x: wb.x - d * side * 4, y: wb.y - side * 2 }, ang = -2.2 + flap * side - (side < 0 ? 0.25 : 0);
      const tip = { x: base.x - d * Math.cos(ang + 1.6) * 110 * k * spread, y: base.y + Math.sin(ang) * 90 * k * spread };
      const fingers = [0.3, 0.75, 1.15, 1.5].map((q) => ({ x: base.x - d * Math.cos(ang + q) * (120 - q * 30) * k * spread, y: base.y + Math.sin(ang + q * 0.6) * (100 - q * 20) * k * spread + q * 40 * k }));
      const mem = [base, tip, ...fingers.slice().reverse().map((f, i) => ({ x: f.x + d * (i % 2 ? 6 : -4), y: f.y + 10 + (i % 2) * 8 })), { x: base.x - d * 10, y: base.y + 60 * k }];
      g.fillStyle(C.out, A); g.fillPoints(mem, true);
      g.fillStyle(flash ? 0xffffff : C.wing[side < 0 ? 0 : 1], A * 0.97); g.fillPoints(mem.map((p) => ({ x: base.x + (p.x - base.x) * 0.95, y: base.y + (p.y - base.y) * 0.95 })), true);
      if (mad) { g.lineStyle(2, C.fire[2], A * 0.7); g.strokePoints(mem.slice(1, -1), false); g.lineStyle(0); }
      for (const f of [tip, ...fingers]) { g.lineStyle(4, C.out, A); g.lineBetween(base.x, base.y, f.x, f.y); g.lineStyle(2, C.wing[2], A); g.lineBetween(base.x, base.y, f.x, f.y); }
      g.lineStyle(0); g.fillStyle(C.horn[1], A); g.fillTriangle(tip.x - 3, tip.y + 2, tip.x + 3, tip.y + 2, tip.x - d * 4, tip.y - 9);
    }
    // the tail: from the base of the spine, swaying, ending in a barbed arrowhead
    const tp = this.tailPts();
    for (const [lw, c] of [[11, C.out], [8, sk[1]], [3, sk[2]]]) { g.lineStyle(lw, c, A); for (let i = 1; i < tp.length; i++) g.lineBetween(tp[i - 1].x, tp[i - 1].y, tp[i].x, tp[i].y); }
    g.lineStyle(0);
    { const e = tp[tp.length - 1], p = tp[tp.length - 2], ux = (e.x - p.x) / (Math.hypot(e.x - p.x, e.y - p.y) || 1), uy = (e.y - p.y) / (Math.hypot(e.x - p.x, e.y - p.y) || 1);
      const tri = (s) => [{ x: e.x + ux * 20 * s, y: e.y + uy * 20 * s }, { x: e.x - uy * 11 * s - ux * 4, y: e.y + ux * 11 * s - uy * 4 }, { x: e.x, y: e.y }, { x: e.x + uy * 11 * s - ux * 4, y: e.y - ux * 11 * s - uy * 4 }];
      g.fillStyle(C.out, A); g.fillPoints(tri(1.15), true); g.fillStyle(this.tail && this.tail.hot ? C.fire[2] : glow, A); g.fillPoints(tri(1), true); }
    // back arm and leg (in shadow)
    const back = [sk[0], sk[1]], front = [sk[1], sk[2]];
    limb(j.s2, j.e2, 13, 10, back); limb(j.e2, j.h2, 10, 8, back);
    this.shackle(g, j.e2, j.h2, A, back); this.claw(g, j.h2, d, A, sk[1]);
    limb(j.hip, j.kn2, 15, 13, back, false); goat(j.kn2, j.ft2, back, false);
    // the body: a V of cracked obsidian, ribs, the burning heart
    const ht = { x: (j.hip.x + j.chest.x) / 2, y: (j.hip.y + j.chest.y) / 2 };
    const L2 = Math.hypot(j.chest.x - j.hip.x, j.chest.y - j.hip.y), nx = -(j.chest.y - j.hip.y) / L2, ny = (j.chest.x - j.hip.x) / L2;
    const tor = (w1, w2, e = 0) => [{ x: j.hip.x + nx * w1, y: j.hip.y + ny * w1 + e }, { x: j.chest.x + nx * w2, y: j.chest.y + ny * w2 - e }, { x: j.chest.x - nx * w2, y: j.chest.y - ny * w2 - e }, { x: j.hip.x - nx * w1, y: j.hip.y - ny * w1 + e }];
    for (let i = 0; i < 5; i++) { const q = 0.15 + i * 0.18, sx = lerp(j.hip.x, j.chest.x, q) - nx * d * (24 + q * 22), sy = lerp(j.hip.y, j.chest.y, q) - ny * d * (24 + q * 22); g.fillStyle(C.out, A); g.fillTriangle(sx - 5, sy + 4, sx + 5, sy + 4, sx - d * 14, sy - 10); g.fillStyle(C.horn[2], A); g.fillTriangle(sx - 3, sy + 3, sx + 3, sy + 3, sx - d * 11, sy - 7); }   // spines down his back
    g.fillStyle(C.out, A); g.fillPoints(tor(24, 50, 3), true); g.fillStyle(sk[1], A); g.fillPoints(tor(21, 47), true);
    g.fillStyle(sk[2], A); g.fillPoints(tor(10 * d, 36 * d).slice(0, 2).concat([{ x: ht.x + nx * 2 * d, y: ht.y + ny * 2 * d }]), true);
    const heart = { x: lerp(j.chest.x, j.hip.x, 0.25) + d * 6, y: lerp(j.chest.y, j.hip.y, 0.25) + 4 };
    g.fillStyle(glow, 0.2 * A * pulse); g.fillCircle(heart.x, heart.y, 30); g.fillStyle(C.fire[1], A); g.fillCircle(heart.x, heart.y, 11); g.fillStyle(C.fire[3], A * pulse); g.fillCircle(heart.x, heart.y, 6);
    for (let i = 0; i < 4; i++) { const yy = -14 + i * 9; g.lineStyle(4, C.out, A); g.lineBetween(heart.x - 24, heart.y + yy, heart.x + 24, heart.y + yy + 2); g.lineStyle(2, sk[3], A); g.lineBetween(heart.x - 22, heart.y + yy - 1, heart.x + 22, heart.y + yy + 1); }   // ribs over it
    g.lineStyle(2, glow, A * pulse);                                                                  // molten cracks from the heart
    for (const [ax, ay] of [[-30, 10], [26, -16], [18, 30], [-14, -30]]) { g.lineBetween(heart.x, heart.y, heart.x + ax * 0.5 + 4, heart.y + ay * 0.5); g.lineBetween(heart.x + ax * 0.5 + 4, heart.y + ay * 0.5, heart.x + ax, heart.y + ay); }
    g.lineStyle(0);
    g.fillStyle(C.iron[1], A); g.fillPoints(tor(25, 25).map((p, i) => (i === 1 || i === 2 ? { x: j.hip.x + (p.x - j.hip.x) + (j.chest.x - j.hip.x) * 0.12, y: j.hip.y + (p.y - j.hip.y) + (j.chest.y - j.hip.y) * 0.12 } : p)), true);   // the belt
    for (let i = -2; i <= 2; i++) { g.fillStyle(C.iron[3], A); g.fillCircle(j.hip.x + i * 9, j.hip.y - 4, 3); g.fillStyle(C.out, A); g.fillCircle(j.hip.x + i * 9, j.hip.y - 4, 1.4); }   // its chain links
    g.fillStyle(C.horn[0], A); g.fillCircle(j.hip.x + d * 2, j.hip.y - 5, 7); g.fillStyle(C.out, A); g.fillCircle(j.hip.x, j.hip.y - 6, 1.8); g.fillCircle(j.hip.x + d * 4, j.hip.y - 6, 1.8);
    for (let i = -2; i <= 2; i++) { g.fillStyle(C.cloth[i % 2 ? 0 : 1], A); g.fillTriangle(j.hip.x + i * 10 - 7, j.hip.y + 2, j.hip.x + i * 10 + 7, j.hip.y + 2, j.hip.x + i * 10 + Math.sin(t * 0.1 + i) * 4, j.hip.y + 30 + (i % 2) * 8); }
    // the front goat leg
    limb(j.hip, j.kn1, 16, 14, front, false); goat(j.kn1, j.ft1, front, true);
    // the head
    const h = j.head, tilt = D.p.lean + D.p.head;
    const HK = 1.45, H = (lx, ly) => { lx *= HK; ly *= HK; const c = Math.cos(tilt), s = Math.sin(tilt); return { x: h.x + (lx * c - ly * s) * d, y: h.y + lx * s + ly * c }; };
    const HP = (pts, col) => { g.fillStyle(col, A); g.fillPoints(pts.map(([x, y]) => H(x, y)), true); };
    for (let i = 0; i < 8; i++) { const q = -2.7 + i * 0.3; HP([[Math.cos(q) * 12 - 8, Math.sin(q) * 12 - 4], [Math.cos(q) * 38 - 16 + Math.sin(t * 0.1 + i) * 2, Math.sin(q) * 32 + 4], [Math.cos(q + 0.3) * 12 - 8, Math.sin(q + 0.3) * 12 - 4]], i % 2 ? 0xe8e0e0 : 0xb8a8b0); }   // the wild white mane
    for (const [side, hk] of [[-1, 0.85], [1, 1]]) {                                                  // long horns sweeping back, then up and forward
      const pts = []; for (let i = 0; i <= 14; i++) { const q = i / 14; pts.push(H(-2 - q * 22 + q * q * 34 + (side < 0 ? -9 : 3), -14 - q * 26 * hk - q * q * 14 * hk + (side < 0 ? 3 : 0))); }
      pts.forEach((p, i) => { const r = (5.8 - i * 0.36) * HK; g.fillStyle(C.out, A); g.fillCircle(p.x, p.y, r + 1.8); });
      pts.forEach((p, i) => { const r = (5.8 - i * 0.36) * HK; g.fillStyle(i < 5 ? C.iron[1] : i < 10 ? C.horn[2] : C.horn[0], A); g.fillCircle(p.x, p.y, r); });
      if (mad) { const e = pts[pts.length - 1]; g.fillStyle(C.fire[2], 0.6 * A); g.fillCircle(e.x, e.y, 4 + Math.random() * 2); }
    }
    HP([[-16, -6], [-11, -18], [3, -21], [15, -15], [22, -2], [22, 10], [12, 19], [-5, 17], [-15, 8]], C.out);   // a long, gaunt skull of a face
    HP([[-14, -6], [-10, -16], [3, -19], [14, -13], [20, -2], [20, 9], [11, 17], [-4, 15], [-13, 7]], sk[1]);
    HP([[-4, -17], [3, -18], [13, -12], [17, -4], [8, -6], [-4, -10]], sk[2]);
    HP([[8, 1], [20, -1], [20, 4], [10, 6]], sk[0]);                                                // a hollow cheek
    const lg = this.laughing, eye = mad || lg ? C.fire[3] : C.fire[2];
    HP([[2, -7], [18, -12], [17, -5], [4, -3]], C.out);                                               // brow and eye, slanted
    HP([[5, -6], [16, -9], [15, -5], [7, -3]], eye); HP([[11, -8], [12.5, -8], [12.5, -4], [11, -4]], C.out);
    if (A > 0.5) { const e = H(10, -6); g.fillStyle(eye, 0.3 * pulse); g.fillCircle(e.x, e.y, 14); }
    const open = lg ? 9 : 3;                                                                          // the grin: wide, jagged, glowing inside
    HP([[-6, 4], [21, 1], [23, 4], [19, 8 + open], [4, 11 + open], [-4, 9]], C.out);
    HP([[-2, 6], [18, 4], [16, 7 + open], [4, 9 + open]], C.fire[open > 5 ? 2 : 0]);
    for (let i = 0; i < 6; i++) { const x = -3 + i * 4; HP([[x, 4.5 - i * 0.4], [x + 3.4, 4 - i * 0.4], [x + 1.7, 8.5 - i * 0.4]], 0xf8f0e0); HP([[x, 9 + open - i * 0.3], [x + 3.4, 9 + open - i * 0.4], [x + 1.7, 5 + open - i * 0.3]], 0xf8f0e0); }
    if (lg) HP([[8, 9 + open * 0.5], [16, 10 + open * 0.5], [20, 16 + open], [14, 18 + open], [10, 14 + open]], 0xc83a5a);   // the tongue, lolling
    // the spiked pauldron, then the sword arm: shackle, clawed fist, the sword
    const pa = j.s1;
    g.fillStyle(C.out, A); g.fillCircle(pa.x, pa.y, 20); g.fillStyle(C.iron[1], A); g.fillCircle(pa.x, pa.y, 18); g.fillStyle(C.iron[3], A); g.fillCircle(pa.x - 4, pa.y - 5, 8);
    for (let i = 0; i < 4; i++) { const q = -2.6 + i * 0.55; g.fillStyle(C.out, A); g.fillTriangle(pa.x + Math.cos(q - 0.22) * 17, pa.y + Math.sin(q - 0.22) * 17, pa.x + Math.cos(q + 0.22) * 17, pa.y + Math.sin(q + 0.22) * 17, pa.x + Math.cos(q) * 40, pa.y + Math.sin(q) * 40); g.fillStyle(C.horn[i % 2], A); g.fillTriangle(pa.x + Math.cos(q - 0.16) * 17, pa.y + Math.sin(q - 0.16) * 17, pa.x + Math.cos(q + 0.16) * 17, pa.y + Math.sin(q + 0.16) * 17, pa.x + Math.cos(q) * 36, pa.y + Math.sin(q) * 36); }
    limb(j.s1, j.e1, 14, 11, front); limb(j.e1, j.h1, 11, 9, front);
    this.shackle(g, j.e1, j.h1, A, front);
    if (D.held) this.drawSword(g, j.h1.x, j.h1.y, j.tip.x, j.tip.y, mad);
    this.claw(g, j.h1, d, A, sk[2]);
  }
  /** An iron shackle near the wrist (between elbow e and hand h) with two links of broken chain swinging from it. */
  shackle(g, e, h, A, cols) {
    const m = { x: lerp(e.x, h.x, 0.72), y: lerp(e.y, h.y, 0.72) };
    g.fillStyle(C.out, A); g.fillCircle(m.x, m.y, 13); g.fillStyle(C.iron[2], A); g.fillCircle(m.x, m.y, 11); g.fillStyle(C.iron[3], A); g.fillCircle(m.x - 3, m.y - 4, 4); g.fillStyle(cols[0], A); g.fillCircle(m.x, m.y, 5);
    const sw = Math.sin(this.t * 0.12 + m.x * 0.01) * 0.4;
    for (let i = 1; i <= 3; i++) { const cx = m.x + Math.sin(sw) * i * 8, cy = m.y + 8 + i * 8; g.lineStyle(3, C.out, A); g.strokeEllipse(cx, cy, i % 2 ? 6 : 4, 9); g.lineStyle(1.5, C.iron[3], A); g.strokeEllipse(cx, cy, i % 2 ? 6 : 4, 9); }
    g.lineStyle(0);
  }
  /** A clawed fist: a dark knuckle ball with three hooked bone claws. */
  claw(g, h, d, A, col) {
    g.fillStyle(C.out, A); g.fillCircle(h.x, h.y, 12); g.fillStyle(col, A); g.fillCircle(h.x, h.y, 10);
    for (let i = 0; i < 3; i++) { const cx = h.x + d * 7, cy = h.y - 6 + i * 6; g.fillStyle(C.out, A); g.fillTriangle(cx - d * 2, cy - 3, cx - d * 2, cy + 3, cx + d * 9, cy + 4); g.fillStyle(C.horn[0], A); g.fillTriangle(cx - d * 1, cy - 2, cx - d * 1, cy + 2, cx + d * 7, cy + 3); }
  }
  /**
   * His tail's points (the base of his spine to the barb): curling behind him and swaying - or, in a TAIL SWEEP,
   * whipping low along the floor past his feet (`this.tail.k` 0..1 = how far round it has swung).
   */
  tailPts() {
    const j = this.joints(), d = this.dm.dir, T = this.tail, pts = [];
    for (let i = 0; i <= 10; i++) {
      const q = i / 10;
      let x = j.hip.x - d * (8 + q * 70) , y = j.hip.y + 6 - Math.sin(q * Math.PI * 0.9) * 40 + q * 20 + Math.sin(this.t * 0.08 - q * 4) * 8 * q;
      if (T) { const sx = j.hip.x - d * 20 + (T.s * (-150 + 300 * T.k)) * q, sy = j.hip.y + 8 + (-6 - j.hip.y - 8) * Math.min(1, q * 1.6); x = lerp(x, sx, T.low); y = lerp(y, sy, T.low); }
      pts.push({ x, y });
    }
    return pts;
  }
}

/** THE BURNING KEEP's miniature for the stage select screen. */
export function drawBurningKeepPreview(g, x, y, w, h) {
  C.sky.forEach((c, i, A) => { g.fillStyle(c, 1); g.fillRect(x, y + i * h / A.length, w, h / A.length + 1); });
  g.fillStyle(C.moon[1], 1); g.fillCircle(x + w * 0.2, y + h * 0.22, h * 0.11);
  g.fillStyle(C.stone[2], 1); g.fillRect(x + w * 0.08, y + h * 0.66, w * 0.84, h * 0.2); g.fillRect(x + w * 0.06, y + h * 0.46, w * 0.14, h * 0.4); g.fillRect(x + w * 0.8, y + h * 0.46, w * 0.14, h * 0.4);
  g.fillStyle(C.banner[1], 1); g.fillRect(x + w * 0.1, y + h * 0.54, w * 0.06, h * 0.12); g.fillRect(x + w * 0.84, y + h * 0.54, w * 0.06, h * 0.12);
  const cx = x + w * 0.56, fy = y + h * 0.66;
  g.fillStyle(C.wing[1], 1); g.fillTriangle(cx, fy - h * 0.4, cx + w * 0.2, fy - h * 0.62, cx + w * 0.16, fy - h * 0.2); g.fillTriangle(cx, fy - h * 0.4, cx - w * 0.16, fy - h * 0.66, cx - w * 0.12, fy - h * 0.24);
  g.fillStyle(C.skin[2], 1); g.fillRect(cx - w * 0.05, fy - h * 0.42, w * 0.1, h * 0.3); g.fillRect(cx - w * 0.04, fy - h * 0.12, w * 0.03, h * 0.12); g.fillRect(cx + w * 0.01, fy - h * 0.12, w * 0.03, h * 0.12);
  g.fillCircle(cx, fy - h * 0.48, h * 0.07); g.fillStyle(C.horn[0], 1); g.fillTriangle(cx - 4, fy - h * 0.53, cx - 10, fy - h * 0.66, cx - 1, fy - h * 0.55); g.fillTriangle(cx + 4, fy - h * 0.53, cx + 10, fy - h * 0.66, cx + 1, fy - h * 0.55);
  g.fillStyle(C.rune[2], 1); g.fillRect(cx - 4, fy - h * 0.49, 2, 2); g.fillRect(cx + 2, fy - h * 0.49, 2, 2);
  g.fillStyle(C.fire[2], 1); g.fillCircle(cx, fy - h * 0.32, 2.5);
  g.fillStyle(C.iron[2], 1); g.fillTriangle(cx + w * 0.05, fy - h * 0.36, cx + w * 0.07, fy - h * 0.38, cx + w * 0.26, fy - h * 0.8); g.fillStyle(C.rune[0], 1); g.fillRect(cx + w * 0.12, fy - h * 0.55, 2, 2);
}

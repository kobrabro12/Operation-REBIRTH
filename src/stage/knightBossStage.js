// THE ELDER GROVE - the arena of THORNWARD, THE ROOTBOUND KNIGHT (boss IV, forest; Trinkets > BOSS FIGHTS, src/data/bosses.js).
// A clearing in an ancient forest: misty layers of trunks, shafts of green-gold light, two giant trees framing it with
// their roots holding up two ledges, a ruined stone archway with a glowing sigil, a mossy flagstone floor, two glowing
// mushrooms, fireflies and drifting leaves.
// THORNWARD is a hollow suit of mossy armour bound together by roots, wearing an antlered great helm, with a kite
// shield on one arm and a maul (a boulder bound to a trunk) in the other. He's drawn from a skeleton like KARNAX
// (`joints()`, `POSES`, `aim()`), and his SOUL (a green wisp with a face) lives inside the helm.
//   HIS ARMOUR CAN'T BE HURT (mult 0: hits just clang). Every few attacks his SOUL leaves through the visor and flies
//   over to taunt you - his body slumps - and that's the only time he can be hurt: hit the soul (x1.2) until it flees
//   home. From the second time on it plays THE SHELL GAME: two fake souls split off it, all three circle you and
//   shuffle (spinning round each other); hitting a fake pops it into a burst of thorns. The real one still has the
//   twinkle in its eyes. Below 25% health the soul stays in his head with the visor torn open (always x0.8) - but he goes BERSERK.
//   Attacks: MAUL SLAM (stalks in, overhead slam, thorn roots erupt in a line from it), ROOT GRASP (plunges a hand
//   into the earth; roots burst up under each player after their mark glows), SHIELD CHARGE (shield up, he charges
//   across the clearing), THORN VOLLEY (thorns burst from the vines on his back and arc onto you), VERDANT FURY
//   (BERSERK: roots erupt across the whole floor from one side to the other).
// Stage hazards (also in VS, where his empty armour kneels by the archway): THORN ROOTS (a line of thorns erupts
// across the floor - jump it) and SPORE BURST (the glowing mushrooms puff clouds of stinging spores).
import { HazardCycle } from './hazardCycle.js';
import { BossArena } from './bossBase.js';
import { sfx } from '../audio/sfx.js';

const C = { out: 0x0a120c, sky: [0x0a1a14, 0x10281c, 0x183a26, 0x24502e, 0x3a6a3a, 0x5a8a4a, 0x8ab060],
  far: [0x14302a, 0x1c3e32, 0x26503c], bark: [0x1e140c, 0x2e2014, 0x44301c, 0x5e4428, 0x7a5c38], stone: [0x2a302a, 0x3e463c, 0x56604f, 0x727c68, 0x929c84],
  moss: [0x1e4a18, 0x2e6a22, 0x48902e, 0x6ab840, 0x9ad860], armor: [0x141a18, 0x262e2a, 0x3a4640, 0x56665c, 0x7a8c80], bronze: [0x5a4020, 0x8a6a34, 0xb89a58],
  root: [0x24160c, 0x3e2814, 0x5a3c20, 0x7a5430], soul: [0x1ae890, 0x5affb8, 0xb0ffe0, 0xf0fff8], shroom: [0x2ad0c0, 0x8affe8], spore: 0xb8f070, leaf: [0x3a8a2a, 0x6ab840, 0xc8a040] };
// his body (px): leg, torso, neck and head sizes, arm lengths, the maul's haft; walking speed (normal / BERSERK)
const DM = { thigh: 40, shin: 40, torso: 64, neck: 14, head: 30, upper: 38, fore: 36, haft: 104, walk: 2.0, mad: 3.0, range: 235 };
// his poses (as KARNAX's: angles from straight down, + toward the front; sw = the maul from straight up)
const LEGS = { t1: 0.3, s1: -0.04, t2: -0.26, s2: -0.36 };
const POSES = {
  idle: { lean: 0.08, head: 0.08, u1: 0.25, f1: 0.75, u2: 0.55, f2: 1.25, sw: 2.3 },
  over: { lean: -0.2, head: -0.1, u1: 3.3, f1: 3.85, u2: 0.6, f2: 1.4, sw: -0.85 },
  down: { lean: 0.5, head: 0.25, u1: 1.3, f1: 1.6, u2: 0.4, f2: 0.9, sw: 2.7, t1: 0.8, s1: 0.2, t2: -0.55, s2: -0.85 },
  guard: { lean: 0.32, head: 0.1, u1: 0.2, f1: 0.6, u2: 1.35, f2: 1.6, sw: 2.6, t1: 0.65, s1: 0.1, t2: -0.5, s2: -0.65 },
  grasp: { lean: 0.6, head: 0.35, u1: 0.3, f1: 0.6, u2: 0.9, f2: 0.4, sw: 2.7, t1: 1.2, s1: -0.3, t2: 0.4, s2: -1.1 },
  kneel: { lean: 0.42, head: 0.3, u1: 0.15, f1: 0.35, u2: 0.1, f2: 0.25, sw: 2.95, t1: 1.45, s1: -0.15, t2: 0.1, s2: -1.5 },
  volley: { lean: 0.42, head: 0.3, u1: 0.4, f1: 0.8, u2: 0.6, f2: 1.1, sw: 2.5, t1: 0.9, s1: 0.05, t2: -0.3, s2: -0.9 },
  pose: { lean: 0.02, head: -0.08, u1: 0.35, f1: 2.5, u2: 1.1, f2: 1.6, sw: -0.55, t1: 0.42, s1: 0.0, t2: -0.36, s2: -0.5 },
};
// MAUL SLAM: frames he'll stalk, how close; the slam's hit; the thorn line (spikes, spacing, delay, hit)
const SLAM = { stalk: 70, reach: 110, hit: [14, [62, 6.4, 1.0]], line: { n: 5, gap: 46, every: 6, hit: [8, [84, 5, 0.6]] } };
// ROOT GRASP: warning frames under each player, how long the roots stand, hit
const GRASP = { warn: 46, up: 24, hit: [10, [88, 5.6, 0.8]] };
// SHIELD CHARGE: wind-up, speed, hit
const CHARGE = { wind: 34, speed: 7.5, hit: [12, [30, 6.4, 0.9]] };
// THORN VOLLEY: thorns (normal / BERSERK), frames between, flight, hit
const VOLLEY = { n: [4, 6], every: 9, flight: 44, grav: 0.3, hit: [7, [60, 4.6, 0.55]] };
// VERDANT FURY (BERSERK): spikes across the floor, spacing, delay, hit
const FURY = { gap: 40, every: 4, hit: [10, [86, 5.8, 0.7]] };
// THE SOUL: every `every` attacks it comes out to taunt for `out` frames (shorter on higher difficulties); how fast it
// flies; what a hit on it does (x mult); below `bare` health it stays in his head for good (and he goes BERSERK)
// HIS DEATH (AT PEACE): when his soul slips free, when the grove starts to take him back, when the soul flies off, the whole length
const REST = { free: 50, grow: 100, away: 220, len: 330 };
const SOUL = { every: 4, out: 400, speed: 0.06, mult: 1.2, bare: 0.25, lines: ['NYAH!', 'TOO SLOW!', 'OVER HERE!', 'HEHEHE!', 'CAN\'T CATCH ME!', 'BLEH!'] };
// THE SHELL GAME (from the second soul-out): fakes, the circle round you, how fast it turns, a shuffle every `every`
// frames lasting `spin`, how long a hit fake takes to burst, the burst's size and hit
const DECOY = { n: 2, r: 74, turn: 0.011, every: 130, spin: 48, fuse: 10, burst: 56, hit: [9, [60, 5.6, 0.6]] };
// THORN ROOTS hazard: spikes, spacing, delay; SPORE BURST: warning, cloud frames, size, hit (ticks)
const THORNS = { gap: 44, every: 5, hit: [8, [80, 5, 0.6]] };
const SPORES = { warn: 60, on: 110, r: 64, x: 236, hit: [3, [70, 3, 0.25]] };
// where the forest backdrop is placed on the background camera
const SKY = { x: 320, y: 250 };
// the thorn spike: how long it stands, how tall
const SPIKE = { life: 26, h: 52 };

/** A point along the way from a to b (k = 0..1). */
const lerp = (a, b, k) => a + (b - a) * k;

/** THE ELDER GROVE and THORNWARD (see the top of the file). */
export class KnightBossStage extends BossArena {
  constructor(scene) {
    super();
    this.scene = scene; this.t = 0; this.hazardsOn = true; this.music = 'bgm_boss_knight';
    this.platforms = [
      { x1: -265, x2: 265, y: 0, solid: true, bottom: 70 },
      { x1: -238, x2: -138, y: -98, solid: false },
      { x1: 138, x2: 238, y: -98, solid: false },
    ];
    this.spawns = [{ x: -150, y: 0 }, { x: -60, y: 0 }, { x: -110, y: 0 }, { x: 150, y: 0 }];
    this.cycle = new HazardCycle(this, ['thorns', 'spores'], { color: '#9ae060', stroke: '#0a1a08', gap: 720 });
    this.kn = { x: 130, y: 0, dir: -1, p: { ...LEGS, ...POSES.kneel }, alpha: 1, walk: 0 };
    this.soul = { st: 'home', x: 130, y: -150, t: 0, flash: 0, vx: 0 };
    this.rageAt = SOUL.bare;
    this.count = 0; this.uid = 0; this.spikes = []; this.marks = []; this.thorns = []; this.clouds = null; this.leaves = []; this.flies = [];
    for (let i = 0; i < 26; i++) this.flies.push({ x: (Math.random() - 0.5) * 600, y: -40 - Math.random() * 260, p: Math.random() * 6 });
    this.sparkColor = 0x6ae060; this.bodyW = 110; this.bodyH = 170; this.lit = 0;
  }

  /** Builds the forest backdrop, the giant trees and the archway, the flagstone floor and its roots. */
  draw(world, bg) {
    const s = this.scene;
    const sky = s.add.graphics().setScrollFactor(0.15).setPosition(SKY.x, SKY.y); bg.push(sky); this.paintSky(sky);
    this.rayG = s.add.graphics().setScrollFactor(0.4); bg.push(this.rayG);
    const back = s.add.graphics(); world.push(back); this.paintGrove(back);
    const front = s.add.graphics(); world.push(front); this.paintFloor(front);
    this.knG = s.add.graphics(); world.push(this.knG);
    this.fxG = s.add.graphics(); world.push(this.fxG);
    this.cycle.makeBanner(s);
  }

  /** The far forest: green mist bands, three layers of trunks fading into it, a glow of light high up. */
  paintSky(g) {
    const x0 = -700, y0 = -560;
    C.sky.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(x0, y0 + i * 90, 1400, 92); });
    g.fillStyle(C.sky[6], 0.25); g.fillEllipse(80, -360, 520, 200); g.fillStyle(0xe8f0a0, 0.12); g.fillEllipse(80, -380, 260, 90);
    C.far.forEach((col, layer) => {
      for (let i = 0; i < 16; i++) {
        const x = x0 + 30 + i * 88 + layer * 37 + ((i * 53) % 40), w = 16 + layer * 10 + (i % 3) * 5;
        g.fillStyle(col, 1); g.fillRect(x, -500, w, 700); g.fillRect(x - w * 0.4, 120 - layer * 10, w * 1.8, 80);
        g.fillCircle(x + w / 2, -360 + (i % 4) * 30 + layer * 40, 40 + layer * 14);
      }
      g.fillStyle(C.sky[2 + layer], 0.35); g.fillRect(x0, -120 + layer * 60, 1400, 400);            // mist between the layers
    });
  }

  /** The clearing: two giant trees framing it (roots holding up the ledges), hanging vines, the ruined archway with its sigil. */
  paintGrove(g) {
    const B = C.bark, S = C.stone;
    // the archway behind the floor
    for (const s of [-1, 1]) {
      g.fillStyle(C.out, 1); g.fillRect(s * 120 - 24, -260, 48, 262); g.fillStyle(S[1], 1); g.fillRect(s * 120 - 21, -258, 42, 258);
      for (let y = -250; y < 0; y += 22) { g.fillStyle(S[2], 1); g.fillRect(s * 120 - 19, y, 38, 18); g.fillStyle(S[3], 1); g.fillRect(s * 120 - 19, y, 38, 3); }
      g.fillStyle(C.moss[1], 1); g.fillEllipse(s * 120, -258, 52, 16);
    }
    g.fillStyle(C.out, 1); g.fillRect(-150, -290, 300, 36); g.fillStyle(S[2], 1); g.fillRect(-146, -286, 292, 28); g.fillStyle(S[3], 1); g.fillRect(-146, -286, 292, 4);
    g.fillStyle(C.moss[2], 1); for (let x = -140; x < 140; x += 22) g.fillEllipse(x, -288, 26, 9);
    g.fillStyle(C.soul[0], 0.12); g.fillCircle(0, -170, 70); g.lineStyle(3, C.soul[1], 0.5); g.strokeCircle(0, -170, 52); g.strokeCircle(0, -170, 36);
    for (let i = 0; i < 8; i++) { const q = i / 8 * Math.PI * 2; g.lineBetween(Math.cos(q) * 36, -170 + Math.sin(q) * 36, Math.cos(q) * 52, -170 + Math.sin(q) * 52); }
    g.lineStyle(0);
    // the two giant trees, their roots arching down under the ledges
    for (const s of [-1, 1]) {
      const tx = s * 360;
      g.fillStyle(C.out, 1); g.fillRect(tx - 70, -600, 140, 640);
      g.fillStyle(B[1], 1); g.fillRect(tx - 66, -600, 132, 640); g.fillStyle(B[2], 1); g.fillRect(tx - 66 + (s < 0 ? 70 : 0), -600, 62, 640);
      for (let k = 0; k < 8; k++) { g.fillStyle(B[0], 1); g.fillRect(tx - 50 + k * 14, -600 + (k * 71) % 120, 4, 640); }
      for (let r = 0; r < 4; r++) {                                                  // roots reaching toward the clearing
        const pts = []; for (let i = 0; i <= 10; i++) { const q = i / 10; pts.push({ x: tx - s * (40 + q * (140 + r * 30)), y: -60 + r * 16 + Math.sin(q * Math.PI) * -40 + q * 60 }); }
        for (const [lw, c] of [[16 - r * 3, C.out], [12 - r * 3, B[2]], [4, B[3]]]) { g.lineStyle(lw, c, 1); for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y); }
      }
      g.lineStyle(0);
      for (let v = 0; v < 5; v++) { const vx = tx - s * (80 + v * 26); g.lineStyle(2, C.moss[v % 2 ? 1 : 2], 1); for (let y = -600; y < -260 + v * 30; y += 12) g.lineBetween(vx + Math.sin(y * 0.05 + v) * 3, y, vx + Math.sin((y + 12) * 0.05 + v) * 3, y + 12); g.lineStyle(0); g.fillStyle(C.moss[3], 1); g.fillEllipse(vx, -260 + v * 30, 8, 5); }
    }
    for (const p of this.platforms.slice(1)) {                                        // the root ledges
      g.fillStyle(C.out, 1); g.fillRoundedRect(p.x1 - 4, p.y - 4, p.x2 - p.x1 + 8, 22, 9);
      g.fillStyle(B[3], 1); g.fillRoundedRect(p.x1, p.y - 1, p.x2 - p.x1, 16, 7); g.fillStyle(B[4], 1); g.fillRect(p.x1 + 6, p.y - 1, p.x2 - p.x1 - 12, 3);
      g.fillStyle(C.moss[2], 1); for (let x = p.x1 + 6; x < p.x2 - 4; x += 14) g.fillEllipse(x, p.y, 18, 6);
    }
  }

  /** The floor (he stands on it): mossy flagstones, grass tufts and flowers on top, roots creeping over the edge, two mushrooms. */
  paintFloor(g) {
    const S = C.stone, P = this.platforms[0];
    g.fillStyle(C.out, 1); g.fillRect(P.x1 - 3, -3, P.x2 - P.x1 + 6, 74);
    for (let y = 2; y < 70; y += 16) for (let x = P.x1 + ((y / 16) % 2) * 18; x < P.x2; x += 36) { g.fillStyle(S[1 + ((x + y) & 1)], 1); g.fillRect(x + 1, y, Math.min(34, P.x2 - x - 1), 14); g.fillStyle(S[3], 1); g.fillRect(x + 1, y, Math.min(34, P.x2 - x - 1), 2); }
    g.fillStyle(S[3], 1); g.fillRect(P.x1, 0, P.x2 - P.x1, 4); g.fillStyle(S[4], 1); g.fillRect(P.x1, 0, P.x2 - P.x1, 1);
    for (let x = P.x1 + 4; x < P.x2; x += 9) { g.fillStyle(C.moss[(x >> 3) % 2 ? 2 : 3], 1); g.fillTriangle(x, 1, x + 3, -4 - (x * 7) % 5, x + 6, 1); }   // grass
    for (const x of [-200, -90, 30, 160, 230]) { g.fillStyle(0xffffff, 1); g.fillCircle(x, -3, 2); g.fillStyle(0xffe060, 1); g.fillCircle(x, -3, 1); }
    for (let r = 0; r < 6; r++) { const x = P.x1 + 40 + r * 90; g.lineStyle(5, C.out, 1); g.lineBetween(x, 2, x + 14, 40 + r * 4); g.lineStyle(3, C.root[2], 1); g.lineBetween(x, 2, x + 14, 40 + r * 4); }
    g.lineStyle(0);
    for (const s of [-1, 1]) {                                                         // the glowing mushrooms
      const x = s * SPORES.x;
      g.fillStyle(0xe8e0c8, 1); g.fillRect(x - 5, -26, 10, 26); g.fillStyle(C.out, 1); g.fillEllipse(x, -28, 50, 22);
      g.fillStyle(C.shroom[0], 1); g.fillEllipse(x, -30, 46, 18); g.fillStyle(C.shroom[1], 1); for (const d of [-12, 0, 12]) g.fillCircle(x + d, -33, 3);
      g.fillStyle(C.shroom[0], 0.15); g.fillCircle(x, -28, 40);
    }
  }

  // ------------------------------------------------------------------ THORNWARD
  /** The boss's own state when the fight starts. */
  makeBoss() { this.cycle.gap = 1300; this.cycle.next = 1600; }
  /** What the camera, the explosions and the CPU go for: his soul when it's out, else his head. */
  core() { if (this.soul.st !== 'home') return { x: this.soul.x, y: this.soul.y }; const j = this.joints(); return { x: j.head.x, y: j.head.y }; }
  /** The camera keeps the clearing and him in view (and his soul, out taunting you). */
  camPoints() { return this.boss ? [{ x: -250, y: -230 }, { x: 250, y: 0 }] : []; }
  /** Whether his soul is bared for good (low health): it shows in his torn-open helm and can always be hit. */
  bare() { return this.boss && this.boss.hp <= this.boss.max * SOUL.bare; }
  /**
   * Where he can be hit: his SOUL when it's out (x1.2), his head once the soul is bared (x0.8); everything else is
   * ARMOUR (mult 0 - clang, no damage).
   */
  hurt() {
    const j = this.joints(), out = [], S = this.soul;
    if (S.st === 'out' || S.st === 'back') out.push({ x1: S.x - 20, y1: S.y - 20, x2: S.x + 20, y2: S.y + 20, mult: SOUL.mult, soul: true });
    out.push({ x1: j.head.x - 30, y1: j.head.y - 34, x2: j.head.x + 30, y2: j.head.y + 26, mult: this.bare() ? 0.8 : 0 });
    out.push({ x1: Math.min(j.hip.x, j.chest.x) - 40, y1: j.chest.y - 12, x2: Math.max(j.hip.x, j.chest.x) + 40, y2: j.hip.y + 24, mult: 0 });
    out.push({ x1: Math.min(j.ft1.x, j.ft2.x) - 16, y1: j.hip.y, x2: Math.max(j.ft1.x, j.ft2.x) + 16, y2: Math.max(j.ft1.y, j.ft2.y), mult: 0 });
    return out;
  }
  /** Hitting armour: now and then a little "NO EFFECT" so it's clear where to hit. */
  onArmor(match, x, y) { if (this.t - (this.noFx || -999) > 90) { this.noFx = this.t; match.popText({ x, y: y + 50 }, 'NO EFFECT', '#b8c8c0'); } }
  /** A hit on the soul: it flinches, squeals, and is knocked a little away. */
  onHurt(match, r) { if (r.soul) { this.soul.flash = 8; this.soul.vx = (Math.random() < 0.5 ? -1 : 1) * 6; if (Math.random() < 0.5) match.popText({ x: this.soul.x, y: this.soul.y + 50 }, ['OW!', 'HEY!', 'OOF!', 'YIPE!'][Math.floor(Math.random() * 4)], '#9affd0'); } }

  /** His skeleton in world space (hips set so his lower foot is on the floor) - as KARNAX's. */
  joints() {
    const D = this.kn, p = D.p, d = D.dir, down = (a, l) => ({ x: Math.sin(a) * d * l, y: Math.cos(a) * l });
    const k1 = down(p.t1, DM.thigh), f1 = down(p.s1, DM.shin), k2 = down(p.t2, DM.thigh), f2 = down(p.s2, DM.shin);
    const hip = { x: D.x, y: D.y - Math.max(k1.y + f1.y, k2.y + f2.y) };
    const chest = { x: hip.x + Math.sin(p.lean) * d * DM.torso, y: hip.y - Math.cos(p.lean) * DM.torso };
    const head = { x: chest.x + Math.sin(p.lean + p.head) * d * (DM.neck + DM.head), y: chest.y - Math.cos(p.lean + p.head) * (DM.neck + DM.head) };
    const add = (a, v) => ({ x: a.x + v.x, y: a.y + v.y });
    const s1 = { x: chest.x + d * 15, y: chest.y + 8 }, s2 = { x: chest.x - d * 15, y: chest.y + 6 };
    const e1 = add(s1, down(p.u1, DM.upper)), h1 = add(e1, down(p.f1, DM.fore)), e2 = add(s2, down(p.u2, DM.upper)), h2 = add(e2, down(p.f2, DM.fore));
    const sv = { x: Math.sin(p.sw) * d, y: -Math.cos(p.sw) };
    const kn1 = add(hip, k1), ft1 = add(kn1, f1), kn2 = add(hip, k2), ft2 = add(kn2, f2);
    const L = sv.y > 0 && h1.y + sv.y * DM.haft > D.y - 26 ? Math.max(30, (D.y - 26 - h1.y) / sv.y) : DM.haft;   // the maul's head rests on the floor, not in it
    return { hip, chest, head, s1, e1, h1, s2, e2, h2, kn1, ft1, kn2, ft2, sv, tip: { x: h1.x + sv.x * L, y: h1.y + sv.y * L } };
  }
  /** Moves his pose part of the way (k) toward a named pose. */
  aim(name, k) { const P = { ...LEGS, ...POSES[name] }, p = this.kn.p; for (const key of Object.keys(P)) p[key] = lerp(p[key] ?? P[key], P[key], k); }
  /** His heavy walk toward x. Returns true once he's there. */
  walkTo(x, sp) {
    const D = this.kn, dx = Phaser.Math.Clamp(x, -DM.range, DM.range) - D.x;
    if (Math.abs(dx) < 6) return true;
    D.dir = Math.sign(dx); D.x += Math.sign(dx) * Math.min(Math.abs(dx), sp); D.walk += sp * 0.065;
    const w = Math.sin(D.walk);
    this.aim('idle', 0.2); D.p.t1 = 0.1 + w * 0.45; D.p.s1 = D.p.t1 - 0.2 - Math.max(0, -w) * 0.45; D.p.t2 = 0.1 - w * 0.45; D.p.s2 = D.p.t2 - 0.2 - Math.max(0, w) * 0.45;
    if (Math.floor(D.walk / Math.PI) !== Math.floor((D.walk - sp * 0.065) / Math.PI)) { sfx('land', 0.4, 0.5); this.match.shake(2, 3); }
    return false;
  }
  /** His speed (faster BERSERK). */
  speed() { return this.boss && this.boss.phase === 2 ? DM.mad : DM.walk; }
  /** Hitboxes along the maul's haft and its big boulder head. */
  maulHits(out, id, [dmg, kb]) {
    const j = this.joints();
    for (const q of [0.5, 0.8]) { const x = lerp(j.h1.x, j.tip.x, q), y = lerp(j.h1.y, j.tip.y, q); out.push(this.bhit(id + q, x - 16, y - 16, x + 16, y + 16, dmg, kb, { dirX: this.kn.dir })); }
    out.push(this.bhit(id + 'h', j.tip.x - 30, j.tip.y - 30, j.tip.x + 30, j.tip.y + 30, dmg, kb, { dirX: this.kn.dir }));
  }
  /** A thorn spike erupting from the floor at x after `delay` frames. */
  spike(x, delay, hit, tag) { if (Math.abs(x) < 262) this.spikes.push({ x, t: -delay, hit, id: 'kn-' + tag + '-' + (++this.uid) }); }
  /** What he does next: every few attacks his SOUL comes out to taunt (until it's bared); BERSERK adds VERDANT FURY. */
  pattern(phase) {
    if (!this.bare() && this.count % SOUL.every === SOUL.every - 1) return ['soul'];
    return phase === 1 ? ['slam', 'grasp', 'charge', 'volley'] : ['slam', 'grasp', 'charge', 'volley', 'fury', 'slam'];
  }
  /** Counts his attacks (every few, the soul comes out). */
  tally() { this.count++; }
  start_slam() { this.tally(); } start_grasp() { this.tally(); } start_charge() { this.tally(); } start_volley() { this.tally(); } start_fury() { this.tally(); } start_soul() { this.tally(); }
  /** The drawing layers that make up the boss itself, for its death card's portrait (MatchScene.paintBossCard). */
  cardObjs() { return [this.knG]; }
  rageLine() { return 'THORNWARD GOES BERSERK!'; }
  /** BERSERK: the helm's visor tears open (his soul bared), a burst of leaves and green fire. */
  onRage(match) { this.decoys = null; this.onRage2(match); }
  /** (BERSERK's burst of leaves and green fire.) */
  onRage2(match) { const j = this.joints(); for (let i = 0; i < 34; i++) { const a = i / 34 * Math.PI * 2; match.particles.push({ x: j.head.x, y: j.head.y, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, life: 32, color: [C.soul[0], C.soul[1], C.leaf[0], C.leaf[1]][i % 4], size: 3, drag: 0.94 }); } sfx('roar', 1, 1.1); this.soul.st = 'home'; }

  /** At rest: he faces the nearest player and stalks after them slowly, breathing; the soul glows in his visor. */
  idle(match) {
    const D = this.kn, tg = this.nearest(match, D.x);
    if (tg && Math.abs(tg.x - D.x) > 180) this.walkTo(tg.x - Math.sign(tg.x - D.x) * 160, this.speed() * 0.55);
    else { if (tg) D.dir = Math.sign(tg.x - D.x) || D.dir; this.aim('idle', 0.1); D.p.lean = 0.08 + Math.sin(this.t * 0.05) * 0.03; }
  }

  /** MAUL SLAM: he stalks in, raises the maul and brings it down - and a line of thorn roots erupts on from the impact. */
  atk_slam(match, a, out) {
    const D = this.kn, tg = this.nearest(match, D.x);
    if (a.s == null) { if (!tg || Math.abs(tg.x - D.x) < SLAM.reach || a.t > SLAM.stalk || this.walkTo(tg.x - Math.sign(tg.x - D.x) * 95, this.speed())) { a.s = a.t; if (tg) D.dir = Math.sign(tg.x - D.x) || D.dir; } return false; }
    const t = a.t - a.s, up = this.sp(24);
    if (t < up) { this.aim('over', 0.2); return false; }
    if (t < up + 7) { this.aim('down', 0.55); this.maulHits(out, 'sl' + a.id, SLAM.hit); return false; }
    if (t === up + 7) {
      const j = this.joints(); sfx('bighit', 1, 0.55); match.shake(10, 12); this.burst(match, j.tip.x, -4, [C.stone[3], C.moss[2], C.leaf[0]], 16);
      const L = SLAM.line; for (let k = 1; k <= L.n * (this.boss.phase === 2 ? 2 : 1); k++) this.spike(j.tip.x + D.dir * k * L.gap, k * L.every, L.hit, 'sline');
    }
    this.aim('down', 0.15);
    return t > up + 50;
  }
  /** ROOT GRASP: he plunges a hand into the earth; under each player a mark glows, then roots burst up. */
  atk_grasp(match, a) {
    const warn = this.sp(GRASP.warn);
    this.aim('grasp', 0.15);
    if (a.t === 16) { sfx('rumble', 0.8, 0.9); match.shake(4, 20); for (const f of match.fighters) if (f.alive) this.marks.push({ x: Phaser.Math.Clamp(f.x, -255, 255), t: 0, id: this.sid('grasp') }); if (this.boss.phase === 2) this.marks.push({ x: (Math.random() - 0.5) * 460, t: 0, id: this.sid('grasp') }); }
    for (const m of this.marks) { m.t++; if (m.t === warn) { sfx('geyser', 0.6, 1.4); this.burst(match, m.x, -4, [C.root[2], C.moss[2]], 10); } }
    this.marks = this.marks.filter((m) => m.t < warn + GRASP.up);
    return a.t > 16 && !this.marks.length;
  }
  /** The grasping roots' hitboxes (while they stand). */
  stepMarks(out) { for (const m of this.marks) if (m.t >= this.sp(GRASP.warn)) out.push(this.bhit(m.id, m.x - 22, -110, m.x + 22, 0, ...GRASP.hit)); }
  /** SHIELD CHARGE: shield up and planted, a stamp - then he charges across the clearing behind it. */
  atk_charge(match, a, out) {
    const D = this.kn, wind = this.sp(CHARGE.wind);
    if (a.t === 1) { const tg = this.nearest(match, D.x); if (tg) D.dir = Math.sign(tg.x - D.x) || D.dir; a.to = -Math.sign(D.dir) * -DM.range; }
    if (a.t < wind) { this.aim('guard', 0.2); if (a.t === wind - 8) { sfx('land', 0.8, 0.5); match.shake(3, 6); } return false; }
    this.aim('guard', 0.3);
    const sp = CHARGE.speed * (this.boss.phase === 2 ? 1.3 : 1), done = this.walkTo(a.to, sp);
    this.aim('guard', 0.6);
    const j = this.joints(); out.push(this.bhit('ch' + a.id, j.h2.x - 26 + D.dir * 10, j.h2.y - 50, j.h2.x + 26 + D.dir * 10, j.h2.y + 40, ...CHARGE.hit, { dirX: D.dir }));
    if (a.t % 6 === 0) match.particles.push({ x: D.x - D.dir * 20, y: -4, vx: -D.dir * 2, vy: -1, life: 16, color: C.stone[3], size: 3 });
    return done || a.t > wind + 120;
  }
  /** THORN VOLLEY: he hunches and thorns burst from the vines on his back, arcing onto the players. */
  atk_volley(match, a) {
    const n = VOLLEY.n[this.boss.phase - 1], every = this.sp(VOLLEY.every);
    this.aim('volley', 0.15);
    if (a.t >= 20 && (a.t - 20) % every === 0 && (a.t - 20) / every < n) {
      const j = this.joints(), tg = this.nearest(match, j.chest.x), T = VOLLEY.flight, tx = Phaser.Math.Clamp((tg ? tg.x : 0) + (Math.random() - 0.5) * 100, -255, 255), x0 = j.chest.x - this.kn.dir * 14, y0 = j.chest.y - 10;
      this.thorns.push({ x: x0, y: y0, vx: (tx - x0) / T, vy: (0 - y0 - 0.5 * VOLLEY.grav * T * T) / T, id: this.sid('thorn') }); sfx('whoosh', 0.5, 1.6);
    }
    return a.t > 20 + n * every + 24;
  }
  /** Thorns fly and stick in the floor (gone). */
  stepThorns(match, out) {
    for (const t of this.thorns) { t.vy += VOLLEY.grav; t.x += t.vx; t.y += t.vy; out.push(this.bhit(t.id, t.x - 9, t.y - 9, t.x + 9, t.y + 9, ...VOLLEY.hit, { dirX: Math.sign(t.vx) || 1 })); if (t.y >= -2) { t.dead = true; this.burst(match, t.x, -3, [C.root[3], C.moss[2]], 4); } }
    this.thorns = this.thorns.filter((t) => !t.dead && t.y < 400);
  }
  /** VERDANT FURY (BERSERK): he roars, and thorn roots erupt across the whole floor from one side to the other. */
  atk_fury(match, a) {
    this.aim('grasp', 0.2);
    if (a.t === 20) { const s = Math.random() < 0.5 ? -1 : 1; sfx('roar', 0.8, 1.2); match.shake(6, 30); for (let k = 0; k <= 13; k++) this.spike(-s * 260 + s * k * FURY.gap, k * FURY.every, FURY.hit, 'fury'); }
    return a.t > 30 && !this.spikes.length;
  }
  /** The thorn spikes: a crack, then a spike bursting up, then sinking. */
  stepSpikes(out) {
    for (const s of this.spikes) { s.t++; if (s.t > 8 && s.t < 8 + SPIKE.life * 0.6) out.push(this.bhit(s.id, s.x - 15, -SPIKE.h, s.x + 15, 0, ...s.hit)); if (s.t === 9) sfx('slash', 0.25, 1.6); }
    this.spikes = this.spikes.filter((s) => s.t < 8 + SPIKE.life);
  }

  /**
   * HIS SOUL COMES OUT: his body slumps to one knee and the soul slips out through the visor, flies over to the
   * nearest player and taunts them - bobbing just out of reach, darting to their other side, pulling faces - the
   * only time he can be hurt. Then it flies home and he stands back up.
   */
  atk_soul(match, a) {
    const S = this.soul, out = this.sp(SOUL.out), j = this.joints();
    this.aim('kneel', 0.08);
    if (a.t === 30) {
      S.st = 'out'; S.x = j.head.x; S.y = j.head.y; S.t = 0; S.side = Math.random() < 0.5 ? -1 : 1; sfx('soulhit', 0.8, 1.2); sfx('laugh', 0.5, 1.6);
      this.soulN = (this.soulN || 0) + 1;
      if (this.soulN >= 2) {                                                         // THE SHELL GAME
        this.decoys = []; for (let i = 0; i < DECOY.n; i++) this.decoys.push({ x: S.x, y: S.y, id: this.sid('decoy'), seen: new Set() });
        this.ring = { a: Math.random() * 6, slot: Math.floor(Math.random() * (DECOY.n + 1)) };
        match.popText({ x: S.x, y: S.y + 50 }, 'WHICH ONE IS ME?', '#9affd0'); sfx('glitch', 0.4, 1.8);
      }
    }
    if (S.st === 'out' && this.decoys) {
      S.t++;
      const tg = this.nearest(match, S.x) || { x: 0, y: 0 }, R = this.ring, all = DECOY.n + 1, cx = Phaser.Math.Clamp(tg.x, -230, 230), cy = Math.max(-200, tg.y - 64);
      const spin = S.t % DECOY.every > DECOY.every - DECOY.spin;
      R.a += spin ? 0.14 : DECOY.turn;
      if (S.t % DECOY.every === DECOY.every - DECOY.spin) { sfx('whoosh', 0.6, 1.3); sfx('laugh', 0.3, 2); }
      const at = (k) => ({ x: cx + Math.cos(R.a + k / all * Math.PI * 2) * DECOY.r, y: cy + Math.sin(R.a + k / all * Math.PI * 2) * DECOY.r * 0.6 });
      const p0 = at(R.slot); S.vx *= 0.85; S.x += (p0.x - S.x) * 0.12 + S.vx; S.y += (p0.y - S.y) * 0.12;
      let k = 0; for (const d of this.decoys) { if (k === R.slot) k++; const p = at(k++); if (d.fuse == null) { d.x += (p.x - d.x) * 0.12; d.y += (p.y - d.y) * 0.12; } }
      if (S.t % 55 === 20) { const who = [S, ...this.decoys][Math.floor(Math.random() * (this.decoys.length + 1))]; match.popText({ x: who.x, y: who.y + 46 }, SOUL.lines[Math.floor(Math.random() * SOUL.lines.length)], '#9affd0'); sfx('laugh', 0.35, 1.8); }
      if (S.t >= out) { S.st = 'back'; sfx('soulhit', 0.6, 0.8); for (const d of this.decoys) this.burst(match, d.x, d.y, [C.soul[0], C.soul[2]], 6); this.decoys = null; }
    } else if (S.st === 'out') {
      S.t++;
      const tg = this.nearest(match, S.x) || { x: 0, y: 0 };
      if (S.t % 110 === 109) S.side = -S.side;                                        // drifts round to your other side
      if (Math.abs(tg.x - S.x) < 26 && S.t % 30 === 0) S.side = -S.side;
      const tx = Phaser.Math.Clamp(tg.x + S.side * 62, -280, 280), ty = Math.max(-260, tg.y - 70 + Math.sin(S.t * 0.12) * 16);
      S.vx *= 0.85; S.x += (tx - S.x) * SOUL.speed + S.vx; S.y += (ty - S.y) * SOUL.speed;
      if (S.t % 55 === 20) { match.popText({ x: S.x, y: S.y + 46 }, SOUL.lines[Math.floor(Math.random() * SOUL.lines.length)], '#9affd0'); sfx('laugh', 0.35, 1.8); }
      if (S.t >= out) { S.st = 'back'; sfx('soulhit', 0.6, 0.8); }
    } else if (S.st === 'back') {
      S.x += (j.head.x - S.x) * 0.12; S.y += (j.head.y - S.y) * 0.12;
      if (Math.hypot(j.head.x - S.x, j.head.y - S.y) < 8) { S.st = 'home'; a.home = a.t; sfx('clang', 0.6, 0.6); }
    }
    if (a.home) { this.aim('idle', 0.12); return a.t > a.home + 30; }
    return false;
  }

  /** THE SHELL GAME's fakes: a hit one flashes and swells for `DECOY.fuse` frames, then bursts into thorns. */
  stepDecoys(match, out) {
    if (!this.decoys) return;
    for (const d of this.decoys) {
      if (d.fuse == null) continue;
      d.fuse++;
      if (d.fuse === DECOY.fuse) { sfx('slash', 0.8, 0.8); sfx('rumble', 0.5, 1.6); match.shake(4, 6); for (let i = 0; i < 14; i++) { const q = i / 14 * Math.PI * 2; match.particles.push({ x: d.x, y: d.y, vx: Math.cos(q) * 4, vy: Math.sin(q) * 4, life: 18, color: i % 2 ? C.root[3] : C.moss[3], size: 3, drag: 0.92 }); } }
      if (d.fuse >= DECOY.fuse && d.fuse < DECOY.fuse + 6) out.push(this.bhit(d.id + 'x', d.x - DECOY.burst, d.y - DECOY.burst, d.x + DECOY.burst, d.y + DECOY.burst, ...DECOY.hit, { radial: true }));
      if (d.fuse > DECOY.fuse + 6) d.dead = true;
    }
    this.decoys = this.decoys.filter((d) => !d.dead);
  }
  /** The players' hits: on him (BossArena), and on THE SHELL GAME's fakes - FAKE!, and the fake bursts into thorns. */
  strikeTargets(match, hbs) {
    super.strikeTargets(match, hbs);
    if (!this.decoys) return;
    for (const d of this.decoys) for (const hb of hbs) {
      if (!hb.owner || d.fuse != null || d.seen.has(hb.id) || !(hb.x1 < d.x + 20 && hb.x2 > d.x - 20 && hb.y1 < d.y + 20 && hb.y2 > d.y - 20)) continue;
      d.seen.add(hb.id); d.fuse = 0; match.popText({ x: d.x, y: d.y + 46 }, 'FAKE!', '#ff9a9a'); sfx('laugh', 0.6, 1.5); sfx('soulhit', 0.6, 0.6);
    }
  }

  /** You lost: he raises the maul, and his soul (bared or not) slips out to dance round his helm (BossArena.bossTaunt). */
  onGloat(match, t) { this.aim('pose', 0.2); this.decoys = null; const j = this.joints(), S = this.soul; S.st = 'out'; S.flash = 0; S.x = j.head.x + Math.cos(t * 0.1) * 50; S.y = j.head.y - 30 + Math.sin(t * 0.2) * 16; S.vx = Math.cos(t * 0.1) < 0 ? 1 : -1; if (t % 50 === 10) match.popText({ x: S.x, y: S.y + 46 }, 'NYAH!', '#9affd0'); }
  /** A burst of bits (stone, leaves, moss). */
  burst(match, x, y, cols, n) { for (let i = 0; i < n; i++) match.particles.push({ x, y, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 4, life: 20 + Math.random() * 12, color: cols[i % cols.length], size: 3, grav: 0.15 }); }
  /** His death: he crumbles to his knees, the roots letting go (the explosions come from BossArena). */
  /** His death runs longer than the default (AT PEACE). */
  deathLen() { return REST.len; }
  /**
   * HIS DEATH - AT PEACE: he sinks to his knee and the light in his visor goes out; his soul slips free and floats up
   * out of the helm, free at last (FREE!); the grove takes him back - roots wind up his armour, moss and leaves cover
   * him, flowers bloom all round him (`bloom`) - and the soul spins up into the light and bursts into fireflies.
   */
  stepDeath(match) {
    const d = this.boss.dying, S = this.soul, j = this.joints();
    this.aim('kneel', 0.05);
    if (d === 1) sfx('clang', 0.8, 0.5);
    if (d < REST.free) { S.st = 'home'; this.lit = Math.max(0, (this.lit ?? 1) - 0.03); }
    if (d === REST.free) { S.st = 'free'; S.x = j.head.x; S.y = j.head.y; sfx('soulhit', 0.8, 1.2); match.popText({ x: j.head.x, y: j.head.y + 10 }, 'FREE!', '#9affd0'); }
    if (S.st === 'free') {
      const q = (d - REST.free) / (REST.len - REST.free);
      if (d < REST.away) { S.x = j.head.x + Math.sin(d * 0.05) * 30; S.y = j.head.y - 20 - Math.min(1, (d - REST.free) / 60) * 50 + Math.sin(d * 0.09) * 6; }
      else { S.y -= 2.4 + (d - REST.away) * 0.05; S.x += Math.sin(d * 0.3) * 4; if (d % 4 === 0) match.particles.push({ x: S.x, y: S.y, vx: (Math.random() - 0.5) * 2, vy: Math.random() * 1.5, life: 40, color: [0x9affd0, 0xe8ffa0, 0xffffff][d % 3], size: 2, drag: 0.97 }); }
      if (d === REST.away + 60) { for (let i = 0; i < 30; i++) { const a = Math.random() * Math.PI * 2, v = 1 + Math.random() * 3; match.particles.push({ x: S.x, y: S.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 60 + Math.random() * 40, color: [0x9affd0, 0xe8ffa0, 0xfff8c0][i % 3], size: 2, drag: 0.96, grav: -0.01 }); } sfx('ding', 0.8, 1.6); sfx('summon', 0.6, 1.4); S.st = 'gone'; }
      this.restK = q;
    }
    if (d >= REST.grow) {                                                            // the grove takes him back
      if (!this.bloom) this.bloom = Array.from({ length: 26 }, (_, i) => ({ x: j.hip.x + (Math.random() - 0.5) * 220, at: REST.grow + Math.random() * 120, c: [0xff7aa0, 0xffe060, 0xffffff, 0xb08aff, 0xff9a50][i % 5], s: 0.7 + Math.random() * 0.6 }));
      if (d % 30 === 0) sfx('petal', 0.5, 0.9 + Math.random() * 0.4);
    }
  }
  /** The death's greenery (roots and leaves climbing his armour) and the flowers blooming round him, and the freed soul. */
  drawRest(x) {
    const B = this.boss; if (!B || !B.dying) return;
    const d = B.dying, j = this.joints(), t = this.t;
    const g = Math.max(0, Math.min(1, (d - REST.grow) / 140));
    if (g > 0) {
      const pts = [j.ft1, j.kn1, j.hip, j.chest, j.s1, j.e1, j.head, j.ft2, j.kn2, j.s2, j.e2];
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; if (i === 6) continue; const k = Math.min(1, g * 1.4 - i * 0.06); if (k <= 0) continue; x.lineStyle(4, C.moss ? C.moss[1] : 0x3a6a2a, 0.9); x.lineBetween(a.x, a.y, a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k); x.lineStyle(2, 0x5a9a3a, 1); x.lineBetween(a.x + 2, a.y, a.x + (b.x - a.x) * k + 2, a.y + (b.y - a.y) * k); }
      x.lineStyle(0);
      for (let i = 0; i < 30; i++) { const q = pts[i % pts.length], k = g * 30 - i; if (k <= 0) continue; const r = Math.min(1, k) * (3 + (i % 3)); x.fillStyle([0x4a8a30, 0x6aaa3a, 0x2a6a2a][i % 3], 1); x.fillEllipse(q.x + Math.sin(i * 2.3) * 12, q.y + Math.cos(i * 1.7) * 10, r * 2.2, r * 1.4); }
    }
    for (const F of this.bloom || []) {                                              // flowers opening on the ground
      const k = Math.max(0, Math.min(1, (d - F.at) / 30)) * F.s; if (k <= 0) continue;
      x.lineStyle(2, 0x3a7a2a, 1); x.lineBetween(F.x, 0, F.x, -10 * k); x.lineStyle(0);
      for (let p = 0; p < 5; p++) { const a = p / 5 * Math.PI * 2 + t * 0.01; x.fillStyle(F.c, 1); x.fillCircle(F.x + Math.cos(a) * 4 * k, -10 * k + Math.sin(a) * 4 * k, 2.6 * k); }
      x.fillStyle(0xffe060, 1); x.fillCircle(F.x, -10 * k, 1.8 * k);
    }
    const S = this.soul;
    if (S.st === 'free') { x.fillStyle(0x9affd0, 0.15); x.fillCircle(S.x, S.y, 24 + Math.sin(t * 0.2) * 4); this.drawSoul(x, S.x, S.y, 1, false, false); }
  }
  onDeath() { this.bloom = null; this.restK = 0; this.decoys = null; this.soul.st = 'home'; this.spikes = []; this.marks = []; }

  /**
   * THE ENTRANCE (k = 0..1): his empty armour kneels in the clearing, dark and overgrown; his soul drifts in out of
   * the trees, circles once and dives into the helm; the visor lights green, the roots holding him tear free, he
   * stands, swings the maul down into the earth and raises his shield - the pose the freeze frame stops on.
   */
  introPose(match, k, t, n) {
    this.t++;
    const D = this.kn, S = this.soul, e = (a, b) => Phaser.Math.Clamp((k - a) / (b - a), 0, 1);
    D.x = 70; D.dir = -1; D.y = 0;
    if (k < 0.5) { this.aim('kneel', 1); this.lit = 0; }
    const fly = e(0.08, 0.46), j = this.joints();
    if (k < 0.08) { S.st = 'gone'; }
    else if (k < 0.46) { S.st = 'out'; const q = fly; S.x = lerp(-320, j.head.x, q) + Math.sin(q * Math.PI * 2) * 60 * (1 - q); S.y = lerp(-220, j.head.y, q) - Math.sin(q * Math.PI) * 50; S.t = t; }
    else { S.st = 'home'; }
    if (t === Math.round(0.46 * n)) { sfx('soulhit', 1, 1); sfx('clang', 0.8, 0.5); this.lit = 1; for (let i = 0; i < 20; i++) { const q = i / 20 * Math.PI * 2; match.particles.push({ x: j.head.x, y: j.head.y, vx: Math.cos(q) * 3, vy: Math.sin(q) * 3, life: 24, color: C.soul[i % 3], size: 3, drag: 0.92 }); } }
    if (k >= 0.5 && k < 0.72) { this.aim('idle', 0.06); if (t % 8 === 0) { match.shake(3, 6); this.burst(match, D.x + (Math.random() - 0.5) * 80, -4, [C.root[2], C.moss[2], C.leaf[0]], 4); } if (t === Math.round(0.5 * n)) sfx('rumble', 1, 0.6); }
    if (k >= 0.72 && k < 0.84) this.aim('over', 0.15);
    if (k >= 0.84) this.aim('pose', 0.35);
    if (t === Math.round(0.86 * n)) { sfx('bighit', 1, 0.5); match.shake(9, 12); const jj = this.joints(); this.burst(match, jj.tip.x, -4, [C.stone[3], C.moss[2], C.leaf[0], C.leaf[1]], 24); }
  }
  /** The entrance's camera: close on the kneeling armour, following the soul in, low as he stands, back for the pose. */
  introShot(k) {
    const j = this.joints(), S = this.soul;
    if (k < 0.08) return { x: j.chest.x, y: j.chest.y, zoom: 1.35 };
    if (k < 0.46) return { x: S.x, y: S.y + 20, zoom: 1.2 };
    if (k < 0.72) return { x: j.chest.x, y: j.chest.y + 10, zoom: 1.3 };
    return { x: 50, y: -120, zoom: 0.98 };
  }
  /** The freeze frame: him standing tall behind his shield. */
  introAt() { const j = this.joints(); return { x: j.chest.x - 10, y: j.chest.y + 10, zoom: 1.0 }; }
  /** After the intro: the soul is home and lit. */
  endIntro() { super.endIntro(); this.soul.st = 'home'; this.lit = 1; }

  // ------------------------------------------------------------------ hazards (VS too)
  start_thorns(match, h) { h.title = 'THORN ROOTS!'; h.s = Math.random() < 0.5 ? -1 : 1; for (let k = 0; k <= 12; k++) this.spike(-h.s * 255 + h.s * k * THORNS.gap, 30 + k * THORNS.every, THORNS.hit, 'hz'); }
  /** THORN ROOTS: the line of spikes runs across the floor (stepSpikes does the work). */
  step_thorns(match, h) { return h.t > 30 + 13 * THORNS.every + SPIKE.life + 10; }
  start_spores(match, h) { h.title = 'SPORE BURST!'; }
  /** SPORE BURST: the mushrooms swell and glow, then puff clouds of stinging spores. */
  step_spores(match, h, out) {
    if (h.t < SPORES.warn) { this.clouds = { k: h.t / SPORES.warn }; return false; }
    if (h.t === SPORES.warn) sfx('smoke', 0.8, 1.2);
    if (h.t < SPORES.warn + SPORES.on) { this.clouds = { on: (h.t - SPORES.warn) / SPORES.on }; for (const s of [-1, 1]) out.push(this.bhit('sp' + h.id + s + Math.floor(h.t / 20), s * SPORES.x - SPORES.r, -SPORES.r * 1.4, s * SPORES.x + SPORES.r, 0, ...SPORES.hit)); return false; }
    this.clouds = null; return true;
  }

  /** Moves the grove and THORNWARD one frame; returns hazard + boss hitboxes. */
  step(match) {
    this.t++;
    const out = [];
    this.cycle.run(match, out);
    if (this.boss) {
      this.bossStep(match, out);
      if (this.boss.dying) this.aim('kneel', 0.04);
      this.stepMarks(out); this.stepThorns(match, out); this.stepDecoys(match, out);
      if (this.soul.flash > 0) this.soul.flash--;
    }
    this.stepSpikes(out);
    if (this.t % 9 === 0 && this.leaves.length < 30) this.leaves.push({ x: (Math.random() - 0.5) * 700, y: -420, vx: 0.3 + Math.random() * 0.5, p: Math.random() * 6, c: C.leaf[Math.floor(Math.random() * 3)] });
    for (const l of this.leaves) { l.y += 0.8; l.x += l.vx + Math.sin(this.t * 0.04 + l.p) * 0.6; }
    this.leaves = this.leaves.filter((l) => l.y < 40);
    return out;
  }

  // ------------------------------------------------------------------ drawing
  /** Draws the light shafts, THORNWARD (or his kneeling armour in VS) and his soul, the thorns, roots, spores, leaves, fireflies. */
  render() {
    const t = this.t, B = this.boss, g = this.knG, x = this.fxG, r = this.rayG;
    r.clear();
    for (let i = 0; i < 5; i++) { const x0 = -260 + i * 130 + Math.sin(t * 0.01 + i) * 10, a = 0.06 + 0.03 * Math.sin(t * 0.02 + i * 2); r.fillStyle(0xe8f8a0, a); r.fillPoints([{ x: x0, y: -420 }, { x: x0 + 40, y: -420 }, { x: x0 + 160, y: 100 }, { x: x0 + 80, y: 100 }], true); }
    g.clear(); x.clear();
    if (!B) { this.aim('kneel', 1); this.kn.x = 0; this.kn.dir = 1; this.lit = 0; this.soul.st = 'home'; }
    this.drawKnight(g, B ? B.flash > 0 && this.bare() : false);
    this.drawRest(x);
    const S = this.soul;
    if (S.st === 'out' || S.st === 'back') this.drawSoul(x, S.x, S.y, 1, S.flash > 0, true);
    if (this.decoys) for (const d of this.decoys) {
      if (d.fuse != null) { const k = d.fuse / DECOY.fuse; x.fillStyle(0xff5a5a, 0.3 * k); x.fillCircle(d.x, d.y, 20 + 30 * k); this.drawSoul(x, d.x, d.y, 1 + 0.4 * k, t % 4 < 2, true, true); }
      else this.drawSoul(x, d.x, d.y, 1, false, true, true);
    }
    for (const m of this.marks) {
      if (m.t < this.sp(GRASP.warn)) { const q = m.t / this.sp(GRASP.warn); x.fillStyle(C.moss[3], 0.3 + 0.4 * q * (t % 6 < 3 ? 1 : 0.6)); x.fillEllipse(m.x, -1, 40 + 10 * q, 7); for (let i = 0; i < 3; i++) { x.lineStyle(2, C.root[1], 0.8); x.lineBetween(m.x - 18 + i * 12, -1, m.x - 14 + i * 12 + Math.sin(t + i) * 2, -6 * q); x.lineStyle(0); } }
      else { const h = Math.min(1, (m.t - this.sp(GRASP.warn)) / 5) * 110; for (let i = 0; i < 3; i++) this.root(x, m.x - 12 + i * 12, 0, h * (0.8 + (i % 2) * 0.2), (i - 1) * 0.2); }
    }
    for (const s of this.spikes) {
      if (s.t <= 0) continue;
      if (s.t <= 8) { x.fillStyle(C.root[1], 1); x.fillRect(s.x - 10, -2, 20, 3); x.fillStyle(C.moss[3], 0.6); x.fillRect(s.x - 6, -3, 12, 2); continue; }
      const k = s.t < 12 ? (s.t - 8) / 4 : s.t > SPIKE.life ? Math.max(0, (8 + SPIKE.life - s.t) / 8) : 1;
      this.thorn(x, s.x, SPIKE.h * k);
    }
    for (const th of this.thorns) { const a = Math.atan2(th.vy, th.vx), ca = Math.cos(a), sa = Math.sin(a); x.fillStyle(C.out, 1); x.fillTriangle(th.x + ca * 12, th.y + sa * 12, th.x - ca * 8 - sa * 5, th.y - sa * 8 + ca * 5, th.x - ca * 8 + sa * 5, th.y - sa * 8 - ca * 5); x.fillStyle(C.root[3], 1); x.fillTriangle(th.x + ca * 10, th.y + sa * 10, th.x - ca * 6 - sa * 3, th.y - sa * 6 + ca * 3, th.x - ca * 6 + sa * 3, th.y - sa * 6 - ca * 3); }
    if (this.clouds) for (const s of [-1, 1]) {
      const cx = s * SPORES.x;
      if (this.clouds.on == null) { x.fillStyle(C.shroom[1], 0.15 + 0.3 * this.clouds.k * (t % 8 < 4 ? 1 : 0.6)); x.fillCircle(cx, -30, 26 + 10 * this.clouds.k); }
      else for (let i = 0; i < 14; i++) { const q = i / 14 * Math.PI * 2 + t * 0.02, rr = SPORES.r * (0.5 + 0.5 * this.clouds.on) * (0.6 + 0.4 * ((i * 7) % 5) / 5); x.fillStyle(C.spore, 0.22); x.fillCircle(cx + Math.cos(q) * rr * 0.8, -40 + Math.sin(q) * rr * 0.6 - this.clouds.on * 20, 16 + (i % 3) * 6); }
    }
    for (const l of this.leaves) { x.fillStyle(l.c, 0.9); x.fillEllipse(l.x, l.y, 6, 3 + Math.sin(t * 0.1 + l.p) * 2); }
    for (const f of this.flies) { const fx = f.x + Math.sin(t * 0.013 + f.p) * 30, fy = f.y + Math.sin(t * 0.021 + f.p * 2) * 18, a = 0.5 + 0.5 * Math.sin(t * 0.08 + f.p * 3); x.fillStyle(0xf0ff90, 0.18 * a); x.fillCircle(fx, fy, 6); x.fillStyle(0xf8ffc0, a); x.fillRect(fx - 1, fy - 1, 2, 2); }
    if (B) this.drawBar();
  }
  /** One thorn spike rising from the floor (h tall). */
  thorn(g, x, h) {
    if (h <= 1) return;
    g.fillStyle(C.out, 1); g.fillTriangle(x - 13, 1, x + 13, 1, x + 2, -h - 3);
    g.fillStyle(C.root[2], 1); g.fillTriangle(x - 10, 0, x + 10, 0, x + 1, -h); g.fillStyle(C.root[3], 1); g.fillTriangle(x - 4, 0, x + 2, 0, x + 1, -h);
    for (let i = 1; i < 4; i++) { const yy = -h * i / 4, s = i % 2 ? 1 : -1, w = 10 * (1 - i / 4); g.fillStyle(C.root[1], 1); g.fillTriangle(x + s * w * 0.5, yy, x + s * w * 0.5, yy + 6, x + s * (w + 8), yy - 4); }
    g.fillStyle(C.moss[3], 1); g.fillEllipse(x - 3, -h * 0.3, 6, 3);
  }
  /** A grasping root rising from the floor at x (h tall), leaning a little. */
  root(g, x, y, h, lean) {
    const pts = []; for (let i = 0; i <= 8; i++) { const q = i / 8; pts.push({ x: x + Math.sin(q * 3 + this.t * 0.1) * 4 + lean * h * q, y: y - h * q }); }
    for (const [lw, c] of [[11, C.out], [8, C.root[2]], [3, C.root[3]]]) { g.lineStyle(lw * 1, c, 1); for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y); }
    g.lineStyle(0); const tp = pts[pts.length - 1]; g.fillStyle(C.root[2], 1); g.fillTriangle(tp.x - 4, tp.y + 2, tp.x + 4, tp.y + 2, tp.x + lean * 10, tp.y - 10);
  }

  /**
   * His soul: a glowing green wisp with a flame-tail trailing behind it and a face - big dark eyes, a wide grin;
   * taunting, it squints and sticks its tongue out every other moment. s = scale; flash = white when hit; fake = one
   * of THE SHELL GAME's fakes (no twinkle in its eyes - the tell).
   */
  drawSoul(g, x, y, s, flash, taunt, fake = false) {
    const t = this.t, S = this.soul, back = S.vx ? -Math.sign(S.vx) : (S.side || 1), col = flash ? [0xffffff, 0xffffff, 0xffffff, 0xffffff] : C.soul;
    for (let i = 0; i < 4; i++) { g.fillStyle(col[0], 0.08 + i * 0.04); g.fillCircle(x, y, (34 - i * 6) * s); }
    for (let i = 0; i < 5; i++) { const q = i / 5, tx = x + back * (8 + q * 20) * s + Math.sin(t * 0.3 + i) * 3, ty = y + Math.sin(t * 0.2 + i * 1.3) * 4 * s; g.fillStyle(col[i % 2 ? 1 : 0], 0.7 - q * 0.4); g.fillCircle(tx, ty, (11 - q * 8) * s); }
    g.fillStyle(col[1], 1); g.fillCircle(x, y, 14 * s); g.fillStyle(col[2], 1); g.fillCircle(x - 3 * s, y - 3 * s, 9 * s); g.fillStyle(col[3], 1); g.fillCircle(x - 5 * s, y - 6 * s, 3 * s);
    const sq = taunt && t % 40 < 20;
    for (const ex of [-5, 5]) {
      if (sq) { g.lineStyle(2 * s, 0x0a3a2a, 1); g.lineBetween(x + (ex - 3) * s, y - 2 * s, x + ex * s, y - 5 * s); g.lineBetween(x + ex * s, y - 5 * s, x + (ex + 3) * s, y - 2 * s); g.lineStyle(0); }
      else { g.fillStyle(0x0a3a2a, 1); g.fillEllipse(x + ex * s, y - 3 * s, 5 * s, 7 * s); if (!fake) { g.fillStyle(0xffffff, 1); g.fillCircle(x + (ex - 1) * s, y - 5 * s, 1.2 * s); } }
    }
    g.fillStyle(0x0a3a2a, 1); g.fillEllipse(x, y + 5 * s, 12 * s, 5 * s); g.fillStyle(col[1], 1); g.fillEllipse(x, y + 3.6 * s, 12 * s, 3 * s);
    if (sq) { g.fillStyle(0xff7aa8, 1); g.fillEllipse(x + 1 * s, y + 8 * s, 5 * s, 6 * s); }
  }

  /**
   * THORNWARD, from his skeleton: a tattered moss cloak behind him, his shield arm and back leg, a body of mossy
   * plate armour with bronze trim wound about with roots, the front leg, the antlered great helm (the soul's glow in
   * its visor slit - or, bared, the soul itself in the torn-open visor), a mossy pauldron with glowing mushrooms, the
   * maul arm and the maul (a boulder bound with roots to a trunk). Vines with leaves sprout from the joints.
   */
  drawKnight(g, flash) {
    const j = this.joints(), D = this.kn, d = D.dir, A = C.armor, berserk = this.boss && this.boss.phase === 2, t = this.t;
    const ac = flash ? [0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xffffff] : A;
    const quad = (a, b, wa, wb) => { const L = Math.hypot(b.x - a.x, b.y - a.y) || 1, nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L; return [{ x: a.x + nx * wa, y: a.y + ny * wa }, { x: b.x + nx * wb, y: b.y + ny * wb }, { x: b.x - nx * wb, y: b.y - ny * wb }, { x: a.x - nx * wa, y: a.y - ny * wa }]; };
    const roots = (a, b, w, n) => { for (let i = 0; i < n; i++) { const q1 = (i + 0.2) / n, q2 = (i + 0.75) / n, L = Math.hypot(b.x - a.x, b.y - a.y) || 1, nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L; const p1 = { x: lerp(a.x, b.x, q1) + nx * w, y: lerp(a.y, b.y, q1) + ny * w }, p2 = { x: lerp(a.x, b.x, q2) - nx * w, y: lerp(a.y, b.y, q2) - ny * w }; g.lineStyle(5, C.out, 1); g.lineBetween(p1.x, p1.y, p2.x, p2.y); g.lineStyle(3, C.root[2], 1); g.lineBetween(p1.x, p1.y, p2.x, p2.y); g.lineStyle(0); } };
    const limb = (a, b, wa, wb, cols, nr = 2) => {
      g.fillStyle(C.out, 1); g.fillPoints(quad(a, b, wa + 2.5, wb + 2.5), true); g.fillStyle(cols[0], 1); g.fillPoints(quad(a, b, wa, wb), true);
      g.fillStyle(cols[1], 1); g.fillPoints(quad(a, b, wa * 0.5, wb * 0.5).slice(0, 2).concat(quad(a, b, wa * 0.05, wb * 0.05).slice(0, 2).reverse()), true);
      roots(a, b, wa * 0.9, nr);
      g.fillStyle(C.out, 1); g.fillCircle(b.x, b.y, wb + 3); g.fillStyle(C.bronze[1], 1); g.fillCircle(b.x, b.y, wb + 0.5); g.fillStyle(cols[0], 1); g.fillCircle(b.x, b.y, wb - 2);
    };
    const leaf = (x, y, q) => { g.fillStyle(C.leaf[1], 1); g.fillEllipse(x + Math.cos(q) * 5, y + Math.sin(q) * 5, 9, 5); g.fillStyle(C.leaf[0], 1); g.fillEllipse(x + Math.cos(q) * 5, y + Math.sin(q) * 5 + 1, 6, 2); };
    // the moss cloak behind him
    const cb = { x: j.s2.x - d * 6, y: j.s2.y - 4 }, sway = Math.sin(t * 0.05) * 6;
    g.fillStyle(C.out, 1); g.fillPoints([cb, { x: j.s1.x, y: j.s1.y - 6 }, { x: j.hip.x - d * 30 + sway, y: j.hip.y + 40 }, { x: j.hip.x - d * 52 + sway, y: j.hip.y + 30 }], true);
    g.fillStyle(C.moss[1], 1); g.fillPoints([{ x: cb.x, y: cb.y + 2 }, { x: j.s1.x - d * 4, y: j.s1.y - 3 }, { x: j.hip.x - d * 32 + sway, y: j.hip.y + 36 }, { x: j.hip.x - d * 49 + sway, y: j.hip.y + 27 }], true);
    for (let i = 0; i < 5; i++) { const x0 = lerp(j.hip.x - d * 32, j.hip.x - d * 49, i / 4) + sway; g.fillStyle(C.moss[i % 2 ? 0 : 2], 1); g.fillTriangle(x0 - 4, j.hip.y + 28, x0 + 4, j.hip.y + 28, x0 + Math.sin(t * 0.1 + i) * 2, j.hip.y + 42 + (i % 2) * 6); }
    // shield arm and back leg
    limb(j.hip, j.kn2, 16, 12, [ac[1], ac[2]]); limb(j.kn2, j.ft2, 12, 10, [ac[1], ac[2]]); g.fillStyle(C.out, 1); g.fillRoundedRect(j.ft2.x - 14 + d * 4, j.ft2.y - 10, 30, 12, 4); g.fillStyle(ac[2], 1); g.fillRoundedRect(j.ft2.x - 12 + d * 4, j.ft2.y - 8, 26, 8, 3);
    limb(j.s2, j.e2, 14, 12, [ac[1], ac[2]]); limb(j.e2, j.h2, 12, 10, [ac[1], ac[2]]);
    // the body: plate, bronze trim, roots wound round it
    g.fillStyle(C.out, 1); g.fillPoints(quad(j.hip, j.chest, 30, 44), true);
    g.fillStyle(ac[2], 1); g.fillPoints(quad(j.hip, j.chest, 27, 41), true);
    g.fillStyle(ac[3], 1); g.fillPoints(quad({ x: lerp(j.hip.x, j.chest.x, 0.35), y: lerp(j.hip.y, j.chest.y, 0.35) }, j.chest, 12, 28), true);
    g.fillStyle(ac[4], 1); g.fillPoints(quad({ x: lerp(j.hip.x, j.chest.x, 0.6), y: lerp(j.hip.y, j.chest.y, 0.6) }, j.chest, 4, 12), true);
    for (const q of [0.33, 0.66]) { const a = { x: lerp(j.hip.x, j.chest.x, q), y: lerp(j.hip.y, j.chest.y, q) }, w = lerp(27, 41, q); g.fillStyle(C.bronze[1], 1); g.fillPoints(quad({ x: a.x, y: a.y - 2 }, { x: a.x, y: a.y + 2 }, w, w).map((p, i) => ({ x: p.x, y: p.y })), true); }
    roots(j.hip, j.chest, 34, 3);
    for (let i = 0; i < 4; i++) leaf(lerp(j.hip.x, j.chest.x, 0.2 + i * 0.2) + (i % 2 ? 16 : -16), lerp(j.hip.y, j.chest.y, 0.2 + i * 0.2), i * 1.7);
    g.fillStyle(C.moss[2], 1); g.fillEllipse(j.chest.x - d * 10, j.chest.y + 4, 30, 12); g.fillStyle(C.moss[3], 1); g.fillEllipse(j.chest.x - d * 12, j.chest.y + 2, 18, 6);
    g.fillStyle(C.bronze[0], 1); g.fillPoints(quad({ x: j.hip.x, y: j.hip.y - 4 }, { x: j.hip.x, y: j.hip.y + 6 }, 30, 30), true);   // the belt
    for (let i = -2; i <= 2; i++) { g.fillStyle(ac[1], 1); g.fillTriangle(j.hip.x + i * 11 - 7, j.hip.y + 4, j.hip.x + i * 11 + 7, j.hip.y + 4, j.hip.x + i * 11, j.hip.y + 24); }   // tassets
    // the front leg
    limb(j.hip, j.kn1, 17, 13, [ac[2], ac[3]]); limb(j.kn1, j.ft1, 13, 11, [ac[2], ac[3]]); g.fillStyle(C.out, 1); g.fillRoundedRect(j.ft1.x - 15 + d * 5, j.ft1.y - 11, 32, 13, 4); g.fillStyle(ac[3], 1); g.fillRoundedRect(j.ft1.x - 13 + d * 5, j.ft1.y - 9, 28, 9, 3);
    leaf(j.kn1.x, j.kn1.y, -1.2); leaf(j.kn2.x, j.kn2.y, -2);
    // the head: antlers, the great helm, the visor
    const h = j.head, tilt = D.p.lean + D.p.head, HK = 1.45;
    const H = (lx, ly) => { lx *= HK; ly *= HK; const c = Math.cos(tilt), s = Math.sin(tilt); return { x: h.x + (lx * c - ly * s) * d, y: h.y + lx * s + ly * c }; };
    const HP = (pts, col) => { g.fillStyle(col, 1); g.fillPoints(pts.map(([x, y]) => H(x, y)), true); };
    for (const side of [-1, 1]) {                                                       // antlers, branching - one sweeping forward, one back
      const P = (x, y) => H(side > 0 ? x : -x - 4, y);
      const base = P(4, -14), mid = P(12, -28), tip = P(10, -44), b1 = P(24, -34), b2 = P(3, -36), b3 = P(18, -50);
      for (const [lw, c] of [[side > 0 ? 7 : 6, C.out], [side > 0 ? 4 : 3, side > 0 ? C.bark[3] : C.bark[2]]]) { g.lineStyle(lw, c, 1); g.lineBetween(base.x, base.y, mid.x, mid.y); g.lineBetween(mid.x, mid.y, tip.x, tip.y); g.lineBetween(mid.x, mid.y, b1.x, b1.y); g.lineBetween(tip.x, tip.y, b3.x, b3.y); g.lineBetween(P(8, -22).x, P(8, -22).y, b2.x, b2.y); }
      g.lineStyle(0); leaf(tip.x, tip.y, -1.6); leaf(b1.x, b1.y, side * 0.8);
    }
    HP([[-14, -16], [12, -16], [16, -6], [16, 14], [10, 18], [-14, 18], [-16, 4]], C.out);
    HP([[-12, -14], [10, -14], [14, -5], [14, 12], [9, 16], [-12, 16], [-14, 4]], ac[2]);
    HP([[-10, -12], [8, -12], [11, -6], [-10, -6]], ac[4]);
    HP([[-14, -4], [16, -4], [16, -1], [-14, -1]], C.bronze[1]);
    const bare = this.bare() || (this.boss && this.boss.dying);
    if (bare) {                                                                          // the visor torn open: the soul inside
      HP([[0, -2], [15, -2], [15, 12], [0, 12]], C.out);
      const c = H(8, 5); if (!['free', 'gone'].includes(this.soul.st)) this.drawSoul(g, c.x, c.y, 0.75, flash, berserk && t % 50 < 25);   // (dying: empty once it's slipped free)
      HP([[0, -2], [4, -2], [4, 12], [0, 12]], ac[1]);
    } else {
      HP([[2, 2], [15, 2], [15, 5], [2, 5]], C.out);                                     // the visor slit
      const lit = this.soul.st === 'home' ? this.lit : 0;
      if (lit) { const e = H(9, 3.5); g.fillStyle(C.soul[0], 0.18); g.fillCircle(e.x, e.y, 18); g.fillStyle(C.soul[0], 0.3); g.fillCircle(e.x, e.y, 9); HP([[2.5, 2.2], [15, 2.2], [15, 4.8], [2.5, 4.8]], C.soul[1]); HP([[6, 2.8], [12, 2.8], [12, 4.2], [6, 4.2]], C.soul[3]); }
      for (let i = 0; i < 4; i++) HP([[3 + i * 3, 7], [4 + i * 3, 7], [4 + i * 3, 13], [3 + i * 3, 13]], C.out);   // breaths
    }
    HP([[-14, 6], [-6, 6], [-6, 14], [-14, 14]], C.moss[2]); roots(H(-14, -10), H(14, 14), 4, 1);
    // the pauldron (mossy, mushrooms glowing on it), the maul arm, the maul
    const pa = j.s1;
    g.fillStyle(C.out, 1); g.fillEllipse(pa.x, pa.y, 52, 38); g.fillStyle(ac[3], 1); g.fillEllipse(pa.x, pa.y, 46, 32); g.fillStyle(ac[4], 1); g.fillEllipse(pa.x - 4, pa.y - 6, 26, 12);
    g.fillStyle(C.bronze[1], 1); g.fillEllipse(pa.x, pa.y + 10, 44, 8); g.fillStyle(C.moss[2], 1); g.fillEllipse(pa.x - d * 4, pa.y - 12, 34, 12); g.fillStyle(C.moss[3], 1); g.fillEllipse(pa.x - d * 6, pa.y - 14, 18, 5);
    for (const [ox, sz] of [[-10, 5], [-2, 7], [7, 4]]) { const mx = pa.x + ox * d, my = pa.y - 16; g.fillStyle(0xe8e0c8, 1); g.fillRect(mx - 1, my - sz, 2, sz); g.fillStyle(C.shroom[0], 1); g.fillEllipse(mx, my - sz, sz * 2, sz); g.fillStyle(C.shroom[1], 0.12); g.fillCircle(mx, my - sz, sz * 1.3); }
    limb(j.s1, j.e1, 15, 13, [ac[2], ac[3]]); limb(j.e1, j.h1, 13, 11, [ac[2], ac[3]]);
    this.drawMaul(g, j.h1, j.tip, berserk);
    g.fillStyle(C.out, 1); g.fillCircle(j.h1.x, j.h1.y, 13); g.fillStyle(ac[3], 1); g.fillCircle(j.h1.x, j.h1.y, 11);
    // the shield, on the back hand (in front of him when he guards)
    const sh = j.h2, up = { x: j.e2.x - j.h2.x, y: j.e2.y - j.h2.y }, ul = Math.hypot(up.x, up.y) || 1, ux = up.x / ul * 0.3, uy = -1;
    const pts = [[0, -44], [26, -36], [24, 6], [0, 40], [-24, 6], [-26, -36]].map(([px, py]) => ({ x: sh.x + d * 8 + px * 0.95 + ux * py * 0.2, y: sh.y + py * -uy * 0.95 }));
    g.fillStyle(C.out, 1); g.fillPoints(pts.map((p) => ({ x: sh.x + d * 8 + (p.x - sh.x - d * 8) * 1.1, y: sh.y + (p.y - sh.y) * 1.08 })), true);
    g.fillStyle(C.bark[2], 1); g.fillPoints(pts, true); g.fillStyle(C.bark[3], 1); g.fillPoints(pts.map((p) => ({ x: sh.x + d * 8 + (p.x - sh.x - d * 8) * 0.8, y: sh.y + (p.y - sh.y) * 0.82 })), true);
    g.lineStyle(3, C.bronze[1], 1); g.strokePoints(pts, true); g.lineStyle(0);
    const ex = sh.x + d * 8, ey = sh.y;                                                  // the carved tree on it
    g.fillStyle(C.bark[1], 1); g.fillRect(ex - 2, ey - 6, 4, 26); g.fillStyle(C.moss[berserk ? 3 : 2], 1); g.fillCircle(ex, ey - 12, 12); g.fillCircle(ex - 9, ey - 6, 7); g.fillCircle(ex + 9, ey - 6, 7);
    if (berserk) { g.fillStyle(C.soul[1], 0.3); g.fillCircle(ex, ey - 8, 20); }
    roots({ x: ex - 22, y: ey - 30 }, { x: ex + 20, y: ey + 20 }, 3, 2);
  }
  /** The maul from the hand along its haft: a trunk bound with bronze, a mossy boulder at the end wound with roots. */
  drawMaul(g, a, b, glow) {
    for (const [lw, c] of [[11, C.out], [8, C.bark[2]], [3, C.bark[4]]]) { g.lineStyle(lw, c, 1); g.lineBetween(a.x - (b.x - a.x) * 0.15, a.y - (b.y - a.y) * 0.15, b.x, b.y); }
    g.lineStyle(0);
    for (const q of [0.3, 0.75]) { g.fillStyle(C.bronze[1], 1); g.fillCircle(lerp(a.x, b.x, q), lerp(a.y, b.y, q), 6); }
    const rock = (r) => [0, 0.9, 1.7, 2.5, 3.3, 4.2, 5.0, 5.7].map((q, i) => ({ x: b.x + Math.cos(q) * r * (i % 2 ? 0.86 : 1.06), y: b.y + Math.sin(q) * r * (i % 3 ? 0.92 : 1.04) }));
    g.fillStyle(C.out, 1); g.fillPoints(rock(33), true); g.fillStyle(C.stone[2], 1); g.fillPoints(rock(30), true);
    g.fillStyle(C.stone[3], 1); g.fillCircle(b.x - 7, b.y - 8, 16); g.fillStyle(C.stone[4], 1); g.fillCircle(b.x - 11, b.y - 12, 6); g.fillStyle(C.stone[1], 1); g.fillCircle(b.x + 9, b.y + 10, 10);
    g.fillStyle(C.moss[2], 1); g.fillEllipse(b.x + 4, b.y - 20, 36, 13); g.fillStyle(C.moss[3], 1); g.fillEllipse(b.x + 2, b.y - 22, 18, 5);
    for (const [q1, q2] of [[-2.4, 0.4], [1.0, 3.2]]) {                                                   // roots wound round it (chords, not spokes)
      const p1 = { x: b.x + Math.cos(q1) * 30, y: b.y + Math.sin(q1) * 30 }, p2 = { x: b.x + Math.cos(q2) * 30, y: b.y + Math.sin(q2) * 30 };
      g.lineStyle(6, C.out, 1); g.lineBetween(p1.x, p1.y, p2.x, p2.y); g.lineStyle(3, C.root[2], 1); g.lineBetween(p1.x, p1.y, p2.x, p2.y);
    }
    g.lineStyle(0);
    if (glow) { g.fillStyle(C.soul[0], 0.25); g.fillCircle(b.x, b.y, 34); }
  }
}

/** THE ELDER GROVE's miniature for the stage select screen. */
export function drawElderGrovePreview(g, x, y, w, h) {
  C.sky.forEach((c, i, A) => { g.fillStyle(c, 1); g.fillRect(x, y + i * h / A.length, w, h / A.length + 1); });
  for (let i = 0; i < 7; i++) { g.fillStyle(C.far[i % 3], 1); g.fillRect(x + w * (0.05 + i * 0.14), y, w * 0.05, h * 0.7); }
  g.fillStyle(C.bark[2], 1); g.fillRect(x, y, w * 0.1, h); g.fillRect(x + w * 0.9, y, w * 0.1, h);
  g.fillStyle(C.stone[2], 1); g.fillRect(x + w * 0.1, y + h * 0.72, w * 0.8, h * 0.18); g.fillStyle(C.moss[2], 1); g.fillRect(x + w * 0.1, y + h * 0.7, w * 0.8, h * 0.04);
  const cx = x + w * 0.56, fy = y + h * 0.7;
  g.fillStyle(C.armor[2], 1); g.fillRect(cx - w * 0.05, fy - h * 0.42, w * 0.1, h * 0.3); g.fillRect(cx - w * 0.04, fy - h * 0.12, w * 0.03, h * 0.12); g.fillRect(cx + w * 0.01, fy - h * 0.12, w * 0.03, h * 0.12);
  g.fillRect(cx - w * 0.035, fy - h * 0.56, w * 0.07, h * 0.13); g.fillStyle(C.soul[1], 1); g.fillRect(cx - w * 0.02, fy - h * 0.5, w * 0.04, 2);
  g.fillStyle(C.bark[3], 1); g.fillTriangle(cx - 6, fy - h * 0.56, cx - 14, fy - h * 0.74, cx - 3, fy - h * 0.58); g.fillTriangle(cx + 6, fy - h * 0.56, cx + 14, fy - h * 0.74, cx + 3, fy - h * 0.58);
  g.fillStyle(C.soul[1], 0.8); g.fillCircle(x + w * 0.3, y + h * 0.35, h * 0.05);
}

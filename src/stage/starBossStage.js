// THE LAST OBSERVATORY - the arena of VESPERION, THE STAR-EATER (boss VIII, cosmic; Trinkets > BOSS FIGHTS, src/data/bosses.js).
// A ruined marble observatory floating in deep space: nebulae, a ringed gas giant and a far galaxy behind, broken
// columns and a giant brass telescope either side, great brass orrery rings sweeping round, a marble floor inlaid with
// gold zodiac circles on a chunk of violet crystal rock, and two marble ledges held up by brass armillary half-rings.
// VESPERION looms behind the floor - a titan the size of the sky: an ECLIPSE for a head (a black disk inside a blazing
// corona, a fan of golden sun-spikes behind it, white-hot slit eyes and a maw full of star-teeth that opens on a
// swirling vortex), a ring of planets orbiting his head, crescent moons for pauldrons, an obsidian breastplate traced
// with gold, a robe that is the night sky (nebulae, stars, constellations), and a BLACK HOLE for a heart, its accretion
// disk spinning. His two giant gauntlet hands float free, a star burning in each palm, trailing sleeves of nebula.
//   THE MECHANIC - THE EVENT HORIZON: nothing touches him. His heart sits inside a shell of bent space (mult 0: hits
//   just vanish into it). But he is made of swallowed stars, and stars keep falling out of his sky (his STARFALL, his
//   CONSTELLATION and COMET leave one; a FALLING STAR drifts down on its own when there are none): HIT A STAR and it
//   flies home into his heart - each one hurts him and CRACKS the shell; STAR.need cracks (2 in THE LAST LIGHT) and THE
//   EVENT HORIZON SHATTERS: he slumps forward over the observatory with his heart hanging low and open (x1.6), his head
//   and hands hurtable too, for BREAK.time frames - then the void closes over it again. A star knocked into an open
//   heart does double. And he is hungry: DEVOUR - his maw opens and he inhales, pulling the loose stars (and you)
//   toward it; every star he swallows heals him and mends a crack, so race him for them.
//   Attacks: STARFALL (meteors onto marks), GALACTIC SLAM (a fist from above, shockwaves along the floor - jump them),
//   PLANET TOSS (he plucks the ringed planet out of his orbit, it swells in his hand, he hurls it and it rolls across the
//   floor, rebounding off the edges - jump it), CRESCENT BLADES (he tears the crescent moons off his shoulders and throws
//   them like boomerangs, one skimming the floor and one at ledge height, both at once - time a jump between them),
//   PALM SWEEP (a hand sweeps the floor), CONSTELLATION (stars appear, lines join them, then the lines turn to beams),
//   GRAVITY WELL (a little black hole pulls you in, then bursts), DEVOUR; TOTAL ECLIPSE (half health: the sky goes
//   red, two-handed slams) adds SUPERNOVA (a sun forms between his hands and bursts into two rings - stand in a gap or
//   dodge) and COMET (spat from his maw). Below LOW.at: THE LAST LIGHT (his corona flickers; 2 cracks break him).
//   His death - THE STARS COME HOME: he convulses, light cracks out of him, he implodes into his own heart and every
//   star he ever swallowed bursts back out into the sky; a new little star shines where he was.
// Stage hazards (also in VS, where his sleeping silhouette fills the sky): METEOR SHOWER and SOLAR FLARE (a beam of
// sunlight sweeps across at a marked height - low: jump, high: stay down).
import { HazardCycle } from './hazardCycle.js';
import { BossArena } from './bossBase.js';
import { sfx } from '../audio/sfx.js';
import { HeartPhase } from './starHeart.js';
import { KingPhase } from './starKing.js';

const C = {
  out: 0x05030c, sky: [0x020108, 0x060312, 0x0c061e, 0x140a2c, 0x1e0e3a, 0x2a1048],
  neb: [0x8a2a9a, 0x2a4aba, 0xd04a8a, 0x3a9ac8], marble: [0x8a8eaa, 0xb4b8d0, 0xd2d6ea, 0xeef0fa], deep: [0x10122a, 0x1a1e3c, 0x262c52],
  gold: [0x7a4a10, 0xb8801e, 0xe8b440, 0xfff0a0], rock: [0x0e0a1e, 0x1a1232, 0x2a1e4a], crystal: [0x5a3ac8, 0x8a6aff, 0xc8b0ff],
  robe: [0x0a0820, 0x120e2e, 0x1c1640], plate: [0x0c0a18, 0x1a1630, 0x2e2852, 0x4a4280], moon: [0x8a90b0, 0xc8cee6, 0xf4f6ff],
  corona: [0xff8a20, 0xffc040, 0xfff0b0], rage: [0xc81a1a, 0xff4a2a, 0xffb090], shell: [0x5a2ad8, 0x9a7aff, 0xe0d4ff],
  disk: [0xff5a1a, 0xffa040, 0xff5ad0, 0x8a5aff], star: [0xffb030, 0xffe070, 0xfff8e0],
};
// where his heart and head sit (standing tall / slumped when THE EVENT HORIZON shatters), the robe's shoulders and hem
const BODY = { heart: -150, head: -255, slumpHeart: 62, slumpHead: 80, shoulder: 118, hem: 205, headR: 44, sink: 104 };   // (sink: how far his body falls once beheaded)
// his hands: where they rest, how big the palm is; how fast they move toward where they're going (0..1 a frame)
const HAND = { rest: [[-178, -196], [178, -196]], palm: 24, ease: 0.12 };
// the stars: how big (hit radius), how long a loose one lasts, at most this many loose at once, the speed a hit one
// flies home at (start, top), what it does to him (dmg on the heart - x2 while broken), cracks to break the shell, the
// FALLING STAR's wait when there are none (frames), the height a loose star floats at
const STAR = { r: 13, life: 900, max: 3, speed: [5, 13], dmg: 12, need: 3, drift: 300, float: -34 };
// THE EVENT HORIZON SHATTERS: how long he's open (frames), x his hurt by part
const BREAK = { time: 340, heart: 1.4, head: 0.7, hands: 0.35 };
// THE LAST LIGHT: below this much health; cracks needed then; the FALLING STAR's wait then
const LOW = { at: 0.25, need: 2, drift: 200 };
// STARFALL: marks (normal / TOTAL ECLIPSE), warning frames, the fall (frames), the impact's hit, the meteor's own hit while falling
const FALL = { n: [3, 5], warn: 56, fall: 30, hit: [11, [80, 5.4, 0.7]], burn: [6, [70, 4, 0.4]] };
// GALACTIC SLAM: frames the fist hunts you, its drop speed, the fist's hit, the floor shockwaves (speed, life, hit)
const SLAM = { hunt: 46, drop: 15, hit: [14, [70, 6.2, 0.9]], wave: { speed: 5.2, life: 44, hit: [8, [60, 4.6, 0.5]] } };
// PALM SWEEP: wind-up, speed (normal / TOTAL ECLIPSE), hit
const SWEEP = { wind: 40, speed: [7.5, 10], hit: [12, [40, 6, 0.8]] };
// CONSTELLATION: stars (normal / TOTAL ECLIPSE), frames between each appearing, warning, the beams' life, hit
const CONST = { n: [5, 6], every: 8, warn: 44, fire: 22, hit: [9, [75, 5, 0.6]] };
// GRAVITY WELL: forming, pulling (frames), pull strength (px a frame), its burst (radius, hit), the core's nibble
const WELL = { form: 30, pull: 110, str: 1.15, r: 66, hit: [12, [90, 6, 0.8]], core: [3, [80, 2, 0.1]] };
// DEVOUR: the inhale (frames), how hard loose stars / fighters are pulled, what a swallowed star heals him
const DEVOUR = { time: 130, star: 0.06, pull: 0.7, heal: 18 };
// SUPERNOVA (TOTAL ECLIPSE): the sun's charge (frames), the rings (how many, frames apart, speed), the gaps' width (rad), hit
const NOVA = { charge: 84, rings: 2, apart: 26, speed: 4.4, gap: 0.34, hit: [11, [70, 6, 0.75]] };
// COMET (TOTAL ECLIPSE): comets, frames apart, flight, gravity, the blast (radius, hit)
const COMET = { n: 3, every: 16, flight: 46, grav: 0.32, r: 40, hit: [10, [70, 5.2, 0.6]] };
// PLANET TOSS: the wind-up, the planet's size in his hand, its flight to the floor (frames, gravity), how fast it rolls
// (normal / TOTAL ECLIPSE), how many times it rebounds off the arena's edges, its hit
const PLANET = { wind: 42, r: 26, flight: 24, grav: 0.5, roll: [5.5, 7.5], bounces: [1, 2], hit: [12, [45, 6.2, 0.85]] };
// CRESCENT BLADES: the wind-up, one throw's flight (frames, out and back), how big a thrown moon is, the lanes (floor /
// ledge height), passes (normal / TOTAL ECLIPSE - the second pass swaps the lanes), hit
const MOONS = { wind: 36, fly: 80, r: 40, lanes: [-26, -122], passes: [1, 2], hit: [10, [60, 5.6, 0.7]] };
// hazards: METEOR SHOWER (marks), SOLAR FLARE (warning, the beam's speed, its half-height, hit)
const SHOWER = { n: 4 };
const FLARE = { warn: 80, speed: 13, h: 22, hit: [9, [30, 5.4, 0.55]] };
// his death: when the light cracks out, when he implodes, the flash (the stars come home), the whole length
const DIE = { crack: 20, implode: 130, flash: 205, len: 400 };
// the loss: when the light he cups is eaten
const GLOAT = { eat: 70 };
// how hard his hits land (x damage, knockback base, knockback growth) and how much quicker his wind-ups and pauses are
const HIT = { dmg: 1.3, base: 1.2, growth: 1.7 };
const QUICK = 1.2;
// the ENTRANCE (fractions of the entrance)
const ENTER = { swallow: [0.1, 0.42], wake: [0.42, 0.58], body: [0.58, 0.8] };

/** A point along the way from a to b (k = 0..1). */
const lerp = (a, b, k) => a + (b - a) * k;
/** 0..1 for k between a and b. */
const span = (k, a, b) => Math.max(0, Math.min(1, (k - a) / (b - a)));
/** A little seeded random, so the robe's stars and the sky are the same every time. */
const seeded = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

/** THE LAST OBSERVATORY and VESPERION (see the top of the file). */
export class StarBossStage extends BossArena {
  constructor(scene) {
    super();
    this.scene = scene; this.t = 0; this.hazardsOn = true; this.music = 'bgm_boss_stareater';
    this.platforms = [
      { x1: -265, x2: 265, y: 0, solid: true, bottom: 70 },
      { x1: -238, x2: -136, y: -100, solid: false },
      { x1: 136, x2: 238, y: -100, solid: false },
    ];
    this.spawns = [{ x: -150, y: 0 }, { x: 150, y: 0 }, { x: -60, y: 0 }, { x: 60, y: 0 }];
    this.cycle = new HazardCycle(this, ['meteor', 'flare'], { color: '#e0c8ff', stroke: '#140828', gap: 760 });
    // his look and pose: x, slump (0..1), mouth (0..1), eyes (0..1), corona (0..1), how much of him shows (vis), the shell's strength
    this.v = { x: 0, slump: 0, mouth: 0, eye: 1, corona: 1, vis: 1, shell: 1, scale: 1, shake: 0, sink: 0, evil: 0 };
    this.melt = 0; this.pool = 0; this.lava = 0; this.crownK = 0; this.headSpin = 0;   // (THE STAR KING's looks: starKing.js)
    this.hands = HAND.rest.map(([x, y], i) => ({ x, y, tx: x, ty: y, a: i ? 0.25 : -0.25, ta: i ? 0.25 : -0.25, fist: 0, tf: 0, glow: 0, side: i ? 1 : -1 }));
    this.stars = []; this.meteors = []; this.waves = []; this.rings = []; this.comets = []; this.flare = null; this.well = null; this.cons = null; this.nova = null;
    this.cracks = 0; this.brk = 0; this.ecl = 0; this.uid = 0; this.count = 0; this.sinceStar = 0; this.lastStar = 0; this.hinted = 0; this.freed = []; this.streaks = [];
    this.sparkColor = 0xb48aff; this.bodyW = 240; this.bodyH = 260;
    const R = seeded(77);
    this.robeStars = [];                                                      // the night sky in his robe (relative to his heart)
    while (this.robeStars.length < 80) {
      const ly = -40 + R() * 320, w = lerp(BODY.shoulder - 10, BODY.hem - 10, (ly + 40) / 320), lx = (R() * 2 - 1) * w;
      if (Math.abs(lx) < 46 && ly < 110) continue;                               // (not under the breastplate)
      this.robeStars.push({ x: lx, y: ly, s: R() < 0.15 ? 2 : 1, p: R() * 6 });
    }
    this.robeLines = [[0, 3, 7, 12, 18], [25, 31, 40, 44], [50, 55, 61, 66, 70]];   // constellations traced in gold between some of them
    this.skyStars = []; for (let i = 0; i < 90; i++) this.skyStars.push({ x: (R() * 2 - 1) * 700, y: -440 + R() * 520, p: R() * 6, s: R() < 0.12 ? 2 : 1 });
  }

  /** Builds the sky, the observatory behind him, his layers, the floor in front of his robe, then his hands and the effects. */
  draw(world, bg) {
    const s = this.scene;
    const sky = s.add.graphics().setScrollFactor(0.15); bg.push(sky); this.paintSky(sky); this.skyPaint = sky;
    this.skyG = s.add.graphics().setScrollFactor(0.15); bg.push(this.skyG);
    this.innerG = s.add.graphics().setVisible(false); world.push(this.innerG); this.paintInner(this.innerG);   // (inside him: starHeart.js)
    const back = s.add.graphics(); world.push(back); this.paintBack(back); this.backG = back;
    this.bodyG = s.add.graphics(); world.push(this.bodyG);
    this.headG = s.add.graphics(); world.push(this.headG);
    const floor = s.add.graphics(); world.push(floor); this.paintFloor(floor); this.floorG = floor;
    this.handG = s.add.graphics(); world.push(this.handG);
    this.heartG = s.add.graphics().setVisible(false); world.push(this.heartG);
    this.fxG = s.add.graphics(); world.push(this.fxG);
    this.cycle.makeBanner(s);
  }

  /** Deep space: bands of indigo, nebula clouds, a far spiral galaxy, a ringed gas giant, fixed stars. */
  paintSky(g) {
    const x0 = -760, y0 = -480;
    C.sky.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(x0, y0 + i * 110, 1520, 112); });
    for (let i = 0; i < 6; i++) { g.fillStyle(C.sky[5 - i], 1); g.fillRect(x0, y0 + 660 + i * 70, 1520, 72); }   // (and on down, darkening, below the floor)
    const R = seeded(5);
    for (let i = 0; i < 14; i++) { g.fillStyle(C.neb[i % 4], 0.07 + R() * 0.06); g.fillEllipse(-600 + R() * 1200, -380 + R() * 360, 220 + R() * 300, 80 + R() * 120); }
    for (let i = 0; i < 6; i++) { g.fillStyle(C.neb[(i + 2) % 4], 0.1); g.fillEllipse(-200 + R() * 400, -300 + R() * 160, 120 + R() * 140, 40 + R() * 50); }
    // a far spiral galaxy, up left
    for (let i = 0; i < 70; i++) { const q = i * 0.28, r = 4 + i * 0.9; for (const arm of [0, Math.PI]) { g.fillStyle(i < 10 ? 0xfff0d0 : C.neb[1], 0.5 - i * 0.006); g.fillCircle(-430 + Math.cos(q + arm) * r * 1.4, -310 + Math.sin(q + arm) * r * 0.55, 2.2 - i * 0.02); } }
    g.fillStyle(0xfff4e0, 0.8); g.fillEllipse(-430, -310, 16, 7);
    // the ringed gas giant, low right
    const px = 470, py = -60, pr = 92;
    g.lineStyle(10, 0xc89a6a, 0.35); g.strokeEllipse(px, py, pr * 3.1, pr * 0.62); g.lineStyle(0);
    g.fillStyle(0x3a1a3a, 1); g.fillCircle(px, py, pr);
    [0x5a2a4a, 0x7a3a50, 0x9a5a5a, 0x7a3a50, 0x5a2a4a].forEach((c, i) => { g.fillStyle(c, 1); g.fillEllipse(px - 8, py - 60 + i * 26, pr * 1.9 - Math.abs(i - 2) * 30, 18); });
    g.fillStyle(0x000000, 0.45); g.fillCircle(px + 30, py + 24, pr * 0.92);
    g.fillStyle(0x2a1030, 0.6); g.fillCircle(px + 40, py + 30, pr * 0.8);
    g.lineStyle(6, 0xe8c08a, 0.55); g.beginPath(); g.arc(px, py, pr * 1.55, Math.PI * 0.08, Math.PI * 0.92, false); g.strokePath(); g.lineStyle(0);
    g.lineStyle(3, 0xe8c08a, 0.5);                                                            // the near side of the rings, in front of the planet
    const pts = []; for (let i = 0; i <= 30; i++) { const q = i / 30 * Math.PI; pts.push({ x: px + Math.cos(q) * pr * 1.55, y: py + Math.sin(q) * pr * 0.31 }); }
    g.strokePoints(pts); g.lineStyle(0);
    for (let i = 0; i < 260; i++) { const a = R(); g.fillStyle(a < 0.08 ? 0xffd8a0 : a < 0.16 ? 0xa8c8ff : 0xffffff, 0.3 + R() * 0.6); g.fillRect(-760 + R() * 1520, -480 + R() * 560, a < 0.05 ? 2 : 1, a < 0.05 ? 2 : 1); }
  }

  /** Behind him: the great brass orrery rings, broken marble columns either side and a giant brass telescope. */
  paintBack(g) {
    const G = C.gold, M = C.marble;
    for (const [rx, ry, rot, w] of [[340, 74, -0.12, 4], [300, 52, 0.18, 3]]) {                 // the orrery rings round the arena
      const pts = []; for (let i = 0; i <= 60; i++) { const q = i / 60 * Math.PI * 2, x = Math.cos(q) * rx, y = Math.sin(q) * ry; pts.push({ x: x * Math.cos(rot) - y * Math.sin(rot), y: -170 + x * Math.sin(rot) + y * Math.cos(rot) }); }
      g.lineStyle(w + 3, C.out, 0.8); g.strokePoints(pts, true); g.lineStyle(w, G[1], 0.85); g.strokePoints(pts, true); g.lineStyle(1, G[3], 0.5); g.strokePoints(pts, true);
    }
    g.lineStyle(0);
    for (const [x, y, r, c] of [[-318, -196, 9, 0xd86a4a], [292, -128, 7, 0x6ac8e8], [-140, -236, 5, 0xe8d08a]]) { g.fillStyle(C.out, 1); g.fillCircle(x, y, r + 2); g.fillStyle(c, 1); g.fillCircle(x, y, r); g.fillStyle(0xffffff, 0.5); g.fillCircle(x - r * 0.35, y - r * 0.35, r * 0.35); }
    for (const s of [-1, 1]) {                                                                   // broken columns
      for (const [cx, top] of [[s * 300, -230], [s * 360, -150]]) {
        g.fillStyle(C.out, 1); g.fillRect(cx - 22, top, 44, 330 - top);
        g.fillStyle(M[1], 1); g.fillRect(cx - 19, top + 2, 38, 330 - top); for (let i = -14; i <= 14; i += 7) { g.fillStyle(M[i % 14 ? 2 : 0], 1); g.fillRect(cx + i - 2, top + 2, 3, 330 - top); }
        g.fillStyle(C.out, 1); g.fillTriangle(cx - 22, top, cx + 22, top, cx + s * 10, top - 26); g.fillStyle(M[2], 1); g.fillTriangle(cx - 18, top + 1, cx + 18, top + 1, cx + s * 10, top - 22);
        g.fillStyle(G[1], 1); g.fillRect(cx - 22, top + 40, 44, 5); g.fillStyle(G[2], 1); g.fillRect(cx - 22, top + 40, 44, 2);
      }
    }
    // the giant brass telescope, left, pointing up at him
    const tx = -404, ty = -40, ang = -0.95, L = 230;
    const pt = (d, o) => ({ x: tx + Math.cos(ang) * d - Math.sin(ang) * o, y: ty + Math.sin(ang) * d + Math.cos(ang) * o });
    g.fillStyle(C.out, 1); g.fillRect(tx - 34, ty - 4, 68, 120); g.fillStyle(G[0], 1); g.fillRect(tx - 30, ty, 60, 116); g.fillStyle(G[1], 1); g.fillRect(tx - 30, ty, 60, 6);
    for (const [d0, d1, r0, r1] of [[-30, 60, 18, 22], [60, 150, 22, 26], [150, L, 26, 32]]) {
      g.fillStyle(C.out, 1); g.fillPoints([pt(d0, -r0 - 3), pt(d1, -r1 - 3), pt(d1, r1 + 3), pt(d0, r0 + 3)], true);
      g.fillStyle(G[1], 1); g.fillPoints([pt(d0, -r0), pt(d1, -r1), pt(d1, r1), pt(d0, r0)], true);
      g.fillStyle(G[2], 1); g.fillPoints([pt(d0, -r0), pt(d1, -r1), pt(d1, -r1 * 0.4), pt(d0, -r0 * 0.4)], true);
      g.fillStyle(G[0], 1); g.fillPoints([pt(d1 - 6, -r1 - 2), pt(d1, -r1 - 2), pt(d1, r1 + 2), pt(d1 - 6, r1 + 2)], true);
    }
    const lens = pt(L, 0); g.fillStyle(C.out, 1); g.fillCircle(lens.x, lens.y, 30); g.fillStyle(0x6ac8ff, 0.5); g.fillCircle(lens.x, lens.y, 26); g.fillStyle(0xffffff, 0.6); g.fillCircle(lens.x - 7, lens.y - 7, 7);
    g.fillStyle(G[2], 1); g.fillCircle(tx, ty, 12); g.fillStyle(G[3], 1); g.fillCircle(tx - 3, ty - 3, 4);
  }

  /** The observatory floor on its crystal rock (it covers his hem), and the two marble ledges on brass half-rings. */
  paintFloor(g) {
    const P = this.platforms[0], G = C.gold, M = C.marble, D = C.deep;
    const rock = [[P.x1 - 4, 60], [P.x1 + 30, 120], [-150, 150], [-60, 210], [20, 180], [90, 230], [170, 150], [P.x2 - 20, 118], [P.x2 + 4, 60]];
    g.fillStyle(C.out, 1); g.fillPoints([{ x: P.x1 - 6, y: 50 }, ...rock.map(([x, y]) => ({ x, y: y + 4 })), { x: P.x2 + 6, y: 50 }], true);
    g.fillStyle(C.rock[1], 1); g.fillPoints([{ x: P.x1 - 2, y: 50 }, ...rock.map(([x, y]) => ({ x, y })), { x: P.x2 + 2, y: 50 }], true);
    g.fillStyle(C.rock[2], 1); for (let i = 0; i < rock.length - 1; i++) g.fillTriangle(rock[i][0], 52, rock[i + 1][0], 52, (rock[i][0] + rock[i + 1][0]) / 2, (rock[i][1] + rock[i + 1][1]) / 2 - 20);
    for (const [x, y, h, w] of [[-120, 150, 46, 14], [60, 190, 60, 16], [180, 120, 36, 12], [-200, 100, 30, 10], [0, 170, 30, 10]]) {     // violet crystals growing out of the rock
      g.fillStyle(C.out, 1); g.fillTriangle(x - w - 2, y - 2, x + w + 2, y - 2, x, y + h + 4);
      g.fillStyle(C.crystal[0], 1); g.fillTriangle(x - w, y, x + w, y, x, y + h); g.fillStyle(C.crystal[1], 1); g.fillTriangle(x - w * 0.3, y, x + w, y, x, y + h); g.fillStyle(C.crystal[2], 0.8); g.fillTriangle(x + w * 0.2, y, x + w * 0.6, y, x + 1, y + h * 0.7);
      g.fillStyle(C.crystal[1], 0.12); g.fillCircle(x, y + h * 0.4, w * 2.6);
    }
    g.fillStyle(C.out, 1); g.fillRect(P.x1 - 4, -3, P.x2 - P.x1 + 8, 58);
    g.fillStyle(D[1], 1); g.fillRect(P.x1, 8, P.x2 - P.x1, 44);
    const R = seeded(31); g.lineStyle(1, D[2], 1); for (let i = 0; i < 18; i++) { const x = P.x1 + R() * (P.x2 - P.x1); g.lineBetween(x, 10, x + (R() - 0.5) * 40, 50); } g.lineStyle(0);   // marble veins
    for (let x = P.x1 + 40; x < P.x2 - 20; x += 76) {                                            // gold zodiac roundels
      g.fillStyle(G[0], 1); g.fillCircle(x, 30, 13); g.fillStyle(D[0], 1); g.fillCircle(x, 30, 10); g.lineStyle(1, G[2], 1); g.strokeCircle(x, 30, 7); g.lineStyle(0);
      g.fillStyle(G[3], 1); for (let k = 0; k < 4; k++) { const q = k / 4 * Math.PI * 2 + x; g.fillRect(x + Math.cos(q) * 4, 30 + Math.sin(q) * 4, 2, 2); }
    }
    g.fillStyle(G[1], 1); g.fillRect(P.x1, 8, P.x2 - P.x1, 3); g.fillRect(P.x1, 49, P.x2 - P.x1, 3); g.fillStyle(G[2], 1); g.fillRect(P.x1, 8, P.x2 - P.x1, 1);
    g.fillStyle(M[1], 1); g.fillRect(P.x1, 0, P.x2 - P.x1, 8); g.fillStyle(M[3], 1); g.fillRect(P.x1, 0, P.x2 - P.x1, 2);   // the marble top
    for (let x = P.x1 + 20; x < P.x2; x += 40) { g.fillStyle(M[0], 1); g.fillRect(x, 2, 1, 6); }
    g.fillStyle(G[2], 1); g.fillRect(P.x1, 4, P.x2 - P.x1, 1);
    for (const p of this.platforms.slice(1)) {                                                   // the ledges: marble slabs on brass armillary half-rings
      const cx = (p.x1 + p.x2) / 2, w = p.x2 - p.x1;
      for (const [r, a] of [[42, 1], [30, 0.8]]) { g.lineStyle(5, C.out, a); g.beginPath(); g.arc(cx, p.y + 6, r, 0.05, Math.PI - 0.05, false); g.strokePath(); g.lineStyle(3, G[1], a); g.beginPath(); g.arc(cx, p.y + 6, r, 0.05, Math.PI - 0.05, false); g.strokePath(); }
      g.lineStyle(0); g.fillStyle(G[2], 1); g.fillCircle(cx, p.y + 48, 5); g.fillStyle(0xfff0b0, 0.7); g.fillCircle(cx, p.y + 48, 2);
      g.fillStyle(C.out, 1); g.fillRect(p.x1 - 3, p.y - 3, w + 6, 15); g.fillStyle(M[1], 1); g.fillRect(p.x1, p.y, w, 9); g.fillStyle(M[3], 1); g.fillRect(p.x1, p.y, w, 2);
      g.fillStyle(G[1], 1); g.fillRect(p.x1, p.y + 9, w, 2);
    }
  }

  // ------------------------------------------------------------------ VESPERION
  /** The boss's own state when the fight starts: the hazards come rarely (he's busy enough). */
  makeBoss() { this.headless = null; this.inside = false; this.crowned = false; this.headFall = null; this.headGone = false; this.melt = 0; this.pool = 0; this.lava = 0; this.crownK = 0; this.v.evil = 0; this.bolts = []; this.lashes = []; this.vrings = []; this.grasps = []; this.hwaves = []; this.cycle.gap = 1500; this.cycle.next = 1500; this.v.vis = 1; this.v.eye = 1; this.v.corona = 1; this.v.shell = 1; this.lastStar = 0; }
  /** His hits, harder than the base (HIT). */
  bhit(id, x1, y1, x2, y2, dmg, [angle, base, growth], more) { return super.bhit(id, x1, y1, x2, y2, dmg * HIT.dmg * (this.crowned ? this.kingDmg() : 1), [angle, base * HIT.base, growth * HIT.growth], more); }
  /** His wind-ups and pauses, quicker than the base (QUICK). */
  sp(n) { return super.sp(n / QUICK / (this.crowned ? this.kingSpeed() : 1)); }
  /** Where his body is: the heart, the head, the shoulders - lower and forward as he slumps. */
  joints() {
    const v = this.v, k = v.slump, bob = Math.sin(this.t * 0.03) * 5 * (1 - k), sh = v.shake ? (Math.random() - 0.5) * v.shake : 0;
    const heart = { x: v.x + sh, y: BODY.heart + BODY.slumpHeart * k + bob + (v.sink || 0) * BODY.sink };
    const head = this.headFall ? { x: this.headFall.x, y: this.headFall.y } : { x: v.x + sh * 1.5, y: BODY.head + BODY.slumpHead * k + bob * 1.2 + Math.sin(this.t * 0.03 + 0.6) * 2 };   // (once beheaded, wherever it fell)
    return { heart, head, shL: { x: heart.x - BODY.shoulder, y: heart.y - 46 + k * 18 }, shR: { x: heart.x + BODY.shoulder, y: heart.y - 46 + k * 18 }, mouth: { x: head.x, y: head.y + 20 } };
  }
  /** What the camera, the explosions and the CPU go for: his heart. */
  core() { return this.inside && this.heartS ? { x: this.heartS.x, y: this.heartS.y } : this.joints().heart; }
  /** The camera keeps him and the whole observatory in view. */
  camPoints() { if (!this.boss) return []; return this.boss.dying ? [{ x: -300, y: -340 }, { x: 300, y: 30 }] : [{ x: -270, y: -320 }, { x: 270, y: 20 }]; }
  /** Cracks it takes to shatter THE EVENT HORIZON (fewer in THE LAST LIGHT). */
  need() { return this.low ? LOW.need : STAR.need; }
  /**
   * Where he can be hurt: nowhere while THE EVENT HORIZON holds (mult 0 - your hits vanish into it); once it
   * shatters, his heart (x1.6), head and hands.
   */
  hurt() {
    if (this.crowned) return this.kingHurt();
    if (this.headless) return this.heartHurt();                                             // (beheaded: nothing until you're inside, then his heart)
    const j = this.joints(), o = this.brk > 0, out = [];
    out.push({ x1: j.heart.x - 40, y1: j.heart.y - 40, x2: j.heart.x + 40, y2: j.heart.y + 40, mult: o ? BREAK.heart : 0, heart: true });
    out.push({ x1: j.head.x - 42, y1: j.head.y - 42, x2: j.head.x + 42, y2: j.head.y + 40, mult: o ? BREAK.head : 0 });
    for (const h of this.hands) out.push({ x1: h.x - 28, y1: h.y - 30, x2: h.x + 28, y2: h.y + 28, mult: o ? BREAK.hands : 0 });
    return out;
  }
  /** A hit on him through THE EVENT HORIZON: it vanishes into the void - and now and then a reminder of what to do. */
  onArmor(match, x, y) {
    if (this.t - (this.noFx || -999) < 80) return;
    this.noFx = this.t;
    const tip = this.hinted++ % 3 === 0;
    match.popText({ x, y: y + 50 }, tip ? 'HIT THE STARS INTO HIS HEART!' : 'THE VOID DRINKS IT', tip ? '#ffe070' : '#b8a8e8');
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; match.particles.push({ x: x + Math.cos(a) * 18, y: y + Math.sin(a) * 18, vx: -Math.cos(a) * 1.5, vy: -Math.sin(a) * 1.5, life: 14, color: C.shell[1], size: 2 }); }
  }
  /** A real hit (the shell is down): he flinches, his eyes flare. */
  onHurt(match, r) { this.v.shake = 4; if (this.inside) this.heartHurtFx(match, r); }

  /** His pattern: STARFALL whenever the sky has run out of stars, DEVOUR when stars lie loose, else his attacks. */
  pattern(phase) {
    if (this.inside) return this.heartPattern();
    if (this.crowned) return this.kingPattern();
    const loose = this.stars.filter((s) => s.st === 'free').length;
    if (!loose && this.sinceStar >= 2) return ['starfall'];
    if (loose && this.count % 3 === 2) return ['devour'];
    return phase === 1 ? ['starfall', 'slam', 'sweep', 'constellation', 'well', 'planet', 'moons'] : ['starfall', 'slam', 'sweep', 'constellation', 'well', 'planet', 'moons', 'supernova', 'comet', 'slam'];
  }
  /** Counts his attacks (for DEVOUR) and how long since he last gave the sky a star. */
  tally(gives) { this.count++; this.sinceStar = gives ? 0 : this.sinceStar + 1; }
  start_starfall() { this.tally(true); } start_slam() { this.tally(); } start_sweep() { this.tally(); } start_constellation() { this.tally(true); }
  start_well() { this.tally(); } start_planet() { this.tally(); } start_moons() { this.tally(); } start_devour() { this.tally(); } start_supernova() { this.tally(); } start_comet() { this.tally(true); }
  /** The drawing layers that make up him, for his death card's portrait (MatchScene.paintBossCard). */
  cardObjs() { return this.inside ? [this.innerG, this.heartG] : [this.bodyG, this.headG, this.handG]; }
  /** Which form he was in when he beat you (bosses.js card quotes). */
  cardForm() { return this.crowned ? 'crown' : this.inside ? 'heart' : this.headless ? 'rage' : this.low ? 'low' : this.boss && this.boss.phase === 2 ? 'rage' : 'base'; }
  rageLine() { return 'HE BREAKS!'; }
  /** Half health: the sky goes blood red and his head comes off (THE BEHEADING, starHeart.js) - the rest of the fight is inside him. */
  onRage(match) { this.rageText.setColor('#ff5a3a').setFontSize(14); sfx('thunder', 0.8, 0.7); match.shake(12, 50); this.startHeadless(match); }
  /** A real player's fight: remember someone's watching (the mid-fight cutscenes play) and make the screen layer they draw on. */
  startIntro(match) { super.startIntro(match); this.watched = true; this.uiG = match.add.graphics().setDepth(39); match.addUI(this.uiG); }
  /** The camera: the intro's, or a mid-fight cutscene's (THE BEHEADING, the fall inside). */
  introCam() { return this.cut ? this.cutCam() : super.introCam(); }

  /** Moves a hand part of the way to where it's going (and its angle and fist). */
  stepHands() {
    for (const h of this.hands) {
      const e = h.fast || HAND.ease;
      h.x += (h.tx - h.x) * e; h.y += (h.ty - h.y) * e; h.a += (h.ta - h.a) * 0.15; h.fist += (h.tf - h.fist) * 0.2; h.glow *= 0.94;
    }
  }
  /** Sends both hands back to rest (open, floating at his sides). */
  restHands(bob = true) { this.hands.forEach((h, i) => { h.tx = HAND.rest[i][0] + (bob ? Math.sin(this.t * 0.025 + i * 2) * 8 : 0); h.ty = HAND.rest[i][1] + (bob ? Math.sin(this.t * 0.035 + i) * 10 : 0); h.ta = h.side * 0.25; h.tf = 0.2; h.fast = 0; }); }

  /** At rest: he hovers, his hands drift, his eyes follow you. */
  idle() { if (this.brk || this.headless) return; this.restHands(); this.v.mouth *= 0.9; }

  // ---- the stars (his weakness)
  /** A loose star at (x, y) - it drifts to its floating height and waits to be hit. fall = it streaks down from the sky first. */
  addStar(x, y, fall = false) {
    if (this.headless || this.crowned || this.stars.filter((s) => s.st !== 'shot').length >= STAR.max) return;   // (no stars once he's lost his head)
    const s = { x: Phaser.Math.Clamp(x, -245, 245), y, st: fall ? 'fall' : 'free', t: 0, life: STAR.life, vx: 0, vy: 0, trail: [], id: ++this.uid };
    this.stars.push(s); this.lastStar = this.t;
    if (!this.firstStar && this.match) { this.firstStar = true; this.match.popText({ x: s.x, y: Math.min(-20, s.y) + 40 }, 'A STAR! HIT IT!', '#ffe070'); }
  }
  /** A player's hit sends a loose star flying home into his heart. */
  strikeStar(match, s, o) {
    const h = this.joints().heart, d = Math.hypot(h.x - s.x, h.y - s.y) || 1;
    s.st = 'shot'; s.t = 0; s.owner = o; s.vx = (h.x - s.x) / d * STAR.speed[0] + (Math.random() - 0.5) * 3; s.vy = (h.y - s.y) / d * STAR.speed[0] - 3;
    if (o.hitstop < 4) o.hitstop = 4;
    sfx('shing', 0.8, 1.4); sfx('ding', 0.6, 1.2); match.puff(s.x, s.y, 0xfff0b0, 8);
    match.particles.push({ shape: 'ring', x: s.x, y: s.y, vx: 0, vy: 0, life: 14, maxLife: 14, color: 0xffe070, grav: 0, r: 6, dr: 3 });
  }
  /** A star reaches his heart: it hurts him (double while broken) and cracks THE EVENT HORIZON; enough cracks shatter it. */
  starHome(match, s) {
    const B = this.boss; if (!B || B.dying) return;
    const o = s.owner, open = this.brk > 0, d = Math.round(STAR.dmg * (o ? o.dmgMult || 1 : 1) * (open ? 2 : 1)), h = this.joints().heart;
    B.hp = Math.max(0, B.hp - d); B.flash = 8; this.v.shake = 6;
    if (o) { o.stats.damageDealt += d; o.stats.weak = (o.stats.weak || 0) + 1; }
    sfx('bighit', 1, 0.7); sfx('glass', 0.7, 1.3); match.shake(8, 10);
    for (let i = 0; i < 22; i++) { const a = Math.random() * Math.PI * 2, v = 1 + Math.random() * 4; match.particles.push({ x: h.x, y: h.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 22 + Math.random() * 14, color: [0xfff0b0, 0xffd040, C.shell[1]][i % 3], size: 3, drag: 0.92 }); }
    if (!open) {
      this.cracks++;
      match.popText({ x: h.x, y: h.y + 20 }, this.cracks >= this.need() ? 'SHATTER!' : 'CRACK! ' + this.cracks + ' / ' + this.need(), '#ffe070');
      if (this.cracks >= this.need() && B.hp > 0) this.shatter(match);
    } else match.popText({ x: h.x, y: h.y + 20 }, 'DIRECT HIT!', '#ffe070');
    if (B.hp <= 0) this.startDeath(match);
  }
  /** THE EVENT HORIZON SHATTERS: shards of bent space fly off, he roars and slumps forward over the floor, wide open. */
  shatter(match) {
    const B = this.boss, h = this.joints().heart;
    this.brk = BREAK.time; this.cracks = 0; B.atk = null; B.wait = BREAK.time + 30;
    this.rings = []; this.cons = null; this.well = null; this.nova = null; this.comets = [];
    if (this.ball) this.ball.st = 'home'; this.moons = null;
    this.rageText.setText('THE EVENT HORIZON SHATTERS!').setColor('#e0d4ff').setFontSize(12); B.rage = 100;
    sfx('glass', 1, 0.6); sfx('roar', 1, 0.6); sfx('bighit', 1, 0.5); match.shake(16, 30);
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, v = 3 + Math.random() * 5; match.particles.push({ x: h.x + Math.cos(a) * 40, y: h.y + Math.sin(a) * 40, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 30 + Math.random() * 20, color: C.shell[i % 3], size: 3, grav: 0.12, drag: 0.97 }); }
  }
  /** The loose stars bob and fade; struck ones home in on his heart with a trail; DEVOUR pulls loose ones to his maw. */
  stepStars(match) {
    const j = this.joints();
    for (const s of this.stars) {
      s.t++;
      if (s.st === 'fall') { s.vy = Math.min(7, s.vy + 0.25); s.y += s.vy; s.x += Math.sin(s.t * 0.05) * 0.6; s.trail.push({ x: s.x, y: s.y }); if (s.y >= STAR.float) { s.y = STAR.float; s.st = 'free'; s.t = 0; sfx('ding', 0.5, 1.8); } }
      else if (s.st === 'free') {
        s.life--;
        if (this.devouring) { const dx = j.mouth.x - s.x, dy = j.mouth.y - s.y, d = Math.hypot(dx, dy) || 1; s.vx += dx / d * DEVOUR.star; s.vy += dy / d * DEVOUR.star; s.vx *= 0.97; s.vy *= 0.97; s.x += s.vx; s.y += s.vy; s.trail.push({ x: s.x, y: s.y }); if (d < 22) this.eatStar(match, s); }
        else { s.vx = s.vy = 0; s.y += (STAR.float + Math.sin(s.t * 0.06 + s.id) * 5 - s.y) * 0.1; if (s.trail.length) s.trail.shift(); }
        if (s.life <= 0) { s.dead = true; match.puff(s.x, s.y, C.star[1], 6); }
      } else if (s.st === 'shot') {
        const dx = j.heart.x - s.x, dy = j.heart.y - s.y, d = Math.hypot(dx, dy) || 1, sp = Math.min(STAR.speed[1], STAR.speed[0] + s.t * 0.35);
        s.vx = lerp(s.vx, dx / d * sp, 0.16); s.vy = lerp(s.vy, dy / d * sp, 0.16); s.x += s.vx; s.y += s.vy; s.trail.push({ x: s.x, y: s.y });
        if (d < 26) { s.dead = true; this.starHome(match, s); }
      }
      if (s.trail.length > 12) s.trail.shift();
    }
    this.stars = this.stars.filter((s) => !s.dead);
    // a FALLING STAR when the sky is out of them (so there's always a way to hurt him)
    const B = this.boss;
    if (B && !B.dying && !match.over && !this.brk && !this.headless && !this.stars.length && this.t - this.lastStar > (this.low ? LOW.drift : STAR.drift)) {
      const tg = this.nearest(match, 0); this.addStar(Phaser.Math.Clamp((tg ? tg.x : 0) + (Math.random() - 0.5) * 260, -230, 230), -420, true); sfx('summon', 0.5, 1.6);
    }
  }
  /** He swallows a star: it heals him and mends a crack. */
  eatStar(match, s) {
    const B = this.boss; s.dead = true;
    if (B) B.hp = Math.min(B.max, B.hp + DEVOUR.heal);
    this.cracks = Math.max(0, this.cracks - 1);
    sfx('summon', 0.8, 0.6); sfx('laugh', 0.5, 0.6);
    match.popText({ x: s.x, y: s.y + 50 }, ['DELICIOUS.', 'MINE.', 'ANOTHER LIGHT GOES OUT.'][Math.floor(Math.random() * 3)], '#c8a8ff');
  }
  /** The players' hits: a hit on a loose star sends it home into his heart; then hits on him (BossArena). */
  strikeTargets(match, hbs) {
    const B = this.boss;
    if (B && !B.dying && !match.over && this.inside) this.heartStrike(match, hbs);
    if (B && !B.dying && !match.over) for (const s of this.stars) {
      if (s.st !== 'free' && s.st !== 'fall') continue;
      const r = STAR.r + 4, hb = hbs.find((q) => q.owner && q.x1 < s.x + r && q.x2 > s.x - r && q.y1 < s.y + r && q.y2 > s.y - r);
      if (hb) this.strikeStar(match, s, hb.owner);
    }
    super.strikeTargets(match, hbs);
  }

  // ---- his attacks
  /** STARFALL: marks glow on the floor, then meteors crash onto them; one of them leaves a star behind. */
  atk_starfall(match, a) {
    if (a.t === 1) {
      const n = FALL.n[this.boss.phase - 1] + (this.low ? 1 : 0), xs = [];
      for (const f of match.fighters) if (f.alive && f.state !== 'respawn') xs.push(f.x);
      while (xs.length < n) xs.push((Math.random() * 2 - 1) * 240);
      const star = Math.floor(Math.random() * n);
      xs.slice(0, n).forEach((x, i) => this.meteor(x, i * 9, i === star));
      this.hands.forEach((h) => { h.ty = -230; h.ta = h.side * 0.6; h.tf = 0; h.glow = 1; });
      sfx('rumble', 0.7, 0.8); this.v.mouth = 0.3;
    }
    return a.t > 20 && !this.meteors.length;
  }
  /** A meteor onto x: a mark glows for FALL.warn frames (after `delay`), then it streaks down. star = it leaves a star. */
  meteor(x, delay, star) { const tx = Phaser.Math.Clamp(x, -250, 250); this.meteors.push({ tx, t: -delay, star, id: 'vm-' + (++this.uid), side: Math.random() < 0.5 ? -1 : 1 }); }
  /** The meteors: warning, fall (a burning hitbox), impact (a blast, debris, maybe a star). */
  stepMeteors(match, out) {
    const warn = this.sp(FALL.warn);
    for (const m of this.meteors) {
      m.t++;
      const f = m.t - warn;
      if (f >= 0 && f < FALL.fall) {
        const k = f / FALL.fall; m.x = m.tx + m.side * 150 * (1 - k); m.y = -440 * (1 - k);
        out.push(this.bhit(m.id + 'f', m.x - 14, m.y - 14, m.x + 14, m.y + 14, ...FALL.burn));
        if (f === 0) sfx('whoosh', 0.6, 0.7);
      }
      if (f === FALL.fall) {
        sfx('bighit', 0.8, 0.8); match.shake(6, 8);
        for (let i = 0; i < 14; i++) match.particles.push({ x: m.tx, y: -4, vx: (Math.random() - 0.5) * 7, vy: -Math.random() * 5, life: 20 + Math.random() * 14, color: [0xffd040, 0xff7a20, C.crystal[1], 0xffffff][i % 4], size: 3, grav: 0.2 });
        match.particles.push({ shape: 'ring', x: m.tx, y: -6, vx: 0, vy: 0, life: 16, maxLife: 16, color: 0xffb040, grav: 0, r: 8, dr: 4 });
        if (m.star && this.boss) this.addStar(m.tx, -10);
      }
      if (f >= FALL.fall && f < FALL.fall + 6) out.push(this.bhit(m.id, m.tx - 30, -56, m.tx + 30, 0, ...FALL.hit, { radial: true }));
      if (f > FALL.fall + 14) m.dead = true;
    }
    this.meteors = this.meteors.filter((m) => !m.dead);
  }
  /** GALACTIC SLAM: a fist hunts you from above, then drops; shockwaves run both ways along the floor. TOTAL ECLIPSE: both fists, one after the other. */
  atk_slam(match, a, out) {
    if (a.t === 1) { const tg = this.nearest(match, 0); a.n = this.boss.phase === 2 ? 2 : 1; a.k = 0; a.s = 0; a.hi = tg && tg.x > 0 ? 1 : 0; }
    const tg = this.nearest(match, 0), h = this.hands[(a.hi + a.k) % 2], hunt = this.sp(SLAM.hunt), t = a.t - a.s;
    this.hands.forEach((o) => { if (o !== h) { o.tx = o.side * 170; o.ty = -170; o.tf = 0.3; o.ta = o.side * 0.3; } });
    if (t < hunt) { h.tx = Phaser.Math.Clamp(tg ? tg.x : 0, -235, 235); h.ty = -235; h.tf = 1; h.ta = Math.PI; h.glow = t / hunt; h.fast = 0.14; return false; }
    if (!a.hit) {
      h.fast = 0; h.tx = h.x; h.y = Math.min(-30, h.y + SLAM.drop); h.ty = h.y;
      out.push(this.bhit('vs' + a.id + a.k, h.x - 34, h.y - 34, h.x + 34, h.y + 30, ...SLAM.hit, { radial: true }));
      if (h.y > -31) {
        a.hit = a.t; sfx('bighit', 1, 0.55); match.shake(10, 12);
        for (const d of [-1, 1]) this.waves.push({ x: h.x + d * 30, dir: d, t: 0, id: this.sid('wave') });
        for (let i = 0; i < 16; i++) match.particles.push({ x: h.x + (Math.random() - 0.5) * 60, y: -2, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 4, life: 22, color: [C.marble[2], C.gold[2], C.crystal[1]][i % 3], size: 3, grav: 0.2 });
      }
      return false;
    }
    if (a.t - a.hit > 26) { if (++a.k < a.n) { a.hit = 0; a.s = a.t; return false; } return true; }
    return false;
  }
  /** The slam's shockwaves rolling along the floor (jump them). */
  stepWaves(match, out) {
    for (const w of this.waves) { w.t++; w.x += w.dir * SLAM.wave.speed; out.push(this.bhit(w.id, w.x - 12, -20, w.x + 12, 0, ...SLAM.wave.hit, { dirX: w.dir })); if (w.t % 3 === 0) match.particles.push({ x: w.x, y: -3, vx: 0, vy: -1.5, life: 12, color: C.crystal[2], size: 2 }); }
    this.waves = this.waves.filter((w) => w.t < SLAM.wave.life && Math.abs(w.x) < 270);
  }
  /** PALM SWEEP: a hand goes low at one end of the floor, palm out, then sweeps right across it - jump it. */
  atk_sweep(match, a, out) {
    const wind = this.sp(SWEEP.wind);
    if (a.t === 1) { const tg = this.nearest(match, 0); a.s = tg && tg.x > 0 ? -1 : 1; a.h = this.hands[a.s > 0 ? 1 : 0]; }
    const h = a.h;
    this.hands.forEach((o) => { if (o !== h) { o.tx = o.side * 120; o.ty = -200; o.tf = 0.5; } });
    if (a.t < wind) { h.tx = a.s * 300; h.ty = -28; h.ta = -a.s * Math.PI / 2 * h.side; h.tf = 0; h.glow = a.t / wind; h.fast = 0.16; if (a.t === wind - 10) sfx('whoosh', 0.7, 0.6); return false; }
    h.fast = 0; h.x -= a.s * SWEEP.speed[this.boss.phase - 1]; h.tx = h.x; h.ty = -28;
    out.push(this.bhit('sw' + a.id, h.x - 34, -66, h.x + 34, 0, ...SWEEP.hit, { dirX: -a.s }));
    if (a.t % 3 === 0) match.particles.push({ x: h.x + a.s * 30, y: -4, vx: a.s * 2, vy: -1, life: 14, color: C.marble[2], size: 3 });
    return Math.abs(h.x) > 300 && Math.sign(h.x) === -a.s;
  }
  /** CONSTELLATION: stars light up across the arena one by one, gold lines join them - then the lines become beams. The last star stays. */
  atk_constellation(match, a, out) {
    const n = CONST.n[this.boss.phase - 1], warn = this.sp(CONST.warn), W = n * CONST.every + warn;
    if (a.t === 1) {
      const tg = this.nearest(match, 0), pts = [];
      for (let i = 0; i < n; i++) pts.push({ x: lerp(-235, 235, (i + 0.5) / n) + (Math.random() - 0.5) * 50, y: -40 - Math.random() * 160 });
      if (tg) { const k = Math.floor(Math.random() * n); pts[k] = { x: Phaser.Math.Clamp(tg.x, -235, 235), y: Math.max(-200, tg.y - 30) }; }
      pts.sort(() => Math.random() - 0.5);
      this.cons = { pts, t: 0 }; this.hands.forEach((h) => { h.ty = -260; h.tf = 0; h.ta = h.side * 0.9; h.glow = 1; });
    }
    const C2 = this.cons; if (!C2) return true;
    C2.t = a.t;
    if (a.t <= n * CONST.every && a.t % CONST.every === 0) sfx('ding', 0.5, 1 + a.t / (n * CONST.every));
    if (a.t === W) { sfx('laser', 0.9, 0.8); match.shake(4, 10); }
    if (a.t >= W && a.t < W + CONST.fire) {
      for (let i = 0; i < C2.pts.length - 1; i++) {
        const p = C2.pts[i], q = C2.pts[i + 1], L = Math.hypot(q.x - p.x, q.y - p.y), steps = Math.ceil(L / 16);
        for (let k = 0; k <= steps; k++) { const x = lerp(p.x, q.x, k / steps), y = lerp(p.y, q.y, k / steps); out.push(this.bhit('cn' + a.id + '-' + i, x - 9, y - 9, x + 9, y + 9, ...CONST.hit, { radial: true })); }
      }
    }
    if (a.t === W + CONST.fire) { const last = C2.pts[C2.pts.length - 1]; this.addStar(last.x, last.y); }
    if (a.t > W + CONST.fire + 12) { this.cons = null; return true; }
    return false;
  }
  /** GRAVITY WELL: his hand opens a little black hole near you; it pulls everyone in, nibbling at the core, then bursts. */
  atk_well(match, a, out) {
    const form = this.sp(WELL.form);
    if (a.t === 1) { const tg = this.nearest(match, 0); this.well = { x: Phaser.Math.Clamp((tg ? tg.x : 0) + (Math.random() - 0.5) * 120, -220, 220), y: -46, k: 0 }; a.h = this.hands[this.well.x > 0 ? 1 : 0]; sfx('summon', 0.8, 0.5); }
    const W = this.well; if (!W) return true;
    a.h.tx = W.x; a.h.ty = -190; a.h.ta = Math.PI; a.h.tf = 0; a.h.glow = 1;
    W.k = Math.min(1, a.t / form);
    if (a.t > form && a.t < form + WELL.pull) {
      for (const f of match.fighters) {
        if (!f.alive || f.state === 'respawn') continue;
        const dx = W.x - f.x, dy = W.y - (f.y - 20), d = Math.hypot(dx, dy);
        if (d < 300 && d > 6) { f.x += dx / d * WELL.str * (1 - d / 360); if (!f.grounded) f.y += dy / d * WELL.str * 0.5; }
      }
      if (a.t % 20 === 0) out.push(this.bhit('wc' + a.id + a.t, W.x - 16, W.y - 16, W.x + 16, W.y + 16, ...WELL.core));
      if (a.t % 4 === 0) { const q = Math.random() * Math.PI * 2; match.particles.push({ x: W.x + Math.cos(q) * 90, y: W.y + Math.sin(q) * 60, vx: -Math.cos(q) * 3, vy: -Math.sin(q) * 2, life: 26, color: [C.shell[1], C.disk[1], 0xffffff][a.t % 3], size: 2 }); }
      if (a.t % 30 === 0) sfx('rumble', 0.4, 1.3);
    }
    if (a.t === form + WELL.pull) { sfx('bighit', 1, 0.6); sfx('glass', 0.6, 0.7); match.shake(8, 12); match.particles.push({ shape: 'ring', x: W.x, y: W.y, vx: 0, vy: 0, life: 18, maxLife: 18, color: C.shell[2], grav: 0, r: 12, dr: 5 }); }
    if (a.t >= form + WELL.pull && a.t < form + WELL.pull + 6) out.push(this.bhit('wb' + a.id, W.x - WELL.r, W.y - WELL.r, W.x + WELL.r, W.y + WELL.r, ...WELL.hit, { radial: true }));
    if (a.t > form + WELL.pull + 20) { this.well = null; return true; }
    return false;
  }
  /** DEVOUR: his maw opens and he breathes in - loose stars drift toward it (hit them first!), you're pulled toward him. */
  atk_devour(match, a) {
    this.hands.forEach((h) => { h.tx = h.side * 90; h.ty = -280; h.ta = h.side * 0.5; h.tf = 0; });
    if (a.t === 1) { sfx('roar', 0.6, 1.4); match.popText({ x: 0, y: -230 }, 'HE HUNGERS...', '#c8a8ff'); }
    this.v.mouth = Math.min(1, a.t / 20);
    this.devouring = a.t > 20 && a.t < DEVOUR.time;
    if (this.devouring) {
      for (const f of match.fighters) if (f.alive && f.state !== 'respawn' && Math.abs(f.x) > 8) f.x -= Math.sign(f.x) * DEVOUR.pull;
      if (a.t % 3 === 0) { const q = Math.random() * Math.PI * 2, j = this.joints(); match.particles.push({ x: j.mouth.x + Math.cos(q) * 200, y: j.mouth.y + Math.sin(q) * 120, vx: -Math.cos(q) * 5, vy: -Math.sin(q) * 3, life: 36, color: C.shell[2], size: 1 }); }
      if (a.t % 24 === 0) sfx('whoosh', 0.4, 0.5);
    }
    if (a.t >= DEVOUR.time) { this.devouring = false; this.v.mouth = Math.max(0, 1 - (a.t - DEVOUR.time) / 16); }
    if (a.t > 30 && !this.stars.some((s) => s.st === 'free')) { this.devouring = false; return true; }   // (nothing left to eat)
    return a.t > DEVOUR.time + 16;
  }
  /** SUPERNOVA (TOTAL ECLIPSE): a sun swells between his hands, then bursts into rings of fire with gaps in them - stand in a gap, or dodge. */
  atk_supernova(match, a) {
    const charge = this.sp(NOVA.charge), j = this.joints(), c = { x: j.heart.x, y: j.heart.y - 10 };
    if (a.t === 1) { this.nova = { x: c.x, y: c.y, k: 0 }; sfx('flame', 0.8, 0.5); match.popText({ x: c.x, y: c.y - 40 }, 'SUPERNOVA', '#ffb040'); }
    this.hands.forEach((h) => { h.tx = c.x + h.side * 54; h.ty = c.y; h.ta = -h.side * Math.PI / 2; h.tf = 0; h.glow = 1; });
    if (this.nova) this.nova.k = Math.min(1, a.t / charge);
    if (a.t < charge && a.t % 20 === 0) sfx('rumble', 0.5, 1 + a.t / charge);
    for (let i = 0; i < NOVA.rings; i++) if (a.t === charge + i * NOVA.apart) {
      const gaps = [0, 1].map(() => Math.atan2(160, (Math.random() * 2 - 1) * 240));       // each gap points down at a spot on the floor
      this.rings.push({ x: c.x, y: c.y, r: 20, gaps, id: this.sid('nova') });
      sfx('bighit', 1, 0.5 + i * 0.1); match.shake(10, 14);
    }
    if (a.t === charge) this.nova = null;
    return a.t > charge + NOVA.apart * NOVA.rings + 10;
  }
  /** The SUPERNOVA's rings growing outward: fire everywhere on the ring but its gaps. */
  stepRings(out) {
    for (const R of this.rings) {
      R.r += NOVA.speed;
      const n = Math.ceil(R.r * Math.PI * 2 / 18);
      for (let i = 0; i < n; i++) {
        const q = i / n * Math.PI * 2, x = R.x + Math.cos(q) * R.r, y = R.y + Math.sin(q) * R.r;
        if (y > 6 || y < -380 || Math.abs(x) > 300 || R.gaps.some((g) => Math.abs(Phaser.Math.Angle.Wrap(q - g)) < NOVA.gap)) continue;
        out.push(this.bhit(R.id, x - 10, y - 10, x + 10, y + 10, ...NOVA.hit, { radial: true }));
      }
    }
    this.rings = this.rings.filter((R) => R.r < 560);
  }
  /** COMET (TOTAL ECLIPSE): his maw spits comets that arc onto you and burst; the last one leaves a star. */
  atk_comet(match, a) {
    const every = this.sp(COMET.every);
    this.v.mouth = a.t < COMET.n * every + 10 ? Math.min(1, a.t / 12) : this.v.mouth * 0.85;
    if (a.t >= 14 && (a.t - 14) % every === 0 && (a.t - 14) / every < COMET.n) {
      const j = this.joints(), tg = this.nearest(match, 0), T = COMET.flight, tx = Phaser.Math.Clamp((tg ? tg.x : 0) + (Math.random() - 0.5) * 90, -250, 250), x0 = j.mouth.x, y0 = j.mouth.y;
      this.comets.push({ x: x0, y: y0, vx: (tx - x0) / T, vy: (0 - y0 - 0.5 * COMET.grav * T * T) / T, id: this.sid('comet'), star: (a.t - 14) / every === COMET.n - 1, trail: [] });
      sfx('flame', 0.6, 1.2); sfx('whoosh', 0.5, 1.1);
    }
    return a.t > 14 + COMET.n * every + 30 && !this.comets.length;
  }
  /** Comets fly, trailing fire, and burst on the floor. */
  stepComets(match, out) {
    for (const c of this.comets) {
      c.vy += COMET.grav; c.x += c.vx; c.y += c.vy; c.trail.push({ x: c.x, y: c.y }); if (c.trail.length > 10) c.trail.shift();
      out.push(this.bhit(c.id, c.x - 12, c.y - 12, c.x + 12, c.y + 12, ...COMET.hit, { dirX: Math.sign(c.vx) || 1 }));
      if (c.y >= -4) {
        c.dead = true; sfx('bighit', 0.7, 1); match.shake(5, 6);
        out.push(this.bhit(c.id + 'b', c.x - COMET.r, -COMET.r * 1.2, c.x + COMET.r, 0, ...COMET.hit, { radial: true }));
        for (let i = 0; i < 12; i++) match.particles.push({ x: c.x, y: -4, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 4, life: 20, color: [0xffd040, 0xff7a20, 0xffffff][i % 3], size: 3, grav: 0.2 });
        if (c.star && this.boss) this.addStar(c.x, -10);
      }
    }
    this.comets = this.comets.filter((c) => !c.dead && c.y < 400);
  }

  /**
   * PLANET TOSS: one hand reaches up into the ring round his head and plucks out the ringed planet; it swells to a
   * boulder in his palm, then he hurls it down at you - it lands with a crash and rolls across the floor, rebounding off
   * the arena's edges (PLANET.bounces), then lifts back up into its orbit. The ball moves on its own (stepBall).
   */
  atk_planet(match, a) {
    const j = this.joints(), wind = this.sp(PLANET.wind);
    if (a.t === 1) {
      const tg = this.nearest(match, 0); a.h = this.hands[tg && tg.x > 0 ? 1 : 0];
      this.planetOut = true; this.ball = { x: j.head.x + a.h.side * 80, y: j.head.y - 10, r: 9, vx: 0, vy: 0, st: 'hold', spin: 0, bounce: 0, id: this.sid('planet') };
      sfx('summon', 0.6, 0.8);
    }
    const b = this.ball, h = a.h;
    if (b && b.st === 'hold') {
      const k = Math.min(1, a.t / wind);
      h.tx = j.head.x + h.side * (90 + 20 * k); h.ty = j.head.y - 30 + 50 * k; h.ta = h.side * (0.6 + k * 1.2); h.tf = 0.55; h.glow = k;
      b.x = lerp(b.x, h.x, 0.25); b.y = lerp(b.y, h.y - 26, 0.25); b.r = lerp(9, PLANET.r, k); b.spin += 0.05;
      if (a.t % 12 === 0) sfx('rumble', 0.35, 1.4);
      if (a.t >= wind) {                                                                       // the throw: an arc down onto your spot
        const tg = this.nearest(match, 0), tx = Phaser.Math.Clamp(tg ? tg.x : 0, -225, 225), T = PLANET.flight;
        b.st = 'fly'; b.vx = (tx - b.x) / T; b.vy = (-b.r - b.y - 0.5 * PLANET.grav * T * T) / T; b.dir = Math.sign(tx - b.x) || (Math.random() < 0.5 ? -1 : 1);
        h.tx = h.x + b.dir * 60; h.ty = h.y + 70; h.tf = 0; sfx('whoosh', 0.9, 0.5);
      }
    }
    return a.t > 10 && !this.ball;
  }
  /** The tossed planet: flies, lands with a crash, rolls (rebounding off the edges), then rises back into his orbit. */
  stepBall(match, out) {
    const b = this.ball; if (!b) return;
    const j = this.joints(), roll = PLANET.roll[(this.boss && this.boss.phase === 2) ? 1 : 0];
    if (b.st === 'fly') {
      b.vy += PLANET.grav; b.x += b.vx; b.y += b.vy; b.spin += b.vx * 0.05;
      if (b.y >= -b.r) {
        b.y = -b.r; b.st = 'roll'; sfx('bighit', 1, 0.5); match.shake(9, 12);
        for (let i = 0; i < 14; i++) match.particles.push({ x: b.x, y: -3, vx: (Math.random() - 0.5) * 7, vy: -Math.random() * 4, life: 22, color: [C.marble[2], C.gold[2], 0xd8b06a][i % 3], size: 3, grav: 0.2 });
      }
    } else if (b.st === 'roll') {
      b.x += b.dir * roll; b.spin += b.dir * roll / b.r;
      if (this.t % 4 === 0) match.particles.push({ x: b.x - b.dir * b.r, y: -3, vx: -b.dir * 1.5, vy: -1, life: 14, color: C.marble[2], size: 2 });
      if (this.t % 18 === 0) sfx('rumble', 0.4, 1.6);
      if (Math.abs(b.x) > 262 - b.r && Math.sign(b.x) === b.dir) {
        if (b.bounce < PLANET.bounces[(this.boss && this.boss.phase === 2) ? 1 : 0]) { b.bounce++; b.dir = -b.dir; b.id = this.sid('planet'); sfx('clang', 0.9, 0.5); match.shake(6, 8); }
        else { b.st = 'home'; sfx('summon', 0.5, 1.2); }
      }
    } else if (b.st === 'home') {                                                               // back up into his orbit, shrinking
      b.x = lerp(b.x, j.head.x + 80, 0.06); b.y = lerp(b.y, j.head.y - 10, 0.06); b.r = lerp(b.r, 9, 0.06); b.spin += 0.05;
      if (Math.hypot(b.x - j.head.x - 80, b.y - j.head.y + 10) < 8) { this.ball = null; this.planetOut = false; return; }
    }
    if (b.st === 'fly' || b.st === 'roll') out.push(this.bhit(b.id, b.x - b.r, b.y - b.r, b.x + b.r, b.y + b.r, ...PLANET.hit, { dirX: b.st === 'roll' ? b.dir : Math.sign(b.vx) || 1 }));
  }
  /**
   * CRESCENT BLADES: his shoulders shudder, then he tears the crescent-moon pauldrons free and throws them like
   * boomerangs - one skimming the floor, one at ledge height, crossing each other - and they fly back and lock onto his
   * shoulders. TOTAL ECLIPSE: a second throw with the lanes swapped. The moons move on their own (stepMoons).
   */
  atk_moons(match, a) {
    const wind = this.sp(MOONS.wind);
    if (a.t === 1) { a.pass = 0; a.next = wind; sfx('rumble', 0.6, 0.9); }
    if (!this.moons && a.t < a.next) { this.v.shake = 2 + 3 * (a.t / wind); this.hands.forEach((h) => { h.tx = h.side * 150; h.ty = -150; h.tf = 0.8; h.ta = -h.side * 0.4; }); }
    if (!this.moons && a.t >= a.next) {
      if (a.pass >= MOONS.passes[this.boss.phase - 1]) return true;
      const j = this.joints(), swap = a.pass % 2 === 1;
      this.moons = [-1, 1].map((side) => { const sh = side < 0 ? j.shL : j.shR; return { side, x: sh.x, y: sh.y, a: 0, t: 0, lane: MOONS.lanes[(side < 0) !== swap ? 0 : 1], id: this.sid('moon'), trail: [] }; });
      a.pass++; a.next = a.t + MOONS.fly + 24;
      sfx('slash', 1, 0.6); sfx('whoosh', 0.9, 0.7); match.shake(5, 8);
      this.hands.forEach((h) => { h.tx = h.side * -60; h.ty = -120; h.tf = 0; });
    }
    return false;
  }
  /** The thrown crescents: out to the far edge in their lanes, spinning, and back to his shoulders. */
  stepMoons(match, out) {
    if (!this.moons) return;
    const j = this.joints();
    for (const m of this.moons) {
      m.t++; const u = m.t / MOONS.fly, sh = m.side < 0 ? j.shL : j.shR;
      m.x = lerp(sh.x, -m.side * 285, Math.sin(Math.PI * Math.min(1, u)));
      m.y = u < 0.18 ? lerp(sh.y, m.lane, u / 0.18) : u > 0.82 ? lerp(m.lane, sh.y, (u - 0.82) / 0.18) : m.lane;
      m.a += 0.32 * -m.side; m.trail.push({ x: m.x, y: m.y }); if (m.trail.length > 8) m.trail.shift();
      if (u > 0.08 && u < 0.92) out.push(this.bhit(m.id, m.x - 28, m.y - 16, m.x + 28, m.y + 16, ...MOONS.hit, { dirX: Math.sign(Math.cos(Math.PI * u)) * -m.side || 1 }));
      if (m.t % 14 === 0) sfx('whoosh', 0.35, 1.3);
      if (u >= 1) m.dead = true;
    }
    if (this.moons.every((m) => m.dead)) { this.moons = null; sfx('clang', 0.9, 0.6); match.shake(4, 6); }
  }

  /** You lost: he cups a little light in his hands - yours - lifts it to his maw and swallows it, laughing. */
  onGloat(match, t) {
    if (this.inside) { this.heartGloat(match, t); return; }
    const j = this.joints(), c = { x: j.heart.x, y: j.heart.y - 30 - Math.min(1, t / GLOAT.eat) * 60 };
    this.hands.forEach((h) => { h.tx = c.x + h.side * 34; h.ty = c.y + 10; h.ta = -h.side * 0.9; h.tf = 0.4; });
    this.stepHands();
    this.v.mouth = t > GLOAT.eat - 20 && t < GLOAT.eat + 30 ? 1 : this.v.mouth * 0.9;
    this.gloatLight = t < GLOAT.eat ? c : null;
    if (t === GLOAT.eat) { sfx('summon', 0.8, 0.5); match.shake(6, 10); }
    if (t > GLOAT.eat + 30 && t % 40 === 0) sfx('laugh', 0.6, 0.6);
  }

  // ---- his death
  /** His death runs long (THE STARS COME HOME). */
  deathLen() { return this.crowned ? this.kingDeathLen() : DIE.len; }
  /** The fight's over: everything he's doing stops. */
  onDeath() { if (this.headless || this.crowned) this.heartClear(); this.cbeam = null; this.flyCrown = null; this.crownOff = false; this.ball = null; this.planetOut = false; this.moons = null; this.meteors = []; this.waves = []; this.rings = []; this.comets = []; this.cons = null; this.well = null; this.nova = null; this.devouring = false; this.brk = 0; this.stars = this.stars.filter((s) => s.st === 'shot'); }
  /**
   * THE STARS COME HOME: he convulses, his hands clawing at the sky, and light cracks out of his heart; he implodes
   * into it (everything of him shrinks into the black hole), a white flash - and every star he ever swallowed bursts
   * back out into the sky (`freed`), joining into constellations; a new little star shines where his heart was.
   */
  stepDeath(match) {
    if (this.crowned && this.kingDeath(match)) return;                                     // (THE STAR KING melts: starKing.js)
    const d = this.boss.dying, j = this.joints();
    this.v.shell = Math.max(0, this.v.shell - 0.05);
    if (d < DIE.implode) {
      this.v.shake = 3 + d * 0.05; this.v.slump = lerp(this.v.slump, 0.3, 0.05); this.v.mouth = 0.6 + Math.sin(d * 0.3) * 0.3;
      this.hands.forEach((h, i) => { h.tx = h.side * (190 + Math.sin(d * 0.2 + i) * 20); h.ty = -280 + Math.cos(d * 0.17 + i) * 30; h.tf = 0.7 + Math.sin(d * 0.4) * 0.3; h.ta = h.side * 0.4; });
      if (d % 14 === 0) { sfx('rumble', 0.7, 0.6 + d * 0.004); match.shake(5, 10); }
      if (d === 30) match.popText({ x: j.head.x, y: j.head.y - 10 }, 'NO... THE LIGHT... IT BURNS...', '#e0d4ff');
    } else if (d < DIE.flash) {
      const k = (d - DIE.implode) / (DIE.flash - DIE.implode);
      this.v.scale = Math.max(0.01, 1 - k * k); this.v.shake = 8 * (1 - k);
      if (d === DIE.implode) { sfx('summon', 1, 0.4); sfx('roar', 1, 0.5); }
      if (d % 6 === 0) { const q = Math.random() * Math.PI * 2; match.particles.push({ x: j.heart.x + Math.cos(q) * 260, y: j.heart.y + Math.sin(q) * 180, vx: -Math.cos(q) * 9, vy: -Math.sin(q) * 6, life: 28, color: [0xffffff, C.shell[2], C.star[1]][d % 3], size: 2 }); }
    } else {
      this.v.scale = 0; this.v.vis = 0;
      if (d === DIE.flash) {
        sfx('bighit', 1, 0.4); sfx('thunder', 1, 0.8); sfx('ding', 0.9, 0.7); match.shake(18, 24); this.whiteT = 40;
        const R = seeded(9);
        for (let i = 0; i < 120; i++) { const q = R() * Math.PI * 2, v = 4 + R() * 14; this.freed.push({ x: j.heart.x, y: j.heart.y, vx: Math.cos(q) * v, vy: Math.sin(q) * v * 0.8 - 1, p: R() * 6, s: R() < 0.2 ? 2 : 1, c: [0xffffff, 0xffe070, 0xa8c8ff, 0xffb0e0][i % 4] }); }
        match.popText({ x: j.heart.x, y: j.heart.y - 20 }, '...SO... BRIGHT...', '#fff0b0');
      }
      for (const s of this.freed) { s.vx *= 0.955; s.vy *= 0.955; s.x += s.vx; s.y += s.vy; }
      if (d === DIE.flash + 60) this.links = this.freed.flatMap((a, i) => this.freed.slice(i + 1, i + 9).filter((b) => Math.hypot(a.x - b.x, a.y - b.y) < 70).slice(0, 1).map((b) => [a, b])).filter((_, i) => i % 2 === 0);   // constellations: each star joined to one close neighbour
      if (d === DIE.flash + 70) { sfx('ding', 0.8, 1.6); match.popText({ x: j.heart.x, y: j.heart.y - 10 }, 'THE STARS COME HOME', '#ffe070'); }
    }
  }

  // ---- the entrance
  /**
   * THE ENTRANCE (k = 0..1): the observatory under a full sky; then the stars start going out - streaking toward one
   * point high above the floor, where a black disk grows out of nothing; a corona ignites round it, white-hot eyes
   * open; his body pours out of the dark (robe of night, crescent moons, the black-hole heart), his hands rise up from
   * under the floor, and he spreads them wide over the arena with a roar - the pose the freeze frame stops on.
   */
  introPose(match, k, t, n) {
    this.t++;
    const v = this.v, sw = span(k, ...ENTER.swallow), wk = span(k, ...ENTER.wake), bd = span(k, ...ENTER.body), j = this.joints();
    v.vis = bd; v.corona = wk; v.eye = span(k, 0.5, 0.56); v.slump = 0; v.mouth = k > 0.86 ? Math.min(1, (k - 0.86) * 8) * 0.7 : 0;
    this.voidK = sw;
    if (sw > 0 && sw < 1 && t % 2 === 0) { const s = this.skyStars[(t * 7) % this.skyStars.length]; this.streaks.push({ x: s.x * 0.5, y: s.y * 0.6 - 60, t: 0 }); }
    if (t === Math.round(ENTER.swallow[0] * n)) sfx('summon', 0.7, 0.4);
    if (t === Math.round(ENTER.wake[0] * n) + 6) { sfx('flame', 1, 0.5); match.shake(4, 20); }
    if (t === Math.round(0.5 * n)) { sfx('shing', 0.8, 0.5); for (let i = 0; i < 24; i++) { const q = i / 24 * Math.PI * 2; match.particles.push({ x: j.head.x, y: j.head.y, vx: Math.cos(q) * 4, vy: Math.sin(q) * 4, life: 26, color: C.corona[i % 3], size: 3, drag: 0.93 }); } }
    this.hands.forEach((h, i) => {
      const up = span(k, 0.62, 0.8), wide = span(k, 0.82, 0.95);
      h.x = lerp(HAND.rest[i][0] * 0.8, h.side * 230, wide); h.y = lerp(120, lerp(HAND.rest[i][1], -250, wide), up); h.tx = h.x; h.ty = h.y;
      h.a = lerp(h.side * 0.2, h.side * 0.7, wide); h.ta = h.a; h.fist = 0; h.tf = 0; h.glow = wide;
    });
    if (t === Math.round(0.86 * n)) { sfx('roar', 1, 0.7); sfx('thunder', 0.8, 0.9); match.shake(12, 30); }
  }
  /** The entrance's camera: wide on the sky going out, close on the eclipse as it wakes, back as he rises and spreads his hands. */
  introShot(k) {
    const j = this.joints();
    if (k < ENTER.wake[0]) return { x: 0, y: -200, zoom: 0.95 };
    if (k < ENTER.body[0]) return { x: j.head.x, y: j.head.y + 10, zoom: 1.7 };
    if (k < 0.82) return { x: 0, y: -170, zoom: 1.1 };
    return { x: 0, y: -160, zoom: 0.92 };
  }
  /** The freeze frame: his eclipse face and spread hands. */
  introAt() { if (this.crowned) { const h = this.joints().head; return { x: h.x, y: h.y + 4, zoom: 1.2 }; } if (this.inside && this.heartS) return { x: this.heartS.x, y: this.heartS.y + 34, zoom: 1.45 }; const j = this.joints(); return { x: j.head.x, y: j.head.y + 50, zoom: 1.12 }; }
  /** After the intro: all of him there. */
  endIntro() { super.endIntro(); if (this.headless || this.crowned) return; this.v.vis = 1; this.v.corona = 1; this.v.eye = 1; this.voidK = 0; this.streaks = []; }

  // ------------------------------------------------------------------ hazards (VS too)
  start_meteor(match, h) { h.title = 'METEOR SHOWER!'; for (let i = 0; i < SHOWER.n; i++) this.meteor((Math.random() * 2 - 1) * 245, 30 + i * 14, this.boss && i === 0); }
  /** METEOR SHOWER: the meteors fall on their marks (stepMeteors does the work). */
  step_meteor(match, h) { return h.t > 40 && !this.meteors.length; }
  start_flare(match, h) { h.title = 'SOLAR FLARE!'; this.flare = { s: Math.random() < 0.5 ? -1 : 1, y: Math.random() < 0.5 ? -24 : -122, x: 0, t: 0, id: 'fl' + h.id }; }
  /** SOLAR FLARE: a band glows at one height across the arena, then a beam of sunlight sweeps through it from one side. */
  step_flare(match, h, out) {
    const F = this.flare; if (!F) return true;
    F.t = h.t;
    if (h.t < FLARE.warn) return false;
    if (h.t === FLARE.warn) { sfx('laser', 0.9, 0.6); sfx('flame', 0.6, 0.8); }
    F.x = -F.s * 300 + F.s * (h.t - FLARE.warn) * FLARE.speed;
    const x1 = Math.min(-F.s * 300, F.x), x2 = Math.max(-F.s * 300, F.x);
    out.push(this.bhit(F.id, x1, F.y - FLARE.h, x2, F.y + FLARE.h, ...FLARE.hit, { dirX: F.s }));
    if (Math.abs(F.x) > 320) { this.flare = null; return true; }
    return false;
  }

  /** Moves the observatory and VESPERION one frame; returns hazard + boss hitboxes. */
  step(match) {
    this.t++; this.match = match;
    const out = [], B = this.boss;
    this.cycle.run(match, out);
    if (B) {
      if (this.headless && !B.dying) this.stepHeadless(match);                             // beheaded: the neck, then his heart (starHeart.js)
      else if (this.brk > 0 && !B.dying) {                                                      // THE EVENT HORIZON is shattered: he hangs there, open
        this.brk--; B.atk = null; B.wait = Math.max(B.wait, this.brk + 20); this.devouring = false; this.v.mouth *= 0.9;
        this.v.slump = lerp(this.v.slump, 1, 0.08); this.v.shell = Math.max(0, this.v.shell - 0.1);
        this.hands.forEach((h, i) => { h.tx = h.side * 205; h.ty = -26; h.ta = h.side * 1.4; h.tf = 0.1; h.fast = 0.08; });
        if (this.brk % 40 === 0) sfx('rumble', 0.3, 1.5);
        if (this.brk === 90) match.popText({ x: 0, y: -150 }, 'THE VOID IS CLOSING!', '#c8a8ff');
        if (this.brk === 0) { sfx('summon', 1, 0.5); sfx('roar', 0.8, 0.9); match.shake(8, 16); B.wait = 50; }
      } else if (this.crowned && !B.dying) { this.v.slump = lerp(this.v.slump, this.kingSlump(), 0.06); this.v.shell = 0; this.stepKing(match); }   // (THE STAR KING: starKing.js)
      else if (!B.dying && !this.headless) { this.v.slump = lerp(this.v.slump, 0, 0.06); this.v.shell = Math.min(1, this.v.shell + 0.04); }
      if (!this.low && !this.headless && !this.crowned && B.hp <= B.max * LOW.at && !B.dying) { this.low = true; match.popText({ x: 0, y: -240 }, this.inside ? 'THE LAST LIGHT - IT PANICS!' : 'THE LAST LIGHT', '#ff9a6a'); sfx('roar', 0.9, 0.5); }
      this.bossStep(match, out);
      if (B.dying && this.stars.length) this.stars = this.stars.filter((s) => s.st === 'shot');
      if (!B.dying && !match.over && !this.brk && B.atk == null) this.v.mouth *= 0.9;
      // the CPU (the sim) goes for a loose star while the shell holds, his heart while it's open
      const P = match.bossProxy, free = this.stars.find((s) => s.st === 'free');
      if (P && free && !this.brk && !this.headless) { P.x = free.x; P.y = free.y + 26; }
      if (P && this.headless === 'neck') { const n = this.neckAt(); P.x = n.x; P.y = n.y + 40; }
      if (this.headless) this.stepHeartFx(match, out);
      this.stepStars(match); this.stepWaves(match, out); this.stepRings(out); this.stepComets(match, out); this.stepBall(match, out); this.stepMoons(match, out);
    }
    this.stepMeteors(match, out);
    this.stepHands();
    this.v.shake *= 0.85; if (this.v.shake < 0.2) this.v.shake = 0;
    this.ecl = lerp(this.ecl, B && B.phase === 2 && !B.dying ? 1 : 0, 0.02);
    for (const s of this.streaks) s.t++;
    this.streaks = this.streaks.filter((s) => s.t < 40);
    if (this.whiteT > 0) this.whiteT--;
    return out;
  }

  // ------------------------------------------------------------------ drawing
  /** Draws the twinkling sky, VESPERION (or his sleeping silhouette in VS), his hands, the stars and every effect. */
  render() {
    const B = this.boss, v = this.v;
    if (!B && !this.intro) { v.vis = 0.32; v.eye = 0; v.corona = 0.15; v.shell = 0; this.restHands(false); this.stepHands(); }
    this.drawSky();
    const g = this.bodyG, hg = this.handG, x = this.fxG;
    g.clear(); hg.clear(); x.clear(); this.headG.clear();
    const j = this.joints(), s = v.scale;                                                    // (dying: he shrinks into his heart)
    for (const o of [g, hg]) { o.setScale(s); o.setPosition(j.heart.x * (1 - s), j.heart.y * (1 - s)); }
    if (this.melt > 0) { const k = this.melt; g.setScale(1 + 0.15 * k, 1 - 0.6 * k); g.setPosition(0, 90 * 0.6 * k); }   // (melting: squashed down into the floor)
    if (v.vis > 0.01 && s > 0.01) {
      g.setAlpha(v.vis); hg.setAlpha(Math.min(1, v.vis * 1.4) * (1 - this.melt));
      this.drawBody(g, j, B ? B.flash > 0 : false);
      const hd = this.headG; hd.clear();
      if (!this.headGone) { hd.setPosition(j.head.x * s + g.x, j.head.y * s + g.y).setScale(s * (this.headS || 1)).setRotation(this.headSpin || 0).setAlpha(v.vis); this.drawHead(hd, B ? B.flash > 0 : false); }
      this.hands.forEach((h) => this.drawHand(hg, h, j, B ? B.flash > 0 && this.brk > 0 : false));
    }
    if (this.voidK > 0 && v.vis < 1) {                                                        // the entrance: a black disk opening where his head will be
      const r = BODY.headR * Math.min(1, this.voidK * 1.2);
      x.fillStyle(C.shell[0], 0.25 * this.voidK); x.fillCircle(j.head.x, j.head.y, r + 18); x.fillStyle(0x000000, 1); x.fillCircle(j.head.x, j.head.y, r);
      for (const st of this.streaks) { const q = st.t / 40; x.lineStyle(2, 0xffffff, 0.8 * (1 - q)); x.lineBetween(lerp(st.x, j.head.x, q * q), lerp(st.y, j.head.y, q * q), lerp(st.x, j.head.x, Math.min(1, q * q + 0.1)), lerp(st.y, j.head.y, Math.min(1, q * q + 0.1))); }
      x.lineStyle(0);
    }
    if (this.inside) this.drawInside(this.heartG);
    else { this.drawPhaseFx(x); if (this.crowned) this.drawKingFx(x); }
    this.drawEffects(x, j);
    if (B) this.drawBar();
  }
  /** The sky's live layer: twinkling stars (going out during the entrance), the freed stars after his death, the TOTAL ECLIPSE red. */
  drawSky() {
    const g = this.skyG, t = this.t; g.clear();
    if (this.ecl > 0.01) { g.fillStyle(0x5a0a10, 0.35 * this.ecl); g.fillRect(-760, -480, 1520, 1300); g.fillStyle(0xff3a2a, 0.08 * this.ecl); g.fillCircle(0, -220, 380); }
    const gone = this.voidK ? Math.floor(this.voidK * this.skyStars.length) : 0;
    this.skyStars.forEach((s, i) => { if (i < gone && this.v.vis < 1) return; const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.03 + s.p)); g.fillStyle(0xffffff, a); g.fillRect(s.x, s.y, s.s, s.s); if (s.s > 1 && a > 0.85) { g.fillStyle(0xffffff, 0.4); g.fillRect(s.x - 2, s.y + 0.5, 6, 1); g.fillRect(s.x + 0.5, s.y - 2, 1, 6); } });
  }
  /** The effects in front: meteors and their marks, waves, the well, constellation, the sun and its rings, comets, the stars, the flare, the death's light. */
  drawEffects(x, j) {
    const t = this.t, warn = this.sp(FALL.warn);
    for (const m of this.meteors) {
      if (m.t < 0) continue;
      const f = m.t - warn;
      if (f < 0) { const q = m.t / warn; x.fillStyle(0xff7a20, (0.25 + 0.4 * q) * (t % 6 < 3 ? 1 : 0.6)); x.fillEllipse(m.tx, -1, 44 + 16 * q, 8); x.lineStyle(1, 0xffd040, 0.6); x.strokeEllipse(m.tx, -1, 60 * (1 - q) + 20, 10); x.lineStyle(0); }
      else if (f < FALL.fall) this.drawComet(x, m.x, m.y, m.side * 150 / FALL.fall, 440 / FALL.fall, 15, [0xff5a1a, 0xffa040, 0xfff0b0]);
    }
    for (const w of this.waves) { const a = 1 - w.t / SLAM.wave.life; x.fillStyle(C.crystal[1], 0.5 * a); x.fillEllipse(w.x, -8, 26, 22); x.fillStyle(0xffffff, 0.8 * a); x.fillEllipse(w.x, -10, 10, 14); }
    if (this.well) {
      const W = this.well, r = 26 * W.k;
      for (let i = 0; i < 3; i++) { x.lineStyle(2, [C.disk[1], C.disk[2], C.disk[3]][i], 0.7); x.strokeEllipse(W.x, W.y, (r + 14 + i * 8) * 2 * (1 + 0.1 * Math.sin(t * 0.3 + i)), (r + 4 + i * 3) * 2 * 0.5); }
      x.lineStyle(0); x.fillStyle(C.shell[0], 0.25); x.fillCircle(W.x, W.y, r * 2.2); x.fillStyle(0x000000, 1); x.fillCircle(W.x, W.y, r); x.lineStyle(2, 0xffffff, 0.8); x.strokeCircle(W.x, W.y, r + 1); x.lineStyle(0);
    }
    if (this.cons) {
      const C2 = this.cons, n = C2.pts.length, warn = this.sp(CONST.warn), W = n * CONST.every + warn, fire = C2.t >= W && C2.t < W + CONST.fire;
      for (let i = 0; i < n - 1; i++) {
        const p = C2.pts[i], q = C2.pts[i + 1], shown = C2.t > (i + 1) * CONST.every;
        if (!shown) continue;
        if (fire) { x.lineStyle(14, C.star[0], 0.35); x.lineBetween(p.x, p.y, q.x, q.y); x.lineStyle(7, C.star[1], 0.9); x.lineBetween(p.x, p.y, q.x, q.y); x.lineStyle(2, 0xffffff, 1); x.lineBetween(p.x, p.y, q.x, q.y); }
        else { const k = Math.min(1, (C2.t - (i + 1) * CONST.every) / 10); x.lineStyle(1, C.star[1], (0.35 + 0.45 * (t % 8 < 4 ? 1 : 0.5)) * k); x.lineBetween(p.x, p.y, lerp(p.x, q.x, k), lerp(p.y, q.y, k)); }
      }
      x.lineStyle(0);
      C2.pts.forEach((p, i) => { if (C2.t >= i * CONST.every) this.drawStarShape(x, p.x, p.y, 7 + (fire ? 3 : 0), t * 0.05 + i, 1); });
    }
    if (this.nova) { const N = this.nova, r = 6 + 30 * N.k; x.fillStyle(0xff7a20, 0.2); x.fillCircle(N.x, N.y, r * 2.2); x.fillStyle(0xffb040, 0.6); x.fillCircle(N.x, N.y, r * 1.3); x.fillStyle(0xfff0b0, 1); x.fillCircle(N.x, N.y, r * (0.9 + 0.1 * Math.sin(t * 0.6))); this.drawCorona(x, N.x, N.y, r, [0xff8a20, 0xffc040, 0xfff0b0], 1, 14); }
    for (const R of this.rings) {
      const seg = 72;
      for (let i = 0; i < seg; i++) {
        const q0 = i / seg * Math.PI * 2, q1 = (i + 1) / seg * Math.PI * 2, mid = (q0 + q1) / 2;
        if (R.gaps.some((g) => Math.abs(Phaser.Math.Angle.Wrap(mid - g)) < NOVA.gap)) continue;
        for (const [w, c, a] of [[16, 0xff5a1a, 0.35], [8, 0xffb040, 0.85], [3, 0xfff0b0, 1]]) { x.lineStyle(w, c, a); x.lineBetween(R.x + Math.cos(q0) * R.r, R.y + Math.sin(q0) * R.r, R.x + Math.cos(q1) * R.r, R.y + Math.sin(q1) * R.r); }
      }
      x.lineStyle(0);
    }
    for (const c of this.comets) this.drawComet(x, c.x, c.y, c.vx, c.vy, 11, [0x8a5aff, 0xc8a8ff, 0xffffff]);
    if (this.ball) this.drawPlanet(x, this.ball);
    if (this.moons) for (const m of this.moons) {
      m.trail.forEach((p, i) => { x.fillStyle(C.moon[2], 0.12 * i / m.trail.length); x.fillCircle(p.x, p.y, MOONS.r * 0.8); });
      x.fillStyle(0xe0e8ff, 0.15); x.fillCircle(m.x, m.y, MOONS.r * 1.3); x.fillStyle(C.star[1], 0.18); x.fillCircle(m.x, m.y, MOONS.r * 0.9); x.lineStyle(2, C.star[1], 0.7); x.strokeCircle(m.x, m.y, MOONS.r * 1.05 + Math.sin(this.t * 0.4) * 2); x.lineStyle(0);
      this.crescent(x, m.x, m.y, MOONS.r, m.side, false, m.a);
    }
    if (this.flare) {
      const F = this.flare;
      if (F.t < FLARE.warn) { const k = F.t / FLARE.warn; x.fillStyle(0xffb040, 0.08 + 0.12 * k * (t % 8 < 4 ? 1 : 0.5)); x.fillRect(-300, F.y - FLARE.h, 600, FLARE.h * 2); x.fillStyle(0xfff0b0, 0.5 * k); x.fillCircle(-F.s * 300, F.y, 12 + 16 * k); }
      else { const x1 = Math.min(-F.s * 300, F.x), x2 = Math.max(-F.s * 300, F.x); for (const [hh, c, a] of [[FLARE.h * 1.4, 0xff7a20, 0.3], [FLARE.h, 0xffb040, 0.8], [FLARE.h * 0.45, 0xfff0b0, 1]]) { x.fillStyle(c, a); x.fillRect(x1, F.y - hh, x2 - x1, hh * 2); } x.fillStyle(0xffffff, 1); x.fillCircle(F.x, F.y, FLARE.h * 0.8); }
    }
    for (const s of this.stars) {
      for (let i = 0; i < s.trail.length; i++) { const p = s.trail[i], q = i / s.trail.length; x.fillStyle(s.st === 'shot' ? 0xffe070 : 0xfff8e0, 0.5 * q); x.fillCircle(p.x, p.y, 2 + q * (s.st === 'shot' ? 7 : 4)); }
      const fade = s.st === 'free' && s.life < 120 ? (s.life % 10 < 5 ? 0.4 : 1) : 1;
      x.fillStyle(C.star[1], 0.18 * fade); x.fillCircle(s.x, s.y, 26 + Math.sin(t * 0.15 + s.id) * 4);
      this.drawStarShape(x, s.x, s.y, STAR.r, t * (s.st === 'shot' ? 0.4 : 0.04), fade);
      if (s.st === 'free' && t % 50 < 25) { x.fillStyle(0xffffff, 0.9); x.fillTriangle(s.x - 5, s.y - 30, s.x + 5, s.y - 30, s.x, s.y - 23); }   // a little arrow: hit me
    }
    if (this.gloatLight) { const c = this.gloatLight; x.fillStyle(0xffffff, 0.25); x.fillCircle(c.x, c.y, 22); this.drawStarShape(x, c.x, c.y, 9, t * 0.1, 1); }
    // the death: cracks of light out of him, then the freed stars and their constellations, then the new star
    const B = this.boss, d = B && B.dying;
    if (d && !this.inside && !this.headless && !this.crowned && d >= DIE.crack && d < DIE.flash) {
      const h = j.heart, n = Math.min(12, Math.floor((d - DIE.crack) / 8)), R = seeded(3);
      for (let i = 0; i < n; i++) { const q = R() * Math.PI * 2, L = 120 + R() * 220; x.lineStyle(4, 0xfff0b0, 0.35); x.lineBetween(h.x, h.y, h.x + Math.cos(q) * L * this.v.scale, h.y + Math.sin(q) * L * this.v.scale); x.lineStyle(1.5, 0xffffff, 0.9); x.lineBetween(h.x, h.y, h.x + Math.cos(q) * L * this.v.scale, h.y + Math.sin(q) * L * this.v.scale); }
      x.lineStyle(0);
    }
    if (this.freed.length) {
      const link = d ? Math.min(1, (d - DIE.flash - 60) / 80) : 1;
      if (link > 0 && this.links) { x.lineStyle(1, 0xffe070, 0.45 * link); for (const [a, b] of this.links) x.lineBetween(a.x, a.y, b.x, b.y); x.lineStyle(0); }
      for (const s of this.freed) { const a = 0.5 + 0.5 * Math.abs(Math.sin(t * 0.05 + s.p)); x.fillStyle(s.c, a); x.fillRect(s.x - s.s / 2, s.y - s.s / 2, s.s + 1, s.s + 1); }
      const nb = this.newStar || j.heart; x.fillStyle(0xfff0b0, 0.2); x.fillCircle(nb.x, nb.y, 18 + Math.sin(t * 0.1) * 3); this.drawStarShape(x, nb.x, nb.y, 8, t * 0.02, 1);
    }
    if (this.whiteT > 0) { x.fillStyle(0xffffff, this.whiteT / 40); x.fillRect(-700, -600, 1400, 900); }
  }
  /** A five-pointed star, gold with a white heart, at (x, y): r = its size, a = its turn, al = alpha. */
  drawStarShape(g, x, y, r, a, al) {
    const pts = (rr, ri) => { const p = []; for (let i = 0; i < 10; i++) { const q = a + i / 10 * Math.PI * 2 - Math.PI / 2, R = i % 2 ? ri : rr; p.push({ x: x + Math.cos(q) * R, y: y + Math.sin(q) * R }); } return p; };
    g.fillStyle(C.out, al); g.fillPoints(pts(r + 2.5, r * 0.5 + 2), true);
    g.fillStyle(C.star[0], al); g.fillPoints(pts(r, r * 0.48), true); g.fillStyle(C.star[1], al); g.fillPoints(pts(r * 0.7, r * 0.34), true);
    g.fillStyle(C.star[2], al); g.fillCircle(x, y, r * 0.22);
  }
  /** A comet / meteor: a glowing head with a tail streaming back along its flight (vx, vy). */
  drawComet(g, x, y, vx, vy, r, cols) {
    const d = Math.hypot(vx, vy) || 1, ux = -vx / d, uy = -vy / d, nx = -uy, ny = ux;
    for (let i = 5; i >= 0; i--) { const L = r * (2 + i * 1.6), w = r * (1 - i * 0.13); g.fillStyle(cols[Math.min(2, Math.floor(i / 2))] , 0.18 + 0.1 * (5 - i)); g.fillTriangle(x + nx * w, y + ny * w, x - nx * w, y - ny * w, x + ux * L, y + uy * L); }
    g.fillStyle(cols[0], 0.5); g.fillCircle(x, y, r * 1.5); g.fillStyle(cols[1], 1); g.fillCircle(x, y, r); g.fillStyle(cols[2], 1); g.fillCircle(x - ux * r * 0.2, y - uy * r * 0.2, r * 0.55);
  }
  /** The tossed planet: a banded gas giant (bands slide as it rolls), a storm spot turning with its spin, its tilted ring in front and behind, a shadow on the floor. */
  drawPlanet(g, b) {
    const r = b.r, ring = (front) => { const pts = []; for (let i = 0; i <= 20; i++) { const q = (front ? 0 : Math.PI) + i / 20 * Math.PI; pts.push({ x: b.x + Math.cos(q) * r * 1.9 * Math.cos(-0.35) - Math.sin(q) * r * 0.45 * Math.sin(-0.35), y: b.y + Math.cos(q) * r * 1.9 * Math.sin(-0.35) + Math.sin(q) * r * 0.45 * Math.cos(-0.35) }); } g.lineStyle(4, C.out, 1); g.strokePoints(pts); g.lineStyle(2.5, 0xf0e0b0, 1); g.strokePoints(pts); g.lineStyle(0); };
    if (b.st !== 'roll') { g.fillStyle(0x000000, 0.25); g.fillEllipse(b.x, -2, r * 2.2 * Math.max(0.3, 1 - Math.abs(b.y) / 400), 6); }
    ring(false);
    g.fillStyle(C.out, 1); g.fillCircle(b.x, b.y, r + 2.5); g.fillStyle(0xb88a50, 1); g.fillCircle(b.x, b.y, r);
    for (let i = -3; i <= 3; i++) { const dy = i * r * 0.26 + ((b.spin * r * 0.2) % (r * 0.26)), w = Math.sqrt(Math.max(0, r * r - dy * dy)); if (w > 1) { g.fillStyle([0xd8b06a, 0xa86a3a, 0xe8c88a][(i + 3) % 3], 1); g.fillRect(b.x - w, b.y + dy - r * 0.07, w * 2, r * 0.14); } }
    const sq = Math.cos(b.spin), sx = b.x + Math.sin(b.spin) * r * 0.55;
    if (sq > 0) { g.fillStyle(0xd85a3a, 1); g.fillEllipse(sx, b.y + r * 0.3, r * 0.5 * sq, r * 0.28); g.fillStyle(0xffa080, 1); g.fillEllipse(sx, b.y + r * 0.27, r * 0.25 * sq, r * 0.12); }
    g.fillStyle(0x000000, 0.3); g.fillCircle(b.x + r * 0.3, b.y + r * 0.25, r * 0.8); g.fillStyle(0xfff0d0, 0.5); g.fillCircle(b.x - r * 0.4, b.y - r * 0.4, r * 0.25);
    ring(true);
  }
  /** A ring of flame tongues round (x, y): r = the disk's radius, cols = outer..inner, k = how alight (0..1), n = tongues. */
  drawCorona(g, x, y, r, cols, k, n = 26) {
    const t = this.t;
    for (let layer = 0; layer < 3; layer++) {
      g.fillStyle(cols[layer], (0.3 + layer * 0.25) * k);
      for (let i = 0; i < n; i++) {
        const q = i / n * Math.PI * 2 + t * 0.004 * (layer % 2 ? -1 : 1), L = r * (0.22 + 0.16 * Math.abs(Math.sin(t * 0.08 + i * 1.7 + layer))) * (1 - layer * 0.28) * k, w = 0.17;
        g.fillTriangle(x + Math.cos(q - w) * r * 0.96, y + Math.sin(q - w) * r * 0.96, x + Math.cos(q + w) * r * 0.96, y + Math.sin(q + w) * r * 0.96, x + Math.cos(q) * (r + L), y + Math.sin(q) * (r + L));
      }
    }
  }

  /**
   * VESPERION's body: the fan of golden sun-spikes and the far side of his orbiting planets behind his head, the robe of
   * night sky (nebulae, stars, gold constellations, gold trim), the obsidian breastplate traced with gold, crescent-moon
   * pauldrons, a collar of gold spikes, the black-hole heart (accretion disk spinning) inside THE EVENT HORIZON (cracking
   * as stars hit it; gone while shattered), the ECLIPSE head (corona, black disk, the bright rim of light, slit eyes,
   * the maw of star-teeth over a vortex), and the near side of the planets.
   */
  drawBody(g, j, flash) {
    const t = this.t, Ht = j.heart;
    // the robe: the night sky itself
    const sl = j.shL, sr = j.shR, hem = BODY.hem, top = Ht.y - 60;
    const robe = [{ x: sl.x + 10, y: sl.y - 6 }, { x: sr.x - 10, y: sr.y - 6 }, { x: Ht.x + hem, y: Ht.y + 330 }, { x: Ht.x - hem, y: Ht.y + 330 }];
    g.fillStyle(C.out, 1); g.fillPoints(robe.map((p) => ({ x: p.x + Math.sign(p.x - Ht.x) * 4, y: p.y - 3 })), true);
    g.fillStyle(C.robe[1], 1); g.fillPoints(robe, true);
    for (const [ox, oy, w, h, c] of [[-90, 60, 130, 70, 0], [80, 120, 150, 80, 1], [-40, 190, 160, 70, 2], [110, 20, 70, 50, 3], [-130, 150, 80, 60, 1]]) { g.fillStyle(C.neb[c], 0.22); g.fillEllipse(Ht.x + ox, Ht.y + oy, w, h); g.fillStyle(C.neb[c], 0.12); g.fillEllipse(Ht.x + ox + 10, Ht.y + oy - 6, w * 1.4, h * 1.3); }
    const RS = this.robeStars;
    g.lineStyle(1, C.gold[2], 0.5); for (const L of this.robeLines) for (let i = 0; i + 1 < L.length; i++) { const a = RS[L[i]], b = RS[L[i + 1]]; g.lineBetween(Ht.x + a.x, Ht.y + a.y, Ht.x + b.x, Ht.y + b.y); } g.lineStyle(0);
    for (const s of RS) { const a = 0.45 + 0.55 * Math.abs(Math.sin(t * 0.04 + s.p)); g.fillStyle(0xffffff, a); g.fillRect(Ht.x + s.x, Ht.y + s.y, s.s, s.s); }
    for (const L of this.robeLines) for (const i of L) { const s = RS[i]; g.fillStyle(C.gold[3], 1); g.fillCircle(Ht.x + s.x, Ht.y + s.y, 1.6); }
    g.lineStyle(4, C.gold[1], 1); g.lineBetween(robe[0].x, robe[0].y, robe[3].x, robe[3].y); g.lineBetween(robe[1].x, robe[1].y, robe[2].x, robe[2].y);
    g.lineStyle(1.5, C.gold[3], 1); g.lineBetween(robe[0].x + 3, robe[0].y + 2, robe[3].x + 3, robe[3].y); g.lineBetween(robe[1].x - 3, robe[1].y + 2, robe[2].x - 3, robe[2].y); g.lineStyle(0);
    // the breastplate: obsidian, a V down to his waist, traced with gold
    const P = C.plate, bp = [{ x: sl.x + 34, y: sl.y - 4 }, { x: sr.x - 34, y: sr.y - 4 }, { x: Ht.x + 62, y: Ht.y + 30 }, { x: Ht.x + 30, y: Ht.y + 110 }, { x: Ht.x, y: Ht.y + 128 }, { x: Ht.x - 30, y: Ht.y + 110 }, { x: Ht.x - 62, y: Ht.y + 30 }];
    g.fillStyle(C.out, 1); g.fillPoints(bp.map((p) => ({ x: Ht.x + (p.x - Ht.x) * 1.06, y: Ht.y + (p.y - Ht.y) * 1.04 })), true);
    g.fillStyle(flash ? 0xffffff : P[1], 1); g.fillPoints(bp, true);
    g.fillStyle(flash ? 0xffffff : P[2], 1); g.fillPoints([bp[0], { x: Ht.x - 8, y: top }, { x: Ht.x - 12, y: Ht.y + 112 }, bp[5], bp[6]], true);
    g.fillStyle(P[3], 0.6); g.fillPoints([{ x: bp[0].x + 6, y: bp[0].y + 4 }, { x: Ht.x - 20, y: top + 6 }, { x: Ht.x - 50, y: Ht.y + 20 }], true);
    g.lineStyle(2, C.gold[2], 1); g.strokePoints(bp, true);
    g.lineStyle(1.5, C.gold[2], 0.85); for (const sx of [-1, 1]) { g.lineBetween(Ht.x + sx * 46, Ht.y + 40, Ht.x + sx * 22, Ht.y + 100); g.lineBetween(Ht.x + sx * 70, sl.y + 10, Ht.x + sx * 46, Ht.y - 34); g.strokeCircle(Ht.x + sx * 44, Ht.y + 64, 6); }
    g.lineStyle(0);
    // the crescent-moon pauldrons
    for (const [p, sd] of [[sl, -1], [sr, 1]]) if (!this.moons) this.crescent(g, p.x + sd * 6, p.y - 6, 46, sd, flash);   // (not while he's thrown them)
    if (this.moons) for (const p of [sl, sr]) { g.fillStyle(C.moon[1], 0.25 + 0.2 * Math.sin(this.t * 0.3)); g.fillCircle(p.x, p.y, 14); }
    // the collar of gold spikes round his neck
    for (let i = -4; i <= 4; i++) { const bx = Ht.x + i * 14, by = top + 4; g.fillStyle(C.out, 1); g.fillTriangle(bx - 8, by + 2, bx + 8, by + 2, bx + i * 3, by - 26 + Math.abs(i) * 2); g.fillStyle(C.gold[i % 2 ? 1 : 2], 1); g.fillTriangle(bx - 6, by, bx + 6, by, bx + i * 3, by - 22 + Math.abs(i) * 2); }
    // the black-hole heart (gone once he's beheaded: the torn neck instead - starHeart.js)
    if (this.crowned) this.drawWound(g, Ht); else if (!this.headless) this.drawHeart(g, Ht, flash);
    if (this.headless || this.neckCrack > 0) this.drawNeck(g, Ht);
    if (this.melt > 0) this.drawMelt(g, j);
  }
  /**
   * His ECLIPSE head, drawn round (0, 0) on its own layer (`headG`, placed and turned by render) so it can come off,
   * be carried and spun: the fan of golden sun-spikes and the far side of his orbiting planets behind it, the corona,
   * the black disk with its bright rim, the maw, the slit eyes, the near planets - and once he's crowned (starKing.js)
   * the evil face and the gem crown on top.
   */
  drawHead(g, flash) {
    const t = this.t, v = this.v, H = { x: 0, y: 0 }, rage = Math.max(this.ecl, v.evil || 0), cor = rage > 0.5 ? C.rage : C.corona, R = BODY.headR;
    const lowFlick = this.low && !(this.boss && this.boss.dying) ? (Math.sin(t * 0.7) > 0.6 ? 0.55 : 1) : 1;
    // the fan of sun-spikes behind his head
    for (let i = 0; i < 11; i++) {
      const q = -Math.PI / 2 + (i - 5) * 0.27 + Math.sin(t * 0.01) * 0.03, L = (i % 2 ? 64 : 96) + Math.sin(t * 0.04 + i) * 4, w = 0.09;
      const p = [{ x: H.x + Math.cos(q - w) * R * 0.8, y: H.y + Math.sin(q - w) * R * 0.8 }, { x: H.x + Math.cos(q) * (R + L), y: H.y + Math.sin(q) * (R + L) }, { x: H.x + Math.cos(q + w) * R * 0.8, y: H.y + Math.sin(q + w) * R * 0.8 }];
      g.fillStyle(C.out, v.corona); g.fillPoints(p.map((o) => ({ x: o.x + (o.x - H.x) * 0.04, y: o.y + (o.y - H.y) * 0.04 })), true);
      g.fillStyle(rage > 0.5 ? C.rage[1] : C.gold[1], v.corona); g.fillPoints(p, true); g.fillStyle(rage > 0.5 ? C.rage[2] : C.gold[3], v.corona); g.fillPoints([p[0], p[1], { x: (p[0].x + p[2].x) / 2, y: (p[0].y + p[2].y) / 2 }], true);
    }
    this.drawOrbit(g, H, false);
    // the eclipse head
    this.drawCorona(g, H.x, H.y, R, cor, v.corona * lowFlick);
    g.fillStyle(cor[0], 0.12 * v.corona); g.fillCircle(H.x, H.y, R + 30);
    g.fillStyle(0x000000, 1); g.fillCircle(H.x, H.y, R);
    g.lineStyle(3, cor[2], 0.9 * v.corona * lowFlick); g.strokeCircle(H.x, H.y, R); g.lineStyle(1, 0xffffff, 0.8 * v.corona); g.strokeCircle(H.x, H.y, R - 1.5); g.lineStyle(0);
    const dq = -2.3; g.fillStyle(0xffffff, v.corona); g.fillCircle(H.x + Math.cos(dq) * R, H.y + Math.sin(dq) * R, 4); g.fillStyle(0xffffff, 0.5 * v.corona); g.fillTriangle(H.x + Math.cos(dq) * R - 14, H.y + Math.sin(dq) * R, H.x + Math.cos(dq) * R + 14, H.y + Math.sin(dq) * R, H.x + Math.cos(dq) * R, H.y + Math.sin(dq) * R - 1);   // the diamond ring
    g.fillStyle(C.plate[1], 1); g.fillCircle(H.x + 6, H.y + 6, R * 0.86); g.fillStyle(0x000000, 1); g.fillCircle(H.x + 2, H.y + 2, R * 0.86);
    if (v.mouth > 0.15) {                                                                    // the maw: a vortex ringed with star-teeth
      const m = (v.mouth - 0.15) / 0.85, big = 1 + (this.mawBig || 0) * 0.55, mx = H.x, my = H.y + 20 - (this.mawBig || 0) * 4, w = (18 * m + 4) * big, h = (20 * m + 2) * big;   // (big: his fallen head's jaw hangs wide open)
      g.fillStyle(C.shell[0], 1); g.fillEllipse(mx, my, w * 2, h * 2);
      for (let i = 0; i < 4; i++) { g.fillStyle([C.disk[3], C.disk[2], C.shell[1], 0x000000][i], 1); g.fillEllipse(mx + Math.sin(t * 0.2 + i) * 2, my + Math.cos(t * 0.2 + i) * 2, w * 2 * (1 - i * 0.22), h * 2 * (1 - i * 0.22)); }
      g.lineStyle(2, C.shell[2], 0.9); g.strokeEllipse(mx, my, w * 2, h * 2); g.lineStyle(0);
      for (let i = 0; i < 12; i++) { const q = i / 12 * Math.PI * 2, ex = mx + Math.cos(q) * w, ey = my + Math.sin(q) * h, L = (i % 2 ? 6 : 10) * m, b = 3.5; g.fillStyle(C.out, 1); g.fillTriangle(ex + Math.cos(q + 1.57) * (b + 1), ey + Math.sin(q + 1.57) * (b + 1), ex - Math.cos(q + 1.57) * (b + 1), ey - Math.sin(q + 1.57) * (b + 1), ex - Math.cos(q) * (L + 2), ey - Math.sin(q) * (L + 2)); g.fillStyle(i % 2 ? C.star[1] : 0xfff8e0, 1); g.fillTriangle(ex + Math.cos(q + 1.57) * b, ey + Math.sin(q + 1.57) * b, ex - Math.cos(q + 1.57) * b, ey - Math.sin(q + 1.57) * b, ex - Math.cos(q) * L, ey - Math.sin(q) * L); }
    }
    if (v.eye > 0.02) {                                                                      // the eyes: white-hot slits, angry
      const e = v.eye, hot = rage > 0.5 ? 0xff5a3a : 0xfff0b0, glow = rage > 0.5 ? 0xff2a1a : 0xffc040, open = this.brk > 0 ? 0.5 : 1;
      for (const sx of [-1, 1]) {
        const ex = H.x + sx * 17, ey = H.y - 6 + (this.brk ? 6 : 0);
        g.fillStyle(glow, 0.22 * e); g.fillEllipse(ex, ey, 34, 16 * e); g.fillStyle(glow, 0.35 * e); g.fillEllipse(ex, ey, 22, 8 * e);
        const eye = [{ x: ex - sx * 11, y: ey + 4 * open }, { x: ex + sx * 13, y: ey - 7 * open }, { x: ex + sx * 9, y: ey + 1 * e * open }, { x: ex - sx * 6, y: ey + 7 * e * open }];   // inner corner low, outer high: a glare
        g.fillStyle(glow, e); g.fillPoints(eye.map((p) => ({ x: ex + (p.x - ex) * 1.2, y: ey + (p.y - ey) * 1.35 })), true);
        g.fillStyle(hot, e); g.fillPoints(eye, true);
        g.fillStyle(0xffffff, e); g.fillPoints([{ x: ex - sx * 6, y: ey + 3 * open }, { x: ex + sx * 8, y: ey - 3 * open }, { x: ex + sx * 5, y: ey + 1 * open }, { x: ex - sx * 3, y: ey + 4 * open }], true);
      }
    }
    if (flash) { g.fillStyle(0xffffff, 0.35); g.fillCircle(H.x, H.y, R); }
    this.drawOrbit(g, H, true);
    if (v.evil > 0) this.drawEvilFace(g, H, R, v.evil, flash);
    if (this.crownK > 0 && !this.crownOff) this.drawCrown(g, 0, -R + 6, this.crownK, 0, this.crownGlow || 0);
    if (this.lava > 0) this.drawLavaCracks(g, H, R, this.lava);
  }
  /** The ring of planets orbiting his head: back = the far half (behind him), else the near half. */
  drawOrbit(g, H, front) {
    const t = this.t, rx = 92, ry = 22, tilt = -0.2, v = this.v;
    const at = (q) => { const x = Math.cos(q) * rx, y = Math.sin(q) * ry; return { x: H.x + x * Math.cos(tilt) - y * Math.sin(tilt), y: H.y - 4 + x * Math.sin(tilt) + y * Math.cos(tilt) }; };
    const pts = []; for (let i = 0; i <= 24; i++) pts.push(at((front ? 0 : Math.PI) + i / 24 * Math.PI));
    g.lineStyle(2, C.gold[2], 0.55 * v.corona); g.strokePoints(pts); g.lineStyle(0);
    for (const [ph, r, c] of [[0, 7, 0x6ac8e8], [2.1, 5, 0xe86a4a], [4.2, 9, 0xd8b06a]]) {
      const q = ((ph + t * 0.012) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2), near = Math.sin(q) > 0;
      if (near !== front || (r > 8 && this.planetOut)) continue;   // (the ringed one's gone while he's thrown it)
      const p = at(q); g.fillStyle(C.out, v.corona); g.fillCircle(p.x, p.y, r + 1.5); g.fillStyle(c, v.corona); g.fillCircle(p.x, p.y, r); g.fillStyle(0x000000, 0.35 * v.corona); g.fillCircle(p.x + r * 0.35, p.y + r * 0.3, r * 0.75); g.fillStyle(0xffffff, 0.6 * v.corona); g.fillCircle(p.x - r * 0.4, p.y - r * 0.4, r * 0.25);
      if (r > 8) { g.lineStyle(1.5, 0xf0e0b0, 0.8 * v.corona); g.strokeEllipse(p.x, p.y, r * 3.6, r * 0.9); g.lineStyle(0); }
    }
  }
  /** A crescent moon at (x, y), r big, horns curving up and outward (side = -1 left / 1 right), turned by ang (a thrown one spins). */
  crescent(g, x, y, r, side, flash, ang = 0) {
    const ca = Math.cos(ang), sa = Math.sin(ang), T = (p) => ({ x: x + (p.x - x) * ca - (p.y - y) * sa, y: y + (p.x - x) * sa + (p.y - y) * ca });
    const outer = [], inner = [];
    for (let i = 0; i <= 20; i++) { const q = -0.25 + i / 20 * (Math.PI + 0.5); outer.push({ x: x + Math.cos(q) * r, y: y + Math.sin(q) * r * 0.8 }); }
    for (let i = 20; i >= 0; i--) { const q = -0.1 + i / 20 * (Math.PI + 0.2); inner.push({ x: x + side * 4 + Math.cos(q) * r * 0.72, y: y - 12 + Math.sin(q) * r * 0.62 }); }
    for (const L of [outer, inner]) L.forEach((p, i) => { L[i] = T(p); });
    const shape = [...outer, ...inner];
    g.fillStyle(C.out, 1); g.fillPoints(shape.map((p) => ({ x: x + (p.x - x) * 1.07, y: y + (p.y - y) * 1.08 })), true);
    g.fillStyle(flash ? 0xffffff : C.moon[1], 1); g.fillPoints(shape, true);
    g.fillStyle(C.moon[2], 1); g.fillPoints(outer.slice(2, 10).concat(inner.slice(12, 19)), true);
    g.fillStyle(C.moon[0], 0.8); for (const [ox, oy, rr] of [[-16, 14, 5], [10, 20, 4], [22, 8, 3], [-4, 24, 3]]) { const c = T({ x: x + ox * side * r / 46, y: y + oy * r / 46 }); g.fillCircle(c.x, c.y, rr * r / 46); }   // its craters
    g.fillStyle(0xe0e8ff, 0.12); g.fillCircle(x, y + 6, r * 1.1);
  }
  /** His heart: a black hole with a spinning accretion disk and its ring of light, inside THE EVENT HORIZON (cracked by the stars that hit it). */
  drawHeart(g, h, flash) {
    const t = this.t, open = this.brk > 0, pulse = open ? 1 + 0.12 * Math.sin(t * 0.25) : 1;
    g.fillStyle(C.disk[2], open ? 0.3 : 0.15); g.fillCircle(h.x, h.y, 50 * pulse);
    for (let ring = 0; ring < 4; ring++) {                                                   // the accretion disk: dashes racing round
      const rx = (40 - ring * 6) * pulse, ry = (13 - ring * 2) * pulse;
      for (let i = 0; i < 14; i++) { const q = i / 14 * Math.PI * 2 + t * (0.06 + ring * 0.02); g.fillStyle(C.disk[ring], 0.85); g.fillEllipse(h.x + Math.cos(q) * rx, h.y + Math.sin(q) * ry, 9 - ring, 4); }
    }
    g.fillStyle(0x000000, 1); g.fillCircle(h.x, h.y, 15 * pulse); g.lineStyle(2, 0xffffff, 0.9); g.strokeCircle(h.x, h.y, 16.5 * pulse); g.lineStyle(1, C.disk[1], 0.8); g.strokeCircle(h.x, h.y, 20 * pulse); g.lineStyle(0);
    for (let i = 0; i < 7; i++) { const q = i / 7 * Math.PI + Math.PI + t * 0.06; g.fillStyle(C.disk[1], 0.9); g.fillEllipse(h.x + Math.cos(q) * 36 * pulse, h.y + Math.sin(q) * 12 * pulse, 8, 3); }   // (the near side, over the hole)
    if (flash) { g.fillStyle(0xffffff, 0.5); g.fillCircle(h.x, h.y, 30); }
    const sh = this.v.shell;
    if (sh > 0.02) {                                                                         // THE EVENT HORIZON
      const r = 44;
      g.fillStyle(C.shell[0], 0.16 * sh); g.fillCircle(h.x, h.y, r); g.fillStyle(C.shell[1], 0.1 * sh); g.fillCircle(h.x - 10, h.y - 12, r * 0.55);
      g.lineStyle(2, C.shell[1], 0.75 * sh); g.strokeCircle(h.x, h.y, r); g.lineStyle(1, C.shell[2], 0.5 * sh);
      for (let i = 0; i < 3; i++) { const q = t * 0.01 + i * 2.1; g.strokeEllipse(h.x, h.y, r * 2 * Math.abs(Math.cos(q)), r * 2); }
      g.lineStyle(0);
      const R = seeded(13);                                                                  // the cracks the stars have made
      for (let c = 0; c < this.cracks; c++) {
        const q = R() * Math.PI * 2; let px = h.x + Math.cos(q) * r, py = h.y + Math.sin(q) * r;
        g.lineStyle(2.5, 0xffffff, 0.95 * sh); g.lineStyle(2, C.star[1], 0.95 * sh);
        for (let k = 0; k < 4; k++) { const nx = px + (h.x - px) * 0.3 + (R() - 0.5) * 18, ny = py + (h.y - py) * 0.3 + (R() - 0.5) * 18; g.lineBetween(px, py, nx, ny); if (k === 1) g.lineBetween(nx, ny, nx + (R() - 0.5) * 22, ny + (R() - 0.5) * 22); px = nx; py = ny; }
      }
      g.lineStyle(0);
    }
  }
  /**
   * One of his hands: a trailing sleeve of nebula back toward his shoulder, a giant obsidian gauntlet - gold knuckle
   * plates, four long claws with gold tips, a thumb - and a star burning in the palm. h.a = its turn (0 = fingers up),
   * h.fist = how closed, h.glow = the palm-star's flare.
   */
  drawHand(g, h, j, flash) {
    const t = this.t, sd = h.side, ca = Math.cos(h.a), sa = Math.sin(h.a), S = HAND.palm / 24;
    const W = (lx, ly) => ({ x: h.x + (lx * sd * ca - ly * sa) * S, y: h.y + (lx * sd * sa + ly * ca) * S });
    const sh = sd < 0 ? j.shL : j.shR, wr = W(0, 28);                                      // the sleeve of nebula, back to his shoulder
    for (let i = 0; i < 12; i++) { const q = i / 11, cx = lerp(lerp(wr.x, (wr.x + sh.x) / 2 + sd * 40, q), lerp((wr.x + sh.x) / 2 + sd * 40, sh.x, q), q), cy = lerp(lerp(wr.y, Math.max(wr.y, sh.y) + 60, q), lerp(Math.max(wr.y, sh.y) + 60, sh.y, q), q); g.fillStyle(i % 2 ? C.neb[0] : C.shell[0], 0.3 * (1 - q * 0.7)); g.fillCircle(cx + Math.sin(t * 0.05 + i) * 3, cy, 20 - q * 8); if (i % 3 === 1) { g.fillStyle(0xffffff, 0.7); g.fillRect(cx + Math.sin(i * 7) * 8, cy + Math.cos(i * 5) * 6, 1, 1); } }
    const P = C.plate, f = h.fist, fill = flash ? 0xffffff : P[1];
    const finger = (bx, ang, L1, L2, w) => {
      const c = Math.cos(ang), s = Math.sin(ang), m = { x: bx + s * L1 * (1 - 0.55 * f), y: -20 - c * L1 * (1 - 0.55 * f) }, e = { x: m.x + s * L2 * (1 - 0.75 * f), y: m.y - c * L2 * (1 - 0.75 * f) };
      const seg = (a, b, wa, wb, col) => { const A = W(a.x, a.y), Bb = W(b.x, b.y), L = Math.hypot(Bb.x - A.x, Bb.y - A.y) || 1, nx = -(Bb.y - A.y) / L, ny = (Bb.x - A.x) / L; g.fillStyle(col, 1); g.fillPoints([{ x: A.x + nx * wa, y: A.y + ny * wa }, { x: Bb.x + nx * wb, y: Bb.y + ny * wb }, { x: Bb.x - nx * wb, y: Bb.y - ny * wb }, { x: A.x - nx * wa, y: A.y - ny * wa }], true); };
      const b = { x: bx, y: -18 };
      seg(b, m, w + 2.5, w + 1.5, C.out); seg(m, e, w + 1.5, 2.5, C.out);
      seg(b, m, w, w - 1, fill); seg(m, e, w - 1, 1, fill);
      const tip = W(e.x, e.y), mm = W(m.x, m.y); g.fillStyle(C.gold[2], 1); g.fillCircle(mm.x, mm.y, w * 0.55);
      const tq = { x: e.x + s * 7, y: e.y - c * 7 }, T = W(tq.x, tq.y), E1 = W(e.x - 3, e.y), E2 = W(e.x + 3, e.y); g.fillStyle(C.out, 1); g.fillTriangle(E1.x, E1.y, E2.x, E2.y, T.x, T.y); g.fillStyle(C.gold[3], 1); g.fillTriangle(E1.x + (tip.x - E1.x) * 0.2, E1.y, E2.x, E2.y, T.x, T.y);
    };
    [[-15, -0.3, 20, 18, 5], [-5, -0.1, 23, 20, 5.5], [5, 0.08, 22, 19, 5.5], [15, 0.28, 18, 16, 4.5]].forEach(([bx, a, L1, L2, w]) => finger(bx, a, L1, L2, w));
    finger(22, 1.2 - f * 0.8, 14, 12, 5);                                                  // the thumb (toward his body)
    const palm = []; for (let i = 0; i < 8; i++) { const q = i / 8 * Math.PI * 2 + Math.PI / 8; palm.push(W(Math.cos(q) * 24, Math.sin(q) * 22 - 2)); }
    g.fillStyle(C.out, 1); g.fillPoints(palm.map((p) => ({ x: h.x + (p.x - h.x) * 1.13, y: h.y + (p.y - h.y) * 1.13 })), true);
    g.fillStyle(fill, 1); g.fillPoints(palm, true);
    g.fillStyle(flash ? 0xffffff : P[2], 1); g.fillPoints([palm[5], palm[6], palm[7], W(0, -2)], true);
    g.lineStyle(2, C.gold[2], 1); g.strokePoints(palm, true); g.lineStyle(0);
    const k1 = W(-20, -20), k2 = W(20, -20); g.lineStyle(5, C.gold[1], 1); g.lineBetween(k1.x, k1.y, k2.x, k2.y); g.lineStyle(2, C.gold[3], 1); g.lineBetween(k1.x, k1.y - 1, k2.x, k2.y - 1); g.lineStyle(0);
    const c = W(0, 2), gl = 0.6 + 0.4 * Math.sin(t * 0.12 + sd) + h.glow;                  // the star in its palm
    g.fillStyle(C.star[0], 0.18 * gl); g.fillCircle(c.x, c.y, 18 + h.glow * 10); g.fillStyle(C.star[1], 0.5); g.fillCircle(c.x, c.y, 8);
    this.drawStarShape(g, c.x, c.y, 7 + h.glow * 2, t * 0.03 * sd, 1);
  }
}

for (const M of [HeartPhase, KingPhase]) for (const k of Object.getOwnPropertyNames(M.prototype)) {   // VESPERION's heart and crowning (starHeart.js, starKing.js)
  if (k === 'constructor') continue;
  if (Object.prototype.hasOwnProperty.call(StarBossStage.prototype, k)) throw new Error(M.name + ': ' + k + ' already exists on StarBossStage');
  StarBossStage.prototype[k] = M.prototype[k];
}

/** THE LAST OBSERVATORY's miniature for the stage select screen: space, a gold-ringed eclipse, the marble floor. */
export function drawObservatoryPreview(g, x, y, w, h) {
  C.sky.forEach((c, i, A) => { g.fillStyle(c, 1); g.fillRect(x, y + i * h / A.length, w, h / A.length + 1); });
  g.fillStyle(C.neb[0], 0.25); g.fillEllipse(x + w * 0.3, y + h * 0.3, w * 0.6, h * 0.3); g.fillStyle(C.neb[1], 0.2); g.fillEllipse(x + w * 0.7, y + h * 0.5, w * 0.5, h * 0.25);
  const R = seeded(2); for (let i = 0; i < 30; i++) { g.fillStyle(0xffffff, 0.5 + R() * 0.5); g.fillRect(x + R() * w, y + R() * h * 0.7, 1, 1); }
  const cx = x + w * 0.5, cy = y + h * 0.32, r = Math.min(w, h) * 0.13;
  g.fillStyle(C.robe[1], 1); g.fillTriangle(cx - r * 2.4, y + h * 0.5, cx + r * 2.4, y + h * 0.5, cx, y + h * 1.4);
  g.fillStyle(C.corona[0], 0.4); g.fillCircle(cx, cy, r * 1.5); g.fillStyle(C.corona[2], 1); g.fillCircle(cx, cy, r * 1.08); g.fillStyle(0x000000, 1); g.fillCircle(cx, cy, r);
  g.fillStyle(0xfff0b0, 1); g.fillRect(cx - r * 0.55, cy - 1, r * 0.4, 2); g.fillRect(cx + r * 0.15, cy - 1, r * 0.4, 2);
  g.fillStyle(C.disk[1], 1); g.fillEllipse(cx, cy + r * 2.3, r * 1.6, r * 0.5); g.fillStyle(0x000000, 1); g.fillCircle(cx, cy + r * 2.3, r * 0.3);
  g.fillStyle(C.deep[1], 1); g.fillRect(x + w * 0.08, y + h * 0.72, w * 0.84, h * 0.16); g.fillStyle(C.marble[2], 1); g.fillRect(x + w * 0.08, y + h * 0.7, w * 0.84, h * 0.04);
  g.fillStyle(C.gold[2], 1); g.fillRect(x + w * 0.08, y + h * 0.75, w * 0.84, 1);
  g.fillStyle(C.star[1], 1); g.fillCircle(x + w * 0.3, y + h * 0.62, 2);
}

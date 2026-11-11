// STARLIGHT FOUNTAIN: an original homage to the dreamy fountain stages of the early-2000s console era, in low-poly 3D
// (poly3d.js): a pale marble stage on a lavender crystal rock under a starry twilight sky, a great tiered fountain
// behind it throwing arcs of glittering water, crystal spires rising from a dark lake, sparkles drifting up. Its two
// side platforms rise and sink slowly. Now and then a DREAM GEYSER bubbles up through the floor and bursts.
import { Poly3D, boxFaces, prismFaces, blobFaces, rockFaces } from './poly3d.js';
import { HazardCycle } from './hazardCycle.js';
import { sfx } from '../audio/sfx.js';

const C = { marble: 0xe0d8f0, marbleTop: 0xf6f0fe, trim: 0x6a7ad8, crystal: [0x8a7ac8, 0x6a5aa8, 0x9a8ad8, 0x5a4a98], water: 0x7ac8f8, waterTop: 0x5aa8f0,
  foam: 0xe8f8ff, spire: [0xa8e0f0, 0xc8b8f0, 0xb8d0f8], lake: [0x2a2a7a, 0x343a90, 0x2e3086, 0x40489e],
  sky: [0x120e34, 0x1e1648, 0x2c1e5e, 0x402a76, 0x5a3a8a, 0x7a4a9a, 0xa868a8, 0xd890b8], fog: 0x4a3a88 };
// the side platforms: how far they rise and sink (px) and how long one full trip takes (frames)
const LIFT = { amp: 30, period: 560 };
// DREAM GEYSER: frames of bubbling before it bursts, how long the column lasts, its width, how tall, how it hits
const GEYSER = { warn: 70, burst: 44, half: 22, height: 250, hit: { dmg: 6, angle: 90, base: 7.5, growth: 0.5 } };
// the fountain behind the stage: its centre (z = how far back) and where its tiers sit
const FOUNT = { z: 620, spout: -175, bowl: -130, mid: 50, low: 330 };

/** STARLIGHT FOUNTAIN: the marble stage, its rising and sinking side platforms, the fountain, DREAM GEYSER. */
export class StarlightFountainStage {
  constructor(scene) {
    this.scene = scene; this.t = 0; this.hazardsOn = true; this.music = 'bgm_aero';
    this.platforms = [
      { x1: -240, x2: 240, y: 0, solid: true, bottom: 60 },
      { x1: -195, x2: -95, y: -88, solid: false },
      { x1: 95, x2: 195, y: -88, solid: false },
      { x1: -50, x2: 50, y: -170, solid: false },
    ];
    this.lifts = [{ p: this.platforms[1], y0: -88, ph: 0 }, { p: this.platforms[2], y0: -88, ph: Math.PI }];
    this.spawns = [{ x: -150, y: 0 }, { x: 150, y: 0 }, { x: -50, y: 0 }, { x: 50, y: 0 }];
    this.geyser = null; this.count = 0;
    this.cycle = new HazardCycle(this, ['geyser'], { gap: 600, jitter: 360, first: 480, color: '#c8b8f8', stroke: '#1e1648' });
    // the stars (fixed to the screen): where, how big, how fast they twinkle
    this.stars = Array.from({ length: 70 }, (_, i) => ({ x: (i * 97.3) % 640, y: (i * 53.7) % 200, s: i % 9 === 0 ? 2 : 1, ph: i * 1.7 }));
  }

  /** Builds the twilight sky, the stars and the static 3D world: lake, hills, spires, the fountain, the marble stage. */
  draw(world, bg) {
    const s = this.scene, sky = s.add.graphics().setScrollFactor(0);
    C.sky.forEach((c, i) => { sky.fillStyle(c, 1); sky.fillRect(-400, -60 + i * 52, 1440, 53); });
    sky.fillStyle(0xd890b8, 1); sky.fillRect(-400, 356, 1440, 400);
    this.starG = s.add.graphics().setScrollFactor(0);
    bg.push(sky, this.starG);
    this.cycle.makeBanner(s);
    const R = this.R = new Poly3D(s, world, { fog: C.fog, zFar: 3200, zNear: 400 });
    // the dark lake, lavender hills on the far shore
    R.terrain({ x1: -2800, x2: 2800, z1: 150, z2: 3400, y: 430, nx: 26, nz: 12, amp: 5, seed: 6, cols: C.lake });
    for (const [x, z, w, h] of [[-1800, 2700, 1200, 380], [1500, 2900, 1400, 440], [-300, 3200, 1600, 320], [2400, 2200, 900, 300], [-2500, 2000, 900, 340]]) R.blob(x, 430, z, w / 2, h, 300, [0x4a3a7a, 0x5a4a8a, 0x3e3070], x, 0x6a5aa0, 0.25);
    // crystal spires rising out of the water around the fountain
    for (const [x, z, h] of [[-520, 760, 520], [520, 760, 520], [-860, 1000, 640], [860, 1000, 640], [-300, 1150, 420], [300, 1150, 420], [-1300, 1300, 760], [1300, 1300, 760]]) {
      const c = C.spire[Math.abs(x / 10) % 3 | 0];
      R.prism(x, 430 - h, 430, z, 34, 4, c); R.pyramid(x, 430 - h, z, 70, 70, 90, c);
    }
    // the fountain: a wide low basin, a column, a middle basin, a slimmer column, the top bowl (water on every tier)
    const z = FOUNT.z;
    R.prism(0, FOUNT.low, 430, z, 380, 8, C.marble, C.waterTop);
    R.prism(0, FOUNT.low - 10, FOUNT.low + 6, z, 392, 8, C.trim);
    R.prism(0, FOUNT.mid + 30, FOUNT.low, z, 60, 8, C.marble);
    R.prism(0, FOUNT.mid, FOUNT.mid + 40, z, 220, 8, C.marble, C.waterTop);
    R.prism(0, FOUNT.bowl + 20, FOUNT.mid, z, 30, 6, C.marble);
    R.prism(0, FOUNT.bowl, FOUNT.bowl + 26, z, 110, 8, C.marble, C.waterTop);
    // the stage: marble top, a blue trim band, the crystal rock it floats on
    const P = this.platforms[0];
    R.box(P.x1, 0, 0, P.x2, 12, 170, C.marble, C.marbleTop);
    R.box(P.x1 + 8, 12, 4, P.x2 - 8, 24, 164, C.trim);
    R.rock(0, 22, 85, 232, 84, 200, 10, C.crystal, 8);
    for (const x of [-200, 200]) R.prism(x, -26, 0, 150, 9, 6, C.marble, C.marbleTop);                   // two little marble posts at the back
    const T = this.platforms[3];
    R.box(T.x1, T.y, 0, T.x2, T.y + 8, 70, C.marble, C.marbleTop); R.rock(0, T.y + 7, 35, 46, 32, 40, 6, C.crystal, 12);
  }

  /** The twinkling stars, redrawn every few frames. */
  drawStars() {
    if (this.t % 4) return;
    const g = this.starG; g.clear();
    for (const s of this.stars) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(this.t * 0.02 + s.ph));
      g.fillStyle(0xffffff, a); g.fillRect(s.x, s.y, s.s, s.s);
      if (s.s > 1 && a > 0.8) { g.fillStyle(0xf8e8ff, a * 0.6); g.fillRect(s.x - 2, s.y, 6, 1); g.fillRect(s.x + 0.5, s.y - 2, 1, 6); }
    }
  }

  /** This frame's fountain water: sheets pouring off the tiers, arcs of droplets from the spout, sparkles drifting up. */
  fountainFaces(dyn) {
    const t = this.t, z = FOUNT.z;
    for (const [r, y1, y2] of [[110, FOUNT.bowl + 4, FOUNT.mid], [220, FOUNT.mid + 4, FOUNT.low]]) {            // sheets of water off the rims
      for (let i = 0; i < 8; i++) {
        const a1 = (i + 0.5) / 8 * Math.PI * 2, a2 = (i + 1.5) / 8 * Math.PI * 2;
        const p1 = [Math.cos(a1) * r, Math.sin(a1) * r], p2 = [Math.cos(a2) * r, Math.sin(a2) * r];
        if (p1[1] + p2[1] > 0) continue;                                                      // (only the front half shows)
        dyn.push({ p: [[p1[0], y1, z + p1[1]], [p2[0], y1, z + p2[1]], [p2[0] * 1.06, y2, z + p2[1] * 1.06], [p1[0] * 1.06, y2, z + p1[1] * 1.06]], n: null, c: C.water, a: 0.55, bias: -8 });
        const u = ((t * 0.02 + i * 0.37) % 1), fy = y1 + (y2 - y1) * u;
        dyn.push({ p: [[p1[0] * 0.7 + p2[0] * 0.3, fy, z + p1[1] - 2], [p1[0] * 0.5 + p2[0] * 0.5, fy, z + p1[1] - 2], [p1[0] * 0.5 + p2[0] * 0.5, fy + 26, z + p1[1] - 2], [p1[0] * 0.7 + p2[0] * 0.3, fy + 26, z + p1[1] - 2]], n: null, c: C.foam, a: 0.7, bias: -9 });
      }
    }
    for (let j = 0; j < 8; j++) {                                                                // the arcs of droplets
      const a = j / 8 * Math.PI * 2 + 0.2;
      for (let m = 0; m < 6; m++) {
        const u = (t * 0.008 + m / 6) % 1, x = Math.cos(a) * 205 * u, zz = z + Math.sin(a) * 205 * u;
        const y = FOUNT.spout + (FOUNT.mid - FOUNT.spout) * u - 150 * Math.sin(Math.PI * u), d = 4;
        dyn.push({ p: [[x - d, y, zz], [x, y - d, zz], [x + d, y, zz], [x, y + d, zz]], n: null, c: m % 2 ? 0xd8f4ff : 0xffffff, a: 0.9, bias: -10 });
      }
    }
    dyn.push(...blobFaces(0, FOUNT.spout + 8 - 4 * Math.sin(t * 0.15), z, 18, 26 + 4 * Math.sin(t * 0.15), 18, [0xc8f0ff, 0x9ad8ff, 0xffffff], 2, null, 0.35));
    for (let i = 0; i < 18; i++) {                                                               // sparkles drifting up
      const u = (t * 0.003 + i / 18) % 1, x = Math.sin(i * 2.3) * 600 + Math.sin(t * 0.01 + i) * 30, y = 300 - u * 700, zz = 300 + (i % 5) * 140, d = 3 + (i % 3) * 2;
      dyn.push({ p: [[x - d, y, zz], [x, y - d * 2, zz], [x + d, y, zz], [x, y + d * 2, zz]], n: null, c: [0xfff0a0, 0xffb8f0, 0xb8f0ff][i % 3], a: Math.sin(u * Math.PI), bias: -20 });
    }
  }

  /** Moves the side platforms (carrying whoever stands on them), runs DREAM GEYSER, draws the frame. */
  step(match) {
    this.t++;
    for (const L of this.lifts) {
      const ny = Math.round(L.y0 + Math.sin(this.t * Math.PI * 2 / LIFT.period + L.ph) * LIFT.amp), dy = ny - L.p.y;
      if (dy) { L.p.y = ny; for (const f of match.fighters) if (f.grounded && f.platform === L.p) f.y += dy; }
    }
    const out = this.cycle.run(match, []);
    if (!this.hazardsOn) this.geyser = null;
    this.drawStars();
    const dyn = [];
    this.fountainFaces(dyn);
    for (const L of this.lifts) {                                                                // the moving platforms: marble slabs on little crystals
      const p = L.p, cx = (p.x1 + p.x2) / 2;
      dyn.push(...boxFaces(p.x1, p.y, 0, p.x2, p.y + 8, 70, C.marble, C.marbleTop), ...boxFaces(p.x1 + 6, p.y + 8, 3, p.x2 - 6, p.y + 13, 66, C.trim));
      dyn.push(...rockFaces(cx, p.y + 12, 35, 44, 30, 46, 6, C.crystal, p.x1 < 0 ? 3 : 4));
    }
    const G = this.geyser;
    if (G) {
      if (G.t < GEYSER.warn) {                                                                   // bubbling: a glowing ring of bubbles on the floor
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + this.t * 0.1, r = 14 + 4 * Math.sin(this.t * 0.3 + i); dyn.push(...blobFaces(G.x + Math.cos(a) * r, -3 - Math.abs(Math.sin(this.t * 0.25 + i)) * 6, 20 + Math.sin(a) * r * 0.6, 4, 4, 4, [0xc8f0ff, 0xffffff], i, null, 0)); }
      } else {                                                                                   // the column: stacked faceted water, swelling then dying down
        const k = Math.min(1, (G.t - GEYSER.warn) / 6) * Math.min(1, (GEYSER.warn + GEYSER.burst - G.t) / 14), h = GEYSER.height * k;
        for (let s2 = 0; s2 < 5; s2++) { const y1 = -h * (s2 + 1) / 5, y2 = -h * s2 / 5, w = GEYSER.half * (1.1 - s2 * 0.08) * (1 + 0.1 * Math.sin(this.t * 0.5 + s2)); dyn.push(...prismFaces(G.x, y1, y2, 25, w, 6, s2 % 2 ? C.water : 0x9ad8ff, 0xe8f8ff)); }
        dyn.push(...blobFaces(G.x, -h, 25, GEYSER.half * 1.3, 14, GEYSER.half, [0xffffff, 0xd8f4ff], 7, null, 0.4));
      }
    }
    this.R.render(dyn);
    return out;
  }
  /** A geyser coming: picks a spot on the stage floor. */
  start_geyser(match, h) { h.x = Math.round(-190 + Math.random() * 380); h.title = 'DREAM GEYSER!'; this.count++; this.geyser = h; }
  /** The geyser: bubbles (sparkly warning), then bursts up, launching anyone standing over it. */
  step_geyser(match, h, out) {
    if (h.t === GEYSER.warn) { sfx('geyser', 0.7, 1.1); match.shake(3, 8); }
    else if (h.t < GEYSER.warn && h.t % 18 === 0) sfx('item', 0.25, 1.6);
    if (h.t >= GEYSER.warn && h.t < GEYSER.warn + GEYSER.burst - 8) out.push({ x1: h.x - GEYSER.half, x2: h.x + GEYSER.half, y1: -GEYSER.height, y2: 0, ...GEYSER.hit, id: 'geyser' + this.count, hazard: true });
    if (h.t >= GEYSER.warn + GEYSER.burst) { this.geyser = null; return true; }
    return false;
  }
}

/** The stage select miniature: twilight sky with stars, the fountain, the marble stage and its platforms. */
export function drawStarlightFountainPreview(g, x, y, w, h) {
  C.sky.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(x, y + i * h / 8, w, h / 8 + 1); });
  g.fillStyle(0xffffff, 0.9); for (let i = 0; i < 14; i++) g.fillRect(x + (i * 37 % 100) / 100 * w, y + (i * 23 % 40) / 100 * h, 1, 1);
  g.fillStyle(C.marble, 1); g.fillRect(x + w * 0.3, y + h * 0.5, w * 0.4, h * 0.06); g.fillRect(x + w * 0.47, y + h * 0.28, w * 0.06, h * 0.24); g.fillRect(x + w * 0.41, y + h * 0.26, w * 0.18, h * 0.04);
  g.fillStyle(C.water, 0.8); g.fillRect(x + w * 0.42, y + h * 0.3, w * 0.16, h * 0.2);
  g.fillStyle(C.marbleTop, 1); g.fillRect(x + w * 0.12, y + h * 0.7, w * 0.76, h * 0.06);
  g.fillStyle(C.crystal[1], 1); g.fillTriangle(x + w * 0.14, y + h * 0.76, x + w * 0.86, y + h * 0.76, x + w * 0.5, y + h);
  g.fillStyle(C.marbleTop, 1); g.fillRect(x + w * 0.16, y + h * 0.52, w * 0.18, h * 0.04); g.fillRect(x + w * 0.66, y + h * 0.58, w * 0.18, h * 0.04); g.fillRect(x + w * 0.42, y + h * 0.4, w * 0.16, h * 0.04);
}

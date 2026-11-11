// BREEZE HILL: an original homage to the dreamy grass-hill stages of the late-90s 64-bit era, in low-poly 3D
// (poly3d.js): a grassy plateau with three floating platforms, pastel hills and checkered fields rolling away, and
// behind the stage a giant mossy stone head. Now and then the head's cheeks puff up (CAUTION) and it blows: a GUST
// pushes everyone across the stage toward one side for a few seconds, leaves streaming past.
import { Poly3D, boxFaces } from './poly3d.js';
import { HazardCycle } from './hazardCycle.js';
import { sfx } from '../audio/sfx.js';

const C = { grass: 0x6ad85a, grassTop: 0x9ae86a, dirt: 0xb07a4a, dirtDark: 0x8a5a34, hillA: 0x8ad87a, hillB: 0x6ac8a0, field: 0xe8d070,
  stone: 0x9a9488, stoneDark: 0x6a665c, moss: 0x5aa84a, sky: [0x7a9ae8, 0x9ab0ee, 0xb8c4f2, 0xd4d4f4, 0xf0dcec], fog: 0xe4dcf0 };
// THE GUST: how long the head puffs up first (frames), how long it blows, and how hard (px per frame on the ground / in the air)
const GUST = { puff: 90, blow: 240, ground: 1.1, air: 1.7 };

/** BREEZE HILL: the plateau, its three platforms, the stone head and its GUST (see the top of the file). */
export class BreezeHillStage {
  constructor(scene) {
    this.scene = scene; this.t = 0; this.hazardsOn = true; this.music = 'bgm_aero';
    this.platforms = [
      { x1: -240, x2: 240, y: 0, solid: true, bottom: 70 },
      { x1: -190, x2: -90, y: -88, solid: false },
      { x1: 90, x2: 190, y: -88, solid: false },
      { x1: -50, x2: 50, y: -168, solid: false },
    ];
    this.spawns = [{ x: -150, y: 0 }, { x: 150, y: 0 }, { x: -50, y: 0 }, { x: 50, y: 0 }];
    this.puffK = 0; this.blowDir = 0; this.leaves = [];
    this.cycle = new HazardCycle(this, ['gust'], { gap: 840, jitter: 360, first: 600, color: '#9ae86a', stroke: '#1a3a14' });
  }

  /** Builds the pastel sky and the 3D hills: the plateau, the floating platforms, the stone head, fields and hills. */
  draw(world, bg) {
    const s = this.scene, sky = s.add.graphics().setScrollFactor(0);
    C.sky.forEach((c, i) => { sky.fillStyle(c, 1); sky.fillRect(-400, -60 + i * 90, 1440, 91); });
    bg.push(sky);
    this.cycle.makeBanner(s);
    const R = this.R = new Poly3D(s, world, { fog: C.fog, zFar: 3000 });
    // rolling hills and checkered fields
    for (let i = 0; i < 10; i++) for (let j = 0; j < 4; j++) {
      const x = -2500 + i * 500, z = 900 + j * 500;
      R.quad([[x, 380, z], [x + 500, 380, z], [x + 500, 380, z + 500], [x, 380, z + 500]], (i + j) % 2 ? C.field : C.hillB);
    }
    for (const [x, z, w, h, c] of [[-1600, 2400, 1100, 420, C.hillA], [1500, 2600, 1300, 480, C.hillB], [-200, 3000, 1500, 380, C.hillA], [2300, 1800, 800, 300, C.hillA], [-2400, 1600, 800, 340, C.hillB]]) R.pyramid(x, 380, z, w, 600, h, c);
    // the plateau: grass top, a band of dirt, and a dirt underside stepping in toward its foot
    const P = this.platforms[0];
    R.box(P.x1, 0, 0, P.x2, 12, 170, C.grass, C.grassTop);
    for (let k = 0; k < 4; k++) R.box(P.x1 + 14 + k * 26, 12 + k * 16, 6 + k * 8, P.x2 - 14 - k * 26, 28 + k * 16, 160 - k * 10, k % 2 ? C.dirtDark : C.dirt);
    for (const p of this.platforms.slice(1)) { R.box(p.x1, p.y, 0, p.x2, p.y + 8, 70, C.grass, C.grassTop); R.box(p.x1 + 8, p.y + 8, 6, p.x2 - 8, p.y + 18, 64, C.dirt); }
  }

  /** The stone head behind the stage this frame: its face, its cheeks (puffed up before a gust), its mouth. */
  headFaces() {
    const out = [], hx = 0, hy = -40, hz = 520, k = this.puffK;
    out.push(...boxFaces(hx - 150, hy - 220, hz, hx + 150, hy + 200, hz + 220, C.stone, C.moss));
    out.push(...boxFaces(hx - 160, hy - 240, hz + 10, hx + 160, hy - 200, hz + 200, C.moss, 0x7ac86a));                  // moss on its brow
    out.push(...boxFaces(hx - 120, hy - 120, hz - 14, hx - 50, hy - 90, hz, C.stoneDark), ...boxFaces(hx + 50, hy - 120, hz - 14, hx + 120, hy - 90, hz, C.stoneDark));   // brows
    out.push(...boxFaces(hx - 100, hy - 84, hz - 6, hx - 70, hy - 50, hz, 0x2a2a3a), ...boxFaces(hx + 70, hy - 84, hz - 6, hx + 100, hy - 50, hz, 0x2a2a3a));            // eyes
    out.push(...boxFaces(hx - 18, hy - 60, hz - 30, hx + 18, hy + 10, hz, C.stone));                                                                                     // nose
    for (const s of [-1, 1]) out.push(...boxFaces(hx + s * 110 - 30 - k * 14, hy + 10 - k * 10, hz - 10 - k * 34, hx + s * 110 + 30 + k * 14, hy + 70 + k * 10, hz, C.stone));   // cheeks (puffing)
    const mo = this.blowDir ? 26 : 8 - k * 6;
    out.push(...boxFaces(hx - 40, hy + 80, hz - 4, hx + 40, hy + 80 + mo, hz, 0x1a1a24));                                                                                // the mouth
    return out;
  }

  /** Blows the gust (if one's on), animates the head and leaves, draws the frame. */
  step(match) {
    this.t++;
    const out = this.cycle.run(match, []);
    if (this.blowDir) for (const f of match.fighters) {
      if (!f.alive || ['seized', 'grabbed', 'respawn', 'ledge'].includes(f.state)) continue;
      f.x += this.blowDir * (f.grounded ? GUST.ground : GUST.air);
    }
    const dyn = this.headFaces();
    if (this.blowDir && this.t % 2 === 0) this.leaves.push({ x: -this.blowDir * 380, y: -200 + Math.random() * 230, z: Math.random() * 120 - 30, s: 3 + Math.random() * 4 });
    for (const l of this.leaves) { l.x += this.blowDir * 9 || 6; l.y += Math.sin(this.t * 0.2 + l.s) * 1.5; }
    this.leaves = this.leaves.filter((l) => Math.abs(l.x) < 420);
    for (const l of this.leaves) dyn.push({ p: [[l.x, l.y, l.z], [l.x + l.s, l.y - l.s / 2, l.z], [l.x + l.s * 1.6, l.y + l.s / 3, l.z], [l.x + l.s / 2, l.y + l.s / 2, l.z]], n: null, c: l.s > 5 ? 0x5ab84a : 0x8ad85a, bias: -2000 });
    this.R.render(dyn);
    return out;
  }
  /** A gust coming: the head starts to puff its cheeks. */
  start_gust(match, h) { h.dir = Math.random() < 0.5 ? -1 : 1; h.title = h.dir < 0 ? 'GUST! <<< BLOWING LEFT' : 'GUST! BLOWING RIGHT >>>'; }
  /** The gust: the head puffs up, then blows everyone sideways for a while, then breathes in again. */
  step_gust(match, h) {
    if (h.t < GUST.puff) { this.puffK = h.t / GUST.puff; return false; }
    if (h.t === GUST.puff) { this.blowDir = h.dir; sfx('whoosh', 0.8, 0.5); }
    if (h.t % 40 === 0) sfx('whoosh', 0.4, 0.6);
    this.puffK = Math.max(0, this.puffK - 0.05);
    if (h.t >= GUST.puff + GUST.blow) { this.blowDir = 0; return true; }
    return false;
  }
}

/** The stage select miniature: pastel sky, the stone head, the plateau and its three platforms. */
export function drawBreezeHillPreview(g, x, y, w, h) {
  C.sky.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(x, y + i * h / 5, w, h / 5 + 1); });
  g.fillStyle(C.hillA, 1); g.fillTriangle(x, y + h * 0.75, x + w * 0.4, y + h * 0.75, x + w * 0.2, y + h * 0.45);
  g.fillStyle(C.stone, 1); g.fillRect(x + w * 0.38, y + h * 0.14, w * 0.24, h * 0.42);
  g.fillStyle(C.moss, 1); g.fillRect(x + w * 0.36, y + h * 0.12, w * 0.28, h * 0.06);
  g.fillStyle(0x2a2a3a, 1); g.fillRect(x + w * 0.42, y + h * 0.26, w * 0.04, h * 0.05); g.fillRect(x + w * 0.54, y + h * 0.26, w * 0.04, h * 0.05);
  g.fillStyle(C.grass, 1); g.fillRect(x + w * 0.12, y + h * 0.7, w * 0.76, h * 0.07);
  g.fillStyle(C.dirt, 1); g.fillRect(x + w * 0.16, y + h * 0.77, w * 0.68, h * 0.1);
  g.fillStyle(C.grass, 1); g.fillRect(x + w * 0.16, y + h * 0.54, w * 0.18, h * 0.04); g.fillRect(x + w * 0.66, y + h * 0.54, w * 0.18, h * 0.04); g.fillRect(x + w * 0.42, y + h * 0.4, w * 0.16, h * 0.04);
}

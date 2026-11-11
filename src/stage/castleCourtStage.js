// CASTLE COURT: an original homage to the floating castle-roof stages of the late-90s 64-bit era - drawn in real
// low-poly 3D (poly3d.js): a stone court floating high over a moat and green grounds, a white castle with red
// cone-roofed towers behind, two side ledges and a high central slab where a red BUMPER slides back and forth and
// knocks away whoever touches it. No hazard cycle: the bumper is always there (off with hazards off).
import { Poly3D, prismFaces } from './poly3d.js';
import { sfx } from '../audio/sfx.js';

const C = { stone: 0xb8b0a0, stoneDark: 0x8a8274, trim: 0xc83a32, roof: 0xd8463a, wall: 0xf0ece0, window: 0x3a4a8a,
  grass: 0x58b84a, grassDark: 0x3a8a34, water: 0x4a8ad8, hill: 0x6ac85a, sky: [0x3a78d8, 0x5a92e2, 0x7aaeea, 0x9cc8f0, 0xbcdcf6], fog: 0xb4d4f2 };
// the BUMPER: how far it slides from the middle (px), how long one trip takes (frames), its size, and how it hits
const BUMPER = { swing: 50, period: 300, r: 13, hit: { dmg: 4, angle: 50, base: 6.5, growth: 0.4 } };

/** CASTLE COURT: the floating court, its ledges and the sliding BUMPER (see the top of the file). */
export class CastleCourtStage {
  constructor(scene) {
    this.scene = scene; this.t = 0; this.hazardsOn = true; this.music = 'bgm_sky';
    this.platforms = [
      { x1: -250, x2: 250, y: 0, solid: true, bottom: 46 },
      { x1: -210, x2: -110, y: -86, solid: false },
      { x1: 110, x2: 210, y: -86, solid: false },
      { x1: -80, x2: 80, y: -160, solid: false },
    ];
    this.spawns = [{ x: -150, y: 0 }, { x: 150, y: 0 }, { x: -50, y: 0 }, { x: 50, y: 0 }];
  }

  /** Builds the sky (flat bands) and the 3D world: the court, its ledges, the castle and its grounds far below. */
  draw(world, bg) {
    const s = this.scene, sky = s.add.graphics().setScrollFactor(0);
    C.sky.forEach((c, i) => { sky.fillStyle(c, 1); sky.fillRect(-400, -60 + i * 90, 1440, 91); });
    bg.push(sky);
    const R = this.R = new Poly3D(s, world, { fog: C.fog, zFar: 3200 });
    // the grounds far below: grass, the moat ring, hills
    R.quad([[-2600, 520, 300], [2600, 520, 300], [2600, 520, 3400], [-2600, 520, 3400]], C.grass);
    R.quad([[-900, 518, 900], [900, 518, 900], [900, 518, 1150], [-900, 518, 1150]], C.water);
    for (const [x, z, w, h] of [[-1500, 2600, 900, 260], [1300, 2800, 1100, 320], [-400, 3100, 1200, 220], [2100, 2200, 700, 200], [-2300, 1900, 700, 240]]) R.pyramid(x, 520, z, w, 500, h, C.hill);
    for (let i = 0; i < 9; i++) { const x = -1800 + i * 450, z = 700 + (i % 3) * 300; R.prism(x, 470, 520, z, 14, 5, 0x6a4a2a); R.pyramid(x, 480, z, 70, 70, 110, C.grassDark); }   // trees
    // the castle: a keep, walls, towers with red cone roofs, a bridge over the moat
    const cz = 1300, cy = 520;
    R.box(-260, cy - 260, cz, 260, cy, cz + 260, C.wall, 0xd8d4c8);
    R.box(-140, cy - 420, cz + 60, 140, cy - 260, cz + 200, C.wall, 0xd8d4c8);
    R.pyramid(0, cy - 420, cz + 130, 300, 160, 140, C.roof);
    for (const [x, z, h] of [[-260, cz, 340], [260, cz, 340], [-260, cz + 260, 300], [260, cz + 260, 300], [0, cz + 60, 520]]) { R.prism(x, cy - h, cy, z, 46, 8, C.wall, 0xd8d4c8); R.pyramid(x, cy - h, z, 120, 120, 150, C.roof); }
    for (let i = 0; i < 5; i++) R.box(-200 + i * 90, cy - 200, cz - 2, -170 + i * 90, cy - 150, cz, C.window);
    R.box(-60, cy - 110, cz - 2, 60, cy, cz, 0x5a3a1a);                                                    // the door
    R.box(-60, cy - 12, cz - 260, 60, cy, cz, 0xa88a5a);                                                   // the bridge
    // the court itself (front faces on the play plane), with a red trim band and stone pillars under it
    const P = this.platforms;
    R.box(P[0].x1, 0, 0, P[0].x2, 18, 160, C.stone, 0xd0c8b8);
    R.box(P[0].x1 + 10, 18, 0, P[0].x2 - 10, 30, 150, C.trim);
    R.box(P[0].x1 + 30, 30, 10, P[0].x2 - 30, 46, 140, C.stoneDark);
    for (const x of [-180, -60, 60, 180]) R.prism(x, 46, 260, 70, 16, 6, C.stoneDark);                   // pillars down toward the grounds
    for (const p of P.slice(1)) { R.box(p.x1, p.y, 0, p.x2, p.y + 10, 80, C.stone, 0xd0c8b8); R.box(p.x1 + 6, p.y + 10, 0, p.x2 - 6, p.y + 14, 70, C.trim); }
  }

  /** Slides the bumper, draws the frame, and hands back the bumper's hitbox while hazards are on. */
  step(match) {
    this.t++;
    const top = this.platforms[3], bx = Math.round(Math.sin(this.t * Math.PI * 2 / BUMPER.period) * BUMPER.swing), by = top.y - BUMPER.r - 2;
    const dyn = [];
    if (this.hazardsOn) {
      const pulse = this.bumpT > 0 ? 1.15 : 1; if (this.bumpT > 0) this.bumpT--;
      dyn.push(...prismFaces(bx, by - BUMPER.r * pulse, by + BUMPER.r * pulse, 40, BUMPER.r * 1.6 * pulse, 10, 0xe83a3a, 0xff8a7a));
      dyn.push(...prismFaces(bx, by - BUMPER.r * 0.4, by + BUMPER.r * 0.4, 38, BUMPER.r * 1.9 * pulse, 10, 0xf0d040, 0xf8e070));
    }
    this.R.render(dyn);
    if (!this.hazardsOn) return [];
    for (const f of match.fighters) {                    // (a hit sound and a pulse when someone bounces off)
      if (f.alive && Math.abs(f.x - bx) < BUMPER.r * 1.8 && f.y > by - BUMPER.r - 20 && f.y - (f.body?.h || 50) < by + BUMPER.r && this.bumpT <= 0) { this.bumpT = 8; sfx('clang', 0.4, 1.6); }
    }
    return [{ x1: bx - BUMPER.r * 1.7, x2: bx + BUMPER.r * 1.7, y1: by - BUMPER.r, y2: by + BUMPER.r, ...BUMPER.hit, radial: true, cx: bx, cy: by, id: 'bumper' + Math.floor(this.t / 40), hazard: true }];
  }
}

/** The stage select miniature: sky, the castle, the court and its three ledges. */
export function drawCastleCourtPreview(g, x, y, w, h) {
  C.sky.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(x, y + i * h / 5, w, h / 5 + 1); });
  g.fillStyle(C.wall, 1); g.fillRect(x + w * 0.38, y + h * 0.25, w * 0.24, h * 0.3);
  g.fillStyle(C.roof, 1); for (const k of [0.36, 0.5, 0.64]) g.fillTriangle(x + w * (k - 0.05), y + h * 0.3, x + w * (k + 0.05), y + h * 0.3, x + w * k, y + h * 0.12);
  g.fillStyle(C.stone, 1); g.fillRect(x + w * 0.12, y + h * 0.72, w * 0.76, h * 0.08);
  g.fillStyle(C.trim, 1); g.fillRect(x + w * 0.14, y + h * 0.8, w * 0.72, h * 0.04);
  g.fillStyle(C.stone, 1); g.fillRect(x + w * 0.16, y + h * 0.56, w * 0.18, h * 0.04); g.fillRect(x + w * 0.66, y + h * 0.56, w * 0.18, h * 0.04); g.fillRect(x + w * 0.38, y + h * 0.42, w * 0.24, h * 0.04);
  g.fillStyle(0xe83a3a, 1); g.fillCircle(x + w * 0.5, y + h * 0.38, h * 0.04);
}

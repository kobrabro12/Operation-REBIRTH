// JUNGLE FALLS: an original homage to the jungle-treehouse stages of the late-90s 64-bit era, in low-poly 3D
// (poly3d.js): a plank deck on stilts over a roaring waterfall, two log rafts circling slowly at its sides (they
// carry you), a hut roof up top, palms and cliffs behind. Below the deck a BARREL drifts back and forth - fall into
// it and it holds you for a moment, then fires you straight back up (a second chance, or a trap if you were
// recovering anyway).
import { Poly3D, boxFaces, prismFaces } from './poly3d.js';
import { sfx } from '../audio/sfx.js';

const C = { plank: 0xa8743a, plankDark: 0x7a4e24, log: 0x8a5a2a, leaf: 0x3a9a3a, leafDark: 0x2a7030, trunk: 0x6a4a2a,
  rock: 0x8a7a6a, water: 0x5ab0e8, foam: 0xe8f4ff, roof: 0x9a6a2a, sky: [0x5aa0d8, 0x7ab4e0, 0x9ac8e8, 0xb8dcee, 0xd0e8f2], fog: 0xbcd8e4 };
// the log rafts: how far they circle (px) and how long a lap takes (frames)
const RAFT = { r: 26, period: 360 };
// THE BARREL: where it drifts (its y, and how far to each side), how long it holds you, how hard it fires you up
const BARREL = { y: 220, swing: 150, period: 420, hold: 40, launch: -14.5, r: 22 };

/** JUNGLE FALLS: the deck, the circling log rafts and THE BARREL (see the top of the file). */
export class JungleFallsStage {
  constructor(scene) {
    this.scene = scene; this.t = 0; this.hazardsOn = true; this.music = 'bgm_spires';
    this.platforms = [
      { x1: -230, x2: 230, y: 0, solid: true, bottom: 30 },
      { x1: -230, x2: -140, y: -90, solid: false },          // the log rafts (they move: step)
      { x1: 140, x2: 230, y: -90, solid: false },
      { x1: -70, x2: 70, y: -170, solid: false },            // the hut roof
    ];
    this.rafts = [{ p: this.platforms[1], cx: -185, cy: -90, ph: 0 }, { p: this.platforms[2], cx: 185, cy: -90, ph: Math.PI }];
    this.spawns = [{ x: -150, y: 0 }, { x: 150, y: 0 }, { x: -50, y: 0 }, { x: 50, y: 0 }];
    this.held = null;
  }

  /** Builds the sky and the 3D jungle: the deck and its stilts, the hut, the waterfall, cliffs, palms. */
  draw(world, bg) {
    const s = this.scene, sky = s.add.graphics().setScrollFactor(0);
    C.sky.forEach((c, i) => { sky.fillStyle(c, 1); sky.fillRect(-400, -60 + i * 90, 1440, 91); });
    bg.push(sky);
    const R = this.R = new Poly3D(s, world, { fog: C.fog, zFar: 2600 });
    // cliffs behind, the river below
    R.box(-2400, -300, 1500, -500, 700, 1900, C.rock, 0x6a9a4a); R.box(500, -200, 1400, 2400, 700, 1800, C.rock, 0x6a9a4a);
    R.box(-500, 100, 1700, 500, 700, 1900, C.rock, 0x6a9a4a);
    R.quad([[-2400, 600, 200], [2400, 600, 200], [2400, 600, 1700], [-2400, 600, 1700]], 0x3a7ab8);
    for (let i = 0; i < 12; i++) {                               // palms: a trunk and a crown of leaf pyramids
      const x = -1500 + i * 280 + (i % 3) * 40, z = 500 + (i % 4) * 260, base = 600, h = 260 + (i % 3) * 60;
      R.prism(x, base - h, base, z, 12, 5, C.trunk);
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + i; R.pyramid(x + Math.cos(a) * 50, base - h + 10, z + Math.sin(a) * 50, 110, 50, -30, k % 2 ? C.leaf : C.leafDark); }
    }
    // the deck: planks (a row of boxes), a rail of posts, stilts down into the water, the hut
    const P = this.platforms[0];
    for (let x = P.x1, i = 0; x < P.x2; x += 46, i++) R.box(x, 0, 0, Math.min(P.x2, x + 44), 14, 120, i % 2 ? C.plank : C.plankDark, i % 2 ? 0xc08a4a : 0x9a6a34);
    R.box(P.x1, 14, 10, P.x2, 30, 110, C.plankDark);
    for (const x of [-200, -100, 0, 100, 200]) R.prism(x, 30, 600, 60, 9, 6, C.log);
    const T = this.platforms[3];
    R.box(T.x1 + 20, T.y + 6, 50, T.x2 - 20, 0, 110, C.plankDark);                                  // the hut walls
    R.box(T.x1, T.y, 30, T.x2, T.y + 8, 130, C.roof, 0xb8843a);                                     // its roof (the top platform)
    R.box(-14, -60, 48, 14, 0, 50, 0x2a1a0a);                                                       // its doorway
  }

  /** Moves the rafts (carrying whoever stands on them) and the barrel, runs the barrel, draws the frame. */
  step(match) {
    this.t++;
    for (const r of this.rafts) {                              // the log rafts circle slowly
      const a = this.t * Math.PI * 2 / RAFT.period + r.ph, nx = r.cx + Math.cos(a) * RAFT.r, ny = r.cy + Math.sin(a) * RAFT.r * 0.5;
      const dx = Math.round(nx - (r.p.x1 + r.p.x2) / 2), dy = Math.round(ny - r.p.y);
      if (dx || dy) { r.p.x1 += dx; r.p.x2 += dx; r.p.y += dy; for (const f of match.fighters) if (f.grounded && f.platform === r.p) { f.x += dx; f.y += dy; } }
    }
    const bx = Math.sin(this.t * Math.PI * 2 / BARREL.period) * BARREL.swing, by = BARREL.y;
    if (this.hazardsOn) this.stepBarrel(match, bx, by);
    // this frame's moving faces: the rafts, the waterfall's foam and the barrel
    const dyn = [];
    for (const r of this.rafts) for (let k = 0; k < 3; k++) dyn.push(...prismFaces(r.p.x1 + 15 + k * 30, r.p.y, r.p.y + 12, 40, 7, 6, C.log, 0xa87a3a).map((f) => f));
    for (const r of this.rafts) dyn.push(...boxFaces(r.p.x1, r.p.y, 0, r.p.x2, r.p.y + 6, 80, C.plank, 0xc08a4a));
    for (let i = 0; i < 8; i++) {                              // the waterfall: a sheet of water behind the deck with foam streaks running down
      const x = -360 + i * 90, wy = ((this.t * 6 + i * 70) % 800) - 300;
      dyn.push({ p: [[x, -400, 900], [x + 90, -400, 900], [x + 90, 700, 900], [x, 700, 900]], n: null, c: i % 2 ? C.water : 0x6ac0f0 });
      dyn.push({ p: [[x + 30, wy, 898], [x + 44, wy, 898], [x + 44, wy + 60, 898], [x + 30, wy + 60, 898]], n: null, c: C.foam, bias: -1 });
    }
    if (this.hazardsOn) {
      const spin = this.held ? 0.4 : 0;
      dyn.push(...prismFaces(bx, by - BARREL.r - spin * 4, by + BARREL.r, 40, BARREL.r, 8, C.log, 0x6a3a1a));
      dyn.push(...prismFaces(bx, by - 6, by + 6, 39, BARREL.r + 2, 8, 0x2a2a2a));
    }
    this.R.render(dyn);
    return [];
  }

  /**
   * THE BARREL: anyone falling into it is held (state `seized` - this stage answers holdsSeized), hidden inside, then
   * fired straight up with their jumps given back.
   */
  stepBarrel(match, bx, by) {
    const H = this.held;
    if (H) {
      const f = H.f;
      if (!f.alive) { this.held = null; return; }
      f.x = bx; f.y = by + 10; f.vx = f.vy = 0;
      if (++H.t >= BARREL.hold) {
        this.held = null; f.seizedBy = null; f.sprite.setVisible(true); f.setState('air');
        f.vy = BARREL.launch; f.y = by - BARREL.r - 4; f.usedUpB = false; f.jumpsLeft = Math.max(f.jumpsLeft || 0, 1);
        sfx('bighit', 0.6, 1.1); match.shake(4, 6);
      }
      return;
    }
    for (const f of match.fighters) {
      if (!f.alive || f.state === 'seized' || f.state === 'respawn' || f.vy < 0 || f.grounded) continue;
      if (Math.abs(f.x - bx) < BARREL.r && Math.abs(f.y - by) < BARREL.r) {
        this.held = { f, t: 0 }; f.setState('seized'); f.seizedBy = this; f.vx = f.vy = f.lx = f.ly = 0; f.sprite.setVisible(false);
        if (f.stopChargeSound) f.stopChargeSound();
        sfx('land', 0.6, 0.8); break;
      }
    }
  }
  /** Whether the barrel is still holding this fighter (their st_seized asks). */
  holdsSeized(f) { return !!(this.held && this.held.f === f); }
}

/** The stage select miniature: the waterfall, the deck, the rafts, the hut and the barrel. */
export function drawJungleFallsPreview(g, x, y, w, h) {
  C.sky.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(x, y + i * h / 5, w, h / 5 + 1); });
  g.fillStyle(C.water, 1); g.fillRect(x + w * 0.2, y + h * 0.1, w * 0.6, h * 0.9);
  g.fillStyle(C.foam, 1); for (let i = 0; i < 6; i++) g.fillRect(x + w * (0.25 + i * 0.1), y + h * (0.2 + (i % 3) * 0.2), 2, h * 0.1);
  g.fillStyle(C.plank, 1); g.fillRect(x + w * 0.14, y + h * 0.66, w * 0.72, h * 0.07);
  g.fillStyle(C.log, 1); g.fillRect(x + w * 0.14, y + h * 0.48, w * 0.16, h * 0.05); g.fillRect(x + w * 0.7, y + h * 0.48, w * 0.16, h * 0.05);
  g.fillStyle(C.roof, 1); g.fillRect(x + w * 0.4, y + h * 0.32, w * 0.2, h * 0.05);
  g.fillStyle(C.log, 1); g.fillCircle(x + w * 0.4, y + h * 0.9, h * 0.06);
}

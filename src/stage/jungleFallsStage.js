// JUNGLE FALLS: an original homage to the jungle-treehouse stages of the late-90s 64-bit era, in low-poly 3D
// (poly3d.js): a plank deck on stilts over a roaring waterfall, two log rafts circling slowly at its sides (they
// carry you), a hut roof up top, palms and cliffs behind. Below the deck a BARREL drifts back and forth - fall into
// it and it holds you for a moment, then fires you straight back up (a second chance, or a trap if you were
// recovering anyway).
import { Poly3D, boxFaces, prismFaces, blobFaces } from './poly3d.js';
import { sfx } from '../audio/sfx.js';

const C = { plank: 0xa8743a, plankDark: 0x7a4e24, log: 0x8a5a2a, leaf: 0x3a9a3a, leafDark: 0x2a7030, trunk: 0x6a4a2a,
  rock: 0x8a7a6a, water: 0x5ab0e8, foam: 0xe8f4ff, roof: 0x9a6a2a, sky: [0x5aa0d8, 0x7ab4e0, 0x9ac8e8, 0xb8dcee, 0xd0e8f2], fog: 0xbcd8e4 };
// the birds that fly across the back: how many, how fast (px per frame)
const BIRDS = { n: 4, speed: 2.2 };
// the fish that leap out of the river now and then: frames between leaps, how long a leap lasts
const FISH = { gap: 150, time: 70 };
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
    // cliffs behind (huge faceted crags with jungle on top), the river below, boulders
    R.blob(-1500, 250, 1700, 1100, 700, 380, [C.rock, 0x7a6a5a, 0x9a8a78], 2, 0x5a9a3a); R.blob(1500, 300, 1600, 1100, 650, 380, [C.rock, 0x7a6a5a, 0x9a8a78], 3, 0x5a9a3a);
    R.blob(0, 420, 1850, 700, 420, 260, [C.rock, 0x7a6a5a], 4, 0x5a9a3a);
    R.terrain({ x1: -2600, x2: 2600, z1: 200, z2: 1800, y: 600, nx: 24, nz: 8, amp: 6, seed: 9, cols: [0x3a7ab8, 0x4a8ac8, 0x346eaa, 0x5a9ad0] });
    for (let i = 0; i < 6; i++) R.blob(-1000 + i * 400 + (i % 2) * 90, 580, 300 + (i % 3) * 200, 60 + (i % 3) * 20, 40, 50, [C.rock, 0x7a6a5a], 30 + i, 0x5a9a3a);
    for (let i = 0; i < 12; i++) {                               // palms: a trunk and a crown of leaf pyramids
      const x = -1500 + i * 280 + (i % 3) * 40, z = 500 + (i % 4) * 260, base = 600, h = 260 + (i % 3) * 60;
      R.prism(x, base - h, base, z, 12, 4, C.trunk);
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + i; R.pyramid(x + Math.cos(a) * 50, base - h + 10, z + Math.sin(a) * 50, 110, 50, -30, k % 2 ? C.leaf : C.leafDark); }
    }
    // the deck: planks (a row of boxes), a rail of posts, stilts down into the water, the hut
    const P = this.platforms[0];
    for (let x = P.x1, i = 0; x < P.x2; x += 46, i++) R.box(x, 0, 0, Math.min(P.x2, x + 44), 14, 120, i % 2 ? C.plank : C.plankDark, i % 2 ? 0xc08a4a : 0x9a6a34);
    R.box(P.x1, 14, 10, P.x2, 30, 110, C.plankDark);
    for (const x of [-200, -100, 0, 100, 200]) R.prism(x, 30, 600, 60, 9, 5, C.log);
    for (const x of [-170, 170]) R.blob(x, 40, 70, 46, 26, 40, [C.leaf, C.leafDark, 0x4aaa44], x, null, 0.3);           // bushes hanging off the deck's ends
    const T = this.platforms[3];
    R.box(T.x1 + 20, T.y + 6, 50, T.x2 - 20, 0, 110, C.plankDark);                                  // the hut walls
    R.box(T.x1, T.y, 30, T.x2, T.y + 8, 130, C.roof, 0xb8843a);                                     // its roof (the top platform)
    R.box(-14, -60, 48, 14, 0, 50, 0x2a1a0a);                                                       // its doorway
    R.box(T.x1 + 26, -50, 48, T.x1 + 44, -30, 50, 0x2a1a0a); R.box(T.x2 - 44, -50, 48, T.x2 - 26, -30, 50, 0x2a1a0a);   // its windows
    R.pyramid(0, T.y + 2, 80, 170, 120, 46, 0x8a5a24);                                               // a thatched peak on the roof, set back
    // two giant jungle trees framing the stage, with lumpy canopies, and vines hanging off them
    for (const sx of [-1, 1]) {
      const x = sx * 560, z = 320;
      R.prism(x, -420, 600, z, 60, 7, C.trunk, 0x7a5a34);
      for (const [dx, dy, r] of [[0, -440, 170], [-sx * 120, -380, 120], [sx * 110, -470, 120], [0, -330, 110]]) R.blob(x + dx, dy, z + 20, r, r * 0.55, r * 0.8, [C.leaf, C.leafDark, 0x4aaa44], x + dx, null, 0.3);
      R.prism(x - sx * 70, -260, -240, z, 70, 6, C.trunk);                                           // a branch reaching in
    }
    // a rope bridge strung between the cliffs far behind
    for (let i = 0; i < 26; i++) { const x = -650 + i * 50, sag = 60 * Math.sin(i / 25 * Math.PI); R.box(x, -170 + sag, 1180, x + 40, -164 + sag, 1240, 0x8a6a3a, 0x9a7a4a); }
    for (const zr of [1180, 1240]) for (let i = 0; i < 25; i++) { const x = -650 + i * 50, s1 = 60 * Math.sin(i / 25 * Math.PI), s2 = 60 * Math.sin((i + 1) / 25 * Math.PI); R.quad([[x, -200 + s1, zr], [x + 50, -200 + s2, zr], [x + 50, -197 + s2, zr], [x, -197 + s1, zr]], 0x6a4a24); }
    // boulders and ferns at the waterfall's foot, a rainbow in the spray
    for (let i = 0; i < 5; i++) R.blob(-300 + i * 150, 590, 840, 50 + (i % 2) * 20, 30, 40, [C.rock, 0x7a6a5a], 60 + i, 0x5a9a3a);
    const bands = [0xff6a6a, 0xffb05a, 0xfff07a, 0x7ae87a, 0x6ab0ff, 0xb07aff];
    bands.forEach((c, b) => { for (let i = 0; i < 16; i++) {
      const a1 = Math.PI * i / 16, a2 = Math.PI * (i + 1) / 16, r1 = 520 - b * 14, r2 = r1 - 14;
      const pt = (a, r) => [Math.cos(a) * r - 150, 500 - Math.sin(a) * r, 1400];
      R.faces.push({ p: [pt(a1, r1), pt(a2, r1), pt(a2, r2), pt(a1, r2)], n: null, c, a: 0.32, bias: -300 });
    } });
    // tiki torches at the back corners of the deck
    for (const x of [P.x1 + 14, P.x2 - 14]) { R.prism(x, -44, 0, 100, 4, 5, C.log); R.box(x - 7, -52, 94, x + 7, -42, 106, 0x5a3a1a); }
    this.birds = Array.from({ length: BIRDS.n }, (_, i) => ({ x: -900 + i * 520, y: -260 + i * 40, z: 700 + i * 120, ph: i * 1.3, dir: i % 2 ? -1 : 1, col: [0xe83a3a, 0x3a8ae8, 0xf0c030, 0x3ac85a][i] }));
    this.fish = null;
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
    for (const r of this.rafts) for (let k = 0; k < 3; k++) dyn.push(...prismFaces(r.p.x1 + 15 + k * 30, r.p.y, r.p.y + 12, 40, 7, 5, C.log, 0xa87a3a).map((f) => f));
    for (const r of this.rafts) dyn.push(...boxFaces(r.p.x1, r.p.y, 0, r.p.x2, r.p.y + 6, 80, C.plank, 0xc08a4a));
    for (let i = 0; i < 8; i++) {                              // the waterfall: a sheet of water behind the deck with foam streaks running down
      const x = -360 + i * 90, wy = ((this.t * 6 + i * 70) % 800) - 300;
      dyn.push({ p: [[x, -400, 900], [x + 90, -400, 900], [x + 90, 700, 900], [x, 700, 900]], n: null, c: i % 2 ? C.water : 0x6ac0f0 });
      dyn.push({ p: [[x + 30, wy, 898], [x + 44, wy, 898], [x + 44, wy + 60, 898], [x + 30, wy + 60, 898]], n: null, c: C.foam, bias: -1 });
    }
    this.lifeFaces(dyn);
    if (this.hazardsOn) {
      const spin = this.held ? 0.4 : 0;
      dyn.push(...prismFaces(bx, by - BARREL.r - spin * 4, by + BARREL.r, 40, BARREL.r, 6, C.log, 0x6a3a1a));
      dyn.push(...prismFaces(bx, by - 6, by + 6, 39, BARREL.r + 2, 6, 0x2a2a2a));
    }
    this.R.render(dyn);
    return [];
  }

  /** This frame's jungle life: torch flames, swaying vines, birds flapping across the back, a leaping fish, mist. */
  lifeFaces(dyn) {
    const t = this.t, P = this.platforms[0];
    for (const x of [P.x1 + 14, P.x2 - 14]) { const fl = Math.sin(t * 0.4 + x) * 2; dyn.push(...blobFaces(x, -62 - fl, 100, 7, 12 + fl, 7, [0xffb03a, 0xff7a2a, 0xffe07a], t % 6, null, 0.3)); }
    for (const sx of [-1, 1]) for (let v = 0; v < 3; v++) {                                     // vines hanging from the big trees' branches
      const x0 = sx * (450 - v * 40), sw = Math.sin(t * 0.02 + v + sx) * 14;
      for (let k = 0; k < 6; k++) { const y = -250 + k * 40, a = sw * k / 6, b = sw * (k + 1) / 6; dyn.push({ p: [[x0 + a - 3, y, 300], [x0 + a + 3, y, 300], [x0 + b + 3, y + 40, 300], [x0 + b - 3, y + 40, 300]], n: null, c: k % 2 ? C.leaf : C.leafDark }); }
      dyn.push(...blobFaces(x0 + sw, -10, 300, 8, 6, 8, [C.leaf, 0x5aba4a], v, null, 0.3));
    }
    for (const b of this.birds) {                                                              // parrots: a body and two flapping wings
      b.x += b.dir * BIRDS.speed; if (Math.abs(b.x) > 1300) b.x = -b.dir * 1300;
      const y = b.y + Math.sin(t * 0.05 + b.ph) * 20, fl = Math.sin(t * 0.35 + b.ph) * 16;
      dyn.push(...blobFaces(b.x, y, b.z, 14, 7, 7, [b.col], 1, null, 0));
      dyn.push({ p: [[b.x - 8, y, b.z], [b.x + 8, y, b.z], [b.x, y - fl, b.z - 18]], n: null, c: b.col }, { p: [[b.x - 8, y, b.z], [b.x + 8, y, b.z], [b.x, y - fl, b.z + 18]], n: null, c: b.col });
      dyn.push({ p: [[b.x - b.dir * 12, y, b.z], [b.x - b.dir * 26, y + 3, b.z - 4], [b.x - b.dir * 26, y + 6, b.z + 4]], n: null, c: 0xf0e040 });   // the tail
    }
    if (!this.fish && t % FISH.gap === 0) this.fish = { x: -250 + Math.random() * 500, t: 0, dir: Math.random() < 0.5 ? -1 : 1 };
    if (this.fish) {                                                                           // a fish leaping out of the river in front of the falls
      const F = this.fish, u = F.t / FISH.time, x = F.x + F.dir * 120 * u, y = 600 - Math.sin(u * Math.PI) * 160, z = 760;
      dyn.push(...blobFaces(x, y, z, 16, 7, 6, [0xf0a03a, 0xe87a2a], 2, null, 0));
      dyn.push({ p: [[x - F.dir * 14, y, z], [x - F.dir * 26, y - 8, z], [x - F.dir * 26, y + 8, z]], n: null, c: 0xe87a2a });
      if (++F.t > FISH.time) this.fish = null;
    }
    for (let i = 0; i < 6; i++) { const u = (t * 0.01 + i / 6) % 1; dyn.push(...blobFaces(-300 + i * 120, 590 - u * 90, 880, 50 + u * 60, 24 + u * 20, 30, [0xf4f8ff, 0xe4f0fa], i, null, 0.3).map((f) => Object.assign(f, { a: 0.55 * (1 - u) }))); }   // mist off the falls
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

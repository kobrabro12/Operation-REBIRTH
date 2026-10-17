// "Elderwood Hollow": a mythical forest at night. The fight is on the back of a vast mossy root at the foot
// of an ancient world tree whose trunk glows with spiral runes. Two of its branches are ledges, and a huge
// glowing mushroom cap is the high platform. Fireflies and spirit wisps drift through shafts of moonlight,
// leaves fall, and mist rolls through the roots below. All art is drawn in code.
// Music: 'bgm_forest' (public/assets/audio/music/forest.ogg / .mp3 - silent until those files exist).
//
// Stage hazards, one at a time every 10-14 s, each announced with a CAUTION banner first:
//   BRAMBLE SNARE - the moss writhes in two or three spots, then thorny brambles burst up out of it,
//                   launching anyone standing there.
//   SPIRIT STAG   - a bell chimes and a great glowing stag charges across the root from one edge.
//                   Jump it, or wait it out on a ledge.
import { sfx } from '../audio/sfx.js';
import { HazardCycle } from './hazardCycle.js';

export const FPAL = {
  sky: [0x070b1c, 0x0a1226, 0x0c1a2e, 0x0f2234, 0x122a38, 0x16323c, 0x1a3a40, 0x1f4444],
  star: 0xcfe8ff, moon: 0xe8f4ea, moonShade: 0xbcd8c8,
  treeFar: 0x0f2a2e, treeFarLit: 0x18383a, treeMid: 0x0a1e22, treeMidLit: 0x123034,
  bark: 0x4a3426, barkLight: 0x6e5034, barkDark: 0x2e1e16, barkShade: 0x1c120c,
  moss: 0x3f8a3c, mossLight: 0x7cc456, mossDark: 0x24582a, mossDeep: 0x153a1c,
  leaf: 0x2f7a3a, leafLight: 0x6cc05a, leafDark: 0x1c4c26,
  rune: 0x8affd8, runeDim: 0x3fae94, glow: 0x9dffe0,
  cap: 0x6a3aa8, capLight: 0xa070e0, capDark: 0x40206a, spot: 0xe6d0ff, stem: 0xd8d0b8, stemShade: 0xa89c84,
  shroomA: 0x5ff0d0, shroomB: 0xf0a0ff, firefly: 0xf6ffa0, wisp: 0xbffcff,
  mist: 0x9cc8c0, outline: 0x08100e, thorn: 0x6a2a3a, thornLight: 0xa04a5a, vine: 0x2c6a30,
};

export class ForestStage {
  constructor(scene) {
    this.scene = scene;
    this.platforms = [
      { x1: -290, x2: 290, y: 0, solid: true, bottom: 50 },
      { x1: -226, x2: -116, y: -90, solid: false },      // left branch
      { x1: 116, x2: 226, y: -90, solid: false },        // right branch
      { x1: -54, x2: 54, y: -178, solid: false },        // the great mushroom cap
    ];
    this.spawns = [{ x: -150, y: 0 }, { x: 150, y: 0 }, { x: -50, y: 0 }, { x: 50, y: 0 }];
    this.hazardsOn = true;
    this.t = 0;
    this.music = 'bgm_forest';
    this.cycle = new HazardCycle(this, ['thorns', 'stag'], { color: '#9dffe0', stroke: '#08100e' });
    const R = (n) => { let s = n; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); };
    const r = R(7);
    this.flies = Array.from({ length: 26 }, () => ({ x: -300 + r() * 600, y: -230 + r() * 230, ph: r() * 6.28, sp: 0.4 + r() * 0.8 }));
    this.wisps = Array.from({ length: 5 }, (_, i) => ({ x: -260 + i * 130 + r() * 40, y: -150 + r() * 100, ph: r() * 6.28 }));
    this.leaves = Array.from({ length: 14 }, () => ({ x: -320 + r() * 640, y: -300 + r() * 300, ph: r() * 6.28, sp: 0.3 + r() * 0.4 }));
  }

  // ---------------------------------------------------------------- drawing helpers
  // a tall forest tree silhouette: trunk with a few branch stubs and a stepped crown
  farTree(g, x, baseY, h, w, col, lit) {
    g.fillStyle(col, 1); g.fillRect(x - w / 2, baseY - h, w, h);
    g.fillStyle(lit, 1); g.fillRect(x - w / 2, baseY - h, Math.max(1, Math.round(w * 0.3)), h);
    for (let k = 0; k < 6; k++) {                       // stepped canopy blobs
      const cy = baseY - h - 6 + k * 8, cw = w * 3.6 - Math.abs(k - 2) * w * 0.7;
      g.fillStyle(col, 1); g.fillRect(x - cw / 2 + ((k * 7) % 5) - 2, cy - 10, cw, 12);
    }
    for (let k = 0; k < 3; k++) { g.fillStyle(col, 1); g.fillRect(x + (k % 2 ? w / 2 : -w / 2 - 10), baseY - h * (0.3 + k * 0.18), 10, 3); }
  }
  // a glowing mushroom cluster on the ground
  shrooms(g, x, y, n, colA, colB, seed) {
    for (let i = 0; i < n; i++) {
      const sx = x + i * 6 + ((seed * 13 + i * 7) % 4), h = 4 + ((seed + i * 5) % 6), cw = 3 + ((seed + i) % 3);
      g.fillStyle(FPAL.stem, 1); g.fillRect(sx, y - h, 2, h);
      g.fillStyle(FPAL.outline, 1); g.fillRect(sx - cw + 1 - 1, y - h - 3, cw * 2 + 2, 4);
      g.fillStyle(i % 2 ? colA : colB, 1); g.fillRect(sx - cw + 1, y - h - 2, cw * 2, 2);
      g.fillStyle(0xffffff, 0.8); g.fillRect(sx - 1, y - h - 2, 1, 1);
    }
  }

  // ---------------------------------------------------------------- drawing
  draw(worldLayer, bgLayer) {
    const s = this.scene, P = FPAL;
    // night sky in hard bands, misty green near the forest floor
    const sky = s.add.graphics().setScrollFactor(0);
    P.sky.forEach((c, i) => { sky.fillStyle(c, 1); sky.fillRect(-400, -60 + i * 46, 1440, 47); });
    sky.fillStyle(P.sky[P.sky.length - 1], 1); sky.fillRect(-400, -60 + P.sky.length * 46, 1440, 400);
    for (let i = 0; i < 60; i++) { sky.fillStyle(P.star, i % 3 ? 0.45 : 0.9); sky.fillRect((i * 271) % 660, (i * 89) % 150, 1, 1); }
    bgLayer.push(sky);
    // the moon, low and huge behind the trees
    const moon = s.add.graphics().setScrollFactor(0.05);
    const mx = 470, my = 70, R = 38;
    for (const [rr, a] of [[R + 30, 0.06], [R + 18, 0.1], [R + 8, 0.16]]) { moon.fillStyle(P.glow, a); moon.fillCircle(mx, my, rr); }
    for (let y = -R; y <= R; y += 2) { const hw = Math.round(Math.sqrt(R * R - y * y)); moon.fillStyle(P.moon, 1); moon.fillRect(mx - hw, my + y, hw * 2, 2); moon.fillStyle(P.moonShade, 1); moon.fillRect(mx + Math.round(hw * 0.4), my + y, hw - Math.round(hw * 0.4), 2); }
    bgLayer.push(moon);
    // far forest: rows of tall tree silhouettes
    const far = s.add.graphics().setScrollFactor(0.15);
    for (let i = 0; i < 16; i++) this.farTree(far, -60 + i * 52 + ((i * 17) % 20), 330, 150 + (i * 37) % 90, 10 + (i % 3) * 3, P.treeFar, P.treeFarLit);
    far.fillStyle(P.treeFar, 1); far.fillRect(-200, 300, 1200, 200);
    bgLayer.push(far);
    // moonlight shafts falling through the canopy (animated in step)
    this.shaftG = s.add.graphics().setScrollFactor(0.25); bgLayer.push(this.shaftG);
    // nearer trunks with hanging moss
    const mid = s.add.graphics().setScrollFactor(0.35);
    for (const [x, w] of [[-20, 30], [110, 22], [520, 34], [640, 26], [300, 18]]) {
      mid.fillStyle(P.treeMid, 1); mid.fillRect(x - w / 2, -40, w, 420);
      mid.fillStyle(P.treeMidLit, 1); mid.fillRect(x - w / 2, -40, Math.round(w * 0.25), 420);
      for (let k = 0; k < 5; k++) { mid.fillStyle(P.mossDeep, 1); mid.fillRect(x - w / 2 + ((k * 9) % w), 40 + k * 26, 2, 14 + (k * 7) % 16); }
    }
    bgLayer.push(mid);
    this.backFxG = s.add.graphics().setScrollFactor(0.35); bgLayer.push(this.backFxG);   // drifting far wisps

    // ---- the world tree behind the stage (parallax close to the world)
    const tree = s.add.graphics().setScrollFactor(0.7);
    const tx = 320, tw = 150;
    for (let y = -120; y < 420; y += 4) {                // the trunk, widening into roots at the base
      const k = Math.max(0, (y - 200) / 220), half = tw / 2 + k * k * 160 + Math.sin(y * 0.05) * 3;
      tree.fillStyle(P.barkShade, 1); tree.fillRect(tx - half - 3, y, half * 2 + 6, 4);
      tree.fillStyle(P.barkDark, 1); tree.fillRect(tx - half, y, half * 2, 4);
      tree.fillStyle(P.bark, 1); tree.fillRect(tx - half + 6, y, half * 0.9, 4);
      tree.fillStyle(P.barkLight, 1); tree.fillRect(tx - half + 8, y, half * 0.25, 4);
      if ((y / 4) % 9 === 0) { tree.fillStyle(P.barkShade, 1); tree.fillRect(tx - half * 0.3 + (y % 17), y, half * 0.7, 2); }   // bark ridges
    }
    // the hollow: a dark arch in the trunk
    for (let r = 0; r < 18; r++) { const hw = Math.round(22 * Math.sqrt(1 - (r / 18) ** 2)); tree.fillStyle(0x040806, 1); tree.fillRect(tx - hw, 170 - r * 3, hw * 2, 3); }
    tree.fillStyle(0x040806, 1); tree.fillRect(tx - 22, 170, 44, 60);
    bgLayer.push(tree);
    this.runeG = s.add.graphics().setScrollFactor(0.7); bgLayer.push(this.runeG);   // runes glowing on the trunk

    // ---- the root the fight is on (world layer)
    const g = s.add.graphics(), PL = this.platforms[0];
    // tangled roots hanging into the mist below
    for (let i = 0; i < 16; i++) {
      const x0 = PL.x1 + 20 + i * 35, len = 40 + (i * 29) % 90;
      for (let k = 0; k < len; k += 3) {
        const x = Math.round(x0 + Math.sin(k * 0.08 + i) * 8), w = Math.max(2, 9 - k / 12);
        g.fillStyle(P.outline, 1); g.fillRect(x - w / 2 - 1, 12 + k, w + 2, 3);
        g.fillStyle(k % 12 < 6 ? P.barkDark : P.bark, 1); g.fillRect(x - w / 2, 12 + k, w, 3);
      }
    }
    // the root's body: a fat mossy log, rounded at the ends
    for (let row = 0; row < 14; row++) {
      const y = row * 3 - 2, inset = row < 4 ? (4 - row) * 3 : row > 10 ? (row - 10) * 6 : 0;
      g.fillStyle(P.outline, 1); g.fillRect(PL.x1 + inset - 2, y, PL.x2 - PL.x1 - inset * 2 + 4, 3);
      g.fillStyle(row < 3 ? P.mossLight : row < 5 ? P.moss : row < 8 ? P.bark : P.barkDark, 1); g.fillRect(PL.x1 + inset, y, PL.x2 - PL.x1 - inset * 2, 3);
    }
    for (let x = PL.x1 + 6; x < PL.x2 - 6; x += 7) {     // moss drips over the edge and bark grain
      g.fillStyle(P.moss, 1); g.fillRect(x, 13, 3, 2 + (x * 7) % 6);
      g.fillStyle(P.barkShade, 1); g.fillRect(x + 3, 26 + (x % 5), 5, 1);
    }
    for (let x = PL.x1 + 4; x < PL.x2 - 4; x += 9) { g.fillStyle(P.mossLight, 1); g.fillRect(x, -4, 2, 3); g.fillRect(x + 4, -3, 1, 2); }   // grass tufts
    // glowing mushroom clusters along the back of the root (low, never hiding feet)
    this.shrooms(g, -282, -1, 4, P.shroomA, P.shroomB, 1); this.shrooms(g, -150, -1, 3, P.shroomB, P.shroomA, 4);
    this.shrooms(g, 40, -1, 3, P.shroomA, P.shroomA, 2); this.shrooms(g, 190, -1, 4, P.shroomB, P.shroomA, 6); this.shrooms(g, 262, -1, 3, P.shroomA, P.shroomB, 3);

    // the branches (platforms 1 and 2), growing in from the edges of the screen
    for (const B of [this.platforms[1], this.platforms[2]]) {
      const dir = B.x1 < 0 ? -1 : 1, base = dir < 0 ? B.x1 - 60 : B.x2 + 60, tip = dir < 0 ? B.x2 : B.x1;
      const lo = Math.min(base, tip), hi = Math.max(base, tip);
      for (let x = lo; x <= hi; x += 2) {
        const k = Math.abs(x - tip) / Math.abs(base - tip), th = Math.round(5 + 7 * k), y = B.y + Math.round(Math.sin(k * 3) * 2);
        g.fillStyle(P.outline, 1); g.fillRect(x, y - 2, 2, th + 4);
        g.fillStyle(P.bark, 1); g.fillRect(x, y, 2, th);
        g.fillStyle(P.mossLight, 1); g.fillRect(x, y - 1, 2, 2);
        g.fillStyle(P.barkDark, 1); g.fillRect(x, y + th - 2, 2, 2);
      }
      for (let k = 0; k < 7; k++) {                     // leaf clumps hanging under the branch
        const lx = B.x1 + 6 + k * ((B.x2 - B.x1 - 12) / 6), ly = B.y + 9 + (k % 2) * 3;
        g.fillStyle(P.outline, 1); g.fillRect(lx - 6, ly - 1, 12, 8);
        g.fillStyle(P.leafDark, 1); g.fillRect(lx - 5, ly, 10, 6);
        g.fillStyle(P.leaf, 1); g.fillRect(lx - 4, ly, 7, 3);
        g.fillStyle(P.leafLight, 1); g.fillRect(lx - 3, ly, 3, 1);
      }
      this.shrooms(g, (B.x1 + B.x2) / 2 - 8, B.y - 1, 2, P.shroomB, P.shroomA, 5);
    }
    // the great mushroom (platform 3): a pale stem rising from behind the root, a wide violet cap
    const C = this.platforms[3];
    g.fillStyle(P.outline, 1); g.fillRect(-11, C.y + 8, 22, -C.y - 6);
    g.fillStyle(P.stem, 1); g.fillRect(-9, C.y + 8, 18, -C.y - 6);
    g.fillStyle(P.stemShade, 1); g.fillRect(3, C.y + 8, 6, -C.y - 6);
    for (let y = C.y + 30; y < -10; y += 22) { g.fillStyle(P.stemShade, 1); g.fillRect(-9, y, 18, 1); }
    for (let r = 0; r < 7; r++) {                       // gills under the cap, then the dome
      const hw = (C.x2 - C.x1) / 2 + 6 - r * 2;
      g.fillStyle(r === 0 ? P.outline : P.capDark, 1); g.fillRect(-hw, C.y + 6 - r, hw * 2, 2);
    }
    for (let r = 0; r < 16; r++) {
      const hw = Math.round(((C.x2 - C.x1) / 2 + 6) * Math.sqrt(1 - (r / 17) ** 2)), y = C.y - r * 2;
      g.fillStyle(P.outline, 1); g.fillRect(-hw - 1, y - 1, hw * 2 + 2, 3);
      g.fillStyle(r < 3 ? P.capDark : r < 10 ? P.cap : P.capLight, 1); g.fillRect(-hw, y, hw * 2, 2);
    }
    for (const [sx, sy, sr] of [[-34, -6, 4], [-12, -16, 5], [18, -10, 4], [36, -4, 3], [2, -26, 3], [-26, -20, 2]]) {   // spots
      g.fillStyle(P.spot, 1); g.fillRect(sx - sr, C.y + sy - 1, sr * 2, 3); g.fillRect(sx - sr + 1, C.y + sy - 2, sr * 2 - 2, 5);
    }
    worldLayer.push(g);
    // animated: mushroom glow, fireflies, wisps, falling leaves, mist; then the hazards
    this.fxG = s.add.graphics(); this.hzG = s.add.graphics();
    worldLayer.push(this.fxG, this.hzG);
    this.cycle.makeBanner(s);
  }

  // ---------------------------------------------------------------- per frame
  step(match) {
    this.t++;
    const t = this.t, P = FPAL;
    // moonlight shafts, slowly breathing
    const sh = this.shaftG; sh.clear();
    for (const [x, w, ph] of [[160, 40, 0], [330, 60, 2], [520, 34, 4]]) {
      const a = 0.05 + 0.03 * Math.sin(t * 0.02 + ph);
      for (let k = 0; k < 12; k++) { sh.fillStyle(P.glow, a); sh.fillRect(x + k * 6, -20 + k * 32, w, 34); }
    }
    // far wisps drifting among the trunks
    const bf = this.backFxG; bf.clear();
    for (let i = 0; i < 6; i++) {
      const x = ((i * 137 + t * 0.15) % 760) - 60, y = 120 + Math.sin(t * 0.02 + i) * 30 + i * 18;
      bf.fillStyle(P.wisp, 0.12); bf.fillCircle(x, y, 5); bf.fillStyle(P.wisp, 0.5); bf.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
    }
    // runes on the world tree pulsing in a slow wave, round the hollow
    const rg = this.runeG; rg.clear();
    for (let i = 0; i < 14; i++) {
      const a = i * 0.45 - 1.6, rr = 44 + (i % 2) * 6, x = 320 + Math.cos(a) * rr, y = 150 + Math.sin(a) * rr * 1.3;
      const on = 0.35 + 0.65 * Math.max(0, Math.sin(t * 0.05 - i * 0.5));
      rg.fillStyle(P.rune, on); rg.fillRect(Math.round(x) - 2, Math.round(y) - 1, 4, 2); rg.fillRect(Math.round(x) - 1, Math.round(y) - 3, 2, 6);
      rg.fillStyle(P.glow, on * 0.25); rg.fillCircle(x, y, 6);
    }
    // world-layer ambience
    const f = this.fxG; f.clear();
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.06);
    for (const [x, y, c] of [[-274, -6, P.shroomA], [-142, -6, P.shroomB], [48, -6, P.shroomA], [198, -6, P.shroomB], [270, -6, P.shroomA], [-171, -96, P.shroomB], [171, -96, P.shroomA]]) {
      f.fillStyle(c, 0.08 + 0.06 * pulse); f.fillCircle(x, y, 14);
    }
    f.fillStyle(P.capLight, 0.06 + 0.05 * pulse); f.fillCircle(0, this.platforms[3].y - 8, 60);   // the great cap's glow
    for (const fl of this.flies) {                      // fireflies: drifting, blinking
      const x = fl.x + Math.sin(t * 0.01 * fl.sp + fl.ph) * 30, y = fl.y + Math.cos(t * 0.013 * fl.sp + fl.ph) * 14;
      const on = Math.sin(t * 0.08 * fl.sp + fl.ph * 3);
      if (on > 0) { f.fillStyle(P.firefly, on * 0.3); f.fillCircle(x, y, 3); f.fillStyle(P.firefly, on); f.fillRect(Math.round(x), Math.round(y), 1, 1); }
    }
    for (const w of this.wisps) {                       // spirit wisps: soft orbs trailing light
      const x = w.x + Math.sin(t * 0.008 + w.ph) * 50, y = w.y + Math.sin(t * 0.017 + w.ph) * 16;
      for (let k = 4; k >= 1; k--) { f.fillStyle(P.wisp, 0.08 * (5 - k)); f.fillCircle(x - Math.cos(t * 0.008 + w.ph) * k * 4, y - Math.cos(t * 0.017 + w.ph) * k * 1.5, 3 + k); }
      f.fillStyle(0xffffff, 0.9); f.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
    }
    for (const l of this.leaves) {                      // leaves spiralling down
      l.y += l.sp; if (l.y > 120) { l.y = -320; l.x = -320 + ((l.x * 7 + 131) % 640); }
      const x = l.x + Math.sin(t * 0.03 + l.ph) * 12, flip = Math.sin(t * 0.08 + l.ph) > 0;
      f.fillStyle(flip ? P.leafLight : P.leaf, 0.9); f.fillRect(Math.round(x), Math.round(l.y), flip ? 3 : 2, 2);
    }
    for (let k = 0; k < 6; k++) {                       // mist rolling through the roots below
      const y = 40 + k * 18, x = ((k * 190 + t * (0.2 + (k % 3) * 0.1)) % 900) - 450;
      f.fillStyle(P.mist, 0.06 + k * 0.012); f.fillRect(Math.round(x), y, 260, 10); f.fillRect(Math.round(x) + 40, y - 4, 160, 4);
    }
    f.fillStyle(0x0c1a1e, 0.55); f.fillRect(-700, 150, 1400, 400);          // the forest floor lost in deep mist
    this.hzG.clear();
    return this.cycle.run(match, []);
  }

  // ---------------------------------------------------------------- hazards
  // ---- BRAMBLE SNARE: the moss writhes, then thorny brambles burst up
  start_thorns(match, h) {
    h.title = 'BRAMBLE SNARE - MOVE!';
    const n = Math.random() < 0.5 ? 2 : 3, xs = [];
    while (xs.length < n) { const x = Math.round(-250 + Math.random() * 500); if (xs.every((o) => Math.abs(o - x) > 110)) xs.push(x); }
    h.spots = xs.map((x, i) => ({ x, delay: i * 12 }));
  }
  step_thorns(match, h, out) {
    const g = this.hzG, P = FPAL;
    let busy = false;
    for (const s of h.spots) {
      const lt = h.t - s.delay;
      if (lt < 0) { busy = true; continue; }
      if (lt < 90) {                                     // vines writhing out of the moss
        busy = true;
        const k = lt / 90;
        for (let i = 0; i < 5; i++) {
          const vx = s.x - 12 + i * 6, vh = 2 + Math.round((3 + (i % 3) * 2) * k * (0.6 + 0.4 * Math.sin(lt * 0.3 + i)));
          g.fillStyle(P.vine, 1); g.fillRect(vx + Math.round(Math.sin(lt * 0.2 + i) * 1.5), -vh, 2, vh);
        }
        if (lt % 18 === 0) sfx('petal', 0.3, 0.6 + k);
        if (lt === 89) { sfx('slash', 0.8, 0.6); sfx('rumble', 0.5, 1.4); match.shake(4, 8); }
        continue;
      }
      const et = lt - 90;
      if (et > 60) continue;
      busy = true;
      const H = et < 6 ? et * 10 : et < 42 ? 60 : 60 * (1 - (et - 42) / 18);
      for (let i = -2; i <= 2; i++) {                    // five thorny stalks, the middle tallest
        const sx = s.x + i * 7, sh = H * (1 - Math.abs(i) * 0.18);
        for (let y = 0; y < sh; y += 3) {
          const wob = Math.round(Math.sin(y * 0.2 + i) * 2);
          g.fillStyle(P.outline, 1); g.fillRect(sx + wob - 2, -y - 3, 5, 4);
          g.fillStyle(y % 9 < 5 ? P.thorn : P.vine, 1); g.fillRect(sx + wob - 1, -y - 3, 3, 3);
          if (y % 9 === 0) { g.fillStyle(P.thornLight, 1); g.fillRect(sx + wob + (y % 18 ? 2 : -3), -y - 2, 2, 1); }   // thorns
        }
      }
      if (et === 0) for (let i = 0; i < 10; i++) match.puff(s.x, -4, i % 2 ? P.moss : P.barkLight, 1);
      if (et >= 1 && et < 42) out.push({ x1: s.x - 18, x2: s.x + 18, y1: -H, y2: 2, dmg: 10, angle: 82, base: 5, growth: 4.6, id: 'thorns' + h.id + ':' + s.x, hazard: true });
    }
    return !busy;
  }

  // ---- SPIRIT STAG: a glowing stag charges across the root
  start_stag(match, h) {
    h.side = Math.random() < 0.5 ? -1 : 1;
    h.title = 'SPIRIT STAG - JUMP!';
    h.x = h.side * 340;
  }
  drawStag(g, x, y, dir, t, alpha) {
    const P = FPAL, gait = Math.floor(t / 3) % 4;
    const body = (c, o) => {
      g.fillStyle(c, alpha);
      g.fillRect(x - 14 - o, y - 22 - o, 28 + o * 2, 10 + o * 2);                       // body
      g.fillRect(x + dir * 12 - 3 - o, y - 30 - o, 6 + o * 2, 10 + o * 2);              // neck
      g.fillRect(x + dir * 15 - 4 - o, y - 34 - o, 9 + o * 2, 5 + o * 2);               // head
      const legs = [[-11, gait % 2], [-6, (gait + 1) % 2], [7, (gait + 1) % 2], [11, gait % 2]];
      for (const [lx, up] of legs) g.fillRect(x + dir * lx - 1 - o, y - 13 - o, 2 + o * 2, 13 - up * 4 + o);
    };
    body(P.glow, 2); body(P.wisp, 1); body(0xffffff, 0);
    g.fillStyle(P.rune, alpha);                          // branching antlers
    const ax = x + dir * 15, ay = y - 34;
    for (const s of [-1, 1]) {
      for (let k = 0; k < 8; k++) g.fillRect(ax + s * 2 - dir * k * 0.6, ay - k * 2, 2, 2);
      g.fillRect(ax + s * 2 - dir * 2 + s * 3, ay - 8, 3, 1); g.fillRect(ax + s * 2 - dir * 4 + s * 4, ay - 12, 3, 1);
    }
    g.fillStyle(P.outline, alpha); g.fillRect(x + dir * 17, y - 33, 1, 1);   // eye
  }
  step_stag(match, h, out) {
    const g = this.hzG, P = FPAL, dir = -h.side;
    if (h.t < 90) {                                      // a bell, and glowing hoofprints leading in from the edge
      if (h.t % 30 === 1) sfx('item', 0.6, 0.7);
      for (let k = 0; k < 5; k++) { if ((h.t >> 3) % 5 < k) continue; g.fillStyle(P.rune, 0.7); g.fillRect(h.side * (280 - k * 26), -2, 3, 2); }
      g.fillStyle(P.glow, 0.15 + 0.1 * Math.sin(h.t * 0.3)); g.fillCircle(h.side * 300, -30, 26);
      return false;
    }
    if (h.t === 90) { sfx('limitready', 0.5, 0.6); sfx('rumble', 0.6, 0.8); }
    h.x += dir * 6;
    if (h.t % 6 === 0) { match.shake(2, 3); match.puff(h.x - dir * 10, -2, P.wisp, 2); }
    for (let k = 1; k <= 3; k++) this.drawStag(g, Math.round(h.x - dir * k * 14), 0, dir, h.t - k, 0.18 / k);   // afterimages
    this.drawStag(g, Math.round(h.x), 0, dir, h.t, 1);
    out.push({ x1: h.x - 18, x2: h.x + 18, y1: -36, y2: 0, dmg: 12, angle: 42, base: 5.2, growth: 5, dirX: dir, id: 'stag' + h.id, hazard: true });
    return Math.abs(h.x) > 380 && Math.sign(h.x) === dir;
  }
}

// Miniature of Elderwood Hollow drawn into a box (x, y, w, h), for the stage select screen.
export function drawForestPreview(g, x, y, w, h) {
  const P = FPAL, u = w / 100, v = h / 100;
  const bh = Math.ceil(h / P.sky.length);
  P.sky.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(x, y + i * bh, w, Math.min(bh, h - i * bh)); });
  g.fillStyle(P.glow, 0.15); g.fillCircle(x + 74 * u, y + 20 * v, 14 * v); g.fillStyle(P.moon, 1); g.fillCircle(x + 74 * u, y + 20 * v, 9 * v);
  for (let i = 0; i < 9; i++) { g.fillStyle(P.treeFar, 1); g.fillRect(x + (i * 11 + 2) * u, y + (30 + (i * 7) % 14) * v, 3 * u, 60 * v); }
  g.fillStyle(P.bark, 1); g.fillRect(x + 40 * u, y + 10 * v, 20 * u, 70 * v);                          // the world tree
  g.fillStyle(P.barkLight, 1); g.fillRect(x + 41 * u, y + 10 * v, 4 * u, 70 * v);
  g.fillStyle(P.rune, 1); for (let i = 0; i < 5; i++) g.fillRect(x + (44 + i * 3) * u, y + (34 + (i % 2) * 4) * v, 1.5 * u, 2 * v);
  g.fillStyle(P.moss, 1); g.fillRect(x + 6 * u, y + 72 * v, 88 * u, 4 * v);                           // the root
  g.fillStyle(P.bark, 1); g.fillRect(x + 8 * u, y + 76 * v, 84 * u, 5 * v);
  g.fillStyle(P.bark, 1); g.fillRect(x + 4 * u, y + 52 * v, 24 * u, 2 * v); g.fillRect(x + 72 * u, y + 52 * v, 24 * u, 2 * v);   // branches
  g.fillStyle(P.leaf, 1); g.fillRect(x + 8 * u, y + 54 * v, 18 * u, 3 * v); g.fillRect(x + 74 * u, y + 54 * v, 18 * u, 3 * v);
  g.fillStyle(P.stem, 1); g.fillRect(x + 48.5 * u, y + 38 * v, 3 * u, 34 * v);                          // the mushroom
  g.fillStyle(P.cap, 1); g.fillRect(x + 40 * u, y + 32 * v, 20 * u, 6 * v); g.fillStyle(P.capLight, 1); g.fillRect(x + 43 * u, y + 30 * v, 14 * u, 3 * v);
  g.fillStyle(P.shroomA, 1); g.fillRect(x + 12 * u, y + 70 * v, 2 * u, 2 * v); g.fillRect(x + 84 * u, y + 70 * v, 2 * u, 2 * v);
  g.fillStyle(P.firefly, 1); for (let i = 0; i < 7; i++) g.fillRect(x + ((i * 23) % 90 + 5) * u, y + ((i * 17) % 50 + 15) * v, 1, 1);
  g.fillStyle(P.mist, 0.3); g.fillRect(x, y + 86 * v, w, 14 * v);
}

// "Gravemoon Bridge": a stone bridge over a misty chasm at night. A huge full moon, castle spires
// and a smouldering volcano behind, horned gargoyle pillars holding up the bridge, and a red
// lantern hanging from a crossbeam above the middle. All art is drawn in code.
// Plays its own music (gravemoon).
//
// Stage hazards, one at a time every 10-14 s, each announced with a CAUTION banner first:
//   GARGOYLE GAZE - a gargoyle's head rises over one end of the bridge, its eyes burning brighter,
//                   then it fires a red eye-beam along the deck at ankle height. Jump!
//   BAT SWARM     - a swarm of bats streams across the moonlit sky in a wave, through the ledges
//                   and the air above the bridge. Stay low.
// The lantern: every attack that hits it sets it swinging on its chain and cracks the glass a little
// more. On the 10th hit the chain snaps: it falls (hurting anyone under it), shatters on the deck and
// fire spreads across the whole bridge for 10 s, burning anyone standing in it. A new lantern is
// lowered from the crossbeam a while later.
import { sfx } from '../audio/sfx.js';
import { HazardCycle } from './hazardCycle.js';

export const MPAL = {
  outline: 0x0a0818,
  sky: [0x0b0922, 0x110e30, 0x17143e, 0x1e1a4c, 0x26215a, 0x2f2a6a, 0x39337a, 0x443e8a],
  streak: 0x5a56a8, star: 0xc8ccff,
  moon: 0xe6eaff, moonShade: 0xc2c8f0, crater: 0x9ca4d8, halo: 0x7470d0,
  mtnFar: 0x2c2c64, mtnFarLit: 0x4a4c90, mtnNear: 0x1a1a42, mtnNearLit: 0x3a3c76,
  window: 0xf3c358, lava: 0xff5a2a, lavaHot: 0xffb040, lavaDark: 0x8a1a10,
  stone: 0x5a6690, stoneLight: 0x9aaad4, stoneMid: 0x404a74, stoneDark: 0x272c4c, rune: 0x7ac8f0,
  iron: 0x2a2838, ironLit: 0x55526e, ironDark: 0x15131f,
  lanternFrame: 0x24182a, glass: 0xff6a20, glassHot: 0xffc060,
  eye: 0xff3a3a, fog: 0x8a90c0,
};

export class MoonStage {
  constructor(scene) {
    this.scene = scene;
    this.platforms = [
      { x1: -300, x2: 300, y: 0, solid: true, bottom: 40 },
      { x1: -214, x2: -114, y: -84, solid: false },     // left horned arch
      { x1: 114, x2: 214, y: -84, solid: false },       // right horned arch
      { x1: -56, x2: 56, y: -170, solid: false },       // crossbeam the lantern hangs from
    ];
    this.spawns = [{ x: -150, y: 0 }, { x: 150, y: 0 }, { x: -50, y: 0 }, { x: 50, y: 0 }];
    this.hazardsOn = true;
    this.t = 0;
    this.music = 'bgm_gravemoon';
    this.cycle = new HazardCycle(this, ['gaze', 'bats'], { color: '#ff6a6a', stroke: '#0a0818' });
    this.lamp = { state: 'hung', hits: 0, ang: 0, vel: 0, seen: new Set(), t: 0, drop: 0 };
  }

  // ---------------------------------------------------------------- helpers
  // a curved horn: steps along an arc from (x, y), thick at the root and thin at the tip
  horn(g, x, y, dir, len, curl, thick, col = MPAL.iron, lit = MPAL.ironLit) {
    const steps = Math.ceil(len * 1.5), pts = [];
    for (let i = 0; i <= steps; i++) {
      const k = i / steps, a = k * curl;
      pts.push([Math.round(x + dir * Math.sin(a) * len * 0.7), Math.round(y - (1 - Math.cos(a)) * len * 0.15 - k * len * 0.6), Math.max(1, Math.round(thick * (1 - k * 0.85)))]);
    }
    for (const [px, py, w] of pts) { g.fillStyle(MPAL.outline, 1); g.fillRect(px - Math.floor(w / 2) - 1, py - 1, w + 2, 3); }
    for (const [px, py, w] of pts) { g.fillStyle(col, 1); g.fillRect(px - Math.floor(w / 2), py, w, 1); }
    for (const [px, py, w] of pts) { if (w > 2) { g.fillStyle(lit, 1); g.fillRect(px - Math.floor(w / 2), py, Math.max(1, Math.round(w / 3)), 1); } }
  }
  // jagged mountain ridge silhouette between x1..x2 with its base at baseY
  ridge(g, x1, x2, baseY, peaks, col, lit, seed) {
    let x = x1;
    let k = seed;
    while (x < x2) {
      k = (k * 1103515245 + 12345) & 0x7fffffff;
      const w = 30 + (k % 70), h = peaks[0] + (k >> 8) % peaks[1];
      for (let r = 0; r < h; r += 3) {
        const half = Math.max(1, Math.round((w / 2) * (1 - r / h)));
        const cx = x + w / 2 + ((r >> 2) % 3) - 1;
        g.fillStyle(col, 1); g.fillRect(cx - half, baseY - r - 3, half * 2, 3);
        g.fillStyle(lit, 1); g.fillRect(cx - half, baseY - r - 3, Math.max(1, Math.round(half * 0.3)), 3);   // moonlit left faces
      }
      x += w * 0.6;
    }
    g.fillStyle(col, 1); g.fillRect(x1, baseY, x2 - x1, 400);
  }
  // a thin gothic spire with lit windows
  spireTower(g, x, baseY, h, w, col) {
    for (let r = 0; r < h; r += 3) {
      const k = r / h, half = Math.max(1, Math.round((w / 2) * (k < 0.6 ? 1 : (1 - (k - 0.6) / 0.4))));
      g.fillStyle(col, 1); g.fillRect(x - half, baseY - r - 3, half * 2, 3);
    }
    for (let r = 10; r < h * 0.55; r += 14) { g.fillStyle(MPAL.window, 1); g.fillRect(x - 1, baseY - r, 2, 3); }
  }
  // a horned gargoyle pillar hanging under the bridge deck at cx, from topY down into the mist
  gargoyle(g, cx, topY) {
    const S = MPAL;
    // pillar shaft of stone blocks
    for (let y = topY; y < topY + 240; y += 10) {
      const w = 34 - Math.min(10, (y - topY) / 24);
      g.fillStyle(S.outline, 1); g.fillRect(cx - w / 2 - 2, y, w + 4, 10);
      g.fillStyle(S.stoneDark, 1); g.fillRect(cx - w / 2, y, w, 9);
      g.fillStyle(S.stoneMid, 1); g.fillRect(cx - w / 2, y, w * 0.3, 9);
      g.fillStyle(S.outline, 1); g.fillRect(cx - w / 2 + ((y / 10) % 2 ? 8 : 18), y, 1, 9);
    }
    // head, built row by row: wide horned brow, sunken eyes, a snout, and a fanged open jaw
    const hy = topY + 18;
    const rows = [36, 40, 44, 44, 42, 40, 38, 34, 30, 30, 30, 28, 26, 22];   // half-widths x2, every 3 px
    rows.forEach((w, r) => {
      const y = hy + r * 3;
      g.fillStyle(S.outline, 1); g.fillRect(cx - w / 2 - 2, y, w + 4, 3);
      g.fillStyle(S.stoneMid, 1); g.fillRect(cx - w / 2, y, w, 3);
      g.fillStyle(S.stone, 1); g.fillRect(cx - w / 2, y, Math.round(w * 0.3), 3);
      g.fillStyle(S.stoneDark, 1); g.fillRect(cx + Math.round(w * 0.25), y, w / 2 - Math.round(w * 0.25), 3);
    });
    g.fillStyle(S.outline, 1); g.fillRect(cx - 22, hy + 8, 44, 3);                      // heavy brow ridge shadow
    g.fillStyle(S.stoneLight, 1); g.fillRect(cx - 22, hy + 6, 18, 2); g.fillRect(cx + 4, hy + 6, 10, 2);
    for (const ex of [-13, 7]) {                                                          // angled eye sockets with a red glint
      g.fillStyle(S.outline, 1); g.fillRect(cx + ex, hy + 11, 7, 4); g.fillRect(cx + ex + (ex < 0 ? 2 : 0), hy + 15, 5, 2);
      g.fillStyle(S.eye, 1); g.fillRect(cx + ex + 2, hy + 12, 3, 2);
    }
    g.fillStyle(S.stone, 1); g.fillRect(cx - 4, hy + 15, 8, 8); g.fillStyle(S.stoneLight, 1); g.fillRect(cx - 4, hy + 15, 3, 7);   // snout
    g.fillStyle(S.outline, 1); g.fillRect(cx - 4, hy + 22, 3, 2); g.fillRect(cx + 1, hy + 22, 3, 2);                               // nostrils
    g.fillStyle(S.outline, 1); g.fillRect(cx - 10, hy + 27, 20, 11);                                                                // open jaw
    g.fillStyle(0x3a0a14, 1); g.fillRect(cx - 7, hy + 30, 14, 6);
    g.fillStyle(0xd8d8e8, 1);
    for (const fx of [-9, -4, 2, 7]) g.fillRect(cx + fx, hy + 27, 2, 3 + ((fx + 9) % 2));                                         // upper fangs
    for (const fx of [-7, 5]) g.fillRect(cx + fx, hy + 35, 2, 3);                                                                   // lower fangs
    // big curling horns out of the head
    this.horn(g, cx - 18, hy + 3, -1, 48, 2.2, 8, S.stoneMid, S.stoneLight);
    this.horn(g, cx + 18, hy + 3, 1, 48, 2.2, 8, S.stoneMid, S.stoneLight);
  }

  // ---------------------------------------------------------------- drawing
  draw(worldLayer, bgLayer) {
    const s = this.scene, S = MPAL;
    // night sky in hard bands, brighter toward the moon's horizon
    const sky = s.add.graphics().setScrollFactor(0);
    S.sky.forEach((c, i) => { sky.fillStyle(c, 1); sky.fillRect(-400, -60 + i * 44, 1440, 45); });
    sky.fillStyle(S.sky[S.sky.length - 1], 1); sky.fillRect(-400, -60 + S.sky.length * 44, 1440, 400);
    // wispy cloud streaks
    for (let i = 0; i < 14; i++) {
      const y = 10 + (i * 37) % 170, x = (i * 151) % 700 - 40, w = 60 + (i * 53) % 140;
      sky.fillStyle(S.streak, 0.35); sky.fillRect(x, y, w, 2); sky.fillRect(x + 20, y + 3, w * 0.6, 1);
    }
    for (let i = 0; i < 50; i++) { sky.fillStyle(S.star, (i % 3) ? 0.5 : 0.9); sky.fillRect((i * 263) % 660, (i * 97) % 200, 1, 1); }
    bgLayer.push(sky);

    // the moon with stepped glow rings
    const moon = s.add.graphics().setScrollFactor(0.04);
    const mx = 330, my = 92, R = 46;
    for (const [rr, a] of [[R + 26, 0.08], [R + 16, 0.14], [R + 8, 0.22]]) { moon.fillStyle(S.halo, a); moon.fillCircle(mx, my, rr); }
    for (let y = -R; y <= R; y += 2) {
      const half = Math.round(Math.sqrt(R * R - y * y));
      moon.fillStyle(S.moon, 1); moon.fillRect(mx - half, my + y, half * 2, 2);
      moon.fillStyle(S.moonShade, 1); moon.fillRect(mx + Math.round(half * 0.45), my + y, half - Math.round(half * 0.45), 2);
    }
    for (const [cx, cy, r] of [[-14, -18, 7], [10, -6, 9], [-20, 10, 5], [16, 18, 6], [-4, 26, 4], [24, -22, 4]]) {
      moon.fillStyle(S.crater, 1); moon.fillRect(mx + cx - r, my + cy - r / 2, r * 2, r);
      moon.fillStyle(S.moonShade, 1); moon.fillRect(mx + cx - r + 1, my + cy - r / 2, r, 2);
    }
    bgLayer.push(moon);

    // far mountains, castle spires and the volcano (its glow and embers are animated in step)
    const far = s.add.graphics().setScrollFactor(0.15);
    this.ridge(far, -200, 860, 236, [40, 70], S.mtnFar, S.mtnFarLit, 7);
    for (const [x, h, w] of [[40, 120, 10], [62, 90, 8], [84, 150, 12], [104, 100, 8], [120, 70, 6], [150, 60, 6], [348, 110, 8], [358, 80, 6]]) this.spireTower(far, x, 200, h, w, S.mtnNear);
    // volcano on the right
    for (let r = 0; r < 120; r += 3) {
      const half = Math.round(96 - r * 0.66) + ((r / 3) % 4 === 0 ? 2 : 0);
      far.fillStyle(0x201838, 1); far.fillRect(600 - half, 230 - r, half * 2, 3);
      far.fillStyle(0x3a2c5a, 1); far.fillRect(600 - half, 230 - r, Math.round(half * 0.22), 3);
      if (r > 104) { far.fillStyle(0x5a1c2c, 1); far.fillRect(600 - half + 2, 230 - r, half * 2 - 4, 3); }   // lava light on the rim
    }
    bgLayer.push(far);
    this.emberG = s.add.graphics().setScrollFactor(0.15);
    bgLayer.push(this.emberG);
    const near = s.add.graphics().setScrollFactor(0.3);
    this.ridge(near, -300, 960, 300, [24, 50], S.mtnNear, S.mtnNearLit, 3);
    bgLayer.push(near);

    // a second, distant bridge with tiny lanterns (parallax)
    const back = s.add.graphics().setScrollFactor(0.55);
    back.fillStyle(0x161634, 1); back.fillRect(-300, 252, 1300, 10);
    for (let x = -300; x < 1000; x += 48) {
      back.fillRect(x, 262, 8, 60);
      back.fillStyle(0x161634, 1); back.fillRect(x + 8, 262, 40, 4);
      if ((x / 48) % 3 === 0) { back.fillStyle(S.glass, 0.9); back.fillRect(x + 2, 244, 3, 4); back.fillStyle(0x161634, 1); }
    }
    back.fillStyle(0x24245a, 0.5); back.fillRect(-300, 300, 1300, 120);        // mist over its legs
    bgLayer.push(back);

    // ---- the bridge itself (world layer, behind the fighters)
    const g = s.add.graphics();
    const P = this.platforms[0];
    // gargoyle pillars under the deck
    for (const cx of [-220, 0, 220]) this.gargoyle(g, cx, 30);
    // rough underside of the deck
    for (let row = 0; row < 4; row++) {
      const y = 12 + row * 6, inset = row * 6 + (row * row);
      g.fillStyle(S.outline, 1); g.fillRect(P.x1 + inset - 2, y, P.x2 - P.x1 - inset * 2 + 4, 6);
      g.fillStyle(row < 2 ? S.stoneMid : S.stoneDark, 1); g.fillRect(P.x1 + inset, y, P.x2 - P.x1 - inset * 2, 6);
      g.fillStyle(S.stoneDark, 1);
      for (let k = P.x1 + inset + 7 + row * 5; k < P.x2 - inset - 6; k += 29) g.fillRect(k, y + 5, 6, 3 + (k % 4));
    }
    // horned iron railing along the back edge (low, behind fighters)
    g.fillStyle(S.ironDark, 1); g.fillRect(P.x1 + 4, -22, P.x2 - P.x1 - 8, 3);
    for (let x = P.x1 + 10; x < P.x2 - 6; x += 16) { g.fillStyle(S.iron, 1); g.fillRect(x, -22, 3, 22); g.fillStyle(S.ironLit, 1); g.fillRect(x, -22, 1, 22); }
    for (const x of [-260, -160, -60, 40, 140, 240]) { this.horn(g, x + 10, -20, -1, 26, 1.8, 4); this.horn(g, x + 10, -20, 1, 26, 1.8, 4); }
    // deck slab: moonlit flagstones with faint glowing runes
    g.fillStyle(S.outline, 1); g.fillRect(P.x1 - 2, -2, P.x2 - P.x1 + 4, 16);
    g.fillStyle(S.stone, 1); g.fillRect(P.x1, 0, P.x2 - P.x1, 12);
    g.fillStyle(S.stoneLight, 1); g.fillRect(P.x1, 0, P.x2 - P.x1, 2);
    g.fillStyle(S.stoneMid, 1); g.fillRect(P.x1, 9, P.x2 - P.x1, 3);
    for (let k = P.x1 + 22; k < P.x2; k += 38) { g.fillStyle(S.stoneMid, 1); g.fillRect(k, 2, 1, 7); }
    for (let k = P.x1 + 40; k < P.x2 - 20; k += 97) { g.fillStyle(S.rune, 0.55); g.fillRect(k, 4, 10, 1); g.fillRect(k + 3, 3, 4, 1); g.fillRect(k + 10, 5, 6, 1); }

    // horned arches on the left and right: their crests are platforms 1 and 2
    for (const A of [this.platforms[1], this.platforms[2]]) {
      const cx = (A.x1 + A.x2) / 2, w = A.x2 - A.x1;
      // two iron legs down to the deck
      for (const lx of [A.x1 + 10, A.x2 - 14]) { g.fillStyle(S.outline, 1); g.fillRect(lx - 1, A.y, 6, -A.y); g.fillStyle(S.iron, 1); g.fillRect(lx, A.y, 4, -A.y); g.fillStyle(S.ironLit, 1); g.fillRect(lx, A.y, 1, -A.y); }
      // horns sweeping up from the legs to frame the crest
      this.horn(g, A.x1 + 12, -6, -1, 44, 2.4, 6); this.horn(g, A.x2 - 12, -6, 1, 44, 2.4, 6);
      // crest bar (the platform)
      g.fillStyle(S.outline, 1); g.fillRect(A.x1 - 2, A.y - 2, w + 4, 9);
      g.fillStyle(S.iron, 1); g.fillRect(A.x1, A.y, w, 6);
      g.fillStyle(S.ironLit, 1); g.fillRect(A.x1, A.y, w, 1);
      // a small skull boss in the middle of the crest
      g.fillStyle(S.stoneLight, 1); g.fillRect(cx - 5, A.y + 6, 10, 7); g.fillStyle(S.outline, 1); g.fillRect(cx - 3, A.y + 8, 2, 2); g.fillRect(cx + 1, A.y + 8, 2, 2);
    }
    // crossbeam (platform 3) on two tall horned posts behind the middle of the bridge
    const C = this.platforms[3];
    for (const px of [C.x1 + 6, C.x2 - 10]) { g.fillStyle(S.outline, 1); g.fillRect(px - 1, C.y, 6, -C.y); g.fillStyle(S.iron, 1); g.fillRect(px, C.y, 4, -C.y); g.fillStyle(S.ironLit, 1); g.fillRect(px, C.y, 1, -C.y); }
    this.horn(g, C.x1 + 8, C.y + 4, -1, 50, 2.6, 6); this.horn(g, C.x2 - 8, C.y + 4, 1, 50, 2.6, 6);
    g.fillStyle(S.outline, 1); g.fillRect(C.x1 - 2, C.y - 2, C.x2 - C.x1 + 4, 9);
    g.fillStyle(S.iron, 1); g.fillRect(C.x1, C.y, C.x2 - C.x1, 6);
    g.fillStyle(S.ironLit, 1); g.fillRect(C.x1, C.y, C.x2 - C.x1, 1);
    worldLayer.push(g);

    // animated: lantern glow and mist drifting through the gargoyles
    this.lanternG = s.add.graphics();                                // the lantern + chain, drawn around the chain's anchor and rotated as it swings
    this.lanternG.setPosition(0, this.platforms[3].y + 7);
    this.fireG = s.add.graphics();                                   // the falling lantern and the fire on the deck
    this.fogG = s.add.graphics();
    this.hzG = s.add.graphics();                                   // gargoyle head, eye-beam, bats
    worldLayer.push(this.fogG, this.lanternG, this.fireG, this.hzG);
    this.cycle.makeBanner(s);
  }

  // ---------------------------------------------------------------- per frame
  step(match) {
    this.t++;
    const t = this.t, S = MPAL;
    // volcano: pulsing glow at the crater and embers rising
    const e = this.emberG; e.clear();
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.05);
    for (const [r, a] of [[34, 0.05], [24, 0.08], [14, 0.12]]) { e.fillStyle(S.lava, a + 0.04 * pulse); e.fillCircle(600, 108, r); }
    e.fillStyle(S.lavaDark, 1); e.fillRect(584, 112, 32, 2);
    e.fillStyle(S.lava, 1); e.fillRect(587, 111, 26, 2);
    e.fillStyle(S.lavaHot, 0.6 + 0.4 * pulse); e.fillRect(595, 111, 10, 1);
    for (let k = 0; k < 16; k++) {
      const life = (t * (0.6 + (k % 4) * 0.2) + k * 23) % 90;
      const x = 580 + ((k * 37) % 40) + Math.sin((t + k * 20) * 0.05) * 6, y = 104 - life * 0.9;
      e.fillStyle(k % 3 ? S.lava : S.lavaHot, 1 - life / 90); e.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
    const lampOut = [];
    this.stepLantern(match, lampOut);
    // mist rolling through the pillars below the deck
    const f = this.fogG; f.clear();
    for (let k = 0; k < 9; k++) {
      const y = 60 + k * 22, sp = 0.15 + (k % 3) * 0.08;
      for (let j = 0; j < 4; j++) {
        const x = ((j * 260 + k * 70 + t * sp) % 1040) - 520;
        f.fillStyle(S.fog, 0.07 + 0.02 * (k % 3) + k * 0.012);
        f.fillRect(Math.round(x), y, 220, 10); f.fillRect(Math.round(x) + 30, y - 4, 140, 4); f.fillRect(Math.round(x) + 50, y + 10, 120, 4);
      }
    }
    f.fillStyle(0x2a2c58, 0.5); f.fillRect(-700, 230, 1400, 400);          // the chasm fades into deep mist
    this.hzG.clear();
    return this.cycle.run(match, lampOut);
  }

  // ---------------------------------------------------------------- the lantern
  // the lantern's body in its own coordinates: (0, 0) is the chain's anchor under the crossbeam,
  // the lantern hangs 33 px below it
  drawLamp(l, flick, hits, chain = true) {
    const S = MPAL, ly = 33;
    if (chain) for (let y = 0; y < ly; y += 4) { l.fillStyle(S.ironLit, 1); l.fillRect(-1, y, 3, 2); l.fillStyle(S.ironDark, 1); l.fillRect(0, y + 2, 1, 2); }
    l.fillStyle(S.glass, 0.08 + 0.04 * flick); l.fillCircle(0, ly + 12, 34);
    l.fillStyle(S.glass, 0.12 + 0.05 * flick); l.fillCircle(0, ly + 12, 20);
    l.fillStyle(S.outline, 1); l.fillRect(-9, ly - 2, 18, 30);
    l.fillStyle(S.lanternFrame, 1); l.fillRect(-8, ly - 1, 16, 4); l.fillRect(-8, ly + 23, 16, 4); l.fillRect(-4, ly - 5, 8, 4);
    l.fillStyle(S.glass, 1); l.fillRect(-6, ly + 3, 12, 20);
    l.fillStyle(S.glassHot, 1); l.fillRect(-2, ly + 8 + Math.round(flick * 3), 4, 10 - Math.round(flick * 3));
    // cracks spreading over the glass, one more with every hit
    const CR = [[-5, 5, 1, 4], [3, 6, -1, 5], [-4, 14, 2, 3], [4, 16, -2, 4], [-5, 19, 3, 2], [2, 4, 2, 3], [-3, 9, -1, 4], [5, 11, -2, 3], [0, 18, 2, 3]];
    for (let i = 0; i < Math.min(hits, CR.length); i++) {
      const [x, y, dx, n] = CR[i];
      for (let k = 0; k < n; k++) { l.fillStyle(0xfff0d0, 1); l.fillRect(x + Math.round(dx * k / 2), ly + y + k, 1, 1); }
    }
    l.fillStyle(S.lanternFrame, 1); l.fillRect(-1, ly + 3, 2, 20); l.fillRect(-6, ly + 12, 12, 1);
  }
  // where the lantern's body is right now (world space), for hits
  lampBox() {
    const L = this.lamp, ax = this.lanternG.x, ay = this.lanternG.y;
    const cx = ax + Math.sin(L.ang) * 45, cy = ay + Math.cos(L.ang) * 45;
    return { x1: cx - 10, x2: cx + 10, y1: cy - 16, y2: cy + 16, cx, cy };
  }
  // MatchScene calls this with every attack hitbox each tick
  strikeTargets(match, hbs) {
    const L = this.lamp;
    if (L.state !== 'hung' || !this.hazardsOn) return;
    const b = this.lampBox();
    for (const hb of hbs) {
      if (L.seen.has(hb.id) || !(hb.x1 < b.x2 && hb.x2 > b.x1 && hb.y1 < b.y2 && hb.y2 > b.y1)) continue;
      L.seen.add(hb.id); L.hits++;
      const dir = hb.facing || Math.sign(b.cx - (hb.owner ? hb.owner.x : 0)) || 1;
      L.vel += dir * (0.07 + Math.random() * 0.03);                  // knocked swinging
      sfx('clang', 0.5, 1.3 + L.hits * 0.04); match.puff(b.cx, b.cy, MPAL.glassHot, 4);
      if (L.hits >= 10) {                                           // the chain snaps
        L.state = 'fall'; L.x = b.cx; L.y = b.cy - 12; L.vx = Math.sin(L.ang) * 1.5 + L.vel * 20; L.vy = -1; L.rot = -L.ang; L.t = 0; L.id = (L.id || 0) + 1;
        sfx('shield', 0.9, 0.5); match.shake(4, 8);
      }
    }
    if (L.seen.size > 400) L.seen.clear();
  }
  stepLantern(match, out) {
    const L = this.lamp, S = MPAL, t = this.t, l = this.lanternG, f = this.fireG;
    const flick = (Math.sin(t * 0.7) + Math.sin(t * 1.9 + 1)) * 0.25;
    l.clear(); f.clear();
    if (L.state === 'hung' || L.state === 'lower') {
      // a pendulum: knocked by hits, settling back to a gentle idle sway
      L.vel += -Math.sin(L.ang) * 0.018 + Math.sin(t * 0.03) * 0.0004; L.vel *= 0.988; L.ang += L.vel;
      l.setRotation(-L.ang);
      if (L.state === 'lower') {                                      // a new lantern let down on its chain
        L.drop = Math.min(1, L.drop + 0.012);
        l.setScale(1, 1); l.y = this.platforms[3].y + 7 - (1 - L.drop) * 40;
        if (L.drop >= 1) { L.state = 'hung'; l.y = this.platforms[3].y + 7; }
      }
      this.drawLamp(l, flick, L.hits);
      return;
    }
    l.setRotation(0);
    // the snapped chain end, still hanging from the crossbeam
    for (let y = 0; y < 14; y += 4) { l.fillStyle(S.ironLit, 1); l.fillRect(-1, y, 3, 2); }
    if (L.state === 'fall') {                                        // falling, tumbling, hurting anyone underneath
      L.t++; L.vy += 0.4; L.x += L.vx; L.y += L.vy; L.rot += L.vx * 0.04;
      f.save(); f.translateCanvas(L.x, L.y); f.rotateCanvas(L.rot); this.drawLamp(f, flick, 9, false); f.restore();
      out.push({ x1: L.x - 10, x2: L.x + 10, y1: L.y + 20, y2: L.y + 62, dmg: 8, angle: 70, base: 3.6, growth: 3.8, id: 'lampfall' + L.id, hazard: true });
      if (L.y + 60 >= 0 || L.t > 120) {                            // shatters on the deck
        L.state = 'fire'; L.t = 0; L.x = Math.max(-290, Math.min(290, L.x)); L.l = L.x; L.r = L.x;
        sfx('bighit', 1, 0.5); sfx('glitch', 0.5, 0.4); sfx('flame', 1, 0.6); match.shake(10, 12);
        for (let i = 0; i < 24; i++) match.puff(L.x, -6, i % 3 ? S.lava : S.glassHot, 1);
        match.popText({ x: L.x, y: 20 }, 'THE BRIDGE IS BURNING!', '#ff8a3a');
      }
      return;
    }
    if (L.state === 'fire') {                                        // fire across the bridge for 10 s
      L.t++;
      const P = this.platforms[0], spread = 7;
      L.l = Math.max(P.x1, L.l - spread); L.r = Math.min(P.x2, L.r + spread);
      const fade = L.t > 540 ? (600 - L.t) / 60 : 1;
      f.fillStyle(S.lava, 0.12 * fade); f.fillRect(L.l, -40, L.r - L.l, 40);           // heat glow over the deck
      for (let x = L.l; x < L.r; x += 6) {
        const h = (8 + 7 * Math.abs(Math.sin(x * 0.37 + t * 0.31)) + 4 * Math.abs(Math.sin(x * 0.11 - t * 0.17))) * fade;
        f.fillStyle(S.lavaDark, 0.9 * fade); f.fillRect(x, -Math.round(h * 0.4), 6, Math.round(h * 0.4));
        f.fillStyle(S.lava, fade); f.fillRect(x + 1, -Math.round(h * 0.75), 4, Math.round(h * 0.75) - 1);
        f.fillStyle(S.lavaHot, fade); f.fillRect(x + 2, -Math.round(h * 0.5), 2, Math.round(h * 0.5) - 2);
        if ((x + t) % 23 === 0) match.puff(x + 3, -h, (x % 2) ? S.lava : S.lavaHot, 1);       // embers
      }
      if (t % 14 === 0) sfx('flame', 0.25 * fade, 0.5 + Math.random() * 0.3);
      if (fade > 0.3) out.push({ x1: L.l, x2: L.r, y1: -18, y2: 2, dmg: 3, angle: 85, base: 3.2, growth: 1.0, id: 'lampfire' + L.id + ':' + Math.floor(L.t / 40), hazard: true });
      if (L.t >= 600) { L.state = 'gone'; L.t = 0; }
      return;
    }
    if (L.state === 'gone' && ++L.t >= 900) {                        // a fresh lantern is lowered 15 s later
      Object.assign(L, { state: 'lower', hits: 0, ang: 0, vel: 0, drop: 0, t: 0 }); L.seen.clear();
    }
  }

  // ---------------------------------------------------------------- hazards
  // ---- GARGOYLE GAZE: a stone head rises at one end and sweeps an ankle-high eye-beam down the bridge
  start_gaze(match, h) {
    h.side = Math.random() < 0.5 ? -1 : 1;
    h.title = 'GARGOYLE GAZE - JUMP!';
  }
  gargoyleHead(g, x, y, dir, glow) {
    const S = MPAL;
    g.fillStyle(S.outline, 1); g.fillRect(x - 15, y - 14, 30, 30);
    g.fillStyle(S.stoneMid, 1); g.fillRect(x - 13, y - 12, 26, 26);
    g.fillStyle(S.stoneLight, 1); g.fillRect(x - 13, y - 12, 8, 26);
    g.fillStyle(S.stoneDark, 1); g.fillRect(x + dir * 2 - 9, y + 6, 18, 6);                  // jaw
    g.fillStyle(0xe6eaff, 1); for (let k = -2; k <= 2; k++) g.fillRect(x + dir * 2 + k * 4 - 1, y + 6, 2, 3);   // fangs
    this.horn(g, x - 9, y - 12, -1, 16, 1.6, 5); this.horn(g, x + 9, y - 12, 1, 16, 1.6, 5);
    g.fillStyle(S.eye, 0.25 * glow); g.fillCircle(x + dir * 4, y - 3, 10 + glow * 6);             // eye glow
    for (const ex of [-5, 5]) { g.fillStyle(S.outline, 1); g.fillRect(x + dir * 3 + ex - 3, y - 6, 6, 5); g.fillStyle(glow > 0.9 ? 0xffd0d0 : S.eye, 0.4 + 0.6 * glow); g.fillRect(x + dir * 3 + ex - 2, y - 5, 4, 3); }
  }
  step_gaze(match, h, out) {
    const g = this.hzG, S = MPAL, hx = h.side * 274, dir = -h.side, beamY = -9;
    const rise = h.t < 30 ? h.t / 30 : h.t > 160 ? Math.max(0, 1 - (h.t - 160) / 24) : 1;
    const hy = Math.round(30 - rise * 48);
    if (h.t === 2) sfx('rumble', 0.6, 0.7);
    const glow = Math.min(1, h.t / 88);
    this.gargoyleHead(g, hx, hy, dir, h.t < 140 ? glow : 1 - (h.t - 140) / 20);
    if (h.t > 60 && h.t < 90) for (let i = 0; i < 3; i++) {       // light gathering in its eyes
      const a = h.t * 0.4 + i * 2.1, d = 20 - (h.t - 60) * 0.6;
      g.fillStyle(S.eye, 1); g.fillRect(Math.round(hx + dir * 4 + Math.cos(a) * d), Math.round(hy - 3 + Math.sin(a) * d), 2, 2);
    }
    if (h.t === 90) { sfx('laser', 0.9); match.shake(5, 50); }
    if (h.t >= 90 && h.t < 140) {                               // the beam: shoots out fast, then holds
      const bt = h.t - 90, len = Math.min(640, bt * 26), x0 = hx + dir * 8, x1 = x0 + dir * len;
      const fade = bt > 42 ? (50 - bt) / 8 : 1, wob = (bt % 4 < 2 ? 1 : 0);
      const lo = Math.min(x0, x1), w = Math.abs(x1 - x0);
      g.fillStyle(S.eye, 0.35 * fade); g.fillRect(lo, beamY - 7 - wob, w, 14 + wob * 2);
      g.fillStyle(S.eye, fade); g.fillRect(lo, beamY - 4, w, 8);
      g.fillStyle(0xffd0d0, fade); g.fillRect(lo, beamY - 1, w, 2);
      for (let k = 0; k < 8; k++) { const sx = x0 + dir * ((bt * 9 + k * 83) % Math.max(1, len)); g.fillStyle(0xffffff, fade); g.fillRect(Math.round(sx), beamY - 5 + (k % 3) * 4, 3, 1); }
      if (bt % 3 === 0) match.puff(x1, beamY, S.eye, 2);                          // scorching the stones where it ends
      if (bt % 12 === 0 && bt) sfx('laser', 0.35, 0.7);
      if (bt < 46) out.push({ x1: lo, x2: lo + w, y1: beamY - 6, y2: beamY + 6, dmg: 10, angle: 72, base: 4.6, growth: 4.4, dirX: dir, id: 'gaze' + h.id, hazard: true });
    }
    return h.t > 186;
  }

  // ---- BAT SWARM: bats pour across the sky above the bridge in a wave
  start_bats(match, h) {
    h.side = Math.random() < 0.5 ? -1 : 1;
    h.title = 'BAT SWARM - STAY LOW!';
    h.bats = [];
    for (let i = 0; i < 12; i++) h.bats.push({ x: h.side * (360 + i * 30 + Math.random() * 20), y: -80 - Math.random() * 80, ph: Math.random() * 6, sp: 3 + Math.random() * 0.8, id: i, hit: true });
  }
  bat(g, x, y, flap) {                                          // a chunky bat, rimmed in moonlight so it reads on the night sky
    const S = MPAL, up = flap ? -6 : 3;
    const wing = (c, o) => {
      g.fillStyle(c, 1);
      g.fillRect(x - 4 - o, y - 4 - o, 9 + o * 2, 9 + o * 2);                                  // body
      g.fillRect(x - 15 - o, y + up - o, 11 + o, 4 + o * 2); g.fillRect(x - 9 - o, y + up / 2 - o, 5 + o, 4 + o * 2);   // wings
      g.fillRect(x + 5, y + up - o, 11 + o, 4 + o * 2); g.fillRect(x + 5, y + up / 2 - o, 5 + o, 4 + o * 2);
      g.fillRect(x - 4 - o, y - 8 - o, 2 + o * 2, 4 + o); g.fillRect(x + 3 - o, y - 8 - o, 2 + o * 2, 4 + o);   // ears
    };
    wing(S.streak, 1); wing(S.outline, 0);
    g.fillStyle(S.eye, 1); g.fillRect(x - 2, y - 2, 2, 2); g.fillRect(x + 1, y - 2, 2, 2);
  }
  step_bats(match, h, out) {
    const g = this.hzG, dir = -h.side;
    if (h.t < 90) {                                              // a few scouts flit about the far edge
      if (h.t % 30 === 5) sfx('bats', 0.4);
      for (let i = 0; i < 4; i++) { const a = h.t * 0.12 + i * 1.6; this.bat(g, Math.round(h.side * 262 + Math.cos(a) * 26), Math.round(-120 + Math.sin(a * 1.3) * 22), (h.t >> 2) % 2 === i % 2); }
      return false;
    }
    if (h.t % 18 === 0) sfx('bats', 0.5, 0.9 + Math.random() * 0.3);
    let left = 0;
    for (const b of h.bats) {
      b.x += dir * b.sp;
      const y = Math.round(b.y + Math.sin(h.t * 0.12 + b.ph) * 18), x = Math.round(b.x);
      if (dir * b.x > 420) continue;                             // flown off the far side
      left++;
      this.bat(g, x, y, ((h.t >> 2) + b.id) % 2 === 0);
      out.push({ x1: x - 12, x2: x + 12, y1: y - 7, y2: y + 7, dmg: 3, angle: 65, base: 3, growth: 2.2, dirX: dir, id: 'bat' + h.id + ':' + b.id, hazard: true });
    }
    return left === 0;
  }
}

// Miniature of Gravemoon Bridge drawn into a box (x, y, w, h), for the stage select screen.
export function drawMoonPreview(g, x, y, w, h) {
  const S = MPAL, u = w / 100, v = h / 100;
  const bh = Math.ceil(h / S.sky.length);
  S.sky.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(x, y + i * bh, w, Math.min(bh, h - i * bh)); });
  // moon
  g.fillStyle(S.halo, 0.25); g.fillCircle(x + 50 * u, y + 26 * v, 17 * v);
  g.fillStyle(S.moon, 1); g.fillCircle(x + 50 * u, y + 26 * v, 13 * v);
  g.fillStyle(S.crater, 1); g.fillRect(x + 46 * u, y + 20 * v, 3 * u, 3 * v); g.fillRect(x + 52 * u, y + 28 * v, 4 * u, 3 * v);
  // mountains and spires
  const cl = (n) => Math.max(0, Math.min(100, n));
  for (let i = 0; i < 12; i++) { const cx = 4 + i * 8.4, hh = 12 + (i * 7) % 14; g.fillStyle(S.mtnFar, 1); g.fillTriangle(x + cl(cx - 8) * u, y + 62 * v, x + cx * u, y + (62 - hh) * v, x + cl(cx + 9) * u, y + 62 * v); }
  for (const [sx, sh] of [[10, 24], [14, 18], [18, 28]]) { g.fillStyle(S.mtnNear, 1); g.fillRect(x + sx * u, y + (62 - sh) * v, 1.6 * u, sh * v); }
  g.fillStyle(S.mtnNear, 1); g.fillPoints([[72, 62], [84, 36], [92, 36], [100, 48], [100, 62]].map(([px, py]) => ({ x: x + px * u, y: y + py * v })), true);
  g.fillStyle(S.lava, 0.3); g.fillCircle(x + 88 * u, y + 35 * v, 6 * v); g.fillStyle(S.lava, 1); g.fillRect(x + 84.5 * u, y + 35 * v, 7 * u, 1.6 * v);
  g.fillStyle(S.mtnNear, 1); g.fillRect(x, y + 62 * v, w, 38 * v);
  // bridge deck, pillars and mist
  g.fillStyle(S.stoneDark, 1); for (const px of [16, 50, 84]) g.fillRect(x + (px - 3) * u, y + 74 * v, 6 * u, 26 * v);
  g.fillStyle(S.stone, 1); g.fillRect(x + 6 * u, y + 70 * v, 88 * u, 4 * v);
  g.fillStyle(S.stoneLight, 1); g.fillRect(x + 6 * u, y + 70 * v, 88 * u, 1 * v);
  g.fillStyle(S.iron, 1); g.fillRect(x + 22 * u, y + 56 * v, 12 * u, 2 * v); g.fillRect(x + 66 * u, y + 56 * v, 12 * u, 2 * v); g.fillRect(x + 43 * u, y + 40 * v, 14 * u, 2 * v);
  g.fillStyle(S.glass, 1); g.fillRect(x + 49 * u, y + 46 * v, 2 * u, 4 * v);
  g.fillStyle(S.fog, 0.35); g.fillRect(x, y + 84 * v, w, 16 * v);
}

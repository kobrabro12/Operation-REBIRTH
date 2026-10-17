// "Verdant Spires": a jungle island floating high above the sea, crowned with tall rock spires.
// A rock shelf on the left (with a waterfall), a ruined stone temple on the right whose roof is a
// platform, and a crag jutting from the great central peak up top. All art is drawn in code.
// Plays its own music ("Overgrown", tools/audio/spires_music.py).
//
// Stage hazards, one at a time every 10-14 s, each announced with a CAUTION banner first:
//   GEYSERS         - the ground bubbles in two or three spots, then columns of water blast
//                     straight up from them, launching anyone standing there.
//   ROLLING BOULDER - the central peak rumbles and sheds a boulder that rolls in from one edge and
//                     bounces all the way across the island. Jump it, or wait it out on a ledge.
import { sfx } from '../audio/sfx.js';
import { HazardCycle } from './hazardCycle.js';

export const SPAL = {
  skyTop: 0x7fb0dc, skyLow: 0xd4e8f4,
  sea: 0x2f86b8, seaDark: 0x1f6698, seaLight: 0x5fb4dc, foam: 0xe4f6fb,
  rockLight: 0xe0a070, rock: 0xc07848, rockMid: 0x9a5a34, rockDark: 0x6c3a22, rockShade: 0x4a2418,
  jungle: 0x3fae3f, jungleDark: 0x237a34, jungleDeep: 0x165a2a, jungleLight: 0x7cd84c, leaf: 0xb4ee6a,
  water: 0x4ad8e0, waterLight: 0xb0f4f4, waterDark: 0x2a98c8,
  ruin: 0xe8d8b0, ruinMid: 0xc4ac80, ruinDark: 0x8a7656,
  wood: 0x8a5a2c, woodLight: 0xb47a3c,
  outline: 0x2a1410, haze: 0xa8c8e4, hazeDark: 0x8cb2d6,
};

// rock colours for spires: near (full colour) and far (faded into the sky haze)
const ROCK = { outline: SPAL.outline, rock: SPAL.rock, light: SPAL.rockLight, mid: SPAL.rockMid, dark: SPAL.rockDark, shade: SPAL.rockShade };
const ROCK_FAR = { outline: 0x8a98b4, rock: 0xc0aaa4, light: 0xd4c2b8, mid: 0xae9a9a, dark: 0x9c8e96, shade: 0x8e8290 };

export class SpireStage {
  constructor(scene) {
    this.scene = scene;
    this.platforms = [
      { x1: -290, x2: 290, y: 0, solid: true, bottom: 64 },
      { x1: -244, x2: -136, y: -84, solid: false },     // rock shelf
      { x1: 116, x2: 236, y: -104, solid: false },      // temple roof
      { x1: -58, x2: 50, y: -186, solid: false },       // crag on the central peak
    ];
    this.spawns = [{ x: -150, y: 0 }, { x: 150, y: 0 }, { x: -50, y: 0 }, { x: 50, y: 0 }];
    this.hazardsOn = true;
    this.t = 0;
    this.music = 'bgm_spires';
    this.cycle = new HazardCycle(this, ['geyser', 'boulder'], { color: '#b4ee6a', stroke: '#16200c' });
  }

  // ---------------------------------------------------------------- drawing helpers
  // a tapering rock spire: stepped rows, lit on the left, shaded on the right, outlined
  spire(g, cx, baseY, w, h, seed = 0, P = ROCK) {
    const rows = Math.ceil(h / 4);
    for (let r = 0; r < rows; r++) {
      const k = r / rows;                                   // 0 at the base, 1 at the tip
      const half = Math.max(2, Math.round((w / 2) * (1 - k * k * 0.85) - k * 3)) + (((r + seed) % 5 === 0) ? 2 : 0);
      const lean = Math.round(Math.sin(seed + k * 2.2) * 3 * k);
      const y = baseY - (r + 1) * 4, x = cx + lean;
      g.fillStyle(P.outline, 1); g.fillRect(x - half - 2, y, half * 2 + 4, 4);
      g.fillStyle(P.rock, 1); g.fillRect(x - half, y, half * 2, 4);
      g.fillStyle(P.light, 1); g.fillRect(x - half, y, Math.max(2, Math.round(half * 0.45)), 4);
      g.fillStyle(P.mid, 1); g.fillRect(x + Math.round(half * 0.25), y, Math.round(half * 0.45), 4);
      g.fillStyle(P.dark, 1); g.fillRect(x + Math.round(half * 0.7), y, half - Math.round(half * 0.7), 4);
      if ((r + seed) % 7 === 3) { g.fillStyle(P.shade, 1); g.fillRect(x - Math.round(half * 0.2), y + 1, Math.round(half * 0.5), 2); }   // cracks
    }
  }
  // a clump of jungle canopy made of stepped blobs
  bush(g, x, y, w, seed = 0) {
    const n = Math.max(2, Math.round(w / 14));
    for (let i = 0; i < n; i++) {
      const bx = x + (i * w) / n, r = 7 + ((i * 7 + seed) % 5);
      const by = y - ((i + seed) % 3) * 3;
      g.fillStyle(SPAL.outline, 1); g.fillRect(bx - r - 1, by - r + 2, r * 2 + 2, r + 3);
      g.fillStyle(SPAL.jungleDark, 1); g.fillRect(bx - r, by - r + 3, r * 2, r + 2);
      g.fillStyle(SPAL.jungle, 1); g.fillRect(bx - r + 2, by - r + 1, r * 2 - 4, r);
      g.fillStyle(SPAL.jungleLight, 1); g.fillRect(bx - r + 3, by - r + 1, r - 2, 3);
      g.fillStyle(SPAL.leaf, 1); g.fillRect(bx - r + 4, by - r, 3, 2);
    }
  }
  // stepped rock with a grass cap (used for the shelf and crag)
  grassCap(g, x1, x2, y) {
    g.fillStyle(SPAL.outline, 1); g.fillRect(x1 - 2, y - 2, x2 - x1 + 4, 9);
    g.fillStyle(SPAL.jungle, 1); g.fillRect(x1, y, x2 - x1, 6);
    g.fillStyle(SPAL.jungleLight, 1); g.fillRect(x1, y, x2 - x1, 2);
    g.fillStyle(SPAL.jungleDark, 1);
    for (let k = x1; k < x2; k += 5) g.fillRect(k, y + 5, 3, 2 + (k % 3));
  }
  // a hanging rock column under the island (the image's upside-down spires)
  stalactite(g, cx, topY, w, h, seed) {
    const rows = Math.ceil(h / 4);
    for (let r = 0; r < rows; r++) {
      const k = r / rows;
      const half = Math.max(1, Math.round((w / 2) * (1 - k * 0.8)));
      const y = topY + r * 4;
      g.fillStyle(SPAL.outline, 1); g.fillRect(cx - half - 2, y, half * 2 + 4, 4);
      g.fillStyle(r < 3 ? SPAL.rockMid : SPAL.rockDark, 1); g.fillRect(cx - half, y, half * 2, 4);
      g.fillStyle(SPAL.rock, 1); g.fillRect(cx - half, y, Math.max(1, Math.round(half * 0.5)), 4);
      g.fillStyle(SPAL.rockShade, 1); g.fillRect(cx + Math.round(half * 0.5), y, half - Math.round(half * 0.5), 4);
    }
  }

  // ---------------------------------------------------------------- drawing
  draw(worldLayer, bgLayer) {
    const s = this.scene;
    // sky: soft hazy bands, lighter toward the horizon
    const sky = s.add.graphics().setScrollFactor(0);
    const bands = [0x6fa4d6, SPAL.skyTop, 0x8cb9e0, 0x98c2e4, 0xa4cae8, 0xb0d2ec, 0xbcdaef, 0xc8e1f2, SPAL.skyLow];
    bands.forEach((c, i) => { sky.fillStyle(c, 1); sky.fillRect(-400, -60 + i * 36, 1440, 37); });
    sky.fillStyle(SPAL.skyLow, 1); sky.fillRect(-400, -60 + bands.length * 36, 1440, 500);
    bgLayer.push(sky);

    // the sea far below, with drifting glints (redrawn each frame)
    this.seaG = s.add.graphics().setScrollFactor(0.1);
    bgLayer.push(this.seaG);

    // far haze islands with tiny spires
    const far = s.add.graphics().setScrollFactor(0.25);
    const farIsle = (x, y, w, c1, c2) => {
      far.fillStyle(c1, 1); far.fillRect(x, y, w, 5);
      for (let r = 0; r < 4; r++) { far.fillStyle(c2, 1); far.fillRect(x + r * 5 + 2, y + 5 + r * 4, w - r * 10 - 4, 4); }
      for (let k = 0; k < 3; k++) { const sx = x + 8 + k * (w / 3); far.fillStyle(c1, 1); far.fillRect(sx, y - 8 - (k % 2) * 6, 5, 8 + (k % 2) * 6); far.fillRect(sx + 1, y - 12 - (k % 2) * 6, 3, 4); }
    };
    farIsle(-30, 180, 70, SPAL.haze, SPAL.hazeDark); farIsle(470, 150, 90, SPAL.haze, SPAL.hazeDark); farIsle(250, 225, 46, SPAL.haze, SPAL.hazeDark);
    bgLayer.push(far);

    // big background spires behind the island (parallax)
    const back = s.add.graphics().setScrollFactor(0.55);
    this.spire(back, 120, 320, 70, 230, 3, ROCK_FAR); this.spire(back, 210, 320, 56, 180, 1, ROCK_FAR);
    this.spire(back, 470, 320, 64, 210, 5, ROCK_FAR); this.spire(back, 545, 320, 46, 150, 2, ROCK_FAR);
    bgLayer.push(back);

    // ---- the island itself (world layer, behind the fighters)
    const g = s.add.graphics();
    const P = this.platforms[0];

    // central great peak (behind everything on the island)
    this.spire(g, -6, 2, 150, 330, 4);
    this.spire(g, -70, 2, 70, 150, 6); this.spire(g, 64, 2, 64, 190, 1);
    // spires near the ends
    this.spire(g, 252, 2, 40, 120, 2); this.spire(g, -270, 2, 30, 70, 5);
    // left rock shelf: a squat spire whose flattened top is platform 1
    const L = this.platforms[1];
    for (let y = L.y; y < 2; y += 4) {
      const k = (y - L.y) / (2 - L.y);
      const x1 = L.x1 + 6 - Math.round(k * 10), x2 = L.x2 - 6 + Math.round(k * 12);
      g.fillStyle(SPAL.outline, 1); g.fillRect(x1 - 2, y, x2 - x1 + 4, 4);
      g.fillStyle(SPAL.rockMid, 1); g.fillRect(x1, y, x2 - x1, 4);
      g.fillStyle(SPAL.rockLight, 1); g.fillRect(x1, y, 12, 4);
      g.fillStyle(SPAL.rock, 1); g.fillRect(x1 + 12, y, Math.round((x2 - x1) * 0.35), 4);
      g.fillStyle(SPAL.rockDark, 1); g.fillRect(x2 - 14, y, 14, 4);
    }
    this.grassCap(g, L.x1, L.x2, L.y);
    this.bush(g, L.x1 + 8, L.y - 2, 30, 2);
    // the crag platform: a ledge jutting out of the central peak
    const C = this.platforms[3];
    for (let r = 0; r < 5; r++) {
      const y = C.y + r * 4, inset = r * r * 2;
      g.fillStyle(SPAL.outline, 1); g.fillRect(C.x1 + inset - 2, y, C.x2 - C.x1 - inset * 2 + 4, 4);
      g.fillStyle(r < 2 ? SPAL.rock : SPAL.rockDark, 1); g.fillRect(C.x1 + inset, y, C.x2 - C.x1 - inset * 2, 4);
    }
    this.grassCap(g, C.x1, C.x2, C.y);

    // ruined temple on the right: its roof slab is platform 2
    const T = this.platforms[2];
    for (const cx of [T.x1 + 14, T.x1 + 50, T.x2 - 50, T.x2 - 14]) {
      const broken = cx === T.x2 - 50;
      const top = broken ? T.y + 40 : T.y + 8;
      g.fillStyle(SPAL.outline, 1); g.fillRect(cx - 7, top, 14, 2 - top);
      g.fillStyle(SPAL.ruin, 1); g.fillRect(cx - 6, top, 12, -top);
      g.fillStyle(SPAL.ruinMid, 1); g.fillRect(cx + 1, top, 4, -top);
      g.fillStyle(SPAL.ruinDark, 1); g.fillRect(cx + 4, top, 2, -top);
      for (let y = top + 8; y < 0; y += 14) { g.fillStyle(SPAL.ruinDark, 1); g.fillRect(cx - 6, y, 12, 1); }
      if (broken) { g.fillStyle(SPAL.ruinMid, 1); g.fillRect(cx - 5, top - 4, 5, 4); g.fillRect(cx + 1, top - 2, 4, 2); }
    }
    // roof slab + vines hanging off it
    g.fillStyle(SPAL.outline, 1); g.fillRect(T.x1 - 2, T.y - 2, T.x2 - T.x1 + 4, 12);
    g.fillStyle(SPAL.ruin, 1); g.fillRect(T.x1, T.y, T.x2 - T.x1, 8);
    g.fillStyle(0xf6ecd0, 1); g.fillRect(T.x1, T.y, T.x2 - T.x1, 2);
    g.fillStyle(SPAL.ruinMid, 1); for (let k = T.x1 + 6; k < T.x2; k += 16) g.fillRect(k, T.y + 3, 8, 3);
    g.fillStyle(SPAL.jungleDark, 1);
    for (let k = T.x1 + 4; k < T.x2 - 4; k += 11) g.fillRect(k, T.y + 8, 2, 6 + (k * 7) % 14);
    this.bush(g, T.x2 - 22, T.y - 1, 22, 4);

    // underside: stepped rock taper with hanging spires
    for (let row = 0; row < 12; row++) {
      const inset = Math.floor(row * row * 1.1) + row * 7;
      const y = 10 + row * 8, x1 = P.x1 + inset, x2 = P.x2 - inset;
      if (x2 - x1 < 20) break;
      g.fillStyle(row < 2 ? SPAL.rock : row < 6 ? SPAL.rockMid : SPAL.rockDark, 1); g.fillRect(x1, y, x2 - x1, 8);
      g.fillStyle(SPAL.outline, 1); g.fillRect(x1 - 2, y, 2, 8); g.fillRect(x2, y, 2, 8);
      g.fillStyle(row < 2 ? SPAL.rockLight : SPAL.rock, 1);
      for (let k = x1 + 5 + (row * 11) % 13; k < x2 - 6; k += 19 + (row % 3) * 6) g.fillRect(k, y + 2, 4, 3);
    }
    const hang = [[-250, 40, 70], [-205, 26, 120], [-160, 34, 92], [-110, 22, 150], [-66, 30, 110], [-20, 38, 170], [26, 24, 130], [70, 32, 100], [118, 22, 140], [162, 30, 86], [208, 24, 112], [250, 30, 64]];
    hang.forEach(([x, w, h], i) => {
      const depth = Math.floor(Math.max(0, 20 - Math.abs(x) / 16));            // deeper columns near the middle
      this.stalactite(g, x, 8 + Math.max(0, Math.floor(((Math.abs(x) - 120) / 22) * 8) * (Math.abs(x) > 120 ? 1 : 0)), w, h + depth * 2, i);
    });

    // grass and jungle on top
    g.fillStyle(SPAL.outline, 1); g.fillRect(P.x1 - 2, -2, P.x2 - P.x1 + 4, 14);
    g.fillStyle(SPAL.jungle, 1); g.fillRect(P.x1, 0, P.x2 - P.x1, 10);
    g.fillStyle(SPAL.jungleLight, 1); g.fillRect(P.x1, 0, P.x2 - P.x1, 3);
    g.fillStyle(SPAL.jungleDark, 1);
    for (let k = P.x1; k < P.x2; k += 5) g.fillRect(k, 8 + (k % 3), 3, 4);
    // canopy clumps along the back edge of the ground (low, so they never hide fighters' feet)
    this.bush(g, -104, -1, 40, 1); this.bush(g, 60, -1, 46, 3); this.bush(g, -10, -1, 26, 5); this.bush(g, 230, -1, 30, 0); this.bush(g, -284, -1, 26, 2);
    worldLayer.push(g);

    // animated water (waterfalls + the shelf's pool), redrawn each frame
    this.waterG = s.add.graphics();
    this.hzG = s.add.graphics();                                   // geysers and boulders
    worldLayer.push(this.waterG, this.hzG);
    this.cycle.makeBanner(s);
  }

  // one waterfall: a column of falling stripes from (x, y1) to y2
  waterfall(g, x, y1, y2, w) {
    const t = this.t;
    g.fillStyle(SPAL.outline, 1); g.fillRect(x - 1, y1, w + 2, y2 - y1);
    g.fillStyle(SPAL.waterDark, 1); g.fillRect(x, y1, w, y2 - y1);
    for (let y = y1 + ((t * 3) % 12) - 12; y < y2; y += 12) {
      const a = Math.max(y, y1), b = Math.min(y + 7, y2);
      if (b <= a) continue;
      g.fillStyle(SPAL.water, 1); g.fillRect(x + 1, a, w - 2, b - a);
      g.fillStyle(SPAL.waterLight, 1); g.fillRect(x + 1 + ((y / 12) % 2 ? 0 : w - 4), a, 2, b - a);
    }
  }

  // ---------------------------------------------------------------- per frame
  step(match) {
    this.t++;
    const t = this.t;
    // sea: horizon line, bands and glints sliding sideways
    const sg = this.seaG; sg.clear();
    const top = 312;
    sg.fillStyle(SPAL.seaLight, 1); sg.fillRect(-400, top, 1440, 4);
    sg.fillStyle(SPAL.sea, 1); sg.fillRect(-400, top + 4, 1440, 30);
    sg.fillStyle(SPAL.seaDark, 1); sg.fillRect(-400, top + 34, 1440, 300);
    for (let k = 0; k < 26; k++) {
      const x = ((k * 97 + t * (0.2 + (k % 3) * 0.12)) % 1240) - 300, y = top + 6 + (k * 13) % 40;
      sg.fillStyle(k % 4 ? SPAL.seaLight : SPAL.foam, 1); sg.fillRect(Math.round(x), y, 6 + (k % 3) * 4, 1);
    }
    // waterfalls: one down the shelf into a pool, one pouring off the island's right edge into the sky
    const wg = this.waterG; wg.clear();
    const L = this.platforms[1];
    this.waterfall(wg, L.x2 - 26, L.y + 6, -2, 10);
    wg.fillStyle(SPAL.outline, 1); wg.fillRect(L.x2 - 40, -4, 38, 4);
    wg.fillStyle(SPAL.water, 1); wg.fillRect(L.x2 - 38, -3, 34, 3);
    wg.fillStyle(SPAL.foam, 1); wg.fillRect(L.x2 - 30 + (t >> 3) % 6, -4, 6, 1); wg.fillRect(L.x2 - 22 - (t >> 2) % 4, -5, 3, 1);
    this.waterfall(wg, 272, 4, 230, 12);
    // spray where it leaves the edge
    for (let k = 0; k < 4; k++) { const p = (t + k * 9) % 36; wg.fillStyle(SPAL.foam, 1); wg.fillRect(270 + (k % 2 ? 14 : -4) + (p >> 3), 230 + p, 2, 2); }
    // a water glint on the shelf's top edge
    if (t % 90 < 6) { wg.fillStyle(0xffffff, 1); wg.fillRect(L.x2 - 25, L.y + 5, 8, 2); }
    this.hzG.clear();
    return this.cycle.run(match, []);
  }

  // ---------------------------------------------------------------- hazards
  // ---- GEYSERS: bubbling warning spots, then tall water columns that launch upward
  start_geyser(match, h) {
    h.title = 'GEYSERS - MOVE!';
    const n = Math.random() < 0.5 ? 2 : 3, xs = [];
    while (xs.length < n) { const x = Math.round(-250 + Math.random() * 500); if (xs.every((o) => Math.abs(o - x) > 110)) xs.push(x); }
    h.spots = xs.map((x, i) => ({ x, delay: i * 14 }));
  }
  step_geyser(match, h, out) {
    const g = this.hzG, P = SPAL;
    let busy = false;
    for (const s of h.spots) {
      const lt = h.t - s.delay;
      if (lt < 0) { busy = true; continue; }
      if (lt < 90) {                                            // the ground cracks and bubbles
        busy = true;
        const k = lt / 90, w = 10 + k * 12;
        g.fillStyle(P.outline, 1); g.fillRect(s.x - w / 2 - 1, -2, w + 2, 4);
        g.fillStyle(P.waterDark, 1); g.fillRect(s.x - w / 2, -1, w, 2);
        for (let i = 0; i < 4; i++) {                             // droplets hopping up
          const ph = (lt * (1 + k) + i * 9) % 18, bx = s.x - w / 2 + ((i * 7 + lt) % Math.max(1, w));
          g.fillStyle(i % 2 ? P.water : P.waterLight, 1); g.fillRect(Math.round(bx), Math.round(-2 - ph * (1 - ph / 18) * (1 + k * 2)), 2, 2);
        }
        if (lt % 20 === 0) sfx('item', 0.2, 0.5 + k);
        if (lt === 89) { sfx('geyser', 0.9); match.shake(4, 10); }
        continue;
      }
      const et = lt - 90;
      if (et > 70) continue;
      busy = true;
      const H = et < 8 ? et * 22 : et < 50 ? 176 + Math.sin(et * 0.5) * 6 : 176 * (1 - (et - 50) / 20);   // shoot up, hold, collapse
      const half = 11 + Math.sin(et * 0.8) * 2;
      g.fillStyle(P.outline, 1); g.fillRect(s.x - half - 1, -H - 1, half * 2 + 2, H + 1);
      g.fillStyle(P.waterDark, 1); g.fillRect(s.x - half, -H, half * 2, H);
      for (let y = -H + ((et * 6) % 14); y < 0; y += 14) { g.fillStyle(P.water, 1); g.fillRect(s.x - half + 2, y, half * 2 - 4, 8); }   // water rushing up
      g.fillStyle(P.waterLight, 1); g.fillRect(s.x - half + 3, -H, 2, H);
      g.fillStyle(P.foam, 1);                                      // foaming crown and spray
      for (let i = 0; i < 6; i++) { const a = et * 0.3 + i; g.fillRect(Math.round(s.x + Math.cos(a) * (half + 4)), Math.round(-H - 3 + Math.sin(a * 1.7) * 4), 3, 3); }
      g.fillRect(s.x - half - 3, -5, half * 2 + 6, 4);
      if (et % 4 === 0) match.puff(s.x + (Math.random() - 0.5) * 30, -H, P.waterLight, 2);
      if (et >= 2 && et < 50) out.push({ x1: s.x - half, x2: s.x + half, y1: -H, y2: 2, dmg: 9, angle: 88, base: 5.2, growth: 4.6, id: 'geyser' + h.id + ':' + s.x, hazard: true });
    }
    return !busy;
  }

  // ---- ROLLING BOULDER: rumbles loose from the peak and bounces across the island
  start_boulder(match, h) {
    h.side = Math.random() < 0.5 ? -1 : 1;                       // the edge it comes in from
    h.title = 'ROLLING BOULDER - JUMP!';
    h.x = h.side * 330; h.y = -18; h.vy = 0; h.rot = 0;
  }
  step_boulder(match, h, out) {
    const g = this.hzG, P = SPAL, R = 17;
    if (h.t < 90) {                                              // rumbling: pebbles rain at that edge
      if (h.t % 20 === 1) { sfx('rumble', 0.6); match.shake(2, 12); }
      for (let i = 0; i < 5; i++) {
        const py = ((h.t * 3 + i * 31) % 120) - 140, px = h.side * (250 + ((i * 13) % 30));
        g.fillStyle(P.rockMid, 1); g.fillRect(px, py, 3, 3);
      }
      g.fillStyle(P.outline, 0.4); g.fillRect(h.side * 280 - 20, -2, 40, 2);      // its shadow growing
      return false;
    }
    h.x += -h.side * 4.4; h.rot += -h.side * 4.4 / R;
    h.vy += 0.5; h.y += h.vy;
    const over = Math.abs(h.x) < 296 || Math.sign(h.x) === h.side;   // over the island (or still coming in): off the far edge it just falls
    if (over && h.y >= -R) {                                     // bounce along the ground
      h.y = -R;
      if (Math.abs(h.x) < 296) { h.vy = h.t % 60 < 30 ? -4.2 : -2.6; match.shake(3, 6); sfx('rumble', 0.4, 1.3); match.puff(h.x, -2, P.rockLight, 5); }
      else h.vy = 0;
    }
    const x = Math.round(h.x), y = Math.round(h.y);
    g.fillStyle(P.outline, 0.35); g.fillEllipse(x, -1, R * 2, 4);
    g.fillStyle(P.outline, 1); g.fillCircle(x, y, R + 2);
    g.fillStyle(P.rockMid, 1); g.fillCircle(x, y, R);
    g.fillStyle(P.rock, 1); g.fillCircle(x - 3, y - 3, R - 4);
    g.fillStyle(P.rockLight, 1); g.fillCircle(x - 6, y - 7, 4);
    for (let k = 0; k < 3; k++) {                                // cracks and moss turning with it
      const a = h.rot + k * 2.1;
      g.fillStyle(k === 0 ? P.jungleDark : P.rockShade, 1); g.fillRect(Math.round(x + Math.cos(a) * 10) - 2, Math.round(y + Math.sin(a) * 10) - 2, 5, 4);
    }
    if (h.t % 3 === 0 && h.y >= -R - 1) match.puff(h.x + h.side * R, -3, P.rockLight, 1);
    out.push({ x1: x - R, x2: x + R, y1: y - R, y2: y + R, dmg: 13, angle: 40, base: 5.4, growth: 5.2, dirX: -h.side, id: 'boulder' + h.id, hazard: true });
    return Math.abs(h.x) > 360 || h.y > 300;
  }
}

// Miniature of Verdant Spires drawn into a box (x, y, w, h), for the stage select screen.
export function drawSpirePreview(g, x, y, w, h) {
  const bands = [0x6fa4d6, 0x7fb0dc, 0x98c2e4, 0xb0d2ec, 0xc8e1f2, 0xd4e8f4];
  g.fillStyle(0xd4e8f4, 1); g.fillRect(x, y, w, h);
  const bh = Math.ceil(h * 0.8 / bands.length);
  bands.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(x, y + i * bh, w, bh); });
  g.fillStyle(SPAL.seaLight, 1); g.fillRect(x, y + h * 0.8, w, Math.max(1, h * 0.025));
  g.fillStyle(SPAL.sea, 1); g.fillRect(x, y + h * 0.82, w, h * 0.09);
  g.fillStyle(SPAL.seaDark, 1); g.fillRect(x, y + h * 0.91, w, h * 0.09);
  const u = w / 100, v = h / 100;                       // 1% of the box width / height
  const top = y + h * 0.58, left = x + w * 0.12, right = x + w * 0.88;
  const spire = (cx, bw, sh) => {                        // bw in % of width, sh in % of height
    for (let r = 0; r < 8; r++) {
      const k = r / 8, half = (bw / 2) * (1 - k * 0.8);
      g.fillStyle(r % 2 ? SPAL.rock : SPAL.rockMid, 1);
      g.fillRect(x + (cx - half) * u, top - (r + 1) * (sh / 8) * v, half * 2 * u, (sh / 8) * v + 1);
    }
  };
  spire(50, 16, 50); spire(40, 8, 24); spire(60, 8, 30); spire(84, 5, 18); spire(16, 4, 12);
  // underside with hanging columns
  for (let r = 0; r < 4; r++) { g.fillStyle(r < 2 ? SPAL.rockMid : SPAL.rockDark, 1); g.fillRect(left + r * 3 * u, top + 3 * v + r * 3 * v, right - left - r * 6 * u, 3 * v); }
  for (let k = 0; k < 9; k++) { const cx = left + (k + 0.5) * (right - left) / 9; g.fillStyle(SPAL.rockDark, 1); g.fillRect(cx - u, top + 12 * v, 2 * u, (5 + (k * 5) % 8) * v); }
  g.fillStyle(SPAL.jungle, 1); g.fillRect(left, top, right - left, 4 * v);
  g.fillStyle(SPAL.jungleLight, 1); g.fillRect(left, top, right - left, 1.2 * v);
  // platforms: shelf, temple roof, crag
  g.fillStyle(SPAL.rockMid, 1); g.fillRect(x + 17 * u, top - 18 * v, 17 * u, 18 * v);
  g.fillStyle(SPAL.jungle, 1); g.fillRect(x + 17 * u, top - 20 * v, 17 * u, 2.5 * v);
  g.fillStyle(SPAL.ruin, 1); g.fillRect(x + 64 * u, top - 22 * v, 20 * u, 3 * v); g.fillRect(x + 66 * u, top - 19 * v, 2 * u, 19 * v); g.fillRect(x + 80 * u, top - 19 * v, 2 * u, 19 * v);
  g.fillStyle(SPAL.jungle, 1); g.fillRect(x + 42 * u, top - 38 * v, 16 * u, 2.5 * v);
  // waterfalls
  g.fillStyle(SPAL.water, 1); g.fillRect(x + 29 * u, top - 17 * v, 1.6 * u, 17 * v); g.fillRect(x + 89 * u, top, 2 * u, h * 0.22);
}

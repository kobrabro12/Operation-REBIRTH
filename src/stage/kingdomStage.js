// "CARTRIDGE KINGDOM": an 8-bit overworld drawn ONLY in the NES's own colours (NES below - the console's 54-colour
// palette, the one in Mason's reference): 8x8 tiles drawn at 2x (`TILES`, baked once into textures and laid as tile
// sprites), a light-blue sky, snow-capped mountains, round green hills, a grey castle with a red flag, drifting
// clouds. A brick-and-grass island, two floating block ledges, a cloud on top. Plays "Press Start"
// (tools/audio/kingdom_music.py: two pulses, a triangle and noise, like the real thing).
// Hazards (HazardCycle, one at a time, CAUTION banner first):
//   BAD CARTRIDGE - a column of the screen flickers with garbage tiles, then corrupts: everything in it gets hurt.
//                   BLOW ON IT! (it aims near a fighter)
//   CANNON VOLLEY - a cannon rises at each end of the island and fires cannonballs across, low then high: jump or duck.
//   NIGHTFALL     - the palette swaps to night (black sky, stars, a dark castle with lit windows) and pixel bats
//                   swoop at whoever's closest, then morning comes back.
import { sfx } from '../audio/sfx.js';
import { HazardCycle } from './hazardCycle.js';

// the NES palette (2C02), by the PPU's own numbers
export const NES = [
  0x7c7c7c, 0x0000fc, 0x0000bc, 0x4428bc, 0x940084, 0xa80020, 0xa81000, 0x881400, 0x503000, 0x007800, 0x006800, 0x005800, 0x004058, 0x000000,
  0xbcbcbc, 0x0078f8, 0x0058f8, 0x6844fc, 0xd800cc, 0xe40058, 0xf83800, 0xe45c10, 0xac7c00, 0x00b800, 0x00a800, 0x00a844, 0x008888,
  0xf8f8f8, 0x3cbcfc, 0x6888fc, 0x9878f8, 0xf878f8, 0xf85898, 0xf87858, 0xfca044, 0xf8b800, 0xb8f818, 0x58d854, 0x58f898, 0x00e8d8, 0x787878,
  0xfcfcfc, 0xa4e4fc, 0xb8b8f8, 0xd8b8f8, 0xf8b8f8, 0xf8a4c0, 0xf0d0b0, 0xfce0a8, 0xf8d878, 0xd8f878, 0xb8f8b8, 0xb8f8d8, 0x00fcfc, 0xf8d8f8,
];
// the colours this stage uses (all from NES)
const C = {
  k: 0x000000, w: 0xfcfcfc, sky: 0x3cbcfc, skyN: 0x000000, cloud: 0xfcfcfc, cloudS: 0xa4e4fc,
  grass: 0x00a800, grassL: 0x58d854, grassD: 0x005800, dirt: 0xac7c00, dirtD: 0x503000, brick: 0xe45c10, brickL: 0xf0d0b0,
  block: 0xe45c10, blockL: 0xfca044, stone: 0xbcbcbc, stoneD: 0x7c7c7c, red: 0xf83800, mtn: 0x6888fc, mtnD: 0x0058f8,
  gold: 0xf8b800, purple: 0x940084, bat: 0x4428bc, batL: 0x9878f8, glitch: [0xd800cc, 0x00e8d8, 0xf83800, 0xb8f818, 0xf8b800, 0x0000fc, 0xfcfcfc, 0x000000],
};
// 8x8 tiles (one character a pixel, '.' = clear), drawn at 2x = 16x16
const TILES = {
  grass: { map: ['LLLLLLLL', 'LLgLLLgL', 'gggggggg', 'gDgggDgg', 'ddkdddkd', 'dddddddd', 'dkddddkd', 'dddddddd'], pal: { L: C.grassL, g: C.grass, D: C.grassD, d: C.dirt, k: C.dirtD } },
  dirt: { map: ['dddddddd', 'dkdddddd', 'ddddkddd', 'dddddddd', 'ddddddkd', 'dkdddddd', 'ddddkddd', 'dddddddd'], pal: { d: C.dirt, k: C.dirtD } },
  brick: { map: ['ccckcccc', 'oookoooo', 'oookoooo', 'kkkkkkkk', 'ccccccck', 'oooooook', 'oooooook', 'kkkkkkkk'], pal: { c: C.brickL, o: C.brick, k: C.k } },
  block: { map: ['hhhhhhhk', 'hmmmmmmk', 'hmhmmmmk', 'hmmmmmmk', 'hmmmmmmk', 'hmmmmhmk', 'hmmmmmmk', 'kkkkkkkk'], pal: { h: C.blockL, m: C.block, k: C.k } },
  stone: { map: ['ssssssss', 'sSssssss', 'ssssssss', 'kkkkkkkk', 'sssskSss', 'sssskSss', 'sssskSss', 'kkkkkkkk'], pal: { s: C.stone, S: C.w, k: C.stoneD } },
};
// cannonballs: [height above the floor, delay] for each side's shots
const VOLLEY = [[14, 0], [62, 46], [14, 92], [62, 138]];

/** Draws an 8x8 tile map at x, y with 2x pixels. */
function tile(g, t, x, y, s = 2) { t.map.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const c = t.pal[row[i]]; if (c !== undefined) { g.fillStyle(c, 1); g.fillRect(x + i * s, y + j * s, s, s); } } }); }

/** CARTRIDGE KINGDOM (see the top of the file). */
export class KingdomStage {
  constructor(scene) {
    this.scene = scene;
    this.platforms = [
      { x1: -272, x2: 272, y: 0, solid: true, bottom: 64 },
      { x1: -208, x2: -112, y: -96, solid: false },
      { x1: 112, x2: 208, y: -96, solid: false },
      { x1: -56, x2: 56, y: -184, solid: false },
    ];
    this.spawns = [{ x: -150, y: 0 }, { x: 150, y: 0 }, { x: -50, y: 0 }, { x: 50, y: 0 }];
    this.hazardsOn = true;
    this.music = 'bgm_kingdom';
    this.t = 0; this.night = 0; this.nightTo = 0;
    this.cycle = new HazardCycle(this, ['glitch', 'cannons', 'night'], { color: '#f8b800', stroke: '#000000', gap: 660 });
  }

  /** Bakes the tiles into 16x16 textures (once per game). */
  bakeTiles() {
    const s = this.scene;
    for (const [n, t] of Object.entries(TILES)) {
      const key = 'nes_tile_' + n; if (s.textures.exists(key)) continue;
      const g = s.make.graphics({ add: false }); tile(g, t, 0, 0); g.generateTexture(key, 16, 16); g.destroy();
    }
  }

  // ---------------------------------------------------------------- drawing
  /** Builds the stage's art once: the sky, mountains, castle, hills, clouds and the NES-tile platforms. */
  draw(worldLayer, bgLayer) {
    const s = this.scene; this.bakeTiles();
    this.skyG = s.add.graphics().setScrollFactor(0); bgLayer.push(this.skyG);
    this.starG = s.add.graphics().setScrollFactor(0); bgLayer.push(this.starG);
    // far mountains: stepped blue peaks with snow caps
    const m = s.add.graphics().setScrollFactor(0.15);
    for (const [x, w, h] of [[-120, 220, 120], [90, 260, 150], [330, 200, 110], [520, 260, 140], [760, 200, 120]]) {
      for (let r = 0; r < h; r += 4) { const half = (w / 2) * (r / h); m.fillStyle(r < h * 0.2 ? C.w : C.mtn, 1); m.fillRect(x - half, 250 - h + r, half * 2, 4); }
      for (let r = Math.floor(h * 0.2); r < h; r += 4) { const half = (w / 2) * (r / h); m.fillStyle(C.mtnD, 1); m.fillRect(x + half * 0.2, 250 - h + r, half * 0.8, 4); }
    }
    bgLayer.push(m);
    this.mtn = m;
    // the castle on a far hill
    const c = s.add.graphics().setScrollFactor(0.3); this.castle(c, 470, 238); bgLayer.push(c); this.castleG = c;
    this.flagG = s.add.graphics().setScrollFactor(0.3); bgLayer.push(this.flagG);
    this.winG = s.add.graphics().setScrollFactor(0.3); bgLayer.push(this.winG);
    // round green hills with darker outlines and dots
    const h = s.add.graphics().setScrollFactor(0.45);
    for (const [x, r] of [[-80, 110], [150, 80], [340, 130], [600, 100], [820, 120]]) {
      h.fillStyle(C.k, 1); h.fillEllipse(x, 330, r * 2 + 4, r * 1.6 + 4);
      h.fillStyle(C.grass, 1); h.fillEllipse(x, 330, r * 2, r * 1.6);
      h.fillStyle(C.grassL, 1); h.fillEllipse(x - r * 0.3, 330 - r * 0.5, r * 0.5, r * 0.25);
      h.fillStyle(C.grassD, 1); for (let i = 0; i < 6; i++) h.fillRect(x - r * 0.5 + i * r * 0.2, 330 - r * 0.3 + (i % 2) * 12, 4, 8);
    }
    bgLayer.push(h); this.hills = h;
    this.clouds = [];
    for (let i = 0; i < 6; i++) {
      const g = s.add.graphics(); this.cloud(g, 0, 0, 40 + (i % 3) * 16);
      g.x = -200 + i * 190; g.y = 30 + ((i * 71) % 120); g.setScrollFactor(0.25 + (i % 2) * 0.1); g.speed = 0.12 + (i % 3) * 0.05;
      this.clouds.push(g); bgLayer.push(g);
    }
    // the island: a grass row, brick and dirt under it, stepping in toward the bottom
    const P = this.platforms[0], W = P.x2 - P.x1;
    const top = s.add.tileSprite(P.x1, 0, W, 16, 'nes_tile_grass').setOrigin(0); worldLayer.push(top);
    for (let r = 1; r < 6; r++) {
      const inset = r < 3 ? 0 : (r - 2) * 32, ts = s.add.tileSprite(P.x1 + inset, r * 16, W - inset * 2, 16, r % 2 ? 'nes_tile_brick' : 'nes_tile_dirt').setOrigin(0);
      worldLayer.push(ts);
    }
    const edge = s.add.graphics(); edge.fillStyle(C.k, 1);
    for (let r = 0; r < 6; r++) { const inset = r < 3 ? 0 : (r - 2) * 32; edge.fillRect(P.x1 + inset - 2, r * 16, 2, 16); edge.fillRect(P.x2 - inset, r * 16, 2, 16); }
    edge.fillRect(P.x1 + 96 - 2, 96, W - 192 + 4, 2);
    // bushes and a pipe-free little scene on the grass: bushes and a signpost
    this.bush(edge, P.x1 + 40, 0); this.bush(edge, P.x2 - 70, 0);
    this.sign(edge, -120, 0);
    worldLayer.push(edge);
    // the two block ledges and the cloud
    for (const p of this.platforms.slice(1, 3)) worldLayer.push(s.add.tileSprite(p.x1, p.y, p.x2 - p.x1, 16, 'nes_tile_block').setOrigin(0));
    const top3 = this.platforms[3], cg = s.add.graphics(); this.cloud(cg, top3.x1, top3.y - 4, top3.x2 - top3.x1, true); worldLayer.push(cg);
    this.fxG = s.add.graphics(); worldLayer.push(this.fxG);
    this.cycle.makeBanner(s);
    this.paintSky();
  }
  /** The sky (day or night, by this.night). */
  paintSky() {
    const g = this.skyG; g.clear();
    g.fillStyle(this.night > 0.5 ? C.skyN : C.sky, 1); g.fillRect(-400, -200, 1440, 900);
    const nt = this.night > 0.5;
    this.mtn.setAlpha(nt ? 0.45 : 1); if (this.hills) this.hills.setAlpha(nt ? 0.55 : 1);
    for (const c of this.clouds || []) c.setAlpha(nt ? 0.3 : 1);
  }
  /** A cloud: puffs in white with a pale-blue underside and a black edge (ledge = the top platform). */
  cloud(g, x, y, w, ledge = false) {
    const puffs = Math.max(2, Math.round(w / 18));
    g.fillStyle(C.k, 1); for (let i = 0; i < puffs; i++) g.fillCircle(x + 9 + i * (w - 18) / (puffs - 1), y + 6 - (i % 2) * 4, 11);
    g.fillRect(x - 1, y + 4, w + 2, 12);
    g.fillStyle(C.cloud, 1); for (let i = 0; i < puffs; i++) g.fillCircle(x + 9 + i * (w - 18) / (puffs - 1), y + 6 - (i % 2) * 4, 9);
    g.fillRect(x + 1, y + 5, w - 2, 9);
    g.fillStyle(C.cloudS, 1); g.fillRect(x + 3, y + 11, w - 6, 3);
    if (ledge) { g.fillStyle(C.w, 1); g.fillRect(x + 4, y + 4, w - 8, 2); }
  }
  /** A bush: three green bumps. */
  bush(g, x, y) {
    for (const [dx, r] of [[0, 9], [12, 12], [24, 9]]) { g.fillStyle(C.k, 1); g.fillCircle(x + dx, y - 6, r + 1); }
    for (const [dx, r] of [[0, 9], [12, 12], [24, 9]]) { g.fillStyle(C.grassL, 1); g.fillCircle(x + dx, y - 6, r); g.fillStyle(C.grass, 1); g.fillCircle(x + dx + 2, y - 4, r - 3); }
    g.fillStyle(C.grassL, 1); g.fillRect(x - 10, y - 4, 44, 4);
  }
  /** A wooden signpost with an arrow. */
  sign(g, x, y) {
    g.fillStyle(C.k, 1); g.fillRect(x - 2, y - 30, 6, 30); g.fillRect(x - 14, y - 34, 30, 14);
    g.fillStyle(C.dirt, 1); g.fillRect(x, y - 30, 2, 30); g.fillRect(x - 12, y - 32, 26, 10);
    g.fillStyle(C.brickL, 1); g.fillRect(x - 8, y - 28, 14, 2); g.fillRect(x + 4, y - 30, 2, 6); g.fillRect(x + 6, y - 28, 2, 2);
  }
  /** The castle: stone blocks, battlements, a black arched door and windows. */
  castle(g, x, y) {
    const st = (cx, cy, w, h) => { g.fillStyle(C.k, 1); g.fillRect(cx - 2, cy - 2, w + 4, h + 4); for (let yy = 0; yy < h; yy += 8) for (let xx = 0; xx < w; xx += 16) { g.fillStyle(C.stone, 1); g.fillRect(cx + xx + ((yy / 8) % 2) * 8 - 8, cy + yy, 15, 7); } g.fillStyle(C.k, 1); g.fillRect(cx - 10, cy, 10, h); g.fillRect(cx + w, cy, 10, h); };
    st(x - 40, y - 70, 80, 70); st(x - 64, y - 104, 32, 104); st(x + 32, y - 104, 32, 104); st(x - 16, y - 124, 32, 54);
    g.fillStyle(C.stone, 1);
    for (const [bx, by, n] of [[x - 64, y - 112, 4], [x + 32, y - 112, 4], [x - 16, y - 132, 4]]) for (let i = 0; i < n; i += 2) { g.fillStyle(C.k, 1); g.fillRect(bx + i * 8 - 1, by - 1, 10, 10); g.fillStyle(C.stone, 1); g.fillRect(bx + i * 8, by, 8, 8); }
    g.fillStyle(C.k, 1); g.fillRect(x - 12, y - 28, 24, 28); g.fillCircle(x, y - 28, 12);
    this.windows = [[x - 52, y - 84], [x + 44, y - 84], [x - 4, y - 104], [x - 28, y - 52], [x + 20, y - 52]];
    for (const [wx, wy] of this.windows) g.fillRect(wx, wy, 8, 12);
    this.flagAt = [x, y - 132];
  }

  // ---------------------------------------------------------------- every frame
  /** Every frame: the flag, clouds and NIGHTFALL animate; returns the hazards' hitboxes (HazardCycle). */
  step(match) {
    this.t++;
    for (const c of this.clouds || []) { c.x += c.speed; if (c.x > 1000) c.x = -300; }
    // the flag waves (two frames, NES-style)
    const fg = this.flagG; fg.clear(); const [fx, fy] = this.flagAt;
    fg.fillStyle(C.k, 1); fg.fillRect(fx - 1, fy - 34, 3, 34);
    const fr = Math.floor(this.t / 16) % 2;
    fg.fillStyle(C.red, 1); fg.fillPoints(fr ? [{ x: fx + 2, y: fy - 34 }, { x: fx + 22, y: fy - 30 }, { x: fx + 2, y: fy - 22 }] : [{ x: fx + 2, y: fy - 34 }, { x: fx + 20, y: fy - 28 }, { x: fx + 2, y: fy - 24 }], true);
    // night: the palette swaps in steps (never a smooth fade - the NES couldn't)
    const n0 = this.night; this.night += Math.sign(this.nightTo - this.night) * 0.25; if (Math.abs(this.night - this.nightTo) < 0.25) this.night = this.nightTo;
    if (this.night !== n0) this.paintSky();
    const sg = this.starG; sg.clear(); const wg = this.winG; wg.clear();
    if (this.night > 0.5) {
      for (let i = 0; i < 40; i++) { if ((this.t >> 4) % 7 === i % 7) continue; sg.fillStyle(i % 5 ? C.w : C.gold, 1); sg.fillRect((i * 151) % 640, (i * 67) % 200, 2, 2); }
      sg.fillStyle(C.w, 1); sg.fillCircle(520, 60, 16); sg.fillStyle(C.skyN, 1); sg.fillCircle(528, 54, 14);   // a crescent moon
      for (const [wx, wy] of this.windows || []) { wg.fillStyle(C.gold, 1); wg.fillRect(wx, wy, 8, 12); }
    }
    this.castleG.setAlpha(this.night > 0.5 ? 0.7 : 1);
    this.fxG.clear();
    return this.cycle.run(match, []);
  }

  // ---------------------------------------------------------------- hazard: BAD CARTRIDGE
  /** BAD CARTRIDGE starts: picks the column that will glitch. */
  start_glitch(match, h) {
    h.title = 'BAD CARTRIDGE! BLOW ON IT!';
    const alive = match.fighters.filter((f) => f.alive), tgt = alive.length ? alive[Math.floor(Math.random() * alive.length)].x : 0;
    h.x = Math.max(-240, Math.min(240, Math.round((tgt + Math.random() * 60 - 30) / 16) * 16)); h.w = 64;
  }
  /** BAD CARTRIDGE: the warning flicker, then a column of corrupted tiles that hurts; true when it's over. */
  step_glitch(match, h, out) {
    const g = this.fxG, warn = 90, hit = 40;
    const tiles = (alpha, density) => {
      for (let y = -400; y < 16; y += 16) for (let x = h.x - h.w / 2; x < h.x + h.w / 2; x += 16) {
        if (Math.random() > density) continue;
        const c = C.glitch[Math.floor(Math.random() * C.glitch.length)];
        g.fillStyle(c, alpha); g.fillRect(x + (Math.random() < 0.3 ? (Math.random() - 0.5) * 12 : 0), y, 16, Math.random() < 0.5 ? 16 : 8);
        if (Math.random() < 0.3) { g.fillStyle(C.k, alpha); g.fillRect(x + 4, y + 4, 8, 2); }
      }
    };
    if (h.t < warn) { if (h.t % 6 < 3) tiles(0.55, 0.18); if (h.t % 20 === 0) sfx('glitch', 0.25, 1.4); return false; }
    if (h.t === warn) { sfx('glitch', 0.8, 0.7); sfx('bighit', 0.5, 0.5); match.shake(8, 8); }
    if (h.t < warn + hit) {
      tiles(1, 0.75);
      g.fillStyle(C.w, 0.25 * (h.t % 4 < 2 ? 1 : 0)); g.fillRect(h.x - h.w / 2 - 8, -400, h.w + 16, 420);
      out.push({ x1: h.x - h.w / 2, x2: h.x + h.w / 2, y1: -420, y2: 8, dmg: 13, angle: 80, base: 4.2, growth: 5.0, id: 'glitch' + h.id, hazard: true });
      return false;
    }
    return h.t > warn + hit + 10;
  }

  // ---------------------------------------------------------------- hazard: CANNON VOLLEY
  start_cannons(match, h) { h.title = 'CANNON VOLLEY!'; h.balls = []; }
  /** VOLLEY: cannons on the castle fire cannonballs across the stage; true when the last one is gone. */
  step_cannons(match, h, out) {
    const g = this.fxG, rise = Math.min(1, h.t / 40), sink = h.t > 330 ? Math.min(1, (h.t - 330) / 30) : 0, up = rise - sink;
    for (const side of [-1, 1]) {                                      // the cannons rise out of the island's ends
      const x = side * 262, y = -24 * up;
      g.fillStyle(C.k, 1); g.fillRect(x - 12, y - 2, 24, 26 * up + 2); g.fillCircle(x, y, 13);
      g.fillStyle(C.stoneD, 1); g.fillCircle(x, y, 11); g.fillRect(x - 10, y, 20, 24 * up);
      g.fillStyle(C.k, 1); g.fillRect(side < 0 ? x : x - 18, y - 6, 18, 12); g.fillStyle(C.stone, 1); g.fillRect(x - 6, y - 8, 4, 4);
      for (const [hgt, d] of VOLLEY) if (h.t === 100 + d + (side > 0 ? 23 : 0)) { h.balls.push({ x: x - side * 14, y: -hgt, vx: -side * 4.4, id: h.balls.length }); sfx('bighit', 0.4, 1.4); match.shake(3, 4); }
    }
    for (const b of h.balls) {
      b.x += b.vx;
      if (Math.abs(b.x) > 340) continue;
      g.fillStyle(C.k, 1); g.fillCircle(b.x, b.y, 8); g.fillStyle(C.w, 1); g.fillRect(b.x - 4, b.y - 5, 3, 3);
      if (this.t % 4 < 2) { g.fillStyle(C.stoneD, 1); g.fillRect(b.x - Math.sign(b.vx) * 12, b.y - 2, 4, 4); }
      out.push({ x1: b.x - 8, x2: b.x + 8, y1: b.y - 8, y2: b.y + 8, dmg: 9, angle: 40, base: 3.6, growth: 4.0, dirX: Math.sign(b.vx), id: 'ball' + h.id + '_' + b.id + (b.vx > 0 ? 'r' : 'l'), hazard: true });
    }
    return h.t > 370;
  }

  // ---------------------------------------------------------------- hazard: NIGHTFALL
  start_night(match, h) { h.title = 'NIGHTFALL! WATCH THE SKY!'; h.bats = []; this.nightTo = 1; sfx('bats', 0.5, 1); }
  /** NIGHTFALL: the palette goes dark and bats swoop over the stage; true when morning comes. */
  step_night(match, h, out) {
    const g = this.fxG;
    if (h.t > 60 && h.t < 420 && h.t % 45 === 0) {
      const side = Math.random() < 0.5 ? -1 : 1;
      h.bats.push({ x: side * 360, y: -240 - Math.random() * 60, vx: -side * 2.6, vy: 0.5, id: h.t });
      sfx('bats', 0.25, 1.4);
    }
    const alive = match.fighters.filter((f) => f.alive);
    for (const b of h.bats) {
      const tgt = alive.length ? alive.reduce((a, f) => (Math.abs(f.x - b.x) < Math.abs(a.x - b.x) ? f : a)) : null;
      if (tgt) { b.vy += Math.sign(tgt.y - 30 - b.y) * 0.08; b.vy = Math.max(-2.4, Math.min(2.4, b.vy)); }
      b.x += b.vx; b.y += b.vy;
      if (Math.abs(b.x) > 420) continue;
      const fl = Math.floor(this.t / 6 + b.id) % 2;                    // two-frame flap
      g.fillStyle(C.bat, 1); g.fillRect(b.x - 4, b.y - 3, 8, 7);
      g.fillStyle(C.batL, 1);
      if (fl) { g.fillRect(b.x - 12, b.y - 6, 8, 4); g.fillRect(b.x + 4, b.y - 6, 8, 4); } else { g.fillRect(b.x - 12, b.y, 8, 4); g.fillRect(b.x + 4, b.y, 8, 4); }
      g.fillStyle(C.red, 1); g.fillRect(b.x - 2, b.y - 1, 2, 2); g.fillRect(b.x + 1, b.y - 1, 2, 2);
      out.push({ x1: b.x - 10, x2: b.x + 10, y1: b.y - 6, y2: b.y + 6, dmg: 5, angle: 60, base: 2.4, growth: 2.0, dirX: Math.sign(b.vx), id: 'bat' + h.id + '_' + b.id, hazard: true });
    }
    if (h.t === 480) this.nightTo = 0;
    return h.t > 500;
  }
}

/** The select screen's miniature: sky, hills, the castle, the island and its ledges. */
export function drawKingdomPreview(g, x, y, w, h) {
  const u = w / 100, v = h / 100;
  g.fillStyle(C.sky, 1); g.fillRect(x, y, w, h);
  g.fillStyle(C.mtn, 1); g.fillTriangle(x + 4 * u, y + 62 * v, x + 22 * u, y + 30 * v, x + 40 * u, y + 62 * v); g.fillTriangle(x + 30 * u, y + 62 * v, x + 52 * u, y + 24 * v, x + 74 * u, y + 62 * v);
  g.fillStyle(C.w, 1); g.fillTriangle(x + 18 * u, y + 37 * v, x + 22 * u, y + 30 * v, x + 26 * u, y + 37 * v); g.fillTriangle(x + 48 * u, y + 31 * v, x + 52 * u, y + 24 * v, x + 56 * u, y + 31 * v);
  g.fillStyle(C.stone, 1); g.fillRect(x + 70 * u, y + 36 * v, 18 * u, 26 * v); g.fillStyle(C.k, 1); g.fillRect(x + 77 * u, y + 50 * v, 4 * u, 12 * v); g.fillStyle(C.red, 1); g.fillRect(x + 79 * u, y + 28 * v, 5 * u, 3 * v);
  g.fillStyle(C.grass, 1); g.fillEllipse(x + 20 * u, y + 70 * v, 40 * u, 24 * v); g.fillEllipse(x + 75 * u, y + 70 * v, 46 * u, 22 * v);
  g.fillStyle(C.cloud, 1); g.fillEllipse(x + 30 * u, y + 14 * v, 16 * u, 6 * v); g.fillEllipse(x + 70 * u, y + 10 * v, 12 * u, 5 * v);
  g.fillStyle(C.k, 1); g.fillRect(x + 10 * u, y + 72 * v, 80 * u, 28 * v);
  g.fillStyle(C.grassL, 1); g.fillRect(x + 11 * u, y + 73 * v, 78 * u, 4 * v);
  g.fillStyle(C.brick, 1); g.fillRect(x + 11 * u, y + 77 * v, 78 * u, 22 * v);
  g.fillStyle(C.k, 1); for (let i = 0; i < 6; i++) g.fillRect(x + 11 * u, y + (81 + i * 4) * v, 78 * u, 0.6 * v);
  g.fillStyle(C.block, 1); g.fillRect(x + 18 * u, y + 52 * v, 18 * u, 4 * v); g.fillRect(x + 64 * u, y + 52 * v, 18 * u, 4 * v);
  g.fillStyle(C.cloud, 1); g.fillRect(x + 42 * u, y + 36 * v, 16 * u, 4 * v);
}

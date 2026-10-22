// "AERO MEADOW": a glossy Frutiger Aero dream - a bright aqua sky, glassy clouds, bubbles, a lens-flared
// sun, rolling green hills and still blue water - where the old electronics of the early 2000s were left out
// in the grass and nature took them back. You fight on a grassy island whose underside is a block of clear
// aquarium glass (goldfish inside), on a mossy keyboard, a vine-wrapped portable CD player, and the top of
// an old CRT monitor with a sapling growing out of it. Giant overgrown gadgets fill the distance.
// The one hazard: CD SHOWER - glints in the sky, then a flurry of spinning CDs streaks down at an angle.
// All art is drawn in code; music: 'bgm_aero' (tools/audio/aero_music.py).
import { sfx } from '../audio/sfx.js';
import { HazardCycle } from './hazardCycle.js';

export const APAL = {
  sky: [0x1c6fd0, 0x2a86e0, 0x3a9cea, 0x52b2f0, 0x6cc6f4, 0x8ad6f6, 0xaee4f8, 0xd4f2fb],
  cloud: 0xffffff, cloudShade: 0xd6eef8, cloudGloss: 0xeef9ff,
  grass: 0x5cc83a, grassLight: 0x9be85a, grassDark: 0x2f8a2a, grassGloss: 0xd8ffb0,
  hill: 0x58c04a, hillLight: 0x8ee070, hillFar: 0x7ccc9a, water: 0x2aa8e0, waterLight: 0x8ae0f8,
  glass: 0x7ad8f0, glassDeep: 0x2a9ccc, glassLight: 0xd4f6ff, fish: 0xff8a2a, fishLight: 0xffc070,
  beige: 0xd8d0b8, beigeShade: 0xb0a88c, beigeDark: 0x7a745e, screen: 0x1a3a4a, screenGlow: 0x7ae8ff,
  silver: 0xc8d0d8, silverShade: 0x8a96a2, moss: 0x4aa83a, mossDark: 0x2a6a24, vine: 0x3a9a30, flower: 0xffffff, petal: 0xffd84a, pink: 0xff9ad0,
  outline: 0x0d3550,
};

export class AeroStage {
  constructor(scene) {
    this.scene = scene;
    this.platforms = [
      { x1: -270, x2: 270, y: 0, solid: true, bottom: 64 },     // the grassy island on its aquarium-glass base
      { x1: -214, x2: -104, y: -82, solid: false },            // a mossy keyboard
      { x1: 104, x2: 214, y: -82, solid: false },              // a vine-wrapped portable CD player
      { x1: -56, x2: 56, y: -166, solid: false },              // the top of an old CRT monitor, a sapling on it
    ];
    this.spawns = [{ x: -150, y: 0 }, { x: 150, y: 0 }, { x: -50, y: 0 }, { x: 50, y: 0 }];
    this.hazardsOn = true;
    this.music = 'bgm_aero';
    this.t = 0;
    this.cycle = new HazardCycle(this, ['cds'], { color: '#ffffff', stroke: '#1a7fb0', gap: 600, jitter: 240, first: 420 });
  }

  // ---------------------------------------------------------------- drawing (built once)
  draw(worldLayer, bgLayer) {
    const s = this.scene, P = APAL;
    // the sky: hard bands of aqua, brightest at the horizon
    const sky = s.add.graphics().setScrollFactor(0);
    P.sky.forEach((c, i) => { sky.fillStyle(c, 1); sky.fillRect(-400, -60 + i * 46, 1440, 47); });
    sky.fillStyle(P.sky[7], 1); sky.fillRect(-400, -60 + 8 * 46, 1440, 400);
    // the sun with a glossy lens flare
    sky.fillStyle(0xffffff, 0.18); sky.fillCircle(500, 60, 70); sky.fillStyle(0xffffff, 0.3); sky.fillCircle(500, 60, 46);
    sky.fillStyle(0xffffff, 0.9); sky.fillCircle(500, 60, 24);
    for (const [x, y, r, a] of [[430, 110, 10, 0.25], [380, 150, 6, 0.3], [330, 190, 16, 0.12], [300, 210, 4, 0.35]]) { sky.lineStyle(2, 0xffffff, a); sky.strokeCircle(x, y, r); }
    // the aurora "swoosh" ribbons across the sky (green over aqua)
    for (let i = 0; i < 2; i++) {
      for (let x = -400; x < 1040; x += 4) {
        const y = 120 + i * 40 + Math.sin(x * 0.006 + i) * 30 + Math.sin(x * 0.017) * 8;
        sky.fillStyle(i ? 0x9be85a : 0x9ff0ff, 0.22); sky.fillRect(x, y, 4, 10);
        sky.fillStyle(0xffffff, 0.3); sky.fillRect(x, y, 4, 2);
      }
    }
    // far: glossy clouds, green hills, the lake, and the giant overgrown gadgets
    const far = s.add.graphics().setScrollFactor(0.25);
    const cloud = (x, y, w) => {
      far.fillStyle(P.cloudShade, 1); far.fillEllipse(x, y + 6, w, w * 0.32);
      far.fillStyle(P.cloud, 1); far.fillEllipse(x, y, w, w * 0.34); far.fillCircle(x - w * 0.18, y - w * 0.12, w * 0.2); far.fillCircle(x + w * 0.12, y - w * 0.16, w * 0.24);
      far.fillStyle(P.cloudGloss, 1); far.fillEllipse(x - w * 0.05, y - w * 0.22, w * 0.3, w * 0.08);
    };
    cloud(80, 70, 120); cloud(300, 40, 90); cloud(640, 90, 140); cloud(860, 50, 100);
    // hills
    for (const [x, w, h, c] of [[-60, 420, 120, P.hillFar], [300, 520, 150, P.hillFar], [700, 460, 130, P.hillFar]]) { far.fillStyle(c, 1); far.fillEllipse(x + w / 2, 330, w, h * 2); }
    // the giant overgrown gadgets in the distance
    this.drawFarCRT(far, 140, 210); this.drawFarTower(far, 600, 230); this.drawFarPhone(far, 820, 250); this.drawFarDish(far, 20, 240);
    for (const [x, w, h] of [[-100, 500, 90], [360, 560, 110], [820, 500, 80]]) {
      far.fillStyle(P.hill, 1); far.fillEllipse(x + w / 2, 350, w, h * 2);
      far.fillStyle(P.hillLight, 1); far.fillEllipse(x + w / 2 - w * 0.1, 350 - h + 12, w * 0.5, 12);           // the gloss on each hill
    }
    far.fillStyle(P.water, 1); far.fillRect(-400, 330, 1440, 200);
    for (let x = -400; x < 1040; x += 23) { far.fillStyle(P.waterLight, 0.8); far.fillRect(x, 334 + (x % 5), 12, 1); }
    bgLayer.push(sky, far);
    this.bgFx = s.add.graphics().setScrollFactor(0.4); bgLayer.push(this.bgFx);      // bubbles, butterflies, sparkles

    worldLayer.push(this.drawIsland(s));
    this.platG = s.add.graphics(); this.drawPlatforms(this.platG); worldLayer.push(this.platG);
    this.fxG = s.add.graphics(); this.hzG = s.add.graphics(); worldLayer.push(this.fxG, this.hzG);
    this.cycle.makeBanner(s);
  }
  vines(g, x, y, len, n = 3) {                                     // little vines hanging down with leaves
    const P = APAL;
    for (let i = 0; i < n; i++) {
      const vx = x + i * 9 + (i % 2) * 3, l = len * (0.6 + 0.4 * ((i * 7) % 5) / 4);
      g.fillStyle(P.vine, 1); g.fillRect(vx, y, 1, l);
      for (let k = 3; k < l; k += 5) { g.fillStyle(k % 10 ? P.grassLight : P.moss, 1); g.fillRect(vx + (k % 10 ? 1 : -2), y + k, 2, 2); }
    }
  }
  flowers(g, x1, x2, y, every = 13) {
    const P = APAL;
    for (let x = x1; x < x2; x += every) {
      const c = [P.flower, P.petal, P.pink][Math.floor(Math.abs(x * 7) % 3)];
      g.fillStyle(P.grassDark, 1); g.fillRect(x, y - 4, 1, 4);
      g.fillStyle(c, 1); g.fillRect(x - 1, y - 6, 3, 2); g.fillRect(x, y - 7, 1, 4);
      g.fillStyle(P.petal, 1); g.fillRect(x, y - 6, 1, 1);
    }
  }
  drawFarCRT(g, x, y) {                                            // a huge CRT sunk in a hill, its screen a pond of sky
    const P = APAL;
    g.fillStyle(P.beigeDark, 1); g.fillRect(x - 70, y - 60, 140, 120);
    g.fillStyle(P.beige, 1); g.fillRect(x - 66, y - 56, 132, 112);
    g.fillStyle(P.beigeShade, 1); g.fillRect(x - 66, y + 40, 132, 16);
    g.fillStyle(P.outline, 1); g.fillRect(x - 54, y - 46, 108, 80);
    g.fillStyle(P.glassDeep, 1); g.fillRect(x - 50, y - 42, 100, 72);
    g.fillStyle(P.glass, 1); g.fillRect(x - 50, y - 42, 100, 30);
    g.fillStyle(0xffffff, 0.5); g.fillRect(x - 46, y - 38, 40, 6);                                      // screen gloss
    g.fillStyle(P.moss, 1); g.fillEllipse(x - 20, y - 60, 120, 20); g.fillStyle(P.grassLight, 1); g.fillEllipse(x - 30, y - 64, 70, 8);
    this.vines(g, x - 60, y - 54, 40, 5); this.vines(g, x + 30, y - 54, 30, 4);
    g.fillStyle(P.moss, 1); g.fillRect(x + 40, y + 30, 26, 20);
  }
  drawFarTower(g, x, y) {                                          // a beige PC tower on its side, a tree growing out of the drive bay
    const P = APAL;
    g.fillStyle(P.beigeDark, 1); g.fillRect(x - 80, y - 34, 160, 70);
    g.fillStyle(P.beige, 1); g.fillRect(x - 77, y - 31, 154, 64);
    for (let i = 0; i < 3; i++) { g.fillStyle(P.beigeShade, 1); g.fillRect(x - 60 + i * 30, y - 20, 24, 10); }
    g.fillStyle(0x3a2a1a, 1); g.fillRect(x - 6, y - 110, 10, 80);                                      // the trunk
    g.fillStyle(P.grass, 1); g.fillCircle(x, y - 120, 36); g.fillCircle(x - 28, y - 104, 24); g.fillCircle(x + 26, y - 106, 26);
    g.fillStyle(P.grassLight, 1); g.fillCircle(x - 8, y - 132, 16);
    g.fillStyle(0xffffff, 0.35); g.fillEllipse(x - 12, y - 140, 26, 8);
    this.vines(g, x - 74, y - 30, 26, 6);
  }
  drawFarPhone(g, x, y) {                                          // a flip phone standing open in the grass, moss in the hinge
    const P = APAL;
    g.fillStyle(P.silverShade, 1); g.fillRect(x - 20, y - 90, 40, 56); g.fillRect(x - 20, y - 30, 40, 56);
    g.fillStyle(P.silver, 1); g.fillRect(x - 17, y - 87, 34, 50); g.fillRect(x - 17, y - 27, 34, 50);
    g.fillStyle(P.screen, 1); g.fillRect(x - 12, y - 80, 24, 30); g.fillStyle(P.screenGlow, 0.6); g.fillRect(x - 12, y - 80, 24, 8);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { g.fillStyle(P.silverShade, 1); g.fillRect(x - 12 + c * 9, y - 20 + r * 9, 6, 5); }
    g.fillStyle(P.moss, 1); g.fillRect(x - 20, y - 36, 40, 8);
  }
  drawFarDish(g, x, y) {                                           // a satellite dish swallowed by ivy
    const P = APAL;
    g.fillStyle(P.silverShade, 1); g.fillRect(x - 3, y - 40, 6, 60);
    g.fillStyle(P.silver, 1); g.fillEllipse(x, y - 60, 70, 50);
    g.fillStyle(P.silverShade, 1); g.fillEllipse(x + 6, y - 58, 50, 34);
    g.fillStyle(P.moss, 1); g.fillEllipse(x - 14, y - 72, 30, 16); g.fillEllipse(x + 18, y - 44, 26, 12);
    this.vines(g, x - 20, y - 50, 30, 4);
  }
  // the main island: glossy grass on a block of clear aquarium glass full of water and goldfish
  drawIsland(s) {
    const g = s.add.graphics(), P = APAL, x1 = -270, x2 = 270;
    for (let row = 0; row < 12; row++) {
      const inset = Math.floor(row * row * 0.8) + row * 5, y = 8 + row * 6;
      g.fillStyle(P.outline, 1); g.fillRect(x1 + inset - 2, y, x2 - x1 - inset * 2 + 4, 7);
      g.fillStyle(row < 1 ? 0x6a4a2a : row < 4 ? P.glass : row < 8 ? 0x52bce4 : P.glassDeep, 1); g.fillRect(x1 + inset, y, x2 - x1 - inset * 2, 6);
    }
    g.fillStyle(P.glassLight, 0.8); g.fillRect(x1 + 20, 16, 120, 2); g.fillRect(x1 + 30, 20, 60, 1);   // the glass gloss
    g.fillStyle(P.outline, 1); g.fillRect(x1 - 2, -2, x2 - x1 + 4, 12);
    g.fillStyle(P.grass, 1); g.fillRect(x1, 0, x2 - x1, 8);
    g.fillStyle(P.grassLight, 1); g.fillRect(x1, 0, x2 - x1, 3);
    g.fillStyle(P.grassGloss, 1); for (let x = x1 + 8; x < x2 - 8; x += 64) g.fillRect(x, 1, 30, 1);
    for (let x = x1 + 3; x < x2 - 3; x += 5) { g.fillStyle(P.grassDark, 1); g.fillRect(x, -2 - ((x * 3) % 3), 1, 2 + ((x * 3) % 3)); }   // blades
    this.flowers(g, x1 + 10, x2 - 10, 0, 23);
    this.vines(g, x1 + 6, 9, 22, 3); this.vines(g, x2 - 30, 9, 26, 3);
    // a sunken old laptop at the edge, half grown over (decoration)
    g.fillStyle(P.silverShade, 1); g.fillRect(170, -26, 44, 26); g.fillStyle(P.silver, 1); g.fillRect(172, -24, 40, 22);
    g.fillStyle(P.screen, 1); g.fillRect(176, -21, 32, 16); g.fillStyle(P.screenGlow, 0.5); g.fillRect(176, -21, 32, 4);
    g.fillStyle(P.moss, 1); g.fillRect(168, -6, 50, 6); this.vines(g, 172, -26, 14, 3);
    return g;
  }
  drawPlatforms(g) {
    const P = APAL;
    // a mossy keyboard
    let p = this.platforms[1], w = p.x2 - p.x1;
    g.fillStyle(P.outline, 1); g.fillRect(p.x1 - 1, p.y - 1, w + 2, 15);
    g.fillStyle(P.beigeShade, 1); g.fillRect(p.x1, p.y, w, 13);
    for (let r = 0; r < 2; r++) for (let x = p.x1 + 3; x < p.x2 - 6; x += 8) { g.fillStyle(P.beige, 1); g.fillRect(x + r * 3, p.y + 2 + r * 5, 6, 4); }
    g.fillStyle(P.moss, 1); g.fillRect(p.x1 + 10, p.y - 2, 40, 3); g.fillRect(p.x2 - 30, p.y - 2, 24, 3);
    g.fillStyle(P.grassLight, 1); g.fillRect(p.x1 + 14, p.y - 3, 20, 1);
    this.flowers(g, p.x1 + 16, p.x1 + 50, p.y - 1, 11); this.vines(g, p.x1 + 6, p.y + 13, 18, 4);
    // a portable CD player, lid shut, ivy round it
    p = this.platforms[2]; w = p.x2 - p.x1;
    g.fillStyle(P.outline, 1); g.fillRect(p.x1 - 1, p.y - 1, w + 2, 16);
    g.fillStyle(P.silverShade, 1); g.fillRect(p.x1, p.y, w, 14);
    g.fillStyle(P.silver, 1); g.fillRect(p.x1 + 2, p.y, w - 4, 6);
    g.fillStyle(P.silverShade, 1); g.fillCircle((p.x1 + p.x2) / 2, p.y + 3, 3);
    g.fillStyle(P.screenGlow, 1); g.fillRect(p.x2 - 20, p.y + 8, 12, 3);
    g.fillStyle(P.moss, 1); g.fillRect(p.x1 + 4, p.y - 2, 30, 3); g.fillRect(p.x2 - 40, p.y - 2, 16, 3);
    this.flowers(g, p.x2 - 36, p.x2 - 10, p.y - 1, 9); this.vines(g, p.x2 - 34, p.y + 14, 16, 4);
    // an old CRT monitor's top, a sapling growing out of it
    p = this.platforms[3]; w = p.x2 - p.x1;
    g.fillStyle(P.outline, 1); g.fillRect(p.x1 - 1, p.y - 1, w + 2, 46);
    g.fillStyle(P.beige, 1); g.fillRect(p.x1, p.y, w, 44);
    g.fillStyle(P.beigeShade, 1); g.fillRect(p.x1, p.y + 36, w, 8);
    g.fillStyle(P.outline, 1); g.fillRect(p.x1 + 10, p.y + 6, w - 20, 26);
    g.fillStyle(P.glassDeep, 1); g.fillRect(p.x1 + 12, p.y + 8, w - 24, 22);
    g.fillStyle(P.glass, 1); g.fillRect(p.x1 + 12, p.y + 8, w - 24, 8);
    g.fillStyle(0xffffff, 0.5); g.fillRect(p.x1 + 14, p.y + 10, 24, 2);
    g.fillStyle(P.moss, 1); g.fillRect(p.x1, p.y - 2, w, 4); g.fillStyle(P.grassLight, 1); g.fillRect(p.x1 + 4, p.y - 2, w - 8, 1);
    g.fillStyle(0x6a4a2a, 1); g.fillRect(p.x2 - 18, p.y - 26, 3, 24);                                  // the sapling
    g.fillStyle(P.grass, 1); g.fillCircle(p.x2 - 17, p.y - 30, 8); g.fillCircle(p.x2 - 24, p.y - 24, 5); g.fillStyle(P.grassLight, 1); g.fillCircle(p.x2 - 19, p.y - 33, 3);
    this.vines(g, p.x1 + 2, p.y + 2, 30, 3); this.flowers(g, p.x1 + 6, p.x1 + 40, p.y - 1, 10);
  }

  // ---------------------------------------------------------------- per frame
  step(match) {
    this.t++;
    this.hzG.clear();
    this.drawAmbience();
    return this.cycle.run(match, []);
  }
  drawAmbience() {
    const g = this.bgFx, f = this.fxG, t = this.t; g.clear(); f.clear();
    for (let i = 0; i < 14; i++) {                                   // bubbles drifting up the sky
      const x = (i * 97 + Math.sin(t * 0.02 + i) * 14) % 900 - 50, y = 400 - ((t * (0.3 + (i % 4) * 0.12) + i * 61) % 460), r = 3 + (i % 4) * 2;
      g.lineStyle(1, 0xffffff, 0.7); g.strokeCircle(x, y, r); g.fillStyle(0xffffff, 0.12); g.fillCircle(x, y, r);
      g.fillStyle(0xffffff, 0.9); g.fillRect(x - r * 0.5, y - r * 0.5, 2, 1);
    }
    for (let i = 0; i < 3; i++) {                                    // butterflies flitting over the island
      const x = -180 + i * 160 + Math.sin(t * 0.013 + i * 2) * 60, y = -40 - i * 18 + Math.sin(t * 0.05 + i) * 12, flap = (t >> 2) % 2;
      f.fillStyle([0xffd84a, 0x9ff0ff, 0xff9ad0][i], 1); f.fillRect(x - (flap ? 3 : 2), y - 1, flap ? 2 : 1, 3); f.fillRect(x + 1, y - 1, flap ? 2 : 1, 3);
      f.fillStyle(0x0d3550, 1); f.fillRect(x - 0.5, y - 1, 1, 3);
    }
    for (let i = 0; i < 6; i++) {                                    // goldfish swimming in the island's glass
      const dir = i % 2 ? 1 : -1, x = ((t * 0.4 * (1 + i % 3 * 0.3) + i * 90) % 400) * dir + (dir > 0 ? -200 : 200), y = 22 + (i % 3) * 9 + Math.sin(t * 0.05 + i) * 2;
      const span = 230 - (y - 8) * 3;
      if (Math.abs(x) > span) continue;
      f.fillStyle(APAL.fish, 1); f.fillRect(x - 3, y - 1, 6, 3); f.fillStyle(APAL.fishLight, 1); f.fillRect(x - 2 * dir, y - 1, 2, 1);
      f.fillRect(x - 5 * dir - (dir > 0 ? 1 : 0), y - 2, 2, 5);
    }
    if (t % 40 < 20) { const x = ((t * 13) % 400) - 200; f.fillStyle(0xffffff, 0.6); f.fillRect(x, 30 - (t % 40), 1, 1); }   // a bubble rising in the glass
  }

  // ---------------------------------------------------------------- the hazard
  // CD SHOWER: glints high in the sky where they'll come from, then spinning CDs streak down at an angle
  // in two volleys. Each CD hits once; they shatter into rainbow shards on the ground.
  start_cds(match, h) {
    h.title = 'CD SHOWER';
    h.dir = Math.random() < 0.5 ? 1 : -1;
    h.cds = [];
    for (let v = 0; v < 2; v++) for (let i = 0; i < 6; i++) {
      const at = 80 + v * 90 + i * 9, tx = -250 + Math.random() * 500;                // where it'll land
      h.cds.push({ at, tx, x: tx - h.dir * 340, y: -340, vx: h.dir * 5.2, vy: 5.2, spin: Math.random() * 6, done: false, id: v * 10 + i });
    }
  }
  step_cds(match, h, out) {
    const g = this.hzG;
    let live = false;
    for (const c of h.cds) {
      if (c.done) continue; live = true;
      if (h.t < c.at) {                                               // a glint where it'll come from, and a faint mark where it lands
        if (h.t > c.at - 50) {
          const k = (h.t - (c.at - 50)) / 50, gx = c.x, gy = -300;
          g.fillStyle(0xffffff, 0.4 + 0.6 * ((h.t >> 2) % 2)); g.fillRect(gx - 1, gy - 5 * k, 2, 10 * k); g.fillRect(gx - 5 * k, gy - 1, 10 * k, 2);
          g.fillStyle(0xffffff, 0.15 + 0.15 * k); g.fillEllipse(c.tx, 1, 20, 4);
        }
        continue;
      }
      if (h.t === c.at && c.id % 3 === 0) sfx('whoosh', 0.4, 1.4);
      c.x += c.vx; c.y += c.vy; c.spin += 0.5;
      this.drawCD(g, c.x, c.y, c.spin);
      out.push({ x1: c.x - 9, x2: c.x + 9, y1: c.y - 9, y2: c.y + 9, dmg: 6, angle: 40, base: 3.4, growth: 3.0, dirX: Math.sign(c.vx), id: 'cd' + h.id + ':' + c.id, hazard: true });
      if (c.y >= 0 && Math.abs(c.x) < 270) { c.done = true; this.shatter(match, c.x); }
      else if (c.y > 320) c.done = true;
    }
    return h.t > 80 && !live;
  }
  drawCD(g, x, y, spin) {                                          // a disc seen at an angle, its rainbow sheen turning
    const w = 18, hgt = 8 + 4 * Math.abs(Math.sin(spin * 0.5));
    g.fillStyle(0x0d3550, 1); g.fillEllipse(x, y, w + 2, hgt + 2);
    g.fillStyle(0xe8eef4, 1); g.fillEllipse(x, y, w, hgt);
    const rb = [0xff7a9a, 0xffd84a, 0x9be85a, 0x7ad8f0, 0xb88aff];
    for (let i = 0; i < 3; i++) { g.fillStyle(rb[(Math.floor(spin) + i) % 5], 0.7); g.fillEllipse(x + Math.cos(spin + i * 2) * 4, y + Math.sin(spin + i * 2) * hgt * 0.2, 6, hgt * 0.35); }
    g.fillStyle(0xffffff, 0.9); g.fillRect(x - 6, y - hgt * 0.3, 4, 1);
    g.fillStyle(0x8a96a2, 1); g.fillEllipse(x, y, 5, hgt * 0.35); g.fillStyle(0x0d3550, 1); g.fillEllipse(x, y, 2, hgt * 0.18);
  }
  shatter(match, x) {
    sfx('glass', 0.5, 1.2 + Math.random() * 0.3);
    const rb = [0xff7a9a, 0xffd84a, 0x9be85a, 0x7ad8f0, 0xffffff];
    for (let i = 0; i < 7; i++) { const a = -Math.PI * (0.15 + 0.7 * Math.random()), sp = 1.5 + Math.random() * 2.5; match.particles.push({ shape: 'shard', x, y: -2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 22 + Math.random() * 10, color: rb[i % 5], drag: 0.94, grav: 0.15, ang: a }); }
  }
}

// Miniature of AERO MEADOW for the select screen: aqua sky, sun, a glossy cloud, a hill with a CRT in it, the island
export function drawAeroPreview(g, x, y, w, h) {
  const P = APAL, bh = Math.ceil(h / 8);
  P.sky.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(x, y + i * bh, w, Math.min(bh, h - i * bh)); });
  g.fillStyle(0xffffff, 0.9); g.fillCircle(x + w * 0.8, y + h * 0.2, Math.max(3, h * 0.1));
  g.fillStyle(0xffffff, 1); g.fillEllipse(x + w * 0.25, y + h * 0.22, w * 0.22, h * 0.12);
  g.fillStyle(P.hill, 1); g.fillEllipse(x + w * 0.3, y + h * 0.95, w * 0.8, h * 0.6);
  g.fillStyle(P.beige, 1); g.fillRect(x + w * 0.2, y + h * 0.5, w * 0.14, h * 0.18);
  g.fillStyle(P.glassDeep, 1); g.fillRect(x + w * 0.22, y + h * 0.53, w * 0.1, h * 0.1);
  g.fillStyle(P.moss, 1); g.fillRect(x + w * 0.2, y + h * 0.48, w * 0.14, 2);
  const top = y + h * 0.72;
  g.fillStyle(P.outline, 1); g.fillRect(x + w * 0.12, top - 1, w * 0.76, 5);
  g.fillStyle(P.grass, 1); g.fillRect(x + w * 0.13, top, w * 0.74, 3);
  for (let r = 1; r < 5; r++) { g.fillStyle(r < 3 ? P.glass : P.glassDeep, 1); g.fillRect(x + w * (0.13 + r * 0.04), top + r * 3, w * (0.74 - r * 0.08), 3); }
  g.fillStyle(0xe8eef4, 1); g.fillEllipse(x + w * 0.6, y + h * 0.4, 6, 3); g.fillStyle(0x7ad8f0, 1); g.fillEllipse(x + w * 0.6, y + h * 0.4, 3, 1.5);
}

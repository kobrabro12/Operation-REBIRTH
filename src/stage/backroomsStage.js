// "The Backrooms": a chunk of floor drifting through the endless back rooms of reality. Every minute
// everyone noclips through the floor into the NEXT level - the background, the floating platforms and the
// hazard all change - cycling through four levels:
//   LEVEL 0   THE LOBBY       mono-yellow wallpaper, buzzing lights, damp carpet. Hazard: LIGHTS OUT -
//                             the lights die, and in the dark a SMILER grins at someone... then lunges.
//   LEVEL 1   HABITABLE ZONE  a concrete warehouse, caged lamps, stacked crates. Hazard: FALLING CRATES -
//                             shadows on the floor, then crates drop from the dark ceiling.
//   LEVEL 2   PIPE DREAMS     maintenance tunnels full of pipes; you fight on the pipes. Hazard: STEAM
//                             VENTS - hissing spots on the floor, then scalding columns of steam.
//   LEVEL 37  THE POOLROOMS   white tile, still water, too much light. Hazard: THE SURGE - the water
//                             surges across the floor from one side and sweeps you along.
// The main floor (platform 0) never moves; only the floating platforms change. Anyone standing on a
// platform that disappears simply falls. All art is drawn in code; music: 'bgm_backrooms'.
import { sfx } from '../audio/sfx.js';
import { HazardCycle } from './hazardCycle.js';
import { FONT } from '../config.js';

const LEVEL_FRAMES = 3600;                       // a minute on each level
const NOCLIP_FRAMES = 50;                        // the glitchy transition between levels

export const BPAL = {
  // LEVEL 0
  wall: 0xd8c46c, wallStripe: 0xc4ae54, wallDark: 0xa8923e, ceil: 0xe8dcaa, ceilLine: 0xc8bc88, lit: 0xfffbe0, dead: 0x6a6448,
  carpet: 0x9a8648, carpetDark: 0x6e5f32, carpetStain: 0x7a6a38, skirt: 0xa08c40,
  // LEVEL 1
  conc: 0x7a7a74, concDark: 0x56564f, concLight: 0x9a9a92, lamp: 0xffb060, crate: 0x8a6438, crateDark: 0x5a3e20, crateLight: 0xb08450,
  // LEVEL 2
  pipeBg: 0x1a1410, pipe: 0x6a5a48, pipeDark: 0x3a3028, pipeLight: 0x9a8670, rust: 0x8a4a28, valve: 0xc83a2a, steam: 0xe8e8e0,
  // LEVEL 37
  tile: 0xf4f8f6, tileLine: 0xc8dcd8, water: 0x6ad0e0, waterDeep: 0x3aa8c8, waterLight: 0xc8f4fa,
  outline: 0x120e06, void: 0x0a0804,
};

// the four levels: name, the floating platforms, the hazards, the banner colours
const LEVELS = [
  { name: 'LEVEL 0\nTHE LOBBY', hazards: ['lights'], color: '#fff6b0', stroke: '#2a2410',
    plats: [{ x1: -200, x2: -96, y: -88 }, { x1: 96, x2: 200, y: -88 }] },
  { name: 'LEVEL 1\nHABITABLE ZONE', hazards: ['crates'], color: '#ffb060', stroke: '#1a1a18',
    plats: [{ x1: -236, x2: -156, y: -72 }, { x1: -54, x2: 54, y: -146 }, { x1: 156, x2: 236, y: -72 }] },
  { name: 'LEVEL 2\nPIPE DREAMS', hazards: ['steam'], color: '#e8e8e0', stroke: '#3a1a0a',
    plats: [{ x1: -262, x2: -46, y: -100 }, { x1: 46, x2: 262, y: -100 }, { x1: -84, x2: 84, y: -196 }] },
  { name: 'LEVEL 37\nTHE POOLROOMS', hazards: ['surge'], color: '#c8f4fa', stroke: '#0a3a48',
    plats: [{ x1: -150, x2: -50, y: -82 }, { x1: 50, x2: 150, y: -82 }, { x1: 170, x2: 250, y: -160 }] },
];

export class BackroomsStage {
  constructor(scene) {
    this.scene = scene;
    this.main = { x1: -280, x2: 280, y: 0, solid: true, bottom: 60 };
    this.level = 0; this.t = 0; this.noclip = 0;
    this.platforms = [this.main, ...LEVELS[0].plats.map((p) => ({ ...p, solid: false }))];
    this.spawns = [{ x: -150, y: 0 }, { x: 150, y: 0 }, { x: -50, y: 0 }, { x: 50, y: 0 }];
    this.hazardsOn = true;
    this.music = 'bgm_backrooms';
    this.cycle = new HazardCycle(this, LEVELS[0].hazards, { color: LEVELS[0].color, stroke: LEVELS[0].stroke, gap: 540, jitter: 240, first: 360 });
  }

  // ---------------------------------------------------------------- drawing (each level's art is built once)
  draw(worldLayer, bgLayer) {
    const s = this.scene;
    this.bgs = [this.bgLobby(s), this.bgWarehouse(s), this.bgPipes(s), this.bgPool(s)];
    this.floors = [this.floorLobby(s), this.floorWarehouse(s), this.floorPipes(s), this.floorPool(s)];
    for (const list of this.bgs) bgLayer.push(...list);
    this.bgFx = s.add.graphics().setScrollFactor(0.3); bgLayer.push(this.bgFx);       // flickering lights, drips, steam, ripples
    for (const g of this.floors) worldLayer.push(g);
    this.platG = s.add.graphics(); this.fxG = s.add.graphics(); this.hzG = s.add.graphics();
    worldLayer.push(this.platG, this.fxG, this.hzG);
    // the noclip transition and LIGHTS OUT's darkness, over everything (screen space)
    this.overG = s.add.graphics().setScrollFactor(0).setDepth(-1); s.addUI(this.overG);   // (under the HUD)
    this.levelText = s.add.text(320, 140, '', { fontFamily: FONT, fontSize: '14px', color: '#fff6b0', stroke: '#0a0804', strokeThickness: 6, align: 'center', lineSpacing: 6 })
      .setOrigin(0.5).setScrollFactor(0).setDepth(31).setVisible(false);
    s.addUI(this.levelText);
    this.cycle.makeBanner(s);
    this.showLevel(0);
  }
  showLevel(i) {
    this.bgs.forEach((list, k) => list.forEach((g) => g.setVisible(k === i)));
    this.floors.forEach((g, k) => g.setVisible(k === i));
    this.drawPlatforms();
  }

  // LEVEL 0: an endless room of yellow wallpaper, a drop ceiling of fluorescent panels, doorways into more of it
  bgLobby(s) {
    const P = BPAL, g = s.add.graphics().setScrollFactor(0);
    g.fillStyle(P.wall, 1); g.fillRect(-400, -60, 1440, 600);
    for (let x = -400; x < 1040; x += 9) { g.fillStyle(P.wallStripe, 1); g.fillRect(x, 60, 3, 400); }
    g.fillStyle(P.ceil, 1); g.fillRect(-400, -60, 1440, 120);
    for (let x = -400; x < 1040; x += 48) { g.fillStyle(P.ceilLine, 1); g.fillRect(x, -60, 2, 120); }
    for (let y = -60; y < 60; y += 30) { g.fillStyle(P.ceilLine, 1); g.fillRect(-400, y, 1440, 2); }
    const far = s.add.graphics().setScrollFactor(0.25);                               // doorways: openings into more yellow
    for (const [x, w] of [[30, 60], [190, 40], [330, 80], [520, 50], [700, 60]]) {
      far.fillStyle(P.wallDark, 1); far.fillRect(x - 4, 150, w + 8, 220);
      far.fillStyle(0xc8b25a, 1); far.fillRect(x, 156, w, 214);
      far.fillStyle(0xb8a24a, 1); far.fillRect(x + w * 0.3, 176, w * 0.4, 194);       // another doorway behind it
      far.fillStyle(0xa8923e, 1); far.fillRect(x + w * 0.42, 196, w * 0.16, 174);
    }
    far.fillStyle(P.wallDark, 0.5); for (const [x, y] of [[120, 260], [440, 230], [620, 300]]) far.fillEllipse(x, y, 70, 30);   // damp stains
    return [g, far];
  }
  // LEVEL 1: grey concrete, pillars, caged lamps, stacks of crates in the gloom
  bgWarehouse(s) {
    const P = BPAL, g = s.add.graphics().setScrollFactor(0);
    for (let i = 0; i < 10; i++) { g.fillStyle([0x3a3a36, 0x40403c, 0x464642, 0x4c4c48, 0x52524e, 0x585854, 0x5e5e5a, 0x646460, 0x6a6a66, 0x70706c][i], 1); g.fillRect(-400, -60 + i * 50, 1440, 51); }
    const far = s.add.graphics().setScrollFactor(0.3);
    for (let x = -40; x < 900; x += 150) {
      far.fillStyle(P.concDark, 1); far.fillRect(x, 40, 34, 400); far.fillStyle(P.concLight, 1); far.fillRect(x, 40, 6, 400);
      far.fillStyle(0x2a2a26, 1); far.fillRect(x + 60, 30, 30, 4); far.fillRect(x + 74, 20, 2, 10);                  // a caged lamp on a chain
      far.fillStyle(P.lamp, 0.12); far.fillTriangle(x + 75, 34, x + 30, 240, x + 120, 240);
    }
    for (const [x, y, n] of [[60, 250, 3], [380, 270, 2], [640, 240, 4]]) {
      for (let k = 0; k < n; k++) { far.fillStyle(P.crateDark, 1); far.fillRect(x + (k % 2) * 30, y - Math.floor(k / 2) * 30 - 30, 30, 30); far.fillStyle(P.crate, 1); far.fillRect(x + (k % 2) * 30 + 2, y - Math.floor(k / 2) * 30 - 28, 26, 26); far.fillStyle(P.crateDark, 1); far.fillRect(x + (k % 2) * 30 + 2, y - Math.floor(k / 2) * 30 - 16, 26, 2); }
    }
    return [g, far];
  }
  // LEVEL 2: pipes everywhere in the dark - big rusty mains, valves, gauges
  bgPipes(s) {
    const P = BPAL, g = s.add.graphics().setScrollFactor(0);
    g.fillStyle(P.pipeBg, 1); g.fillRect(-400, -60, 1440, 600);
    const far = s.add.graphics().setScrollFactor(0.3);
    const pipe = (gx, x, y, w, h) => { gx.fillStyle(P.pipeDark, 1); gx.fillRect(x, y, w, h); gx.fillStyle(P.pipe, 1); gx.fillRect(x + (w > h ? 0 : 2), y + (w > h ? 2 : 0), w > h ? w : w - 4, w > h ? h - 4 : h); gx.fillStyle(P.pipeLight, 1); gx.fillRect(x + (w > h ? 0 : 3), y + (w > h ? 3 : 0), w > h ? w : 2, w > h ? 2 : h); };
    for (const [y, h] of [[40, 18], [110, 10], [300, 24], [360, 12]]) pipe(far, -200, y, 1300, h);
    for (const [x, w] of [[80, 14], [260, 22], [470, 10], [610, 18], [760, 14]]) pipe(far, x, -60, w, 500);
    for (const [x, y] of [[267, 130], [617, 310], [87, 360]]) { far.fillStyle(P.valve, 1); far.fillCircle(x + 4, y, 9); far.fillStyle(P.pipeBg, 1); far.fillCircle(x + 4, y, 5); far.fillStyle(P.valve, 1); far.fillRect(x - 5, y - 1, 18, 2); far.fillRect(x + 3, y - 9, 2, 18); }
    for (const [x, y] of [[180, 200], [520, 170]]) { far.fillStyle(0xe8e0c8, 1); far.fillCircle(x, y, 8); far.fillStyle(P.outline, 1); far.fillRect(x, y - 6, 1, 6); far.fillStyle(P.rust, 1); far.lineStyle(1, P.rust, 1); far.strokeCircle(x, y, 8); }
    return [g, far];
  }
  // LEVEL 37: endless white-tiled rooms, still turquoise water, archways, too bright
  bgPool(s) {
    const P = BPAL, g = s.add.graphics().setScrollFactor(0);
    g.fillStyle(P.tile, 1); g.fillRect(-400, -60, 1440, 600);
    for (let x = -400; x < 1040; x += 16) { g.fillStyle(P.tileLine, 1); g.fillRect(x, -60, 1, 600); }
    for (let y = -60; y < 540; y += 16) { g.fillStyle(P.tileLine, 1); g.fillRect(-400, y, 1440, 1); }
    const far = s.add.graphics().setScrollFactor(0.3);
    for (const [x, w] of [[40, 80], [260, 120], [520, 90]]) {                         // archways into more pools
      far.fillStyle(0xdce8e6, 1); far.fillRect(x, 120, w, 200); far.fillCircle(x + w / 2, 120, w / 2);
      far.fillStyle(0xb8d4d2, 1); far.fillRect(x + 8, 128, w - 16, 192); far.fillCircle(x + w / 2, 128, w / 2 - 8);
      far.fillStyle(P.water, 1); far.fillRect(x + 8, 300, w - 16, 20);
    }
    far.fillStyle(P.water, 1); far.fillRect(-200, 330, 1300, 200);                     // the pool below
    far.fillStyle(P.waterLight, 1); for (let x = -200; x < 1100; x += 37) far.fillRect(x, 332 + (x % 3), 14, 1);
    return [g, far];
  }

  // ---- the main floor, one look per level (always the same shape: platform 0)
  slab(g, top, mid, low, edge) {
    const M = this.main;
    for (let row = 0; row < 12; row++) {
      const inset = Math.floor(row * row * 0.8) + row * 5, y = 8 + row * 6;
      g.fillStyle(BPAL.outline, 1); g.fillRect(M.x1 + inset - 2, y, M.x2 - M.x1 - inset * 2 + 4, 7);
      g.fillStyle(row < 4 ? mid : low, 1); g.fillRect(M.x1 + inset, y, M.x2 - M.x1 - inset * 2, 6);
    }
    g.fillStyle(BPAL.outline, 1); g.fillRect(M.x1 - 2, -2, M.x2 - M.x1 + 4, 12);
    g.fillStyle(top, 1); g.fillRect(M.x1, 0, M.x2 - M.x1, 8);
    g.fillStyle(edge, 1); g.fillRect(M.x1, 0, M.x2 - M.x1, 2);
  }
  floorLobby(s) {
    const g = s.add.graphics(), P = BPAL, M = this.main;
    this.slab(g, P.carpet, P.wallStripe, P.wallDark, 0xb8a460);
    for (let x = M.x1 + 6; x < M.x2 - 6; x += 23) { g.fillStyle(P.carpetDark, 1); g.fillRect(x, 4, 12, 1); }
    for (const x of [-180, 30, 150]) { g.fillStyle(P.carpetStain, 1); g.fillEllipse(x, 4, 46, 5); }
    for (let x = M.x1 + 10; x < M.x2 - 10; x += 9) { g.fillStyle(P.wallDark, 1); g.fillRect(x, 14, 2, 30); }   // wallpaper on the slab's edge
    return g;
  }
  floorWarehouse(s) {
    const g = s.add.graphics(), P = BPAL, M = this.main;
    this.slab(g, P.conc, P.concDark, 0x3a3a36, P.concLight);
    for (let x = M.x1 + 40; x < M.x2; x += 80) { g.fillStyle(P.concDark, 1); g.fillRect(x, 0, 1, 8); }
    for (const x of [-120, 90]) { g.fillStyle(0x5a6a72, 1); g.fillEllipse(x, 3, 40, 4); g.fillStyle(0x9ab0ba, 1); g.fillRect(x - 8, 2, 10, 1); }   // puddles
    return g;
  }
  floorPipes(s) {
    const g = s.add.graphics(), P = BPAL, M = this.main;
    this.slab(g, P.pipeDark, 0x2a221c, 0x1a1410, P.pipeLight);
    for (let x = M.x1 + 4; x < M.x2 - 4; x += 6) { g.fillStyle(0x2a221c, 1); g.fillRect(x, 2, 3, 5); }   // metal grating
    for (let x = M.x1 + 30; x < M.x2; x += 70) { g.fillStyle(P.rust, 1); g.fillRect(x, 10, 10, 30); }      // rusty stains down the side
    return g;
  }
  floorPool(s) {
    const g = s.add.graphics(), P = BPAL, M = this.main;
    this.slab(g, P.tile, 0xdce8e6, 0xb8d4d2, 0xffffff);
    for (let x = M.x1; x < M.x2; x += 12) { g.fillStyle(P.tileLine, 1); g.fillRect(x, 0, 1, 8); }
    for (let x = M.x1 + 6; x < M.x2; x += 12) for (let y = 14; y < 60; y += 12) { g.fillStyle(P.tileLine, 1); g.fillRect(x, y, 1, 1); }
    return g;
  }
  // the floating platforms for the current level
  drawPlatforms() {
    const g = this.platG, P = BPAL; g.clear();
    for (const p of this.platforms) {
      if (p === this.main) continue;
      const w = p.x2 - p.x1;
      if (this.level === 0) {                         // a slab of floor torn out with its carpet and a scrap of wall under it
        g.fillStyle(P.outline, 1); g.fillRect(p.x1 - 1, p.y - 1, w + 2, 16);
        g.fillStyle(P.carpet, 1); g.fillRect(p.x1, p.y, w, 4);
        g.fillStyle(P.wall, 1); g.fillRect(p.x1 + 2, p.y + 4, w - 4, 10);
        for (let x = p.x1 + 4; x < p.x2 - 4; x += 9) { g.fillStyle(P.wallStripe, 1); g.fillRect(x, p.y + 4, 2, 10); }
      } else if (this.level === 1) {                  // a stack of crates
        for (let x = p.x1; x < p.x2 - 1; x += 26) {
          const cw = Math.min(26, p.x2 - x);
          g.fillStyle(P.outline, 1); g.fillRect(x, p.y - 1, cw, 26);
          g.fillStyle(P.crate, 1); g.fillRect(x + 1, p.y, cw - 2, 24);
          g.fillStyle(P.crateDark, 1); g.fillRect(x + 1, p.y + 11, cw - 2, 2); g.fillRect(x + 3, p.y + 2, 2, 20);
          g.fillStyle(P.crateLight, 1); g.fillRect(x + 1, p.y, cw - 2, 2);
        }
      } else if (this.level === 2) {                  // a pipe you stand on
        g.fillStyle(P.outline, 1); g.fillRect(p.x1 - 1, p.y - 1, w + 2, 12);
        g.fillStyle(P.pipe, 1); g.fillRect(p.x1, p.y, w, 10);
        g.fillStyle(P.pipeLight, 1); g.fillRect(p.x1, p.y + 1, w, 2);
        g.fillStyle(P.pipeDark, 1); g.fillRect(p.x1, p.y + 8, w, 2);
        for (let x = p.x1 + 20; x < p.x2; x += 50) { g.fillStyle(P.pipeDark, 1); g.fillRect(x, p.y - 2, 4, 14); }   // flanges
      } else {                                        // a tiled ledge
        g.fillStyle(P.outline, 1); g.fillRect(p.x1 - 1, p.y - 1, w + 2, 10);
        g.fillStyle(P.tile, 1); g.fillRect(p.x1, p.y, w, 8);
        for (let x = p.x1; x < p.x2; x += 8) { g.fillStyle(P.tileLine, 1); g.fillRect(x, p.y, 1, 8); }
        g.fillStyle(P.water, 0.5); g.fillRect(p.x1 + 2, p.y + 8, w - 4, 2);
      }
    }
  }

  // ---------------------------------------------------------------- per frame
  step(match) {
    this.t++;
    if (this.t % LEVEL_FRAMES === 0) this.startNoclip(match);
    if (this.noclip > 0) this.stepNoclip(match);
    this.drawAmbience();
    this.hzG.clear();
    const out = this.cycle.run(match, []);
    this.drawDarkness(match);
    return out;
  }
  // every minute: static everywhere, then everyone's somewhere else
  startNoclip(match) {
    this.noclip = NOCLIP_FRAMES;
    this.cycle.hz = null; this.cycle.next = 300 + Math.floor(Math.random() * 200);   // a breather before the new level's hazard
    sfx('glitch', 1, 0.5); sfx('buzz', 0.8, 0.6); match.shake(8, 20);
  }
  stepNoclip(match) {
    this.noclip--;
    if (this.noclip === Math.floor(NOCLIP_FRAMES / 2)) {                 // the switch happens behind the static
      this.level = (this.level + 1) % LEVELS.length;
      const L = LEVELS[this.level];
      this.platforms = [this.main, ...L.plats.map((p) => ({ ...p, solid: false }))];
      for (const f of match.fighters) {                                 // standing on something that's gone: fall
        if (f.platform && !this.platforms.includes(f.platform)) { f.platform = null; f.grounded = false; if (['idle', 'run', 'land'].includes(f.state)) f.setState('air'); }
      }
      this.cycle.kinds = L.hazards; this.cycle.last = null;
      this.cycle.style = { color: L.color, stroke: L.stroke };
      if (this.cycle.banner) this.cycle.banner.setColor(L.color).setStroke(L.stroke, 5);
      this.showLevel(this.level);
      this.levelText.setText('NOCLIP!\n' + L.name).setColor(L.color).setVisible(true); this.levelT = 150;
      sfx('ko', 0.5, 0.6); sfx('glitch', 0.9, 1.2);
    }
  }
  drawAmbience() {
    const g = this.bgFx, f = this.fxG, t = this.t, P = BPAL; g.clear(); f.clear();
    if (this.level === 0) {                         // the hum of the lights: panels flickering now and then
      for (let i = 0; i < 9; i++) {
        const x = -40 + i * 90, flick = (t * 7 + i * 31) % 211 < 3;
        g.fillStyle(flick ? P.dead : P.lit, 1); g.fillRect(x, -10, 40, 8);
        if (!flick) { g.fillStyle(P.lit, 0.08); g.fillTriangle(x - 30, 380, x + 70, 380, x + 20, -2); }
      }
    } else if (this.level === 1) {                  // water dripping from the ceiling into puddles
      for (let i = 0; i < 5; i++) {
        const x = -220 + i * 110 + (i % 2) * 30, y = -300 + ((t * 3 + i * 97) % 300);
        f.fillStyle(0x9ab0ba, 0.8); f.fillRect(x, y, 1, 3);
      }
    } else if (this.level === 2) {                  // wisps of steam rising off the pipes
      for (let i = 0; i < 8; i++) {
        const x = 40 + i * 100 + Math.sin(t * 0.02 + i) * 10, y = 400 - ((t * 0.6 + i * 60) % 420);
        g.fillStyle(P.steam, 0.06); g.fillCircle(x, y, 14 + (i % 3) * 4);
      }
    } else {                                        // light rippling on the water and the tiles
      for (let i = 0; i < 14; i++) {
        const x = -100 + ((i * 83 + t * 0.4) % 900), y = 300 + (i % 5) * 9;
        g.fillStyle(P.waterLight, 0.35 + 0.25 * Math.sin(t * 0.05 + i)); g.fillRect(x, y, 10, 1);
      }
    }
    // the level name, after a noclip
    if (this.levelT > 0 && --this.levelT === 0) this.levelText.setVisible(false);
    if (this.levelT > 0) this.levelText.setAlpha(Math.min(1, this.levelT / 20));
  }
  // over everything: the noclip static, and LIGHTS OUT's dark
  drawDarkness(match) {
    const o = this.overG; o.clear();
    if (this.noclip > 0) {
      const k = 1 - Math.abs(this.noclip - NOCLIP_FRAMES / 2) / (NOCLIP_FRAMES / 2);
      o.fillStyle(0x000000, 0.7 * k); o.fillRect(0, 0, 640, 360);
      for (let i = 0; i < 70; i++) { const y = (i * 53 + this.t * 17) % 360; o.fillStyle(i % 3 ? 0xf0f0f0 : 0x4a4a4a, 0.5 * k); o.fillRect((i * 97 + this.t * 31) % 640, y, 4 + (i % 7) * 10, 2); }
    }
    const h = this.cycle.hz;
    if (h && h.kind === 'lights' && h.t > 60) {                          // the dark (with a little light round each fighter)
      const fade = Math.min(1, (h.t - 60) / 20) * Math.min(1, (h.end - h.t) / 20), cam = match.worldCam;
      o.fillStyle(0x000000, 0.86 * fade); o.fillRect(0, 0, 640, 360);
      for (const f of match.fighters) {
        if (!f.alive) continue;
        const sx = (f.x - cam.worldView.x) * cam.zoom, sy = (f.y - 26 - cam.worldView.y) * cam.zoom;
        o.fillStyle(0xfff6b0, 0.06 * fade); o.fillCircle(sx, sy, 40 * cam.zoom);
      }
      if (h.target && h.t < h.lungeAt + 10) {                             // the Smiler's grin in the dark, close to its prey
        const sx = (h.sx - cam.worldView.x) * cam.zoom, sy = (h.sy - cam.worldView.y) * cam.zoom, z = cam.zoom, open = Math.min(1, (h.t - 70) / 30);
        if (open > 0) {
          o.fillStyle(0xffffff, open); o.fillRect(sx - 7 * z, sy - 6 * z, 3 * z, 2 * z); o.fillRect(sx + 4 * z, sy - 6 * z, 3 * z, 2 * z);   // eyes
          for (let i = -6; i <= 6; i++) { const yy = sy + 2 * z + Math.abs(i) * -0.5 * z; o.fillRect(sx + i * 1.4 * z, yy, 1.2 * z, (i % 2 ? 3 : 2) * z); }   // the grin
        }
      }
    }
  }

  // ---------------------------------------------------------------- hazards
  // LIGHTS OUT (LEVEL 0): the lights die for about 6 seconds; a Smiler grins at someone in the dark... then lunges
  start_lights(match, h) {
    h.title = 'LIGHTS OUT'; h.end = 420; h.lungeAt = 220;
    const alive = match.fighters.filter((f) => f.alive && f.state !== 'respawn');
    h.target = alive.length ? alive[Math.floor(Math.random() * alive.length)] : null;
    h.side = Math.random() < 0.5 ? -1 : 1;
  }
  step_lights(match, h, out) {
    if (h.t === 60) { sfx('buzz', 0.9, 0.5); sfx('glitch', 0.6, 0.4); }
    const T = h.target;
    if (T && T.alive) { h.sx = T.x + h.side * 34; h.sy = T.y - 40; }
    if (h.t === h.lungeAt - 40) sfx('curse', 0.6, 0.5);
    if (T && h.t >= h.lungeAt && h.t <= h.lungeAt + 6) {
      if (h.t === h.lungeAt) { sfx('bighit', 0.8, 0.5); match.shake(6, 6); }
      out.push({ x1: T.x - 20, x2: T.x + 20, y1: T.y - 56, y2: T.y, dmg: 12, angle: 60, base: 4.0, growth: 4.2, dirX: -h.side, id: 'smiler' + h.id, hazard: true });
    }
    return h.t >= h.end;
  }
  // FALLING CRATES (LEVEL 1): shadows on the floor, then crates drop out of the dark ceiling
  start_crates(match, h) {
    h.title = 'FALLING CRATES';
    const M = this.main;
    h.crates = Array.from({ length: 4 }, (_, i) => ({ x: M.x1 + 40 + Math.random() * (M.x2 - M.x1 - 80), at: 70 + i * 22, y: -420, vy: 0, done: false }));
  }
  step_crates(match, h, out) {
    const g = this.hzG, P = BPAL;
    let all = true;
    for (const c of h.crates) {
      if (c.done) continue; all = false;
      if (h.t < c.at) { g.fillStyle(0x000000, 0.25 + 0.2 * Math.sin(h.t * 0.4)); g.fillEllipse(c.x, 2, 34, 6); continue; }   // the shadow grows
      c.vy = Math.min(12, c.vy + 0.6); c.y += c.vy;
      g.fillStyle(P.outline, 1); g.fillRect(c.x - 15, c.y - 30, 30, 30);
      g.fillStyle(P.crate, 1); g.fillRect(c.x - 14, c.y - 29, 28, 28);
      g.fillStyle(P.crateDark, 1); g.fillRect(c.x - 14, c.y - 16, 28, 2); g.fillRect(c.x - 12, c.y - 29, 2, 28);
      out.push({ x1: c.x - 15, x2: c.x + 15, y1: c.y - 30, y2: c.y, dmg: 10, angle: 75, base: 3.6, growth: 4.0, id: 'crate' + h.id + ':' + c.at, hazard: true });
      if (c.y >= 0) { c.done = true; sfx('bighit', 0.6, 0.7); match.shake(5, 5); match.puff(c.x, -4, P.crateLight, 10); match.puff(c.x, -4, P.crateDark, 6); }
    }
    return all && h.t > 80;
  }
  // STEAM VENTS (LEVEL 2): spots on the floor hiss... then scalding columns of steam blast up
  start_steam(match, h) {
    h.title = 'STEAM VENTS';
    const M = this.main, n = 3;
    h.vents = Array.from({ length: n }, (_, i) => ({ x: M.x1 + 50 + (i + Math.random() * 0.6) * ((M.x2 - M.x1 - 100) / n) }));
  }
  step_steam(match, h, out) {
    const g = this.hzG, P = BPAL, warn = 80, blast = 70;
    for (const v of h.vents) {
      if (h.t < warn) {                                                  // hissing: little puffs and a glowing grate
        g.fillStyle(0xff8a3a, 0.4 + 0.3 * ((h.t >> 2) % 2)); g.fillRect(v.x - 10, -2, 20, 3);
        if (h.t % 6 === 0) match.puff(v.x, -4, P.steam, 1);
        if (h.t % 20 === 0) sfx('smoke', 0.25, 1.6);
      } else if (h.t < warn + blast) {
        const k = Math.min(1, (h.t - warn) / 6), ht = 170 * k, w = 26 + Math.sin(h.t * 0.6) * 3;
        g.fillStyle(P.steam, 0.55); g.fillRect(v.x - w / 2, -ht, w, ht);
        g.fillStyle(0xffffff, 0.7); g.fillRect(v.x - w / 4, -ht * 0.9, w / 2, ht * 0.9);
        if (h.t % 3 === 0) match.particles.push({ shape: 'smoke', x: v.x + (Math.random() - 0.5) * w, y: -ht, vx: (Math.random() - 0.5), vy: -1, life: 30, maxLife: 30, color: P.steam, grav: -0.02, r: 6 });
        if (h.t === warn) { sfx('geyser', 0.8, 1.4); match.shake(3, 4); }
        out.push({ x1: v.x - w / 2, x2: v.x + w / 2, y1: -ht, y2: 2, dmg: 4, angle: 88, base: 3.2, growth: 2.2, id: 'steam' + h.id + ':' + Math.round(v.x) + ':' + Math.floor((h.t - warn) / 20), hazard: true });
      }
    }
    return h.t >= warn + blast;
  }
  // THE SURGE (LEVEL 37): the pool overflows - a wave of water sweeps the floor from one side to the other
  start_surge(match, h) { h.title = 'THE SURGE'; h.dir = Math.random() < 0.5 ? 1 : -1; h.x = h.dir > 0 ? this.main.x1 - 80 : this.main.x2 + 80; }
  step_surge(match, h, out) {
    const g = this.hzG, P = BPAL, warn = 80;
    if (h.t < warn) {                                                    // the water rising at that edge
      const ex = h.dir > 0 ? this.main.x1 : this.main.x2;
      g.fillStyle(P.water, 0.5 + 0.2 * Math.sin(h.t * 0.3)); g.fillRect(ex - (h.dir > 0 ? 0 : 30), -6 - (h.t / warn) * 10, 30, 8 + (h.t / warn) * 10);
      if (h.t % 25 === 0) sfx('geyser', 0.3, 0.7);
      return false;
    }
    h.x += h.dir * 5.5;
    const x = h.x, hgt = 46;
    g.fillStyle(P.waterDeep, 0.85); g.fillRect(x - 40, -hgt, 80, hgt);
    g.fillStyle(P.water, 0.9); g.fillRect(x - 36 + h.dir * 6, -hgt - 6, 70, 10);
    g.fillStyle(P.waterLight, 1); g.fillRect(x - 30 + h.dir * 10, -hgt - 6, 50, 3);
    if (h.t % 3 === 0) match.particles.push({ shape: 'drop', x: x + h.dir * 34, y: -hgt, vx: h.dir * 2, vy: -2 - Math.random() * 2, life: 24, color: P.waterLight, grav: 0.2 });
    if (h.t === warn) sfx('geyser', 0.9, 0.8);
    out.push({ x1: x - 40, x2: x + 40, y1: -hgt, y2: 2, dmg: 6, angle: 30, base: 4.4, growth: 2.4, dirX: h.dir, id: 'surge' + h.id, hazard: true });
    return h.dir > 0 ? x > this.main.x2 + 100 : x < this.main.x1 - 100;
  }
}

// Miniature of the Backrooms for the select screen: the yellow room, a light panel, the floor
export function drawBackroomsPreview(g, x, y, w, h) {
  const P = BPAL;
  g.fillStyle(P.wall, 1); g.fillRect(x, y, w, h);
  for (let sx = x; sx < x + w; sx += 4) { g.fillStyle(P.wallStripe, 1); g.fillRect(sx, y + h * 0.3, 1, h * 0.7); }
  g.fillStyle(P.ceil, 1); g.fillRect(x, y, w, h * 0.28);
  for (let i = 0; i < 3; i++) { g.fillStyle(P.lit, 1); g.fillRect(x + w * (0.12 + i * 0.32), y + h * 0.1, w * 0.16, 3); }
  g.fillStyle(P.wallDark, 1); g.fillRect(x + w * 0.62, y + h * 0.36, w * 0.14, h * 0.4);       // a doorway
  g.fillStyle(0xb8a24a, 1); g.fillRect(x + w * 0.64, y + h * 0.4, w * 0.1, h * 0.36);
  const top = y + h * 0.72;
  g.fillStyle(P.outline, 1); g.fillRect(x + w * 0.12, top - 1, w * 0.76, 5);
  g.fillStyle(P.carpet, 1); g.fillRect(x + w * 0.13, top, w * 0.74, 3);
  for (let r = 1; r < 5; r++) { g.fillStyle(r < 3 ? P.wallStripe : P.wallDark, 1); g.fillRect(x + w * (0.13 + r * 0.04), top + r * 3, w * (0.74 - r * 0.08), 3); }
  g.fillStyle(P.carpet, 1); g.fillRect(x + w * 0.22, top - h * 0.2, w * 0.18, 2); g.fillRect(x + w * 0.6, top - h * 0.2, w * 0.18, 2);
}

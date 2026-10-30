// DUST RUNNER: an old motorhome barrelling down a desert highway at full speed - and you're fighting on its roof.
// The whole world rushes past: the road, the dust, the telephone poles, the cacti, the mesas far off. The roof is the
// stage (plus the luggage rack at the back and the air-con box). Fall off and you land on the road, which drags you
// away backwards at highway speed - you get one good jump to make it back up (or a grab at the roof's edge) before
// you're left behind. Get caught in front of it and the bumper hits you.
// The only hazard: THE SWAT VAN - a black armoured van pulls up behind, two officers climb out of its roof hatch, red
// laser sights sweep the roof, bursts of gunfire follow, and they lob grenades that bounce and blink before they go
// off. Last, one of them shoulders a rocket launcher, takes a long aim and fires once (20%). Then it falls back.
// Original - no real show, people or vehicles. Locked until the shopkeeper's code HEISENBERG (stage entry `secret`).
// Music: 'bgm_desert' (tools/audio/desert_music.py).
import { sfx } from '../audio/sfx.js';
import { HazardCycle } from './hazardCycle.js';

export const DPAL = {
  sky: [0x3a6ab8, 0x4a7cc4, 0x5e90cc, 0x78a4d0, 0x96b8d4, 0xc4c8c0, 0xe8c898], sun: 0xfff2c8,
  mesa: 0xb8643a, mesaLit: 0xd8844a, mesaFar: 0xc89a7a, sand: 0xe0b078, sandDark: 0xc08a58, sandLit: 0xf0c890,
  road: 0x3a3836, roadLit: 0x4a4846, line: 0xf0d050, edge: 0xe8e4d8, cactus: 0x4a7a3a, cactusLit: 0x6a9a4a, pole: 0x5a3e28,
  body: 0xe8ecec, bodyShade: 0xc0c8cc, stripe: 0x3a8aa8, stripe2: 0x2a6080, rust: 0x9a5a30, glass: 0x2a3a4a, glassLit: 0x6a8aa0,
  tyre: 0x161616, hub: 0x9a9a9a, chrome: 0xd8dce0, outline: 0x0e0c0c, dust: 0xd8b888,
  van: 0x16181c, vanLit: 0x2a2e34, swat: 0x1e2228, visor: 0x1a2a3a, red: 0xff2a2a, blue: 0x2a6aff,
};

// the highway: how fast the road drags you backwards when you're standing on it, and how fast the scenery goes by
const ROAD = { y: 104, drag: 5.2, scroll: 7 };
// the bumper: a hit for anyone stuck in front of the motorhome on the road
const BUMPER = { dmg: 10, angle: 75, base: 6.0, growth: 3.4 };   // (thrown up and back over the roof)
// THE SWAT VAN: how long it takes to pull up, the volleys (laser sights first, then a burst), the grenades, and the hits
const SWAT = { arrive: 90, volleys: 3, aim: 46, burst: 3, gap: 7, bulletSpeed: 14, shot: { dmg: 3, angle: 30, base: 2.4, growth: 1.4 },
  grenades: 2, fuse: 70, radius: 38, boom: { dmg: 13, angle: 70, base: 5.0, growth: 4.4 }, ram: { dmg: 12, angle: 150, base: 6.0, growth: 3.4 } };
// the ROCKET: after the gunfire one officer shoulders a launcher - a long aim with a red sight, then one rocket
const ROCKET = { aim: 75, speed: 8.5, radius: 44, hit: { dmg: 20, angle: 60, base: 7.0, growth: 5.2 } };

export class DesertStage {
  constructor(scene) {
    this.scene = scene;
    this.platforms = [
      { x1: -150, x2: 150, y: 0, solid: true, bottom: ROAD.y - 14 },   // the motorhome's roof (its body is a wall down to the wheels)
      { x1: -138, x2: -78, y: -42, solid: false },                     // the luggage rack at the back
      { x1: 22, x2: 70, y: -22, solid: false },                        // the air-con box
      { x1: -1200, x2: 1200, y: ROAD.y, solid: true, bottom: 400, road: true },   // the road: it drags you away (ROAD.drag)
    ];
    this.spawns = [{ x: -100, y: 0 }, { x: 100, y: 0 }, { x: -40, y: 0 }, { x: 40, y: 0 }];
    this.hazardsOn = true;
    this.music = 'bgm_desert';
    this.t = 0;
    this.cycle = new HazardCycle(this, ['swat'], { color: '#ff3a3a', stroke: '#06080e', gap: 1000, jitter: 400, first: 700 });   // (it doesn't come round too often)
  }

  // ---------------------------------------------------------------- drawing
  draw(worldLayer, bgLayer) {
    const s = this.scene, P = DPAL;
    const sky = s.add.graphics().setScrollFactor(0);
    P.sky.forEach((c, i) => { sky.fillStyle(c, 1); sky.fillRect(-400, -60 + i * 52, 1440, 53); });
    sky.fillStyle(P.sky[6], 1); sky.fillRect(-400, 300, 1440, 300);
    sky.fillStyle(P.sun, 0.25); sky.fillCircle(470, 90, 40); sky.fillStyle(P.sun, 1); sky.fillCircle(470, 90, 18);
    for (const [x, y, w] of [[120, 60, 90], [300, 40, 60], [640, 70, 110]]) { sky.fillStyle(0xffffff, 0.5); sky.fillEllipse(x, y, w, 12); sky.fillEllipse(x + w * 0.2, y - 5, w * 0.5, 10); }
    bgLayer.push(sky);
    // scenery that scrolls past, drawn every frame: far mesas (slow), near desert with cacti and telephone poles (fast)
    this.farG = s.add.graphics().setScrollFactor(0.1); bgLayer.push(this.farG);
    this.midG = s.add.graphics().setScrollFactor(0.4); bgLayer.push(this.midG);
    this.roadG = s.add.graphics(); worldLayer.push(this.roadG);     // the road surface, its lines rushing by
    this.vanG = s.add.graphics(); worldLayer.push(this.vanG);       // the SWAT van (behind the motorhome)
    this.rvBodyG = s.add.graphics(); this.rvBody(this.rvBodyG); worldLayer.push(this.rvBodyG);   // the motorhome itself (drawn once)
    this.rvG = s.add.graphics(); worldLayer.push(this.rvG);         // its wheels, exhaust, dust (redrawn every tick)
    this.puffs = [];
    this.hzG = s.add.graphics(); worldLayer.push(this.hzG);         // bullets, lasers, grenades, blasts
    this.cycle.makeBanner(s);
  }

  // the far mesas and buttes: two bands of flat-topped red rock, scrolling slowly to the left
  far(g, t) {
    const P = DPAL, o = (t * 0.25) % 640;
    g.clear();
    for (let k = -1; k < 3; k++) {
      const ox = k * 640 - o;
      g.fillStyle(P.mesaFar, 1);
      for (const [x, w, h] of [[0, 160, 50], [210, 90, 70], [360, 200, 40], [520, 80, 80]]) { g.fillRect(ox + x, 250 - h, w, h + 60); g.fillTriangle(ox + x - 20, 310, ox + x, 250 - h, ox + x, 310); g.fillTriangle(ox + x + w, 250 - h, ox + x + w + 20, 310, ox + x + w, 310); }
      g.fillStyle(P.mesa, 1);
      for (const [x, w, h] of [[60, 120, 80], [330, 70, 110], [470, 140, 60]]) {
        g.fillRect(ox + x, 270 - h, w, h + 60); g.fillTriangle(ox + x - 26, 330, ox + x, 270 - h, ox + x, 330); g.fillTriangle(ox + x + w, 270 - h, ox + x + w + 26, 330, ox + x + w, 330);
        g.fillStyle(P.mesaLit, 1); g.fillRect(ox + x, 270 - h, w, 4); for (let y = 270 - h + 14; y < 300; y += 16) g.fillRect(ox + x + 4, y, w - 8, 2); g.fillStyle(P.mesa, 1);
      }
    }
    g.fillStyle(P.sand, 1); g.fillRect(-400, 300, 1600, 300);
  }
  // the near desert: sand with scrub, cacti and telephone poles (wire swooping between them) flying past
  mid(g, t) {
    const P = DPAL, o = (t * 3) % 300;
    g.clear();
    g.fillStyle(P.sandDark, 1); g.fillRect(-500, 200, 2000, 300);
    for (let i = 0; i < 40; i++) { const x = ((i * 97 - t * 3.6) % 1400 + 1400) % 1400 - 400; g.fillStyle(P.sandLit, 0.7); g.fillRect(x, 210 + (i * 23) % 60, 10 + (i % 4) * 6, 2); }
    for (let k = -2; k < 6; k++) {
      const x = k * 300 - o;
      g.fillStyle(P.pole, 1); g.fillRect(x, 60, 4, 150); g.fillRect(x - 12, 72, 28, 3);                  // a telephone pole
      g.lineStyle(1, 0x2a2018, 0.7); for (const dy of [0, 8]) { for (let s = 0; s < 10; s++) { const a = s / 10, b = (s + 1) / 10; g.lineBetween(x - 10 + a * 300, 74 + dy + Math.sin(a * Math.PI) * 22, x - 10 + b * 300, 74 + dy + Math.sin(b * Math.PI) * 22); } }
      const cx = x + 140, ch = 40 + (k * 37 % 3 + 3) % 3 * 12;                                            // a saguaro
      g.fillStyle(P.cactus, 1); g.fillRect(cx - 5, 210 - ch, 10, ch); g.fillRect(cx - 18, 210 - ch * 0.7, 8, ch * 0.3); g.fillRect(cx - 18, 210 - ch * 0.7 + ch * 0.25, 13, 6); g.fillRect(cx + 10, 210 - ch * 0.8, 8, ch * 0.35); g.fillRect(cx + 5, 210 - ch * 0.8 + ch * 0.3, 13, 6);
      g.fillStyle(P.cactusLit, 1); g.fillRect(cx - 4, 210 - ch, 2, ch);
      g.fillStyle(0x8a7a4a, 1); g.fillEllipse(x + 60, 212, 22, 8); g.fillEllipse(x + 230, 214, 16, 6);    // scrub
    }
  }
  // the road: asphalt, white edge lines, yellow dashes rushing back, the motorhome's shadow
  road(g, t) {
    const P = DPAL, y = ROAD.y;
    g.clear();
    g.fillStyle(P.road, 1); g.fillRect(-1300, y, 2600, 60); g.fillStyle(P.roadLit, 1); g.fillRect(-1300, y, 2600, 3);
    g.fillStyle(P.edge, 1); g.fillRect(-1300, y + 4, 2600, 2); g.fillRect(-1300, y + 54, 2600, 2);
    const o = (t * ROAD.scroll) % 80;
    for (let x = -1320 - o; x < 1300; x += 80) { g.fillStyle(P.line, 1); g.fillRect(x, y + 28, 40, 3); }
    g.fillStyle(P.sandDark, 1); g.fillRect(-1300, y + 60, 2600, 300);
    g.fillStyle(0x000000, 0.25); g.fillEllipse(0, y + 4, 330, 12);
  }
  // the motorhome, drawn once (rvBody): a long 1980s camper in cream and white with a teal-and-orange swoosh along its side,
  // an over-cab bunk with a little window, a cab with a raked windscreen, chrome grille, round headlights and a plate,
  // aluminium-framed windows with curtains, a rolled-up awning, an entry door with a fold-down step, storage hatches
  // along the skirt, marker lights, panel seams and rivets, a crank-up TV aerial and a roof vent, a ladder and a spare
  // tyre in a cover at the back, mud flaps, road grime and a little rust
  rvBody(g) {
    const P = DPAL, top = 0, bot = ROAD.y - 14, x1 = -150, x2 = 150, cab = 112;
    const C = { cream: 0xf4eedc, creamShade: 0xd8d0b8, white: 0xfafaf6, trim: 0xb8c0c4, trimDark: 0x7a8288, teal: 0x2a9aa8, tealDark: 0x1a6a78,
      orange: 0xe8782a, curtain: 0xc8963a, curtainShade: 0x9a6a24, grime: 0xa89070, plate: 0xf0e8c0 };
    // the box: outline, cream lower half, white upper, the cab cut in under the over-cab bunk
    g.fillStyle(P.outline, 1); g.fillRect(x1 - 2, top - 2, cab - x1 + 2, bot - top + 4); g.fillRect(x1 - 2, top - 2, x2 - x1 + 4, 26);
    g.fillCircle(x2 - 6, top + 8, 9);                                                                                    // (the bunk's rounded nose, outlined)
    g.fillStyle(C.white, 1); g.fillRect(x1, top, cab - x1, 46); g.fillRect(x1, top, x2 - x1, 22);
    g.fillStyle(C.cream, 1); g.fillRect(x1, top + 46, cab - x1, bot - top - 46);
    g.fillStyle(C.creamShade, 1); g.fillRect(x1, bot - 16, cab - x1, 16);
    // the over-cab bunk's rounded nose and its little window
    g.fillStyle(C.white, 1); g.fillRect(cab, top, x2 - cab - 4, 22); g.fillCircle(x2 - 6, top + 8, 7); g.fillRect(x2 - 10, top + 8, 10, 14);
    g.fillStyle(C.trimDark, 1); g.fillRect(cab + 6, top + 6, 16, 9); g.fillStyle(P.glass, 1); g.fillRect(cab + 7, top + 7, 14, 7); g.fillStyle(P.glassLit, 1); g.fillRect(cab + 8, top + 7, 4, 1);
    // the cab: a raked windscreen, a side window with the driver's dark shape, the door, the hood and grille
    const cy = top + 22;
    g.fillStyle(P.outline, 1); g.fillRect(cab - 2, cy - 2, 48, bot - cy + 4);
    g.fillStyle(C.white, 1); g.fillRect(cab, cy, 40, bot - cy); g.fillStyle(C.cream, 1); g.fillRect(cab, cy + 26, 40, bot - cy - 26);
    g.fillStyle(P.glass, 1); g.fillRect(cab + 4, cy + 3, 18, 16); g.fillStyle(0x10161c, 1); g.fillCircle(cab + 12, cy + 12, 5); g.fillRect(cab + 7, cy + 15, 10, 4);   // the driver (just a shape)
    g.fillStyle(P.glassLit, 1); g.fillRect(cab + 5, cy + 4, 3, 1);
    g.fillStyle(P.glass, 1); g.fillTriangle(cab + 26, cy + 2, cab + 38, cy + 2, cab + 44, cy + 22); g.fillRect(cab + 26, cy + 2, 12, 20);   // the windscreen, raked
    g.fillStyle(P.glassLit, 1); g.fillTriangle(cab + 28, cy + 3, cab + 33, cy + 3, cab + 28, cy + 12);
    g.lineStyle(1, 0x1a1a1a, 1); g.lineBetween(cab + 30, cy + 21, cab + 40, cy + 12);                                       // a wiper
    g.lineStyle(1, C.trimDark, 1); g.strokeRect(cab + 2, cy + 1, 22, bot - cy - 6); g.fillStyle(C.trim, 1); g.fillRect(cab + 18, cy + 30, 4, 2);   // the cab door + handle
    g.fillStyle(P.outline, 1); g.fillRect(x2 - 4, cy + 20, 14, bot - cy - 20);                                               // the hood front
    g.fillStyle(C.white, 1); g.fillRect(x2 - 2, cy + 22, 10, bot - cy - 24);
    g.fillStyle(P.chrome, 1); g.fillRect(x2 + 2, cy + 30, 6, 22); for (let y = cy + 31; y < cy + 52; y += 3) { g.fillStyle(0x5a6064, 1); g.fillRect(x2 + 3, y, 4, 1); }   // the grille
    g.fillStyle(P.chrome, 1); g.fillCircle(x2 + 5, cy + 26, 3); g.fillStyle(0xfff8d8, 1); g.fillCircle(x2 + 5, cy + 26, 2);     // a round headlight
    g.fillStyle(0xffa020, 1); g.fillRect(x2 + 2, cy + 54, 4, 3);                                                             // the indicator
    g.fillStyle(P.chrome, 1); g.fillRect(x2 - 4, bot - 10, 16, 6); g.fillStyle(0xffffff, 0.7); g.fillRect(x2 - 4, bot - 10, 16, 1);   // the chrome bumper
    g.fillStyle(C.plate, 1); g.fillRect(x2 + 2, bot - 18, 9, 6); g.fillStyle(0x2a3a6a, 1); g.fillRect(x2 + 3, bot - 16, 7, 1); g.fillRect(x2 + 3, bot - 14, 5, 1);   // a plate (no real number)
    g.fillStyle(P.chrome, 1); g.fillRect(cab + 24, cy - 4, 2, 10); g.fillRect(cab + 22, cy - 6, 6, 5);                     // the side mirror
    // the swoosh: teal, dark teal and orange bands running the length, sweeping up over the bunk at the front
    for (const [dy, h, c] of [[44, 5, C.teal], [50, 3, C.tealDark], [54, 2, C.orange]]) {
      g.fillStyle(c, 1); g.fillRect(x1, top + dy, cab - x1 - 30, h);
      g.fillPoints([{ x: cab - 30, y: top + dy }, { x: cab + 8, y: top + dy - 30 }, { x: cab + 8, y: top + dy - 30 + h }, { x: cab - 30, y: top + dy + h }], true);
      g.fillRect(cab + 8, top + dy - 30, x2 - cab - 12, h);
    }
    // the roof edge: an aluminium drip rail with rivets, marker lights (red at the back, amber further forward)
    g.fillStyle(C.trim, 1); g.fillRect(x1, top, x2 - x1, 3); g.fillStyle(C.trimDark, 1); g.fillRect(x1, top + 3, x2 - x1, 1);
    for (let x = x1 + 6; x < x2 - 4; x += 10) { g.fillStyle(C.trimDark, 1); g.fillRect(x, top + 1, 1, 1); }
    g.fillStyle(0xd82020, 1); g.fillRect(x1 + 1, top + 5, 3, 4); g.fillStyle(0xffa020, 1); g.fillRect(x1 + 100, top + 5, 3, 2); g.fillRect(cab - 8, top + 5, 3, 2);
    // panel seams down the side
    for (const x of [x1 + 40, x1 + 100, x1 + 180, x1 + 230]) { g.fillStyle(C.creamShade, 0.8); g.fillRect(x, top + 4, 1, bot - top - 20); }
    // the rolled-up awning under the roof edge: an aluminium tube, its striped fabric peeking out, two arms
    g.fillStyle(C.trimDark, 1); g.fillRect(x1 + 46, top + 5, 150, 6); g.fillStyle(C.trim, 1); g.fillRect(x1 + 46, top + 5, 150, 2);
    for (let x = x1 + 46; x < x1 + 196; x += 6) { g.fillStyle(x % 12 ? C.teal : C.white, 1); g.fillRect(x, top + 11, 6, 2); }
    for (const x of [x1 + 48, x1 + 192]) { g.fillStyle(C.trimDark, 1); g.fillRect(x, top + 11, 2, 34); }
    // the windows: aluminium frames, glass, curtains half drawn (tie-backs), a plant in one
    for (const [wx, ww] of [[x1 + 16, 34], [x1 + 64, 34], [x1 + 190, 30]]) {
      g.fillStyle(C.trim, 1); g.fillRect(wx - 2, top + 14, ww + 4, 26); g.fillStyle(P.glass, 1); g.fillRect(wx, top + 16, ww, 22);
      g.fillStyle(C.curtain, 1); g.fillRect(wx, top + 16, 7, 22); g.fillRect(wx + ww - 7, top + 16, 7, 22);
      g.fillStyle(C.curtainShade, 1); g.fillRect(wx + 2, top + 16, 1, 22); g.fillRect(wx + ww - 4, top + 16, 1, 22); g.fillRect(wx, top + 26, 7, 2); g.fillRect(wx + ww - 7, top + 26, 7, 2);
      g.fillStyle(C.curtain, 1); g.fillRect(wx, top + 16, ww, 3);                                                          // the valance
      g.fillStyle(P.glassLit, 1); g.fillRect(wx + 9, top + 20, 6, 1); g.fillRect(wx + 9, top + 21, 3, 1);
      g.fillStyle(C.trimDark, 1); g.fillRect(wx + ww / 2, top + 16, 1, 22);                                                // the sliding pane's frame
    }
    g.fillStyle(0x3a7a3a, 1); g.fillCircle(x1 + 81, top + 33, 4); g.fillCircle(x1 + 78, top + 31, 3); g.fillStyle(0xb8643a, 1); g.fillRect(x1 + 77, top + 35, 7, 3);   // a potted plant on the sill
    // the entry door: a window, a handle, a grab rail, a porch light, the fold-down step
    const dx = x1 + 122;
    g.fillStyle(P.outline, 1); g.fillRect(dx - 1, top + 9, 28, bot - top - 9); g.fillStyle(C.white, 1); g.fillRect(dx, top + 10, 26, bot - top - 26); g.fillStyle(C.cream, 1); g.fillRect(dx, top + 46, 26, bot - top - 46);
    for (const [dy, h, c] of [[44, 5, C.teal], [50, 3, C.tealDark], [54, 2, C.orange]]) { g.fillStyle(c, 1); g.fillRect(dx, top + dy, 26, h); }
    g.fillStyle(C.trim, 1); g.fillRect(dx + 4, top + 13, 18, 14); g.fillStyle(P.glass, 1); g.fillRect(dx + 5, top + 14, 16, 12); g.fillStyle(C.curtain, 1); g.fillRect(dx + 5, top + 14, 16, 3);
    g.fillStyle(P.chrome, 1); g.fillRect(dx + 21, top + 40, 3, 3); g.fillRect(dx - 4, top + 24, 2, 26);
    g.fillStyle(0xfff4c0, 1); g.fillRect(dx + 8, top + 6, 8, 3); g.fillStyle(C.trimDark, 1); g.fillRect(dx + 8, top + 9, 8, 1);
    g.fillStyle(C.trimDark, 1); g.fillRect(dx - 2, bot - 2, 30, 3); g.fillStyle(C.trim, 1); g.fillRect(dx, bot - 2, 26, 1);  // the step
    // the skirt: storage hatches with latches, the propane cover, the fuel cap
    for (const [hx, hw] of [[x1 + 6, 22], [x1 + 64, 40], [x1 + 156, 30], [x1 + 192, 26]]) { g.lineStyle(1, C.trimDark, 1); g.strokeRect(hx, bot - 30, hw, 14); g.fillStyle(C.trimDark, 1); g.fillRect(hx + hw / 2 - 2, bot - 24, 4, 2); }
    g.fillStyle(C.trim, 1); g.fillRect(x1 + 108, bot - 30, 10, 12); for (let y = bot - 28; y < bot - 19; y += 2) { g.fillStyle(C.trimDark, 1); g.fillRect(x1 + 109, y, 8, 1); }   // propane vents
    g.fillStyle(C.trimDark, 1); g.fillCircle(x1 + 226, bot - 34, 3); g.fillStyle(C.trim, 1); g.fillCircle(x1 + 226, bot - 34, 2);   // fuel cap
    // road grime along the bottom, a few rust spots
    for (let x = x1; x < cab + 40; x += 3) { g.fillStyle(C.grime, 0.35 + ((x * 7) % 5) * 0.06); g.fillRect(x, bot - 6 - ((x * 13) % 4), 3, 6 + ((x * 13) % 4)); }
    g.fillStyle(P.rust, 0.85); g.fillRect(x1 + 30, bot - 10, 6, 3); g.fillRect(x1 + 34, bot - 12, 3, 2); g.fillRect(cab - 20, bot - 9, 4, 4); g.fillRect(x1 + 2, top + 30, 2, 7);
    // the back: the ladder, the tail lights, the spare tyre in a teal cover with a sun on it
    g.fillStyle(0xd82020, 1); g.fillRect(x1 - 1, bot - 26, 3, 10); g.fillStyle(0xffa020, 1); g.fillRect(x1 - 1, bot - 15, 3, 3);
    g.fillStyle(P.outline, 1); g.fillCircle(x1 - 6, top + 52, 13); g.fillStyle(C.teal, 1); g.fillCircle(x1 - 6, top + 52, 12); g.fillStyle(C.tealDark, 1); g.fillCircle(x1 - 6, top + 52, 7);
    g.fillStyle(C.orange, 1); g.fillCircle(x1 - 6, top + 52, 4); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.fillRect(x1 - 6 + Math.cos(a) * 6 - 0.5, top + 52 + Math.sin(a) * 6 - 0.5, 1.5, 1.5); }
    g.lineStyle(2, P.chrome, 1); g.lineBetween(x1 + 4, top - 42, x1 + 4, bot - 34); g.lineBetween(x1 + 12, top - 42, x1 + 12, bot - 34); for (let y = top - 36; y < bot - 34; y += 9) g.lineBetween(x1 + 4, y, x1 + 12, y);
    g.lineStyle(1, 0xffffff, 0.5); g.lineBetween(x1 + 4, top - 42, x1 + 4, top - 10);
    // up on the roof: a crank-up TV aerial (folded) and a translucent roof vent dome
    g.fillStyle(C.trimDark, 1); g.fillRect(-20, top - 4, 4, 4); g.lineStyle(1, C.trim, 1); g.lineBetween(-18, top - 4, -2, top - 8); g.lineBetween(-2, top - 8, 8, top - 6); g.lineBetween(-6, top - 10, 2, top - 6);
    g.fillStyle(C.trimDark, 1); g.fillRect(84, top - 4, 18, 4); g.fillStyle(0xd8e4e8, 1); g.fillEllipse(93, top - 4, 14, 6); g.fillStyle(0xffffff, 0.8); g.fillRect(89, top - 6, 3, 1);
    // the luggage rack at the back of the roof (a ledge): chrome rails, a strapped-down tarp, a bicycle wheel poking out
    const R = this.platforms[1];
    g.fillStyle(0x6a5a3a, 1); g.fillRect(R.x1 + 4, R.y + 4, R.x2 - R.x1 - 8, -R.y - 6); g.fillStyle(0x8a7a52, 1); g.fillRect(R.x1 + 4, R.y + 4, R.x2 - R.x1 - 8, 4);
    for (let x = R.x1 + 8; x < R.x2 - 6; x += 9) { g.fillStyle(0x5a4a2e, 1); g.fillRect(x, R.y + 9, 1, -R.y - 12); }            // its folds
    g.lineStyle(2, 0x2a2a2a, 1); g.strokeCircle(R.x2 - 12, R.y + 12, 7); g.lineStyle(1, 0x8a8a8a, 1); g.lineBetween(R.x2 - 12, R.y + 5, R.x2 - 12, R.y + 19);
    g.lineStyle(2, 0xc8401e, 1); g.lineBetween(R.x1 + 16, R.y + 3, R.x1 + 16, -2); g.lineBetween(R.x2 - 24, R.y + 3, R.x2 - 24, -2);   // straps
    g.lineStyle(2, P.chrome, 1); g.strokeRect(R.x1, R.y, R.x2 - R.x1, -R.y); for (let x = R.x1 + 10; x < R.x2; x += 10) g.lineBetween(x, R.y, x, R.y + 3);
    // the air-con box (a ledge): a white shroud with louvres and a little shine
    const A = this.platforms[2];
    g.fillStyle(P.outline, 1); g.fillRect(A.x1 - 1, A.y - 1, A.x2 - A.x1 + 2, -A.y + 1); g.fillStyle(C.trim, 1); g.fillRect(A.x1, A.y, A.x2 - A.x1, -A.y); g.fillStyle(C.white, 1); g.fillRect(A.x1, A.y, A.x2 - A.x1, 4);
    for (let x = A.x1 + 4; x < A.x2 - 2; x += 4) { g.fillStyle(C.trimDark, 1); g.fillRect(x, A.y + 7, 2, -A.y - 10); }
    g.fillStyle(0xffffff, 0.8); g.fillRect(A.x1 + 3, A.y + 1, 10, 1);
    // the wheel arches (dark, shaded) and mud flaps behind each wheel
    for (const wx of [x1 + 40, x2 - 60]) {
      g.fillStyle(P.outline, 1); g.fillCircle(wx, bot + 2, 17); g.fillRect(wx - 17, bot - 2, 34, 6);
      g.fillStyle(0x1a1a1a, 1); g.fillRect(wx - 22, bot - 2, 4, 14); g.fillStyle(0x3a3a3a, 1); g.fillRect(wx - 22, bot - 2, 4, 2);
    }
    g.fillStyle(0x2a2a2a, 1); g.fillRect(x1 - 6, bot - 4, 10, 3);                                                          // the exhaust pipe at the back
  }
  // the parts that move: wheels turning (chrome hubcaps, lug nuts, a tread that blurs), exhaust puffs, a blinking marker,
  // the dust cloud behind it
  rv(g, t) {
    const P = DPAL, bot = ROAD.y - 14, x1 = -150, x2 = 150;
    const bob = Math.round(Math.sin(t * 0.5) * 0.6);
    g.clear();
    for (const wx of [x1 + 40, x2 - 60]) {
      const wy = bot + 2 + bob, a = -t * 0.6;
      g.fillStyle(P.tyre, 1); g.fillCircle(wx, wy, 13);
      g.lineStyle(1, 0x2a2a2a, 1); for (let k = 0; k < 8; k++) { const b = a + k * Math.PI / 4; g.lineBetween(wx + Math.cos(b) * 10, wy + Math.sin(b) * 10, wx + Math.cos(b) * 13, wy + Math.sin(b) * 13); }   // the tread
      g.fillStyle(P.chrome, 1); g.fillCircle(wx, wy, 7); g.fillStyle(0xffffff, 0.6); g.fillCircle(wx - 2, wy - 2, 2);
      g.fillStyle(0x5a5a5a, 1); for (let k = 0; k < 5; k++) { const b = a + k * 1.2566; g.fillCircle(wx + Math.cos(b) * 4, wy + Math.sin(b) * 4, 1); }   // lug nuts going round
      g.fillStyle(0x3a3a3a, 1); g.fillCircle(wx, wy, 1.5);
    }
    if (t % 5 === 0) this.puffs.push({ x: x1 - 6, y: bot - 3, k: 0 });                                                     // exhaust
    this.puffs = this.puffs.filter((p) => { p.k++; p.x -= 3.2; p.y -= 0.35; g.fillStyle(0x6a6460, 0.4 * (1 - p.k / 26)); g.fillCircle(p.x, p.y, 2 + p.k * 0.25); return p.k < 26; });
    if (t % 40 < 20) { g.fillStyle(0xffa020, 1); g.fillRect(x2 + 2, bot - 14, 4, 3); }                   // the indicator blinks (always about to change lanes)
    for (let i = 0; i < 6; i++) { const k = ((t * 0.08 + i / 6) % 1); g.fillStyle(P.dust, 0.45 * (1 - k)); g.fillCircle(x1 - 20 - k * 160, bot + 4 - k * 20, 8 + k * 24); }   // the dust cloud
  }

  // ---------------------------------------------------------------- per frame
  step(match) {
    this.t++;
    const t = this.t;
    this.far(this.farG, t); this.mid(this.midG, t); this.road(this.roadG, t); this.rv(this.rvG, t);
    this.hzG.clear(); this.vanG.clear();
    const road = this.platforms[3], roof = this.platforms[0], out = [];
    for (const f of match.fighters) {
      if (!f.alive) continue;
      if (f.grounded && f.platform === road) {                                       // the road drags you away
        f.x -= ROAD.drag;
        if (t % 4 === 0) match.particles.push({ x: f.x + 6, y: ROAD.y - 2, vx: -2, vy: -0.6, life: 14, color: DPAL.dust, size: 2, grav: 0.05 });
      }
      if (f.y > roof.y + 6 && f.y <= ROAD.y + 2 && f.x > roof.x2 && f.x < roof.x2 + 22)    // caught in front of it: the bumper
        out.push({ x1: roof.x2, x2: roof.x2 + 24, y1: ROAD.y - 60, y2: ROAD.y + 2, dmg: BUMPER.dmg, angle: BUMPER.angle, base: BUMPER.base, growth: BUMPER.growth, id: 'bumper' + Math.floor(t / 40), hazard: true, dirX: -1 });
    }
    return this.cycle.run(match, out);
  }

  // ---------------------------------------------------------------- THE SWAT VAN
  // a black armoured van with a light bar flashing red and blue, a ram bar on the front, SWAT in white on the side, and
  // a roof hatch the officers stand up out of (`up` 0..1). Its front bumper is at x.
  van(g, x, t, up, aimA) {
    const P = DPAL, y = ROAD.y, w = 150, top = y - 74, bob = Math.round(Math.sin(t * 0.6) * 0.6);
    g.fillStyle(P.outline, 1); g.fillRect(x - w - 2, top - 2 + bob, w + 4, 64);
    g.fillStyle(P.van, 1); g.fillRect(x - w, top + bob, w, 60); g.fillStyle(P.vanLit, 1); g.fillRect(x - w, top + bob, w, 3); g.fillRect(x - w + 4, top + 30 + bob, w - 30, 2);
    g.fillStyle(P.glass, 1); g.fillRect(x - 30, top + 6 + bob, 26, 20); g.fillStyle(P.glassLit, 0.6); g.fillRect(x - 28, top + 7 + bob, 6, 2);   // the windscreen
    g.fillStyle(0x0a0a0c, 1); g.fillRect(x - 2, top + 32 + bob, 8, 26); for (let k = 0; k < 4; k++) { g.fillStyle(0x4a4a4a, 1); g.fillRect(x, top + 34 + k * 6 + bob, 6, 2); }   // the ram bar
    // "SWAT" in white blocky letters along the side
    const L = { S: ['111', '100', '111', '001', '111'], W: ['101', '101', '101', '111', '101'], A: ['010', '101', '111', '101', '101'], T: ['111', '010', '010', '010', '010'] };
    [...'SWAT'].forEach((c, i) => L[c].forEach((row, r) => [...row].forEach((b, k) => { if (b === '1') { g.fillStyle(0xffffff, 1); g.fillRect(x - w + 26 + i * 18 + k * 4, top + 36 + r * 3 + bob, 4, 3); } })));
    const flash = Math.floor(t / 5) % 2;                                                                       // the light bar
    g.fillStyle(flash ? P.red : 0x5a0a0a, 1); g.fillRect(x - 60, top - 6 + bob, 12, 5); g.fillStyle(flash ? 0x0a1a5a : P.blue, 1); g.fillRect(x - 46, top - 6 + bob, 12, 5);
    g.fillStyle(flash ? P.red : P.blue, 0.15); g.fillCircle(x - 47, top - 4 + bob, 26);
    for (const wx of [x - w + 30, x - 30]) { g.fillStyle(P.tyre, 1); g.fillCircle(wx, y - 12, 12); g.fillStyle(P.hub, 1); g.fillCircle(wx, y - 12, 4); }
    // the officers in the roof hatch: helmets, visors, dark armour, rifles pointing at the roof
    if (up > 0) for (const [ox, k] of [[x - 110, 0], [x - 84, 1]]) {
      const hy = top - 22 * up + bob;
      g.fillStyle(P.swat, 1); g.fillRect(ox - 7, hy, 14, 22 * up); g.fillStyle(0x2e343c, 1); g.fillRect(ox - 7, hy + 4, 14, 2);
      g.fillStyle(P.swat, 1); g.fillCircle(ox, hy - 4, 7); g.fillStyle(P.visor, 1); g.fillRect(ox - 1, hy - 6, 8, 4); g.fillStyle(0x4a6a8a, 1); g.fillRect(ox + 2, hy - 6, 3, 1);
      const a = aimA != null ? aimA[k] : -0.4;
      if (this.launcher && k === 0) {                                                       // the rocket launcher: a long olive tube on his shoulder
        g.lineStyle(6, 0x3a4a2a, 1); g.lineBetween(ox - Math.cos(a) * 12, hy - 2 - Math.sin(a) * 12, ox + Math.cos(a) * 22, hy - 2 + Math.sin(a) * 22);
        g.fillStyle(0x1a1a14, 1); g.fillCircle(ox + Math.cos(a) * 22, hy - 2 + Math.sin(a) * 22, 3);
      } else { g.lineStyle(3, 0x0a0a0c, 1); g.lineBetween(ox + 2, hy + 6, ox + 2 + Math.cos(a) * 18, hy + 6 + Math.sin(a) * 18); }
    }
    g.fillStyle(0x0a0a0c, 1); g.fillRect(x - 124, top - 2 + bob, 54, 3);                                     // the hatch
  }
  start_swat(match, h) {
    h.title = 'SWAT VAN - TAKE COVER!';
    h.x = -760; h.volley = 0; h.vt = 0; h.bullets = []; h.nades = []; h.phase = 'arrive'; h.n = 0; h.aims = null;
    sfx('buzz', 0.3, 1.6);
  }
  step_swat(match, h, out) {
    const g = this.vanG, hz = this.hzG, P = DPAL, roof = this.platforms[0];
    const targetX = roof.x1 - 40;
    if (h.phase === 'arrive') {
      h.x += (targetX - h.x) * 0.06 + 1; if (h.x >= targetX - 1 || h.t > SWAT.arrive) { h.x = targetX; h.phase = 'fire'; h.vt = 0; }
      if (h.t % 24 === 0) sfx('warn', 0.35, 1.6);                                                             // the siren
    }
    const gunX = [h.x - 108, h.x - 82], gunY = ROAD.y - 74 - 16;
    if (h.phase === 'fire') {
      h.vt++;
      const live = match.fighters.filter((f) => f.alive);
      if (h.vt === 1) h.targets = gunX.map((gx, k) => { const f = live[(h.volley + k) % Math.max(1, live.length)]; return f ? { x: f.x, y: f.y - 24 } : { x: 0, y: -30 }; });
      if (h.vt <= SWAT.aim) {                                                                                 // the laser sights follow their targets
        h.targets.forEach((tg, k) => { const f = live[(h.volley + k) % Math.max(1, live.length)]; if (f) { tg.x += (f.x - tg.x) * 0.15; tg.y += (f.y - 24 - tg.y) * 0.15; } });
        h.targets.forEach((tg, k) => { hz.lineStyle(1, P.red, 0.6 + 0.3 * Math.sin(h.t * 0.8)); hz.lineBetween(gunX[k] + 14, gunY + 4, tg.x, tg.y); hz.fillStyle(P.red, 1); hz.fillCircle(tg.x, tg.y, 2); });
      } else {
        const st = h.vt - SWAT.aim;
        if (st % SWAT.gap === 0 && st < SWAT.burst * SWAT.gap) {                                              // a burst down each sight-line
          h.targets.forEach((tg, k) => { const dx = tg.x - gunX[k], dy = tg.y - gunY, l = Math.hypot(dx, dy) || 1; h.bullets.push({ x: gunX[k] + 14, y: gunY + 4, vx: dx / l * SWAT.bulletSpeed, vy: dy / l * SWAT.bulletSpeed, life: 70, id: h.n++ }); });
          sfx('hit', 0.5, 1.8); match.shake(2, 2);
        }
        if (st > SWAT.burst * SWAT.gap + 20) {
          h.volley++; h.vt = 0;
          if (h.volley === 1 || h.volley === SWAT.volleys) for (let i = 0; i < SWAT.grenades / 2 + (h.volley === SWAT.volleys ? 1 : 0); i++) {   // a grenade (or two) lobbed onto the roof
            const tx = roof.x1 + 30 + Math.random() * (roof.x2 - roof.x1 - 60), gx = gunX[i % 2] + 10, T = 46;
            h.nades.push({ x: gx, y: gunY, vx: (tx - gx) / T, vy: -7, fuse: SWAT.fuse, id: h.n++, boom: -1 }); sfx('swing', 0.5, 0.8);
          }
          if (h.volley >= SWAT.volleys) { h.phase = 'rocket'; h.rt = 0; }
        }
      }
    }
    if (h.phase === 'rocket') {                                                         // the launcher: aim... aim... FIRE
      h.rt++;
      const live = match.fighters.filter((f) => f.alive), gx = gunX[0] + 4, gy = gunY - 2;
      if (h.rt === 1) { const f = live[Math.floor(Math.random() * live.length)]; h.rtarget = f || null; h.raim = f ? { x: f.x, y: f.y - 24 } : { x: 0, y: -24 }; sfx('clang', 0.4, 0.6); }
      if (h.rt <= ROCKET.aim) {
        if (h.rtarget && h.rtarget.alive && h.rt < ROCKET.aim - 15) { h.raim.x += (h.rtarget.x - h.raim.x) * 0.1; h.raim.y += (h.rtarget.y - 24 - h.raim.y) * 0.1; }   // (it stops following just before it fires)
        const on = h.rt > ROCKET.aim - 15 ? h.rt % 4 < 2 : true;
        if (on) { hz.lineStyle(2, P.red, 0.8); hz.lineBetween(gx + 20, gy, h.raim.x, h.raim.y); hz.lineStyle(1, P.red, 1); hz.strokeCircle(h.raim.x, h.raim.y, 6 + (h.rt % 20) * 0.2); }
        if (h.rt % 15 === 0) sfx('warn', 0.4, 2);
      }
      if (h.rt === ROCKET.aim) {
        const dx = h.raim.x - gx, dy = h.raim.y - gy, l = Math.hypot(dx, dy) || 1;
        h.rocket = { x: gx + 20, y: gy, vx: dx / l * ROCKET.speed, vy: dy / l * ROCKET.speed, life: 75, boom: -1 };
        sfx('bighit', 0.8, 1.3); sfx('whoosh', 0.6, 0.6); match.shake(4, 4);
      }
      const R = h.rocket;
      if (R) {
        if (R.boom < 0) {
          R.x += R.vx; R.y += R.vy; R.life--;
          const a = Math.atan2(R.vy, R.vx);
          hz.lineStyle(4, 0x3a4a2a, 1); hz.lineBetween(R.x - Math.cos(a) * 8, R.y - Math.sin(a) * 8, R.x + Math.cos(a) * 5, R.y + Math.sin(a) * 5);
          hz.fillStyle(P.red, 1); hz.fillCircle(R.x + Math.cos(a) * 6, R.y + Math.sin(a) * 6, 2);
          hz.fillStyle(0xffe08a, 1); hz.fillCircle(R.x - Math.cos(a) * 10, R.y - Math.sin(a) * 10, 3);
          match.particles.push({ x: R.x - Math.cos(a) * 10, y: R.y - Math.sin(a) * 10, vx: -R.vx * 0.1, vy: -0.4, life: 26, color: 0xc8c0b0, size: 3, grav: -0.02, drag: 0.95 });
          const hitF = match.fighters.find((f) => f.alive && Math.abs(f.x - R.x) < 14 && R.y > f.y - (f.body ? f.body.h : 48) && R.y < f.y + 4);
          const hitP = this.platforms.find((p) => R.x >= p.x1 && R.x <= p.x2 && R.y >= p.y && R.y < p.y + 12);
          if (hitF || hitP || R.life <= 0) R.boom = 0;
        } else R.boom++;
        if (R.boom === 1) {
          sfx('bighit', 1, 0.45); sfx('thunder', 0.5, 1.2); match.shake(12, 12);
          for (let i = 0; i < 24; i++) { const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 5; match.particles.push({ x: R.x, y: R.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, life: 26 + Math.random() * 18, color: [0xff8a2a, 0xffe08a, 0xffffff, 0x5a5852][i % 4], size: 2 + (i % 3), grav: 0.1, drag: 0.94 }); }
        }
        if (R.boom >= 0 && R.boom < 18) { const k = R.boom / 18; hz.fillStyle(0xffe08a, 0.95 * (1 - k)); hz.fillCircle(R.x, R.y, ROCKET.radius * 0.6); hz.fillStyle(0xff8a2a, 0.7 * (1 - k)); hz.fillCircle(R.x, R.y - 4, ROCKET.radius); }
        if (R.boom >= 0 && R.boom < 5) out.push({ x1: R.x - ROCKET.radius, x2: R.x + ROCKET.radius, y1: R.y - ROCKET.radius, y2: R.y + ROCKET.radius, dmg: ROCKET.hit.dmg, angle: ROCKET.hit.angle, base: ROCKET.hit.base, growth: ROCKET.hit.growth, id: 'rocket' + h.id, hazard: true, radial: true });
        if (R.boom > 24) h.phase = 'leave';
      }
    }
    h.aims = h.rocket || h.phase === 'rocket' ? [Math.atan2((h.raim ? h.raim.y : 0) - gunY, (h.raim ? h.raim.x : 0) - gunX[0]), -0.4] : h.targets ? h.targets.map((tg, k) => Math.atan2(tg.y - gunY, tg.x - gunX[k])) : null;
    const up = h.phase === 'arrive' ? Math.min(1, Math.max(0, (h.t - 50) / 30)) : h.phase === 'leave' ? Math.max(0, 1 - h.lt / 20) : 1;
    if (h.phase === 'leave') { h.lt = (h.lt || 0) + 1; if (h.lt > 30) h.x -= (h.lt - 30) * 0.4; }
    this.launcher = h.phase === 'rocket' && !(h.rocket && h.rocket.boom >= 0); this.van(g, h.x, h.t, up, h.aims);
    out.push({ x1: h.x - 4, x2: h.x + 10, y1: ROAD.y - 40, y2: ROAD.y + 2, dmg: SWAT.ram.dmg, angle: SWAT.ram.angle, base: SWAT.ram.base, growth: SWAT.ram.growth, id: 'ram' + h.id + ':' + Math.floor(h.t / 40), hazard: true, dirX: -1 });
    // bullets: little bright tracers
    for (const b of h.bullets) {
      if (b.life <= 0) continue;
      b.x += b.vx; b.y += b.vy; b.life--;
      hz.lineStyle(2, 0xfff0a0, 1); hz.lineBetween(b.x, b.y, b.x - b.vx * 0.6, b.y - b.vy * 0.6);
      out.push({ x1: b.x - 4, x2: b.x + 4, y1: b.y - 4, y2: b.y + 4, dmg: SWAT.shot.dmg, angle: SWAT.shot.angle, base: SWAT.shot.base, growth: SWAT.shot.growth, id: 'bullet' + h.id + ':' + b.id, hazard: true, dirX: 1 });
      if (b.y > ROAD.y || b.x > 700) b.life = 0;
    }
    // grenades: an arc onto the roof, a bounce, blinking faster and faster - then the blast
    for (const n of h.nades) {
      if (n.boom >= 0) {
        n.boom++;
        if (n.boom === 1) {
          sfx('bighit', 0.9, 0.6); sfx('thunder', 0.35, 1.5); match.shake(8, 8);
          for (let i = 0; i < 16; i++) { const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 4; match.particles.push({ x: n.x, y: n.y - 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, life: 22 + Math.random() * 14, color: [0xff8a2a, 0xffe08a, 0xffffff, 0x5a5852][i % 4], size: 2 + (i % 3), grav: 0.1, drag: 0.94 }); }
        }
        if (n.boom < 14) { hz.fillStyle(0xffe08a, 0.9 * (1 - n.boom / 14)); hz.fillCircle(n.x, n.y - 8, SWAT.radius * 0.6); hz.fillStyle(0xff8a2a, 0.6 * (1 - n.boom / 14)); hz.fillCircle(n.x, n.y - 10, SWAT.radius); }
        if (n.boom < 5) out.push({ x1: n.x - SWAT.radius, x2: n.x + SWAT.radius, y1: n.y - SWAT.radius * 1.3, y2: n.y + 8, dmg: SWAT.boom.dmg, angle: SWAT.boom.angle, base: SWAT.boom.base, growth: SWAT.boom.growth, id: 'nade' + h.id + ':' + n.id, hazard: true, radial: true });
        continue;
      }
      n.vy += 0.3; n.x += n.vx; n.y += n.vy;
      const land = this.platforms.slice(0, 3).find((p) => n.x >= p.x1 && n.x <= p.x2 && n.y >= p.y && n.y - n.vy <= p.y + 1);
      if (land) { n.y = land.y; n.vy = Math.abs(n.vy) > 2 ? -n.vy * 0.35 : 0; n.vx *= 0.6; if (Math.abs(n.vy) > 0.5) sfx('clang', 0.25, 1.6); }
      if (n.y > ROAD.y) { n.y = ROAD.y; n.vy = 0; n.vx = -ROAD.drag; }                                         // (one that misses rolls away down the road)
      if (--n.fuse <= 0) n.boom = 0;
      const blink = n.fuse < 25 ? (n.fuse % 4 < 2) : (n.fuse % 12 < 4);
      hz.fillStyle(0x2a3a1e, 1); hz.fillCircle(n.x, n.y - 4, 4); hz.fillStyle(0x4a5a32, 1); hz.fillCircle(n.x - 1, n.y - 5, 1.5);
      hz.fillStyle(blink ? P.red : 0x5a0a0a, 1); hz.fillRect(n.x - 1, n.y - 10, 2, 2);
    }
    return h.phase === 'leave' && h.x < -800 && h.nades.every((n) => n.boom > 14) && h.bullets.every((b) => b.life <= 0);
  }
}

// Miniature of DUST RUNNER for the select screen: blue sky, the sun, red mesas, the highway, the white-and-teal motorhome
export function drawDesertPreview(g, x, y, w, h) {
  const P = DPAL, bh = Math.ceil(h * 0.62 / 7);
  P.sky.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(x, y + i * bh, w, bh); });
  g.fillStyle(P.sun, 1); g.fillCircle(x + w * 0.75, y + h * 0.2, 8);
  g.fillStyle(P.mesa, 1); g.fillRect(x + w * 0.08, y + h * 0.4, w * 0.2, h * 0.25); g.fillRect(x + w * 0.6, y + h * 0.34, w * 0.14, h * 0.3);
  g.fillStyle(P.sand, 1); g.fillRect(x, y + h * 0.62, w, h * 0.38);
  g.fillStyle(P.road, 1); g.fillRect(x, y + h * 0.8, w, h * 0.12); for (let k = 0; k < 6; k++) { g.fillStyle(P.line, 1); g.fillRect(x + k * w / 6, y + h * 0.855, w / 14, 2); }
  const rx = x + w * 0.3, ry = y + h * 0.55, rw = w * 0.4, rh = h * 0.26;
  g.fillStyle(P.outline, 1); g.fillRect(rx - 1, ry - 1, rw + 2, rh + 2); g.fillStyle(P.body, 1); g.fillRect(rx, ry, rw, rh);
  g.fillStyle(P.stripe, 1); g.fillRect(rx, ry + rh * 0.5, rw, 3); g.fillStyle(P.glass, 1); g.fillRect(rx + rw - 14, ry + 4, 12, 9);
  g.fillStyle(P.tyre, 1); g.fillCircle(rx + rw * 0.2, ry + rh, 5); g.fillCircle(rx + rw * 0.8, ry + rh, 5);
  g.fillStyle(P.dust, 0.5); g.fillCircle(rx - 10, ry + rh, 8); g.fillCircle(rx - 24, ry + rh - 4, 10);
}

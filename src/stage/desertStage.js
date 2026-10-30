// DUST RUNNER: an old 1980s motorhome (cream, brown and gold stripes) barrelling down a desert highway at full speed - and you're fighting on its roof.
// The whole world rushes past: the road, the dust, the telephone poles, the cacti, the mesas far off. The roof is the
// stage (plus the luggage rack at the back and the air-con box). Fall off and you land on the road, which drags you
// away backwards at highway speed - you get one good jump to make it back up (or a grab at the roof's edge) before
// you're left behind. Get caught in front of it and the bumper hits you.
// The only hazard: THE DEA VAN - a big dark-navy van with strobes and DEA on the side pulls up behind; its side door
// slides open and two agents lean out, red laser sights sweep the roof, bursts of gunfire follow, and they lob grenades
// that bounce and blink before they go off. Last, a third agent climbs up through the roof hatch with a rocket launcher, takes a long aim and fires once (20%). Then it falls back.
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
const ROAD = { y: 104, drag: 8.5, scroll: 12 };
// the bumper: a hit for anyone stuck in front of the motorhome on the road
// how far in front of the motorhome's nose counts as under its wheels (anyone there is run over: an instant KO, like the DEA van's front)
const BUMPER = { reach: 24 };
// THE DEA VAN's size and where its parts are (from its front bumper): the cab, the sliding door, the roof hatch
const VAN = { w: 236, h: 96, cab: 46, doorX: 104, doorW: 52, hatch: 72 };
// THE DEA VAN: how long it takes to pull up, the volleys (laser sights first, then a burst), the grenades, and the hits
const DEA = { arrive: 90, volleys: 3, aim: 46, burst: 3, gap: 7, bulletSpeed: 14, shot: { dmg: 3, angle: 30, base: 2.4, growth: 1.4 },
  grenades: 2, fuse: 70, radius: 38, boom: { dmg: 13, angle: 70, base: 5.0, growth: 4.4 }, ram: { reach: 30 } };
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
    this.cycle = new HazardCycle(this, ['dea'], { color: '#ff3a3a', stroke: '#06080e', gap: 1000, jitter: 400, first: 700 });   // (it doesn't come round too often)
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
    this.vanG = s.add.graphics(); worldLayer.push(this.vanG);       // the DEA van (behind the motorhome)
    this.rvBodyG = s.add.graphics(); this.rvBody(this.rvBodyG); worldLayer.push(this.rvBodyG);   // the motorhome itself (drawn once)
    this.rvG = s.add.graphics(); worldLayer.push(this.rvG);         // its wheels, exhaust, dust (redrawn every tick)
    this.puffs = [];
    this.hzG = s.add.graphics(); worldLayer.push(this.hzG);         // bullets, lasers, grenades, blasts
    this.cycle.makeBanner(s);
  }

  // the far mesas and buttes: two bands of flat-topped red rock, scrolling slowly to the left
  far(g, t) {
    const P = DPAL, o = (t * 0.4) % 640;
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
    const P = DPAL, o = (t * 5) % 300;
    g.clear();
    g.fillStyle(P.sandDark, 1); g.fillRect(-500, 200, 2000, 300);
    for (let i = 0; i < 40; i++) { const x = ((i * 97 - t * 6) % 1400 + 1400) % 1400 - 400; g.fillStyle(P.sandLit, 0.7); g.fillRect(x, 210 + (i * 23) % 60, 10 + (i % 4) * 6, 2); }
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
  // the motorhome, drawn once (rvBody), after Mason's reference photo: a boxy 1980s Class A motorhome - cream ribbed
  // siding, brown / tan / gold stripes along the top and the middle (wrapping round the front), a rounded front cap with
  // amber marker lights, a big raked windscreen, a black two-part grille with square headlights, a yellow plate (no
  // real number), dark-framed windows (one tall, one with grid panes), beige storage hatches along the skirt, flared
  // white wheel arches, roof air-con units, a satellite dish and a rail rack, a rubber mud-flap fringe at the back,
  // road grime
  rvBody(g) {
    const P = DPAL, top = 0, bot = ROAD.y - 14, x1 = -150, x2 = 146;
    const C = { cream: 0xeee6d2, rib: 0xd8ceb6, shade: 0xc8bc9e, brown: 0x8a4a28, tan: 0xd8a070, gold: 0xe8b830, rust: 0xb8642e,
      frame: 0x4a2c1a, glass: 0x141a20, glassLit: 0x4a5a6a, grime: 0x9a8a6a, hatch: 0xe0d4b4, hatchEdge: 0x8a7a5a, black: 0x14120e, amber: 0xffa020 };
    // the box and the front: outline, cream, the rounded front cap and the raked nose
    const nose = [{ x: x2 - 10, y: top }, { x: x2, y: top + 6 }, { x: x2 + 4, y: top + 16 }, { x: x2 + 14, y: top + 46 }, { x: x2 + 16, y: bot - 2 }, { x: x2 + 16, y: bot + 2 }, { x: x2 - 10, y: bot + 2 }];
    g.fillStyle(P.outline, 1); g.fillRect(x1 - 2, top - 2, x2 - x1 - 6, bot - top + 4); g.fillPoints(nose.map((p) => ({ x: p.x + 2, y: p.y + (p.y === top ? -2 : 0) })), true);
    g.fillStyle(C.cream, 1); g.fillRect(x1, top, x2 - x1 - 8, bot - top); g.fillPoints(nose, true);
    for (let y = top + 3; y < bot - 4; y += 3) { g.fillStyle(C.rib, 1); g.fillRect(x1, y, x2 - x1 - 10, 1); }               // the ribbed siding
    g.fillStyle(C.shade, 1); g.fillRect(x1, bot - 10, x2 - x1 + 10, 10); g.fillStyle(0xffffff, 0.35); g.fillRect(x1, top, x2 - x1 - 10, 2);
    // the stripes: brown, gold, tan along the top; tan, gold, orange-brown, brown along the middle - round the nose too
    const band = (y0, list) => { let y = y0; for (const [h, c] of list) { g.fillStyle(c, 1); g.fillRect(x1, y, x2 - x1 + 12, h); y += h; } };
    band(top + 7, [[5, C.brown], [1, C.gold], [3, C.tan]]);
    band(top + 52, [[2, C.tan], [1, C.gold], [4, C.rust], [3, C.brown]]);
    g.fillStyle(P.outline, 1); g.fillRect(x2 + 15, top + 46, 3, bot - top - 44);                                            // (the stripes stop at the nose's edge)
    // the windscreen: big, raked, a wiper, a mirror on an arm
    g.fillStyle(C.black, 1); g.fillPoints([{ x: x2 - 8, y: top + 19 }, { x: x2 + 3, y: top + 18 }, { x: x2 + 12, y: top + 46 }, { x: x2 - 8, y: top + 46 }], true);
    g.fillStyle(C.glass, 1); g.fillPoints([{ x: x2 - 6, y: top + 21 }, { x: x2 + 2, y: top + 20 }, { x: x2 + 10, y: top + 44 }, { x: x2 - 6, y: top + 44 }], true);
    g.fillStyle(C.glassLit, 1); g.fillTriangle(x2 - 4, top + 22, x2, top + 22, x2 - 4, top + 32);
    g.lineStyle(1, 0x0a0a0a, 1); g.lineBetween(x2 - 2, top + 43, x2 + 6, top + 30);
    g.fillStyle(0x9aa2a8, 1); g.fillRect(x2 - 18, top + 22, 2, 8); g.fillRect(x2 - 22, top + 26, 6, 2); g.fillStyle(0xd8dce0, 1); g.fillRect(x2 - 24, top + 20, 4, 9);   // the side mirror
    // the grille and lights: two black grille halves, square headlights stacked, amber corners, the bumper, a blank yellow plate
    g.fillStyle(C.black, 1); g.fillRect(x2 + 12, top + 58, 5, 18); g.fillStyle(0x2a2620, 1); for (let y = top + 60; y < top + 75; y += 3) g.fillRect(x2 + 13, y, 3, 1);
    g.fillStyle(0xd8dce0, 1); g.fillRect(x2 + 12, top + 50, 5, 3); g.fillRect(x2 + 12, top + 54, 5, 3); g.fillStyle(0xfff8d8, 1); g.fillRect(x2 + 13, top + 51, 3, 1); g.fillRect(x2 + 13, top + 55, 3, 1);
    g.fillStyle(C.amber, 1); g.fillRect(x2 + 11, top + 77, 6, 3);
    g.fillStyle(0xe8e0cc, 1); g.fillRect(x2 + 8, bot - 6, 12, 7); g.fillStyle(C.grime, 1); g.fillRect(x2 + 8, bot - 1, 12, 2);   // the bumper
    g.fillStyle(0xf0d040, 1); g.fillRect(x2 + 14, bot - 5, 6, 4); g.fillStyle(0xb02020, 1); g.fillRect(x2 + 15, bot - 4, 4, 1);
    // amber marker lights along the top of the front cap
    for (const x of [x2 - 30, x2 - 22, x2 - 14]) { g.fillStyle(C.amber, 1); g.fillRect(x, top + 2, 4, 2); }
    g.fillStyle(0xd82020, 1); g.fillRect(x2 - 6, top + 4, 3, 2);
    // the side windows: dark brown frames, tinted glass with a glint; the cab window, two wide two-pane windows, a tall
    // narrow one and one with little grid panes
    const win = (x, y, w, h, grid) => {
      g.fillStyle(C.frame, 1); g.fillRect(x - 2, y - 2, w + 4, h + 4); g.fillStyle(C.glass, 1); g.fillRect(x, y, w, h);
      g.fillStyle(C.glassLit, 1); g.fillRect(x + 2, y + 2, Math.min(8, w / 3), 1); g.fillRect(x + 2, y + 3, Math.min(4, w / 5), 1);
      g.fillStyle(C.frame, 1); if (grid) { for (let gx = x + w / grid; gx < x + w - 1; gx += w / grid) g.fillRect(Math.round(gx), y, 1, h); for (let gy = y + h / 3; gy < y + h - 1; gy += h / 3) g.fillRect(x, Math.round(gy), w, 1); } else if (w > 24) g.fillRect(x + Math.round(w / 2), y, 1, h);
    };
    win(x2 - 40, top + 20, 22, 26);                                     // the cab window
    win(x2 - 96, top + 21, 42, 22); win(x1 + 126, top + 21, 40, 22);
    win(x1 + 92, top + 21, 12, 26, 1);                                  // the tall narrow one
    win(x1 + 40, top + 21, 30, 22, 3);                                  // the one with grid panes
    g.fillStyle(0x3a3a3a, 1); g.fillRect(x1 + 20, top + 22, 6, 4); g.fillStyle(0xfff4c0, 1); g.fillRect(x1 + 21, top + 23, 4, 2);   // a porch light
    // the skirt: beige storage hatches with brown edges and latches, a dark vented one, a fuel door, rivets
    const hatch = (x, w, dark) => { g.fillStyle(C.hatchEdge, 1); g.fillRect(x - 1, top + 63, w + 2, 18); g.fillStyle(dark ? 0x3a3428 : C.hatch, 1); g.fillRect(x, top + 64, w, 16); g.fillStyle(C.hatchEdge, 1); g.fillRect(x + w / 2 - 2, top + 66, 4, 2); if (dark) for (let y = top + 67; y < top + 79; y += 3) { g.fillStyle(0x1a1610, 1); g.fillRect(x + 2, y, w - 4, 1); } };
    hatch(x1 + 4, 24); hatch(x1 + 32, 26); hatch(x1 + 84, 30); hatch(x1 + 158, 30, true); hatch(x1 + 194, 30); hatch(x1 + 230, 22);
    g.fillStyle(C.hatchEdge, 1); g.fillRect(x1 + 122, top + 66, 6, 6); g.fillStyle(C.amber, 1); g.fillRect(x1 + 8, top + 60, 3, 2); g.fillRect(x1 + 150, top + 60, 3, 2);
    // the wheel arches: flared and white, dark inside; grime and a few rust streaks along the bottom
    for (const wx of [x1 + 54, x2 - 34]) { g.fillStyle(P.outline, 1); g.fillCircle(wx, bot + 2, 19); g.fillStyle(0xf4eee0, 1); g.fillCircle(wx, bot + 2, 18); g.fillStyle(0x1a1612, 1); g.fillCircle(wx, bot + 3, 15); g.fillRect(wx - 15, bot + 3, 30, 12); }
    for (let x = x1; x < x2 + 8; x += 3) { g.fillStyle(C.grime, 0.3 + ((x * 7) % 5) * 0.06); g.fillRect(x, bot - 4 - ((x * 13) % 3), 3, 4 + ((x * 13) % 3)); }
    g.fillStyle(C.rust, 0.6); g.fillRect(x1 + 70, bot - 8, 2, 6); g.fillRect(x2 - 70, bot - 7, 2, 5); g.fillRect(x1 + 2, top + 30, 2, 8);
    // the back: tail lights, a ladder, the mud-flap fringe hanging behind the rear wheel
    g.fillStyle(0xd82020, 1); g.fillRect(x1 - 1, bot - 24, 3, 10); g.fillStyle(C.amber, 1); g.fillRect(x1 - 1, bot - 13, 3, 3);
    g.lineStyle(2, 0xc8ccd0, 1); g.lineBetween(x1 + 4, top - 42, x1 + 4, top + 50); g.lineBetween(x1 + 12, top - 42, x1 + 12, top + 50); for (let y = top - 36; y < top + 50; y += 9) g.lineBetween(x1 + 4, y, x1 + 12, y);
    g.fillStyle(0x0e0c0a, 1); for (let x = x1 + 2; x < x1 + 30; x += 3) g.fillRect(x, bot - 2, 2, 12 + ((x * 5) % 3));
    // up on the roof: a satellite dish at the front, the air-con units (the middle one is a ledge), the rail rack (a ledge)
    g.fillStyle(0xc8ccd0, 1); g.fillRect(x2 - 52, top - 4, 4, 4); g.fillStyle(0xf4f4f0, 1); g.fillEllipse(x2 - 50, top - 6, 22, 6); g.fillStyle(0xd8d8d4, 1); g.fillEllipse(x2 - 50, top - 5, 18, 3);
    g.fillStyle(P.outline, 1); g.fillRect(x1 + 58, top - 13, 28, 13); g.fillStyle(0xf0f0ec, 1); g.fillRect(x1 + 59, top - 12, 26, 12); for (let x = x1 + 62; x < x1 + 84; x += 3) { g.fillStyle(0xb8bcbc, 1); g.fillRect(x, top - 9, 1, 7); }
    const A = this.platforms[2];
    g.fillStyle(P.outline, 1); g.fillRect(A.x1 - 1, A.y - 1, A.x2 - A.x1 + 2, -A.y + 1); g.fillStyle(0xf0f0ec, 1); g.fillRect(A.x1, A.y, A.x2 - A.x1, -A.y);
    g.fillStyle(0xffffff, 1); g.fillRect(A.x1, A.y, A.x2 - A.x1, 3); for (let x = A.x1 + 4; x < A.x2 - 2; x += 3) { g.fillStyle(0xb8bcbc, 1); g.fillRect(x, A.y + 6, 1, -A.y - 9); }
    const R = this.platforms[1];
    g.lineStyle(2, 0xc8ccd0, 1); g.lineBetween(R.x1, R.y, R.x2, R.y); for (let x = R.x1; x <= R.x2; x += 12) g.lineBetween(x, R.y, x, -1);
    g.lineStyle(1, 0x9aa2a8, 1); g.lineBetween(R.x1, R.y + 14, R.x2, R.y + 14); g.lineBetween(R.x1, R.y + 28, R.x2, R.y + 28);
    g.fillStyle(0x6a5a3a, 1); g.fillRect(R.x1 + 8, -10, 20, 10); g.fillStyle(0x8a7a52, 1); g.fillRect(R.x1 + 8, -10, 20, 2);   // a cooler strapped to the roof
    g.fillStyle(0x3a5a8a, 1); g.fillRect(R.x1 + 32, -7, 14, 7); g.fillStyle(0x5a7aaa, 1); g.fillRect(R.x1 + 32, -7, 14, 2);   // and a jerry can
    // the exhaust pipe
    g.fillStyle(0x2a2a2a, 1); g.fillRect(x1 - 6, bot - 2, 10, 3);
  }
  // the parts that move: wheels turning (chrome hubcaps, lug nuts, a tread that blurs), exhaust puffs, a blinking marker,
  // the dust cloud behind it
  rv(g, t) {
    const P = DPAL, bot = ROAD.y - 14, x1 = -150, x2 = 146;
    const bob = Math.round(Math.sin(t * 0.5) * 0.6);
    g.clear();
    for (const wx of [x1 + 54, x2 - 34]) {
      const wy = bot + 2 + bob, a = -t * 0.6;
      g.fillStyle(P.tyre, 1); g.fillCircle(wx, wy, 13);
      g.lineStyle(1, 0x2a2a2a, 1); for (let k = 0; k < 8; k++) { const b = a + k * Math.PI / 4; g.lineBetween(wx + Math.cos(b) * 10, wy + Math.sin(b) * 10, wx + Math.cos(b) * 13, wy + Math.sin(b) * 13); }   // the tread
      g.fillStyle(P.chrome, 1); g.fillCircle(wx, wy, 7); g.fillStyle(0xffffff, 0.6); g.fillCircle(wx - 2, wy - 2, 2);
      g.fillStyle(0x5a5a5a, 1); for (let k = 0; k < 5; k++) { const b = a + k * 1.2566; g.fillCircle(wx + Math.cos(b) * 4, wy + Math.sin(b) * 4, 1); }   // lug nuts going round
      g.fillStyle(0x3a3a3a, 1); g.fillCircle(wx, wy, 1.5);
    }
    if (t % 5 === 0) this.puffs.push({ x: x1 - 6, y: bot - 3, k: 0 });                                                     // exhaust
    this.puffs = this.puffs.filter((p) => { p.k++; p.x -= 3.2; p.y -= 0.35; g.fillStyle(0x6a6460, 0.4 * (1 - p.k / 26)); g.fillCircle(p.x, p.y, 2 + p.k * 0.25); return p.k < 26; });
    if (t % 40 < 20) { g.fillStyle(0xffd060, 1); g.fillRect(x2 + 7, bot - 13, 6, 3); }                   // the indicator blinks (always about to change lanes)
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
      if (f.y > ROAD.y - 40 && f.y <= ROAD.y + 2 && f.x > roof.x2 && f.x < roof.x2 + BUMPER.reach) this.runOver(match, f, roof.x2);   // in front of it: run over
    }
    return this.cycle.run(match, out);
  }

  // run over by a vehicle: an instant KO, whatever your % (only the respawn platform saves you)
  runOver(match, f, x) {
    if (!f.alive || f.state === 'respawn') return;
    sfx('bighit', 1, 0.5); sfx('clang', 0.7, 0.7); match.shake(10, 10);
    for (let i = 0; i < 24; i++) match.particles.push({ x: x + (Math.random() - 0.5) * 20, y: ROAD.y - 10 - Math.random() * 30, vx: -2 - Math.random() * 6, vy: -1 - Math.random() * 4, life: 24 + Math.random() * 16, color: i % 2 ? DPAL.dust : 0xffffff, size: 3, grav: 0.2 });
    match.onKO(f);
  }

  // ---------------------------------------------------------------- THE DEA VAN
  // a big dark-navy box van: a cab with a windscreen and mirror, a push bar with strobes in the grille flashing red and
  // blue, a light bar on the roof, tinted windows, DEA in big yellow letters on the side, a wide sliding door (it slides
  // back to let the agents out: `door` 0..1), a roof hatch at the back, rear doors and tail lights, big wheels.
  // Its front bumper is at x. The agents are drawn by agent().
  van(g, x, t, door) {
    const P = DPAL, y = ROAD.y - 14, w = VAN.w, h = VAN.h, top = y - h, bob = Math.round(Math.sin(t * 0.6) * 0.6);
    const N = { body: 0x161c2e, lit: 0x26304a, dark: 0x0a0e1a, trim: 0x3a4460, glass: 0x0c1018, glassLit: 0x3a4a64, yellow: 0xf0c020, yellowDark: 0xa07a10 };
    const T = top + bob, cab = x - VAN.cab;
    g.fillStyle(P.outline, 1); g.fillRect(x - w - 2, T - 2, w - VAN.cab + 4, h + 4); g.fillRect(cab - 2, T + 14, VAN.cab + 6, h - 10);   // the box, the lower cab
    g.fillStyle(N.body, 1); g.fillRect(x - w, T, w - VAN.cab, h); g.fillRect(cab, T + 16, VAN.cab + 2, h - 16);
    g.fillStyle(P.outline, 1); g.fillTriangle(cab - 2, T - 2, cab + 30, T + 14, cab - 2, T + 14); g.fillStyle(N.body, 1); g.fillTriangle(cab, T, cab + 28, T + 16, cab, T + 16);   // the cab's sloped roof
    g.fillStyle(N.lit, 1); g.fillRect(x - w, T, w - VAN.cab, 3); g.fillRect(x - w, T + h - 16, w, 2);                     // highlights, the waist line
    g.fillStyle(N.dark, 1); g.fillRect(x - w, T + h - 12, w + 2, 12);                                                   // the dark skirt
    for (const px of [x - w + 60, x - w + 120]) { g.fillStyle(N.dark, 1); g.fillRect(px, T + 2, 1, h - 16); }          // panel seams
    // the windscreen and the cab door, a mirror on an arm
    g.fillStyle(N.glass, 1); g.fillPoints([{ x: cab + 2, y: T + 18 }, { x: cab + 26, y: T + 18 }, { x: cab + 36, y: T + 40 }, { x: cab + 2, y: T + 40 }], true);
    g.fillStyle(N.glassLit, 1); g.fillTriangle(cab + 6, T + 20, cab + 14, T + 20, cab + 6, T + 32);
    g.lineStyle(1, N.trim, 1); g.strokeRect(cab + 2, T + 18, 24, h - 32); g.fillStyle(N.trim, 1); g.fillRect(cab + 20, T + 50, 4, 2);
    g.fillStyle(0x0a0a0a, 1); g.fillRect(cab - 6, T + 24, 2, 10); g.fillRect(cab - 10, T + 22, 6, 9);
    // the front: grille, strobes flashing red / blue, headlights, the push bar
    const flash = Math.floor(t / 4) % 2;
    g.fillStyle(0x08080c, 1); g.fillRect(x - 2, T + 42, 6, 26); for (let k = 0; k < 6; k++) { g.fillStyle(0x2a2e3a, 1); g.fillRect(x - 1, T + 44 + k * 4, 4, 2); }
    g.fillStyle(flash ? P.red : P.blue, 1); g.fillRect(x - 1, T + 46, 4, 3); g.fillStyle(flash ? P.blue : P.red, 1); g.fillRect(x - 1, T + 62, 4, 3);
    g.fillStyle(0xfff8d8, 1); g.fillRect(x, T + 38, 3, 4);
    g.fillStyle(0x1a1a1a, 1); g.fillRect(x + 2, T + 40, 6, 36); for (let k = 0; k < 5; k++) { g.fillStyle(0x4a4a4a, 1); g.fillRect(x + 3, T + 42 + k * 7, 4, 2); }
    // the light bar on the roof, glowing
    g.fillStyle(0x0a0a0a, 1); g.fillRect(x - w + 40, T - 6, 40, 6);
    g.fillStyle(flash ? P.red : 0x4a0a0a, 1); g.fillRect(x - w + 41, T - 5, 18, 4); g.fillStyle(flash ? 0x0a1a4a : P.blue, 1); g.fillRect(x - w + 61, T - 5, 18, 4);
    g.fillStyle(flash ? P.red : P.blue, 0.18); g.fillCircle(x - w + 60, T - 3, 34);
    g.lineStyle(1, 0x5a5a5a, 1); g.lineBetween(x - w + 100, T, x - w + 100, T - 22); g.lineBetween(x - w + 106, T, x - w + 108, T - 16);   // antennas
    // tinted windows along the box (behind the door)
    for (const wx of [x - w + 10]) { g.fillStyle(N.trim, 1); g.fillRect(wx - 1, T + 13, 34, 20); g.fillStyle(N.glass, 1); g.fillRect(wx, T + 14, 32, 18); g.fillStyle(N.glassLit, 1); g.fillRect(wx + 3, T + 16, 8, 1); }
    // DEA in big yellow block letters, and a thin yellow stripe
    const L = { D: ['110', '101', '101', '101', '110'], E: ['111', '100', '110', '100', '111'], A: ['010', '101', '111', '101', '101'] };
    const dea = (x0, y0, px) => [...'DEA'].forEach((c, i) => L[c].forEach((row, r) => [...row].forEach((b, k) => { if (b === '1') { const lx = x0 + i * px * 4 + k * px, ly = y0 + r * px; g.fillStyle(N.yellowDark, 1); g.fillRect(lx + 1, ly + 1, px, px); g.fillStyle(N.yellow, 1); g.fillRect(lx, ly, px, px); } })));
    dea(x - w + 54, T + 18, 5);                                                                                        // big, along the back half
    dea(cab + 3, T + 44, 2);                                                                                           // small, on the cab door
    g.fillStyle(N.yellow, 1); g.fillRect(x - w, T + h - 20, w - VAN.cab, 2);
    // the sliding door: an opening behind the cab, the door slid back over the side
    const dx = x - VAN.doorX, dw = VAN.doorW, slid = Math.round(door * (dw - 4));
    g.fillStyle(0x050608, 1); g.fillRect(dx, T + 8, dw, h - 20);                                                     // the dark inside
    if (door > 0) { g.fillStyle(0x1a1e26, 1); g.fillRect(dx + 4, T + h - 30, dw - 8, 6); g.fillStyle(0xfff0c0, 0.25); g.fillRect(dx + 2, T + 9, dw - 4, 2); }   // a bench, a dome light
    g.fillStyle(P.outline, 1); g.fillRect(dx - slid - 1, T + 7, dw + 2, h - 18); g.fillStyle(N.body, 1); g.fillRect(dx - slid, T + 8, dw, h - 20);
    g.fillStyle(N.lit, 1); g.fillRect(dx - slid, T + 8, dw, 2); g.fillStyle(N.trim, 1); g.fillRect(dx - slid + 4, T + 40, 6, 2);
    dea(dx - slid + 6, T + 46, 3);                                                                                     // and on the sliding door (it slides back with it)
    g.fillStyle(N.dark, 1); g.fillRect(dx - 10, T + 6, dw + 12, 2);                                                    // the door's track
    // the roof hatch (open while an agent's up there), the rear doors and tail lights
    g.fillStyle(0x0a0a0c, 1); g.fillRect(x - VAN.hatch - 12, T - 2, 24, 3);
    g.fillStyle(N.dark, 1); g.fillRect(x - w + 1, T + 4, 1, h - 18); g.fillStyle(0xd82020, 1); g.fillRect(x - w - 1, T + h - 30, 3, 10);
    // the wheels: big, chrome-centred, turning
    for (const wx of [x - w + 34, x - 36]) {
      const wy = y + 2, a = -t * 0.6;
      g.fillStyle(P.outline, 1); g.fillCircle(wx, wy - 2, 18); g.fillStyle(P.tyre, 1); g.fillCircle(wx, wy, 15);
      g.lineStyle(1, 0x2a2a2a, 1); for (let k = 0; k < 8; k++) { const b = a + k * Math.PI / 4; g.lineBetween(wx + Math.cos(b) * 11, wy + Math.sin(b) * 11, wx + Math.cos(b) * 15, wy + Math.sin(b) * 15); }
      g.fillStyle(0x6a6e74, 1); g.fillCircle(wx, wy, 7); g.fillStyle(0x9aa0a6, 1); g.fillCircle(wx - 1, wy - 1, 3);
    }
  }
  // a DEA agent, feet at (x, y), facing dir: boots, khaki cargo trousers, a navy windbreaker, a black vest with a yellow
  // DEA panel, a navy ball cap and dark glasses. pose: 'aim' (carbine along angle a), 'throw' (arm back over the head),
  // 'launcher' (a launcher tube on the shoulder along a), 'stand'. show = how much of them is out (0..1, for the hatch)
  agent(g, x, y, dir, pose, a = 0, show = 1, skin = 0) {
    const d = dir, S = [0xe0b090, 0xb07850, 0x7a4e30][skin % 3], H = 46;
    const cut = y - H * show;                                                                                          // (only the part above the hatch shows)
    const R = (rx, ry, rw, rh, c) => { const y0 = Math.max(ry, cut), y1 = ry + rh; if (y1 > y0) { g.fillStyle(c, 1); g.fillRect(rx, y0, rw, y1 - y0); } };
    R(x - 5, y - 4, 5, 4, 0x1a1a1a); R(x + 1, y - 4, 5, 4, 0x1a1a1a);                                                 // boots
    R(x - 5, y - 18, 5, 14, 0x9a8a5a); R(x + 1, y - 18, 5, 14, 0x8a7a4a);                                             // khaki trousers
    R(x - 1 - 4 * d, y - 12, 2, 4, 0x7a6a3a);                                                                          // a cargo pocket
    R(x - 7, y - 36, 14, 19, 0x1a2244);                                                                                // the windbreaker
    R(x - 6, y - 34, 12, 12, 0x14140e);                                                                                // the vest
    R(x - 4 + d, y - 31, 9, 5, 0xf0c020);                                                                              // its DEA panel
    if (y - 30 > cut) { g.fillStyle(0x14140e, 1); for (const [lx, ly] of [[0, 0], [3, 0], [6, 0]]) g.fillRect(x - 3 + d + lx, y - 30 + ly, 2, 3); }   // (the letters, tiny)
    R(x - 3, y - 39, 6, 3, S);                                                                                         // neck
    if (y - 46 >= cut - 2) {                                                                                           // the head: face, glasses, cap and brim
      g.fillStyle(S, 1); g.fillRect(x - 4, y - 45, 9, 7); g.fillStyle(0x0a0a0a, 1); g.fillRect(x - 1 + d * 2, y - 43, 5, 2);
      g.fillStyle(0x1a2244, 1); g.fillRect(x - 5, y - 48, 10, 4); g.fillRect(x + (d > 0 ? 3 : -8), y - 45, 5, 1);
      g.fillStyle(0xf0c020, 1); g.fillRect(x - 2, y - 47, 3, 1);
    }
    const sx = x + d * 3, sy = y - 33;                                                                                 // the shoulder
    if (pose === 'throw') { g.lineStyle(3, 0x1a2244, 1); g.lineBetween(sx, sy, sx - d * 6, sy - 12); g.fillStyle(S, 1); g.fillCircle(sx - d * 6, sy - 13, 2); return; }
    if (pose === 'launcher') {
      const ex = Math.cos(a), ey = Math.sin(a);
      g.lineStyle(7, 0x2a2a20, 1); g.lineBetween(sx - ex * 16, sy - 4 - ey * 16, sx + ex * 26, sy - 4 + ey * 26);
      g.lineStyle(5, 0x4a5a32, 1); g.lineBetween(sx - ex * 15, sy - 4 - ey * 15, sx + ex * 25, sy - 4 + ey * 25);
      g.fillStyle(0x14140e, 1); g.fillCircle(sx + ex * 26, sy - 4 + ey * 26, 3); g.fillRect(sx + ex * 2 - 1, sy - 4 + ey * 2, 3, 6);   // the muzzle, the grip
      g.lineStyle(3, 0x1a2244, 1); g.lineBetween(sx, sy, sx + ex * 6, sy - 1 + ey * 6); return;
    }
    if (pose === 'aim') {
      const ex = Math.cos(a), ey = Math.sin(a);
      g.lineStyle(3, 0x1a2244, 1); g.lineBetween(sx, sy, sx + ex * 9, sy + ey * 9);                                     // arms out
      g.lineStyle(3, 0x14140e, 1); g.lineBetween(sx + ex * 2, sy + ey * 2, sx + ex * 22, sy + ey * 22);                 // the carbine
      g.fillStyle(0x14140e, 1); g.fillRect(sx + ex * 8 - 1, sy + ey * 8 + 1, 3, 4);
      return;
    }
    g.lineStyle(3, 0x1a2244, 1); g.lineBetween(sx, sy, sx + d * 2, sy + 12);
  }
  start_dea(match, h) {
    h.title = 'DEA - TAKE COVER!';
    h.x = -760; h.door = 0; h.throwT = [0, 0]; h.volley = 0; h.vt = 0; h.bullets = []; h.nades = []; h.phase = 'arrive'; h.n = 0; h.aims = null;
    sfx('buzz', 0.3, 1.6);
  }
  step_dea(match, h, out) {
    const g = this.vanG, hz = this.hzG, P = DPAL, roof = this.platforms[0];
    const targetX = roof.x1 + 4;                                                       // (its nose tucked in right behind the motorhome)
    if (h.phase === 'arrive') {
      h.x += (targetX - h.x) * 0.06 + 1; if (h.x >= targetX - 1 || h.t > DEA.arrive) { h.x = targetX; h.phase = 'fire'; h.vt = 0; }
      if (h.t % 24 === 0) sfx('warn', 0.35, 1.6);                                                             // the siren
    }
    const vy = ROAD.y - 14, T = vy - VAN.h, dx0 = h.x - VAN.doorX;
    const agents = [{ x: dx0 + 14, y: vy - 12 }, { x: dx0 + 36, y: vy - 12 }];          // the two agents in the open side door
    const gunX = agents.map((a) => a.x + 3), gunY = vy - 12 - 33;
    h.throwT = h.throwT || [0, 0]; h.throwT = h.throwT.map((v) => Math.max(0, v - 1));
    if (h.phase === 'fire' && (h.door = Math.min(1, (h.door || 0) + 0.04)) >= 1) {        // (the side door slides open first)
      h.vt++;
      const live = match.fighters.filter((f) => f.alive);
      if (h.vt === 1) h.targets = gunX.map((gx, k) => { const f = live[(h.volley + k) % Math.max(1, live.length)]; return f ? { x: f.x, y: f.y - 24 } : { x: 0, y: -30 }; });
      if (h.vt <= DEA.aim) {                                                                                 // the laser sights follow their targets
        h.targets.forEach((tg, k) => { const f = live[(h.volley + k) % Math.max(1, live.length)]; if (f) { tg.x += (f.x - tg.x) * 0.15; tg.y += (f.y - 24 - tg.y) * 0.15; } });
        h.targets.forEach((tg, k) => { hz.lineStyle(1, P.red, 0.6 + 0.3 * Math.sin(h.t * 0.8)); hz.lineBetween(gunX[k] + 14, gunY + 4, tg.x, tg.y); hz.fillStyle(P.red, 1); hz.fillCircle(tg.x, tg.y, 2); });
      } else {
        const st = h.vt - DEA.aim;
        if (st % DEA.gap === 0 && st < DEA.burst * DEA.gap) {                                              // a burst down each sight-line
          h.targets.forEach((tg, k) => { const dx = tg.x - gunX[k], dy = tg.y - gunY, l = Math.hypot(dx, dy) || 1; h.bullets.push({ x: gunX[k] + 14, y: gunY + 4, vx: dx / l * DEA.bulletSpeed, vy: dy / l * DEA.bulletSpeed, life: 70, id: h.n++ }); });
          sfx('hit', 0.5, 1.8); match.shake(2, 2);
        }
        if (st > DEA.burst * DEA.gap + 20) {
          h.volley++; h.vt = 0;
          if (h.volley === 1 || h.volley === DEA.volleys) for (let i = 0; i < DEA.grenades / 2 + (h.volley === DEA.volleys ? 1 : 0); i++) {   // a grenade (or two) lobbed onto the roof
            const tx = roof.x1 + 30 + Math.random() * (roof.x2 - roof.x1 - 60), gx = gunX[i % 2] + 4, Tn = 46;
            h.nades.push({ x: gx, y: gunY - 10, vx: (tx - gx) / Tn, vy: -7, fuse: DEA.fuse, id: h.n++, boom: -1 }); h.throwT[i % 2] = 16; sfx('swing', 0.5, 0.8);
          }
          if (h.volley >= DEA.volleys) { h.phase = 'rocket'; h.rt = 0; }
        }
      }
    }
    if (h.phase === 'rocket') {                                                         // the launcher: aim... aim... FIRE
      h.rt++;
      const live = match.fighters.filter((f) => f.alive), gx = h.x - VAN.hatch + 3, gy = T - 37;   // (the third agent, up through the roof hatch)
      if (h.rt === 1) { const f = live[Math.floor(Math.random() * live.length)]; h.rtarget = f || null; h.raim = f ? { x: f.x, y: f.y - 24 } : { x: 0, y: -24 }; sfx('clang', 0.4, 0.6); }
      if (h.rt <= ROCKET.aim) {
        if (h.rtarget && h.rtarget.alive && h.rt < ROCKET.aim - 15) { h.raim.x += (h.rtarget.x - h.raim.x) * 0.1; h.raim.y += (h.rtarget.y - 24 - h.raim.y) * 0.1; }   // (it stops following just before it fires)
        const on = h.rt > ROCKET.aim - 15 ? h.rt % 4 < 2 : true;
        if (on) { hz.lineStyle(2, P.red, 0.8); hz.lineBetween(gx + 26, gy, h.raim.x, h.raim.y); hz.lineStyle(1, P.red, 1); hz.strokeCircle(h.raim.x, h.raim.y, 6 + (h.rt % 20) * 0.2); }
        if (h.rt % 15 === 0) sfx('warn', 0.4, 2);
      }
      if (h.rt === ROCKET.aim) {
        const dx = h.raim.x - gx, dy = h.raim.y - gy, l = Math.hypot(dx, dy) || 1;
        h.rocket = { x: gx + 26, y: gy, vx: dx / l * ROCKET.speed, vy: dy / l * ROCKET.speed, life: 75, boom: -1 };
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
    if (h.phase === 'leave') { h.lt = (h.lt || 0) + 1; h.door = Math.max(0, (h.door || 0) - 0.05); if (h.lt > 30) h.x -= (h.lt - 30) * 0.4; }
    // the van, then its agents: two in the side door (aiming their carbines, or throwing), one up through the roof hatch
    // with the launcher
    this.van(g, h.x, h.t, h.door || 0);
    if ((h.door || 0) > 0.6) agents.forEach((a, k) => {
      const tg = h.targets && h.targets[k], ang = tg ? Math.atan2(tg.y - gunY, tg.x - gunX[k]) : -0.5;
      this.agent(g, a.x, a.y, 1, h.throwT[k] > 0 ? 'throw' : h.phase === 'fire' ? 'aim' : 'stand', ang, 1, k + 1);
    });
    const roofUp = h.phase === 'rocket' ? Math.min(1, h.rt / 25) : h.phase === 'leave' ? Math.max(0, 1 - h.lt / 20) : 0;
    if (roofUp > 0) {
      const ang = h.raim ? Math.atan2(h.raim.y - (T - 37), h.raim.x - (h.x - VAN.hatch + 3)) : -0.4;
      this.agent(g, h.x - VAN.hatch, T, 1, h.rocket && h.rocket.boom >= 0 ? 'stand' : 'launcher', ang, roofUp, 0);
      g.fillStyle(0x0a0a0c, 1); g.fillRect(h.x - VAN.hatch - 12, T - 2, 24, 3);                         // (the hatch rim, in front of his legs)
    }
    for (const f of match.fighters)                                                                    // anyone on the road in front of it is run over
      if (f.alive && f.x > h.x - DEA.ram.reach && f.x < h.x + 10 && f.y > ROAD.y - 40 && f.y <= ROAD.y + 2) this.runOver(match, f, h.x);
    // bullets: little bright tracers
    for (const b of h.bullets) {
      if (b.life <= 0) continue;
      b.x += b.vx; b.y += b.vy; b.life--;
      hz.lineStyle(2, 0xfff0a0, 1); hz.lineBetween(b.x, b.y, b.x - b.vx * 0.6, b.y - b.vy * 0.6);
      out.push({ x1: b.x - 4, x2: b.x + 4, y1: b.y - 4, y2: b.y + 4, dmg: DEA.shot.dmg, angle: DEA.shot.angle, base: DEA.shot.base, growth: DEA.shot.growth, id: 'bullet' + h.id + ':' + b.id, hazard: true, dirX: 1 });
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
        if (n.boom < 14) { hz.fillStyle(0xffe08a, 0.9 * (1 - n.boom / 14)); hz.fillCircle(n.x, n.y - 8, DEA.radius * 0.6); hz.fillStyle(0xff8a2a, 0.6 * (1 - n.boom / 14)); hz.fillCircle(n.x, n.y - 10, DEA.radius); }
        if (n.boom < 5) out.push({ x1: n.x - DEA.radius, x2: n.x + DEA.radius, y1: n.y - DEA.radius * 1.3, y2: n.y + 8, dmg: DEA.boom.dmg, angle: DEA.boom.angle, base: DEA.boom.base, growth: DEA.boom.growth, id: 'nade' + h.id + ':' + n.id, hazard: true, radial: true });
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
    return h.phase === 'leave' && h.x < -1000 && h.nades.every((n) => n.boom > 14) && h.bullets.every((b) => b.life <= 0);
  }
}

// Miniature of DUST RUNNER for the select screen: blue sky, the sun, red mesas, the highway, the cream motorhome with its brown stripes
export function drawDesertPreview(g, x, y, w, h) {
  const P = DPAL, bh = Math.ceil(h * 0.62 / 7);
  P.sky.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(x, y + i * bh, w, bh); });
  g.fillStyle(P.sun, 1); g.fillCircle(x + w * 0.75, y + h * 0.2, 8);
  g.fillStyle(P.mesa, 1); g.fillRect(x + w * 0.08, y + h * 0.4, w * 0.2, h * 0.25); g.fillRect(x + w * 0.6, y + h * 0.34, w * 0.14, h * 0.3);
  g.fillStyle(P.sand, 1); g.fillRect(x, y + h * 0.62, w, h * 0.38);
  g.fillStyle(P.road, 1); g.fillRect(x, y + h * 0.8, w, h * 0.12); for (let k = 0; k < 6; k++) { g.fillStyle(P.line, 1); g.fillRect(x + k * w / 6, y + h * 0.855, w / 14, 2); }
  const rx = x + w * 0.3, ry = y + h * 0.55, rw = w * 0.4, rh = h * 0.26;
  g.fillStyle(P.outline, 1); g.fillRect(rx - 1, ry - 1, rw + 2, rh + 2); g.fillStyle(P.body, 1); g.fillRect(rx, ry, rw, rh);
  g.fillStyle(0xeee6d2, 1); g.fillRect(rx, ry, rw, rh); g.fillStyle(0x8a4a28, 1); g.fillRect(rx, ry + 3, rw, 3); g.fillRect(rx, ry + rh * 0.6, rw, 3); g.fillStyle(0xe8b830, 1); g.fillRect(rx, ry + 6, rw, 1); g.fillRect(rx, ry + rh * 0.6 - 1, rw, 1); g.fillStyle(P.glass, 1); g.fillRect(rx + rw - 14, ry + 4, 12, 9);
  g.fillStyle(P.tyre, 1); g.fillCircle(rx + rw * 0.2, ry + rh, 5); g.fillCircle(rx + rw * 0.8, ry + rh, 5);
  g.fillStyle(P.dust, 0.5); g.fillCircle(rx - 10, ry + rh, 8); g.fillCircle(rx - 24, ry + rh - 4, 10);
}

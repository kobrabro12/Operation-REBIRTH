// DUST RUNNER: an old motorhome barrelling down a desert highway at full speed - and you're fighting on its roof.
// The whole world rushes past: the road, the dust, the telephone poles, the cacti, the mesas far off. The roof is the
// stage (plus the luggage rack at the back and the air-con box). Fall off and you land on the road, which drags you
// away backwards at highway speed - you get one good jump to make it back up (or a grab at the roof's edge) before
// you're left behind. Get caught in front of it and the bumper hits you.
// The only hazard: THE SWAT VAN - a black armoured van pulls up behind, two officers climb out of its roof hatch, red
// laser sights sweep the roof, bursts of gunfire follow, and they lob grenades that bounce and blink before they go
// off. Then it falls back and is gone.
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
const SWAT = { arrive: 90, volleys: 3, aim: 46, burst: 3, gap: 7, bulletSpeed: 14, shot: { dmg: 4, angle: 30, base: 2.6, growth: 1.6 },
  grenades: 2, fuse: 70, radius: 38, boom: { dmg: 13, angle: 70, base: 5.0, growth: 4.4 }, ram: { dmg: 12, angle: 150, base: 6.0, growth: 3.4 } };

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
    this.cycle = new HazardCycle(this, ['swat'], { color: '#ff3a3a', stroke: '#06080e', gap: 620, jitter: 300, first: 480 });
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
    this.rvG = s.add.graphics(); worldLayer.push(this.rvG);         // the motorhome (wheels turn, so it's redrawn)
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
  // the motorhome: a long boxy 1980s camper, white with teal stripes and a bit of rust, a cab with a big windscreen, an
  // over-cab bunk, side windows, a door, a spare tyre and a ladder at the back, its wheels spinning
  rv(g, t) {
    const P = DPAL, top = 0, bot = ROAD.y - 14, x1 = -150, x2 = 150;
    const bob = Math.round(Math.sin(t * 0.5) * 0.6);
    g.clear();
    g.fillStyle(P.outline, 1); g.fillRect(x1 - 2, top - 2, x2 - x1 + 4, bot - top + 4);
    g.fillStyle(P.body, 1); g.fillRect(x1, top, x2 - x1, bot - top);
    g.fillStyle(P.bodyShade, 1); g.fillRect(x1, bot - 14, x2 - x1, 14); g.fillRect(x1, top, x2 - x1, 3);
    g.fillStyle(P.stripe, 1); g.fillRect(x1, top + 40, x2 - x1, 6); g.fillStyle(P.stripe2, 1); g.fillRect(x1, top + 48, x2 - x1, 3);   // the stripes
    g.fillStyle(P.rust, 0.8); g.fillRect(x1 + 20, bot - 8, 18, 5); g.fillRect(x2 - 90, bot - 10, 8, 6); g.fillRect(x1 + 2, top + 30, 3, 9);   // rust
    // the cab at the front (right): the windscreen, a mirror, the headlight, the bumper
    g.fillStyle(P.glass, 1); g.fillRect(x2 - 34, top + 14, 30, 22); g.fillStyle(P.glassLit, 1); g.fillTriangle(x2 - 30, top + 14, x2 - 20, top + 14, x2 - 30, top + 30);
    g.fillStyle(P.chrome, 1); g.fillRect(x2 + 2, top + 20, 4, 8); g.fillRect(x2, bot - 18, 6, 10);
    g.fillStyle(0xfff4c0, 1); g.fillRect(x2 - 2, bot - 24, 4, 5);
    // side windows, the door, the spare tyre and ladder at the back
    for (const wx of [x1 + 30, x1 + 80, x1 + 160]) { g.fillStyle(P.glass, 1); g.fillRect(wx, top + 12, 30, 20); g.fillStyle(P.glassLit, 1); g.fillRect(wx + 2, top + 13, 8, 2); g.fillStyle(0xd8c8a0, 1); g.fillRect(wx, top + 12, 30, 4); }
    g.fillStyle(P.bodyShade, 1); g.fillRect(x1 + 122, top + 10, 24, bot - top - 16); g.fillStyle(P.glass, 1); g.fillRect(x1 + 126, top + 14, 16, 12); g.fillStyle(P.chrome, 1); g.fillRect(x1 + 140, top + 46, 3, 2);
    g.fillStyle(P.tyre, 1); g.fillCircle(x1 - 4, top + 40, 11); g.fillStyle(P.hub, 1); g.fillCircle(x1 - 4, top + 40, 4);
    g.lineStyle(2, P.chrome, 1); g.lineBetween(x1 + 4, top - 42, x1 + 4, bot - 10); g.lineBetween(x1 + 12, top - 42, x1 + 12, bot - 10); for (let y = top - 36; y < bot - 10; y += 9) g.lineBetween(x1 + 4, y, x1 + 12, y);
    // the luggage rack at the back of the roof (a ledge) with a strapped-down tarp, and the air-con box (a ledge)
    const R = this.platforms[1];
    g.lineStyle(2, P.chrome, 1); g.strokeRect(R.x1, R.y, R.x2 - R.x1, -R.y); g.fillStyle(0x6a5a3a, 1); g.fillRect(R.x1 + 4, R.y + 4, R.x2 - R.x1 - 8, -R.y - 6); g.fillStyle(0x8a7a52, 1); g.fillRect(R.x1 + 4, R.y + 4, R.x2 - R.x1 - 8, 4);
    g.lineStyle(1, 0x2a2018, 1); g.lineBetween(R.x1 + 16, R.y + 4, R.x1 + 16, -2); g.lineBetween(R.x2 - 16, R.y + 4, R.x2 - 16, -2);
    const A = this.platforms[2];
    g.fillStyle(P.outline, 1); g.fillRect(A.x1 - 1, A.y - 1, A.x2 - A.x1 + 2, -A.y + 1); g.fillStyle(P.bodyShade, 1); g.fillRect(A.x1, A.y, A.x2 - A.x1, -A.y); g.fillStyle(P.body, 1); g.fillRect(A.x1, A.y, A.x2 - A.x1, 3);
    for (let x = A.x1 + 4; x < A.x2 - 2; x += 4) { g.fillStyle(0x8a9298, 1); g.fillRect(x, A.y + 6, 2, -A.y - 9); }
    // the wheels: tyres, chrome hubs, spokes going round
    for (const wx of [x1 + 40, x2 - 50]) {
      const wy = bot + 2;
      g.fillStyle(P.outline, 1); g.fillRect(wx - 18, bot - 12, 36, 12);                                    // the wheel arch
      g.fillStyle(P.tyre, 1); g.fillCircle(wx, wy + bob, 13); g.fillStyle(P.hub, 1); g.fillCircle(wx, wy + bob, 6);
      const a = -t * 0.6; g.lineStyle(2, 0x5a5a5a, 1); for (let k = 0; k < 3; k++) { const b = a + k * 2.094; g.lineBetween(wx, wy + bob, wx + Math.cos(b) * 6, wy + bob + Math.sin(b) * 6); }
    }
    // the dust cloud kicked up behind it
    for (let i = 0; i < 6; i++) { const k = ((t * 0.08 + i / 6) % 1); g.fillStyle(P.dust, 0.45 * (1 - k)); g.fillCircle(x1 - 20 - k * 160, bot + 4 - k * 20, 8 + k * 24); }
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
      g.lineStyle(3, 0x0a0a0c, 1); g.lineBetween(ox + 2, hy + 6, ox + 2 + Math.cos(a) * 18, hy + 6 + Math.sin(a) * 18);
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
          if (h.volley >= SWAT.volleys) h.phase = 'leave';
        }
      }
    }
    h.aims = h.targets ? h.targets.map((tg, k) => Math.atan2(tg.y - gunY, tg.x - gunX[k])) : null;
    const up = h.phase === 'arrive' ? Math.min(1, Math.max(0, (h.t - 50) / 30)) : h.phase === 'leave' ? Math.max(0, 1 - h.lt / 20) : 1;
    if (h.phase === 'leave') { h.lt = (h.lt || 0) + 1; if (h.lt > 30) h.x -= (h.lt - 30) * 0.4; }
    this.van(g, h.x, h.t, up, h.aims);
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

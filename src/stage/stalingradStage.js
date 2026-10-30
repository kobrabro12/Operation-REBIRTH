// STALINGRAD: the ruins of a factory city on the Volga in the winter of 1942. You fight on the cracked concrete floor of
// a gutted factory hall - rubble, sandbags, an abandoned field gun, a fire in an oil drum - under the broken floors
// and girders of what's left of it. Behind: a snowy dusk sky glowing orange from fires, smoke columns, a skyline of
// shattered apartment blocks, a grain elevator, broken chimneys and the frozen river; a red flag flies over the ruins.
// Unlocked by buying the VODKA (Trinkets > SHOP > EXTRAS, on the shelf after the shopkeeper's code PAPERSPLEASE);
// the stage entry carries `shop: 'ext-vodka'`. Music: Mason's pixelated_audio 17 ('bgm_shop_soviet').
// Hazards (HazardCycle):
//   ARTILLERY  red marks appear on the floor and ledges, a whistle rises - then the shells land and blow up
//   SNIPER     a glint in the ruined tower on the right; a sight-line follows one fighter, turns red and locks - then BANG
//   COLLAPSE   a broken wall up above cracks and comes down on one of the ledges in chunks
// All art is drawn in code.
import { sfx } from '../audio/sfx.js';
import { HazardCycle } from './hazardCycle.js';

export const SPAL = {
  sky: [0x2a2e3a, 0x343744, 0x40404c, 0x4e4850, 0x625450, 0x7a6050, 0x96704e],
  ruin: 0x1e1e24, ruinLit: 0x2c2a30, ruinFar: 0x3a3a44, concrete: 0x6e6a66, concreteLit: 0x8e8a84, concreteDark: 0x4a4644,
  rebar: 0x6a3a22, snow: 0xe8ecf4, snowShade: 0xb8c0d0, fire: 0xff8a2a, fireHot: 0xffe08a, smoke: 0x2a2826, red: 0xc8201e,
  sand: 0x8a7a56, sandLit: 0xa8986a, metal: 0x3a4030, metalLit: 0x56603e, outline: 0x0e0e12, ice: 0xa8b8c8,
};

// ARTILLERY: how many shells, how long the marks show before they land, and how hard they hit
const SHELLS = { count: 5, warn: 100, gap: 14, radius: 34, dmg: 13, angle: 75, base: 5.0, growth: 4.6 };
// SNIPER: how long it tracks before locking, how long the lock lasts before the shot, and the shot
const SNIPER = { from: [430, -250], track: 120, lock: 26, dmg: 16, angle: 30, base: 6.0, growth: 5.6, width: 14 };
// COLLAPSE: the chunks of wall that fall, how long the cracks show first, and how hard a chunk hits
const COLLAPSE = { chunks: 7, warn: 80, dmg: 9, angle: 85, base: 3.6, growth: 3.4 };

export class StalingradStage {
  constructor(scene) {
    this.scene = scene;
    this.platforms = [
      { x1: -262, x2: 262, y: 0, solid: true, bottom: 70 },     // the factory floor
      { x1: -214, x2: -104, y: -92, solid: false },            // what's left of the upper floors
      { x1: 104, x2: 218, y: -100, solid: false },
      { x1: -58, x2: 62, y: -178, solid: false },              // a bent girder across the top
    ];
    this.spawns = [{ x: -150, y: 0 }, { x: 150, y: 0 }, { x: -50, y: 0 }, { x: 50, y: 0 }];
    this.hazardsOn = true;
    this.music = 'bgm_shop_soviet';
    this.t = 0;
    this.cycle = new HazardCycle(this, ['artillery', 'sniper', 'collapse'], { color: '#ff5a3a', stroke: '#1a0806', gap: 560, jitter: 240, first: 420 });
  }

  // ---------------------------------------------------------------- drawing (built once)
  draw(worldLayer, bgLayer) {
    const s = this.scene, P = SPAL;
    const sky = s.add.graphics().setScrollFactor(0);
    P.sky.forEach((c, i) => { sky.fillStyle(c, 1); sky.fillRect(-400, -60 + i * 60, 1440, 61); });
    sky.fillStyle(P.sky[6], 1); sky.fillRect(-400, -60 + 7 * 60, 1440, 400);
    for (const [x, w, a] of [[80, 260, 0.22], [430, 320, 0.25], [700, 200, 0.18]]) { sky.fillStyle(0xff7a2a, a); sky.fillEllipse(x, 236, w, 70); sky.fillStyle(0xffb050, a * 0.6); sky.fillEllipse(x, 246, w * 0.5, 30); }   // fires glowing on the horizon
    bgLayer.push(sky);
    // smoke columns rising from the city (drawn per frame so they drift)
    this.smoke = s.add.graphics().setScrollFactor(0.06); bgLayer.push(this.smoke);
    // the far skyline: the frozen river, shattered blocks, the grain elevator, broken chimneys, a red flag over the ruins
    const far = s.add.graphics().setScrollFactor(0.12); far.y = -30;
    far.fillStyle(0x24242c, 1); far.fillRect(-300, 326, 1400, 500); for (let i = 0; i < 60; i++) { far.fillStyle(P.snowShade, 0.35); far.fillRect(-300 + (i * 97) % 1400, 334 + (i * 53) % 120, 10 + (i % 4) * 6, 1); }   // the snowy far bank, under it all
    far.fillStyle(P.ice, 1); far.fillRect(-300, 300, 1400, 30); for (let i = 0; i < 30; i++) { far.fillStyle(0xd8e4ee, 0.7); far.fillRect(-300 + i * 47, 304 + (i % 3) * 7, 18 + (i % 4) * 6, 2); }   // the Volga, frozen
    for (let i = 0; i < 26; i++) {
      const x = -260 + i * 52 + (i * 17) % 13, h = 50 + (i * 41) % 70, y = 300;
      far.fillStyle(P.ruinFar, 1); far.fillRect(x, y - h, 40, h);
      far.fillStyle(P.sky[5], 1); far.fillTriangle(x + 40, y - h, x + 40, y - h + 22, x + 16 + (i % 3) * 6, y - h);   // broken tops
      for (let wy = y - h + 8; wy < y - 6; wy += 11) for (let wx = x + 5; wx < x + 36; wx += 9) { far.fillStyle((wx * 3 + wy) % 7 ? 0x24242c : 0x8a5a3a, 1); far.fillRect(wx, wy, 4, 6); }   // empty windows (a few lit by fire)
    }
    far.fillStyle(0x30303a, 1); far.fillRect(330, 150, 70, 150); for (let k = 0; k < 6; k++) far.fillRect(334 + k * 11, 136, 8, 18);   // the grain elevator
    far.fillStyle(P.sky[5], 1); far.fillRect(352, 180, 14, 20); far.fillRect(374, 222, 10, 14);                              // shell holes in it
    for (const [x, h, br] of [[170, 120, 0], [610, 140, 28], [760, 100, 0]]) { far.fillStyle(0x2a2a32, 1); far.fillRect(x, 300 - h, 10, h - br); }   // chimneys (one snapped off)
    far.lineStyle(1, 0x8a8a90, 1); far.lineBetween(540, 200, 540, 160); this.flagAt = { x: 540, y: 160 };
    bgLayer.push(far);
    this.flag = s.add.graphics().setScrollFactor(0.12); this.flag.y = -30; bgLayer.push(this.flag);
    // nearer ruins either side of the hall, and the sniper's tower on the right
    const near = s.add.graphics().setScrollFactor(0.45);
    for (const [x, w, h] of [[-470, 110, 200], [-350, 70, 140], [350, 80, 150], [460, 110, 220]]) {   // (kept low and to the sides, so the hall stays readable)
      near.fillStyle(0x34323a, 1); near.fillRect(x, -h + 60, w, h + 200); near.fillStyle(0x42404a, 1); near.fillRect(x, -h + 60, 3, h + 200);
      for (let wy = -h + 72; wy < 50; wy += 22) for (let wx = x + 10; wx < x + w - 14; wx += 20) { near.fillStyle((wx + wy) % 5 ? 0x18181e : 0x6a4a34, 1); near.fillRect(wx, wy, 10, 14); }
      near.fillStyle(P.sky[3], 1); near.fillTriangle(x + w, -h + 60, x + w, -h + 100, x + w * 0.4, -h + 60);
      near.fillStyle(P.snow, 0.8); near.fillRect(x, -h + 59, w * 0.4, 2);
    }
    bgLayer.push(near);
    // the hall itself (world layer)
    const g = s.add.graphics(); this.hall(g); worldLayer.push(g);
    this.tower = s.add.graphics(); this.sniperTower(this.tower); worldLayer.push(this.tower);
    this.fxG = s.add.graphics(); worldLayer.push(this.fxG);      // the fire, the flag, snow on top
    this.hzG = s.add.graphics(); worldLayer.push(this.hzG);      // hazards
    this.snowG = s.add.graphics().setScrollFactor(0); bgLayer.push(this.snowG);
    this.cycle.makeBanner(s);
  }

  // the factory floor and what's left of the hall: cracked concrete, rebar, rubble, sandbags, the field gun, broken floors
  hall(g) {
    const P = SPAL, F = this.platforms[0];
    // the slab and its broken underside
    const body = [[F.x1, 0], [F.x2, 0], [F.x2 - 6, 24], [F.x2 - 30, 40], [180, 56], [120, 64], [40, 70], [-60, 68], [-140, 60], [-200, 48], [F.x1 + 20, 30], [F.x1, 12]];
    g.fillStyle(P.outline, 1); g.fillPoints(body.map(([x, y]) => ({ x: x * 1.02, y: y + 3 })), true);
    g.fillStyle(P.concreteDark, 1); g.fillPoints(body.map(([x, y]) => ({ x, y })), true);
    g.fillStyle(P.concrete, 1); g.fillRect(F.x1, 0, F.x2 - F.x1, 14);
    for (let x = F.x1 + 6; x < F.x2 - 6; x += 22) { g.fillStyle(P.concreteLit, 1); g.fillRect(x, 2, 12, 2); }
    g.lineStyle(1, P.outline, 1); for (const [a, b, c] of [[-170, 4, 14], [-40, 2, 12], [90, 3, 13], [200, 5, 14]]) { g.lineBetween(a, b, a + 8, c); g.lineBetween(a + 8, c, a + 2, c + 20); }   // cracks
    g.lineStyle(2, P.rebar, 1); for (const [x, y] of [[F.x2 - 8, 24], [F.x2 - 30, 40], [F.x1 + 18, 30], [-60, 68], [120, 64]]) { g.lineBetween(x, y, x + 6, y + 10); g.lineBetween(x - 4, y, x - 8, y + 12); }   // rebar sticking out
    g.fillStyle(P.snow, 1); g.fillRect(F.x1, -2, F.x2 - F.x1, 3); for (let x = F.x1; x < F.x2; x += 9) g.fillRect(x, -3 - (x % 3 === 0), 6, 1);   // snow along the top
    // rubble heaps, sandbags, a broken wall stub
    for (const [x, w, h] of [[-238, 30, 10], [226, 26, 9], [-20, 22, 6]]) { g.fillStyle(P.concreteDark, 1); g.fillTriangle(x - w / 2, 0, x + w / 2, 0, x, -h); g.fillStyle(P.concrete, 1); g.fillRect(x - 4, -h + 3, 6, 3); g.fillStyle(P.snow, 1); g.fillRect(x - 3, -h, 5, 1); }
    for (const [x0, n] of [[-206, 4], [150, 4]]) for (let r = 0; r < 2; r++) for (let k = 0; k < n - r; k++) {
      const bx = x0 + k * 13 + r * 6, by = -7 - r * 7;
      g.fillStyle(P.sand, 1); g.fillEllipse(bx + 6, by + 3, 14, 8); g.fillStyle(P.sandLit, 1); g.fillEllipse(bx + 5, by + 2, 10, 4); g.fillStyle(P.snow, 1); g.fillRect(bx + 2, by - 1, 7, 1);
    }
    g.fillStyle(P.ruin, 1); g.fillRect(-262, -54, 14, 54); g.fillTriangle(-262, -54, -248, -54, -262, -70); g.fillStyle(P.snow, 1); g.fillRect(-262, -55, 14, 2);   // a wall stub at the left edge
    // an abandoned field gun
    const gx = 60;
    g.fillStyle(P.metal, 1); g.fillRect(gx - 16, -16, 30, 9); g.fillStyle(P.metalLit, 1); g.fillRect(gx - 16, -16, 30, 2);   // the shield
    g.lineStyle(3, P.metal, 1); g.lineBetween(gx + 10, -14, gx + 44, -24); g.fillStyle(P.outline, 1); g.fillCircle(gx + 44, -24, 2);   // the barrel
    g.fillStyle(P.outline, 1); g.fillCircle(gx - 6, -5, 6); g.fillCircle(gx + 8, -5, 6); g.fillStyle(0x5a4a30, 1); g.fillCircle(gx - 6, -5, 4); g.fillCircle(gx + 8, -5, 4);   // wheels
    g.lineStyle(2, P.metal, 1); g.lineBetween(gx - 14, -8, gx - 34, 0); g.fillStyle(P.snow, 1); g.fillRect(gx - 16, -17, 30, 1);
    // the broken upper floors: concrete slabs, bent rebar, snow on top
    for (const p of this.platforms.slice(1, 3)) {
      const w = p.x2 - p.x1;
      g.fillStyle(P.outline, 1); g.fillRect(p.x1 - 1, p.y - 1, w + 2, 10);
      g.fillStyle(P.concrete, 1); g.fillRect(p.x1, p.y, w, 8); g.fillStyle(P.concreteDark, 1); g.fillRect(p.x1, p.y + 5, w, 3);
      g.fillStyle(P.concreteDark, 1); g.fillTriangle(p.x1 + w * 0.3, p.y + 8, p.x1 + w * 0.7, p.y + 8, p.x1 + w * 0.45, p.y + 20);
      g.lineStyle(1, P.rebar, 1); g.lineBetween(p.x2, p.y + 3, p.x2 + 8, p.y + 8); g.lineBetween(p.x1, p.y + 4, p.x1 - 6, p.y + 12);
      g.fillStyle(P.snow, 1); g.fillRect(p.x1, p.y - 1, w, 2);
      g.fillStyle(P.ruin, 0.9); g.fillRect(p.x1 + 6, p.y + 8, 6, -p.y - 8); g.fillRect(p.x2 - 12, p.y + 8, 6, -p.y - 8);   // its broken columns down to the floor
    }
    // the bent girder across the top
    const T = this.platforms[3];
    g.fillStyle(P.outline, 1); g.fillRect(T.x1 - 1, T.y - 1, T.x2 - T.x1 + 2, 8);
    g.fillStyle(0x5a3a2a, 1); g.fillRect(T.x1, T.y, T.x2 - T.x1, 6); g.fillStyle(0x7a5236, 1); g.fillRect(T.x1, T.y, T.x2 - T.x1, 2);
    for (let x = T.x1 + 6; x < T.x2; x += 14) { g.fillStyle(P.outline, 1); g.fillCircle(x, T.y + 3, 1); }
    g.fillStyle(P.snow, 1); g.fillRect(T.x1, T.y - 1, T.x2 - T.x1, 1);
  }

  // the sniper's tower: a gutted block on the right with one window high up
  sniperTower(g) {
    const P = SPAL, [sx, sy] = SNIPER.from;
    g.fillStyle(0x3a3840, 1); g.fillRect(sx - 22, sy - 30, 48, 340); g.fillTriangle(sx - 22, sy - 30, sx + 26, sy - 30, sx - 22, sy - 62);
    g.fillStyle(0x4a4850, 1); g.fillRect(sx - 22, sy - 30, 4, 340);
    for (let y = sy + 30; y < sy + 300; y += 30) for (const x of [sx - 14, sx + 8]) { g.fillStyle(P.outline, 1); g.fillRect(x, y, 10, 14); }
    for (const [x, y, r] of [[sx + 18, sy + 70, 9], [sx - 10, sy + 160, 7]]) { g.fillStyle(P.sky[3], 1); g.fillCircle(x, y, r); }   // shell holes right through it
    g.fillStyle(P.outline, 1); g.fillRect(sx - 8, sy - 8, 16, 16);                                        // the sniper's window
    g.fillStyle(P.snow, 1); g.fillRect(sx - 22, sy - 31, 48, 2);
  }

  // ---------------------------------------------------------------- per frame
  step(match) {
    this.t++;
    this.hzG.clear();
    this.ambience();
    return this.cycle.run(match, []);
  }
  ambience() {
    const t = this.t, P = SPAL, f = this.fxG, sm = this.smoke, sn = this.snowG, fl = this.flag;
    f.clear(); sm.clear(); sn.clear(); fl.clear();
    for (const [x, ph] of [[60, 0], [300, 2], [520, 4], [760, 1]]) for (let k = 0; k < 7; k++) {          // smoke columns, drifting with the wind
      const yy = 300 - k * 34 - (t * 0.2 + ph * 9) % 34, xx = x + k * k * 2 + Math.sin(t * 0.01 + k + ph) * 6;
      sm.fillStyle(P.smoke, 0.32 - k * 0.035); sm.fillEllipse(xx, yy, 30 + k * 10, 24 + k * 6);
    }
    const { x: fx, y: fy } = this.flagAt, fp = [];                                                          // the red flag over the ruins
    for (let i = 0; i <= 6; i++) fp.push({ x: fx + i * 3, y: fy + Math.sin(t * 0.1 - i * 0.8) * 1.4 * i / 6 });
    for (let i = 6; i >= 0; i--) fp.push({ x: fx + i * 3, y: fy + 12 + Math.sin(t * 0.1 - i * 0.8) * 1.4 * i / 6 });
    fl.fillStyle(P.red, 1); fl.fillPoints(fp, true);
    // the fire in an oil drum on the floor
    const dx = -120;
    f.fillStyle(0x3a3a2a, 1); f.fillRect(dx - 7, -16, 14, 16); f.fillStyle(0x4e4e38, 1); f.fillRect(dx - 7, -16, 3, 16); f.fillStyle(P.outline, 1); f.fillRect(dx - 7, -10, 14, 1);
    for (let i = 0; i < 6; i++) { const k = ((t * 0.12 + i * 0.37) % 1), x = dx + Math.sin(t * 0.3 + i * 2) * 4, y = -16 - k * 18; f.fillStyle(k < 0.4 ? P.fireHot : P.fire, 1 - k); f.fillCircle(x, y, 4 * (1 - k) + 1); }
    f.fillStyle(P.fire, 0.08 + 0.03 * Math.sin(t * 0.4)); f.fillCircle(dx, -14, 34);
    if (t % 6 === 0) this.scene.particles && this.scene.particles.push({ x: dx + (Math.random() - 0.5) * 8, y: -30, vx: (Math.random() - 0.5) * 0.4, vy: -0.8, life: 30, color: P.fireHot, size: 1, grav: -0.01 });   // embers
    // snow, drifting across the whole view
    for (let i = 0; i < 70; i++) { const x = ((i * 97 + t * (0.6 + (i % 5) * 0.15) + Math.sin(t * 0.02 + i) * 10) % 700) - 30, y = ((i * 53 + t * (0.5 + (i % 3) * 0.3)) % 380) - 10; sn.fillStyle(P.snow, 0.5 + (i % 3) * 0.2); sn.fillRect(x, y, 1 + (i % 6 === 0), 1 + (i % 6 === 0)); }
  }

  // ---------------------------------------------------------------- hazards
  // ARTILLERY: red marks on the floor and ledges where each shell will land, a whistle rising, then the shells come down
  // one after another and blow up - a burst of fire, dirt and smoke.
  start_artillery(match, h) {
    h.title = 'ARTILLERY!';
    h.shells = [];
    for (let i = 0; i < SHELLS.count; i++) {
      const p = Math.random() < 0.7 ? this.platforms[0] : this.platforms[1 + Math.floor(Math.random() * 3)];
      h.shells.push({ x: p.x1 + 20 + Math.random() * (p.x2 - p.x1 - 40), y: p.y, at: SHELLS.warn + i * SHELLS.gap, id: i });
    }
  }
  step_artillery(match, h, out) {
    const g = this.hzG, P = SPAL;
    if (h.t === SHELLS.warn - 50) sfx('whoosh', 0.5, 0.5);
    for (const s of h.shells) {
      const dt = h.t - s.at;
      if (dt < 0) {                                                  // the mark: a red ring, pulsing faster as it gets close
        const k = 1 - Math.max(0, -dt) / (SHELLS.warn + s.id * SHELLS.gap), on = (h.t >> (k > 0.7 ? 1 : 2)) % 2;
        g.lineStyle(2, P.red, 0.4 + 0.5 * on); g.strokeEllipse(s.x, s.y - 1, SHELLS.radius * 1.4, 8);
        g.fillStyle(P.red, 0.15 * k); g.fillEllipse(s.x, s.y - 1, SHELLS.radius * 1.4 * k, 8 * k);
        if (dt > -12) { g.lineStyle(2, 0x2a2a2a, 1); g.lineBetween(s.x - dt * 2, s.y + dt * 22, s.x - dt * 2 + 3, s.y + dt * 22 - 10); }   // the shell, coming down
        continue;
      }
      if (dt === 0) {
        sfx('bighit', 0.8, 0.55); sfx('thunder', 0.4, 1.4); match.shake(8, 10);
        for (let i = 0; i < 16; i++) { const a = -Math.PI * Math.random(), sp = 1 + Math.random() * 4; match.particles.push({ x: s.x, y: s.y - 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 1.4, life: 26 + Math.random() * 20, color: [P.fire, P.fireHot, 0x5a4a3a, P.snow][i % 4], size: 2 + (i % 3), grav: 0.14, drag: 0.96 }); }
      }
      if (dt < 18) {                                                 // the blast
        const r = SHELLS.radius * Math.min(1, dt / 5 + 0.3);
        g.fillStyle(P.fireHot, 0.9 * (1 - dt / 18)); g.fillCircle(s.x, s.y - 10, r * 0.6);
        g.fillStyle(P.fire, 0.6 * (1 - dt / 18)); g.fillCircle(s.x, s.y - 14, r);
        g.fillStyle(P.smoke, 0.5 * (dt / 18)); g.fillCircle(s.x, s.y - 20 - dt, r * 0.9);
        if (dt < 6) out.push({ x1: s.x - SHELLS.radius, x2: s.x + SHELLS.radius, y1: s.y - SHELLS.radius * 1.4, y2: s.y + 4, dmg: SHELLS.dmg, angle: SHELLS.angle, base: SHELLS.base, growth: SHELLS.growth, id: 'shell' + h.id + ':' + s.id, hazard: true, radial: true });
      } else if (dt < 70) { g.fillStyle(P.smoke, 0.35 * (1 - (dt - 18) / 52)); g.fillCircle(s.x + (dt - 18) * 0.3, s.y - 30 - (dt - 18) * 0.6, 20 + (dt - 18) * 0.3); }   // smoke drifting up
    }
    return h.t > SHELLS.warn + SHELLS.count * SHELLS.gap + 70;
  }

  // SNIPER: a glint in the tower window; a thin sight-line follows one fighter for a while, goes red and stops - then
  // the shot. Keep moving while it's red.
  start_sniper(match, h) {
    h.title = 'SNIPER!';
    const live = match.fighters.filter((f) => f.alive && f.state !== 'respawn');
    h.target = live.length ? live[Math.floor(Math.random() * live.length)] : null;
    h.aim = null; sfx('glass', 0.4, 2);
  }
  step_sniper(match, h, out) {
    const g = this.hzG, P = SPAL, [sx, sy] = SNIPER.from, T = h.target, fire = SNIPER.track + SNIPER.lock;
    const k = (h.t >> 3) % 2;
    g.fillStyle(0xffffff, 0.6 + 0.4 * k); g.fillRect(sx - 4, sy, 9, 1); g.fillRect(sx, sy - 4, 1, 9);      // the glint
    if (!T || !T.alive) return h.t > 60;
    if (h.t <= SNIPER.track) h.aim = { x: T.x, y: T.y - 28 };                                              // following them
    const a = h.aim, locked = h.t > SNIPER.track;
    if (h.t < fire) {
      g.lineStyle(1, locked ? P.red : 0xffffff, locked ? 0.9 : 0.35); g.lineBetween(sx, sy, a.x, a.y);
      g.lineStyle(1, locked ? P.red : 0xffffff, 0.8); g.strokeCircle(a.x, a.y, locked ? 6 : 10 - (h.t % 20) * 0.2);
      if (h.t === SNIPER.track + 1) sfx('warn', 0.6, 1.4);
      return false;
    }
    if (h.t === fire) {                                               // BANG: the shot goes down the line, on past where they were
      sfx('bighit', 0.9, 1.4); match.shake(5, 6);
      const dx = a.x - sx, dy = a.y - sy, len = Math.hypot(dx, dy);
      h.shot = { ux: dx / len, uy: dy / len };
      for (let d = 0; d < len + 160; d += 12) {
        const x = sx + h.shot.ux * d, y = sy + h.shot.uy * d, w = SNIPER.width;
        out.push({ x1: x - w / 2, x2: x + w / 2, y1: y - w / 2, y2: y + w / 2, dmg: SNIPER.dmg, angle: SNIPER.angle, base: SNIPER.base, growth: SNIPER.growth, id: 'snipe' + h.id, hazard: true, dirX: Math.sign(dx) || -1 });
      }
    }
    const st = h.t - fire;
    if (h.shot && st < 10) { g.lineStyle(3 - st * 0.25, P.fireHot, 1 - st / 10); g.lineBetween(sx, sy, sx + h.shot.ux * 900, sy + h.shot.uy * 900); g.fillStyle(P.fireHot, 1 - st / 10); g.fillCircle(sx, sy, 6 - st * 0.4); }
    return st > 20;
  }

  // COLLAPSE: cracks run across a wall high above one of the ledges, dust trickles - then it comes down in chunks
  start_collapse(match, h) {
    h.title = 'COLLAPSE!';
    const p = this.platforms[1 + Math.floor(Math.random() * 3)];
    h.p = p; h.chunks = [];
    for (let i = 0; i < COLLAPSE.chunks; i++) h.chunks.push({ x: p.x1 + 6 + Math.random() * (p.x2 - p.x1 - 12), y: p.y - 240 - Math.random() * 60, vy: 0, at: COLLAPSE.warn + i * 6, s: 6 + Math.floor(Math.random() * 6), spin: Math.random() * 3, done: false, id: i });
    sfx('rumble', 0.5, 0.8);
  }
  step_collapse(match, h, out) {
    const g = this.hzG, P = SPAL, p = h.p;
    if (h.t < COLLAPSE.warn) {                                         // dust trickling down onto the ledge, a shadow growing
      const k = h.t / COLLAPSE.warn;
      for (let i = 0; i < 6; i++) { const x = p.x1 + ((i * 37 + h.t * 2) % (p.x2 - p.x1)), y = p.y - 200 + ((h.t * 3 + i * 40) % 200); g.fillStyle(P.concreteLit, 0.6); g.fillRect(x, y, 1, 3); }
      g.fillStyle(0x000000, 0.3 * k); g.fillEllipse((p.x1 + p.x2) / 2, p.y - 1, (p.x2 - p.x1) * k, 6);
      if (h.t % 20 === 0) match.shake(2, 4);
      return false;
    }
    let live = false;
    for (const c of h.chunks) {
      if (c.done || h.t < c.at) { live = live || !c.done; continue; }
      live = true;
      c.vy = Math.min(9, c.vy + 0.45); c.y += c.vy; c.spin += 0.15;
      g.fillStyle(P.outline, 1); g.fillRect(c.x - c.s / 2 - 1, c.y - c.s / 2 - 1, c.s + 2, c.s + 2);
      g.fillStyle(P.concrete, 1); g.fillRect(c.x - c.s / 2, c.y - c.s / 2, c.s, c.s); g.fillStyle(P.concreteLit, 1); g.fillRect(c.x - c.s / 2, c.y - c.s / 2, c.s, 2);
      out.push({ x1: c.x - c.s, x2: c.x + c.s, y1: c.y - c.s, y2: c.y + c.s, dmg: COLLAPSE.dmg, angle: COLLAPSE.angle, base: COLLAPSE.base, growth: COLLAPSE.growth, id: 'coll' + h.id + ':' + c.id, hazard: true });
      const land = this.platforms.find((q) => c.y >= q.y && c.y - c.vy < q.y && c.x >= q.x1 && c.x <= q.x2);
      if (land || c.y > 320) {
        c.done = true;
        if (land) { sfx('land', 0.5, 0.6); for (let i = 0; i < 6; i++) match.particles.push({ x: c.x, y: land.y - 2, vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 2, life: 20, color: i % 2 ? P.concrete : P.snow, size: 2, grav: 0.15 }); }
      }
    }
    return !live && h.t > COLLAPSE.warn;
  }
}

// Miniature of STALINGRAD for the select screen: a snowy dusk sky with fire on the horizon, ruined blocks, the grain
// elevator, a red flag, the factory floor and its broken upper floors
export function drawStalingradPreview(g, x, y, w, h) {
  const P = SPAL, bh = Math.ceil(h / 7);
  P.sky.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(x, y + i * bh, w, Math.min(bh, h - i * bh)); });
  g.fillStyle(0xff7a2a, 0.25); g.fillEllipse(x + w * 0.6, y + h * 0.8, w * 0.7, h * 0.3);
  for (let i = 0; i < 9; i++) { const bx = x + i * w / 9, bh2 = h * (0.25 + ((i * 37) % 30) / 100); g.fillStyle(P.ruinFar, 1); g.fillRect(bx, y + h * 0.78 - bh2, w / 9 - 2, bh2); }
  g.fillStyle(0x30303a, 1); g.fillRect(x + w * 0.62, y + h * 0.3, w * 0.12, h * 0.5);
  g.fillStyle(P.red, 1); g.fillRect(x + w * 0.28, y + h * 0.28, 6, 4); g.fillStyle(0x8a8a90, 1); g.fillRect(x + w * 0.28 - 1, y + h * 0.28, 1, 10);
  g.fillStyle(P.concrete, 1); g.fillRect(x + w * 0.1, y + h * 0.78, w * 0.8, 4); g.fillStyle(P.concreteDark, 1); g.fillRect(x + w * 0.14, y + h * 0.78 + 4, w * 0.72, h * 0.22 - 4);
  g.fillStyle(P.snow, 1); g.fillRect(x + w * 0.1, y + h * 0.78 - 1, w * 0.8, 1);
  g.fillStyle(P.concrete, 1); g.fillRect(x + w * 0.16, y + h * 0.55, w * 0.2, 2); g.fillRect(x + w * 0.64, y + h * 0.53, w * 0.2, 2);
  for (let i = 0; i < 14; i++) { g.fillStyle(0xffffff, 0.8); g.fillRect(x + (i * 29) % w, y + (i * 17) % h, 1, 1); }
}

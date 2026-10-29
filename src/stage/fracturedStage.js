// "FRACTURED": a giant galaxy-crystal fragment adrift in deep space - the shop's GALAXY FRAGMENT (Mason's gem,
// public/assets/shop/fragment.png) grown to the size of an island. You fight on its cut, flat top; its underside
// is cracked indigo crystal with a galaxy glowing inside. Three smaller shards float around it as ledges, more
// fragments drift in the distance, and the sky is a nebula full of twinkling four-point stars.
// Unlocked by buying the GALAXY FRAGMENT (Trinkets > SHOP > EXTRAS); the stage entry carries `shop: 'ext-fragment'`.
// Hazards (HazardCycle): SHARD RAIN - glints in the sky, then crystal shards drop straight down;
//                        CRYSTAL SURGE - cracks in the floor glow, then crystal spikes burst up out of them.
// All art is drawn in code; music: 'bgm_fractured' ("Shattered Starlight", tools/audio/fractured_music.py).
import { sfx } from '../audio/sfx.js';
import { HazardCycle } from './hazardCycle.js';

// the gem's own colours (from Mason's sprite)
export const GPAL = {
  space: [0x05030f, 0x080520, 0x0d082c, 0x130b3a, 0x1a1048, 0x211456, 0x281a62],
  gem: 0x4428bc, gemDark: 0x2c1a8a, gemDeep: 0x1a0f58, gemLight: 0x6888fc, gemPale: 0x9878f8, gemShine: 0xb8b8f8,
  cyan: 0x3cbcfc, ice: 0xa4e4fc, pink: 0xf878c8, white: 0xf8f8f8, teal: 0x004058, outline: 0x06030f,
};

// SHARD RAIN: how many shards, how hard they hit
const RAIN = { volleys: 2, perVolley: 5, gap: 70, dmg: 7, angle: 80, base: 3.2, growth: 3.2 };
// CRYSTAL SURGE: how many spikes, how long the cracks glow first, how hard they launch
const SURGE = { spikes: 3, warn: 80, up: 26, dmg: 10, angle: 86, base: 4.6, growth: 4.2 };

export class FracturedStage {
  constructor(scene) {
    this.scene = scene;
    this.platforms = [
      { x1: -250, x2: 250, y: 0, solid: true, bottom: 64 },     // the fragment's cut, flat top
      { x1: -206, x2: -96, y: -86, solid: false },             // floating shards
      { x1: 96, x2: 206, y: -86, solid: false },
      { x1: -54, x2: 54, y: -172, solid: false },
    ];
    this.spawns = [{ x: -150, y: 0 }, { x: 150, y: 0 }, { x: -50, y: 0 }, { x: 50, y: 0 }];
    this.hazardsOn = true;
    this.music = 'bgm_fractured';
    this.t = 0;
    this.cycle = new HazardCycle(this, ['rain', 'surge'], { color: '#b8b8f8', stroke: '#1a0f58', gap: 620, jitter: 260, first: 480 });
  }

  // ---------------------------------------------------------------- drawing (built once)
  draw(worldLayer, bgLayer) {
    const s = this.scene, P = GPAL;
    // deep space: hard bands, darkest at the top
    const sky = s.add.graphics().setScrollFactor(0);
    P.space.forEach((c, i) => { sky.fillStyle(c, 1); sky.fillRect(-400, -60 + i * 66, 1440, 67); });
    sky.fillStyle(P.space[6], 1); sky.fillRect(-400, -60 + 7 * 66, 1440, 400);
    // the nebula: stacked soft clouds of violet, blue and a little pink
    for (const [x, y, w, h, c, a] of [[120, 120, 520, 180, 0x5a2ab8, 0.18], [180, 140, 340, 110, 0x7a48e8, 0.16], [520, 260, 600, 200, 0x2a58c8, 0.16],
      [560, 250, 300, 100, 0x3cbcfc, 0.1], [300, 330, 420, 120, 0xb84898, 0.1], [40, 300, 260, 90, 0x6888fc, 0.12]]) {
      for (let k = 0; k < 4; k++) { sky.fillStyle(c, a * (1 - k * 0.2)); sky.fillEllipse(x, y, w * (1 - k * 0.2), h * (1 - k * 0.22)); }
    }
    // a dust lane of stars across it, like the band inside the gem
    for (let i = 0; i < 260; i++) { const x = (i * 7919) % 1100 - 230, y = 70 + (x + 230) * 0.25 + ((i * 104729) % 60) - 30; sky.fillStyle(i % 9 ? 0xb8b8f8 : 0xffffff, 0.25 + (i % 5) * 0.12); sky.fillRect(x, y, 1, 1); }
    for (let i = 0; i < 140; i++) { sky.fillStyle(0xffffff, 0.3 + (i % 4) * 0.15); sky.fillRect((i * 4973) % 1100 - 230, (i * 3089) % 420 - 40, 1 + (i % 11 === 0), 1); }
    bgLayer.push(sky);
    // a spiral galaxy far away
    const gal = s.add.graphics().setScrollFactor(0.08);
    this.galaxy(gal, 520, 70); bgLayer.push(gal);
    // twinkling stars (redrawn every frame)
    this.bgFx = s.add.graphics().setScrollFactor(0.15); bgLayer.push(this.bgFx);
    // fragments drifting in the distance (each its own object so it can bob)
    this.far = [];
    for (const [x, y, sz, sf] of [[-260, 60, 26, 0.3], [-80, 190, 14, 0.25], [700, 120, 34, 0.35], [520, 300, 18, 0.3], [860, 250, 12, 0.22], [120, 30, 10, 0.2]]) {
      const g = s.add.graphics().setScrollFactor(sf);
      this.shard(g, 0, 0, sz, 0.7); g.x = x; g.y = y; g.base = y; g.ph = x * 0.01;
      this.far.push(g); bgLayer.push(g);
    }
    // the fragment itself
    const g = s.add.graphics();
    this.island(g);
    worldLayer.push(g);
    // broken-off chips hanging under it, bobbing (drawn per frame), the floating shard ledges
    this.chips = s.add.graphics(); worldLayer.push(this.chips);
    for (const p of this.platforms.slice(1)) { const c = s.add.graphics(); this.ledge(c, p); worldLayer.push(c); }
    this.fxG = s.add.graphics(); worldLayer.push(this.fxG);   // sparkles, glow pulse
    this.hzG = s.add.graphics(); worldLayer.push(this.hzG);   // hazards
    this.cycle.makeBanner(s);
  }

  galaxy(g, x, y) {
    g.fillStyle(0x7a48e8, 0.12); g.fillEllipse(x, y, 140, 50);
    g.fillStyle(0xb8b8f8, 0.18); g.fillEllipse(x, y, 70, 24);
    for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 60; i++) {
      const a = i * 0.11 + arm * Math.PI, r = 4 + i * 1.1;
      g.fillStyle(i % 7 ? 0xa4e4fc : 0xffffff, 0.6 - i * 0.008); g.fillRect(x + Math.cos(a) * r * 1.8, y + Math.sin(a) * r * 0.55, 2, 1);
    }
    g.fillStyle(0xffffff, 0.9); g.fillEllipse(x, y, 10, 4);
  }

  // a crystal shard: a jagged, faceted chunk (used for the distant fragments and the debris)
  shard(g, x, y, s, a = 1) {
    const P = GPAL, pts = [[-0.5, -0.2], [-0.1, -0.6], [0.45, -0.35], [0.55, 0.2], [0.05, 0.62], [-0.45, 0.3]].map(([u, v]) => ({ x: x + u * s, y: y + v * s }));
    g.fillStyle(P.outline, a); g.fillPoints(pts.map((p) => ({ x: x + (p.x - x) * 1.12, y: y + (p.y - y) * 1.12 })), true);
    g.fillStyle(P.gem, a); g.fillPoints(pts, true);
    g.fillStyle(P.gemLight, a); g.fillTriangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, x, y);
    g.fillStyle(P.gemDark, a); g.fillTriangle(pts[3].x, pts[3].y, pts[4].x, pts[4].y, x, y);
    g.fillStyle(P.gemPale, a); g.fillRect(x - s * 0.18, y - s * 0.15, Math.max(1, s * 0.12), Math.max(1, s * 0.12));
  }

  // the big fragment: a flat cut top, a cracked, faceted underside with a galaxy inside
  island(g) {
    const P = GPAL, top = this.platforms[0];
    const body = [[-250, 0], [250, 0], [242, 22], [214, 52], [176, 84], [128, 112], [70, 140], [18, 164], [-26, 152], [-78, 128], [-132, 100], [-186, 70], [-228, 38], [-250, 0]];
    const pts = body.map(([x, y]) => ({ x, y }));
    g.fillStyle(P.outline, 1); g.fillPoints(body.map(([x, y]) => ({ x: x * 1.02, y: y * 1.04 + 2 })), true);
    g.fillStyle(P.gem, 1); g.fillPoints(pts, true);
    // facets: light on the upper left, dark on the lower right
    const tri = (c, a, b, d) => { g.fillStyle(c, 1); g.fillTriangle(a[0], a[1], b[0], b[1], d[0], d[1]); };
    tri(P.gemLight, [-250, 0], [-120, 0], [-186, 70]); tri(P.gemPale, [-250, 0], [-200, 0], [-228, 38]);
    tri(P.gemLight, [-120, 0], [-40, 0], [-132, 100]); tri(P.gem, [-40, 0], [60, 0], [-26, 152]);
    tri(P.gemDark, [60, 0], [176, 84], [70, 140]); tri(P.gemDark, [150, 0], [250, 0], [214, 52]);
    tri(P.gemDeep, [176, 84], [128, 112], [70, 140]); tri(P.gemDeep, [70, 140], [18, 164], [-26, 152]);
    tri(P.gemDark, [-132, 100], [-78, 128], [-26, 152]);
    // the galaxy inside: a bright diagonal band of violet and blue, full of stars (only inside the crystal)
    const inside = (x, y) => { let c = false; for (let i = 0, j = body.length - 1; i < body.length; j = i++) { const [xi, yi] = body[i], [xj, yj] = body[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    for (let x = -240; x < 240; x += 3) for (let y = 4; y < 160; y += 3) {
      const d = Math.abs((y - 20) - (x + 160) * 0.32);            // distance from the band's centre line
      if (d > 26 || !inside(x, y)) continue;
      const k = 1 - d / 26;
      g.fillStyle(k > 0.7 ? P.gemShine : k > 0.4 ? P.gemLight : P.gemPale, 0.25 + k * 0.45); g.fillRect(x, y, 3, 3);
    }
    for (let i = 0; i < 120; i++) { const x = (i * 7919) % 480 - 240, y = 4 + (i * 104729) % 150; if (inside(x, y)) { g.fillStyle(i % 13 ? P.white : P.pink, 0.55 + (i % 3) * 0.15); g.fillRect(x, y, 1 + (i % 9 === 0), 1); } }
    // cracks: it's a fragment - broken
    g.lineStyle(2, P.outline, 1);
    for (const line of [[[-60, 0], [-70, 30], [-58, 52], [-74, 90]], [[110, 0], [100, 26], [124, 60], [112, 96]], [[-180, 20], [-150, 44], [-160, 64]], [[20, 40], [40, 74], [30, 120]]]) {
      for (let i = 1; i < line.length; i++) g.lineBetween(line[i - 1][0], line[i - 1][1], line[i][0], line[i][1]);
    }
    g.lineStyle(1, P.ice, 0.6);
    for (const [a, b] of [[[-61, 2], [-69, 28]], [[109, 2], [101, 24]]]) g.lineBetween(a[0], a[1], b[0], b[1]);
    // the cut top: a polished face catching the light
    g.fillStyle(P.outline, 1); g.fillRect(top.x1 - 3, -3, top.x2 - top.x1 + 6, 8);
    g.fillStyle(P.gemShine, 1); g.fillRect(top.x1, -1, top.x2 - top.x1, 4);
    g.fillStyle(P.white, 1); for (let x = top.x1 + 10; x < top.x2 - 10; x += 37) g.fillRect(x, -1, 12, 1);
    g.fillStyle(P.gemPale, 1); g.fillRect(top.x1, 3, top.x2 - top.x1, 3);
  }

  // a floating shard ledge: a thin cut slab with a faceted point underneath
  ledge(g, p) {
    const P = GPAL, w = p.x2 - p.x1, cx = (p.x1 + p.x2) / 2;
    const pts = [{ x: p.x1, y: p.y }, { x: p.x2, y: p.y }, { x: p.x2 - 10, y: p.y + 10 }, { x: cx + w * 0.12, y: p.y + 26 }, { x: cx - w * 0.2, y: p.y + 20 }, { x: p.x1 + 8, y: p.y + 9 }];
    g.fillStyle(P.outline, 1); g.fillPoints(pts.map((q) => ({ x: cx + (q.x - cx) * 1.05, y: q.y + 2 })), true);
    g.fillStyle(P.gem, 1); g.fillPoints(pts, true);
    g.fillStyle(P.gemLight, 1); g.fillTriangle(p.x1, p.y, cx, p.y, cx - w * 0.2, p.y + 20);
    g.fillStyle(P.gemDark, 1); g.fillTriangle(p.x2, p.y, p.x2 - 10, p.y + 10, cx + w * 0.12, p.y + 26);
    g.fillStyle(P.gemShine, 1); g.fillRect(p.x1, p.y - 1, w, 3);
    g.fillStyle(P.white, 1); g.fillRect(p.x1 + 6, p.y - 1, 8, 1);
  }

  // ---------------------------------------------------------------- per frame
  step(match) {
    this.t++;
    this.hzG.clear();
    this.ambience();
    return this.cycle.run(match, []);
  }
  ambience() {
    const t = this.t, b = this.bgFx, f = this.fxG, c = this.chips; b.clear(); f.clear(); c.clear();
    for (let i = 0; i < 16; i++) {                                   // four-point stars, twinkling
      const x = (i * 211) % 900 - 130, y = (i * 137) % 330 - 30, k = (Math.sin(t * 0.05 + i * 1.7) + 1) / 2, r = 1 + k * (2 + (i % 3));
      b.fillStyle(i % 4 ? 0xb8b8f8 : 0xa4e4fc, 0.4 + k * 0.6); b.fillRect(x - r, y, r * 2 + 1, 1); b.fillRect(x, y - r, 1, r * 2 + 1);
      b.fillStyle(0xffffff, k); b.fillRect(x, y, 1, 1);
    }
    if (t % 260 < 26) { const k = (t % 260) / 26, sx = 760 - ((Math.floor(t / 260) * 173) % 500), x = sx - k * 160, y = 20 + k * 60; b.lineStyle(1, 0xffffff, 1 - k); b.lineBetween(x, y, x + 18, y - 7); }   // a shooting star
    for (const g of this.far) g.y = g.base + Math.sin(t * 0.012 + g.ph) * 6;            // distant fragments bob
    for (const [x, y, s, ph] of [[-150, 108, 12, 0], [-40, 186, 9, 1.4], [96, 150, 14, 2.5], [180, 104, 8, 3.3], [10, 222, 7, 4.1]]) this.shard(c, x, y + Math.sin(t * 0.03 + ph) * 3, s);   // chips broken off underneath
    // the galaxy inside pulses; sparkles glint on the cut top and the ledges
    const pulse = (Math.sin(t * 0.04) + 1) / 2;
    f.fillStyle(0xb8b8f8, 0.04 + pulse * 0.05); f.fillEllipse(-40, 60, 260, 80);
    for (let i = 0; i < 5; i++) {
      const k = ((t + i * 47) % 140) / 140; if (k > 0.25) continue;
      const s = Math.sin(k / 0.25 * Math.PI) * 4, x = -230 + ((i * 113 + Math.floor((t + i * 47) / 140) * 71) % 460), y = -2;
      f.fillStyle(0xffffff, 0.9); f.fillRect(x - s, y, s * 2 + 1, 1); f.fillRect(x, y - s, 1, s * 2 + 1);
    }
  }

  // ---------------------------------------------------------------- hazards
  // SHARD RAIN: a four-point glint high in the sky over where each shard will land (and a mark on the floor),
  // then the shards drop straight down in two volleys and shatter into glitter.
  start_rain(match, h) {
    h.title = 'SHARD RAIN';
    h.shards = [];
    for (let v = 0; v < RAIN.volleys; v++) for (let i = 0; i < RAIN.perVolley; i++) {
      const x = -230 + Math.random() * 460;
      h.shards.push({ at: 90 + v * RAIN.gap + i * 7, x, y: -330, vy: 0, spin: Math.random() * 6, done: false, id: v * 10 + i, s: 9 + Math.floor(Math.random() * 6) });
    }
  }
  step_rain(match, h, out) {
    const g = this.hzG; let live = false;
    for (const c of h.shards) {
      if (c.done) continue; live = true;
      if (h.t < c.at) {
        if (h.t > c.at - 60) {
          const k = (h.t - (c.at - 60)) / 60, r = 2 + k * 6;
          g.fillStyle(0xffffff, 0.5 + 0.5 * ((h.t >> 2) % 2)); g.fillRect(c.x - r, -300, r * 2 + 1, 1); g.fillRect(c.x, -300 - r, 1, r * 2 + 1);
          g.fillStyle(GPAL.gemShine, 0.15 + 0.25 * k); g.fillEllipse(c.x, 0, 22, 4);
        }
        continue;
      }
      if (h.t === c.at && c.id % 3 === 0) sfx('whoosh', 0.35, 1.6);
      c.vy = Math.min(9, c.vy + 0.5); c.y += c.vy; c.spin += 0.2;
      this.shard(g, c.x, c.y, c.s + 6 * Math.abs(Math.sin(c.spin)) * 0.3);
      out.push({ x1: c.x - 7, x2: c.x + 7, y1: c.y - 10, y2: c.y + 10, dmg: RAIN.dmg, angle: RAIN.angle, base: RAIN.base, growth: RAIN.growth, id: 'shard' + h.id + ':' + c.id, hazard: true });
      const onLedge = this.platforms.some((p) => c.y >= p.y && c.y - c.vy < p.y && c.x >= p.x1 && c.x <= p.x2);
      if (onLedge) { c.done = true; this.glitter(match, c.x, c.y); }
      else if (c.y > 330) c.done = true;
    }
    return h.t > 90 && !live;
  }
  glitter(match, x, y) {
    sfx('glass', 0.45, 1.3 + Math.random() * 0.3);
    const cols = [GPAL.gemShine, GPAL.ice, GPAL.gemLight, GPAL.white, GPAL.pink];
    for (let i = 0; i < 8; i++) { const a = -Math.PI * (0.1 + 0.8 * Math.random()), sp = 1.4 + Math.random() * 2.6; match.particles.push({ shape: 'shard', x, y: y - 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 24 + Math.random() * 12, color: cols[i % 5], drag: 0.94, grav: 0.14, ang: a }); }
  }

  // CRYSTAL SURGE: three cracks in the floor glow brighter and brighter, then crystal spikes burst up out of them,
  // hold a moment, and sink back in.
  start_surge(match, h) {
    h.title = 'CRYSTAL SURGE';
    h.spikes = [];
    const spots = [-170, -60, 50, 160].sort(() => Math.random() - 0.5).slice(0, SURGE.spikes);
    for (const x of spots) h.spikes.push({ x: x + Math.round((Math.random() - 0.5) * 30) });
    sfx('rumble', 0.4, 1.4);
  }
  step_surge(match, h, out) {
    const g = this.hzG, W = SURGE.warn, end = W + 60;
    for (const [i, s] of h.spikes.entries()) {
      if (h.t < W) {                                                 // the crack glows, brighter as it gets close
        const k = h.t / W, flick = (h.t >> 2) % 2 ? 1 : 0.6;
        g.lineStyle(2, GPAL.ice, (0.3 + 0.7 * k) * flick); g.lineBetween(s.x - 14, 0, s.x - 4, 4); g.lineBetween(s.x - 4, 4, s.x + 6, 1); g.lineBetween(s.x + 6, 1, s.x + 16, 3);
        g.fillStyle(GPAL.gemShine, 0.15 * k); g.fillEllipse(s.x, -4, 50, 14);
        continue;
      }
      const lt = h.t - W, rise = lt < 6 ? lt / 6 : lt < 40 ? 1 : Math.max(0, 1 - (lt - 40) / 18), hgt = SURGE.up * 2 * rise;
      if (lt === 0 && i === 0) { sfx('glass', 0.6, 0.7); sfx('rumble', 0.3, 1.8); }
      if (hgt < 2) continue;
      for (const [dx, sc] of [[-10, 0.6], [10, 0.7], [0, 1]]) {              // a cluster of three crystal points
        const hh = hgt * sc, x = s.x + dx;
        g.fillStyle(GPAL.outline, 1); g.fillTriangle(x - 8, 2, x + 8, 2, x, -hh - 3);
        g.fillStyle(GPAL.gem, 1); g.fillTriangle(x - 6, 0, x + 6, 0, x, -hh);
        g.fillStyle(GPAL.gemLight, 1); g.fillTriangle(x - 6, 0, x, 0, x, -hh);
        g.fillStyle(GPAL.gemShine, 1); g.fillRect(x - 1, -hh + 3, 1, hh * 0.4);
      }
      if (lt < 40) out.push({ x1: s.x - 16, x2: s.x + 16, y1: -hgt, y2: 2, dmg: SURGE.dmg, angle: SURGE.angle, base: SURGE.base, growth: SURGE.growth, id: 'surge' + h.id + ':' + i, hazard: true });
    }
    return h.t > end;
  }
}

// Miniature of FRACTURED for the select screen: deep space, a nebula, the gem island with its galaxy band, a shard ledge
export function drawFracturedPreview(g, x, y, w, h) {
  const P = GPAL, bh = Math.ceil(h / 7);
  P.space.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(x, y + i * bh, w, Math.min(bh, h - i * bh)); });
  g.fillStyle(0x7a48e8, 0.25); g.fillEllipse(x + w * 0.35, y + h * 0.35, w * 0.6, h * 0.35);
  g.fillStyle(0x3cbcfc, 0.15); g.fillEllipse(x + w * 0.75, y + h * 0.6, w * 0.4, h * 0.25);
  for (let i = 0; i < 30; i++) { g.fillStyle(0xffffff, 0.6); g.fillRect(x + (i * 37) % w, y + (i * 23) % (h * 0.6), 1, 1); }
  const cx = x + w / 2, top = y + h * 0.62, hw = w * 0.36;
  g.fillStyle(P.outline, 1); g.fillTriangle(cx - hw - 2, top - 1, cx + hw + 2, top - 1, cx - w * 0.02, y + h + 2);
  g.fillStyle(P.gem, 1); g.fillTriangle(cx - hw, top, cx + hw, top, cx - w * 0.02, y + h);
  g.fillStyle(P.gemLight, 1); g.fillTriangle(cx - hw, top, cx - hw * 0.2, top, cx - hw * 0.6, top + h * 0.2);
  g.fillStyle(P.gemShine, 0.7); g.fillRect(cx - hw * 0.6, top + 4, hw * 0.9, 2);
  g.fillStyle(P.gemShine, 1); g.fillRect(cx - hw, top - 1, hw * 2, 2);
  g.fillStyle(P.gem, 1); g.fillRect(cx - hw * 0.9, top - h * 0.2, hw * 0.55, 3); g.fillRect(cx + hw * 0.35, top - h * 0.2, hw * 0.55, 3);
  g.fillStyle(P.gemShine, 1); g.fillRect(cx - hw * 0.9, top - h * 0.2, hw * 0.55, 1); g.fillRect(cx + hw * 0.35, top - h * 0.2, hw * 0.55, 1);
  g.fillStyle(0xffffff, 1); const sx = x + w * 0.82, sy = y + h * 0.2; g.fillRect(sx - 3, sy, 7, 1); g.fillRect(sx, sy - 3, 1, 7);
}

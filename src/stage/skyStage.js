// "Sky Sanctum": a mostly flat floating island with three pass-through cloud ledges and a
// lightning-storm hazard. All art is drawn in code from the shared retro palette.
import { sfx } from '../audio/sfx.js';

export const PAL = {
  skyTop: 0x2a6fd6, skyMid: 0x4f9bea, skyLow: 0x8cc8f2, cloud: 0xf3f6fb, cloudShade: 0xc9dcf2,
  grass: 0x5cc84a, grassDark: 0x2f8a3a, grassLight: 0x9be36a,
  dirt: 0xa8642c, dirtDark: 0x6e3a17, dirtLight: 0xd99350, stone: 0x6b5b73, stoneDark: 0x3e3446,
  outline: 0x1a1020, gold: 0xf3c358, soul: 0x78a0c6, soulDeep: 0x076cc2, white: 0xf0f2f3,
};

export class SkyStage {
  constructor(scene) {
    this.scene = scene;
    this.platforms = [
      { x1: -280, x2: 280, y: 0, solid: true, bottom: 64 },
      { x1: -205, x2: -85, y: -92, solid: false },
      { x1: 85, x2: 205, y: -92, solid: false },
      { x1: -60, x2: 60, y: -178, solid: false },
    ];
    this.spawns = [{ x: -150, y: 0 }, { x: 150, y: 0 }, { x: -50, y: 0 }, { x: 50, y: 0 }];
    this.storm = { timer: 900 + Math.floor(Math.random() * 600), warn: 0, strike: 0, x: 0 };
    this.hazardsOn = true;
    this.music = 'bgm_sky';                               // "Above the Clouds", tools/audio/sky_music.py
  }

  // ---------------------------------------------------------------- drawing
  draw(worldLayer, bgLayer) {
    const s = this.scene;
    // Sky: hard colour bands (no smooth gradient) like a 16-bit backdrop.
    const sky = s.add.graphics().setScrollFactor(0);
    const bands = [0x2463c8, PAL.skyTop, 0x3079da, 0x3483df, 0x3a8ae2, 0x3f8fe5, 0x4795e8, PAL.skyMid, 0x5ba3ec, 0x6aafef, 0x7bbbf0, PAL.skyLow, 0x9dd1f4];
    bands.forEach((c, i) => { sky.fillStyle(c, 1); sky.fillRect(-400, -60 + i * 40, 1440, 41); });
    sky.fillStyle(0x9dd1f4, 1); sky.fillRect(-400, -60 + bands.length * 40, 1440, 400);
    bgLayer.push(sky);
    // Far clouds drift slowly with parallax.
    this.clouds = [];
    for (let i = 0; i < 9; i++) {
      const g = s.add.graphics();
      const w = 60 + (i * 37) % 70;
      this.blockCloud(g, 0, 0, w, 16 + (i % 3) * 6);
      g.x = -300 + i * 150; g.y = 20 + ((i * 73) % 220);
      g.setScrollFactor(0.3 + (i % 3) * 0.1);
      g.speed = 0.05 + (i % 4) * 0.03;
      this.clouds.push(g); bgLayer.push(g);
    }
    // Distant islands.
    const far = s.add.graphics().setScrollFactor(0.5);
    this.miniIsland(far, 40, 210, 90); this.miniIsland(far, 500, 170, 70); this.miniIsland(far, 300, 280, 50);
    bgLayer.push(far);

    // Main island.
    const g = s.add.graphics();
    const P = this.platforms[0];
    const w = P.x2 - P.x1;
    // underside: stepped rock taper
    for (let row = 0; row < 14; row++) {
      const inset = Math.floor(row * row * 0.9) + row * 6;
      const y = 10 + row * 8;
      const x1 = P.x1 + inset, x2 = P.x2 - inset;
      if (x2 - x1 < 16) break;
      g.fillStyle(row < 3 ? PAL.dirt : row < 7 ? PAL.dirtDark : PAL.stoneDark, 1);
      g.fillRect(x1, y, x2 - x1, 8);
      g.fillStyle(PAL.outline, 1);
      g.fillRect(x1 - 2, y, 2, 8); g.fillRect(x2, y, 2, 8);
      // speckles
      g.fillStyle(row < 3 ? PAL.dirtLight : PAL.stone, 1);
      for (let k = x1 + 6 + (row * 13) % 17; k < x2 - 6; k += 23 + (row % 3) * 5) g.fillRect(k, y + 2 + (k % 3), 3, 2);
    }
    // dangling roots
    g.fillStyle(PAL.grassDark, 1);
    for (let k = P.x1 + 20; k < P.x2 - 20; k += 47) g.fillRect(k, 18, 2, 10 + (k % 5) * 3);
    // grass top
    g.fillStyle(PAL.outline, 1); g.fillRect(P.x1 - 2, -2, w + 4, 14);
    g.fillStyle(PAL.grass, 1); g.fillRect(P.x1, 0, w, 10);
    g.fillStyle(PAL.grassLight, 1); g.fillRect(P.x1, 0, w, 3);
    g.fillStyle(PAL.grassDark, 1);
    for (let k = P.x1; k < P.x2; k += 6) g.fillRect(k, 8 + (k % 4 === 0 ? 0 : 1), 3, 4);
    for (let k = P.x1 + 10; k < P.x2; k += 31) { g.fillStyle(PAL.grassLight, 1); g.fillRect(k, -4, 2, 4); g.fillRect(k + 3, -6, 2, 6); }
    // shrine pillars (stage character)
    this.pillar(g, P.x1 + 30, 0); this.pillar(g, P.x2 - 42, 0);
    worldLayer.push(g);

    // Cloud ledges.
    for (const p of this.platforms.slice(1)) {
      const c = s.add.graphics();
      this.blockCloud(c, p.x1, p.y - 2, p.x2 - p.x1, 12, true);
      worldLayer.push(c);
    }

    this.stormG = s.add.graphics();
    worldLayer.push(this.stormG);
  }

  blockCloud(g, x, y, w, h, ledge = false) {
    g.fillStyle(PAL.cloudShade, 1);
    g.fillRect(x + 4, y + h - 4, w - 8, 4);
    g.fillStyle(PAL.cloud, 1);
    g.fillRect(x, y + 2, w, h - 6);
    g.fillRect(x + 6, y - 2, w * 0.4, 6);
    g.fillRect(x + w * 0.45, y - 5, w * 0.35, 8);
    if (ledge) { g.fillStyle(PAL.white, 1); g.fillRect(x + 2, y + 2, w - 4, 2); }
  }

  miniIsland(g, x, y, w) {
    g.fillStyle(0x4c86c8, 1); g.fillRect(x, y, w, 6);
    g.fillStyle(0x3d6fae, 1);
    for (let r = 0; r < 5; r++) g.fillRect(x + r * 6, y + 6 + r * 5, w - r * 12, 5);
  }

  pillar(g, x, groundY) {
    g.fillStyle(PAL.outline, 1); g.fillRect(x - 1, groundY - 58, 14, 58);
    g.fillStyle(0xd8d0e0, 1); g.fillRect(x, groundY - 56, 12, 56);
    g.fillStyle(0xa79db3, 1); g.fillRect(x + 8, groundY - 56, 3, 56);
    g.fillStyle(PAL.gold, 1); g.fillRect(x - 3, groundY - 62, 18, 6);
    g.fillStyle(PAL.soul, 1); g.fillRect(x + 4, groundY - 70, 4, 6);
    g.fillStyle(PAL.white, 1); g.fillRect(x + 5, groundY - 72, 2, 3);
  }

  // ---------------------------------------------------------------- hazard: lightning storm
  // Every 15-25 s a warning marker flashes over a spot on the island, then lightning strikes it.
  step(match) {
    for (const c of this.clouds || []) { c.x += c.speed; if (c.x > 1100) c.x = -400; }
    const st = this.storm;
    const g = this.stormG;
    g.clear();
    if (!this.hazardsOn) return null;
    if (st.strike > 0) {
      st.strike--;
      const flick = st.strike % 4 < 2;
      g.fillStyle(flick ? PAL.white : 0xfff27a, 1);
      let x = st.x;
      for (let y = -420; y < 0; y += 20) {      // jagged bolt
        const nx = st.x + ((y / 20) % 2 === 0 ? -6 : 6);
        g.fillRect(Math.min(x, nx) - 3, y, Math.abs(nx - x) + 8, 22);
        x = nx;
      }
      g.fillStyle(0xfff27a, 0.35); g.fillRect(st.x - 26, -420, 52, 420);
      if (st.strike >= 8) return { x1: st.x - 18, x2: st.x + 18, y1: -420, y2: 4, dmg: 14, angle: 80, base: 4.5, growth: 5.5, id: 'storm' + st.id, hazard: true };
      return null;
    }
    if (st.warn > 0) {
      st.warn--;
      if (st.warn % 16 < 8) {
        g.fillStyle(0xffe14a, 1);
        g.fillRect(st.x - 12, -6, 24, 4);
        g.fillRect(st.x - 2, -30, 4, 14); g.fillRect(st.x - 2, -12, 4, 4);   // "!"
      }
      g.fillStyle(0x1a1030, 0.25); g.fillRect(st.x - 40, -440, 80, 60);
      if (st.warn % 30 === 0) sfx('warn', 0.5);
      if (st.warn === 0) { st.strike = 14; st.id = (st.id || 0) + 1; sfx('thunder', 1); match.shake(10, 4); }
      return null;
    }
    if (--st.timer <= 0) {
      st.timer = 900 + Math.floor(Math.random() * 600);
      st.warn = 90;
      // aim near a random fighter, but stay on the island
      const alive = match.fighters.filter((f) => f.alive);
      const tgt = alive.length ? alive[Math.floor(Math.random() * alive.length)].x : 0;
      st.x = Math.max(-250, Math.min(250, Math.round(tgt + (Math.random() * 80 - 40))));
    }
    return null;
  }
}

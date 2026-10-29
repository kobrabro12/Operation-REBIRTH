// STAGE THEMES (the shop's STAGES shelf): a theme re-dresses whatever stage you fight on. matchExtras.js makes one
// for the stage effect you switched on:
//   backdrop  a new sky and far scenery painted over the stage's own backdrop (background camera, depth 48 - under
//             FULL AERO's sky at 50 and the theme's animated sky at 49)
//   props     things standing on the stage's platforms - snow caps and icicles, cherry trees, gravestones, cacti... -
//             found from stage.platforms every frame (so moving platforms carry theirs)
//   grade     a colour wash multiplied over the whole picture (world and background, under the HUD)
// The weather itself (rain, snow, petals...) is drawn by matchExtras.js.
// Themes: NIGHTFALL, THUNDERSTORM, BLIZZARD, CHERRY BLOSSOM, FIREFLIES, BLOOD MOON, SANDSTORM, AURORA, NEON CITY,
// CANDY LAND, SUNKEN RUINS, HARVEST MOON.
import { VIEW_W, VIEW_H } from '../config.js';

const W = VIEW_W, H = VIEW_H;

// a few shared painting helpers ---------------------------------------------------------------
function bands(g, cols, top = 0, bottom = H) {
  const h = (bottom - top) / cols.length;
  cols.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(-200, top + i * h, W + 400, h + 1); });
}
// a ridge of peaks: pts are [x, height] pairs above baseY; cap = a snowy tip colour (or null)
function ridge(g, baseY, pts, col, cap) {
  g.fillStyle(col, 1);
  for (let i = 0; i < pts.length; i++) {
    const [x, h] = pts[i], w = h * 1.3;
    g.fillTriangle(x - w, baseY, x + w, baseY, x, baseY - h);
    if (cap) { g.fillStyle(cap, 1); g.fillTriangle(x - w * 0.28, baseY - h * 0.72, x + w * 0.28, baseY - h * 0.72, x, baseY - h); g.fillStyle(col, 1); }
  }
  g.fillRect(-200, baseY, W + 400, H - baseY + 200);
}
function hills(g, baseY, n, amp, col, seed = 0) {
  g.fillStyle(col, 1);
  for (let x = -200; x < W + 200; x += 4) {
    const y = baseY - Math.abs(Math.sin((x + seed) * 0.012)) * amp - Math.sin((x + seed * 3) * 0.031) * amp * 0.3;
    g.fillRect(x, y, 4, H - y + 200);
  }
}
function pine(g, x, y, h, col) { g.fillStyle(col, 1); for (let i = 0; i < 3; i++) g.fillTriangle(x - h * (0.22 + i * 0.08), y - h * 0.3 * i, x + h * (0.22 + i * 0.08), y - h * 0.3 * i, x, y - h * 0.3 * i - h * 0.5); g.fillRect(x - 1, y, 3, 4); }
function stars(g, n, maxY, a = 1) { for (let i = 0; i < n; i++) { const x = (i * 7919) % W, y = (i * 104729) % maxY; g.fillStyle(0xffffff, a * (0.3 + (i % 5) * 0.14)); g.fillRect(x, y, 1 + (i % 9 === 0), 1); } }

// the themes ---------------------------------------------------------------------------------------
// backdrop(g, mid): g is fixed to the screen, mid scrolls a little with the camera
// props(g, platforms, t): drawn every frame on the world camera, under the fighters
const THEMES = {
  // NIGHTFALL: a moonlit town on the hills, lamp posts on the stage
  'fx-night': {
    grade: 0x6a7ab8,
    backdrop(g, mid) {
      bands(g, [0x050a22, 0x08102e, 0x0b163a, 0x0f1c46, 0x142452, 0x1a2c5e]); stars(g, 70, 200);
      hills(mid, 290, 0, 40, 0x0c1430, 10);
      for (let i = 0; i < 26; i++) {                                                          // a little town of lit windows
        const x = -120 + i * 34 + (i * 13) % 11, h = 22 + (i * 37) % 30, y = 286 - Math.abs(Math.sin((x + 10) * 0.012)) * 40;
        mid.fillStyle(0x0a1026, 1); mid.fillRect(x, y - h, 26, h + 40);
        for (let k = 0; k < 4; k++) if ((i * 3 + k) % 3) { mid.fillStyle(0xffd27a, 0.8); mid.fillRect(x + 4 + (k % 2) * 12, y - h + 5 + Math.floor(k / 2) * 9, 4, 4); }
      }
    },
    props(g, P, t) {
      for (const p of P) {
        if (!p.solid) continue;
        for (const x of [p.x1 + 18, p.x2 - 18]) {                                              // lamp posts with a warm glow
          g.fillStyle(0xffd27a, 0.08 + 0.02 * Math.sin(t * 0.1)); g.fillCircle(x, p.y - 44, 26); g.fillStyle(0xffd27a, 0.12); g.fillCircle(x, p.y - 44, 13);
          g.fillStyle(0x1a1c2a, 1); g.fillRect(x - 1, p.y - 42, 3, 42); g.fillRect(x - 4, p.y - 3, 9, 3);
          g.fillStyle(0x2a2c3a, 1); g.fillRect(x - 4, p.y - 50, 9, 8); g.fillStyle(0xffe8a8, 1); g.fillRect(x - 2, p.y - 48, 5, 5);
        }
      }
    },
  },
  // THUNDERSTORM: black clouds, a lighthouse on the far cliffs, puddles on the stage
  'fx-storm': {
    grade: 0x8a92a8,
    backdrop(g, mid) {
      bands(g, [0x14161e, 0x1a1e28, 0x202634, 0x283040, 0x2e384a, 0x34405a]);
      for (let i = 0; i < 12; i++) { g.fillStyle(i % 2 ? 0x101218 : 0x181c26, 1); g.fillEllipse((i * 97) % W, 30 + (i % 4) * 22, 220, 60); }
      ridge(mid, 300, [[40, 60], [170, 90], [330, 50], [520, 80], [700, 70]], 0x10141c, null);
      mid.fillStyle(0x1c2230, 1); mid.fillRect(560, 196, 12, 50); mid.fillStyle(0xfff0a0, 1); mid.fillRect(561, 192, 10, 6);   // the lighthouse
      mid.fillStyle(0xfff0a0, 0.12); mid.fillTriangle(566, 195, 420, 170, 420, 220);
      g.fillStyle(0x3a4a6a, 0.6); g.fillRect(-200, 300, W + 400, 80);                         // the sea
    },
    props(g, P, t) {
      for (const p of P) {
        const w = p.x2 - p.x1;
        for (let i = 0; i < Math.max(1, Math.floor(w / 110)); i++) {                         // puddles, rippling
          const x = p.x1 + 30 + ((i * 97 + Math.round(p.x1)) % Math.max(1, w - 60));
          g.fillStyle(0x3a4a6a, 0.8); g.fillEllipse(x, p.y + 1, 30, 4); g.fillStyle(0x9ab0d8, 0.5); g.fillEllipse(x - 4, p.y, 12, 1.5);
          const r = (t * 0.6 + i * 9) % 14; g.lineStyle(1, 0xc8d8ff, 0.5 * (1 - r / 14)); g.strokeEllipse(x + (i % 2 ? 6 : -6), p.y + 1, r * 2, r * 0.4);
        }
        if (p.solid) { g.fillStyle(0x6a6a7a, 1); g.fillRect(p.x2 - 14, p.y - 36, 2, 36); g.fillStyle(0xd8a040, 1); g.fillTriangle(p.x2 - 16, p.y - 36, p.x2 - 10, p.y - 36, p.x2 - 13, p.y - 42); }   // a lightning rod
      }
    },
  },
  // BLIZZARD: snowy peaks and pines; snow piled on every platform, icicles under the edges
  'fx-snow': {
    grade: 0xc8d8f0,
    backdrop(g, mid) {
      bands(g, [0x8aa0c0, 0x9aaecc, 0xaabcd6, 0xbac8e0, 0xc8d4e8, 0xd6e0f0]);
      ridge(g, 250, [[0, 90], [150, 130], [300, 100], [450, 150], [620, 110]], 0x8a9cb8, 0xf4f8ff);
      hills(mid, 300, 0, 30, 0xe8f0fa, 40);
      for (let i = 0; i < 18; i++) pine(mid, -100 + i * 52 + (i * 17) % 23, 300 - Math.abs(Math.sin((i * 52 - 60) * 0.012)) * 30, 28 + (i * 7) % 12, 0x4a6a7a);
    },
    props(g, P) {
      for (const p of P) {
        const w = p.x2 - p.x1;
        g.fillStyle(0xf4f8ff, 1); g.fillRect(p.x1 - 2, p.y - 3, w + 4, 4);
        for (let x = p.x1; x < p.x2; x += 14) g.fillEllipse(x + 7, p.y - 3, 16, 5 + ((x * 7) % 3));
        g.fillStyle(0xc8d8f0, 1); g.fillRect(p.x1 - 2, p.y, w + 4, 1);
        const under = p.y + (p.solid ? 8 : 5);
        for (let x = p.x1 + 4; x < p.x2 - 2; x += 9) { const l = 4 + ((x * 13) % 7); g.fillStyle(0xd8f0ff, 0.9); g.fillTriangle(x, under, x + 4, under, x + 2, under + l); }
      }
    },
  },
  // CHERRY BLOSSOM: a pink evening, a mountain and a pagoda far off; cherry trees on the stage, petals on the ground
  'fx-sakura': {
    grade: 0xffe0ea,
    backdrop(g, mid) {
      bands(g, [0xf0a8c0, 0xf4b8c8, 0xf8c8d0, 0xfcd8d8, 0xffe4dc, 0xffeee4]);
      g.fillStyle(0xfff4e0, 0.9); g.fillCircle(470, 120, 30);
      ridge(g, 270, [[250, 120]], 0xb0809a, 0xfff4f8);
      hills(mid, 300, 0, 28, 0xd090a8, 5);
      const px = 110, py = 262;                                                             // the pagoda
      for (let i = 0; i < 4; i++) { const w = 46 - i * 9, y = py - i * 16; mid.fillStyle(0x6a3a4a, 1); mid.fillRect(px - w / 2 + 5, y - 10, w - 10, 10); mid.fillStyle(0x4a2030, 1); mid.fillTriangle(px - w / 2 - 4, y - 10, px + w / 2 + 4, y - 10, px, y - 18); }
      for (let i = 0; i < 12; i++) { const x = 200 + i * 40, y = 290 - Math.abs(Math.sin((x + 5) * 0.012)) * 28; mid.fillStyle(0xff9ac0, 1); mid.fillCircle(x, y - 6, 10); mid.fillStyle(0xffc0d8, 1); mid.fillCircle(x - 3, y - 9, 5); }
    },
    props(g, P, t) {
      for (const p of P) {
        const w = p.x2 - p.x1;
        for (let x = p.x1 + 3; x < p.x2 - 3; x += 7) { g.fillStyle((x * 7) % 3 ? 0xffb0cc : 0xffe0ec, 1); g.fillEllipse(x, p.y - 1, 4, 2); }   // fallen petals
        if (p.solid && w > 160) for (const [x, s] of [[p.x1 + 34, 1], [p.x2 - 40, -1]]) {   // two cherry trees
          g.fillStyle(0x4a2a24, 1); g.fillRect(x - 3, p.y - 44, 6, 44); g.fillTriangle(x, p.y - 34, x + s * 18, p.y - 56, x + s * 4, p.y - 38);
          for (const [dx, dy, r, c] of [[0, -62, 24, 0xff9ac0], [s * 18, -58, 18, 0xffb0cc], [-s * 14, -54, 16, 0xff8ab4], [s * 6, -72, 16, 0xffc8dc], [-s * 4, -50, 12, 0xffd8e6]]) {
            g.fillStyle(c, 1); g.fillCircle(x + dx + Math.sin(t * 0.02 + dx) * 0.8, p.y + dy, r);
          }
        }
      }
    },
  },
  // FIREFLIES: a violet dusk over a dark forest; grass, glowing mushrooms and paper lanterns
  'fx-fireflies': {
    grade: 0xb8a0d8,
    backdrop(g, mid) {
      bands(g, [0x1a0a30, 0x2a1240, 0x3a1a4e, 0x52224e, 0x6a2c4a, 0x8a4040]);
      g.fillStyle(0xffe0a0, 0.9); g.fillCircle(150, 90, 16); stars(g, 30, 120, 0.6);
      hills(g, 250, 0, 30, 0x1a1026, 70);
      for (let i = 0; i < 24; i++) pine(mid, -120 + i * 40 + (i * 13) % 17, 300, 50 + (i * 23) % 30, 0x0e0818);
    },
    props(g, P, t) {
      for (const p of P) {
        for (let x = p.x1 + 4; x < p.x2 - 4; x += 6) { g.fillStyle(0x2a5a3a, 1); g.fillTriangle(x, p.y, x + 3, p.y, x + 1 + ((x * 3) % 3) - 1, p.y - 3 - ((x * 7) % 4)); }   // grass
        for (let k = 0; k < 3; k++) {                                                         // glowing mushrooms
          const x = p.x1 + 20 + ((k * 71 + Math.round(p.x1 * 3)) % Math.max(1, p.x2 - p.x1 - 40)), a = 0.6 + 0.4 * Math.sin(t * 0.05 + k * 2);
          g.fillStyle(0x9affd8, 0.15 * a); g.fillCircle(x, p.y - 4, 10); g.fillStyle(0xe8f8f0, 1); g.fillRect(x - 1, p.y - 4, 2, 4); g.fillStyle(0x5affc8, a); g.fillEllipse(x, p.y - 5, 8, 4);
        }
        if (p.solid) {                                                                        // a string of paper lanterns
          const y0 = p.y - 70;
          g.lineStyle(1, 0x2a1a20, 1); g.lineBetween(p.x1 + 10, y0, p.x2 - 10, y0);
          for (let x = p.x1 + 40; x < p.x2 - 30; x += 60) { g.fillStyle(0xff8a3a, 0.15); g.fillCircle(x, y0 + 8, 12); g.fillStyle(0xff9a4a, 1); g.fillEllipse(x, y0 + 8, 10, 12); g.fillStyle(0xffd88a, 1); g.fillRect(x - 1, y0 + 4, 2, 8); g.fillStyle(0x3a1a10, 1); g.fillRect(x - 3, y0 + 1, 6, 2); }
        }
      }
    },
  },
  // BLOOD MOON: a red sky over a graveyard; gravestones, a dead tree and candles on the stage
  'fx-bloodmoon': {
    grade: 0xd88078,
    backdrop(g, mid) {
      bands(g, [0x1a0204, 0x2a0408, 0x3a060c, 0x4a0a10, 0x5a1014, 0x6a1a18]);
      hills(mid, 290, 0, 36, 0x140204, 20);
      for (let i = 0; i < 20; i++) { const x = -100 + i * 45, y = 288 - Math.abs(Math.sin((x + 20) * 0.012)) * 36; mid.fillStyle(0x100204, 1); mid.fillRect(x, y - 12, 8, 14); mid.fillCircle(x + 4, y - 12, 4); if (i % 4 === 0) { mid.fillRect(x + 20, y - 40, 3, 42); mid.fillRect(x + 12, y - 30, 20, 2); } }
    },
    props(g, P, t) {
      for (const p of P) {
        if (!p.solid) { for (let x = p.x1 + 10; x < p.x2 - 6; x += 40) { const a = 0.7 + 0.3 * Math.sin(t * 0.3 + x); g.fillStyle(0xff4020, 0.2 * a); g.fillCircle(x, p.y - 6, 6); g.fillStyle(0xe8dcc8, 1); g.fillRect(x - 1, p.y - 5, 3, 5); g.fillStyle(0xffa040, a); g.fillRect(x, p.y - 8, 1, 3); } continue; }
        const w = p.x2 - p.x1;
        for (let i = 0; i < Math.floor(w / 90); i++) {                                       // gravestones, leaning
          const x = p.x1 + 30 + i * 90 + ((i * 37) % 20), h = 14 + (i % 3) * 4;
          g.fillStyle(0x3a3440, 1); g.fillRect(x - 6, p.y - h, 12, h); g.fillCircle(x, p.y - h, 6); g.fillStyle(0x5a5260, 1); g.fillRect(x - 6, p.y - h, 2, h); g.fillStyle(0x2a2430, 1); g.fillRect(x - 3, p.y - h + 2, 6, 1); g.fillRect(x - 1, p.y - h, 2, 6);
        }
        const tx = p.x2 - 50;                                                                 // a dead tree
        g.lineStyle(4, 0x1a0c0e, 1); g.lineBetween(tx, p.y, tx + 4, p.y - 60); g.lineStyle(2, 0x1a0c0e, 1);
        g.lineBetween(tx + 3, p.y - 40, tx - 18, p.y - 62); g.lineBetween(tx + 4, p.y - 52, tx + 24, p.y - 74); g.lineBetween(tx - 10, p.y - 52, tx - 16, p.y - 70);
        g.fillStyle(0xc81a1a, 0.06); g.fillRect(p.x1, p.y - 14, w, 14);                    // red mist on the ground
      }
    },
  },
  // SANDSTORM: dunes and ruined pyramids under a hot sun; sand drifts, cacti and an old skull
  'fx-sand': {
    grade: 0xf0d0a0,
    backdrop(g, mid) {
      bands(g, [0xd88a4a, 0xe09a5a, 0xe8aa6a, 0xf0ba7a, 0xf4c88a, 0xf8d69a]);
      g.fillStyle(0xfff0c0, 0.9); g.fillCircle(500, 80, 22); g.fillStyle(0xfff0c0, 0.2); g.fillCircle(500, 80, 36);
      g.fillStyle(0xc08050, 1); g.fillTriangle(150, 270, 290, 270, 220, 180); g.fillStyle(0xa86a40, 1); g.fillTriangle(220, 180, 290, 270, 230, 270);   // pyramids
      g.fillStyle(0xc08050, 1); g.fillTriangle(320, 270, 400, 270, 360, 220); g.fillStyle(0xa86a40, 1); g.fillTriangle(360, 220, 400, 270, 365, 270);
      hills(mid, 300, 0, 30, 0xd8a868, 60); hills(mid, 320, 0, 20, 0xe8b878, 90);
    },
    props(g, P) {
      for (const p of P) {
        const w = p.x2 - p.x1;
        g.fillStyle(0xe8c088, 1); for (let x = p.x1; x < p.x2; x += 18) g.fillEllipse(x + 9, p.y - 1, 22, 4 + ((x * 11) % 4));   // sand drifts
        if (!p.solid) continue;
        for (const x of [p.x1 + 26, p.x2 - 70]) {                                              // cacti
          g.fillStyle(0x3a7a3a, 1); g.fillRect(x - 3, p.y - 30, 7, 30); g.fillRect(x - 11, p.y - 22, 5, 3); g.fillRect(x - 11, p.y - 30, 4, 10); g.fillRect(x + 4, p.y - 18, 6, 3); g.fillRect(x + 7, p.y - 26, 4, 10);
          g.fillStyle(0x5a9a4a, 1); g.fillRect(x - 2, p.y - 30, 2, 30);
        }
        const sx = p.x1 + w * 0.6; g.fillStyle(0xf0e8d8, 1); g.fillEllipse(sx, p.y - 4, 10, 8); g.fillStyle(0x2a1a10, 1); g.fillRect(sx - 3, p.y - 5, 2, 2); g.fillRect(sx + 1, p.y - 5, 2, 2);   // a skull
      }
    },
  },
  // AURORA: a polar night with icy mountains; ice crystals growing on the platforms, frost along their edges
  'fx-aurora': {
    grade: 0x98c0d8,
    backdrop(g, mid) {
      bands(g, [0x020814, 0x04101e, 0x061828, 0x082232, 0x0a2a3a, 0x0c3442]); stars(g, 60, 220);
      ridge(mid, 300, [[-20, 80], [120, 120], [280, 90], [430, 140], [600, 100], [760, 90]], 0x0e2232, 0x6a9ab8);
    },
    props(g, P, t) {
      for (const p of P) {
        g.fillStyle(0xbaf0ff, 0.9); g.fillRect(p.x1, p.y - 1, p.x2 - p.x1, 2);
        for (let k = 0; k < Math.max(1, Math.floor((p.x2 - p.x1) / 70)); k++) {             // ice crystals
          const x = p.x1 + 16 + ((k * 61 + Math.round(p.x1)) % Math.max(1, p.x2 - p.x1 - 32)), a = 0.5 + 0.5 * Math.sin(t * 0.04 + k);
          g.fillStyle(0x6ae0ff, 0.12 * a); g.fillCircle(x, p.y - 8, 12);
          for (const [dx, h, c] of [[0, 16, 0x9af0ff], [-5, 10, 0x5ac8e8], [5, 12, 0x7adcf8]]) { g.fillStyle(c, 0.95); g.fillTriangle(x + dx - 3, p.y, x + dx + 3, p.y, x + dx, p.y - h); }
          g.fillStyle(0xffffff, 0.9); g.fillRect(x, p.y - 14, 1, 6);
        }
      }
    },
  },
  // NEON CITY: a synthwave night - a striped sunset sun, a wireframe grid, a skyline of lit towers; neon tubes on the stage
  'fx-neon': {
    grade: 0xd8a8ff,
    backdrop(g, mid) {
      bands(g, [0x0a0420, 0x160830, 0x260c40, 0x3a0e4a, 0x5a1050, 0x7a1450], 0, 230);
      stars(g, 40, 150, 0.7);
      for (let i = 0; i < 9; i++) { const y = 122 + i * 9, hw = Math.sqrt(Math.max(0, 50 * 50 - (y - 160) ** 2)); g.fillStyle([0xffe05a, 0xffc05a, 0xffa05a, 0xff7a6a, 0xff5a8a, 0xff3aa8, 0xe02ac0, 0xb02ad0, 0x8a2ad8][i], 1); g.fillRect(320 - hw, y, hw * 2, 9 - Math.min(5, i * 0.7)); }   // the striped sun
      g.fillStyle(0x0a0218, 1); g.fillRect(-200, 230, W + 400, H);
      g.lineStyle(1, 0xff3ad8, 0.6); for (let i = -14; i <= 14; i++) g.lineBetween(320 + i * 14, 230, 320 + i * 80, H + 40);   // the grid, rushing to the horizon
      for (let j = 0; j < 8; j++) { const y = 230 + Math.pow(j / 8, 2) * 140; g.lineBetween(-200, y, W + 200, y); }
      g.lineStyle(2, 0xff3ad8, 1); g.lineBetween(-200, 230, W + 200, 230);
      for (let i = 0; i < 22; i++) {                                                          // the skyline: towers with lit windows and rooftop lights
        const x = -120 + i * 42 + (i * 17) % 13, h = 40 + (i * 53) % 70, y = 300;
        mid.fillStyle(0x12062a, 1); mid.fillRect(x, y - h, 30, h + 40); mid.fillStyle(0x2a0a4a, 1); mid.fillRect(x, y - h, 30, 2);
        for (let k = 0; k < 10; k++) if ((i * 7 + k * 3) % 4) { mid.fillStyle([0x3ad8ff, 0xff3ad8, 0xffe05a][(i + k) % 3], 0.75); mid.fillRect(x + 4 + (k % 3) * 9, y - h + 6 + Math.floor(k / 3) * 9, 4, 3); }
        if (i % 3 === 0) { mid.fillStyle(0xff3a5a, 1); mid.fillRect(x + 14, y - h - 6, 2, 6); }
      }
    },
    props(g, P, t) {
      for (const p of P) {
        const w = p.x2 - p.x1, a = 0.75 + 0.25 * Math.sin(t * 0.2 + p.x1);
        g.fillStyle(0xff3ad8, 0.12 * a); g.fillRect(p.x1 - 2, p.y - 6, w + 4, 8);                    // a neon tube along the edge
        g.fillStyle(0xff7ae8, a); g.fillRect(p.x1, p.y - 1, w, 2); g.fillStyle(0x3ad8ff, a * 0.9); g.fillRect(p.x1, p.y + (p.solid ? 6 : 4), w, 1);
        if (!p.solid) continue;
        for (const [x, word, col] of [[p.x1 + 40, 'OPEN', 0x3ad8ff], [p.x2 - 60, 'K.O.', 0xffe05a]]) {   // little neon signs on posts
          const on = (t + x) % 240 > 6;
          g.fillStyle(0x1a1028, 1); g.fillRect(x + 8, p.y - 28, 2, 28); g.fillRect(x - 2, p.y - 44, 24, 16);
          g.lineStyle(1, col, on ? 1 : 0.2); g.strokeRect(x, p.y - 42, 20, 12);
          g.fillStyle(col, on ? 0.9 : 0.15); for (let k = 0; k < word.length; k++) g.fillRect(x + 3 + k * 4, p.y - 39, 2, 6);
          g.fillStyle(col, on ? 0.12 : 0); g.fillCircle(x + 10, p.y - 36, 16);
        }
      }
    },
  },
  // CANDY LAND: a pastel sky, gumdrop hills and a candy castle; candy canes, lollipops and frosting on the stage
  'fx-candy': {
    grade: 0xffe0f4,
    backdrop(g, mid) {
      bands(g, [0xb8d8ff, 0xc8dcff, 0xd8e0ff, 0xe8e0ff, 0xf8e4f8, 0xffe8f0]);
      for (let i = 0; i < 6; i++) { const x = (i * 131) % W, y = 40 + (i % 3) * 26; g.fillStyle(0xffffff, 0.9); g.fillEllipse(x, y, 60, 18); g.fillEllipse(x + 20, y - 6, 40, 16); g.fillStyle(0xffd8ec, 0.8); g.fillEllipse(x + 6, y + 5, 50, 6); }   // cotton-candy clouds
      const cx = 470;                                                                           // the candy castle
      for (const [x, h, c] of [[cx - 40, 70, 0xff9ac8], [cx, 100, 0xffb8e0], [cx + 40, 76, 0xc8a8ff]]) { g.fillStyle(c, 1); g.fillRect(x - 12, 270 - h, 24, h); g.fillStyle(0xffffff, 1); for (let y = 270 - h; y < 270; y += 12) g.fillRect(x - 12, y, 24, 3); g.fillStyle(0xff5a9a, 1); g.fillTriangle(x - 16, 270 - h, x + 16, 270 - h, x, 270 - h - 24); g.fillStyle(0xffe05a, 1); g.fillCircle(x, 270 - h - 26, 3); }
      for (let i = 0; i < 14; i++) { const x = -60 + i * 56, r = 28 + (i * 13) % 16; mid.fillStyle([0xff8ab8, 0x8ae8c8, 0xffd05a, 0xb88aff, 0x8ac8ff][i % 5], 1); mid.fillCircle(x, 300, r); mid.fillStyle(0xffffff, 0.5); mid.fillEllipse(x - r * 0.35, 300 - r * 0.55, r * 0.5, r * 0.25); }   // gumdrop hills
    },
    props(g, P, t) {
      for (const p of P) {
        const w = p.x2 - p.x1;
        g.fillStyle(0xfff4fa, 1); g.fillRect(p.x1 - 2, p.y - 2, w + 4, 3);                       // frosting, dripping over the edge
        for (let x = p.x1; x < p.x2; x += 10) { const d = 3 + ((x * 7) % 5); g.fillRect(x + 2, p.y, 4, d); g.fillCircle(x + 4, p.y + d, 2); }
        for (let x = p.x1 + 6; x < p.x2 - 4; x += 9) { g.fillStyle([0xff5a9a, 0x5ad8ff, 0xffe05a, 0x7aff8a][(x >> 3) % 4], 1); g.fillRect(x, p.y - 2 - ((x * 3) % 2), 3, 1); }   // sprinkles
        if (!p.solid) continue;
        const cane = (x, s) => { for (let i = 0; i < 12; i++) { g.fillStyle(i % 2 ? 0xffffff : 0xe8203a, 1); g.fillRect(x, p.y - 4 - i * 4, 4, 4); } g.lineStyle(4, 0xe8203a, 1); g.beginPath(); g.arc(x + 2 + s * 6, p.y - 48, 6, Math.PI, 0, s < 0); g.strokePath(); };
        cane(p.x1 + 24, 1); cane(p.x2 - 30, -1);
        for (const x of [p.x1 + w * 0.32, p.x2 - w * 0.3]) {                                     // lollipops, slowly turning
          g.fillStyle(0xf4f0e8, 1); g.fillRect(x - 1, p.y - 34, 2, 34);
          g.fillStyle(0xff8ad8, 1); g.fillCircle(x, p.y - 40, 9);
          for (let k = 0; k < 4; k++) { const a = t * 0.02 + k * Math.PI / 2; g.fillStyle(0xffffff, 1); g.fillTriangle(x, p.y - 40, x + Math.cos(a) * 9, p.y - 40 + Math.sin(a) * 9, x + Math.cos(a + 0.6) * 9, p.y - 40 + Math.sin(a + 0.6) * 9); }
          g.fillStyle(0xffffff, 0.6); g.fillCircle(x - 3, p.y - 43, 2);
        }
      }
    },
  },
  // SUNKEN RUINS: the stage sinks to the sea floor - shafts of light, broken columns, kelp swaying, shells and coral
  'fx-sunken': {
    grade: 0x7ab8d8,
    backdrop(g, mid) {
      bands(g, [0x5ab8d8, 0x3a9ac8, 0x2a7ab0, 0x1a5a90, 0x103e70, 0x082850]);
      for (let i = 0; i < 6; i++) { const x = 40 + i * 110; g.fillStyle(0xd8f8ff, 0.07); g.fillTriangle(x, -10, x + 40, -10, x + 120, H); }   // light shafts from the surface
      g.fillStyle(0x0a2244, 1); for (let i = 0; i < 10; i++) { const x = -40 + i * 80; g.fillRect(x, 220 - (i % 3) * 20, 18, 120); g.fillRect(x - 4, 216 - (i % 3) * 20, 26, 6); if (i % 3 === 1) g.fillRect(x - 4, 200 - (i % 3) * 20, 70, 8); }   // a drowned colonnade
      hills(mid, 310, 0, 24, 0x0c2a48, 33);
      for (let i = 0; i < 16; i++) { const x = -80 + i * 50, h = 30 + (i * 37) % 40; mid.lineStyle(3, 0x1a5a4a, 1); mid.beginPath(); mid.moveTo(x, 300); for (let k = 1; k <= 6; k++) mid.lineTo(x + Math.sin(k + i) * 5, 300 - h * k / 6); mid.strokePath(); }   // far kelp
    },
    props(g, P, t) {
      for (const p of P) {
        const w = p.x2 - p.x1;
        for (let x = p.x1 + 8; x < p.x2 - 8; x += 26) {                                          // kelp, swaying
          const h = 18 + ((x * 13) % 22); g.lineStyle(3, (x >> 2) % 2 ? 0x2a8a5a : 0x3aa86a, 1); g.beginPath(); g.moveTo(x, p.y);
          for (let k = 1; k <= 5; k++) g.lineTo(x + Math.sin(t * 0.04 + x + k * 0.8) * k * 1.2, p.y - h * k / 5); g.strokePath();
        }
        if (!p.solid) continue;
        for (const [x, c] of [[p.x1 + 40, 0xff7a6a], [p.x2 - 50, 0xff9ad8]]) {                     // coral
          g.fillStyle(c, 1); g.fillRect(x - 2, p.y - 16, 4, 16); g.fillRect(x - 10, p.y - 12, 8, 3); g.fillRect(x - 10, p.y - 22, 3, 10); g.fillRect(x + 2, p.y - 10, 8, 3); g.fillRect(x + 7, p.y - 20, 3, 10); g.fillCircle(x, p.y - 17, 3); g.fillCircle(x - 9, p.y - 22, 2); g.fillCircle(x + 8, p.y - 20, 2);
        }
        const cx = p.x1 + w * 0.55;                                                              // a broken column lying on its side, and a clam
        g.fillStyle(0xb8c8d0, 1); g.fillRect(cx - 24, p.y - 12, 40, 12); g.fillStyle(0x8a9aa8, 1); for (let k = 0; k < 5; k++) g.fillRect(cx - 22 + k * 8, p.y - 12, 2, 12); g.fillStyle(0xd8e4ea, 1); g.fillEllipse(cx + 18, p.y - 6, 8, 12);
        const open = Math.max(0, Math.sin(t * 0.02)) * 4; g.fillStyle(0xe8d8c8, 1); g.fillEllipse(cx + 40, p.y - 3, 14, 6); g.fillEllipse(cx + 40, p.y - 5 - open, 14, 5); if (open > 1) { g.fillStyle(0xffffff, 1); g.fillCircle(cx + 40, p.y - 4 - open / 2, 2); }
      }
    },
  },
  // HARVEST MOON: an orange autumn evening over red and gold woods; pumpkins, hay bales and a scarecrow on the stage
  'fx-harvest': {
    grade: 0xffd8a8,
    backdrop(g, mid) {
      bands(g, [0x3a1a40, 0x6a2a40, 0xa03a3a, 0xd05a32, 0xe8823a, 0xf4a84a]);
      g.fillStyle(0xffc860, 0.25); g.fillCircle(180, 150, 46); g.fillStyle(0xffd070, 1); g.fillCircle(180, 150, 32); g.fillStyle(0xe8b050, 1); g.fillCircle(170, 142, 5); g.fillCircle(192, 160, 4);   // the harvest moon
      hills(g, 270, 0, 34, 0x5a2a1a, 15);
      for (let i = 0; i < 26; i++) { const x = -120 + i * 36 + (i * 11) % 9, y = 300 - Math.abs(Math.sin((x + 30) * 0.012)) * 26, r = 14 + (i * 7) % 8; mid.fillStyle(0x3a1a10, 1); mid.fillRect(x - 2, y - 8, 4, 12); mid.fillStyle([0xc83a1a, 0xe8822a, 0xf4b83a, 0x9a2a1a][i % 4], 1); mid.fillCircle(x, y - 14 - r * 0.4, r); }   // autumn woods
      for (let i = 0; i < 5; i++) { g.fillStyle(0x1a0a14, 1); const x = 380 + i * 40, y = 70 + (i % 2) * 10; g.fillTriangle(x - 4, y, x, y - 2, x, y + 1); g.fillTriangle(x + 4, y, x, y - 2, x, y + 1); }   // geese flying south
    },
    props(g, P, t) {
      for (const p of P) {
        const w = p.x2 - p.x1;
        for (let x = p.x1 + 3; x < p.x2 - 3; x += 6) { g.fillStyle([0xc83a1a, 0xe8822a, 0xf4b83a][(x * 7) % 3], 1); g.fillRect(x, p.y - 2, 3, 2); }   // fallen leaves
        if (!p.solid) { const x = p.x1 + w / 2; g.fillStyle(0xe8822a, 1); g.fillEllipse(x, p.y - 5, 12, 10); g.fillStyle(0x3a6a2a, 1); g.fillRect(x - 1, p.y - 12, 2, 3); continue; }
        for (const [x, r] of [[p.x1 + 30, 9], [p.x1 + 46, 6], [p.x2 - 44, 11]]) {                    // pumpkins (one's a jack-o'-lantern)
          g.fillStyle(0xd86a1a, 1); g.fillEllipse(x, p.y - r, r * 2.4, r * 2); g.fillStyle(0xf08a2a, 1); g.fillEllipse(x - r * 0.4, p.y - r, r * 0.8, r * 1.8); g.fillEllipse(x + r * 0.4, p.y - r, r * 0.8, r * 1.8); g.fillStyle(0x3a6a2a, 1); g.fillRect(x - 1, p.y - r * 2 - 3, 3, 4);
          if (r === 11) { const a = 0.7 + 0.3 * Math.sin(t * 0.3); g.fillStyle(0xffe05a, a); g.fillTriangle(x - 6, p.y - 13, x - 2, p.y - 13, x - 4, p.y - 17); g.fillTriangle(x + 2, p.y - 13, x + 6, p.y - 13, x + 4, p.y - 17); g.fillRect(x - 6, p.y - 8, 12, 2); }
        }
        const hx = p.x1 + w * 0.36; g.fillStyle(0xd8b04a, 1); g.fillRect(hx - 14, p.y - 14, 28, 14); g.fillStyle(0xb88a2a, 1); for (let k = 0; k < 4; k++) g.fillRect(hx - 14, p.y - 12 + k * 3, 28, 1); g.fillStyle(0x8a5a2a, 1); g.fillRect(hx - 6, p.y - 14, 2, 14); g.fillRect(hx + 6, p.y - 14, 2, 14);   // a hay bale
        const sx = p.x2 - 80, sway = Math.sin(t * 0.03) * 1.5;                                   // the scarecrow
        g.fillStyle(0x5a3a1a, 1); g.fillRect(sx - 1, p.y - 50, 3, 50); g.fillRect(sx - 16, p.y - 40, 33, 3);
        g.fillStyle(0x3a5a8a, 1); g.fillRect(sx - 8 + sway, p.y - 42, 17, 18); g.fillStyle(0xd8b04a, 1); g.fillRect(sx - 18, p.y - 41, 4, 4); g.fillRect(sx + 15, p.y - 41, 4, 4);
        g.fillStyle(0xe8d8a8, 1); g.fillCircle(sx + sway, p.y - 50, 7); g.fillStyle(0x1a1010, 1); g.fillRect(sx - 3 + sway, p.y - 52, 2, 2); g.fillRect(sx + 2 + sway, p.y - 52, 2, 2); g.fillRect(sx - 3 + sway, p.y - 47, 7, 1);
        g.fillStyle(0x6a3a1a, 1); g.fillRect(sx - 10 + sway, p.y - 57, 21, 3); g.fillRect(sx - 5 + sway, p.y - 64, 11, 7);
      }
    },
  },
};

export function makeTheme(m, fx) {
  const T = THEMES[fx]; if (!T) return null;
  const back = m.add.graphics().setScrollFactor(0).setDepth(48);
  const mid = m.add.graphics().setScrollFactor(0.15).setDepth(48.5); mid.y = -55;   // (raised: the far scenery shows above the stage)
  m.addBg(back, mid);
  T.backdrop(back, mid);
  const props = m.add.graphics(); m.addWorld(props);                                  // (made before the fighters: drawn under them)
  const grade = m.add.graphics().setScrollFactor(0).setDepth(3).setBlendMode(Phaser.BlendModes.MULTIPLY); m.addUI(grade);
  grade.fillStyle(T.grade, 1); grade.fillRect(0, 0, W, H);
  return {
    draw(t) { props.clear(); T.props(props, m.stage.platforms || [], t); },
  };
}

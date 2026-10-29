// STAGE THEMES (the shop's STAGES shelf): a theme re-dresses whatever stage you fight on. matchExtras.js makes one
// for the stage effect you switched on:
//   backdrop  a new sky and far scenery painted over the stage's own backdrop (background camera, depth 48 - under
//             FULL AERO's sky at 50 and the theme's animated sky at 49)
//   props     things standing on the stage's platforms - snow caps and icicles, cherry trees, gravestones, cacti... -
//             found from stage.platforms every frame (so moving platforms carry theirs)
//   grade     a colour wash multiplied over the whole picture (world and background, under the HUD)
// The weather itself (rain, snow, petals...) is drawn by matchExtras.js.
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

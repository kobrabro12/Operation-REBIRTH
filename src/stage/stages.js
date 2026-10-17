// Every stage shown on the stage select screen, in grid order.
// Locked entries are placeholders for stages still being made.
import { SkyStage, PAL } from './skyStage.js';
import { SpireStage, drawSpirePreview } from './spireStage.js';
import { MoonStage, drawMoonPreview } from './moonStage.js';
import { ArcadeStage, drawArcadePreview } from './arcadeStage.js';

export const STAGES = [
  {
    id: 'sky-sanctum', name: 'SKY SANCTUM', available: true, make: (scene) => new SkyStage(scene),
    blurb: ['A flat island floating above the clouds,', 'with three cloud ledges to jump through.'],
    hazard: 'LIGHTNING STORM: A WARNING FLASHES,\nTHEN LIGHTNING STRIKES THAT SPOT.',
    preview: drawSkyPreview,
  },
  {
    id: 'verdant-spires', name: 'VERDANT SPIRES', available: true, make: (scene) => new SpireStage(scene),
    blurb: ['A jungle island of rock spires above the sea,', 'with a shelf, a temple roof and a high crag.'],
    hazard: 'GEYSERS BLAST UP FROM BUBBLING GROUND;\nBOULDERS ROLL ACROSS THE ISLAND.',
    preview: drawSpirePreview,
  },
  {
    id: 'gravemoon-bridge', name: 'GRAVEMOON BRIDGE', available: true, make: (scene) => new MoonStage(scene),
    blurb: ['A stone bridge over a misty chasm, held up', 'by horned gargoyles under a giant moon.'],
    hazard: 'GARGOYLE GAZE: AN ANKLE-HIGH EYE-BEAM;\nBAT SWARM: BATS STREAM ACROSS THE SKY.',
    preview: drawMoonPreview,
  },
  {
    id: 'neon-arcade', name: 'NEON ARCADE', available: true, make: (scene) => new ArcadeStage(scene),
    blurb: ['The control panel of a giant arcade cabinet,', 'under a synthwave sunset. Insert coin!'],
    hazard: 'RETRO MOVES: PIXEL WAVE, SPIN DASH,\nBLOCK DROP AND INVADER RAID.',
    preview: drawArcadePreview,
  },
];

export const STAGE_SLOTS = 8;   // tiles on the select grid; the last one is Random

export function stageById(id) {
  const avail = STAGES.filter((s) => s.available);
  if (id === 'random' || !id) return avail[Math.floor(Math.random() * avail.length)];
  return STAGES.find((s) => s.id === id && s.available) || avail[0];
}

// Miniature of Sky Sanctum drawn into a box (x, y, w, h).
function drawSkyPreview(g, x, y, w, h) {
  const bands = [0x2463c8, 0x2f74d8, 0x3a8ae2, 0x4795e8, 0x5ba3ec, 0x7bbbf0, 0x9dd1f4];
  const bh = Math.ceil(h / bands.length);
  bands.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(x, y + i * bh, w, Math.min(bh, h - i * bh)); });
  const u = w / 100;                      // 1 unit = 1% of the box width
  const cloud = (cx, cy, cw) => {
    g.fillStyle(PAL.cloudShade, 1); g.fillRect(x + cx * u, y + cy * u + 2 * u, cw * u, 1.5 * u);
    g.fillStyle(PAL.cloud, 1); g.fillRect(x + cx * u, y + cy * u, cw * u, 2 * u); g.fillRect(x + (cx + cw * 0.3) * u, y + (cy - 1.2) * u, cw * 0.4 * u, 1.4 * u);
  };
  cloud(8, 8, 16); cloud(70, 5, 20); cloud(40, 14, 12);
  // island
  const top = y + h * 0.62, left = x + w * 0.18, right = x + w * 0.82;
  for (let r = 0; r < 6; r++) {
    const inset = r * r * u * 0.6 + r * u * 1.6;
    g.fillStyle(r < 2 ? PAL.dirt : r < 4 ? PAL.dirtDark : PAL.stoneDark, 1);
    g.fillRect(left + inset, top + 2 * u + r * 2.2 * u, right - left - inset * 2, 2.2 * u);
  }
  g.fillStyle(PAL.outline, 1); g.fillRect(left - u * 0.4, top - u * 0.4, right - left + u * 0.8, 2.8 * u);
  g.fillStyle(PAL.grass, 1); g.fillRect(left, top, right - left, 2 * u);
  g.fillStyle(PAL.grassLight, 1); g.fillRect(left, top, right - left, 0.7 * u);
  // pillars
  for (const px of [left + 3 * u, right - 5 * u]) {
    g.fillStyle(0xd8d0e0, 1); g.fillRect(px, top - 9 * u, 2 * u, 9 * u);
    g.fillStyle(PAL.gold, 1); g.fillRect(px - 0.5 * u, top - 10 * u, 3 * u, u);
  }
  // cloud ledges
  const ledge = (lx, ly, lw) => { g.fillStyle(PAL.cloud, 1); g.fillRect(x + lx * u, ly, lw * u, Math.max(2, 1.6 * u)); };
  ledge(30, top - h * 0.2, 13); ledge(57, top - h * 0.2, 13); ledge(44, top - h * 0.37, 12);
}

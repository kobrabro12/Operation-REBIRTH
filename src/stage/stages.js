// Every stage shown on the stage select screen, in grid order.
// Locked entries are placeholders for stages still being made.
import { SkyStage, PAL } from './skyStage.js';
import { SpireStage, drawSpirePreview } from './spireStage.js';
import { MoonStage, drawMoonPreview } from './moonStage.js';
import { ArcadeStage, drawArcadePreview } from './arcadeStage.js';
import { ForestStage, drawForestPreview } from './forestStage.js';
import { BackroomsStage, drawBackroomsPreview } from './backroomsStage.js';
import { InfectedStage, drawInfectedPreview } from './infectedStage.js';
import { AeroStage, drawAeroPreview } from './aeroStage.js';
import { BaseplateStage, drawBaseplatePreview } from './baseplateStage.js';
import { FracturedStage, drawFracturedPreview } from './fracturedStage.js';
import { MaskedStage, drawMaskedPreview } from './maskedStage.js';
import { StalingradStage, drawStalingradPreview } from './stalingradStage.js';
import { owns } from '../progress.js';

export const STAGES = [
  {
    id: 'sky-sanctum', music: 'bgm_sky', name: 'SKY SANCTUM', available: true, make: (scene) => new SkyStage(scene),
    blurb: ['A flat island floating above the clouds,', 'with three cloud ledges to jump through.'],
    hazard: 'LIGHTNING STORM: A WARNING FLASHES,\nTHEN LIGHTNING STRIKES THAT SPOT.',
    preview: drawSkyPreview,
  },
  {
    id: 'verdant-spires', music: 'bgm_spires', name: 'VERDANT SPIRES', available: true, make: (scene) => new SpireStage(scene),
    blurb: ['A jungle island of rock spires above the sea,', 'with a shelf, a temple roof and a high crag.'],
    hazard: 'GEYSERS BLAST UP FROM BUBBLING GROUND;\nBOULDERS ROLL ACROSS THE ISLAND.',
    preview: drawSpirePreview,
  },
  {
    id: 'gravemoon-bridge', music: 'bgm_gravemoon', name: 'GRAVEMOON BRIDGE', available: true, make: (scene) => new MoonStage(scene),
    blurb: ['A stone bridge over a misty chasm, held up', 'by horned gargoyles under a giant moon.'],
    hazard: 'GARGOYLE GAZE AND BAT SWARMS.\nBREAK THE LANTERN: THE BRIDGE BURNS!',
    preview: drawMoonPreview,
  },
  {
    id: 'neon-arcade', music: 'bgm_arcade', name: 'NEON ARCADE', available: true, make: (scene) => new ArcadeStage(scene),
    blurb: ['The control panel of a giant arcade cabinet,', 'under a synthwave sunset. Insert coin!'],
    hazard: 'RETRO MOVES: PIXEL WAVE, SPIN DASH,\nBLOCK DROP AND INVADER RAID.',
    preview: drawArcadePreview,
  },
  {
    id: 'elderwood-hollow', music: 'bgm_forest', name: 'ELDERWOOD HOLLOW', available: true, make: (scene) => new ForestStage(scene),
    blurb: ['A mossy root at a glowing world tree, deep in', 'a mythical forest. Day slowly turns to night.'],
    hazard: 'BRAMBLE SNARE: THORNS BURST FROM THE MOSS;\nSPIRIT STAG: A GLOWING STAG CHARGES ACROSS.',
    preview: drawForestPreview,
  },
  {
    id: 'backrooms', music: 'bgm_backrooms', name: 'THE BACKROOMS', available: true, make: (scene) => new BackroomsStage(scene),
    blurb: ['A scrap of floor adrift in the back rooms of', 'reality. Every minute: NOCLIP to a new level.'],
    hazard: 'LIGHTS OUT, FALLING CRATES, STEAM VENTS,\nTHE SURGE - ONE FOR EACH OF ITS 4 LEVELS.',
    preview: drawBackroomsPreview,
  },
  {
    id: 'infected', music: 'bgm_infected', name: 'INFECTED.EXE', available: true, make: (scene) => new InfectedStage(scene),
    blurb: ['The taskbar of a giant old PC that opened', 'every attachment it was ever sent.'],
    hazard: 'YOU ARE AN IDIOT, ILOVEYOU AND\nTHE RED ROOM TAKE TURNS WITH THE PC.',
    preview: drawInfectedPreview,
  },
  {
    id: 'aero-meadow', music: 'bgm_aero', name: 'AERO MEADOW', available: true, make: (scene) => new AeroStage(scene),
    blurb: ['A glossy Frutiger Aero dream where old gadgets', 'were left in the grass and nature took them back.'],
    hazard: 'CD SHOWER: GLINTS IN THE SKY, THEN\nSPINNING CDS STREAK DOWN AT AN ANGLE.',
    preview: drawAeroPreview,
  },
  {
    id: 'baseplate', musicList: ['bgm_baseplate_4', 'bgm_baseplate_5', 'bgm_baseplate_6', 'bgm_baseplate_10'], name: 'BASEPLATE 2012', available: true, make: (scene) => new BaseplateStage(scene),
    blurb: ['A studded green baseplate from the old block', 'games, between two sword-fight towers.'],
    hazard: 'ROCKETS, FALLING BRICKS, LAG SPIKES -\nAND A GRIEFER WHO THROWS HIS GEAR AT YOU.',
    preview: drawBaseplatePreview,
  },
  {
    // `shop`: locked until that shop item is bought (the GALAXY FRAGMENT in EXTRAS)
    id: 'fractured', music: 'bgm_fractured', name: 'FRACTURED', available: true, shop: 'ext-fragment', make: (scene) => new FracturedStage(scene),
    blurb: ['A giant galaxy-crystal fragment adrift in', 'deep space, its broken shards floating nearby.'],
    hazard: 'SHARD RAIN: GLINTS, THEN CRYSTALS FALL.\nCRYSTAL SURGE: SPIKES BURST FROM THE CRACKS.',
    preview: drawFracturedPreview,
  },
  {
    // locked until the CROWN OF MASKS is bought (EXTRAS - hidden until the shopkeeper's code NOLI); music = Mason's pixelated_audio 14
    id: 'masked-throne', music: 'bgm_shop_noli', name: 'MASKED THRONE', available: true, shop: 'ext-crown', make: (scene) => new MaskedStage(scene),
    blurb: ['A dark ruin ruled by a faceless stone king in', 'a crown of masks. You fight by your own light.'],
    hazard: "THE KING'S SWORD, COMEDY & TRAGEDY\n(HEAL OR WEEP) AND LIGHTS OUT.",
    preview: drawMaskedPreview,
  },
  {
    // locked until the VODKA is bought (EXTRAS - hidden until the shopkeeper's code PAPERSPLEASE); music = Mason's pixelated_audio 17
    id: 'stalingrad', music: 'bgm_shop_soviet', name: 'STALINGRAD', available: true, shop: 'ext-vodka', make: (scene) => new StalingradStage(scene),
    blurb: ['A factory city in ruins on the Volga,', 'in the winter of 1942. Snow, fire and rubble.'],
    hazard: 'ARTILLERY, A SNIPER IN THE TOWER\nAND COLLAPSING WALLS.',
    preview: drawStalingradPreview,
  },
];

// a stage you have to buy something in the shop to play (stage.shop) and haven't yet
export function stageLocked(st) { return !!(st && st.shop && !owns(st.shop)); }

// The tracks you can pick on the stage select screen (settings.track): AUTO (the stage's own music - or the shop track
// you switched on), any stage's music, the shop's tracks you own, or a random one. Stages above carry `music` / `musicList`
// (the same keys their stage files play).
export function trackList(owned = []) {
  return [{ id: 'auto', name: 'AUTO' }, { id: 'random', name: 'RANDOM' },
    ...STAGES.filter((s) => s.available && !stageLocked(s) && (s.music || s.musicList)).map((s) => ({ id: s.id, name: s.name, music: s.music, musicList: s.musicList })),
    ...owned.map((it) => ({ id: it.id, name: it.name, music: 'bgm_shop_' + it.id.slice(4), shop: true }))];
}

export const STAGE_SLOTS = 14;  // tiles on the select grid (2 across, 7 down); the last one is Random

export function stageById(id) {
  const avail = STAGES.filter((s) => s.available);
  if (id === 'random' || !id) { const open = avail.filter((s) => !stageLocked(s)); return open[Math.floor(Math.random() * open.length)]; }   // (random never picks a locked one)
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

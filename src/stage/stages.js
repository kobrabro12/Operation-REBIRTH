import {LiminalCastleStage,drawLiminalCastlePreview} from './liminalCastleStage.js';
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
import { WillowStage, drawWillowPreview } from './willowStage.js';
import { DesertStage, drawDesertPreview } from './desertStage.js';
import { MatrixStage, drawMatrixPreview } from './matrixStage.js';
import { CastleCourtStage, drawCastleCourtPreview } from './castleCourtStage.js';
import { JungleFallsStage, drawJungleFallsPreview } from './jungleFallsStage.js';
import { StarlightFountainStage, drawStarlightFountainPreview } from './starlightFountainStage.js';
import { SteamBossStage, drawBrassFoundryPreview } from './steamBossStage.js';
import { PolyBossStage, drawPolygonPeakPreview } from './polyBossStage.js';
import { DragonBossStage, drawDragonsKeepPreview } from './dragonBossStage.js';
import { owns } from '../progress.js';

export const STAGES = [
  {id:'endless-castle',music:'bgm_endless_castle',name:'ENDLESS CASTLE',available:true,make:scene=>new LiminalCastleStage(scene),blurb:['An abandoned checkerboard castle.', 'Uneven terraces and silent balconies.'],hazard:'NO STAGE HAZARDS.\nFIXED TERRACES / TWO BALCONIES.',preview:drawLiminalCastlePreview},
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
  {
    // locked until you type the shopkeeper's code 13 (`secret`); a 90s slasher homage (original - no real film or killer)
    id: 'willow-lane', music: 'bgm_slasher', name: '13 WILLOW LANE', available: true, secret: '13', make: (scene) => new WillowStage(scene),
    blurb: ['A stormy night in 1996. The party is over,', 'the phone keeps ringing - and he is in the house.'],
    hazard: 'THE CALL, BEHIND YOU AND THE STALK:\nA MASKED KILLER WHO CAN\'T BE STOPPED.',
    preview: drawWillowPreview,
  },
  {
    // locked until you type the shopkeeper's code HEISENBERG (`secret`); you fight on the roof of a speeding motorhome
    id: 'dust-runner', music: 'bgm_desert', name: 'DUST RUNNER', available: true, secret: 'HEISENBERG', make: (scene) => new DesertStage(scene),
    blurb: ['On the roof of a motorhome doing ninety', 'across the desert. Fall off and the road takes you.'],
    hazard: 'THE SWAT VAN: LASER SIGHTS, GUNFIRE\nAND GRENADES. THE ROAD DRAGS YOU AWAY.',
    preview: drawDesertPreview,
  },
  // three stages in real low-poly 3D (poly3d.js), original homages to the 64-bit era's stages
  {
    id: 'castle-court', music: 'bgm_castle_court', name: 'CASTLE COURT', available: true, make: (scene) => new CastleCourtStage(scene),
    blurb: ['A stone court floating over a white castle,', 'in real 64-bit-style 3D.'],
    hazard: 'THE BUMPER: A RED BUMPER SLIDES ON THE\nTOP LEDGE AND KNOCKS AWAY ANYONE IT TOUCHES.',
    preview: drawCastleCourtPreview,
  },
  {
    id: 'jungle-falls', music: 'bgm_jungle_falls', name: 'JUNGLE FALLS', available: true, make: (scene) => new JungleFallsStage(scene),
    blurb: ['A plank deck over a jungle waterfall, with', 'two circling log rafts. Low-poly 3D.'],
    hazard: 'THE BARREL: FALL INTO IT AND IT\nFIRES YOU STRAIGHT BACK UP.',
    preview: drawJungleFallsPreview,
  },
  {
    id: 'starlight-fountain', music: 'bgm_starlight_fountain', name: 'STARLIGHT FOUNTAIN', available: true, make: (scene) => new StarlightFountainStage(scene),
    blurb: ['A marble stage under a starry twilight sky,', 'before a great glittering fountain. Low-poly 3D.'],
    hazard: 'SIDE PLATFORMS RISE AND SINK.\nDREAM GEYSER: BUBBLES, THEN BURSTS UP.',
    preview: drawStarlightFountainPreview,
  },
  {
    id: 'the-construct', music: 'bgm_construct', name: 'THE CONSTRUCT', available: true, make: scene => new MatrixStage(scene),
    blurb: ['A code-rain rooftop inside a living simulation.', 'The system rewrites its floating platforms.'],
    hazard: 'MOVING LEDGES AND ARENA REWRITES.\nMARKED LANES WARN BEFORE SCAN BEAMS FIRE.',
    preview: drawMatrixPreview,
  },
  // BOSS ARENAS (Trinkets > BOSS FIGHTS, src/data/bosses.js): `bossArena` = locked until that boss is beaten on HARD
  // or NIGHTMARE (then playable in VS with just its hazards); never RANDOM while locked.
  { id: 'brass-foundry', music: 'bgm_boss_colossus', name: 'BRASS FOUNDRY', available: true, bossArena: 'colossus', make: (scene) => new SteamBossStage(scene),
    blurb: ['A riveted iron deck in a giant steam foundry,', 'the switched-off Colossus standing behind it.'],
    hazard: 'PIPE BURST: STEAM BLASTS ACROSS THE CATWALKS.\nCRANE DROP: A CRATE FALLS ON THE MARKED SPOT.', preview: drawBrassFoundryPreview },
  { id: 'polygon-peak', music: 'bgm_boss_polygon', name: 'POLYGON PEAK', available: true, bossArena: 'polygon', make: (scene) => new PolyBossStage(scene),
    blurb: ['A checkerboard arena floating in a 64-bit sky,', 'the King\'s empty crown drifting overhead.'],
    hazard: 'PYLON ZAP: ARCS CRACKLE ALONG BOTH LEDGES.\nQUAKE RING: A SHOCKWAVE RUNS OUT - JUMP IT.', preview: drawPolygonPeakPreview },
  { id: 'dragons-keep', music: 'bgm_boss_dragon', name: "DRAGON'S KEEP", available: true, bossArena: 'dragon', make: (scene) => new DragonBossStage(scene),
    blurb: ['The battlements of a keep under a red moon,', 'the town below burning, a dragon far off.'],
    hazard: 'CATAPULT STONE: A BOULDER LANDS ON THE MARK.\nBRAZIER FLARE: THE TOWER FIRES ERUPT.', preview: drawDragonsKeepPreview },
];

// a stage you have to buy something in the shop to play (stage.shop) and haven't yet
// which secret codes have been found - achievements.js hands its check over on load (it imports this file, so this file
// can't import it back)
let foundSecret = () => false;
export function setSecretCheck(fn) { foundSecret = fn; }
/** Whether a stage can't be played yet: a shop item not bought, a secret code not found, a boss arena not won. */
export function stageLocked(st) { return !!(st && ((st.shop && !owns(st.shop)) || (st.secret && !foundSecret(st.secret)) || (st.bossArena && !arenaWon(st.bossArena)))); }
// a boss arena opens once its boss is beaten on HARD or NIGHTMARE (read straight from the save: src/data/bosses.js
// imports achievements.js, which imports this file, so this file can't import it)
function arenaWon(id) { try { const r = (JSON.parse(localStorage.getItem('rebirth.bosses') || '{}') || {})[id]; return !!(r && (r.won[1] || r.won[2])); } catch (e) { return false; } }   // (or a code you haven't found: `secret`)

// The tracks you can pick on the stage select screen (settings.track): AUTO (the stage's own music - or the shop track
// you switched on), any stage's music, the shop's tracks you own, or a random one. Stages above carry `music` / `musicList`
// (the same keys their stage files play).
export function trackList(owned = []) {
  return [{ id: 'auto', name: 'AUTO' }, { id: 'random', name: 'RANDOM' },
    ...STAGES.filter((s) => s.available && !stageLocked(s) && (s.music || s.musicList)).map((s) => ({ id: s.id, name: s.name, music: s.music, musicList: s.musicList })),
    ...owned.map((it) => ({ id: it.id, name: it.name, music: 'bgm_shop_' + it.id.slice(4), shop: true }))];
}

// tiles on the select grid (2 across; the last one is Random): 16 (8 rows), more rows when there are more stages
export const STAGE_SLOTS = Math.max(16, Math.ceil((STAGES.length + 1) / 2) * 2);

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

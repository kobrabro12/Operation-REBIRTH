// Match settings chosen on the setup screen, shared between scenes.
export const settings = {
  mode: 'stock',      // 'stock' | 'time' | 'stamina' | 'training'
  dummy: 'stand',     // training dummy behaviour
  stocks: 3,
  minutes: 3,
  hp: 150,
  cpuCount: 3,        // CPUs fill the slots humans don't use
  difficulty: 1,      // index into DIFFICULTY
  items: true,
  hazards: true,
  crt: false,
  touch: 'auto',      // on-screen touch controls: 'auto' (touch screens) | 'on' | 'off'
  musicVolume: 0.6,
  sfxVolume: 0.8,
  // Controllers that joined on the setup screen. p1Pad = pad index that also drives player 1.
  p1Pad: null,
  extraPads: [],      // pad indexes for players 2-4
  // Chosen on the fighter select screen, one entry per player slot.
  stage: 'sky-sanctum', // stage id or 'random'
  picks: [],          // fighter id or 'random'
  skins: [],          // colour variation per slot (index into SKINS[fighter])
  cpuLevels: [],      // per-CPU difficulty (falls back to `difficulty`)
};

// Volumes are remembered in this browser between visits.
const VOL_KEY = 'rebirth.volumes';
try {
  const v = JSON.parse(localStorage.getItem(VOL_KEY) || 'null');
  if (v && typeof v.sfx === 'number') settings.sfxVolume = v.sfx;
  if (v && typeof v.music === 'number') settings.musicVolume = v.music;
} catch (e) { /* storage unavailable: keep the defaults */ }
export function saveVolumes() {
  try { localStorage.setItem(VOL_KEY, JSON.stringify({ sfx: settings.sfxVolume, music: settings.musicVolume })); } catch (e) { /* ignore */ }
}

// Other options (CRT filter, touch controls) are remembered the same way.
const OPT_KEY = 'rebirth.options';
try {
  const o = JSON.parse(localStorage.getItem(OPT_KEY) || 'null');
  if (o && typeof o.crt === 'boolean') settings.crt = o.crt;
  if (o && ['auto', 'on', 'off'].includes(o.touch)) settings.touch = o.touch;
} catch (e) { /* storage unavailable: keep the defaults */ }
export function saveOptions() {
  try { localStorage.setItem(OPT_KEY, JSON.stringify({ crt: settings.crt, touch: settings.touch })); } catch (e) { /* ignore */ }
}

export const MODE_NAMES = { stock: 'STOCK', time: 'TIMED BATTLE', stamina: 'STAMINA', training: 'TRAINING' };

// One-shot request for the next Match to be the title screen's demo. (Phaser re-uses the data passed to
// the previous scene.start, so a flag passed that way would leak into the next real match.) The Match
// clears it as soon as it reads it.
export const demoRequest = { next: false };

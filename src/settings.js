// Match settings chosen on the setup screen, shared between scenes.
export const settings = {
  mode: 'stock',      // 'stock' | 'time' | 'stamina'
  stocks: 3,
  minutes: 3,
  hp: 150,
  cpuCount: 3,        // CPUs fill the slots humans don't use
  difficulty: 1,      // index into DIFFICULTY
  items: true,
  hazards: true,
  crt: false,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  // Controllers that joined on the setup screen. p1Pad = pad index that also drives player 1.
  p1Pad: null,
  extraPads: [],      // pad indexes for players 2-4
  // Chosen on the fighter select screen, one entry per player slot.
  picks: [],          // fighter id or 'random'
  cpuLevels: [],      // per-CPU difficulty (falls back to `difficulty`)
};

export const MODE_NAMES = { stock: 'STOCK', time: 'TIMED BATTLE', stamina: 'STAMINA' };

// THE TROPHY HALL's places to put things (Trinkets > TROPHY HALL, src/scenes/TrophyHallScene.js). The hall is built
// round these: every pedestal, picture frame and the great plinth at the far end is a SLOT. Nothing is on display
// yet - when trophies, statues and art are added, give each a slot id here (`DISPLAY`) and the scene draws it there.
//   kind: 'pedestal' (a trophy or a small statue), 'frame' (a painting on the wall), 'plinth' (the one big statue)
//   side: -1 left wall / 1 right wall / 0 the middle; z: how far down the hall (px)

// how long the hall is, and the spacing of its bays (a column every BAY px down each side)
export const HALL = { length: 3600, bay: 480, bays: 7 };

/** Every slot in the hall, built from its layout: a pedestal and a picture frame per bay on each side, and the plinth. */
export const HALL_SLOTS = [
  ...[-1, 1].flatMap((side) => Array.from({ length: HALL.bays }, (_, i) => [
    { id: `pedestal-${side < 0 ? 'l' : 'r'}${i + 1}`, kind: 'pedestal', side, z: 240 + i * HALL.bay },
    { id: `frame-${side < 0 ? 'l' : 'r'}${i + 1}`, kind: 'frame', side, z: 240 + i * HALL.bay },
  ]).flat()),
  { id: 'plinth', kind: 'plinth', side: 0, z: HALL.length - 260 },
];

// slot id -> what's displayed there (empty for now: the hall is waiting for its first trophy)
export const DISPLAY = {};

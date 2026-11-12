// THE TROPHY HALL's places to put things, and what's on show (Trinkets > TROPHY HALL, src/scenes/TrophyHallScene.js). The hall is built
// round these: every pedestal, picture frame and the great plinth at the far end is a SLOT. What's on show is in
// `DISPLAY` (slot id -> a painting or a trophy); a new trophy needs a model in TrophyHallScene.trophyFaces.
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

// THE PAINTINGS (public/assets/hall/paintings.png, 160x112 each, 5 to a row - tools/sprites/hall_paintings.py):
// the fighters together and moments from their lore. frame = its picture on the sheet.
export const PAINTINGS = [
  { id: 'gates', frame: 0, title: 'GATES OF THE SANCTUM', text: 'He died holding these gates. The souls of every friend who fell beside him rose with him - and they are still holding them.' },
  { id: 'star', frame: 1, title: 'THE NIGHT THE STAR FELL', text: 'A purple star fell into the black water under Gravemoon Bridge. The fisherman who saw what climbed out says it tipped its hat to him.' },
  { id: 'tea', frame: 2, title: 'TEA ON THE ROCKS', text: 'Mr Wake insists on tea before every rematch. Soul Summoner takes two sugars. Lacy has never once let go of her sword.' },
  { id: 'burned', frame: 3, title: 'THE NIGHT THE CASTLE BURNED', text: 'The last knight of a dead order walks out of the fire with its last sword. Her hair was brown when she went in.' },
  { id: 'encore', frame: 4, title: 'ENCORE', text: 'NU played three encores. The whole roster was in the crowd. Even Mr Wake was waving his staff. Nobody talks about it.' },
  { id: 'purge', frame: 5, title: 'PURGE.EXE', text: 'The infection sent a thousand pop-ups into the meadow. AERO closed every single one. Then he went for a swim in his own helmet.' },
  { id: 'level0', frame: 6, title: 'LEVEL 0', text: 'Down the endless yellow halls, the lights hum and the carpet is damp. Something with a television for a head has seen her. Run.' },
  { id: 'birthday', frame: 7, title: 'HAPPY BIRTHDAY, ROSEMARY', text: 'The old mascot remembered her birthday. It brought a cake. Make a wish, Rosemary. Do not look at its eyes.' },
  { id: 'listens', frame: 8, title: 'SHE LISTENS', text: 'She kneels at her dying tree and prays. Something enormous kneels in the dark behind her, and it is listening too.' },
  { id: 'surf', frame: 9, title: "SURF'S UP", text: 'NU caught the biggest wave of the summer. AERO floated past and waved. The crab was not impressed.' },
];

// THE TROPHIES: drawn in 3D on their pedestals by the scene (`model` = which one: TrophyHallScene.trophyFaces)
export const TROPHIES = [
  { id: 'you-did-it', model: 'gold-rock', title: 'THE YOU DID IT TROPHY', text: 'Awarded for doing it. Nobody remembers what "it" was. The rock is solid gold. Probably.' },
];

// slot id -> what's displayed there ({ painting } or { trophy } id)
export const DISPLAY = {
  'pedestal-l1': { trophy: 'you-did-it' },
  'frame-l1': { painting: 'gates' }, 'frame-r1': { painting: 'star' }, 'frame-l2': { painting: 'tea' }, 'frame-r2': { painting: 'burned' },
  'frame-l3': { painting: 'encore' }, 'frame-r3': { painting: 'purge' }, 'frame-l4': { painting: 'level0' }, 'frame-r4': { painting: 'birthday' },
  'frame-l5': { painting: 'listens' }, 'frame-r5': { painting: 'surf' },
};

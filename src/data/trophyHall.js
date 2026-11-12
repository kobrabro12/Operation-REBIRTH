// THE TROPHY HALL's places to put things, and what's on show (Trinkets > TROPHY HALL, src/scenes/TrophyHallScene.js). The hall is built
// round these: every pedestal, picture frame and the great plinth at the far end is a SLOT. What's on show is in
// `DISPLAY` (slot id -> a painting or a trophy); a new trophy needs a model in TrophyHallScene.trophyFaces.
//   kind: 'pedestal' (a trophy or a small statue), 'frame' (a painting on the wall), 'plinth' (the one big statue)
//   side: -1 left wall / 1 right wall / 0 the middle; z: how far down the hall (px)

// how long the hall is, and the spacing of its bays (a column every BAY px down each side); the last `great` bays
// hold one GREAT frame a side (the masterpieces) instead of two ordinary ones
export const HALL = { length: 4080, bay: 480, bays: 8, great: 2 };

/** Every slot in the hall, built from its layout: per bay and side a pedestal and two frames (a / b) - or one great frame in the last bays - and the plinth. */
export const HALL_SLOTS = [
  ...[-1, 1].flatMap((side) => Array.from({ length: HALL.bays }, (_, i) => {
    const s = side < 0 ? 'l' : 'r', z = 240 + i * HALL.bay;
    const frames = i >= HALL.bays - HALL.great ? [{ id: `great-${s}${i + 1}`, kind: 'frame', big: true, side, z }]
      : [{ id: `frame-${s}${i + 1}a`, kind: 'frame', side, z: z - 112 }, { id: `frame-${s}${i + 1}b`, kind: 'frame', side, z: z + 112 }];
    return [{ id: `pedestal-${s}${i + 1}`, kind: 'pedestal', side, z }, ...frames];
  }).flat()),
  { id: 'plinth', kind: 'plinth', side: 0, z: HALL.length - 260 },
];

// THE PAINTINGS (public/assets/hall/paintings.png, 160x112 each, 5 to a row - tools/sprites/hall_paintings.py):
// the fighters together and moments from their lore. frame = its picture on the sheet.
// The MASTERPIECES (`big`: 320x224, animated - `sheet` hall_master_<id> with `frames` pictures in a row,
// tools/sprites/hall_masterpieces.py) hang in the great frames at the far end.
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
  { id: 'shop', frame: 10, title: 'THE BELL', text: 'Ring three times and the shopkeeper lights up. Everybody wants the golden capsule. Nobody has ever got the golden capsule.' },
  { id: 'spar', frame: 11, title: 'MORNING DRILLS', text: 'NU swears he can beat Lacy before breakfast. He has said this every morning for a year. Lacy has never missed breakfast.' },
  { id: 'demons', frame: 12, title: 'THE PAGES TURN', text: 'She reads aloud from the book of shadow sludge, and they come when they are called. They always come.' },
  { id: 'fountain', frame: 13, title: 'WISHES IN THE WATER', text: 'NU wished for a record deal. AERO wished for NU to stop talking about the record deal. Only one wish came true.' },
  { id: 'willow', frame: 14, title: "DON'T ANSWER IT", text: '13 Willow Lane, 1996. The phone on the porch has been ringing all night. Someone is watching from the upstairs window.' },
  { id: 'desert', frame: 15, title: 'ROOF RIDE', text: 'Soul Summoner and Mr Wake settle it on the roof of a speeding motorhome. Somewhere behind them, a helicopter would like a word.' },
  { id: 'winter', frame: 16, title: 'STALINGRAD, 1942', text: "Rosemary in a greatcoat, alone in the ruins, snow on her shoulders. She stopped feeling the cold a long time ago." },
  { id: 'throne', frame: 17, title: 'THE KING WHO HAS NO FACE', text: 'Lacy stands before the Masked Throne. The king has no face. Every mask on its crown turns to look at her.' },
  { id: 'fractured', frame: 18, title: 'FRACTURED', text: 'A galaxy shard, cracked off something enormous. Soul Summoner keeps watch on it. The stars out here are not stars. They are cracks.' },
  { id: 'baseplate', frame: 19, title: 'BASEPLATE 2012', text: 'AERO built a little house out of bricks. WHAT ONCE WAS is standing inside it. Nobody let it in. Nobody built a door.' },
  { id: 'photo', frame: 20, title: 'PICTURE DAY', text: "Everybody smile! The glutton ate the photographer's sandwich, so this is the only picture there is." },
  { id: 'ascend', frame: 21, title: 'FULL AERO', text: 'The fishbowl cracks, the light pours out, and a king floats up with a golden spear. Everyone covers their eyes. Except NU.' },
  { id: 'clash', big: true, sheet: 'hall_master_clash', frames: 8, title: 'THE CLASH AT SKY SANCTUM', text: "A MASTERPIECE. The whole roster, one sunset, one fight for the sanctum: fire meets water, Lacy dives in, NU hits the chord, and FULL AERO shines over all of it while the souls of the fallen circle the dome." },
  { id: 'feast', big: true, sheet: 'hall_master_feast', frames: 8, title: 'THE FEAST OF FIGHTERS', text: "A MASTERPIECE. Once a year they put down their weapons (mostly) and eat. Soul Summoner makes the toast, Mr Wake pours the tea, NU won't stop playing, and the glutton is going for the roast again." },
  { id: 'drowned', big: true, sheet: 'hall_master_drowned', frames: 8, title: 'THE DROWNED HOUR', text: "A MASTERPIECE. The storm breaks over a sea of sludge. THE DEVOTED rises, drowned, with her demons - and what she will become rises behind her. On the last cliff, two stand their ground. Mr Wake holds back the tide." },
  { id: 'bowl', big: true, sheet: 'hall_master_bowl', frames: 8, title: 'THE BOWL', text: "A MASTERPIECE, in thousands of little glazed stones: AERO's fishbowl, laid ring by ring like an old temple floor. Nobody knows who made it. The goldfish swims in it anyway. Nobody can explain that either." },
];

// THE TROPHIES: drawn in 3D on their pedestals by the scene (`model` = which one: TrophyHallScene.trophyFaces;
// `plaque` = what's engraved on it). YOU DID IT is `free`; the rest are earned - how, and how far along you are, is
// TROPHY_GOALS in src/achievements.js (same ids), each harder than the last. Locked ones stand there as a shadow.
export const TROPHIES = [
  { id: 'you-did-it', free: true, model: 'gold-rock', plaque: 'YOU DID IT', title: 'THE YOU DID IT TROPHY', text: 'Awarded for doing it. Nobody remembers what "it" was. The rock is solid gold. Probably.' },
  { id: 'first-sword', model: 'sword', plaque: 'FIRST WIN', title: 'THE FIRST SWORD', text: 'A toy sword with a red plastic hilt. Everyone starts somewhere. You started by winning.' },
  { id: 'bronze-boot', model: 'boot', plaque: '100 KOS', title: 'THE BRONZE BOOT', text: 'A winged boot cast in bronze, for kicking a hundred fighters off the edge of the world.' },
  { id: 'silver-fish', model: 'goldfish', plaque: '50 WINS', title: 'THE SILVER GOLDFISH', text: "AERO's goldfish, in solid silver, leaping a silver wave. Fifty wins. The real one is not impressed." },
  { id: 'crystal-crown', model: 'crown', plaque: 'FLAWLESS', title: 'THE CRYSTAL CROWN', text: 'Ten wins without falling once. The crown is cut from the same crystal as the galaxy shard. Wear it carefully.' },
  // the boss trophies (beat each boss on NIGHTMARE - Trinkets > BOSS FIGHTS)
  { id: 'brass-heart', model: 'gear', plaque: 'COLOSSUS', title: 'THE BRASS HEART', text: "The Clockwork Colossus's furnace heart, still warm, set in a brass cog. It beat for a hundred years. You stopped it on NIGHTMARE." },
  { id: 'golden-cartridge', model: 'cartridge', plaque: 'KING POLYGON', title: 'THE GOLDEN CARTRIDGE', text: 'A solid gold game cartridge with a crown on its label. Blow on the contacts for luck. King Polygon fell on NIGHTMARE.' },
  { id: 'dragon-crest', model: 'dragon', plaque: 'ASHWING', title: 'THE DRAGON CREST', text: "Ashwing's horned head in red-gold, mounted on a knight's shield. The last dragon, beaten on NIGHTMARE. The keep is safe." },
  { id: 'phoenix', model: 'phoenix', plaque: 'REBIRTH', title: 'THE REBIRTH PHOENIX', text: 'The highest honour in the hall: a golden phoenix rising out of its own fire. Every achievement, done. Operation REBIRTH complete.' },
];

// slot id -> what's displayed there ({ painting } or { trophy } id)
export const DISPLAY = {
  'pedestal-l1': { trophy: 'you-did-it' }, 'pedestal-r1': { trophy: 'first-sword' }, 'pedestal-l2': { trophy: 'bronze-boot' },
  'pedestal-r2': { trophy: 'silver-fish' }, 'pedestal-l3': { trophy: 'crystal-crown' }, 'plinth': { trophy: 'phoenix' },
  'pedestal-r3': { trophy: 'brass-heart' }, 'pedestal-l4': { trophy: 'golden-cartridge' }, 'pedestal-r4': { trophy: 'dragon-crest' },
  'frame-l1a': { painting: 'gates' }, 'frame-l1b': { painting: 'tea' }, 'frame-r1a': { painting: 'star' }, 'frame-r1b': { painting: 'burned' },
  'frame-l2a': { painting: 'encore' }, 'frame-l2b': { painting: 'spar' }, 'frame-r2a': { painting: 'purge' }, 'frame-r2b': { painting: 'ascend' },
  'frame-l3a': { painting: 'level0' }, 'frame-l3b': { painting: 'baseplate' }, 'frame-r3a': { painting: 'birthday' }, 'frame-r3b': { painting: 'willow' },
  'frame-l4a': { painting: 'listens' }, 'frame-l4b': { painting: 'demons' }, 'frame-r4a': { painting: 'surf' }, 'frame-r4b': { painting: 'fountain' },
  'frame-l5a': { painting: 'shop' }, 'frame-l5b': { painting: 'photo' }, 'frame-r5a': { painting: 'desert' }, 'frame-r5b': { painting: 'winter' },
  'frame-l6a': { painting: 'throne' }, 'frame-r6a': { painting: 'fractured' },
  'great-l7': { painting: 'clash' }, 'great-r7': { painting: 'feast' }, 'great-l8': { painting: 'drowned' }, 'great-r8': { painting: 'bowl' },
};

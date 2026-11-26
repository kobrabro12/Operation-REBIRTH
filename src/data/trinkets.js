// THE ARCHIVIST's TRINKETS: left alone for TRIP.quiet frames she snaps herself into an old video game's world (one
// per genre - our own homages, no real game's art), grabs something iconic out of it and snaps home; it goes on the
// little shelf on her wall (src/scenes/recordsTrips.js draws the worlds, the portals and the shelf). Each trinket:
// - `map` + `pal`: its pixel art (one character a pixel, '.' = empty), `glow` the colour it shines
// - `world` / `genre`: the dimension she went to; `portal`: the portal's shape and its rim's style ('kind')
// - `say` (as she snaps out), `look` (once she's there), `lore` (its card - real history told plainly, then hers)
// Collected ids are saved as `rebirth.trinkets`; ones you haven't opened yet glow NEW (`rebirth.trinketsSeen`).

export const TRINKETS = [
  {
    id: 'lblock', name: 'AN ORANGE L-BLOCK', world: 'THE WELL', genre: 'FALLING BLOCKS, 1984', glow: 0xf09030,
    portal: { shape: 'rect', kind: 'blocks', inside: [0x0a0a20, 0x14143a, 0x1e1e50] },
    map: ['hhO...', 'hOd...', 'Odd...', 'hhO...', 'hOd...', 'Odd...', 'hhOhhO', 'hOdhOd', 'OddOdd'],
    pal: { h: 0xffc070, O: 0xf08020, d: 0xa04810 },
    say: 'HOLD THE FORT. I CAN HEAR BLOCKS FALLING.',
    look: 'EVERYTHING HERE IS MADE OF FOUR SQUARES! AND IT NEVER STOPS FALLING.',
    lore: 'In 1984 Alexey Pajitnov, a researcher at a computer centre in Moscow, made a puzzle out of shapes of four squares falling into a well. Fill a row and it vanishes. It spread from computer to computer, then out of the country, then onto every screen there was.\n\nIn THE WELL the blocks have never stopped falling - not once, not for anyone. There is no floor, only the next line. I reached into the queue and took an orange L, still warm. Somewhere a player got the long straight one they were waiting for instead. You\'re welcome.',
  },
  {
    id: 'pellet', name: 'A POWER PELLET', world: 'THE NEON MAZE', genre: 'MAZE CHASE, 1980', glow: 0xffd8a8,
    portal: { shape: 'rect', kind: 'maze', inside: [0x000000, 0x020210, 0x04041c] },
    map: ['..ppp..', '.pPPPp.', 'pPWPPPp', 'pPPPPPp', 'pPPPPPp', '.pPPPp.', '..ppp..'],
    pal: { p: 0xd09060, P: 0xffd8a8, W: 0xffffff },
    say: 'BACK IN A BLINK. SOMETHING\'S GLOWING IN A MAZE.',
    look: 'DOTS! MILES OF DOTS! AND SOMEONE\'S BEEN EATING THEM.',
    lore: 'In 1980 Toru Iwatani and a small team at Namco made a game about eating instead of shooting - partly, he said, so that more people would want to play. Four big glowing pellets sit in the corners of the maze. Eat one and, for a few seconds, whatever was chasing you starts running away.\n\nThe little sparks in THE NEON MAZE turned blue and ran the moment they saw me. Rude. I pocketed a pellet from the corner. It hums, and it\'s warm, and it\'s mine now. Do NOT eat it.',
  },
  {
    id: 'invader', name: 'A CAPTURED INVADER', world: 'THE MARCHING SKY', genre: 'FIXED SHOOTER, 1978', glow: 0x7cf06a,
    portal: { shape: 'ellipse', kind: 'invaders', inside: [0x000004, 0x04061a, 0x080a2a] },
    map: ['.LLLLLLL.', '.KKKKKKK.', 'g.......g', 'g...a...g', 'g..aaa..g', 'g.awawa.g', 'g.aaaaa.g', 'g.a.a.a.g', 'g.a...a.g', 'g.......g', '.ggggggg.'],
    pal: { L: 0xb0b0c0, K: 0x707080, g: 0xa8e8ff, a: 0x7cf06a, w: 0x101010 },
    say: 'ONE SEC - THE SKY IS MARCHING AGAIN.',
    look: 'LEFT, LEFT, LEFT, DOWN. THEY\'VE BEEN AT THIS FOR AGES.',
    lore: 'In 1978 Tomohiro Nishikado built a game where rows of invaders march back and forth, a step lower every time. The fewer of them were left, the faster they moved - at first nobody planned that: the machine simply had fewer of them to draw, so it drew them quicker. It became the whole game.\n\nOne of them fell out of formation in THE MARCHING SKY and I caught it in a jar. It still steps left, left, left, down, all day long, very politely. As far as I can tell its name is Bleep.',
  },
  {
    id: 'coin', name: 'THE HUNDREDTH COIN', world: 'THE BRICK HILLS', genre: 'PLATFORMER, 1985', glow: 0xffd040,
    portal: { shape: 'ellipse', kind: 'coins', inside: [0x5c94fc, 0x6ca4fc, 0x48a838] },
    map: ['..ccc..', '.cYYYc.', 'cYWYyYc', 'cYWYyYc', 'cYYYyYc', 'cYYYyYc', 'cYYYyYc', '.cYYYc.', '..ccc..'],
    pal: { c: 0xa87020, Y: 0xffd040, W: 0xffffff, y: 0xd8a020 },
    say: 'BRB. SOMEBODY OUT THERE IS ONE COIN SHORT.',
    look: 'BLUE SKY, BRICKS IN THE AIR, COINS JUST... FLOATING THERE. NOBODY QUESTIONS IT.',
    lore: 'In the mid-eighties, home consoles turned "run to the right" into whole worlds: hills, bricks floating in the sky, secrets in every block. Coins hung in the air for the taking, and a hundred of them bought you one more life.\n\nEveryone remembers sitting on ninety-nine. In THE BRICK HILLS I found the hundredth coin spinning all by itself, and I took it. A hundredth coin belongs in an archive, where nobody can spend it - and where nobody ever has to be one coin short again. Well. Somebody does. Sorry.',
  },
  {
    id: 'heart', name: 'A FULL HEART', world: 'THE GREEN FIELD', genre: 'ADVENTURE, 1986', glow: 0xf03040,
    portal: { shape: 'arch', kind: 'quest', inside: [0x101008, 0x1a1810, 0x58b048] },
    map: ['.rr.rr.', 'rWRrRRr', 'rWRRRRr', 'rRRRRRr', '.rRRRr.', '..rRr..', '...r...'],
    pal: { r: 0x801020, R: 0xf03040, W: 0xffc0c0 },
    say: 'STAY PUT. I KNOW A CAVE.',
    look: 'GRASS, TREES, A LITTLE CAVE IN THE ROCKS. IT\'S ALL SEEN FROM ABOVE!',
    lore: 'Around the same time, adventure games started letting you wander an open field seen from above - into caves, under bushes, anywhere. Some cartridges even carried a little battery inside so the game could remember you. Your life was a row of hearts, and finding a whole new heart hidden somewhere meant you could take one more hit than before.\n\nThe heroes of THE GREEN FIELD keep spare hearts in caves, apparently, for safe keeping. This one is whole. If you hold it, it beats.',
  },
  {
    id: 'ball', name: 'THE SQUARE BALL', world: 'THE COURT', genre: 'BAT AND BALL, 1972', glow: 0xffffff,
    portal: { shape: 'rect', kind: 'tennis', inside: [0x000000, 0x000000, 0x0a0a0a] },
    map: ['.WWWW.', '.WWWW.', '.WWWW.', '.WWWW.', '......', '..kk..', '.kkkk.', 'kkkkkk'],
    pal: { W: 0xffffff, k: 0x5a5a64 },
    say: 'THEY\'VE BEEN RALLYING FOR FIFTY YEARS. TIME OUT!',
    look: 'TWO PADDLES, A LINE DOWN THE MIDDLE, AND A VERY TIRED BALL.',
    lore: 'In 1972 Allan Alcorn built a table tennis game at Atari as a practice project. They put the test machine in a bar in California, and within days it stopped working - its coin box was so full it jammed. The ball was square because a square was what the screen could draw.\n\nTHE COURT has been rallying ever since. I called time out and took the ball. Both paddles are still waiting for me to give it back, very patiently. The score was 3 - 7. I won\'t say to who.',
  },
  {
    id: 'duck', name: 'THE ONE THAT GOT AWAY', world: 'DUCK SEASON', genre: 'LIGHT GUN, 1984', glow: 0x2a8a3a,
    portal: { shape: 'circle', kind: 'duck', inside: [0x60b8ff, 0x70c4ff, 0x58a808] },
    map: ['......gg..', '.....gggy.', '.....gwgyy', '.bb..ggg..', 'bbbbbWbbb.', '.bBBBBBbb.', '..bbbbbb..', '...o..o...'],
    pal: { g: 0x2a8a3a, w: 0x000000, y: 0xf0b020, b: 0x8a5a2a, B: 0x6a4020, W: 0xf4f4f4, o: 0xf0a020 },
    say: 'DUCK SEASON. BACK IN A FLAP.',
    look: 'TALL GRASS, ONE BIG TREE, AND DUCKS. SO MANY DUCKS.',
    lore: 'Light guns couldn\'t really see. When you pulled the trigger, the TV went black for a single frame and every target lit up as a white box; if the little sensor in the gun saw white, you hit. Then the picture came back, too fast for anyone to notice.\n\nThis duck has flown across the sky of DUCK SEASON ten thousand times, and nobody has ever hit it - not once. I didn\'t shoot it either. I asked it nicely, and it came. It sits on my shelf now and quacks at the bell.',
  },
  {
    id: 'flag', name: 'A CHECKERED FLAG', world: 'SUNSET CIRCUIT', genre: 'ARCADE RACER, 1986', glow: 0xf0f0f0,
    portal: { shape: 'ellipse', kind: 'racer', inside: [0x502868, 0xe04870, 0x10a050] },
    map: ['pWkWkWk', 'pkWkWkW', 'pWkWkWk', 'pkWkWkW', 'p......', 'p......', 'p......', 'p......', 'p......', 'p......', 'PPP....'],
    pal: { p: 0xc0c0c8, W: 0xffffff, k: 0x101010, P: 0x606068 },
    say: 'BACK BEFORE THE TIMER RUNS OUT!',
    look: 'A ROAD STRAIGHT INTO THE SUNSET! THE PALM TREES ARE GOING BY SO FAST!',
    lore: 'Arcade racers of the eighties faked a road running into the distance: flat stripes and pictures of trees, scaled bigger and bigger as they came at you, faster than the eye could argue with. Sit in the cabinet, grip the wheel, and you were on the coast at sunset with the timer ticking.\n\nOut on SUNSET CIRCUIT the race never finishes - the road just keeps arriving. So I took the flag from the finish line. Technically, now, everyone has won.',
  },
  {
    id: 'rock', name: 'A VECTOR ROCK', world: 'THE ROCK FIELD', genre: 'VECTOR SHOOTER, 1979', glow: 0xffffff,
    portal: { shape: 'oct', kind: 'rocks', inside: [0x000000, 0x000004, 0x02020a] },
    map: ['..WWWW...', '.W....WW.', 'W.......W', 'W......W.', '.W.....W.', 'W.......W', '.WW...WW.', '...WWW...'],
    pal: { W: 0xffffff },
    say: 'MIND THE ROCKS. BE RIGHT BACK.',
    look: 'NOTHING HERE IS SOLID. IT\'S ALL DRAWN IN LIGHT!',
    lore: 'In 1979 some arcade screens drew no pixels at all: a beam traced glowing lines straight onto the glass, sharp as wire. Big rocks drifted across the dark, and when you shot one it broke into smaller rocks, and those broke again, until the last little ones went pop.\n\nThis is one of the smallest from THE ROCK FIELD - it doesn\'t break any further. I checked. It\'s made mostly of light, so it weighs nothing at all and it glows in the drawer at night.',
  },
  {
    id: 'lantern', name: 'A BRASS LANTERN', world: 'THE TEXT CAVE', genre: 'TEXT ADVENTURE, 1976', glow: 0xffd060,
    portal: { shape: 'rect', kind: 'text', inside: [0x031203, 0x041804, 0x031203] },
    map: ['...kk...', '..k..k..', '..k..k..', '.LLLLLL.', '.LgYYgL.', '.LgYYgL.', '.LgWYgL.', '.LgYYgL.', '.LLLLLL.', '..LLLL..', '.LLLLLL.'],
    pal: { k: 0x504020, L: 0xc89838, g: 0x806020, Y: 0xffe080, W: 0xffffff },
    say: 'GO NORTH. ...THAT\'S ME. I\'M GOING NORTH.',
    look: 'NOTHING HERE IS DRAWN. YOU READ IT, AND THEN IT\'S THERE.',
    lore: 'Before games had pictures they had words. Around 1976 Will Crowther wrote a cave you explored by typing - GO NORTH, TAKE LAMP - based on a real cave system he had helped to map; a year later Don Woods added treasures and magic. Every player who ever went down there needed a light.\n\nNobody draws THE TEXT CAVE. You read it, and it\'s there. I typed TAKE LANTERN and it was in my hand. It is now very dark down there. Someone should send them a candle.',
  },
];

export const TRINKET_KEY = 'rebirth.trinkets';
const SEEN_KEY = 'rebirth.trinketsSeen';

/** Reads a saved list of ids (empty if storage is unavailable). */
function readIds(key) {
  try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
}

/** The trinkets she's brought back, in the order she found them. */
export function trinketsOwned() { return readIds(TRINKET_KEY).filter((id) => TRINKETS.some((t) => t.id === id)); }

/** Puts a trinket on her shelf for good; returns true if it's new. */
export function addTrinket(id) {
  const ids = trinketsOwned(); if (ids.includes(id)) return false;
  ids.push(id);
  try { localStorage.setItem(TRINKET_KEY, JSON.stringify(ids)); } catch (e) { /* storage unavailable */ }
  return true;
}

/** Whether you've opened this trinket's card yet. */
export function trinketSeen(id) { return readIds(SEEN_KEY).includes(id); }

/** Remembers that you've read this trinket's card (it stops glowing NEW). */
export function markTrinketSeen(id) {
  const ids = readIds(SEEN_KEY); if (ids.includes(id)) return;
  ids.push(id);
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(ids)); } catch (e) { /* storage unavailable */ }
}

/** A trinket by id. */
export function trinketById(id) { return TRINKETS.find((t) => t.id === id) || null; }

// THE RECORDS OFFICE (Trinkets > LORE, RecordsScene.js): THE ARCHIVIST behind her counter. Ask her for a name and she
// digs out that file; every file you're given stays in your BRIEFCASE (saved as `rebirth.briefcase`).
// - findRecord(typed) -> the file a typed name asks for (fighters, bosses, a few world documents, the secrets), or null.
// - recordById(id) -> a file again (the briefcase keeps ids).
// - ARCH_LINES: everything she says, by moment. A line is a string; `%N` = the file's name, `%B` = a boss's name.
// - SECRET_RECORDS: the files nobody tells you about (BACKROOMS: she opens a portal and reaches through for it).
// Her voice: warm, quick, a little nosy, delighted by paperwork. Never cruel, never gory.
import { FILES } from './lore.js';
import { BACKSTORY, ARCHIVE } from './loreArchive.js';
import { BOSSES, SECRET_BOSSES, bossWins } from './bosses.js';
import { ROSTER, TEST_ROSTER } from '../fighters/roster.js';

const KEY = 'rebirth.briefcase';

/** The ids of every file in your briefcase, in the order you got them. */
export function briefcase() { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
/** Puts a file in your briefcase for good. Returns true if it's new. */
export function fileAway(id) {
  const b = briefcase(); if (b.includes(id)) return false;
  b.push(id); try { localStorage.setItem(KEY, JSON.stringify(b)); } catch (e) { /* storage unavailable */ }
  return true;
}

/** A typed name boiled down for matching: capitals and digits only (MR. WAKE -> MRWAKE). */
export const squash = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9$@]/g, '');

// other names each fighter answers to (the roster's own name and id always work)
const FIGHTER_ALIASES = {
  'soul-summoner': ['SOUL', 'SUMMONER', 'SOULSUMMONER', 'THEBLUEFLAMEKNIGHT'],
  'mr-wake': ['WAKE', 'MISTERWAKE', 'MRWAKE'],
  'hero-knight': ['LACY', 'HEROKNIGHT', 'HERO', 'KNIGHT'],
  nu: ['NU'], aero: ['AERO', 'GOLDFISH'], gnash: ['GNASH'],
  'what-once-was': ['WHATONCEWAS', 'WOW', 'TV'], 'last-seen': ['ROSEMARY', 'LASTSEEN', 'SEEN', 'ROSEMARYWALTEN'],
  fists: ['FISTS'], 'young-link': ['YOUNGLINK', 'LINK'], devoted: ['DEVOTED', 'THEDEVOTED'],
};
// other names each boss answers to
const BOSS_ALIASES = {
  colossus: ['COLOSSUS', 'CLOCKWORKCOLOSSUS', 'THECOLOSSUS'], polygon: ['POLYGON', 'KINGPOLYGON', 'KING'],
  demon: ['KARNAX', 'DEMON', 'MADBLADE'], knight: ['THORNWARD', 'ROOTBOUNDKNIGHT'], machine: ['BEIGE', 'BEIGEEXE', 'MACHINE', 'COMPUTER'],
  smudge: ['SMUDGE', 'LITTLEMASTER'], maestro: ['PHANTOM', 'MAESTRO', 'PHANTOMMAESTRO', 'THEPHANTOM'],
  stareater: ['VESPERION', 'STAREATER', 'STARKING'], hopple: ['HOPPLE', 'RABBIT', 'BUNNY'], hanz: ['HANZ', '$@L', 'SAL', 'SHOPKEEPER', 'HANZ$@L', 'HANZANDSAL'],
};
// the boss's own document in THE ARCHIVE (sealed until that boss is beaten once)
const BOSS_DOC = { colossus: 'b-colossus', polygon: 'b-polygon', demon: 'b-demon', knight: 'b-knight', machine: 'b-machine', smudge: 'b-smudge', maestro: 'b-maestro', stareater: 'b-star', hopple: 'h-transcript', hanz: 'b-hanz' };

// THE SECRET FILES: typed names nobody tells you (her hints do). anim = how she fetches it: 'portal' = she opens a
// way somewhere else and reaches through, 'self' = she laughs and pulls it out of her own hat, default = the bins.
export const SECRET_RECORDS = [
  { id: 'x-backrooms', names: ['BACKROOMS', 'THEBACKROOMS', 'LEVEL0', 'LEVELZERO'], name: 'THE BACKROOMS', tab: 'BACKROOMS', anim: 'portal', portal: 'backrooms',
    kind: 'SECRET FILE - HISTORY', from: 'RECOVERED THROUGH A DOOR THAT ISN\'T THERE',
    say: ['OOH. THAT ONE ISN\'T KEPT HERE.', 'IT\'S KEPT... ELSEWHERE. STAND BACK A LITTLE!'], after: 'THERE! IT SMELLS OF DAMP CARPET. THEY ALWAYS DO.',
    text: `A HISTORY OF THE BACKROOMS, AS FAR AS ANYONE CAN WRITE ONE.

THE PHOTOGRAPH. In May of 2019, in your world, somebody posted a single photograph to an anonymous message board: an empty office floor, yellow wallpaper, old damp carpet, fluorescent lights that you could almost hear. No people. No windows. No reason to be there. The thread asked for unsettling pictures that felt "off", and this one felt the most off of all.

Someone answered it with a short caption that stuck: slip out of reality in the wrong spot and you end up here - "the Backrooms" - with the damp carpet, the endless yellow, the hum of the lights, and mile after mile of empty rooms to be lost in.

THE SPREADING. People could not leave it alone. They gave the place LEVELS, the way a building has floors - LEVEL 0 the yellow rooms, LEVEL 1 a car park that never ends, the POOLROOMS warm and white and very still. They wrote survivors' logs, rules, warnings, maps that did not match. They made short films that looked like found tapes. Nobody owned it. Everybody added a room. It became the most famous place that does not exist.

THE ARCHIVE'S PART. Here is what my office knows that the message boards do not. On the night of the Starfall, one shard of the purple star went the wrong way. It did not land anywhere. It slipped between places, the way the story says people do - and where it settled, a place that only existed as a story started to exist a little bit for real. The Backrooms you can fight in are the edge of it: the arena drifts down through the levels every minute because it is sinking, slowly, into a building that has no bottom.

THE SURVEYS. I have sent three surveyors. Two came back. Their notes are in THE ARCHIVE under FIELD NOTES. The third sends a postcard every year on the night of the Starfall. Every postcard is a photograph of the same empty yellow room. Every year there is a little more of her shadow in it.

WHAT ONCE WAS walks there between fights. I think it is looking for a door. I think I know which one.

ADVICE, FROM THE OFFICE: If you ever see wallpaper that colour and hear lights that loud, do not run. Running is how you find the deeper levels. Walk. Keep a hand on the wall. And whatever happens, do not go to LEVEL FUN.` },
  { id: 'x-archivist', names: ['ARCHIVIST', 'THEARCHIVIST', 'YOU', 'HER', 'ME', 'CLERK', 'YOURSELF'], name: 'THE ARCHIVIST', tab: 'ARCHIVIST', anim: 'self',
    kind: 'PERSONNEL FILE - 000', from: 'FILED BY THE SUBJECT (SHE INSISTED)',
    say: ['ME?! NOBODY EVER ASKS ABOUT ME!', 'HOLD ON, I KEEP IT IN MY HAT...'], after: 'DON\'T READ THE PART ABOUT THE HAT. ...YOU\'RE GOING TO READ THE PART ABOUT THE HAT.',
    text: `FILE NO. 000 - THE ARCHIVIST.
NAME: The one on my badge. (Look closer. No, closer.)
POSITION: Records clerk, Sky Sanctum. Acting head of OPERATION REBIRTH, because somebody had to be.
HAT: Yes.

BEFORE: I kept the Sanctum's records. Births, deaths, the gate book, the weather, which bridges creak. A small office at the bottom of the tallest tower, with a lamp, a bell, a counter, and more drawers than one person could ever open. I liked it. Paper is honest. It only says what you put on it.

THE NIGHT: When the purple star broke over the Sanctum I was filing. The tower shook, the windows went violet, and every drawer in the office opened at once. I remember the papers lifting off the shelves like birds. I do not remember anything after that until the morning.

THE MORNING: I woke up behind this counter. My face was gone - not hurt, just blank, smooth as a clean page. There was ink on my fingers. Someone, or something, had drawn me a new one: two little eyes and a great big smile. I looked at it in the lamp's brass for a long time. Then I decided to keep it. It suits me better than the old one did.

SINCE: The star touched everything that night, and everything it touched began pulling toward the arenas. Somebody needed to write it all down. Who came back, and how. Who is fighting, and why. Whether it is working. I started a file on every one of them. Then a file on every place. Then a file on the things that do not have names yet. The drawers have not run out. I am beginning to think they never will.

ABOUT THE HAT: It was already on my head that morning. I do not know whose it was. The badge is warm when a new fighter arrives. I have never taken it off, and I would prefer you didn't ask me to.` },
  // THE FIVE MYSTERIES: internet mysteries and old campfire stories of the web, each with her own way of finding it
  { id: 'x-cicada', names: ['CICADA', 'CICADA3301', '3301', 'LIBERPRIMUS'], name: 'CICADA 3301', tab: 'CICADA 3301', anim: 'cipher', fx: 'cicada',
    kind: 'SECRET FILE - PUZZLE', from: 'FOUND BETWEEN THE LINES OF ANOTHER FILE',
    say: ['OOH. THAT ONE\'S NOT A NAME, IT\'S AN INVITATION.', 'HANG ON, I NEED MY GLASS. THE PRINT ON THIS ONE IS... HIDDEN.'], after: 'IT LANDED ON MY HAT. IT\'S STILL ON MY HAT, ISN\'T IT. ...DON\'T TELL ME.',
    text: `CICADA 3301: A RECRUITMENT NOTICE WITH NO RETURN ADDRESS.

THE FIRST POST. In January of 2012, an image appeared on an anonymous message board: white text on black, signed with a picture of a cicada and the number 3301. It said, more or less, that a group was looking for highly intelligent people, and that hidden inside the picture was a message - find it, and it would lead you on.

It did. Inside the image was hidden text. The text led to a code. The code led to a book, then to a phone number, then to coordinates - and the coordinates led to real posters, taped to real lampposts, in cities on different continents on the same day, each with a cicada and a QR code. Solvers had to work together across the world just to see every piece. The puzzles used old ciphers, hidden files inside pictures, a dead poet's verses and the kind of mathematics banks rely on. Every true message carried the same digital signature, so nobody could fake one.

WHAT HAPPENED NEXT. A handful of people reached the end of the first puzzle. They say they were invited somewhere private, and then went quiet. New rounds came in 2013 and 2014. The last big one left behind a book written almost entirely in runes - the LIBER PRIMUS - most of which has never been read. In 2017 a short signed message warned everyone not to trust any message that wasn't signed. Then nothing.

Nobody has ever proven who made it. Guesses run from a bank to a spy agency to a handful of very patient strangers. The cicada is a good choice: it spends years underground, then comes up all at once, sings, and is gone.

THE ARCHIVE'S PART. On the night of the Starfall, one of my drawers opened by itself and inside was a single sheet of paper I had never filed. A grid of runes, a cicada drawn in the corner, and the number 3301. I have been working on it for a long time. I have translated one line. It reads: WE ARE LOOKING FOR THE ONES WHO LOOK.

I think they found me. I think they're still deciding.` },
  { id: 'x-polybius', names: ['POLYBIUS', 'POLYBIOS', 'SINNESLOSCHEN', 'SINNESLOESCHEN'], name: 'POLYBIUS', tab: 'POLYBIUS', anim: 'dizzy', fx: 'arcade',
    kind: 'SECRET FILE - URBAN LEGEND', from: 'A CABINET NOBODY REMEMBERS PLUGGING IN',
    say: ['POLYBIUS? THAT\'S AN ARCADE GAME. IT\'S NOT REAL. IT IS DEFINITELY NOT REAL.', 'LET ME JUST... LOOK AT THE SCREEN FOR A SECOND...'], after: 'WHOOO. OKAY. WHO MOVED THE OFFICE? ...HERE. TAKE IT. DON\'T PLAY IT.',
    text: `POLYBIUS: THE ARCADE CABINET THAT WASN'T THERE.

THE STORY. In 1981, the legend goes, a new arcade machine appeared in a few arcades around Portland, Oregon. Plain black cabinet, no famous name on it - just POLYBIUS. The game was fast, bright and strange: spinning vector shapes, tunnels, flashing colours. People lined up to play. Then, the story says, they started having trouble: headaches, nightmares, forgetting things, a few who could not stop playing at all.

THE MEN IN BLACK. Every version has them: men in dark suits who came to the arcades after closing, opened the machines up and wrote things down - not the high scores, something else. Then one day the cabinets were gone, every one of them, as quietly as they'd come. No manufacturer ever claimed it. No receipts, no photos, no cabinet in any collection.

WHERE IT REALLY COMES FROM. Nobody has ever found a scrap of evidence from 1981. The earliest written mention anyone can point to is a short entry on a website about old arcade games, around the year 2000. It may have grown out of true stories from the time - real arcade players in that city did fall ill at a tournament, and real federal agents did visit arcades, though for very ordinary reasons - stitched together and told around enough campfires to become a game nobody ever played. Since then people have built their own POLYBIUS games, cabinets and all, so it exists now. Just not the way the story says.

THE ARCHIVE'S PART. On the night of the Starfall a shard came down on an empty parking lot where an arcade used to be. In the morning there was a black cabinet standing on the spot. No plug. The screen was on. I had it moved to the deepest drawer we have, which is not a drawer. Sometimes when I walk past I can hear the attract music. Sometimes it says my name in the high-score table. I have never played it. The score next to my name keeps going up.` },
  { id: 'x-buzzer', names: ['UVB76', 'UVB', 'BUZZER', 'THEBUZZER', 'MDZHB', '4625'], name: 'UVB-76 (THE BUZZER)', tab: 'UVB-76', anim: 'radio', fx: 'buzzer',
    kind: 'SECRET FILE - TRANSMISSION LOG', from: 'COPIED BY HAND FROM 4625 kHz',
    say: ['THE BUZZER! HOLD ON, I HAVE TO LISTEN LIVE FOR THIS ONE.', 'SHH. SHHH. IT\'S BUZZING.'], after: 'TWENTY-FIVE BUZZES A MINUTE, FORTY YEARS STRAIGHT. AND THEN, SOMETIMES... A WORD.',
    text: `UVB-76: THE STATION THAT NEVER STOPS BUZZING.

THE SIGNAL. Tune an old shortwave radio to 4625 kHz and, for most of the last fifty years, you'd have heard it: a short, dull, flat BUZZ, about twenty-five times a minute, over and over and over, all day, all night. Radio listeners started writing it down in the late 1970s and early 1980s. They named it after the call sign it seemed to use: UVB-76. Everyone else just calls it THE BUZZER.

THE VOICES. The buzz is not the whole story. Every so often - days apart, sometimes months - it stops. A man's voice reads out a short message in Russian: a call sign, then a few code words, often names, read slowly, twice. Then the buzzing comes back as if nothing happened. Over the years the call sign changed. The words never made sense to anyone outside.

WHAT IT MIGHT BE. Most people who study it believe it is a military channel, kept open with a buzz so that nobody else uses the frequency, waiting for messages that matter. Others think it's a test signal nobody ever turned off, or a "dead hand" that only stops if something has gone very wrong. In 2010 it moved its transmitter and, for a while, listeners heard background voices and footsteps, as if someone had left a microphone on in the room. No official explanation has ever been given. It is still, as far as anyone knows, out there.

THE ARCHIVE'S PART. Since the Starfall, there is a second voice on the frequency. Late, after midnight - eleven minutes past - between the buzzes, very quietly, a woman reads out names. I know the names. They are the fighters. She reads them in the order they arrived, and then one more name I don't recognise yet.

I write each one down. I am waiting to see who comes through the door.` },
  { id: 'x-rake', names: ['RAKE', 'THERAKE'], name: 'THE RAKE', tab: 'THE RAKE', anim: 'spook', fx: 'rake',
    kind: 'SECRET FILE - SIGHTINGS (COLLECTED)', from: 'KEPT IN A DRAWER THAT LOCKS FROM THE INSIDE',
    say: ['...THE RAKE.', 'I\'LL GET IT. JUST DON\'T... LOOK AT THE CORNER WHILE I DO.'], after: '...IS IT GONE? IT\'S GONE. HERE. I\'M STAYING DOWN HERE A MINUTE.',
    text: `THE RAKE: THE THING AT THE END OF THE BED.

THE STORY. Sometime around 2005, on an anonymous message board, people set out on purpose to invent a monster together - and made one that was never quite finished. They called it THE RAKE. It was pale and thin, crouched like a person who had forgotten how to stand, with long fingers and a face nobody could describe the same way twice. It didn't chase anyone. It didn't roar. It sat at the end of the bed, very still, and watched you sleep.

THE DOCUMENTS. What made the story stick was the paperwork. Someone wrote it as a collection: a diary entry hundreds of years old, a captain's log, a note left behind decades ago, a modern account from a family who woke up to find it sitting there - all supposedly found and gathered by people looking into the same thing. Different hands, different centuries, the same quiet visitor. Of course, every page was written by the storytellers. But it was written well enough that people still argue about it.

WHY IT WORKS. The Rake does almost nothing, and that is the trick. Every story ends the same way: it was there, and then it wasn't, and nobody ever slept well in that room again. It is a monster made of the moment just after you open your eyes in the dark.

THE ARCHIVE'S PART. I keep this file in a drawer that locks from the inside. I don't know how I lock it from the outside. I just know that when I come in in the morning it is locked, and when I go home at night it is unlocked.

Some nights, when the lamp flickers, the far corner of the office is darker than it should be, and taller. I don't look. I file. Paper is honest - it only says what you put on it. I have never once written down that anything is sitting in my corner. And I never will.` },
  { id: 'x-wow', names: ['WOW', 'WOWSIGNAL', 'THEWOWSIGNAL', '6EQUJ5'], name: 'THE WOW! SIGNAL', tab: 'WOW! SIGNAL', anim: 'wow', fx: 'wow',
    kind: 'SECRET FILE - OBSERVATION', from: 'ONE PRINTOUT, CIRCLED IN RED',
    say: ['OH! OH, I LOVE THIS ONE. WAIT RIGHT THERE.', 'IT\'S ON A PRINTOUT. A LONG ONE. ONE SECOND...'], after: 'SEVENTY-TWO SECONDS FROM THE STARS. EVERY TIME I READ IT I SAY IT OUT LOUD.',
    text: `THE WOW! SIGNAL: SEVENTY-TWO SECONDS FROM SOMEWHERE ELSE.

THE NIGHT. On August 15, 1977, a radio telescope in Ohio called the BIG EAR was doing what it always did: sweeping the sky, listening for anything that sounded like it had been made on purpose. A computer printed what it heard as rows of numbers and letters - mostly 1s and 2s and blanks, the quiet hiss of space.

THE PRINTOUT. A few days later, a volunteer astronomer named Jerry Ehman was reading back through the pages by hand and found a short run of characters that climbed and fell: 6EQUJ5. In that code, the letters meant the signal had been many, many times louder than the background - for about seventy-two seconds, exactly as long as a point in the sky took to drift through the telescope's view. It was narrow, too, sitting right near a frequency hydrogen gives off, the one many scientists had guessed someone out there might use to say hello. He circled it in red and wrote one word in the margin: WOW!

THE SEARCH. They pointed the telescope back at that patch of sky, toward the constellation Sagittarius, again and again. So did other astronomers, for years, with bigger and better instruments. It never came back. Many explanations have been offered since - something passing nearby, a natural cloud of gas, an odd reflection - and none of them has ever settled it completely.

THE ARCHIVE'S PART. On the night of the Starfall, the purple star was running from something, and it called out as it ran. I don't know how I know that. But I have a printout. Nobody printed it. It appeared in my in-tray at 12:11 AM, and halfway down the page, among all the quiet 1s and 2s, it climbs and falls: 6EQUJ5.

Someone had already circled it in red. The handwriting in the margin is mine.` },
  { id: 'x-levelfun', names: ['LEVELFUN', 'FUN'], refuse: true, say: ['NO.', 'WE DO NOT GO TO LEVEL FUN. ASK ME SOMETHING ELSE. QUICKLY.'] },
];

// WORLD FILES: words that fetch one of THE ARCHIVE's documents as a file of its own
const WORLD_RECORDS = [
  { id: 'w-starfall', names: ['STARFALL', 'THESTARFALL', 'STAR', 'PURPLESTAR'], tab: 'STARFALL' },
  { id: 'w-rebirth', names: ['REBIRTH', 'OPERATIONREBIRTH', 'OPERATION'], tab: 'REBIRTH' },
  { id: 'w-pull', names: ['PULL', 'THEPULL'], tab: 'THE PULL' },
  { id: 'w-sanctum', names: ['SANCTUM', 'SKYSANCTUM'], tab: 'SANCTUM' },
  { id: 'w-shop', names: ['SHOP', 'THESHOP'], tab: 'THE SHOP' },
  { id: 'h-case', names: ['CASSIE', 'CASSIEHOLLOWAY', 'HOLLOWAY'], tab: 'HOLLOWAY', quiet: true },
  { id: 's-backrooms', names: ['FIELDNOTES', 'SURVEYOR'], tab: 'FIELD NOTES' },
];

/** Every fighter with a file (the roster, then the test fighters). */
function fileFighters() { return [...ROSTER.filter((f) => f.available), ...TEST_ROSTER.filter((f) => !f.hidden)]; }
/** Whether a boss has been beaten at least once (any difficulty). */
const beaten = (id) => [0, 1, 2].some((t) => bossWins(id, t) > 0);

/** A fighter's file: their dossier, then their BACKGROUND and WHY THEY'RE HERE. */
function fighterRecord(f) {
  const d = FILES[f.id] || {}, b = BACKSTORY[f.id] || {};
  const dossier = [d.alias ? 'ALIAS: ' + d.alias : '', d.cls ? 'CLASS: ' + d.cls : '', d.weapon ? 'WEAPON: ' + d.weapon : '', d.origin ? 'ORIGIN: ' + d.origin : '',
    d.moves ? 'SPECIALS: ' + d.moves : '', d.limit ? 'LIMIT: ' + d.limit : '', '', d.lore || ''].filter((x, i, a) => x || (i && a[i - 1])).join('\n');
  const sections = [['DOSSIER', dossier]];
  if (b.background) sections.push(['BACKGROUND', b.background]);
  if (b.why) sections.push(['WHY THEY\'RE HERE', b.why]);
  return { id: 'f-' + f.id, name: f.name, tab: f.name, kind: 'FIGHTER FILE NO. ' + (d.no || '???'), from: 'RECORDS OFFICE, SKY SANCTUM', icon: f.id, sections };
}

/** A boss's file: what everyone knows about it, and its own document once you've beaten it. */
function bossRecord(b) {
  const doc = ARCHIVE.find((a) => a.id === BOSS_DOC[b.id]);
  const open = beaten(b.id);
  const sections = [['THE WARDEN', [b.name, b.title, 'FOUND AT: ' + b.arena, '', (b.blurb || '').replace(/\n/g, ' '), b.hazards ? '\nHAZARDS: ' + b.hazards : ''].join('\n')]];
  if (doc && open) sections.push([doc.title, doc.text]);
  if (doc && !open) sections.push(['SEALED', 'The rest of this file is sealed. Beat ' + b.short + ' in BOSS FIGHTS (any difficulty) and ask me again - I\'ll unseal it for you.']);
  return { id: 'b-' + b.id, name: b.short, tab: b.short, kind: 'WARDEN FILE', from: 'RECORDS OFFICE, SKY SANCTUM', sealed: doc && !open, boss: b, sections };
}

/** A world word's file: one of THE ARCHIVE's documents. */
function worldRecord(w) {
  const d = ARCHIVE.find((a) => a.id === w.id); if (!d) return null;
  return { id: 'd-' + w.id, name: d.title, tab: w.tab, kind: d.kind, from: d.from, quiet: w.quiet, sections: [[d.title, d.text]] };
}

/** A secret's file. */
function secretRecord(s) { return s.refuse ? { ...s } : { ...s, secret: true, sections: [[s.name, s.text]] }; }

/** The file a typed name asks for, or null if she's never heard of it. */
export function findRecord(typed) {
  const q = squash(typed); if (!q) return null;
  const s = SECRET_RECORDS.find((r) => r.names.includes(q)); if (s) return secretRecord(s);
  for (const f of fileFighters()) if (squash(f.name) === q || squash(f.id) === q || (FIGHTER_ALIASES[f.id] || []).includes(q)) return fighterRecord(f);
  for (const b of [...BOSSES, ...(SECRET_BOSSES || [])]) if (squash(b.short) === q || squash(b.name) === q || (BOSS_ALIASES[b.id] || []).includes(q)) return bossRecord(b);
  const w = WORLD_RECORDS.find((r) => r.names.includes(q)); if (w) return worldRecord(w);
  return null;
}

/** A file from your briefcase by its id (rebuilt, so a boss you've beaten since unseals it). */
export function recordById(id) {
  if (id.startsWith('f-')) { const f = fileFighters().find((x) => 'f-' + x.id === id); return f ? fighterRecord(f) : null; }
  if (id.startsWith('b-')) { const b = [...BOSSES, ...(SECRET_BOSSES || [])].find((x) => 'b-' + x.id === id); return b ? bossRecord(b) : null; }
  if (id.startsWith('d-')) { const w = WORLD_RECORDS.find((x) => 'd-' + x.id === id); return w ? worldRecord(w) : null; }
  const s = SECRET_RECORDS.find((x) => x.id === id); return s ? secretRecord(s) : null;
}

/** How many files there are to find (for the briefcase's count). */
export function recordCount() { return fileFighters().length + BOSSES.length + (SECRET_BOSSES || []).length + WORLD_RECORDS.length + SECRET_RECORDS.filter((s) => !s.refuse).length; }

// what she says. [expression, text] pairs or plain text (expression from the moment).
export const ARCH_LINES = {
  first: ['OH! A VISITOR! WELCOME TO THE RECORDS OFFICE!', 'I\'M THE ARCHIVIST. I KEEP A FILE ON EVERYONE THE STAR BROUGHT BACK.', 'CLICK ME WHEN YOU WANT ONE. I DON\'T BITE. I FILE.'],
  hello: ['WELCOME BACK! THE KETTLE\'S COLD BUT THE DRAWERS ARE OPEN.', 'OH GOOD, IT\'S YOU. I WAS ALPHABETISING MY FEELINGS.', 'RECORDS OFFICE, HOW CAN I HELP? ...THAT\'S RIGHT, I SAY IT EVERY TIME.', 'BACK FOR MORE? GOOD. PAPER GETS LONELY.'],
  ask: ['WHO DO YOU WANT FILES ON?', 'A NAME, PLEASE! ANY NAME!', 'WHO ARE WE LOOKING UP TODAY?', 'GO ON THEN - WHOSE FILE?'],
  found: ['%N! OOH, GOOD CHOICE. ONE SEC...', '%N... %N... I KNOW EXACTLY WHICH BIN.', 'AH, %N! THAT FILE\'S GOT A COFFEE RING ON IT. HOLD ON.', '%N, COMING RIGHT UP!'],
  give: ['HERE YOU GO! IT\'S YOURS NOW - IT GOES IN YOUR BRIEFCASE.', 'ONE FILE, FRESHLY DUSTED. DON\'T FOLD THE CORNERS.', 'THERE! STAMPED, SORTED, AND ALL YOURS.'],
  again: ['YOU\'VE ALREADY GOT THAT ONE! BUT HERE, HAVE ANOTHER LOOK.', 'IT\'S IN YOUR BRIEFCASE ALREADY, SILLY. ...FINE. HERE.'],
  unknown: ['%N? NEVER HEARD OF THEM. ARE YOU SURE THAT\'S A PERSON?', 'NOTHING UNDER %N. NOT EVEN A NAPKIN.', 'HMM. NO %N IN ANY OF MY DRAWERS. AND I HAVE A LOT OF DRAWERS.', '%N... NOPE. TRY A FIGHTER, A BOSS... OR SOMETHING STRANGER.'],
  sealed: ['THAT ONE\'S SEALED - YOU GET THE FRONT PAGE, NOT THE GOOD BITS.', 'HALF OF THIS FILE IS STAMPED SHUT. BEAT %B AND ASK AGAIN!'],
  quiet: ['...OH. THAT FILE.', 'I\'LL GET IT. JUST... READ IT GENTLY.'],
  empty: ['YOUR BRIEFCASE IS EMPTY! ASK ME FOR A NAME AND WE\'LL FIX THAT.'],
  bell: ['YES, YES, I\'M RIGHT HERE!', 'DING DING! THAT\'S MY NAME. WELL, NO. BUT STILL.', 'YOU CAN JUST CLICK ME, YOU KNOW.', 'ONE MORE DING AND I\'M CHARGING YOU FOR THE BELL.'],
  lamp: ['THAT LAMP HAS BEEN ON SINCE THE STARFALL. I\'VE NEVER FOUND THE SWITCH.', 'GREEN GLASS. VERY CALMING. VERY... LIBRARIAN.'],
  tray: ['TODAY\'S REQUESTS. MOSTLY FROM MR WAKE. HE WANTS TO KNOW IF TEA IS A FIGHTER.', 'THAT\'S MY IN-TRAY. IT HAS NEVER ONCE BEEN EMPTY.'],
  pad: ['MY STAMP PAD! RED FOR "CLASSIFIED", RED FOR "APPROVED". I ONLY HAVE RED.'],
  case: ['THAT\'S YOUR BRIEFCASE. EVERYTHING I\'VE GIVEN YOU IS IN THERE.'],
  hint: ['THE RADIO SAYS STRANGE THINGS AT NIGHT. SOMETHING THAT BUZZES. TRY ASKING ME ABOUT IT.', 'AN ARCADE GAME FROM 1981 THAT NOBODY CAN PROVE EXISTED. I HAVE ITS FILE. NOT ITS NAME, THOUGH. YOU NEED THAT.', 'SOME PUZZLES COME WITH A BUG ON THEM. A SINGING ONE. AND A NUMBER.', 'SOMEONE ONCE CIRCLED SIX CHARACTERS IN RED AND WROTE ONE WORD NEXT TO IT. GUESS THE WORD.', 'DON\'T ASK ME ABOUT THE THING IN THE CORNER. ...THE THING WITH LONG FINGERS. DON\'T.', 'PSST. SOME FILES AREN\'T IN MY BINS. SOME ARE BEHIND YELLOW WALLPAPER THAT GOES ON FOREVER.', 'NOBODY EVER ASKS ABOUT ME. JUST SAYING. NOBODY.', 'TRY A NIGHT INSTEAD OF A NAME. A STAR FELL ON IT.', 'THE BOSSES HAVE FILES TOO - BUT THE GOOD PAGES ONLY UNSEAL ONCE YOU\'VE BEATEN THEM.', 'THE SHOPKEEPER? OH, I HAVE A FILE. HE HAS A FILE ON ME TOO, I BET.'],
  idle: ['...', 'HM HM HMM...', 'WHERE DID I PUT THE GNASH FILE... OH, IT\'S CHEWED.', 'I COUNTED THE DRAWERS ONCE. I GOT A DIFFERENT NUMBER THE NEXT DAY.'],
  busy: ['ONE SEC!', 'COMING!', 'JUST A MOMENT!', 'HOLD THAT THOUGHT!', 'BE RIGHT WITH YOU!', 'TWO SECONDS!'],
  cocoa: ['COCOA BREAK! BACK IN A JIFFY.', 'TIME FOR A CUP. EXTRA MARSHMALLOWS. DON\'T JUDGE.', 'OOH, IS IT COCOA O\'CLOCK? IT\'S ALWAYS COCOA O\'CLOCK.'],
  sip: ['MMMM.', 'AAAH. PERFECT.', 'THAT\'S THE GOOD STUFF.', 'MARSHMALLOW MOUSTACHE. AGAIN.'],
  tape: ['OOP - TAPE\'S DONE. NEW ONE!', 'SIDE B? NO. NEW TAPE.', 'HOLD ON, THE MUSIC STOPPED. CAN\'T FILE IN SILENCE.'],
  tapeOn: ['THERE WE GO!', 'OOH, THIS ONE\'S A BOP.', 'MUSIC MAKES THE DRAWERS OPEN EASIER. FACT.'],
  rolodex: ['MY ROLODEX! EVERY CARD IS A FIGHTER. A FEW ARE JUST DOODLES OF CATS.', 'SPIN IT. GO ON. ...SEE? CATS.'],
  pencils: ['SHARPENED THIS MORNING. I SHARPEN THEM EVERY MORNING. I DON\'T USE THEM.', 'THE RED ONE IS FOR CIRCLING THINGS THAT GO WOW.'],
  plant: ['THAT\'S GERALD. GERALD HAS SEEN THINGS.', 'I WATER GERALD ON TUESDAYS. HE PREFERS COCOA.'],
  boombox: ['MY BOOMBOX! THE STICKERS CAME WITH IT. THE STAR ONE IS MINE.', 'WANT A DIFFERENT TAPE? ...FINE, FINE.'],
  machine: ['THE COCOA MACHINE. STAFF ONLY. YOU\'RE NOT STAFF. ...YET.', 'IT GOES BLURP. I LOVE WHEN IT GOES BLURP.'],
  bye: ['COME BACK SOON! THE FILES MISS YOU.', 'MIND THE STEP! THERE ISN\'T ONE, BUT MIND IT ANYWAY.', 'TOODLE-OO!'],
};

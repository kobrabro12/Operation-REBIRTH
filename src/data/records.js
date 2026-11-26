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
  hint: ['PSST. SOME FILES AREN\'T IN MY BINS. SOME ARE BEHIND YELLOW WALLPAPER THAT GOES ON FOREVER.', 'NOBODY EVER ASKS ABOUT ME. JUST SAYING. NOBODY.', 'TRY A NIGHT INSTEAD OF A NAME. A STAR FELL ON IT.', 'THE BOSSES HAVE FILES TOO - BUT THE GOOD PAGES ONLY UNSEAL ONCE YOU\'VE BEATEN THEM.', 'THE SHOPKEEPER? OH, I HAVE A FILE. HE HAS A FILE ON ME TOO, I BET.'],
  idle: ['...', 'HM HM HMM...', 'WHERE DID I PUT THE GNASH FILE... OH, IT\'S CHEWED.', 'I COUNTED THE DRAWERS ONCE. I GOT A DIFFERENT NUMBER THE NEXT DAY.'],
  bye: ['COME BACK SOON! THE FILES MISS YOU.', 'MIND THE STEP! THERE ISN\'T ONE, BUT MIND IT ANYWAY.', 'TOODLE-OO!'],
};

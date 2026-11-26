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
  nu: ['NU'], aero: ['AERO', 'GOLDFISH'], gnash: ['GNASH'], lumen: ['LUMEN', 'HEARTSHARD', 'THESTAR'], moth: ['MADAMEMOTH', 'MOTH', 'FORTUNETELLER'], kami: ['KAMI', 'PAPER', 'ORIGAMI'],
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
  // THE FIVE LEGENDS: famous video game urban legends (told as history; no game's art is shown), each with its own scene
  { id: 'x-herobrine', names: ['HEROBRINE'], name: 'HEROBRINE', tab: 'HEROBRINE', anim: 'mine', fx: 'herobrine',
    kind: 'SECRET FILE - VIDEO GAME LEGEND', from: 'DUG OUT OF A WORLD THAT WAS SUPPOSED TO BE EMPTY',
    say: ['HEROBRINE? HOLD ON, THAT FILE\'S... BURIED. LITERALLY.', 'I\'LL NEED A PICK.'], after: '...THE CORNER HAD EYES. WHITE ONES. HERE, TAKE THIS AND LET\'S NEVER DIG AGAIN.',
    text: `HEROBRINE: THE PLAYER WHO WASN'T THERE.

THE STORY. In 2010, on the forums of a block-building game that was barely a year old, someone posted a story. They were playing alone, in a world they had made themselves, when they saw another player in the fog: the same plain default character everyone starts with - except the eyes were blank white, no pupils at all. It stared, then walked away into the trees. Later they found things nobody had built: two-by-two tunnels cut through the hills, little pyramids of sand in the sea, trees with their leaves stripped off.

When they asked on the forums, the story goes, the thread was deleted within minutes, and a private message arrived with one word: STOP. Someone said the figure was the game maker's dead brother. That part was never true; the developer has said many times that he never had a brother, and that nothing like it was ever in the game.

THE LIVESTREAM. Weeks later, a video stream "caught" the figure on camera - and the people who made it soon admitted it was staged, with a doctored picture. It didn't matter. By then everybody knew the name.

THE JOKE THAT KEPT IT ALIVE. For years afterwards, the official patch notes for the game ended, again and again, with the same line: REMOVED HEROBRINE. They were removing something that had never existed, on purpose, every update. That is how you make a legend live forever: deny it every time.

THE ARCHIVE'S PART. On the night of the Starfall a shard fell into a world made of blocks. The next morning, one of my drawers had been dug out from the inside - a neat two-by-two tunnel through the back of it, and a single block of sand on top of the paperwork. I've filed the sand. I keep the drawer shut. Sometimes the pick I used is not where I left it.` },
  { id: 'x-killswitch', names: ['KILLSWITCH', 'KARVINA', 'PORPHYRA'], name: 'KILLSWITCH', tab: 'KILLSWITCH', anim: 'handheld', fx: 'killswitch',
    kind: 'SECRET FILE - VIDEO GAME LEGEND', from: 'ONE PLAY ONLY. THIS COPY HAS BEEN PLAYED.',
    say: ['KILLSWITCH! OOH. I HAVE A COPY. I THINK. LET ME... CHECK IF IT STILL WORKS.', 'IT ONLY WORKS ONCE, SO NOBODY TALK.'], after: '...AND THAT\'S WHY I DON\'T HAVE A COPY ANY MORE. HERE\'S THE FILE ON IT, AT LEAST.',
    text: `KILLSWITCH: THE GAME THAT ERASED ITSELF.

THE STORY. Around 2005 a story began going round the internet about a computer game from 1989, made by a company called the Karvina Corporation, somewhere in what was then Czechoslovakia. It was a survival horror game before there was such a thing. You chose to play as one of two characters: a girl called Porphyra, who was invisible, or a demon called Ghast. You wandered dark mines. You never saw yourself.

THE CATCH. When you finished the game - and the story was very clear about this - it deleted itself. Every file. No second play, no saves, no proof. Five thousand copies were made, it was said, and every one of them ate itself the moment it was beaten.

THE AUCTION. Decades later, the story went, a sealed copy turned up for sale online and was bought for an enormous sum by a man in Japan, who promised he would film himself playing it so the world could finally see it. The video never appeared. All that came out, people said, was a short clip of a man crying in front of a computer.

WHAT IT REALLY WAS. None of it can be found: not the company, not the game, not the auction. Its likeliest origin is a work of fiction - a short story told well enough, with just enough detail, that thousands of people went looking for something that was never there. In a way, it is the perfect lost game: one that cannot be found because it was designed never to be kept.

THE ARCHIVE'S PART. After the Starfall, a little grey handheld turned up in my lost-and-found, with one cartridge in it. I played it on a slow afternoon. I remember a mine. I remember not being able to see my own hands. I remember finishing it. Then the screen said DELETING and went black, and it has been black ever since. I cannot remember who I played as. I keep checking my hands.` },
  { id: 'x-lavender', names: ['LAVENDER', 'LAVENDERTOWN', 'LAVENDERTOWNSYNDROME'], name: 'LAVENDER TOWN SYNDROME', tab: 'LAVENDER', anim: 'ears', fx: 'lavender',
    kind: 'SECRET FILE - VIDEO GAME LEGEND', from: 'FILED WITH THE VOLUME TURNED ALL THE WAY DOWN',
    say: ['OH, NOT THAT TUNE. NOT THAT TUNE.', 'IT\'S STUCK IN THE FILE. I CAN HEAR IT FROM HERE.'], after: '...IS IT STILL PLAYING? IT\'S STILL PLAYING IN MY HEAD. TAKE THE FILE. HUM SOMETHING ELSE.',
    text: `LAVENDER TOWN SYNDROME: THE SONG THAT MADE CHILDREN SICK.

THE STORY. Around 2010 a creepypasta spread online about a monster-catching game released in Japan in 1996. Partway through, players reach a sad little town of graves and a haunted tower, with its own music: a thin, high, looping melody that never quite settles. The story claimed that in the first months after release, dozens of children who played that part of the game fell ill - headaches, nosebleeds, nightmares, worse - and that the cause was hidden in the music: tones so high that only children's ears could hear them. The game was quietly changed, it said, and the whole thing covered up.

THE PROOF. There isn't any. No news reports, no doctors, no hospital records from that time mention it. People have pulled the song apart note by note and found nothing hidden in it - just a very good piece of spooky music made with very few notes. The "syndrome" seems to have been mixed together from a real event a year later, when an episode of a cartoon based on the same games really did make some viewers ill with a flashing light effect, and a long-standing fondness online for frightening stories about childhood games.

WHY IT STUCK. Because the song really is unsettling. Anyone who played it remembers the town, the graves, the tower, and those high notes going round and round. The legend gave that feeling a reason.

THE ARCHIVE'S PART. On the night of the Starfall, every music box in the Sanctum played the same eight notes at once, high and thin, then stopped. Nobody in the office could hum it afterwards. Nobody could forget it either. I keep this file in the quietest drawer. I still hear it when the lamp flickers.` },
  { id: 'x-truck', names: ['TRUCK', 'MEWTRUCK', 'MEWUNDERTHETRUCK', 'THETRUCK'], name: 'THE TRUCK', tab: 'THE TRUCK', anim: 'push', fx: 'truck',
    kind: 'SECRET FILE - VIDEO GAME LEGEND', from: 'FOUND UNDER SOMETHING VERY HEAVY',
    say: ['THE TRUCK! EVERYBODY ASKS ABOUT THE TRUCK.', 'THE FILE\'S UNDER IT. OBVIOUSLY. HOLD ON, LET ME JUST... PUSH...'], after: 'IT WOULDN\'T BUDGE. IT NEVER BUDGES. I SLID THE FILE OUT FROM UNDER IT ANYWAY. DON\'T TELL THE TRUCK.',
    text: `THE TRUCK: WHAT'S UNDERNEATH?

THE STORY. In the 1990s, in the first monster-catching games on a little grey handheld, there was a harbour city with a big cruise ship docked in it. Board the ship and leave at just the right moment - which the game never wanted you to do - and you could reach a strip of dock that was normally closed off once the ship sailed. On it sat a lone pickup truck. It did nothing. You could not drive it, talk to it, or search it.

THE RUMOUR. Nothing that strange could be there for no reason. So, in playgrounds before the internet was everywhere, the story spread: if you used the strength move to push the truck aside, the rarest monster of all - a tiny pink one that you could only otherwise get at special events - was hiding underneath. Some said you had to beat the whole game first. Some said you had to do it on a certain day. Everybody's cousin had done it.

THE TRUTH. It was just a truck. The game's makers said so, people combed through the game's code and found nothing tied to it, and it cannot be pushed. But the rumour was so famous that, years later, when the games were remade, the makers put a little gift underneath the truck - not the pink one, but a nod to everyone who had pushed for a whole summer.

THE ARCHIVE'S PART. The day after the Starfall, a small white toy truck was sitting on my counter. I didn't put it there. It cannot be moved - not by hand, not by crowbar, not by FISTS, who tried for an afternoon. Every so often, just at the edge of the lamp's light, I swear I see something pink and curious peek out from under it, and duck back.` },
  { id: 'x-bigfoot', names: ['BIGFOOT', 'SASQUATCH', 'CHILIAD', 'MOUNTCHILIAD'], name: 'BIGFOOT IN THE WOODS', tab: 'BIGFOOT', anim: 'binoculars', fx: 'bigfoot',
    kind: 'SECRET FILE - VIDEO GAME LEGEND', from: 'SIGHTED THROUGH THE FOG, ONCE',
    say: ['BIGFOOT? HE\'S NOT IN THE BINS, HE\'S IN THE WOODS.', 'BINOCULARS! EVERYONE BE VERY QUIET.'], after: 'I SAW HIM. I DEFINITELY SAW HIM. ...I DIDN\'T GET A PHOTO. NOBODY EVER GETS A PHOTO.',
    text: `BIGFOOT IN THE WOODS: THE HUNT THAT NEVER ENDED.

THE STORY. In 2004 a huge open-world crime game came out with a whole state to wander: cities, deserts, and in the countryside, thick forests on a big mountain, often lost in fog. Almost at once, people on gaming forums started saying they'd seen something in those woods. Big. Hairy. Walking upright between the trees at night, then gone. Bigfoot.

THE HUNT. Thousands of players spent thousands of hours combing the forest. They posted blurry screenshots, maps of "sightings", theories about the time of day, the weather, the phase of the in-game moon. There were famous fakes made with mods, and even more famous arguments about which fakes were fakes. Fan sites ran whole sections on it. The game's makers never said yes, and never quite said no.

THE TRUTH. As far as anyone who has taken the game's files apart can tell, there is no Bigfoot. There is fog, and dark trees, and a sound engine that loves a creaking branch, and a very big world on a very small screen where your eyes will make a shape out of anything. The legend was so loved that later games by the same makers started hiding their own nods to it - footprints, odd noises, a costume or two - as if to say: keep looking.

THE ARCHIVE'S PART. There is a painted forest on the far wall of the back room, behind the confidential drawers. Nobody painted it. On foggy evenings I stand at the doorway with binoculars. I've seen him twice. Both times he was walking away, and both times he stopped, turned his head - and waved.` },
  // THE BACK ROOM: three CONFIDENTIAL files about the game's deepest lore. She opens a door out of nowhere, walks into
  // the back room behind the office, comes back with the file and snaps the door away.
  { id: 'x-c001', names: ['FILE001', 'FILE1', 'THEFIRSTSTAR', 'FIRSTSTAR', 'C001'], name: 'CONFIDENTIAL 001: THE FIRST STAR', tab: 'FILE 001', anim: 'door', confidential: true,
    kind: 'CONFIDENTIAL - EYES ONLY', from: 'THE BACK ROOM. DRAWER ONE. NO COPIES.',
    say: ['...FILE 001. WHO TOLD YOU ABOUT FILE 001?', 'THAT ONE ISN\'T OUT HERE. IT\'S IN THE BACK ROOM. WAIT HERE. DON\'T TOUCH ANYTHING.'], after: 'YOU DIDN\'T GET THIS FROM ME.',
    text: `CONFIDENTIAL 001 - THE FIRST STAR.
WHAT THE ARCHIVE KNOWS AND DOES NOT TELL.

1. The purple star that broke over the Sky Sanctum at eleven minutes past midnight was not the first star VESPERION chased. It was the last one he had not caught. Every other light in its sky had already been swallowed. It ran because it was alone.

2. It did not break by accident. Our instruments - such as they were - recorded it slowing down over the Sanctum, as if it had chosen the place. It broke itself on purpose, into as many pieces as there were things that needed bringing back, so that he could never swallow all of it at once.

3. Every shard carries a part of what the star remembered. The fighters dream things that are not theirs: oceans of light, a long fall, being chased. They think it is their own past. Some of it is. Some of it is the star's.

4. OPERATION REBIRTH is not, as the public notes say, an effort to rebuild the star from its shards. It is an effort to rebuild it from its shards *before he finds them*. Every fight rings the shards together. Every ring is louder. He can hear it too.

5. When enough shards ring at once, the star will be whole again. We do not know what it will be. We do not know if it will remember us. We do not know if it will want to.

6. I have one shard of my own. I was holding a pen when it found me. I have never told anyone where I keep it, and I never will, and I would like you to stop looking at my hat.` },
  { id: 'x-c002', names: ['FILE002', 'FILE2', 'RHOLLOWAY', 'ROBERTHOLLOWAY', 'C002', 'THEMAKER'], name: 'CONFIDENTIAL 002: THE MAKER', tab: 'FILE 002', anim: 'door', confidential: true,
    kind: 'CONFIDENTIAL - EYES ONLY', from: 'THE BACK ROOM. DRAWER TWO. HANDLE WITH CARE.',
    say: ['FILE 002 IS... NOT A HAPPY FILE.', 'IT\'S IN THE BACK ROOM. I\'LL GET IT. GENTLY.'], after: 'BE KIND TO IT.',
    text: `CONFIDENTIAL 002 - THE MAKER.
ON R. HOLLOWAY, WHO MADE A LITTLE GAME ABOUT A RABBIT.

1. R. Holloway was a programmer at a tiny company called Sunnyside Soft, who made one game in 1994: a cheerful platformer about a rabbit in a land of hills. He made it for his daughter, Cassie, and put her ideas in it - the ? blocks were her idea, so was the rabbit's waving, so were the friends.

2. On October 14, 1994 - the night of the Starfall in that world - a shard fell into the house. In the morning the cartridge was still in the console. The game was still running. Cassie was not in her room. The rabbit on the screen was standing very still, looking out.

3. Holloway never released the game. He spent the rest of his life trying to get into it: rewriting it, debugging it, building tools to read every byte while it ran. His notes are in this drawer. Most of them are calm and careful. The last ones are just her name.

4. The tapes found later - the LOST BUILD - are his. The things the rabbit says on them are not things he wrote.

5. We do not know where Cassie is. The archive's best guess, filed reluctantly: the shard that fell that night wanted to bring someone back, and found a game that a father had built for his daughter, and could not tell the difference between the girl and the game. It has been trying to keep her ever since. HOPPLE is not the villain of this file. HOPPLE is what happens when a friend is told never to let go.

6. If the star is ever whole again, I intend to ask it for one thing. This file is why.` },
  { id: 'x-c003', names: ['FILE003', 'FILE3', 'THIRTEENTHHOUR', 'THETHIRTEENTHHOUR', 'C003', '1300'], name: 'CONFIDENTIAL 003: THE THIRTEENTH HOUR', tab: 'FILE 003', anim: 'door', confidential: true,
    kind: 'CONFIDENTIAL - EYES ONLY', from: 'THE BACK ROOM. DRAWER THREE. THE CLOCK IN THIS DRAWER IS WRONG.',
    say: ['FILE 003? YOU\'VE BEEN TALKING TO THE SHOPKEEPER.', 'FINE. THE BACK ROOM IT IS. IF THE CLOCK STRIKES WHILE I\'M IN THERE, START WITHOUT ME.'], after: 'HE DOESN\'T KNOW I HAVE THIS. LET\'S KEEP IT THAT WAY.',
    text: `CONFIDENTIAL 003 - THE THIRTEENTH HOUR.
ON THE SHOP, THE MAN WITH TWO FACES, AND THE TIME BETWEEN TIMES.

1. Every world the star fell on has twelve hours on its clocks. The shop has thirteen. The thirteenth hour is where things go when they are not anywhere - lost coins, forgotten songs, unworn costumes, the last minute before you fall asleep. HANZ and $@L sell from it. That is why everything in the shop is something you almost had.

2. HANZ and $@L were one man before the Starfall. A shard of the purple star hit him straight on and split him in two along the line of his face. The red half kept the hunger. The grey half kept the memory. Neither can remember which one was him.

3. Their faces are on the Masked King's crown. They traded them for the shop - so they could keep it open at thirteen o'clock, forever, and never have to go back to twelve. That is why there is nothing under the mask. Nothing at all.

4. MEMORIES, the shop's money, are exactly what the name says. The coins you spend there are moments you didn't need. He keeps them in the till. He never says where the till goes at night.

5. VESPERION cannot see into the thirteenth hour. It is the only place in any world that he cannot swallow. If the star is ever re-formed, the archive's plan - this file's real secret - is to hide it there, behind the counter, between the hourglass and the candle, until he gives up.

6. The shopkeeper has not agreed to this. He does not know he has been asked. The clock in this drawer is always thirteen minutes fast. I have never managed to fix it.` },
  { id: 'x-confidential', names: ['CONFIDENTIAL', 'BACKROOM', 'THEBACKROOM', 'CLASSIFIED', 'TOPSECRET', 'EYESONLY'], refuse: true, hintOnly: true,
    say: ['THE BACK ROOM? THERE ARE ONLY THREE FILES IN THE BACK ROOM.', 'ASK ME FOR THEM BY NUMBER: FILE 001, FILE 002, FILE 003. ...I DIDN\'T SAY THAT.'] },
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
/** A secret's file (or, for `refuse`, just what she says). */
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
  hint: ['THERE\'S A DOOR TO THE BACK ROOM. YOU CAN\'T SEE IT. ASK ME ABOUT SOMETHING CONFIDENTIAL.', 'SOME GAMES HAVE GHOSTS WITH WHITE EYES. SOME HAVE A TRUCK NOBODY CAN MOVE. ASK ME ABOUT EITHER.', 'THERE\'S A GAME THAT DELETES ITSELF WHEN YOU WIN. AND A SONG THAT MAKES YOU DIZZY. AND A BIG HAIRY FELLA IN THE WOODS.', 'THE RADIO SAYS STRANGE THINGS AT NIGHT. SOMETHING THAT BUZZES. TRY ASKING ME ABOUT IT.', 'AN ARCADE GAME FROM 1981 THAT NOBODY CAN PROVE EXISTED. I HAVE ITS FILE. NOT ITS NAME, THOUGH. YOU NEED THAT.', 'SOME PUZZLES COME WITH A BUG ON THEM. A SINGING ONE. AND A NUMBER.', 'SOMEONE ONCE CIRCLED SIX CHARACTERS IN RED AND WROTE ONE WORD NEXT TO IT. GUESS THE WORD.', 'DON\'T ASK ME ABOUT THE THING IN THE CORNER. ...THE THING WITH LONG FINGERS. DON\'T.', 'PSST. SOME FILES AREN\'T IN MY BINS. SOME ARE BEHIND YELLOW WALLPAPER THAT GOES ON FOREVER.', 'NOBODY EVER ASKS ABOUT ME. JUST SAYING. NOBODY.', 'TRY A NIGHT INSTEAD OF A NAME. A STAR FELL ON IT.', 'THE BOSSES HAVE FILES TOO - BUT THE GOOD PAGES ONLY UNSEAL ONCE YOU\'VE BEATEN THEM.', 'THE SHOPKEEPER? OH, I HAVE A FILE. HE HAS A FILE ON ME TOO, I BET.'],
  idle: ['...', 'HM HM HMM...', 'WHERE DID I PUT THE GNASH FILE... OH, IT\'S CHEWED.', 'I COUNTED THE DRAWERS ONCE. I GOT A DIFFERENT NUMBER THE NEXT DAY.'],
  backroom: ['...', '*RUSTLE RUSTLE*', '*A DRAWER SLAMS*', 'FOUND IT!'],
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

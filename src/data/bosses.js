// BOSS FIGHTS (Trinkets > BOSS FIGHTS, src/scenes/BossFightsScene.js): the bosses, each in its own arena with
// its own hazards, each harder than the last (all open from the start - pick any), and each
// on three difficulties. The higher the difficulty, the bigger the rewards (src/scenes/BossRewardScene.js shows
// them). The bosses themselves live in their arenas: src/stage/bossBase.js + steamBossStage.js / polyBossStage.js /
// demonBossStage.js / knightBossStage.js / machineBossStage.js / humBossStage.js / smudgeBossStage.js /
// jackpotBossStage.js / maestroBossStage.js.
import { addCoins } from '../progress.js';
import { recordBoss } from '../achievements.js';

// The difficulties. stocks = your lives; hp / dmg = the boss's health and how hard it hits (x its own numbers);
// speed = how fast it attacks (shorter pauses, quicker wind-ups); coins = x the boss's coins.
export const TIERS = [
  { name: 'NORMAL', color: 0x5ad86a, stocks: 3, hp: 1.0, dmg: 1.0, speed: 1.0, coins: 1 },
  { name: 'HARD', color: 0xffa83a, stocks: 2, hp: 1.35, dmg: 1.25, speed: 1.25, coins: 2.5 },
  { name: 'NIGHTMARE', color: 0xff3a5a, stocks: 1, hp: 1.75, dmg: 1.5, speed: 1.5, coins: 5 },
];
// a repeat win pays this much of the coins (the first win on each difficulty pays them in full, and a bonus)
export const REPEAT_PAY = 0.4;
// the first win on a difficulty pays this much extra
export const FIRST_BONUS = 1.0;

// The bosses, easiest first. hp = health on NORMAL; coins = what a NORMAL win pays; stage = its arena (stages.js);
// trophy = the TROPHY HALL trophy for beating it on NIGHTMARE (TROPHY_GOALS in achievements.js).
export const BOSSES = [
  { id: 'colossus', name: 'THE CLOCKWORK COLOSSUS', short: 'THE COLOSSUS', title: 'THE CLOCKWORK GUARDIAN OF THE FOUNDRY', stage: 'brass-foundry', arena: 'BRASS FOUNDRY', hp: 300, coins: 120, color: 0xe0a040, trophy: 'brass-heart',
    blurb: 'A STEAM-DRIVEN GIANT OF BRASS AND RIVETS,\nBUILT TO GUARD THE FOUNDRY. ITS FURNACE\nHEART OVERHEATS - THAT IS WHEN IT BREAKS.',
    taunts: ['TICK. TOCK. YOUR TIME IS UP.', 'MAINTENANCE COMPLETE. PEST REMOVED.', 'YOU WERE NEVER BUILT FOR THIS.'],
    // the death card when you lose (src/ui/deathCard.js): its quote by the form it was in when it beat you, and the phase marks on the progress line ([fraction of the fight, name])
    card: { marks: [[0.5, 'OVERDRIVE'], [0.75, 'CORE BROKEN']], quotes: { base: 'TICK... TOCK. I WAS WOUND BEFORE YOUR GRANDFATHER WAS BORN. I WILL BE TICKING LONG AFTER YOU.', rage: 'PRESSURE RISING. TEMPERATURE RISING. YOUR CHANCES? FALLING.', broken: 'CRACKED, LEAKING, HALF MY GEARS ON THE FLOOR... AND STILL I OUTLASTED YOU.', gotcha: 'NOW I\'VE GOTCHA. NEXT TIME, MIND THE CLOCK.' } },
    hazards: 'PIPE BURSTS / CRANE DROPS' },
  { id: 'polygon', name: 'KING POLYGON', short: 'KING POLYGON', title: 'RULER OF THE 64-BIT SKY', stage: 'polygon-peak', arena: 'POLYGON PEAK', hp: 360, coins: 180, color: 0x5ad8ff, trophy: 'golden-cartridge',
    blurb: 'THE LOW-POLY RULER OF A 64-BIT SKY, A\nCROWNED HEAD AND TWO GIANT HANDS. HIT\nTHE HEAD. NEAR THE END, HE BATS IT AT YOU.',
    taunts: ['GAME OVER! INSERT ANOTHER CHALLENGER!', 'NOT EVEN ONE FRAME OF RESISTANCE.', 'TOO FEW POLYGONS. TOO MUCH CONFIDENCE.'],
    // the death card when you lose (src/ui/deathCard.js): its quote by the form it was in when it beat you, and the phase marks on the progress line ([fraction of the fight, name])
    card: { marks: [[0.5, 'OVERCLOCKED'], [0.7, 'BATTER UP']], quotes: { base: 'EVERY KING NEEDS A SUBJECT TO STEP ON. THANK YOU FOR VOLUNTEERING.', rage: 'MY POLYGONS ARE SHARP. MY FRAMERATE IS SHARPER. YOU? NEITHER.', low: 'STRIKE THREE. YOU\'RE OUT. THE CROWD GOES... NOWHERE. IT IS JUST ME.', legend: 'A LEGEND NEEDS A STORY. YOURS ENDS HERE - IN 64 GLORIOUS BITS.' } },
    hazards: 'PYLON ZAPS / QUAKE RINGS' },
  { id: 'demon', name: 'KARNAX, THE MAD BLADE', short: 'KARNAX', title: 'THE MAD BLADE', stage: 'burning-keep', arena: 'THE BURNING KEEP', hp: 430, coins: 260, color: 0xff3a2a, trophy: 'mad-blade',
    blurb: 'A HORNED DEMON WITH A GRIN TOO WIDE AND\nA SWORD TOO BIG, LAUGHING AS THE KEEP\nBURNS. AT HALF HEALTH HE GOES MAD.',
    taunts: ['HA! HA HA! IS THAT ALL?!', 'COME BACK! I WAS JUST STARTING TO HAVE FUN!', 'YOUR SCREAMS ARE MUSIC, LITTLE ONE.'],
    // the death card when you lose (src/ui/deathCard.js): its quote by the form it was in when it beat you, and the phase marks on the progress line ([fraction of the fight, name])
    card: { marks: [[0.5, 'MAD']], quotes: { base: 'HA! I HAVEN\'T EVEN DRAWN BLOOD YET - AND YOU\'RE ALREADY ON THE FLOOR!', rage: 'THE MADNESS SANG AND YOU DANCED SO BADLY. HA! HA HA HA!' } },
    hazards: 'CATAPULT STONES / BRAZIER FLARES' },
  { id: 'knight', name: 'THORNWARD, THE ROOTBOUND KNIGHT', short: 'THORNWARD', title: 'GUARDIAN OF THE ELDER GROVE', stage: 'elder-grove', arena: 'THE ELDER GROVE', hp: 480, coins: 340, color: 0x6ae060, trophy: 'verdant-helm',
    blurb: 'A HOLLOW KNIGHT BOUND BY ROOTS. HIS ARMOUR\nCAN\'T BE HURT - HIT HIS SOUL WHEN IT COMES\nOUT TO TAUNT YOU. BELOW 25% HE GOES BERSERK.',
    taunts: ['NYAH! TOO SLOW! TOO SLOW!', 'THE ROOTS WILL KEEP YOU NOW.', 'HEHEHE - BETTER LUCK NEXT SEASON!'],
    // the death card when you lose (src/ui/deathCard.js): its quote by the form it was in when it beat you, and the phase marks on the progress line ([fraction of the fight, name])
    card: { marks: [[0.75, 'BERSERK']], quotes: { base: 'NYAH! YOU HIT THE ARMOUR AGAIN, DIDN\'T YOU? EVERYBODY HITS THE ARMOUR.', rage: 'THE HELM IS OPEN AND STILL YOU COULDN\'T CATCH ME. THE GROVE KEEPS YOU NOW.' } },
    hazards: 'THORN ROOTS / SPORE BURSTS' },
  { id: 'machine', name: 'BEIGE.EXE, THE OLD MACHINE', short: 'BEIGE.EXE', title: 'THE COMPUTER THAT WILL NOT SHUT DOWN', stage: 'desktop', arena: 'THE DESKTOP', hp: 640, coins: 420, color: 0x30c8b0, trophy: 'golden-floppy',
    blurb: 'A SNOBBY 90S COMPUTER THAT NEVER SHUT\nDOWN. MIND ITS PAINT SLUDGE AND ITS CDS.\nHIT ITS SCREEN - HARDEST WHEN IT FREEZES.',
    taunts: ['PLAYER HAS PERFORMED AN ILLEGAL OPERATION AND WILL BE SHUT DOWN.', 'ARE YOU SURE YOU WANT TO QUIT?  ...TOO LATE.', 'PRESS ANY KEY TO CONTINUE LOSING.'],
    // the death card when you lose (src/ui/deathCard.js): its quote by the form it was in when it beat you, and the phase marks on the progress line ([fraction of the fight, name])
    card: { marks: [[0.5, 'FATAL EXCEPTION'], [0.65, 'MUSIC TRAY']], quotes: { base: 'YOUR PROGRAM HAS STOPPED RESPONDING. HOW... PRIMITIVE.', rage: 'A BLUE SCREEN IS A BADGE OF HONOUR. YOU HAVE NO SCREEN AT ALL.', low: 'I PLAYED YOU OUT WITH MY FAVOURITE TRACK. IT WAS ON SHUFFLE. YOU WERE NOT.' } },
    hazards: 'POP-UPS / DIAL-UP' },
  { id: 'hum', name: 'THE HUM, OCCUPANT OF LEVEL 0', short: 'THE HUM', title: 'IT LIVES IN THE BUZZING OF THE LIGHTS', stage: 'level-zero', arena: 'LEVEL 0', hp: 340, coins: 500, color: 0xe8d870, trophy: 'last-light',
    blurb: 'SOMETHING TALL LIVES IN THE YELLOW ROOMS.\nAFTER IT SURFACES, IT IS STUCK. HURT IT\nENOUGH AND IT GETS HUNGRY.',
    taunts: ['...', 'YOU NOCLIPPED INTO THE WRONG ROOM.', 'STAY. THE LIGHTS ARE ALWAYS ON HERE.'],
    // the death card when you lose (src/ui/deathCard.js): its quote by the form it was in when it beat you, and the phase marks on the progress line ([fraction of the fight, name])
    card: { marks: [[0.5, 'LEVEL !'], [0.7, 'THE HUNGER']], quotes: { base: '...bzzzzz... ...stay... ...the lights are always on... ...bzzzz...', rage: 'THE LIGHTS WENT RED. YOU STAYED ANYWAY. EVERYONE STAYS.', feral: 'HUNGRY. HUNGRY. HUNGRY. ...FULL.' } },
    hazards: 'FLICKER / BURST PANELS' },
  { id: 'smudge', name: 'SMUDGE, THE LITTLE MASTER', short: 'SMUDGE', title: 'THE KID WHO REPAINTS THE WORLD', stage: 'blank-canvas', arena: 'THE BLANK CANVAS', hp: 680, coins: 560, color: 0xff2a6a, trophy: 'golden-brush',
    blurb: 'A NINE-YEAR-OLD ART PRODIGY WITH A BUCKET\nON HIS HEAD. EVERY FEW ATTACKS HE REPAINTS\nHIMSELF - AND THE WORLD - IN A NEW STYLE.',
    taunts: ['I\'M PUTTING YOU ON THE FRIDGE!', 'SIGNED: SMUDGE. AGE NINE. MASTERPIECE.', 'NEEDS MORE COLOUR. AND MORE WINNING.'],
    // the death card when you lose (src/ui/deathCard.js): its quote by the form it was in when it beat you, and the phase marks on the progress line ([fraction of the fight, name])
    card: { marks: [[0.5, 'MASTERPIECE MODE'], [0.7, 'ACTION PAINTING']], quotes: { sketch: 'YOU WERE JUST A ROUGH SKETCH ANYWAY. I\'LL ERASE YOU LATER.', pop: 'KA-POW! THAT\'S YOU! THAT SOUND WAS YOU LOSING!', cubist: 'I PAINTED YOU FROM EVERY SIDE AT ONCE. ALL OF THEM LOST.', starry: 'OOOH, PRETTY! YOU LOOK SO NICE ALL SWIRLY AND DEFEATED.', splatter: 'SPLAT! SPLAT! SPLAAAT! ...MOOOM, I MADE A MESS. IT\'S THEM.', artoff: 'NO FAIR! YOU\'RE GROWN-UP! ...WAIT, I WON?! THE REAL ARTIST IS ME!' } },
    tip: 'HIT HIM WHILE HE REPAINTS HIMSELF - WET PAINT TAKES MORE DAMAGE.',
    hazards: 'DRIPS / SPILLS' },
  { id: 'jackpot', name: 'MAX JACKPOT, YOUR HOST', short: 'MAX JACKPOT', title: 'THE HOST WITH THE MOST', stage: 'prime-time', arena: 'PRIME TIME', hp: 780, coins: 620, color: 0xffc83a, trophy: 'golden-mic',
    blurb: 'THE SMARMIEST HOST ON TELEVISION. EVERY\nFEW ATTACKS HE SPINS THE BIG WHEEL - AND\nIT PICKS THE NEXT ROUND. PRAY FOR BANKRUPT.',
    taunts: ['THANKS FOR PLAYING! YOU WIN... NOTHING!', 'TELL THEM WHAT THEY\'VE LOST, FOLKS!', 'SEE YOU AFTER THE BREAK... OH WAIT. YOU WON\'T.'],
    // the death card when you lose (src/ui/deathCard.js): its quote by the form it was in when it beat you, and the phase marks on the progress line ([fraction of the fight, name])
    card: { marks: [[0.5, 'SWEEPS WEEK'], [0.7, 'LIGHTNING ROUND']], quotes: { base: 'AND THAT\'S A WRAP! LET\'S HEAR IT FOR OUR CONTESTANT - CUE THE SAD TROMBONE!', gold: 'SWEEPS WEEK, BABY! RATINGS THROUGH THE ROOF - AND YOU THROUGH THE FLOOR!', low: 'LIGHTNING ROUND\'S OVER, CHAMP. THE ANSWER WAS: NOT YOU.' } },
    tip: 'WHEN THE WHEEL LANDS ON BANKRUPT, GO FOR HIS BALD HEAD - IT TAKES DOUBLE.',
    hazards: 'STAGE LAMPS / CONFETTI' },
  { id: 'maestro', name: 'THE PHANTOM MAESTRO', short: 'THE PHANTOM', title: 'HE HAUNTS THE GRAND OPERA', stage: 'grand-opera', arena: 'THE GRAND OPERA', hp: 430, coins: 700, color: 0xd03050, trophy: 'golden-baton',
    blurb: 'A MASKED GHOST IN A CRIMSON-LINED CAPE.\nHE DIVES FROM THE RAFTERS, THROWS ROSES\nTHAT STUN, VANISHES - AND PUNCHES.',
    taunts: ['THE CURTAIN FALLS. ON YOU.', 'BOX FIVE WILL ALWAYS BE MINE.', 'THE AUDIENCE DEMANDS AN ENCORE - OF YOUR DEFEAT!'],
    // the death card when you lose (src/ui/deathCard.js): its quote by the form it was in when it beat you, and the phase marks on the progress line ([fraction of the fight, name])
    card: { marks: [[0.5, 'THE MASK SLIPS'], [0.7, 'THE FINAL ACT']], quotes: { base: 'THE OPERA IS MINE. EVERY SEAT, EVERY SHADOW... AND NOW, YOU.', rage: 'YOU SAW MY FACE. NOW NO ONE WILL EVER SEE YOURS AGAIN.', low: 'A FINALE NEEDS A FALLEN HERO. HOW KIND OF YOU TO VOLUNTEER.' } },
    tip: 'WHEN HE SOARS OUT OF SIGHT, WATCH FOR THE RED MARK AND MOVE. WHEN HE WRAPS HIMSELF IN HIS CAPE, HE\'LL APPEAR BEHIND YOU. HIS MASK TAKES EXTRA DAMAGE.',
    hazards: 'SANDBAGS / TRAPDOOR SMOKE' },
];
/** The boss with this id (a BOSSES entry). */
export const bossById = (id) => BOSSES.find((b) => b.id === id);

// what you've beaten, saved in this browser: { [bossId]: { won: [n, n, n] (wins per difficulty), best: [frames...] } }
const KEY = 'rebirth.bosses';
let save = {};
try { save = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { save = {}; }
const store = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* storage unavailable */ } };
const rec = (id) => (save[id] = save[id] || { won: [0, 0, 0], best: [0, 0, 0] });

/** How many times a boss has been beaten on a difficulty (0 = never). */
export function bossWins(id, tier) { return (save[id] && save[id].won[tier]) || 0; }
/** The fastest win on a difficulty, in frames (0 = none yet). */
export function bossBest(id, tier) { return (save[id] && save[id].best[tier]) || 0; }
/** Whether a boss can be fought: every one is open from the start (they used to unlock in order). */
export function bossOpen(i) { return !!BOSSES[i]; }
/** Whether a boss's arena has been opened for ordinary matches (by beating the boss on HARD or NIGHTMARE). */
export function arenaOpen(bossId) { return bossWins(bossId, 1) + bossWins(bossId, 2) > 0; }

/**
 * Pays out a boss fight that was won and remembers it: coins (more for each difficulty; a first win pays in
 * full plus a bonus, a repeat less), on a first HARD/NIGHTMARE win the arena opens for ordinary matches, and a
 * NIGHTMARE win earns its trophy (via the trophy check in achievements.js - recordBoss). Returns the reward lines
 * for the reward screen: [{ text, coins?, kind }].
 */
export function claimBossRewards(id, tier, frames) {
  const B = bossById(id), T = TIERS[tier], r = rec(id), first = !r.won[tier], out = [];
  const arenaWasOpen = arenaOpen(id);
  const base = Math.round(B.coins * T.coins * (first ? 1 : REPEAT_PAY));
  out.push({ kind: 'coins', text: T.name + ' VICTORY', coins: base });
  if (first) out.push({ kind: 'coins', text: 'FIRST ' + T.name + ' WIN BONUS', coins: Math.round(B.coins * T.coins * FIRST_BONUS) });
  const fast = frames < 60 * 90;                                        // under a minute and a half
  if (fast) out.push({ kind: 'coins', text: 'SPEED KILL (UNDER 1:30)', coins: Math.round(B.coins * 0.25 * T.coins) });
  const newBest = !r.best[tier] || frames < r.best[tier];
  r.won[tier]++; if (newBest) r.best[tier] = frames;
  store();
  if (tier >= 1 && !arenaWasOpen) out.push({ kind: 'unlock', text: 'ARENA UNLOCKED: ' + B.arena + ' (PLAY IT IN VS)' });
  if (newBest && !first) out.push({ kind: 'record', text: 'NEW BEST TIME' });
  const pay = out.reduce((n, o) => n + (o.coins || 0), 0); addCoins(pay);
  recordBoss(id, tier);                                                 // (the NIGHTMARE trophies are checked from this)
  return out;
}
/** m:ss for a number of frames. */
export function clock(frames) { const s = Math.floor(frames / 60); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

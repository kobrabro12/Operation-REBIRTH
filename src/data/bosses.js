// BOSS FIGHTS (Trinkets > BOSS FIGHTS, src/scenes/BossFightsScene.js): the bosses, each in its own arena with
// its own hazards, each harder than the last (all open from the start - pick any), and each
// on three difficulties. The higher the difficulty, the bigger the rewards (src/scenes/BossRewardScene.js shows
// them). The bosses themselves live in their arenas: src/stage/bossBase.js + steamBossStage.js / polyBossStage.js /
// demonBossStage.js / knightBossStage.js / machineBossStage.js / smudgeBossStage.js /
// maestroBossStage.js.
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
    card: { marks: [[0.5, 'OVERDRIVE'], [0.8, 'CORE BROKEN']], quotes: { base: 'TICK... TOCK. I WAS WOUND BEFORE YOUR GRANDFATHER WAS BORN. I WILL BE TICKING LONG AFTER YOU.', rage: 'PRESSURE RISING. TEMPERATURE RISING. YOUR CHANCES? FALLING.', broken: 'CRACKED, LEAKING, HALF MY GEARS ON THE FLOOR... AND STILL I OUTLASTED YOU.', gotcha: 'NOW I\'VE GOTCHA. NEXT TIME, MIND THE CLOCK.' } },
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
    blurb: 'A SNOBBY 90S COMPUTER THAT NEVER SHUT\nDOWN. NEAR THE END IT DIALS UP AND GOES\nONLINE. HIT ITS SCREEN WHEN IT FREEZES.',
    taunts: ['PLAYER HAS PERFORMED AN ILLEGAL OPERATION AND WILL BE SHUT DOWN.', 'ARE YOU SURE YOU WANT TO QUIT?  ...TOO LATE.', 'PRESS ANY KEY TO CONTINUE LOSING.'],
    // the death card when you lose (src/ui/deathCard.js): its quote by the form it was in when it beat you, and the phase marks on the progress line ([fraction of the fight, name])
    card: { marks: [[0.5, 'FATAL EXCEPTION'], [0.65, 'MUSIC TRAY'], [0.8, 'ONLINE']], quotes: { online: 'YOU HAVE BEEN UNSUBSCRIBED. FROM LIFE.', base: 'YOUR PROGRAM HAS STOPPED RESPONDING. HOW... PRIMITIVE.', rage: 'A BLUE SCREEN IS A BADGE OF HONOUR. YOU HAVE NO SCREEN AT ALL.', low: 'I PLAYED YOU OUT WITH MY FAVOURITE TRACK. IT WAS ON SHUFFLE. YOU WERE NOT.' } },
    hazards: 'POP-UPS / DIAL-UP' },
  { id: 'smudge', name: 'SMUDGE, THE LITTLE MASTER', short: 'SMUDGE', title: 'THE KID WHO REPAINTS THE WORLD', stage: 'blank-canvas', arena: 'THE BLANK CANVAS', hp: 680, coins: 560, color: 0xff2a6a, trophy: 'golden-brush',
    blurb: 'A NINE-YEAR-OLD ART PRODIGY WITH A BUCKET\nON HIS HEAD. EVERY FEW ATTACKS HE REPAINTS\nHIMSELF - AND THE WORLD - IN A NEW STYLE.',
    taunts: ['I\'M PUTTING YOU ON THE FRIDGE!', 'SIGNED: SMUDGE. AGE NINE. MASTERPIECE.', 'NEEDS MORE COLOUR. AND MORE WINNING.'],
    // the death card when you lose (src/ui/deathCard.js): its quote by the form it was in when it beat you, and the phase marks on the progress line ([fraction of the fight, name])
    card: { marks: [[0.5, 'MASTERPIECE MODE'], [0.7, 'ACTION PAINTING']], quotes: { sketch: 'YOU WERE JUST A ROUGH SKETCH ANYWAY. I\'LL ERASE YOU LATER.', pop: 'KA-POW! THAT\'S YOU! THAT SOUND WAS YOU LOSING!', cubist: 'I PAINTED YOU FROM EVERY SIDE AT ONCE. ALL OF THEM LOST.', starry: 'OOOH, PRETTY! YOU LOOK SO NICE ALL SWIRLY AND DEFEATED.', splatter: 'SPLAT! SPLAT! SPLAAAT! ...MOOOM, I MADE A MESS. IT\'S THEM.', artoff: 'NO FAIR! YOU\'RE GROWN-UP! ...WAIT, I WON?! THE REAL ARTIST IS ME!' } },
    tip: 'HIT HIM WHILE HE REPAINTS HIMSELF - WET PAINT TAKES MORE DAMAGE.',
    hazards: 'DRIPS / SPILLS' },
  { id: 'maestro', name: 'THE PHANTOM MAESTRO', short: 'THE PHANTOM', title: 'HE HAUNTS THE GRAND OPERA', stage: 'grand-opera', arena: 'THE GRAND OPERA', hp: 480, coins: 700, color: 0xd03050, trophy: 'golden-baton',
    blurb: 'A MASKED GHOST WHO HAUNTS THE OPERA.\nHE SPLITS INTO ILLUSIONS, SINGS GHOST\nNOTES, CALLS HANDS UP FROM THE STAGE.',
    taunts: ['THE CURTAIN FALLS. ON YOU.', 'BOX FIVE WILL ALWAYS BE MINE.', 'THE AUDIENCE DEMANDS AN ENCORE - OF YOUR DEFEAT!'],
    // the death card when you lose (src/ui/deathCard.js): its quote by the form it was in when it beat you, and the phase marks on the progress line ([fraction of the fight, name])
    card: { marks: [[0.5, 'THE MASK SLIPS'], [0.7, 'THE FINAL ACT']], quotes: { base: 'THE OPERA IS MINE. EVERY SEAT, EVERY SHADOW... AND NOW, YOU.', rage: 'YOU SAW MY FACE. NOW NO ONE WILL EVER SEE YOURS AGAIN.', low: 'A FINALE NEEDS A FALLEN HERO. HOW KIND OF YOU TO VOLUNTEER.' } },
    tip: 'IN HIS MASQUERADE, ONLY THE REAL ONE WEARS A ROSE - HIT HIM AND THE ACT BREAKS. GHOST NOTES POP IF YOU HIT THEM. WHEN THE BOARDS GLOW BLUE, MOVE.',
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
// THE RESULTS' GRADE (BossReward after a win, in the spirit of old cartoon run-and-gun results screens): points for
// each line, out of 100 - the time against par (`par` seconds on NORMAL, longer as the boss gets tougher), lives kept,
// damage taken, weak-spot hits, Limits fired and the difficulty - then the letter
const GRADE = { par: 120, slow: 2.5, time: 25, lives: 25, hurt: 20, hurtPer: 12, weak: 10, limits: 5, perLimit: 2.5, skill: [3, 8, 15] };
// the letters (best first) and the score each needs; S only on NIGHTMARE without losing a life
const LETTERS = [['S', 94], ['A+', 88], ['A', 80], ['A-', 74], ['B+', 68], ['B', 60], ['B-', 54], ['C+', 48], ['C', 40], ['C-', 34], ['D+', 28], ['D', 20], ['D-', 0]];
/**
 * Grades a won boss fight (R = BossReward's data.boss). Returns { grade, score, rows } - rows are the results lines:
 * { label, value (the text), have, max (for counting up), pts }.
 */
export function bossGrade(R) {
  const T = TIERS[R.tier], par = GRADE.par * T.hp * 60, lives = (R.lives || 0) + (R.falls || 0) || 1, kept = Math.max(0, lives - (R.falls || 0));
  const tPts = R.time <= par ? GRADE.time : Math.max(0, GRADE.time * (1 - (R.time - par) / (par * (GRADE.slow - 1))));
  const rows = [
    { label: 'TIME', value: clock(R.time) + ' / ' + clock(par), pts: tPts },
    { label: 'LIVES KEPT', value: kept + ' / ' + lives, pts: GRADE.lives * kept / lives },
    { label: 'DAMAGE TAKEN', value: (R.taken || 0) + '%', pts: Math.max(0, GRADE.hurt - (R.taken || 0) / GRADE.hurtPer) },
    { label: 'WEAK SPOT HITS', value: String(R.weak || 0), pts: Math.min(GRADE.weak, R.weak || 0) },
    { label: 'LIMITS FIRED', value: String(R.limits || 0), pts: Math.min(GRADE.limits, (R.limits || 0) * GRADE.perLimit) },
    { label: 'SKILL LEVEL', value: T.name, stars: R.tier + 1, pts: GRADE.skill[R.tier] },
  ];
  const score = Math.round(rows.reduce((n, r) => n + r.pts, 0));
  const ok = (L) => L !== 'S' || (R.tier === 2 && !R.falls);
  const grade = LETTERS.find(([L, need]) => score >= need && ok(L))[0];
  return { grade, score, rows };
}
/** Remembers a grade if it's the best yet for that boss and difficulty; returns true if it is. */
export function recordGrade(id, tier, grade) {
  const r = rec(id), order = LETTERS.map((l) => l[0]); r.grade = r.grade || ['', '', ''];
  const better = !r.grade[tier] || order.indexOf(grade) < order.indexOf(r.grade[tier]);
  if (better) { r.grade[tier] = grade; store(); }
  return better;
}
/** The best grade on a difficulty ('' = none yet). */
export function bestGrade(id, tier) { return (save[id] && save[id].grade && save[id].grade[tier]) || ''; }
/** m:ss for a number of frames. */
export function clock(frames) { const s = Math.floor(frames / 60); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

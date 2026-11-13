// BOSS FIGHTS (Trinkets > BOSS FIGHTS, src/scenes/BossFightsScene.js): six bosses, each in its own arena with
// its own hazards, each harder than the last (boss II opens when you beat boss I, III when you beat II), and each
// on three difficulties. The higher the difficulty, the bigger the rewards (src/scenes/BossRewardScene.js shows
// them). The bosses themselves live in their arenas: src/stage/bossBase.js + steamBossStage.js / polyBossStage.js /
// demonBossStage.js / knightBossStage.js / machineBossStage.js / humBossStage.js.
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
    hazards: 'PIPE BURSTS / CRANE DROPS' },
  { id: 'polygon', name: 'KING POLYGON', short: 'KING POLYGON', title: 'RULER OF THE 64-BIT SKY', stage: 'polygon-peak', arena: 'POLYGON PEAK', hp: 360, coins: 180, color: 0x5ad8ff, trophy: 'golden-cartridge',
    blurb: 'THE LOW-POLY RULER OF A 64-BIT SKY, A\nCROWNED HEAD AND TWO GIANT HANDS. HIT\nTHE HEAD. NEAR THE END, HE BATS IT AT YOU.',
    taunts: ['GAME OVER! INSERT ANOTHER CHALLENGER!', 'NOT EVEN ONE FRAME OF RESISTANCE.', 'TOO FEW POLYGONS. TOO MUCH CONFIDENCE.'],
    hazards: 'PYLON ZAPS / QUAKE RINGS' },
  { id: 'demon', name: 'KARNAX, THE MAD BLADE', short: 'KARNAX', title: 'THE MAD BLADE', stage: 'burning-keep', arena: 'THE BURNING KEEP', hp: 430, coins: 260, color: 0xff3a2a, trophy: 'mad-blade',
    blurb: 'A HORNED DEMON WITH A GRIN TOO WIDE AND\nA SWORD TOO BIG, LAUGHING AS THE KEEP\nBURNS. AT HALF HEALTH HE GOES MAD.',
    taunts: ['HA! HA HA! IS THAT ALL?!', 'COME BACK! I WAS JUST STARTING TO HAVE FUN!', 'YOUR SCREAMS ARE MUSIC, LITTLE ONE.'],
    hazards: 'CATAPULT STONES / BRAZIER FLARES' },
  { id: 'knight', name: 'THORNWARD, THE ROOTBOUND KNIGHT', short: 'THORNWARD', title: 'GUARDIAN OF THE ELDER GROVE', stage: 'elder-grove', arena: 'THE ELDER GROVE', hp: 480, coins: 340, color: 0x6ae060, trophy: 'verdant-helm',
    blurb: 'A HOLLOW KNIGHT BOUND BY ROOTS. HIS ARMOUR\nCAN\'T BE HURT - HIT HIS SOUL WHEN IT COMES\nOUT TO TAUNT YOU. BELOW 25% HE GOES BERSERK.',
    taunts: ['NYAH! TOO SLOW! TOO SLOW!', 'THE ROOTS WILL KEEP YOU NOW.', 'HEHEHE - BETTER LUCK NEXT SEASON!'],
    hazards: 'THORN ROOTS / SPORE BURSTS' },
  { id: 'machine', name: 'BEIGE.EXE, THE OLD MACHINE', short: 'BEIGE.EXE', title: 'THE COMPUTER THAT WILL NOT SHUT DOWN', stage: 'desktop', arena: 'THE DESKTOP', hp: 640, coins: 420, color: 0x30c8b0, trophy: 'golden-floppy',
    blurb: 'A 90S COMPUTER THAT NEVER SHUT DOWN. ITS\nCURSOR CLICKS, DRAGS AND DELETES. HIT\nITS SCREEN - HARDEST WHEN IT FREEZES.',
    taunts: ['PLAYER HAS PERFORMED AN ILLEGAL OPERATION AND WILL BE SHUT DOWN.', 'ARE YOU SURE YOU WANT TO QUIT?  ...TOO LATE.', 'PRESS ANY KEY TO CONTINUE LOSING.'],
    hazards: 'POP-UPS / DIAL-UP' },
  { id: 'hum', name: 'THE HUM, OCCUPANT OF LEVEL 0', short: 'THE HUM', title: 'IT LIVES IN THE BUZZING OF THE LIGHTS', stage: 'level-zero', arena: 'LEVEL 0', hp: 400, coins: 500, color: 0xe8d870, trophy: 'last-light',
    blurb: 'SOMETHING TALL LIVES IN THE YELLOW ROOMS.\nIT GOES THROUGH FLOORS AND HIDES IN THE\nDARK. AFTER IT SURFACES, IT IS STUCK.',
    taunts: ['...', 'YOU NOCLIPPED INTO THE WRONG ROOM.', 'STAY. THE LIGHTS ARE ALWAYS ON HERE.'],
    hazards: 'FLICKER / BURST PANELS' },
];
/** The boss with this id (a BOSSES entry). */
export const bossById = (id) => BOSSES.find((b) => b.id === id);

// what you've beaten, saved in this browser: { [bossId]: { won: [n, n, n] (wins per difficulty), best: [frames...] } }
const KEY = 'rebirth.bosses';
let save = {};
try { save = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { save = {}; }
const store = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* storage unavailable */ } };
const rec = (id) => (save[id] = save[id] || { won: [0, 0, 0], best: [0, 0, 0] });
// ?bosses=all opens every boss (testing)
const allOpen = (() => { try { return new URLSearchParams(location.search).get('bosses') === 'all'; } catch (e) { return false; } })();

/** How many times a boss has been beaten on a difficulty (0 = never). */
export function bossWins(id, tier) { return (save[id] && save[id].won[tier]) || 0; }
/** The fastest win on a difficulty, in frames (0 = none yet). */
export function bossBest(id, tier) { return (save[id] && save[id].best[tier]) || 0; }
/** Whether a boss can be fought yet: the first always; each one after it once the one before has been beaten. */
export function bossOpen(i) { return allOpen || i === 0 || [0, 1, 2].some((t) => bossWins(BOSSES[i - 1].id, t) > 0); }
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

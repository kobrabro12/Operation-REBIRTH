// ACHIEVEMENTS, TROPHIES and the player's lifetime stats (the ACHIEVEMENTS page is opened from the TROPHY HALL's ledger:
// AchievementsScene.js; trophies stand in the hall). Remembered in this
// browser. Stats are counted for human players in real matches only (not training, not the title demo, not CPUs).
// Each achievement pays out coins for the shop the moment it unlocks (a toast pops up: src/ui/toast.js).
// To add one: an entry in ACHIEVEMENTS with `goal` and `have(s)` (how far along the player is, from the stats `s`).
// Testing: ?ach=reset clears achievements and stats.
import { getKOs, getCoins, addCoins, owns } from './progress.js';
import { SHOP } from './data/shop.js';
import { STAGES, setSecretCheck } from './stage/stages.js';

const STATS_KEY = 'rebirth.stats', ACH_KEY = 'rebirth.ach', TROPHY_KEY = 'rebirth.trophies';
const blank = () => ({ matches: 0, wins: 0, flawless: 0, limits: 0, taunts: 0, spins: 0, spent: 0, bells: 0, previews: 0, played: {}, won: {}, stages: [], secrets: [], bestCoins: 0, bosses: {} });
let stats = blank(), got = {};
try { stats = { ...blank(), ...(JSON.parse(localStorage.getItem(STATS_KEY) || '{}') || {}) }; } catch (e) { /* defaults */ }
try { got = JSON.parse(localStorage.getItem(ACH_KEY) || '{}') || {}; } catch (e) { got = {}; }
let cups = {};
try { cups = JSON.parse(localStorage.getItem(TROPHY_KEY) || '{}') || {}; } catch (e) { cups = {}; }
try { if (new URLSearchParams(window.location.search).get('ach') === 'reset') { stats = blank(); got = {}; cups = {}; save(); } } catch (e) { /* no URL */ }
function save() { try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); localStorage.setItem(ACH_KEY, JSON.stringify(got)); localStorage.setItem(TROPHY_KEY, JSON.stringify(cups)); } catch (e) { /* storage unavailable */ } }

export function getStats() { return stats; }
// count something: stat('taunts'), stat('spins', 10)
export function stat(name, n = 1) { stats[name] = (stats[name] || 0) + n; save(); }
export function foundSecret(code) { return stats.secrets.includes(code); }
setSecretCheck(foundSecret);   // (stages.js: a stage with `secret` stays locked until its code is found)
export function addSecret(code) { if (!stats.secrets.includes(code)) { stats.secrets.push(code); save(); } }

// one human player's finished match: who they played, where on, whether they won, and if they never fell
export function recordMatch({ fighter, stage, won, flawless }) {
  stats.matches++; stats.played[fighter] = (stats.played[fighter] || 0) + 1;
  if (won) { stats.wins++; stats.won[fighter] = (stats.won[fighter] || 0) + 1; }
  if (won && flawless) stats.flawless++;
  if (stage && !stats.stages.includes(stage)) stats.stages.push(stage);
  save();
}

/** A boss fight won (src/data/bosses.js): remembers the hardest difficulty each boss has been beaten on (1-3). */
export function recordBoss(id, tier) { stats.bosses = stats.bosses || {}; stats.bosses[id] = Math.max(stats.bosses[id] || 0, tier + 1); save(); }
const bossTier = (s, id) => (s.bosses && s.bosses[id]) || 0;

const MAIN = ['soul-summoner', 'mr-wake', 'hero-knight', 'nu', 'aero'];
const TESTS = ['young-link', 'what-once-was', 'last-seen'];
const totalKOs = () => [...MAIN, ...TESTS].reduce((n, id) => n + getKOs(id), 0);
const shopItems = () => SHOP.filter((t) => t.name !== 'GAMBLING').flatMap((t) => t.items).filter((i) => !i.hidden);   // (secret items don't count)
const ownedCount = (kind) => shopItems().filter((i) => (!kind || i.kind === kind) && owns(i.id)).length;
const stageCount = () => STAGES.filter((s) => s.available && !s.shop && !s.secret && !s.bossArena).length;   // (stages bought in the shop, opened by a code or won from a boss don't count)

// the list. group = which page section it's shown under; secret = name and how-to hidden until it's unlocked
export const ACHIEVEMENTS = [
  // ---- FIGHTING
  { id: 'first-ko', group: 'FIGHTING', name: 'FIRST BLOOD', info: 'SCORE YOUR FIRST KO.', goal: 1, have: () => totalKOs(), coins: 25 },
  { id: 'kos-100', group: 'FIGHTING', name: 'HEADHUNTER', info: 'SCORE 100 KOS.', goal: 100, have: () => totalKOs(), coins: 150 },
  { id: 'kos-500', group: 'FIGHTING', name: 'SOUL COLLECTOR', info: 'SCORE 500 KOS.', goal: 500, have: () => totalKOs(), coins: 500 },
  { id: 'first-win', group: 'FIGHTING', name: 'FIRST VICTORY', info: 'WIN A MATCH.', goal: 1, have: (s) => s.wins, coins: 40 },
  { id: 'wins-25', group: 'FIGHTING', name: 'CHAMPION', info: 'WIN 25 MATCHES.', goal: 25, have: (s) => s.wins, coins: 200 },
  { id: 'wins-100', group: 'FIGHTING', name: 'LEGEND', info: 'WIN 100 MATCHES.', goal: 100, have: (s) => s.wins, coins: 600 },
  { id: 'flawless', group: 'FIGHTING', name: 'FLAWLESS', info: 'WIN A STOCK MATCH WITHOUT FALLING ONCE.', goal: 1, have: (s) => s.flawless, coins: 120 },
  { id: 'limits-10', group: 'FIGHTING', name: 'LIMIT BREAKER', info: 'FIRE 10 LIMITS.', goal: 10, have: (s) => s.limits, coins: 80 },
  { id: 'taunts-50', group: 'FIGHTING', name: 'SHOWBOAT', info: 'TAUNT 50 TIMES IN MATCHES.', goal: 50, have: (s) => s.taunts, coins: 60 },
  { id: 'matches-50', group: 'FIGHTING', name: 'REGULAR', info: 'PLAY 50 MATCHES.', goal: 50, have: (s) => s.matches, coins: 150 },
  { id: 'boss-1', group: 'FIGHTING', name: 'GIANT SLAYER', info: 'BEAT A BOSS (TRINKETS > BOSS FIGHTS).', goal: 1, have: (s) => ['colossus', 'polygon', 'demon', 'knight', 'machine', 'hum'].filter((b) => bossTier(s, b)).length, coins: 100 },
  { id: 'boss-all', group: 'FIGHTING', name: 'MONSTER HUNTER', info: 'BEAT ALL SIX BOSSES.', goal: 6, have: (s) => ['colossus', 'polygon', 'demon', 'knight', 'machine', 'hum'].filter((b) => bossTier(s, b)).length, coins: 400 },
  { id: 'matches-250', group: 'FIGHTING', name: 'VETERAN', info: 'PLAY 250 MATCHES.', goal: 250, have: (s) => s.matches, coins: 500 },
  // ---- ROSTER
  { id: 'ss-50', group: 'ROSTER', name: 'SOUL BOUND', info: 'SCORE 50 KOS AS SOUL SUMMONER.', goal: 50, have: () => getKOs('soul-summoner'), coins: 120 },
  { id: 'mw-50', group: 'ROSTER', name: 'WIDE AWAKE', info: 'SCORE 50 KOS AS MR WAKE.', goal: 50, have: () => getKOs('mr-wake'), coins: 120 },
  { id: 'hk-50', group: 'ROSTER', name: "KNIGHT'S HONOR", info: 'SCORE 50 KOS AS LACY.', goal: 50, have: () => getKOs('hero-knight'), coins: 120 },
  { id: 'all-round', group: 'ROSTER', name: 'ALL-ROUNDER', info: 'WIN A MATCH WITH SOUL SUMMONER, MR WAKE AND LACY.', goal: 3, have: (s) => MAIN.filter((id) => s.won[id]).length, coins: 150 },
  { id: 'lab-rat', group: 'ROSTER', name: 'LAB RAT', info: 'PLAY A MATCH AS A TEST FIGHTER.', goal: 1, have: (s) => TESTS.filter((id) => s.played[id]).length, coins: 40 },
  { id: 'lab-all', group: 'ROSTER', name: 'HEAD SCIENTIST', info: 'PLAY A MATCH AS EVERY TEST FIGHTER.', goal: TESTS.length, have: (s) => TESTS.filter((id) => s.played[id]).length, coins: 150 },
  // ---- WORLD
  { id: 'sightseer', group: 'WORLD', name: 'SIGHTSEER', info: 'FIGHT ON EVERY STAGE.', goal: stageCount(), have: (s) => s.stages.length, coins: 200 },
  { id: 'dress-up', group: 'WORLD', name: 'DRESS UP', info: 'OWN 3 SHOP COSTUMES.', goal: 3, have: () => ownedCount('costume'), coins: 100 },
  { id: 'collector', group: 'WORLD', name: 'COLLECTOR', info: 'OWN 16 THINGS FROM THE SHOP.', goal: 16, have: () => ownedCount(), coins: 300 },
  { id: 'complete', group: 'WORLD', name: 'COMPLETIONIST', info: 'OWN EVERYTHING IN THE SHOP.', goal: shopItems().length, have: () => ownedCount(), coins: 1000 },
  { id: 'spins-10', group: 'WORLD', name: 'HIGH ROLLER', info: 'PULL 10 GACHA CAPSULES.', goal: 10, have: (s) => s.spins, coins: 100 },
  { id: 'spent-5000', group: 'WORLD', name: 'BIG SPENDER', info: 'SPEND 5000 COINS.', goal: 5000, have: (s) => s.spent, coins: 250 },
  { id: 'hoard', group: 'WORLD', name: 'COIN HOARDER', info: 'HAVE 3000 COINS AT ONCE.', goal: 3000, have: (s) => Math.max(s.bestCoins, getCoins()), coins: 150 },
  // ---- SECRETS
  { id: 'still-life', group: 'SECRETS', secret: true, name: 'STILL LIFE', info: 'FOUND THE SHOPKEEPER\'S SECRET.', hint: 'THE SHOPKEEPER HIDES SOMETHING. RING TWICE MORE THAN ONCE.', goal: 1, have: (s) => +s.secrets.includes('STILLLIFE'), coins: 200 },
  { id: 'noli', group: 'SECRETS', secret: true, name: 'NOLI', info: 'CHANGED THE SHOPKEEPER FOR GOOD.', hint: 'SOME CODES CAN\'T BE UNDONE.', goal: 1, have: (s) => +s.secrets.includes('NOLI'), coins: 200 },
  // OUR VICTORY: the shopkeeper's code PAPERSPLEASE. Its reward (besides the coins) is a poster - shown on its card, and
  // hung on the wall of the PEOPLE'S STORE (ShopScene.sovietNook)
  { id: 'our-victory', group: 'SECRETS', secret: true, name: 'OUR VICTORY', info: 'TYPED PAPERSPLEASE. YOUR REWARD: THE WORKERS\' POSTER.', hint: 'YOUR PAPERS, PLEASE.', goal: 1, have: (s) => +s.secrets.includes('PAPERSPLEASE'), coins: 300, poster: 'shop_poster' },
  { id: 'thirteen', group: 'SECRETS', secret: true, name: 'DON\'T ANSWER IT', info: 'TYPED 13. 13 WILLOW LANE IS OPEN.', hint: 'WHAT NUMBER IS THE HOUSE?', goal: 1, have: (s) => +s.secrets.includes('13'), coins: 130 },
  { id: 'heisenberg', group: 'SECRETS', secret: true, name: 'ROAD TRIP', info: 'TYPED HEISENBERG. DUST RUNNER IS OPEN.', hint: 'A NAME FROM PHYSICS. UNCERTAIN, BUT ALWAYS MOVING.', goal: 1, have: (s) => +s.secrets.includes('HEISENBERG'), coins: 200 },
  { id: 'bell', group: 'SECRETS', secret: true, name: 'DING DING DING', info: 'RANG THE SHOP BELL 30 TIMES.', hint: 'SOMEONE ON THE COUNTER WANTS ATTENTION.', goal: 30, have: (s) => s.bells, coins: 50 },
  { id: 'window', group: 'SECRETS', secret: true, name: 'WINDOW SHOPPER', info: 'PREVIEWED 15 COSTUMES.', hint: 'LOOK, DON\'T TOUCH.', goal: 15, have: (s) => s.previews, coins: 50 },
];

// TROPHIES (shown in the TROPHY HALL, src/scenes/TrophyHallScene.js; their look and story in src/data/trophyHall.js):
// five big goals, each harder than the last, paying more coins, and one for beating each boss on NIGHTMARE. (THE YOU DID IT TROPHY is free - it isn't here.)
export const TROPHY_GOALS = [
  { id: 'first-sword', name: 'THE FIRST SWORD', info: 'WIN YOUR FIRST MATCH.', goal: 1, have: (s) => s.wins, coins: 50 },
  { id: 'bronze-boot', name: 'THE BRONZE BOOT', info: 'SCORE 100 KOS.', goal: 100, have: () => totalKOs(), coins: 250 },
  { id: 'silver-fish', name: 'THE SILVER GOLDFISH', info: 'WIN 50 MATCHES.', goal: 50, have: (s) => s.wins, coins: 600 },
  { id: 'crystal-crown', name: 'THE CRYSTAL CROWN', info: 'WIN 10 STOCK MATCHES WITHOUT FALLING ONCE.', goal: 10, have: (s) => s.flawless, coins: 1200 },
  // the boss trophies: beat each boss on NIGHTMARE (src/data/bosses.js)
  { id: 'brass-heart', name: 'THE BRASS HEART', info: 'BEAT THE CLOCKWORK COLOSSUS ON NIGHTMARE (TRINKETS > BOSS FIGHTS).', goal: 1, have: (s) => +(bossTier(s, 'colossus') >= 3), coins: 500 },
  { id: 'golden-cartridge', name: 'THE GOLDEN CARTRIDGE', info: 'BEAT KING POLYGON ON NIGHTMARE (TRINKETS > BOSS FIGHTS).', goal: 1, have: (s) => +(bossTier(s, 'polygon') >= 3), coins: 750 },
  { id: 'mad-blade', name: 'THE MAD BLADE', info: 'BEAT KARNAX ON NIGHTMARE (TRINKETS > BOSS FIGHTS).', goal: 1, have: (s) => +(bossTier(s, 'demon') >= 3), coins: 1000 },
  { id: 'verdant-helm', name: 'THE VERDANT HELM', info: 'BEAT THORNWARD ON NIGHTMARE (TRINKETS > BOSS FIGHTS).', goal: 1, have: (s) => +(bossTier(s, 'knight') >= 3), coins: 1250 },
  { id: 'golden-floppy', name: 'THE GOLDEN FLOPPY', info: 'BEAT BEIGE.EXE ON NIGHTMARE (TRINKETS > BOSS FIGHTS).', goal: 1, have: (s) => +(bossTier(s, 'machine') >= 3), coins: 1500 },
  { id: 'last-light', name: 'THE LAST LIGHT', info: 'BEAT THE HUM ON NIGHTMARE (TRINKETS > BOSS FIGHTS).', goal: 1, have: (s) => +(bossTier(s, 'hum') >= 3), coins: 1750 },
  { id: 'phoenix', name: 'THE REBIRTH PHOENIX', info: 'UNLOCK EVERY ACHIEVEMENT (SECRETS DON\'T COUNT).', goal: ACHIEVEMENTS.filter((a) => !a.secret).length, have: () => ACHIEVEMENTS.filter((a) => !a.secret && got[a.id]).length, coins: 3000 },
];
/** Whether a trophy (TROPHY_GOALS id) has been earned in this browser. */
export function trophyEarned(id) { return !!cups[id]; }
/** How far along a trophy is: [have, goal] (capped at the goal). */
export function trophyProgress(id) { const T = TROPHY_GOALS.find((q) => q.id === id); return T ? [Math.min(T.goal, Math.floor(T.have(stats) || 0)), T.goal] : [1, 1]; }

export function isUnlocked(id) { return !!got[id]; }
export function unlockedCount() { return ACHIEVEMENTS.filter((a) => got[a.id]).length; }
// how far along: [have, goal] (capped at the goal)
export function progressOf(a) { return [Math.min(a.goal, Math.floor(a.have(stats) || 0)), a.goal]; }

// unlocks anything newly earned, pays its coins, and returns the new ones (to show in a toast)
export function checkAchievements() {
  stats.bestCoins = Math.max(stats.bestCoins || 0, getCoins());
  const fresh = [];
  for (const a of ACHIEVEMENTS) if (!got[a.id] && (a.have(stats) || 0) >= a.goal) { got[a.id] = Date.now(); fresh.push(a); }
  for (const T of TROPHY_GOALS) if (!cups[T.id] && (T.have(stats) || 0) >= T.goal) { cups[T.id] = Date.now(); fresh.push({ ...T, label: 'TROPHY EARNED - SEE THE TROPHY HALL' }); }   // (after the achievements: the phoenix counts them)
  const pay = fresh.reduce((n, a) => n + a.coins, 0); if (pay) addCoins(pay);
  save();
  return fresh;
}

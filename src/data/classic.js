// CLASSIC MODE (main menu > CLASSIC; ClassicScene / ClassicEndingScene): pick a fighter and a difficulty, then fight a
// ladder of six short custom fights - each with its own twist - and, at the end, a random boss (src/data/bosses.js).
// Beat it and that fighter's ENDING plays (a minute-long cinematic: what they did after beating that evil - `ENDINGS`),
// and you earn their CLASSIC TROPHY (a gold statue of them, shown in CLASSIC > TROPHIES). Lose a fight: CONTINUE?
// retries it (counted on the clear), or give up.
// The run in progress is `run` (this session only); clears and trophies are saved as `rebirth.classic`.
import { STAGES, stageLocked } from '../stage/stages.js';
import { ROSTER } from '../fighters/roster.js';
import { BOSSES, TIERS } from './bosses.js';
import { addCoins } from '../progress.js';

// the difficulties (the boss fight uses the boss TIERS of the same index): CPU level per round (0 easy .. 2 hard),
// how many lives you have in each fight, coins for a clear
export const CLASSIC_TIERS = [
  { name: 'NORMAL', color: TIERS[0].color, cpu: [0, 1, 1, 1, 1, 1], stocks: 2, coins: 400 },
  { name: 'HARD', color: TIERS[1].color, cpu: [1, 1, 2, 2, 2, 2], stocks: 2, coins: 1000 },
  { name: 'NIGHTMARE', color: TIERS[2].color, cpu: [2, 2, 2, 2, 2, 2], stocks: 1, coins: 2200 },
];
// the ladder: each round's name, its twist (shown on the route) and how it's set up - foes (CPUs), the mode, items;
// mirror = the foe is you (another costume); last = the boss
export const ROUNDS = [
  { name: 'A RIVAL APPEARS', twist: 'ONE ON ONE. WARM UP.', foes: 1 },
  { name: 'DOUBLE TROUBLE', twist: 'TWO OF THEM. ONE OF YOU.', foes: 2 },
  { name: 'STAMINA SHOWDOWN', twist: 'NO LAUNCHES - KNOCK THEIR HP TO ZERO.', foes: 1, mode: 'stamina', hp: 100 },
  { name: 'ITEM FRENZY', twist: 'ITEMS RAIN FROM THE SKY.', foes: 1, items: true },
  { name: 'MIRROR MATCH', twist: 'YOUR WORST ENEMY: YOU.', foes: 1, mirror: true },
  { name: 'BATTLE ROYALE', twist: 'THREE ON ONE. LAST ONE STANDING.', foes: 3 },
  { name: 'THE FINAL EVIL', twist: 'SOMETHING TERRIBLE WAITS AT THE END.', boss: true },
];

/** The run in progress (null between runs): { fighter, skin, tier, round, plan: [{ stage, foes, skins }], boss, continues, start }. */
export let run = null;

/**
 * Starts a new run for a fighter: plans every round now - a different stage each time (any open, ordinary stage) and
 * random foes - and picks the boss waiting at the end.
 */
export function startRun(fighter, skin, tier) {
  const stages = STAGES.filter((s) => s.available && !s.bossArena && !stageLocked(s)).map((s) => s.id).sort(() => Math.random() - 0.5);
  const ids = ROSTER.filter((f) => f.available).map((f) => f.id);
  const plan = ROUNDS.map((R, i) => {
    if (R.boss) return null;
    const foes = R.mirror ? [fighter] : Array.from({ length: R.foes }, () => ids[Math.floor(Math.random() * ids.length)]);
    return { stage: stages[i % stages.length], foes };
  });
  const boss = BOSSES[Math.floor(Math.random() * BOSSES.length)].id;
  run = { fighter, skin, tier, round: 0, plan, boss, continues: 0, done: false };
  return run;
}
/** Ends the run (given up, or after the ending). */
export function endRun() { run = null; }

/**
 * The match setup for the round the run is on (for MatchScene's data.classic, or data.boss for the last), from the
 * player's settings (pad, CRT) and the round: mode, lives, foes and their CPU levels, items, the stage.
 */
export function roundSetup(base) {
  const R = ROUNDS[run.round], T = CLASSIC_TIERS[run.tier], P = run.plan[run.round];
  if (R.boss) return { mode: 'stock', stocks: TIERS[run.tier].stocks, hp: 150, minutes: 3, items: false, hazards: true, crt: base.crt, stage: BOSSES.find((b) => b.id === run.boss).stage, track: 'auto', picks: [run.fighter], skins: [run.skin], cpuCount: 0, difficulty: 1, cpuLevels: [], p1Pad: base.p1Pad, extraPads: [], from: 'Classic' };
  const lvl = T.cpu[run.round];
  return { mode: R.mode || 'stock', stocks: T.stocks, hp: R.hp || 150, minutes: 3, items: !!R.items, hazards: true, crt: base.crt, stage: P.stage, track: 'auto',
    picks: [run.fighter, ...P.foes], skins: [run.skin, ...P.foes.map((id) => (id === run.fighter ? (run.skin ? 0 : 1) : 0))],
    cpuCount: P.foes.length, difficulty: lvl, cpuLevels: [lvl, ...P.foes.map(() => lvl)], p1Pad: base.p1Pad, extraPads: [], from: 'Classic' };
}

// what's been cleared, saved in this browser: { [fighterId]: { clears: [n, n, n] per difficulty } }
const KEY = 'rebirth.classic';
let save = {};
try { save = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { save = {}; }
const store = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* storage unavailable */ } };

/** How many times a fighter has cleared CLASSIC on a difficulty. */
export function classicClears(id, tier) { return (save[id] && save[id].clears[tier]) || 0; }
/** Whether a fighter's CLASSIC TROPHY has been earned (any clear). */
export function hasClassicTrophy(id) { return !!(save[id] && save[id].clears.some((n) => n > 0)); }
/** Remembers a clear (the trophy comes with the first) and pays its coins (less with each CONTINUE). Returns { coins, first }. */
export function recordClear(id, tier, continues) {
  const r = (save[id] = save[id] || { clears: [0, 0, 0] }), first = !hasClassicTrophy(id);
  r.clears[tier]++; store();
  const coins = Math.round(CLASSIC_TIERS[tier].coins * Math.pow(0.75, continues));
  addCoins(coins);
  return { coins, first };
}

/**
 * Turns a fighter's sprite into its gold CLASSIC TROPHY statue: a colour-matrix filter that maps its shading onto gold
 * (bright gold highlights, deep bronze shadows). Done once per sprite; tint is the fallback where filters aren't there.
 */
export function goldStatue(sprite) {
  if (sprite.goldDone) return sprite; sprite.goldDone = true;
  try {
    sprite.enableFilters();
    const cm = sprite.filters.internal.addColorMatrix(), L = [0.3, 0.59, 0.11];
    cm.colorMatrix.set([...L.map((v) => v * 1.45), 0, 0.06, ...L.map((v) => v * 1.12), 0, 0.02, ...L.map((v) => v * 0.42), 0, 0, 0, 0, 0, 1, 0]);
  } catch (e) { sprite.setTint(0xffd060); }
  return sprite;
}

// each fighter's CLASSIC TROPHY: its name on the plaque and the line under it
export const CLASSIC_TROPHIES = {
  'soul-summoner': { name: 'SOUL SUMMONER', line: 'HE DIED HOLDING THE GATE - AND CAME BACK TO HOLD IT AGAIN. THE BLUE FLAME IN HIS PALM IS EVERY FRIEND WHO FELL BESIDE HIM.' },
  'mr-wake': { name: 'MR WAKE', line: 'A GENTLEMAN OF THE BLACK WATER. HE BOWS BEFORE EVERY FIGHT, AND AFTER - WHETHER OR NOT YOU ARE STILL THERE TO SEE IT.' },
  'hero-knight': { name: 'LACY', line: 'THE LAST KNIGHT OF A FALLEN ORDER, WHO HAS NEVER ONCE DROPPED THE SWORD SHE THROWS. THE ORDER HAS TWO KNIGHTS NOW.' },
  nu: { name: 'NU', line: 'THE LOUDEST MAN ALIVE. THE CITY HAS PASSED THREE LAWS ABOUT HIM. HE HAS FRAMED ALL OF THEM.' },
  aero: { name: 'AERO', line: 'THE BOY IN THE FISHBOWL. THE GOLDFISH WOULD LIKE IT KNOWN THAT IT DID MOST OF THE THINKING.' },
  lumen: { name: 'LUMEN', line: 'THE HEART OF THE PURPLE STAR, WOKEN IN A BELL TOWER AT 12:11. SHE IS STILL COUNTING THE STARS THAT CAME BACK. ONE MORE TONIGHT.' },
  vanta: { name: 'VANTA', line: 'A COURIER FROM A CITY THAT NEVER SWITCHES OFF, WITH A SHARD OF STARLIGHT IN HIS BLADE. HE SAVES BEFORE EVERY FIGHT. HE HAS NEVER NEEDED TO LOAD.' },
  kami: { name: 'KAMI', line: 'A PAGE OF THE ARCHIVE THAT FOLDED ITSELF INTO A HERO. HE STILL DOES NOT KNOW WHAT HE SAYS. HE IS TRYING TO BE READY.' },
  gnash: { name: 'GNASH', line: 'A STREET PUNK KID IN A NEON MASK WITH AN AXE BIGGER THAN HE IS. NOBODY KNOWS WHAT IS UNDER THE MASK. NOBODY HAS ASKED TWICE.' },
};

// THE ENDINGS (ClassicEndingScene): eight shots of about 7.5 s each, a minute in all. Each shot: the backdrop (`bg` -
// a kind ClassicEndingScene paints: ruin = the beaten boss's arena at dawn, home = a stage's own picture (`stage`), road,
// camp, town, sky, sea, shrine, castle, gig, dawn), how the fighter moves in it (`act`: stand / walk / far / sit /
// none), and two lines of caption (%B = the boss's name). The last shot leads into THE END and the trophy.
export const ENDINGS = {
  'soul-summoner': { music: 'bgm_trophy_hall', tint: 0x5ab8ff, shots: [
    { bg: 'ruin', act: 'stand', text: ['%B HAS FALLEN.', 'THE BLUE FLAME BURNS ON IN THE ASHES.'] },
    { bg: 'camp', act: 'sit', text: ['THAT NIGHT HE SAT BY THE FIRE', 'AND SPOKE EVERY FALLEN NAME ALOUD.'] },
    { bg: 'road', act: 'walk', text: ['ONE BY ONE, THE SOULS IN HIS PALM', 'ASKED TO BE LET GO.'] },
    { bg: 'sky', act: 'walk', text: ['HE CARRIED THEM HOME, ABOVE THE CLOUDS,', 'TO THE GATES HE ONCE DIED HOLDING.'] },
    { bg: 'home', stage: 'sky-sanctum', act: 'far', text: ['THE SKY SANCTUM STOOD QUIET.', 'NO ENEMY LEFT AT ITS DOOR.'] },
    { bg: 'shrine', act: 'stand', souls: true, text: ['AT THE GATE, HE OPENED HIS HAND -', 'AND LET HIS FRIENDS REST AT LAST.'] },
    { bg: 'dawn', act: 'stand', text: ['THE FIRE IN HIS PALM GREW SMALL.', 'BUT IT NEVER WENT OUT.'] },
    { bg: 'castle', act: 'stand', text: ['HE STILL GUARDS THE GATE.', 'SOMEONE HAS TO.'] },
  ] },
  'mr-wake': { music: 'bgm_trophy_hall', tint: 0xb07aff, shots: [
    { bg: 'ruin', act: 'stand', text: ['%B HAS FALLEN.', 'MR WAKE BOWED. IT SEEMED ONLY POLITE.'] },
    { bg: 'road', act: 'walk', rain: true, night: true, text: ['HE WALKED HOME THROUGH THE RAIN', 'WITHOUT GETTING WET. HE NEVER DOES.'] },
    { bg: 'town', act: 'walk', night: true, quiet: true, text: ['THE TOWNSFOLK SHUT THEIR SHUTTERS.', 'HE TIPPED HIS HAT TO EACH ONE ANYWAY.'] },
    { bg: 'home', stage: 'gravemoon-bridge', act: 'far', text: ['AT GRAVEMOON BRIDGE THE WATER WAITED,', 'BLACK AND STILL, LIKE AN OPEN DOOR.'] },
    { bg: 'sea', act: 'stand', eyes: true, text: ['BELOW, SOMETHING WITH A GREAT MANY EYES', 'ASKED HOW HIS EVENING HAD GONE.'] },
    { bg: 'camp', act: 'sit', night: true, text: ['VERY WELL, HE SAID. A LOVELY TIME.', 'ONLY A FEW TEETH MARKS.'] },
    { bg: 'dawn', act: 'stand', night: true, star: true, text: ['A NEW PURPLE STAR FELL THAT NIGHT.', 'MR WAKE WATCHED IT FALL, AND SMILED.'] },
    { bg: 'sea', act: 'none', text: ['HE IS STILL UNDER THE BRIDGE.', 'DO KNOCK BEFORE YOU CROSS.'] },
  ] },
  'hero-knight': { music: 'bgm_trophy_hall', tint: 0xffd060, shots: [
    { bg: 'ruin', act: 'stand', text: ['%B HAS FALLEN.', 'LACY CAUGHT HER SWORD. SHE ALWAYS DOES.'] },
    { bg: 'town', act: 'stand', cheer: true, text: ['THE PEOPLE IT HAD TERRORISED', 'CAME OUT OF HIDING TO CHEER HER.'] },
    { bg: 'camp', act: 'sit', text: ['SHE DID NOT STAY FOR THE FEAST.', 'THE OATH DOES NOT TAKE NIGHTS OFF.'] },
    { bg: 'road', act: 'walk', text: ['SHE WALKED UNTIL THE ROAD RAN OUT -', 'TO THE CASTLE THAT BURNED.'] },
    { bg: 'castle', act: 'stand', ruined: true, text: ['IN THE ASHES OF THE GREAT HALL', 'SHE KNELT, AND TOLD THEM IT WAS DONE.'] },
    { bg: 'shrine', act: 'stand', banner: true, text: ['SHE HUNG THE ORDER\'S BANNER', 'OVER THE GATE ONCE MORE.'] },
    { bg: 'dawn', act: 'stand', kid: true, text: ['A GIRL FROM THE VILLAGE ASKED', 'IF SHE COULD LEARN THE SWORD.'] },
    { bg: 'road', act: 'walk', kid: true, text: ['THE ORDER HAS TWO KNIGHTS NOW.', 'LACY SAYS IT IS A START.'] },
  ] },
  nu: { music: 'bgm_trophy_hall', tint: 0xff5a8a, shots: [
    { bg: 'ruin', act: 'stand', text: ['%B HAS FALLEN.', 'NU PLAYED ONE LAST CHORD OVER IT.'] },
    { bg: 'road', act: 'walk', van: true, text: ['THE BAND HEARD IT ON THE RADIO', 'AND TURNED THE VAN AROUND.'] },
    { bg: 'town', act: 'walk', cheer: true, night: true, text: ['WORD SPREAD. THE CROWD GREW.', 'NOBODY KNOWS WHO CALLED THE FIRE BRIGADE.'] },
    { bg: 'gig', act: 'stand', text: ['THAT NIGHT: THE REUNION SHOW.', 'THE LOUDEST ONE YET.'] },
    { bg: 'gig', act: 'stand', fire: true, text: ['THE CITY PASSED ANOTHER LAW.', 'NU HAD IT FRAMED.'] },
    { bg: 'home', stage: 'neon-arcade', act: 'far', text: ['HE STILL HANGS OUT AT THE ARCADE', 'WHEN THE BAND IS ON A BREAK.'] },
    { bg: 'camp', act: 'sit', night: true, text: ['HIS EARS RANG FOR A WEEK.', 'HE SAYS THAT IS HOW YOU KNOW.'] },
    { bg: 'gig', act: 'none', text: ['THE VENUE ISN\'T THERE ANY MORE.', 'THE MUSIC IS.'] },
  ] },
  aero: { music: 'bgm_trophy_hall', tint: 0x5ae8d0, shots: [
    { bg: 'ruin', act: 'stand', text: ['%B HAS FALLEN.', 'AERO CHECKED ON THE GOLDFISH. IT WAS FINE.'] },
    { bg: 'sky', act: 'walk', bubbles: true, text: ['THEY FLOATED HOME ON A WARM BREEZE,', 'PAST CLOUDS SHAPED LIKE OLD COMPUTERS.'] },
    { bg: 'home', stage: 'aero-meadow', act: 'far', text: ['THE MEADOW HAD MISSED THEM.', 'THE BUBBLES CAME OUT TO SAY HELLO.'] },
    { bg: 'sea', act: 'stand', pond: true, text: ['THE GOLDFISH ASKED FOR A HOLIDAY.', 'AERO FOUND IT A VERY NICE POND.'] },
    { bg: 'camp', act: 'sit', text: ['HE SAT BY THE WATER ALL AFTERNOON,', 'NOT THINKING ABOUT GOLD SPEARS AT ALL.'] },
    { bg: 'sky', act: 'none', night: true, flicker: true, text: ['THEN THE SKY FLICKERED,', 'AND SOMEWHERE, SOMEONE PRESSED A KEY.'] },
    { bg: 'dawn', act: 'stand', bubbles: true, text: ['THE SCREENSAVER WOKE UP.', 'SO DID AERO.'] },
    { bg: 'home', stage: 'aero-meadow', act: 'stand', text: ['THE FISH SAYS HE IS A HERO.', 'THE FISH IS USUALLY RIGHT.'] },
  ] },
  gnash: { music: 'bgm_trophy_hall', tint: 0xff3ad0, shots: [
    { bg: 'ruin', act: 'stand', text: ['%B HAS FALLEN.', 'GNASH PULLED HIS AXE OUT OF IT.'] },
    { bg: 'road', act: 'walk', night: true, text: ['HE DRAGGED THE AXE HOME BEHIND HIM,', 'SPARKING ALL THE WAY DOWN THE ROAD.'] },
    { bg: 'town', act: 'walk', night: true, quiet: true, text: ['THE CITY WAS ASLEEP.', 'HE LAUGHED SO LOUD THE STREETLIGHTS FLICKERED.'] },
    { bg: 'gig', act: 'stand', text: ['AT THE OLD ARCADE, THE KIDS', 'HAD WAITED UP ALL NIGHT FOR HIM.'] },
    { bg: 'camp', act: 'sit', night: true, fire: true, text: ['HE TOLD THEM IT WAS EASY.', 'HIS HANDS WERE STILL SHAKING.'] },
    { bg: 'dawn', act: 'stand', kid: true, text: ['THE SMALLEST ONE ASKED', 'IF SHE COULD HOLD THE AXE.'] },
    { bg: 'shrine', act: 'stand', text: ['HE SAID NO.', 'THEN HE MADE HER A PAIR OF NEON HORNS.'] },
    { bg: 'road', act: 'far', night: true, text: ['NOW THE ROOFTOPS HAVE A GUARDIAN.', 'LOOK FOR THE GRIN IN THE DARK.'] },
  ] },
  lumen: { music: 'bgm_trophy_hall', tint: 0xa862ff, shots: [
    { bg: 'ruin', act: 'stand', text: ['%B HAS FALLEN.', 'A STAR ROSE OUT OF IT AND CAME TO HER HAND.'] },
    { bg: 'sky', act: 'none', night: true, star: true, text: ['SHE HELD IT UP TO THE DARK', 'AND IT KNEW WHERE IT BELONGED.'] },
    { bg: 'road', act: 'walk', night: true, text: ['SHE WALKED BACK TO THE SANCTUM', 'PLANTING STARS ALONG THE ROAD BEHIND HER.'] },
    { bg: 'shrine', act: 'stand', night: true, text: ['THE BELL TOWER WAS QUIET.', 'THE BELL RANG ONCE WHEN SHE CAME IN.'] },
    { bg: 'camp', act: 'sit', night: true, fire: true, text: ['THE ARCHIVIST BROUGHT COCOA', 'AND WROTE DOWN EVERY STAR SHE NAMED.'] },
    { bg: 'sky', act: 'none', night: true, star: true, text: ['FAR AWAY, SOMETHING VERY HUNGRY', 'COUNTED ONE STAR FEWER THAN IT WANTED.'] },
    { bg: 'dawn', act: 'stand', text: ['SHE IS NOT WHOLE YET.', 'BUT THE SKY IS A LITTLE LESS EMPTY.'] },
    { bg: 'road', act: 'far', night: true, text: ['LOOK UP AT ELEVEN MINUTES PAST MIDNIGHT.', 'ONE OF THEM IS WAVING.'] },
  ] },
  vanta: { music: 'bgm_trophy_hall', tint: 0x3af0ff, shots: [
    { bg: 'ruin', act: 'stand', text: ['%B HAS FALLEN.', 'VANTA SHEATHED HIS BLADE. CLICK.'] },
    { bg: 'town', act: 'walk', night: true, rain: true, text: ['THE CITY WAS STILL AWAKE.', 'IT NEVER SLEEPS. NEITHER DOES HE.'] },
    { bg: 'road', act: 'walk', night: true, text: ['HE RAN THE ROOFTOPS HOME', 'FASTER THAN THE TRAINS BELOW.'] },
    { bg: 'town', act: 'stand', night: true, quiet: true, text: ['ON THE BIGGEST BILLBOARD IN THE DISTRICT', 'SOMEONE HAD WRITTEN: THANK YOU.'] },
    { bg: 'camp', act: 'sit', night: true, fire: true, text: ['HE SAT UNDER A FLICKERING SIGN', 'AND LISTENED TO HIS BLADE HUM.'] },
    { bg: 'sky', act: 'none', night: true, star: true, text: ['THE SHARD IN IT RANG ONCE,', 'LIKE IT KNEW SOMETHING HE DIDN\'T.'] },
    { bg: 'dawn', act: 'stand', text: ['THE SUN CAME UP OVER THE NEON.', 'HE PRESSED SAVE.'] },
    { bg: 'road', act: 'far', text: ['IF THE LIGHTS EVER GO OUT,', 'LOOK FOR THE ONE BLADE STILL LIT.'] },
  ] },
  kami: { music: 'bgm_trophy_hall', tint: 0xf0503c, shots: [
    { bg: 'ruin', act: 'stand', text: ['%B HAS FALLEN.', 'KAMI FOLDED A CRANE TO MARK THE SPOT.'] },
    { bg: 'road', act: 'walk', text: ['HE WALKED HOME THROUGH THE WIND', 'HOLDING HIS EDGES DOWN.'] },
    { bg: 'town', act: 'walk', rain: true, text: ['IT RAINED.', 'HE WAS VERY, VERY CAREFUL.'] },
    { bg: 'castle', act: 'stand', night: true, text: ['THE ARCHIVE WAS DARK.', 'EVERY PAGE RUSTLED WHEN HE CAME IN.'] },
    { bg: 'camp', act: 'sit', night: true, fire: true, text: ['HE SAT IN THE PENCIL CUP', 'AND WROTE A NEW LINE ON HIS SASH.'] },
    { bg: 'sky', act: 'none', night: true, text: ['IT SAID: AND THEN THE PAPER', 'BECAME A TIGER.'] },
    { bg: 'dawn', act: 'stand', text: ['HE STILL DOES NOT KNOW WHAT PAGE HE IS.', 'BUT NOW HE KNOWS IT IS A GOOD ONE.'] },
    { bg: 'road', act: 'far', text: ['IF YOU FIND A PAPER CRANE ON YOUR STEP,', 'SOMEBODY SMALL IS LOOKING OUT FOR YOU.'] },
  ] },
};

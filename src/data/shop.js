// THE SHOP (Trinkets > SHOP, ShopScene.js): what's for sale.
// Each tab is a shelf; each item on it:
//   { name: 'ITEM NAME', price: 100, info: 'A LINE OR TWO\nABOUT IT.', color: 0xffd23a }
// (color: the tint of its placeholder icon until it has art). Empty shelf slots show COMING SOON.

// what the money is called, and its colour
export const CURRENCY = { name: 'COINS', color: 0xf3c358 };

// the shelves, left to right. Every item has an id (what's saved when you buy it) and a kind:
//   costume  a costume locked until bought (the skin in skins.js has `shop: <id>`) - pick it on the select screen
//   fx       a stage effect (matchExtras.js): switch one on and it plays over every stage
//   music    a battle track (tools/audio/shop_music.py -> bgm_shop_<id minus 'mus-'>): switch one on and it replaces
//            the stage music. Picking it in the shop plays a preview.
//   extra    a match extra (matchExtras.js): switch on as many as you like
// Prices: a match earns about 25-85 coins (progress.js COIN_RATES), so a cheap item is a few matches away and the
// whole shop takes a few hundred.
export const SHOP = [
  { name: 'COSTUMES', items: [
    { id: 'cos-eclipse', kind: 'costume', fighter: 'soul-summoner', skin: 'ECLIPSE', name: 'ECLIPSE', price: 1500, info: 'SOUL SUMMONER. ARMOUR BLACK AS A DEAD SUN, A FLAME LIKE ITS CORONA. HITS THROW STARS.' },
    { id: 'cos-aurora', kind: 'costume', fighter: 'soul-summoner', skin: 'AURORA', name: 'AURORA', price: 1100, info: 'SOUL SUMMONER. NORTHERN LIGHTS: A TEAL CAPE AND A MAGENTA FLAME, WISPS ORBITING HIM.' },
    { id: 'cos-vampire', kind: 'costume', fighter: 'mr-wake', skin: 'VAMPIRE', name: 'VAMPIRE', price: 1300, info: 'MR WAKE. A MIDNIGHT COUNT IN BLACK AND CRIMSON. HIS HITS SCATTER BATS.' },
    { id: 'cos-sakura', kind: 'costume', fighter: 'mr-wake', skin: 'SAKURA', name: 'SAKURA', price: 1000, info: 'MR WAKE. CHERRY-BLOSSOM ROBES. PETALS FALL WHEREVER HE HITS.' },
    { id: 'cos-obsidian', kind: 'costume', fighter: 'hero-knight', skin: 'OBSIDIAN', name: 'OBSIDIAN', price: 1300, info: 'LACY. VOLCANIC GLASS ARMOUR WITH LAVA IN THE CRACKS. HITS BURST INTO FLAME.' },
    { id: 'cos-cyber', kind: 'costume', fighter: 'hero-knight', skin: 'CYBERBLADE', name: 'CYBERBLADE', price: 1400, info: 'LACY. CHROME AND NEON. HER HITS GLITCH INTO PIXELS.' },
    { id: 'cos-vapor', kind: 'costume', fighter: 'nu', skin: 'VAPORWAVE', name: 'VAPORWAVE', price: 900, info: 'NU (TEST FIGHTER). PASTEL PINK AND TEAL, STRAIGHT OFF A 90S MALL.' },
    { id: 'cos-sunset', kind: 'costume', fighter: 'aero', skin: 'SUNSET', name: 'SUNSET', price: 900, info: 'AERO (TEST FIGHTER). GLASS GONE ORANGE AND MAGENTA. GOLDEN BUBBLES.' },
  ] },
  { name: 'STAGES', items: [
    { id: 'fx-night', kind: 'fx', name: 'NIGHTFALL', price: 500, info: 'EVERY STAGE AFTER DARK: A DEEP BLUE SKY, STARS AND A CRESCENT MOON.', color: 0x1a2a6a },
    { id: 'fx-storm', kind: 'fx', name: 'THUNDERSTORM', price: 750, info: 'POURING RAIN, AND LIGHTNING THAT LIGHTS UP THE WHOLE STAGE.', color: 0x3a4a6a },
    { id: 'fx-snow', kind: 'fx', name: 'BLIZZARD', price: 600, info: 'SNOW DRIVING SIDEWAYS THROUGH EVERY FIGHT.', color: 0xd8e8ff },
    { id: 'fx-sakura', kind: 'fx', name: 'CHERRY BLOSSOM', price: 600, info: 'PINK PETALS DRIFTING DOWN OVER EVERYTHING.', color: 0xffb8d0 },
    { id: 'fx-fireflies', kind: 'fx', name: 'FIREFLIES', price: 550, info: 'A VIOLET DUSK, AND LITTLE LIGHTS WANDERING THE STAGE.', color: 0xd8ff6a },
    { id: 'fx-bloodmoon', kind: 'fx', name: 'BLOOD MOON', price: 800, info: 'A HUGE RED MOON, AND EVERYTHING UNDER IT RED.', color: 0xc81a1a },
    { id: 'fx-sand', kind: 'fx', name: 'SANDSTORM', price: 500, info: 'A HOT TAN HAZE, DUST STREAMING PAST.', color: 0xc89a5a },
    { id: 'fx-aurora', kind: 'fx', name: 'AURORA', price: 900, info: 'RIBBONS OF GREEN AND VIOLET LIGHT ACROSS THE SKY.', color: 0x3affa8 },
  ] },
  { name: 'MUSIC', items: [
    { id: 'mus-neon', kind: 'music', name: 'NEON DRIVE', price: 400, info: 'SYNTHWAVE. PULSING BASS, BIG DRUMS, A NIGHT DRIVE.', color: 0xff4fd8 },
    { id: 'mus-lofi', kind: 'music', name: 'LOFI DOJO', price: 350, info: 'LO-FI BEATS AND A KOTO. TRAIN TO RELAX TO.', color: 0xc8a8ff },
    { id: 'mus-chip', kind: 'music', name: '8-BIT RUSH', price: 300, info: 'A FAST CHIPTUNE STRAIGHT OUT OF A CARTRIDGE.', color: 0x5aff8a },
    { id: 'mus-organ', kind: 'music', name: 'GRAVEYARD SHIFT', price: 350, info: 'A SPOOKY WALTZ ON A PIPE ORGAN. BELLS TOLL.', color: 0x8a6aff },
    { id: 'mus-surf', kind: 'music', name: "SURF'S UP", price: 300, info: 'SURF ROCK. TREMOLO GUITAR AND A DRIVING BEAT.', color: 0x4ac8ff },
    { id: 'mus-jazz', kind: 'music', name: 'BLUE HOUR', price: 400, info: 'A JAZZ TRIO AND A SAXOPHONE, LATE AT NIGHT.', color: 0x3a6ad8 },
    { id: 'mus-taiko', kind: 'music', name: 'TAIKO THUNDER', price: 450, info: 'WAR DRUMS, A SHAKUHACHI AND A KOTO.', color: 0xe8202a },
    { id: 'mus-dream', kind: 'music', name: 'STARLIGHT', price: 300, info: 'A MUSIC BOX UNDER THE STARS. GENTLE.', color: 0xffe08a },
  ] },
  { name: 'EXTRAS', items: [
    { id: 'ext-numbers', kind: 'extra', name: 'DAMAGE NUMBERS', price: 400, info: 'EVERY HIT POPS UP ITS DAMAGE. BIG ONES IN RED.', color: 0xffb84a },
    { id: 'ext-confetti', kind: 'extra', name: 'CONFETTI KOS', price: 500, info: 'EVERY KO BURSTS INTO CONFETTI.', color: 0xff6ad8 },
    { id: 'ext-finalcam', kind: 'extra', name: 'FINAL KO CAM', price: 900, info: 'THE MATCH-WINNING KO PLAYS IN SLOW MOTION.', color: 0xffffff },
    { id: 'ext-hats', kind: 'extra', name: 'PARTY HATS', price: 600, info: 'EVERY FIGHTER WEARS A PARTY HAT. EVERY MATCH IS A PARTY.', color: 0x5ad0ff },
    { id: 'ext-moon', kind: 'extra', name: 'MOON GRAVITY', price: 1200, info: 'LOW GRAVITY: FLOATY JUMPS, SLOW FALLS. CHANGES HOW MATCHES PLAY!', color: 0xd8d8e8 },
    { id: 'ext-airhorn', kind: 'extra', name: 'AIRHORN KOS', price: 450, info: 'EVERY KO GETS AN AIRHORN.', color: 0xf3c358 },
    { id: 'ext-rainbow', kind: 'extra', name: 'RAINBOW TRAILS', price: 700, info: 'LAUNCHED FIGHTERS LEAVE A RAINBOW BEHIND THEM.', color: 0x8a6aff },
    { id: 'ext-impact', kind: 'extra', name: 'IMPACT FRAMES', price: 800, info: 'BIG HITS FLASH BLACK AND WHITE, LIKE AN ANIME.', color: 0xe8e8e8 },
  ] },
  // GAMBLING: gacha capsule machines - pay, turn the crank, get a random prize from its pool (GACHA below)
  { name: 'GAMBLING', items: [
    { name: 'BASIC CAPSULE', price: 100, info: 'ONE PULL FROM THE BASIC MACHINE.\nANYTHING COULD BE INSIDE.', gacha: { machine: 'basic', pulls: 1 }, color: 0x4ac8ff },
    { name: '10 BASIC PULLS', price: 900, info: 'TEN PULLS FROM THE BASIC MACHINE.\nONE FREE, BECAUSE WE LIKE YOU.', gacha: { machine: 'basic', pulls: 10 }, color: 0x4ac8ff },
    { name: 'GOLDEN CAPSULE', price: 500, info: 'ONE PULL FROM THE GOLDEN MACHINE.\nRARER PRIZES. PROBABLY.', gacha: { machine: 'golden', pulls: 1 }, color: 0xf3c358 },
    { name: '10 GOLDEN PULLS', price: 4500, info: 'TEN PULLS FROM THE GOLDEN MACHINE.\nFOR THE TRULY LUCKY.', gacha: { machine: 'golden', pulls: 10 }, color: 0xf3c358 },
    { name: 'MYSTERY CAPSULE', price: 250, info: 'NOBODY KNOWS WHICH MACHINE\nTHIS ONE CAME FROM.', gacha: { machine: 'mystery', pulls: 1 }, color: 0xc77dff },
  ] },
];

// the gacha machines: what each one can give you. Each prize: { name, weight } (a bigger weight = more likely).
// Empty for now - Mason decides the prizes.
export const GACHA = {
  basic: { name: 'BASIC MACHINE', prizes: [] },
  golden: { name: 'GOLDEN MACHINE', prizes: [] },
  mystery: { name: 'MYSTERY MACHINE', prizes: [] },
};

// how much money the player has (earned in matches, saved in progress.js)
export { getCoins } from '../progress.js';

// THE SHOPKEEPER: an old TV sitting on a desk (ShopScene.keeper). His faces are Mason's drawings
// (public/assets/shop/face_<name>.png, originals in tools/sprites/art/shopkeeper/) - each one a strip of 64x64 frames,
// so a face can be an animation: add frames to the right and they play at `fps`. Which face shows depends on what
// you're doing:
//   calm   his resting face        happy  greeting you, or showing you another shelf
//   money  you're looking at something for sale, or buying it
//   shock  you tried to buy nothing, or something you can't afford - or you poked his screen
//   smug   you bought something, or switched something on
export const KEEPER = {
  faces: { calm: { fps: 6 }, happy: { fps: 6 }, money: { fps: 8 }, shock: { fps: 8 }, smug: { fps: 6 } },
  // how long a reaction face stays up before he goes back to happy (frames)
  hold: 100,
  // what he says
  lines: {
    hello: ['WELCOME, WELCOME!', 'BROWSE ALL YOU LIKE.', 'NEW STOCK... EVENTUALLY.'],
    look: ['OOH, A FINE PICK.', 'THAT ONE? GOOD EYE.', 'CHA-CHING...'],
    empty: ['NOTHING THERE YET!', "THAT SHELF'S BARE, FRIEND.", 'COME BACK LATER!'],
    broke: ["YOU CAN'T AFFORD THAT!", 'NOT ENOUGH ' + 'COINS!', 'NO COIN, NO DEAL.'],
    bought: ['PLEASURE DOING BUSINESS!', 'SOLD!'],
    tab: ['RIGHT THIS WAY.', 'HAVE A LOOK.', 'ANOTHER SHELF!'],
    gamble: ['FEELING LUCKY?', 'ONE MORE PULL...', 'THE HOUSE ALWAYS WINS. JUST SAYING.'],
    spin: ['NOT ENOUGH COINS TO SPIN!', 'THE CRANK NEEDS COINS, PAL.'],
    equip: ['GOOD CHOICE.', 'LOOKS GOOD ON YOU.', "NOW WE'RE TALKING."],
    unequip: ['TAKING IT OFF? SURE.', 'BACK IN THE BOX IT GOES.'],
    owned: ['YOU ALREADY OWN THAT ONE.', 'ALREADY YOURS, FRIEND.'],
    poke: ['HEY! NO TOUCHING THE SCREEN.', 'PLEASE DO NOT TAP THE GLASS.', 'OW. FINGERPRINTS.'],
  },
};

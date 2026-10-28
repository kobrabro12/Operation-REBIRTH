// THE SHOP (Trinkets > SHOP, ShopScene.js): what's for sale. Nothing yet - Mason decides what goes in.
// Each tab is a shelf; each item on it:
//   { name: 'ITEM NAME', price: 100, info: 'A LINE OR TWO\nABOUT IT.', color: 0xffd23a }
// (color: the tint of its placeholder icon until it has art). Empty shelf slots show COMING SOON.

// what the money is called, and its colour
export const CURRENCY = { name: 'COINS', color: 0xf3c358 };

// the shelves, left to right
export const SHOP = [
  { name: 'COSTUMES', items: [] },
  { name: 'STAGES', items: [] },
  { name: 'MUSIC', items: [] },
  { name: 'EXTRAS', items: [] },
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

// how much money the player has (nothing earns any yet)
export function getCoins() { return 0; }

// THE SHOPKEEPER: an old TV sitting on a desk (ShopScene.keeper). His faces are Mason's drawings
// (public/assets/shop/face_<name>.png, originals in tools/sprites/art/shopkeeper/) - each one a strip of 64x64 frames,
// so a face can be an animation: add frames to the right and they play at `fps`. Which face shows depends on what
// you're doing:
//   calm   his resting face        happy  greeting you, or showing you another shelf
//   money  you're looking at something for sale, or buying it
//   shock  you tried to buy nothing, or something you can't afford - or you poked his screen
export const KEEPER = {
  faces: { calm: { fps: 6 }, happy: { fps: 6 }, money: { fps: 8 }, shock: { fps: 8 } },
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
    poke: ['HEY! NO TOUCHING THE SCREEN.', 'PLEASE DO NOT TAP THE GLASS.', 'OW. FINGERPRINTS.'],
  },
};

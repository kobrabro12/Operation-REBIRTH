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
];

// how much money the player has (nothing earns any yet)
export function getCoins() { return 0; }

// THE SHOPKEEPER: a stick-figure robot with a TV for a head and white cartoon gloves (ShopScene.keeper). His hands act
// out each line (wave hello, rub them together over something pricey, throw them up in shock, point to a shelf, cheer
// at a sale, shrug when poked). His faces are Mason's drawings (public/assets/shop/face_<name>.png,
// originals in tools/sprites/art/shopkeeper/) - each one a strip of 64x64 frames, so a face can be an animation:
// add frames to the right and they play at `fps`. Which face shows depends on what you're doing:
//   happy  his usual face        money  you're looking at something for sale, or buying it
//   shock  you tried to buy nothing, or something you can't afford
export const KEEPER = {
  faces: { happy: { fps: 6 }, money: { fps: 8 }, shock: { fps: 8 } },
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
    poke: ['HEY! HANDS OFF THE MERCHANDISE.', 'I AM THE MERCHANDISE?', 'PLEASE DO NOT TAP THE GLASS.'],
  },
};

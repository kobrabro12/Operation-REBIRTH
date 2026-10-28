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

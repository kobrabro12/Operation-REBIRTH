// Milestone progress: how many KOs each fighter has scored, remembered in this browser.
// Every 25 KOs with a fighter unlocks one of their four milestone costumes (25 / 50 / 75 / 100).
// Only KOs scored by a human player in a real match count (not training, not CPUs, not self-destructs).
//
// Testing: open the game with ?kos=100 (or any number) to set every fighter's count, ?kos=0 to reset.

const KEY = 'rebirth.kos';
export const MILESTONE_KOS = [0, 25, 50, 75, 100];
let kos = {};
try { kos = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { kos = {}; }

function save() { try { localStorage.setItem(KEY, JSON.stringify(kos)); } catch (e) { /* storage unavailable */ } }

try {
  const q = new URLSearchParams(window.location.search).get('kos');
  if (q !== null && !isNaN(+q)) { for (const id of ['soul-summoner', 'mr-wake', 'hero-knight']) kos[id] = Math.max(0, Math.floor(+q)); save(); }
} catch (e) { /* no URL */ }

export function getKOs(id) { return kos[id] || 0; }

// Add one KO; returns the milestone tier newly reached (1-4), or 0.
export function addKO(id) {
  const before = getKOs(id);
  kos[id] = before + 1; save();
  const tier = MILESTONE_KOS.indexOf(kos[id]);
  return tier > 0 ? tier : 0;
}

// ---- the SHOP: coins, what you own, what you have switched on. Remembered in this browser.
// Testing: ?coins=5000 sets the coin count.
const SHOP_KEY = 'rebirth.shop';
const shop = { coins: 0, owned: [], music: null, stageFx: null, extras: [] };
try { Object.assign(shop, JSON.parse(localStorage.getItem(SHOP_KEY) || '{}') || {}); } catch (e) { /* keep the defaults */ }
function saveShop() { try { localStorage.setItem(SHOP_KEY, JSON.stringify(shop)); } catch (e) { /* storage unavailable */ } }
try {
  const q = new URLSearchParams(window.location.search).get('coins');
  if (q !== null && !isNaN(+q)) { shop.coins = Math.max(0, Math.floor(+q)); saveShop(); }
} catch (e) { /* no URL */ }

export function getCoins() { return shop.coins; }
// hidden shop items (shop.js `hidden: <tag>`) show up while their tag is revealed - e.g. 'noli' by the shopkeeper's code.
// Not saved: it only lasts until you leave the shop (ShopScene hides it again on the way out)
const shown = new Set();
export function revealed(tag) { return shown.has(tag); }
export function reveal(tag) { shown.add(tag); }
export function unreveal(tag) { shown.delete(tag); }
// a one-time gift of coins, given once per browser the next time the game loads (GIFTS: id -> coins)
const GIFTS = { 'mason-2000': 2000 };
try {
  const got = JSON.parse(localStorage.getItem('rebirth.gifts') || '[]') || [];
  for (const [id, n] of Object.entries(GIFTS)) if (!got.includes(id)) { shop.coins += n; got.push(id); saveShop(); }
  localStorage.setItem('rebirth.gifts', JSON.stringify(got));
} catch (e) { /* storage unavailable */ }
export function addCoins(n) { shop.coins = Math.max(0, shop.coins + Math.floor(n)); saveShop(); return shop.coins; }
export function owns(id) { return shop.owned.includes(id); }
// pay for an item; false if you can't afford it (or already have it)
export function buyItem(id, price) {
  if (owns(id) || shop.coins < price) return false;
  shop.coins -= price; shop.owned.push(id); saveShop(); return true;
}
// what's switched on: one battle track, one stage effect, any number of extras
// a prize from a gacha machine (already paid for): yours, free
export function grantItem(id) { if (!owns(id)) { shop.owned.push(id); saveShop(); } }
export function equippedMusic() { return shop.music && owns(shop.music) ? shop.music : null; }
export function equippedStageFx() { return shop.stageFx && owns(shop.stageFx) ? shop.stageFx : null; }
export function extraOn(id) { return shop.extras.includes(id) && owns(id); }
export function isEquipped(kind, id) { return kind === 'music' ? shop.music === id : kind === 'fx' ? shop.stageFx === id : kind === 'extra' ? shop.extras.includes(id) : false; }
// switch an owned item on or off; returns whether it's on now
export function toggleEquip(kind, id) {
  if (!owns(id)) return false;
  if (kind === 'music') shop.music = shop.music === id ? null : id;
  else if (kind === 'fx') shop.stageFx = shop.stageFx === id ? null : id;
  else if (kind === 'extra') shop.extras = shop.extras.includes(id) ? shop.extras.filter((x) => x !== id) : [...shop.extras, id];
  saveShop(); return isEquipped(kind, id);
}

// COINS FROM MATCHES (real matches only - not training, not the title demo), for each human player:
//   just for playing, per KO they scored, and for where they placed (1st, 2nd, 3rd). A typical match is worth
//   about 25-85 coins, so the shop fills up over a few hundred matches, not a couple.
export const COIN_RATES = { play: 15, ko: 10, place: [40, 20, 10, 0] };
export function matchCoins(place, kos) { return COIN_RATES.play + COIN_RATES.ko * kos + (COIN_RATES.place[place] || 0); }

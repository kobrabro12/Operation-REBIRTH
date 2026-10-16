// Colour variations (alternate costumes). Each fighter's sprite uses a small palette, so a skin is a set of
// rules that recolour whole colour groups (armour trim, cape, flame, eyes...) by moving their hue,
// saturation and brightness together. The shading inside each group survives, so it still looks hand-made.
// Recoloured sprite sheets are built once, the first time a skin is shown, and cached as textures.

// colour groups, in HSV (h 0..360, s and v 0..1). The first group a colour falls in wins.
const SS = {
  eyes: { h: [318, 332], center: 324 },
  flame: { h: [200, 215], s: [0.3, 1], center: 207 },
  gold: { h: [20, 46], s: [0.45, 1], center: 37 },
  cape: { h: [262, 298], center: 280 },
  armor: { h: [0, 40], s: [0, 0.3], v: [0.15, 1], center: 25 },
};
const MW = {
  robe: { h: [325, 350], s: [0.4, 1], center: 334 },
  magic: { h: [255, 285], s: [0.25, 1], v: [0.4, 1], center: 268 },
  cloth: { h: [255, 300], s: [0.15, 0.6], v: [0.15, 0.4], center: 268 },
  wood: { h: [15, 40], s: [0.4, 1], center: 27 },
};

// dark -> light polished gold
const GOLD_RAMP = [0x2a1804, 0x4a2c08, 0x6e440e, 0x965f16, 0xbb7f1f, 0xd9a32e, 0xedc04c, 0xf8d878, 0xfff0b8];

const HK = {
  sash: { h: [0, 15], s: [0.4, 1], center: 0 },
  suit: { h: [185, 215], s: [0.12, 0.6], center: 197 },
  white: { s: [0, 0.06], v: [0.85, 1], center: 0 },
  steel: { s: [0, 0.1], center: 0 },
};

// rule fields: to = target hue for the group's centre (the whole ramp moves with it), hue = set an exact hue (for greys),
// sat / val = multipliers, satAdd = added saturation (for tinting greys)
export const SKINS = {
  'soul-summoner': [
    { name: 'SOULFIRE', swatch: 0x076cc2 },
    { name: 'EMBER', swatch: 0xe0502a, fx: 0xf08040, groups: SS, rules: { cape: { to: 355, sat: 1.7, val: 1.1 }, flame: { to: 18 }, eyes: { to: 50 } } },
    { name: 'FROST', swatch: 0x9ad8f0, fx: 0x9ad8f0, groups: SS, rules: { gold: { sat: 0.12, val: 1.05 }, armor: { to: 210, satAdd: 0.18 }, cape: { to: 195, sat: 1.4 }, flame: { to: 186 }, eyes: { to: 190 } } },
    { name: 'PLAGUE', swatch: 0x4caf50, fx: 0x7ccf6a, groups: SS, rules: { gold: { to: 26, sat: 0.8, val: 0.82 }, cape: { to: 125, sat: 1.3 }, flame: { to: 110 }, eyes: { to: 80 } } },
    { name: 'SHADOW', swatch: 0x6d26bd, fx: 0xb07ad0, groups: SS, rules: { armor: { val: 0.6 }, gold: { to: 282, sat: 0.9 }, cape: { sat: 0.25, val: 0.7 }, flame: { to: 272 }, eyes: { to: 0, sat: 0, val: 1.1 } } },
    { name: 'ROYAL', swatch: 0x2b4fd8, fx: 0xf3c358, groups: SS, rules: { cape: { to: 228, sat: 1.9, val: 1.15 }, flame: { to: 45, sat: 0.9 }, eyes: { to: 205 } } },
    // pure black and white like an old monochrome handheld, with a white outline so he reads on any
    // stage; he raises his own 1-bit ghosts instead of flaming skulls (tools/sprites/onebit_minion.py)
    { name: '1-BIT', swatch: 0xf4f4f0, fx: 0xf4f4f0, groups: { all: { center: 0 } }, rules: { all: { ramp: [0x0e0e10, 0xf4f4f0], lo: 0.2, hi: 0.5 } }, outline: 0xf4f4f0, minion: 'soul_minion_1bit' },
  ],
  'hero-knight': [
    { name: 'KNIGHT', swatch: 0x667980 },
    { name: 'CRIMSON', swatch: 0x8a2a32, fx: 0xe07070, groups: HK, rules: { suit: { to: 352, sat: 2.2 }, sash: { to: 45, sat: 1.2, val: 1.4 }, white: { hue: 0, satAdd: 0.12 } } },
    { name: 'GILDED', swatch: 0xd9a63c, fx: 0xf3c358, groups: HK, rules: { steel: { hue: 40, satAdd: 0.42 }, suit: { to: 28, sat: 1.6 }, white: { hue: 46, satAdd: 0.22 } } },
    { name: 'VERDANT', swatch: 0x3f8f4c, fx: 0x9be36a, groups: HK, rules: { suit: { to: 135, sat: 2 }, sash: { to: 40 }, white: { hue: 110, satAdd: 0.18 } } },
    { name: 'SHADOW', swatch: 0x4a3a6a, fx: 0xb07ad0, groups: HK, rules: { suit: { to: 270, val: 0.65 }, steel: { val: 0.5 }, white: { hue: 275, satAdd: 0.4, val: 0.9 }, sash: { to: 280 } } },
    { name: 'AZURE', swatch: 0x2f6fd0, fx: 0x78a0c6, groups: HK, rules: { suit: { to: 220, sat: 2.6, val: 1.1 }, sash: { to: 45, val: 1.4 }, white: { hue: 205, satAdd: 0.2 } } },
    // every colour mapped by brightness onto a polished-gold ramp: armour, scarf, sash and sword all solid gold
    // changes during the match: the armour cracks more each time she loses a stock (see Fighter.updateWorn)
    { name: 'BATTLE-WORN', swatch: 0x6a5e58, worn: true },
    // red lacquered samurai armour, black kabuto with a gold crest, and a katana (pre-drawn strips, see heroKnight.costumeSheets)
    { name: 'SAMURAI', swatch: 0xb81e28, fx: 0xe85a4a, sheetSet: 'samurai' },
    { name: 'SOLID GOLD', swatch: 0xf3c358, fx: 0xffe08a, groups: { all: { center: 0 } }, rules: { all: { ramp: GOLD_RAMP, lo: 0.12, hi: 0.92 } } },
  ],
  'mr-wake': [
    { name: 'CRIMSON', swatch: 0x651b3a },
    { name: 'TIDE', swatch: 0x1b8a8a, fx: 0x3ad0b0, groups: MW, rules: { robe: { to: 182 }, magic: { to: 160 } } },
    { name: 'GILDED', swatch: 0xb8862b, fx: 0xf0a040, groups: MW, rules: { robe: { to: 38 }, magic: { to: 28 } } },
    { name: 'GHOST', swatch: 0xc9c4dc, fx: 0x9ad8f0, groups: MW, rules: { robe: { sat: 0.12, val: 2.4 }, cloth: { sat: 0.4, val: 1.6 }, magic: { to: 190 } } },
    { name: 'VENOM', swatch: 0x3f9a2a, fx: 0x9be564, groups: MW, rules: { robe: { to: 112 }, magic: { to: 84 } } },
    { name: 'NOBLE', swatch: 0x24357a, fx: 0xf3c358, groups: MW, rules: { robe: { to: 228 }, magic: { to: 45 }, cloth: { to: 220 } } },
  ],
};

export function skinsFor(id) { return SKINS[id] || [{ name: 'DEFAULT', swatch: 0xffffff }]; }
export function skinInfo(id, i) { const s = skinsFor(id); return s[((i || 0) % s.length + s.length) % s.length]; }

function rgb2hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx];
}
function hsv2rgb(h, s, v) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
const inRange = (val, r) => !r || (val >= r[0] && val <= r[1]);

function recolorFn(skin) {
  const cache = new Map();
  return (r, g, b) => {
    const k = (r << 16) | (g << 8) | b;
    if (cache.has(k)) return cache.get(k);
    let out = [r, g, b];
    const [h, s, v] = rgb2hsv(r, g, b);
    for (const [name, grp] of Object.entries(skin.groups)) {
      if (!inRange(h, grp.h) || !inRange(s, grp.s) || !inRange(v, grp.v)) continue;
      const rule = skin.rules[name];
      if (rule && rule.ramp) {                            // remap by brightness onto a fixed colour ramp (e.g. solid gold)
        const k = Math.min(1, Math.max(0, (v - (rule.lo ?? 0.05)) / ((rule.hi ?? 0.95) - (rule.lo ?? 0.05))));
        const c = rule.ramp[Math.min(rule.ramp.length - 1, Math.floor(k * rule.ramp.length))];
        out = [(c >> 16) & 255, (c >> 8) & 255, c & 255];
      } else if (rule) {
        const nh = rule.hue !== undefined ? rule.hue : rule.to !== undefined ? (h + rule.to - grp.center + 720) % 360 : h;
        const ns = Math.min(1, Math.max(0, s * (rule.sat ?? 1) + (rule.satAdd || 0)));
        const nv = Math.min(1, v * (rule.val ?? 1));
        out = hsv2rgb(nh, ns, nv);
      }
      break;
    }
    cache.set(k, out);
    return out;
  };
}

// The texture key of `key` recoloured with skin i of fighter `id` (built on first use).
export function skinTexture(scene, key, id, i) {
  const skin = skinInfo(id, i);
  if (!skin.rules || !key) return key;
  const nk = key + '@' + skin.name;
  const tm = scene.textures;
  if (tm.exists(nk)) return nk;
  const src = tm.get(key), img = src.getSourceImage(), f0 = src.get(0);
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, cv.width, cv.height), p = data.data, fn = recolorFn(skin);
  for (let n = 0; n < p.length; n += 4) {
    if (!p[n + 3]) continue;
    const [r, g, b] = fn(p[n], p[n + 1], p[n + 2]);
    p[n] = r; p[n + 1] = g; p[n + 2] = b;
  }
  if (skin.outline !== undefined) {                      // 1 px outline around the silhouette, inside each frame
    const W = cv.width, H = cv.height, fw = f0.width, fh = f0.height, o = skin.outline;
    const a = new Uint8Array(W * H);
    for (let n = 0; n < W * H; n++) a[n] = p[n * 4 + 3] > 0 ? 1 : 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (a[y * W + x]) continue;
        const fx = x % fw, fy = y % fh;
        if ((fx > 0 && a[y * W + x - 1]) || (fx < fw - 1 && a[y * W + x + 1]) || (fy > 0 && a[(y - 1) * W + x]) || (fy < fh - 1 && a[(y + 1) * W + x])) {
          const n = (y * W + x) * 4; p[n] = (o >> 16) & 255; p[n + 1] = (o >> 8) & 255; p[n + 2] = o & 255; p[n + 3] = 255;
        }
      }
    }
  }
  ctx.putImageData(data, 0, 0);
  tm.addSpriteSheet(nk, cv, { frameWidth: f0.width, frameHeight: f0.height });
  if (src.has('portrait')) { const pf = src.get('portrait'); tm.get(nk).add('portrait', 0, pf.cutX, pf.cutY, pf.cutWidth, pf.cutHeight); }
  return nk;
}

// All of a fighter's sheets for one skin: { idle, juggle, walk, ... } -> recoloured texture keys.
export function skinSheets(scene, def, i) {
  const set = skinInfo(def.id, i).sheetSet;
  if (set && def.costumeSheets && def.costumeSheets[set]) return { ...def.costumeSheets[set] };   // a costume with its own drawn strips
  const out = {};
  for (const [k, key] of Object.entries(def.sheets)) out[k] = skinTexture(scene, key, def.id, i);
  return out;
}

// Give every player a skin; two players on the same fighter never share one.
export function resolveSkins(picks, wanted) {
  const used = {}, out = [];
  picks.forEach((id, slot) => {
    const n = skinsFor(id).length;
    let s = ((wanted[slot] || 0) % n + n) % n;
    used[id] = used[id] || new Set();
    for (let k = 0; k < n && used[id].has(s); k++) s = (s + 1) % n;
    used[id].add(s); out.push(s);
  });
  return out;
}

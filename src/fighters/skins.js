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
  staff: { s: [0, 0.12], v: [0.12, 0.4], center: 0 },     // the grey staff (and his boots)
};

// dark -> light polished gold
const GOLD_RAMP = [0x2a1804, 0x4a2c08, 0x6e440e, 0x965f16, 0xbb7f1f, 0xd9a32e, 0xedc04c, 0xf8d878, 0xfff0b8];

// ---- milestone costume ramps
const ABYSS_RAMP = [0x02060c, 0x041222, 0x072238, 0x0c3452, 0x13496c, 0x1c6288];
const RADIANT_RAMP = [0x5a3a10, 0x8a5e1c, 0xb8862b, 0xdcae4a, 0xf3cf74, 0xffe7a8, 0xfff6dc, 0xffffff];
const PUMPKIN_RAMP = [0x2a0e04, 0x5a2006, 0x8e3608, 0xc4520c, 0xe8701a, 0xffa040];
const KING_CAPE_RAMP = [0x050307, 0x0d0910, 0x17101a, 0x241826, 0x342234];

const NUG = {
  acid: { h: [65, 105], s: [0.35, 1], v: [0.3, 1], center: 84 },
  hair: { h: [38, 62], s: [0.06, 0.5], v: [0.6, 1], center: 48 },
  cloth: { h: [230, 300], s: [0.05, 0.35], v: [0.1, 0.4], center: 258 },
};
// WHAT ONCE WAS (test fighter): its wallpaper skin (the screen's warning sign is too saturated to count)
const WOWG = {
  skin: { h: [36, 62], s: [0.2, 0.72], v: [0.25, 1], center: 48 },
};
const AEG = {
  aqua: { h: [180, 215], s: [0.3, 1], v: [0.3, 1], center: 196 },
  lime: { h: [75, 110], s: [0.3, 1], center: 92 },
  fish: { h: [10, 40], s: [0.5, 1], v: [0.5, 1], center: 24 },
};
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
    { name: '1-BIT', swatch: 0xf4f4f0, fx: 0xf4f4f0, groups: { all: { center: 0 } }, rules: { all: { ramp: [0x0e0e10, 0xf4f4f0], lo: 0.2, hi: 0.5 } }, outline: 0xf4f4f0, minion: 'soul_minion_1bit', style: 'onebit',
      pal: { outline: 0xf4f4f0, deep: 0x0e0e10, mid: 0xf4f4f0, light: 0x2a2a2e, core: 0xf4f4f0, shade: 0x0e0e10, void: 0x050506 } },
    // a carved-pumpkin knight: orange cape, a candle-yellow flame, eyes like cut-out holes; his hits scatter bats
    { name: "JACK-O'-LANTERN", swatch: 0xf07a1a, fx: 0xffb02a, groups: SS, rules: { cape: { ramp: PUMPKIN_RAMP, lo: 0.08, hi: 0.55 }, flame: { to: 44, sat: 1.1, val: 1.2 }, gold: { to: 28, sat: 1.15, val: 1.05 }, eyes: { to: 50, val: 1.2 }, armor: { sat: 0.4, val: 0.55 } },
      vfx: { hit: { shape: 'bat', colors: [0x16101c, 0x2a1a30, 0xffb02a], n: 6, sparks: [0xffb02a, 0xf07a1a] }, minion: { flame: { to: 40, sat: 1.1 }, eyes: { to: 48 } } } },
    // ---- MILESTONES: "The Hollow Crown". A gravekeeper hears the dead whisper, binds them, becomes
    // a lich, and finally takes the throne of every soul he has ever raised.
    { name: 'GRAVEKEEPER', milestone: 1, swatch: 0x6f7d4a, fx: 0x9bbf6a,
      lore: 'A lowly gravekeeper hears the dead whisper his name.',
      groups: SS, rules: { cape: { to: 70, sat: 0.55, val: 0.72 }, flame: { to: 100, sat: 0.75 }, gold: { sat: 0.45, val: 0.75 }, eyes: { to: 95 }, armor: { val: 0.9 } },
      vfx: { hit: { shape: 'dust', colors: [0x9bbf6a, 0x6f7d4a, 0xc9c4a0], n: 8 }, minion: { flame: { to: 100, sat: 0.75 }, eyes: { to: 95 } } } },
    { name: 'WRAITHBINDER', milestone: 2, swatch: 0x1f8f8a, fx: 0x5ff0d6,
      lore: 'He learns to bind them. Two loyal wraiths never leave his side.',
      groups: SS, rules: { cape: { to: 182, sat: 0.8, val: 0.55 }, flame: { to: 170, sat: 1.1 }, gold: { sat: 0.1, val: 1.1 }, eyes: { to: 172 }, armor: { to: 195, satAdd: 0.1, val: 0.75 } },
      vfx: { hit: { shape: 'wisp', colors: [0x5ff0d6, 0xb8fff4, 0x1f8f8a], n: 6, ring: 0x5ff0d6 },
             aura: { orbit: { n: 2, colors: [0x5ff0d6, 0xb8fff4], r: 22 } }, minion: { flame: { to: 170, sat: 1.1 }, eyes: { to: 172 } } } },
    { name: 'LICH', milestone: 3, swatch: 0x7a3fd0, fx: 0xc77dff,
      lore: 'His flesh falls away. A crown of violet fire burns above his skull.',
      groups: SS, rules: { cape: { to: 272, sat: 1.25, val: 0.7 }, flame: { to: 278, sat: 1.1 }, gold: { to: 45, sat: 0.3, val: 1.2 }, eyes: { to: 118, sat: 1.2 }, armor: { to: 42, satAdd: 0.08, val: 1.3 } },
      vfx: { hit: { shape: 'skull', colors: [0xe8dcff, 0xc77dff], n: 3, ring: 0xc77dff, sparks: [0xc77dff, 0x7a3fd0] },
             aura: { crown: { n: 3, colors: [0xc77dff, 0xe8b8ff, 0xffffff] }, motes: { colors: [0xc77dff, 0x7a3fd0], rate: 6 } }, minion: { flame: { to: 278, sat: 1.1 }, eyes: { to: 118 } } } },
    { name: 'THE HOLLOW KING', milestone: 4, swatch: 0xf3c358, fx: 0xffe08a,
      lore: 'Every soul he ever raised kneels. The Hollow King takes his throne.',
      groups: SS, rules: { cape: { ramp: KING_CAPE_RAMP, lo: 0.1, hi: 0.6 }, armor: { sat: 0, val: 0.38 }, gold: { ramp: GOLD_RAMP, lo: 0.3, hi: 1 }, flame: { to: 46, sat: 0.55, val: 1.25 }, eyes: { to: 48, sat: 0.4, val: 1.2 } },
      outline: 0x8a6a20,
      vfx: { hit: { shape: 'shard', colors: [0xffe08a, 0xfff6dc, 0xf3c358], n: 12, ring: 0xffe08a, ring2: 0xffffff, flash: true },
             aura: { crown: { n: 5, colors: [0xffe08a, 0xfff6dc, 0xffffff], big: true }, orbit: { n: 4, colors: [0xffe08a, 0xfff6dc], r: 26 }, motes: { colors: [0xffe08a, 0xf3c358, 0xffffff], rate: 3 } },
             trail: 0xf3c358, minion: { flame: { to: 46, sat: 0.55, val: 1.25 }, eyes: { to: 48, sat: 0.4 } } } },
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
    { name: 'SAMURAI', swatch: 0xb81e28, fx: 0xe85a4a, sheetSet: 'samurai', style: 'samurai',
      pal: { outline: 0x1a0406, deep: 0xa01820, mid: 0xe0402a, light: 0xffb7c5, core: 0xffffff, shade: 0x2a0a0c, void: 0x0a0204 } },
    { name: 'SOLID GOLD', swatch: 0xf3c358, fx: 0xffe08a, groups: { all: { center: 0 } }, rules: { all: { ramp: GOLD_RAMP, lo: 0.12, hi: 0.92 } } },
    // 1-BIT: the same monochrome-handheld look as Soul Summoner's 1-BIT - pure black and white with a white
    // outline. A blade that runs like a program: her specials and Limit glitch in pixels, and she talks
    // in terminal lines (Fighter.quip / cutLine)
    // edges: black lines drawn wherever two different parts of her meet (armour, cloth, hair, sword...)
    // and just inside her white outline, so the black-and-white body still reads
    { name: '1-BIT', swatch: 0xf4f4f0, fx: 0xf4f4f0, groups: { all: { center: 0 } }, rules: { all: { ramp: [0x0e0e10, 0xf4f4f0], lo: 0.2, hi: 0.5 } }, outline: 0xf4f4f0, edges: { color: 0x0e0e10, diff: 0.16, rim: true }, style: 'onebit',
      pal: { outline: 0xf4f4f0, deep: 0x0e0e10, mid: 0xf4f4f0, light: 0x2a2a2e, core: 0xf4f4f0, shade: 0x0e0e10, void: 0x050506 } },
    // AKATSUKI ("dawn"): a wandering hero out of a Japanese adventure story - crimson tunic, leather belt,
    // wrapped cloth boots and a crystal-bladed sword. She shouts her moves like an anime hero, her hits burst
    // into crystal shards with sound-effect lettering, and her Limit is a named secret art (style 'hero')
    { name: 'AKATSUKI', swatch: 0xb0202c, fx: 0x6fd6f0, sheetSet: 'akatsuki', style: 'hero',
      pal: { outline: 0x0a3a4a, deep: 0x2a8fb0, mid: 0x6fd6f0, light: 0xbff6ff, core: 0xffffff, shade: 0x0a2a3a, void: 0x04121a } },
    // STARLIGHT: a night-sky knight - midnight-blue suit, gold sash, silver-white steel; her hits throw stars
    { name: 'STARLIGHT', swatch: 0x22306a, fx: 0xffe08a, groups: HK, rules: { suit: { to: 228, sat: 2.0, val: 0.62 }, sash: { to: 44, sat: 1.1, val: 1.5 }, white: { hue: 50, satAdd: 0.12 }, steel: { hue: 220, satAdd: 0.1, val: 1.2 } },
      vfx: { hit: { shape: 'star', colors: [0xffe08a, 0xffffff, 0x9ab8ff], n: 7, glint: true } } },
    // ---- MILESTONES: "The Oath". A squire in hand-me-down bronze swears an oath, earns her
    // knighthood, is blessed as a paladin, and finally rises as a seraph of the blade.
    { name: 'SQUIRE', milestone: 1, swatch: 0xa86a32, fx: 0xe0a060,
      lore: 'Hand-me-down bronze and a borrowed sword. She swears the oath anyway.',
      groups: HK, rules: { steel: { hue: 30, satAdd: 0.38, val: 0.95 }, suit: { to: 24, sat: 1.3, val: 0.9 }, sash: { to: 215, sat: 0.9 } },
      vfx: { hit: { shape: 'spark', colors: [0xe0a060, 0xffd8a0, 0xa86a32], n: 9 } } },
    { name: 'KNIGHT-CAPTAIN', milestone: 2, swatch: 0x2f5fc0, fx: 0x8fc0ff,
      lore: 'Knighted on the field. Polished steel, royal blue, and a blade that sings.',
      groups: HK, rules: { steel: { hue: 212, satAdd: 0.1, val: 1.15 }, suit: { to: 224, sat: 2.4, val: 1.05 }, sash: { to: 46, sat: 1.1, val: 1.5 } },
      vfx: { hit: { shape: 'spark', colors: [0x8fc0ff, 0xffffff, 0x2f5fc0], n: 10, ring: 0x8fc0ff, glint: true } } },
    { name: 'PALADIN', milestone: 3, swatch: 0xf0e6c8, fx: 0xffe08a,
      lore: 'Blessed in white and gold. Light gathers wherever her sword falls.',
      groups: HK, rules: { steel: { hue: 44, satAdd: 0.06, val: 1.45 }, suit: { to: 42, sat: 2.2, val: 1.25 }, sash: { to: 350, sat: 1.1, val: 1.1 }, white: { hue: 45, satAdd: 0.14 } },
      vfx: { hit: { shape: 'cross', colors: [0xffe08a, 0xffffff], n: 6, ring: 0xffe08a, glint: true },
             aura: { halo: 0xffe08a, motes: { colors: [0xffe08a, 0xffffff], rate: 7 } } } },
    { name: 'SERAPH', milestone: 4, swatch: 0xfff3c0, fx: 0xfff3c0,
      lore: 'The oath is fulfilled. She rises on wings of light, a seraph of the blade.',
      groups: HK, rules: { steel: { ramp: RADIANT_RAMP, lo: 0.25, hi: 0.8 }, suit: { ramp: RADIANT_RAMP.slice(0, 6), lo: 0.2, hi: 0.6 }, sash: { to: 192, sat: 0.9, val: 1.6 }, white: { hue: 48, satAdd: 0.1 } },
      outline: 0xb8862b,
      vfx: { hit: { shape: 'feather', colors: [0xffffff, 0xfff3c0, 0xffe08a], n: 10, ring: 0xfff3c0, ring2: 0xffffff, pillar: 0xfff3c0, flash: true },
             aura: { wings: [0xffffff, 0xfff3c0, 0xf3cf74], halo: 0xfff3c0, motes: { colors: [0xffffff, 0xfff3c0], rate: 4, feathers: true } },
             trail: 0xfff3c0 } },
  ],
  // NU (test fighter): a hit of his always throws out music notes in his colours
  'nu': [
    { name: 'ACID', swatch: 0x9be32a, vfx: { hit: { shape: 'note', colors: [0x9be32a, 0xe8ffb0, 0xffffff], n: 6 } } },
    { name: 'BLOODLINE', swatch: 0xe0302a, fx: 0xff5a4a, groups: NUG, rules: { acid: { to: 358, sat: 1.1 }, hair: { hue: 0, sat: 0.2, val: 0.32 }, cloth: { val: 0.85 } },
      pal: { outline: 0x1a0406, deep: 0x7a0a10, mid: 0xc81e28, light: 0xff5a4a, core: 0xffd0c8, shade: 0x2a0a0c, void: 0x0a0204 },
      vfx: { hit: { shape: 'note', colors: [0xff5a4a, 0xffd0c8, 0xffffff], n: 6 } } },
    { name: 'FROSTBITE', swatch: 0x5ad8f0, fx: 0x9ae8ff, groups: NUG, rules: { acid: { to: 192 }, hair: { hue: 200, sat: 0.15, val: 1.05 }, cloth: { to: 222, sat: 1.8, val: 1.1 } },
      pal: { outline: 0x0a1a2a, deep: 0x1a6a9a, mid: 0x3ab0e0, light: 0x9ae8ff, core: 0xf0fcff, shade: 0x0e2a3a, void: 0x040c12 },
      vfx: { hit: { shape: 'note', colors: [0x9ae8ff, 0xf0fcff, 0x3ab0e0], n: 6 } } },
    { name: 'TOXIC', swatch: 0xa04ae0, fx: 0xc88aff, groups: NUG, rules: { acid: { to: 280, sat: 1.0 }, hair: { to: 100, sat: 1.6, val: 0.9 }, cloth: { to: 280, sat: 1.4 } },
      pal: { outline: 0x14081e, deep: 0x4a1a7a, mid: 0x7a3ad0, light: 0xc88aff, core: 0xf0e0ff, shade: 0x1e0a2e, void: 0x08040e },
      vfx: { hit: { shape: 'note', colors: [0xc88aff, 0x9be32a, 0xffffff], n: 6 } } },
    { name: 'PLATINUM', swatch: 0xd8dce4, fx: 0xf3c358, groups: NUG, rules: { acid: { to: 44, sat: 0.9, val: 1.1 }, hair: { hue: 46, sat: 0.6 }, cloth: { sat: 0.15, val: 2.6 } },
      pal: { outline: 0x2a1c06, deep: 0x8a6a1c, mid: 0xd9a32e, light: 0xf3c358, core: 0xfff4c8, shade: 0x3a2a0a, void: 0x120c02 },
      vfx: { hit: { shape: 'note', colors: [0xf3c358, 0xfff4c8, 0xffffff], n: 7, glint: true } } },
    { name: '1-BIT', swatch: 0xf4f4f0, fx: 0xf4f4f0, groups: { all: { center: 0 } }, rules: { all: { ramp: [0x0e0e10, 0xf4f4f0], lo: 0.12, hi: 0.4 } }, outline: 0xf4f4f0, edges: { color: 0x0e0e10, diff: 0.16, rim: true }, style: 'onebit',
      pal: { outline: 0xf4f4f0, deep: 0x0e0e10, mid: 0xf4f4f0, light: 0x2a2a2e, core: 0xf4f4f0, shade: 0x0e0e10, void: 0x050506 } },
  ],
  // WHAT ONCE WAS (test fighter): TV static bursts off every hit
  'what-once-was': [
    { name: 'WALLPAPER', swatch: 0xcdb85a, vfx: { hit: { shape: 'pixel2', colors: [0xf0f0f0, 0x9a9a9a, 0x4a4a4a], n: 7 } } },
    { name: 'POOLROOMS', swatch: 0xd8eef2, fx: 0xb8f0ff, groups: WOWG, rules: { skin: { to: 192, sat: 0.35, val: 1.18 } },
      pal: { outline: 0x0a1a24, deep: 0x1a7a9a, mid: 0x4ac0e0, light: 0xb8f0ff, core: 0xffffff, shade: 0x0e3a48, void: 0x041014 },
      vfx: { hit: { shape: 'drop', colors: [0xb8f0ff, 0xffffff, 0x4ac0e0], n: 8 } } },
    { name: 'ROT', swatch: 0x6a8a3a, fx: 0xb8e070, groups: WOWG, rules: { skin: { to: 92, sat: 0.9, val: 0.8 } },
      pal: { outline: 0x0e1406, deep: 0x3a5a1a, mid: 0x6a8a3a, light: 0xb8e070, core: 0xf0ffd0, shade: 0x1a2a0a, void: 0x060a02 },
      vfx: { hit: { shape: 'dust', colors: [0x6a8a3a, 0x2a3a14, 0xb8e070], n: 8 } } },
    { name: 'LIGHTS OUT', swatch: 0x34322e, fx: 0xff4a3a, groups: WOWG, rules: { skin: { sat: 0.15, val: 0.42 } },
      pal: { outline: 0x140406, deep: 0x5a0a10, mid: 0xb01a22, light: 0xff4a3a, core: 0xffc8c0, shade: 0x200608, void: 0x060102 },
      vfx: { hit: { shape: 'pixel2', colors: [0xff4a3a, 0x5a0a10, 0xffc8c0], n: 7 } } },
    { name: '1-BIT', swatch: 0xf4f4f0, fx: 0xf4f4f0, groups: { all: { center: 0 } }, rules: { all: { ramp: [0x0e0e10, 0xf4f4f0], lo: 0.15, hi: 0.5 } }, outline: 0xf4f4f0, edges: { color: 0x0e0e10, diff: 0.16, rim: true }, style: 'onebit',
      pal: { outline: 0xf4f4f0, deep: 0x0e0e10, mid: 0xf4f4f0, light: 0x2a2a2e, core: 0xf4f4f0, shade: 0x0e0e10, void: 0x050506 } },
  ],
  // AERO (test fighter): glossy bubbles on every hit
  'aero': [
    { name: 'AERO', swatch: 0x3fc8ea, vfx: { hit: { shape: 'bubble', colors: [0x9ff0ff, 0xffffff], n: 7, ring: 0x9ff0ff, glint: true } } },
    { name: 'MEADOW', swatch: 0x8be04a, fx: 0xd6ff9a, groups: AEG, rules: { aqua: { to: 112, sat: 0.9 }, lime: { to: 52, sat: 1.1 } },
      pal: { outline: 0x1e3a0a, deep: 0x3a8a1a, mid: 0x6fd03a, light: 0xc8ff8a, core: 0xffffff, shade: 0x1e4a0a, void: 0x081404 },
      vfx: { hit: { shape: 'feather', colors: [0xc8ff8a, 0xffffff, 0x6fd03a], n: 6, glint: true } } },
    { name: 'BLOSSOM', swatch: 0xff9ad0, fx: 0xffc8e8, groups: AEG, rules: { aqua: { to: 330, sat: 0.7, val: 1.05 }, lime: { to: 300, sat: 0.6 }, fish: { to: 0, sat: 0.2, val: 1.2 } },
      pal: { outline: 0x4a0e30, deep: 0xc0408a, mid: 0xff7ac0, light: 0xffc8e8, core: 0xffffff, shade: 0x5a1a40, void: 0x180610 },
      vfx: { hit: { shape: 'sakura', colors: [0xffc8e8, 0xffffff, 0xff7ac0], n: 7 } } },
    { name: 'NIGHT GLASS', swatch: 0x1a2a6a, fx: 0x7ad6ff, groups: AEG, rules: { aqua: { to: 225, sat: 1.1, val: 0.55 }, lime: { to: 190 } },
      pal: { outline: 0x050a1e, deep: 0x1a2a6a, mid: 0x3a6ad0, light: 0x7ad6ff, core: 0xffffff, shade: 0x0a1030, void: 0x02040e },
      vfx: { hit: { shape: 'star', colors: [0x7ad6ff, 0xffffff, 0xffe08a], n: 6, glint: true } } },
    { name: 'KOI', swatch: 0xffffff, fx: 0xff6a4a, groups: AEG, rules: { aqua: { to: 12, sat: 0.9 }, lime: { to: 44, sat: 1.0 }, fish: { sat: 0.15, val: 1.3 } },
      pal: { outline: 0x3a0a04, deep: 0xc03a1a, mid: 0xff6a4a, light: 0xffc0a8, core: 0xffffff, shade: 0x4a1a0a, void: 0x140402 },
      vfx: { hit: { shape: 'bubble', colors: [0xffc0a8, 0xffffff], n: 7, ring: 0xff6a4a } } },
    { name: '1-BIT', swatch: 0xf4f4f0, fx: 0xf4f4f0, groups: { all: { center: 0 } }, rules: { all: { ramp: [0x0e0e10, 0xf4f4f0], lo: 0.2, hi: 0.6 } }, outline: 0xf4f4f0, edges: { color: 0x0e0e10, diff: 0.16, rim: true }, style: 'onebit',
      pal: { outline: 0xf4f4f0, deep: 0x0e0e10, mid: 0xf4f4f0, light: 0x2a2a2e, core: 0xf4f4f0, shade: 0x0e0e10, void: 0x050506 } },
  ],
  'mr-wake': [
    { name: 'CRIMSON', swatch: 0x651b3a },
    { name: 'TIDE', swatch: 0x1b8a8a, fx: 0x3ad0b0, groups: MW, rules: { robe: { to: 182 }, magic: { to: 160 } } },
    { name: 'GILDED', swatch: 0xb8862b, fx: 0xf0a040, groups: MW, rules: { robe: { to: 38 }, magic: { to: 28 } } },
    { name: 'GHOST', swatch: 0xc9c4dc, fx: 0x9ad8f0, groups: MW, rules: { robe: { sat: 0.12, val: 2.4 }, cloth: { sat: 0.4, val: 1.6 }, magic: { to: 190 } } },
    { name: 'VENOM', swatch: 0x3f9a2a, fx: 0x9be564, groups: MW, rules: { robe: { to: 112 }, magic: { to: 84 } } },
    // overgrown with roses, and his staff is a giant tulip (pre-drawn sheet, see mrWake.costumeSheets)
    { name: 'ROSEBUD', swatch: 0xd6336c, fx: 0xff7aa8, sheetSet: 'roses', style: 'rose',
      pal: { outline: 0x3a0412, deep: 0x9a1240, mid: 0xd6336c, light: 0xff7aa8, core: 0xffc8da, shade: 0x1d3d1e, void: 0x0a1a0c } },
    { name: 'NOBLE', swatch: 0x24357a, fx: 0xf3c358, groups: MW, rules: { robe: { to: 228 }, magic: { to: 45 }, cloth: { to: 220 } } },
    // 1-BIT: the third of the monochrome-handheld set - black and white, a white outline, black lines where
    // his parts meet; his orb, pool and Undertow glitch in pixels and he talks like a terminal
    { name: '1-BIT', swatch: 0xf4f4f0, fx: 0xf4f4f0, groups: { all: { center: 0 } }, rules: { all: { ramp: [0x0e0e10, 0xf4f4f0], lo: 0.05, hi: 0.27 } }, outline: 0xf4f4f0, edges: { color: 0x0e0e10, diff: 0.16, rim: true }, style: 'onebit',
      pal: { outline: 0xf4f4f0, deep: 0x0e0e10, mid: 0xf4f4f0, light: 0x2a2a2e, core: 0xf4f4f0, shade: 0x0e0e10, void: 0x050506 } },
    // NEON: straight out of the Neon Arcade - hot pink robe, electric cyan gem, hits that burst into neon pixels
    { name: 'NEON', swatch: 0xff4fd8, fx: 0x4ff0ff, groups: MW, rules: { robe: { to: 318, sat: 1.25, val: 1.6 }, magic: { to: 186, sat: 1.1, val: 1.25 }, cloth: { to: 262, sat: 1.4, val: 1.2 }, wood: { to: 300, sat: 0.9 } },
      vfx: { hit: { shape: 'pixel2', colors: [0xff4fd8, 0x4ff0ff, 0xffffff, 0xb46bff], n: 9, ring: 0x4ff0ff } } },
    // ---- MILESTONES: "The Abyss Answers". Every KO drags him deeper into the sea, until the
    // ocean itself crowns him.
    { name: 'RIPTIDE', milestone: 1, swatch: 0x2a8ad0, fx: 0x7ad0ff,
      lore: 'The tide turns. His cloak is soaked through with sea water.',
      groups: MW, rules: { robe: { to: 192, sat: 1.0, val: 1.4 }, magic: { to: 186 }, cloth: { to: 200, val: 1.25 } },
      vfx: { hit: { shape: 'drop', colors: [0x7ad0ff, 0xc8f0ff, 0x2a8ad0], n: 10 } } },
    { name: 'DEEPWATER', milestone: 2, swatch: 0x14306a, fx: 0x5ff0f0,
      lore: 'Pulled under. Bubbles stream from him as the gem learns to glow in the dark.',
      groups: MW, rules: { robe: { to: 224, sat: 1.0, val: 0.72 }, magic: { to: 182, val: 1.25 }, cloth: { to: 226, val: 0.8 } },
      vfx: { hit: { shape: 'bubble', colors: [0x5ff0f0, 0xc8f0ff], n: 8, ring: 0x5ff0f0, drops: true },
             aura: { bubbles: { colors: [0x5ff0f0, 0xc8f0ff], rate: 10 } } } },
    { name: "ANGLER'S PACT", milestone: 3, swatch: 0x0d3a36, fx: 0xd8ff6a,
      lore: 'In the black trench he strikes a pact. His staff becomes a lure; his skin, a lantern.',
      groups: MW, rules: { robe: { to: 172, sat: 0.9, val: 0.45 }, magic: { to: 72, sat: 1.1, val: 1.3 }, cloth: { to: 180, val: 0.6 }, wood: { to: 160, sat: 0.35, val: 0.8 }, staff: { hue: 150, satAdd: 0.22, val: 1.1 } },
      vfx: { hit: { shape: 'whirl', colors: [0xd8ff6a, 0x5ff0d0], n: 1, bubbles: true, ring: 0x5ff0d0 },
             aura: { bubbles: { colors: [0x5ff0d0, 0xd8ff6a], rate: 8 }, spots: { colors: [0x5ff0d0, 0xd8ff6a], n: 7 } } } },
    { name: 'TIDEFATHER', milestone: 4, swatch: 0x0a2a48, fx: 0x5ff0e6,
      lore: 'The abyss answers. Crowned in coral, the ocean itself moves when he does.',
      groups: MW, rules: { robe: { ramp: ABYSS_RAMP, lo: 0.08, hi: 0.5 }, magic: { to: 176, sat: 0.9, val: 1.35 }, cloth: { to: 214, val: 0.55 }, wood: { to: 44, sat: 1.1, val: 1.35 }, staff: { ramp: GOLD_RAMP.slice(1, 7), lo: 0.12, hi: 0.36 } },
      outline: 0x1f8f9a,
      vfx: { hit: { shape: 'drop', colors: [0x5ff0e6, 0xffffff, 0x1c6288], n: 14, ring: 0x5ff0e6, ring2: 0xffffff, whirl: true, bubbles: true, flash: true },
             aura: { ribbons: { colors: [0x5ff0e6, 0xb8fff4] }, coral: [0xff8a7a, 0xf3c358], bubbles: { colors: [0x5ff0e6, 0xffffff], rate: 5 } },
             trail: 0x5ff0e6 } },
  ],
};

import { getKOs, MILESTONE_KOS } from '../progress.js';

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
  return recolorTexture(scene, key, key + '@' + skin.name, skin);
}

// The minion a milestone costume raises: Soul Summoner's soul sheet with its flame recoloured.
export function minionTexture(scene, id, i) {
  const skin = skinInfo(id, i), m = (skin.vfx && skin.vfx.minion) || (skin.groups === SS && skin.rules);   // milestone souls, or the costume's own colours
  if (!m || !scene.textures.exists('soul_minion')) return null;
  return recolorTexture(scene, 'soul_minion', 'soul_minion@' + skin.name, { groups: SS, rules: m });
}

// Pixels on a boundary between two clearly different colours of the ORIGINAL art (the lighter side of
// the boundary, so lines stay 1 px), and with rim: true every pixel touching transparency. Used by the
// monochrome costumes, where recolouring alone would merge neighbouring parts into one white blob.
function findEdges(p, W, H, fw, fh, opt) {
  const n = W * H, lum = new Float32Array(n), hue = new Float32Array(n), sat = new Float32Array(n), op = new Uint8Array(n), out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    op[i] = p[i * 4 + 3] > 200 ? 1 : 0;
    if (!op[i]) continue;
    const [h, s, v] = rgb2hsv(p[i * 4], p[i * 4 + 1], p[i * 4 + 2]); lum[i] = v; hue[i] = h; sat[i] = s;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!op[i]) continue;
    const fx = x % fw, fy = y % fh;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = fx + dx, ny = fy + dy;
      if (nx < 0 || ny < 0 || nx >= fw || ny >= fh) continue;
      const j = i + dy * W + dx;
      if (!op[j]) { if (opt.rim) out[i] = 1; continue; }
      const dh = Math.min(Math.abs(hue[i] - hue[j]), 360 - Math.abs(hue[i] - hue[j]));
      const different = Math.abs(lum[i] - lum[j]) > opt.diff || (sat[i] > 0.25 && sat[j] > 0.25 && dh > 40) || Math.abs(sat[i] - sat[j]) > 0.3;
      if (different && lum[i] >= lum[j]) out[i] = 1;
    }
  }
  return out;
}

function recolorTexture(scene, key, nk, skin) {
  const tm = scene.textures;
  if (tm.exists(nk)) return nk;
  const src = tm.get(key), img = src.getSourceImage(), f0 = src.get(0);
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, cv.width, cv.height), p = data.data, fn = recolorFn(skin);
  const edge = skin.edges ? findEdges(p, cv.width, cv.height, f0.width, f0.height, skin.edges) : null;
  for (let n = 0; n < p.length; n += 4) {
    if (!p[n + 3]) continue;
    const [r, g, b] = fn(p[n], p[n + 1], p[n + 2]);
    p[n] = r; p[n + 1] = g; p[n + 2] = b;
  }
  if (edge) { const c = skin.edges.color; for (let n = 0; n < edge.length; n++) if (edge[n]) { p[n * 4] = (c >> 16) & 255; p[n * 4 + 1] = (c >> 8) & 255; p[n * 4 + 2] = c & 255; } }
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

// ---- ability palettes: the colours a fighter's specials, projectiles and Limit are drawn in.
// The default costume keeps the fighter's own palette (def.pal); every other costume derives one from
// its signature colour (skin.fx) so fireballs, bolts, rings and beams match the outfit.
// keys: outline (darkest), deep, mid, light, core (brightest), shade and void (very dark, for pools/abysses)
export function paletteFor(def, i) {
  const skin = skinInfo(def.id, i);
  if (skin.pal) return skin.pal;                                   // special costumes pick their own
  if (!(i % skinsFor(def.id).length) || skin.fx === undefined) return def.pal;
  const c = skin.fx, [h, sat, v] = rgb2hsv((c >> 16) & 255, (c >> 8) & 255, c & 255);
  const hex = (hh, ss, vv) => { const [r, g, b] = hsv2rgb(hh, Math.max(0, Math.min(1, ss)), Math.max(0, Math.min(1, vv))); return (r << 16) | (g << 8) | b; };
  return {
    outline: hex(h, sat + 0.2, 0.16), deep: hex(h, sat + 0.15, Math.max(0.35, v * 0.55)), mid: hex(h, sat, v * 0.8),
    light: c, core: hex(h, sat * 0.3, 1), shade: hex(h, sat + 0.1, 0.25), void: hex(h, sat + 0.3, 0.08),
  };
}

// Milestone costumes are locked until the fighter has enough KOs (see progress.js).
export function skinTier(id, i) { return skinInfo(id, i).milestone || 0; }
export function skinUnlocked(id, i) { return getKOs(id) >= MILESTONE_KOS[skinTier(id, i)]; }
// next unlocked skin index from i in direction dir (+1 / -1), i itself if it's unlocked and dir is 0
export function stepSkin(id, i, dir) {
  const n = skinsFor(id).length;
  let s = ((i % n) + n) % n;
  if (!dir && skinUnlocked(id, s)) return s;
  for (let k = 0; k < n; k++) { s = (((s + (dir || 1)) % n) + n) % n; if (skinUnlocked(id, s)) return s; }
  return 0;
}

// Give every player a skin; two players on the same fighter never share one (and nobody gets a locked one).
export function resolveSkins(picks, wanted) {
  const used = {}, out = [];
  picks.forEach((id, slot) => {
    const n = skinsFor(id).length;
    let s = ((wanted[slot] || 0) % n + n) % n;
    used[id] = used[id] || new Set();
    if (!skinUnlocked(id, s)) s = stepSkin(id, s, 1);
    for (let k = 0; k < n && (used[id].has(s) || !skinUnlocked(id, s)); k++) s = (s + 1) % n;
    used[id].add(s); out.push(s);
  });
  return out;
}

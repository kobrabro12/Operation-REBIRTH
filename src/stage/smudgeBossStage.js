// THE BLANK CANVAS - the arena of SMUDGE, THE LITTLE MASTER (boss VII; Trinkets > BOSS FIGHTS, src/data/bosses.js).
// An original character: a hyperactive, bratty nine-year-old art prodigy, no taller than the fighters, with a paint
// bucket jammed upside down over his head and eyes (its handle hangs under his chin like a chin strap, so all you see
// is his grin - a row of shark teeth), short rainbow paint pouring out from under the rim as hair, a patchwork of
// different band shirts, ripped jeans, and a paintbrush taller than he is, held in both hands with the tip dragging on
// the floor behind him. Quick on his feet. Drawn as real pixel art (pixelPen.js), always in bright colours. He talks the whole fight (comic speech bubbles) - critiquing you, bragging,
// whining when you hit him.
// THE ARENA is real 3D (poly3d.js): a stretched canvas floating over an endless floor of tiles, with a lattice of
// cubes and balls running off into infinity in every direction - at first nothing but black and white, a pattern
// going on forever. A wooden paint palette and a sketchbook float on either side as ledges.
// HIS ART STYLES: every few attacks he RESTYLES - paints right over himself (WET PAINT: he takes x1.5 while it's
// on) and a giant brush stroke wipes across the screen: he, the arena and the whole infinite world come back in a
// new style, and his attacks change with it (`STYLES`, `PAL`, `drawKid`, `setStyle`):
//   SKETCH (pencil on white): SCRIBBLE (a pencil scribble races across the room), ERASER (a giant eraser rubs the
//     floor - jump it - and rubs out the ledges for a while), DOODLES (stick-figure minions come alive).
//   POP ART (Ben-Day dots, thick outlines, CMYK): KAPOW (comic-book bursts on your spot), DOT RAIN (columns of giant
//     dots), SPEECH BUBBLE (a giant "!!!" slams down and then stays as a ledge).
//   CUBISM (facets, two faces at once): SHATTER (he breaks into flying cubes that rake the arena), PRISM SPIKES (a run
//     of angular spikes along the floor), TWO FACES (both his faces fire a beam).
//   IMPRESSIONISM (swirling night sky, dabs of paint): SWIRL (a vortex pulls you in, then bursts), FALLING STARS,
//     PAINT WAVE (a rolling wave of blue paint - jump it).
// Any style: BRUSH SWEEP (the brush swings down along the floor and leaves wet paint that slows you), PAINT FLICK
// (blobs lobbed at you). At half health MASTERPIECE MODE (faster); below 30% he throws the rules away - ACTION
// PAINTING: splatters everywhere, and he THROWS HIS BUCKET at you (his bare head takes x2 until it comes back) - and
// mixes attacks from every style.
// Stage hazards (VS too): DRIP (a fat drop of paint falls on a mark) and SPILL (paint floods part of the floor - slow).
import { HazardCycle } from './hazardCycle.js';
import { BossArena } from './bossBase.js';
import { Poly3D, ballFaces, boxFaces } from './poly3d.js';
import { sfx } from '../audio/sfx.js';
import { FONT, VIEW_W } from '../config.js';
import { skinInfo } from '../fighters/skins.js';
import { PixelPen } from './pixelPen.js';

// the styles he cycles through (ACTION PAINTING is only for the end)
const STYLES = ['sketch', 'pop', 'cubist', 'starry'];
// each style's look: name, sky (top, bottom), the infinite world's colours, fog, his colours (skin, smock, pants,
// shoes, bucket, paint, brush handle), ink (outlines) and how thick they are
const PAL = {
  blank: { name: '', sky: [0xffffff, 0xffffff], tiles: [0xffffff], solids: [0xffffff], fog: 0xffffff, kid: [0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xffffff, 0x111111, 0xffffff], ink: 0x111111, line: 3 },
  sketch: { name: 'SKETCH', sky: [0xffffff, 0xe8e8e4], tiles: [0xf6f6f2, 0x141414], solids: [0xf6f6f2, 0x141414], fog: 0xffffff, kid: [0xf6f4ee, 0xf6f4ee, 0xf6f4ee, 0xf6f4ee, 0xf6f4ee, 0x141414, 0xf6f4ee], ink: 0x141414, line: 3 },
  pop: { name: 'POP ART', sky: [0xffe14a, 0xff7ab8], tiles: [0x22d0ff, 0xff2a8a, 0xffe14a, 0xffffff], solids: [0xff2a8a, 0x22d0ff, 0xffe14a], fog: 0xffd0e8, kid: [0xffcf9a, 0x2a6aff, 0xffd400, 0xff2a2a, 0xff2a6a, 0xff2a6a, 0xffd400], ink: 0x000000, line: 4 },
  cubist: { name: 'CUBISM', sky: [0xd8b880, 0x5a6a6a], tiles: [0xb88a50, 0x6a7a80, 0xd8c090, 0x4a3a2a, 0x8a9a8a], solids: [0xc8a060, 0x5a7a8a, 0x8a5a3a, 0xd8c8a0], fog: 0xb8a080, kid: [0xd8a070, 0x5a7a8a, 0x8a5a3a, 0x3a2a1a, 0xc8a040, 0xc0502a, 0x8a5a3a], ink: 0x2a1a10, line: 2 },
  starry: { name: 'IMPRESSIONISM', sky: [0x081040, 0x2a4ab0], tiles: [0x1a2a8a, 0x2a4ab0, 0x0e1a60, 0x3a5ac8], solids: [0xffd040, 0x2a4ab0, 0x5a8ae0, 0xfff0a0], fog: 0x1a2a7a, kid: [0x9ab8ff, 0x1a2a8a, 0x2a3aa0, 0x0e1a50, 0xffd040, 0xffe060, 0x5a3a20], ink: 0x0a0e30, line: 2 },
  splatter: { name: 'ACTION PAINTING', sky: [0x2a2a2a, 0x6a6a6a], tiles: [0xffffff, 0x111111, 0xff2a2a, 0x2a8aff, 0xffd400, 0x2ad060], solids: [0xff2a2a, 0x2a8aff, 0xffd400, 0x2ad060, 0xffffff], fog: 0x3a3a3a, kid: [0xffcf9a, 0xf0f0f0, 0x2a3a6a, 0x111111, 0xd0d0d0, 0xff2a2a, 0x8a5a2a], ink: 0x111111, line: 3 },
};
// his size (world pixels - a fighter's height): leg, torso, head (bucket) heights; the brush: arm reach, brush length; walk speeds
const KID = { leg: 15, torso: 15, head: 20, arm: 12, brush: 50, walk: 2.4, fast: 3.4, range: 210 };
// how much quicker than the tables he is: every wind-up and pause is divided by this
const QUICK = 1.3;
// HIS DEATH (TANTRUM): when the bucket flies off, when he starts to melt, the whole length
const MELT = { pop: 90, melt: 110, len: 290 };
// MASTERPIECE: frames charging up, dash speed and how far he dashes, the cutscene (brush strokes, how often, when he
// says it, when the canvas explodes, its length), and the explosion - always exactly `dmg` damage, a huge launch
// (often = the chance a normal round of attacks includes it; it's always in the last stretch)
const MASTER = { often: 0.25, charge: 78, dash: 9, reach: 340, strokes: 12, every: 8, say: 112, boom: 160, n: 200, dmg: 50, kb: [45, 7.5, 1.1], every2: 3 };
// his colours in each style - always bright, even in SKETCH: skin, the four band shirts he's wearing at once (body,
// front patch, back sleeve, front sleeve) and their logos, ripped jeans, sneakers, the bucket, its label band, the
// brush's paint, the paint hair (rainbow), the brush handle
const KIDPAL = {
  sketch: { skin: 0xffcfa0, tees: [0x1c1c28, 0xff3a3a, 0x8a3aff, 0x2ad060], logo: [0xffffff, 0xffe03a], jeans: 0x3a6ad0, shoe: 0xff2a78, bucket: 0x34d0bc, band: 0xffd400, paint: 0xff2a78, hair: [0xff2a4a, 0xff9a1a, 0xffe03a, 0x2ad060, 0x2a8aff, 0xb04aff], wood: 0xd08a3a },
  pop: { skin: 0xffcf9a, tees: [0xffd400, 0xff2a8a, 0x22c8ff, 0x1c1c28], logo: [0x1c1c28, 0xffffff], jeans: 0x2a5ae0, shoe: 0xff2a2a, bucket: 0xff2a8a, band: 0xffffff, paint: 0xffd400, hair: [0xff2a8a, 0xffd400, 0x22c8ff, 0xff7a2a, 0xa04aff], wood: 0xffd400 },
  cubist: { skin: 0xe8a878, tees: [0x3a5a8a, 0xc8502a, 0xe8a830, 0x6aa85a], logo: [0xf0e0c0, 0x1c1c28], jeans: 0x4a6aa8, shoe: 0xa83a2a, bucket: 0xe8a830, band: 0x3a5a8a, paint: 0xd84a2a, hair: [0xd84a2a, 0xe8a830, 0x3a8ab0, 0x6aa85a, 0x8a4a9a], wood: 0x8a5a3a },
  starry: { skin: 0xffd8b0, tees: [0x1a2a6a, 0xffd040, 0x3a8ae0, 0x2ad0c0], logo: [0xfff0a0, 0x1a2a6a], jeans: 0x4a7ad8, shoe: 0xffd040, bucket: 0xffd040, band: 0x3a5ae0, paint: 0x5ab8ff, hair: [0xffd040, 0x5a8ae0, 0x2ad0c0, 0xfff0a0, 0x8a6aff], wood: 0x7a4a2a },
  splatter: { skin: 0xffcf9a, tees: [0x1c1c1c, 0xffffff, 0xff2a2a, 0x2a8aff], logo: [0xff2a2a, 0x1c1c1c], jeans: 0x3a5aa0, shoe: 0xff2a2a, bucket: 0xf0f0f0, band: 0xff2a2a, paint: 0xff2a2a, hair: [0xff2a4a, 0xff9a1a, 0xffe03a, 0x2ad060, 0x2a8aff, 0xb04aff], wood: 0x8a5a2a },
};
// the pixel canvas he's drawn into (world pixels) and where his feet sit in it
const PX = { w: 200, h: 170, fx: 100, fy: 125 };
// THE ENTRANCE: the bucket he pops out of (its spot on the floor), and when (0..1 of the entrance) he pops, catches it, lands
const POP = { x: 30, pop: 0.36, cap: 0.56, land: 0.68, point: 0.82, high: 74 };
// how often he restyles (every this-many attacks; enraged: fewer) and how long it takes
const RESTYLE = { every: 4, rage: 3, dur: 80, wet: 1.5 };
// BRUSH SWEEP: wind-up, swing (frames), the hit, the wet paint it leaves (frames, how long it slows you each frame you're in it)
const SWEEP = { wind: 30, swing: 14, hit: [12, [45, 6, 0.85]], wet: 300, slow: 8 };
// PAINT FLICK: blobs, frames apart, their hit
const FLICK = { n: [3, 4], every: 16, hit: [8, [70, 5, 0.6]] };
// SKETCH: SCRIBBLE (preview frames, pen speed, how long the line stays, hit), ERASER (drop, rubs, rub speed, hit, ledges gone), DOODLES (how many, speed, life, punch)
const SCRIB = { warn: 40, speed: 14, stay: 26, hit: [9, [60, 5.4, 0.6]] };
const ERASER = { drop: 30, rubs: 3, speed: 9, hit: [11, [50, 6, 0.8]], gone: 300 };
const DOODLE = { n: [2, 3], speed: 1.5, life: 600, near: 40, punch: [7, [45, 5, 0.6]] };
// POP ART: KAPOW (bursts, frames apart, warning, radius, hit), DOT RAIN (columns, warning, rain frames, hit), SPEECH BUBBLE (warning, hit, how long it stays as a ledge)
const KAPOW = { n: [3, 4], every: 26, warn: 36, r: 52, hit: [10, [80, 5.6, 0.7]] };
const DOTS = { cols: [4, 5], warn: 40, rain: 70, r: 13, hit: [6, [80, 4.2, 0.4]] };
const BUBBLE = { warn: 46, hit: [14, [70, 6.4, 0.9]], stay: 320, w: 120, h: 70 };
// CUBISM: SHATTER (pieces, scatter, warning, dash speed, hit), PRISM SPIKES (spikes, frames apart, height, hit), TWO FACES (charge, fire, hit)
const SHATTER = { n: 8, scatter: 26, warn: 30, speed: 13, hit: [8, [40, 5.2, 0.55]] };
const SPIKE = { n: 9, every: 6, h: 70, hit: [10, [85, 5.8, 0.6]] };
const TWOFACE = { charge: 44, fire: 26, hit: [9, [30, 5.6, 0.6]] };
// IMPRESSIONISM: SWIRL (grow, pull strength, hit), FALLING STARS (stars, frames apart, warning, hit), PAINT WAVE (speed, height, hit)
const SWIRL = { grow: 70, pull: 1.2, r: 70, hit: [11, [90, 6, 0.8]] };
const STARS = { n: [5, 7], every: 14, warn: 34, hit: [8, [60, 5, 0.6]] };
const WAVE = { speed: 6.5, h: 52, hit: [11, [60, 6, 0.7]] };
// ACTION PAINTING (low): splats (frames apart, warning, hit) and the BUCKET throw (speed, how long it's out, hit)
const ACTION = { dur: 110, every: 6, warn: 22, hit: [7, [70, 4.8, 0.5]] };
const BUCKET = { speed: 9, out: 120, hit: [12, [50, 6, 0.85]] };
// all his hits: x damage, x base knockback, x knockback growth (one knob for the whole fight's punch)
const HIT = { dmg: 0.92, base: 1.0, growth: 1.1 };
// health thresholds: below this he's in ACTION PAINTING
const LOW = { at: 0.3 };
// stage hazards: DRIP (warning, hit) and SPILL (warning, how long it stays, slow)
const DRIP = { warn: 60, hit: [6, [80, 4, 0.4]] };
const SPILL = { warn: 50, stay: 300, slow: 8 };
// what he says (comic speech bubbles)
const SAY = {
  intro: 'OOH! A NEW MODEL!',
  idle: ['HOLD STILL! I\'M DRAWING YOU!', 'NEEDS MORE COLOUR...', 'MOM SAYS I\'M A GENIUS.', 'YOUR NOSE IS HARD TO DRAW.', 'STOP MOVING! YOU\'RE SMUDGING!', 'I\'LL PUT YOU ON THE FRIDGE!'],
  hurt: ['HEY! NO TOUCHING THE ART!', 'MY MASTERPIECE!', 'THAT\'S NOT HOW YOU HOLD A BRUSH!', 'OW! I\'M TELLING!', 'RUDE!!'],
  rage: 'MASTERPIECE MODE!!', low: 'NO MORE RULES!!',
};
// THE ART-OFF (Mr Wake in THE ARTIST): the extra entrance (frames), its exchange (frames into the extra part, how long,
// who, what), his score cards for your combos (hits in a row to earn one, the cards), and the finale's exchange
const ARTOFF = {
  extra: 560,
  lines: [
    { at: 10, len: 100, who: 'SMUDGE', text: 'WAIT.  IS THAT...  A BRUSH?' },
    { at: 115, len: 100, who: 'MR WAKE', text: 'A FELLOW PAINTER!  HOW DELIGHTFUL.' },
    { at: 220, len: 110, who: 'SMUDGE', text: 'THERE\'S ONLY ROOM FOR ONE ARTIST ON THIS CANVAS!' },
    { at: 335, len: 100, who: 'MR WAKE', text: 'THEN WE SETTLE IT THE OLD WAY.  AN ART-OFF.' },
    { at: 440, len: 110, who: 'SMUDGE', text: 'LOSER EATS A CRAYON!!' },
  ],
  combo: 4,
  cards: [['2/10', 'DERIVATIVE!'], ['3/10', 'MY DOG PAINTS BETTER'], ['5/10', 'NEEDS MORE COLOUR'], ['6/10', '...OKAY, THAT WAS COOL'], ['9/10', 'FINE. IT\'S GOOD.'], ['10/10', 'NO WAIT - 1/10!!']],
  finale: { n: 640, boom: 560, lines: [
    { at: 20, len: 110, who: 'SMUDGE', text: '...HOW?  I\'M A GENIUS.  MOM SAYS.' },
    { at: 135, len: 120, who: 'MR WAKE', text: 'YOU ARE TALENTED, CHILD.  BUT TALENT NEEDS PATIENCE.' },
    { at: 260, len: 100, who: 'SMUDGE', text: '...WILL YOU TEACH ME?' },
    { at: 365, len: 100, who: 'MR WAKE', text: 'FIRST LESSON: CLEAN YOUR BRUSHES.' },
    { at: 470, len: 90, who: 'SMUDGE', text: 'AWW, MAAAN!!' },
  ] },
};
/** How much of a line to show `t` frames in, typing it out over `dur` frames from `at`. */
const sayPart = (text, t, at, dur) => text.slice(0, Math.max(1, Math.ceil(text.length * Math.min(1, (t - at) / dur))));
// where the backdrop sits on the background camera
const SKY = { x: 320, y: 250 };

/** A point along the way from a to b (k = 0..1). */
const lerp = (a, b, k) => a + (b - a) * k;
/** A repeatable 0-1 number from a few integers. */
const hash = (a, b = 0, c = 0) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** A colour mixed toward another (k = 0..1). */
const mix = (a, b, k) => { const c = (s) => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k); return (c(16) << 16) | (c(8) << 8) | c(0); };

/** THE BLANK CANVAS and SMUDGE (see the top of the file). */
export class SmudgeBossStage extends BossArena {
  constructor(scene) {
    super();
    this.scene = scene; this.t = 0; this.hazardsOn = true; this.music = 'bgm_boss_smudge';
    this.platforms = [
      { x1: -250, x2: 250, y: 0, solid: true, bottom: 44 },
      { x1: -225, x2: -125, y: -100, solid: false },
      { x1: 125, x2: 225, y: -100, solid: false },
    ];
    this.ledges = this.platforms.slice(1);
    this.spawns = [{ x: -150, y: 0 }, { x: -60, y: 0 }, { x: -110, y: 0 }, { x: 150, y: 0 }];
    this.cycle = new HazardCycle(this, ['drip', 'spill'], { color: '#ffffff', stroke: '#141414', gap: 700 });
    this.style = 'sketch'; this.styleI = 0;
    this.e = { x: 110, y: 0, dir: -1, walk: 0, ba: 1.2, bb: 0.6, crouch: 0, hop: 0, squash: 0, bucketOff: false, alpha: 1, reveal: 1, faces: 1, shake: 0 };
    this.count = 0; this.wet = []; this.blobs = []; this.scrib = null; this.eraser = null; this.doodles = []; this.bursts = []; this.dots = null;
    this.bubbles = []; this.pieces = []; this.spikes = null; this.beams = null; this.swirl = null; this.stars = []; this.wave = null; this.splats = []; this.bucket = null;
    this.say = null; this.sayCD = 300; this.wipe = null; this.low = false; this.drip = null; this.spill = null;
    this.sparkColor = 0xff2a6a; this.bodyW = 30; this.bodyH = 60;
  }

  // ------------------------------------------------------------------ the arena
  /** Builds the sky and pattern layers, the infinite 3D world, the canvas and ledges, SMUDGE's layers and his speech bubble. */
  draw(world, bg) {
    const s = this.scene;
    this.skyG = s.add.graphics().setScrollFactor(0); this.patG = s.add.graphics().setScrollFactor(0.15).setPosition(SKY.x, SKY.y); bg.push(this.skyG, this.patG);
    if (!s.textures.exists('smudge_dots')) {                                       // POP ART's Ben-Day dots: one 14x28 tile, tiled (thousands of live circles were too slow)
      const d = s.make.graphics({ x: 0, y: 0 }, false); d.fillStyle(0xffffff, 1);
      d.fillCircle(7, 7, 3); d.fillCircle(0, 21, 3); d.fillCircle(14, 21, 3); d.generateTexture('smudge_dots', 14, 28); d.destroy();
    }
    this.dotsT = s.add.tileSprite(SKY.x - 800, SKY.y - 480, 1600, 960, 'smudge_dots').setOrigin(0).setScrollFactor(0.15).setAlpha(0.25).setVisible(false); bg.push(this.dotsT);
    const R = this.R = new Poly3D(s, world, { fog: 0xffffff, zFar: 3800, zNear: 500, soft: 0.4, grain: 0.05, edge: 0.15 });
    // the endless floor of tiles far below, and a lattice of cubes and balls running off in every direction
    const T = 260;
    for (let i = -12; i < 12; i++) for (let j = 0; j < 15; j++) {
      const x = i * T, z = 300 + j * T, y = 420;
      R.faces.push({ p: [[x, y, z], [x + T, y, z], [x + T, y, z + T], [x, y, z + T]], n: [0, -1, 0], c: 0xffffff, k: 'tile', i, j });
    }
    for (let i = -3; i <= 3; i++) for (let j = 0; j < 3; j++) for (let l = 0; l < 3; l++) {
      const x = i * 700 + (l % 2) * 350, y = -480 + j * 360, z = 1200 + l * 900, sz = 70 + hash(i, j, l) * 50, ball = (i + j + l) % 3 === 0;
      const faces = ball ? ballFaces(x, y, z, sz, sz, sz, 0xffffff, { seg: 10, rings: 6 }) : boxFaces(x - sz, y - sz, z - sz, x + sz, y + sz, z + sz, 0xffffff, 0xffffff);
      faces.forEach((f, q) => { f.k = 'solid'; f.i = i + j * 7 + l * 21; f.q = q; R.faces.push(f); });
    }
    this.arenaG = s.add.graphics(); world.push(this.arenaG);
    this.pen = new PixelPen(s, 'smudge_px', PX.w, PX.h); world.push(this.pen.img);   // (he's drawn as pixel art)
    this.bkPen = new PixelPen(s, 'smudge_bk', 64, 64); world.push(this.bkPen.img);   // (and so is his bucket, when it's off his head)
    this.fxG = s.add.graphics(); world.push(this.fxG);
    this.overG = s.add.graphics().setDepth(6); world.push(this.overG);   // (over the fighters: MASTERPIECE's paint and canvas)
    this.bubG = s.add.graphics(); world.push(this.bubG);
    this.bubT = s.add.text(0, 0, '', { fontFamily: FONT, fontSize: '9px', color: '#141414', align: 'center', wordWrap: { width: 150 } }).setOrigin(0.5).setVisible(false); world.push(this.bubT);
    this.burstT = [0, 1, 2, 3].map(() => { const o = s.add.text(0, 0, '', { fontFamily: FONT, fontSize: '11px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5).setVisible(false); world.push(o); return o; });
    this.cycle.makeBanner(s);
    this.setStyle(this.style, true);
  }
  /**
   * Switches the whole look to an art style: the sky and its pattern, the infinite world's colours (each tile and
   * solid by its own pattern), the fog. (His own look follows `this.style` when he's drawn.)
   */
  setStyle(st, quiet) {
    this.style = st; const P = PAL[st], R = this.R; if (!R) return;
    R.fog = P.fog;
    for (const f of R.faces) {
      if (f.k === 'tile') {
        const n = P.tiles.length;
        f.c = st === 'sketch' || st === 'blank' ? P.tiles[(f.i + f.j + 100) % n]
          : st === 'pop' ? P.tiles[((f.i + 100) % 2) * 2 + (f.j % 2)]
          : st === 'starry' ? P.tiles[Math.floor((f.j + Math.sin(f.i * 0.7) * 2 + 10) % n)]
          : P.tiles[Math.floor(hash(f.i, f.j, st.length) * n)];
      } else if (f.k === 'solid') f.c = st === 'sketch' ? P.solids[(f.q + f.i) % 2] : P.solids[(f.i + (st === 'cubist' ? f.q : 0)) % P.solids.length];
    }
    this.paintSky();
    if (!quiet) { sfx('whoosh', 1, 0.6); sfx('ding', 0.6, 1.4); }
  }
  /** The sky (a gradient) and the pattern drifting over it, for the current style. */
  paintSky() {
    const g = this.skyG, P = PAL[this.style]; g.clear();
    g.fillGradientStyle(P.sky[0], P.sky[0], P.sky[1], P.sky[1], 1); g.fillRect(-400, -400, 1440, 1200);
    const p = this.patG; p.clear();
    if (this.dotsT) this.dotsT.setVisible(this.style === 'pop');
    if (this.style === 'sketch') { p.lineStyle(1, 0x141414, 0.12); for (let i = -40; i < 40; i++) p.lineBetween(i * 30, -500, i * 30 + 400, 500); }   // pencil hatching
    else if (this.style === 'cubist') { for (let i = 0; i < 26; i++) { const x = -700 + hash(i, 1) * 1400, y = -400 + hash(i, 2) * 700, r = 60 + hash(i, 3) * 120; p.fillStyle([0xffffff, 0x2a1a10, 0x8a5a3a][i % 3], 0.12); p.fillTriangle(x, y - r, x + r, y + r * 0.4, x - r * 0.8, y + r * 0.6); } }
    else if (this.style === 'starry') {
      for (let i = 0; i < 9; i++) { const x = -600 + i * 150, y = -260 + (i % 3) * 60; for (let k = 0; k < 4; k++) { p.lineStyle(5 - k, [0x5a8ae0, 0xfff0a0, 0xffd040, 0x9ab8ff][k], 0.35); p.beginPath(); for (let a = 0; a < 9; a += 0.3) { const r = 10 + a * 6 + k * 4; p.lineTo(x + Math.cos(a + k) * r, y + Math.sin(a + k) * r * 0.6); } p.strokePath(); } }
      for (let i = 0; i < 40; i++) { p.fillStyle(0xfff0a0, 0.8); p.fillCircle(-700 + hash(i, 9) * 1400, -400 + hash(i, 8) * 300, 1.5 + hash(i, 7) * 2.5); }
    } else if (this.style === 'splatter') { for (let i = 0; i < 60; i++) { const x = -700 + hash(i, 4) * 1400, y = -400 + hash(i, 5) * 700; p.fillStyle(PAL.splatter.tiles[i % 6], 0.5); p.fillCircle(x, y, 4 + hash(i, 6) * 18); } }
  }
  /** The canvas floor and the two ledges (a paint palette and a sketchbook), drawn in the current style each frame. */
  drawArena(g) {
    const P = PAL[this.style], ink = P.ink, t = this.t, pl = this.platforms;
    g.clear();
    // the canvas: a stretched white canvas on a wooden stretcher, painted in the current style
    g.fillStyle(0x6a4420, 1); g.fillRect(-256, -2, 512, 46); g.fillStyle(0x8a5a2a, 1); g.fillRect(-256, -2, 512, 6);
    const top = this.style === 'blank' || this.style === 'sketch' ? 0xfafaf6 : mix(0xfafaf6, P.tiles[0], 0.25);
    g.fillStyle(top, 1); g.fillRect(-250, 0, 500, 36);
    g.lineStyle(P.line > 3 ? 3 : 2, ink, 1); g.strokeRect(-250, 0, 500, 36); g.lineStyle(0);
    if (this.style === 'pop') for (let x = -244; x < 246; x += 10) for (let y = 6; y < 34; y += 10) { g.fillStyle(0xff2a8a, 0.35); g.fillCircle(x + ((y / 10) % 2) * 5, y, 2.5); }
    if (this.style === 'sketch') { g.lineStyle(1, ink, 0.25); for (let x = -240; x < 240; x += 16) g.lineBetween(x, 34, x + 14, 4); g.lineStyle(0); }
    if (this.style === 'starry') for (let i = 0; i < 40; i++) { g.fillStyle([0x2a4ab0, 0xffd040, 0x5a8ae0][i % 3], 0.6); g.fillEllipse(-240 + i * 12.3, 8 + (i * 7) % 24, 9, 4); }
    if (this.style === 'cubist') for (let i = 0; i < 10; i++) { g.fillStyle(PAL.cubist.tiles[i % 5], 0.45); g.fillTriangle(-250 + i * 50, 36, -200 + i * 50, 36, -225 + i * 50 + (i % 2 ? 12 : -12), 2); }
    if (this.style === 'splatter') for (let i = 0; i < 26; i++) { g.fillStyle(PAL.splatter.tiles[i % 6], 0.8); g.fillCircle(-240 + hash(i, 1) * 480, 4 + hash(i, 2) * 28, 2 + hash(i, 3) * 5); }
    // the palette (left ledge) and the sketchbook (right) - dashed outlines while the eraser has rubbed them out
    const gone = !pl.includes(this.ledges[0]);
    for (const L of this.ledges) {
      const cx = (L.x1 + L.x2) / 2, w = L.x2 - L.x1;
      if (gone) { g.lineStyle(2, ink, 0.4); for (let x = L.x1; x < L.x2; x += 12) g.lineBetween(x, L.y, x + 6, L.y); g.lineStyle(0); continue; }
      if (L === this.ledges[0]) {                                                          // the palette: a wooden kidney with paint dabs and a thumb hole
        g.fillStyle(0xa8743a, 1); g.fillEllipse(cx, L.y + 7, w + 14, 22); g.fillStyle(0xc8945a, 1); g.fillEllipse(cx, L.y + 4, w + 8, 14);
        g.fillStyle(0x6a4420, 1); g.fillEllipse(cx + w * 0.32, L.y + 6, 12, 7);
        const dab = this.style === 'sketch' || this.style === 'blank' ? [0x141414, 0x8a8a8a, 0xffffff, 0x4a4a4a] : [0xff2a2a, 0xffd400, 0x2a8aff, 0x2ad060];
        dab.forEach((c, i) => { g.fillStyle(c, 1); g.fillCircle(cx - w * 0.35 + i * w * 0.18, L.y + 3 + Math.sin(i * 2) * 2, 5); });
        g.lineStyle(2, ink, 1); g.strokeEllipse(cx, L.y + 6, w + 14, 22); g.lineStyle(0);
      } else {                                                                              // the sketchbook: open, spiral-bound, a doodle on each page
        g.fillStyle(0x2a2a3a, 1); g.fillRect(L.x1 - 4, L.y + 1, w + 8, 12);
        g.fillStyle(0xfafaf6, 1); g.fillRect(L.x1, L.y - 2, w, 10);
        for (let x = L.x1 + 4; x < L.x2; x += 6) { g.lineStyle(1.5, 0x8a8a9a, 1); g.strokeCircle(cx, L.y + 3, 0); g.lineBetween(cx - 1, L.y - 3, cx + 1, L.y + 8); }
        g.lineStyle(1, ink, 0.6); g.strokeCircle(L.x1 + w * 0.25, L.y + 3, 3); g.lineBetween(L.x1 + w * 0.6, L.y + 1, L.x1 + w * 0.85, L.y + 5); g.lineStyle(2, ink, 1); g.strokeRect(L.x1 - 4, L.y - 2, w + 8, 15); g.lineStyle(0);
      }
    }
    if (this.signs) for (const S of this.signs) { g.fillStyle(S.c, 0.9); g.fillEllipse(S.x, 3, S.r * 2.4, S.r * 0.9); g.fillCircle(S.x + S.r, 1, S.r * 0.35); }   // THE ARTIST's colour on the canvas
    // the wet paint (from BRUSH SWEEP, SPILL and splats)
    for (const W of this.wet) { const a = Math.min(1, W.life / 40); g.fillStyle(W.c, 0.85 * a); g.fillRect(W.x1, -5, W.x2 - W.x1, 6); for (let x = W.x1 + 6; x < W.x2; x += 18) { g.fillStyle(W.c, 0.85 * a); g.fillEllipse(x, -5, 10, 5 + Math.sin(t * 0.1 + x) * 1.5); } }
  }

  // ------------------------------------------------------------------ SMUDGE
  /** His hits (BossArena.bhit), all launching a bit harder than the numbers in the tables (`HIT`). */
  bhit(id, x1, y1, x2, y2, dmg, [angle, base, growth], more) { return super.bhit(id, x1, y1, x2, y2, dmg * HIT.dmg, [angle, base * HIT.base, growth * HIT.growth], more); }
  /** The boss's own state when the fight starts. */
  makeBoss(match) {
    this.cycle.gap = 1300; this.cycle.next = 1500;
    this.rival = match.fighters.find((f) => f.def && f.def.id === 'mr-wake' && skinInfo('mr-wake', f.skin).artist) || null;   // THE ART-OFF
    if (this.rival) { this.introEnter = 220 + ARTOFF.extra; this.taunts = ['TOLD YOU! I\'M THE REAL ARTIST!', 'YOU EAT THE CRAYON. PURPLE ONE.', 'LESSON ONE: LOSE. LESSON TWO: CRY.']; this.barName.setText('SMUDGE  -  ART-OFF!'); this.combo = { n: 0, t: 0 }; this.card = null; this.signs = []; }
  }
  /** The ART-OFF's name card. */
  introCard() { return this.rival ? { name: 'ART-OFF!', title: 'SMUDGE  VS  THE ARTIST' } : null; }
  /** The intro (and, in the ART-OFF, the dialogue box they talk in - also used by the finale). */
  startIntro(match) {
    super.startIntro(match);
    this.watched = true;
    if (!this.rival) {                                                              // his own title card: the letters of his name, painted on
      this.cardG = match.add.graphics().setDepth(41);
      this.cardL = [...'SMUDGE'].map(() => match.add.text(0, 0, '', { fontFamily: FONT, fontSize: '32px', color: '#ffffff', stroke: '#141414', strokeThickness: 6 }).setOrigin(0.5).setDepth(42).setVisible(false));
      this.cardL.forEach((o, i) => o.setText('SMUDGE'[i]).setColor('#' + KIDPAL.sketch.hair[i % 6].toString(16).padStart(6, '0')));
      this.cardSub = match.add.text(0, 0, 'THE LITTLE MASTER', { fontFamily: FONT, fontSize: '8px', color: '#141414' }).setOrigin(0.5).setDepth(42).setVisible(false).setLetterSpacing(2);
      match.addUI(this.cardG, ...this.cardL, this.cardSub); this.introParts.push(this.cardG, ...this.cardL, this.cardSub);
      return;
    }
    this.sayG = match.add.graphics().setDepth(41).setVisible(false);
    this.sayName = match.add.text(VIEW_W / 2 - 200, 292, '', { fontFamily: FONT, fontSize: '7px', color: '#ff2a6a', stroke: '#07060e', strokeThickness: 3 }).setDepth(42).setVisible(false);
    this.sayText = match.add.text(VIEW_W / 2 - 200, 304, '', { fontFamily: FONT, fontSize: '8px', color: '#ffffff', stroke: '#07060e', strokeThickness: 3, wordWrap: { width: 400 }, lineSpacing: 2 }).setDepth(42).setVisible(false);
    match.addUI(this.sayG, this.sayName, this.sayText);
  }
  /** Shows (or hides, null) the dialogue box with this much of a line and who says it - a comic-book panel. */
  sayBox(text, who) {
    if (!this.sayG) return;
    const on = !!text; this.sayG.setVisible(on); this.sayName.setVisible(on); this.sayText.setVisible(on);
    if (!on) return;
    this.sayText.setText(text); this.sayName.setText(who).setColor(who === 'SMUDGE' ? '#ff2a6a' : '#ffd400');
    const g = this.sayG, x = VIEW_W / 2 - 210, y = 286; g.clear();
    g.fillStyle(0x000000, 1); g.fillRect(x - 3, y - 3, 426, 46); g.fillStyle(0xffffff, 1); g.fillRect(x, y, 420, 40);
    for (let yy = y + 3; yy < y + 40; yy += 5) for (let xx = x + 3; xx < x + 420; xx += 5) { g.fillStyle(who === 'SMUDGE' ? 0xff2a6a : 0xffd400, 0.12); g.fillCircle(xx, yy, 1.2); }   // (Ben-Day dots)
    g.fillStyle(0x000000, 0.75); g.fillRect(x, y, 420, 40);
    g.fillStyle(who === 'SMUDGE' ? 0xff2a6a : 0xffd400, 1); g.fillRect(x, y, 6, 40);
  }
  /**
   * His body's points this frame: feet, hips, shoulders, the bucket (his head), the brush hand, the brush tip (the
   * brush arm follows the brush angle `ba`), the free hand (angle `bb`).
   */
  body() {
    const E = this.e, d = E.dir, c = E.crouch, sq = E.squash;
    const ft = { x: E.x, y: E.y - E.hop };
    const hip = { x: ft.x, y: ft.y - KID.leg * (1 - c * 0.35) * (1 - sq * 0.2) };
    const sh = { x: hip.x + d * 2 + d * c * 6, y: hip.y - KID.torso * (1 - sq * 0.15) };
    const head = { x: sh.x + d * 1, y: sh.y - KID.head * 0.5 - 3 };
    const ux = Math.cos(E.ba) * d, uy = Math.sin(E.ba);
    const hand = { x: sh.x + d * 2 + ux * KID.arm, y: sh.y + 3 + uy * KID.arm };
    const tip = { x: hand.x + ux * KID.brush, y: hand.y + uy * KID.brush };
    // the other hand grips the brush a little further down the handle - unless it's busy (throwing the bucket, the score card)
    const hand2 = E.free || this.card ? { x: sh.x - d * 4 + Math.cos(E.bb) * d * KID.arm * 0.9, y: sh.y + 4 + Math.sin(E.bb) * KID.arm * 0.9 } : { x: hand.x + ux * 7, y: hand.y + uy * 7 };
    return { ft, hip, sh, head, hand, tip, hand2 };
  }
  /** What the camera and the CPU aim at: his bucket. */
  core() { if (this.pieces.length && this.boss && this.boss.atk && this.boss.atk.name === 'shatter') return { x: this.e.x, y: -70 }; const b = this.body(); return { x: b.head.x, y: b.head.y }; }
  /** Where he can be hit: his bucket head (x1.2, bare head x2), his body (x0.9); everything x1.5 while the paint's wet (restyling). None while shattered. */
  hurt() {
    const E = this.e; if (E.alpha < 0.5) return [];
    const b = this.body(), wet = this.boss && this.boss.atk && this.boss.atk.name === 'restyle' ? RESTYLE.wet : 1;
    return [{ x1: b.head.x - 13, y1: b.head.y - 14, x2: b.head.x + 13, y2: b.head.y + 15, mult: (E.bucketOff ? 2 : 1.2) * wet },
      { x1: b.hip.x - 11, y1: b.sh.y, x2: b.hip.x + 11, y2: Math.min(0, b.ft.y), mult: 0.6 * wet }];
  }
  /** What he does next: a RESTYLE every few attacks, then the current style's moves (plus the brush); ACTION PAINTING mixes everything. */
  pattern(phase) {
    const every = phase === 2 ? RESTYLE.rage : RESTYLE.every;
    if (this.low) return ['action', 'bucket', 'sweep', 'flick', 'masterpiece', ...this.styleMoves(STYLES[Math.floor(Math.random() * 4)])];
    if (this.count % every === every - 1) return ['restyle'];
    return [...this.styleMoves(this.style), 'sweep', 'flick', ...(Math.random() < MASTER.often ? ['masterpiece'] : [])];
  }
  /** The three attacks that belong to a style. */
  styleMoves(st) { return { sketch: ['scribble', 'eraser', 'doodles'], pop: ['kapow', 'dots', 'bubble'], cubist: ['shatter', 'spikes', 'twoface'], starry: ['swirl', 'stars', 'wave'], splatter: ['action', 'bucket'] }[st] || ['sweep']; }
  /** Counts his attacks (so RESTYLE comes round). */
  tally() { this.count++; }
  /** The death card's form: the ART-OFF, or the art style he was in. */
  cardForm() { return this.rival ? 'artoff' : this.low ? 'splatter' : this.style === 'blank' ? 'sketch' : this.style; }
  /** The drawing layers that make up the boss itself, for its death card's portrait (MatchScene.paintBossCard). */
  cardObjs() { return [this.pen.img]; }
  rageLine() { return 'MASTERPIECE MODE!'; }
  /** MASTERPIECE MODE (half health): he hops up and down, shouting. */
  onRage(match) { this.talk(SAY.rage, 90); sfx('laugh', 0.8, 1.5); this.e.hop = 24; match.shake(6, 20); }
  /** A hit lands on him: now and then he whines about it. */
  onHurt(match) {
    if (this.rival) {                                                                   // THE ART-OFF: he scores your combos on cards
      this.combo.n = this.t - this.combo.t < 70 ? this.combo.n + 1 : 1; this.combo.t = this.t;
      if (this.combo.n >= ARTOFF.combo && !this.card) { this.combo.n = 0; const c = ARTOFF.cards[Math.floor(Math.random() * ARTOFF.cards.length)]; this.card = { score: c[0], text: c[1], t: 0 }; sfx('ding', 0.6, 1.5); }
      const r = this.rival; if (r && Math.random() < 0.5) this.signs.push({ x: Phaser.Math.Clamp(r.x + (Math.random() - 0.5) * 60, -240, 240), c: [0xff2a4a, 0x2a8aff, 0xffd400, 0x2ad060][this.signs.length % 4], r: 4 + Math.random() * 6 });   // (his hits leave colour on the canvas)
      if (this.signs.length > 40) this.signs.shift();
    }
    if (this.sayCD <= 0 || (this.say && this.say.t > 40)) { if (Math.random() < 0.35) this.talk(SAY.hurt[Math.floor(Math.random() * SAY.hurt.length)], 70); } }
  /** Says something in a comic speech bubble over his head for `life` frames. */
  talk(text, life = 100) { this.say = { text, t: 0, life }; this.sayCD = 260 + Math.random() * 200; }
  /** Frames scaled by the difficulty - and by how quick he is (`QUICK`): every wind-up and pause is shorter. */
  sp(n) { return super.sp(n / QUICK); }
  /** His walk speed. */
  speed() { return this.boss && this.boss.phase === 2 ? KID.fast : KID.walk; }
  /** He walks toward x (clamped to his patch of floor). Returns true once there. */
  walkTo(x, sp) { const E = this.e, dx = Phaser.Math.Clamp(x, -KID.range, KID.range) - E.x; if (Math.abs(dx) < 6) return true; E.dir = Math.sign(dx); E.x += Math.sign(dx) * Math.min(Math.abs(dx), sp); E.walk += sp * 0.08; return false; }
  /** Turns him to face the nearest player; returns that player. */
  faceNearest(match) { const E = this.e, tg = this.nearest(match, E.x); if (tg) E.dir = Math.sign(tg.x - E.x) || E.dir; return tg; }

  /** At rest: he bounces on his toes, twirls the brush, wanders toward you, and chatters now and then. */
  idle(match) {
    const E = this.e, tg = this.nearest(match, E.x);
    E.crouch += (0.05 - E.crouch) * 0.1; E.hop = Math.max(0, E.hop * 0.85); E.squash *= 0.8;
    E.ba += (this.restAngle() + Math.sin(this.t * 0.06) * 0.06 - E.ba) * 0.08; E.bb += ((1.3 + Math.sin(this.t * 0.07) * 0.2) - E.bb) * 0.1;
    if (tg && Math.abs(tg.x - E.x) > 90) this.walkTo(tg.x - Math.sign(tg.x - E.x) * 60, this.speed() * 0.8);
    else if (tg) E.dir = Math.sign(tg.x - E.x) || E.dir;
    if (this.t % 50 < 12) E.hop = Math.max(E.hop, Math.sin((this.t % 50) / 12 * Math.PI) * 6);
    if (this.sayCD <= 0 && !this.say) this.talk(SAY.idle[Math.floor(Math.random() * SAY.idle.length)]);
  }

  /** The brush angle that rests its tip on the floor behind him, both hands on the handle (written past -PI so a swing from the front goes up over his head). */
  restAngle() {
    const E = this.e, sh = this.body().sh, ft = E.y - E.hop;
    const uy = Phaser.Math.Clamp((ft - 2 - (sh.y + 3)) / (KID.arm + KID.brush), -1, 1);
    return -Math.PI - Math.asin(uy);
  }

  // ------------------------------------------------------------------ MASTERPIECE
  start_masterpiece(match, a) { this.tally(); this.faceNearest(match); this.talk('HOLD STILL... I\'M INSPIRED!', 70); a.x0 = this.e.x; }
  /**
   * MASTERPIECE: he crouches and charges the brush (paint swirling round it, brighter and brighter), then DASHES at you
   * across the stage. If he catches you: the cutscene (masterStep) - he paints you all over with a flurry of brush
   * strokes, a canvas frames you, MASTERPIECE!, and the canvas explodes: 50 damage and a huge launch. If he misses he
   * skids to a stop, dizzy, open to a punish.
   */
  atk_masterpiece(match, a) {
    const E = this.e, ch = this.sp(MASTER.charge);
    if (a.t < ch) {
      E.crouch = 0.6; E.ba += (-2.7 - E.ba) * 0.15; this.faceNearest(match);
      if (a.t === 1) sfx('limit', 0.6, 1.4);
      if (a.t % 3 === 0) { const b = this.body(), q = a.t * 0.5, K = KIDPAL[this.style] || KIDPAL.sketch; match.particles.push({ x: b.tip.x + Math.cos(q) * 14, y: b.tip.y + Math.sin(q) * 14, vx: -Math.cos(q) * 0.8, vy: -Math.sin(q) * 0.8, life: 18, color: K.hair[(a.t / 3) % K.hair.length | 0], size: 2 + (a.t / ch) * 2 }); }
      if (a.t > ch - 20 && a.t % 4 === 0) sfx('clocktick', 0.5, 1.6);
      return false;
    }
    if (!a.end) {                                                                   // the dash
      if (a.t === ch) { a.dir = E.dir; sfx('whoosh', 1, 0.8); sfx('swing', 0.8, 1.2); }
      E.crouch = 0.3; E.ba = -0.15; E.x += a.dir * MASTER.dash; E.walk += 0.6;
      if (a.t % 2 === 0) this.splash(match, E.x - a.dir * 10, -6, 4);
      for (const f of match.fighters) {
        if (!f.alive || f.eliminated || f.state === 'respawn' || f.invincible > 0 || f.state === 'dodge' || f.state === 'roll') continue;
        if (Math.abs(f.x - (E.x + a.dir * 14)) < 24 && f.y > -70 && f.y < 10) { this.catch(match, f, a); return false; }
      }
      if (Math.abs(E.x - a.x0) > MASTER.reach || Math.abs(E.x) > KID.range + 20) { a.end = a.t; a.miss = true; sfx('land', 0.8, 1.2); this.talk('WHOA- WHOAAA!', 60); }
      return false;
    }
    if (a.miss) { E.ba += (this.restAngle() - E.ba) * 0.1; E.crouch = 0.1; E.hop = Math.abs(Math.sin((a.t - a.end) * 0.3)) * 4; return a.t - a.end > this.sp(70); }   // (dizzy - punish him)
    return a.t - a.end > 20;
  }
  /** He's caught someone: with a player watching, THE MASTERPIECE cutscene; without (the sim), straight to the explosion. */
  catch(match, f, a) {
    a.end = a.t; a.miss = false; this.e.x = Phaser.Math.Clamp(f.x - a.dir * 26, -KID.range - 20, KID.range + 20); this.e.dir = a.dir;
    sfx('bighit', 0.8, 1.4); match.shake(6, 8);
    if (this.watched) { const cam = match.worldCam || match.cameras.main; this.cut = { kind: 'master', t: 0, n: MASTER.n, once: new Set(), victim: f, strokes: [] }; this.ccam = { x: cam.midPoint.x, y: cam.midPoint.y, zoom: cam.zoom }; this.say = null; return; }
    this.blast = { f, t: 6 };
  }
  /**
   * THE MASTERPIECE cutscene (MatchScene plays it, everyone else frozen): the camera closes in; he paints you all over
   * with a flurry of brush strokes (SPLAT! SWISH!), each leaving a streak of colour on you, while a canvas and an
   * easel frame build up round you; he hops back, admires it - MASTERPIECE! - and the canvas EXPLODES.
   */
  masterStep(match) {
    const C = this.cut, t = ++C.t, E = this.e, f = C.victim, K = KIDPAL[this.style] || KIDPAL.sketch; this.t++;
    const once = (k, at) => t >= at && !C.once.has(k) && !!C.once.add(k);
    const fy = f.y - 26, stEnd = MASTER.strokes * MASTER.every;
    C.shot = { x: (f.x + E.x) / 2, y: fy - 10, zoom: t < MASTER.boom ? 2.6 : 1.8 };
    if (t < stEnd) {                                                                // the flurry of strokes
      const i = Math.floor(t / MASTER.every), k = (t % MASTER.every) / MASTER.every;
      E.dir = Math.sign(f.x - E.x) || E.dir; E.x = f.x - E.dir * (22 + (i % 3) * 4); E.hop = Math.abs(Math.sin(t * 0.4)) * 6;
      E.ba = i % 2 ? lerp(-2.4, 0.8, k) : lerp(0.8, -2.4, k);
      if (t % MASTER.every === 2) {
        const c = K.hair[i % K.hair.length], a = (hash(i, 3, 1) - 0.5) * 2.2;
        C.strokes.push({ x: f.x + (hash(i, 1, 2) - 0.5) * 30, y: fy + (hash(i, 2, 2) - 0.5) * 40, a, c, l: 18 + hash(i, 4, 4) * 16 });
        sfx(i % 2 ? 'slash' : 'hit', 0.7, 1.1 + (i % 4) * 0.1); match.shake(3, 4);
        for (let j = 0; j < 8; j++) match.particles.push({ x: f.x + (Math.random() - 0.5) * 20, y: fy + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 3, life: 26, color: c, size: 2, grav: 0.15 });
        if (i % 3 === 0) match.popText({ x: f.x + (i % 2 ? 18 : -18), y: fy - 30 }, ['SPLAT!', 'SWISH!', 'DAB!', 'SPLOOSH!'][i % 4], '#' + c.toString(16).padStart(6, '0'));
      }
      C.frame = Math.min(1, t / stEnd);
    } else if (t < MASTER.boom) {                                                   // he hops back and admires it
      const q = Math.min(1, (t - stEnd) / 16); E.x = f.x - E.dir * lerp(30, 70, q); E.hop = Math.sin(q * Math.PI) * 18; E.ba = lerp(E.ba, -1.6, 0.2);
      C.frame = 1;
      if (once('say', MASTER.say)) { this.talk('MASTERPIECE!', 80); sfx('ding', 0.9, 1.3); sfx('laugh', 0.6, 1.6); }
      if (t > MASTER.boom - 14 && t % 3 === 0) { match.shake(2, 3); sfx('clang', 0.3, 2); }
    } else if (once('boom', MASTER.boom)) {                                         // THE CANVAS EXPLODES
      sfx('bighit', 1, 0.6); sfx('thunder', 0.8, 1.1); sfx('glass', 0.8, 0.8); match.shake(18, 26); C.boomT = 0;
      for (let j = 0; j < 70; j++) { const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 8; match.particles.push({ x: f.x, y: fy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 40 + Math.random() * 30, color: j % 5 === 0 ? 0xc8963a : K.hair[j % K.hair.length], size: 2 + (j % 3), grav: 0.2, drag: 0.97 }); }
      C.strokes = []; C.frame = 0; this.blast = { f, t: 0 };
    }
    if (C.boomT !== undefined) C.boomT++;
    if (this.say) this.say.t++;
    if (t >= C.n) this.cut = null;
  }
  /** THE MASTERPIECE's explosion lands (the frame after the cutscene, or straight away in the sim): exactly MASTER.dmg damage and a huge launch. */
  stepBlast(match, out) {
    const B = this.blast; if (!B) return;
    if (B.t-- > 0) return;
    const f = B.f, T = this.boss.cfg.T;
    out.push(BossArena.prototype.bhit.call(this, this.sid('masterpiece'), f.x - 30, f.y - 70, f.x + 30, f.y + 10, MASTER.dmg / (T.dmg || 1), MASTER.kb, { dirX: this.e.dir }));
    this.blast = null;
  }
  /** MASTERPIECE's paint over the victim and the canvas framing them (drawn above the fighters, during the cutscene). */
  drawMaster(g) {
    g.clear(); const C = this.cut; if (!C || C.kind !== 'master') return;
    const f = C.victim, fy = f.y - 26;
    if (C.frame > 0) {                                                              // the canvas and its gold frame, building up round them
      const w = 64 * C.frame, h = 84 * C.frame;
      g.fillStyle(0xf8f4ea, 0.35 * C.frame); g.fillRect(f.x - w / 2, fy - h / 2, w, h);
      g.lineStyle(5, 0x7a5420, 1); g.strokeRect(f.x - w / 2 - 3, fy - h / 2 - 3, w + 6, h + 6); g.lineStyle(3, 0xe8b840, 1); g.strokeRect(f.x - w / 2 - 3, fy - h / 2 - 3, w + 6, h + 6); g.lineStyle(0);
      if (C.frame >= 1) { g.lineStyle(3, 0x6a4420, 1); g.lineBetween(f.x - 26, fy + 44, f.x - 34, f.y + 4); g.lineBetween(f.x + 26, fy + 44, f.x + 34, f.y + 4); g.lineStyle(0); }   // (easel legs)
    }
    for (const S of C.strokes) { const c = Math.cos(S.a), s2 = Math.sin(S.a); g.lineStyle(7, S.c, 0.9); g.lineBetween(S.x - c * S.l / 2, S.y - s2 * S.l / 2, S.x + c * S.l / 2, S.y + s2 * S.l / 2); g.lineStyle(3, 0xffffff, 0.35); g.lineBetween(S.x - c * S.l / 2, S.y - s2 * S.l / 2 - 1, S.x + c * S.l / 4, S.y + s2 * S.l / 4 - 1); g.lineStyle(0); }
    if (C.boomT !== undefined && C.boomT < 14) { const r = 20 + C.boomT * 9; g.fillStyle(0xffffff, 0.8 * (1 - C.boomT / 14)); g.fillCircle(f.x, fy, r); }
  }

  // ------------------------------------------------------------------ attacks (any style)
  start_sweep() { this.tally(); } start_flick() { this.tally(); } start_restyle() { this.tally(); }
  start_scribble() { this.tally(); } start_eraser() { this.tally(); } start_doodles() { this.tally(); }
  start_kapow() { this.tally(); } start_dots() { this.tally(); } start_bubble() { this.tally(); }
  start_shatter() { this.tally(); } start_spikes() { this.tally(); } start_twoface() { this.tally(); }
  start_swirl() { this.tally(); } start_stars() { this.tally(); } start_wave() { this.tally(); }
  start_action() { this.tally(); } start_bucket() { this.tally(); }
  /** BRUSH SWEEP: he raises the brush high behind him, then swings it down along the floor in front - a wet stripe of paint stays there and slows you. */
  atk_sweep(match, a, out) {
    const E = this.e, w = this.sp(SWEEP.wind);
    if (a.t === 1) { this.faceNearest(match); a.id2 = this.sid('sweep'); }
    if (a.t <= w) { E.ba += (-2.3 - E.ba) * 0.15; E.crouch = 0.25; if (a.t === w - 6) sfx('whoosh', 0.8, 0.7); return false; }
    const k = a.t - w;
    if (k <= SWEEP.swing) {
      E.ba = lerp(-2.3, 0.75, k / SWEEP.swing); E.crouch = 0.5; E.x = Phaser.Math.Clamp(E.x + E.dir * 2, -KID.range, KID.range);
      const b = this.body(); for (let q = 1; q <= 5; q++) { const px = lerp(b.hand.x, b.tip.x, q / 5), py = lerp(b.hand.y, b.tip.y, q / 5); out.push(this.bhit(a.id2, px - 28, py - 28, px + 28, py + 28, ...SWEEP.hit, { dirX: E.dir })); }
      if (k === SWEEP.swing) { sfx('bighit', 0.7, 1.1); match.shake(6, 8); const x0 = b.tip.x, x1 = b.tip.x - E.dir * 200; this.addWet(Math.min(x0, x1), Math.max(x0, x1), SWEEP.wet); this.splash(match, b.tip.x, -4, 12); }
      return false;
    }
    E.crouch += (0.05 - E.crouch) * 0.15;
    return k > SWEEP.swing + 30;
  }
  /** Leaves a strip of wet paint on the floor (it slows whoever stands in it). */
  addWet(x1, x2, life) { this.wet.push({ x1: Math.max(-250, x1), x2: Math.min(250, x2), life, c: PAL[this.style].kid[5] }); }
  /** A splash of paint drops. */
  splash(match, x, y, n, c = PAL[this.style].kid[5]) { for (let i = 0; i < n; i++) match.particles.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: -1 - Math.random() * 5, life: 22 + Math.random() * 14, color: i % 3 ? c : 0xffffff, size: 3, grav: 0.25 }); }
  /** PAINT FLICK: he flicks the brush and blobs of paint arc onto marked spots near you. */
  atk_flick(match, a) {
    const E = this.e, n = FLICK.n[this.boss.phase - 1], ev = this.sp(FLICK.every);
    this.faceNearest(match);
    const q = (a.t - 1) % ev; E.ba = q < ev / 2 ? lerp(-0.4, -1.8, q / (ev / 2)) : lerp(-1.8, -0.4, (q - ev / 2) / (ev / 2));
    if (a.t % ev === 0 && a.t / ev <= n) {
      const tg = this.nearest(match, E.x), tx = Phaser.Math.Clamp((tg ? tg.x : 0) + (Math.random() - 0.5) * 70, -240, 240), b = this.body(), T = 40;
      this.blobs.push({ x: b.tip.x, y: b.tip.y, vx: (tx - b.tip.x) / T, vy: (0 - b.tip.y) / T - 0.25 * T, tx, id: this.sid('blob'), c: PAL[this.style].kid[5] });
      sfx('whoosh', 0.5, 1.6);
    }
    return a.t > n * ev + 50;
  }
  /** The flicked blobs: arcing, then a splash and a wet patch where they land. */
  stepBlobs(match, out) {
    for (const B of this.blobs) {
      B.vy += 0.5; B.x += B.vx; B.y += B.vy;
      out.push(this.bhit(B.id, B.x - 10, B.y - 10, B.x + 10, B.y + 10, ...FLICK.hit, { dirX: Math.sign(B.vx) || 1 }));
      if (B.y >= -4 && Math.abs(B.x) < 252) { B.dead = true; sfx('geyser', 0.4, 1.8); this.splash(match, B.x, -4, 8, B.c); this.wet.push({ x1: B.x - 22, x2: B.x + 22, life: 200, c: B.c }); }
      else if (B.y > 400) B.dead = true;
    }
    this.blobs = this.blobs.filter((B) => !B.dead);
  }
  /**
   * RESTYLE: he lifts the brush and paints right over himself, top to bottom (WET PAINT - he takes x1.5), announcing
   * the new style; at the end a giant brush stroke sweeps the screen and everything comes back in it.
   */
  atk_restyle(match, a) {
    const E = this.e, dur = RESTYLE.dur;
    if (a.t === 1) {
      a.next = STYLES[(STYLES.indexOf(this.style) + 1) % STYLES.length];
      this.talk('TIME FOR...  ' + PAL[a.next].name + '!', 110); sfx('ding', 0.8, 0.8); this.rageText.setText('WET PAINT!'); this.boss.rage = 60;
    }
    const k = a.t / dur, b = this.body();
    E.ba = -1.6 + Math.sin(a.t * 0.5) * 0.6 * (1 - k * 0.3); E.crouch = 0.15; E.squash = Math.sin(a.t * 0.4) * 0.15;
    if (a.t % 4 === 0) this.splash(match, b.head.x + (Math.random() - 0.5) * 60, lerp(b.head.y - 30, b.ft.y, k), 3, PAL[a.next].kid[1]);
    if (a.t === Math.round(dur * 0.75)) this.startWipe(match, a.next);
    if (a.t >= dur) { E.squash = 0; return true; }
    return false;
  }
  /** The screen wipe: a giant brush stroke across the screen in the new style's paint; the style switches under it. */
  startWipe(match, next) { this.wipe = { t: 0, next, c: PAL[next].kid[5] === 0x141414 ? 0x141414 : PAL[next].kid[5] }; sfx('whoosh', 1, 0.4); sfx('geyser', 0.6, 0.8); }

  // ------------------------------------------------------------------ SKETCH
  /** SCRIBBLE: a faint dotted path shows where; then a pencil scribble races along it, and the line it leaves hurts for a moment. */
  atk_scribble(match, a, out) {
    const E = this.e, w = this.sp(SCRIB.warn);
    if (a.t === 1) {
      const tg = this.faceNearest(match), pts = [], from = -E.dir * 260; let y = -60;
      for (let i = 0; i <= 14; i++) { const x = lerp(from, -from, i / 14); y = Phaser.Math.Clamp(y + (Math.random() - 0.5) * 120, -150, -12); if (i === 7 && tg) y = tg.y - 26; pts.push({ x, y }); }
      this.scrib = { pts, len: 0, id: this.sid('scrib'), warn: true }; sfx('glitch', 0.4, 2);
    }
    const S = this.scrib; if (!S) return true;
    E.ba = -0.6 + Math.sin(a.t * 0.9) * 0.4;
    if (a.t <= w) return false;
    S.warn = false; S.len += SCRIB.speed;
    if (a.t % 3 === 0) sfx('swing', 0.3, 2.2);
    let L = 0; for (let i = 1; i < S.pts.length; i++) {
      const p = S.pts[i - 1], q = S.pts[i], seg = Math.hypot(q.x - p.x, q.y - p.y);
      if (L > S.len) break;
      const f = Math.min(1, (S.len - L) / seg), ex = lerp(p.x, q.x, f), ey = lerp(p.y, q.y, f);
      if (S.len - L - seg < SCRIB.stay * SCRIB.speed) for (let k = 0; k <= 3; k++) { const px = lerp(p.x, ex, k / 3), py = lerp(p.y, ey, k / 3); out.push(this.bhit(S.id, px - 12, py - 12, px + 12, py + 12, ...SCRIB.hit)); }
      L += seg;
    }
    if (S.len > L + SCRIB.stay * SCRIB.speed) { this.scrib = null; return true; }
    return false;
  }
  /** ERASER: a giant pink eraser drops in at one side and rubs back and forth along the floor (jump it); it rubs the ledges out for a while. */
  atk_eraser(match, a, out) {
    const E = this.e;
    if (a.t === 1) { const s = Math.random() < 0.5 ? -1 : 1; this.eraser = { x: s * 290, y: -260, s, rub: 0, dir: -s, id: this.sid('eraser') }; this.talk('OOPS! LET ME FIX THAT!', 80); }
    const R = this.eraser; if (!R) return true;
    E.ba = -1.2 + Math.sin(a.t * 0.3) * 0.5;
    if (a.t <= ERASER.drop) { R.y = lerp(-260, -22, (a.t / ERASER.drop) ** 2); if (a.t === ERASER.drop) { sfx('bighit', 0.8, 0.8); match.shake(6, 8); } return false; }
    if (a.t === ERASER.drop + 1 && this.platforms.length > 1) { this.platforms = [this.platforms[0]]; this.ledgeBack = ERASER.gone; sfx('glass', 0.6, 1.8); for (const L of this.ledges) for (let i = 0; i < 10; i++) match.particles.push({ x: L.x1 + Math.random() * (L.x2 - L.x1), y: L.y, vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2, life: 30, color: 0xffb0c0, size: 3, grav: 0.1 }); }
    R.x += R.dir * ERASER.speed;
    if (Math.abs(R.x) > 250) { R.dir = -R.dir; R.rub++; sfx('swing', 0.6, 0.7); R.id = this.sid('eraser'); }
    if (a.t % 3 === 0) match.particles.push({ x: R.x - R.dir * 40, y: -6, vx: -R.dir * 2, vy: -1, life: 24, color: 0xffd0d8, size: 2, grav: 0.1 });
    out.push(this.bhit(R.id, R.x - 46, -44, R.x + 46, 0, ...ERASER.hit, { dirX: R.dir }));
    if (R.rub >= ERASER.rubs) { this.eraser = null; return true; }
    return false;
  }
  /** DOODLES: he scribbles stick figures onto the canvas and they come alive - they walk at you and punch. One hit pops one. */
  atk_doodles(match, a) {
    const n = DOODLE.n[this.boss.phase - 1], E = this.e;
    E.ba = -0.5 + Math.sin(a.t * 0.8) * 0.5;
    if (a.t === 1) this.talk('MEET MY FRIENDS!', 80);
    if (a.t % 20 === 0 && a.t / 20 <= n) { const x = Phaser.Math.Clamp(E.x + E.dir * (40 + a.t * 2), -230, 230); this.doodles.push({ x, t: 0, dir: E.dir, walk: 0, id: this.sid('doodle'), punch: 0, grow: 0 }); sfx('swing', 0.5, 1.8); }
    return a.t > n * 20 + 30;
  }
  /** The doodles: drawn in (they grow), walk at the nearest player, punch when close, fade after a while. */
  stepDoodles(match, out) {
    for (const D of this.doodles) {
      D.t++; D.grow = Math.min(1, D.t / 20); if (D.grow < 1) continue;
      const tg = this.nearest(match, D.x);
      if (D.punch > 0) { D.punch--; if (D.punch === 8) { out.push(this.bhit(D.id + 'p' + D.t, D.x + D.dir * 6, -46, D.x + D.dir * 40, -18, ...DOODLE.punch, { dirX: D.dir })); sfx('hit', 0.4, 1.6); } }
      else if (tg) { D.dir = Math.sign(tg.x - D.x) || D.dir; if (Math.abs(tg.x - D.x) < DOODLE.near && tg.y > -60) D.punch = 18; else { D.x += D.dir * DOODLE.speed; D.walk += 0.2; } }
      if (D.t > DOODLE.life) D.dead = true;
    }
    this.doodles = this.doodles.filter((D) => !D.dead);
  }

  // ------------------------------------------------------------------ POP ART
  /** KAPOW: a comic burst marked on your spot... then POW! - a jagged star of colour with the word in it. One after another. */
  atk_kapow(match, a) {
    const n = KAPOW.n[this.boss.phase - 1], ev = this.sp(KAPOW.every);
    this.e.ba = -1.4 + Math.sin(a.t * 0.4) * 0.4;
    if (a.t % ev === 1 && Math.floor(a.t / ev) < n) {
      const tg = this.nearest(match, this.e.x), x = Phaser.Math.Clamp(tg ? tg.x : 0, -230, 230), y = tg ? Math.min(-30, tg.y - 24) : -30;
      this.bursts.push({ x, y, t: 0, word: ['POW!', 'BAM!', 'ZAP!', 'WHAM!', 'KAPOW!'][Math.floor(Math.random() * 5)], id: this.sid('kapow'), c: [0xff2a8a, 0x22d0ff, 0xffe14a][Math.floor(Math.random() * 3)] });
    }
    return a.t > n * ev + KAPOW.warn + 30;
  }
  /** The bursts: a target ring, then the burst (hits once), then it fades. */
  stepBursts(match, out) {
    for (const B of this.bursts) {
      B.t++;
      if (B.t === KAPOW.warn) { sfx('bighit', 0.8, 1.3); sfx('clang', 0.4, 1.6); match.shake(6, 6); }
      if (B.t >= KAPOW.warn && B.t < KAPOW.warn + 6) out.push(this.bhit(B.id, B.x - KAPOW.r, B.y - KAPOW.r, B.x + KAPOW.r, B.y + KAPOW.r, ...KAPOW.hit, { radial: true }));
      if (B.t > KAPOW.warn + 26) B.dead = true;
    }
    this.bursts = this.bursts.filter((B) => !B.dead);
  }
  /** DOT RAIN: columns get marked, then giant Ben-Day dots pour down them. */
  atk_dots(match, a, out) {
    const n = DOTS.cols[this.boss.phase - 1], w = this.sp(DOTS.warn);
    if (a.t === 1) { const tg = this.nearest(match), xs = [Phaser.Math.Clamp(tg ? tg.x : 0, -230, 230)]; while (xs.length < n) { const x = -225 + Math.random() * 450; if (xs.every((q) => Math.abs(q - x) > 60)) xs.push(x); } this.dots = { xs, t: 0, drops: [], id: 0 }; sfx('ding', 0.5, 1.8); }
    const D = this.dots; D.t = a.t; this.e.ba = -1.9;
    if (a.t > w && a.t < w + DOTS.rain && a.t % 5 === 0) { for (const x of D.xs) D.drops.push({ x: x + (Math.random() - 0.5) * 16, y: -420, id: this.sid('dot'), c: [0xff2a8a, 0x22d0ff, 0x111111][Math.floor(Math.random() * 3)] }); }
    for (const P of D.drops) { P.y += 11; out.push(this.bhit(P.id, P.x - DOTS.r, P.y - DOTS.r, P.x + DOTS.r, P.y + DOTS.r, ...DOTS.hit)); if (P.y > -4) { P.dead = true; if (Math.random() < 0.3) sfx('popup', 0.2, 2); } }
    D.drops = D.drops.filter((P) => !P.dead);
    if (a.t > w + DOTS.rain && !D.drops.length) { this.dots = null; return true; }
    return false;
  }
  /** SPEECH BUBBLE: a giant "!!!" speech bubble falls on your spot (its shadow warns), slams down, then stays a while as a ledge. */
  atk_bubble(match, a, out) {
    const w = this.sp(BUBBLE.warn);
    if (a.t === 1) { const tg = this.nearest(match), x = Phaser.Math.Clamp(tg ? tg.x : 0, -190, 190); a.B = { x, y: -460, st: 'fall', id: this.sid('bubble'), life: BUBBLE.stay, text: ['!!!', '?!', 'HEY!', '...'][Math.floor(Math.random() * 4)] }; this.bubbles.push(a.B); this.talk('SAY CHEESE!', 60); }
    const B = a.B;
    if (a.t <= w) { B.warnK = a.t / w; return false; }
    if (B.st === 'fall') {
      B.y += 22; out.push(this.bhit(B.id, B.x - BUBBLE.w / 2, B.y - BUBBLE.h, B.x + BUBBLE.w / 2, B.y, ...BUBBLE.hit));
      if (B.y >= -4) { B.y = -4; B.st = 'stay'; B.plat = { x1: B.x - BUBBLE.w / 2 + 6, x2: B.x + BUBBLE.w / 2 - 6, y: -BUBBLE.h - 4, solid: false, temp: true }; this.platforms.push(B.plat); sfx('bighit', 1, 0.9); match.shake(10, 10); this.splash(match, B.x, -4, 10, 0xffffff); }
      return false;
    }
    return true;
  }
  /** The speech bubbles left behind as ledges: they pop after a while. */
  stepBubbles(match) {
    for (const B of this.bubbles) if (B.st === 'stay' && --B.life <= 0) { B.dead = true; this.platforms = this.platforms.filter((p) => p !== B.plat); sfx('popup', 0.6, 1.4); this.splash(match, B.x, -40, 10, 0xffffff); }
    this.bubbles = this.bubbles.filter((B) => !B.dead);
  }

  // ------------------------------------------------------------------ CUBISM
  /** SHATTER: he breaks apart into tumbling cubes; each lines up (a warning line) and rakes straight across the arena; then they snap back together into him. */
  atk_shatter(match, a, out) {
    const E = this.e, n = SHATTER.n, sc = SHATTER.scatter, w = sc + this.sp(SHATTER.warn);
    if (a.t === 1) {
      const b = this.body(); E.alpha = 0; sfx('glass', 1, 0.9); match.shake(6, 8); this.talk('BEHOLD! FRAGMENTS!', 70);
      this.pieces = Array.from({ length: n }, (_, i) => { const tg = this.nearest(match); const y = -20 - (i % 4) * 34, side = i % 2 ? -1 : 1; return { x: b.hip.x + (Math.random() - 0.5) * 60, y: b.sh.y + (Math.random() - 0.5) * 100, tx: side * 300, ty: i === 0 && tg ? tg.y - 20 : y, vx: 0, s: 14 + (i % 3) * 5, a: Math.random() * 6, id: this.sid('piece'), c: PAL.cubist.solids[i % 4], dir: -side, delay: i * 6 }; });
    }
    for (const P of this.pieces) {
      P.a += 0.15;
      if (a.t <= sc) { P.x = lerp(P.x, P.tx, 0.12); P.y = lerp(P.y, P.ty, 0.12); continue; }
      if (a.t <= w + P.delay) { P.warn = true; continue; }
      P.warn = false; P.x += P.dir * SHATTER.speed; out.push(this.bhit(P.id, P.x - P.s, P.y - P.s, P.x + P.s, P.y + P.s, ...SHATTER.hit, { dirX: P.dir }));
      if (Math.abs(P.x) > 330) P.done = true;
    }
    if (this.pieces.length && this.pieces.every((P) => P.done)) {
      if (!a.back) { a.back = a.t; sfx('glass', 0.8, 1.4); }
      const k = (a.t - a.back) / 20; E.alpha = Math.min(1, k);
      if (k >= 1) { this.pieces = []; E.alpha = 1; return true; }
    }
    return false;
  }
  /** PRISM SPIKES: angular spikes punch up out of the canvas one after another, running away from him across the floor - jump them. */
  atk_spikes(match, a, out) {
    const E = this.e, ev = this.sp(SPIKE.every);
    if (a.t === 1) { this.faceNearest(match); this.spikes = { from: E.x, dir: E.dir, list: [], id: 0 }; E.ba = 1.2; sfx('bighit', 0.6, 0.8); match.shake(4, 6); }
    const S = this.spikes; E.ba = 1.3;
    if (a.t % ev === 0 && S.list.length < SPIKE.n) { const x = S.from + S.dir * (50 + S.list.length * 48); if (Math.abs(x) < 245) { S.list.push({ x, t: 0, id: this.sid('spike') }); sfx('glass', 0.4, 1 + S.list.length * 0.08); } else S.list.push({ x, t: 99, dead: true }); }
    for (const P of S.list) { P.t++; if (P.dead) continue; const h = SPIKE.h * Math.min(1, P.t / 5) * (P.t > 30 ? Math.max(0, 1 - (P.t - 30) / 10) : 1); P.h = h; if (P.t < 16) out.push(this.bhit(P.id, P.x - 16, -h, P.x + 16, 0, ...SPIKE.hit, { radial: true })); }
    if (S.list.length >= SPIKE.n && S.list.every((P) => P.dead || P.t > 40)) { this.spikes = null; return true; }
    return false;
  }
  /** TWO FACES: his bucket shows both faces at once (front and profile); each charges, then both fire a beam - one straight ahead, one slanting down. */
  atk_twoface(match, a, out) {
    const E = this.e, ch = this.sp(TWOFACE.charge), b = this.body();
    if (a.t === 1) { this.faceNearest(match); E.faces = 2; sfx('laser', 0.5, 0.7); }
    const eye = { x: b.head.x + E.dir * 10, y: b.head.y - 4 };
    const beams = [{ x: eye.x, y: eye.y, ang: E.dir > 0 ? 0 : Math.PI }, { x: eye.x, y: eye.y, ang: E.dir > 0 ? 0.42 : Math.PI - 0.42 }];
    if (a.t <= ch) { this.beams = { list: beams, k: a.t / ch }; return false; }
    if (a.t <= ch + TWOFACE.fire) {
      this.beams = { list: beams, on: true }; if (a.t === ch + 1) { sfx('laser', 1, 0.5); match.shake(5, TWOFACE.fire); }
      beams.forEach((B, i) => { for (let q = 1; q <= 12; q++) { const px = B.x + Math.cos(B.ang) * q * 40, py = B.y + Math.sin(B.ang) * q * 40; if (py > 4) break; out.push(this.bhit('tf' + a.id + i + Math.floor(a.t / 13), px - 16, py - 12, px + 16, py + 12, ...TWOFACE.hit, { dirX: E.dir })); } });
      return false;
    }
    this.beams = null; E.faces = 1; return a.t > ch + TWOFACE.fire + 20;
  }

  // ------------------------------------------------------------------ IMPRESSIONISM
  /** SWIRL: a swirling vortex of night-sky paint opens on your spot and grows, pulling you in, then bursts. */
  atk_swirl(match, a, out) {
    const g = this.sp(SWIRL.grow);
    if (a.t === 1) { const tg = this.nearest(match); this.swirl = { x: Phaser.Math.Clamp(tg ? tg.x : 0, -220, 220), y: tg ? Math.min(-40, tg.y - 30) : -60, k: 0 }; sfx('rumble', 0.6, 1.4); this.talk('WHEEE!', 50); }
    const S = this.swirl; this.e.ba = -1 + Math.sin(a.t * 0.25) * 1;
    if (a.t <= g) {
      S.k = a.t / g;
      for (const f of match.fighters) if (f.alive && f.state !== 'respawn') { const dx = S.x - f.x; if (Math.abs(dx) < 180) f.x += Math.sign(dx) * Math.min(Math.abs(dx), SWIRL.pull * S.k); }
      if (a.t % 12 === 0) sfx('whoosh', 0.3, 0.8 + S.k);
      return false;
    }
    if (a.t <= g + 6) { if (a.t === g + 1) { sfx('bighit', 1, 0.7); match.shake(10, 10); this.splash(match, S.x, S.y, 20, 0xffd040); } out.push(this.bhit('sw' + a.id, S.x - SWIRL.r, S.y - SWIRL.r, S.x + SWIRL.r, S.y + SWIRL.r, ...SWIRL.hit, { radial: true })); S.burst = true; return false; }
    this.swirl = null; return a.t > g + 30;
  }
  /** FALLING STARS: swirly yellow stars streak down at marked spots. */
  atk_stars(match, a) {
    const n = STARS.n[this.boss.phase - 1], ev = this.sp(STARS.every); this.e.ba = -2;
    if (a.t % ev === 1 && this.stars.length < 12 && Math.floor(a.t / ev) < n) { const tg = this.nearest(match), x = Phaser.Math.Clamp((tg ? tg.x : 0) + (Math.random() - 0.5) * 120, -235, 235); this.stars.push({ x, y: -440, sx: x - 200, t: 0, id: this.sid('star') }); }
    return a.t > n * ev + STARS.warn + 40;
  }
  /** The stars: a mark, then a streak from up and to the side, a burst where they land. */
  stepStars(match, out) {
    for (const S of this.stars) {
      S.t++; if (S.t < STARS.warn) continue;
      const k = Math.min(1, (S.t - STARS.warn) / 14); S.cx = lerp(S.sx, S.x, k); S.cy = lerp(-440, -10, k);
      out.push(this.bhit(S.id, S.cx - 16, S.cy - 16, S.cx + 16, S.cy + 16, ...STARS.hit, { radial: true }));
      if (k >= 1) { S.dead = true; sfx('glass', 0.5, 1.6); this.splash(match, S.x, -6, 10, 0xffe060); }
    }
    this.stars = this.stars.filter((S) => !S.dead);
  }
  /** PAINT WAVE: a rolling, curling wave of blue paint sweeps across the canvas from one side - jump it. */
  atk_wave(match, a, out) {
    if (a.t === 1) { const s = Math.random() < 0.5 ? -1 : 1; this.wave = { x: s * 300, dir: -s, id: this.sid('wave') }; sfx('geyser', 1, 0.6); this.talk('SURF\'S UP!', 60); }
    const W = this.wave; W.x += W.dir * WAVE.speed; this.e.ba = 0.4 + Math.sin(a.t * 0.2) * 0.3;
    out.push(this.bhit(W.id, W.x - 30, -WAVE.h, W.x + 30, 0, ...WAVE.hit, { dirX: W.dir }));
    if (a.t % 6 === 0) match.particles.push({ x: W.x, y: -WAVE.h, vx: W.dir * 2, vy: -2, life: 20, color: 0xffffff, size: 2, grav: 0.2 });
    if (Math.abs(W.x) > 320) { this.wave = null; return true; }
    return false;
  }

  // ------------------------------------------------------------------ ACTION PAINTING
  /** ACTION PAINTING: he flings paint everywhere, frantic - splats land all over the arena (each marked a moment first) and leave wet paint. */
  atk_action(match, a) {
    const E = this.e; E.ba = -1 + Math.sin(a.t * 0.9) * 1.6; E.hop = Math.abs(Math.sin(a.t * 0.3)) * 10;
    if (a.t === 1) this.talk(['SPLAT! SPLAT! SPLAT!', 'ART IS CHAOS!', 'NO RULES!'][Math.floor(Math.random() * 3)], 80);
    if (a.t < ACTION.dur && a.t % this.sp(ACTION.every) === 0) { const tg = this.nearest(match), x = Math.random() < 0.4 && tg ? tg.x : -240 + Math.random() * 480; this.splats.push({ x: Phaser.Math.Clamp(x, -240, 240), t: 0, id: this.sid('splat'), c: PAL.splatter.tiles[2 + Math.floor(Math.random() * 4)] }); if (a.t % 12 === 0) sfx('whoosh', 0.3, 1.5); }
    return a.t > ACTION.dur + ACTION.warn + 10;
  }
  /** The splats: a mark, then a splash that hits, then wet paint. */
  stepSplats(match, out) {
    for (const S of this.splats) {
      S.t++;
      if (S.t === ACTION.warn) { out.push(this.bhit(S.id, S.x - 26, -50, S.x + 26, 0, ...ACTION.hit, { radial: true })); this.splash(match, S.x, -4, 8, S.c); this.wet.push({ x1: S.x - 20, x2: S.x + 20, life: 180, c: S.c }); sfx('geyser', 0.3, 1.9); S.dead = true; }
    }
    this.splats = this.splats.filter((S) => !S.dead);
  }
  /** BUCKET: he yanks the paint bucket off his head (wild hair, a gap-toothed grin - his bare head takes x2!) and hurls it at you; it spins out, sloshing paint, and comes back. */
  atk_bucket(match, a, out) {
    const E = this.e;
    if (a.t === 1) { this.faceNearest(match); this.talk('CATCH!!', 50); E.free = true; E.bb = 1.3; }
    if (a.t <= 24) { E.bb = lerp(1.3, -2.4, a.t / 24); return false; }
    if (a.t === 25) { const b = this.body(), tg = this.nearest(match, E.x); E.bucketOff = true; this.bucket = { x: b.head.x, y: b.head.y, sx: b.head.x, sy: b.head.y, tx: tg ? tg.x : E.x + E.dir * 200, ty: tg ? tg.y - 30 : -40, t: 0, a: 0, id: this.sid('bucket') }; sfx('whoosh', 1, 0.6); }
    const B = this.bucket; if (!B) return true;
    B.t++; B.a += 0.4; E.bb = -0.6;
    const out1 = this.sp(BUCKET.out), k = B.t / out1, go = k < 0.5 ? k * 2 : (1 - k) * 2, hb = this.body().head;
    B.x = k < 0.5 ? lerp(B.sx, B.tx, go) : lerp(hb.x, B.tx, go); B.y = (k < 0.5 ? lerp(B.sy, B.ty, go) : lerp(hb.y, B.ty, go)) - Math.sin(go * Math.PI) * 30;
    out.push(this.bhit(B.id + (k < 0.5 ? 'a' : 'b'), B.x - 20, B.y - 20, B.x + 20, B.y + 20, ...BUCKET.hit, { radial: true }));
    if (B.t % 4 === 0) match.particles.push({ x: B.x, y: B.y, vx: (Math.random() - 0.5) * 2, vy: 1, life: 30, color: PAL.splatter.tiles[2 + (B.t >> 2) % 4], size: 3, grav: 0.3 });
    if (k >= 1) { this.bucket = null; E.bucketOff = false; E.free = false; sfx('clang', 0.8, 0.9); return true; }
    return false;
  }
  /** Below 30%: ACTION PAINTING for good - he throws a tantrum, splattering himself and the whole world. */
  startLow(match) {
    this.low = true; this.talk(SAY.low, 110); this.rageText.setText('ACTION PAINTING!'); this.boss.rage = 100;
    this.startWipe(match, 'splatter'); sfx('roar', 0.6, 1.8); match.shake(10, 30);
  }

  /** You lost: he holds up a crayon drawing of you and laughs, bouncing (BossArena.bossTaunt). */
  onGloat(match, t) { const E = this.e; E.hop = Math.abs(Math.sin(t * 0.2)) * 14; E.ba = -0.7; E.bb = -0.5; this.gloatT = t; if (t === 1) this.talk('I\'M PUTTING THIS ON THE FRIDGE!', 400); }
  /** His health's gone. In the ART-OFF (a player watching): the finale cutscene first, then the usual end. */
  startDeath(match) {
    if (this.rival && this.sayG && !this.finaleDone) { this.finaleDone = true; this.boss.atk = null; this.card = null; this.onDeath(); this.say = null; const cam = match.worldCam || match.cameras.main; this.cut = { t: 0, n: ARTOFF.finale.n, once: new Set() }; this.ccam = { x: cam.midPoint.x, y: cam.midPoint.y, zoom: cam.zoom }; this.rageText.setVisible(false); return; }
    super.startDeath(match);
  }
  /** The cutscene camera (MatchScene asks introCam): eased toward `cut.shot`. */
  introCam() {
    if (!this.cut) return super.introCam();
    const w = this.cut.shot || { x: 0, y: -120, zoom: 1 }; this.ccam = { x: lerp(this.ccam.x, w.x, 0.08), y: lerp(this.ccam.y, w.y, 0.08), zoom: lerp(this.ccam.zoom, w.zoom, 0.08) };
    return { ...this.ccam, exact: true };
  }
  /** A fresh press skips to the end of the finale. */
  skipCut(match) { this.cut.t = Math.max(this.cut.t, this.cut.kind === 'master' ? MASTER.boom - 1 : ARTOFF.finale.boom - 1); this.cutStep(match); }
  /**
   * THE ART-OFF FINALE (MatchScene plays it while everyone else holds still): Mr Wake lands facing him; SMUDGE sits
   * down hard, bucket askew, sniffling; they talk (the dialogue box) - HOW? I'M A GENIUS. / TALENT NEEDS PATIENCE. /
   * WILL YOU TEACH ME? / FIRST LESSON: CLEAN YOUR BRUSHES. / AWW, MAAAN!! - and he bursts into a fountain of every
   * colour of paint, which rains down all over the canvas. Then the usual end.
   */
  cutStep(match) {
    if (this.cut.kind === 'master') return this.masterStep(match);
    const C = this.cut, F = ARTOFF.finale, E = this.e, f = this.rival, t = ++C.t; this.t++;
    const once = (k, at) => t >= at && !C.once.has(k) && !!C.once.add(k);
    if (f && f.state !== 'respawn' && t <= 30) { if (t === 1) C.from = { x: f.x, y: f.y, to: Phaser.Math.Clamp(E.x + (f.x < E.x ? -1 : 1) * 120, -220, 220) }; const q = t / 30; f.x = lerp(C.from.x, C.from.to, q); f.y = Math.min(0, lerp(C.from.y, 0, q) - Math.sin(q * Math.PI) * 30); f.vx = f.vy = 0; if (t === 30) f.grounded = true; }
    if (f) f.facing = Math.sign(E.x - f.x) || 1;
    if (once('sit', 1)) { sfx('bighit', 0.6, 1.4); sfx('curse', 0.4, 1.6); match.shake(6, 10); this.splash(match, E.x, -4, 16); }
    E.crouch = Math.min(0.8, E.crouch + 0.05); E.squash = 0.25; E.hop = 0; E.ba += (0.9 - E.ba) * 0.1; E.bb += (1.5 - E.bb) * 0.1; E.dir = f ? Math.sign(f.x - E.x) || E.dir : E.dir;
    const L = F.lines.find((q) => t >= q.at && t < q.at + q.len);
    this.sayBox(L ? sayPart(L.text, t, L.at, L.len * 0.4) : null, L ? L.who : '');
    if (L && t % 5 === 0 && t - L.at < L.len * 0.4) sfx('menu', 0.25, L.who === 'SMUDGE' ? 1.5 : 0.8);
    const fx = f ? f.x : 0;
    C.shot = L && L.who === 'MR WAKE' ? { x: fx, y: -50, zoom: 1.7 } : { x: E.x, y: -60, zoom: 1.9 };
    if (t < F.boom) { if (t % 40 === 0 && t > 20 && t < 260) this.splash(match, this.body().head.x + E.dir * 14, this.body().head.y + 8, 2, 0x8ad0ff); return; }   // (tears)
    if (once('boom', F.boom)) { sfx('geyser', 1, 0.7); sfx('bighit', 0.8, 1.2); sfx('laugh', 0.5, 1.8); match.shake(10, 30); E.alpha = 0; this.sayBox(null); }
    C.shot = { x: E.x, y: -110, zoom: 1.1 };
    if (t < F.boom + 50 && t % 2 === 0) for (let i = 0; i < 6; i++) match.particles.push({ x: E.x + (Math.random() - 0.5) * 40, y: -100, vx: (Math.random() - 0.5) * 9, vy: -4 - Math.random() * 7, life: 60, color: [0xff2a4a, 0x2a8aff, 0xffd400, 0x2ad060, 0xb04ae0, 0xffffff][i], size: 4, grav: 0.25 });
    if (t >= F.n) { this.cut = null; this.gone = true; this.sayBox(null); super.startDeath(match); }
  }
  /** His death: paint, not fire - splats of every colour burst off him, and confetti (BossArena's death timing). */
  /** His death runs longer than the default (TANTRUM). */
  deathLen() { return this.gone ? 150 : MELT.len; }
  /**
   * HIS DEATH - TANTRUM: he throws a full tantrum (stomping, hopping, flailing the brush, WAAAH!, paint everywhere),
   * the bucket flies off his head and bounces away across the canvas (`ibk` while it's loose), then - I'M TELLING!! -
   * he melts into a spreading rainbow puddle of paint (`puddleK`) and is gone, the bucket rolling to a stop by it.
   * (The ART-OFF's finale already burst him into paint - then just the splats.)
   */
  stepDeath(match) {
    const B = this.boss, b = this.body(), E = this.e, d = B.dying;
    if (this.gone) { if (d < 150 && d % 9 === 0) this.splash(match, (Math.random() - 0.5) * 300, -60 - Math.random() * 120, 10, [0xff2a4a, 0x2a8aff, 0xffd400, 0x2ad060][d % 4]); return; }
    if (d < MELT.pop) {                                                              // the tantrum
      E.hop = Math.abs(Math.sin(d * 0.35)) * 16; E.ba = -1.6 + Math.sin(d * 0.6) * 1.3; E.free = true; E.bb = 0.5 + Math.sin(d * 0.5) * 1.2;
      if (d % 12 === 0) E.dir = -E.dir;
      if (d % 10 === 0) { this.splash(match, b.hip.x + (Math.random() - 0.5) * 60, -4, 8, [0xff2a4a, 0x2a8aff, 0xffd400, 0x2ad060][(d / 10) % 4]); sfx('land', 0.4, 1.4); }
      if (d === 20 || d === 60) { match.popText({ x: b.head.x, y: b.head.y + 20 }, 'WAAAH!', '#ff7ab8'); sfx('scream', 0.35, 1.8); }
    }
    if (d === MELT.pop) {                                                            // the bucket flies off
      E.bucketOff = true; this.dBucket = { x: b.head.x, y: b.head.y, vx: E.dir * 3.5, vy: -9, a: 0 }; sfx('clang', 0.8, 1.4); this.splash(match, b.head.x, b.head.y, 18);
    }
    const K = this.dBucket;
    if (K) { K.vy += 0.4; K.x += K.vx; K.y += K.vy; K.a += K.vx * 0.06; if (K.y > -8) { K.y = -8; K.vy *= -0.4; K.vx *= 0.8; if (Math.abs(K.vy) > 1) sfx('clang', 0.3, 1.6); } if (Math.abs(K.x) > 240) K.vx = -K.vx; this.ibk = { x: K.x, y: K.y, a: K.a, up: false }; }
    if (d >= MELT.melt) {                                                            // melting into a puddle
      const k = Math.min(1, (d - MELT.melt) / (MELT.len - 50 - MELT.melt));
      E.hop = 0; E.free = false; E.squash = Math.min(1, k * 1.3); E.alpha = Math.max(0, 1 - k * 1.1); this.puddleK = k; this.puddleX = this.puddleX ?? E.x;
      if (d === MELT.melt) { this.talk('I\'M TELLIIIING!!', 120); sfx('geyser', 0.6, 1.4); }
      if (d % 6 === 0 && E.alpha > 0.1) match.particles.push({ x: b.hip.x + (Math.random() - 0.5) * 30, y: b.sh.y + Math.random() * 40, vx: 0, vy: 1 + Math.random(), life: 30, color: [0xff2a4a, 0x2a8aff, 0xffd400, 0x2ad060, 0xb84aff][d % 5], size: 3, grav: 0.15 });
    }
  }
  /** His death's rainbow puddle of paint, spreading under where he melted. */
  drawPuddle(fx) {
    const k = this.puddleK || 0; if (!k || !this.boss || !this.boss.dying) return;
    const x = this.puddleX, cols = [0xb84aff, 0x2a8aff, 0x2ad060, 0xffd400, 0xff8a20, 0xff2a4a];
    cols.forEach((c, i) => { const r = (90 - i * 13) * k; fx.fillStyle(c, 1); fx.fillEllipse(x + Math.sin(i * 1.7) * 6 * k, -1, r * 2, r * 0.32 + 2); });
    fx.fillStyle(0xffffff, 0.35); fx.fillEllipse(x - 20 * k, -3, 30 * k, 3);
  }

  /** His death: he plops down and wails (MOOOM!) - the explosions come from BossArena. */
  onDeath(match) {
    this.pieces = []; this.blobs = []; this.doodles = []; this.bursts = []; this.dots = null; this.scrib = null; this.eraser = null; this.spikes = null; this.beams = null; this.swirl = null; this.stars = []; this.wave = null; this.splats = []; this.bucket = null; this.e.free = false;
    this.dBucket = null; this.puddleK = 0; this.puddleX = null;
    this.e.alpha = this.gone ? 0 : 1; this.e.bucketOff = false; if (!this.rival) this.talk('NO FAIR!! MOOOOM!!', 200); if (match) this.splash(match, this.e.x, -100, 30);
  }

  // ------------------------------------------------------------------ the entrance
  /**
   * THE ENTRANCE (k = 0..1): the camera closes in on a paint bucket on the floor, a brush standing in it. It rattles,
   * harder and harder - then POP! he bursts out of it, brush in hand, kicking it up with him; he somersaults, it flips
   * over in the air and he jams it on his head - BONK - the paint gushes out as hair, he lands, twirls the brush and
   * points it at you: OOH! A NEW MODEL! (Then his own title card - drawIntro.)
   */
  introPose(match, k, t, n) {
    if (this.rival && t > 220) return this.artoffPose(match, t - 220);
    if (this.rival) { k = Math.min(1, t / 220); n = 220; }
    this.t++;
    const E = this.e, e = (a, b) => Phaser.Math.Clamp((k - a) / (b - a), 0, 1), at = (q) => t === Math.round(q * n);
    if (this.style !== 'sketch' || this.revealK !== 1) { this.setStyle('sketch', true); this.revealK = 1; }
    E.x = POP.x; E.dir = -1; E.alpha = 1; E.reveal = 1; E.crouch = 0;
    if (k < POP.pop) {                                                              // the bucket on the floor, rattling - he's inside
      const sh = e(0.16, POP.pop); this.inBucket = true; this.introBare = true; this.hairK = 0; E.hop = 0; E.spin = 0;
      this.ibk = { x: POP.x + Math.sin(t * 1.3) * sh * 1.5, y: -8 - (sh > 0.6 && t % 8 < 3 ? 2 : 0), a: sh * Math.sin(t * 0.9) * 0.14, up: true, brush: true };
      if (sh > 0 && t % Math.max(4, Math.round(14 - sh * 10)) === 0) sfx('clang', 0.2 + sh * 0.3, 1.6 + (t % 3) * 0.15);
      return;
    }
    if (at(POP.pop)) {                                                              // POP!
      sfx('bighit', 0.8, 1.5); sfx('geyser', 0.7, 1.3); match.shake(4, 8);
      const K = KIDPAL.sketch; for (let i = 0; i < 26; i++) match.particles.push({ x: POP.x, y: -16, vx: (Math.random() - 0.5) * 6, vy: -2 - Math.random() * 5, life: 40, color: K.hair[i % K.hair.length], size: 2, grav: 0.2 });
    }
    this.inBucket = false;
    if (k < POP.cap) {                                                              // up he goes, somersaulting; the bucket flips over above him and comes down on his head
      const q = e(POP.pop, POP.cap), up = Math.sin(q * Math.PI / 2);
      this.introBare = true; this.hairK = 0;
      E.hop = up * POP.high; E.spin = q * Math.PI * 2; E.ba = -1.7 + Math.sin(q * 7) * 0.25; E.free = true; E.bb = -1.5;
      const hy = -(KID.leg + KID.torso) - KID.head * 0.5 - 6 - POP.high;
      this.ibk = { x: lerp(POP.x, POP.x + 1, q), y: lerp(-8, hy, up) - Math.sin(q * Math.PI) * 30, a: Math.PI * q, up: true };
      return;
    }
    if (at(POP.cap)) { sfx('clang', 1, 0.9); sfx('bighit', 0.5, 1.6); match.shake(3, 6); }   // BONK
    this.ibk = null; this.introBare = false; E.spin = 0; E.free = false;
    this.hairK = e(POP.cap, POP.land + 0.08);
    if (k < POP.land) { const q = e(POP.cap, POP.land); E.hop = POP.high * (1 - q * q); E.ba = -1.7; return; }
    if (at(POP.land)) { E.squash = 1; sfx('bighit', 0.6, 1.2); match.shake(5, 8); this.splash(match, E.x, -2, 18); }
    E.hop = 0; E.squash *= 0.85;
    E.ba = lerp(-1.7 - Math.PI * 2, -0.25, e(POP.land + 0.02, POP.point)); E.bb = 1.3;
    if (at(POP.land + 0.03)) sfx('whoosh', 0.8, 1.3);
    if (at(POP.point)) this.talk(SAY.intro, 140);
    if (this.say) this.say.t++;
  }
  /** THE ART-OFF's exchange after his entrance (frames f into it): he spots the brush, they trade lines - him bouncing, outraged, pointing the brush at you. */
  artoffPose(match, f) {
    this.t++; const E = this.e, L = ARTOFF.lines.find((q) => f >= q.at && f < q.at + q.len);
    this.say = null;
    this.sayBox(L ? sayPart(L.text, f, L.at, L.len * 0.4) : null, L ? L.who : '');
    if (L && L.who === 'SMUDGE') { E.hop = Math.abs(Math.sin(f * 0.25)) * 8; E.ba = -0.3 + Math.sin(f * 0.2) * 0.3; if (f % 5 === 0 && (f - L.at) < L.len * 0.4) sfx('menu', 0.25, 1.4 + (f % 3) * 0.1); }
    else { E.hop *= 0.8; E.ba += (-0.25 - E.ba) * 0.1; if (L && f % 6 === 0 && (f - L.at) < L.len * 0.4) sfx('menu', 0.25, 0.8); }
    if (f === ARTOFF.lines[4].at) { sfx('laugh', 0.6, 1.6); match.shake(4, 10); }
  }
  /** The entrance: the world draws itself in - every tile and solid starts white and turns to its pattern colour in a ragged order (k = 0..1). */
  revealWorld(k) {
    if (Math.abs((this.revealK ?? -1) - k) < 0.02) return; this.revealK = k;
    const P = PAL.sketch, R = this.R; this.style = 'sketch'; R.fog = 0xffffff;
    for (const f of R.faces) { const want = f.k === 'tile' ? P.tiles[(f.i + f.j + 100) % 2] : P.solids[(f.q + f.i) % 2]; f.c = hash(f.i + 50, f.j || f.q, 3) < k ? want : 0xffffff; }
    this.skyG.clear(); this.skyG.fillStyle(0xffffff, 1); this.skyG.fillRect(-400, -400, 1440, 1200); this.patG.clear(); if (this.dotsT) this.dotsT.setVisible(false);
  }
  /** The entrance's camera: in close on the bucket, up with him as he pops out, then close on him as he lands. */
  introShot(k) {
    const c = this.core();
    if (this.rival) { const kk = k * (220 + ARTOFF.extra) / 220; if (kk > 1) return { x: c.x - 20, y: c.y + 20, zoom: 2.4 }; k = kk; }
    return k < POP.pop ? { x: POP.x, y: -18, zoom: 3.6 } : k < POP.land ? { x: POP.x, y: -70, zoom: 2.1 } : { x: c.x - 8, y: c.y + 8, zoom: 3 };
  }
  /** The freeze frame: him, brush pointed at you. */
  introAt() { const c = this.core(); return { x: c.x - 16, y: c.y + 12, zoom: 2.7 }; }
  /** After the intro: he's out of the bucket and it's on his head. */
  endIntro() {
    super.endIntro(); if (this.sayG) this.sayBox(null);
    const E = this.e; E.reveal = 1; E.spin = 0; E.hop = 0; E.free = false; this.inBucket = false; this.introBare = false; this.ibk = null; this.hairK = 1; this.setStyle('sketch', true);
  }
  /**
   * The intro's overlay - on the freeze, his own title card instead of the plain one: a giant rainbow brush stroke
   * swipes across the screen dripping paint, the letters of SMUDGE drop onto it one by one with a bounce and a splat
   * of paint each, and THE LITTLE MASTER is stuck on underneath on a strip of masking tape. (The ART-OFF keeps the plain card.)
   */
  drawIntro(P) {
    super.drawIntro(P);
    if (this.rival || !this.cardG) return;
    const g = this.cardG; g.clear();
    if (P.ph !== 'freeze') { this.cardL.forEach((o) => o.setVisible(false)); this.cardSub.setVisible(false); return; }
    for (const o of [this.introName, this.introGlow, this.introSub]) o.setVisible(false);
    g.setVisible(true).setAlpha(1);
    const f = P.f, W = VIEW_W, cy = 250, ease = (q) => 1 - Math.pow(1 - Phaser.Math.Clamp(q, 0, 1), 3), K = KIDPAL.sketch, cols = K.hair;
    // the brush stroke: six streaks of colour, ragged ends, bristle lines, drips running down from it
    const X = (W + 80) * ease((f - 2) / 14) - 40;
    cols.forEach((c, i) => {
      const y = cy - 22 + i * 7, end = X - 10 + hash(i, 3, 7) * 26;
      g.fillStyle(c, 1); g.fillRect(-10, y, end + 10, 8); g.fillCircle(end, y + 4, 4);
      g.fillStyle(0x000000, 0.12); g.fillRect(-10, y + 6, end + 10, 1);
    });
    for (let i = 0; i < 24; i++) {
      const x = 8 + i * 26 + hash(i, 1, 9) * 12; if (x > X - 10) continue;
      const len = Math.min(26, Math.max(0, (f - 10 - i * 0.6) * 0.9) * (0.4 + hash(i, 2, 4))), c = cols[i % cols.length];
      g.fillStyle(c, 1); g.fillRect(x - 1.5, cy + 20, 3, len); g.fillCircle(x, cy + 20 + len, 2.5);
    }
    // the letters: each drops in, bounces, and lands with a splat
    const n = this.cardL.length, gap = 54;
    this.cardL.forEach((o, i) => {
      const t0 = 12 + i * 4, q = (f - t0) / 12, x = W / 2 + (i - (n - 1) / 2) * gap;
      if (q < 0) { o.setVisible(false); return; }
      const land = Math.min(1, q), bounce = q < 1 ? (1 - land) ** 2 * 90 : Math.abs(Math.sin((q - 1) * 6)) * 10 * Math.max(0, 1 - (q - 1) * 2);
      o.setVisible(true).setPosition(x, cy - 2 - bounce).setScale(q < 1 ? 1 : 1 + Math.max(0, 0.25 - (q - 1)) * 0.6);
      if (q >= 1) for (let j = 0; j < 7; j++) {                                        // (its splat)
        const a = hash(i, j, 5) * Math.PI * 2, r = (12 + hash(j, i, 2) * 14) * ease((q - 1) * 4);
        g.fillStyle(cols[(i + j) % cols.length], 1); g.fillCircle(x + Math.cos(a) * r, cy - 2 + Math.sin(a) * r * 0.7, 2 + hash(i, j, 8) * 3);
      }
    });
    // THE LITTLE MASTER on a strip of masking tape
    const tq = ease((f - 40) / 12), tx = W / 2 + (1 - tq) * 260, ty = cy + 34;
    if (f > 40) {
      g.fillStyle(0x000000, 0.25); g.fillPoints([{ x: tx - 98, y: ty - 6 }, { x: tx + 100, y: ty - 10 }, { x: tx + 102, y: ty + 8 }, { x: tx - 96, y: ty + 12 }], true);
      g.fillStyle(0xf0e0b0, 1); g.fillPoints([{ x: tx - 100, y: ty - 8 }, { x: tx + 98, y: ty - 12 }, { x: tx + 100, y: ty + 6 }, { x: tx - 98, y: ty + 10 }], true);
      g.fillStyle(0xd8c890, 1); for (let i = 0; i < 6; i++) { g.fillTriangle(tx - 100, ty - 8 + i * 3, tx - 103, ty - 7 + i * 3, tx - 100, ty - 5 + i * 3); g.fillTriangle(tx + 98, ty - 12 + i * 3, tx + 101, ty - 11 + i * 3, tx + 98, ty - 9 + i * 3); }
    }
    this.cardSub.setVisible(f > 40).setPosition(tx, ty - 1);
  }

  // ------------------------------------------------------------------ hazards (VS too)
  start_drip(match, h) { h.title = 'DRIP!'; const tg = this.nearest(match); h.x = Phaser.Math.Clamp(tg ? tg.x : 0, -230, 230); }
  /** DRIP: a fat drop of paint gathers high above a mark, then falls - a splash and a wet patch. */
  step_drip(match, h, out) {
    if (h.t < DRIP.warn) { this.drip = { x: h.x, k: h.t / DRIP.warn }; return false; }
    const y = -420 + (h.t - DRIP.warn) * 16; this.drip = { x: h.x, y };
    out.push(this.bhit('drip' + h.id, h.x - 16, y - 20, h.x + 16, y + 16, ...DRIP.hit));
    if (y >= -6) { this.drip = null; sfx('geyser', 0.5, 1.6); this.splash(match, h.x, -4, 12, this.boss ? PAL[this.style].kid[5] : 0x2a8aff); this.wet.push({ x1: h.x - 30, x2: h.x + 30, life: 240, c: this.boss ? PAL[this.style].kid[5] : 0x2a8aff }); return true; }
    return false;
  }
  start_spill(match, h) { h.title = 'SPILL!'; h.x = Math.random() < 0.5 ? -130 : 130; }
  /** SPILL: a paint can tips over at the edge of the canvas and floods part of the floor - wet, slow paint. */
  step_spill(match, h) {
    if (h.t < SPILL.warn) { this.spill = { x: h.x, k: h.t / SPILL.warn }; return false; }
    if (h.t === SPILL.warn) { this.spill = null; sfx('geyser', 0.8, 0.8); this.wet.push({ x1: h.x - 110, x2: h.x + 110, life: SPILL.stay, c: 0x2a8aff }); }
    return true;
  }

  // ------------------------------------------------------------------ the frame
  /** Moves the arena and SMUDGE one frame; returns hazard + boss hitboxes. */
  step(match) {
    this.t++;
    const out = [];
    this.cycle.run(match, out);
    for (const W of this.wet) { W.life--; for (const f of match.fighters) if (f.alive && f.grounded && f.y > -4 && f.x > W.x1 && f.x < W.x2) f.slow = Math.max(f.slow || 0, SWEEP.slow); }
    this.wet = this.wet.filter((W) => W.life > 0);
    if (this.ledgeBack > 0 && --this.ledgeBack === 0) { this.platforms.splice(1, 0, ...this.ledges); sfx('ding', 0.5, 1.5); }
    if (this.boss) {
      this.bossStep(match, out);
      if (!this.low && !this.boss.dying && this.boss.hp <= this.boss.max * LOW.at) this.startLow(match);
      this.stepBlast(match, out);
      this.stepBlobs(match, out); this.stepDoodles(match, out); this.stepBursts(match, out); this.stepBubbles(match); this.stepStars(match, out); this.stepSplats(match, out);
      if (this.sayCD > 0) this.sayCD--;
      if (this.say && ++this.say.t > this.say.life) this.say = null;
      if (this.boss.dying && this.gone) this.e.alpha = 0;
    }
    if (this.wipe) { this.wipe.t++; if (this.wipe.t === 18) this.setStyle(this.wipe.next); if (this.wipe.t > 40) this.wipe = null; }
    return out;
  }
  /** A doodle's hitbox for the players: one hit pops one (strikeTargets runs on every attack hitbox). */
  strikeTargets(match, hbs) {
    super.strikeTargets(match, hbs);
    for (const D of this.doodles) for (const hb of hbs) {
      if (!hb.owner || D.dead || !(hb.x1 < D.x + 14 && hb.x2 > D.x - 14 && hb.y1 < 0 && hb.y2 > -54)) continue;
      D.dead = true; sfx('swing', 0.6, 1.4); for (let i = 0; i < 8; i++) match.particles.push({ x: D.x, y: -30, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3, life: 18, color: PAL[this.style].ink, size: 2, grav: 0.1 });
    }
    this.doodles = this.doodles.filter((D) => !D.dead);
  }

  // ------------------------------------------------------------------ drawing
  /** Draws the 3D world, the arena, SMUDGE and everything he's thrown, his speech bubble, the wipe; the bar. */
  render() {
    const B = this.boss, fx = this.fxG; this.R.render([]); this.drawArena(this.arenaG);
    fx.clear(); this.bubG.clear(); this.bubT.setVisible(false); this.burstT.forEach((o) => o.setVisible(false));
    this.pen.img.setVisible(!!(B || this.intro) && this.e.alpha > 0.02 && !this.inBucket);
    if (this.pen.img.visible) this.drawKid(this.pen, this.style);
    this.drawLooseBucket();
    this.drawFx(fx); this.drawPuddle(fx);
    this.drawMaster(this.overG);
    if (this.say && !(this.intro && this.introPhase().ph === 'freeze')) this.drawBubble();   // (not over his title card)
    if (this.wipe) this.drawWipe(fx);
    if (B) this.drawBar();
  }
  /**
   * SMUDGE in an art style, as pixel art (`pen` = a PixelPen; everything in world pixels, about a fighter's size):
   * short rainbow paint pouring from under the bucket's rim as hair, a patchwork of four band shirts (two logos),
   * ripped jeans, sneakers, the bucket jammed over his eyes (its handle under his chin like a chin strap, so only his
   * shark-tooth grin shows - two grins in TWO FACES; his bare head, eyes hidden under a paint-stiff fringe, when the
   * bucket's off), and the brush in both hands. Each style adds its own touch; the colours stay bright.
   */
  drawKid(pen, st) {
    const E = this.e, d = E.dir, t = this.t, P = PAL[st] || PAL.sketch, K = KIDPAL[st] || KIDPAL.sketch, ink = P.ink === 0xffffff ? 0x141414 : P.ink;
    const b = this.body(), g = pen, fl = this.boss && this.boss.flash > 0;
    const x0 = Math.round(E.x) - PX.fx, y0 = Math.round(E.y) - PX.fy;
    g.begin(x0, y0);
    const im = pen.img.setAlpha(E.alpha);
    if (E.spin) { const cy = PX.fy - E.hop - 25; im.setOrigin(PX.fx / PX.w, cy / PX.h).setPosition(x0 + PX.fx, y0 + cy).setRotation(E.spin * d); }
    else im.setOrigin(0, 0).setPosition(x0, y0).setRotation(0);
    const dk = (c, k = 0.25) => mix(c, 0x000000, k), lt = (c, k = 0.3) => mix(c, 0xffffff, k);
    const limb = (p, q, w, c) => { g.lineStyle(w, c); g.lineBetween(p.x, p.y, q.x, q.y); };
    const hx = b.head.x, hy = b.head.y, hk = this.hairK ?? 1, bare = E.bucketOff || this.introBare;
    // the paint hair: short ribbons of every colour pouring from under the back of the rim, rippling to his shoulders
    if (!bare && hk > 0) for (let r = 0; r < 5; r++) {
      const sx = hx - d * (1 + r * 2), sy = hy + 5, len = (8 + r * 1.5 + Math.sin(t * 0.08 + r) * 1.5) * hk, c = K.hair[r % K.hair.length], pts = [];
      for (let q = 0; q <= 5; q++) { const k = q / 5; pts.push({ x: sx - d * (k * (4 + r * 1.5) + Math.sin(t * 0.15 + r * 1.4 + k * 4) * 1.2 * k), y: sy + k * len }); }
      for (let q = 1; q < pts.length; q++) limb(pts[q - 1], pts[q], Math.max(2, 4 - q * 0.4), c);
      const e2 = pts[pts.length - 1]; g.fillStyle(c); g.fillCircle(e2.x, e2.y + 0.5, 1.6);
      if ((t + r * 23) % 60 < 24) g.fillRect(e2.x - 0.5, e2.y + 3 + ((t + r * 23) % 60) * 0.8, 1, 2);   // (a drip falling off the end)
    }
    const front = (b.tip.x - b.sh.x) * d > 0;                                        // (the brush in front of him, or trailing behind)
    const brush = () => {
      const L = KID.brush, ux = (b.tip.x - b.hand.x) / L, uy = (b.tip.y - b.hand.y) / L, px = -uy, py = ux;
      const fer = { x: b.hand.x + ux * (L - 15), y: b.hand.y + uy * (L - 15) }, base = { x: fer.x + ux * 4, y: fer.y + uy * 4 };
      limb({ x: b.hand.x - ux * 5, y: b.hand.y - uy * 5 }, fer, 3, K.wood);
      limb(fer, base, 4, 0xc8c8d8);
      g.fillStyle(K.paint); g.fillPoints([{ x: base.x + px * 3, y: base.y + py * 3 }, { x: b.tip.x + px * 1.5, y: b.tip.y + py * 1.5 }, { x: b.tip.x + ux * 3, y: b.tip.y + uy * 3 }, { x: b.tip.x - px * 1.5, y: b.tip.y - py * 1.5 }, { x: base.x - px * 3, y: base.y - py * 3 }]);
      g.fillStyle(K.hair[1 % K.hair.length]); g.fillPoints([{ x: base.x + px * 1, y: base.y + py * 1 }, { x: b.tip.x + ux * 1.5, y: b.tip.y + uy * 1.5 }, { x: base.x - px * 0.5, y: base.y - py * 0.5 }]);
    };
    const arm = (from, hand, sleeve, near) => {                                     // a short band-shirt sleeve, then a bare forearm
      const el = { x: (from.x + hand.x) / 2 - d * 1.5, y: (from.y + hand.y) / 2 + 2.5 };
      limb(from, el, 4, near ? sleeve : dk(sleeve)); limb(el, hand, 3, near ? K.skin : dk(K.skin, 0.15));
      g.fillStyle(near ? K.skin : dk(K.skin, 0.15)); g.fillCircle(hand.x, hand.y, 2.2);
    };
    const shF = { x: b.sh.x + d * 1.5, y: b.sh.y + 2 }, shB = { x: b.sh.x - d * 2.5, y: b.sh.y + 2 };
    if (!front) brush();
    arm(shB, b.hand, K.tees[2], false);                                              // (the far arm, on the top of the handle)
    // ripped jeans and sneakers
    const step = Math.sin(E.walk) * 4;
    for (const sd of [-1, 1]) {
      const foot = { x: b.ft.x + sd * 3.5 + sd * step * 0.5, y: b.ft.y - 2.5 }, knee = { x: (b.hip.x + foot.x) / 2 + d * 1.5, y: (b.hip.y + foot.y) / 2 };
      const c = sd < 0 ? dk(K.jeans, 0.15) : K.jeans;
      limb(b.hip, knee, 5, c); limb(knee, { x: foot.x, y: foot.y - 2 }, 4, c);
      g.fillStyle(K.skin); g.fillRect(knee.x - 1, knee.y - 1, 2, 2);                // (the rip at the knee, threads across it)
      g.fillStyle(0xf4f0e4); g.fillRect(knee.x - 1.5, knee.y - 1.5, 3, 1); g.fillRect(knee.x - 1.5, knee.y + 0.5, 3, 1);
      if (sd > 0) { g.fillStyle(K.skin); g.fillRect((b.hip.x + knee.x) / 2 - 1, (b.hip.y + knee.y) / 2, 2, 1); }   // (another rip, higher up)
      g.fillStyle(lt(K.jeans, 0.4)); g.fillRect(foot.x - 2.5, foot.y - 3.5, 5, 1);    // (frayed cuffs)
      g.fillStyle(sd < 0 ? dk(K.shoe, 0.15) : K.shoe); g.fillEllipse(foot.x + d * 1.5, foot.y, 9, 4);
      g.fillStyle(0xffffff); g.fillRect(foot.x + d * 1.5 - 4.5, foot.y + 1, 9, 1);
    }
    g.fillStyle(dk(K.jeans, 0.25)); g.fillRect(b.hip.x - 7, b.hip.y - 1, 14, 3);     // (the jeans' waistband and belt)
    g.fillStyle(0xc8c8d8); g.fillRect(b.hip.x + d * 1 - 1, b.hip.y - 1, 2, 2);
    // the shirts: one band tee over another, mismatched - a skull logo on the top one, a lightning bolt on the patch
    const sw = 6, hw = 7;
    g.fillStyle(K.tees[0]); g.fillPoints([{ x: b.sh.x - sw, y: b.sh.y - 1 }, { x: b.sh.x + sw, y: b.sh.y - 1 }, { x: b.hip.x + hw, y: b.hip.y - 1 }, { x: b.hip.x - hw, y: b.hip.y - 1 }]);
    g.fillStyle(K.tees[1]); g.fillPoints([{ x: b.hip.x - hw, y: b.hip.y - 6 }, { x: b.hip.x + d * 2, y: b.hip.y - 9 }, { x: b.hip.x + hw, y: b.hip.y - 4 }, { x: b.hip.x + hw, y: b.hip.y - 1 }, { x: b.hip.x - hw, y: b.hip.y - 1 }]);
    const lx = Math.round(b.sh.x + d * 1), ly = Math.round(b.sh.y + 4);
    g.fillStyle(K.logo[0]); g.fillRect(lx - 2, ly, 4, 3); g.fillRect(lx - 1, ly + 3, 2, 1);   // the skull
    g.fillStyle(K.tees[0]); g.fillRect(lx - 1, ly + 1, 1, 1); g.fillRect(lx + 1, ly + 1, 1, 1);
    g.fillStyle(K.logo[1]); g.fillPoints([{ x: b.hip.x + d * 3, y: b.hip.y - 8 }, { x: b.hip.x + d * 1, y: b.hip.y - 4 }, { x: b.hip.x + d * 3, y: b.hip.y - 4 }, { x: b.hip.x + d * 1, y: b.hip.y }]);   // the lightning bolt
    g.fillStyle(lt(K.tees[0], 0.35)); g.fillRect(b.hip.x - hw + 1, b.hip.y - 2, hw * 2 - 2, 1);   // (the hem of the under-shirt sticking out)
    if (st === 'sketch') { g.lineStyle(1, dk(K.jeans, 0.35)); g.lineBetween(b.hip.x - d * 4, b.hip.y + 2, b.hip.x - d * 2, b.hip.y + 8); }
    if (st === 'pop') { g.fillStyle(dk(K.tees[0], 0.3)); for (let y = b.sh.y + 1; y < b.hip.y - 9; y += 3) for (let x = b.hip.x - 5 + (y % 2); x < b.hip.x + 5; x += 3) g.fillRect(x, y, 1, 1); }
    if (st === 'cubist') { g.fillStyle(lt(K.tees[0], 0.25)); g.fillTriangle(b.sh.x, b.sh.y, b.hip.x + d * hw, b.hip.y - 6, b.hip.x, b.hip.y - 6); }
    if (st === 'starry') for (let i = 0; i < 5; i++) { g.fillStyle(K.hair[i % K.hair.length]); g.fillRect(b.hip.x - 6 + ((i * 7) % 12), b.sh.y + 1 + ((i * 5) % 8), 2, 1); }
    if (st === 'splatter') for (let i = 0; i < 6; i++) { g.fillStyle(K.hair[i % K.hair.length]); g.fillCircle(b.hip.x - 7 + ((i * 9) % 14), b.sh.y + 1 + ((i * 7) % 16), 0.8 + (i % 2)); }
    // the head
    const face = (ox) => {                                                         // (the bit under the rim: chin and a row of shark teeth)
      const cx = Math.round(hx + ox); g.fillStyle(K.skin); g.fillEllipse(cx, hy + 9, 16, 12);
      g.fillStyle(0x5a1020); g.fillPoints([{ x: cx - 7, y: hy + 5 }, { x: cx + 7, y: hy + 5 }, { x: cx + 6, y: hy + 10 }, { x: cx + 3, y: hy + 12 }, { x: cx - 3, y: hy + 12 }, { x: cx - 6, y: hy + 10 }]);
      g.fillStyle(0xffffff);
      for (let x = cx - 6; x < cx + 6; x += 3) g.fillTriangle(x, hy + 5, x + 3, hy + 5, x + 1.5, hy + 9);           // top teeth, every one a point
      for (let x = cx - 4.5; x < cx + 4; x += 3) g.fillTriangle(x, hy + 12, x + 3, hy + 12, x + 1.5, hy + 8.5);     // bottom teeth, between them
    };
    if (bare) {                                                                     // bare head: paint-stiff spiky hair, its fringe hiding his eyes
      g.fillStyle(K.skin); g.fillCircle(hx, hy + 3, 7.5);
      for (let i = 0; i < 6; i++) { const a = -Math.PI + 0.3 + i * 0.5; g.fillStyle(K.hair[i % K.hair.length]); g.fillTriangle(hx + Math.cos(a) * 5, hy + 1 + Math.sin(a) * 5, hx + Math.cos(a) * 11, hy - 1 + Math.sin(a) * 10, hx + Math.cos(a + 0.4) * 6, hy + 1 + Math.sin(a + 0.4) * 6); }
      for (let i = 0; i < 6; i++) { const x = hx - 8 + i * 3; g.fillStyle(K.hair[i % K.hair.length]); g.fillTriangle(x - 1.5, hy - 4, x + 3, hy - 4, x + 1, hy + 5 + (i % 2)); }
    }
    face(d * 1);
    if (E.faces === 2 && !bare) face(-d * 9);                                      // TWO FACES: a second grin sliding out the side
    if (!bare) {                                                                    // the bucket, upside down over his eyes
      this.bucketShape(g, hx, hy - 3, 0, K, ink, false, E.faces === 2, st);
      if (hk > 0) for (let i = 0; i < 7; i++) {                                     // paint pouring out under the rim (short drips at his face, so the grin shows)
        const x = hx - 8 + i * (16 / 6), c = K.hair[i % K.hair.length], y1 = hy + 5;
        g.fillStyle(c); g.fillRect(x - 1.5, y1 - 1, 3, 1.5);
        if (Math.abs(x - hx - d) < 7) continue;
        const l = (2 + ((i * 5) % 4)) * hk; g.fillRect(x - 1, y1, 2, l); g.fillCircle(x, y1 + l, 1.3);
      }
      const sl = { x: hx - 9.5, y: hy - 1 }, sr = { x: hx + 9.5, y: hy - 1 };       // the handle, down under his chin as a chin strap
      const strap = [sl, { x: hx - 9, y: hy + 7 }, { x: hx - 5, y: hy + 13 }, { x: hx + d, y: hy + 15 }, { x: hx + 6, y: hy + 13 }, { x: hx + 9, y: hy + 7 }, sr];
      g.lineStyle(2.5, ink); g.strokePoints(strap, false); g.lineStyle(1, 0xc8c8d8); g.strokePoints(strap, false);
      g.fillStyle(0x8a8a9a); g.fillCircle(sl.x, sl.y, 1.5); g.fillCircle(sr.x, sr.y, 1.5);
    }
    if (front) brush();
    arm(shF, b.hand2, K.tees[3], true);                                              // (the near arm, lower on the handle)
    g.finish(ink, fl);
  }
  /**
   * The paint bucket (into a PixelPen): centred on (cx, cy), turned by `a`; `upright` = open end up (on the floor, in
   * the intro) or upside down (on his head - base on top, rim at the bottom). `crack` = TWO FACES' crack.
   */
  bucketShape(g, cx, cy, a, K, ink, upright, crack, st) {
    const c = Math.cos(a), s2 = Math.sin(a), q = (x, y) => ({ x: cx + x * c - y * s2, y: cy + x * s2 + y * c });
    const f = upright ? -1 : 1, top = 7, bot = 9, y0 = -8 * f, y1 = 8 * f;          // (y0 = the base, y1 = the rim)
    g.fillStyle(K.bucket); g.fillPoints([q(-top, y0), q(top, y0), q(bot, y1), q(-bot, y1)]);
    g.fillStyle(mix(K.bucket, 0x000000, 0.22)); g.fillPoints([q(3, y0), q(top, y0), q(bot, y1), q(4, y1)]);
    g.fillStyle(mix(K.bucket, 0xffffff, 0.45)); g.fillPoints([q(-5, y0 + f), q(-4, y0 + f), q(-5, y1 - f), q(-6, y1 - f)]);
    g.fillStyle(mix(K.bucket, 0x000000, 0.35)); g.fillPoints([q(-bot - 0.5, y1 - 1.5 * f), q(bot + 0.5, y1 - 1.5 * f), q(bot + 0.5, y1), q(-bot - 0.5, y1)]);
    g.fillStyle(K.band); g.fillPoints([q(-8, -2.5), q(8, -2.5), q(8.5, 2), q(-8.5, 2)]);
    g.fillStyle(K.hair[0]); g.fillCircle(q(-2, 0).x, q(-2, 0).y, 1.2); g.fillStyle(K.hair[2 % K.hair.length]); g.fillCircle(q(1, -0.5).x, q(1, -0.5).y, 1); g.fillStyle(K.hair[4 % K.hair.length]); g.fillCircle(q(4, 0).x, q(4, 0).y, 1);
    if (crack) { g.lineStyle(1, ink); g.strokePoints([q(-2, y0), q(1, -1), q(-1, y1)], false); }
    if (st === 'pop') { g.fillStyle(mix(K.bucket, 0x000000, 0.3)); for (let y = -6; y < -3; y += 2) for (let x = 1; x < 6; x += 2) { const p = q(x, y * f); g.fillRect(p.x, p.y, 1, 1); } }
  }
  /** The bucket when it's not on his head (thrown, or on the floor / flying in the intro): its own little pixel-art canvas. */
  drawLooseBucket() {
    const P = this.bkPen, L = this.bucket ? { x: this.bucket.x, y: this.bucket.y, a: this.bucket.a, up: false } : this.ibk;
    P.img.setVisible(!!L); if (!L) return;
    const K = KIDPAL[this.style] || KIDPAL.sketch, ink = (PAL[this.style] || PAL.sketch).ink === 0xffffff ? 0x141414 : (PAL[this.style] || PAL.sketch).ink;
    P.begin(Math.round(L.x) - 32, Math.round(L.y) - 32);
    if (L.up && L.brush) {                                                          // (his brush standing in it, in the intro)
      P.lineStyle(3, K.wood); P.lineBetween(L.x + 3, L.y - 30, L.x + 1, L.y - 4); P.lineStyle(4, 0xc8c8d8); P.lineBetween(L.x + 3, L.y - 30, L.x + 3.5, L.y - 26);
    }
    this.bucketShape(P, L.x, L.y, L.a, K, ink, L.up, false, this.style);
    if (L.up) {                                                                     // (paint inside, slopping over the rim)
      P.fillStyle(K.paint); P.fillEllipse(L.x, L.y - 8 + (L.lid || 0), 16, 3);
      for (let i = 0; i < 3; i++) { P.fillRect(L.x - 7 + i * 6, L.y - 8, 2, 3 + i * 2); }
    } else for (let i = 0; i < 4; i++) { P.fillStyle(K.hair[i % K.hair.length]); const c = Math.cos(L.a), s2 = Math.sin(L.a); P.fillCircle(L.x - s2 * 9 + c * (-6 + i * 4), L.y + c * 9 + s2 * (-6 + i * 4), 1.5); }
    P.finish(ink, false);
  }
  /** Everything he's thrown or drawn: blobs, scribbles, eraser, doodles, bursts, dots, bubbles, fragments, spikes, beams, swirl, stars, wave, splats, bucket, drips. */
  drawFx(g) {
    const t = this.t, P = PAL[this.style], ink = P.ink;
    if (this.card) {                                                                     // THE ART-OFF: a judge's score card held up in his free hand
      const C = this.card, b = this.body(), x = b.hand2.x, y = b.hand2.y - 46 - Math.min(1, C.t / 8) * 6, k = Math.min(1, C.t / 6);
      g.lineStyle(3, 0x6a4420, 1); g.lineBetween(x, y + 20, b.hand2.x, b.hand2.y); g.lineStyle(0);
      g.fillStyle(0x000000, 1); g.fillRect(x - 36 * k, y - 22, 72 * k, 44); g.fillStyle(0xffffff, 1); g.fillRect(x - 33 * k, y - 19, 66 * k, 38);
      this.burstT[3].setText(C.score).setPosition(x, y - 4).setScale(k * 1.5).setRotation(0).setColor('#ff2a6a').setVisible(k > 0.3);
      if (++C.t === 8) this.talk(C.text, 80);
      if (C.t > 110) { this.card = null; }
    }
    for (const B of this.blobs) { g.fillStyle(ink, 1); g.fillCircle(B.x, B.y, 11); g.fillStyle(B.c, 1); g.fillCircle(B.x, B.y, 9); g.fillStyle(0xffffff, 0.6); g.fillCircle(B.x - 3, B.y - 3, 3); g.fillStyle(B.c, 0.25); g.fillEllipse(B.tx, -2, 40, 8); }
    if (this.scrib) {
      const S = this.scrib;
      if (S.warn) { g.fillStyle(ink, 0.3); for (let i = 1; i < S.pts.length; i++) { const p = S.pts[i - 1], q = S.pts[i]; for (let k = 0; k < 1; k += 0.12) g.fillCircle(lerp(p.x, q.x, k), lerp(p.y, q.y, k), 1.5); } }
      else { let L = 0; const last = []; for (let i = 1; i < S.pts.length; i++) { const p = S.pts[i - 1], q = S.pts[i], seg = Math.hypot(q.x - p.x, q.y - p.y); if (L > S.len) break; const f = Math.min(1, (S.len - L) / seg); g.lineStyle(4, ink, 1); g.lineBetween(p.x, p.y, lerp(p.x, q.x, f), lerp(p.y, q.y, f)); last.push({ x: lerp(p.x, q.x, f), y: lerp(p.y, q.y, f) }); L += seg; } g.lineStyle(0);
        const pen = last[last.length - 1]; if (pen) { g.fillStyle(0xffd040, 1); g.fillTriangle(pen.x, pen.y, pen.x + 10, pen.y - 24, pen.x + 18, pen.y - 18); g.fillStyle(ink, 1); g.fillCircle(pen.x, pen.y, 2); } }
    }
    if (this.eraser) { const R = this.eraser; g.fillStyle(ink, 1); g.fillRect(R.x - 48, R.y - 34, 96, 38); g.fillStyle(0xff9ab0, 1); g.fillRect(R.x - 45, R.y - 31, 90, 32); g.fillStyle(0x4a6ad0, 1); g.fillRect(R.x - 45, R.y - 31, 90, 10); g.fillStyle(0xffffff, 0.5); g.fillRect(R.x - 40, R.y - 18, 30, 4); }
    for (const D of this.doodles) {                                                       // stick figures: a circle head, scribbled limbs, a mean little face
      const k = D.grow, x = D.x, sw = Math.sin(D.walk) * 8, pn = D.punch > 0 && D.punch < 12 ? 22 : 0;
      g.lineStyle(3, ink, 1); g.strokeCircle(x, -48 * k, 9 * k); g.lineBetween(x, -39 * k, x, -18 * k);
      g.lineBetween(x, -18 * k, x - 8 + sw, 0); g.lineBetween(x, -18 * k, x + 8 - sw, 0); g.lineBetween(x, -32 * k, x + D.dir * (12 + pn), -30 * k); g.lineBetween(x, -32 * k, x - D.dir * 10, -22 * k); g.lineStyle(0);
      g.fillStyle(ink, 1); g.fillRect(x + D.dir * 2 - 3, -51 * k, 2, 3); g.fillRect(x + D.dir * 2 + 2, -51 * k, 2, 3); g.fillRect(x + D.dir * 2 - 3, -44 * k, 7, 1.5);
    }
    let bi = 0;
    for (const B of this.bursts) {                                                        // POP: target, then a jagged star with the word in it
      if (B.t < KAPOW.warn) { const k = B.t / KAPOW.warn; g.lineStyle(3, 0x000000, 0.8); g.strokeCircle(B.x, B.y, KAPOW.r * (1.4 - k * 0.4)); g.lineStyle(2, B.c, 1); g.strokeCircle(B.x, B.y, KAPOW.r * (1.4 - k * 0.4)); g.lineBetween(B.x - 10, B.y, B.x + 10, B.y); g.lineBetween(B.x, B.y - 10, B.x, B.y + 10); g.lineStyle(0); continue; }
      const s = Math.min(1, (B.t - KAPOW.warn) / 4) * (1 - Math.max(0, B.t - KAPOW.warn - 16) / 10), pts = [];
      for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, r = (i % 2 ? KAPOW.r * 0.6 : KAPOW.r * 1.1) * s; pts.push({ x: B.x + Math.cos(a) * r, y: B.y + Math.sin(a) * r }); }
      g.fillStyle(0x000000, 1); g.fillPoints(pts.map((p) => ({ x: B.x + (p.x - B.x) * 1.12, y: B.y + (p.y - B.y) * 1.12 })), true); g.fillStyle(B.c, 1); g.fillPoints(pts, true);
      g.fillStyle(0xffe14a, 1); g.fillPoints(pts.map((p) => ({ x: B.x + (p.x - B.x) * 0.6, y: B.y + (p.y - B.y) * 0.6 })), true);
      if (bi < 4) { this.burstT[bi++].setText(B.word).setPosition(B.x, B.y).setScale(s * 1.2).setRotation(-0.15).setVisible(s > 0.2); }
    }
    if (this.dots) { const D = this.dots, w = this.sp(DOTS.warn); for (const x of D.xs) { g.fillStyle(0xff2a8a, D.t < w ? 0.15 + 0.15 * (t % 10 < 5 ? 1 : 0) : 0.08); g.fillRect(x - 18, -420, 36, 420); } for (const P2 of D.drops) { g.fillStyle(0x000000, 1); g.fillCircle(P2.x, P2.y, DOTS.r + 2); g.fillStyle(P2.c, 1); g.fillCircle(P2.x, P2.y, DOTS.r); } }
    for (const B of this.bubbles) {                                                       // the giant speech bubble (and its shadow first)
      if (B.y < -300 && B.warnK != null) { g.fillStyle(0x000000, 0.15 + 0.3 * B.warnK); g.fillEllipse(B.x, -2, BUBBLE.w * (0.5 + B.warnK * 0.5), 10); }
      const x1 = B.x - BUBBLE.w / 2, y1 = B.y - BUBBLE.h, fade = B.st === 'stay' && B.life < 60 && t % 6 < 3 ? 0.5 : 1;
      g.fillStyle(0x000000, fade); g.fillRoundedRect(x1 - 3, y1 - 3, BUBBLE.w + 6, BUBBLE.h - 10 + 6, 18); g.fillStyle(0xffffff, fade); g.fillRoundedRect(x1, y1, BUBBLE.w, BUBBLE.h - 10, 16);
      g.fillStyle(0xffffff, fade); g.fillTriangle(B.x - 10, y1 + BUBBLE.h - 12, B.x + 12, y1 + BUBBLE.h - 12, B.x - 20, B.y); g.lineStyle(3, 0x000000, fade); g.lineBetween(B.x - 10, y1 + BUBBLE.h - 10, B.x - 20, B.y); g.lineBetween(B.x + 12, y1 + BUBBLE.h - 10, B.x - 20, B.y); g.lineStyle(0);
      if (bi < 4) this.burstT[bi++].setText(B.text).setPosition(B.x, y1 + (BUBBLE.h - 10) / 2).setScale(1.6).setRotation(0).setColor('#ff2a8a').setVisible(true);
    }
    this.burstT.forEach((o, i) => { if (i >= bi && !(i === 3 && this.card)) o.setColor('#ffffff'); });
    for (const p of this.pieces) {                                                        // CUBISM: tumbling cube fragments (and their aim lines)
      if (p.warn) { g.lineStyle(2, ink, 0.4 + (t % 8 < 4 ? 0.3 : 0)); g.lineBetween(-300, p.y, 300, p.y); g.lineStyle(0); }
      const c = Math.cos(p.a), s = Math.sin(p.a), q = (x, y) => ({ x: p.x + x * c - y * s, y: p.y + x * s + y * c });
      g.fillStyle(ink, 1); g.fillPoints([q(-p.s - 2, -p.s - 2), q(p.s + 2, -p.s - 2), q(p.s + 2, p.s + 2), q(-p.s - 2, p.s + 2)], true);
      g.fillStyle(p.c, 1); g.fillPoints([q(-p.s, -p.s), q(p.s, -p.s), q(p.s, p.s), q(-p.s, p.s)], true); g.fillStyle(mix(p.c, 0xffffff, 0.35), 1); g.fillPoints([q(-p.s, -p.s), q(p.s, -p.s), q(0, 0)], true);
    }
    if (this.spikes) for (const S of this.spikes.list) { if (S.dead || !S.h) continue; g.fillStyle(ink, 1); g.fillTriangle(S.x - 18, 0, S.x + 18, 0, S.x + 4, -S.h - 4); g.fillStyle(PAL.cubist.solids[Math.floor(S.x) & 3], 1); g.fillTriangle(S.x - 15, 0, S.x + 15, 0, S.x + 4, -S.h); g.fillStyle(0xffffff, 0.35); g.fillTriangle(S.x - 15, 0, S.x, 0, S.x + 4, -S.h); }
    if (this.beams) for (const B of this.beams.list) {
      const x2 = B.x + Math.cos(B.ang) * 520, y2 = B.y + Math.sin(B.ang) * 520;
      if (this.beams.on) { g.lineStyle(16, 0xc0502a, 0.5); g.lineBetween(B.x, B.y, x2, y2); g.lineStyle(6, 0xffe0a0, 1); g.lineBetween(B.x, B.y, x2, y2); }
      else { g.lineStyle(1, ink, 0.4 + 0.5 * this.beams.k); g.lineBetween(B.x, B.y, x2, y2); g.fillStyle(0xffe0a0, 0.5 * this.beams.k); g.fillCircle(B.x, B.y, 4 + 10 * this.beams.k); }
      g.lineStyle(0);
    }
    if (this.swirl) { const S = this.swirl, r = SWIRL.r * (0.3 + 0.7 * S.k); for (let k = 0; k < 5; k++) { g.lineStyle(6 - k, [0x2a4ab0, 0x5a8ae0, 0xfff0a0, 0xffd040, 0xffffff][k], S.burst ? 1 : 0.85); g.beginPath(); for (let a = 0; a < 10; a += 0.25) { const rr = r * (a / 10) + k * 3; g.lineTo(S.x + Math.cos(a + t * 0.25 + k) * rr, S.y + Math.sin(a + t * 0.25 + k) * rr * 0.8); } g.strokePath(); } g.lineStyle(0); }
    for (const S of this.stars) {
      if (S.t < STARS.warn) { g.fillStyle(0xffd040, 0.3 + 0.3 * (t % 8 < 4 ? 1 : 0)); g.fillEllipse(S.x, -2, 36, 8); continue; }
      if (S.cx == null) continue; g.lineStyle(8, 0xffd040, 0.4); g.lineBetween(S.cx - 60, S.cy - 130, S.cx, S.cy); g.lineStyle(0);
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + t * 0.2, r = i % 2 ? 7 : 16; g.fillStyle(i % 2 ? 0xfff0a0 : 0xffd040, 1); g.fillTriangle(S.cx, S.cy, S.cx + Math.cos(a) * r, S.cy + Math.sin(a) * r, S.cx + Math.cos(a + 0.6) * (i % 2 ? 16 : 7), S.cy + Math.sin(a + 0.6) * (i % 2 ? 16 : 7)); }
    }
    if (this.wave) { const W = this.wave; g.fillStyle(0x0e1a60, 1); g.fillEllipse(W.x, -WAVE.h * 0.4, 90, WAVE.h * 1.4); g.fillStyle(0x2a4ab0, 1); g.fillEllipse(W.x, -WAVE.h * 0.45, 76, WAVE.h * 1.2); g.fillStyle(0xffffff, 1); for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + W.dir * (i * 0.35); g.fillCircle(W.x + W.dir * 10 + Math.cos(a) * 26, -WAVE.h * 0.5 + Math.sin(a) * 26, 5 - i * 0.5); } g.lineStyle(3, 0xfff0a0, 0.8); g.beginPath(); g.arc(W.x, -WAVE.h * 0.5, 18, -Math.PI, 0); g.strokePath(); g.lineStyle(0); }
    for (const S of this.splats) { g.fillStyle(S.c, 0.3 + 0.4 * (S.t / ACTION.warn)); g.fillEllipse(S.x, -2, 40 * (S.t / ACTION.warn), 8); }
    // (the thrown bucket is drawn by drawLooseBucket, in pixels)
    if (this.drip) { const D = this.drip; if (D.y == null) { g.fillStyle(0x2a8aff, 0.3 + 0.3 * D.k); g.fillEllipse(D.x, -2, 30, 6); g.fillCircle(D.x, -400 + D.k * 20, 6 + D.k * 10); } else { g.fillStyle(0x2a8aff, 1); g.fillCircle(D.x, D.y, 13); g.fillTriangle(D.x - 12, D.y - 4, D.x + 12, D.y - 4, D.x, D.y - 30); } }
    if (this.spill) { const S = this.spill; g.fillStyle(0x2a8aff, 0.2 + 0.3 * S.k); g.fillRect(S.x - 110 * S.k, -4, 220 * S.k, 4); }
    if (this.gloatT) {                                                                    // the crayon drawing of you he waves when he wins
      const b = this.body(), x = b.hand2.x, y = b.hand2.y - 60; g.fillStyle(0xffffff, 1); g.fillRect(x - 30, y - 34, 60, 50); g.lineStyle(2, 0x000000, 1); g.strokeRect(x - 30, y - 34, 60, 50);
      g.lineStyle(2, 0xff2a2a, 1); g.strokeCircle(x, y - 18, 8); g.lineBetween(x, y - 10, x, y + 4); g.lineBetween(x, y + 4, x - 7, y + 12); g.lineBetween(x, y + 4, x + 7, y + 12); g.lineStyle(2, 0x2a8aff, 1); g.lineBetween(x - 10, y - 4, x + 10, y - 4); g.fillStyle(0x141414, 1); g.fillRect(x - 4, y - 21, 2, 2); g.fillRect(x + 2, y - 21, 2, 2); g.lineStyle(0);
    }
  }
  /** His speech bubble: a rounded comic bubble with a tail, over his head. */
  drawBubble() {
    const S = this.say, b = this.body(), g = this.bubG, pop = Math.min(1, S.t / 6), x = Phaser.Math.Clamp(b.head.x - this.e.dir * 24, -230, 230), y = b.head.y - 44;
    this.bubT.setText(S.text).setPosition(x, y).setScale(pop).setVisible(true);
    const w = Math.max(60, this.bubT.width + 18) * pop, h = (this.bubT.height + 14) * pop;
    g.fillStyle(0x000000, 1); g.fillRoundedRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4, 10); g.fillStyle(0xffffff, 1); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 9);
    g.fillStyle(0xffffff, 1); g.fillTriangle(x - 6, y + h / 2 - 2, x + 8, y + h / 2 - 2, b.head.x, b.head.y - 14); g.lineStyle(2, 0x000000, 1); g.lineBetween(x - 6, y + h / 2, b.head.x, b.head.y - 14); g.lineBetween(x + 8, y + h / 2, b.head.x, b.head.y - 14); g.lineStyle(0);
  }
  /** The style change: a giant brush stroke sweeping right across the view, ragged-edged, in the new paint. */
  drawWipe(g) {
    const W = this.wipe, k = W.t / 40, cx = lerp(-900, 900, k);
    g.fillStyle(W.c, 1); g.fillRect(cx - 520, -600, 1040, 900);
    for (let i = 0; i < 30; i++) { const y = -600 + i * 30; g.fillCircle(cx + 520 + Math.sin(i * 1.7) * 30, y, 22); g.fillCircle(cx - 520 - Math.sin(i * 2.3) * 30, y, 22); }
    g.fillStyle(0xffffff, 0.25); for (let i = 0; i < 14; i++) g.fillRect(cx - 500 + i * 70, -600, 6, 900);
  }
}

/** THE BLANK CANVAS's miniature for the stage select screen. */
export function drawBlankCanvasPreview(g, x, y, w, h) {
  g.fillStyle(0xffffff, 1); g.fillRect(x, y, w, h);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) { g.fillStyle((i + j) % 2 ? 0x141414 : 0xffffff, 1); g.fillRect(x + i * w / 8, y + h * 0.78 + j * h * 0.075, w / 8, h * 0.075); }
  g.fillStyle(0xfafaf6, 1); g.fillRect(x + w * 0.15, y + h * 0.66, w * 0.7, h * 0.08); g.lineStyle(1, 0x141414, 1); g.strokeRect(x + w * 0.15, y + h * 0.66, w * 0.7, h * 0.08); g.lineStyle(0);
  const cx = x + w * 0.6, fy = y + h * 0.66;
  g.fillStyle(0xff2a6a, 1); g.fillRect(cx - 5, fy - h * 0.5, 10, h * 0.13);                          // bucket
  g.fillStyle(0x2a6aff, 1); g.fillRect(cx - 6, fy - h * 0.37, 12, h * 0.2); g.fillStyle(0xffd400, 1); g.fillRect(cx - 5, fy - h * 0.17, 10, h * 0.17);
  g.lineStyle(2, 0x8a5a2a, 1); g.lineBetween(cx - 4, fy - h * 0.3, cx - w * 0.2, fy - h * 0.55); g.lineStyle(0); g.fillStyle(0xff2a6a, 1); g.fillCircle(cx - w * 0.2, fy - h * 0.55, 3);
}

// THE BLANK CANVAS - the arena of SMUDGE, THE LITTLE MASTER (boss VII; Trinkets > BOSS FIGHTS, src/data/bosses.js).
// An original character: a hyperactive, bratty nine-year-old art prodigy with a paint bucket jammed upside down over his
// head and eyes (its handle hangs under his chin like a chin strap, so all you see is his big toothy grin), rainbow
// paint pouring out from under the rim and running down his back as hair, overalls covered in stains and a paintbrush
// taller than he is, held in both hands with the tip dragging on the floor behind him. Drawn as real pixel art
// (pixelPen.js), always in bright colours, whatever the style. He talks the whole fight (comic speech bubbles) - critiquing you, bragging,
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
// his size (world pixels - about twice a fighter's height): leg, torso, head (bucket) heights; the brush: arm reach, brush length; walk speeds
const KID = { leg: 26, torso: 26, head: 34, arm: 20, brush: 84, walk: 1.6, fast: 2.4, range: 190 };
// his colours in each style - always bright, even in SKETCH: skin, shirt stripes, overalls, shoes, bucket, the bucket's
// label band, the brush's paint, the paint hair's ribbons (rainbow), the brush handle
const KIDPAL = {
  sketch: { skin: 0xffcfa0, shirt: [0xff3a3a, 0xfff4e0], over: 0x2a78ff, shoe: 0xff2a78, bucket: 0x34d0bc, band: 0xffd400, paint: 0xff2a78, hair: [0xff2a4a, 0xff9a1a, 0xffe03a, 0x2ad060, 0x2a8aff, 0xb04aff], wood: 0xd08a3a },
  pop: { skin: 0xffcf9a, shirt: [0xffd400, 0xff2a8a], over: 0x22c8ff, shoe: 0xff2a2a, bucket: 0xff2a8a, band: 0xffffff, paint: 0xffd400, hair: [0xff2a8a, 0xffd400, 0x22c8ff, 0xff7a2a, 0xa04aff], wood: 0xffd400 },
  cubist: { skin: 0xe8a878, shirt: [0xc8502a, 0xf0c878], over: 0x3a8ab0, shoe: 0xa83a2a, bucket: 0xe8a830, band: 0x3a5a8a, paint: 0xd84a2a, hair: [0xd84a2a, 0xe8a830, 0x3a8ab0, 0x6aa85a, 0x8a4a9a], wood: 0x8a5a3a },
  starry: { skin: 0xffd8b0, shirt: [0x3a5ae0, 0xffd040], over: 0x2a3ab8, shoe: 0xffd040, bucket: 0xffd040, band: 0x3a5ae0, paint: 0x5ab8ff, hair: [0xffd040, 0x5a8ae0, 0x2ad0c0, 0xfff0a0, 0x8a6aff], wood: 0x7a4a2a },
  splatter: { skin: 0xffcf9a, shirt: [0xffffff, 0xff2a2a], over: 0x2a3a7a, shoe: 0xff2a2a, bucket: 0xf0f0f0, band: 0xff2a2a, paint: 0xff2a2a, hair: [0xff2a4a, 0xff9a1a, 0xffe03a, 0x2ad060, 0x2a8aff, 0xb04aff], wood: 0x8a5a2a },
};
// the pixel canvas he's drawn into (world pixels) and where his feet sit in it
const PX = { w: 300, h: 260, fx: 150, fy: 196 };
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
const HIT = { dmg: 1.34, base: 1.18, growth: 1.5 };
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
    this.sparkColor = 0xff2a6a; this.bodyW = 50; this.bodyH = 100;
  }

  // ------------------------------------------------------------------ the arena
  /** Builds the sky and pattern layers, the infinite 3D world, the canvas and ledges, SMUDGE's layers and his speech bubble. */
  draw(world, bg) {
    const s = this.scene;
    this.skyG = s.add.graphics().setScrollFactor(0); this.patG = s.add.graphics().setScrollFactor(0.15).setPosition(SKY.x, SKY.y); bg.push(this.skyG, this.patG);
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
    this.fxG = s.add.graphics(); world.push(this.fxG);
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
    if (this.style === 'sketch') { p.lineStyle(1, 0x141414, 0.12); for (let i = -40; i < 40; i++) p.lineBetween(i * 30, -500, i * 30 + 400, 500); }   // pencil hatching
    else if (this.style === 'pop') { for (let y = -480; y < 480; y += 14) for (let x = -800; x < 800; x += 14) { p.fillStyle(0xffffff, 0.25); p.fillCircle(x + ((y / 14) % 2) * 7, y, 3 + Math.sin(x * 0.01 + y * 0.01) * 1.5); } }
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
    if (!this.rival) return;
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
    const sh = { x: hip.x + d * 4 + d * c * 10, y: hip.y - KID.torso * (1 - sq * 0.15) };
    const head = { x: sh.x + d * 2, y: sh.y - KID.head * 0.5 - 4 };
    const ux = Math.cos(E.ba) * d, uy = Math.sin(E.ba);
    const hand = { x: sh.x + d * 3 + ux * KID.arm, y: sh.y + 5 + uy * KID.arm };
    const tip = { x: hand.x + ux * KID.brush, y: hand.y + uy * KID.brush };
    // the other hand grips the brush a little further down the handle - unless it's busy (throwing the bucket, the score card)
    const hand2 = E.free || this.card ? { x: sh.x - d * 6 + Math.cos(E.bb) * d * KID.arm * 0.9, y: sh.y + 6 + Math.sin(E.bb) * KID.arm * 0.9 } : { x: hand.x + ux * 12, y: hand.y + uy * 12 };
    return { ft, hip, sh, head, hand, tip, hand2 };
  }
  /** What the camera and the CPU aim at: his bucket. */
  core() { if (this.pieces.length && this.boss && this.boss.atk && this.boss.atk.name === 'shatter') return { x: this.e.x, y: -70 }; const b = this.body(); return { x: b.head.x, y: b.head.y }; }
  /** Where he can be hit: his bucket head (x1.2, bare head x2), his body (x0.9); everything x1.5 while the paint's wet (restyling). None while shattered. */
  hurt() {
    const E = this.e; if (E.alpha < 0.5) return [];
    const b = this.body(), wet = this.boss && this.boss.atk && this.boss.atk.name === 'restyle' ? RESTYLE.wet : 1;
    return [{ x1: b.head.x - 20, y1: b.head.y - 22, x2: b.head.x + 20, y2: b.head.y + 22, mult: (E.bucketOff ? 2 : 1.2) * wet },
      { x1: b.hip.x - 18, y1: b.sh.y, x2: b.hip.x + 18, y2: Math.min(0, b.ft.y), mult: 0.6 * wet }];
  }
  /** What he does next: a RESTYLE every few attacks, then the current style's moves (plus the brush); ACTION PAINTING mixes everything. */
  pattern(phase) {
    const every = phase === 2 ? RESTYLE.rage : RESTYLE.every;
    if (this.low) return ['action', 'bucket', 'sweep', 'flick', ...this.styleMoves(STYLES[Math.floor(Math.random() * 4)])];
    if (this.count % every === every - 1) return ['restyle'];
    return [...this.styleMoves(this.style), 'sweep', 'flick'];
  }
  /** The three attacks that belong to a style. */
  styleMoves(st) { return { sketch: ['scribble', 'eraser', 'doodles'], pop: ['kapow', 'dots', 'bubble'], cubist: ['shatter', 'spikes', 'twoface'], starry: ['swirl', 'stars', 'wave'], splatter: ['action', 'bucket'] }[st] || ['sweep']; }
  /** Counts his attacks (so RESTYLE comes round). */
  tally() { this.count++; }
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
    if (tg && Math.abs(tg.x - E.x) > 130) this.walkTo(tg.x - Math.sign(tg.x - E.x) * 100, this.speed() * 0.7);
    else if (tg) E.dir = Math.sign(tg.x - E.x) || E.dir;
    if (this.t % 50 < 12) E.hop = Math.max(E.hop, Math.sin((this.t % 50) / 12 * Math.PI) * 6);
    if (this.sayCD <= 0 && !this.say) this.talk(SAY.idle[Math.floor(Math.random() * SAY.idle.length)]);
  }

  /** The brush angle that rests its tip on the floor behind him, both hands on the handle (written past -PI so a swing from the front goes up over his head). */
  restAngle() {
    const E = this.e, sh = this.body().sh, ft = E.y - E.hop;
    const uy = Phaser.Math.Clamp((ft - 2 - (sh.y + 5)) / (KID.arm + KID.brush), -1, 1);
    return -Math.PI - Math.asin(uy);
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
  onGloat(match, t) { const E = this.e; E.hop = Math.abs(Math.sin(t * 0.2)) * 14; E.ba = -1.5; E.bb = -1.2; this.gloatT = t; if (t === 1) this.talk('I\'M PUTTING THIS ON THE FRIDGE!', 400); }
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
  skipCut(match) { this.cut.t = Math.max(this.cut.t, ARTOFF.finale.boom - 1); this.cutStep(match); }
  /**
   * THE ART-OFF FINALE (MatchScene plays it while everyone else holds still): Mr Wake lands facing him; SMUDGE sits
   * down hard, bucket askew, sniffling; they talk (the dialogue box) - HOW? I'M A GENIUS. / TALENT NEEDS PATIENCE. /
   * WILL YOU TEACH ME? / FIRST LESSON: CLEAN YOUR BRUSHES. / AWW, MAAAN!! - and he bursts into a fountain of every
   * colour of paint, which rains down all over the canvas. Then the usual end.
   */
  cutStep(match) {
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
  stepDeath(match) {
    const B = this.boss, b = this.body();
    if (B.dying < 150 && B.dying % 7 === 0) { this.splash(match, b.hip.x + (Math.random() - 0.5) * 80, b.sh.y + (Math.random() - 0.5) * 120, 14, [0xff2a4a, 0x2a8aff, 0xffd400, 0x2ad060][B.dying % 4]); match.particles.push({ shape: 'ring', x: b.hip.x, y: b.sh.y, vx: 0, vy: 0, life: 16, maxLife: 16, color: 0xffffff, grav: 0, r: 6, dr: 5 }); sfx('geyser', 0.4, 1.4 + Math.random() * 0.4); }
  }
  /** His death: he plops down and wails (MOOOM!) - the explosions come from BossArena. */
  onDeath(match) {
    this.pieces = []; this.blobs = []; this.doodles = []; this.bursts = []; this.dots = null; this.scrib = null; this.eraser = null; this.spikes = null; this.beams = null; this.swirl = null; this.stars = []; this.wave = null; this.splats = []; this.bucket = null; this.e.free = false;
    this.e.alpha = this.gone ? 0 : 1; this.e.bucketOff = false; if (!this.rival) this.talk('NO FAIR!! MOOOOM!!', 200); if (match) this.splash(match, this.e.x, -100, 30);
  }

  // ------------------------------------------------------------------ the entrance
  /**
   * THE ENTRANCE (k = 0..1): nothing but white. A pencil line draws the floor, then the endless pattern scribbles
   * itself in, tile by tile; a sketch of a kid draws itself line by line; a paint bucket drops out of the sky onto his
   * head - BONK - and paint gushes out of it as hair; he twirls the brush and points it at you: OOH! A NEW MODEL!
   */
  introPose(match, k, t, n) {
    if (this.rival && t > 220) return this.artoffPose(match, t - 220);
    if (this.rival) { k = Math.min(1, t / 220); n = 220; }
    this.t++;
    const E = this.e, e = (a, b) => Phaser.Math.Clamp((k - a) / (b - a), 0, 1);
    E.x = 30; E.dir = -1; E.hop = 0; E.alpha = 1;
    const world = e(0.08, 0.4);
    if (world < 1) this.revealWorld(world); else if (this.style !== 'sketch' || this.revealK !== 1) { this.setStyle('sketch', true); this.revealK = 1; }
    E.reveal = e(0.4, 0.66); this.introBucket = k < 0.66 ? -1 : e(0.66, 0.74); this.hairK = e(0.74, 0.86);
    E.ba = k < 0.86 ? -0.4 : lerp(-0.4 - Math.PI * 2, -0.25, e(0.86, 0.95)); E.bb = 1.3;
    if (t === Math.round(0.08 * n)) sfx('swing', 0.5, 2);
    if (t % 6 === 0 && k > 0.4 && k < 0.66) sfx('swing', 0.25, 1.8 + Math.random() * 0.4);
    if (t === Math.round(0.74 * n)) { sfx('clang', 1, 0.9); sfx('bighit', 0.6, 1.4); match.shake(5, 8); }
    if (t === Math.round(0.76 * n)) sfx('geyser', 0.8, 1.1);
    if (t === Math.round(0.88 * n)) { sfx('whoosh', 0.8, 1.2); this.talk(SAY.intro, 140); }
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
    this.skyG.clear(); this.skyG.fillStyle(0xffffff, 1); this.skyG.fillRect(-400, -400, 1440, 1200); this.patG.clear();
  }
  /** The entrance's camera: wide on the white void, then in on him as he's drawn, close as the bucket lands. */
  introShot(k) { const c = this.core(); if (this.rival) { const kk = k * (220 + ARTOFF.extra) / 220; if (kk > 1) return { x: c.x - 20, y: c.y + 20, zoom: 1.8 }; k = kk; } return k < 0.4 ? { x: 0, y: -100, zoom: 0.85 } : k < 0.86 ? { x: this.e.x, y: -62, zoom: 2 } : { x: c.x - 24, y: c.y + 26, zoom: 1.8 }; }
  /** The freeze frame: him, brush pointed at you. */
  introAt() { const c = this.core(); return { x: c.x - 30, y: c.y + 30, zoom: 1.6 }; }
  /** After the intro: the world is fully drawn and he's whole. */
  endIntro() { super.endIntro(); if (this.sayG) this.sayBox(null); this.e.reveal = 1; this.introBucket = null; this.hairK = 1; this.setStyle('sketch', true); }

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
      this.stepBlobs(match, out); this.stepDoodles(match, out); this.stepBursts(match, out); this.stepBubbles(match); this.stepStars(match, out); this.stepSplats(match, out);
      if (this.sayCD > 0) this.sayCD--;
      if (this.say && ++this.say.t > this.say.life) this.say = null;
      if (this.boss.dying) { this.e.squash = Math.min(0.5, this.e.squash + 0.01); this.e.alpha = this.gone ? 0 : 1 - this.deathK(); }
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
    this.pen.img.setVisible(!!(B || this.introBucket != null) && this.e.alpha > 0.02);
    if (this.pen.img.visible) this.drawKid(this.pen, this.style);
    this.drawFx(fx);
    if (this.say) this.drawBubble();
    if (this.wipe) this.drawWipe(fx);
    if (B) this.drawBar();
  }
  /**
   * SMUDGE in an art style, as pixel art (`pen` = a PixelPen; everything in world pixels): rainbow paint pouring out
   * from under the bucket's rim and running down his back as hair, his striped sleeves and overalls, sneakers, the
   * bucket jammed over his eyes (its handle under his chin like a chin strap, so only his toothy grin shows - two
   * grins in TWO FACES; his bare head, wild-eyed, when he's thrown it), and the brush taller than him in both hands.
   * Each style adds its own touch (hatching, Ben-Day dots, facets, dabs, splatters); the colours stay bright.
   */
  drawKid(pen, st) {
    const E = this.e, d = E.dir, t = this.t, P = PAL[st] || PAL.sketch, K = KIDPAL[st] || KIDPAL.sketch, ink = P.ink === 0xffffff ? 0x141414 : P.ink;
    const b = this.body(), g = pen, fl = this.boss && this.boss.flash > 0;
    g.begin(Math.round(E.x) - PX.fx, Math.round(E.y) - PX.fy, E.reveal < 1 ? Math.floor(E.reveal * 130) : Infinity);
    this.pen.img.setAlpha(E.alpha);
    const dk = (c, k = 0.25) => mix(c, 0x000000, k), lt = (c, k = 0.3) => mix(c, 0xffffff, k);
    const limb = (p, q, w, c) => { g.lineStyle(w, c); g.lineBetween(p.x, p.y, q.x, q.y); };
    const hx = b.head.x, hy = b.head.y, hk = this.hairK ?? 1;
    const onHead = !E.bucketOff && (this.introBucket == null || this.introBucket >= 1);
    // the paint hair: ribbons of every colour pouring from under the back of the rim, rippling down to his heels
    if (onHead && hk > 0) {
      for (let r = 0; r < 6; r++) {
        const sx = hx - d * (2 + r * 3), sy = hy + 8, len = (40 + r * 5 + Math.sin(t * 0.05 + r) * 3) * hk, c = K.hair[r % K.hair.length], pts = [];
        for (let q = 0; q <= 10; q++) { const s = q / 10; pts.push({ x: sx - d * (s * (10 + r * 3) + Math.sin(t * 0.12 + r * 1.4 + s * 5) * 3 * s), y: sy + s * len }); }
        for (let q = 1; q < pts.length; q++) limb(pts[q - 1], pts[q], Math.max(2, 6 - q * 0.4), c);
        const e2 = pts[pts.length - 1]; g.fillStyle(c); g.fillCircle(e2.x, e2.y + 1, 2.5);
        if ((t + r * 23) % 70 < 30) g.fillRect(e2.x - 1, e2.y + 4 + ((t + r * 23) % 70) * 1.2, 2, 3);   // (a drip falling off the end)
      }
    }
    const front = (b.tip.x - b.sh.x) * d > 0;                                        // (the brush in front of him, or trailing behind)
    const brush = () => {
      const ux = (b.tip.x - b.hand.x) / KID.brush, uy = (b.tip.y - b.hand.y) / KID.brush, px = -uy, py = ux;
      const fer = { x: b.hand.x + ux * (KID.brush - 24), y: b.hand.y + uy * (KID.brush - 24) }, base = { x: fer.x + ux * 6, y: fer.y + uy * 6 };
      limb({ x: b.hand.x - ux * 8, y: b.hand.y - uy * 8 }, fer, 4, K.wood);
      g.lineStyle(1, lt(K.wood, 0.4)); g.lineBetween(b.hand.x - ux * 6 + px, b.hand.y - uy * 6 + py, fer.x + px, fer.y + py);
      limb(fer, base, 6, 0xc8c8d8);
      g.fillStyle(K.paint); g.fillPoints([{ x: base.x + px * 5, y: base.y + py * 5 }, { x: b.tip.x + px * 2, y: b.tip.y + py * 2 }, { x: b.tip.x + ux * 4, y: b.tip.y + uy * 4 }, { x: b.tip.x - px * 2, y: b.tip.y - py * 2 }, { x: base.x - px * 5, y: base.y - py * 5 }]);
      g.fillStyle(K.hair[1 % K.hair.length]); g.fillPoints([{ x: base.x + px * 2, y: base.y + py * 2 }, { x: b.tip.x + ux * 2, y: b.tip.y + uy * 2 }, { x: base.x - px * 1, y: base.y - py * 1 }]);
    };
    const arm = (from, hand, sleeve) => {
      const el = { x: (from.x + hand.x) / 2 - d * 2, y: (from.y + hand.y) / 2 + 4 };
      limb(from, el, 6, sleeve ? K.shirt[0] : dk(K.shirt[0])); limb(el, hand, 5, sleeve ? K.shirt[0] : dk(K.shirt[0]));
      g.lineStyle(2, sleeve ? K.shirt[1] : dk(K.shirt[1])); for (const s of [0.3, 0.7]) { const m = { x: from.x + (el.x - from.x) * s, y: from.y + (el.y - from.y) * s }; g.lineBetween(m.x - 2, m.y, m.x + 2, m.y); const n = { x: el.x + (hand.x - el.x) * s, y: el.y + (hand.y - el.y) * s }; g.lineBetween(n.x - 2, n.y, n.x + 2, n.y); }
      g.fillStyle(sleeve ? K.skin : dk(K.skin, 0.15)); g.fillCircle(hand.x, hand.y, 3.5);
    };
    const shF = { x: b.sh.x + d * 2, y: b.sh.y + 3 }, shB = { x: b.sh.x - d * 4, y: b.sh.y + 3 };
    if (!front) brush();
    arm(shB, b.hand, false);                                                      // (the far arm, on the top of the handle)
    // legs: overall legs with rolled-up cuffs, chunky sneakers
    const step = Math.sin(E.walk) * 6;
    for (const sd of [-1, 1]) {
      const foot = { x: b.ft.x + sd * 6 + sd * step * 0.5, y: b.ft.y - 4 }, knee = { x: (b.hip.x + foot.x) / 2 + d * 2, y: (b.hip.y + foot.y) / 2 };
      const c = sd < 0 ? dk(K.over, 0.15) : K.over;
      limb(b.hip, knee, 8, c); limb(knee, { x: foot.x, y: foot.y - 3 }, 7, c);
      g.fillStyle(lt(K.over, 0.45)); g.fillRect(foot.x - 4, foot.y - 6, 8, 2);
      g.fillStyle(sd < 0 ? dk(K.shoe, 0.15) : K.shoe); g.fillEllipse(foot.x + d * 3, foot.y, 14, 7);
      g.fillStyle(0xffffff); g.fillRect(foot.x + d * 3 - 7, foot.y + 2, 14, 2); g.fillRect(foot.x + d * 7 - 1, foot.y - 2, 3, 2);
    }
    // the body: striped shirt under paint-splattered overalls (bib, straps, gold buttons, a pocket with a pencil)
    const sw = 9, hw = 12;
    g.fillStyle(K.shirt[0]); g.fillPoints([{ x: b.sh.x - sw, y: b.sh.y - 1 }, { x: b.sh.x + sw, y: b.sh.y - 1 }, { x: b.hip.x + hw, y: b.hip.y + 3 }, { x: b.hip.x - hw, y: b.hip.y + 3 }]);
    g.fillStyle(K.shirt[1]); for (let y = b.sh.y + 2; y < b.hip.y - 8; y += 5) g.fillRect(b.sh.x - sw + 1, y, sw * 2 - 2, 2);
    g.fillStyle(K.over); g.fillPoints([{ x: b.sh.x - 6, y: b.sh.y + 8 }, { x: b.sh.x + 6, y: b.sh.y + 8 }, { x: b.hip.x + hw, y: b.hip.y - 4 }, { x: b.hip.x + hw + 1, y: b.hip.y + 4 }, { x: b.hip.x - hw - 1, y: b.hip.y + 4 }, { x: b.hip.x - hw, y: b.hip.y - 4 }]);
    g.lineStyle(2, K.over); g.lineBetween(b.sh.x - 6, b.sh.y + 9, b.sh.x - 7, b.sh.y); g.lineBetween(b.sh.x + 6, b.sh.y + 9, b.sh.x + 7, b.sh.y);
    g.fillStyle(0xffd400); g.fillRect(b.sh.x - 6, b.sh.y + 8, 2, 2); g.fillRect(b.sh.x + 4, b.sh.y + 8, 2, 2);
    g.fillStyle(dk(K.over, 0.2)); g.fillRect(b.hip.x + d * 2 - 4, b.hip.y - 12, 8, 6); g.fillStyle(K.band); g.fillRect(b.hip.x + d * 2 - 2, b.hip.y - 16, 2, 5);
    const spl = st === 'sketch' ? [0xff2a4a, 0x2ad060, 0xffd400] : K.hair;
    for (let i = 0; i < 5; i++) { g.fillStyle(spl[i % spl.length]); g.fillCircle(b.hip.x - 8 + ((i * 7) % 16), b.sh.y + 12 + ((i * 5) % 14), 1.5 + (i % 2)); }
    if (st === 'sketch') { g.lineStyle(1, dk(K.over, 0.35)); for (let i = 0; i < 5; i++) g.lineBetween(b.hip.x - d * 10 + d * i * 2, b.hip.y, b.hip.x - d * 4 + d * i * 2, b.hip.y - 8); }
    if (st === 'pop') { g.fillStyle(dk(K.over, 0.3)); for (let y = b.sh.y + 10; y < b.hip.y + 2; y += 3) for (let x = b.hip.x - 10 + (y % 2); x < b.hip.x + 10; x += 3) g.fillRect(x, y, 1, 1); }
    if (st === 'cubist') { g.fillStyle(lt(K.over, 0.25)); g.fillTriangle(b.sh.x, b.sh.y + 8, b.hip.x + d * hw, b.hip.y + 3, b.hip.x, b.hip.y + 3); g.fillStyle(dk(K.shirt[0], 0.3)); g.fillTriangle(b.sh.x - d * sw, b.sh.y, b.sh.x, b.sh.y + 6, b.sh.x - d * 4, b.sh.y + 14); }
    if (st === 'starry') for (let i = 0; i < 7; i++) { g.fillStyle(K.hair[i % K.hair.length]); g.fillRect(b.hip.x - 10 + ((i * 9) % 20), b.sh.y + 10 + ((i * 7) % 16), 2, 1); }
    if (st === 'splatter') for (let i = 0; i < 8; i++) { g.fillStyle(K.hair[i % K.hair.length]); g.fillCircle(b.hip.x - 12 + ((i * 11) % 24), b.sh.y + 2 + ((i * 13) % 26), 1 + (i % 3)); }
    // the head
    const face = (ox) => {                                                         // (the bit under the rim: chin and that grin)
      const cx = Math.round(hx + ox); g.fillStyle(K.skin); g.fillEllipse(cx, hy + 15, 24, 18);
      g.fillStyle(0x5a1020); g.fillPoints([{ x: cx - 11, y: hy + 11 }, { x: cx + 11, y: hy + 11 }, { x: cx + 9, y: hy + 17 }, { x: cx + 5, y: hy + 20 }, { x: cx - 5, y: hy + 20 }, { x: cx - 9, y: hy + 17 }]);
      g.fillStyle(0xffffff); for (let x = cx - 9; x < cx + 9; x += 3) g.fillRect(x, hy + 12, 2, 3);   // a full, even row of top teeth
      for (let x = cx - 6; x < cx + 6; x += 3) g.fillRect(x, hy + 17, 2, 2);                            // and the bottom row
      g.fillStyle(dk(K.skin, 0.2)); g.fillRect(cx - 13, hy + 10, 1, 3); g.fillRect(cx + 12, hy + 10, 1, 3);   // (dimples)
    };
    if (E.bucketOff || (this.introBucket != null && this.introBucket < 1)) {        // bare head: paint-stiff spiky hair, its fringe hiding his eyes
      g.fillStyle(K.skin); g.fillCircle(hx, hy + 4, 11);
      for (let i = 0; i < 7; i++) { const a = -Math.PI + 0.2 + i * 0.45; g.fillStyle(K.hair[i % K.hair.length]); g.fillTriangle(hx + Math.cos(a) * 7, hy + 2 + Math.sin(a) * 7, hx + Math.cos(a) * 17, hy + Math.sin(a) * 15, hx + Math.cos(a + 0.35) * 9, hy + 2 + Math.sin(a + 0.35) * 9); }
      for (let i = 0; i < 9; i++) { const x = hx - 12 + i * 3; g.fillStyle(K.hair[i % K.hair.length]); g.fillTriangle(x - 2, hy - 6, x + 4, hy - 6, x + 1, hy + 9 + (i % 2) * 2); }   // a thick fringe of paint-stiff hair over his eyes
      face(d * 2);
    } else face(d * 2);
    if (E.faces === 2 && !E.bucketOff) { face(-d * 13); }                          // TWO FACES: a second grin sliding out the side
    if (!E.bucketOff && (this.introBucket == null || this.introBucket >= 0)) {     // the bucket, upside down over his eyes
      const by = this.introBucket != null && this.introBucket < 1 ? lerp(hy - 300, hy, this.introBucket ** 2) : hy;
      const top = 12, bot = 15, y0 = by - 18, y1 = by + 9;
      g.fillStyle(K.bucket); g.fillPoints([{ x: hx - top, y: y0 }, { x: hx + top, y: y0 }, { x: hx + bot, y: y1 }, { x: hx - bot, y: y1 }]);
      g.fillStyle(dk(K.bucket, 0.22)); g.fillPoints([{ x: hx + d * 5, y: y0 }, { x: hx + d * top, y: y0 }, { x: hx + d * bot, y: y1 }, { x: hx + d * 6, y: y1 }]);   // (the far side in shade)
      g.fillStyle(lt(K.bucket, 0.45)); g.fillRect(hx - d * 8 - 1, y0 + 2, 2, 20);                     // (a shine)
      g.fillStyle(dk(K.bucket, 0.35)); g.fillRect(hx - top, y0, top * 2, 2); g.fillRect(hx - bot - 1, y1 - 3, bot * 2 + 2, 3);   // (the base and the rolled rim)
      g.fillStyle(K.band); g.fillPoints([{ x: hx - 13, y: by - 9 }, { x: hx + 13, y: by - 9 }, { x: hx + 14, y: by - 2 }, { x: hx - 14, y: by - 2 }]);
      g.fillStyle(K.hair[0]); g.fillCircle(hx - d * 3, by - 6, 2); g.fillStyle(K.hair[2 % K.hair.length]); g.fillCircle(hx + d * 2, by - 5, 1.5); g.fillStyle(K.hair[4 % K.hair.length]); g.fillCircle(hx + d * 6, by - 6, 1.5);   // (its label: a palette)
      if (E.faces === 2) { g.lineStyle(1, ink); g.lineBetween(hx - 3, y0, hx + 2, by - 4); g.lineBetween(hx + 2, by - 4, hx - 1, y1); }   // (cracked down the middle)
      if (st === 'cubist') { g.fillStyle(lt(K.bucket, 0.3)); g.fillTriangle(hx - top, y0, hx - 2, by - 9, hx - bot, y1); }
      if (st === 'pop') { g.fillStyle(dk(K.bucket, 0.3)); for (let y = y0 + 3; y < by - 10; y += 3) for (let x = hx + 2 + (y % 2); x < hx + 11; x += 3) g.fillRect(x, y, 1, 1); }
      if (st === 'starry') for (let i = 0; i < 5; i++) { g.fillStyle(K.hair[i % K.hair.length]); g.fillRect(hx - 9 + i * 4, y0 + 3 + (i % 2) * 3, 2, 1); }
      if (st === 'sketch') { g.lineStyle(1, dk(K.bucket, 0.4)); for (let i = 0; i < 4; i++) g.lineBetween(hx + d * (6 + i * 2), y0 + 2, hx + d * (8 + i * 2), y1 - 4); }
      // paint pouring out under the rim all the way round: a thick wet lip with drips (short ones at the face, so the grin shows)
      if (onHead && hk > 0) {
        for (let i = 0; i < 9; i++) { const x = hx - bot + 1 + i * (bot * 2 - 2) / 8, c = K.hair[i % K.hair.length], atFace = Math.abs(x - hx - d * 2) < 12; if (atFace) { g.fillStyle(c); g.fillRect(x - 2, y1 - 1, 4, 2); continue; } const l = (3 + ((i * 5) % 6)) * hk; g.fillStyle(c); g.fillRect(x - 2, y1 - 1, 4, 2 + l); g.fillCircle(x, y1 + 1 + l, 2); }
      }
      // the handle, down under his chin as a chin strap (lugs at the sides)
      const sl = { x: hx - 15, y: by + 1 }, sr = { x: hx + 15, y: by + 1 };
      const strap = [sl, { x: hx - 14, y: by + 13 }, { x: hx - 8, y: by + 22 }, { x: hx + d * 2, y: by + 25 }, { x: hx + 9, y: by + 22 }, { x: hx + 14, y: by + 13 }, sr];
      g.lineStyle(3, ink); g.strokePoints(strap, false); g.lineStyle(1, 0xc8c8d8); g.strokePoints(strap, false);
      g.fillStyle(0x8a8a9a); g.fillCircle(sl.x, sl.y, 2); g.fillCircle(sr.x, sr.y, 2);
    }
    if (front) brush();
    arm(shF, b.hand2, true);                                                       // (the near arm, lower on the handle)
    if (st === 'splatter') for (let i = 0; i < 4; i++) { g.fillStyle(K.hair[(i + (t >> 4)) % K.hair.length]); g.fillEllipse(b.hip.x - 12 + i * 8, b.hip.y + 6 + ((t + i * 9) % 30) * 0.3, 2, 4); }
    g.finish(ink, fl);
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
    if (this.bucket) { const B = this.bucket, c = Math.cos(B.a), s = Math.sin(B.a), q = (x, y) => ({ x: B.x + x * c - y * s, y: B.y + x * s + y * c }); const K = KIDPAL[this.style] || KIDPAL.splatter; g.fillStyle(ink, 1); g.fillPoints([q(-15, -18), q(15, -18), q(18, 10), q(-18, 10)], true); g.fillStyle(K.bucket, 1); g.fillPoints([q(-13, -16), q(13, -16), q(16, 8), q(-16, 8)], true); g.fillStyle(K.band, 1); g.fillPoints([q(-14, -6), q(14, -6), q(15, 0), q(-15, 0)], true); g.fillStyle(K.hair[(this.t >> 3) % K.hair.length], 1); g.fillEllipse(B.x + s * -9, B.y + c * 9, 24, 8); }
    if (this.drip) { const D = this.drip; if (D.y == null) { g.fillStyle(0x2a8aff, 0.3 + 0.3 * D.k); g.fillEllipse(D.x, -2, 30, 6); g.fillCircle(D.x, -400 + D.k * 20, 6 + D.k * 10); } else { g.fillStyle(0x2a8aff, 1); g.fillCircle(D.x, D.y, 13); g.fillTriangle(D.x - 12, D.y - 4, D.x + 12, D.y - 4, D.x, D.y - 30); } }
    if (this.spill) { const S = this.spill; g.fillStyle(0x2a8aff, 0.2 + 0.3 * S.k); g.fillRect(S.x - 110 * S.k, -4, 220 * S.k, 4); }
    if (this.gloatT) {                                                                    // the crayon drawing of you he waves when he wins
      const b = this.body(), x = b.hand2.x, y = b.hand2.y - 60; g.fillStyle(0xffffff, 1); g.fillRect(x - 30, y - 34, 60, 50); g.lineStyle(2, 0x000000, 1); g.strokeRect(x - 30, y - 34, 60, 50);
      g.lineStyle(2, 0xff2a2a, 1); g.strokeCircle(x, y - 18, 8); g.lineBetween(x, y - 10, x, y + 4); g.lineBetween(x, y + 4, x - 7, y + 12); g.lineBetween(x, y + 4, x + 7, y + 12); g.lineStyle(2, 0x2a8aff, 1); g.lineBetween(x - 10, y - 4, x + 10, y - 4); g.fillStyle(0x141414, 1); g.fillRect(x - 4, y - 21, 2, 2); g.fillRect(x + 2, y - 21, 2, 2); g.lineStyle(0);
    }
  }
  /** His speech bubble: a rounded comic bubble with a tail, over his head. */
  drawBubble() {
    const S = this.say, b = this.body(), g = this.bubG, pop = Math.min(1, S.t / 6), x = Phaser.Math.Clamp(b.head.x - this.e.dir * 24, -230, 230), y = b.head.y - 62;
    this.bubT.setText(S.text).setPosition(x, y).setScale(pop).setVisible(true);
    const w = Math.max(60, this.bubT.width + 18) * pop, h = (this.bubT.height + 14) * pop;
    g.fillStyle(0x000000, 1); g.fillRoundedRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4, 10); g.fillStyle(0xffffff, 1); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 9);
    g.fillStyle(0xffffff, 1); g.fillTriangle(x - 6, y + h / 2 - 2, x + 8, y + h / 2 - 2, b.head.x, b.head.y - 24); g.lineStyle(2, 0x000000, 1); g.lineBetween(x - 6, y + h / 2, b.head.x, b.head.y - 24); g.lineBetween(x + 8, y + h / 2, b.head.x, b.head.y - 24); g.lineStyle(0);
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

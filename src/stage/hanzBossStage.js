// HIS DESK (`hanz-desk`): the secret boss fight against HANZ & $@L, THE TRUE SHOPKEEPER. Poke him enough in the LOST
// shop and he snaps - FINE. LET'S SETTLE THIS. - claps you into his polygon world and you fight him there, shrunk down
// to the size of the things on his counter: his counter is the floor, the old till and a floating slab are the ledges,
// and HE IS ON IT WITH YOU - floating, a head taller than anyone (the same PS1 renders as in the shop,
// src/scenes/lostFrames.js), his body trailing off into smoke below the waist. He drifts, dives, dashes and blinks
// round the desk, and HOW HE FEELS decides how he fights (`MOODS`): SMUG $@L shows off from a distance, FURIOUS $@L
// hunts you down and hits hard, GLOOMY HANZ hangs back and makes the room do the work, and when they're LAUGHING
// it's chaos. His mood shifts every few attacks with how the fight is going (`pickMood`).
//
// FOUR ACTS, a world each (`setWorld`):
//   I   THE POLYGON ROOM (100-66%): the low-poly world from his clap (tools/sprites/hanz_poly.py). DESK SLAM, POLYGON
//       STORM (a ring of shards fired one by one), THE WHALE (it dives across the desk), CLEARANCE SALE (coins out of
//       the till), THE WATCHER (the desk gem's prism laser), STAIRWAY DOWN (cubes falling on marks).
//   II  THE DRAWN ROOM (66-33%, after the cutscene in hanzCinema.js): he snaps it hand-drawn. INK SLASH, THE EYE OPENS,
//       TEATIME (geysers of tea), THE FISH, and the slam and storm in ink.
//   III NOTHING UNDER THE MASK (33-0%): he takes his face off; the void. GLITCH TEAR (bands of broken picture),
//       THIRTEEN O'CLOCK (thirteen rings off his clock-heart, each with a gap), MOOD SWING (his halves erupt in turn:
//       $@L's fire, HANZ's frost), THE SNAP (fire rains on marks), and the rest, quicker.
//   IV  THE TRUE FACE (22-0%, hanzTrue.js): THE STARFALL breaks his mask - under it, the star that split him in two.
//       The night sky; he's WHOLE, takes less from every hit, and fights with SUPERNOVA, CONSTELLATION, TWO-FACED,
//       EVENT HORIZON and THE COMET. Below `TRUE.low` LAST CALL.
// He FACES THE SIDE he fights toward (hanz_fight.py's turned renders, legs and all: `look`, `face`); cutscenes and
// anything with no turned render show him facing you, as in LOST, with his rendered legs under him.
// Hurt: his head x`HURT.head` (more once there's no face), his body x`HURT.body`; nothing while a cutscene plays.
// The cutscenes, the intro, his death and the dialogue live in hanzCinema.js (methods copied onto this class).
import { BossArena } from './bossBase.js';
import { sfx } from '../audio/sfx.js';
import { FONT, VIEW_W, VIEW_H } from '../config.js';
import { LOST_FRAMES } from '../scenes/lostFrames.js';
import { LOST_DRAWN } from '../scenes/lostDrawn.js';
import { LOST_POLY } from '../scenes/lostPoly.js';
import { queueDrawn, addThingFrames, boilAt, stepThings } from '../scenes/lostDrawnRoom.js';
import { HanzCinema } from './hanzCinema.js';
import { HanzTrue, TRUE } from './hanzTrue.js';

const DIR = 'assets/shop/lost/';
// the LOST room's picture is laid over the world this much bigger, its counter's front edge (y, on the 640x360 room) on the floor
export const K = 1.16, FLOOR_Y = 303.6;
/** A point on the LOST room's 640x360 picture -> the world. */
export const W2 = (sx, sy) => ({ x: (sx - 320) * K, y: (sy - FLOOR_Y) * K });
const TICKS = Math.round(60 / LOST_FRAMES.fps);              // game frames per frame of his animations
// how hard everything he does hits: x damage, x base knockback, x growth
const HIT = { dmg: 1.15, base: 1.1, growth: 1.15 };
// where he can be hurt: head / body multipliers (the head once his face is gone)
const HURT = { head: 1.25, void: 1.45, body: 0.75 };
// HIM ON THE STAGE: how big he's drawn (x his LOST picture), the line across his waist on that picture (his frames end
// about there - below it he trails off into smoke), how high his waist floats, how far he bobs, how fast he drifts
// (px a frame) and how far toward the desk's ends he goes
const BODY = { sc: 0.38, waist: 262, lift: 16, bob: 5, drift: 2.4, edge: 215 };
// his legs (hanz_legs.py: they hang below his LOST frames, which stop at his counter) - how far below his waist his
// shoes reach on the LOST picture, then in the world; BODY.hover = his waist's height with his shoes `lift` px off the desk
const LEGS = LOST_FRAMES.legs, WHOLE = LOST_FRAMES.fight && LOST_FRAMES.fight.f && LOST_FRAMES.fight.f.idle;   // (his whole-body idle: hanz_fight.py)
const DROP = (WHOLE || LEGS) ? Math.max(...(WHOLE || LEGS).frames.map((f) => f.y + f.h * (LOST_FRAMES.scale || 2))) - BODY.waist : 0;
const FEET = DROP * BODY.sc;
BODY.hover = -(FEET + BODY.lift);
// his hurt and hit boxes were set for him drawn at 0.46: this keeps them his size
const Z = BODY.sc / 0.46;
// HIS MOODS: who's in charge (s = $@L, h = HANZ, b = both), the banner, the colour of his aura, the animation he rests
// in, the one he snaps into it with, how he moves (chase / keep his distance / flee / blink about), how quick his
// wind-ups are, and what he says when it takes him
export const MOODS = {
  smug: { who: 's', label: '$@L IS SMUG', color: 0xffd447, css: '#ffd447', rest: 'sal_talk', enter: 'pitch', move: 'keep', speed: 1.0,
    say: ['TOO EASY. LIKE TAKING CANDY FROM A CUSTOMER.', 'WATCH AND LEARN, SHOPPER.', 'EVERYTHING HAS A PRICE. YOURS IS LOW.'] },
  furious: { who: 's', label: '$@L IS FURIOUS', color: 0xff2a3a, css: '#ff3a46', rest: 'argue', enter: 'slam', move: 'chase', speed: 1.25,
    say: ['STOP. HITTING. ME.', 'THAT\'S IT. NO MORE MR NICE HALF.', 'YOU BREAK IT, YOU BUY IT!'] },
  gloomy: { who: 'h', label: 'HANZ IS GLOOMY', color: 0x7a9ad8, css: '#9ab4e8', rest: 'hanz_talk', enter: 'twitch', move: 'flee', speed: 0.85,
    say: ['...WHY DO WE EVEN TRY.', 'LEAVE US ALONE. PLEASE.', 'IT\'S ALWAYS THIRTEEN O\'CLOCK IN HERE.'] },
  manic: { who: 'b', label: 'THEY\'RE LAUGHING', color: 0xa04ae6, css: '#c07aff', rest: 'idle', enter: 'laugh', move: 'blink', speed: 1.15,
    say: ['HAHAHA! EVERYTHING MUST GO!', 'HEHEHE - HAHAHAHA!', 'CLOSING TIME! CLOSING TIME!'] },
  whole: { who: 'b', label: 'THEY ARE WHOLE', color: 0xc07aff, css: '#d8a8ff', rest: 'idle', enter: 'laugh', move: 'keep', speed: 1.3,
    say: ['ONE STAR. ONE PRICE.', 'EVERYTHING MUST GO.'] },
};
// what each mood throws at you, by world
const MOVES = {
  smug: { poly: ['storm', 'coins', 'gem'], drawn: ['storm', 'ink', 'coins'], void: ['storm', 'firerain', 'tear'] },
  furious: { poly: ['slam', 'dash', 'cubes'], drawn: ['slam', 'dash', 'ink'], void: ['slam', 'dash', 'firerain', 'swing'] },
  gloomy: { poly: ['cubes', 'gem', 'storm'], drawn: ['eye', 'tea', 'ink'], void: ['thirteen', 'eye', 'tear'] },
  manic: { poly: ['whale', 'storm', 'coins'], drawn: ['fish', 'storm', 'tea'], void: ['tear', 'swing', 'storm', 'fish'] },
  // THE TRUE FACE (hanzTrue.js): his five moves, and nothing else
  whole: { stars: ['supernova', 'constellation', 'twoface', 'blackhole', 'comet'] },
};
// what tips his mood: attacks between rolls, damage taken lately per point toward FURIOUS, his hits on you toward SMUG,
// low health toward GLOOMY / LAUGHING, how much he likes staying as he is
const MOOD = { every: [2, 3], hurt: 22, hit: 1.6, low: 1.4, keep: 0.35 };
// DIVE SLAM: how high he rises, frames rising / hanging over you, plunge speed, where his waist lands, frames slumped on the desk
const DIVE = { top: -255, rise: 34, hang: 16, v: 15, land: -FEET + 2, slump: 34, body: [15, [80, 6.6, 1.0]] };
// THE CHARGE: frames winding back, speed, the hit; how many runs (furious in the void: there and back)
const DASH = { wind: 34, v: 12.5, hit: [14, [35, 7, 1.0]] };
// the acts: where II and III start (fractions of his health), LAST CALL, and how short his pauses get then (frames)
export const ACTS = { drawn: 0.72, void: 0.46 };
// DESK SLAM: the frame of the slam animation his fists land on, the fists' hit, the shockwaves (speed, hit)
const SLAM = { at: 9, fist: [14, [80, 6.2, 1.0]], waveV: 5.6, wave: [9, [70, 5, 0.7]] };
// POLYGON STORM: shards per act, how long they orbit, the gap between launches, the aim (frames), speed, hit
const STORM = { n: { poly: 12, drawn: 16, void: 20 }, orbit: 50, every: 5, aim: 14, v: 7.5, r: 95, hit: [6, [40, 4, 0.5]] };
// THE WHALE / THE FISH: warning frames, speed, size of its hitbox, hit
const WHALE = { warn: 60, v: 10, w: 210, h: 78, hit: [16, [35, 7.2, 1.0]] };
// CLEARANCE SALE: volleys, coins a volley, gap, the hit
const COINS = { volleys: 3, n: 7, every: 30, r: 7, hit: [5, [70, 3.5, 0.4]] };
// THE WATCHER: shots, lock-on frames, beam length, width, hit
const GEM = { shots: [2, 3], lock: 54, fire: 26, w: 24, hit: [13, [50, 6.4, 0.9]] };
// STAIRWAY DOWN: cubes, warning, fall speed, hit, shard hit
const CUBES = { n: 5, warn: 54, v: 16, hit: [11, [80, 6, 0.8]], shard: [3, [60, 3, 0.2]] };
// INK SLASH: slashes (drawn / void), gap, warning, live frames, width, hit
const INK = { n: [4, 6], every: 34, warn: 30, live: 12, w: 20, hit: [11, [60, 5.5, 0.8]] };
// THE EYE OPENS: shots, warning, live frames, width, hit
const EYE = { shots: 3, warn: 42, live: 24, w: 46, hit: [12, [90, 6, 0.8]] };
// TEATIME: geysers, bubbling frames, gap, how tall, width, live frames, hit
const TEA = { n: 5, warn: 50, every: 12, h: 230, w: 34, live: 30, hit: [10, [90, 6.5, 0.7]] };
// GLITCH TEAR: bands, gap, warning, live, height, hit; blocks flung off him
const TEAR = { n: 4, every: 22, warn: 40, live: 14, h: 30, hit: [12, [45, 6, 0.8]], blocks: 10, block: [5, [50, 3.5, 0.4]] };
// THIRTEEN O'CLOCK: when the first strike comes, the gap between strikes, ring speed, the gap in each ring (radians), hit
const CLOCK = { start: 100, every: 26, v: 3.2, gap: 0.95, hit: [7, [60, 4.5, 0.5]] };
// MOOD SWING: eruptions, warning, live, hit
const SWING = { n: 4, warn: 50, live: 30, hit: [13, [70, 6.5, 0.9]] };
// THE SNAP (fire rain): fireballs, gap, warning, hit
const FIRE = { n: 9, every: 9, warn: 36, v: 12, hit: [10, [80, 6, 0.8]] };
// colours of each world's effects
export const COL = {
  poly: [0xff7ab8, 0x2fd6c6, 0xffd447, 0x7adcff, 0xa04ae6, 0xfff3dc],
  drawn: [0x261a18, 0x3a2420, 0xc8486a, 0x3a6ab0, 0xe8b860, 0xf1e8d4],
  void: [0xff2a3a, 0xd2d0cc, 0x7a0a12, 0xffffff, 0x2a2a34, 0x8a2aff],
  stars: [0xc07aff, 0xfff4ff, 0x8a5aff, 0xffb8f0, 0x2a1050, 0xff7ab8],
};
const lerp = (a, b, k) => a + (b - a) * k;

// him whole, turned to the side (r / l) or facing you (f) - tools/sprites/hanz_fight.py
const FIGHT = LOST_FRAMES.fight || {};
// the LOST animations the fight loads as well, facing you (cutscenes, and the ones with no turned render); VS only idles
const FRONT_ANIMS = ['idle', 'slam', 'clap', 'pitch', 'snap', 'laugh', 'unmask', 'twitch', 'sal_talk', 'sob', 'glitch', 'heart', 'switch', 'shrug', 'sold'];
// how far a fighter has to be past him before he turns round (px)
const TURN = 14;

/** Queues everything the fight shows (MatchScene.preload, for this boss or its arena): his animations (only the idle
 *  in VS - `boss` false), both other worlds, the PS1 counter and desk things, his pupils. */
export function queueHanz(scene, boss = true) {
  const L = (key, file) => { if (!scene.textures.exists(key)) scene.load.image(key, DIR + file); };
  for (const n of ['room_dark', 'counter', 'pupils', 'poly_room', 'poly_desk', 'poly_things']) L('lost_' + n, n + '.png');
  for (const n of Object.keys(LOST_FRAMES.props || {})) L('lost_prop_' + n, 'prop_' + n + '.png');
  for (const a of boss ? FRONT_ANIMS : ['idle']) {                                   // facing you: whole (legs and all) if rendered, else LOST's
    const f = FIGHT.f && FIGHT.f[a];
    if (f) f.sheets.forEach((s, k) => L(`lost_f_${a}_${k}`, s)); else LOST_FRAMES.anims[a].sheets.forEach((s, k) => L(`lost_hanz_${a}_${k}`, s));
  }
  if (boss) {
    for (const [v, set] of Object.entries(FIGHT)) if (v !== 'f') for (const [a, spec] of Object.entries(set)) spec.sheets.forEach((f, k) => L(`lost_${v}_${a}_${k}`, f));
    if (FIGHT.f && FIGHT.f.raise) FIGHT.f.raise.sheets.forEach((f, k) => L(`lost_f_raise_${k}`, f));
    L('lost_mask_halves', 'mask_halves.png');
  }
  if (LEGS && !WHOLE) LEGS.sheets.forEach((f, k) => L(`lost_legs_${k}`, f));      // (the old legs layer, only without whole-body renders)
  queueDrawn(scene, true);
}

/** Cuts the loaded sheets into frames (once): his animations, the pupils, the desk things, both worlds' moving things. */
function cutFrames(textures) {
  for (const [a, spec] of Object.entries(LOST_FRAMES.anims)) if (textures.exists(`lost_hanz_${a}_0`)) spec.frames.forEach((f, i) => { const tex = textures.get(`lost_hanz_${a}_${f.k}`); if (!tex.has(String(i))) tex.add(String(i), 0, f.sx, f.sy, f.w, f.h); });
  for (const [v, set] of Object.entries(FIGHT)) for (const [a, spec] of Object.entries(set)) if (textures.exists(`lost_${v}_${a}_0`)) spec.frames.forEach((f, i) => { const tex = textures.get(`lost_${v}_${a}_${f.k}`); if (!tex.has(String(i))) tex.add(String(i), 0, f.sx, f.sy, f.w, f.h); });
  if (textures.exists('lost_mask_halves')) { const mt = textures.get('lost_mask_halves'); if (!mt.has('0')) { mt.add('0', 0, 0, 0, 64, 64); mt.add('1', 0, 64, 0, 64, 64); } }
  if (LEGS && textures.exists('lost_legs_0')) LEGS.frames.forEach((f, i) => { const tex = textures.get(`lost_legs_${f.k}`); if (!tex.has(String(i))) tex.add(String(i), 0, f.sx, f.sy, f.w, f.h); });
  const pt = textures.get('lost_pupils');
  if (!pt.has('sal')) for (const [n, m] of Object.entries(LOST_FRAMES.pupils)) pt.add(n, 0, m.x, 0, m.w, m.h);
  for (const [n, p] of Object.entries(LOST_FRAMES.props || {})) { const tex = textures.get('lost_prop_' + n), cols = p.cols || p.n; if (!tex.has('0')) for (let i = 0; i < p.n; i++) tex.add(String(i), 0, (i % cols) * p.w, Math.floor(i / cols) * p.h, p.w, p.h); }
  addThingFrames(textures);
  const tex = textures.get('lost_poly_things');
  for (const [n, t] of Object.entries(LOST_POLY.things)) for (let i = 0; i < t.n; i++) if (!tex.has(`${n}_${i}`)) tex.add(`${n}_${i}`, 0, i * t.w, t.sy, t.w, t.h);
}

/** HIS DESK: the arena, him, his three worlds and every attack (the cinema is in hanzCinema.js). */
export class HanzBossStage extends BossArena {
  constructor(scene) {
    super();
    this.scene = scene;
    this.platforms = [
      { x1: -272, x2: 272, y: 0, solid: true, bottom: 64 },                // his counter top
      { x1: -246, x2: -166, y: -121, solid: false },                        // a floating slab (polygon / plank / void shard)
      { x1: 166, x2: 246, y: -121, solid: false },                          // the old till's top
    ];
    this.spawns = [{ x: -150, y: 0 }, { x: 150, y: 0 }, { x: -60, y: 0 }, { x: 60, y: 0 }];
    this.hazardsOn = true;
    this.music = 'bgm_boss_hanz';
    this.rageAt = ACTS.drawn; this.bodyW = 230; this.bodyH = 260; this.sparkColor = 0xff7ab8;
    this.t = 0; this.world = 'poly'; this.an = { name: 'idle', f: 0, tick: 0, hold: false };
    this.waves = []; this.shots = []; this.beams = []; this.cols = []; this.bands = []; this.rings = []; this.halves = []; this.marks = []; this.sparks = [];
    this.flashK = 0; this.flashC = 0xffffff; this.voidFace = false; this.clockK = 0;
    this.hx = 0; this.hy = BODY.hover; this.pin = false; this.blinkX = null;
    this.fstars = []; this.halvesM = [{}, {}]; this.halfK = 0; this.face = 'r'; this.front = false;
    this.mood = 'smug'; this.moodN = 0; this.moodAt = MOOD.every[0]; this.hurtLately = 0; this.hitsLately = 0; this.prevPct = new Map(); this.trail = [];
  }

  // ------------------------------------------------------------------ building
  /** Builds the three worlds (backgrounds on the background camera, desks in the world), him and his pupils, the slab. */
  draw(world, bg) {
    const s = this.scene;
    cutFrames(s.textures);
    const B = (key, frame) => { const im = s.add.image(0, 0, key, frame).setOrigin(0).setScrollFactor(0); bg.push(im); return im; };
    const thing = (key, frame, t) => { const im = s.add.image(t.x + t.w / 2, t.y + t.h / 2, key, frame).setScrollFactor(0); bg.push(im); return im; };
    this.bgSets = {
      poly: [B('lost_poly_room'), ...['moon', 'torus', 'whale'].map((n) => thing('lost_poly_things', n + '_0', LOST_POLY.things[n]))],
      drawn: [B('lost_drawn_wash'), this.inkBg = B('lost_drawn_ink_0')],
      void: [B('lost_room_dark')],
    };
    this.polyThings = { moon: this.bgSets.poly[1], torus: this.bgSets.poly[2], whale: this.bgSets.poly[3] };
    this.drawnThings = Object.entries(LOST_DRAWN.things).map(([n, t]) => ({ n, t, s: thing('lost_drawn_things', n + '_0', t) }));
    this.bgSets.drawn.push(...this.drawnThings.map((d) => d.s));
    this.voidG = s.add.graphics().setScrollFactor(0); bg.push(this.voidG); this.bgSets.void.push(this.voidG);
    this.starsG = s.add.graphics().setScrollFactor(0); bg.push(this.starsG); this.bgSets.stars = [this.starsG];      // (THE TRUE FACE's night sky)
    this.skyG = s.add.graphics().setScrollFactor(0); bg.push(this.skyG);                 // (screen-wide washes and flashes behind him)
    // the world: the desks (his counter is the floor), then him floating on it - his aura and tail behind him, effects
    // behind him (the clock), afterimages, two ghost copies for his glitches, him, his pupils / the void face
    const S = (LOST_FRAMES.scale || 2) * K, HS = (LOST_FRAMES.scale || 2) * BODY.sc;
    const o = W2(0, 0), c = W2(...LOST_FRAMES.counter);
    this.deskSets = {
      poly: [s.add.image(o.x, o.y, 'lost_poly_desk').setOrigin(0).setScale(K)],
      drawn: [s.add.image(o.x, o.y, 'lost_drawn_desk').setOrigin(0).setScale(K), this.inkDesk = s.add.image(o.x, o.y, 'lost_drawn_desk_ink_0').setOrigin(0).setScale(K)],
      void: [s.add.image(c.x, c.y, 'lost_counter').setOrigin(0).setScale(S),
        ...Object.entries(LOST_FRAMES.props || {}).map(([n, p]) => { const q = W2(p.x, p.y), im = s.add.image(q.x, q.y, 'lost_prop_' + n, '0').setOrigin(0).setScale(S); im.prop = p; return im; })],
    };
    for (const L of Object.values(this.deskSets)) world.push(...L);
    this.backG = s.add.graphics(); world.push(this.backG);
    this.tailG = s.add.graphics(); world.push(this.tailG);
    const K0 = s.textures.exists('lost_f_idle_0') ? 'lost_f_idle_0' : 'lost_hanz_idle_0';                 // (any frame to start from)
    this.after = [0, 1, 2].map(() => { const g = s.add.image(0, 0, K0, '0').setOrigin(0).setScale(HS).setVisible(false).setBlendMode(Phaser.BlendModes.ADD); world.push(g); return g; });
    this.ghosts = [0, 1].map(() => { const g = s.add.image(0, 0, K0, '0').setOrigin(0).setScale(HS).setVisible(false).setBlendMode(Phaser.BlendModes.ADD); world.push(g); return g; });
    this.legs = LEGS && s.textures.exists('lost_legs_0') ? s.add.image(0, 0, 'lost_legs_0', '0').setOrigin(0).setScale(HS) : null; if (this.legs) world.push(this.legs);
    this.him = s.add.image(0, 0, K0, '0').setOrigin(0).setScale(HS); world.push(this.him);
    this.pupils = ['sal', 'hanz'].map((n) => { const p = s.add.image(0, 0, 'lost_pupils', n); world.push(p); return { n, p }; });
    this.faceG = s.add.graphics(); world.push(this.faceG);
    this.maskIm = [0, 1].map((i) => { const im = s.add.image(0, 0, s.textures.exists('lost_mask_halves') ? 'lost_mask_halves' : 'lost_pupils', s.textures.exists('lost_mask_halves') ? String(i) : undefined).setVisible(false); world.push(im); return im; });
    this.slabG = s.add.graphics(); world.push(this.slabG);
    this.midG = s.add.graphics(); world.push(this.midG);                                // effects on the desk, behind the fighters
    this.setWorld('poly');
    this.renderHim();
  }

  /** The effects in front of the fighters and the creatures that cross the desk (made after the fighters). */
  makeTop(match) {
    if (this.topG) return;
    const s = match;
    this.topG = s.add.graphics(); this.glowG = s.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.beast = s.add.image(0, 0, 'lost_poly_things', 'whale_0').setVisible(false);
    this.gem = s.add.image(0, 0, 'lost_poly_things', 'gem_0').setVisible(false);
    this.eye = s.add.image(0, 0, 'lost_drawn_things', 'eye_0').setVisible(false);
    s.addWorld(this.topG, this.glowG, this.beast, this.gem, this.eye);
  }

  /** The boss's own state when the fight starts (bossBase.startBoss). */
  /** His fight starts: the top layers, and his MOOD under the health bar. */
  makeBoss(match) {
    this.makeTop(match); this.match = match;
    const M = MOODS[this.mood];
    this.moodT = match.add.text(VIEW_W / 2, this.barTier.y + 22, M.label, { fontFamily: FONT, fontSize: '7px', color: M.css, stroke: '#0b0a14', strokeThickness: 3 }).setOrigin(0.5).setDepth(31).setLetterSpacing(2);
    match.addUI(this.moodT);
  }

  /** Switches the world: 'poly' (his clap), 'drawn' (his snap), 'void' (nothing under the mask) or 'stars' (his true face). */
  setWorld(w) {
    this.world = w;
    const dk = w === 'stars' ? 'void' : w;                                            // (the night sky keeps his PS1 counter, starlit)
    for (const [k, L] of Object.entries(this.bgSets)) for (const o of L) o.setVisible(k === w);
    for (const [k, L] of Object.entries(this.deskSets)) for (const o of L) o.setVisible(k === dk);
    for (const o of this.deskSets.void) o.setTint(w === 'stars' ? 0xc8b4ff : 0xffffff);
    this.sparkColor = COL[w][0];
    this.paintSlab();
  }

  /** The left ledge in each world's style: a faceted candy slab / an inked plank / a black shard edged in red. */
  paintSlab() {
    const g = this.slabG, P = this.platforms[1], w = P.x2 - P.x1, y = P.y; g.clear();
    if (this.world === 'poly') {
      g.fillStyle(0x7adcff, 1); g.fillPoints([{ x: P.x1, y }, { x: P.x2, y }, { x: P.x2 - 8, y: y + 10 }, { x: P.x1 + 8, y: y + 10 }], true);
      g.fillStyle(0x3a9ee8, 1); g.fillPoints([{ x: P.x1 + 8, y: y + 10 }, { x: P.x2 - 8, y: y + 10 }, { x: P.x1 + w / 2 + 6, y: y + 34 }], true);
      g.fillStyle(0x2c3696, 1); g.fillPoints([{ x: P.x1 + 8, y: y + 10 }, { x: P.x1 + w / 2 + 6, y: y + 34 }, { x: P.x1 + w / 2 - 14, y: y + 26 }], true);
      g.fillStyle(0xffffff, 0.6); g.fillRect(P.x1 + 4, y, w - 8, 2);
    } else if (this.world === 'drawn') {
      g.fillStyle(0xe8c890, 1); g.fillRect(P.x1, y, w, 9);
      g.lineStyle(2, 0x261a18, 1); g.strokeRect(P.x1, y, w, 9);
      g.lineStyle(1, 0x261a18, 0.6); for (let x = P.x1 + 10; x < P.x2; x += 14) g.lineBetween(x, y + 2, x + 6, y + 7);
      g.lineStyle(2, 0x261a18, 1); g.lineBetween(P.x1 + 10, y + 9, P.x1 + 4, y + 26); g.lineBetween(P.x2 - 10, y + 9, P.x2 - 4, y + 26);
    } else if (this.world === 'stars') {
      g.fillStyle(0x2a1050, 1); g.fillPoints([{ x: P.x1, y }, { x: P.x2, y }, { x: P.x2 - 14, y: y + 16 }, { x: P.x1 + w / 2, y: y + 38 }, { x: P.x1 + 12, y: y + 14 }], true);
      g.fillStyle(0x8a5aff, 1); g.fillPoints([{ x: P.x1 + 12, y: y + 14 }, { x: P.x1 + w / 2, y: y + 38 }, { x: P.x1 + w / 2 - 6, y: y + 8 }], true);
      g.fillStyle(0xfff4ff, 0.8); g.fillRect(P.x1 + 4, y, w - 8, 2);
    } else {
      g.fillStyle(0x07050a, 1); g.fillPoints([{ x: P.x1, y }, { x: P.x2, y }, { x: P.x2 - 18, y: y + 14 }, { x: P.x1 + 30, y: y + 30 }], true);
      g.lineStyle(1, 0xff2a3a, 0.9); g.lineBetween(P.x1, y, P.x2, y); g.lineStyle(1, 0xd2d0cc, 0.6); g.lineBetween(P.x1 + 30, y + 30, P.x2 - 18, y + 14);
    }
  }

  // ------------------------------------------------------------------ him
  /** An animation as he's turned now: { spec (its frame table), key (texture key before the sheet number), whole (legs
   *  drawn in: no legs layer under it) }. Turned to the side he faces (`face`) unless `front` (cutscenes) or there's no
   *  turned render; then facing you - his whole-body front render if there is one (THE STARFALL), else the LOST one. */
  look(name = this.an.name) {
    const T = this.scene.textures, has = (v) => FIGHT[v] && FIGHT[v][name] && T.exists(`lost_${v}_${name}_0`);
    const v = this.front || !this.boss || this.boss.dying || this.boss.gloat || this.intro || this.cut ? null : this.face;
    if (v && has(v)) return { spec: FIGHT[v][name], key: `lost_${v}_${name}_`, whole: true };
    if (has('f') && (!LOST_FRAMES.anims[name] || !T.exists(`lost_hanz_${name}_0`) || !v)) return { spec: FIGHT.f[name], key: `lost_f_${name}_`, whole: true };
    if (!v && !T.exists(`lost_hanz_${name}_0`)) for (const s of ['r', 'l']) if (has(s)) return { spec: FIGHT[s][name], key: `lost_${s}_${name}_`, whole: true };
    return { spec: LOST_FRAMES.anims[name], key: `lost_hanz_${name}_`, whole: false };
  }
  /** Whether he has this animation in any form. */
  hasAnim(name) { const T = this.scene.textures; return (LOST_FRAMES.anims[name] && T.exists(`lost_hanz_${name}_0`)) || ['r', 'l', 'f'].some((v) => FIGHT[v] && FIGHT[v][name] && T.exists(`lost_${v}_${name}_0`)); }
  /** Plays one of his animations (from LOST, or turned): hold = stay on the last frame; then = called when it ends. */
  play(name, { hold = false, then = null } = {}) { if (!this.hasAnim(name)) name = 'idle'; this.an = { name, f: 0, tick: 0, hold, then, done: false }; }
  /** Holds the animation on frame f (cutscenes). */
  hold(f) { this.an.f = Math.min(f, this.look().spec.frames.length - 1); this.an.held = true; }
  /** Advances his animation one game frame (back to idle when a one-shot ends, unless held). */
  stepAnim() {
    const A = this.an, spec = this.look(A.name).spec, n = spec.frames.length;
    if (A.held || ++A.tick < TICKS) return;
    A.tick = 0;
    if (A.f < n - 1) A.f++;
    else if (spec.loop) A.f = 0;
    else if (!A.done) { A.done = true; const t = A.then; A.then = null; if (t) t(); else if (!A.hold) this.play('idle'); }
  }
  /** Frames into the current animation at which frame f shows. */
  static at(f) { return f * TICKS; }
  /** His current frame's table entry. */
  frame() { const spec = this.look().spec; return spec.frames[Math.min(this.an.f, spec.frames.length - 1)]; }
  /** THE TRUE FACE's sizes go by this (his hurt boxes' scale). */
  zK() { return Z; }
  /** Where his waist floats when he's at rest (his shoes just off the desk), and where it is when he stands on it. */
  hoverY() { return BODY.hover; }
  landY() { return DIVE.land; }
  /** A point on his LOST picture (640x360, him behind the counter) -> the world, where he floats now. */
  L(sx, sy) { return { x: this.hx + (sx - 320) * BODY.sc, y: this.hy + (sy - BODY.waist) * BODY.sc }; }
  /** The middle of his face (between his eyes), in the world. */
  headAt() { const e = this.frame().eyes; const a = e.sal, b = e.hanz; return this.L((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
  /** A frame's `spark` point (snap / clap) in the world. */
  sparkAt(anim) { const L = this.look(anim).spec, sp = L && L.spark; return sp ? this.L(sp.x, sp.y) : this.headAt(); }

  /** Puts his frame up where he floats (flashing white when hit, afterimages while he dashes, ghosts split off while he
   *  glitches), his aura and smoke tail, his pupils or the void face. */
  renderHim() {
    const V = this.look(), fr = this.frame(), p = this.L(fr.x, fr.y), key = V.key + fr.k, f = String(Math.min(this.an.f, V.spec.frames.length - 1));
    const B = this.boss, SC = BODY.sc;
    this.him.setTexture(key, f).setPosition(p.x, p.y).setVisible(!this.gone);
    if (this.legs) {                                                                  // his legs dangling under him, swinging (hanz_legs.py)
      const i = Math.floor(this.t / 4) % LEGS.frames.length, lf = LEGS.frames[i], q = this.L(lf.x, lf.y);
      this.legs.setTexture(`lost_legs_${lf.k}`, String(i)).setPosition(q.x, q.y).setVisible(!this.gone && !V.whole);
    }
    for (const im of this.legs ? [this.him, this.legs] : [this.him]) {
      if (B && B.flash) im.setTintMode(Phaser.TintModes.FILL).setTint(0xffffff); else im.setTintMode(Phaser.TintModes.MULTIPLY).setTint(this.tintHim || 0xffffff);
    }
    const split = this.splitK || 0;
    this.ghosts.forEach((g, i) => {
      g.setVisible(split > 0 && !this.gone).setTexture(key, f).setTint(i ? 0x30e0ff : 0xff2a40).setAlpha(0.55 * split);
      g.setPosition(p.x + (i ? 1 : -1) * split * (4 + Math.sin(this.t * 0.9 + i) * 3), p.y + (Math.random() - 0.5) * split * 3);
    });
    this.after.forEach((g, i) => {                                                     // afterimages along his recent path
      const q = this.trail[this.trail.length - 1 - (i + 1) * 3];
      g.setVisible(!!q && this.dashing && !this.gone); if (!q) return;
      g.setTexture(key, f).setPosition(p.x + (q.x - this.hx), p.y + (q.y - this.hy)).setTint(MOODS[this.mood].color).setAlpha(0.45 - i * 0.12);
    });
    this.drawTail();
    // pupils (looking at the nearest fighter) - or, with no face, a void with two pinpricks
    const tgt = this.lookAt || this.nearestPos();
    const g = this.faceG; g.clear();
    for (const { n, p: im } of this.pupils) {
      const e = fr.eyes[n];
      if (!e || e[3] < 0.3 || this.voidFace || this.trueFace || this.gone) { im.setVisible(false); continue; }
      const q = this.L(e[0], e[1]), dx = tgt.x - q.x, dy = tgt.y - q.y, d = Math.hypot(dx, dy) || 1, gz = n === 'sal' ? [1.3, 0.7] : [1.6, 1.4], kk = Math.min(1, d / 140) * e[2] * SC;
      im.setVisible(true).setScale(e[2] / (LOST_FRAMES.pupilK || 1) * SC).setPosition(q.x + dx / d * gz[0] * kk, q.y + dy / d * gz[1] * kk);
    }
    if ((this.trueFace || this.crackK > 0) && !this.gone) this.drawTrueFace(g, fr, SC);
    if (this.voidFace && !this.trueFace && !this.gone) {
      const a = fr.eyes.sal, b = fr.eyes.hanz, sc = ((a[2] + b[2]) / 2) / 1.33, c = this.L((a[0] + b[0]) / 2 + 2, (a[1] + b[1]) / 2 + 14);
      g.fillStyle(0x07050a, 1); g.fillEllipse(c.x, c.y, 76 * SC * sc, 100 * SC * sc);
      g.fillStyle(0x2a0a30, 0.5); g.fillEllipse(c.x, c.y - 2, 60 * SC * sc, 80 * SC * sc);
      g.fillStyle(0x07050a, 1); g.fillEllipse(c.x, c.y + 1, 54 * SC * sc, 76 * SC * sc);
      for (const e of [a, b]) {
        const q = this.L(e[0], e[1] + 4), dx = Math.sign(tgt.x - q.x);
        g.fillStyle(0xfff4e0, 0.18 + 0.1 * Math.sin(this.t * 0.2)); g.fillCircle(q.x + dx, q.y, 4);
        g.fillStyle(0xfff4e0, 1); g.fillRect(Math.round(q.x + dx) - 1, Math.round(q.y) - 1, 2, 2);
      }
    }
  }

  /** Round him glows the colour of his mood, and under his shoes a faint shimmer where he hangs in the air. */
  drawTail() {
    const g = this.tailG; g.clear(); if (this.gone) return;
    const t = this.t, x0 = this.hx, M = MOODS[this.mood], pulse = 0.5 + 0.5 * Math.sin(t * 0.08), mid = this.hy - 30 * Z + FEET * 0.3;
    g.fillStyle(M.color, 0.10 + 0.06 * pulse); g.fillEllipse(x0, mid, 150 * Z, (230 + FEET) * Z * 0.9);
    g.fillStyle(M.color, 0.07); g.fillEllipse(x0, mid, 110 * Z, (180 + FEET) * Z * 0.9);
    const fy = this.hy + FEET, gap = Math.max(0, -fy);                              // his shoes, and how high off the desk they are
    if (gap > 2) {
      g.fillStyle(M.color, 0.18 * Math.min(1, 40 / gap)); g.fillEllipse(x0, -2, 46 * Z, 8);
      for (let i = 0; i < 5; i++) { const q = (t * 0.5 + i * 13) % 26; g.fillStyle(M.color, 0.45 * (1 - q / 26)); g.fillCircle(x0 + (i - 2) * 6 * Z + Math.sin(t * 0.05 + i) * 3, fy + 4 + q, 1.6); }
    }
  }


  /** The nearest living fighter's chest (what his eyes follow), or the middle of the desk. */
  nearestPos() { const m = this.match || this.scene, f = m.fighters && m.fighters.find((q) => q.alive && q.state !== 'respawn'); return f ? { x: f.x, y: f.y - 30 } : { x: 0, y: -40 }; }

  // ------------------------------------------------------------------ the fight
  /** His hits: the difficulty, then this fight's punch (`HIT`). */
  bhit(id, x1, y1, x2, y2, dmg, [angle, base, growth], more) { return super.bhit(id, x1, y1, x2, y2, dmg * HIT.dmg, [angle, base * HIT.base, growth * HIT.growth], more); }
  /** Where the camera and the CPU look: his chest. */
  core() { return { x: this.hx, y: this.hy - 34 * Z }; }
  /** Keep him (all of him, wherever he floats), the floor and both ledges in shot. */
  camPoints() { return [{ x: this.hx, y: this.hy - 140 * Z }, { x: this.hx, y: this.hy + FEET }, { x: -250, y: 10 }, { x: 250, y: 10 }]; }
  /** His head (more with no face) and his body; nothing during a cutscene or his death. */
  hurt() {
    if (!this.boss || this.cut || this.boss.dying) return [];
    const h = this.headAt();
    return [{ x1: h.x - 27 * Z, x2: h.x + 27 * Z, y1: h.y - 42 * Z, y2: h.y + 26 * Z, mult: this.voidFace || this.trueFace ? HURT.void : HURT.head, head: true },
      { x1: this.hx - 52 * Z, x2: this.hx + 52 * Z, y1: h.y + 26 * Z, y2: this.hy + 8, mult: HURT.body },
      { x1: this.hx - 22 * Z, x2: this.hx + 22 * Z, y1: this.hy + 8, y2: this.hy + FEET, mult: HURT.body }]
      .map((r) => this.world !== 'stars' ? r : { ...r, mult: r.mult * TRUE.armor * (r.head && this.boss && this.boss.atk && this.boss.atk.name === 'twoface' ? 1.3 : 1) });
  }
  /** His attacks by world (and LAST CALL quickens the void). */
  pattern() { return MOVES[this.mood][this.world]; }
  /** Wind-ups: the difficulty's speed and his mood's (FURIOUS is quick, GLOOMY slow). */
  sp(n) { return Math.max(1, Math.round(n / ((this.boss ? this.boss.cfg.T.speed : 1) * MOODS[this.mood].speed))); }
  /** What the death card quotes: the world he beat you in. */
  cardForm() { return this.world; }
  /** The death card's portrait: him. */
  cardObjs() { return [this.him]; }
  /** A new strike id. */
  nid(tag) { this.idN = (this.idN || 0) + 1; return 'hz-' + tag + '-' + this.idN; }
  /** A random living fighter (or null). */
  victim(match) { const L = match.fighters.filter((f) => f.alive && f.state !== 'respawn'); return L.length ? L[Math.floor(Math.random() * L.length)] : null; }

  /** Every frame: him, his worlds, the fight (and the acts changing), every effect. */
  step(match) {
    this.t++; this.stepAnim(); this.ambient();
    const out = [];
    if (!this.boss) { this.float(match); return out; }
    const B = this.boss, had = !!B.atk;
    this.bossStep(match, out);
    if (had && !B.atk) { this.pin = false; this.dashing = false; this.front = false; if (this.mood !== 'whole' && ++this.moodN >= this.moodAt && !B.dying && !match.over) this.pickMood(match); }
    if (!B.dying && !this.pin) this.float(match);
    this.turn(match);
    if (this.blinkT > 0 && --this.blinkT === 0) this.splitK = 0;
    this.trail.push({ x: this.hx, y: this.hy }); if (this.trail.length > 14) this.trail.shift();
    if (!B.atk && !B.dying && this.an.name === 'idle' && this.an.f === 0 && MOODS[this.mood].rest !== 'idle') this.play(MOODS[this.mood].rest);
    this.watchHits(match);
    if (!B.dying && !match.over) {
      if (this.world === 'drawn' && B.hp <= B.max * ACTS.void && !this.cut && !B.atk) this.startVoid(match);
      if (this.trueDue(match)) this.startStarfall(match);
      if (this.trueReady && !B.atk && !this.cut) this.startTrue(match);
      if (this.world === 'stars' && !this.low && B.hp <= B.max * TRUE.low) { this.low = true; this.rageText.setText('LAST CALL!'); B.rage = 90; sfx('ding', 1, 0.4); }
      if (this.low && !B.atk && B.wait > TRUE.lowWait) B.wait = TRUE.lowWait;
    }
    this.stepFx(match, B.dying || match.over ? null : out);
    this.stepTrue(match, B.dying || match.over ? null : out);
    if (this.flashK > 0) this.flashK = Math.max(0, this.flashK - 0.06);
    return out;
  }

  /** Which way he faces: toward the nearest fighter once they're `TURN` px past him (the way he's dashing while he dashes). */
  turn(match) {
    const B = this.boss, A = B && B.atk;
    if (A && A.name === 'dash' && A.dir) { this.face = A.dir > 0 ? 'r' : 'l'; return; }
    if (A && A.name === 'comet' && A.vx && this.dashing) { this.face = A.vx > 0 ? 'r' : 'l'; return; }
    const f = this.nearest(match, this.hx); if (!f) return;
    if (f.x > this.hx + TURN) this.face = 'r'; else if (f.x < this.hx - TURN) this.face = 'l';
  }

  /** The world's own life: the polygon things turn and swim, the ink boils, the void crawls. */
  ambient() {
    const t = this.t;
    if (this.world === 'poly') {
      const P = LOST_POLY.things, f = Math.floor(t / 6);
      this.polyThings.moon.setFrame('moon_' + (f % P.moon.n));
      this.polyThings.torus.setFrame('torus_' + (f % P.torus.n)).y = P.torus.y + P.torus.h / 2 + Math.sin(t * 0.02) * 4;
      const wh = this.polyThings.whale; wh.setFrame('whale_' + (f % P.whale.n)); wh.x = -P.whale.w / 2 + ((P.whale.x + P.whale.w + t * 0.25) % (VIEW_W + P.whale.w));
    } else if (this.world === 'drawn') {
      const b = boilAt(t); this.inkBg.setTexture('lost_drawn_ink_' + b); this.inkDesk.setTexture('lost_drawn_desk_ink_' + b);
      stepThings(this.drawnThings, t, (t % 300) < 7 ? 1 : 0);
    } else {
      for (const im of this.deskSets.void) if (im.prop) im.setFrame(String(Math.floor(t * im.prop.fps / 60) % im.prop.n));
    }
  }

  // ------------------------------------------------------------------ attacks: the polygon room
  /** How he moves between attacks, by mood: FURIOUS closes in on you, SMUG keeps a showman's distance, GLOOMY drifts
   *  away to the far end, LAUGHING blinks about the desk in bursts of glitch. Always bobbing. */
  float(match) {
    const M = MOODS[this.mood], f = this.boss ? this.nearest(match, this.hx) : null, sp = BODY.drift * M.speed;
    let tx = this.hx;
    if (f) {
      const side = Math.sign(this.hx - f.x) || (this.hx > 0 ? 1 : -1);
      if (M.move === 'chase') tx = f.x + side * 46;
      else if (M.move === 'keep') tx = f.x + side * 150;
      else if (M.move === 'flee') tx = f.x + side * 240;
      else if (this.t % 100 === 0 && this.boss && !this.boss.atk) this.blink(match, -BODY.edge + Math.random() * BODY.edge * 2);
    } else tx = Math.sin(this.t * 0.006) * 60;
    tx = Math.max(-BODY.edge, Math.min(BODY.edge, tx));
    const old = this.hx; this.hx += Math.max(-sp, Math.min(sp, (tx - this.hx) * 0.05)); this.vx = this.hx - old;
    this.hy += (BODY.hover + Math.sin(this.t * 0.04) * BODY.bob - this.hy) * 0.08;
  }
  /** LAUGHING's blink: a burst of glitch, and he's somewhere else. */
  blink(match, x) {
    const a = this.core(); this.burst(match, a.x, a.y, 10, COL.void);
    this.hx = x; this.splitK = 1; this.blinkT = 8; sfx('glitch', 0.6, 0.8 + Math.random() * 0.4);
    const b = this.core(); this.burst(match, b.x, b.y, 10, COL.void);
  }
  /** His hits on you count toward SMUG (each fighter's % going up while he's attacking). */
  watchHits(match) {
    for (const f of match.fighters) { const p = this.prevPct.get(f) ?? f.percent; if (f.percent > p + 4 && this.boss && this.boss.atk) this.hitsLately += 1; this.prevPct.set(f, f.percent); }
    this.hurtLately *= 0.996; this.hitsLately *= 0.997;
  }
  /** Damage you do to him counts toward FURIOUS. */
  onHurt(match, r, d) { this.hurtLately += d; }
  /**
   * A MOOD SWING (every few attacks): weighs how the fight is going - damage he's taken lately (FURIOUS), hits he's
   * landed (SMUG), his health (GLOOMY, LAUGHING) - and maybe changes: the banner, his aura, a line, the animation he
   * snaps into it with. Returns the mood.
   */
  pickMood(match) {
    const B = this.boss, hp = B.hp / B.max;
    this.moodN = 0; this.moodAt = MOOD.every[0] + Math.floor(Math.random() * (MOOD.every[1] - MOOD.every[0] + 1));
    const w = { smug: 1 + this.hitsLately * MOOD.hit, furious: 0.8 + this.hurtLately / MOOD.hurt, gloomy: 0.6 + (hp < 0.5 ? MOOD.low : 0) + (this.world === 'drawn' ? 0.6 : 0), manic: 0.6 + (hp < 0.3 ? MOOD.low : 0) + (this.world === 'void' ? 0.8 : 0) };
    w[this.mood] *= MOOD.keep;
    let r = Math.random() * Object.values(w).reduce((a, b) => a + b, 0), next = 'smug';
    for (const [k, v] of Object.entries(w)) { r -= v; if (r <= 0) { next = k; break; } }
    this.hurtLately *= 0.4; this.hitsLately *= 0.4;
    if (next === this.mood) return next;
    this.setMood(match, next);
    return next;
  }
  /** Changes his mood now: banner, flash of its colour, his line, the animation he snaps into it with. */
  setMood(match, m) {
    const M = MOODS[m], h = this.headAt();
    this.mood = m; this.play(M.enter); this.boss.wait = Math.max(this.boss.wait, this.sp(70));
    match.popText({ x: h.x, y: h.y + 10 }, M.label + '!', M.css);
    this.say(M.who === 'b' ? (Math.random() < 0.5 ? 's' : 'h') : M.who, M.say[Math.floor(Math.random() * M.say.length)], 70);
    this.flash(M.color, 0.25); this.burst(match, h.x, h.y + 40, 18, [M.color, 0xffffff]);
    sfx(m === 'furious' ? 'roar' : m === 'gloomy' ? 'clocktick' : m === 'manic' ? 'laugh' : 'ding', 0.6, m === 'gloomy' ? 0.6 : 0.9);
    if (this.moodT) this.moodT.setText(M.label).setColor(M.css);
  }

  /** DIVE SLAM (FURIOUS): he rises over you, hangs there, and plunges fists-first into the desk - shockwaves out both ways
   *  from where he lands - then slumps there a moment, head low (hit it!), before floating back up. Twice in later acts. */
  start_slam(match, a) { this.pin = true; a.n = this.world === 'poly' ? 1 : 2; a.ph = 'rise'; a.t0 = 0; this.play('look_d'); sfx('whoosh', 0.7, 0.6); }
  /** One frame of the DIVE SLAM: rise, hang, plunge, slump, back up (true when done). */
  atk_slam(match, a, out) {
    const t = a.t - a.t0, f = this.nearest(match, this.hx);
    if (a.ph === 'rise') {
      if (f) this.hx += (Math.max(-BODY.edge, Math.min(BODY.edge, f.x)) - this.hx) * 0.12;
      this.hy += (DIVE.top - this.hy) * 0.12;
      if (t > this.sp(DIVE.rise)) { a.ph = 'hang'; a.t0 = a.t; this.play('slam'); sfx('warn', 0.6, 1.2); }
    } else if (a.ph === 'hang') {
      this.marks.push({ x: this.hx, y: 0, k: t / DIVE.hang, kind: 'fire', life: 1 }); this.hy += Math.sin(t) * 0.5;
      if (t > DIVE.hang) { a.ph = 'fall'; a.t0 = a.t; a.id2 = this.nid('dv'); }
    } else if (a.ph === 'fall') {
      this.hy = Math.min(DIVE.land, this.hy + DIVE.v); this.dashing = true;
      out.push(this.bhit(a.id2, this.hx - 50 * Z, this.hy - 125 * Z, this.hx + 50 * Z, this.hy + FEET, ...DIVE.body, { radial: true }));
      if (this.hy >= DIVE.land) {
        a.ph = 'slump'; a.t0 = a.t; this.dashing = false;
        this.waves.push({ x: this.hx - 30, dir: -1, v: SLAM.waveV, id: this.nid('w') }, { x: this.hx + 30, dir: 1, v: SLAM.waveV, id: this.nid('w') });
        this.impact(match, this.hx, 0, 1.6); sfx('bighit', 1, 0.55); sfx('clang', 0.6, 0.5); match.shake(16, 18); this.flash(0xffffff, 0.35);
        out.push(this.bhit(a.id2 + 'x', this.hx - 70, -50, this.hx + 70, 4, ...SLAM.fist, { radial: true }));
      }
    } else if (a.ph === 'slump') {
      if (t > DIVE.slump) { if (--a.n > 0) { a.ph = 'rise'; a.t0 = a.t; this.play('look_d'); } else { a.ph = 'back'; a.t0 = a.t; } }
    } else { this.hy += (BODY.hover - this.hy) * 0.1; if (Math.abs(this.hy - BODY.hover) < 3) return true; }
    return false;
  }

  /** THE CHARGE (FURIOUS): he draws back, red streaks pull at the air, then he tears across the desk the whole way
   *  through you, leaving afterimages; in the void he turns and comes back. */
  start_dash(match, a) { this.pin = true; const f = this.nearest(match, this.hx); a.dir = f ? (Math.sign(f.x - this.hx) || 1) : 1; a.n = this.world === 'void' ? 2 : 1; a.ph = 'wind'; a.t0 = 0; this.play('argue'); sfx('roar', 0.5, 1.1); }
  /** One frame of THE CHARGE: winding back, then across the desk (true when done). */
  atk_dash(match, a, out) {
    const t = a.t - a.t0;
    if (a.ph === 'wind') {
      this.hx -= a.dir * 1.1; this.hy += (BODY.hover + 10 - this.hy) * 0.1;
      if (t % 4 === 0) for (let i = 0; i < 3; i++) match.particles.push({ x: this.hx + a.dir * (80 + Math.random() * 140), y: this.hy - 20 - Math.random() * 100, vx: -a.dir * 7, vy: 0, life: 14, color: 0xff2a3a, size: 2 });
      if (t > this.sp(DASH.wind)) { a.ph = 'go'; a.t0 = a.t; a.id2 = this.nid('ds'); sfx('whoosh', 1, 0.5); this.dashing = true; }
    } else if (a.ph === 'go') {
      this.hx += a.dir * DASH.v;
      out.push(this.bhit(a.id2, this.hx - 48 * Z, this.hy - 118 * Z, this.hx + 48 * Z, this.hy + FEET, ...DASH.hit, { dirX: a.dir }));
      if (t % 2 === 0) match.particles.push({ x: this.hx - a.dir * 50, y: this.hy - Math.random() * 120, vx: -a.dir * 3, vy: 0, life: 18, color: MOODS[this.mood].color, size: 3 });
      if (Math.abs(this.hx) > 250) {
        this.hx = Math.sign(this.hx) * 250; this.dashing = false; match.shake(6, 8); sfx('clang', 0.5, 0.7);
        if (--a.n > 0) { a.dir = -a.dir; a.ph = 'wind'; a.t0 = a.t; } else return true;
      }
    }
    return false;
  }

  /** POLYGON STORM: he claps - a ring of shards bursts off his hands, circles, and fires one by one at you. */
  start_storm(match, a) { this.play('clap'); a.at = TICKS * LOST_FRAMES.anims.clap.spark.f; }
  /** STORM, frame by frame: the burst at the clap; the shards fly themselves (stepFx). Returns true when it's over. */
  atk_storm(match, a) {
    if (a.t === a.at) {
      const c = this.sparkAt('clap'), n = STORM.n[this.world];
      this.burst(match, c.x, c.y, 26); sfx('bighit', 0.8, 1.7); sfx('glass', 0.6, 1.2); match.shake(8, 10); this.flash(COL[this.world][0], 0.3);
      for (let i = 0; i < n; i++) this.shots.push({ kind: 'shard', ph: 'orbit', cx: c.x, cy: c.y - 20, ang: i / n * Math.PI * 2, rad: 0, x: c.x, y: c.y, vx: 0, vy: 0, r: 7, i, at: a.t + STORM.orbit + i * STORM.every, id: this.nid('sh'), c: COL[this.world][i % 5], hit: STORM.hit });
      a.end = a.t + STORM.orbit + n * STORM.every + STORM.aim + 50;
    }
    return a.end && a.t > a.end;
  }

  /** THE WHALE (polygon) / THE FISH (drawn): a warning streams across the desk, then it dives through, the length of it. */
  start_whale(match, a) { this.play(this.world === 'poly' ? 'pitch' : 'snap'); a.s = Math.random() < 0.5 ? 1 : -1; a.n = this.world === 'void' ? 2 : 1; }
  /** WHALE, frame by frame: the warning, then the dive across (twice in the void). Returns true when it's over. */
  atk_whale(match, a, out) {
    if (a.t === 30) { a.warn = WHALE.warn; sfx('warn', 0.7); sfx('whoosh', 0.6, 0.5); }
    if (a.warn > 0 && --a.warn === 0) {
      const poly = this.world === 'poly', n = poly ? 'whale' : 'fish';
      a.x = -a.s * 760; a.y = -48; a.live = true; a.id2 = this.nid('wh');
      this.beast.setTexture(poly ? 'lost_poly_things' : 'lost_drawn_things', n + '_0').setScale(poly ? 1.6 : 1.9).setVisible(true).setFlipX(poly ? a.s > 0 : a.s < 0);
      sfx('roar', 0.7, poly ? 0.5 : 0.8); match.shake(6, 30);
    }
    if (a.live) {
      a.x += a.s * WHALE.v; const poly = this.world === 'poly', n = poly ? 'whale' : 'fish';
      this.beast.setPosition(a.x, a.y + Math.sin(a.t * 0.25) * 4).setFrame(n + '_' + (Math.floor(a.t / 5) % (poly ? LOST_POLY.things.whale.n : LOST_DRAWN.boil)));
      out.push(this.bhit(a.id2, a.x - WHALE.w / 2, a.y - WHALE.h / 2, a.x + WHALE.w / 2, a.y + WHALE.h / 2, ...WHALE.hit, { dirX: a.s }));
      if (a.t % 2 === 0) { const c = COL[this.world]; for (let i = 0; i < 3; i++) match.particles.push({ x: a.x - a.s * 90 + (Math.random() - 0.5) * 30, y: -4, vx: -a.s * (1 + Math.random() * 2), vy: -2 - Math.random() * 4, life: 30, color: c[i % 4], size: 3, grav: 0.2 }); }
      if (Math.abs(a.x) > 780) { a.live = false; this.beast.setVisible(false); if (--a.n > 0) { a.s = -a.s; a.warn = 40; } else return true; }
    }
    return false;
  }

  /** CLEARANCE SALE: the till rings and spits volleys of glowing coins across the desk; they bounce once. */
  start_coins(match, a) { this.play('sold'); }
  /** COINS, frame by frame: a volley out of the till every COINS.every frames. Returns true when it's over. */
  atk_coins(match, a) {
    const k = (a.t - 30) / COINS.every;
    if (a.t >= 30 && k === Math.floor(k) && k < COINS.volleys) {
      const at = this.L(400, 230);
      sfx('ding', 0.9, 1.2 + k * 0.1); sfx('clang', 0.5, 1.6); match.shake(4, 6);
      for (let i = 0; i < COINS.n; i++) this.shots.push({ kind: 'coin', x: at.x, y: at.y, vx: (this.nearestPos().x < at.x ? -1 : 1) * (1.6 + Math.random() * 6.4) * (Math.random() < 0.15 ? -0.4 : 1), vy: -5 - Math.random() * 4.5, grav: 0.28, bounce: 1, r: COINS.r, spin: Math.random() * 6, id: this.nid('cn'), hit: COINS.hit, life: 260 });
      this.burst(match, at.x, at.y, 10, [0xffd447, 0xfff3dc, 0x2fd6c6]);
    }
    return a.t > 30 + COINS.volleys * COINS.every + 120;
  }

  /** THE WATCHER: the gem on his desk rises and its eye locks on - a line, then a prism laser down through you. */
  start_gem(match, a) {
    this.play('look_d'); const g = this.L(320, 215);
    a.from = g; a.shots = GEM.shots[this.low ? 1 : 0]; a.k = 0; a.aim = null; sfx('ding', 0.6, 0.6);
    this.gem.setTexture('lost_poly_things', 'gem_0').setPosition(g.x, g.y).setScale(1).setVisible(true);
  }
  /** GEM, frame by frame: the gem rising, then lock-on / fire for each shot. Returns true when it's over. */
  atk_gem(match, a, out) {
    const up = Math.min(1, a.t / 40), gx = lerp(a.from.x, this.hx + (this.hx > 0 ? -70 : 70), up), gy = lerp(a.from.y, -270, up);
    this.gem.setPosition(gx, gy + Math.sin(a.t * 0.08) * 4).setScale(1 + up * 1.4).setFrame('gem_' + (Math.floor(a.t / 4) % LOST_POLY.things.gem.n));
    if (a.t < 40) return false;
    const q = (a.t - 40) % (GEM.lock + GEM.fire + 16), shot = Math.floor((a.t - 40) / (GEM.lock + GEM.fire + 16));
    if (shot >= a.shots) { this.gem.setScale(this.gem.scale * 0.92); if (this.gem.scale < 0.4) { this.gem.setVisible(false); this.beams = this.beams.filter((b) => b.kind !== 'prism'); return true; } return false; }
    const v = this.victim(match);
    if (q === 0) { a.tg = v ? { x: v.x, y: v.y - 20 } : { x: 0, y: -20 }; sfx('laser', 0.3, 0.5); }
    if (q < GEM.lock - 10 && v) { a.tg.x += (v.x - a.tg.x) * 0.12; a.tg.y += (v.y - 20 - a.tg.y) * 0.12; }
    const dx = a.tg.x - gx, dy = a.tg.y - gy, d = Math.hypot(dx, dy) || 1, L = 900;
    const end = { x: gx + dx / d * L, y: gy + dy / d * L };
    if (q < GEM.lock) this.aimLine = { x1: gx, y1: gy, x2: end.x, y2: end.y, k: q / GEM.lock, c: 0xff7ab8 };
    else this.aimLine = null;
    if (q === GEM.lock) { this.beams.push({ kind: 'prism', x1: gx, y1: gy, x2: end.x, y2: end.y, w: GEM.w, t: 0, warn: 0, live: GEM.fire, fade: 14, id: this.nid('gm'), hit: GEM.hit }); sfx('laser', 1, 0.7); sfx('bighit', 0.6, 1.4); match.shake(8, GEM.fire); this.flash(0xff7ab8, 0.25); }
    return false;
  }

  /** STAIRWAY DOWN: marks spread on the desk (one under each of you), then faceted cubes slam down on them and shatter. */
  start_cubes(match, a) {
    this.play('look_d');
    const xs = match.fighters.filter((f) => f.alive).map((f) => f.x);
    while (xs.length < CUBES.n) xs.push(-240 + Math.random() * 480);
    a.marks = xs.slice(0, CUBES.n).map((x, i) => ({ x: Math.max(-255, Math.min(255, x)), at: i * 10, y: -560 - i * 40, done: false, id: this.nid('cb'), rot: Math.random() * 6 }));
    sfx('warn', 0.6);
  }
  /** CUBES, frame by frame: each mark warns, then its cube falls and shatters. Returns true when it's over. */
  atk_cubes(match, a, out) {
    let left = 0;
    for (const m of a.marks) {
      if (m.done) continue; left++;
      const t = a.t - m.at; if (t < 0) continue;
      if (t < CUBES.warn) { this.marks.push({ x: m.x, y: 0, k: t / CUBES.warn, kind: 'cube', life: 1 }); continue; }
      m.y += CUBES.v; m.rot += 0.12;
      this.shots.push({ kind: 'cube', x: m.x, y: m.y, vx: 0, vy: 0, r: 18, ghost: true, rot: m.rot, life: 1 });     // (drawn this frame)
      out.push(this.bhit(m.id, m.x - 20, m.y - 20, m.x + 20, Math.min(m.y + 20, 4), ...CUBES.hit, { radial: true }));
      if (m.y >= -18) {
        m.done = true; this.impact(match, m.x, 0, 0.7); sfx('glass', 0.7, 0.8); sfx('bighit', 0.5, 1.2); match.shake(7, 8);
        for (let i = 0; i < 6; i++) { const q = -Math.PI * (0.15 + 0.7 * i / 5); this.shots.push({ kind: 'shard', ph: 'fly', x: m.x, y: -14, vx: Math.cos(q) * 4.5, vy: Math.sin(q) * 6, grav: 0.25, r: 5, id: this.nid('cs'), c: COL.poly[i % 5], hit: CUBES.shard, life: 90 }); }
      }
    }
    return left === 0 && a.t > 60;
  }

  // ------------------------------------------------------------------ attacks: the drawn room
  /** INK SLASH: a pencil line sketches across the room, then a great brushstroke of ink slashes along it. */
  start_ink(match, a) { this.play('argue'); a.n = INK.n[this.world === 'void' ? 1 : 0]; a.k = 0; }
  /** INK, frame by frame: a new slash every INK.every frames (the beams do the rest). Returns true when it's over. */
  atk_ink(match, a) {
    if (a.k < a.n && a.t % INK.every === 1) {
      a.k++; const v = this.victim(match), cx = v ? v.x + (Math.random() - 0.5) * 60 : (Math.random() - 0.5) * 400, cy = v ? v.y - 30 : -60;
      const steep = Math.random() < 0.3, ang = steep ? (Math.random() < 0.5 ? 1 : -1) * (1.0 + Math.random() * 0.35) : (Math.random() - 0.5) * 1.2, L = 520;
      this.beams.push({ kind: 'ink', x1: cx - Math.cos(ang) * L, y1: cy - Math.sin(ang) * L, x2: cx + Math.cos(ang) * L, y2: cy + Math.sin(ang) * L, w: INK.w, t: 0, warn: INK.warn, live: INK.live, fade: 40, id: this.nid('ink'), hit: INK.hit, seed: Math.random() * 100 });
      sfx('whoosh', 0.5, 1.6);
    }
    if (a.k >= a.n && a.t > a.n * INK.every + INK.warn + 60) { this.play('idle'); return true; }
    return false;
  }

  /** THE EYE OPENS: the eye-moon swells over the room, watches you, and paints columns of watercolour down on you. */
  start_eye(match, a) { a.side = this.hx > 0 ? -1 : 1; this.play(a.side < 0 ? 'look_l' : 'look_r'); a.k = 0; this.eye.setTexture('lost_drawn_things', 'eye_0').setPosition(a.side * 185, -245).setScale(0).setVisible(true); sfx('petal', 0.8, 0.5); }
  /** EYE, frame by frame: the eye swells, aims a column at you per shot, then shrinks away. Returns true when it's over. */
  atk_eye(match, a) {
    const per = EYE.warn + EYE.live + 20, sc = Math.min(1.5, a.t / 20 * 1.5);
    this.eye.setScale(sc).setFrame(a.t % 120 > 112 ? 'eye_' + LOST_DRAWN.boil : 'eye_' + boilAt(a.t));
    if (a.t > 30 && (a.t - 30) % per === 0 && a.k < EYE.shots) {
      a.k++; const v = this.victim(match), x = v ? v.x : 0; this.eyeTg = { x, y: -20 };
      this.cols.push({ kind: 'paint', x, y1: -245, y2: 4, w: EYE.w, t: 0, warn: EYE.warn, live: EYE.live, fade: 30, id: this.nid('ey'), hit: EYE.hit, track: v });
      sfx('warn', 0.5, 1.4);
    }
    if (a.t > 30 + EYE.shots * per + 20) { this.eye.setScale(this.eye.scale * 0.9); if (this.eye.scale < 0.2) { this.eye.setVisible(false); this.eyeTg = null; return true; } }
    return false;
  }

  /** TEATIME: wet rings bubble on the desk, then tea erupts upward out of each in turn (the teacup pours up, after all). */
  start_tea(match, a) {
    this.play('shrug');
    const xs = []; for (let i = 0; i < TEA.n; i++) xs.push(-220 + i * 110 + (Math.random() - 0.5) * 40);
    const v = this.victim(match); if (v) xs[Math.floor(Math.random() * TEA.n)] = v.x;
    xs.forEach((x, i) => this.cols.push({ kind: 'tea', x, y1: -TEA.h, y2: 4, w: TEA.w, t: -i * TEA.every, warn: TEA.warn, live: TEA.live, fade: 24, id: this.nid('tea'), hit: TEA.hit }));
    sfx('geyser', 0.4, 1.4);
  }
  atk_tea(match, a) { return a.t > TEA.warn + TEA.n * TEA.every + TEA.live + 40; }

  /** THE FISH: the house-fish swims through the desk (THE WHALE's run, in ink). */
  start_fish(match, a) { this.start_whale(match, a); }
  atk_fish(match, a, out) { return this.atk_whale(match, a, out); }

  // ------------------------------------------------------------------ attacks: the void
  /** GLITCH TEAR: he breaks apart, and bands of broken picture tear across the room - static first, then solid. */
  start_tear(match, a) { this.play('glitch'); a.k = 0; sfx('glitch', 0.9, 0.7); }
  /** TEAR, frame by frame: a band every TEAR.every frames; the blocks fly off him at 120. Returns true when it's over. */
  atk_tear(match, a) {
    this.splitK = Math.min(1, Math.max(this.splitK || 0, a.t < 200 ? 0.8 : 0));
    if (a.k < TEAR.n && a.t % TEAR.every === 1) {
      a.k++; const v = this.victim(match), lanes = [-18, -140, -230, v ? v.y - 25 : -60];
      this.bands.push({ y: lanes[Math.floor(Math.random() * lanes.length)] + (Math.random() - 0.5) * 16, h: TEAR.h, t: 0, warn: TEAR.warn, live: TEAR.live, fade: 16, id: this.nid('tr'), hit: TEAR.hit, dir: Math.random() < 0.5 ? -1 : 1 });
    }
    if (a.t === 120) {
      const c = this.core(); sfx('glitch', 1, 0.5); match.shake(10, 12);
      for (let i = 0; i < TEAR.blocks; i++) { const q = -Math.PI * Math.random(); this.shots.push({ kind: 'block', x: c.x, y: c.y - 40, vx: Math.cos(q) * (3 + Math.random() * 3), vy: Math.sin(q) * (3 + Math.random() * 4), grav: 0.12, r: 6, id: this.nid('bk'), hit: TEAR.block, life: 140, c: COL.void[i % 3] }); }
    }
    if (a.t > TEAR.n * TEAR.every + TEAR.warn + TEAR.live + 40) { this.splitK = 0; return true; }
    return false;
  }

  /** THIRTEEN O'CLOCK: he takes out his clock-heart; a clock face fills the sky behind him and strikes thirteen - every
   *  strike a ring rushing out of the heart with one gap in it. */
  start_thirteen(match, a) { this.play('heart', { hold: true }); a.k = 0; sfx('clocktick', 1, 0.6); }
  /** THIRTEEN, frame by frame: the clock fades in, then a ring on each of the thirteen strikes. Returns true when it's over. */
  atk_thirteen(match, a) {
    this.clockK = Math.min(1, this.clockK + 0.03);
    if (a.t > CLOCK.start && (a.t - CLOCK.start) % CLOCK.every === 0 && a.k < 13) {
      a.k++; const c = this.L(340, 182), last = a.k === 13;
      this.rings.push({ x: c.x, y: c.y, r: 16, v: CLOCK.v * (last ? 1.25 : 1) * (a.k % 2 ? 1 : 0.85), gap: Math.random() * Math.PI * 2, gw: last ? CLOCK.gap * 1.2 : CLOCK.gap, id: this.nid('rg'), n: a.k });
      sfx('ding', 1, 0.42 + (last ? -0.1 : 0)); sfx('clocktick', 0.8, 0.7); match.shake(last ? 12 : 4, 8);
      this.flash(0xff2a3a, last ? 0.5 : 0.12);
      if (last) match.popText({ x: c.x, y: c.y - 60 }, 'XIII', '#ff4a5a');
    }
    if (a.k >= 13 && a.t > CLOCK.start + 13 * CLOCK.every + 50) { this.clockK = Math.max(0, this.clockK - 0.05); if (this.clockK <= 0) { this.play('idle'); return true; } }
    return false;
  }

  /** MOOD SWING: his head spins and the desk splits down the middle - $@L's red half bursts into fire, then HANZ's grey
   *  half into frost, back and forth. Get across, or get up on a ledge. */
  start_swing(match, a) { this.play('switch'); a.side = Math.random() < 0.5 ? -1 : 1; a.k = 0; a.n = SWING.n + (this.low ? 2 : 0); }
  /** SWING, frame by frame: one half erupts after the other. Returns true when it's over. */
  atk_swing(match, a) {
    const per = SWING.warn + SWING.live;
    if (a.k < a.n && (a.t - 10) % (per - 10) === 0 && a.t >= 10) {
      a.k++; this.halves.push({ side: a.side, t: 0, warn: SWING.warn, live: SWING.live, fade: 16, id: this.nid('hv'), hit: SWING.hit }); a.side = -a.side;
    }
    return a.k >= a.n && a.t > 10 + a.n * (per - 10) + 40;
  }

  /** THE SNAP: $@L snaps his fingers - sparks fly off them, and fire rains onto marks all over the desk. */
  start_firerain(match, a) { this.play('snap'); a.at = TICKS * LOST_FRAMES.anims.snap.spark.f; a.k = 0; }
  /** FIRERAIN, frame by frame: the sparks at the snap, then a fireball every FIRE.every frames. Returns true when it's over. */
  atk_firerain(match, a) {
    if (a.t === a.at) { const c = this.sparkAt('snap'); this.burst(match, c.x, c.y, 22, [0xfff4d0, 0xffb04a, 0xff6a2a, 0xe8341c]); sfx('flame', 0.9, 1.2); sfx('clocktick', 0.9, 2.2); match.shake(6, 8); }
    if (a.t > a.at && (a.t - a.at) % FIRE.every === 0 && a.k < FIRE.n) {
      a.k++; const v = a.k % 3 === 1 ? this.victim(match) : null, x = Math.max(-260, Math.min(260, v ? v.x : -250 + Math.random() * 500));
      this.shots.push({ kind: 'fire', ph: 'warn', x: x - 120, y: -560, tx: x, t: 0, r: 12, id: this.nid('fr'), hit: FIRE.hit });
    }
    return a.k >= FIRE.n && a.t > a.at + FIRE.n * FIRE.every + FIRE.warn + 60;
  }

  // ------------------------------------------------------------------ the effects
  /** A heavy landing at (x, y): a ring, flying shards in the world's colours, dust. */
  impact(match, x, y, k = 1) {
    const C = COL[this.world];
    match.particles.push({ shape: 'ring', x, y: y - 4, vx: 0, vy: 0, life: 18, maxLife: 18, color: C[3], grav: 0, r: 8, dr: 5 * k });
    for (let i = 0; i < 16 * k; i++) { const q = -Math.PI * Math.random(), s = 2 + Math.random() * 5; match.particles.push({ x, y: y - 4, vx: Math.cos(q) * s, vy: Math.sin(q) * s, life: 26 + Math.random() * 18, color: C[i % 5], size: 3, grav: 0.25, drag: 0.97 }); }
  }
  /** A burst of sparks / shards from (x, y). */
  burst(match, x, y, n, cols = COL[this.world]) {
    for (let i = 0; i < n; i++) { const q = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 5; match.particles.push({ x, y, vx: Math.cos(q) * s, vy: Math.sin(q) * s - 1, life: 24 + Math.random() * 20, color: cols[i % cols.length], size: 3, grav: 0.08, drag: 0.95 }); }
    match.particles.push({ shape: 'ring', x, y, vx: 0, vy: 0, life: 20, maxLife: 20, color: 0xffffff, grav: 0, r: 6, dr: 6 });
  }
  /** Flashes the whole screen a colour (strength 0..1), fading. */
  flash(c, k) { if (k > this.flashK) { this.flashK = k; this.flashC = c; } }

  /**
   * Moves every live effect one frame and (out = the frame's hitboxes, null = harmless now) pushes its hits: shockwaves,
   * shards / coins / cubes / blocks / fire, beams (prism / ink), columns (watercolour / tea), glitch bands, clock rings,
   * mood-swing halves.
   */
  stepFx(match, out) {
    const push = (h) => { if (out) out.push(h); };
    this.marks = [];
    for (const w of this.waves) { w.x += w.dir * w.v; push(this.bhit(w.id, w.x - 16, -30, w.x + 16, 2, ...SLAM.wave, { dirX: w.dir })); }
    this.waves = this.waves.filter((w) => Math.abs(w.x) < 285);
    for (const s of this.shots) {
      if (s.ghost) { s.dead = true; continue; }
      s.life = (s.life ?? 600) - 1;
      if (s.kind === 'shard' && s.ph === 'orbit') {
        s.ang += 0.07; s.rad = Math.min(STORM.r, s.rad + 4); s.x = s.cx + Math.cos(s.ang) * s.rad; s.y = s.cy + Math.sin(s.ang) * s.rad * 0.62;
        if (this.boss && this.boss.atk && this.boss.atk.t >= s.at - STORM.aim) { s.ph = 'aim'; const v = this.victim(match); s.tg = v ? { x: v.x, y: v.y - 22 } : { x: s.x, y: 0 }; s.aimT = STORM.aim; }
        if (!this.boss || !this.boss.atk) s.ph = 'fly';
        continue;
      }
      if (s.ph === 'aim') { if (--s.aimT <= 0) { const dx = s.tg.x - s.x, dy = s.tg.y - s.y, d = Math.hypot(dx, dy) || 1; s.vx = dx / d * STORM.v; s.vy = dy / d * STORM.v; s.ph = 'fly'; sfx('shing', 0.3, 1.4 + Math.random() * 0.4); } continue; }
      if (s.kind === 'fire' && s.ph === 'warn') { if (++s.t >= FIRE.warn) { s.ph = 'fall'; s.vx = (s.tx - s.x) / ((0 - s.y) / FIRE.v); s.vy = FIRE.v; } else { this.marks.push({ x: s.tx, y: 0, k: s.t / FIRE.warn, kind: 'fire', life: 1 }); continue; } }
      s.x += s.vx; s.y += s.vy; s.vy += s.grav || 0;
      if (s.kind === 'coin' || s.kind === 'block') s.spin = (s.spin || 0) + 0.25;
      if (s.bounce && s.y >= -s.r && s.vy > 0 && Math.abs(s.x) < 275) { s.y = -s.r; s.vy *= -0.55; s.bounce--; sfx('ding', 0.15, 1.8); }
      if (s.kind === 'fire' && s.y >= -8) {
        s.dead = true; this.impact(match, s.x, 0, 0.6); sfx('flame', 0.6, 0.8); match.shake(5, 6);
        push(this.bhit(s.id + 'x', s.x - 36, -60, s.x + 36, 4, ...s.hit, { radial: true }));
        continue;
      }
      push(this.bhit(s.id, s.x - s.r, s.y - s.r, s.x + s.r, s.y + s.r, ...s.hit, { dirX: Math.sign(s.vx) || 1 }));
      if (s.life <= 0 || Math.abs(s.x) > 720 || s.y > 360 || s.y < -700) s.dead = true;
    }
    this.shots = this.shots.filter((s) => !s.dead);
    for (const b of this.beams) {
      b.t++;
      if (b.t > b.warn && b.t <= b.warn + b.live) {
        if (b.t === b.warn + 1 && b.kind === 'ink') { sfx('slash', 0.9, 0.6); match.shake(6, 6); }
        const dx = b.x2 - b.x1, dy = b.y2 - b.y1, L = Math.hypot(dx, dy), n = Math.ceil(L / (b.w * 0.9));
        const drawn = b.kind === 'ink' ? Math.min(1, (b.t - b.warn) / 6) : 1;
        for (let i = 0; i <= n * drawn; i++) { const x = b.x1 + dx * i / n, y = b.y1 + dy * i / n; if (x < -320 || x > 320 || y < -420 || y > 40) continue; push(this.bhit(b.id, x - b.w / 2, y - b.w / 2, x + b.w / 2, y + b.w / 2, ...b.hit, { dirX: Math.sign(dx) || 1 })); }
      }
    }
    this.beams = this.beams.filter((b) => b.t < b.warn + b.live + b.fade);
    for (const c of this.cols) {
      c.t++;
      if (c.track && c.t < c.warn - 12 && c.track.alive) c.x += (c.track.x - c.x) * 0.08;
      if (c.t > c.warn && c.t <= c.warn + c.live) {
        const h = c.kind === 'tea' ? Math.min(1, (c.t - c.warn) / 6) : 1, y1 = lerp(c.y2, c.y1, h);
        push(this.bhit(c.id, c.x - c.w / 2, y1, c.x + c.w / 2, c.y2, ...c.hit, { dirX: 1 }));
        if (c.t === c.warn + 1) { sfx(c.kind === 'tea' ? 'geyser' : 'laser', 0.8, c.kind === 'tea' ? 1 : 0.6); match.shake(5, 8); this.impact(match, c.x, 0, 0.5); }
      }
    }
    this.cols = this.cols.filter((c) => c.t < c.warn + c.live + c.fade);
    for (const b of this.bands) {
      b.t++;
      if (b.t > b.warn && b.t <= b.warn + b.live) { if (b.t === b.warn + 1) { sfx('glitch', 1, 0.6 + Math.random() * 0.4); match.shake(7, 8); this.flash(0xffffff, 0.15); } push(this.bhit(b.id, -700, b.y - b.h / 2, 700, b.y + b.h / 2, ...b.hit, { dirX: b.dir })); }
    }
    this.bands = this.bands.filter((b) => b.t < b.warn + b.live + b.fade);
    for (const R of this.rings) {
      R.r += R.v;
      for (let q = 0; q < Math.PI * 2; q += 0.21) {
        let d = Math.abs(((q - R.gap) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI); if (d < R.gw / 2) continue;
        const x = R.x + Math.cos(q) * R.r, y = R.y + Math.sin(q) * R.r; if (y > 30 || y < -420 || Math.abs(x) > 330) continue;
        push(this.bhit(R.id, x - 8, y - 8, x + 8, y + 8, ...(R.hit || CLOCK.hit), { radial: true }));
      }
    }
    this.rings = this.rings.filter((R) => R.r < 700);
    for (const h of this.halves) {
      h.t++;
      if (h.t === h.warn + 1) { sfx(h.side < 0 ? 'flame' : 'glass', 1, h.side < 0 ? 0.6 : 0.7); sfx('bighit', 0.6, 0.8); match.shake(9, 14); this.flash(h.side < 0 ? 0xff2a3a : 0xd2e8ff, 0.2); }
      if (h.t > h.warn && h.t <= h.warn + h.live) push(this.bhit(h.id, h.side < 0 ? -300 : 4, -112, h.side < 0 ? -4 : 300, 4, ...h.hit, { dirX: h.side }));
    }
    this.halves = this.halves.filter((h) => h.t < h.warn + h.live + h.fade);
  }

  /** The match is over (MatchScene's shutdown): his big animation sheets are let go - unless you're going back to
   *  LOST, which shows them anyway - and so are the other worlds' pictures. (~100 MB of picture once decoded.) */
  dispose(match) {
    if (match.bossFight && match.bossFight.from === 'Lost') return;
    const T = match.textures;
    for (const key of T.getTextureKeys()) if (key.startsWith('lost_')) T.remove(key);
  }

  /** Clears every attack effect (the acts changing, his death). */
  clearFx() { this.fstars = []; this.hole = null; this.novaK = 0; this.novaLine = null; this.cometLine = null; this.aimHalf = null; this.cpts = null; for (const m of this.halvesM || []) if (m.mode === 'atk') m.mode = 'home'; this.waves = []; this.shots = []; this.beams = []; this.cols = []; this.bands = []; this.rings = []; this.halves = []; this.marks = []; this.aimLine = null; this.splitK = 0; this.clockK = 0; if (this.beast) { this.beast.setVisible(false); this.gem.setVisible(false); this.eye.setVisible(false); } }

  // ------------------------------------------------------------------ drawing
  /** Every frame: him, the void's crawl, every effect, the clock, the flash, the bar. */
  render(match) {
    this.renderHim();
    this.drawVoid();
    this.drawClock();
    this.drawFx();
    this.drawTrue();
    const g = this.skyG; g.clear();
    if (this.flashK > 0 && this.topG) { this.topG.fillStyle(this.flashC, this.flashK); this.topG.fillRect(-1200, -1000, 2400, 1600); }
    if (this.dShards) this.drawShatter();
    if (this.drawCinema) this.drawCinema(match);
    if (this.boss) this.drawBar();
    if (this.moodT) this.moodT.setVisible(!!this.boss && !this.intro && !this.cut && !this.boss.dying && !match.over && this.barG.visible !== false).setAlpha(0.75 + 0.25 * Math.sin(this.t * 0.1));
  }

  /** The void: drifting red and grey motes and slow tear lines across the dark room. */
  drawVoid() {
    const g = this.voidG; g.clear(); if (this.world !== 'void') return;
    const t = this.t;
    g.fillStyle(0x000000, 0.45); g.fillRect(0, 0, VIEW_W, VIEW_H);
    for (let i = 0; i < 40; i++) { const x = (i * 97 + t * (0.2 + (i % 5) * 0.08)) % VIEW_W, y = (i * 53 + Math.sin(t * 0.01 + i) * 20 + VIEW_H) % VIEW_H; g.fillStyle(i % 2 ? 0xff2a3a : 0xd2d0cc, 0.25 + 0.2 * Math.sin(t * 0.05 + i)); g.fillRect(x, y, 2, 2); }
    if (t % 90 < 6) { const y = (t * 37) % VIEW_H; g.fillStyle(0xffffff, 0.08); g.fillRect(0, y, VIEW_W, 3); g.fillStyle(0xff2a3a, 0.12); g.fillRect(6, y + 3, VIEW_W, 2); }
  }

  /** THIRTEEN O'CLOCK's clock face behind him: thirteen marks, XIII at the top, hands racing, glowing on each strike. */
  drawClock() {
    const g = this.backG; g.clear(); const k = this.clockK; if (k <= 0) return;
    const c = { x: this.hx, y: this.hy - 100 * Z }, R = 175 * k, t = this.t;
    g.fillStyle(0x1a0408, 0.75 * k); g.fillCircle(c.x, c.y + 40, R);
    g.lineStyle(4, 0xff2a3a, 0.8 * k); g.strokeCircle(c.x, c.y + 40, R); g.lineStyle(1, 0xd2d0cc, 0.5 * k); g.strokeCircle(c.x, c.y + 40, R - 12);
    for (let i = 0; i < 13; i++) { const q = -Math.PI / 2 + i / 13 * Math.PI * 2, x1 = c.x + Math.cos(q) * (R - 4), y1 = c.y + 40 + Math.sin(q) * (R - 4), x2 = c.x + Math.cos(q) * (R - (i === 0 ? 34 : 20)), y2 = c.y + 40 + Math.sin(q) * (R - (i === 0 ? 34 : 20)); g.lineStyle(i === 0 ? 6 : 3, i === 0 ? 0xff4a5a : 0xd2d0cc, k); g.lineBetween(x1, y1, x2, y2); }
    for (const [L, sp, w] of [[R * 0.8, 0.09, 3], [R * 0.55, 0.012, 6]]) { const q = t * sp; g.lineStyle(w, 0xd2d0cc, 0.8 * k); g.lineBetween(c.x, c.y + 40, c.x + Math.cos(q) * L, c.y + 40 + Math.sin(q) * L); }
  }

  /** Every attack effect, in each world's own look. */
  drawFx() {
    const m = this.midG, g = this.topG || this.midG, gl = this.glowG || this.midG, W = this.world, C = COL[W], t = this.t;
    m.clear(); if (this.topG) { g.clear(); gl.clear(); }
    // marks on the desk (cubes / fire)
    for (const k of this.marks) {
      const a = 0.25 + 0.5 * k.k, r = (k.kind === 'cube' ? 26 : 22) * (0.5 + k.k * 0.5);
      m.fillStyle(k.kind === 'fire' ? 0xff4a1a : C[1], a * 0.5); m.fillEllipse(k.x, -2, r * 2.2, r * 0.6);
      m.lineStyle(2, k.kind === 'fire' ? 0xffd040 : C[0], a); m.strokeEllipse(k.x, -2, r * 2.2, r * 0.6);
      if (Math.floor(t / 4) % 2) { m.lineStyle(1, 0xffffff, a * 0.5); m.lineBetween(k.x, -2, k.x, -400); }
    }
    // shockwaves
    for (const w of this.waves) {
      for (let i = 0; i < 4; i++) {
        const x = w.x - w.dir * i * 10, h = 30 - i * 6;
        if (W === 'poly') { g.fillStyle(C[(i + Math.floor(t / 3)) % 5], 1); g.fillTriangle(x - 7, 0, x + 7, 0, x + w.dir * 2, -h); }
        else if (W === 'drawn') { g.fillStyle(C[0], 1); g.fillEllipse(x, -h / 2, 8, h); g.fillCircle(x + w.dir * 6, -h - 4, 3); }
        else { g.fillStyle(C[i % 2], 0.9); g.fillRect(x - 6, -h, 12, h); g.fillStyle(0x30e0ff, 0.5); g.fillRect(x - 4, -h - 2, 12, h); }
      }
      gl.fillStyle(C[0], 0.25); gl.fillEllipse(w.x, -10, 46, 30);
    }
    // shots
    for (const s of this.shots) {
      if (s.kind === 'shard') {
        const q = t * 0.3 + (s.i || 0), r = s.r * 1.4, pts = [0, 2.1, 4.2].map((o) => ({ x: s.x + Math.cos(q + o) * r, y: s.y + Math.sin(q + o) * r }));
        if (s.ph === 'aim' && s.tg) { g.lineStyle(1, 0xffffff, 0.35 + 0.4 * (Math.floor(t / 2) % 2)); g.lineBetween(s.x, s.y, s.x + (s.tg.x - s.x) * 3, s.y + (s.tg.y - s.y) * 3); }
        if (W === 'drawn') { g.fillStyle(0xf1e8d4, 1); g.fillTriangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y); g.lineStyle(1.5, 0x261a18, 1); g.strokeTriangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y); }
        else { gl.fillStyle(s.c, 0.35); gl.fillCircle(s.x, s.y, s.r * 2.2); g.fillStyle(s.c, 1); g.fillTriangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y); g.fillStyle(0xffffff, 0.8); g.fillTriangle(pts[0].x, pts[0].y, (pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2, s.x, s.y); }
        if (s.ph === 'fly') { gl.lineStyle(3, s.c || C[0], 0.4); gl.lineBetween(s.x, s.y, s.x - s.vx * 4, s.y - s.vy * 4); }
      } else if (s.kind === 'coin') {
        const w = Math.max(1.5, Math.abs(Math.cos(s.spin)) * s.r);
        gl.fillStyle(0xffd447, 0.3); gl.fillCircle(s.x, s.y, s.r * 2);
        g.fillStyle(0xc88a1a, 1); g.fillEllipse(s.x, s.y, w * 2 + 2, s.r * 2 + 2); g.fillStyle(0xffd447, 1); g.fillEllipse(s.x, s.y, w * 2, s.r * 2);
        g.fillStyle(0x2fd6c6, 0.9); g.fillEllipse(s.x, s.y, w * 0.9, s.r * 0.9); g.fillStyle(0xffffff, 0.9); g.fillRect(s.x - w * 0.5, s.y - s.r * 0.6, 2, 2);
      } else if (s.kind === 'cube') this.drawCube(g, gl, s.x, s.y, s.r, s.rot);
      else if (s.kind === 'block') { gl.fillStyle(s.c, 0.3); gl.fillRect(s.x - 10, s.y - 10, 20, 20); g.fillStyle(s.c, 1); g.fillRect(s.x - 6, s.y - 6, 12, 12); g.fillStyle(0x30e0ff, 0.6); g.fillRect(s.x - 3, s.y - 6, 12, 12); }
      else if (s.kind === 'fire' && s.ph === 'fall') {
        gl.fillStyle(0xff6a2a, 0.35); gl.fillCircle(s.x, s.y, 22); gl.lineStyle(10, 0xff8a2a, 0.3); gl.lineBetween(s.x, s.y, s.x - s.vx * 5, s.y - s.vy * 5);
        g.fillStyle(0xffb04a, 1); g.fillCircle(s.x, s.y, 11); g.fillStyle(0xfff4d0, 1); g.fillCircle(s.x + 2, s.y - 2, 6);
      }
    }
    // beams
    for (const b of this.beams) {
      if (b.kind === 'cline' || b.kind === 'nova') continue;                          // (THE TRUE FACE draws its own: hanzTrue.js)
      const dx = b.x2 - b.x1, dy = b.y2 - b.y1, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
      if (b.t <= b.warn) {                                                             // the warning: a pencil sketch / thin line
        const k = b.t / b.warn;
        if (b.kind === 'ink') { g.lineStyle(1, 0x5a4a44, 0.3 + 0.5 * k); for (let o = -1; o <= 1; o++) g.lineBetween(b.x1 + nx * o * 2, b.y1 + ny * o * 2 + Math.sin(b.seed + o) * 2, b.x2 + nx * o * 2, b.y2 + ny * o * 2); }
        continue;
      }
      const lt = b.t - b.warn, live = lt <= b.live, fade = live ? 1 : 1 - (lt - b.live) / b.fade;
      if (b.kind === 'prism') {
        const w = b.w * (live ? 1 + 0.15 * Math.sin(t * 0.8) : fade);
        for (const [o, c] of [[-2, 0xff4a5a], [-1, 0xffd447], [0, 0x2fd6c6], [1, 0x7adcff], [2, 0xa04ae6]]) { gl.lineStyle(w * 0.5, c, 0.55 * fade); gl.lineBetween(b.x1 + nx * o * w * 0.28, b.y1 + ny * o * w * 0.28, b.x2 + nx * o * w * 0.28, b.y2 + ny * o * w * 0.28); }
        gl.lineStyle(w * 2.4, 0xff7ab8, 0.18 * fade); gl.lineBetween(b.x1, b.y1, b.x2, b.y2);
        g.lineStyle(w * 0.35, 0xffffff, fade); g.lineBetween(b.x1, b.y1, b.x2, b.y2);
        gl.fillStyle(0xffffff, 0.6 * fade); gl.fillCircle(b.x1, b.y1, w * 0.9);
      } else this.inkStroke(g, b, lt, live, fade, dx, dy, nx, ny);
    }
    if (this.aimLine) { const A = this.aimLine, lock = A.k > 0.8; g.lineStyle(lock ? 2 : 1, lock ? 0xff2a3a : A.c, 0.4 + 0.5 * (Math.floor(t / (lock ? 2 : 5)) % 2)); g.lineBetween(A.x1, A.y1, A.x2, A.y2); }
    if (this.eyeTg && this.eye.visible) { const e = this.eye, dx = this.eyeTg.x - e.x, dy = this.eyeTg.y - e.y, d = Math.hypot(dx, dy) || 1; g.fillStyle(0x261a18, 1); g.fillCircle(e.x + dx / d * 10 * e.scale, e.y + dy / d * 6 * e.scale, 6 * e.scale); }
    // columns (watercolour / tea)
    for (const c of this.cols) {
      if (c.t <= 0) continue;
      if (c.t <= c.warn) {
        const k = c.t / c.warn;
        if (c.kind === 'tea') { m.fillStyle(0x8a5a2a, 0.3 + 0.4 * k); m.fillEllipse(c.x, -2, c.w * 1.6, 8); for (let i = 0; i < 3; i++) { m.fillStyle(0xe8c890, 0.6); m.fillCircle(c.x + Math.sin(t * 0.3 + i * 2) * c.w * 0.5, -4 - ((t * 0.8 + i * 9) % 18), 2); } }
        else { m.fillStyle(0xc8486a, 0.15 + 0.25 * k); m.fillRect(c.x - c.w / 2, c.y1, c.w, c.y2 - c.y1); m.lineStyle(2, 0x261a18, 0.4 + 0.5 * k); m.strokeEllipse(c.x, -2, c.w * 1.8, 10); }
        continue;
      }
      const lt = c.t - c.warn, fade = lt <= c.live ? 1 : 1 - (lt - c.live) / c.fade, h = c.kind === 'tea' ? Math.min(1, lt / 6) : 1, y1 = lerp(c.y2, c.y1, h);
      if (c.kind === 'tea') this.teaColumn(g, gl, c, y1, fade, t);
      else {
        if (this.eye && this.eye.visible && lt <= c.live) { gl.lineStyle(c.w * 0.5, 0xc8486a, 0.3 * fade); gl.lineBetween(this.eye.x, this.eye.y, c.x, c.y1); g.lineStyle(2, 0xf1e8d4, 0.7 * fade); g.lineBetween(this.eye.x, this.eye.y, c.x, c.y1); }
        for (const [w, a, col] of [[c.w * 1.8, 0.18, 0xc8486a], [c.w * 1.2, 0.35, 0x3a6ab0], [c.w * 0.7, 0.6, 0xc8486a], [c.w * 0.25, 0.9, 0xf1e8d4]]) { gl.fillStyle(col, a * fade); gl.fillRect(c.x - w / 2 + Math.sin(t * 0.3 + w) * 3, c.y1, w, c.y2 - c.y1); }
        g.lineStyle(2, 0x261a18, 0.7 * fade); g.lineBetween(c.x - c.w / 2, c.y1, c.x - c.w / 2 + Math.sin(t * 0.2) * 3, c.y2); g.lineBetween(c.x + c.w / 2, c.y1, c.x + c.w / 2 - Math.sin(t * 0.2) * 3, c.y2);
      }
    }
    // glitch bands
    for (const b of this.bands) {
      if (b.t <= b.warn) { if (Math.floor(t / 3) % 2) { g.lineStyle(1, 0xffffff, 0.5); g.strokeRect(-700, b.y - b.h / 2, 1400, b.h); } for (let i = 0; i < 20; i++) { g.fillStyle(i % 2 ? 0xff2a3a : 0x30e0ff, 0.5); g.fillRect(-360 + Math.random() * 720, b.y - b.h / 2 + Math.random() * b.h, 6 + Math.random() * 20, 2); } continue; }
      const lt = b.t - b.warn, fade = lt <= b.live ? 1 : 1 - (lt - b.live) / b.fade, y = b.y - b.h / 2;
      gl.fillStyle(0xff2a3a, 0.6 * fade); gl.fillRect(-700, y - 4, 1400, b.h); gl.fillStyle(0x30e0ff, 0.6 * fade); gl.fillRect(-700, y + 4, 1400, b.h);
      g.fillStyle(0xffffff, 0.85 * fade); g.fillRect(-700, y + 2, 1400, b.h - 4);
      for (let i = 0; i < 14; i++) { g.fillStyle([0x07050a, 0xff2a3a, 0xd2d0cc][i % 3], fade); g.fillRect(-360 + Math.random() * 720, y + Math.random() * b.h, 10 + Math.random() * 50, 3 + Math.random() * 8); }
    }
    // clock rings
    for (const R of this.rings) {
      const n = 48;
      for (let i = 0; i < n; i++) {
        const q = i / n * Math.PI * 2, d = Math.abs(((q - R.gap) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI); if (d < R.gw / 2) continue;
        const q2 = (i + 1) / n * Math.PI * 2;
        gl.lineStyle(10, R.c || 0xff2a3a, 0.25); gl.lineBetween(R.x + Math.cos(q) * R.r, R.y + Math.sin(q) * R.r, R.x + Math.cos(q2) * R.r, R.y + Math.sin(q2) * R.r);
        g.lineStyle(3, i % 4 ? R.c || 0xff4a5a : 0xffffff, 1); g.lineBetween(R.x + Math.cos(q) * R.r, R.y + Math.sin(q) * R.r, R.x + Math.cos(q2) * R.r, R.y + Math.sin(q2) * R.r);
      }
    }
    // mood swing halves
    for (const h of this.halves) {
      const x1 = h.side < 0 ? -290 : 0, w = 290, fire = h.side < 0;
      if (h.t <= h.warn) { const k = h.t / h.warn; m.fillStyle(fire ? 0xff2a3a : 0xd2e8ff, (0.08 + 0.2 * k) * (Math.floor(t / 4) % 2 ? 1 : 0.5)); m.fillRect(x1, -112, w, 112); m.lineStyle(2, fire ? 0xff2a3a : 0xd2d0cc, 0.6); m.lineBetween(x1, -1, x1 + w, -1); continue; }
      const lt = h.t - h.warn, fade = lt <= h.live ? 1 : 1 - (lt - h.live) / h.fade, rise = Math.min(1, lt / 5);
      for (let i = 0; i < 18; i++) {
        const x = x1 + 8 + i * (w - 16) / 17, hh = (60 + 50 * Math.abs(Math.sin(t * 0.3 + i * 1.7))) * rise;
        if (fire) { gl.fillStyle(0xff6a2a, 0.4 * fade); gl.fillEllipse(x, -hh / 2, 22, hh); g.fillStyle(i % 2 ? 0xffb04a : 0xff2a3a, fade); g.fillTriangle(x - 8, 0, x + 8, 0, x + Math.sin(t * 0.5 + i) * 5, -hh); g.fillStyle(0xfff4d0, fade); g.fillTriangle(x - 3, 0, x + 3, 0, x, -hh * 0.45); }
        else { gl.fillStyle(0xbfe8ff, 0.3 * fade); gl.fillEllipse(x, -hh / 2, 18, hh); g.fillStyle(i % 2 ? 0xd2e8ff : 0xa8b8c8, fade); g.fillTriangle(x - 7, 0, x + 7, 0, x, -hh); g.fillStyle(0xffffff, fade); g.fillTriangle(x - 2, 0, x + 2, 0, x, -hh * 0.7); }
      }
    }
  }

  /** INK SLASH's brushstroke: one tapered, slightly wobbling polygon of wet ink (thick in the middle, a dry-brush tail),
   *  a wet sheen along it, splatter flung off both sides and drips running down - drawn in over its first 6 frames. */
  inkStroke(g, b, lt, live, fade, dx, dy, nx, ny) {
    const drawn = Math.min(1, lt / 6), n = 28, L = [], R = [], a = Math.min(1, fade * 1.3);
    for (let i = 0; i <= n * drawn; i++) {
      const u = i / n, wob = Math.sin(b.seed + u * 9) * 3, x = b.x1 + dx * u + nx * wob, y = b.y1 + dy * u + ny * wob;
      const w = b.w * (0.12 + Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 0.6) * 0.95) * (live ? 1 : 0.85 + 0.15 * fade);
      L.push({ x: x + nx * w / 2, y: y + ny * w / 2 }); R.unshift({ x: x - nx * w / 2, y: y - ny * w / 2 });
    }
    if (L.length < 2) return;
    g.fillStyle(0x0e0a0c, a); g.fillPoints(L.concat(R), true);
    g.lineStyle(2, 0x5a4a54, 0.7 * a); g.strokePoints(L.slice(2, -2), false);
    for (let i = 0; i < 14; i++) {
      const u = ((b.seed * 7 + i * 0.137) % 1) * drawn, side = i % 2 ? 1 : -1, off = b.w * (0.7 + ((b.seed + i * 3.1) % 1) * 1.6);
      g.fillStyle(0x0e0a0c, a); g.fillCircle(b.x1 + dx * u + nx * side * off, b.y1 + dy * u + ny * side * off, 1.5 + (i % 3));
    }
    if (!live) for (let i = 0; i < 5; i++) { const u = ((b.seed * 3 + i * 0.21) % 1) * drawn, x = b.x1 + dx * u, y = b.y1 + dy * u, h = Math.min(30, (lt - b.live) * 0.8) * (0.5 + (i % 3) * 0.3); g.fillStyle(0x0e0a0c, a); g.fillRect(x - 1.5, y, 3, h); g.fillCircle(x, y + h, 2.5); }
    if (live && lt < 8) { this.glowG && this.glowG.lineStyle(b.w * 1.6, 0xc8486a, 0.25); this.glowG && this.glowG.lineBetween(b.x1, b.y1, b.x1 + dx * drawn, b.y1 + dy * drawn); }
  }

  /** TEATIME's geyser: a wavy column of tea (dark at the edges, amber inside, a bright streak), a foaming crown on top,
   *  drops flung off it, inked round the outside like the rest of the drawn room. */
  teaColumn(g, gl, c, y1, fade, t) {
    const n = 14, h = c.y2 - y1, Lp = [], Rp = [];
    for (let i = 0; i <= n; i++) { const y = y1 + h * i / n, w = c.w / 2 * (0.75 + 0.25 * i / n) + Math.sin(t * 0.5 + i * 1.3) * 3; Lp.push({ x: c.x - w, y }); Rp.unshift({ x: c.x + w, y }); }
    gl.fillStyle(0xd8a060, 0.25 * fade); gl.fillRect(c.x - c.w, y1 - 10, c.w * 2, h + 10);
    g.fillStyle(0x5a3214, fade); g.fillPoints(Lp.concat(Rp), true);
    g.fillStyle(0x9a5a24, fade); g.fillPoints(Lp.map((p) => ({ x: c.x + (p.x - c.x) * 0.62, y: p.y })).concat(Rp.map((p) => ({ x: c.x + (p.x - c.x) * 0.62, y: p.y }))), true);
    g.fillStyle(0xe8b860, 0.8 * fade); for (let i = 0; i < n; i++) g.fillRect(c.x - 4 + Math.sin(t * 0.4 + i) * 3, y1 + h * i / n, 3, h / n * 0.7);
    g.lineStyle(2, 0x261a18, fade); g.strokePoints(Lp, false); g.strokePoints(Rp, false);
    for (let i = 0; i < 6; i++) { const q = i / 6 * Math.PI * 2 + t * 0.2, r = c.w * 0.45; g.fillStyle(0xf1e8d4, fade); g.fillCircle(c.x + Math.cos(q) * r, y1 + Math.sin(q) * 4 - 2, 5 + (i % 2) * 2); g.lineStyle(1, 0x261a18, fade); g.strokeCircle(c.x + Math.cos(q) * r, y1 + Math.sin(q) * 4 - 2, 5 + (i % 2) * 2); }
    for (let i = 0; i < 6; i++) { const u = ((t * 0.04 + i / 6) % 1), side = i % 2 ? 1 : -1, x = c.x + side * (c.w * 0.4 + u * 50), y = y1 + u * u * 120 - u * 40; g.fillStyle(0x9a5a24, fade * (1 - u)); g.fillCircle(x, y, 3); }
  }

  /** A faceted cube at (x, y), size r, turned rot: three lit faces and a glow. */
  drawCube(g, gl, x, y, r, rot) {
    gl.fillStyle(0xfff0f8, 0.25); gl.fillCircle(x, y, r * 1.8);
    const c = Math.cos(rot) * r, s = Math.sin(rot) * r * 0.5, top = [{ x: x - c, y: y - r * 0.5 - s }, { x: x + s * 2, y: y - r * 0.5 - c * 0.5 }, { x: x + c, y: y - r * 0.5 + s }, { x: x - s * 2, y: y - r * 0.5 + c * 0.5 }];
    g.fillStyle(0xa888d0, 1); g.fillRect(x - r, y - r * 0.5, r * 2, r * 1.4);
    g.fillStyle(0xd8b8f0, 1); g.fillRect(x - r, y - r * 0.5, r, r * 1.4);
    g.fillStyle(0xfff0f8, 1); g.fillPoints(top, true);
    g.lineStyle(1, 0xffffff, 0.8); g.strokePoints(top, true);
  }
}

// THE CINEMA (intro, the acts changing, his death, the dialogue) - a name used twice throws on load
for (const n of Object.getOwnPropertyNames(HanzCinema.prototype)) {
  if (n === 'constructor') continue;
  if (Object.prototype.hasOwnProperty.call(HanzBossStage.prototype, n)) throw new Error('hanzCinema.js redefines ' + n);
  HanzBossStage.prototype[n] = HanzCinema.prototype[n];
}
// THE TRUE FACE (his last act) - the same
for (const n of Object.getOwnPropertyNames(HanzTrue.prototype)) {
  if (n === 'constructor') continue;
  if (Object.prototype.hasOwnProperty.call(HanzBossStage.prototype, n)) throw new Error('hanzTrue.js redefines ' + n);
  HanzBossStage.prototype[n] = HanzTrue.prototype[n];
}

/** The stage select miniature: his polygon world, his giant silhouette, the candy desk. */
export function drawHanzPreview(g, x, y, w, h) {
  const bands = [0x24164f, 0x4a2a8a, 0xb04ab0, 0xff7aa8, 0xffb98a];
  bands.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(x, y + i * h * 0.12, w, h * 0.12 + 1); });
  g.fillStyle(0xffe86a, 1); g.fillCircle(x + w * 0.75, y + h * 0.5, h * 0.18);
  for (let i = 0; i < 8; i++) { g.fillStyle(i % 2 ? 0xff6fb0 : 0x3a1f6e, 1); g.fillRect(x + i * w / 8, y + h * 0.6, w / 8 + 1, h * 0.4); }
  g.fillStyle(0x101014, 1); g.fillEllipse(x + w * 0.5, y + h * 0.42, w * 0.34, h * 0.62);
  g.fillStyle(0xb8121c, 1); g.fillRect(x + w * 0.44, y + h * 0.2, w * 0.06, h * 0.22); g.fillStyle(0xd2d0cc, 1); g.fillRect(x + w * 0.5, y + h * 0.2, w * 0.06, h * 0.22);
  g.fillStyle(0x7adcff, 1); g.fillRect(x + w * 0.1, y + h * 0.68, w * 0.8, h * 0.08); g.fillStyle(0x2c3696, 1); g.fillRect(x + w * 0.12, y + h * 0.76, w * 0.76, h * 0.16);
}

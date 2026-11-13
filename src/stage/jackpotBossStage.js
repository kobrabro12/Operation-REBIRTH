// PRIME TIME - the arena of MAX JACKPOT, THE HOST WITH THE MOST (boss VIII; Trinkets > BOSS FIGHTS, src/data/bosses.js).
// An original character: the smarmiest game-show host on television. Two metres of pompadour, a grin of enormous
// square teeth that goes TING!, a sequinned purple tuxedo with tails, white gloves, a skinny silver microphone on a
// long cord and a fistful of cue cards. He never stops performing: every line is to the camera, and the studio
// audience (real 3D bleachers behind the stage, poly3d.js) laughs when you get hit and gasps when he does.
// THE BIG WHEEL hangs over the stage. Every few attacks he SPINS THE WHEEL and it picks the next ROUND (`WHEEL`):
//   PLINKO (a giant board drops chips that bounce down through its pegs), PICK A DOOR (the floor splits into doors 1,
//   2 and 3 - two of them spring open, and they flash just before), A BRAND NEW CAR!! (a convertible tears across the
//   stage - jump it), BUZZERS (pads on the floor light up and electrocute), PRIZE (a golden ticket floats down: grab
//   it to heal), LOSE A TURN (he sulks - free hits) and BANKRUPT (his toupee flies off: his bare head takes x2).
// His own act: MIC WHIP (the mic cracked out on its cord), CONFETTI CANNONS (from both wings, aimed at you), SPOTLIGHT
// (it follows you, then the lamp drops), APPLAUSE (the sign lights, the audience's roar rolls along the floor - jump
// it) and THE GRIN (his teeth flash a beam across the stage at head height - stay low).
// At half health: a COMMERCIAL BREAK (a cutscene when a player's watching: colour bars and an ad for his own hair gel)
// and he comes back in gold for SWEEPS WEEK (faster). Below 30%: THE LIGHTNING ROUND - strobing lights, a clock, and
// rounds come without waiting for the wheel. His death: the show is cancelled - a giant vaudeville hook drags him off.
// Stage hazards (VS too): STAGE LAMP (a lamp falls on a mark) and CONFETTI (a cannon blasts a band across the stage).
import { HazardCycle } from './hazardCycle.js';
import { BossArena } from './bossBase.js';
import { Poly3D, boxFaces } from './poly3d.js';
import { sfx } from '../audio/sfx.js';
import { FONT, VIEW_W } from '../config.js';

// his size: leg, torso, neck, head heights; arm length; walk speeds; how far he roams
const HOST = { leg: 78, torso: 70, head: 40, arm: 54, walk: 1.8, fast: 2.6, range: 200 };
// his colours: skin, jacket (and SWEEPS WEEK gold), lapels, shirt, trousers, hair, gloves, bow tie
const LOOK = {
  skin: 0xf0ac78, jacket: 0x7a2ad0, gold: 0xe8b830, lapel: 0xffd75a, shirt: 0xfafaff, pants: 0x1a1428, hair: 0x14101e, glove: 0xffffff, tie: 0xff2a4a,
  ink: 0x0c0814,
};
// THE WHEEL: where it hangs, its size, how long a spin takes (frames), its segments (round, colour, label)
const WHEEL = { x: 0, y: -305, r: 84, spin: 120, every: 4, rage: 3,
  segs: [['plinko', 0xff3a5a, 'PLINKO'], ['doors', 0x3a8aff, 'DOORS'], ['car', 0xffd23a, 'CAR!'], ['buzzers', 0x3ae07a, 'BUZZ'], ['bankrupt', 0x141414, 'BANKRUPT'], ['plinko', 0xff8a2a, 'PLINKO'],
    ['doors', 0xb04ae0, 'DOORS'], ['car', 0x2ad0e0, 'CAR!'], ['prize', 0xfff0a0, 'PRIZE'], ['buzzers', 0xff5ab0, 'BUZZ'], ['lose', 0xd0d0d8, 'LOSE TURN'], ['car', 0x5ad86a, 'CAR!']] };
// MIC WHIP: wind-up, crack (frames), reach, hit
const WHIP = { wind: 28, crack: 12, reach: 190, hit: [11, [40, 6, 0.8]] };
// CONFETTI CANNONS: aim (frames), shots per cannon, frames apart, speed, hit
const CANNON = { aim: 44, n: 4, every: 8, speed: 8, hit: [7, [50, 5, 0.55]] };
// SPOTLIGHT: frames it follows you, frames it holds still, the lamp's fall speed, hit
const SPOT = { follow: 80, hold: 22, fall: 16, hit: [12, [80, 6, 0.8]] };
// APPLAUSE: wind-up, wave speed, wave height, how many waves, frames apart, hit
const CLAP = { wind: 40, speed: 5.5, h: 34, n: [1, 2], every: 50, hit: [9, [70, 5.4, 0.6]] };
// THE GRIN: charge, beam frames, beam half-height, hit
const GRIN = { charge: 44, fire: 22, half: 13, hit: [10, [20, 6, 0.7]] };
// PLINKO: board drop (frames), chips, frames apart, chip radius, hit
const PLINKO = { drop: 40, n: [5, 7], every: 18, r: 15, hit: [9, [75, 5.4, 0.6]] };
// PICK A DOOR: the doors (floor sections), wait (frames), the tell (flash before), how long the springs are out, hit
const DOORS = { at: [[-250, -84], [-84, 84], [84, 250]], wait: 90, tell: 34, out: 20, hit: [12, [88, 7, 0.9]] };
// THE CAR: warning (frames), speed, size, passes (enraged), hit
const CAR = { warn: 50, speed: 10, w: 120, h: 40, passes: [1, 2], hit: [14, [40, 7, 0.95]] };
// BUZZERS: pads, how many go off, warning, how long they zap, hit
const BUZZ = { pads: [-190, -64, 64, 190], live: [2, 3], warn: 50, zap: 30, hit: [10, [85, 5.8, 0.7]] };
// PRIZE: how long the golden ticket lasts, how much % it takes off whoever grabs it
const PRIZE = { life: 420, heal: 30 };
// LOSE A TURN / BANKRUPT: how long he's out (frames); BANKRUPT's damage on his bare head
const SULK = { lose: 130, bankrupt: 230, bald: 2 };
// all his hits: x damage, x base knockback, x knockback growth (one knob for the whole fight's punch)
const HIT = { dmg: 1.1, base: 1.1, growth: 1.3 };
// THE LIGHTNING ROUND (below this much health): rounds without the wheel, a strobing studio
const LOW = { at: 0.3 };
// THE COMMERCIAL BREAK (the half-health cutscene): its length and when the set comes back gold
const BREAK = { n: 330, ad: 70, back: 260 };
// stage hazards: STAGE LAMP (warning, hit) and CONFETTI (warning, blast frames, hit)
const LAMP = { warn: 60, hit: [8, [80, 5, 0.5]] };
const BLAST = { warn: 56, dur: 30, hit: [6, [30, 5, 0.5]] };
// what he says (speech bubbles, all to camera)
const SAY = {
  intro: 'GOOD EVENING, LADIES AND GENTLEMEN!',
  idle: ['COME ON DOWN!', 'DON\'T TOUCH THAT DIAL!', 'TELL THE FOLKS AT HOME WHERE YOU\'RE FROM!', 'THE RATINGS ARE THROUGH THE ROOF!', 'BIG MONEY! NO WHAMMIES!', 'SMILE! YOU\'RE ON TV!', 'OOH, SO CLOSE!'],
  hurt: ['NOT THE FACE! IT\'S INSURED!', 'THAT\'S A PENALTY!', 'SECURITY?!', 'CUT THAT FROM THE BROADCAST!', 'MY HAIR!! IS MY HAIR OK?!'],
  laugh: ['HA! HOW ABOUT THAT, FOLKS!', 'OHH, THAT\'S GOTTA HURT!', 'AND THE CROWD GOES WILD!', 'TOO BAD, SO SAD!'],
  spin: ['SPIN THAT WHEEL!', 'BIG MONEY, BIG MONEY...', 'LET\'S SEE WHAT FATE HAS IN STORE!'],
  rounds: { plinko: 'IT\'S PLINKO TIME!', doors: 'PICK A DOOR! ANY DOOR!', car: 'A BRAND NEW CAR!!', buzzers: 'FINGERS ON BUZZERS!', prize: 'WHO PUT THAT ON THE WHEEL?!', lose: 'LOSE A TURN?! RIGGED!', bankrupt: 'BANKRUPT?! NOOO - MY HAIR!!' },
  rage: 'WE\'LL BE RIGHT BACK!', low: 'IT\'S THE LIGHTNING ROUND!!', gloat: 'AND THAT\'S OUR SHOW, FOLKS!',
  death: 'YOU CAN\'T CANCEL ME!! I\'M AN INSTITUTION!!',
};
// the audience's reaction signs
const SIGNS = { laugh: 'LAUGH', applause: 'APPLAUSE', gasp: 'OOOH!', aww: 'AWWW...' };

/** A point along the way from a to b (k = 0..1). */
const lerp = (a, b, k) => a + (b - a) * k;
/** A repeatable 0-1 number from a few integers. */
const hash = (a, b = 0, c = 0) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** A colour mixed toward another (k = 0..1). */
const mix = (a, b, k) => { const c = (s) => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k); return (c(16) << 16) | (c(8) << 8) | c(0); };
/** Ease out (fast, then settling). */
const easeOut = (q) => 1 - Math.pow(1 - Math.max(0, Math.min(1, q)), 3);

/** PRIME TIME and MAX JACKPOT (see the top of the file). */
export class JackpotBossStage extends BossArena {
  constructor(scene) {
    super();
    this.scene = scene; this.t = 0; this.hazardsOn = true; this.music = 'bgm_boss_jackpot';
    this.platforms = [
      { x1: -260, x2: 260, y: 0, solid: true, bottom: 40 },
      { x1: -230, x2: -130, y: -104, solid: false },
      { x1: 130, x2: 230, y: -104, solid: false },
    ];
    this.spawns = [{ x: -160, y: 0 }, { x: -70, y: 0 }, { x: -120, y: 0 }, { x: 160, y: 0 }];
    this.cycle = new HazardCycle(this, ['lamp', 'confetti'], { color: '#ffd23a', stroke: '#1a0a2a', gap: 720 });
    this.e = { x: 110, y: 0, dir: -1, walk: 0, crouch: 0, hop: 0, lean: 0, ma: 0.3, ca: 1.2, bald: false, wig: null, alpha: 1, tie: 0, grin: 0 };
    this.wheel = { a: 0, from: 0, to: 0, t: 0, spinning: false, last: -1, glow: 0 };
    this.count = 0; this.say = null; this.sayCD = 280; this.sign = null; this.low = false; this.gold = 0; this.strobe = 0;
    this.whip = null; this.shots = []; this.cannons = null; this.spot = null; this.waves = []; this.beam = null; this.plinko = null; this.chips = [];
    this.doors = null; this.car = null; this.buzz = null; this.ticket = null; this.lamp = null; this.blast = null; this.hook = null; this.confetti = [];
    this.prev = new Map(); this.sparkColor = 0xffd23a; this.bodyW = 90; this.bodyH = 220;
  }

  // ------------------------------------------------------------------ the arena
  /** Builds the studio: the backdrop, the 3D audience bleachers and lighting rig, the wheel, the stage and his layers. */
  draw(world, bg) {
    const s = this.scene;
    this.skyG = s.add.graphics().setScrollFactor(0); this.signG = s.add.graphics().setScrollFactor(0.3); bg.push(this.skyG, this.signG);
    const mk = (size, col, sf = 0.3) => { const o = s.add.text(0, 0, '', { fontFamily: FONT, fontSize: size + 'px', color: col, stroke: '#1a0a2a', strokeThickness: 3 }).setOrigin(0.5).setScrollFactor(sf); bg.push(o); return o; };
    this.signT = mk(13, '#ffffff'); this.airT = mk(9, '#ff3a3a');
    const R = this.R = new Poly3D(s, world, { fog: 0x1a0a30, zFar: 3200, zNear: 450, soft: 0.3, grain: 0.04, edge: 0.18 });
    // the bleachers: stepped rows rising away behind the stage, each with a lit front edge; the audience on them
    this.crowd = [];
    for (let r = 0; r < 6; r++) {
      const y = 140 - r * 70, z = 640 + r * 150;
      R.faces.push(...boxFaces(-1300, y, z, 1300, y + 70, z + 150, 0x2a1440, 0x3a2058));
      R.faces.push({ p: [[-1300, y - 3, z], [1300, y - 3, z], [1300, y + 3, z], [-1300, y + 3, z]], n: [0, 0, -1], c: 0xffd23a, nofog: true });
      for (let i = 0; i < 34; i++) {
        const x = -1240 + i * 75 + (r % 2) * 36 + (hash(i, r) - 0.5) * 20, c = [0x5a3a7a, 0x7a4a5a, 0x3a5a7a, 0x6a6a4a, 0x7a3a3a][Math.floor(hash(i, r, 2) * 5)];
        const body = { p: [[x - 22, y - 44, z + 40], [x + 22, y - 44, z + 40], [x + 26, y, z + 40], [x - 26, y, z + 40]], n: [0, 0, -1], c, bb: true, grain: 0 };
        const head = { p: [[x - 12, y - 70, z + 39], [x + 12, y - 70, z + 39], [x + 12, y - 46, z + 39], [x - 12, y - 46, z + 39]], n: [0, 0, -1], c: mix(0xd8a070, c, 0.3), bb: true, grain: 0 };
        R.faces.push(body, head); this.crowd.push({ body, head, y, ph: hash(i, r, 3) * 6.28, arm: null });
      }
    }
    // the lighting rig: a truss across the top, cans hanging off it; two camera towers in the wings
    R.faces.push(...boxFaces(-900, -470, 420, 900, -450, 460, 0x50506a, 0x70708a));
    for (let i = -6; i <= 6; i++) R.faces.push(...boxFaces(i * 140 - 14, -450, 425, i * 140 + 14, -420, 455, 0x2a2a3a, 0x3a3a4a));
    for (const sx of [-1, 1]) { R.faces.push(...boxFaces(sx * 520 - 30, -160, 380, sx * 520 + 30, 260, 440, 0x24243a, 0x34344a)); R.faces.push(...boxFaces(sx * 520 - 40, -230, 360, sx * 520 + 40, -160, 460, 0x18182a, 0x2a2a3a)); }
    this.lightG = s.add.graphics(); world.push(this.lightG);           // spotlight beams
    this.wheelG = s.add.graphics(); world.push(this.wheelG);
    this.wheelT = WHEEL.segs.map((q) => { const o = s.add.text(0, 0, q[2], { fontFamily: FONT, fontSize: '7px', color: q[1] === 0x141414 ? '#ffffff' : '#1a0a2a' }).setOrigin(0.5); world.push(o); return o; });
    this.arenaG = s.add.graphics(); world.push(this.arenaG);
    this.darkG = s.add.graphics(); world.push(this.darkG);            // (the dark studio before the lights come up)
    this.backG = s.add.graphics(); world.push(this.backG);             // (his tails, the mic cord)
    this.hostG = s.add.graphics(); world.push(this.hostG);
    this.fxG = s.add.graphics(); world.push(this.fxG);
    this.fxT = [0, 1, 2].map(() => { const o = s.add.text(0, 0, '', { fontFamily: FONT, fontSize: '12px', color: '#ffffff', stroke: '#1a0a2a', strokeThickness: 4 }).setOrigin(0.5).setVisible(false); world.push(o); return o; });
    this.bubG = s.add.graphics(); world.push(this.bubG);
    this.bubT = s.add.text(0, 0, '', { fontFamily: FONT, fontSize: '9px', color: '#1a0a2a', align: 'center', wordWrap: { width: 170 } }).setOrigin(0.5).setVisible(false); world.push(this.bubT);
    this.cycle.makeBanner(s);
    this.paintSky();
  }
  /** The back wall: a deep purple studio with a starburst behind the stage and rows of marquee bulbs. */
  paintSky() {
    const g = this.skyG, gold = this.gold > 0.5; g.clear();
    g.fillGradientStyle(gold ? 0x2a0a10 : 0x0e0620, gold ? 0x2a0a10 : 0x0e0620, gold ? 0x6a1a1a : 0x2a1050, gold ? 0x6a1a1a : 0x2a1050, 1); g.fillRect(-400, -400, 1440, 1200);
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; g.fillStyle(i % 2 ? (gold ? 0x8a2a1a : 0x3a1a6a) : (gold ? 0x5a1a10 : 0x22104a), 0.7); g.fillTriangle(320, 200, 320 + Math.cos(a) * 900, 200 + Math.sin(a) * 900, 320 + Math.cos(a + 0.26) * 900, 200 + Math.sin(a + 0.26) * 900); }
  }
  /**
   * The signs hanging in the studio's back wall (the background layer): APPLAUSE / LAUGH / OOOH! (lit when the
   * audience is told to react) and ON AIR. Runs every frame (the bulbs chase).
   */
  drawSigns() {
    const g = this.signG, t = this.t, S = this.sign; g.clear();
    const lit = S && S.t < S.n && (S.t % 20 < 14), x = 130, y = 66, w = 150, h = 30;
    g.fillStyle(0x0a0614, 1); g.fillRoundedRect(x - w / 2 - 4, y - h / 2 - 4, w + 8, h + 8, 6);
    g.fillStyle(lit ? 0xd02a2a : 0x3a1010, 1); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 4);
    for (let i = 0; i < 18; i++) { const bx = x - w / 2 + 4 + i * (w - 8) / 17; for (const by of [y - h / 2 - 2, y + h / 2 + 2]) { g.fillStyle((i + (t >> 3)) % 3 === 0 ? 0xfff0a0 : 0x8a6a2a, 1); g.fillCircle(bx, by, 1.6); } }
    this.signT.setPosition(x, y).setText(S ? S.text : SIGNS.applause).setColor(lit ? '#fff4c0' : '#5a2a2a');
    const ax = 520, ay = 66, on = this.boss ? !this.boss.dying || this.boss.dying < 90 : true;
    g.fillStyle(0x0a0614, 1); g.fillRoundedRect(ax - 34, ay - 11, 68, 22, 4); g.fillStyle(on ? 0x5a0a0a : 0x1a0a0a, 1); g.fillRoundedRect(ax - 31, ay - 8, 62, 16, 3);
    this.airT.setPosition(ax, ay).setText(this.low ? 'LIVE!!' : 'ON AIR').setColor(on && (!this.low || t % 16 < 10) ? '#ff4a3a' : '#3a1a1a');
  }
  /**
   * The stage floor: glossy black boards with a row of light-up panels (chasing colours; red and gold for SWEEPS WEEK),
   * marquee bulbs along the front, the two floating contestant podiums (ledges), the trapdoors when PICK A DOOR is on.
   */
  drawArena(g) {
    const t = this.t, gold = this.gold, D = this.doors;
    g.clear();
    g.fillStyle(0x0a0614, 1); g.fillRect(-266, -2, 532, 46);
    g.fillStyle(0x1a1028, 1); g.fillRect(-260, 0, 520, 34);
    const cols = gold > 0.5 ? [0xff3a2a, 0xffd23a, 0xff8a2a] : [0xff3a8a, 0x3a8aff, 0xffd23a, 0x3ae07a];
    for (let i = 0; i < 13; i++) {
      const x = -260 + i * 40, c = cols[(i + Math.floor(t / (this.low ? 6 : 18))) % cols.length];
      let a = 0.55 + 0.35 * Math.sin(t * 0.08 + i);
      if (this.strobe && t % 8 < 4) a = 1;
      g.fillStyle(c, a * 0.5); g.fillRect(x + 3, 3, 34, 14); g.fillStyle(0xffffff, a * 0.25); g.fillRect(x + 5, 4, 30, 3);
    }
    g.fillStyle(0xffffff, 0.08); g.fillRect(-260, 0, 520, 2);
    for (let i = 0; i < 40; i++) { const on = (i + (t >> 2)) % 4 === 0; g.fillStyle(on ? 0xfff4c0 : 0x8a6a2a, 1); g.fillCircle(-252 + i * 13, 26, on ? 2.4 : 1.8); if (on) { g.fillStyle(0xfff0a0, 0.25); g.fillCircle(-252 + i * 13, 26, 5); } }
    if (D) {                                                                            // PICK A DOOR: three numbered doors in the floor
      DOORS.at.forEach(([x1, x2], i) => {
        const open = D.open && D.live.includes(i), tell = D.tell && D.live.includes(i) && t % 6 < 3;
        g.fillStyle(open ? 0x000000 : tell ? 0xff3a3a : 0x2a1a50, 1); g.fillRect(x1 + 4, -2, x2 - x1 - 8, 8);
        g.lineStyle(2, 0xffd23a, 1); g.strokeRect(x1 + 4, -2, x2 - x1 - 8, 8); g.lineStyle(0);
      });
    }
    // the podiums: gold-trimmed fronts with a name plate and a buzzer; the right one is the host's desk-star
    for (const [i, L] of [[0, this.platforms[1]], [1, this.platforms[2]]]) {
      if (!L) continue; const cx = (L.x1 + L.x2) / 2, w = L.x2 - L.x1;
      g.fillStyle(0x0a0614, 1); g.fillRect(L.x1 - 3, L.y - 3, w + 6, 16);
      g.fillStyle(i ? 0x3a8aff : 0xff3a8a, 1); g.fillRect(L.x1, L.y, w, 10); g.fillStyle(0xffffff, 0.3); g.fillRect(L.x1, L.y, w, 2);
      g.fillStyle(0xffd23a, 1); g.fillRect(L.x1, L.y + 10, w, 3);
      g.fillStyle(0x0a0614, 1); g.fillTriangle(cx - 22, L.y + 13, cx + 22, L.y + 13, cx, L.y + 40);
      g.fillStyle(i ? 0x2a6ad0 : 0xd02a6a, 1); g.fillTriangle(cx - 18, L.y + 13, cx + 18, L.y + 13, cx, L.y + 34);
      g.fillStyle(0xfff0a0, 0.6 + 0.4 * Math.sin(t * 0.1 + i * 3)); g.fillCircle(cx, L.y + 20, 3);
    }
  }
  /** The spotlight beams: two sweeping lamps from the rig (they cross on him), the SPOTLIGHT attack's beam, the strobe. */
  drawLights(g) {
    const t = this.t; g.clear();
    const at = this.boss && !this.boss.dying ? this.body().head : { x: Math.sin(t * 0.01) * 120, y: -100 };
    for (const sx of [-1, 1]) {
      const fx = sx * 300, fy = -440, tx = at.x + Math.sin(t * 0.017 + sx) * 40, w = 46;
      g.fillStyle(this.gold > 0.5 ? 0xffd23a : 0xd0c0ff, 0.06); g.fillTriangle(fx - 8, fy, fx + 8, fy, tx - w, 2); g.fillTriangle(fx - 4, fy, fx + 4, fy, tx + w, 2);
      g.fillStyle(0xffffff, 0.06); g.fillEllipse(tx, 0, w * 2, 10);
    }
    if (this.spot) { const S = this.spot; g.fillStyle(0xfff4c0, S.hold ? 0.22 : 0.13); g.fillTriangle(S.x - 10, -440, S.x + 10, -440, S.x - 38, 2); g.fillTriangle(S.x - 10, -440, S.x + 38, 2, S.x - 38, 2); g.fillStyle(0xfff4c0, 0.3); g.fillEllipse(S.x, 0, 80, 12); }
    if (this.strobe && t % 8 < 2) { g.fillStyle(0xffffff, 0.08); g.fillRect(-700, -700, 1400, 1000); }
  }
  /** THE BIG WHEEL: a gold rim with chasing bulbs, twelve coloured wedges with their labels, a ticker on top. */
  drawWheel(g) {
    const W = this.wheel, t = this.t, n = WHEEL.segs.length, cx = WHEEL.x, cy = WHEEL.y, r = WHEEL.r, step = Math.PI * 2 / n; g.clear();
    g.fillStyle(0x0a0614, 1); g.fillCircle(cx, cy, r + 14);
    g.fillStyle(0xb88a20, 1); g.fillCircle(cx, cy, r + 10); g.fillStyle(0xffd75a, 1); g.fillCircle(cx, cy, r + 6);
    WHEEL.segs.forEach((q, i) => {
      const a0 = W.a + i * step, a1 = a0 + step, pts = [{ x: cx, y: cy }];
      for (let k = 0; k <= 6; k++) { const a = lerp(a0, a1, k / 6); pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }); }
      const hot = W.glow > 0 && i === W.last && t % 10 < 6;
      g.fillStyle(hot ? 0xffffff : q[1], 1); g.fillPoints(pts, true);
      g.fillStyle(0xffffff, 0.18); g.fillTriangle(cx, cy, pts[1].x, pts[1].y, pts[2].x, pts[2].y);
      g.lineStyle(2, 0x0a0614, 1); g.lineBetween(cx, cy, pts[1].x, pts[1].y); g.lineStyle(0);
      const am = (a0 + a1) / 2, T = this.wheelT[i]; T.setPosition(cx + Math.cos(am) * r * 0.62, cy + Math.sin(am) * r * 0.62).setRotation(am + Math.PI);
    });
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, on = (i + (t >> (W.spinning ? 1 : 3))) % 3 === 0; g.fillStyle(on ? 0xffffff : 0xa08030, 1); g.fillCircle(cx + Math.cos(a) * (r + 8), cy + Math.sin(a) * (r + 8), on ? 2.6 : 2); }
    g.fillStyle(0x0a0614, 1); g.fillCircle(cx, cy, 20); g.fillStyle(0xffd75a, 1); g.fillCircle(cx, cy, 17); g.fillStyle(0xfff4c0, 1); g.fillCircle(cx - 5, cy - 5, 5);
    g.fillStyle(0x7a2ad0, 1); g.fillCircle(cx, cy, 9);
    const tick = W.spinning ? Math.sin(t * 1.3) * 0.2 : 0;                            // the ticker, flicking against the pegs
    g.fillStyle(0x0a0614, 1); g.fillTriangle(cx - 12, cy - r - 22, cx + 12, cy - r - 22, cx + Math.sin(tick) * 6, cy - r + 6);
    g.fillStyle(0xff2a4a, 1); g.fillTriangle(cx - 9, cy - r - 20, cx + 9, cy - r - 20, cx + Math.sin(tick) * 6, cy - r + 2);
    g.lineStyle(4, 0x3a3a4a, 1); g.lineBetween(cx, cy - r - 22, cx, -470); g.lineStyle(0);
  }

  // ------------------------------------------------------------------ MAX JACKPOT
  /** His hits (BossArena.bhit), all launching a bit harder than the numbers in the tables (`HIT`). */
  bhit(id, x1, y1, x2, y2, dmg, [angle, base, growth], more) { return super.bhit(id, x1, y1, x2, y2, dmg * HIT.dmg, [angle, base * HIT.base, growth * HIT.growth], more); }
  /** The boss's own state when the fight starts. */
  makeBoss() { this.cycle.gap = 1400; this.cycle.next = 1500; }
  /** The intro (and the UI layer the COMMERCIAL BREAK is drawn on). */
  startIntro(match) {
    super.startIntro(match);
    this.uiG = match.add.graphics().setDepth(39).setVisible(false);
    this.uiT = [0, 1, 2].map(() => match.add.text(VIEW_W / 2, 180, '', { fontFamily: FONT, fontSize: '12px', color: '#ffffff', stroke: '#07060e', strokeThickness: 4, align: 'center' }).setOrigin(0.5).setDepth(40).setVisible(false));
    match.addUI(this.uiG, ...this.uiT);
  }
  /**
   * His body's points this frame: feet, hips, shoulders, head, the mic hand (arm angle `ma`), the mic's head, the
   * cue-card hand (angle `ca`).
   */
  body() {
    const E = this.e, d = E.dir, c = E.crouch;
    const ft = { x: E.x, y: E.y - E.hop };
    const hip = { x: ft.x + d * E.lean * 6, y: ft.y - HOST.leg * (1 - c * 0.3) };
    const sh = { x: hip.x + d * (3 + E.lean * 14), y: hip.y - HOST.torso };
    const head = { x: sh.x + d * (5 + E.lean * 6), y: sh.y - HOST.head * 0.5 - 12 };
    const mx = Math.cos(E.ma) * d, my = Math.sin(E.ma);
    const hand = { x: sh.x + d * 8 + mx * HOST.arm, y: sh.y + 6 + my * HOST.arm };
    const mic = { x: hand.x + mx * 10 - d * 2, y: hand.y - 22 };
    const hand2 = { x: sh.x - d * 10 + Math.cos(E.ca) * d * HOST.arm * 0.85, y: sh.y + 8 + Math.sin(E.ca) * HOST.arm * 0.85 };
    return { ft, hip, sh, head, hand, mic, hand2 };
  }
  /** What the camera and the CPU aim at: his head. */
  core() { const b = this.body(); return { x: b.head.x, y: b.head.y }; }
  /** The camera keeps him and the stage in view, and pulls back to show the wheel while it spins. */
  camPoints() { const p = super.camPoints(); if (this.wheel.spinning || this.wheel.glow) p.push({ x: 0, y: WHEEL.y - WHEEL.r }); return p; }
  /** Where he can be hit: his head (x1.3; bald x2), his body (x0.7). None once the hook has him. */
  hurt() {
    const E = this.e; if (E.alpha < 0.5 || this.hook) return [];
    const b = this.body();
    return [{ x1: b.head.x - 24, y1: b.head.y - (E.bald ? 26 : 44), x2: b.head.x + 24, y2: b.head.y + 24, mult: E.bald ? SULK.bald : 1.3 },
      { x1: b.hip.x - 30, y1: b.sh.y - 4, x2: b.hip.x + 30, y2: Math.min(-2, b.ft.y), mult: 0.7 }];
  }
  /** What he does next: SPIN THE WHEEL every few attacks, otherwise his act; THE LIGHTNING ROUND throws rounds in directly. */
  pattern(phase) {
    const act = ['whip', 'cannons', 'spot', 'clap', 'grin'];
    if (this.low) return [...act, 'plinko', 'doors', 'car', 'buzzers'];
    const every = phase === 2 ? WHEEL.rage : WHEEL.every;
    if (this.count % every === every - 1) return ['spin'];
    return act;
  }
  rageLine() { return 'SWEEPS WEEK!'; }
  /**
   * Half health. With a player watching: THE COMMERCIAL BREAK cutscene (cutStep). Without (the sim): straight into
   * SWEEPS WEEK - the gold tux, the red and gold set, faster.
   */
  onRage(match) {
    this.clearArena();
    if (this.uiG) { const cam = match.worldCam || match.cameras.main; this.cut = { t: 0, n: BREAK.n, once: new Set() }; this.ccam = { x: cam.midPoint.x, y: cam.midPoint.y, zoom: cam.zoom }; this.rageText.setVisible(false); this.boss.rage = 0; return; }
    this.goGold();
  }
  /** SWEEPS WEEK: everything turns red and gold, and so does his tux. */
  goGold() { this.gold = 1; this.paintSky(); this.cue('applause', 90); sfx('airhorn', 0.5, 1.1); }
  /** Clears his rounds and attacks off the stage (before a cutscene or his death). */
  clearArena() { this.whip = null; this.shots = []; this.cannons = null; this.spot = null; this.waves = []; this.beam = null; this.plinko = null; this.chips = []; this.doors = null; this.car = null; this.buzz = null; this.e.bald = false; this.e.wig = null; }
  /** A hit lands on him: the audience gasps; now and then he complains about it. */
  onHurt(match, r, d) {
    if (d > 9) this.cue('gasp', 40);
    if (this.sayCD <= 0 || (this.say && this.say.t > 40)) { if (Math.random() < 0.3) this.talk(SAY.hurt[Math.floor(Math.random() * SAY.hurt.length)], 70); }
  }
  /** Says something into the mic (a speech bubble) for `life` frames. */
  talk(text, life = 100) { this.say = { text, t: 0, life }; this.sayCD = 240 + Math.random() * 200; }
  /** Lights an audience sign (LAUGH, APPLAUSE, OOOH!, AWWW...) for `n` frames; the audience reacts. */
  cue(kind, n = 70) {
    this.sign = { kind, text: SIGNS[kind], t: 0, n };
    if (kind === 'laugh') sfx('laugh', 0.35, 1.3); else if (kind === 'applause') sfx('taiko', 0.3, 2.2); else if (kind === 'gasp') sfx('whoosh', 0.3, 1.6);
  }
  /** His walk speed. */
  speed() { return this.boss && this.boss.phase === 2 ? HOST.fast : HOST.walk; }
  /** He glides toward x (clamped to his stretch of stage). Returns true once there. */
  walkTo(x, sp) { const E = this.e, dx = Phaser.Math.Clamp(x, -HOST.range, HOST.range) - E.x; if (Math.abs(dx) < 6) return true; E.dir = Math.sign(dx); E.x += Math.sign(dx) * Math.min(Math.abs(dx), sp); E.walk += sp * 0.07; return false; }
  /** Turns him to face the nearest player; returns that player. */
  faceNearest(match) { const E = this.e, tg = this.nearest(match, E.x); if (tg) E.dir = Math.sign(tg.x - E.x) || E.dir; return tg; }

  /** At rest: he sways to the band, twirls the mic, drifts after you, and works the crowd. */
  idle(match) {
    const E = this.e, tg = this.nearest(match, E.x);
    E.crouch *= 0.9; E.hop *= 0.8; E.lean *= 0.9;
    E.ma += ((-0.4 + Math.sin(this.t * 0.05) * 0.25) - E.ma) * 0.1; E.ca += ((1.2 + Math.sin(this.t * 0.06) * 0.15) - E.ca) * 0.1;
    if (tg && Math.abs(tg.x - E.x) > 140) this.walkTo(tg.x - Math.sign(tg.x - E.x) * 110, this.speed() * 0.7);
    else if (tg) E.dir = Math.sign(tg.x - E.x) || E.dir;
    if (this.sayCD <= 0 && !this.say) this.talk(SAY.idle[Math.floor(Math.random() * SAY.idle.length)]);
  }

  // ------------------------------------------------------------------ his act
  start_whip() { this.count++; } start_cannons() { this.count++; } start_spot() { this.count++; } start_clap() { this.count++; } start_grin() { this.count++; } start_spin() { this.count++; }
  /** MIC WHIP: he swings the mic round by its cord over his head, then cracks it out along the floor in front of him. */
  atk_whip(match, a, out) {
    const E = this.e, w = this.sp(WHIP.wind);
    if (a.t === 1) { this.faceNearest(match); a.sid = this.sid('whip'); }
    const b = this.body();
    if (a.t <= w) { E.ma = -1.6; E.lean = -0.3; this.whip = { k: 0, spin: a.t * 0.5, x: b.hand.x, y: b.hand.y }; if (a.t % 8 === 0) sfx('swing', 0.4, 1.4); return false; }
    const k = (a.t - w) / WHIP.crack;
    if (k <= 1) {
      E.ma = lerp(-1.6, 0.5, k); E.lean = 0.5; this.whip = { k: easeOut(k), x: b.hand.x, y: b.hand.y };
      if (a.t === w + 1) sfx('whoosh', 0.8, 1.2);
      const pts = this.whipPoints(); for (const p of pts.slice(3)) out.push(this.bhit(a.sid, p.x - 16, p.y - 16, p.x + 16, p.y + 16, ...WHIP.hit, { dirX: E.dir }));
      if (Math.abs(k - 1) < 1 / WHIP.crack) { sfx('slash', 0.8, 1.6); const p = pts[pts.length - 1]; match.puff(p.x, p.y, 0xffffff, 6); }
      return false;
    }
    E.lean *= 0.85; this.whip = k < 3 ? { k: 1 - (k - 1) / 2, x: b.hand.x, y: b.hand.y } : null;
    return k > 3;
  }
  /** Where the whipped cord runs this frame: from his hand out in front, curving down to the mic's head. */
  whipPoints() {
    const W = this.whip, d = this.e.dir, pts = [];
    if (W.spin != null) { for (let i = 0; i <= 8; i++) { const a = W.spin + i * 0.2; pts.push({ x: W.x + Math.cos(a) * i * 6, y: W.y - 30 + Math.sin(a) * i * 3 }); } return pts; }
    for (let i = 0; i <= 10; i++) { const s = i / 10, R = WHIP.reach * W.k; pts.push({ x: W.x + d * s * R, y: W.y + (-6 - W.y) * Math.pow(s, 1.6) - Math.sin(s * Math.PI) * 30 * W.k }); }
    return pts;
  }
  /** CONFETTI CANNONS: cannons roll out at both wings and swing to aim at you, then fire bursts of confetti across the stage. */
  atk_cannons(match, a) {
    const ev = this.sp(CANNON.every), aim = this.sp(CANNON.aim);
    if (a.t === 1) { this.cannons = { k: 0, list: [-1, 1].map((s) => ({ x: s * 285, y: -30, ang: s < 0 ? -0.4 : Math.PI + 0.4 })) }; this.talk('CONFETTI!!', 60); sfx('clang', 0.5, 0.7); }
    const C = this.cannons; if (!C) return true;
    C.k = Math.min(1, a.t / 20);
    for (const K of C.list) { const tg = this.nearest(match, K.x); if (tg && a.t < aim) { const want = Math.atan2(tg.y - 24 - K.y, tg.x - K.x); K.ang += (want - K.ang) * 0.12; } }
    const f = a.t - aim;
    if (f > 0 && f % ev === 0 && f / ev <= CANNON.n) {
      for (const K of C.list) { const id = this.sid('confetti'); this.shots.push({ x: K.x + Math.cos(K.ang) * 26, y: K.y + Math.sin(K.ang) * 26, vx: Math.cos(K.ang) * CANNON.speed, vy: Math.sin(K.ang) * CANNON.speed, id, life: 90, c: [0xff3a8a, 0x3a8aff, 0xffd23a, 0x3ae07a][(f / ev) % 4] }); }
      sfx('bighit', 0.4, 1.5); match.shake(3, 4);
    }
    if (f > CANNON.n * ev + 30) { this.cannons = null; return true; }
    return false;
  }
  /** The confetti shots: a tumbling burst that sheds paper, hurting where it flies. */
  stepShots(match, out) {
    for (const S of this.shots) {
      S.x += S.vx; S.y += S.vy; S.vy += 0.04; S.life--;
      out.push(this.bhit(S.id, S.x - 14, S.y - 14, S.x + 14, S.y + 14, ...CANNON.hit, { dirX: Math.sign(S.vx) || 1 }));
      if (S.life % 3 === 0) this.confetti.push({ x: S.x, y: S.y, vx: (Math.random() - 0.5) * 2, vy: Math.random() * -1, a: Math.random() * 6, c: [0xff3a8a, 0x3a8aff, 0xffd23a, 0x3ae07a, 0xffffff][Math.floor(Math.random() * 5)], life: 60 });
      if (S.life <= 0 || S.y > 10 || Math.abs(S.x) > 330) S.dead = true;
    }
    this.shots = this.shots.filter((S) => !S.dead);
  }
  /** SPOTLIGHT: a spotlight finds you and follows you round the stage, stops, and the lamp itself drops out of the rig onto that spot. */
  atk_spot(match, a, out) {
    const E = this.e, fol = this.sp(SPOT.follow), hold = this.sp(SPOT.hold);
    if (a.t === 1) { const tg = this.faceNearest(match); this.spot = { x: tg ? tg.x : 0, hold: false, y: null, id: this.sid('lamp') }; this.talk('LET\'S GET A LIGHT ON OUR CONTESTANT!', 90); sfx('clang', 0.6, 1.8); }
    const S = this.spot; if (!S) return true;
    E.ca = -1.2; E.ma = -0.2;
    if (a.t < fol) { const tg = this.nearest(match, S.x); if (tg) S.x += Phaser.Math.Clamp(tg.x - S.x, -3.2, 3.2); S.x = Phaser.Math.Clamp(S.x, -250, 250); return false; }
    if (a.t < fol + hold) { S.hold = true; if (a.t === fol) sfx('warn', 0.5, 1.5); return false; }
    S.y = S.y == null ? -440 : S.y + SPOT.fall;
    out.push(this.bhit(S.id, S.x - 26, S.y - 30, S.x + 26, S.y + 10, ...SPOT.hit));
    if (S.y >= -12) { sfx('glass', 0.8, 0.8); sfx('bighit', 0.6, 1); match.shake(6, 8); for (let i = 0; i < 14; i++) match.particles.push({ x: S.x, y: -10, vx: (Math.random() - 0.5) * 7, vy: -Math.random() * 5, life: 26, color: i % 2 ? 0xfff4c0 : 0xc0c8d8, size: 2, grav: 0.25 }); this.spot = null; return true; }
    return false;
  }
  /** APPLAUSE: he throws his arms up to the crowd, the sign lights, and their roar rolls along the floor from both wings - jump it. */
  atk_clap(match, a) {
    const E = this.e, w = this.sp(CLAP.wind), n = CLAP.n[this.boss.phase - 1];
    if (a.t === 1) { this.talk('LET\'S HEAR IT FOR OUR CONTESTANT!', 80); this.cue('applause', w + n * CLAP.every + 40); }
    E.ma = -1.9; E.ca = -1.9; E.hop = Math.abs(Math.sin(a.t * 0.2)) * 4;
    const f = a.t - w;
    if (f >= 0 && f % this.sp(CLAP.every) === 0 && f / this.sp(CLAP.every) < n) { for (const s of [-1, 1]) this.waves.push({ x: s * 270, dir: -s, id: this.sid('clap') }); sfx('taiko', 0.6, 0.8); sfx('whoosh', 0.6, 0.6); }
    return f > n * this.sp(CLAP.every) + 60;
  }
  /** The applause waves: walls of sound rolling along the floor to the far side. */
  stepWaves(match, out) {
    for (const W of this.waves) { W.x += W.dir * CLAP.speed; out.push(this.bhit(W.id, W.x - 14, -CLAP.h, W.x + 14, 0, ...CLAP.hit, { dirX: W.dir })); if (Math.abs(W.x) > 300) W.dead = true; }
    this.waves = this.waves.filter((W) => !W.dead);
  }
  /** THE GRIN: he turns to camera and smiles - his teeth gather a sparkle, then flash a beam the whole width of the stage at head height. Stay low. */
  atk_grin(match, a, out) {
    const E = this.e, ch = this.sp(GRIN.charge);
    if (a.t === 1) { this.faceNearest(match); this.talk('SAY CHEESE!', 60); }
    const b = this.body(); E.grin = Math.min(1, a.t / ch);
    if (a.t < ch) { E.ma = -0.9; E.lean = -0.15; if (a.t % 10 === 0) sfx('ding', 0.3, 1.6 + a.t / ch); this.beam = { x: b.head.x, y: b.head.y + 10, warn: a.t / ch, dir: E.dir }; return false; }
    if (a.t === ch) { sfx('shing', 1, 1.4); sfx('laser', 0.6, 1.2); match.shake(4, 10); this.beam.id = this.sid('grin'); }
    const B = this.beam; B.warn = null; B.y = b.head.y + 10;
    const x2 = B.x + B.dir * 560; out.push(this.bhit(B.id, Math.min(B.x, x2), B.y - GRIN.half, Math.max(B.x, x2), B.y + GRIN.half, ...GRIN.hit, { dirX: B.dir }));
    if (a.t > ch + GRIN.fire) { this.beam = null; E.grin = 0; return true; }
    return false;
  }

  // ------------------------------------------------------------------ the wheel and its rounds
  /** SPIN THE WHEEL: he grabs a peg and hurls the wheel round; it clicks down to a stop on the next ROUND, which starts right away. */
  atk_spin(match, a) {
    const E = this.e, W = this.wheel, n = WHEEL.segs.length, step = Math.PI * 2 / n, dur = this.sp(WHEEL.spin);
    if (a.t === 1) {
      const i = Math.floor(Math.random() * n);
      W.from = W.a; W.to = W.a - ((W.a + (i + 0.5) * step + Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI * 2 * 3; W.pick = i; W.spinning = true; W.glow = 0;
      this.talk(SAY.spin[Math.floor(Math.random() * SAY.spin.length)], 80); sfx('whoosh', 0.8, 0.8);
    }
    E.ma = -2.2 + Math.sin(a.t * 0.1) * 0.2; E.dir = E.x > 0 ? -1 : 1; E.lean = -0.2;
    const k = Math.min(1, a.t / dur), prev = W.a; W.a = lerp(W.from, W.to, easeOut(k));
    if (Math.floor(prev / step) !== Math.floor(W.a / step)) sfx('clocktick', 0.5, 1.6);
    if (k < 1) return false;
    W.spinning = false; W.last = W.pick; W.glow = 90;
    const round = WHEEL.segs[W.pick][0];
    sfx('ding', 0.8, 1); this.talk(SAY.rounds[round], 100);
    if (round === 'prize' || round === 'plinko' || round === 'car') this.cue(round === 'prize' ? 'gasp' : 'applause', 60);
    const B = this.boss; B.atk = { name: round, t: 0, id: ++B.uid }; if (this['start_' + round]) this['start_' + round](match, B.atk);
    return false;
  }
  /** PLINKO: a giant peg board lowers from the rig; chips drop from the top and bounce down through the pegs onto the stage. */
  atk_plinko(match, a, out) {
    const n = PLINKO.n[this.boss.phase - 1], ev = this.sp(PLINKO.every);
    if (a.t === 1) this.plinko = { y: -560 };
    const P = this.plinko; if (!P) return true;
    P.y = a.t <= PLINKO.drop ? lerp(-560, -330, easeOut(a.t / PLINKO.drop)) : P.y;
    if (a.t === PLINKO.drop) { sfx('clang', 0.8, 0.6); match.shake(4, 6); }
    const f = a.t - PLINKO.drop;
    if (f > 0 && f % ev === 0 && f / ev <= n) { const tg = this.nearest(match, 0); this.chips.push({ x: Phaser.Math.Clamp((tg ? tg.x : 0) + (Math.random() - 0.5) * 160, -220, 220), y: P.y + 10, vx: 0, vy: 0, id: this.sid('chip'), row: 0, a: 0 }); sfx('swing', 0.4, 2); }
    if (f > n * ev && !this.chips.length) { if (P.y > -560) { P.y -= 8; return false; } this.plinko = null; return true; }
    return false;
  }
  /** The plinko chips: falling, knocked left or right by each row of pegs, a bounce when they hit the stage, then they roll off. */
  stepChips(match, out) {
    const P = this.plinko;
    for (const C of this.chips) {
      C.vy = Math.min(C.vy + 0.32, 7); C.x += C.vx; C.y += C.vy; C.a += C.vx * 0.08; C.vx *= 0.98;
      const row = P ? Math.floor((C.y - P.y) / 34) : 99;
      if (P && row > C.row && row <= 6) { C.row = row; C.vx = (Math.random() < 0.5 ? -1 : 1) * (1.4 + Math.random()); C.vy *= 0.4; sfx('clocktick', 0.3, 2.2 + Math.random() * 0.4); }
      if (C.y >= -PLINKO.r && !C.landed) { C.landed = true; C.y = -PLINKO.r; C.vy = -4; C.vx = (C.vx || 1) * 2.2; sfx('bighit', 0.4, 1.6); match.shake(2, 3); }
      if (C.landed && C.y > -PLINKO.r) { C.y = -PLINKO.r; C.vy = Math.abs(C.vy) > 1 ? -Math.abs(C.vy) * 0.4 : 0; }
      out.push(this.bhit(C.id, C.x - PLINKO.r, C.y - PLINKO.r, C.x + PLINKO.r, C.y + PLINKO.r, ...PLINKO.hit, { dirX: Math.sign(C.vx) || 1 }));
      if (Math.abs(C.x) > 300) C.dead = true;
    }
    this.chips = this.chips.filter((C) => !C.dead);
  }
  /** PICK A DOOR: the floor splits into three numbered doors. He counts down; the two losing doors flash just before they spring open (a launch straight up). */
  atk_doors(match, a, out) {
    const E = this.e, wait = this.sp(DOORS.wait);
    if (a.t === 1) { const safe = Math.floor(Math.random() * 3); this.doors = { live: [0, 1, 2].filter((i) => i !== safe), open: false, tell: false, id: this.sid('door') }; }
    const D = this.doors; if (!D) return true;
    E.ca = -1.4; E.ma = -0.6;
    if (a.t % 30 === 0 && a.t < wait) { this.talk(['THREE!', 'TWO!', 'ONE!'][Math.min(2, a.t / 30 - 1)], 26); sfx('menu', 0.6, 1.2); }
    D.tell = a.t > wait - this.sp(DOORS.tell) && a.t < wait;
    if (a.t === wait) { D.open = true; sfx('bighit', 0.8, 0.9); sfx('clang', 0.7, 1.4); match.shake(6, 8); this.talk('BEHIND DOOR NUMBER ' + (D.live.map((i) => i + 1).join(' AND ')) + '...', 80); }
    if (D.open && a.t < wait + DOORS.out) for (const i of D.live) { const [x1, x2] = DOORS.at[i]; out.push(this.bhit(D.id, x1 + 4, -60, x2 - 4, 4, ...DOORS.hit)); }
    if (a.t > wait + DOORS.out + 40) { this.doors = null; return true; }
    return false;
  }
  /** A BRAND NEW CAR!!: headlights glare from a wing, a horn, then a convertible tears across the stage (again from the other side, enraged). Jump it. */
  atk_car(match, a, out) {
    const passes = CAR.passes[this.boss.phase - 1], warn = this.sp(CAR.warn);
    if (a.t === 1) { this.car = { pass: 0, s: Math.random() < 0.5 ? -1 : 1, x: null, id: this.sid('car') }; this.e.ma = -1.8; }
    const C = this.car; if (!C) return true;
    if (C.x == null) { if (a.t % warn === Math.floor(warn * 0.3)) sfx('airhorn', 0.4, 1.6); if (a.t % warn === 0) { C.x = C.s * 380; C.id = this.sid('car'); sfx('rumble', 0.7, 1.4); } return false; }
    C.x -= C.s * CAR.speed;
    out.push(this.bhit(C.id, C.x - CAR.w / 2, -CAR.h, C.x + CAR.w / 2, 0, ...CAR.hit, { dirX: -C.s }));
    if (a.t % 4 === 0) match.particles.push({ x: C.x + C.s * CAR.w / 2, y: -6, vx: C.s * 2, vy: -0.5, life: 22, color: 0x8a8a9a, size: 4, grav: -0.02, drag: 0.95 });
    if (Math.abs(C.x) > 400) { C.pass++; if (C.pass >= passes) { this.car = null; return true; } C.s = -C.s; C.x = null; }
    return false;
  }
  /** BUZZERS: four buzzer pads in the floor; some light up - BZZT! - then pillars of electricity rise off them. */
  atk_buzzers(match, a, out) {
    const n = BUZZ.live[this.boss.phase - 1], warn = this.sp(BUZZ.warn);
    if (a.t === 1) { const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5); this.buzz = { live: order.slice(0, n), zap: false, id: this.sid('buzz') }; sfx('buzz', 0.6, 1); }
    const Z = this.buzz; if (!Z) return true;
    this.e.ma = -1.1 + Math.sin(a.t * 0.4) * 0.3;
    if (a.t === warn) { Z.zap = true; sfx('thunder', 0.6, 1.6); sfx('buzz', 1, 0.7); match.shake(5, 10); }
    if (Z.zap) for (const i of Z.live) { const x = BUZZ.pads[i]; out.push(this.bhit(Z.id, x - 26, -300, x + 26, 0, ...BUZZ.hit)); }
    if (a.t > warn + BUZZ.zap) { this.buzz = null; return true; }
    return false;
  }
  /** PRIZE: a golden ticket floats down over the stage - whoever grabs it gets patched up. He hates it. */
  atk_prize(match, a) {
    if (a.t === 1) this.ticket = { x: Phaser.Math.Clamp((Math.random() - 0.5) * 360, -220, 220), y: -300, life: PRIZE.life };
    this.e.ca = 1.6; this.e.ma = 0.4;
    return a.t > 80;
  }
  /** The golden ticket: drifts down, waits, and is taken by the first player to touch it. */
  stepTicket(match) {
    const T = this.ticket; if (!T) return;
    if (T.y < -30) T.y += 1.2; T.life--;
    for (const f of match.fighters) {
      if (!f.alive || f.state === 'respawn' || Math.abs(f.x - T.x) > 22 || Math.abs((f.y - 24) - T.y) > 34) continue;
      f.percent = Math.max(0, f.percent - PRIZE.heal); this.ticket = null; sfx('item', 0.8, 1); sfx('ding', 0.8, 1.6); this.cue('applause', 50);
      for (let i = 0; i < 16; i++) match.particles.push({ x: T.x, y: T.y, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 4, life: 30, color: i % 2 ? 0xffd23a : 0xffffff, size: 2, grav: 0.1 });
      return;
    }
    if (T.life <= 0) this.ticket = null;
  }
  /** LOSE A TURN: he folds his arms and taps his foot, glaring at the wheel - free hits. */
  atk_lose(match, a) { const E = this.e; E.ma = 1.4; E.ca = 1.6; E.lean = -0.1; E.hop = a.t % 20 < 4 ? 2 : 0; if (a.t === 40) sfx('curse', 0.4, 1.4); return a.t > SULK.lose; }
  /** BANKRUPT: his toupee flies off his head; he scrabbles after it, clutching his bald head (it takes x2) - then slaps it back on. */
  atk_bankrupt(match, a) {
    const E = this.e;
    if (a.t === 1) { E.bald = true; E.wig = { x: this.body().head.x, y: this.body().head.y - 30, vx: -E.dir * 3, vy: -6 }; sfx('whoosh', 0.8, 1.6); this.cue('laugh', 90); }
    const Wg = E.wig;
    if (Wg && !Wg.down) { Wg.vy += 0.35; Wg.x += Wg.vx; Wg.y += Wg.vy; if (Wg.y >= -6) { Wg.y = -6; Wg.down = true; } }
    E.ma = -1.9; E.ca = -1.9; E.crouch = 0.25;
    if (Wg && Wg.down && a.t > 60) { this.walkTo(Wg.x, this.speed()); }
    if (a.t > SULK.bankrupt) { E.bald = false; E.wig = null; E.crouch = 0; sfx('ding', 0.5, 1.2); this.talk('...AND WE\'RE FINE! WE\'RE FINE!', 70); return true; }
    return false;
  }

  /** THE LIGHTNING ROUND: strobing lights, a clock on the wheel, rounds without waiting for the wheel. */
  startLow(match) { this.low = true; this.strobe = 1; this.talk(SAY.low, 110); this.rageText.setText('LIGHTNING ROUND!'); this.boss.rage = 100; sfx('airhorn', 0.7, 1); sfx('thunder', 0.5, 1.2); match.shake(8, 20); }

  /** You lost: he bows to the crowd and blows kisses, the APPLAUSE sign flashing (BossArena.bossTaunt). */
  onGloat(match, t) { const E = this.e; E.lean = Math.min(0.6, t * 0.02); E.ma = -1.8; E.ca = -1.6 + Math.sin(t * 0.2) * 0.4; if (t === 1) { this.talk(SAY.gloat, 400); this.cue('applause', 400); } if (t % 40 === 0) for (let i = 0; i < 12; i++) this.confetti.push({ x: (Math.random() - 0.5) * 500, y: -380, vx: (Math.random() - 0.5), vy: 1 + Math.random(), a: Math.random() * 6, c: [0xff3a8a, 0x3a8aff, 0xffd23a, 0x3ae07a][i % 4], life: 200 }); }

  // ------------------------------------------------------------------ THE COMMERCIAL BREAK (cutscene)
  /** The cutscene camera (MatchScene asks introCam): eased toward `cut.shot`. */
  introCam() {
    if (!this.cut) return super.introCam();
    const w = this.cut.shot || { x: 0, y: -120, zoom: 1 }; this.ccam = { x: lerp(this.ccam.x, w.x, 0.08), y: lerp(this.ccam.y, w.y, 0.08), zoom: lerp(this.ccam.zoom, w.zoom, 0.08) };
    return { ...this.ccam, exact: true };
  }
  /** A fresh press skips the ad. */
  skipCut(match) { this.cut.t = Math.max(this.cut.t, BREAK.back); this.cutStep(match); }
  /**
   * THE COMMERCIAL BREAK (half health): he straightens his tie to camera - WE'LL BE RIGHT BACK! - and the picture cuts
   * to colour bars with a test tone, then an ad: JACKPOT HAIR GEL, FOR HAIR THAT NEVER MOVES (his own face, grinning,
   * a jingle). AND WE'RE BACK! - the set is red and gold, and he's in a gold tux: SWEEPS WEEK.
   */
  cutStep(match) {
    const C = this.cut, t = ++C.t, E = this.e, g = this.uiG; this.t++;
    const once = (k, at) => t >= at && !C.once.has(k) && !!C.once.add(k);
    const b = this.body();
    C.shot = { x: b.head.x - E.dir * 20, y: b.head.y - 30, zoom: 1.45 };
    if (once('line', 1)) { this.talk(SAY.rage, BREAK.ad); sfx('ding', 0.6, 1.4); }
    E.ma = -0.9; E.ca = -0.4; E.lean = 0.1;
    if (this.say) this.say.t++;
    g.clear(); this.uiT.forEach((o) => o.setVisible(false)); g.setVisible(t >= BREAK.ad && t < BREAK.back);
    if (t >= BREAK.ad && t < BREAK.back) {
      const f = t - BREAK.ad;
      if (f < 50) {                                                                       // colour bars and a test tone
        if (once('tone', BREAK.ad)) { sfx('buzz', 0.5, 2); sfx('glitch', 0.6, 1); }
        const bars = [0xc0c0c0, 0xc0c000, 0x00c0c0, 0x00c000, 0xc000c0, 0xc00000, 0x0000c0];
        bars.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(i * VIEW_W / 7, 0, VIEW_W / 7 + 1, 250); });
        g.fillStyle(0x101010, 1); g.fillRect(0, 250, VIEW_W, 110); for (let i = 0; i < 6; i++) { g.fillStyle([0x0a2a6a, 0xffffff, 0x3a0a6a, 0x101010, 0x000000, 0x202020][i], 1); g.fillRect(i * VIEW_W / 6, 270, VIEW_W / 6 + 1, 90); }
        this.uiT[0].setText('PLEASE STAND BY').setPosition(VIEW_W / 2, 130).setFontSize(18).setVisible(true);
      } else {                                                                            // the ad: JACKPOT HAIR GEL
        if (once('jingle', BREAK.ad + 50)) { sfx('airhorn', 0.4, 1.4); sfx('ding', 0.6, 1); }
        if (f % 24 === 0) sfx('ding', 0.3, 1.2 + (f % 72) / 72);
        g.fillGradientStyle(0xff3a8a, 0xffd23a, 0x7a2ad0, 0x3a8aff, 1); g.fillRect(0, 0, VIEW_W, 360);
        for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2 + f * 0.01; g.fillStyle(0xffffff, 0.12); g.fillTriangle(200, 180, 200 + Math.cos(a) * 600, 180 + Math.sin(a) * 600, 200 + Math.cos(a + 0.17) * 600, 180 + Math.sin(a + 0.17) * 600); }
        this.drawAdFace(g, 200, 190, 1 + Math.sin(f * 0.1) * 0.03);
        const jar = { x: 450, y: 210 }; g.fillStyle(0x0a0614, 1); g.fillRoundedRect(jar.x - 44, jar.y - 64, 88, 118, 10); g.fillStyle(0x3ae0d0, 1); g.fillRoundedRect(jar.x - 40, jar.y - 50, 80, 100, 8); g.fillStyle(0xffd23a, 1); g.fillRect(jar.x - 44, jar.y - 70, 88, 20); g.fillStyle(0xffffff, 0.5); g.fillRect(jar.x - 30, jar.y - 40, 8, 70);
        this.uiT[0].setText('JACKPOT\nHAIR GEL').setPosition(jar.x, jar.y + 4).setFontSize(9).setVisible(true);
        this.uiT[1].setText('FOR HAIR THAT NEVER MOVES.').setPosition(VIEW_W / 2, 50).setFontSize(13).setVisible(f > 70);
        this.uiT[2].setText('ASK FOR IT BY NAME!').setPosition(VIEW_W / 2, 320).setFontSize(10).setVisible(f > 120);
        if (t % 40 < 3) { const sx = 200 + 28, sy = 190 + 30; g.fillStyle(0xffffff, 1); g.fillTriangle(sx - 14, sy, sx + 14, sy, sx, sy - 3); g.fillTriangle(sx, sy - 14, sx, sy + 14, sx + 3, sy); }
      }
    }
    if (once('back', BREAK.back)) { this.goGold(); this.talk('AND WE\'RE BACK!!', 80); sfx('bighit', 0.6, 1.2); match.shake(6, 12); for (let i = 0; i < 40; i++) this.confetti.push({ x: (Math.random() - 0.5) * 500, y: -380 - Math.random() * 100, vx: (Math.random() - 0.5), vy: 1 + Math.random(), a: Math.random() * 6, c: [0xff3a2a, 0xffd23a, 0xffffff][i % 3], life: 260 }); }
    if (t > BREAK.back) { E.ma = -1.9; E.ca = -1.9; E.hop = Math.abs(Math.sin(t * 0.2)) * 6; C.shot = { x: E.x, y: -140, zoom: 1.1 }; }
    if (t >= C.n) { this.cut = null; g.setVisible(false); this.uiT.forEach((o) => o.setVisible(false)); this.rageText.setText('SWEEPS WEEK!').setVisible(true); this.boss.rage = 90; this.boss.wait = 30; }
  }
  /** His face as it appears in the hair-gel ad: big, grinning, with a perfect, shining pompadour (the cutscene's UI layer). */
  drawAdFace(g, x, y, s) {
    g.fillStyle(0x0a0614, 1); g.fillEllipse(x, y, 132 * s, 168 * s);
    g.fillStyle(LOOK.skin, 1); g.fillEllipse(x, y, 124 * s, 160 * s);
    g.fillStyle(0x0a0614, 1); g.fillEllipse(x - 4 * s, y - 92 * s, 150 * s, 82 * s); g.fillStyle(LOOK.hair, 1); g.fillEllipse(x - 4 * s, y - 92 * s, 142 * s, 74 * s);
    for (let i = 0; i < 3; i++) { g.lineStyle(4 * s, 0x6a6aa0, 0.8); g.beginPath(); g.arc(x - 20 * s + i * 14 * s, y - 100 * s, 30 * s - i * 6 * s, Math.PI * 1.1, Math.PI * 1.7); g.strokePath(); }
    g.lineStyle(0); g.fillStyle(0xffffff, 1); g.fillRect(x - 46 * s, y + 18 * s, 92 * s, 30 * s);
    g.lineStyle(2, 0xc0b0a0, 1); for (let i = 1; i < 7; i++) g.lineBetween(x - 46 * s + i * 13 * s, y + 18 * s, x - 46 * s + i * 13 * s, y + 48 * s); g.lineBetween(x - 46 * s, y + 33 * s, x + 46 * s, y + 33 * s); g.lineStyle(0);
    g.fillStyle(0x0a0614, 1); g.fillEllipse(x - 24 * s, y - 20 * s, 18 * s, 22 * s); g.fillEllipse(x + 24 * s, y - 20 * s, 18 * s, 22 * s);
    g.fillStyle(0xffffff, 1); g.fillCircle(x - 21 * s, y - 24 * s, 4 * s); g.fillCircle(x + 27 * s, y - 24 * s, 4 * s);
    g.fillStyle(0x3a2010, 1); g.fillRect(x - 36 * s, y - 42 * s, 26 * s, 6 * s); g.fillRect(x + 10 * s, y - 42 * s, 26 * s, 6 * s); g.fillRect(x - 30 * s, y + 8 * s, 60 * s, 5 * s);
  }

  // ------------------------------------------------------------------ the death: the show is cancelled
  /** Health gone: everything stops; the hook is readied (BossArena runs the rest - the match ends in a win). */
  onDeath() { this.clearArena(); this.ticket = null; this.strobe = 0; this.hook = { x: -560, got: false }; this.talk(SAY.death, 160); }
  /**
   * The death: the ON AIR sign dies; a giant vaudeville cane hook slides in from the wing, catches him round the neck
   * and yanks him off stage, kicking and protesting - confetti and glitter bursting off him as he goes.
   */
  stepDeath(match) {
    const B = this.boss, E = this.e, H = this.hook, b = this.body(); if (!H) return;
    const wantX = b.head.x - 30;
    if (B.dying < 45) { H.x = lerp(H.x, wantX - 40, 0.12); E.lean = -0.3; E.ma = -1.9; E.ca = -1.4; }
    else { if (!H.got) { H.got = true; sfx('clang', 0.9, 0.7); sfx('scream', 0.4, 1.5); this.cue('laugh', 90); } H.x = lerp(H.x, -700, 0.04 + B.dying * 0.0003); E.x = H.x + 70; E.hop = Math.sin(B.dying * 0.4) * 6 + 10; E.ma = -2 + Math.sin(B.dying * 0.5); E.ca = -2 + Math.cos(B.dying * 0.5); E.dir = 1; }
    if (B.dying % 6 === 0) for (let i = 0; i < 6; i++) this.confetti.push({ x: b.hip.x + (Math.random() - 0.5) * 60, y: b.sh.y, vx: (Math.random() - 0.5) * 5, vy: -2 - Math.random() * 3, a: Math.random() * 6, c: [0xff3a8a, 0x3a8aff, 0xffd23a, 0x3ae07a, 0xffffff][i % 5], life: 90 });
    if (B.dying % 12 === 0) sfx('ding', 0.25, 1 + Math.random());
  }

  // ------------------------------------------------------------------ the entrance
  /**
   * THE ENTRANCE (k = 0..1): a dark studio. ON AIR lights up; spotlights snap on one by one and sweep the stage,
   * crossing in the middle; a drumroll; a trapdoor in the floor and he rises up out of it on a lift in a cloud of
   * smoke between fountains of sparks, arms wide; he glides forward, twirls the mic, and his grin goes TING!
   */
  introPose(match, k, t, n) {
    this.t++;
    const E = this.e, e = (a, b) => Phaser.Math.Clamp((k - a) / (b - a), 0, 1);
    this.lightsK = e(0.05, 0.3);
    const rise = e(0.4, 0.66);
    E.x = lerp(0, 70, e(0.7, 0.84)); E.dir = -1; E.y = lerp(240, 0, easeOut(rise)); E.alpha = rise > 0 ? 1 : 0;
    E.ma = k < 0.84 ? -2 : lerp(-2 - Math.PI * 2, -0.5, e(0.84, 0.93)); E.ca = k < 0.7 ? -2 : lerp(-2, 1.2, e(0.7, 0.8)); E.grin = e(0.92, 0.97);
    if (t === Math.round(0.05 * n)) { sfx('buzz', 0.6, 1.5); sfx('clang', 0.5, 1.6); }
    if (t > 0.3 * n && t < 0.42 * n && t % 3 === 0) sfx('taiko', 0.25, 2.4 + Math.random() * 0.2);
    if (t === Math.round(0.4 * n)) { sfx('bighit', 0.8, 0.8); sfx('airhorn', 0.5, 1.2); this.cue('applause', 200); match.shake(5, 10); }
    if (rise > 0 && rise < 1 && t % 2 === 0) for (const s of [-1, 1]) match.particles.push({ x: s * 60, y: -2, vx: s * (Math.random() * 1.5), vy: -4 - Math.random() * 4, life: 30, color: Math.random() < 0.5 ? 0xffd23a : 0xffffff, size: 2, grav: 0.18 });
    if (rise > 0 && rise < 1 && t % 3 === 0) match.particles.push({ x: (Math.random() - 0.5) * 80, y: -6, vx: (Math.random() - 0.5) * 2, vy: -0.6, life: 50, color: 0xd0c8e0, size: 6, grav: -0.01, drag: 0.97 });
    if (t === Math.round(0.95 * n)) { sfx('shing', 1, 1.5); this.talk(SAY.intro, 140); }
    if (this.say) this.say.t++;
    if (this.sign) this.sign.t++;
  }
  /** The entrance's camera: wide on the dark stage, up to the wheel as the lights come on, close as he rises, then on his grin. */
  introShot(k) { const c = this.core(); return k < 0.3 ? { x: 0, y: -170, zoom: 0.85 } : k < 0.66 ? { x: 0, y: -90, zoom: 1.15 } : { x: c.x - 20, y: c.y + 40, zoom: 1.35 }; }
  /** The freeze frame: him, mid-grin. */
  introAt() { const c = this.core(); return { x: c.x - 40, y: c.y + 50, zoom: 1.2 }; }
  /** After the intro: lights on, he's on the stage. */
  endIntro() { super.endIntro(); this.lightsK = 1; this.e.y = 0; this.e.alpha = 1; this.e.grin = 0; }

  // ------------------------------------------------------------------ hazards (VS too)
  start_lamp(match, h) { h.title = 'STAGE LAMP!'; const tg = this.nearest(match); h.x = Phaser.Math.Clamp(tg ? tg.x : 0, -240, 240); }
  /** STAGE LAMP: a lamp in the rig shakes loose over a lit mark, then drops. */
  step_lamp(match, h, out) {
    if (h.t < LAMP.warn) { this.lamp = { x: h.x, k: h.t / LAMP.warn }; return false; }
    const y = -440 + (h.t - LAMP.warn) * 15; this.lamp = { x: h.x, y };
    out.push(this.bhit('lamp' + h.id, h.x - 18, y - 22, h.x + 18, y + 10, ...LAMP.hit));
    if (y >= -10) { this.lamp = null; sfx('glass', 0.7, 1); match.shake(4, 6); return true; }
    return false;
  }
  start_confetti(match, h) { h.title = 'CONFETTI!'; h.s = Math.random() < 0.5 ? -1 : 1; h.y = Math.random() < 0.5 ? -24 : -128; }
  /** CONFETTI: a cannon in one wing points across a marked band and blasts it with confetti. */
  step_confetti(match, h, out) {
    this.blast = { s: h.s, y: h.y, k: Math.min(1, h.t / BLAST.warn), on: h.t >= BLAST.warn };
    if (h.t >= BLAST.warn) { out.push(this.bhit('blast' + h.id, -300, h.y - 22, 300, h.y + 22, ...BLAST.hit, { dirX: -h.s })); if (h.t === BLAST.warn) sfx('bighit', 0.6, 1.4); if (h.t % 2 === 0) this.confetti.push({ x: h.s * 280, y: h.y + (Math.random() - 0.5) * 30, vx: -h.s * (8 + Math.random() * 4), vy: (Math.random() - 0.5) * 2, a: 0, c: [0xff3a8a, 0x3a8aff, 0xffd23a, 0x3ae07a][h.t % 4], life: 70 }); }
    if (h.t >= BLAST.warn + BLAST.dur) { this.blast = null; return true; }
    return false;
  }

  // ------------------------------------------------------------------ the frame
  /** Moves the studio and MAX JACKPOT one frame; returns hazard + boss hitboxes. */
  step(match) {
    this.t++;
    const out = [];
    if (this.hazardsOn) this.cycle.run(match, out);
    if (this.sign && ++this.sign.t > this.sign.n) this.sign = null;
    for (const C of this.confetti) { C.x += C.vx; C.y += C.vy; C.vx *= 0.98; C.vy = Math.min(C.vy + 0.05, 1.6); C.a += 0.2; C.life--; }
    this.confetti = this.confetti.filter((C) => C.life > 0 && C.y < 60);
    if (this.boss) {
      const B = this.boss;
      this.watchCrowd(match);
      this.bossStep(match, out);
      if (!this.low && !B.dying && !this.cut && B.phase === 2 && B.hp <= B.max * LOW.at) this.startLow(match);
      if (!B.dying) { this.stepShots(match, out); this.stepWaves(match, out); this.stepChips(match, out); this.stepTicket(match); }
      if (this.sayCD > 0) this.sayCD--;
      if (this.say && ++this.say.t > this.say.life) this.say = null;
      if (this.wheel.glow > 0) this.wheel.glow--;
      if (B.dying) this.e.alpha = B.dying > 140 ? 0 : 1;
    }
    return out;
  }
  /** The studio audience watches you: when a player gets hurt they LAUGH (and he gloats); when one loses a life, AWWW... */
  watchCrowd(match) {
    if (this.boss.dying || match.over) return;
    for (const f of match.fighters) {
      const p = this.prev.get(f) || { pc: f.percent, st: f.stocks };
      if (f.stocks < p.st) { this.cue('aww', 70); sfx('scream', 0.15, 0.8); }
      else if (f.percent > p.pc + 6 && (!this.sign || this.sign.t > 30)) { this.cue('laugh', 50); if (Math.random() < 0.3 && (!this.say || this.say.t > 40)) this.talk(SAY.laugh[Math.floor(Math.random() * SAY.laugh.length)], 60); }
      this.prev.set(f, { pc: f.percent, st: f.stocks });
    }
  }

  // ------------------------------------------------------------------ drawing
  /** Draws the studio, the crowd (bobbing, cheering arms when a sign is lit), the wheel, the stage, the host and his tricks. */
  render() {
    const B = this.boss, t = this.t, cheer = this.sign && (this.sign.kind === 'applause' || this.sign.kind === 'laugh');
    for (const C of this.crowd) {                                                         // the audience bounces in their seats when they cheer
      const up = cheer ? Math.abs(Math.sin(t * 0.25 + C.ph)) * 10 : Math.sin(t * 0.03 + C.ph) * 1.5, y = C.y;
      C.body.p[0][1] = y - 44 - up; C.body.p[1][1] = y - 44 - up; C.head.p[0][1] = y - 70 - up; C.head.p[1][1] = y - 70 - up; C.head.p[2][1] = y - 46 - up; C.head.p[3][1] = y - 46 - up;
    }
    const lit = this.lightsK ?? 1; this.R.fog = mix(0x050208, this.gold > 0.5 ? 0x3a1010 : 0x1a0a30, lit);
    this.R.render([]); this.drawSigns(); this.drawLights(this.lightG); this.lightG.setAlpha(lit); this.drawWheel(this.wheelG); this.drawArena(this.arenaG);
    this.darkG.clear(); if (lit < 1) { this.darkG.fillStyle(0x000000, 0.8 * (1 - lit)); this.darkG.fillRect(-900, -900, 1800, 1300); }
    this.hostG.clear(); this.backG.clear(); this.fxG.clear(); this.bubG.clear(); this.bubT.setVisible(false); this.fxT.forEach((o) => o.setVisible(false));
    if (B && this.e.alpha > 0) this.drawHost(this.hostG, this.backG);
    this.drawFx(this.fxG);
    if (this.say && B && this.e.alpha > 0) this.drawBubble();
    if (B) this.drawBar();
  }
  /** His health bar: gold, with a row of marquee bulbs chasing along it. */
  barStyle(g, x, y, w, h, k) { for (let i = 0; i < w * k; i += 8) { g.fillStyle((i / 8 + (this.t >> 2)) % 3 === 0 ? 0xffffff : 0xfff0a0, 0.7); g.fillCircle(x + i + 4, y + h / 2, 1.4); } }
  /**
   * MAX JACKPOT: long legs in black trousers with a satin stripe, patent shoes; tuxedo tails flapping behind
   * (`backG`); a sequinned jacket (purple - gold for SWEEPS WEEK) with sparkles running over it, gold lapels, a white
   * shirt and a giant red bow tie; white gloves; a skinny silver mic on a cord trailing off stage; blue cue cards;
   * a long-jawed tanned face with raised brows, a pencil moustache and a huge grin of square teeth; the pompadour
   * (or, BANKRUPT, a shiny bald head with three hairs).
   */
  drawHost(g, back) {
    const E = this.e, d = E.dir, t = this.t, b = this.body(), fl = this.boss && this.boss.flash > 0, ink = LOOK.ink;
    const col = (c) => (fl ? 0xffffff : c), jacket = this.gold > 0.5 ? LOOK.gold : LOOK.jacket;
    const limb = (a, c2, w, colr, gg = g) => { gg.lineStyle(w + 4, ink, 1); gg.lineBetween(a.x, a.y, c2.x, c2.y); gg.lineStyle(w, col(colr), 1); gg.lineBetween(a.x, a.y, c2.x, c2.y); gg.lineStyle(0); };
    const blob = (x, y, rx, ry, c, gg = g) => { gg.fillStyle(ink, 1); gg.fillEllipse(x, y, rx * 2 + 4, ry * 2 + 4); gg.fillStyle(col(c), 1); gg.fillEllipse(x, y, rx * 2, ry * 2); };
    if (E.y < 30) { g.fillStyle(0x000000, 0.35); g.fillEllipse(E.x, -1, 70, 9); }
    // the mic cord: from the base of the mic, sagging to the floor and off into the wings behind him
    if (!this.whip) { back.lineStyle(2, 0x0a0614, 1); back.beginPath(); const sx = b.hand.x, sy = b.hand.y + 8; back.moveTo(sx, sy); for (let i = 1; i <= 12; i++) { const s = i / 12; back.lineTo(lerp(sx, E.x - d * 300, s), lerp(sy, -2, Math.sqrt(s)) + Math.sin(s * Math.PI) * 10); } back.strokePath(); back.lineStyle(0); }
    // the tails: two long swallow-tails behind, swinging with his walk
    const sw = Math.sin(E.walk * 2) * 6 + Math.sin(t * 0.08) * 3;
    for (const o of [0, 10]) { back.fillStyle(ink, 1); back.fillTriangle(b.hip.x - d * 12, b.hip.y - 20, b.hip.x - d * (18 + o), b.hip.y - 20, b.hip.x - d * (30 + o) - sw, b.hip.y + 40 - o * 0.6); }
    for (const o of [0, 10]) { back.fillStyle(col(mix(jacket, 0x000000, 0.25)), 1); back.fillTriangle(b.hip.x - d * 14, b.hip.y - 18, b.hip.x - d * (17 + o), b.hip.y - 18, b.hip.x - d * (28 + o) - sw, b.hip.y + 36 - o * 0.6); }
    // legs and shoes
    const step = Math.sin(E.walk) * 12;
    for (const s of [-1, 1]) {
      const foot = { x: b.ft.x + s * 10 + s * step * 0.5, y: b.ft.y - 5 }, knee = { x: (b.hip.x + foot.x) / 2 + d * 5, y: (b.hip.y + foot.y) / 2 };
      limb({ x: b.hip.x + s * 6, y: b.hip.y }, knee, 15, LOOK.pants); limb(knee, foot, 13, s > 0 ? LOOK.pants : mix(LOOK.pants, 0x000000, 0.2));
      g.lineStyle(2, col(LOOK.lapel), 0.8); g.lineBetween(knee.x - d * 6, knee.y, foot.x - d * 5, foot.y - 4); g.lineStyle(0);
      blob(foot.x + d * 8, foot.y + 2, 15, 6, 0x101018); g.fillStyle(0xffffff, 0.8); g.fillEllipse(foot.x + d * 12, foot.y - 1, 8, 2);
    }
    // the back arm (cue cards)
    const elb2 = { x: (b.sh.x + b.hand2.x) / 2 - d * 4, y: (b.sh.y + b.hand2.y) / 2 + 6 };
    limb(b.sh, elb2, 13, mix(jacket, 0x000000, 0.2)); limb(elb2, b.hand2, 12, mix(jacket, 0x000000, 0.2));
    g.fillStyle(ink, 1); g.fillRect(b.hand2.x - 13, b.hand2.y - 24, 26, 20); g.fillStyle(0x6ab0ff, 1); g.fillRect(b.hand2.x - 11, b.hand2.y - 22, 22, 16); g.fillStyle(0x2a5ab0, 1); for (let i = 0; i < 3; i++) g.fillRect(b.hand2.x - 8, b.hand2.y - 19 + i * 4, 16 - i * 4, 2);
    blob(b.hand2.x, b.hand2.y, 7, 7, LOOK.glove);
    // the jacket: a tapered tux body with sparkling sequins, gold lapels, the shirt front, buttons
    const J = [{ x: b.sh.x - 26, y: b.sh.y - 2 }, { x: b.sh.x + 26, y: b.sh.y - 2 }, { x: b.hip.x + 20, y: b.hip.y - 2 }, { x: b.hip.x + 6, y: b.hip.y + 8 }, { x: b.hip.x - 6, y: b.hip.y + 8 }, { x: b.hip.x - 20, y: b.hip.y - 2 }];
    g.fillStyle(ink, 1); g.fillPoints(J.map((p) => ({ x: p.x + (p.x - b.hip.x) * 0.06, y: p.y + (p.y < b.hip.y ? -2 : 2) })), true); g.fillStyle(col(jacket), 1); g.fillPoints(J, true);
    for (let i = 0; i < 26; i++) { const u = hash(i, 1), v = hash(i, 2), x = lerp(lerp(b.sh.x - 22, b.hip.x - 16, v), lerp(b.sh.x + 22, b.hip.x + 16, v), u), y = lerp(b.sh.y + 2, b.hip.y, v); const on = (t + i * 7) % 30 < 3; g.fillStyle(on ? 0xffffff : mix(jacket, 0xffffff, 0.35), on ? 1 : 0.6); g.fillRect(x, y, on ? 2 : 1, on ? 2 : 1); if (on) { g.fillRect(x - 2, y + 0.5, 6, 1); g.fillRect(x + 0.5, y - 2, 1, 6); } }
    g.fillStyle(col(LOOK.shirt), 1); g.fillTriangle(b.sh.x - 10, b.sh.y, b.sh.x + 10, b.sh.y, b.sh.x + d * 2, b.sh.y + 40);
    g.fillStyle(col(LOOK.lapel), 1); g.fillTriangle(b.sh.x - 14, b.sh.y - 1, b.sh.x - 4, b.sh.y + 2, b.sh.x + d * 0, b.sh.y + 42); g.fillTriangle(b.sh.x + 14, b.sh.y - 1, b.sh.x + 4, b.sh.y + 2, b.sh.x + d * 0, b.sh.y + 42);
    g.fillStyle(ink, 1); g.fillCircle(b.sh.x + d * 1, b.sh.y + 48, 2); g.fillCircle(b.sh.x + d * 1, b.sh.y + 56, 2);
    g.fillStyle(0xff3a5a, 1); g.fillTriangle(b.sh.x + d * 12, b.sh.y + 14, b.sh.x + d * 18, b.sh.y + 10, b.sh.x + d * 20, b.sh.y + 16);   // a carnation
    // the bow tie (spins when he's excited)
    const ta = E.tie + (this.boss && this.boss.atk && this.boss.atk.name === 'spin' ? t * 0.3 : Math.sin(t * 0.05) * 0.1), tx = b.sh.x + d * 1, ty = b.sh.y + 2, tc = Math.cos(ta), ts = Math.sin(ta), R = (x, y) => ({ x: tx + x * tc - y * ts, y: ty + x * ts + y * tc });
    g.fillStyle(ink, 1); g.fillPoints([R(0, 0), R(-17, -9), R(-17, 9)], true); g.fillPoints([R(0, 0), R(17, -9), R(17, 9)], true);
    g.fillStyle(col(LOOK.tie), 1); g.fillPoints([R(0, 0), R(-15, -7), R(-15, 7)], true); g.fillPoints([R(0, 0), R(15, -7), R(15, 7)], true); g.fillStyle(col(mix(LOOK.tie, 0x000000, 0.3)), 1); g.fillCircle(tx, ty, 4);
    // the head: neck, a long jaw, ears, the grin, moustache, eyes, brows; then the hair (or not)
    const hx = b.head.x, hy = b.head.y, fx = hx + d * 4;
    limb({ x: b.sh.x + d * 2, y: b.sh.y - 2 }, { x: hx, y: hy + 14 }, 12, LOOK.skin);
    blob(hx - d * 16, hy + 2, 5, 8, LOOK.skin);
    g.fillStyle(ink, 1); g.fillPoints([{ x: hx - 22, y: hy - 22 }, { x: hx + 22, y: hy - 22 }, { x: hx + 23, y: hy + 10 }, { x: fx + d * 4, y: hy + 30 }, { x: fx - d * 14, y: hy + 28 }, { x: hx - 23, y: hy + 6 }], true);
    g.fillStyle(col(LOOK.skin), 1); g.fillPoints([{ x: hx - 20, y: hy - 20 }, { x: hx + 20, y: hy - 20 }, { x: hx + 21, y: hy + 9 }, { x: fx + d * 3, y: hy + 27 }, { x: fx - d * 13, y: hy + 25 }, { x: hx - 21, y: hy + 5 }], true);
    g.fillStyle(0xff8a7a, 0.4); g.fillCircle(fx + d * 10, hy + 6, 4);
    const gw = 26 + E.grin * 4;                                                           // the grin: a wall of square white teeth
    g.fillStyle(ink, 1); g.fillRoundedRect(fx - gw / 2 + d * 3, hy + 6, gw, 14, 5); g.fillStyle(0xffffff, 1); g.fillRect(fx - gw / 2 + d * 3 + 2, hy + 8, gw - 4, 10);
    g.lineStyle(1, 0xc0b8c0, 1); for (let i = 1; i < 6; i++) g.lineBetween(fx - gw / 2 + d * 3 + i * gw / 6, hy + 8, fx - gw / 2 + d * 3 + i * gw / 6, hy + 18); g.lineBetween(fx - gw / 2 + d * 3 + 2, hy + 13, fx + gw / 2 + d * 3 - 2, hy + 13); g.lineStyle(0);
    g.fillStyle(0x2a1810, 1); g.fillRect(fx - 11 + d * 3, hy + 2, 22, 3);
    const look = this.boss && this.boss.atk ? d * 1.5 : 0;
    for (const ex of [-8, 8]) { g.fillStyle(0xffffff, 1); g.fillEllipse(fx + ex, hy - 6, 9, 8); g.fillStyle(0x3a6ad0, 1); g.fillCircle(fx + ex + d * 1.5 + look, hy - 6, 2.6); g.fillStyle(ink, 1); g.fillCircle(fx + ex + d * 1.5 + look, hy - 6, 1.2); g.fillStyle(0xffffff, 1); g.fillRect(fx + ex + d * 1.5 + look - 1, hy - 8, 1, 1); }
    const bro = E.bald ? 4 : this.boss && this.boss.phase === 2 ? -1 : -3;
    g.fillStyle(0x2a1810, 1); g.fillRect(fx - 13, hy - 15 + bro, 10, 2.5); g.fillRect(fx + 3, hy - 15 + bro, 10, 2.5);
    if (E.bald) { g.fillStyle(col(mix(LOOK.skin, 0xffffff, 0.15)), 1); g.fillEllipse(hx, hy - 20, 44, 26); g.fillStyle(0xffffff, 0.6); g.fillEllipse(hx - 6, hy - 26, 14, 5); g.lineStyle(1, ink, 1); for (let i = -1; i <= 1; i++) { g.beginPath(); g.arc(hx + i * 5, hy - 34, 5, Math.PI, Math.PI * 1.6); g.strokePath(); } g.lineStyle(0); }
    else this.drawPomp(g, hx, hy - 20, d, col);
    if (E.grin > 0.95 || (this.t % 120 < 5 && !E.bald)) { const sx = fx + d * 14, sy = hy + 9, r = 9 + Math.sin(t * 0.5) * 2; g.fillStyle(0xffffff, 1); g.fillTriangle(sx - r, sy, sx + r, sy, sx, sy - 2); g.fillTriangle(sx - r, sy, sx + r, sy, sx, sy + 2); g.fillTriangle(sx, sy - r, sx, sy + r, sx + 2, sy); g.fillTriangle(sx, sy - r, sx, sy + r, sx - 2, sy); }
    // the mic arm, the glove, the mic (silver stick, black grille, gold band)
    const elb = { x: (b.sh.x + b.hand.x) / 2 + d * 2, y: (b.sh.y + b.hand.y) / 2 + 8 };
    limb(b.sh, elb, 13, jacket); limb(elb, b.hand, 12, jacket);
    if (!this.whip) { limb({ x: b.hand.x, y: b.hand.y + 8 }, b.mic, 4, 0xc8c8d8); g.fillStyle(ink, 1); g.fillCircle(b.mic.x, b.mic.y, 7); g.fillStyle(0x3a3a4a, 1); g.fillCircle(b.mic.x, b.mic.y, 5.5); g.fillStyle(0xffffff, 0.5); g.fillCircle(b.mic.x - 2, b.mic.y - 2, 2); g.fillStyle(0xffd23a, 1); g.fillRect(b.mic.x - 3, b.mic.y + 5, 6, 3); }
    blob(b.hand.x, b.hand.y, 8, 8, LOOK.glove); g.lineStyle(1, 0xc0c0d0, 1); g.lineBetween(b.hand.x - 3, b.hand.y - 6, b.hand.x - 3, b.hand.y + 2); g.lineBetween(b.hand.x + 1, b.hand.y - 6, b.hand.x + 1, b.hand.y + 2); g.lineStyle(0);
  }
  /** The pompadour: a tall glossy black wave swept up and forward off his forehead, with blue highlights and a single loose curl. */
  drawPomp(g, x, y, d, col, wig) {
    const ink = LOOK.ink, P = [];
    for (let i = 0; i <= 16; i++) { const a = i / 16; P.push({ x: x - d * 26 + d * a * 66, y: y + 4 - Math.sin(a * Math.PI * 0.9) * 40 - a * 12 }); }
    P.push({ x: x + d * 44, y: y - 16 }, { x: x + d * 38, y: y - 2 }, { x: x + d * 22, y: y + 4 }, { x: x - d * 26, y: y + 12 });
    g.fillStyle(ink, 1); g.fillPoints(P.map((p) => ({ x: p.x + (p.x - x) * 0.08, y: p.y + (p.y - y) * 0.08 })), true); g.fillStyle(col(LOOK.hair), 1); g.fillPoints(P, true);
    for (let i = 0; i < 3; i++) { g.lineStyle(2.5, 0x6a6ab0, 0.9); g.beginPath(); for (let k = 0; k <= 8; k++) { const a = k / 8; g.lineTo(x - d * (14 - i * 6) + d * a * 34, y - 4 - Math.sin(a * Math.PI) * (20 - i * 5) - a * 6 - i * 2); } g.strokePath(); }
    g.lineStyle(2, ink, 1); g.beginPath(); g.arc(x + d * 34, y + 2, 6, d > 0 ? -1.2 : Math.PI - 2, d > 0 ? 2 : Math.PI + 1.2); g.strokePath(); g.lineStyle(0);
    if (!wig) { g.fillStyle(col(LOOK.hair), 1); g.fillRect(x - d * 22 - (d > 0 ? 0 : 4), y + 6, 4, 18); }   // sideburn
  }
  /** Everything else on stage: the whipping cord, cannons and confetti, the falling lamp, applause waves, the grin beam, plinko, doors' springs, the car, buzzers, the ticket, the wig, the hook. */
  drawFx(g) {
    const t = this.t, ink = LOOK.ink; let ti = 0;
    const word = (s, x, y, c = '#ffffff', sc = 1) => { if (ti < 3) this.fxT[ti++].setText(s).setPosition(x, y).setColor(c).setScale(sc).setVisible(true); };
    if (this.whip) {
      const pts = this.whipPoints(); g.lineStyle(3, ink, 1); g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.strokePath(); g.lineStyle(0);
      const p = pts[pts.length - 1]; g.fillStyle(ink, 1); g.fillCircle(p.x, p.y, 8); g.fillStyle(0x3a3a4a, 1); g.fillCircle(p.x, p.y, 6); g.fillStyle(0xffd23a, 1); g.fillCircle(p.x - 2, p.y - 2, 2);
      if (this.whip.k > 0.9) { g.lineStyle(2, 0xffffff, 0.8); g.strokeCircle(p.x, p.y, 14); g.lineStyle(0); }
    }
    if (this.cannons) for (const K of this.cannons.list) {                                  // the cannons: a striped barrel on a little gold carriage
      const c = Math.cos(K.ang), s = Math.sin(K.ang), q = (x, y) => ({ x: K.x + x * c - y * s, y: K.y + x * s + y * c }), k = this.cannons.k;
      g.fillStyle(ink, 1); g.fillPoints([q(-14, -13), q(32 * k, -11), q(32 * k, 11), q(-14, 13)], true); g.fillStyle(0xff3a8a, 1); g.fillPoints([q(-12, -10), q(30 * k, -9), q(30 * k, 9), q(-12, 10)], true);
      g.fillStyle(0xffffff, 1); g.fillPoints([q(4, -9.5), q(12, -9.4), q(12, 9.4), q(4, 9.5)], true);
      g.fillStyle(ink, 1); g.fillCircle(K.x, K.y + 14, 12); g.fillStyle(0xffd23a, 1); g.fillCircle(K.x, K.y + 14, 9); g.fillStyle(ink, 1); g.fillCircle(K.x, K.y + 14, 3);
      if (this.boss && this.boss.atk && this.boss.atk.t < this.sp(CANNON.aim)) { g.lineStyle(1, 0xff3a8a, 0.5); g.lineBetween(K.x, K.y, K.x + c * 500, K.y + s * 500); g.lineStyle(0); }
    }
    for (const S of this.shots) { for (let i = 0; i < 6; i++) { const a = t * 0.3 + i, r = 8; g.fillStyle([0xff3a8a, 0x3a8aff, 0xffd23a, 0x3ae07a, 0xffffff, S.c][i], 1); g.fillRect(S.x + Math.cos(a) * r - 3, S.y + Math.sin(a) * r - 2, 6, 4); } g.fillStyle(S.c, 0.4); g.fillCircle(S.x, S.y, 12); }
    for (const C of this.confetti) { g.fillStyle(C.c, 1); g.fillRect(C.x - 2, C.y - 1 - Math.abs(Math.sin(C.a)) * 2, 4, 2 + Math.abs(Math.sin(C.a)) * 3); }
    const lamp = (x, y) => { g.fillStyle(ink, 1); g.fillRect(x - 18, y - 30, 36, 34); g.fillStyle(0x3a3a4a, 1); g.fillRect(x - 15, y - 27, 30, 28); g.fillStyle(0xfff4c0, 1); g.fillEllipse(x, y + 2, 28, 8); g.lineStyle(2, 0x6a6a7a, 1); g.lineBetween(x, y - 30, x, y - 44); g.lineStyle(0); };
    if (this.spot && this.spot.y != null) lamp(this.spot.x, this.spot.y);
    if (this.lamp) { const L = this.lamp; if (L.y == null) { g.fillStyle(0xfff4c0, 0.2 + 0.25 * L.k); g.fillEllipse(L.x, -1, 50, 8); lamp(L.x + Math.sin(t * 1.5) * 2 * L.k, -440); } else lamp(L.x, L.y); }
    for (const W of this.waves) { for (let i = 0; i < 4; i++) { g.lineStyle(4 - i, 0xfff4c0, 0.7 - i * 0.15); g.beginPath(); g.arc(W.x - W.dir * i * 8, 0, CLAP.h - i * 6, W.dir > 0 ? -Math.PI / 2 : Math.PI, W.dir > 0 ? 0 : -Math.PI / 2); g.strokePath(); } g.lineStyle(0); if (ti < 3 && t % 20 < 12) word('CLAP!', W.x, -CLAP.h - 12, '#fff4c0', 0.7); }
    if (this.beam) { const B = this.beam, x2 = B.x + B.dir * 560;
      if (B.warn != null) { g.lineStyle(1, 0xffffff, 0.3 + 0.5 * B.warn); g.lineBetween(B.x, B.y, x2, B.y); g.lineStyle(0); g.fillStyle(0xffffff, 0.4 * B.warn); g.fillCircle(B.x + B.dir * 14, B.y, 6 + 14 * B.warn); }
      else { g.fillStyle(0xfff4c0, 0.4); g.fillRect(Math.min(B.x, x2), B.y - GRIN.half - 4, 560, GRIN.half * 2 + 8); g.fillStyle(0xffffff, 1); g.fillRect(Math.min(B.x, x2), B.y - GRIN.half / 2, 560, GRIN.half); g.fillStyle(0xffffff, 1); g.fillCircle(B.x + B.dir * 14, B.y, 18); }
    }
    if (this.plinko) {                                                                      // the plinko board: a tall panel with rows of pegs
      const P = this.plinko; g.fillStyle(ink, 0.6); g.fillRect(-240, P.y - 8, 480, 250); g.fillStyle(0x2a1a50, 0.35); g.fillRect(-234, P.y - 2, 468, 238);
      for (let r = 0; r < 7; r++) for (let i = 0; i < 12; i++) { const x = -220 + i * 40 + (r % 2) * 20, y = P.y + 20 + r * 34; g.fillStyle(0xffd23a, 1); g.fillCircle(x, y, 3); g.fillStyle(0xffffff, 0.6); g.fillCircle(x - 1, y - 1, 1); }
      g.fillStyle(0xff3a8a, 1); g.fillRect(-240, P.y - 8, 480, 10); word('PLINKO', 0, P.y - 2, '#fff4c0', 0.9);
    }
    for (const C of this.chips) { g.fillStyle(ink, 1); g.fillCircle(C.x, C.y, PLINKO.r + 2); g.fillStyle(0xe0e0f0, 1); g.fillCircle(C.x, C.y, PLINKO.r); g.fillStyle(0xff3a8a, 1); g.fillCircle(C.x, C.y, PLINKO.r - 5); g.lineStyle(2, 0xffffff, 1); g.lineBetween(C.x + Math.cos(C.a) * 5, C.y + Math.sin(C.a) * 5, C.x - Math.cos(C.a) * 5, C.y - Math.sin(C.a) * 5); g.lineStyle(0); }
    if (this.doors) { const D = this.doors; DOORS.at.forEach(([x1, x2], i) => { const cx = (x1 + x2) / 2; word(String(i + 1), cx, -16, D.tell && D.live.includes(i) ? '#ff3a3a' : '#ffd23a', 1.2);
      if (D.open && D.live.includes(i)) { for (let k = 0; k < 3; k++) { const x = lerp(x1 + 24, x2 - 24, k / 2); g.lineStyle(3, 0xc0c0d0, 1); for (let z = 0; z < 5; z++) g.lineBetween(x - 6, -z * 10, x + 6, -z * 10 - 5); g.lineStyle(0); g.fillStyle(0xff2a2a, 1); g.fillCircle(x, -54, 10); g.fillStyle(0xffffff, 0.5); g.fillCircle(x - 3, -57, 3); } } }); }
    if (this.car) { const C = this.car;                                                      // headlights, then the convertible
      if (C.x == null) { g.fillStyle(0xfff4c0, 0.12 + 0.12 * (t % 10 < 5 ? 1 : 0)); g.fillTriangle(C.s * 300, -18, -C.s * 100, -70, -C.s * 100, 10); }
      else { const x = C.x, f = -C.s, w = CAR.w;
        g.fillStyle(ink, 1); g.fillRoundedRect(x - w / 2 - 2, -34, w + 4, 26, 8); g.fillStyle(0xff2a3a, 1); g.fillRoundedRect(x - w / 2, -32, w, 22, 7);
        g.fillStyle(0xff6a6a, 1); g.fillRect(x - w / 2 + 6, -30, w - 12, 4); g.fillStyle(0x9ad8ff, 0.8); g.fillTriangle(x + f * 4, -32, x + f * 22, -32, x + f * 4, -48);
        g.fillStyle(0xfff4c0, 1); g.fillCircle(x + f * (w / 2 - 4), -24, 4); g.fillStyle(0xffd23a, 1); g.fillRect(x - w / 2, -14, w, 3);
        for (const wx of [-w / 2 + 22, w / 2 - 22]) { g.fillStyle(ink, 1); g.fillCircle(x + wx, -8, 11); g.fillStyle(0xc0c0d0, 1); g.fillCircle(x + wx, -8, 5); }
        g.fillStyle(0xffffff, 1); g.fillRect(x - 14, -46, 4, 14); g.fillStyle(0xffd23a, 1); g.fillTriangle(x - 10, -46, x + 10, -42, x - 10, -38);   // a prize flag
      } }
    if (this.buzz) { const Z = this.buzz; BUZZ.pads.forEach((x, i) => { const live = Z.live.includes(i); g.fillStyle(ink, 1); g.fillEllipse(x, -2, 50, 12); g.fillStyle(live ? (t % 6 < 3 ? 0xff3a3a : 0xffd23a) : 0x5a2a2a, 1); g.fillEllipse(x, -4, 42, 9);
      if (live && Z.zap) { for (let k = 0; k < 3; k++) { g.lineStyle(3 - k, [0xffffff, 0x9ae0ff, 0x3a8aff][k], 1); g.beginPath(); for (let y = 0; y > -300; y -= 20) g.lineTo(x + (Math.random() - 0.5) * 40, y); g.strokePath(); } g.lineStyle(0); g.fillStyle(0x9ae0ff, 0.2); g.fillRect(x - 26, -300, 52, 300); } else if (live) { g.fillStyle(0xffd23a, 0.08 + 0.08 * (t % 8 < 4 ? 1 : 0)); g.fillRect(x - 26, -300, 52, 300); } }); }
    if (this.ticket) { const T = this.ticket, bob = Math.sin(t * 0.1) * 3, x = T.x, y = T.y + bob, sh = (t % 40) / 40;
      g.fillStyle(0xffd23a, 0.25); g.fillCircle(x, y, 24); g.fillStyle(ink, 1); g.fillRect(x - 20, y - 12, 40, 24); g.fillStyle(0xffd23a, 1); g.fillRect(x - 18, y - 10, 36, 20); g.fillStyle(0xb88a20, 1); g.fillRect(x - 6, y - 10, 2, 20); g.fillStyle(0xffffff, 0.7); g.fillRect(x - 18 + sh * 36, y - 10, 3, 20);
      if (T.life < 90 && t % 6 < 3) { g.fillStyle(0xffffff, 0.4); g.fillRect(x - 18, y - 10, 36, 20); } }
    const Wg = this.e.wig; if (Wg) this.drawPomp(g, Wg.x, Wg.y, 1, (c) => c, true);
    if (this.hook) { const H = this.hook, b = this.body(), y = b.head.y + 10;                   // the vaudeville hook: a giant striped cane from the wing
      g.lineStyle(14, ink, 1); g.lineBetween(H.x - 400, y + 30, H.x, y + 30); g.lineStyle(10, 0xc0402a, 1); g.lineBetween(H.x - 400, y + 30, H.x, y + 30);
      g.lineStyle(14, ink, 1); g.beginPath(); g.arc(H.x + 24, y + 6, 26, Math.PI * 0.5, Math.PI * 1.9, true); g.strokePath(); g.lineStyle(10, 0xc0402a, 1); g.beginPath(); g.arc(H.x + 24, y + 6, 26, Math.PI * 0.5, Math.PI * 1.9, true); g.strokePath();
      g.lineStyle(10, 0xfff4e0, 1); for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(H.x + 24, y + 6, 26, Math.PI * (0.5 - i * 0.24), Math.PI * (0.5 - i * 0.24 - 0.08), true); g.strokePath(); } g.lineStyle(0); }
    if (this.blast) { const B = this.blast, x = B.s * 290; g.fillStyle(0xff3a8a, B.on ? 0.12 : 0.06 + 0.08 * B.k * (t % 8 < 4 ? 1 : 0)); g.fillRect(-300, B.y - 22, 600, 44); g.fillStyle(ink, 1); g.fillRect(x - 16, B.y - 14, 32, 28); g.fillStyle(0xff3a8a, 1); g.fillRect(x - 13, B.y - 11, 26, 22); }
    if (this.low && this.boss && !this.boss.dying) { const left = Math.max(0, 30 - Math.floor((this.boss.t % 1800) / 60)); word(':' + String(left).padStart(2, '0'), WHEEL.x, WHEEL.y + WHEEL.r + 22, left < 10 && t % 20 < 10 ? '#ff3a3a' : '#ffd23a', 1.3); }
  }
  /** His speech bubble: a gold-rimmed showbiz bubble with a tail toward his mic. */
  drawBubble() {
    const S = this.say, b = this.body(), g = this.bubG, pop = Math.min(1, S.t / 6), x = Phaser.Math.Clamp(b.head.x - this.e.dir * 40, -220, 220), y = b.head.y - 86;
    this.bubT.setText(S.text).setPosition(x, y).setScale(pop).setVisible(true);
    const w = Math.max(60, this.bubT.width + 20) * pop, h = (this.bubT.height + 14) * pop;
    g.fillStyle(LOOK.ink, 1); g.fillRoundedRect(x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6, 10); g.fillStyle(0xffd23a, 1); g.fillRoundedRect(x - w / 2 - 1, y - h / 2 - 1, w + 2, h + 2, 9); g.fillStyle(0xffffff, 1); g.fillRoundedRect(x - w / 2 + 1, y - h / 2 + 1, w - 2, h - 2, 8);
    g.fillStyle(0xffffff, 1); g.fillTriangle(x - 6, y + h / 2 - 2, x + 8, y + h / 2 - 2, b.mic.x, b.mic.y - 8); g.lineStyle(2, LOOK.ink, 1); g.lineBetween(x - 6, y + h / 2, b.mic.x, b.mic.y - 8); g.lineBetween(x + 8, y + h / 2, b.mic.x, b.mic.y - 8); g.lineStyle(0);
  }
}

/** PRIME TIME's miniature for the stage select screen: the purple studio, the wheel and the light-up stage. */
export function drawPrimeTimePreview(g, x, y, w, h) {
  g.fillStyle(0x1a0a3a, 1); g.fillRect(x, y, w, h);
  for (let i = 0; i < 4; i++) { g.fillStyle(0x2a1450 + i * 0x020004, 1); g.fillRect(x, y + h * (0.5 + i * 0.06), w, h * 0.06); }
  const cx = x + w / 2, cy = y + h * 0.3, r = h * 0.22;
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillStyle([0xff3a5a, 0x3a8aff, 0xffd23a, 0x3ae07a][i % 4], 1); g.fillTriangle(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r, cx + Math.cos(a + 0.52) * r, cy + Math.sin(a + 0.52) * r); }
  g.lineStyle(2, 0xffd75a, 1); g.strokeCircle(cx, cy, r); g.lineStyle(0); g.fillStyle(0xffd75a, 1); g.fillCircle(cx, cy, 3);
  g.fillStyle(0x0a0614, 1); g.fillRect(x + w * 0.1, y + h * 0.74, w * 0.8, h * 0.1);
  for (let i = 0; i < 8; i++) { g.fillStyle([0xff3a8a, 0x3a8aff, 0xffd23a, 0x3ae07a][i % 4], 0.8); g.fillRect(x + w * 0.1 + i * w * 0.1 + 1, y + h * 0.75, w * 0.1 - 2, h * 0.04); }
  const hx = x + w * 0.66, fy = y + h * 0.74;
  g.fillStyle(0x7a2ad0, 1); g.fillRect(hx - 4, fy - h * 0.34, 8, h * 0.16); g.fillStyle(0x1a1428, 1); g.fillRect(hx - 3, fy - h * 0.18, 6, h * 0.18);
  g.fillStyle(0xf0ac78, 1); g.fillCircle(hx, fy - h * 0.38, 4); g.fillStyle(0x14101e, 1); g.fillEllipse(hx, fy - h * 0.43, 10, 5);
}

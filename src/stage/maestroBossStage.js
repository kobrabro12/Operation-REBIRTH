// THE GRAND OPERA - the arena of THE PHANTOM MAESTRO, HE HAUNTS THE GRAND OPERA (boss IX; Trinkets > BOSS FIGHTS,
// src/data/bosses.js). An original character in the old opera-ghost tradition: a towering, gaunt gentleman who floats
// above the stage in white tie, a vast black cape lined in crimson with a high collar, white gloves, a red rose in his
// lapel and a white porcelain half-mask over one side of his face - a gold eye glowing behind it. He treats the fight
// as his opera, and you are the understudy who wandered onto his stage.
// THE ARENA is real 3D (poly3d.js): the stage of an opera house, its horseshoe of gilded balconies curving away into
// the dark behind, a painted dome overhead, the ghostly audience in the boxes.
// His attacks (`pattern`): ROCKET DIVE (he soars up out of sight, a mark finds you on the stage, then he rockets down
// at it diagonally, cape streaming - a shockwave where he lands), ROSE THROW (a flick of the wrist and a fan of roses
// flies at you - a rose that hits STUNS you for a moment), CAPE TELEPORT (he wraps himself in his cape and is gone in a
// swirl of petals - then unfurls right behind you with a sweep of the cape), PUNCH SEQUENCE (he glides in and throws a
// long flurry of punches that holds you, then a rising uppercut) and THE CHANDELIER (it swings out over you, then falls).
// At half health: THE MASK SLIPS (a cutscene when a player's watching) - the mask cracks and shatters, showing the
// burning eye beneath, and the roof tears away into a storm; he's faster and dives twice. Below 30%: THE FINALE - three
// dives at a time, and roses rain from the flies. His death: THE FINAL BOW - the last chord, he bows, roses rain down
// and the curtain falls.
// Stage hazards (VS too): FALLING SANDBAG (a sandbag drops from the fly tower on a mark) and TRAPDOOR SMOKE (a burst of
// stage smoke out of a trap in the floor that pushes you up).
import { HazardCycle } from './hazardCycle.js';
import { BossArena } from './bossBase.js';
import { Poly3D, boxFaces, prismFaces } from './poly3d.js';
import { sfx } from '../audio/sfx.js';
import { FONT, VIEW_W } from '../config.js';

// his size: leg, torso, head; how high he hovers; glide speeds (calm, enraged); how far he roams
const PH = { leg: 74, torso: 64, head: 34, hover: 16, walk: 1.8, fast: 2.6, range: 205 };
// his colours: skin, suit, cape lining, shirt, mask, hair, gloves, the rose, gold trim, outline, the burning eye beneath the mask
const LOOK = { skin: 0xe6d6cc, suit: 0x101018, lining: 0xb01830, shirt: 0xf4f0e8, mask: 0xfafaf4, hair: 0x14101a, glove: 0xffffff, rose: 0xc0102a, gold: 0xe8b840, ink: 0x07060c, ember: 0xff5a2a };
// ROCKET DIVE: frames rising out of sight, hanging there while the mark tracks you, dive speed, dives (calm / enraged / finale), its hit, the landing shockwave
const DIVE = { rise: 34, hang: 46, speed: 13, n: [1, 2, 3], hit: [13, [45, 6.4, 0.95]], wave: [6, [70, 4.6, 0.5]] };
// ROSE THROW: roses (calm / enraged), the fan's spread, speed, how long a rose STUNS you (frames), its hit (light - it's the stun that hurts)
const ROSES = { n: [3, 5], spread: 0.2, speed: 6, wind: 22, stun: 70, hit: [5, [30, 2.2, 0.15]] };
// CAPE TELEPORT: frames wrapping up, vanishing, gone, unfurling, the sweep; how far behind you he appears; the sweep's hit; teleports (calm / enraged)
const CAPE = { wrap: 22, vanish: 16, gone: 24, unfurl: 14, sweep: 14, behind: 50, hit: [11, [40, 5.8, 0.8]], n: [1, 2] };
// PUNCH SEQUENCE: dash speed and how long he chases, jabs (calm / enraged), frames between jabs, a jab's hit and how long it holds you, the finisher's wind-up and hit
const FLURRY = { dash: 7, chase: 60, n: [7, 10], every: 6, jab: [3, [20, 2.4, 0.1]], hold: 14, wind: 14, upper: [12, [80, 6.8, 1.0]] };
// CHANDELIER: frames it swings out over you, its size, fall speed, hit, shards, shard hit
const CHAND = { swing: 110, w: 70, fall: 14, hit: [14, [80, 6.6, 0.95]], shards: 6, shard: [6, [40, 4.6, 0.45]] };
// all his hits: x damage, x base knockback, x knockback growth (one knob for the whole fight's punch)
const HIT = { dmg: 0.62, base: 0.88, growth: 0.8 };
// THE FINALE (below this much health): roses rain from the flies every `every` frames
const LOW = { at: 0.3, every: 150, roses: 5 };
// THE MASK SLIPS cutscene (half health): its length, when the mask shatters, when the roof tears away
const STORM = { n: 250, crack: 80, tear: 150 };
// stage hazards: SANDBAG (warning, hit) and SMOKE (warning, burst frames, hit)
const SAND = { warn: 64, hit: [8, [80, 5, 0.5]] };
const SMOKE = { warn: 56, dur: 26, hit: [5, [90, 6, 0.4]] };
// what he says
const SAY = {
  intro: 'WELCOME... TO MY OPERA.',
  idle: ['YOU ARE ON MY STAGE.', 'THE HOUSE IS FULL TONIGHT. OF GHOSTS.', 'SING FOR ME.', 'NO ONE LEAVES BEFORE THE FINAL ACT.', 'BOX FIVE IS ALWAYS EMPTY. IT IS MINE.'],
  hurt: ['YOU DARE?', 'MY MASK!', 'A CLUMSY UNDERSTUDY!', 'INSOLENCE!', 'YOU MISSED YOUR CUE!'],
  hit: ['BRAVO!', 'ENCORE!', 'THE CRITICS WILL ADORE THIS.', 'A STANDING OVATION!'],
  moves: { dive: 'FROM THE RAFTERS!', roses: 'FOR YOU, MY DEAR.', cape: 'NOW YOU SEE ME...', flurry: 'A DUET!', chandelier: 'MIND THE CHANDELIER!' },
  rage: 'YOU WANTED TO SEE MY FACE?', storm: 'THEN LOOK!!', low: 'THE FINAL ACT!!', gloat: 'THE AUDIENCE ADORES ME!', appear: '...BEHIND YOU.',
};

/** A point along the way from a to b (k = 0..1). */
const lerp = (a, b, k) => a + (b - a) * k;
/** A repeatable 0-1 number from a few integers. */
const hash = (a, b = 0, c = 0) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** A colour mixed toward another (k = 0..1). */
const mix = (a, b, k) => { const c = (s) => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k); return (c(16) << 16) | (c(8) << 8) | c(0); };
/** Ease out (fast, then settling). */
const easeOut = (q) => 1 - Math.pow(1 - Math.max(0, Math.min(1, q)), 3);
// his hand poses (relative to his shoulder, x toward the way he faces): front hand x, y; back hand x2, y2
const POSE = {
  idle: [24, 6, -10, 30], throwBack: [-24, -34, 20, 14], throw: [54, -8, -18, 24], jab1: [62, 4, 8, 14], jab2: [12, 16, 62, 2],
  upper: [26, -66, -16, 18], spread: [52, -14, -48, -14], wrap: [8, 14, 10, 18], dive: [52, -6, 46, 4], bow: [30, 30, -34, 10], up: [18, -62, -24, -60],
};

/** THE GRAND OPERA and THE PHANTOM MAESTRO (see the top of the file). */
export class MaestroBossStage extends BossArena {
  constructor(scene) {
    super();
    this.scene = scene; this.t = 0; this.hazardsOn = true; this.music = 'bgm_boss_maestro';
    this.platforms = [
      { x1: -250, x2: 250, y: 0, solid: true, bottom: 44 },
      { x1: -225, x2: -130, y: -108, solid: false },
      { x1: 130, x2: 225, y: -108, solid: false },
    ];
    this.spawns = [{ x: -150, y: 0 }, { x: -60, y: 0 }, { x: -110, y: 0 }, { x: 150, y: 0 }];
    this.cycle = new HazardCycle(this, ['sandbag', 'smoke'], { color: '#ffd040', stroke: '#2a0a10', gap: 720 });
    this.e = { x: 100, y: 0, dir: -1, lift: PH.hover, tilt: 0, bow: 0, arms: 'idle', hp: [...POSE.idle], alpha: 1, vanish: 0, wrap: 0, flare: 0, vx: 0, mask: 1, curtain: 0 };
    this.fx = []; this.chand = null; this.mark = null; this.storm = 0; this.low = false; this.rain = []; this.dazed = new Map();
    this.say = null; this.sayCD = 300; this.pop = null; this.flash = 0; this.sand = null; this.smoke = null; this.prev = new Map();
    this.sparkColor = 0xd03050; this.bodyW = 80; this.bodyH = 220;
  }

  // ------------------------------------------------------------------ the arena
  /** Builds the backdrop, the 3D opera house (balconies, columns, dome), the stage, his layers and the speech bubble. */
  draw(world, bg) {
    const s = this.scene;
    this.skyG = s.add.graphics().setScrollFactor(0); bg.push(this.skyG);
    const R = this.R = new Poly3D(s, world, { fog: 0x1a0610, zFar: 3400, zNear: 500, soft: 0.35, grain: 0.06, edge: 0.15 });
    // the horseshoe of balconies: four tiers of boxes curving round behind the stage, red velvet fronts with gold rails,
    // a ghostly audience in them, columns between the boxes
    for (let tier = 0; tier < 4; tier++) {
      const y = 150 - tier * 110, N = 18;
      for (let i = 0; i < N; i++) {
        const a0 = -1.9 + i * 3.8 / N, a1 = a0 + 3.8 / N, P = (a) => [Math.sin(a) * 900, 1250 + Math.cos(a) * 700];
        const [x0, z0] = P(a0), [x1, z1] = P(a1);
        const front = { p: [[x0, y - 46, z0], [x1, y - 46, z1], [x1, y, z1], [x0, y, z0]], n: null, c: 0x8a1428, k: 'house' };
        const rail = { p: [[x0, y - 52, z0], [x1, y - 52, z1], [x1, y - 44, z1], [x0, y - 44, z0]], n: null, c: LOOK.gold, k: 'house' };
        const back = { p: [[x0 * 1.12, y - 110, z0 + 80], [x1 * 1.12, y - 110, z1 + 80], [x1 * 1.12, y, z1 + 80], [x0 * 1.12, y, z0 + 80]], n: null, c: 0x2a0812, k: 'house' };
        R.faces.push(back, front, rail);
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2 + 30;
        if (hash(i, tier) < 0.7) R.faces.push({ p: [[mx - 10, y - 74, mz], [mx + 10, y - 74, mz], [mx + 14, y - 46, mz], [mx - 14, y - 46, mz]], n: null, c: 0x5a7a9a, a: 0.55, nofog: true, bb: true, k: 'ghost' });
        R.faces.push(...prismFaces(x0, y - 110, y, z0 + 4, 9, 6, 0xc8a050, LOOK.gold).map((f) => ({ ...f, k: 'house' })));
      }
    }
    // the dome: a ring of painted panels high overhead with gilded ribs (it tears away for FORTISSIMO)
    for (let i = 0; i < 16; i++) {
      const a0 = i / 16 * Math.PI * 2, a1 = (i + 1) / 16 * Math.PI * 2, r1 = 600, r2 = 1100, y1 = -560, y2 = -360, cz = 1200;
      const q = [[Math.cos(a0) * r1, y1, cz + Math.sin(a0) * r1 * 0.5], [Math.cos(a1) * r1, y1, cz + Math.sin(a1) * r1 * 0.5], [Math.cos(a1) * r2, y2, cz + Math.sin(a1) * r2 * 0.5], [Math.cos(a0) * r2, y2, cz + Math.sin(a0) * r2 * 0.5]];
      R.faces.push({ p: q, n: null, c: i % 2 ? 0x3a2a5a : 0x4a3060, k: 'roof' }, { p: [q[0], q[3], [q[3][0] * 1.01, y2 + 8, q[3][2]], [q[0][0] * 1.01, y1 + 8, q[0][2]]], n: null, c: LOOK.gold, k: 'roof' });
    }
    // the proscenium: two great gilded columns and a velvet valance framing the stage
    for (const sx of [-1, 1]) { R.faces.push(...prismFaces(sx * 360, -420, 60, 260, 26, 10, 0xc8a050, LOOK.gold)); R.faces.push(...boxFaces(sx * 360 - 50, 40, 230, sx * 360 + 50, 70, 290, 0x6a4a2a, 0x8a6a3a)); }
    this.curtainG = s.add.graphics(); world.push(this.curtainG);       // the velvet curtains at the sides (and the final one)
    this.arenaG = s.add.graphics(); world.push(this.arenaG);
    this.backG = s.add.graphics(); world.push(this.backG);             // (his cape and its high collar)
    this.condG = s.add.graphics(); world.push(this.condG);             // (him)
    this.fxG = s.add.graphics(); world.push(this.fxG);
    this.finalG = s.add.graphics(); world.push(this.finalG);           // the falling curtain over everything (his death)
    this.popT = s.add.text(0, 0, '', { fontFamily: FONT, fontSize: '10px', color: '#ffd040', stroke: '#2a0a10', strokeThickness: 4 }).setOrigin(0.5).setVisible(false); world.push(this.popT);
    this.bubG = s.add.graphics(); world.push(this.bubG);
    this.bubT = s.add.text(0, 0, '', { fontFamily: FONT, fontSize: '9px', color: '#2a0a10', align: 'center', wordWrap: { width: 170 } }).setOrigin(0.5).setVisible(false); world.push(this.bubT);
    this.cycle.makeBanner(s);
    this.paintSky();
  }
  /** The back wall: deep red velvet drapery in the dark - or, once the roof's gone, a storm sky. */
  paintSky() {
    const g = this.skyG; g.clear();
    if (this.storm) { g.fillGradientStyle(0x0a0e1a, 0x0a0e1a, 0x2a3040, 0x2a3040, 1); g.fillRect(-400, -400, 1440, 1200); for (let i = 0; i < 12; i++) { g.fillStyle(0x3a4050, 0.5); g.fillEllipse(hash(i, 1) * 900 - 100, 40 + hash(i, 2) * 140, 200 + hash(i, 3) * 200, 50 + hash(i, 4) * 40); } return; }
    g.fillGradientStyle(0x1a0408, 0x1a0408, 0x3a0a14, 0x3a0a14, 1); g.fillRect(-400, -400, 1440, 1200);
    for (let i = 0; i < 40; i++) { const x = -100 + i * 22; g.fillStyle(i % 2 ? 0x4a0c18 : 0x2a060c, 0.6); g.fillRect(x, -100, 12, 700); }
  }
  /** The stage: polished boards, a row of flickering footlights along the front, gilded trim; the two opera boxes floating as ledges. */
  drawArena(g) {
    const t = this.t, pulse = 0.6 + 0.4 * Math.sin(t * 0.05) * (this.storm ? Math.sin(t * 0.7) : 1);
    g.clear();
    g.fillStyle(0x1a0a06, 1); g.fillRect(-256, -2, 512, 46);
    g.fillStyle(0x6a3a1a, 1); g.fillRect(-250, 0, 500, 30);
    for (let i = 0; i < 25; i++) { g.fillStyle(i % 2 ? 0x7a4420 : 0x5e3218, 1); g.fillRect(-250 + i * 20, 0, 20, 30); g.fillStyle(0x000000, 0.25); g.fillRect(-250 + i * 20, 0, 1, 30); }
    g.fillStyle(0xffffff, 0.12); g.fillRect(-250, 0, 500, 3);
    g.fillStyle(LOOK.gold, 1); g.fillRect(-256, 30, 512, 4); g.fillStyle(0x2a0a10, 1); g.fillRect(-256, 34, 512, 10);
    for (let i = 0; i < 16; i++) { const x = -234 + i * 31.2; g.fillStyle(0x1a1a1a, 1); g.fillRect(x - 7, 34, 14, 6); g.fillStyle(0xfff0c0, 0.5 + 0.5 * pulse); g.fillEllipse(x, 34, 10, 4); g.fillStyle(0xfff0c0, 0.08 + 0.1 * pulse); g.fillTriangle(x - 5, 34, x + 5, 34, x, -20); }
    // the opera boxes: a velvet front with a gold rail and swagged drapes
    for (const L of this.platforms.slice(1)) {
      const w = L.x2 - L.x1, cx = (L.x1 + L.x2) / 2;
      g.fillStyle(LOOK.ink, 1); g.fillRoundedRect(L.x1 - 4, L.y - 4, w + 8, 34, 6);
      g.fillStyle(0x8a1428, 1); g.fillRoundedRect(L.x1, L.y, w, 28, 4); g.fillStyle(0xb02038, 1); g.fillRect(L.x1 + 4, L.y + 8, w - 8, 3);
      g.fillStyle(LOOK.gold, 1); g.fillRect(L.x1 - 2, L.y - 2, w + 4, 5); for (let x = L.x1 + 8; x < L.x2; x += 14) { g.fillStyle(LOOK.gold, 1); g.fillCircle(x, L.y + 18, 2.4); }
      g.fillStyle(0xd8b050, 1); g.fillTriangle(cx - 10, L.y + 28, cx + 10, L.y + 28, cx, L.y + 40);
    }
  }
  /** The great red curtains drawn back at either side of the stage, with gold tie-backs and tassels. */
  drawCurtains(g) {
    g.clear();
    for (const s of [-1, 1]) {
      const x0 = s * 330, sway = Math.sin(this.t * 0.02 + s) * 4;
      for (let i = 0; i < 6; i++) { const x = x0 - s * i * 14; g.fillStyle(i % 2 ? 0x8a1428 : 0x6a0c1e, 1); g.fillPoints([{ x: x, y: -560 }, { x: x - s * 16, y: -560 }, { x: x - s * 30 + sway, y: -140 }, { x: x - s * 10 + sway, y: 60 }, { x: x + s * 6, y: 60 }, { x: x - s * 8 + sway, y: -140 }], true); }
      g.fillStyle(LOOK.gold, 1); g.fillEllipse(s * 290 + sway, -150, 26, 10); g.fillTriangle(s * 290 + sway - 5, -146, s * 290 + sway + 5, -146, s * 290 + sway, -110);
    }
    g.fillStyle(0x6a0c1e, 1); for (let i = 0; i < 16; i++) g.fillEllipse(-360 + i * 48, -470, 60, 50);
    g.fillStyle(LOOK.gold, 1); g.fillRect(-380, -500, 760, 6);
  }

  // ------------------------------------------------------------------ THE PHANTOM MAESTRO
  /** His hits (BossArena.bhit), scaled by `HIT`. */
  bhit(id, x1, y1, x2, y2, dmg, [angle, base, growth], more) { return super.bhit(id, x1, y1, x2, y2, dmg * HIT.dmg, [angle, base * HIT.base, growth * HIT.growth], more); }
  /** The boss's own state when the fight starts: the hazards slower. */
  makeBoss() { this.cycle.gap = 1400; this.cycle.next = 1500; }
  /** The intro (and the UI layer THE MASK SLIPS cutscene flashes on). */
  startIntro(match) {
    super.startIntro(match);
    this.uiG = match.add.graphics().setDepth(39).setVisible(false); match.addUI(this.uiG);
  }
  /** After the intro: lights up, him whole and hovering. */
  endIntro() { super.endIntro(); const E = this.e; E.y = 0; E.alpha = 1; E.bow = 0; E.vanish = 0; E.lift = PH.hover; E.arms = 'idle'; this.lightsK = 1; this.spotK = 1; }
  /** His body's points this frame: feet (floating `lift` above the stage), hips, shoulders (leaning with `tilt` and `bow`), head, both hands. */
  body() {
    const E = this.e, d = E.dir;
    const ft = { x: E.x, y: E.y - E.lift };
    const hip = { x: ft.x - d * E.tilt * 10, y: ft.y - PH.leg * (1 - E.tilt * 0.15) };
    const sh = { x: hip.x + d * (2 + E.bow * 30 + E.tilt * 30), y: hip.y - PH.torso * (1 - E.bow * 0.35 - E.tilt * 0.2) };
    const head = { x: sh.x + d * (3 + E.bow * 22 + E.tilt * 14), y: sh.y - PH.head * 0.5 - 7 + E.bow * 26 + E.tilt * 8 };
    const [x1, y1, x2, y2] = E.hp;
    return { ft, hip, sh, head, hand: { x: sh.x + d * x1, y: sh.y + y1 }, hand2: { x: sh.x + d * x2, y: sh.y + y2 } };
  }
  /** Eases his hands toward the pose `E.arms` names (POSE), `k` of the way this frame. */
  poseStep(k = 0.3) { const E = this.e, P = POSE[E.arms] || POSE.idle; E.hp = E.hp.map((v, i) => v + (P[i] - v) * k); }
  /** What the camera and the CPU aim at: his head. */
  core() { const b = this.body(); return { x: b.head.x, y: b.head.y }; }
  /** Where he can be hit: his masked head (x1.2), his body (x0.9). Nothing while he's vanished into his cape. */
  hurt() {
    const E = this.e; if (E.alpha < 0.5 || E.vanish > 0.5) return [];
    const b = this.body();
    return [{ x1: b.head.x - 22, y1: b.head.y - 26, x2: b.head.x + 22, y2: b.head.y + 22, mult: 1.2, mask: true },
      { x1: Math.min(b.hip.x, b.sh.x) - 26, y1: b.sh.y, x2: Math.max(b.hip.x, b.sh.x) + 26, y2: b.ft.y, mult: 0.9 }];
  }
  /** His attacks: calm, then enraged (more dives and teleports). */
  pattern(phase) { return phase === 1 ? ['dive', 'roses', 'cape', 'flurry', 'chandelier', 'roses'] : ['dive', 'roses', 'cape', 'flurry', 'chandelier', 'dive', 'cape']; }
  rageLine() { return 'THE MASK SLIPS!'; }
  /** The death card's form: THE FINALE, unmasked, or masked. */
  cardForm() { return this.low ? 'low' : super.cardForm(); }
  /** How many (calm / enraged). */
  many(pair) { return pair[this.boss && this.boss.phase === 2 ? 1 : 0]; }
  /** Says something (a speech bubble) for `life` frames. */
  talk(text, life = 100) { this.say = { text, t: 0, life }; this.sayCD = 260 + Math.random() * 200; }
  /** A hit lands on him: a hit on the mask counts for UNMASKED (achievements.js); now and then he complains. */
  onHurt(match, r, d, o) {
    if (r && r.mask && o && !o.isCpu) match.stat('maskHits');
    if (this.sayCD <= 0 || (this.say && this.say.t > 40)) { if (Math.random() < 0.3) this.talk(SAY.hurt[Math.floor(Math.random() * SAY.hurt.length)], 70); }
  }
  /** His glide speed. */
  speed() { return this.boss && this.boss.phase === 2 ? PH.fast : PH.walk; }
  /** He glides toward x (clamped to the stage). Returns true once there. */
  walkTo(x, sp) { const E = this.e, dx = Phaser.Math.Clamp(x, -PH.range, PH.range) - E.x; if (Math.abs(dx) < 6) { E.vx = 0; return true; } E.dir = Math.sign(dx); const v = Math.sign(dx) * Math.min(Math.abs(dx), sp); E.x += v; E.vx = v; return false; }
  /** Turns him to face the nearest player; returns that player. */
  faceNearest(match) { const E = this.e, tg = this.nearest(match, E.x); if (tg) E.dir = Math.sign(tg.x - E.x) || E.dir; return tg; }
  /** At rest: he hovers, bobbing, drifts after you at a theatrical distance, and talks. */
  idle(match) {
    const E = this.e, tg = this.nearest(match, E.x);
    E.arms = 'idle'; E.tilt *= 0.85; E.lift += (PH.hover + Math.sin(this.t * 0.05) * 6 - E.lift) * 0.1; E.wrap *= 0.85;
    if (tg && Math.abs(tg.x - E.x) > 140) this.walkTo(tg.x - Math.sign(tg.x - E.x) * 110, this.speed() * 0.7); else { E.vx *= 0.8; if (tg) E.dir = Math.sign(tg.x - E.x) || E.dir; }
    if (this.sayCD <= 0 && !this.say) this.talk(SAY.idle[Math.floor(Math.random() * SAY.idle.length)]);
  }

  // ------------------------------------------------------------------ his attacks
  /** ROCKET DIVE: up out of sight, a mark finds you, then down at it like a comet - a shockwave where he lands. Once, twice enraged, three times in THE FINALE. */
  start_dive(match, a) { a.n = DIVE.n[this.low ? 2 : this.boss.phase - 1]; a.i = 0; a.t0 = 0; this.talk(SAY.moves.dive, 60); }
  /** ROCKET DIVE, frame by frame (see start_dive). */
  atk_dive(match, a, out) {
    const E = this.e, tt = a.t - a.t0, rise = this.sp(DIVE.rise), hang = this.sp(DIVE.hang);
    if (tt < rise) { E.arms = 'up'; E.lift += (520 - E.lift) * 0.14; E.flare = 1; E.vx = 0; if (tt === 1) { sfx('whoosh', 0.9, 0.7); sfx('laugh', 0.5, 0.7); } return false; }
    if (tt < rise + hang) {                                                          // out of sight: the mark tracks you
      const tg = this.nearest(match, this.mark ? this.mark.x : E.x);
      if (!this.mark) this.mark = { x: tg ? tg.x : 0, k: 0 };
      if (tg && tt < rise + hang - 12) this.mark.x += Phaser.Math.Clamp(Phaser.Math.Clamp(tg.x, -235, 235) - this.mark.x, -4.5, 4.5);
      this.mark.k = (tt - rise) / hang;
      if (tt === rise + hang - 12) sfx('ding', 0.6, 0.7);
      return false;
    }
    if (tt === rise + hang) {                                                        // the launch: from high up to one side, straight at the mark
      const side = this.mark.x > 0 ? -1 : 1; a.sx = Phaser.Math.Clamp(this.mark.x + side * 240, -320, 320); a.tx = this.mark.x;
      E.x = a.sx; E.lift = 440; E.dir = Math.sign(a.tx - a.sx) || 1; E.arms = 'dive'; E.tilt = 1;
      sfx('whoosh', 1, 0.5); sfx('flame', 0.6, 0.8);
    }
    if (!a.landed) {
      const dx = a.tx - E.x, dy = -E.lift, d = Math.hypot(dx, dy) || 1, sp = DIVE.speed * (this.boss.phase === 2 ? 1.15 : 1);
      if (d <= sp) { E.x = a.tx; E.lift = 0; a.landed = a.t; this.mark = null; sfx('bighit', 1, 0.6); sfx('thunder', 0.5, 1.2); match.shake(10, 12); for (let i = 0; i < 18; i++) match.particles.push({ x: E.x + (Math.random() - 0.5) * 40, y: -4, vx: (Math.random() - 0.5) * 7, vy: -Math.random() * 4, life: 30, color: i % 3 ? LOOK.rose : 0x000000, size: 3, grav: 0.2 }); }
      else { E.x += dx / d * sp; E.lift += -dy / d * -sp; if (a.t % 2 === 0) this.fx.push({ k: 'trail', x: E.x, y: E.y - E.lift - 60, life: 16 }); }
      const b = this.body(); out.push(this.bhit('dive' + a.id + a.i, Math.min(b.head.x, b.ft.x) - 28, b.head.y - 24, Math.max(b.head.x, b.ft.x) + 28, b.ft.y + 8, ...DIVE.hit, { dirX: E.dir }));
      return false;
    }
    const k = a.t - a.landed;
    if (k < 8) { const w = 60 + k * 14; out.push(this.bhit('dwl' + a.id + a.i, E.x - w, -18, E.x - 24, 0, ...DIVE.wave, { dirX: -1 }), this.bhit('dwr' + a.id + a.i, E.x + 24, -18, E.x + w, 0, ...DIVE.wave, { dirX: 1 })); }
    E.tilt *= 0.85; E.arms = 'idle';
    if (k > this.sp(26)) {
      if (a.i + 1 < a.n) { a.i++; a.t0 = a.t; a.landed = 0; return false; }
      E.lift += (PH.hover - E.lift) * 0.15; E.flare = 0;
      return k > this.sp(40);
    }
    return false;
  }

  /** ROSE THROW: he draws back and flicks a fan of roses at you - a rose that hits STUNS (enraged: a second fan). */
  start_roses(match) { this.faceNearest(match); this.talk(SAY.moves.roses, 60); }
  /** ROSE THROW, frame by frame. */
  atk_roses(match, a) {
    const E = this.e, w = this.sp(ROSES.wind), n = this.many(ROSES.n), throws = this.boss.phase === 2 ? 2 : 1;
    for (let j = 0; j < throws; j++) {
      const at = w + j * this.sp(34);
      if (a.t === at - w + 1 || (j && a.t === at - 12)) E.arms = 'throwBack';
      if (a.t === at) {
        E.arms = 'throw'; const tg = this.faceNearest(match), b = this.body(), base = tg ? Math.atan2(tg.y - 26 - b.hand.y, tg.x - b.hand.x) : (E.dir > 0 ? 0 : Math.PI);
        for (let i = 0; i < n; i++) { const ang = base + (i - (n - 1) / 2) * ROSES.spread; this.fx.push({ k: 'rose', x: b.hand.x, y: b.hand.y, vx: Math.cos(ang) * ROSES.speed, vy: Math.sin(ang) * ROSES.speed, spin: 0, life: 120, id: this.sid('rose') }); }
        sfx('swing', 0.8, 1.4); sfx('whoosh', 0.5, 1.6);
      }
    }
    return a.t > w + (throws - 1) * this.sp(34) + 40;
  }

  /** CAPE TELEPORT: he wraps himself in his cape and is gone in a swirl of petals, then unfurls right behind you with a sweep of the cape (twice enraged). */
  start_cape(match, a) { a.n = this.many(CAPE.n); a.i = 0; a.t0 = 0; this.talk(SAY.moves.cape, 60); }
  /** CAPE TELEPORT, frame by frame. */
  atk_cape(match, a, out) {
    const E = this.e, tt = a.t - a.t0, W = this.sp(CAPE.wrap), V = CAPE.vanish, G = this.sp(CAPE.gone), U = CAPE.unfurl, S = CAPE.sweep;
    if (tt < W) { E.arms = 'wrap'; E.wrap = Math.min(1, tt / W); if (tt === 1) sfx('whoosh', 0.6, 0.9); return false; }
    if (tt < W + V) { E.vanish = (tt - W) / V; if (tt === W) { sfx('curse', 0.6, 1.4); this.petals(match, E.x, E.y - E.lift - 70, 16); } return false; }
    if (tt < W + V + G) { E.vanish = 1; E.alpha = 0; return false; }
    if (tt === W + V + G) {                                                         // reappear behind you
      const tg = this.nearest(match, E.x), face = tg && tg.facing ? tg.facing : 1;
      E.x = Phaser.Math.Clamp(tg ? tg.x - face * CAPE.behind : E.x, -PH.range - 20, PH.range + 20); E.lift = 4; E.dir = tg ? Math.sign(tg.x - E.x) || E.dir : E.dir;
      E.alpha = 1; this.petals(match, E.x, E.y - E.lift - 70, 16); sfx('curse', 0.7, 1.1); if (a.i === 0) this.talk(SAY.appear, 50);
    }
    if (tt < W + V + G + U) { E.vanish = 1 - (tt - W - V - G) / U; E.wrap = E.vanish; return false; }
    E.vanish = 0; E.wrap = 0;
    if (tt < W + V + G + U + S) {                                                   // the sweep of the cape
      E.arms = 'spread'; E.flare = 1;
      if (tt === W + V + G + U) sfx('slash', 0.9, 0.8);
      const b = this.body(); out.push(this.bhit('cape' + a.id + a.i, E.dir > 0 ? b.hip.x - 10 : b.hip.x - 92, b.sh.y - 30, E.dir > 0 ? b.hip.x + 92 : b.hip.x + 10, b.ft.y + 4, ...CAPE.hit, { dirX: E.dir }));
      return false;
    }
    E.arms = 'idle'; E.flare = 0;
    if (tt > W + V + G + U + S + this.sp(20)) { if (a.i + 1 < a.n) { a.i++; a.t0 = a.t; return false; } return true; }
    return false;
  }

  /** PUNCH SEQUENCE: he glides in at you and throws a long flurry of punches that holds you in place, then a rising uppercut. */
  start_flurry(match, a) { this.faceNearest(match); this.talk(SAY.moves.flurry, 50); a.p = 0; a.n = this.many(FLURRY.n); }
  /** PUNCH SEQUENCE, frame by frame: the dash, the jabs, the uppercut. */
  atk_flurry(match, a, out) {
    const E = this.e, tg = this.nearest(match, E.x);
    if (!a.at) {                                                                    // the dash: lean in and glide fast
      E.arms = 'dive'; E.tilt = Math.min(0.7, E.tilt + 0.1); E.lift += (6 - E.lift) * 0.2; E.flare = 1;
      const near = tg && Math.abs(tg.x - E.x) < 46 && Math.abs(tg.y - E.y) < 90;
      if (tg && !near) this.walkTo(tg.x - Math.sign(tg.x - E.x) * 40, FLURRY.dash);
      if (near || a.t > FLURRY.chase) { a.at = a.t; E.vx = 0; if (tg) E.dir = Math.sign(tg.x - E.x) || E.dir; }
      return false;
    }
    const k = a.t - a.at, every = this.sp(FLURRY.every), jabsEnd = a.n * every, b = this.body();
    E.tilt *= 0.9;
    if (k < jabsEnd) {                                                              // the jabs, left, right, left...
      const i = Math.floor(k / every); E.arms = i % 2 ? 'jab2' : 'jab1';
      if (k % every === 0) { sfx('hit', 0.4, 1.3 + (i % 3) * 0.1); if (tg) E.x += Phaser.Math.Clamp(tg.x - E.dir * 34 - E.x, -2, 2); }
      if (k % every < 3) { const hx = E.dir > 0 ? b.sh.x + 6 : b.sh.x - 74; out.push(this.bhit('jab' + a.id + i, hx, b.sh.y - 16, hx + 68, b.sh.y + 30, ...FLURRY.jab, { dirX: E.dir, stun: FLURRY.hold })); }
      return false;
    }
    const u = k - jabsEnd, wind = this.sp(FLURRY.wind);
    if (u < wind) { E.arms = 'wrap'; E.lift = Math.max(0, E.lift - 1); return false; }
    if (u < wind + 10) {                                                            // the uppercut, rising
      E.arms = 'upper'; E.lift += 4; if (u === wind) { sfx('bighit', 0.8, 1.2); sfx('whoosh', 0.7, 1); }
      const hx = E.dir > 0 ? b.sh.x - 6 : b.sh.x - 56; out.push(this.bhit('upper' + a.id, hx, b.head.y - 40, hx + 62, b.sh.y + 30, ...FLURRY.upper, { dirX: E.dir }));
      return false;
    }
    E.arms = 'idle'; E.flare = 0;
    return u > wind + 10 + this.sp(30);
  }

  /** THE CHANDELIER: it swings out over you, following - then the rope gives and it falls, shattering into shards. */
  start_chandelier(match, a) { this.talk(SAY.moves.chandelier, 70); this.chand = { x: 0, y: -330, sw: 0, fall: false, at: this.sp(CHAND.swing), id: this.sid('chand') }; a.end = 0; }
  /** THE CHANDELIER, frame by frame (the fall itself is in stepFx). */
  atk_chandelier(match, a) {
    const C = this.chand, E = this.e; E.arms = 'up';
    if (C && !C.fall) { const tg = this.nearest(match, C.x); if (tg && a.t < C.at - 14) C.x += Phaser.Math.Clamp(tg.x - C.x, -3, 3); C.sw = Math.sin(this.t * 0.2) * (a.t < C.at - 14 ? 6 : 1); if (a.t % 30 === 0 && a.t < C.at) sfx('clocktick', 0.6, 1.2); if (a.t >= C.at) { C.fall = true; sfx('glass', 0.7, 0.6); } }
    if (!C && !a.end) a.end = a.t;
    return a.end && a.t > a.end + 40;
  }

  /** A puff of rose petals (cape teleports). */
  petals(match, x, y, n) { for (let i = 0; i < n; i++) match.particles.push({ x: x + (Math.random() - 0.5) * 40, y: y + (Math.random() - 0.5) * 80, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2, life: 50, color: i % 3 ? LOOK.rose : 0x2a0a10, size: 3, grav: 0.05, drag: 0.97 }); }

  /** Moves everything he's thrown one frame and pushes its hitboxes: roses (a hit STUNS), the dive trail, the chandelier and its shards. */
  stepFx(match, out) {
    for (const F of this.fx) {
      F.life--;
      if (F.k === 'rose') {
        if (F.stuck) continue;
        F.x += F.vx; F.y += F.vy; F.vy += F.rain ? 0.12 : 0.03; F.spin += 0.3;
        out.push(this.bhit(F.id, F.x - 9, F.y - 9, F.x + 9, F.y + 9, ...ROSES.hit, { dirX: Math.sign(F.vx) || 1, stun: ROSES.stun }));
        if (F.y >= -3) { F.y = -3; F.stuck = true; F.life = Math.min(F.life, 60); }
        if (Math.abs(F.x) > 340) F.life = 0;
      } else if (F.k === 'shard') { F.vy += 0.4; F.x += F.vx; F.y = Math.min(-6, F.y + F.vy); if (F.y >= -6) F.vy = -Math.abs(F.vy) * 0.5; out.push(this.bhit(F.id, F.x - 8, F.y - 8, F.x + 8, F.y + 8, ...CHAND.shard, { dirX: Math.sign(F.vx) || 1 })); if (Math.abs(F.x) > 300) F.life = 0; }
      else if (F.k === 'fallrose') { F.x += F.vx; F.y = Math.min(-4, F.y + F.vy); }
    }
    this.fx = this.fx.filter((F) => F.life > 0);
    const C = this.chand;
    if (C && C.fall) {
      C.y += CHAND.fall;
      out.push(this.bhit(C.id, C.x - CHAND.w / 2, C.y - 40, C.x + CHAND.w / 2, C.y + 20, ...CHAND.hit));
      if (C.y >= -20) { this.chand = null; sfx('glass', 1, 0.8); sfx('bighit', 0.8, 0.8); match.shake(10, 14); for (let i = 0; i < CHAND.shards; i++) this.fx.push({ k: 'shard', x: C.x, y: -20, vx: (i % 2 ? 1 : -1) * (2 + i * 0.6), vy: -4 - Math.random() * 3, life: 120, id: this.sid('shard') }); for (let i = 0; i < 20; i++) match.particles.push({ x: C.x, y: -10, vx: (Math.random() - 0.5) * 8, vy: -Math.random() * 6, life: 30, color: i % 2 ? 0xfff0c0 : 0xd0f0ff, size: 2, grav: 0.25 }); }
    }
  }
  /** Who's been STUNNED by a rose (their hitstun is a rose's): a ring of petals spins round their head while it lasts (drawn by drawFx). */
  watchDazed(match) {
    for (const f of match.fighters) {
      if (f.state === 'hitstun' && f.hitstun >= ROSES.stun - 2 && !this.dazed.has(f)) { this.dazed.set(f, ROSES.stun); match.popText(f, 'STUNNED!', '#ff4a6a'); }
      if (this.dazed.has(f)) { const n = this.dazed.get(f) - 1; if (n <= 0 || f.state !== 'hitstun') this.dazed.delete(f); else this.dazed.set(f, n); }
    }
  }

  // ------------------------------------------------------------------ THE MASK SLIPS (half health)
  /** Half health. With a player watching: THE MASK SLIPS cutscene (cutStep). Without (the sim): the mask shatters and the roof tears away. */
  onRage(match) {
    this.fx = this.fx.filter((F) => F.k === 'fallrose'); this.chand = null; this.mark = null; const E = this.e; E.vanish = 0; E.alpha = 1; E.wrap = 0;
    if (this.uiG) { const cam = match.worldCam || match.cameras.main; this.cut = { t: 0, n: STORM.n, once: new Set() }; this.ccam = { x: cam.midPoint.x, y: cam.midPoint.y, zoom: cam.zoom }; this.rageText.setVisible(false); this.boss.rage = 0; return; }
    this.breakMask(match); this.tearRoof(match);
  }
  /** The mask cracks and falls away in pieces - the burning eye beneath. */
  breakMask(match) {
    const b = this.body(); this.e.mask = 0; sfx('glass', 1, 0.9); sfx('roar', 0.6, 1.1); match.shake(8, 14);
    for (let i = 0; i < 14; i++) match.particles.push({ x: b.head.x + this.e.dir * 6, y: b.head.y - 4, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 3, life: 50, color: i % 3 ? LOOK.mask : 0xc8c8c0, size: 3, grav: 0.25 });
  }
  /** The storm: the dome rips away into the sky, rain starts. */
  tearRoof(match) {
    this.storm = 1; this.R.faces = this.R.faces.filter((f) => f.k !== 'roof'); this.R.fog = 0x10141e; this.paintSky();
    sfx('thunder', 1, 0.8); sfx('roar', 0.6, 0.9); this.flash = 14; match.shake(14, 30);
    for (let i = 0; i < 80; i++) this.rain.push({ x: (Math.random() - 0.5) * 900, y: -600 + Math.random() * 700, v: 9 + Math.random() * 5 });
  }
  /** The cutscene camera (MatchScene asks introCam): eased toward `cut.shot`. */
  introCam() {
    if (!this.cut) return super.introCam();
    const w = this.cut.shot || { x: 0, y: -120, zoom: 1 }; this.ccam = { x: lerp(this.ccam.x, w.x, 0.08), y: lerp(this.ccam.y, w.y, 0.08), zoom: lerp(this.ccam.zoom, w.zoom, 0.08) };
    return { ...this.ccam, exact: true };
  }
  /** A fresh press skips to the storm. */
  skipCut(match) { if (this.e.mask) this.breakMask(match); if (!this.storm) this.tearRoof(match); this.endStorm(); }
  /**
   * THE MASK SLIPS: he touches his mask - YOU WANTED TO SEE MY FACE? - it cracks, and shatters, a burning eye beneath;
   * he flings his cape wide - THEN LOOK!! - lightning, and the dome tears away into a storm; rain pours onto the stage.
   */
  cutStep(match) {
    const C = this.cut, t = ++C.t, E = this.e, b = this.body(); this.t++;
    const once = (k, at) => t >= at && !C.once.has(k) && !!C.once.add(k);
    if (once('line', 1)) { this.talk(SAY.rage, 110); sfx('clang', 0.6, 0.6); }
    if (this.say) this.say.t++;
    E.arms = t < STORM.crack ? 'wrap' : t < STORM.tear - 10 ? 'idle' : 'spread'; E.flare = t > STORM.tear - 10 ? 1 : 0; E.lift = PH.hover + (t > STORM.tear ? Math.min(30, (t - STORM.tear) * 0.5) : 0);
    this.poseStep(0.2);
    C.shot = t < STORM.tear - 10 ? { x: b.head.x, y: b.head.y + 10, zoom: 1.9 } : { x: 0, y: -200, zoom: 0.85 };
    if (t > 30 && t < STORM.crack && t % 15 === 0) { sfx('glass', 0.3, 1.6); match.shake(2, 6); }
    if (once('crack', STORM.crack)) this.breakMask(match);
    if (once('tear', STORM.tear)) { this.tearRoof(match); this.talk(SAY.storm, 90); }
    this.stepRain();
    if (this.uiG) { const g = this.uiG; g.clear(); g.setVisible(this.flash > 0); if (this.flash > 0) { g.fillStyle(0xffffff, this.flash / 14); g.fillRect(0, 0, VIEW_W, 360); } if (this.flash > 0) this.flash--; }
    if (t >= C.n) this.endStorm();
  }
  /** THE MASK SLIPS is over: back to the fight in the storm. */
  endStorm() { this.cut = null; if (this.uiG) this.uiG.setVisible(false); this.rageText.setText('THE MASK SLIPS!').setVisible(true); this.boss.rage = 90; this.boss.wait = 30; this.e.lift = PH.hover; this.e.flare = 0; }
  /** THE FINALE (low health): three dives at a time, and roses rain from the flies. */
  startLow(match) { this.low = true; this.talk(SAY.low, 110); this.rageText.setText('THE FINAL ACT!'); this.boss.rage = 100; sfx('thunder', 1, 0.7); match.shake(10, 20); }
  /** The rain: streaks falling, wrapping round. */
  stepRain() { for (const r of this.rain) { r.y += r.v; r.x -= 1.5; if (r.y > 60) { r.y = -600; r.x = (Math.random() - 0.5) * 900; } } }

  /** You lost: he bows low to the ghostly audience, cape wide, roses flying (BossArena.bossTaunt). */
  onGloat(match, t) { const E = this.e; E.arms = t % 160 < 80 ? 'bow' : 'spread'; E.bow = E.arms === 'bow' ? Math.min(1, E.bow + 0.05) : Math.max(0, E.bow - 0.05); E.vanish = 0; E.alpha = 1; this.poseStep(); if (t === 1) this.talk(SAY.gloat, 400); if (t % 12 === 0) this.fx.push({ k: 'fallrose', x: (Math.random() - 0.5) * 400, y: -400, vx: (Math.random() - 0.5), vy: 2, life: 200 }); for (const F of this.fx) if (F.k === 'fallrose') { F.x += F.vx; F.y = Math.min(-4, F.y + F.vy); F.life--; } }

  // ------------------------------------------------------------------ the death: THE FINAL BOW
  /** Health gone: everything he threw is cleared; he starts his final bow. */
  onDeath() { this.fx = []; this.chand = null; this.mark = null; this.e.vanish = 0; this.e.alpha = 1; this.talk('...BRAVO. THE FINAL ACT... IS YOURS.', 150); }
  /** THE FINAL BOW: his arms flung up for the last chord (thunder), he sinks to the stage and bows low, roses rain down from the boxes, and the great red curtain falls over him. */
  stepDeath(match) {
    const B = this.boss, E = this.e, f = B.dying;
    E.lift = Math.max(0, E.lift - 0.5);
    if (f < 40) { E.arms = 'up'; if (f === 2) { sfx('thunder', 0.9, 0.7); this.flash = 10; } }
    else { E.arms = 'bow'; E.bow = Math.min(1, E.bow + 0.06); if (f % 4 === 0) this.fx.push({ k: 'fallrose', x: E.x + (Math.random() - 0.5) * 300, y: -400, vx: (Math.random() - 0.5), vy: 2.5 + Math.random(), life: 200 }); }
    this.poseStep();
    if (f === 60) sfx('laugh', 0.4, 0.6);
    E.curtain = Math.max(0, (f - 80) / 60);
    for (const F of this.fx) if (F.k === 'fallrose') { F.x += F.vx; F.y = Math.min(-4, F.y + F.vy); F.life--; }
    if (this.say && ++this.say.t > this.say.life) this.say = null;
  }

  // ------------------------------------------------------------------ the entrance
  /**
   * THE ENTRANCE (k = 0..1): the dark house; the ghostly audience murmurs; the footlights come up one by one; a single
   * spotlight on the empty stage. Rose petals swirl up in it, a cape unfurls out of nothing - and he is there, cape
   * flung wide; lightning flashes through the dome: WELCOME... TO MY OPERA.
   */
  introPose(match, k, t, n) {
    this.t++;
    const E = this.e, e = (a, b) => Phaser.Math.Clamp((k - a) / (b - a), 0, 1);
    this.lightsK = e(0.05, 0.35); this.spotK = e(0.35, 0.45);
    E.x = 60; E.y = 0; E.dir = -1; E.bow = 0; E.tilt = 0; E.lift = PH.hover + 4 * Math.sin(t * 0.05);
    const v = 1 - e(0.5, 0.66); E.vanish = v; E.alpha = v >= 1 ? 0 : 1; E.wrap = v;
    E.arms = k < 0.68 ? 'wrap' : k < 0.84 ? 'spread' : 'idle'; E.flare = k > 0.68 && k < 0.84 ? 1 : 0;
    this.poseStep(0.15);
    if (t === Math.round(0.47 * n)) { sfx('curse', 0.7, 1); this.petals(match, E.x, -80, 24); }
    if (t === Math.round(0.68 * n)) { sfx('thunder', 1, 0.8); this.flash = 12; match.shake(8, 12); }
    if (t === Math.round(0.84 * n)) this.talk(SAY.intro, 140);
    if (t === Math.round(0.36 * n)) sfx('clang', 0.4, 0.6);
    if (this.say) this.say.t++;
    if (this.flash > 0) this.flash--;
  }
  /** The entrance's camera: wide on the dark house, onto the spotlight as he appears, close as he speaks. */
  introShot(k) { const c = this.core(); return k < 0.35 ? { x: 0, y: -170, zoom: 0.85 } : k < 0.66 ? { x: 60, y: -110, zoom: 1.3 } : k < 0.8 ? { x: 30, y: -150, zoom: 1.0 } : { x: c.x - 20, y: c.y + 40, zoom: 1.4 }; }
  /** The freeze frame: him, cape settling. */
  introAt() { const c = this.core(); return { x: c.x - 40, y: c.y + 50, zoom: 1.25 }; }

  // ------------------------------------------------------------------ hazards (VS too)
  start_sandbag(match, h) { h.title = 'SANDBAG!'; const tg = this.nearest(match); h.x = Phaser.Math.Clamp(tg ? tg.x : 0, -235, 235); }
  /** SANDBAG: a counterweight sandbag swings loose up in the fly tower over a mark, then drops. */
  step_sandbag(match, h, out) {
    if (h.t < SAND.warn) { this.sand = { x: h.x, k: h.t / SAND.warn }; return false; }
    const y = -440 + (h.t - SAND.warn) * 15; this.sand = { x: h.x, y };
    out.push(this.bhit('sand' + h.id, h.x - 16, y - 20, h.x + 16, y + 12, ...SAND.hit));
    if (y >= -10) { this.sand = null; sfx('bighit', 0.6, 0.8); match.shake(4, 6); for (let i = 0; i < 10; i++) match.particles.push({ x: h.x, y: -4, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 2, life: 30, color: 0xc8b080, size: 2, grav: 0.1 }); return true; }
    return false;
  }
  start_smoke(match, h) { h.title = 'TRAPDOOR SMOKE!'; h.x = [-160, -40, 80, 180][Math.floor(Math.random() * 4)]; }
  /** TRAPDOOR SMOKE: a trap in the stage floor rattles, then blasts a column of stage smoke that pushes you up. */
  step_smoke(match, h, out) {
    this.smoke = { x: h.x, k: Math.min(1, h.t / SMOKE.warn), on: h.t >= SMOKE.warn };
    if (h.t >= SMOKE.warn) { out.push(this.bhit('smoke' + h.id, h.x - 26, -200, h.x + 26, 0, ...SMOKE.hit)); if (h.t === SMOKE.warn) sfx('geyser', 0.7, 0.8); if (h.t % 2 === 0) match.particles.push({ x: h.x + (Math.random() - 0.5) * 30, y: -4, vx: (Math.random() - 0.5), vy: -3 - Math.random() * 3, life: 50, color: 0xd8d0e0, size: 7, grav: -0.02, drag: 0.96 }); }
    if (h.t >= SMOKE.warn + SMOKE.dur) { this.smoke = null; return true; }
    return false;
  }

  // ------------------------------------------------------------------ the frame
  /** Moves the opera and THE PHANTOM one frame; returns hazard + boss hitboxes. */
  step(match) {
    this.t++;
    const out = [];
    if (this.hazardsOn) this.cycle.run(match, out);
    if (this.storm) this.stepRain();
    if (this.flash > 0) this.flash--;
    if (this.boss) {
      const B = this.boss;
      if (!B.dying) { this.watchHits(match); this.watchDazed(match); }
      this.bossStep(match, out);
      if (!B.dying) this.poseStep();
      if (!this.low && !B.dying && !this.cut && B.phase === 2 && B.hp <= B.max * LOW.at) this.startLow(match);
      if (this.low && !B.dying && !match.over && this.t % LOW.every === 0) for (let i = 0; i < LOW.roses; i++) this.fx.push({ k: 'rose', rain: true, x: (Math.random() - 0.5) * 480, y: -420 - i * 40, vx: (Math.random() - 0.5), vy: 2, spin: 0, life: 200, id: this.sid('rr') });
      if (!B.dying) this.stepFx(match, out);
      if (this.sayCD > 0) this.sayCD--;
      if (this.say && ++this.say.t > this.say.life) this.say = null;
    }
    return out;
  }
  /** When one of his strikes lands on a player, he's delighted (now and then). */
  watchHits(match) {
    if (match.over) return;
    for (const f of match.fighters) { const p = this.prev.get(f) ?? f.percent; if (f.percent > p + 6 && Math.random() < 0.25 && (!this.say || this.say.t > 40)) this.talk(SAY.hit[Math.floor(Math.random() * SAY.hit.length)], 60); this.prev.set(f, f.percent); }
  }

  // ------------------------------------------------------------------ drawing
  /** Draws the house, the stage, the Phantom, the things he throws, the final curtain, the bar. */
  render() {
    const B = this.boss, lit = this.lightsK ?? 1;
    this.R.fog = this.storm ? 0x10141e : mix(0x020102, 0x1a0610, lit);
    this.R.render([]); this.drawCurtains(this.curtainG); this.drawArena(this.arenaG);
    this.arenaG.setAlpha(0.25 + 0.75 * lit); this.curtainG.setAlpha(0.3 + 0.7 * lit);
    this.backG.clear(); this.condG.clear(); this.fxG.clear(); this.finalG.clear(); this.bubG.clear(); this.bubT.setVisible(false); this.popT.setVisible(false);
    if (lit < 1) { this.backG.fillStyle(0x000000, 0.75 * (1 - lit)); this.backG.fillRect(-900, -900, 1800, 1300); }
    if (this.intro && this.spotK) { const g = this.backG; g.fillStyle(0xfff0c0, 0.16 * this.spotK); g.fillTriangle(52, -440, 68, -440, 120, 0); g.fillTriangle(52, -440, 0, 0, 120, 0); g.fillStyle(0xfff0c0, 0.2 * this.spotK); g.fillEllipse(60, -2, 120, 14); }
    if (B) this.drawPhantom(this.condG, this.backG);
    this.drawFx(this.fxG);
    if (this.e.curtain > 0) this.drawFinalCurtain(this.finalG, this.e.curtain);
    if (this.say && B) this.drawBubble();
    if (B) this.drawBar();
  }
  /** His health bar: a row of tiny roses along it. */
  barStyle(g, x, y, w, h, k) { for (let i = 8; i < w * k; i += 16) { g.fillStyle(0x2a0a10, 0.6); g.fillCircle(x + i, y + h / 2, 2.4); g.fillStyle(0xff4a6a, 0.8); g.fillCircle(x + i, y + h / 2, 1.6); } }
  /**
   * THE PHANTOM: a vast black cape lined in crimson streaming behind him (`back`; flared out when he moves, spread wide
   * like wings in the `spread` pose, wrapped round him for the teleport) with a high stiff collar; long legs in black;
   * a tailcoat over a white shirt front, black bow tie, a red rose in the lapel; white-gloved hands; slicked-back black
   * hair with a widow's peak; a gaunt face with a white porcelain half-mask over the front half, a gold eye glowing in
   * its eye hole - or, unmasked, a dark scarred half with a burning ember eye and cracks of fire. Vanishing: he shrinks
   * into a spinning swirl of cape and petals.
   */
  drawPhantom(g, back) {
    const E = this.e, d = E.dir, t = this.t, b = this.body(), fl = this.boss && this.boss.flash > 0, ink = LOOK.ink, V = E.vanish;
    const A = E.alpha * (1 - V);
    if (V > 0 && V < 1 || (V >= 1 && E.alpha > 0)) {                                   // the swirl of cape he vanishes into / appears out of
      const cx = b.hip.x, cy = (b.hip.y + b.sh.y) / 2, r = 70 * (1 - V * 0.8);
      for (let i = 0; i < 3; i++) { const a0 = t * 0.4 + i * 2.1; back.fillStyle(i % 2 ? LOOK.lining : LOOK.suit, 0.85 * (1 - V * 0.6)); back.slice(cx, cy, r - i * 12, a0, a0 + 2.2, false); back.fillPath(); }
    }
    if (A < 0.02) return;
    const col = (c) => (fl ? 0xffffff : c);
    const limb = (p, q, w, c, gg = g) => { gg.lineStyle(w + 4, ink, A); gg.lineBetween(p.x, p.y, q.x, q.y); gg.lineStyle(w, col(c), A); gg.lineBetween(p.x, p.y, q.x, q.y); gg.lineStyle(0); };
    const blob = (x, y, rx, ry, c, gg = g) => { gg.fillStyle(ink, A); gg.fillEllipse(x, y, rx * 2 + 4, ry * 2 + 4); gg.fillStyle(col(c), A); gg.fillEllipse(x, y, rx * 2, ry * 2); };
    const poly = (gg, pts, c, a = A) => { gg.fillStyle(c, a); gg.fillPoints(pts, true); };
    // the cape: from both shoulders, streaming back and down past his heels, its hem rippling; lining inside
    const flow = Math.min(1, Math.abs(E.vx) / 4) + E.flare * 0.8 + (this.storm ? 0.3 : 0), wave = (i) => Math.sin(t * 0.12 + i * 1.3) * (6 + flow * 8);
    const shL = { x: b.sh.x - d * 22, y: b.sh.y - 4 }, shR = { x: b.sh.x + d * 18, y: b.sh.y - 2 };
    if (E.arms === 'spread') {                                                      // flung wide like wings, the edges in his hands
      const hem = []; for (let i = 0; i <= 8; i++) { const q = i / 8, x = lerp(b.hand2.x - d * 10, b.hand.x + d * 10, q); hem.push({ x, y: b.ft.y + 10 + Math.sin(q * Math.PI * 4 + t * 0.2) * 6 }); }
      poly(back, [{ x: b.hand2.x, y: b.hand2.y }, shL, shR, { x: b.hand.x, y: b.hand.y }, ...hem.slice().reverse()].map((p) => ({ x: p.x, y: p.y })), ink);
      poly(back, [{ x: b.hand2.x, y: b.hand2.y + 3 }, shL, shR, { x: b.hand.x, y: b.hand.y + 3 }, ...hem.slice().reverse().map((p) => ({ x: p.x, y: p.y - 3 }))], col(LOOK.lining));
      for (let i = 1; i < 8; i++) { const p = hem[i]; back.lineStyle(1, 0x000000, 0.25 * A); back.lineBetween(p.x, p.y - 3, lerp(shL.x, shR.x, i / 8), b.sh.y + 6); } back.lineStyle(0);
    } else {
      const tail = { x: b.ft.x - d * (58 + flow * 50), y: b.ft.y + 8 - flow * 30 }, mid = { x: b.hip.x - d * (44 + flow * 30), y: b.hip.y + 10 };
      const outer = [shL, { x: mid.x - d * 8 + wave(1), y: mid.y }, { x: tail.x - d * 6, y: tail.y + wave(2) * 0.6 }, { x: tail.x + d * 20, y: b.ft.y + 12 + wave(3) * 0.4 }, { x: b.ft.x + d * 12, y: b.ft.y + 14 }, shR];
      poly(back, outer.map((p) => ({ x: p.x + (p.x - b.hip.x) * 0.04, y: p.y + 2 })), ink);
      poly(back, outer, col(LOOK.suit));
      poly(back, [shL, { x: mid.x + wave(1) * 0.6, y: mid.y }, { x: tail.x + d * 4, y: tail.y + wave(2) * 0.6 - 4 }, { x: tail.x + d * 22, y: b.ft.y + 8 }], col(LOOK.lining));   // the lining, where it turns over
      for (let i = 0; i < 3; i++) { back.lineStyle(1.5, 0x2a2a3a, 0.6 * A); back.lineBetween(lerp(shL.x, shR.x, 0.3 + i * 0.2), b.sh.y + 4, lerp(tail.x, b.ft.x, 0.2 + i * 0.25), b.ft.y + 8); } back.lineStyle(0);
    }
    // the high collar standing up behind his head
    poly(back, [{ x: b.sh.x - d * 18, y: b.sh.y + 2 }, { x: b.head.x - d * 24, y: b.head.y - 20 }, { x: b.head.x - d * 6, y: b.head.y - 4 }, { x: b.sh.x + d * 12, y: b.sh.y + 2 }], ink);
    poly(back, [{ x: b.sh.x - d * 16, y: b.sh.y }, { x: b.head.x - d * 21, y: b.head.y - 16 }, { x: b.head.x - d * 7, y: b.head.y - 2 }, { x: b.sh.x + d * 10, y: b.sh.y }], col(LOOK.lining));
    // legs and patent shoes (dangling a little when he's high)
    const dangle = Math.min(1, E.lift / 80);
    for (const s of [-1, 1]) { const foot = { x: b.ft.x + s * 8 - d * dangle * 8, y: b.ft.y - 4 + dangle * 4 }, knee = { x: (b.hip.x + foot.x) / 2 + d * 3, y: (b.hip.y + foot.y) / 2 }; limb({ x: b.hip.x + s * 5, y: b.hip.y }, knee, 11, LOOK.suit); limb(knee, foot, 10, LOOK.suit); blob(foot.x + d * 7, foot.y + 1, 12, 5, 0x0a0a10); g.fillStyle(0xffffff, 0.7 * A); g.fillEllipse(foot.x + d * 10, foot.y - 1, 6, 2); }
    // the back arm
    const e2 = { x: (b.sh.x + b.hand2.x) / 2 - d * 4, y: (b.sh.y + b.hand2.y) / 2 + 6 }; limb(b.sh, e2, 10, mix(LOOK.suit, 0x000000, 0.2)); limb(e2, b.hand2, 9, mix(LOOK.suit, 0x000000, 0.2)); blob(b.hand2.x, b.hand2.y, 6, 6, LOOK.glove);
    // the torso: tailcoat, white shirt front, bow tie, the rose in his lapel
    const J = [{ x: b.sh.x - 19, y: b.sh.y - 2 }, { x: b.sh.x + 19, y: b.sh.y - 2 }, { x: b.hip.x + 15, y: b.hip.y }, { x: b.hip.x - 15, y: b.hip.y }];
    poly(g, J.map((p) => ({ x: p.x + (p.x > b.hip.x ? 2 : -2), y: p.y + (p.y < b.hip.y ? -2 : 2) })), ink); poly(g, J, col(LOOK.suit));
    poly(g, [{ x: b.sh.x - 7, y: b.sh.y }, { x: b.sh.x + 7, y: b.sh.y }, { x: (b.sh.x + b.hip.x) / 2 + 3, y: (b.sh.y + b.hip.y) / 2 + 10 }, { x: (b.sh.x + b.hip.x) / 2 - 3, y: (b.sh.y + b.hip.y) / 2 + 10 }], col(LOOK.shirt));
    for (const s of [-1, 1]) poly(g, [{ x: b.sh.x, y: b.sh.y + 4 }, { x: b.sh.x + s * 8, y: b.sh.y }, { x: b.sh.x + s * 8, y: b.sh.y + 8 }], ink);   // the bow tie
    for (const q of [0.4, 0.55, 0.7]) { g.fillStyle(ink, A); g.fillCircle(lerp(b.sh.x, b.hip.x, q), lerp(b.sh.y, b.hip.y, q), 1.3); }   // shirt studs
    const rs = { x: b.sh.x + d * 12, y: b.sh.y + 10 }; g.fillStyle(0x2a6a2a, A); g.fillTriangle(rs.x, rs.y + 2, rs.x - d * 6, rs.y + 9, rs.x - d * 2, rs.y + 3); g.fillStyle(ink, A); g.fillCircle(rs.x, rs.y, 5.5); g.fillStyle(col(LOOK.rose), A); g.fillCircle(rs.x, rs.y, 4.5); g.fillStyle(0xff4a6a, A); g.fillCircle(rs.x - 1, rs.y - 1, 2);
    // the head: neck, slicked hair with a widow's peak, the gaunt face
    const hx = b.head.x, hy = b.head.y;
    limb({ x: b.sh.x + d * 2, y: b.sh.y - 2 }, { x: hx, y: hy + 12 }, 8, LOOK.skin);
    const face = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; face.push({ x: hx + d * 2 + Math.cos(a) * 14, y: hy + Math.sin(a) * (Math.sin(a) > 0 ? 23 : 19) }); }
    poly(g, face.map((p) => ({ x: hx + d * 2 + (p.x - hx - d * 2) * 1.14, y: hy + (p.y - hy) * 1.1 })), ink); poly(g, face, col(LOOK.skin));
    poly(g, [{ x: hx - d * 13, y: hy - 6 }, { x: hx - d * 14, y: hy - 18 }, { x: hx - d * 4, y: hy - 25 }, { x: hx + d * 12, y: hy - 22 }, { x: hx + d * 16, y: hy - 12 }, { x: hx + d * 6, y: hy - 15 }, { x: hx + d * 2, y: hy - 10 }, { x: hx - d * 2, y: hy - 15 }, { x: hx - d * 9, y: hy - 12 }], col(LOOK.hair));   // slicked back, a widow's peak
    g.fillStyle(0xffffff, 0.25 * A); g.fillRect(hx - d * 8 - 2, hy - 22, 8, 1.5);
    g.fillStyle(0x000000, 0.14 * A); g.fillTriangle(hx - d * 9, hy - 2, hx + d * 1, hy + 6, hx - d * 7, hy + 16);   // a hollow cheek
    // the far eye (always bare): pale, piercing
    g.fillStyle(0xffffff, A); g.fillEllipse(hx - d * 3, hy - 5, 6, 3.5); g.fillStyle(ink, A); g.fillCircle(hx - d * 2, hy - 5, 1.4);
    g.fillStyle(col(LOOK.hair), A); g.fillPoints([{ x: hx - d * 8, y: hy - 10 }, { x: hx + d * 1, y: hy - 8 }, { x: hx + d * 1, y: hy - 7 }, { x: hx - d * 8, y: hy - 8 }], true);
    g.fillStyle(ink, A); g.fillRect(hx - (d > 0 ? 4 : 4), hy + 12, 8, 1.5);                     // a thin, cruel mouth
    if (this.say && this.say.t < this.say.life) { g.fillStyle(0x3a0a10, A); g.fillEllipse(hx + d * 1, hy + 13, 7, 3 + Math.abs(Math.sin(t * 0.5)) * 3); }
    // the near half: the porcelain mask - or what's under it
    const mk = [{ x: hx + d * 2, y: hy - 22 }, { x: hx + d * 14, y: hy - 19 }, { x: hx + d * 18, y: hy - 6 }, { x: hx + d * 16, y: hy + 9 }, { x: hx + d * 8, y: hy + 6 }, { x: hx + d * 2, y: hy + 2 }];
    if (E.mask) {
      poly(g, mk.map((p) => ({ x: p.x + d * 1, y: p.y + 1 })), ink); poly(g, mk, col(LOOK.mask));
      g.fillStyle(0xd8d8d0, A); g.fillPoints([mk[2], mk[3], mk[4]], true);
      g.fillStyle(ink, A); g.fillEllipse(hx + d * 9, hy - 6, 8, 5); g.fillStyle(LOOK.gold, A); g.fillCircle(hx + d * 9, hy - 6, 1.8);   // the eye hole, a gold eye glowing in it
      g.fillStyle(LOOK.gold, 0.25 * A); g.fillCircle(hx + d * 9, hy - 6, 5);
      g.lineStyle(1, LOOK.gold, 0.7 * A); g.lineBetween(hx + d * 4, hy - 18, hx + d * 12, hy - 15); g.lineStyle(0);   // (gold filigree)
    } else {
      poly(g, mk, 0x1a0a0e); g.fillStyle(LOOK.ember, A); g.fillCircle(hx + d * 9, hy - 6, 3); g.fillStyle(0xffe080, A); g.fillCircle(hx + d * 9, hy - 6, 1.4);
      g.fillStyle(LOOK.ember, 0.25 * A); g.fillCircle(hx + d * 9, hy - 6, 9 + Math.sin(t * 0.3) * 2);
      g.lineStyle(1, LOOK.ember, 0.8 * A); g.lineBetween(hx + d * 5, hy - 18, hx + d * 9, hy - 10); g.lineBetween(hx + d * 12, hy, hx + d * 15, hy + 7); g.lineBetween(hx + d * 4, hy - 2, hx + d * 8, hy + 4); g.lineStyle(0);
    }
    // the front arm and glove
    const el = { x: (b.sh.x + b.hand.x) / 2 + d * 2, y: (b.sh.y + b.hand.y) / 2 + 8 };
    limb(b.sh, el, 10, LOOK.suit); limb(el, b.hand, 9, LOOK.suit);
    g.fillStyle(col(0xffffff), A); g.fillCircle(el.x + (b.hand.x - el.x) * 0.85, el.y + (b.hand.y - el.y) * 0.85, 4);   // shirt cuff
    blob(b.hand.x, b.hand.y, 6.5, 6.5, LOOK.glove);
    // wrapped in his cape (the teleport): it closes over him from both sides
    if (E.wrap > 0.02) { const w = E.wrap; poly(g, [shL, shR, { x: b.ft.x + d * 16 * w, y: b.ft.y + 10 }, { x: b.ft.x - d * 22, y: b.ft.y + 10 }], col(LOOK.suit), A * w); poly(g, [shR, { x: lerp(shR.x, b.ft.x + d * 16, 0.5), y: b.hip.y }, { x: b.ft.x + d * 16 * w, y: b.ft.y + 10 }], col(LOOK.lining), A * w * 0.6); }
  }
  /** The things he throws and their marks: the dive's mark and trail, roses (in flight, stuck in the stage, raining), the stunned petals, the chandelier, shards, rain, flashes, the hazards. */
  drawFx(g) {
    const t = this.t, ink = LOOK.ink;
    if (this.mark) { const M = this.mark, k = M.k; g.fillStyle(LOOK.rose, 0.15 + 0.3 * k); g.fillEllipse(M.x, -2, 60, 12); g.lineStyle(2, LOOK.rose, 0.7); g.strokeEllipse(M.x, -2, 60 * (1.6 - k * 0.6), 12 * (1.6 - k * 0.6)); g.lineStyle(0); g.fillStyle(LOOK.rose, 0.06 + 0.1 * k); g.fillRect(M.x - 24, -440, 48, 440); }
    for (const F of this.fx) {
      if (F.k === 'trail') { const a = F.life / 16; g.fillStyle(LOOK.lining, 0.35 * a); g.fillEllipse(F.x, F.y, 40 * a + 10, 70 * a + 10); g.fillStyle(0x000000, 0.4 * a); g.fillEllipse(F.x, F.y, 26 * a + 6, 50 * a + 6); }
      else if (F.k === 'rose' || F.k === 'fallrose') {
        const a = F.stuck ? -1.2 : F.spin || 0, c = Math.cos(a), s = Math.sin(a);
        g.lineStyle(2, 0x2a6a2a, 1); g.lineBetween(F.x, F.y, F.x - c * 14, F.y - s * 14); g.lineStyle(0);
        g.fillStyle(0x2a6a2a, 1); g.fillTriangle(F.x - c * 7, F.y - s * 7, F.x - c * 7 - s * 5, F.y - s * 7 + c * 5, F.x - c * 10, F.y - s * 10);
        g.fillStyle(ink, 1); g.fillCircle(F.x, F.y, 6); g.fillStyle(LOOK.rose, 1); g.fillCircle(F.x, F.y, 5); g.fillStyle(0xff3a5a, 1); g.fillCircle(F.x - 1, F.y - 1, 2.5); g.fillStyle(0x8a0a1a, 1); g.fillCircle(F.x + 1.5, F.y + 1, 1.5);
        if (!F.stuck && t % 6 < 3) { g.fillStyle(0xffffff, 0.8); g.fillRect(F.x + 4, F.y - 6, 2, 2); }
      }
      else if (F.k === 'shard') { g.fillStyle(0xd0f0ff, 1); g.fillTriangle(F.x, F.y - 9, F.x + 6, F.y + 5, F.x - 6, F.y + 5); g.fillStyle(0xffffff, 1); g.fillTriangle(F.x, F.y - 9, F.x + 2, F.y + 2, F.x - 3, F.y); }
    }
    for (const [f] of this.dazed) {                                                       // STUNNED: petals circling their head
      for (let i = 0; i < 4; i++) { const a = t * 0.15 + i * Math.PI / 2, x = f.x + Math.cos(a) * 16, y = f.y - 62 + Math.sin(a) * 5; g.fillStyle(i % 2 ? LOOK.rose : 0xff7a9a, 1); g.fillEllipse(x, y, 7, 4); }
    }
    const C = this.chand;                                                                // the chandelier: gilded tiers of crystal and candle flames on a rope
    if (C) {
      const x = C.x + C.sw, y = C.y;
      if (!C.fall) { g.lineStyle(3, 0x8a6a3a, 1); g.lineBetween(C.x, -520, x, y - 40); g.lineStyle(0); g.fillStyle(0xfff0c0, 0.15 + 0.1 * (t % 10 < 5 ? 1 : 0)); g.fillEllipse(C.x, -2, CHAND.w + 20, 12); }
      g.fillStyle(LOOK.gold, 1); g.fillEllipse(x, y - 30, 40, 10); g.fillEllipse(x, y, CHAND.w, 14); g.fillRect(x - 3, y - 40, 6, 44);
      for (let i = 0; i < 9; i++) { const cx = x - CHAND.w / 2 + 4 + i * (CHAND.w - 8) / 8; g.fillStyle(0xd0f0ff, 0.9); g.fillTriangle(cx - 3, y + 6, cx + 3, y + 6, cx, y + 18 + (i % 3) * 4); g.fillStyle(0xfff8e0, 1); g.fillRect(cx - 1.5, y - 10, 3, 8); g.fillStyle(0xffa040, 0.9); g.fillEllipse(cx, y - 13, 4, 7); }
      g.fillStyle(0xfff0c0, 0.15); g.fillCircle(x, y - 6, 50);
    }
    if (this.storm) for (const r of this.rain) { g.lineStyle(1, 0xa0b8d8, 0.4); g.lineBetween(r.x, r.y, r.x - 3, r.y + 14); } g.lineStyle(0);
    if (this.flash > 0) { g.fillStyle(0xffffff, 0.06 * this.flash); g.fillRect(-800, -800, 1600, 1100); }
    if (this.sand) { const S = this.sand, x = S.x, y = S.y ?? -440; if (S.y == null) { g.fillStyle(0xc8b080, 0.15 + 0.25 * S.k); g.fillEllipse(x, -1, 40, 7); } g.lineStyle(2, 0x6a5a3a, 1); g.lineBetween(x, -560, x, y - 20); g.lineStyle(0); g.fillStyle(ink, 1); g.fillEllipse(x, y, 34, 40); g.fillStyle(0xb8a070, 1); g.fillEllipse(x, y, 30, 36); g.fillStyle(0x8a7450, 1); g.fillRect(x - 5, y - 22, 10, 6); }
    if (this.smoke) { const S = this.smoke; g.fillStyle(0x000000, 1); g.fillRect(S.x - 26, -3, 52, 5); if (!S.on && t % 6 < 3) { g.fillStyle(0xd8d0e0, 0.4 * S.k); g.fillRect(S.x - 26, -6, 52, 4); } if (S.on) { g.fillStyle(0xd8d0e0, 0.25); g.fillRect(S.x - 26, -200, 52, 200); } }
  }
  /** His final curtain: heavy red velvet falling from the flies over the whole stage, gold fringe at its hem. */
  drawFinalCurtain(g, k) {
    const y = lerp(-560, 44, easeOut(k));
    for (let i = 0; i < 20; i++) { const x = -330 + i * 33; g.fillStyle(i % 2 ? 0x8a1428 : 0x6a0c1e, 1); g.fillRect(x, -600, 34, y + 600); g.fillStyle(0xffffff, 0.06); g.fillRect(x + 4, -600, 6, y + 600); }
    g.fillStyle(LOOK.gold, 1); g.fillRect(-330, y - 8, 660, 8); for (let x = -326; x < 330; x += 8) g.fillTriangle(x, y, x + 6, y, x + 3, y + 10);
  }
  /** His speech bubble: an ivory bubble edged in crimson, with a tail toward his face. */
  drawBubble() {
    const S = this.say, b = this.body(), g = this.bubG, pop = Math.min(1, S.t / 6), x = Phaser.Math.Clamp(b.head.x - this.e.dir * 40, -220, 220), y = b.head.y - 76;
    this.bubT.setText(S.text).setPosition(x, y).setScale(pop).setVisible(true);
    const w = Math.max(60, this.bubT.width + 20) * pop, h = (this.bubT.height + 14) * pop;
    g.fillStyle(LOOK.ink, 1); g.fillRoundedRect(x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6, 10); g.fillStyle(0xc0203a, 1); g.fillRoundedRect(x - w / 2 - 1, y - h / 2 - 1, w + 2, h + 2, 9); g.fillStyle(0xfff8ec, 1); g.fillRoundedRect(x - w / 2 + 1, y - h / 2 + 1, w - 2, h - 2, 8);
    g.fillStyle(0xfff8ec, 1); g.fillTriangle(x - 6, y + h / 2 - 2, x + 8, y + h / 2 - 2, b.head.x, b.head.y - 24); g.lineStyle(2, LOOK.ink, 1); g.lineBetween(x - 6, y + h / 2, b.head.x, b.head.y - 24); g.lineBetween(x + 8, y + h / 2, b.head.x, b.head.y - 24); g.lineStyle(0);
  }
}

/** THE GRAND OPERA's miniature for the stage select screen: velvet, gold balconies, the stage, the Phantom. */
export function drawGrandOperaPreview(g, x, y, w, h) {
  g.fillStyle(0x2a0610, 1); g.fillRect(x, y, w, h);
  for (let t = 0; t < 3; t++) { g.fillStyle(0x8a1428, 1); g.fillRect(x + w * 0.05, y + h * (0.12 + t * 0.16), w * 0.9, h * 0.06); g.fillStyle(0xe8b840, 1); g.fillRect(x + w * 0.05, y + h * (0.12 + t * 0.16), w * 0.9, 1); }
  g.fillStyle(0x6a3a1a, 1); g.fillRect(x + w * 0.1, y + h * 0.72, w * 0.8, h * 0.1); g.fillStyle(0xe8b840, 1); g.fillRect(x + w * 0.1, y + h * 0.82, w * 0.8, 2);
  for (const s of [0, 1]) { g.fillStyle(0x8a1428, 1); g.fillRect(x + (s ? w * 0.9 : 0), y, w * 0.1, h); }
  const cx = x + w * 0.6, fy = y + h * 0.72;
  g.fillStyle(0xb01830, 1); g.fillTriangle(cx - 4, fy - h * 0.34, cx - w * 0.12, fy, cx + 4, fy);
  g.fillStyle(0x101018, 1); g.fillRect(cx - 3, fy - h * 0.36, 6, h * 0.34); g.fillStyle(0xe6d6cc, 1); g.fillCircle(cx, fy - h * 0.4, 3); g.fillStyle(0xfafaf4, 1); g.fillRect(cx - 1, fy - h * 0.43, 3, 3); g.fillStyle(0xc0102a, 1); g.fillCircle(cx + 2, fy - h * 0.3, 1.5);
}

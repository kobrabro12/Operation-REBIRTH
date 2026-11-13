// LEVEL 0 - the arena of THE HUM, OCCUPANT OF LEVEL 0 (boss VI, the backrooms; Trinkets > BOSS FIGHTS,
// src/data/bosses.js). An endless office of mono-yellow wallpaper, damp beige carpet and buzzing fluorescent panels -
// pillars fading into the yellow haze behind, two half-height partition walls as ledges. (An original creature: the
// stage THE BACKROOMS is the same kind of place, but this one is its own.)
// THE HUM is the thing that lives in the buzz: a tall, thin, jittering silhouette of black static with arms down to
// its knees, two pin-prick white eyes and a smile far too wide. It's drawn every frame from a few points (`body()`:
// feet, hips, shoulders, head; arms by angle and length).
//   Weak point: its HEAD (the smile, x1.3); its body takes x0.9. After NOCLIP it gets STUCK IN THE FLOOR for a moment
//   (half sunk, glitching) - its head is low and takes x1.7.
//   Attacks: NOCLIP (it sinks into the carpet; a dark stain follows you; it bursts up under you), REACH (its arm
//   stretches along the floor right across the room - jump - then high across - stay low), LIGHTS OUT (the panels die
//   one by one; in the dark only its smile shows - behind you - then it lunges), THE WALLS (yellow walls slide in from
//   both sides and squeeze the room, then it charges across), and at half health LEVEL ! (red emergency light, faster;
//   adds MIMICS - small copies of it that shamble after you and burst into static; one hit pops them). Every few
//   attacks it becomes THE COPY: it turns into YOU - your fighter and costume - but wrong (cracks of light in the skin,
//   shadow limbs writhing from its back, its face slipping into the smile), moves and swings the way you did a moment
//   ago, and has tricks of its own (SHADOW LIMBS that grab at you, THE GRIN - a scream of static).
// Stage hazards (also in VS, where it stands far off in the haze between the pillars, watching): FLICKER (the lights
// die for a few seconds - in the dark you can see it smiling) and BURST PANEL (a fluorescent panel bursts, raining sparks).
import { HazardCycle } from './hazardCycle.js';
import { BossArena } from './bossBase.js';
import { sfx } from '../audio/sfx.js';

const C = { out: 0x0a0806, wall: [0xb8a850, 0xcdbd62, 0xddd07a, 0xe8de98], carpet: [0x6a5a36, 0x7e6c44, 0x92805a], ceil: [0xd8d2b0, 0xe8e4c8, 0xc0b890],
  light: [0xfffbe0, 0xfff6b0], haze: 0xe0d48a, red: 0xff2020, black: 0x050404, static: [0x2a2a2a, 0x4a4a4a, 0x8a8a8a] };
// its body (px): leg, torso, neck, head, arm lengths; how far it can go; walk speed (normal / LEVEL !)
const HB = { leg: 92, torso: 104, head: 26, upper: 64, fore: 76, range: 230, walk: 1.8, fast: 2.8 };
// the ceiling (y) and its lamps (x)
const CEIL = { y: -300, lamps: [-245, -175, -105, -35, 35, 105, 175, 245] };
// NOCLIP: sinking, the stain hunting you (frames), lock-on, the rise, its hit; STUCK afterwards (frames)
const NOCLIP = { sink: 22, hunt: 56, lock: 16, rise: 10, hit: [12, [88, 6.2, 0.9]], stuck: 80 };
// REACH: wind-up (its hand twitching), the stretch, hold, the two heights, its hit
const REACH = { wind: 30, stretch: 9, hold: 10, low: -16, high: -112, hit: [10, [40, 5.8, 0.8]] };
// LIGHTS OUT: frames between panels dying, the dark, the smile's warning, the lunge, its hit
const DARK = { every: 6, warn: 44, lunge: 10, hit: [12, [45, 6.2, 0.9]] };
// THE WALLS: sliding in (frames), how far in they come, the charge, the walls' push, the charge's hit
const WALLS = { slide: 56, in: 165, hold: 40, charge: 22, push: [4, [20, 5.2, 0.3]], hit: [11, [40, 6, 0.85]] };
// THE COPY: how late it replays you (frames), how long it lasts, its walk, how close it keeps, how hard your echoed
// swings hit (x their damage), frames between its own tricks, the limbs' wind-up, the limbs' and the grin's hits
// every this-many attacks it becomes THE COPY
const COPY_EVERY = 4;
const COPY = { delay: 24, dur: 560, speed: 2.1, near: 64, echo: 0.9, trick: 120, limbWind: 22, limbHit: [11, [50, 6, 0.85]], grinHit: [10, [70, 5.8, 0.7]] };
// MIMICS (LEVEL !): how many, speed, fuse when near, their life, the burst's hit
const MIMIC = { n: 2, speed: 1.6, near: 46, fuse: 18, life: 330, hit: [10, [70, 6, 0.75]] };
// THE HUNGER (at `FERAL.at` health and below): it tears open into a red-and-black thing of ropes and teeth, far
// wilder - the change (frames), its walk, the longest it rests between attacks (frames), and its hand-weapons:
const FERAL = { at: 0.3, change: 110, walk: 3.8, rest: 50 };
// BLADE FRENZY: wind-up, dashes, each dash (frames), dash speed, the pause between, a slash's hit, the last slash's hit
const FRENZY = { wind: 22, dashes: 3, dash: 14, speed: 8.5, gap: 10, hit: [6, [40, 4.4, 0.45]], last: [9, [45, 6.2, 0.8]] };
// AXE DROP: wind-up, the leap (frames), its height, the hang (a red mark where it'll land), the drop, the slam's hit,
// the two shockwaves along the floor (hit, speed, frames)
const AXE = { wind: 18, leap: 26, high: 210, hang: 14, drop: 8, hit: [12, [80, 6.6, 0.9]], wave: [6, [70, 4.8, 0.4]], waveSpeed: 7, waveLife: 34 };
// TENDRIL WHIP: lashes, wind-up, the lash (frames), how far it reaches, its hit
const WHIP = { n: 3, wind: 20, lash: 12, len: 300, hit: [9, [55, 5.6, 0.7]] };
// SPIKE BURST: hammer slams, frames apart, the warning under you, how long a spike stands, its width/height, its hit
const SPIKE = { n: 4, every: 34, warn: 30, up: 22, w: 40, h: 120, hit: [11, [88, 6.4, 0.8]] };
// hazards: FLICKER (dark frames) and BURST PANEL (warning, sparks, hit)
const FLICK = { dur: 200 };
const BURST = { warn: 50, on: 50, hit: [4, [80, 4, 0.3]] };
// where the backdrop sits on the background camera
const SKY = { x: 320, y: 250 };

/** A point along the way from a to b (k = 0..1). */
const lerp = (a, b, k) => a + (b - a) * k;

/** LEVEL 0 and THE HUM (see the top of the file). */
export class HumBossStage extends BossArena {
  constructor(scene) {
    super();
    this.scene = scene; this.t = 0; this.hazardsOn = true; this.music = 'bgm_boss_hum';
    this.platforms = [
      { x1: -270, x2: 270, y: 0, solid: true, bottom: 60 },
      { x1: -232, x2: -142, y: -100, solid: false },
      { x1: 142, x2: 232, y: -100, solid: false },
    ];
    this.spawns = [{ x: -150, y: 0 }, { x: -60, y: 0 }, { x: -110, y: 0 }, { x: 150, y: 0 }];
    this.cycle = new HazardCycle(this, ['flicker', 'burst'], { color: '#fff6b0', stroke: '#2a2008', gap: 720 });
    this.e = { x: 120, y: 0, dir: -1, sink: 0, walk: 0, crouch: 0, armL: [0.2, 0.1], armR: [-0.15, -0.05], reach: 0, alpha: 1, glitch: 0, scale: 1 };
    this.lamps = CEIL.lamps.map(() => ({ on: 1, flick: 0 }));
    this.rec = {}; this.hbNow = {}; this.copy = null;
    this.count = 0; this.dark = 0; this.walls = null; this.stain = null; this.mimics = []; this.sparks = null; this.stuck = 0; this.smile = null;
    this.sparkColor = 0x8a8a8a; this.bodyW = 80; this.bodyH = 240;
    this.feral = false; this.feralK = 0; this.spikes = []; this.waves = []; this.lash = null; this.mark = null;
  }

  /** Builds the hazy yellow distance (pillars fading back), the ceiling and partitions, and the carpet. */
  draw(world, bg) {
    const s = this.scene;
    const far = s.add.graphics().setScrollFactor(0.2).setPosition(SKY.x, SKY.y); bg.push(far); this.paintFar(far);
    const back = s.add.graphics(); world.push(back); this.paintRoom(back);
    this.humG = s.add.graphics(); world.push(this.humG);
    const front = s.add.graphics(); world.push(front); this.paintCarpet(front);
    this.copySpr = s.add.sprite(0, 0, '__WHITE').setVisible(false); world.push(this.copySpr);
    this.copyG = s.add.graphics(); world.push(this.copyG);
    this.fxG = s.add.graphics(); world.push(this.fxG);
    this.cycle.makeBanner(s);
  }
  /** The wallpaper pattern: faint chevrons and stripes on a yellow rect. */
  paper(g, x, y, w, h, base = 1) {
    g.fillStyle(C.wall[base], 1); g.fillRect(x, y, w, h);
    for (let xx = x; xx < x + w; xx += 12) { g.fillStyle(C.wall[base - 1 < 0 ? 0 : base - 1], 0.35); g.fillRect(xx, y, 2, h); }
    for (let yy = y + 8; yy < y + h; yy += 24) for (let xx = x + 6; xx < x + w - 6; xx += 24) { g.fillStyle(C.wall[0], 0.3); g.fillTriangle(xx - 4, yy, xx, yy - 4, xx + 4, yy); }
  }
  /** The far office: yellow haze, rows of pillars fading back, a drop ceiling with panels, the carpet stretching away. */
  paintFar(g) {
    g.fillStyle(C.haze, 1); g.fillRect(-700, -700, 1400, 1100);
    for (let row = 3; row >= 0; row--) {
      const k = 0.4 + row * 0.2, a = 1 - row * 0.22;
      g.fillStyle(C.ceil[0], a); g.fillRect(-700, -360 + row * 40, 1400, 30 - row * 4);
      for (let i = 0; i < 10; i++) { g.fillStyle(C.light[1], a * 0.8); g.fillRect(-640 + i * 140 + row * 30, -350 + row * 40, 60 * k, 8 * k); }
      for (let i = 0; i < 9; i++) { const x = -620 + i * 150 + row * 50; g.fillStyle(C.wall[1 + (row % 2)], a); g.fillRect(x, -330 + row * 40, 40 * k, 420); g.fillStyle(C.wall[0], a * 0.6); g.fillRect(x + 40 * k - 6 * k, -330 + row * 40, 6 * k, 420); }
      g.fillStyle(C.haze, 0.35); g.fillRect(-700, -360, 1400, 600);
    }
    g.fillStyle(C.carpet[1], 1); g.fillRect(-700, 60, 1400, 300);
  }
  /** The room itself: wallpaper behind, the drop-ceiling grid with its panels (lit in render), two partition walls (ledges). */
  paintRoom(g) {
    this.paper(g, -300, CEIL.y, 600, -CEIL.y, 2);
    g.fillStyle(C.haze, 0.25); g.fillRect(-300, CEIL.y, 600, -CEIL.y);
    g.fillStyle(C.ceil[1], 1); g.fillRect(-310, CEIL.y - 40, 620, 40);
    for (let x = -300; x <= 300; x += 35) { g.fillStyle(C.ceil[2], 1); g.fillRect(x, CEIL.y - 40, 2, 40); }
    g.fillStyle(C.ceil[2], 1); g.fillRect(-310, CEIL.y - 2, 620, 3);
    for (let x = -280; x < 290; x += 70) { g.fillStyle(C.carpet[0], 0.25); g.fillRect(x, -60, 2, 60); }        // the wall's damp stains
    g.fillStyle(C.carpet[0], 0.18); g.fillEllipse(-160, -14, 120, 26); g.fillEllipse(90, -10, 90, 18);
    for (const p of this.platforms.slice(1)) {                                           // partitions: wallpapered half-walls with a trim on top
      g.fillStyle(C.out, 1); g.fillRect(p.x1 - 2, p.y - 2, p.x2 - p.x1 + 4, -p.y + 2);
      this.paper(g, p.x1, p.y, p.x2 - p.x1, -p.y, 1);
      g.fillStyle(C.ceil[1], 1); g.fillRect(p.x1 - 2, p.y - 4, p.x2 - p.x1 + 4, 6); g.fillStyle(C.ceil[2], 1); g.fillRect(p.x1 - 2, p.y + 1, p.x2 - p.x1 + 4, 2);
    }
  }
  /** The carpet in front: damp beige-brown pile with stains, a dark skirting at the wall. */
  paintCarpet(g) {
    const P = this.platforms[0];
    g.fillStyle(C.out, 1); g.fillRect(P.x1 - 3, -2, P.x2 - P.x1 + 6, 64);
    g.fillStyle(C.carpet[1], 1); g.fillRect(P.x1, 0, P.x2 - P.x1, 60); g.fillStyle(C.carpet[2], 1); g.fillRect(P.x1, 0, P.x2 - P.x1, 3);
    for (let i = 0; i < 260; i++) { const x = P.x1 + ((i * 131) % (P.x2 - P.x1)), y = 4 + ((i * 47) % 54); g.fillStyle(i % 3 ? C.carpet[0] : C.carpet[2], 0.5); g.fillRect(x, y, 2, 1); }
    for (const [x, w] of [[-200, 60], [-30, 90], [150, 50]]) { g.fillStyle(C.carpet[0], 0.6); g.fillEllipse(x, 20, w, 12); }
  }

  // ------------------------------------------------------------------ THE HUM
  /** The boss's own state when the fight starts. */
  makeBoss() { this.cycle.gap = 1300; this.cycle.next = 1500; }
  /**
   * Its body's points this frame: feet (on the floor, or sunk), hips, shoulders, the head (the smile), both hands
   * (arm angles from straight down; the front forearm stretched by `reach`).
   */
  body() {
    const E = this.e, d = E.dir, s = E.scale, sinkY = E.sink * (HB.leg + HB.torso + HB.head + 40) * s;
    const ft = { x: E.x, y: E.y + sinkY }, cr = E.crouch;
    const hip = { x: E.x - d * 6 * cr, y: ft.y - HB.leg * s * (1 - cr * 0.35) };
    const sh = { x: hip.x + d * (10 + cr * 30) * s, y: hip.y - HB.torso * s * (1 - cr * 0.25) };
    const head = { x: sh.x + d * (6 + cr * 16) * s, y: sh.y - (HB.head + 10) * s };
    const arm = (A, len2) => { const e = { x: sh.x + Math.sin(A[0]) * d * HB.upper * s, y: sh.y + Math.cos(A[0]) * HB.upper * s }; return { e, h: { x: e.x + Math.sin(A[1]) * d * len2 * s, y: e.y + Math.cos(A[1]) * len2 * s } }; };
    return { ft, hip, sh, head, a1: arm(E.armL, HB.fore + E.reach), a2: arm(E.armR, HB.fore) };
  }
  /** Its head: what the camera, the death and the CPU aim at. */
  core() { if (this.copy && this.copy.alpha > 0.5) return { x: this.copy.x, y: this.copy.y - 40 }; const b = this.body(); return { x: b.head.x, y: b.head.y }; }
  /** The camera keeps the whole room in view. */
  camPoints() { return this.boss && this.boss.dying < 100 ? [{ x: -250, y: -260 }, { x: 250, y: 0 }] : []; }
  /** Where it can be hit: the head (x1.3; x1.7 STUCK), the body and legs (x0.9). Nothing while it's sunk, gone or in the dark. */
  hurt() {
    const E = this.e, P = this.copy;
    if (P && P.alpha > 0.5) return [{ x1: P.x - 22, y1: P.y - 70, x2: P.x + 22, y2: P.y, mult: 1.1 }];   // THE COPY: hit the copy
    if (E.alpha < 0.5 || E.sink > 0.6) return [];
    const b = this.body(), s = E.scale;
    return [{ x1: b.head.x - 24 * s, y1: b.head.y - 30 * s, x2: b.head.x + 24 * s, y2: b.head.y + 22 * s, mult: this.stuck > 0 ? 1.7 : 1.3 },
      { x1: Math.min(b.hip.x, b.sh.x) - 34, y1: b.sh.y, x2: Math.max(b.hip.x, b.sh.x) + 34, y2: Math.min(b.ft.y, 0), mult: 0.9 }];
  }
  /** What it does next; at LEVEL ! it adds MIMICS. */
  pattern(phase) { if (this.feral) return ['frenzy', 'axe', 'whip', 'spikes', 'frenzy', 'noclip']; if (this.count % COPY_EVERY === COPY_EVERY - 1) return ['copy']; return phase === 1 ? ['noclip', 'reach', 'lights', 'walls', 'reach'] : ['noclip', 'reach', 'lights', 'walls', 'mimics', 'noclip']; }
  /** Counts its attacks. */
  tally() { this.count++; }
  start_noclip() { this.tally(); } start_reach() { this.tally(); } start_lights() { this.tally(); } start_walls() { this.tally(); } start_mimics() { this.tally(); } start_copy() { this.tally(); } start_frenzy() { this.tally(); } start_axe() { this.tally(); } start_whip() { this.tally(); } start_spikes() { this.tally(); }
  /** The death card's form: THE HUNGER, LEVEL ! or not. */
  cardForm() { return this.feral ? 'feral' : super.cardForm(); }
  /** The drawing layers that make up the boss itself, for its death card's portrait (MatchScene.paintBossCard). */
  cardObjs() { return [this.humG, this.copyG]; }
  rageLine() { return 'LEVEL !  -  RUN.'; }
  /** LEVEL !: the panels go red, an alarm, the room shudders. */
  onRage(match) { this.red = 1; sfx('warn', 1, 0.6); sfx('roar', 0.7, 1.5); match.shake(8, 30); for (const L of this.lamps) L.flick = 20; }
  /** You lost: it tilts its head and smiles wider, twitching, the lights flickering (BossArena.bossTaunt). */
  onGloat(match, t) { const E = this.e; E.alpha = 1; E.sink = Math.max(0, E.sink - 0.05); E.crouch = 0.2 + 0.1 * Math.sin(t * 0.4); E.glitch = t % 30 < 4 ? 1 : 0; if (t % 25 === 0) this.lamps[Math.floor(Math.random() * this.lamps.length)].flick = 8; }
  /** Its speed (faster at LEVEL !). */
  speed() { return this.feral ? FERAL.walk : this.boss && this.boss.phase === 2 ? HB.fast : HB.walk; }
  /** It shuffles toward x, legs jerking. Returns true once there. */
  walkTo(x, sp) { const E = this.e, dx = Phaser.Math.Clamp(x, -HB.range, HB.range) - E.x; if (Math.abs(dx) < 6) return true; E.dir = Math.sign(dx); E.x += Math.sign(dx) * Math.min(Math.abs(dx), sp); E.walk += sp * 0.06; return false; }

  /** At rest: it faces the nearest player and creeps closer, arms swaying, now and then twitching. */
  idle(match) {
    const E = this.e, tg = this.nearest(match, E.x);
    E.crouch += (0.12 - E.crouch) * 0.1; E.reach *= 0.8;
    E.armL = [0.12 + Math.sin(this.t * 0.05) * 0.08, 0.05]; E.armR = [-0.1 + Math.sin(this.t * 0.05 + 1) * 0.08, -0.05];
    E.weapon = null; E.y = 0;
    if (this.feral) {                                                                   // THE HUNGER: it prowls right up to you, twitching
      E.crouch = 0.45 + Math.sin(this.t * 0.3) * 0.08; E.armL = [0.9 + Math.sin(this.t * 0.4) * 0.5, 1.4]; E.armR = [-0.6 + Math.sin(this.t * 0.37) * 0.5, -1];
      if (tg && Math.abs(tg.x - E.x) > 70) this.walkTo(tg.x - Math.sign(tg.x - E.x) * 60, this.speed() * 0.8); else if (tg) E.dir = Math.sign(tg.x - E.x) || E.dir;
      E.glitch = this.t % 37 < 3 ? 1 : 0; return;
    }
    if (tg && Math.abs(tg.x - E.x) > 150) this.walkTo(tg.x - Math.sign(tg.x - E.x) * 120, this.speed() * 0.7);
    else if (tg) E.dir = Math.sign(tg.x - E.x) || E.dir;
    E.glitch = this.t % 97 < 3 ? 1 : 0;
  }

  /**
   * NOCLIP: it sinks into the carpet (glitching); a dark stain slides under the nearest player and follows them;
   * it locks on (the stain shudders) and the thing bursts straight up out of the floor - then it's STUCK IN THE
   * FLOOR a moment, half sunk, its head low (x1.7).
   */
  atk_noclip(match, a, out) {
    const E = this.e, sink = this.sp(NOCLIP.sink), hunt = sink + this.sp(NOCLIP.hunt), lock = hunt + NOCLIP.lock, rise = lock + NOCLIP.rise;
    if (a.t === 1) { sfx('glitch', 0.8, 0.6); a.sx = E.x; }
    if (a.t <= sink) { E.sink = a.t / sink; E.glitch = 1; return false; }
    if (a.t <= hunt) { const tg = this.nearest(match, a.sx); if (tg) a.sx += Phaser.Math.Clamp(Phaser.Math.Clamp(tg.x, -250, 250) - a.sx, -4.2, 4.2); this.stain = { x: a.sx, k: (a.t - sink) / (hunt - sink) }; E.x = a.sx; if (a.t % 20 === 0) sfx('rumble', 0.3, 1.8); return false; }
    if (a.t <= lock) { this.stain = { x: a.sx, k: 1, shake: true }; E.x = a.sx; return false; }
    if (a.t <= rise) {
      this.stain = null; E.sink = 1 - (a.t - lock) / NOCLIP.rise; E.glitch = 1; E.armL = [Math.PI - 0.2, Math.PI]; E.armR = [Math.PI - 0.3, Math.PI];
      out.push(this.bhit('noclip' + a.id, E.x - 44, -230, E.x + 44, 0, ...NOCLIP.hit));
      if (a.t === lock + 1) { sfx('bighit', 1, 0.6); sfx('glitch', 1, 1.2); match.shake(12, 12); for (let i = 0; i < 16; i++) match.particles.push({ x: E.x + (Math.random() - 0.5) * 60, y: -4, vx: (Math.random() - 0.5) * 5, vy: -2 - Math.random() * 5, life: 22, color: C.static[i % 3], size: 3, grav: 0.15 }); }
      return false;
    }
    if (a.t === rise + 1) { this.stuck = this.sp(NOCLIP.stuck); E.sink = 0.42; sfx('glitch', 0.8, 0.4); if (this.rageText && !this.boss.rage) { this.rageText.setText('STUCK IN THE FLOOR!'); this.boss.rage = 60; } }
    if (this.stuck > 0) { E.sink = 0.42 + Math.sin(a.t * 1.3) * 0.02; E.glitch = a.t % 6 < 3 ? 1 : 0; E.armL = [1.8, 2.2]; E.armR = [-1.4, -1.9]; return false; }
    E.sink = Math.max(0, E.sink - 0.04); E.glitch = 0;
    return E.sink <= 0;
  }
  /**
   * REACH: it crouches, its hand twitching - then its front arm stretches impossibly far, flat along the floor right
   * across the room (jump it); it snaps back and does it again high, at ledge height (stay down).
   */
  atk_reach(match, a, out) {
    const E = this.e, w = this.sp(REACH.wind), cyc = w + REACH.stretch + REACH.hold + 10;
    if (a.t === 1) { const tg = this.nearest(match, E.x); if (tg) E.dir = Math.sign(tg.x - E.x) || E.dir; }
    const i = Math.floor((a.t - 1) / cyc), q = (a.t - 1) % cyc;
    if (i >= 2) { E.reach *= 0.7; E.crouch += (0.12 - E.crouch) * 0.2; return a.t > 2 * cyc + 14; }
    const y = i === 0 ? REACH.low : REACH.high, far = 300 - E.dir * E.x;
    E.crouch += ((i === 0 ? 0.75 : 0.1) - E.crouch) * 0.2;
    { const b = this.body(), a0 = Math.acos(Phaser.Math.Clamp((y - b.sh.y) / HB.upper, -1, 1)) * 0.9, ey = b.sh.y + Math.cos(a0) * HB.upper, ex = Math.sin(a0) * HB.upper;
      E.armL = [a0, Math.atan2(far - ex, y - ey)]; a.len = Math.hypot(far - ex, y - ey) - HB.fore; }
    if (q < w) { E.reach = Math.sin(q * 1.7) * 6; if (q === 2) sfx('glitch', 0.5, 1.6); if (q === w - 6) match.popText({ x: E.x, y: y - 30 }, i === 0 ? 'JUMP' : 'DUCK', '#ffffff'); return false; }
    const k = q - w;
    if (k < REACH.stretch) { E.reach = a.len * (k + 1) / REACH.stretch; if (k === 0) sfx('whoosh', 1, 0.5); }
    else if (k < REACH.stretch + REACH.hold) E.reach = a.len;
    else { E.reach *= 0.6; return false; }
    const b = this.body(), h = b.a1.h, e = b.a1.e;
    for (let q2 = 1; q2 <= 8; q2++) { const px = e.x + (h.x - e.x) * q2 / 8, py = e.y + (h.y - e.y) * q2 / 8; out.push(this.bhit('reach' + a.id + i, px - 20, py - 14, px + 20, py + 14, ...REACH.hit, { dirX: E.dir })); }
    return false;
  }
  /**
   * LIGHTS OUT: the panels die one by one with a pop; the room goes dark and it's gone - until its smile fades in
   * behind the nearest player; then it lunges out of the dark. The lights flicker back on.
   */
  atk_lights(match, a, out) {
    const E = this.e, off = this.lamps.length * DARK.every, warn = off + this.sp(DARK.warn);
    if (a.t <= off) { if (a.t % DARK.every === 0) { const L = this.lamps[a.t / DARK.every - 1]; if (L) { L.on = 0; sfx('glass', 0.3, 1.6); } } this.dark = a.t / off; return false; }
    if (a.t === off + 1) {
      const tg = this.nearest(match, E.x), face = tg ? (tg.facing || 1) : 1;
      E.alpha = 0; E.x = Phaser.Math.Clamp((tg ? tg.x : 0) - face * 90, -HB.range, HB.range); E.dir = Math.sign((tg ? tg.x : 0) - E.x) || 1; E.sink = 0;
      this.smile = { t: 0 }; sfx('laugh', 0.4, 0.5);
    }
    if (a.t <= warn) { this.smile.t++; this.dark = 1; return false; }
    if (a.t <= warn + DARK.lunge) {
      if (a.t === warn + 1) { this.smile = null; E.alpha = 1; sfx('slash', 1, 0.5); sfx('glitch', 0.8, 0.8); }
      E.x = Phaser.Math.Clamp(E.x + E.dir * 9, -HB.range, HB.range); E.crouch = 0.5; E.armL = [1.5, 1.6]; E.armR = [1.3, 1.4];
      const b = this.body(); out.push(this.bhit('dark' + a.id, Math.min(b.hip.x, b.a1.h.x) - 30, b.sh.y - 30, Math.max(b.hip.x, b.a1.h.x) + 30, 0, ...DARK.hit, { dirX: E.dir }));
      return false;
    }
    this.dark = Math.max(0, this.dark - 0.06);
    if (this.dark <= 0) { for (const L of this.lamps) { L.on = 1; L.flick = 10; } return true; }
    return false;
  }
  /** THE WALLS: yellow walls slide in from both sides and squeeze the room (they push you back in); then it charges right across. */
  atk_walls(match, a, out) {
    const E = this.e, sl = this.sp(WALLS.slide);
    if (a.t === 1) { this.walls = { x: 300 }; sfx('rumble', 1, 0.6); }
    const W = this.walls;
    if (a.t <= sl) W.x = lerp(300, WALLS.in, a.t / sl);
    else if (a.t > sl + WALLS.hold + WALLS.charge + 20) W.x = Math.min(300, W.x + 5);
    if (a.t % 8 === 0 && a.t < sl) match.shake(2, 6);
    for (const s of [-1, 1]) out.push(this.bhit('wall' + a.id + s + Math.floor(a.t / 30), s > 0 ? W.x : -700, -400, s > 0 ? 700 : -W.x, 0, ...WALLS.push, { dirX: -s }));
    const c0 = sl + WALLS.hold;
    if (a.t === c0) { a.from = E.x < 0 ? -1 : 1; E.x = a.from * (WALLS.in - 30); E.dir = -a.from; sfx('glitch', 1, 0.7); sfx('whoosh', 1, 0.5); }
    if (a.t > c0 && a.t <= c0 + WALLS.charge) {
      E.x = lerp(a.from * (WALLS.in - 30), -a.from * (WALLS.in - 30), (a.t - c0) / WALLS.charge); E.crouch = 0.4; E.armL = [1.2, 1.3]; E.armR = [1.0, 1.1]; E.walk += 0.6;
      const b = this.body(); out.push(this.bhit('wch' + a.id, b.hip.x - 34, b.sh.y - 20, b.hip.x + 34, 0, ...WALLS.hit, { dirX: E.dir }));
    }
    if (W.x >= 300 && a.t > sl + 40) { this.walls = null; return true; }
    return false;
  }
  /** MIMICS (LEVEL !): it splits off small copies of itself that shamble after you; near you (or in time) they burst into static. */
  atk_mimics(match, a) {
    const E = this.e;
    if (a.t === 20) { sfx('glitch', 1, 0.5); for (let i = 0; i < MIMIC.n; i++) this.mimics.push({ x: E.x + (i ? 30 : -30), dir: i ? 1 : -1, t: 0, walk: 0, id: this.sid('mimic'), seen: new Set() }); }
    E.glitch = a.t < 30 ? 1 : 0;
    return a.t > 50;
  }
  /** The mimics: shamble toward the nearest player; light a fuse when close (or old) and burst. */
  stepMimics(match, out) {
    for (const m of this.mimics) {
      m.t++;
      const tg = this.nearest(match, m.x);
      if (m.fuse == null) { if (tg) { m.dir = Math.sign(tg.x - m.x) || m.dir; m.x += m.dir * MIMIC.speed; m.walk += 0.15; } if ((tg && Math.abs(tg.x - m.x) < MIMIC.near && tg.y > -90) || m.t > MIMIC.life) { m.fuse = 0; sfx('glitch', 0.6, 1.5); } }
      else if (++m.fuse === MIMIC.fuse) { m.dead = true; out.push(this.bhit(m.id + 'x', m.x - 50, -130, m.x + 50, 0, ...MIMIC.hit, { radial: true })); sfx('bighit', 0.7, 1.2); for (let i = 0; i < 14; i++) match.particles.push({ x: m.x, y: -60, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 18, color: C.static[i % 3], size: 3 }); }
    }
    this.mimics = this.mimics.filter((m) => !m.dead);
  }
  /** The players' hits: on it (BossArena), and on the mimics - one hit pops one harmlessly. */
  strikeTargets(match, hbs) {
    for (const hb of hbs) { const i = match.fighters.indexOf(hb.owner); if (i < 0 || hb.projectile) continue; (this.hbNow[i] || (this.hbNow[i] = [])).push({ id: hb.id, x1: hb.x1 - hb.owner.x, x2: hb.x2 - hb.owner.x, y1: hb.y1 - hb.owner.y, y2: hb.y2 - hb.owner.y, dmg: hb.h && hb.h.dmg, face: hb.owner.facing || 1 }); }
    super.strikeTargets(match, hbs);
    for (const m of this.mimics) for (const hb of hbs) {
      if (!hb.owner || m.dead || !(hb.x1 < m.x + 20 && hb.x2 > m.x - 20 && hb.y1 < 0 && hb.y2 > -150)) continue;
      m.dead = true; sfx('glitch', 0.6, 2); for (let i = 0; i < 10; i++) match.particles.push({ x: m.x, y: -70, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, life: 14, color: C.static[i % 3], size: 2 });
    }
    this.mimics = this.mimics.filter((m) => !m.dead);
  }

  /** Records what each player looks like and swings this frame (THE COPY replays it `COPY.delay` frames later). */
  record(match) {
    match.fighters.forEach((f, i) => {
      const s = f.sprite, R = this.rec[i] || (this.rec[i] = []);
      if (!s || !s.texture) return;
      R.push({ key: s.texture.key, frame: s.frame ? s.frame.name : 0, flip: s.flipX, sx: s.scaleX, sy: s.scaleY, ox: s.originX, oy: s.originY, dx: s.x - f.x, dy: s.y - f.y, fy: f.y, face: f.facing || 1, hbs: (this.hbNow[i] || []) });
      if (R.length > COPY.delay + 2) R.shift();
    });
    this.hbNow = {};
  }
  /**
   * THE COPY: it fades into static and comes back as YOU - your fighter, your costume - but wrong: greyed, cracks
   * glowing through its skin, shadow limbs writhing out of its back, its face sometimes slipping into that smile. It
   * moves the way you moved a moment ago and repeats your attacks (`COPY.delay` frames late, from where it stands), and
   * now and then does things you can't: SHADOW LIMBS (black arms burst from its back and grab at you) and THE GRIN
   * (its face splits open and it screams - a ring of static). Then it tears apart and the HUM re-forms.
   */
  atk_copy(match, a, out) {
    const E = this.e, dur = this.sp(COPY.dur);
    if (a.t === 1) {
      const tg = this.nearest(match, E.x); a.i = Math.max(0, match.fighters.indexOf(tg)); a.tg = tg;
      this.copy = { x: E.x, y: 0, dir: E.dir, t: 0, i: a.i, alpha: 0, limbs: 0, grin: 0, cracks: this.makeCracks(), next: COPY.trick };
      sfx('glitch', 1, 0.5); sfx('laugh', 0.3, 0.4);
    }
    const P = this.copy, tg = match.fighters[P.i];
    P.t++;
    if (a.t <= 20) { E.alpha = 1 - a.t / 20; E.glitch = 1; P.alpha = a.t / 20; if (a.t % 3 === 0) this.staticBurst(match, P.x, -50, 3); return false; }
    if (a.t === 21) { E.alpha = 0; E.glitch = 0; match.popText({ x: P.x, y: -150 }, '...?', '#ffffff'); }
    const end = 20 + dur;
    if (a.t > end) {                                                                   // it tears apart; the Hum re-forms
      P.alpha = Math.max(0, 1 - (a.t - end) / 16); E.alpha = 1 - P.alpha; E.x = P.x; E.glitch = 1;
      if (a.t % 3 === 0) this.staticBurst(match, P.x, -50, 4);
      if (a.t === end + 1) sfx('glitch', 1, 0.7);
      if (P.alpha <= 0) { this.copy = null; E.alpha = 1; E.glitch = 0; return true; }
      return false;
    }
    // it moves the way you did a moment ago, staying close
    const R = this.rec[P.i] || [], old = R.length > COPY.delay ? R[R.length - 1 - COPY.delay] : null;
    if (tg && tg.alive) {
      P.dir = Math.sign(tg.x - P.x) || P.dir;
      if (Math.abs(tg.x - P.x) > COPY.near) P.x += P.dir * COPY.speed * (this.boss.phase === 2 ? 1.3 : 1);
      P.x = Phaser.Math.Clamp(P.x, -255, 255);
      P.y = old ? Math.min(0, old.fy) : 0;
    }
    P.pose = old;
    if (old) for (const h of old.hbs) {                                              // ...and swings your swings, late
      const flip = P.dir === h.face ? 1 : -1;
      out.push(this.bhit('echo' + h.id, P.x + Math.min(h.x1 * flip, h.x2 * flip), P.y + h.y1, P.x + Math.max(h.x1 * flip, h.x2 * flip), P.y + h.y2, Math.max(3, Math.round((h.dmg || 6) * COPY.echo)), [45, 5.2, 0.6], { dirX: flip }));
    }
    // its own tricks
    if (--P.next <= 0 && !P.trick) { P.trick = { kind: Math.random() < 0.55 ? 'limbs' : 'grin', t: 0, id: this.sid('trick') }; P.next = this.sp(COPY.trick); sfx('glitch', 0.8, 1.4); }
    if (P.trick) {
      const T = P.trick; T.t++;
      if (T.kind === 'limbs') {                                                       // SHADOW LIMBS: wind up, then reach for you
        const reach = T.t < COPY.limbWind ? 0.15 : Math.min(1, (T.t - COPY.limbWind) / 6);
        P.limbs = reach; if (T.t === COPY.limbWind) { T.tx = tg ? tg.x : P.x + P.dir * 80; T.ty = tg ? tg.y - 30 : -30; sfx('whoosh', 1, 0.6); }
        if (T.t >= COPY.limbWind && T.t < COPY.limbWind + 12) for (const L of this.limbTips(P, T)) out.push(this.bhit(T.id, L.x - 16, L.y - 16, L.x + 16, L.y + 16, ...COPY.limbHit, { dirX: P.dir }));
        if (T.t > COPY.limbWind + 24) { P.trick = null; P.limbs = 0; }
      } else {                                                                         // THE GRIN: the face splits, a scream of static
        P.grin = Math.min(1, T.t / 14);
        if (T.t === 24) { sfx('roar', 0.6, 1.8); sfx('glitch', 1, 0.4); match.shake(8, 14); }
        if (T.t >= 24 && T.t < 40) { const r = (T.t - 24) * 7 + 20; P.ring = r; out.push(this.bhit(T.id, P.x - r, P.y - 60 - r * 0.6, P.x + r, P.y + 4, ...COPY.grinHit, { radial: true })); }
        if (T.t > 48) { P.trick = null; P.grin = 0; P.ring = 0; }
      }
    }
    return false;
  }
  /** Where its shadow limbs' hands are (reaching toward the target when T.tx is set). */
  limbTips(P, T) {
    const base = { x: P.x - P.dir * 10, y: P.y - 46 }, out = [];
    for (let k = 0; k < 3; k++) {
      const wig = Math.sin(this.t * 0.2 + k * 2) * 14, rx = (k - 1) * 26;
      const idle = { x: base.x - P.dir * (30 + k * 8) + wig, y: base.y - 30 - k * 14 + rx * 0.3 };
      const tgt = T && T.tx != null ? { x: T.tx + rx * 0.4, y: T.ty + rx } : idle;
      const q = P.limbs > 0.2 ? P.limbs : 0;
      out.push({ x: lerp(idle.x, tgt.x, q), y: lerp(idle.y, tgt.y, q), bx: base.x, by: base.y });
    }
    return out;
  }
  /** A fresh set of cracks for the copy's skin (relative to its body box, 0..1). */
  makeCracks() { const c = []; for (let i = 0; i < 5; i++) { let x = 0.25 + Math.random() * 0.5, y = 0.15 + Math.random() * 0.7; const pts = [{ x, y }]; for (let k = 0; k < 4; k++) { x += (Math.random() - 0.5) * 0.25; y += (Math.random() - 0.5) * 0.25; pts.push({ x, y }); } c.push(pts); } return c; }
  /** A puff of black-and-grey static. */
  staticBurst(match, x, y, n) { for (let i = 0; i < n; i++) match.particles.push({ x: x + (Math.random() - 0.5) * 50, y: y + (Math.random() - 0.5) * 80, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 16, color: C.static[i % 3], size: 3 }); }
  /** The copy's sprite (your fighter, greyed and stuttering) and, over it, the cracks, the shadow limbs, the grin and its scream. */
  drawCopy() {
    const P = this.copy, spr = this.copySpr, g = this.copyG; g.clear();
    if (!P || !P.pose || P.alpha <= 0.02 || !this.scene.textures.exists(P.pose.key)) { spr.setVisible(false); return; }
    const o = P.pose, gl = (this.t % 40 < 3) ? (Math.random() - 0.5) * 8 : 0;
    const same = P.dir === o.face;                                                  // (turned to face you: mirror the recorded pose if needed)
    spr.setVisible(true).setTexture(o.key, o.frame).setOrigin(o.ox, o.oy).setScale(o.sx, o.sy).setFlipX(same ? o.flip : !o.flip);
    spr.setPosition(P.x + o.dx * (same ? 1 : -1) + gl, P.y + o.dy).setAlpha(P.alpha).setTint(0x8a8480);
    const w = spr.displayWidth, h = spr.displayHeight, x0 = spr.x - spr.originX * w, y0 = spr.y - spr.originY * h, A = P.alpha;
    // the shadow limbs: thin black arms with long fingers, writhing out of its back
    for (const L of this.limbTips(P, P.trick && P.trick.kind === 'limbs' ? P.trick : null)) {
      const mx = (L.bx + L.x) / 2 - P.dir * 12, my = (L.by + L.y) / 2 - 10;
      for (const [lw, c, al] of [[6, C.static[0], 0.5], [4, C.black, 1]]) { g.lineStyle(lw, c, A * al); g.lineBetween(L.bx, L.by, mx, my); g.lineBetween(mx, my, L.x, L.y); }
      g.lineStyle(2, C.black, A); for (let f = -1; f <= 1; f++) g.lineBetween(L.x, L.y, L.x + P.dir * 10 + f * 4, L.y - 8 + f * 6);
    }
    g.lineStyle(0);
    // cracks in its skin, a dim light seeping through
    for (const pts of P.cracks) for (const [lw, c, al] of [[3, 0xfff0a0, 0.35], [1.5, 0x000000, 0.9]]) { g.lineStyle(lw, c, A * al); for (let i = 1; i < pts.length; i++) g.lineBetween(x0 + pts[i - 1].x * w, y0 + pts[i - 1].y * h, x0 + pts[i].x * w, y0 + pts[i].y * h); }
    g.lineStyle(0);
    // its face slipping into the smile now and then, or split wide open
    const fx = x0 + w * (P.dir > 0 ? 0.6 : 0.4), fy = y0 + h * 0.25;
    if (P.grin > 0) { g.fillStyle(C.black, A); g.fillEllipse(fx, fy + 4, 34 * P.grin, 22 * P.grin); this.drawFace(g, fx, fy, P.dir, A, 0.9 + P.grin * 0.6); }
    else if (this.t % 90 < 6) this.drawFace(g, fx, fy, P.dir, A * 0.9, 0.6);
    if (P.ring) { g.lineStyle(4, 0xffffff, 0.5 * A); g.strokeEllipse(P.x, P.y - 40, P.ring * 2, P.ring * 1.3); g.lineStyle(2, C.black, A); g.strokeEllipse(P.x, P.y - 40, P.ring * 2 + 8, P.ring * 1.3 + 6); g.lineStyle(0); }
  }

  // ------------------------------------------------------------------ THE HUNGER (low health)
  /** Clears whatever the room was doing (the copy, the walls, the dark...) so the change can start clean. */
  clearAll() {
    const E = this.e; this.copy = null; this.walls = null; this.stain = null; this.smile = null; this.dark = 0; this.mimics = []; this.stuck = 0;
    E.alpha = 1; E.sink = 0; E.reach = 0; E.y = 0; for (const L of this.lamps) L.on = 1;
  }
  /**
   * THE CHANGE: at `FERAL.at` health it doubles over, shuddering; red ropes split out of the static and wrap it,
   * tendrils burst from its back, its smile tears open into a mouth full of teeth - it ROARS, and its hands flicker
   * through the weapons it can make of them. From now on it's THE HUNGER (no more copies; faster, barely resting).
   */
  atk_transform(match, a) {
    const E = this.e, n = FERAL.change, roar = Math.round(n * 0.6);
    if (a.t === 1) { this.clearAll(); sfx('glitch', 1, 0.4); sfx('rumble', 1, 0.5); this.rageText.setText('IT IS CHANGING...'); this.boss.rage = 70; }
    this.feralK = Math.min(1, a.t / roar);
    E.glitch = a.t % 5 < 2 ? 1 : 0; E.y = 0;
    if (a.t < roar) { E.crouch = 0.7 + Math.sin(a.t * 0.9) * 0.08; E.armL = [0.5 + Math.sin(a.t * 0.6) * 0.5, 0.9]; E.armR = [-0.5 - Math.sin(a.t * 0.5) * 0.5, -0.9]; }
    else { E.crouch = Math.max(0.05, E.crouch - 0.06); E.armL = [2.5, 2.8]; E.armR = [-2.5, -2.8]; E.weapon = ['blade', 'axe', 'hammer', 'whip'][Math.floor((a.t - roar) / 9) % 4]; }
    if (a.t % 4 === 0) { const b = this.body(); for (let i = 0; i < 3; i++) match.particles.push({ x: b.sh.x + (Math.random() - 0.5) * 60, y: b.sh.y + Math.random() * 90, vx: (Math.random() - 0.5) * 5, vy: -1 - Math.random() * 3, life: 20, color: i % 2 ? 0xc01828 : C.black, size: 3, grav: 0.1 }); }
    if (a.t === roar) {
      sfx('roar', 1, 0.5); sfx('roar', 0.8, 0.8); sfx('bighit', 0.8, 0.4); match.shake(16, 46);
      this.rageText.setText('IT IS HUNGRY.'); this.boss.rage = 100; for (const L of this.lamps) L.flick = 30;
    }
    if (a.t >= n) { E.weapon = null; return true; }
    return false;
  }
  /** Turns it to face the nearest player; returns that player (or null). */
  faceNearest(match) { const E = this.e, tg = this.nearest(match, E.x); if (tg) E.dir = Math.sign(tg.x - E.x) || E.dir; return tg; }
  /** BLADE FRENZY: its hands become long red blades; it crouches, then dashes back and forth through you, slashing - the last slash hardest. */
  atk_frenzy(match, a, out) {
    const E = this.e, n = FRENZY.dashes, wind = this.sp(FRENZY.wind), cyc = FRENZY.dash + this.sp(FRENZY.gap);
    E.weapon = 'blade';
    if (a.t === 1) { sfx('slash', 0.8, 0.5); sfx('glitch', 0.6, 1.4); }
    if (a.t <= wind) { this.faceNearest(match); E.crouch = 0.75; E.armL = [2.3, 2.7]; E.armR = [-2.2, -2.6]; return false; }
    const k = a.t - wind - 1, i = Math.floor(k / cyc), q = k % cyc;
    if (i >= n) { E.crouch += (0.3 - E.crouch) * 0.2; if (k > n * cyc + 12) { E.weapon = null; return true; } return false; }
    if (q === 0) { this.faceNearest(match); a.hid = this.sid('frenzy'); sfx('whoosh', 1, 0.8); sfx('slash', 1, 0.6 + i * 0.1); }
    if (q < FRENZY.dash) {
      E.x = Phaser.Math.Clamp(E.x + E.dir * FRENZY.speed, -HB.range, HB.range); E.crouch = 0.5; E.walk += 0.8;
      const sw = q / FRENZY.dash, up = i % 2 === 0;
      E.armL = up ? [lerp(2.7, 0.6, sw), lerp(2.9, 1.1, sw)] : [lerp(0.4, 2.5, sw), lerp(0.8, 2.7, sw)]; E.armR = [E.armL[0] - 0.4, E.armL[1] - 0.3];
      const b = this.body(), hx1 = Math.min(b.hip.x, b.a1.h.x, b.a2.h.x), hx2 = Math.max(b.hip.x, b.a1.h.x, b.a2.h.x);
      out.push(this.bhit(a.hid, hx1 - 36, b.head.y - 10, hx2 + 36, 0, ...(i === n - 1 ? FRENZY.last : FRENZY.hit), { dirX: E.dir }));
      if (q % 3 === 0) match.particles.push({ x: b.a1.h.x, y: b.a1.h.y, vx: -E.dir * 2, vy: 0, life: 10, color: 0xff4050, size: 3 });
    } else E.crouch = 0.65;
    return false;
  }
  /**
   * AXE DROP: one hand becomes a great red axe; it leaps up out of reach, hangs there (a red mark on the carpet where
   * it'll land - it drifts after you), then drops and splits the floor - two shockwaves run out along the carpet.
   */
  atk_axe(match, a, out) {
    const E = this.e, w = this.sp(AXE.wind), l = w + AXE.leap, h = l + this.sp(AXE.hang), d = h + AXE.drop;
    E.weapon = 'axe';
    if (a.t === 1) { const tg = this.faceNearest(match); a.tx = Phaser.Math.Clamp(tg ? tg.x : 0, -HB.range, HB.range); a.sx = E.x; sfx('roar', 0.5, 1.4); }
    if (a.t <= w) { E.crouch = 0.85; E.armL = [2.9, 3.1]; E.armR = [-2.9, -3.1]; return false; }
    if (a.t <= l) {
      const k = (a.t - w) / AXE.leap, tg = this.nearest(match, E.x);
      if (tg) a.tx += Phaser.Math.Clamp(Phaser.Math.Clamp(tg.x, -HB.range, HB.range) - a.tx, -2, 2);
      E.x = lerp(a.sx, a.tx, k); E.y = -AXE.high * Math.sin(k * Math.PI / 2); E.crouch = 0.15; this.mark = { x: a.tx };
      if (a.t === w + 1) { sfx('whoosh', 1, 0.5); match.shake(4, 6); }
      return false;
    }
    if (a.t <= h) { const tg = this.nearest(match, E.x); if (tg) E.x = Phaser.Math.Clamp(E.x + Phaser.Math.Clamp(tg.x - E.x, -2.5, 2.5), -HB.range, HB.range); E.y = -AXE.high + Math.sin(a.t * 0.5) * 3; this.mark = { x: E.x }; return false; }
    if (a.t <= d) { const k = (a.t - h) / AXE.drop; E.y = -AXE.high * (1 - k); E.armL = [lerp(3.0, 1.0, k), lerp(3.1, 1.3, k)]; E.armR = [lerp(-2.9, 0.8, k), lerp(-3.0, 1.1, k)]; this.mark = { x: E.x }; return false; }
    E.y = 0; this.mark = null;
    if (a.t === d + 1) {
      a.hid = this.sid('axe'); sfx('bighit', 1, 0.5); sfx('clang', 0.8, 0.5); match.shake(14, 18);
      for (const dir of [-1, 1]) this.waves.push({ x: E.x, dir, t: 0, id: this.sid('wave') });
      for (let i = 0; i < 18; i++) match.particles.push({ x: E.x + (Math.random() - 0.5) * 80, y: -4, vx: (Math.random() - 0.5) * 7, vy: -2 - Math.random() * 5, life: 24, color: i % 3 ? C.carpet[0] : 0xc01828, size: 3, grav: 0.2 });
    }
    if (a.t <= d + 4) out.push(this.bhit(a.hid, E.x - 70, -150, E.x + 70, 2, ...AXE.hit, { radial: true }));
    E.crouch = 0.7; E.armL = [1.0, 1.3]; E.armR = [0.8, 1.1];
    if (a.t > d + 40) { E.weapon = null; return true; }
    return false;
  }
  /** The shockwaves from AXE DROP: red spikes running out along the carpet. */
  stepWaves(out) {
    for (const W of this.waves) { W.t++; W.x += W.dir * AXE.waveSpeed; out.push(this.bhit(W.id, W.x - 16, -34, W.x + 16, 0, ...AXE.wave, { dirX: W.dir })); if (W.t > AXE.waveLife || Math.abs(W.x) > 275) W.dead = true; }
    this.waves = this.waves.filter((W) => !W.dead);
  }
  /** TENDRIL WHIP: its arm unravels into a long red rope; it coils it back, then lashes it straight at you - three times. */
  atk_whip(match, a, out) {
    const E = this.e, wind = this.sp(WHIP.wind), cyc = wind + WHIP.lash + 12, i = Math.floor((a.t - 1) / cyc), q = (a.t - 1) % cyc;
    E.weapon = 'whip';
    if (i >= WHIP.n) { this.lash = null; E.weapon = null; return true; }
    if (q === 0) { const tg = this.faceNearest(match); a.tx = tg ? tg.x : E.x + E.dir * 200; a.ty = tg ? tg.y - 22 : -30; a.hid = this.sid('whip'); }
    const b = this.body();
    if (q < wind) {
      E.crouch = 0.4; E.armL = [-1.4 - q / wind * 0.8, -1.8]; E.armR = [0.6, 1.0];
      const hd = b.a1.h; this.lash = { pts: [0, 1, 2, 3, 4, 5].map((j) => ({ x: hd.x - E.dir * (10 + j * 6) + Math.sin(this.t * 0.4 + j) * 6, y: hd.y - j * 7 })) };
      if (q === wind - 6) sfx('whoosh', 0.6, 1.6);
      return false;
    }
    const k = q - wind, out1 = k < WHIP.lash ? Math.min(1, (k + 1) / 4) : Math.max(0, 1 - (k - WHIP.lash) / 8);
    const ang = Math.atan2((a.tx - b.sh.x) * E.dir, a.ty - b.sh.y); E.armL = [ang, ang]; E.armR = [0.4, 0.7];
    const hd = this.body().a1.h, dx = a.tx - hd.x, dy = a.ty - hd.y, dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl, L = WHIP.len * out1;
    const pts = []; for (let j = 0; j <= 14; j++) { const s = j / 14, wav = Math.sin(s * 9 - this.t * 0.6) * 10 * (1 - out1 * 0.6) * s; pts.push({ x: hd.x + ux * L * s - uy * wav, y: Math.min(-3, hd.y + uy * L * s + ux * wav) }); }   // (it drags along the carpet, never through it)
    this.lash = { pts };
    if (k === 0) { sfx('slash', 1, 0.5); sfx('clang', 0.4, 2.2); }
    if (k < WHIP.lash) for (let j = 3; j <= 14; j += 2) out.push(this.bhit(a.hid, pts[j].x - 12, pts[j].y - 12, pts[j].x + 12, pts[j].y + 12, ...WHIP.hit, { dirX: E.dir }));
    return false;
  }
  /** SPIKE BURST: its hands become hammers; it pounds the floor - each blow sends a red spike up out of the carpet under you (the carpet darkens first). */
  atk_spikes(match, a) {
    const E = this.e, ev = this.sp(SPIKE.every), q = (a.t - 1) % ev, i = Math.floor((a.t - 1) / ev);
    E.weapon = 'hammer';
    if (i < SPIKE.n) {
      this.faceNearest(match);
      const up = q < ev - 8, k = up ? Math.min(1, q / 10) : (q - (ev - 8)) / 4;
      E.crouch = up ? 0.25 : 0.75; E.armL = up ? [lerp(1.0, 2.9, k), 3.0] : [lerp(2.9, 0.6, Math.min(1, k)), 0.9]; E.armR = [E.armL[0] - 0.3, E.armL[1] - 0.2];
      if (q === ev - 4) {
        const tg = this.nearest(match, E.x); sfx('bighit', 0.8, 0.7); match.shake(6, 8);
        this.spikes.push({ x: Phaser.Math.Clamp(tg ? tg.x : E.x, -262, 262), t: 0, id: this.sid('spike') });
      }
      return false;
    }
    E.crouch += (0.3 - E.crouch) * 0.2;
    if (a.t > SPIKE.n * ev + 20) { E.weapon = null; return true; }
    return false;
  }
  /** The spikes: a dark patch on the carpet, then a red spike shoots up and sinks back. */
  stepSpikes(match, out) {
    for (const S of this.spikes) {
      S.t++; const u = S.t - SPIKE.warn;
      if (u === 0) { sfx('slash', 0.9, 0.4); sfx('glitch', 0.5, 0.9); for (let i = 0; i < 8; i++) match.particles.push({ x: S.x + (Math.random() - 0.5) * 30, y: -4, vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 4, life: 18, color: C.carpet[0], size: 3, grav: 0.2 }); }
      S.k = u < 0 ? 0 : u < 4 ? (u + 1) / 4 : u < SPIKE.up ? 1 : Math.max(0, 1 - (u - SPIKE.up) / 8);
      if (u >= 0 && u < 10) out.push(this.bhit(S.id, S.x - SPIKE.w / 2, -SPIKE.h * S.k, S.x + SPIKE.w / 2, 0, ...SPIKE.hit, { dirX: 1, radial: true }));
      if (u > SPIKE.up + 8) S.dead = true;
    }
    this.spikes = this.spikes.filter((S) => !S.dead);
  }

  /** Its death: it flickers apart into static (the explosions come from BossArena). */
  onDeath() { this.spikes = []; this.waves = []; this.lash = null; this.mark = null; this.e.weapon = null; this.e.y = 0; this.copy = null; this.mimics = []; this.walls = null; this.stain = null; this.smile = null; this.e.alpha = 1; this.dark = 0; this.stuck = 0; for (const L of this.lamps) L.on = 1; }

  /**
   * THE ENTRANCE (k = 0..1): an empty, humming room. The panels flicker... out, one by one, from the far side. In the
   * dark, a smile. The lights stutter back on - and it's standing there, right in the middle of the room, too tall,
   * head bent under the ceiling. It tilts its head. The pose the freeze frame stops on.
   */
  introPose(match, k, t, n) {
    this.t++;
    const E = this.e, e = (a, b) => Phaser.Math.Clamp((k - a) / (b - a), 0, 1);
    E.x = 20; E.dir = -1; E.sink = 0; E.glitch = 0;
    const off = e(0.1, 0.4);
    this.lamps.forEach((L, i) => { L.on = k < 0.62 ? (i / this.lamps.length < 1 - off ? 1 : 0) : 1; });
    this.dark = k < 0.62 ? off : Math.max(0, 1 - (k - 0.62) * 8);
    E.alpha = k < 0.62 ? 0 : 1;
    this.smile = k > 0.42 && k < 0.62 ? { t: Math.round((k - 0.42) * 200) } : null;
    if (t === Math.round(0.45 * n)) sfx('laugh', 0.5, 0.45);
    if (t === Math.round(0.62 * n)) { sfx('glitch', 1, 0.6); sfx('bighit', 0.7, 0.4); match.shake(6, 10); for (const L of this.lamps) L.flick = 14; }
    E.crouch = 0.2; E.armL = [0.15, 0.1]; E.armR = [-0.1, -0.05];
    if (k > 0.8) { E.crouch = 0.3 + 0.1 * Math.sin(t * 0.3); E.armL = [0.5, 1.2]; }
    if (t % 12 === 0 && k < 0.6) sfx('glitch', 0.1, 2);
  }
  /** The entrance's camera: wide on the empty room, creeping toward the smile in the dark, low and close when it appears. */
  introShot(k) { const c = this.core(); return k < 0.42 ? { x: 0, y: -150, zoom: 0.95 } : k < 0.62 ? { x: c.x, y: c.y + 20, zoom: 1.4 } : { x: c.x, y: c.y + 70, zoom: 1.15 }; }
  /** The freeze frame: its head and shoulders under the buzzing lights. */
  introAt() { const c = this.core(); return { x: c.x, y: c.y + 60, zoom: 1.1 }; }
  /** After the intro the lights are on and it's there. */
  endIntro() { super.endIntro(); this.dark = 0; this.smile = null; this.e.alpha = 1; for (const L of this.lamps) L.on = 1; }

  // ------------------------------------------------------------------ hazards (VS too)
  start_flicker(match, h) { h.title = 'FLICKER...'; sfx('glitch', 0.6, 1.2); }
  /** FLICKER: the panels stutter and die for a few seconds; in the dark, something smiles at the back of the room. */
  step_flicker(match, h) {
    if (h.t < 40) { if (h.t % 6 === 0) this.lamps[Math.floor(Math.random() * this.lamps.length)].flick = 6; return false; }
    if (h.t < 40 + FLICK.dur) { this.hzDark = Math.min(1, (h.t - 40) / 12); for (const L of this.lamps) L.hz = 1; return false; }
    this.hzDark = Math.max(0, (this.hzDark || 0) - 0.08); for (const L of this.lamps) { L.hz = 0; if (h.t === 40 + FLICK.dur) L.flick = 10; }
    return this.hzDark <= 0;
  }
  start_burst(match, h) { h.title = 'BURST PANEL!'; const tg = this.nearest(match); h.i = CEIL.lamps.reduce((bi, x, i) => (Math.abs(x - (tg ? tg.x : 0)) < Math.abs(CEIL.lamps[bi] - (tg ? tg.x : 0)) ? i : bi), 0); }
  /** BURST PANEL: the panel over someone buzzes and flickers, then bursts - a shower of sparks under it. */
  step_burst(match, h, out) {
    const x = CEIL.lamps[h.i], L = this.lamps[h.i];
    if (h.t < BURST.warn) { if (h.t % 4 === 0) L.flick = 3; this.sparks = { x, warn: true }; return false; }
    if (h.t < BURST.warn + BURST.on) {
      if (h.t === BURST.warn) { sfx('glass', 1, 1.1); sfx('laser', 0.5, 0.5); L.on = 0; }
      this.sparks = { x }; out.push(this.bhit('bp' + h.id + Math.floor(h.t / 16), x - 30, CEIL.y, x + 30, 0, ...BURST.hit));
      if (h.t % 2 === 0) match.particles.push({ x: x + (Math.random() - 0.5) * 40, y: CEIL.y + 4, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 3, life: 40, color: [0xffffff, 0xfff080, 0x80d0ff][h.t % 3], size: 2, grav: 0.2 });
      return false;
    }
    this.sparks = null; L.on = 1; L.flick = 12; return true;
  }

  /** Moves the room and THE HUM one frame; returns hazard + boss hitboxes. */
  step(match) {
    this.t++;
    const out = [];
    this.cycle.run(match, out);
    if (this.boss) {
      this.bossStep(match, out);
      if (this.stuck > 0) this.stuck--;
      this.record(match);
      this.stepMimics(match, out); this.stepSpikes(match, out); this.stepWaves(out);
      const B = this.boss;
      if (!this.feral && !B.dying && !match.over && B.hp > 0 && B.hp <= B.max * FERAL.at) { this.feral = true; B.atk = { name: 'transform', t: 0, id: ++B.uid }; B.last = 'transform'; }
      if (this.feral && !B.atk && B.wait > FERAL.rest) B.wait = FERAL.rest;
      if (this.boss.dying) { this.e.glitch = this.t % 4 < 2 ? 1 : 0; this.e.alpha = 1 - this.deathK(); this.walls = null; }
    }
    for (const L of this.lamps) if (L.flick > 0) L.flick--;
    return out;
  }

  // ------------------------------------------------------------------ drawing
  /** Draws the panels (lit / flickering / dead / red), the dark, THE HUM, its stain, smile, walls, mimics, sparks; the bar. */
  render() {
    const t = this.t, B = this.boss, g = this.humG, x = this.fxG, red = B && B.phase === 2;
    g.clear(); x.clear();
    const dark = Math.max(this.dark, this.hzDark || 0);
    // the ceiling panels (drawn under the dark so the dark can swallow them)
    this.lamps.forEach((L, i) => {
      const lx = CEIL.lamps[i], lit = L.on && !L.hz && !(L.flick > 0 && (t + i) % 4 < 2);
      g.fillStyle(C.out, 1); g.fillRect(lx - 26, CEIL.y - 34, 52, 14);
      g.fillStyle(lit ? (red ? 0xff6050 : C.light[0]) : 0x7a7460, 1); g.fillRect(lx - 24, CEIL.y - 32, 48, 10);
      if (lit) { g.fillStyle(red ? C.red : C.light[1], red ? 0.14 : 0.1); g.fillTriangle(lx - 24, CEIL.y - 22, lx + 24, CEIL.y - 22, lx + 60, 0); g.fillTriangle(lx - 24, CEIL.y - 22, lx - 60, 0, lx + 60, 0); }
    });
    if (!B) {                                                                            // VS: it stands far back in the haze between the pillars, watching
      const fx = 70 + Math.sin(t * 0.004) * 20; g.fillStyle(C.black, 0.35); g.fillRect(fx - 3, -150, 6, 110); g.fillCircle(fx, -160, 8);
      if (t % 300 < 120) { g.fillStyle(0xffffff, 0.35); g.fillRect(fx - 4, -162, 2, 2); g.fillRect(fx + 2, -162, 2, 2); g.fillRect(fx - 4, -156, 8, 1); }
    }
    if (this.walls) for (const s of [-1, 1]) {                                            // THE WALLS: wallpapered slabs sliding in
      const wx = s * this.walls.x;
      g.fillStyle(C.out, 1); g.fillRect(s > 0 ? wx - 2 : -700, CEIL.y, s > 0 ? 702 - wx : 702 + wx, -CEIL.y);
      this.paper(g, s > 0 ? wx : -700, CEIL.y, s > 0 ? 700 - wx : 700 + wx, -CEIL.y, 1);
      g.fillStyle(0x3a3010, 0.3); g.fillRect(s > 0 ? wx : -700, CEIL.y, s > 0 ? 700 - wx : 700 + wx, -CEIL.y);
      g.fillStyle(C.wall[3], 1); g.fillRect(wx - (s > 0 ? 0 : 8), CEIL.y, 8, -CEIL.y); g.fillStyle(0x000000, 0.25); g.fillRect(wx + (s > 0 ? -14 : 8), CEIL.y, 6, -CEIL.y);
    }
    if (this.stain) { const S = this.stain, sh = S.shake ? (Math.random() - 0.5) * 6 : 0; g.fillStyle(0x1a1408, 0.35 + 0.35 * S.k); g.fillEllipse(S.x + sh, -2, 50 + 30 * S.k, 10 + 4 * S.k); }
    if (B) this.drawHum(g, this.e.x, this.e.dir, this.e.alpha, B.flash > 0, 1);
    if (B) this.drawFeralFx(g, x);
    this.drawCopy();
    for (const m of this.mimics) this.drawMimic(g, m);
    if (dark > 0) { x.fillStyle(0x050302, 0.9 * dark); x.fillRect(-700, -700, 1400, 1100); }
    if (red && dark < 0.5) { x.fillStyle(C.red, 0.08 + 0.04 * Math.sin(t * 0.2)); x.fillRect(-700, -700, 1400, 1100); }
    if (this.smile) { const k = Math.min(1, this.smile.t / 20), b = this.body(); this.drawFace(x, b.head.x, b.head.y, this.e.dir, k, 1.2); }
    if (dark > 0.6 && !this.smile && this.hzDark > 0.6 && t % 200 < 90) this.drawFace(x, 160 * Math.sin(t * 0.001 + 1), -170, -1, 0.5, 0.7);   // FLICKER: something at the back
    if (this.sparks && this.sparks.warn) { x.fillStyle(0xffffff, t % 6 < 3 ? 0.5 : 0.1); x.fillRect(this.sparks.x - 24, CEIL.y - 32, 48, 10); }
    if (B) this.drawBar();
  }
  /** Its face: two pin-prick white eyes and a wide, thin smile full of little teeth; a = alpha, s = size. */
  drawFace(g, hx, hy, d, a, s) {
    g.fillStyle(0xffffff, a); g.fillRect(hx - 9 * s + d * 3, hy - 8 * s, 3 * s, 3 * s); g.fillRect(hx + 5 * s + d * 3, hy - 8 * s, 3 * s, 3 * s);
    g.fillStyle(0xffffff, a); g.fillPoints([{ x: hx - 18 * s + d * 3, y: hy + 1 * s }, { x: hx + 18 * s + d * 3, y: hy + 1 * s }, { x: hx + 12 * s + d * 3, y: hy + 7 * s }, { x: hx - 12 * s + d * 3, y: hy + 7 * s }], true);
    g.fillStyle(C.black, a); for (let i = 0; i < 9; i++) g.fillRect(hx - 14 * s + i * 3.4 * s + d * 3, hy + 3.5 * s, 1.2 * s, 2 * s);
    g.fillRect(hx - 15 * s + d * 3, hy + 3.6 * s, 30 * s, 0.8 * s);
  }
  /**
   * THE HUM: a jittering silhouette of black static - long thin legs bending wrong, a stooped torso, arms down to its
   * knees with long fingers (the front one stretched in REACH), a small head with its face; glitching sideways now and
   * then. Only what's above the carpet shows (the carpet is drawn in front of it - NOCLIP sinks it out of sight).
   */
  drawHum(g, x0, d, A, flash, s) {
    if (A < 0.02) return;
    const E = this.e, b = this.body(), t = this.t, J = () => (Math.random() - 0.5) * 2.2, gl = E.glitch ? (Math.random() - 0.5) * 10 : 0;
    const F = this.feralK || 0, fat = 1 + F * 0.9;
    const col = flash ? 0xffffff : F > 0.5 ? 0x5a0610 : C.black, edge = F > 0.5 ? ((t >> 1) % 3 ? 0xc01828 : C.black) : C.static[(t >> 1) % 3];
    const P = (p) => ({ x: p.x + gl + J(), y: p.y + J() });
    const FL = 2, clip = (a, c) => (a.y > FL ? { x: c.x + (a.x - c.x) * (FL - c.y) / (a.y - c.y || 1), y: FL } : a);   // nothing shows below the carpet
    const seg = (p, q, w0) => { let a = P(p), c = P(q); if (a.y > FL && c.y > FL) return; const w = w0 * fat; a = clip(a, c); c = clip(c, a); g.lineStyle(w + 3, edge, A * 0.5); g.lineBetween(a.x, a.y, c.x, c.y); g.lineStyle(w, col, A); g.lineBetween(a.x, a.y, c.x, c.y); };
    if (F > 0) this.drawTendrils(g, b, d, A * Math.min(1, F * 1.5), F);
    // the legs: knees bending backward, long thin shins
    const step = Math.sin(E.walk) * 14;
    for (const sd of [-1, 1]) {
      const foot = { x: b.ft.x + sd * 12 + sd * step * 0.5, y: b.ft.y }, knee = { x: (b.hip.x + foot.x) / 2 - d * 16, y: (b.hip.y + foot.y) / 2 };
      seg(b.hip, knee, 6); seg(knee, foot, 5); seg(foot, { x: foot.x + d * 14, y: foot.y }, 4);
    }
    // the torso: narrow, stooped, a ridge of spine
    const mid = { x: (b.hip.x + b.sh.x) / 2 - d * 6, y: (b.hip.y + b.sh.y) / 2 };
    seg(b.hip, mid, 14); seg(mid, b.sh, 16);
    if (mid.y < FL) { g.fillStyle(col, A); g.fillPoints([P({ x: b.sh.x - 16, y: b.sh.y - 2 }), P({ x: b.sh.x + 16, y: b.sh.y - 2 }), P({ x: mid.x + 9, y: Math.min(mid.y, FL) }), P({ x: mid.x - 9, y: Math.min(mid.y, FL) })], true); }
    // the neck and head
    const nk = { x: (b.sh.x + b.head.x) / 2, y: b.head.y + 14 };
    seg(b.sh, nk, 5);
    const h = P(b.head); if (h.y > FL + 12) return;
    const hs = 1 + F * 0.45;
    g.fillStyle(edge, A * 0.5); g.fillEllipse(h.x, h.y, 34 * hs, 42 * hs); g.fillStyle(col, A); g.fillEllipse(h.x, h.y, 30 * hs, 38 * hs);
    if (F > 0.3) { g.lineStyle(2, C.black, A * F); for (let i = 0; i < 4; i++) { const vx = mid.x + (i - 1.5) * 6; g.lineBetween(vx, b.sh.y + 4, vx + Math.sin(t * 0.1 + i) * 6, mid.y + 20); } g.lineStyle(0); }   // black veins over the red
    // the arms: long, with long fingers
    for (const arm of [b.a2, b.a1]) {
      seg(b.sh, arm.e, 5); seg(arm.e, arm.h, 4);
      const ang = Math.atan2(arm.h.y - arm.e.y, arm.h.x - arm.e.x);
      if (E.weapon && F > 0.5) { if (E.weapon !== 'whip' || arm === b.a2) this.drawWeapon(g, P(arm.h), ang, E.weapon, A, flash); continue; }
      for (let f = -1; f <= 1; f++) seg(arm.h, { x: arm.h.x + Math.cos(ang + f * 0.3) * 20, y: arm.h.y + Math.sin(ang + f * 0.3) * 20 }, F > 0.5 ? 1.6 : 2);
    }
    if (F > 0.5) this.drawMaw(g, h.x, h.y, d, A, hs, F);
    else if (!this.smile) this.drawFace(g, h.x, h.y, d, A, 1);
    if (E.glitch && A > 0.5) for (let i = 0; i < 4; i++) { g.fillStyle(i % 2 ? 0xffffff : C.black, 0.5); g.fillRect(b.hip.x - 30 + Math.random() * 60, b.head.y + Math.random() * (b.ft.y - b.head.y), 20 + Math.random() * 30, 2); }
  }
  /** THE HUNGER's tendrils: red-and-black ropes writhing out of its back (longer as the change takes hold). */
  drawTendrils(g, b, d, A, F) {
    const t = this.t;
    for (let k = 0; k < 6; k++) {
      const base = { x: b.sh.x - d * 10, y: b.sh.y + 6 + k * 9 }, len = (50 + k * 12) * F, a0 = -Math.PI / 2 - d * (0.35 + k * 0.32);
      let p = base;
      for (let j = 1; j <= 6; j++) {
        const ang = a0 + Math.sin(t * 0.13 + k * 1.7 + j * 0.7) * 0.5, q = { x: p.x + Math.cos(ang) * len / 6, y: p.y + Math.sin(ang) * len / 6 }, w = 7 - j;
        if (q.y < 2) { g.lineStyle(w + 2, 0xc01828, A * 0.8); g.lineBetween(p.x, p.y, q.x, q.y); g.lineStyle(w, C.black, A); g.lineBetween(p.x, p.y, q.x, q.y); }
        p = q;
      }
    }
    g.lineStyle(0);
  }
  /** THE HUNGER's face: white jagged eyes slanting in, and the smile torn into a huge mouth of teeth with a red throat. */
  drawMaw(g, hx, hy, d, a, s, F) {
    const o = d * 4, open = 0.75 + 0.25 * Math.sin(this.t * 0.25);
    g.fillStyle(0xffffff, a);
    g.fillTriangle(hx - 16 * s + o, hy - 15 * s, hx - 3 * s + o, hy - 8 * s, hx - 14 * s + o, hy - 5 * s);
    g.fillTriangle(hx + 16 * s + o, hy - 15 * s, hx + 3 * s + o, hy - 8 * s, hx + 14 * s + o, hy - 5 * s);
    const my = hy + 7 * s, mw = 22 * s, mh = 10 * s * open;
    g.fillStyle(C.black, a); g.fillEllipse(hx + o, my, mw * 2 + 4, mh * 2 + 4);
    g.fillStyle(0x9a0c1c, a); g.fillEllipse(hx + o, my + 2, mw * 1.6, mh * 1.4);
    g.fillStyle(0xffffff, a);
    for (let i = 0; i < 8; i++) {
      const tx = hx + o - mw + (i + 0.5) * (mw * 2 / 8), tw = mw / 8, edge = 1 - Math.abs(i - 3.5) / 4.5;
      g.fillTriangle(tx - tw, my - mh * edge, tx + tw, my - mh * edge, tx, my - mh * edge + 6 * s);
      g.fillTriangle(tx - tw, my + mh * edge, tx + tw, my + mh * edge, tx, my + mh * edge - 6 * s);
    }
    if (F >= 1 && this.t % 60 < 30) { g.fillStyle(0xc01828, a * 0.8); g.fillRect(hx + o - 2, my + mh, 3, 6 + (this.t % 30) / 3); }   // drool
  }
  /** A hand turned weapon (at hand point h, pointing along ang): a curved BLADE, an AXE, a HAMMER, or the stub of the WHIP. */
  drawWeapon(g, h, ang, kind, A, flash) {
    const ux = Math.cos(ang), uy = Math.sin(ang), px = -uy, py = ux, red = flash ? 0xffffff : 0xc01828, dk = C.black;
    const at = (f, s) => ({ x: h.x + ux * f + px * s, y: h.y + uy * f + py * s });
    if (kind === 'blade') {
      g.fillStyle(dk, A); g.fillPoints([at(-4, -8), at(30, -10), at(66, 4), at(30, 8), at(-4, 7)], true);
      g.fillStyle(red, A); g.fillPoints([at(0, -5), at(30, -7), at(60, 3), at(30, 4), at(0, 4)], true);
      g.lineStyle(1.5, 0xffd0d0, A * 0.9); g.lineBetween(at(4, -5).x, at(4, -5).y, at(56, 2).x, at(56, 2).y);
    } else if (kind === 'axe') {
      g.lineStyle(6, dk, A); g.lineBetween(h.x, h.y, at(40, 0).x, at(40, 0).y);
      g.fillStyle(dk, A); g.fillPoints([at(28, -3), at(20, -26), at(46, -30), at(52, -3)], true);
      g.fillStyle(red, A); g.fillPoints([at(30, -4), at(23, -23), at(44, -26), at(49, -4)], true);
      g.lineStyle(2, 0xffd0d0, A * 0.9); g.lineBetween(at(22, -24).x, at(22, -24).y, at(45, -28).x, at(45, -28).y);
    } else if (kind === 'hammer') {
      g.lineStyle(6, dk, A); g.lineBetween(h.x, h.y, at(30, 0).x, at(30, 0).y);
      g.fillStyle(dk, A); g.fillPoints([at(24, -18), at(50, -18), at(50, 18), at(24, 18)], true);
      g.fillStyle(red, A); g.fillPoints([at(27, -15), at(47, -15), at(47, 15), at(27, 15)], true);
      g.fillStyle(dk, A * 0.6); g.fillPoints([at(35, -15), at(39, -15), at(39, 15), at(35, 15)], true);
    } else {
      g.lineStyle(5, dk, A); g.lineBetween(h.x, h.y, at(18, Math.sin(this.t * 0.4) * 4).x, at(18, Math.sin(this.t * 0.4) * 4).y);
    }
    g.lineStyle(0);
  }
  /** THE HUNGER's leftovers in the room: the whip's rope, the spikes and their warnings, the shockwaves, AXE DROP's landing mark. */
  drawFeralFx(g, x) {
    const t = this.t;
    if (this.lash && this.e.weapon === 'whip') {
      const pts = this.lash.pts, hd = this.body().a1.h;
      for (const [w, c] of [[9, 0xc01828], [6, C.black]]) { g.lineStyle(w, c, 1); let p = hd; for (const q of pts) { g.lineBetween(p.x, p.y, q.x, q.y); p = q; } }
      const tip = pts[pts.length - 1]; g.lineStyle(0); g.fillStyle(0xc01828, 1); g.fillCircle(tip.x, tip.y, 5);
    }
    for (const S of this.spikes) {
      if (S.t < SPIKE.warn) { const k = S.t / SPIKE.warn; x.fillStyle(0x3a0006, 0.3 + 0.4 * k); x.fillEllipse(S.x, -1, SPIKE.w + 20 * k, 8); if (t % 8 < 4) { x.fillStyle(0xff2030, 0.5); x.fillEllipse(S.x, -1, 12 + 20 * k, 3); } continue; }
      if (!S.k) continue;
      const hh = SPIKE.h * S.k;
      g.fillStyle(C.black, 1); g.fillTriangle(S.x - 20, 2, S.x + 20, 2, S.x + 2, -hh - 4);
      g.fillStyle(0xc01828, 1); g.fillTriangle(S.x - 15, 2, S.x + 12, 2, S.x + 1, -hh);
      g.fillStyle(C.black, 1); g.fillTriangle(S.x - 26, 2, S.x - 12, 2, S.x - 20, -hh * 0.45); g.fillTriangle(S.x + 10, 2, S.x + 26, 2, S.x + 19, -hh * 0.55);
      g.fillStyle(0xff6070, 0.8); g.fillRect(S.x - 3, -hh * 0.8, 2, hh * 0.6);
    }
    for (const W of this.waves) {
      const k = 1 - W.t / AXE.waveLife;
      for (let i = 0; i < 3; i++) { const wx = W.x - W.dir * i * 12, hh = (34 - i * 9) * k; g.fillStyle(i % 2 ? C.black : 0xc01828, 1); g.fillTriangle(wx - 8, 2, wx + 8, 2, wx + W.dir * 4, -hh); }
    }
    if (this.mark) { x.fillStyle(0xff2030, t % 6 < 3 ? 0.55 : 0.25); x.fillEllipse(this.mark.x, -1, 120, 10); x.lineStyle(2, 0xff2030, 0.8); x.strokeEllipse(this.mark.x, -1, 150, 14); x.lineStyle(0); }
  }
  /** A mimic: a small, shambling copy of it (half size), flashing when about to burst. */
  drawMimic(g, m) {
    const t = this.t, fl = m.fuse != null && m.fuse % 4 < 2, col = fl ? 0xffffff : C.black, J = () => (Math.random() - 0.5) * 2;
    const hip = { x: m.x, y: -52 }, sh = { x: m.x + m.dir * 6, y: -100 }, hd = { x: m.x + m.dir * 9, y: -118 };
    g.lineStyle(4, col, 1);
    for (const sd of [-1, 1]) { const fx = m.x + sd * 8 + Math.sin(m.walk + sd) * 8; g.lineBetween(hip.x + J(), hip.y, fx - m.dir * 6, -26); g.lineBetween(fx - m.dir * 6, -26, fx, 0); }
    g.lineStyle(9, col, 1); g.lineBetween(hip.x, hip.y, sh.x + J(), sh.y);
    g.lineStyle(3, col, 1); g.lineBetween(sh.x, sh.y, sh.x + m.dir * 10, -60 + Math.sin(t * 0.2) * 4); g.lineBetween(sh.x, sh.y, sh.x - m.dir * 4, -56);
    g.lineStyle(0); g.fillStyle(col, 1); g.fillEllipse(hd.x, hd.y, 18, 22);
    if (!fl) this.drawFace(g, hd.x, hd.y, m.dir, 1, 0.55);
  }
}

/** LEVEL 0's miniature for the stage select screen. */
export function drawLevelZeroPreview(g, x, y, w, h) {
  g.fillStyle(C.wall[2], 1); g.fillRect(x, y, w, h);
  for (let i = 0; i < 6; i++) { g.fillStyle(C.wall[0], 0.5); g.fillRect(x + w * (0.05 + i * 0.17), y + h * 0.2, w * 0.06, h * 0.6); }
  g.fillStyle(C.ceil[1], 1); g.fillRect(x, y, w, h * 0.14);
  for (let i = 0; i < 4; i++) { g.fillStyle(C.light[0], 1); g.fillRect(x + w * (0.1 + i * 0.23), y + h * 0.04, w * 0.12, h * 0.05); }
  g.fillStyle(C.carpet[1], 1); g.fillRect(x, y + h * 0.78, w, h * 0.22);
  const cx = x + w * 0.58, fy = y + h * 0.78;
  g.fillStyle(C.black, 1); g.fillRect(cx - 2, fy - h * 0.5, 5, h * 0.5); g.fillRect(cx - 4, fy - h * 0.62, 9, h * 0.16); g.fillCircle(cx + 1, fy - h * 0.66, h * 0.06);
  g.fillRect(cx - 6, fy - h * 0.6, 2, h * 0.36); g.fillRect(cx + 6, fy - h * 0.6, 2, h * 0.36);
  g.fillStyle(0xffffff, 1); g.fillRect(cx - 2, fy - h * 0.68, 1, 1); g.fillRect(cx + 3, fy - h * 0.68, 1, 1); g.fillRect(cx - 3, fy - h * 0.64, 8, 1);
}

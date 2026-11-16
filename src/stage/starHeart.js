// VESPERION's second half - THE BEHEADING and HIS CORRUPTED HEART (mixed into StarBossStage, src/stage/starBossStage.js;
// what comes after it - the crowning and THE STAR KING - is starKing.js).
// At half health his head cracks off at the neck, bounces across the observatory floor and comes to rest there, its
// maw hanging open on a swirling dark; his body slumps and sinks. JUMP INTO HIS MOUTH (or wait: the void pulls you in)
// and you fall down inside him: a mouth of flesh - a black tongue for a floor with jagged teeth along it, molars for
// ledges, ribs of bone, sludge dripping from the roof, the skulls of the ones before you - and in the middle THE
// CORRUPTED HEART: a shadow in the shape of a heart, smoking at its edges, cracked with light and covered in eyes,
// a great expressive red one in the middle (its weak spot) that glares, squints, flinches, laughs and panics.
// It gets its own name card. Its attacks: VOID BOLTS (its eyes fire dark orbs at you - hit one to pop it), VEIN LASH,
// HEARTBEAT (a ring of dark force with gaps), THE GAZE (a tracking beam), SHADOW GRASP (claws from the floor), HEART
// SLAM (it drops and lies stunned), VOID STORM (when it panics) - and its own: FLATLINE (a heart monitor's trace runs
// across the floor drawing spikes you must jump, then it flatlines: CLEAR! - the whole floor is shocked - and the
// heart lies stopped and open). At a quarter of his health the great eye SHATTERS, black sludge pours out of it and
// floods the place, floating you up and out of his mouth - into his crowning (starKing.js).
// Without a player watching (the sim) the cutscenes are skipped.
import { sfx } from '../audio/sfx.js';
import { VIEW_W, VIEW_H } from '../config.js';

const P = {
  out: 0x05030c, void: [0x020106, 0x06030e, 0x0d0619, 0x170a2a, 0x22103a], vein: [0x2a0820, 0x7a1650, 0xd83a8a, 0xffa0d0],
  glow: [0x4a1ac8, 0x8a5aff, 0xd8c0ff], eye: [0x1a0008, 0x8a0a22, 0xe8203a, 0xff7a6a, 0xffd8c8], bone: [0x0a0814, 0x15122a, 0x241e44, 0x3a3268],
  gold: [0x7a4a10, 0xb8801e, 0xe8b440, 0xfff0a0], star: [0xffb030, 0xffe070, 0xfff8e0], shade: [0x000000, 0x0a0410, 0x160822, 0x26103a],
};
// THE BEHEADING (frames): the light cracking round his neck, the head snapping off, the body sinking, the end; the head's fall
const DECAP = { crack: 24, snap: 96, sink: [160, 250], n: 320, grav: 0.34, bounce: 0.42, roll: 2.8 };
// THE BEHEADING's head roll: how fast it rolls, how it slows, where it stops at most
const ROLL = { fric: 0.982, maxX: 120 };
// the torn neck on his body (relative to his heart)
const NECK = { dy: -62 };
// the way in: his open mouth on the fallen head - how close (x) you must be, and that you must be in the air; after `wait` frames (`sim` in the sim) the void pulls you in anyway
const MAW = { w: 30, up: 40, down: 26, wait: 600, sim: 240 };
// going in: frames the void drags you to the neck, the black fall, the picture opening again inside, the end
const DIVE_IN = { pull: 46, black: 70, open: 110, n: 140 };
// THE CORRUPTED HEART: where it floats, its size, how far it drifts, how much longer it pauses between attacks, the great eye's damage multiplier, the little eyes ([x, y, r] on it)
// end: the health (part of his max) at which its eye shatters; frenzy: below this it panics (VOID STORM, double lashes...)
const HEART = { x: 0, y: -122, r: 58, drift: 120, bob: 12, ease: 0.04, rest: 2.1, eye: 2, body: 1.5, end: 0.25, frenzy: 0.34, eyes: [[-40, -34, 8], [38, -38, 8], [-54, 2, 7], [52, 8, 7], [-24, 40, 6], [24, 42, 6], [0, -60, 6], [-12, 62, 4], [62, -16, 5], [-62, -22, 5]] };
// VOID BOLTS: wind-up, bolts per volley (normal / THE LAST LIGHT), frames between, speed, size, life, homing, hit
const BOLT = { warm: 34, n: [3, 5], every: 7, speed: 4.4, r: 9, life: 190, home: 0.05, hit: [6, [60, 3.8, 0.4]] };
// VEIN LASH: the warning, how fast it whips across, how thick, the two heights (floor, ledges), hit
const LASH = { warn: 56, speed: 12, h: 16, ys: [-18, -116], hit: [9, [35, 5, 0.5]] };
// HEARTBEAT: the squeeze, how fast the ring grows, its gaps (radians), the beats (normal / LAST LIGHT), frames apart, hit
const PULSE = { squeeze: 48, speed: 4, gap: 0.34, beats: [1, 2], apart: 34, hit: [9, [70, 5, 0.55]] };
// THE GAZE: frames aiming (it tracks you), locked (it stops), firing; beam width; hit (a new strike every `tick` frames)
const GAZE = { aim: 66, lock: 18, fire: 32, w: 14, tick: 8, hit: [3, [70, 3, 0.25]] };
// SHADOW GRASP: the warning marks, how long the claws stay up, their size, hit
const GRASP = { warn: 50, up: 22, w: 44, h: 96, hit: [10, [85, 5.4, 0.65]] };
// HEART SLAM: rising over you, the drop (frames), lying stunned on the floor (hurt x`stun`), floating back up, hit, the floor waves
const SLAM = { rise: 36, fall: 12, rest: 110, back: 40, stun: 1.5, hit: [12, [70, 5.6, 0.75]], wave: { speed: 5, life: 46, hit: [7, [60, 4, 0.45]] } };
// VOID STORM (THE LAST LIGHT): turns of the spiral, bolts per turn, frames between
const STORM = { turns: 3, arms: 7, every: 12 };
// FLATLINE (its own attack): rising into place, when the trace starts, its speed (first beat -> last), beats across the
// floor, the baseline's height, a spike's height / half-width / how long it burns, the CLEAR! warning, the shock, how long the heart lies stopped (hurt x`open`)
const FLAT = { rise: 40, start: 50, speed: [4.2, 7.5], beats: 5, base: -12, spike: 104, w: 12, burn: 18, clear: 56, zap: 14, stop: 150, open: 1.6,
  hit: [9, [80, 5, 0.5]], shock: [10, [85, 5.2, 0.6]] };
// THE EYE SHATTERS (frames): the eye cracking, shattering, the sludge gushing, the flood rising (start, full), you're spat out, you land, the end
const BURST = { crack: 40, gush: 52, rise: [70, 165], out: 172, land: 214, n: 222 };
// the great eye's moods: how open the upper / lower lid is, the brow (+ = angry V, - = worried), pupil size, iris glow, tremble, black tears, a smile, a spiral
const MOODS = {
  watch: { top: 1, bot: 1, brow: 0.2, pupil: 1, glow: 0.4, shake: 0 },
  angry: { top: 0.6, bot: 0.85, brow: 1, pupil: 0.55, glow: 0.9, shake: 0.4 },
  charge: { top: 1.3, bot: 1.25, brow: 0.6, pupil: 0.22, glow: 1.4, shake: 1.2 },
  pain: { top: 0.12, bot: 0.18, brow: -0.6, pupil: 1, glow: 0.2, shake: 2.2, tear: 1 },
  dizzy: { top: 0.5, bot: 0.7, brow: -0.5, pupil: 1.2, glow: 0.1, shake: 0, spiral: 1 },
  laugh: { top: 0.9, bot: 0.3, brow: 0.5, pupil: 0.8, glow: 0.7, shake: 1.2, smile: 1 },
  fear: { top: 1.35, bot: 1.3, brow: -1, pupil: 0.3, glow: 0.3, shake: 2.6, tear: 1 },
  mad: { top: 1.15, bot: 0.7, brow: 1.2, pupil: 0.35, glow: 1.1, shake: 1.6 },
};

// his head's radius (BODY.headR in starBossStage.js)
const BODY_R = 44;
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const seeded = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

/** VESPERION's beheading and his heart: methods attached to StarBossStage.prototype (names must be new there). */
export class HeartPhase {
  // ------------------------------------------------------------------ THE BEHEADING
  /**
   * Half health: everything he was doing stops and his head comes off. With a player watching it's a cutscene
   * (decapStep); in the sim it just happens (decapNow).
   */
  startHeadless(match) {
    const B = this.boss;
    this.ball = null; this.planetOut = false; this.moons = null; this.waves = []; this.rings = []; this.comets = []; this.cons = null; this.well = null; this.nova = null;
    this.devouring = false; this.brk = 0; this.cracks = 0; this.stars = []; this.meteors = []; this.flare = null;
    this.headless = 'cut'; this.hazardsOn = false; this.v.shell = 0; B.atk = null; B.wait = 9999;
    this.bolts = []; this.lashes = []; this.vrings = []; this.grasps = []; this.hwaves = []; this.gaze = null;
    const j = this.joints();
    this.headFall = { x: j.head.x, y: j.head.y, vx: 0, vy: 0, a: 0, on: false };
    if (this.watched && this.uiG) {
      const cam = match.worldCam || match.cameras.main;
      this.cut = { kind: 'decap', t: 0, n: DECAP.n, once: new Set(), armed: false };
      this.ccam = { x: cam.midPoint.x, y: cam.midPoint.y, zoom: cam.zoom };
      this.rageText.setVisible(false); B.rage = 0;
      return;
    }
    this.decapNow(match);
  }
  /** The beheading's end state at once: the head lying on the floor with its maw wide open, the body sunk, waiting for you to jump in. */
  decapNow(match) {
    const F = this.headFall; if (!F.rest) { F.x = Math.min(ROLL.maxX, Math.max(90, F.x)); F.y = -BODY_R; F.vx = F.vy = 0; F.rest = true; }
    this.v.sink = 1; this.v.slump = 1; this.v.eye = 0.3; this.v.mouth = 1; this.mawBig = 1; this.headSpin = 0;
    this.limpHands(true);
    this.cut = null; this.headless = 'maw'; this.neckT = 0;
    if (this.uiG) this.uiG.clear();
    this.boss.wait = 9999;
  }
  /** His hands drop lifeless to the floor either side (at once, or eased). */
  limpHands(now) {
    this.hands.forEach((h) => { h.tx = h.side * 238; h.ty = -18; h.ta = h.side * 1.5; h.tf = 0.55; h.fast = 0.06; h.glow = 0; if (now) { h.x = h.tx; h.y = h.ty; h.a = h.ta; h.fist = h.tf; } });
  }
  /** The cutscene camera (MatchScene asks introCam while `cut` runs): eased toward `cut.shot`. */
  cutCam() {
    const w = this.cut.shot || { x: 0, y: -150, zoom: 1 };
    this.ccam = { x: lerp(this.ccam.x, w.x, 0.08), y: lerp(this.ccam.y, w.y, 0.08), zoom: lerp(this.ccam.zoom, w.zoom, 0.08) };
    return { ...this.ccam, exact: true };
  }
  /** One frame of whichever mid-fight cutscene is playing. */
  cutStep(match) {
    this.t++; if (this.whiteT > 0) this.whiteT--; if (this.geyser > 0) this.geyser--;
    const k = this.cut.kind;
    if (k === 'decap') this.decapStep(match); else if (k === 'dive') this.diveInStep(match); else if (k === 'burst') this.burstStep(match); else this.crownStep(match);
    this.stepHands(); this.v.shake *= 0.85;
  }
  /** A fresh press skips the cutscene: straight to its end. */
  skipCut(match) {
    const k = this.cut.kind;
    if (k === 'decap') this.decapNow(match);
    else if (k === 'dive') { this.goInside(match); this.cut = null; if (this.uiG) this.uiG.clear(); this.heartCard(match); }
    else if (k === 'burst') { this.cut = null; if (this.uiG) this.uiG.clear(); this.popOut(match, true); this.crownNow(match); this.kingCard(match); }
    else { this.cut = null; if (this.uiG) this.uiG.clear(); this.crownNow(match); this.kingCard(match); }
  }
  /**
   * THE BEHEADING: he freezes - WHAT... IS THIS... - a ring of light cracks round his neck, brighter and brighter, beams
   * shooting out of it; SNAP: the head tips off, falls, bounces off the floor and rolls away over the edge into the
   * void (the camera follows it), his hands drop dead; then the body sags and sinks with a long rumble until the torn
   * neck sits just above the floor, dark light pouring out of it.
   */
  decapStep(match) {
    const C = this.cut, t = ++C.t, v = this.v, F = this.headFall, j = this.joints();
    const once = (k, at) => t >= at && !C.once.has(k) && !!C.once.add(k);
    v.slump = lerp(v.slump, 0, 0.1);
    if (t < DECAP.snap) {
      v.shake = 1 + t * 0.05; v.mouth = 0.5 + Math.sin(t * 0.4) * 0.2;
      this.hands.forEach((h) => { h.tx = j.head.x + h.side * 70; h.ty = j.head.y + 40; h.ta = -h.side * 0.9; h.tf = 0.2; h.fast = 0.1; });   // clawing at his own neck
      F.x = j.head.x; F.y = j.head.y;
      C.shot = { x: j.head.x, y: j.head.y + 40, zoom: 1.5 + t * 0.004 };
      if (once('say', 8)) { match.popText({ x: j.head.x, y: j.head.y - 70 }, 'WHAT... IS... THIS...', '#e0d4ff'); sfx('rumble', 0.8, 0.5); }
      if (t > DECAP.crack && t % 10 === 0) { sfx('glass', 0.35 + t * 0.004, 1.6 - t * 0.006); match.shake(2 + t * 0.03, 6); }
      this.neckCrack = Math.max(0, (t - DECAP.crack) / (DECAP.snap - DECAP.crack));
    } else {
      if (once('snap', DECAP.snap)) {
        this.neckCrack = 0; this.headless = 'cut'; v.eye = 0.3; v.mouth = 1;
        F.vx = DECAP.roll * 0.5; F.vy = -4; sfx('bighit', 1, 0.45); sfx('glass', 1, 0.7); sfx('roar', 0.9, 0.45); match.shake(16, 26);
        this.whiteT = 14; this.limpHands(false);
        for (let i = 0; i < 36; i++) { const q = Math.random() * Math.PI * 2, s = 2 + Math.random() * 6; match.particles.push({ x: j.heart.x + Math.cos(q) * 30, y: j.heart.y + NECK.dy, vx: Math.cos(q) * s, vy: Math.sin(q) * s - 2, life: 30 + Math.random() * 20, color: [P.glow[1], P.glow[2], P.gold[2], 0xffffff][i % 4], size: 3, grav: 0.12, drag: 0.95 }); }
      }
      if (!F.rest) {                                                               // the head falls, bounces, rolls across the floor and comes to rest
        F.vy += DECAP.grav; F.x += F.vx; F.y += F.vy;
        if (F.y + BODY_R >= 0 && F.vy > 0) {
          F.y = -BODY_R;
          if (F.vy > 2) { sfx('bighit', 0.8, 0.5 + Math.random() * 0.1); match.shake(8, 10); for (let i = 0; i < 12; i++) match.particles.push({ x: F.x + (Math.random() - 0.5) * 60, y: -2, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 3, life: 22, color: [0xb4b8d0, 0xe8b440, 0x8a6aff][i % 3], size: 3, grav: 0.2 }); F.vx = Math.max(F.vx, DECAP.roll); }
          F.vy = F.vy > 2 ? -F.vy * DECAP.bounce : 0; v.eye = Math.max(0.3, v.eye - 0.1);
        }
        if (F.y >= -BODY_R - 0.5 && F.vy === 0) F.vx *= ROLL.fric;
        this.headSpin = (this.headSpin || 0) + F.vx / BODY_R;                          // (it rolls)
        if (F.x > ROLL.maxX) { F.x = ROLL.maxX; F.vx = 0; }
        if (Math.abs(F.vx) < 0.12 && F.vy === 0) { F.rest = true; F.vx = 0; sfx('clang', 0.5, 0.5); }
      } else { this.headSpin = lerp(this.headSpin || 0, Math.round((this.headSpin || 0) / (Math.PI * 2)) * Math.PI * 2, 0.1); v.mouth = Math.min(1, v.mouth + 0.02); this.mawBig = Math.min(1, (this.mawBig || 0) + 0.02); }   // (settles face-up, the jaw falls open)
      if (once('sink', DECAP.sink[0])) { sfx('rumble', 1, 0.4); sfx('roar', 0.6, 0.35); }
      v.sink = ease((t - DECAP.sink[0]) / (DECAP.sink[1] - DECAP.sink[0])); v.slump = Math.max(v.slump, v.sink);
      if (t > DECAP.sink[0] && t < DECAP.sink[1] && t % 12 === 0) match.shake(5, 12);
      C.shot = t < DECAP.sink[0] - 10 ? { x: Math.min(220, F.x), y: Math.max(-200, F.y), zoom: 1.35 } : t < DECAP.sink[1] ? { x: 0, y: -140, zoom: 0.95 } : { x: F.x - 20, y: F.y - 10, zoom: 1.7 };
      if (once('pour', DECAP.sink[1] + 10)) sfx('summon', 0.9, 0.5);
    }
    if (t >= C.n) this.decapNow(match);
  }
  /** Where the torn neck is on his body. */
  neckAt() { const h = this.joints().heart; return { x: h.x, y: h.y + NECK.dy }; }
  /** Where the fallen head's open mouth is (the way in). */
  mawAt() { const F = this.headFall || { x: 0, y: -BODY_R }; return { x: F.x, y: F.y + 20 }; }

  // ------------------------------------------------------------------ the way in
  /** Someone jumps into his mouth (or the wait runs out): the fall inside, as a cutscene or (the sim) at once. */
  startDiveIn(match, who) {
    this.headless = 'dive'; this.rageText.setVisible(false);
    if (this.watched && this.uiG) {
      const cam = match.worldCam || match.cameras.main;
      this.cut = { kind: 'dive', t: 0, n: DIVE_IN.n, once: new Set(), armed: false, from: match.fighters.map((f) => ({ f, x: f.x, y: f.y })) };
      this.ccam = { x: cam.midPoint.x, y: cam.midPoint.y, zoom: cam.zoom };
      sfx('summon', 1, 0.35); sfx('whoosh', 0.9, 0.5);
      return;
    }
    this.goInside(match);
  }
  /**
   * Falling inside: his mouth gapes and the dark drags everyone in while the picture closes to a ring round it,
   * black - a long fall past streaks of violet, his heartbeat booming closer - then the ring opens again on the cavern
   * inside him, and the heart's name card.
   */
  diveInStep(match) {
    const C = this.cut, t = ++C.t, n = this.mawAt();
    const once = (k, at) => t >= at && !C.once.has(k) && !!C.once.add(k);
    if (t <= DIVE_IN.pull) {
      const k = ease(t / DIVE_IN.pull);
      for (const o of C.from) if (o.f.alive && o.f.state !== 'respawn') { o.f.x = lerp(o.x, n.x, k); o.f.y = lerp(o.y, n.y + 10, k); o.f.vx = o.f.vy = 0; }
      C.shot = { x: n.x, y: n.y - 10, zoom: 1.2 + k * 0.8 };
      if (t % 3 === 0) { const q = Math.random() * Math.PI * 2; match.particles.push({ x: n.x + Math.cos(q) * 160, y: n.y + Math.sin(q) * 90, vx: -Math.cos(q) * 6, vy: -Math.sin(q) * 4, life: 26, color: P.glow[t % 3], size: 2 }); }
    }
    if (once('in', DIVE_IN.pull)) { sfx('bighit', 0.8, 0.4); sfx('whoosh', 1, 0.3); }
    if (t > DIVE_IN.pull && t < DIVE_IN.black + 20 && (t - DIVE_IN.pull) % 22 === 0) { sfx('bighit', 0.5 + (t - DIVE_IN.pull) * 0.006, 0.35); sfx('taiko', 0.6, 0.5); }   // his heartbeat, louder
    if (once('swap', DIVE_IN.black)) this.goInside(match);
    if (t >= DIVE_IN.black) C.shot = { x: this.heartS.x, y: this.heartS.y + 30, zoom: 1.1 };
    this.stepHeartBody(match);
    // the iris: the picture closes to a ring round the neck, stays black, then opens round the heart
    const g = this.uiG; g.clear();
    let r = 0, at = n;
    if (t < DIVE_IN.pull) r = lerp(560, 22, ease(t / DIVE_IN.pull));
    else if (t < DIVE_IN.black) r = 0;
    else { r = lerp(0, 600, ease((t - DIVE_IN.black) / (DIVE_IN.open - DIVE_IN.black))); at = this.heartS; }
    const cam = match.worldCam, s = cam ? { x: (at.x - cam.worldView.x) * cam.zoom, y: (at.y - cam.worldView.y) * cam.zoom } : { x: VIEW_W / 2, y: VIEW_H / 2 };
    if (r < 600) {
      g.lineStyle(1600, 0x000000, 1); g.strokeCircle(s.x, s.y, r + 800); g.lineStyle(0);
      if (r > 1) { g.lineStyle(3, P.glow[1], 0.8); g.strokeCircle(s.x, s.y, r); g.lineStyle(0); }
    }
    if (t >= DIVE_IN.pull && t < DIVE_IN.black + 6) {                                  // the fall: violet streaks rushing up past you
      const R = seeded(t * 7);
      for (let i = 0; i < 26; i++) { const x = R() * VIEW_W, y = (R() * VIEW_H * 2 - (t * 18) % (VIEW_H * 2)), L = 30 + R() * 80; g.fillStyle([P.glow[0], P.glow[1], P.vein[2]][i % 3], 0.6); g.fillRect(x, (y + VIEW_H * 2) % (VIEW_H * 2) - VIEW_H / 2, 2, L); }
    }
    if (t >= C.n) { this.cut = null; g.clear(); this.heartCard(match); }
  }
  /** The swap: inside him now. The observatory's layers hide, the cavern and the heart show, everyone stands on the floor again. */
  goInside(match) {
    this.inside = true; this.headless = 'inside'; this.headGone = true;
    for (const o of this.outLayers()) o.setVisible(false);
    this.innerG.setVisible(true); this.heartG.setVisible(true);
    this.heartS = { x: HEART.x, y: HEART.y - 60, tx: HEART.x, ty: HEART.y, beat: 0, squeeze: 0, open: 0, tgtOpen: 1, look: { x: 0, y: 0 }, blink: HEART.eyes.map((_, i) => 40 + i * 23), lid: HEART.eyes.map(() => 1), popped: [], slam: 0, s: 1, tears: [], n: 0, flat: 0, flood: 0 };
    this.drips = [];
    const sp = this.spawns;
    match.fighters.forEach((f, i) => {
      if (!f.alive || f.state === 'respawn') return;
      const at = sp[i % sp.length]; f.placeAt(at.x, at.y - 1); f.setState('idle'); f.grounded = true; f.platform = this.platforms[0];
    });
    this.barName.setText('VESPERION - THE CORRUPTED HEART');
    const B = this.boss; B.atk = null; B.wait = 70;
    if (match.particles) match.particles.length = 0;
  }
  /** The heart's own name card: bossBase's freeze-frame card again, with its name. Without a player watching, nothing. */
  heartCard(match) {
    if (!this.watched || !this.startCard) return;
    this.startCard(match, { name: 'THE CORRUPTED HEART', title: 'WHAT THE STARS WERE FED TO', tag: '-  BOSS VIII : HIS CORE  -' });
    sfx('bighit', 0.8, 0.4);
  }
  /** The observatory's layers (hidden while you're inside him). */
  outLayers() { return [this.skyPaint, this.skyG, this.backG, this.bodyG, this.headG, this.floorG, this.handG].filter(Boolean); }

  // ------------------------------------------------------------------ every frame while he's headless
  /**
   * The mouth: he lies still and can't be hurt; his fallen head's maw swirls, JUMP INTO HIS MOUTH! blinks, and whoever
   * jumps into it (in the air, over the maw) falls in - after MAW.wait frames (MAW.sim in the sim) the void takes
   * everyone anyway. Inside: the heart floats, beats and watches you; at HEART.end its eye shatters.
   */
  stepHeadless(match) {
    const B = this.boss, v = this.v;
    v.slump = 1; v.shell = 0; v.mouth *= 0.95;
    if (this.headless === 'maw') {
      B.atk = null; B.wait = 9999; this.neckT = (this.neckT || 0) + 1;
      const n = this.mawAt();
      this.rageText.setText('JUMP INTO HIS MOUTH!').setColor('#e0c8ff').setFontSize(12).setVisible(this.neckT % 40 < 28);
      if (this.neckT % 50 === 0) sfx('summon', 0.3, 0.5 + (this.neckT % 100 ? 0.1 : 0));
      if (this.neckT % 3 === 0) { const q = Math.random() * Math.PI * 2; match.particles.push({ x: n.x + Math.cos(q) * 70, y: n.y + Math.sin(q) * 40, vx: -Math.cos(q) * 2, vy: -Math.sin(q) * 1.2, life: 32, color: P.glow[this.neckT % 3], size: 2 }); }
      match.bossProxy.x = n.x; match.bossProxy.y = n.y + 10;
      const who = match.fighters.find((f) => f.alive && f.state !== 'respawn' && !f.grounded && Math.abs(f.x - n.x) < MAW.w && f.y > n.y - MAW.up && f.y < n.y + MAW.down);
      if (who || this.neckT > (this.watched ? MAW.wait : MAW.sim)) {
        if (!who) match.popText({ x: n.x, y: n.y - 30 }, 'THE VOID PULLS YOU IN', '#c8a8ff');
        this.startDiveIn(match, who);
      }
      return;
    }
    if (this.headless === 'inside') {
      const S = this.heartS;
      if (S.wasAtk && !B.atk) B.wait = Math.round(B.wait * HEART.rest);                 // (a longer breather after each attack than his own)
      if (!S.wasAtk && B.atk) S.n++;
      S.wasAtk = !!B.atk;
      if (S.flat > 0 && --S.flat === 0) { S.stunned = false; S.bump = 1; sfx('bighit', 0.9, 0.5); sfx('taiko', 0.8, 0.6); match.popText({ x: S.x, y: S.y - 80 }, 'IT\'S BEATING AGAIN!', '#ff7a8a'); }
      this.stepHeartBody(match);
      if (B.hp <= B.max * HEART.end) this.startBurst(match);
    }
  }
  /** The heart floats toward where it wants to be, beats (faster as it weakens), blinks its eyes and watches the nearest player. */
  stepHeartBody(match) {
    const S = this.heartS; if (!S) return;
    const B = this.boss, k = B ? 1 - B.hp / (B.max * 0.5) : 0, stopped = S.flat > 0 || S.dead, rate = stopped ? 0 : 0.05 + Math.max(0, k) * 0.05 + (this.hMad ? 0.03 : 0);
    this.hMad = !!B && B.hp < B.max * HEART.frenzy;
    // the great eye's mood, and its lids / brow / pupil easing toward it
    const atk = B && B.atk && B.atk.name, M = MOODS[S.dead ? 'fear' : S.flinch > 0 ? 'pain' : S.stunned ? 'dizzy' : S.gloat ? 'laugh' : atk === 'hgaze' || (atk === 'hflat' && !S.flat) ? 'charge' : atk ? (this.hMad ? 'mad' : 'angry') : this.hMad ? 'fear' : 'watch'];
    S.ep = S.ep || { ...MOODS.watch };
    for (const key of ['top', 'bot', 'brow', 'pupil', 'glow', 'shake']) S.ep[key] = lerp(S.ep[key], M[key], 0.18);
    for (const key of ['tear', 'smile', 'spiral']) S.ep[key] = lerp(S.ep[key] || 0, M[key] || 0, 0.12);
    if (S.ep.tear > 0.5 && this.t % 14 === 0) S.tears.push({ x: (Math.random() - 0.5) * 30, y: 10, v: 0.5 });
    for (const d of S.tears) { d.y += d.v; d.v += 0.08; } S.tears = S.tears.filter((d) => d.y < 140);
    if (!S.hold) { S.tx = HEART.x + Math.sin(this.t * 0.011) * HEART.drift; S.ty = HEART.y + Math.sin(this.t * 0.023) * HEART.bob; }
    S.x += (S.tx - S.x) * (S.fast || HEART.ease); S.y += (S.ty - S.y) * (S.fast || HEART.ease);
    S.beat += rate; S.open += ((S.tgtOpen ?? 1) - S.open) * 0.15;
    if (S.dart > 0) S.dart--; else if (this.hMad || S.ep.shake > 1.5) { S.dart = 10 + Math.floor(Math.random() * 20); S.dartTo = { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 }; }
    const tg = match && this.nearest(match, S.x);
    if (S.dartTo && (this.hMad || S.ep.shake > 1.5) && S.dart % 30 > 18) { S.look.x = lerp(S.look.x, S.dartTo.x, 0.4); S.look.y = lerp(S.look.y, S.dartTo.y, 0.4); }   // (panicking: darting about)
    else if (tg) { const dx = tg.x - S.x, dy = tg.y - 30 - S.y, d = Math.hypot(dx, dy) || 1; S.look.x = lerp(S.look.x, dx / d, 0.1); S.look.y = lerp(S.look.y, dy / d, 0.1); }
    S.blink = S.blink.map((b, i) => { b--; if (b <= 0) b = 90 + ((i * 37 + this.t) % 120); return b; });
    S.lid = S.lid.map((l, i) => (S.popped.includes(i) ? 0 : S.blink[i] < 8 ? 0.1 : Math.min(1, l + 0.2)));
  }
  /** How hard the heart beats right now (0..1): a double thump, like a real one. */
  beatK() { const S = this.heartS, q = (S.beat % (Math.PI * 2)) / (Math.PI * 2); return Math.max(0, 1 - Math.abs(q - 0.08) * 14) + 0.6 * Math.max(0, 1 - Math.abs(q - 0.24) * 14); }

  /** Where the heart can be hurt: the great eye (x1.6 while open, more while it lies stunned) and its body. */
  heartHurt() {
    const S = this.heartS; if (!S || this.headless !== 'inside') return [];
    const st = S.flat > 0 ? FLAT.open : S.stunned ? SLAM.stun : 1, out = [];
    if (S.open > 0.4) out.push({ x1: S.x - 24, y1: S.y - 16, x2: S.x + 24, y2: S.y + 16, mult: HEART.eye * st, eye: true });
    out.push({ x1: S.x - HEART.r - 12, y1: S.y - HEART.r - 8, x2: S.x + HEART.r + 12, y2: S.y + HEART.r + 18, mult: HEART.body * st });
    return out;
  }
  /** What it does next: FLATLINE every fourth attack, else its others (VOID STORM added when it panics). */
  heartPattern() {
    const S = this.heartS;
    if (S && S.n % 4 === 2) return ['hflat'];                                         // (its own attack, every fourth: FLATLINE)
    const list = ['hbolts', 'hlash', 'hpulse', 'hgaze', 'hgrasp', 'hslam', 'hslam'];
    if (this.hMad) list.push('hstorm', 'hbolts', 'hslam');
    return list;
  }
  /** The heart was hit: it flinches, its eyes squeeze shut for a moment, and sometimes a little eye bursts. */
  heartHurtFx(match, r) {
    const S = this.heartS; if (!S) return;
    S.flinch = 8;
    if (r && r.eye) { S.tgtOpen = 0.2; S.eyeShut = 16; }
  }

  // ------------------------------------------------------------------ its attacks
  /** VOID BOLTS: its little eyes glow, then fire dark orbs at you one after another (homing a little in THE LAST LIGHT). */
  atk_hbolts(match, a) {
    const S = this.heartS, n = BOLT.n[this.hMad ? 1 : 0], warm = this.sp(BOLT.warm);
    S.hold = false; S.charge = Math.min(1, a.t / warm);
    if (a.t === 1) { sfx('summon', 0.7, 1.4); a.order = HEART.eyes.map((_, i) => i).filter((i) => !S.popped.includes(i)); }
    if (a.t >= warm && (a.t - warm) % BOLT.every === 0) {
      const i = (a.t - warm) / BOLT.every; if (i >= n) { S.charge = 0; return a.t > warm + n * BOLT.every + 20; }
      const e = HEART.eyes[a.order[i % Math.max(1, a.order.length)]] || [0, 0], x = S.x + e[0], y = S.y + e[1], tg = this.nearest(match, x);
      const tx = tg ? tg.x : 0, ty = tg ? tg.y - 24 : 0, d = Math.hypot(tx - x, ty - y) || 1, sp = BOLT.speed * (this.hMad ? 1.15 : 1);
      this.bolts.push({ x, y, vx: (tx - x) / d * sp, vy: (ty - y) / d * sp, t: 0, id: this.sid('bolt'), home: this.hMad, trail: [] });
      sfx('laser', 0.45, 0.6 + Math.random() * 0.2);
    }
    return a.t > warm + n * BOLT.every + 20;
  }
  /** VEIN LASH: a vein glows across the cavern at floor or ledge height (where you are), then whips through from one side. */
  atk_hlash(match, a) {
    if (a.t === 1) {
      const tg = this.nearest(match, 0), y = tg && tg.y < -60 ? LASH.ys[1] : LASH.ys[0];
      this.lashes.push({ s: Math.random() < 0.5 ? -1 : 1, y, t: 0, x: 0, id: this.sid('lash') });
      sfx('curse', 0.6, 0.7); this.heartS.squeeze = 0.6;
      if (this.hMad) this.lashes.push({ s: -this.lashes[this.lashes.length - 1].s, y: y === LASH.ys[0] ? LASH.ys[1] : LASH.ys[0], t: -40, x: 0, id: this.sid('lash') });
    }
    return a.t > this.sp(LASH.warn) + 80 && !this.lashes.length;
  }
  /** HEARTBEAT: it squeezes tight, then BEATS - a ring of dark force bursts out of it with a gap or two to slip through. */
  atk_hpulse(match, a) {
    const S = this.heartS, sq = this.sp(PULSE.squeeze), beats = PULSE.beats[this.hMad ? 1 : 0];
    S.squeeze = a.t < sq ? a.t / sq : Math.max(0, S.squeeze - 0.15);
    if (a.t < sq && a.t % 12 === 0) sfx('rumble', 0.4, 1.4);
    for (let i = 0; i < beats; i++) if (a.t === sq + i * PULSE.apart) {
      const gaps = [0, 1].map(() => Math.atan2(S.y > -40 ? -1 : 150, (Math.random() * 2 - 1) * 240));
      this.vrings.push({ x: S.x, y: S.y, r: HEART.r, gaps, id: this.sid('pulse') });
      sfx('bighit', 1, 0.35); sfx('taiko', 0.9, 0.5); match.shake(10, 14); S.squeeze = 0; S.bump = 1;
    }
    return a.t > sq + PULSE.apart * beats + 30;
  }
  /** THE GAZE: the great eye opens wide and a thin red line tracks you; it locks, then a beam of red light burns along it. */
  atk_hgaze(match, a, out) {
    const S = this.heartS, aim = this.sp(GAZE.aim), lock = aim + GAZE.lock, fire = lock + GAZE.fire;
    S.tgtOpen = 1.3; S.hold = true; S.tx = S.x; S.ty = S.y;
    const tg = this.nearest(match, S.x);
    if (a.t === 1) { sfx('warn', 0.7, 0.7); a.px = tg ? tg.x : 0; a.py = tg ? tg.y - 20 : 0; }
    if (a.t < aim && tg) { a.px = lerp(a.px, tg.x, 0.09); a.py = lerp(a.py, tg.y - 20, 0.09); }
    const dx = a.px - S.x, dy = a.py - S.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    this.gaze = { x: S.x, y: S.y, ux, uy, st: a.t < aim ? 'aim' : a.t < lock ? 'lock' : a.t < fire ? 'fire' : 'off', t: a.t };
    if (a.t === lock) sfx('ding', 0.6, 0.5);
    if (a.t === lock + 1) { sfx('laser', 1, 0.35); sfx('flame', 0.8, 0.6); match.shake(8, GAZE.fire); }
    if (a.t > lock && a.t < fire) {
      const id = 'gz' + a.id + '-' + Math.floor(a.t / GAZE.tick);
      for (let s = 30; s < 700; s += 22) { const x = S.x + ux * s, y = S.y + uy * s; if (y > 8) break; out.push(this.bhit(id, x - GAZE.w, y - GAZE.w, x + GAZE.w, y + GAZE.w, ...GAZE.hit, { dirX: Math.sign(ux) || 1 })); }
    }
    if (a.t >= fire) { this.gaze = null; S.hold = false; S.tgtOpen = 1; return true; }
    return false;
  }
  /** SHADOW GRASP: dark marks spread on the floor under you (and more in THE LAST LIGHT), then claws of shadow burst up out of them. */
  atk_hgrasp(match, a) {
    if (a.t === 1) {
      const xs = match.fighters.filter((f) => f.alive && f.state !== 'respawn').map((f) => f.x);
      for (let i = 0; i < (this.hMad ? 3 : 1); i++) xs.push((Math.random() * 2 - 1) * 230);
      for (const x of xs) this.grasps.push({ x: Phaser.Math.Clamp(x, -250, 250), t: 0, id: this.sid('grasp'), y: 0 });
      sfx('curse', 0.8, 0.5);
    }
    return a.t > this.sp(GRASP.warn) + GRASP.up + 20;
  }
  /** HEART SLAM: it rises over you, drops onto the floor with a crash (waves roll out both ways), then lies there stunned - hit it! */
  atk_hslam(match, a, out) {
    const S = this.heartS, rise = this.sp(SLAM.rise);
    if (a.t === 1) { S.hold = true; sfx('whoosh', 0.7, 0.6); }
    const tg = this.nearest(match, S.x);
    if (a.t < rise) { S.tx = Phaser.Math.Clamp(tg ? tg.x : 0, -220, 220); S.ty = -250; S.fast = 0.12; return false; }
    if (!a.down) {
      S.fast = 0; S.tx = S.x; S.y = Math.min(-HEART.r - 2, S.y + 220 / SLAM.fall); S.ty = S.y;
      out.push(this.bhit('hs' + a.id, S.x - HEART.r, S.y - HEART.r, S.x + HEART.r, S.y + HEART.r + 6, ...SLAM.hit, { radial: true }));
      if (S.y >= -HEART.r - 2) {
        a.down = a.t; S.stunned = true; S.tgtOpen = 0.5; sfx('bighit', 1, 0.4); sfx('rumble', 0.8, 0.6); match.shake(14, 18);
        for (const d of [-1, 1]) this.hwaves.push({ x: S.x + d * 40, dir: d, t: 0, id: this.sid('hwave') });
        for (let i = 0; i < 20; i++) match.particles.push({ x: S.x + (Math.random() - 0.5) * 80, y: -2, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 4, life: 26, color: [P.vein[2], P.glow[1], P.bone[3]][i % 3], size: 3, grav: 0.2 });
        match.popText({ x: S.x, y: S.y - 70 }, 'IT\'S STUNNED!', '#ffe070');
      }
      return false;
    }
    const f = a.t - a.down;
    if (f < SLAM.rest) { S.ty = -HEART.r - 2 + Math.sin(f * 0.3) * 2; return false; }
    S.stunned = false; S.tgtOpen = 1; S.fast = 0; S.hold = false;
    return f > SLAM.rest + SLAM.back;
  }
  /** VOID STORM (THE LAST LIGHT): it spins, and every eye fires bolts outward in a turning spiral. */
  atk_hstorm(match, a) {
    const S = this.heartS, every = this.sp(STORM.every);
    if (a.t === 1) { sfx('summon', 1, 0.5); match.popText({ x: S.x, y: S.y - 80 }, 'VOID STORM', '#c8a8ff'); }
    if (a.t % every === 0 && a.t / every <= STORM.turns * 3) {
      const base = a.t * 0.11;
      for (let i = 0; i < STORM.arms; i++) { const q = base + i / STORM.arms * Math.PI * 2; this.bolts.push({ x: S.x + Math.cos(q) * 30, y: S.y + Math.sin(q) * 30, vx: Math.cos(q) * BOLT.speed * 0.8, vy: Math.sin(q) * BOLT.speed * 0.8, t: 0, id: this.sid('bolt'), trail: [] }); }
      sfx('laser', 0.35, 0.8);
    }
    return a.t > every * STORM.turns * 3 + 30;
  }

  /**
   * FLATLINE - its own attack: it rises high and a heart monitor's green grid fades over the place; a trace runs along
   * the floor from the left, faster and faster, and at every beat it draws a tall spike that burns for a moment (jump
   * it). At the far side it FLATLINES - a long tone, the whole line glows - CLEAR!: the floor is shocked end to end (be
   * in the air or on a ledge). Then the heart has stopped: it sinks low and lies open (hurt x FLAT.open) until it jolts
   * back to life.
   */
  atk_hflat(match, a, out) {
    const S = this.heartS;
    if (a.t === 1) { S.hold = true; S.tx = 0; S.ty = -236; S.fast = 0.06; this.flatS = { x: -300, beats: [], phase: 'trace', ft: 0 }; sfx('warn', 0.8, 0.6); match.popText({ x: 0, y: -300 }, 'FLATLINE', '#5aff8a'); }
    const L = this.flatS; if (!L) return true;
    L.t = a.t;
    if (a.t < this.sp(FLAT.start)) return false;
    for (const b of L.beats) { b.t++; if (b.t < FLAT.burn) out.push(this.bhit('fl' + a.id + '-' + b.i, b.x - FLAT.w, FLAT.base - FLAT.spike, b.x + FLAT.w, 0, ...FLAT.hit)); }
    if (L.phase === 'trace') {
      L.x += lerp(FLAT.speed[0], FLAT.speed[1], (L.x + 300) / 600);
      const bx = -300 + (L.beats.length + 0.5) * 600 / FLAT.beats;
      if (L.beats.length < FLAT.beats && L.x >= bx) { L.beats.push({ x: bx, t: 0, i: L.beats.length }); sfx('ding', 0.8, 1.7); sfx('taiko', 0.7, 0.7); S.bump = 1; }
      if (L.x >= 300) { L.phase = 'flat'; sfx('buzz', 0.9, 0.45); match.popText({ x: 0, y: -60 }, 'CLEAR!', '#5aff8a'); }
      return false;
    }
    L.ft++;
    if (L.ft === FLAT.clear) { sfx('thunder', 1, 1.1); sfx('laser', 1, 0.5); match.shake(14, FLAT.zap); this.whiteT = 6; }
    if (L.ft >= FLAT.clear && L.ft < FLAT.clear + FLAT.zap) {
      out.push(this.bhit('flz' + a.id, -275, -30, 275, 4, ...FLAT.shock));
      if (L.ft % 2 === 0) for (let i = 0; i < 6; i++) match.particles.push({ x: (Math.random() * 2 - 1) * 260, y: -4, vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 3, life: 16, color: [0x5aff8a, 0xffffff, 0xb8ffd0][i % 3], size: 2, grav: 0.15 });
    }
    if (L.ft >= FLAT.clear + FLAT.zap) {
      S.flat = FLAT.stop; S.stunned = true; S.hold = true; S.tx = S.x; S.ty = -104; S.fast = 0.06; this.flatS = null;
      match.popText({ x: S.x, y: -200 }, 'ITS HEART STOPPED - HIT IT!', '#ffe070'); sfx('buzz', 0.5, 0.35);
      return true;
    }
    return false;
  }
  /** The height of FLATLINE's trace at x: the baseline, plus each beat's P-QRS-T shape (a little bump, a dip, the tall spike, a dip, a hump). */
  ecgY(x, L) {
    let y = FLAT.base;
    for (const b of L.beats) {
      const d = x - b.x;
      if (d > -22 && d < -10) y -= Math.sin((d + 22) / 12 * Math.PI) * 7;
      else if (d >= -4 && d < -1) y += 6;
      else if (d >= -1 && d < 3) y -= FLAT.spike * (1 - Math.abs(d - 1) / 2);
      else if (d >= 3 && d < 8) y += 12;
      else if (d >= 14 && d < 28) y -= Math.sin((d - 14) / 14 * Math.PI) * 11;
    }
    return y;
  }

  /** Moves the heart's bolts, lashes, rings, claws and waves; pushes their hitboxes. */
  stepHeartFx(match, out) {
    const tg = (x) => this.nearest(match, x);
    for (const b of this.bolts) {
      b.t++;
      if (b.home && b.t < 70) { const f = tg(b.x); if (f) { const dx = f.x - b.x, dy = f.y - 24 - b.y, d = Math.hypot(dx, dy) || 1, sp = Math.hypot(b.vx, b.vy); b.vx = lerp(b.vx, dx / d * sp, BOLT.home); b.vy = lerp(b.vy, dy / d * sp, BOLT.home); } }
      b.x += b.vx; b.y += b.vy; b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 8) b.trail.shift();
      out.push(this.bhit(b.id, b.x - BOLT.r, b.y - BOLT.r, b.x + BOLT.r, b.y + BOLT.r, ...BOLT.hit, { dirX: Math.sign(b.vx) || 1 }));
      if (b.y > 0 && b.y < 60 && Math.abs(b.x) < 265) { b.dead = true; match.puff(b.x, -2, P.glow[1], 6); }
      if (b.t > BOLT.life || Math.abs(b.x) > 420 || b.y < -460) b.dead = true;
    }
    this.bolts = this.bolts.filter((b) => !b.dead);
    const warn = this.sp(LASH.warn);
    for (const L of this.lashes) {
      L.t++; if (L.t < 0) continue;
      if (L.t === warn) { sfx('slash', 0.9, 0.5); sfx('whoosh', 0.8, 0.6); }
      if (L.t < warn) continue;
      L.x = -L.s * 300 + L.s * (L.t - warn) * LASH.speed;
      const x1 = Math.min(-L.s * 300, L.x), x2 = Math.max(-L.s * 300, L.x);
      out.push(this.bhit(L.id, Math.max(x1, L.x - 80), L.y - LASH.h, Math.min(x2, L.x + 80), L.y + LASH.h, ...LASH.hit, { dirX: L.s }));
      if (Math.abs(L.x) > 320) L.dead = true;
    }
    this.lashes = this.lashes.filter((L) => !L.dead);
    for (const R of this.vrings) {
      R.r += PULSE.speed;
      const n = Math.ceil(R.r * Math.PI * 2 / 18);
      for (let i = 0; i < n; i++) {
        const q = i / n * Math.PI * 2, x = R.x + Math.cos(q) * R.r, y = R.y + Math.sin(q) * R.r;
        if (y > 6 || y < -380 || Math.abs(x) > 300 || R.gaps.some((g) => Math.abs(Phaser.Math.Angle.Wrap(q - g)) < PULSE.gap)) continue;
        out.push(this.bhit(R.id, x - 10, y - 10, x + 10, y + 10, ...PULSE.hit, { radial: true }));
      }
    }
    this.vrings = this.vrings.filter((R) => R.r < 560);
    const gw = this.sp(GRASP.warn);
    for (const G of this.grasps) {
      G.t++;
      if (G.t === gw) { sfx('slash', 0.7, 0.4); match.shake(4, 6); }
      if (G.t >= gw && G.t < gw + GRASP.up) out.push(this.bhit(G.id, G.x - GRASP.w / 2, G.y - GRASP.h, G.x + GRASP.w / 2, G.y, ...GRASP.hit));
      if (G.t > gw + GRASP.up + 14) G.dead = true;
    }
    this.grasps = this.grasps.filter((G) => !G.dead);
    for (const w of this.hwaves) { w.t++; w.x += w.dir * SLAM.wave.speed; out.push(this.bhit(w.id, w.x - 12, -20, w.x + 12, 0, ...SLAM.wave.hit, { dirX: w.dir })); if (w.t % 3 === 0) match.particles.push({ x: w.x, y: -3, vx: 0, vy: -1.5, life: 12, color: P.glow[2], size: 2 }); }
    this.hwaves = this.hwaves.filter((w) => w.t < SLAM.wave.life && Math.abs(w.x) < 270);
    const S = this.heartS;
    if (S) { if (S.flinch > 0) S.flinch--; if (S.eyeShut > 0 && --S.eyeShut === 0 && !this.gaze) S.tgtOpen = 1; if (S.bump) S.bump *= 0.85; }
  }
  /** Players' hits on the heart's bolts: a hit pops one. */
  heartStrike(match, hbs) {
    for (const b of this.bolts) {
      const r = BOLT.r + 4, hb = hbs.find((q) => q.owner && q.x1 < b.x + r && q.x2 > b.x - r && q.y1 < b.y + r && q.y2 > b.y - r);
      if (hb) { b.dead = true; match.puff(b.x, b.y, P.glow[2], 8); sfx('glass', 0.4, 1.8); }
    }
  }
  /** The fight's over: all of its attacks vanish. */
  heartClear() { this.bolts = []; this.lashes = []; this.vrings = []; this.grasps = []; this.hwaves = []; this.gaze = null; if (this.heartS) { this.heartS.stunned = false; this.heartS.hold = true; } }

  /** You lost (inside): every eye opens wide and it beats hard and fast, laughing in thumps. */
  heartGloat(match, t) {
    const S = this.heartS; if (!S) return;
    S.gloat = true; S.hold = true; S.tx = 0; S.ty = HEART.y - 10; S.tgtOpen = 1.3; S.beat += 0.12; this.stepHeartBody(match);
    if (t % 30 === 0) { sfx('laugh', 0.5, 0.45); S.bump = 1; }
  }
  /**
   * At HEART.end health THE EYE SHATTERS: with a player watching a cutscene ('burst', burstStep); in the sim you're
   * simply put back outside and he's crowned at once (starKing.js crownNow).
   */
  startBurst(match) {
    const B = this.boss, S = this.heartS;
    B.hp = Math.max(B.hp, Math.round(B.max * HEART.end)); B.atk = null; B.wait = 9999; this.heartClear(); S.hold = true; S.tx = 0; S.ty = -150; S.fast = 0.05;
    this.headless = 'burst'; this.flatS = null;
    if (this.watched && this.uiG) {
      const cam = match.worldCam || match.cameras.main;
      this.cut = { kind: 'burst', t: 0, n: BURST.n, once: new Set(), armed: false, from: match.fighters.map((f) => ({ f, x: f.x, y: f.y })) };
      this.ccam = { x: cam.midPoint.x, y: cam.midPoint.y, zoom: cam.zoom }; this.rageText.setVisible(false); B.rage = 0;
      return;
    }
    this.popOut(match, true); this.crownNow(match);
  }
  /**
   * THE EYE SHATTERS: the heart thrashes, panicking, the great eye cracks and cracks - and bursts into shards; black
   * sludge pours out of the empty socket and every crack, the heart bleeding out, and the flood rises through the
   * mouth, floating everyone up on its surface - black - then his fallen head spits you out across the observatory in
   * a geyser of sludge, and his crowning begins (starKing.js).
   */
  burstStep(match) {
    const C = this.cut, t = ++C.t, S = this.heartS;
    const once = (k, at) => t >= at && !C.once.has(k) && !!C.once.add(k);
    if (t < BURST.out) {
      S.dead = true; S.shake = 2 + t * 0.03; S.beat += 0.2; this.stepHeartBody(match);
      S.eyeCrack = Math.min(1, t / BURST.crack);
      C.shot = t < BURST.gush ? { x: S.x, y: S.y, zoom: 1.6 + t * 0.006 } : { x: 0, y: Math.max(-200, -40 - S.flood * 0.6), zoom: 1 };
      if (t % 9 === 0 && t < BURST.crack) { sfx('glass', 0.4 + t * 0.01, 1.8 - t * 0.01); match.shake(3, 6); }
      if (once('shatter', BURST.crack)) {
        S.eyeGone = true; S.eyeCrack = 0; this.whiteT = 10; sfx('glass', 1, 0.6); sfx('roar', 1, 0.4); sfx('bighit', 1, 0.5); match.shake(16, 24);
        for (let i = 0; i < 40; i++) { const q = Math.random() * Math.PI * 2, v = 2 + Math.random() * 7; match.particles.push({ x: S.x + Math.cos(q) * 12, y: S.y + Math.sin(q) * 8, vx: Math.cos(q) * v, vy: Math.sin(q) * v - 2, life: 34 + Math.random() * 20, color: [0xffffff, 0xd8b8b0, P.eye[2], P.eye[3]][i % 4], size: 3, grav: 0.2 }); }
        match.popText({ x: S.x, y: S.y - 90 }, 'MY... EYE...!', '#ff7a8a');
      }
      if (t >= BURST.gush && t % 4 === 0) sfx('rumble', 0.4, 0.4 + Math.random() * 0.2);
      if (t >= BURST.gush && t % 2 === 0) for (let i = 0; i < 3; i++) match.particles.push({ x: S.x + (Math.random() - 0.5) * 70, y: S.y + (Math.random() - 0.3) * 50, vx: (Math.random() - 0.5) * 4, vy: Math.random() * 2, life: 40, color: [0x000000, 0x1a1028, 0x2a1a3a][i], size: 4, grav: 0.25 });
      S.flood = Math.max(0, (t - BURST.rise[0]) / (BURST.rise[1] - BURST.rise[0])) * 420;   // how high the sludge has risen (px above the floor)
      for (const o of C.from) if (o.f.alive && o.f.state !== 'respawn') {                 // floating up on it
        const top = -S.flood - 8; o.f.vx = o.f.vy = 0;
        if (o.f.y > top) { o.f.y = lerp(o.f.y, top + Math.sin(t * 0.1 + o.x) * 4, 0.3); o.f.x += Math.sin(t * 0.05 + o.x) * 0.6; }
      }
    }
    if (once('out', BURST.out)) { this.popOut(match, false); sfx('bighit', 1, 0.35); sfx('whoosh', 1, 0.4); match.shake(12, 20); this.geyser = 50; }
    if (t > BURST.out) {
      const m = this.mawAt(), k = Math.min(1, (t - BURST.out) / (BURST.land - BURST.out));
      C.shot = { x: m.x * 0.5, y: -110, zoom: 1 };
      for (const o of C.landing || []) { o.f.x = lerp(m.x, o.x, k); o.f.y = lerp(m.y, o.y, k) - Math.sin(k * Math.PI) * 170; o.f.vx = o.f.vy = 0; }
      if (once('land', BURST.land)) { sfx('land', 0.8, 0.8); for (const o of C.landing || []) { o.f.placeAt(o.x, o.y - 1); o.f.setState('idle'); o.f.grounded = true; o.f.platform = this.platforms[0]; } }
    }
    // the screen: black as the flood closes over, opening again outside
    const g = this.uiG; g.clear();
    const dark = t < BURST.out ? Math.max(0, (t - (BURST.rise[1] - 20)) / 20) : Math.max(0, 1 - (t - BURST.out) / 14);
    if (dark > 0) { g.fillStyle(0x000000, Math.min(1, dark)); g.fillRect(0, 0, VIEW_W, VIEW_H); }
    if (t >= C.n) { this.cut = null; g.clear(); this.startCrowning(match); }
  }
  /**
   * Back outside: the cavern hides, the observatory shows again with his head still lying on the floor, and everyone
   * is put by his mouth (now = at once at the spawn points; else they fly out of the maw to them in burstStep).
   */
  popOut(match, now) {
    this.inside = false; this.innerG.setVisible(false); this.heartG.setVisible(false);
    for (const o of this.outLayers()) o.setVisible(true);
    this.headGone = false; this.headless = 'out'; this.v.mouth = 1; this.mawBig = 1; this.barName.setText(this.boss.cfg.boss.name);
    const sp = this.spawns, m = this.mawAt(), land = [];
    match.fighters.forEach((f, i) => {
      if (!f.alive || f.state === 'respawn') return;
      const at = sp[i % sp.length];
      if (now) { f.placeAt(at.x, at.y - 1); f.setState('idle'); f.grounded = true; f.platform = this.platforms[0]; }
      else { f.x = m.x; f.y = m.y; land.push({ f, x: at.x, y: at.y }); }
    });
    if (this.cut) this.cut.landing = land;
    if (match.particles) match.particles.length = 0;
  }

  // ------------------------------------------------------------------ drawing
  /**
   * Inside his mouth (painted once): walls of raw flesh in blood-dark reds, glistening, deepening into the black of
   * his throat; a ridged palate overhead with a row of huge yellowed, cracked, stained teeth hanging from the gums;
   * strands of sinew and sludge hanging down; the skulls of the ones who came before, half sunk in the flesh; a black
   * tongue for a floor (on the observatory floor's footprint) with a groove down it, papillae and pools of black
   * blood, the lower teeth jutting up along its front; and two great molars where the ledges are.
   */
  paintInner(g) {
    const R = seeded(41), F = [0x1a0306, 0x2a060c, 0x3e0a14, 0x561020, 0x6e1828], x1 = this.platforms[0].x1, x2 = this.platforms[0].x2;
    g.fillStyle(0x0a0103, 1); g.fillRect(-1400, -1100, 2800, 2200);
    for (let i = 0; i < 70; i++) {                                                      // the flesh, in lumps, glistening
      const x = -780 + R() * 1560, y = -600 + R() * 720, r = 40 + R() * 110, c = F[Math.floor(R() * F.length)];
      g.fillStyle(c, 0.6); g.fillEllipse(x, y, r * 2, r * 1.5);
      if (R() < 0.5) { g.fillStyle(0xd07080, 0.18); g.fillEllipse(x - r * 0.3, y - r * 0.35, r * 0.7, r * 0.22); }
    }
    for (let i = 0; i < 8; i++) { g.fillStyle(0x030001, 0.22); g.fillEllipse(0, -170, 900 - i * 100, 560 - i * 60); }   // the throat, black at the back
    for (let k = 0; k < 6; k++) {                                                        // the ridged palate
      const pts = []; for (let i = 0; i <= 30; i++) { const u = i / 30 * 2 - 1; pts.push({ x: u * (700 - k * 40), y: -470 + k * 18 + u * u * 70 }); }
      g.lineStyle(10, 0x2a050c, 1); g.strokePoints(pts); g.lineStyle(4, 0x8a2a3a, 0.8); g.strokePoints(pts.map((p) => ({ x: p.x, y: p.y - 3 }))); g.lineStyle(0);
    }
    // the skulls of the ones before you, sunk in the walls
    for (const [x, y, sz] of [[-520, -220, 1.3], [-430, -60, 1], [470, -200, 1.2], [560, -40, 1.1], [-300, -330, 0.8], [330, -350, 0.9], [-610, -380, 1], [620, -320, 0.9]]) this.skull(g, x, y, sz, 0.75);
    // the upper teeth, hanging from the gums: huge, yellowed, cracked, stained
    for (let i = 0; i < 17; i++) {
      const x = -640 + i * 80 + (R() - 0.5) * 20, gum = -440 + (x / 640) * (x / 640) * 120, L = 70 + R() * 50, w = 30 + R() * 12;
      this.tooth(g, x, gum, w, L, 1, R);
    }
    g.fillStyle(0x6e1828, 1); for (let i = 0; i < 17; i++) { const x = -640 + i * 80; g.fillEllipse(x, -446 + (x / 640) * (x / 640) * 120, 92, 30); }   // the gums
    // sinew and sludge strands hanging from the roof
    for (let i = 0; i < 16; i++) {
      const x = -560 + R() * 1120, y0 = -420 + (x / 640) * (x / 640) * 110, L = 60 + R() * 170, sag = (R() - 0.5) * 30;
      const pts = []; for (let k = 0; k <= 8; k++) { const q = k / 8; pts.push({ x: x + Math.sin(q * Math.PI) * sag, y: y0 + q * L }); }
      g.lineStyle(R() < 0.5 ? 2 : 4, R() < 0.5 ? 0x000000 : 0x5a1220, 0.9); g.strokePoints(pts); g.lineStyle(0);
      g.fillStyle(0x000000, 1); g.fillCircle(pts[8].x, pts[8].y + 3, 3 + R() * 3); g.fillStyle(0x6a5a7a, 0.7); g.fillRect(pts[8].x - 1, pts[8].y + 1, 1, 1);
    }
    // the lower teeth jutting up along the tongue's front, and the dark gum under them
    g.fillStyle(0x3e0a14, 1); g.fillEllipse(0, 90, x2 - x1 + 140, 120);
    for (let i = 0; i < 12; i++) { const x = x1 + 10 + i * (x2 - x1 - 20) / 11; this.tooth(g, x, 84, 34, 46 + (i % 3) * 8, -1, R); }
    // the tongue: black, glossy, a groove down it, papillae, pools of black blood
    g.fillStyle(P.out, 1); g.fillRoundedRect(x1 - 8, -4, x2 - x1 + 16, 56, 20);
    g.fillStyle(0x1a0a1e, 1); g.fillRoundedRect(x1 - 4, -1, x2 - x1 + 8, 50, 18);
    g.fillStyle(0x2a1430, 1); g.fillRoundedRect(x1, 0, x2 - x1, 16, 8);
    g.fillStyle(0x0a040c, 1); g.fillRect(-4, 2, 8, 42);
    for (let i = 0; i < 90; i++) { g.fillStyle(R() < 0.5 ? 0x3a1e40 : 0x120614, 1); g.fillCircle(x1 + 6 + R() * (x2 - x1 - 12), 4 + R() * 38, 1 + R() * 1.4); }
    g.fillStyle(0x6a4a7a, 0.6); g.fillRect(x1 + 20, 1, x2 - x1 - 40, 1.5);
    for (const [x, w] of [[-170, 70], [60, 54], [200, 40]]) { g.fillStyle(0x000000, 1); g.fillEllipse(x, 3, w, 7); g.fillStyle(0x5a4a6a, 0.8); g.fillEllipse(x - w * 0.2, 2, w * 0.3, 1.5); }
    for (const x of [-236, 238]) this.skull(g, x, -10, 0.8, 1);                         // skulls on the tongue's ends
    // the molars (the ledges): great tooth crowns with cusps, roots sunk into the flesh
    for (const p of this.platforms.slice(1)) {
      const cx = (p.x1 + p.x2) / 2, w = p.x2 - p.x1;
      g.fillStyle(0x3e0a14, 1); g.fillEllipse(cx, p.y + 46, w + 10, 60);
      for (const dx of [-0.3, 0.3]) { g.fillStyle(P.out, 1); g.fillTriangle(cx + dx * w - 14, p.y + 10, cx + dx * w + 14, p.y + 10, cx + dx * w * 1.3, p.y + 80); g.fillStyle(0xb8a880, 1); g.fillTriangle(cx + dx * w - 10, p.y + 10, cx + dx * w + 10, p.y + 10, cx + dx * w * 1.3, p.y + 74); }
      g.fillStyle(P.out, 1); g.fillRoundedRect(p.x1 - 5, p.y - 8, w + 10, 26, 8);
      g.fillStyle(0xc8b890, 1); g.fillRoundedRect(p.x1 - 2, p.y - 5, w + 4, 20, 6);
      for (let k = 0; k < 4; k++) { const bx = p.x1 + 8 + k * (w - 16) / 3; g.fillStyle(0xe8dcb8, 1); g.fillEllipse(bx, p.y - 4, 22, 9); }   // the cusps
      g.fillStyle(0x7a6a4a, 0.8); g.fillRect(p.x1 + 6, p.y + 8, w - 12, 2); g.fillStyle(0x4a3a2a, 0.7); g.fillRect(cx - 12, p.y + 2, 3, 12);
    }
  }
  /** One tooth: from (x, gum) pointing down (dir 1) or up (-1), w wide and L long - yellowed, with a crack and a stain. */
  tooth(g, x, gum, w, L, dir, R) {
    const tip = gum + dir * L, lean = (R() - 0.5) * w * 0.4;
    g.fillStyle(P.out, 1); g.fillTriangle(x - w / 2 - 3, gum, x + w / 2 + 3, gum, x + lean, tip + dir * 4);
    g.fillStyle(0xb8a880, 1); g.fillTriangle(x - w / 2, gum, x + w / 2, gum, x + lean, tip);
    g.fillStyle(0xe8dcb8, 1); g.fillTriangle(x - w / 2 + 3, gum, x - w * 0.05, gum, x + lean * 0.8 - 2, tip - dir * 8);
    g.fillStyle(0x6a5030, 0.55); g.fillTriangle(x + w * 0.1, gum, x + w / 2, gum, x + lean, gum + dir * L * 0.55);   // the stain
    if (R() < 0.6) { g.lineStyle(1.5, 0x3a2a1a, 0.9); const cy = gum + dir * L * 0.3; g.lineBetween(x - w * 0.2, cy, x + w * 0.05, cy + dir * 9); g.lineBetween(x + w * 0.05, cy + dir * 9, x - w * 0.05, cy + dir * 18); g.lineStyle(0); }
    if (R() < 0.4) { g.fillStyle(0x000000, 1); g.fillCircle(x + lean, tip - dir * 2, 2.5); }   // (dripping)
  }
  /** A skull of someone who came before: bone-white, dark sockets and nose, a row of teeth - sz big, a dim. */
  skull(g, x, y, sz, a) {
    const r = 16 * sz;
    g.fillStyle(P.out, a); g.fillCircle(x, y, r + 2); g.fillRect(x - r * 0.62, y + r * 0.3, r * 1.24, r * 0.75);
    g.fillStyle(0xc8bca0, a); g.fillCircle(x, y, r); g.fillRect(x - r * 0.55, y + r * 0.3, r * 1.1, r * 0.66);
    g.fillStyle(0x8a7e66, a); g.fillCircle(x + r * 0.3, y + r * 0.2, r * 0.7);
    g.fillStyle(0x000000, a); g.fillEllipse(x - r * 0.38, y + r * 0.05, r * 0.55, r * 0.6); g.fillEllipse(x + r * 0.38, y + r * 0.05, r * 0.55, r * 0.6); g.fillTriangle(x - r * 0.12, y + r * 0.55, x + r * 0.12, y + r * 0.55, x, y + r * 0.32);
    g.lineStyle(1, 0x000000, a); for (let i = -2; i <= 2; i++) g.lineBetween(x + i * r * 0.2, y + r * 0.7, x + i * r * 0.2, y + r * 0.95); g.lineStyle(0);
  }
  /**
   * The live layer inside him: the swallowed stars twinkling in the walls, veins of light pulsing from the walls to the
   * heart with every beat, THE CORRUPTED HEART itself and all its attacks.
   */
  drawInside(g) {
    const t = this.t, S = this.heartS; g.clear(); if (!S) return;
    const bk = this.beatK();
    const R = seeded(57);                                                           // the stars he swallowed, stuck in the walls
    for (let i = 0; i < 46; i++) {
      const x = (R() * 2 - 1) * 620, y = -440 + R() * 400, a = 0.25 + 0.35 * Math.abs(Math.sin(t * 0.02 + i)) + (S.crackK || 0) * 0.4;
      if (Math.abs(x) < 120 && y > -260) continue;
      g.fillStyle(P.star[1], a * 0.25); g.fillCircle(x, y, 5 + (i % 3)); g.fillStyle(i % 5 ? P.star[2] : P.star[1], a); g.fillRect(x - 1, y - 1, 2 + (i % 4 === 0 ? 1 : 0), 2);
    }
    // veins from the walls to the heart, lighting up with each beat
    const veins = [[-640, -300], [-560, -60], [-380, -440], [640, -280], [560, -40], [380, -440]];
    veins.forEach(([vx, vy], i) => {
      const pts = []; for (let k = 0; k <= 14; k++) { const q = k / 14; pts.push({ x: lerp(vx, S.x, q) + Math.sin(q * 6 + i + t * 0.02) * 16 * (1 - q), y: lerp(vy, S.y, q) + Math.cos(q * 5 + i) * 20 * (1 - q) }); }
      g.lineStyle(11, 0x000000, 0.7); g.strokePoints(pts); g.lineStyle(7, P.vein[0], 1); g.strokePoints(pts);
      g.lineStyle(2, P.vein[1], 0.35 + bk * 0.45); g.strokePoints(pts.map((p) => ({ x: p.x - 1.5, y: p.y - 1.5 }))); g.lineStyle(0);
      const lit = (t * 0.012 + i * 0.37) % 1, p = pts[Math.min(14, Math.floor(lit * 15))];   // a drop of light flowing in to the heart
      g.fillStyle(P.vein[2], 0.25); g.fillCircle(p.x, p.y, 7); g.fillStyle(P.vein[3], 0.8); g.fillCircle(p.x, p.y, 2.5);
    });
    g.lineStyle(0);
    // the flesh throbs with each beat (a red flush round the edges), and black sludge drips from the roof
    if (bk > 0.05) { g.lineStyle(160, 0x8a0a1a, 0.12 * bk); g.strokeEllipse(0, -170, 1300, 760); g.lineStyle(0); }
    const D = this.drips || (this.drips = []);
    if (t % 7 === 0) { const x = (Math.random() * 2 - 1) * 560; D.push({ x, y: -420 + (x / 640) * (x / 640) * 110, v: 0 }); }
    for (const d of D) { d.v = Math.min(8, d.v + 0.25); d.y += d.v; g.fillStyle(0x000000, 1); g.fillEllipse(d.x, d.y, 5, 8 + d.v); g.fillStyle(0x5a4a6a, 0.8); g.fillRect(d.x - 1, d.y - 2, 1, 2); }
    this.drips = D.filter((d) => d.y < (Math.abs(d.x) < 265 ? -2 : 300));
    this.drawHeartFx(g, true);
    if (S.eyeGone) for (let i = 0; i < 4; i++) {                                         // the heart bleeding black sludge
      const sx = S.x + (i - 1.5) * 26 + Math.sin(t * 0.2 + i) * 3, w = 10 + (i % 2) * 6;
      g.fillStyle(0x000000, 1); g.fillRect(sx - w / 2, S.y, w, -S.y + 4); g.fillStyle(0x3a2a4a, 0.7); g.fillRect(sx - w / 2 + 2, S.y, 2, -S.y);
    }
    this.drawCorruptedHeart(g, S, bk);
    this.drawHeartFx(g, false);
    if (S.flood > 0) {                                                                    // the flood of sludge, rising
      const top = -S.flood, pts = [{ x: -900, y: 900 }];
      for (let x = -900; x <= 900; x += 20) pts.push({ x, y: top + Math.sin(x * 0.03 + t * 0.15) * 6 });
      pts.push({ x: 900, y: 900 });
      g.fillStyle(0x040108, 1); g.fillPoints(pts, true);
      g.lineStyle(2, 0x4a3a5a, 0.9); g.strokePoints(pts.slice(1, -1)); g.lineStyle(0);
      for (let i = 0; i < 14; i++) { const bx = -400 + ((i * 97 + t * 2) % 800), by = top + 10 + ((i * 53 + t) % 80); g.lineStyle(1.5, 0x4a3a5a, 0.7); g.strokeCircle(bx, by, 3 + (i % 3) * 2); }
      g.lineStyle(0);
    }
  }
  /**
   * THE CORRUPTED HEART: a heart made of shadow - smoke curling off its edges, two lobes and a point, the stumps of great
   * vessels at its top trailing dark tendrils, cracks of violet light pulsing through it with every beat, little eyes
   * all over it blinking and following you, and in the middle the GREAT EYE: a red iris with a slit pupil.
   */
  drawCorruptedHeart(g, S, bk) {
    const t = this.t, sc = S.s * (1 + bk * 0.07 - (S.squeeze || 0) * 0.1 + (S.bump || 0) * 0.08), sh = (S.shake || 0) + (S.flinch ? 2 : 0);
    const cx = S.x + (sh ? (Math.random() - 0.5) * sh : 0), cy = S.y + (sh ? (Math.random() - 0.5) * sh : 0), r = HEART.r * sc;
    if (sc < 0.03) return;
    const flash = this.boss && this.boss.flash > 0;
    // its shadow aura and smoke
    for (let i = 0; i < 4; i++) { g.fillStyle(i % 2 ? P.glow[0] : 0x000000, 0.12 - i * 0.02); g.fillCircle(cx, cy + 6, r * (2.3 - i * 0.3)); }
    for (let i = 0; i < 30; i++) {
      const q = i / 30 * Math.PI * 2 + t * 0.008 * (i % 2 ? 1 : -1), L = r * (1.1 + 0.55 * Math.abs(Math.sin(t * 0.06 + i * 1.9))), w = 0.16;
      g.fillStyle(i % 3 ? 0x000000 : P.glow[0], i % 3 ? 0.7 : 0.35); g.fillTriangle(cx + Math.cos(q - w) * r * 0.8, cy + Math.sin(q - w) * r * 0.8, cx + Math.cos(q + w) * r * 0.8, cy + Math.sin(q + w) * r * 0.8, cx + Math.cos(q) * L, cy + Math.sin(q) * L - 6);
    }
    // the vessels at its top, trailing tendrils up into the dark
    for (const [ox, w, ang] of [[-18, 12, -0.25], [8, 15, 0.05], [28, 10, 0.4]]) {
      const bx = cx + ox * sc, by = cy - r * 0.7, pts = [];
      for (let k = 0; k <= 10; k++) { const q = k / 10; pts.push({ x: bx + Math.sin(ang) * q * 120 + Math.sin(t * 0.04 + ox + q * 4) * 10 * q, y: by - q * 180 }); }
      g.lineStyle((w + 3) * sc, P.out, 1); g.strokePoints(pts); g.lineStyle(w * sc, P.shade[2], 1); g.strokePoints(pts); g.lineStyle(2, P.vein[1], 0.6); g.strokePoints(pts.map((p) => ({ x: p.x - w * 0.25, y: p.y })));
      g.fillStyle(P.out, 1); g.fillEllipse(bx, by - 2, w * 2.2 * sc, w * 0.9 * sc);
    }
    g.lineStyle(0);
    // the heart: two lobes and a point
    const shape = (k) => { const pts = []; for (let i = 0; i <= 40; i++) { const q = i / 40 * Math.PI * 2, x = 16 * Math.pow(Math.sin(q), 3), y = -(13 * Math.cos(q) - 5 * Math.cos(2 * q) - 2 * Math.cos(3 * q) - Math.cos(4 * q)); pts.push({ x: cx + x * r / 16 * k, y: cy + (y + 2) * r / 16 * k }); } return pts; };
    g.fillStyle(P.glow[0], 0.18 + bk * 0.2); g.fillPoints(shape(1.22), true); g.fillStyle(P.glow[1], 0.12 + bk * 0.15); g.fillPoints(shape(1.13), true);   // its violet halo, flaring with each beat
    g.fillStyle(P.out, 1); g.fillPoints(shape(1.08), true);
    g.fillStyle(flash ? 0xffffff : P.shade[1], 1); g.fillPoints(shape(1), true);
    g.fillStyle(P.shade[2], 1); g.fillPoints(shape(0.78).map((p) => ({ x: p.x - r * 0.12, y: p.y - r * 0.12 })), true);
    g.fillStyle(P.shade[3], 0.6); g.fillEllipse(cx - r * 0.42, cy - r * 0.5, r * 0.5, r * 0.3);
    g.lineStyle(2, P.glow[1], 0.55 + bk * 0.4); g.strokePoints(shape(1), true); g.lineStyle(0);
    // cracks of light through it
    const Rc = seeded(23), n = 6 + Math.floor((S.crackK || 0) * 10) + (this.hMad ? 3 : 0);
    for (let c = 0; c < n; c++) {
      const q = Rc() * Math.PI * 2; let px = cx + Math.cos(q) * r * 0.9, py = cy + Math.sin(q) * r * 0.8;
      for (let k = 0; k < 3; k++) { const nx = px + (cx - px) * 0.32 + (Rc() - 0.5) * 16 * sc, ny = py + (cy - py) * 0.32 + (Rc() - 0.5) * 16 * sc; g.lineStyle(3, P.glow[0], 0.5 + bk * 0.4); g.lineBetween(px, py, nx, ny); g.lineStyle(1, c % 3 ? P.glow[2] : P.vein[3], 0.5 + bk * 0.5); g.lineBetween(px, py, nx, ny); px = nx; py = ny; }
    }
    g.lineStyle(0);
    // the little eyes
    const L = S.look;
    HEART.eyes.forEach(([ex, ey, er], i) => {
      const x = cx + ex * sc, y = cy + ey * sc, lid = S.lid[i], rr = er * sc;
      if (S.popped.includes(i)) { g.fillStyle(0x000000, 1); g.fillEllipse(x, y, rr * 2.2, rr * 1.2); g.fillStyle(P.vein[2], 0.6); g.fillCircle(x, y + rr * 0.6, 1.5); return; }
      g.fillStyle(P.out, 1); g.fillEllipse(x, y, rr * 2.6, rr * 1.9 * Math.max(0.2, lid));
      if (lid < 0.3) { g.lineStyle(1.5, P.glow[1], 0.8); g.lineBetween(x - rr, y, x + rr, y); g.lineStyle(0); return; }
      g.fillStyle(P.eye[1], 1); g.fillEllipse(x, y, rr * 2.2, rr * 1.6 * lid); g.fillStyle(P.eye[0], 0.7); g.fillEllipse(x, y + rr * 0.35 * lid, rr * 2.1, rr * 0.8 * lid);
      const ic = this.hMad ? P.eye[3] : 0xffd040; g.fillStyle(ic, 0.3); g.fillCircle(x + L.x * rr * 0.4, y + L.y * rr * 0.3, rr * 0.95);
      g.fillStyle(ic, 1); g.fillCircle(x + L.x * rr * 0.4, y + L.y * rr * 0.3, rr * 0.58);
      g.fillStyle(0x000000, 1); g.fillEllipse(x + L.x * rr * 0.45, y + L.y * rr * 0.35, rr * 0.28, rr * 0.9);
      if ((S.charge || 0) > 0) { g.fillStyle(P.glow[2], 0.5 * S.charge); g.fillCircle(x, y, rr * (1.4 + S.charge)); }
    });
    this.drawGreatEye(g, S, cx, cy, sc);
    if (S.stunned) for (let i = 0; i < 3; i++) { const q = t * 0.12 + i * 2.1; this.drawSpark(g, cx + Math.cos(q) * r * 0.9, cy - r - 10 + Math.sin(q) * 6); }
    if (flash) { g.fillStyle(0xffffff, 0.3); g.fillPoints(shape(1), true); }
  }
  /**
   * THE GREAT EYE, with a face's worth of expression (its mood in `S.ep`, eased in stepHeartBody): a bloodshot eyeball
   * whose red iris and slit pupil follow you (pinprick when it charges, a spiral when dizzy, darting when it panics),
   * an upper and a lower lid of shadow that narrow, squeeze shut, widen or curl into a cruel smile, a heavy brow ridge
   * that knots into a V when it's angry and lifts when it's afraid, a tremble, black tears of sludge - and, as it dies,
   * cracks, then an empty socket oozing black.
   */
  drawGreatEye(g, S, cx, cy, sc) {
    const E = S.ep || MOODS.watch, t = this.t, o = Math.max(0, Math.min(1.4, S.open)), ew = 36 * sc, eh = 24 * sc;
    const x0 = cx + (E.shake ? (Math.random() - 0.5) * E.shake : 0), y0 = cy + (E.shake ? (Math.random() - 0.5) * E.shake * 0.6 : 0);
    if (S.eyeGone) {                                                                   // the empty socket, oozing
      g.fillStyle(P.out, 1); g.fillEllipse(x0, y0, ew * 2 + 8, eh * 2 + 8); g.fillStyle(0x000000, 1); g.fillEllipse(x0, y0, ew * 2, eh * 1.8);
      for (let i = 0; i < 9; i++) { const q = i / 9 * Math.PI * 2; g.fillStyle(P.bone[2], 1); g.fillTriangle(x0 + Math.cos(q - 0.2) * ew, y0 + Math.sin(q - 0.2) * eh * 0.9, x0 + Math.cos(q + 0.2) * ew, y0 + Math.sin(q + 0.2) * eh * 0.9, x0 + Math.cos(q) * ew * 0.75, y0 + Math.sin(q) * eh * 0.65); }
      for (let i = 0; i < 5; i++) { const dx = (i - 2) * ew * 0.35, L = 20 + ((t * 0.7 + i * 23) % 60); g.fillStyle(0x000000, 1); g.fillRoundedRect(x0 + dx - 4, y0 + eh * 0.5, 8, L, 4); g.fillStyle(0x3a2a4a, 0.8); g.fillRect(x0 + dx - 2, y0 + eh * 0.5, 1.5, L - 4); }
      return;
    }
    const top = Math.min(1.4, E.top * o), bot = Math.min(1.4, E.bot * Math.max(0.15, o));
    g.fillStyle(P.eye[0], 1); g.fillEllipse(x0, y0, ew * 2 + 10, eh * 2.6 + 10);         // the socket
    // the eyeball: pale, bloodshot (more so when it's angry or scared)
    g.fillStyle(0xd8b8b0, 1); g.fillEllipse(x0, y0, ew * 2, eh * 2.4); g.fillStyle(P.eye[1], 0.35); g.fillEllipse(x0, y0 + eh * 0.5, ew * 1.9, eh * 1.2);
    for (const sx of [-1, 1]) { g.fillStyle(P.eye[0], 0.45); g.fillEllipse(x0 + sx * ew * 0.84, y0, ew * 0.46, eh * 1.6); }
    const Rv = seeded(7), nv = 8 + Math.round(Math.max(E.glow, E.shake) * 5);
    g.lineStyle(1, P.eye[2], 0.85); for (let k = 0; k < nv; k++) { const sx = Rv() < 0.5 ? -1 : 1; let px = x0 + sx * ew * 0.97, py = y0 + (Rv() - 0.5) * eh * 1.6; for (let q = 0; q < 3; q++) { const nx = px - sx * ew * (0.12 + Rv() * 0.1), ny = py + (Rv() - 0.5) * 7; g.lineBetween(px, py, nx, ny); px = nx; py = ny; } } g.lineStyle(0);
    // the iris and pupil
    const L = S.look, ix = x0 + L.x * ew * 0.4, iy = y0 + L.y * eh * 0.36, ir = 15 * sc;
    if (E.glow > 0.8) { g.fillStyle(0xff3a2a, 0.22 * (E.glow - 0.6)); g.fillCircle(ix, iy, ir * 1.8); }
    g.fillStyle(P.eye[1], 1); g.fillCircle(ix, iy, ir); g.fillStyle(E.glow > 1 ? 0xff5a3a : P.eye[2], 1); g.fillCircle(ix, iy, ir * 0.8);
    for (let k = 0; k < 12; k++) { const q = k / 12 * Math.PI * 2; g.lineStyle(1, P.eye[3], 0.7); g.lineBetween(ix + Math.cos(q) * ir * 0.3, iy + Math.sin(q) * ir * 0.3, ix + Math.cos(q) * ir * 0.8, iy + Math.sin(q) * ir * 0.8); }
    g.lineStyle(0);
    if (E.spiral > 0.5) { const pts = []; for (let k = 0; k <= 30; k++) { const q = k / 30, a = q * Math.PI * 4 + t * 0.25; pts.push({ x: ix + Math.cos(a) * ir * 0.75 * q, y: iy + Math.sin(a) * ir * 0.75 * q }); } g.lineStyle(2.5, 0x000000, 1); g.strokePoints(pts); g.lineStyle(0); }
    else if (E.pupil < 0.4) { g.fillStyle(0x000000, 1); g.fillCircle(ix, iy, ir * 0.2); }
    else { g.fillStyle(0x000000, 1); g.fillEllipse(ix, iy, ir * 0.34 * E.pupil * 2, ir * 1.75); }
    g.fillStyle(0xffffff, 0.85); g.fillCircle(ix - ir * 0.38, iy - ir * 0.42, ir * 0.18);
    if (S.eyeCrack > 0) {                                                              // cracking before it shatters
      const Rc = seeded(31), n = Math.ceil(S.eyeCrack * 9);
      for (let k = 0; k < n; k++) { let px = x0 + (Rc() - 0.5) * ew * 0.6, py = y0 + (Rc() - 0.5) * eh; for (let q = 0; q < 4; q++) { const nx = px + (Rc() - 0.5) * ew * 0.7, ny = py + (Rc() - 0.5) * eh * 0.8; g.lineStyle(3, 0x000000, 0.8); g.lineBetween(px, py, nx, ny); g.lineStyle(1, 0xffffff, 0.9); g.lineBetween(px, py, nx, ny); px = nx; py = ny; } }
      g.lineStyle(0);
    }
    // the lids: shadow closing from above and below, edged with a lash line of spikes
    const N = 18, up = [], dn = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N * 2 - 1, arc = Math.sqrt(Math.max(0, 1 - u * u)), x = x0 + u * (ew + 3);
      const uy = y0 - eh * 1.2 * top * arc;
      up.push({ x, y: uy });
      dn.push({ x, y: Math.max(uy + 1.5, y0 + eh * 1.2 * bot * arc - (E.smile || 0) * eh * 0.9 * arc) });   // (a smile curls the lower lid up, never past the upper)
    }
    const lidC = P.shade[2], socket = (sgn) => { const pts = []; for (let i = N; i >= 0; i--) { const u = i / N * 2 - 1; pts.push({ x: x0 + u * (ew + 4), y: y0 + sgn * (eh * 1.3 + 4) * Math.sqrt(Math.max(0, 1 - u * u)) }); } return pts; };
    g.fillStyle(lidC, 1); g.fillPoints([...up, ...socket(-1)], true);                   // each lid: from its edge out to the socket's rim
    g.fillStyle(lidC, 1); g.fillPoints([...dn, ...socket(1)], true);
    g.lineStyle(3.5, P.out, 1); g.strokePoints(up); g.strokePoints(dn); g.lineStyle(1, P.glow[0], 0.7); g.strokePoints(up.map((p) => ({ x: p.x, y: p.y - 3 }))); g.lineStyle(0);
    for (let i = 2; i < N - 1; i += 2) { const p = up[i], q = (i / N - 0.5) * 1.2; g.fillStyle(P.out, 1); g.fillTriangle(p.x - 2, p.y, p.x + 2, p.y, p.x + Math.sin(q) * 7, p.y - 7); }   // lashes
    // the brow ridge: a V when angry, lifted when afraid
    const bw = E.brow, by = y0 - eh * 1.2 * Math.max(0.55, top) - 8;
    const brow = [{ x: x0 - ew - 10, y: by - 4 - bw * 7 }, { x: x0 - ew * 0.5, y: by - bw * 2 }, { x: x0, y: by + bw * 9 }, { x: x0 + ew * 0.5, y: by - bw * 2 }, { x: x0 + ew + 10, y: by - 4 - bw * 7 }];
    g.lineStyle(9, P.out, 1); g.strokePoints(brow); g.lineStyle(4, P.shade[3], 1); g.strokePoints(brow); g.lineStyle(1.5, P.glow[0], 0.8); g.strokePoints(brow.map((p) => ({ x: p.x, y: p.y - 3 }))); g.lineStyle(0);
    if (bw > 0.6) { g.lineStyle(2, P.out, 0.9); for (const sx of [-1, 1]) g.lineBetween(x0 + sx * 6, by + bw * 7 - 6, x0 + sx * 14, by - 10); g.lineStyle(0); }   // (a furrow)
    for (const d of S.tears) { g.fillStyle(0x000000, 1); g.fillCircle(x0 + d.x, y0 + eh * 0.9 + d.y, 3.5); g.fillRect(x0 + d.x - 1.5, y0 + eh * 0.9, 3, d.y); g.fillStyle(0x4a3a5a, 0.9); g.fillRect(x0 + d.x - 1, y0 + eh * 0.9 + d.y - 2, 1, 1); }   // black tears
  }
  /** A little dizzy star (over the stunned heart). */
  drawSpark(g, x, y) { g.fillStyle(P.star[1], 1); g.fillTriangle(x - 4, y, x + 4, y, x, y - 6); g.fillTriangle(x - 4, y - 3, x + 4, y - 3, x, y + 3); }
  /** The heart's attacks: behind = the warnings under it (lash lines, claw marks, the gaze's aim), else the bolts, rings, claws, beam and waves in front. */
  drawHeartFx(g, behind) {
    const t = this.t, warn = this.sp(LASH.warn), gw = this.sp(GRASP.warn);
    if (behind) {
      const F = this.flatS;
      if (F) {                                                                         // FLATLINE: the monitor's grid and its trace
        const a = Math.min(1, F.t / 30);
        g.lineStyle(1, 0x1a8a4a, 0.25 * a); for (let x = -300; x <= 300; x += 30) g.lineBetween(x, -300, x, 10); for (let y = -300; y <= 10; y += 30) g.lineBetween(-300, y, 300, y); g.lineStyle(0);
        if (F.phase === 'trace' && F.x > -300) {
          const pts = []; for (let x = -300; x <= F.x; x += 2) pts.push({ x, y: this.ecgY(x, F) });
          g.lineStyle(7, 0x1aff6a, 0.25); g.strokePoints(pts); g.lineStyle(2.5, 0x8affb0, 1); g.strokePoints(pts); g.lineStyle(0);
          const h = pts[pts.length - 1]; g.fillStyle(0xffffff, 1); g.fillCircle(h.x, h.y, 3.5); g.fillStyle(0x5aff8a, 0.4); g.fillCircle(h.x, h.y, 10);
          for (const b of F.beats) if (b.t < FLAT.burn) { g.fillStyle(0x5aff8a, 0.3 * (1 - b.t / FLAT.burn)); g.fillRect(b.x - FLAT.w, FLAT.base - FLAT.spike, FLAT.w * 2, FLAT.spike - FLAT.base); }
        } else if (F.phase === 'flat') {
          const on = F.ft >= FLAT.clear, blink = this.t % 6 < 3;
          g.lineStyle(on ? 14 : 6, on ? 0xb8ffd0 : 0x1aff6a, on ? 0.5 : (blink ? 0.5 : 0.2)); g.lineBetween(-300, FLAT.base, 300, FLAT.base);
          g.lineStyle(2.5, on ? 0xffffff : 0x8affb0, 1); g.lineBetween(-300, FLAT.base, 300, FLAT.base); g.lineStyle(0);
          if (on) { const Rz = seeded(this.t); g.lineStyle(2, 0xffffff, 0.9); for (let k = 0; k < 6; k++) { let x = -280 + Rz() * 560, y = -4; for (let q = 0; q < 4; q++) { const nx = x + (Rz() - 0.5) * 40, ny = y - 8 - Rz() * 10; g.lineBetween(x, y, nx, ny); x = nx; y = ny; } } g.lineStyle(0); }
        }
      }
      for (const L of this.lashes) if (L.t >= 0 && L.t < warn) { const k = L.t / warn; g.fillStyle(P.vein[2], (0.08 + 0.14 * k) * (t % 8 < 4 ? 1 : 0.5)); g.fillRect(-300, L.y - LASH.h, 600, LASH.h * 2); g.fillStyle(P.vein[3], 0.6 * k); g.fillCircle(-L.s * 300, L.y, 10 + 14 * k); }
      for (const G of this.grasps) if (G.t < gw) { const k = G.t / gw; g.fillStyle(0x000000, 0.5 + 0.3 * k); g.fillEllipse(G.x, G.y - 1, GRASP.w * (0.6 + 0.6 * k), 8); g.lineStyle(1, P.glow[1], 0.7 * k); g.strokeEllipse(G.x, G.y - 1, GRASP.w * 1.3, 11); g.lineStyle(0); }
      return;
    }
    for (const L of this.lashes) if (L.t >= warn) {                                   // the whipping vein
      const x0 = -L.s * 300, pts = []; for (let k = 0; k <= 20; k++) { const q = k / 20, x = lerp(x0, L.x, q); pts.push({ x, y: L.y + Math.sin(q * 9 - t * 0.6) * 8 * (1 - q) }); }
      g.lineStyle(LASH.h * 1.6, P.out, 1); g.strokePoints(pts); g.lineStyle(LASH.h, P.vein[1], 1); g.strokePoints(pts); g.lineStyle(4, P.vein[3], 1); g.strokePoints(pts); g.lineStyle(0);
      g.fillStyle(P.vein[3], 1); g.fillCircle(L.x, L.y, LASH.h * 0.7);
    }
    for (const R of this.vrings) {
      const seg = 72;
      for (let i = 0; i < seg; i++) {
        const q0 = i / seg * Math.PI * 2, q1 = (i + 1) / seg * Math.PI * 2, mid = (q0 + q1) / 2;
        if (R.gaps.some((gp) => Math.abs(Phaser.Math.Angle.Wrap(mid - gp)) < PULSE.gap)) continue;
        for (const [w, c, a] of [[18, 0x000000, 0.6], [9, P.glow[0], 0.9], [3, P.glow[2], 1]]) { g.lineStyle(w, c, a); g.lineBetween(R.x + Math.cos(q0) * R.r, R.y + Math.sin(q0) * R.r, R.x + Math.cos(q1) * R.r, R.y + Math.sin(q1) * R.r); }
      }
      g.lineStyle(0);
    }
    for (const G of this.grasps) if (G.t >= gw) {                                      // claws of shadow
      const up = Math.min(1, (G.t - gw) / 6) * (G.t > gw + GRASP.up ? Math.max(0, 1 - (G.t - gw - GRASP.up) / 14) : 1), h = GRASP.h * up;
      for (const [dx, lean, w] of [[-14, -0.25, 9], [0, 0, 11], [14, 0.25, 9]]) {
        const bx = G.x + dx, tx = bx + lean * h, ty = G.y - h;
        g.fillStyle(P.out, 1); g.fillTriangle(bx - w - 2, G.y, bx + w + 2, G.y, tx, ty - 4);
        g.fillStyle(P.shade[2], 1); g.fillTriangle(bx - w, G.y, bx + w, G.y, tx, ty);
        g.fillStyle(P.glow[1], 0.8); g.fillTriangle(bx - 2, G.y - h * 0.2, bx + 2, G.y - h * 0.2, tx, ty + 6);
      }
    }
    if (this.gaze) {
      const Z = this.gaze, L = 720, ex = Z.x + Z.ux * L, ey = Z.y + Z.uy * L;
      if (Z.st === 'aim' || Z.st === 'lock') { g.lineStyle(Z.st === 'lock' ? 3 : 1.5, P.eye[2], Z.st === 'lock' ? (t % 4 < 2 ? 1 : 0.4) : 0.6); g.lineBetween(Z.x, Z.y, ex, ey); g.lineStyle(0); }
      else if (Z.st === 'fire') { for (const [w, c, a] of [[GAZE.w * 3, P.eye[1], 0.35], [GAZE.w * 1.8, P.eye[2], 0.85], [GAZE.w * 0.7, P.eye[4], 1]]) { g.lineStyle(w, c, a); g.lineBetween(Z.x, Z.y, ex, ey); } g.lineStyle(0); }
    }
    for (const w of this.hwaves) { const a = 1 - w.t / SLAM.wave.life; g.fillStyle(P.glow[0], 0.5 * a); g.fillEllipse(w.x, -8, 26, 22); g.fillStyle(P.glow[2], 0.8 * a); g.fillEllipse(w.x, -10, 10, 14); }
    for (const b of this.bolts) {
      b.trail.forEach((p, i) => { g.fillStyle(P.glow[0], 0.25 * i / b.trail.length); g.fillCircle(p.x, p.y, BOLT.r * (0.4 + 0.6 * i / b.trail.length)); });
      g.fillStyle(P.glow[1], 0.3); g.fillCircle(b.x, b.y, BOLT.r * 1.7); g.fillStyle(P.glow[2], 1); g.fillCircle(b.x, b.y, BOLT.r + 1.5); g.fillStyle(0x000000, 1); g.fillCircle(b.x, b.y, BOLT.r - 1);
      g.lineStyle(1, P.glow[1], 0.9); g.strokeEllipse(b.x, b.y, BOLT.r * 2.6 * Math.abs(Math.cos(t * 0.2 + b.id)), BOLT.r * 2.6); g.lineStyle(0);
    }
  }
  /**
   * The torn neck on his fallen body (drawn on his body layer): a ring of ragged obsidian round a hole full of swirling
   * dark light, beams rising from it while it waits for you; before the head comes off, a ring of light cracking round it.
   */
  drawNeck(g, Ht) {
    const t = this.t, x = Ht.x, y = Ht.y + NECK.dy;
    if (this.neckCrack > 0) {
      const k = this.neckCrack, R = seeded(19);
      g.fillStyle(P.glow[2], 0.2 * k); g.fillEllipse(x, y - 12, 140, 40);
      for (let i = 0; i < 12; i++) { const q = R() * Math.PI - Math.PI, L = (40 + R() * 160) * k; g.lineStyle(3, P.glow[1], 0.5 * k); g.lineBetween(x, y - 10, x + Math.cos(q) * L, y - 10 + Math.sin(q) * L); g.lineStyle(1, 0xffffff, 0.8 * k); g.lineBetween(x, y - 10, x + Math.cos(q) * L, y - 10 + Math.sin(q) * L); }
      g.lineStyle(4, 0xffffff, k); const pts = []; for (let i = 0; i <= 16; i++) pts.push({ x: x - 50 + i * 6.25, y: y - 10 + (i % 2 ? -4 : 4) * k }); g.strokePoints(pts); g.lineStyle(0);
      return;
    }
    if (!this.headFall || this.inside) return;
    const pul = 0.6 + 0.4 * Math.sin(t * 0.1);
    g.fillStyle(P.glow[1], 0.15 * pul); g.fillEllipse(x, y, 160, 60);
    g.fillStyle(P.out, 1); g.fillEllipse(x, y, 96, 34);
    for (let i = 0; i < 14; i++) { const q = i / 14 * Math.PI * 2; g.fillStyle(i % 2 ? 0x1a1630 : 0x2e2852, 1); g.fillTriangle(x + Math.cos(q - 0.2) * 44, y + Math.sin(q - 0.2) * 15, x + Math.cos(q + 0.2) * 44, y + Math.sin(q + 0.2) * 15, x + Math.cos(q) * (54 + (i % 3) * 5), y + Math.sin(q) * (19 + (i % 3) * 2)); }
    g.fillStyle(0x000000, 1); g.fillEllipse(x, y, 80, 26);
    for (let i = 0; i < 4; i++) { g.fillStyle([P.glow[0], P.vein[1], P.glow[1], 0x000000][i], 0.9); g.fillEllipse(x + Math.sin(t * 0.07 + i) * 4, y + Math.cos(t * 0.07 + i) * 1.5, 70 * (1 - i * 0.22), 22 * (1 - i * 0.22)); }
    g.lineStyle(2, P.glow[2], 0.7 * pul); g.strokeEllipse(x, y, 80, 26); g.lineStyle(0);
  }
  /**
   * In front of everything outside: while his head waits on the floor, a swirl of dark light round its open mouth and
   * a bobbing arrow - jump in here; as you're spat back out, a geyser of black sludge from it.
   */
  drawPhaseFx(x) {
    const t = this.t, m = this.mawAt();
    if (this.headless === 'maw') {
      for (let i = 0; i < 3; i++) { x.lineStyle(2, P.glow[i], 0.5 + 0.3 * Math.sin(t * 0.1 + i)); x.strokeEllipse(m.x, m.y, 70 + i * 18 + Math.sin(t * 0.08 + i) * 6, 40 + i * 10); }
      x.lineStyle(0);
      const ay = m.y - 120 + Math.sin(t * 0.12) * 7; x.fillStyle(P.out, 1); x.fillTriangle(m.x - 15, ay - 3, m.x + 15, ay - 3, m.x, ay + 18); x.fillStyle(P.star[1], 1); x.fillTriangle(m.x - 11, ay - 1, m.x + 11, ay - 1, m.x, ay + 14);
    }
    if (this.geyser > 0) {
      const k = this.geyser / 50, h = 260 * Math.min(1, (50 - this.geyser) / 8 + 0.2);
      x.fillStyle(0x000000, 0.9 * k); x.fillRect(m.x - 16, m.y - h, 32, h); x.fillStyle(0x3a2a4a, 0.8 * k); x.fillRect(m.x - 10, m.y - h, 3, h);
      for (let i = 0; i < 8; i++) { const q = i / 8 * Math.PI - Math.PI, r = 30 + (50 - this.geyser) * 3; x.fillStyle(0x000000, 0.9 * k); x.fillCircle(m.x + Math.cos(q) * r, m.y - h + Math.sin(q) * r * 0.5 + (50 - this.geyser) * 2, 6); }
    }
  }
}

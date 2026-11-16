// VESPERION's second half - THE BEHEADING and HIS CORRUPTED HEART (mixed into StarBossStage, src/stage/starBossStage.js).
// At half health his head cracks off at the neck, bounces across the observatory floor and rolls off into the void;
// his body slumps and sinks until the torn neck sits just above the floor - a hole full of dark light. Walk into it
// (or wait: the void pulls you in) and you fall down inside him: a cavern of obsidian ribs traced in gold, the stars he
// swallowed stuck in its walls, veins of violet light all running to THE CORRUPTED HEART - a shadow in the shape of a
// heart, smoking at its edges, cracked with light and covered in eyes, a great red one in the middle (its weak spot).
// It gets its own name card. Its attacks: VOID BOLTS (its eyes fire dark orbs at you - hit one to pop it), VEIN LASH (a
// vein glows at floor or ledge height, then whips across), HEARTBEAT (it squeezes, then beats: a ring of dark force
// with gaps), THE GAZE (the great eye aims a beam that tracks you, locks and fires), SHADOW GRASP (claws of shadow
// burst up under you), HEART SLAM (it drops onto you and lies stunned - your opening) and, in THE LAST LIGHT, VOID STORM
// (spirals of bolts from every eye). Its death: the eyes burst one by one, it caves in, and in the white flash you're
// back outside under the sky as every star he swallowed comes home.
// Without a player watching (the sim) the cutscenes are skipped: he just loses his head and the fighters go in.
import { sfx } from '../audio/sfx.js';
import { VIEW_W, VIEW_H } from '../config.js';

const P = {
  out: 0x05030c, void: [0x020106, 0x06030e, 0x0d0619, 0x170a2a, 0x22103a], vein: [0x2a0820, 0x7a1650, 0xd83a8a, 0xffa0d0],
  glow: [0x4a1ac8, 0x8a5aff, 0xd8c0ff], eye: [0x1a0008, 0x8a0a22, 0xe8203a, 0xff7a6a, 0xffd8c8], bone: [0x0a0814, 0x15122a, 0x241e44, 0x3a3268],
  gold: [0x7a4a10, 0xb8801e, 0xe8b440, 0xfff0a0], star: [0xffb030, 0xffe070, 0xfff8e0], shade: [0x000000, 0x0a0410, 0x160822, 0x26103a],
};
// THE BEHEADING (frames): the light cracking round his neck, the head snapping off, the body sinking, the end; the head's fall
const DECAP = { crack: 24, snap: 96, sink: [160, 250], n: 320, grav: 0.34, bounce: 0.42, roll: 2.8 };
// the way in: the torn neck (relative to his heart), how close you must stand, and after how many frames the void pulls you in anyway
const NECK = { dy: -62, w: 40, wait: 600 };
// going in: frames the void drags you to the neck, the black fall, the picture opening again inside, the end
const DIVE_IN = { pull: 46, black: 70, open: 110, n: 140 };
// THE CORRUPTED HEART: where it floats, its size, how far it drifts, how much longer it pauses between attacks, the great eye's damage multiplier, the little eyes ([x, y, r] on it)
const HEART = { x: 0, y: -122, r: 58, drift: 120, bob: 12, ease: 0.04, rest: 2.1, eye: 2, body: 1.5, eyes: [[-40, -34, 8], [38, -38, 8], [-54, 2, 7], [52, 8, 7], [-24, 40, 6], [24, 42, 6], [0, -60, 6], [-12, 62, 4], [62, -16, 5], [-62, -22, 5]] };
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
// its death: frames between eyes bursting, when it caves in, when the white flash comes
const HDIE = { pop: 14, implode: 130, flash: 200 };

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
  /** The beheading's end state at once: the head gone into the void, the body sunk, the neck open and waiting for you. */
  decapNow(match) {
    this.headFall.y = 3000; this.headFall.vy = 0; this.headGone = true; this.v.sink = 1; this.v.slump = 1; this.v.eye = 0;
    this.limpHands(true);
    this.cut = null; this.headless = 'neck'; this.neckT = 0;
    if (this.uiG) this.uiG.clear();
    this.boss.wait = 9999;
  }
  /** His hands drop lifeless to the floor either side (at once, or eased). */
  limpHands(now) {
    this.hands.forEach((h) => { h.tx = h.side * 214; h.ty = -18; h.ta = h.side * 1.5; h.tf = 0.55; h.fast = 0.06; h.glow = 0; if (now) { h.x = h.tx; h.y = h.ty; h.a = h.ta; h.fist = h.tf; } });
  }
  /** The cutscene camera (MatchScene asks introCam while `cut` runs): eased toward `cut.shot`. */
  cutCam() {
    const w = this.cut.shot || { x: 0, y: -150, zoom: 1 };
    this.ccam = { x: lerp(this.ccam.x, w.x, 0.08), y: lerp(this.ccam.y, w.y, 0.08), zoom: lerp(this.ccam.zoom, w.zoom, 0.08) };
    return { ...this.ccam, exact: true };
  }
  /** One frame of whichever mid-fight cutscene is playing. */
  cutStep(match) { this.t++; if (this.whiteT > 0) this.whiteT--; if (this.cut.kind === 'decap') this.decapStep(match); else this.diveInStep(match); this.stepHands(); this.v.shake *= 0.85; }
  /** A fresh press skips the cutscene: straight to its end. */
  skipCut(match) { if (this.cut.kind === 'decap') this.decapNow(match); else { this.goInside(match); this.cut = null; if (this.uiG) this.uiG.clear(); this.heartCard(match); } }
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
        F.vx = DECAP.roll * 0.4; F.vy = -4; sfx('bighit', 1, 0.45); sfx('glass', 1, 0.7); sfx('roar', 0.9, 0.45); match.shake(16, 26);
        this.whiteT = 14; this.limpHands(false);
        for (let i = 0; i < 36; i++) { const q = Math.random() * Math.PI * 2, s = 2 + Math.random() * 6; match.particles.push({ x: j.heart.x + Math.cos(q) * 30, y: j.heart.y + NECK.dy, vx: Math.cos(q) * s, vy: Math.sin(q) * s - 2, life: 30 + Math.random() * 20, color: [P.glow[1], P.glow[2], P.gold[2], 0xffffff][i % 4], size: 3, grav: 0.12, drag: 0.95 }); }
      }
      if (!this.headGone) {                                                         // the head falls, bounces and rolls off the edge
        F.vy += DECAP.grav; F.x += F.vx; F.y += F.vy; F.a += F.vx * 0.022;
        const R = 44;
        if (Math.abs(F.x) < 265 + R * 0.4 && F.y + R > 0 && F.vy > 0) {
          F.y = -R;
          if (F.vy > 2) { sfx('bighit', 0.8, 0.5 + Math.random() * 0.1); match.shake(8, 10); for (let i = 0; i < 12; i++) match.particles.push({ x: F.x + (Math.random() - 0.5) * 60, y: -2, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 3, life: 22, color: [0xb4b8d0, 0xe8b440, 0x8a6aff][i % 3], size: 3, grav: 0.2 }); }
          F.vy = -F.vy * DECAP.bounce; F.vx = DECAP.roll; v.eye = Math.max(0, v.eye - 0.1);
        }
        if (F.y > 700) { this.headGone = true; F.y = 3000; sfx('whoosh', 0.7, 0.4); }
      }
      if (once('sink', DECAP.sink[0])) { sfx('rumble', 1, 0.4); sfx('roar', 0.6, 0.35); }
      v.sink = ease((t - DECAP.sink[0]) / (DECAP.sink[1] - DECAP.sink[0])); v.slump = Math.max(v.slump, v.sink);
      if (t > DECAP.sink[0] && t < DECAP.sink[1] && t % 12 === 0) match.shake(5, 12);
      C.shot = t < DECAP.sink[0] - 10 && !this.headGone ? { x: Math.min(260, F.x), y: Math.max(-200, F.y), zoom: 1.35 } : t < DECAP.sink[1] ? { x: 0, y: -140, zoom: 0.95 } : { x: 0, y: j.heart.y + NECK.dy + 20, zoom: 1.5 };
      if (once('pour', DECAP.sink[1] + 10)) sfx('summon', 0.9, 0.5);
    }
    if (t >= C.n) this.decapNow(match);
  }
  /** Where the torn neck is (the hole you walk into). */
  neckAt() { const h = this.joints().heart; return { x: h.x, y: h.y + NECK.dy }; }

  // ------------------------------------------------------------------ the way in
  /** Someone steps into the neck (or the wait runs out): the fall inside, as a cutscene or (the sim) at once. */
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
   * Falling inside: the dark light flares and drags everyone into the neck while the picture closes to a ring round it,
   * black - a long fall past streaks of violet, his heartbeat booming closer - then the ring opens again on the cavern
   * inside him, and the heart's name card.
   */
  diveInStep(match) {
    const C = this.cut, t = ++C.t, n = this.neckAt();
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
    this.heartS = { x: HEART.x, y: HEART.y - 60, tx: HEART.x, ty: HEART.y, beat: 0, squeeze: 0, open: 0, tgtOpen: 1, look: { x: 0, y: 0 }, blink: HEART.eyes.map((_, i) => 40 + i * 23), lid: HEART.eyes.map(() => 1), popped: [], slam: 0, s: 1 };
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
  outLayers() { return [this.skyPaint, this.skyG, this.backG, this.bodyG, this.floorG, this.handG].filter(Boolean); }

  // ------------------------------------------------------------------ every frame while he's headless
  /**
   * The neck: he lies still and can't be hurt; the hole pulses, ENTER HIS NECK! blinks, and whoever stands in it falls
   * in (after NECK.wait frames, or in the sim once the CPU gets there, the void takes everyone anyway). Inside: the
   * heart floats, beats and watches you.
   */
  stepHeadless(match) {
    const B = this.boss, v = this.v;
    v.slump = 1; v.shell = 0; v.mouth *= 0.95;
    if (this.headless === 'neck') {
      B.atk = null; B.wait = 9999; this.neckT = (this.neckT || 0) + 1;
      const n = this.neckAt();
      this.rageText.setText('ENTER HIS NECK!').setColor('#e0c8ff').setFontSize(12).setVisible(this.neckT % 40 < 28);
      if (this.neckT % 50 === 0) sfx('summon', 0.3, 0.5 + (this.neckT % 100 ? 0.1 : 0));
      if (this.neckT % 4 === 0) match.particles.push({ x: n.x + (Math.random() - 0.5) * 50, y: n.y, vx: (Math.random() - 0.5) * 0.6, vy: -1.2 - Math.random(), life: 40, color: P.glow[this.neckT % 3], size: 2 });
      match.bossProxy.x = n.x; match.bossProxy.y = n.y + 40;
      const who = match.fighters.find((f) => f.alive && f.state !== 'respawn' && Math.abs(f.x - n.x) < NECK.w && f.y > n.y - 50 && f.y < n.y + 70);
      if (who || this.neckT > (this.watched ? NECK.wait : 240)) {
        if (!who) match.popText({ x: n.x, y: n.y - 30 }, 'THE VOID PULLS YOU IN', '#c8a8ff');
        this.startDiveIn(match, who);
      }
      return;
    }
    if (this.headless === 'inside') {
      const S = this.heartS;
      if (S.wasAtk && !B.atk) B.wait = Math.round(B.wait * HEART.rest);                 // (a longer breather after each attack than his own)
      S.wasAtk = !!B.atk;
      this.stepHeartBody(match);
    }
  }
  /** The heart floats toward where it wants to be, beats (faster as it weakens), blinks its eyes and watches the nearest player. */
  stepHeartBody(match) {
    const S = this.heartS; if (!S) return;
    const B = this.boss, k = B ? 1 - B.hp / (B.max * 0.5) : 0, rate = 0.05 + Math.max(0, k) * 0.05 + (this.low ? 0.03 : 0);
    if (!S.hold) { S.tx = HEART.x + Math.sin(this.t * 0.011) * HEART.drift; S.ty = HEART.y + Math.sin(this.t * 0.023) * HEART.bob; }
    S.x += (S.tx - S.x) * (S.fast || HEART.ease); S.y += (S.ty - S.y) * (S.fast || HEART.ease);
    S.beat += rate; S.open += ((S.tgtOpen ?? 1) - S.open) * 0.15;
    const tg = match && this.nearest(match, S.x);
    if (tg) { const dx = tg.x - S.x, dy = tg.y - 30 - S.y, d = Math.hypot(dx, dy) || 1; S.look.x = lerp(S.look.x, dx / d, 0.1); S.look.y = lerp(S.look.y, dy / d, 0.1); }
    S.blink = S.blink.map((b, i) => { b--; if (b <= 0) b = 90 + ((i * 37 + this.t) % 120); return b; });
    S.lid = S.lid.map((l, i) => (S.popped.includes(i) ? 0 : S.blink[i] < 8 ? 0.1 : Math.min(1, l + 0.2)));
  }
  /** How hard the heart beats right now (0..1): a double thump, like a real one. */
  beatK() { const S = this.heartS, q = (S.beat % (Math.PI * 2)) / (Math.PI * 2); return Math.max(0, 1 - Math.abs(q - 0.08) * 14) + 0.6 * Math.max(0, 1 - Math.abs(q - 0.24) * 14); }

  /** Where the heart can be hurt: the great eye (x1.6 while open, more while it lies stunned) and its body. */
  heartHurt() {
    const S = this.heartS; if (!S || this.headless !== 'inside') return [];
    const st = S.stunned ? SLAM.stun : 1, out = [];
    if (S.open > 0.4) out.push({ x1: S.x - 24, y1: S.y - 16, x2: S.x + 24, y2: S.y + 16, mult: HEART.eye * st, eye: true });
    out.push({ x1: S.x - HEART.r - 12, y1: S.y - HEART.r - 8, x2: S.x + HEART.r + 12, y2: S.y + HEART.r + 18, mult: HEART.body * st });
    return out;
  }
  /** What it does next: its attacks, VOID STORM added in THE LAST LIGHT, HEART SLAM often when someone is on the floor right under it. */
  heartPattern() {
    const list = ['hbolts', 'hlash', 'hpulse', 'hgaze', 'hgrasp', 'hslam', 'hslam'];
    if (this.low) list.push('hstorm', 'hbolts', 'hslam');
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
    const S = this.heartS, n = BOLT.n[this.low ? 1 : 0], warm = this.sp(BOLT.warm);
    S.hold = false; S.charge = Math.min(1, a.t / warm);
    if (a.t === 1) { sfx('summon', 0.7, 1.4); a.order = HEART.eyes.map((_, i) => i).filter((i) => !S.popped.includes(i)); }
    if (a.t >= warm && (a.t - warm) % BOLT.every === 0) {
      const i = (a.t - warm) / BOLT.every; if (i >= n) { S.charge = 0; return a.t > warm + n * BOLT.every + 20; }
      const e = HEART.eyes[a.order[i % Math.max(1, a.order.length)]] || [0, 0], x = S.x + e[0], y = S.y + e[1], tg = this.nearest(match, x);
      const tx = tg ? tg.x : 0, ty = tg ? tg.y - 24 : 0, d = Math.hypot(tx - x, ty - y) || 1, sp = BOLT.speed * (this.low ? 1.15 : 1);
      this.bolts.push({ x, y, vx: (tx - x) / d * sp, vy: (ty - y) / d * sp, t: 0, id: this.sid('bolt'), home: this.low, trail: [] });
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
      if (this.low) this.lashes.push({ s: -this.lashes[this.lashes.length - 1].s, y: y === LASH.ys[0] ? LASH.ys[1] : LASH.ys[0], t: -40, x: 0, id: this.sid('lash') });
    }
    return a.t > this.sp(LASH.warn) + 80 && !this.lashes.length;
  }
  /** HEARTBEAT: it squeezes tight, then BEATS - a ring of dark force bursts out of it with a gap or two to slip through. */
  atk_hpulse(match, a) {
    const S = this.heartS, sq = this.sp(PULSE.squeeze), beats = PULSE.beats[this.low ? 1 : 0];
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
      for (let i = 0; i < (this.low ? 3 : 1); i++) xs.push((Math.random() * 2 - 1) * 230);
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
    S.hold = true; S.tx = 0; S.ty = HEART.y - 10; S.tgtOpen = 1.3; S.beat += 0.12; this.stepHeartBody(match);
    if (t % 30 === 0) { sfx('laugh', 0.5, 0.45); S.bump = 1; }
  }
  /**
   * Its death: it thrashes, its eyes burst one by one in sprays of light, cracks of light split it open, it caves in on
   * itself - and at the white flash you're back outside, under the sky, as the stars come home. Returns true while it's
   * handled here; at the flash it puts you outside and hands over to his own death (`flash` = DIE.flash) by returning false.
   */
  heartDeath(match, flash) {
    const B = this.boss, d = B.dying, S = this.heartS; if (!S) return false;
    S.hold = true; S.stunned = false; S.tx = 0; S.ty = HEART.y; S.fast = 0.05; this.stepHeartBody(match);
    if (d < HDIE.implode) {
      S.shake = 3 + d * 0.05; S.beat += 0.15;
      const left = HEART.eyes.map((_, i) => i).filter((i) => !S.popped.includes(i));
      if (d % HDIE.pop === 0 && left.length) {
        const i = left[Math.floor(Math.random() * left.length)], e = HEART.eyes[i]; S.popped.push(i);
        sfx('glass', 0.8, 1 + Math.random() * 0.4); sfx('hit', 0.6, 0.6); match.shake(6, 8);
        for (let k = 0; k < 14; k++) { const q = Math.random() * Math.PI * 2, v = 1 + Math.random() * 4; match.particles.push({ x: S.x + e[0], y: S.y + e[1], vx: Math.cos(q) * v, vy: Math.sin(q) * v, life: 26, color: [P.eye[2], P.glow[2], 0xffffff][k % 3], size: 3, drag: 0.93 }); }
      }
      if (d === 20) match.popText({ x: S.x, y: S.y - 80 }, 'THE STARS... THEY\'RE LEAVING...', '#e0d4ff');
      if (d % 18 === 0) { sfx('rumble', 0.7, 0.5 + d * 0.004); }
      S.crackK = Math.min(1, d / HDIE.implode);
    } else if (d < flash) {
      const k = (d - HDIE.implode) / (flash - HDIE.implode);
      S.s = Math.max(0.02, 1 - k * k); S.shake = 6 * (1 - k); S.tgtOpen = 0;
      if (d === HDIE.implode) { sfx('summon', 1, 0.35); sfx('roar', 1, 0.4); }
      if (d % 5 === 0) { const q = Math.random() * Math.PI * 2; match.particles.push({ x: S.x + Math.cos(q) * 260, y: S.y + Math.sin(q) * 180, vx: -Math.cos(q) * 9, vy: -Math.sin(q) * 6, life: 28, color: [0xffffff, P.glow[2], P.star[1]][d % 3], size: 2 }); }
    }
    if (d >= flash - 1) {                                                             // the flash: outside again, his body gone, the stars come home
      this.inside = false; this.heartG.setVisible(false); this.innerG.setVisible(false);
      for (const o of this.outLayers()) o.setVisible(true);
      this.v.sink = 0; this.v.slump = 0; this.v.vis = 0; this.v.scale = 0; this.ecl = 0;
      B.dying = flash; return false;
    }
    return true;
  }

  // ------------------------------------------------------------------ drawing
  /**
   * The cavern inside him (painted once): the dark of the void deepening toward the middle, the stars he swallowed
   * stuck in its walls (dim - they twinkle on the live layer), great obsidian ribs traced in gold arching over from a
   * spine, a floor of black membrane veined with violet on the same footprint as the observatory's, and two rib bones
   * where the ledges are, held by sinews.
   */
  paintInner(g) {
    g.fillStyle(P.void[0], 1); g.fillRect(-1400, -1100, 2800, 2200);
    for (let i = 0; i < 9; i++) { g.fillStyle(P.void[Math.min(4, 1 + Math.floor(i / 2))], 0.5); g.fillEllipse(0, -170, 1400 - i * 140, 900 - i * 90); }
    const R = seeded(41);
    for (let i = 0; i < 18; i++) { g.fillStyle([P.glow[0], P.vein[1], 0x2a4aba][i % 3], 0.05 + R() * 0.05); g.fillEllipse(-700 + R() * 1400, -480 + R() * 520, 200 + R() * 260, 70 + R() * 110); }
    // the spine at the top, and the ribs arching down from it either side
    g.fillStyle(P.out, 1); g.fillRect(-26, -900, 52, 560); g.fillStyle(P.bone[2], 1); g.fillRect(-20, -900, 40, 560);
    for (let y = -880; y < -340; y += 36) { g.fillStyle(P.out, 1); g.fillEllipse(0, y, 70, 24); g.fillStyle(P.bone[3], 1); g.fillEllipse(0, y - 2, 62, 18); g.fillStyle(P.gold[2], 1); g.fillRect(-30, y - 1, 60, 2); }
    for (let i = 0; i < 6; i++) {
      for (const s of [-1, 1]) {
        const y0 = -400 + i * 34, pts = [];
        for (let k = 0; k <= 24; k++) { const q = k / 24; pts.push({ x: s * (24 + Math.sin(q * Math.PI * 0.55) * (300 + i * 26)), y: y0 + q * q * (330 - i * 22) - Math.sin(q * Math.PI) * 60 }); }
        g.lineStyle(30 - i * 2, P.out, 1); g.strokePoints(pts); g.lineStyle(24 - i * 2, P.bone[1 + (i % 2)], 1); g.strokePoints(pts);
        g.lineStyle(3, P.gold[1], 0.85); g.strokePoints(pts.map((p) => ({ x: p.x, y: p.y - (9 - i) }))); g.lineStyle(1, P.gold[3], 0.5); g.strokePoints(pts.map((p) => ({ x: p.x, y: p.y - (10 - i) })));
      }
    }
    g.lineStyle(0);
    // the floor: black membrane on the same footprint as the observatory floor, with ragged dark tissue hanging below it
    const x1 = this.platforms[0].x1, x2 = this.platforms[0].x2;
    const hang = [[x1 - 4, 50], [x1 + 30, 110], [-160, 140], [-90, 200], [-20, 160], [40, 240], [110, 170], [180, 130], [x2 - 24, 104], [x2 + 4, 50]];
    g.fillStyle(P.out, 1); g.fillPoints([{ x: x1 - 6, y: 40 }, ...hang.map(([x, y]) => ({ x, y: y + 4 })), { x: x2 + 6, y: 40 }], true);
    g.fillStyle(P.shade[2], 1); g.fillPoints([{ x: x1 - 2, y: 40 }, ...hang.map(([x, y]) => ({ x, y })), { x: x2 + 2, y: 40 }], true);
    for (let i = 0; i < hang.length - 1; i++) { g.fillStyle(P.vein[0], 0.8); g.fillTriangle(hang[i][0], 44, hang[i + 1][0], 44, (hang[i][0] + hang[i + 1][0]) / 2, (hang[i][1] + hang[i + 1][1]) / 2 - 24); }
    g.fillStyle(P.out, 1); g.fillRect(x1 - 4, -3, x2 - x1 + 8, 50);
    g.fillStyle(P.shade[3], 1); g.fillRect(x1, 4, x2 - x1, 40);
    g.lineStyle(1.5, P.vein[1], 0.9); for (let i = 0; i < 16; i++) { let x = x1 + R() * (x2 - x1), y = 6; for (let k = 0; k < 4; k++) { const nx = x + (R() - 0.5) * 50, ny = y + 9; g.lineBetween(x, y, nx, ny); x = nx; y = ny; } } g.lineStyle(0);
    g.fillStyle(P.bone[3], 1); g.fillRect(x1, 0, x2 - x1, 5); g.fillStyle(P.gold[2], 1); g.fillRect(x1, 4, x2 - x1, 1); g.fillStyle(P.glow[1], 0.6); g.fillRect(x1, 0, x2 - x1, 1);
    // the two rib-bone ledges, held up by sinews
    for (const p of this.platforms.slice(1)) {
      const cx = (p.x1 + p.x2) / 2, w = p.x2 - p.x1;
      for (const dx of [-30, 0, 30]) { g.lineStyle(4, P.vein[0], 1); g.lineBetween(cx + dx, p.y + 10, cx + dx * 2.4, p.y - 260); g.lineStyle(1.5, P.vein[1], 0.8); g.lineBetween(cx + dx, p.y + 10, cx + dx * 2.4, p.y - 260); }
      g.lineStyle(0);
      g.fillStyle(P.out, 1); g.fillRoundedRect(p.x1 - 6, p.y - 4, w + 12, 16, 7); g.fillStyle(P.bone[2], 1); g.fillRoundedRect(p.x1 - 3, p.y - 1, w + 6, 10, 5);
      g.fillStyle(P.bone[3], 1); g.fillRect(p.x1, p.y, w, 2); g.fillStyle(P.gold[2], 1); g.fillRect(p.x1 + 4, p.y + 6, w - 8, 1);
      for (const ex of [p.x1 - 2, p.x2 + 2]) { g.fillStyle(P.out, 1); g.fillCircle(ex, p.y + 4, 10); g.fillStyle(P.bone[3], 1); g.fillCircle(ex, p.y + 3, 7); }
    }
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
    this.drawHeartFx(g, true);
    this.drawCorruptedHeart(g, S, bk);
    this.drawHeartFx(g, false);
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
    const Rc = seeded(23), n = 6 + Math.floor((S.crackK || 0) * 10) + (this.low ? 3 : 0);
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
      const ic = this.low ? P.eye[3] : 0xffd040; g.fillStyle(ic, 0.3); g.fillCircle(x + L.x * rr * 0.4, y + L.y * rr * 0.3, rr * 0.95);
      g.fillStyle(ic, 1); g.fillCircle(x + L.x * rr * 0.4, y + L.y * rr * 0.3, rr * 0.58);
      g.fillStyle(0x000000, 1); g.fillEllipse(x + L.x * rr * 0.45, y + L.y * rr * 0.35, rr * 0.28, rr * 0.9);
      if ((S.charge || 0) > 0) { g.fillStyle(P.glow[2], 0.5 * S.charge); g.fillCircle(x, y, rr * (1.4 + S.charge)); }
    });
    // the great eye
    const o = Math.max(0, Math.min(1.3, S.open)), ew = 34 * sc, eh = 20 * sc * o;
    g.fillStyle(P.eye[0], 1); g.fillEllipse(cx, cy, ew * 2 + 6, Math.max(5, eh * 2 + 6));
    if (o > 0.08) {
      g.fillStyle(0xd8b8b0, 1); g.fillEllipse(cx, cy, ew * 2, eh * 2); g.fillStyle(P.eye[1], 0.35); g.fillEllipse(cx, cy + eh * 0.45, ew * 1.9, eh); g.fillStyle(P.eye[0], 0.5); for (const sx of [-1, 1]) g.fillEllipse(cx + sx * ew * 0.82, cy, ew * 0.5, eh * 1.4);
      g.lineStyle(1, P.eye[2], 0.8); const Rv = seeded(7); for (let k = 0; k < 9; k++) { const sx = Rv() < 0.5 ? -1 : 1, y0 = cy + (Rv() - 0.5) * eh; let px = cx + sx * ew * 0.95, py = y0; for (let s = 0; s < 3; s++) { const nx = px - sx * ew * (0.12 + Rv() * 0.08), ny = py + (Rv() - 0.5) * 6; g.lineBetween(px, py, nx, ny); px = nx; py = ny; } } g.lineStyle(0);   // bloodshot
      const ix = cx + L.x * ew * 0.35, iy = cy + L.y * eh * 0.3, ir = Math.min(eh, 15 * sc);
      g.fillStyle(P.eye[1], 1); g.fillCircle(ix, iy, ir); g.fillStyle(P.eye[2], 1); g.fillCircle(ix, iy, ir * 0.8);
      for (let k = 0; k < 10; k++) { const q = k / 10 * Math.PI * 2; g.lineStyle(1, P.eye[3], 0.7); g.lineBetween(ix + Math.cos(q) * ir * 0.35, iy + Math.sin(q) * ir * 0.35, ix + Math.cos(q) * ir * 0.8, iy + Math.sin(q) * ir * 0.8); }
      g.lineStyle(0);
      const slit = this.gaze && this.gaze.st !== 'aim' ? 0.18 : 0.32;
      g.fillStyle(0x000000, 1); g.fillEllipse(ix, iy, ir * slit * 2, ir * 1.7);
      g.fillStyle(0xffffff, 0.85); g.fillCircle(ix - ir * 0.35, iy - ir * 0.4, ir * 0.18);
      g.lineStyle(2, P.vein[1], 0.9); for (const sx of [-1, 1]) g.lineBetween(cx + sx * ew * 0.95, cy, cx + sx * ew * 0.55, cy + sx * eh * 0.3); g.lineStyle(0);
    } else { g.lineStyle(2, P.glow[1], 0.9); g.lineBetween(cx - ew, cy, cx + ew, cy); g.lineStyle(0); }
    if (S.stunned) for (let i = 0; i < 3; i++) { const q = t * 0.12 + i * 2.1; this.drawSpark(g, cx + Math.cos(q) * r * 0.9, cy - r - 10 + Math.sin(q) * 6); }
    if (flash) { g.fillStyle(0xffffff, 0.3); g.fillPoints(shape(1), true); }
  }
  /** A little dizzy star (over the stunned heart). */
  drawSpark(g, x, y) { g.fillStyle(P.star[1], 1); g.fillTriangle(x - 4, y, x + 4, y, x, y - 6); g.fillTriangle(x - 4, y - 3, x + 4, y - 3, x, y + 3); }
  /** The heart's attacks: behind = the warnings under it (lash lines, claw marks, the gaze's aim), else the bolts, rings, claws, beam and waves in front. */
  drawHeartFx(g, behind) {
    const t = this.t, warn = this.sp(LASH.warn), gw = this.sp(GRASP.warn);
    if (behind) {
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
    if (!this.headless || this.inside) return;
    const pul = 0.6 + 0.4 * Math.sin(t * 0.1);
    g.fillStyle(P.glow[1], 0.15 * pul); g.fillEllipse(x, y, 160, 60);
    if (this.headless === 'neck') for (let i = 0; i < 5; i++) { const bx = x + (i - 2) * 14, a = 0.12 + 0.1 * Math.sin(t * 0.08 + i); g.fillStyle(P.glow[2], a); g.fillTriangle(bx - 8, y, bx + 8, y, bx + (i - 2) * 10, y - 200); }
    g.fillStyle(P.out, 1); g.fillEllipse(x, y, 96, 34);
    for (let i = 0; i < 14; i++) { const q = i / 14 * Math.PI * 2; g.fillStyle(i % 2 ? 0x1a1630 : 0x2e2852, 1); g.fillTriangle(x + Math.cos(q - 0.2) * 44, y + Math.sin(q - 0.2) * 15, x + Math.cos(q + 0.2) * 44, y + Math.sin(q + 0.2) * 15, x + Math.cos(q) * (54 + (i % 3) * 5), y + Math.sin(q) * (19 + (i % 3) * 2)); }
    g.fillStyle(0x000000, 1); g.fillEllipse(x, y, 80, 26);
    for (let i = 0; i < 4; i++) { g.fillStyle([P.glow[0], P.vein[1], P.glow[1], 0x000000][i], 0.9); g.fillEllipse(x + Math.sin(t * 0.07 + i) * 4, y + Math.cos(t * 0.07 + i) * 1.5, 70 * (1 - i * 0.22), 22 * (1 - i * 0.22)); }
    g.lineStyle(2, P.glow[2], 0.7 * pul); g.strokeEllipse(x, y, 80, 26); g.lineStyle(0);
    if (this.headless === 'neck') {                                                    // a bobbing arrow: in here
      const ay = y - 70 + Math.sin(t * 0.12) * 6; g.fillStyle(P.out, 1); g.fillTriangle(x - 13, ay - 3, x + 13, ay - 3, x, ay + 15); g.fillStyle(P.star[1], 1); g.fillTriangle(x - 10, ay - 1, x + 10, ay - 1, x, ay + 12);
    }
  }
}

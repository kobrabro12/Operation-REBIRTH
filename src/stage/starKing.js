// VESPERION's last act - THE STAR KING (mixed into StarBossStage, src/stage/starBossStage.js, after starHeart.js).
// Spat out of his mouth when his heart's eye shatters, you watch him rise: his body heaves itself back up, his hand
// reaches down, picks his head up off the floor and SPINS IT ON ONE FINGER like a basketball - faster and faster,
// sparks flying - and as it spins his face changes: three burning slit eyes, a grin full of star-fangs, cracks of red
// light. He tosses it up, it lands back on his neck - BOOM - and a giant crown of gems grows out of his head. His own
// name card: THE STAR KING. Then the fight: no shield any more (his chest is an open wound where the heart was, his
// head is the weak spot), and new attacks: POWER UP (he lays his hands on the crown and it blazes; for a while his
// attacks hit harder and come quicker - hit his chest while he charges), CROWN BEAM (the great gem aims, locks and
// fires a prism beam; powered, it sweeps along the floor) and CROWN THROW (he hurls the crown like a buzzsaw: out low
// across the floor, back high at ledge height; his bare head takes double meanwhile), plus his slams, sweeps, planet
// and crescent moons. Below MOLT's last tenth, THE LAST LIGHT: powered for good.
// His death - THE STARS COME HOME: his head swells with molten light and EXPLODES in a ball of fire like lava; the
// lava runs down him and slowly melts his body into a glowing pool, and out of it every star he swallowed rises home -
// SOMEWHERE IN THE STARS (the mega trophy for beating him: TROPHY_GOALS in src/achievements.js).
import { sfx } from '../audio/sfx.js';

const K = {
  out: 0x05030c, gold: [0x7a4a10, 0xb8801e, 0xe8b440, 0xfff0a0], gem: [0x8a5aff, 0x5ae8ff, 0xff5ad0, 0xc8f8ff], fire: [0xff2a10, 0xff7a1a, 0xffc040, 0xfff4c0],
  lava: [0x8a1a08, 0xd84a10, 0xff8a1a, 0xffd060, 0xfff8d0], blood: [0x2a0000, 0xff1a1a, 0xffe0a0],
};
// his head's radius and where it sits on his neck (BODY in starBossStage.js): the height, and how much lower per slump
const HEAD = { r: 44, y: -255, slump: 80 };
// THE CROWNING (cutscene frames): rising, reaching for the head, the grab, lifting it, spinning it (the face turning
// evil part way through), the toss, back on the neck, the crown growing, the end
const CROWN = { rise: 60, reach: 66, grab: 104, lift: 150, spin: 252, evil: [196, 236], land: 282, grow: [286, 332], n: 372 };
// THE STAR KING: how far he leans in (slump), how much his chest wound / head / hands take, his bare head (crown thrown), his chest while he powers up
const KING = { slump: 0.6, chest: 1.6, head: 1.8, hands: 0.6, bare: 2.4, charge: 2.6 };
// POWER UP: the charge, how long the power lasts, how much harder and quicker he is meanwhile
const POWER = { charge: 80, time: 480, dmg: 1.2, fast: 1.2 };
// CROWN BEAM: aiming, locked, firing, beam width, a fresh strike every `tick`, how far a powered beam sweeps, hit
const CBEAM = { aim: 56, lock: 14, fire: 40, w: 16, tick: 8, sweep: 300, hit: [5, [70, 4, 0.35]] };
// CROWN THROW: the wind-up, one loop's frames, the crown's hit size, how far it flies, its low point, the loop's swing, hit
const CTHROW = { wind: 30, fly: 104, r: 34, reach: 250, low: -28, swing: 72, hit: [11, [50, 5.4, 0.65]] };
// his death: the head exploding, the melt (start, end), the stars rising, the end
const MOLT = { boom: 80, melt: [96, 380], stars: 396, len: 560 };
// how big his crown is on his head (x its drawing)
const CROWN_SZ = 1.35;
// the part of his health where THE LAST LIGHT starts (powered for good)
const LAST = 0.1;

const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const seeded = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

/** VESPERION's crowning, THE STAR KING's attacks and his molten death: methods attached to StarBossStage.prototype. */
export class KingPhase {
  // ------------------------------------------------------------------ THE CROWNING
  /** Where his head sits on his neck right now. */
  headHome() { return { x: this.v.x, y: HEAD.y + HEAD.slump * this.v.slump }; }
  /** After the escape from his heart: the crowning, as a cutscene (crownStep) or, without anyone watching, at once. */
  startCrowning(match) {
    this.headless = 'crowning';
    if (this.watched && this.uiG) {
      const cam = match.worldCam || match.cameras.main;
      this.cut = { kind: 'crown', t: 0, n: CROWN.n, once: new Set(), armed: false };
      this.ccam = { x: cam.midPoint.x, y: cam.midPoint.y, zoom: cam.zoom };
      return;
    }
    this.crownNow(match);
  }
  /**
   * THE CROWNING: his body heaves itself back up; his right hand reaches down and closes on his head; he lifts it, turns
   * his hand over and spins it on one finger like a basketball, faster and faster - sparks fly, and as it whirls his face
   * turns evil (flash, flash); he tosses it up, it drops back onto his neck - BOOM - and a giant crown of gems grows
   * out of it: NOW... I AM WHOLE. Then his name card.
   */
  crownStep(match) {
    const C = this.cut, t = ++C.t, v = this.v, F = this.headFall, h = this.hands[1], o = this.hands[0];
    const once = (k, at) => t >= at && !C.once.has(k) && !!C.once.add(k);
    v.sink = 1 - ease(t / CROWN.rise); v.slump = lerp(1, KING.slump, ease(t / CROWN.rise)); v.eye = 0; v.mouth *= 0.95; this.mawBig *= 0.95;
    if (once('rise', 1)) { sfx('rumble', 1, 0.4); sfx('roar', 0.7, 0.35); }
    if (t < CROWN.rise && t % 10 === 0) match.shake(4, 10);
    o.tx = -170; o.ty = -190; o.ta = -0.3; o.tf = 0.3; o.fast = 0.08;
    if (t < CROWN.reach) { h.tx = 170; h.ty = -190; h.ta = 0.3; h.tf = 0.2; C.shot = { x: 0, y: -150, zoom: 0.9 }; }
    else if (t < CROWN.grab) { h.tx = F.x; h.ty = F.y - 40; h.ta = Math.PI; h.tf = 0.1; h.fast = 0.1; C.shot = { x: F.x - 40, y: F.y - 40, zoom: 1.4 }; }
    else if (t < CROWN.lift) {
      if (once('grab', CROWN.grab)) { h.tf = 1; sfx('clang', 0.9, 0.5); match.shake(5, 8); }
      const k = ease((t - CROWN.grab) / (CROWN.lift - CROWN.grab)); h.tx = lerp(F.x, 150, k); h.ty = lerp(F.y - 40, -210, k); h.ta = lerp(Math.PI, 0, k); h.fast = 0.2;
      F.x = h.x; F.y = h.y + 36 - 70 * k; this.headSpin = (this.headSpin || 0) * 0.9;
      C.shot = { x: 120, y: -180, zoom: 1.25 };
    } else if (t < CROWN.spin) {                                                        // spinning it on one finger
      const k = (t - CROWN.lift) / (CROWN.spin - CROWN.lift);
      h.tx = 150 + Math.sin(t * 0.2) * 4; h.ty = -200; h.ta = 0; h.tf = 0.7;
      F.x = h.x + Math.sin(t * 0.5) * 3 * k; F.y = h.y - 72;
      this.spinV = Math.min(0.62, (this.spinV || 0) + 0.012); this.headSpin = (this.headSpin || 0) + this.spinV;
      if (t % Math.max(4, Math.round(14 - k * 10)) === 0) sfx('whoosh', 0.5, 0.8 + k * 0.9);
      if (t % 2 === 0) { const q = Math.random() * Math.PI * 2; match.particles.push({ x: F.x + Math.cos(q) * HEAD.r, y: F.y + Math.sin(q) * HEAD.r, vx: -Math.sin(q) * 5, vy: Math.cos(q) * 5, life: 18, color: [K.fire[3], K.gem[0], 0xffffff][t % 3], size: 2 }); }
      v.evil = ease((t - CROWN.evil[0]) / (CROWN.evil[1] - CROWN.evil[0]));
      if (once('e1', CROWN.evil[0])) { this.whiteT = 6; sfx('bighit', 0.7, 0.7); }
      if (once('e2', CROWN.evil[0] + 22)) { this.whiteT = 6; sfx('bighit', 0.8, 0.55); sfx('laugh', 0.6, 0.5); }
      C.shot = { x: F.x - 20, y: F.y + 10, zoom: 1.5 + k * 0.4 };
    } else if (t < CROWN.land) {                                                        // the toss, back onto his neck
      if (once('toss', CROWN.spin)) { sfx('whoosh', 1, 0.5); C.from = { x: F.x, y: F.y }; }
      const k = (t - CROWN.spin) / (CROWN.land - CROWN.spin), home = this.headHome();
      F.x = lerp(C.from.x, home.x, k); F.y = lerp(C.from.y, home.y, k) - Math.sin(k * Math.PI) * 120;
      this.spinV *= 0.9; this.headSpin += this.spinV; h.tx = 210; h.ty = -170; h.tf = 0.3;
      C.shot = { x: 40, y: -200, zoom: 1.1 };
    } else {
      if (once('land', CROWN.land)) {
        this.headFall = null; this.headSpin = 0; this.spinV = 0; v.evil = 1; v.eye = 1; v.corona = 1; v.mouth = 0; this.mawBig = 0; this.whiteT = 12;
        sfx('bighit', 1, 0.4); sfx('roar', 1, 0.45); sfx('thunder', 0.8, 0.8); match.shake(18, 26);
      }
      this.crownK = ease((t - CROWN.grow[0]) / (CROWN.grow[1] - CROWN.grow[0])); this.crownGlow = this.crownK;
      if (t >= CROWN.grow[0] && t < CROWN.grow[1] && t % 8 === 0) sfx('shing', 0.6, 0.6 + this.crownK);
      if (once('say', CROWN.grow[1] - 10)) { match.popText({ x: 0, y: this.headHome().y - 140 }, 'NOW... I AM WHOLE.', '#ffb090'); sfx('laugh', 0.8, 0.45); }
      const sp = ease((t - CROWN.grow[1]) / 30); this.hands.forEach((q) => { q.tx = q.side * lerp(190, 240, sp); q.ty = lerp(-190, -250, sp); q.ta = q.side * 0.7 * sp; q.tf = 0; q.glow = sp; });
      const H = this.headHome(); C.shot = { x: H.x, y: H.y + 30, zoom: 1.3 };
    }
    if (t >= C.n) { this.cut = null; if (this.uiG) this.uiG.clear(); this.crownNow(match); this.kingCard(match); }
  }
  /** The crowning's end state: THE STAR KING, whole, crowned and ready (the fight resumes). */
  crownNow(match) {
    const v = this.v, B = this.boss;
    Object.assign(this, { crowned: true, headless: null, headFall: null, headSpin: 0, spinV: 0, crownK: 1, crownGlow: 0, mawBig: 0, headGone: false, kingN: 0, powered: 0 });
    Object.assign(v, { evil: 1, sink: 0, slump: KING.slump, eye: 1, corona: 1, mouth: 0, vis: 1, shell: 0 });
    this.restHands(); B.atk = null; B.wait = 70;
    this.barName.setText('VESPERION, THE STAR KING');
    if (match && match.particles) match.particles.length = 0;
  }
  /** THE STAR KING's own name card (bossBase.startCard; nothing without a player watching). */
  kingCard(match) {
    if (!this.watched || !this.startCard) return;
    this.startCard(match, { name: 'THE STAR KING', title: 'CROWNED IN STOLEN LIGHT', tag: '-  BOSS VIII : FINAL FORM  -' });
  }

  // ------------------------------------------------------------------ THE STAR KING
  /** How far he leans in as THE STAR KING (his slump). */
  kingSlump() { return KING.slump; }
  /** How much harder his hits land right now (POWER UP). */
  kingDmg() { return this.powered > 0 ? POWER.dmg : 1; }
  /** How much quicker his wind-ups are right now (POWER UP). */
  kingSpeed() { return this.powered > 0 ? POWER.fast : 1; }
  /** Where the crown's great gem is (the beam comes out of it). */
  gemAt() { const H = this.joints().head; return { x: H.x, y: H.y - HEAD.r + 6 - 30 * CROWN_SZ }; }
  /** Where he can be hurt: the open wound in his chest (more while he powers up), his head (more with the crown off), his hands a little. */
  kingHurt() {
    const j = this.joints(), out = [];
    out.push({ x1: j.heart.x - 54, y1: j.heart.y - 50, x2: j.heart.x + 54, y2: j.heart.y + 66, mult: this.charging ? KING.charge : KING.chest, heart: true });
    out.push({ x1: j.head.x - 44, y1: j.head.y - 44, x2: j.head.x + 44, y2: j.head.y + 42, mult: this.crownOff ? KING.bare : KING.head });
    for (const h of this.hands) out.push({ x1: h.x - 28, y1: h.y - 30, x2: h.x + 28, y2: h.y + 28, mult: KING.hands });
    return out;
  }
  /** His attacks as THE STAR KING: POWER UP when it's worn off (every fifth or so), else beams, throws, slams, sweeps, the planet and the moons. */
  kingPattern() {
    if (!(this.powered > 0) && this.kingN % 5 === 1) return ['power'];
    return ['slam', 'sweep', 'cbeam', 'cthrow', 'planet', 'moons', 'cbeam', 'cthrow', 'slam'];
  }
  /** Every frame as THE STAR KING: counts his attacks, runs the power down, THE LAST LIGHT, his crown's glow. */
  stepKing(match) {
    const B = this.boss;
    if (!this.kWas && B.atk) this.kingN = (this.kingN || 0) + 1;
    this.kWas = !!B.atk;
    if (this.powered > 0) this.powered--;
    if (!this.charging && !(B.atk && B.atk.name === 'cbeam')) this.crownGlow = Math.max(this.powered > 0 ? 0.6 : 0, (this.crownGlow || 0) * 0.95);
    if (!this.kingLast && B.hp <= B.max * LAST) { this.kingLast = true; this.powered = 1e9; match.popText({ x: 0, y: -330 }, 'THE LAST LIGHT - HE BURNS!', '#ff9a6a'); sfx('roar', 1, 0.4); }
    if (this.powered > 0 && this.t % 3 === 0) { const H = this.joints().head, q = Math.random() * Math.PI * 2; match.particles.push({ x: H.x + Math.cos(q) * 70, y: H.y + Math.sin(q) * 60, vx: 0, vy: -1.5 - Math.random() * 2, life: 30, color: K.fire[this.t % 4], size: 2 }); }
  }
  /** POWER UP: he lays both hands on his crown; light pours into it (hit his chest now - it takes double); then it BLAZES, and for POWER.time his attacks hit harder and come quicker. */
  atk_power(match, a) {
    const charge = this.sp(POWER.charge), H = this.joints().head;
    if (a.t === 1) { this.charging = true; match.popText({ x: H.x, y: H.y - 140 }, 'POWER UP', '#ffd040'); sfx('summon', 1, 0.5); }
    this.hands.forEach((h) => { h.tx = H.x + h.side * 64; h.ty = H.y - 34; h.ta = -h.side * 0.6; h.tf = 0.2; h.glow = 1; h.fast = 0.1; });
    this.crownGlow = Math.min(1.5, a.t / charge * 1.5);
    if (a.t < charge && a.t % 2 === 0) { const q = Math.random() * Math.PI * 2, G = this.gemAt(); match.particles.push({ x: G.x + Math.cos(q) * 160, y: G.y + Math.sin(q) * 120, vx: -Math.cos(q) * 6, vy: -Math.sin(q) * 4.5, life: 26, color: [K.gem[1], K.fire[2], 0xffffff][a.t % 3], size: 2 }); }
    if (a.t < charge && a.t % 12 === 0) sfx('rumble', 0.5, 0.8 + a.t / charge);
    if (a.t === charge) {
      this.charging = false; this.powered = Math.max(this.powered, POWER.time); this.whiteT = 8;
      sfx('bighit', 1, 0.4); sfx('roar', 1, 0.5); sfx('flame', 1, 0.6); match.shake(14, 20);
      const G = this.gemAt(); for (let i = 0; i < 40; i++) { const q = i / 40 * Math.PI * 2; match.particles.push({ x: G.x, y: G.y, vx: Math.cos(q) * 7, vy: Math.sin(q) * 7, life: 30, color: K.fire[i % 4], size: 3, drag: 0.94 }); }
      match.popText({ x: H.x, y: H.y - 150 }, 'THE CROWN BURNS!', '#ff7a3a');
    }
    if (a.t > charge + 30) { this.charging = false; return true; }
    return false;
  }
  /** CROWN BEAM: the great gem in his crown glows and a thin gold line tracks you; it locks - then a prism beam fires down it (powered: sweeping along the floor). */
  atk_cbeam(match, a, out) {
    const aim = this.sp(CBEAM.aim), lock = aim + CBEAM.lock, fire = lock + CBEAM.fire, G = this.gemAt(), tg = this.nearest(match, G.x);
    if (a.t === 1) { a.px = tg ? tg.x : 0; a.py = tg ? tg.y - 20 : 0; a.dir = a.px > G.x ? -1 : 1; sfx('warn', 0.8, 0.9); }
    if (a.t < aim && tg) { a.px = lerp(a.px, tg.x, 0.1); a.py = lerp(a.py, tg.y - 20, 0.1); }
    if (a.t > lock && a.t < fire && this.powered > 0) { a.px += a.dir * CBEAM.sweep / CBEAM.fire; a.py = lerp(a.py, -10, 0.2); }
    this.crownGlow = a.t < lock ? 0.5 + a.t / lock : 1.5;
    const dx = a.px - G.x, dy = a.py - G.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    this.cbeam = { x: G.x, y: G.y, ux, uy, st: a.t < aim ? 'aim' : a.t < lock ? 'lock' : a.t < fire ? 'fire' : 'off' };
    if (a.t === lock) sfx('ding', 0.7, 0.6);
    if (a.t === lock + 1) { sfx('laser', 1, 0.5); sfx('shing', 0.9, 0.5); match.shake(8, CBEAM.fire); }
    if (a.t > lock && a.t < fire) {
      const id = 'cb' + a.id + '-' + Math.floor(a.t / CBEAM.tick);
      for (let s = 20; s < 760; s += 22) { const x = G.x + ux * s, y = G.y + uy * s; if (y > 8) break; out.push(this.bhit(id, x - CBEAM.w, y - CBEAM.w, x + CBEAM.w, y + CBEAM.w, ...CBEAM.hit, { dirX: Math.sign(ux) || 1 })); }
    }
    if (a.t >= fire) { this.cbeam = null; return true; }
    return false;
  }
  /** CROWN THROW: he takes his crown off and hurls it like a buzzsaw - out low along the floor, back high at ledge height (twice when powered); his bare head takes double till it's back. */
  atk_cthrow(match, a, out) {
    const wind = this.sp(CTHROW.wind), H = this.joints().head, h = this.hands[1];
    if (a.t === 1) { const tg = this.nearest(match, H.x); a.dir = tg && tg.x < H.x ? -1 : 1; a.loops = this.powered > 0 ? 2 : 1; sfx('clang', 0.6, 0.9); }
    if (a.t < wind) { h.tx = H.x + 30; h.ty = H.y - 60; h.ta = -0.6; h.tf = 0.6; h.fast = 0.15; return false; }
    if (a.t === wind) { this.crownOff = true; this.flyCrown = { x: H.x, y: H.y - HEAD.r, a: 0 }; sfx('shing', 1, 0.6); sfx('whoosh', 1, 0.6); h.tx = H.x + a.dir * 200; h.ty = -150; h.tf = 0; }
    const u = (a.t - wind) / CTHROW.fly, loop = Math.floor(u), f = u - loop, d = loop % 2 ? -a.dir : a.dir, C = this.flyCrown;
    if (loop >= a.loops) { this.crownOff = false; this.flyCrown = null; sfx('clang', 1, 0.7); match.shake(6, 8); return true; }
    C.x = H.x + d * CTHROW.reach * Math.sin(Math.PI * f); C.y = lerp(H.y - HEAD.r, CTHROW.low, Math.sin(Math.PI * f)) + CTHROW.swing * Math.sin(Math.PI * 2 * f); C.a += 0.5;
    out.push(this.bhit('ct' + a.id + '-' + loop, C.x - CTHROW.r, C.y - CTHROW.r * 0.7, C.x + CTHROW.r, C.y + CTHROW.r * 0.7, ...CTHROW.hit, { dirX: d }));
    if (a.t % 10 === 0) sfx('whoosh', 0.6, 1.2);
    return false;
  }

  // ------------------------------------------------------------------ his death
  /** How long his molten death runs. */
  kingDeathLen() { return MOLT.len; }
  /**
   * THE STARS COME HOME (molten): he clutches his head as molten light cracks through it; it EXPLODES in a ball of fire
   * like lava, gems of the crown flying; the lava runs down him and his body slowly melts and sinks into a glowing pool;
   * then every star he swallowed rises out of it into the sky - SOMEWHERE IN THE STARS... - and joins into
   * constellations. Always returns true (it does the whole death).
   */
  kingDeath(match) {
    const B = this.boss, d = B.dying, v = this.v, j = this.joints(), H = j.head;
    this.cbeam = null; this.flyCrown = null; this.crownOff = false; this.charging = false;
    if (d < MOLT.boom) {
      v.shake = 2 + d * 0.06; this.lava = d / MOLT.boom; this.crownGlow = 1 + Math.sin(d * 0.6);
      this.hands.forEach((h) => { h.tx = H.x + h.side * 58; h.ty = H.y + 10; h.ta = -h.side * 0.9; h.tf = 0.6; h.fast = 0.12; });
      if (d === 10) match.popText({ x: H.x, y: H.y - 120 }, 'NO... MY CROWN... MY STARS...', '#ffb090');
      if (d % 12 === 0) { sfx('rumble', 0.7, 0.5 + d * 0.006); match.shake(4, 8); }
    } else if (d === MOLT.boom) {
      this.headGone = true; this.lava = 0; this.boomFx = { x: H.x, y: H.y, t: 0 }; this.whiteT = 30;
      sfx('bighit', 1, 0.3); sfx('thunder', 1, 0.6); sfx('flame', 1, 0.5); sfx('glass', 1, 0.8); match.shake(24, 40);
      for (let i = 0; i < 70; i++) { const q = Math.random() * Math.PI * 2, s = 2 + Math.random() * 10; match.particles.push({ x: H.x, y: H.y, vx: Math.cos(q) * s, vy: Math.sin(q) * s - 3, life: 50 + Math.random() * 40, color: i % 5 === 0 ? K.gem[i % 3] : K.lava[1 + (i % 4)], size: 3 + (i % 2), grav: 0.22, drag: 0.98 }); }
    }
    if (this.boomFx) this.boomFx.t++;
    if (d > MOLT.boom) {
      const k = Math.max(0, Math.min(1, (d - MOLT.melt[0]) / (MOLT.melt[1] - MOLT.melt[0])));
      this.melt = ease(k); this.pool = k; v.shake = 1.5 * (1 - k);
      this.hands.forEach((h) => { h.tx = h.side * (190 + k * 40); h.ty = lerp(-150, 60, k); h.ta = h.side * 1.6; h.tf = 0.5; h.fast = 0.04; });
      v.vis = 1 - Math.max(0, (d - (MOLT.melt[1] - 70)) / 70);
      if (d % 24 === 0 && k < 1) sfx('flame', 0.5, 0.5 + Math.random() * 0.3);
      if (d % 3 === 0 && k < 1) match.particles.push({ x: (Math.random() - 0.5) * 220 * (1 + k), y: -2, vx: (Math.random() - 0.5) * 1.5, vy: -1 - Math.random() * 2, life: 24, color: K.lava[2 + (d % 3)], size: 2, grav: 0.1 });
    }
    if (d === MOLT.stars) {
      sfx('ding', 0.9, 0.7); sfx('summon', 0.8, 1.2); this.newStar = { x: 0, y: -150 };
      const R = seeded(9);
      for (let i = 0; i < 120; i++) { const q = -Math.PI / 2 + (R() - 0.5) * 2.4, s = 3 + R() * 12; this.freed.push({ x: (R() - 0.5) * 200, y: -10, vx: Math.cos(q) * s, vy: Math.sin(q) * s, p: R() * 6, s: R() < 0.2 ? 2 : 1, c: [0xffffff, 0xffe070, 0xa8c8ff, 0xffb0e0][i % 4] }); }
    }
    for (const s of this.freed) { s.vx *= 0.955; s.vy *= 0.955; s.x += s.vx; s.y += s.vy; }
    if (d === MOLT.stars + 60) this.links = this.freed.flatMap((a, i) => this.freed.slice(i + 1, i + 9).filter((b) => Math.hypot(a.x - b.x, a.y - b.y) < 70).slice(0, 1).map((b) => [a, b])).filter((_, i) => i % 2 === 0);
    if (d === MOLT.stars + 50) { sfx('ding', 0.8, 1.6); match.popText({ x: 0, y: -170 }, 'SOMEWHERE IN THE STARS...', '#ffe070'); }
    return true;
  }

  // ------------------------------------------------------------------ drawing
  /** His evil face (k = how far it's turned): the old face blacked out, cracks of red light, two burning slit eyes and a third in his brow, a grin of star-fangs. */
  drawEvilFace(g, H, R, k, flash) {
    g.fillStyle(0x000000, k); g.fillCircle(H.x, H.y, R * 0.9);
    const Rc = seeded(17);
    for (let i = 0; i < 9; i++) { const q = Rc() * Math.PI * 2; let px = H.x + Math.cos(q) * R * 0.9, py = H.y + Math.sin(q) * R * 0.9; for (let s = 0; s < 3; s++) { const nx = px + (H.x - px) * 0.25 + (Rc() - 0.5) * 10, ny = py + (H.y - py) * 0.25 + (Rc() - 0.5) * 10; g.lineStyle(2.5, K.fire[0], 0.5 * k); g.lineBetween(px, py, nx, ny); g.lineStyle(1, K.fire[2], 0.8 * k); g.lineBetween(px, py, nx, ny); px = nx; py = ny; } }
    g.lineStyle(0);
    for (const sx of [-1, 1]) {                                                         // the burning slits
      const ex = H.x + sx * 19, ey = H.y - 2, eye = [{ x: ex - sx * 15, y: ey + 9 }, { x: ex + sx * 18, y: ey - 13 }, { x: ex + sx * 13, y: ey + 2 }, { x: ex - sx * 4, y: ey + 10 }];
      g.fillStyle(K.blood[1], 0.3 * k); g.fillEllipse(ex, ey, 44, 26);
      g.fillStyle(K.blood[1], k); g.fillPoints(eye.map((p) => ({ x: ex + (p.x - ex) * 1.2, y: ey + (p.y - ey) * 1.3 })), true);
      g.fillStyle(flash ? 0xffffff : K.blood[2], k); g.fillPoints(eye, true);
      g.fillStyle(0x000000, k); g.fillEllipse(ex + sx * 2, ey, 3, 12);
    }
    const tx = H.x, ty = H.y - 27;                                                     // the third eye, in his brow
    g.fillStyle(K.blood[1], 0.35 * k); g.fillEllipse(tx, ty, 18, 26); g.fillStyle(K.blood[1], k); g.fillEllipse(tx, ty, 9, 19); g.fillStyle(K.blood[2], k); g.fillEllipse(tx, ty, 6, 15); g.fillStyle(0x000000, k); g.fillEllipse(tx, ty, 8, 2.5);
    const mw = 32, my = H.y + 16, grin = [];                                           // the grin
    for (let i = 0; i <= 16; i++) { const u = i / 16 * 2 - 1; grin.push({ x: H.x + u * mw, y: my + (1 - u * u) * 6 - Math.abs(u) * 6 }); }
    for (let i = 16; i >= 0; i--) { const u = i / 16 * 2 - 1; grin.push({ x: H.x + u * mw * 0.92, y: my + (1 - u * u) * 20 - Math.abs(u) * 4 }); }
    g.fillStyle(K.blood[0], k); g.fillPoints(grin, true); g.fillStyle(K.blood[1], 0.5 * k); g.fillEllipse(H.x, my + 12, mw * 1.2, 8);
    for (let i = 0; i < 9; i++) { const u = (i + 0.5) / 9 * 2 - 1, x = H.x + u * mw * 0.92, y0 = my + (1 - u * u) * 6 - Math.abs(u) * 6, y1 = my + (1 - u * u) * 20 - Math.abs(u) * 4; g.fillStyle(0xfff8e0, k); g.fillTriangle(x - 3, y0, x + 3, y0, x, y0 + 7); g.fillTriangle(x - 3, y1, x + 3, y1, x, y1 - 6); }
  }
  /**
   * The gem crown, its band's middle at (x, y), grown k (0..1), turned by ang, its gems glowing by glow: a gold band
   * set with little gems, five tall crystal spires (violet / cyan / magenta) and a great diamond in front.
   */
  drawCrown(g, x, y, k, ang, glow, sz = CROWN_SZ) {
    if (k <= 0.01) return;
    const c = Math.cos(ang) * sz, s = Math.sin(ang) * sz, P = (lx, ly) => ({ x: x + lx * c - ly * s, y: y + lx * s + ly * c }), poly = (pts, col, a = 1) => { g.fillStyle(col, a); g.fillPoints(pts.map(([lx, ly]) => P(lx, ly)), true); };
    if (glow > 0) { const C0 = P(0, -32); g.fillStyle(K.gem[3], 0.15 * glow); g.fillCircle(C0.x, C0.y, (60 + glow * 20) * sz); g.fillStyle(K.fire[2], 0.12 * glow); g.fillCircle(C0.x, C0.y, 34); }
    const spires = [[-36, 34, 0], [-18, 54, 1], [0, 74, 2], [18, 54, 1], [36, 34, 0]];
    for (const [sx, hgt, ci] of spires) {
      const hh = hgt * k, col = K.gem[ci];
      poly([[sx - 9, -10], [sx + 9, -10], [sx, -12 - hh - 4]], K.out);
      poly([[sx - 7, -10], [sx + 7, -10], [sx, -12 - hh]], col);
      poly([[sx - 7, -10], [sx, -10], [sx, -12 - hh]], 0xffffff, 0.35);
      if (glow > 0.3) poly([[sx - 2, -14], [sx + 2, -14], [sx, -12 - hh * 0.8]], 0xffffff, 0.5 * glow);
    }
    poly([[-48, 2], [48, 2], [44, -16], [-44, -16]], K.out); poly([[-45, 0], [45, 0], [41, -13], [-41, -13]], K.gold[1]); poly([[-45, 0], [45, 0], [44, -4], [-44, -4]], K.gold[0]); poly([[-41, -13], [41, -13], [42, -10], [-42, -10]], K.gold[3]);
    for (const [gx, col] of [[-30, K.blood[1]], [-14, K.gem[1]], [14, K.gem[1]], [30, K.blood[1]]]) { const p = P(gx, -6); g.fillStyle(K.out, 1); g.fillCircle(p.x, p.y, 4.5 * sz); g.fillStyle(col, 1); g.fillCircle(p.x, p.y, 3 * sz); }
    const dk = Math.max(0.3, k);                                                        // the great diamond
    poly([[0, -30 - 22 * dk], [15 * dk, -30], [0, -30 + 20 * dk], [-15 * dk, -30]], K.out);
    poly([[0, -30 - 19 * dk], [12 * dk, -30], [0, -30 + 17 * dk], [-12 * dk, -30]], K.gem[3]);
    poly([[0, -30 - 19 * dk], [12 * dk, -30], [0, -30]], 0xffffff, 0.8); poly([[0, -30], [-12 * dk, -30], [0, -30 + 17 * dk]], K.gem[1], 0.5);
    if (glow > 0.5) { const C0 = P(0, -30); g.fillStyle(0xffffff, Math.min(1, glow - 0.5)); g.fillCircle(C0.x, C0.y, (5 + glow * 3) * sz); }
  }
  /** Molten light cracking through his head as it's about to burst (k = 0..1). */
  drawLavaCracks(g, H, R, k) {
    g.fillStyle(K.lava[2], 0.25 * k); g.fillCircle(H.x, H.y, R * (1 + k * 0.3));
    const Rc = seeded(5), n = Math.ceil(k * 16);
    for (let i = 0; i < n; i++) { const q = Rc() * Math.PI * 2; let px = H.x, py = H.y; for (let s = 0; s < 4; s++) { const nx = px + Math.cos(q + (Rc() - 0.5)) * R * 0.3, ny = py + Math.sin(q + (Rc() - 0.5)) * R * 0.3; g.lineStyle(4, K.lava[2], 0.8); g.lineBetween(px, py, nx, ny); g.lineStyle(1.5, K.lava[4], 1); g.lineBetween(px, py, nx, ny); px = nx; py = ny; } }
    g.lineStyle(0);
    g.fillStyle(K.lava[4], k * k * 0.8); g.fillCircle(H.x, H.y, R * 0.5 * k);
  }
  /** The wound in his chest where his heart was: a ragged black hole ringed with cracked obsidian, violet light deep inside, black sludge dripping (gold-hot while he powers up). */
  drawWound(g, Ht) {
    const t = this.t, x = Ht.x, y = Ht.y, hot = this.charging ? 1 : 0;
    g.fillStyle(hot ? K.fire[2] : 0x5a2ad8, 0.2 + 0.1 * Math.sin(t * 0.1) + hot * 0.3); g.fillCircle(x, y, 46);
    for (let i = 0; i < 14; i++) { const q = i / 14 * Math.PI * 2; g.fillStyle(i % 2 ? 0x1a1630 : 0x2e2852, 1); g.fillTriangle(x + Math.cos(q - 0.25) * 30, y + Math.sin(q - 0.25) * 30, x + Math.cos(q + 0.25) * 30, y + Math.sin(q + 0.25) * 30, x + Math.cos(q) * (40 + (i % 3) * 5), y + Math.sin(q) * (40 + (i % 3) * 5)); }
    g.fillStyle(0x000000, 1); g.fillCircle(x, y, 30);
    for (let i = 0; i < 3; i++) { g.fillStyle([0x2a0a5a, 0x5a2ad8, 0x000000][i], 0.9); g.fillCircle(x + Math.sin(t * 0.05 + i) * 3, y + Math.cos(t * 0.05 + i) * 3, 22 - i * 7); }
    for (let i = 0; i < 3; i++) { const dx = (i - 1) * 16, L = 18 + ((t * 0.5 + i * 19) % 50); g.fillStyle(0x000000, 1); g.fillRoundedRect(x + dx - 3, y + 24, 6, L, 3); }
  }
  /** His body melting (drawn over it on the body layer; render also squashes the layer down): lava running down him in streams, the robe glowing molten. */
  drawMelt(g, j) {
    const k = this.melt, Ht = j.heart, R = seeded(3);
    const robe = (w) => [{ x: j.shL.x + 10, y: j.shL.y - 6 }, { x: j.shR.x - 10, y: j.shR.y - 6 }, { x: Ht.x + 205 * w, y: Ht.y + 330 }, { x: Ht.x - 205 * w, y: Ht.y + 330 }];
    g.fillStyle(K.lava[1], 0.5 * k); g.fillPoints(robe(1), true); g.fillStyle(K.lava[2], 0.35 * k); g.fillPoints(robe(0.55).map((p, i) => (i < 2 ? { x: Ht.x + (p.x - Ht.x) * 0.55, y: p.y } : p)), true);
    for (let i = 0; i < 18; i++) {
      const x = Ht.x + (R() - 0.5) * 300, y0 = Ht.y - 70 + R() * 40, L = (60 + R() * 260) * Math.min(1, k * 1.6), w = 4 + R() * 6;
      g.fillStyle(K.lava[2], 0.9); g.fillRoundedRect(x - w / 2, y0, w, L, w / 2); g.fillStyle(K.lava[4], 0.9); g.fillRect(x - 1, y0, 1.5, L - 4);
      g.fillStyle(K.lava[3], 1); g.fillCircle(x, y0 + L, w * 0.7);
    }
  }
  /** THE STAR KING's effects in front: his power aura, the beam (aiming / firing), the thrown crown, and in his death the fireball and the lava pool. */
  drawKingFx(x) {
    const t = this.t, j = this.joints(), H = j.head;
    if (this.powered > 0 && !this.headGone && !(this.boss && this.boss.dying)) {         // a crown of fire round his head
      for (let i = 0; i < 14; i++) { const q = i / 14 * Math.PI * 2 + t * 0.03, L = 70 + 16 * Math.abs(Math.sin(t * 0.2 + i)); x.fillStyle(K.fire[i % 3], 0.18); x.fillTriangle(H.x + Math.cos(q - 0.12) * 52, H.y + Math.sin(q - 0.12) * 52, H.x + Math.cos(q + 0.12) * 52, H.y + Math.sin(q + 0.12) * 52, H.x + Math.cos(q) * L, H.y + Math.sin(q) * L); }
    }
    const B = this.cbeam;
    if (B) {
      const L = 780, ex = B.x + B.ux * L, ey = B.y + B.uy * L;
      if (B.st === 'aim' || B.st === 'lock') { x.lineStyle(B.st === 'lock' ? 3 : 1.5, K.gold[3], B.st === 'lock' ? (t % 4 < 2 ? 1 : 0.4) : 0.6); x.lineBetween(B.x, B.y, ex, ey); x.lineStyle(0); }
      else if (B.st === 'fire') {
        for (const [w, c, a] of [[CBEAM.w * 3.4, K.gem[0], 0.3], [CBEAM.w * 2.4, K.gem[2], 0.5], [CBEAM.w * 1.5, K.gem[1], 0.85], [CBEAM.w * 0.6, 0xffffff, 1]]) { x.lineStyle(w, c, a); x.lineBetween(B.x, B.y, ex, ey); }
        x.lineStyle(0); x.fillStyle(0xffffff, 0.9); x.fillCircle(B.x, B.y, 14 + Math.sin(t * 0.8) * 3);
      }
    }
    const C = this.flyCrown;
    if (C) { for (let i = 1; i <= 4; i++) { x.fillStyle(K.gem[i % 3], 0.12); x.fillCircle(C.x - Math.cos(C.a) * i * 6, C.y, 40 - i * 5); } this.drawCrown(x, C.x, C.y + 20, 1, C.a, 1); }
    const F = this.boomFx;
    if (F && F.t < 90) {                                                                // the head bursting: a ball of molten light
      const k = F.t / 90, r = 30 + 170 * Math.sqrt(k), a = 1 - k;
      for (const [rr, c, al] of [[r * 1.3, K.lava[0], 0.5], [r, K.lava[1], 0.7], [r * 0.75, K.lava[2], 0.85], [r * 0.5, K.lava[3], 1], [r * 0.28, K.lava[4], 1]]) { x.fillStyle(c, al * a); x.fillCircle(F.x, F.y, rr); }
      x.lineStyle(6, K.lava[3], a); x.strokeCircle(F.x, F.y, r * 1.5); x.lineStyle(0);
    }
    if (this.pool > 0) {                                                               // the pool of lava he melts into
      const k = this.pool, w = 80 + 420 * k, fade = this.boss && this.boss.dying > MOLT.stars + 80 ? Math.max(0, 1 - (this.boss.dying - MOLT.stars - 80) / 80) : 1;
      x.fillStyle(K.lava[0], 0.9 * fade); x.fillEllipse(0, -1, w, 16); x.fillStyle(K.lava[2], 0.9 * fade); x.fillEllipse(0, -2, w * 0.9, 11); x.fillStyle(K.lava[3], 0.8 * fade); x.fillEllipse(0, -3, w * 0.6, 6);
      for (let i = 0; i < 6; i++) { const bx = ((i * 71 + t) % w) - w / 2; x.fillStyle(K.lava[4], 0.7 * fade); x.fillCircle(bx, -4, 2 + (t + i * 7) % 4); }
    }
  }
}

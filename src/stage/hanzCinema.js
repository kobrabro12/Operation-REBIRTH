// HIS DESK's cinema (methods copied onto HanzBossStage - see the bottom of hanzBossStage.js): the intro, the two
// cutscenes between the acts (THE DRAWN ROOM, NOTHING UNDER THE MASK), his death and his gloat, and the dialogue box
// both halves of him talk in ($@L red, HANZ grey). MatchScene plays the intro through startIntro / introStep and the
// cutscenes through `cut` / cutStep / skipCut (the camera through introCam); the sim (nobody watching) skips them.
import { BossArena } from './bossBase.js';
import { sfx } from '../audio/sfx.js';
import { FONT, VIEW_W, VIEW_H } from '../config.js';
import { LOST_FRAMES } from '../scenes/lostFrames.js';

const lerp = (a, b, k) => a + (b - a) * k;
// who talks in what colour
const WHO = { s: { name: '$@L', color: '#ff3a46', bar: 0xb8121c }, h: { name: 'HANZ', color: '#d2d0cc', bar: 0x8a8a92 } };
// the intro's length (frames of his entrance before the freeze card) and its beats
const INTRO = { n: 420, slam: 120, pitch: 196, clap: 300 };
// THE DRAWN ROOM cutscene: length, the snap, when the room turns
const DRAWN = { n: 300, snap: 108, swap: 184 };
// NOTHING UNDER THE MASK: length, the mask coming off, the frame he holds it out, the room tearing, the mask shattering
const VOID = { n: 450, unmask: 64, hold: 54, tear: 240, swap: 268, shatter: 344 };
// where the mask is when he holds it out (in the world: (300, 268) on the LOST picture)
const MASK_AT = { x: (300 - 320) * 1.16, y: (268 - 303.6) * 1.16 };
// his death: length, the worlds flickering, the shatter
const DEATH = { n: 540, flicker: [150, 300], shatter: 300 };
// the dialogue box: typing speed (frames a letter), where
const BOX = { per: 1.4, y: VIEW_H - 64, h: 46, w: 500 };

/** The cinema half of HanzBossStage (see the top of this file). */
export class HanzCinema {
  /** A real player is watching: the intro plays, so the cutscenes will too. Builds the dialogue box. */
  startIntro(match) {
    this.introEnter = INTRO.n; this.watched = true; this.match = match;
    BossArena.prototype.startIntro.call(this, match);
    this.introTag.setText('-  SECRET BOSS  -');
    this.ensureUI(match);
    this.play('idle');
  }
  /** The freeze card's words. */
  introCard() { return { name: 'HANZ & $@L', title: 'THE TRUE SHOPKEEPER' }; }
  /** One frame of the intro: he moves too (the arena's step doesn't run during it). */
  introStep(match) { this.t++; this.stepAnim(); this.ambient(); this.stepSay(); if (this.flashK > 0) this.flashK = Math.max(0, this.flashK - 0.04); return BossArena.prototype.introStep.call(this, match); }
  /** The entrance, beat by beat: FINE. / LET'S SETTLE THIS. / the slam / WELCOME TO MY WORLD / the clap. */
  introPose(match, k, t) {
    const once = (key, at, fn) => { this.introOnce = this.introOnce || new Set(); if (t >= at && !this.introOnce.has(key)) { this.introOnce.add(key); fn(); } };
    once('fine', 4, () => { this.play('sal_talk'); this.say('s', 'FINE.', 70); sfx('laugh', 0.4, 0.6); });
    once('settle', 56, () => { this.play('hanz_talk'); this.say('h', "...LET'S SETTLE THIS.", 70); });
    once('slam', INTRO.slam, () => this.play('slam'));
    once('boom', INTRO.slam + 36, () => { for (const x of [-97, 97]) this.impact(match, x, 0, 1.2); sfx('bighit', 1, 0.55); match.shake(14, 18); this.flash(0xffffff, 0.4); });
    once('pitch', INTRO.pitch, () => { this.play('pitch'); this.say('s', 'WELCOME TO MY WORLD, CUSTOMER!', 90); });
    once('clap', INTRO.clap, () => { this.play('clap'); this.say('h', 'NO REFUNDS.', 70); });
    once('burst', INTRO.clap + 72, () => { const c = this.sparkAt('clap'); this.burst(match, c.x, c.y, 40); sfx('bighit', 0.9, 1.7); sfx('glass', 0.7, 1.2); match.shake(10, 12); this.flash(0xff7ab8, 0.6); });
  }
  /** The intro's camera: on his face as he talks, wide for the slam, his hands for the clap. */
  introShot() {
    const t = this.introPhase().f, h = this.headAt();
    if (t < INTRO.slam) return { x: h.x, y: h.y + 14, zoom: 2.3 };
    if (t < INTRO.pitch) return { x: 0, y: -130, zoom: 0.95 };
    if (t < INTRO.clap) return { x: h.x * 0.6, y: h.y + 50, zoom: 1.5 };
    const c = this.sparkAt('clap'); return { x: c.x, y: c.y - 30, zoom: 1.9 };
  }
  /** The freeze frame: his whole upper half, grinning. */
  introAt() { const h = this.headAt(); return { x: h.x, y: h.y + 60, zoom: 1.35 }; }
  /** The intro is over: the card goes, the box goes, nothing from the entrance lingers. */
  endIntro() { BossArena.prototype.endIntro.call(this); this.sayD = null; this.clearFx(); this.play('idle'); }

  /** The camera: the intro's, or a cutscene's (eased, or cut to). */
  introCam() {
    if (!this.cut) return BossArena.prototype.introCam.call(this);
    const w = this.cut.shot || { x: 0, y: -130, zoom: 1 }, k = this.cut.snap ? 1 : 0.07; this.cut.snap = false;
    this.ccam = { x: lerp(this.ccam.x, w.x, k), y: lerp(this.ccam.y, w.y, k), zoom: lerp(this.ccam.zoom, w.zoom, k) };
    return { ...this.ccam, exact: true };
  }
  /** Nothing hurts him while a cutscene plays. */
  strikeTargets(match, hbs) { if (this.cut) return; BossArena.prototype.strikeTargets.call(this, match, hbs); }
  /** The banner at the change of act. */
  rageLine() { return 'THE DRAWN ROOM!'; }

  /** Starts a cutscene (watched) - else runs `now` at once (the sim). */
  startCut(match, kind, n, now) {
    const B = this.boss; B.atk = null; B.wait = 70; this.clearFx(); this.play('idle');
    if (!this.watched || !this.startCard) { now(); return; }
    const cam = match.worldCam || match.cameras.main;
    this.cut = { kind, t: 0, n, once: new Set(), armed: false, now };
    this.ccam = { x: cam.midPoint.x, y: cam.midPoint.y, zoom: cam.zoom };
    this.rageText.setVisible(false); B.rage = 0;
  }
  /** ACT II: at ACTS.drawn (bossBase's rage) he snaps the room hand-drawn. */
  onRage(match) { this.startCut(match, 'drawn', DRAWN.n, () => this.setWorld('drawn')); }
  /** ACT III: at ACTS.void he takes his face off and the room tears into the void. */
  startVoid(match) { this.startCut(match, 'void', VOID.n, () => { this.setWorld('void'); this.voidFace = true; this.rageText.setText('NOTHING UNDER THE MASK'); this.boss.rage = 90; }); }

  /** One frame of a cutscene (MatchScene, while `cut` is set). */
  cutStep(match) {
    const C = this.cut, t = ++C.t, once = (k, at, fn) => { if (t >= at && !C.once.has(k)) { C.once.add(k); fn(); } };
    this.t++; this.stepAnim(); this.ambient(); this.stepSay(); this.stepFx(match, null);
    if (this.flashK > 0) this.flashK = Math.max(0, this.flashK - 0.04);
    const h = this.headAt();
    if (C.kind === 'drawn') {
      C.shot = t < DRAWN.swap ? { x: h.x, y: h.y + 20, zoom: t < DRAWN.snap ? 2.2 : 1.8 } : { x: 0, y: -140, zoom: 0.95 };
      once('laugh', 1, () => { this.play('laugh'); this.say('s', "HEH. HEHEHE. OKAY. YOU'RE GOOD.", 90); sfx('laugh', 0.6, 0.7); });
      once('art', DRAWN.snap - 8, () => this.say('h', "THEN LET'S MAKE IT ART.", 80));
      once('snap', DRAWN.snap, () => this.play('snap'));
      once('spark', DRAWN.snap + LOST_FRAMES.anims.snap.spark.f * 4, () => { const c = this.sparkAt('snap'); this.burst(match, c.x, c.y, 34, [0xfff4d0, 0xffe08a, 0xffb04a, 0xff6a2a]); sfx('clocktick', 1, 2.2); sfx('flame', 0.7, 1.4); match.shake(6, 8); });
      once('swap', DRAWN.swap, () => { this.flash(0xf1e8d4, 1); this.setWorld('drawn'); sfx('petal', 0.8, 0.6); sfx('bighit', 0.6, 0.6); C.snap = true; });
      once('ink', DRAWN.swap + 50, () => { this.play('sal_talk'); this.say('s', "DON'T TOUCH ANYTHING. THE INK'S STILL WET.", 70); });
    } else if (C.kind === 'void') {
      C.shot = t < VOID.swap ? { x: h.x, y: h.y + 26, zoom: t < VOID.unmask ? 2.1 : 1.7 } : t < VOID.shatter + 40 ? { x: h.x * 0.5, y: h.y + 70, zoom: 1.45 } : { x: 0, y: -140, zoom: 0.95 };
      once('twitch', 1, () => { this.play('twitch'); this.say('h', "...WHY WON'T YOU JUST LEAVE.", 70); this.flash(0xffffff, 0.3); sfx('glitch', 0.8, 0.6); });
      once('unmask', VOID.unmask, () => { this.play('unmask'); this.say('s', "YOU WANT TO SEE WHAT'S UNDER IT?", 100); });
      if (this.an.name === 'unmask' && !this.an.held && this.an.f >= VOID.hold && t < VOID.shatter) this.hold(VOID.hold);
      if (t > VOID.tear && t < VOID.swap) { this.splitK = (t - VOID.tear) / (VOID.swap - VOID.tear); if (t % 4 === 0) { sfx('glitch', 0.6, 0.5 + Math.random()); match.shake(3, 4); } this.tearK = this.splitK; }
      once('swap', VOID.swap, () => { this.setWorld('void'); this.voidFace = true; this.splitK = 0; this.tearK = 0; this.flash(0x000000, 1); sfx('roar', 0.8, 0.5); sfx('bighit', 1, 0.4); match.shake(16, 20); C.snap = true; });
      once('nothing', VOID.swap + 14, () => this.say('h', 'NOTHING. THERE NEVER WAS.', 80));
      once('shatter', VOID.shatter, () => { const m = MASK_AT; this.burst(match, m.x, m.y, 50, [0xb8121c, 0xd2d0cc, 0x101012, 0xffffff]); sfx('glass', 1, 0.6); sfx('bighit', 0.8, 0.9); match.shake(10, 10); this.flash(0xff2a3a, 0.5); this.an.held = false; });
      once('even', VOID.shatter + 30, () => { this.play('laugh'); this.say('s', "NOW WE'RE EVEN.", 80); sfx('laugh', 0.7, 0.5); });
    }
    if (t >= C.n) this.endCut(match);
  }
  /** A fresh press skips the rest of a cutscene. */
  skipCut(match) { this.endCut(match); }
  /** The cutscene's over: its end state, and the act's name card. */
  endCut(match) {
    const C = this.cut; if (!C) return;
    this.cut = null; this.splitK = 0; this.tearK = 0; this.an.held = false; C.now(); this.play('idle'); this.sayD = null;
    this.startCard(match, C.kind === 'drawn' ? { name: 'HANZ & $@L', title: 'THE DRAWN ROOM', tag: '-  ACT II  -' } : { name: 'HANZ & $@L', title: 'NOTHING UNDER THE MASK', tag: '-  FINAL ACT  -' });
  }

  // ------------------------------------------------------------------ his death
  /** How long his death lasts. */
  deathLen() { return DEATH.n; }
  /** NO. NO, NO, NO. - he sobs, the worlds flicker through each other faster and faster as he glitches apart, then he
   *  SHATTERS into shards of every colour he ever was; out of nowhere: ...FINE. YOU WIN. THE SHOP IS CLOSED. */
  stepDeath(match) {
    const d = this.boss.dying;
    this.stepSay();
    if (d === 2) { this.clearFx(); this.voidFace = this.world === 'void'; this.play('sob', { hold: true }); this.say('h', '...NO. NO, NO, NO.', 90); sfx('glitch', 0.8, 0.5); }
    if (d === 96) { this.play('sal_talk'); this.say('s', "WE DON'T LOSE. WE NEVER LOSE!", 70); }
    if (d === 170) { this.play('glitch', { hold: true }); }
    if (d > DEATH.flicker[0] && d < DEATH.flicker[1]) {
      const every = Math.max(3, 14 - Math.floor((d - DEATH.flicker[0]) / 12));
      if (d % every === 0) { const W = ['poly', 'drawn', 'void']; this.setWorld(W[(W.indexOf(this.world) + 1) % 3]); sfx('glitch', 0.5, 0.6 + Math.random() * 0.6); this.flash(0xffffff, 0.15); }
      this.splitK = (d - DEATH.flicker[0]) / (DEATH.flicker[1] - DEATH.flicker[0]); match.shake(2 + this.splitK * 4, 3);
    }
    if (d === DEATH.shatter) {
      this.gone = true; this.splitK = 0; this.voidFace = false; this.setWorld('poly'); this.flash(0xffffff, 1);
      sfx('glass', 1, 0.5); sfx('bighit', 1, 0.5); sfx('roar', 0.7, 0.4); match.shake(20, 30);
      const c = this.core(), cols = [0xb8121c, 0xd2d0cc, 0xff7ab8, 0x2fd6c6, 0xffd447, 0x101012, 0x261a18];
      for (let i = 0; i < 90; i++) { const q = Math.random() * Math.PI * 2, s = 2 + Math.random() * 8; match.particles.push({ x: c.x + (Math.random() - 0.5) * 120, y: c.y - 60 + (Math.random() - 0.5) * 160, vx: Math.cos(q) * s, vy: Math.sin(q) * s - 2, life: 60 + Math.random() * 60, color: cols[i % cols.length], size: 3 + (i % 3), grav: 0.15, drag: 0.97 }); }
      this.dShards = [];                                                            // the pieces of him: spinning triangles of red, grey and black
      for (let i = 0; i < 80; i++) { const q = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 7; this.dShards.push({ x: c.x + (Math.random() - 0.5) * 140, y: c.y - 70 + (Math.random() - 0.5) * 180, vx: Math.cos(q) * sp, vy: Math.sin(q) * sp - 2.5, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, s: 4 + Math.random() * 12, c: [0xb8121c, 0xd2d0cc, 0x101012, 0x1a1a23, 0xff3a46, 0xffffff][i % 6], life: 120 + Math.random() * 80 }); }
      this.dRing = { x: c.x, y: c.y - 70, t: 0 };
      for (let i = 0; i < 4; i++) match.particles.push({ shape: 'ring', x: c.x, y: c.y - 60, vx: 0, vy: 0, life: 30 + i * 8, maxLife: 30 + i * 8, color: cols[i], grav: 0, r: 10, dr: 6 + i * 2 });
    }
    for (const p of this.dShards || []) { p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.vx *= 0.985; p.rot += p.vr; p.life--; if (p.y > -4 && p.vy > 0 && Math.abs(p.x) < 272) { p.y = -4; p.vy *= -0.35; p.vx *= 0.7; p.vr *= 0.5; } }
    if (this.dShards) this.dShards = this.dShards.filter((p) => p.life > 0);
    if (this.dRing) this.dRing.t++;
    if (d === DEATH.shatter + 40) this.say('h', '...FINE. YOU WIN.', 100);
    if (d === DEATH.shatter + 150) this.say('s', 'THE SHOP IS CLOSED. ...COME BACK TOMORROW.', 110);
  }

  /** His shattering: the pieces of him tumbling and bouncing on the desk, and light bursting out where he was. */
  drawShatter() {
    const g = this.topG, gl = this.glowG; if (!g) return;
    if (this.dRing && this.dRing.t < 60) {
      const R = this.dRing, k = R.t / 60;
      gl.fillStyle(0xffffff, 0.5 * (1 - k)); gl.fillCircle(R.x, R.y, 30 + k * 260);
      for (let i = 0; i < 12; i++) { const q = i / 12 * Math.PI * 2 + k; gl.lineStyle(10 * (1 - k), [0xff3a46, 0xd2d0cc][i % 2], 0.5 * (1 - k)); gl.lineBetween(R.x, R.y, R.x + Math.cos(q) * (80 + k * 500), R.y + Math.sin(q) * (80 + k * 500)); }
      g.lineStyle(4 * (1 - k) + 1, 0xffffff, 1 - k); g.strokeCircle(R.x, R.y, 20 + k * 340);
    }
    for (const p of this.dShards || []) {
      const pts = [0, 2.3, 4.1].map((o, i) => ({ x: p.x + Math.cos(p.rot + o) * p.s * (i === 1 ? 0.6 : 1), y: p.y + Math.sin(p.rot + o) * p.s * (i === 1 ? 0.6 : 1) }));
      const a = Math.min(1, p.life / 40);
      g.fillStyle(p.c, a); g.fillTriangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y);
      g.lineStyle(1, 0xffffff, 0.35 * a); g.strokeTriangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y);
    }
  }

  /** You lost: he leans back and cackles, and keeps cackling. */
  onGloat(match, t) { if (t === 1 || t % 170 === 0) { this.play('laugh'); sfx('laugh', 0.5, 0.6); } if (t === 2) this.say('s', 'HAHAHA! THANK YOU, COME AGAIN!', 140); this.stepSay(); }

  // ------------------------------------------------------------------ the dialogue box
  /** Builds the dialogue box and the cutscene letterbox on the UI layer (once). */
  ensureUI(match) {
    if (this.sayG) return;
    const s = match;
    this.sayG = s.add.graphics().setDepth(42);
    this.sayName = s.add.text(0, 0, '', { fontFamily: FONT, fontSize: '7px', color: '#ffffff', stroke: '#07060e', strokeThickness: 3 }).setDepth(43);
    this.sayText = s.add.text(0, 0, '', { fontFamily: FONT, fontSize: '9px', color: '#ffffff', stroke: '#07060e', strokeThickness: 3, wordWrap: { width: BOX.w - 30 }, lineSpacing: 5 }).setDepth(43);
    s.addUI(this.sayG, this.sayName, this.sayText);
  }
  /** One of them says something (who 's' = $@L, 'h' = HANZ) for `life` frames after it's typed out. */
  say(who, text, life = 80) { this.sayD = { who, text, t: 0, life: life + text.length * BOX.per }; if (this.match) this.ensureUI(this.match); }
  /** Moves the dialogue on a frame. */
  stepSay() { if (this.sayD && ++this.sayD.t > this.sayD.life) this.sayD = null; }

  /** The cinema's drawing (every frame, from render): the cutscene letterbox and tearing, and the dialogue box. */
  drawCinema() {
    if (!this.sayG) return;
    const g = this.sayG; g.clear();
    if (this.cut) {
      const b = Math.min(30, this.cut.t * 2);
      g.fillStyle(0x000000, 1); g.fillRect(0, 0, VIEW_W, b); g.fillRect(0, VIEW_H - b, VIEW_W, b);
    }
    if (this.tearK > 0) for (let i = 0; i < 12 * this.tearK; i++) { const y = Math.random() * VIEW_H, h = 2 + Math.random() * 14; g.fillStyle([0x000000, 0xff2a3a, 0x30e0ff, 0xf1e8d4][i % 4], 0.5 + 0.4 * this.tearK); g.fillRect(Math.random() * 60 - 30, y, VIEW_W, h); }
    const D = this.sayD;
    if (!D) { this.sayName.setVisible(false); this.sayText.setVisible(false); return; }
    const W = WHO[D.who], x = (VIEW_W - BOX.w) / 2, y = BOX.y - (this.cut ? 10 : 0), a = Math.min(1, D.t / 6, (D.life - D.t) / 10);
    g.fillStyle(0x07050a, 0.88 * a); g.fillRect(x, y, BOX.w, BOX.h);
    g.fillStyle(W.bar, a); g.fillRect(x, y, 4, BOX.h); g.fillRect(x, y, BOX.w, 1);
    g.fillStyle(W.bar, 0.6 * a); g.fillRect(x + BOX.w - 4, y + BOX.h - 1, 4, 1);
    this.sayName.setVisible(true).setText(W.name).setColor(W.color).setPosition(x + 12, y + 6).setAlpha(a);
    const n = Math.floor(D.t / BOX.per);
    this.sayText.setVisible(true).setText(D.text.slice(0, n)).setColor(W.color).setPosition(x + 12, y + 20).setAlpha(a);
    if (n < D.text.length && D.t % 3 === 0 && D.text[n] !== ' ') sfx('menu', 0.15, D.who === 's' ? 1.6 : 0.9);
  }
}

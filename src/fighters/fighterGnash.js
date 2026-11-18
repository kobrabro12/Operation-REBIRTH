// Fighter methods for GNASH (def `gnash.js`, `def.show.kind === 'gnash'`): his PSYCHO meter (on his player plate) and
// the PSYCHO specials it unlocks (a cinematic cut-in, then a buffed special), SEETHE (neutral, hold to fill PSYCHO),
// AXE THROW (side: straight out, it sticks in the floor, he's UNARMED until he walks over it - the GnashAxe in
// showEntities.js), the GROUND SPLITTER double slam (down: the slam throws him high, he hangs there, then slams again
// with a shockwave), his Limit EXECUTIONER and his attack effects (neon slash trails, X marks on whoever he hits).
// Mixed into the Fighter class (Fighter.js) - `this` is the fighter. Hooks: fighterShow.js (showTick / showBonus /
// showLanded / drawShow), Fighter.tryCommon (gnashSpecial), Fighter.st_attack (`m.gnash`, `m.axe`), fighterLimit's
// st_limit, MatchScene (applyHit -> addPsycho, the cut-in's freeze / overlay / camera), hud.js (drawPsychoHud).
import { sfx } from '../audio/sfx.js';
import { FONT } from '../config.js';
import { skinTexture, skinInfo } from './skins.js';
import { GnashAxe } from './showEntities.js';

/** His neon colours for the costume he's wearing: [main, second]. */
function neonOf(f) { return f.style === 'gnashBlood' ? [0xff3a2a, 0xffb02a] : f.style === 'gnashStone' ? [0x8aff2a, 0xd8ff3a] : [0xff3ad0, 0x3af0ff]; }
const css = (c) => '#' + c.toString(16).padStart(6, '0');
const SPECIAL = { neutralB: 1, sideB: 1, downB: 1, downB2: 1 };
const QUEUED = new Set();                 // his no-axe sheet keys already asked for (loadNoAxe)

/** GNASH's mixin (methods attached to Fighter). */
export class FighterGnash {
  // ------------------------------------------------------------------ every frame
  /** Every frame (from showTick): loads his no-axe sheets, picks the axe back up, runs the PSYCHO moves' extras. */
  gnashTick() {
    if (this.psychoMeter === undefined) { this.psychoMeter = 0; this.slashFx = []; this.xMarks = []; this.ringFx = []; this.loadNoAxe(); }
    const S = this.def.show, U = S.unarmed, m = this.match;
    if (this.unarmed && (this.state === 'respawn' || this.state === 'limit')) this.rearm(this.state === 'respawn');   // (a new life / the Limit: it's back in his hands)
    const A = this.axeOut;
    if (this.unarmed && A && A.alive && A.stuck && this.state !== 'hitstun' && Math.abs(this.x - A.x) < U.pickUp.x && Math.abs(this.y - A.y) < U.pickUp.y) this.rearm(false);
    if (this.unarmed && !this.noAxeOn) this.showNoAxe();
    if (this.axeBack > 0 && --this.axeBack === 0) { this.rearm(true); m.popText(this, 'AXE BACK', css(neonOf(this)[0])); }
    // the PSYCHO move he's in: over when he leaves it
    if (this.psychoMove && !(this.state === 'attack' && SPECIAL[this.moveName]) && this.state !== 'upb' && this.state !== 'land' && !(this.psychoCutOn())) this.psychoMove = null;
    if (this.psychoMove === 'upb' && this.state === 'upb') this.psychoRise();
    if (this.psychoMeter >= S.psycho.max && this.anim % 3 === 0) {          // PSYCHO READY: neon crackling off him
      const n = neonOf(this), a = Math.random() * Math.PI * 2;
      m.particles.push({ x: this.x + Math.cos(a) * 22, y: this.y - 32 + Math.sin(a) * 30, vx: Math.cos(a) * 0.8, vy: -1.2, life: 16, color: Math.random() < 0.5 ? n[0] : n[1], size: 2, grav: 0 });
    }
  }
  /** Is his PSYCHO cut-in playing right now? */
  psychoCutOn() { return !!(this.match.psychoCut && this.match.psychoCut.f === this); }

  // ------------------------------------------------------------------ the PSYCHO meter
  /** Adds to the PSYCHO meter (not during a PSYCHO move); full -> PSYCHO READY. */
  addPsycho(n) {
    const P = this.def.show.psycho;
    if (this.psychoMeter === undefined) this.psychoMeter = 0;
    if (this.psychoMove || !(n > 0) || this.psychoMeter >= P.max) return;
    this.psychoMeter = Math.min(P.max, this.psychoMeter + n);
    if (this.psychoMeter >= P.max) {
      const m = this.match, c = neonOf(this);
      m.popText(this, 'PSYCHO READY!', css(c[0])); sfx('limitready', 0.6, 0.8); sfx('laugh', 0.5, 0.5); m.shake(4, 8);
      for (let i = 0; i < 20; i++) { const a = Math.random() * Math.PI * 2; m.particles.push({ x: this.x, y: this.y - 32, vx: Math.cos(a) * 3.5, vy: Math.sin(a) * 3.5, life: 22, color: i % 2 ? c[0] : c[1], size: 3, grav: 0 }); }
    }
  }
  /** How much harder this hit lands (null: as normal): PSYCHO moves hit harder; his bare fists softer. */
  gnashBonus(t, hb) {
    const S = this.def.show;
    if (this.psychoMove) return { dmg: S.psycho.dmg, kb: S.psycho.kb };
    if (this.unarmed && !hb.projectile) return { dmg: S.unarmed.dmg, kb: S.unarmed.kb };
    return null;
  }
  /** A hit he landed: PSYCHO from the damage, a neon X slashed across them, shards. */
  gnashLanded(t, hb) {
    this.addPsycho((hb.h.dmg || 0) * this.def.show.psycho.perHit);
    if (!this.xMarks) { this.slashFx = []; this.xMarks = []; this.ringFx = []; }
    const n = neonOf(this), big = (hb.h.dmg || 0) >= 12 || this.psychoMove;
    this.xMarks.push({ x: t.x, y: t.y - 30, t: 0, s: big ? 1.5 : 1, a: (Math.random() - 0.5) * 0.6 });
    for (let i = 0; i < (big ? 14 : 8); i++) { const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * (big ? 5 : 3); this.match.particles.push({ x: t.x, y: t.y - 30, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, life: 14 + Math.random() * 8, color: [n[0], n[1], 0xffffff][i % 3], size: big ? 3 : 2, grav: 0.12 }); }
    if (big) this.match.shake(5, 6);
  }
  /** Nothing makes him flinch during a PSYCHO move. */
  gnashArmour(hb) { return !!(this.psychoMove && hb && hb.h); }

  // ------------------------------------------------------------------ specials
  /**
   * His specials, from Fighter.tryCommon (special pressed): with no axe, side / down special only shrug; with the
   * PSYCHO meter full, the special becomes its PSYCHO version (cut-in, then the buffed move). Returns true / false
   * (handled), or undefined to let the normal special start.
   */
  gnashSpecial(c) {
    const kind = c.down ? 'downB' : c.up ? 'upb' : Math.abs(c.x) > 0.5 ? 'sideB' : 'neutralB';
    if (this.unarmed && (kind === 'downB' || kind === 'sideB')) {
      if (this.age - (this.noAxeAt ?? -99) > 30) { this.noAxeAt = this.age; this.match.popText(this, 'NO AXE!', '#ffffff'); sfx('dodge', 0.3, 0.6); }
      return false;
    }
    if (this.unarmed || this.psychoMeter < this.def.show.psycho.max) return undefined;
    if (kind === 'upb' && this.usedUpB) return false;
    if (kind === 'sideB') this.facing = Math.sign(c.x);
    this.startPsycho(kind);
    if (kind === 'upb') this.startUpB(c); else this.startAttack(kind);
    return true;
  }
  /** The PSYCHO cut-in: the meter empties, everyone freezes for `cut` frames while it plays (MatchScene draws it with drawPsychoCut). */
  startPsycho(kind) {
    const P = this.def.show.psycho, m = this.match, c = neonOf(this);
    this.psychoMove = kind; this.psychoMeter = 0; this.psychoRose = false; this.pillarTicks = 0; this.pillarAt = -99;
    m.frozen = P.cut; m.psychoCut = { f: this, t: 0, name: P.moves[kind].name, color: c[0], color2: c[1], len: P.cut };
    sfx('limit', 0.9, 0.7); sfx('roar', 0.8, 0.8); sfx('glitch', 0.5, 0.7); m.shake(8, 10);
    if (!this.isCpu && !m.isTraining) m.stat('psychos');
  }

  /**
   * His specials' frame-by-frame work (m.gnash), from st_attack: 'seethe' loops while special is held (fills PSYCHO;
   * PSYCHO SCREAM = one big blast instead); 'slam' bounces him up into the second slam; 'drop' rises, hangs in the air
   * for `stall` frames, plunges and slams with a shockwave. Returns true when it changed state (st_attack should stop).
   */
  gnashStep(m, c) {
    const S = this.def.show, M = this.match, PM = this.psychoMove ? S.psycho.moves[this.psychoMove] : null;
    if (m.gnash === 'seethe') {
      if (PM && this.psychoMove === 'neutralB') {                                         // PSYCHO SCREAM
        if (this.t === 4) { this.psychoBlast(PM.blast, this.x, this.y - 30, 'gnPS' + this.attackId); sfx('roar', 1, 0.6); }
        this.vx *= 0.7; if (!this.grounded) this.vy = Math.min(this.vy, 0.5);
        if (this.t >= 22) { this.setState(this.grounded ? 'idle' : 'air'); return true; }
        return false;
      }
      const held = this.isCpu ? this.t + (this.seetheLoops || 0) * m.frames < (this.cpuSeethe || 60) : c.held('special');
      if (this.t === 1) { this.seetheLoops = 0; if (this.isCpu) this.cpuSeethe = 40 + Math.floor(Math.random() * 60); sfx('roar', 0.5, 0.9); }
      this.addPsycho(S.psycho.seethe);
      if (this.t % 6 === 0) { M.shake(1.5, 4); M.particles.push({ x: this.x + (Math.random() - 0.5) * 30, y: this.y - 4, vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random(), life: 16, color: 0x8a7a6a, size: 2, grav: 0.1 }); }
      if (!this.grounded) this.vy = Math.min(this.vy, 1.2);
      this.vx *= 0.8;
      const full = this.psychoMeter >= S.psycho.max;
      if (this.t >= m.frames - 1 && held && !full && (this.seetheLoops || 0) * m.frames < m.maxHold) { this.seetheLoops = (this.seetheLoops || 0) + 1; this.t = m.loopFrom + 6; }
      else if (this.t > 6 && (!held || full)) { this.setState(this.grounded ? 'idle' : 'air'); return true; }
      return false;
    }
    if (m.gnash === 'slam') {
      if (this.t === 12) { sfx('bighit', 0.7, 0.7); M.shake(6, 8); if (this.grounded) this.splinters(this.x + this.facing * 40, this.y, 10); }
      if (this.t === m.bounceAt) {
        const psycho = this.psychoMove === 'downB';
        this.vy = psycho ? PM.bounceV : m.bounceV; this.grounded = false; this.platform = null; sfx('djump', 0.8, psycho ? 0.5 : 0.7);
        for (let i = 0; i < 10; i++) M.particles.push({ x: this.x + (Math.random() - 0.5) * 20, y: this.y, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3, life: 18, color: neonOf(this)[0], size: 2, grav: 0 });
        this.startAttack('downB2'); if (psycho) this.psychoMove = 'downB'; return true;
      }
      return false;
    }
    if (m.gnash === 'drop') {
      if (this.t === 1) { this.dropLanded = false; this.dropStall = -1; }
      const stall = this.psychoMove === 'downB' ? PM.stall : m.stall;
      if (this.dropStall < 0) {                                                          // still rising: hold the overhead
        if (this.t > 6) this.t = 6;
        if (this.vy >= 0 || this.grounded) { this.dropStall = stall; this.stallY = this.y; sfx('buzz', 0.4, 1.4); }
        return false;
      }
      if (this.dropStall > 0) {                                                          // hanging at the top, axe raised, crackling
        this.dropStall--; this.y = this.stallY; this.vy = 0; this.vx *= 0.85; if (this.t > 9) this.t = 9;
        const n = neonOf(this);
        if (this.anim % 2 === 0) { const a = Math.random() * Math.PI * 2, r = 40 + Math.random() * 30; M.particles.push({ x: this.x + Math.cos(a) * r, y: this.y - 40 + Math.sin(a) * r, vx: -Math.cos(a) * 2.5, vy: -Math.sin(a) * 2.5, life: 14, color: Math.random() < 0.5 ? n[0] : n[1], size: 2, grav: 0 }); }
        if (this.dropStall % 20 === 0) sfx('buzz', 0.25, 1 + (stall - this.dropStall) / stall);
        if (this.dropStall === 0) { this.t = m.fallAt; sfx('whoosh', 0.8, 0.5); }
        return false;
      }
      if (!this.grounded) { this.vy = m.fallV * (this.psychoMove === 'downB' ? 1.3 : 1); this.vx *= 0.9; }
      if (this.grounded && !this.dropLanded) {
        this.dropLanded = true;
        this.gnashWave(this.psychoMove === 'downB' ? PM.wave : m.wave, this.x, this.y, 'gw' + this.attackId, this.psychoMove === 'downB');
        this.setState('land'); this.landLag = m.slamLag; return true;
      }
      if (this.t >= m.frames && !this.grounded) this.t = m.frames - 1;                    // keep plunging until he lands (or falls off)
      return false;
    }
    return false;
  }
  /** PSYCHO RISE (up special): the higher launch, and the neon pillar round him hitting all the way up. */
  psychoRise() {
    const u = this.def.moves.upb, P = this.def.show.psycho.moves.upb, M = this.match;
    if (this.t > u.riseAt && !this.psychoRose) { this.psychoRose = true; this.vy = P.riseV; sfx('djump', 1, 0.5); M.shake(8, 8); }
    const L = P.pillar;
    if (this.t > u.riseAt && this.pillarTicks < L.ticks && this.age - this.pillarAt >= L.every) {   // a pulse of the pillar every `every` frames, `ticks` in all
      this.pillarAt = this.age; this.pillarTicks++;
      for (const o of M.fighters) {
        if (o === this || !o.alive || o.team === this.team || o.state === 'respawn' || o.isIntangible()) continue;
        if (Math.abs(o.x - this.x) < L.w && o.y > this.y - L.h && o.y < this.y + 30) M.applyHit(o, { h: this.pillarTicks >= L.ticks ? L.last : L, owner: this, facing: this.facing, id: 'gnPR' + this.slot + ':' + o.slot + ':' + this.pillarTicks + ':' + this.age }, this.x);
      }
    }
  }
  /** A PSYCHO blast at x, y: everyone within B.r is launched away from it; a neon ring and a flash. */
  psychoBlast(B, x, y, id) {
    const M = this.match;
    for (const o of M.fighters) {
      if (o === this || !o.alive || o.team === this.team || o.state === 'respawn' || o.isIntangible()) continue;
      if (Math.hypot(o.x - x, o.y - 26 - y) < B.r) M.applyHit(o, { h: B, owner: this, facing: Math.sign(o.x - x) || this.facing, id: id + ':' + o.slot }, x);
    }
    (this.ringFx || (this.ringFx = [])).push({ x, y, r: B.r, t: 0 });
    sfx('bighit', 1, 0.5); sfx('glitch', 0.6, 0.6); M.shake(14, 14);
    const n = neonOf(this);
    for (let i = 0; i < 30; i++) { const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 5; M.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 22, color: [n[0], n[1], 0xffffff][i % 3], size: 3, grav: 0 }); }
  }
  /** The shockwave of a slam: everyone on that floor within `W.reach` either way is hit up; dust, cracks (PSYCHO: pillars). */
  gnashWave(W, x, y, id, psycho) {
    const M = this.match; sfx('bighit', 1, 0.55); sfx('clang', 0.5, 0.6); M.shake(psycho ? 20 : 12, psycho ? 20 : 14);
    for (const o of M.fighters) {
      if (o === this || !o.alive || o.team === this.team || o.state === 'respawn' || o.isIntangible()) continue;
      if (Math.abs(o.x - x) < W.reach && Math.abs(o.y - y) < (W.height || 30)) M.applyHit(o, { h: W, owner: this, facing: Math.sign(o.x - x) || this.facing, id: id + ':' + o.slot }, x);
    }
    this.splinters(x, y, psycho ? 30 : 18);
    this.waveFx = { x, y, t: 0, reach: W.reach, psycho: !!psycho };
  }
  /** Rock chips and dust kicked up off the floor at x, y. */
  splinters(x, y, n) {
    for (let i = 0; i < n; i++) this.match.particles.push({ x: x + (Math.random() - 0.5) * 30, y: y - 2, vx: (Math.random() - 0.5) * 7, vy: -2 - Math.random() * 4, life: 26 + Math.random() * 10, color: [0x8a7a6a, 0x5a4a3a, 0xc8b8a0][i % 3], size: 2 + (i % 2), grav: 0.25 });
  }

  // ------------------------------------------------------------------ the axe: thrown, stuck, picked back up
  /** AXE THROW: the axe hurled straight ahead (PSYCHO THROW if that's the move) - his hands are empty till he gets it back. */
  throwAxe(spec) {
    if (this.axeOut && this.axeOut.alive) return;
    const P = this.psychoMove === 'sideB' ? this.def.show.psycho.moves.sideB : null;
    this.axeOut = new GnashAxe(this.match, this, spec, P); this.match.projectiles.push(this.axeOut);
    this.disarm();
  }
  /** The keys and folder of his no-axe sheets for the costume he's wearing. */
  noAxeKeys() {
    const set = skinInfo(this.def.id, this.skin).sheetSet, own = !!(set && this.def.costumeSheets && this.def.costumeSheets[set]);
    return { pre: own ? 'gn_' + set + '_noaxe_' : 'gn_noaxe_', dir: this.def.noAxeDir + (own ? set + '/' : ''), own };
  }
  /** Loads his no-axe sheets in the background at the start of the match (so the swap is instant when he throws). */
  loadNoAxe() {
    const K = this.noAxeKeys(), sc = this.scene, tm = sc.textures, F = this.def.frameSizes;
    for (const k of ['idle', 'run', 'jump', 'fall', 'moves']) {                 // each sheet queued once, ever (a load still in flight from
      const key = K.pre + k;                                                     // an earlier match finishes on its own and adds the texture)
      if (tm.exists(key) || QUEUED.has(key)) continue;
      QUEUED.add(key);
      sc.load.spritesheet(key, K.dir + k + '_sheet.png', k === 'moves' ? { frameWidth: F.moves[0], frameHeight: F.moves[1] } : { frameWidth: F.strip[0], frameHeight: F.strip[1] });
    }
    if (sc.load.list.size && !sc.load.isLoading()) sc.load.start();
  }
  /** Empty-handed: his no-axe sheets as soon as they're in (gnashTick keeps trying via showNoAxe). */
  disarm() {
    this.unarmed = true; this.noAxeOn = false; this.armedSheets = this.armedSheets || this.sheets;
    this.loadNoAxe(); this.showNoAxe();
  }
  /** Switches him to his no-axe sheets if they've loaded (true when done). */
  showNoAxe() {
    if (!this.unarmed || this.noAxeOn) return true;
    const K = this.noAxeKeys(), tm = this.scene.textures, keys = ['idle', 'run', 'jump', 'fall', 'moves'];
    if (!keys.every((k) => tm.exists(K.pre + k))) return false;
    const out = {};
    for (const k of keys) out[k] = K.own ? K.pre + k : skinTexture(this.scene, K.pre + k, this.def.id, this.skin);
    this.sheets = { ...this.armedSheets, ...out }; this.noAxeOn = true;
    return true;
  }
  /** The axe back in his hands (picked up, or brought back - `quiet` skips the fanfare). */
  rearm(quiet) {
    if (this.axeOut && this.axeOut.alive) this.axeOut.kill();
    this.axeOut = null; this.axeBack = 0;
    if (!this.unarmed) return;
    this.unarmed = false; this.noAxeOn = false;
    if (this.armedSheets) this.sheets = this.armedSheets;
    this.armedSheets = null;
    if (quiet) return;
    const m = this.match, n = neonOf(this);
    m.popText(this, 'GOT IT!', css(n[0])); sfx('shing', 0.7, 0.7); sfx('clang', 0.5, 0.9);
    for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2; m.particles.push({ x: this.x, y: this.y - 20, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, life: 18, color: i % 2 ? n[0] : n[1], size: 2, grav: 0.1 }); }
  }
  /** The thrown axe went off the stage: it finds its way back to him after `lostAfter` frames. */
  axeLost() { this.axeOut = null; this.axeBack = this.def.show.unarmed.lostAfter; }

  // ------------------------------------------------------------------ Limit
  /**
   * EXECUTIONER (type 'executioner'): he crouches, leaps (leapAt) and hangs at the top (hangFrom-hangTo) drifting over
   * the nearest foe; then he drops like a meteor and the axe comes down - whoever is within `reach` of where he lands
   * takes the blow, everyone on that floor the shockwave. Ends when he's landed and the dust settles.
   */
  executionerLimit(L) {
    const M = this.match;
    if (this.t === 1) { this.ult = { landed: 0, tgt: null }; sfx('limit', 0.6, 0.8); sfx('roar', 0.8, 0.7); M.shake(6, 10); }
    const U = this.ult; this.lx = 0;
    if (this.t < L.leapAt) { this.vx = 0; this.vy = this.grounded ? 0 : 0.5; }
    else if (this.t === L.leapAt) { this.vy = L.leapV; this.grounded = false; this.platform = null; sfx('djump', 0.8, 0.6); this.splinters(this.x, this.y, 10); }
    else if (this.t < L.hangFrom) { this.vy = Math.min(0, this.vy + 0.5); this.vx *= 0.9; }
    else if (this.t <= L.hangTo) {
      if (!U.tgt || !U.tgt.alive) {
        let bd = 1e9; U.tgt = null;
        for (const o of M.fighters) { if (o === this || !o.alive || o.team === this.team || o.state === 'respawn') continue; const d = Math.abs(o.x - this.x); if (d < bd) { bd = d; U.tgt = o; } }
      }
      this.vy = Math.sin(this.t * 0.2) * 0.3;
      if (U.tgt) { this.vx = (U.tgt.x - this.x) * L.track; this.facing = Math.sign(U.tgt.x - this.x) || this.facing; }
      if (this.t % 4 === 0) M.particles.push({ x: this.x + (Math.random() - 0.5) * 30, y: this.y - 70, vx: 0, vy: 0.6, life: 20, color: neonOf(this)[0], size: 2, grav: 0 });
    } else if (!U.landed) {
      this.vx *= 0.8; this.vy = L.dropV;
      if (this.t % 2 === 0) M.particles.push({ x: this.x + (Math.random() - 0.5) * 16, y: this.y - 30, vx: 0, vy: -3, life: 14, color: Math.random() < 0.5 ? neonOf(this)[1] : neonOf(this)[0], size: 3, grav: 0 });
      if (this.grounded || this.t > L.frames + 60) {
        U.landed = this.t; this.vx = 0;
        if (this.t < 102) this.t = 102;                 // the chop frame of his animation
        for (const o of M.fighters) {
          if (o === this || !o.alive || o.team === this.team || o.state === 'respawn' || o.isIntangible()) continue;
          if (Math.hypot(o.x - (this.x + this.facing * 20), o.y - this.y) < L.reach) M.applyHit(o, { h: L.blow, owner: this, facing: this.facing, pillar: true, id: 'gnX' + this.slot + ':' + o.slot + ':' + this.age }, this.x);
        }
        if (this.grounded) this.gnashWave(L.wave, this.x, this.y, 'gnXw' + this.age, true);
        M.popText(this, 'OFF WITH IT!', css(neonOf(this)[0])); sfx('ko', 0.7, 0.7);
        for (let i = 0; i < 30; i++) M.particles.push({ x: this.x + (Math.random() - 0.5) * 30, y: this.y - 10, vx: (Math.random() - 0.5) * 2, vy: -3 - Math.random() * 6, life: 34, color: [neonOf(this)[0], neonOf(this)[1], 0xffffff][i % 3], size: 3, grav: 0.12 });
      } else if (this.t >= 100) this.t = 100;          // hold the overhead pose until he hits the floor
    }
    if (U.landed) { this.vx = 0; if (!this.grounded) this.vy = Math.max(this.vy, 3); }
    if (U.landed && this.t >= U.landed + 36) { this.invincible = 30; this.ult = null; this.setState(this.grounded ? 'idle' : 'air'); }
  }

  // ------------------------------------------------------------------ drawing
  /** Everything GNASH draws round himself (from drawShow): neon glow, sparks, slash trails, X marks, rings, shockwaves, PSYCHO moves, EXECUTIONER. */
  drawGnash(g, spr) {
    const s = this.state, n = neonOf(this), f = this.facing, m = this.match;
    if (!this.slashFx) { this.slashFx = []; this.xMarks = []; this.ringFx = []; }
    if (this.alive && s !== 'respawn') {                       // his neon: a soft glow off the horns, sparks where the blade drags
      const flick = this.anim % 97 < 3 ? 0.3 : 1;
      g.fillStyle(n[0], 0.07 * flick); g.fillEllipse(this.x + f * 4, this.y - (this.def.headTop || 64) + 6, 40, 20);
      if (!this.unarmed && (s === 'run' || s === 'idle') && this.grounded && (s === 'idle' ? this.anim % 40 === 0 : this.anim % 2 === 0))
        m.particles.push({ x: this.x - f * (48 + Math.random() * 14), y: this.y - 2, vx: -f * (0.5 + Math.random() * 2) + this.vx * 0.3, vy: -1 - Math.random() * 2, life: 14, color: Math.random() < 0.5 ? 0xffe0a0 : n[0], size: 2, grav: 0.15 });
      if (this.psychoMeter >= this.def.show.psycho.max || this.psychoMove) {   // PSYCHO: a pulsing neon aura
        const p = 0.5 + 0.5 * Math.sin(this.anim * 0.3);
        g.fillStyle(n[0], 0.06 + 0.06 * p); g.fillEllipse(this.x, this.y - 32, 76 + 10 * p, 92 + 10 * p);
        g.lineStyle(1.5, n[1], 0.25 + 0.3 * p); g.strokeEllipse(this.x, this.y - 32, 70 + 12 * p, 86 + 12 * p); g.lineStyle(0);
      }
    }
    // the neon slash trails: every active hitbox leaves an arc where the axe passed, fading over a few frames
    if (s === 'attack' && this.move && this.move.hits) for (const hb of this.activeHitboxes()) {
      const cx = this.x, cy = this.y - 30, bx = (hb.x1 + hb.x2) / 2, by = (hb.y1 + hb.y2) / 2;
      this.slashFx.push({ cx, cy, r: Math.max(18, Math.hypot(bx - cx, by - cy) + 8), a: Math.atan2(by - cy, bx - cx), w: Math.max(hb.x2 - hb.x1, hb.y2 - hb.y1), t: 0 });
    }
    this.slashFx = this.slashFx.filter((S) => S.t++ < 9);
    for (const S of this.slashFx) {
      const k = 1 - S.t / 9, span = 0.35 + S.w / (S.r * 3);
      g.lineStyle(6 * k, n[0], 0.5 * k); g.beginPath(); g.arc(S.cx, S.cy, S.r, S.a - span, S.a + span); g.strokePath();
      g.lineStyle(2 * k, 0xffffff, 0.9 * k); g.beginPath(); g.arc(S.cx, S.cy, S.r, S.a - span * 0.8, S.a + span * 0.8); g.strokePath();
    }
    g.lineStyle(0);
    // the X marks: a neon X slashed across whoever he hit
    this.xMarks = this.xMarks.filter((X) => X.t++ < 16);
    for (const X of this.xMarks) {
      const k = 1 - X.t / 16, r = (14 + X.t * 1.5) * X.s, c = Math.cos(X.a), si = Math.sin(X.a);
      const line = (dx, dy) => g.lineBetween(X.x - (dx * c - dy * si) * r, X.y - (dx * si + dy * c) * r, X.x + (dx * c - dy * si) * r, X.y + (dx * si + dy * c) * r);
      g.lineStyle(7 * k, n[0], 0.7 * k); line(1, 1); line(1, -1);
      g.lineStyle(2.5 * k, 0xffffff, k); line(1, 1); line(1, -1);
    }
    g.lineStyle(0);
    // PSYCHO blasts: neon rings
    this.ringFx = this.ringFx.filter((R) => R.t++ < 20);
    for (const R of this.ringFx) { const k = R.t / 20, r = R.r * (0.3 + 0.8 * k); g.lineStyle(8 * (1 - k), n[0], 0.8 * (1 - k)); g.strokeCircle(R.x, R.y, r); g.lineStyle(3 * (1 - k), n[1], 1 - k); g.strokeCircle(R.x, R.y, r * 0.85); g.fillStyle(0xffffff, 0.25 * (1 - k)); g.fillCircle(R.x, R.y, r * 0.5); }
    g.lineStyle(0);
    if (s === 'attack' && this.move && this.move.gnash === 'seethe') {   // SEETHE: neon heat shimmer rings
      for (let i = 0; i < 2; i++) { const r = 20 + ((this.anim * 2 + i * 20) % 40); g.lineStyle(2, n[0], 0.5 * (1 - r / 60)); g.strokeEllipse(this.x, this.y - 30, r * 1.4, r); } g.lineStyle(0);
    }
    if (this.psychoMove === 'upb' && s === 'upb') {             // PSYCHO RISE: the pillar of neon round him
      const L = this.def.show.psycho.moves.upb.pillar, flick = 0.7 + 0.3 * Math.sin(this.anim * 0.8);
      g.fillStyle(n[0], 0.3 * flick); g.fillRect(this.x - L.w, this.y - L.h, L.w * 2, L.h + 30);
      g.fillStyle(0xffffff, 0.35 * flick); g.fillRect(this.x - 6, this.y - L.h, 12, L.h + 30);
    }
    const W = this.waveFx;                                     // a slam's shockwave racing out both ways
    if (W) {
      W.t++; const k = W.t / 18, r = W.reach * Math.min(1, k * 1.4);
      for (const d of [-1, 1]) {
        g.fillStyle(n[0], 0.8 * (1 - k)); g.fillTriangle(W.x + d * r, W.y, W.x + d * (r - 30), W.y, W.x + d * (r - 10), W.y - 18 * (1 - k));
        g.fillStyle(0xffffff, 0.9 * (1 - k)); g.fillTriangle(W.x + d * r, W.y, W.x + d * (r - 14), W.y, W.x + d * (r - 5), W.y - 9 * (1 - k));
        if (W.psycho) for (let j = 1; j <= 4; j++) { const px = W.x + d * j * W.reach / 4.5; if (Math.abs(px - W.x) <= r) { g.fillStyle(n[j % 2], 0.6 * (1 - k)); g.fillRect(px - 6, W.y - 120 * (1 - k), 12, 120 * (1 - k)); } }
      }
      g.fillStyle(0x2a1a14, 0.6 * (1 - k)); for (let i = -3; i <= 3; i++) g.fillRect(W.x + i * 10 - 1, W.y - 1, 3, 2 + Math.abs(i));
      if (W.t >= 18) this.waveFx = null;
    }
    if (s === 'attack' && this.moveName === 'downB2' && this.dropStall > 0) {   // hanging before the drop: neon gathering on the axe
      const k = 1 - this.dropStall / (this.psychoMove === 'downB' ? this.def.show.psycho.moves.downB.stall : this.move.stall);
      g.fillStyle(n[0], 0.15 + 0.25 * k); g.fillCircle(this.x, this.y - 60, 14 + 22 * k);
      g.lineStyle(2, n[1], 0.6); g.strokeCircle(this.x, this.y - 60, 40 * (1 - k) + 10); g.lineStyle(0);
    }
    if (s === 'limit' && this.ult && this.def.limit.type === 'executioner') {
      const L = this.def.limit, U = this.ult;
      if (U.tgt && U.tgt.alive && this.t >= L.hangFrom && !U.landed) {   // the mark on the condemned: a neon X
        const x = U.tgt.x, y = U.tgt.y - 30, r = 16 + Math.sin(this.t * 0.4) * 3;
        g.lineStyle(2, n[0], 0.9); g.strokeCircle(x, y, r); g.lineBetween(x - r, y - r, x + r, y + r); g.lineBetween(x - r, y + r, x + r, y - r); g.lineStyle(0);
      }
      if (U.landed && this.t < U.landed + 24) {                  // the pillar of neon
        const k = 1 - (this.t - U.landed) / 24;
        g.fillStyle(n[0], 0.8 * k); g.fillRect(this.x + f * 20 - 24 * k, this.y - 240, 48 * k, 240);
        g.fillStyle(0xffffff, k); g.fillRect(this.x + f * 20 - 9 * k, this.y - 240, 18 * k, 240);
      }
    }
  }

  /**
   * His PSYCHO meter on his player plate (from hud.js), right of the name tab, over his damage %: a slanted neon bar
   * with a little X-eyed mask; full, it flashes PSYCHO! (`x`, `y` = the plate's top left).
   */
  drawPsychoHud(g, x, y, frame) {
    const P = this.def.show.psycho, k = Math.min(1, (this.psychoMeter || 0) / P.max), n = neonOf(this), full = k >= 1;
    const bx = x + 60, by = y + 3, bw = 62, bh = 7;
    g.fillStyle(0x000000, 0.7); g.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    g.fillStyle(0x1a0a1e, 1); g.fillRect(bx, by, bw, bh);
    if (k > 0) { g.fillStyle(full ? (frame % 10 < 5 ? 0xffffff : n[0]) : n[0], 1); g.fillRect(bx, by, Math.round(bw * k), bh); g.fillStyle(0xffffff, 0.35); g.fillRect(bx, by, Math.round(bw * k), 2); }
    for (let q = 1; q < 4; q++) { g.fillStyle(0x07060e, 1); g.fillRect(bx + (bw * q) / 4, by, 1, bh); }
    if (full) { g.lineStyle(1, n[1], 0.5 + 0.5 * Math.sin(frame * 0.4)); g.strokeRect(bx - 2, by - 2, bw + 4, bh + 4); g.lineStyle(0); }
    const mx = bx - 7, my = by + 3;                                                   // the mask: black, two neon X eyes
    g.fillStyle(0x000000, 1); g.fillCircle(mx, my, 6); g.fillStyle(0x1c1c24, 1); g.fillCircle(mx, my, 5);
    g.fillStyle(n[0], 1); g.fillTriangle(mx - 5, my - 4, mx - 3, my - 4, mx - 5, my - 9); g.fillTriangle(mx + 5, my - 4, mx + 3, my - 4, mx + 5, my - 9);   // horns
    g.lineStyle(1, n[1], 1); for (const ex of [-2, 2]) { g.lineBetween(mx + ex - 1, my - 2, mx + ex + 1, my); g.lineBetween(mx + ex + 1, my - 2, mx + ex - 1, my); } g.lineStyle(0);
    if (!this.psychoText) { this.psychoText = this.match.add.text(0, 0, '', { fontFamily: FONT, fontSize: '5px', color: '#ffffff', stroke: '#07060e', strokeThickness: 2 }).setOrigin(0.5).setDepth(12); this.match.addUI(this.psychoText); }
    this.psychoText.setText(full ? (frame % 20 < 10 ? 'PSYCHO!' : 'READY') : 'PSYCHO').setPosition(bx + bw / 2, by + bh / 2 + 0.5).setVisible(!this.eliminated);
  }

  /**
   * The PSYCHO cut-in (from MatchScene's overlay, while it's frozen): the screen goes dark, neon slashes tear across,
   * his mask slams in huge with its X eyes and grin blazing, the move's name, glitch bars, then a white flash.
   * `o` = the overlay Graphics (screen space), `C` = match.psychoCut.
   */
  drawPsychoCut(o, C) {
    const W = 640, H = 360, t = C.t, L = C.len, inK = Math.min(1, t / 8), outK = t > L - 8 ? (L - t) / 8 : 1, a = inK * outK;
    o.fillStyle(0x05030a, 0.82 * a); o.fillRect(0, 0, W, H);
    o.fillStyle(0x000000, 1); o.fillRect(0, 0, W, 40 * a); o.fillRect(0, H - 40 * a, W, 40 * a);   // letterbox
    for (let i = 0; i < 14; i++) {                                                      // speed lines rushing past
      const yy = 40 + ((i * 53 + t * 9) % (H - 80)), len = 80 + (i * 37) % 120, xx = ((i * 97 + t * 26) % (W + 200)) - 100;
      o.fillStyle(i % 3 ? C.color : C.color2, 0.18 * a); o.fillRect(xx, yy, len, 2);
    }
    const sx = 170 + (1 - Math.min(1, t / 10)) * -260, sy = 182, R = 92;                // his mask, slamming in from the left
    o.fillStyle(C.color, 0.25 * a); o.fillCircle(sx, sy, R + 18 + 6 * Math.sin(t * 0.6));
    o.fillStyle(0x000000, a); o.fillCircle(sx, sy, R + 4); o.fillStyle(0x1c1c24, a); o.fillCircle(sx, sy, R);
    o.fillStyle(0x2e2e3a, a); o.fillEllipse(sx - 30, sy - 40, 50, 26);
    for (const d of [-1, 1]) {                                                          // the neon horns
      o.fillStyle(C.color, a); o.fillTriangle(sx + d * 50, sy - 70, sx + d * 78, sy - 64, sx + d * 92, sy - 150);
      o.fillStyle(0xffffff, a); o.fillTriangle(sx + d * 62, sy - 70, sx + d * 72, sy - 68, sx + d * 88, sy - 140);
    }
    const blaze = t % 6 < 3 ? 0xffffff : C.color2;
    for (const ex of [-34, 34]) {                                                       // the X eyes
      o.lineStyle(12, C.color2, a); o.lineBetween(sx + ex - 16, sy - 36, sx + ex + 16, sy - 4); o.lineBetween(sx + ex + 16, sy - 36, sx + ex - 16, sy - 4);
      o.lineStyle(4, blaze, a); o.lineBetween(sx + ex - 16, sy - 36, sx + ex + 16, sy - 4); o.lineBetween(sx + ex + 16, sy - 36, sx + ex - 16, sy - 4);
    }
    const zig = [[-62, 30], [-41, 12], [-20, 40], [0, 12], [20, 40], [41, 12], [62, 30]];   // the zig-zag grin
    o.lineStyle(9, C.color, a); o.beginPath(); o.moveTo(sx + zig[0][0], sy + zig[0][1]); for (const [zx, zy] of zig) o.lineTo(sx + zx, sy + zy); o.strokePath();
    o.lineStyle(3, 0xffffff, a); o.beginPath(); o.moveTo(sx + zig[0][0], sy + zig[0][1]); for (const [zx, zy] of zig) o.lineTo(sx + zx, sy + zy); o.strokePath();
    o.lineStyle(0);
    if (t >= 8) {                                                                       // two big neon slashes across the screen
      const k = Math.min(1, (t - 8) / 6);
      for (const [y0, y1, col] of [[60, 300, C.color], [300, 70, C.color2]]) { o.lineStyle(14 * (1 - k * 0.6), col, 0.85 * a); o.lineBetween(280, y0, 280 + 360 * k, y0 + (y1 - y0) * k); o.lineStyle(3, 0xffffff, a); o.lineBetween(280, y0, 280 + 360 * k, y0 + (y1 - y0) * k); }
      o.lineStyle(0);
    }
    for (let i = 0; i < 4; i++) if ((t + i * 7) % 11 < 2) { o.fillStyle(i % 2 ? C.color : C.color2, 0.5 * a); o.fillRect(0, 50 + ((t * 31 + i * 71) % 260), W, 3 + i); }   // glitch bars
    if (t < 3 || t > L - 3) { o.fillStyle(0xffffff, 0.8); o.fillRect(0, 0, W, H); }   // the flashes in and out
    const T = this.match.bigText;                                                      // the move's name
    if (T && t >= 12) { T.setText(C.name).setFontSize(22).setAlpha(a).setPosition(460, 186).setColor(css(C.color)); T.psycho = true; }
  }
}

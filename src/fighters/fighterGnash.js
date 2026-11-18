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
const NEONS = { gnashBlood: [0xff3a2a, 0xffb02a], gnashStone: [0x8aff2a, 0xd8ff3a], gnashArcade: [0xff3fd0, 0x3af0ff], gnashMoon: [0x8aa8ff, 0xff3a3a], gnashVirus: [0xff2a8a, 0x3af0ff], gnashPop: [0xe8281e, 0x1e64d8], gnashExec: [0x9a1a10, 0xff6a20] };
/** His two neon colours for the costume he's wearing (its `style`). */
function neonOf(f) { return NEONS[f.style] || [0xff3ad0, 0x3af0ff]; }
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
    this.skinHit(t, hb, big);
  }
  /**
   * A map costume's own hit effect: HIGH SCORE pops an arcade score (+100 a point of damage) and pixel squares;
   * GRAVEMOON flashes a crescent moon over them; INFECTED.EXE throws up an error window that shakes and glitches;
   * POP LINES bursts a flat cartoon star in a thick black line, black energy dashes shooting out of it; EXECUTIONER
   * leaves a dark red cleave mark across them with chips of stone flying, and tolls a bell on the big ones.
   */
  skinHit(t, hb, big) {
    const st = this.style, m = this.match, x = t.x, y = t.y - 30;
    if (!this.gnSkinFx) this.gnSkinFx = [];
    if (st === 'gnashArcade') {
      m.popText(t, '+' + String(Math.round((hb.h.dmg || 1) * 100 * (big ? 2 : 1))).padStart(4, '0'), Math.random() < 0.5 ? '#3af0ff' : '#ffc85a');
      for (let i = 0; i < 6; i++) this.gnSkinFx.push({ k: 'px', x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 30, vy: -0.6 - Math.random(), t: 0, c: [0xff3fd0, 0x3af0ff, 0xffc85a][i % 3] });
    } else if (st === 'gnashMoon') this.gnSkinFx.push({ k: 'moon', x, y: y - 10, t: 0, s: big ? 1.4 : 1 });
    else if (st === 'gnashVirus') this.gnSkinFx.push({ k: 'err', x: x + (Math.random() - 0.5) * 20, y: y - 14, t: 0, s: big ? 1.3 : 1 });
    else if (st === 'gnashExec') {
      this.gnSkinFx.push({ k: 'cleave', x, y: y - 6, t: 0, s: big ? 1.4 : 1, f: this.facing });
      if (big) sfx('clang', 0.45, 0.42);                                         // the bell tolls
    } else if (st === 'gnashPop') this.gnSkinFx.push({ k: 'pop', x, y, t: 0, s: big ? 1.4 : 1, c: [0xffd21e, 0x2ec850, 0x1e64d8, 0xff7ab0][Math.floor(Math.random() * 4)] });
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
        if (this.dropStall === 0) { this.t = m.fallAt; this.dropFrom = this.y; sfx('whoosh', 0.8, 0.5); }
        return false;
      }
      if (!this.grounded) { this.vy = m.fallV * (this.psychoMove === 'downB' ? 1.3 : 1); this.vx *= 0.9; }
      if (this.grounded && !this.dropLanded) {
        this.dropLanded = true;
        this.gnashWave(this.psychoMove === 'downB' ? PM.wave : m.wave, this.x, this.y, 'gw' + this.attackId, this.psychoMove === 'downB');
        // ... and he BOUNCES off the floor: the further he fell, the higher he goes (`bounce` = the share of the drop he gets back)
        const fell = Math.max(0, this.y - (this.dropFrom ?? this.y)), B = m.bounce;
        const v = Math.min(B.maxV, Math.sqrt(2 * 0.42 * fell * B.k));
        if (v >= B.minV) {
          this.setState('air'); this.vy = -v; this.grounded = false; this.platform = null; this.fastFalling = false;
          sfx('djump', 0.6, 0.6 + 0.4 * (1 - v / B.maxV));
          for (let i = 0; i < 12; i++) M.particles.push({ x: this.x + (Math.random() - 0.5) * 30, y: this.y, vx: (Math.random() - 0.5) * 3, vy: 1 + Math.random() * 3, life: 16, color: neonOf(this)[i % 2], size: 2, grav: 0 });
        } else { this.setState('land'); this.landLag = m.slamLag; }
        return true;
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
    if (this.alive && s !== 'respawn') {                       // the PSYCHO meter over his head, too (a small bar with horns)
      const P = this.def.show.psycho, k = Math.min(1, (this.psychoMeter || 0) / P.max), w = 40, bx = this.x - w / 2, by = this.y - (this.def.tagY || 74) - 12;
      g.fillStyle(0x000000, 0.75); g.fillRect(bx - 1, by - 1, w + 2, 6);
      g.fillStyle(0x1a0a1e, 1); g.fillRect(bx, by, w, 4);
      if (k > 0) { g.fillStyle(k >= 1 ? (this.anim % 10 < 5 ? 0xffffff : n[0]) : n[0], 1); g.fillRect(bx, by, w * k, 4); g.fillStyle(0xffffff, 0.4); g.fillRect(bx, by, w * k, 1); }
      g.fillStyle(n[0], 1); g.fillTriangle(bx - 1, by - 1, bx + 3, by - 1, bx - 3, by - 6); g.fillTriangle(bx + w + 1, by - 1, bx + w - 3, by - 1, bx + w + 3, by - 6);
    }
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
    this.drawGnashSkinFx(g);
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
   * The map costumes' own effects round him: HIGH SCORE - neon pixels drift up off him, a little sunset reflection on
   * the floor; GRAVEMOON - pale wisps curl up round his feet, his lantern glows, a bat flits off now and then;
   * INFECTED.EXE - glitch blocks flicker over him, the odd scanline slips sideways; POP LINES - black energy dashes
   * pulse out round him on the beat (in a ring of them while he attacks); EXECUTIONER - torch embers drift up off him,
   * cold smoke round his boots, and now and then a crow flaps away. Plus each one's hit effects
   * (skinHit) playing out.
   */
  drawGnashSkinFx(g) {
    const st = this.style;
    if (!st || !NEONS[st] || st === 'gnashBlood' || st === 'gnashStone') return;
    const a = this.anim, x = this.x, y = this.y, f = this.facing, on = this.alive && this.state !== 'respawn';
    if (!this.gnSkinFx) this.gnSkinFx = [];
    const FX = this.gnSkinFx;
    if (on && st === 'gnashArcade') {
      if (a % 7 === 0) FX.push({ k: 'px', x: x + (Math.random() - 0.5) * 34, y: y - Math.random() * 60, vy: -0.4 - Math.random() * 0.5, t: 0, c: [0xff3fd0, 0x3af0ff, 0xffc85a][a % 3] });
      if (this.grounded) { g.fillStyle(0xff3fd0, 0.18); g.fillEllipse(x, y + 1, 54, 6); g.fillStyle(0xffc85a, 0.25); g.fillRect(x - 14, y, 28, 1); g.fillRect(x - 8, y + 2, 16, 1); }
    }
    if (on && st === 'gnashMoon') {
      if (a % 9 === 0) FX.push({ k: 'wisp', x: x + (Math.random() - 0.5) * 40, y: y - 2, t: 0, ph: Math.random() * 6 });
      if (a % 240 === 120) FX.push({ k: 'bat', x: x - f * 10, y: y - 50, vx: -f * (1.4 + Math.random()), t: 0 });
      const lx = x - f * 9, ly = y - 44 + 6, p = 0.6 + 0.4 * Math.sin(a * 0.15);   // (round his belt: where the lantern hangs)
      g.fillStyle(0xff6a20, 0.12 * p); g.fillCircle(lx, ly, 12); g.fillStyle(0xffc060, 0.2 * p); g.fillCircle(lx, ly, 5);
    }
    if (on && st === 'gnashVirus') {
      if (a % 53 < 4 || (this.state === 'attack' && a % 11 < 2)) for (let i = 0; i < 4; i++) {   // glitch blocks over him
        const bx = x + (Math.random() - 0.5) * 40, by = y - 10 - Math.random() * 60;
        g.fillStyle([0xff2a8a, 0x3af0ff, 0x108484, 0xffffff][i], 0.55); g.fillRect(bx, by, 6 + Math.random() * 16, 2 + Math.random() * 3);
      }
      if (a % 120 < 2) { g.fillStyle(0x3af0ff, 0.35); g.fillRect(x - 24, y - 40 - (a % 30), 48, 2); }
    }
    if (on && st === 'gnashPop') {                               // the energy dashes: a pulse every beat, a ring of them while he swings
      const att = this.state === 'attack' || this.state === 'upb' || this.state === 'limit', beat = (a % 24) / 24, n = att ? 12 : 8;
      if (att || beat < 0.5) {
        const k = att ? (a % 8) / 8 : beat * 2, cy = y - 36;
        g.lineStyle(att ? 3 : 2, 0x000000, 1 - k * 0.6);
        for (let i = 0; i < n; i++) {
          const q = (i / n) * Math.PI * 2 + (att ? 0 : 0.2), r0 = 34 + k * 12, r1 = r0 + (att ? 10 : 7);
          g.lineBetween(x + Math.cos(q) * r0 * 0.8, cy + Math.sin(q) * r0, x + Math.cos(q) * r1 * 0.8, cy + Math.sin(q) * r1);
        }
        g.lineStyle(0);
      }
    }
    if (on && st === 'gnashExec') {
      if (a % 6 === 0) FX.push({ k: 'ember', x: x + (Math.random() - 0.5) * 30, y: y - 20 - Math.random() * 40, t: 0, ph: Math.random() * 6 });
      if (a % 300 === 150) FX.push({ k: 'crow', x: x + this.facing * 8, y: y - 60, vx: -this.facing * (1.6 + Math.random()), t: 0 });
      if (this.grounded) for (let i = 0; i < 3; i++) { g.fillStyle(0x2a2428, 0.18); g.fillEllipse(x + Math.sin(a * 0.03 + i * 2) * 16, y - 2, 34, 7); }
    }
    for (let i = FX.length - 1; i >= 0; i--) {
      const P = FX[i]; P.t++;
      if (P.k === 'px') {                                        // a neon pixel square, drifting up and blinking out
        P.y += P.vy; if (P.t > 40) { FX.splice(i, 1); continue; }
        if (P.t < 30 || P.t % 4 < 2) { g.fillStyle(P.c, 0.9); g.fillRect(Math.round(P.x / 2) * 2, Math.round(P.y / 2) * 2, 3, 3); }
      } else if (P.k === 'wisp') {                               // a pale wisp, curling up and fading
        if (P.t > 50) { FX.splice(i, 1); continue; }
        const k = P.t / 50, wx = P.x + Math.sin(P.ph + P.t * 0.12) * 5, wy = P.y - P.t * 0.7;
        g.fillStyle(0xc8d0ff, 0.22 * (1 - k)); g.fillCircle(wx, wy, 4 + 3 * k); g.fillStyle(0xffffff, 0.25 * (1 - k)); g.fillCircle(wx, wy, 1.5);
      } else if (P.k === 'bat') {                                // a little black bat flapping away
        if (P.t > 70) { FX.splice(i, 1); continue; }
        P.x += P.vx; const by = P.y - P.t * 0.5 + Math.sin(P.t * 0.4) * 3, w = P.t % 8 < 4 ? 5 : 2;
        g.fillStyle(0x0b0922, 0.9); g.fillTriangle(P.x - w - 2, by - (w > 3 ? 2 : -1), P.x, by, P.x - 1, by + 2); g.fillTriangle(P.x + w + 2, by - (w > 3 ? 2 : -1), P.x, by, P.x + 1, by + 2); g.fillRect(P.x - 1, by - 1, 2, 3);
        g.fillStyle(0xff3a3a, 1); g.fillRect(P.x, by, 1, 1);
      } else if (P.k === 'moon') {                               // a crescent moon flashing over whoever he hit
        if (P.t > 20) { FX.splice(i, 1); continue; }
        const k = P.t / 20, r = (12 + 8 * k) * P.s;
        g.fillStyle(0x7470d0, 0.3 * (1 - k)); g.fillCircle(P.x, P.y, r + 6);
        g.fillStyle(0xe6eaff, 1 - k); g.fillCircle(P.x, P.y, r); g.fillStyle(0x17143e, 1 - k); g.fillCircle(P.x + r * 0.45, P.y - r * 0.2, r * 0.85);
      } else if (P.k === 'ember') {                              // a torch ember, flickering up and out
        if (P.t > 40) { FX.splice(i, 1); continue; }
        const ex = P.x + Math.sin(P.ph + P.t * 0.15) * 3, ey = P.y - P.t * 0.6;
        g.fillStyle(P.t % 6 < 3 ? 0xffb050 : 0xff6a20, 1 - P.t / 40); g.fillRect(Math.round(ex), Math.round(ey), 2, 2);
      } else if (P.k === 'crow') {                               // a crow flapping off
        if (P.t > 80) { FX.splice(i, 1); continue; }
        P.x += P.vx; const by = P.y - P.t * 0.45 + Math.sin(P.t * 0.35) * 3, w = P.t % 8 < 4 ? 7 : 2;
        g.fillStyle(0x0a0808, 0.95); g.fillTriangle(P.x - w - 3, by - (w > 3 ? 3 : -1), P.x, by, P.x - 1, by + 2); g.fillTriangle(P.x + w + 3, by - (w > 3 ? 3 : -1), P.x, by, P.x + 1, by + 2);
        g.fillEllipse(P.x, by, 6, 4); g.fillStyle(0xd0a030, 1); g.fillRect(P.x + (P.vx > 0 ? 3 : -4), by - 1, 2, 1);
      } else if (P.k === 'cleave') {                             // a heavy dark red cleave mark across whoever he hit, stone chips flying
        if (P.t > 22) { FX.splice(i, 1); continue; }
        const k = P.t / 22, L = 46 * P.s, cy = P.y - 30;
        g.lineStyle(5 * P.s * (1 - k) + 1, 0x5a0a0a, 1 - k); g.lineBetween(P.x - L / 2 * P.f, cy - L / 2, P.x + L / 2 * P.f, cy + L / 2);
        g.lineStyle(2 * (1 - k) + 0.5, 0xff6a20, (1 - k) * 0.9); g.lineBetween(P.x - L / 2 * P.f, cy - L / 2, P.x + L / 2 * P.f, cy + L / 2); g.lineStyle(0);
        for (let j = 0; j < 6; j++) { const q = j * 1.05 + 0.3, d = 6 + P.t * 2.2; g.fillStyle(j % 2 ? 0x6e7290 : 0x46485e, 1 - k); g.fillRect(P.x + Math.cos(q) * d, cy + Math.sin(q) * d * 0.6 + P.t * P.t * 0.05, 3, 2); }
      } else if (P.k === 'pop') {                                // a flat cartoon star burst, thick black line, dashes flying out
        if (P.t > 18) { FX.splice(i, 1); continue; }
        const k = P.t / 18, R = (14 + 10 * k) * P.s, cy = P.y - 30, pts = [];
        for (let j = 0; j < 16; j++) { const q = j / 16 * Math.PI * 2 + 0.2, r = j % 2 ? R * 0.5 : R; pts.push({ x: P.x + Math.cos(q) * r, y: cy + Math.sin(q) * r }); }
        if (k < 0.7) { g.fillStyle(0x000000, 1); g.fillPoints(pts.map((p) => ({ x: P.x + (p.x - P.x) * 1.18, y: cy + (p.y - cy) * 1.18 })), true); g.fillStyle(P.c, 1); g.fillPoints(pts, true); }
        g.lineStyle(3, 0x000000, 1 - k);
        for (let j = 0; j < 8; j++) { const q = j / 8 * Math.PI * 2, r0 = R * 1.3 + k * 16, r1 = r0 + 8; g.lineBetween(P.x + Math.cos(q) * r0, cy + Math.sin(q) * r0, P.x + Math.cos(q) * r1, cy + Math.sin(q) * r1); }
        g.lineStyle(0);
      } else if (P.k === 'err') {                                // a Windows error box, shaking, then glitching away
        if (P.t > 26) { FX.splice(i, 1); continue; }
        const s = P.s, w = 34 * s, h = 18 * s, j = P.t < 8 ? (P.t % 2 ? 2 : -2) : 0, X = P.x - w / 2 + j, Y = P.y - h / 2, al = P.t > 18 ? (P.t % 2 ? 0.3 : 0.9) : 1;
        g.fillStyle(0x0a0a12, al); g.fillRect(X - 1, Y - 1, w + 2, h + 2);
        g.fillStyle(0xc0c0c0, al); g.fillRect(X, Y, w, h); g.fillStyle(0xffffff, al); g.fillRect(X, Y, w, 1); g.fillRect(X, Y, 1, h);
        g.fillStyle(0x0a2484, al); g.fillRect(X + 1, Y + 1, w - 2, 4 * s);
        g.fillStyle(0xc0c0c0, al); g.fillRect(X + w - 5 * s, Y + 1.5, 3 * s, 3 * s);
        g.fillStyle(0xff2a2a, al); g.fillCircle(X + 6 * s, Y + 11 * s, 3 * s); g.fillStyle(0xffffff, al); g.fillRect(X + 6 * s - 0.5, Y + 9 * s, 1, 3 * s);
        g.fillStyle(0x2a2a2a, al); g.fillRect(X + 12 * s, Y + 9 * s, 16 * s, 1); g.fillRect(X + 12 * s, Y + 12 * s, 11 * s, 1);
        if (P.t > 18) { g.fillStyle(0xff2a8a, 0.6); g.fillRect(X + 4, Y + (P.t % 3) * 5, w, 2); }
      }
    }
    if (FX.length > 80) FX.splice(0, FX.length - 80);
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
   * The PSYCHO cut-in (from MatchScene's overlay, while it's frozen), drawn like an old arcade game - the NEON ARCADE's
   * world on a CRT: a pixel-block wipe in, a synthwave sunset with a scrolling grid floor, his mask as a big chunky
   * pixel sprite stepping in, a 1UP / HI-SCORE bar, the move's name in the pixel font with a hard drop shadow, PSYCHO!
   * blinking, scanlines and a block wipe out. `o` = the overlay Graphics (screen space), `C` = match.psychoCut.
   */
  drawPsychoCut(_o, C) {
    const o = this.psychoCutText().g; o.clear();                                       // (its own layer, over the HUD and menus)
    const W = 640, H = 360, t = C.t, L = C.len, B = 8;                                 // B: the size of one big "pixel"
    const snap = (v) => Math.round(v / B) * B, blk = (x, y, w, h, col, a = 1) => { o.fillStyle(col, a); o.fillRect(snap(x), snap(y), Math.max(B, snap(w)), Math.max(B, snap(h))); };
    const SKY = [0x0d0221, 0x150530, 0x1f0a40, 0x2b0f52, 0x3d1462, 0x541d6e, 0x6e2373, 0x8a2876, 0xa52d78, 0xc2357a, 0xe0407c];
    const SUN = [0xffe56a, 0xffc85a, 0xffa058, 0xff7a62, 0xff5a72, 0xff3f86];
    const hz = 208;                                                                     // the horizon
    for (let i = 0; i < SKY.length; i++) { o.fillStyle(SKY[i], 1); o.fillRect(0, i * hz / SKY.length, W, hz / SKY.length + 1); }
    for (let i = 0; i < 26; i++) { const sx = (i * 137) % W, sy = (i * 71) % (hz - 60); if ((t + i) % 9 > 1) blk(sx, sy, 4, 4, 0xf0e6ff, 0.8); }   // twinkling stars
    const sx = 470, sr = 72;                                                            // the striped synthwave sun
    for (let y = -sr; y < 0; y += 4) {
      const band = Math.floor((y + sr) / (sr / SUN.length)), gap = y > -sr * 0.55 && ((y + t) & 12) === 0;
      if (gap) continue;
      const half = Math.sqrt(sr * sr - y * y); o.fillStyle(SUN[Math.min(SUN.length - 1, band)], 1); o.fillRect(sx - half, hz + y, half * 2, 4);
    }
    o.fillStyle(0x14042a, 1); o.fillRect(0, hz, W, H - hz);                             // the grid floor, scrolling toward you
    o.lineStyle(2, 0xff3fd0, 0.9);
    for (let i = -12; i <= 12; i++) o.lineBetween(W / 2 + i * 22, hz, W / 2 + i * 150, H);
    for (let j = 0; j < 9; j++) { const k = ((j + (t * 0.08) % 1) / 9), y = hz + (H - hz) * k * k; o.lineStyle(2, j % 2 ? 0xff3fd0 : 0x8a2aa0, 0.9); o.lineBetween(0, y, W, y); }
    o.lineStyle(0);
    // his mask, a big pixel sprite, stepping in from the left a block at a time
    const mx = snap(-120 + Math.min(1, t / 12) * 300), my = 190, n = C.color, n2 = C.color2, R = 10.5;
    const cell = (cx, cy, col) => { o.fillStyle(col, 1); o.fillRect(mx + cx * B, my + cy * B, B, B); };
    for (let cy = -11; cy <= 11; cy++) for (let cx = -12; cx <= 12; cx++) {
      const d = Math.hypot(cx, cy * 1.05);
      if (d <= R - 1) cell(cx, cy, cx < -3 && cy < -4 && d > R - 4 ? 0x3a3a4a : 0x1c1c24);
      else if (d <= R) cell(cx, cy, 0x000000);
    }
    for (const sgn of [-1, 1]) for (let i = 0; i < 7; i++) { cell(sgn * (7 + Math.round(i * 0.55)), -9 - i, i < 5 ? n : 0xffffff); if (i < 5) cell(sgn * (8 + Math.round(i * 0.55)), -9 - i, n); }   // the neon horns
    const blink = t % 16 < 12 ? n2 : 0xffffff;
    for (const ex of [-4, 4]) for (let i = -2; i <= 2; i++) { cell(ex + i, -3 + i, blink); cell(ex - i, -3 + i, blink); }   // the X eyes
    for (let cx = -7; cx <= 7; cx++) { cell(cx, ((cx + 7) % 4 < 2) ? 3 : 5, n); if ((cx + 7) % 2 === 1) cell(cx, 4, n); }   // the zig-zag grin
    // the CRT: scanlines, a soft glow at the edges, the odd rolling bar
    for (let y = 0; y < H; y += 3) { o.fillStyle(0x000000, 0.22); o.fillRect(0, y, W, 1); }
    o.fillStyle(0xffffff, 0.04); o.fillRect(0, (t * 7) % H, W, 14);
    o.lineStyle(10, 0x000000, 0.6); o.strokeRoundedRect(4, 4, W - 8, H - 8, 26); o.lineStyle(0);
    // the arcade text: 1UP / HI-SCORE, the move's name, PSYCHO! blinking
    const T = this.psychoCutText();
    T.top.setText('1UP  ' + String(Math.min(999999, 1000 * t + 4210)).padStart(6, '0') + '        HI-SCORE  999999').setVisible(true);
    T.blink.setText(t % 20 < 12 ? 'PSYCHO!' : '').setColor(css(n2)).setVisible(true);
    T.foot.setText('CREDIT 01   GNASH  PLAYER 1').setVisible(true);
    const big = this.match.bigText;
    if (big && t >= 10) { big.setText(C.name).setFontSize(20).setAlpha(1).setPosition(452, 112).setColor(css(n)).setShadow(4, 4, '#14042a', 0, true, true).setDepth(47); big.psycho = true; }
    // the pixel-block wipes: in (blocks clearing away) and out (blocks filling in)
    const wipe = t < 10 ? 1 - t / 10 : t > L - 10 ? (t - (L - 10)) / 10 : 0;
    if (wipe > 0) for (let y = 0; y < H; y += 40) for (let x = 0; x < W; x += 40) { const r = ((x * 7 + y * 13) % 100) / 100; if (r < wipe) { o.fillStyle(r < wipe * 0.5 ? 0x000000 : n, 1); o.fillRect(x, y, 40, 40); } }
  }
  /** The cut-in's arcade lettering (made once, on the UI layer). */
  psychoCutText() {
    const m = this.match;
    if (!m.psychoTexts) {
      const mk = (x, y, size, col) => { const t = m.add.text(x, y, '', { fontFamily: FONT, fontSize: size + 'px', color: col, stroke: '#14042a', strokeThickness: 4 }).setOrigin(0.5).setDepth(46).setVisible(false); m.addUI(t); return t; };
      const g = m.add.graphics().setDepth(44); m.addUI(g);
      m.psychoTexts = { g, top: mk(320, 22, 8, '#ffffff'), blink: mk(452, 150, 12, '#3af0ff'), foot: mk(320, 340, 7, '#ffd23f') };
    }
    return m.psychoTexts;
  }
  /** The cut-in is over: its lettering away, the big text back as it was. */
  endPsychoCut() {
    const m = this.match;
    if (m.psychoTexts) { for (const k in m.psychoTexts) if (k !== 'g') m.psychoTexts[k].setVisible(false); m.psychoTexts.g.clear(); }
    const b = m.bigText;
    if (b && b.psycho) { b.psycho = false; b.setText('').setFontSize(28).setAlpha(1).setColor('#ffffff').setShadow(0, 0, '#000000', 0).setPosition(320, 150).setDepth(20); }
  }
}

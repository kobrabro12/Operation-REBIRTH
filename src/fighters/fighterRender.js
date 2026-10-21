// Fighter methods: Drawing: animation frames, sprites, costume auras, trails, battle-worn stages.
// Mixed into the Fighter class (Fighter.js) - `this` is the fighter.
import { PLAYER_TINTS } from '../config.js';
import { sfx } from '../audio/sfx.js';
import { drawBubble } from './entities.js';

// swoosh shape for moves that don't name one (Fighter.drawSwoosh)
const SWOOSH_BY_MOVE = { dashAttack: 'low', jab: 'jab', ftilt: 'arc', utilt: 'up', dtilt: 'low', fsmash: 'arc', usmash: 'up', dsmash: 'low2', nair: 'spin', fair: 'arc', bair: 'back', uair: 'up', dair: 'down', neutralB: 'arc', sideB: 'arc', downB: 'low2' };

export class FighterRender {

  // ------------------------------------------------------------------ Battle-Worn costume
  // Damage stage = stocks lost (0-3). In Stamina battles (one stock) it follows her HP instead:
  // below 75%, 50% and 25% of her stamina.
  updateWorn() {
    const stage = this.match.mode === 'stamina'
      ? Math.min(3, Math.floor((1 - Math.max(0, this.hp) / this.maxHp) * 4))
      : Math.min(3, this.falls);
    if (stage === this.wornStage) return;
    this.wornStage = stage; this.sheets = this.def.wornSheets[stage];
    if (stage > 0 && this.alive) {                    // pieces of armour break off
      for (let i = 0; i < 6 + stage * 4; i++) this.match.puff(this.x + (Math.random() - 0.5) * 20, this.y - 20 - Math.random() * 28, i % 3 ? 0x929ca0 : 0x4c5a5f, 1);
      sfx('shield', 0.6, 0.5); sfx('land', 0.6, 0.7);
    }
  }

  // Which strip and frame to show, for fighters with their own animations (def.ownAnims).
  animFrame(s) {
    let S = this.sheets;
    const N = this.def.frameCounts;
    if (this.swordOut && s !== 'swordthrow' && S.idle_u) {   // sword out spinning: the empty-handed strips
      S = { ...S, idle: S.idle_u, run: S.run_u, jump: S.jump_u, fall: S.fall_u, hit: S.hit_u };
    }
    const loop = (k, rate) => ({ sheet: S[k], frame: Math.floor(this.anim / rate) % N[k] });
    const once = (k, t, total) => ({ sheet: S[k], frame: Math.max(0, Math.min(N[k] - 1, Math.floor((t / total) * N[k]))) });
    // taking damage: the Take Hit strip plays through (16 ticks) even if the hitstun is shorter
    if (this.hurtAnim > 0 && !['attack', 'upb', 'dying', 'limit', 'ledge', 'ledgeclimb', 'ledgeroll', 'ledgeattack', 'grabbed'].includes(s)) {
      return { sheet: S.hit, frame: Math.min(N.hit - 1, Math.floor((16 - this.hurtAnim) / 4)) };
    }
    switch (s) {
      case 'run': {
        this.runPhase = ((this.runPhase || 0) + 0.1 + Math.abs(this.vx) * 0.06) % N.run;
        return { sheet: S.run, frame: Math.floor(this.runPhase) };
      }
      case 'air': return this.vy < 0 ? once('jump', this.t, 12) : loop('fall', 6);
      case 'helpless': return { ...loop('fall', 8), alpha: this.anim % 16 < 8 ? 1 : 0.8 };
      case 'airdodge': return { ...loop('fall', 6), alpha: 0.55 };
      case 'hitstun': return once('hit', this.t, 16);                      // the Take Hit strip on every hit
      case 'grabbed': return { sheet: S.hit, frame: N.hit - 1 };
      case 'dizzy': return { sheet: S.hit, frame: N.hit - 1, rot: Math.sin(this.t * 0.2) * 0.15 };
      case 'dying': return once('death', this.t, 66);
      case 'attack': {
        const m = this.move || {}, G = S.grab;
        if (this.moveName === 'grab' && G) {        // reach out, grab at full stretch, pull the empty hand back on a miss
          const t = this.t;
          return { sheet: G, frame: t < 3 ? 0 : t < 5 ? 1 : t < 12 ? 2 : t < 18 ? 1 : 0 };
        }
        if (this.moveName === 'throw' && G) {       // throws land instantly, so she's in the throw pose from the first frame
          const d = this.throwDir;
          return { sheet: G, frame: d === 'up' ? 6 : d === 'down' ? 7 : 5, flip: d === 'back' };
        }
        const MA = this.def.moveAnims && this.def.moveAnims[this.moveName];
        if (MA && S.moves) return { sheet: S.moves, frame: MA[0] + Math.min(MA[1] - 1, Math.floor(this.t / MA[2])) };   // her own move animation
        return { ...once(m.anim || 'attack2', this.t, m.frames || 28), flip: !!m.flip };
      }
      case 'upb': {
        const u = this.def.moves.upb;
        if (!u.spin) return once('attack1', this.t, u.frames);
        if (this.spinGround && this.spinStart < 0) return { sheet: S.attack1, frame: 1, rot: (this.spinCharge >= u.ground.chargeMax && this.anim % 4 < 2) ? 0.04 : 0 };   // charging, sword raised
        const st = this.spinGround ? this.t - this.spinStart : this.t - u.riseAt;
        const spinning = this.spinGround ? st < u.ground.spin - 6 : (st >= 0 && st < 22);
        if (!spinning) return st < 0 ? { sheet: S.attack1, frame: 1 } : { sheet: S.attack2, frame: 6 };
        return { sheet: S.attack2, frame: 1, flip: Math.floor(st / 3) % 2 === 1 };   // sword held out, turning
      }
      case 'swingcharge': {                          // sword drawn back for the swing; trembles once fully charged
        const full = this.swingCharge >= this.def.moves.neutralB.charge.max;
        return { sheet: S.attack2, frame: 0, rot: full && this.anim % 4 < 2 ? 0.03 * this.facing : 0 };
      }
      case 'swordthrow': {                           // wind up with the sword, then hand out while it spins
        if (this.t < this.def.moves.sideB.sword.throwAt) return { sheet: S.attack2, frame: this.t < 4 ? 0 : 1 };
        return { sheet: S.grab, frame: 8 };                     // follow-through: hand out, sword gone
      }
      case 'holding': return S.grab ? { sheet: S.grab, frame: this.t < 4 ? 3 : 4 } : { sheet: S.attack2, frame: 0 };   // grip, then hold them at arm's length
      case 'counter': return { sheet: S.guard || S.attack2, frame: 0 };      // crouched guard, sword angled down toward the opponent
      case 'counterstrike': return this.t < 2 ? { sheet: S.attack2, frame: 2 } : once('attack2', this.t - 2 + 6, 26);
      case 'limit': {
        const L = this.def.limit, U = this.ult;
        if (L.type !== 'blade') return this.t < L.beamStart ? once('attack1', this.t, L.beamStart) : { sheet: S.attack1, frame: 5 };
        if (!U || U.phase === 'grow') return { sheet: S.attack1, frame: 1 };                       // giant sword held high
        if (U.phase === 'slash') return (this.t - L.slashFrom) < (L.slashTo - L.slashFrom) * 0.3 ? { sheet: S.attack1, frame: 1 } : { sheet: S.guard, frame: 0 };   // raised -> swung down
        if (U.phase === 'whiff') return { sheet: S.guard, frame: 0 };
        if (U.appearAt !== undefined && U.ct >= U.appearAt) {                                      // the last cut
          if (U.ct < U.finalAt) return U.charge > 0 ? { sheet: S.attack1, frame: 1 } : { sheet: S.attack2, frame: 0 };   // sword drawn back (or raised high to charge)
          const st = U.ct - U.finalAt;                                                             // the rising cut, then the sword lifted high
          return st < 9 ? { sheet: S.attack2, frame: 2 + Math.floor(st / 3) } : { sheet: S.attack1, frame: 1 };
        }
        return { sheet: S.attack2, frame: U.ct % L.cutEvery < 2 ? 4 : 5 };                        // mid-dash between cuts
      }
      case 'taunt': {
        const MA = this.def.moveAnims && this.def.moveAnims.taunt;
        if (MA && S.moves) return { sheet: S.moves, frame: MA[0] + Math.min(MA[1] - 1, Math.floor(this.t / MA[2])) };
        return loop('idle', 6);
      }
      case 'ledge': return { sheet: S.fall, frame: 0 };
      case 'ledgeclimb': return once('jump', this.t, 18);
      case 'ledgeattack': return this.t < 14 ? once('jump', this.t, 14) : once('attack2', this.t - 14, 16);
      case 'ledgeroll': case 'roll': return { ...loop('run', 3), alpha: 0.55 };
      case 'spotdodge': return { ...loop('idle', 6), alpha: 0.55 };
      case 'land': case 'jumpsquat': return { sheet: S.idle, frame: 0 };
      default: return loop('idle', 6);
    }
  }

  // Which of def.moveAnims plays in this state (null: none, fall back to the idle-based poses).
  moveAnimKey(s) {
    const A = this.def.moveAnims;
    const k = s === 'attack' ? (this.moveName === 'throw' ? 'throw_' + this.throwDir : this.moveName)
      : s === 'dizzy' ? 'hitstun' : s;
    return A[k] ? k : null;
  }

  // ------------------------------------------------------------------ drawing
  render(frameCount) {
    const spr = this.sprite, g = this.fx, d = this.def;
    g.clear(); this.fxBack.clear();
    if (!this.alive) return;
    this.anim++;
    spr.setPosition(Math.round(this.x), Math.round(this.y));
    spr.setFlipX(d.facesLeft ? this.facing > 0 : this.facing < 0);
    spr.setRotation(0); spr.setScale(1, 1); spr.setAlpha(1);

    const alt = this.sheets.juggle || this.sheets.idle;   // pose sheet (fighters without one reuse their idle frames)
    let sheet = this.sheets.idle, frame = Math.floor(this.anim / 6) % 32;
    const s = this.state;
    if (s !== 'run') this.runPhase = 0;
    if (s === 'run' && this.sheets.run && !d.ownAnims) {   // run: straight into the stride (frames 3-7) the moment he moves, faster at speed
      this.runPhase = (this.runPhase || 0) + 0.11 + Math.abs(this.vx) * 0.035;
      const [from, count] = d.runCycle || [3, 5];
      sheet = this.sheets.run; frame = from + Math.floor(this.runPhase) % count;
    }
    else if (s === 'run' && this.sheets.walk) {      // walk cycle: the stride speeds up with ground speed
      this.walkPhase = ((this.walkPhase || 0) + Math.max(0.08, Math.abs(this.vx) * 0.055)) % 8;
      sheet = this.sheets.walk; frame = Math.floor(this.walkPhase);
      spr.setRotation(Phaser.Math.Clamp(this.vx * 0.012, -0.05, 0.05));
    }
    else if (s === 'run') { frame = Math.floor(this.anim / 3) % 32; spr.setRotation(0.1 * this.facing); spr.y -= (Math.floor(this.anim / 5) % 2); }
    else if (s === 'jumpsquat' || s === 'land') spr.setScale(1.08, 0.9);
    else if ((s === 'air' || s === 'helpless' || s === 'airdodge') && this.sheets.jump) {   // rising: legs tucked, flame pushed low; falling: legs hanging, flame streaming up
      sheet = this.vy < 0 ? this.sheets.jump : this.sheets.fall; frame = Math.floor(this.anim / 5) % 4;
      spr.setRotation(Phaser.Math.Clamp(this.vx * 0.03, -0.15, 0.15));
    }
    else if (s === 'air' || s === 'helpless' || s === 'airdodge') { frame = 4; spr.setRotation(Phaser.Math.Clamp(this.vx * 0.04, -0.2, 0.2)); }
    else if (s === 'hitstun' || s === 'dizzy') { frame = 10; spr.setRotation(Math.sin(this.t * 0.5) * 0.35 * this.facing); }
    else if (s === 'charge') { sheet = alt; frame = 1 + (Math.floor(this.t / 8) % 2); }
    else if (s === 'attack') {
      sheet = alt; frame = this.t < 4 ? 1 : 3;
      const lean = { ftilt: 0.18, fsmash: 0.25, fair: 0.2, bair: -0.2, dtilt: 0.1, utilt: -0.1, usmash: -0.15, uair: -0.12, dair: 0.15, nair: 0, jab: 0.08, grab: 0.12, throw: 0.15, neutralB: 0.12, sideB: 0.12 }[this.moveName] || 0;
      if ((this.moveName === 'nair' || this.moveName === 'dsmash') && this.t > 3 && this.t < 14) spr.setRotation(this.t * 0.9 * this.facing);
      else spr.setRotation(lean * this.facing);
    }
    else if (s === 'summon') { sheet = alt; frame = this.t < 20 ? 2 : 12; spr.setScale(1, this.t < 20 ? 0.94 : 1.04); }
    else if (s === 'upb') { frame = 6; spr.setScale(0.92, 1.12); }
    else if (s === 'limit') { sheet = alt; frame = 12; if (!['undertow', 'mosh', 'screensaver', 'level0'].includes(d.limit.type)) spr.y -= Math.min(16, this.t / 2); }
    else if (s === 'roll' || s === 'spotdodge') spr.setAlpha(0.55);
    else if (s === 'ledge') { frame = 6; spr.setRotation(-0.12 * this.facing); }
    else if (s === 'ledgeclimb' || s === 'ledgeattack') { frame = s === 'ledgeattack' && this.t >= 14 ? 3 : 6; if (s === 'ledgeattack' && this.t >= 14) sheet = alt; spr.setScale(1, this.t < 6 ? 1.08 : 1); }
    else if (s === 'ledgeroll') { spr.setAlpha(0.55); frame = 6; }
    else if (s === 'holding') { sheet = alt; frame = 1; }
    else if (s === 'grabbed') { frame = 10; spr.setRotation(-0.2 * this.facing); }
    if (this.hurtAnim > 0) this.hurtAnim--;
    const ma = !d.ownAnims && d.moveAnims && this.sheets.moves && this.moveAnimKey(s);
    if (ma) {                                  // a drawn animation for this move: it carries its own lean and squash
      const [from, n, step, loop] = d.moveAnims[ma], i = Math.floor(this.t / step);
      sheet = this.sheets.moves; frame = from + (loop ? i % n : Math.min(n - 1, i));
      spr.setRotation(0); spr.setScale(1, 1);
    }
    if (d.ownAnims) {                          // fighters drawn from their own animation strips
      const a = this.animFrame(s);
      sheet = a.sheet; frame = a.frame;
      spr.setRotation(a.rot || 0); spr.setAlpha(a.alpha ?? 1); spr.y = Math.round(this.y);
      if (s !== 'jumpsquat' && s !== 'land') spr.setScale(1, 1);
      if (a.flip) spr.setFlipX(!spr.flipX);
    }
    if (spr.texture.key !== sheet) spr.setTexture(sheet, frame); else spr.setFrame(frame);
    if (d.movesOrigin) {                       // the move frames are bigger, so their feet sit at a different spot
      const mo = sheet === this.sheets.moves ? d.movesOrigin : [d.originX ?? 0.5, d.originY];
      if (spr.originX !== mo[0] || spr.originY !== mo[1]) spr.setOrigin(mo[0], mo[1]);
    }

    // hit flash and invincibility blink
    if (this.silhouette > 0) { this.silhouette--; spr.setTint(0x120e1c).setTintMode(Phaser.TintModes.FILL); }    // frozen by a counter
    else if (this.flash > 0) { this.flash--; spr.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL); }
    else { spr.setTint(this.possessed > 0 ? (this.anim % 16 < 8 ? 0xb07ad0 : 0x8a5ad0) : this.curse > 0 ? 0xb07ad0 : this.slow > 0 ? 0x8a80b0 : PLAYER_TINTS[this.slot]).setTintMode(Phaser.TintModes.MULTIPLY); }
    if (this.star > 0 && !this.silhouette && !this.flash) {         // Star Candy: cycling through every colour, sparkling
      const c = Phaser.Display.Color.HSVToRGB(((this.anim * 8) % 360) / 360, 0.55, 1);
      spr.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b)).setTintMode(Phaser.TintModes.MULTIPLY);
      if (this.anim % 4 === 0) this.match.particles.push({ shape: 'star', x: this.x + (Math.random() - 0.5) * 28, y: this.y - Math.random() * this.body.h, vx: 0, vy: -0.4, life: 18, color: [0xf3c358, 0xffffff, 0x9ab8ff, 0xff7aa8][(this.anim >> 2) % 4], grav: 0 });
    } else if (this.isIntangible() && s !== 'limit' && s !== 'counterstrike' && (this.anim >> 2) % 2) spr.setAlpha(0.45);
    if (this.swift > 0 && Math.abs(this.vx) > 1.5 && this.anim % 3 === 0) this.match.particles.push({ x: this.x - Math.sign(this.vx) * 10, y: this.y - 6 - Math.random() * 30, vx: -this.vx * 0.3, vy: 0, life: 12, color: 0x5ee07a, size: 2, grav: 0 });
    if (s === 'limit' && d.limit.type === 'undertow' && this.ult) {          // The Undertow: melted into the puddle
      const U = this.ult;
      if (U.phase === 'melt') { const k = Math.min(1, this.t / d.limit.melt); spr.setScale(1 + k * 0.6, 1 - k * 0.92); spr.setTint(this.pal.shade).setTintMode(Phaser.TintModes.FILL); }
      else spr.setAlpha(0);
    } else if (this.reform > 0) { this.reform--; spr.setScale(1 + this.reform * 0.03, 1 - this.reform * 0.055); }
    if (this.vfx) { this.drawSkinAura(g); this.drawTrail(spr); }
    if (s === 'swingcharge') {                      // Grand Slam: a glowing point at the blade's tip, swelling with the charge
      const C = d.moves.neutralB.charge, k = this.swingCharge / C.max, full = k >= 1;
      const tx = this.x + this.facing * C.tip[0], ty = this.y + C.tip[1], pulse = full && this.anim % 6 < 3 ? 2 : 0;
      const [spark, hot] = this.chargeColors();
      g.fillStyle(full ? hot : spark, 0.25 + 0.25 * k); g.fillCircle(tx, ty, 3 + 6 * k + pulse);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(tx, ty, 1.5 + 1.5 * k);
    }

    // name tag
    this.tag.setPosition(Math.round(this.x), Math.round(this.y - (d.tagY || 60) - (s === 'limit' ? 16 : 0)));
    this.updateSpeech();

    // possessed by Soul Hex: wisps circling the head and a bar that shrinks as you wiggle free
    if (this.possessed > 0) {
      const top = this.y - (d.tagY || 60) - 26;
      for (let k = 0; k < 4; k++) {
        const a = this.anim * 0.15 + k * Math.PI / 2;
        g.fillStyle(k % 2 ? 0x6d26bd : 0xb07ad0, 1); g.fillRect(this.x + Math.cos(a) * 16 - 2, this.y - (d.body.h + 6) + Math.sin(a) * 5 - 2, 4, 4);
      }
      const w = 36, k = Math.max(0, this.possessed / this.possessMax), shake = this.wiggleFx > 0 ? (this.anim % 2 ? 2 : -2) : 0;
      if (this.wiggleFx > 0) this.wiggleFx--;
      g.fillStyle(0x0b0a14, 0.85); g.fillRect(this.x - w / 2 - 1 + shake, top - 1, w + 2, 6);
      g.fillStyle(0xb07ad0, 1); g.fillRect(this.x - w / 2 + shake, top, w * k, 4);
      if (!this.isCpu && this.anim % 30 < 20) { g.fillStyle(0xf3c358, 1); g.fillTriangle(this.x - 4 + shake, top - 9, this.x + 4 + shake, top - 9, this.x + shake, top - 3); }
    }
    // hands gripping the stage edge while hanging
    if (s === 'ledge' && this.ledge) {
      const L = this.ledge, hx = L.x - L.side * 3;
      g.fillStyle(0x0b0a14, 1); g.fillRect(hx - 4, L.y - 3, 8, 5);
      g.fillStyle(0x3a3440, 1); g.fillRect(hx - 3, L.y - 2, 6, 3);
      g.fillStyle(0xf3c358, 1); g.fillRect(hx - 3, L.y - 2, 6, 1);
    }
    // respawn platform
    if (s === 'respawn') {
      g.fillStyle(0x78a0c6, 1); g.fillRect(this.x - 22, this.y, 44, 4);
      g.fillStyle(0xf0f2f3, 1); g.fillRect(this.x - 18, this.y, 36, 2);
    }
    // shield bubble
    if (s === 'shield') {
      const r = 10 + 22 * (this.shieldHp / 60);
      g.fillStyle(this.color, 0.35); g.fillCircle(this.x, this.y - 25, r);
      g.lineStyle(2, 0xffffff, 0.6); g.strokeCircle(this.x, this.y - 25, r);
    }
    // charging fireball in hand
    if (s === 'charge') {
      const k = this.charge / d.moves.fireball.chargeMax;
      const hx = this.x + this.facing * d.handOffset.x, hy = this.y + d.handOffset.y;
      const r = 3 + k * 7 + (this.t % 6 < 3 ? 1 : 0);
      const P = this.pal;
      g.fillStyle(P.deep, 1); g.fillRect(hx - r, hy - r, r * 2, r * 2);
      g.fillStyle(P.light, 1); g.fillRect(hx - r * 0.65, hy - r * 0.65, r * 1.3, r * 1.3);
      g.fillStyle(P.core, 1); g.fillRect(hx - r * 0.3, hy - r * 0.3, r * 0.6, r * 0.6);
      if (k >= 1 && this.t % 10 < 5) { g.lineStyle(1, 0xf0f2f3, 1); g.strokeRect(hx - r - 3, hy - r - 3, r * 2 + 6, r * 2 + 6); }
    }
    // Soulfire Jet: a flickering column of blue flame under his feet
    if (s === 'upb' && d.moves.upb.jet) {
      const u = d.moves.upb, j = u.jet;
      if (this.t >= u.riseAt && this.t <= j.to + 4) {
        const fade = this.t > j.to ? 1 - (this.t - j.to) / 5 : Math.min(1, (this.t - u.riseAt + 1) / 3);
        const len = (46 + (this.anim % 4) * 5) * fade, fy = this.y - 2;
        const cols = [[0x1a1020, 1.12], [this.pal.deep, 1], [this.pal.light, 0.62], [this.pal.core, 0.26]];   // outer, middle, white-hot core
        for (const [col, wk] of cols) {
          g.fillStyle(col, 1);
          for (let k = 0; k < len; k += 2) {
            const taper = 1 - k / (len + 2);
            const wob = Math.round(Math.sin(this.anim * 0.7 - k * 0.22) * 3 * (k / len));      // the column sways as it flows down
            const jag = (((this.anim * 7 + k * 13) % 5) - 2) * (wk > 0.9 ? 1 : 0.5);              // ragged flame edges
            const w = Math.max(2, Math.round((26 * wk * (0.3 + 0.7 * taper) + jag) / 2) * 2);
            if (wk < 0.5 && taper < 0.35) continue;                                                // the hot core fades out first
            g.fillRect(this.x - w / 2 + wob, fy + k, w, 2);
          }
        }
        // licks of flame breaking off the tail
        g.fillStyle(this.pal.light, 1);
        for (let k = 0; k < 3; k++) { const ph = (this.anim * 3 + k * 7) % 18; g.fillRect(this.x - 6 + k * 5 + ((this.anim + k) % 3) - 1, fy + len + ph - 6, 3, 3); }
      }
    }
    // Thousand Cuts: the giant sword of light, its swing, and the cuts of the cutscene
    if (s === 'limit' && d.limit.type === 'blade' && this.ult) this.drawBladeLimit(g, d.limit, this.ult);
    if (s === 'limit' && d.limit.type === 'undertow' && this.ult) this.drawUndertow(g, d.limit, this.ult);
    if (s === 'limit' && d.limit.type === 'mosh' && this.ult) this.drawMosh(g, d.limit, this.ult);
    if (s === 'upb' && d.moves.upb.crowd && this.t >= d.moves.upb.riseAt - 2) this.drawCrowdSurf(g);
    if (s === 'upb' && d.moves.upb.bubble && this.t >= d.moves.upb.riseAt - 2 && this.t < d.moves.upb.popAt) drawBubble(g, this.x, this.y - 22, 26 + Math.sin(this.anim * 0.3), this.pal);
    if (this.bubbled > 0) drawBubble(g, this.x, this.y - this.body.h / 2, 26 + Math.sin(this.anim * 0.4), { light: 0x9ff0ff, core: 0xffffff, mid: 0x3fc8ea });
    if (s === 'limit' && this.altLimit && this.ult) this.drawFullAeroLimit(g, (this.baseDef || d).altLimit, this.ult);
    else if (s === 'limit' && d.limit.type === 'screensaver' && this.ult) this.drawScreensaver(g, d.limit, this.ult);
    if (d.backrooms) this.drawWanderer(g, spr);                    // THE WANDERER: torch beam, elevator, noclip, doors, LEVEL 0
    if (this.rage > 0 && this.anim % 3 === 0) this.match.particles.push({ x: this.x + (Math.random() - 0.5) * this.body.w, y: this.y - Math.random() * this.body.h, vx: 0, vy: -1 - Math.random(), life: 14, color: Math.random() < 0.5 ? 0xff4a3a : 0xffa030, size: 2, grav: 0 });   // RAGE MODE flames
    // Riposte: a glint on the raised guard, then a burst of light rays and a long slash when it counters
    if (s === 'counter' && this.counterReady()) {
      const gx = this.x + this.facing * 44, gy = this.y - 19, tw = this.t - d.moves.counter.start;   // glint on the lowered blade
      g.fillStyle(0xe0f4ff, tw < 6 ? 1 : 0.55); g.fillRect(gx - 1, gy - 6, 2, 12); g.fillRect(gx - 6, gy - 1, 12, 2);
      if (tw < 6) { g.fillStyle(0x9ad8f0, 0.5); g.fillRect(gx - 9, gy, 18, 1); g.fillRect(gx, gy - 9, 1, 18); }
      g.fillStyle(0x9ad8f0, 0.12 + 0.08 * Math.sin(this.anim * 0.6)); g.fillEllipse(this.x, this.y - 26, 40, 58);
    }
    if (this.counterFlash > 0) {
      const k = this.counterFlash / 26, cx = this.x + this.facing * 10, cy = this.y - 30;
      this.counterFlash--;
      for (let i = 0; i < 12; i++) {                                   // light rays bursting out
        const a = i * 0.52 + 0.2, len = (40 + (i % 3) * 22) * (1.2 - k * 0.4);
        g.fillStyle(i % 2 ? 0xffffff : 0x9ad8f0, 0.75 * k);
        for (let r = 8; r < len; r += 3) g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), Math.max(1, 3 - r / 30), Math.max(1, 3 - r / 30));
      }
      if (s === 'counterstrike' && this.t >= 2 && this.t <= 12) {     // the long horizontal slash streak
        const reach = 90 * Math.min(1, (this.t - 1) / 4), y0 = this.y - 34;
        g.fillStyle(0x9ad8f0, 0.5 * k + 0.2); g.fillRect(Math.min(this.x, this.x + this.facing * reach), y0 - 4, reach, 9);
        g.fillStyle(0xffffff, 0.95); g.fillRect(Math.min(this.x, this.x + this.facing * reach), y0 - 1, reach, 3);
      }
    }
    // Cyclone Slash: a glowing ring of light around her while she spins; sparks gather while charging
    if (s === 'upb' && d.moves.upb.spin) {
      const u = d.moves.upb, cx = this.x, cy = this.y - 26;
      if (this.spinGround && this.spinStart < 0) {
        const k = this.spinCharge / u.ground.chargeMax, tx = this.x - this.facing * 3, ty = this.y - 68;
        for (let i = 0; i < 6; i++) {
          const a = this.anim * 0.3 + i * 1.05, r = 18 * (1 - ((this.anim + i * 5) % 20) / 20);
          g.fillStyle(this.dragonSpin ? (i % 2 ? 0xf3c358 : 0xe0402a) : (i % 2 ? this.pal.core : this.pal.mid), 0.9); g.fillRect(Math.round(tx + Math.cos(a) * r) - 1, Math.round(ty + Math.sin(a) * r) - 1, 2, 2);
        }
        g.fillStyle(this.dragonSpin ? 0xf3c358 : this.pal.core, 0.25 + 0.5 * k); g.fillCircle(tx, ty, 2 + 4 * k);
        if (k >= 1 && this.anim % 8 < 4) { g.fillStyle(0xffffff, 1); g.fillRect(tx - 1, ty - 1, 3, 3); }
      } else {
        const st = this.spinGround ? this.t - this.spinStart : this.t - u.riseAt;
        const len = this.spinGround ? u.ground.spin - 6 : 22;
        if (st >= 0 && st < len + 6) {
          const fade = st < len ? 1 : 1 - (st - len) / 6;
          const big = this.spinGround ? 1 + 0.3 * (this.spinCharge / u.ground.chargeMax) : 1;
          const rx = 38 * big, ry = (this.spinGround ? 13 : 20) * big, head = st * 0.95 * this.facing;
          if (this.dragonSpin) {                                       // SAMURAI costume: a dragon coils around her instead
            this.drawSpinDragon(g, cx, cy, rx, ry, head, fade, big);
            if (!this.spinGround && st % 3 === 0) this.match.puff(cx + (Math.random() - 0.5) * 30, this.y + 4, Math.random() < 0.5 ? 0xf3c358 : 0xe0402a, 1);
          } else {
          const P = this.pal, cols = [0xffffff, P.core, P.core, P.light, P.mid, P.deep, P.shade];
          // a faint full ring, then a thick glowing crescent sweeping around it
          for (let k = 0; k < 40; k++) {
            const a = (k / 40) * Math.PI * 2;
            g.fillStyle(P.light, 0.22 * fade); g.fillRect(Math.round(cx + Math.cos(a) * rx) - 1, Math.round(cy + Math.sin(a) * ry) - 1, 3, 2);
          }
          for (let pass = 0; pass < 2; pass++) {
            for (let k = 0; k < 34; k++) {
              const a = head - k * 0.15 * this.facing;
              const sz = Math.max(2, Math.round((9 - k * 0.22) * big)) + (pass ? 0 : 4);
              const px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry;
              g.fillStyle(pass ? cols[Math.min(cols.length - 1, Math.floor(k / 5))] : P.mid, (pass ? 0.95 : 0.25) * (1 - k / 36) * fade);
              g.fillRect(Math.round(px - sz / 2), Math.round(py - sz / 2), sz, sz);
            }
          }
          if (!this.spinGround && st % 3 === 0) this.match.puff(cx + (Math.random() - 0.5) * 30, this.y + 4, P.light, 1);   // light streaming below as she rises
          }
        }
      }
    }
    // attack swooshes: a pixel crescent (or ring, sweep, streak) that follows the swing through its
    // active frames and fades out just after, in the costume's ability colours
    for (const hb of this.activeHitboxes()) {
      if (this.state === 'upb' && d.moves.upb.jet && hb.h.angle < 0) continue;   // the flame column is the effect
      if (d.ownAnims && (hb.src && hb.src.anim || this.state === 'upb' || this.state === 'ledgeattack')) continue;   // the strip draws its own sword swipe
      const fx = hb.src && hb.src.fx;
      if (fx === 'grab') continue;
      if (fx === 'hex') {     // Soul Hex: a swirling purple curse with a dark eye
        const cx = (hb.x1 + hb.x2) / 2, cy = (hb.y1 + hb.y2) / 2, rx = (hb.x2 - hb.x1) / 2, ry = (hb.y2 - hb.y1) / 2;
        for (let k = 0; k < 10; k++) { const a = this.t * 0.4 + k * 0.63, r = 0.35 + 0.65 * (k / 10);
          g.fillStyle(k % 2 ? (this.pal === d.pal ? 0xb07ad0 : this.pal.light) : (this.pal === d.pal ? 0x6d26bd : this.pal.mid), 1); g.fillRect(cx + Math.cos(a) * rx * r - 2, cy + Math.sin(a) * ry * r - 2, 4, 4); }
        g.fillStyle(0x0b0a14, 1); g.fillEllipse(cx, cy, 12, 8); g.fillStyle(0xf3c358, 1); g.fillRect(cx - 1, cy - 1, 3, 3);
        continue;
      }
      const h = hb.h, span = Math.max(1, (h.to ?? this.t) - (h.from ?? this.t) + 1);
      const k = h.from !== undefined ? Math.min(1, (this.t - h.from + 1) / span) : 1;
      this.swooshFx = { fx: fx || (this.state === 'upb' ? 'spin' : this.state === 'attack' && SWOOSH_BY_MOVE[this.moveName]) || 'spin', hb: { ...hb }, k, life: 7, x: this.x, y: this.y, facing: this.facing };
    }
    if (this.swooshFx) {
      const S = this.swooshFx;
      if (!this.activeHitboxes().length) { S.life--; S.k = 1; }
      if (S.life <= 0 || !this.alive) this.swooshFx = null;
      else this.drawSwoosh(g, S, (this.x - S.x), (this.y - S.y));
    }
    // off-screen arrow is handled by the HUD
  }
  // One swoosh. S.k = how far through the swing (0..1), S.life fades it out after the hit window.
  // Shapes: arc (overhead to forward), up (front over the head to the back), back (behind), down (a
  // stab under), low (a sweep along the floor), low2 (both sides), spin (a full ring), jab / thrust (streaks)
  drawSwoosh(g, S, ox, oy) {
    const P = this.pal, f = S.facing, hb = S.hb, fade = Math.min(1, S.life / 7);
    const x1 = hb.x1 + ox, x2 = hb.x2 + ox, y1 = hb.y1 + oy, y2 = hb.y2 + oy;
    const bx = S.x + ox, by = S.y + oy, bodyH = this.body.h;
    const cols = [P.deep, P.mid, P.light, P.core];
    // a crescent: arc from a0 to a1 (radians, facing right), the lead at a0 + (a1 - a0) * k
    const crescent = (cx, cy, r, a0, a1, w) => {
      const lead = a0 + (a1 - a0) * S.k, len = Math.abs(lead - a0), dir = Math.sign(a1 - a0) || 1;
      if (len < 0.05) return;
      const steps = Math.max(6, Math.round(r * len / 2));
      for (let i = 0; i <= steps; i++) {
        const q = i / steps, a = lead - dir * len * q;                // q = 0 at the leading edge
        const thick = Math.max(1, w * (1 - q) ** 0.8);
        for (let j = 0; j < thick; j += 2) {
          const rr = r - j, px = cx + Math.cos(a) * rr * f, py = cy + Math.sin(a) * rr;
          const c = cols[Math.min(3, Math.floor((1 - q) * 3 + (j < 2 ? 1 : 0)))];
          g.fillStyle(c, fade * (0.95 - q * 0.6)); g.fillRect(Math.round(px) - 1, Math.round(py) - 1, 2, 2);
        }
      }
    };
    const cy = by - bodyH * 0.55;
    const reachX = Math.max(Math.abs(x1 - bx), Math.abs(x2 - bx)), reachUp = by - y1, reachDown = y2 - cy;
    switch (S.fx) {
      case 'arc': case 'slash': case 'staff': case 'flame': crescent(bx, cy, Math.max(20, Math.hypot(reachX * 0.85, (y2 - y1) * 0.4)), -1.35, 0.75, 9); break;
      case 'up': crescent(bx, cy + 6, Math.max(20, Math.min(reachUp - bodyH * 0.35, 48)), 0.2, -3.35, 9); break;
      case 'back': crescent(bx, cy, Math.max(20, reachX * 0.9), -1.8, -4.2, 9); break;
      case 'down': crescent(bx, cy, Math.max(18, reachDown), 0.2, 2.9, 8); break;
      case 'low': case 'low2': {
        const front = f > 0 ? x2 : x1, back = S.fx === 'low2' ? (f > 0 ? x1 : x2) : bx;
        for (const [from, to] of S.fx === 'low2' ? [[bx, front], [bx, back]] : [[back, front]]) {
          const len = (to - from) * S.k;
          for (let i = 0; i < 3; i++) {
            const yy = by - 3 - i * 4, l = len * (1 - i * 0.22);
            g.fillStyle(cols[3 - i], fade * (0.9 - i * 0.2)); g.fillRect(Math.min(from, from + l), yy, Math.abs(l), 2);
          }
        }
        break;
      }
      case 'jab': case 'thrust': {
        const front = f > 0 ? x2 : x1, len = (front - bx) * (0.4 + 0.6 * S.k), yy = (y1 + y2) / 2;
        for (const [dy, w, c] of [[0, 1, 3], [-4, 0.7, 2], [4, 0.6, 2], [-8, 0.4, 1], [8, 0.35, 1]]) {
          g.fillStyle(cols[c], fade * 0.9); g.fillRect(Math.min(bx + len * (1 - w), bx + len), yy + dy, Math.abs(len * w), dy ? 1 : 2);
        }
        g.fillStyle(cols[3], fade); g.fillRect(bx + len - 2, yy - 3, 4, 6);
        break;
      }
      case 'flare': {                                                // lens flare: a blinding core, rays, ghost rings
        const front = f > 0 ? x2 : x1, yy = (y1 + y2) / 2, k = S.k * fade;
        g.fillStyle(0xffffff, k); g.fillCircle(front - f * 10, yy, 6 + 10 * S.k);
        g.fillStyle(0xffffff, 0.8 * k); g.fillRect(front - f * 10 - 40 * S.k, yy - 1, 80 * S.k, 2); g.fillRect(front - f * 10 - 1, yy - 26 * S.k, 2, 52 * S.k);
        for (let j = 1; j <= 3; j++) { g.lineStyle(2, cols[1 + (j % 3)], 0.6 * k); g.strokeCircle(front - f * (10 + j * 16), yy + j * 8, 3 + j * 2); }
        break;
      }
      case 'aurora': {                                               // a glossy ribbon of light, green over aqua
        const r = Math.max(22, reachX * 0.85), a0 = -1.4, a1 = 0.8, lead = a0 + (a1 - a0) * S.k;
        for (let a = a0; a <= lead; a += 0.05) {
          const q = (lead - a) / (a1 - a0), px = bx + Math.cos(a) * r * f, py = cy + Math.sin(a) * r;
          g.fillStyle(0x8be04a, fade * (0.8 - q)); g.fillRect(Math.round(px) - 2, Math.round(py) - 3, 4, 3);
          g.fillStyle(cols[2], fade * (0.9 - q)); g.fillRect(Math.round(px) - 2, Math.round(py), 4, 3);
          g.fillStyle(0xffffff, fade * (1 - q)); g.fillRect(Math.round(px) - 2, Math.round(py) - 1, 4, 1);
        }
        break;
      }
      case 'bubble': {                                               // a bubble popping in front of the palm
        const front = f > 0 ? x2 : x1, yy = (y1 + y2) / 2, r = 6 + 8 * S.k;
        g.lineStyle(2, 0xffffff, fade * (1 - S.k * 0.5)); g.strokeCircle(front - f * 12, yy, r);
        g.fillStyle(cols[2], 0.3 * fade); g.fillCircle(front - f * 12, yy, r);
        break;
      }
      default: {                                                     // spin: a ring the swing goes round
        const cx = (x1 + x2) / 2, ccy = (y1 + y2) / 2, r = Math.max(14, (x2 - x1) / 2);
        crescent(cx, ccy, r, -1.6, -1.6 + Math.PI * 2 * 0.9, 7);
      }
    }
  }
}

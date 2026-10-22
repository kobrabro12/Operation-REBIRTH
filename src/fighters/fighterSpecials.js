// Fighter methods: Special moves (K): charged shots, sword toss, summons, counters and up-specials.
// Mixed into the Fighter class (Fighter.js) - `this` is the fighter.
import { sfx } from '../audio/sfx.js';
import { newAttackId } from './attackIds.js';
import { popBubble } from './entities.js';

export class FighterSpecials {

  // ---- neutral special (Lacy): Grand Slam - hold to wind up a home-run swing, release to swing
  // Grand Slam spark colours: her own steel-and-gold, or the costume's palette
  chargeColors() {
    if (this.style === 'onebit') return [0xf4f4f0, 0xffffff];
    return this.pal === this.def.pal ? [this.fxColor, 0xffe08a] : [this.pal.light, this.pal.core];
  }
  startSwingCharge() { this.setState('swingcharge'); this.swingCharge = 0; sfx('swing', 0.4, 0.6); }
  st_swingcharge(c) {
    const nb = this.def.moves.neutralB, C = nb.charge;
    this.swingCharge = Math.min(C.max, this.swingCharge + 1);
    if (!this.grounded) this.vy = Math.min(this.vy, 1.5);            // hangs in the air a little while winding up
    // sparks spraying off the tip of the blade: more, faster and gold as the charge builds
    const k = this.swingCharge / C.max, full = k >= 1, R = Math.random;
    const tx = this.x + this.facing * C.tip[0], ty = this.y + C.tip[1];
    if (this.swingCharge === C.max && this.t === C.max) { sfx('limitready', 0.6, 1.2); this.match.puff(tx, ty, 0xffffff, 12); this.match.shake(3, 6); }
    const n = full ? 3 : (R() < 0.4 + k ? 1 + (R() < k ? 1 : 0) : 0);
    const [spark, hot] = this.chargeColors();
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (R() - 0.5) * 2.2 - this.facing * 0.5, sp = 1 + R() * (1.5 + 3 * k);
      this.match.particles.push({ x: tx, y: ty, vx: Math.cos(a) * sp - this.facing * 0.6, vy: Math.sin(a) * sp, life: 10 + R() * (8 + 12 * k), color: full ? (R() < 0.5 ? hot : 0xffffff) : (R() < 0.3 ? 0xffffff : spark), size: R() < 0.25 + 0.4 * k ? 2 : 1, grav: 0.14 });
    }
    if (this.t % (full ? 6 : 14) === 0) sfx('soulhit', 0.12 + 0.2 * k, 1.8 + k);   // crackle
    const release = (!c.held('special') && this.t > 2) || this.t >= C.hold || (this.isCpu && this.t >= (this.cpuChargeTarget || 30));
    if (!release) return;
    this.move = { ...nb, hits: nb.hits.map((h) => ({ ...h, base: h.base + (h.maxBase - h.base) * k, growth: h.growth + (h.maxGrowth - h.growth) * k, full: k >= 1 })) };
    this.moveName = 'neutralB'; this.attackId = newAttackId(); this.hitList = new Set();
    this.setState('attack');
    this.swingSound(0.7, 0.9); this.quip(k >= 1 ? 'slamFull' : 'slam');
    if (this.grounded) this.vx = this.facing * 1.6;                   // steps into the swing
  }

  // ---- side special (Lacy): Blade Toss - throw the sword, it spins in front of her, then flies back
  startSwordThrow() {
    this.setState('swordthrow'); this.lx = 0; this.quip('throwSword');
    if (this.grounded) this.vx *= 0.3;
  }
  st_swordthrow(c) {
    const S = this.def.moves.sideB.sword;
    if (this.t === S.throwAt) this.swordOut = this.match.spawnSword(this, S);
    if (this.t >= S.throwAt + 6) this.setState(this.grounded ? 'idle' : 'air');   // free to move while it spins
  }
  catchSword() { this.swordOut = null; this.quip('catchSword'); }

  // ---- neutral special: chargeable fireball
  startCharge() {
    this.setState('charge'); this.charge = 0;
    const snd = this.scene.sound;
    if (this.scene.cache.audio.exists('fireball_charge')) {
      this.chargeSound = snd.add('fireball_charge', { volume: 0.7 * this.match.sfxVol() });
      this.chargeSound.play();
    }
  }
  st_charge(c) {
    const fb = this.def.moves.fireball;
    this.charge = Math.min(fb.chargeMax, this.charge + 1);
    if (!this.grounded) this.vy = Math.min(this.vy, 1.5);       // hover a little while charging in the air
    if (this.t % 6 === 0) this.match.puff(this.x + this.facing * this.def.handOffset.x, this.y + this.def.handOffset.y, this.pal.light, 1);
    const release = !c.held('special') && this.t > 3;
    if (release || (this.isCpu && this.t >= (this.cpuChargeTarget || 20))) this.releaseFireball();
    else if (this.buffer.shield && this.grounded) { this.buffer.shield = 0; this.stopChargeSound(); this.setState('shield'); }
  }
  stopChargeSound() { if (this.chargeSound) { this.chargeSound.stop(); this.chargeSound.destroy(); this.chargeSound = null; } }
  releaseFireball() {
    const fb = this.def.moves.fireball;
    const k = this.charge / fb.chargeMax;
    this.stopChargeSound();
    if (this.scene.cache.audio.exists('fireball_throw')) this.scene.sound.play('fireball_throw', { volume: (0.45 + 0.4 * k) * this.match.sfxVol() });
    this.match.spawnFireball(this, k);
    this.setState('attack'); this.move = { frames: 16 }; this.moveName = 'fireball'; this.attackId = newAttackId();
  }

  // ---- down special: summon a soul
  startSummon() { this.setState('summon'); }
  st_summon() {
    const m = this.def.moves.summon;
    if (this.t === m.spawnAt) {
      this.souls = this.souls.filter((s) => s.alive);
      if (this.souls.length < m.maxSouls && this.summonCooldown <= 0) {
        this.souls.push(this.match.spawnSoul(this));
        this.summonCooldown = m.cooldown;
        sfx('summon', 0.7);
      } else {
        this.match.puff(this.x + this.facing * 24, this.y - 4, 0x6b5b73, 6);   // fizzle: already 2 souls out
        sfx('curse', 0.3, 1.5);
      }
    }
    if (this.t >= m.frames) this.setState(this.grounded ? 'idle' : 'air');
  }

  // ---- counter (Lacy's Riposte): a guard window that answers a hit with a stronger slash
  startCounter() { this.setState('counter'); this.vx *= 0.3; if (!this.grounded) this.vy = Math.min(this.vy, 0) * 0.5; }
  counterReady() { const C = this.def.moves.counter; return this.state === 'counter' && C && this.t >= C.start && this.t <= C.end; }
  st_counter() {
    const C = this.def.moves.counter;
    if (!this.grounded) this.vy = Math.min(this.vy, 1.2);         // floats a little in the air
    if (this.t === C.start) sfx('shield', 0.5, 1.8);              // the guard goes up with a glint
    if (this.t >= C.frames) this.setState(this.grounded ? 'idle' : 'air');
  }
  // called by the match when a hit lands during the guard window
  counterHit(hb) {
    this.quip('counter');
    const C = this.def.moves.counter, src = hb.owner;
    const inDmg = (hb.h && hb.h.dmg) || 6;
    const tx = hb.projectile ? hb.projectile.x : src ? src.x : (hb.x1 + hb.x2) / 2;
    this.facing = Math.sign(tx - this.x) || this.facing;
    this.counterStrike = { ...C.strike, dmg: Math.max(C.minDmg, Math.round(inDmg * C.mult)) };
    this.setState('counterstrike'); this.attackId = newAttackId(); this.hitList = new Set();
    this.vx = 0; this.vy = 0; this.lx = this.ly = 0;
    // freeze the attacker as a shadow for a beat
    if (src && src !== this && !hb.projectile && !hb.soul) { src.hitstop = Math.max(src.hitstop, 22); src.silhouette = 22; }
    this.hitstop = 10; this.counterFlash = 26;
    this.match.shake(6, 3); sfx('shield', 0.9, 2.2); sfx('bighit', 0.6, 1.5);
    this.match.popText(this, 'COUNTER!', '#9ad8f0');
    if (this.style === 'samurai') {                   // Samurai: a ninja's smoke bomb and a ring of steel
      sfx('smoke', 0.8); sfx('shing', 0.6);
      for (let i = 0; i < 18; i++) { const a = Math.random() * Math.PI * 2, sp = 0.6 + Math.random() * 1.8;
        this.match.particles.push({ shape: 'smoke', x: this.x, y: this.y - 24, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 - 0.3, life: 30 + Math.random() * 20, maxLife: 50, color: i % 3 ? 0xd8d4dc : 0xa8a4b0, grav: -0.01, drag: 0.95, r: 4 + Math.random() * 5 }); }
    }
  }
  st_counterstrike() {
    const K = this.counterStrike;
    if (this.t === K.from) sfx('swing', 0.9, 0.8);
    if (this.t >= K.frames) this.setState(this.grounded ? 'idle' : 'air');
  }

  // ---- up special (Soul Summoner: Soulfire Jet, Mr Wake: burst)
  startUpB(c) {
    this.usedUpB = true; this.setState('upb'); this.attackId = newAttackId(); this.hitList = new Set(); this.quip('upb');
    if (Math.abs(c.x) > 0.3) this.facing = Math.sign(c.x);
    this.vx = 0; this.vy = 0; this.lx = this.ly = 0;
    this.spinGround = this.grounded; this.spinCharge = 0; this.spinStart = -1; this.spinHit = null;   // Cyclone Slash bookkeeping
  }
  st_upb(c) {
    const u = this.def.moves.upb;
    if (u.hits.length > 1 && !(u.spin && this.spinGround) && u.hits.some((h) => h.from === this.t) && this.t > u.riseAt) { this.attackId = newAttackId(); }   // multi-hit: each window hits again
    if (u.jet) return this.jetUpB(c, u);
    if (u.spin) return this.spinUpB(c, u);
    if (u.tvhead) return this.tvUpB(c, u);                  // WHAT ONCE WAS: OUT OF BODY (fighterWhatOnceWas.js)
    if (this.t < u.riseAt) { this.vy = 0; return; }
    if (this.t === u.riseAt) { this.vy = u.riseV; this.grounded = false; this.platform = null; sfx('djump', 0.7, 0.7); }
    this.vx = c.x * u.drift + (u.pushX || 0) * this.facing * Math.max(0, 1 - (this.t - u.riseAt) / 12);
    if (u.bubble && this.t > u.riseAt && this.t < u.popAt) this.vy = u.floatV || -3.4;                   // AERO's bubble: a steady float upward
    if (u.bubble && this.t === u.popAt) { popBubble(this.match, this.x, this.y - 22, 26, this.pal); this.vy = -4; }
    if (this.t % 2 === 0) this.match.puff(this.x, this.y - 10, this.fxColor, 2);
    if (this.t >= u.frames) this.setState('helpless');
  }

  // Cyclone Slash (Lacy): an air spin that rises with multi-hits, or a chargeable spin on the ground
  spinUpB(c, u) {
    if (this.spinGround) {
      const G = u.ground;
      this.usedUpB = false;                                   // a ground spin doesn't use up the recovery
      if (this.spinStart < 0) {                               // charging while the button is held
        if (c.held('special') && this.spinCharge < G.chargeMax) {
          this.spinCharge++;
          if (this.spinCharge === G.chargeMax) { sfx('limitready', 0.5, 1.4); this.match.puff(this.x + this.facing * 16, this.y - 46, this.pal.core, 8); }
          return;
        }
        this.spinStart = this.t; this.attackId = newAttackId();
        const k = this.spinCharge / G.chargeMax;
        this.spinHit = { ...G.hit, dmg: Math.round(G.hit.dmg + (G.hit.maxDmg - G.hit.dmg) * k), base: G.hit.base + 1.2 * k };
        sfx('swing', 0.8, 0.8); sfx('dodge', 0.5, 0.7);
      }
      const st = this.t - this.spinStart;
      if (st % 6 === 0 && st < G.spin - 6) sfx('swing', 0.5, 1.1);
      if (st >= G.spin) this.setState('idle');
      return;
    }
    // air spin
    if (this.t < u.riseAt) { this.vy *= 0.5; return; }
    if (this.t === u.riseAt) { this.vy = u.riseV; this.grounded = false; this.platform = null; sfx('swing', 0.8, 0.8); }
    if (this.t > u.riseAt && this.t < 26 && this.t % 4 === 2) sfx('swing', 0.45, 1.2);
    this.vx = c.x * u.drift;
    if (this.t >= u.frames) this.setState('helpless');
  }
  // Soulfire Jet: steady thrust from flames under the feet instead of a single burst
  jetUpB(c, u) {
    const j = u.jet;
    if (this.t < u.riseAt) { this.vy = 0; this.vx *= 0.8; if (this.t % 2 === 0) this.match.puff(this.x, this.y + 2, this.fxColor, 1); return; }
    if (this.t === u.riseAt) {
      this.vy = u.kick; this.grounded = false; this.platform = null;
      sfx('djump', 0.7, 0.6);
      if (this.scene.cache.audio.exists('fireball_throw')) this.scene.sound.play('fireball_throw', { volume: 0.5 * this.match.sfxVol(), rate: 0.75 });
    }
    if (this.t <= j.to) {
      this.vy = Math.max(j.maxRise, this.vy - j.thrust);
      if (this.t % 3 === 0) this.match.puff(this.x + (Math.random() - 0.5) * 10, this.y + 30 + Math.random() * 16, this.t % 6 ? this.pal.light : this.pal.deep, 1);
    }
    this.vx = c.x * u.drift;
    if (Math.abs(c.x) > 0.3) this.facing = Math.sign(c.x);
    if (this.t >= u.frames) this.setState('helpless');
  }
}

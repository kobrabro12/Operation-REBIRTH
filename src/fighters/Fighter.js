// A fighter: its own fixed-step physics, a state machine, attacks and rendering.
// Position (x, y) is the point between the fighter's feet; y grows downward.
import { PHYS, BLAST, LIMIT_MAX, PLAYER_COLORS, PLAYER_TINTS, FONT } from '../config.js';
import { sfx } from '../audio/sfx.js';
import { Controller } from '../input/controllers.js';
import { skinSheets, skinInfo } from './skins.js';

let nextAttackId = 1;
const BUFFER = 7;   // frames an early button press is remembered

// climbing up from a ledge with an attack: a low sweep in front
const LEDGE_ATTACK = { box: [-8, -30, 50, 26], dmg: 7, angle: 30, base: 3.0, growth: 3.4 };

export class Fighter {
  constructor(match, def, slot, controller, opts) {
    this.match = match; this.scene = match; this.def = def; this.slot = slot;
    this.ctrl = controller; this.isCpu = !!opts.cpu; this.label = opts.label;
    this.team = slot;
    this.color = PLAYER_COLORS[slot];

    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.lx = 0; this.ly = 0;   // l* = launch velocity from hits
    this.facing = 1; this.grounded = false; this.platform = null; this.dropTimer = 0; this.dropFrom = null;
    this.state = 'idle'; this.t = 0; this.move = null; this.attackId = 0;
    this.jumpsLeft = 1; this.airdodged = false; this.usedUpB = false; this.fastFalling = false;
    this.percent = 0; this.hp = opts.hp || 150; this.maxHp = opts.hp || 150;
    this.stocks = opts.stocks ?? 3; this.kos = 0; this.falls = 0; this.lastHitBy = null; this.lastHitTimer = 0;
    this.limit = 0; this.limitReadyShown = false;
    this.alive = true; this.eliminated = false; this.respawnTimer = 0;
    this.invincible = 0; this.hitstop = 0; this.hitstun = 0; this.shieldHp = 60; this.shieldStun = 0;
    this.charge = 0; this.chargeSound = null; this.summonCooldown = 0; this.souls = [];
    this.grabbed = null; this.grabbedBy = null; this.curse = 0; this.flash = 0; this.anim = 0;
    this.buffer = { attack: 0, special: 0, jump: 0, grab: 0, shield: 0, limit: 0 };
    this.age = 0; this.tapX = -99; this.tapUp = -99; this.tapDown = -99; this.slow = 0;
    this.ledge = null; this.ledgeCooldown = 0; this.ledgeGrabs = 0;
    this.possessed = 0; this.possessMax = 1; this.possessImmune = 0; this.possessDir = 1; this.forced = new Controller();
    this.stats = { damageDealt: 0, damageTaken: 0 };

    const s = this.scene;
    this.skin = opts.skin || 0;
    this.sheets = skinSheets(s, def, this.skin);   // this fighter's colour variation
    this.worn = !!(skinInfo(def.id, this.skin).worn && def.wornSheets); this.wornStage = 0;
    this.dragonSpin = skinInfo(def.id, this.skin).sheetSet === 'samurai';   // SAMURAI costume: a dragon for Cyclone Slash
    this.fxBack = s.add.graphics();                 // effects drawn behind the fighter (e.g. the far side of the Samurai dragon)
    this.vfx = skinInfo(def.id, this.skin).vfx || null;   // milestone costume effects (skins.js)
    this.ghosts = this.vfx && this.vfx.trail ? [0, 1, 2].map(() => s.add.sprite(0, 0, this.sheets.idle, 0).setVisible(false)) : [];
    this.trailHist = [];
    this.sprite = s.add.sprite(0, 0, this.sheets.idle, 0).setOrigin(def.originX ?? 0.5, def.originY);
    this.sprite.setTint(PLAYER_TINTS[slot]);
    this.fx = s.add.graphics();
    this.tag = s.add.text(0, 0, this.label, { fontFamily: FONT, fontSize: '8px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5, 1);
    this.tag.setColor('#' + this.color.toString(16).padStart(6, '0'));
    match.addWorld(...this.ghosts, this.fxBack, this.sprite, this.fx, this.tag);
  }

  // ------------------------------------------------------------------ helpers
  get body() { return this.def.body; }
  hurtbox() { const b = this.body; return { x1: this.x - b.w / 2, x2: this.x + b.w / 2, y1: this.y - b.h, y2: this.y }; }
  center() { return { x: this.x, y: this.y - this.body.h / 2 }; }
  setState(s) { this.state = s; this.t = 0; }
  actionable() { return ['idle', 'run', 'air', 'land', 'shield'].includes(this.state) || (this.state === 'land' && this.t >= 2); }
  get cursedMult() { return this.curse > 0 ? 0.7 : 1; }
  get speedMult() { return (this.curse > 0 ? 0.6 : 1) * (this.slow > 0 ? 0.5 : 1); }
  get fxColor() { return skinInfo(this.def.id, this.skin).fx ?? this.def.fxColor ?? 0x78a0c6; }
  // a direction pressed within the last few frames before attack = a smash attack
  smashed(at) { return this.age - at <= 6; }
  attackOr(name, fallback) { this.startAttack(this.def.moves[name] ? name : fallback); }

  placeAt(x, y) {
    this.x = x; this.y = y; this.vx = this.vy = this.lx = this.ly = 0;
    this.grounded = false; this.setState('air');
  }

  // ------------------------------------------------------------------ per-frame logic
  step() {
    let c = this.ctrl;
    if (!this.alive) {
      if (!this.eliminated && --this.respawnTimer <= 0) this.respawn();
      return;
    }
    if (this.possessImmune > 0) this.possessImmune--;
    if (this.ledgeCooldown > 0) this.ledgeCooldown--;
    if (this.worn) this.updateWorn();
    if (this.possessed > 0) c = this.possessedInput(c);
    // remember presses so they fire as soon as the fighter can act
    for (const b of Object.keys(this.buffer)) {
      if (c.pressed(b)) this.buffer[b] = BUFFER; else if (this.buffer[b] > 0) this.buffer[b]--;
    }
    // Void Orb: neutral special while an orb is out detonates it (from almost any state)
    if (this.voidOrb && this.buffer.special && Math.abs(c.x) < 0.5 && !c.up && !c.down && !['hitstun', 'grabbed', 'dying', 'limit'].includes(this.state)) {
      this.buffer.special = 0;
      if (this.voidOrb.alive && this.voidOrb.phase === 'fly') this.voidOrb.detonate();
    }
    if (this.swordOut && this.state !== 'swordthrow') {   // Blade Toss: no attacks until the sword is back
      if (this.buffer.special) { this.buffer.special = 0; this.swordOut.recall(); }   // special calls it back early
      this.buffer.attack = this.buffer.grab = this.buffer.limit = 0;
    }
    this.age++;
    if (c.tappedSide()) this.tapX = this.age;
    if (c.y < -0.5 && c.py >= -0.5) this.tapUp = this.age;
    if (c.tappedDown()) this.tapDown = this.age;
    if (this.hitstop > 0) { this.hitstop--; return; }

    this.t++;
    if (this.slow > 0) this.slow--;
    if (this.invincible > 0) this.invincible--;
    if (this.curse > 0) this.curse--;
    if (this.summonCooldown > 0) this.summonCooldown--;
    if (this.lastHitTimer > 0 && --this.lastHitTimer === 0) this.lastHitBy = null;
    if (this.state !== 'shield' && this.shieldHp < 60) this.shieldHp = Math.min(60, this.shieldHp + 0.12);
    if (this.limit >= LIMIT_MAX && !this.limitReadyShown) { this.limitReadyShown = true; sfx('limitready', 0.8); this.match.popText(this, 'LIMIT READY!', '#78a0c6'); }

    const handler = this['st_' + this.state];
    if (handler) handler.call(this, c);
    this.physics(c);
    this.checkBlast();
  }

  // ---- Soul Hex possession: the real controller only counts wiggles; a forced controller walks
  // the fighter toward the nearest edge of the stage until the curse wears off or is mashed away.
  possess(frames) {
    if (this.possessImmune > 0 || this.possessed > 0) return false;
    this.possessed = frames; this.possessMax = frames;
    this.possessDir = this.x >= 0 ? 1 : -1;           // nearest edge
    for (const b of Object.keys(this.buffer)) this.buffer[b] = 0;
    this.stopChargeSound();
    return true;
  }
  endPossession(broke) {
    this.possessed = 0; this.possessImmune = 240;     // can't be hexed again for 4 s
    if (broke) { this.match.popText(this, 'BROKE FREE!', '#f3c358'); sfx('select', 0.6); this.match.puff(this.x, this.y - 30, 0xb07ad0, 10); }
  }
  possessedInput(real) {
    let wiggles = 0;
    for (const b of ['jump', 'attack', 'special', 'shield', 'grab', 'limit']) if (real.pressed(b)) wiggles++;
    if (real.tappedSide() || real.tappedDown() || (real.y < -0.5 && real.py >= -0.5)) wiggles++;
    this.possessed -= 1 + wiggles * 10;
    if (wiggles) this.wiggleFx = 6;
    if (this.possessed <= 0) { this.endPossession(wiggles > 0); return real; }
    const f = this.forced;
    f.beginFrame();
    for (const b in f.cur) f.cur[b] = false;
    // walk (or drift) toward the edge; keep the direction even once off the stage
    if (this.grounded && this.platform && !this.platform.solid) { f.x = 0; f.y = f.py > 0.5 ? 0 : 1; }   // drop through clouds
    else { f.x = this.possessDir; f.y = 0; }
    return f;
  }

  // ------------------------------------------------------------------ states
  st_idle(c) { this.groundActions(c); }
  st_run(c) { this.groundActions(c); }
  st_land(c) {
    if (this.t >= (this.landLag || 3)) { this.setState('idle'); this.groundActions(c); }
  }
  st_respawn(c) {
    // standing on the respawn platform: leave by moving, jumping, or after 3 seconds
    this.vx = 0; this.vy = 0;
    if (this.t > 180 || Math.abs(c.x) > 0.5 || c.y > 0.5 || this.buffer.jump || this.buffer.attack || this.buffer.special) {
      this.invincible = 120; this.setState('air');
    }
  }

  groundActions(c) {
    if (this.tryCommon(c, true)) return;
    if (this.buffer.jump) { this.buffer.jump = 0; this.setState('jumpsquat'); return; }
    if (c.held('shield')) { this.setState('shield'); sfx('shield', 0.4); return; }
    // drop through a cloud ledge
    if (this.platform && !this.platform.solid && c.tappedDown()) { this.dropThrough(); return; }
    if (Math.abs(c.x) > 0.3) {
      if (this.state !== 'run') this.setState('run');
      this.facing = Math.sign(c.x);
    } else if (this.state === 'run') this.setState('idle');
  }

  // Attacks, specials, grab and Limit, shared by ground and air.
  tryCommon(c, ground) {
    if (this.buffer.limit && this.limit >= LIMIT_MAX) { this.buffer.limit = 0; this.startLimit(); return true; }
    if (this.buffer.special) {
      const M = this.def.moves;
      this.buffer.special = 0;
      if (c.down) { if (M.summon) this.startSummon(); else if (M.counter) this.startCounter(); else if (M.downB) this.startAttack('downB'); return true; }
      if (c.up) { if (this.usedUpB) return false; this.startUpB(c); return true; }
      if (Math.abs(c.x) > 0.5) { this.facing = Math.sign(c.x); if (M.sideB && M.sideB.sword) { if (!this.swordOut) this.startSwordThrow(); return !this.swordOut || this.state === 'swordthrow'; } if (M.sideB) { this.startAttack('sideB'); return true; } }
      if (M.fireball) this.startCharge(); else if (M.neutralB && M.neutralB.charge) this.startSwingCharge(); else if (M.neutralB) this.startAttack('neutralB');
      return true;
    }
    if (this.buffer.grab && ground) { this.buffer.grab = 0; this.startAttack('grab'); return true; }
    if (this.buffer.attack) {
      this.buffer.attack = 0;
      const M = this.def.moves;
      if (ground) {
        // tap a direction and attack together for a smash attack (if the fighter has one)
        if (c.up) this.startAttack(M.usmash && this.smashed(this.tapUp) ? 'usmash' : 'utilt');
        else if (c.down) this.startAttack(M.dsmash && this.smashed(this.tapDown) ? 'dsmash' : 'dtilt');
        else if (Math.abs(c.x) > 0.5) { this.facing = Math.sign(c.x); this.startAttack(M.fsmash && this.smashed(this.tapX) ? 'fsmash' : 'ftilt'); }
        else this.startAttack('jab');
      } else {
        if (c.up) this.attackOr('uair', 'nair');
        else if (c.down) this.attackOr('dair', 'nair');
        else if (Math.abs(c.x) > 0.5) this.attackOr(Math.sign(c.x) === this.facing ? 'fair' : 'bair', 'nair');
        else this.startAttack('nair');
      }
      return true;
    }
    return false;
  }

  st_jumpsquat(c) {
    // W doubles as jump; pressing attack/special during the squat turns it into an up attack / up special
    if (this.buffer.attack && c.up) { this.buffer.attack = 0; this.startAttack(this.def.moves.usmash && this.smashed(this.tapUp) ? 'usmash' : 'utilt'); return; }
    if (this.buffer.special && c.up && !this.usedUpB) { this.buffer.special = 0; this.startUpB(c); return; }
    if (this.t >= 4) {
      const full = c.held('jump');
      this.vy = full ? this.def.jumpV : this.def.shortHopV;
      if (Math.abs(c.x) > 0.3) this.vx = c.x * this.def.airSpeed;
      this.grounded = false; this.platform = null;
      this.setState('air'); sfx('jump', 0.5);
    }
  }

  st_air(c) {
    if (this.tryCommon(c, false)) return;
    if (this.buffer.jump && this.jumpsLeft > 0) {
      this.buffer.jump = 0; this.jumpsLeft--; this.fastFalling = false;
      this.vy = this.def.doubleJumpV; this.vx = c.x * this.def.airSpeed;
      if (Math.abs(c.x) > 0.3) this.facing = Math.sign(c.x);
      sfx('djump', 0.5); this.match.puff(this.x, this.y, 0xf0f2f3, 6);
    }
    if (this.buffer.shield && !this.airdodged) { this.buffer.shield = 0; this.startAirdodge(c); return; }
    if (c.tappedDown() && this.vy > -1.5) this.fastFalling = true;
  }

  st_helpless(c) {
    // after the up special: drift only, until landing
    if (this.t % 8 === 0) this.match.puff(this.x, this.y - 30, this.fxColor, 1);
  }

  // ---- attacks
  startAttack(name) {
    this.move = this.def.moves[name]; this.moveName = name; this.attackId = nextAttackId++;
    this.setState('attack'); this.hitList = new Set();
    if (this.move.lunge && this.grounded) this.vx = this.facing * this.move.lunge;
    sfx('swing', 0.35, name === 'jab' ? 1.4 : 1);
  }
  st_attack(c) {
    const m = this.move;
    if (m.projectile && this.t === m.spawnAt) this.match.spawnBolt(this, m.projectile);
    if (m.orb && this.t === m.spawnAt) this.voidOrb = this.match.spawnOrb(this, m.orb);
    if (m.pool && m.hits && this.t === m.hits[0].from) this.match.spawnPool(this, m.pool);
    if (this.t >= m.frames) {
      this.setState(this.grounded ? 'idle' : 'air'); return;
    }
    // aerials can still drift; ground attacks slide to a stop
    if (!this.grounded && c.tappedDown() && this.vy > -1.5) this.fastFalling = true;
  }
  activeHitboxes() {
    const out = [];
    const add = (h, src) => {
      const [bx, by, bw, bh] = h.box;
      const x1 = this.facing > 0 ? this.x + bx : this.x - bx - bw;
      out.push({ x1, x2: x1 + bw, y1: this.y + by, y2: this.y + by + bh, h, owner: this, id: this.attackId, facing: this.facing, src, grab: !!(src && src.grab) });
    };
    if (this.state === 'attack' && this.move.hits) {
      for (const h of this.move.hits) if (this.t >= h.from && this.t <= h.to) add(h, this.move);
    }
    if (this.state === 'ledgeattack' && this.t >= 14 && this.t <= 18) add(LEDGE_ATTACK, { fx: 'arc' });
    if (this.state === 'counterstrike' && this.counterStrike) {
      const K = this.counterStrike;
      if (this.t >= K.from && this.t <= K.to) add(K, { anim: 'attack2' });
      return out;
    }
    if (this.state === 'upb' && this.def.moves.upb.spin && this.spinGround) {
      const st = this.spinStart >= 0 ? this.t - this.spinStart : -1, h = this.spinHit;
      if (h && st >= h.from && st <= h.to) add(h, this.def.moves.upb);
      return out;
    }
    if (this.state === 'upb') for (const h of this.def.moves.upb.hits) if (this.t >= h.from && this.t <= h.to) add(h, this.def.moves.upb);
    return out;
  }

  // ---- grab and throw
  onGrab(target) {
    this.grabbed = target; target.grabbedBy = this;
    target.setState('grabbed'); target.vx = target.vy = target.lx = target.ly = 0;
    this.setState('holding'); sfx('shield', 0.6, 0.7);
  }
  st_holding(c) {
    const t = this.grabbed;
    if (!t || !t.alive) { this.grabbed = null; this.setState('idle'); return; }
    t.x = this.x + this.facing * 26; t.y = this.y;
    let dir = null;
    if (this.t > 6) {
      if (c.up) dir = 'up'; else if (c.down) dir = 'down';
      else if (Math.abs(c.x) > 0.5) dir = Math.sign(c.x) === this.facing ? 'forward' : 'back';
      else if (this.buffer.attack || this.buffer.grab) dir = 'forward';
    }
    if (this.t > 50) dir = 'forward';
    if (dir) {
      const th = this.def.moves.throws[dir];
      t.grabbedBy = null; this.grabbed = null;
      this.match.applyHit(t, { h: th, owner: this, facing: this.facing, id: nextAttackId++ }, this.x);
      this.setState('attack'); this.move = { frames: 18 }; this.moveName = 'throw'; this.throwDir = dir; this.attackId = nextAttackId++;
    }
  }
  st_grabbed() {
    if (!this.grabbedBy || this.t > 60) { this.grabbedBy = null; this.setState('idle'); }
  }

  // ---- neutral special (Lacy): Grand Slam - hold to wind up a home-run swing, release to swing
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
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (R() - 0.5) * 2.2 - this.facing * 0.5, sp = 1 + R() * (1.5 + 3 * k);
      this.match.particles.push({ x: tx, y: ty, vx: Math.cos(a) * sp - this.facing * 0.6, vy: Math.sin(a) * sp, life: 10 + R() * (8 + 12 * k), color: full ? (R() < 0.5 ? 0xffe08a : 0xffffff) : (R() < 0.3 ? 0xffffff : this.fxColor), size: R() < 0.25 + 0.4 * k ? 2 : 1, grav: 0.14 });
    }
    if (this.t % (full ? 6 : 14) === 0) sfx('soulhit', 0.12 + 0.2 * k, 1.8 + k);   // crackle
    const release = (!c.held('special') && this.t > 2) || this.t >= C.hold || (this.isCpu && this.t >= (this.cpuChargeTarget || 30));
    if (!release) return;
    this.move = { ...nb, hits: nb.hits.map((h) => ({ ...h, base: h.base + (h.maxBase - h.base) * k, growth: h.growth + (h.maxGrowth - h.growth) * k, full: k >= 1 })) };
    this.moveName = 'neutralB'; this.attackId = nextAttackId++; this.hitList = new Set();
    this.setState('attack');
    sfx('swing', 0.9, 0.7);
    if (this.grounded) this.vx = this.facing * 1.6;                   // steps into the swing
  }

  // ---- side special (Lacy): Blade Toss - throw the sword, it spins in front of her, then flies back
  startSwordThrow() {
    this.setState('swordthrow'); this.lx = 0;
    if (this.grounded) this.vx *= 0.3;
  }
  st_swordthrow(c) {
    const S = this.def.moves.sideB.sword;
    if (this.t === S.throwAt) this.swordOut = this.match.spawnSword(this, S);
    if (this.t >= S.throwAt + 6) this.setState(this.grounded ? 'idle' : 'air');   // free to move while it spins
  }
  catchSword() { this.swordOut = null; }

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
    if (this.t % 6 === 0) this.match.puff(this.x + this.facing * this.def.handOffset.x, this.y + this.def.handOffset.y, 0x78a0c6, 1);
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
    this.setState('attack'); this.move = { frames: 16 }; this.moveName = 'throw'; this.attackId = nextAttackId++;
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
    const C = this.def.moves.counter, src = hb.owner;
    const inDmg = (hb.h && hb.h.dmg) || 6;
    const tx = hb.projectile ? hb.projectile.x : src ? src.x : (hb.x1 + hb.x2) / 2;
    this.facing = Math.sign(tx - this.x) || this.facing;
    this.counterStrike = { ...C.strike, dmg: Math.max(C.minDmg, Math.round(inDmg * C.mult)) };
    this.setState('counterstrike'); this.attackId = nextAttackId++; this.hitList = new Set();
    this.vx = 0; this.vy = 0; this.lx = this.ly = 0;
    // freeze the attacker as a shadow for a beat
    if (src && src !== this && !hb.projectile && !hb.soul) { src.hitstop = Math.max(src.hitstop, 22); src.silhouette = 22; }
    this.hitstop = 10; this.counterFlash = 26;
    this.match.shake(6, 3); sfx('shield', 0.9, 2.2); sfx('bighit', 0.6, 1.5);
    this.match.popText(this, 'COUNTER!', '#9ad8f0');
  }
  st_counterstrike() {
    const K = this.counterStrike;
    if (this.t === K.from) sfx('swing', 0.9, 0.8);
    if (this.t >= K.frames) this.setState(this.grounded ? 'idle' : 'air');
  }

  // ---- up special (Soul Summoner: Soulfire Jet, Mr Wake: burst)
  startUpB(c) {
    this.usedUpB = true; this.setState('upb'); this.attackId = nextAttackId++; this.hitList = new Set();
    if (Math.abs(c.x) > 0.3) this.facing = Math.sign(c.x);
    this.vx = 0; this.vy = 0; this.lx = this.ly = 0;
    this.spinGround = this.grounded; this.spinCharge = 0; this.spinStart = -1; this.spinHit = null;   // Cyclone Slash bookkeeping
  }
  st_upb(c) {
    const u = this.def.moves.upb;
    if (u.hits.length > 1 && !(u.spin && this.spinGround) && u.hits.some((h) => h.from === this.t) && this.t > u.riseAt) { this.attackId = nextAttackId++; }   // multi-hit: each window hits again
    if (u.jet) return this.jetUpB(c, u);
    if (u.spin) return this.spinUpB(c, u);
    if (this.t < u.riseAt) { this.vy = 0; return; }
    if (this.t === u.riseAt) { this.vy = u.riseV; this.grounded = false; this.platform = null; sfx('djump', 0.7, 0.7); }
    this.vx = c.x * u.drift + (u.pushX || 0) * this.facing * Math.max(0, 1 - (this.t - u.riseAt) / 12);
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
          if (this.spinCharge === G.chargeMax) { sfx('limitready', 0.5, 1.4); this.match.puff(this.x + this.facing * 16, this.y - 46, 0xb8fff4, 8); }
          return;
        }
        this.spinStart = this.t; this.attackId = nextAttackId++;
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
      if (this.t % 3 === 0) this.match.puff(this.x + (Math.random() - 0.5) * 10, this.y + 30 + Math.random() * 16, this.t % 6 ? 0x78a0c6 : 0x076cc2, 1);
    }
    this.vx = c.x * u.drift;
    if (Math.abs(c.x) > 0.3) this.facing = Math.sign(c.x);
    if (this.t >= u.frames) this.setState('helpless');
  }

  // ---- defence
  st_shield(c) {
    if (this.shieldStun > 0) { this.shieldStun--; return; }
    this.shieldHp -= 0.14;
    if (this.shieldHp <= 0) { this.breakShield(); return; }
    if (!c.held('shield')) { this.setState('land'); this.landLag = 6; return; }
    if (this.buffer.jump) { this.buffer.jump = 0; this.setState('jumpsquat'); return; }
    if (this.buffer.grab || (this.buffer.attack && c.held('shield'))) { this.buffer.grab = this.buffer.attack = 0; this.startAttack('grab'); return; }
    if (c.tappedSide()) { this.startRoll(Math.sign(c.x)); return; }
    if (c.tappedDown()) { this.setState('spotdodge'); sfx('dodge', 0.5); }
  }
  breakShield() {
    this.shieldHp = 30; this.setState('dizzy'); this.vy = -6; this.grounded = false;
    sfx('bighit', 0.8, 1.3); this.match.popText(this, 'SHIELD BREAK!', '#ffd34f');
  }
  st_dizzy() { if (this.t > 150 && this.grounded) this.setState('idle'); }
  startRoll(dir) { this.setState('roll'); this.rollDir = dir; sfx('dodge', 0.5); }
  st_roll() {
    this.vx = this.t < 18 ? this.rollDir * 3.6 : 0;
    if (this.t === 24) { this.facing = -this.rollDir; this.setState('idle'); }
  }
  st_spotdodge() { this.vx = 0; if (this.t >= 22) this.setState('idle'); }
  startAirdodge(c) {
    this.airdodged = true; this.setState('airdodge'); sfx('dodge', 0.5);
    const mag = Math.hypot(c.x, c.y);
    if (mag > 0.3) { this.vx = (c.x / mag) * 5.5; this.vy = (c.y / mag) * 5.5; this.adDirected = true; } else { this.adDirected = false; }
    this.fastFalling = false;
  }
  st_airdodge() {
    if (this.adDirected) { this.vx *= 0.88; this.vy *= 0.88; }
    if (this.t >= 28) this.setState('air');
  }
  isIntangible() {
    if (this.invincible > 0 || this.state === 'respawn') return true;
    if (this.state === 'roll') return this.t >= 4 && this.t <= 16;
    if (this.state === 'spotdodge') return this.t >= 3 && this.t <= 16;
    if (this.state === 'airdodge') return this.t >= 3 && this.t <= 20;
    if (this.state === 'limit' || this.state === 'dying') return true;
    if (this.state === 'counterstrike') return this.t <= 12;
    if (this.state === 'ledgeclimb') return this.t <= 12;
    if (this.state === 'ledgeroll') return this.t <= 22;
    if (this.state === 'ledgeattack') return this.t <= 10;
    return false;
  }

  // ---- being hit
  st_hitstun(c) {
    if (this.t >= this.hitstun) {
      this.setState(this.grounded ? 'idle' : 'air');
    } else if (this.grounded && this.t > 4 && Math.abs(this.lx) + Math.abs(this.ly) < 0.5) {
      // slid to a stop on the ground
      this.setState('idle');
    }
  }

  // ---- Limit
  startLimit() {
    this.limit = 0; this.limitReadyShown = false;
    this.setState('limit'); this.vx = this.vy = 0; this.lx = this.ly = 0;
    this.match.startLimit(this);
  }
  st_limit() {
    const L = this.def.limit;
    if (L.type === 'blade') return this.bladeLimit(L);
    if (L.type === 'undertow') return this.undertowLimit(L);
    this.vy = this.grounded ? 0 : Math.max(-1.2, this.vy - 0.2);
    L.hits.forEach((h, i) => { if (h.at === this.t) this.match.limitHit(this, i); });
    if (this.t >= L.beamStart && this.t <= L.beamEnd && this.t % 2 === 0) {
      this.match.puff(this.x + this.facing * this.def.handOffset.x, this.y + this.def.handOffset.y, this.t % 4 ? this.fxColor : 0xf0f2f3, 2);
    }
    if (this.t >= L.frames) { this.invincible = 30; this.setState(this.grounded ? 'idle' : 'air'); }
  }

  // ------------------------------------------------------------------ physics and collision
  physics(c) {
    const d = this.def;
    const s = this.state;
    if (s === 'grabbed') return;
    if (s === 'respawn') return;
    if (s.startsWith('ledge')) return;                    // hanging / climbing: the state places the fighter
    if (s === 'limit' && this.ult && this.ult.phase === 'cutscene') return;   // teleporting in the Limit cutscene
    if (this.dropTimer > 0) this.dropTimer--;

    const canSteerAir = ['air', 'helpless', 'attack', 'charge', 'summon'].includes(s) && !this.grounded;
    const groundMove = this.grounded && (s === 'run');

    if (this.grounded) {
      if (groundMove) {
        const target = c.x * d.walkSpeed * this.speedMult;
        this.vx += Math.sign(target - this.vx) * Math.min(Math.abs(target - this.vx), d.runAccel);
      } else if (s !== 'roll') {
        this.vx -= Math.sign(this.vx) * Math.min(Math.abs(this.vx), d.groundFriction);
      }
      this.vy = 0;
    } else {
      if (canSteerAir) {
        const max = d.airSpeed * this.speedMult * (s === 'helpless' ? 0.7 : 1);
        if (Math.abs(c.x) > 0.2) {
          const target = c.x * max;
          this.vx += Math.sign(target - this.vx) * Math.min(Math.abs(target - this.vx), d.airAccel);
        } else {
          this.vx -= Math.sign(this.vx) * Math.min(Math.abs(this.vx), d.airFriction);
        }
      }
      const noGravity = (s === 'upb' && this.t <= d.moves.upb.riseAt) || (s === 'airdodge' && this.adDirected) || s === 'limit' || s === 'holding';
      if (!noGravity) {
        const g = s === 'hitstun' ? PHYS.gravity * PHYS.hitstunGravity : PHYS.gravity;
        const cap = this.fastFalling ? PHYS.fastFall : PHYS.maxFall;
        this.vy = this.fastFalling && s !== 'hitstun' && this.vy >= -1 ? cap : Math.min(cap, this.vy + g);
      }
    }

    // launch velocity decays in a straight line
    const lm = Math.hypot(this.lx, this.ly);
    if (lm > 0) {
      const nm = Math.max(0, lm - PHYS.launchDecay * (this.grounded ? 6 : 1));
      this.lx *= nm / lm; this.ly *= nm / lm;
    }

    const px = this.x, py = this.y;
    this.x += this.vx + this.lx;
    this.y += this.vy + this.ly;
    this.collide(px, py, c);
    this.tryLedgeGrab(c);
  }

  // ------------------------------------------------------------------ ledges
  // Falling (or recovering) next to a corner of the solid stage catches the edge. From the ledge:
  // toward the stage or up = climb, jump = jump up, attack = climb with a sweeping attack,
  // shield = roll onto the stage, away or down = let go. Hanging too long (5 s) lets go by itself.
  hangPos(L) { return { x: L.x + L.side * (this.body.w / 2 + 1), y: L.y + this.body.h - 14 }; }
  tryLedgeGrab(c) {
    const s = this.state;
    if (this.grounded || this.ledgeCooldown > 0 || this.possessed > 0) return;
    if (!['air', 'helpless', 'upb', 'airdodge'].includes(s)) return;
    if (s === 'upb' && this.t < (this.def.moves.upb.riseAt || 0) + 2) return;
    if (c.y > 0.5) return;                                      // holding down: don't grab
    for (const p of this.match.stage.platforms) {
      if (!p.solid) continue;
      for (const side of [-1, 1]) {
        const L = { p, side, x: side < 0 ? p.x1 : p.x2, y: p.y };
        const h = this.hangPos(L);
        if (side < 0 ? this.x > p.x1 : this.x < p.x2) continue;  // must be outside the stage
        if (Math.abs(this.x - h.x) > 20) continue;
        const top = this.y - this.body.h - L.y;                  // head height relative to the ledge
        if (top < -34 || top > 22) continue;
        if (s !== 'upb' && this.vy < -1.5) continue;             // rising past it on a jump: no grab
        if (this.match.fighters.some((f) => f !== this && f.alive && f.ledge && f.ledge.p === p && f.ledge.side === side && f.state.startsWith('ledge'))) continue;
        this.grabLedge(L); return;
      }
    }
  }
  grabLedge(L) {
    const h = this.hangPos(L);
    this.ledge = L; this.setState('ledge');
    this.x = h.x; this.y = h.y; this.vx = this.vy = this.lx = this.ly = 0;
    this.facing = -L.side; this.fastFalling = false;
    this.jumpsLeft = 1; this.usedUpB = false; this.airdodged = false;          // a fresh recovery
    if (this.ledgeGrabs === 0) this.invincible = Math.max(this.invincible, 36); // safe on the first grab only
    this.ledgeGrabs++;
    this.stopChargeSound();
    sfx('land', 0.5, 1.4); this.match.puff(L.x, L.y, 0xf0f2f3, 3);
  }
  letGoLedge(cooldown = 30) {
    this.ledgeCooldown = cooldown; this.setState('air'); this.vy = 1; this.ledge = null;
  }
  st_ledge(c) {
    const L = this.ledge, toward = -L.side;
    if (this.t < 8) return;                                     // short hang before acting
    if (this.t > 300) { this.letGoLedge(60); return; }
    if (this.buffer.jump) { this.buffer.jump = 0; this.ledge = null; this.setState('air'); this.y = L.y - 6; this.vy = this.def.jumpV; this.vx = toward * 1.2; this.ledgeCooldown = 20; sfx('jump', 0.5); return; }
    if (this.buffer.attack) { this.buffer.attack = 0; this.setState('ledgeattack'); return; }
    if (this.buffer.shield) { this.buffer.shield = 0; this.setState('ledgeroll'); sfx('dodge', 0.5); return; }
    if (c.x * toward > 0.5 || c.y < -0.5) { this.setState('ledgeclimb'); return; }
    if (c.x * toward < -0.5 || c.y > 0.5) { this.letGoLedge(); return; }
  }
  // move from the hang position onto the stage over `frames`, ending `dist` px in from the edge
  climbTo(frames, dist) {
    const L = this.ledge, h = this.hangPos(L), k = Math.min(1, this.t / frames);
    const up = Math.min(1, k * 2), over = Math.max(0, k * 2 - 1);
    this.x = h.x + (-L.side) * (this.body.w / 2 + 1 + dist) * over;
    this.y = h.y + (L.y - h.y) * up;
    if (this.t >= frames) { this.x = L.x - L.side * dist; this.y = L.y; this.grounded = true; this.platform = L.p; this.ledge = null; return true; }
    return false;
  }
  st_ledgeclimb() { if (this.climbTo(18, 18)) this.setState('idle'); }
  st_ledgeroll() { if (this.climbTo(28, 72)) { this.setState('idle'); } }
  st_ledgeattack() {
    if (this.t < 14) { this.climbTo(14, 14); return; }
    if (this.ledge) this.climbTo(14, 14);
    if (this.t === 14) { this.attackId = nextAttackId++; this.hitList = new Set(); sfx('swing', 0.6); }
    if (this.t >= 30) this.setState('idle');
  }

  collide(px, py, c) {
    const b = this.body;
    const goingDown = this.y >= py;
    let landed = null;
    for (const p of this.match.stage.platforms) {
      // side walls and ceiling of the solid island
      if (p.solid) {
        const inX = this.x + b.w / 2 > p.x1 && this.x - b.w / 2 < p.x2;
        const inY = this.y > p.y + 2 && this.y - b.h < p.bottom;
        if (inX && inY) {
          if (py - b.h >= p.bottom - 1) { this.y = p.bottom + b.h; this.vy = Math.max(0, this.vy); this.ly = Math.abs(this.ly) * 0.5; }
          else if (px <= p.x1 - b.w / 2 + 1) { this.x = p.x1 - b.w / 2; this.vx = Math.min(0, this.vx); this.lx = -Math.abs(this.lx) * 0.5; }
          else if (px >= p.x2 + b.w / 2 - 1) { this.x = p.x2 + b.w / 2; this.vx = Math.max(0, this.vx); this.lx = Math.abs(this.lx) * 0.5; }
        }
      }
      // landing on top
      if (!goingDown) continue;
      if (this.x < p.x1 || this.x > p.x2) continue;
      if (py <= p.y + 0.01 && this.y >= p.y) {
        if (!p.solid && (this.dropTimer > 0 && this.dropFrom === p)) continue;
        if (!p.solid && this.state !== 'hitstun' && c.down && !this.grounded && this.fastFalling) continue;   // fast-fall through clouds
        landed = p;
      }
    }
    if (this.grounded && this.platform && (this.x < this.platform.x1 || this.x > this.platform.x2)) {
      this.grounded = false; this.platform = null;          // walked off an edge
      if (['idle', 'run', 'land'].includes(this.state)) this.setState('air');
    }
    if (landed && !this.grounded) {
      // a strong hit into the floor bounces instead of landing
      if (this.state === 'hitstun' && this.ly > 4) { this.ly = -this.ly * 0.6; this.y = landed.y; this.match.puff(this.x, this.y, 0xd99350, 6); return; }
      this.y = landed.y; this.vy = 0; this.ly = 0;
      this.grounded = true; this.platform = landed;
      this.jumpsLeft = 1; this.airdodged = false; this.usedUpB = false; this.fastFalling = false; this.ledgeGrabs = 0;
      this.onLand();
    } else if (landed && this.grounded) {
      this.y = landed.y; this.platform = landed;
    }
  }

  onLand() {
    const s = this.state;
    if (s === 'attack' && this.move.landLag) { this.setState('land'); this.landLag = this.move.landLag; }
    else if (s === 'air' || s === 'helpless' || s === 'airdodge') { this.setState('land'); this.landLag = s === 'helpless' ? 14 : 3; sfx('land', 0.3); }
    else if (s === 'hitstun' && this.t >= this.hitstun - 2) this.setState('idle');
    else if (s === 'upb' && this.t > 12) { this.setState('land'); this.landLag = 10; }
  }

  dropThrough() {
    this.dropFrom = this.platform; this.dropTimer = 14;
    this.grounded = false; this.platform = null; this.y += 1; this.vy = 1.5;
    this.setState('air');
  }

  checkBlast() {
    if (this.ult && this.ult.phase === 'cutscene') return;
    if (this.x < BLAST.left || this.x > BLAST.right || this.y > BLAST.bottom || (this.y < BLAST.top && this.state === 'hitstun')) {
      this.match.onKO(this);
    }
  }

  ko() {
    this.alive = false; this.stopChargeSound(); this.possessed = 0; this.ledge = null;
    if (this.grabbed) { this.grabbed.grabbedBy = null; this.grabbed.setState('air'); this.grabbed = null; }
    if (this.grabbedBy) { this.grabbedBy.grabbed = null; this.grabbedBy.setState('idle'); this.grabbedBy = null; }
    this.sprite.setVisible(false); this.tag.setVisible(false); this.fx.clear(); this.fxBack.clear(); for (const gh of this.ghosts) gh.setVisible(false);
    this.respawnTimer = 70;
  }

  respawn() {
    this.alive = true; this.percent = 0; this.hp = this.maxHp; this.curse = 0; this.slow = 0; this.possessed = 0; this.possessImmune = 0;
    this.x = 0; this.y = -230; this.vx = this.vy = this.lx = this.ly = 0;
    this.grounded = false; this.facing = 1; this.jumpsLeft = 1; this.usedUpB = false; this.airdodged = false;
    this.setState('respawn'); this.invincible = 0;
    this.sprite.setVisible(true); this.tag.setVisible(true);
  }

  // ------------------------------------------------------------------ Undertow Limit (Mr Wake)
  // melt into a puddle -> it floods the floor -> anyone standing in it is dragged under -> the abyss
  // cutscene (eyes open, jaws chomp, spit them out) / nobody caught: the pool drains and he re-forms
  undertowLimit(L) {
    const m = this.match, P = m.stage.platforms[0];
    if (this.t === 1) { this.ult = { phase: 'melt', victims: [], origin: { x: this.x, y: this.y }, w: 0 }; sfx('curse', 0.9, 0.5); }
    const U = this.ult;
    this.vx = 0; this.lx = 0;
    if (U.phase === 'melt') {
      if (!this.grounded) this.vy = Math.max(this.vy, 6);              // drips straight down to the floor
      if (this.t >= L.melt && this.grounded) { U.phase = 'flood'; U.ft = 0; U.cx = this.x; U.y = this.y; sfx('summon', 0.9, 0.5); }
      if (this.t >= L.melt && this.y > P.y + 60) return this.endUndertow();   // melted over the void: nothing to flood
      return;
    }
    if (U.phase === 'flood') {
      U.ft++;
      U.w = Math.min(L.spread, (U.ft / L.flood) * L.spread);
      const x1 = U.cx - U.w, x2 = U.cx + U.w;
      for (const o of m.fighters) {                                       // standing in the flood: dragged under
        if (o === this || !o.alive || o.team === this.team || o.state === 'respawn' || o.state === 'dying' || U.victims.includes(o) || o.isIntangible()) continue;
        if (o.grounded && Math.abs(o.y - U.y) < 3 && o.x > x1 && o.x < x2) {
          U.victims.push(o); o.vx = o.vy = o.lx = o.ly = 0; o.stopChargeSound(); o.setState('hitstun'); o.hitstun = 999;
          m.puff(o.x, o.y - 4, 0x2a1040, 8); sfx('curse', 0.6, 0.7);
        }
      }
      if (U.ft % 6 === 0) m.puff(x1 + Math.random() * (x2 - x1), U.y - 3, Math.random() < 0.5 ? 0x6d26bd : this.fxColor, 1);
      if (U.ft >= L.flood) {
        if (U.victims.length) {                                           // caught someone: into the abyss
          U.phase = 'cutscene'; U.ct = 0; m.frozen = 9999; m.cutscene = this; U.chomp = 0;
          this.fx.setDepth(4); for (const v of U.victims) v.sprite.setDepth(4.5);
          sfx('limit', 0.8, 0.6); m.shake(8, 10);
        } else { U.phase = 'recede'; U.rt = 0; }
      }
      return;
    }
    if (U.phase === 'recede') { U.rt++; U.w = L.spread * (1 - U.rt / L.recede); if (U.rt >= L.recede) this.endUndertow(); return; }
    if (U.phase === 'cutscene') return this.undertowCutscene(L, U);
  }
  undertowCutscene(L, U) {
    const m = this.match;
    U.ct++;
    U.victims = U.victims.filter((v) => v.alive && v.state !== 'dying');
    if (!U.victims.length) return this.endUndertow();
    for (const v of U.victims) { v.hitstun = 999; v.lx = v.ly = 0; }
    if (U.ct === 8) sfx('summon', 1, 0.4);                                   // the eyes open
    const start = L.eyesFor;
    if (U.ct >= start && U.chomp < L.chomps && (U.ct - start) % L.chompEvery === L.chompEvery - 6) {   // the jaws snap shut
      U.chomp++;
      for (const t of U.victims) m.applyHit(t, { h: L.chomp, owner: this, facing: this.facing, id: 'chomp' + this.slot + ':' + U.chomp, pillar: true }, t.x);
      for (const t of U.victims) { t.lx = t.ly = 0; t.hitstun = 999; }
      sfx('bighit', 0.7, 0.6 + U.chomp * 0.05); m.shake(6, 4);
    }
    const spitAt = start + L.chomps * L.chompEvery + L.spitAfter;
    if (U.ct === spitAt) {                                                    // spat out of the deep
      for (const t of U.victims) { t.hitstun = 0; m.applyHit(t, { h: L.final, owner: this, facing: this.facing, id: 'spit' + this.slot, pillar: true }, t.x); m.puff(t.x, t.y - 20, 0x6d26bd, 18); m.puff(t.x, t.y - 20, 0xffffff, 8); }
      sfx('ko', 0.7, 0.8); m.shake(14, 12);
      return this.endUndertow();
    }
  }
  endUndertow() {
    const U = this.ult, m = this.match;
    if (U && U.phase === 'cutscene') { m.frozen = 0; m.cutscene = null; for (const v of U.victims) v.sprite.setDepth(0); }
    this.fx.setDepth(0);
    if (U) { this.x = U.origin.x; if (U.y !== undefined) this.y = U.y; }
    this.ult = null; this.invincible = 30;
    this.reform = 16;                                                         // rises back out of the puddle
    this.setState(this.grounded ? 'idle' : 'air');
    m.puff(this.x, this.y - 10, 0x6d26bd, 12);
  }
  // the deep's two giant glowing eyes, opening and blinking, slit pupils on the victim
  drawAbyssEyes(g, c, jawEdge, ct) {
    const open = Math.min(1, Math.max(0, (ct - 6) / 20)), blink = ct > 40 && ct % 70 > 66 ? 0.1 : 1;
    for (const ex of [-62, 62]) {
      const x = c.x + ex, y = jawEdge - 44, rx = 34, ry = 16 * open * blink;
      if (ry < 1) continue;
      g.fillStyle(this.fxColor, 0.25); g.fillEllipse(x, y, rx * 2 + 16, ry * 2 + 12);
      g.fillStyle(0xd8ff6a, 1); g.fillEllipse(x, y, rx * 2, ry * 2);
      g.fillStyle(0xf8ffd0, 1); g.fillEllipse(x - 6, y - ry * 0.3, rx, ry * 0.8);
      g.fillStyle(0x05020c, 1); g.fillEllipse(x + Phaser.Math.Clamp((c.x - x) * 0.1, -8, 8), y, 7, ry * 1.8);
    }
  }
  drawUndertow(g, L, U) {
    const t = this.anim, col = this.fxColor;
    if (U.phase === 'flood' || U.phase === 'recede' || U.phase === 'cutscene') {   // the puddle across the floor
      const w = U.phase === 'cutscene' ? L.spread : U.w, y = U.y;
      for (let x = -w; x < w; x += 4) {
        const edge = 1 - Math.abs(x) / Math.max(1, w), h = 2 + Math.round(4 * Math.min(1, edge * 4)) + Math.round(Math.sin(x * 0.2 + t * 0.15) * 1.2);
        g.fillStyle(0x0c0521, 0.95); g.fillRect(U.cx + x, y - h, 4, h + 2);
        if ((x / 4 + (t >> 3)) % 7 === 0) { g.fillStyle(col, 0.8); g.fillRect(U.cx + x, y - h, 3, 1); }
      }
      for (let k = 0; k < 6; k++) {                                        // bubbles
        const bx = U.cx + Math.sin(k * 71.3) * w * 0.9, by = y - 3 - ((t + k * 13) % 24) * 0.5;
        g.fillStyle(0x9b5de5, 1 - ((t + k * 13) % 24) / 24); g.fillRect(Math.round(bx), Math.round(by), 2, 2);
      }
    }
    if (U.phase !== 'cutscene') return;
    // ---- the abyss, centred on the first victim
    const v = U.victims[0]; if (!v) return;
    const c = v.center(), ct = U.ct, W = 440, H = 280;
    g.fillStyle(0x020108, 1); g.fillRect(c.x - W / 2, c.y - H / 2, W, H);
    for (let i = 0; i < 6; i++) { g.fillStyle(0x1a0a2e, 0.25 - i * 0.03); g.fillEllipse(c.x, c.y + 20, 420 - i * 60, 220 - i * 30); }
    for (let k = 0; k < 18; k++) {                                         // drifting motes in the dark
      const mx = c.x + Math.sin(k * 12.9) * 200, my = c.y + 120 - ((ct * (0.4 + (k % 3) * 0.2) + k * 30) % 260);
      g.fillStyle(k % 3 ? 0x6d26bd : col, 0.6); g.fillRect(Math.round(mx), Math.round(my), 2, 2);
    }
    // jaws: open wide, then snap shut on every chomp
    if (ct < L.eyesFor - 10) return this.drawAbyssEyes(g, c, c.y - 80, ct);   // eyes first, in the dark
    const local = ct - L.eyesFor, ph = ((local % L.chompEvery) + L.chompEvery) % L.chompEvery;
    let gap = U.chomp >= L.chomps ? 90 : ph < L.chompEvery - 6 ? 90 - Math.max(0, ph - 6) * 6 : 6;
    gap = Math.max(6, gap);
    if (local < 0) gap = 90 + (-local) * 6;
    for (const side of [-1, 1]) {
      const edge = c.y + side * gap / 2;                                     // where the teeth meet
      g.fillStyle(0x12061f, 1); g.fillRect(c.x - 190, side < 0 ? edge - 120 : edge, 380, 120);   // the jaw itself
      g.fillStyle(0x2a1040, 1); g.fillRect(c.x - 190, side < 0 ? edge - 8 : edge, 380, 8);         // gums
      for (let tx = c.x - 184; tx < c.x + 184; tx += 20) {                   // teeth
        const big = Math.abs(tx - c.x) < 60 ? 1.4 : 1;
        g.fillStyle(0xe8e0f0, 1); g.fillTriangle(tx, edge, tx + 16, edge, tx + 8, edge - side * 18 * big);      // fangs point at the victim
        g.fillStyle(0xa898c0, 1); g.fillTriangle(tx + 8, edge, tx + 16, edge, tx + 8, edge - side * 18 * big);
      }
    }
    this.drawAbyssEyes(g, c, c.y - gap / 2, ct);                            // set into the upper jaw: they ride up and down with each chomp
  }

  // ------------------------------------------------------------------ blade Limit (Lacy: Thousand Cuts)
  // grow the giant sword -> one big slash -> miss: fade away / hit: teleporting cut cutscene
  bladeLimit(L) {
    const m = this.match;
    if (this.t === 1) this.ult = { phase: 'grow', victims: [], slashes: [], cut: 0, origin: { x: this.x, y: this.y } };
    const U = this.ult;
    if (!this.grounded) this.vy = Math.min(this.vy, 0.5);
    if (U.phase === 'grow' && this.t >= L.slashFrom) { U.phase = 'slash'; sfx('swing', 1, 0.5); sfx('dodge', 0.8, 0.5); }
    if (U.phase === 'slash') {
      const [bx, by, bw, bh] = L.box, x1 = this.facing > 0 ? this.x + bx : this.x - bx - bw;
      for (const o of m.fighters) {
        if (o === this || !o.alive || o.team === this.team || o.state === 'respawn' || o.state === 'dying' || U.victims.includes(o)) continue;
        const hb = o.hurtbox();
        if (hb.x2 > x1 && hb.x1 < x1 + bw && hb.y2 > this.y + by && hb.y1 < this.y + by + bh) U.victims.push(o);
      }
      if (U.victims.length && this.t >= L.slashFrom + 3) {        // caught someone: into the cutscene
        U.phase = 'cutscene'; U.ct = 0; m.frozen = 9999; m.cutscene = this;
        for (const v of U.victims) { v.vx = v.vy = v.lx = v.ly = 0; v.stopChargeSound(); v.setState('hitstun'); v.hitstun = 999; }
        sfx('limitready', 1, 0.6); m.shake(10, 8);
        return;
      }
      if (this.t >= L.slashTo) { U.phase = 'whiff'; sfx('dodge', 0.6, 0.6); }
    }
    if (U.phase === 'whiff' && this.t >= L.whiffEnd) return this.endBladeLimit();
    if (U.phase === 'cutscene') return this.bladeCutscene(L, U);
  }
  bladeCutscene(L, U) {
    const m = this.match;
    U.ct++;
    U.victims = U.victims.filter((v) => v.alive && v.state !== 'dying');
    for (const s of U.slashes) s.life--;
    U.slashes = U.slashes.filter((s) => s.life > 0);
    if (!U.victims.length) return this.endBladeLimit();
    const v = U.victims[0], c = v.center();
    if (U.cut < L.cuts && U.ct % L.cutEvery === 0) {
      // teleport to a new spot around the target and cut straight through to the other side
      const a = U.cut * 2.39996 + 0.4, r = 46 + (U.cut % 3) * 8;            // golden-angle spiral: never the same spot twice
      const sx = c.x + Math.cos(a) * r, sy = c.y + Math.sin(a) * r * 0.75;
      const ex = c.x - Math.cos(a) * r, ey = c.y - Math.sin(a) * r * 0.75;
      U.from = { x: this.x, y: this.y };
      this.x = ex; this.y = ey + this.body.h / 2; this.facing = Math.sign(ex - sx) || 1;
      U.slashes.push({ x1: sx, y1: sy, x2: ex, y2: ey, life: 10 });
      U.cut++;
      for (const t of U.victims) m.applyHit(t, { h: L.cut, owner: this, facing: this.facing, id: 'cut' + this.slot + ':' + U.cut, pillar: true }, this.x);
      for (const t of U.victims) { t.lx = t.ly = 0; t.hitstun = 999; }
      sfx('swing', 0.7, 1.3 + (U.cut % 4) * 0.1);
      m.shake(2, 2);
    }
    const finalAt = L.cuts * L.cutEvery + 14;
    if (U.ct === finalAt - 10) {                                       // reappear for the last cut
      this.x = c.x - this.facing * 40; this.y = v.y; this.facing = Math.sign(c.x - this.x) || 1;
      sfx('limitready', 0.8, 0.8);
    }
    if (U.ct === finalAt) {
      U.slashes.push({ x1: c.x - this.facing * 60, y1: c.y + 20, x2: c.x + this.facing * 70, y2: c.y - 30, life: 18, big: true });
      for (const t of U.victims) { t.hitstun = 0; m.applyHit(t, { h: L.final, owner: this, facing: this.facing, id: 'cutfinal' + this.slot, pillar: true }, this.x); }
      sfx('bighit', 1, 0.6); m.shake(14, 12);
    }
    if (U.ct >= finalAt + 24) return this.endBladeLimit();
  }
  endBladeLimit() {
    const U = this.ult, m = this.match;
    if (U && U.phase === 'cutscene') { this.x = U.origin.x; this.y = U.origin.y; m.frozen = 0; m.cutscene = null; }
    this.ult = null; this.invincible = 30; this.grounded = false;
    this.setState('air');
  }

  drawBladeLimit(g, L, U) {
    const C = L.colors;
    if (U.phase !== 'cutscene') {
      // Her own sword grows: the blade starts exactly on the sprite's sword (same hilt, angle and length)
      // and stretches into a giant blade of light. Raised pose (attack1 frame 1): hilt (-27,-41), pointing
      // up and slightly back. Guard pose (sword at the shoulder): hilt (37,-26), pointing down and forward.
      const RAISED = { x: -27, y: -41, ang: -1.774 }, GUARD = { x: 37, y: -26, ang: 0.59 };
      const ease = (k) => 1 - (1 - k) * (1 - k);
      let pose = RAISED, grow = ease(Math.min(1, this.t / L.growUntil));
      if (U.phase === 'slash') {
        const k = Math.min(1, (this.t - L.slashFrom) / (L.slashTo - L.slashFrom));
        pose = { x: RAISED.x + (GUARD.x - RAISED.x) * k, y: RAISED.y + (GUARD.y - RAISED.y) * k, ang: RAISED.ang + (GUARD.ang - RAISED.ang) * k };
      } else if (U.phase === 'whiff') {
        pose = GUARD; grow = 1 - ease(Math.min(1, (this.t - L.slashTo) / (L.whiffEnd - L.slashTo)));   // shrinks back to normal
      }
      const len = 30 + 160 * grow, half = 1.5 + 6 * grow, glow = grow;
      const ang = pose.ang, hx = this.x + this.facing * pose.x, hy = this.y + pose.y;
      const dx = Math.cos(ang) * this.facing, dy = Math.sin(ang), nx = -dy, ny = dx;
      const blade = (w, col, a) => {
        g.fillStyle(col, a);
        g.fillPoints([
          { x: hx + nx * w, y: hy + ny * w }, { x: hx + dx * len * 0.88 + nx * w, y: hy + dy * len * 0.88 + ny * w },
          { x: hx + dx * len, y: hy + dy * len },
          { x: hx + dx * len * 0.88 - nx * w, y: hy + dy * len * 0.88 - ny * w }, { x: hx - nx * w, y: hy - ny * w },
        ], true);
      };
      if (glow > 0.05) blade(half + 6, 0x4ae0e0, (0.2 + 0.1 * Math.sin(this.anim * 0.5)) * glow);   // light around it
      blade(half + 1.5, C.outline, 1);
      blade(half, glow > 0.5 ? C.light : C.mid, 1);                                              // steel brightening into light
      blade(Math.max(0.6, half * 0.45), C.core, 0.6 + 0.4 * glow);
      g.fillStyle(C.outline, 1); g.fillRect(hx - nx * (half + 4) - 1, hy - ny * (half + 4) - 1, 3, 3); g.fillRect(hx + nx * (half + 4) - 1, hy + ny * (half + 4) - 1, 3, 3);
      g.fillStyle(0x929ca0, 1); g.fillRect(Math.round(hx - 2), Math.round(hy - 2), 4, 4);       // hilt in her hands
      if (U.phase === 'grow' && this.t % 3 === 0 && grow < 1) this.match.puff(hx + dx * len, hy + dy * len, 0x9ad8f0, 1);   // sparks at the growing tip
      if (U.phase === 'slash') {                                                                 // swing trail
        for (let k = 1; k < 7; k++) {
          const a2 = ang - k * 0.16;
          g.lineStyle(10 - k, k < 3 ? 0xffffff : 0x9ad8f0, 0.5 - k * 0.06);
          g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + Math.cos(a2) * this.facing * len, hy + Math.sin(a2) * len); g.strokePath();
        }
      }
      return;
    }
    // cutscene: every cut leaves a streak of light through the target
    for (const sl of U.slashes) {
      const k = sl.life / (sl.big ? 18 : 10), w = sl.big ? 10 : 5;
      g.lineStyle(w + 6, 0x4ae0e0, 0.35 * k); g.beginPath(); g.moveTo(sl.x1, sl.y1); g.lineTo(sl.x2, sl.y2); g.strokePath();
      g.lineStyle(w, 0xffffff, 0.95 * k); g.beginPath(); g.moveTo(sl.x1, sl.y1); g.lineTo(sl.x2, sl.y2); g.strokePath();
    }
    if (U.from) { g.fillStyle(0x9ad8f0, 0.35); g.fillRect(U.from.x - 6, U.from.y - 44, 12, 40); }   // afterimage where she just was
  }

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

  // ------------------------------------------------------------------ stamina death
  // Stamina ran out: play the death animation (fighters that have one), then the KO happens.
  startDying() {
    this.setState('dying'); this.lx = this.ly = 0; this.vx = 0; this.hitstun = 0;
    this.stopChargeSound(); this.possessed = 0;
    if (this.grabbed) { this.grabbed.grabbedBy = null; this.grabbed.setState('air'); this.grabbed = null; }
    if (this.grabbedBy) { this.grabbedBy.grabbed = null; this.grabbedBy.setState('idle'); this.grabbedBy = null; }
    this.match.popText(this, 'DEFEATED', '#ff5a5a');
  }
  st_dying() { if (this.t >= 80) this.match.onKO(this); }

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
        return { sheet: S.attack2, frame: U.ct % L.cutEvery < 2 ? 4 : 5 };                        // mid-dash between cuts
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
    if (s === 'run' && this.sheets.run && !d.ownAnims) {   // run: ease in through frames 0-2 once, then loop the stride 3-7, faster at speed
      this.runPhase = (this.runPhase || 0) + 0.09 + Math.abs(this.vx) * 0.035;
      sheet = this.sheets.run; frame = this.runPhase < 3 ? Math.floor(this.runPhase) : 3 + Math.floor(this.runPhase - 3) % 5;
    }
    else if (s === 'run' && this.sheets.walk) {      // walk cycle: the stride speeds up with ground speed
      this.walkPhase = ((this.walkPhase || 0) + Math.max(0.08, Math.abs(this.vx) * 0.055)) % 8;
      sheet = this.sheets.walk; frame = Math.floor(this.walkPhase);
      spr.setRotation(Phaser.Math.Clamp(this.vx * 0.012, -0.05, 0.05));
    }
    else if (s === 'run') { frame = Math.floor(this.anim / 3) % 32; spr.setRotation(0.1 * this.facing); spr.y -= (Math.floor(this.anim / 5) % 2); }
    else if (s === 'jumpsquat' || s === 'land') spr.setScale(1.08, 0.9);
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
    else if (s === 'limit') { sheet = alt; frame = 12; if (d.limit.type !== 'undertow') spr.y -= Math.min(16, this.t / 2); }
    else if (s === 'roll' || s === 'spotdodge') spr.setAlpha(0.55);
    else if (s === 'ledge') { frame = 6; spr.setRotation(-0.12 * this.facing); }
    else if (s === 'ledgeclimb' || s === 'ledgeattack') { frame = s === 'ledgeattack' && this.t >= 14 ? 3 : 6; if (s === 'ledgeattack' && this.t >= 14) sheet = alt; spr.setScale(1, this.t < 6 ? 1.08 : 1); }
    else if (s === 'ledgeroll') { spr.setAlpha(0.55); frame = 6; }
    else if (s === 'holding') { sheet = alt; frame = 1; }
    else if (s === 'grabbed') { frame = 10; spr.setRotation(-0.2 * this.facing); }
    if (this.hurtAnim > 0) this.hurtAnim--;
    if (d.ownAnims) {                          // fighters drawn from their own animation strips
      const a = this.animFrame(s);
      sheet = a.sheet; frame = a.frame;
      spr.setRotation(a.rot || 0); spr.setAlpha(a.alpha ?? 1); spr.y = Math.round(this.y);
      if (s !== 'jumpsquat' && s !== 'land') spr.setScale(1, 1);
      if (a.flip) spr.setFlipX(!spr.flipX);
    }
    if (spr.texture.key !== sheet) spr.setTexture(sheet, frame); else spr.setFrame(frame);

    // hit flash and invincibility blink
    if (this.silhouette > 0) { this.silhouette--; spr.setTint(0x120e1c).setTintMode(Phaser.TintModes.FILL); }    // frozen by a counter
    else if (this.flash > 0) { this.flash--; spr.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL); }
    else { spr.setTint(this.possessed > 0 ? (this.anim % 16 < 8 ? 0xb07ad0 : 0x8a5ad0) : this.curse > 0 ? 0xb07ad0 : this.slow > 0 ? 0x8a80b0 : PLAYER_TINTS[this.slot]).setTintMode(Phaser.TintModes.MULTIPLY); }
    if (this.isIntangible() && s !== 'limit' && s !== 'counterstrike' && (this.anim >> 2) % 2) spr.setAlpha(0.45);
    if (s === 'limit' && d.limit.type === 'undertow' && this.ult) {          // The Undertow: melted into the puddle
      const U = this.ult;
      if (U.phase === 'melt') { const k = Math.min(1, this.t / d.limit.melt); spr.setScale(1 + k * 0.6, 1 - k * 0.92); spr.setTint(0x2a1040).setTintMode(Phaser.TintModes.FILL); }
      else spr.setAlpha(0);
    } else if (this.reform > 0) { this.reform--; spr.setScale(1 + this.reform * 0.03, 1 - this.reform * 0.055); }
    if (this.vfx) { this.drawSkinAura(g); this.drawTrail(spr); }
    if (s === 'swingcharge') {                      // Grand Slam: a glowing point at the blade's tip, swelling with the charge
      const C = d.moves.neutralB.charge, k = this.swingCharge / C.max, full = k >= 1;
      const tx = this.x + this.facing * C.tip[0], ty = this.y + C.tip[1], pulse = full && this.anim % 6 < 3 ? 2 : 0;
      g.fillStyle(full ? 0xffe08a : this.fxColor, 0.25 + 0.25 * k); g.fillCircle(tx, ty, 3 + 6 * k + pulse);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(tx, ty, 1.5 + 1.5 * k);
    }

    // name tag
    this.tag.setPosition(Math.round(this.x), Math.round(this.y - (d.tagY || 60) - (s === 'limit' ? 16 : 0)));

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
      g.fillStyle(0x076cc2, 1); g.fillRect(hx - r, hy - r, r * 2, r * 2);
      g.fillStyle(0x78a0c6, 1); g.fillRect(hx - r * 0.65, hy - r * 0.65, r * 1.3, r * 1.3);
      g.fillStyle(0xf0f2f3, 1); g.fillRect(hx - r * 0.3, hy - r * 0.3, r * 0.6, r * 0.6);
      if (k >= 1 && this.t % 10 < 5) { g.lineStyle(1, 0xf0f2f3, 1); g.strokeRect(hx - r - 3, hy - r - 3, r * 2 + 6, r * 2 + 6); }
    }
    // Soulfire Jet: a flickering column of blue flame under his feet
    if (s === 'upb' && d.moves.upb.jet) {
      const u = d.moves.upb, j = u.jet;
      if (this.t >= u.riseAt && this.t <= j.to + 4) {
        const fade = this.t > j.to ? 1 - (this.t - j.to) / 5 : Math.min(1, (this.t - u.riseAt + 1) / 3);
        const len = (46 + (this.anim % 4) * 5) * fade, fy = this.y - 2;
        const cols = [[0x1a1020, 1.12], [0x076cc2, 1], [0x78a0c6, 0.62], [0xf0f2f3, 0.26]];   // outer, middle, white-hot core
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
        g.fillStyle(0x78a0c6, 1);
        for (let k = 0; k < 3; k++) { const ph = (this.anim * 3 + k * 7) % 18; g.fillRect(this.x - 6 + k * 5 + ((this.anim + k) % 3) - 1, fy + len + ph - 6, 3, 3); }
      }
    }
    // Thousand Cuts: the giant sword of light, its swing, and the cuts of the cutscene
    if (s === 'limit' && d.limit.type === 'blade' && this.ult) this.drawBladeLimit(g, d.limit, this.ult);
    if (s === 'limit' && d.limit.type === 'undertow' && this.ult) this.drawUndertow(g, d.limit, this.ult);
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
          g.fillStyle(this.dragonSpin ? (i % 2 ? 0xf3c358 : 0xe0402a) : (i % 2 ? 0xb8fff4 : 0x4ae0e0), 0.9); g.fillRect(Math.round(tx + Math.cos(a) * r) - 1, Math.round(ty + Math.sin(a) * r) - 1, 2, 2);
        }
        g.fillStyle(this.dragonSpin ? 0xf3c358 : 0xb8fff4, 0.25 + 0.5 * k); g.fillCircle(tx, ty, 2 + 4 * k);
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
          const cols = [0xffffff, 0xe0fffa, 0xb8fff4, 0x7af0e8, 0x4ae0e0, 0x22b8c8, 0x1a8aa0];
          // a faint full ring, then a thick glowing crescent sweeping around it
          for (let k = 0; k < 40; k++) {
            const a = (k / 40) * Math.PI * 2;
            g.fillStyle(0x7af0e8, 0.22 * fade); g.fillRect(Math.round(cx + Math.cos(a) * rx) - 1, Math.round(cy + Math.sin(a) * ry) - 1, 3, 2);
          }
          for (let pass = 0; pass < 2; pass++) {
            for (let k = 0; k < 34; k++) {
              const a = head - k * 0.15 * this.facing;
              const sz = Math.max(2, Math.round((9 - k * 0.22) * big)) + (pass ? 0 : 4);
              const px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry;
              g.fillStyle(pass ? cols[Math.min(cols.length - 1, Math.floor(k / 5))] : 0x4ae0e0, (pass ? 0.95 : 0.25) * (1 - k / 36) * fade);
              g.fillRect(Math.round(px - sz / 2), Math.round(py - sz / 2), sz, sz);
            }
          }
          if (!this.spinGround && st % 3 === 0) this.match.puff(cx + (Math.random() - 0.5) * 30, this.y + 4, 0x7af0e8, 1);   // light streaming below as she rises
          }
        }
      }
    }
    // attack swipe effects (placeholder until attack animations are drawn)
    for (const hb of this.activeHitboxes()) {
      if (this.state === 'upb' && d.moves.upb.jet && hb.h.angle < 0) continue;   // the flame column is the effect
      if (d.ownAnims && (hb.src && hb.src.anim || this.state === 'upb' || this.state === 'ledgeattack')) continue;   // the strip draws its own sword swipe
      const fx = hb.src && hb.src.fx;
      g.fillStyle((hb.src && hb.src.fxTint) || this.fxColor, (hb.src && hb.src.fxTint) ? 0.85 : 0.55);
      if (fx === 'hex') {     // Soul Hex: a swirling purple curse with a dark eye
        const cx = (hb.x1 + hb.x2) / 2, cy = (hb.y1 + hb.y2) / 2, rx = (hb.x2 - hb.x1) / 2, ry = (hb.y2 - hb.y1) / 2;
        for (let k = 0; k < 10; k++) { const a = this.t * 0.4 + k * 0.63, r = 0.35 + 0.65 * (k / 10);
          g.fillStyle(k % 2 ? 0xb07ad0 : 0x6d26bd, 1); g.fillRect(cx + Math.cos(a) * rx * r - 2, cy + Math.sin(a) * ry * r - 2, 4, 4); }
        g.fillStyle(0x0b0a14, 1); g.fillEllipse(cx, cy, 12, 8); g.fillStyle(0xf3c358, 1); g.fillRect(cx - 1, cy - 1, 3, 3);
        continue;
      }
      if (fx === 'spin' || fx === undefined) g.fillCircle((hb.x1 + hb.x2) / 2, (hb.y1 + hb.y2) / 2, (hb.x2 - hb.x1) / 2);
      else g.fillEllipse((hb.x1 + hb.x2) / 2, (hb.y1 + hb.y2) / 2, hb.x2 - hb.x1, hb.y2 - hb.y1);
      g.fillStyle(0xf0f2f3, 0.8);
      g.fillEllipse((hb.x1 + hb.x2) / 2, (hb.y1 + hb.y2) / 2, (hb.x2 - hb.x1) * 0.5, Math.max(3, (hb.y2 - hb.y1) * 0.3));
    }
    // off-screen arrow is handled by the HUD
  }

  // SAMURAI costume's Cyclone Slash: a red-and-gold Eastern dragon chasing its tail around her.
  // The head leads at angle `head` on the ellipse (rx, ry) and the long body trails behind, rippling.
  drawSpinDragon(front, cx, cy, rx, ry, head, fade, big) {
    const back = this.fxBack, layer = (a) => (Math.sin(a) < 0 ? back : front);   // the upper half of the loop is behind her
    ry = Math.max(ry, 18 * big);
    const f = this.facing, N = 64, pts = [];
    for (let k = 0; k < N; k++) {
      const a = head - k * 0.1 * f;
      const wob = Math.sin(k * 0.55 - this.anim * 0.45) * 3 * big;
      pts.push({ x: cx + Math.cos(a) * (rx + wob * 0.6), y: cy + Math.sin(a) * ry + wob, a });
    }
    const thick = (k) => Math.max(1.3, (k < 6 ? 4 + k * 0.35 : 6 - (k - 6) * 0.08) * big);
    const OUT = 0x2a0406, RED = 0xc81e28, LIT = 0xf05a3c, GOLD = 0xf3c358, DGOLD = 0xb07818;
    // tail flame tuft
    const t = pts[N - 1], tp = pts[N - 3];
    let g = layer(t.a);
    for (let i = 0; i < 3; i++) {
      const ang = Math.atan2(t.y - tp.y, t.x - tp.x) + (i - 1) * 0.6 + Math.sin(this.anim * 0.5 + i) * 0.2;
      g.fillStyle(i === 1 ? GOLD : 0xe0702a, 0.95 * fade);
      g.fillTriangle(t.x, t.y - 2, t.x, t.y + 2, t.x + Math.cos(ang) * 10 * big, t.y + Math.sin(ang) * 10 * big);
    }
    // body: dark outline, red scales, gold belly, back to front so the neck sits on top
    for (let pass = 0; pass < 3; pass++) {
      for (let k = N - 1; k >= 1; k--) {
        const p = pts[k], r = thick(k); g = layer(p.a);
        if (pass === 0) { g.fillStyle(OUT, 0.95 * fade); g.fillCircle(p.x, p.y, r + 1); }
        else if (pass === 1) { g.fillStyle((k >> 1) % 2 ? RED : LIT, fade); g.fillCircle(p.x, p.y, r); }
        else {
          g.fillStyle(GOLD, 0.95 * fade); g.fillCircle(p.x, p.y + r * 0.45, r * 0.45);       // belly plates
          if (k % 5 === 0 && k < N - 6) {                                                   // dorsal spines pointing away from her
            const ox = Math.cos(p.a), oy = Math.sin(p.a) * (ry / rx);
            const n = Math.hypot(ox, oy) || 1;
            g.fillStyle(k % 10 ? GOLD : DGOLD, fade);
            g.fillTriangle(p.x - 2, p.y - r * 0.6, p.x + 2, p.y - r * 0.6, p.x + (ox / n) * (r + 5), p.y - r - 3 + (oy / n) * 3);
          }
        }
      }
    }
    // head, facing the way it travels
    const h = pts[0], n1 = pts[3];
    g = layer(h.a);
    const dx = h.x - n1.x, dy = h.y - n1.y, dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl, vx = -uy, vy = ux;
    const at = (fwd, side) => [h.x + ux * fwd * big + vx * side * big, h.y + uy * fwd * big + vy * side * big];
    const up = vy < 0 ? 1 : -1;                                         // "up" side of the head on screen
    const tri = (A, B, C, col) => { g.fillStyle(col, fade); g.fillTriangle(A[0], A[1], B[0], B[1], C[0], C[1]); };
    // horns sweeping back
    tri(at(-2, 3 * up), at(0, 4 * up), at(-12, 10 * up), GOLD);
    tri(at(-4, 2 * up), at(-2, 3 * up), at(-13, 6 * up), DGOLD);
    // skull and snout
    g.fillStyle(OUT, fade); g.fillCircle(h.x, h.y, 6.5 * big); { const s = at(6, 0); g.fillCircle(s[0], s[1], 4.5 * big); }
    g.fillStyle(RED, fade); g.fillCircle(h.x, h.y, 5.5 * big); { const s = at(6, 0); g.fillCircle(s[0], s[1], 3.6 * big); }
    // open jaw with fangs
    const jaw = this.anim % 12 < 6 ? 3.5 : 2;
    tri(at(1, -1 * up), at(11, -jaw * up), at(3, -4 * up), LIT);
    tri(at(8, -0.5 * up), at(9, -2.5 * up), at(10, -0.5 * up), 0xffffff);
    // mane tufts behind the head
    tri(at(-3, -4 * up), at(-5, 0), at(-12, -6 * up), GOLD);
    // eye
    { const e = at(2, 2 * up); g.fillStyle(0xfff2a0, fade); g.fillRect(Math.round(e[0]) - 1, Math.round(e[1]) - 1, 3, 2); g.fillStyle(OUT, fade); g.fillRect(Math.round(e[0]) + (ux > 0 ? 1 : -1), Math.round(e[1]) - 1, 1, 2); }
    // long whiskers streaming back
    g.lineStyle(1, GOLD, 0.9 * fade);
    for (const side of [1, -1]) {
      let [px, py] = at(9, side * up * 1.5);
      for (let i = 1; i <= 7; i++) {
        const [qx, qy] = at(9 - i * 3.2, side * up * (1.5 + i * 0.9) + Math.sin(this.anim * 0.4 + i * 0.9) * 1.5);
        g.lineBetween(px, py, qx, qy); px = qx; py = qy;
      }
    }
    // pearl of light it chases
    { const pr = at(20, 0); g.fillStyle(0xfff6d0, 0.6 * fade); g.fillCircle(pr[0], pr[1], 3.5 * big); g.fillStyle(0xffffff, fade); g.fillCircle(pr[0], pr[1], 1.5 * big); }
  }

  // ------------------------------------------------------------------ milestone costume effects
  // Ambient effects around a fighter wearing a milestone costume (skins.js vfx.aura). Higher milestones
  // stack more of them: orbiting wisps, a crown of flames, a halo, wings, bubbles, glowing spots...
  drawSkinAura(g) {
    const a = this.vfx.aura;
    if (!a || this.state === 'respawn' && this.anim % 4 < 2) return;
    const d = this.def, back = this.fxBack, t = this.anim, f = this.facing, R = Math.random, P = this.match.particles;
    const cx = this.x, top = this.y - (d.headTop || d.body.h + 4), mid = this.y - d.body.h * 0.55;
    if (a.wings) {                                   // feathered wings of light behind her back, slowly beating
      const sx = cx - f * 4, sy = this.y - d.body.h * 0.78, flap = Math.sin(t * 0.08);
      for (const far of [1, 0]) {                     // far wing first (dimmer, a little higher), then the near one
        const ox = far ? f * 3 : 0, oy = far ? -3 : 0, lift = flap * (far ? 0.12 : 0.18);
        const arm = [];                               // the wing's leading edge, sweeping up and back
        for (let k = 0; k <= 8; k++) {
          const u = k / 8, rise = 30 * (1 + lift);
          arm.push([sx + ox - f * (u * 26 + u * u * 6), sy + oy - u * rise + u * u * rise * 0.45]);
        }
        for (let k = 8; k >= 1; k--) {                // feathers hanging off the arm: long primaries at the tip
          const [px, py] = arm[k], u = k / 8, len = 12 + u * 18, bk = -f * (0.15 + u * 0.4);
          const ex = px + bk * len, ey = py + len * 0.92 - flap * 2 * u;
          this.fxBack.fillStyle(a.wings[far ? 2 : (k > 5 ? 0 : 1)], far ? 0.55 : 0.9);
          this.fxBack.fillTriangle(px - 3, py, px + 3, py, ex, ey);
          this.fxBack.fillStyle(0xffffff, far ? 0.3 : 0.75); this.fxBack.lineStyle(1, 0xffffff, far ? 0.25 : 0.6);
          this.fxBack.lineBetween(px, py, (px + ex) / 2, (py + ey) / 2);
        }
        for (let k = 0; k < 8; k++) {                 // the arm itself: soft coverts along the top
          const [ax, ay] = arm[k], [bx, by] = arm[k + 1];
          this.fxBack.lineStyle(4 - (k >> 2), a.wings[far ? 2 : 0], far ? 0.6 : 1); this.fxBack.lineBetween(ax, ay, bx, by);
        }
      }
      back.fillStyle(0xffffff, 0.22); back.fillCircle(sx, sy, 6 + Math.sin(t * 0.2));
    }
    if (a.halo !== undefined) {                      // a thin ring of light floating over the head
      const hy = top - 6 + Math.round(Math.sin(t * 0.07));
      back.lineStyle(2, a.halo, 0.9); back.strokeEllipse(cx, hy, 16, 5);
      g.lineStyle(1, 0xffffff, 0.7); g.strokeEllipse(cx, hy, 12, 3);
    }
    if (a.crown) {                                   // a crown of floating flames above the head
      const n = a.crown.n, sp = a.crown.big ? 6 : 5, base = top - 4 + Math.round(Math.sin(t * 0.06));
      g.fillStyle(a.crown.colors[0], 0.22); g.fillEllipse(cx, base - 5, n * sp + 12, 14);
      for (let k = 0; k < n; k++) {
        const off = k - (n - 1) / 2, x = Math.round(cx + off * sp), lift = Math.round((n / 2 - Math.abs(off)) * 2);
        const h = 7 + ((t >> 2) + k * 3) % 3 + (a.crown.big ? 3 : 0), y = base - lift;
        for (let r = 0; r < h; r++) {                // a tapering, flickering tongue of flame
          const u = r / h, w = Math.max(1, Math.round(5 * Math.pow(1 - u, 0.7))), sx = x + Math.round(Math.sin(t * 0.25 + k * 1.3 + r * 0.6) * u * 1.4) - (w >> 1);
          g.fillStyle(a.crown.colors[0], 0.95); g.fillRect(sx, y - r, w, 1);
          if (w >= 3) { g.fillStyle(a.crown.colors[1], 1); g.fillRect(sx + 1, y - r, w - 2, 1); }
          if (r < h * 0.35 && w >= 3) { g.fillStyle(a.crown.colors[2], 1); g.fillRect(sx + (w >> 1), y - r, 1, 1); }
        }
      }
    }
    if (a.coral) {                                   // a crown of coral branches on the hat
      const base = top + 1;
      g.fillStyle(a.coral[1], 1); g.fillRect(Math.round(cx) - 7, base, 15, 2);       // gold band
      for (const [dx, h, br] of [[-5, 7, -1], [0, 10, 1], [5, 7, 1], [-2, 5, 1], [3, 5, -1]]) {
        const x = Math.round(cx + dx);
        g.fillStyle(a.coral[0], 1); g.fillRect(x, base - h, 2, h);
        g.fillRect(x + br * 2, base - h + 2, 2, 1); g.fillRect(x + br * 3, base - h, 1, 3);
        g.fillStyle(a.coral[1], 1); g.fillRect(x, base - h - 1, 2, 1); g.fillRect(x + br * 3, base - h - 1, 1, 1);
      }
    }
    if (a.orbit) {                                   // wisps circling the body, passing behind it
      const o = a.orbit;
      for (let k = 0; k < o.n; k++) {
        const ang = t * 0.06 + k * Math.PI * 2 / o.n, x = cx + Math.cos(ang) * o.r, y = mid + Math.sin(ang) * o.r * 0.35 + Math.sin(t * 0.1 + k) * 3;
        const gg = Math.sin(ang) < 0 ? back : g, c = o.colors[k % o.colors.length];
        for (let j = 1; j <= 4; j++) { const pa = ang - j * 0.12; gg.fillStyle(c, 0.5 - j * 0.1); gg.fillRect(Math.round(cx + Math.cos(pa) * o.r) - 1, Math.round(mid + Math.sin(pa) * o.r * 0.35 + Math.sin(t * 0.1 + k) * 3) - 1, 2, 2); }
        gg.fillStyle(c, 0.3); gg.fillCircle(x, y, 5);
        gg.fillStyle(c, 1); gg.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
        gg.fillStyle(0xffffff, 1); gg.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
      }
    }
    if (a.ribbons) {                                 // two ribbons of water coiling around him
      for (let k = 0; k < 2; k++) {
        for (let j = 0; j < 22; j++) {
          const ang = t * 0.05 + k * Math.PI + j * 0.16, x = cx + Math.cos(ang) * 24, y = this.y - 8 - j * 2.2 + Math.sin(ang) * 6;
          const gg = Math.sin(ang) < 0 ? back : g;
          gg.fillStyle(a.ribbons.colors[(j >> 2) % 2], 0.85 - j * 0.03); gg.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 2);
        }
      }
    }
    if (a.spots) {                                   // bioluminescent spots blinking on and off around him
      for (let k = 0; k < a.spots.n; k++) {
        const h = Math.sin(k * 91.7) * 0.5 + 0.5, h2 = Math.sin(k * 37.3) * 0.5 + 0.5;
        const x = cx + (h - 0.5) * d.body.w * 1.6, y = this.y - 6 - h2 * d.body.h * 0.9, on = Math.sin(t * 0.08 + k * 1.7);
        if (on < 0) continue;
        g.fillStyle(a.spots.colors[k % a.spots.colors.length], 0.4 * on); g.fillRect(Math.round(x) - 2, Math.round(y) - 2, 5, 5);
        g.fillStyle(0xffffff, on); g.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }
    if (!this.match.frozen) {                        // particles that drift off the body
      if (a.motes && t % a.motes.rate === 0) {
        const c = a.motes.colors[(t / a.motes.rate) % a.motes.colors.length | 0];
        if (a.motes.feathers && t % (a.motes.rate * 3) === 0) P.push({ shape: 'feather', x: cx - f * 6 + (R() - 0.5) * 30, y: this.y - d.body.h, vx: (R() - 0.5) * 0.5, vy: 0.2, life: 70, color: c, grav: 0.004, sway: R() * 6 });
        else P.push({ x: cx + (R() - 0.5) * d.body.w * 1.4, y: this.y - R() * d.body.h, vx: 0, vy: -0.3 - R() * 0.4, life: 30 + R() * 20, color: c, size: 1 + (R() < 0.4), grav: -0.004 });
      }
      if (a.bubbles && t % a.bubbles.rate === 0) P.push({ shape: 'bubble', x: cx + (R() - 0.5) * d.body.w * 1.4, y: this.y - R() * d.body.h * 0.8, vx: 0, vy: -0.4 - R() * 0.4, life: 40 + R() * 20, color: a.bubbles.colors[(t / a.bubbles.rate) % a.bubbles.colors.length | 0], grav: -0.01, r: 1 + Math.floor(R() * 2), sway: R() * 6 });
    }
  }

  // Afterimages (the 100-KO costumes): faded copies of the last few frames trail behind when moving fast.
  drawTrail(spr) {
    if (!this.ghosts.length) return;
    const h = this.trailHist;
    h.push({ x: spr.x, y: spr.y, key: spr.texture.key, frame: spr.frame.name, flip: spr.flipX, rot: spr.rotation, sx: spr.scaleX, sy: spr.scaleY, ox: spr.originX, oy: spr.originY });
    if (h.length > 12) h.shift();
    const fast = Math.hypot(this.vx + this.lx, this.vy + this.ly) > 2.6 || ['attack', 'upb', 'airdodge', 'roll', 'limit', 'counterstrike'].includes(this.state);
    this.ghosts.forEach((gh, i) => {
      const e = h[h.length - 1 - (i + 1) * 3];
      if (!fast || !e) { gh.setVisible(false); return; }
      gh.setVisible(true).setTexture(e.key, e.frame).setPosition(e.x, e.y).setFlipX(e.flip).setRotation(e.rot).setScale(e.sx, e.sy).setOrigin(e.ox, e.oy)
        .setTint(this.vfx.trail).setTintMode(Phaser.TintModes.FILL).setAlpha(0.42 - i * 0.12);
    });
  }

  destroy() { this.stopChargeSound(); this.sprite.destroy(); this.fx.destroy(); this.fxBack.destroy(); this.tag.destroy(); for (const gh of this.ghosts) gh.destroy(); }
}

// A fighter: its own fixed-step physics, a state machine, attacks and rendering.
// Position (x, y) is the point between the fighter's feet; y grows downward.
import { PHYS, BLAST, LIMIT_MAX, PLAYER_COLORS, PLAYER_TINTS, FONT } from '../config.js';
import { sfx } from '../audio/sfx.js';

let nextAttackId = 1;
const BUFFER = 7;   // frames an early button press is remembered

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
    this.stats = { damageDealt: 0, damageTaken: 0 };

    const s = this.scene;
    this.sprite = s.add.sprite(0, 0, def.sheets.idle, 0).setOrigin(0.5, def.originY);
    this.sprite.setTint(PLAYER_TINTS[slot]);
    this.fx = s.add.graphics();
    this.tag = s.add.text(0, 0, this.label, { fontFamily: FONT, fontSize: '8px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5, 1);
    this.tag.setColor('#' + this.color.toString(16).padStart(6, '0'));
    match.addWorld(this.sprite, this.fx, this.tag);
  }

  // ------------------------------------------------------------------ helpers
  get body() { return this.def.body; }
  hurtbox() { const b = this.body; return { x1: this.x - b.w / 2, x2: this.x + b.w / 2, y1: this.y - b.h, y2: this.y }; }
  center() { return { x: this.x, y: this.y - this.body.h / 2 }; }
  setState(s) { this.state = s; this.t = 0; }
  actionable() { return ['idle', 'run', 'air', 'land', 'shield'].includes(this.state) || (this.state === 'land' && this.t >= 2); }
  get cursedMult() { return this.curse > 0 ? 0.7 : 1; }

  placeAt(x, y) {
    this.x = x; this.y = y; this.vx = this.vy = this.lx = this.ly = 0;
    this.grounded = false; this.setState('air');
  }

  // ------------------------------------------------------------------ per-frame logic
  step() {
    const c = this.ctrl;
    if (!this.alive) {
      if (!this.eliminated && --this.respawnTimer <= 0) this.respawn();
      return;
    }
    // remember presses so they fire as soon as the fighter can act
    for (const b of Object.keys(this.buffer)) {
      if (c.pressed(b)) this.buffer[b] = BUFFER; else if (this.buffer[b] > 0) this.buffer[b]--;
    }
    if (this.hitstop > 0) { this.hitstop--; return; }

    this.t++;
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
      this.buffer.special = 0;
      if (c.down) { this.startSummon(); return true; }
      if (c.up && !this.usedUpB) { this.startUpB(c); return true; }
      if (c.up && this.usedUpB) return false;
      if (Math.abs(c.x) > 0.5) this.facing = Math.sign(c.x);
      this.startCharge(); return true;
    }
    if (this.buffer.grab && ground) { this.buffer.grab = 0; this.startAttack('grab'); return true; }
    if (this.buffer.attack) {
      this.buffer.attack = 0;
      if (ground) {
        if (c.up) this.startAttack('utilt');
        else if (c.down) this.startAttack('dtilt');
        else if (Math.abs(c.x) > 0.5) { this.facing = Math.sign(c.x); this.startAttack('ftilt'); }
        else this.startAttack('jab');
      } else {
        if (c.up) this.startAttack('uair');
        else if (c.down) this.startAttack('dair');
        else if (Math.abs(c.x) > 0.5) this.startAttack(Math.sign(c.x) === this.facing ? 'fair' : 'bair');
        else this.startAttack('nair');
      }
      return true;
    }
    return false;
  }

  st_jumpsquat(c) {
    // W doubles as jump; pressing attack/special during the squat turns it into an up attack / up special
    if (this.buffer.attack && c.up) { this.buffer.attack = 0; this.startAttack('utilt'); return; }
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
    // after Soul Ascent: drift only, until landing
    if (this.t % 8 === 0) this.match.puff(this.x, this.y - 30, 0x78a0c6, 1);
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
      this.setState('attack'); this.move = { frames: 18 }; this.attackId = nextAttackId++;
    }
  }
  st_grabbed() {
    if (!this.grabbedBy || this.t > 60) { this.grabbedBy = null; this.setState('idle'); }
  }

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

  // ---- up special: Soul Ascent
  startUpB(c) {
    this.usedUpB = true; this.setState('upb'); this.attackId = nextAttackId++; this.hitList = new Set();
    if (Math.abs(c.x) > 0.3) this.facing = Math.sign(c.x);
    this.vx = 0; this.vy = 0; this.lx = this.ly = 0;
  }
  st_upb(c) {
    const u = this.def.moves.upb;
    if (this.t < u.riseAt) { this.vy = 0; return; }
    if (this.t === u.riseAt) { this.vy = u.riseV; this.grounded = false; this.platform = null; sfx('djump', 0.7, 0.7); }
    this.vx = c.x * u.drift;
    if (this.t % 2 === 0) this.match.puff(this.x, this.y - 10, 0x78a0c6, 2);
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
    if (this.state === 'limit') return true;
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
    this.vy = this.grounded ? 0 : Math.max(-1.2, this.vy - 0.2);
    L.hits.forEach((h, i) => { if (h.at === this.t) this.match.limitHit(this, i); });
    if (this.t >= L.beamStart && this.t <= L.beamEnd && this.t % 2 === 0) {
      this.match.puff(this.x + this.facing * this.def.handOffset.x, this.y + this.def.handOffset.y, this.t % 4 ? 0x78a0c6 : 0xf0f2f3, 2);
    }
    if (this.t >= L.frames) { this.invincible = 30; this.setState(this.grounded ? 'idle' : 'air'); }
  }

  // ------------------------------------------------------------------ physics and collision
  physics(c) {
    const d = this.def;
    const s = this.state;
    if (s === 'grabbed') return;
    if (s === 'respawn') return;
    if (this.dropTimer > 0) this.dropTimer--;

    const canSteerAir = ['air', 'helpless', 'attack', 'charge', 'summon'].includes(s) && !this.grounded;
    const groundMove = this.grounded && (s === 'run');

    if (this.grounded) {
      if (groundMove) {
        const target = c.x * d.walkSpeed * (this.curse > 0 ? 0.6 : 1);
        this.vx += Math.sign(target - this.vx) * Math.min(Math.abs(target - this.vx), d.runAccel);
      } else if (s !== 'roll') {
        this.vx -= Math.sign(this.vx) * Math.min(Math.abs(this.vx), d.groundFriction);
      }
      this.vy = 0;
    } else {
      if (canSteerAir) {
        const max = d.airSpeed * (this.curse > 0 ? 0.6 : 1) * (s === 'helpless' ? 0.7 : 1);
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
      this.jumpsLeft = 1; this.airdodged = false; this.usedUpB = false; this.fastFalling = false;
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
    if (this.x < BLAST.left || this.x > BLAST.right || this.y > BLAST.bottom || (this.y < BLAST.top && this.state === 'hitstun')) {
      this.match.onKO(this);
    }
  }

  ko() {
    this.alive = false; this.stopChargeSound();
    if (this.grabbed) { this.grabbed.grabbedBy = null; this.grabbed.setState('air'); this.grabbed = null; }
    if (this.grabbedBy) { this.grabbedBy.grabbed = null; this.grabbedBy.setState('idle'); this.grabbedBy = null; }
    this.sprite.setVisible(false); this.tag.setVisible(false); this.fx.clear();
    this.respawnTimer = 70;
  }

  respawn() {
    this.alive = true; this.percent = 0; this.hp = this.maxHp; this.curse = 0;
    this.x = 0; this.y = -230; this.vx = this.vy = this.lx = this.ly = 0;
    this.grounded = false; this.facing = 1; this.jumpsLeft = 1; this.usedUpB = false; this.airdodged = false;
    this.setState('respawn'); this.invincible = 0;
    this.sprite.setVisible(true); this.tag.setVisible(true);
  }

  // ------------------------------------------------------------------ drawing
  render(frameCount) {
    const spr = this.sprite, g = this.fx, d = this.def;
    g.clear();
    if (!this.alive) return;
    this.anim++;
    spr.setPosition(Math.round(this.x), Math.round(this.y));
    spr.setFlipX(this.facing < 0);
    spr.setRotation(0); spr.setScale(1, 1); spr.setAlpha(1);

    let sheet = d.sheets.idle, frame = Math.floor(this.anim / 6) % 32;
    const s = this.state;
    if (s === 'run') { frame = Math.floor(this.anim / 3) % 32; spr.setRotation(0.1 * this.facing); spr.y -= (Math.floor(this.anim / 5) % 2); }
    else if (s === 'jumpsquat' || s === 'land') spr.setScale(1.08, 0.9);
    else if (s === 'air' || s === 'helpless' || s === 'airdodge') { frame = 4; spr.setRotation(Phaser.Math.Clamp(this.vx * 0.04, -0.2, 0.2)); }
    else if (s === 'hitstun' || s === 'dizzy') { frame = 10; spr.setRotation(Math.sin(this.t * 0.5) * 0.35 * this.facing); }
    else if (s === 'charge') { sheet = d.sheets.juggle; frame = 1 + (Math.floor(this.t / 8) % 2); }
    else if (s === 'attack') {
      sheet = d.sheets.juggle; frame = this.t < 4 ? 1 : 3;
      const lean = { ftilt: 0.18, fair: 0.2, bair: -0.2, dtilt: 0.1, utilt: -0.1, uair: -0.12, dair: 0.15, nair: 0, jab: 0.08, grab: 0.12, throw: 0.15 }[this.moveName] || 0;
      if (this.moveName === 'nair' && this.t > 3 && this.t < 14) spr.setRotation(this.t * 0.9 * this.facing);
      else spr.setRotation(lean * this.facing);
    }
    else if (s === 'summon') { sheet = d.sheets.juggle; frame = this.t < 20 ? 2 : 12; spr.setScale(1, this.t < 20 ? 0.94 : 1.04); }
    else if (s === 'upb') { frame = 6; spr.setScale(0.92, 1.12); }
    else if (s === 'limit') { sheet = d.sheets.juggle; frame = 12; spr.y -= Math.min(16, this.t / 2); }
    else if (s === 'roll' || s === 'spotdodge') spr.setAlpha(0.55);
    else if (s === 'holding') { sheet = d.sheets.juggle; frame = 1; }
    else if (s === 'grabbed') { frame = 10; spr.setRotation(-0.2 * this.facing); }
    if (spr.texture.key !== sheet) spr.setTexture(sheet, frame); else spr.setFrame(frame);

    // hit flash and invincibility blink
    if (this.flash > 0) { this.flash--; spr.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL); }
    else { spr.setTint(this.curse > 0 ? 0xb07ad0 : PLAYER_TINTS[this.slot]).setTintMode(Phaser.TintModes.MULTIPLY); }
    if (this.isIntangible() && s !== 'limit' && (this.anim >> 2) % 2) spr.setAlpha(0.45);

    // name tag
    this.tag.setPosition(Math.round(this.x), Math.round(this.y - 60 - (s === 'limit' ? 16 : 0)));

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
    // attack swipe effects (placeholder until attack animations are drawn)
    for (const hb of this.activeHitboxes()) {
      const fx = hb.src && hb.src.fx;
      g.fillStyle(0x78a0c6, 0.55);
      if (fx === 'spin' || fx === undefined) g.fillCircle((hb.x1 + hb.x2) / 2, (hb.y1 + hb.y2) / 2, (hb.x2 - hb.x1) / 2);
      else g.fillEllipse((hb.x1 + hb.x2) / 2, (hb.y1 + hb.y2) / 2, hb.x2 - hb.x1, hb.y2 - hb.y1);
      g.fillStyle(0xf0f2f3, 0.8);
      g.fillEllipse((hb.x1 + hb.x2) / 2, (hb.y1 + hb.y2) / 2, (hb.x2 - hb.x1) * 0.5, Math.max(3, (hb.y2 - hb.y1) * 0.3));
    }
    // off-screen arrow is handled by the HUD
  }

  destroy() { this.stopChargeSound(); this.sprite.destroy(); this.fx.destroy(); this.tag.destroy(); }
}

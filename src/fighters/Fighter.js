// A fighter: its own fixed-step physics, a state machine, attacks and rendering.
// Position (x, y) is the point between the fighter's feet; y grows downward.
// Most behaviour lives in the fighter*.js files next to this one (see the mix-in list at the bottom).
import { PHYS, BLAST, LIMIT_MAX, PLAYER_COLORS, PLAYER_TINTS, FONT } from '../config.js';
import { sfx } from '../audio/sfx.js';
import { Controller } from '../input/controllers.js';
import { skinSheets, skinInfo, paletteFor } from './skins.js';
import { newAttackId } from './attackIds.js';
import { FighterSpeech } from './fighterSpeech.js';
import { FighterGrab } from './fighterGrab.js';
import { FighterSpecials } from './fighterSpecials.js';
import { FighterDefense } from './fighterDefense.js';
import { FighterLimit } from './fighterLimit.js';
import { LimitUndertow } from './limitUndertow.js';
import { LimitBlade } from './limitBlade.js';
import { FighterCostumeFx } from './fighterCostumeFx.js';
import { FighterLedge } from './fighterLedge.js';
import { FighterRender } from './fighterRender.js';
import { LimitAero } from './limitAero.js';
import { LimitMosh } from './limitMosh.js';
import { FighterBeat } from './fighterBeat.js';
import { FighterLastSeen } from './fighterLastSeen.js';
import { FighterTaunt } from './fighterTaunt.js';
import { FighterWhatOnceWas } from './fighterWhatOnceWas.js';
import { popBubble } from './entities.js';

const BUFFER = 7;   // frames an early button press is remembered

// climbing up from a ledge with an attack: a low sweep in front
const LEDGE_ATTACK = { box: [-8, -30, 50, 26], dmg: 7, angle: 30, base: 3.0, growth: 3.4 };

// AERO's power-ups, by level (Fighter.aeroLevel): none / near a computer / FULL AERO
const AERO_BOOST = { dmg: [1, 1.1, 1.3], speed: [1, 1.1, 1.3], jump: [1, 1.06, 1.16], taken: [1, 0.94, 0.8], kb: [1, 0.92, 0.75] };

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
    this.buffer = { attack: 0, special: 0, jump: 0, grab: 0, shield: 0, limit: 0, taunt: 0 };
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
    this.pal = paletteFor(def, this.skin) || def.pal;       // ability colours, matched to the costume
    this.style = skinInfo(def.id, this.skin).style || null; // costumes that reshape abilities: 'onebit', 'rose', 'samurai'
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
  get body() { return this.bodyOverride || this.def.body; }   // (WHAT ONCE WAS is only a small TV for a while)
  hurtbox() { const b = this.body; return { x1: this.x - b.w / 2, x2: this.x + b.w / 2, y1: this.y - b.h, y2: this.y }; }
  center() { return { x: this.x, y: this.y - this.body.h / 2 }; }
  setState(s) { this.state = s; this.t = 0; }
  actionable() { return ['idle', 'run', 'air', 'land', 'shield'].includes(this.state) || (this.state === 'land' && this.t >= 2); }
  get cursedMult() { return this.curse > 0 ? 0.7 : 1; }
  get dmgMult() { return this.cursedMult * (this.rage > 0 ? 1.2 : 1) * AERO_BOOST.dmg[this.aeroLevel] * this.modeDmg; }   // NU's RAGE MODE hits 20% harder; WHAT ONCE WAS in SEE mode 20%
  get speedMult() { return (this.curse > 0 ? 0.6 : 1) * (this.slow > 0 ? 0.5 : 1) * (this.swift > 0 ? 1.3 : 1) * AERO_BOOST.speed[this.aeroLevel] * this.modeSpeed; }   // WHAT ONCE WAS in INCOMING mode: 20% faster
  get jumpMult() { return AERO_BOOST.jump[this.aeroLevel]; }
  get kbTakenMult() { return AERO_BOOST.kb[this.aeroLevel]; }
  get dmgTakenMult() { return AERO_BOOST.taken[this.aeroLevel] * (this.missingMark > 0 ? 1.2 : 1) * (this.def.takenMult || 1); }   // posted MISSING: takes 20% more
  // AERO powered up: 1 = standing near one of his computers, 2 = FULL AERO. Every stat goes up.
  get aeroLevel() { return this.fullAero > 0 ? 2 : this.pcBuff > 0 ? 1 : 0; }
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
    if (this.swift > 0) this.swift--;
    if (this.rage > 0) this.rage--;
    if (this.missingMark > 0) this.missingMark--;   // posted MISSING by WHAT ONCE WAS
    if (this.wowMode) this.modeTick();              // WHAT ONCE WAS: SMILE mode heals
    if (this.headless || this.regrowing) this.bodyTick();   // WHAT ONCE WAS: a TV on the ground grows a body
    if (this.pcBuff > 0) this.pcBuff--;
    if (this.fullAero > 0 && --this.fullAero === 0) this.exitFullAero();
    if (this.aeroLevel && this.age % (this.fullAero > 0 ? 5 : 9) === 0 && !this.match.demo) {   // powered-up sparkle
      const R = Math.random, gold = this.fullAero > 0;
      this.match.particles.push({ shape: 'star', x: this.x + (R() - 0.5) * 28, y: this.y - 10 - R() * 44, vx: (R() - 0.5) * 0.4, vy: -0.6 - R() * 0.6, life: 20 + R() * 10, color: gold && R() < 0.6 ? 0xf3c358 : 0x9ff0ff, grav: -0.01, drag: 0.96, size: 2 });
    }
    if (this.star > 0) this.star--;
    if (this.summonCooldown > 0) this.summonCooldown--;
    if (this.lastHitTimer > 0 && --this.lastHitTimer === 0) this.lastHitBy = null;
    if (this.state !== 'shield' && this.shieldHp < 60) this.shieldHp = Math.min(60, this.shieldHp + 0.12);
    if (this.limit >= LIMIT_MAX && !this.limitReadyShown) { this.limitReadyShown = true; sfx('limitready', 0.8); this.match.popText(this, 'LIMIT READY!', '#78a0c6'); }

    if (this.def.id === 'last-seen') this.lastSeenTick();   // LAST SEEN: turning into SEEN when SIGHTINGS is full
    const handler = this['st_' + this.state];
    if (handler) handler.call(this, c);
    this.physics(c);
    this.checkBlast();
  }

  // ---- Soul Hex possession: the real controller only counts wiggles; a forced controller walks
  // the fighter toward the nearest edge of the stage until the curse wears off or is mashed away.
  possess(frames) {
    if (this.possessImmune > 0 || this.possessed > 0) return false;
    this.possessed = frames; this.possessMax = frames; this.walkedOff = false;
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
    const P0 = this.match.stage.platforms[0];
    if (!this.grounded && this.state !== 'hitstun' && this.walkedOff && (this.x < P0.x1 || this.x > P0.x2)) {   // stumbled off the edge: the fall snaps them out of it
      this.walkedOff = false; this.endPossession(false);
      this.match.popText(this, 'SNAPPED OUT OF IT!', '#f3c358'); this.match.puff(this.x, this.y - 30, 0xb07ad0, 10);
      return real;
    }
    if (this.grounded) this.walkedOff = true;
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
    if (this.buffer.taunt && this.def.taunt && !this.swordOut) { this.buffer.taunt = 0; this.setState('taunt'); return; }
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
    if (this.headless) return false;                  // WHAT ONCE WAS as a lone TV: it can only steer
    if (this.buffer.limit && this.limit >= LIMIT_MAX) { this.buffer.limit = 0; this.startLimit(); return true; }
    if (this.buffer.special) {
      const M = this.def.moves;
      this.buffer.special = 0;
      if (c.down) { if (M.summon) this.startSummon(); else if (M.counter) this.startCounter(); else if (M.downB && M.downB.door && this.wrongDoor()) this.startDoorWalk(); else if (M.downB) this.startAttack('downB'); return true; }
      if (c.up) { if (this.usedUpB) return false; this.startUpB(c); return true; }
      if (Math.abs(c.x) > 0.5) { this.facing = Math.sign(c.x); if (M.sideB && M.sideB.sword) { if (!this.swordOut) this.startSwordThrow(); return !this.swordOut || this.state === 'swordthrow'; } if (M.sideB) { if (((M.sideB.dive || M.sideB.noclip) && this.usedDive) || (M.sideB.fish && this.fishOut) || (M.sideB.mic && this.micOut)) return false; if (this.wowMode) this.startModeSide(); else this.startAttack('sideB'); return true; } }
      if (M.fireball) this.startCharge(); else if (M.neutralB && M.neutralB.charge) this.startSwingCharge(); else if (M.neutralB) this.startAttack('neutralB');
      return true;
    }
    if (this.buffer.grab && ground) { this.buffer.grab = 0; this.startAttack('grab'); return true; }
    if (this.buffer.attack) {
      this.buffer.attack = 0;
      const M = this.def.moves;
      if (ground) {
        // tap a direction and attack together for a smash attack (if the fighter has one)
        const sm = (at) => this.smashed(at) || c.smash;        // the CPU asks for a smash outright
        if (c.up) this.startAttack(M.usmash && sm(this.tapUp) ? 'usmash' : 'utilt');
        else if (c.down) this.startAttack(M.dsmash && sm(this.tapDown) ? 'dsmash' : 'dtilt');
        else if (Math.abs(c.x) > 0.5) {
          this.facing = Math.sign(c.x);
          const dash = M.dashAttack && this.state === 'run' && Math.abs(this.vx) > this.def.walkSpeed * 0.7;   // attack at a full run: a dash attack
          this.startAttack(M.fsmash && sm(this.tapX) ? 'fsmash' : dash ? 'dashAttack' : 'ftilt');
        }
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
      this.vy = (full ? this.def.jumpV : this.def.shortHopV) * this.jumpMult;
      if (Math.abs(c.x) > 0.3) this.vx = c.x * this.def.airSpeed;
      this.grounded = false; this.platform = null;
      this.setState('air'); sfx('jump', 0.5);
    }
  }

  st_air(c) {
    if (this.headless) return;
    if (this.tryCommon(c, false)) return;
    if (this.buffer.jump && this.jumpsLeft > 0) {
      this.buffer.jump = 0; this.jumpsLeft--; this.fastFalling = false;
      this.vy = this.def.doubleJumpV * this.jumpMult; this.vx = c.x * this.def.airSpeed;
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

  startAttack(name) {
    this.quip(name === 'jab' ? 'jab' : /smash/.test(name) ? 'smash' : name === 'grab' ? null : 'attack');
    this.move = this.def.moves[name]; this.moveName = name; this.attackId = newAttackId();
    this.setState('attack'); this.hitList = new Set(); this.rapidLoops = 0; this.chord = 0;
    if (this.def.beat) this.markBeat();               // NU: was it started on the beat?
    if (this.move.lunge && this.grounded) this.vx = this.facing * this.move.lunge;
    this.swingSound(name === 'jab' ? 1.3 : 1);
  }
  // the whoosh of a swing: each fighter's own weapon sound (Samurai Lacy: a ninja swish, sometimes a katana ring)
  swingSound(rate = 1, vol = 0.45) {
    if (this.style === 'samurai') { sfx('whoosh', vol + 0.1, rate * (0.9 + Math.random() * 0.25)); if (Math.random() < 0.35) sfx('shing', 0.25, 1 + Math.random() * 0.2); return; }
    sfx(this.def.swingSfx || 'swing', vol, rate * (0.92 + Math.random() * 0.16));
    if (this.style === 'onebit' && Math.random() < 0.4) sfx('glitch', 0.25, 1.2);
    if (this.style === 'hero' && Math.random() < 0.3) sfx('shing', 0.2, 1.5 + Math.random() * 0.3);   // the crystal blade rings
    if (this.style === 'wowHack' && Math.random() < 0.45) sfx('glitch', 0.25, 1.3);                     // WHAT ONCE WAS costumes
    if (this.style === 'wowRonin' && Math.random() < 0.35) sfx('shing', 0.25, 1.1 + Math.random() * 0.2);
    if (this.style === 'wowAero' && Math.random() < 0.35) sfx('petal', 0.3, 1.6);
    if (this.style === 'wowDial' && Math.random() < 0.3) sfx('popup', 0.15, 2.2);                      // DIAL-UP: a mouse click
    if (this.style === 'nuBones' && Math.random() < 0.3) sfx('glass', 0.12, 2.4);                       // NU's BONEZ: a dry rattle
    if (this.style === 'nuInferno' && Math.random() < 0.4) sfx('whoosh', 0.25, 0.7 + Math.random() * 0.2);   // NU's INFERNO: the swing roars
  }
  st_attack(c) {
    const m = this.move;
    if (m.hold && this.holdChord(c)) return;            // NU's Power Chord: holding special builds the chord
    if (this.diveBounce && !m.dive) this.diveBounce = false;   // the dive was cut short before it could bounce
    if (this.diveBounce) {                              // NU's Stage Dive landed on someone: crowd surf off them
      this.diveBounce = false; this.vy = m.dive.bounce; this.vx = this.facing * 2; this.usedDive = false; this.jumpsLeft = Math.max(this.jumpsLeft, 1);
      this.match.popText(this, 'CROWD SURF!', '#' + this.pal.light.toString(16).padStart(6, '0')); sfx('djump', 0.7, 1.2);
      this.setState('air'); return;
    }
    if (m.rapid && this.t === m.rapid.at && this.rapidLoops < m.rapid.max && c.held('attack')) {   // hold attack to keep a rapid jab going
      this.rapidLoops++; this.t = m.rapid.to; this.swingSound(1.3 + 0.08 * this.rapidLoops, 0.3);
    }
    if (m.multi && m.hits && m.hits.some((h) => h.from === this.t)) this.attackId = newAttackId();   // each beat of a multi-hit hits again
    if (m.slide && this.grounded && this.t >= m.slide.from && this.t <= m.slide.to) {     // a dash attack carries its run along the floor
      const k = (this.t - m.slide.from) / Math.max(1, m.slide.to - m.slide.from);
      this.vx = this.facing * m.slide.vx * (1 - 0.7 * k);
      if (this.t % 3 === 0) this.match.puff(this.x - this.facing * 10, this.y - 2, m.slide.dust ?? 0xd8d4e8, 2);
    }
    if (m.stream && this.t >= m.stream.from && this.t <= m.stream.to && (this.t - m.stream.from) % m.stream.every === 0) {   // AERO's bubble stream
      const R = Math.random;
      for (let i = 0; i < 3; i++) this.match.particles.push({ shape: 'bubble', x: this.x + this.facing * 6 + (R() - 0.5) * 20, y: this.y - 64 - R() * 10, vx: (R() - 0.5) * 1.2, vy: -2.2 - R() * 1.6, life: 26 + R() * 12, color: [0x9ff0ff, 0xffffff, 0x3fc8ea][i], grav: -0.02, r: 1 + Math.floor(R() * 3), sway: R() * 6, size: 2 });
    }
    if (m.wave && this.t === m.spawnAt) this.match.spawnWave(this, m.wave.full ? this.chordWave(m.wave) : m.wave);
    if (m.amp && this.t === m.spawnAt) this.match.spawnAmp(this, m.amp);
    if (m.flyer && this.t === m.spawnAt) this.match.spawnPoster(this, m.flyer);   // LAST SEEN's FLYER
    if (m.hide && this.t >= m.hide.from && this.t <= m.hide.to) this.invincible = Math.max(this.invincible, 2);   // LAST SEEN's HIDE
    if (m.mic) {                                                    // NU's MIC TOSS: out on its cord and back
      if (this.t === m.spawnAt && !this.micOut) this.micOut = this.match.spawnMic(this, m.mic);
      if (!this.grounded) this.vy = Math.min(this.vy, m.mic.airStall);
    }
    if (m.tag && this.t === m.spawnAt) this.match.spawnTag(this, m.tag);
    if (m.bubble && this.t === m.spawnAt) this.match.spawnAeroBubble(this, m.bubble);
    if (m.fish && this.t === m.spawnAt && !this.fishOut) {
      if (m.fish.twin) {                                         // FULL AERO: two fish, one arcing high and one skimming low
        this.match.spawnFish(this, { ...m.fish, liftOverride: m.fish.lift + 1.8 });
        this.match.spawnFish(this, { ...m.fish, liftOverride: m.fish.lift - 0.9 });
      } else this.match.spawnFish(this, m.fish);
    }
    if (m.pc && this.t === m.spawnAt) this.match.spawnPC(this, m.pc);
    if (m.cdcloud && this.t === m.spawnAt) this.match.spawnCdCloud(this, m.cdcloud);
    if (m.dive && this.t >= m.dive.from && this.t <= m.dive.to) {     // NU's STAGE DIVE: flat out through the air
      const D = m.dive, k = (this.t - D.from) / (D.to - D.from);
      this.vx = this.facing * D.vx * (1 - 0.45 * k);
      if (this.t === D.from) { this.grounded = false; this.platform = null; this.usedDive = true; sfx('djump', 0.6, 0.8); }
      this.vy = D.vy + (D.lift || 0.18) * (this.t - D.from) - 0.42;   // a long, low arc (gravity is added on top)
    }
    if (m.noclip || m.poster || m.door || m.static || m.beam) this.wowAttackStep(m);   // WHAT ONCE WAS (fighterWhatOnceWas.js)
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

  // ------------------------------------------------------------------ physics and collision
  physics(c) {
    const d = this.def;
    const s = this.state;
    if (s === 'grabbed' || s === 'seized') return;      // held: whoever holds them places them
    if (s === 'respawn') return;
    if (s.startsWith('ledge')) return;                    // hanging / climbing: the state places the fighter
    if (this.bubbled > 0) {                               // sealed in AERO's bubble: drifting upward until it pops
      if (--this.bubbled === 0 || s !== 'hitstun') { this.bubbled = 0; popBubble(this.match, this.x, this.y - this.body.h / 2, 22, { light: 0x9ff0ff }); }
      else { this.vx *= 0.9; this.lx *= 0.85; this.ly = 0; this.vy = -0.55; this.grounded = false; this.platform = null; this.x += this.vx + this.lx; this.y += this.vy; this.checkBlast(); return; }
    }
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
        const max = d.airSpeed * this.speedMult * (s === 'helpless' ? 0.9 : 1);
        if (Math.abs(c.x) > 0.2) {
          const target = c.x * max;
          this.vx += Math.sign(target - this.vx) * Math.min(Math.abs(target - this.vx), d.airAccel);
        } else {
          this.vx -= Math.sign(this.vx) * Math.min(Math.abs(this.vx), d.airFriction);
        }
      }
      const noGravity = (s === 'upb' && this.t <= d.moves.upb.riseAt) || (s === 'airdodge' && this.adDirected) || s === 'limit' || s === 'holding' || (this.seized && s.endsWith('_hold'));   // (WHAT ONCE WAS hangs in the air while it holds someone)
      if (!noGravity) {
        const fl = s !== 'hitstun' && d.float;                // FULL AERO floats: slow, gentle falls
        const g = s === 'hitstun' ? PHYS.gravity * PHYS.hitstunGravity : PHYS.gravity * (fl ? fl.gravity : 1);
        const cap = this.fastFalling ? PHYS.fastFall : fl ? fl.maxFall : PHYS.maxFall;
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
      if (['idle', 'run', 'land', 'taunt'].includes(this.state)) this.setState('air');
    }
    if (landed && !this.grounded) {
      // a strong hit into the floor bounces instead of landing
      if (this.state === 'hitstun' && this.ly > 4) { this.ly = -this.ly * 0.6; this.y = landed.y; this.match.puff(this.x, this.y, 0xd99350, 6); return; }
      this.y = landed.y; this.vy = 0; this.ly = 0;
      this.grounded = true; this.platform = landed;
      this.jumpsLeft = this.swift > 0 ? 2 : 1; this.airdodged = false; this.usedUpB = false; this.usedDive = false; this.fastFalling = false; this.ledgeGrabs = 0;
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
    if (this.fullAero > 0) { this.alive = false; this.exitFullAero(); }
    if (this.def.id === 'last-seen') this.revertLastSeen();   // SEEN goes back to LAST SEEN
    this.alive = false; this.stopChargeSound(); this.possessed = 0; this.ledge = null;
    if (this.wowMode || this.signal) { this.clearMode(); this.hideModeScreen(); }   // WHAT ONCE WAS loses its mode: the meter rebuilds from empty
    if (this.seized) this.releaseSeized();
    if (this.headless || this.regrowing) this.finishRegrow();   // WHAT ONCE WAS comes back with its TV on
    if (this.leftBodies) this.clearBodies();
    if (this.grabbed) { this.grabbed.grabbedBy = null; this.grabbed.setState('air'); this.grabbed = null; }
    if (this.grabbedBy) { this.grabbedBy.grabbed = null; this.grabbedBy.setState('idle'); this.grabbedBy = null; }
    this.sprite.setVisible(false); this.tag.setVisible(false); this.fx.clear(); this.fxBack.clear(); for (const gh of this.ghosts) gh.setVisible(false);
    this.respawnTimer = 70;
  }

  respawn() {
    this.alive = true; this.percent = 0; this.hp = this.maxHp; this.curse = 0; this.slow = 0; this.swift = 0; this.star = 0; this.rage = 0; this.possessed = 0; this.possessImmune = 0; this.missingMark = 0;
    this.x = 0; this.y = -230; this.vx = this.vy = this.lx = this.ly = 0;
    this.grounded = false; this.facing = 1; this.jumpsLeft = 1; this.usedUpB = false; this.airdodged = false;
    this.setState('respawn'); this.invincible = 0;
    this.sprite.setVisible(true); this.tag.setVisible(true);
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

  destroy() { if (this.speech) this.speech.destroy(); if (this.scrImg) this.scrImg.destroy(); if (this.headImg) this.headImg.destroy(); if (this.leftBodies) this.clearBodies(); this.stopChargeSound(); this.sprite.destroy(); this.fx.destroy(); this.fxBack.destroy(); this.tag.destroy(); for (const gh of this.ghosts) gh.destroy(); }
}

// Attach the methods from the topic files to Fighter (they read and write the same `this`).
for (const M of [FighterSpeech, FighterGrab, FighterSpecials, FighterDefense, FighterLimit, LimitUndertow, LimitBlade, FighterCostumeFx, FighterLedge, FighterRender, FighterTaunt, LimitMosh, FighterBeat, FighterLastSeen, LimitAero, FighterWhatOnceWas]) {
  for (const k of Object.getOwnPropertyNames(M.prototype)) {
    if (k === 'constructor') continue;
    if (Object.prototype.hasOwnProperty.call(Fighter.prototype, k)) throw new Error('Fighter method defined twice: ' + k);
    Object.defineProperty(Fighter.prototype, k, Object.getOwnPropertyDescriptor(M.prototype, k));
  }
}

// The fight itself: runs the fixed 60 Hz simulation, resolves hits, KOs, the Limit cinematic,
// match rules (Stock / Timed Battle / Stamina), camera and effects.
import { playMusic, stopMusic } from '../audio/music.js';
import { resolveSkins } from '../fighters/skins.js';
import { VIEW_W, VIEW_H, STEP_MS, FONT, PHYS, LIMIT_MAX, DIFFICULTY } from '../config.js';
import { settings, MODE_NAMES } from '../settings.js';
import { KeyboardController, GamepadController, MergedController, readPad } from '../input/controllers.js';
import { CpuController } from '../ai/cpu.js';
import { Fighter } from '../fighters/Fighter.js';
import { fighterById } from '../fighters/roster.js';
import { Fireball, Soul, EnergyBolt, ShadowPool } from '../fighters/entities.js';
import { stageById } from '../stage/stages.js';
import { ItemSpawner } from '../items/items.js';
import { Hud } from '../ui/hud.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { Training, DummyController } from './training.js';
import { TouchPad, TouchController, touchEnabled } from '../input/touch.js';

export class MatchScene extends Phaser.Scene {
  constructor() { super('Match'); }

  create() {
    this.mode = settings.mode;
    this.bgList = []; this.worldList = []; this.uiList = [];
    this.cutscene = null;
    this.frame = 0; this.acc = 0; this.frozen = 0; this.paused = false; this.over = 0;
    this.hits = new Set(); this.particles = []; this.limitHits = []; this.pools = []; this.projectiles = []; this.souls = []; this.pops = [];
    this.shakeAmt = 0; this.shakeTime = 0;

    // three cameras: background (no zoom), world (zooms to fit the fighters), UI (fixed)
    this.bgCam = this.cameras.main;
    this.worldCam = this.cameras.add(0, 0, VIEW_W, VIEW_H);
    this.uiCam = this.cameras.add(0, 0, VIEW_W, VIEW_H);
    this.worldCam.setZoom(1); this.worldCam.centerOn(0, -80);

    this.stage = stageById(settings.stage).make(this);
    this.stage.hazardsOn = settings.hazards;
    const bg = [], world = [];
    this.stage.draw(world, bg);
    this.addBg(...bg); this.addWorld(...world);
    // stage music (stages without a track of their own play silence for now)
    if (this.stage.music) playMusic(this, this.stage.music, 0.55); else stopMusic();
    this.fxG = this.add.graphics().setDepth(5); this.addWorld(this.fxG);

    // ---- players: P1 keyboard (+ optional pad), joined pads, then CPUs fill the rest
    this.fighters = [];
    const humans = [];
    const kb = new KeyboardController(this);
    // player 1: keyboard, plus their controller and on-screen touch controls when present
    this.touchPad = touchEnabled() ? new TouchPad(this, () => this.fighters[0]) : null;
    const p1Parts = [kb];
    if (settings.p1Pad !== null) p1Parts.push(new GamepadController(settings.p1Pad));
    if (this.touchPad) p1Parts.push(new TouchController(this.touchPad));
    humans.push({ ctrl: new MergedController(p1Parts), label: 'P1' });
    for (const pad of settings.extraPads) humans.push({ ctrl: new GamepadController(pad), label: 'P' + (humans.length + 1) });
    const slots = Math.min(4, humans.length + settings.cpuCount);
    this.isTraining = this.mode === 'training';
    const stocks = this.mode === 'stock' ? settings.stocks : this.mode === 'stamina' ? 1 : 0;
    const defs = [];
    for (let i = 0; i < slots; i++) defs.push(fighterById(settings.picks[i]).def);   // 'random' is decided here
    const skins = resolveSkins(defs.map((d) => d.id), settings.skins);
    for (let i = 0; i < slots; i++) {
      const human = humans[i];
      const level = settings.cpuLevels[i] ?? settings.difficulty;
      const ctrl = human ? human.ctrl : this.isTraining ? new DummyController(this, level) : new CpuController(this, level);
      const label = human ? human.label : (this.isTraining ? 'DUMMY' : 'CPU') + (i + 1);
      const def = defs[i];
      const f = new Fighter(this, def, i, ctrl, { cpu: !human, label, stocks, hp: settings.hp, skin: skins[i] });
      if (!human) ctrl.fighter = f;
      const sp = this.stage.spawns[i];
      f.placeAt(sp.x, sp.y - 1); f.facing = sp.x < 0 ? 1 : -1;
      this.fighters.push(f);
    }
    this.kbCtrl = kb;

    this.items = settings.items ? new ItemSpawner(this) : null;
    this.hud = new Hud(this);
    this.training = this.isTraining ? new Training(this) : null;
    this.timeLeft = settings.minutes * 3600;

    // overlays (UI camera)
    this.overlay = this.add.graphics().setDepth(5); this.addUI(this.overlay);
    this.bigText = this.add.text(VIEW_W / 2, VIEW_H / 2 - 30, '', { fontFamily: FONT, fontSize: '28px', color: '#ffffff', stroke: '#0b0a14', strokeThickness: 6, align: 'center' }).setOrigin(0.5);
    this.smallText = this.add.text(VIEW_W / 2, VIEW_H / 2 + 10, '', { fontFamily: FONT, fontSize: '8px', color: '#c9c4dc', stroke: '#0b0a14', strokeThickness: 4, align: 'center', lineSpacing: 6 }).setOrigin(0.5);
    this.modeText = this.add.text(8, 8, MODE_NAMES[this.mode], { fontFamily: FONT, fontSize: '8px', color: '#ffffff', stroke: '#0b0a14', strokeThickness: 4 });
    this.bigText.setDepth(20); this.smallText.setDepth(20); this.addUI(this.bigText, this.smallText, this.modeText);
    if (settings.crt) this.makeCrt();

    this.countdown = this.isTraining ? 0 : 200;   // "3, 2, 1, GO!" (training starts right away)
    this.escKey = this.input.keyboard.addKey('ESC');
    // mouse: a pause button in the corner, and Resume / Quit buttons on the pause screen
    this.input.mouse.disableContextMenu();
    this.mouseToggle = false; this.mouseQuit = false;
    this.pauseBtn = makeButton(this, VIEW_W - 8, 6, 'II  PAUSE', () => { this.mouseToggle = true; }, { originX: 1, depth: 25, size: '6px' });
    this.resumeBtn = makeButton(this, VIEW_W / 2, VIEW_H / 2 + 34, 'RESUME', () => { this.mouseToggle = true; }, { originX: 0.5, depth: 25, size: '8px' }).setVisible(false);
    this.quitBtn = makeButton(this, VIEW_W / 2, VIEW_H / 2 + 60, 'QUIT TO SETUP', () => { this.mouseQuit = true; }, { originX: 0.5, depth: 25, size: '8px' }).setVisible(false);
    this.fullBtn = addFullscreenButton(this, VIEW_W - 80, 6, { depth: 25 });
    this.addUI(this.pauseBtn, this.resumeBtn, this.quitBtn, this.fullBtn);
    this.qKey = this.input.keyboard.addKey('Q');
    this.events.once('shutdown', () => this.cleanup());
  }

  // ---- camera bookkeeping: every object belongs to exactly one camera
  addBg(...objs) { for (const o of objs) { this.worldCam.ignore(o); this.uiCam.ignore(o); this.bgList.push(o); } }
  addWorld(...objs) { for (const o of objs) { this.bgCam.ignore(o); this.uiCam.ignore(o); } }
  addUI(...objs) { for (const o of objs) { this.bgCam.ignore(o); this.worldCam.ignore(o); } }
  sfxVol() { return settings.sfxVolume; }

  makeCrt() {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.18);
    for (let y = 0; y < VIEW_H; y += 2) g.fillRect(0, y, VIEW_W, 1);
    g.fillStyle(0x000000, 0.35);
    g.fillRect(0, 0, VIEW_W, 3); g.fillRect(0, VIEW_H - 3, VIEW_W, 3); g.fillRect(0, 0, 3, VIEW_H); g.fillRect(VIEW_W - 3, 0, 3, VIEW_H);
    this.addUI(g);
  }

  // ------------------------------------------------------------------ main loop
  update(time, delta) {
    if (this.handlePause()) return;
    if (this.training) this.training.input();
    this.acc += Math.min(delta, 100) * (this.training ? this.training.speed : 1);
    let steps = 0;
    while (this.acc >= STEP_MS && steps < 5) { this.tick(); this.acc -= STEP_MS; steps++; }
    this.draw();
  }

  handlePause() {
    const esc = Phaser.Input.Keyboard.JustDown(this.escKey);
    let padStart = false;
    const pads = [settings.p1Pad, ...settings.extraPads].filter((p) => p !== null);
    this.startHeld = this.startHeld || {};
    for (const i of pads) {
      const pad = readPad(i);
      const down = !!(pad && pad.buttons[9] && pad.buttons[9].pressed);
      if (down && !this.startHeld[i]) padStart = true;
      this.startHeld[i] = down;
    }
    const mouse = this.mouseToggle; this.mouseToggle = false;
    if ((esc || padStart || mouse) && this.countdown <= 0 && !this.over) {
      this.paused = !this.paused;
      sfx('menu', 0.6);
      this.bigText.setText(this.paused ? 'PAUSED' : '');
      this.smallText.setText(this.paused ? 'ESC / START  RESUME     Q / SELECT  QUIT' : '');
      this.resumeBtn.setVisible(this.paused); this.quitBtn.setVisible(this.paused); this.pauseBtn.setVisible(!this.paused);
      if (this.paused) this.sound.pauseAll(); else this.sound.resumeAll();
    }
    if (this.paused) {
      let quit = Phaser.Input.Keyboard.JustDown(this.qKey) || this.mouseQuit;
      for (const i of pads) { const pad = readPad(i); if (pad && pad.buttons[8] && pad.buttons[8].pressed) quit = true; }
      if (quit) { this.scene.start('Setup'); return true; }
      this.draw();
    }
    return this.paused;
  }

  tick() {
    this.frame++;
    // countdown
    if (this.countdown > 0) {
      this.countdown--;
      const n = Math.ceil((this.countdown - 20) / 60);
      if (this.countdown > 20) { if (this.countdown % 60 === 20) sfx('menu', 0.8, 0.8); this.bigText.setText(String(n)); }
      else if (this.countdown === 20) { this.bigText.setText('GO!'); sfx('go', 0.9); }
      if (this.countdown === 0) this.bigText.setText('');
      for (const f of this.fighters) { f.ctrl.beginFrame(); f.ctrl.poll(); f.render(this.frame); }
      return;
    }

    for (const f of this.fighters) { f.ctrl.beginFrame(); f.ctrl.poll(); }

    if (this.frozen > 0) {
      // Limit cinematic: only the fighter using the Limit moves
      this.frozen--;
      for (const f of this.fighters) if (f.state === 'limit') f.step();
      this.stepEffects();
      return;
    }

    for (const f of this.fighters) f.step();
    for (const p of this.projectiles) p.step();
    this.projectiles = this.projectiles.filter((p) => p.alive);
    for (const p of this.pools) p.step();
    this.pools = this.pools.filter((p) => p.alive);
    for (const s of this.souls) s.step();
    this.souls = this.souls.filter((s) => s.alive);
    if (this.items) this.items.step();
    const hazard = this.stage.step(this);
    this.resolveHits(hazard);
    this.stepEffects();
    if (this.training) this.training.step();

    // rules
    if (this.mode === 'time' && !this.over) {
      this.timeLeft--;
      if (this.timeLeft === 600) sfx('warn', 0.6);
      if (this.timeLeft <= 0) this.endMatch('TIME!');
    }
    if (this.over > 0 && --this.over === 0) this.toResults();
  }

  // ------------------------------------------------------------------ combat
  resolveHits(hazard) {
    const hbs = [];
    for (const f of this.fighters) if (f.alive && f.hitstop === 0) hbs.push(...f.activeHitboxes());
    for (const p of this.projectiles) if (p.alive) hbs.push(p.hitbox());
    for (const s of this.souls) { const h = s.hitbox(); if (h) hbs.push(h); }
    for (const lh of this.limitHits) if (lh.t < 2) hbs.push(lh.hb);
    if (hazard) hbs.push({ ...hazard, h: hazard, owner: null, facing: 1 });

    const overlap = (a, b) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
    for (const hb of hbs) {
      for (const t of this.fighters) {
        if (!t.alive || t === hb.owner) continue;
        if (hb.owner && t.team === hb.owner.team) continue;
        if (t.isIntangible() || t.state === 'grabbed') continue;
        const key = hb.id + ':' + t.slot;
        if (this.hits.has(key)) continue;
        if (!overlap(hb, t.hurtbox())) continue;
        this.hits.add(key);
        if (hb.grab) { if (hb.owner.state === 'attack' && t.grounded) hb.owner.onGrab(t); continue; }
        if (t.counterReady && t.counterReady() && !hb.hazard && !hb.pillar) {   // countered: no damage, she strikes back
          t.counterHit(hb);
          if (hb.projectile) hb.projectile.kill();
          if (hb.soul) hb.soul.onBite();
          continue;
        }
        if (t.state === 'shield' && !hb.hazard && !hb.pillar) this.shieldHit(t, hb);
        else this.applyHit(t, hb, (hb.x1 + hb.x2) / 2);
        if (hb.projectile) hb.projectile.kill();
        if (hb.soul) hb.soul.onBite();
      }
      // fighters' attacks and fireballs can destroy enemy souls
      if (hb.soul) continue;
      for (const s of this.souls) {
        if (!s.alive || (hb.owner && s.team === hb.owner.team) || s.rise > 0) continue;
        const key = hb.id + ':s' + s.id;
        if (this.hits.has(key) || !overlap(hb, s.hurtbox())) continue;
        this.hits.add(key);
        s.damage(hb.h.dmg || 6, Math.sign(s.x - (hb.x1 + hb.x2) / 2) || 1);
        if (hb.projectile) hb.projectile.kill();
      }
    }
    if (this.hits.size > 4000) this.hits.clear();
  }

  shieldHit(t, hb) {
    const dmg = hb.h.dmg || 5;
    t.shieldHp -= dmg * 1.3;
    t.shieldStun = 4 + Math.floor(dmg / 2);
    const dir = Math.sign(t.x - (hb.owner ? hb.owner.x : (hb.x1 + hb.x2) / 2)) || 1;
    t.lx = dir * (1 + dmg * 0.15);
    const stop = 3 + Math.floor(dmg / 4);
    t.hitstop = stop; if (hb.owner && !hb.projectile && !hb.soul) hb.owner.hitstop = stop;
    sfx('shield', 0.6, 0.8);
    this.puff(t.x + (hb.owner ? -dir * 14 : 0), t.y - 26, 0xffffff, 5);
    if (t.shieldHp <= 0) t.breakShield();
  }

  applyHit(t, hb, srcX) {
    const h = hb.h, owner = hb.owner;
    const dmg = Math.max(1, Math.round((h.dmg || 0) * (owner ? owner.cursedMult : 1)));
    let kbPct;
    if (this.mode === 'stamina') { t.hp -= dmg; kbPct = 40 + 50 * (1 - Math.max(0, t.hp) / t.maxHp); }
    else { t.percent = Math.min(999, t.percent + dmg); kbPct = t.percent; }
    if (t.state !== 'limit') t.limit = Math.min(LIMIT_MAX, t.limit + dmg);
    t.stats.damageTaken += dmg; if (owner) owner.stats.damageDealt += dmg;

    const kb = (h.base + h.growth * kbPct / 100) / t.def.weight;
    let dir = hb.facing || 1;
    if (!owner) dir = Math.sign(t.x - srcX) || 1;
    const rad = h.angle * Math.PI / 180;
    t.stopChargeSound();
    if (t.grabbed) { t.grabbed.grabbedBy = null; t.grabbed.setState('air'); t.grabbed = null; }
    t.lx = Math.cos(rad) * kb * dir;
    t.ly = -Math.sin(rad) * kb;
    t.vx = 0; t.vy = 0; t.fastFalling = false;
    if (t.ly < -0.5 || kb > PHYS.tumbleKb) { t.grounded = false; t.platform = null; }
    if (t.grounded && t.ly > 0) t.ly = -t.ly * 0.5;   // spiked on the ground: pops up
    if (h.pull && hb.owner) {                          // multi-hit that carries the target along with the attacker
      const o = hb.owner;
      t.lx = o.vx + (o.x - t.x) * 0.12; t.ly = Math.min(o.vy, -1) + (o.y - 10 - t.y) * 0.08;
      t.grounded = false; t.platform = null;
    }
    t.hitstun = h.stun || Math.max(8, Math.floor(kb * PHYS.hitstunPerKb));
    const comboing = t.state === 'hitstun' || t.state === 'grabbed';
    t.setState('hitstun'); t.hurtAnim = 16;      // the Take Hit animation plays out in full
    if (this.training) this.training.onHit(t, hb, dmg, comboing);
    t.jumpsLeft = 1; t.usedUpB = false; t.airdodged = false;
    if (owner) { t.lastHitBy = owner; t.lastHitTimer = 600; }
    if (h.slow) t.slow = h.slow;      // Shadow Pool: stuck in the puddle
    if (h.possess && t.alive && t.possess(h.possess)) {   // Soul Hex
      this.popText(t, 'POSSESSED!  MASH TO BREAK FREE', '#b07ad0'); sfx('curse', 0.9, 0.8);
    }

    const stop = Math.min(14, 3 + Math.floor(dmg / 2.5));
    t.hitstop = stop; t.flash = 5;
    if (owner && !hb.projectile && !hb.soul && !hb.pillar) owner.hitstop = stop;

    const c = t.center();
    this.puff(c.x, c.y, 0xffffff, 6 + Math.floor(kb));
    this.puff(c.x, c.y, 0xf3c358, 4);
    if (kb > 8) { sfx('bighit', 0.9); this.shake(Math.min(12, kb), 3); } else sfx('hit', 0.7, 1 + Math.random() * 0.2);

    if (this.mode === 'stamina' && t.hp <= 0 && t.state !== 'dying') {
      t.hp = 0;
      if (t.def.sheets.death) t.startDying();      // fighters with a death animation play it first
      else this.onKO(t);
    }
  }

  onKO(f) {
    if (!f.alive) return;
    sfx('ko', 1); this.shake(14, 5);
    // burst on the edge of the screen where they flew out
    const v = this.worldCam.worldView;
    const bx = Phaser.Math.Clamp(f.x, v.x + 10, v.right - 10), by = Phaser.Math.Clamp(f.y - 25, v.y + 10, v.bottom - 10);
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 6;
      this.particles.push({ x: bx, y: by, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 30 + Math.random() * 30, color: [f.color, 0xffffff, 0xf3c358][i % 3], size: 3 });
    }
    if (f.lastHitBy && f.lastHitBy !== f) f.lastHitBy.kos++;
    f.falls++;
    if (this.mode !== 'time' && !this.isTraining) {
      f.stocks--;
      if (f.stocks <= 0) { f.eliminated = true; for (const s of f.souls) s.kill(true); }
    }
    f.ko();
    if (this.mode !== 'time' && !this.isTraining) {
      const left = this.fighters.filter((x) => !x.eliminated);
      if (left.length <= 1 && !this.over) this.endMatch('GAME!');
    }
  }

  endMatch(text) {
    this.over = 150;
    this.bigText.setText(text);
    sfx('go', 1, 0.7);
    for (const f of this.fighters) f.stopChargeSound();
  }

  toResults() {
    let order;
    if (this.mode === 'time') order = [...this.fighters].sort((a, b) => (b.kos - b.falls) - (a.kos - a.falls) || a.percent - b.percent);
    else order = [...this.fighters].sort((a, b) => (b.eliminated ? 0 : 1) - (a.eliminated ? 0 : 1) || b.stocks - a.stocks || (b.eliminatedAt || 0) - (a.eliminatedAt || 0));
    const results = order.map((f) => ({ label: f.label, slot: f.slot, fighter: f.def.id, skin: f.skin, kos: f.kos, falls: f.falls, dealt: f.stats.damageDealt, taken: f.stats.damageTaken, cpu: f.isCpu }));
    this.scene.start('Results', { results, mode: this.mode });
  }

  // ------------------------------------------------------------------ spawns used by fighters
  spawnFireball(owner, k) { const p = new Fireball(this, owner, k); this.projectiles.push(p); return p; }
  spawnPool(owner, spec) {
    for (const p of this.pools) if (p.owner === owner) p.kill();          // one puddle per Mr Wake
    const p = new ShadowPool(this, owner, spec); if (p.alive) this.pools.push(p); return p;
  }
  spawnBolt(owner, spec) { const p = new EnergyBolt(this, owner, spec); this.projectiles.push(p); return p; }
  spawnSoul(owner) { const s = new Soul(this, owner); this.souls.push(s); return s; }

  startLimit(f) {
    this.frozen = 34;
    sfx('limit', 1);
    this.shake(6, 30);
    this.limitBanner = { t: 0, name: f.def.limit.name, color: f.color };
    let best = null, bd = 1e9;
    for (const o of this.fighters) if (o.alive && o.team !== f.team && Math.abs(o.x - f.x) < bd) { bd = Math.abs(o.x - f.x); best = o; }
    if (best && best.x !== f.x) f.facing = Math.sign(best.x - f.x);
    for (const p of this.projectiles) if (p.owner !== f) p.kill();
  }
  // where the Limit beam is right now (from the hand, straight ahead)
  beamBox(f) {
    const L = f.def.limit;
    const hx = f.x + f.facing * (f.def.handOffset.x + 4), hy = f.y + f.def.handOffset.y;
    return { x1: f.facing > 0 ? hx : hx - L.beamLength, x2: f.facing > 0 ? hx + L.beamLength : hx, y1: hy - L.beamHalf, y2: hy + L.beamHalf, hx, hy };
  }
  limitHit(f, i) {
    const L = f.def.limit, h = L.hits[i], b = this.beamBox(f);
    this.limitHits.push({ t: 0, hb: { x1: b.x1, x2: b.x2, y1: b.y1, y2: b.y2, h, owner: f, facing: f.facing, id: 'beam' + f.slot + ':' + this.frame, pillar: true } });
    const last = i === L.hits.length - 1;
    sfx(last ? 'bighit' : 'hit', last ? 1 : 0.6, last ? 0.6 : 0.8);
    this.shake(last ? 12 : 4, last ? 12 : 4);
  }

  // ------------------------------------------------------------------ effects
  puff(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      this.particles.push({ x, y, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.8) * 2.5, life: 14 + Math.random() * 14, color, size: 2 + (Math.random() < 0.3 ? 1 : 0) });
    }
  }
  popText(f, text, color) {
    const t = this.add.text(f.x, f.y - 70, text, { fontFamily: FONT, fontSize: '8px', color, stroke: '#0b0a14', strokeThickness: 4 }).setOrigin(0.5);
    this.addWorld(t);
    this.pops.push({ t, life: 70 });
  }
  shake(amount, frames) { this.shakeAmt = Math.max(this.shakeAmt, amount); this.shakeTime = Math.max(this.shakeTime, frames); }

  stepEffects() {
    for (const p of this.particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life--; }
    this.particles = this.particles.filter((p) => p.life > 0);
    if (this.particles.length > 600) this.particles.splice(0, this.particles.length - 600);
    for (const lh of this.limitHits) lh.t++;
    this.limitHits = this.limitHits.filter((lh) => lh.t < 3);
    for (const p of this.pops) { p.life--; p.t.y -= 0.4; p.t.setAlpha(Math.min(1, p.life / 20)); if (p.life <= 0) p.t.destroy(); }
    this.pops = this.pops.filter((p) => p.life > 0);
    if (this.limitBanner) { this.limitBanner.t++; if (this.limitBanner.t > 48) this.limitBanner = null; }
    if (this.shakeTime > 0) this.shakeTime--;
  }

  // ------------------------------------------------------------------ drawing
  draw() {
    for (const f of this.fighters) f.render(this.frame);
    for (const p of this.projectiles) p.render();
    for (const p of this.pools) p.render();
    for (const s of this.souls) s.render();
    if (this.items) this.items.render();

    const g = this.fxG;
    g.clear();
    // Limit beams: blue soul-fire from the hand, flickering in pixel bands
    for (const f of this.fighters) {
      if (f.state !== 'limit' || !f.alive) continue;
      const L = f.def.limit;
      if (L.type === 'blade') continue;               // drawn by the fighter itself
      if (f.t < L.beamStart - 6 || f.t > L.beamEnd + 6) continue;
      const b = this.beamBox(f);
      if (f.t < L.beamStart) {                       // charging glow in the hand
        const r = 4 + (f.t - L.beamStart + 6) * 2;
        g.fillStyle(L.colors.light, 0.9); g.fillRect(b.hx - r, b.hy - r, r * 2, r * 2);
        g.fillStyle(L.colors.core, 1); g.fillRect(b.hx - r / 2, b.hy - r / 2, r, r);
        continue;
      }
      const grow = Math.min(1, (f.t - L.beamStart + 1) / 6);
      const fade = f.t > L.beamEnd ? 1 - (f.t - L.beamEnd) / 6 : 1;
      const len = L.beamLength * grow, dir = f.facing;
      const flick = (this.frame >> 1) % 2;
      const band = (half, color, alpha) => {
        const x = dir > 0 ? b.hx : b.hx - len;
        g.fillStyle(color, alpha * fade); g.fillRect(x, b.hy - half, len, half * 2);
      };
      const H = L.beamHalf, C = L.colors;
      band(H + 6 + flick, C.outline, 0.85);            // dark outline keeps it readable on the sky
      band(H + 4 + flick, C.deep, 1);
      band(H - 4, C.mid, 1);
      band(H - 8, C.light, 1);
      band(Math.max(3, H - 13 - flick), C.core, 1);
      // chunks of flame streaming away from the hand
      const x0 = dir > 0 ? b.hx : b.hx - len;
      for (let k = (this.frame * 9) % 28; k < len; k += 28) {
        const cx = dir > 0 ? x0 + k : x0 + len - k - 14;
        g.fillStyle(C.core, 0.85 * fade); g.fillRect(cx, b.hy - H + 7, 14, 3); g.fillRect(cx + 6, b.hy + H - 10, 10, 3);
      }
      // flame tongues licking off the top and bottom edges: stepped pixel flames that rise and flicker
      const hash = (n) => { n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); return ((n ^ (n >>> 15)) >>> 0) / 4294967296; };
      const tick = Math.floor(this.frame / 3);
      for (let k = 0; k < len / 10; k++) {
        const along = k * 10 + ((this.frame * 4) % 10);
        if (along > len - 6) break;
        for (const up of [-1, 1]) {
          const r = hash(k * 7 + tick * 131 + (up > 0 ? 977 : 0));
          if (r < 0.35) continue;
          const tall = 3 + Math.floor(r * 12) * (up < 0 ? 1 : 0.6);
          const fx = dir > 0 ? b.hx + along : b.hx - along - 8;
          for (let row = 0; row < tall; row += 2) {           // narrows toward the tip
            const w = Math.max(2, 8 - Math.floor(row / tall * 8));
            const yy = up < 0 ? b.hy - H - 4 - row - 2 : b.hy + H + 4 + row;
            const c = row < tall * 0.4 ? C.mid : row < tall * 0.75 ? C.light : C.core;
            g.fillStyle(c, fade); g.fillRect(fx + (8 - w) / 2, yy, w, 2);
          }
        }
      }
      // bright burst at the hand
      g.fillStyle(C.core, fade); g.fillRect(b.hx - 10, b.hy - 14, 20, 28);
    }
    for (const p of this.particles) { g.fillStyle(p.color, Math.min(1, p.life / 10)); g.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size); }
    if (this.training) this.training.draw(g);

    // Limit banner and darkening
    this.overlay.clear();
    if (this.paused) { this.overlay.fillStyle(0x0b0a14, 0.6); this.overlay.fillRect(0, 0, VIEW_W, VIEW_H); }
    if (this.cutscene) {                               // Limit cutscene: darken and letterbox
      this.overlay.fillStyle(0x0b0a14, 0.35); this.overlay.fillRect(0, 0, VIEW_W, VIEW_H);
      this.overlay.fillStyle(0x000000, 1); this.overlay.fillRect(0, 0, VIEW_W, 34); this.overlay.fillRect(0, VIEW_H - 34, VIEW_W, 34);
    }
    if (this.limitBanner) {
      const b = this.limitBanner, a = b.t < 34 ? 1 : 1 - (b.t - 34) / 14;
      this.overlay.fillStyle(0x0b0a14, 0.45 * a); this.overlay.fillRect(0, 0, VIEW_W, VIEW_H);
      const slide = Math.min(1, b.t / 10);
      this.overlay.fillStyle(b.color, 0.9 * a); this.overlay.fillRect(0, 42, VIEW_W * slide, 34);
      this.overlay.fillStyle(0x0b0a14, 0.9 * a); this.overlay.fillRect(0, 46, VIEW_W * slide, 26);
      if (!this.paused && this.over === 0) { this.bigText.setText(b.name); this.bigText.setFontSize(16); this.bigText.setAlpha(a); this.bigText.y = 59; }
    } else if (this.bigText.style.fontSize === '16px' && this.over === 0) { this.bigText.setText(''); this.bigText.setFontSize(28); this.bigText.setAlpha(1); this.bigText.y = VIEW_H / 2 - 30; }

    this.updateCamera();
    this.hud.update(this.frame);
    if (this.touchPad) this.touchPad.draw();
  }

  updateCamera() {
    const cam = this.worldCam;
    const pts = this.fighters.filter((f) => f.alive).map((f) => ({ x: f.x, y: f.y - 25 }));
    if (!pts.length) pts.push({ x: 0, y: -60 });
    let x1 = Math.min(...pts.map((p) => p.x)), x2 = Math.max(...pts.map((p) => p.x));
    let y1 = Math.min(...pts.map((p) => p.y)), y2 = Math.max(...pts.map((p) => p.y));
    // keep most of the island in view
    x1 = Math.min(x1, -200); x2 = Math.max(x2, 200); y2 = Math.max(y2, 20); y1 = Math.min(y1, -120);
    const w = x2 - x1 + 160, h = y2 - y1 + 150;
    let zoom = Phaser.Math.Clamp(Math.min(VIEW_W / w, (VIEW_H - 40) / h), 0.55, 1.35);
    let cx = (x1 + x2) / 2, cy = (y1 + y2) / 2 + 18;
    const limiter = this.fighters.find((f) => f.state === 'limit' && f.t < 34);
    if (limiter) { zoom = 1.5; cx = limiter.x; cy = limiter.y - 40; }
    if (this.cutscene && this.cutscene.ult && this.cutscene.ult.victims[0]) { const v = this.cutscene.ult.victims[0]; zoom = 1.7; cx = v.x; cy = v.y - 26; }
    cx = Phaser.Math.Clamp(cx, -320, 320); cy = Phaser.Math.Clamp(cy, -260, 120);
    cam.setZoom(cam.zoom + (zoom - cam.zoom) * 0.08);
    const cur = cam.midPoint;
    let nx = cur.x + (cx - cur.x) * 0.1, ny = cur.y + (cy - cur.y) * 0.1;
    if (this.shakeTime > 0) { nx += (Math.random() - 0.5) * this.shakeAmt; ny += (Math.random() - 0.5) * this.shakeAmt; }
    else this.shakeAmt = 0;
    cam.centerOn(nx, ny);
    // background parallax follows the world camera
    this.bgCam.scrollX = (nx) * 1; this.bgCam.scrollY = (ny + 80) * 1;
  }

  cleanup() {
    for (const f of this.fighters || []) f.stopChargeSound();
    this.sound.stopAll(); stopMusic();
  }
}

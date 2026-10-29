// The fight itself: runs the fixed 60 Hz simulation, resolves hits, KOs, the Limit cinematic,
// match rules (Stock / Timed Battle / Stamina), camera and effects.
import { hasWinCutscene } from './WinScene.js';
import { addKO, matchCoins, addCoins, getCoins, equippedMusic, owns } from '../progress.js';
import { SHOP } from '../data/shop.js';
const SHOP_MUSIC = SHOP.find((t) => t.name === 'MUSIC').items;
import { MatchExtras } from './matchExtras.js';

// Hit effects for the costumes that reshape a fighter's abilities (skins.js style)
const STYLE_HIT = {
  onebit: { shape: 'pixel', colors: [0xf4f4f0, 0x0e0e10], n: 9, ring: 0xf4f4f0, sound: 'glitch' },
  rose: { shape: 'rosepetal', colors: [0xd6336c, 0xff7aa8, 0x9a1240, 0x3c8c38], n: 9, sound: 'petal' },
  samurai: { shape: 'sakura', colors: [0xffb7c5, 0xffffff, 0xff8fab], n: 7, ink: true, kanji: true },
  hero: { shape: 'shard', colors: [0xbff6ff, 0x6fd6f0, 0xffffff], n: 9, ring: 0xbff6ff, sound: 'shing', words: true },
};
const KANJI = ['斬', '撃', '閃', '刃'];
const SFX_WORDS = ['ドン!', 'バシッ!', 'ズバッ!', 'ガキン!'];          // AKATSUKI: manga sound-effect lettering

// Title-screen demo: a random all-CPU match (random stage, 2-4 random fighters in random costumes).
function demoSettings() {
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const n = 2 + Math.floor(Math.random() * 3);
  const fighters = ROSTER.filter((f) => f.available);
  const picks = Array.from({ length: n }, () => pick(fighters).id);
  return {
    mode: 'stock', stocks: 2, hp: 150, minutes: 3, items: true, hazards: true, crt: false,
    stage: pick(STAGES.filter((st) => st.available)).id, picks,
    skins: picks.map((id) => Math.floor(Math.random() * skinsFor(id).length)),
    cpuCount: n, difficulty: 2, cpuLevels: picks.map(() => 1 + Math.floor(Math.random() * 2)), p1Pad: null, extraPads: [],
  };
}

import { playMusic, playPlaylist, stopMusic } from '../audio/music.js';
import { resolveSkins } from '../fighters/skins.js';
import { VIEW_W, VIEW_H, STEP_MS, FONT, PHYS, LIMIT_MAX, DIFFICULTY } from '../config.js';
import { settings, MODE_NAMES, demoRequest } from '../settings.js';
import { KeyboardController, GamepadController, MergedController, readPad } from '../input/controllers.js';
import { CpuController } from '../ai/cpu.js';
import { Fighter } from '../fighters/Fighter.js';
import { fighterById } from '../fighters/roster.js';
import { Fireball, Soul, EnergyBolt, ShadowPool, ThrownSword, VoidOrb, SoundWave, SpeakerAmp, MicToss, GraffitiTag, drawCursor, drawMiniWindow, AeroBubble, GoldfishFling, AeroPC, CdCloud, MissingPoster, WrongDoor } from '../fighters/entities.js';
import { stageById, STAGES, trackList } from '../stage/stages.js';
import { ROSTER } from '../fighters/roster.js';
import { skinsFor } from '../fighters/skins.js';
import { setSfxMuted } from '../audio/sfx.js';
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
    // demo: the title screen's background match (no players, no HUD, no sound of its own)
    // demoRequest.settings: a fixed all-CPU setup instead of a random one (used by tools/sim)
    this.demo = demoRequest.next; demoRequest.next = false; this.demoTime = 0;
    const S = this.demo ? (demoRequest.settings || demoSettings()) : settings; demoRequest.settings = null;
    this.mode = S.mode;
    this.bgList = []; this.worldList = []; this.uiList = [];
    this.cutscene = null;
    this.frame = 0; this.acc = 0; this.frozen = 0; this.paused = false; this.over = 0;
    this.unlocks = []; this.hits = new Set(); this.particles = []; this.limitHits = []; this.pools = []; this.projectiles = []; this.souls = []; this.pops = [];
    this.shakeAmt = 0; this.shakeTime = 0;

    // three cameras: background (no zoom), world (zooms to fit the fighters), UI (fixed)
    this.bgCam = this.cameras.main;
    this.worldCam = this.cameras.add(0, 0, VIEW_W, VIEW_H);
    this.uiCam = this.cameras.add(0, 0, VIEW_W, VIEW_H);
    this.worldCam.setZoom(1); this.worldCam.centerOn(0, -80);

    this.stage = stageById(S.stage).make(this);
    this.stage.hazardsOn = S.hazards;
    const bg = [], world = [];
    this.stage.draw(world, bg);
    this.addBg(...bg); this.addWorld(...world);
    // FULL AERO (AERO's alternate Limit) repaints the stage: a glossy sky over the backdrop, glossy platforms
    this.aeroBg = this.add.graphics().setScrollFactor(0).setDepth(50); this.addBg(this.aeroBg);
    this.aeroWorld = this.add.graphics(); this.addWorld(this.aeroWorld);
    this.aeroStage = { k: 0, on: false, t: 0 };
    // stage music (stages without a track of their own play silence for now)
    if (this.demo) setSfxMuted(true);
    else if (this.pickedTrack()) { const tr = this.pickedTrack(); if (tr.musicList) playPlaylist(this, tr.musicList, 0.55); else playMusic(this, tr.music, 0.55); }   // picked on the stage select screen
    else if (equippedMusic()) playMusic(this, 'bgm_shop_' + equippedMusic().slice(4), 0.55);   // a track bought in the shop and switched on
    else if (this.stage.musicList) playPlaylist(this, this.stage.musicList, 0.55); else if (this.stage.music) playMusic(this, this.stage.music, 0.55); else stopMusic();
    this.fxG = this.add.graphics().setDepth(5); this.addWorld(this.fxG);
    this.extras = new MatchExtras(this);              // stage effects and extras bought in the shop (matchExtras.js)

    // ---- players: P1 keyboard (+ optional pad), joined pads, then CPUs fill the rest
    this.fighters = [];
    const humans = [];
    const kb = new KeyboardController(this);
    // player 1: keyboard, plus their controller and on-screen touch controls when present
    this.touchPad = touchEnabled() && !this.demo ? new TouchPad(this, () => this.fighters[0]) : null;
    const p1Parts = [kb];
    if (S.p1Pad !== null) p1Parts.push(new GamepadController(S.p1Pad));
    if (this.touchPad) p1Parts.push(new TouchController(this.touchPad));
    if (!this.demo) humans.push({ ctrl: new MergedController(p1Parts), label: 'P1' });
    for (const pad of S.extraPads) humans.push({ ctrl: new GamepadController(pad), label: 'P' + (humans.length + 1) });
    const slots = Math.min(4, humans.length + S.cpuCount);
    this.isTraining = this.mode === 'training';
    const stocks = this.mode === 'stock' ? S.stocks : this.mode === 'stamina' ? 1 : 0;
    const defs = [];
    for (let i = 0; i < slots; i++) defs.push(fighterById(S.picks[i]).def);   // 'random' is decided here
    const skins = resolveSkins(defs.map((d) => d.id), S.skins);
    for (let i = 0; i < slots; i++) {
      const human = humans[i];
      const level = S.cpuLevels[i] ?? S.difficulty;
      const ctrl = human ? human.ctrl : this.isTraining ? new DummyController(this, level) : new CpuController(this, level);
      const label = human ? human.label : (this.isTraining ? 'DUMMY' : 'CPU') + (i + 1);
      const def = defs[i];
      const f = new Fighter(this, def, i, ctrl, { cpu: !human, label, stocks, hp: S.hp, skin: skins[i] });
      if (!human) ctrl.fighter = f;
      const sp = this.stage.spawns[i];
      f.placeAt(sp.x, sp.y - 1); f.facing = sp.x < 0 ? 1 : -1;
      this.fighters.push(f);
    }
    this.kbCtrl = kb;

    this.items = S.items ? new ItemSpawner(this) : null;
    this.hud = new Hud(this);
    this.training = this.isTraining ? new Training(this) : null;
    this.timeLeft = S.minutes * 3600;

    // overlays (UI camera)
    this.overlay = this.add.graphics().setDepth(5); this.addUI(this.overlay);
    this.bigText = this.add.text(VIEW_W / 2, VIEW_H / 2 - 30, '', { fontFamily: FONT, fontSize: '28px', color: '#ffffff', stroke: '#0b0a14', strokeThickness: 6, align: 'center' }).setOrigin(0.5);
    this.smallText = this.add.text(VIEW_W / 2, VIEW_H / 2 + 10, '', { fontFamily: FONT, fontSize: '8px', color: '#c9c4dc', stroke: '#0b0a14', strokeThickness: 4, align: 'center', lineSpacing: 6 }).setOrigin(0.5);
    this.modeText = this.add.text(8, 8, MODE_NAMES[this.mode], { fontFamily: FONT, fontSize: '8px', color: '#ffffff', stroke: '#0b0a14', strokeThickness: 4 });
    this.bigText.setDepth(20); this.smallText.setDepth(20); this.addUI(this.bigText, this.smallText, this.modeText);
    if (S.crt) this.makeCrt();

    this.countdown = this.isTraining || this.demo ? 0 : 200;   // "3, 2, 1, GO!" (training starts right away)
    this.escKey = this.input.keyboard.addKey('ESC');
    // mouse: a pause button in the corner, and Resume / Quit buttons on the pause screen
    this.input.mouse.disableContextMenu();
    this.mouseToggle = false; this.mouseQuit = false;
    this.pauseBtn = makeButton(this, VIEW_W - 8, 6, 'II  PAUSE', () => { this.mouseToggle = true; }, { originX: 1, depth: 25, size: '6px' });
    this.resumeBtn = makeButton(this, VIEW_W / 2, VIEW_H / 2 + 34, 'RESUME', () => { this.mouseToggle = true; }, { originX: 0.5, depth: 25, size: '8px' }).setVisible(false);
    this.quitBtn = makeButton(this, VIEW_W / 2, VIEW_H / 2 + 60, settings.from === 'TestFighters' ? 'QUIT TO LAB' : 'QUIT TO SETUP', () => { this.mouseQuit = true; }, { originX: 0.5, depth: 25, size: '8px' }).setVisible(false);
    this.fullBtn = addFullscreenButton(this, VIEW_W - 80, 6, { depth: 25 });
    this.addUI(this.pauseBtn, this.resumeBtn, this.quitBtn, this.fullBtn);
    this.qKey = this.input.keyboard.addKey('Q');
    if (this.demo) {                                  // just the fight: no HUD, name tags or anything to click
      this.uiCam.setVisible(false); this.input.enabled = false;
      for (const f of this.fighters) f.tag.setAlpha(0);
    }
    this.events.once('shutdown', () => this.cleanup());
  }

  // ---- camera bookkeeping: every object belongs to exactly one camera
  addBg(...objs) { for (const o of objs) { this.worldCam.ignore(o); this.uiCam.ignore(o); this.bgList.push(o); } }
  addWorld(...objs) { for (const o of objs) { this.bgCam.ignore(o); this.uiCam.ignore(o); } }
  addUI(...objs) { for (const o of objs) { this.bgCam.ignore(o); this.worldCam.ignore(o); } }
  sfxVol() { return this.demo ? 0 : settings.sfxVolume; }
  // the track picked on the stage select screen (null = AUTO: the stage's own, or the shop track switched on)
  pickedTrack() {
    if (this._track !== undefined) return this._track;
    const list = trackList(SHOP_MUSIC.filter((it) => owns(it.id))), id = settings.track;
    let tr = id === 'random' ? list.slice(2)[Math.floor(Math.random() * (list.length - 2))] : list.find((x) => x.id === id && x.id !== 'auto');
    return (this._track = tr || null);
  }

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
    if (this.demo) {                                  // title demo: a new random match every 25 s, or when one ends
      this.demoTime += delta;
      if (this.demoTime > 25000 || this.over === 1) { demoRequest.next = true; this.scene.restart(); return; }
    } else if (this.handlePause()) return;
    if (this.training) this.training.input();
    this.acc += Math.min(delta, 100) * (this.training ? this.training.speed : 1) * this.extras.timeScale();
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
      if (quit) { this.scene.start(settings.from || 'Setup'); return true; }   // back to wherever the match was started from
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
    this.extras.step();
    if (this.training) this.training.step();

    // rules
    if (this.mode === 'time' && !this.over) {
      this.timeLeft--;
      if (this.timeLeft === 600) sfx('warn', 0.6);
      if (this.timeLeft <= 0) this.endMatch('TIME!');
    }
    if (this.over > 0 && --this.over === 0) { if (this.demo) { this.over = 1; return; } this.toResults(); }
  }

  // ------------------------------------------------------------------ combat
  resolveHits(hazard) {
    const hbs = [];
    for (const f of this.fighters) if (f.alive && f.hitstop === 0) hbs.push(...f.activeHitboxes());
    for (const p of this.projectiles) if (p.alive) { const h = p.hitbox(); if (h) hbs.push(h); }
    for (const s of this.souls) { const h = s.hitbox(); if (h) hbs.push(h); }
    for (const lh of this.limitHits) if (lh.t < 2) hbs.push(lh.hb);
    if (this.stage.strikeTargets) this.stage.strikeTargets(this, hbs.filter((h) => h.owner && !h.grab));
    for (const p of this.pools) if (p.alive && p.strike) p.strike(hbs);          // things fighters put down that can be smashed (AERO's computers)   // things on the stage that attacks can hit (Gravemoon's lantern)
    if (hazard) for (const hz of [].concat(hazard)) hbs.push({ ...hz, h: hz, owner: null, facing: 1 });   // a stage can return one hazard or a list

    const overlap = (a, b) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
    for (const hb of hbs) {
      for (const t of this.fighters) {
        if (!t.alive || t === hb.owner) continue;
        if (hb.owner && t.team === hb.owner.team) continue;
        if (t.isIntangible() || t.state === 'grabbed' || t.state === 'seized') continue;
        const key = hb.id + ':' + t.slot;
        if (this.hits.has(key)) continue;
        if (!overlap(hb, t.hurtbox())) continue;
        this.hits.add(key);
        if (hb.grab) { if (hb.owner.state === 'attack' && t.grounded) hb.owner.onGrab(t); continue; }
        if (t.counterReady && t.counterReady() && !hb.hazard && !hb.pillar) {   // countered: no damage, she strikes back
          t.counterHit(hb);
          if (hb.projectile) hb.projectile.kill();             // (a thrown sword bounces back to its owner instead)
          if (hb.soul) hb.soul.onBite();
          continue;
        }
        const blocked = t.state === 'shield' && !hb.hazard && !hb.pillar;
        if (blocked) this.shieldHit(t, hb);
        else this.applyHit(t, hb, (hb.x1 + hb.x2) / 2);
        if (hb.projectile && (!hb.persist || blocked)) hb.projectile.kill();   // a thrown sword keeps spinning through hits, but a shield knocks it back
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
        if (hb.projectile && !hb.persist) hb.projectile.kill();
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
    const beat = owner && owner.def.beat ? owner.beatBonus(hb) : null;        // NU: an attack started on the beat
    if (t.def.beat) t.dropStreak();
    const dmg = Math.max(1, Math.round((h.dmg || 0) * (owner ? owner.dmgMult : 1) * t.dmgTakenMult * (beat ? beat.dmg : 1)));
    if (beat) owner.beatLanded(t, hb);
    if (owner && !hb.projectile && owner.state === 'attack' && owner.move && owner.move.dive && owner.move.dive.bounce) owner.diveBounce = true;
    if (owner && !hb.projectile && owner.state === 'attack' && owner.move && owner.move.cling && t.alive) owner.startCling(t);
    if (owner && !hb.projectile && owner.state === 'attack' && owner.move && owner.move.flurry && t.alive) owner.startFlurry(t);   // SEEN's LUNGE hit: the flurry   // LAST SEEN: she clings on   // NU's Stage Dive: bounce off them
    let kbPct;
    if (this.mode === 'stamina') { t.hp -= dmg; kbPct = 40 + 50 * (1 - Math.max(0, t.hp) / t.maxHp); }
    else { t.percent = Math.min(999, t.percent + dmg); kbPct = t.percent; }
    if (t.state !== 'limit') t.limit = Math.min(LIMIT_MAX, t.limit + dmg);
    t.stats.damageTaken += dmg; if (owner) owner.stats.damageDealt += dmg;
    if (owner && owner.def.signal) owner.addSignal(dmg * owner.def.signal.perDealt);   // WHAT ONCE WAS's SIGNAL meter
    if (t.def.signal) t.addSignal(dmg * t.def.signal.perTaken);
    if (owner && owner.def.sightings) owner.addSightings(dmg * owner.def.sightings.perDealt);   // LAST SEEN's SIGHTINGS meter
    if (t.def.sightings) t.addSightings(dmg * t.def.sightings.perTaken);

    const kb = (h.base + h.growth * kbPct / 100) / t.def.weight * t.kbTakenMult * (beat ? beat.kb : 1);
    let dir = hb.facing || 1;
    if (!owner || h.radial) dir = h.dirX || Math.sign(t.x - srcX) || 1;   // moving hazards push the way they travel; explosions push outward
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
    t.bubbled = h.bubble || 0;        // AERO's Bubble Trap: sealed in a bubble, floating up
    if (h.possess && t.alive && t.possess(h.possess)) {   // Soul Hex
      this.popText(t, 'POSSESSED!  MASH TO BREAK FREE', '#b07ad0'); sfx('curse', 0.9, 0.8);
    }

    const stop = Math.min(14, 3 + Math.floor(dmg / 2.5));
    t.hitstop = stop; t.flash = 5;
    if (owner && !hb.projectile && !hb.soul && !hb.pillar) owner.hitstop = stop;

    const c = t.center();
    this.puff(c.x, c.y, 0xffffff, 6 + Math.floor(kb));
    this.puff(c.x, c.y, 0xf3c358, 4);
    if (owner) this.skinHitFx(owner, c.x, c.y, kb, dir, dmg);
    this.extras.onHit(t, dmg, kb);
    if (owner && owner.def.hitSfx && !hb.projectile && !hb.pillar) sfx(owner.def.hitSfx, 0.32, 0.9 + Math.random() * 0.2);   // steel ringing on steel
    if (kb > 8) { sfx('bighit', 0.9); this.shake(Math.min(12, kb), 3); } else sfx('hit', 0.7, 1 + Math.random() * 0.2);
    if (h.homerun && h.full) {                      // a fully charged Grand Slam: crack of the bat
      this.popText(t, 'HOME RUN!', '#ffe08a'); this.shake(14, 8); sfx('ko', 0.6, 1.6);
      if (owner.style === 'samurai') {                // Samurai: one flash of the blade
        const k = this.add.text(t.x, t.y - 90, '一閃', { fontFamily: 'serif', fontSize: '34px', fontStyle: 'bold', color: '#ffffff', stroke: '#c8102e', strokeThickness: 7 }).setOrigin(0.5).setDepth(6);
        this.addWorld(k); this.pops.push({ t: k, life: 70 }); sfx('taiko', 1); sfx('shing', 0.8, 0.8);
      }
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; this.particles.push({ x: c.x, y: c.y, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, life: 18, color: i % 2 ? 0xffe08a : 0xffffff, size: 3, drag: 0.9, grav: 0 }); }
      this.particles.push({ shape: 'ring', x: c.x, y: c.y, vx: 0, vy: 0, life: 14, maxLife: 14, color: 0xffe08a, grav: 0, r: 6, dr: 4 });
    }

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
    this.extras.onKO(f, bx, by);
    if (f.lastHitBy && f.lastHitBy !== f) {
      const k = f.lastHitBy; k.kos++; if (k.quip) k.quip('ko');
      if (!k.isCpu && !this.isTraining) {           // milestone progress: human KOs in real matches
        const tier = addKO(k.def.id);
        if (tier) { this.unlocks.push({ slot: k.slot, fighter: k.def.id, tier }); this.popText(k, 'NEW COSTUME UNLOCKED!', '#f3c358'); sfx('limitready', 1); }
      }
    }
    f.falls++;
    if (this.mode !== 'time' && !this.isTraining) {
      f.stocks--;
      if (f.stocks <= 0) { f.eliminated = true; for (const s of f.souls) s.kill(true); }
    }
    f.ko();
    if (this.mode !== 'time' && !this.isTraining) {
      const left = this.fighters.filter((x) => !x.eliminated);
      if (left.length <= 1 && !this.over) { this.endMatch('GAME!'); this.extras.onFinalKO(); }
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
    // coins for the shop: each human player earns some for playing, their KOs and where they placed (progress.js)
    const coins = this.isTraining || this.demo ? [] : order.map((f, place) => (f.isCpu ? null : { label: f.label, slot: f.slot, coins: matchCoins(place, f.kos) })).filter(Boolean);
    const earned = coins.reduce((n, c) => n + c.coins, 0); if (earned) addCoins(earned);
    const data = { results, mode: this.mode, unlocks: this.unlocks, coins, total: getCoins() };
    if (hasWinCutscene(results[0].fighter) && !this.isTraining) return this.scene.start('Win', data);   // Soul Summoner, Mr Wake, Lacy: a win cutscene first (WinScene.js)
    this.scene.start('Results', data);
  }

  // ------------------------------------------------------------------ spawns used by fighters
  spawnFireball(owner, k) { const p = new Fireball(this, owner, k); this.projectiles.push(p); return p; }
  spawnPool(owner, spec) {
    for (const p of this.pools) if (p.owner === owner) p.kill();          // one puddle per Mr Wake
    const p = new ShadowPool(this, owner, spec); if (p.alive) this.pools.push(p); return p;
  }
  spawnOrb(owner, spec) { const p = new VoidOrb(this, owner, spec); this.projectiles.push(p); return p; }
  spawnSword(owner, spec) { const p = new ThrownSword(this, owner, spec); this.projectiles.push(p); return p; }
  spawnBolt(owner, spec) { const p = new EnergyBolt(this, owner, spec); this.projectiles.push(p); return p; }
  spawnWave(owner, spec) { const p = new SoundWave(this, owner, spec); this.projectiles.push(p); return p; }
  spawnMic(owner, spec) { const p = new MicToss(this, owner, spec); this.projectiles.push(p); return p; }
  spawnAmp(owner, spec) {
    for (const p of this.pools) if (p.owner === owner && p instanceof SpeakerAmp) p.kill();   // one amp per NU
    const p = new SpeakerAmp(this, owner, spec); if (p.alive) this.pools.push(p); return p;
  }
  spawnTag(owner, spec) {
    for (const p of this.pools) if (p.owner === owner && p instanceof GraffitiTag) p.kill();   // one tag per NU
    const p = new GraffitiTag(this, owner, spec); if (p.alive) this.pools.push(p); return p;
  }
  spawnAeroBubble(owner, spec) { const p = new AeroBubble(this, owner, spec); this.projectiles.push(p); return p; }
  spawnFish(owner, spec) { const p = new GoldfishFling(this, owner, spec); this.projectiles.push(p); return p; }
  spawnPC(owner, spec) {
    const mine = this.pools.filter((p) => p.alive && p.owner === owner && p instanceof AeroPC);
    if (mine.length >= spec.max) mine[0].kill();                                        // at most two: the oldest goes
    const p = new AeroPC(this, owner, spec); this.pools.push(p); return p;
  }
  pcsOf(owner) { return this.pools.filter((p) => p.alive && p.owner === owner && p instanceof AeroPC && p.landed); }
  spawnCdCloud(owner, spec) {
    for (const p of this.pools) if (p.owner === owner && p instanceof CdCloud) p.kill();   // one cloud at a time
    const p = new CdCloud(this, owner, spec); this.pools.push(p); return p;
  }
  spawnSoul(owner) { const s = new Soul(this, owner); this.souls.push(s); return s; }
  // WHAT ONCE WAS: its MISSING poster (one in the air at a time) and its door (one each)
  spawnPoster(owner, spec) { const p = new MissingPoster(this, owner, spec); this.projectiles.push(p); return p; }
  spawnDoor(owner, spec) {
    for (const p of this.pools) if (p.owner === owner && p instanceof WrongDoor) p.kill();
    const p = new WrongDoor(this, owner, spec); if (!p.alive) return null;
    this.pools.push(p); return p;
  }

  startLimit(f) {
    this.frozen = 34;
    sfx('limit', 1);
    if (f.style === 'samurai') { sfx('taiko', 1); sfx('shing', 0.7, 0.9); }
    if (f.style === 'onebit') sfx('glitch', 0.8, 0.8);
    if (f.style === 'rose') sfx('petal', 0.8, 0.7);
    if (f.style === 'hero') { sfx('taiko', 0.9); sfx('shing', 0.8, 1.2); }
    if (f.style === 'wowRonin') { sfx('taiko', 1); sfx('shing', 0.7, 0.8); }
    if (f.style === 'wowDial') sfx('dialup', 0.6);                    // DIAL-UP: it dials in
    if (f.style === 'wowHack') sfx('glitch', 0.9, 0.5);
    if (f.style === 'wowAero') { sfx('item', 0.7, 0.8); sfx('petal', 0.7, 0.8); }
    this.shake(6, 30);
    this.limitBanner = { t: 0, name: f.limitName || f.def.limit.name, color: f.color };
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
  // Milestone costumes: each has its own hit effect (skins.js vfx.hit), bigger at higher milestones.
  skinHitFx(owner, x, y, kb, dir, dmg = 0) {
    const v = (owner.def.wrong && owner.vfx && owner.vfx.seenHit) || owner.def.hitVfx || (owner.vfx && owner.vfx.hit) || STYLE_HIT[owner.style];   // (a form can override the costume: LAST SEEN as SEEN)
    if (!v) return;
    if (v.sound) sfx(v.sound, 0.35, 0.9 + Math.random() * 0.3);
    if (v.words && (dmg >= 7 || kb > 6)) {                // Akatsuki: manga sound-effect lettering on solid hits
      const w = this.add.text(x + (Math.random() - 0.5) * 24, y - 28, SFX_WORDS[Math.floor(Math.random() * SFX_WORDS.length)], { fontFamily: 'sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#ffe14a', stroke: '#2a0408', strokeThickness: 5 }).setOrigin(0.5).setDepth(6).setRotation((Math.random() - 0.5) * 0.4);
      this.addWorld(w); this.pops.push({ t: w, life: 40 });
    }
    if (v.kanji && (dmg >= 10 || kb > 7)) {            // Samurai: a brush-stroke kanji on the big hits
      const k = this.add.text(x + (Math.random() - 0.5) * 20, y - 30, KANJI[Math.floor(Math.random() * KANJI.length)], { fontFamily: 'serif', fontSize: '22px', fontStyle: 'bold', color: '#c8102e', stroke: '#0b0a14', strokeThickness: 5 }).setOrigin(0.5).setDepth(6);
      this.addWorld(k); this.pops.push({ t: k, life: 50 });
      sfx('shing', 0.4, 0.9);
    }
    const P = this.particles, cols = v.colors, col = (i) => cols[i % cols.length], R = Math.random;
    const n = v.n + Math.floor(kb / 2);
    const add = (o) => P.push({ size: 2, grav: 0.08, ...o });
    switch (v.shape) {
      case 'paper':                                   // HOMEROOM: notebook paper scraps and chalk dust; big hits fold a paper airplane
        for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (R() - 0.5) * 2.8, sp = 1.4 + R() * 2.6; add({ shape: 'paper', x, y, vx: Math.cos(a) * sp + dir * 0.6, vy: Math.sin(a) * sp, life: 34 + R() * 16, color: col(i), ang: R() * 6, spin: (R() - 0.5) * 0.3, drag: 0.94, grav: 0.05, sway: R() * 6 }); }
        for (let i = 0; i < 6; i++) add({ x: x + (R() - 0.5) * 14, y: y + (R() - 0.5) * 10, vx: (R() - 0.5) * 1.2, vy: -R(), life: 16 + R() * 10, color: 0xf4f4f0, size: 1 + (R() < 0.3), grav: 0, drag: 0.92 });
        if (dmg >= 9 || kb > 7) add({ shape: 'plane', x, y: y - 6, vx: dir * 3.2, vy: -1.4, life: 46, color: 0xffffff, grav: 0.02, dir });
        break;
      case 'splat':                                   // BLOCK BOSS: spray-paint splats flying off, dripping
        for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (R() - 0.5) * 2.8, sp = 1.5 + R() * 3; add({ shape: 'splat', x, y, vx: Math.cos(a) * sp + dir, vy: Math.sin(a) * sp, life: 24 + R() * 14, color: col(i), r: 2 + Math.floor(R() * 3), drag: 0.9, grav: 0.12 }); }
        if (dmg >= 9 || kb > 7) for (let i = 0; i < 4; i++) add({ shape: 'star', x: x + (R() - 0.5) * 20, y: y - 10 + (R() - 0.5) * 16, vx: (R() - 0.5), vy: -1, life: 20, color: 0xffd23a, grav: 0 });   // bling on the big hits
        break;
      case 'bones':                                   // BONEZ: a rattle of little bones and a ghostly flash
        add({ shape: 'flash', x, y, vx: 0, vy: 0, life: 10, maxLife: 10, r: 9 + kb, color: 0x9aff6a, grav: 0 });
        for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (R() - 0.5) * 2.6, sp = 1.8 + R() * 3; add({ shape: 'bone', x, y, vx: Math.cos(a) * sp + dir * 0.6, vy: Math.sin(a) * sp, life: 30 + R() * 14, color: col(i), ang: R() * 6, spin: (R() - 0.5) * 0.6, drag: 0.96, grav: 0.14 }); }
        if (dmg >= 9 || kb > 7) add({ shape: 'skull', x, y: y - 8, vx: dir * 0.4, vy: -1.2, life: 34, color: 0xe8ffd8, grav: -0.02, drag: 0.96 });
        break;
      case 'scrap':                                   // SEEN (the animatronic): sparks, tufts of fur and a splash of oil
        add({ shape: 'flash', x, y, vx: 0, vy: 0, life: 6, maxLife: 6, r: 7 + kb, color: 0xffd060, grav: 0 });
        for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (R() - 0.5) * 3, sp = 2.5 + R() * 4; add({ shape: 'shard', x, y, vx: Math.cos(a) * sp + dir, vy: Math.sin(a) * sp, life: 10 + R() * 12, color: col(i), drag: 0.94, grav: 0.25, ang: a }); }
        for (let i = 0; i < 4; i++) add({ shape: 'pixel2', x: x + (R() - 0.5) * 10, y, vx: (R() - 0.5) * 2 + dir, vy: -1 - R(), life: 30, color: R() < 0.5 ? 0xd8c070 : 0xb89e4e, drag: 0.95, grav: 0.05 });
        for (let i = 0; i < 3; i++) add({ shape: 'ink', x, y, vx: dir * (1 + R() * 2), vy: -R() * 2, life: 20, color: 0x141008, r: 2 + R() * 2, drag: 0.9, grav: 0.2 });
        if (dmg >= 12 || kb > 7) this.shake(4, 4);
        break;
      case 'wrong':                                   // SEEN: black ink splats, torn poster scraps and static
        for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, sp = 1.5 + R() * 3.5; add({ shape: 'ink', x, y, vx: Math.cos(a) * sp + dir, vy: Math.sin(a) * sp - 0.5, life: 20 + R() * 14, color: col(i), r: 2 + R() * 3, drag: 0.9, grav: 0.15 }); }
        for (let i = 0; i < 3; i++) add({ shape: 'paper', x, y, vx: dir * (1 + R() * 2), vy: -1 - R() * 2, life: 36, color: R() < 0.5 ? 0xece6d4 : 0xc8281e, ang: R() * 6, spin: 0.3, drag: 0.94, grav: 0.05 });
        for (let i = 0; i < 6; i++) add({ shape: 'pixel2', x: x + (R() - 0.5) * 20, y: y + (R() - 0.5) * 16, vx: 0, vy: 0, life: 8, color: R() < 0.5 ? 0xffffff : 0x141216, grav: 0 });
        if (dmg >= 12 || kb > 7) this.shake(4, 4);
        break;
      case 'win95':                                   // DIAL-UP: little error windows bursting off, and a few stray bits
        for (let i = 0; i < Math.ceil(n / 2); i++) { const a = -Math.PI / 2 + (R() - 0.5) * 2.4, sp = 1.4 + R() * 2.4; add({ shape: 'win95', x, y, vx: Math.cos(a) * sp + dir * 0.5, vy: Math.sin(a) * sp, life: 26 + R() * 14, color: [0x0a2484, 0x8a0000, 0x108484][i % 3], drag: 0.93, grav: 0.04 }); }
        for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, sp = 1.5 + R() * 3; add({ shape: 'pixel2', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 14 + R() * 10, color: col(i), drag: 0.9, grav: 0 }); }
        if (dmg >= 9 || kb > 7) add({ shape: 'cursor', x: x + dir * 6, y: y - 10, vx: dir * 0.5, vy: -0.6, life: 30, color: 0xffffff, grav: 0 });
        break;
      case 'flame':                                   // INFERNO: a burst of fire licking upward, with a hot flash
        add({ shape: 'flash', x, y, vx: 0, vy: 0, life: 10, maxLife: 10, r: 10 + kb, color: 0xffa030, grav: 0 });
        for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (R() - 0.5) * 2.2, sp = 1.5 + R() * 3; add({ x: x + (R() - 0.5) * 12, y, vx: Math.cos(a) * sp + dir * 0.6, vy: Math.sin(a) * sp, life: 16 + R() * 14, color: col(i), size: 2 + (R() < 0.5), grav: -0.05, drag: 0.93 }); }
        for (let i = 0; i < 3; i++) add({ shape: 'smoke', x: x + (R() - 0.5) * 10, y: y - 6, vx: (R() - 0.5) * 0.6, vy: -0.6, life: 30, maxLife: 30, r: 3, color: 0x3a2a2a, grav: -0.01 });
        break;
      case 'dust': for (let i = 0; i < n; i++) add({ x, y, vx: (R() - 0.5) * 2.4, vy: -R() * 1.6, life: 20 + R() * 16, color: col(i), size: 2 + (i % 3 === 0), grav: 0.02, drag: 0.94 }); break;
      case 'wisp': for (let i = 0; i < n; i++) add({ shape: 'wisp', x: x + (R() - 0.5) * 16, y, vx: (R() - 0.5) * 1.2, vy: -0.6 - R() * 1.4, life: 34 + R() * 20, color: col(i), grav: -0.01, sway: R() * 6 }); break;
      case 'skull': for (let i = 0; i < n; i++) add({ shape: 'skull', x: x + (R() - 0.5) * 20, y: y - 4, vx: (R() - 0.5) * 1.5, vy: -1 - R(), life: 36, color: col(i), grav: -0.02, drag: 0.96 }); break;
      case 'shard': for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, sp = 2 + R() * 4; add({ shape: 'shard', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 22 + R() * 14, color: col(i), drag: 0.92, grav: 0.02, ang: a }); } break;
      case 'drop': for (let i = 0; i < n; i++) add({ shape: 'drop', x, y, vx: dir * (0.5 + R() * 3) + (R() - 0.5) * 1.5, vy: -1.5 - R() * 3, life: 30 + R() * 14, color: col(i), grav: 0.2 }); break;
      case 'bubble': for (let i = 0; i < n; i++) add({ shape: 'bubble', x: x + (R() - 0.5) * 18, y: y + (R() - 0.5) * 12, vx: (R() - 0.5) * 0.8, vy: -0.4 - R() * 1, life: 36 + R() * 20, color: col(i), grav: -0.015, r: 1 + Math.floor(R() * 3), sway: R() * 6 }); break;
      case 'whirl': add({ shape: 'whirl', x, y, vx: 0, vy: 0, life: 30, maxLife: 30, color: col(0), color2: col(1), grav: 0 }); break;
      case 'cross': for (let i = 0; i < n; i++) add({ shape: 'cross', x: x + (R() - 0.5) * 26, y: y + (R() - 0.5) * 22, vx: 0, vy: -0.3, life: 22 + R() * 12, color: col(i), grav: 0, r: 2 + Math.floor(R() * 2) }); break;
      case 'note': for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (R() - 0.5) * 2.6, sp = 1 + R() * 2.2; add({ shape: 'note', x: x + (R() - 0.5) * 10, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 30 + R() * 18, color: col(i), grav: -0.01, drag: 0.95, sway: R() * 6 }); } break;
      case 'bat': for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (R() - 0.5) * 2.4, sp = 1.4 + R() * 2.2; add({ shape: 'bat', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 36 + R() * 20, color: col(i % 2), grav: -0.02, drag: 0.97 }); } break;
      case 'star': for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, sp = 1.6 + R() * 3; add({ shape: 'star', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.8, life: 26 + R() * 16, color: col(i), grav: 0.05, drag: 0.94 }); } break;
      case 'pixel2': for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, sp = 1.5 + R() * 3.5; add({ shape: 'pixel2', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.5, life: 18 + R() * 14, color: col(i), drag: 0.9, grav: 0 }); } break;
      case 'feather': for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, sp = 1.5 + R() * 3; add({ shape: 'feather', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, life: 50 + R() * 30, color: col(i), grav: 0.03, drag: 0.93, sway: R() * 6 }); } break;
      default: for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, sp = 1.5 + R() * 3.5; add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.5, life: 14 + R() * 12, color: col(i), drag: 0.9, size: 2 + (i % 4 === 0) }); }
    }
    if (v.sparks) for (let i = 0; i < 6; i++) { const a = R() * Math.PI * 2; add({ x, y, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, life: 16, color: v.sparks[i % v.sparks.length], drag: 0.88 }); }
    if (v.drops) for (let i = 0; i < 6; i++) add({ shape: 'drop', x, y, vx: dir * (0.5 + R() * 2.5), vy: -1.5 - R() * 2.5, life: 28, color: cols[0], grav: 0.2 });
    if (v.bubbles) for (let i = 0; i < 6; i++) add({ shape: 'bubble', x: x + (R() - 0.5) * 20, y: y + (R() - 0.5) * 14, vx: 0, vy: -0.5 - R(), life: 40, color: cols[i % cols.length], grav: -0.015, r: 1 + Math.floor(R() * 3), sway: R() * 6 });
    if (v.whirl) add({ shape: 'whirl', x, y, vx: 0, vy: 0, life: 30, maxLife: 30, color: cols[0], color2: cols[1], grav: 0 });
    if (v.ink) for (let i = 0; i < 7; i++) { const a = (dir > 0 ? 0 : Math.PI) + (R() - 0.5) * 1.6, sp = 2 + R() * 3.5; add({ shape: 'ink', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.6, life: 20 + R() * 10, color: 0x0b0a14, grav: 0.12, drag: 0.9, r: 1 + Math.floor(R() * 3) }); }
    if (v.glint) add({ shape: 'glint', x, y, vx: 0, vy: 0, life: 8, maxLife: 8, color: 0xffffff, grav: 0, dir });
    if (v.ring) add({ shape: 'ring', x, y, vx: 0, vy: 0, life: 14, maxLife: 14, color: v.ring, grav: 0, r: 4, dr: 2 + kb * 0.15 });
    if (v.ring2) add({ shape: 'ring', x, y, vx: 0, vy: 0, life: 10, maxLife: 10, color: v.ring2, grav: 0, r: 2, dr: 3.4 + kb * 0.2 });
    if (v.pillar) add({ shape: 'pillar', x, y, vx: 0, vy: 0, life: 18, maxLife: 18, color: v.pillar, grav: 0 });
    if (v.flash) add({ shape: 'flash', x, y, vx: 0, vy: 0, life: 5, maxLife: 5, color: 0xffffff, grav: 0, r: 10 + kb });
  }
  // the extra particle shapes used by milestone costumes (plain particles are squares)
  drawParticle(g, p) {
    const a = Math.min(1, p.life / 10), X = Math.round(p.x), Y = Math.round(p.y);
    switch (p.shape) {
      case 'win95': drawMiniWindow(g, X - 4, Y - 3, 9, 7, a, p.color); break;
      case 'paper': {                                 // a scrap of lined notebook paper, fluttering
        p.ang = (p.ang || 0) + (p.spin || 0.2); const w = Math.max(1, Math.round(Math.abs(Math.cos(p.ang)) * 4));
        g.fillStyle(0x10101a, a * 0.6); g.fillRect(X - w / 2 - 1, Y - 3, w + 2, 6);
        g.fillStyle(p.color, a); g.fillRect(X - w / 2, Y - 2, w, 4); if (w > 1) { g.fillStyle(0x8ab0e8, a); g.fillRect(X - w / 2, Y, w, 1); } break;
      }
      case 'plane': {                                 // a paper airplane gliding
        const d2 = p.dir || 1;
        g.fillStyle(0x10101a, a); g.fillTriangle(X + d2 * 6, Y, X - d2 * 6, Y - 4, X - d2 * 4, Y + 1);
        g.fillStyle(0xffffff, a); g.fillTriangle(X + d2 * 5, Y, X - d2 * 5, Y - 3, X - d2 * 3, Y);
        g.fillStyle(0xc8d0e0, a); g.fillTriangle(X + d2 * 5, Y, X - d2 * 3, Y, X - d2 * 4, Y + 2); break;
      }
      case 'splat': g.fillStyle(p.color, a); g.fillCircle(X, Y, p.r); g.fillRect(X - 1, Y, 2, p.r + 2); g.fillStyle(0xffffff, a * 0.6); g.fillRect(X - 1, Y - p.r + 1, 1, 1); break;   // a paint splat with a drip
      case 'bone': {                                  // a little bone, tumbling
        p.ang = (p.ang || 0) + (p.spin || 0.3); const c = Math.cos(p.ang) * 3, s2 = Math.sin(p.ang) * 3;
        g.lineStyle(2, p.color, a); g.lineBetween(X - c, Y - s2, X + c, Y + s2);
        g.fillStyle(p.color, a); g.fillRect(X - c - 1, Y - s2 - 1, 2, 2); g.fillRect(X + c - 1, Y + s2 - 1, 2, 2); break;
      }   // DIAL-UP: a tiny error window
      case 'cursor': drawCursor(g, X, Y, 0, a); break;
      case 'wisp': g.fillStyle(p.color, a); g.fillRect(X - 1, Y - 1, 3, 3); g.fillStyle(p.color, a * 0.5); g.fillRect(X, Y + 2, 1, 3); g.fillStyle(0xffffff, a); g.fillRect(X, Y, 1, 1); break;
      case 'skull':
        g.fillStyle(p.color, a); g.fillRect(X - 2, Y - 2, 5, 3); g.fillRect(X - 1, Y + 1, 3, 2);
        g.fillStyle(0x120e1c, a); g.fillRect(X - 1, Y - 1, 1, 1); g.fillRect(X + 1, Y - 1, 1, 1); g.fillRect(X, Y + 2, 1, 1); break;
      case 'shard': { const c = Math.cos(p.ang) * 3, s2 = Math.sin(p.ang) * 3; g.lineStyle(2, p.color, a); g.lineBetween(X - c, Y - s2, X + c, Y + s2); break; }
      case 'drop': g.fillStyle(p.color, a); g.fillRect(X, Y - 1, 1, 1); g.fillRect(X - 1, Y, 3, 2); break;
      case 'bubble': g.lineStyle(1, p.color, a * 0.9); g.strokeCircle(X, Y, p.r); g.fillStyle(0xffffff, a); g.fillRect(X - Math.max(1, p.r - 1), Y - Math.max(1, p.r - 1), 1, 1); break;
      case 'cross': g.fillStyle(p.color, a); g.fillRect(X - p.r, Y, p.r * 2 + 1, 1); g.fillRect(X, Y - p.r - 1, 1, p.r * 2 + 3); g.fillStyle(0xffffff, a); g.fillRect(X, Y, 1, 1); break;
      case 'feather': g.fillStyle(p.color, a); g.fillRect(X, Y - 2, 1, 5); g.fillRect(X + 1, Y - 1, 1, 3); g.fillStyle(0xffffff, a * 0.8); g.fillRect(X - 1, Y, 1, 2); break;
      case 'ring': { const k = 1 - p.life / p.maxLife; g.lineStyle(2, p.color, (1 - k) * 0.9); g.strokeCircle(X, Y, p.r + p.dr * k * p.maxLife); break; }
      case 'whirl': {
        const k = 1 - p.life / p.maxLife;
        for (let i = 0; i < 26; i++) { const t = i / 26, ang = t * Math.PI * 4 + k * 8, rr = 3 + t * 20 * (0.6 + k * 0.6);
          g.fillStyle(i % 2 ? p.color : p.color2, (1 - k) * (1 - t * 0.5)); g.fillRect(Math.round(X + Math.cos(ang) * rr), Math.round(Y + Math.sin(ang) * rr * 0.6), 2, 2); }
        break;
      }
      case 'glint': { const k = p.life / p.maxLife; g.fillStyle(p.color, k); g.fillRect(X - 16, Y - 1, 32, 2); g.fillRect(X - 1, Y - 8, 2, 16); g.fillStyle(p.color, k * 0.5); g.fillRect(X - 24 * k, Y, 48 * k, 1); break; }
      case 'pillar': { const k = p.life / p.maxLife; g.fillStyle(p.color, 0.35 * k); g.fillRect(X - 10, Y - 140, 20, 160); g.fillStyle(0xffffff, 0.7 * k); g.fillRect(X - 3, Y - 140, 6, 160); break; }
      case 'pixel': g.fillStyle(0x0e0e10, a); g.fillRect(X - 2, Y - 2, 5, 5); g.fillStyle(p.color, a); g.fillRect(X - 1, Y - 1, 3, 3); break;   // 1-BIT: hard-edged pixels
      case 'rosepetal': {                             // a curled rose petal, tumbling
        const f = Math.sin((p.life + (p.sway || 0)) * 0.3);
        g.fillStyle(p.color, a); g.fillEllipse(X, Y, 4 + Math.abs(f) * 2, 3); g.fillStyle(0xffffff, a * 0.5); g.fillRect(X - 1, Y - 1, 1, 1);
        break;
      }
      case 'sakura': {                                // a tiny cherry blossom: five petals and a pale centre
        for (let k = 0; k < 5; k++) { const ang = k * 1.2566 + p.life * 0.15; g.fillStyle(p.color, a); g.fillRect(Math.round(X + Math.cos(ang) * 2) - 1, Math.round(Y + Math.sin(ang) * 2) - 1, 2, 2); }
        g.fillStyle(0xfff0a0, a); g.fillRect(X, Y, 1, 1);
        break;
      }
      case 'ink': g.fillStyle(p.color, a * 0.9); g.fillCircle(X, Y, p.r); break;
      case 'bat': {                                   // a little bat, wings flapping
        const up = (p.life >> 2) % 2;
        g.fillStyle(p.color, a); g.fillRect(X - 1, Y - 1, 3, 2);
        if (up) { g.fillRect(X - 4, Y - 3, 3, 2); g.fillRect(X + 2, Y - 3, 3, 2); } else { g.fillRect(X - 4, Y, 3, 1); g.fillRect(X + 2, Y, 3, 1); g.fillRect(X - 5, Y + 1, 1, 1); g.fillRect(X + 5, Y + 1, 1, 1); }
        g.fillStyle(0xffb02a, a); g.fillRect(X - 1, Y - 1, 1, 1); g.fillRect(X + 1, Y - 1, 1, 1);
        break;
      }
      case 'note': g.fillStyle(p.color, a); g.fillRect(X, Y - 5, 1, 6); g.fillRect(X - 2, Y, 3, 2); g.fillRect(X + 1, Y - 5, 2, 1); g.fillRect(X + 2, Y - 4, 1, 1); break;   // a music note
      case 'star': g.fillStyle(p.color, a); g.fillRect(X - 1, Y - 3, 2, 7); g.fillRect(X - 3, Y - 1, 7, 2); g.fillStyle(0xffffff, a); g.fillRect(X - 1, Y - 1, 2, 2); break;   // a four-point star
      case 'pixel2': g.fillStyle(p.color, a); g.fillRect(X - 1, Y - 1, 3, 3); g.fillStyle(p.color, a * 0.35); g.fillRect(X - 3, Y - 3, 7, 7); break;   // a neon pixel with a soft glow                        // ink splash
      case 'smoke': { const k = 1 - p.life / p.maxLife; g.fillStyle(p.color, 0.55 * (1 - k)); g.fillCircle(X, Y, p.r + k * 6); break; }
      case 'flash': { const k = p.life / p.maxLife; g.fillStyle(p.color, 0.8 * k); g.fillCircle(X, Y, p.r * (1.5 - k * 0.5)); break; }
      default: g.fillStyle(p.color, a); g.fillRect(X, Y, p.size, p.size);
    }
  }
  // ---- FULL AERO: the stage turns into a Frutiger Aero version of itself while any AERO is transformed
  setAeroStage(on) { this.aeroStage.on = on; }
  bannerAero(text) {
    const t = this.add.text(VIEW_W / 2, 34, text, { fontFamily: FONT, fontSize: '22px', color: '#e8fbff', stroke: '#1a7fb0', strokeThickness: 6, padding: { x: 4, y: 6 } }).setOrigin(0.5).setDepth(40);
    const gr = t.context.createLinearGradient(0, 0, 0, t.height);                  // glossy: white on top, aqua below
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.48, '#e8fbff'); gr.addColorStop(0.52, '#9ff0ff'); gr.addColorStop(1, '#3fc8ea');
    t.setFill(gr);
    const plate = this.add.graphics().setDepth(39);                                // a glossy glass plate behind it
    const pw = t.width + 24, ph = 40;
    plate.fillStyle(0x0d3550, 0.55); plate.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 18);
    plate.fillStyle(0x3fc8ea, 0.35); plate.fillRoundedRect(-pw / 2 + 2, -ph / 2 + 2, pw - 4, ph - 4, 16);
    plate.fillStyle(0xffffff, 0.3); plate.fillRoundedRect(-pw / 2 + 6, -ph / 2 + 3, pw - 12, ph / 2 - 4, 12);
    plate.setPosition(VIEW_W / 2, 34);
    this.addUI(t, plate);
    this.aeroBanner = { t, plate, life: 170 };
  }
  renderAeroStage() {
    const A = this.aeroStage;
    A.k = Math.max(0, Math.min(1, A.k + (A.on ? 0.03 : -0.03))); A.t++;
    if (this.aeroBanner) {
      const B = this.aeroBanner, life = --B.life, pop = Math.min(1, (170 - life) / 10);
      const sc = 1.6 - 0.6 * pop, a = life < 20 ? life / 20 : 1;
      B.t.setScale(sc).setAlpha(a); B.plate.setScale(sc).setAlpha(a); B.t.y = B.plate.y = 34 + Math.sin(life * 0.08) * 2;
      if (life <= 0) { B.t.destroy(); B.plate.destroy(); this.aeroBanner = null; }
    }
    const g = this.aeroBg, w = this.aeroWorld; g.clear(); w.clear();
    const k = A.k;
    if (k <= 0) { if (this.clashText) for (const c of this.clashText) c.setAlpha(0); A.push = 0; return; }
    const t = A.t, W = VIEW_W, H = VIEW_H;
    if (this.stage.id === 'infected') { this.renderAeroClash(g, w, k, t); return; }
    // sky: a smooth aqua gradient, bright toward the horizon
    for (let i = 0; i < 36; i++) {
      const f = i / 35, c = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(0x1f8fe0), Phaser.Display.Color.ValueToColor(0xd8f8ff), 100, f * 100);
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), k); g.fillRect(0, (i * H) / 36, W, H / 36 + 1);
    }
    // the sun with a lens flare running across the sky
    g.fillStyle(0xffffff, 0.25 * k); g.fillCircle(W * 0.82, H * 0.14, 60); g.fillStyle(0xffffff, 0.45 * k); g.fillCircle(W * 0.82, H * 0.14, 34); g.fillStyle(0xffffff, 0.95 * k); g.fillCircle(W * 0.82, H * 0.14, 18);
    for (const [f, r, c] of [[0.3, 10, 0x9ff0ff], [0.5, 18, 0xd6ff9a], [0.65, 6, 0xffffff], [0.85, 26, 0x9ff0ff]]) { g.fillStyle(c, 0.18 * k); g.fillCircle(W * 0.82 - f * W * 0.6, H * 0.14 + f * H * 0.5, r); }
    // aurora ribbons
    for (let r = 0; r < 2; r++) for (let i = 0; i <= 64; i++) {
      const x = (i / 64) * W, y = H * (0.3 + r * 0.16) + Math.sin(i * 0.11 + t * 0.02 + r * 2.4) * 22;
      g.fillStyle(r ? 0x8be04a : 0x9ff0ff, 0.22 * k); g.fillRect(x, y, W / 64 + 1, 10 - r * 3);
      g.fillStyle(0xffffff, 0.35 * k); g.fillRect(x, y, W / 64 + 1, 1);
    }
    // glossy cumulus clouds drifting by
    for (let i = 0; i < 5; i++) {
      const cx = ((i * 157 + t * (0.15 + i * 0.04)) % (W + 160)) - 80, cy = 40 + (i * 53) % 120, s2 = 0.7 + (i % 3) * 0.25;
      g.fillStyle(0xffffff, 0.85 * k);
      for (const [px, py, rr] of [[-22, 4, 14], [0, -6, 20], [22, 2, 15], [8, 8, 14]]) g.fillCircle(cx + px * s2, cy + py * s2, rr * s2);
      g.fillStyle(0x9ad8ee, 0.4 * k); g.fillRect(cx - 30 * s2, cy + 12 * s2, 60 * s2, 3);
    }
    // rolling green hills along the bottom, with a white gloss line
    for (let x = 0; x <= W; x += 4) {
      const y1 = H * 0.8 + Math.sin(x * 0.012 + 1) * 18, y2 = H * 0.88 + Math.sin(x * 0.018 + 3) * 12;
      g.fillStyle(0x6fcf3a, k); g.fillRect(x, y1, 4, H - y1); g.fillStyle(0xd6ff9a, 0.8 * k); g.fillRect(x, y1, 4, 2);
      g.fillStyle(0x4aa82a, k); g.fillRect(x, y2, 4, H - y2);
    }
    // bubbles rising everywhere
    for (let i = 0; i < 22; i++) {
      const bx = ((i * 97) % 100) / 100 * W + Math.sin(t * 0.03 + i) * 10, by = H - ((t * (0.4 + (i % 4) * 0.2) + i * 50) % (H + 30)), r = 3 + (i % 4) * 2;
      g.lineStyle(1, 0xffffff, 0.7 * k); g.strokeCircle(bx, by, r); g.fillStyle(0xffffff, 0.8 * k); g.fillRect(bx - r * 0.5, by - r * 0.5, 2, 2);
    }
    // the platforms turn glossy: lime grass with a white gloss on solid ground, aqua glass on the ledges
    for (const p of this.stage.platforms) {
      const pw = p.x2 - p.x1;
      if (p.solid !== false) {
        w.fillStyle(0x8be04a, k); w.fillRect(p.x1, p.y, pw, 6);
        w.fillStyle(0xd6ff9a, k); w.fillRect(p.x1, p.y, pw, 2);
        w.fillStyle(0xffffff, 0.8 * k); w.fillRect(p.x1 + 6, p.y + 1, pw * 0.4, 1);
        w.fillStyle(0x4a9a1e, k); w.fillRect(p.x1, p.y + 6, pw, 1);
        w.fillStyle(0x9ff0ff, 0.3 * k); w.fillRect(p.x1, p.y + 7, pw, (p.bottom || 30) - 7);       // a glassy aqua sheen over the rock
        w.fillStyle(0xffffff, 0.25 * k); w.fillRect(p.x1 + 4, p.y + 9, 3, (p.bottom || 30) - 14);
      } else {
        w.fillStyle(0x3fc8ea, 0.45 * k); w.fillRoundedRect(p.x1, p.y - 1, pw, 7, 3);
        w.fillStyle(0xffffff, 0.8 * k); w.fillRect(p.x1 + 4, p.y, pw - 8, 1);
        w.fillStyle(0x9ff0ff, 0.9 * k); w.fillRect(p.x1 + 2, p.y + 4, pw - 4, 1);
      }
    }
    for (let i = 0; i < 3; i++) {                                                           // light sparkles on the world
      const p = this.stage.platforms[0], sx = p.x1 + ((i * 131 + t * 1.3) % (p.x2 - p.x1));
      w.fillStyle(0xffffff, 0.8 * k * Math.abs(Math.sin(t * 0.07 + i))); w.fillRect(sx, p.y - 1, 2, 2);
    }
  }

  // INFECTED.EXE + FULL AERO: the aero world doesn't simply replace the desktop, it pushes out of FULL AERO himself
  // as a glossy dome and fights the infection back. The dome breathes, the infection bites chunks out of its edge,
  // error windows dissolve into bubbles where it reaches them, and a tug-of-war bar shows who's winning.
  renderAeroClash(g, w, k, t) {
    const W = VIEW_W, H = VIEW_H, A = this.aeroStage, v = this.worldCam.worldView;
    const n = (a, b) => { let x = Math.imul(a * 374761393 + b * 668265263, 1274126177); x ^= x >>> 15; return ((x >>> 0) % 1000) / 1000; };
    // the dome follows the FULL AERO fighter around the screen (smoothly)
    const hero = this.fighters.find((f) => f.fullAero > 0 && f.alive);
    const hx = hero ? ((hero.x - v.x) / v.width) * W : W / 2, hy = hero ? ((hero.y - 30 - v.y) / v.height) * H : H / 2;
    A.cx = A.cx == null ? hx : A.cx + (hx - A.cx) * 0.06; A.cy = A.cy == null ? hy : A.cy + (hy - A.cy) * 0.06;
    // how much of the screen aero holds: grows while he's in the form, the infection keeps knocking it back
    A.push = Math.min(1, (A.push || 0) + 0.004);
    const R = (90 + 120 * A.push) * k + Math.sin(t * 0.05) * 12 + (n(t >> 4, 7) < 0.15 ? -26 : 0);
    const cx = A.cx, cy = Phaser.Math.Clamp(A.cy, 60, H - 60);
    // --- the infection: a corrupted, red-shifting desktop with scrolling scanlines and torn bands
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.09);
    g.fillStyle(0x0a4a4a, 0.92 * k); g.fillRect(0, 0, W, H);
    g.fillStyle(0x8a0000, (0.25 + 0.2 * pulse) * k); g.fillRect(0, 0, W, H);
    for (let y = (t * 2) % 6; y < H; y += 6) { g.fillStyle(0x000000, 0.25 * k); g.fillRect(0, y, W, 2); }
    for (let i = 0; i < 6; i++) {                                                         // torn bands that slide sideways
      const by = n(i, t >> 3) * H, bh = 3 + n(i, 9) * 10, off = (n(i, t >> 2) - 0.5) * 40;
      g.fillStyle(i % 2 ? 0xff2a2a : 0x2aa0a0, 0.35 * k); g.fillRect(off, by, W, bh);
    }
    // error windows drifting on the infected side
    const wins = [];
    for (let i = 0; i < 9; i++) {
      const ww = 54 + (i % 3) * 14, wh = 34 + (i % 2) * 10;
      const x = ((i * 113 + t * (0.2 + (i % 4) * 0.1)) % (W + ww)) - ww, y = 20 + ((i * 67) % (H - 70)) + Math.sin(t * 0.03 + i) * 6;
      wins.push([x, y, ww, wh, i]);
    }
    for (const [x, y, ww, wh, i] of wins) {
      const d = Math.hypot(x + ww / 2 - cx, y + wh / 2 - cy), eaten = Phaser.Math.Clamp((R + 30 - d) / 40, 0, 1);
      const a = k * (1 - eaten);
      if (a <= 0.02) continue;
      g.fillStyle(0x0a0a12, a); g.fillRect(x - 1, y - 1, ww + 2, wh + 2);
      g.fillStyle(0xc0c0c0, a); g.fillRect(x, y, ww, wh);
      g.fillStyle(i % 3 ? 0x0a2484 : 0x8a0000, a); g.fillRect(x + 2, y + 2, ww - 4, 7);
      g.fillStyle(0xffffff, a); g.fillRect(x + ww - 9, y + 3, 6, 5);
      g.fillStyle(0xff2a2a, a); g.fillRect(x + ww - 8, y + 4, 4, 3);
      g.fillStyle(0xffffff, a); g.fillRect(x + 3, y + 11, ww - 6, wh - 14);
      // the warning icon and some unreadable error text
      g.fillStyle(0xff2a2a, a); g.fillTriangle(x + 6, y + wh - 6, x + 16, y + wh - 6, x + 11, y + 14);
      g.fillStyle(0xffffff, a); g.fillRect(x + 10, y + 19, 2, 5);
      g.fillStyle(0x0a0a12, a); for (let l = 0; l < 3; l++) g.fillRect(x + 20, y + 15 + l * 5, (ww - 26) * (0.5 + n(i, l) * 0.5), 2);
      if (eaten > 0) for (let b = 0; b < 4; b++) {                                         // where the dome touches, pixels fizz into bubbles
        const bx = x + n(i, b + t) * ww, by = y + n(b, i + t) * wh;
        g.lineStyle(1, 0x9ff0ff, eaten * k); g.strokeCircle(bx, by, 2 + b);
      }
    }
    // static snow
    for (let i = 0; i < 160; i++) { g.fillStyle(n(i, t) < 0.5 ? 0xffffff : 0xff2a2a, 0.5 * k); g.fillRect(n(i, t + 1) * W, n(t, i + 3) * H, 2, 2); }
    // --- the aero dome, drawn row by row so its edge can be ragged where the infection bites it
    const edges = [];
    for (let y = 0; y < H; y += 3) {
      const dy = y - cy; if (Math.abs(dy) >= R) continue;
      const bite = (n(y >> 3, t >> 2) < 0.12 ? -14 : 0) + (n(y, t) - 0.5) * 6;
      const hw = Math.sqrt(R * R - dy * dy) + bite; if (hw <= 0) continue;
      const f = y / H, c = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(0x1f8fe0), Phaser.Display.Color.ValueToColor(0xd8f8ff), 100, f * 100);
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), k); g.fillRect(cx - hw, y, hw * 2, 3);
      edges.push([cx - hw, cx + hw, y]);
    }
    // the sun rising out of him, and aurora inside the dome
    g.fillStyle(0xffffff, 0.22 * k); g.fillCircle(cx, cy, R * 0.55); g.fillStyle(0xffffff, 0.35 * k); g.fillCircle(cx, cy, R * 0.3);
    for (let r = 0; r < 2; r++) for (let i = 0; i <= 48; i++) {
      const x = cx - R + (i / 48) * R * 2, y = cy - R * 0.35 + r * R * 0.3 + Math.sin(i * 0.25 + t * 0.03 + r * 2) * 10;
      if (Math.hypot(x - cx, y - cy) > R - 8) continue;
      g.fillStyle(r ? 0x8be04a : 0x9ff0ff, 0.3 * k); g.fillRect(x, y, (R * 2) / 48 + 1, 6);
      g.fillStyle(0xffffff, 0.4 * k); g.fillRect(x, y, (R * 2) / 48 + 1, 1);
    }
    // bubbles rise inside; any that cross the edge pop into red pixels
    for (let i = 0; i < 26; i++) {
      const ang = n(i, 3) * Math.PI * 2, life = (t * (0.6 + n(i, 5)) + i * 37) % 160, dist = (life / 160) * (R + 30);
      const bx = cx + Math.cos(ang) * dist, by = cy + Math.sin(ang) * dist - life * 0.2, rr = 2 + (i % 4);
      if (dist < R - 6) { g.lineStyle(1, 0xffffff, 0.8 * k); g.strokeCircle(bx, by, rr); g.fillStyle(0xffffff, 0.9 * k); g.fillRect(bx - rr * 0.5, by - rr * 0.5, 2, 2); }
      else { g.fillStyle(0xff2a2a, 0.8 * k); for (let q = 0; q < 4; q++) g.fillRect(bx + (n(i, q) - 0.5) * 10, by + (n(q, i) - 0.5) * 10, 2, 2); }
    }
    // the front line: a bright glossy rim with red glitch blocks gnawing at it from outside
    for (const [l, r, y] of edges) {
      for (const x of [l, r]) {
        g.fillStyle(0xffffff, 0.9 * k); g.fillRect(x - 1, y, 2, 3);
        g.fillStyle(0x9ff0ff, 0.6 * k); g.fillRect(x + (x === l ? 1 : -4), y, 3, 3);
        if (n(y, t + x) < 0.35) { const out = x === l ? -1 : 1; g.fillStyle(n(y, t) < 0.5 ? 0xff2a2a : 0xff00aa, 0.85 * k); g.fillRect(x + out * (2 + n(x, y + t) * 10), y, 2 + n(y, x) * 8, 3); }
      }
    }
    for (let i = 0; i < 10; i++) {                                                        // sparks flying where they meet
      const a = n(i, t >> 1) * Math.PI * 2, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
      g.fillStyle(i % 2 ? 0xffffff : 0xf3c358, k); g.fillRect(x - 1, y - 1, 3, 3); g.fillRect(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 2, 2);
    }
    // the tug of war: AERO.SYS vs INFECTED.EXE
    const share = Phaser.Math.Clamp((Math.PI * R * R) / (W * H), 0.05, 0.95), bw = 220, bx0 = (W - bw) / 2, by0 = H - 22;
    g.fillStyle(0x0a0a12, k); g.fillRect(bx0 - 2, by0 - 2, bw + 4, 11);
    g.fillStyle(0x8a0000, k); g.fillRect(bx0, by0, bw, 7);
    g.fillStyle(0x3fc8ea, k); g.fillRect(bx0, by0, bw * share, 7);
    g.fillStyle(0xffffff, 0.6 * k); g.fillRect(bx0, by0, bw * share, 2);
    for (let i = 0; i < 8; i++) { g.fillStyle(0xff2a2a, 0.9 * k); g.fillRect(bx0 + bw * share + n(i, t) * 8, by0 + n(t, i) * 6, 2, 2); }
    this.clashLabel(k, bx0, by0, bw);
    // the platforms: glossy aero glass, with red corruption crawling along them
    for (const p of this.stage.platforms) {
      const pw = p.x2 - p.x1;
      if (p.solid !== false) {
        w.fillStyle(0x8be04a, k); w.fillRect(p.x1, p.y, pw, 6); w.fillStyle(0xd6ff9a, k); w.fillRect(p.x1, p.y, pw, 2);
        w.fillStyle(0x9ff0ff, 0.3 * k); w.fillRect(p.x1, p.y + 7, pw, (p.bottom || 30) - 7);
      } else { w.fillStyle(0x3fc8ea, 0.45 * k); w.fillRoundedRect(p.x1, p.y - 1, pw, 7, 3); w.fillStyle(0xffffff, 0.8 * k); w.fillRect(p.x1 + 4, p.y, pw - 8, 1); }
      for (let i = 0; i < Math.ceil(pw / 30); i++) {
        const gx = p.x1 + ((i * 47 + t * (i % 2 ? 0.7 : -0.5)) % pw + pw) % pw;
        w.fillStyle(i % 3 ? 0xff2a2a : 0xff00aa, 0.8 * k); w.fillRect(gx, p.y + (i % 3), 3 + (i % 4) * 2, 2);
      }
    }
  }
  clashLabel(k, x, y, bw) {
    if (!this.clashText) {
      const st = { fontFamily: FONT, fontSize: '6px', stroke: '#0b0a14', strokeThickness: 3 };
      this.clashText = [this.add.text(0, 0, 'AERO.SYS', { ...st, color: '#9ff0ff' }).setOrigin(0, 1), this.add.text(0, 0, 'INFECTED.EXE', { ...st, color: '#ff4a4a' }).setOrigin(1, 1)];
      this.addBg(...this.clashText); for (const c of this.clashText) c.setScrollFactor(0).setDepth(51);
    }
    const [a, b] = this.clashText;
    a.setPosition(x, y - 3).setAlpha(k); b.setPosition(x + bw, y - 3).setAlpha(k);
  }

  popText(f, text, color) {
    const t = this.add.text(f.x, f.y - 70, text, { fontFamily: FONT, fontSize: '8px', color, stroke: '#0b0a14', strokeThickness: 4 }).setOrigin(0.5);
    this.addWorld(t);
    this.pops.push({ t, life: 70 });
  }
  shake(amount, frames) { this.shakeAmt = Math.max(this.shakeAmt, amount); this.shakeTime = Math.max(this.shakeTime, frames); }

  stepEffects() {
    for (const p of this.particles) {
      p.x += p.vx + (p.sway ? Math.sin((p.life + p.sway) * 0.2) * 0.3 : 0); p.y += p.vy; p.vy += p.grav ?? 0.08; p.life--;
      if (p.drag) { p.vx *= p.drag; p.vy *= p.drag; }
    }
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
    this.renderAeroStage();
    this.extras.draw();
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
      if (L.type) continue;                           // Limits with their own type (blade, undertow) are drawn by the fighter
      if (f.t < L.beamStart - 6 || f.t > L.beamEnd + 6) continue;
      const b = this.beamBox(f);
      if (f.t < L.beamStart) {                       // charging glow in the hand
        const r = 4 + (f.t - L.beamStart + 6) * 2;
        g.fillStyle(f.pal.light, 0.9); g.fillRect(b.hx - r, b.hy - r, r * 2, r * 2);
        g.fillStyle(f.pal.core, 1); g.fillRect(b.hx - r / 2, b.hy - r / 2, r, r);
        continue;
      }
      const grow = Math.min(1, (f.t - L.beamStart + 1) / 6);
      const fade = f.t > L.beamEnd ? 1 - (f.t - L.beamEnd) / 6 : 1;
      const len = L.beamLength * grow, dir = f.facing;
      const flick = (this.frame >> 1) % 2;
      const glitch = f.style === 'onebit';              // 1-BIT: a possessed, glitching beam
      const band = (half, color, alpha) => {
        const x = dir > 0 ? b.hx : b.hx - len;
        if (glitch && (this.frame >> 2) % 7 === 0) color = color === C.core ? C.deep : color === C.deep ? C.core : color;   // inverts for a beat
        if (!glitch) { g.fillStyle(color, alpha * fade); g.fillRect(x, b.hy - half, len, half * 2); return; }
        for (let yy = -half; yy < half; yy += 4) {   // torn into scanlines that jitter sideways
          const off = ((Math.sin((yy + this.frame * 13) * 12.9898) * 43758.5453) % 1) * 10 * ((this.frame >> 1) % 3 === 0 ? 1 : 0.2);
          g.fillStyle(color, alpha * fade); g.fillRect(x + off, b.hy + yy, len, Math.min(4, half - yy));
        }
      };
      const H = L.beamHalf, C = f.pal;                 // the beam takes the costume's colours
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
    for (const p of this.particles) this.drawParticle(g, p);
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
    if (this.extras) this.extras.cleanup();              // (MOON GRAVITY puts gravity back)
    if (this.demo) { setSfxMuted(false); return; }    // the title screen keeps its music playing
    this.sound.stopAll(); stopMusic();
  }
}

// Training mode: endless match against dummies, with a combo counter, last-hit readout, hitbox view,
// slow motion and quick resets. Hotkeys 1-6 (or click the buttons), Select on a controller resets.
import { VIEW_W, FONT, LIMIT_MAX } from '../config.js';
import { settings } from '../settings.js';
import { CpuController } from '../ai/cpu.js';
import { readPad } from '../input/controllers.js';
import { makeButton } from '../ui/button.js';
import { sfx } from '../audio/sfx.js';

export const DUMMY_MODES = ['stand', 'shield', 'jump', 'walk', 'fight'];
export const DUMMY_NAMES = { stand: 'STAND STILL', shield: 'SHIELD', jump: 'JUMP', walk: 'WALK', fight: 'FIGHT BACK' };
const DUMMY_DAMAGE = [0, 50, 100, 150];
const SPEEDS = [1, 0.5, 0.25];
const MOVE_NAMES = {
  jab: 'JAB', ftilt: 'FORWARD TILT', utilt: 'UP TILT', dtilt: 'DOWN TILT', fsmash: 'FORWARD SMASH', usmash: 'UP SMASH', dsmash: 'DOWN SMASH',
  nair: 'NEUTRAL AIR', fair: 'FORWARD AIR', bair: 'BACK AIR', uair: 'UP AIR', dair: 'DOWN AIR', grab: 'GRAB',
  neutralB: 'NEUTRAL SPECIAL', sideB: 'SIDE SPECIAL', downB: 'DOWN SPECIAL',
};

// A CPU that follows the dummy setting. It always tries to get back to the stage so practice keeps going.
export class DummyController extends CpuController {
  poll() {
    const mode = this.match.training ? this.match.training.dummy : 'fight';
    if (mode === 'fight') return super.poll();
    for (const b in this.cur) this.cur[b] = false;
    this.x = 0; this.y = 0;
    const me = this.fighter;
    if (!me || !me.alive || this.match.frozen) return;
    if (me.state === 'respawn' || me.possessed > 0) return;   // a hexed practice dummy doesn't struggle
    if (me.state === 'ledge') { if (me.t > 30) this.x = -me.ledge.side; return; }   // climbs back up from a ledge
    const P = this.match.stage.platforms[0];
    if (!me.grounded && (me.x < P.x1 - 4 || me.x > P.x2 + 4 || me.y > P.y + 4)) return this.recover(me, P);
    if (mode === 'shield') this.cur.shield = me.grounded && (me.state === 'shield' ? me.shieldHp > 12 : me.shieldHp > 40);
    else if (mode === 'jump') { if (me.grounded && me.age % 45 === 0) this.tap('jump'); }
    else if (mode === 'walk') {
      if (!this.walkDir) this.walkDir = 1;
      if (me.x > P.x2 - 40) this.walkDir = -1;
      if (me.x < P.x1 + 40) this.walkDir = 1;
      this.x = this.walkDir;
    }
  }
}

export class Training {
  constructor(match) {
    this.match = match;
    this.dummy = settings.dummy || 'stand';
    this.showHitboxes = false; this.dmgIdx = 0; this.speedIdx = 0;
    this.combo = null; this.comboShow = 0; this.last = null;
    const s = match;

    // buttons (also the hotkey list)
    const opt = { size: '6px', depth: 26, bg: '#1b1640', hover: '#3a2f8a', pad: { x: 7, y: 3 } };
    this.btns = [
      makeButton(s, 8, 22, '', () => this.reset(), opt),
      makeButton(s, 8, 38, '', () => this.fillLimit(), opt),
      makeButton(s, 8, 54, '', () => this.cycleDummy(), opt),
      makeButton(s, 8, 70, '', () => this.toggleHitboxes(), opt),
      makeButton(s, 8, 86, '', () => this.cycleDamage(), opt),
      makeButton(s, 8, 102, '', () => this.cycleSpeed(), opt),
    ];
    this.comboText = s.add.text(VIEW_W / 2, 30, '', { fontFamily: FONT, fontSize: '12px', color: '#f3c358', stroke: '#0b0a14', strokeThickness: 4 }).setOrigin(0.5).setDepth(26);
    this.lastText = s.add.text(VIEW_W / 2, 48, '', { fontFamily: FONT, fontSize: '7px', color: '#ffffff', stroke: '#0b0a14', strokeThickness: 4 }).setOrigin(0.5).setDepth(26);
    s.addUI(...this.btns, this.comboText, this.lastText);
    this.labels();

    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = s.input.keyboard.addKeys({ two: K.TWO, three: K.THREE, four: K.FOUR, five: K.FIVE, six: K.SIX, seven: K.SEVEN }, false);   // 1 is the taunt
    this.selectHeld = {};
  }

  labels() {
    const txt = [
      '2  RESET POSITIONS',
      '3  FILL LIMIT GAUGE',
      '4  DUMMY: ' + DUMMY_NAMES[this.dummy],
      '5  HITBOXES: ' + (this.showHitboxes ? 'ON' : 'OFF'),
      '6  DUMMY DAMAGE: ' + DUMMY_DAMAGE[this.dmgIdx] + '%',
      '7  SPEED: ' + (SPEEDS[this.speedIdx] === 1 ? 'NORMAL' : SPEEDS[this.speedIdx] === 0.5 ? 'HALF' : 'QUARTER'),
    ];
    this.btns.forEach((b, i) => b.setText(txt[i]));
  }
  get speed() { return SPEEDS[this.speedIdx]; }
  humans() { return this.match.fighters.filter((f) => !f.isCpu); }
  dummies() { return this.match.fighters.filter((f) => f.isCpu); }

  // ---- actions
  reset() {
    const m = this.match;
    for (const p of m.projectiles) (p.remove ? p.remove() : p.kill());   // clear thrown swords and orbs outright
    for (const s of m.souls) s.kill(false);
    for (const p of m.pools) p.kill();
    m.fighters.forEach((f, i) => {
      if (!f.alive) f.respawn();
      const sp = m.stage.spawns[i];
      f.placeAt(sp.x, sp.y - 1); f.facing = sp.x < 0 ? 1 : -1;
      f.percent = f.isCpu ? DUMMY_DAMAGE[this.dmgIdx] : 0; f.hp = f.maxHp;
      f.curse = 0; f.slow = 0; f.invincible = 0; f.stopChargeSound();
    });
    this.combo = null; this.comboShow = 0;
    sfx('select', 0.6);
  }
  fillLimit() { for (const f of this.humans()) f.limit = LIMIT_MAX; sfx('limitready', 0.6); }
  cycleDummy() { this.dummy = DUMMY_MODES[(DUMMY_MODES.indexOf(this.dummy) + 1) % DUMMY_MODES.length]; settings.dummy = this.dummy; this.labels(); sfx('menu', 0.6); }
  toggleHitboxes() { this.showHitboxes = !this.showHitboxes; this.labels(); sfx('menu', 0.6); }
  cycleDamage() {
    this.dmgIdx = (this.dmgIdx + 1) % DUMMY_DAMAGE.length;
    for (const f of this.dummies()) f.percent = DUMMY_DAMAGE[this.dmgIdx];
    this.labels(); sfx('menu', 0.6);
  }
  cycleSpeed() { this.speedIdx = (this.speedIdx + 1) % SPEEDS.length; this.labels(); sfx('menu', 0.6); }

  // ---- per frame (real time, so hotkeys work in slow motion too)
  input() {
    const JD = Phaser.Input.Keyboard.JustDown, k = this.keys;
    if (JD(k.two)) this.reset();
    if (JD(k.three)) this.fillLimit();
    if (JD(k.four)) this.cycleDummy();
    if (JD(k.five)) this.toggleHitboxes();
    if (JD(k.six)) this.cycleDamage();
    if (JD(k.seven)) this.cycleSpeed();
    // Select / Back on any player's controller resets
    for (const i of [settings.p1Pad, ...settings.extraPads]) {
      if (i === null) continue;
      const pad = readPad(i), down = !!(pad && pad.buttons[8] && pad.buttons[8].pressed);
      if (down && !this.selectHeld[i]) this.reset();
      this.selectHeld[i] = down;
    }
  }

  // called by the match for every hit that lands
  onHit(t, hb, dmg, comboing) {
    const owner = hb.owner;
    let name = 'HAZARD';
    if (owner) {
      if (hb.projectile) name = owner.def.moves.fireball ? 'FIREBALL' : hb.projectile.kind || 'ENERGY BOLT';
      else if (hb.soul) name = 'SOUL';
      else if (hb.pillar) name = 'LIMIT: ' + owner.def.limit.name;
      else if (owner.state === 'upb') name = 'UP SPECIAL';
      else if (owner.state === 'ledgeattack') name = 'LEDGE ATTACK';
      else if (owner.state === 'counterstrike') name = 'COUNTER';
      else if (owner.state === 'holding' || owner.moveName === 'grab') name = 'THROW';
      else name = MOVE_NAMES[owner.moveName] || (owner.moveName || '').toUpperCase();
    }
    this.last = { name, dmg };
    if (comboing && this.combo && this.combo.target === t) { this.combo.hits++; this.combo.dmg += dmg; }
    else this.combo = { target: t, hits: 1, dmg };
    this.comboShow = 150;
  }

  step() {
    if (this.combo && this.combo.target.state !== 'hitstun' && this.combo.target.state !== 'grabbed' && this.comboShow > 60) this.comboShow = 60;
    if (this.comboShow > 0) this.comboShow--;
  }

  draw(g) {
    const c = this.combo;
    this.comboText.setText(c && c.hits >= 2 && this.comboShow > 0 ? c.hits + ' HIT COMBO  ' + c.dmg + '%' : '');
    this.comboText.setAlpha(Math.min(1, this.comboShow / 30));
    this.lastText.setText(this.last ? 'LAST HIT: ' + this.last.name + '  ' + this.last.dmg + '%' : 'HIT THE DUMMY TO SEE DAMAGE');
    if (!this.showHitboxes) return;
    const m = this.match;
    // hurtboxes in yellow, active hitboxes in red, projectiles in orange
    for (const f of m.fighters) {
      if (!f.alive) continue;
      const h = f.hurtbox();
      g.lineStyle(1, f.isIntangible() ? 0x5ee07a : 0xffd34f, 1); g.strokeRect(h.x1, h.y1, h.x2 - h.x1, h.y2 - h.y1);
      for (const hb of f.activeHitboxes()) { g.fillStyle(0xff3030, 0.45); g.fillRect(hb.x1, hb.y1, hb.x2 - hb.x1, hb.y2 - hb.y1); g.lineStyle(1, 0xff3030, 1); g.strokeRect(hb.x1, hb.y1, hb.x2 - hb.x1, hb.y2 - hb.y1); }
    }
    for (const p of m.projectiles) { if (!p.alive) continue; const hb = p.hitbox(); if (!hb) continue; g.lineStyle(1, 0xff9a30, 1); g.strokeRect(hb.x1, hb.y1, hb.x2 - hb.x1, hb.y2 - hb.y1); }
    for (const s of m.souls) { const hb = s.hitbox(); if (hb) { g.lineStyle(1, 0xff9a30, 1); g.strokeRect(hb.x1, hb.y1, hb.x2 - hb.x1, hb.y2 - hb.y1); } }
    for (const lh of m.limitHits) { const hb = lh.hb; g.fillStyle(0xff3030, 0.3); g.fillRect(hb.x1, hb.y1, hb.x2 - hb.x1, hb.y2 - hb.y1); }
  }
}

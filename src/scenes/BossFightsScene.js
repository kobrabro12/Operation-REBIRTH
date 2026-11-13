// Trinkets > BOSS FIGHTS: pick a boss (six, each harder than the last - each opens once the one before it is
// beaten), a difficulty (NORMAL / HARD / NIGHTMARE: the harder, the bigger the rewards), then your fighter and
// costume, and fight it in its own arena (MatchScene with data.boss). The bosses, rewards and saves are in
// src/data/bosses.js; the reward / defeat screen is BossRewardScene.
// Keys: A/D (or left/right) boss, W/S difficulty, J / Enter / pad A choose; on the fighter step A/D fighter, W/S
// costume, J start; K / Esc / pad B back. Mouse: click a card, a difficulty, the buttons.
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { playMusic } from '../audio/music.js';
import { MenuInput } from './menuInput.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { ArcadeBg, titleBanner, hintBar, ARC, panel, slant, hex } from '../ui/arcade.js';
import { BOSSES, TIERS, bossOpen, bossWins, bossBest, arenaOpen, clock, FIRST_BONUS } from '../data/bosses.js';
import { TROPHY_GOALS, trophyEarned } from '../achievements.js';
import { stageById } from '../stage/stages.js';
import { ROSTER, showFighter } from '../fighters/roster.js';
import { skinsFor, skinUnlocked, skinInfo } from '../fighters/skins.js';
import { settings } from '../settings.js';

const ACC = 0xff5a3a;                                            // the section colour: boss red
// the six boss cards: where they are and how big; the arena picture inside each
const CARD = { x: 18, y: 52, w: 96, h: 150, gap: 6, pic: { x: 6, y: 22, w: 84, h: 70 } };
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
// remembered between visits (this session): the last boss, difficulty, fighter and costume
const last = { boss: 0, tier: 0, fighter: null, skin: 0 };

/** Trinkets > BOSS FIGHTS: pick the boss, difficulty and fighter (see the top of the file). */
export class BossFightsScene extends Phaser.Scene {
  constructor() { super('BossFights'); }

/** Builds the cards, panels, texts, the fighter preview and the buttons. */
  create() {
    this.t = 0; this.menu = new MenuInput(this); this.step = 'boss';
    this.sel = last.boss; this.tier = last.tier;
    this.fighters = ROSTER.filter((f) => f.available);
    this.fi = Math.max(0, this.fighters.findIndex((f) => f.id === (last.fighter || settings.picks[0])));
    this.skin = last.skin;
    playMusic(this, 'bgm_title');
    this.bgFx = new ArcadeBg(this, ACC);
    titleBanner(this, 'BOSS FIGHTS', ACC, { crumb: 'TRINKETS  >  BOSS FIGHTS' });
    this.g = this.add.graphics();
    this.pics = this.add.graphics();
    this.txt = {};
    const T = (k, x, y, s, size = 7, color = '#ffffff', o = {}) => (this.txt[k] = this.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', color, stroke: '#07060e', strokeThickness: 3, lineSpacing: 4, ...o }));
    BOSSES.forEach((B, i) => {
      const x = CARD.x + i * (CARD.w + CARD.gap), y = CARD.y;
      T('n' + i, x + 8, y + 6, ROMAN[i], 9, hex(B.color));
      T('name' + i, x + 8, y + 98, B.short, B.short.length > 10 ? 6 : 7, '#ffffff', { wordWrap: { width: CARD.w - 12 } });
      T('arena' + i, x + 8, y + 112, B.arena, 5, '#c9c4dc', { wordWrap: { width: CARD.w - 12 } });
      T('lock' + i, x + CARD.w / 2, y + 56, '', 6, '#ffffff', { align: 'center', wordWrap: { width: CARD.w - 8 } }).setOrigin(0.5);
    });
    T('blurb', 30, 214, '', 6, '#e8e4ff');
    T('haz', 30, 262, '', 6, '#ffb070');
    T('reward', 330, 248, '', 6, '#ffe08a');
    T('best', 330, 290, '', 6, '#c9c4dc');
    for (let k = 0; k < 3; k++) T('tier' + k, 336 + k * 96, 216, TIERS[k].name, 7, '#ffffff');
    // the fighter step
    this.sprite = this.add.sprite(VIEW_W / 2, 250, 'ss_idle', 0).setScale(2.4).setVisible(false);
    T('fname', VIEW_W / 2, 270, '', 10, '#ffffff', { align: 'center' }).setOrigin(0.5, 0);
    T('fskin', VIEW_W / 2, 288, '', 6, '#c9c4dc', { align: 'center' }).setOrigin(0.5, 0);
    T('fhead', VIEW_W / 2, 64, '', 9, '#ffffff', { align: 'center' }).setOrigin(0.5, 0);
    this.go = makeButton(this, VIEW_W - 30, 302, 'FIGHT!', () => this.choose(), { originX: 1, size: '9px', bg: '#8a1a14', hover: '#d8342a' });
    makeButton(this, 8, 6, '< BACK', () => this.back());
    addFullscreenButton(this, VIEW_W - 8, 6);
    this.input.on('pointerdown', (p, over) => { if (!over.length) this.click(p.x, p.y); });
    this.refresh();
  }

  /** Rebuilds the hint bar for the step you're on. */
  setHint() {
    if (this.hintStep === this.step) return;
    if (this.hint) { this.hint.g.destroy(); this.hint.texts.forEach((x) => x.destroy()); }
    this.hint = hintBar(this, this.hintText(), ACC); this.hintStep = this.step;
  }
  /** The hint bar's text for the step you're on. */
  hintText() { return this.step === 'boss' ? 'A/D BOSS   W/S DIFFICULTY   J / ENTER / A  CHOOSE   K / ESC / B  BACK' : 'A/D FIGHTER   W/S COSTUME   J / ENTER / A  FIGHT!   K / ESC / B  BACK'; }

  /** Clicks: a boss card, a difficulty chip; on the fighter step the arrows either side of the fighter. */
  click(x, y) {
    if (this.step === 'boss') {
      for (let i = 0; i < BOSSES.length; i++) { const cx = CARD.x + i * (CARD.w + CARD.gap); if (x > cx && x < cx + CARD.w && y > CARD.y && y < CARD.y + CARD.h) { if (this.sel === i) this.choose(); else { this.sel = i; sfx('menu', 0.5); this.refresh(); } return; } }
      for (let k = 0; k < 3; k++) if (x > 326 + k * 96 && x < 416 + k * 96 && y > 210 && y < 230) { this.tier = k; sfx('menu', 0.5); this.refresh(); return; }
    } else {
      if (y > 180 && y < 300) { if (x < VIEW_W / 2 - 40) this.cycleFighter(-1); else if (x > VIEW_W / 2 + 40) this.cycleFighter(1); }
    }
  }

  /** The costumes of a fighter you can wear (milestone / shop ones once unlocked). */
  skins(id) { return skinsFor(id).map((_, i) => i).filter((i) => skinUnlocked(id, i)); }
  /** Next / previous fighter (back to their first costume). */
  cycleFighter(d) { this.fi = (this.fi + d + this.fighters.length) % this.fighters.length; this.skin = 0; sfx('menu', 0.5); this.refresh(); }
  /** Next / previous costume of the fighter. */
  cycleSkin(d) { const list = this.skins(this.fighters[this.fi].id), i = list.indexOf(this.skin); this.skin = list[(Math.max(0, i) + d + list.length) % list.length]; sfx('menu', 0.4); this.refresh(); }

  /** J / Enter / click: on a locked boss, a buzz; else go on to the fighter step, or start the fight. */
  choose() {
    if (this.step === 'boss') {
      if (!bossOpen(this.sel)) { sfx('curse', 0.4, 1.4); return; }
      this.step = 'fighter'; sfx('go', 0.6); this.refresh(); return;
    }
    const B = BOSSES[this.sel], T = TIERS[this.tier], f = this.fighters[this.fi];
    Object.assign(last, { boss: this.sel, tier: this.tier, fighter: f.id, skin: this.skin });
    const setup = { mode: 'stock', stocks: T.stocks, hp: 150, minutes: 3, items: false, hazards: true, crt: settings.crt, stage: B.stage, track: 'auto', picks: [f.id], skins: [this.skin],
      cpuCount: 0, difficulty: 1, cpuLevels: [], p1Pad: settings.p1Pad, extraPads: [], from: 'BossFights' };
    sfx('go', 1); this.scene.start('Match', { boss: { id: B.id, tier: this.tier, setup } });
  }
  /** K / Esc: back a step, or out to Trinkets. */
  back() { sfx('menu', 0.6); if (this.step === 'fighter') { this.step = 'boss'; this.refresh(); } else this.scene.start('Trinkets'); }

  /** Updates every text for what's picked (and the step), and redraws the panels. */
  refresh() {
    const B = BOSSES[this.sel], T = TIERS[this.tier], open = bossOpen(this.sel), boss = this.step === 'boss';
    this.setHint();
    for (const [k, o] of Object.entries(this.txt)) o.setVisible(boss ? !k.startsWith('f') : k.startsWith('f'));
    this.sprite.setVisible(!boss); this.go.setVisible(!boss);
    if (boss) {
      BOSSES.forEach((b, i) => { const o = bossOpen(i); this.txt['name' + i].setText(o ? b.short : '???'); this.txt['arena' + i].setText(o ? b.arena : 'LOCKED'); this.txt['lock' + i].setText(o ? '' : 'BEAT ' + BOSSES[i - 1].short + '\nTO OPEN'); });
      this.txt.blurb.setText(open ? B.name + '\n' + B.blurb : 'LOCKED.\nBEAT ' + BOSSES[this.sel - 1].name + '\nON ANY DIFFICULTY TO FACE WHAT COMES NEXT.');
      this.txt.haz.setText(open ? 'ARENA: ' + B.arena + '\nHAZARDS: ' + B.hazards : '');
      const coins = Math.round(B.coins * T.coins), first = !bossWins(B.id, this.tier), tg = TROPHY_GOALS.find((q) => q.id === B.trophy);
      const extra = this.tier === 2 ? '+ TROPHY: ' + (tg ? tg.name : '') + (trophyEarned(B.trophy) ? ' (EARNED)' : '') : this.tier === 1 ? '+ ARENA FOR VS' + (arenaOpen(B.id) ? ' (OPEN)' : '') : '';
      this.txt.reward.setText(open ? 'REWARD: ' + coins + ' COINS' + (first ? '  + ' + Math.round(B.coins * T.coins * FIRST_BONUS) + ' FIRST WIN' : '  (REPEAT: 40%)') + '\n' + extra + '\nYOUR LIVES: ' + T.stocks + '   BOSS: ' + Math.round(B.hp * T.hp) + ' HP' : '');
      const best = bossBest(B.id, this.tier);
      this.txt.best.setText(open ? 'WINS: ' + bossWins(B.id, this.tier) + (best ? '    BEST TIME: ' + clock(best) : '') : '');
      for (let k = 0; k < 3; k++) this.txt['tier' + k].setColor(k === this.tier ? '#ffffff' : '#8a87a3');
    } else {
      const f = this.fighters[this.fi];
      if (!this.skins(f.id).includes(this.skin)) this.skin = 0;
      this.txt.fhead.setText('WHO FACES ' + B.name + '?\n' + T.name).setColor('#ffffff');
      this.txt.fname.setText('<  ' + f.def.name + '  >');
      this.txt.fskin.setText('COSTUME: ' + skinInfo(f.id, this.skin).name + '   (W/S)');
    }
    this.draw();
  }

  /** The panels: four boss cards (arena picture, clear pips per difficulty), the details, the difficulty chips. */
  draw() {
    const g = this.g, p = this.pics; g.clear(); p.clear();
    if (this.step === 'boss') {
      BOSSES.forEach((B, i) => {
        const x = CARD.x + i * (CARD.w + CARD.gap), y = CARD.y, on = i === this.sel, o = bossOpen(i);
        panel(g, x, y, CARD.w, CARD.h, o ? B.color : 0x55506a, { lit: on });
        const st = stageById(B.stage), P = CARD.pic;
        if (st && st.preview) st.preview(p, x + P.x, y + P.y, P.w, P.h);
        if (!o) { p.fillStyle(0x07060e, 0.82); p.fillRect(x + P.x, y + P.y, P.w, P.h); }
        p.lineStyle(2, on ? 0xffffff : 0x2c2650, 1); p.strokeRect(x + P.x, y + P.y, P.w, P.h); p.lineStyle(0);
        for (let k = 0; k < 3; k++) { const w = bossWins(B.id, k) > 0; slant(p, x + 8 + k * 27, y + 132, 23, 8, w ? TIERS[k].color : 0x2a2436, 1, 4); }
        if (on) { const c = x + CARD.w / 2 + Math.sin(this.t * 0.2) * 2; p.fillStyle(0xffffff, 1); p.fillTriangle(c - 6, y - 8, c + 6, y - 8, c, y - 2); }
      });
      panel(g, 18, 208, 300, 116, BOSSES[this.sel].color);
      panel(g, 322, 208, 300, 116, TIERS[this.tier].color);
      for (let k = 0; k < 3; k++) slant(p, 326 + k * 96, 212, 90, 16, k === this.tier ? TIERS[k].color : 0x2a2436, 1, 6);
    } else {
      panel(g, 120, 56, 400, 254, TIERS[this.tier].color);
      const c = VIEW_W / 2;
      p.fillStyle(BOSSES[this.sel].color, 0.15); p.fillCircle(c, 214, 70);
      p.fillStyle(0xffffff, 1);
      const bob = Math.sin(this.t * 0.2) * 3;
      p.fillTriangle(c - 120 + bob, 214, c - 108 + bob, 204, c - 108 + bob, 224); p.fillTriangle(c + 120 - bob, 214, c + 108 - bob, 204, c + 108 - bob, 224);
    }
  }

/** Reads the keys / pad for the step you're on, animates the preview and the backdrop. */
  update() {
    this.t++;
    const m = this.menu.poll(), A = m.pads.some((q) => q.button === 'a'), Bk = m.pads.some((q) => q.button === 'b');
    if (this.step === 'boss') {
      if (m.left) { this.sel = (this.sel + BOSSES.length - 1) % BOSSES.length; sfx('menu', 0.5); this.refresh(); }
      if (m.right) { this.sel = (this.sel + 1) % BOSSES.length; sfx('menu', 0.5); this.refresh(); }
      if (m.up) { this.tier = (this.tier + 2) % 3; sfx('menu', 0.5); this.refresh(); }
      if (m.down) { this.tier = (this.tier + 1) % 3; sfx('menu', 0.5); this.refresh(); }
    } else {
      if (m.left) this.cycleFighter(-1);
      if (m.right) this.cycleFighter(1);
      if (m.up) this.cycleSkin(-1);
      if (m.down) this.cycleSkin(1);
      const f = this.fighters[this.fi];
      showFighter(this.sprite, f.def, Math.floor(this.t / 6), this.skin);
      this.sprite.setPosition(VIEW_W / 2, 252).setScale(f.def.menuScale || 2.4);
    }
    if (m.ok || A) this.choose();
    else if (m.back || Bk) this.back();
    if (this.t % 4 === 0 || this.step === 'fighter') this.draw();
    this.bgFx.update(this.t);
  }
}

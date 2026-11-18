// CLASSIC MODE (main menu > CLASSIC; the rules and data are in src/data/classic.js):
//   PICK      - your fighter (A/D), costume (W/S) and difficulty (Q/E or 1-3); J starts a run, T opens the TROPHIES.
//   ROUTE     - the ladder of seven fights (six custom fights, then a random boss - hidden until you get there): the
//               next one lit, cleared ones ticked; its name, twist, stage and who you'll face. J fights it, K gives up.
//   CONTINUE? - after a lost fight: J tries it again (a clear with continues pays less), K gives up the run.
//   TROPHIES  - every fighter's CLASSIC TROPHY: a gold statue on a pedestal once earned, a shadow before.
// MatchScene comes back here with { classic: { won } } after every fight; a won boss fight starts ClassicEndingScene.
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { playMusic } from '../audio/music.js';
import { MenuInput } from './menuInput.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { ArcadeBg, titleBanner, hintBar, panel, slant, hex } from '../ui/arcade.js';
import { ROSTER, showFighter, fighterById } from '../fighters/roster.js';
import { skinsFor, skinUnlocked, skinInfo } from '../fighters/skins.js';
import { stageById } from '../stage/stages.js';
import { bossById } from '../data/bosses.js';
import { settings } from '../settings.js';
import { CLASSIC_TIERS, ROUNDS, CLASSIC_TROPHIES, run, startRun, endRun, roundSetup, classicClears, hasClassicTrophy, recordClear, goldStatue } from '../data/classic.js';

const ACC = 0xf0b030;                                            // the section colour: classic gold
// the route's cards: where the first is, size, gap
const CARD = { x: 18, y: 58, w: 80, h: 112, gap: 6 };
// remembered between visits (this session): the last fighter, costume and difficulty
const last = { fi: 0, skin: 0, tier: 0 };

/** CLASSIC MODE's menus (see the top of the file). */
export class ClassicScene extends Phaser.Scene {
  constructor() { super('Classic'); }

  /** Builds the backdrop, texts and sprites, then reads what MatchScene sent back (a won or lost fight). */
  create(data = {}) {
    this.t = 0; this.menu = new MenuInput(this); this.flash = 0;
    this.fighters = ROSTER.filter((f) => f.available);
    this.fi = last.fi % this.fighters.length; this.skin = last.skin; this.tier = last.tier; this.tsel = 0;
    playMusic(this, 'bgm_title');
    this.bgFx = new ArcadeBg(this, ACC);
    titleBanner(this, 'CLASSIC', ACC, { crumb: 'MAIN MENU  >  CLASSIC' });
    this.g = this.add.graphics(); this.pics = this.add.graphics();
    this.txt = {};
    const T = (k, x, y, s = '', size = 7, color = '#ffffff', o = {}) => (this.txt[k] = this.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', color, stroke: '#07060e', strokeThickness: 3, lineSpacing: 4, ...o }));
    T('head', VIEW_W / 2, 56, '', 9, '#ffffff', { align: 'center' }).setOrigin(0.5, 0);
    T('fname', VIEW_W / 2, 220, '', 10, '#ffffff', { align: 'center' }).setOrigin(0.5, 0);
    T('fskin', VIEW_W / 2, 238, '', 7, '#ffe08a', { align: 'center' }).setOrigin(0.5, 0);
    T('tier', VIEW_W / 2, 258, '', 8, '#ffffff', { align: 'center' }).setOrigin(0.5, 0);
    T('info', VIEW_W / 2, 280, '', 6, '#c9c4dc', { align: 'center' }).setOrigin(0.5, 0);
    for (let i = 0; i < ROUNDS.length; i++) { T('rn' + i, 0, 0, '', 5, '#ffffff', { align: 'center', wordWrap: { width: CARD.w - 8 } }).setOrigin(0.5, 0); }
    T('rname', 30, 190, '', 10, '#ffffff'); T('rtwist', 30, 208, '', 7, '#ffe08a'); T('rstage', 30, 244, '', 6, '#c9c4dc'); T('rfoes', 30, 290, '', 6, '#ffffff');
    T('big', 440, 236, '', 14, '#ffffff', { align: 'center', strokeThickness: 6 }).setOrigin(0.5);
    T('tname', 420, 90, '', 10, '#ffe08a'); T('tline', 420, 112, '', 6, '#e8e4ff', { wordWrap: { width: 196 } }); T('tclear', 420, 230, '', 6, '#c9c4dc');
    this.hero = this.add.sprite(VIEW_W / 2, 196, 'ss_idle', 0).setScale(2.4);
    this.foes = [0, 1, 2].map(() => this.add.sprite(0, 0, 'ss_idle', 0).setScale(1.3).setVisible(false));
    this.me = this.add.sprite(0, 0, 'ss_idle', 0).setScale(1.5).setVisible(false);
    this.statues = this.fighters.map(() => this.add.sprite(0, 0, 'ss_idle', 0).setVisible(false));
    this.goBtn = makeButton(this, VIEW_W - 16, 316, 'START!', () => this.choose(), { originX: 1, size: '9px', bg: '#8a5a10', hover: '#d89a20' });
    this.trophyBtn = makeButton(this, 16, 316, 'TROPHIES (T)', () => this.go('trophies'), { size: '7px', bg: '#5a3a10', hover: '#a8701a' });
    makeButton(this, 8, 6, '< BACK', () => this.back());
    addFullscreenButton(this, VIEW_W - 8, 6);
    this.input.keyboard.on('keydown-T', () => { if (this.step === 'pick') this.go('trophies'); });
    for (const [k, n] of [['ONE', 0], ['TWO', 1], ['THREE', 2]]) this.input.keyboard.on('keydown-' + k, () => { if (this.step === 'pick') { this.tier = n; sfx('menu', 0.5); this.refresh(); } });
    this.input.keyboard.on('keydown-Q', () => { if (this.step === 'pick') { this.tier = (this.tier + 2) % 3; sfx('menu', 0.5); this.refresh(); } });
    this.input.keyboard.on('keydown-E', () => { if (this.step === 'pick') { this.tier = (this.tier + 1) % 3; sfx('menu', 0.5); this.refresh(); } });
    this.input.on('pointerdown', (p, over) => { if (!over.length) this.click(p.x, p.y); });
    this.step = run ? 'route' : 'pick';
    const R = data.classic;
    if (R && run) {
      if (R.won && ROUNDS[run.round].boss) {                                   // the boss is beaten: the ending
        const clear = recordClear(run.fighter, run.tier, run.continues), B = bossById(run.boss);
        const end = { fighter: run.fighter, skin: run.skin, tier: run.tier, boss: B ? B.short : 'THE EVIL', stage: B ? B.stage : null, coins: clear.coins, first: clear.first };
        endRun(); this.scene.start('ClassicEnding', end); return;
      }
      if (R.won) { run.round++; this.flash = 90; this.txt.big.setText('ROUND CLEAR!'); sfx('go', 0.9); }
      else this.step = 'lost';
    }
    if (data.trophies) { this.step = 'trophies'; this.tsel = Math.max(0, this.fighters.findIndex((f) => f.id === data.trophies)); }
    this.refresh();
  }

  /** Changes step (the hint bar and what shows follow). */
  go(step) { this.step = step; sfx('menu', 0.6); this.refresh(); }
  /** The costumes of a fighter you can wear. */
  skins(id) { return skinsFor(id).map((_, i) => i).filter((i) => skinUnlocked(id, i)); }
  /** Rebuilds the hint bar for the step you're on. */
  setHint() {
    if (this.hintStep === this.step) return;
    if (this.hint) { this.hint.g.destroy(); this.hint.texts.forEach((x) => x.destroy()); }
    const H = { pick: 'A/D FIGHTER   W/S COSTUME   Q/E DIFFICULTY   J START   T TROPHIES   K BACK', route: 'J / ENTER / A  FIGHT!   K / ESC / B  GIVE UP', lost: 'J / ENTER / A  CONTINUE   K / ESC / B  GIVE UP', trophies: 'A/D LOOK   K / ESC / B  BACK' };
    this.hint = hintBar(this, H[this.step], ACC); this.hintStep = this.step;
  }

  /** Clicks: the fighter's arrows, the costume bar and the difficulty chips (pick), a statue (trophies). */
  click(x, y) {
    if (this.step === 'pick') {
      if (y > 236 && y < 254) return this.cycleSkin(x < VIEW_W / 2 ? -1 : 1);
      if (y > 254 && y < 274) return this.cycleTier(x < VIEW_W / 2 ? -1 : 1);
      if (y > 90 && y < 236) { if (x < VIEW_W / 2 - 50) this.cycleFighter(-1); else if (x > VIEW_W / 2 + 50) this.cycleFighter(1); }
    } else if (this.step === 'trophies') {
      const i = Math.floor((x - 24) / 76); if (y > 70 && y < 250 && i >= 0 && i < this.fighters.length && x < 400) { this.tsel = i; sfx('menu', 0.4); this.refresh(); }
    }
  }
  /** Next / previous fighter (back to their first costume). */
  cycleFighter(d) { this.fi = (this.fi + d + this.fighters.length) % this.fighters.length; this.skin = 0; sfx('menu', 0.5); this.refresh(); }
  /** Next / previous costume. */
  cycleSkin(d) { const list = this.skins(this.fighters[this.fi].id), i = list.indexOf(this.skin); this.skin = list[(Math.max(0, i) + d + list.length) % list.length]; sfx('menu', 0.4); this.refresh(); }
  /** Next / previous difficulty. */
  cycleTier(d) { this.tier = (this.tier + d + 3) % 3; sfx('menu', 0.5); this.refresh(); }

  /** J / Enter / START: start a run (pick), fight the next round (route), try again (lost). */
  choose() {
    if (this.step === 'pick') {
      const f = this.fighters[this.fi]; Object.assign(last, { fi: this.fi, skin: this.skin, tier: this.tier });
      startRun(f.id, this.skin, this.tier); sfx('go', 1); this.flash = 70; this.txt.big.setText('CLASSIC - ' + f.def.name); this.step = 'route'; this.refresh(); return;
    }
    if (this.step === 'lost') { run.continues++; sfx('go', 0.9); this.step = 'route'; this.refresh(); }
    if (this.step !== 'route' || !run) return;
    const setup = roundSetup(settings), R = ROUNDS[run.round];
    sfx('go', 1);
    if (R.boss) this.scene.start('Match', { boss: { id: run.boss, tier: run.tier, setup, classic: true } });
    else this.scene.start('Match', { classic: { setup } });
  }
  /** K / Esc: back out (pick -> menu, trophies -> pick); on the route or after a loss, give up the run. */
  back() {
    sfx('menu', 0.6);
    if (this.step === 'trophies') { this.step = run ? 'route' : 'pick'; this.refresh(); return; }
    if (this.step === 'route' || this.step === 'lost') { endRun(); this.step = 'pick'; this.refresh(); return; }
    this.scene.start('Menu');
  }

  /** Updates the texts and sprites for the step you're on, and redraws. */
  refresh() {
    this.setHint();
    const st = this.step, show = (keys) => { for (const [k, o] of Object.entries(this.txt)) o.setVisible(k === 'big' || keys.some((p) => k.startsWith(p))); };
    this.hero.setVisible(st === 'pick'); this.me.setVisible(st === 'route' || st === 'lost'); this.foes.forEach((s) => s.setVisible(false));
    this.statues.forEach((s) => s.setVisible(st === 'trophies'));
    this.goBtn.setVisible(st !== 'trophies'); this.trophyBtn.setVisible(st === 'pick');
    this.goBtn.setText(st === 'pick' ? 'START!' : st === 'lost' ? 'CONTINUE' : 'FIGHT!');
    if (st === 'pick') {
      show(['head', 'f', 'tier', 'info']);
      const f = this.fighters[this.fi], T = CLASSIC_TIERS[this.tier];
      if (!this.skins(f.id).includes(this.skin)) this.skin = 0;
      const list = this.skins(f.id);
      this.txt.head.setText('CHOOSE YOUR FIGHTER');
      this.txt.fname.setText('<  ' + f.def.name + '  >');
      this.txt.fskin.setText('<  COSTUME: ' + skinInfo(f.id, this.skin).name + '  (' + (list.indexOf(this.skin) + 1) + '/' + list.length + ')  >');
      this.txt.tier.setText('<  ' + T.name + '  >').setColor(hex(T.color));
      const c = [0, 1, 2].map((k) => classicClears(f.id, k));
      this.txt.info.setText('SIX FIGHTS, THEN A RANDOM BOSS.  ' + T.stocks + (T.stocks > 1 ? ' LIVES' : ' LIFE') + ' A FIGHT.  CLEAR PAYS ' + T.coins + ' COINS.\nCLEARS: NORMAL ' + c[0] + '   HARD ' + c[1] + '   NIGHTMARE ' + c[2] + (hasClassicTrophy(f.id) ? '      TROPHY EARNED' : '      TROPHY: NOT YET'));
    } else if (st === 'route' || st === 'lost') {
      show(['rn', 'rname', 'rtwist', 'rstage', 'rfoes']);
      const R = ROUNDS[run.round], P = run.plan[run.round], B = bossById(run.boss);
      ROUNDS.forEach((Q, i) => { const x = CARD.x + i * (CARD.w + CARD.gap) + CARD.w / 2; this.txt['rn' + i].setPosition(x, CARD.y + 76).setText((Q.boss ? 'FINAL' : 'ROUND ' + (i + 1)) + '\n' + (Q.boss && i > run.round ? '???' : Q.name)).setColor(i === run.round ? '#ffffff' : i < run.round ? '#7a9a7a' : '#8a87a3'); });
      this.txt.rname.setText((st === 'lost' ? 'DEFEATED...  CONTINUE?   ' : (R.boss ? 'FINAL: ' : 'ROUND ' + (run.round + 1) + ': ')) + R.name).setColor(st === 'lost' ? '#ff6a6a' : '#ffffff');
      this.txt.rtwist.setText(R.boss ? B.name + '\n' + B.title : R.twist);
      this.txt.rstage.setText(R.boss ? 'ARENA: ' + B.arena : 'STAGE: ' + stageById(P.stage).name + (R.mode === 'stamina' ? '   ' + R.hp + ' HP' : '') + '   ' + CLASSIC_TIERS[run.tier].name + (run.continues ? '   CONTINUES: ' + run.continues : ''));
      this.txt.rfoes.setText(R.boss ? '' : 'VS  ' + P.foes.map((id) => fighterById(id).name).join('  +  '));
    } else if (st === 'trophies') {
      show(['tname', 'tline', 'tclear', 'head']);
      const f = this.fighters[this.tsel], has = hasClassicTrophy(f.id), info = CLASSIC_TROPHIES[f.id] || { name: f.def.name, line: '' };
      this.txt.head.setText('CLASSIC TROPHIES  ' + this.fighters.filter((q) => hasClassicTrophy(q.id)).length + ' / ' + this.fighters.length).setPosition(200, 56);
      this.txt.tname.setText(has ? info.name : '???');
      this.txt.tline.setText(has ? info.line : 'CLEAR CLASSIC AS ' + f.def.name + ' ON ANY DIFFICULTY TO EARN THIS TROPHY.');
      this.txt.tclear.setText('CLEARS: NORMAL ' + classicClears(f.id, 0) + '\n        HARD ' + classicClears(f.id, 1) + '\n        NIGHTMARE ' + classicClears(f.id, 2));
    }
    if (st !== 'trophies') this.txt.head.setPosition(VIEW_W / 2, 56);
    this.draw();
  }

  /** The panels: the fighter stand (pick), the route's cards (route), the trophy pedestals (trophies). */
  draw() {
    const g = this.g, p = this.pics, t = this.t, st = this.step; g.clear(); p.clear();
    if (st === 'pick') {
      const T = CLASSIC_TIERS[this.tier], c = VIEW_W / 2, bob = Math.sin(t * 0.2) * 3;
      panel(g, 110, 50, 420, 262, T.color);
      p.fillStyle(T.color, 0.14); p.fillCircle(c, 170, 64); p.fillStyle(0x000000, 0.4); p.fillEllipse(c, 198, 90, 12);
      p.fillStyle(0xffffff, 1); p.fillTriangle(c - 130 + bob, 160, c - 118 + bob, 150, c - 118 + bob, 170); p.fillTriangle(c + 130 - bob, 160, c + 118 - bob, 150, c + 118 - bob, 170);
      slant(p, c - 170, 236, 340, 16, 0x000000, 0.55, 6); slant(p, c - 120, 256, 240, 18, T.color, 0.3, 6);
    } else if (st === 'route' || st === 'lost') {
      ROUNDS.forEach((Q, i) => {
        const x = CARD.x + i * (CARD.w + CARD.gap), y = CARD.y + (i === run.round ? -4 : 0), on = i === run.round, done = i < run.round, hidden = Q.boss && i > run.round;
        panel(g, x, y, CARD.w, CARD.h, done ? 0x5ad86a : Q.boss ? 0xff3a3a : ACC, { lit: on });
        const px = x + 5, py = y + 6, pw = CARD.w - 10, ph = 64;
        if (hidden) { p.fillStyle(0x1a0608, 1); p.fillRect(px, py, pw, ph); p.fillStyle(0xff3a3a, 0.5 + 0.3 * Math.sin(t * 0.1)); p.fillCircle(px + pw / 2, py + ph / 2, 14); p.fillStyle(0x07060e, 1); p.fillRect(px + pw / 2 - 2, py + ph / 2 - 8, 4, 10); p.fillRect(px + pw / 2 - 2, py + ph / 2 + 5, 4, 4); }
        else { const sid = Q.boss ? bossById(run.boss).stage : run.plan[i].stage, s = stageById(sid); if (s && s.preview) s.preview(p, px, py, pw, ph); }
        if (done) { p.fillStyle(0x07060e, 0.55); p.fillRect(px, py, pw, ph); p.lineStyle(5, 0x5ad86a, 1); p.lineBetween(px + 22, py + 34, px + 34, py + 46); p.lineBetween(px + 34, py + 46, px + 56, py + 20); p.lineStyle(0); }
        p.lineStyle(2, on ? 0xffffff : 0x2c2650, 1); p.strokeRect(px, py, pw, ph); p.lineStyle(0);
        if (on) { const cx = x + CARD.w / 2 + Math.sin(t * 0.2) * 2; p.fillStyle(0xffffff, 1); p.fillTriangle(cx - 6, y - 10, cx + 6, y - 10, cx, y - 4); }
        if (i < ROUNDS.length - 1) { p.fillStyle(i < run.round ? 0x5ad86a : 0x55506a, 1); p.fillRect(x + CARD.w + 1, CARD.y + 40, CARD.gap - 2, 3); }
      });
      panel(g, 18, 182, 604, 126, this.step === 'lost' ? 0xff3a3a : ROUNDS[run.round].boss ? 0xff3a3a : ACC);
    } else if (st === 'trophies') {
      panel(g, 14, 50, 392, 250, ACC); panel(g, 410, 76, 212, 200, ACC, { lit: true });
      this.fighters.forEach((f, i) => {
        const x = 24 + i * 76 + 36, y = 236, on = i === this.tsel;
        p.fillStyle(0x000000, 0.45); p.fillEllipse(x, y + 26, 70, 10);
        p.fillStyle(0x3a2a14, 1); p.fillRect(x - 30, y, 60, 24); p.fillStyle(0xb8862a, 1); p.fillRect(x - 32, y - 4, 64, 6); p.fillRect(x - 32, y + 20, 64, 6); p.fillStyle(0xffe08a, 1); p.fillRect(x - 32, y - 4, 64, 1);
        p.fillStyle(0xd8a838, 1); p.fillRect(x - 14, y + 8, 28, 8); p.fillStyle(0x3a2a14, 1); p.fillRect(x - 12, y + 10, 24, 4);
        if (on) { p.fillStyle(0xffe08a, 0.12); p.fillTriangle(x - 10, 60, x + 10, 60, x + 50, y); p.fillTriangle(x - 10, 60, x - 50, y, x + 50, y); const cx = x + Math.sin(t * 0.2) * 2; p.fillStyle(0xffffff, 1); p.fillTriangle(cx - 6, 262 + 8, cx + 6, 262 + 8, cx, 262 + 2); }
      });
    }
  }

/** Reads the keys / pad for the step, animates the sprites, the flash text and the backdrop. */
  update() {
    this.t++;
    const m = this.menu.poll(), A = m.pads.some((q) => q.button === 'a' || q.button === 'start'), Bk = m.pads.some((q) => q.button === 'b');
    const st = this.step;
    if (st === 'pick') {
      if (m.left) this.cycleFighter(-1); if (m.right) this.cycleFighter(1); if (m.up) this.cycleSkin(-1); if (m.down) this.cycleSkin(1);
      if (m.pads.some((q) => q.button === 'y')) this.go('trophies');
      const f = this.fighters[this.fi]; showFighter(this.hero, f.def, Math.floor(this.t / 6), this.skin); this.hero.setPosition(VIEW_W / 2, 198).setScale(f.def.menuScale || 2.4);
    } else if (st === 'trophies') {
      if (m.left) { this.tsel = (this.tsel + this.fighters.length - 1) % this.fighters.length; sfx('menu', 0.4); this.refresh(); }
      if (m.right) { this.tsel = (this.tsel + 1) % this.fighters.length; sfx('menu', 0.4); this.refresh(); }
      this.fighters.forEach((f, i) => {                                         // gold statues turning on their pedestals (shadows if not earned)
        const s = this.statues[i], has = hasClassicTrophy(f.id), on = i === this.tsel, turn = Math.cos(this.t * 0.03 + i);
        showFighter(s, f.def, 0, 0); s.setPosition(24 + i * 76 + 36, 232 + (on ? Math.sin(this.t * 0.08) * 2 : 0)).setScale((f.def.menuScale || 2.4) * 0.62 * (on ? 1.12 : 1) * Math.max(0.2, Math.abs(turn)), (f.def.menuScale || 2.4) * 0.62 * (on ? 1.12 : 1));
        s.setFlipX(turn < 0 ? !f.def.facesLeft : !!f.def.facesLeft);
        if (has) goldStatue(s); else s.setTint(0x141018);
      });
    } else if (run) {
      const f = fighterById(run.fighter), P = run.plan[run.round];
      showFighter(this.me, f.def, Math.floor(this.t / 6), run.skin); this.me.setPosition(470, 292).setScale((f.def.menuScale || 2.4) * 0.6);
      if (P) P.foes.forEach((id, i) => { const s = this.foes[i], d = fighterById(id).def; s.setVisible(true); showFighter(s, d, Math.floor(this.t / 6) + i * 3, id === run.fighter ? (run.skin ? 0 : 1) : 0); s.setPosition(530 + i * 34, 292).setScale((d.menuScale || 2.4) * 0.45).setFlipX(!d.facesLeft); });
    }
    if (m.ok || A) this.choose();
    else if (m.back || Bk) this.back();
    if (this.flash > 0) { this.flash--; this.txt.big.setAlpha(Math.min(1, this.flash / 20)).setScale(1 + Math.max(0, this.flash - 70) * 0.02); } else this.txt.big.setText('');
    this.draw();
    this.bgFx.update(this.t);
  }
}

// Trinkets > ACHIEVEMENTS: two pages.
//   ACHIEVEMENTS  every achievement (src/achievements.js) as a card: a trophy (gold once unlocked), its name, how to
//                 get it, a progress bar and the coins it pays. Secret ones read ??? with a hint until found.
//   PROGRESS      lifetime stats, overall completion, and each fighter's matches, wins, KOs and next milestone costume.
// Q/E (or a pad's bumpers / X Y) or clicking a tab switches page; arrows / W A S D move through the cards (the list
// scrolls), mouse wheel scrolls; K / Esc / B goes back.
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { playMusic } from '../audio/music.js';
import { MenuInput } from './menuInput.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { ACHIEVEMENTS, isUnlocked, unlockedCount, progressOf, getStats, checkAchievements } from '../achievements.js';
import { achievementToasts } from '../ui/toast.js';
import { getKOs, getCoins, owns, MILESTONE_KOS } from '../progress.js';
import { ROSTER, TEST_ROSTER, showFighter } from '../fighters/roster.js';
import { SHOP } from '../data/shop.js';
import { STAGES } from '../stage/stages.js';
import { ArcadeBg, titleBanner, hintBar, panel, slant, ARC, shade } from '../ui/arcade.js';

const ACC = ARC.sections.achievements;

const W = VIEW_W, H = VIEW_H;
const C = { bg: 0x0b0a14, panel: 0x2a1640, panel2: 0x1c0f2c, line: 0xc77dff, gold: 0xf3c358, dim: 0x5a4a70, ok: 0x7aff8a };
const TABS = ['ACHIEVEMENTS', 'PROGRESS'];
const TAB = { x: 16, y: 50, w: 150, h: 20, gap: 6 };
// the achievement cards: 2 columns, 5 rows on screen at a time
const CARD = { x: 16, y: 106, w: 300, h: 40, gapX: 8, gapY: 6, cols: 2, rows: 5 };
const VIS = CARD.cols * CARD.rows;

export class AchievementsScene extends Phaser.Scene {
  constructor() { super('Achievements'); }

  create() {
    this.t = 0; this.tab = 0; this.sel = 0; this.top = 0; this.menu = new MenuInput(this); this.clicked = null;
    this.qKey = this.input.keyboard.addKey('Q'); this.eKey = this.input.keyboard.addKey('E');
    playMusic(this, 'bgm_title');
    this.bgFx = new ArcadeBg(this, ACC, { second: ARC.sections.trinkets });
    this.g = this.add.graphics();
    const txt = (x, y, s, size, color, o = {}) => this.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', color, ...o });
    this.txt = txt;
    titleBanner(this, 'ACHIEVEMENTS', ACC, { crumb: 'TRINKETS  >  ACHIEVEMENTS' });
    this.tabT = TABS.map((n, i) => txt(TAB.x + i * (TAB.w + TAB.gap) + TAB.w / 2, TAB.y + 6, n, 7, '#c9c4dc', { stroke: '#07060e', strokeThickness: 3 }).setOrigin(0.5, 0));
    this.sumT = txt(W - 16, TAB.y + 6, '', 7, '#f3c358').setOrigin(1, 0);
    // page 1: a pool of text for the cards on screen
    this.cards = Array.from({ length: VIS }, () => ({
      name: txt(0, 0, '', 7, '#ffffff'), info: txt(0, 0, '', 5, '#c9c4dc', { wordWrap: { width: CARD.w - 100 } }),
      num: txt(0, 0, '', 5, '#c9c4dc').setOrigin(1, 0), coins: txt(0, 0, '', 6, '#f3c358').setOrigin(1, 0),
      poster: this.add.image(0, 0, 'shop_poster').setScale(0.16).setVisible(false),          // (an achievement whose reward is a poster)
    }));
    // the poster, big, while its card is picked
    this.bigPoster = this.add.image(W - 96, 214, 'shop_poster').setScale(1).setDepth(30).setVisible(false);
    this.bigPosterT = txt(W - 96, 104, 'YOUR REWARD', 6, '#ffd23f', { stroke: '#07060e', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(31).setVisible(false);
    this.headT = txt(16, 80, '', 6, '#c9c4dc');
    // page 2: stats, completion, the roster
    this.statT = txt(28, 114, '', 6, '#e8e4f4', { lineSpacing: 6 });
    this.statV = txt(244, 114, '', 6, '#ffffff', { lineSpacing: 6, align: 'right' }).setOrigin(1, 0);
    this.compT = txt(28, 86, '', 8, '#ffffff', { stroke: '#07060e', strokeThickness: 3 });
    this.roster = [...ROSTER.filter((r) => r.available), ...TEST_ROSTER].map((r) => ({
      r, spr: this.add.sprite(0, 0, r.def.sheets.idle, 0).setVisible(false),
      name: txt(0, 0, r.name, 6, '#ffffff'), line: txt(0, 0, '', 5, '#c9c4dc'), next: txt(0, 0, '', 5, '#f3c358'),
    }));
    hintBar(this, 'Q/E PAGE   ARROWS MOVE   CLICK PICK   K / ESC / B  BACK', ACC);
    makeButton(this, 8, 6, '< BACK', () => this.back());
    addFullscreenButton(this, W - 8, 6);
    this.input.on('pointerdown', (p, over) => {
      if (over.length) return;
      for (let i = 0; i < TABS.length; i++) { const x = TAB.x + i * (TAB.w + TAB.gap); if (p.x >= x && p.x <= x + TAB.w && p.y >= TAB.y && p.y <= TAB.y + TAB.h) return this.setTab(i); }
      if (this.tab === 0) for (let i = 0; i < VIS; i++) { const [x, y] = this.cardAt(i); if (p.x >= x && p.x <= x + CARD.w && p.y >= y && p.y <= y + CARD.h && this.top + i < ACHIEVEMENTS.length) { this.sel = this.top + i; sfx('menu', 0.3); } }
    });
    this.input.on('wheel', (p, o, dx, dy) => { if (this.tab === 0) this.scroll(Math.sign(dy) * CARD.cols); });
    // anything already earned (e.g. stats from before achievements existed) pops up now
    achievementToasts(this, checkAchievements(), { delay: 500 });
  }

  cardAt(i) { const c = i % CARD.cols, r = Math.floor(i / CARD.cols); return [CARD.x + c * (CARD.w + CARD.gapX), CARD.y + r * (CARD.h + CARD.gapY)]; }
  setTab(i) { if (i !== this.tab) { this.tab = i; sfx('menu', 0.5, 1.2); } }
  back() { sfx('menu', 0.6); this.scene.start('Trinkets'); }
  scroll(d) {
    const n = ACHIEVEMENTS.length, maxTop = Math.max(0, Math.ceil(n / CARD.cols) * CARD.cols - VIS);
    this.top = Phaser.Math.Clamp(this.top + d, 0, maxTop);
    this.sel = Phaser.Math.Clamp(this.sel, this.top, Math.min(n - 1, this.top + VIS - 1));
  }

  update() {
    this.t++;
    const m = this.menu.poll(), t = this.t, n = ACHIEVEMENTS.length;
    if (Phaser.Input.Keyboard.JustDown(this.qKey) || m.pads.some((p) => p.button === 'lb' || p.button === 'x')) this.setTab((this.tab + TABS.length - 1) % TABS.length);
    if (Phaser.Input.Keyboard.JustDown(this.eKey) || m.pads.some((p) => p.button === 'rb' || p.button === 'y')) this.setTab((this.tab + 1) % TABS.length);
    if (m.back || m.pads.some((p) => p.button === 'b')) return this.back();
    if (this.tab === 0) {
      const before = this.sel;
      if (m.left) this.sel = Math.max(0, this.sel - 1);
      if (m.right) this.sel = Math.min(n - 1, this.sel + 1);
      if (m.up) this.sel = Math.max(0, this.sel - CARD.cols);
      if (m.down) this.sel = Math.min(n - 1, this.sel + CARD.cols);
      if (this.sel !== before) sfx('menu', 0.3);
      while (this.sel < this.top) this.top -= CARD.cols;                       // keep the picked card on screen
      while (this.sel >= this.top + VIS) this.top += CARD.cols;
    } else if (m.left || m.right) this.setTab(0);

    const g = this.g; g.clear(); this.bgFx.update(t);
    TABS.forEach((name, i) => {
      const x = TAB.x + i * (TAB.w + TAB.gap), on = i === this.tab;
      slant(g, x + 3, TAB.y + 3, TAB.w, TAB.h, 0x000000, 0.5, 6);
      slant(g, x, TAB.y - (on ? 2 : 0), TAB.w, TAB.h + (on ? 2 : 0), on ? ACC : 0x2a2440, 1, 6);
      if (on) slant(g, x, TAB.y - 2, TAB.w, 7, 0xffffff, 0.25, 2);
      this.tabT[i].setColor(on ? '#07060e' : '#c9c4dc').setStroke(on ? '#ffd23f' : '#07060e', on ? 0 : 3);
    });
    const done = unlockedCount();
    this.sumT.setText(done + ' / ' + n + ' UNLOCKED');
    this.drawAchievements(g, t, this.tab === 0);
    this.drawProgress(g, t, this.tab === 1);
  }

  // page 1 ----------------------------------------------------------------------------------------
  drawAchievements(g, t, on) {
    this.headT.setVisible(on);
    for (const c of this.cards) for (const k of ['name', 'info', 'num', 'coins']) c[k].setVisible(on);
    const pick = ACHIEVEMENTS[this.sel], big = on && pick && pick.poster && isUnlocked(pick.id);
    this.bigPoster.setVisible(!!big); this.bigPosterT.setVisible(!!big);
    if (big) { const px = this.sel % CARD.cols ? 96 : W - 96; this.bigPoster.setTexture(pick.poster).setPosition(px, 214 + Math.sin(t * 0.04) * 2); this.bigPosterT.setX(px); }   // (on the other side from its card)
    for (const c of this.cards) if (!on) c.poster.setVisible(false);
    if (!on) return;
    const n = ACHIEVEMENTS.length, done = unlockedCount();
    const coinsEarned = ACHIEVEMENTS.filter((a) => isUnlocked(a.id)).reduce((s, a) => s + a.coins, 0);
    this.headT.setText(Math.round(done / n * 100) + '% COMPLETE   ·   ' + coinsEarned + ' COINS EARNED FROM ACHIEVEMENTS');
    slant(g, 16, 91, W - 32, 8, 0x1c1838, 1, 4); slant(g, 16, 91, Math.max(8, (W - 32) * done / n), 8, ACC, 1, 4); slant(g, 16, 91, Math.max(8, (W - 32) * done / n), 3, 0xffffff, 0.3, 2);
    for (let i = 0; i < VIS; i++) {
      const a = ACHIEVEMENTS[this.top + i], c = this.cards[i];
      if (!a) { for (const k of ['name', 'info', 'num', 'coins']) c[k].setText(''); c.poster.setVisible(false); continue; }
      const [x, y] = this.cardAt(i), got = isUnlocked(a.id), hidden = a.secret && !got, sel = this.top + i === this.sel;
      const [have, goal] = progressOf(a);
      slant(g, x + 4, y + 4, CARD.w, CARD.h, 0x000000, 0.5, 8);
      slant(g, x, y, CARD.w, CARD.h, sel ? ARC.white : got ? 0x8a6a2a : 0x2c2650, 1, 8);
      slant(g, x + 2, y + 2, CARD.w - 4, CARD.h - 4, got ? 0x2e2012 : sel ? 0x241e44 : ARC.panel, 1, 8);
      if (got) slant(g, x + 2, y + 2, 26, CARD.h - 4, ACC, 0.25, 8);
      c.poster.setVisible(!!(a.poster && got));
      if (a.poster && got) c.poster.setTexture(a.poster).setPosition(x + 18, y + 20); else this.trophy(g, x + 18, y + 20, got, hidden, t + i * 7);
      c.name.setText(hidden ? '???' : a.name).setPosition(x + 36, y + 6).setColor(got ? '#f3c358' : hidden ? '#8a87a3' : '#ffffff');
      c.info.setText(hidden ? a.hint : a.info).setPosition(x + 36, y + 17);
      c.coins.setText('+' + a.coins).setPosition(x + CARD.w - 8, y + 6).setColor(got ? '#7aff8a' : '#f3c358');
      // the progress bar (a tick once it's done)
      const bx = x + CARD.w - 92, by = y + 28, bw = 84;
      slant(g, bx, by, bw, 5, 0x07060e, 1, 2);
      if (have > 0) slant(g, bx, by, Math.max(3, bw * have / goal), 5, got ? C.ok : ACC, 1, 2);
      c.num.setText(got ? 'DONE' : goal > 1 ? have + ' / ' + goal : '').setPosition(bx - 4, by - 1).setColor(got ? '#7aff8a' : '#c9c4dc');
    }
    // the scroll bar
    const rows = Math.ceil(n / CARD.cols), vis = CARD.rows, track = CARD.rows * (CARD.h + CARD.gapY) - CARD.gapY;
    g.fillStyle(C.panel2, 1); g.fillRect(W - 10, CARD.y, 3, track);
    g.fillStyle(C.line, 1); g.fillRect(W - 10, CARD.y + track * (this.top / CARD.cols) / rows, 3, track * vis / rows);
  }
  // a trophy: gold and shining once won, a dim outline with a padlock before, a ? for a hidden one
  trophy(g, x, y, got, hidden, t) {
    if (got) {
      const glow = 0.15 + 0.1 * Math.sin(t * 0.08); g.fillStyle(C.gold, glow); g.fillCircle(x, y, 15);
      g.fillStyle(0xc8962a, 1); g.fillRect(x - 6, y + 7, 12, 3); g.fillRect(x - 2, y + 2, 4, 6);
      g.fillStyle(C.gold, 1); g.fillRect(x - 8, y - 9, 16, 11); g.fillRect(x - 11, y - 7, 3, 5); g.fillRect(x + 8, y - 7, 3, 5);
      g.fillStyle(0xfff4c8, 1); g.fillRect(x - 5, y - 7, 2, 7);
      return;
    }
    g.lineStyle(1, 0x5a4a70, 1); g.strokeRect(x - 8, y - 9, 16, 11); g.strokeRect(x - 6, y + 7, 12, 3); g.lineBetween(x, y + 2, x, y + 7);
    if (hidden) { g.fillStyle(0x8a87a3, 1); g.fillRect(x - 3, y - 7, 6, 2); g.fillRect(x + 1, y - 6, 2, 3); g.fillRect(x - 1, y - 3, 2, 2); g.fillRect(x - 1, y, 2, 1); }
    else { g.fillStyle(0x8a87a3, 1); g.fillRect(x - 3, y - 4, 6, 5); g.lineStyle(1, 0x8a87a3, 1); g.strokeRect(x - 2, y - 7, 4, 3); }   // a padlock
  }

  // page 2 ----------------------------------------------------------------------------------------
  drawProgress(g, t, on) {
    for (const x of [this.statT, this.statV, this.compT]) x.setVisible(on);
    for (const r of this.roster) for (const k of ['spr', 'name', 'line', 'next']) r[k].setVisible(on);
    if (!on) return;
    const s = getStats(), n = ACHIEVEMENTS.length;
    const items = SHOP.filter((tb) => tb.name !== 'GAMBLING').flatMap((tb) => tb.items).filter((i) => !i.hidden), owned = items.filter((i) => owns(i.id)).length;
    const stages = STAGES.filter((x) => x.available).length;
    const mains = ROSTER.filter((r) => r.available), tiers = mains.reduce((k, r) => k + MILESTONE_KOS.filter((m, i) => i > 0 && getKOs(r.id) >= m).length, 0), tierMax = mains.length * (MILESTONE_KOS.length - 1);
    const kosAll = this.roster.reduce((k, r) => k + getKOs(r.r.id), 0);
    // overall completion: achievements, the shop, milestone costumes and stages, weighted equally
    const parts = [unlockedCount() / n, owned / items.length, tiers / tierMax, Math.min(1, s.stages.length / stages)];
    const comp = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length * 100);
    panel(g, 16, 80, 240, 238, ACC);
    this.compT.setText('COMPLETION  ' + comp + '%');
    slant(g, 28, 100, 216, 7, 0x07060e, 1, 3); if (comp) slant(g, 28, 100, Math.max(6, 216 * comp / 100), 7, ACC, 1, 3);
    const rows = [
      ['MATCHES PLAYED', s.matches], ['WINS', s.wins], ['WIN RATE', s.matches ? Math.round(s.wins / s.matches * 100) + '%' : '-'],
      ['FLAWLESS WINS', s.flawless], ['KOS', kosAll], ['LIMITS FIRED', s.limits], ['TAUNTS', s.taunts],
      ['COINS IN THE BANK', getCoins()], ['COINS SPENT', s.spent], ['GACHA PULLS', s.spins],
      ['SHOP ITEMS OWNED', owned + ' / ' + items.length], ['MILESTONE COSTUMES', tiers + ' / ' + tierMax],
      ['STAGES FOUGHT ON', Math.min(s.stages.length, stages) + ' / ' + stages], ['ACHIEVEMENTS', unlockedCount() + ' / ' + n],
    ];
    this.statT.setText(rows.map((r) => r[0]).join('\n')); this.statV.setText(rows.map((r) => String(r[1])).join('\n'));
    // the roster: a row per fighter
    const x0 = 268, w = 356;
    panel(g, x0, 80, w, 238, ACC);
    const rowH = Math.min(32, Math.floor(228 / this.roster.length));
    this.roster.forEach((e, i) => {
      const y = 86 + i * rowH, id = e.r.id, kos = getKOs(id), played = s.played[id] || 0, won = s.won[id] || 0;
      if (i % 2) { g.fillStyle(0x000000, 0.15); g.fillRect(x0 + 2, y - 2, w - 4, rowH); }
      g.fillStyle(0x140a20, 1); g.fillRect(x0 + 6, y - 1, 26, rowH - 2);
      showFighter(e.spr.setVisible(true), e.r.def, Math.floor((t + i * 9) / 7), 0);
      e.spr.setScale(Math.min(0.42, (rowH - 4) / e.spr.frame.height * 1.15)).setPosition(x0 + 19, y + rowH - 4);
      e.name.setPosition(x0 + 40, y + 2);
      e.line.setPosition(x0 + 40, y + 13).setText(played + ' PLAYED   ' + won + ' WON   ' + kos + ' KOS');
      const isMain = ROSTER.some((r) => r.id === id);
      const next = MILESTONE_KOS.find((m) => m > kos);
      if (isMain && next) {                                                  // next milestone costume: a bar
        const prev = MILESTONE_KOS[MILESTONE_KOS.indexOf(next) - 1], p = (kos - prev) / (next - prev), bx = x0 + w - 110;
        g.fillStyle(0x0b0a14, 1); g.fillRect(bx, y + 14, 100, 4); g.fillStyle(C.gold, 1); g.fillRect(bx, y + 14, 100 * p, 4);
        e.next.setPosition(bx, y + 3).setText('NEXT COSTUME ' + kos + '/' + next).setColor('#f3c358');
      } else e.next.setPosition(x0 + w - 110, y + 3).setText(isMain ? 'ALL COSTUMES WON' : 'TEST FIGHTER').setColor(isMain ? '#7aff8a' : '#8a87a3');
    });
  }
}

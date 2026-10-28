// The Shop (TRINKETS > SHOP): the UI only, for now. Tabs of shelves along the top, a grid of item cards, and a
// panel on the right with the picked item's preview, name, description, price and a BUY button. The money counter
// sits top right. What's for sale lives in src/data/shop.js (empty slots read COMING SOON); buying isn't wired up yet.
// A/D or arrows move along a shelf (W/S: up and down a row), Q/E (or a pad's X/Y) switch tabs,
// J / Enter / A buys, K / Esc / B goes back. Mouse: click a tab or a card, BUY.
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { playMusic } from '../audio/music.js';
import { MenuInput } from './menuInput.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { SHOP, CURRENCY, getCoins } from '../data/shop.js';

const W = VIEW_W, H = VIEW_H;
const C = { bg: 0x0b0a14, panel: 0x2a1640, panel2: 0x1c0f2c, line: 0xc77dff, gold: 0xf3c358, dim: 0x5a4a70 };
const GRID = { x: 16, y: 84, cols: 4, rows: 2, w: 94, h: 108, gap: 6 };   // the item cards
const SIDE = { x: 424, y: 84, w: 200, h: 228 };                           // the details panel
const TAB = { x: 16, y: 56, w: 98, h: 20, gap: 4 };
const PER = GRID.cols * GRID.rows;

export class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); }

  create() {
    this.t = 0; this.tab = 0; this.sel = 0; this.menu = new MenuInput(this); this.clicked = null;
    this.qKey = this.input.keyboard.addKey('Q'); this.eKey = this.input.keyboard.addKey('E');
    playMusic(this, 'bgm_title');
    this.bg = this.add.graphics();
    this.g = this.add.graphics();                    // redrawn every frame: tabs, cards, the cursor, the panel
    const txt = (x, y, s, size, color, o = {}) => this.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', color, ...o });
    this.add.text(W / 2, 28, 'SHOP', { fontFamily: FONT, fontSize: '16px', color: '#c77dff', stroke: '#0b0a14', strokeThickness: 5 }).setOrigin(0.5);
    this.tabT = SHOP.map((tb, i) => txt(TAB.x + i * (TAB.w + TAB.gap) + TAB.w / 2, TAB.y + 6, tb.name, 7, '#c9c4dc').setOrigin(0.5, 0));
    this.coinT = txt(W - 24, 64, '', 8, '#f3c358').setOrigin(1, 0);
    this.cardName = []; this.cardPrice = [];
    for (let i = 0; i < PER; i++) {
      const [x, y] = this.cardAt(i);
      this.cardName.push(txt(x + GRID.w / 2, y + 70, '', 6, '#e8e4f4', { align: 'center' }).setOrigin(0.5, 0));
      this.cardPrice.push(txt(x + GRID.w / 2, y + 88, '', 6, '#f3c358').setOrigin(0.5, 0));
    }
    this.nameT = txt(SIDE.x + 12, SIDE.y + 110, '', 9, '#ffffff');
    this.infoT = txt(SIDE.x + 12, SIDE.y + 128, '', 6, '#c9c4dc', { lineSpacing: 6, wordWrap: { width: SIDE.w - 24 } });
    this.priceT = txt(SIDE.x + 12, SIDE.y + 180, '', 8, '#f3c358');
    this.buyT = txt(SIDE.x + SIDE.w / 2, SIDE.y + SIDE.h - 26, 'BUY', 9, '#ffffff').setOrigin(0.5, 0.5);
    this.msgT = txt(W / 2, H - 22, '', 7, '#ff8a8a').setOrigin(0.5, 1);
    this.add.text(W / 2, H - 8, 'A/D W/S PICK   Q/E TAB   J / ENTER / A BUY   K / ESC / B  BACK', { fontFamily: FONT, fontSize: '5px', color: '#8a87a3' }).setOrigin(0.5, 1);
    makeButton(this, 8, 6, '< BACK', () => this.back());
    addFullscreenButton(this, W - 8, 6);
    this.msg = 0;
    // the room behind it all: a dark shop, shelves, a hanging lamp
    const b = this.bg;
    b.fillStyle(C.bg, 1); b.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) { b.fillStyle(0x140c20, 1); b.fillRect(0, 44 + i * 56, W, 3); }
    b.fillStyle(C.panel2, 1); b.fillRect(GRID.x - 6, GRID.y - 6, GRID.cols * (GRID.w + GRID.gap) + 6, GRID.rows * (GRID.h + GRID.gap) + 6);
    // mouse: tabs, cards, BUY
    this.input.on('pointerdown', (p, over) => {
      if (over.length) return;
      for (let i = 0; i < SHOP.length; i++) { const x = TAB.x + i * (TAB.w + TAB.gap); if (p.x >= x && p.x <= x + TAB.w && p.y >= TAB.y && p.y <= TAB.y + TAB.h) { this.setTab(i); return; } }
      for (let i = 0; i < PER; i++) { const [x, y] = this.cardAt(i); if (p.x >= x && p.x <= x + GRID.w && p.y >= y && p.y <= y + GRID.h) { if (this.sel === i) this.clicked = 'buy'; else { this.sel = i; sfx('menu', 0.4); } return; } }
      if (p.x >= SIDE.x + 20 && p.x <= SIDE.x + SIDE.w - 20 && p.y >= SIDE.y + SIDE.h - 40 && p.y <= SIDE.y + SIDE.h - 12) this.clicked = 'buy';
    });
  }

  cardAt(i) { const c = i % GRID.cols, r = Math.floor(i / GRID.cols); return [GRID.x + c * (GRID.w + GRID.gap), GRID.y + r * (GRID.h + GRID.gap)]; }
  setTab(i) { if (i !== this.tab) { this.tab = i; this.sel = 0; sfx('menu', 0.5, 1.2); } }
  item() { return SHOP[this.tab].items[this.sel] || null; }
  back() { sfx('menu', 0.6); this.scene.start('Trinkets'); }
  buy() {
    const it = this.item();
    if (!it) { this.say('NOTHING HERE YET.'); return; }
    if (getCoins() < it.price) { this.say('NOT ENOUGH ' + CURRENCY.name + '.'); return; }
    this.say('BUYING IS NOT SET UP YET.');                  // (to be wired up with the items)
  }
  say(s) { this.msgT.setText(s); this.msg = 90; sfx('curse', 0.3, 1.5); }

  // a placeholder icon: a little gift box in the item's colour (or an empty, dashed slot)
  icon(g, cx, cy, s, it, t) {
    if (!it) {                                                                           // an empty slot: a dashed square and a ?
      g.fillStyle(C.dim, 1);
      for (let d = -s; d < s; d += 6) { g.fillRect(cx + d, cy - s, 3, 1); g.fillRect(cx + d, cy + s, 3, 1); g.fillRect(cx - s, cy + d, 1, 3); g.fillRect(cx + s, cy + d, 1, 3); }
      g.fillRect(cx - 4, cy - 8, 8, 2); g.fillRect(cx + 3, cy - 7, 2, 5); g.fillRect(cx - 1, cy - 3, 4, 2); g.fillRect(cx - 1, cy - 2, 2, 4); g.fillRect(cx - 1, cy + 4, 2, 2);
      return;
    }
    const col = it.color ?? C.gold, bob = Math.sin(t * 0.06) * 2;
    g.fillStyle(col, 1); g.fillRect(cx - s * 0.7, cy - s * 0.3 + bob, s * 1.4, s);
    g.fillStyle(0xffffff, 0.25); g.fillRect(cx - s * 0.7, cy - s * 0.3 + bob, s * 1.4, 3);
    g.fillStyle(0xffffff, 1); g.fillRect(cx - 2, cy - s * 0.3 + bob, 4, s); g.fillRect(cx - s * 0.8, cy - s * 0.45 + bob, s * 1.6, 5);
    g.fillEllipse(cx - 6, cy - s * 0.55 + bob, 10, 6); g.fillEllipse(cx + 6, cy - s * 0.55 + bob, 10, 6);
  }
  coin(g, x, y, t) {
    const w = 8 * Math.abs(Math.cos(t * 0.05)) + 2;
    g.fillStyle(0x8a6a1c, 1); g.fillEllipse(x, y + 1, w, 10); g.fillStyle(C.gold, 1); g.fillEllipse(x, y, w, 10); g.fillStyle(0xfff4c8, 1); g.fillRect(x - 1, y - 3, 2, 4);
  }

  update() {
    this.t++;
    const m = this.menu.poll(), t = this.t;
    const tabPrev = Phaser.Input.Keyboard.JustDown(this.qKey) || m.pads.some((p) => p.button === 'lb' || p.button === 'x');
    const tabNext = Phaser.Input.Keyboard.JustDown(this.eKey) || m.pads.some((p) => p.button === 'rb' || p.button === 'y');
    if (tabPrev) this.setTab((this.tab - 1 + SHOP.length) % SHOP.length);
    if (tabNext) this.setTab((this.tab + 1) % SHOP.length);
    if (m.left) { this.sel = (this.sel - 1 + PER) % PER; sfx('menu', 0.4); }
    if (m.right) { this.sel = (this.sel + 1) % PER; sfx('menu', 0.4); }
    if (m.up || m.down) { this.sel = (this.sel + GRID.cols) % PER; sfx('menu', 0.4); }
    if (m.ok || this.clicked === 'buy' || m.pads.some((p) => p.button === 'a')) this.buy();
    this.clicked = null;
    if (m.back || m.pads.some((p) => p.button === 'b')) return this.back();
    if (this.msg > 0 && --this.msg === 0) this.msgT.setText('');

    const g = this.g; g.clear();
    // the tabs
    SHOP.forEach((tb, i) => {
      const x = TAB.x + i * (TAB.w + TAB.gap), on = i === this.tab;
      g.fillStyle(on ? C.panel : C.panel2, 1); g.fillRect(x, TAB.y, TAB.w, TAB.h);
      g.fillStyle(on ? C.line : C.dim, 1); g.fillRect(x, TAB.y, TAB.w, 2);
      this.tabT[i].setColor(on ? '#ffffff' : '#8a87a3');
    });
    // the money
    this.coin(g, W - 24 - this.coinT.width - 10, 69, t);
    this.coinT.setText(getCoins() + ' ' + CURRENCY.name);
    // the cards
    const shelf = SHOP[this.tab].items;
    for (let i = 0; i < PER; i++) {
      const [x, y] = this.cardAt(i), it = shelf[i], on = i === this.sel;
      g.fillStyle(on ? C.panel : 0x1e1030, 1); g.fillRect(x, y, GRID.w, GRID.h);
      g.lineStyle(on ? 2 : 1, on ? C.line : 0x3a2654, 1); g.strokeRect(x + 1, y + 1, GRID.w - 2, GRID.h - 2);
      g.fillStyle(0x140a20, 1); g.fillRect(x + 8, y + 8, GRID.w - 16, 56);                   // the icon window
      this.icon(g, x + GRID.w / 2, y + 36, 16, it, t + i * 9);
      this.cardName[i].setText(it ? it.name : 'COMING SOON').setColor(it ? '#e8e4f4' : '#5a4a70');
      this.cardPrice[i].setText(it ? it.price + ' ' + CURRENCY.name : '');
      if (on) { const p = (t % 60) / 60; g.lineStyle(1, 0xffffff, 0.5 * (1 - p)); g.strokeRect(x - 2 - p * 3, y - 2 - p * 3, GRID.w + 4 + p * 6, GRID.h + 4 + p * 6); }   // a soft pulse round the picked card
    }
    // the details panel
    const it = this.item();
    g.fillStyle(C.panel, 1); g.fillRect(SIDE.x, SIDE.y, SIDE.w, SIDE.h); g.fillStyle(C.line, 1); g.fillRect(SIDE.x, SIDE.y, SIDE.w, 2);
    g.fillStyle(0x140a20, 1); g.fillRect(SIDE.x + 12, SIDE.y + 12, SIDE.w - 24, 90);       // the big preview
    for (let i = 0; i < 5; i++) { g.fillStyle(C.line, 0.04); g.fillCircle(SIDE.x + SIDE.w / 2, SIDE.y + 57, 10 + i * 8 + Math.sin(t * 0.05) * 3); }
    this.icon(g, SIDE.x + SIDE.w / 2, SIDE.y + 57, 28, it, t);
    this.nameT.setText(it ? it.name : 'COMING SOON');
    this.infoT.setText(it ? it.info || '' : 'THIS SHELF IS EMPTY FOR NOW.\nCHECK BACK LATER.');
    this.priceT.setText(it ? it.price + ' ' + CURRENCY.name : '');
    const can = it && getCoins() >= it.price;
    g.fillStyle(can ? 0x3a8a3a : 0x3a2654, 1); g.fillRect(SIDE.x + 20, SIDE.y + SIDE.h - 40, SIDE.w - 40, 28);
    g.fillStyle(can ? 0x5ad05a : C.dim, 1); g.fillRect(SIDE.x + 20, SIDE.y + SIDE.h - 40, SIDE.w - 40, 2);
    this.buyT.setColor(can ? '#ffffff' : '#8a87a3');
  }
}

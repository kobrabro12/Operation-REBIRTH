// The Shop (TRINKETS > SHOP): the UI only, for now. Tabs of shelves along the top, a grid of item cards, and on the
// right the SHOPKEEPER - an old TV sitting on his desk, with Mason's faces on the screen (calm / happy /
// money / shock, picked by what you do: KEEPER in src/data/shop.js) and a speech bubble - over a panel with the picked
// item's name, description, price, the money counter and a BUY button. What's for sale lives in src/data/shop.js (empty slots read COMING SOON); buying isn't wired up yet.
// A/D or arrows move along a shelf (W/S: up and down a row), Q/E (or a pad's X/Y) switch tabs,
// J / Enter / A buys, K / Esc / B goes back. Mouse: click a tab or a card, BUY.
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { playMusic } from '../audio/music.js';
import { MenuInput } from './menuInput.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { SHOP, CURRENCY, getCoins, KEEPER } from '../data/shop.js';

const W = VIEW_W, H = VIEW_H;
const C = { bg: 0x0b0a14, panel: 0x2a1640, panel2: 0x1c0f2c, line: 0xc77dff, gold: 0xf3c358, dim: 0x5a4a70 };
const GRID = { x: 16, y: 84, cols: 4, rows: 2, w: 94, h: 108, gap: 6 };   // the item cards
const SIDE = { x: 424, y: 210, w: 200, h: 102 };                          // the details panel, under the shopkeeper's counter
const KP = { x: 524, y: 126 };                                            // the middle of the shopkeeper's TV (on his desk)
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
    this.coinT = txt(SIDE.x + SIDE.w - 10, SIDE.y + 10, '', 7, '#f3c358').setOrigin(1, 0);
    this.cardName = []; this.cardPrice = [];
    for (let i = 0; i < PER; i++) {
      const [x, y] = this.cardAt(i);
      this.cardName.push(txt(x + GRID.w / 2, y + 70, '', 6, '#e8e4f4', { align: 'center' }).setOrigin(0.5, 0));
      this.cardPrice.push(txt(x + GRID.w / 2, y + 88, '', 6, '#f3c358').setOrigin(0.5, 0));
    }
    this.nameT = txt(SIDE.x + 10, SIDE.y + 10, '', 8, '#ffffff');
    this.infoT = txt(SIDE.x + 10, SIDE.y + 28, '', 6, '#c9c4dc', { lineSpacing: 5, wordWrap: { width: SIDE.w - 20 } });
    this.priceT = txt(SIDE.x + 10, SIDE.y + 50, '', 7, '#f3c358');
    this.buyT = txt(SIDE.x + SIDE.w / 2, SIDE.y + SIDE.h - 20, 'BUY', 9, '#ffffff').setOrigin(0.5, 0.5);
    // the shopkeeper's face, on his screen (glowing: the line art is filled with the screen's colour)
    this.faceImg = this.add.sprite(KP.x, KP.y, 'shop_face_calm', 0).setTintMode(Phaser.TintModes.FILL).setTint(0x9affd8);
    this.front = this.add.graphics();                // over the face: scanlines, the glass, static
    this.bubbleT = txt(0, 0, '', 6, '#1a1024', { align: 'center' }).setOrigin(0.5, 0.5);
    this.face = 'calm'; this.faceT = 0; this.jolt = 0; this.faceStart = 0; this.static = 12; this.saying = ''; this.sayT = 0; this.lastSel = -1;
    this.react('happy', 'hello', 200);
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
      if (p.x >= SIDE.x + 20 && p.x <= SIDE.x + SIDE.w - 20 && p.y >= SIDE.y + SIDE.h - 34 && p.y <= SIDE.y + SIDE.h - 6) this.clicked = 'buy';
      if (Math.hypot(p.x - KP.x, p.y - KP.y) < 50) this.react('shock', 'poke');   // poke the shopkeeper
    });
  }

  cardAt(i) { const c = i % GRID.cols, r = Math.floor(i / GRID.cols); return [GRID.x + c * (GRID.w + GRID.gap), GRID.y + r * (GRID.h + GRID.gap)]; }
  setTab(i) { if (i !== this.tab) { this.tab = i; this.sel = 0; sfx('menu', 0.5, 1.2); this.react('happy', 'tab'); this.static = 8; } }
  item() { return SHOP[this.tab].items[this.sel] || null; }
  back() { sfx('menu', 0.6); this.scene.start('Trinkets'); }
  buy() {
    const it = this.item();
    if (!it) { this.react('shock', 'empty'); sfx('curse', 0.3, 1.5); return; }
    if (getCoins() < it.price) { this.react('shock', 'broke'); sfx('curse', 0.3, 1.5); return; }
    this.react('money', 'bought'); this.say('BUYING IS NOT SET UP YET.');   // (to be wired up with the items)
  }
  say(s) { this.msgT.setText(s); this.msg = 90; }
  // the shopkeeper reacts: a face (for `hold` frames, then back to his calm face) and a line from KEEPER.lines
  react(face, line, hold = KEEPER.hold) {
    if (face !== this.face) { this.static = 6; this.faceStart = this.t; sfx('glitch', 0.12, 1.8); }
    this.face = face; this.faceT = face === 'calm' ? 0 : hold;
    if (face !== 'calm') this.jolt = 10;                                                 // the set rocks a little on the desk
    const L = KEEPER.lines[line]; if (L) { this.saying = L[Math.floor(Math.random() * L.length)]; this.sayT = hold + 40; }
  }
  // him: an old CRT TV with rabbit-ear antennas, sitting on a wooden desk, Mason's faces on the screen
  keeper(g, t) {
    const floor = 206, desk = 172, hx = KP.x;
    const jolt = this.jolt > 0 ? this.jolt-- : 0, rock = jolt ? Math.round(Math.sin(jolt * 1.4) * jolt * 0.25) : 0;
    const hop = this.face === 'shock' && jolt > 4 ? -2 : 0, hy = KP.y + hop;
    // his nook: a back wall, a shelf of junk, the floor
    g.fillStyle(0x140a20, 1); g.fillRect(SIDE.x, 44, SIDE.w, floor - 42);
    g.fillStyle(0x221432, 1); g.fillRect(SIDE.x, 64, SIDE.w, 3); g.fillRect(SIDE.x, 118, SIDE.w, 3);
    for (const [x, y, w, h, c] of [[432, 50, 14, 14, 0x5a3a8a], [450, 54, 10, 10, 0xc77dff], [590, 48, 16, 16, 0x3a8a6a], [608, 56, 10, 8, 0xf3c358], [432, 102, 18, 16, 0x8a3a5a], [600, 98, 18, 20, 0x3a5a8a]]) { g.fillStyle(c, 0.8); g.fillRect(x, y, w, h); }
    g.fillStyle(0x221432, 1); g.fillRect(SIDE.x, floor, SIDE.w, 2);
    // the desk: a wooden top, a drawer with a brass handle, two legs - and a little bell
    g.fillStyle(0x000000, 0.35); g.fillEllipse(hx, floor, 150, 6);
    g.fillStyle(0x4a2a1a, 1); g.fillRect(hx - 72, desk, 144, 10); g.fillStyle(0x6a3e24, 1); g.fillRect(hx - 72, desk, 144, 3);
    g.fillStyle(0x3a2014, 1); g.fillRect(hx - 66, desk + 10, 8, floor - desk - 10); g.fillRect(hx + 58, desk + 10, 8, floor - desk - 10);
    g.fillStyle(0x4a2a1a, 1); g.fillRect(hx - 40, desk + 10, 80, 14); g.fillStyle(0xc8a040, 1); g.fillRect(hx - 6, desk + 16, 12, 2);
    g.fillStyle(0xc8a040, 1); g.fillEllipse(hx + 58, desk - 4, 14, 8); g.fillStyle(0xe8c060, 1); g.fillRect(hx + 57, desk - 11, 2, 4); g.fillRect(hx + 52, desk - 1, 12, 2);
    // the TV: casing, a screen in a rounded bezel, knobs, a grille, little feet, rabbit-ear antennas
    const tx = hx + rock;
    g.fillStyle(0x2a2632, 1); g.fillRect(tx - 36, desk - 4, 10, 4); g.fillRect(tx + 26, desk - 4, 10, 4);
    g.lineStyle(2, 0x8a8a9a, 1); g.lineBetween(tx - 10, hy - 40, tx - 28 - rock, hy - 62); g.lineBetween(tx + 10, hy - 40, tx + 26 - rock, hy - 64);
    g.fillStyle((t >> 4) % 2 ? 0xff5a5a : 0x8a2a2a, 1); g.fillCircle(tx - 28 - rock, hy - 62, 3); g.fillCircle(tx + 26 - rock, hy - 64, 3);
    g.fillStyle(0x6a6478, 1); g.fillRoundedRect(tx - 46, hy - 40, 92, 80, 10); g.fillStyle(0x837d92, 1); g.fillRoundedRect(tx - 46, hy - 40, 92, 6, 3);
    g.fillStyle(0x2a2632, 1); g.fillRoundedRect(tx - 42, hy - 36, 76, 72, 8);
    g.fillStyle(0x061a14, 1); g.fillRoundedRect(tx - 40, hy - 34, 72, 68, 7);
    this.glow(g, tx - 4, hy, 38, 0x5affb8, 0.18);
    for (let i = 0; i < 2; i++) { g.fillStyle(0x2a2632, 1); g.fillCircle(tx + 39, hy - 22 + i * 16, 4); g.fillStyle(0x9a94a8, 1); g.fillRect(tx + 38, hy - 26 + i * 16 + ((t >> 5) + i) % 3, 2, 4); }
    for (let i = 0; i < 4; i++) { g.fillStyle(0x2a2632, 1); g.fillRect(tx + 35, hy + 10 + i * 5, 8, 2); }
    g.fillStyle((t >> 5) % 2 ? 0x5aff8a : 0x2a8a4a, 1); g.fillRect(tx + 37, hy + 32, 3, 2);                     // the power light
    // the face on the screen: the current face's strip, animated if it has more than one frame
    const key = 'shop_face_' + this.face, F = KEEPER.faces[this.face], n = Math.max(1, this.textures.get(key).frameTotal - 1);
    this.faceImg.setTexture(key, Math.floor((t - this.faceStart) * F.fps / 60) % n).setPosition(tx - 4, hy).setScale(1).setVisible(this.static <= 0 || this.static % 2 === 0);
    const f = this.front; f.clear();
    for (let y = hy - 34; y < hy + 34; y += 2) { f.fillStyle(0x000000, 0.22); f.fillRect(tx - 40, y, 72, 1); }        // scanlines
    f.fillStyle(0xffffff, 0.06); f.fillEllipse(tx - 18, hy - 20, 32, 12);                                          // the glass
    if (this.static > 0) { this.static--; for (let i = 0; i < 70; i++) { f.fillStyle(Math.random() < 0.5 ? 0xd8fff0 : 0x2a4a3a, 1); f.fillRect(tx - 40 + Math.random() * 70, hy - 34 + Math.random() * 66, 2, 1); } }   // static when the channel changes
    if (this.face === 'shock' && this.faceT > KEEPER.hold - 24) { const d = KEEPER.hold - this.faceT; f.lineStyle(2, 0xffffff, 1 - d / 24); for (const s of [-1, 1]) { f.lineBetween(tx + s * 52, hy - 30, tx + s * 60, hy - 38); f.lineBetween(tx + s * 54, hy - 18, tx + s * 64, hy - 20); } }   // !! lines
    if (this.face === 'money' && this.faceT > 0) for (let i = 0; i < 4; i++) { const p = ((t + i * 15) % 60) / 60; f.fillStyle(0xf3c358, 1 - p); f.fillRect(tx - 30 + i * 20, hy - 44 - p * 24, 3, 3); }   // coins of light, floating up
    // the speech bubble
    if (this.sayT > 0 && this.saying) {
      this.sayT--;
      this.bubbleT.setText(this.saying).setVisible(true);
      const bw = Math.max(80, this.bubbleT.width + 16), bh = 20, bx = Math.min(W - bw - 70, hx - 64 - bw / 2), by = 14;
      f.fillStyle(0xf4f0fa, 1); f.fillRoundedRect(bx, by, bw, bh, 6); f.fillTriangle(bx + bw - 26, by + bh, bx + bw - 12, by + bh, tx - 30, hy - 44);
      this.bubbleT.setPosition(bx + bw / 2, by + bh / 2);
    } else this.bubbleT.setVisible(false);
  }
  glow(g, x, y, r, col, a) { for (let i = 1; i <= 5; i++) { g.fillStyle(col, a / 5); g.fillCircle(x, y, r * (1.15 - i * 0.17)); } }

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
    if (this.sel !== this.lastSel) { if (this.lastSel >= 0 && this.item()) this.react('money', 'look'); this.lastSel = this.sel; }   // eyeing something for sale: $ $
    if (this.faceT > 0 && --this.faceT === 0) this.react('calm');

    const g = this.g; g.clear();
    this.keeper(g, t);
    // the tabs
    SHOP.forEach((tb, i) => {
      const x = TAB.x + i * (TAB.w + TAB.gap), on = i === this.tab;
      g.fillStyle(on ? C.panel : C.panel2, 1); g.fillRect(x, TAB.y, TAB.w, TAB.h);
      g.fillStyle(on ? C.line : C.dim, 1); g.fillRect(x, TAB.y, TAB.w, 2);
      this.tabT[i].setColor(on ? '#ffffff' : '#8a87a3');
    });
    // the money
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
    this.nameT.setText(it ? it.name : 'COMING SOON');
    this.infoT.setText(it ? it.info || '' : 'THIS SHELF IS EMPTY FOR NOW.');
    this.priceT.setText(it ? it.price + ' ' + CURRENCY.name : '');
    const can = it && getCoins() >= it.price;
    g.fillStyle(can ? 0x3a8a3a : 0x3a2654, 1); g.fillRect(SIDE.x + 20, SIDE.y + SIDE.h - 34, SIDE.w - 40, 28);
    g.fillStyle(can ? 0x5ad05a : C.dim, 1); g.fillRect(SIDE.x + 20, SIDE.y + SIDE.h - 34, SIDE.w - 40, 2);
    this.buyT.setColor(can ? '#ffffff' : '#8a87a3');
    this.coin(g, SIDE.x + SIDE.w - 18 - this.coinT.width, SIDE.y + 13, t);          // the money, with its little spinning coin
  }
}

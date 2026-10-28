// The Shop (TRINKETS > SHOP). Tabs of shelves along the top, a grid of item cards, and on the right the SHOPKEEPER -
// an old TV sitting on his desk, with Mason's faces on the screen (calm / happy / money / shock / smug, picked by what
// you do: KEEPER in src/data/shop.js) and a speech bubble - over a panel with the picked item's name, description and
// the BUY button. What's for sale lives in src/data/shop.js; coins, what you own and what's switched on live in
// src/progress.js. Buying a stage effect, track or extra switches it on; press the button again to switch it off
// (or back on). Costumes are picked on the select screen once bought. Picking a track plays a preview.
// A/D or arrows move along a shelf (W/S: up and down a row), Q/E (or a pad's X/Y) switch tabs,
// J / Enter / A buys, K / Esc / B goes back. Mouse: click a tab or a card, BUY.
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { playMusic } from '../audio/music.js';
import { MenuInput } from './menuInput.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { SHOP, CURRENCY, KEEPER } from '../data/shop.js';
import { getCoins, buyItem, owns, toggleEquip, isEquipped } from '../progress.js';
import { fighterById, showFighter } from '../fighters/roster.js';
import { skinsFor } from '../fighters/skins.js';

const W = VIEW_W, H = VIEW_H;
const C = { bg: 0x0b0a14, panel: 0x2a1640, panel2: 0x1c0f2c, line: 0xc77dff, gold: 0xf3c358, dim: 0x5a4a70 };
const GRID = { x: 16, y: 84, cols: 4, rows: 2, w: 94, h: 108, gap: 6 };   // the item cards
const SIDE = { x: 424, y: 210, w: 200, h: 102 };                          // the details panel, under the shopkeeper's counter
const KP = { x: 524, y: 126 };                                            // the middle of the shopkeeper's TV (on his desk)
const TAB = { x: 16, y: 56, w: 77, h: 20, gap: 4 };
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
    this.coinT = txt(W - 14, 34, '', 8, '#f3c358', { stroke: '#0b0a14', strokeThickness: 3 }).setOrigin(1, 0.5);
    this.cardName = []; this.cardPrice = []; this.cardSpr = [];
    for (let i = 0; i < PER; i++) {
      const [x, y] = this.cardAt(i);
      this.cardName.push(txt(x + GRID.w / 2, y + 70, '', 6, '#e8e4f4', { align: 'center' }).setOrigin(0.5, 0));
      this.cardPrice.push(txt(x + GRID.w / 2, y + 88, '', 6, '#f3c358').setOrigin(0.5, 0));
      this.cardSpr.push(this.add.sprite(x + GRID.w / 2, y + 62, 'ss_idle', 0).setVisible(false));   // a costume, worn by its fighter
    }
    this.nameT = txt(SIDE.x + 10, SIDE.y + 10, '', 8, '#ffffff');
    this.infoT = txt(SIDE.x + 10, SIDE.y + 24, '', 6, '#c9c4dc', { lineSpacing: 4, wordWrap: { width: SIDE.w - 20 } });
    this.buyT = txt(SIDE.x + SIDE.w / 2, SIDE.y + SIDE.h - 20, 'BUY', 9, '#ffffff').setOrigin(0.5, 0.5);
    // the shopkeeper's face, on his screen (glowing: the line art is filled with the screen's colour)
    this.faceImg = this.add.sprite(KP.x, KP.y, 'shop_face_calm', 0).setTintMode(Phaser.TintModes.FILL).setTint(0x9affd8);
    this.front = this.add.graphics();                // over the face: scanlines, the glass, static
    this.bubbleT = txt(0, 0, '', 6, '#1a1024', { align: 'center' }).setOrigin(0.5, 0.5);
    this.face = 'calm'; this.faceT = 0; this.jolt = 0; this.faceStart = 0; this.static = 12; this.saying = ''; this.sayT = 0; this.lastSel = -1;
    this.react('happy', 'hello', 200);
    this.msgT = txt(W / 2, H - 22, '', 7, '#ff8a8a').setOrigin(0.5, 1);
    this.add.text(W / 2, H - 8, 'A/D W/S PICK   Q/E TAB   J / ENTER / A BUY / SWITCH ON   K / ESC / B  BACK', { fontFamily: FONT, fontSize: '5px', color: '#8a87a3' }).setOrigin(0.5, 1);
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
  setTab(i) { if (i !== this.tab) { this.tab = i; this.sel = 0; this.lastSel = 0; this.preview(); sfx('menu', 0.5, 1.2); if (SHOP[i].name === 'GAMBLING') this.react('money', 'gamble'); else this.react('happy', 'tab'); this.static = 8; } }
  item() { return SHOP[this.tab].items[this.sel] || null; }
  back() { sfx('menu', 0.6); playMusic(this, 'bgm_title'); this.scene.start('Trinkets'); }
  // a music card picked: play that track; anything else: the shop goes back to the title music
  preview() { const it = this.item(); playMusic(this, it && it.kind === 'music' ? 'bgm_shop_' + it.id.slice(4) : 'bgm_title', it && it.kind === 'music' ? 0.55 : 0.6); }
  // what the big button says for this item
  label(it) {
    if (!it) return '-';
    if (it.gacha) return 'SPIN';
    if (!owns(it.id)) return 'BUY';
    if (it.kind === 'costume') return 'OWNED';
    return isEquipped(it.kind, it.id) ? 'SWITCH OFF' : 'SWITCH ON';
  }
  buy() {
    const it = this.item();
    if (!it) { this.react('shock', 'empty'); sfx('curse', 0.3, 1.5); return; }
    if (!it.gacha && owns(it.id)) {                                                   // already yours
      if (it.kind === 'costume') { this.react('smug', 'owned'); this.say('PICK IT ON THE SELECT SCREEN.', '#c9c4dc'); return; }
      const on = toggleEquip(it.kind, it.id);
      if (on) { this.react('smug', 'equip'); sfx('ding', 0.3, 1.3); } else { this.react('happy', 'unequip'); sfx('menu', 0.5, 0.8); }
      this.say(on ? it.name + ' IS ON' + (it.kind === 'extra' ? '' : ' (ONLY ONE AT A TIME)') : it.name + ' IS OFF', on ? '#7aff8a' : '#c9c4dc');
      return;
    }
    if (getCoins() < it.price) { this.react('shock', it.gacha ? 'spin' : 'broke'); sfx('curse', 0.3, 1.5); return; }
    if (it.gacha) { this.react('money', 'spin'); this.say('THE MACHINES AREN\'T STOCKED YET.'); return; }   // (no prizes in GACHA yet: nothing is charged)
    buyItem(it.id, it.price);
    this.react('smug', 'bought', 140); sfx('ding', 0.45, 1.6); this.static = 8;
    if (it.kind === 'costume') { this.say('NEW COSTUME! PICK IT ON THE SELECT SCREEN.', '#7aff8a'); return; }
    if (!isEquipped(it.kind, it.id)) toggleEquip(it.kind, it.id);                   // bought it: it's switched on right away
    this.say(it.name + ' IS ON. PRESS AGAIN TO SWITCH IT OFF.', '#7aff8a');
  }
  say(s, color = '#ff8a8a') { this.msgT.setText(s).setColor(color); this.msg = 120; }
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
    // ...and alive: every face moves a little in its own way (see faceMotion)
    const [mx, my, msx, msy] = this.faceMotion(t);
    this.faceImg.setTexture(key, Math.floor((t - this.faceStart) * F.fps / 60) % n).setPosition(Math.round(tx - 4 + mx), Math.round(hy + my)).setScale(msx, msy).setVisible(this.static <= 0 || this.static % 2 === 0);
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
  // a gacha machine: a glass globe of coloured capsules on a base in the machine's colour, a coin slot, a crank that
  // turns, the prize chute - and a badge for the 10-pull bundles (or a ? for the mystery one)
  machine(g, cx, cy, s, it, t) {
    const col = it.color ?? C.gold, k = s / 16, R = 11 * k, gy = cy - 5 * k;
    g.fillStyle(0x1a1424, 1); g.fillRect(cx - 12 * k, cy + 4 * k, 24 * k, 13 * k);          // the base
    g.fillStyle(col, 1); g.fillRect(cx - 11 * k, cy + 5 * k, 22 * k, 11 * k);
    g.fillStyle(0xffffff, 0.3); g.fillRect(cx - 11 * k, cy + 5 * k, 22 * k, 2 * k);
    g.fillStyle(0x1a1424, 1); g.fillRect(cx - 4 * k, cy + 11 * k, 8 * k, 4 * k); g.fillRect(cx + 5 * k, cy + 7 * k, 3 * k, 1 * k);   // the chute, the coin slot
    const a = t * 0.05; g.lineStyle(Math.max(1, k * 1.5), 0xe8e4f4, 1); g.lineBetween(cx - 6 * k, cy + 9 * k, cx - 6 * k + Math.cos(a) * 3 * k, cy + 9 * k + Math.sin(a) * 3 * k);   // the crank
    g.fillStyle(0x1a1424, 1); g.fillCircle(cx, gy, R + 1);                                   // the globe...
    g.fillStyle(0x2a3a5a, 0.6); g.fillCircle(cx, gy, R);
    const caps = [0xff5a6a, 0x5ad0ff, 0xf3c358, 0x7aff8a, 0xc77dff, 0xff9a3a, 0xffffff];
    for (let i = 0; i < 9; i++) {                                                            // ...full of capsules, jostling
      const px = cx + ((i % 3) - 1) * 6 * k + Math.sin(t * 0.08 + i) * 0.6 * k, py = gy + 4 * k - Math.floor(i / 3) * 5 * k + Math.cos(t * 0.07 + i) * 0.5 * k;
      g.fillStyle(caps[(i * 3 + (it.gacha.machine === 'golden' ? 2 : 0)) % caps.length], 1); g.fillCircle(px, py, 2.6 * k); g.fillStyle(0xffffff, 0.8); g.fillRect(px - 2.6 * k, py - 0.3 * k, 5.2 * k, 0.8 * k);
    }
    g.fillStyle(0xffffff, 0.35); g.fillEllipse(cx - 4 * k, gy - 5 * k, 6 * k, 3 * k);       // the glass shine
    g.fillStyle(col, 1); g.fillRect(cx - 3 * k, gy - R - 2 * k, 6 * k, 3 * k);               // the cap on top
    if (it.gacha.pulls > 1) { g.fillStyle(0xd8223a, 1); g.fillCircle(cx + 10 * k, gy - 8 * k, 4.5 * k); g.fillStyle(0xffffff, 1); g.fillRect(cx + 7.5 * k, gy - 9 * k, 1 * k, 3 * k); g.fillCircle(cx + 11.5 * k, gy - 7.5 * k, 1.5 * k); }   // x10 badge (a 1 and a 0)
    if (it.gacha.machine === 'mystery') { g.fillStyle(0x1a1424, 0.8); g.fillCircle(cx, gy, R); g.fillStyle(0xc77dff, 1); g.fillRect(cx - 3 * k, gy - 6 * k, 6 * k, 2 * k); g.fillRect(cx + 2 * k, gy - 5 * k, 2 * k, 4 * k); g.fillRect(cx - 1 * k, gy - 1 * k, 3 * k, 2 * k); g.fillRect(cx - 1 * k, gy + 3 * k, 2 * k, 2 * k); }   // a ? over a dark globe
  }
  // how his face moves on the screen: [x, y, x scale, y scale]
  //   calm  drifts slowly up and down, and now and then blinks (the face squashes flat for a moment)
  //   happy bobs along to a little beat, swaying side to side
  //   money hops up and down fast, excited, with a jitter
  //   shock shakes, hard at first, then trembling
//   smug  leans slowly side to side, pleased with itself, with a little lift now and then
  faceMotion(t) {
    const d = t - this.faceStart;
    switch (this.face) {
      case 'happy': { const b = Math.abs(Math.sin(d * 0.12)); return [Math.sin(d * 0.06) * 1.5, -b * 3, 1, 1]; }
      case 'money': { const h = Math.abs(Math.sin(d * 0.22)); return [(d % 6 < 3 ? 1 : -1), -h * 2.5, 1, 1]; }
      case 'shock': { const a = d < 20 ? 3 : 1; return [(Math.random() - 0.5) * 2 * a, (Math.random() - 0.5) * a, 1, 1]; }
      case 'smug': { const brow = (d % 100) < 10 ? -1.5 : 0; return [Math.sin(d * 0.03) * 2.5, brow, 1, 1]; }      // smug: a slow, knowing sway, now and then a little lift
      default: { const blink = (t % 210) < 6 ? 0.15 : 1; return [Math.sin(t * 0.021) * 1, Math.sin(t * 0.035) * 1.5, 1, blink]; }
    }
  }
  glow(g, x, y, r, col, a) { for (let i = 1; i <= 5; i++) { g.fillStyle(col, a / 5); g.fillCircle(x, y, r * (1.15 - i * 0.17)); } }

  // a placeholder icon: a little gift box in the item's colour (or an empty, dashed slot)
  icon(g, cx, cy, s, it, t) {
    if (it && it.gacha) return this.machine(g, cx, cy, s, it, t);
    if (!it) {                                                                           // an empty slot: a dashed square and a ?
      g.fillStyle(C.dim, 1);
      for (let d = -s; d < s; d += 6) { g.fillRect(cx + d, cy - s, 3, 1); g.fillRect(cx + d, cy + s, 3, 1); g.fillRect(cx - s, cy + d, 1, 3); g.fillRect(cx + s, cy + d, 1, 3); }
      g.fillRect(cx - 4, cy - 8, 8, 2); g.fillRect(cx + 3, cy - 7, 2, 5); g.fillRect(cx - 1, cy - 3, 4, 2); g.fillRect(cx - 1, cy - 2, 2, 4); g.fillRect(cx - 1, cy + 4, 2, 2);
      return;
    }
    if (it.kind === 'costume') return;                                                  // (a sprite: drawn in update)
    if (it.kind === 'music') return this.vinyl(g, cx, cy, s, it, t);
    if (it.kind === 'fx') return this.scenery(g, cx, cy, it, t);
    if (it.kind === 'extra') return this.glyph(g, cx, cy, it, t);
    const col = it.color ?? C.gold, bob = Math.sin(t * 0.06) * 2;
    g.fillStyle(col, 1); g.fillRect(cx - s * 0.7, cy - s * 0.3 + bob, s * 1.4, s);
    g.fillStyle(0xffffff, 0.25); g.fillRect(cx - s * 0.7, cy - s * 0.3 + bob, s * 1.4, 3);
    g.fillStyle(0xffffff, 1); g.fillRect(cx - 2, cy - s * 0.3 + bob, 4, s); g.fillRect(cx - s * 0.8, cy - s * 0.45 + bob, s * 1.6, 5);
    g.fillEllipse(cx - 6, cy - s * 0.55 + bob, 10, 6); g.fillEllipse(cx + 6, cy - s * 0.55 + bob, 10, 6);
  }
  // a record spinning on a little turntable, its label in the track's colour
  vinyl(g, cx, cy, s, it, t) {
    const col = it.color ?? C.gold, on = owns(it.id) && isEquipped('music', it.id), a = t * (on || it === this.item() ? 0.08 : 0.02);
    g.fillStyle(0x2a2030, 1); g.fillRect(cx - 26, cy - 22, 52, 46);
    g.fillStyle(0x0a0810, 1); g.fillCircle(cx - 3, cy + 1, 20);
    g.lineStyle(1, 0x2a2638, 1); for (const r of [17, 14, 11]) g.strokeCircle(cx - 3, cy + 1, r);
    g.fillStyle(0xffffff, 0.12); g.fillTriangle(cx - 3, cy + 1, cx - 3 + Math.cos(a) * 20, cy + 1 + Math.sin(a) * 20, cx - 3 + Math.cos(a + 0.5) * 20, cy + 1 + Math.sin(a + 0.5) * 20);   // the shine, going round
    g.fillStyle(col, 1); g.fillCircle(cx - 3, cy + 1, 7); g.fillStyle(0x0a0810, 1); g.fillCircle(cx - 3, cy + 1, 1.5);
    g.fillStyle(0xffffff, 0.8); g.fillCircle(cx - 3 + Math.cos(a * 2) * 4, cy + 1 + Math.sin(a * 2) * 4, 1);
    g.lineStyle(2, 0xb8b4c8, 1); g.lineBetween(cx + 21, cy - 18, cx + 19, cy + 2); g.lineBetween(cx + 19, cy + 2, cx + 9, cy + 8);   // the tone arm
    g.fillStyle(0xb8b4c8, 1); g.fillCircle(cx + 21, cy - 18, 3);
    if (on || it === this.item()) for (let i = 0; i < 2; i++) { const p = ((t + i * 30) % 60) / 60; g.fillStyle(col, 1 - p); g.fillRect(cx + 14 + i * 6, cy - 14 - p * 14, 3, 3); g.fillRect(cx + 16 + i * 6, cy - 22 - p * 14, 1, 9); }   // notes floating up
  }
  // a little window onto a stage with the effect on it: sky, a floating platform, the weather
  scenery(g, cx, cy, it, t) {
    const X = cx - 38, Y = cy - 27, w = 76, h = 54;
    const sky = { 'fx-night': 0x0a1440, 'fx-storm': 0x283044, 'fx-snow': 0x8aa0c0, 'fx-sakura': 0xf0b8c8, 'fx-fireflies': 0x2a1a4a, 'fx-bloodmoon': 0x3a0808, 'fx-sand': 0xc8945a, 'fx-aurora': 0x061830 }[it.id] ?? 0x3a4a8a;
    g.fillStyle(sky, 1); g.fillRect(X, Y, w, h);
    const rnd = (i, k) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
    switch (it.id) {
      case 'fx-night': for (let i = 0; i < 14; i++) { g.fillStyle(0xffffff, 0.4 + 0.6 * ((Math.sin(t * 0.1 + i * 3) + 1) / 2)); g.fillRect(X + rnd(i, 1) * w, Y + rnd(i, 2) * h * 0.6, 1, 1); }
        g.fillStyle(0xfff4c8, 1); g.fillCircle(X + 58, Y + 12, 6); g.fillStyle(sky, 1); g.fillCircle(X + 61, Y + 10, 5); break;
      case 'fx-storm': { if (t % 90 < 4) { g.fillStyle(0xffffff, 0.7); g.fillRect(X, Y, w, h); g.lineStyle(1, 0xffffff, 1); g.lineBetween(X + 50, Y, X + 46, Y + 14); g.lineBetween(X + 46, Y + 14, X + 52, Y + 20); g.lineBetween(X + 52, Y + 20, X + 47, Y + 34); }
        g.fillStyle(0x1a1e2a, 1); g.fillEllipse(X + 20, Y + 6, 40, 14); g.fillEllipse(X + 54, Y + 4, 44, 12);
        g.lineStyle(1, 0x8ab0ff, 0.7); for (let i = 0; i < 14; i++) { const x = X + ((rnd(i, 3) * w + t * 0.6) % w), y = Y + ((rnd(i, 4) * h + t * 2.5) % h); g.lineBetween(x, y, x - 2, y + 5); } break; }
      case 'fx-snow': g.fillStyle(0xffffff, 1); for (let i = 0; i < 18; i++) g.fillRect(X + ((rnd(i, 5) * w + t * 0.5) % w), Y + ((rnd(i, 6) * h + t * 0.4 * (1 + rnd(i, 7))) % h), 2, 2); break;
      case 'fx-sakura': for (let i = 0; i < 12; i++) { g.fillStyle(i % 2 ? 0xff7aa8 : 0xffd0e0, 1); g.fillRect(X + ((rnd(i, 8) * w + t * 0.3 + Math.sin(t * 0.05 + i) * 4) % w), Y + ((rnd(i, 9) * h + t * 0.3) % h), 3, 2); } break;
      case 'fx-fireflies': for (let i = 0; i < 10; i++) { const fx = X + 8 + rnd(i, 10) * (w - 16) + Math.sin(t * 0.03 + i * 2) * 5, fy = Y + 8 + rnd(i, 11) * (h - 22) + Math.cos(t * 0.025 + i) * 4, a = (Math.sin(t * 0.08 + i * 1.7) + 1) / 2; g.fillStyle(0xd8ff6a, 0.3 * a); g.fillCircle(fx, fy, 4); g.fillStyle(0xf4ffb0, 0.3 + 0.7 * a); g.fillRect(fx - 1, fy - 1, 2, 2); } break;
      case 'fx-bloodmoon': g.fillStyle(0xc81a1a, 0.25); g.fillCircle(X + 38, Y + 22, 22); g.fillStyle(0xd8261a, 1); g.fillCircle(X + 38, Y + 22, 15); g.fillStyle(0xa81010, 1); g.fillCircle(X + 32, Y + 18, 3); g.fillCircle(X + 43, Y + 27, 4); break;
      case 'fx-sand': for (let i = 0; i < 6; i++) { g.fillStyle(0xe8c088, 0.5); const sx = X + ((rnd(i, 12) * w + t * 2) % (w + 20)) - 20; g.fillRect(Math.max(X, sx), Y + rnd(i, 13) * h, Math.min(20, X + w - Math.max(X, sx)), 1); }
        g.fillStyle(0x6a4a2a, 1); for (let i = 0; i < 20; i++) g.fillRect(X + ((rnd(i, 14) * w + t * 2.2) % w), Y + rnd(i, 15) * h, 1, 1); break;
      case 'fx-aurora': for (let b = 0; b < 3; b++) for (let i = 0; i < w; i += 2) { const y = Y + 10 + b * 6 + Math.sin(i * 0.1 + t * 0.03 + b) * 4; g.fillStyle([0x3affa8, 0x5ad0ff, 0xb05aff][b], 0.4); g.fillRect(X + i, y, 2, 8); } break;
    }
    // the stage: a floating island
    g.fillStyle(0x4a3a5a, 1); g.fillTriangle(X + 18, Y + 44, X + 58, Y + 44, X + 38, Y + 54); g.fillStyle(it.id === 'fx-snow' ? 0xffffff : it.id === 'fx-sand' ? 0xe8c088 : 0x6ac87a, 1); g.fillRect(X + 16, Y + 41, 44, 4);
    if (it.id === 'fx-bloodmoon') { g.fillStyle(0xff2020, 0.18); g.fillRect(X, Y, w, h); }
    g.lineStyle(1, 0x3a2654, 1); g.strokeRect(X, Y, w, h);
  }
  // an extra: a little picture of what it does
  glyph(g, cx, cy, it, t) {
    const col = it.color ?? C.gold, b = Math.sin(t * 0.08);
    switch (it.id) {
      case 'ext-numbers': { const p = (t % 50) / 50; g.fillStyle(0x5a4a70, 1); g.fillRect(cx - 6, cy + 2, 12, 18); g.fillCircle(cx, cy - 2, 6);   // a dummy, and its damage floating up
        g.fillStyle(0xffffff, 1 - p); g.fillRect(cx + 4 - p * 4, cy - 10 - p * 14, 2, 8); g.fillStyle(0xff5a3a, 1 - p); for (const [x, y, ww, hh] of [[0, 0, 6, 2], [4, 0, 2, 8], [0, 3, 6, 2], [0, 6, 6, 2]]) g.fillRect(cx + 8 + x - p * 4, cy - 10 - p * 14 + y, ww, hh); break; }
      case 'ext-confetti': for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, p = (t % 70) / 70, r = 4 + p * 24; g.fillStyle([0xff5a6a, 0x5ad0ff, 0xf3c358, 0x7aff8a, 0xc77dff][i % 5], 1 - p * 0.7); g.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r + p * p * 10, 3, 2); } break;
      case 'ext-finalcam': g.fillStyle(0x000000, 1); g.fillRect(cx - 34, cy - 24, 68, 8); g.fillRect(cx - 34, cy + 16, 68, 8);   // letterbox bars and a clock running slow
        g.lineStyle(2, 0xffffff, 1); g.strokeCircle(cx, cy - 4, 12); { const a = t * 0.015; g.lineBetween(cx, cy - 4, cx + Math.cos(a) * 9, cy - 4 + Math.sin(a) * 9); g.lineBetween(cx, cy - 4, cx, cy - 11); } break;
      case 'ext-hats': { const y = cy + 12 + Math.abs(b) * -3; g.fillStyle(0x3a8ad8, 1); g.fillTriangle(cx - 12, y, cx + 12, y, cx, y - 30); g.fillStyle(0xf3c358, 1); for (let i = 0; i < 3; i++) g.fillRect(cx - 8 + i * 5, y - 7 - i * 7, 4, 3); g.fillStyle(0xff5a9a, 1); g.fillCircle(cx, y - 31, 4); g.fillStyle(0xffffff, 1); g.fillRect(cx - 13, y - 1, 26, 3); break; }
      case 'ext-moon': { g.fillStyle(0xd8d8e8, 1); g.fillCircle(cx - 14, cy - 10, 10); g.fillStyle(0xa8a8b8, 1); g.fillCircle(cx - 17, cy - 12, 2); g.fillCircle(cx - 10, cy - 6, 3);   // the moon, and someone floating up past it
        const fy = cy + 8 - (Math.sin(t * 0.03) + 1) * 10; g.fillStyle(0xc77dff, 1); g.fillRect(cx + 10, fy, 8, 10); g.fillCircle(cx + 14, fy - 3, 4); g.fillStyle(0xffffff, 0.4); for (let i = 1; i < 4; i++) g.fillRect(cx + 13, fy + 10 + i * 4, 2, 2); break; }
      case 'ext-airhorn': { const blast = (t % 60) < 20; g.fillStyle(0xd8223a, 1); g.fillRect(cx - 20, cy - 2, 12, 12); g.fillStyle(0xe8e4f4, 1); g.fillRect(cx - 18, cy - 10, 8, 8); g.fillTriangle(cx - 8, cy + 4, cx + 14, cy - 8, cx + 14, cy + 16);
        if (blast) { g.lineStyle(2, col, 1); for (let i = 0; i < 3; i++) g.strokeCircle(cx + 16, cy + 4, 4 + i * 5 + (t % 20) * 0.25); } break; }
      case 'ext-rainbow': { const C7 = [0xff4a4a, 0xff9a3a, 0xf3e358, 0x5aff6a, 0x4ac8ff, 0x8a6aff]; for (let i = 0; i < 6; i++) for (let x = 0; x < 44; x += 2) { g.fillStyle(C7[i], x / 44); g.fillRect(cx - 30 + x, cy + 6 - x * 0.4 + i * 2 + Math.sin(x * 0.2 - t * 0.1), 2, 2); }
        g.fillStyle(0xffffff, 1); g.fillCircle(cx + 16, cy - 12, 5); break; }
      case 'ext-impact': { const flip = (t % 40) < 6; g.fillStyle(flip ? 0xffffff : 0x000000, 1); g.fillRect(cx - 38, cy - 27, 76, 54); g.fillStyle(flip ? 0x000000 : 0xffffff, 1);
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillTriangle(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, cx + Math.cos(a + 0.14) * 25, cy + Math.sin(a + 0.14) * 25, cx + Math.cos(a - 0.14) * 25, cy + Math.sin(a - 0.14) * 25); } break; }
      default: g.fillStyle(col, 1); g.fillCircle(cx, cy, 10);
    }
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
    if (this.sel !== this.lastSel) { if (this.lastSel >= 0 && this.item()) this.react(owns(this.item().id) ? 'smug' : 'money', this.item().gacha ? 'gamble' : owns(this.item().id) ? 'owned' : 'look'); this.lastSel = this.sel; this.preview(); }   // eyeing something for sale: $ $
    if (this.faceT > 0 && --this.faceT === 0) this.react('calm');

    const g = this.g; g.clear();
    this.keeper(g, t);
    // the tabs
    SHOP.forEach((tb, i) => {
      const x = TAB.x + i * (TAB.w + TAB.gap), on = i === this.tab;
      g.fillStyle(on ? C.panel : C.panel2, 1); g.fillRect(x, TAB.y, TAB.w, TAB.h);
      const lucky = tb.name === 'GAMBLING';                                              // the gambling tab: trimmed in gold, flashing
      g.fillStyle(lucky ? ((t >> 4) % 2 ? C.gold : 0xd8223a) : on ? C.line : C.dim, 1); g.fillRect(x, TAB.y, TAB.w, 2);
      this.tabT[i].setColor(on ? '#ffffff' : tb.name === 'GAMBLING' ? '#f3c358' : '#8a87a3');
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
      const mine = it && !it.gacha && owns(it.id), lit = mine && isEquipped(it.kind, it.id);
      this.cardPrice[i].setText(!it ? '' : lit ? 'ON' : mine ? 'OWNED' : it.price + ' ' + CURRENCY.name).setColor(lit ? '#7aff8a' : mine ? '#c9c4dc' : '#f3c358');
      if (lit) { g.fillStyle(0x7aff8a, 1); g.fillCircle(x + GRID.w - 12, y + 13, 3); }                                   // a green light: switched on
      // a costume: its fighter wearing it, idling (scaled to fit the window)
      const spr = this.cardSpr[i], fd = it && it.kind === 'costume' ? fighterById(it.fighter) : null;
      if (fd && fd.def) {
        const si = skinsFor(fd.def.id).findIndex((k) => k.name === it.skin);
        showFighter(spr.setVisible(true), fd.def, Math.floor((t + i * 7) / 6), Math.max(0, si));
        spr.setScale(Math.min(1, 54 / spr.frame.height, 74 / spr.frame.width * 1.3)).setPosition(x + GRID.w / 2, y + 62);
      } else spr.setVisible(false);
      if (on) { const p = (t % 60) / 60; g.lineStyle(1, 0xffffff, 0.5 * (1 - p)); g.strokeRect(x - 2 - p * 3, y - 2 - p * 3, GRID.w + 4 + p * 6, GRID.h + 4 + p * 6); }   // a soft pulse round the picked card
    }
    // the details panel
    const it = this.item();
    g.fillStyle(C.panel, 1); g.fillRect(SIDE.x, SIDE.y, SIDE.w, SIDE.h); g.fillStyle(C.line, 1); g.fillRect(SIDE.x, SIDE.y, SIDE.w, 2);
    this.nameT.setText(it ? it.name : 'COMING SOON');
    this.infoT.setText(it ? it.info || '' : 'THIS SHELF IS EMPTY FOR NOW.');
    const lab = this.label(it), mine = it && !it.gacha && owns(it.id);
    this.buyT.setText(lab === 'BUY' || lab === 'SPIN' ? lab + '  ' + it.price : lab);
    const can = it && (mine ? it.kind !== 'costume' : getCoins() >= it.price);
    g.fillStyle(can ? 0x3a8a3a : 0x3a2654, 1); g.fillRect(SIDE.x + 20, SIDE.y + SIDE.h - 34, SIDE.w - 40, 28);
    g.fillStyle(can ? 0x5ad05a : C.dim, 1); g.fillRect(SIDE.x + 20, SIDE.y + SIDE.h - 34, SIDE.w - 40, 2);
    this.buyT.setColor(can ? '#ffffff' : '#8a87a3');
    this.coin(g, W - 22 - this.coinT.width, 34, t);                                   // the money, with its little spinning coin
  }
}

// The Shop (TRINKETS > SHOP): the UI only, for now. Tabs of shelves along the top, a grid of item cards, and on the
// right the SHOPKEEPER - a stick-figure robot with a TV for a head and cartoon gloves that act out his moods, with Mason's faces on the screen (happy /
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
const KP = { x: 524, y: 84 };                                             // the middle of the shopkeeper's TV head
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
    this.faceImg = this.add.sprite(KP.x, KP.y, 'shop_face_happy', 0).setTintMode(Phaser.TintModes.FILL).setTint(0x9affd8);
    this.front = this.add.graphics();                // over the face: scanlines, the glass, static
    this.bubbleT = txt(0, 0, '', 6, '#1a1024', { align: 'center' }).setOrigin(0.5, 0.5);
    this.face = 'happy'; this.faceT = 0; this.gesture = 'idle'; this.gestT = 0; this.gestStart = 0; this.faceStart = 0; this.static = 12; this.saying = ''; this.sayT = 0; this.lastSel = -1;
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
  // the gesture that goes with each line he says (his hands do half the talking)
  react(face, line, hold = KEEPER.hold) {
    if (face !== this.face) { this.static = 6; this.faceStart = this.t; sfx('glitch', 0.12, 1.8); }
    this.face = face; this.faceT = face === 'happy' && line !== 'hello' && line !== 'tab' ? 0 : hold;
    const G = { hello: 'wave', look: 'rub', empty: 'shock', broke: 'shock', bought: 'cheer', tab: 'point', poke: 'shrug' };
    if (line && G[line]) { this.gesture = G[line]; this.gestT = hold; this.gestStart = this.t; }
    const L = KEEPER.lines[line]; if (L) { this.saying = L[Math.floor(Math.random() * L.length)]; this.sayT = hold + 40; }
  }
  // an arm: shoulder (sx, sy) to the hand at (tx, ty), bending at the elbow (bend: +1 / -1 which way), two thin bones
  arm(g, sx, sy, tx, ty, bend, L = 24) {
    let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy) || 1;
    if (d > L * 2 - 1) { tx = sx + dx / d * (L * 2 - 1); ty = sy + dy / d * (L * 2 - 1); dx = tx - sx; dy = ty - sy; d = L * 2 - 1; }
    const a = Math.atan2(dy, dx), k = Math.acos(Math.min(1, d / (2 * L))) * bend, ex = sx + Math.cos(a + k) * L, ey = sy + Math.sin(a + k) * L;
    g.lineStyle(4, 0x1a1424, 1); g.lineBetween(sx, sy, ex, ey); g.lineBetween(ex, ey, tx, ty);
    g.lineStyle(2, 0xd8d4e4, 1); g.lineBetween(sx, sy, ex, ey); g.lineBetween(ex, ey, tx, ty);
    g.fillStyle(0xd8d4e4, 1); g.fillCircle(ex, ey, 2);
    return [tx, ty];
  }
  // a cartoon glove: open (fingers spread), fist, point (one finger out, toward dir), thumb (a thumbs-up)
  hand(g, x, y, kind, dir = 1, t = 0) {
    const O = 0x1a1424, Wt = 0xf4f0fa, Sh = 0xc8c0d8;
    const blob = (bx, by, r) => { g.fillStyle(O, 1); g.fillCircle(bx, by, r + 1); g.fillStyle(Wt, 1); g.fillCircle(bx, by, r); };
    if (kind === 'open') {
      for (let i = -1; i <= 1; i++) { const a = -Math.PI / 2 + i * 0.55 + (dir < 0 ? 0 : 0); g.lineStyle(5, O, 1); g.lineBetween(x, y, x + Math.cos(a) * 9, y + Math.sin(a) * 9); g.lineStyle(3, Wt, 1); g.lineBetween(x, y, x + Math.cos(a) * 9, y + Math.sin(a) * 9); }
      g.lineStyle(5, O, 1); g.lineBetween(x, y, x - dir * 8, y + 2); g.lineStyle(3, Wt, 1); g.lineBetween(x, y, x - dir * 8, y + 2);   // the thumb
      blob(x, y, 5);
    } else if (kind === 'point') {
      g.lineStyle(5, O, 1); g.lineBetween(x, y, x + dir * 12, y - 1); g.lineStyle(3, Wt, 1); g.lineBetween(x, y, x + dir * 12, y - 1); blob(x, y, 5);
    } else if (kind === 'thumb') {
      g.lineStyle(5, O, 1); g.lineBetween(x, y, x, y - 11); g.lineStyle(3, Wt, 1); g.lineBetween(x, y, x, y - 11); blob(x, y + 1, 5);
    } else blob(x, y, 5);
    g.fillStyle(Sh, 1); g.fillRect(x - 2, y + 2, 4, 2);                                   // a crease of shade on the glove
  }
  // him: a stick figure in a bow tie with a CRT TV for a head (Mason's faces on the screen), standing in his nook
  // behind the details panel; his gloved hands act out whatever he's feeling (this.gesture)
  keeper(g, t) {
    const G = this.gesture || 'idle', gt = t - (this.gestStart || 0), floor = 206;
    if (this.gestT > 0 && --this.gestT === 0) this.gesture = 'idle';
    const jump = G === 'shock' ? Math.max(0, 8 - gt) * (gt < 8 ? 1 : 0) : G === 'cheer' ? Math.abs(Math.sin(gt * 0.25)) * 6 : 0;
    const bob = Math.round(Math.sin(t * 0.06) * 1.5 + (G === 'shock' && gt > 8 ? Math.sin(gt * 1.7) : 0)) - Math.round(jump);
    const hx = KP.x, hip = 176 + bob, sh = 140 + bob, hy = 84 + bob;     // hips, shoulders, the middle of his head
    // his nook: a back wall, a shelf of junk, the floor he stands on
    g.fillStyle(0x140a20, 1); g.fillRect(SIDE.x, 44, SIDE.w, floor - 42);
    g.fillStyle(0x221432, 1); g.fillRect(SIDE.x, 64, SIDE.w, 3); g.fillRect(SIDE.x, 130, SIDE.w, 3);
    for (const [x, y, w, h, c] of [[432, 50, 14, 14, 0x5a3a8a], [450, 54, 10, 10, 0xc77dff], [590, 48, 16, 16, 0x3a8a6a], [608, 56, 10, 8, 0xf3c358], [432, 114, 18, 16, 0x8a3a5a], [600, 110, 18, 20, 0x3a5a8a]]) { g.fillStyle(c, 0.8); g.fillRect(x, y, w, h); }
    g.fillStyle(0x221432, 1); g.fillRect(SIDE.x, floor, SIDE.w, 2);
    g.fillStyle(0x000000, 0.35); g.fillEllipse(hx, floor, 50 - jump * 2, 6);              // his shadow
    // legs: two sticks, knees bending a little as he bobs (and splayed when he jumps)
    const kneeIn = 3 + (G === 'shock' && gt < 8 ? 3 : 0);
    for (const s of [-1, 1]) {
      const fx = hx + s * (10 + (G === 'cheer' ? 3 : 0)), kx = hx + s * (6 + kneeIn), ky = (hip + floor) / 2 + 1;
      g.lineStyle(4, 0x1a1424, 1); g.lineBetween(hx + s * 3, hip, kx, ky); g.lineBetween(kx, ky, fx, floor - 2 - jump);
      g.lineStyle(2, 0xd8d4e4, 1); g.lineBetween(hx + s * 3, hip, kx, ky); g.lineBetween(kx, ky, fx, floor - 2 - jump);
      g.fillStyle(0x1a1424, 1); g.fillRoundedRect(fx - 5 + s * 2, floor - 4 - jump, 10, 4, 2);   // shoes
    }
    // the body: a stick spine, a little pelvis, shoulders - and a bow tie
    g.lineStyle(4, 0x1a1424, 1); g.lineBetween(hx, sh - 4, hx, hip); g.lineBetween(hx - 12, sh, hx + 12, sh); g.lineBetween(hx - 4, hip, hx + 4, hip);
    g.lineStyle(2, 0xd8d4e4, 1); g.lineBetween(hx, sh - 4, hx, hip); g.lineBetween(hx - 12, sh, hx + 12, sh);
    g.fillStyle(0xd8223a, 1); g.fillTriangle(hx, sh + 1, hx - 7, sh - 3, hx - 7, sh + 5); g.fillTriangle(hx, sh + 1, hx + 7, sh - 3, hx + 7, sh + 5); g.fillStyle(0xff5a6a, 1); g.fillRect(hx - 1, sh - 1, 3, 3);
    // the arms and hands, posed by the gesture
    const s1 = Math.sin(gt * 0.35), s2 = Math.sin(t * 0.05);
    let L, R;                                              // [x, y, glove kind, finger direction, elbow bend]
    switch (G) {
      case 'wave': L = [hx - 20, sh + 26, 'fist', -1, -1]; R = [hx + 34 + s1 * 6, sh - 34, 'open', 1, 1]; break;
      case 'rub': { const r = Math.sin(gt * 0.6) * 4; L = [hx - 5 + r, sh + 14, 'fist', 1, 1]; R = [hx + 5 + r, sh + 16, 'fist', -1, -1]; break; }   // rubbing his hands together
      case 'shock': { const q = gt > 8 ? Math.sin(gt * 1.9) * 1.5 : 0; L = [hx - 34 + q, sh - 32, 'open', -1, 1]; R = [hx + 34 - q, sh - 32, 'open', 1, -1]; break; }   // hands up beside his screen
      case 'cheer': L = [hx - 30 + s1 * 3, sh - 38, 'open', -1, 1]; R = [hx + 30 - s1 * 3, sh - 38, 'open', 1, -1]; break;
      case 'point': L = [hx - 44, sh + 2 + s1 * 1.5, 'point', -1, 1]; R = [hx + 16, sh + 22, 'fist', 1, 1]; break;   // this way, to the shelves
      case 'shrug': L = [hx - 30, sh - 6, 'open', -1, 1]; R = [hx + 30, sh - 6, 'open', 1, -1]; break;
      default: {                                           // idle: hands loose at his sides, now and then a little wave or a thumbs-up
        const beat = t % 480;
        L = [hx - 20 + s2 * 1.5, sh + 28, 'fist', -1, -1];
        R = beat > 300 && beat < 380 ? [hx + 28 + Math.sin(t * 0.35) * 5, sh - 26, 'open', 1, 1] : beat > 400 && beat < 460 ? [hx + 28, sh + 4, 'thumb', 1, 1] : [hx + 20 - s2 * 1.5, sh + 28, 'fist', 1, 1];
      }
    }
    this.arm(g, hx - 12, sh, L[0], L[1], L[4]); this.arm(g, hx + 12, sh, R[0], R[1], R[4]);
    // the neck, then the TV: casing, a screen in a rounded bezel, knobs, a grille, rabbit-ear antennas
    g.lineStyle(4, 0x1a1424, 1); g.lineBetween(hx, hy + 38, hx, sh - 2); g.lineStyle(2, 0xd8d4e4, 1); g.lineBetween(hx, hy + 40, hx, sh - 2);
    const tilt = G === 'shock' ? 0 : G === 'rub' ? 2 : 0;
    g.lineStyle(2, 0x8a8a9a, 1); g.lineBetween(hx - 10, hy - 40, hx - 28, hy - 60); g.lineBetween(hx + 10, hy - 40, hx + 26 + tilt, hy - 62);
    g.fillStyle((t >> 4) % 2 ? 0xff5a5a : 0x8a2a2a, 1); g.fillCircle(hx - 28, hy - 60, 3); g.fillCircle(hx + 26 + tilt, hy - 62, 3);
    g.fillStyle(0x6a6478, 1); g.fillRoundedRect(hx - 46, hy - 40, 92, 80, 10); g.fillStyle(0x837d92, 1); g.fillRoundedRect(hx - 46, hy - 40, 92, 6, 3);
    g.fillStyle(0x2a2632, 1); g.fillRoundedRect(hx - 42, hy - 36, 76, 72, 8);
    g.fillStyle(0x061a14, 1); g.fillRoundedRect(hx - 40, hy - 34, 72, 68, 7);
    this.glow(g, hx - 4, hy, 38, 0x5affb8, 0.18);
    for (let i = 0; i < 2; i++) { g.fillStyle(0x2a2632, 1); g.fillCircle(hx + 39, hy - 22 + i * 16, 4); g.fillStyle(0x9a94a8, 1); g.fillRect(hx + 38, hy - 26 + i * 16 + ((t >> 5) + i) % 3, 2, 4); }
    for (let i = 0; i < 4; i++) { g.fillStyle(0x2a2632, 1); g.fillRect(hx + 35, hy + 10 + i * 5, 8, 2); }
    // the face on the screen: the current face's strip, animated if it has more than one frame
    const key = 'shop_face_' + this.face, F = KEEPER.faces[this.face], n = Math.max(1, this.textures.get(key).frameTotal - 1), fx0 = hx - 4, fy0 = hy;
    this.faceImg.setTexture(key, Math.floor((t - this.faceStart) * F.fps / 60) % n).setPosition(fx0, fy0).setScale(1).setVisible(this.static <= 0 || this.static % 2 === 0);
    const f = this.front; f.clear();
    for (let y = hy - 34; y < hy + 34; y += 2) { f.fillStyle(0x000000, 0.22); f.fillRect(hx - 40, y, 72, 1); }        // scanlines
    f.fillStyle(0xffffff, 0.06); f.fillEllipse(hx - 18, hy - 20, 32, 12);                                          // the glass
    if (this.static > 0) { this.static--; for (let i = 0; i < 70; i++) { f.fillStyle(Math.random() < 0.5 ? 0xd8fff0 : 0x2a4a3a, 1); f.fillRect(hx - 40 + Math.random() * 70, hy - 34 + Math.random() * 66, 2, 1); } }   // static when the channel changes
    // the hands go over everything (in front of his screen when they're up)
    this.hand(f, L[0], L[1], L[2], L[3], t); this.hand(f, R[0], R[1], R[2], R[3], t);
    if (G === 'cheer' && gt % 10 < 5) for (let i = 0; i < 6; i++) { const a = i * 1.05 + gt * 0.1; f.fillStyle(0xf3c358, 1); f.fillRect(hx + Math.cos(a) * 54, hy - 20 + Math.sin(a) * 30, 2, 2); }   // sparkles
    if (G === 'shock' && gt < 24) { f.lineStyle(2, 0xffffff, 1 - gt / 24); for (const s of [-1, 1]) { f.lineBetween(hx + s * 52, hy - 30, hx + s * 60, hy - 38); f.lineBetween(hx + s * 54, hy - 18, hx + s * 64, hy - 20); } }   // !! lines
    // the speech bubble
    if (this.sayT > 0 && this.saying) {
      this.sayT--;
      this.bubbleT.setText(this.saying).setVisible(true);
      const bw = Math.max(80, this.bubbleT.width + 16), bh = 20, bx = Math.min(W - bw - 70, hx - 64 - bw / 2), by = 14;
      f.fillStyle(0xf4f0fa, 1); f.fillRoundedRect(bx, by, bw, bh, 6); f.fillTriangle(bx + bw - 26, by + bh, bx + bw - 12, by + bh, hx - 30, hy - 44);
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
    if (this.faceT > 0 && --this.faceT === 0) this.react('happy');

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

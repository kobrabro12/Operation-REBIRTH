// Main menu: the hub between the title screen and everything else. Four sectors on a 2x2 grid:
//   FIGHT        -> battle setup (rules, CPUs), then stage and fighter select
//   OPTIONS      -> sound, display and touch controls
//   OTHER        -> training, how to play, credits
//   TRINKETS     -> extras and experiments (Character Files, for now)
// Move with WASD / arrows / stick, confirm with J / Enter / A, back to the title with K / Esc / B;
// or hover and click a sector with the mouse.
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { playMusic } from '../audio/music.js';
import { MenuInput } from './menuInput.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { ArcadeBg, slant, hintBar, ARC, shade } from '../ui/arcade.js';

const SECTORS = [
  { id: 'fight', name: 'FIGHT', sub: 'BATTLE FRIENDS OR CPUS', color: 0xc8283c, dark: 0x3a0a14, lit: 0xff6a72, scene: 'Setup' },
  { id: 'options', name: 'OPTIONS', sub: 'SOUND, DISPLAY & CONTROLS', color: 0x2f6fd0, dark: 0x0e1e3e, lit: 0x78a0ff, scene: 'Options' },
  { id: 'other', name: 'OTHER', sub: 'TRAINING, HOW TO PLAY, CREDITS', color: 0x2fa070, dark: 0x0c2a1e, lit: 0x6fe3a8, scene: 'Other' },
  { id: 'trinkets', name: 'TRINKETS', sub: 'CHARACTER FILES & EXTRAS', color: 0x8a3fd0, dark: 0x22103a, lit: 0xc77dff, scene: 'Trinkets' },
];
const PAD = 22, TOP = 62, GAP = 12, SK = 16;   // tile layout; SK = how far the tiles lean
const W = (VIEW_W - PAD * 2 - GAP) / 2, H = (VIEW_H - TOP - 30 - GAP) / 2;

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    this.t = 0; this.menu = new MenuInput(this);
    this.sel = this.registry.get('menuSel') || 0;
    playMusic(this, 'bgm_title');
    this.bgFx = new ArcadeBg(this, SECTORS[this.sel].color);
    this.bg = this.add.graphics();
    // logo
    this.add.text(VIEW_W / 2, 14, 'OPERATION', { fontFamily: FONT, fontSize: '8px', color: '#78a0c6' }).setOrigin(0.5);
    this.letters = 'REBIRTH'.split('').map((ch, i) => this.add.text(VIEW_W / 2 - 63 + i * 18, 34, ch, { fontFamily: FONT, fontSize: '18px', color: '#ffffff', stroke: '#0b0a14', strokeThickness: 5 }).setOrigin(0.5));
    this.panelG = this.add.graphics();
    this.tiles = SECTORS.map((s, i) => {
      const x = PAD + (i % 2) * (W + GAP), y = TOP + Math.floor(i / 2) * (H + GAP);
      const label = this.add.text(x + W / 2 + 26, y + H / 2 - 10, s.name, { fontFamily: FONT, fontSize: s.locked ? '13px' : '20px', color: '#ffffff', stroke: '#07060e', strokeThickness: 6, shadow: { offsetX: 3, offsetY: 3, color: '#07060e', fill: true, stroke: true } }).setOrigin(0.5);
      const sub = this.add.text(x + W / 2 + 26, y + H / 2 + 16, s.sub, { fontFamily: FONT, fontSize: '6px', color: '#c9c4dc' }).setOrigin(0.5);
      return { s, x, y, label, sub, pop: 0 };
    });
    this.toast = this.add.text(VIEW_W / 2, VIEW_H - 40, '', { fontFamily: FONT, fontSize: '8px', color: '#ffd34f', backgroundColor: '#16132a', padding: { x: 8, y: 5 } }).setOrigin(0.5).setDepth(20).setVisible(false);
    hintBar(this, 'CLICK PICK   ARROWS MOVE   J / ENTER / A OPEN   K / ESC / B  BACK', 0xffd23f);
    makeButton(this, 8, 6, '< BACK', () => this.back());
    addFullscreenButton(this, VIEW_W - 8, 6);
    this.clicked = false;
    const tileAt = (px, py) => this.tiles.findIndex((t) => px >= t.x && px < t.x + W && py >= t.y && py < t.y + H);
    this.input.on('pointermove', (p) => { const i = tileAt(p.x, p.y); if (i >= 0 && i !== this.sel) { this.sel = i; sfx('menu', 0.3); } });
    this.input.on('pointerdown', (p, over) => { if (over.length) return; const i = tileAt(p.x, p.y); if (i >= 0) { this.sel = i; this.clicked = true; } });
  }

  back() { sfx('menu', 0.6); this.scene.start('Title'); }

  choose() {
    const t = this.tiles[this.sel];
    if (t.s.locked) {                                  // still locked: a shake and a note
      t.pop = 12; sfx('curse', 0.4, 1.4);
      this.toast.setText('COMING SOON - STAY TUNED!').setVisible(true); this.toastT = 90;
      return;
    }
    this.registry.set('menuSel', this.sel);
    sfx('go', 0.8);
    this.scene.start(t.s.scene);
  }

  update() {
    this.t++;
    const m = this.menu.poll();
    if (m.left && this.sel % 2) { this.sel--; sfx('menu', 0.5); }
    if (m.right && this.sel % 2 === 0) { this.sel++; sfx('menu', 0.5); }
    if (m.up && this.sel >= 2) { this.sel -= 2; sfx('menu', 0.5); }
    if (m.down && this.sel < 2) { this.sel += 2; sfx('menu', 0.5); }
    if (m.ok || this.clicked || m.pads.some((p) => p.button === 'a' || p.button === 'start')) { this.clicked = false; this.choose(); return; }
    if (m.back || m.pads.some((p) => p.button === 'b')) { this.back(); return; }
    if (this.toastT && --this.toastT <= 0) this.toast.setVisible(false);
    this.letters.forEach((l, i) => {                   // the logo keeps its rainbow
      const c = Phaser.Display.Color.HSVToRGB(((this.t * 6 + i * 38) % 360) / 360, 0.8, 1);
      l.setColor(Phaser.Display.Color.RGBToString(c.r, c.g, c.b));
    });
    this.draw();
  }

  draw() {
    const g = this.bg, t = this.t;
    g.clear();
    const S = SECTORS[this.sel]; this.bgFx.accent = S.color; this.bgFx.second = S.lit; this.bgFx.update(t);   // the backdrop takes the picked sector's colour
    g.fillStyle(0x000000, 0.5); g.fillRect(VIEW_W / 2 - 92, 44, 184, 2); g.fillStyle(S.color, 1); g.fillRect(VIEW_W / 2 - 92 + ((t * 3) % 160), 44, 24, 2);   // a light running under the logo
    const p = this.panelG; p.clear();
    this.tiles.forEach((tile, i) => {
      const { s } = tile, on = i === this.sel;
      if (tile.pop > 0) tile.pop--;
      tile.k = (tile.k || 0) + ((on ? 1 : 0) - (tile.k || 0)) * 0.25;                      // eases in and out of being picked
      const k = tile.k, shake = tile.pop ? Math.round(Math.sin(tile.pop * 2) * 3) : 0, grow = Math.round(k * 4);
      const x = tile.x - grow + shake - Math.round(k * 4), y = tile.y - grow - Math.round(k * 3), w = W + grow * 2, h = H + grow * 2;
      slant(p, x + 7, y + 7, w, h, 0x000000, 0.6, SK);                                       // hard shadow
      slant(p, x, y, w, h, on ? s.color : shade(s.color, 0.55), 1, SK);                      // the frame
      slant(p, x + 4, y + 4, w - 8, h - 8, s.dark, on ? 0.82 : 0.96, SK - 1);                // the body
      for (let b = 0; b < 7; b++) {                                                           // slanted stripes sliding through
        const bx = x + 4 + ((b * 46 + (on ? t * 1.6 : t * 0.4)) % (w + 40)) - 40;
        if (bx > x - 30 && bx < x + w - 10) slant(p, Math.max(x + 6, bx), y + 4, Math.min(16, x + w - 12 - bx), h - 8, s.color, on ? 0.2 : 0.07, SK - 1);
      }
      slant(p, x + 4, y + 4, w - 8, (h - 8) * 0.42, 0xffffff, on ? 0.07 : 0.03, (SK - 1) * 0.42);   // a sheen on the top half
      if (on) {                                                                               // picked: a white flash edge and corner slashes
        const fl = t % 30 < 15 ? ARC.white : ARC.gold;
        p.fillStyle(fl, 1); p.fillRect(x + SK + 2, y, w - SK - 4, 2); p.fillRect(x + 2, y + h - 2, w - SK - 4, 2);
        for (let q = 0; q < 3; q++) slant(p, x + w - SK - 34 + q * 9, y + h - 14, 6, 8, ARC.white, 0.9 - q * 0.25, 4);
      }
      this.icon(p, s.id, x + 50, y + h / 2 + (on ? Math.round(Math.sin(t * 0.15) * 2) : 0), on ? s.lit : s.color, s);
      tile.label.setPosition(x + w / 2 + 30, y + h / 2 - 10).setColor(s.locked ? (on ? '#c9c4dc' : '#6a6680') : on ? '#ffffff' : '#c9c4dc').setScale(1 + k * 0.08);
      tile.sub.setPosition(x + w / 2 + 30, y + h / 2 + 17).setColor(on ? '#ffffff' : '#8a87a3');
    });
  }

  // chunky pixel icons, drawn around (cx, cy)
  icon(g, id, cx, cy, col, s) {
    const px = (x, y, w = 1, h = 1, c = col) => { g.fillStyle(c, 1); g.fillRect(Math.round(cx + x * 3), Math.round(cy + y * 3), w * 3, h * 3); };
    const O = 0x0b0a14;
    if (id === 'fight') {                              // two crossed swords
      for (let k = -6; k <= 6; k++) { px(k, k, 1, 1, 0xe8e8f0); px(k, -k, 1, 1, 0xe8e8f0); }
      for (const sgn of [-1, 1]) { px(5 * sgn - 1, 5, 3, 1, 0xf3c358); px(5 * sgn, 6, 1, 2, 0x6a3a1a); }
      px(-1, -1, 3, 3, col);
    } else if (id === 'options') {                     // a gear
      for (let a = 0; a < 8; a++) { const ang = a * Math.PI / 4; px(Math.round(Math.cos(ang) * 5) - 1, Math.round(Math.sin(ang) * 5) - 1, 2, 2); }
      for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) if (x * x + y * y <= 17) px(x, y);
      for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y <= 4) px(x, y, 1, 1, s.dark);
    } else if (id === 'other') {                       // an open book
      for (let y = -4; y <= 4; y++) { px(-7, y, 6, 1, 0xf0ead8); px(1, y, 6, 1, 0xf0ead8); }
      px(-1, -5, 2, 11, col); for (let y = -3; y <= 3; y += 2) { px(-6, y, 4, 1, 0x8a87a3); px(2, y, 4, 1, 0x8a87a3); }
      px(-7, 5, 14, 1, col);
    } else if (id === 'trinkets') {                    // a treasure chest, a gem glinting on the lid
      px(-6, -1, 13, 7, 0x8a5a2c); px(-6, -4, 13, 3, 0xb47a3c); px(-6, -1, 13, 1, O);
      px(-6, -4, 1, 10, 0xf3c358); px(6, -4, 1, 10, 0xf3c358); px(-1, -2, 3, 3, 0xf3c358); px(0, -1, 1, 1, O);
      px(-1, -7, 3, 3, col); px(0, -8, 1, 1, 0xffffff);
    } else {                                           // a padlock
      for (let y = -6; y <= -2; y++) { px(-3, y); px(3, y); } px(-2, -7, 5, 1);
      px(-5, -2, 11, 8); px(-1, 0, 3, 2, O); px(0, 2, 1, 2, O);
    }
  }
}

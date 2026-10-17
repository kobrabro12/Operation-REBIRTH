// Main menu: the hub between the title screen and everything else. Four sectors on a 2x2 grid:
//   FIGHT        -> battle setup (rules, CPUs), then stage and fighter select
//   OPTIONS      -> sound, display and touch controls
//   OTHER        -> training, how to play, credits
//   COMING SOON  -> locked for now
// Move with WASD / arrows / stick, confirm with J / Enter / A, back to the title with K / Esc / B;
// or hover and click a sector with the mouse.
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { playMusic } from '../audio/music.js';
import { MenuInput } from './menuInput.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';
import { addFullscreenButton } from '../ui/fullscreen.js';

const SECTORS = [
  { id: 'fight', name: 'FIGHT', sub: 'BATTLE FRIENDS OR CPUS', color: 0xc8283c, dark: 0x3a0a14, lit: 0xff6a72, scene: 'Setup' },
  { id: 'options', name: 'OPTIONS', sub: 'SOUND, DISPLAY & CONTROLS', color: 0x2f6fd0, dark: 0x0e1e3e, lit: 0x78a0ff, scene: 'Options' },
  { id: 'other', name: 'OTHER', sub: 'TRAINING, HOW TO PLAY, CREDITS', color: 0x2fa070, dark: 0x0c2a1e, lit: 0x6fe3a8, scene: 'Other' },
  { id: 'soon', name: 'COMING SOON', sub: 'SOMETHING BIG IS ON THE WAY', color: 0x4a4560, dark: 0x16132a, lit: 0x8a87a3, locked: true },
];
const PAD = 16, TOP = 56, GAP = 10;
const W = (VIEW_W - PAD * 2 - GAP) / 2, H = (VIEW_H - TOP - 30 - GAP) / 2;

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    this.t = 0; this.menu = new MenuInput(this);
    this.sel = this.registry.get('menuSel') || 0;
    playMusic(this, 'bgm_title');
    this.bg = this.add.graphics();
    // logo
    this.add.text(VIEW_W / 2, 14, 'OPERATION', { fontFamily: FONT, fontSize: '8px', color: '#78a0c6' }).setOrigin(0.5);
    this.letters = 'REBIRTH'.split('').map((ch, i) => this.add.text(VIEW_W / 2 - 63 + i * 18, 34, ch, { fontFamily: FONT, fontSize: '18px', color: '#ffffff', stroke: '#0b0a14', strokeThickness: 5 }).setOrigin(0.5));
    this.panelG = this.add.graphics();
    this.tiles = SECTORS.map((s, i) => {
      const x = PAD + (i % 2) * (W + GAP), y = TOP + Math.floor(i / 2) * (H + GAP);
      const label = this.add.text(x + W / 2 + 26, y + H / 2 - 10, s.name, { fontFamily: FONT, fontSize: s.locked ? '13px' : '18px', color: '#ffffff', stroke: '#0b0a14', strokeThickness: 5 }).setOrigin(0.5);
      const sub = this.add.text(x + W / 2 + 26, y + H / 2 + 16, s.sub, { fontFamily: FONT, fontSize: '6px', color: '#c9c4dc' }).setOrigin(0.5);
      return { s, x, y, label, sub, pop: 0 };
    });
    this.toast = this.add.text(VIEW_W / 2, VIEW_H - 40, '', { fontFamily: FONT, fontSize: '8px', color: '#ffd34f', backgroundColor: '#16132a', padding: { x: 8, y: 5 } }).setOrigin(0.5).setDepth(20).setVisible(false);
    this.add.text(VIEW_W / 2, VIEW_H - 8, 'CLICK A SECTOR  OR  MOVE + J / ENTER / A    K / ESC / B  BACK', { fontFamily: FONT, fontSize: '5px', color: '#8a87a3' }).setOrigin(0.5, 1);
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
    g.fillStyle(0x0b0a14, 1); g.fillRect(0, 0, VIEW_W, VIEW_H);
    for (let i = 0; i < 40; i++) {                     // a slow field of drifting pixel stars
      const x = (i * 97 + t * (0.2 + (i % 3) * 0.15)) % VIEW_W, y = (i * 53) % VIEW_H;
      g.fillStyle(i % 4 ? 0x2a2450 : 0x78a0c6, 1); g.fillRect(Math.round(x), y, i % 5 ? 1 : 2, i % 5 ? 1 : 2);
    }
    const p = this.panelG; p.clear();
    this.tiles.forEach((tile, i) => {
      const { s } = tile, on = i === this.sel;
      if (tile.pop > 0) tile.pop--;
      const shake = tile.pop ? Math.round(Math.sin(tile.pop * 2) * 3) : 0, grow = on ? 2 : 0;
      const x = tile.x - grow + shake, y = tile.y - grow, w = W + grow * 2, h = H + grow * 2;
      p.fillStyle(0x05040a, 1); p.fillRect(x + 4, y + 4, w, h);                       // drop shadow
      p.fillStyle(on ? s.color : s.dark, 1); p.fillRect(x, y, w, h);
      p.fillStyle(s.dark, on ? 0.55 : 1); p.fillRect(x + 4, y + 4, w - 8, h - 8);
      for (let yy = y + 4; yy < y + h - 4; yy += 3) {                                    // diagonal stripes sliding by
        const off = Math.floor(((on ? t : t * 0.3) + yy) % 14);
        p.fillStyle(s.color, on ? 0.22 : 0.1);
        for (let xx = x + 4 + ((14 - off) % 14); xx < x + w - 8; xx += 14) p.fillRect(xx, yy, 4, 3);
      }
      const border = on ? (t % 30 < 15 ? 0xf3c358 : 0xffffff) : s.color;
      p.lineStyle(2, border, 1); p.strokeRect(x + 1, y + 1, w - 2, h - 2);
      this.icon(p, s.id, x + 44, y + h / 2 + (on ? Math.round(Math.sin(t * 0.15) * 2) : 0), on ? s.lit : s.color, s);
      tile.label.setPosition(x + w / 2 + 26, y + h / 2 - 10).setColor(s.locked ? (on ? '#c9c4dc' : '#6a6680') : '#ffffff');
      tile.sub.setPosition(x + w / 2 + 26, y + h / 2 + 16).setColor(on ? '#ffffff' : '#8a87a3');
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
    } else {                                           // a padlock
      for (let y = -6; y <= -2; y++) { px(-3, y); px(3, y); } px(-2, -7, 5, 1);
      px(-5, -2, 11, 8); px(-1, 0, 3, 2, O); px(0, 2, 1, 2, O);
    }
  }
}

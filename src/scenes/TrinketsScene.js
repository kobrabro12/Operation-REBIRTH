// Trinkets: a drawer of extras and experiments. For now it holds CHARACTER FILES; the other slots are
// empty, waiting for whatever gets added next.
// W/S or arrows pick, J / Enter / A opens, K / Esc / B goes back; or use the mouse.
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { playMusic } from '../audio/music.js';
import { MenuInput } from './menuInput.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';
import { addFullscreenButton } from '../ui/fullscreen.js';

const ENTRIES = [
  { name: 'CHARACTER FILES', info: 'THE FILES ON EVERY FIGHTER: WHO THEY ARE,\nWHERE THEY COME FROM, THEIR MOVES -\nAND THE STORIES BEHIND THEIR COSTUMES.', scene: 'Files' },
  { name: '- EMPTY -', info: 'AN EMPTY SLOT.\nSOMETHING WILL TURN UP HERE.' },
  { name: '- EMPTY -', info: 'AN EMPTY SLOT.\nSOMETHING WILL TURN UP HERE.' },
  { name: '- EMPTY -', info: 'AN EMPTY SLOT.\nSOMETHING WILL TURN UP HERE.' },
  { name: 'BACK', info: '', back: true },
];
const C = { panel: 0x2a1640, line: 0xc77dff, text: '#e6c8ff' };

export class TrinketsScene extends Phaser.Scene {
  constructor() { super('Trinkets'); }

  create() {
    this.t = 0; this.sel = 0; this.menu = new MenuInput(this);
    playMusic(this, 'bgm_title');
    const g = this.add.graphics();
    g.fillStyle(0x0b0a14, 1); g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle(C.panel, 1); g.fillRect(16, 56, 200, 260); g.fillRect(228, 56, 396, 260);
    g.fillStyle(C.line, 1); g.fillRect(16, 56, 200, 2); g.fillRect(228, 56, 396, 2);
    this.add.text(VIEW_W / 2, 28, 'TRINKETS', { fontFamily: FONT, fontSize: '16px', color: '#c77dff', stroke: '#0b0a14', strokeThickness: 5 }).setOrigin(0.5);
    this.cursor = this.add.graphics();
    this.items = ENTRIES.map((e, i) => this.add.text(34, 80 + i * 30, e.name, { fontFamily: FONT, fontSize: '8px', color: '#c9c4dc' }));
    this.info = this.add.text(246, 80, '', { fontFamily: FONT, fontSize: '7px', color: '#e8e4f4', lineSpacing: 8 });
    this.add.text(VIEW_W / 2, VIEW_H - 8, 'W/S SELECT   J / ENTER / A OPEN   K / ESC / B  BACK', { fontFamily: FONT, fontSize: '5px', color: '#8a87a3' }).setOrigin(0.5, 1);
    makeButton(this, 8, 6, '< BACK', () => this.back());
    addFullscreenButton(this, VIEW_W - 8, 6);
    this.clicked = false;
    const rowAt = (x, y) => { const i = Math.floor((y - 72) / 30); return x > 20 && x < 212 && i >= 0 && i < ENTRIES.length ? i : -1; };
    this.input.on('pointermove', (p) => { const i = rowAt(p.x, p.y); if (i >= 0 && i !== this.sel) { this.sel = i; sfx('menu', 0.3); } });
    this.input.on('pointerdown', (p, over) => { if (over.length) return; const i = rowAt(p.x, p.y); if (i >= 0) { this.sel = i; this.clicked = true; } });
  }

  back() { sfx('menu', 0.6); this.scene.start('Menu'); }

  update() {
    this.t++;
    const m = this.menu.poll();
    if (m.up) { this.sel = (this.sel - 1 + ENTRIES.length) % ENTRIES.length; sfx('menu', 0.5); }
    if (m.down) { this.sel = (this.sel + 1) % ENTRIES.length; sfx('menu', 0.5); }
    const e = ENTRIES[this.sel];
    if (m.ok || this.clicked || m.pads.some((p) => p.button === 'a')) {
      this.clicked = false;
      if (e.back) return this.back();
      if (e.scene) { sfx('go', 0.8); this.scene.start(e.scene); return; }
      sfx('curse', 0.3, 1.5);
    }
    if (m.back || m.pads.some((p) => p.button === 'b')) return this.back();
    this.items.forEach((t, i) => t.setColor(i === this.sel ? (ENTRIES[i].back ? '#f3c358' : '#ffffff') : ENTRIES[i].back ? '#c77dff' : ENTRIES[i].scene ? '#e6c8ff' : '#5a4a70'));
    this.info.setText(e.info);
    const c = this.cursor; c.clear();
    c.fillStyle(C.line, 0.25); c.fillRect(22, 74 + this.sel * 30, 188, 20);
    c.fillStyle(C.line, 1); c.fillRect(22, 74 + this.sel * 30, 3, 20);
  }
}

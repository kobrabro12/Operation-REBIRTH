// Test Fighters (TRINKETS > TEST FIGHTERS): the lab. Experimental fighters (roster.TEST_ROSTER) can be
// tried out before they join the real roster: TRAINING (against a dummy, with hitboxes and the speed
// controls) or VS CPU (one stock match against a random fighter from the real roster).
// W/S picks a fighter, A/D picks TRAINING or VS CPU, J / Enter / A starts, K / Esc / B goes back.
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { playMusic } from '../audio/music.js';
import { MenuInput } from './menuInput.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { ROSTER, TEST_ROSTER, showFighter } from '../fighters/roster.js';
import { settings } from '../settings.js';

const GOLD = '#f3c358', DIM = '#8a87a3', LINE = 0x5ee07a, PANEL = 0x10241a;
const L = { x: 16, y: 56, w: 200, h: 262 }, R = { x: 228, y: 56, w: 396, h: 262 };
const MODES = ['TRAINING', 'VS CPU'];

export class TestFightersScene extends Phaser.Scene {
  constructor() { super('TestFighters'); }

  create() {
    this.t = 0; this.sel = 0; this.mode = 0; this.menu = new MenuInput(this);
    playMusic(this, 'bgm_title');
    const g = this.add.graphics();
    g.fillStyle(0x0b0a14, 1); g.fillRect(0, 0, VIEW_W, VIEW_H);
    for (let y = 0; y < VIEW_H; y += 4) { g.fillStyle(0x0e1712, 1); g.fillRect(0, y, VIEW_W, 1); }   // lab scanlines
    g.fillStyle(PANEL, 1); g.fillRect(L.x, L.y, L.w, L.h); g.fillRect(R.x, R.y, R.w, R.h);
    g.fillStyle(LINE, 1); g.fillRect(L.x, L.y, L.w, 2); g.fillRect(R.x, R.y, R.w, 2);
    this.add.text(VIEW_W / 2, 28, 'TEST FIGHTERS', { fontFamily: FONT, fontSize: '14px', color: '#5ee07a', stroke: '#0b0a14', strokeThickness: 5 }).setOrigin(0.5);
    this.add.text(L.x + 10, L.y + 10, 'IN THE LAB', { fontFamily: FONT, fontSize: '6px', color: DIM });
    this.cursor = this.add.graphics();
    this.names = TEST_ROSTER.map((f, i) => this.add.text(L.x + 18, L.y + 32 + i * 24, f.name, { fontFamily: FONT, fontSize: '8px', color: '#c9c4dc' }));
    if (!TEST_ROSTER.length) this.add.text(L.x + 18, L.y + 32, 'NOTHING HERE YET.', { fontFamily: FONT, fontSize: '7px', color: DIM });
    // right: the fighter, its notes, and how to try it
    this.stageG = this.add.graphics();
    this.sprite = this.add.sprite(R.x + 80, R.y + 190, ROSTER[0].def.sheets.idle, 0).setVisible(false);
    const tx = R.x + 160;
    this.head = this.add.text(tx, R.y + 14, '', { fontFamily: FONT, fontSize: '9px', color: GOLD });
    this.tag = this.add.text(tx, R.y + 30, '', { fontFamily: FONT, fontSize: '5px', color: '#0b0a14', backgroundColor: '#5ee07a', padding: { x: 3, y: 2 } });
    this.notes = this.add.text(tx, R.y + 50, '', { fontFamily: FONT, fontSize: '5px', color: '#e8e4f4', lineSpacing: 5, wordWrap: { width: R.w - 172 } });
    this.modeTexts = MODES.map((m, i) => this.add.text(tx + i * 110, R.y + R.h - 34, m, { fontFamily: FONT, fontSize: '8px', color: '#ffffff' }));
    this.empty = this.add.text(R.x + R.w / 2, R.y + R.h / 2, 'THE LAB IS EMPTY.\n\nNEW FIGHTERS SHOW UP HERE TO BE\nTRIED OUT BEFORE THEY JOIN THE ROSTER.', { fontFamily: FONT, fontSize: '7px', color: DIM, align: 'center', lineSpacing: 8 }).setOrigin(0.5).setVisible(!TEST_ROSTER.length);
    this.add.text(VIEW_W / 2, VIEW_H - 8, 'W/S FIGHTER   A/D MODE   J / ENTER / A START   K / ESC / B  BACK', { fontFamily: FONT, fontSize: '5px', color: DIM }).setOrigin(0.5, 1);
    makeButton(this, 8, 6, '< BACK', () => this.back());
    addFullscreenButton(this, VIEW_W - 8, 6);
    this.clicked = false;
    this.input.on('pointerdown', (p, over) => {
      if (over.length) return;
      const i = Math.floor((p.y - L.y - 26) / 24);
      if (p.x < L.x + L.w && i >= 0 && i < TEST_ROSTER.length) { this.sel = i; sfx('menu', 0.5); return; }
      this.modeTexts.forEach((m, k) => { if (p.x >= m.x - 6 && p.x < m.x + m.width + 6 && Math.abs(p.y - (m.y + 4)) < 10) { this.mode = k; this.clicked = true; } });
    });
  }

  back() { sfx('menu', 0.6); this.scene.start('Trinkets'); }

  start() {
    const f = TEST_ROSTER[this.sel]; if (!f) { sfx('curse', 0.3, 1.5); return; }
    const foes = ROSTER.filter((r) => r.available);
    const foe = foes[Math.floor(Math.random() * foes.length)].id;
    Object.assign(settings, this.mode === 0
      ? { mode: 'training', dummy: 'stand', picks: [f.id, foe], skins: [0, 0], cpuCount: 1, cpuLevels: [], stage: 'sky-sanctum' }
      : { mode: 'stock', stocks: 2, picks: [f.id, foe], skins: [0, 0], cpuCount: 1, cpuLevels: [], stage: 'random' });
    sfx('go', 0.8);
    this.scene.start('Match');
  }

  update() {
    this.t++;
    const m = this.menu.poll(), n = TEST_ROSTER.length;
    if (n && m.up) { this.sel = (this.sel - 1 + n) % n; sfx('menu', 0.5); }
    if (n && m.down) { this.sel = (this.sel + 1) % n; sfx('menu', 0.5); }
    if (m.left || m.right) { this.mode = 1 - this.mode; sfx('menu', 0.5, 1.2); }
    if (m.ok || this.clicked || m.pads.some((p) => p.button === 'a' || p.button === 'start')) { this.clicked = false; return this.start(); }
    if (m.back || m.pads.some((p) => p.button === 'b')) return this.back();
    const f = TEST_ROSTER[this.sel], c = this.cursor; c.clear();
    this.names.forEach((t, i) => t.setColor(i === this.sel ? '#ffffff' : '#8fbfa0'));
    this.tag.setVisible(!!f);
    this.modeTexts.forEach((t, i) => t.setVisible(!!f).setColor(i === this.mode ? (this.t % 30 < 15 ? GOLD : '#ffffff') : '#5a6a60'));
    if (!f) return;
    c.fillStyle(LINE, 0.22); c.fillRect(L.x + 8, L.y + 26 + this.sel * 24, L.w - 16, 20);
    c.fillStyle(LINE, 1); c.fillRect(L.x + 8, L.y + 26 + this.sel * 24, 3, 20);
    const mt = this.modeTexts[this.mode]; c.fillStyle(LINE, 0.25); c.fillRect(mt.x - 6, mt.y - 6, mt.width + 12, 20);
    this.head.setText(f.name);
    this.tag.setText(f.tag || 'PROTOTYPE');
    this.notes.setText(f.notes || '');
    // the fighter on a lab platform under a scanning light
    const sg = this.stageG, cx = R.x + 80, by = R.y + 200; sg.clear();
    sg.fillStyle(0x5ee07a, 0.06 + 0.04 * Math.sin(this.t * 0.06)); sg.fillTriangle(cx - 10, R.y + 8, cx + 10, R.y + 8, cx + 60, by); sg.fillTriangle(cx - 10, R.y + 8, cx - 60, by, cx + 60, by);
    const scan = by - ((this.t * 1.5) % 150);
    sg.fillStyle(0x5ee07a, 0.35); sg.fillRect(cx - 44, scan, 88, 1);
    sg.fillStyle(0x1e3a2a, 1); sg.fillRect(cx - 54, by, 108, 6); sg.fillStyle(0x5ee07a, 1); sg.fillRect(cx - 54, by, 108, 1);
    showFighter(this.sprite.setVisible(true), f.def, Math.floor(this.t / 6), 0);
    this.sprite.setPosition(cx, by).setScale(f.def.ownAnims ? 1.4 : 2);
  }
}

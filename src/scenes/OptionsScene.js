// Options: settings that apply to the whole game (not one battle): sound volumes, the CRT filter, touch
// controls and full screen. Volumes and the other choices are remembered in this browser.
// W/S or arrows pick a row, A/D or left/right change it, Esc / K / B goes back; or use the mouse.
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { settings, saveVolumes, saveOptions } from '../settings.js';
import { playMusic, updateMusicVolume } from '../audio/music.js';
import { MenuInput } from './menuInput.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';
import { addFullscreenButton, toggleFullscreen } from '../ui/fullscreen.js';

const ROW_Y = 84, ROW_H = 30, X0 = 120, X1 = 520;

export class OptionsScene extends Phaser.Scene {
  constructor() { super('Options'); }

  create() {
    this.t = 0; this.sel = 0; this.menu = new MenuInput(this);
    playMusic(this, 'bgm_title');
    const g = this.add.graphics();
    g.fillStyle(0x0b0a14, 1); g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle(0x0e1e3e, 1); g.fillRect(X0 - 24, 56, X1 - X0 + 48, 260);
    g.fillStyle(0x2f6fd0, 1); g.fillRect(X0 - 24, 56, X1 - X0 + 48, 2);
    this.add.text(VIEW_W / 2, 28, 'OPTIONS', { fontFamily: FONT, fontSize: '16px', color: '#78a0ff', stroke: '#0b0a14', strokeThickness: 5 }).setOrigin(0.5);
    this.cursor = this.add.graphics(); this.bars = this.add.graphics();
    this.rows = this.items().map((_, i) => ({
      label: this.add.text(X0, ROW_Y + i * ROW_H, '', { fontFamily: FONT, fontSize: '9px', color: '#c9c4dc' }),
      value: this.add.text(X1, ROW_Y + i * ROW_H, '', { fontFamily: FONT, fontSize: '9px', color: '#ffffff' }).setOrigin(1, 0),
    }));
    this.add.text(VIEW_W / 2, VIEW_H - 8, 'W/S SELECT   A/D OR CLICK CHANGE   K / ESC / B  BACK', { fontFamily: FONT, fontSize: '5px', color: '#8a87a3' }).setOrigin(0.5, 1);
    makeButton(this, 8, 6, '< BACK', () => this.back());
    addFullscreenButton(this, VIEW_W - 8, 6);
    this.click = null;
    this.input.mouse.disableContextMenu();
    const rowAt = (y) => { const i = Math.floor((y - ROW_Y + 8) / ROW_H); return i >= 0 && i < this.rows.length ? i : -1; };
    this.input.on('pointermove', (p) => { const i = rowAt(p.y); if (i >= 0 && p.x > X0 - 20 && p.x < X1 + 20 && i !== this.sel) { this.sel = i; sfx('menu', 0.3); } });
    this.input.on('pointerdown', (p, over) => { if (over.length) return; const i = rowAt(p.y); if (i >= 0 && p.x > X0 - 20 && p.x < X1 + 20) this.click = { i, x: p.x, right: p.rightButtonDown() }; });
  }

  items() {
    const s = settings;
    const vol = (key, label, after) => ({
      label, bar: Math.round(s[key] * 10), value: Math.round(s[key] * 10) ? String(Math.round(s[key] * 10)) : 'OFF',
      change: (d) => { s[key] = Phaser.Math.Clamp(Math.round(s[key] * 10 + d), 0, 10) / 10; saveVolumes(); after && after(); },
      set: (k) => { s[key] = k / 10; saveVolumes(); after && after(); },
    });
    return [
      vol('musicVolume', 'MUSIC VOLUME', updateMusicVolume),
      vol('sfxVolume', 'SFX + VOICE VOLUME'),
      { label: 'CRT FILTER', value: s.crt ? 'ON' : 'OFF', change: () => { s.crt = !s.crt; saveOptions(); } },
      { label: 'TOUCH CONTROLS', value: s.touch.toUpperCase(), change: (d) => { const o = ['auto', 'on', 'off']; s.touch = o[(o.indexOf(s.touch) + d + 3) % 3]; saveOptions(); } },
      { label: 'FULL SCREEN', value: this.scale.isFullscreen ? 'ON' : 'OFF', change: () => toggleFullscreen(this) },
      { label: 'BACK', value: '', back: true },
    ];
  }

  back() { sfx('menu', 0.6); this.scene.start('Menu'); }

  update() {
    this.t++;
    const m = this.menu.poll(), rows = this.items();
    if (m.up) { this.sel = (this.sel - 1 + rows.length) % rows.length; sfx('menu', 0.5); }
    if (m.down) { this.sel = (this.sel + 1) % rows.length; sfx('menu', 0.5); }
    const row = rows[this.sel];
    if ((m.left || m.right) && row.change) { row.change(m.left ? -1 : 1); sfx('menu', 0.5, 1.2); }
    if (m.ok || m.pads.some((p) => p.button === 'a')) { if (row.back) return this.back(); if (row.change) { row.change(1); sfx('menu', 0.5, 1.2); } }
    if (m.back || m.pads.some((p) => p.button === 'b')) return this.back();
    if (this.click) {
      const { i, x, right } = this.click, r = rows[i]; this.click = null; this.sel = i;
      if (r.back) return this.back();
      if (r.set && x >= X1 - 150 && x < X1 - 70 && !right) { r.set(Phaser.Math.Clamp(Math.floor((x - (X1 - 150)) / 8) + 1, 0, 10)); sfx('menu', 0.5, 1.2); }
      else if (r.change) { r.change(right ? -1 : 1); sfx('menu', 0.5, 1.2); }
    }
    // draw
    const fresh = this.items();
    this.cursor.clear(); this.bars.clear();
    this.rows.forEach((r, i) => {
      const it = fresh[i], on = i === this.sel, y = ROW_Y + i * ROW_H;
      r.label.setText(it.label).setColor(it.back ? (on ? '#f3c358' : '#78a0ff') : on ? '#ffffff' : '#c9c4dc');
      r.value.setText(it.value ? '< ' + it.value + ' >' : '');
      if (it.bar !== undefined) for (let k = 0; k < 10; k++) {
        const h = 4 + Math.round(k * 0.9), lit = k < it.bar;
        this.bars.fillStyle(lit ? (k < 7 ? 0x78a0ff : 0xf3c358) : 0x22305a, 1);
        this.bars.fillRect(X1 - 150 + k * 8, y + 11 - h, 6, h);
      }
      if (on) { this.cursor.fillStyle(0x2f6fd0, 0.3); this.cursor.fillRect(X0 - 12, y - 6, X1 - X0 + 24, 22); this.cursor.fillStyle(0x78a0ff, 1); this.cursor.fillRect(X0 - 12, y - 6, 3, 22); }
    });
  }
}

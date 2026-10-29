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
import { ArcadeBg, titleBanner, hintBar, panel, rowBar, slant, pixIcon, ARC, shade } from '../ui/arcade.js';

const ACC = ARC.sections.options;
const ICON = ['speaker', 'speaker', 'crt', 'touch', 'screen', 'back'];

const ROW_Y = 78, ROW_H = 38, X0 = 128, X1 = 528;

export class OptionsScene extends Phaser.Scene {
  constructor() { super('Options'); }

  create() {
    this.t = 0; this.sel = 0; this.menu = new MenuInput(this);
    playMusic(this, 'bgm_title');
    this.bgFx = new ArcadeBg(this, ACC);
    const g = this.add.graphics().setDepth(-10);
    panel(g, X0 - 66, 54, X1 - X0 + 120, 276, ACC);
    titleBanner(this, 'OPTIONS', ACC, { crumb: 'MAIN MENU  >  OPTIONS' });
    this.cursor = this.add.graphics().setDepth(-5); this.bars = this.add.graphics().setDepth(-4);
    this.rows = this.items().map((_, i) => ({
      label: this.add.text(X0, ROW_Y + i * ROW_H, '', { fontFamily: FONT, fontSize: '9px', color: '#c9c4dc', stroke: '#07060e', strokeThickness: 3 }),
      value: this.add.text(X1, ROW_Y + i * ROW_H, '', { fontFamily: FONT, fontSize: '9px', color: '#ffffff', stroke: '#07060e', strokeThickness: 3 }).setOrigin(1, 0),
    }));
    hintBar(this, 'W/S SELECT   A/D CHANGE   CLICK CHANGE   K / ESC / B  BACK', ACC);
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
    this.cursor.clear(); this.bars.clear(); this.bgFx.update(this.t);
    if (this.sel !== this.lastSel) { this.selK = 0; this.lastSel = this.sel; } this.selK = Math.min(1, (this.selK || 0) + 0.15);
    this.rows.forEach((r, i) => {
      const it = fresh[i], on = i === this.sel, y = ROW_Y + i * ROW_H;
      r.label.setText(it.label).setColor(it.back ? (on ? '#ffffff' : '#ffd23f') : on ? '#ffffff' : '#c9c4dc');
      r.value.setText(it.value ? '< ' + it.value + ' >' : '').setColor(on ? '#ffffff' : '#ffd23f');
      if (on) rowBar(this.cursor, X0 - 40, y - 9, X1 - X0 + 56, 26, it.back ? ARC.gold : ACC, this.t, 0.3 + this.selK * 0.7);
      else slant(this.cursor, X0 - 40, y - 9, X1 - X0 + 56, 26, ARC.panel2, 0.8, 6);
      pixIcon(this.bars, ICON[i], X0 - 20, y + 4, 2, on ? ARC.white : shade(ACC, 0.9), 1, on ? ACC : ARC.white);
      if (it.bar !== undefined) for (let k = 0; k < 10; k++) {          // the volume: slanted segments getting taller
        const h = 4 + Math.round(k * 0.9), lit = k < it.bar;
        slant(this.bars, X1 - 150 + k * 8, y + 11 - h, 6, h, lit ? (k < 7 ? (on ? ARC.white : 0x78a0ff) : ARC.gold) : 0x22305a, 1, 2);
      }
    });
  }
}

// Match setup: mode and rules, CPUs, items/hazards, and controller join.
// Controllers: press A to join as a new player (P2-P4), Y to drive Player 1, B to leave.
import { VIEW_W, VIEW_H, FONT, PLAYER_CSS, DIFFICULTY } from '../config.js';
import { settings, MODE_NAMES } from '../settings.js';
import { MenuInput } from './menuInput.js';
import { sfx } from '../audio/sfx.js';
import { makeButton } from '../ui/button.js';
import { ROSTER, showFighter } from '../fighters/roster.js';

const MODES = ['stock', 'time', 'stamina'];
const HPS = [100, 150, 200, 300];

export class SetupScene extends Phaser.Scene {
  constructor() { super('Setup'); }

  create() {
    this.menu = new MenuInput(this);
    this.sel = 0; this.t = 0;
    const g = this.add.graphics();
    g.fillStyle(0x0b0a14, 1); g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle(0x161230, 1); g.fillRect(16, 40, 330, 300); g.fillRect(362, 40, 262, 300);
    g.fillStyle(0x78a0c6, 1); g.fillRect(16, 40, 330, 2); g.fillRect(362, 40, 262, 2);
    this.add.text(VIEW_W / 2, 18, 'BATTLE SETUP', { fontFamily: FONT, fontSize: '14px', color: '#f3c358', stroke: '#4a280b', strokeThickness: 4 }).setOrigin(0.5);
    this.add.text(30, 52, 'RULES', { fontFamily: FONT, fontSize: '8px', color: '#78a0c6' });
    this.add.text(376, 52, 'PLAYERS', { fontFamily: FONT, fontSize: '8px', color: '#78a0c6' });
    this.rows = [];
    for (let i = 0; i < 11; i++) {
      const label = this.add.text(30, 74 + i * 22, '', { fontFamily: FONT, fontSize: '8px', color: '#c9c4dc' });
      const value = this.add.text(334, 74 + i * 22, '', { fontFamily: FONT, fontSize: '8px', color: '#ffffff' }).setOrigin(1, 0);
      this.rows.push({ label, value });
    }
    this.cursor = this.add.graphics();
    this.slotTexts = [0, 1, 2, 3].map((i) => this.add.text(376, 76 + i * 40, '', { fontFamily: FONT, fontSize: '8px', color: PLAYER_CSS[i], lineSpacing: 6 }));
    this.portraits = [0, 1, 2, 3].map((i) => this.add.sprite(596, 92 + i * 40, 'ss_idle', 0).setScale(0.6));
    this.add.text(376, 248, 'CONTROLLERS', { fontFamily: FONT, fontSize: '7px', color: '#78a0c6' });
    this.add.text(376, 262, 'A  JOIN AS NEW PLAYER\nY  CONTROL PLAYER 1\nB  LEAVE', { fontFamily: FONT, fontSize: '6px', color: '#8a87a3', lineSpacing: 6 });
    this.padStatus = this.add.text(376, 306, '', { fontFamily: FONT, fontSize: '6px', color: '#c9c4dc', lineSpacing: 5 });
    this.hint = this.add.text(VIEW_W / 2, 350, 'CLICK OR W/S SELECT   CLICK  <  >  OR A/D CHANGE   ENTER CONFIRM', { fontFamily: FONT, fontSize: '6px', color: '#8a87a3' }).setOrigin(0.5);

    // mouse: hover picks a row, left click changes it (left half of the value = back one step),
    // right click steps back, clicking CHOOSE STAGE continues
    this.input.mouse.disableContextMenu();
    makeButton(this, 12, 8, '< BACK', () => this.scene.start('Title'));
    this.click = null;
    this.input.on('pointermove', (p) => {
      const i = this.rowAt(p.x, p.y);
      if (i >= 0 && i !== this.sel) { this.sel = i; sfx('menu', 0.3); }
    });
    this.input.on('pointerdown', (p) => { this.click = { x: p.x, y: p.y, right: p.rightButtonDown() }; });
  }

  rowAt(x, y) {
    if (x < 22 || x > 340) return -1;
    const i = Math.floor((y - 70) / 22);
    if (i < 0 || i >= this.items().length || y - 70 - i * 22 > 16) return -1;
    return i;
  }

  items() {
    const s = settings;
    const humans = 1 + s.extraPads.length;
    const maxCpu = 4 - humans;
    s.cpuCount = Math.min(s.cpuCount, maxCpu);
    if (humans + s.cpuCount < 2) s.cpuCount = Math.max(1, 2 - humans);
    const rows = [
      { label: 'MODE', value: MODE_NAMES[s.mode], change: (d) => { s.mode = MODES[(MODES.indexOf(s.mode) + d + 3) % 3]; } },
    ];
    if (s.mode === 'stock') rows.push({ label: 'STOCKS', value: String(s.stocks), change: (d) => { s.stocks = Phaser.Math.Clamp(s.stocks + d, 1, 5); } });
    if (s.mode === 'time') rows.push({ label: 'TIME', value: s.minutes + ' MIN', change: (d) => { s.minutes = Phaser.Math.Clamp(s.minutes + d, 1, 5); } });
    if (s.mode === 'stamina') rows.push({ label: 'STAMINA HP', value: String(s.hp), change: (d) => { s.hp = HPS[(HPS.indexOf(s.hp) + d + HPS.length) % HPS.length]; } });
    rows.push(
      { label: 'CPU PLAYERS', value: String(s.cpuCount), change: (d) => { s.cpuCount = Phaser.Math.Clamp(s.cpuCount + d, humans >= 2 ? 0 : 1, maxCpu); } },
      { label: 'CPU LEVEL', value: DIFFICULTY[s.difficulty].name, change: (d) => { s.difficulty = (s.difficulty + d + 3) % 3; } },
      { label: 'ITEMS', value: s.items ? 'ON' : 'OFF', change: () => { s.items = !s.items; } },
      { label: 'STAGE HAZARDS', value: s.hazards ? 'ON' : 'OFF', change: () => { s.hazards = !s.hazards; } },
      { label: 'CRT FILTER', value: s.crt ? 'ON' : 'OFF', change: () => { s.crt = !s.crt; } },
      { label: 'SFX VOLUME', value: String(Math.round(s.sfxVolume * 10)), change: (d) => { s.sfxVolume = Phaser.Math.Clamp(Math.round(s.sfxVolume * 10 + d), 0, 10) / 10; } },
      { label: 'CHOOSE STAGE', value: '', start: true },
    );
    return rows;
  }

  update() {
    this.t++;
    const m = this.menu.poll();
    const s = settings;
    // controller join / leave
    for (const p of m.pads) {
      const joined = s.extraPads.includes(p.pad) || s.p1Pad === p.pad;
      if (p.button === 'a' && !joined && s.extraPads.length < 3) { s.extraPads.push(p.pad); sfx('select', 0.7); continue; }
      if (p.button === 'y' && !joined) { s.p1Pad = p.pad; sfx('select', 0.7); continue; }
      if (p.button === 'b' && joined) { s.extraPads = s.extraPads.filter((x) => x !== p.pad); if (s.p1Pad === p.pad) s.p1Pad = null; sfx('menu', 0.7); continue; }
      if (p.button === 'start' && joined) m.ok = true;
      if (p.button === 'a' && joined) m.ok = true;
    }
    const rows = this.items();
    this.sel = Phaser.Math.Clamp(this.sel, 0, rows.length - 1);
    if (m.up) { this.sel = (this.sel - 1 + rows.length) % rows.length; sfx('menu', 0.5); }
    if (m.down) { this.sel = (this.sel + 1) % rows.length; sfx('menu', 0.5); }
    const row = rows[this.sel];
    if ((m.left || m.right) && row.change) { row.change(m.left ? -1 : 1); sfx('menu', 0.5, 1.2); }
    if (this.click) {
      const c = this.click; this.click = null;
      const i = this.rowAt(c.x, c.y);
      if (i >= 0) {
        this.sel = i;
        const r = rows[i];
        if (r.start && !c.right) { sfx('go', 0.8); this.scene.start('StageSelect'); return; }
        if (r.change) {
          const v = this.rows[i].value, mid = v.x - v.width / 2;
          const d = c.right || (c.x > 200 && c.x < mid) ? -1 : 1;
          r.change(d); sfx('menu', 0.5, 1.2);
        }
      }
    }
    if (m.ok) {
      if (row.start) { sfx('go', 0.8); this.scene.start('StageSelect'); return; }
      if (row.change) { row.change(1); sfx('menu', 0.5, 1.2); }
    }
    if (m.back) { this.scene.start('Title'); return; }

    // draw rows
    const fresh = this.items();
    this.cursor.clear();
    this.rows.forEach((r, i) => {
      const it = fresh[i];
      r.label.setText(it ? it.label : ''); r.value.setText(it ? (it.change && it.value && fresh[i] !== undefined ? '< ' + it.value + ' >' : it.value) : '');
      const on = i === this.sel;
      r.label.setColor(on ? '#ffffff' : '#c9c4dc');
      if (it && it.start) r.label.setColor(on ? (this.t % 30 < 15 ? '#f3c358' : '#ffffff') : '#f3c358');
      if (on) { this.cursor.fillStyle(0x78a0c6, 0.25); this.cursor.fillRect(22, 70 + i * 22, 318, 16); this.cursor.fillStyle(0x78a0c6, 1); this.cursor.fillRect(22, 70 + i * 22, 3, 16); }
    });
    // player slots
    const humans = ['P1  KEYBOARD' + (s.p1Pad !== null ? ' + PAD ' + (s.p1Pad + 1) : ''), ...s.extraPads.map((p, i) => 'P' + (i + 2) + '  PAD ' + (p + 1))];
    const total = humans.length + s.cpuCount;
    for (let i = 0; i < 4; i++) {
      let txt = '';
      const pick = ROSTER.find((r) => r.id === s.picks[i] && r.available);
      const fname = pick ? pick.name : 'PICK ON FIGHTER SELECT';
      if (i < humans.length) txt = humans[i] + '\n' + fname;
      else if (i < total) txt = 'CPU ' + (i + 1) + '  ' + DIFFICULTY[s.difficulty].name + '\n' + fname;
      else txt = '---  EMPTY';
      this.slotTexts[i].setText(txt).setColor(i < total ? PLAYER_CSS[i] : '#4a4560');
      const pick2 = ROSTER.find((r) => r.id === s.picks[i] && r.available);
      this.portraits[i].setVisible(i < total && !!pick2);
      if (pick2) showFighter(this.portraits[i], pick2.def, Math.floor((this.t + i * 9) / 6) % 32).setOrigin(0.5);
    }
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean).length : 0;
    this.padStatus.setText(pads ? pads + ' CONTROLLER' + (pads > 1 ? 'S' : '') + ' DETECTED' : 'NO CONTROLLER DETECTED\nPAIR ONE, THEN PRESS A BUTTON');
  }
}

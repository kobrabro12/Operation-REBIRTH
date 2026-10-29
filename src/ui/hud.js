// Bottom-of-screen player panels: damage % (or HP), stocks, Limit gauge. Plus timer and off-screen arrows.
import { VIEW_W, VIEW_H, FONT, PLAYER_COLORS, PLAYER_CSS, LIMIT_MAX } from '../config.js';
import { slant } from './arcade.js';

const PANEL_W = 136, PANEL_H = 46;

export class Hud {
  constructor(match) {
    this.match = match;
    const s = match;
    this.g = s.add.graphics().setDepth(10);
    this.panels = [];
    const n = match.fighters.length;
    const total = n * PANEL_W + (n - 1) * 10;
    const x0 = Math.round((VIEW_W - total) / 2);
    match.fighters.forEach((f, i) => {
      const x = x0 + i * (PANEL_W + 10), y = VIEW_H - PANEL_H - 6;
      const name = s.add.text(x + 10, y + 3, f.label, { fontFamily: FONT, fontSize: '7px', color: '#ffffff', stroke: '#07060e', strokeThickness: 3 });
      const pct = s.add.text(x + PANEL_W - 10, y + 10, '0%', { fontFamily: FONT, fontSize: '17px', color: '#ffffff', stroke: '#07060e', strokeThickness: 5, shadow: { offsetX: 2, offsetY: 2, color: '#07060e', fill: true, stroke: true } }).setOrigin(1, 0);
      const sub = s.add.text(x + 8, y + 18, '', { fontFamily: FONT, fontSize: '8px', color: '#c9c4dc' });
      this.panels.push({ f, x, y, name, pct, sub, last: '' });
      for (const o of [name, pct, sub]) o.setDepth(11);
      match.addUI(name, pct, sub);
    });
    this.timer = s.add.text(VIEW_W / 2, 8, '', { fontFamily: FONT, fontSize: '12px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5, 0);
    this.timer.setDepth(11);
    match.addUI(this.g, this.timer);
  }

  update(frame) {
    const m = this.match, g = this.g;
    g.clear();
    for (const p of this.panels) {
      const f = p.f;
      // panel
      const pc = PLAYER_COLORS[f.slot], dim = f.eliminated ? 0.35 : 1;
      slant(g, p.x + 4, p.y + 4, PANEL_W, PANEL_H, 0x000000, 0.55, 10);                       // a slanted plate: shadow, frame, dark body
      slant(g, p.x, p.y, PANEL_W, PANEL_H, pc, dim, 10);
      slant(g, p.x + 2, p.y + 2, PANEL_W - 4, PANEL_H - 4, 0x0b0a14, 0.9, 9);
      slant(g, p.x + 2, p.y + 2, 46, 11, pc, dim, 3);                                          // the name tab
      g.fillStyle(pc, 0.12 * dim); g.fillRect(p.x + 10, p.y + 14, PANEL_W - 22, 16);
      // damage readout
      let txt;
      if (f.eliminated) txt = 'OUT';
      else if (m.mode === 'stamina') txt = Math.max(0, Math.ceil(f.hp)) + 'HP';
      else txt = Math.floor(f.percent) + '%';
      if (txt !== p.last) { p.pct.setText(txt); p.last = txt; }
      const heat = m.mode === 'stamina' ? 1 - f.hp / f.maxHp : Math.min(1, f.percent / 150);
      const col = f.eliminated ? '#6b5b73' : heat > 0.66 ? '#ff4a4a' : heat > 0.33 ? '#ffb347' : '#ffffff';
      p.pct.setColor(col);
      if (f.hitstop > 0 && f.flash > 0) p.pct.setPosition(p.x + PANEL_W - 12 + (frame % 2 ? 3 : -3), p.y + 10 + (frame % 3) - 1); else p.pct.setPosition(p.x + PANEL_W - 12, p.y + 10);
      // stocks or score
      let sub = '';
      if (m.mode === 'time') sub = 'SCORE ' + (f.kos - f.falls);
      p.sub.setText(sub);
      if (m.mode !== 'time' && m.mode !== 'training') {
        for (let i = 0; i < Math.min(f.stocks, 6); i++) {
          const sx = p.x + 10 + i * 10, sy = p.y + 18;
          slant(g, sx + 1, sy + 1, 8, 8, 0x000000, 0.6, 3); slant(g, sx, sy, 8, 8, PLAYER_COLORS[f.slot], 1, 3);
          g.fillStyle(0xffffff, 0.9); g.fillRect(sx + 3, sy + 1, 2, 2);
        }
      }
      // Limit gauge
      const gx = p.x + 6, gy = p.y + PANEL_H - 12, gw = PANEL_W - 18;                          // the Limit gauge: a slanted bar
      const k = Math.min(1, f.limit / LIMIT_MAX);
      const full = k >= 1;
      if (full) slant(g, gx - 3, gy - 3, gw + 6, 13, 0x5ad0ff, 0.25 + 0.15 * Math.sin(frame * 0.3), 5);
      slant(g, gx, gy, gw, 7, 0x1a1020, 1, 4);
      if (k > 0) slant(g, gx + 1, gy + 1, Math.max(5, Math.round((gw - 2) * k)), 5, full ? (frame % 20 < 10 ? 0xf0f2f3 : 0x5ad0ff) : 0x1a7ae8, 1, 3);
      if (k > 0 && !full) slant(g, gx + 1, gy + 1, Math.max(5, Math.round((gw - 2) * k)), 2, 0xffffff, 0.25, 1);
      for (let q = 1; q < 4; q++) { g.fillStyle(0x0b0a14, 1); g.fillRect(gx + (gw * q) / 4, gy, 1, 7); }   // quarter ticks
      if (f.curse > 0) { g.fillStyle(0xb07ad0, 1); g.fillRect(p.x + PANEL_W - 14, p.y + 22, 6, 6); }
    }
    // timer
    if (m.mode === 'time') {
      const sec = Math.max(0, Math.ceil(m.timeLeft / 60));
      this.timer.setText(Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'));
      this.timer.setColor(sec <= 10 ? '#ff5a5a' : '#ffffff');
    }
    // off-screen arrows
    const cam = m.worldCam;
    const view = cam.worldView;
    for (const f of m.fighters) {
      if (!f.alive) continue;
      const cx = f.x, cy = f.y - 25;
      if (cx >= view.x && cx <= view.right && cy >= view.y && cy <= view.bottom) continue;
      const sx = Phaser.Math.Clamp((cx - view.x) / view.width * VIEW_W, 14, VIEW_W - 14);
      const sy = Phaser.Math.Clamp((cy - view.y) / view.height * VIEW_H, 14, VIEW_H - 64);
      g.fillStyle(0x0b0a14, 0.8); g.fillCircle(sx, sy, 10);
      g.lineStyle(2, PLAYER_COLORS[f.slot], 1); g.strokeCircle(sx, sy, 10);
      g.fillStyle(PLAYER_COLORS[f.slot], 1); g.fillRect(sx - 3, sy - 3, 6, 6);
    }
  }
}

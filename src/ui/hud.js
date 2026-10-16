// Bottom-of-screen player panels: damage % (or HP), stocks, Limit gauge. Plus timer and off-screen arrows.
import { VIEW_W, VIEW_H, FONT, PLAYER_COLORS, PLAYER_CSS, LIMIT_MAX } from '../config.js';

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
      const name = s.add.text(x + 8, y + 6, f.label, { fontFamily: FONT, fontSize: '8px', color: PLAYER_CSS[f.slot] });
      const pct = s.add.text(x + PANEL_W - 8, y + 6, '0%', { fontFamily: FONT, fontSize: '16px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 }).setOrigin(1, 0);
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
      g.fillStyle(0x0b0a14, 0.78); g.fillRect(p.x, p.y, PANEL_W, PANEL_H);
      g.fillStyle(PLAYER_COLORS[f.slot], 1);
      g.fillRect(p.x, p.y, PANEL_W, 2); g.fillRect(p.x, p.y + PANEL_H - 2, PANEL_W, 2); g.fillRect(p.x, p.y, 2, PANEL_H); g.fillRect(p.x + PANEL_W - 2, p.y, 2, PANEL_H);
      // damage readout
      let txt;
      if (f.eliminated) txt = 'OUT';
      else if (m.mode === 'stamina') txt = Math.max(0, Math.ceil(f.hp)) + 'HP';
      else txt = Math.floor(f.percent) + '%';
      if (txt !== p.last) { p.pct.setText(txt); p.last = txt; }
      const heat = m.mode === 'stamina' ? 1 - f.hp / f.maxHp : Math.min(1, f.percent / 150);
      const col = f.eliminated ? '#6b5b73' : heat > 0.66 ? '#ff4a4a' : heat > 0.33 ? '#ffb347' : '#ffffff';
      p.pct.setColor(col);
      if (f.hitstop > 0 && f.flash > 0) p.pct.setPosition(p.x + PANEL_W - 8 + (frame % 2 ? 2 : -2), p.y + 6); else p.pct.setPosition(p.x + PANEL_W - 8, p.y + 6);
      // stocks or score
      let sub = '';
      if (m.mode === 'time') sub = 'SCORE ' + (f.kos - f.falls);
      p.sub.setText(sub);
      if (m.mode !== 'time' && m.mode !== 'training') {
        for (let i = 0; i < Math.min(f.stocks, 6); i++) {
          const sx = p.x + 8 + i * 10, sy = p.y + 20;
          g.fillStyle(PLAYER_COLORS[f.slot], 1); g.fillRect(sx, sy, 7, 7);
          g.fillStyle(0xffffff, 1); g.fillRect(sx + 1, sy + 1, 2, 2);
        }
      }
      // Limit gauge
      const gx = p.x + 8, gy = p.y + PANEL_H - 12, gw = PANEL_W - 16;
      g.fillStyle(0x1a1020, 1); g.fillRect(gx, gy, gw, 6);
      const k = Math.min(1, f.limit / LIMIT_MAX);
      const full = k >= 1;
      g.fillStyle(full ? (frame % 20 < 10 ? 0xf0f2f3 : 0x78a0c6) : 0x076cc2, 1);
      g.fillRect(gx + 1, gy + 1, Math.round((gw - 2) * k), 4);
      if (full) { g.fillStyle(0x78a0c6, 0.4); g.fillRect(gx - 2, gy - 2, gw + 4, 10); }
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

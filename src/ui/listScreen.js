// The "list on the left, details on the right" menu screens (TRINKETS, OTHER) in the arcade look: a column of slanted
// row plates (the picked one lit in the section colour, sliding out a little), and a big detail panel with the entry's
// name, its text and a large pixel icon bobbing in the corner.
import { VIEW_W, FONT } from '../config.js';
import { panel, slant, rowBar, pixIcon, ARC, shade, hex } from './arcade.js';

export const LIST = { x: 16, y: 56, w: 214, rowH: 32, gap: 6, detail: { x: 244, y: 50, w: 382, h: 282 } };

export class ListScreen {
  // entries: [{ name, info, icon }]
  constructor(scene, entries, accent) {
    this.s = scene; this.entries = entries; this.accent = accent; this.k = 0; this.last = -1;
    const D = LIST.detail;
    const g = scene.add.graphics().setDepth(-10); panel(g, D.x, D.y, D.w, D.h, accent);
    this.g = scene.add.graphics().setDepth(-5);
    this.rows = entries.map((e, i) => scene.add.text(LIST.x + 22, this.rowY(i) + 11, e.name, { fontFamily: FONT, fontSize: '8px', color: '#c9c4dc', stroke: '#07060e', strokeThickness: 3 }));
    this.title = scene.add.text(D.x + 24, D.y + 18, '', { fontFamily: FONT, fontSize: '13px', color: '#ffffff', stroke: '#07060e', strokeThickness: 5 });
    this.info = scene.add.text(D.x + 24, D.y + 48, '', { fontFamily: FONT, fontSize: '7px', color: '#e8e4f4', lineSpacing: 8 });
  }
  rowY(i) { return LIST.y + i * (LIST.rowH + LIST.gap); }
  rowAt(x, y) { const i = Math.floor((y - LIST.y) / (LIST.rowH + LIST.gap)); return x > LIST.x && x < LIST.x + LIST.w && i >= 0 && i < this.entries.length && y - this.rowY(i) < LIST.rowH ? i : -1; }
  draw(sel, t) {
    const g = this.g, A = this.accent, D = LIST.detail; g.clear();
    if (sel !== this.last) { this.k = 0; this.last = sel; }
    this.k = Math.min(1, this.k + 0.12);
    this.entries.forEach((e, i) => {
      const on = i === sel, y = this.rowY(i), x = LIST.x + (on ? Math.round(this.k * 8) : 0);
      slant(g, x + 4, y + 4, LIST.w, LIST.rowH, 0x000000, 0.5, 8);
      if (on) rowBar(g, x, y, LIST.w, LIST.rowH, e.back ? ARC.gold : A, t, 0.4 + this.k * 0.6);
      else { slant(g, x, y, LIST.w, LIST.rowH, ARC.panel2, 0.95, 8); slant(g, x, y, 4, LIST.rowH, shade(e.back ? ARC.gold : A, 0.6), 1, 8); }
      this.rows[i].setPosition(x + 22, y + 12).setColor(on ? '#ffffff' : e.back ? hex(ARC.gold) : '#c9c4dc');
    });
    const e = this.entries[sel];
    this.title.setText(e.back ? '' : e.name).setAlpha(this.k); this.info.setText(e.info || '').setAlpha(this.k);
    if (!e.back) {
      slant(g, D.x + 20, D.y + 38, Math.min(D.w - 60, this.title.width + 30) * this.k, 3, A, 1, 3);
      if (e.icon) {                                                       // the big icon, bobbing, with a soft glow under it
        const cx = D.x + D.w - 74, cy = D.y + D.h - 78 + Math.round(Math.sin(t * 0.05) * 3);
        for (let r = 0; r < 4; r++) { g.fillStyle(A, 0.05); g.fillCircle(cx, cy, 56 - r * 10); }
        pixIcon(g, e.icon, cx + 3, cy + 3, 7, 0x000000, 0.5);
        pixIcon(g, e.icon, cx, cy, 7, A, 1, ARC.white);
      }
    }
  }
}

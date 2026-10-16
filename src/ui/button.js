// A small clickable pixel-text button used by the menus.
import { FONT } from '../config.js';

export function makeButton(scene, x, y, label, onClick, opts = {}) {
  const t = scene.add.text(x, y, label, {
    fontFamily: FONT, fontSize: opts.size || '7px', color: opts.color || '#f0f2f3',
    backgroundColor: opts.bg || '#2e246c', padding: { x: 6, y: 4 },
  }).setOrigin(opts.originX ?? 0, opts.originY ?? 0).setInteractive({ useHandCursor: true });
  const bg = opts.bg || '#2e246c', hover = opts.hover || '#4a3aa8';
  t.on('pointerover', () => t.setBackgroundColor(hover));
  t.on('pointerout', () => t.setBackgroundColor(bg));
  t.on('pointerdown', (p, lx, ly, e) => { if (p.leftButtonDown()) { e && e.stopPropagation && e.stopPropagation(); onClick(); } });
  if (opts.depth) t.setDepth(opts.depth);
  return t;
}

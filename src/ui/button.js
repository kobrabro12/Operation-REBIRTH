// A small clickable button used by the menus: pixel text on a slanted plate (the arcade look, src/ui/arcade.js).
// Returns the Text (callers move it, change its text, hide it); the plate behind follows it every frame.
import { FONT } from '../config.js';
import { slant, ARC } from './arcade.js';

const toNum = (c) => (typeof c === 'string' ? parseInt(c.replace('#', ''), 16) : c);

export function makeButton(scene, x, y, label, onClick, opts = {}) {
  const t = scene.add.text(x, y, label, {
    fontFamily: FONT, fontSize: opts.size || '7px', color: opts.color || '#ffffff', padding: opts.pad || { x: 9, y: 5 },
    stroke: '#07060e', strokeThickness: 2,
  }).setOrigin(opts.originX ?? 0, opts.originY ?? 0).setInteractive({ useHandCursor: true });
  const base = toNum(opts.bg || '#2e246c'), lit = toNum(opts.hover || '#5a46d8');
  const plate = scene.add.graphics();
  let hover = false, press = 0;
  const draw = () => {
    plate.clear();
    if (!t.active || !t.visible || t.text === '') { plate.setVisible(false); return; }
    plate.setVisible(true).setDepth(t.depth - 0.01).setAlpha(t.alpha).setScrollFactor(t.scrollFactorX, t.scrollFactorY);
    const b = t.getBounds(), p = press > 0 ? 1 : 0;
    slant(plate, b.x + 3, b.y + 3, b.width, b.height, 0x000000, 0.6, 5);
    slant(plate, b.x + p, b.y + p, b.width, b.height, hover ? lit : base, 1, 5);
    slant(plate, b.x + p, b.y + p, b.width, Math.floor(b.height / 2), 0xffffff, hover ? 0.18 : 0.08, 3);
    plate.fillStyle(hover ? ARC.gold : ARC.edge, hover ? 1 : 0.35); plate.fillRect(b.x + p, b.y + b.height - 1 + p, b.width - 5, 1);
    if (press > 0) press--;
  };
  t.on('pointerover', () => { hover = true; });
  t.on('pointerout', () => { hover = false; });
  t.on('pointerdown', (p, lx, ly, e) => { if (p.leftButtonDown()) { press = 4; e && e.stopPropagation && e.stopPropagation(); onClick(); } });
  if (opts.depth) t.setDepth(opts.depth);
  const sync = () => draw();
  scene.events.on('postupdate', sync);
  t.once('destroy', () => { scene.events.off('postupdate', sync); plate.destroy(); });
  t.plate = plate;
  // (callers that used to recolour the old background still work)
  t.setBackgroundColor = function () { return this; };
  draw();
  return t;
}

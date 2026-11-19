// A small clickable button used by the menus: pixel text on a face drawn in the menu style (buttonFace in src/ui/arcade.js).
// Returns the Text (callers move it, change its text, hide it); the plate behind follows it every frame.
import { FONT } from '../config.js';
import { buttonFace, menuStyle } from './arcade.js';

const toNum = (c) => (typeof c === 'string' ? parseInt(c.replace('#', ''), 16) : c);

/**
 * A menu button: pixel text on a face drawn in the menu style (arcade.js buttonFace). `opts.bg` / `opts.hover` pick
 * its colours (otherwise the style's own), also size, color, pad, originX/Y, depth. Returns the Text.
 */
export function makeButton(scene, x, y, label, onClick, opts = {}) {
  const st = menuStyle().btn;
  const t = scene.add.text(x, y, label, {
    fontFamily: FONT, fontSize: opts.size || '7px', color: opts.color || st.color || '#ffffff', padding: opts.pad || { x: 9, y: 5 },
    stroke: st.stroke, strokeThickness: 2,
  }).setOrigin(opts.originX ?? 0, opts.originY ?? 0).setInteractive({ useHandCursor: true });
  const base = opts.bg ? toNum(opts.bg) : st.base, lit = opts.hover ? toNum(opts.hover) : st.lit;
  const plate = scene.add.graphics();
  let hover = false, press = 0, tick = 0;
  const draw = () => {
    plate.clear();
    if (!t.active || !t.visible || t.text === '') { plate.setVisible(false); return; }
    plate.setVisible(true).setDepth(t.depth - 0.01).setAlpha(t.alpha).setScrollFactor(t.scrollFactorX, t.scrollFactorY);
    const b = t.getBounds();
    buttonFace(plate, b.x, b.y, b.width, b.height, base, lit, hover, press > 0, tick++);
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

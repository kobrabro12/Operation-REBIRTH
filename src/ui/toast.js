// ACHIEVEMENT UNLOCKED: a banner that slides down from the top of the screen, one per achievement (src/achievements.js).
// Call achievementToasts(scene, list) with what checkAchievements() returned; each shows for SHOW frames.
import { VIEW_W, FONT } from '../config.js';
import { sfx } from '../audio/sfx.js';
import { slant } from './arcade.js';

// how long each banner stays up (ms) and the gap before the next one slides in
const SHOW = 2600, GAP = 250;

export function achievementToasts(scene, list, opts = {}) {
  list.forEach((a, i) => scene.time.delayedCall((opts.delay || 300) + i * (SHOW + GAP), () => toast(scene, a, opts)));
}

function toast(scene, a, opts) {
  if (!scene.sys || !scene.sys.isActive()) return;
  const w = 260, h = 34, x = VIEW_W / 2 - w / 2, y0 = -h - 4, y1 = 6;
  const c = scene.add.container(x, y0).setDepth(200);
  if (opts.addUI) opts.addUI(c);
  const g = scene.add.graphics();
  slant(g, 4, 4, w, h, 0x000000, 0.6, 10);                                     // a slanted gold plate
  slant(g, 0, 0, w, h, 0xffd23f, 1, 10); slant(g, 3, 3, w - 6, h - 6, 0x0b0a14, 0.96, 9);
  slant(g, 3, 3, 30, h - 6, 0xffd23f, 1, 9);
  g.fillStyle(0xffd23f, 1); g.fillRect(8, 8, 18, 18); g.fillStyle(0x0b0a14, 1); g.fillRect(12, 12, 10, 3); g.fillRect(15, 15, 4, 6); g.fillRect(12, 21, 10, 2);   // a little trophy
  const t1 = scene.add.text(38, 6, 'ACHIEVEMENT UNLOCKED', { fontFamily: FONT, fontSize: '6px', color: '#ffd23f' });
  const t2 = scene.add.text(38, 17, a.name, { fontFamily: FONT, fontSize: '8px', color: '#ffffff', stroke: '#07060e', strokeThickness: 3 });
  const t3 = scene.add.text(w - 14, 18, '+' + a.coins, { fontFamily: FONT, fontSize: '7px', color: '#ffd23f' }).setOrigin(1, 0);
  c.add([g, t1, t2, t3]);
  sfx('limitready', 0.6, 1.2);
  scene.tweens.add({ targets: c, y: y1, duration: 260, ease: 'Back.Out' });
  scene.tweens.add({ targets: c, y: y0, duration: 220, delay: SHOW, ease: 'Quad.In', onComplete: () => c.destroy() });
}

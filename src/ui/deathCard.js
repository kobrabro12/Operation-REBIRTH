// THE DEATH CARD - shown on the DEFEATED screen after losing a boss fight (BossRewardScene), in the spirit of old
// cartoon-show title cards: a cream paper card that drops in, a framed snapshot of the boss as it beat you (taken by
// MatchScene.snapBoss - so it shows whichever form it was in), its quote for that form (bosses.js `card.quotes`, picked
// by the arena's cardForm()), and a progress line - START to the boss, its phase marks (`card.marks`) along the way -
// with your fighter running out to how far through the fight you got (and the %).
import { FONT } from '../config.js';
import { hex } from './arcade.js';
import { showFighter } from '../fighters/roster.js';
import { sfx } from '../audio/sfx.js';

// the card's paper, ink and frame colours
const PAPER = { paper: 0xf2e8d0, edge: 0xd8c8a0, ink: 0x2a1a10, gold: 0xc8963a, goldDk: 0x7a5420 };
// how long the card takes to drop in, and the runner to reach its spot (frames)
const TIME = { drop: 22, run: 70, runAt: 30 };

/**
 * Builds the death card in `scene` at (x, y), w x h. B = the boss (BOSSES entry), R = BossReward's data.boss (card:
 * { form, progress }, fighter, skin), def = your fighter's def, tip = a line of advice for the bottom. Returns
 * { update(t) } - call it every frame (t = frames since the screen opened) for the drop, the run and the marks lighting up.
 */
export function deathCard(scene, B, R, def, x, y, w, h, tip) {
  const card = B.card || { marks: [[0.5, 'ENRAGED']], quotes: {} }, info = R.card || { form: 'base', progress: 1 - (R.hp ?? 1) };
  const quote = card.quotes[info.form] || card.quotes.base || Object.values(card.quotes)[0] || (B.taunts || ['...'])[0];
  const box = scene.add.container(x, y - 300);
  const g = scene.add.graphics(); box.add(g);
  const txt = (tx, ty, s, size, color, o = {}) => { const t = scene.add.text(tx, ty, s, { fontFamily: FONT, fontSize: size + 'px', color, lineSpacing: 4, ...o }); box.add(t); return t; };
  // the paper: a drop shadow, the card, a double ink border and little corner flourishes
  g.fillStyle(0x000000, 0.45); g.fillRect(6, 6, w, h);
  g.fillStyle(PAPER.paper, 1); g.fillRect(0, 0, w, h);
  g.fillStyle(PAPER.edge, 1); for (let i = 0; i < 40; i++) g.fillRect((i * 97) % (w - 4) + 2, (i * 53) % (h - 4) + 2, 1 + (i % 2), 1);   // (speckles in the paper)
  g.lineStyle(2, PAPER.ink, 1); g.strokeRect(6, 6, w - 12, h - 12); g.lineStyle(1, PAPER.ink, 1); g.strokeRect(10, 10, w - 20, h - 20);
  for (const [cx, cy] of [[10, 10], [w - 10, 10], [10, h - 10], [w - 10, h - 10]]) {
    g.fillStyle(PAPER.paper, 1); g.fillCircle(cx, cy, 6); g.lineStyle(1, PAPER.ink, 1); g.strokeCircle(cx, cy, 6); g.fillStyle(PAPER.ink, 1); g.fillCircle(cx, cy, 2);
  }
  // the portrait: a gold frame round the snapshot (or a silhouette panel if there isn't one)
  const P = { x: 20, y: 20, s: 124 };
  g.fillStyle(PAPER.goldDk, 1); g.fillRect(P.x - 6, P.y - 6, P.s + 12, P.s + 12); g.fillStyle(PAPER.gold, 1); g.fillRect(P.x - 4, P.y - 4, P.s + 8, P.s + 8);
  g.fillStyle(0xffe8a0, 1); g.fillRect(P.x - 4, P.y - 4, P.s + 8, 1); g.fillRect(P.x - 4, P.y - 4, 1, P.s + 8);
  g.fillStyle(B.color, 0.35); g.fillRect(P.x, P.y, P.s, P.s);
  if (scene.textures.exists('boss_card_shot')) { const im = scene.add.image(P.x + P.s / 2, P.y + P.s / 2, 'boss_card_shot').setDisplaySize(P.s, P.s); box.add(im); }
  else { g.fillStyle(0x07060e, 0.85); g.fillCircle(P.x + P.s / 2, P.y + P.s / 2 + 8, 34); g.fillRect(P.x + P.s / 2 - 46, P.y + P.s - 30, 92, 30); txt(P.x + P.s / 2, P.y + P.s / 2 + 2, '?', 26, hex(B.color)).setOrigin(0.5); }
  const vg = scene.add.graphics(); box.add(vg);                                    // (an old-photo vignette over it)
  for (let i = 0; i < 8; i++) { vg.lineStyle(3, 0x1a1008, 0.07 * (8 - i)); vg.strokeRect(P.x + i * 2, P.y + i * 2, P.s - i * 4, P.s - i * 4); }
  // the name and the quote
  const qx = P.x + P.s + 18, qw = w - qx - 18;
  txt(qx, 22, B.short || B.name, 10, hex(B.color), { stroke: '#2a1a10', strokeThickness: 3 });
  g.fillStyle(PAPER.ink, 1); g.fillRect(qx, 38, qw, 1);
  txt(qx, 46, '"' + quote + '"', 7, '#2a1a10', { wordWrap: { width: qw } });
  // the progress line: START ... the phase marks ... the boss; your fighter runs out along it
  const L = { x1: 34, x2: w - 40, y: h - 52 }, at = (k) => L.x1 + (L.x2 - L.x1) * k;
  g.fillStyle(PAPER.ink, 1); for (let px = L.x1; px < L.x2; px += 6) g.fillRect(px, L.y, 3, 2);
  g.fillRect(L.x1 - 1, L.y - 8, 2, 10); g.fillTriangle(L.x1 + 1, L.y - 8, L.x1 + 9, L.y - 5, L.x1 + 1, L.y - 2);   // (the start flag)
  txt(L.x1, L.y + 6, 'START', 5, '#2a1a10').setOrigin(0.5, 0);
  g.fillStyle(B.color, 1); g.fillCircle(L.x2 + 8, L.y + 1, 8); g.lineStyle(2, PAPER.ink, 1); g.strokeCircle(L.x2 + 8, L.y + 1, 8);
  g.fillStyle(PAPER.ink, 1); g.fillRect(L.x2 + 4, L.y - 2, 2, 2); g.fillRect(L.x2 + 10, L.y - 2, 2, 2); g.fillRect(L.x2 + 4, L.y + 3, 8, 1);   // (the boss: a little face at the finish)
  const marks = (card.marks || []).map(([k, name], i) => {
    const mx = at(k), dot = scene.add.graphics(); box.add(dot);
    txt(mx, i % 2 ? L.y + 8 : L.y - 8, name, 5, '#2a1a10').setOrigin(0.5, i % 2 ? 0 : 1);   // (names above and below the line in turn, so close ones don't overlap)
    return { k, mx, dot, lit: false };
  });
  const prog = Math.max(0, Math.min(1, info.progress));
  const runner = scene.add.sprite(L.x1, L.y, def.sheets.idle, 0).setOrigin(0.5, def.originY || 0.9).setScale(0.55); box.add(runner);
  const pct = txt(L.x1, L.y - 46, '', 7, hex(B.color), { stroke: '#2a1a10', strokeThickness: 3 }).setOrigin(0.5, 1);
  if (tip) txt(w / 2, h - 32, tip, 5, '#5a4630', { wordWrap: { width: w - 40 }, align: 'center' }).setOrigin(0.5, 0);
  let landed = false;
  return {
    /** One frame of the card's animation. */
    update(t) {
      const k = Math.min(1, t / TIME.drop), e = 1 - Math.pow(1 - k, 3), bounce = k >= 1 ? Math.max(0, Math.sin((t - TIME.drop) * 0.5)) * 6 * Math.max(0, 1 - (t - TIME.drop) / 14) : 0;
      box.setPosition(x, y - 300 * (1 - e) - bounce);
      if (k >= 1 && !landed) { landed = true; sfx('bighit', 0.5, 1.4); }
      const r = Math.min(1, Math.max(0, (t - TIME.runAt) / TIME.run)), now = prog * (1 - Math.pow(1 - r, 2));
      runner.setPosition(at(now), L.y);
      showFighter(runner, def, r > 0 && r < 1 ? Math.floor(t / 4) : Math.floor(t / 8), R.skin);
      pct.setPosition(at(now), L.y - 34).setText(r > 0 ? Math.round(now * 100) + '%' : '');
      for (const m of marks) {
        const lit = now >= m.k; m.dot.clear(); m.dot.fillStyle(lit ? B.color : PAPER.paper, 1); m.dot.fillCircle(m.mx, L.y + 1, 4); m.dot.lineStyle(1.5, PAPER.ink, 1); m.dot.strokeCircle(m.mx, L.y + 1, 4);
        if (lit && !m.lit) sfx('ding', 0.4, 1.2); m.lit = lit;
      }
    },
  };
}

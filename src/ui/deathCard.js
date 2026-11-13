// THE DEATH CARD - the whole DEFEATED screen after losing a boss fight (BossRewardScene), in the spirit of old
// cartoon-show title cards: a cream paper card filling the screen drops in, with a painted portrait of the boss in
// the form it beat you in (MatchScene.paintBossCard: the boss's own drawing in its gloating pose on a backdrop of rays
// in its colour, a vignette and a halftone print - texture 'boss_card_art'), its quote for that form (bosses.js
// `card.quotes`, picked by the arena's cardForm()), a tip, your costume for the retry, and a progress line - START to the
// boss, its phase marks (`card.marks`) along the way - with your fighter running out to how far through the fight you got.
import { FONT } from '../config.js';
import { hex } from './arcade.js';
import { showFighter } from '../fighters/roster.js';
import { sfx } from '../audio/sfx.js';

// the card's paper, ink and frame colours
const PAPER = { paper: 0xf2e8d0, edge: 0xd8c8a0, ink: 0x2a1a10, gold: 0xc8963a, goldDk: 0x7a5420, red: 0xa0201a };
// how long the card takes to drop in, and the runner to reach its spot (frames)
const TIME = { drop: 22, run: 70, runAt: 30 };
// the card's size and where things sit on it
const LAY = { x: 6, y: 6, w: 628, h: 322, pic: { x: 24, y: 44, s: 210 }, line: 290, skinY: 222 };

/**
 * Builds the death card in `scene`. B = the boss (BOSSES entry), R = BossReward's data.boss (card: { form, progress,
 * art }, fighter, skin), def = your fighter's def, tip = a line of advice, skinName = your costume's name. Returns
 * { update(t), setSkin(name, skin), skinZone } - update every frame (t = frames since the screen opened) for the
 * drop, the run and the marks lighting up; setSkin when you change costume (W/S or clicking the costume line).
 */
export function deathCard(scene, B, R, def, tip, skinName) {
  const card = B.card || { marks: [[0.5, 'ENRAGED']], quotes: {} }, info = R.card || { form: 'base', progress: 1 - (R.hp ?? 1) };
  const quote = card.quotes[info.form] || card.quotes.base || Object.values(card.quotes)[0] || (B.taunts || ['...'])[0];
  const { x, y, w, h } = LAY, box = scene.add.container(x, y - 400);
  const g = scene.add.graphics(); box.add(g);
  const txt = (tx, ty, s, size, color, o = {}) => { const t = scene.add.text(tx, ty, s, { fontFamily: FONT, fontSize: size + 'px', color, lineSpacing: 5, ...o }); box.add(t); return t; };
  // the paper: a drop shadow, the card, a double ink border, corner flourishes
  g.fillStyle(0x000000, 0.5); g.fillRect(6, 6, w, h);
  g.fillStyle(PAPER.paper, 1); g.fillRect(0, 0, w, h);
  g.fillStyle(PAPER.edge, 1); for (let i = 0; i < 90; i++) g.fillRect((i * 97) % (w - 4) + 2, (i * 53) % (h - 4) + 2, 1 + (i % 2), 1);   // (speckles in the paper)
  g.lineStyle(3, PAPER.ink, 1); g.strokeRect(7, 7, w - 14, h - 14); g.lineStyle(1, PAPER.ink, 1); g.strokeRect(12, 12, w - 24, h - 24);
  for (const [cx, cy] of [[12, 12], [w - 12, 12], [12, h - 12], [w - 12, h - 12]]) {
    g.fillStyle(PAPER.paper, 1); g.fillCircle(cx, cy, 8); g.lineStyle(1.5, PAPER.ink, 1); g.strokeCircle(cx, cy, 8); g.fillStyle(PAPER.ink, 1); g.fillCircle(cx, cy, 3);
  }
  txt(w / 2, 20, 'DEFEATED...', 14, hex(PAPER.red), { stroke: '#2a1a10', strokeThickness: 2 }).setOrigin(0.5, 0);
  // the portrait: a gold frame round the boss's painted portrait (or a silhouette panel if there isn't one)
  const P = LAY.pic;
  g.fillStyle(PAPER.goldDk, 1); g.fillRect(P.x - 7, P.y - 7, P.s + 14, P.s + 14); g.fillStyle(PAPER.gold, 1); g.fillRect(P.x - 5, P.y - 5, P.s + 10, P.s + 10);
  g.fillStyle(0xffe8a0, 1); g.fillRect(P.x - 5, P.y - 5, P.s + 10, 1); g.fillRect(P.x - 5, P.y - 5, 1, P.s + 10);
  g.fillStyle(PAPER.goldDk, 1); g.fillRect(P.x - 1, P.y - 1, P.s + 2, P.s + 2);
  g.fillStyle(B.color, 0.35); g.fillRect(P.x, P.y, P.s, P.s);
  if (info.art && scene.textures.exists('boss_card_art')) box.add(scene.add.image(P.x + P.s / 2, P.y + P.s / 2, 'boss_card_art').setDisplaySize(P.s, P.s));
  else { g.fillStyle(0x07060e, 0.85); g.fillCircle(P.x + P.s / 2, P.y + P.s / 2 + 8, 50); g.fillRect(P.x + P.s / 2 - 70, P.y + P.s - 40, 140, 40); txt(P.x + P.s / 2, P.y + P.s / 2 + 2, '?', 36, hex(B.color)).setOrigin(0.5); }
  // the name, the title and the quote
  const qx = P.x + P.s + 22, qw = w - qx - 26;
  txt(qx, 46, B.short || B.name, 14, hex(B.color), { stroke: '#2a1a10', strokeThickness: 4 });
  if (B.title) txt(qx, 68, B.title, 6, '#5a4630');
  g.fillStyle(PAPER.ink, 1); g.fillRect(qx, 82, qw, 2);
  txt(qx, 94, '"' + quote + '"', 9, '#2a1a10', { wordWrap: { width: qw }, lineSpacing: 7 });
  if (tip) txt(qx, 166, tip, 6, '#5a4630', { wordWrap: { width: qw } });
  // your costume for the retry
  g.fillStyle(PAPER.edge, 1); g.fillRect(qx, LAY.skinY - 5, qw, 18);
  const skinT = txt(qx + qw / 2, LAY.skinY, '', 7, '#2a1a10').setOrigin(0.5, 0);
  // the progress line: START ... the phase marks ... the boss; your fighter runs out along it
  const L = { x1: 38, x2: w - 46, y: LAY.line }, at = (k) => L.x1 + (L.x2 - L.x1) * k;
  g.fillStyle(PAPER.ink, 1); for (let px = L.x1; px < L.x2; px += 7) g.fillRect(px, L.y, 4, 2);
  g.fillRect(L.x1 - 1, L.y - 9, 2, 11); g.fillTriangle(L.x1 + 1, L.y - 9, L.x1 + 10, L.y - 6, L.x1 + 1, L.y - 3);   // (the start flag)
  txt(L.x1, L.y + 7, 'START', 6, '#2a1a10').setOrigin(0.5, 0);
  g.fillStyle(B.color, 1); g.fillCircle(L.x2 + 10, L.y + 1, 10); g.lineStyle(2, PAPER.ink, 1); g.strokeCircle(L.x2 + 10, L.y + 1, 10);
  g.fillStyle(PAPER.ink, 1); g.fillRect(L.x2 + 5, L.y - 3, 2, 3); g.fillRect(L.x2 + 13, L.y - 3, 2, 3); g.fillRect(L.x2 + 5, L.y + 4, 10, 1);   // (the boss at the finish)
  const marks = (card.marks || []).map(([k, name], i) => {
    const mx = at(k), dot = scene.add.graphics(); box.add(dot);
    txt(mx, i % 2 ? L.y + 9 : L.y - 9, name, 6, '#2a1a10').setOrigin(0.5, i % 2 ? 0 : 1);   // (names above and below the line in turn)
    return { k, mx, dot, lit: false };
  });
  const prog = Math.max(0, Math.min(1, info.progress));
  const runner = scene.add.sprite(L.x1, L.y, def.sheets.idle, 0).setOrigin(0.5, def.originY || 0.9).setScale(0.6); box.add(runner);
  const pct = txt(L.x1, L.y - 46, '', 8, hex(B.color), { stroke: '#2a1a10', strokeThickness: 3 }).setOrigin(0.5, 1);
  let landed = false, skin = R.skin;
  const api = {
    /** One frame of the card's animation. */
    update(t) {
      const k = Math.min(1, t / TIME.drop), e = 1 - Math.pow(1 - k, 3), bounce = k >= 1 ? Math.max(0, Math.sin((t - TIME.drop) * 0.5)) * 6 * Math.max(0, 1 - (t - TIME.drop) / 14) : 0;
      box.setPosition(x, y - 400 * (1 - e) - bounce);
      if (k >= 1 && !landed) { landed = true; sfx('bighit', 0.5, 1.4); }
      const r = Math.min(1, Math.max(0, (t - TIME.runAt) / TIME.run)), now = prog * (1 - Math.pow(1 - r, 2));
      runner.setPosition(at(now), L.y);
      showFighter(runner, def, r > 0 && r < 1 ? Math.floor(t / 4) : Math.floor(t / 8), skin);
      pct.setPosition(at(now), L.y - 40).setText(r > 0 ? Math.round(now * 100) + '%' : '');
      for (const m of marks) {
        const lit = now >= m.k; m.dot.clear(); m.dot.fillStyle(lit ? B.color : PAPER.paper, 1); m.dot.fillCircle(m.mx, L.y + 1, 5); m.dot.lineStyle(1.5, PAPER.ink, 1); m.dot.strokeCircle(m.mx, L.y + 1, 5);
        if (lit && !m.lit) sfx('ding', 0.4, 1.2); m.lit = lit;
      }
    },
    /** Shows the costume you'll retry in. */
    setSkin(name, s) { skin = s; skinT.setText('<  COSTUME: ' + name + '  (W/S)  >'); },
    // where the costume line is on the screen (clicking its left / right half changes costume)
    skinZone: { x1: x + qx, x2: x + qx + qw, y1: y + LAY.skinY - 6, y2: y + LAY.skinY + 16 },
  };
  api.setSkin(skinName, skin);
  return api;
}

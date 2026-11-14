// THE RESULTS - the whole WIN screen after a boss fight (BossRewardScene), in the spirit of old 1930s-cartoon
// run-and-gun games: a dark, flickering, film-grained card with an art-deco frame; THE RESULTS across the top, your
// fighter in a spotlight on the left, and on the right the lines tallied one by one with dotted leaders - TIME (against
// par), LIVES KEPT, DAMAGE TAKEN, WEAK SPOT HITS, LIMITS FIRED, SKILL LEVEL (stars) - then the GRADE stamped in (D- up to
// S; bosses.js `bossGrade`), then the rewards counted in underneath. The grading lives in bosses.js; this only shows it.
import { FONT, VIEW_W } from '../config.js';
import { sfx } from '../audio/sfx.js';

// the card's colours: old film browns, cream ink, gold trim
const INK = { bg: 0x140c08, bg2: 0x2a1a10, cream: 0xf4e4c0, gold: 0xd8a848, goldDk: 0x7a5420, red: 0xc0302a };
// when things happen (frames): the first line, the gap between lines, how long a number counts up, the grade's wait, the rewards' start and gap
const TIME = { first: 34, every: 26, count: 18, grade: 34, rewards: 40, rEvery: 14 };
// where things sit
const LAY = { px: 232, py: 52, pw: 392, ph: 186, row: 20, lx: 250, vx: 604, gy: 210, gx: 572, rx: 240, ry: 246 };
// a grade's colour
const GRADE_COL = (g) => (g === 'S' ? '#ffe060' : g[0] === 'A' ? '#ffd040' : g[0] === 'B' ? '#c8e0ff' : g[0] === 'C' ? '#e0c8a0' : '#d08a7a');

/**
 * Builds the results card in `scene`. B = the boss, R = BossReward's data.boss, result = bossGrade(R), rewards = the
 * reward lines ({ text, coins, kind }), opts: { sub (a line under the title, e.g. the BOSS RUSH count), newBest,
 * total (coins now) }. Returns { update(t), done(t) } - update every frame; done says the tally has finished.
 */
export function resultsCard(scene, B, R, result, rewards, opts = {}) {
  const box = scene.add.container(0, 0).setDepth(1);
  const g = scene.add.graphics(); box.add(g);
  const grain = scene.add.graphics(); box.add(grain);
  const txt = (x, y, s, size, color, o = {}) => { const t = scene.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', color, stroke: '#140c08', strokeThickness: 3, ...o }); box.add(t); return t; };
  const hx = (c) => '#' + c.toString(16).padStart(6, '0');
  // the backdrop: dark film brown, a soft spotlight on the left where your fighter stands
  g.fillStyle(INK.bg, 1); g.fillRect(0, 0, VIEW_W, 360);
  for (let r = 6; r > 0; r--) { g.fillStyle(INK.bg2, 0.12); g.fillEllipse(120, 236, 120 + r * 26, 60 + r * 14); }
  for (let i = 0; i < 8; i++) { g.fillStyle(0xfff0c8, 0.025); g.fillTriangle(120 - 8 - i * 5, 0, 120 + 8 + i * 5, 0, 120 + 60 + i * 9, 250); g.fillTriangle(120 - 8 - i * 5, 0, 120 - 60 - i * 9, 250, 120 + 60 + i * 9, 250); }
  g.fillStyle(0x000000, 0.35); g.fillEllipse(120, 262, 120, 18);
  // the art-deco frame round the tally: a double gold line, stepped corners, little fans at the top
  const { px, py, pw, ph } = LAY;
  g.fillStyle(0x000000, 0.5); g.fillRect(px + 5, py + 5, pw, ph); g.fillStyle(INK.bg2, 0.92); g.fillRect(px, py, pw, ph);
  g.lineStyle(2, INK.gold, 1); g.strokeRect(px + 4, py + 4, pw - 8, ph - 8); g.lineStyle(1, INK.goldDk, 1); g.strokeRect(px + 8, py + 8, pw - 16, ph - 16);
  for (const [cx, cy, sx, sy] of [[px + 4, py + 4, 1, 1], [px + pw - 4, py + 4, -1, 1], [px + 4, py + ph - 4, 1, -1], [px + pw - 4, py + ph - 4, -1, -1]]) {
    g.fillStyle(INK.gold, 1); g.fillRect(cx, cy, 10 * sx, 3 * sy); g.fillRect(cx, cy, 3 * sx, 10 * sy); g.fillTriangle(cx + 6 * sx, cy + 6 * sy, cx + 14 * sx, cy + 6 * sy, cx + 6 * sx, cy + 14 * sy);
  }
  for (let i = 0; i < 5; i++) { const a = Math.PI + (i + 0.5) * Math.PI / 5; g.lineStyle(1, INK.gold, 0.8); g.lineBetween(px + pw / 2, py + 4, px + pw / 2 + Math.cos(a) * 26, py + 4 + Math.sin(a) * 18); } g.lineStyle(0);
  // the title, the boss and the difficulty
  const title = txt(VIEW_W / 2, 10, 'THE RESULTS', 22, hx(INK.cream), { strokeThickness: 5 }).setOrigin(0.5, 0);
  txt(VIEW_W / 2, 37, (opts.sub ? opts.sub + '   -   ' : '') + B.name, 6, hx(INK.gold)).setOrigin(0.5, 0);
  // the lines: a label, a dotted leader, the value (counting up where it's a number); stars for the skill level
  const rows = result.rows.map((r, i) => {
    const y = py + 16 + i * LAY.row;
    const lab = txt(LAY.lx, y, r.label, 8, hx(INK.cream)).setAlpha(0), val = txt(LAY.vx, y, '', 8, '#ffffff').setOrigin(1, 0).setAlpha(0);
    const dots = scene.add.graphics(); box.add(dots);
    return { r, y, lab, val, dots, at: TIME.first + i * TIME.every, num: /^\d+/.test(r.value) ? parseInt(r.value, 10) : null };
  });
  const gradeAt = TIME.first + rows.length * TIME.every + TIME.grade;
  const gLab = txt(LAY.lx, LAY.gy - 6, 'GRADE', 12, hx(INK.cream)).setAlpha(0), gDots = scene.add.graphics(); box.add(gDots);
  const ring = scene.add.graphics(); box.add(ring);
  const gTxt = txt(LAY.gx, LAY.gy, result.grade, 24, GRADE_COL(result.grade), { strokeThickness: 6 }).setOrigin(0.5).setAlpha(0);
  const best = txt(LAY.gx - 40, LAY.gy - 3, opts.newBest ? 'NEW BEST!' : '', 6, '#ffe08a').setOrigin(1, 0).setAlpha(0);
  // the rewards underneath, in one or two columns, and the coin total
  const two = rewards.length > 6, rh = two ? 12 : 10, rw = rewards.map((l, i) => {
    const col = two ? i % 2 : 0, rI = two ? Math.floor(i / 2) : i, x = LAY.rx + col * 196, y = LAY.ry + rI * rh, w = two ? 186 : 380;
    const c = l.kind === 'unlock' ? '#7affb0' : l.kind === 'trophy' ? '#ffd23f' : l.kind === 'ach' ? '#ffb0ff' : '#f4e4c0';
    return { a: txt(x, y, l.text, 6, c).setAlpha(0), b: txt(x + w, y, l.coins ? '+' + l.coins : l.kind === 'unlock' ? 'NEW!' : l.kind === 'record' ? '!' : '', 6, '#ffe08a').setOrigin(1, 0).setAlpha(0), at: gradeAt + TIME.rewards + i * TIME.rEvery };
  });
  const totalCoins = rewards.reduce((n, l) => n + (l.coins || 0), 0), totalAt = gradeAt + TIME.rewards + rewards.length * TIME.rEvery + 10;
  const totalT = txt(LAY.rx + 380, LAY.ry + Math.ceil(rewards.length / (two ? 2 : 1)) * rh + 2, '', 8, '#ffe08a').setOrigin(1, 0);
  const haveT = txt(LAY.rx, LAY.ry + Math.ceil(rewards.length / (two ? 2 : 1)) * rh + 4, '', 6, '#a89878');
  const leader = (gr, x1, x2, y) => { gr.clear(); gr.fillStyle(INK.goldDk, 1); for (let x = x1; x < x2; x += 5) gr.fillRect(x, y, 2, 2); };
  const star = (gr, x, y, r, on) => { const p = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; p.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr }); } gr.fillStyle(on ? INK.gold : 0x3a2a1a, 1); gr.fillPoints(p, true); };
  let counted = 0;
  return {
    /** One frame of the tally: lines in, numbers counting up with ticks, the grade stamping in, rewards, the coin total; film grain and flicker over it all. */
    update(t) {
      title.setScale(1 + Math.max(0, 0.25 - t * 0.02));
      for (const R2 of rows) {
        if (t < R2.at) continue;
        const k = Math.min(1, (t - R2.at) / 8);
        R2.lab.setAlpha(k).setX(LAY.lx - (1 - k) * 20); R2.val.setAlpha(k);
        if (t === R2.at) sfx('menu', 0.5, 0.8);
        const c = Math.min(1, (t - R2.at) / TIME.count);
        if (R2.r.stars) { R2.val.setText(''); R2.dots.clear(); leader(R2.dots, R2.lab.x + R2.lab.width + 6, LAY.vx - 66, R2.y + 7); for (let s = 0; s < 3; s++) star(R2.dots, LAY.vx - 50 + s * 20, R2.y + 5, 7, s < R2.r.stars && c * 3 > s); }
        else {
          R2.val.setText(R2.num != null && c < 1 ? String(Math.round(R2.num * c)) + R2.r.value.replace(/^\d+/, '') : R2.r.value);
          leader(R2.dots, R2.lab.x + R2.lab.width + 6, LAY.vx - R2.val.width - 6, R2.y + 7);
          if (c < 1 && t % 3 === 0) sfx('clocktick', 0.25, 1.4);
        }
      }
      if (t >= gradeAt - 10) { gLab.setAlpha(Math.min(1, (t - gradeAt + 10) / 8)); leader(gDots, LAY.lx + gLab.width + 8, opts.newBest ? 462 : LAY.gx - 34, LAY.gy + 2); }
      if (t >= gradeAt) {                                                              // THE GRADE: slams in big, a ring stamps round it, sparks
        const k = Math.min(1, (t - gradeAt) / 10), e = k * k;
        gTxt.setAlpha(1).setScale(3.2 - 2.2 * e);
        ring.clear();
        if (k >= 1) { const p = Math.min(1, (t - gradeAt - 10) / 8); ring.lineStyle(3, INK.red, 0.9); ring.strokeCircle(LAY.gx, LAY.gy, 21 + (1 - p) * 10); ring.lineStyle(1, INK.red, 0.6); ring.strokeCircle(LAY.gx, LAY.gy, 25 + (1 - p) * 10); ring.lineStyle(0); best.setAlpha(p); }
        if (t === gradeAt + 10) {
          sfx('bighit', 0.9, 0.8); sfx('ding', 0.8, result.grade[0] === 'S' || result.grade[0] === 'A' ? 1.5 : 0.9);
          if (result.grade === 'S' || result.grade === 'A+') sfx('limitready', 0.8, 1);
          scene.cameras.main.shake(160, 0.006);
          for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; ring.fillStyle(0xffe080, 1); ring.fillRect(LAY.gx + Math.cos(a) * 34, LAY.gy + Math.sin(a) * 34, 3, 3); }
        }
      }
      for (const r of rw) if (t >= r.at) { const k = Math.min(1, (t - r.at) / 6); r.a.setAlpha(k); r.b.setAlpha(k); if (t === r.at) sfx('ding', 0.4, 1.1); }
      if (t >= totalAt && counted < totalCoins) { counted = Math.min(totalCoins, counted + Math.max(1, Math.ceil(totalCoins / 60))); if (t % 3 === 0) sfx('ding', 0.15, 1.8); }
      if (t >= totalAt && totalCoins) totalT.setText('TOTAL  +' + counted);
      if (t >= totalAt + 20 && opts.total != null) haveT.setText('YOU NOW HAVE ' + opts.total + ' COINS');
      // the old film: grain, a scratch now and then, a flicker
      grain.clear();
      for (let i = 0; i < 70; i++) { grain.fillStyle(i % 3 ? 0xffffff : 0x000000, 0.08); grain.fillRect(Math.random() * VIEW_W, Math.random() * 360, 1 + (i % 2), 1); }
      if (t % 47 < 5) { const x = (t * 131) % VIEW_W; grain.fillStyle(0xf4e4c0, 0.12); grain.fillRect(x, 0, 1, 360); }
      grain.fillStyle(0x000000, 0.05 + 0.04 * Math.sin(t * 0.9) * Math.sin(t * 0.37)); grain.fillRect(0, 0, VIEW_W, 360);
      for (let r = 0; r < 5; r++) { grain.lineStyle(26, 0x000000, 0.06); grain.strokeRect(r * 6 - 10, r * 6 - 10, VIEW_W - r * 12 + 20, 380 - r * 12); } grain.lineStyle(0);
    },
    /** Whether the whole tally has finished. */
    done(t) { return t > totalAt + 30; },
  };
}

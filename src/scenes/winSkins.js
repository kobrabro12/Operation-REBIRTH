// COSTUME OUTROS: win cutscenes that only play when the winner is wearing one particular costume - they replace
// that fighter's normal one (WinScene.js). One per fighter for now:
//   SOUL SUMMONER  JACK-O'-LANTERN  carves the beaten into jack-o'-lanterns
//   MR WAKE        NEON             an arcade high-score screen, the beaten at the bottom of it      (toxic)
//   LACY           SAMURAI          a duel under the cherry blossoms - YOU ARE WEAK.                  (toxic)
//   NU             BLOCK BOSS       tags an L over every one of them in his alley                     (toxic)
//   AERO           KOI              a koi pond, very zen, very smug
//   WHAT ONCE WAS  ROOT ACCESS      a terminal: SKILL ISSUE DETECTED - sudo rm -rf                     (toxic)
//   ROSEMARY       AFTER HOURS      SEEN's rave - you weren't invited                                  (toxic)
// Each entry: like CUTS in WinScene.js, plus fn: the prefix of its shot_<fn>_<shot> methods (below, mixed into
// WinScene). They use WinScene's helpers (sky, idle, move, closeUp, posLosers, vignette, glow, ...) and its pool of
// text lines (this.tvLines).
import { VIEW_W, VIEW_H } from '../config.js';
import { sfx } from '../audio/sfx.js';
import { SEEN } from '../fighters/lastSeen.js';

const W = VIEW_W, H = VIEW_H;

export const SKIN_CUTS = {
  "soul-summoner:JACK-O'-LANTERN": { fn: 'ss_pumpkin', len: 420, card: 262, name: 'SOUL SUMMONER', sub: "JACK-O'-LANTERN", line: 'TRICK OR TREAT? YOU GOT TRICKED.',
    color: '#ffa63a', stroke: '#2a0a04', shots: [[0, 'patch'], [128, 'carve'], [214, 'parade']] },
  'mr-wake:NEON': { fn: 'wake_neon', len: 440, card: 300, name: 'MR WAKE', sub: 'NEON - HIGH SCORE', line: 'INSERT COIN TO TRY AGAIN.',
    color: '#ff5ad0', stroke: '#14061e', shots: [[0, 'arcade'], [120, 'scores'], [270, 'gameover']] },
  'hero-knight:SAMURAI': { fn: 'hk_samurai', len: 420, card: 290, name: 'LACY', sub: 'SAMURAI', line: 'YOU ARE WEAK.',
    color: '#ffd8e8', stroke: '#2a0a14', shots: [[0, 'yard'], [120, 'eyes'], [176, 'sheathe']] },
  'nu:BLOCK BOSS': { fn: 'nu_street', len: 420, card: 290, name: 'NU', sub: 'BLOCK BOSS', line: 'STAY IN YOUR LANE.',
    color: '#ffd23a', stroke: '#1a0a04', shots: [[0, 'alley'], [120, 'tag'], [224, 'wall']] },
  'aero:KOI': { fn: 'aero_koi', len: 420, card: 284, name: 'AERO', sub: 'KOI', line: 'BREATHE IN. YOU LOST.',
    color: '#ffb07a', stroke: '#04202a', shots: [[0, 'pond'], [134, 'ripple'], [210, 'leap']] },
  'what-once-was:ROOT ACCESS': { fn: 'wow_hack', len: 470, card: 360, name: 'WHAT ONCE WAS', sub: 'ROOT ACCESS', line: 'GG. GET DELETED.',
    color: '#5aff8a', stroke: '#021006', shots: [[0, 'server'], [110, 'terminal'], [300, 'purge']] },
  'last-seen:AFTER HOURS': { fn: 'ls_rave', len: 430, card: 296, name: 'ROSEMARY', sub: 'AFTER HOURS', line: "PARTY'S OVER. YOU WEREN'T INVITED.",
    color: '#ff2ad8', stroke: '#0a0418', shots: [[0, 'floor'], [130, 'drop'], [214, 'party']] },
};

// spray-paint letters: strokes in a 0.6 x 1 box
const LETTERS = {
  L: [[[0, 0], [0, 1], [0.6, 1]]], E: [[[0.6, 0], [0, 0], [0, 1], [0.6, 1]], [[0, 0.5], [0.45, 0.5]]], Z: [[[0, 0], [0.6, 0], [0, 1], [0.6, 1]]],
  N: [[[0, 1], [0, 0], [0.6, 1], [0.6, 0]]], U: [[[0, 0], [0, 1], [0.6, 1], [0.6, 0]]], W: [[[0, 0], [0.15, 1], [0.3, 0.45], [0.45, 1], [0.6, 0]]],
  A: [[[0, 1], [0.3, 0], [0.6, 1]], [[0.12, 0.62], [0.48, 0.62]]], S: [[[0.6, 0], [0, 0], [0, 0.5], [0.6, 0.5], [0.6, 1], [0, 1]]],
  H: [[[0, 0], [0, 1]], [[0.6, 0], [0.6, 1]], [[0, 0.5], [0.6, 0.5]]], R: [[[0, 1], [0, 0], [0.6, 0], [0.6, 0.5], [0, 0.5], [0.6, 1]]],
};

export class SkinShots {
  // ---------------------------------------------------------------- shared bits
  // where a loser's head is on screen (for pumpkin heads and such)
  loserHead(l) {
    const [hx, hy, ox, oy] = this.headOf(l.def);
    return [l.s.x + (hx - ox) * l.s.scaleX * (l.s.flipX ? -1 : 1), l.s.y + (hy - oy) * l.s.scaleY];
  }
  // a word in spray paint, drawn up to fraction p of its strokes (and drips under it)
  spray(g, word, x, y, h, p, col, width = 6) {
    const strokes = []; let cx = x;
    for (const ch of word) { if (LETTERS[ch]) for (const st of LETTERS[ch]) strokes.push(st.map(([a, b]) => [cx + a * h, y + b * h])); cx += h * 0.85; }
    let total = 0; for (const st of strokes) for (let i = 1; i < st.length; i++) total += Math.hypot(st[i][0] - st[i - 1][0], st[i][1] - st[i - 1][1]);
    let left = total * p;
    g.lineStyle(width, col, 1);
    for (const st of strokes) for (let i = 1; i < st.length && left > 0; i++) {
      const [ax, ay] = st[i - 1], [bx, by] = st[i], d = Math.hypot(bx - ax, by - ay), f = Math.min(1, left / d);
      g.lineBetween(ax, ay, ax + (bx - ax) * f, ay + (by - ay) * f); left -= d;
      if (f === 1 && i === st.length - 1) { g.fillStyle(col, 1); g.fillRect(bx - 1, by, 3, 6 + (bx * 7 % 9)); }   // a drip
    }
  }
  // the typed text lines (this.tvLines) - [text, colour] per line, newest typing in at chars per frame
  typeLines(lines, x, y, lh, s, per, size = 11) {
    let shown = 0;
    lines.forEach(([txt, col], i) => {
      const L = this.tvLines[i]; if (!L) return;
      const start = i * per, n = Math.floor((s - start) * 1.2);
      if (n <= 0) return;
      L.setFontSize(size).setText(txt.slice(0, n)).setColor(col).setPosition(x, y + i * lh).setVisible(true);
      if (n < txt.length && s % 3 === 0 && txt[n - 1] !== ' ') shown++;
    });
    if (shown) sfx('menu', 0.15, 1.8);
  }

  // ================================================================ SOUL SUMMONER - JACK-O'-LANTERN
  // Halloween night in a pumpkin patch under a fat orange moon. The beaten kneel among the pumpkins - and he carves
  // one for each of them. When the lights come up they're wearing them.
  pumpkin(g, x, y, r, carved = 0, lit = 0, face = 0) {
    g.fillStyle(0x2a1004, 1); g.fillEllipse(x, y, r * 2.3, r * 1.8);
    g.fillStyle(0xc8580a, 1); g.fillEllipse(x - r * 0.5, y, r * 1.2, r * 1.6); g.fillEllipse(x + r * 0.5, y, r * 1.2, r * 1.6);
    g.fillStyle(0xe8781a, 1); g.fillEllipse(x, y, r * 1.2, r * 1.7);
    g.fillStyle(0xffa63a, 0.6); g.fillEllipse(x - r * 0.35, y - r * 0.35, r * 0.4, r * 0.6);
    g.fillStyle(0x3a5a1a, 1); g.fillRect(x - 2, y - r * 0.95, 4, r * 0.35);
    if (carved <= 0) return;
    const c = lit ? 0xffe060 : 0x2a1004;                                            // the face, cut in piece by piece (and lit from inside)
    if (lit) { g.fillStyle(0xffd040, 0.25 * lit); g.fillCircle(x, y, r * 1.6); }
    g.fillStyle(c, 1);
    if (carved > 0.2) g.fillTriangle(x - r * 0.55, y - r * 0.05, x - r * 0.15, y - r * 0.05, x - r * 0.35, y - r * 0.45);
    if (carved > 0.45) g.fillTriangle(x + r * 0.15, y - r * 0.05, x + r * 0.55, y - r * 0.05, x + r * 0.35, y - r * 0.45);
    if (carved > 0.75) {                                                             // the grin: three faces it can have
      if (face === 0) { for (let i = 0; i < 4; i++) g.fillTriangle(x - r * 0.6 + i * r * 0.3, y + r * 0.2, x - r * 0.3 + i * r * 0.3, y + r * 0.2, x - r * 0.45 + i * r * 0.3, y + r * 0.5); }
      else if (face === 1) { g.fillRect(x - r * 0.55, y + r * 0.2, r * 1.1, r * 0.22); g.fillStyle(0xe8781a, 1); g.fillRect(x - r * 0.25, y + r * 0.2, r * 0.12, r * 0.1); g.fillRect(x + r * 0.15, y + r * 0.32, r * 0.12, r * 0.1); }
      else { g.fillEllipse(x, y + r * 0.35, r * 0.5, r * 0.4); }
    }
  }
  patch(g, t, ground) {
    this.sky(g, 0x0a0418, 0x4a1a2a);
    this.glow(g, 470, 96, 90, 0xffa63a, 0.4); g.fillStyle(0xffc860, 1); g.fillCircle(470, 96, 40); g.fillStyle(0xe8a040, 1); g.fillCircle(458, 88, 7); g.fillCircle(486, 108, 5);   // the moon
    for (let i = 0; i < 5; i++) {                                                     // bats
      const x = (i * 140 + t * (1.2 + i * 0.2)) % (W + 40) - 20, y = 70 + i * 16 + Math.sin(t * 0.1 + i) * 10, w = Math.sin(t * 0.5 + i) > 0 ? 8 : 4;
      g.fillStyle(0x0a0410, 1); g.fillTriangle(x - w * 1.5, y - w * 0.5, x, y, x - 3, y + 2); g.fillTriangle(x + w * 1.5, y - w * 0.5, x, y, x + 3, y + 2); g.fillCircle(x, y, 2);
    }
    g.fillStyle(0x0a0410, 1);                                                        // a dead tree and a fence
    g.fillRect(70, 120, 10, ground - 120); g.lineStyle(4, 0x0a0410, 1); g.lineBetween(75, 160, 40, 120); g.lineBetween(75, 140, 110, 100); g.lineBetween(45, 125, 30, 128);
    for (let x = 0; x < W; x += 26) { g.fillRect(x, ground - 30, 4, 30); } g.fillRect(0, ground - 24, W, 3);
    g.fillStyle(0x140a06, 1); g.fillRect(0, ground, W, H - ground);
    g.lineStyle(2, 0x1a3a0a, 1); for (let x = 0; x < W; x += 60) g.lineBetween(x, ground + 6, x + 50, ground + 14 + (x % 3) * 4);   // vines
  }
  shot_ss_pumpkin_patch(t, k, s) {
    const ground = 296;
    this.patch(this.bg, t, ground);
    for (const [x, r] of [[40, 12], [180, 10], [470, 12], [600, 14], [300, 9]]) this.pumpkin(this.bg, x, ground + 2, r);
    this.idle(W / 2, ground, 3, t);
    this.posLosers([[150, ground + 4, 1.8, 0.12, 0.92, 1], [490, ground + 4, 1.8, -0.12, 0.92, 1], [90, ground + 6, 1.8, 0.12, 0.92, 1]], 0x0a0410);
    for (const l of this.losers) if (l.def) l.s.setFlipX(l.s.x > W / 2 ? !l.def.facesLeft : !!l.def.facesLeft);
    for (const [x, r] of [[110, 16], [540, 18]]) this.pumpkin(this.fx, x, ground + 22, r);
    if (s === 1) sfx('laugh', 0.4, 0.8);
    this.vignette(this.over, 0.6);
  }
  shot_ss_pumpkin_carve(t, k, s) {
    this.sky(this.bg, 0x0a0410, 0x1a0a14);
    this.hideLosers(); this.hero.setVisible(false);
    const n = Math.max(1, this.losers.filter((l) => l.def).length);
    for (let i = 0; i < n; i++) {                                                    // a pumpkin for each of them, carved one after another
      const x = W / 2 + (i - (n - 1) / 2) * 190, st = i * 24, c = Math.max(0, Math.min(1, (s - st) / 22));
      this.pumpkin(this.mid, x, 196, 62, c, c >= 1 ? 1 : 0, i % 3);
      if (c > 0 && c < 1) {                                                          // the knife, cutting
        const kx = x - 30 + c * 60, ky = 190 + Math.sin(c * 20) * 14;
        this.fx.lineStyle(4, 0xd8dce4, 1); this.fx.lineBetween(kx, ky, kx + 26, ky - 30); this.fx.lineStyle(6, 0x3a2414, 1); this.fx.lineBetween(kx + 26, ky - 30, kx + 40, ky - 46);
        if (s % 5 === 0) sfx('slash', 0.3, 1.2 + i * 0.1);
        for (let j = 0; j < 3; j++) { this.fx.fillStyle(0xffa63a, 1); this.fx.fillRect(kx + (j - 1) * 6, ky + j * 4 + (s % 5) * 2, 3, 3); }
      }
      if (s === st + 22) { sfx('flame', 0.5, 0.9); }
    }
    this.vignette(this.over, 0.8);
  }
  shot_ss_pumpkin_parade(t, k, s) {
    const ground = 296;
    this.patch(this.bg, t, ground);
    this.move('taunt', Math.min(40, 10 + s * 0.4), W / 2, ground, 3);           // the flame up high
    this.posLosers([[150, ground, 1.8, 0, 0.95], [490, ground, 1.8, 0, 0.95], [90, ground, 1.8, 0, 0.95]], 0x0a0410);   // standing now - wearing them
    this.losers.forEach((l, i) => {
      if (!l.def || !l.s.visible) return;
      l.s.setFlipX(l.s.x > W / 2 ? !l.def.facesLeft : !!l.def.facesLeft);
      const [x, y] = this.loserHead(l), flick = 0.7 + 0.3 * Math.sin(t * 0.4 + i);
      this.pumpkin(this.fx, x, y, 16, 1, flick, i % 3);
    });
    for (let i = 0; i < 10; i++) { const a = s * 0.05 + i * 0.63; this.wisp(this.fx, W / 2 + Math.cos(a) * 120, ground - 90 + Math.sin(a) * 34, 3, Math.min(1, s / 30)); }   // souls, circling
    if (s % 50 === 1) sfx('laugh', 0.3, 0.7 + (s % 3) * 0.1);
    this.vignette(this.over, 0.6);
  }

  // ================================================================ MR WAKE - NEON
  // The Neon Arcade after closing. He's had the high score for a hundred years. The beaten slump at the cabinets.
  // Then the HIGH SCORES table - with them at the bottom of it - and every screen in the place says GAME OVER.
  arcade(g, t, floor, over = 0) {
    this.sky(g, 0x06020e, 0x1a0628);
    for (let i = 0; i < 6; i++) {                                                     // the cabinets
      const x = 40 + i * 104, h = 150;
      g.fillStyle(0x140820, 1); g.fillRect(x, floor - h, 70, h); g.fillStyle(i % 2 ? 0xff2ad8 : 0x2af0ff, 1); g.fillRect(x, floor - h, 70, 6); g.fillRect(x, floor - 54, 70, 3);
      const scr = over ? ((t >> 3) % 2 ? 0x8a0a1a : 0x2a0408) : [0x2a8a5a, 0x5a2a8a, 0x8a6a1a][i % 3];
      g.fillStyle(scr, 1); g.fillRect(x + 8, floor - h + 16, 54, 44);
      if (over) { g.fillStyle(0xff3a4a, 1); g.fillRect(x + 14, floor - h + 34, 42, 6); }   // GAME OVER, in red, on every one
      else { g.fillStyle(0xffffff, 0.5); g.fillRect(x + 12 + ((t + i * 9) % 40), floor - h + 30, 4, 4); }
      g.fillStyle(0x0a0410, 1); g.fillRect(x + 10, floor - 50, 50, 12); g.fillStyle(0xff3a3a, 1); g.fillCircle(x + 22, floor - 46, 3); g.fillStyle(0x2af0ff, 1); g.fillCircle(x + 46, floor - 46, 3);
    }
    g.fillStyle(0xff2ad8, 0.9); g.fillRect(200, 44, 240, 4); g.fillRect(200, 44, 4, 26); g.fillRect(436, 44, 4, 26); g.fillRect(200, 66, 240, 4);   // a neon sign...
    g.fillStyle(0xff2ad8, 0.15 + 0.1 * Math.sin(t * 0.3)); g.fillRect(190, 36, 260, 44);
    for (let x = 0; x < W; x += 20) for (let y = floor; y < H; y += 10) { g.fillStyle(((x / 20 + y / 10) % 2) ? 0x1a0a28 : 0x0e0618, 1); g.fillRect(x, y, 20, 10); }   // the checkered floor
  }
  shot_wake_neon_arcade(t, k, s) {
    const floor = 288;
    this.arcade(this.bg, t, floor);
    this.idle(W / 2, floor, 3, t);
    this.posLosers([[144, floor, 1.9, 0.25, 0.92, 1], [456, floor, 1.9, -0.25, 0.92, 1], [560, floor, 1.9, -0.25, 0.92, 1]], 0x08020e);
    for (const l of this.losers) if (l.def) l.s.setFlipX(l.s.x < W / 2 ? !!l.def.facesLeft : !l.def.facesLeft);
    if (s % 30 === 0) sfx('laser', 0.1, 1.6 + (s % 90) / 90);
    this.vignette(this.over, 0.6);
  }
  shot_wake_neon_scores(t, k, s) {
    const g = this.bg;
    this.hideLosers(); this.hero.setVisible(false);
    g.fillStyle(0x02010a, 1); g.fillRect(0, 0, W, H);
    for (let y = 40; y < H - 40; y += 3) { g.fillStyle(0xffffff, 0.02); g.fillRect(0, y, W, 1); }
    const names = this.losers.filter((l) => l.def).map((l) => l.name);
    const rows = [['HIGH SCORES', '#2af0ff'], ['', '#ffffff'], ['1ST  WAKE  ........  999,999', (s >> 3) % 2 ? '#ffd23a' : '#ff5ad0']];
    const insults = ['000,012   SKILL ISSUE', '000,003   GO PRACTICE', '000,000   UNINSTALL'];
    names.forEach((n, i) => rows.push([(i + 2) + (['ND', 'RD', 'TH'][i]) + '  ' + n.slice(0, 10).padEnd(10, ' ') + '  ' + insults[i % 3], '#8a8aa0']));
    rows.push(['', '#ffffff'], ['NEW RECORD!  (AGAIN.)', (s >> 2) % 2 ? '#ff5ad0' : '#ffffff']);
    this.typeLines(rows, 120, 70, 22, s, 12, 11);
    if (s === 36) sfx('ding', 0.6, 1.2);
    if (s === 12 * (rows.length - 1)) sfx('limitready', 0.5, 1.4);
    this.vignette(this.over, 0.7);
  }
  shot_wake_neon_gameover(t, k, s) {
    const floor = 288;
    this.arcade(this.bg, t, floor, 1);
    this.move('taunt', (s * 0.45) % 41, W / 2, floor, 3);                         // the twirl
    this.posLosers([[144, floor, 1.9, 0.35, 0.8, 1], [456, floor, 1.9, -0.35, 0.8, 1], [560, floor, 1.9, -0.35, 0.8, 1]], 0x08020e);
    for (let i = 0; i < 14; i++) {                                                     // coins, raining down
      const sp = this.spots[i], x = sp[0] * W, y = ((sp[1] * H + s * (2 + sp[2] * 2)) % (H - 60)) + 20;
      this.fx.fillStyle(0xffd23a, 1); this.fx.fillEllipse(x, y, 8 * Math.abs(Math.cos(s * 0.2 + i)) + 2, 8); this.fx.fillStyle(0xfff4a0, 1); this.fx.fillRect(x - 1, y - 2, 2, 4);
    }
    if (s === 2) { sfx('buzz', 0.6, 0.6); sfx('clang', 0.4, 1.6); }
    if (s % 20 === 0) sfx('ding', 0.15, 2);
    this.vignette(this.over, 0.6);
  }

  // ================================================================ LACY - SAMURAI
  // A courtyard at dusk, cherry blossoms falling. The beaten stand across from her. She closes her eyes... a flash of
  // steel nobody sees. She's already past them, sliding the sword home - and only then do they fall.
  yard(g, t, ground) {
    this.sky(g, 0x2a0a2a, 0xe87a5a);
    this.glow(g, 440, 210, 120, 0xffa060, 0.35); g.fillStyle(0xffd0a0, 1); g.fillCircle(440, 210, 34);   // the setting sun
    g.fillStyle(0x1a0810, 1); g.fillRect(380, 120, 12, ground - 120); g.fillRect(560, 120, 12, ground - 120);   // a gate
    g.fillRect(360, 108, 232, 12); g.fillRect(370, 132, 212, 8); g.fillTriangle(352, 108, 360, 108, 360, 118); g.fillTriangle(600, 108, 592, 108, 592, 118);
    g.fillStyle(0x2a0a14, 1); g.fillRect(40, 150, 14, ground - 150);                // the cherry tree
    for (const [x, y, r] of [[48, 140, 40], [90, 130, 34], [20, 120, 30], [70, 100, 30], [120, 150, 26]]) { g.fillStyle(0xf4a0c0, 1); g.fillCircle(x, y, r); g.fillStyle(0xffc8dc, 1); g.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.5); }
    g.fillStyle(0x3a1a10, 1); g.fillRect(0, ground, W, H - ground); g.fillStyle(0x5a2a18, 1); for (let x = 0; x < W; x += 48) g.fillRect(x, ground, 2, H - ground);   // the floorboards
  }
  petals(g, t, n = 30, gust = 0) {
    for (let i = 0; i < n; i++) {
      const sp = this.spots[i % 40], x = ((sp[0] * W + t * (1 + gust * 6) + i * 23) % (W + 40)) - 20, y = ((sp[1] * H + t * (0.6 + sp[2])) % (H - 40)) + 20;
      g.fillStyle(i % 3 ? 0xffb8d0 : 0xffffff, 0.9); g.fillEllipse(x, y + Math.sin(t * 0.1 + i) * 4, 5, 3);
    }
  }
  shot_hk_samurai_yard(t, k, s) {
    const ground = 300;
    this.yard(this.bg, t, ground);
    this.idle(150, ground, 3, t);
    this.posLosers([[440, ground, 2.2, 0, 0.95], [520, ground, 2.2, 0, 0.95], [600, ground, 2.2, 0, 0.95]], 0x14040a);
    for (const l of this.losers) if (l.def) l.s.setFlipX(!l.def.facesLeft);
    this.petals(this.fx, t);
    if (s === 1) sfx('whoosh', 0.3, 0.5);
    this.vignette(this.over, 0.5);
  }
  shot_hk_samurai_eyes(t, k, s) {
    this.sky(this.bg, 0x14040a, 0x3a0a1a);
    this.hideLosers();
    this.closeUp(W / 2, 170, 7.5, t);
    this.hero.setTint(0xffd0d8).setTintMode(Phaser.TintModes.MULTIPLY);
    this.over.fillStyle(0x000000, 1); this.over.fillRect(0, 0, W, 120); this.over.fillRect(0, 210, W, H - 210);   // a letterbox right down to her eyes
    if (s === 30) { this.flash = 6; sfx('shing', 1, 0.8); this.cameras.main.shake(120, 0.01); }
    if (s >= 30 && s < 44) { const d = s - 30; this.over.lineStyle(3, 0xffffff, 1 - d / 14); this.over.lineBetween(-20 + d * 60, 300, 660 - d * 10, 40 - d * 4); }
    this.petals(this.fx, t, 12);
  }
  shot_hk_samurai_sheathe(t, k, s) {
    const ground = 300, fall = 52;
    this.yard(this.bg, t, ground);
    this.idle(505, ground, 3, t, true);                                               // she's already past them, back turned
    if (s === 4) sfx('clang', 0.6, 1.8);                                              // ...click. the sword's home
    this.losers.forEach((l, i) => {
      if (!l.def) return;
      const x = 300 + i * 80, d = Math.max(0, s - fall - i * 6), p = Math.min(1, d / 16);
      l.s.setPosition(x, ground + p * 4).setScale(2.2, 2.2 * (1 - p * 0.15)).setRotation(p * 1.45 * (i % 2 ? 1 : -1) * 0.9).setAlpha(0.95).setTint(0x14040a).setFlipX(!!l.def.facesLeft).setVisible(true);
      if (s >= fall + i * 6 - 10 && s < fall + i * 6 + 10) {                           // the cut, showing at last
        const a = Math.min(1, (s - (fall + i * 6 - 10)) / 6);
        this.fx.lineStyle(3, 0xffffff, a); this.fx.lineBetween(x - 40, ground - 110, x + 40, ground - 40);
      }
      if (d === 1) { sfx('slash', 0.7, 0.8 + i * 0.1); sfx('land', 0.5, 0.6); this.cameras.main.shake(100, 0.006); }
      if (d > 0 && d < 30) for (let j = 0; j < 8; j++) { this.fx.fillStyle(0xffb8d0, 1 - d / 30); this.fx.fillEllipse(x + Math.cos(j) * d * 3, ground - 70 + Math.sin(j) * d * 2 - d, 5, 3); }   // a burst of petals
    });
    this.petals(this.fx, t, 30, s > fall ? 1 : 0);
    this.vignette(this.over, 0.5);
  }

  // ================================================================ NU - BLOCK BOSS
  // His block, after dark. Boombox thumping. The beaten slumped against the wall - so he shakes up a can and tags
  // an L over every one of them, signs it, and goes back to the beat.
  alley(g, t, ground) {
    this.sky(g, 0x04040a, 0x141420);
    g.fillStyle(0x4a2018, 1); g.fillRect(0, 60, W, ground - 60);                       // the brick wall
    for (let y = 60, r = 0; y < ground; y += 10, r++) for (let x = (r % 2) * 14 - 14; x < W; x += 28) { g.fillStyle(0x5a2a1e, 1); g.fillRect(x + 1, y + 1, 26, 8); }
    g.fillStyle(0x000000, 0.35); g.fillRect(0, 60, W, ground - 60);
    g.fillStyle(0x1a1a20, 1); g.fillRect(520, 220, 90, ground - 220); g.fillStyle(0x2a3a2a, 1); g.fillRect(516, 214, 98, 10);   // a dumpster
    g.fillStyle(0x0e0e12, 1); g.fillRect(36, 40, 6, ground - 40); g.fillRect(36, 40, 40, 5);   // the streetlight
    this.glow(g, 74, 50, 120, 0xffd890, 0.35); g.fillStyle(0xffe8a0, 1); g.fillRect(66, 44, 14, 5);
    g.fillStyle(0x0c0c10, 1); g.fillRect(0, ground, W, H - ground); g.fillStyle(0x2a2a30, 1); g.fillRect(0, ground, W, 2);
  }
  boombox(g, x, y, t) {
    const b = t % 30 < 4 ? 2 : 0;
    g.fillStyle(0x1a1a20, 1); g.fillRect(x - 30 - b, y - 30 - b, 60 + b * 2, 30 + b); g.fillStyle(0xc8c8d0, 1); g.fillRect(x - 24, y - 40, 48, 4); g.fillRect(x - 24, y - 40, 4, 10); g.fillRect(x + 20, y - 40, 4, 10);
    for (const dx of [-15, 15]) { g.fillStyle(0x3a3a44, 1); g.fillCircle(x + dx, y - 15, 10 + b); g.fillStyle(0x0a0a0e, 1); g.fillCircle(x + dx, y - 15, 4); }
    g.fillStyle(0x9be32a, 1); g.fillRect(x - 4, y - 26, 8, 4);
  }
  slumped(ground) {                                                                    // the beaten, slumped against the wall
    this.posLosers([[160, ground + 2, 1.8, 0.3, 0.95, 1], [270, ground + 2, 1.8, -0.25, 0.95, 1], [380, ground + 2, 1.8, 0.3, 0.95, 1]], 0x0a0406);
  }
  shot_nu_street_alley(t, k, s) {
    const ground = 296;
    this.alley(this.bg, t, ground);
    this.slumped(ground);
    this.idle(470, ground, 3, t, true);
    this.boombox(this.mid, 560, ground, t);
    if (s % 30 === 0) sfx('hit', 0.3, 0.55);
    if (s % 30 === 15) sfx('hit', 0.15, 0.9);
    this.vignette(this.over, 0.6);
  }
  shot_nu_street_tag(t, k, s) {
    const ground = 296, n = Math.max(1, this.losers.filter((l) => l.def).length);
    this.alley(this.bg, t, ground);
    this.slumped(ground);
    this.hero.setVisible(false);
    for (let i = 0; i < n; i++) {                                                     // an L sprayed over each of them...
      const x = [160, 270, 380][i] - 20, p = Math.max(0, Math.min(1, (s - i * 20) / 18));
      if (p > 0) this.spray(this.fx, 'L', x, 110, 70, p, [0xff2a6a, 0x2af0ff, 0xffd23a][i], 8);
      if (p > 0 && p < 1) { if (s % 4 === 0) sfx('smoke', 0.25, 1.8); for (let j = 0; j < 4; j++) { this.fx.fillStyle(0xffffff, 0.5); this.fx.fillCircle(x + Math.random() * 40, 110 + Math.random() * 70, 1.5); } }
    }
    const p2 = Math.max(0, Math.min(1, (s - n * 20) / 30));                             // ...EZ, and his name on it
    if (p2 > 0) { this.spray(this.fx, 'EZ', 30, 116, 40, p2, 0x9be32a, 6); this.spray(this.fx, 'NU', 34, 170, 26, p2, 0xffffff, 4); if (s % 4 === 0 && p2 < 1) sfx('smoke', 0.25, 1.6); }
    if (s % 30 === 0) sfx('hit', 0.3, 0.55);
    this.vignette(this.over, 0.6);
  }
  shot_nu_street_wall(t, k, s) {
    const ground = 296, n = Math.max(1, this.losers.filter((l) => l.def).length);
    this.alley(this.bg, t, ground);
    for (let i = 0; i < n; i++) this.spray(this.mid, 'L', [160, 270, 380][i] - 20, 110, 70, 1, [0xff2a6a, 0x2af0ff, 0xffd23a][i], 8);
    this.spray(this.mid, 'EZ', 30, 116, 40, 1, 0x9be32a, 6); this.spray(this.mid, 'NU', 34, 170, 26, 1, 0xffffff, 4);
    this.slumped(ground);
    this.move('taunt', (s * 0.6) % 84, 480, ground, 3);                            // back to the beat
    this.boombox(this.fx, 590, ground, t);
    if (s % 30 === 0) sfx('hit', 0.3, 0.55);
    if (s % 30 === 15) sfx('hit', 0.15, 0.9);
    this.vignette(this.over, 0.6);
  }

  // ================================================================ AERO - KOI
  // A still koi pond. Lily pads, ripples, a koi turning under the surface. The beaten drift off face-down on lily pads.
  // He breathes. A koi leaps clean over him. Very peaceful. Very smug.
  pond(g, t, water) {
    this.sky(g, 0x8ad8c8, 0xe8f8f0);
    g.fillStyle(0x5aa87a, 1); g.fillEllipse(120, water, 400, 70); g.fillEllipse(540, water + 4, 380, 60);   // the far bank
    for (const x of [60, 190, 470, 590]) { g.fillStyle(0x2a6a3a, 1); g.fillRect(x - 2, water - 70, 4, 50); g.fillStyle(0xf4a0c0, 1); g.fillCircle(x, water - 72, 14); }   // little blossom trees
    g.fillStyle(0x2a8a8a, 1); g.fillRect(0, water, W, H - water); g.fillStyle(0x4ab8b0, 0.6); g.fillRect(0, water, W, 3);
    for (let i = 0; i < 8; i++) { const r = ((t * 0.5 + i * 30) % 120); g.lineStyle(1, 0xd8fff8, 0.5 * (1 - r / 120)); g.strokeEllipse(100 + i * 70, water + 30 + (i % 3) * 18, r, r * 0.25); }   // ripples
  }
  koi(g, x, y, dir, len, t, col = 0xff7a2a) {
    const wig = Math.sin(t * 0.3) * len * 0.15;
    g.fillStyle(0xffffff, 1); g.fillEllipse(x, y, len, len * 0.38);
    g.fillStyle(col, 1); g.fillEllipse(x + dir * len * 0.15, y - len * 0.04, len * 0.5, len * 0.28); g.fillEllipse(x - dir * len * 0.22, y + len * 0.02, len * 0.25, len * 0.2);
    g.fillStyle(col, 1); g.fillTriangle(x - dir * len * 0.48, y, x - dir * len * 0.78, y - len * 0.22 + wig, x - dir * len * 0.78, y + len * 0.22 + wig);   // the tail
    g.fillStyle(0x0a0a0a, 1); g.fillCircle(x + dir * len * 0.38, y - len * 0.06, Math.max(1, len * 0.04));
  }
  lily(g, x, y, r) { g.fillStyle(0x3a9a4a, 1); g.fillEllipse(x, y, r * 2, r * 0.6); g.fillStyle(0x2a7a3a, 1); g.fillTriangle(x, y, x + r, y - r * 0.15, x + r, y + r * 0.15); g.fillStyle(0x6ac87a, 0.6); g.fillEllipse(x - r * 0.4, y - r * 0.08, r * 0.6, r * 0.15); }
  driftLosers(s, water) {
    const pos = [0, 1, 2].map((i) => [((120 + i * 200 + s * (0.5 + i * 0.15)) % (W + 160)) - 40, water + 36 + i * 22]);
    pos.slice(0, this.losers.length).forEach(([x, y]) => this.lily(this.mid, x, y + 4, 30));
    this.posLosers(pos.map(([x, y], i) => [x, y, 1.4, (i % 2 ? 1 : -1) * 1.5, 0.85]), 0x0a3a3a);
  }
  shot_aero_koi_pond(t, k, s) {
    const water = 230;
    this.pond(this.bg, t, water);
    for (let i = 0; i < 3; i++) this.koi(this.bg, ((s * (0.8 + i * 0.3) + i * 220) % (W + 80)) - 40, water + 50 + i * 26, 1, 30, t + i * 9, [0xff7a2a, 0xffd23a, 0xc81a24][i]);
    this.driftLosers(s, water);
    this.lily(this.mid, W / 2, water + 8, 50);
    this.idle(W / 2, water + 4, 3, t);
    if (s === 1) sfx('petal', 0.5, 0.8);
    if (s % 50 === 25) sfx('ding', 0.15, 1.8);
    this.vignette(this.over, 0.3);
  }
  shot_aero_koi_ripple(t, k, s) {
    this.sky(this.bg, 0x2a8a8a, 0x8ad8c8);
    this.hideLosers();
    this.closeUp(W / 2, 160, 6.4 + k * 0.5, t);
    this.koi(this.fx, -100 + s * 10, 290, 1, 140, t, 0xff7a2a);                       // a big koi gliding past in front
    for (let i = 0; i < 4; i++) { const r = ((s * 2 + i * 40) % 160); this.fx.lineStyle(2, 0xffffff, 0.4 * (1 - r / 160)); this.fx.strokeEllipse(W / 2, 300, r * 3, r * 0.6); }
    this.vignette(this.over, 0.4);
  }
  shot_aero_koi_leap(t, k, s) {
    const water = 230;
    this.pond(this.bg, t, water);
    this.driftLosers(s + 160, water);
    this.lily(this.mid, W / 2, water + 8, 50);
    this.move('taunt', (s * 0.5) % 90, W / 2, water + 4, 3);
    const L = 70, p = Math.min(1, Math.max(0, (s - 16) / L));                         // a koi leaps right over him
    if (p > 0 && p < 1) {
      const x = 140 + p * 360, y = water + 20 - Math.sin(p * Math.PI) * 150;
      this.koi(this.fx, x, y, 1, 50, t, 0xffd23a);
      for (let j = 0; j < 4; j++) { this.fx.fillStyle(0xd8fff8, 0.8); this.fx.fillCircle(x - 30 - j * 10, y + j * 6, 3 - j * 0.5); }
    }
    if (s === 16 || s === 16 + L) { sfx('smoke', 0.5, 1.4); for (let j = 0; j < 8; j++) this.fx.fillCircle(0, 0, 0); }
    for (const at of [16, 16 + L]) if (s >= at && s < at + 24) { const d = s - at, x = at === 16 ? 140 : 500; this.fx.lineStyle(2, 0xffffff, 1 - d / 24); this.fx.strokeEllipse(x, water + 22, d * 5, d * 1.2); for (let j = 0; j < 6; j++) { this.fx.fillStyle(0xd8fff8, 1 - d / 24); this.fx.fillCircle(x + (j - 2.5) * 6, water + 10 - d * 2 + d * d * 0.12 * (1 + j % 2), 2.5); } }
    this.vignette(this.over, 0.3);
  }

  // ================================================================ WHAT ONCE WAS - ROOT ACCESS
  // A server room in the Backrooms that shouldn't exist. It's got root. A terminal: whoami, scan, SKILL ISSUE
  // DETECTED, sudo rm -rf - and back in the server room, the beaten get deleted from the top down.
  servers(g, t, floor) {
    g.fillStyle(0x020804, 1); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 7; i++) {
      const x = 20 + i * 90;
      g.fillStyle(0x0a140c, 1); g.fillRect(x, 50, 70, floor - 50); g.fillStyle(0x16281a, 1); g.fillRect(x, 50, 70, 4);
      for (let r = 0; r < 14; r++) { g.fillStyle(0x0e1c10, 1); g.fillRect(x + 6, 62 + r * 16, 58, 12); g.fillStyle(((t >> 2) + r * 3 + i * 5) % 7 < 3 ? 0x5aff8a : 0x1a4a2a, 1); g.fillRect(x + 54, 66 + r * 16, 4, 3); g.fillStyle(((t >> 3) + r + i) % 5 === 0 ? 0xffd23a : 0x1a2a1a, 1); g.fillRect(x + 46, 66 + r * 16, 4, 3); }
    }
    g.fillStyle(0x5aff8a, 0.06); g.fillRect(0, 0, W, H);
    g.fillStyle(0x040a06, 1); g.fillRect(0, floor, W, H - floor); g.fillStyle(0x1a4a2a, 1); g.fillRect(0, floor, W, 2);
  }
  shot_wow_hack_server(t, k, s) {
    const floor = 300;
    this.servers(this.bg, t, floor);
    this.idle(W / 2, 290, 2.8, t);
    this.posLosers([[130, floor, 2, 0, 0.95], [510, floor, 2, 0, 0.95], [590, floor, 2, 0, 0.95]], 0x2a0408);
    this.losers.forEach((l) => { if (l.def && l.s.visible) { const b = l.s.getBounds(); this.fx.lineStyle(2, 0xff3a3a, (t >> 3) % 2 ? 1 : 0.4); this.fx.strokeRect(b.x - 4, b.y - 4, b.width + 8, b.height + 8); } });   // QUARANTINED
    if (s % 20 === 0) sfx('buzz', 0.1, 1.4);
    this.vignette(this.over, 0.6);
  }
  shot_wow_hack_terminal(t, k, s) {
    const g = this.bg;
    this.hideLosers(); this.hero.setVisible(false);
    g.fillStyle(0x010402, 1); g.fillRect(0, 0, W, H);
    for (let y = 36; y < H - 36; y += 3) { g.fillStyle(0x5aff8a, 0.03); g.fillRect(0, y, W, 1); }
    const names = this.losers.filter((l) => l.def).map((l) => l.name.toLowerCase().replace(/ /g, '_'));
    const G = '#5aff8a', D = '#2a8a4a', R = '#ff4a4a';
    const bar = Math.min(20, Math.max(0, Math.floor((s - 9 * 16) / 2)));
    const lines = [['> whoami', G], ['root', D], ['> scan --players', G], ['found ' + names.length + ' player(s): ' + names.join(', '), D],
      ['> diagnose --all', G], ['SKILL ISSUE DETECTED (' + names.length + '/' + names.length + ')', R], ['> sudo rm -rf /players/' + (names[0] || 'you') + (names.length > 1 ? ' /players/*' : ''), G],
      ['deleting [' + '#'.repeat(bar) + '-'.repeat(20 - bar) + '] ' + bar * 5 + '%', D], ['> echo "gg ez"', G], ['gg ez', '#ffffff']];
    this.typeLines(lines, 70, 52, 25, s, 16, 11);
    if ((s >> 4) % 2 && s > 16 * 10) { this.front.fillStyle(0x5aff8a, 1); this.front.fillRect(70, 52 + 25 * 10, 8, 12); }   // the cursor
    if (s === 16 * 5 + 2) { sfx('buzz', 0.5, 0.5); this.cameras.main.shake(80, 0.004); }
    if (s === 9 * 16 + 40) sfx('limitready', 0.4, 1.6);
    this.vignette(this.over, 0.7);
  }
  shot_wow_hack_purge(t, k, s) {
    const floor = 300;
    this.servers(this.bg, t, floor);
    this.idle(W / 2, 290, 2.8, t);
    this.posLosers([[130, floor, 2, 0, 0.95], [510, floor, 2, 0, 0.95], [590, floor, 2, 0, 0.95]], 0x2a0408);
    this.losers.forEach((l, i) => {                                                   // deleted, from the top down
      if (!l.def || !l.s.visible) return;
      const b = l.s.getBounds(), p = Math.max(0, Math.min(1, (s - 10 - i * 12) / 40)), cut = b.y + b.height * p;
      if (p >= 1) { l.s.setVisible(false); return; }
      const fw = l.s.frame.width, fh = l.s.frame.height; l.s.setCrop(0, fh * p, fw, fh * (1 - p));   // erased from the top down
      for (let j = 0; j < 10; j++) { this.fx.fillStyle(j % 2 ? 0x5aff8a : 0xffffff, 1); this.fx.fillRect(b.x + ((j * 37 + s * 13) % Math.max(1, b.width)), cut - 2 - (j % 3) * 4, 4, 4); }
      if (p > 0 && s % 4 === 0) sfx('glitch', 0.2, 1.6);
    });
    this.vignette(this.over, 0.6);
  }

  // ================================================================ ROSEMARY - AFTER HOURS
  // The party never stopped. A warehouse rave: lasers, a lit-up dance floor, glow sticks - SEEN in the middle of it,
  // dragging its axe. The beat drops. When the lights come up, the beaten are out cold on the floor and SEEN's still dancing.
  rave(g, t, floor, drop = 0) {
    const N = [0xff2ad8, 0x2af0ff, 0x39ff6a, 0xfff03a], beat = (t % 24) < 4;
    g.fillStyle(0x06020e, 1); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) {                                                     // lasers from the rig
      const a = Math.sin(t * 0.04 + i) * 0.7, x = 60 + i * 104, c = N[(i + (t >> 4)) % 4];
      g.lineStyle(drop ? 3 : 2, c, drop && beat ? 1 : 0.6); g.lineBetween(x, 40, x + Math.sin(a) * 400, floor);
    }
    for (let x = 0; x < W; x += 40) for (let y = floor; y < H; y += 14) {             // the dance floor, tiles lighting up
      const on = ((x / 40 + y / 14 + (t >> 3)) % 4 === 0);
      g.fillStyle(on ? N[(x / 40 + (t >> 3)) % 4] : 0x14081e, on ? 0.8 : 1); g.fillRect(x + 1, y + 1, 38, 12);
    }
    for (let i = 0; i < 18; i++) {                                                    // the crowd, jumping
      const x = i * 36 + (i % 2) * 10, y = floor - 6 + (((t + i * 5) % 24) < 5 ? -6 : 0);
      g.fillStyle(0x0a0414, 1); g.fillCircle(x, y - 46, 8); g.fillRect(x - 9, y - 40, 18, 40);
      if (i % 3 === 0) { g.fillRect(x - 12, y - 64, 4, 22); g.fillStyle(N[i % 4], 1); g.fillRect(x - 13, y - 70, 6, 8); }   // a glow stick up
    }
    if (drop && beat) { g.fillStyle(0xffffff, 0.12); g.fillRect(0, 0, W, H); }
  }
  shot_ls_rave_floor(t, k, s) {
    const floor = 296;
    this.rave(this.bg, t, floor);
    this.idle(W / 2, floor, 3.1, t, false, SEEN);
    this.posLosers([[110, floor, 1.9, 0, 0.95], [530, floor, 1.9, 0, 0.95], [600, floor, 1.9, 0, 0.95]], 0x2a0a3a);
    if (s % 24 === 0) sfx('hit', 0.3, 0.5);
    this.vignette(this.over, 0.5);
  }
  shot_ls_rave_drop(t, k, s) {
    this.rave(this.bg, t, 296, 1);
    this.hideLosers();
    const beat = (t % 24) < 4;
    this.closeUp(W / 2, 170 + (beat ? 4 : 0), 6.2 + (beat ? 0.25 : 0), t, SEEN);
    if (s === 0 || s === 1) { sfx('bighit', 0.8, 0.5); this.flash = 4; }
    if (t % 24 === 0) { sfx('hit', 0.5, 0.45); sfx('bighit', 0.3, 0.4); this.cameras.main.shake(60, 0.006); }
    this.vignette(this.over, 0.6);
  }
  shot_ls_rave_party(t, k, s) {
    const floor = 296;
    this.rave(this.bg, t, floor, 1);
    this.move('taunt', (s * 0.5) % 84, W / 2, floor, 3.1, SEEN);                  // HAPPY BIRTHDAY - its dance
    this.posLosers([[110, floor + 6, 1.9, 1.5, 0.95], [520, floor + 6, 1.9, -1.5, 0.95], [600, floor + 8, 1.9, 1.5, 0.95]], 0x2a0a3a);   // out cold
    for (let i = 0; i < 30; i++) { const sp = this.spots[i % 40]; this.fx.fillStyle([0xff2ad8, 0x2af0ff, 0x39ff6a, 0xfff03a][i % 4], 1); this.fx.fillRect((sp[0] * W + Math.sin(s * 0.05 + i) * 20) % W, (sp[1] * H + s * (1 + sp[2])) % H, 3, 2); }   // neon confetti
    if (t % 24 === 0) sfx('hit', 0.4, 0.45);
    this.vignette(this.over, 0.5);
  }
}

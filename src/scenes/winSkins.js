// COSTUME OUTROS: win cutscenes that only play when the winner is wearing one particular costume - they replace
// that fighter's normal one (WinScene.js). One per fighter for now:
//   SOUL SUMMONER  JACK-O'-LANTERN  carves the beaten into jack-o'-lanterns
//   MR WAKE        NEON             an arcade high-score screen, the beaten at the bottom of it      (toxic)
//   MR WAKE        ROSEBUD          his midnight rose garden grows over the beaten... and it's all inside a music box
//   LACY           SAMURAI          prays at her master's stone koi shrine, then bows to the beaten  (a good game, shakuhachi music)
//   NU             BLOCK BOSS       finds their gig poster in his alley and sprays an X through it    (toxic)
//   AERO           KOI              a koi pond, very zen, very smug
//   WHAT ONCE WAS  ROOT ACCESS      a terminal: SKILL ISSUE DETECTED - sudo rm -rf                     (toxic)
//   WHAT ONCE WAS  DIAL-UP          3 AM, 1999: the modem dials, a homepage loads - the beaten are on it, trapped. NO CARRIER
//   ROSEMARY       DEEP SEA         down into the abyss: a little light in the dark, SEEN's jaws - and her, alone, with the light
//   ROSEMARY       AFTER HOURS      SEEN's rave - you weren't invited                                  (toxic)
//   ---- homages (old movies, TV, video games - all original, no real titles or logos):
//   SOUL SUMMONER  HIGH NOON         a spaghetti-western duel at high noon, then off into the sunset
//   MR WAKE        CREATURE FEATURE  a 1950s black-and-white monster picture: he rises out of the harbour
//   NU             SILENT FILM       a 1920s silent comedy: intertitles, THE HOOK, a falling piano
//   LACY           16-BIT HERO       a turn-based RPG battle, VICTORY! and a level-up screen
//   AERO           FORECAST          the 90s local TV weather: the beaten are storms blowing out to sea
// Each entry: like CUTS in WinScene.js, plus fn: the prefix of its shot_<fn>_<shot> methods (below, mixed into
// WinScene). They use WinScene's helpers (sky, idle, move, closeUp, posLosers, vignette, glow, ...) and its pool of
// text lines (this.tvLines).
import { VIEW_W, VIEW_H } from '../config.js';
import { sfx } from '../audio/sfx.js';
import { SEEN } from '../fighters/lastSeen.js';
import { skinTexture, skinInfo } from '../fighters/skins.js';

const W = VIEW_W, H = VIEW_H;

export const SKIN_CUTS = {
  "soul-summoner:JACK-O'-LANTERN": { fn: 'ss_pumpkin', len: 420, card: 262, name: 'SOUL SUMMONER', sub: "JACK-O'-LANTERN", line: 'TRICK OR TREAT? YOU GOT TRICKED.',
    color: '#ffa63a', stroke: '#2a0a04', shots: [[0, 'patch'], [128, 'carve'], [214, 'parade']] },
  'mr-wake:NEON': { fn: 'wake_neon', len: 440, card: 300, name: 'MR WAKE', sub: 'NEON - HIGH SCORE', line: 'INSERT COIN TO TRY AGAIN.',
    color: '#ff5ad0', stroke: '#14061e', shots: [[0, 'arcade'], [120, 'scores'], [270, 'gameover']] },
  'mr-wake:ROSEBUD': { fn: 'wake_rose', len: 880, card: 700, name: 'MR WAKE', sub: 'ROSEBUD', line: 'YOU WILL BLOOM BEAUTIFULLY.', music: 'bgm_outro_rosebud',
    color: '#ff4a6a', stroke: '#14020a', shots: [[0, 'gate'], [130, 'garden'], [370, 'bloom'], [480, 'waltz'], [650, 'box']] },
  'hero-knight:SAMURAI': { fn: 'hk_samurai', len: 760, card: 620, name: 'LACY', sub: 'SAMURAI', line: 'GOOD FIGHT. NOW CLIMB THE FALLS.', music: 'bgm_outro_shrine',
    color: '#ffd8e8', stroke: '#2a0a14', shots: [[0, 'garden'], [160, 'water'], [270, 'stone'], [430, 'eyes'], [500, 'bow']] },
  'nu:BLOCK BOSS': { fn: 'nu_street', len: 470, card: 362, name: 'NU', sub: 'BLOCK BOSS', line: 'NEW HEADLINER IN TOWN.',
    color: '#ffd23a', stroke: '#1a0a04', shots: [[0, 'walk'], [140, 'poster'], [200, 'tag'], [334, 'leave']] },
  'aero:KOI': { fn: 'aero_koi', len: 420, card: 284, name: 'AERO', sub: 'KOI', line: 'BREATHE IN. YOU LOST.',
    color: '#ffb07a', stroke: '#04202a', shots: [[0, 'pond'], [134, 'ripple'], [210, 'leap']] },
  'what-once-was:ROOT ACCESS': { fn: 'wow_hack', len: 470, card: 360, name: 'WHAT ONCE WAS', sub: 'ROOT ACCESS', line: 'GG. GET DELETED.',
    color: '#5aff8a', stroke: '#021006', shots: [[0, 'server'], [110, 'terminal'], [300, 'purge']] },
  'what-once-was:DIAL-UP': { fn: 'wow_dial', len: 960, card: 860, name: 'WHAT ONCE WAS', sub: 'DIAL-UP', line: "YOU'VE BEEN DISCONNECTED.", music: 'bgm_outro_dialup',
    color: '#b8c8ff', stroke: '#06081a', shots: [[0, 'room'], [150, 'connect'], [354, 'handshake'], [470, 'page'], [700, 'trapped'], [830, 'logoff']] },
  'last-seen:DEEP SEA': { fn: 'ls_abyss', len: 780, card: 620, name: 'ROSEMARY', sub: 'DEEP SEA', line: 'DOWN HERE, NOBODY SEES YOU.', music: 'bgm_outro_abyss',
    color: '#8affe8', stroke: '#020a14', shots: [[0, 'descent'], [190, 'lure'], [350, 'jaws'], [470, 'alone']] },
  'last-seen:AFTER HOURS': { fn: 'ls_rave', len: 430, card: 296, name: 'ROSEMARY', sub: 'AFTER HOURS', line: "PARTY'S OVER. YOU WEREN'T INVITED.",
    color: '#ff2ad8', stroke: '#0a0418', shots: [[0, 'floor'], [130, 'drop'], [214, 'party']] },
  // ---- homages to old movies, TV and video games (all original: no real titles, names or logos)
  'soul-summoner:HIGH NOON': { fn: 'ss_noon', len: 900, card: 720, name: 'SOUL SUMMONER', sub: 'HIGH NOON', line: 'TOO SLOW, PARTNER.', music: 'bgm_outro_western',
    color: '#ffb84a', stroke: '#2a1004', shots: [[0, 'town'], [200, 'eyes'], [330, 'clock'], [440, 'draw'], [620, 'sunset']] },
  'mr-wake:CREATURE FEATURE': { fn: 'wake_monster', len: 900, card: 780, name: 'MR WAKE', sub: 'CREATURE FEATURE', line: '...OR IS IT?', music: 'bgm_outro_monster',
    color: '#f4f4f4', stroke: '#000000', shots: [[0, 'titles'], [150, 'harbour'], [300, 'reveal'], [420, 'attack'], [600, 'paper'], [760, 'end']] },
  'nu:SILENT FILM': { fn: 'nu_silent', len: 900, card: 760, name: 'NU', sub: 'SILENT FILM', line: '...AND THE CROWD WENT WILD.', music: 'bgm_outro_ragtime',
    color: '#f0dcb0', stroke: '#1e140c', shots: [[0, 'card1'], [110, 'stage'], [330, 'card2'], [420, 'piano'], [600, 'bow']] },
  'hero-knight:16-BIT HERO': { fn: 'hk_rpg', len: 960, card: 820, name: 'LACY', sub: '16-BIT HERO', line: "LEVEL UP. THEY DIDN'T.", music: 'bgm_outro_victory',
    color: '#ffe08a', stroke: '#0a1a4a', shots: [[0, 'encounter'], [80, 'battle'], [396, 'victory'], [620, 'results']] },
  'aero:FORECAST': { fn: 'aero_forecast', len: 880, card: 740, name: 'AERO', sub: 'FORECAST', line: 'CLEAR SKIES. NO CHANCE OF YOU.', music: 'bgm_outro_weather',
    color: '#ffd23a', stroke: '#0a1a4a', shots: [[0, 'bumper'], [110, 'map'], [420, 'radar'], [560, 'fiveday']] },
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
  // a frame of one of the winner's base strips (run, death...), in its costume
  strip(name, f, x, y, sc, flip = false, def = this.def) {
    const skin = this.win.skin || 0, set = skinInfo(def.id, skin).sheetSet;
    const key = set && def.costumeSheets && def.costumeSheets[set] && def.costumeSheets[set][name] ? def.costumeSheets[set][name] : skinTexture(this, def.sheets[name], def.id, skin);
    const n = (def.frameCounts && def.frameCounts[name]) || Math.max(1, this.textures.get(key).frameTotal - 1);
    this.hero.setTexture(key, Math.floor(f) % n).setOrigin(def.originX ?? 0.5, def.originY)
      .setPosition(x, y).setScale(sc).setFlipX(!!def.facesLeft !== flip).setRotation(0).setAlpha(1).clearTint().setVisible(true);
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

  // ================================================================ MR WAKE - ROSEBUD
  // A walled rose garden at midnight, a ruined glasshouse under the moon. The gate swings open on its own. He walks
  // between the beds - and as he passes each of the beaten, thorned vines climb them and roses open over their faces.
  // He waltzes among his new topiaries while petals spiral up... then the camera finds the truth: it's all a tiny
  // garden inside an antique music box, on a table by a candle. The waltz winds down (outro_music.py, 'rosebud'),
  // the little figure stops turning, and the lid shuts.
  // a rose: a bud (open 0) unfurling into a full bloom (open 1)
  rose(g, x, y, r, open = 1, col = 0xc8102e, a = 1) {
    const dk = 0x5a0414, lt = 0xff4a6a;
    if (open < 0.25) {                                                                      // the bud, in its green sepals
      const b = r * (0.45 + open);
      g.fillStyle(0x1a4a1a, a); g.fillTriangle(x - b, y + b * 0.4, x, y - b * 0.2, x - b * 0.2, y + b); g.fillTriangle(x + b, y + b * 0.4, x, y - b * 0.2, x + b * 0.2, y + b);
      g.fillStyle(col, a); g.fillEllipse(x, y - b * 0.2, b * 1.1, b * 1.5); g.fillStyle(lt, a * 0.7); g.fillEllipse(x - b * 0.2, y - b * 0.5, b * 0.35, b * 0.6);
      return;
    }
    const o = Math.min(1, (open - 0.25) / 0.75), R = r * (0.55 + 0.45 * o);
    for (let i = 0; i < 5; i++) {                                                           // outer petals, spreading
      const ang = i * 1.2566 - 1.57 + o * 0.3, d = R * 0.55 * o;
      g.fillStyle(i % 2 ? col : dk, a); g.fillCircle(x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.8, R * 0.55);
    }
    g.fillStyle(col, a); g.fillCircle(x, y, R * 0.62);                                       // the middle ring
    g.fillStyle(lt, a * 0.8); g.fillCircle(x - R * 0.2, y - R * 0.25, R * 0.28);
    g.lineStyle(Math.max(1, R * 0.12), dk, a); g.beginPath(); g.arc(x, y, R * 0.32, 0.4, 4.8); g.strokePath();   // the spiral at its heart
    g.fillStyle(dk, a); g.fillCircle(x + R * 0.08, y + R * 0.05, R * 0.14);
  }
  // a thorned vine climbing from (x, y) up to height h, drawn up to fraction p
  vine(g, x, y, h, p, seed, a = 1) {
    if (p <= 0) return;
    const N = 18, top = Math.floor(N * Math.min(1, p));
    let px = x, py = y;
    for (let i = 1; i <= top; i++) {
      const u = i / N, nx = x + Math.sin(u * 9 + seed) * 10, ny = y - u * h;
      g.lineStyle(3, 0x1a3a14, a); g.lineBetween(px, py, nx, ny);
      if (i % 3 === 0) { g.fillStyle(0x2a5a1a, a); g.fillEllipse(nx + (i % 2 ? 6 : -6), ny, 8, 4); }           // leaves
      if (i % 2 === 0) { g.fillStyle(0x0a1a08, a); g.fillTriangle(nx, ny, nx + (i % 4 ? 4 : -4), ny - 3, nx, ny - 2); }   // thorns
      px = nx; py = ny;
    }
  }
  // where a loser's sprite is solid: points sampled across its current frame, cached (for the vines and roses)
  silhouette(l, step = 3) {
    const key = l.s.texture.key, fr = l.s.frame.name, id = key + ':' + fr;
    if (l._sil && l._sil.id === id) return l._sil.pts;
    const pts = [], f = l.s.frame;
    for (let y = 0; y < f.height; y += step) for (let x = 0; x < f.width; x += step) {
      const a = this.textures.getPixelAlpha(x, y, key, fr);
      if (a > 128) pts.push([x - f.width * l.s.originX, y - f.height * l.s.originY]);
    }
    l._sil = { id, pts }; return pts;
  }
  silScreen(l, [px, py]) { return [l.s.x + px * l.s.scaleX * (l.s.flipX ? -1 : 1), l.s.y + py * l.s.scaleY]; }
  // the beaten overgrown: vines up to fraction g, then roses opening over them (bloom 0..1)
  overgrow(l, grow, bloom, i) {
    const pts = this.silhouette(l), b = l.s.getBounds(), H = b.height;
    for (let v = 0; v < 3; v++) this.vine(this.fx, b.x + b.width * (0.25 + v * 0.25), b.bottom, H * 1.05, grow, i * 3 + v);
    pts.forEach((p, j) => {
      if (j % 7) return;
      const [x, y] = this.silScreen(l, p), up = (b.bottom - y) / H, open = Math.max(0, Math.min(1, (bloom - up * 0.5) * 2 - (j % 5) * 0.05));
      if (grow >= up && open > 0) this.rose(this.fx, x, y, 3 + (j % 3), open);
    });
  }
  moonGarden(g, t, ground) {
    this.sky(g, 0x05041a, 0x2a1838);
    this.glow(g, 470, 84, 120, 0xd8e0ff, 0.35); g.fillStyle(0xf4f0e0, 1); g.fillCircle(470, 84, 34); g.fillStyle(0xd8d4c8, 1); g.fillCircle(460, 76, 6); g.fillCircle(482, 96, 4);
    for (let i = 0; i < 24; i++) { const sp = this.spots[i]; g.fillStyle(0xffffff, 0.3 + 0.5 * ((t + i * 13) % 60 < 30)); g.fillRect(sp[0] * W, sp[1] * 120, 1, 1); }
    g.fillStyle(0x0e0a18, 1); g.fillRect(0, ground - 120, W, 120);                             // the garden wall
    for (let y = ground - 120, r = 0; y < ground; y += 12, r++) for (let x = (r % 2) * 16 - 16; x < W; x += 32) { g.fillStyle(0x16101e, 1); g.fillRect(x + 1, y + 1, 30, 10); }
    // the ruined glasshouse: iron arches, panes catching the moon, some smashed
    g.lineStyle(3, 0x1a1428, 1);
    for (let i = 0; i <= 8; i++) { const x = 60 + i * 65; g.lineBetween(x, ground, x, 90 + Math.abs(i - 4) * 12); }
    g.beginPath(); g.moveTo(60, 138); for (let i = 0; i <= 40; i++) { const u = i / 40; g.lineTo(60 + u * 520, 138 - Math.sin(u * Math.PI) * 80); } g.strokePath();
    for (let i = 0; i < 8; i++) for (let r = 0; r < 4; r++) {
      if ((i * 5 + r * 3) % 7 === 2) continue;                                              // (smashed)
      const x = 62 + i * 65, y = 150 + r * 34;
      g.fillStyle(0x8aa0d8, 0.06 + 0.05 * ((i + r) % 3)); g.fillRect(x, y, 62, 31);
      g.fillStyle(0xffffff, 0.08); g.fillTriangle(x + 4, y + 2, x + 20, y + 2, x + 4, y + 18);
    }
    for (let i = 0; i < 3; i++) { g.fillStyle(0xd8e0ff, 0.05); g.fillTriangle(380 + i * 70, 20, 430 + i * 70, 20, 160 + i * 110, ground); }   // moonbeams through the roof
    for (let x = -20; x < W; x += 46) {                                                     // the rose beds along the wall
      g.fillStyle(0x0e2410, 1); g.fillEllipse(x + 20, ground - 6, 64, 30); g.fillStyle(0x16341a, 1); g.fillEllipse(x + 14, ground - 12, 30, 14);
      for (let k = 0; k < 3; k++) this.rose(g, x + 6 + k * 14, ground - 14 - (k % 2) * 8, 4, 1, k % 2 ? 0xc8102e : 0x8a0a24);
    }
    g.fillStyle(0x0a0810, 1); g.fillRect(0, ground, W, H - ground);
    g.fillStyle(0x1a1622, 1); for (let x = 0; x < W; x += 40) g.fillRect(x + 4, ground + 6, 32, 4);   // a flagstone path
  }
  fireflies(g, t, n = 14) {
    for (let i = 0; i < n; i++) {
      const sp = this.spots[i + 10], x = sp[0] * W + Math.sin(t * 0.03 + i) * 30, y = 120 + sp[1] * 160 + Math.cos(t * 0.025 + i * 2) * 20, a = 0.5 + 0.5 * Math.sin(t * 0.1 + i * 3);
      g.fillStyle(0xd8ff8a, 0.25 * a); g.fillCircle(x, y, 5); g.fillStyle(0xf4ffc8, a); g.fillRect(x - 1, y - 1, 2, 2);
    }
  }
  fog(g, t, y, a = 0.12) { for (let i = 0; i < 5; i++) { g.fillStyle(0xb8b0d8, a); g.fillEllipse(((t * (0.3 + i * 0.1) + i * 170) % (W + 300)) - 150, y + (i % 3) * 8, 300, 26); } }
  shot_wake_rose_gate(t, k, s) {
    const ground = 300, e = k * k * (3 - 2 * k), z = 1 + e * 1.9, cx = W / 2, cy = 200;
    this.hideLosers(); this.hero.setVisible(false);
    this.moonGarden(this.bg, t, ground);
    this.fireflies(this.mid, t);
    // the outer wall and its iron gate, rushing past as we push in - the gate swinging open by itself
    const Z = (x, y) => [cx + (x - cx) * z, cy + (y - cy) * z], f = this.front, open = Math.min(1, Math.max(0, (s - 24) / 50));
    const [wl] = Z(220, 0), [wr] = Z(420, 0), [, wt] = Z(0, 40), [, wb] = Z(0, 330);
    f.fillStyle(0x08060e, 1); f.fillRect(0, 0, W, wt); f.fillRect(0, 0, wl, H); f.fillRect(wr, 0, W - wr, H);   // the wall round the gateway
    for (let y = 40; y < 330; y += 14) { const [, yy] = Z(0, y); f.fillStyle(0x110c1a, 1); f.fillRect(0, yy, wl - 2, 12 * z); f.fillRect(wr + 2, yy, W, 12 * z); }
    for (let i = 0; i < 6; i++) { const [vx, vy] = Z(200 + (i % 2) * 230, 60 + i * 40); this.vine(f, vx, vy + 40 * z, 60 * z, 1, i); this.rose(f, vx + 6, vy, 5 * z, 1); }   // ivy and roses on it
    for (const side of [-1, 1]) {                                                            // the two doors, swinging in
      const hx = side < 0 ? 220 : 420, w = 100 * Math.cos(open * 1.3);
      for (let b = 0; b <= 6; b++) {
        const x = hx - side * (b / 6) * w, [bx, by] = Z(x, 60), [, bb] = Z(x, 330);
        f.lineStyle(Math.max(2, 3 * z), 0x16121e, 1); f.lineBetween(bx, by, bx, bb);
        f.fillStyle(0x16121e, 1); f.fillTriangle(bx - 4 * z, by, bx + 4 * z, by, bx, by - 10 * z);   // spear tips
      }
      const [x0, y0] = Z(hx, 110), [x1] = Z(hx - side * w, 110); f.lineStyle(3 * z, 0x16121e, 1); f.lineBetween(x0, y0, x1, y0); const [, y2] = Z(0, 280); f.lineBetween(x0, y2, x1, y2);
      if (w > 10) { const [sx, sy] = Z(hx - side * w / 2, 180); f.lineStyle(2 * z, 0x16121e, 1); f.strokeCircle(sx, sy, 16 * z); f.strokeCircle(sx, sy, 8 * z); }   // scrollwork
    }
    if (s === 24) { sfx('clang', 0.25, 0.5); sfx('dodge', 0.3, 0.4); }                    // a creak
    this.fog(this.fx, t, 280, 0.1);
    this.vignette(this.over, 0.7);
  }
  // he walks the path between the beds; the beaten stand along it - and as he passes, the garden takes them
  shot_wake_rose_garden(t, k, s) {
    const ground = 300, xs = [150, 300, 470];
    this.moonGarden(this.bg, t, ground);
    this.posLosers(xs.map((x) => [x, ground + 2, 2.1, 0, 1]), 0x0a0818);
    for (const l of this.losers) if (l.def) l.s.setFlipX(l.s.x > W / 2 ? !l.def.facesLeft : !!l.def.facesLeft);
    const wx = -30 + s * 2.1;
    this.losers.forEach((l, i) => {                                                          // ...the vines rise behind him
      if (!l.def) return;
      const d = Math.max(0, wx - xs[i] + 20), grow = Math.min(1, d / 70), bloom = Math.max(0, (d - 60) / 60);
      this.overgrow(l, grow, bloom, i);
      if (d > 0 && d < 3) sfx('petal', 0.4, 0.6 + i * 0.1);
    });
    this.strip('run', Math.floor(s / 8), wx, ground, 3);                                     // (a slow, gliding walk)
    this.fireflies(this.fx, t, 10);
    this.fog(this.fx, t, 290);
    this.vignette(this.over, 0.6);
  }
  // close on one of them: the eyes, then the roses opening over the face
  shot_wake_rose_bloom(t, k, s) {
    this.hero.setVisible(false);
    this.sky(this.bg, 0x05041a, 0x1a1028);
    this.glow(this.bg, 520, 60, 160, 0xd8e0ff, 0.2);
    const l = this.losers.find((x) => x.def);
    this.hideLosers();
    if (!l) return;
    const [, hy, , oy] = this.headOf(l.def), sc = 7.5;
    l.s.setCrop().setVisible(true).setScale(sc).setRotation(0).setAlpha(1).setTint(0x2a2040).setFlipX(!!l.def.facesLeft);
    l.s.setPosition(W / 2, 200 + (oy - hy) * sc);                                            // its head in the middle of the screen
    const pts = this.silhouette(l, 2), [hx0, hy0] = this.loserHead(l);
    const shut = Math.min(1, Math.max(0, (s - 40) / 10));
    if (shut < 1) for (const dx of [-16, 16]) { this.glow(this.fx, hx0 + dx, hy0, 14, 0xffffff, 0.3 * (1 - shut)); this.fx.fillStyle(0xffffff, 1); this.fx.fillRect(hx0 + dx - 4, hy0 - 3 + shut * 3, 8, 7 * (1 - shut) + 1); }   // the eyes - wide, then closing
    const near = pts.map((p) => this.silScreen(l, p)).filter(([x, y]) => Math.hypot(x - hx0, y - hy0) < 150);
    for (let v = 0; v < 4; v++) this.vine(this.mid, W / 2 - 120 + v * 80, H, 260, Math.min(1, s / 50), v * 2);
    near.forEach(([x, y], j) => {
      if (j % 9) return;
      const st = 20 + (Math.hypot(x - hx0, y - hy0) / 150) * 30 + (j % 4) * 4, o = Math.max(0, Math.min(1, (s - st) / 26));
      if (o > 0) this.rose(this.fx, x, y, 10 + (j % 3) * 3, o);
    });
    const big = Math.max(0, Math.min(1, (s - 62) / 30));                                      // and one great rose, right over the face
    if (big > 0) this.rose(this.front, hx0, hy0, 46, big);
    if (s === 40) sfx('petal', 0.6, 0.5);
    if (s === 62) sfx('petal', 0.6, 0.8);
    for (let i = 0; i < 10; i++) { const sp = this.spots[i]; this.fx.fillStyle(0xc8102e, 0.8); this.fx.fillEllipse((sp[0] * W + s * (1 + sp[2])) % W, (sp[1] * H + s * 0.8) % H, 6, 4); }
    this.vignette(this.over, 0.75);
  }
  // the beaten are topiaries now, covered in roses. He waltzes among them; petals spiral up round him
  shot_wake_rose_waltz(t, k, s) {
    const ground = 300, xs = [150, 300, 470];
    this.moonGarden(this.bg, t, ground);
    this.posLosers([[110, ground + 2, 2.1, 0, 1], [530, ground + 2, 2.1, 0, 1], [600, ground + 2, 2.1, 0, 1]], 0x10301a);
    this.losers.forEach((l, i) => { if (l.def) { l.s.setFlipX(l.s.x > W / 2 ? !l.def.facesLeft : !!l.def.facesLeft); this.overgrow(l, 1, 1, i); } });
    this.move('taunt', (s * 0.5) % (this.def.moveAnims.taunt[1] * this.def.moveAnims.taunt[2]), W / 2, ground, 3);
    for (let i = 0; i < 40; i++) {                                                          // a spiral of petals
      const a = s * 0.05 + i * 0.4, r = 30 + i * 4, y = ground - 30 - i * 5 + Math.sin(s * 0.04 + i) * 6;
      this.fx.fillStyle(i % 3 ? 0xc8102e : 0xff4a6a, Math.max(0, 1 - i / 40)); this.fx.fillEllipse(W / 2 + Math.cos(a) * r, y, 6, 3 + 2 * Math.abs(Math.sin(a)));
    }
    this.fireflies(this.fx, t);
    this.fog(this.fx, t, 290);
    this.vignette(this.over, 0.6);
  }
  // the truth: a tiny garden in an old music box, by a candle. It winds down... the figure stops turning... the lid shuts
  shot_wake_rose_box(t, k, s) {
    const SHUT = 197, e = Math.min(1, s / 150), z = 1 + e * e * 0.35, cx = W / 2, cy = 230;   // a slow push in; the lid shuts at SHUT (the music's last click)
    const Z = (x, y) => [cx + (x - cx) * z, cy + (y - cy) * z];
    const g = this.bg, fl = 0.85 + 0.15 * Math.sin(t * 0.5) * Math.sin(t * 0.23);
    g.fillStyle(0x0a0604, 1); g.fillRect(0, 0, W, H);                                         // a dark room
    this.glow(g, ...Z(120, 150), 260 * z, 0xffb050, 0.35 * fl);
    const [, ty] = Z(0, 290); g.fillStyle(0x2a160a, 1); g.fillRect(0, ty, W, H - ty); g.fillStyle(0x3a2010, 1); g.fillRect(0, ty, W, 4 * z);   // the table
    { const [x, y] = Z(120, 290); g.fillStyle(0xe8dcc0, 1); g.fillRect(x - 8 * z, y - 70 * z, 16 * z, 70 * z); g.fillStyle(0xd8c8a8, 1); g.fillRect(x - 8 * z, y - 70 * z, 4 * z, 70 * z);   // the candle
      g.fillStyle(0xffd060, fl); g.fillEllipse(x, y - 82 * z, 8 * z * fl, 20 * z * fl); g.fillStyle(0xffffff, 0.9); g.fillEllipse(x, y - 78 * z, 3 * z, 8 * z); }
    // the box: front face, the open top, gold trim
    const [bx0, by0] = Z(180, 214), [bx1, by1] = Z(470, 292), [, yb] = Z(0, 140);
    g.fillStyle(0x4a1a0a, 1); g.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
    g.fillStyle(0x5a2410, 1); g.fillRect(bx0, by0, bx1 - bx0, 6 * z);
    g.lineStyle(2 * z, 0xc8a040, 1); g.strokeRect(bx0 + 8 * z, by0 + 14 * z, bx1 - bx0 - 16 * z, by1 - by0 - 22 * z);
    g.fillStyle(0xc8a040, 1); g.fillCircle((bx0 + bx1) / 2, by0 + 44 * z, 6 * z); g.fillStyle(0x2a0a04, 1); g.fillRect((bx0 + bx1) / 2 - 1.5 * z, by0 + 42 * z, 3 * z, 8 * z);   // a keyhole
    g.fillStyle(0x2a0e06, 1); g.fillRect(bx0 + 6 * z, yb, bx1 - bx0 - 12 * z, by0 - yb);      // inside
    g.fillStyle(0x1e5a2a, 1); g.fillEllipse((bx0 + bx1) / 2, (yb + by0) / 2 + 4 * z, (bx1 - bx0) * 0.8, (by0 - yb) * 0.8);   // the green felt garden
    for (let i = 0; i < 12; i++) this.rose(g, bx0 + (26 + i * 22) * z, (yb + by0) / 2 + 6 * z + Math.sin(i * 2) * 14 * z, 3 * z, 1);
    g.fillStyle(0xc8a040, 1); g.fillEllipse((bx0 + bx1) / 2 + 10 * z, by0 - 14 * z, 40 * z, 8 * z);   // the turntable he stands on
    const [kx, ky] = Z(480, 250); g.fillStyle(0xc8a040, 1); g.fillRect(kx, ky - 3 * z, 14 * z, 6 * z);   // the winding key, turning slower and slower
    const spin = Math.max(0, 1 - s / SHUT), ka = (s * 0.12 * spin);
    g.fillRect(kx + 12 * z, ky - 12 * z * Math.abs(Math.cos(ka)), 6 * z, 24 * z * Math.abs(Math.cos(ka)) + 1);
    // the little figures on it: him, turning (more and more slowly), and the beaten as tiny rose topiaries
    const turnEvery = 10 + (1 - spin) * 60, facing = Math.floor(s / turnEvery) % 2 === 0;
    const [fx_, fy_] = Z(335, 200);
    this.idle(fx_, fy_, 1.4 * z, 0, facing);
    this.posLosers([[...Z(230, 204), 1.1 * z, 0, 1], [...Z(430, 204), 1.1 * z, 0, 1], [...Z(275, 196), 1 * z, 0, 1]], 0x06140a);
    // (no vines at this size - just roses dotted on them)
    this.losers.forEach((l) => { if (l.def && l.s.visible) { const b = l.s.getBounds(); for (let j = 0; j < 8; j++) this.rose(this.fx, b.x + b.width * (0.2 + 0.09 * j), b.y + b.height * (0.15 + 0.14 * ((j * 3) % 6)), 2 * z, 1); } });
    // the lid: hinged at the back of the box, standing open - then swinging shut over all of it
    const ang = s < SHUT - 22 ? 1.85 : 1.85 * Math.max(0, 1 - (s - (SHUT - 22)) / 22) ** 0.6, Lh = 150 * z;
    const yEdge = yb + (by0 - yb) * Math.cos(ang) - Lh * Math.sin(ang) * 0.9, f = this.front;
    const lidTop = Math.min(yEdge, yb), lidBot = Math.max(yEdge, yb);
    f.fillStyle(ang > 1.57 ? 0x2a0e06 : 0x5a2410, 1); f.fillRect(bx0, lidTop, bx1 - bx0, lidBot - lidTop + (ang < 0.05 ? 2 : 0));
    if (ang > 1.57) { f.fillStyle(0x8a9ab8, 0.25); f.fillRect(bx0 + 14 * z, lidTop + 12 * z, bx1 - bx0 - 28 * z, lidBot - lidTop - 24 * z); f.lineStyle(2 * z, 0xc8a040, 1); f.strokeRect(bx0 + 10 * z, lidTop + 8 * z, bx1 - bx0 - 20 * z, lidBot - lidTop - 16 * z); }   // the mirror inside the lid
    else { f.lineStyle(2 * z, 0xc8a040, 1); f.strokeRect(bx0 + 8 * z, lidTop + 4 * z, bx1 - bx0 - 16 * z, Math.max(2, lidBot - lidTop - 8 * z)); }
    if (s === SHUT) { this.cameras.main.shake(120, 0.006); }
    if (s >= SHUT) { this.hideLosers(); this.hero.setVisible(false); }
    for (let i = 0; i < 16; i++) { const sp = this.spots[i]; this.fx.fillStyle(0xffd8a0, 0.35); this.fx.fillRect((sp[0] * W + s * 0.2) % W, (sp[1] * H - s * 0.15 + H) % H, 1, 1); }   // dust in the candlelight
    this.vignette(this.over, 0.75);
  }

  // ================================================================ LACY - SAMURAI
  // Not a gloat - a good game. A shrine pond in the east, where she trained. Cherry trees all round, koi turning
  // between the lily pads, and over it all a giant stone koi leaping for the sky - her old master's shrine. She
  // kneels in the water with her sword planted before it and prays, remembering the three words he said to anyone
  // who lost ("you are weak" - the lore in lore.js) and what the koi means: it's weak too, until it climbs the
  // falls and becomes a dragon. Then she turns and bows to the beaten. They bow back.
  cherry(g, x, y, sc, t, i = 0) {                                                       // a cherry tree in bloom
    g.fillStyle(0x2a0a14, 1); g.fillRect(x - 5 * sc, y - 70 * sc, 10 * sc, 70 * sc);
    g.lineStyle(5 * sc, 0x2a0a14, 1); g.lineBetween(x, y - 50 * sc, x - 34 * sc, y - 84 * sc); g.lineBetween(x, y - 60 * sc, x + 30 * sc, y - 96 * sc);
    const sway = Math.sin(t * 0.03 + i) * 2 * sc;
    for (const [dx, dy, r] of [[-36, -92, 26], [0, -104, 30], [32, -100, 24], [-14, -122, 22], [18, -128, 20], [-50, -76, 18], [44, -82, 18]]) {
      g.fillStyle(0xe88aac, 1); g.fillCircle(x + dx * sc + sway, y + dy * sc, r * sc);
      g.fillStyle(0xffc0d8, 1); g.fillCircle(x + (dx - r * 0.3) * sc + sway, y + (dy - r * 0.3) * sc, r * 0.55 * sc);
    }
  }
  petals(g, t, n = 30, gust = 0) {                                                       // cherry petals drifting down
    for (let i = 0; i < n; i++) {
      const sp = this.spots[i % 40], x = ((sp[0] * W + t * (1 + gust * 6) + i * 23) % (W + 40)) - 20, y = ((sp[1] * H + t * (0.6 + sp[2])) % (H - 40)) + 20;
      g.fillStyle(i % 3 ? 0xffb8d0 : 0xffffff, 0.9); g.fillEllipse(x, y + Math.sin(t * 0.1 + i) * 4, 5, 3);
    }
  }
  // the giant stone koi: leaping straight up off a rock, mossy, a sacred rope with paper streamers round its plinth
  stoneKoi(g, x, y, sc) {
    const S = 0x8a8894, D = 0x5a5864, L = 0xb8b6c4, M = 0x4a6a3a;
    g.fillStyle(D, 1); g.fillRect(x - 70 * sc, y - 30 * sc, 140 * sc, 30 * sc);          // the plinth
    g.fillStyle(S, 1); g.fillRect(x - 64 * sc, y - 34 * sc, 128 * sc, 8 * sc); g.fillStyle(L, 1); g.fillRect(x - 64 * sc, y - 34 * sc, 128 * sc, 2 * sc);
    g.fillStyle(0x3a3844, 1); for (let i = 0; i < 4; i++) g.fillRect(x - 50 * sc + i * 28 * sc, y - 20 * sc, 16 * sc, 2 * sc);   // carved words
    const sp = [], N = 26;                                                               // the body: a spine arcing up, thick in the middle
    for (let i = 0; i <= N; i++) { const u = i / N; sp.push([x + Math.sin(u * Math.PI * 0.9) * 34 * sc - u * 10 * sc, y - 34 * sc - u * 230 * sc, (6 + 30 * Math.sin(Math.PI * Math.min(1, 0.12 + u * 0.95))) * sc + (u > 0.85 ? 10 * sc : 0)]); }
    const side = (s) => sp.map(([px, py, w], i) => { const [qx, qy] = sp[Math.min(N, i + 1)], [ox, oy] = sp[Math.max(0, i - 1)], dx = qx - ox, dy = qy - oy, d = Math.hypot(dx, dy) || 1; return { x: px - dy / d * w * s, y: py + dx / d * w * s }; });
    const A = side(1), B = side(-1);
    g.fillStyle(S, 1); g.fillTriangle(sp[1][0], sp[1][1], x - 44 * sc, y - 30 * sc, x - 10 * sc, y - 60 * sc); g.fillTriangle(sp[1][0], sp[1][1], x + 44 * sc, y - 34 * sc, x + 14 * sc, y - 62 * sc);   // the tail fanned on the plinth
    g.fillStyle(D, 1); g.fillPoints([...A, ...B.reverse()], true);
    g.fillStyle(S, 1); g.fillPoints([...A.map((p, i) => ({ x: p.x * 0.75 + sp[i][0] * 0.25, y: p.y })), ...side(-0.55).reverse()], true);
    const [hx, hy] = sp[N]; g.fillStyle(S, 1); g.fillCircle(hx, hy, 18 * sc);             // the head, mouth to the sky
    g.fillStyle(L, 1); g.fillCircle(hx - 6 * sc, hy - 4 * sc, 7 * sc);
    g.fillStyle(0x2a2834, 1); g.fillEllipse(hx, hy - 16 * sc, 14 * sc, 6 * sc);           // the open mouth
    g.fillStyle(0x1a1824, 1); g.fillCircle(hx + 10 * sc, hy - 2 * sc, 3.5 * sc); g.fillStyle(L, 1); g.fillCircle(hx + 9 * sc, hy - 3 * sc, 1.2 * sc);   // its eye
    g.lineStyle(2 * sc, D, 1); g.lineBetween(hx + 6 * sc, hy - 12 * sc, hx + 24 * sc, hy - 4 * sc); g.lineBetween(hx - 4 * sc, hy - 12 * sc, hx - 20 * sc, hy - 2 * sc);   // whiskers
    for (let i = 4; i < N - 3; i += 2) {                                                 // carved scales
      const [px, py, w] = sp[i]; g.lineStyle(1.5 * sc, D, 1);
      for (let j = -1; j <= 1; j++) g.strokeCircle(px + j * w * 0.5, py - (j === 0 ? 4 : 0) * sc, 5 * sc);
    }
    for (const i of [8, 15]) { const [px, py, w] = sp[i]; g.fillStyle(S, 1); g.fillTriangle(px + w * 0.8, py, px + w * 0.8 + 26 * sc, py + 14 * sc, px + w * 0.8, py + 18 * sc); g.fillTriangle(px - w * 0.8, py, px - w * 0.8 - 22 * sc, py + 16 * sc, px - w * 0.8, py + 18 * sc); }   // fins
    for (const [i, r] of [[2, 10], [6, 8], [12, 6], [20, 5]]) { const [px, py, w] = sp[i]; g.fillStyle(M, 1); g.fillCircle(px - w * 0.6, py, r * sc); g.fillStyle(0x6a8a4a, 1); g.fillCircle(px - w * 0.7, py - 2 * sc, r * 0.5 * sc); }   // moss
    g.lineStyle(4 * sc, 0xd8c08a, 1); g.lineBetween(x - 66 * sc, y - 28 * sc, x + 66 * sc, y - 24 * sc);   // the sacred rope...
    for (let i = 0; i < 5; i++) { const zx = x - 50 * sc + i * 25 * sc, zy = y - 26 * sc; g.fillStyle(0xf8f4ec, 1); g.fillRect(zx, zy, 5 * sc, 6 * sc); g.fillRect(zx + 3 * sc, zy + 6 * sc, 5 * sc, 6 * sc); g.fillRect(zx, zy + 12 * sc, 5 * sc, 5 * sc); }   // ...and its paper streamers
  }
  // the shrine pond: dusk, far mountains with a waterfall, cherry trees all round, still water
  shrine(g, t, water, koiFall = -1) {
    this.sky(g, 0x2a1a4a, 0xffb89a);
    this.glow(g, 120, 120, 90, 0xfff0d0, 0.3); g.fillStyle(0xfff0d8, 1); g.fillCircle(120, 120, 22);   // the low sun
    g.fillStyle(0x6a5a8a, 1); g.fillTriangle(-40, water, 200, 120, 420, water); g.fillTriangle(260, water, 520, 90, 760, water);   // far mountains
    g.fillStyle(0x7a6a9a, 1); g.fillTriangle(200, 120, 230, 150, 170, 150); g.fillTriangle(520, 90, 556, 128, 486, 128);
    g.fillStyle(0xd8e8ff, 0.75); g.fillRect(560, 128, 14, water - 128);                    // the falls
    for (let i = 0; i < 6; i++) { g.fillStyle(0xffffff, 0.6); g.fillRect(562 + (i % 3) * 4, 128 + ((t * 3 + i * 23) % (water - 128)), 2, 8); }
    if (koiFall >= 0 && koiFall < 70) {                                                  // a koi, climbing the falls...
      const p = koiFall / 70, ky = water - 6 - p * (water - 140);
      g.fillStyle(0xff8a3a, 1); g.fillEllipse(567, ky, 6, 14); g.fillStyle(0xffffff, 1); g.fillEllipse(567, ky + 3, 5, 6);
    }
    if (koiFall >= 70 && koiFall < 110) { const a = 1 - (koiFall - 70) / 40; this.glow(g, 567, 132, 40 + (koiFall - 70) * 2, 0xffd23a, a); g.lineStyle(2, 0xffd23a, a); for (let i = 0; i < 8; i++) g.lineBetween(567, 132, 567 + Math.cos(i * 0.785) * (20 + koiFall - 70), 132 + Math.sin(i * 0.785) * (20 + koiFall - 70)); }   // ...and at the top, gold
    for (const [x, sc, i] of [[30, 0.9, 0], [610, 1, 1], [150, 0.7, 2], [700, 0.8, 3]]) this.cherry(g, x, water + 2, sc, t, i);
    g.fillStyle(0x3a6a5a, 1); g.fillRect(0, water - 6, W, 8);                              // the bank
    g.fillStyle(0x2a5a6a, 1); g.fillRect(0, water, W, H - water);                          // the water...
    for (let y = water + 6; y < H; y += 8) { g.fillStyle(0x3a7a8a, 0.4); g.fillRect(0, y, W, 2); }
    g.fillStyle(0xffb8d0, 0.15); g.fillRect(0, water, W, 14);                              // ...with the blossoms in it
  }
  // the koi that climbed the falls, become a dragon: faint and golden, winding up into the sky (f: frames since it started climbing)
  dragon(g, f) {
    if (f < 90 || f >= 240) return;
    const p = (f - 90) / 150, a = Math.sin(Math.PI * p) * 0.6, hx = 567 - p * 70, hy = 128 - p * 96;
    for (let i = 25; i >= 0; i--) {
      const u = i / 25, x = hx + u * 150 + Math.sin(u * 8 - f * 0.08) * 18, y = hy + u * 50 + Math.cos(u * 6 - f * 0.07) * 12;
      g.fillStyle(0xffd23a, a * (1 - u * 0.6)); g.fillCircle(x, y, (1 - u) * 7 + 2);
      g.fillStyle(0xfff4b0, a * 0.6 * (1 - u)); g.fillCircle(x - 1, y - 2, (1 - u) * 3 + 1);
      if (i % 6 === 3) { g.lineStyle(2, 0xffd23a, a * 0.8); g.lineBetween(x, y + 4, x - 6, y + 14); g.lineBetween(x - 6, y + 14, x - 10, y + 12); }   // claws
      if (i === 0) { g.fillStyle(0xffd23a, a); g.fillTriangle(x + 2, y - 4, x + 12, y - 18, x + 8, y - 2); g.fillTriangle(x - 2, y - 4, x + 4, y - 20, x + 2, y - 2); g.fillCircle(x - 6, y + 1, 5); }   // horns, snout
    }
  }
  // koi going round and round her: [x, y] of each (front half drawn over her, back half behind)
  koiRing(cx, cy, s, n = 4) {
    for (let i = 0; i < n; i++) {
      const a = s * 0.02 + i * (Math.PI * 2 / n), x = cx + Math.cos(a) * (90 + i * 8), y = cy + Math.sin(a) * 18;
      this.koi(Math.sin(a) > 0 ? this.fx : this.mid, x, y, Math.sin(a) > 0 ? -1 : 1, 26, s + i * 7, [0xff7a2a, 0xffffff, 0xc81a24, 0xffd23a][i % 4]);
    }
  }
  // her, kneeling in the shallows: her death strip's kneel (frame 3) - the sword planted upright before her
  kneel(x, y, sc, s, from = 0, flip = false) {
    this.strip('death', 3, x, y, sc, flip);
    this.fx.fillStyle(0x2a5a6a, 0.55); this.fx.fillRect(x - 70 * sc / 3, y - 8, 140 * sc / 3, 12);   // the water round her shins
    for (let r = 0; r < 2; r++) { const d = ((s * 0.6 + r * 30) % 60); this.fx.lineStyle(1, 0xd8fff8, 0.6 * (1 - d / 60)); this.fx.strokeEllipse(x, y, 60 + d * 3, 10 + d * 0.6); }
  }
  shot_hk_samurai_garden(t, k, s) {
    const water = 268;
    this.shrine(this.bg, t, water);
    this.stoneKoi(this.bg, 470, water + 14, 0.95);
    for (const [x, y, r] of [[90, 300, 22], [330, 330, 26], [560, 312, 20], [250, 286, 16]]) this.lily(this.mid, x, y, r);
    this.posLosers([[40, water - 2, 1.3, 0, 0.9, 1], [96, water - 2, 1.3, 0, 0.9, 1], [600, water - 2, 1.3, 0, 0.9, 1]], 0x2a1a3a);   // the beaten, resting on the bank
    for (const l of this.losers) if (l.def) l.s.setFlipX(l.s.x > W / 2 ? !l.def.facesLeft : !!l.def.facesLeft);
    this.kneel(220, water + 30, 3, s, 24);
    this.koiRing(220, water + 34, s);
    this.petals(this.fx, t, 26);
    if (s === 1) sfx('petal', 0.5, 0.7);
    this.vignette(this.over, 0.4);
  }
  // down at the waterline: her reflection trembling in the pond, koi sliding through it, a petal landing
  shot_hk_samurai_water(t, k, s) {
    const wl = 214, x = W / 2 - 40 + k * 30, sc = 3.6;                                 // (drifting slowly right)
    this.hideLosers();
    this.sky(this.bg, 0x2a1a4a, 0xffb89a);
    this.bg.fillStyle(0x6a5a8a, 1); this.bg.fillTriangle(-80, wl, 180, 70, 440, wl); this.bg.fillTriangle(300, wl, 560, 50, 820, wl);
    for (const [cx, c, i] of [[60, 1.3, 0], [600, 1.5, 1]]) this.cherry(this.bg, cx, wl, c, t, i);
    this.bg.fillStyle(0x1a3a4a, 1); this.bg.fillRect(0, wl, W, H - wl);                  // the water, darker under the sky's reflection
    this.bg.fillStyle(0xffb89a, 0.18); this.bg.fillRect(0, wl, W, 50);
    this.strip('death', 3, x, wl, sc);
    // her reflection: the same frame, upside down, shivering line by line
    const h = this.hero;
    this.hero2.setTexture(h.texture.key, h.frame.name).setOrigin(h.originX, h.originY).setPosition(x + Math.sin(s * 0.13) * 2, wl + 2)
      .setScale(sc, -sc * 0.92).setFlipX(h.flipX).setAlpha(0.45).setTint(0x8ab8d8).setTintMode(Phaser.TintModes.MULTIPLY).setVisible(true);
    for (let y = wl + 6; y < H; y += 6) { const o = Math.sin(s * 0.15 + y * 0.3) * 6; this.fx.fillStyle(0xd8fff8, 0.08 + 0.06 * Math.sin(y + s * 0.2)); this.fx.fillRect(x - 90 + o, y, 180, 1); }
    this.fx.fillStyle(0xd8fff8, 0.5); this.fx.fillRect(0, wl, W, 1);
    for (let i = 0; i < 3; i++) {                                                      // koi gliding through her reflection
      const kx = ((s * (1.6 + i * 0.5) + i * 260) % (W + 160)) - 80, ky = wl + 50 + i * 34;
      this.koi(this.fx, kx, ky, 1, 44 + i * 6, s + i * 9, [0xff7a2a, 0xffffff, 0xc81a24][i]);
    }
    const P = 40;                                                                      // a single petal, falling... landing... ripples
    if (s < P) { this.fx.fillStyle(0xffc0d8, 1); this.fx.fillEllipse(x + 110 + Math.sin(s * 0.2) * 12, wl - 120 + s * 3, 6, 4); }
    else {
      this.fx.fillStyle(0xffc0d8, 1); this.fx.fillEllipse(x + 110, wl + 1, 6, 3);
      for (let r = 0; r < 3; r++) { const d = s - P - r * 14; if (d > 0 && d < 70) { this.fx.lineStyle(1, 0xffffff, 0.7 * (1 - d / 70)); this.fx.strokeEllipse(x + 110, wl + 2, d * 4, d * 0.8); } }
    }
    for (const [lx, ly, r] of [[90, 330, 46], [560, 312, 38]]) this.lily(this.front, lx, ly, r);   // lily pads right up close
    this.front.fillStyle(0xfff0f8, 1); this.front.fillCircle(104, 318, 7); this.front.fillStyle(0xffb8d0, 1); this.front.fillCircle(104, 318, 3);   // a lily flower
    this.petals(this.fx, t, 14);
    this.vignette(this.over, 0.5);
  }
  // the statue, looking up it from her feet - and what her master said to everyone who lost
  shot_hk_samurai_stone(t, k, s) {
    this.hideLosers(); this.hero.setVisible(false);
    this.sky(this.bg, 0x1a1030, 0xe8a08a);
    const e = k * k * (3 - 2 * k);
    this.stoneKoi(this.bg, 300, 330 + e * 420, 2.1);                                    // tilting up, plinth to head
    this.petals(this.fx, t, 18);
    this.fx.fillStyle(0x0a0410, 0.55); this.fx.fillRect(0, 214, W, 112);
    this.typeLines([['MASTER HAD THREE WORDS FOR ALL WHO LOST.', '#ffd8e8'], ['YOU ARE WEAK.', '#e86a7a'],
      ['THE KOI IS WEAK TOO - UNTIL IT CLIMBS THE FALLS.', '#ffd8e8']], 44, 230, 26, s, 46, 10);
    this.vignette(this.over, 0.6);
  }
  // her face, close: eyes closed in prayer under the helmet - petals drifting past - then a glint runs up the blade
  shot_hk_samurai_eyes(t, k, s) {
    this.hideLosers();
    this.sky(this.bg, 0x2a1a3a, 0xc88a8a);
    this.glow(this.bg, W / 2 + 120, 120, 160, 0xffd8a0, 0.25);
    this.closeUp(W / 2, 176, 6.2 + k * 0.5, t);
    this.hero.setTint(0xffe0e8).setTintMode(Phaser.TintModes.MULTIPLY);
    this.over.fillStyle(0x000000, 1); this.over.fillRect(0, 0, W, 104); this.over.fillRect(0, 250, W, H - 250);   // a letterbox down to her eyes
    if (s >= 26 && s < 50) {                                                           // a glint off her helmet's crest
      const d = (s - 26) / 24, r = Math.sin(Math.PI * d) * 16, cx = W / 2 - 4, cy = 124;
      this.fx.fillStyle(0xffffff, 1); this.fx.fillTriangle(cx - r, cy, cx, cy - 2, cx, cy + 2); this.fx.fillTriangle(cx + r, cy, cx, cy - 2, cx, cy + 2);
      this.fx.fillTriangle(cx, cy - r, cx - 2, cy, cx + 2, cy); this.fx.fillTriangle(cx, cy + r, cx - 2, cy, cx + 2, cy);
      if (s === 30) sfx('shing', 0.25, 1.6);
    }
    this.petals(this.fx, t, 22, 0.3);
    this.vignette(this.over, 0.5);
  }
  shot_hk_samurai_bow(t, k, s) {
    const water = 268, turn = 70;
    this.shrine(this.bg, t, water, s - 110);                                             // after the bows, a koi climbs the falls behind her - and turns gold...
    this.stoneKoi(this.bg, 470, water + 14, 0.95);
    this.dragon(this.mid, s - 110);                                                      // ...and then a dragon
    for (const [x, y, r] of [[90, 300, 22], [330, 330, 26], [560, 312, 20]]) this.lily(this.mid, x, y, r);
    // the beaten get up... and when she turns to them, bow
    const up = Math.min(1, s / 30), bow = Math.min(1, Math.max(0, (s - turn - 10) / 14));
    this.posLosers([[40, water - 2, 1.3, bow * 0.35, 0.9, up < 1 ? 1 : 0], [96, water - 2, 1.3, bow * 0.35, 0.9, up < 1 ? 1 : 0], [600, water - 2, 1.3, -bow * 0.35, 0.9, up < 1 ? 1 : 0]], 0x2a1a3a);
    for (const l of this.losers) if (l.def) l.s.setFlipX(l.s.x > W / 2 ? !l.def.facesLeft : !!l.def.facesLeft);
    this.kneel(220, water + 30, 3, s + 200, 0, s >= turn);                                    // kneeling still - then turned to face them
    if (s === turn) sfx('whoosh', 0.3, 1.2);
    if (s === 180) sfx('shing', 0.3, 1.4);
    this.koiRing(220, water + 34, s + 300);
    this.petals(this.fx, t, 34, s > turn ? 0.5 : 0);
    this.vignette(this.over, 0.4);
  }

  // ================================================================ NU - BLOCK BOSS
  // His block, after dark. Strolling down the alley... and there on the wall's a gig poster: the ones he just beat,
  // HEADLINING. He stops. Out comes a spray can (his 'spraytag' move: nu_moves.py), a shake, and a big red X right
  // through their faces. Can away, and he keeps walking.
  // the alley, scrolled: world x -> screen x - cam. Bricks, streetlights, a dumpster, old flyers, his old tags
  alley(g, t, ground, cam) {
    this.sky(g, 0x04040a, 0x141420);
    g.fillStyle(0x4a2018, 1); g.fillRect(0, 50, W, ground - 50);                         // the brick wall
    for (let y = 50, r = 0; y < ground; y += 10, r++) for (let x = (((r % 2) * 14 - cam) % 28) - 28; x < W; x += 28) { g.fillStyle(0x5a2a1e, 1); g.fillRect(x + 1, y + 1, 26, 8); }
    g.fillStyle(0x000000, 0.35); g.fillRect(0, 50, W, ground - 50);
    for (let wx = 100; wx < 2000; wx += 600) {                                            // streetlights
      const x = wx - cam; if (x < -150 || x > W + 150) continue;
      g.fillStyle(0x0e0e12, 1); g.fillRect(x, 30, 6, ground - 30); g.fillRect(x, 30, 40, 5);
      this.glow(g, x + 38, 40, 120, 0xffd890, 0.3); g.fillStyle(0xffe8a0, 1); g.fillRect(x + 30, 34, 14, 5);
    }
    for (const [wx, w, h, c] of [[230, 40, 54, 0xd8d0b0], [262, 34, 44, 0x8ab8e8], [520, 44, 58, 0xe8b85a], [700, 36, 40, 0xc8d8a0]]) {   // old flyers
      const x = wx - cam; if (x < -60 || x > W + 60) continue;
      g.fillStyle(c, 0.8); g.fillRect(x, 120, w, h); g.fillStyle(0x1a1a20, 0.6); for (let i = 0; i < 4; i++) g.fillRect(x + 4, 128 + i * 10, w - 8 - (i % 2) * 10, 3);
    }
    if (380 - cam > -120 && 380 - cam < W + 60) this.spray(g, 'NU', 380 - cam, 110, 50, 1, 0x9be32a, 6);   // his old tag
    const dx = 600 - cam; if (dx > -110 && dx < W + 10) { g.fillStyle(0x1a1a20, 1); g.fillRect(dx, 220, 96, ground - 220); g.fillStyle(0x2a3a2a, 1); g.fillRect(dx - 4, 214, 104, 10); }   // a dumpster
    g.fillStyle(0x0c0c10, 1); g.fillRect(0, ground, W, H - ground); g.fillStyle(0x2a2a30, 1); g.fillRect(0, ground, W, 2);
    for (let wx = 0; wx < 2000; wx += 90) { const x = wx - cam; if (x > -20 && x < W) { g.fillStyle(0x1a1a20, 1); g.fillRect(x, ground + 14, 50, 2); } }   // cracks in the street
  }
  // the gig poster: the beaten, in colour, HEADLINING. x1/x2: how much of each stroke of the X is sprayed on
  poster(x, y, w, h, x1 = 0, x2 = 0, fade = 0) {
    const g = this.bg, live = this.losers.filter((l) => l.def);          // (on the wall layer: the beaten's sprites go over it)
    g.fillStyle(0x0a0a0e, 0.6); g.fillRect(x + 4, y + 4, w, h);                          // its shadow on the wall
    g.fillStyle(0xf0e4c8, 1); g.fillRect(x, y, w, h);
    g.fillStyle(0x2a1a4a, 1); g.fillRect(x + w * 0.05, y + h * 0.16, w * 0.9, h * 0.62);   // the photo
    g.fillStyle(0xff3a8a, 0.35); g.fillCircle(x + w / 2, y + h * 0.5, w * 0.32);
    g.fillStyle(0xc81a2a, 1); g.fillRect(x, y, w, h * 0.13); g.fillRect(x, y + h * 0.8, w, h * 0.2);
    g.fillStyle(0xd8d8e0, 1); for (const [sx, sy] of [[x + 3, y + 3], [x + w - 6, y + 3], [x + 3, y + h - 6], [x + w - 6, y + h - 6]]) g.fillRect(sx, sy, 3, 3);   // staples
    g.fillStyle(0xd8c8a8, 1); g.fillTriangle(x + w, y + h, x + w - w * 0.14, y + h, x + w, y + h - w * 0.14);   // a corner peeling
    this.losers.forEach((l) => l.s.setVisible(false));
    live.forEach((l, i) => {                                                              // the beaten, in colour, in the photo
      const [, hy, , oy] = this.headOf(l.def), sc = (h * 0.42) / (oy - hy + 10);
      l.s.setCrop().setTintMode(Phaser.TintModes.MULTIPLY).setTint(fade ? 0x8a8a8a : 0xffffff).setPosition(x + w * (i + 1) / (live.length + 1), y + h * 0.77)
        .setScale(sc).setRotation(0).setAlpha(1).setFlipX(!!l.def.facesLeft).setVisible(true);
    });
    const big = h > 200, T = this.tvLines;                                              // the words
    T[7].setFontSize(big ? 16 : 7).setText('LIVE TONIGHT').setColor('#ffffff').setOrigin(0.5, 0.5).setPosition(x + w / 2, y + h * 0.065).setVisible(true);
    if (!big) { g.fillStyle(0xffffff, 0.8); g.fillRect(x + w * 0.2, y + h * 0.84, w * 0.6, 3); g.fillStyle(0xffd23a, 0.8); g.fillRect(x + w * 0.3, y + h * 0.92, w * 0.4, 2); }   // (too small to read from here)
    else T[8].setFontSize(12).setText(live.map((l) => l.name).join(' + ').slice(0, 30)).setColor('#ffffff').setOrigin(0.5, 0.5).setPosition(x + w / 2, y + h * 0.86).setVisible(true);
    if (big) T[9].setFontSize(8).setText('THE HEADLINERS').setColor('#ffd23a').setOrigin(0.5, 0.5).setPosition(x + w / 2, y + h * 0.95).setVisible(true);
    const f = this.mid, m = 0.06;                                                         // the X, sprayed right over it (behind him)
    for (const [p, ax, ay, bx, by] of [[x1, x + w * m, y + h * m, x + w * (1 - m), y + h * (1 - m)], [x2, x + w * (1 - m), y + h * m, x + w * m, y + h * (1 - m)]]) {
      if (p <= 0) continue;
      const ex = ax + (bx - ax) * p, ey = ay + (by - ay) * p, wd = big ? 20 : 9;
      f.lineStyle(wd + 4, 0x8a0a1a, 0.5); f.lineBetween(ax, ay, ex, ey);
      f.lineStyle(wd, 0xff1a3a, 1); f.lineBetween(ax, ay, ex, ey);
      for (let j = 1; j <= 4; j++) { const q = Math.min(p, j / 4.5); if (q < j / 4.5) break; const qx = ax + (bx - ax) * q, qy = ay + (by - ay) * q; f.fillStyle(0xff1a3a, 1); f.fillRect(qx - 1, qy, big ? 4 : 2, (big ? 14 : 6) + (j * 7 % 5) * (big ? 3 : 1)); }   // drips
    }
    return [x, y, w, h];
  }
  // a walk: his run strip, slowed right down, sliding him along at walking pace
  walkNu(x, y, sc, s) { this.strip('run', Math.floor(s / 7), x, y, sc); }
  shot_nu_street_walk(t, k, s) {
    const ground = 300, stop = 120, wx = s < stop ? 560 + s * 2.5 - Math.max(0, s - stop + 16) ** 2 * 0.078 : 560 + stop * 2.5 - 16 ** 2 * 0.078;
    const cam = wx - 250;
    this.alley(this.bg, t, ground, cam);
    this.poster(920 - cam, 96, 150, 172);
    if (s < stop) this.walkNu(250, ground, 3, s); else this.idle(250, ground, 3, t);
    if (s < stop && s % 14 === 0) sfx('land', 0.15, 1.4);                                    // footsteps
    if (s === stop) sfx('menu', 0.4, 0.6);                                                  // ...hold on
    if (s % 30 === 0) sfx('hit', 0.18, 0.55);
    this.vignette(this.over, 0.6);
  }
  shot_nu_street_poster(t, k, s) {
    this.hero.setVisible(false);
    this.alley(this.bg, t, 300, 590);
    this.bg.fillStyle(0x000000, 0.4); this.bg.fillRect(0, 0, W, H);
    const z = 1 + k * 0.06, w = 230 * z, h = 264 * z;                                      // a slow push in on it
    this.poster(W / 2 - w / 2, 190 - h / 2, w, h);
    if (s === 4) { sfx('glitch', 0.3, 0.5); sfx('buzz', 0.3, 0.8); }
    this.vignette(this.over, 0.7);
  }
  shot_nu_street_tag(t, k, s) {
    const ground = 300, cam = 590, S1 = 50, S2 = 72, L = 16;                              // the strokes: ticks of his spraytag move
    this.alley(this.bg, t, ground, cam);
    const x1 = Math.max(0, Math.min(1, (s - S1) / L)), x2 = Math.max(0, Math.min(1, (s - S2) / L));
    const [px, py, pw, ph] = this.poster(920 - cam, 96, 150, 172, x1, x2);
    this.move('spraytag', s, 250, ground, 3);
    if (s >= 11 && s < 22 && s % 4 === 0) sfx('menu', 0.2, 0.7);
    if (s >= 24 && s < 48 && s % 4 === 0) sfx('clang', 0.12, 2.2 + (s % 8 ? 0.2 : 0));     // the shake: the ball rattling
    const spraying = (s >= S1 && s < S1 + L) || (s >= S2 && s < S2 + L);
    if (spraying) {                                                                        // the hiss, and a mist off the nozzle
      const a = s < S2 ? x1 : x2, m = 0.06, ex = s < S2 ? px + pw * (m + (1 - 2 * m) * a) : px + pw * (1 - m - (1 - 2 * m) * a), ey = py + ph * (m + (1 - 2 * m) * a);
      if (s % 3 === 0) sfx('smoke', 0.35, 1.9);
      for (let j = 0; j < 10; j++) { this.front.fillStyle(0xff6a7a, 0.5); this.front.fillCircle(ex + (Math.random() - 0.5) * 24, ey + (Math.random() - 0.5) * 24, 1.5); }
    }
    if (s === 100) sfx('hit', 0.3, 1.6);
    this.vignette(this.over, 0.6);
  }
  shot_nu_street_leave(t, k, s) {
    const ground = 300, cam = 590;
    this.alley(this.bg, t, ground, cam);
    this.poster(920 - cam, 96, 150, 172, 1, 1, 1);
    this.walkNu(250 + s * 2.6, ground, 3, s);                                              // and keeps walking
    if (s % 14 === 0) sfx('land', 0.15, 1.4);
    if (s % 30 === 0) sfx('hit', 0.18, 0.55);
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

  // ================================================================ WHAT ONCE WAS - DIAL-UP
  // 3 AM, 1999. A dark bedroom, rain on the window, a beige computer humming - and It, standing by the desk, a
  // monitor for a head. The modem dials; a CONNECT TO window you can't cancel; the screech of the handshake tearing
  // the screen apart (all in time with the 'dialup' music: dial tones, rings, answer tone, handshake, then a sad
  // MIDI loop when the page finishes loading). A homepage: UNDER CONSTRUCTION, a hit counter, MY NEW FRIENDS - the
  // beaten, in little photos, loading line by line - and a guestbook they've been writing in. They press at their
  // frames... YOU HAVE BEEN DISCONNECTED. Static. Back in the room: NO CARRIER. And on Its screen, three tiny faces.
  // the old-OS look: a bevelled grey panel, a navy title bar
  panel(g, x, y, w, h, title) {
    g.fillStyle(0xc0c0c0, 1); g.fillRect(x, y, w, h);
    g.fillStyle(0xffffff, 1); g.fillRect(x, y, w, 2); g.fillRect(x, y, 2, h); g.fillStyle(0x404040, 1); g.fillRect(x, y + h - 2, w, 2); g.fillRect(x + w - 2, y, 2, h);
    if (!title) return;
    for (let i = 0; i < 16; i++) { g.fillStyle(Phaser.Display.Color.GetColor(0 + i * 4, 0 + i * 6, 128 + i * 6), 1); g.fillRect(x + 3 + (w - 6) * i / 16, y + 3, (w - 6) / 16 + 1, 14); }
    for (let i = 0; i < 3; i++) { const bx = x + w - 18 - i * 16; g.fillStyle(0xc0c0c0, 1); g.fillRect(bx, y + 5, 13, 10); g.fillStyle(0x404040, 1); g.fillRect(bx, y + 14, 13, 1); g.fillRect(bx + 12, y + 5, 1, 10); }
    g.fillStyle(0x000000, 1); g.fillRect(x + w - 15, y + 9, 7, 2);
  }
  seg(g, x, y, d, col) {                                                                    // a seven-segment digit, 9x12
    const S = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f][d] || 0;
    const R = [[1, 0, 7, 2], [8, 1, 2, 5], [8, 7, 2, 5], [1, 12, 7, 2], [0, 7, 2, 5], [0, 1, 2, 5], [1, 6, 7, 2]];
    R.forEach(([a, b, w, h], i) => { g.fillStyle(col, S & (1 << i) ? 1 : 0.12); g.fillRect(x + a, y + b, w, h); });
  }
  label(i, txt, x, y, size, col, bg) {                                                      // one of the text lines
    const L = this.tvLines[i]; L.setFontSize(size).setText(txt).setColor(col).setPosition(x, y).setVisible(true);
    if (bg) L.setBackgroundColor(bg);
    return L;
  }
  bedroom(g, t, desk) {
    g.fillStyle(0x0a0c16, 1); g.fillRect(0, 0, W, H);
    g.fillStyle(0x10141e, 1); for (let x = 0; x < W; x += 40) g.fillRect(x, 0, 2, desk + 70);   // wallpaper stripes
    g.fillStyle(0x1a1410, 1); g.fillRect(40, 60, 140, 110); g.fillStyle(0x0a1020, 1); g.fillRect(48, 68, 124, 94);   // the window...
    this.glow(g, 150, 150, 70, 0xff9a3a, 0.3); g.fillStyle(0x1a1410, 1); g.fillRect(108, 68, 4, 94); g.fillRect(48, 112, 124, 4);
    for (let i = 0; i < 24; i++) { const sp = this.spots[i], x = 48 + ((sp[0] * 124 + t * 0.5) % 124), y = 68 + ((sp[1] * 94 + t * (3 + sp[2] * 2)) % 94); g.lineStyle(1, 0x6a7a9a, 0.6); g.lineBetween(x, y, x - 1, y + 5); }   // ...rain on it
    g.fillStyle(0x2a1a2a, 1); g.fillRect(230, 50, 60, 84); g.fillStyle(0x6a2a4a, 1); g.fillRect(234, 54, 52, 60); g.fillStyle(0x0a0a10, 1); g.fillCircle(260, 84, 14);   // a band poster, curling
    g.fillStyle(0x161210, 1); g.fillRect(0, desk + 70, W, H);                                 // the carpet
    g.fillStyle(0x3a2a1c, 1); g.fillRect(330, desk, 290, 10); g.fillStyle(0x2a1e14, 1); g.fillRect(340, desk + 10, 8, 60); g.fillRect(600, desk + 10, 8, 60);   // the desk
    g.fillStyle(0xc8bc98, 1); g.fillRect(540, desk + 10, 50, 60); g.fillStyle(0xa89c78, 1); g.fillRect(540, desk + 10, 50, 3);   // the tower under it
    g.fillStyle(((t >> 2) % 5) < 2 ? 0x5aff5a : 0x1a3a1a, 1); g.fillRect(548, desk + 22, 3, 2);   // its hard-drive light
  }
  modem(g, x, y, t, lit) {                                                                  // the modem, its little lights going
    g.fillStyle(0x2a2a30, 1); g.fillRect(x, y - 12, 70, 12); g.fillStyle(0x3a3a44, 1); g.fillRect(x, y - 12, 70, 2);
    ['HS', 'AA', 'CD', 'OH', 'RD', 'SD', 'TR'].forEach((n, i) => { const on = lit && ((i === 3 || i === 6) || ((t + i * 3) % (4 + i) < 2)); g.fillStyle(on ? (i < 3 ? 0xff3a2a : 0x5aff5a) : 0x1a1a1a, 1); g.fillRect(x + 6 + i * 9, y - 7, 4, 3); });
  }
  crt(g, x, y, w, h, glow = 0x2a4aaa) {                                                     // a beige CRT on the desk
    g.fillStyle(0xc8bc98, 1); g.fillRect(x - 6, y - 6, w + 12, h + 22); g.fillStyle(0xa89c78, 1); g.fillRect(x - 6, y + h + 10, w + 12, 6);
    g.fillStyle(0x0a1020, 1); g.fillRect(x, y, w, h); g.fillStyle(glow, 0.25); g.fillRect(x, y, w, h);
    g.fillStyle(0xb8ac88, 1); g.fillRect(x + w / 2 - 16, y + h + 16, 32, 8);
    this.glow(this.bg, x + w / 2, y + h / 2, w, glow, 0.25);
  }
  shot_wow_dial_room(t, k, s) {
    const desk = 220;
    this.bedroom(this.bg, t, desk);
    this.crt(this.mid, 440, desk - 90, 100, 70);
    this.modem(this.mid, 350, desk, t, s > 70);
    this.mid.fillStyle(0xd8d0b0, 1); this.mid.fillRect(420, desk - 6, 110, 6);                // the keyboard
    this.hideLosers();
    this.idle(230, desk + 72, 3, 0);                                                          // It, standing in the dark. Still.
    this.hero.setTint(0x8a90b8).setTintMode(Phaser.TintModes.MULTIPLY);
    const typed = 'ATDT 5550199'.slice(0, Math.max(0, Math.floor((s - 60) / 6)));             // what's on the desk screen
    this.label(0, 'C:\\> ' + typed + ((t >> 4) % 2 ? '_' : ''), 446, desk - 84, 6, '#b8c8ff');
    if (s > 140) this.label(1, 'RINGING...', 446, desk - 72, 6, '#b8c8ff');
    if (s >= 60 && s < 130 && (s - 60) % 6 === 0) sfx('menu', 0.12, 2.2);                    // keys
    this.vignette(this.over, 0.7);
  }
  // CONNECT TO: a dialog on a teal desktop. The cursor goes for CANCEL... and gets dragged off it
  shot_wow_dial_connect(t, k, s) {
    const g = this.bg, x = 150, y = 70, w = 340, h = 200;
    this.hero.setVisible(false); this.hideLosers();
    g.fillStyle(0x008080, 1); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 4; i++) { g.fillStyle(0xc8c8c8, 1); g.fillRect(24, 46 + i * 56, 30, 26); g.fillStyle(0x000080, 1); g.fillRect(27, 49 + i * 56, 24, 16); }   // desktop icons
    g.fillStyle(0xc0c0c0, 1); g.fillRect(0, H - 22, W, 22); g.fillStyle(0xffffff, 1); g.fillRect(0, H - 22, W, 1);   // the taskbar
    this.panel(g, x, y, w, h, true);
    this.label(0, 'CONNECT TO: THE OLD NET', x + 8, y + 5, 7, '#ffffff');
    // two computers and the line between them, data dots crawling along it
    for (const cx of [x + 50, x + w - 90]) { g.fillStyle(0xd8d0b0, 1); g.fillRect(cx, y + 40, 40, 30); g.fillStyle(0x000080, 1); g.fillRect(cx + 4, y + 44, 32, 20); g.fillStyle(0xd8d0b0, 1); g.fillRect(cx + 8, y + 72, 24, 6); }
    g.lineStyle(2, 0x000000, 1); g.lineBetween(x + 92, y + 58, x + w - 92, y + 58);
    for (let i = 0; i < 5; i++) { g.fillStyle(0x000080, 1); g.fillRect(x + 96 + ((s * 2 + i * 32) % (w - 196)), y + 55, 6, 6); }
    const st = s < 126 ? 'DIALING 555-0199...' : s < 190 ? 'VERIFYING USERNAME AND PASSWORD...' : 'LOGGING ON TO NETWORK...';
    this.label(1, 'STATUS:  ' + st, x + 20, y + 100, 7, '#000000');
    this.label(2, 'USER:    GUEST', x + 20, y + 116, 7, '#000000');
    this.label(3, 'PASS:    ' + '*'.repeat(Math.min(8, Math.floor(s / 12))), x + 20, y + 130, 7, '#000000');
    const pb = Math.min(1, s / 200); g.fillStyle(0x808080, 1); g.fillRect(x + 20, y + 150, w - 40, 12); g.fillStyle(0xffffff, 1); g.fillRect(x + 21, y + 151, w - 42, 10);
    for (let i = 0; i < Math.floor(pb * 24); i++) { g.fillStyle(0x000080, 1); g.fillRect(x + 23 + i * 12.4, y + 153, 10, 6); }
    this.panel(g, x + w / 2 - 40, y + h - 30, 80, 22, false); this.label(4, 'CANCEL', x + w / 2 - 20, y + h - 24, 7, '#000000');
    // the cursor: drifting to CANCEL... then yanked away whenever it gets close
    const tx = x + w / 2, ty = y + h - 18, p = Math.min(1, s / 120), near = s > 100;
    let cx = 520 + (tx - 520) * p, cy = 300 + (ty - 300) * p;
    if (near) { const j = (s - 100) * 3; cx = tx + Math.sin(s * 0.7) * 6 + Math.min(160, j * 2); cy = ty - Math.min(120, j); }
    const c = this.front; c.fillStyle(0x000000, 1); c.fillTriangle(cx, cy, cx, cy + 16, cx + 11, cy + 11); c.fillStyle(0xffffff, 1); c.fillTriangle(cx + 1, cy + 3, cx + 1, cy + 13, cx + 8, cy + 10);
    if (s === 100 || s === 130 || s === 160) sfx('menu', 0.3, 0.5);                           // click. click. nothing
    if (s > 150 && s % 20 < 2) { this.fx.fillStyle(0xffffff, 0.15); this.fx.fillRect(0, (s * 37) % H, W, 6); }
    this.vignette(this.over, 0.45);
  }
  // the handshake: the screen tears to pieces with the screech
  shot_wow_dial_handshake(t, k, s) {
    const g = this.bg, CON = 96;
    this.hero.setVisible(false); this.hideLosers();
    g.fillStyle(0x000000, 1); g.fillRect(0, 0, W, H);
    const chars = '!@#$%^&*()_+=-[]{};:<>?/\\|~ABCDEFXZ0123456789';
    if (s < CON) {
      for (let i = 0; i < 10; i++) {                                                          // garbage text, rolling
        let line = ''; for (let j = 0; j < 46; j++) line += chars[(i * 31 + j * 17 + s * (3 + i)) % chars.length];
        this.label(i, line, 30 + ((s * (i + 2)) % 13), 52 + i * 26 + ((s + i * 5) % 7), 9, ['#5aff5a', '#ff3aff', '#3affff', '#ffffff'][(i + (s >> 2)) % 4]);
      }
      for (let i = 0; i < 6; i++) { const y = (s * (11 + i * 7) + i * 60) % H, hh = 4 + ((s + i) % 5) * 6; g.fillStyle([0xff0000, 0x00ff00, 0x0000ff, 0xffffff, 0xffff00, 0xff00ff][i], 0.35); g.fillRect(0, y, W, hh); }   // tearing bands
      if (s % 8 < 2) { for (let x = 0; x < W; x += 80) { g.fillStyle([0xc0c0c0, 0xc0c000, 0x00c0c0, 0x00c000, 0xc000c0, 0xc00000, 0x0000c0, 0x101010][x / 80], 1); g.fillRect(x, 0, 80, H); } }   // colour bars, flashing
      if (s % 6 === 0) this.cameras.main.shake(60, 0.006);
    } else {                                                                                   // ...and then, clean: CONNECTED
      const d = s - CON;
      for (let y = 0; y < H; y += 3) { g.fillStyle(0x0a1a0a, 1); g.fillRect(0, y, W, 1); }
      this.label(0, 'CONNECTED AT 56000 BPS', W / 2 - 120, 160, 12, d % 30 < 20 ? '#5aff5a' : '#2a8a2a');
      if (d > 20) this.label(1, 'WELCOME HOME.', W / 2 - 60, 190, 9, '#b8ffb8');
      if (d === 0) { this.flash = 4; sfx('ding', 0.4, 0.9); }
    }
    this.vignette(this.over, 0.6);
  }
  // the homepage, loading top to bottom
  shot_wow_dial_page(t, k, s) {
    const g = this.bg, x0 = 20, y0 = 40, w = W - 40, h = H - 80, done = 94;               // done: when it finishes (the music starts)
    this.hero.setVisible(false);
    this.panel(g, x0, y0, w, h, true);
    this.label(0, 'THE OLD NET BROWSER - [WHAT ONCE WAS\'S HOMEPAGE]', x0 + 8, y0 + 5, 7, '#ffffff');
    g.fillStyle(0xffffff, 1); g.fillRect(x0 + 80, y0 + 22, w - 100, 14); g.fillStyle(0x808080, 1); g.fillRect(x0 + 80, y0 + 22, w - 100, 1);
    for (let i = 0; i < 3; i++) { g.fillStyle(0x808080, 1); g.fillRect(x0 + 8 + i * 22, y0 + 22, 18, 14); }
    this.label(1, 'HTTP://HOME.OLDNET/~WHATONCEWAS/', x0 + 84, y0 + 25, 6, '#000000');
    const px = x0 + 4, py = y0 + 40, pw = w - 8, ph = h - 58, load = Math.min(1, s / done);
    g.fillStyle(0x000010, 1); g.fillRect(px, py, pw, ph);                                      // the page: black, with tiled stars
    for (let i = 0; i < 40; i++) { const sp = this.spots[i]; g.fillStyle(0xffffff, (t + i * 7) % 40 < 20 ? 0.9 : 0.4); g.fillRect(px + sp[0] * pw, py + sp[1] * ph, 1, 1); }
    const cut = py + ph * load;                                                                 // (everything below this hasn't loaded yet)
    if (cut > py + 10) this.label(2, '~*~ WHAT ONCE WAS\'S HOMEPAGE ~*~', px + pw / 2 - 150, py + 6, 11, (t >> 3) % 2 ? '#ffff3a' : '#ff3aff');
    if (cut > py + 34) {                                                                       // an UNDER CONSTRUCTION tape, crawling
      const bx0 = px + 160, bw = 280, by = py + 26; g.fillStyle(0xffd23a, 1); g.fillRect(bx0, by, bw, 10);
      for (let i = -1; i < 24; i++) { const x = bx0 + i * 14 + (t * 0.3) % 14; if (x > bx0 - 6 && x < bx0 + bw - 8) { g.fillStyle(0x000000, 1); g.fillTriangle(Math.max(bx0, x), by + 10, x + 7, by, Math.max(bx0, x + 6), by + 10); g.fillTriangle(x + 7, by, x + 13, by, x + 6, by + 10); } }
      this.label(3, 'UNDER CONSTRUCTION', px + 248, py + 40, 6, '#ffd23a');
    }
    if (cut > py + 60) { const msg = '   WELCOME!!!  YOU ARE MY NEWEST FRIENDS!!!  PLEASE SIGN MY GUESTBOOK!!!   STAY FOREVER!!!   ', off = Math.floor(t / 4) % msg.length; this.label(4, (msg + msg).slice(off, off + 52), px + 30, py + 54, 8, '#5affff'); }
    // MY NEW FRIENDS: the beaten in little photos, each loading line by line
    const live = this.losers.filter((l) => l.def);
    if (cut > py + 76) this.label(5, 'MY NEW FRIENDS:', px + 20, py + 72, 8, '#ffffff');
    this.losers.forEach((l) => l.s.setVisible(false));
    live.forEach((l, i) => {
      const fx = px + 30 + i * 110, fy = py + 86, fw = 90, fh = 76;
      g.fillStyle(0x808080, 1); g.fillRect(fx - 3, fy - 3, fw + 6, fh + 6); g.fillStyle(0x203040, 1); g.fillRect(fx, fy, fw, fh);
      const rows = Math.max(0, Math.min(1, (s - 20 - i * 14) / 40));                           // interlaced: rows arriving
      if (rows <= 0) return;
      const [, hy, , oy] = this.headOf(l.def), sc = (fh * 0.85) / (oy - hy + 12);
      l.s.setTintMode(Phaser.TintModes.MULTIPLY).setTint(0xffffff).setPosition(fx + fw / 2, fy + fh - 4).setScale(sc).setRotation(0).setAlpha(1).setFlipX(!!l.def.facesLeft).setVisible(true);
      const f = l.s.frame, cropH = f.height * rows; l.s.setCrop(0, 0, f.width, cropH);
      if (rows < 1) { const ly = l.s.y - f.height * l.s.originY * sc + cropH * sc; this.fx.fillStyle(0x808080, 0.6); this.fx.fillRect(fx, ly, fw, 2); }   // the loading line
      this.label(6 + i, l.name.slice(0, 12), fx, fy + fh + 6, 6, '#ffffff');
    });
    // the guestbook - in their words - and the hit counter
    if (s > done) {
      const lines = live.map((l, i) => l.name.slice(0, 10) + ': ' + ['where is this', 'help', 'let me out'][i % 3]);
      const shown = Math.min(lines.length, Math.floor((s - done) / 26) + 1);
      this.label(9, 'GUESTBOOK:  ' + lines.slice(0, shown).join('   '), px + 20, py + ph - 22, 6, '#ff8a8a');
      if ((s - done) % 26 === 1 && (s - done) / 26 < lines.length) sfx('menu', 0.25, 0.6);
    }
    const hits = Math.min(live.length, Math.floor(Math.max(0, s - done) / 26) + (s > done ? 1 : 0));   // VISITORS: one more per friend
    g.fillStyle(0x000000, 1); g.fillRect(px + pw - 124, py + ph - 28, 104, 20);
    String(hits).padStart(6, '0').split('').forEach((d, i) => { g.fillStyle(0x202020, 1); g.fillRect(px + pw - 122 + i * 17, py + ph - 26, 15, 16); this.seg(g, px + pw - 119 + i * 17, py + ph - 24, +d, 0xff3a3a); });
    g.fillStyle(0xc0c0c0, 1); g.fillRect(x0 + 2, y0 + h - 16, w - 4, 14);                     // the status bar, filling
    g.fillStyle(0x000080, 1); g.fillRect(x0 + 8, y0 + h - 13, 120 * load, 8);
    if (cut < py + ph) { this.front.fillStyle(0x000010, 1); this.front.fillRect(px, cut, pw, py + ph - cut); }   // (not loaded yet)
    this.vignette(this.over, 0.4);
  }

  // close on the photos: they press at the glass... DISCONNECTED... static eats them
  shot_wow_dial_trapped(t, k, s) {
    const g = this.bg, POP = 56, live = this.losers.filter((l) => l.def), n = Math.max(1, live.length);
    this.hero.setVisible(false); this.hideLosers();
    g.fillStyle(0x000010, 1); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { const sp = this.spots[i]; g.fillStyle(0xffffff, 0.5); g.fillRect(sp[0] * W, sp[1] * H, 1, 1); }
    live.forEach((l, i) => {
      const fw = 170, fh = 150, fx = W / 2 - (n * (fw + 24)) / 2 + 12 + i * (fw + 24), fy = 90;
      g.fillStyle(0x808080, 1); g.fillRect(fx - 5, fy - 5, fw + 10, fh + 10); g.fillStyle(0x203040, 1); g.fillRect(fx, fy, fw, fh);
      const bang = (s + i * 11) % 23 < 3 && s > 10, [, hy, , oy] = this.headOf(l.def), sc = (fh * 0.9) / (oy - hy + 12);
      const gone = Math.max(0, Math.min(1, (s - POP - 20 - i * 10) / 30));
      l.s.setCrop().setTintMode(Phaser.TintModes.MULTIPLY).setTint(0xffffff).setPosition(fx + fw / 2 + (bang ? 3 : 0), fy + fh - 2 + (bang ? -2 : 0)).setScale(sc * (bang ? 1.04 : 1))
        .setRotation(Math.sin(s * 0.5 + i) * 0.05).setAlpha(1 - gone).setFlipX(!!l.def.facesLeft).setVisible(true);
      const f = l.s.frame, top = fy + 2, sy = l.s.y - f.height * l.s.originY * l.s.scaleY;      // (keep them inside the frame)
      if (sy < top) l.s.setCrop(0, (top - sy) / l.s.scaleY, f.width, f.height);
      if (bang && (s + i * 11) % 23 === 0) sfx('hit', 0.2, 0.6 + i * 0.1);
      for (let p = 0; p < Math.min(6, Math.floor(s / 14)); p++) { const sp = this.spots[(p + i * 6) % 40]; this.mid.fillStyle(0xffffff, 0.12); this.mid.fillCircle(fx + 20 + sp[0] * (fw - 40), fy + 20 + sp[1] * (fh - 40), 9); for (let q = 0; q < 4; q++) this.mid.fillRect(fx + 14 + sp[0] * (fw - 40) + q * 4, fy + 4 + sp[1] * (fh - 40), 3, 9); }   // handprints on the glass
      if (gone > 0) for (let q = 0; q < 220 * gone; q++) { this.mid.fillStyle(Math.random() < 0.5 ? 0xffffff : 0x404040, 1); this.mid.fillRect(fx + Math.random() * fw, fy + Math.random() * fh, 3, 3); }   // static, eating them
      this.label(i, l.name.slice(0, 14), fx, fy + fh + 10, 7, '#ffffff');
    });
    if (s > 16 && s < POP && s % 10 < 6) this.label(5, "DON'T LEAVE", W / 2 - 60, 54, 12, '#ff3a3a');
    if (s >= POP) {                                                                            // the error box
      const x = W / 2 - 150, y = 120, w = 300, h = 110;
      this.panel(this.fx, x, y, w, h, true);
      this.label(6, 'THE OLD NET', x + 8, y + 5, 7, '#ffffff');
      this.fx.fillStyle(0xc81a1a, 1); this.fx.fillCircle(x + 34, y + 54, 14); this.fx.fillStyle(0xffffff, 1); this.fx.fillRect(x + 27, y + 52, 14, 4);
      this.label(7, 'YOU HAVE BEEN DISCONNECTED.', x + 60, y + 48, 8, '#000000');
      this.panel(this.fx, x + w / 2 - 34, y + h - 30, 68, 20, false); this.label(8, 'OK', x + w / 2 - 6, y + h - 25, 7, '#000000');
      if (s === POP) { sfx('buzz', 0.6, 0.7); sfx('glitch', 0.5, 0.6); this.cameras.main.shake(120, 0.008); }
    }
    this.vignette(this.over, 0.5);
  }
  // back in the room. NO CARRIER. And on Its screen - three tiny faces
  shot_wow_dial_logoff(t, k, s) {
    const desk = 220, x = 230, sc = 3;
    this.bedroom(this.bg, t, desk);
    this.crt(this.mid, 440, desk - 90, 100, 70, 0x1a3a1a);
    this.modem(this.mid, 350, desk, t, false);
    this.mid.fillStyle(0xd8d0b0, 1); this.mid.fillRect(420, desk - 6, 110, 6);
    this.hideLosers();
    this.idle(x, desk + 72, sc, 0);
    this.hero.setTint(0x8a90b8).setTintMode(Phaser.TintModes.MULTIPLY);
    if ((s >> 4) % 2) this.label(0, 'NO CARRIER', 452, desk - 64, 8, '#5aff5a');
    // Its screen (frame 0: x 34-44, y 8-16 of the 64x64 frame, feet at 32,59): static, and a face for each of the beaten
    const fl = this.hero.flipX ? -1 : 1, sx = x + (34 - 32) * sc * fl, sy = desk + 72 + (8 - 59) * sc, sw = 11 * sc, sh = 9 * sc;
    const x0 = fl > 0 ? sx : sx - sw, f = this.fx;
    f.fillStyle(0x101820, 1); f.fillRect(x0, sy, sw, sh);
    for (let q = 0; q < 60; q++) { f.fillStyle(Math.random() < 0.5 ? 0x8a9aaa : 0x2a3a4a, 1); f.fillRect(x0 + Math.random() * sw, sy + Math.random() * sh, 1, 1); }
    this.losers.filter((l) => l.def).forEach((l, i) => {
      const fx = x0 + 4 + i * 9 + Math.sin(s * 0.2 + i * 2) * 1.5, fy = sy + 9 + Math.cos(s * 0.17 + i) * 2;
      f.fillStyle(0xe8e0d0, 1); f.fillRect(fx, fy, 6, 7); f.fillStyle(0x000000, 1); f.fillRect(fx + 1, fy + 2, 1, 2); f.fillRect(fx + 4, fy + 2, 1, 2); f.fillRect(fx + 2, fy + 5, 2, 1);
    });
    this.glow(this.mid, x0 + sw / 2, sy + sh / 2, 40, 0x8ab8ff, 0.2);
    if (s === 1) sfx('glitch', 0.3, 0.4);
    this.vignette(this.over, 0.7);
  }

  // ================================================================ ROSEMARY - DEEP SEA
  // Down. The light from the surface shrinks away and the beaten sink with it, past 200 metres, 1000, 4000. In
  // the black there's one small light, bobbing. One of them drifts to it, reaching... and the light swings up over
  // a face full of teeth: SEEN, an anglerfish. Snap. A red cloud. Then, on the seabed, only her: Rosemary, missing,
  // standing in the dark - with the little light hanging over her head. SEARCH CALLED OFF. (Music: 'abyss'.)
  // the dark, everywhere but round a light: rings of black from radius r outwards, soft at the edge
  dark(g, cx, cy, r, a = 0.97) {
    for (let i = 0; i < 5; i++) { g.lineStyle(20, 0x000000, a * (i + 1) / 6); g.strokeCircle(cx, cy, r - 30 + i * 20); }       // the soft edge
    for (let R = r + 70; R < r + 1000; R += 120) { g.lineStyle(130, 0x000000, 1); g.strokeCircle(cx, cy, R); }                 // and black beyond it
  }
  lure(g, x, y, t, a = 1) {
    this.glow(g, x, y, 70, 0x5affd8, 0.45 * a);
    g.fillStyle(0xb8fff0, a); g.fillCircle(x, y, 6 + Math.sin(t * 0.2)); g.fillStyle(0xffffff, a); g.fillCircle(x - 1, y - 2, 2.5);
  }
  snow(g, t, n = 50, a = 0.6) {                                                             // marine snow, drifting down
    for (let i = 0; i < n; i++) { const sp = this.spots[i % 40], x = (sp[0] * W + i * 13 + Math.sin(t * 0.02 + i) * 10) % W, y = (sp[1] * H + t * (0.2 + sp[2] * 0.3) + i * 7) % H; g.fillStyle(0xd8e8f0, a * (0.4 + sp[2] * 0.6)); g.fillRect(x, y, 1 + (i % 3 === 0), 1 + (i % 3 === 0)); }
  }
  sonar(g, t, x, y) {                                                                       // the music's pings (every 4.4 s from 1.5 s), seen as rings
    const d = (t - 90) % 264;
    if (t < 90 || d > 70) return;
    for (let r = 0; r < 2; r++) { const q = d - r * 12; if (q > 0) { g.lineStyle(2, 0x8affe8, 0.5 * (1 - q / 70)); g.strokeCircle(x, y, q * 7); } }
  }
  shot_ls_abyss_descent(t, k, s) {
    const d = k, g = this.bg;
    this.hero.setVisible(false);
    this.sky(g, Phaser.Display.Color.GetColor(20 * (1 - d) + 2, 90 * (1 - d) + 6, 120 * (1 - d) + 18), 0x020610);
    const sy = -40 - d * 160;                                                               // the surface, far above and going
    g.fillStyle(0x8ad8e8, 0.5 * (1 - d)); for (let x = 0; x < W; x += 24) g.fillEllipse(x + Math.sin(t * 0.05 + x) * 6, sy + 60, 30, 8);
    for (let i = 0; i < 5; i++) { g.fillStyle(0xb8f0ff, 0.08 * (1 - d)); g.fillTriangle(80 + i * 120, 0, 130 + i * 120, 0, 40 + i * 140 + Math.sin(t * 0.01 + i) * 30, H); }   // light shafts
    this.losers.forEach((l, i) => {                                                         // the beaten, sinking past us, turning slowly
      if (!l.def) return;
      const x = [190, 430, 320][i], y = -60 + ((s * (1.4 + i * 0.3) + i * 70) % (H + 140)), r = Math.sin(s * 0.02 + i) * 0.6 + i;
      l.s.setCrop().setPosition(x, y).setScale(2).setRotation(r).setAlpha(1).setTint(Phaser.Display.Color.GetColor(24, 60 * (1 - d) + 24, 90 * (1 - d) + 36)).setVisible(true);
    });
    for (let i = 0; i < 22; i++) { const sp = this.spots[i]; this.bubble(this.fx, sp[0] * W + Math.sin(t * 0.05 + i) * 6, H - ((t * (1.5 + sp[2] * 2) + sp[1] * H) % (H + 40)), 2 + sp[2] * 3, 0.5); }
    this.snow(this.fx, t, 40, 0.3 + d * 0.4);
    const depth = Math.floor(200 + d * d * 3800);
    this.tvLines[0].setFontSize(10).setText('DEPTH  ' + String(depth).padStart(4, '0') + ' M').setColor('#8affe8').setPosition(W - 170, 50).setVisible(true);
    this.tvLines[1].setFontSize(7).setText(depth < 1000 ? 'TWILIGHT ZONE' : depth < 4000 ? 'MIDNIGHT ZONE' : 'THE ABYSS').setColor('#4a8a8a').setPosition(W - 170, 66).setVisible(true);
    this.over.fillStyle(0x000000, d * 0.5); this.over.fillRect(0, 0, W, H);
    this.sonar(this.fx, t, W / 2, H / 2);
    this.vignette(this.over, 0.6 + d * 0.3);
  }
  shot_ls_abyss_lure(t, k, s) {
    const lx = 430 + Math.sin(s * 0.04) * 10, ly = 160 + Math.sin(s * 0.06) * 8;
    this.hero.setVisible(false);
    this.bg.fillStyle(0x020610, 1); this.bg.fillRect(0, 0, W, H);
    this.bg.lineStyle(1, 0x2a4a4a, 0.5); this.bg.beginPath(); this.bg.moveTo(lx, ly); for (let i = 1; i <= 10; i++) this.bg.lineTo(lx + i * 14, ly - Math.sin(i * 0.3) * 30 - i * 4); this.bg.strokePath();   // its stalk, off into the dark
    this.snow(this.bg, t, 50, 0.7);
    // one of them, drifting to the light, reaching for it
    const l = this.losers.find((x) => x.def); this.hideLosers();
    if (l) {
      const p = Math.min(1, s / 150), x = 80 + p * (lx - 120), y = 230 - p * 50 + Math.sin(s * 0.05) * 6;
      l.s.setCrop().setPosition(x, y).setScale(2.4).setRotation(0.25 - p * 0.35).setAlpha(1).setTint(0x183048).setFlipX(!!l.def.facesLeft).setVisible(true);
    }
    this.lure(this.mid, lx, ly, t);
    this.dark(this.fx, lx, ly, 150);
    const txt = 'HAVE YOU SEEN ME?', n = Math.max(0, Math.floor((s - 40) / 4));             // the light, saying her words
    if (n > 0 && (s % 40 > 4 || s > 120)) this.tvLines[0].setFontSize(8).setText(txt.slice(0, n)).setColor('#b8fff0').setAlpha(0.5 + 0.5 * Math.sin(s * 0.3)).setPosition(lx - 50, ly + 22).setVisible(true);
    this.sonar(this.fx, t, lx, ly);
    this.vignette(this.over, 0.7);
  }
  shot_ls_abyss_jaws(t, k, s) {
    const SNAP = 44, g = this.bg;
    g.fillStyle(0x020610, 1); g.fillRect(0, 0, W, H);
    this.hideLosers();
    const sw = Math.min(1, s / 36), lx = 430 - sw * 180, ly = 160 - sw * 60;              // the light swings up... over its face
    if (s < SNAP) {
      this.closeUp(W / 2 - 30, 190, 5.4, t, SEEN);
      const lit = Math.min(1, s / 30); this.hero.setTint(Phaser.Display.Color.GetColor(30 + 120 * lit, 60 + 140 * lit, 80 + 130 * lit)).setTintMode(Phaser.TintModes.MULTIPLY);
      const l = this.losers.find((x) => x.def);
      if (l) l.s.setCrop().setPosition(330, 250).setScale(2.4).setRotation(-0.1).setAlpha(1).setTint(0x183048).setFlipX(!!l.def.facesLeft).setVisible(true);   // ...right in front of the one it was waiting for
      this.lure(this.fx, lx, ly, t);
      this.dark(this.fx, lx, ly + 40, 120 + sw * 120, 0.9);
      if (s === 20) { sfx('rumble', 0.6, 0.5); }
    } else {
      this.hero.setVisible(false);
      const d = s - SNAP;
      if (d < 8) {                                                                          // SNAP: impact frames, teeth slamming shut
        const f = this.front, inv = d < 4, close = Math.min(1, d / 3);
        f.fillStyle(inv ? 0xffffff : 0x000000, 1); f.fillRect(0, 0, W, H);
        f.fillStyle(inv ? 0x000000 : 0xffffff, 1);
        for (let i = 0; i < 12; i++) { const x = i * 56; f.fillTriangle(x, 0, x + 56, 0, x + 28, 60 + close * 120); f.fillTriangle(x + 28, H, x + 84, H, x + 56, H - 60 - close * 120); }
        if (d === 0) { sfx('bighit', 1, 0.5); sfx('slash', 0.8, 0.6); this.cameras.main.shake(300, 0.03); }
      } else {                                                                              // a red cloud, blooming in the dark
        for (let i = 0; i < 26; i++) { const sp = this.spots[i], a = i * 0.7, r = (d - 8) * (0.8 + sp[2]) * 1.2; this.mid.fillStyle(i % 3 ? 0x6a0410 : 0x9a0a1a, Math.max(0, 0.5 - (d - 8) / 140)); this.mid.fillCircle(330 + Math.cos(a) * r, 240 + Math.sin(a) * r * 0.7 - (d - 8) * 0.3, 10 + r * 0.25); }
        for (let i = 0; i < 12; i++) { const sp = this.spots[i + 20]; this.bubble(this.fx, 330 + (sp[0] - 0.5) * 120, 240 - (d - 8) * (1.5 + sp[2] * 2), 2 + sp[1] * 4, Math.max(0, 1 - (d - 8) / 70)); }
        this.lure(this.fx, lx, ly + Math.sin(s * 0.05) * 6, t);
        this.dark(this.over, lx, ly, 160, 0.92);
        if (d === 8) sfx('smoke', 0.5, 0.4);
      }
    }
    this.vignette(this.over, 0.7);
  }
  // the seabed. Only her - with the light hanging over her head
  shot_ls_abyss_alone(t, k, s) {
    const floor = 288, x = W / 2, g = this.bg, e = Math.min(1, s / 200), z = 1 + e * 0.15;
    g.fillStyle(0x020610, 1); g.fillRect(0, 0, W, H);
    g.fillStyle(0x0a1418, 1); g.fillRect(0, floor, W, H - floor);                          // silt
    for (let i = 0; i < 30; i++) { const sp = this.spots[i % 40]; g.fillStyle(0x16242a, 1); g.fillEllipse(sp[0] * W, floor + 6 + sp[1] * 60, 20 + sp[2] * 40, 4); }
    g.fillStyle(0x1a262c, 1); g.fillRect(232, floor - 110, 5, 110); g.fillRect(214, floor - 116, 42, 4);   // a sunken bus-stop sign...
    g.fillStyle(0xc8c0a0, 0.8); g.fillRect(238, floor - 98, 30, 38); g.fillStyle(0x2a2420, 1); g.fillRect(244, floor - 92, 18, 14); g.fillRect(242, floor - 74, 22, 2); g.fillRect(244, floor - 70, 18, 2);   // ...with her missing poster on it
    for (let i = 0; i < 6; i++) { g.fillStyle(0x1a3a2a, 1); const kx = 470 + i * 22; g.fillTriangle(kx, floor, kx + 6, floor, kx + 3 + Math.sin(t * 0.03 + i) * 6, floor - 50 - (i % 3) * 16); }   // weeds, swaying
    this.hideLosers();
    this.idle(x, floor, 3 * z, t);                                                          // Rosemary
    this.hero.setTint(0x6a90a8).setTintMode(Phaser.TintModes.MULTIPLY);
    const [hx, hy, ox, oy] = this.headOf(this.def), ly = floor + (hy - oy) * 3 * z - 46 + Math.sin(s * 0.05) * 5, lxx = x + (hx - ox) * 3 * z + 10;
    this.fx.lineStyle(1, 0x2a4a4a, 0.6); this.fx.lineBetween(lxx, ly, lxx - 4, ly + 30);     // ...on a thread from her head
    this.lure(this.fx, lxx, ly, t);
    for (let i = 0; i < 10; i++) { const sp = this.spots[i]; this.bubble(this.fx, sp[0] * W, floor - ((s * (0.8 + sp[2]) + sp[1] * 300) % 320), 2 + sp[2] * 2, 0.4); }
    this.snow(this.fx, t, 50, 0.5);
    this.dark(this.over, lxx, ly + 60, 170 + Math.sin(s * 0.07) * 6, 0.9);
    this.sonar(this.fx, t, lxx, ly);
    const T = 'SEARCH CALLED OFF.', n = Math.max(0, Math.floor((s - 30) / 3));
    if (n > 0 && s < 150) this.tvLines[0].setFontSize(9).setText(T.slice(0, n)).setColor('#e8e0c8').setPosition(lxx + 40, 250).setVisible(true);
    if (n > 0 && n <= T.length && (s - 30) % 3 === 0) sfx('menu', 0.15, 0.7);
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

  // ================================================================ SOUL SUMMONER - HIGH NOON
  // An old spaghetti western. A dusty main street at high noon: him at one end, the beaten lined up at the other, a
  // tumbleweed rolling between. Eyes, close - his, theirs. The clock tower creeps to twelve; the bell (music 'western',
  // 7.0 s) - then a stand-off in dead silence - and he draws (9.3 s): soul-fire, three shots, faster than they can see.
  // He walks off into the sunset. (Music: whistle, twang, a bell, then brass and a choir.)
  // the town: mesas, a hard sun, false-front buildings, the clock tower. cam: how far we've pushed in (0..1)
  westTown(g, t, ground, mins = 58, sunset = 0) {
    const top = sunset ? 0x3a0a1a : 0xf0a040, bot = sunset ? 0xff7a2a : 0xfff0c0;
    this.sky(g, top, bot);
    if (sunset) { this.glow(g, W / 2, ground - 30, 200, 0xffd060, 0.5); g.fillStyle(0xffe08a, 1); g.fillCircle(W / 2, ground - 20, 56); }
    else { this.glow(g, 520, 50, 120, 0xffffff, 0.5); g.fillStyle(0xfffff0, 1); g.fillCircle(520, 50, 22); }
    g.fillStyle(sunset ? 0x5a1a20 : 0xc8784a, 1); g.fillRect(30, ground - 92, 120, 92); g.fillRect(60, ground - 110, 60, 20); g.fillRect(470, ground - 84, 150, 84); g.fillRect(510, ground - 100, 70, 18);   // mesas
    for (let i = 0; i < 6; i++) { const x = (i * 131 + t * 0.2) % (W + 60) - 30; g.fillStyle(0xffffff, 0.25 * (1 - sunset)); g.fillEllipse(x, ground - 130 + Math.sin(i + t * 0.01) * 4, 80, 10); }   // heat haze
    const wood = sunset ? 0x2a0a10 : 0x6a3a1a, dark = sunset ? 0x14040a : 0x3a1e0c, lite = sunset ? 0x4a1418 : 0x8a5228;
    const fronts = [[0, 110, 'SALOON'], [118, 90, 'BANK'], [430, 90, 'JAIL'], [528, 112, 'HOTEL']];
    fronts.forEach(([x, w, name], i) => {
      const h = 120 + (i % 2) * 18;
      g.fillStyle(wood, 1); g.fillRect(x, ground - h, w, h); g.fillStyle(lite, 1); for (let k = 0; k < w; k += 8) g.fillRect(x + k, ground - h, 1, h);
      g.fillStyle(dark, 1); g.fillRect(x + 8, ground - h + 12, w - 16, 18); g.fillRect(x + 14, ground - 54, 22, 54); g.fillRect(x + w - 36, ground - 80, 22, 26);
      g.fillStyle(dark, 1); g.fillRect(x, ground - 46, w, 4); for (let k = 0; k <= w; k += w / 3) g.fillRect(x + k - 1, ground - 46, 3, 46);   // the porch
    });
    // the clock tower, middle of the street
    g.fillStyle(wood, 1); g.fillRect(286, ground - 190, 68, 190); g.fillTriangle(280, ground - 190, 360, ground - 190, 320, ground - 228);
    g.fillStyle(sunset ? 0x8a6a5a : 0xf4ecd8, 1); g.fillCircle(320, ground - 156, 20); g.lineStyle(2, 0x1a0a04, 1); g.strokeCircle(320, ground - 156, 20);
    const ma = (mins / 60) * Math.PI * 2 - Math.PI / 2, ha = ((11 + mins / 60) / 12) * Math.PI * 2 - Math.PI / 2;
    g.lineBetween(320, ground - 156, 320 + Math.cos(ha) * 11, ground - 156 + Math.sin(ha) * 11); g.lineStyle(1, 0x1a0a04, 1); g.lineBetween(320, ground - 156, 320 + Math.cos(ma) * 17, ground - 156 + Math.sin(ma) * 17);
    g.fillStyle(sunset ? 0x3a1410 : 0xd8a868, 1); g.fillRect(0, ground, W, H - ground);       // the dirt street
    g.fillStyle(sunset ? 0x2a0a0c : 0xb88a50, 1); for (let i = 0; i < 20; i++) { const sp = this.spots[i]; g.fillEllipse(sp[0] * W, ground + 10 + sp[1] * 50, 30 + sp[2] * 30, 3); }
  }
  tumbleweed(g, x, y, r, t) {
    for (let i = 0; i < 9; i++) { const a = t * 0.2 + i * 0.7; g.lineStyle(2, 0x8a6a3a, 1); g.strokeEllipse(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2, r * 1.8, r * (0.8 + 0.4 * Math.abs(Math.sin(a)))); }
    g.fillStyle(0x6a4a2a, 0.5); g.fillCircle(x, y, r * 0.5);
  }
  shot_ss_noon_town(t, k, s) {
    const ground = 292, e = k * k * (3 - 2 * k);
    this.westTown(this.bg, t, ground, 57 + e);
    this.idle(110, ground + 10, 3 + e * 0.3, t);                                            // him, at one end...
    this.posLosers([[460, ground + 10, 2, 0, 1], [530, ground + 10, 2, 0, 1], [600, ground + 10, 2, 0, 1]], 0x3a1a0a);   // ...them at the other
    for (const l of this.losers) if (l.def) l.s.setFlipX(!l.def.facesLeft);
    const tx = -40 + ((s * 2.2) % (W + 80)); this.tumbleweed(this.fx, tx, ground + 14 - Math.abs(Math.sin(s * 0.12)) * 14, 12, s);
    for (let i = 0; i < 18; i++) { const sp = this.spots[i]; this.fx.fillStyle(0xe8c890, 0.5); this.fx.fillRect((sp[0] * W + s * (2 + sp[2] * 2)) % W, ground - sp[1] * 60, 2, 1); }   // dust on the wind
    if (s === 1) sfx('whoosh', 0.3, 0.4);
    this.vignette(this.over, 0.5);
  }
  // eyes: the classic extreme close-up, cutting between him and them
  shot_ss_noon_eyes(t, k, s) {
    const cut = Math.floor(s / 32), mine = cut % 2 === 0, g = this.bg;
    this.sky(g, 0xc8783a, 0xf0b060); this.hideLosers();
    if (mine) {
      this.closeUp(W / 2, 180, 11, t);                                                       // his eyes - the soul flames in them
      if (s % 32 < 12) { this.fx.fillStyle(0xffd23a, 0.4); this.fx.fillCircle(W / 2 + 20, 180, 30); }
    } else {
      const l = this.losers.filter((x) => x.def)[(cut >> 1) % Math.max(1, this.losers.filter((x) => x.def).length)];
      if (l) {
        const [hx, hy, ox, oy] = this.headOf(l.def), sc = 11;
        l.s.setCrop().setTintMode(Phaser.TintModes.FILL).setTint(0x2a1206).setScale(sc).setRotation(0).setAlpha(1).setFlipX(!l.def.facesLeft).setVisible(true);
        l.s.setPosition(W / 2 - (hx - ox) * sc * (l.s.flipX ? -1 : 1), 180 + (oy - hy) * sc);
        const sq = Math.min(1, (s % 32) / 20);                                               // eyes narrowing
        for (const dx of [-26, 26]) { this.fx.fillStyle(0xffffff, 1); this.fx.fillRect(W / 2 + dx - 10, 176 + sq * 3, 20, 8 - sq * 5); }
        if (s % 32 === 14) { this.fx.fillStyle(0xd8f0ff, 1); this.fx.fillEllipse(W / 2 + 60, 150 + (s % 32), 6, 9); }   // a bead of sweat
      }
    }
    this.over.fillStyle(0x000000, 1); this.over.fillRect(0, 0, W, 136); this.over.fillRect(0, 226, W, H - 226);   // letterboxed right down to the eyes
    if (s % 32 === 0) sfx('clang', 0.12, 2.4);                                                // a spur
    this.vignette(this.over, 0.4);
  }
  shot_ss_noon_clock(t, k, s) {
    const g = this.bg, cx = W / 2, cy = 180, R = 110, NOON = 90;
    this.hero.setVisible(false); this.hideLosers();
    this.sky(g, 0xf0a040, 0xfff0c0);
    g.fillStyle(0x6a3a1a, 1); g.fillRect(cx - 160, 0, 320, H); g.fillStyle(0x8a5228, 1); for (let x = cx - 160; x < cx + 160; x += 10) g.fillRect(x, 0, 1, H);
    g.fillStyle(0xf4ecd8, 1); g.fillCircle(cx, cy, R); g.lineStyle(6, 0x1a0a04, 1); g.strokeCircle(cx, cy, R);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.lineStyle(i % 3 ? 2 : 4, 0x1a0a04, 1); g.lineBetween(cx + Math.cos(a) * R * 0.82, cy + Math.sin(a) * R * 0.82, cx + Math.cos(a) * R * 0.94, cy + Math.sin(a) * R * 0.94); }
    const mins = Math.min(60, 59 + Math.floor(s / NOON)), jerk = s === NOON ? 0.04 : 0;     // the minute hand clunks onto twelve
    const ma = (mins / 60) * Math.PI * 2 - Math.PI / 2 + jerk, ha = (Math.min(12, 11 + mins / 60) / 12) * Math.PI * 2 - Math.PI / 2;
    g.lineStyle(8, 0x1a0a04, 1); g.lineBetween(cx, cy, cx + Math.cos(ha) * R * 0.5, cy + Math.sin(ha) * R * 0.5);
    g.lineStyle(5, 0x1a0a04, 1); g.lineBetween(cx, cy, cx + Math.cos(ma) * R * 0.8, cy + Math.sin(ma) * R * 0.8); g.fillStyle(0x1a0a04, 1); g.fillCircle(cx, cy, 8);
    if (s % 30 === 0 && s < NOON) sfx('menu', 0.25, 0.5);                                     // tick
    if (s === NOON) { this.cameras.main.shake(200, 0.008); }
    if (s >= NOON) for (let i = 0; i < 8; i++) {                                              // pigeons, scattering
      const d = s - NOON, sp = this.spots[i], x = cx + (sp[0] - 0.5) * 200 + (sp[0] - 0.5) * d * 6, y = cy - 100 - d * (2 + sp[1] * 2);
      const w = (d + i) % 6 < 3 ? 8 : 3; this.fx.fillStyle(0x3a3a40, 1); this.fx.fillTriangle(x - w, y - 2, x, y, x - 2, y + 3); this.fx.fillTriangle(x + w, y - 2, x, y, x + 2, y + 3);
    }
    this.vignette(this.over, 0.5);
  }
  // the stand-off... and the draw
  shot_ss_noon_draw(t, k, s) {
    const ground = 292, DRAW = 124, xs = [460, 530, 600];
    this.westTown(this.bg, t, ground, 60);
    const fired = s >= DRAW;
    this.idle(110, ground + 10, 3.3, fired ? 6 : 0);                                         // frozen still - until
    const hand = [110 + this.def.handOffset.x * 3.3, ground + 10 + this.def.handOffset.y * 3.3];
    this.posLosers(xs.map((x) => [x, ground + 10, 2, 0, 1]), 0x3a1a0a);
    this.losers.forEach((l, i) => {
      if (!l.def) return;
      l.s.setFlipX(!l.def.facesLeft);
      const hitAt = DRAW + i * 7, d = s - hitAt;
      if (d >= 0) { const p = Math.min(1, d / 14); l.s.setRotation(p * 1.45).setPosition(xs[i] + p * 20, ground + 10 + p * 2); }   // ...they fall
      if (d >= -3 && d < 3) { this.fx.lineStyle(4, 0x8ad8ff, 1); this.fx.lineBetween(hand[0], hand[1], xs[i], ground - 40); this.fx.lineStyle(2, 0xffffff, 1); this.fx.lineBetween(hand[0], hand[1], xs[i], ground - 40); }   // soul-fire, a streak
      if (d === 0) { sfx('bighit', 0.9, 1.4 - i * 0.1); sfx('flame', 0.6, 1.2); this.flash = 3; this.cameras.main.shake(80, 0.01); }
      if (d > 0 && d < 20) for (let j = 0; j < 6; j++) { this.fx.fillStyle(0x8ad8ff, 1 - d / 20); this.fx.fillCircle(xs[i] + Math.cos(j) * d * 2, ground - 40 + Math.sin(j) * d * 2, 3); }
    });
    if (fired) { const d = s - DRAW; for (let j = 0; j < 5; j++) { this.fx.fillStyle(0x8ad8ff, Math.max(0, 0.6 - d / 80)); this.fx.fillCircle(hand[0] + Math.sin(d * 0.1 + j) * 4, hand[1] - d * 0.6 - j * 6, 3 + j); } }   // a curl of blue smoke from his hand
    if (!fired && s > 10) this.tumbleweed(this.fx, -30 + (s - 10) * 3.6, ground + 14 - Math.abs(Math.sin(s * 0.12)) * 10, 10, s);   // one more tumbleweed, between them
    this.vignette(this.over, 0.5);
  }
  shot_ss_noon_sunset(t, k, s) {
    const ground = 270, e = Math.min(1, s / 260);
    this.westTown(this.bg, t, ground, 60, 1);
    // him, walking away up the street into the sun - smaller and smaller
    this.strip('run', Math.floor(s / 9), W / 2 - 20 + e * 20, 320 - e * 46, 3 - e * 2.2, true);
    this.hero.setTintMode(Phaser.TintModes.FILL).setTint(0x14040a);
    this.posLosers([[120, 330, 2, 1.5, 1], [470, 336, 2, -1.5, 1], [560, 326, 2, 1.5, 1]], 0x14040a);   // the beaten, in the dirt
    this.tumbleweed(this.fx, ((s * 1.6) % (W + 60)) - 30, 330, 10, s);
    this.vignette(this.over, 0.55);
  }

  // ================================================================ MR WAKE - CREATURE FEATURE
  // A 1950s black-and-white monster picture, scratches and all. TERROR FROM THE TIDE! A harbour city at night; the
  // beaten on the pier, pointing at bubbles in the bay... DUN - DUN - DUNNN (music 'monster', 5.0 s): he rises out of
  // the water, the size of a skyscraper, searchlights crossing on him. The army fires; he swats the pier flat. The
  // newspaper spins in: MONSTER SINKS CITY. THE END... or is it? (Music: theremin, brass, timpani, a ticking projector.)
  // old film: grain, dust, scratches, flicker. tone: the colour of the specks (grey for this one, brown for sepia)
  film(t, tone = 0xffffff, dark = 0x000000) {
    const o = this.over;
    o.fillStyle(dark, 0.05 + 0.05 * ((t * 7) % 3 === 0)); o.fillRect(0, 0, W, H);           // flicker
    for (let i = 0; i < 26; i++) { o.fillStyle(i % 2 ? tone : dark, 0.5); o.fillRect(Math.random() * W, Math.random() * H, 1 + (i % 4 === 0), 1); }   // grain and dust
    for (let i = 0; i < 2; i++) { const x = (this.spots[i][0] * W + t * (i ? 13 : 7)) % W; if ((t + i * 20) % 50 < 30) { o.lineStyle(1, tone, 0.35); o.lineBetween(x, 0, x + Math.sin(t * 0.3) * 4, H); } }   // scratches
    if (t % 37 < 2) { o.fillStyle(tone, 0.6); o.fillCircle(Math.random() * W, Math.random() * H, 2 + Math.random() * 3); }   // a hair, a blob
  }
  harbour(g, t, water, lit = 1) {
    this.sky(g, 0x050505, 0x2a2a2a);
    g.fillStyle(0xd8d8d8, 0.9); g.fillCircle(520, 64, 18);                                   // the moon
    for (let i = 0; i < 22; i++) {                                                           // the skyline
      const sp = this.spots[i], x = i * 31 - 10, h = 50 + sp[0] * 110;
      g.fillStyle(0x161616 + (i % 3) * 0x080808, 1); g.fillRect(x, water - h, 30, h);
      for (let wy = water - h + 8; wy < water - 6; wy += 10) for (let wx = x + 4; wx < x + 26; wx += 8) if (((wx * 7 + wy * 3 + i) % 11) < 4 * lit) { g.fillStyle(0xb8b8b8, 1); g.fillRect(wx, wy, 3, 4); }
    }
    g.fillStyle(0x1e1e1e, 1); g.fillRect(0, water, W, H - water);                            // the bay
    for (let i = 0; i < 12; i++) { const y = water + 6 + i * 6; g.fillStyle(0x8a8a8a, 0.15); g.fillRect(((t * (0.5 + i * 0.1) + i * 60) % (W + 80)) - 40, y, 50 + i * 4, 1); }
  }
  searchlights(g, t, water, n = 3, aimX = null) {
    for (let i = 0; i < n; i++) {
      const bx = 80 + i * 240, a = aimX != null ? Math.atan2(-200, aimX - bx) : -Math.PI / 2 + Math.sin(t * 0.02 + i * 2) * 0.6;
      g.fillStyle(0xffffff, 0.08); g.fillTriangle(bx, water, bx + Math.cos(a - 0.06) * 500, water + Math.sin(a - 0.06) * 500, bx + Math.cos(a + 0.06) * 500, water + Math.sin(a + 0.06) * 500);
    }
  }
  shot_wake_monster_titles(t, k, s) {
    const g = this.bg;
    this.hero.setVisible(false); this.hideLosers();
    this.sky(g, 0x0a0a0a, 0x3a3a3a);
    for (let i = 0; i < 9; i++) { const y = 200 + i * 18, ph = t * 0.05 + i; g.fillStyle(i % 2 ? 0x2a2a2a : 0x444444, 1); g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 20) g.lineTo(x, y + Math.sin(ph + x * 0.02) * 10); g.lineTo(W, H); g.closePath(); g.fillPath(); }   // a stormy sea
    const z = 0.6 + Math.min(1, s / 60) * 0.4, wob = Math.sin(s * 0.3) * 2;
    for (const [i, txt, y, size] of [[0, 'TERROR', 110, 54], [1, 'FROM THE TIDE!', 174, 26]]) {
      const L = this.tvLines[i]; L.setFontSize(Math.round(size * z)).setText(txt).setColor('#f4f4f4').setStroke('#000000', 6).setShadow(4, 4, '#000000', 0, true, true).setOrigin(0.5, 0.5).setPosition(W / 2 + wob, y).setVisible(true);
    }
    if (s > 70) this.label(2, 'IN TERRIFYING TIDE-O-VISION', W / 2 - 110, 220, 8, '#b8b8b8');
    if (s === 1) { sfx('rumble', 0.5, 0.6); }
    this.film(t, 0xffffff);
    this.vignette(this.over, 0.8);
  }
  shot_wake_monster_harbour(t, k, s) {
    const water = 250;
    this.harbour(this.bg, t, water);
    this.searchlights(this.bg, t, water);
    this.mid.fillStyle(0x2a2a2a, 1); this.mid.fillRect(380, water - 8, 260, 8); for (let x = 390; x < W; x += 30) this.mid.fillRect(x, water, 4, 30);   // the pier
    this.posLosers([[420, water - 8, 1.2, 0, 1], [470, water - 8, 1.2, 0, 1], [520, water - 8, 1.2, 0, 1]], 0x0a0a0a);   // the beaten, on the pier...
    for (const l of this.losers) if (l.def) l.s.setFlipX(!!l.def.facesLeft === false ? true : false);
    for (let i = 0; i < 10 + s / 6; i++) { const sp = this.spots[i % 40]; this.fx.fillStyle(0xd8d8d8, 0.6); this.fx.fillCircle(150 + sp[0] * 140, water + 30 - ((s * (1 + sp[2]) + sp[1] * 60) % 40), 1.5 + sp[2] * 2); }   // ...bubbles, out in the bay
    if (s > 80) { const r = (s - 80) * 1.4; this.fx.lineStyle(2, 0xd8d8d8, 0.5); this.fx.strokeEllipse(220, water + 26, r * 2, r * 0.4); }
    if (s % 40 === 10) sfx('rumble', 0.2 + s / 400, 0.5);
    this.film(t);
    this.vignette(this.over, 0.6);
  }
  // DUN - DUN - DUNNN: he rises, and each stab is a punch-in
  shot_wake_monster_reveal(t, k, s) {
    const water = 250, stab = s < 36 ? 0 : s < 78 ? 1 : 2, z = [1, 1.35, 1.8][stab];
    this.harbour(this.bg, t, water);
    const rise = Math.min(1, s / 30), sc = 4.6 * z, [hx, hy, ox, oy] = this.headOf(this.def);   // each punch-in keeps his head where it was
    const fx = W / 2 - 40 - (hx - ox) * sc, fy = 118 + (oy - hy) * sc + (1 - rise) * 320;
    this.idle(fx, fy, sc, 0);
    this.searchlights(this.mid, t, water, 3, fx);
    this.mid.fillStyle(0x1e1e1e, 1); this.mid.fillRect(0, water + 20 * z, W, H);          // the water, up to his waist
    for (let i = 0; i < 30; i++) { const sp = this.spots[i % 40]; const d = (s * 2 + i * 9) % 60; this.fx.fillStyle(0xe8e8e8, Math.max(0, 0.8 - d / 60)); this.fx.fillCircle(fx - 140 + sp[0] * 280, water + 20 * z - d * 1.5 + d * d * 0.03, 2 + sp[2] * 3); }   // water streaming off him
    if (s === 0 || s === 36 || s === 78) { this.flash = 3; this.cameras.main.shake(stab === 2 ? 400 : 160, 0.012); }
    this.hideLosers();
    this.film(t);
    this.vignette(this.over, 0.7);
  }
  // the army fires; he swats the pier flat - the beaten go flying
  shot_wake_monster_attack(t, k, s) {
    const water = 250, SWAT = 90;
    this.harbour(this.bg, t, water, s > SWAT ? 0.4 : 1);
    this.searchlights(this.bg, t, water, 3, 300);
    const A = this.def.moveAnims.fsmash, tick = s - SWAT + 20;
    if (tick >= 0 && tick < A[1] * A[2]) this.move('fsmash', tick, 300, water + 120, 4.2); else this.idle(300, water + 120, 4.2, 0);
    this.mid.fillStyle(0x1e1e1e, 1); this.mid.fillRect(0, water + 40, W, H);
    const pierUp = s < SWAT;
    if (pierUp) { this.mid.fillStyle(0x2a2a2a, 1); this.mid.fillRect(420, water - 8, 220, 8); }
    else { for (let i = 0; i < 8; i++) { const d = s - SWAT, sp = this.spots[i]; this.mid.fillStyle(0x2a2a2a, 1); this.mid.fillRect(420 + i * 26 + d * sp[0] * 2, water - 8 + d * (sp[1] - 0.6) * 3 + d * d * 0.05, 22, 6); } }
    this.losers.forEach((l, i) => {
      if (!l.def) return;
      const d = Math.max(0, s - SWAT), x = 450 + i * 50 + d * (2 + i), y = water - 8 - d * (4 - i) + d * d * 0.08;
      l.s.setCrop().setTintMode(Phaser.TintModes.FILL).setTint(0x0a0a0a).setPosition(x, y).setScale(1.2).setRotation(d * 0.2 * (i % 2 ? 1 : -1)).setAlpha(1).setFlipX(true).setVisible(y < H + 40);
    });
    for (let i = 0; i < 3; i++) {                                                           // tanks on the shore, firing
      const tx = 40 + i * 70, ty = water - 4; this.fx.fillStyle(0x2a2a2a, 1); this.fx.fillRect(tx, ty - 10, 34, 10); this.fx.fillRect(tx + 8, ty - 16, 16, 6); this.fx.fillRect(tx + 22, ty - 14, 18, 2);
      if ((s + i * 13) % 40 < 4) { this.fx.fillStyle(0xffffff, 1); this.fx.fillCircle(tx + 42, ty - 13, 5); }
      if ((s + i * 13) % 40 === 0) sfx('hit', 0.3, 0.7);
      const b = ((s + i * 13) % 40) / 40; this.fx.fillStyle(0xe8e8e8, 1); this.fx.fillCircle(tx + 42 + b * (260 - tx), ty - 13 - b * 100, 2);
      if (b > 0.9) { this.fx.fillStyle(0xffffff, 0.8); this.fx.fillCircle(300 - 20 + i * 14, water - 110 + i * 10, 8); }   // ...pinging off him
    }
    if (s === SWAT) { sfx('bighit', 1, 0.5); sfx('geyser', 0.8, 0.8); this.cameras.main.shake(300, 0.02); this.flash = 3; }
    this.film(t);
    this.vignette(this.over, 0.6);
  }
  // the newspaper spins in
  shot_wake_monster_paper(t, k, s) {
    const g = this.mid, p = Math.min(1, s / 40), ang = (1 - p) * 9, sc = 0.1 + p * 0.9;
    this.hero.setVisible(false); this.hideLosers();
    this.bg.fillStyle(0x0a0a0a, 1); this.bg.fillRect(0, 0, W, H);
    // the page, as a rotated, scaled quad
    const pw = 440 * sc, ph = 280 * sc, cx = W / 2, cy = 190, c = Math.cos(ang), sn = Math.sin(ang);
    const pt = (x, y) => ({ x: cx + x * c - y * sn, y: cy + x * sn + y * c });
    g.fillStyle(0xe8e4d8, 1); g.fillPoints([pt(-pw / 2, -ph / 2), pt(pw / 2, -ph / 2), pt(pw / 2, ph / 2), pt(-pw / 2, ph / 2)], true);
    if (p >= 1) {
      const x0 = cx - 220, y0 = cy - 140;
      g.fillStyle(0x1a1a1a, 1); g.fillRect(x0 + 10, y0 + 46, 420, 2); g.fillRect(x0 + 10, y0 + 104, 420, 2);
      for (let i = 0; i < 9; i++) { g.fillStyle(0x8a8a8a, 1); g.fillRect(x0 + 240 + (i % 2) * 6, y0 + 118 + i * 16, 170 - (i % 3) * 20, 4); }   // columns of print
      g.fillStyle(0x3a3a3a, 1); g.fillRect(x0 + 20, y0 + 116, 200, 150); g.fillStyle(0x5a5a5a, 1); g.fillRect(x0 + 24, y0 + 120, 192, 142);   // the photo...
      this.idle(x0 + 120, y0 + 262, 2.6, 0);                                                 // ...of him
      this.hero.setTintMode(Phaser.TintModes.MULTIPLY).setTint(0xb0b0b0);
      this.label(0, 'THE DAILY TIDE', x0 + 140, y0 + 14, 16, '#1a1a1a');
      this.label(1, 'MONSTER SINKS CITY!', x0 + 40, y0 + 58, 24, '#000000');
      const names = this.losers.filter((l) => l.def).map((l) => l.name).join(', ');
      this.label(2, (names || 'THEY') + ' STILL MISSING', x0 + 240, y0 + 108, 6, '#1a1a1a');
    }
    if (s === 1) sfx('whoosh', 0.6, 0.5);
    if (s === 40) sfx('hit', 0.6, 0.4);
    this.film(t);
    this.vignette(this.over, 0.6);
  }
  shot_wake_monster_end(t, k, s) {
    this.hero.setVisible(false); this.hideLosers();
    this.bg.fillStyle(0x050505, 1); this.bg.fillRect(0, 0, W, H);
    const L = this.label(0, 'THE END', W / 2, 200, 40, '#f4f4f4'); L.setOrigin(0.5, 0.5).setStroke('#000000', 4);
    if (s > 60) { const q = this.label(1, '?', W / 2 + 120, 196, 40, '#f4f4f4'); q.setOrigin(0.5, 0.5).setAlpha(Math.min(1, (s - 60) / 30)); }
    if (s > 90) for (const dx of [-14, 14]) { this.glow(this.fx, W / 2 + dx + 200, 120, 10, 0xffffff, 0.4); this.fx.fillStyle(0xffffff, 1); this.fx.fillRect(W / 2 + dx + 196, 118, 8, 4); }   // eyes, in the dark
    if (s === 91) sfx('laugh', 0.4, 0.5);
    this.film(t);
    this.vignette(this.over, 0.8);
  }

  // ================================================================ NU - SILENT FILM
  // A silent comedy off a hand-cranked reel: sepia, scratches, jerky at 12 frames a second, intertitles between the
  // scenes and a honky-tonk piano (music 'ragtime'). The talent show: the rival acts get THE HOOK from the wings, one
  // after another. One sneaks back on - and a piano drops on them. He takes his bow under a rain of roses, and the
  // iris closes on him.
  // a title card: white words in an ornate frame on black
  intertitle(lines, s) {
    const g = this.mid, x = 90, y = 70, w = W - 180, h = 220;
    this.bg.fillStyle(0x0e0804, 1); this.bg.fillRect(0, 0, W, H);
    g.fillStyle(0x0e0804, 1); g.fillRect(x, y, w, h);
    g.lineStyle(3, 0xf0dcb0, 1); g.strokeRect(x, y, w, h); g.lineStyle(1, 0xf0dcb0, 1); g.strokeRect(x + 8, y + 8, w - 16, h - 16);
    for (const [cx, cy] of [[x + 8, y + 8], [x + w - 8, y + 8], [x + 8, y + h - 8], [x + w - 8, y + h - 8]]) { g.fillStyle(0xf0dcb0, 1); g.fillCircle(cx, cy, 5); g.fillStyle(0x0e0804, 1); g.fillCircle(cx, cy, 2); }   // corner flourishes
    for (const dy of [26, h - 26]) { g.lineStyle(1, 0xf0dcb0, 1); g.lineBetween(x + w / 2 - 60, y + dy, x + w / 2 + 60, y + dy); g.fillStyle(0xf0dcb0, 1); g.fillCircle(x + w / 2, y + dy, 3); }
    lines.forEach((ln, i) => { const L = this.label(i, ln, W / 2, y + h / 2 - (lines.length - 1) * 16 + i * 32, 14, '#f0dcb0'); L.setOrigin(0.5, 0.5); });
  }
  // iris: black everywhere but a circle (r), the old way of opening and closing a scene
  iris(cx, cy, r) { if (r < 600) this.dark(this.over, cx, cy, Math.max(1, r), 1); }
  vaudeville(g, t, floor, curtain = 0) {
    g.fillStyle(0x2a1a0e, 1); g.fillRect(0, 0, W, H);
    g.fillStyle(0x86684a, 1); g.fillRect(70, 40, W - 140, floor - 40);                         // the painted backdrop: a city of sepia
    for (let i = 0; i < 9; i++) { g.fillStyle(0x6a503a, 1); g.fillRect(80 + i * 56, floor - 60 - (i * 37 % 70), 44, 60 + (i * 37 % 70)); }
    g.fillStyle(0xd2b88e, 1); g.fillCircle(470, 90, 22);
    const cw = 80 + curtain * (W / 2 - 80);                                                  // the curtains (closing: curtain 0..1)
    for (const side of [0, 1]) for (let i = 0; i < 8; i++) { const x = side ? W - cw + i * cw / 8 : i * cw / 8; g.fillStyle(i % 2 ? 0x5e4630 : 0x3a2a1a, 1); g.fillRect(x, 30, cw / 8 + 1, floor - 30); }
    g.fillStyle(0x3a2a1a, 1); g.fillRect(0, 0, W, 40); for (let x = 0; x < W; x += 30) { g.fillStyle(0x5e4630, 1); g.fillTriangle(x, 40, x + 30, 40, x + 15, 58); }   // the valance
    g.fillStyle(0x5e4630, 1); g.fillRect(0, floor, W, H - floor); g.fillStyle(0x86684a, 1); g.fillRect(0, floor, W, 4);   // the stage
    for (let x = 30; x < W; x += 60) { this.glow(g, x, floor + 2, 30, 0xf0dcb0, 0.25); g.fillStyle(0xf0dcb0, 1); g.fillRect(x - 6, floor + 2, 12, 4); }   // footlights
  }
  hook(g, x, y, out) {                                                                       // THE HOOK: a long shepherd's crook out of the wings
    g.lineStyle(5, 0x3a2a1a, 1); g.lineBetween(W + 10, y - 40, x + 20, y - 40);
    g.beginPath(); g.arc(x + 20, y - 20, 20, -Math.PI / 2, Math.PI / 2 + 0.6, true); g.strokePath();
  }
  jerky(s) { return Math.floor(s / 5) * 5; }                                                // (12 frames a second)
  shot_nu_silent_card1(t, k, s) {
    this.hero.setVisible(false); this.hideLosers();
    this.intertitle(['THE TALENT SHOW.', 'OUR HERO TAKES THE STAGE.'], s);
    this.film(t, 0xf0dcb0, 0x0e0804);
    this.iris(W / 2, H / 2, s * 14);
  }
  shot_nu_silent_stage(t, k, s) {
    const floor = 286, j = this.jerky(s), live = this.losers.filter((l) => l.def);
    this.vaudeville(this.bg, t, floor);
    this.move('taunt', (j * 0.6) % 84, 230, floor, 3);                                      // him, giving it everything
    live.forEach((l, i) => {                                                                 // the rival acts... and the hook
      const at = 50 + i * 45, d = j - at, x0 = 360 + i * 70, y = floor;
      let x = x0; if (d > 10) x = x0 + (d - 10) * 14;
      l.s.setCrop().setTintMode(Phaser.TintModes.FILL).setTint(0x3a2a1a).setPosition(x, y).setScale(2.4).setRotation(d > 10 ? -0.4 : 0).setAlpha(1).setFlipX(true).setVisible(x < W + 60);
      if (d > -12 && d < 40) this.hook(this.fx, d < 0 ? x0 + (-d) * 20 : x, y - 2.4 * 40);
      if (d === 10) sfx('whoosh', 0.6, 1.6);
    });
    this.film(t, 0xf0dcb0, 0x0e0804);
    this.vignette(this.over, 0.6);
  }
  shot_nu_silent_card2(t, k, s) {
    this.hero.setVisible(false); this.hideLosers();
    this.intertitle(['THE COMPETITION', 'WAS... REMOVED.'], s);
    this.film(t, 0xf0dcb0, 0x0e0804);
  }
  // one sneaks back on - and the piano comes down
  shot_nu_silent_piano(t, k, s) {
    const floor = 286, j = this.jerky(s), DROP = 70, l = this.losers.find((x) => x.def);
    this.vaudeville(this.bg, t, floor);
    this.move('taunt', j < DROP ? 0 : Math.min(30, (j - DROP) * 0.5), 200, floor, 3);
    this.hideLosers();
    if (l) {
      const sneak = Math.min(1, j / 50), x = W + 40 - sneak * 230, flat = j >= DROP ? Math.min(1, (j - DROP) / 5) : 0;
      l.s.setCrop().setTintMode(Phaser.TintModes.FILL).setTint(0x3a2a1a).setPosition(x, floor).setScale(2.4 + flat * 1.2, 2.4 * (1 - flat * 0.82)).setRotation(0).setAlpha(1).setFlipX(true).setVisible(true);
      if (j < DROP) { const sh = Math.max(0, (j - 30) / 40); this.mid.fillStyle(0x0e0804, 0.5); this.mid.fillEllipse(x, floor + 3, 40 + sh * 60, 10); }   // a shadow, growing
      const py = j < DROP ? -120 + Math.max(0, j - 40) ** 2 * 0.4 : floor - 70;              // the piano
      if (j >= 40 || j >= DROP) {
        const f = this.fx, px = x - 60; f.fillStyle(0x3a2a1a, 1); f.fillRect(px, py, 120, 70); f.fillStyle(0x5e4630, 1); f.fillRect(px + 6, py + 6, 108, 20);
        f.fillStyle(0xf0dcb0, 1); f.fillRect(px + 10, py + 32, 100, 10); for (let i = 0; i < 12; i++) { f.fillStyle(0x0e0804, 1); f.fillRect(px + 14 + i * 8, py + 32, 3, 6); }
        f.fillStyle(0x3a2a1a, 1); f.fillRect(px + 6, py + 70, 8, 6); f.fillRect(px + 106, py + 70, 8, 6);
      }
      if (j >= DROP) {
        const d = j - DROP;
        if (d < 40) for (let i = 0; i < 10; i++) { const a = i * 0.63; this.fx.fillStyle(0xd2b88e, Math.max(0, 0.7 - d / 50)); this.fx.fillCircle(x + Math.cos(a) * d * 3, floor - 20 + Math.sin(a) * d * 1.5, 8 + d * 0.4); }   // a cloud of dust
        for (let i = 0; i < 4; i++) { const a = d * 0.12 + i * 1.57; this.fx.fillStyle(0xf0dcb0, 1); this.fx.fillCircle(x + Math.cos(a) * 26, floor - 100 + Math.sin(a) * 8, 3); }   // seeing stars
        for (let i = 0; i < 5; i++) { const sp = this.spots[i]; this.fx.fillStyle(i % 2 ? 0xf0dcb0 : 0x0e0804, 1); this.fx.fillRect(x + (sp[0] - 0.5) * d * 8, floor - 60 - d * 4 * sp[1] + d * d * 0.15, 6, 3); }   // keys flying
      }
    }
    if (s === DROP) { sfx('bighit', 1, 0.6); sfx('clang', 0.8, 0.5); this.cameras.main.shake(300, 0.02); }
    this.film(t, 0xf0dcb0, 0x0e0804);
    this.vignette(this.over, 0.6);
  }
  // the bow: roses from the crowd, the curtain closes, the iris shuts on him
  shot_nu_silent_bow(t, k, s) {
    const floor = 286, j = this.jerky(s), close = Math.max(0, Math.min(1, (s - 150) / 60));
    this.vaudeville(this.bg, t, floor, close * 0.7);
    this.move('micdrop', Math.min(59, 30 + j * 0.3), W / 2, floor, 3.2);
    this.hideLosers();
    for (let i = 0; i < 14; i++) {                                                           // roses, thrown from the audience
      const sp = this.spots[i], st = i * 7, d = s - st; if (d < 0) continue;
      const x = sp[0] * W, y = Math.min(floor - 4, H + 20 - d * 7 + d * d * 0.12);
      this.fx.fillStyle(0x5e4630, 1); this.fx.fillRect(x - 6, y, 12, 2); this.fx.fillStyle(0x3a2a1a, 1); this.fx.fillCircle(x + 6, y, 4);
    }
    if (s % 40 === 5 && s < 140) sfx('petal', 0.3, 1.2);
    this.iris(W / 2, floor - 100, s < 200 ? 900 : 600 - (s - 200) * 6);
    this.film(t, 0xf0dcb0, 0x0e0804);
    this.vignette(this.over, 0.5);
  }

  // ================================================================ LACY - 16-BIT HERO
  // An old cartridge role-playing game. A random encounter on the overworld - the screen swirls - and it's a turn-based
  // battle: the beaten as the enemy party, her on the right with her HP and her ready gauge. FIGHT... SKILL... THOUSAND
  // CUTS: she dashes in, cuts all three, 9999 each; they flash and dissolve. VICTORY! (fanfare: music 'victory', 6.6 s)
  // She spins and salutes; EXP and gold. The results screen: LEVEL UP - and every one of their stats, +0.
  rpgWin(g, x, y, w, h) {                                                                     // a menu window: blue gradient, white border
    for (let i = 0; i < 8; i++) { g.fillStyle(Phaser.Display.Color.GetColor(16 + i * 4, 24 + i * 8, 120 - i * 8), 1); g.fillRect(x, y + h * i / 8, w, h / 8 + 1); }
    g.lineStyle(2, 0xf4f4f4, 1); g.strokeRect(x + 2, y + 2, w - 4, h - 4); g.lineStyle(1, 0x8a8aa0, 1); g.strokeRect(x + 5, y + 5, w - 10, h - 10);
  }
  rpgField(g, t, horizon = 150) {
    this.sky(g, 0x4a7ad8, 0xb8e0ff);
    for (let i = 0; i < 4; i++) { g.fillStyle(0xffffff, 0.8); g.fillEllipse(((i * 190 + t * 0.15) % (W + 120)) - 60, 50 + i * 18, 90, 16); }
    g.fillStyle(0x5a7ab8, 1); for (let i = 0; i < 6; i++) g.fillTriangle(i * 130 - 40, horizon, i * 130 + 50, horizon - 60 - (i % 2) * 20, i * 130 + 140, horizon);   // far mountains
    for (let r = 0; r < 14; r++) { const y0 = horizon + r * r * 1.1, y1 = horizon + (r + 1) * (r + 1) * 1.1; g.fillStyle(r % 2 ? 0x3a9a3a : 0x48b048, 1); g.fillRect(0, y0, W, y1 - y0 + 1); }   // the grass, rushing toward us
  }
  rpgDamage(i, txt, x, y, d, col = '#ffffff') {                                               // a damage number, bouncing
    const b = d < 10 ? -Math.sin(d / 10 * Math.PI) * 18 : 0;
    const L = this.label(i, txt, x, y + b, 14, col); L.setOrigin(0.5, 1).setStroke('#000000', 4); return L;
  }
  shot_hk_rpg_encounter(t, k, s) {
    const g = this.bg;
    this.hideLosers();
    g.fillStyle(0x3a8a3a, 1); g.fillRect(0, 0, W, H);                                         // the overworld: grass, trees, a path
    for (let i = 0; i < 30; i++) { const sp = this.spots[i % 40], x = sp[0] * W, y = sp[1] * H; g.fillStyle(0x1e5a1e, 1); g.fillCircle(x, y, 10); g.fillStyle(0x2a7a2a, 1); g.fillCircle(x - 3, y - 3, 6); }
    g.fillStyle(0xc8b070, 1); g.fillRect(0, 200, W, 30);
    this.strip('run', Math.floor(s / 6), 120 + Math.min(30, s) * 4, 230, 2);
    if (s >= 30 && s < 44) { this.label(0, '!', 120 + 120 + 6, 150, 20, '#ffffff').setStroke('#000000', 4); if (s === 30) sfx('ding', 0.6, 1.6); }
    if (s >= 44) {                                                                            // the swirl into battle
      const p = (s - 44) / 36, f = this.front;
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8 + p * 4; f.fillStyle(0x000000, 1); f.fillTriangle(W / 2, H / 2, W / 2 + Math.cos(a) * 900, H / 2 + Math.sin(a) * 900, W / 2 + Math.cos(a + p * 0.4) * 900, H / 2 + Math.sin(a + p * 0.4) * 900); }
      if (s === 44) { sfx('glass', 0.6, 1.4); sfx('whoosh', 0.6, 0.8); this.flash = 4; }
    }
  }
  shot_hk_rpg_battle(t, k, s) {
    const live = this.losers.filter((l) => l.def), g = this.mid, LX = 500, LY = 232, MENU = 60, GO = 140, DASH = 10;
    this.rpgField(this.bg, t);
    // the enemy party, on the left
    const ex = (i) => 90 + i * 85, ey = (i) => 168 + (i % 2) * 40;
    live.forEach((l, i) => {
      const hitAt = GO + 20 + i * 12, dis = Math.max(0, Math.min(1, (s - (hitAt + 30)) / 24));
      l.s.setCrop().setTintMode(Phaser.TintModes.MULTIPLY).setTint(s >= hitAt && s < hitAt + 30 && (s >> 2) % 2 ? 0xff8a8a : 0xffffff)
        .setPosition(ex(i), ey(i) + Math.sin(t * 0.1 + i) * 1.5).setScale(2).setRotation(0).setAlpha(1).setFlipX(!!l.def.facesLeft).setVisible(dis < 1);
      if (dis > 0) { const f = l.s.frame; l.s.setCrop(0, f.height * dis, f.width, f.height); for (let j = 0; j < 4; j++) { this.fx.fillStyle([0xff4a8a, 0xffffff, 0x8a4aff][j % 3], 1 - dis); this.fx.fillRect(ex(i) - 20 + Math.random() * 40, ey(i) - 50 + dis * 50 + Math.random() * 10, 3, 3); } }   // dissolving, top down
      if (s >= hitAt && s < hitAt + 6) { this.fx.lineStyle(4, 0xffffff, 1 - (s - hitAt) / 6); this.fx.lineBetween(ex(i) - 40, ey(i) - 80, ex(i) + 40, ey(i)); this.fx.lineBetween(ex(i) + 40, ey(i) - 80, ex(i) - 40, ey(i)); }
      if (s === hitAt) { sfx('slash', 0.7, 1.2 + i * 0.1); sfx('hit', 0.5, 1.4); this.flash = 2; }
      if (s === hitAt + 30) sfx('glass', 0.4, 1.8);
      if (s >= hitAt && s < hitAt + 60) this.rpgDamage(4 + i, '9999', ex(i), ey(i) - 70, s - hitAt);
    });
    // her: waiting... then the dash in, the cut, and back
    const A = this.def.moveAnims.fsmash, at = s - GO;
    let x = LX; if (at >= 0 && at < DASH) x = LX - (at / DASH) * 260; else if (at >= DASH && at < DASH + A[1] * A[2]) x = LX - 260; else if (at >= DASH + A[1] * A[2] && at < DASH * 2 + A[1] * A[2]) x = LX - 260 + ((at - DASH - A[1] * A[2]) / DASH) * 260;
    if (at >= DASH && at < DASH + A[1] * A[2]) this.move('fsmash', at - DASH, x, LY, 2.6, this.def, true); else if (at >= 0 && at < DASH * 2 + A[1] * A[2]) this.strip('run', Math.floor(s / 3), x, LY, 2.6, at < DASH); else this.idle(x, LY, 2.6, t, true);
    // the windows: the enemies' names, her HP and ready gauge, the command menu
    this.rpgWin(g, 10, 262, 250, 64); this.rpgWin(g, 266, 262, 364, 64);
    live.forEach((l, i) => { if (s < GO + 50 + i * 12) this.label(i, l.name.slice(0, 16), 26, 270 + i * 16, 9, '#ffffff'); });
    this.label(3, 'LACY      HP  999/ 999', 282, 278, 9, '#ffffff');
    const atb = Math.min(1, s / MENU); g.fillStyle(0x2a2a40, 1); g.fillRect(500, 298, 110, 8); g.fillStyle(atb >= 1 ? 0xffe08a : 0x8ab8ff, 1); g.fillRect(500, 298, 110 * atb, 8);
    this.label(9, 'READY', 282, 296, 8, atb >= 1 ? '#ffe08a' : '#8a8aa0');
    if (s >= MENU && s < GO) {
      this.rpgWin(g, 380, 150, 120, 104);
      const cmds = ['FIGHT', 'SKILL', 'ITEM', 'RUN'], pick = s < 82 ? 0 : 1;
      cmds.forEach((c, i) => this.label(4 + i, c, 412, 162 + i * 20, 9, '#ffffff'));
      const cy = 166 + pick * 20; this.fx.fillStyle(0xffffff, 1); this.fx.fillTriangle(392, cy - 4, 392, cy + 6, 402, cy + 1);   // the pointing cursor
      if (s === 82 || s === 104 || s === 126) sfx('menu', 0.4, 1.2);
      if (s >= 104) { this.rpgWin(g, 220, 110, 170, 40); this.label(8, 'THOUSAND CUTS', 238, 124, 9, '#ffe08a'); }
    }
    if (s >= GO && s < GO + 40) { this.rpgWin(g, 180, 42, 280, 34); this.label(8, 'LACY USES THOUSAND CUTS!', 196, 53, 9, '#ffffff'); }
    if (s > GO + 110) { this.rpgWin(g, 180, 42, 280, 34); this.label(8, 'THE ENEMIES WERE DEFEATED.', 196, 53, 9, '#ffffff'); }
    this.vignette(this.over, 0.25);
  }
  shot_hk_rpg_victory(t, k, s) {
    const g = this.mid, T = this.def.moveAnims.taunt;
    this.rpgField(this.bg, t); this.hideLosers();
    this.move('taunt', Math.min(T[1] * T[2] - 1, s * 0.8), 420, 236, 3, this.def, true);    // the spin, and the salute
    for (let i = 0; i < 16; i++) { const sp = this.spots[i], a = s * 0.05 + i; this.fx.fillStyle(i % 2 ? 0xffe08a : 0xffffff, 0.5 + 0.5 * Math.sin(a * 3)); this.fx.fillRect(420 + Math.cos(a) * (60 + sp[2] * 40), 160 + Math.sin(a) * 50, 2, 2); }
    this.rpgWin(g, 120, 40, 400, 50);
    const V = this.label(0, 'VICTORY!', W / 2, 65, 22, '#ffe08a'); V.setOrigin(0.5, 0.5).setStroke('#000000', 4).setScale(s < 8 ? 2 - s / 8 : 1);
    if (s > 50) {
      this.rpgWin(g, 20, 250, 340, 70);
      ['GOT 4800 EXP!', 'GOT 1200 G!'].forEach((txt, i) => { const n = Math.floor((s - 56 - i * 26) * 0.8); if (n > 0) this.label(1 + i, txt.slice(0, n), 40, 264 + i * 22, 10, '#ffffff'); if (n > 0 && n <= txt.length && s % 3 === 0) sfx('menu', 0.12, 1.8); });
    }
    this.vignette(this.over, 0.2);
  }
  shot_hk_rpg_results(t, k, s) {
    const g = this.mid, live = this.losers.filter((l) => l.def);
    this.hideLosers();
    g.fillStyle(0x10184a, 1); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { const sp = this.spots[i]; g.fillStyle(0x3a4a8a, 0.6); g.fillRect(sp[0] * W, (sp[1] * H + t * 0.3) % H, 2, 2); }
    this.rpgWin(g, 30, 110, 170, 190);                                                        // her portrait
    this.closeUp(115, 196, 4.4, t);
    this.rpgWin(g, 210, 110, 400, 190);                                                       // the numbers
    const lv = s < 30 ? 98 : 99, up = s >= 30;
    this.label(0, 'LACY', 230, 124, 12, '#ffffff');
    this.label(1, 'LV ' + lv + (up ? '   LEVEL UP!' : ''), 330, 124, 12, up && (s >> 3) % 2 ? '#ffe08a' : '#ffffff');
    if (s === 30) { sfx('limitready', 0.6, 1.4); this.flash = 3; }
    const stats = [['STR', 254, 1], ['SPD', 199, 2], ['MAG', 88, 1]];
    stats.forEach(([n, v, d], i) => { if (s > 40 + i * 12) this.label(2 + i, n + '  ' + v + ' > ' + (v + d) + '  (+' + d + ')', 232, 156 + i * 18, 9, '#b8e0ff'); });
    live.forEach((l, i) => { if (s > 90 + i * 16) this.label(5 + i, 'FOUND: ' + l.name.slice(0, 14) + "'S PRIDE  x1", 232, 222 + i * 16, 8, '#ffe08a'); });
    if (s > 90 && (s - 90) % 16 === 0 && (s - 90) / 16 < live.length) sfx('ding', 0.35, 1.5);
    if (s > 150) this.label(8, 'ENEMY STATS: +0. +0. +0.', 232, 278, 8, '#ff8a8a');
    this.vignette(this.over, 0.3);
  }

  // ================================================================ AERO - FORECAST
  // The weather on 90s local TV. A spinning chrome AERO 7 WEATHER bumper with a lens flare; then him in front of the
  // map, smooth jazz playing (music 'weather'): the beaten are storm systems with their names on, blowing off the edge
  // of the map while the suns come out. Doppler radar sweeps them away. The 5-day: sun, sun, sun, sun, him. The
  // ticker crawls: 100% CHANCE OF L's.
  tvChrome(t, s) {                                                                          // the station look: clock, channel bug, scanlines
    const o = this.front, m = this.mid;
    for (let y = 0; y < H; y += 3) { o.fillStyle(0x000000, 0.08); o.fillRect(0, y, W, 1); }
    m.fillStyle(0xffffff, 0.75); m.fillRect(W - 92, 44, 60, 22); m.fillStyle(0x1a3a8a, 1); m.fillRect(W - 90, 46, 56, 18);
    this.label(9, 'AERO 7', W - 84, 50, 8, '#ffd23a');
  }
  ticker(txt, s, y = H - 58) {
    const g = this.fx; g.fillStyle(0x0a1a4a, 0.95); g.fillRect(0, y, W, 16); g.fillStyle(0xffd23a, 1); g.fillRect(0, y, 70, 16);
    this.label(8, 'WEATHER', 6, y + 4, 7, '#0a1a4a');
    const full = txt + '      ' + txt, off = Math.floor(s * 0.5) % (txt.length + 6);
    this.label(7, full.slice(off, off + 64), 78, y + 4, 7, '#ffffff');
  }
  wxIcon(g, kind, x, y, r, t) {                                                               // weather icons: sun / cloud / storm
    if (kind === 'sun' || kind === 'aero') {
      for (let i = 0; i < 8; i++) { const a = i * 0.785 + t * 0.02; g.fillStyle(0xffd23a, 1); g.fillTriangle(x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 1.2, x + Math.cos(a + 0.2) * r * 1.6, y + Math.sin(a + 0.2) * r * 1.6, x + Math.cos(a - 0.2) * r * 1.6, y + Math.sin(a - 0.2) * r * 1.6); }
      g.fillStyle(0xffd23a, 1); g.fillCircle(x, y, r); g.fillStyle(0xfff4a0, 1); g.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.4);
      if (kind === 'aero') { g.fillStyle(0x0a0a14, 1); g.fillRect(x - r * 0.75, y - r * 0.2, r * 0.65, r * 0.32); g.fillRect(x + r * 0.1, y - r * 0.2, r * 0.65, r * 0.32); g.fillRect(x - r * 0.2, y - r * 0.15, r * 0.4, r * 0.1); }   // in shades
      return;
    }
    g.fillStyle(kind === 'storm' ? 0x5a6070 : 0xf4f8ff, 1); g.fillCircle(x - r * 0.5, y, r * 0.6); g.fillCircle(x + r * 0.2, y - r * 0.3, r * 0.75); g.fillCircle(x + r * 0.7, y + r * 0.05, r * 0.5); g.fillRect(x - r * 0.9, y, r * 1.8, r * 0.5);
    if (kind === 'storm') { g.fillStyle(0xffd23a, 1); g.fillTriangle(x, y + r * 0.4, x - r * 0.3, y + r * 1.1, x + r * 0.05, y + r * 0.9); g.fillTriangle(x + r * 0.05, y + r * 0.9, x + r * 0.3, y + r * 0.85, x - r * 0.1, y + r * 1.5);
      for (let i = 0; i < 4; i++) { g.lineStyle(2, 0x8ab8f0, 1); const rx = x - r * 0.7 + i * r * 0.4, ry = y + r * 0.6 + ((t * 3 + i * 7) % 12); g.lineBetween(rx, ry, rx - 2, ry + 6); } }
  }
  map(g, t) {                                                                                // the forecast map: sea, a landmass, borders, temperatures
    for (let i = 0; i < 10; i++) { g.fillStyle(Phaser.Display.Color.GetColor(20 + i * 3, 60 + i * 6, 150 + i * 6), 1); g.fillRect(0, i * H / 10, W, H / 10 + 1); }
    const land = [[120, 70], [300, 50], [470, 80], [600, 60], [620, 300], [420, 320], [260, 290], [160, 310], [90, 220], [110, 140]];
    g.fillStyle(0x3a9a4a, 1); g.fillPoints(land.map(([x, y]) => ({ x, y })), true);
    g.fillStyle(0x4ab05a, 1); g.fillPoints(land.map(([x, y]) => ({ x: x * 0.9 + 30, y: y * 0.9 + 18 })), true);
    g.lineStyle(1, 0xd8f0d8, 0.7); for (const [a, b] of [[[250, 60], [280, 310]], [[400, 70], [380, 320]], [[100, 190], [610, 170]]]) g.lineBetween(a[0], a[1], b[0], b[1]);   // borders
  }
  shot_aero_forecast_bumper(t, k, s) {
    const g = this.bg;
    this.hideLosers(); this.hero.setVisible(false);
    for (let i = 0; i < 12; i++) { g.fillStyle(Phaser.Display.Color.GetColor(10 + i * 8, 20 + i * 10, 80 + i * 12), 1); g.fillRect(0, i * H / 12, W, H / 12 + 1); }
    for (let i = 0; i < 12; i++) { const a = t * 0.01 + i * 0.52; g.fillStyle(0xffffff, 0.04); g.fillTriangle(W / 2, H / 2, W / 2 + Math.cos(a) * 800, H / 2 + Math.sin(a) * 800, W / 2 + Math.cos(a + 0.2) * 800, H / 2 + Math.sin(a + 0.2) * 800); }
    const spin = Math.cos(Math.min(1, s / 50) * Math.PI * 2), z = Math.min(1, s / 40);   // the logo, spinning in like a coin
    const A = this.label(0, 'AERO 7', W / 2, 150, 46, '#e8f0ff'); A.setOrigin(0.5, 0.5).setStroke('#1a3a8a', 6).setShadow(3, 3, '#000000', 0, true, true).setScale(Math.max(0.05, Math.abs(spin)) * z, z);
    if (s > 50) { const B = this.label(1, 'W E A T H E R', W / 2, 200, 16, '#ffd23a'); B.setOrigin(0.5, 0.5).setStroke('#0a1a4a', 4); }
    if (s > 40 && s < 80) { const fx = -100 + (s - 40) * 22; this.glow(this.fx, fx, 150, 50, 0xffffff, 0.6); this.fx.fillStyle(0xffffff, 0.5); this.fx.fillRect(fx - 200, 149, 400, 2); for (const [d, r] of [[60, 8], [130, 5], [200, 12]]) { this.fx.fillStyle(0x9ad8ff, 0.35); this.fx.fillCircle(fx - d, 150 + d * 0.2, r); } }   // a lens flare, sweeping across
    if (s === 40) sfx('shing', 0.6, 1);
    if (s === 1) sfx('whoosh', 0.5, 1.4);
    this.tvChrome(t, s);
  }
  shot_aero_forecast_map(t, k, s) {
    const live = this.losers.filter((l) => l.def);
    this.map(this.bg, t);
    this.hideLosers();
    [[250, 150], [380, 240], [500, 130]].forEach(([x, y], i) => this.label(4 + i, (72 + i * 9) + '°', x, y, 12, '#ffffff').setStroke('#0a1a4a', 3));
    live.forEach((l, i) => {                                                                   // the beaten: storm systems, blowing out to sea
      const p = Math.max(0, (s - 20 - i * 40) / 300), x = 280 + i * 90 + p * 380, y = 110 + i * 60 - p * 30, r = 26 * (1 - Math.min(1, p) * 0.5);
      if (x > W + 60) return;
      this.wxIcon(this.mid, 'storm', x, y, r, t);
      this.label(i, l.name.slice(0, 12), x - 34, y + r * 1.6 + 6, 7, '#ffffff').setStroke('#0a1a4a', 3);
      if (p > 0.2) this.wxIcon(this.mid, 'sun', 280 + i * 90, 110 + i * 60, 14 * Math.min(1, (p - 0.2) * 3), t);   // the sun comes out behind them
    });
    this.idle(120, 300, 3.2, t);                                                               // him, in front of the map
    const lt = this.fx; lt.fillStyle(0x0a1a4a, 0.92); lt.fillRect(30, 240, 300, 30); lt.fillStyle(0xffd23a, 1); lt.fillRect(30, 240, 6, 30);   // the lower third
    this.label(3, 'AERO  -  CHIEF METEOROLOGIST', 44, 250, 8, '#ffffff');
    this.ticker('CLEAR SKIES ALL WEEK.   STORMS HAVE MOVED OUT OF THE AREA.   UV INDEX: VERY GLOSSY.', s);
    this.tvChrome(t, s);
  }
  shot_aero_forecast_radar(t, k, s) {
    const g = this.bg, cx = W / 2, cy = 180, R = 150, live = this.losers.filter((l) => l.def);
    this.hideLosers(); this.hero.setVisible(false);
    g.fillStyle(0x020a04, 1); g.fillRect(0, 0, W, H);
    g.fillStyle(0x0a1e0e, 1); g.fillCircle(cx, cy, R);
    for (let r = 1; r <= 3; r++) { g.lineStyle(1, 0x2a6a3a, 1); g.strokeCircle(cx, cy, R * r / 3); } g.lineBetween(cx - R, cy, cx + R, cy); g.lineBetween(cx, cy - R, cx, cy + R);
    const a = s * 0.06;
    for (let i = 0; i < 14; i++) { g.fillStyle(0x5aff8a, 0.12 * (1 - i / 14)); g.slice(cx, cy, R, a - i * 0.04 - 0.04, a - i * 0.04, false); g.fillPath(); }   // the sweep and its fading trail
    g.lineStyle(2, 0x9affb8, 1); g.lineBetween(cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    live.forEach((l, i) => {                                                                   // their storm cells - gone once the sweep passes
      const ang = 0.8 + i * 1.7, d = R * (0.4 + i * 0.18), bx = cx + Math.cos(ang) * d, by = cy + Math.sin(ang) * d;
      const passes = Math.floor((a - ang + Math.PI * 2) / (Math.PI * 2)), gone = passes >= 1;
      if (gone) return;
      for (const [col, r] of [[0x2ad84a, 22], [0xffd23a, 14], [0xff3a2a, 7]]) { g.fillStyle(col, 0.85); g.fillEllipse(bx, by, r * 2, r * 1.4); }
      this.label(i, l.name.slice(0, 10), bx - 26, by + 16, 6, '#d8ffd8');
    });
    this.label(4, 'DOPPLER 7000', 30, 50, 10, '#9affb8');
    this.label(5, 'STORM CELLS: ' + live.filter((_, i) => Math.floor((a - (0.8 + i * 1.7) + Math.PI * 2) / (Math.PI * 2)) < 1).length, 30, 68, 8, '#9affb8');
    if (s % 40 === 10) sfx('ding', 0.15, 2.2);
    this.tvChrome(t, s);
  }
  shot_aero_forecast_fiveday(t, k, s) {
    const g = this.mid, live = this.losers.filter((l) => l.def), days = ['MON', 'TUE', 'WED', 'THU', 'FRI'], kinds = ['sun', 'sun', 'sun', 'sun', 'aero'];
    this.map(this.bg, t); this.bg.fillStyle(0x0a1a4a, 0.55); this.bg.fillRect(0, 0, W, H);
    this.hideLosers();
    this.label(6, 'THE 5-DAY FORECAST', 40, 104, 12, '#ffd23a').setStroke('#0a1a4a', 3);
    days.forEach((d, i) => {
      const x = 40 + i * 82, y = 124, on = s > 10 + i * 10;
      if (!on) return;
      g.fillStyle(0x1a3a8a, 0.95); g.fillRect(x, y, 76, 116); g.lineStyle(2, 0x8ab8f0, 1); g.strokeRect(x, y, 76, 116);
      this.label(i, d + '   ' + (i < 4 ? '88°' : '99°'), x + 8, y + 6, 8, '#ffffff');
      this.wxIcon(g, kinds[i], x + 38, y + 62, 16, t);
      if (s === 10 + i * 10) sfx('menu', 0.3, 1.4 + i * 0.1);
    });
    this.idle(520, 300, 3.2, t, true);
    this.ticker('EXTENDED FORECAST: 100% CHANCE OF L\'s FOR ' + (live.map((l) => l.name).join(', ') || 'THEM') + '.   NO RAIN ON MY PARADE.   STAY GLOSSY.', s);
    this.tvChrome(t, s);
  }

}
